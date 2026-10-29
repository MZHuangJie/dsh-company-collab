#!/usr/bin/env python3
"""Local embedding service for company-collab RAG.

Run with:
  EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5 \
  EMBEDDING_CACHE=/var/lib/company-embed/models \
  uvicorn company-embed-app:app --host 127.0.0.1 --port 8488

The service is intentionally loopback-only; the Hub calls /embed.
"""
import os
import threading
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastembed import TextEmbedding

MODEL_NAME = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
CACHE_DIR = os.environ.get("EMBEDDING_CACHE", "/var/lib/company-embed/models")
THREADS = int(os.environ.get("EMBEDDING_THREADS", "4"))

app = FastAPI(title="company-embed")
_model = None
_model_lock = threading.Lock()


def get_model():
    global _model
    with _model_lock:
        if _model is None:
            os.makedirs(CACHE_DIR, exist_ok=True)
            _model = TextEmbedding(
                model_name=MODEL_NAME,
                cache_dir=CACHE_DIR,
                threads=THREADS,
            )
    return _model


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=64)


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_NAME, "loaded": _model is not None}


@app.post("/embed")
def embed(request: EmbedRequest):
    texts = [text if isinstance(text, str) else str(text) for text in request.texts]
    if not texts:
        raise HTTPException(status_code=400, detail="empty texts")
    try:
        vectors = [vector.tolist() for vector in get_model().embed(texts, batch_size=16)]
    except Exception as error:  # pragma: no cover - operational failure
        raise HTTPException(status_code=500, detail=f"embed failed: {error}") from error
    return {
        "model": MODEL_NAME,
        "dim": len(vectors[0]) if vectors else 0,
        "vectors": vectors,
    }


@app.on_event("startup")
def warmup():
    # Load/download at startup so the first real request is not a cold start.
    get_model()
