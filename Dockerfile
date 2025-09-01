# Use official Node.js image
FROM node:20-slim

# Install dependencies for Playwright browsers
RUN apt-get update && \
    apt-get install -y wget curl git libnss3 libatk1.0-0 libxss1 libgtk-3-0 libx11-xcb1 libxcomposite1 libxrandr2 libasound2 && \
    rm -rf /var/lib/apt/lists/*

# Install Playwright and browsers
RUN npm install -g playwright && \
    playwright install --with-deps

# Set working directory
WORKDIR /app

# By default, run bash (we’ll override this with test commands)
CMD ["bash"]
