# =============================================================================
#  SELEVENT — Next.js Frontend Docker Image for Cloud Run
#
#  Uses Node 22 — required by Next.js 16 (requires Node >= 20.9.0)
#  Tested & proven on Cloud Run (asia-southeast2)
# =============================================================================

# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-slim AS deps

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
FROM node:22-slim AS builder

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
ARG NEXT_PUBLIC_API_URL="https://eventku-api-lkfw4e5kna-et.a.run.app"
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID="503551786622-k3uajo9c2d6om6qnqofsa3b47fvo5o6g.apps.googleusercontent.com"
ARG NEXT_PUBLIC_DOKU_ENVIRONMENT="production"
ARG NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE="5"

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_DOKU_ENVIRONMENT=$NEXT_PUBLIC_DOKU_ENVIRONMENT
ENV NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE=$NEXT_PUBLIC_PLATFORM_FEE_PERCENTAGE

# Build Next.js application (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Verify standalone output exists
RUN ls -la .next/standalone/ && echo "✅ Standalone output verified"

# ── Stage 3: Production Runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner

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
    CMD curl -f http://localhost:3000/ || exit 1

# Start Next.js server
CMD ["node", "server.js"]
