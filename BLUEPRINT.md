# 📘 DMS Hub System Blueprint

> **Auto-generated:** 22 dicembre 2024 alle ore 11:30  
> **Generator:** `scripts/generate_blueprint.cjs`  
> **Last Update:** Wallet/PagoPA Integration

---

## 🎯 System Overview

**DMS Hub** è il sistema centrale per la gestione della Rete Mercati Made in Italy, con:

- **109+ endpoint API** (TRPC + REST)
- **72 tabelle database**
- **Full Observability** con Guardian monitoring
- **Multi-agent orchestration** (MIO, Guardian, Zapier, ecc.)
- **💳 Wallet/PagoPA** - Borsellino elettronico operatori con integrazione E-FIL Plug&Pay

---

## 🗄️ Database Schema

### Tables (68)

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
| `comuni` | `comuni` |
| `settori_comune` | `settori_comune` |
| `imprese` | `imprese` |
| `qualificazioni` | `qualificazioni` |
| `qualification_types` | `qualification_types` |
| `operatoreWallet` | `operatore_wallet` |
| `walletTransazioni` | `wallet_transazioni` |
| `tariffePosteggio` | `tariffe_posteggio` |
| `avvisiPagopa` | `avvisi_pagopa` |

---

## 🔌 API Endpoints

### Services (4)

### undefined

**Base URL:** `undefined`  
**Endpoints:** 68

**Breakdown:** POST: 11, GET: 57

### undefined

**Base URL:** `undefined`  
**Endpoints:** 4

**Breakdown:** POST: 2, GET: 2

### undefined

**Base URL:** `undefined`  
**Endpoints:** 14

**Breakdown:** GET: 8, POST: 6

### undefined

**Base URL:** `undefined`  
**Endpoints:** 8

**Breakdown:** GET: 5, PUT: 1, POST: 1, DELETE: 1

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
    📄 efilPagopaService.ts    # 🆕 Integrazione E-FIL PagoPA
    📄 tperService.ts
  📄 storage.ts
  📄 walletRouter.ts           # 🆕 API Wallet operatori
```

### Client

```
client/src/
  📄 App.tsx
  📁 _core
    📁 hooks
  📁 api
    📄 logsClient.ts
    📄 orchestratorClient.ts
  📁 components
    📄 AIChatBox.tsx
    📄 APIDashboardV2.tsx
    📄 BottomNav.tsx
    📄 ChatWidget.tsx
    📄 ComuniPanel.tsx
    📄 ConnessioniV2.tsx
    📄 DashboardLayout.tsx
    📄 DashboardLayoutSkeleton.tsx
    📄 ErrorBoundary.tsx
    📄 GISMap.tsx
    📄 GestioneHubNegozi.tsx
    📄 GestioneMercati.tsx
    📄 GuardianDebugSection.tsx
    📄 GuardianIntegrations.tsx
    📄 GuardianLogsSection.tsx
    📄 HomeButtons.tsx
    📄 Integrazioni.tsx
    📄 LogDebug.tsx
    📄 LogsDebugReal.tsx
    📄 MIHUBDashboard.tsx
    📄 MIOAgent.tsx
    📄 MIOLogs.tsx
    📄 ManusDialog.tsx
    📄 Map.tsx
    📄 MapModal.tsx
    📄 MarketMapComponent.tsx
    📄 MessageContent.tsx
    📄 MobilityMap.tsx
    📄 NotificationsPanel.tsx
    📄 PanicButton.tsx
    📄 WalletPanel.tsx          # 🆕 Gestione Wallet operatori
    📄 RouteLayer.tsx
    📄 SharedWorkspace.tsx
    📄 SharedWorkspace_old.tsx
    📄 ShopModal.tsx
    📄 StallNumbersOverlay.tsx
    📄 ZoomFontUpdater.tsx
    📁 markets
    📁 mio
    📁 multi-agent
    📁 ui
  📁 config
    📄 api.ts
    📄 links.ts
    📄 realEndpoints.ts
  📄 const.ts
  📁 contexts
    📄 MioContext.tsx
    📄 ThemeContext.tsx
  📁 hooks
    📄 useAgentLogs.ts
    📄 useComposition.ts
    📄 useConversationPersistence.ts
    📄 useInternalTraces.ts
    📄 useMobile.tsx
    📄 useOrchestrator.ts
    📄 usePersistFn.ts
    📄 useSystemStatus.ts
  📁 lib
    📄 DirectMioClient.ts
    📄 agentHelper.ts
    📄 mioOrchestratorClient.ts
    📄 stallStatus.ts
    📄 trpc.ts
    📄 utils.ts
  📄 main.tsx
  📁 pages
    📄 APITokensPage.tsx
    📄 CivicPage.tsx
    📄 ComponentShowcase.tsx
    📄 CouncilPage.tsx
    📄 DashboardPA.tsx
    📄 GuardianDebug.tsx
    📄 GuardianEndpoints.tsx
    📄 GuardianLogs.tsx
    📄 Home.tsx
    📄 HomePage.tsx
    📄 HubOperatore.tsx
    📄 LogDebugPage.tsx
    📄 MIHUBPage.tsx
    📄 MapPage.tsx
    📄 MarketGISPage.tsx
    📄 NotFound.tsx
    📄 RoutePage.tsx
    📄 VetrinePage.tsx
    📄 WalletPage.tsx
    📁 api
    📄 mio.tsx
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

