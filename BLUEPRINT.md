# 📘 DMS Hub System Blueprint

> **Auto-generated:** 10 febbraio 2026 alle ore 11:42  
> **Generator:** `scripts/generate_blueprint.cjs`

---

## 🎯 System Overview

**DMS Hub** è il sistema centrale per la gestione della Rete Mercati Made in Italy, con:

- **0 endpoint API** (TRPC + REST)
- **69 tabelle database**
- **Full Observability** con Guardian monitoring
- **Multi-agent orchestration** (MIO, Guardian, Zapier, ecc.)

---

## 🗄️ Database Schema

### Tables (69)

| Variable Name | Table Name |
|---------------|------------|
| `users` | `users` |
| `extendedUsers` | `extended_users` |
| `markets` | `markets` |
| `shops` | `shops` |
| `transactions` | `transactions` |
| `checkins` | `checkins` |
| `carbonCreditsConfig` | `carbon_credits_config` |
| `fundTransactions` | `fund_transactions` |
| `reimbursements` | `reimbursements` |
| `civicReports` | `civic_reports` |
| `products` | `products` |
| `productTracking` | `product_tracking` |
| `carbonFootprint` | `carbon_footprint` |
| `ecocredits` | `ecocredits` |
| `auditLogs` | `audit_logs` |
| `systemLogs` | `system_logs` |
| `userAnalytics` | `user_analytics` |
| `sustainabilityMetrics` | `sustainability_metrics` |
| `notifications` | `notifications` |
| `inspections` | `inspections` |
| `businessAnalytics` | `business_analytics` |
| `mobilityData` | `mobility_data` |
| `marketGeometry` | `market_geometry` |
| `stalls` | `stalls` |
| `vendors` | `vendors` |
| `concessions` | `concessions` |
| `vendorDocuments` | `vendor_documents` |
| `bookings` | `bookings` |
| `vendorPresences` | `vendor_presences` |
| `inspectionsDetailed` | `inspections_detailed` |
| `violations` | `violations` |
| `concessionPayments` | `concession_payments` |
| `customMarkers` | `custom_markers` |
| `customAreas` | `custom_areas` |
| `apiKeys` | `api_keys` |
| `apiMetrics` | `api_metrics` |
| `webhooks` | `webhooks` |
| `webhookLogs` | `webhook_logs` |
| `externalConnections` | `external_connections` |
| `mioAgentLogs` | `mio_agent_logs` |
| `hubLocations` | `hub_locations` |
| `hubShops` | `hub_shops` |
| `hubServices` | `hub_services` |
| `agentTasks` | `agent_tasks` |
| `agentProjects` | `agent_projects` |
| `agentBrain` | `agent_brain` |
| `systemEvents` | `system_events` |
| `dataBag` | `data_bag` |
| `agentMessages` | `agent_messages` |
| `agentContext` | `agent_context` |
| `operatoreWallet` | `operatore_wallet` |
| `walletTransazioni` | `wallet_transazioni` |
| `tariffePosteggio` | `tariffe_posteggio` |
| `avvisiPagopa` | `avvisi_pagopa` |
| `syncConfig` | `sync_config` |
| `syncJobs` | `sync_jobs` |
| `syncLogs` | `sync_logs` |
| `autorizzazioni` | `autorizzazioni` |
| `userRoles` | `user_roles` |
| `permissions` | `permissions` |
| `rolePermissions` | `role_permissions` |
| `userRoleAssignments` | `user_role_assignments` |
| `userSessions` | `user_sessions` |
| `accessLogs` | `access_logs` |
| `securityEvents` | `security_events` |
| `loginAttempts` | `login_attempts` |
| `ipBlacklist` | `ip_blacklist` |
| `complianceCertificates` | `compliance_certificates` |
| `securityDelegations` | `security_delegations` |

---

## 🔌 API Endpoints

### Services (0)

---

## 📁 Project Structure

### Server

