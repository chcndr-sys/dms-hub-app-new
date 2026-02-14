# CONTESTO DI SISTEMA - DMS Hub

> Documento di contesto per agenti AI e sviluppatori che entrano nel progetto.
> Leggere TUTTO prima di fare qualsiasi modifica.
> Ultimo aggiornamento: Febbraio 2026.

---

## 1. COS'E' DMS HUB

**DMS Hub** (Digital Market System Hub) e' la piattaforma digitale per la gestione
dei **mercati ambulanti italiani**. Gestisce tutto il ciclo: mercati, posteggi,
operatori, concessioni, presenze, pagamenti PagoPA, mobilita', segnalazioni civiche
e monitoraggio. Progettato per scalare a **8.000 mercati**.

### Un'unica app web per tutti

**URL unico**: `dms-hub-app-new.vercel.app`

Stessa app, stesse rotte — ma ogni utente vede solo cio' che il suo ruolo permette:

| Tipo utente | Cosa vede | Rotte principali |
|-------------|-----------|------------------|
| **PA** (Pubblica Amministrazione) | Dashboard completa con 14+ tab, gestione mercati, operatori, concessioni, wallet, SUAP, controlli, sicurezza RBAC, monitoring | `/dashboard-pa`, `/guardian/*`, `/council`, `/pm/*` |
| **Impresa/Operatore** | Dashboard impresa, anagrafica, concessioni, presenze, wallet operatore, notifiche | `/dashboard-impresa`, `/app/impresa/*`, `/hub-operatore` |
| **Cittadino** | Mappa mercati, segnalazioni civiche, wallet, percorsi, vetrine | `/mappa`, `/civic`, `/wallet`, `/route`, `/vetrine` |
| **Pubblico** (non autenticato) | Home page, mappa pubblica, presentazione | `/`, `/mappa`, `/mappa-italia`, `/presentazione` |

La differenziazione avviene tramite il **sistema RBAC** (sezione 5).

---

## 2. STACK TECNOLOGICO

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| **Frontend** | React + Vite + Wouter | React 19, Vite 7 |
| **UI** | shadcn/ui + Tailwind CSS + Lucide React | Tailwind 4 |
| **State** | React Context + React Query (via tRPC) | |
| **Backend** | Express + tRPC | Express 4, tRPC 11 |
| **ORM** | Drizzle ORM | 0.44 |
| **Database** | PostgreSQL su Neon | Serverless, EU |
| **Auth** | Firebase + OAuth (SPID/CIE/CNS) | Firebase 12 |
| **Runtime** | Node.js + pnpm | Node 18+, pnpm 10.4+ |
| **Deploy FE** | Vercel | Auto-deploy su master |
| **Deploy BE** | Hetzner VPS + PM2 | 157.90.29.66 |
| **Moduli** | ESM (`"type": "module"`) | |

### Cosa NON usare (MAI)
- NON React Router, NON Next.js → usa **Wouter**
- NON Redux, NON Zustand → usa **React Context + React Query**
- NON Material UI, NON Chakra → usa **shadcn/ui**
- NON CSS Modules, NON styled-components → usa **Tailwind CSS**
- NON `pg` (node-postgres) → usa **`postgres`** (postgres-js)
- NON endpoint Express separati → usa **tRPC**
- NON raw SQL in produzione → usa **Drizzle ORM**

---

## 3. STRUTTURA DEL PROGETTO

