#!/bin/bash
# ============================================
# DMS Hub - Database Maintenance Script
# ============================================
# Manutenzione periodica del database.
# Uso: ./scripts/db-maintenance.sh [--dry-run]
# ============================================
# ATTENZIONE: Questo script modifica il database.
# Usa --dry-run per vedere cosa farebbe senza eseguire.
# ============================================

set -euo pipefail

DRY_RUN=${1:-""}
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}[ERRORE]${NC} DATABASE_URL non configurata."
    echo "Esporta la variabile: export DATABASE_URL='postgres://...'"
    exit 1
fi

run_sql() {
    local description="$1"
    local query="$2"

    echo -e "${CYAN}[TASK]${NC} $description"

    if [ "$DRY_RUN" = "--dry-run" ]; then
        echo -e "  ${YELLOW}[DRY-RUN]${NC} $query"
        echo ""
        return
    fi

    result=$(psql "$DATABASE_URL" -t -c "$query" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "  ${GREEN}[OK]${NC} $result"
    else
        echo -e "  ${RED}[ERRORE]${NC} $result"
    fi
    echo ""
}

echo "============================================"
echo "DMS Hub - Database Maintenance"
echo "$(date '+%Y-%m-%d %H:%M:%S')"
if [ "$DRY_RUN" = "--dry-run" ]; then
    echo -e "${YELLOW}MODALITA' DRY-RUN: nessuna modifica sara' eseguita${NC}"
fi
echo "============================================"
echo ""

# --- Diagnostica ---
echo "=== DIAGNOSTICA ==="

run_sql "Conteggio righe per tabella (top 10)" \
    "SELECT relname AS tabella, reltuples::bigint AS righe_stimate
     FROM pg_class
     WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
     ORDER BY reltuples DESC
     LIMIT 10;"

run_sql "Dimensione database" \
    "SELECT pg_size_pretty(pg_database_size(current_database())) AS dimensione;"

run_sql "Tabelle vuote" \
    "SELECT relname AS tabella_vuota
     FROM pg_class
     WHERE relkind = 'r'
       AND reltuples = 0
       AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
     ORDER BY relname;"

# --- Pulizia Log ---
echo "=== PULIZIA LOG ==="

run_sql "Log agenti AI > 30 giorni (conteggio)" \
    "SELECT COUNT(*) AS log_da_eliminare
     FROM mio_agent_logs
     WHERE timestamp < NOW() - INTERVAL '30 days';"

if [ "$DRY_RUN" != "--dry-run" ]; then
    run_sql "Elimina log agenti AI > 30 giorni" \
        "DELETE FROM mio_agent_logs
         WHERE timestamp < NOW() - INTERVAL '30 days';"
fi

run_sql "Metriche API > 90 giorni (conteggio)" \
    "SELECT COUNT(*) AS metriche_da_eliminare
     FROM api_metrics
     WHERE created_at < NOW() - INTERVAL '90 days';"

if [ "$DRY_RUN" != "--dry-run" ]; then
    run_sql "Elimina metriche API > 90 giorni" \
        "DELETE FROM api_metrics
         WHERE created_at < NOW() - INTERVAL '90 days';"
fi

run_sql "System logs > 60 giorni (conteggio)" \
    "SELECT COUNT(*) AS log_da_eliminare
     FROM system_logs
     WHERE created_at < NOW() - INTERVAL '60 days';"

if [ "$DRY_RUN" != "--dry-run" ]; then
    run_sql "Elimina system logs > 60 giorni" \
        "DELETE FROM system_logs
         WHERE created_at < NOW() - INTERVAL '60 days';"
fi

# --- Ottimizzazione ---
echo "=== OTTIMIZZAZIONE ==="

if [ "$DRY_RUN" != "--dry-run" ]; then
    run_sql "VACUUM ANALYZE (aggiorna statistiche)" \
        "VACUUM ANALYZE;"
fi

# --- Riepilogo ---
echo "============================================"
echo "Manutenzione completata."
if [ "$DRY_RUN" = "--dry-run" ]; then
    echo -e "${YELLOW}Esegui senza --dry-run per applicare le modifiche.${NC}"
fi
echo "============================================"
