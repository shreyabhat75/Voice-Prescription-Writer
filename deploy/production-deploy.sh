#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not on PATH."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available. Install Docker Compose v2."
  exit 1
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Created .env from .env.example."
  echo "Edit .env if you need live STT/LLM keys. Leave mock values for a local/demo run."
fi

echo "Building and starting production stack..."
docker compose -f docker-compose.prod.yml up --build -d

echo "Waiting for http://localhost/health ..."
for i in $(seq 1 40); do
  if curl -fsS http://localhost/health >/dev/null 2>&1; then
    echo "Voice Prescription Writer is up at http://localhost"
    exit 0
  fi
  sleep 3
done

echo "Health check failed."
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs
exit 1
