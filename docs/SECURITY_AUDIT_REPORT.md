# SECURITY AUDIT & ARCHITECTURE REPORT — DMS Hub
> Data: 20 Febbraio 2026 (aggiornato)
> Autore: Claude (Security Review)
> Branch: claude/review-production-fixes-3sUvQ

---

## 0. BUG FUNZIONALI FIXATI (20 Feb 2026)

### Fix applicati (frontend)

| # | Bug | File | Fix | Stato |
|---|-----|------|-----|-------|
| 1 | **Dashboard PA si ricarica/flickera** per i permessi | `PermissionsContext.tsx` | Storage event listener ora ricarica SOLO se il ruolo utente cambia (debounce 300ms + confronto ruolo) | FIXATO |
| 2 | **Notifiche non partono** da NuovoVerbalePage | `NuovoVerbalePage.tsx` | Aggiunta chiamata `POST /api/notifiche/send` dopo creazione verbale (prima diceva "notifica inviata" senza inviarla) | FIXATO |
| 3 | **Errore generazione concessione SUAP** | `ConcessioneForm.tsx` | Aggiunto check `response.ok` + gestione risposta non-JSON (404 HTML) + error parsing robusto | FIXATO |
| 4 | **Errore concessione markets** | `ConcessionForm.tsx` | Stesso fix: check content-type prima di JSON.parse su errore | FIXATO |

### Bug backend (NON fixabili dal frontend)

| # | Bug | Causa | Azione richiesta |
|---|-----|-------|------------------|
| 5 | **Report storico Grosseto a zero** dopo Simula Mercato | La simulazione chiama `/api/test-mercato/avvia-spunta` ma il report legge da `/api/graduatoria/mercato/{id}` e `/api/presenze/mercato/{id}`. Sono tabelle/endpoint DIVERSI sul backend Hetzner. La simulazione non scrive nelle tabelle che il report legge. | Fix richiesto sul backend Hetzner: `/api/test-mercato/*` deve scrivere nelle stesse tabelle di graduatoria/presenze |
| 6 | **~30 endpoint Integrazioni falliscono** il test | Gli endpoint sono registrati nell'inventario ma i rispettivi servizi backend non rispondono o ritornano errore. Guardian li mostra come "down". | Verificare su Hetzner quali servizi REST sono attivi e quali vanno riavviati/rimossi dall'inventario |
| 7 | **Concessione SUAP: endpoint potenzialmente mancante** | `POST /api/concessions` sull'orchestratore potrebbe non esistere o aspettare campi diversi. Il fix frontend mostra l'errore reale ma il backend va verificato. | Testare: `curl -X POST https://orchestratore.mio-hub.me/api/concessions -H "Content-Type: application/json" -d '{}'` |

### Fix sicurezza (sessione precedente)

| # | Fix | File |
|---|-----|------|
| 8 | Data leak impersonazione ClientiTab | `ClientiTab.tsx` — aggiunto `addComuneIdToUrl()` |
| 9 | Data leak impersonazione NotificationsPanel | `NotificationsPanel.tsx` — filtro comune_id |
| 10 | Data leak impersonazione ImpreseQualificazioniPanel | `ImpreseQualificazioniPanel.tsx` — filtro comune_id |
| 11 | Route admin non protette | `App.tsx` + `ProtectedRoute.tsx` — auth guard su 12 route |
| 12 | CORS wildcard Firebase sync | `api/auth/firebase/sync.ts` — da `*` a whitelist domini |

---

## 1. EXECUTIVE SUMMARY

Il sistema DMS Hub ha **due backend attivi in parallelo** sullo stesso server Hetzner (157.90.29.66):

| Backend | Dominio | Tipo | Stato |
|---------|---------|------|-------|
| **Orchestratore** | orchestratore.mio-hub.me | Express REST (legacy) | ATTIVO — 39 file dipendono |
| **Mihub tRPC** | mihub.157-90-29-66.nip.io / api.mio-hub.me | Express + tRPC (nuovo) | ATTIVO — backend principale |

**L'orchestratore NON puo' essere spento oggi.** E' ancora il cuore di:
- Sistema multi-agente AI (orchestrator endpoint)
- Autenticazione legacy (user lookup)
- SUAP/Concessioni (CRUD completo)
- Citizens / TCC / Gaming Rewards
- Wallet operations

---

## 2. FIX GIA' APPLICATI (Fase 1 — Completata)

