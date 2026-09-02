"""
NetWorthy embedding service — self-hosted, CPU-only.

Wraps intfloat/multilingual-e5-small (EN/NL/AR/Tigrinya-capable) behind the
exact contract the platform's HttpEmbedder expects:

    POST /embed  { "texts": ["..."] }  ->  { "embeddings": [[...], ...] }

Design rules:
- Normalized embeddings (cosine == dot product downstream)
- Hard input caps: this box is CPU; huge batches are rejected, not queued
- No logging of input text — capability data is not log material
- No auth here: the service must run on a private Railway network and the
  app pins the host via EMBEDDING_HOST
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.environ.get("EMBED_MODEL", "intfloat/multilingual-e5-small")
MAX_TEXTS = 64
MAX_CHARS = 2000

model: SentenceTransformer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    # Load once at boot — first request must never pay model-load latency.
    model = SentenceTransformer(MODEL_NAME, device="cpu")
    yield


app = FastAPI(title="networthy-embedder", lifespan=lifespan)


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=MAX_TEXTS)


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_NAME, "ready": model is not None}


@app.post("/embed")
def embed(req: EmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="model still loading")
    if any(len(t) > MAX_CHARS for t in req.texts):
        raise HTTPException(status_code=413, detail=f"text exceeds {MAX_CHARS} chars")
    # E5 expects the "passage: " prefix for documents.
    vectors = model.encode(
        [f"passage: {t}" for t in req.texts],
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    return {"embeddings": [v.tolist() for v in vectors]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