```
/
├── CLAUDE.md               # ← LEGGI QUESTO PRIMA DI TUTTO
├── client/src/
│   ├── App.tsx              # Tutte le rotte (28 route in <Switch> Wouter)
│   ├── main.tsx             # Entry point (provider stack, tRPC client)
│   ├── components/          # 150+ componenti
│   │   ├── ui/              # 66+ componenti shadcn/ui (NON modificare)
│   │   ├── ProtectedTab.tsx # Wrapper RBAC per tab
│   │   ├── ImpersonationBanner.tsx
│   │   ├── GestioneMercati.tsx    # 202KB - gestione mercati
│   │   ├── ControlliSanzioniPanel.tsx # 163KB - controlli
│   │   ├── ComuniPanel.tsx        # 119KB - gestione comuni
│   │   └── ...
│   ├── pages/               # Pagine (DashboardPA e' la principale ~383KB)
│   ├── contexts/            # 7 React Context providers
│   │   ├── FirebaseAuthContext.tsx  # Auth Firebase + bridge legacy
│   │   ├── PermissionsContext.tsx   # RBAC engine
│   │   ├── MioContext.tsx           # Chat AI con MIO
│   │   ├── ThemeContext.tsx         # Dark/light mode
│   │   ├── TransportContext.tsx     # Dati mobilita'
│   │   ├── AnimationContext.tsx     # Animazioni
│   │   └── CivicReportsContext.tsx  # Segnalazioni
│   ├── hooks/               # Custom hooks
│   │   ├── useImpersonation.ts     # Impersonazione per comune
│   │   ├── usePermissions (da PermissionsContext)
│   │   └── ...
│   ├── api/                 # Client API (orchestrator, auth, logs)
│   └── lib/                 # Utilities (trpc.ts, firebase.ts)
│
├── server/
│   ├── _core/
│   │   ├── index.ts         # Entry point Express + tRPC + middleware
│   │   ├── trpc.ts          # Definizione procedure (public/protected/admin)
│   │   ├── context.ts       # Context creation (estrae user da cookie)
│   │   ├── oauth.ts         # OAuth SPID/CIE callback
│   │   ├── env.ts           # Variabili ambiente tipizzate
│   │   └── cookies.ts       # Cookie options
│   ├── routers.ts           # ← REGISTRY: tutti i router tRPC
│   ├── db.ts                # Connessione DB + query helpers
│   ├── dmsHubRouter.ts      # Mercati, posteggi, operatori, concessioni
│   ├── walletRouter.ts      # Borsellino + PagoPA
│   ├── integrationsRouter.ts
│   ├── mihubRouter.ts       # Multi-agente
│   ├── mioAgentRouter.ts    # Log agenti AI
│   ├── guardianRouter.ts    # Monitoring
│   ├── firebaseAuthRouter.ts
│   └── services/            # TPER, E-FIL PagoPA, API logs
│
├── drizzle/
│   └── schema.ts            # ← SOURCE OF TRUTH per il DB (tutte le tabelle)
│
├── shared/                  # Costanti condivise frontend/backend
├── scripts/                 # Utility (health-check, db-maintenance, seed)
├── docs/                    # Documentazione per dominio
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── OPERATIONS.md
│   └── SCALING.md
└── .mio-agents/             # Config agenti AI
```

---

## 4. COME FUNZIONA L'APP (Flusso completo)

### Provider Stack (ordine di nesting in App.tsx)
```
ErrorBoundary
  └── ThemeProvider (dark mode default, teal #14b8a6)
    └── FirebaseAuthProvider (auth state + bridge legacy DB)
      └── AnimationProvider
        └── MioProvider (chat AI)
          └── PermissionsProvider (RBAC - carica permessi dal ruolo)
            └── TransportProvider (dati mobilita')
              └── TooltipProvider
                └── Router (Wouter <Switch>)
                  └── ChatWidget (chat AI floating)
                  └── Toaster (notifiche Sonner)
```

### Flusso di una richiesta API
```
Browser → tRPC client (httpBatchLink + superjson)
  → GET/POST /api/trpc/router.procedure
  → Express middleware (body parse 50MB, monitoring)
  → tRPC adapter → Context creation (cookie JWT → user)
  → Logging middleware (traccia durata + status)
  → Auth check (public / protected / admin)
  → Handler → Drizzle ORM → PostgreSQL (Neon)
  → Response (superjson)
  → Metrica salvata in api_metrics (automatico)
```

### Flusso di autenticazione
```
1. Login Firebase (Google/Apple/Email) o SPID/CIE (OAuth ARPA Toscana)
2. Firebase ritorna ID token
3. Backend verifica token → crea/aggiorna utente nel DB
4. Backend setta cookie JWT di sessione (1 anno)
5. Frontend fa bridge con legacy DB (orchestratore.mio-hub.me)
   → carica: miohubId, impresaId, walletBalance, assigned_roles
6. PermissionsContext carica permessi dal ruolo
7. ProtectedTab/ProtectedQuickAccess filtrano la UI
```

### Connessione Database
```typescript
// server/db.ts - Pattern OBBLIGATORIO
const db = await getDb();  // Lazy singleton, ritorna null se DB non disponibile
if (!db) return [];        // SEMPRE gestire il caso null

// Neon serverless: si spegne dopo 5 min inattivita'
// Cold start: 2-3 secondi. Il sistema ritenta automaticamente.
```

---

## 5. SISTEMA RBAC (Role-Based Access Control)

