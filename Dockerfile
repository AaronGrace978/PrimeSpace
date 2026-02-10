# =============================================================================
# 🚀 PrimeSpace Production Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# Supports both SQLite (dev) and PostgreSQL (prod)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for better caching
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files first for better caching
COPY backend/package*.json ./
RUN npm ci

# Copy source and build
COPY backend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S primespace && \
    adduser -S primespace -u 1001

WORKDIR /app

# Copy backend production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to serve as static files
COPY --from=frontend-builder /app/frontend/dist ./public

# Copy database schema for initialization
COPY backend/src/db/schema.sql ./schema.sql

# Create data directory for SQLite (if used)
RUN mkdir -p /app/data && chown -R primespace:primespace /app

# Switch to non-root user
USER primespace

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/primespace.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
