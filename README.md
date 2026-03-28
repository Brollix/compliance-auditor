# AI Auditor Pro

Prototipo de aplicación de escritorio para auditoría de cumplimiento (ISO/UE AI Act) con un flujo de Triple Validación basado en agentes de IA.

## Estructura del Proyecto

- **`client/`**: Aplicación React + Vite + Tailwind CSS 4.
- **`server/`**: 
  - **Desktop (Electron)**: `main.js` y `preload.js`.
  - **Backend (FastAPI)**: `main.py`, `agentes.py` y `requirements.txt`.

## Requisitos Previos

- Node.js (v18+)
- Python (v3.10+)
- Cuenta de AWS con acceso a Bedrock (Claude 3.5 Sonnet / Amazon Nova).

## Instalación y Ejecución

### 1. Backend (FastAPI)
```bash
cd server
pip install -r requirements.txt
python main.py
```

### 2. Frontend (Electron)
En la raíz del proyecto:
```bash
npm install
npm run electron:dev
```

## Configuración
Crea un archivo `.env` en `server/` basado en `server/.env.example` con tus credenciales de AWS y los detalles de tu instancia de ChromaDB.
