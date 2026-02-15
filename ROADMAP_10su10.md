# ROADMAP DMS Hub — Da dove siamo a 10/10

> Audit completo eseguito il 15/02/2026
> Stato attuale: Sicurezza 7.2/10 | Conformita' 5.5/10 | Funzionalita' 6.5/10 | Qualita' codice 6/10

---

## PUNTEGGI ATTUALI E TARGET

| Area | Attuale | Target | Gap |
|------|---------|--------|-----|
| Sicurezza | 7.2/10 | 10/10 | Helmet, rate limiting, CORS, CSP, cookie hardening |
| Conformita' GDPR | 4/10 | 10/10 | Consent, data export, right to erasure, privacy policy |
| Accessibilita' AGID | 3.5/10 | 10/10 | ARIA, keyboard nav, screen reader, contrast |
| Completezza funzionale | 6.5/10 | 10/10 | Feature incomplete, mock data, flussi mancanti |
| Qualita' codice | 6/10 | 10/10 | 0 test, console.log sparsi, procedure non protette |
| Infrastruttura | 7/10 | 10/10 | PWA, i18n, CI/CD, monitoring |
| **MEDIA COMPLESSIVA** | **5.7/10** | **10/10** | |

---

## FASE 1 — SICUREZZA CRITICA (Settimana 1-2)

> Obiettivo: portare Sicurezza da 7.2 a 10/10

### 1.1 Security Headers (Helmet) — CRITICO
**File:** `server/_core/index.ts`
**Problema:** Zero security headers (X-Frame-Options, X-Content-Type-Options, HSTS, X-XSS-Protection)
**Azione:**
```bash
pnpm add helmet
```
```typescript
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://mihub.157-90-29-66.nip.io", "https://*.firebaseio.com", "https://*.googleapis.com"],
      frameSrc: ["'none'"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```
**Stima:** 1-2 ore

### 1.2 Rate Limiting — CRITICO
**File:** `server/_core/index.ts`
**Problema:** Nessun rate limiting su /api/trpc — vulnerabile a brute force e DoS
**Azione:**
```bash
pnpm add express-rate-limit
```
```typescript
import rateLimit from 'express-rate-limit';

// Globale
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Strict su auth
app.use('/api/trpc/auth.', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// Strict su login
app.use('/api/oauth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
```
**Stima:** 1-2 ore

### 1.3 CORS Restrittivo — CRITICO
**File:** `server/_core/index.ts`
**Problema:** CORS aperto a tutti gli origin
**Azione:**
```bash
pnpm add cors
```
```typescript
import cors from 'cors';
app.use(cors({
  origin: [
    'https://dms-hub-app-new.vercel.app',
    'http://localhost:5173', // dev
  ],
  credentials: true,
  methods: ['GET', 'POST'],
}));
```
**Stima:** 30 minuti

### 1.4 Cookie Hardening — CRITICO
**File:** `server/_core/cookies.ts`
**Problema:** `sameSite: "none"` bypassa protezione CSRF
**Azione:** Cambiare in `sameSite: "lax"` e aggiungere `app.set('trust proxy', 1)`
**Stima:** 30 minuti

### 1.5 Rimuovere Email Admin Hardcoded — CRITICO
**File:** `client/src/contexts/PermissionsContext.tsx`
**Problema:** Email `chcndr@gmail.com` hardcoded nel frontend — chiunque puo' leggerla
**Azione:** Spostare il check lato server nel JWT claims, sul frontend usare solo `user.is_super_admin`
**Stima:** 1-2 ore

### 1.6 Validazione Variabili d'Ambiente — ALTO
**File:** `server/_core/env.ts`
**Problema:** Se manca una env var, default a stringa vuota — fallimento silenzioso
**Azione:**
```typescript
function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env: ${key}`);
  return val;
}

