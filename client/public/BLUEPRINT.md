# DMS Hub System Blueprint
**Versione:** 4.0
**Data:** Febbraio 2026
**Stato:** Operativo

---

## Executive Summary

Il **DMS Hub** (Digital Market System) e' l'ecosistema digitale integrato per la gestione dei mercati ambulanti, della mobilita' sostenibile e dei servizi civici per la Pubblica Amministrazione italiana.

Un'unica app web che serve tutti i tipi di utente (PA, imprese, cittadini, pubblico) con contenuto differenziato per ruolo tramite RBAC.

---

## Architettura Tecnica

### 1. Frontend (Dashboard PA + App Pubbliche)
- **Tecnologia**: React 19, Vite 7, TypeScript strict, Tailwind 4, shadcn/ui
- **Hosting**: Vercel (auto-deploy da GitHub master)
- **Router**: Wouter (lightweight)
- **Componenti**: 139 React components, 34 pagine
- **State**: React Context + React Query (via tRPC client)

### 2. Backend (tRPC API)
- **Tecnologia**: Node.js 18+, Express 4, tRPC 11, Drizzle ORM 0.44
- **Hosting**: Hetzner VPS (157.90.29.66), gestito con PM2
- **Router tRPC registrati**: 19 (system, auth, analytics, dmsHub, wallet, integrations, mihub, mioAgent, guardian, tper, logs, carbonCredits, users, sustainability, businesses, inspections, notifications, civicReports, mobility)
- **Procedure totali**: 119 (query + mutation)

### 3. Database (Neon PostgreSQL)
- **Tabelle**: 70 in 10 domini funzionali
- **ORM**: Drizzle (schema source of truth: `drizzle/schema.ts`)
- **Hosting**: Neon Serverless, regione EU
- **Domini**: Core Business (12), Wallet (8), Auth/RBAC (5), AI/Agenti (10), Civic (4), Integrazioni (8), Comuni (6), Sostenibilita' (5), Sistema (7), Commercio/SUAP (5)

### 4. Autenticazione
- **Provider**: Firebase Auth (progetto dmshub-auth-2975e)
- **OAuth**: SPID/CIE/CNS via intermediario
- **Sessione**: Cookie JWT, scadenza 1 anno
- **RBAC**: 4 tabelle (user_roles, role_permissions, permissions, user_role_assignments)
- **Impersonazione**: Super admin puo' simulare vista PA per comune specifico

### 5. Sistema AI Multi-Agente
- **Agenti**: 5 (MIO orchestratore, GPT-Dev, Manus, Abacus, Zapier)
- **LLM**: Gemini 2.5 Flash
- **Knowledge Base**: 30 PDF integrati nel system prompt
- **Features**: Task management, brain condiviso, workspace collaborativo

---

## Dimensioni Codebase

| Metrica | Valore |
|---------|--------|
| Codice attivo (TS/TSX) | ~114.000 righe |
| Totale progetto (con docs, config, etc.) | ~218.000 righe |
| Componenti React | 139 |
| Pagine frontend | 34 |
| Tabelle database | 70 |
| Procedure tRPC | 119 |
| Router tRPC | 19 |
| Tab Dashboard PA | 14 (protetti RBAC) |

---

## Integrazioni PA

| Integrazione | Stato | Dettaglio |
|-------------|-------|-----------|
| PagoPA | Parziale | E-FIL SOAP implementato, mock mode |
| SPID/CIE/CNS | Parziale | Via OAuth intermediario |
| Firebase Auth | Operativo | JWT + cookie session |
| TPER Bologna | Operativo | API real-time |
| PDND | Da fare | Non implementato |
| ANPR | Da fare | Non implementato |
| AppIO | Da fare | Non implementato |
| SUAP | Parziale | Modulo locale |

---

## Documentazione

| Documento | Percorso |
|-----------|----------|
| Guida operativa agenti | `CLAUDE.md` (root) |
| Dossier tecnico | `/dossier/index.html` |
| Resoconto ecosistema | `/report/index.html` |
| Stato progetto | `/STATO_PROGETTO_AGGIORNATO.md` |
| Schema DB | `drizzle/schema.ts` |
| Architettura | `docs/ARCHITECTURE.md` |
| API reference | `docs/API.md` |
| Operations | `docs/OPERATIONS.md` |

---

*Documento aggiornato — Febbraio 2026 — DMS Hub v4.0*
