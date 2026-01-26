# Progetto: Sistema di Monitoraggio Automatico Trasgressioni Mercato

**Versione:** 2.0  
**Data:** 26 Gennaio 2026  
**Autore:** Manus AI

---

## 1. Obiettivo

Creare un sistema automatico per monitorare le trasgressioni degli orari nel mercato, gestire le giustifiche, preparare verbali automatici e storicizzare i dati di ogni mercato. Il sistema deve essere configurabile per ogni tipo di trasgressione.

---

## 2. Architettura Proposta

Il sistema si basa su **4 nuovi componenti**:

| Componente | Posizione | Funzione |
| :--- | :--- | :--- |
| **Sotto-tab "Impostazioni Mercato"** | Gestione Mercati → Test Mercato | Configurazione orari e regole |
| **Pagina "Trasgressioni Automatiche"** | Controlli/Sanzioni → Nuovo sotto-tab | Visualizzazione notifiche automatiche |
| **Pagina "Giustifiche"** | Controlli/Sanzioni → Nuovo sotto-tab | Gestione giustifiche per uscite anticipate |
| **Pagina "Storico Mercati"** | Gestione Mercati → Nuovo sotto-tab | Archivio mercati conclusi |

### 2.1. Diagramma Architetturale

![Architettura Sistema Monitoraggio V2](./market_monitoring_architecture_v2.png)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GESTIONE MERCATI                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Sotto-tab: IMPOSTAZIONI MERCATO                                    │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │ Orari Presenza  │  │ Orari Spazzatura│  │ Orari Uscita    │     │   │
│  │  │ Verbale Auto: [ON]│  │ Verbale Auto: [OFF]│ │ Verbale Auto: [ON]│     │   │
│  │  │ Giorni Giustifica: 3│  │                   │ │ Giorni Giustifica: 5│     │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │   │
│  │           │                    │                    │              │   │
│  └───────────┼────────────────────┼────────────────────┼──────────────┘   │
│              │                    │                    │                  │
│              ▼                    ▼                    ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    TABELLA: market_settings                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ CRON JOB (ogni 5 min)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA AUTOMATICO (Backend Hetzner)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Verifica Orari vs Azioni Imprese                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │ Presenza fuori  │  │ Spazzatura fuori│  │ Uscita fuori    │     │   │
│  │  │ orario?         │  │ orario?         │  │ orario?         │     │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │   │
│  │           │ SÌ                 │ SÌ                 │ SÌ           │   │
│  │           ▼                    ▼                    ▼              │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              GENERA TRASGRESSIONE AUTOMATICA                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│              ┌─────────────────────┼─────────────────────┐                 │
│              ▼                     ▼                     ▼                 │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐      │
│  │ market_transgressions│ │ notifiche (PM/Impresa)│ │ pm_watchlist      │      │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD POLIZIA MUNICIPALE                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Sotto-tab: TRASGRESSIONI AUTOMATICHE                               │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Lista trasgressioni generate automaticamente                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Sotto-tab: GIUSTIFICHE                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ Lista uscite anticipate in attesa di giustifica             │   │   │
│  │  │ - Impresa: Mario Rossi (scadenza: 2 giorni)                 │   │   │
│  │  │ - Stato: In attesa certificato                              │   │   │
│  │  │ - Azione: [Visualizza Certificato] [Prepara Verbale]        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tabelle Database

### 3.1. Tabella `market_settings` (Aggiornata)

| Colonna | Tipo | Descrizione | Esempio |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | ID univoco | 1 |
| `market_id` | `INTEGER NOT NULL` | ID del mercato (FK a `markets`) | 5 |
| `presence_start_time` | `TIME NOT NULL` | Orario inizio marcatura presenza | 06:00 |
| `presence_end_time` | `TIME NOT NULL` | Orario fine marcatura presenza | 08:00 |
| `spunta_presence_start_time` | `TIME NOT NULL` | Orario inizio marcatura presenza spunta | 07:30 |
| `waste_disposal_start_time` | `TIME NOT NULL` | Orario inizio deposito spazzatura | 12:00 |
| `waste_disposal_end_time` | `TIME NOT NULL` | Orario fine deposito spazzatura | 13:00 |
| `exit_market_start_time` | `TIME NOT NULL` | Orario inizio uscita mercato | 13:00 |
| `exit_market_end_time` | `TIME NOT NULL` | Orario fine uscita mercato | 14:00 |
| `is_active` | `BOOLEAN DEFAULT TRUE` | Se le impostazioni sono attive | true |
| `justification_days` | `INTEGER DEFAULT 3` | Giorni per inviare giustifica | 3 |
| `auto_sanction_rules` | `JSONB` | Regole per verbali automatici | `{"USCITA_ANTICIPATA": true, "SPAZZATURA_TARDIVA": false}` |
| `created_at` | `TIMESTAMP DEFAULT NOW()` | Data creazione | 2026-01-26 10:00:00 |
| `updated_at` | `TIMESTAMP DEFAULT NOW()` | Data aggiornamento | 2026-01-26 10:00:00 |

