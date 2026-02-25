## PROMPT PER MANUS — Endpoint Backend v9.1 Business Associazioni

**Data:** 25 febbraio 2026
**Contesto:** Il frontend DMS Hub (`dms-hub-app-new`) ha appena implementato 4 nuovi pannelli per il business associazioni + il flusso "Associati e Paga" nell'app impresa. Tutti gli endpoint passano per il proxy Vercel (`vercel.json`) che redirige a `https://api.mio-hub.me`. Servono **14 endpoint REST** sul backend Hetzner.

**IMPORTANTE:** Tutti gli endpoint devono rispondere con il formato standard:
```json
{ "success": true, "data": { ... } }
// oppure
{ "success": false, "error": "messaggio errore" }
```

---

### GRUPPO 1: Scheda Pubblica Associazione

Usato da `SchedaPubblicaPanel.tsx` (dashboard PA impersonata) e da `AnagraficaPage.tsx` (app impresa).

**GET `/api/associazioni/:id/scheda-pubblica`**
```
Response.data: {
  descrizione: string,          // testo libero
  benefici: string[],           // es: ["Assistenza SCIA", "Corsi gratuiti"]
  sedi: [{ nome: string, indirizzo: string, orari: string }],
  contatti: { telefono?: string, email?: string, referente_nome?: string, referente_ruolo?: string },
  logo_url: string,
  servizi_count: number,        // COUNT servizi attivi dell'associazione
  corsi_count: number,          // COUNT corsi attivi dell'associazione
  tesserati_count: number       // COUNT tesseramenti attivi
}
```
Se la scheda non esiste ancora, restituire valori vuoti/zero (NON errore).

**PUT `/api/associazioni/:id/scheda-pubblica`**
```
Body: { descrizione, benefici, sedi, contatti, logo_url }
```
Crea o aggiorna (upsert). I campi `*_count` sono calcolati, non salvati.

---

### GRUPPO 2: Servizi Associazione

Usato da `GestioneServiziAssociazionePanel.tsx` (dashboard) e da `ServiziSection` in `AnagraficaPage.tsx` (app impresa).

**GET `/api/associazioni/:id/servizi`**
```
Response.data: [{
  id: number,
  nome: string,
  descrizione: string,
  categoria: string,           // consulenza|assistenza|formazione|legale|fiscale|tecnica|altro
  prezzo_base: number,         // prezzo per non-tesserati (EUR)
  prezzo_associati: number,    // prezzo scontato per tesserati (EUR)
  tempo_medio_gg: number,      // tempo medio evasione in giorni
  attivo: boolean
}]
```

**POST `/api/associazioni/:id/servizi`**
```
Body: { nome, descrizione, categoria, prezzo_base, prezzo_associati, tempo_medio_gg, attivo }
```

**PUT `/api/associazioni/:id/servizi/:sid`**
```
Body: stessi campi del POST
```

**DELETE `/api/associazioni/:id/servizi/:sid`**

**GET `/api/associazioni/:id/richieste-servizi`**
```
Response.data: [{
  id: number,
  servizio_id: number,
  servizio_nome: string,
  impresa_id: number,
  impresa_nome: string,
  stato: 'in_attesa' | 'in_lavorazione' | 'completata' | 'rifiutata',
  data_richiesta: string (ISO),
  note?: string
}]
```

**PUT `/api/associazioni/:id/richieste-servizi/:rid/stato`**
```
Body: { stato: 'in_lavorazione' | 'completata' | 'rifiutata' }
```
Quando stato = `completata` o `rifiutata`, inviare notifica all'impresa (tabella `notifications`).

---

### GRUPPO 3: Corsi/Formazione

Usato da `GestioneCorsiAssociazionePanel.tsx` (dashboard) e da `FormazioneSection` in `AnagraficaPage.tsx` (app impresa).

