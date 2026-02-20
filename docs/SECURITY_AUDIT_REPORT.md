# SECURITY AUDIT & ARCHITECTURE REPORT — DMS Hub

Data: 20 Febbraio 2026 (aggiornato)
Autore: Claude (Security Review)
Branch: claude/review-production-fixes-3sUvQ


========================================================================
SEZIONE 0 — BUG FUNZIONALI FIXATI (20 Feb 2026)
========================================================================

FIX APPLICATI (FRONTEND)
-------------------------

FIX 1 — Dashboard PA si ricarica/flickera per i permessi
  File: client/src/contexts/PermissionsContext.tsx
  Problema: L'evento "storage" di FirebaseAuthContext scatenava un secondo
  ciclo di caricamento permessi, causando flicker loading->content->loading->content.
  Fix: Storage event listener ora ricarica SOLO se il ruolo utente cambia
  effettivamente (debounce 300ms + confronto chiave ruolo in sessionStorage).
  Stato: FIXATO

FIX 2 — Notifiche non partono da NuovoVerbalePage
  File: client/src/pages/NuovoVerbalePage.tsx
  Problema: Dopo la creazione del verbale, il codice mostrava "Notifica inviata
  all'impresa" ma NON eseguiva nessuna chiamata fetch all'endpoint notifiche.
  Fix: Aggiunta chiamata POST /api/notifiche/send con i dati del verbale
  (mittente, titolo, messaggio, target). Copiato pattern da ControlliSanzioniPanel.
  Stato: FIXATO

FIX 3 — Errore generazione concessione SUAP (form SUAP)
  File: client/src/components/suap/ConcessioneForm.tsx
  Problema: Se il backend rispondeva con 404 (pagina HTML) o errore non-JSON,
  il response.json() crashava silenziosamente e il form restava bloccato.
  Fix: Aggiunto check response.ok + verifica content-type prima di JSON.parse
  + try/catch robusto + messaggi di errore specifici (404, 500, parse error).
  Stato: FIXATO

FIX 4 — Errore concessione markets
  File: client/src/components/markets/ConcessionForm.tsx
  Problema: Stesso bug del fix 3 — JSON.parse su risposta non-JSON.
  Fix: Stesso pattern — check content-type prima di JSON.parse su errore.
  Stato: FIXATO


BUG BACKEND (NON FIXABILI DAL FRONTEND — PER MANUS)
-----------------------------------------------------

