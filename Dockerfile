# ==========================================
# RuangPintar Edge Gateway - Multi-Stage Container
# Optimized for Raspberry Pi 4/5, Mini PC & Cloud VMs
# ==========================================

# Stage 1: Build & Compile Client Assets
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build tools for compiling SQLite C++ bindings
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Compile TypeScript and Vite PWA distribution
RUN npm run build

# Stage 2: Minimalist Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install wget for Docker HEALTHCHECK and basic runtime utilities
RUN apk add --no-cache wget

ENV NODE_ENV=production
ENV PORT=3000
ENV RUANGPINTAR_DB_PATH=/app/data/ruangpintar-edge.db

# Create persistent storage directory for offline SQLite database
RUN mkdir -p /app/data && chown -R node:node /app

# Copy dependencies, compiled assets, and server source
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/server ./server
COPY --chown=node:node --from=builder /app/server.ts ./server.ts
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json

# Run as non-privileged secure user
USER node

EXPOSE 3000

# Automated container healthcheck hitting the telemetry endpoint
HEALTHCHECK --interval=20s --timeout=4s --start-period=8s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

VOLUME ["/app/data"]

CMD ["npm", "start"]
