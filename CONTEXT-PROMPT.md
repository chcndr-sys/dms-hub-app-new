# CONTESTO DI SISTEMA — DMS Hub

> Incolla questo all'inizio di ogni nuova conversazione con un agente AI.
> Ultima versione: Febbraio 2026.

---

## COS'E'

**DMS Hub** (Digital Market System Hub) — piattaforma digitale per la gestione dei **mercati ambulanti italiani**. Gestisce: mercati, posteggi, operatori, concessioni, presenze, pagamenti PagoPA, mobilita', segnalazioni civiche, monitoraggio. Progettato per **8.000 mercati**.

**E' UN'UNICA APP WEB** (`dms-hub-app-new.vercel.app`) che serve TUTTI gli utenti:
- **PA** (Pubblica Amministrazione) → `/dashboard-pa` con 14+ tab
- **Imprese/Operatori** → `/dashboard-impresa`, `/app/impresa/*`, `/hub-operatore`
- **Cittadini** → `/mappa`, `/civic`, `/wallet`, `/route`
- **Pubblico** → Home, mappa pubblica, presentazione

La differenziazione avviene tramite il **sistema RBAC**: ogni utente vede solo le funzionalita' del suo ruolo tramite `ProtectedTab` + `PermissionsContext`. Il **super admin** puo' impersonare un PA di qualsiasi comune.

---

## STACK

| Layer | Tecnologia |
|-------|-----------|
| Frontend | React 19 + Vite 7 + Wouter (router) + Tailwind 4 + shadcn/ui + Lucide React |
| State | React Context (7 providers) + React Query (via tRPC) |
| Backend | Express 4 + tRPC 11 + SuperJSON |
| ORM | Drizzle 0.44 con driver `postgres` (postgres-js, NON `pg`) |
| Database | PostgreSQL su Neon (serverless, EU, 149 tabelle) |
| Auth | Firebase (`dmshub-auth-2975e`) + OAuth SPID/CIE/CNS |
| Runtime | Node.js 18+ / pnpm 10.4+ / ESM modules |
| Deploy FE | Vercel (auto-deploy su master) |
| Deploy BE | Hetzner VPS 157.90.29.66 + PM2 |

**NON usare MAI**: React Router, Next.js, Redux, Zustand, Material UI, Chakra, `pg` (node-postgres), CSS Modules, styled-components, endpoint Express separati, raw SQL.

---

## STRUTTURA PROGETTO

```
/
├── CLAUDE.md               # Guida operativa agenti (LEGGI PRIMA)
├── CONTESTO.md             # Contesto completo del sistema
├── client/src/
│   ├── App.tsx              # Tutte le rotte (Wouter <Switch>)
│   ├── components/          # 150+ componenti (ui/ = shadcn/ui)
│   ├── pages/               # DashboardPA (~383KB), DashboardImpresa, etc.
│   ├── contexts/            # 7 context: FirebaseAuth, Permissions, MIO, Theme, Transport, Animation, CivicReports
│   ├── hooks/               # useImpersonation, usePermissions, etc.
│   └── lib/                 # trpc.ts, firebase.ts
├── server/
│   ├── _core/               # index.ts (entry), trpc.ts, oauth.ts, context.ts, env.ts
│   ├── routers.ts           # REGISTRY di tutti i router tRPC
│   ├── db.ts                # Connessione DB lazy singleton + query helpers
│   ├── dmsHubRouter.ts      # Mercati, posteggi, operatori, concessioni
│   ├── walletRouter.ts      # Borsellino + PagoPA
│   └── services/            # TPER, E-FIL PagoPA
├── drizzle/schema.ts        # SOURCE OF TRUTH del database (tutte le tabelle)
├── shared/                  # Costanti condivise FE/BE
├── docs/                    # ARCHITECTURE.md, DATABASE.md, API.md, OPERATIONS.md, SCALING.md
└── scripts/                 # health-check.sh, db-maintenance.sh
```

---

## ARCHITETTURA CERVELLO/BRACCIO

**MioHub (CERVELLO)** — elabora, decide, autorizza:
- Login SPID/CIE, SUAP, PagoPA, PDND, concessioni, canone, mappa GIS, wallet, controlli, verbali

**DMS Legacy (BRACCIO)** — opera sul campo, raccoglie dati grezzi:
- App tablet per presenze fisiche, uscite, spazzatura, scelte spunta
- Heroku app `lapsy-dms`, PostgreSQL su AWS RDS, 25 tabelle, 117 stored functions
- URL: `lapsy-dms.herokuapp.com/index.html` (cred: `checchi@me.com` / `Dms2022!`)

