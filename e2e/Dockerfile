# Dockerfile for E2E Testing
FROM mcr.microsoft.com/playwright:v1.48.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Install Playwright browsers (they come pre-installed in the base image)
# But install deps just in case
RUN npx playwright install-deps

# Create directories for test results
RUN mkdir -p test-results playwright-report

# Set environment variables
ENV CI=true
ENV NODE_ENV=test

# Default command
CMD ["npm", "run", "test:docker"]