```
server/
  📁 _core
    📄 context.ts
    📄 cookies.ts
    📄 dataApi.ts
    📄 env.ts
    📄 imageGeneration.ts
    📄 index.ts
    📄 llm.ts
    📄 map.ts
    📄 notification.ts
    📄 oauth.ts
    📄 sdk.ts
    📄 systemRouter.ts
    📄 trpc.ts
    📁 types
    📄 vite.ts
    📄 voiceTranscription.ts
  📁 api
    📁 github
  📄 db.ts
  📄 dmsHubRouter.ts
  📄 eventBus.ts
  📄 firebaseAuthRouter.ts
  📄 guardianRouter.ts
  📄 index.ts
  📄 integrationsRouter.ts
  📁 logs
  📄 mihubRouter.ts
  📄 mioAgentRouter.ts
  📄 routers.ts
  📁 services
    📄 apiInventoryService.ts
    📄 apiLogsService.ts
    📄 efilPagopaService.ts
    📄 tperService.ts
  📄 storage.ts
  📄 walletRouter.ts
```

### Client

```
client/src/
  📄 App.tsx
  📁 _core
    📁 hooks
  📁 api
    📄 authClient.ts
    📄 logsClient.ts
    📄 orchestratorClient.ts
    📄 securityClient.ts
    📄 suap.ts
  📁 components
    📄 AIChatBox.tsx
    📄 APIDashboardV2.tsx
    📄 BottomNav.tsx
    📄 ChatWidget.tsx
    📄 CivicReportsHeatmap.tsx
    📄 CivicReportsLayer.tsx
    📄 CivicReportsPanel.tsx
    📄 ClientiTab.tsx
    📄 ComuniPanel.tsx
    📄 ConnessioniV2.tsx
    📄 ControlliSanzioniPanel.tsx
    📄 DashboardLayout.tsx
    📄 DashboardLayoutSkeleton.tsx
    📄 ErrorBoundary.tsx
    📄 GISMap.tsx
    📄 GamingRewardsPanel.tsx
    📄 GestioneHubMapWrapper.tsx
    📄 GestioneHubNegozi.tsx
    📄 GestioneHubPanel.tsx
    📄 GestioneMercati.tsx
    📄 GuardianDebugSection.tsx
    📄 GuardianIntegrations.tsx
    📄 GuardianLogsSection.tsx
    📄 HealthDashboard.tsx
    📄 HeatmapLayer.tsx
    📄 HomeButtons.tsx
    📄 HubMapComponent.tsx
    📄 HubMapTest.tsx
    📄 HubMarketMapComponent.tsx
    📄 ImpersonationBanner.tsx
    📄 ImpreseQualificazioniPanel.tsx
    📄 Integrazioni.tsx
    📄 LegacyReportCards.tsx
    📄 LogDebug.tsx
    📄 LoginModal.tsx
    📄 LogsDebugReal.tsx
    📄 MIOAgent.tsx
    📄 MIOLogs.tsx
    📄 ManusDialog.tsx
    📄 Map.tsx
    📄 MapModal.tsx
    📄 MapWithTransportLayer.tsx
    📄 MappaHubMini.tsx
    📄 MappaItaliaComponent.tsx
    📄 MappaItaliaPubblica.tsx
    📄 MarketMapComponent.tsx
    📄 MessageContent.tsx
    📄 MobilityMap.tsx
    📄 NativeReportComponent.tsx
    📄 NavigationMode.tsx
    📄 NearbyPOIPopup.tsx
    📄 NearbyStopsPanel.tsx
    📄 NotificationsPanel.tsx
    📄 NuovoNegozioForm.tsx
    📄 PanicButton.tsx
    📄 PresenzeGraduatoriaPanel.tsx
    📄 ProtectedTab.tsx
    📄 RouteLayer.tsx
    📄 SecurityTab.tsx
    📄 SharedWorkspace.tsx
    📄 SharedWorkspace_old.tsx
    📄 ShopModal.tsx
    📄 StallNumbersOverlay.tsx
    📄 SuapPanel.tsx
    📄 SystemBlueprintNavigator.tsx
    📄 TransportLayerToggle.tsx
    📄 TransportStopsLayer.tsx
    📄 WalletPanel.tsx
    📄 ZoomFontUpdater.tsx
    📁 bus-hub
    📁 markets
    📁 mio
    📁 multi-agent
    📁 suap
    📁 ui
  📁 config
    📄 api.ts
    📄 links.ts
    📄 realEndpoints.ts
  📄 const.ts
  📁 contexts
    📄 AnimationContext.tsx
    📄 CivicReportsContext.tsx
    📄 FirebaseAuthContext.tsx
    📄 MioContext.tsx
    📄 PermissionsContext.tsx
    📄 ThemeContext.tsx
    📄 TransportContext.tsx
  📁 hooks
    📄 useAgentLogs.ts
    📄 useComposition.ts
    📄 useConversationPersistence.ts
    📄 useImpersonation.ts
    📄 useInternalTraces.ts
    📄 useMapAnimation.ts
    📄 useMobile.tsx
    📄 useNearbyPOIs.ts
    📄 useOrchestrator.ts
    📄 usePersistFn.ts
    📄 useSystemStatus.ts
  📁 lib
    📄 DirectMioClient.ts
    📄 agentHelper.ts
    📄 firebase.ts
    📄 geodesic.ts
    📄 mioOrchestratorClient.ts
    📄 stallStatus.ts
    📄 trpc.ts
    📄 utils.ts
  📄 main.tsx
  📁 pages
    📄 APITokensPage.tsx
    📄 AnagraficaPage.tsx
    📄 AppImpresaNotifiche.tsx
    📄 AuthCallback.tsx
    📄 CivicPage.tsx
    📄 ComponentShowcase.tsx
    📄 CouncilPage.tsx
    📄 DashboardImpresa.tsx
    📄 DashboardPA.tsx
    📄 GuardianDebug.tsx
    📄 GuardianEndpoints.tsx
    📄 GuardianLogs.tsx
    📄 Home.tsx
    📄 HomePage.tsx
    📄 HubMapTestPage.tsx
    📄 HubOperatore.tsx
    📄 LogDebugPage.tsx
    📄 Login.tsx
    📄 MapPage.tsx
    📄 MappaItaliaPage.tsx
    📄 MarketGISPage.tsx
    📄 NotFound.tsx
    📄 NuovoVerbalePage.tsx
    📄 PresentazionePage.tsx
    📄 PresenzePage.tsx
    📄 RoutePage.tsx
    📄 VetrinePage.tsx
    📄 WalletImpresaPage.tsx
    📄 WalletPaga.tsx
    📄 WalletPage.tsx
    📄 WalletStorico.tsx
    📁 api
    📄 mio.tsx
    📁 suap
  📁 utils
    📄 api.ts
    📄 mihubAPI.ts
```

