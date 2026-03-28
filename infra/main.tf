terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = "complai-auditor"

  default_tags {
    tags = {
      Proyecto = "ComplAI Auditor"
    }
  }
}

# Obtener IP local para configurar el Security Group 
# y permitir el acceso a la EC2 desde tu red.
data "http" "myip" {
  url = "https://ipv4.icanhazip.com"
}

# Identificador aleatorio para el nombre de bucket
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# ==========================================
# Networking (Security Groups)
# ==========================================

# Utilizar la VPC por defecto de la cuenta
data "aws_vpc" "default" {
  default = true
}

# Obtener las subredes de la VPC por defecto para la Lambda
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "lambda_sg" {
  name        = "lambda_sg_auditor"
  description = "Security Group para la Lambda (Permite salida a Internet)"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ec2_sg" {
  name        = "ec2_chromadb_sg"
  description = "Security Group para EC2 (ChromaDB) - Acceso desde Lambda y Local"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Acceso desde la Lambda"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }

  ingress {
    description = "Acceso desde IP Local del administrador"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["${chomp(data.http.myip.response_body)}/32"]
  }
  
  # Acceso SSH desde red local (Opcional, pero recomendado para debugear)
  ingress {
    description = "SSH desde IP Local"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${chomp(data.http.myip.response_body)}/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ==========================================
# Almacenamiento (S3)
# ==========================================

resource "aws_s3_bucket" "auditoria_temp" {
  bucket        = "auditoria-temp-docs-${random_id.bucket_suffix.hex}"
  force_destroy = true # Asegura que se pueda borrar el bucket con terraform destroy aunque tenga archivos
}

resource "aws_s3_bucket_lifecycle_configuration" "auditoria_temp_lifecycle" {
  bucket = aws_s3_bucket.auditoria_temp.id

  rule {
    id     = "delete-after-24-hours"
    status = "Enabled"

    filter {
      # El warning en la versión v5 del provider de AWS requiere poner un filtro.
      # Un bloque filter vacío hace que aplique a todo el bucket por defecto.
    }

    expiration {
      days = 1
    }
  }
}

# ==========================================
# Base de Datos (DynamoDB)
# ==========================================

resource "aws_dynamodb_table" "audit_findings" {
  name         = "AuditFindings"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"
  range_key    = "finding_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "finding_id"
    type = "S"
  }
}

# ==========================================
# Servidor de Vectores (EC2)
# ==========================================

data "aws_ami" "ubuntu_2204" {
  most_recent = true
  owners      = ["099720109477"] # ID Oficial de Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "chromadb" {
  ami           = data.aws_ami.ubuntu_2204.id
  instance_type = "t3.micro" # Free Tier
  
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true # Para que se pueda acceder desde internet/localIP

  user_data = <<-EOF
              #!/bin/bash
              # Actualizaciones del SO y Docker para Ubuntu
              apt-get update -y
              apt-get install -y docker.io
              systemctl start docker
              systemctl enable docker
              usermod -aG docker ubuntu
              
              # Levantar ChromaDB en puerto 8000
              docker run -d -p 8000:8000 --name chromadb chromadb/chroma
              EOF

  tags = {
    Name = "ChromaDB-Vector-Server"
  }
}

# ==========================================
# Permisos (IAM Roles) para la Lambda
# ==========================================

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "AI_Auditor_Lambda_Role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "AI_Auditor_Lambda_Policy"
  description = "Permisos necesarios para la ejecucion de AI Auditor Backend"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Permisos S3
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.auditoria_temp.arn,
          "${aws_s3_bucket.auditoria_temp.arn}/*"
        ]
      },
      # Permisos DynamoDB
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.audit_findings.arn
      },
      # Permisos Amazon Bedrock
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      },
      # Permisos de CloudWatch Logs
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      # Permisos VPC para correr la Lambda dentro de la VPC y poder ver la EC2
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attach" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# ==========================================
# Cerebro del Sistema (Lambda)
# ==========================================

# Archivo dummy en caso de que aún no exista "backend_payload.zip" para permitir plan inicial
resource "local_file" "dummy_zip" {
  content  = "dummy"
  filename = "$${path.module}/backend_payload.zip"
  
  lifecycle {
    ignore_changes = all
  }
}

data "archive_file" "dummy_zip_arch" {
  type        = "zip"
  source_file = local_file.dummy_zip.filename
  output_path = "$${path.module}/backend_payload_final.zip"
}

resource "aws_lambda_function" "ai_auditor_backend" {
  # Asume que el zip puede estar listo. Terraform requiere que exista un archivo.
  # Aquí apuntamos a backend_payload.zip. Si no existe antes de aplciar, dará error localmente.
  # Para que sea resiliente, el archivo debe estar donde se ejecute Terraform, en raiz o module path.
  filename      = "backend_payload.zip"
  function_name = "AI_Auditor_Backend"
  role          = aws_iam_role.lambda_role.arn
  handler       = "main.handler" # Asegúrate de que este handler coincida con FastAPI/Mangum
  runtime       = "python3.12"
  timeout       = 60
  
  # Si backend_payload.zip existe localmente calculamos su hash
  source_code_hash = fileexists("backend_payload.zip") ? filebase64sha256("backend_payload.zip") : null

  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      # Apunta a la IP Privada (más seguro si están en la misma VPC) o IP Pública (para debug)
      # Se usa la privada de EC2 para evitar enrutamiento asimétrico
      CHROMA_HOST  = aws_instance.chromadb.private_ip 
      S3_BUCKET    = aws_s3_bucket.auditoria_temp.id
      DYNAMO_TABLE = aws_dynamodb_table.audit_findings.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_policy_attach
  ]
}

# ==========================================
# Outputs
# ==========================================

output "ec2_public_ip" {
  description = "Public IP de la instancia EC2 para acceder a ChromaDB"
  value       = aws_instance.chromadb.public_ip
}

output "s3_bucket_name" {
  description = "Nombre del Bucket S3 de Auditoría Transitoria"
  value       = aws_s3_bucket.auditoria_temp.id
}
