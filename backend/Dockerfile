# =============================================================================
#  EVENTKU — Golang Backend Docker Image for Cloud Run
#
#  Build:  docker build -f backend/Dockerfile -t eventku-api .
#  Run:    docker run -p 8080:8080 eventku-api
#
#  IMPORTANT: Docker build context is project root (.), so all COPY paths
#  must be relative to project root, e.g. backend/go.mod not go.mod
# =============================================================================

# ── Build stage ─────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Cache Go modules - copy go.mod and go.sum first
# Paths relative to project root (Docker context = ".")
COPY backend/go.mod backend/go.sum ./
ENV GOPROXY=https://proxy.golang.org,direct
RUN go mod download

# Copy backend source code (relative to project root)
COPY backend/ .

# Build binary with CGO_ENABLED=0 for static binary (PostgreSQL only)
ARG CGO_ENABLED=0
ARG VERSION=dev
RUN CGO_ENABLED=${CGO_ENABLED} go build \
  -ldflags="-s -w -X main.version=${VERSION}" \
  -o /eventku-api \
  ./cmd/server

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM alpine:3.19

# Install runtime dependencies
RUN apk --no-cache add \
  ca-certificates \
  tzdata \
  libc6-compat

# Set timezone
ENV TZ=Asia/Jakarta

# Create non-root user for security (Cloud Run best practice)
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 -G appuser appuser

WORKDIR /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /eventku-api /app/eventku-api

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the API server
ENTRYPOINT ["/app/eventku-api"]