### 3.2. Tabella `market_transgressions` (Aggiornata)

| Colonna | Tipo | Descrizione | Esempio |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | ID univoco | 1 |
| `market_id` | `INTEGER NOT NULL` | ID del mercato | 5 |
| `market_date` | `DATE NOT NULL` | Data del mercato | 2026-01-26 |
| `business_id` | `INTEGER NOT NULL` | ID dell'impresa | 38 |
| `transgression_type` | `VARCHAR(100) NOT NULL` | Tipo di trasgressione | USCITA_ANTICIPATA |
| `status` | `VARCHAR(50) DEFAULT 'PENDING'` | Stato (PENDING, JUSTIFIED, SANCTION_PREPARED, SANCTIONED, IGNORED) | PENDING |
| `justification_deadline` | `TIMESTAMP` | Scadenza per inviare giustifica | 2026-01-29 12:30:00 |
| `justification_file_path` | `VARCHAR(255)` | Path del file di giustifica | `/uploads/certificato.pdf` |
| `justification_status` | `VARCHAR(50)` | Stato giustifica (APPROVED, REJECTED) | NULL |
| `justification_notes` | `TEXT` | Note della PM sulla giustifica | Certificato valido |
| `sanction_id` | `INTEGER` | ID del verbale emesso | NULL |
| `created_at` | `TIMESTAMP DEFAULT NOW()` | Data creazione | 2026-01-26 12:30:00 |

---

## 4. Flusso Automatico (CRON Job Aggiornato)

Il CRON job esegue 2 task:

**Task 1: Rilevamento Trasgressioni (ogni 5 minuti)**
1. Rileva le trasgressioni come prima
2. Se la trasgressione richiede giustifica (es. USCITA_ANTICIPATA):
   - Imposta `status = 'PENDING'`
   - Calcola `justification_deadline`
   - Invia notifica all'impresa: "Invia certificato di giustifica"
3. Se la trasgressione NON richiede giustifica e `auto_sanction_rules` è attivo:
   - Prepara il verbale e imposta `status = 'SANCTION_PREPARED'`
   - Invia notifica alla PM: "Verbale pronto per invio"

**Task 2: Scadenza Giustifiche (ogni ora)**
1. Cerca le trasgressioni con `status = 'PENDING'` e `justification_deadline` scaduto
2. Per ogni trasgressione scaduta:
   - Prepara il verbale e imposta `status = 'SANCTION_PREPARED'`
   - Invia notifica alla PM: "Verbale pronto per invio"

---

## 5. Componenti Frontend (Aggiornati)

### 5.1. Sotto-tab "Impostazioni Mercato"

**Campi aggiuntivi:**
- **Selettori Attivazione Verbale Automatico**: ON/OFF per ogni tipo di trasgressione
- **Campo "Giorni per Giustifica"**: Numero di giorni per inviare il certificato

### 5.2. Pagina "Giustifiche"

**Posizione:** Controlli/Sanzioni → Nuovo sotto-tab "Giustifiche"

**Contenuto:**
- Lista trasgressioni in attesa di giustifica
- Stato: In attesa, Scaduta, Certificato inviato, Approvata, Rifiutata
- Pulsanti azione: "Visualizza Certificato", "Approva", "Rifiuta", "Prepara Verbale"

---

## 6. Fasi di Sviluppo

| Sprint | Durata | Attività |
| :--- | :--- | :--- |
| **Sprint 1** | 3 giorni | Backend: Tabelle DB aggiornate + Endpoint API |
| **Sprint 2** | 3 giorni | Frontend: Impostazioni Mercato + Giustifiche |
| **Sprint 3** | 2 giorni | CRON Job aggiornato + Storico Mercati |
| **Sprint 4** | 2 giorni | Test + Deploy + Integrazione |
