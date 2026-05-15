import os
import asyncio
import boto3
import json
from loguru import logger
from typing import List, Dict, Any

class BedrockAgent:
    def __init__(self, model_id: str = None):
        self.model_id = model_id or os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0")
        
        # Initialize session with profile if provided
        profile = os.getenv("AWS_PROFILE")
        region = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
        
        session = boto3.Session(profile_name=profile) if profile else boto3.Session()
        self.client = session.client(
            service_name="bedrock-runtime",
            region_name=region
        )

    async def invoke(self, system_prompt: str, user_prompt: str) -> str:
        try:
            # Converse API format
            messages = [
                {
                    "role": "user",
                    "content": [{"text": user_prompt}]
                }
            ]
            
            system = [{"text": system_prompt}]

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.converse(
                    modelId=self.model_id,
                    messages=messages,
                    system=system,
                    inferenceConfig={
                        "maxTokens": 2000,
                        "temperature": 0.5
                    }
                )
            )

            return response["output"]["message"]["content"][0]["text"]
        
        except Exception as e:
            logger.error(f"Error invoking Bedrock model {self.model_id} via Converse API: {str(e)}")
            raise e

class AI_Auditor_Agents:
    def __init__(self):
        self.sonnet = BedrockAgent()

    async def agente_buscador(self, document_context: str) -> str:
        system = "Eres un experto legal en Argentina. Analiza el siguiente documento provisto por una empresa y extrae una lista de máximo 5 conceptos legales clave (ej: 'teletrabajo', 'protección de datos', 'higiene y seguridad', 'despido') que estén relacionados con el contenido. Devuelve exclusivamente las palabras clave separadas por comas."
        user = f"Documento de la empresa: {document_context}\n\nExtrae las palabras clave:"
        return await self.sonnet.invoke(system, user)

    async def agente_analista(self, context: str, query: str, framework: str = "iso") -> str:
        if framework == "saij":
            system = "Eres un auditor de cumplimiento corporativo (Compliance Officer). Tienes un documento interno de una empresa y un listado de resúmenes de leyes argentinas vigentes que aplican a su sector. Tu objetivo es encontrar discrepancias, omisiones o violaciones directas entre el documento y la ley. Sé estricto pero objetivo."
            user = f"Leyes (Contexto): {context}\n\nDocumento a analizar (Consulta): {query}\n\nIdentifica qué cláusula entra en conflicto o es omitida según estas leyes:"
        else:
            system = "Eres un Agente Analista experto en cumplimiento normativo (ISO/UE AI Act). Tu tarea es extraer evidencia literal y técnica EXCLUSIVAMENTE del contexto proporcionado."
            user = f"Contexto normativo: {context}\n\nDocumento/Consulta: {query}\n\nExtrae la evidencia relevante:"
        return await self.sonnet.invoke(system, user)

    async def agente_critico(self, context: str, query: str, framework: str = "iso") -> str:
        if framework == "saij":
            system = "Eres un Agente Crítico Legal. Tu tarea es encontrar vacíos, ambigüedades o falta de pruebas en el documento de la empresa respecto a las leyes nacionales provistas. Identifica riesgos ocultos basándote en la ley."
            user = f"Leyes: {context}\n\nDocumento: {query}\n\nIdentifica fallos legales o riesgos no cubiertos:"
        else:
            system = "Eres un Agente Crítico. Tu tarea es encontrar vacíos, ambigüedades o falta de pruebas en el contexto respecto a la ley o la normativa de cumplimiento."
            user = f"Contexto: {context}\n\nConsulta: {query}\n\nIdentifica fallos o ambigüedades:"
        return await self.sonnet.invoke(system, user)

    async def agente_verificador(self, analista_res: str, critico_res: str, full_law_text: str) -> str:
        system = """Eres un Auditor de Consistencia Legal de Élite. 
        Tu tarea es realizar el 'Triple Check' de seguridad: Recibes los hallazgos preliminares (del Analista y el Crítico) y debes validarlos contra el texto COMPLETO y LITERAL de la ley argentina (InfoLEG).
        Tus misiones son:
        1. Confirmar si los artículos citados por el analista existen y dicen exactamente lo que se afirma en el contexto.
        2. Verificar si los riesgos detectados por el crítico tienen sustento real en el articulado de la ley.
        3. Identificar cualquier 'alucinación' o error de interpretación legal.
        
        Sé extremadamente meticuloso. Si algo no está en el texto de la ley, desmóntalo."""
        user = f"Hallazgos Analista: {analista_res}\n\nHallazgos Crítico: {critico_res}\n\nTexto Completo de la Ley (InfoLEG):\n{full_law_text[:8000]}"
        return await self.sonnet.invoke(system, user)

    async def agente_juez(self, analista_res: str, critico_res: str, verificador_res: str = None, framework: str = "iso") -> Dict[str, Any]:
        if framework == "saij":
            system = "Eres un Juez y Consultor Legal. Evalúa los hallazgos de cumplimiento de un documento empresarial respecto a las leyes nacionales basándote en el análisis del analista, el crítico y la validación final del verificador. Genera un reporte estructurado y definitivo."
            user = f"Hallazgos Analista: {analista_res}\n\nHallazgos Crítico: {critico_res}\n\nValidación Verificador: {verificador_res}\n\nEmite tu reporte final en este formato JSON EXACTO: {{'veredicto': '... (Cumple / Cumple Parcialmente / No Cumple)', 'razonamiento': '...', 'recomendaciones': '...'}}"
        else:
            system = "Eres el Agente Juez. Recibes el informe del Analista y el Crítico para emitir un veredicto final: Cumple, No Cumple o Revisión Requerida."
            user = f"Informe Analista: {analista_res}\n\nInforme Crítico: {critico_res}\n\nEmite tu veredicto final en formato JSON: {{'veredicto': '...', 'razonamiento': '...'}}"
        
        res = await self.sonnet.invoke(system, user)
        # Attempt to parse JSON from result
        try:
            # Basic cleanup if model adds extra text
            start = res.find('{')
            end = res.rfind('}') + 1
            return json.loads(res[start:end])
        except Exception as e:
            logger.error(f"JSON Parse error in juez: {str(e)}\nRes: {res}")
            return {"veredicto": "Revisión Requerida", "razonamiento": res}
