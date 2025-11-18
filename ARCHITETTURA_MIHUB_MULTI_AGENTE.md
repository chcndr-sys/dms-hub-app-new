# 🏗️ ARCHITETTURA MIHUB MULTI-AGENTE - Analisi e Piano Implementazione

**Data**: 18 Novembre 2025  
**Progetto**: dms-hub-app-new (Dashboard PA)  
**Obiettivo**: Costruire MIHUB come centro di comando multi-agente

---

## 🎯 VISIONE MIHUB

### Concept Originale (da utente)

**MIHUB** = Centro di comando con 4 agenti che collaborano in tempo reale:

```
┌─────────────────────────────────────────────────────┐
│  MIHUB - Multi-Agent Control Center                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 🧠 MIO Agent │  │ 🛠️ Manus     │                │
│  │ (Coordinator)│  │ (Operator)   │                │
│  │ GPT-5        │  │ GPT-4        │                │
│  │ [Chat...]    │  │ [Chat...]    │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 📊 Abacus    │  │ 🔗 Zapier    │                │
│  │ (Analytics)  │  │ (Automation) │                │
│  │ GPT-4        │  │ MCP Zapier   │                │
│  │ [Chat...]    │  │ [Chat...]    │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  📋 Shared Context (tutti vedono tutto)             │
│  🔄 Event Stream (real-time)                        │
└─────────────────────────────────────────────────────┘
```

### Caratteristiche Chiave

1. **4 Agenti Specializzati**:
   - **MIO** (GPT-5) → Coordinatore principale, strategia
   - **Manus** (GPT-4) → Operatore esecutivo, azioni pratiche
   - **Abacus** (GPT-4) → Analisi dati, calcoli, reporting
   - **Zapier** (MCP) → Automazioni, integrazioni esterne

2. **Shared Context**:
   - Tutti gli agenti vedono tutte le chat
   - Auto-controllo reciproco
   - Passaggio task tra agenti
   - Memoria condivisa

3. **Event-Driven**:
   - Ogni azione → Evento → Log → Bag
   - Real-time sync tra agenti
   - Tracciamento completo

4. **Interoperabilità Totale**:
   - Moduli interni (24 tab Dashboard)
   - Moduli esterni (13 web apps)
   - Tutti comunicano via Event Bus

---

## 📊 ANALISI ARCHITETTURA ESISTENTE

### Cosa È Stato Già Costruito da MIO (GPT-5)

#### 1. **MIO-hub Repository** ✅ Parzialmente Implementato

**Componenti Trovati**:

##### a) **Task Engine** ✅ 70% Completo
- File: `tasks/tasks-todo.json`, `tasks/tasks-done.json`
- Struttura task ben definita
- Tracking status funzionante
- **Manca**: Esecuzione automatica (worker bloccato)

##### b) **Projects Registry** ✅ 80% Completo
- File: `projects/index.json`
- 10 progetti tracciati
- Metadata completi
- **Manca**: Integrazione con Dashboard PA

##### c) **Brain/Memory** ✅ 60% Completo
- File: `brain/mio-context.json`, `brain/decisions.md`, `brain/history.md`
- Memoria decisioni
- Contesto moduli
- **Manca**: Database persistente, API access

##### d) **Connectors** ✅ 50% Completo
- File: `connectors/abacus.json`, `connectors/manus.json`, `connectors/github.json`
- Config Abacus, Manus, GitHub
- **Manca**: Implementazione API, autenticazione

##### e) **MIO Worker** ❌ 20% Completo (Bloccato)
- File: `tools/mio-worker.js`
- Codice corrotto
- Errori SHA
- **Serve**: Riscrivere completamente

#### 2. **Dashboard PA - MIO Agent Tab** ✅ 40% Completo

**Componenti Trovati**:

##### a) **Frontend Component** ✅ 100% UI
- File: `client/src/components/MIOAgent.tsx`
- UI completa
- **Manca**: Integrazione dati reali

