-- Migrazione 025: Tabella wallet_scadenze per gestione scadenze canone e more
-- Data: 14 Gennaio 2026
-- Progetto: Storico Wallet e Gestione Scadenze Canone v3.34.0

CREATE TABLE IF NOT EXISTS wallet_scadenze (
    id SERIAL PRIMARY KEY,
    wallet_id INTEGER NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- CANONE_ANNUO, CANONE_SEMESTRALE, MORA, INTERESSI
    anno_riferimento INTEGER NOT NULL,
    importo_dovuto DECIMAL(10,2) NOT NULL,
    importo_pagato DECIMAL(10,2) DEFAULT 0,
    data_scadenza DATE NOT NULL,
    data_pagamento DATE,
    giorni_ritardo INTEGER DEFAULT 0,
    importo_mora DECIMAL(10,2) DEFAULT 0,
    importo_interessi DECIMAL(10,2) DEFAULT 0,
    tasso_mora DECIMAL(5,4) DEFAULT 0.05, -- 5% default
    tasso_interessi_giornaliero DECIMAL(8,6) DEFAULT 0.000137, -- ~5% annuo (5/365)
    stato VARCHAR(20) NOT NULL DEFAULT 'DA_PAGARE', -- DA_PAGARE, PAGATO, SCADUTO, MORA
    avviso_pagopa_id INTEGER,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_wallet_scadenze_wallet ON wallet_scadenze(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_scadenze_stato ON wallet_scadenze(stato);
CREATE INDEX IF NOT EXISTS idx_wallet_scadenze_scadenza ON wallet_scadenze(data_scadenza);
CREATE INDEX IF NOT EXISTS idx_wallet_scadenze_anno ON wallet_scadenze(anno_riferimento DESC);

-- Commenti
COMMENT ON TABLE wallet_scadenze IS 'Scadenze pagamento canone unico con calcolo mora e interessi';
COMMENT ON COLUMN wallet_scadenze.tipo IS 'Tipo scadenza: CANONE_ANNUO, CANONE_SEMESTRALE, MORA, INTERESSI';
COMMENT ON COLUMN wallet_scadenze.stato IS 'Stato: DA_PAGARE, PAGATO, SCADUTO, MORA';
COMMENT ON COLUMN wallet_scadenze.tasso_mora IS 'Percentuale mora (default 5% = 0.05)';
COMMENT ON COLUMN wallet_scadenze.tasso_interessi_giornaliero IS 'Tasso interessi giornaliero (default ~5% annuo = 0.000137)';
COMMENT ON COLUMN wallet_scadenze.giorni_ritardo IS 'Giorni di ritardo calcolati automaticamente';
