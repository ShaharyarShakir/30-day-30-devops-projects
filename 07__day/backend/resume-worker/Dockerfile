FROM python:3.11-slim

WORKDIR /app

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

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/app:/app

CMD ["python", "app/main.py"]