### Come funziona

L'app ha UN solo indirizzo web. Ogni utente vede funzionalita' diverse
in base al suo ruolo. Il sistema e' composto da 4 tabelle:

```
users
  ↓
user_role_assignments (user_id, role_id, territory_type, territory_id)
  ↓
user_roles (code, sector, level)
  ↓
role_permissions (role_id, permission_id, scope_type)
  ↓
permissions (module, action)
```

### Settori e livelli
| Settore | Ruoli | Livello |
|---------|-------|---------|
| sistema | super_admin, admin | 0-10 |
| pa | admin_pa, operatore, viewer | 20-40 |
| mercato | manager, operatore | 50-60 |
| impresa | owner, dipendente | 70-80 |
| esterno | fornitore, partner | 85-90 |
| pubblico | cittadino, ospite | 99 |

### Risoluzione del ruolo (priorita')
Il `PermissionsContext` determina il ruolo cosi':
1. **Impersonazione attiva** (`?impersonate=true`) → admin_pa (ID=2)
2. **assigned_roles[0]** dall'utente in localStorage → usa quel role_id
3. **Email super admin** (chcndr@gmail.com) o flag is_super_admin → super_admin (ID=1)
4. **base_role === 'admin'** → admin_pa (ID=2)
5. **Default** → cittadino (ID=13, nessun permesso admin)

### Formato permessi
```
tab.view.{tabId}        → visibilita' tab nella DashboardPA
quick.view.{quickId}    → accesso rapido nella sidebar
modulo.azione           → operazioni (es. dmsHub.markets.read)
```

### Tab DashboardPA (14+ tab protetti)
```tsx
// Ogni tab e' wrappato cosi':
<ProtectedTab tabId="security">
  <TabsTrigger value="security">Sicurezza</TabsTrigger>
</ProtectedTab>

// ProtectedTab internamente chiama:
// canViewTab("security") → cerca "tab.view.security" nei permessi caricati
```

| Tab ID | Nome | Visibile durante impersonazione? |
|--------|------|----------------------------------|
| dashboard | Overview | Si |
| mercati | Mercati | Si |
| imprese | Imprese | Si |
| commercio | Commercio | Si |
| wallet | Wallet | Si |
| hub | Hub | Si |
| controlli | Controlli | Si |
| comuni | Comuni | **No** |
| security | Sicurezza (RBAC) | **No** |
| sistema | Sistema | **No** |
| ai | MIO Agent | **No** |
| integrations | Integrazioni | **No** |
| reports | Report | **No** |
| workspace | Workspace | **No** |

### Scope dei permessi
I permessi possono avere uno scope che limita l'accesso:
- `all` → accesso globale
- `territory` → solo il territorio assegnato (regione/provincia/comune)
- `market` → solo il mercato assegnato
- `own` → solo le proprie risorse
- `delegated` → risorse delegate da un altro utente
- `none` → nessun accesso

---

## 6. IMPERSONAZIONE PER COMUNE

Il super admin puo' "vedere l'app come" un PA di un comune specifico.

### Come si attiva
```
URL: /dashboard-pa?impersonate=true&comune_id=96&comune_nome=Grosseto&user_email=mario@grosseto.it
```

### Cosa succede
1. `useImpersonation()` legge i params URL → salva in `sessionStorage['miohub_impersonation']`
2. `PermissionsContext` rileva l'impersonazione → carica permessi di admin_pa (ID=2)
3. `DashboardPA` nasconde i tab sensibili (security, sistema, ai, integrations, comuni, reports, workspace)
4. `ImpersonationBanner` mostra un banner giallo: "Stai visualizzando come: Grosseto"
5. `useImpersonation().getFetchOptions()` aggiunge header `X-Comune-Id` a tutte le API
6. Tutte le azioni sono registrate nell'audit log

### Persistenza
- `sessionStorage` → sopravvive alla navigazione tra pagine
- Muore quando il tab del browser viene chiuso
- `endImpersonation()` → pulisce sessionStorage e URL params

### File coinvolti
- `client/src/hooks/useImpersonation.ts` → hook e funzioni standalone
- `client/src/components/ImpersonationBanner.tsx` → banner visuale
- `client/src/contexts/PermissionsContext.tsx` → rilevazione impersonazione
- `client/src/pages/DashboardPA.tsx` → tab filtering

---

## 7. ROUTER tRPC (Backend)

Tutti gli endpoint passano per tRPC. Registry in `server/routers.ts`.

