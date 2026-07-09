from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def check_health():
    """
    Service health check endpoint.
    """
    return {"status": "running"}
