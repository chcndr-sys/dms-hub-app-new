#!/bin/bash
# ============================================
# DMS Hub - Health Check Script
# ============================================
# Verifica lo stato di tutti i servizi del sistema.
# Uso: ./scripts/health-check.sh [--verbose]
# ============================================

set -euo pipefail

VERBOSE=${1:-""}
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="${BACKEND_URL:-https://mihub.157-90-29-66.nip.io}"
FRONTEND_URL="${FRONTEND_URL:-https://dms-hub-app-new.vercel.app}"
TIMEOUT=10

passed=0
failed=0
warnings=0

check() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"

    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "0")

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}[OK]${NC} $name (${status_code}, ${response_time}s)"
        passed=$((passed + 1))
    elif [ "$status_code" = "000" ]; then
        echo -e "${RED}[FAIL]${NC} $name (unreachable)"
        failed=$((failed + 1))
    else
        echo -e "${YELLOW}[WARN]${NC} $name (expected ${expected_status}, got ${status_code}, ${response_time}s)"
        warnings=$((warnings + 1))
    fi

    if [ "$VERBOSE" = "--verbose" ] && [ "$status_code" != "000" ]; then
        echo "       URL: $url"
        echo "       Response time: ${response_time}s"
    fi
}

echo "============================================"
echo "DMS Hub - Health Check"
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

echo "--- Frontend (Vercel) ---"
check "Frontend homepage" "$FRONTEND_URL"
echo ""

echo "--- Backend (Hetzner) ---"
check "Backend tRPC" "$BACKEND_URL/api/trpc/auth.me"
check "System health" "$BACKEND_URL/api/trpc/system.health" "200"
echo ""

echo "--- Database ---"
check "DB connectivity" "$BACKEND_URL/api/trpc/mioAgent.testDatabase"
echo ""

echo "--- API Endpoints ---"
check "Analytics overview" "$BACKEND_URL/api/trpc/analytics.overview"
check "Markets list" "$BACKEND_URL/api/trpc/analytics.markets"
check "Guardian integrations" "$BACKEND_URL/api/trpc/guardian.integrations"
echo ""

echo "============================================"
echo -e "Risultati: ${GREEN}${passed} OK${NC}, ${YELLOW}${warnings} WARN${NC}, ${RED}${failed} FAIL${NC}"
echo "============================================"

if [ $failed -gt 0 ]; then
    exit 1
fi