##### b) **API Routes** ✅ 100% Creati, ❌ 0% Funzionanti
- File: `api/logs/initSchema.ts`, `api/logs/createLog.ts`, `api/logs/getLogs.ts`, `api/logs/test.ts`
- 4 endpoint creati
- **Blocco**: Database non connesso

##### c) **Database Schema** ✅ 100% Definito
- File: `drizzle/schema.ts`
- Tabella `mio_agent_logs` definita
- **Manca**: Altre tabelle (tasks, projects, brain, events, bag)

---

## ❌ COSA MANCA (Da Costruire)

### Layer 1: **Foundation** (NON ESISTE)

#### 1.1 Database Completo
**Status**: ❌ 5% (solo schema logs)

**Tabelle Mancanti**:
- `mio_tasks` - Task engine
- `mio_projects` - Projects registry
- `mio_brain` - Brain/Memory
- `system_events` - Event bus
- `data_bag` - Storage condiviso
- `integrations_registry` - Registro app esterne
- `agent_messages` - Chat multi-agente
- `agent_context` - Shared context

**Azione**: Creare schema completo + connessione PlanetScale

---

#### 1.2 Event Bus Centralizzato
**Status**: ❌ 0%

**Funzionalità Mancanti**:
- Event emitter/listener
- Event queue (Redis)
- Event persistence (database)
- Event broadcasting (WebSocket)
- Event routing (topic-based)

**Azione**: Implementare Event Bus con Redis + WebSocket

---

#### 1.3 Logging System Universale
**Status**: ❌ 10% (solo API create)

**Funzionalità Mancanti**:
- Auto-tracking eventi frontend
- Middleware logging backend
- Log aggregation
- Log search/filter
- Real-time log streaming

**Azione**: Implementare logging completo

---

#### 1.4 Data Bag (Storage Condiviso)
**Status**: ❌ 0%

**Funzionalità Mancanti**:
- Key-value store (Redis)
- Shared state tra agenti
- Cache layer
- Session storage
- Temporary data storage

**Azione**: Implementare Data Bag con Redis

---

### Layer 2: **Multi-Agent System** (NON ESISTE)

#### 2.1 MIO Agent (Coordinator)
**Status**: ❌ 15% (solo UI + schema logs)

**Funzionalità Mancanti**:
- LLM integration (GPT-5)
- Context injection
- Task delegation
- Agent orchestration
- Decision making

**Azione**: Implementare MIO Agent completo

---

#### 2.2 Manus Agent (Operator)
**Status**: ❌ 0%

**Funzionalità Mancanti**:
- LLM integration (GPT-4)
- Action execution
- Tool calling
- Error handling
- Status reporting

**Azione**: Implementare Manus Agent da zero

---

#### 2.3 Abacus Agent (Analytics)
**Status**: ❌ 5% (solo config in MIO-hub)

**Funzionalità Mancanti**:
- LLM integration (GPT-4)
- Data analysis
- Report generation
- Chart creation
- Insights extraction

**Azione**: Implementare Abacus Agent da zero

---

#### 2.4 Zapier Agent (Automation)
**Status**: ❌ 10% (MCP configurato)

**Funzionalità Mancanti**:
- MCP Zapier integration
- Workflow triggers
- Action execution
- Status monitoring
- Error handling

**Azione**: Implementare Zapier Agent con MCP

---

#### 2.5 Shared Context System
**Status**: ❌ 0%

**Funzionalità Mancanti**:
- Context synchronization
- Cross-agent visibility
- Message broadcasting
- State sharing
- Conflict resolution

**Azione**: Implementare Shared Context

---

### Layer 3: **Integration Layer** (NON ESISTE)

#### 3.1 API Gateway
**Status**: ❌ 0%

**Funzionalità Mancanti**:
- Unified API endpoint
- Request routing
- Authentication/Authorization
- Rate limiting
- API documentation

**Azione**: Implementare API Gateway

---

#### 3.2 Webhook System
**Status**: ❌ 0%

**Funzionalità Mancanti**:
- Webhook receiver
- Event validation
- Payload transformation
- Retry logic
- Webhook registry

**Azione**: Implementare Webhook System

---