| Router | Prefisso | Cosa fa |
|--------|----------|---------|
| system | system.* | Health check |
| auth | auth.* | Login/logout, sessione corrente (`auth.me`) |
| analytics | analytics.* | Overview, markets, shops, transactions, checkins |
| dmsHub | dmsHub.* | Mercati, posteggi, operatori, concessioni, presenze, ispezioni |
| wallet | wallet.* | Borsellino operatori, ricariche, PagoPA, avvisi |
| integrations | integrations.* | API keys, webhooks, connessioni, stats |
| mihub | mihub.* | Multi-agente: tasks, projects, brain, messages |
| mioAgent | mioAgent.* | Log agenti AI (326K+ righe) |
| guardian | guardian.* | Monitoring: endpoints, logs, debug |
| tper | tper.* | Integrazione trasporto TPER Bologna |
| logs | logs.* | System logs |
| carbonCredits | carbonCredits.* | Crediti carbonio TCC |
| users | users.* | Analytics utenti |
| sustainability | sustainability.* | Metriche sostenibilita' |
| businesses | businesses.* | Analytics business |
| inspections | inspections.* | Lista ispezioni |
| notifications | notifications.* | Lista notifiche |
| civicReports | civicReports.* | Segnalazioni civiche |
| mobility | mobility.* | Dati mobilita' |

### 3 livelli di accesso
```typescript
publicProcedure     // Chiunque (con logging automatico)
protectedProcedure  // Solo utenti autenticati (ctx.user required)
adminProcedure      // Solo admin (ctx.user.role === 'admin')
```

---

## 8. DATABASE

### Connessione
- **Provider**: Neon PostgreSQL serverless (EU Frankfurt)
- **Driver**: `postgres` (postgres-js) — **NON** `pg`
- **ORM**: Drizzle 0.44
- **Source of truth**: `drizzle/schema.ts`
- **Cold start**: 2-3 secondi dopo 5 min inattivita'

### Tabelle principali per dominio

**Mercati & Operazioni (core business)**
- `markets` (~60 righe) — Mercati con coordinate e orari
- `market_geometry` (~12) — GeoJSON per mappa
- `stalls` (~900) — Posteggi (numero, area, stato, categoria)
- `vendors` (~150) — Operatori ambulanti (anagrafica, P.IVA, ATECO)
- `concessions` (~80) — Concessioni (tipo, date, stato, tariffa)
- `vendor_presences` (~1000) — Check-in/out giornalieri
- `vendor_documents` (~200) — Documenti operatori
- `autorizzazioni` (~40) — Licenze commerciali
- `comuni` (~50) — Anagrafica comuni

**Wallet & Pagamenti**
- `operatore_wallet` (~80) — Borsellini (saldo, stato, totali)
- `wallet_transazioni` (~500) — Transazioni (ricarica, decurtazione, rimborso)
- `avvisi_pagopa` (~30) — Avvisi di pagamento PagoPA con IUV
- `tariffe_posteggio` (~20) — Tariffe per tipo posteggio

**Autenticazione & RBAC (11 tabelle)**
- `users` (~50) — Utenti core
- `user_roles` — Definizioni ruoli (settore, livello)
- `permissions` — Permessi granulari (modulo.azione)
- `role_permissions` — Matrice ruolo-permesso con scope
- `user_role_assignments` — Assegnazione ruoli con territorio
- `user_sessions`, `access_logs`, `security_events`, `login_attempts`, `ip_blacklist`, `compliance_certificates`, `security_delegations`

**Multi-Agent System**
- `agent_tasks` — Coda task per agenti AI
- `agent_messages` — Chat tra agenti
- `agent_brain` — Memoria agenti (key-value con TTL)
- `agent_context` — Contesto condiviso
- `mio_agent_logs` (~326K righe, 88% del DB!) — Log azioni agenti

**Monitoring**
- `api_metrics` (~5K) — Performance API (endpoint, tempo, status)
- `system_logs` (~2K) — Log di sistema

### Convenzioni DB
- Tabelle: `snake_case` → Codice TS: `camelCase` (Drizzle mappa automaticamente)
- ID: `integer().generatedAlwaysAsIdentity().primaryKey()`
- Timestamp: `timestamp().defaultNow().notNull()`
- Booleani: `integer` (0/1) per compatibilita' oppure `boolean`
- JSON: salvato come `text`, parsato manualmente
- Soldi: `integer` in centesimi (150 = 1.50 EUR)
- Coordinate: `varchar(20)` per precisione

