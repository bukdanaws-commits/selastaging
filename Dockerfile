# =============================================================================
#  SELEVENT — Next.js Frontend Docker Image for Cloud Run
#
#  Build:  docker build -f Dockerfile.frontend -t selevent-web .
#  Run:    docker run -p 3000:3000 selevent-web
#
#  IMPORTANT: Docker build context is project root (.)
#  All COPY paths must be relative to project root.
#
#  Uses node:20-slim (Debian) for deps+builder stages because:
#  - sharp has prebuilt binaries for glibc (Debian) but NOT musl (Alpine)
#  - Alpine requires building sharp from source which is fragile
#  Runtime stage uses Alpine for smaller image (sharp not needed at runtime)
# =============================================================================

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
# Use Debian-slim because sharp has prebuilt binaries for glibc, NOT musl (Alpine)
FROM node:20-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json ./

# Install ALL dependencies using npm (including devDependencies for build)
RUN npm install --legacy-peer-deps

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Build-time environment variables (baked into build, NOT secrets)
# ⚠️ NEXT_PUBLIC_USE_MOCK MUST be 'false' to connect to real backend!
ARG NEXT_PUBLIC_USE_MOCK="false"
ARG NEXT_PUBLIC_API_URL="https://eventku-api-lkfw4e5kna-et.a.run.app"
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID="503551786622-k3uajo9c2d6om6qnqofsa3b47fvo5o6g.apps.googleusercontent.com"
ARG NEXT_PUBLIC_DOKU_ENVIRONMENT="production"
ARG NEXT_PUBLIC_DOKU_API_BASE_URL="https://api.doku.com"
ARG NEXT_PUBLIC_DOKU_CHECKOUT_URL="https://checkout.doku.com"
ARG NEXT_PUBLIC_DOKU_CLIENT_ID=""
ARG NEXT_PUBLIC_DOKU_NOTIFICATION_URL=""
ARG NEXT_PUBLIC_DOKU_FINISH_URL=""
ARG NEXT_PUBLIC_DOKU_ERROR_URL=""
ARG NEXT_PUBLIC_DOKU_UNPAYMENT_URL=""
ARG NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE="5"
ARG NEXT_PUBLIC_SETTLEMENT_DAYS="7"

# Set build-time env vars
ENV NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_DOKU_ENVIRONMENT=$NEXT_PUBLIC_DOKU_ENVIRONMENT
ENV NEXT_PUBLIC_DOKU_API_BASE_URL=$NEXT_PUBLIC_DOKU_API_BASE_URL
ENV NEXT_PUBLIC_DOKU_CHECKOUT_URL=$NEXT_PUBLIC_DOKU_CHECKOUT_URL
ENV NEXT_PUBLIC_DOKU_CLIENT_ID=$NEXT_PUBLIC_DOKU_CLIENT_ID
ENV NEXT_PUBLIC_DOKU_NOTIFICATION_URL=$NEXT_PUBLIC_DOKU_NOTIFICATION_URL
ENV NEXT_PUBLIC_DOKU_FINISH_URL=$NEXT_PUBLIC_DOKU_FINISH_URL
ENV NEXT_PUBLIC_DOKU_ERROR_URL=$NEXT_PUBLIC_DOKU_ERROR_URL
ENV NEXT_PUBLIC_DOKU_UNPAYMENT_URL=$NEXT_PUBLIC_DOKU_UNPAYMENT_URL
ENV NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=$NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE
ENV NEXT_PUBLIC_SETTLEMENT_DAYS=$NEXT_PUBLIC_SETTLEMENT_DAYS

# Generate .env.production from build args — guaranteed to be read by Next.js
RUN echo "NEXT_PUBLIC_USE_MOCK=${NEXT_PUBLIC_USE_MOCK}" > .env.production && \
    echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_ENVIRONMENT=${NEXT_PUBLIC_DOKU_ENVIRONMENT}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_API_BASE_URL=${NEXT_PUBLIC_DOKU_API_BASE_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_CHECKOUT_URL=${NEXT_PUBLIC_DOKU_CHECKOUT_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_CLIENT_ID=${NEXT_PUBLIC_DOKU_CLIENT_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_NOTIFICATION_URL=${NEXT_PUBLIC_DOKU_NOTIFICATION_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_FINISH_URL=${NEXT_PUBLIC_DOKU_FINISH_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_ERROR_URL=${NEXT_PUBLIC_DOKU_ERROR_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_DOKU_UNPAYMENT_URL=${NEXT_PUBLIC_DOKU_UNPAYMENT_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=${NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE}" >> .env.production && \
    echo "NEXT_PUBLIC_SETTLEMENT_DAYS=${NEXT_PUBLIC_SETTLEMENT_DAYS}" >> .env.production && \
    echo "=== .env.production ===" && cat .env.production && echo "=== end ==="

# Build Next.js application (standalone output)
# The build script also copies static files into standalone output:
#   "build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Verify standalone output exists
RUN ls -la .next/standalone/ && echo "✅ Standalone output verified"

# ── Stage 3: Production Runtime ──────────────────────────────────────────────
# Runtime uses Alpine for smaller image (sharp prebuilt included in standalone)
FROM node:20-alpine AS runner

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install minimal runtime deps
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl

# Set timezone
ENV TZ=Asia/Jakarta
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set working directory
WORKDIR /app

# Copy standalone output (minimal Next.js server + dependencies)
COPY --from=builder /app/.next/standalone ./

# Copy public and static files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port (Cloud Run will route to this)
EXPOSE 3000

# Set environment variables for server
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start Next.js server
CMD ["node", "server.js"]
