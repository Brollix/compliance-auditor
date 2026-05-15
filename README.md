# 🚀 ComplAI Auditor

Aplicación de escritorio para auditoría de cumplimiento (ISO/UE AI Act) con agentes de IA.

## 📋 Requisitos Previos

Antes de empezar, asegúrate de tener instalado:
- **Node.js** (v18 o superior)
- **Python** (v3.10 o superior)
- **AWS CLI** configurado (con acceso a Amazon Bedrock)

## 🛠️ Instalación (Paso a Paso)

Sigue estos pasos en tu terminal:

1. **Clonar el repositorio** y entrar a la carpeta:
   ```bash
   cd compliance-auditor
   ```

2. **Configurar el Backend (Python):**
   ```bash
   cd server
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En Mac/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   cd ..
   ```
   *Nota: No olvides pedir el archivo `.env` y pegarlo dentro de la carpeta `server/`.*

3. **Instalar dependencias del Frontend:**
   ```bash
   npm install
   ```

## ⚡ Cómo Correr el Proyecto

Para levantar todo (Frontend + Backend + Electron) con un solo comando:

```bash
npm run start:all
```

---
💡 **Tip para principiantes:** Si ves errores de Python al arrancar, asegúrate de que tu entorno virtual (`venv`) esté activado o que las librerías se hayan instalado correctamente.