BUG 5 — Report storico Grosseto a zero dopo Simula Mercato

  Descrizione: Dopo aver cliccato "Simula mercato" in GestioneMercati,
  il report storico (PresenzeGraduatoriaPanel) mostra tutto a zero.

  Causa root: La simulazione e il report usano endpoint DIVERSI che
  scrivono/leggono da tabelle DIVERSE sul backend Hetzner.

  La simulazione chiama:
    POST /api/test-mercato/avvia-spunta
    POST /api/test-mercato/registra-presenza-concessionario
    POST /api/test-mercato/inizia-mercato
    POST /api/test-mercato/chiudi-mercato

  Il report legge da:
    GET /api/graduatoria/mercato/{id}?tipo=CONCESSION
    GET /api/presenze/mercato/{id}?tipo=CONCESSION

  Il problema: /api/test-mercato/* scrive in tabelle temporanee/di test,
  mentre /api/graduatoria/* e /api/presenze/* leggono da tabelle di produzione.
  I dati simulati NON finiscono nelle tabelle che il report interroga.

  Azione richiesta sul backend Hetzner:
    Opzione A: /api/test-mercato/* deve scrivere nelle stesse tabelle
    di graduatoria e presenze (tabelle di produzione).
    Opzione B: Creare un flag "is_simulation=true" nelle tabelle presenze
    e graduatoria, e far filtrare il report di conseguenza.

  File frontend coinvolti:
    - client/src/components/GestioneMercati.tsx (righe 2098-2116, 2243, 2427, 2465)
    - client/src/components/PresenzeGraduatoriaPanel.tsx (righe 176-198, 200-225)


BUG 6 — Circa 30 endpoint Integrazioni falliscono il test

  Descrizione: Nel tab Integrazioni della dashboard, Guardian mostra
  circa 30 endpoint come "down" o con errore durante il test.

  Causa: Gli endpoint sono registrati nell'inventario (caricato da
  GitHub: raw.githubusercontent.com/Chcndr/MIO-hub/master/api/index.json)
  ma i rispettivi servizi backend non rispondono o ritornano errore.

  Azione richiesta sul backend Hetzner:
    1. Verificare con "pm2 list" quali processi sono attivi
    2. Verificare con "pm2 logs" gli errori
    3. Per ogni endpoint che fallisce, decidere se:
       a) Il servizio va riavviato
       b) L'endpoint va rimosso dall'inventario
       c) L'endpoint non e' mai stato implementato


BUG 7 — Concessione SUAP: endpoint potenzialmente mancante

  Descrizione: Quando si clicca "Genera Concessione" nel SUAP,
  il frontend ora mostra l'errore reale (grazie al fix 3) ma
  il backend potrebbe non avere l'endpoint.

  Il frontend chiama:
    POST https://orchestratore.mio-hub.me/api/concessions
    con body JSON contenente i dati della concessione.

  Azione richiesta sul backend Hetzner:
    Testare manualmente:
    curl -X POST https://orchestratore.mio-hub.me/api/concessions \
      -H "Content-Type: application/json" \
      -d '{"mercato_id": 1, "posteggio_id": 1, "tipo_concessione": "nuova"}'

    Se risponde 404: l'endpoint va creato.
    Se risponde 400: verificare i nomi dei campi attesi.
    Se risponde 500: controllare i log PM2.

  File frontend: client/src/components/suap/ConcessioneForm.tsx riga 709-711


FIX SICUREZZA (SESSIONE PRECEDENTE)
-------------------------------------

FIX 8 — Data leak impersonazione ClientiTab
  File: client/src/components/ClientiTab.tsx
  Fix: Aggiunto addComuneIdToUrl() al fetch cittadini + migrato a MIHUB_API_BASE_URL

FIX 9 — Data leak impersonazione NotificationsPanel
  File: client/src/components/NotificationsPanel.tsx
  Fix: Aggiunto addComuneIdToUrl() su fetch comuni e settori

FIX 10 — Data leak impersonazione ImpreseQualificazioniPanel
  File: client/src/components/ImpreseQualificazioniPanel.tsx
  Fix: Aggiunto addComuneIdToUrl() su fetch qualificazioni

FIX 11 — Route admin non protette
  File: client/src/App.tsx + client/src/components/ProtectedRoute.tsx
  Fix: Auth guard su 12 route. Le route admin richiedono ruolo pa o superAdmin.
  Route protette con adminOnly:
    /dashboard-pa, /guardian/endpoints, /guardian/logs, /guardian/debug,
    /mio, /council, /settings/api-tokens, /log-debug, /pm/nuovo-verbale
  Route protette con auth semplice:
    /dashboard-impresa, /app/impresa/notifiche, /app/impresa/wallet,
    /app/impresa/presenze, /app/impresa/anagrafica

FIX 12 — CORS wildcard Firebase sync
  File: api/auth/firebase/sync.ts
  Fix: Da Access-Control-Allow-Origin: * a whitelist:
    - https://dms-hub-app-new.vercel.app
    - https://mihub.157-90-29-66.nip.io
    - http://localhost:5173
    - http://localhost:3000
    - *.vercel.app (preview)


========================================================================
SEZIONE 1 — EXECUTIVE SUMMARY
========================================================================

Il sistema DMS Hub ha DUE backend attivi in parallelo sullo stesso server
Hetzner (157.90.29.66):

  ORCHESTRATORE (legacy)
    Dominio: orchestratore.mio-hub.me
    Tipo: Express REST
    Stato: ATTIVO — 39 file del frontend dipendono da questo

  MIHUB tRPC (nuovo)
    Dominio: mihub.157-90-29-66.nip.io / api.mio-hub.me
    Tipo: Express + tRPC
    Stato: ATTIVO — backend principale

L'ORCHESTRATORE NON PUO' ESSERE SPENTO OGGI.
E' ancora il cuore di:
  - Sistema multi-agente AI (orchestrator endpoint)
  - Autenticazione legacy (user lookup)
  - SUAP/Concessioni (CRUD completo)
  - Citizens / TCC / Gaming Rewards
  - Wallet operations


========================================================================
SEZIONE 2 — MAPPA COMPLETA DIPENDENZE ORCHESTRATORE (39 file)
========================================================================

FILE CRITICI (il core dell'app dipende da questi):

  api/orchestratorClient.ts
    Chiama: POST /api/mihub/orchestrator
    Per: Chat AI multi-agente

  api/mihub/orchestrator-proxy.ts
    Chiama: POST /api/mihub/orchestrator
    Per: Proxy Vercel per orchestratore

  api/mio/agent-logs.ts
    Chiama: GET /api/mio/agent-logs
    Per: Log agenti AI

  contexts/FirebaseAuthContext.tsx
    Chiama: GET /api/security/users?search=
    Per: User lookup legacy durante login

  contexts/MioContext.tsx
    Usa: orchestratorClient
    Per: Contesto chat AI

  components/SuapPanel.tsx
    Chiama: GET/POST/DELETE /api/concessions/*
    Per: CRUD concessioni

  components/WalletPanel.tsx
    Chiama: /api/wallets/*
    Per: Operazioni wallet

  pages/WalletPage.tsx
    Chiama: /api/wallets/*
    Per: Wallet cittadini

  pages/WalletImpresaPage.tsx
    Chiama: /api/wallets/*
    Per: Wallet imprese

  pages/WalletPaga.tsx
    Chiama: /api/wallets/*
    Per: Pagamenti

  pages/WalletStorico.tsx
    Chiama: /api/wallets/*
    Per: Storico wallet


FILE IMPORTANTI (feature attive):

  components/GamingRewardsPanel.tsx — /api/gaming-rewards/*
  components/ComuniPanel.tsx — /api/comuni/*
  components/markets/ConcessionForm.tsx — /api/concessions/*
  components/markets/MarketCompaniesTab.tsx — /api/imprese/*
  components/Integrazioni.tsx — GitHub API index
  components/HealthDashboard.tsx — /api/health
  hooks/useSystemStatus.ts — /api/health
  hooks/useNearbyPOIs.ts — /api/gaming-rewards/nearby-pois
  hooks/useInternalTraces.ts — /api/mio/*
  pages/HubOperatore.tsx — vari endpoint
  pages/MarketGISPage.tsx — /api/gis/*


SUAP (8 file):

  api/suap.ts — Client SUAP
  components/suap/AutorizzazioneForm.tsx — CRUD autorizzazioni
  components/suap/ConcessioneForm.tsx — CRUD concessioni
  components/suap/DomandaSpuntaForm.tsx — Domande spunta
  components/suap/ListaAutorizzazioniSuap.tsx — Lista autorizzazioni
  components/suap/ListaDomandeSpuntaSuap.tsx — Lista domande
  components/suap/SciaForm.tsx — Form SCIA
  pages/suap/SuapDashboard.tsx — Dashboard SUAP


CONFIG/BUILD (4 file):

  config/api.ts — costante ORCHESTRATORE_API_BASE_URL
  config/realEndpoints.ts — lista endpoint reali
  vite.config.ts — dev proxy target + VITE_TRPC_URL fallback
  vercel.json — 4 rewrite rules verso orchestratore


VERCEL REWRITES CHE PUNTANO ALL'ORCHESTRATORE:

  /api/citizens/*        -> orchestratore.mio-hub.me/api/citizens/*
  /api/citizens          -> orchestratore.mio-hub.me/api/citizens
  /api/gaming-rewards/*  -> orchestratore.mio-hub.me/api/gaming-rewards/*
  /api/tcc/*             -> orchestratore.mio-hub.me/api/tcc/*

  Tutti gli altri /api/* vanno a api.mio-hub.me o mihub.157-90-29-66.nip.io


========================================================================
SEZIONE 3 — MAPPA COMPLETA SERVIZI ESTERNI
========================================================================

BACKEND SU HETZNER (157.90.29.66):

  Orchestratore REST — orchestratore.mio-hub.me — porta 3000 — PM2: mihub-backend
  tRPC Backend — mihub.157-90-29-66.nip.io — porta 3000 — PM2: mihub-backend
  api.mio-hub.me — alias CNAME -> Hetzner — porta 3000 — PM2: mihub-backend
  Council Frontend — council.mio-hub.me — porta 8002 — PM2: council-frontend
  Council API — council-api.mio-hub.me — porta 8001 — PM2: council-api

  NOTA: orchestratore.mio-hub.me e mihub.157-90-29-66.nip.io puntano
  allo STESSO server. Probabilmente e' lo STESSO processo PM2.


SERVIZI ESTERNI:

  Firebase Auth — dmshub-auth-2975e.firebaseapp.com
    Usato da: Login/registrazione
    Critico: SI

  PostgreSQL Neon — ep-bold-silence-adftsojg.neon.tech
    Usato da: Tutti i dati
    Critico: SI

  Google Maps API — maps.googleapis.com
    Usato da: Mappe, directions
    Critico: SI

  OpenStreetMap — tile.openstreetmap.org
    Usato da: Tile mappe gratuite
    Critico: NO (fallback)

  GitHub CDN — cdn.githubusercontent.com/Chcndr/MIO-hub
    Usato da: Log MIO
    Critico: NO

  DMS Legacy — lapsy-dms.herokuapp.com
    Usato da: Presenze (iframe)
    Critico: NO (fallback)

  DMS Associates — dms.associates/wp-admin/images/DMSAPP
    Usato da: Presenze (iframe)
    Critico: SI

  E-FIL PagoPA — test.plugnpay.efil.it
    Usato da: Pagamenti (configurato, non attivo)
    Critico: NO

  Council AI — council.mio-hub.me
    Usato da: LLM comparison (iframe)
    Critico: NO


VARIABILI D'AMBIENTE CRITICHE:

  Backend:
    DATABASE_URL — Neon PostgreSQL
    JWT_SECRET — Firma token sessione
    OAUTH_SERVER_URL — Server OAuth Manus
    HETZNER_SSH_KEY — Deploy SSH (api/admin/deploy-backend.ts)

  Frontend:
    VITE_TRPC_URL — URL backend tRPC
    VITE_API_URL — URL base API (fallback orchestratore)
    VITE_MIHUB_API_URL — URL Mihub specifico
    VITE_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET,
    MESSAGING_SENDER_ID, APP_ID — 6 variabili Firebase

  PagoPA (futuro):
    EFIL_BASE_URL, EFIL_USERNAME, EFIL_PASSWORD


========================================================================
SEZIONE 4 — RISCHI IDENTIFICATI (non ancora fixati)
========================================================================

ALTA PRIORITA':

  A1: URL backend hardcoded in 39 file
    Dove: Tutto il frontend
    Impatto: Se orchestratore cambia IP, 39 file da modificare

  A2: Nessun rate limiting su API pubbliche
    Dove: server/_core/index.ts
    Impatto: DDoS possibile

  A3: Nessuna validazione Zod su alcune procedure tRPC
    Dove: Vari router
    Impatto: Input injection

  A4: SSH key per deploy in env var
    Dove: api/admin/deploy-backend.ts
    Impatto: Se Vercel e' compromesso, accesso SSH root

MEDIA PRIORITA':

  M1: Doppio backend (orchestratore + tRPC)
    Dove: Architettura
    Impatto: Superficie d'attacco doppia, manutenzione doppia

  M2: nip.io domain per tRPC production
    Dove: vercel.json, config/api.ts
    Impatto: nip.io e' un servizio terzo, se va giu' il DNS si rompe

  M3: Firebase API key esposta nel bundle
    Dove: .env.production
    Impatto: Normale per Firebase, ma va limitata nel console

  M4: Cookie session senza attributi Secure/SameSite audit
    Dove: server/_core
    Impatto: Da verificare

  M5: console.error con dati sensibili
    Dove: Vari file
    Impatto: Stack trace con URL/token nei log browser

BASSA PRIORITA':

  B1: Manca Content-Security-Policy header (Vercel config)
  B2: Manca HSTS preload (Vercel config)
  B3: DMS Legacy su Heroku puo' sparire (PresenzePage.tsx)
  B4: GitHub CDN per log MIO e' fragile (mio-monitor.tsx)


========================================================================
SEZIONE 5 — ROADMAP DISMISSIONE ORCHESTRATORE
========================================================================

PREMESSA:
L'orchestratore e' il backend REST legacy su Hetzner.
Il backend tRPC nuovo gira sullo STESSO server.
L'obiettivo e' consolidare tutto nel backend tRPC.


ENDPOINT ORCHESTRATORE DA MIGRARE (12 gruppi):

  1. POST /api/mihub/orchestrator — Chat AI — migrare a mihubRouter (tRPC)
  2. GET /api/security/users — Auth lookup — migrare a authRouter (tRPC)
  3. GET /api/imprese/* — SUAP, Markets — migrare a dmsHubRouter (tRPC)
  4. GET/POST/DELETE /api/concessions/* — SUAP — migrare a dmsHubRouter (tRPC)
  5. GET /api/citizens — ClientiTab — migrare a dmsHubRouter (tRPC)
  6. GET /api/tcc/* — Carbon Credits — migrare a carbonCreditsRouter (tRPC)
  7. GET /api/gaming-rewards/* — Gamification — creare nuovo gamingRouter (tRPC)
  8. GET /api/wallets/* — Wallet — migrare a walletRouter (gia' parziale)
  9. GET /api/comuni/* — Comuni, Notifiche — migrare a dmsHubRouter (tRPC)
  10. GET /api/health — Health check — migrare a systemRouter (tRPC)
  11. GET /api/mio/agent-logs — MIO agent — migrare a mioAgentRouter (tRPC)
  12. GET /api/gis/* — Mappa GIS — migrare a dmsHubRouter (tRPC)


SPRINT DI MIGRAZIONE:

  Sprint 1 — Critico (Chat AI + Auth):
    1. Migrare POST /api/mihub/orchestrator -> mihub.orchestrate (tRPC)
    2. Migrare GET /api/security/users -> auth.searchUsers (tRPC)
    3. Aggiornare orchestratorClient.ts e FirebaseAuthContext.tsx
    Effort: 2-3 giorni

  Sprint 2 — DMS Data (Mercati + Imprese + Concessioni):
    4. Migrare /api/imprese/* -> dmsHub.imprese.* (tRPC)
    5. Migrare /api/concessions/* -> dmsHub.concessions.* (tRPC)
    6. Migrare /api/citizens -> dmsHub.citizens.* (tRPC)
    7. Aggiornare tutti i componenti SUAP (8 file)
    Effort: 3-5 giorni

  Sprint 3 — Wallet + TCC:
    8. Migrare /api/wallets/* -> wallet.* (tRPC)
    9. Migrare /api/tcc/* -> carbonCredits.* (tRPC)
    10. Migrare /api/gaming-rewards/* -> nuovo gamingRouter (tRPC)
    Effort: 2-3 giorni

  Sprint 4 — Pulizia:
    11. Migrare /api/comuni/*, /api/gis/*, /api/health a tRPC
    12. Rimuovere rewrite orchestratore da vercel.json
    13. Rimuovere ORCHESTRATORE_API_BASE_URL da config/api.ts
    14. Rimuovere proxy orchestratore da vite.config.ts
    15. Aggiornare tutti i 39 file
    Effort: 1-2 giorni

  Fase C — Spegnimento:
    1. Tenere orchestratore in read-only per 2 settimane (monitoring)
    2. Verificare che nessuna chiamata arrivi piu'
    3. Spegnere il processo PM2 dell'orchestratore
    4. Mantenere il codice in _cantina/ come archivio
    Effort: 2 settimane osservazione

  TOTALE: 2-3 settimane di lavoro + 2 settimane di osservazione


========================================================================
SEZIONE 6 — RISPOSTA: "POSSO SPEGNERE L'ORCHESTRATORE?"
========================================================================

NO, non oggi. Il sistema fa ancora 12 gruppi di chiamate attive:

  Chat AI ............. orchestratore.mio-hub.me/api/mihub/orchestrator
  Auth lookup ......... orchestratore.mio-hub.me/api/security/users
  Citizens ............ orchestratore.mio-hub.me/api/citizens
  TCC ................. orchestratore.mio-hub.me/api/tcc/*
  Gaming .............. orchestratore.mio-hub.me/api/gaming-rewards/*
  Concessioni ......... orchestratore.mio-hub.me/api/concessions/*
  Imprese ............. orchestratore.mio-hub.me/api/imprese/*
  Wallet .............. orchestratore.mio-hub.me/api/wallets/*
  Comuni .............. orchestratore.mio-hub.me/api/comuni/*
  GIS ................. orchestratore.mio-hub.me/api/gis/*
  Health .............. orchestratore.mio-hub.me/api/health
  Agent logs .......... orchestratore.mio-hub.me/api/mio/agent-logs

Se spegni l'orchestratore oggi, si rompono:
  - La chat AI (completamente)
  - Il login (parzialmente — il bridge legacy fallisce)
  - SUAP/Concessioni (completamente)
  - Citizens/TCC/Gaming (completamente)
  - Wallet (completamente)
  - Dashboard health checks (parzialmente)

Per spegnerlo serve migrare tutto al backend tRPC (vedi Sezione 5).


========================================================================
SEZIONE 7 — ARCHITETTURA ATTUALE
========================================================================

                    UTENTE BROWSER
                         |
                    [Vercel CDN]
                    dms-hub-app-new.vercel.app
                         |
              +----------+----------+
              |                     |
         [React SPA]          [Vercel Rewrites]
              |                     |
              |          +----------+----------+
              |          |                     |
              |    /api/trpc/*           /api/citizens/*
              |    /api/sanctions/*      /api/gaming-rewards/*
              |    /api/notifiche/*      /api/tcc/*
              |    /api/verbali/*        /api/mihub/orchestrator
              |    /api/auth/*                 |
              |    /api/imprese/*              |
              |    /api/wallets/*              v
              |          |              [ORCHESTRATORE]
              |          v              Express REST
              |    [MIHUB tRPC]         orchestratore.mio-hub.me
              |    Express + tRPC              |
              |    mihub.157-90-29-66          |
              |    .nip.io                     |
              |          |                     |
              |          +----------+----------+
              |                     |
              |              [Hetzner VPS]
              |              157.90.29.66
              |              PM2: mihub-backend
              |                     |
              |              [PostgreSQL Neon]
              |              ep-bold-silence
              |
              +---- [Firebase Auth] ---- dmshub-auth-2975e
              +---- [Google Maps API]
              +---- [Council AI] ---- council.mio-hub.me (iframe)
              +---- [DMS Legacy] ---- dms.associates (iframe)


========================================================================
SEZIONE 8 — ARCHITETTURA TARGET (dopo dismissione orchestratore)
========================================================================

                    UTENTE BROWSER
                         |
                    [Vercel CDN]
                         |
              +----------+----------+
              |                     |
         [React SPA]          [Vercel Rewrites]
              |                     |
              |               /api/trpc/*  (TUTTO)
              |                     |
              |                     v
              |              [MIHUB tRPC UNICO]
              |              Express + tRPC
              |              api.mio-hub.me
              |                     |
              |              [PostgreSQL Neon]
              |
              +---- [Firebase Auth]
              +---- [Google Maps API]
              +---- [Council AI] (iframe)

Un solo backend, un solo dominio, un solo punto di manutenzione.
