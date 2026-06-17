from typing import Any

from pydantic import BaseModel


class InvestigationPayload(BaseModel):
    pods: dict[str, Any]
    logs: dict[str, Any]
    events: dict[str, Any]
    deployments: dict[str, Any]
    network: dict[str, Any]


class Diagnosis(BaseModel):
    root_cause: str
    explanation: str
    fix: str
    kubectl_command: str
    prevention: str
    confidence: int


class InvestigateResponse(BaseModel):
    status: str
    investigation: InvestigationPayload
    diagnosis: Diagnosis | None = None
