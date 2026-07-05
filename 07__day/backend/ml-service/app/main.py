import io
import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pypdf import PdfReader

from app.db import init_db, get_resume_metadata, save_features, get_similar_resumes, get_features
from app.s3 import download_pdf
from app.features import extract_features, generate_embedding
from app.logging_config import instrument_app

app = FastAPI(title="ML Service", version="1.0.0")
instrument_app(app, "ml-service")
logger = logging.getLogger("ml-service")

class PredictRequest(BaseModel):
    resume_id: int

class EmbedRequest(BaseModel):
    text: str

@app.on_event("startup")
def on_startup():
    init_db()

@app.post("/predict")
def predict_similarity(req: PredictRequest):
    try:
        # 1. Fetch resume metadata from DB
        resume = get_resume_metadata(req.resume_id)
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resume with ID {req.resume_id} not found"
            )
        
        status_str = resume.get("status", "UPLOADED").upper()
        
        if status_str in ("UPLOADED", "PROCESSING"):
            return JSONResponse(
                status_code=202,
                content={
                    "resume_id": req.resume_id,
                    "status": status_str.lower(),
                    "message": "Resume processing is in progress. Please try again later."
                }
            )
            
        if status_str == "FAILED":
            return JSONResponse(
                status_code=422,
                content={
                    "resume_id": req.resume_id,
                    "status": "failed",
                    "message": "Resume processing failed.",
                    "error": resume.get("error_message")
                }
            )

        # 2. Get pre-computed features from DB
        features = get_features(req.resume_id)
        if not features:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Features for resume ID {req.resume_id} not found in database. Status is {status_str}."
            )

        # 3. Parse embedding vector (handle string or list format)
        embedding_str = features["embedding"]
        embedding = []
        if isinstance(embedding_str, str):
            clean_str = embedding_str.strip("[]")
            if clean_str:
                embedding = [float(x) for x in clean_str.split(",")]
        elif isinstance(embedding_str, list):
            embedding = embedding_str
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Stored embedding format is invalid"
            )
            
        # 4. Perform similarity search in pgvector
        similar_candidates = get_similar_resumes(req.resume_id, embedding, limit=5)
        
        return {
            "resume_id": req.resume_id,
            "filename": resume["filename"],
            "features": {
                "skills": features["skills"],
                "experience_years": float(features["experience_years"]) if features["experience_years"] is not None else 0.0,
                "education": features["education"]
            },
            "similar_candidates": similar_candidates
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Prediction failed for resume {req.resume_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )

@app.post("/embed")
def embed_text(req: EmbedRequest):
    if not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty"
        )
    try:
        embedding = generate_embedding(req.text)
        return {"embedding": embedding}
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embedding: {str(e)}"
        )

@app.get("/health")
def health_check():
    return {"status": "healthy"}
