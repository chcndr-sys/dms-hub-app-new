# DMS LEGACY (Heroku) — Documentazione Completa Interoperabilità

**Data creazione**: 16 Febbraio 2026
**Fonte**: Estratto e unificato da MASTER_BLUEPRINT_MIOHUB.md, CONTESTO.md, ARCHITETTURA_ECOSISTEMA_DMS.md
**Scopo**: Documento dedicato per Claude Code — contiene TUTTA la documentazione DMS Legacy in un unico file

---

## 1. Visione Strategica

**MioHub è il CERVELLO** — elabora, decide, autorizza. Si connette a SUAP, PagoPA, PDND, ANPR.
Gestisce login imprese (SPID/CIE), concessioni, canone, more, mappa GIS, wallet TCC, controlli SCIA.

**DMS Legacy è il BRACCIO** — opera sul campo, raccoglie dati grezzi.
L'app tablet registra presenze fisiche, uscite, deposito spazzatura, scelte alla spunta.

| Ruolo | Sistema | Cosa fa |
|-------|---------|---------|
| **CERVELLO** | MioHub | Login SPID/CIE, SUAP, PagoPA, PDND, concessioni, canone, mappa GIS, wallet, controlli, verbali |
| **BRACCIO** | DMS Legacy | App tablet spunta, presenze fisiche, uscite, spazzatura, scelte spunta |

---

## 2. Architettura DMS Legacy

| Componente | Dettagli |
|------------|---------|
| **Piattaforma** | Heroku (app `lapsy-dms`) |
| **URL Gestionale** | `https://lapsy-dms.herokuapp.com/index.html` |
| **Credenziali Gestionale** | `checchi@me.com` / `Dms2022!` (accesso frontend) |
| **Backend** | Node.js + Express — thin layer sopra stored functions |
| **Database** | PostgreSQL su AWS RDS (eu-west-1) — 25 tabelle, 117 stored functions |
| **Real-time** | Socket.IO namespace `/ac.mappe` per aggiornamento mappe tablet |
| **Pattern** | Ogni API chiama una stored function: `Express → SELECT funzione(json) → PostgreSQL` |
| **CRUD** | Funzioni `_crup`: se ID è NULL → INSERT, se valorizzato → UPDATE |

---

## 3. Ecosistema Completo DMS

### 3.1 Piattaforma DMS (Heroku)
**Ruolo**: Orchestratore centrale del sistema legacy.
Gestisce anagrafica imprese (CRUD completo), concessioni posteggi, integrazione PDND e PagoPA, registrazione pagamenti, presenze ambulanti, verifica regolarità imprese, calcolo graduatorie, sistema notifiche.

**Database**: PostgreSQL (Heroku/AWS RDS)
**API**: REST API
**Autenticazione**: JWT + OAuth2

### 3.2 App DMS Operatori (Tablet)
**Ruolo**: App mobile per ambulanti/negozianti.
Registrazione presenza digitale (check-in/out), pagamenti in-app (PagoPA), spunta automatizzata posteggi, notifiche push, gestione profilo impresa, storico presenze e pagamenti.

**Integrazione**: API Piattaforma DMS Heroku, WebSocket real-time

### 3.3 WebApp PM (Polizia Municipale)
**Ruolo**: Gestione real-time operazioni mercato su tablet/PC.
Dashboard real-time stato mercato, sistema spunta posteggi con validazione, lettura CIE per ambulanti senza smartphone, centro notifiche anomalie, gestione sanzioni, report giornalieri.

**Integrazione**: WebSocket real-time con Piattaforma DMS

---

## 4. Flusso Dati Bidirezionale

### 4.1 MioHub → Legacy (76% dei dati — NOI DIAMO A LORO)

Noi mandiamo al Legacy tutti i dati elaborati nel **formato esatto delle sue colonne**:

