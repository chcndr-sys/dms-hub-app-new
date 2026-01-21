# 📘 DMS Hub System Blueprint

> **Last Updated:** 27 dicembre 2025
> **Status:** Verified & Audited

---

## 🎯 System Overview

**DMS Hub** è l'ecosistema digitale centralizzato per la gestione dei mercati rionali, fiere e commercio su aree pubbliche. Il sistema orchestra una rete complessa di attori (Comuni, Operatori, Cittadini, Polizia Locale) attraverso un'architettura a microservizi integrati.

### Core Capabilities
*   **Gestione Mercati & GIS**: Mappatura geospaziale precisa di posteggi, aree mercatali e vincoli.
*   **Wallet Operatori**: Sistema finanziario interno per pagamenti, ricariche e decurtazioni automatiche (PagoPA).
*   **Multi-Agent Orchestration**: Ecosistema di agenti AI (MIO, Guardian, Manus) per automazione e monitoraggio.
*   **Integrazioni Esterne**: Connettori attivi con TPER (Mobilità), ARPAE (Meteo/Ambiente), e Gestionale Enti.

---

## 🗄️ Database Architecture (57 Tables)

Il database PostgreSQL è strutturato in 6 domini logici principali:

### 1. Core & Auth
| Table | Description |
|-------|-------------|
| `users` | Gestione identità e ruoli (Admin, User, Operator) |
| `extended_users` | Profili arricchiti con preferenze mobilità e sostenibilità |
| `api_keys` | Gestione accessi per applicazioni terze |

### 2. Market Management (DMS Core)
| Table | Description |
|-------|-------------|
| `markets` | Anagrafica mercati con configurazioni orari e mobilità |
| `market_geometry` | Dati GIS (GeoJSON) per planimetrie e aree |
| `stalls` | Posteggi singoli con stato (free, occupied, reserved) |
| `bookings` | Prenotazioni posteggi (spunta) con scadenza temporale |
| `vendors` | Anagrafica operatori commerciali |
| `vendor_presences` | Registro storico presenze e check-in/out |
| `concessions` | Titoli autorizzativi a lungo termine |

### 3. Financial & Wallet
| Table | Description |
|-------|-------------|
| `operatore_wallet` | Borsellino elettronico prepagato per ogni impresa |
| `wallet_transazioni` | Ledger immutabile di ricariche e decurtazioni |
| `avvisi_pagopa` | Integrazione pagamenti PA (IUV, Ricevute) |
| `tariffe_posteggio` | Configurazione dinamica prezzi per mercato/tipo |

### 4. Sustainability & Civic
| Table | Description |
|-------|-------------|
| `carbon_credits_config` | Regole calcolo crediti CO2 |
| `ecocredits` | Token di sostenibilità guadagnati dai cittadini |
| `civic_reports` | Segnalazioni cittadine geolocalizzate |
| `mobility_data` | Dati real-time TPER (fermate, linee, occupazione) |

### 5. Multi-Agent System (MIHUB)
| Table | Description |
|-------|-------------|
| `agent_tasks` | Coda lavori asincroni per agenti AI |
| `agent_brain` | Memoria a lungo termine e contesto condiviso |
| `system_events` | Event bus per trigger e reazioni automatiche |
| `guardian_logs` | Audit trail di sicurezza e monitoraggio API |

### 6. Integrations & Sync
| Table | Description |
|-------|-------------|
| `sync_jobs` | Stato sincronizzazioni con gestionali esterni |
| `webhooks` | Configurazione notifiche push verso sistemi terzi |
| `external_connections` | Health check servizi esterni (ARPAE, TPER) |

---

## 🔌 API Architecture (tRPC + REST)

Il backend espone **130+ endpoint** organizzati in router tematici:

### `notificheRouter` (Sistema Notifiche v3.47.0)
*   **Filtri Messaggi**: Aggiunti filtri (Tutti/Inviati/Ricevuti) per PA e Imprese.
*   **Stato Lettura**: Implementato click per segnare come letto e icone busta aperta/chiusa.
*   **Nuovo Endpoint**: Aggiunto `PUT /api/notifiche/risposte/:id/letta` per salvare lo stato di lettura.
*   **Correzione Badge**: Il badge notifiche ora conta solo le risposte non lette.

### `dmsHubRouter` (Core Business Logic)
*   **Markets**: Import Slot Editor v3, Auto-import GIS, Listing con statistiche real-time.
*   **Stalls**: Gestione stati posteggi, assegnazione dinamica.
*   **Bookings**: Flow prenotazione spunta -> Verifica Wallet -> Check-in -> Presenza.
*   **Vendors**: CRUD operatori, Profilo completo (Documenti, Concessioni, Verbali).
*   **Inspections**: Flow Polizia Locale (Controllo -> Verbale -> Sanzione).

### `walletRouter` (Financial)
*   **Operations**: Ricarica, Decurtazione, Saldo, Storico Transazioni.
*   **PagoPA**: Generazione IUV, Verifica Pagamento, Riconciliazione.

### `integrationsRouter` (External Systems)
*   **TPER**: Sync fermate e orari real-time.
*   **Guardian**: Monitoraggio sicurezza e rate limiting.
*   **MIO Agent**: Interfaccia diretta con l'orchestrazione AI.

---

## 💻 Frontend Architecture (React 19 + Vite)

L'applicazione client è una Single Page Application (SPA) complessa divisa in moduli:

### Modifiche Recenti (Gennaio 2026)
*   **Gestione Mercati**:
    *   Corretto conteggio posteggi (182 -> 160) filtrando per `geometry_geojson`.
    *   Risolto problema reset lista presenze al cambio mercato.
    *   Corretta query per mostrare importo corretto nella spunta.
    *   "Inizia Mercato" ora azzera TUTTE le presenze per test più puliti.

### 1. Dashboard PA (`/dashboard-pa`)
Il centro di controllo principale per l'amministrazione.
*   **Tabs**: Overview, Mercati, Operatori, GIS, Wallet, Sostenibilità, Logs.
*   **Components**:
    *   `MarketMapComponent`: Render GIS interattivo dei mercati.
    *   `GestioneMercati`: Pannello operativo per assegnazione posteggi.
    *   `WalletPanel`: Gestione finanziaria operatori.
    *   `GuardianLogsSection`: Monitoraggio sicurezza real-time.

### 2. Hub Operatore (`/hub-operatore`)
Interfaccia mobile-first per gli operatori commerciali.
*   **Features**: Check-in QR, Visualizzazione Saldo Wallet, Storico Presenze.

### 3. Public & Civic (`/`, `/mappa`, `/civic`)
Interfacce cittadino per consultazione e partecipazione.
*   **MapPage**: Mappa pubblica mercati e servizi.
*   **CivicPage**: Invio segnalazioni e consultazione impatto ambientale.

---

## ⚠️ Discrepancy Report & Action Items

Dall'audit approfondito sono emerse le seguenti discrepanze tra codice e documentazione precedente:

1.  **QR Scanner**: Il codice conteneva abbozzi di un QR scanner lato client non pienamente integrato con il flow di check-in del backend.
    *   *Action*: Rimossa priorità, focus su flow check-in manuale/assistito via Dashboard PA.
2.  **Sync TPER**: L'integrazione TPER è presente ma richiede configurazione puntuale dei job di sync nel DB (`sync_config`).
3.  **Slot Editor**: Il sistema supporta l'import da "Slot Editor v3" (formato JSON complesso), essenziale per il popolamento iniziale dei mercati.

---

**Generated by Manus AI** - Deep Dive Audit Completed