**GET `/api/associazioni/:id/corsi`**
```
Response.data: [{
  id: number,
  titolo: string,
  descrizione: string,
  categoria: string,           // sicurezza|haccp|normativa|digitale|marketing|gestione|altro
  durata_ore: number,
  prezzo: number,
  data_inizio: string (ISO),
  data_fine: string (ISO),
  posti_totali: number,
  posti_occupati: number,      // COUNT iscrizioni con stato='iscritta'
  sede: string,
  attivo: boolean
}]
```

**POST `/api/associazioni/:id/corsi`**
```
Body: { titolo, descrizione, categoria, durata_ore, prezzo, data_inizio, data_fine, posti_totali, sede, attivo }
```

**PUT `/api/associazioni/:id/corsi/:cid`** — stessi campi

**DELETE `/api/associazioni/:id/corsi/:cid`**

**GET `/api/associazioni/:id/iscrizioni-corsi`**
```
Response.data: [{
  id: number,
  corso_id: number,
  corso_titolo: string,
  impresa_id: number,
  impresa_nome: string,
  stato: 'iscritta' | 'completata' | 'annullata',
  data_iscrizione: string (ISO),
  attestato_rilasciato: boolean
}]
```

**POST `/api/associazioni/:id/corsi/:cid/rilascia-attestato`**
```
Body: { iscrizione_id: number }
Logica:
  1. Marca iscrizione come attestato_rilasciato = true
  2. Crea qualificazione nell'impresa (tabella impresa qualificazioni se esiste)
  3. Invia notifica all'impresa (tipo: ATTESTATO_RILASCIATO)
```

---

### GRUPPO 4: Wallet Associazione

Usato da `WalletAssociazionePanel.tsx` (dashboard).

**GET `/api/associazioni/:id/wallet`**
```
Response.data: {
  saldo: number,               // saldo corrente (EUR)
  totale_incassato: number,    // totale storico
  incassi_mese: number,        // incassi mese corrente
  incassi_quote: number,       // totale da quote associative
  incassi_servizi: number,     // totale da servizi
  incassi_corsi: number        // totale da corsi
}
```
Se il wallet non esiste, crearlo con saldo 0.

**GET `/api/associazioni/:id/wallet/transazioni`**
```
Response.data: [{
  id: number,
  tipo: 'QUOTA_ASSOCIATIVA' | 'SERVIZIO' | 'CORSO' | 'RIMBORSO' | 'ALTRO',
  importo: number,
  descrizione: string,
  impresa_nome?: string,
  data: string (ISO),
  stato: 'completata' | 'in_attesa' | 'annullata'
}]
```
Ordinato per data DESC.

---

### GRUPPO 5: Tesseramento Diretto con Pagamento

Usato da `AnagraficaPage.tsx` (app impresa), flusso "Associati e Paga".

**POST `/api/tesseramenti/richiedi-e-paga`**
```
Body: {
  impresa_id: number,
  associazione_id: number,
  pagamento_confermato: true
}

Logica:
  1. Verifica che l'associazione esista e sia attiva
  2. Verifica che l'impresa non sia gia' tesserata (stato ATTIVO) per questa associazione
  3. Recupera quota_annuale dall'associazione
  4. Crea tesseramento con stato = 'ATTIVO', data_scadenza = +1 anno
  5. Genera numero_tessera univoco (es: "TESS-{anno}-{id_padded}")
  6. Accredita wallet associazione (importo = quota_annuale, tipo = QUOTA_ASSOCIATIVA)
  7. Invia notifica all'associazione (tipo: NUOVO_TESSERATO)

Response.data: {
  id: number,
  stato: 'ATTIVO',
  associazione_nome: string,
  numero_tessera: string,
  data_scadenza: string,
  quota_annuale: number,
  quota_pagata: true
}
```

---

### NOTA: Endpoint gia' esistenti da arricchire

**GET `/api/associazioni/pubbliche`** — gia' esiste, ma deve includere `quota_annuale` e `servizi_count` nella response per ogni associazione.