| Dato che mandiamo | Tabella Legacy | Colonne Legacy (formato esatto) | Nostra sorgente |
|---|---|---|---|
| Anagrafica impresa | `amb` | `amb_ragsoc`, `amb_piva`, `amb_cfisc`, `amb_indirizzo`, `amb_cap`, `amb_citta`, `amb_prov`, `amb_email`, `amb_tel`, `amb_pec`, `amb_rea`, `amb_sett_merc` | `imprese` |
| Saldo wallet | `amb` | `amb_saldo_bors` (numeric) | `imprese.saldo_tcc` |
| Punteggio graduatoria | `amb` | `amb_punti_grad_dfl` (integer) | Calcolato da presenze |
| Mercato | `mercati` | `mkt_nome`, `mkt_indirizzo`, `mkt_giorno`, `mkt_al` (alias) | `markets` |
| Posteggio | `piazzole` | `pz_numero`, `pz_mq`, `pz_tipo`, `pz_stato`, `pz_lat`, `pz_lng` | `stalls` |
| Concessione | `conc_std` | `conc_amb_id`, `conc_mkt_id`, `conc_pz_id`, `conc_dal`, `conc_al`, `conc_importo` | `concessions` |
| Autorizzazione spunta | `spuntisti` | `sp_amb_id`, `sp_mkt_id`, `sp_autorizzato` | Calcolata |
| Utente operatore | `suser` | `suser_email`, `suser_nome`, `suser_cognome`, `suser_ruolo` | `users` |
| Regolarità impresa | `amb` | `amb_regolare` (boolean) | Calcolata da 23 controlli SCIA |

### 4.2 Legacy → MioHub (11% dei dati — RICEVIAMO DA LORO)

Il Legacy ci manda i dati grezzi raccolti dall'app tablet sul campo:

| Dato che riceviamo | Tabella Legacy | Colonne Legacy | Nostra destinazione |
|---|---|---|---|
| Presenza ingresso | `presenze` | `pre_ingresso` (timestamp) | `vendor_presences.check_in` |
| Presenza uscita | `presenze` | `pre_uscita` (timestamp) | `vendor_presences.check_out` |
| Deposito spazzatura | `presenze` | `pre_spazzatura` (boolean) | `vendor_presences.garbage_deposited` |
| Presenza rifiutata | `presenze` | `pre_rifiutata` (boolean) | `vendor_presences.rifiutata` |
| Note operatore | `presenze` | `pre_note` (text) | `vendor_presences.notes` |
| Prezzo calcolato | `presenze` | `pre_prezzo` (numeric) | `vendor_presences.fee_amount` |
| Giornata mercato | `istanze` | `ist_id`, `ist_data`, `ist_stato` | `market_sessions` |
| Posto scelto spunta | `presenze` | `pre_pz_id` (integer) | `vendor_presences.stall_id` |

### 4.3 Dati Condivisi Bidirezionali (13%)

| Campo | Direzione | Descrizione |
|---|---|---|
| `pre_prezzo` | ↔ | Noi calcoliamo (mq × costo_mq) e lo diamo, il Legacy lo conferma nella presenza |
| `pre_tipo` | ↔ | Noi definiamo CONCESSIONARIO/SPUNTISTA, il Legacy lo registra |
| `ist_id` | ↔ | Noi creiamo la sessione, il Legacy la usa per le presenze |
| `ist_stato` | ↔ | Noi apriamo/chiudiamo, il Legacy aggiorna durante la giornata |

---

## 5. Flusso Giornata Mercato con Interoperabilità

| Fase | Cosa succede | Direzione | Dati coinvolti |
|------|-------------|-----------|----------------|
| **0. Sync preventivo** | Prima della giornata, MioHub manda al Legacy tutti i dati aggiornati | MioHub → Legacy | Imprese, concessioni, piazzole, wallet, regolarità |
| **1. Apertura mercato** | Dashboard PA avvia la giornata, Legacy riceve la sessione | MioHub → Legacy | `istanza_start(mercato_id)` |
| **2. Arrivo concessionari** | Operatore tablet registra ingresso | Legacy → MioHub | `pre_ingresso`, `amb_id`, `pz_id` |
| **3. Preparazione spunta** | Dashboard PA conta assenze, prepara posti arancioni | MioHub → Legacy | Posti liberi per spunta |
| **4. Spunta** | Spuntisti scelgono posti dall'app tablet | Legacy → MioHub | `pz_id` scelto, `pre_ingresso` |
| **5. Durante mercato** | Operatore registra spazzatura | Legacy → MioHub | `pre_spazzatura` |
| **6. Chiusura** | Operatore registra uscite, Dashboard chiude giornata | Legacy → MioHub | `pre_uscita` per tutti |
| **7. Post-mercato** | CRON controlla orari, genera verbali | Solo MioHub | Automatico |

