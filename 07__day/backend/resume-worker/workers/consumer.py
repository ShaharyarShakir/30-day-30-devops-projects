import os
import json
import asyncio
import logging
from aiokafka import AIOKafkaConsumer

from app.db import update_resume_status, save_features
from app.s3 import download_pdf
from parsers.pdf import parse_pdf_resume
from embeddings.generator import generate_embedding

logger = logging.getLogger(__name__)

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
KAFKA_TOPIC = "resume-uploaded"
CONSUMER_GROUP = "resume-processor-group"

async def start_consumer():
    """
    Subscribes to the Kafka topic and processes incoming resume upload events.
    """
    consumer = None
    # Connect with retries to handle container startup lag
    for i in range(15):
        try:
            consumer = AIOKafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id=CONSUMER_GROUP,
                auto_offset_reset="earliest"
            )
            await consumer.start()
            logger.info(f"Kafka consumer started and subscribed to topic '{KAFKA_TOPIC}' successfully")
            break
        except Exception as e:
            logger.warning(f"Kafka consumer start failed (attempt {i+1}/15): {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)

    if not consumer:
        logger.error("Could not start Kafka consumer. Exiting consumer loop.")
        return

    try:
        async for msg in consumer:
            try:
                # Parse event message
                payload = json.loads(msg.value.decode("utf-8"))
                resume_id = payload.get("resume_id")
                object_key = payload.get("object_key")
                
                logger.info(f"Received upload event for resume ID {resume_id}, object key: {object_key}")
                
                if not resume_id or not object_key:
                    logger.error("Event payload missing resume_id or object_key")
                    continue

                # 1. Update status to PROCESSING
                update_resume_status(resume_id, "processing")

                # 2. Download PDF from S3/Garage
                logger.info(f"Downloading PDF from S3 for resume ID {resume_id}...")
                pdf_bytes = download_pdf(object_key)

                # 3. Parse PDF (Extract text, clean, extract skills, experience, education)
                logger.info(f"Parsing PDF content and extracting features for resume ID {resume_id}...")
                parsed_data = parse_pdf_resume(pdf_bytes)
                
                # Update status to PROCESSED
                update_resume_status(resume_id, "processed")

                # 4. Generate Embeddings
                logger.info(f"Generating unit-normalized embedding vector for resume ID {resume_id}...")
                embedding = generate_embedding(parsed_data["text"])

                # 5. Save features and embedding to PostgreSQL
                logger.info(f"Saving parsed features and vector to database for resume ID {resume_id}...")
                save_features(
                    resume_id=resume_id,
                    embedding=embedding,
                    skills=parsed_data["skills"],
                    experience_years=float(parsed_data["experience"]["years"]),
                    education=parsed_data["education"]
                )

                # 6. Update status to EMBEDDED
                update_resume_status(resume_id, "embedded")
                logger.info(f"Successfully processed and embedded resume ID {resume_id}")

            except Exception as process_error:
                logger.error(f"Failed to process resume ID {resume_id if 'resume_id' in locals() else 'unknown'}: {process_error}")
                if "resume_id" in locals() and resume_id:
                    try:
                        # Mark status as FAILED and record error message
                        update_resume_status(resume_id, "failed", str(process_error))
                    except Exception as db_err:
                        logger.error(f"Failed to write failure status to DB: {db_err}")

    finally:
        await consumer.stop()
        logger.info("Kafka consumer stopped")
