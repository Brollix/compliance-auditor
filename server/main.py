import os
import asyncio
import time
from fastapi import FastAPI, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from mangum import Mangum
from loguru import logger
import httpx
import boto3
import json
from dotenv import load_dotenv

from agentes import AI_Auditor_Agents
from saij_client import SAIJClient
from infoleg_client import InfolegClient
load_dotenv()

app = FastAPI(title="AI Auditor Pro API", version="1.0.0")
handler = Mangum(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Schemas ---

class AuditRequest(BaseModel):
    query: str
    session_id: str
    collection_name: Optional[str] = "default_audit"
    framework: Optional[str] = "iso"

class Citation(BaseModel):
    source: str
    page: Optional[int] = None
    snippet: str

class AuditResponse(BaseModel):
    veredicto: str
    razonamiento: str
    evidencia: str
    critica: str
    citations: List[Citation]
    latency_ms: float

# --- Dependencies & Helpers ---

class BedrockEmbeddingFunction:
    """Generates embeddings using Amazon Bedrock Titan model."""
    def __init__(self, model_id=None, region_name=None):
        self.model_id = model_id or os.getenv("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v1")
        self.region_name = region_name or os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        profile = os.getenv("AWS_PROFILE")
        
        session = boto3.Session(profile_name=profile) if profile else boto3.Session()
        self.bedrock = session.client("bedrock-runtime", region_name=self.region_name)

    async def __call__(self, documents: List[str]) -> List[List[float]]:
        embeddings = []
        for text in documents:
            try:
                payload = json.dumps({"inputText": text})
                response = self.bedrock.invoke_model(
                    body=payload,
                    modelId=self.model_id,
                    accept="application/json",
                    contentType="application/json"
                )
                response_body = json.loads(response.get("body").read())
                embeddings.append(response_body.get("embedding"))
            except Exception as e:
                logger.error(f"Bedrock Embedding Error: {str(e)}")
                # Dynamic fallback based on model (Titan V2 = 1024, V1 = 1536)
                dim = 1024 if "v2" in self.model_id else 1536
                embeddings.append([0.0] * dim)
        return embeddings

class ChromaRESTClient:
    """Lightweight REST client for ChromaDB v2 to avoid native dependencies on Lambda."""
    def __init__(self, host: str, port: int, tenant: str = "default_tenant", database: str = "default_database"):
        self.base_url = f"http://{host}:{port}/api/v2/tenants/{tenant}/databases/{database}"
        self.root_url = f"http://{host}:{port}/api/v2"

    async def heartbeat(self):
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{self.root_url}/heartbeat", timeout=5.0)
            res.raise_for_status()
            return res.json()

    async def get_or_create_collection(self, name: str):
        async with httpx.AsyncClient() as client:
            try:
                # Check if exists
                res = await client.get(f"{self.base_url}/collections", timeout=15.0)
                collections = res.json()
                for col in collections:
                    if col["name"] == name:
                        return col
                # Create if not exists
                res = await client.post(f"{self.base_url}/collections", json={"name": name, "get_or_create": True}, timeout=15.0)
                res.raise_for_status()
                return res.json()
            except httpx.ConnectTimeout:
                logger.error(f"Timeout conectando a ChromaDB en {self.base_url}. ¿Está activa la VPN?")
                raise HTTPException(status_code=503, detail="Error de conexión con la base de datos de vectores (ChromaDB Timeout).")

    async def add(self, collection_id: str, documents: List[str], embeddings: List[List[float]], metadatas: List[Dict], ids: List[str]):
        async with httpx.AsyncClient() as client:
            payload = {
                "ids": ids,
                "embeddings": embeddings,
                "metadatas": metadatas,
                "documents": documents
            }
            res = await client.post(f"{self.base_url}/collections/{collection_id}/add", json=payload, timeout=30.0)
            res.raise_for_status()
            return res.json()

    async def query(self, collection_id: str, query_embeddings: List[List[float]], n_results: int = 3):
        async with httpx.AsyncClient() as client:
            payload = {
                "query_embeddings": query_embeddings,
                "n_results": n_results,
                "include": ["documents", "metadatas", "distances"]
            }
            res = await client.post(f"{self.base_url}/collections/{collection_id}/query", json=payload, timeout=30.0)
            res.raise_for_status()
            return res.json()

    async def delete_collection(self, name: str):
        async with httpx.AsyncClient() as client:
            res = await client.delete(f"{self.base_url}/collections/{name}", timeout=5.0)
            return res.json()

class State:
    def __init__(self):
        self.agents = AI_Auditor_Agents()
        self.saij_client = SAIJClient()
        self.infoleg_client = InfolegClient()
        self._chroma_client = None
        self._embedding_function = None

    @property
    def embedding_function(self):
        if self._embedding_function is None:
            self._embedding_function = BedrockEmbeddingFunction()
        return self._embedding_function

    @property
    def chroma_client(self):
        if self._chroma_client is None:
            self._chroma_client = ChromaRESTClient(
                host=os.getenv("CHROMA_HOST", "localhost"),
                port=int(os.getenv("CHROMA_PORT", 8000))
            )
        return self._chroma_client

state = State()

# --- Endpoints ---

@app.get("/health")
async def health_check():
    chroma_status = "unknown"
    bedrock_status = "unknown"
    try:
        await state.chroma_client.heartbeat()
        chroma_status = "connected"
    except Exception as e:
        chroma_status = f"unreachable: {str(e)[:100]}"
    
    try:
        # Real Bedrock check
        await state.embedding_function(["health check"])
        bedrock_status = "connected"
    except Exception as e:
        bedrock_status = f"unreachable: {str(e)[:100]}"
        
    return {
        "status": "healthy" if chroma_status == "connected" and bedrock_status == "connected" else "degraded",
        "bedrock": bedrock_status,
        "chroma": chroma_status
    }

@app.post("/upload")
async def upload_document(file: UploadFile, collection_name: str = "default_audit"):
    logger.info(f"Uploading file: {file.filename} to collection: {collection_name}")
    try:
        # 1. Store in S3 (Mocked)
        # 2. Extract Text (Mocked for now)
        # 3. Embed and store in ChromaDB
        col_obj = await state.chroma_client.get_or_create_collection(name=collection_name)
        collection_id = col_obj["id"]
        
        # Simulation of ingestion
        content = await file.read()
        text = ""
        if file.filename.lower().endswith('.pdf'):
            import io
            from pypdf import PdfReader
            try:
                reader = PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            except Exception as e:
                logger.error(f"Error parsing PDF: {e}")
                text = content.decode('utf-8', errors='ignore')
        else:
            text = content.decode('utf-8', errors='ignore')
        
        # 3a. Generate Bedrock Embeddings locally in Lambda
        # Implement Chunking with overlap
        chunk_size = 1000
        overlap = 150
        chunks = []
        
        if len(text) > chunk_size:
            start = 0
            while start < len(text):
                chunks.append(text[start:start + chunk_size])
                start += chunk_size - overlap
        else:
            chunks = [text] if text.strip() else ["Documento sin texto legible"]
            
        # Limit chunks to avoid excessive API calls in POC (e.g., max 50 chunks = ~50k chars)
        chunks = chunks[:50]
        
        embeddings = await state.embedding_function(chunks)
        logger.info(f"Generated {len(embeddings)} embeddings of dimension {len(embeddings[0])}")
        
        # 3b. Send to remote ChromaDB server via REST
        ids = [f"{file.filename}_{int(time.time())}_{i}" for i in range(len(chunks))]
        metadatas = [{"filename": file.filename, "chunk": i} for i in range(len(chunks))]
        
        await state.chroma_client.add(
            collection_id=collection_id,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        return {"status": "success", "filename": file.filename, "chunks_processed": len(chunks)}
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/audit", response_model=AuditResponse)
async def run_audit(request: AuditRequest):
    start_time = time.time()
    logger.info(f"Audit request received. Session: {request.session_id}, Framework: {request.framework}")
    
    try:
        # 1. Retrieval of the company document chunk (ChromaDB)
        logger.info(f"Querying ChromaDB collection: {request.collection_name}")
        col_obj = await state.chroma_client.get_or_create_collection(name=request.collection_name)
        collection_id = col_obj["id"]
        
        # 1a. Generate Query Embedding with Bedrock
        query_embeddings = await state.embedding_function([request.query])
        
        # 1b. Query remote ChromaDB via REST
        results = await state.chroma_client.query(
            collection_id=collection_id,
            query_embeddings=query_embeddings,
            n_results=3
        )
        
        # Robust handling of empty results
        documents = results.get('documents', [])
        if not documents or not documents[0]:
            logger.warning("No documents found in ChromaDB collection.")
            company_doc_context = "No se encontraron documentos en la colección para este análisis."
            snippets = []
            metadatas = []
        else:
            company_doc_context = " ".join(documents[0])
            snippets = documents[0]
            metadatas = results.get('metadatas', [[]])[0]
        
        logger.info(f"Retrieved {len(snippets)} snippets from ChromaDB")
        
        citations = []
        doc_snippets_by_file = {}
        for i, snippet in enumerate(snippets):
            source = metadatas[i].get("filename", "unknown") if i < len(metadatas) else "unknown"
            if source not in doc_snippets_by_file:
                doc_snippets_by_file[source] = []
            doc_snippets_by_file[source].append(snippet)
            
        for source, snips in doc_snippets_by_file.items():
            combined_snippet = "... ".join([s.replace('\n', ' ')[:150].strip() for s in snips]) + "..."
            citations.append(Citation(
                source=source,
                snippet=f"Resumen de {len(snips)} fragmentos analizados: {combined_snippet}"
            ))

        analista_res = ""
        critico_res = ""
        veredicto_final = {"veredicto": "Error", "razonamiento": "Error en el flujo de agentes."}

        if request.framework == "saij":
            # 1a. Extract keywords from company document for CKAN search
            logger.info("Invoking Agent: Buscador (SAIJ)")
            keywords = await state.agents.agente_buscador(company_doc_context)
            logger.info(f"Extracted SAIJ Keywords: {keywords}")
            
            # 1b. Search CKAN
            logger.info("Searching SAIJ CKAN API...")
            laws = state.saij_client.search_laws(keywords, limit=3)
            laws_context_str = ""
            for i, law in enumerate(laws):
                # Try to get full text from InfoLEG for deeper RAG
                law_full_text = None
                if law.get('numero'):
                    logger.info(f"Attempting to fetch full text for Law {law['numero']} from InfoLEG")
                    law_full_text = state.infoleg_client.get_full_text(law['numero'])
                
                if law_full_text:
                    logger.info(f"Successfully fetched full text for Law {law['numero']}. Using it for RAG.")
                    law_context = law_full_text[:5000] # Limit to avoid context window explosion
                    laws_context_str += f"[{i+1}] {law['titulo']} ({law['tipo']} {law['numero']}) - TEXTO COMPLETO:\n{law_context}\n"
                    citations.append(Citation(source=f"InfoLEG (Full Text): {law['titulo']}", snippet=law_full_text[:200] + "..."))
                else:
                    laws_context_str += f"[{i+1}] {law['titulo']} ({law['tipo']} {law['numero']}) - RESUMEN:\n{law['resumen']}\n"
                    citations.append(Citation(source=f"SAIJ: {law['titulo']}", snippet=law['resumen']))
            
            if not laws_context_str:
                laws_context_str = "No se encontraron leyes específicas en SAIJ."
                
            # 2. Parallel Agents for SAIJ
            logger.info("Invoking Agents: Analista & Critico (SAIJ)")
            analista_task = state.agents.agente_analista(context=laws_context_str, query=company_doc_context, framework="saij")
            critico_task = state.agents.agente_critico(context=laws_context_str, query=company_doc_context, framework="saij")
            analista_res, critico_res = await asyncio.gather(analista_task, critico_task)
            
            # 3. Triple Check: Validation Agent
            logger.info("Invoking Agent: Verificador (SAIJ - TRIPLE CHECK)")
            # Use the combined full text of laws if we have it, otherwise fallback to summaries
            full_text_for_verification = laws_context_str
            verificador_res = await state.agents.agente_verificador(
                analista_res=analista_res, 
                critico_res=critico_res, 
                full_law_text=full_text_for_verification
            )
            
            logger.info("Invoking Agent: Juez (SAIJ)")
            veredicto_final = await state.agents.agente_juez(
                analista_res=analista_res, 
                critico_res=critico_res, 
                verificador_res=verificador_res, 
                framework="saij"
            )
        else:
            # 2. Parallel Agents for ISO/Standard
            logger.info("Invoking Agents: Analista & Critico (ISO)")
            analista_task = state.agents.agente_analista(company_doc_context, request.query, framework="iso")
            critico_task = state.agents.agente_critico(company_doc_context, request.query, framework="iso")
            analista_res, critico_res = await asyncio.gather(analista_task, critico_task)

            # 3. Agent Juez Consensus
            logger.info("Invoking Agent: Juez (ISO)")
            veredicto_final = await state.agents.agente_juez(analista_res, critico_res, framework="iso")

        latency = (time.time() - start_time) * 1000
        logger.info(f"Audit completed in {latency:.2f}ms")

        return AuditResponse(
            veredicto=veredicto_final.get("veredicto", "Error"),
            razonamiento=veredicto_final.get("razonamiento", ""),
            evidencia=analista_res,
            critica=critico_res,
            citations=citations,
            latency_ms=latency
        )

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Audit failure trace:\n{error_trace}")
        
        return AuditResponse(
            veredicto="Error",
            razonamiento=f"Excepción interna: {str(e)}",
            evidencia=f"Traceback:\n{error_trace[:500]}...",
            critica="Ocurrió un error procesando la auditoría. Por favor revisa los logs de la Lambda.",
            citations=[],
            latency_ms=0
        )

@app.post("/purge")
async def purge_session(collection_name: str):
    try:
        await state.chroma_client.delete_collection(name=collection_name)
        return {"status": "purged", "collection": collection_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
