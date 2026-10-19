FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy application code
COPY architecture /app/architecture
COPY backend /app/backend

# Copy frontend static build so FastAPI serves it at root / and /assets
COPY ui-bundle/dist /app/ui-bundle/dist
COPY backend/static /app/backend/static

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend
ENV PORT=8080

CMD ["sh", "-c", "exec uvicorn service.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