### Scripts

- `generate_blueprint.cjs`
- `seed.js`
- `sync_api_docs.cjs`
- `test_agents_capabilities.cjs`

---

## 🤖 Agent Library

La cartella `.mio-agents/` contiene la conoscenza condivisa per gli agenti AI:

- **system_prompts.md** - Prompt e personalità degli agenti
- **tools_definition.json** - Tool disponibili per gli agenti
- **api_reference_for_agents.md** - Riferimento API semplificato

---

## 🔄 Aggiornamento

Per aggiornare questo blueprint e la documentazione:

```bash
npm run docs:update
```

Questo comando esegue:
1. `sync_api_docs.cjs` - Aggiorna `index.json` con endpoint reali
2. `generate_blueprint.cjs` - Rigenera questo file e `.mio-agents/`

---

**Generated by Manus AI** 🤖


---

## 🔐 Architettura di Autenticazione (v2.0 - Firebase)

Il sistema ora utilizza un modello di autenticazione ibrido che combina **Firebase Authentication** per i login social (Google, Apple) ed email, con l'integrazione esistente di **ARPA Regione Toscana** per SPID/CIE/CNS.

### Flusso di Autenticazione

1.  **Selezione Profilo**: L'utente sceglie il proprio ruolo (`Cittadino`, `Impresa`, `PA`).
2.  **Selezione Metodo**: 
    - Il **Cittadino** può scegliere tra Google, Apple, Email (gestiti da Firebase) o SPID (gestito da ARPA).
    - **Impresa** e **PA** sono indirizzati al flusso SPID/CIE/CNS di ARPA.
