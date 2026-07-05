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

EXPOSE 8083

ENV PORT=8083
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8083"]
