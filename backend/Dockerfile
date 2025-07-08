FROM python:3.11-slim

# Install full LaTeX for robust PDF compilation (Beamer, TikZ, fonts, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (optional but recommended)
RUN adduser --disabled-password --no-create-home appuser

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source code
COPY ./app ./app

# Use non-root user
USER appuser

# Start FastAPI app

#for production,no reload
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 

# For development, with reload on changes
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