---

## 6. Campi di Interoperabilità nel DB Neon

| Tabella | Colonna | Tipo | Scopo |
|---------|---------|------|-------|
| `imprese` | `legacy_amb_id` | `integer` | Map a ambulante Legacy |
| `imprese` | `fido` | `numeric` | Fido impresa (credito) |
| `markets` | `legacy_mkt_id` | `integer` | Map a mercato Legacy, join con `mkt_al` |
| `stalls` | `legacy_pz_id` | `integer` | Map a piazzola Legacy |
| `concessions` | `legacy_conc_id` | `integer` | Map a concessione Legacy |
| `users` | `cie_id` | `varchar(32)` | ID Carta d'Identità Elettronica (sostituisce badge NFC) |
| `vendor_presences` | `legacy_pre_id` | `integer` | Map a presenza Legacy |
| `vendor_presences` | `rifiutata` | `boolean DEFAULT false` | Se la presenza è stata rifiutata dal Legacy |

---

## 7. Transformer Bidirezionale — Adattamento al Formato Legacy

**Regola fondamentale:** Noi ci adattiamo al formato del Legacy. I dati escono dal nostro sistema già pronti per essere inseriti nelle sue tabelle.

### 7.1 Funzioni SYNC OUT (MioHub → Legacy)

| Funzione | Input (MioHub) | Output (Legacy) | Tabella Legacy |
|---|---|---|---|
| `transformVendorToAmb()` | `imprese` record | `amb` record con tutti i campi `amb_*` | `amb` |
| `transformMarketToMkt()` | `markets` record | `mercati` record con `mkt_nome`, `mkt_al` | `mercati` |
| `transformStallToPz()` | `stalls` record | `piazzole` record con `pz_numero`, `pz_mq` | `piazzole` |
| `transformConcessionToConc()` | `concessions` record | `conc_std` record con `conc_dal`, `conc_al` | `conc_std` |
| `transformUserToSuser()` | `users` record | `suser` record con `suser_email`, `suser_ruolo` | `suser` |
| `transformSpuntistaToSp()` | autorizzazione calcolata | `spuntisti` record con `sp_autorizzato` | `spuntisti` |

### 7.2 Funzioni SYNC IN (Legacy → MioHub)

| Funzione | Input (Legacy) | Output (MioHub) | Tabella MioHub |
|---|---|---|---|
| `transformPreToPresence()` | `presenze` record | `vendor_presences` record | `vendor_presences` |
| `transformIstToSession()` | `istanze` record | `market_sessions` record | `market_sessions` |
| `resolveVendorId()` | `pre_amb_id` (Legacy) | `vendor_id` (MioHub) tramite `legacy_amb_id` | lookup `imprese` |
| `resolveStallId()` | `pre_pz_id` (Legacy) | `stall_id` (MioHub) tramite `legacy_pz_id` | lookup `stalls` |

---

## 8. API Legacy — Inventario Completo Stored Functions

### 8.1 Funzioni di Scrittura (MioHub → Legacy)

| Stored Function | Descrizione | Parametri principali |
|---|---|---|
| `amb_crup(json)` | Create/Update ambulante | `amb_id` (NULL=insert), `amb_ragsoc`, `amb_piva`... |
| `mercati_crup(json)` | Create/Update mercato | `mkt_id`, `mkt_nome`, `mkt_indirizzo`... |
| `piazzole_crup(json)` | Create/Update piazzola | `pz_id`, `pz_numero`, `pz_mq`... |
| `conc_std_crup(json)` | Create/Update concessione | `conc_id`, `conc_amb_id`, `conc_mkt_id`... |
| `suser_crup(json)` | Create/Update utente | `suser_id`, `suser_email`... |
| `spuntisti_crup(json)` | Create/Update spuntista | `sp_id`, `sp_amb_id`, `sp_mkt_id`... |
| `istanza_start(json)` | Apri giornata mercato | `mkt_id`, `data` |
| `istanza_close(json)` | Chiudi giornata mercato | `ist_id` |