### 2.1 Data Leak Impersonazione (3 fix)
| File | Problema | Fix |
|------|----------|-----|
| `ClientiTab.tsx` | Fetch cittadini senza filtro comune | Aggiunto `addComuneIdToUrl()` + migrato a `MIHUB_API_BASE_URL` |
| `NotificationsPanel.tsx` | Fetch comuni/settori senza filtro | Aggiunto `addComuneIdToUrl()` su entrambe le fetch |
| `ImpreseQualificazioniPanel.tsx` | Fetch qualificazioni senza filtro | Aggiunto `addComuneIdToUrl()` |

### 2.2 Route non protette (auth guard)
Creato `ProtectedRoute.tsx` e applicato a:

| Route | Protezione |
|-------|-----------|
| `/dashboard-pa` | Auth + adminOnly (pa/superAdmin) |
| `/guardian/endpoints` | Auth + adminOnly |
| `/guardian/logs` | Auth + adminOnly |
| `/guardian/debug` | Auth + adminOnly |
| `/mio` | Auth + adminOnly |
| `/council` | Auth + adminOnly |
| `/settings/api-tokens` | Auth + adminOnly |
| `/log-debug` | Auth + adminOnly |
| `/pm/nuovo-verbale` | Auth + adminOnly |
| `/dashboard-impresa` | Auth (qualsiasi utente loggato) |
| `/app/impresa/*` (5 route) | Auth (qualsiasi utente loggato) |

### 2.3 CORS Hardening
`api/auth/firebase/sync.ts`: da `Access-Control-Allow-Origin: *` a whitelist:
- `https://dms-hub-app-new.vercel.app`
- `https://mihub.157-90-29-66.nip.io`
- `http://localhost:5173` / `http://localhost:3000`
- Preview Vercel (`*.vercel.app`)

---

## 3. MAPPA COMPLETA DIPENDENZE ORCHESTRATORE

### 3.1 File di codice attivo (runtime) — 39 file

**Critico (core app funziona grazie a questi):**

| File | Cosa chiama | Endpoint |
|------|-------------|----------|
| `api/orchestratorClient.ts` | Chat AI multi-agente | `POST /api/mihub/orchestrator` |
| `api/mihub/orchestrator-proxy.ts` | Proxy Vercel per orchestratore | `POST /api/mihub/orchestrator` |
| `api/mio/agent-logs.ts` | Log agenti AI | `GET /api/mio/agent-logs` |
| `contexts/FirebaseAuthContext.tsx` | User lookup legacy | `GET /api/security/users?search=` |
| `contexts/MioContext.tsx` | Contesto chat AI | Usa orchestratorClient |
| `components/SuapPanel.tsx` | CRUD concessioni | `GET/POST/DELETE /api/concessions/*` |
| `components/WalletPanel.tsx` | Operazioni wallet | `/api/wallets/*` |
| `pages/WalletPage.tsx` | Wallet cittadini | `/api/wallets/*` |
| `pages/WalletImpresaPage.tsx` | Wallet imprese | `/api/wallets/*` |
| `pages/WalletPaga.tsx` | Pagamenti | `/api/wallets/*` |
| `pages/WalletStorico.tsx` | Storico wallet | `/api/wallets/*` |

**Importante (feature attive):**

| File | Cosa chiama | Endpoint |
|------|-------------|----------|
| `components/GamingRewardsPanel.tsx` | Rewards gamification | `/api/gaming-rewards/*` |
| `components/ComuniPanel.tsx` | Gestione comuni | `/api/comuni/*` |
| `components/markets/ConcessionForm.tsx` | Form concessioni | `/api/concessions/*` |
| `components/markets/MarketCompaniesTab.tsx` | Imprese mercato | `/api/imprese/*` |
| `components/Integrazioni.tsx` | Dashboard integrazioni | GitHub API index |
| `components/HealthDashboard.tsx` | Health check | `/api/health` |
| `hooks/useSystemStatus.ts` | Status sistema | `/api/health` |
| `hooks/useNearbyPOIs.ts` | POI vicini | `/api/gaming-rewards/nearby-pois` |
| `hooks/useInternalTraces.ts` | Trace interne | `/api/mio/*` |
| `pages/HubOperatore.tsx` | Hub operatore | Vari endpoint |
| `pages/MarketGISPage.tsx` | Mappa GIS | `/api/gis/*` |

**SUAP (6 file):**

