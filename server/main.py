import os
import asyncio
import time
from fastapi import FastAPI, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from mangum import Mangum
from loguru import logger
import chromadb
from dotenv import load_dotenv

from agentes import AI_Auditor_Agents

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

class State:
    def __init__(self):
        self.agents = AI_Auditor_Agents()
        # ChromaDB HTTP Client
        self.chroma_client = chromadb.HttpClient(
            host=os.getenv("CHROMA_HOST", "localhost"),
            port=int(os.getenv("CHROMA_PORT", 8000))
        )

state = State()

# --- Endpoints ---

@app.get("/health")
async def health_check():
    try:
        # Mock connectivity Check
        return {
            "status": "healthy",
            "bedrock": "connected",
            "chroma": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_document(file: UploadFile, collection_name: str = "default_audit"):
    logger.info(f"Uploading file: {file.filename} to collection: {collection_name}")
    try:
        # 1. Store in S3 (Mocked)
        # 2. Extract Text (Mocked for now)
        # 3. Embed and store in ChromaDB
        collection = state.chroma_client.get_or_create_collection(name=collection_name)
        
        # Simulation of ingestion
        content = await file.read()
        text = content.decode('utf-8', errors='ignore')
        
        collection.add(
            documents=[text[:1000]], # Dummy first 1k chars
            metadatas=[{"filename": file.filename}],
            ids=[f"{file.filename}_{int(time.time())}"]
        )
        
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/audit", response_model=AuditResponse)
async def run_audit(request: AuditRequest):
    start_time = time.time()
    logger.info(f"Audit request received: {request.query}")
    
    try:
        # 1. Retrieval (ChromaDB)
        collection = state.chroma_client.get_collection(name=request.collection_name)
        results = collection.query(
            query_texts=[request.query],
            n_results=3
        )
        
        context = " ".join(results['documents'][0]) if results['documents'] else "No context found."
        snippets = results['documents'][0] if results['documents'] else []
        metadatas = results['metadatas'][0] if results['metadatas'] else []

        # 2. Triple Validation (Parallel Agents)
        analista_task = state.agents.agente_analista(context, request.query)
        critico_task = state.agents.agente_critico(context, request.query)
        
        analista_res, critico_res = await asyncio.gather(analista_task, critico_task)

        # 3. Agent Juez Consensus
        veredicto_final = await state.agents.agente_juez(analista_res, critico_res)

        # 4. Prepare Citations
        citations = []
        for i, snippet in enumerate(snippets):
            citations.append(Citation(
                source=metadatas[i].get("filename", "unknown"),
                snippet=snippet[:200] + "..."
            ))

        latency = (time.time() - start_time) * 1000

        return AuditResponse(
            veredicto=veredicto_final.get("veredicto", "Error"),
            razonamiento=veredicto_final.get("razonamiento", ""),
            evidencia=analista_res,
            critica=critico_res,
            citations=citations,
            latency_ms=latency
        )

    except Exception as e:
        logger.error(f"Audit failure: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audit failed: {str(e)}")

@app.post("/purge")
async def purge_session(collection_name: str):
    try:
        state.chroma_client.delete_collection(name=collection_name)
        return {"status": "purged", "collection": collection_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
