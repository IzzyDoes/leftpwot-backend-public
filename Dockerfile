# Multi-stage build for testing and production
FROM node:18-alpine AS test

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for testing)
RUN npm ci

# Copy source code
COPY . .

# Run tests
RUN npm test

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code (excluding test files)
COPY . .

# Remove test files and dev dependencies from production image
RUN rm -rf test/ && \
    rm -rf node_modules/.cache && \
    rm -rf logs/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

CMD ["npm", "start"]
