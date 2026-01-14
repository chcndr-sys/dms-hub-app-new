-- Migrazione 023: Tabella wallet_history per storico eventi wallet
-- Data: 14 Gennaio 2026
-- Progetto: Storico Wallet e Gestione Scadenze Canone v3.34.0

CREATE TABLE IF NOT EXISTS wallet_history (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    impresa_id INTEGER REFERENCES imprese(id),
    evento VARCHAR(50) NOT NULL, -- CREATO, ELIMINATO, TRASFERITO, SOSPESO, RIATTIVATO
    motivo VARCHAR(100), -- SUBINGRESSO, CESSAZIONE, ERRORE, SCADENZA_CONCESSIONE, RINNOVO, MANUALE
    saldo_al_momento DECIMAL(10,2) DEFAULT 0,
    saldo_trasferito_a INTEGER, -- wallet_id destinatario (per subingresso)
    concessione_id INTEGER,
    mercato_id INTEGER REFERENCES markets(id),
    posteggio_id INTEGER REFERENCES stalls(id),
    note TEXT,
    operatore_id VARCHAR(100), -- Chi ha eseguito l'operazione
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_wallet_history_wallet_id ON wallet_history(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_history_impresa_id ON wallet_history(impresa_id);
CREATE INDEX IF NOT EXISTS idx_wallet_history_evento ON wallet_history(evento);
CREATE INDEX IF NOT EXISTS idx_wallet_history_created_at ON wallet_history(created_at DESC);

-- Commenti
COMMENT ON TABLE wallet_history IS 'Storico eventi wallet: creazione, eliminazione, trasferimenti';
COMMENT ON COLUMN wallet_history.evento IS 'Tipo evento: CREATO, ELIMINATO, TRASFERITO, SOSPESO, RIATTIVATO';
COMMENT ON COLUMN wallet_history.motivo IS 'Motivo evento: SUBINGRESSO, CESSAZIONE, ERRORE, SCADENZA_CONCESSIONE, RINNOVO, MANUALE';
COMMENT ON COLUMN wallet_history.saldo_al_momento IS 'Saldo del wallet al momento dell evento - importante per rimborsi';
COMMENT ON COLUMN wallet_history.saldo_trasferito_a IS 'ID wallet destinatario in caso di trasferimento per subingresso';