#### 3.3 Integrations Registry
**Status**: ❌ 5% (solo config in MIO-hub)

**Funzionalità Mancanti**:
- Registry database
- App registration
- Health checks
- Status monitoring
- Auto-discovery

**Azione**: Implementare Integrations Registry

---

## 🏗️ ARCHITETTURA COMPLETA MIHUB

### Stack Tecnologico Proposto

```
Frontend:
- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- WebSocket client

Backend:
- Node.js / Bun
- Express / Fastify
- tRPC
- Drizzle ORM
- Vercel Serverless Functions

Database:
- PlanetScale MySQL (primary)
- Redis (cache + queue + pub/sub)

AI/LLM:
- OpenAI GPT-5 (MIO)
- OpenAI GPT-4 (Manus, Abacus)
- MCP Zapier (Zapier Agent)

Real-time:
- Socket.IO (WebSocket)
- Redis Pub/Sub

Storage:
- Vercel Blob (files)
- Redis (cache/sessions)

Deploy:
- Vercel (frontend + functions)
- Upstash Redis (managed)
```

---

### Schema Database Completo

```sql
-- MIO Agent Logs (già definito)
CREATE TABLE mio_agent_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  status ENUM('success', 'error', 'warning', 'info') NOT NULL,
  message TEXT,
  details JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_agent (agent),
  INDEX idx_status (status),
  INDEX idx_timestamp (timestamp DESC)
);

-- Tasks Engine
CREATE TABLE mio_tasks (
  id VARCHAR(50) PRIMARY KEY,
  project VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  status ENUM('todo', 'in_progress', 'done', 'blocked') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  assigned_to VARCHAR(100),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  due_date TIMESTAMP NULL,
  metadata JSON,
  INDEX idx_project (project),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_assigned (assigned_to)
);

-- Projects Registry
CREATE TABLE mio_projects (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  repository VARCHAR(255),
  status ENUM('active', 'archived', 'planned') DEFAULT 'active',
  owner VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  metadata JSON,
  INDEX idx_status (status),
  INDEX idx_owner (owner)
);

-- Brain/Memory
CREATE TABLE mio_brain (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSON NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (key),
  INDEX idx_category (category)
);

-- System Events (Event Bus)
CREATE TABLE system_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL,
  target VARCHAR(100),
  payload JSON,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  INDEX idx_event_type (event_type),
  INDEX idx_source (source),
  INDEX idx_status (status),
  INDEX idx_created (created_at DESC)
);

-- Agent Messages (Multi-Agent Chat)
CREATE TABLE agent_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_id VARCHAR(100) NOT NULL,
  agent VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (conversation_id),
  INDEX idx_agent (agent),
  INDEX idx_created (created_at DESC)
);

-- Agent Context (Shared Context)
CREATE TABLE agent_context (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSON NOT NULL,
  visible_to JSON NOT NULL COMMENT 'Array di agenti che possono vedere',
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (key)
);

-- Integrations Registry
CREATE TABLE integrations_registry (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type ENUM('internal', 'external', 'webhook', 'api') NOT NULL,
  url VARCHAR(500),
  status ENUM('active', 'inactive', 'error') DEFAULT 'active',
  config JSON,
  last_health_check TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_type (type),
  INDEX idx_status (status)
);

-- Data Bag (Key-Value Store in DB)
CREATE TABLE data_bag (
  key VARCHAR(255) PRIMARY KEY,
  value JSON NOT NULL,
  ttl TIMESTAMP NULL COMMENT 'Time to live',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ttl (ttl)
);
```

---

## 📋 PIANO IMPLEMENTAZIONE COMPLETO

### FASE 1: **Foundation Layer** (8-12 ore) ⭐⭐⭐⭐⭐

#### Step 1.1: Database Setup (30 minuti)
- [ ] Creare database PlanetScale
- [ ] Configurare DATABASE_URL su Vercel
- [ ] Testare connessione

#### Step 1.2: Schema Database (2-3 ore)
- [ ] Definire schema completo Drizzle ORM
- [ ] Creare migration
- [ ] Eseguire migration
- [ ] Testare tutte le tabelle

