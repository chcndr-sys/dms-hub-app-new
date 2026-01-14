-- Migrazione 024: Tabella wallet_balance_snapshots per cronologia saldi
-- Data: 14 Gennaio 2026
-- Progetto: Storico Wallet e Gestione Scadenze Canone v3.34.0

CREATE TABLE IF NOT EXISTS wallet_balance_snapshots (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    anno INTEGER NOT NULL,
    mese INTEGER, -- NULL = snapshot annuale, 1-12 = mensile
    saldo_iniziale DECIMAL(10,2) DEFAULT 0,
    saldo_finale DECIMAL(10,2) DEFAULT 0,
    totale_entrate DECIMAL(10,2) DEFAULT 0,
    totale_uscite DECIMAL(10,2) DEFAULT 0,
    numero_transazioni INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(wallet_id, anno, mese)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_wallet_balance_snapshots_wallet ON wallet_balance_snapshots(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_snapshots_anno ON wallet_balance_snapshots(anno DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_snapshots_wallet_anno ON wallet_balance_snapshots(wallet_id, anno DESC);

-- Commenti
COMMENT ON TABLE wallet_balance_snapshots IS 'Snapshot periodici dei saldi wallet per cronologia annuale/mensile';
COMMENT ON COLUMN wallet_balance_snapshots.mese IS 'NULL per snapshot annuale, 1-12 per snapshot mensile';
COMMENT ON COLUMN wallet_balance_snapshots.saldo_iniziale IS 'Saldo all inizio del periodo';
COMMENT ON COLUMN wallet_balance_snapshots.saldo_finale IS 'Saldo alla fine del periodo';