### 8.2 Funzioni di Lettura (Legacy → MioHub)

| Stored Function | Descrizione | Output |
|---|---|---|
| `amb_list(json)` | Lista ambulanti | Array di `amb` records |
| `amb_get(json)` | Dettaglio ambulante | Singolo `amb` record |
| `mercati_list(json)` | Lista mercati | Array di `mercati` records |
| `piazzole_list(json)` | Lista piazzole per mercato | Array di `piazzole` records |
| `conc_std_list(json)` | Lista concessioni | Array di `conc_std` records |
| `presenze_list(json)` | Lista presenze per giornata | Array di `presenze` records |
| `istanze_list(json)` | Lista giornate mercato | Array di `istanze` records |
| `spuntisti_list(json)` | Lista spuntisti autorizzati | Array di `spuntisti` records |
| `suser_list(json)` | Lista utenti | Array di `suser` records |
| `documenti_list(json)` | Lista documenti | Array di `documenti` records |
| `stats_dashboard(json)` | Statistiche dashboard | Contatori aggregati |

---

## 9. Endpoint REST — Inventario Completo

### 9.1 EXPORT (Legacy → MioHub) — ATTIVI

Prefisso: `/api/integrations/dms-legacy/`

| # | Metodo | Endpoint | Stored Function | Stato |
|---|---|---|---|---|
| 1 | GET | `/markets` | `mercati_list` | ✅ Attivo |
| 2 | GET | `/vendors` | `amb_list` | ✅ Attivo |
| 3 | GET | `/concessions` | `conc_std_list` | ✅ Attivo |
| 4 | GET | `/presences/:marketId` | `presenze_list` | ✅ Attivo |
| 5 | GET | `/market-sessions/:marketId` | `istanze_list` | ✅ Attivo |
| 6 | GET | `/stalls/:marketId` | `piazzole_list` | ✅ Attivo |
| 7 | GET | `/spuntisti` | `spuntisti_list` | ✅ Attivo |
| 8 | GET | `/documents` | `documenti_list` | ✅ Attivo |
| 9 | GET | `/stats` | `stats_dashboard` | ✅ Attivo |

### 9.2 SYNC OUT (MioHub → Legacy) — COMPLETATI

| # | Metodo | Endpoint | Stored Function | Stato |
|---|---|---|---|---|
| 10 | POST | `/sync-out/vendors` | `amb_crup` | ✅ Completato |
| 11 | POST | `/sync-out/markets` | `mercati_crup` | ✅ Completato |
| 12 | POST | `/sync-out/stalls` | `piazzole_crup` | ✅ Completato |
| 13 | POST | `/sync-out/concessions` | `conc_std_crup` | ✅ Completato |
| 14 | POST | `/sync-out/users` | `suser_crup` | ✅ Completato |
| 15 | POST | `/sync-out/spuntisti` | `spuntisti_crup` | ✅ Completato |
| 16 | POST | `/sync-out/sessions` | `istanza_start/close` | ✅ Completato |

### 9.3 SYNC IN (Legacy → MioHub) — COMPLETATI

| # | Metodo | Endpoint | Azione | Stato |
|---|---|---|---|---|
| 17 | POST | `/sync-in/presences` | Importa presenze dal Legacy | ✅ Completato |
| 18 | POST | `/sync-in/sessions` | Importa sessioni dal Legacy | ✅ Completato |
| 19 | POST | `/sync-in/spunta-choices` | Importa scelte spunta | ✅ Completato |

### 9.4 Utility

| # | Metodo | Endpoint | Descrizione | Stato |
|---|---|---|---|---|
| 20 | GET | `/health` | Verifica connessione DB Legacy | ✅ Attivo |
| 21 | GET | `/status` | Stato dettagliato con contatori | ✅ Attivo |
| 22 | POST | `/sync` | Sync manuale on-demand | ✅ Attivo |
| 23 | POST | `/cron-sync` | CRON automatico ogni 60 min | ✅ Attivo |

**Totale endpoint DMS Legacy:** 23 (tutti attivi e testati)

---

## 10. Sicurezza

