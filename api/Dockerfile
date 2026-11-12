# ==========================================
# Stage 1: Build & Dependencies Resolution
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including dev for build checks)
RUN npm ci

# Copy source code
COPY . .

# Prune devDependencies to keep production image minimal
RUN npm prune --production

# ==========================================
# Stage 2: Minimal Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set non-root production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init or curl for container health checks
RUN apk add --no-cache curl

# Copy production dependencies and application files from builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/server.js ./server.js
COPY --from=builder --chown=node:node /app/src ./src

# Drop privileges to standard non-root node user (Security specification)
USER node

# Expose internal API port
EXPOSE 5000

# Health check using the internal /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start Node.js application
CMD ["node", "server.js"]
