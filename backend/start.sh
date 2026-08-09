#!/bin/sh
set -eu

python src/kafka_consumer.py &
consumer_pid=$!

cleanup() {
  kill "$consumer_pid" 2>/dev/null || true
  wait "$consumer_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

uvicorn main:app \
  --app-dir src \
  --host 0.0.0.0 \
  --port "${PORT:-8000}"
