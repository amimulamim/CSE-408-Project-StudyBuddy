FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
COPY ./keys ./keys

COPY .env .env

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# FROM python:3.11-slim

# # Create a non-root user
# RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# WORKDIR /app

# # Copy and install dependencies as root (before switching user)
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# # Copy the rest of the application
# COPY ./app ./app
# COPY ./keys ./keys
# COPY .env .env

# # Change ownership of app files to the non-root user
# RUN chown -R appuser:appgroup /app

# # Set environment variable to differentiate between CI and production
# ARG ENVIRONMENT=production
# ENV ENVIRONMENT=${ENVIRONMENT}

# RUN if [ "$ENVIRONMENT" != "ci" ]; then \
#     USER appuser; \
#     fi

# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
