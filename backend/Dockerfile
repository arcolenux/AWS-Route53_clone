FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Environment defaults (override in production)
ENV ROUTE53_DATABASE_PATH=/data/route53.db
ENV ROUTE53_SECRET_KEY=change-me-in-production
ENV ROUTE53_TOKEN_EXPIRE_MINUTES=480
ENV ROUTE53_SEED_PASSWORD=DemoPass123!

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
