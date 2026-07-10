from pydantic import BaseModel
from typing import Optional


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    heatmap: Optional[str] = None


class ReportRequest(BaseModel):
    prediction: str
    confidence: float
    image: str
    heatmap: str