**Flusso dati bidirezionale:**
- MioHub → Legacy (76%): anagrafica imprese, saldo wallet, graduatoria, mercati, posteggi, concessioni, autorizzazioni, regolarita'
- Legacy → MioHub (11%): presenze ingresso/uscita, spazzatura, rifiuti, note, prezzi, giornata mercato, posti scelti

**Flusso giornata mercato:**
1. Sync preventivo MioHub→Legacy
2. Apertura mercato dalla DashboardPA
3. Operatore tablet registra arrivo concessionari
4. Spunta: spuntisti scelgono posti
5. Durante mercato: registrazione spazzatura
6. Chiusura: uscite + chiusura giornata
7. Post-mercato: CRON genera verbali

---

## SISTEMA RBAC

4 tabelle: `users → user_role_assignments → user_roles → role_permissions → permissions`

**Settori**: sistema (livello 0-10), pa (20-40), mercato (50-60), impresa (70-80), esterno (85-90), pubblico (99)

**Risoluzione ruolo** (priorita' in PermissionsContext):
1. Impersonazione attiva → admin_pa (ID=2)
2. assigned_roles[0] dall'utente → usa quel role_id
3. Email super admin (chcndr@gmail.com) → super_admin (ID=1)
4. base_role === 'admin' → admin_pa (ID=2)
5. Default → cittadino (ID=13)

**Formato permessi**: `tab.view.{tabId}`, `quick.view.{quickId}`, `modulo.azione`

**Tab DashboardPA (14+)**: dashboard, mercati, imprese, commercio, wallet, hub, controlli, comuni*, security*, sistema*, ai*, integrations*, reports*, workspace* (*nascosti in impersonazione)

**Impersonazione per comune:**
- URL: `/dashboard-pa?impersonate=true&comune_id=96&comune_nome=Grosseto&user_email=...`
- Persiste in `sessionStorage['miohub_impersonation']`
- Hook: `useImpersonation()` — aggiunge header `X-Comune-Id` a tutte le API
- Banner giallo: `ImpersonationBanner.tsx`

---

## ROUTER tRPC (Backend)

Registry: `server/routers.ts`. Endpoint base: `/api/trpc/{router.procedure}`

| Router | Cosa fa |
|--------|---------|
| system | Health check |
| auth | Login/logout, sessione (`auth.me`) |
| analytics | Overview, markets, shops, transactions |
| dmsHub | Mercati, posteggi, operatori, concessioni, presenze |
| wallet | Borsellino, ricariche, PagoPA, avvisi |
| integrations | API keys, webhooks, DMS Legacy endpoints |
| mihub | Multi-agente: tasks, projects, brain, messages |
| mioAgent | Log agenti AI |
| guardian | Monitoring: endpoints, logs, debug |
| tper | Trasporto TPER Bologna |
| logs | System logs |
| carbonCredits | Crediti carbonio TCC |

3 livelli: `publicProcedure` (aperta), `protectedProcedure` (auth), `adminProcedure` (admin)

---

## DATABASE

- **Provider**: Neon PostgreSQL serverless (EU) — cold start 2-3s dopo 5 min inattivita'
- **Source of truth**: `drizzle/schema.ts`
- **Pattern obbligatorio**: `const db = await getDb(); if (!db) return [];`
- **149 tabelle**, principali: markets (~60), stalls (~900), vendors (~150), concessions (~80), vendor_presences (~1000), operatore_wallet, wallet_transazioni, avvisi_pagopa, users, user_roles, permissions, role_permissions, user_role_assignments, mio_agent_logs (~326K righe!)
- **Convenzioni**: tabelle snake_case, codice camelCase, ID generatedAlwaysAsIdentity, timestamp defaultNow, soldi in centesimi

---

## BUS HUB E TRASPORTO

**Bus Hub Editor** — digitalizzazione mercati in 2 step:
1. **PngTransparentTool**: rimuove sfondo planimetria
2. **SlotEditorV3**: posiziona posteggi su mappa georeferenziata, esporta GeoJSON

**Trasporto pubblico**: 23.930 fermate GTFS (TPER Bologna, Trenitalia, Tiemme)
- API: `api.mio-hub.me/api/gtfs/*`
- TPER real-time: SOAP API per arrivi in tempo reale
- Componenti: TransportContext, TransportStopsLayer, NearbyStopsPanel

---

## INFRASTRUTTURA

```
BROWSER (dms-hub-app-new.vercel.app)
  ├── tRPC → HETZNER VPS (mihub.157-90-29-66.nip.io, PM2)
  │            └── NEON PostgreSQL (149 tabelle, serverless)
  ├── REST → ORCHESTRATORE (orchestratore.mio-hub.me, multi-agent)
  ├── iframe → DMS LEGACY (lapsy-dms.herokuapp.com)
  │              └── AWS RDS PostgreSQL (25 tab, 117 stored functions)
  │              └── TABLET/COLONNINA (operatori sul campo)
  └── Auth → FIREBASE (dmshub-auth-2975e)
```

Autoheal: cron ogni 15 min su Hetzner (`/root/mihub-backend-rest/scripts/autoheal.sh`)

---

## COMANDI

```bash
pnpm dev          # Dev server con hot reload
pnpm build        # Build FE (Vite) + BE (esbuild)
pnpm start        # Produzione
pnpm check        # TypeScript type check
pnpm test         # Test (vitest)
pnpm format       # Prettier
pnpm db:push      # Migrazioni Drizzle
```

---

## COME AGGIUNGERE UNA FEATURE

1. Schema → `drizzle/schema.ts`
2. Migrazione → `pnpm db:push`
3. Query → `server/db.ts` (pattern getDb() + null check)
4. Router tRPC → registra in `server/routers.ts`
5. Frontend → `trpc.router.procedure.useQuery()` / `.useMutation()`
6. UI → shadcn/ui + Tailwind, dark mode (teal #14b8a6)
7. RBAC → aggiungi permesso se serve
8. Test → `pnpm check` + `pnpm test`

## COME FIXARE UN BUG

1. Identifica file e riga
2. Leggi codice circostante
3. Fix MINIMO necessario
4. `pnpm check`
5. NON aggiungere feature o refactoring

---

## REGOLE INVIOLABILI

| Area | Regola |
|------|--------|
| DB | Source of truth: `drizzle/schema.ts`. MAI raw SQL. MAI DROP TABLE. Driver: `postgres` (NOT `pg`) |
| API | Tutto via tRPC. MAI endpoint Express separati. Validazione Zod. Logging automatico |
| Frontend | Router: Wouter. State: Context+Query. UI: shadcn/ui. CSS: Tailwind. Icons: Lucide |
| Auth | Firebase primario. Cookie JWT. RBAC 4 tabelle. MAI toccare impersonazione senza test completi |
| Codice | TypeScript strict. ESM. Path: `@/` = client/src, `@shared/` = shared. Prettier |
| Deploy | FE: Vercel. BE: Hetzner PM2. MAI push su master senza review. MAI toccare .env prod |
| Sicurezza | MAI segreti nel codice. MAI `any`. MAI duplicare logica esistente |

---

## CREDENZIALI E ACCESSI

| Risorsa | URL |
|---------|-----|
| Frontend | dms-hub-app-new.vercel.app |
| Backend | mihub.157-90-29-66.nip.io |
| Orchestratore | orchestratore.mio-hub.me |
| DMS Legacy | lapsy-dms.herokuapp.com (`checchi@me.com` / `Dms2022!`) |
| Neon DB | console.neon.tech (ep-bold-silence-adftsojg) |
| Firebase | console.firebase.google.com (dmshub-auth-2975e) |
| Hetzner | SSH 157.90.29.66 |
| GitHub | github.com/Chcndr |

**Env vars backend (31)**: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY, MANUS_API_KEY, MERCAWEB_API_KEY, ZAPIER_API_KEY, GITHUB_PAT_DMS, CORS_ORIGINS, ENABLE_AGENT_LOGS, ENABLE_GUARDIAN_LOOP, ENABLE_MIO_CHAT, etc.
**Env vars frontend (7)**: VITE_FIREBASE_* (6) + FIREBASE_SERVICE_ACCOUNT_KEY

---

## ERRORI COMUNI

| Errore | Soluzione |
|--------|----------|
| Connection timeout | Neon cold start. Ritenta dopo 3s |
| Tabella non trovata | Aggiungi in schema.ts + `pnpm db:push` |
| CORS | Usa `/api/trpc/`, mai URL diretti |
| Tab non visibile | Manca `tab.view.{tabId}` nel ruolo |
| PM2 loop | `pm2 logs --lines 100` su Hetzner |

---

## DOCUMENTAZIONE NEL REPO

| File | Contenuto |
|------|-----------|
| `CLAUDE.md` | Guida operativa rapida per agenti |
| `CONTESTO.md` | Contesto completo per chi non sa niente |
| `docs/ARCHITECTURE.md` | Architettura dettagliata |
| `docs/DATABASE.md` | Schema DB per tabella |
| `docs/API.md` | Registro endpoint tRPC |
| `docs/OPERATIONS.md` | Deploy, monitoring, troubleshooting |
| `docs/SCALING.md` | Piano scaling a 8.000 mercati |

---

**PRIMA DI FARE QUALSIASI COSA: leggi `CLAUDE.md` nel repository. Per approfondimenti leggi i file in `docs/`.**