3.  **Autenticazione Firebase**: Per Google, Apple o Email, il client utilizza il **Firebase SDK** per completare l'autenticazione e ricevere un **ID Token**.
4.  **Sincronizzazione Backend**: L'ID Token viene inviato all'endpoint backend `POST /api/auth/firebase/sync`. Il backend:
    - Verifica la validità del token con **Firebase Admin SDK**.
    - Crea o aggiorna il profilo utente nel database MioHub.
    - Restituisce un profilo utente unificato con ruoli e permessi MioHub.
5.  **Sessione Client**: Il client riceve il profilo utente MioHub e lo salva nel `FirebaseAuthContext`, stabilendo la sessione.

### Provider di Autenticazione

| Provider | Tipo | Ruolo | Implementazione | Stato |
| :--- | :--- | :--- | :--- | :--- |
| **Google** | Social Login | `citizen` | Firebase SDK (Popup/Redirect) | ✅ **Completato** |
| **Apple** | Social Login | `citizen` | Firebase SDK (Popup/Redirect) | ✅ **Completato** |
| **Email/Password** | Credenziali | `citizen` | Firebase SDK | ✅ **Completato** |
| **SPID/CIE/CNS** | Identità Digitale | `citizen`, `business`, `pa` | ARPA Regione Toscana | ✳️ **Esistente** |

### Componenti Core

La nuova architettura si basa sui seguenti componenti:

| File | Scopo |
| :--- | :--- |
| **`client/src/lib/firebase.ts`** | Configura e inizializza il client Firebase. Esporta funzioni per login, logout, registrazione e reset password. |
| **`client/src/contexts/FirebaseAuthContext.tsx`** | Context React globale che gestisce lo stato utente, ascolta i cambiamenti di stato Firebase e orchestra la sincronizzazione con il backend. |
| **`client/src/components/LoginModal.tsx`** | Componente UI (v2.0) che integra i metodi di login Firebase e mantiene il flusso SPID esistente. |
| **`server/firebaseAuthRouter.ts`** | Router Express per il backend che gestisce la verifica dei token e la sincronizzazione degli utenti. |
| **`api/auth/firebase/sync.ts`** | Serverless function equivalente per il deploy su Vercel, garantendo la compatibilità. |

### Variabili d'Ambiente

Le seguenti variabili sono state aggiunte a `.env.production` e devono essere configurate nell'ambiente di deploy (Vercel):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_KEY` (per il backend, in formato JSON) 


---

## 🔧 Changelog Tecnico - Sessione 23-24 Febbraio 2026

### v8.17.3 → v8.17.5 - Fix Sicurezza, Performance e Stabilità

#### IDOR Fix (v8.17.3-v8.17.4)
- **25 endpoint backend** con validazione `comune_id` obbligatoria su POST/PUT/DELETE (`wallets.js`, `canone-unico.js`)
- **32 fetch frontend** wrappate con `addComuneIdToUrl()` per impersonation (`WalletPanel`, `GestioneMercati`, `SuapPanel`, `MarketCompaniesTab`)
- `comune_id` letto da `req.body` O `req.query` per flessibilità GET/POST
- GET endpoints: `comune_id` opzionale (super admin vede tutto), POST/PUT/DELETE: obbligatorio

#### Performance Fix
- **GET /api/imprese**: escluso `vetrina_immagine_principale` e `vetrina_gallery` dalla lista → risposta da 38MB a ~500KB (615x più veloce, da 3s a 0.27s)