#### Step 1.3: Event Bus (3-4 ore)
- [ ] Setup Redis (Upstash)
- [ ] Implementare Event Emitter
- [ ] Implementare Event Listener
- [ ] Implementare Event Queue
- [ ] Testare pub/sub

#### Step 1.4: Logging System (2-3 ore)
- [ ] Middleware logging backend
- [ ] Hook logging frontend
- [ ] Auto-tracking eventi
- [ ] API logs (già creati, testare)

#### Step 1.5: Data Bag (1-2 ore)
- [ ] Redis key-value store
- [ ] API get/set/delete
- [ ] TTL management
- [ ] Testare storage

**Risultato Fase 1**: ✅ Fondazione solida pronta

---

### FASE 2: **Multi-Agent System** (16-24 ore) ⭐⭐⭐⭐⭐

#### Step 2.1: MIO Agent (Coordinator) (6-8 ore)
- [ ] LLM integration (GPT-5)
- [ ] Context injection (dati Dashboard)
- [ ] Task delegation system
- [ ] Agent orchestration
- [ ] Decision making logic
- [ ] Chat interface
- [ ] Testare coordinamento

#### Step 2.2: Manus Agent (Operator) (4-6 ore)
- [ ] LLM integration (GPT-4)
- [ ] Action execution engine
- [ ] Tool calling (function calling)
- [ ] Error handling
- [ ] Status reporting
- [ ] Chat interface
- [ ] Testare esecuzione

#### Step 2.3: Abacus Agent (Analytics) (4-6 ore)
- [ ] LLM integration (GPT-4)
- [ ] Data analysis tools
- [ ] Report generation
- [ ] Chart creation (Recharts)
- [ ] Insights extraction
- [ ] Chat interface
- [ ] Testare analisi

#### Step 2.4: Zapier Agent (Automation) (2-4 ore)
- [ ] MCP Zapier integration
- [ ] Workflow triggers
- [ ] Action execution
- [ ] Status monitoring
- [ ] Chat interface
- [ ] Testare automazioni

**Risultato Fase 2**: ✅ 4 Agenti operativi

---

### FASE 3: **Shared Context & Sync** (6-8 ore) ⭐⭐⭐⭐⭐

#### Step 3.1: Shared Context System (3-4 ore)
- [ ] Context database
- [ ] Context API (get/set/update)
- [ ] Visibility rules (chi vede cosa)
- [ ] Context synchronization
- [ ] Testare sharing

#### Step 3.2: Real-time Sync (3-4 ore)
- [ ] WebSocket setup (Socket.IO)
- [ ] Message broadcasting
- [ ] Chat sync tra agenti
- [ ] Event stream live
- [ ] Testare real-time

**Risultato Fase 3**: ✅ Agenti sincronizzati

---

### FASE 4: **MIHUB Dashboard UI** (8-12 ore) ⭐⭐⭐⭐⭐

#### Step 4.1: Layout 4-Panel (2-3 ore)
- [ ] Grid layout 2x2
- [ ] 4 chat panels (MIO, Manus, Abacus, Zapier)
- [ ] Resize panels
- [ ] Responsive design

#### Step 4.2: Chat Components (3-4 ore)
- [ ] Chat input/output
- [ ] Message history
- [ ] Typing indicators
- [ ] Agent status badges
- [ ] Message formatting

#### Step 4.3: Shared Context Panel (2-3 ore)
- [ ] Context viewer
- [ ] Event stream viewer
- [ ] Task list viewer
- [ ] Stats cards

#### Step 4.4: Integration (1-2 ore)
- [ ] WebSocket client
- [ ] API integration
- [ ] State management
- [ ] Error handling

**Risultato Fase 4**: ✅ MIHUB UI completo

---

### FASE 5: **Integration Layer** (8-12 ore) ⭐⭐⭐⭐

#### Step 5.1: API Gateway (3-4 ore)
- [ ] Unified endpoint
- [ ] Request routing
- [ ] Authentication
- [ ] Rate limiting
- [ ] Documentation