| Aspetto | Implementazione |
|---|---|
| **Connessione DB Legacy** | URL in variabile d'ambiente `DMS_LEGACY_DB_URL` su Hetzner |
| **Pool Limitato** | Max 3 connessioni simultanee per non sovraccaricare il DB Legacy |
| **Dati MAI trasferiti** | Password (`suser_password`), OTP (`suser_otp`, `suser_otp_creation`) |
| **Scrittura controllata** | Solo tramite stored functions `_crup` (mai INSERT/UPDATE diretti) |
| **Guard SYNC OUT** | Flag `SYNC_CONFIG.syncOut.enabled` per abilitare/disabilitare |
| **Guard SYNC IN** | Flag `SYNC_CONFIG.syncIn.enabled` per abilitare/disabilitare |
| **Logging** | Ogni operazione di sync viene loggata con timestamp e risultato |

---

## 11. Monitoraggio Guardian

| # | Endpoint | Metodo | Categoria | Stato |
|---|---|---|---|---|
| 1-9 | `/api/integrations/dms-legacy/*` (export) | GET | DMS Legacy Integration | ✅ Attivo |
| 10-16 | `/api/integrations/dms-legacy/sync-out/*` | POST | DMS Legacy Sync Out | ✅ Attivo |
| 17-19 | `/api/integrations/dms-legacy/sync-in/*` | POST | DMS Legacy Sync In | ✅ Attivo |
| 20-23 | `/api/integrations/dms-legacy/health,status,sync,cron` | GET/POST | DMS Legacy Utility | ✅ Attivo |

---

## 12. Frontend — Tab Connessioni (Dashboard PA → Integrazioni)

| Elemento | Stato | Descrizione |
|---|---|---|
| Card "DMS Legacy (Heroku)" | ✅ Attiva | Mostra stato connessione, ultimo sync, contatori |
| Health Check | ✅ Attivo | Verifica connessione DB Legacy in tempo reale |
| Pulsante "Sincronizza Ora" | ✅ Attivo | Lancia sync manuale on-demand |
| CRON automatico | ✅ Attivo | Ogni 60 minuti |
| Contatori dati | ✅ Attivo | Mercati, ambulanti, concessioni, piazzole sincronizzati |

---

## 13. Tabelle Legacy nel DB Neon (NON eliminare)

| Tabella | Usata da | Note |
|---------|----------|------|
| `transactions` | `tcc.js`, `tcc-v2.js` | API TCC v1/v2 per INSERT transazioni |
| `shops` | `tcc.js` | API TCC v1 per negozi |

> **NON ELIMINARE** queste tabelle finché le API v1/v2 sono in uso.

---

## 14. Piano di Implementazione — Stato

| Fase | Descrizione | Stato | Completata |
|---|---|---|---|
| **Fase 1** | Endpoint EXPORT (lettura Legacy) | ✅ **COMPLETATA** | Pre-esistente |
| **Fase 2** | Transformer bidirezionale + endpoint SYNC OUT | ✅ **COMPLETATA** | 12 Feb 2026 |
| **Fase 3** | Endpoint SYNC IN (ricezione presenze) | ✅ **COMPLETATA** | 12 Feb 2026 |
| **Fase 4** | Campi nuovi nel DB Neon + migrazione dati | ✅ **COMPLETATA** | 12 Feb 2026 |
| **Fase 5** | Registrazione Guardian + aggiornamento frontend | ✅ **COMPLETATA** | Pre-esistente |
| **Fase 6** | Test integrato con dati reali + connessione Heroku | ✅ **COMPLETATA** | 12 Feb 2026 |

> **Tutte le 6 fasi completate.** Tag stabile: `v5.5.0-full-sync-tested`.

---

## 15. Verifica Allineamento Sistemi (12 Feb 2026)

| Sistema | Stato | Dettaglio |
|---|---|---|
| **GitHub ↔ Hetzner** (Backend) | ✅ ALLINEATI | Stesso commit, tag `v5.5.0-full-sync-tested` |
| **GitHub ↔ Vercel** (Frontend) | ✅ ALLINEATI | Auto-deploy da master |
| **Neon DB** | ✅ OPERATIVO | 8 colonne `legacy_*_id` funzionanti |
| **Heroku Legacy DB** | ✅ OPERATIVO | 32 ambulanti, 3 mercati, 38 utenti, 452 piazzole |
| **DMS Legacy Integration** | ✅ 3/3 CANALI ATTIVI | EXPORT + SYNC OUT + SYNC IN |
| **Gestionale Lapsy** | ✅ ACCESSIBILE | Login OK, tutti i dati SYNC OUT visibili |