export const ENV = {
  databaseUrl: requireEnv('DATABASE_URL'),
  cookieSecret: requireEnv('JWT_SECRET'),
  // ...
};
```
**Stima:** 30 minuti

### 1.7 Ridurre Limite Request Body — MEDIO
**File:** `server/_core/index.ts`
**Problema:** Limite a 50MB — eccessivo, rischio DoS
**Azione:** Ridurre a `5mb` per JSON, usare multer per file upload
**Stima:** 30 minuti

### 1.8 Rimuovere Token da localStorage — ALTO
**File:** `client/src/api/authClient.ts`
**Problema:** Session token in localStorage — vulnerabile a XSS
**Azione:** Usare solo httpOnly cookie (gia' implementato lato OAuth), rimuovere `setSessionToken()` da localStorage
**Stima:** 2-3 ore

---

## FASE 2 — CONFORMITA' GDPR (Settimana 2-3)

> Obiettivo: portare Conformita' GDPR da 4 a 10/10

### 2.1 Privacy Policy Page — CRITICO
**Azione:** Creare pagina `/privacy` con:
- Titolare del trattamento
- Finalita' e base giuridica
- Categorie di dati trattati
- Diritti dell'interessato (accesso, rettifica, cancellazione, portabilita')
- Periodo di conservazione
- Contatti DPO
**File nuovo:** `client/src/pages/PrivacyPolicyPage.tsx`
**Rotta:** Aggiungere in `App.tsx`
**Stima:** 4-6 ore

### 2.2 Cookie Consent Banner — CRITICO
**Problema:** Nessun banner cookie — obbligatorio per legge
**Azione:**
- Creare componente `CookieConsentBanner.tsx`
- Bloccare cookie non essenziali prima del consenso
- Salvare consenso in `compliance_certificates` (tabella gia' presente!)
- Categorie: necessari, analitici, marketing
**Stima:** 4-6 ore

### 2.3 Data Export (Portabilita' - Art. 20) — CRITICO
**Problema:** Nessun endpoint per esportare i dati dell'utente
**Azione:**
- Creare `auth.exportMyData` in tRPC
- Raccogliere dati da: users, extended_users, transactions, checkins, bookings, vendor_documents
- Formato: JSON + CSV scaricabile
- Aggiungere bottone in profilo utente
**Stima:** 6-8 ore

### 2.4 Right to Erasure (Cancellazione - Art. 17) — CRITICO
**Problema:** Nessun meccanismo di cancellazione dati
**Azione:**
- Creare `auth.deleteMyAccount` in tRPC
- Anonimizzare (non cancellare) per mantenere integrita' referenziale
- Eliminare: PII (nome, email, CF, P.IVA, telefono, indirizzo)
- Mantenere anonimizzati: transazioni, log di audit (obbligo legale)
- Conferma via email prima della cancellazione
**Stima:** 6-8 ore

### 2.5 Consenso al Trattamento Dati — ALTO
**Problema:** Nessun tracciamento del consenso al trattamento
**Azione:**
- Aggiungere checkbox consenso in registrazione e login
- Salvare in tabella `compliance_certificates` (gia' presente nello schema!)
- Versioning del consenso (campo `version` gia' presente)
**Stima:** 3-4 ore

### 2.6 Data Retention Policy — ALTO
**Problema:** Log e metriche conservati indefinitamente
**Azione:**
- Definire policy: 90 giorni per api_metrics, 1 anno per audit_logs, 5 anni per transazioni finanziarie
- Creare job schedulato per pulizia automatica
- Documentare la policy nella privacy page
**Stima:** 3-4 ore

---

## FASE 3 — ACCESSIBILITA' AGID/WCAG 2.1 AA (Settimana 3-5)

> Obiettivo: portare Accessibilita' da 3.5 a 10/10
> Obbligatoria per PA italiane (Legge Stanca + Linee guida AGID)

### 3.1 Audit ARIA Completo — CRITICO
**Problema:** Solo 52 attributi ARIA, quasi tutti nel ComponentShowcase (demo). Le pagine reali ne hanno pochissimi.
**Azione per ogni componente:**
- `aria-label` su tutti i bottoni senza testo (solo icona)
- `aria-labelledby` su sezioni e pannelli
- `role="main"`, `role="navigation"`, `role="complementary"` sulle aree semantiche
- `aria-live="polite"` per notifiche e aggiornamenti dinamici
- `aria-expanded` su accordion e dropdown
**File principali da sistemare:**
- `DashboardPA.tsx` — solo 2 attributi ARIA attualmente
- `GestioneMercati.tsx` — 202KB, zero ARIA
- `ControlliSanzioniPanel.tsx` — 163KB, zero ARIA
- `ComuniPanel.tsx` — 119KB, zero ARIA
- `Integrazioni.tsx` — 112KB, zero ARIA
- `GamingRewardsPanel.tsx` — 118KB, zero ARIA
**Stima:** 15-20 ore (componente per componente)

### 3.2 Navigazione da Tastiera — CRITICO
**Azione:**
- Aggiungere `tabIndex` corretto su tutti gli elementi interattivi
- Skip link "Vai al contenuto principale" all'inizio della pagina
- Focus trap nei modali (Radix UI gia' lo fa, verificare i custom)
- Gestione focus dopo apertura/chiusura dialoghi
- Indicatore di focus visibile (outline) — non rimuovere mai `outline: none`
**Stima:** 8-10 ore

### 3.3 Contrasto Colori — ALTO
**Problema:** Dark mode con teal #14b8a6 — verificare rapporto contrasto >= 4.5:1
**Azione:**
- Verificare tutte le combinazioni testo/sfondo con tool come axe-core
- Sistemare colori che non passano WCAG AA
- Aggiungere modalita' alto contrasto
**Stima:** 4-6 ore

### 3.4 Form e Messaggi di Errore — ALTO
**Azione:**
- Associare ogni `<input>` a un `<label htmlFor="...">`
- Messaggi di errore collegati con `aria-describedby`
- Stato obbligatorio con `aria-required="true"`
- Stato invalido con `aria-invalid="true"`
**Stima:** 6-8 ore

### 3.5 Alt Text per Immagini — MEDIO
**Azione:** Verificare tutte le `<img>` abbiano `alt` descrittivo
**Stima:** 2-3 ore

### 3.6 Dichiarazione di Accessibilita' AGID — CRITICO
**Azione:** Creare pagina `/accessibilita` con:
- Stato di conformita' WCAG 2.1 AA
- Contenuti non accessibili e motivazione
- Modalita' di segnalazione
- Link al Difensore Civico per il Digitale
**Stima:** 2-3 ore

---

## FASE 4 — PROTEZIONE API E RBAC (Settimana 4-5)

> Obiettivo: blindare tutte le API

### 4.1 Proteggere Procedure Pubbliche — CRITICO
**Problema:** La maggior parte dei router usa `publicProcedure` — chiunque puo' chiamarli senza autenticazione

**Router da proteggere (attualmente TUTTI publici):**

| Router | Procedure da proteggere | Livello |
|--------|------------------------|---------|
| `integrationsRouter.ts` | apiKeys CRUD, webhooks CRUD, sync | `adminProcedure` |
| `guardianRouter.ts` | integrations, logs, testEndpoint | `adminProcedure` |
| `mihubRouter.ts` | createTask, updateTaskStatus, brain, dataBag | `protectedProcedure` |
| `mioAgentRouter.ts` | initSchema, createLog, deleteLog | `protectedProcedure` |
| `analytics` (in routers.ts) | overview, markets, shops, transactions | `protectedProcedure` |
| `users`, `businesses`, `inspections` | analytics, list | `protectedProcedure` |
| `notifications` | list | `protectedProcedure` |

**Azione:** Cambiare `publicProcedure` → `protectedProcedure` o `adminProcedure` per ogni procedura sensibile
**Stima:** 4-6 ore

### 4.2 Permessi Granulari per Azione — ALTO
**Problema:** `protectedProcedure` verifica solo che l'utente sia autenticato, non che abbia il PERMESSO specifico
**Azione:**
- Creare middleware `requirePermission('dmsHub.markets.write')`
- Usarlo nelle procedure che modificano dati
- Verificare scope (all/territory/market/own) per multi-tenancy
**Stima:** 8-10 ore

### 4.3 API Key Validation Server-Side — ALTO
**File:** `server/integrationsRouter.ts`
**Problema:** Le API key sono gestite ma non validano le richieste in ingresso
**Azione:**
- Middleware che verifica API key nell'header `X-API-Key`
- Rate limiting per API key (campo `rateLimit` gia' nel DB)
- Logging per API key (tabella `api_metrics` gia' pronta)
**Stima:** 4-6 ore

---

## FASE 5 — TEST E QUALITA' CODICE (Settimana 5-7)

> Obiettivo: portare Qualita' Codice da 6 a 10/10

### 5.1 Setup Testing Framework — CRITICO
**Problema:** ZERO test nel progetto. Vitest configurato ma nessun file test.
**Azione:**
```
client/src/__tests__/
  contexts/PermissionsContext.test.tsx
  hooks/useImpersonation.test.ts
  components/LoginModal.test.tsx
