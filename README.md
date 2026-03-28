# ComplAI Auditor

Aplicación web para auditoría de cumplimiento (ISO/UE AI Act) con validación basada en agentes de IA y consultas a la API de SAIJ.

## Estructura del Proyecto

- **`client/`**: Frontend web en React + Vite + Tailwind CSS.
- **`server/`**: Backend en FastAPI (Agentes con AWS Bedrock).
- **`infra/`**: Configuración de Terraform para despliegue en AWS (Lambda).

## Requisitos Previos

- Node.js (v18+)
- Python (v3.10+)
- AWS CLI configurado con acceso a Amazon Bedrock.
- Terraform (opcional, para despliegue).

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Backend (FastAPI)
```bash
cd server
python -m venv venv
# Activar entorno: 
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# Configurar variables de entorno (AWS, DB, etc.)
cp .env.example .env 

uvicorn main:app --reload
```

### 2. Frontend web
Abre otra terminal en la **raíz del proyecto**:
```bash
npm install
npm run dev
```
*(Esto levantará el servidor de desarrollo de React en http://localhost:5173).*

### 3. Infraestructura (Despliegue AWS)
```bash
cd infra
terraform init
terraform plan
terraform apply
```

## ⚙️ Modos Avanzados de Dev/Test

### Escenario A: Testear Frontend Local contra Backend de Producción
Si querés probar tu app de la compu directamente contra la API que ya tenés en AWS (sin levantar el backend local):
1. Creá un archivo `.env` adentro de la carpeta `client/`.
2. Sumale la URL de tu backend desplegado:
   ```env
   VITE_API_URL=https://tu-api-en-aws.com
   ```
3. Corré `npm run dev` normalmente. El frontend (Vite) usará esa URL en lugar de `localhost`.

### Escenario B: Correr Backend Local con Credenciales de Producción
Si necesitas debuggear código del backend sin romper el entorno productivo alojado en AWS, pero conectándote a las bases de datos (u otros servicios) reales:
1. Duplicá tu archivo `.env` en `server/` y llamalo `.env.prod`.
2. Actualizá adentro de `.env.prod` todos los accesos (db, chroma, AWS, etc) a las de producción.
3. Levantá Uvicorn apuntando a ese archivo específico en lugar del por defecto:
   ```bash
   cd server
   venv\Scripts\activate
   uvicorn main:app --reload --env-file .env.prod
   ```