**GET `/api/bandi/servizi?impresa_id=X`** — gia' esiste. Filtrare per associazione di appartenenza dell'impresa e mostrare `prezzo_associati` se tesserata.

**POST `/api/bandi/richieste`** — gia' esiste. Dopo creazione, inviare notifica all'associazione.

**GET `/api/formazione/corsi?impresa_id=X`** — gia' esiste. Filtrare per associazione + corsi aperti a tutti.

**POST `/api/formazione/iscrizioni`** — gia' esiste. Dopo creazione, inviare notifica all'associazione.

---

### Tabelle DB suggerite (se non esistono gia')

```sql
-- Scheda pubblica (campi JSON nell'associazione o tabella separata)
ALTER TABLE associazioni ADD COLUMN IF NOT EXISTS scheda_pubblica JSONB DEFAULT '{}';

-- Servizi associazione
CREATE TABLE IF NOT EXISTS servizi_associazione (
  id SERIAL PRIMARY KEY,
  associazione_id INT REFERENCES associazioni(id),
  nome VARCHAR(255) NOT NULL,
  descrizione TEXT,
  categoria VARCHAR(50) DEFAULT 'altro',
  prezzo_base DECIMAL(10,2) DEFAULT 0,
  prezzo_associati DECIMAL(10,2) DEFAULT 0,
  tempo_medio_gg INT DEFAULT 7,
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Richieste servizi
CREATE TABLE IF NOT EXISTS richieste_servizi (
  id SERIAL PRIMARY KEY,
  servizio_id INT REFERENCES servizi_associazione(id),
  impresa_id INT NOT NULL,
  stato VARCHAR(20) DEFAULT 'in_attesa',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Corsi associazione
CREATE TABLE IF NOT EXISTS corsi_associazione (
  id SERIAL PRIMARY KEY,
  associazione_id INT REFERENCES associazioni(id),
  titolo VARCHAR(255) NOT NULL,
  descrizione TEXT,
  categoria VARCHAR(50) DEFAULT 'altro',
  durata_ore INT DEFAULT 8,
  prezzo DECIMAL(10,2) DEFAULT 0,
  data_inizio DATE,
  data_fine DATE,
  posti_totali INT DEFAULT 20,
  sede VARCHAR(255),
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Iscrizioni corsi
CREATE TABLE IF NOT EXISTS iscrizioni_corsi (
  id SERIAL PRIMARY KEY,
  corso_id INT REFERENCES corsi_associazione(id),
  impresa_id INT NOT NULL,
  stato VARCHAR(20) DEFAULT 'iscritta',
  attestato_rilasciato BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wallet associazione
CREATE TABLE IF NOT EXISTS wallet_associazione (
  id SERIAL PRIMARY KEY,
  associazione_id INT UNIQUE REFERENCES associazioni(id),
  saldo DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transazioni wallet associazione
CREATE TABLE IF NOT EXISTS transazioni_wallet_associazione (
  id SERIAL PRIMARY KEY,
  wallet_id INT REFERENCES wallet_associazione(id),
  tipo VARCHAR(30) NOT NULL, -- QUOTA_ASSOCIATIVA, SERVIZIO, CORSO, RIMBORSO, ALTRO
  importo DECIMAL(10,2) NOT NULL,
  descrizione TEXT,
  impresa_id INT,
  stato VARCHAR(20) DEFAULT 'completata',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

**Priorita':** GRUPPO 5 (tesseramento diretto) > GRUPPO 1 (scheda pubblica) > GRUPPO 4 (wallet) > GRUPPO 2 (servizi) > GRUPPO 3 (corsi)

Il frontend e' gia' deployato e pronto a consumare questi endpoint. Ogni pannello gestisce gracefully il caso in cui l'endpoint non risponda ancora (mostra stato vuoto, no errori bloccanti).