#### Stats.js Fix (Errori Silenti dal 20/01/2026)
Le query in `stats.js` usavano nomi tabella/colonna errati fin dalla creazione. Il `safeQuery` helper mascherava gli errori restituendo 0.

| Prima (sbagliato) | Dopo (corretto) | Note |
|---|---|---|
| `tcc_transactions` | `operator_transactions` | Tabella TCC punti carbon credit |
| `presenze` + `data_presenza` | `vendor_presences` + `checkin_time` | Tabella presenze operatori |
| `amount` | `tcc_amount` | Colonna importo TCC in operator_transactions |
| `type = 'earn'/'spend'` | `type = 'issue'/'redeem'` | Tipi transazione TCC corretti |
| `user_id` in `wallet_transactions` | `user_id` in `operator_transactions` | user_id esiste solo in operator_transactions |

**Risultato:** Dashboard ora mostra dati TCC reali (3.750 issued, 4.633 redeemed) invece di 0.

#### Sicurezza Rate Limiter IPv6
- Fix `ERR_ERL_KEY_GEN_IPV6`: usato `ipKeyGenerator` di express-rate-limit v8.2.1 per gestire correttamente indirizzi IPv6 nel rate limiter anti brute-force

#### Health Monitor Fix
- Rimosso `const pool = pool` (auto-referenza circolare) in `health-monitor.js`

### Distinzione Wallet (IMPORTANTE)

| Sistema | Tabella | Tipo | Colonne chiave |
|---------|---------|------|----------------|
| **Wallet Operatore (€ euro)** | `wallets` + `wallet_transactions` | Costi suolo pubblico, depositi | `wallet_id`, `type` (COSTO_POSTEGGIO/PRESENZA_GIORNALIERA/DEPOSIT), `amount` |
| **TCC Cittadino (punti)** | `operator_transactions` | Token Carbon Credit earn/spend | `user_id`, `type` (issue/redeem), `tcc_amount`, `euro_amount` |
| **Fondo TCC Comunale** | `fund_transactions` | Movimenti fondo comunale | 4 righe |

### Inventario Tabelle Database (152 tabelle Neon)
Riferimento completo: `/home/ubuntu/inventario_tabelle_neon.md`

### v8.18.0 → v8.18.2 - Security Hardening + Fix Frontend (24/02/2026)

#### S1: Middleware Validazione Impersonazione Server-Side (v8.18.0)
- **Nuovo file:** `middleware/validateImpersonation.js`
- Ogni richiesta con `comune_id` su POST/PUT/DELETE richiede token Firebase + ruolo `super_admin`
- GET con `comune_id` passano sempre (solo filtro dati, backward compatible)
- Richieste senza `comune_id` passano sempre (595 fetch frontend non rotte)
- Tentativi bloccati loggati in `audit_logs` con IP, URL, metodo
- Montato globalmente in `index.js` prima di tutte le route API

#### S2: Endpoint /api/me (v8.18.0)
- **Nuovo file:** `routes/me.js`
- `GET /api/me/profile` — ritorna profilo utente autenticato (da token Firebase)
- `GET /api/me/impresa` — ritorna impresa dell'utente autenticato (anti-IDOR, no user_id in URL)
- Richiede header `Authorization: Bearer <token>`

#### Hotfix Middleware (v8.18.1)
- GET con `comune_id` bloccava l'impersonazione frontend → fix: solo POST/PUT/DELETE richiedono auth
- Il fix di Claude (`addComuneIdToUrl` su 70+ fetch) mandava `comune_id` su tutte le GET → middleware troppo restrittivo

#### Merge Fix Claude Frontend (v8.18.1)
- **27 file modificati**, fast-forward merge pulito
- 70+ fetch wrappate con `addComuneIdToUrl()` per multi-tenant
- URL hardcoded rimossi (`localhost:3001` → `API_BASE_URL`)
- Validazione `parseInt` su `useImpersonation.ts`
- `market_id=1` hardcoded rimosso da `MapPage.tsx`
- TypeScript check e build passano senza errori

