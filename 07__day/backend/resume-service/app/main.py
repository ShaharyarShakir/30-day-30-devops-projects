import io
import os
import json
import logging
import asyncio
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, status
from fastapi.responses import JSONResponse
from aiokafka import AIOKafkaProducer

from app.db import init_db, insert_resume, get_resume, delete_resume
from app.s3 import upload_pdf, delete_pdf
from app.logging_config import instrument_app

app = FastAPI(title="Resume Service", version="1.0.0")
instrument_app(app, "resume-service")
logger = logging.getLogger("resume-service")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = "resume-uploaded"

producer = None

@app.on_event("startup")
async def on_startup():
    global producer
    init_db()
    
    # Initialize AIOKafkaProducer with retry loop for synchronization on container startup
    for i in range(15):
        try:
            producer = AIOKafkaProducer(bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS)
            await producer.start()
            logger.info("AIOKafkaProducer started successfully")
            break
        except Exception as e:
            logger.warning(f"Failed to start AIOKafkaProducer (attempt {i+1}/15): {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)

@app.on_event("shutdown")
async def on_shutdown():
    global producer
    if producer:
        await producer.stop()
        logger.info("AIOKafkaProducer stopped")

@app.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    x_user_id: str = Header(None, alias="X-User-ID")
):
    # Validate User ID
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-ID header"
        )
    
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-User-ID format"
        )

    # Validate file type
    if not file.filename.endswith(".pdf") and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    try:
        # Read file bytes
        file_bytes = await file.read()
        
        # Upload to S3/Garage
        import uuid
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        object_key = upload_pdf(file_bytes, unique_filename)

        # Save metadata to DB with initial status "uploaded"
        metadata = insert_resume(
            user_id=user_id,
            filename=file.filename,
            object_key=object_key,
            status="uploaded"
        )
        
        # Publish upload event to Kafka
        if producer:
            from opentelemetry import trace
            current_span = trace.get_current_span()
            trace_id = None
            if current_span and current_span.get_span_context().is_valid:
                trace_id = format(current_span.get_span_context().trace_id, '032x')

            event_payload = {
                "resume_id": metadata["id"],
                "user_id": metadata["user_id"],
                "object_key": metadata["object_key"],
                "trace_id": trace_id
            }
            try:
                await producer.send_and_wait(KAFKA_TOPIC, json.dumps(event_payload).encode("utf-8"))
                logger.info(f"Published upload event to Kafka topic '{KAFKA_TOPIC}' for resume ID {metadata['id']}", extra={"trace_id": trace_id})
            except Exception as ke:
                logger.error(f"Failed to publish Kafka event: {ke}", extra={"trace_id": trace_id})
        else:
            logger.error("Kafka producer not initialized. Event was not published.")
        
        return metadata

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unexpected error during upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@app.get("/resume/{id}")
def get_resume_by_id(
    id: int,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_user_role: str = Header(None, alias="X-User-Role")
):
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-ID header"
        )

    resume = get_resume(id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Ownership check
    if x_user_role not in ("admin", "recruiter"):
        try:
            user_id = int(x_user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-User-ID format"
            )

        if resume["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden to this resume"
            )

    return resume

@app.delete("/resume/{id}")
def delete_resume_by_id(
    id: int,
    x_user_id: str = Header(None, alias="X-User-ID"),
    x_user_role: str = Header(None, alias="X-User-Role")
):
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-User-ID header"
        )

    resume = get_resume(id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )

    # Ownership check
    if x_user_role not in ("admin", "recruiter"):
        try:
            user_id = int(x_user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-User-ID format"
            )

        if resume["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden to this resume"
            )

    # Delete from S3/Garage
    try:
        delete_pdf(resume["object_key"])
    except Exception as e:
        logger.error(f"Failed to delete PDF from storage: {e}")
        # Proceed with metadata deletion anyway or raise error? Usually better to try deleting metadata too

    # Delete from DB
    deleted = delete_resume(id)
    if not deleted:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete resume metadata"
        )

    return {"message": "Resume successfully deleted"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
