# ComplAI Auditor

Aplicación de escritorio (Electron) para auditoría de cumplimiento (ISO/UE AI Act) con validación basada en agentes de IA y consultas a la API de SAIJ.

## Estructura del Proyecto

- **`client/`**: Frontend web en React + Vite + Tailwind CSS.
- **`server/`**: Backend en FastAPI (Agentes con AWS Bedrock).
- **`infra/`**: Configuración de Terraform para despliegue en AWS (Lambda).
- **`main.js`**: (Ubicado en `server/main.js` temporalmente/por diseño) Punto de entrada para la ventana nativa de Electron.

## Requisitos Previos

- Node.js (v18+)
- Python (v3.10+)
- AWS CLI configurado con acceso a Amazon Bedrock.
- Terraform (opcional, para despliegue).

## 🚀 Inicio Rápido (Desarrollo Local)

### 1. Preparar el Entorno del Backend (Python)
Es **obligatorio** crear el entorno virtual e instalar las librerías para que el backend local funcione:
```bash
cd server
python -m venv venv
# Activar entorno: Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
# Importante: Pegá el archivo .env que compartimos en la carpeta server/
cd ..
```

### 2. Instalación de Dependencias del Proyecto
Necesitas instalar los paquetes de Node que controlan el arranque, el frontend y la ventana de Electron en la raíz del proyecto:
```bash
npm install
```

## ⚙️ Comandos de Ejecución

Para simplificar el arranque y garantizar que siempre apuntemos a **credenciales de producción**, hemos definido dos scripts principales:

### Opción A: Levantar solo el Frontend (Electron + UI)
Útil si el backend ya está corriendo en la nube (AWS) o si lo arrancaste manualmente por separado en otra consola:
```bash
npm run start:frontend
```
*(Esto ejecutará el servidor de desarrollo de Vite y abrirá la aplicación nativa de Electron).*

### Opción B: Levantar Ambos (Frontend completo + Backend local en modo Producción)
Útil para correr y depurar absolutamente todo en tu máquina usando la configuración real de producción (`.env.prod`):
```bash
npm run start:all
```
*(Esto levantará silenciosamente el servidor FastAPI usando `--env-file .env.prod`, arrancará Vite, y luego abrirá automáticamente la ventana de Electron).*