### Stato DB Neon post-test

| Tabella | Record | Con legacy_id |
|---|---|---|
| markets | 3 | 2 |
| imprese | 34 | 4 |
| users | 8 | 4 |
| stalls | 544 | 3 |
| concessions | 25 | 1 |
| vendor_presences | 37 | 1 |
| market_sessions | 126 | 106 |

### Stato DB Heroku Legacy post-test

| Tabella | Record |
|---|---|
| amb | 32 |
| mercati | 3 |
| suser | 38 |
| piazzole | 452 |
| conc_std | 26 |
| spuntisti | 9 |

---

## 16. Problemi Noti e Azioni

### Priorità ALTA

| # | Problema | Azione |
|---|---|---|
| 1 | DNS `www.miohub.it` non risolve | Verificare configurazione DNS e collegare a Vercel |
| 2 | Testo "(BLOCCATO)" nel health endpoint | Aggiornare stringhe di descrizione nel codice |

### Priorità MEDIA

| # | Problema | Azione |
|---|---|---|
| 3 | Warning SSL Neon nei log | Aggiungere `uselibpqcompat=true` alla stringa di connessione |
| 4 | 11 file non tracciati su Hetzner | Eliminare o aggiungere a `.gitignore` |

### Priorità BASSA

| # | Problema | Azione |
|---|---|---|
| 5 | Dati di test nei DB | Decidere se pulirli o tenerli come riferimento |
| 6 | CRON automatico SYNC in dry-run | Attivare `save: true` quando si vuole sync automatica |
| 7 | Presenze SYNC IN: 1/5 salvate | Normale: vendor di test Legacy senza corrispettivi su Neon |
| 8 | Spuntista SYNC IN senza tabella | Valutare tabella `spuntisti` su Neon |
| 9 | lastSync nel health sempre "never" | Implementare tracking ultimo sync |

---

## 17. Presenze (delegata al Legacy)

La pagina `/app/impresa/presenze` carica il DMS Legacy in un iframe:
- URL primario: `https://dms.associates/wp-admin/images/DMSAPP/#/login`
- Fallback: `https://lapsy-dms.herokuapp.com/index.html`

---

## 18. Interoperabilità con MercaWeb (Abaco S.p.A.)

L'integrazione con MercaWeb è **completamente implementata**. Il modulo dedicato (`mercaweb.js`) espone 9 endpoint per l'import/export bidirezionale delle anagrafiche e delle presenze. L'autenticazione avviene tramite API Key (`X-MercaWeb-API-Key`). La card dedicata nella tab Connessioni della dashboard consente di monitorare lo stato della connessione e testare gli endpoint direttamente dal Playground.

Per le specifiche tecniche complete: `SPECIFICHE_API_MERCAWEB_v1.0.md`.

---

## 19. File Sorgente Rilevanti

| File | Descrizione |
|------|-------------|
| `server/dmsHubRouter.ts` | Router principale con endpoint Legacy |
| `client/src/components/ConnessioniV2.tsx` | Tab Connessioni nella Dashboard PA |
| `client/src/components/Integrazioni.tsx` | Pagina Integrazioni |
| `client/src/components/LegacyReportCards.tsx` | Card report Legacy |
| `client/src/config/realEndpoints.ts` | Configurazione endpoint reali |
| `client/src/pages/PresenzePage.tsx` | Pagina presenze (iframe Legacy) |
| `drizzle/schema.ts` | Schema DB con colonne legacy_*_id |

---

*Documento generato il 16 Febbraio 2026 — Manus AI*
*Fonte: MASTER_BLUEPRINT_MIOHUB.md (righe 517-850, 6375-6420, 9262-9410), CONTESTO.md (righe 387-500), ARCHITETTURA_ECOSISTEMA_DMS.md*
