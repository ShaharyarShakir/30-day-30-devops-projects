FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if any are needed (psycopg2-binary doesn't strictly need gcc, but libpq-dev is useful)
RUN apk_add_libs=' \
    build-essential \
    libpq-dev \
    ' \
    && apt-get update \
    && apt-get install -y --no-install-recommends $apk_add_libs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8082

ENV PORT=8082
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8082"]
