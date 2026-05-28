#!/bin/bash
# Exit on error
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting Uvicorn..."
# Bind to the PORT environment variable provided by Render
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