## 💳 Wallet/PagoPA System (NEW)

### Architettura

Il sistema Wallet/PagoPA permette la gestione del borsellino elettronico prepagato per gli operatori mercatali, con integrazione **E-FIL Plug&Pay** per i pagamenti PagoPA.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Operatore     │────▶│   DMS Hub       │────▶│   E-FIL         │
│   Mercatale     │     │   (Wallet API)  │     │   Plug&Pay      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  Ricarica Wallet      │  WSPayment/WSFeed     │
        │──────────────────────▶│──────────────────────▶│
        │                       │                       │
        │  Check-in Mercato     │  Verifica Saldo       │
        │──────────────────────▶│  + Decurtazione       │
        │                       │                       │
```

### Tabelle Database

| Tabella | Descrizione |
|---------|-------------|
| `operatore_wallet` | Wallet per ogni impresa/operatore |
| `wallet_transazioni` | Storico ricariche e decurtazioni |
| `tariffe_posteggio` | Tariffe giornaliere per tipo posteggio |
| `avvisi_pagopa` | Avvisi PagoPA generati |

### API Endpoints (`/api/wallet/...`)

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `stats` | GET | Statistiche dashboard wallet |
| `list` | GET | Lista tutti i wallet |
| `getById` | GET | Dettaglio wallet |
| `create` | POST | Crea nuovo wallet |
| `updateStatus` | POST | Blocca/sblocca wallet |
| `ricarica` | POST | Effettua ricarica |
| `decurtazione` | POST | Effettua decurtazione |
| `generaAvvisoPagopa` | POST | Genera avviso PagoPA |
| `avviaPagamentoPagopa` | POST | Avvia pagamento immediato |
| `verificaPagamento` | GET | Verifica stato IUV |
| `generaPdfAvviso` | GET | PDF avviso |
| `generaPdfQuietanza` | GET | PDF quietanza |
| `tariffe` | GET | Lista tariffe posteggio |
| `verificaSaldoPresenza` | GET | Verifica saldo per check-in |

### Integrazione E-FIL Plug&Pay

| Servizio SOAP | Funzione |
|---------------|----------|
| **WSPayment** | Pagamento spontaneo + checkout |
| **WSFeed** | Creazione posizione debitoria (avviso) |
| **WSDeliver** | Verifica stato + ricerca giornaliera |
| **WSGeneratorPdf** | Generazione PDF avviso/quietanza |
| **WSPaymentNotify** | Notifica pagamento "Fuori Nodo" |

### Configurazione

Variabili ambiente richieste (vedi `.env.efil.example`):

```bash
EFIL_BASE_URL=https://test.plugnpay.efil.it/plugnpay
EFIL_USERNAME=<user>
EFIL_PASSWORD=<pass>
EFIL_APPLICATION_CODE=<fornito da E-FIL>
EFIL_ID_GESTIONALE=DMS-GROSSETO
DMS_PAGOPA_RETURN_URL=https://miohub.app/payments/return
DMS_PAGOPA_CALLBACK_URL=https://miohub.app/api/wallet/callback
```

### Flusso Check-in con Wallet

1. Operatore richiede check-in al mercato
2. Sistema verifica stato wallet (ATTIVO/BLOCCATO/SOSPESO)
3. Sistema ottiene tariffa posteggio per tipo
4. Sistema verifica saldo sufficiente
5. Se OK: decurta importo e crea presenza
6. Se saldo < minimo: blocca wallet automaticamente
7. Se wallet bloccato: rifiuta check-in

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
