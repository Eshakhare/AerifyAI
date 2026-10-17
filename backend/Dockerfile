FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY architecture /app/architecture
COPY backend /app/backend

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend
ENV PORT=8080

CMD ["uvicorn", "service.main:app", "--host", "0.0.0.0", "--port", "8080"]
