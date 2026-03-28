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

### 1. Instalación Inicial
Primero, prepará el entorno del Backend (Python) y validá tus variables de entorno:
```bash
cd server
python -m venv venv
# Activar entorno: Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
# Importante: Pegá el archivo .env que compartimos en la carpeta server/ y en client/
cd ..
```

Luego, instalá las dependencias del proyecto en la raíz:
```bash
npm install
```

### 2. Ejecutar todo el proyecto (Frontend + Backend)
Gracias a los scripts simplificados, podés levantar **ambos servidores al mismo tiempo** con un solo comando desde la raíz del proyecto:
```bash
npm start
```
*(Esto levantará silenciosamente el servidor FastAPI y al mismo tiempo el Frontend en React apuntando a http://localhost:5173).*


## ⚙️ Modos Avanzados de Dev/Test

### Escenario A: Testear Frontend Local contra Backend de Producción
Si querés probar tu app de la compu directamente contra la API que ya tenés en AWS (sin levantar el backend local):
1. Corré `npm run dev` normalmente.

### Escenario B: Correr Proyecto con Backend en Entorno de Producción
Si necesitas probar el código usando bases de datos, ChromaDB o componentes reales de AWS en lugar de los recursos locales:
1. Asegurate de tener configurados todos los accesos directos de producción en tu archivo `server/.env.prod`.
2. Ejecutá todo la aplicación junta (Frontend + Backend prod) desde la raíz usando:
   ```bash
   npm run start:prod
   ```
   *(Esto correrá Vite en desarrollo, y en paralelo, le ordenará a FastAPI que se inicie leyendo exclusivamente `.env.prod`).*
