FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy backend source
COPY backend/ ./

# Copy frontend files to public directory
COPY frontend/ ./public/

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose ports
EXPOSE 3000 25

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/emails.db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
