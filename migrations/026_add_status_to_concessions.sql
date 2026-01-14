-- Migrazione 026: Aggiunge campo status alla tabella concessions
-- Data: 14 Gennaio 2026
-- Progetto: v3.35.0 - Gestione Canone Unico e More

-- Aggiungo il campo status per gestire blocco/sblocco concessioni
ALTER TABLE concessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ATTIVA';

-- Creo un indice per velocizzare le query sullo status
CREATE INDEX IF NOT EXISTS idx_concessions_status ON concessions(status);

-- Commento esplicativo
COMMENT ON COLUMN concessions.status IS 'Stato della concessione: ATTIVA, SOSPESA, REVOCATA';
