FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY pyproject.toml ./
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        "fastapi>=0.128.0" \
        "uvicorn>=0.40.0" \
        "kafka-python>=2.3.0" \
        "sqlalchemy>=2.0.45" \
        "elasticsearch>=9.2.1" \
        "boto3>=1.42.19" \
        "python-dotenv>=1.2.1" \
        "requests>=2.32.5"

COPY src ./src
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 8000
CMD ["./start.sh"]