| File | Cosa chiama |
|------|-------------|
| `api/suap.ts` | Client SUAP |
| `components/suap/AutorizzazioneForm.tsx` | CRUD autorizzazioni |
| `components/suap/ConcessioneForm.tsx` | CRUD concessioni |
| `components/suap/DomandaSpuntaForm.tsx` | Domande spunta |
| `components/suap/ListaAutorizzazioniSuap.tsx` | Lista autorizzazioni |
| `components/suap/ListaDomandeSpuntaSuap.tsx` | Lista domande |
| `components/suap/SciaForm.tsx` | Form SCIA |
| `pages/suap/SuapDashboard.tsx` | Dashboard SUAP |

**Config/Build:**

| File | Ruolo |
|------|-------|
| `config/api.ts` | `ORCHESTRATORE_API_BASE_URL` costante |
| `config/realEndpoints.ts` | Lista endpoint reali |
| `vite.config.ts` | Dev proxy target + VITE_TRPC_URL fallback |
| `vercel.json` | 4 rewrite rules verso orchestratore |

### 3.2 Vercel Rewrites che puntano all'orchestratore

```
/api/citizens/*        -> orchestratore.mio-hub.me/api/citizens/*
/api/citizens          -> orchestratore.mio-hub.me/api/citizens
/api/gaming-rewards/*  -> orchestratore.mio-hub.me/api/gaming-rewards/*
/api/tcc/*             -> orchestratore.mio-hub.me/api/tcc/*
```

Tutti gli altri `/api/*` vanno a `api.mio-hub.me` o `mihub.157-90-29-66.nip.io` (backend tRPC).

---

## 4. MAPPA COMPLETA SERVIZI ESTERNI

### 4.1 Backend (Hetzner 157.90.29.66)

| Servizio | Dominio | Porta | PM2 |
|----------|---------|-------|-----|
| Orchestratore REST | orchestratore.mio-hub.me | 3000 | mihub-backend |
| tRPC Backend | mihub.157-90-29-66.nip.io | 3000 | mihub-backend |
| api.mio-hub.me | alias CNAME -> Hetzner | 3000 | mihub-backend |
| Council Frontend | council.mio-hub.me | 8002 | council-frontend |
| Council API | council-api.mio-hub.me | 8001 | council-api |

**Nota:** orchestratore.mio-hub.me e mihub.157-90-29-66.nip.io puntano allo STESSO server.
Probabilmente e' lo STESSO processo PM2, con rotte diverse.

### 4.2 Servizi Esterni

| Servizio | URL | Usato da | Critico? |
|----------|-----|----------|----------|
| **Firebase Auth** | dmshub-auth-2975e.firebaseapp.com | Login/registrazione | SI |
| **PostgreSQL Neon** | ep-bold-silence-adftsojg.neon.tech | Tutti i dati | SI |
| **Google Maps API** | maps.googleapis.com | Mappe, directions | SI |
| **OpenStreetMap** | tile.openstreetmap.org | Tile mappe gratuite | NO (fallback) |
| **GitHub CDN** | cdn.githubusercontent.com/Chcndr/MIO-hub | Log MIO | NO |
| **DMS Legacy** | lapsy-dms.herokuapp.com | Presenze (iframe) | NO (fallback) |
| **DMS Associates** | dms.associates/wp-admin/images/DMSAPP | Presenze (iframe) | SI |
| **E-FIL PagoPA** | test.plugnpay.efil.it | Pagamenti (configurato) | NO (non attivo) |
| **Council AI** | council.mio-hub.me | LLM comparison (iframe) | NO |

### 4.3 Variabili d'ambiente critiche

```
# Backend
DATABASE_URL              # Neon PostgreSQL
JWT_SECRET                # Firma token sessione
OAUTH_SERVER_URL          # Server OAuth Manus
HETZNER_SSH_KEY           # Deploy SSH (api/admin/deploy-backend.ts)

# Frontend
VITE_TRPC_URL             # URL backend tRPC
VITE_API_URL              # URL base API (fallback orchestratore)
VITE_MIHUB_API_URL        # URL Mihub specifico
VITE_FIREBASE_*           # 6 variabili Firebase
VITE_GOOGLE_MAPS_KEY      # (se usata)

# PagoPA (futuro)
EFIL_BASE_URL / EFIL_USERNAME / EFIL_PASSWORD
```

---

## 5. RISCHI IDENTIFICATI (non ancora fixati)

### 5.1 ALTA PRIORITA'

