# 🔒 PUNTO DI RIPRISTINO STABILE — v4.7.0

> **Data:** 11 Febbraio 2026  
> **Tag Git:** `v4.7.0-stable`  
> **Commit:** `a267b96a65617b28c64cfb0882a849e99f2e94a5`  
> **Branch:** `master`  
> **Stato:** PRODUZIONE — Tutto funzionante e verificato  

---

## 📋 COME RIPRISTINARE

### Ripristino rapido (checkout tag)
```bash
git fetch origin --tags
git checkout v4.7.0-stable
```

### Ripristino completo (reset branch master)
```bash
git fetch origin --tags
git checkout master
git reset --hard v4.7.0-stable
git push --force origin master
```

### Ripristino solo di un file specifico
```bash
git checkout v4.7.0-stable -- percorso/del/file.ts
```

---

## 🌐 INFRASTRUTTURA ATTIVA

| Servizio | URL | Stato |
|----------|-----|-------|
| **Frontend (Vercel)** | https://dms-hub-app-new.vercel.app | ✅ Online |
| **Orchestratore (Hetzner)** | https://orchestratore.mio-hub.me | ✅ Healthy v2.0.0 |
| **API (Hetzner)** | https://api.mio-hub.me | ✅ Healthy v2.0.0 |
| **Sync Endpoint (Vercel)** | https://dms-hub-app-new.vercel.app/api/auth/firebase/sync | ✅ Attivo (401 senza token) |
| **Database (Neon)** | PostgreSQL via `DATABASE_URL` | ✅ Connected (304.773 log) |

---

## 🔑 VARIABILI D'AMBIENTE

### Client-side (.env.production — committato)
```
VITE_TRPC_URL=https://api.mio-hub.me
VITE_API_URL=https://api.mio-hub.me
VITE_FIREBASE_API_KEY=AIzaSyBQlKp8jQi7Q19tXQtTYpdgivw-WyhocTg
VITE_FIREBASE_AUTH_DOMAIN=dmshub-auth-2975e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dmshub-auth-2975e
VITE_FIREBASE_STORAGE_BUCKET=dmshub-auth-2975e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=793464851990
VITE_FIREBASE_APP_ID=1:793464851990:web:d6d70e95ac75bedb216f37
```

### Server-side (Vercel Environment Variables — NON committate)
```
DATABASE_URL          → Neon PostgreSQL connection string
FIREBASE_SERVICE_ACCOUNT_KEY → JSON service account per firebase-admin
```

> **ATTENZIONE**: Queste variabili sono configurate nella dashboard Vercel → Settings → Environment Variables. Se si cambia progetto Vercel, vanno riconfigurate manualmente.

---

## 📁 STRUTTURA PROGETTO

### Statistiche
| Metrica | Valore |
|---------|--------|
| File .ts/.tsx totali | 286 |
| Componenti client | 140 |
| Pagine client | 35 |
| Serverless functions (api/) | 12 |
| Server routers | 12 |
| Tabelle Drizzle schema | 30+ |
| Dimensione progetto (no node_modules) | 129 MB |

### Serverless Functions (Vercel — directory `api/`)
| File | Funzione |
|------|----------|
| `api/auth/firebase/sync.ts` | **Sync Firebase → DB**: verifica token, INSERT login_attempts, UPDATE lastSignedIn |
| `api/admin/migrate-logs.ts` | Migrazione log admin |
| `api/db/init-agent-messages.ts` | Init tabella messaggi agente |
| `api/logs/createLog.ts` | Creazione log |
| `api/logs/getLogs.ts` | Lettura log |
| `api/logs/initSchema.ts` | Init schema log |
| `api/logs/test.ts` | Test endpoint log |
| `api/mihub/fix-agent-field.ts` | Fix campo agente |
| `api/mihub/get-messages.ts` | Messaggi MIO Agent |
| `api/mihub/orchestrator-proxy.ts` | Proxy verso orchestratore |
| `api/mio/agent-logs.ts` | Log agente AI |
| `api/trpc/[trpc].ts` | tRPC handler |

### Vercel Rewrites (vercel.json)
| Pattern | Destinazione | Note |
|---------|-------------|------|
| `/api/auth/firebase/:path*` | Vercel serverless | Firebase sync (locale) |
| `/api/auth/:path*` | `https://api.mio-hub.me/api/auth/:path*` | Auth legacy (Hetzner) |
| `/api/mihub/get-messages` | Vercel serverless | Messaggi (locale) |
| `/api/mihub/:path*` | `https://api.mio-hub.me/api/mihub/:path*` | MiHub API (Hetzner) |
| `/api/guardian/:path*` | `https://api.mio-hub.me/api/guardian/:path*` | Guardian (Hetzner) |
| `/api/mio/:path*` | `https://api.mio-hub.me/api/mio/:path*` | MIO Agent (Hetzner) |
| `/api/abacus/:path*` | `https://api.mio-hub.me/api/abacus/:path*` | Abacus (Hetzner) |
| `/(.*)`| `/index.html` | SPA fallback |

> **ORDINE CRITICO**: Le regole Firebase DEVONO stare PRIMA di `/api/auth/:path*`, altrimenti il sync va a Hetzner (404).

