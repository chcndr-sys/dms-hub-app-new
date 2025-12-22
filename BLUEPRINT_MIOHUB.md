# 🔑 BLUEPRINT MIO HUB - AGGIORNATO 22 DICEMBRE 2024

**DOCUMENTO DI CONTESTO PER NUOVE SESSIONI MANUS**

---

## 📋 INDICE

1. [Repository e Deploy](#-repository-e-deploy)
2. [Accesso Server Hetzner](#-accesso-server-hetzner)
3. [Database Neon PostgreSQL](#-database-neon-postgresql)
4. [Architettura Sistema Chat](#-architettura-sistema-chat)
5. [Schema Database agent_messages](#-schema-database-agent_messages)
6. [Flusso Messaggi e Mode](#-flusso-messaggi-e-mode)
7. [Logica di Rendering Frontend](#-logica-di-rendering-frontend)
8. [File Chiave da Conoscere](#-file-chiave-da-conoscere)
9. [Comandi Utili](#-comandi-utili)
10. [Agenti del Sistema](#-agenti-del-sistema)

---

## 🚀 REPOSITORY E DEPLOY

### Frontend (Vercel)
| Campo | Valore |
|-------|--------|
| **Repository** | `https://github.com/Chcndr/dms-hub-app-new` |
| **Branch** | `master` |
| **URL Produzione** | `https://dms-hub-app-new.vercel.app` |
| **Deploy** | Automatico su push a master |
| **Framework** | Vite + React + TypeScript + TailwindCSS |

### Backend (Hetzner)
| Campo | Valore |
|-------|--------|
| **Repository** | `https://github.com/Chcndr/mihub-backend-rest` |
| **Branch** | `master` |
| **URL Produzione** | `https://orchestratore.mio-hub.me` |
| **Deploy** | Manuale: `git pull` + `pm2 restart` |
| **Framework** | Node.js + Express |

### Flusso di Lavoro OBBLIGATORIO
```
1. Modifiche locali nel sandbox
2. git add -A && git commit -m "messaggio" && git push origin master
3. Per backend: SSH su Hetzner → git pull → pm2 restart mihub-backend
4. Per frontend: Vercel fa deploy automatico
```

**⚠️ MAI modificare direttamente sul server Hetzner!**

---

## 🖥️ ACCESSO SERVER HETZNER

| Campo | Valore |
|-------|--------|
| **IP** | `157.90.29.66` |
| **User** | `root` |
| **Chiave SSH** | `/home/ubuntu/.ssh/manus_hetzner_key` |
| **Percorso Backend** | `/root/mihub-backend-rest` |

### Comando SSH
```bash
ssh -i /home/ubuntu/.ssh/manus_hetzner_key root@157.90.29.66
```

### Deploy Backend (dopo push su GitHub)
```bash
ssh -i /home/ubuntu/.ssh/manus_hetzner_key root@157.90.29.66 'cd /root/mihub-backend-rest && git pull && pm2 restart mihub-backend'
```

---

## 💾 DATABASE NEON POSTGRESQL

| Campo | Valore |
|-------|--------|
| **Host** | `ep-bold-silence-adftsojg-pooler.c-2.us-east-1.aws.neon.tech` |
| **Database** | `neondb` |
| **User** | `neondb_owner` |
| **Password** | `npg_lYG6JQ5Krtsi` |
| **SSL** | `require` |

---

## 🏗️ ARCHITETTURA SISTEMA CHAT

### Viste Frontend
| Vista | Descrizione | Mode | Conversation ID |
|-------|-------------|------|-----------------|
| **Chat MIO** | Chat principale con orchestratore | `auto` | `mio-main` |
| **Vista 4 Agenti** | Mostra coordinamento MIO→Agenti | `auto` | `mio-{agent}-coordination` |
| **Chat Singola Manus** | Chat diretta con Manus | `direct` | `user-manus-direct` |
| **Chat Singola Abacus** | Chat diretta con Abacus | `direct` | `user-abacus-direct` |
| **Chat Singola GPT Dev** | Chat diretta con GPT Dev | `direct` | `user-gptdev-direct` |
| **Chat Singola Zapier** | Chat diretta con Zapier | `direct` | `user-zapier-direct` |

---

## 📊 SCHEMA DATABASE agent_messages

```sql
CREATE TABLE agent_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   varchar NOT NULL,    -- ID conversazione
  sender            varchar NOT NULL,    -- Chi ha inviato: 'user', 'mio', 'manus', 'abacus', 'gptdev', 'zapier'
  recipient         varchar,             -- Destinatario (opzionale)
  role              varchar NOT NULL,    -- 'user' | 'assistant'
  message           text NOT NULL,       -- Contenuto del messaggio
  agent             varchar,             -- Agente che ha risposto
  mode              varchar DEFAULT 'auto',  -- 'auto' | 'direct'
  meta              jsonb,               -- Metadati aggiuntivi
  tool_call_id      varchar,             -- ID chiamata tool (se presente)
  tool_name         varchar,             -- Nome tool usato
  tool_args         jsonb,               -- Argomenti tool
  error             boolean,             -- Flag errore
  created_at        timestamptz DEFAULT NOW()
);
```

### Valori Campi Chiave

| Campo | Valori Possibili | Descrizione |
|-------|------------------|-------------|
| **sender** | `user`, `mio`, `manus`, `abacus`, `gptdev`, `zapier` | Chi ha inviato il messaggio |
| **role** | `user`, `assistant` | Ruolo nel contesto LLM |
| **mode** | `auto`, `direct` | Modalità di routing |
| **agent** | `null`, `mio`, `manus`, `abacus`, `gptdev`, `zapier` | Agente che ha processato |

---

## 🔄 FLUSSO MESSAGGI E MODE

### Flusso Mode AUTO (User → MIO → Agente)

```
1. User scrive a MIO
   └→ Salvato: mio-main, sender='user', role='user', mode='auto'

2. MIO analizza e delega a Manus
   └→ Salvato: mio-manus-coordination, sender='mio', role='user', mode='auto'

3. Manus risponde
   └→ Salvato: mio-manus-coordination, sender='manus', role='assistant', mode='auto'
   └→ Salvato: mio-main, sender='manus', role='assistant', mode='auto'

4. MIO elabora e risponde all'utente
   └→ Salvato: mio-main, sender='mio', role='assistant', mode='auto'
```

### Flusso Mode DIRECT (User → Agente)

```
1. User scrive direttamente a Manus
   └→ Salvato: user-manus-direct, sender='user', role='user', mode='direct'

2. Manus risponde
   └→ Salvato: user-manus-direct, sender='manus', role='assistant', mode='direct'
```

---

## 🎨 LOGICA DI RENDERING FRONTEND

### Chat Principale MIO

**File**: `DashboardPA.tsx` (riga 4102)

```tsx
<span>da {msg.role === 'user' ? 'Tu' : msg.agentName?.toUpperCase() || 'MIO'}</span>
```

- Se `role === 'user'`, mostra **"Tu"**
- Altrimenti, mostra il nome dell'agente (es. "MANUS") o "MIO" come fallback

### Vista Singola (GPT Dev, Manus, Abacus, Zapier)

**File**: `DashboardPA.tsx` (riga 4368)

```tsx
<span>da {msg.role === 'user' ? 'Tu' : (msg.agent || 'agente')}</span>
```

- Se `role === 'user'`, mostra **"Tu"**
- Altrimenti, mostra il nome dell'agente (es. "gptdev") o "agente" come fallback

---

## 📁 FILE CHIAVE DA CONOSCERE

### Backend (mihub-backend-rest)

| File | Descrizione |
|------|-------------|
| `routes/orchestrator.js` | Endpoint principale `/api/mihub/orchestrator`, routing messaggi |
| `utils/direct_saver.js` | Salvataggio diretto messaggi nel database |
| `src/modules/orchestrator/database.js` | Funzioni database: `addMessage`, `saveDirectMessage`, `createConversation` |
| `src/modules/orchestrator/llm.js` | Chiamate agli agenti LLM (MIO, Manus, Abacus, GPT Dev) |
| `config/database.js` | Configurazione connessione PostgreSQL |

### Frontend (dms-hub-app-new)

| File | Descrizione |
|------|-------------|
| `api/mihub/get-messages.ts` | Endpoint Vercel per recuperare messaggi dal database |
| `api/mihub/orchestrator-proxy.ts` | Proxy per inoltrare messaggi all'orchestratore Hetzner |
| `client/src/contexts/MioContext.tsx` | Context React per chat MIO, gestisce invio/ricezione messaggi |
| `client/src/hooks/useAgentLogs.ts` | Hook per caricare messaggi agenti (Vista 4 + Chat Singole) |
| `client/src/pages/DashboardPA.tsx` | Pagina principale dashboard con tutte le chat |
| `client/src/api/orchestratorClient.ts` | Client per chiamare backend orchestrator |
| `client/src/lib/agentHelper.ts` | Helper per invio messaggi agli agenti |

---

## 🛠️ COMANDI UTILI

### Test API Backend
```bash
# Test MIO mode=auto
curl -s -X POST https://orchestratore.mio-hub.me/api/mihub/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"mode": "auto", "message": "Test", "conversationId": "mio-main"}' | jq .

# Test Manus mode=direct
curl -s -X POST https://orchestratore.mio-hub.me/api/mihub/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"mode": "direct", "targetAgent": "manus", "message": "Test", "conversationId": "user-manus-direct"}' | jq .
```

### Query Database
```bash
cd /home/ubuntu/mihub-backend-rest && node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'ep-bold-silence-adftsojg-pooler.c-2.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_lYG6JQ5Krtsi',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const result = await pool.query(\"
    SELECT conversation_id, sender, role, mode, LEFT(message, 50) as msg, created_at 
    FROM agent_messages 
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC
    LIMIT 20
  \");
  console.log(result.rows);
  await pool.end();
}
check();
"
```

### PM2 Logs
```bash
ssh -i /home/ubuntu/.ssh/manus_hetzner_key root@157.90.29.66 'pm2 logs mihub-backend --lines 100'
```

---

## 🤖 AGENTI DEL SISTEMA

| Agente | Stato | Funzione |
|--------|-------|----------|
| **MIO** | ✅ OK | Orchestratore principale, coordina gli altri agenti |
| **Manus** | ✅ OK | Navigazione web, esecuzione comandi SSH, file system |
| **Abacus** | ✅ OK | Query SQL, accesso database PostgreSQL/Neon |
| **GPT Dev** | ✅ OK | Accesso repository GitHub, lettura file, operazioni Git |
| **Zapier** | ❌ Errore | Chiave API invalida (da configurare) |

---

## 💳 WALLET / PAGOPA (NEW)

### Overview

Sistema di borsellino elettronico prepagato per operatori mercatali con integrazione **E-FIL Plug&Pay** per pagamenti PagoPA. Mercato pilota: **Comune di Grosseto**.

### Componenti

| File | Descrizione |
|------|-------------|
| `server/walletRouter.ts` | API tRPC per gestione wallet |
| `server/services/efilPagopaService.ts` | Integrazione SOAP E-FIL |
| `client/src/components/WalletPanel.tsx` | UI gestione wallet |
| `.env.efil.example` | Configurazione E-FIL |

### Tabelle Database

| Tabella | Descrizione |
|---------|-------------|
| `operatore_wallet` | Wallet per ogni impresa |
| `wallet_transazioni` | Storico movimenti |
| `tariffe_posteggio` | Tariffe per tipo posteggio |
| `avvisi_pagopa` | Avvisi PagoPA generati |

### Servizi E-FIL

| Servizio | Funzione |
|----------|----------|
| WSPayment | Pagamento spontaneo + checkout |
| WSFeed | Creazione avvisi PagoPA |
| WSDeliver | Verifica stato pagamenti |
| WSGeneratorPdf | PDF avviso/quietanza |
| WSPaymentNotify | Notifica fuori nodo |

### Flusso Check-in con Wallet

```
1. Operatore richiede check-in
2. Sistema verifica stato wallet
3. Sistema verifica saldo vs tariffa
4. Se OK: decurta e crea presenza
5. Se saldo < minimo: blocca wallet
6. Se bloccato: rifiuta check-in
```

### Configurazione

```bash
EFIL_BASE_URL=https://test.plugnpay.efil.it/plugnpay
EFIL_USERNAME=<user>
EFIL_PASSWORD=<pass>
EFIL_APPLICATION_CODE=<fornito da E-FIL>
EFIL_ID_GESTIONALE=DMS-GROSSETO
```

---

*Documento aggiornato il 22 Dicembre 2024 - Manus AI*
*Da allegare all'inizio di ogni nuova sessione di lavoro*