| # | Rischio | Dove | Impatto |
|---|---------|------|---------|
| A1 | **URL backend hardcoded** in 39 file | Tutto il frontend | Se orchestratore cambia IP, 39 file da modificare |
| A2 | **Nessun rate limiting** su API pubbliche | server/_core/index.ts | DDoS possibile |
| A3 | **Nessuna validazione Zod** su alcune procedure tRPC | Vari router | Input injection |
| A4 | **SSH key per deploy** in env var | api/admin/deploy-backend.ts | Se Vercel e' compromesso, accesso SSH root |

### 5.2 MEDIA PRIORITA'

| # | Rischio | Dove | Impatto |
|---|---------|------|---------|
| M1 | **Doppio backend** (orchestratore + tRPC) | Architettura | Superficie d'attacco doppia, manutenzione doppia |
| M2 | **nip.io domain** per tRPC production | vercel.json, config/api.ts | nip.io e' un servizio terzo, se va giu' il DNS si rompe |
| M3 | **Firebase API key esposta** nel bundle | .env.production | Normale per Firebase, ma va limitata con restrizioni nel console |
| M4 | **Cookie session** senza attributi `Secure`/`SameSite` audit | server/_core | Da verificare |
| M5 | **console.error** con dati sensibili | Vari file | Stack trace con URL/token nei log browser |

### 5.3 BASSA PRIORITA' (hardening)

