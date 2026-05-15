# ComplAI Auditor: Visión del Proyecto

ComplAI Auditor es una plataforma de auditoría de cumplimiento automatizada que transforma procesos legales y normativos complejos en flujos de verificación precisos, rápidos y escalables mediante Inteligencia Artificial de múltiples agentes.

## 🎯 El Problema
La auditoría de cumplimiento tradicional es:
- **Manual y lenta**: Depende de humanos leyendo miles de páginas.
- **Costosa**: El acceso a normas (ISO) y el tiempo de consultoría especializado tienen barreras de entrada altas.
- **Proclive al error**: La fatiga humana genera inconsistencias en la verificación de controles.

## 💡 La Solución: El Motor de Triple Chequeo
La plataforma utiliza una arquitectura de *RAG (Retrieval-Augmented Generation)* con un sistema de tres agentes especializados para garantizar la máxima fidelidad y reducir alucinaciones:

| Agente | Función | Acción |
| :--- | :--- | :--- |
| **Analista** | Extracción | Mapea evidencias del cliente contra requisitos legales/normativos. |
| **Crítico** | Validación | Actúa de forma adversarial buscando fallas o falta de pruebas en el análisis. |
| **Juez** | Dictamen | Emite el veredicto final (Cumple / No Cumple) basado en el debate previo. |

## 🚀 Estrategia de Implementación

### Fase 1: Cumplimiento Legal Nacional (SAIJ)
- **Fuente**: Consumo de la API del Sistema Argentino de Información Jurídica.
- **Valor**: Datos públicos y gratuitos para validar el motor de IA sin costos de licencia iniciales.
- **Mercado**: Empresas locales que deben cumplir con leyes de protección de datos, lavado de dinero o regulaciones específicas de industria.

### Fase 2: Estándares Internacionales (ISO BYOL)
- **Modelo**: *Bring Your Own License* (Trae tu propia licencia).
- **Funcionamiento**: El cliente sube su copia oficial de la norma (ISO 42001, 27001, etc.).
- **Ventaja**: ComplAI procesa el contenido de forma privada para el cliente, evitando conflictos de propiedad intelectual con la ISO.

## 🛠️ Arquitectura Técnica
- **Infraestructura**: Desplegada en AWS mediante Terraform.
- **Base de Datos de Vectores**: ChromaDB corriendo en EC2 para búsquedas semánticas de alta velocidad.
- **Backend**: Python (FastAPI) para la orquestación de agentes y consumo de APIs (SAIJ/S3).
- **Storage**: Amazon S3 para el almacenamiento seguro y transitorio de documentos de auditoría.

## 📈 Propuesta de Valor
Convertir el cumplimiento de una "obligación burocrática" a una "ventaja competitiva automatizada", reduciendo los tiempos de auditoría de semanas a minutos con un rigor técnico superior al humano.