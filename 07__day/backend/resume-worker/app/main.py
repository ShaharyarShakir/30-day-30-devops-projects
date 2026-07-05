import asyncio
import logging
import sys

from app.db import init_db
from workers.consumer import start_consumer

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("resume-worker")

async def main():
    logger.info("Resume Processing Worker service starting...")
    
    # Verify DB connectivity on start
    try:
        init_db()
    except Exception as db_err:
        logger.critical(f"Database connection verification failed: {db_err}")
        sys.exit(1)

    # Launch event loop consumer
    try:
        await start_consumer()
    except Exception as e:
        logger.critical(f"Consumer loop failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Service interrupted by user. Exiting.")
        sys.exit(0)