server/__tests__/
  routers/auth.test.ts
  routers/dmsHub.test.ts
  routers/wallet.test.ts
  core/cookies.test.ts
  core/oauth.test.ts
  db.test.ts
```
**Copertura minima target:** 60%
**Stima:** 20-30 ore

### 5.2 Test Critici da Scrivere Prima — CRITICO
1. **Auth flow** — login, logout, sessione, token expiry
2. **RBAC** — verifica che ogni ruolo veda solo cio' che deve
3. **Wallet** — ricarica, decurtazione, saldo corretto
4. **Impersonazione** — super admin vede come PA comunale
5. **Input validation** — Zod reject input invalido
**Stima:** 10-15 ore (i piu' critici)

### 5.3 Pulizia Console.log — MEDIO
**Azione:** Grep per `console.log` e rimuovere quelli di debug. Tenere solo `console.warn` e `console.error`
**Stima:** 2-3 ore

### 5.4 TypeScript Strict Compliance — MEDIO
**Azione:** Eseguire `pnpm check` e risolvere tutti gli errori/warning
**Stima:** 4-6 ore

### 5.5 CI/CD Pipeline — ALTO
**Azione:** GitHub Actions workflow:
```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    - pnpm check    # TypeScript
    - pnpm test     # Vitest
    - pnpm build    # Build
    - pnpm audit    # Security