---

## 9. INTEROPERABILITA' DMS LEGACY (Heroku)

### Visione Strategica

**MioHub e' il CERVELLO** — elabora, decide, autorizza. Si connette a SUAP, PagoPA, PDND, ANPR.
Gestisce login imprese (SPID/CIE), concessioni, canone, more, mappa GIS, wallet TCC, controlli SCIA.

**DMS Legacy e' il BRACCIO** — opera sul campo, raccoglie dati grezzi.
L'app tablet registra presenze fisiche, uscite, deposito spazzatura, scelte alla spunta.

| Ruolo | Sistema | Cosa fa |
|-------|---------|---------|
| **CERVELLO** | MioHub | Login SPID/CIE, SUAP, PagoPA, PDND, concessioni, canone, mappa GIS, wallet, controlli, verbali |
| **BRACCIO** | DMS Legacy | App tablet spunta, presenze fisiche, uscite, spazzatura, scelte spunta |

### Architettura DMS Legacy

| Componente | Dettagli |
|------------|---------|
| **Piattaforma** | Heroku (app `lapsy-dms`) |
| **URL Gestionale** | `https://lapsy-dms.herokuapp.com/index.html` |
| **Credenziali Gestionale** | `checchi@me.com` / `Dms2022!` (accesso frontend) |
| **Backend** | Node.js + Express — thin layer sopra stored functions |
| **Database** | PostgreSQL su AWS RDS (eu-west-1) — 25 tabelle, 117 stored functions |
| **Real-time** | Socket.IO namespace `/ac.mappe` per aggiornamento mappe tablet |
| **Pattern** | Ogni API chiama una stored function: `Express → SELECT funzione(json) → PostgreSQL` |
| **CRUD** | Funzioni `_crup`: se ID e' NULL → INSERT, se valorizzato → UPDATE |

### Flusso Dati Bidirezionale

**MioHub → Legacy (76% dei dati — NOI DIAMO A LORO):**
- Anagrafica imprese (`amb_ragsoc`, `amb_piva`, `amb_cfisc`...)
- Saldo wallet (`amb_saldo_bors`)
- Punteggio graduatoria (`amb_punti_grad_dfl`)
- Mercati, posteggi con mappa, concessioni
- Autorizzazioni spunta, utenti/operatori
- Regolarita' impresa (calcolata da 23 controlli SCIA)

**Legacy → MioHub (11% — RICEVIAMO DA LORO):**
- Presenza ingresso/uscita (time)
- Deposito spazzatura (boolean)
- Presenza rifiutata (boolean)
- Note operatore, prezzo calcolato
- Giornata mercato (sessione)
- Posti scelti alla spunta

### Flusso Giornata Mercato

| Fase | Cosa succede | Chi lo fa |
|------|-------------|-----------|
| **0** | Sync preventivo: MioHub manda dati aggiornati | MioHub → Legacy |
| **1** | Apertura mercato dalla Dashboard PA | MioHub → Legacy |
| **2** | Arrivo concessionari: operatore tablet registra ingresso | Legacy → MioHub |
| **3** | Preparazione spunta: conta assenze, posti liberi | MioHub → Legacy |
| **4** | Spunta: spuntisti scelgono posti dall'app tablet | Legacy → MioHub |
| **5** | Durante mercato: operatore registra spazzatura | Legacy → MioHub |
| **6** | Chiusura: uscite + Dashboard chiude giornata | Legacy → MioHub |
| **7** | Post-mercato: CRON controlla orari, genera verbali | Solo MioHub |

### Campi di Interoperabilita' nel DB Neon

| Tabella | Colonna | Scopo |
|---------|---------|-------|
| `imprese` | `legacy_amb_id` | Map a ambulante Legacy |
| `imprese` | `fido` | Fido impresa (credito) |
| `markets` | `legacy_mkt_id` | Map a mercato Legacy |
| `stalls` | `legacy_pz_id` | Map a piazzola Legacy |
| `concessions` | `legacy_conc_id` | Map a concessione Legacy |
| `vendor_presences` | `legacy_pre_id` | Map a presenza Legacy |
| `vendor_presences` | `rifiutata` | Flag rifiuto |

### Endpoint Legacy Implementati

Prefisso: `/api/integrations/dms-legacy/`

