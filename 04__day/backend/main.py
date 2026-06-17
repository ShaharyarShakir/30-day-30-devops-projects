from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from api.routes import health_router, investigate_router
from core import setup_logging
from core.config import settings

load_dotenv()
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Kubernetes Agent backend")
    yield
    logger.info("Shutting down AI Kubernetes Agent backend")


app = FastAPI(
    title="AI Kubernetes Agent",
    description="On-demand Kubernetes troubleshooting with AI",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(investigate_router)
