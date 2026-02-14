# CLAUDE.md - Guida Operativa per Agenti AI

> Questo file e' il punto di ingresso obbligatorio per ogni agente (Claude, Manus, GPT, Gemini, etc.)
> che lavora su questo repository. Leggilo PRIMA di fare qualsiasi cosa.

## Cosa e' questo sistema

**DMS Hub** (Digital Market System Hub) e' una piattaforma per la gestione digitale dei mercati
ambulanti italiani. Gestisce mercati, posteggi, operatori, concessioni, pagamenti PagoPA,
mobilita' e monitoraggio. Il sistema e' progettato per scalare a **8.000 mercati**.

**Stack tecnologico:**
- Frontend: React 19 + Vite 7 + Wouter + Tailwind 4 + shadcn/ui
- Backend: Express 4 + tRPC 11 + Drizzle ORM 0.44
- Database: PostgreSQL su Neon (serverless)
- Auth: Firebase + OAuth (SPID/CIE/CNS)
- Runtime: Node.js 18+ / pnpm 10.4+

## Comandi essenziali

```bash
# Sviluppo
pnpm dev                    # Avvia dev server con hot reload (tsx watch)
pnpm build                  # Build frontend (Vite) + backend (esbuild)
pnpm start                  # Avvia in produzione

# Verifica
pnpm check                  # TypeScript type check (tsc --noEmit)
pnpm test                   # Esegui test (vitest)
pnpm format                 # Prettier

# Database
pnpm db:push                # Genera e applica migrazioni Drizzle

# Documentazione
pnpm docs:update            # Sincronizza docs API + blueprint
```

## Struttura del progetto

```
/
├── client/src/             # Frontend React (componenti, pagine, hooks, contexts)
│   ├── components/         # Componenti UI (GestioneMercati, WalletPanel, etc.)
│   ├── pages/              # Pagine (DashboardPA e' la principale)
│   ├── contexts/           # State management (Firebase Auth, Permissions, MIO)
│   ├── api/                # Client API (orchestrator, auth, logs)
│   ├── hooks/              # Custom hooks (useAuth, usePermissions, etc.)
│   └── lib/                # Utilities (trpc client, firebase config)
├── server/                 # Backend Express + tRPC
│   ├── _core/              # Core: index.ts (entry), trpc.ts, oauth.ts, env.ts
│   ├── services/           # Servizi: TPER, E-FIL PagoPA, API logs
│   ├── routers.ts          # Router principale tRPC (appRouter)
│   ├── db.ts               # Connessione DB + query helpers
│   ├── dmsHubRouter.ts     # Mercati, posteggi, operatori, concessioni
│   ├── walletRouter.ts     # Borsellino elettronico + PagoPA
│   ├── integrationsRouter.ts # API keys, webhooks, monitoring
│   ├── mihubRouter.ts      # Sistema multi-agente
│   ├── mioAgentRouter.ts   # Log agenti AI
│   └── guardianRouter.ts   # Monitoring e debug
├── drizzle/                # Schema DB (schema.ts = source of truth)
│   └── schema.ts           # Tutte le definizioni delle tabelle
├── shared/                 # Costanti e tipi condivisi frontend/backend
├── migrations/             # Migrazioni SQL manuali
├── scripts/                # Script di utility e manutenzione
├── docs/                   # Documentazione dettagliata per dominio
└── .mio-agents/            # Configurazione agenti AI
```

## REGOLE INVIOLABILI

### 1. Database

- **Schema source of truth**: `drizzle/schema.ts` - MAI creare tabelle direttamente via SQL
- **ORM obbligatorio**: Usa sempre Drizzle ORM, mai raw SQL (tranne per migrazioni)
- **Connessione lazy**: La connessione DB e' in `server/db.ts` via `getDb()` - e' singleton e lazy
- **Driver**: `postgres` (postgres-js) - NON `pg` - sono driver diversi
- **Neon serverless**: Il DB si spegne dopo 5 min di inattivita'. Gestisci i timeout
- **Naming convention**: Tabelle in `snake_case`, colonne in `camelCase` nel codice TypeScript
- **MAI droppare tabelle** in produzione senza backup e approvazione esplicita
- **MAI modificare colonne esistenti** che contengono dati - aggiungi nuove colonne