#### Fix Mappa Rete Italia (v8.18.1)
- `GestioneHubMapWrapper.tsx`: rimosso `addComuneIdToUrl` da tutte le fetch di loadData
- La vista mappa rete hub/mercati è pubblica — mostra TUTTI i mercati di tutta Italia, non solo quelli del comune impersonato

#### Fix SSO SUAP Indicatori (v8.18.2)
- `SuapPanel.tsx`: grid da `grid-cols-6` a `grid-cols-5` → i 5 indicatori si distribuiscono su tutta la larghezza

#### Fix Segnalazioni Civiche (v8.18.2)
- `CivicReportsPanel.tsx`: rimosso `addComuneIdToUrl` dalle fetch che già avevano `comune_id` manuale
- Il doppio `comune_id=1&comune_id=1` causava errore PostgreSQL `invalid input syntax for type integer` (riceveva array `{1,1}`)
- Le 2 segnalazioni resolved di Grosseto ora vengono caricate correttamente

#### Fix Verbale Data/Ora (v8.18.2)
- `market-settings.js`: il CRON usava `T00:00:00` hardcoded → ora usa `detection_time_local` (orario reale rilevamento)
- `verbali.js`: PDF usa `ora_violazione` dal JSON e `timeZone: 'Europe/Rome'`
- Fallback chain: `checkin_local` → `detection_time_local` → `'08:00'`

### Tag Stabili

| Tag | Commit | Data | Descrizione |
|-----|--------|------|-------------|
| `stable-v8.17.5-pre-claude-merge` | FE: `d23203a` / BE: `c4b88ec` | 24/02 04:14 | Punto di ripristino pre-merge Claude |
| `stable-v8.18.0-security-hardened` | BE: `502d1ac` | 24/02 06:30 | Post middleware impersonazione + /api/me |

### Architettura Sicurezza Backend (v8.18.0+)

```
Richiesta HTTP → CORS → Rate Limiter (IPv6 safe) → validateImpersonation middleware
                                                      ↓
                                          Ha comune_id? → NO → passa (backward compatible)
                                                      ↓ SÌ
                                          È GET/HEAD? → SÌ → passa (solo filtro dati)
                                                      ↓ NO (POST/PUT/DELETE)
                                          Ha token? → NO → 401 BLOCCATO + audit_log
                                                      ↓ SÌ
                                          Token valido? → Decodifica email → Cerca utente
                                                      ↓
                                          È super_admin o ha accesso al comune? → SÌ → passa
                                                                                 → NO → 403 BLOCCATO
```

### Distinzione Wallet (IMPORTANTE)

| Sistema | Tabella Transazioni | Tipo | Colonne chiave |
|---------|-------------------|------|----------------|
| **Wallet Operatore (€ euro)** | `wallet_transactions` | Costi suolo pubblico, depositi | `wallet_id`, `type` (COSTO_POSTEGGIO/PRESENZA_GIORNALIERA/DEPOSIT), `amount` |
| **TCC Cittadino (punti)** | `operator_transactions` | Token Carbon Credit issue/redeem | `user_id`, `type` (issue/redeem), `tcc_amount`, `euro_amount` |
| **TCC Legacy v1** | `transactions` | Vecchio sistema TCC (118 righe) | `user_id`, `shop_id`, `type` (earn/spend), `amount` |
| **Fondo TCC Comunale** | `fund_transactions` | Movimenti fondo comunale | 4 righe |

### Stato Allineamento (24/02/2026 ore 17:30)
- **Backend**: GitHub = Hetzner → commit `708601f` (fix verbali orario reale)
- **Frontend**: GitHub = Vercel → commit `5c6818a` (fix SUAP + segnalazioni)
- **Branch Claude**: `claude/review-production-fixes-3sUvQ` → mergiato in master, allineato a `fd03f12`