### Client Contexts
| Context | Funzione |
|---------|----------|
| `FirebaseAuthContext.tsx` | Stato auth, sync Firebase→legacy, ruoli, login tracking |
| `PermissionsContext.tsx` | RBAC, permessi granulari |
| `MioContext.tsx` | Stato MIO Agent |
| `ThemeContext.tsx` | Tema chiaro/scuro |
| `AnimationContext.tsx` | Animazioni UI |
| `CivicReportsContext.tsx` | Segnalazioni civiche |
| `TransportContext.tsx` | Dati trasporto |

### Client API Clients
| Client | Funzione |
|--------|----------|
| `authClient.ts` | Chiamate auth legacy |
| `securityClient.ts` | Security events, login attempts, IP blacklist |
| `orchestratorClient.ts` | Proxy orchestratore |
| `logsClient.ts` | Log system |
| `suap.ts` | SUAP integration |

---

## 🔥 FUNZIONALITÀ ATTIVE E VERIFICATE

### Autenticazione
- ✅ Firebase Auth (Google, Apple, Email/Password)
- ✅ Bridge Firebase → Legacy DB (lookup utente, ruoli, permessi)
- ✅ Login tracking (INSERT login_attempts + UPDATE lastSignedIn)
- ✅ Security events logging
- ✅ ARPA Toscana SSO (SPID/CIE/CNS) — endpoint predisposto

### Dashboard PA (43 sezioni)
- ✅ Dashboard, Clienti, Wallet/PagoPA, Gaming & Rewards
- ✅ Sostenibilità, TPAS, Carbon Credits, Real-time
- ✅ Sistema, Agente AI, Sicurezza, SSO SUAP
- ✅ Qualificazione, Segnalazioni & IoT, Comuni
- ✅ Controlli/Sanzioni, Notifiche, Centro Mobilità
- ✅ Report, Integrazioni, Impostazioni
- ✅ Gestione Mercati, Imprese, Enti & Associazioni
- ✅ MIO Agent, Mappa GIS, Gestione HUB, Concilio AI

### Sicurezza (SecurityTab)
- ✅ Overview con metriche (ruoli, permessi, eventi, IP bloccati)
- ✅ Utenti registrati (7) con ultimo accesso
- ✅ Ruoli (14) con 285 mappature
- ✅ Permessi (102) in 4 categorie
- ✅ Eventi sicurezza (44)
- ✅ Tentativi di login con email corretta (user_email || email_attempted)
- ✅ IP blacklist management

### MIO Agent
- ✅ 5 agenti AI (Routing intelligente v3.3.0)
- ✅ Knowledge Base DMS
- ✅ Conversazioni persistenti

### Monitoraggio
- ✅ Guardian health check
- ✅ API Online / PM2 Online indicators
- ✅ Log count: 304.773

---

## ⚠️ NOTE CRITICHE PER SESSIONI FUTURE

1. **Colonne login_attempts**: Le colonne reali nel DB sono `username`, `user_id`, `ip_address`, `user_agent`, `success`, `failure_reason`, `created_at`, `user_email`, `user_name` — NON usare lo schema Drizzle che è sbagliato
2. **lastSignedIn**: La colonna nel DB è camelCase con virgolette (`"lastSignedIn"`), l'API la restituisce come `last_signed_in`
3. **Drizzle schema disallineato**: Le tabelle `login_attempts`, `security_events`, `ip_blacklist` sono state create via SQL diretto, non via Drizzle — lo schema Drizzle per queste tabelle è inaffidabile
4. **URL sync**: La chiamata a `/api/auth/firebase/sync` DEVE usare URL relativo (non `API_BASE`) perché la serverless function è su Vercel, non su Hetzner
5. **Ordine operazioni in syncUserWithBackend()**: STEP 1 = lookup legacy (orchestratore), STEP 2 = sync + tracking (Vercel), STEP 3 = security event (orchestratore)
6. **Firebase Auth**: Il `FirebaseAuthContext` è posizionato sopra tutti gli altri context nell'albero React — NON spostare
7. **Vercel rewrites ordine**: Le regole `/api/auth/firebase/` DEVONO stare PRIMA di `/api/auth/` nel vercel.json

---

## 📊 DIPENDENZE CHIAVE

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| `firebase` | ^12.9.0 | Client-side auth |
| `firebase-admin` | ^13.6.1 | Server-side token verification |
| `postgres` | ^3.4.7 | DB access in serverless functions |
| `pg` | ^8.16.3 | PostgreSQL client alternativo |
| `drizzle-orm` | ^0.44.5 | ORM (schema parzialmente disallineato) |
| `react` | ^19.2.0 | UI framework |
| `vite` | ^7.1.7 | Build tool |
| `typescript` | 5.9.3 | Type system |
| `@vercel/node` | ^5.5.6 | Serverless function runtime |

---

## 🏷️ STORICO TAG STABILI

| Tag | Descrizione |
|-----|-------------|
| `v4.7.0-stable` | **QUESTO** — Firebase Auth + Login Tracking verificato |
| `v3.39.0-stable-15gen` | Pre-Firebase Auth |
| `v3.35.1-stable` | Precedente stabile |
| `stable-2026-01-22` | Snapshot 22 Gennaio |

---

> **Creato il:** 11 Febbraio 2026, ore 17:46 UTC+1  
> **Per ripristinare:** `git checkout v4.7.0-stable`
