#!/bin/bash
# ─── SELEEVENT Go Backend Startup Script ──────────────────────────────────
# Checks if Go is installed and starts the Fiber backend.
# If Go is not available, prints a message and exits gracefully.
# The frontend will use mock mode when the backend is not running.
# ──────────────────────────────────────────────────────────────────────────

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "=== SeleEvent Backend Startup ==="
echo ""

# Check if Go is installed
if command -v go &> /dev/null; then
    GO_VERSION=$(go version 2>/dev/null || echo "unknown")
    echo "[OK] Go found: $GO_VERSION"
    echo "[..] Starting Go Fiber backend..."
    echo ""
    
    cd "$BACKEND_DIR"
    go run cmd/server/main.go
else
    echo "[SKIP] Go is not installed."
    echo ""
    echo "Backend will use mock mode."
    echo "The frontend works fully with NEXT_PUBLIC_USE_MOCK=true"
    echo ""
    echo "To install Go, visit: https://go.dev/dl/"
    echo "Or run: go1.25.0 download  (if go1.25.0 is available via golang.org/dl)"
    exit 0
fi