| # | Rischio | Dove |
|---|---------|------|
| B1 | Manca Content-Security-Policy header | Vercel config |
| B2 | Manca HSTS preload | Vercel config |
| B3 | DMS Legacy su Heroku (puo' sparire) | PresenzePage.tsx |
| B4 | GitHub CDN per log MIO (fragile) | mio-monitor.tsx |

---

## 6. ROADMAP: DISMISSIONE ORCHESTRATORE

### Premessa
L'orchestratore e' il backend REST legacy su Hetzner. Il backend tRPC nuovo gira sullo STESSO server.
L'obiettivo e' consolidare tutto nel backend tRPC, eliminando la dipendenza dall'orchestratore.

### Fase A — Inventario endpoint orchestratore (gia' fatto)

Endpoint dell'orchestratore usati dal frontend:

| Endpoint | Usato da | Migrabile a tRPC? |
|----------|----------|-------------------|
| `POST /api/mihub/orchestrator` | Chat AI | SI (mihubRouter) |
| `GET /api/security/users` | FirebaseAuthContext | SI (authRouter) |
| `GET /api/imprese/*` | SUAP, Markets | SI (dmsHubRouter) |
| `GET/POST/DELETE /api/concessions/*` | SUAP | SI (dmsHubRouter) |
| `GET /api/citizens` | ClientiTab | SI (dmsHubRouter) |
| `GET /api/tcc/*` | Carbon Credits | SI (carbonCreditsRouter) |
| `GET /api/gaming-rewards/*` | GamingRewardsPanel | SI (nuovo router) |
| `GET /api/wallets/*` | WalletPanel, WalletPage | SI (walletRouter) |
| `GET /api/comuni/*` | ComuniPanel, Notifications | SI (dmsHubRouter) |
| `GET /api/health` | HealthDashboard | SI (systemRouter) |
| `GET /api/mio/agent-logs` | MIO agent | SI (mioAgentRouter) |
| `GET /api/gis/*` | MarketGISPage | SI (dmsHubRouter) |

**Totale: ~12 gruppi di endpoint da migrare**

### Fase B — Migrazione endpoint per priorita'

**Sprint 1 — Critico (Chat AI + Auth):**
1. Migrare `POST /api/mihub/orchestrator` -> `mihub.orchestrate` (tRPC)
2. Migrare `GET /api/security/users` -> `auth.searchUsers` (tRPC)
3. Aggiornare `orchestratorClient.ts` e `FirebaseAuthContext.tsx`

**Sprint 2 — DMS Data (Mercati + Imprese + Concessioni):**
4. Migrare `/api/imprese/*` -> `dmsHub.imprese.*` (tRPC)
5. Migrare `/api/concessions/*` -> `dmsHub.concessions.*` (tRPC)
6. Migrare `/api/citizens` -> `dmsHub.citizens.*` (tRPC)
7. Aggiornare tutti i componenti SUAP (8 file)

**Sprint 3 — Wallet + TCC:**
8. Migrare `/api/wallets/*` -> `wallet.*` (tRPC — gia' parzialmente fatto)
9. Migrare `/api/tcc/*` -> `carbonCredits.*` (tRPC — gia' parzialmente fatto)
10. Migrare `/api/gaming-rewards/*` -> nuovo `gamingRouter` (tRPC)

**Sprint 4 — Pulizia:**
11. Migrare `/api/comuni/*`, `/api/gis/*`, `/api/health` a tRPC
12. Rimuovere rewrite orchestratore da `vercel.json`
13. Rimuovere `ORCHESTRATORE_API_BASE_URL` da `config/api.ts`
14. Rimuovere proxy orchestratore da `vite.config.ts`
15. Aggiornare tutti i 39 file

### Fase C — Spegnimento orchestratore

1. Tenere orchestratore in read-only per 2 settimane (monitoring)
2. Verificare che nessuna chiamata arrivi piu'
3. Spegnere il processo PM2 dell'orchestratore
4. Mantenere il codice in `_cantina/` come archivio

### Stima effort
- Sprint 1: ~2-3 giorni
- Sprint 2: ~3-5 giorni (SUAP e' complesso)
- Sprint 3: ~2-3 giorni
- Sprint 4: ~1-2 giorni
- Fase C: ~2 settimane di osservazione

**Totale: ~2-3 settimane di lavoro + 2 settimane di osservazione**

---

## 7. ROADMAP: ALTRI FIX DI SICUREZZA

### Fase 2 — URL Consolidation (1-2 giorni)
- Sostituire tutti gli URL hardcoded orchestratore con URL relativi `/api/*`
- I proxy Vercel gia' gestiscono il rewrite
- Questo e' indipendente dalla dismissione orchestratore

### Fase 3 — Rate Limiting Backend (1 giorno)
- Aggiungere `express-rate-limit` su `server/_core/index.ts`
- Limiti: 100 req/min per IP su API pubbliche, 30 req/min su auth

### Fase 4 — Validazione Zod (2-3 giorni)
- Audit di tutte le procedure tRPC
- Aggiungere `.input(z.object({...}))` dove manca
- Priorita' su procedure che accettano input utente

### Fase 5 — Cookie/Session Audit (1 giorno)
- Verificare attributi `Secure`, `HttpOnly`, `SameSite=Strict`
- Verificare scadenza JWT (attualmente 1 anno — da ridurre?)

### Fase 6 — Headers Security (0.5 giorni)
- Aggiungere in `vercel.json`:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (eccetto pagine con iframe)

---

## 8. RISPOSTA ALLA DOMANDA: "POSSO SPEGNERE L'ORCHESTRATORE?"

**NO, non oggi.** Il sistema fa ancora ~12 gruppi di chiamate attive all'orchestratore:

```
Chat AI          -> orchestratore.mio-hub.me/api/mihub/orchestrator
Auth lookup      -> orchestratore.mio-hub.me/api/security/users
Citizens         -> orchestratore.mio-hub.me/api/citizens
TCC              -> orchestratore.mio-hub.me/api/tcc/*
Gaming           -> orchestratore.mio-hub.me/api/gaming-rewards/*
Concessioni      -> orchestratore.mio-hub.me/api/concessions/*
Imprese          -> orchestratore.mio-hub.me/api/imprese/*
Wallet           -> orchestratore.mio-hub.me/api/wallets/*
Comuni           -> orchestratore.mio-hub.me/api/comuni/*
GIS              -> orchestratore.mio-hub.me/api/gis/*
Health           -> orchestratore.mio-hub.me/api/health
Agent logs       -> orchestratore.mio-hub.me/api/mio/agent-logs
```

Se spegni l'orchestratore oggi, si rompono:
- La chat AI (completamente)
- Il login (parzialmente — il bridge legacy fallisce)
- SUAP/Concessioni (completamente)
- Citizens/TCC/Gaming (completamente)
- Wallet (completamente)
- Dashboard health checks (parzialmente)

**Per spegnerlo serve migrare tutto al backend tRPC (vedi Roadmap sezione 6).**

---

## 9. ARCHITETTURA ATTUALE (Diagramma)

```
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
              |
              +---- [Google Maps API]
              |
              +---- [Council AI] ---- council.mio-hub.me (iframe)
              |
              +---- [DMS Legacy] ---- dms.associates (iframe)
```

---

## 10. ARCHITETTURA TARGET (dopo dismissione orchestratore)

```
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
```

Un solo backend, un solo dominio, un solo punto di manutenzione.