```
**Stima:** 2-3 ore

---

## FASE 6 — COMPLETEZZA FUNZIONALE (Settimana 6-10)

> Obiettivo: portare Funzionalita' da 6.5 a 10/10

### 6.1 Feature Incomplete da Completare

| Feature | Stato Attuale | Cosa Manca | Stima |
|---------|--------------|------------|-------|
| Dashboard Overview | Funzionante | Metriche real-time, grafici temporali | 8h |
| Gestione Mercati | Funzionante | Import/export massivo, validazione GeoJSON | 6h |
| Gestione Imprese | Funzionante | Workflow approvazione, notifiche stato | 8h |
| Wallet PagoPA | Struttura presente | Test E2E con sandbox PagoPA, ricevute PDF | 10h |
| Controlli/Sanzioni | UI presente | Workflow completo: verbale → notifica → pagamento → chiusura | 12h |
| Report | Tab presente | Generazione PDF, export Excel, grafici | 10h |
| Workspace | Tab presente | Collaborazione real-time, assegnazione task | 15h |
| SUAP | Pagine base | Flusso autorizzazione completo, integrazione SUAP nazionale | 15h |
| Notifiche | Tab presente | Push notifications (Firebase FCM), email (SendGrid/SES) | 8h |
| Hub | UI presente | Gestione completa negozi, servizi, prenotazioni | 10h |

### 6.2 Feature Nuove Necessarie

| Feature | Priorita' | Descrizione | Stima |
|---------|-----------|-------------|-------|
| Profilo Utente | CRITICO | Pagina /profilo con dati, preferenze, export, cancellazione | 8h |
| Notifiche Push | ALTO | Firebase Cloud Messaging + banner in-app | 6h |
| Email Transazionali | ALTO | Conferma registrazione, reset password, notifiche scadenze | 8h |
| Firma Digitale | ALTO | Integrazione per verbali e concessioni (CAD compliance) | 15h |
| Protocollo Digitale | ALTO | Numerazione atti, PEC, conservazione sostitutiva | 15h |
| Sistema Ricorsi | MEDIO | Ricorso online contro sanzioni | 10h |
| Calendario Mercati | MEDIO | Vista calendario con presenze, scadenze, eventi | 8h |
| Statistiche Pubbliche | MEDIO | Dashboard pubblica con dati aperti (open data) | 6h |

---

## FASE 7 — INFRASTRUTTURA (Settimana 8-10)

> Obiettivo: portare Infrastruttura da 7 a 10/10

### 7.1 PWA (Progressive Web App) — ALTO
**Azione:**
- Creare `public/manifest.json` con icone, nome, colori
- Implementare service worker con Workbox
- Cache strategy: network-first per API, cache-first per assets
- Splash screen e installabilita'
**Stima:** 6-8 ore

### 7.2 Internazionalizzazione (i18n) — MEDIO
**Azione:**
- Installare `react-i18next` + `i18next`
- Estrarre tutte le stringhe hardcoded in file di traduzione
- Lingue: IT (default), EN
- Selettore lingua nel footer
**Stima:** 15-20 ore (molte stringhe da estrarre)

### 7.3 Monitoring e Alerting — ALTO
**Azione:**
- Integrare Sentry per error tracking frontend + backend
- Health check endpoint con metriche dettagliate
- Alerting su: errori 5xx, latenza > 3s, DB connection failures
**Stima:** 4-6 ore

### 7.4 Backup e Disaster Recovery — ALTO
**Azione:**
- Backup automatico DB Neon (gia' incluso nel piano)
- Documentare procedura di recovery
- Test di restore periodico
**Stima:** 3-4 ore

### 7.5 Performance Optimization — MEDIO
**Azione:**
- Code splitting per route (lazy import pagine)
- Ottimizzare bundle size (analisi con vite-bundle-analyzer)
- Compressione gzip/brotli
- Image optimization (WebP, lazy loading)
**Stima:** 6-8 ore

---

## RIEPILOGO TIMELINE

```
Settimana 1-2:  FASE 1 — Sicurezza Critica          (~15 ore)
Settimana 2-3:  FASE 2 — Conformita' GDPR            (~30 ore)
Settimana 3-5:  FASE 3 — Accessibilita' AGID          (~40 ore)
Settimana 4-5:  FASE 4 — Protezione API/RBAC          (~20 ore)
Settimana 5-7:  FASE 5 — Test e Qualita' Codice       (~40 ore)
Settimana 6-10: FASE 6 — Completezza Funzionale       (~130 ore)
Settimana 8-10: FASE 7 — Infrastruttura               (~35 ore)
─────────────────────────────────────────────────────
TOTALE STIMATO:                                       ~310 ore
```

## PUNTEGGI TARGET POST-ROADMAP

| Area | Prima | Dopo | Note |
|------|-------|------|------|
| Sicurezza | 7.2 | 10/10 | Helmet + Rate Limit + CORS + CSP + Cookie hardening |
| Conformita' GDPR | 4 | 10/10 | Privacy + Consent + Export + Erasure + Retention |
| Accessibilita' | 3.5 | 10/10 | ARIA + Keyboard + Contrast + Form + Dichiarazione AGID |
| Completezza | 6.5 | 10/10 | Feature complete + flussi end-to-end |
| Qualita' codice | 6 | 10/10 | 60%+ test coverage + CI/CD + TypeScript strict |
| Infrastruttura | 7 | 10/10 | PWA + i18n + Monitoring + Performance |
| **MEDIA** | **5.7** | **10/10** | |

---

## PRIORITA' ASSOLUTE (le prime 10 cose da fare)

1. `pnpm add helmet` + configurare security headers
2. `pnpm add express-rate-limit` + rate limiting su /api
3. `pnpm add cors` + whitelist origin
4. Cambiare `sameSite: "lax"` nei cookie
5. Rimuovere email hardcoded da PermissionsContext.tsx
6. Rimuovere session token da localStorage
7. Proteggere tutti i router con `protectedProcedure`/`adminProcedure`
8. Creare pagina privacy policy
9. Creare cookie consent banner
10. Scrivere i primi 5 test critici (auth, RBAC, wallet)

> Queste 10 azioni coprono l'80% del gap di sicurezza e conformita'.
