# ==============================================================================
# Crownfall Authoritative Multiplayer Server — Dockerfile for Render Web Service
# Multi-stage build: compiles C++ engine binary and executes Node.js room server.
# ==============================================================================

# Stage 1: Build native C++ authoritative engine
FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    make \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy C++ engine sources and headers
COPY cpp/ ./cpp/
COPY Makefile ./

# Compile native binary with optimizations
RUN make

# ==============================================================================
# Stage 2: Minimal Node.js 22 runtime for the WebSocket & HTTP room server
# ==============================================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Set production environment defaults (overridden dynamically by Render)
ENV NODE_ENV=production \
    PORT=10000 \
    HOST=0.0.0.0 \
    ENGINE_BIN_PATH=/app/bin/monopoly_engine

# Copy compiled C++ engine binary from builder
COPY --from=builder /build/bin/monopoly_engine ./bin/monopoly_engine
RUN chmod +x ./bin/monopoly_engine

# Copy multiplayer server script, abuse protection, and package configuration
COPY scripts/ ./scripts/
COPY package.json ./

# Render dynamically binds the external port via $PORT
EXPOSE 10000

# Start Crownfall Authoritative Server
CMD ["node", "scripts/multiplayer_server.cjs"]