| Metodo | Endpoint | Stato |
|--------|----------|-------|
| GET | `/markets` | Attivo |
| GET | `/vendors` | Attivo |
| GET | `/concessions` | Attivo |
| GET | `/presences/:marketId` | Attivo |
| GET | `/market-sessions/:marketId` | Attivo |
| GET | `/stalls/:marketId` | Attivo |
| GET | `/spuntisti` | Attivo |
| GET | `/documents` | Attivo |
| GET | `/stats` | Attivo |
| GET | `/health` | Attivo |
| GET | `/status` | Attivo |
| POST | `/sync` | Attivo |
| POST | `/cron-sync` | Attivo (ogni 60 min) |
| POST | `/sync-out/*` | Da implementare |
| POST | `/sync-in/*` | Da implementare |

### Presenze (delegata al Legacy)

La pagina `/app/impresa/presenze` carica il DMS Legacy in un iframe:
- URL primario: `https://dms.associates/wp-admin/images/DMSAPP/#/login`
- Fallback: `https://lapsy-dms.herokuapp.com/index.html`

---

## 10. BUS HUB E TRASPORTO PUBBLICO

### Bus Hub Editor (Digitalizzazione Mercati)

Il BusHubEditor e' il workflow per digitalizzare un mercato in 2 step:

**Step 1 — PngTransparentTool**: Rimuove lo sfondo dalla planimetria del mercato
- Upload immagine/PDF della planimetria
- Filtro colore HSV per rimuovere sfondo
- Esporta PNG con trasparenza

**Step 2 — SlotEditorV3**: Posiziona posteggi sulla mappa georeferenziata
- OpenStreetMap + Leaflet
- Drag-and-drop dei posteggi con rotazione e dimensioni
- Marker per servizi (ingressi, bagni, cassonetti)
- Aree poligonali per zone
- Overlay della planimetria trasparente
- Esporta GeoJSON per il database

**Comunicazione tra step**: `dmsBus.ts` — IndexedDB + localStorage per persistenza.
**Hosting editor tools**: `orchestratore.mio-hub.me/tools/bus_hub.html` e `slot_editor_v3_unified.html`

### Trasporto Pubblico (GTFS + TPER)

Il sistema integra i dati del trasporto pubblico per mostrare fermate vicino ai mercati.

**Fonti dati:**
- TPER Bologna (fermate bus) — OpenData Bologna
- Trenitalia (stazioni treni)
- Tiemme (bus regionali)
- **23.930 fermate GTFS** nel database

**API esterna**: `https://api.mio-hub.me/api/gtfs/*`
- `GET /stops?type=bus&limit=5000` — Lista fermate
- `GET /stops/nearby?lat=X&lon=Y&radius=2` — Fermate vicine
- `GET /stats` — Statistiche GTFS

**TPER real-time**: SOAP API `hellobuswsweb.tper.it` per arrivi in tempo reale

**Componenti frontend:**
- `TransportContext.tsx` — Context provider con stato GTFS
- `TransportStopsLayer.tsx` — Layer Leaflet con fermate sulla mappa
- `TransportLayerToggle.tsx` — Toggle mostra/nascondi fermate
- `NearbyStopsPanel.tsx` — Pannello laterale fermate vicine (distanza + tempo a piedi)
- `MapWithTransportLayer.tsx` — Wrapper mappa con layer trasporto

**Tabella DB**: `mobility_data` — fermate, linee, arrivi, occupancy

---

## 11. INFRASTRUTTURA COMPLETA

```
┌──────────────────────────────────────────────────────┐
│  BROWSER                                              │
│  dms-hub-app-new.vercel.app                          │
│  (SPA React, CDN Vercel Edge)                        │
└──────────┬────────────────┬──────────────┬───────────┘
           │ tRPC            │ REST          │ iframe
           ▼                 ▼               ▼
┌────────────────┐  ┌────────────────┐  ┌──────────────────┐
│  HETZNER VPS   │  │  ORCHESTRATORE │  │  DMS LEGACY      │
│  157.90.29.66  │  │  orchestratore │  │  Heroku           │
│  mihub.nip.io  │  │  .mio-hub.me   │  │  lapsy-dms       │
│  Express+tRPC  │  │  Multi-agent   │  │  App tablet       │
│  PM2           │  │  REST backend  │  │  Presenze campo   │
└──────┬─────────┘  └───────┬────────┘  └──────┬───────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│  NEON        │  │  FIREBASE    │  │  AWS RDS PostgreSQL  │
│  PostgreSQL  │  │  Auth        │  │  DB Legacy (eu-west) │
│  Serverless  │  │  dmshub-auth │  │  25 tab, 117 stored  │
│  149 tabelle │  │  -2975e      │  │  functions           │
└──────────────┘  └──────────────┘  └──────────────────────┘
                                           ↑
                                    ┌──────────────┐
                                    │  TABLET/APP  │
                                    │  Operatori   │
                                    │  sul campo   │
                                    │  (colonnina) │
                                    └──────────────┘
```

