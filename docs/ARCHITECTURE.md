# Architettura DMS Hub

> Documento di riferimento sull'architettura del sistema. Aggiornato: Febbraio 2026.

## Overview

DMS Hub e' un monorepo con frontend e backend nello stesso repository.
Il sistema e' composto da 4 layer principali:

```
┌─────────────────────────────────────────────┐
│  CLIENT (React 19 + Vite 7)                 │
│  - SPA con Wouter router                    │
│  - shadcn/ui + Tailwind 4                   │
│  - React Query per async state              │
│  - 34 pagine, 150+ componenti               │
├─────────────────────────────────────────────┤
│  tRPC LAYER (Type-safe RPC)                 │
│  - superjson transformer                    │
│  - httpBatchLink                            │
│  - Logging middleware automatico            │
│  - Auth middleware (public/protected/admin)  │
├─────────────────────────────────────────────┤
│  SERVER (Express 4 + tRPC 11)               │
│  - 12 tRPC routers                          │
│  - OAuth + Firebase auth                    │
│  - API metrics + Guardian monitoring        │
│  - Servizi: TPER, E-FIL PagoPA, S3          │
├─────────────────────────────────────────────┤
│  DATABASE (PostgreSQL su Neon)              │
│  - Drizzle ORM 0.44                         │
│  - 149 tabelle definite nello schema        │
│  - Connessione lazy singleton               │
│  - postgres-js driver                       │
└─────────────────────────────────────────────┘
```

## Flusso di una richiesta

```
Browser → GET/POST /api/trpc/router.procedure
  → Express middleware (logging, body parse)
  → tRPC adapter (createExpressMiddleware)
  → Context creation (estrae user da cookie JWT)
  → Logging middleware (traccia endpoint, tempo, status)
  → Auth middleware (public/protected/admin check)
  → Procedure handler (logica business)
  → Drizzle ORM query → PostgreSQL (Neon)
  → Response (superjson serializzato)
  → Metrica salvata in api_metrics
  → Log salvato in memoria (Guardian real-time)
```

## Frontend Architecture

### Router (Wouter)
Le rotte sono definite in `client/src/App.tsx` con `<Switch>`:
- 34 rotte mappate a componenti pagina
- Fallback 404 per rotte sconosciute
- NON e' Next.js: e' una SPA pura

### Provider Stack (in ordine di nesting)
```
ErrorBoundary
  └── ThemeProvider (dark/light)
    └── FirebaseAuthProvider (auth state)
      └── AnimationProvider
        └── MioProvider (AI chat state)
          └── PermissionsProvider (RBAC)
            └── TransportProvider
              └── TooltipProvider
                └── Router (Wouter)
                  └── ChatWidget (floating AI)
                  └── Toaster (Sonner)
```

### State Management
- **React Context**: 7 context providers per stato globale
  - `FirebaseAuthContext` - autenticazione
  - `PermissionsContext` - RBAC con `hasPermission()`, `canViewTab()`
  - `MioContext` - chat AI con MIO agent
  - `ThemeContext` - dark/light mode
  - `TransportContext` - dati mobilita'
  - `AnimationContext` - stato animazioni
  - `CivicReportsContext` - segnalazioni civiche
- **React Query** (via tRPC): async data fetching e caching
- **localStorage**: Persistenza sessione (`token`, `user`, `miohub_session_token`)

### Componenti grandi (>50KB)
Questi componenti sono molto grossi e complessi. Attenzione quando li modifichi:
- `DashboardPA.tsx` (~383KB) - Dashboard admin con 14 tab
- `GestioneMercati.tsx` (~202KB) - Gestione mercati completa
- `ControlliSanzioniPanel.tsx` (~163KB) - Controlli e sanzioni
- `ComuniPanel.tsx` (~119KB) - Gestione comuni
- `GamingRewardsPanel.tsx` (~118KB) - Gamification
- `Integrazioni.tsx` (~112KB) - Pannello integrazioni

## Backend Architecture

### Entry Point
`server/_core/index.ts` avvia:
1. Express app con body parser (50MB limit)
2. Global REST monitoring middleware
3. OAuth routes (`/api/oauth/callback`)
4. Firebase auth routes (`/api/auth/*`)
5. Slot Editor import endpoint (`/api/import-from-slot-editor`)
6. tRPC middleware (`/api/trpc/*`)
7. Static file serving (prod) o Vite dev server (dev)

