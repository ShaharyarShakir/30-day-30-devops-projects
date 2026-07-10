import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.health import router as health_router
from app.api.v1.predict import router as predict_router
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("backend")

app = FastAPI(
    title="Medical Image Classification",
    description="Chest X-ray classifier using DenseNet121",
    version="1.0",
)

# Enable CORS for the React frontend running on dev port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount artifacts folder to serve training and validation diagnostic charts
app.mount("/artifacts", StaticFiles(directory="artifacts"), name="artifacts")


@app.middleware("http")
async def log_requests(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        f"{request.method} "
        f"{request.url.path} "
        f"{duration:.3f}s"
    )
    return response


# Root status mapping to preserve compatibility with legacy test clients
@app.get("/")
def root():
    return {"status": "running"}


app.include_router(health_router, prefix="/api/v1")
app.include_router(predict_router, prefix="/api/v1")
app.include_router(predict_router)