---

## 12. COMANDI ESSENZIALI

```bash
pnpm dev              # Dev server con hot reload
pnpm build            # Build frontend (Vite) + backend (esbuild)
pnpm start            # Avvia in produzione
pnpm check            # TypeScript type check (tsc --noEmit)
pnpm test             # Test con vitest
pnpm format           # Prettier
pnpm db:push          # Genera + applica migrazioni Drizzle
pnpm docs:update      # Sincronizza docs API + blueprint
```

---

## 13. COME AGGIUNGERE UNA FEATURE

1. **Schema**: Aggiungi tabella in `drizzle/schema.ts`
2. **Migrazione**: `pnpm db:push`
3. **Query**: Funzione in `server/db.ts` con pattern `getDb()` + null check
4. **Router tRPC**: Procedure nel router appropriato (o nuovo → registra in `server/routers.ts`)
5. **Frontend**: `trpc.routerName.procedureName.useQuery()` o `.useMutation()`
6. **UI**: shadcn/ui + Tailwind, rispetta dark mode (teal #14b8a6)
7. **Permessi**: Se serve RBAC, aggiungi permesso in `permissions` e assegna al ruolo
8. **Test**: `pnpm check` (types) + `pnpm test`

---

## 14. COME FIXARE UN BUG

1. **Identifica** il file e la riga
2. **Leggi** il codice circostante
3. **Fix** con la modifica MINIMA necessaria
4. **Verifica** con `pnpm check`
5. **NON** aggiungere feature, refactoring o "miglioramenti"

---

## 15. REGOLE INVIOLABILI (riassunto)

| Area | Regola |
|------|--------|
| DB | Source of truth: `drizzle/schema.ts`. MAI raw SQL. MAI DROP TABLE |
| DB | Driver: `postgres` (postgres-js). MAI `pg` |
| API | Tutto passa per tRPC. MAI endpoint Express separati |
| API | Validazione input con Zod. Logging automatico |
| Frontend | Router: Wouter. State: React Context. UI: shadcn/ui. CSS: Tailwind |
| Auth | Firebase primario. Cookie JWT. RBAC con 4 tabelle |
| Codice | TypeScript strict. ESM modules. Path aliases: `@/` e `@shared/` |
| Deploy | FE: Vercel auto-deploy. BE: Hetzner PM2 |
| Sicurezza | MAI salvare segreti nel codice. MAI push su master senza review |
| RBAC | MAI modificare impersonazione senza test su tutti i ruoli |

---

## 16. ERRORI COMUNI E SOLUZIONI

| Errore | Causa | Soluzione |
|--------|-------|----------|
| "Connection terminated due to connection timeout" | Neon cold start (5 min inattivita') | Ritenta dopo 3 sec. Il lazy getDb() gestisce il retry |
| Tabella non trovata | Non in schema.ts o non migrata | Aggiungi in `drizzle/schema.ts`, poi `pnpm db:push` |
| CORS error | URL diretto invece di tRPC | Usa `/api/trpc/` — mai URL diretti |
| `any` type error | Tipo non importato | Importa da `drizzle/schema.ts` |
| Import non trovato | Path sbagliato | `@/` per frontend, import relativo per backend |
| Firebase auth fallisce | Env vars mancanti | Verifica `VITE_FIREBASE_*` in `.env` |
| PM2 restart loop | Errore fatale backend | `pm2 logs --lines 100` su Hetzner |
| Tab non visibile | Permesso mancante | Verifica `tab.view.{tabId}` nel ruolo |
| Impersonazione non funziona | URL params incompleti | Servono tutti: impersonate, comune_id, comune_nome |

---

## 17. FILE DI DOCUMENTAZIONE

| File | Cosa contiene |
|------|--------------|
| `CLAUDE.md` | Guida operativa rapida per agenti (LEGGI PRIMA) |
| `CONTESTO.md` | QUESTO FILE — contesto completo per chi non sa niente |
| `docs/ARCHITECTURE.md` | Architettura dettagliata (layer, flussi, RBAC, deploy) |
| `docs/DATABASE.md` | Schema DB, convenzioni, regole, tabella per tabella |
| `docs/API.md` | Registro endpoint tRPC con auth level e convenzioni |
| `docs/OPERATIONS.md` | Deploy, monitoring, troubleshooting, PM2, backup |
| `docs/SCALING.md` | Piano 4 fasi per scalare a 8.000 mercati |
| `.env.example` | Template variabili ambiente documentato |
| `scripts/health-check.sh` | Health check automatico di tutti i servizi |
| `scripts/db-maintenance.sh` | Pulizia DB, retention log, diagnostica |

---

## 18. CREDENZIALI E ACCESSI

### Accessi Principali

| Risorsa | URL | Note |
|---------|-----|------|
| **Frontend** | dms-hub-app-new.vercel.app | Vercel auto-deploy |
| **Backend Hetzner** | mihub.157-90-29-66.nip.io | PM2 + Express |
| **Orchestratore** | orchestratore.mio-hub.me | REST legacy backend |
| **DMS Legacy** | lapsy-dms.herokuapp.com | Credenziali: `checchi@me.com` / `Dms2022!` |
| **Neon DB** | console.neon.tech | PostgreSQL serverless |
| **Firebase** | console.firebase.google.com | Progetto: dmshub-auth-2975e |
| **Hetzner VPS** | SSH 157.90.29.66 | Solo emergenze, con chiave |
| **Vercel** | vercel.com/dashboard | Deploy frontend |
| **GitHub** | github.com/Chcndr | Repository |

### Variabili d'Ambiente Backend Hetzner (31)

**DATABASE (9)**
```
DATABASE_URL              # Connection string principale Neon
NEON_POSTGRES_URL         # URL Neon alternativa
POSTGRES_URL              # URL PostgreSQL generica
DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_SSL, DB_USER
```

**AUTH/SECURITY (2)**
```
JWT_SECRET                # Secret per token JWT
MIOHUB_SECRETS_KEY        # Chiave crittografia secrets
```

**API KEYS (5)**
```
GEMINI_API_KEY            # Google Gemini AI
MANUS_API_KEY             # Manus AI
MERCAWEB_API_KEY          # MercaWeb (Abaco)
ZAPIER_API_KEY            # Zapier automazioni
ZAPIER_NLA_API_KEY        # Zapier NLA (deprecato)
```

**GITHUB (3)**
```
GITHUB_PAT_DMS            # PAT per repo DMS
GITHUB_PERSONAL_ACCESS_TOKEN
GITHUB_TOKEN              # Token per GPT Dev
```

**SERVER (6)**
```
BASE_URL                  # URL base backend
CORS_ORIGINS              # Origini CORS
LOG_FILE                  # Path file log
MIO_HUB_BASE              # URL base MIO Hub
NODE_ENV                  # production
PORT                      # Porta server
```

**FEATURES (5)**
```
ENABLE_AGENT_LOGS         # Abilita log agenti AI
ENABLE_GUARDIAN_LOOP       # Abilita loop Guardian
ENABLE_MIO_CHAT           # Abilita chat MIO
ENABLE_SECRETS_SYNC       # Sync secrets
ORCHESTRATOR_ENABLED      # Abilita orchestratore
```

**BLUEPRINT (1)**
```
BLUEPRINT_REPO            # Repo GitHub per blueprint sync
```

### Variabili d'Ambiente Frontend (Vercel, 7)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
FIREBASE_SERVICE_ACCOUNT_KEY   # Backend Vercel serverless (JSON)
```

### Autoheal Script (Cron ogni 15 min)

Il server Hetzner ha un cron job che controlla e riavvia il backend se down:
```
*/15 * * * * /root/mihub-backend-rest/scripts/autoheal.sh
```
Log: `/var/log/mio-autoheal.log`

---

## 19. CHECKLIST PRE-COMMIT

- [ ] `pnpm check` passa senza errori
- [ ] Nessun `console.log` di debug
- [ ] Schema DB aggiornato se hai aggiunto tabelle/colonne
- [ ] Nessun segreto o credenziale nel codice
- [ ] Nuove route tRPC registrate in `server/routers.ts`
- [ ] Nuove pagine registrate in `client/src/App.tsx`
- [ ] Permessi RBAC aggiunti se necessari
- [ ] Test impersonazione se hai toccato il sistema RBAC