### Middleware Stack
1. **JSON body parser** (50MB limit per upload file)
2. **REST monitoring** - logga tutte le `/api/*` requests
3. **tRPC logging** - traccia endpoint, durata, status code
4. **Auth** - estrae user da cookie JWT
5. **RBAC** - verifica ruolo per procedure protette

### Database Connection
```typescript
// server/db.ts - Pattern lazy singleton
let _db = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _client = postgres(process.env.DATABASE_URL);
    _db = drizzle(_client);
  }
  return _db;  // null se DATABASE_URL non settata
}
```

**Importante**: `getDb()` ritorna `null` se il DB non e' disponibile.
Tutte le funzioni helper gestiscono il caso `null` con graceful degradation.

### Servizi Esterni

| Servizio | File | Protocollo | Scopo |
|----------|------|-----------|-------|
| TPER Bologna | `server/services/tperService.ts` | REST + SOAP | Fermate bus, orari real-time |
| E-FIL PagoPA | `server/services/efilPagopaService.ts` | SOAP | Pagamenti PagoPA |
| AWS S3 | (inline nei router) | REST | Storage file/documenti |
| Firebase Admin | `server/firebaseAuthRouter.ts` | SDK | Verifica token auth |

## Autenticazione

### Flusso principale (Firebase)
```
1. User clicca Login → Firebase popup (Google/Apple/Email)
2. Firebase ritorna ID token
3. Frontend invia token al backend
4. Backend verifica token con Firebase Admin SDK
5. Backend crea/aggiorna utente nel DB
6. Backend setta cookie JWT di sessione
7. Ogni richiesta successiva porta il cookie
8. tRPC middleware estrae user dal cookie
```

### Flusso SPID/CIE
```
1. User clicca SPID/CIE → redirect a ARPA Toscana OAuth
2. Callback su /api/oauth/callback
3. Backend scambia code per token
4. Backend ottiene info utente (openId, name, email)
5. Backend crea/aggiorna utente nel DB
6. Backend setta cookie JWT
```

### RBAC
```
users → user_role_assignments → user_roles → role_permissions → permissions
                                                    ↓
                                        modulo.azione (es. dmsHub.markets.read)
                                        scope: all/territory/market/own/none
```

Ruoli predefiniti: `system`, `pa`, `mercato`, `impresa`, `esterno`, `pubblico`

## Deployment

```
GitHub Repository
  ├── Push to master → Vercel (frontend auto-deploy, ~2min)
  └── Push webhook → Hetzner (backend PM2 restart, ~2min)

Vercel (Frontend)
  └── dms-hub-app-new.vercel.app
  └── Static files + CDN

Hetzner VPS 157.90.29.66 (Backend)
  ├── PM2 process manager
  ├── mihub.157-90-29-66.nip.io
  └── orchestratore.mio-hub.me

Neon (Database)
  └── ep-bold-silence-adftsojg
  └── PostgreSQL serverless (EU region)
  └── Auto-suspend dopo 5 min inattivita'
```

## Multi-Agent System (MIHUB)

Il sistema supporta agenti AI multipli che comunicano tramite:
- **agent_tasks** - coda di lavoro con priorita' e stato
- **agent_messages** - messaggi tra agenti (text, task, notification, error)
- **agent_brain** - memoria persistente (decisioni, context, learning)
- **agent_context** - contesto condiviso per conversazione
- **data_bag** - storage key-value con TTL e access control
- **system_events** - event bus per notifiche

### Agenti attivi
- **MIO** - agente principale, interfaccia utente
- **Manus** - agente backend/infrastruttura
- **Dev/GPTDev** - agenti sviluppo
- **Abacus** - agente SQL/dati
- **Zapier** - automazioni
- **Gemini Architect** - architettura

### Comunicazione
Frontend chiama `orchestratore.mio-hub.me/api/mihub/orchestrator` con:
```json
{
  "targetAgent": "mio|dev|gptdev|manus|zapier|abacus|gemini_arch",
  "message": "...",
  "context": {}
}
```
Timeout: 60 secondi per risposta agente.
