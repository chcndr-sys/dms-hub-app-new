-- Migrazione 027: Aggiunge campo blocco_automatico_pagamenti alla tabella comuni
-- Data: 14 Gennaio 2026
-- Progetto: v3.35.0 - Gestione Canone Unico e More

-- Aggiungo il campo per la modalità di blocco (automatico/manuale)
ALTER TABLE comuni 
ADD COLUMN IF NOT EXISTS blocco_automatico_pagamenti BOOLEAN DEFAULT true;

-- Aggiungo il campo per i giorni di tolleranza prima del blocco
ALTER TABLE comuni 
ADD COLUMN IF NOT EXISTS giorni_tolleranza_blocco INTEGER DEFAULT 30;

-- Commenti esplicativi
COMMENT ON COLUMN comuni.blocco_automatico_pagamenti IS 'Se true, il sistema blocca automaticamente le concessioni non pagate';
COMMENT ON COLUMN comuni.giorni_tolleranza_blocco IS 'Numero di giorni dopo la scadenza prima del blocco automatico';
