import os
import asyncio
import boto3
import json
from loguru import logger
from typing import List, Dict, Any

class BedrockAgent:
    def __init__(self, model_id: str = "anthropic.claude-3-5-sonnet-20240620-v1:0"):
        self.client = boto3.client(
            service_name="bedrock-runtime",
            region_name=os.getenv("AWS_REGION", "us-east-1")
        )
        self.model_id = model_id

    async def invoke(self, system_prompt: str, user_prompt: str) -> str:
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 2000,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ],
                "temperature": 0.5,
            })

            # Run synchronous boto3 call in a thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.invoke_model(
                    body=body,
                    modelId=self.model_id,
                    contentType="application/json",
                    accept="application/json"
                )
            )

            response_body = json.loads(response.get("body").read())
            return response_body.get("content")[0].get("text")
        
        except Exception as e:
            logger.error(f"Error invoking Bedrock model {self.model_id}: {str(e)}")
            raise e

class AI_Auditor_Agents:
    def __init__(self):
        self.sonnet = BedrockAgent(model_id="anthropic.claude-3-5-sonnet-20240620-v1:0")
        self.nova = BedrockAgent(model_id="amazon.nova-pro-v1:0") # Assuming Nova for technical extraction

    async def agente_analista(self, context: str, query: str) -> str:
        system = "Eres un Agente Analista experto en cumplimiento normativo (ISO/UE AI Act). Tu tarea es extraer evidencia literal y técnica EXCLUSIVAMENTE del contexto proporcionado."
        user = f"Contexto: {context}\n\nConsulta: {query}\n\nExtrae la evidencia relevante:"
        return await self.sonnet.invoke(system, user)

    async def agente_critico(self, context: str, query: str) -> str:
        system = "Eres un Agente Crítico. Tu tarea es encontrar vacíos, ambigüedades o falta de pruebas en el contexto respecto a la ley o la normativa de cumplimiento."
        user = f"Contexto: {context}\n\nConsulta: {query}\n\nIdentifica fallos o ambigüedades:"
        return await self.sonnet.invoke(system, user)

    async def agente_juez(self, analista_res: str, critico_res: str) -> Dict[str, Any]:
        system = "Eres el Agente Juez. Recibes el informe del Analista y el Crítico para emitir un veredicto final: Cumple, No Cumple o Revisión Requerida."
        user = f"Informe Analista: {analista_res}\n\nInforme Crítico: {critico_res}\n\nEmite tu veredicto final en formato JSON: {{'veredicto': '...', 'razonamiento': '...'}}"
        
        res = await self.sonnet.invoke(system, user)
        # Attempt to parse JSON from result
        try:
            # Basic cleanup if model adds extra text
            start = res.find('{')
            end = res.rfind('}') + 1
            return json.loads(res[start:end])
        except:
            return {"veredicto": "Revisión Requerida", "razonamiento": res}
