#!/bin/bash

set -e

# Backend (FastAPI)
echo "Starting FastAPI..."
uv run src/main.py &

# Kafka consumer
echo "Starting Kafka consumer..."
uv run src/kafka_consumer.py &

# Frontend
echo "Starting frontend..."
cd frontend
npm run dev &

wait