#### Step 5.2: Webhook System (3-4 ore)
- [ ] Webhook receiver
- [ ] Event validation
- [ ] Payload transformation
- [ ] Retry logic
- [ ] Registry

#### Step 5.3: Integrations Registry (2-4 ore)
- [ ] Registry database
- [ ] App registration API
- [ ] Health checks
- [ ] Status monitoring
- [ ] Auto-discovery

**Risultato Fase 5**: ✅ Interoperabilità completa

---

### FASE 6: **Testing & Stabilizzazione** (4-6 ore) ⭐⭐⭐

#### Step 6.1: Testing Completo (2-3 ore)
- [ ] Test multi-agent collaboration
- [ ] Test event flow
- [ ] Test real-time sync
- [ ] Test interoperabilità
- [ ] Load testing

#### Step 6.2: Documentazione (2-3 ore)
- [ ] API documentation
- [ ] Architecture diagram
- [ ] User guide
- [ ] Developer guide

**Risultato Fase 6**: ✅ Sistema stabile e documentato

---

## ⏱️ STIMA TEMPORALE TOTALE

| Fase | Tempo | Priorità |
|------|-------|----------|
| **Fase 1**: Foundation Layer | 8-12 ore | ⭐⭐⭐⭐⭐ |
| **Fase 2**: Multi-Agent System | 16-24 ore | ⭐⭐⭐⭐⭐ |
| **Fase 3**: Shared Context & Sync | 6-8 ore | ⭐⭐⭐⭐⭐ |
| **Fase 4**: MIHUB Dashboard UI | 8-12 ore | ⭐⭐⭐⭐⭐ |
| **Fase 5**: Integration Layer | 8-12 ore | ⭐⭐⭐⭐ |
| **Fase 6**: Testing & Stabilizzazione | 4-6 ore | ⭐⭐⭐ |
| **TOTALE** | **50-74 ore** | - |

**Stima Realistica**: **60 ore** (1.5-2 settimane full-time)

---

## 🎯 PROSSIMA AZIONE IMMEDIATA

### Step 1: Creare Database PlanetScale (ADESSO) ⏰ 30 minuti

**Azioni**:
1. ✅ Creare account PlanetScale
2. ✅ Creare database `dms-hub-production`
3. ✅ Copiare connection string
4. ✅ Configurare DATABASE_URL su Vercel
5. ✅ Testare connessione con `/api/logs/test`
6. ✅ Eseguire migration schema completo
7. ✅ Testare tutte le tabelle

**Risultato**: Database pronto per MIHUB ✅

---

## 📝 NOTE FINALI

### Cosa Riutilizzare da MIO-hub

✅ **Da Mantenere**:
- Task structure (tasks-todo.json format)
- Projects structure (projects/index.json format)
- Brain structure (brain/mio-context.json format)
- Connectors config (connectors/*.json)

❌ **Da Rifare**:
- MIO Worker (codice corrotto)
- GitHub Actions (meglio Vercel Cron)
- File-based storage (meglio database)

### Differenze Chiave MIHUB vs MIO-hub

| Aspetto | MIO-hub | MIHUB |
|---------|---------|-------|
| **Storage** | File JSON | Database + Redis |
| **Agenti** | 1 (MIO) | 4 (MIO, Manus, Abacus, Zapier) |
| **UI** | Nessuna | Dashboard 4-panel |
| **Real-time** | No | WebSocket |
| **Event Bus** | No | Redis Pub/Sub |
| **Shared Context** | No | Sì |
| **Interoperabilità** | Limitata | Completa |

---

## ✅ CONFERMA PROSSIMO STEP

**Vuoi che proceda con FASE 1: Foundation Layer?**

1. ✅ Creare database PlanetScale
2. ✅ Definire schema completo
3. ✅ Implementare Event Bus
4. ✅ Implementare Logging System
5. ✅ Implementare Data Bag

**Tempo stimato**: 8-12 ore

**Risultato**: Fondazione solida per costruire MIHUB multi-agente

---

**Fine Documento**  
**Data**: 18 Novembre 2025  
**Autore**: Manus AI Agent  
**Versione**: 1.0