### 2. API

- **Tutte le API passano per tRPC**: Endpoint base `/api/trpc/{router.procedure}`
- **Router registry**: Ogni nuovo router va registrato in `server/routers.ts`
- **Procedure types**: `publicProcedure` (aperta), `protectedProcedure` (auth), `adminProcedure` (admin)
- **Validazione**: Usa sempre Zod per input validation nelle procedure tRPC
- **Logging automatico**: Ogni chiamata viene loggata in `api_metrics` automaticamente
- **MAI creare endpoint Express separati** - usa sempre tRPC
- **SuperJSON**: Il transformer gestisce Date, BigInt, etc. - non serializzare manualmente

### 3. Frontend

- **Router**: Wouter (NON React Router, NON Next.js)
- **State**: React Context + React Query (via tRPC) - NON Redux, NON Zustand
- **UI components**: shadcn/ui (in `client/src/components/ui/`) - NON Material UI, NON Chakra
- **Styling**: Tailwind CSS 4 - NON CSS modules, NON styled-components
- **Icons**: Lucide React - NON altre librerie di icone
- **Theme**: Dark mode di default (colore primario: teal #14b8a6)
- **Rotte**: Definite in `client/src/App.tsx` con `<Switch>` di Wouter
- **Nuove pagine**: Aggiungi in `client/src/pages/` e registra la rotta in `App.tsx`

### 4. Autenticazione

- **Firebase** e' il provider primario (progetto `dmshub-auth-2975e`)
- **OAuth/SPID** via callback in `server/_core/oauth.ts`
- **Session**: Cookie JWT (`session`) con scadenza 1 anno
- **RBAC**: Ruoli in `user_roles`, permessi in `permissions`, mapping in `role_permissions`
- **Context**: `FirebaseAuthContext` sul frontend, `ctx.user` nel backend tRPC

### 5. Codice

- **TypeScript strict** obbligatorio - mai `any` tranne che per i tipi esterni
- **ESM modules** (`"type": "module"` in package.json)
- **Path aliases**: `@/` = `client/src/`, `@shared/` = `shared/`
- **Formatter**: Prettier (esegui `pnpm format` prima di committare)
- **Import pattern**: Dynamic imports per le funzioni DB nei router (vedi `routers.ts`)
- **MAI duplicare logica** - se esiste gia' una funzione, usala
- **MAI creare file .md** di documentazione senza richiesta esplicita

### 6. Deploy

- **Frontend**: Vercel (auto-deploy su push a master)
- **Backend**: Hetzner VPS `157.90.29.66` con PM2
- **DB**: Neon PostgreSQL (serverless, regione EU)
- **MAI pushare direttamente su master** senza review
- **MAI modificare la configurazione PM2** senza backup
- **MAI toccare `.env` in produzione** senza documentare il cambio

## Infrastruttura

| Servizio | URL | Dettagli |
|----------|-----|----------|
| Frontend | dms-hub-app-new.vercel.app | Vercel auto-deploy |
| Backend tRPC | mihub.157-90-29-66.nip.io | Hetzner + PM2 |
| Orchestratore | orchestratore.mio-hub.me | Legacy REST backend |
| DB Neon | ep-bold-silence-adftsojg | PostgreSQL serverless |
| Firebase | dmshub-auth-2975e | Auth provider |

## Variabili d'ambiente richieste

### Backend (server)
```
DATABASE_URL          # PostgreSQL connection string (Neon)
JWT_SECRET            # Chiave per firmare i token di sessione
VITE_APP_ID           # OAuth app identifier
OAUTH_SERVER_URL      # URL del server OAuth Manus
OWNER_OPEN_ID         # OpenID dell'utente admin
BUILT_IN_FORGE_API_URL # Forge API endpoint
BUILT_IN_FORGE_API_KEY # Forge API key
```

### Frontend (VITE_*)
```
VITE_TRPC_URL         # URL del backend tRPC
VITE_API_URL          # URL base API
VITE_FIREBASE_API_KEY # Firebase Web API Key
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
```

## Flusso di una nuova feature

1. **Schema**: Aggiungi la tabella in `drizzle/schema.ts`
2. **Migrazione**: Esegui `pnpm db:push`
3. **Query helpers**: Aggiungi funzioni in `server/db.ts` (pattern `getDb()` + query)
4. **Router tRPC**: Aggiungi procedure nel router appropriato (o creane uno nuovo + registra in `routers.ts`)
5. **Frontend**: Usa `trpc.routerName.procedureName.useQuery()` o `.useMutation()`
6. **UI**: Usa componenti shadcn/ui + Tailwind
7. **Test**: Verifica con `pnpm check` (types) + `pnpm test`

## Flusso di un bug fix

1. **Identifica** il file e la riga del bug
2. **Leggi** il codice circostante per capire il contesto
3. **Fix** con la modifica minima necessaria
4. **Verifica** con `pnpm check`
5. **NON** aggiungere feature, refactoring o "miglioramenti" al fix

## Router tRPC disponibili

| Router | Prefisso | Responsabilita' |
|--------|----------|-----------------|
| system | system.* | Health check |
| auth | auth.* | Login/logout, sessione corrente |
| analytics | analytics.* | Dashboard PA (overview, markets, shops, transactions) |
| dmsHub | dmsHub.* | Mercati, posteggi, operatori, concessioni, presenze |
| wallet | wallet.* | Borsellino elettronico, ricariche, PagoPA |
| integrations | integrations.* | API keys, webhooks, connessioni esterne |
| mihub | mihub.* | Multi-agente: tasks, projects, brain, messages |
| mioAgent | mioAgent.* | Log agenti AI |
| guardian | guardian.* | Monitoring API, debug, logs |
| tper | tper.* | Integrazione trasporto TPER Bologna |
| logs | logs.* | System logs |
| carbonCredits | carbonCredits.* | Crediti carbonio TCC |

## Pagine frontend principali

| Rotta | Componente | Descrizione |
|-------|-----------|-------------|
| /dashboard-pa | DashboardPA | Dashboard admin principale (14 tab) |
| /dashboard-impresa | DashboardImpresa | Dashboard per imprese/operatori |
| /wallet | WalletPage | Gestione pagamenti |
| /mappa | MapPage | Mappa interattiva mercati |
| /hub-operatore | HubOperatore | Dashboard operatore hub |
| /suap | SuapDashboard | Gestione autorizzazioni SUAP |
| /guardian/* | Guardian* | Monitoring sistema |
| /council | CouncilPage | Assistente AI legale |

## Documentazione di riferimento

| File | Contenuto |
|------|-----------|
| CLAUDE.md | QUESTO FILE - guida operativa per agenti |
| docs/ARCHITECTURE.md | Architettura sistema dettagliata |
| docs/DATABASE.md | Schema DB, convenzioni, regole |
| docs/API.md | Registro endpoint e convenzioni |
| docs/OPERATIONS.md | Deploy, monitoring, troubleshooting |
| docs/SCALING.md | Strategia di scaling a 8.000 mercati |

## Checklist pre-commit

- [ ] `pnpm check` passa senza errori
- [ ] Nessun `console.log` di debug rimasto (usa `console.warn` o `console.error` se necessario)
- [ ] Schema DB aggiornato se hai aggiunto tabelle/colonne
- [ ] Nessun segreto o credenziale nel codice
- [ ] Le nuove route tRPC sono registrate in `routers.ts`
- [ ] Le nuove pagine sono registrate in `App.tsx`

## Errori comuni da evitare

| Errore | Soluzione |
|--------|----------|
| "Connection terminated due to connection timeout" | Neon cold start. Ritenta dopo 3 secondi |
| Tabella non trovata | Controlla `drizzle/schema.ts`, poi `pnpm db:push` |
| CORS error | Le API devono passare per `/api/trpc` - non usare URL diretti |
| `any` type error | Importa il tipo corretto da `drizzle/schema.ts` |
| Import non trovato | Usa `@/` per frontend, import relativo per backend |
| Firebase auth fallisce | Verifica `VITE_FIREBASE_*` env vars nel `.env` |
| PM2 restart loop | Controlla i log: `pm2 logs --lines 50` su Hetzner |
