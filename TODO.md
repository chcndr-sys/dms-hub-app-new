# TODO List - DMS HUB App

**Ultimo aggiornamento:** 24 Novembre 2025

---

## 🔴 PRIORITÀ MASSIMA - MIO Agent + Debug + Log

### Backend - Endpoint Orchestratore
- [ ] **Creare endpoint `/mihub/orchestrator`**
  - POST `/api/mihub/orchestrator` con formato richiesta uniforme
  - Risposta sempre JSON con struttura `{ success, agent, conversationId, message, error }`
  - Gestione errori LLM (rate limit, provider error, validation error)
  - Logging su tabella `mio_agent_logs`
  - File: `server/mihubRouter.ts`

### Frontend - MIO Agent Chat
- [ ] **Fix URL endpoint orchestratore**
  - Cambiare da `/api/mihub/orchestrator` a `/mihub/orchestrator`
  - Verificare gestione errori con nuovo contratto
  - File: `client/src/components/MIOAgentChat.tsx`

### Pagina Debug
- [ ] **Rimuovere dati mock**
  - Eliminare array hardcoded con date 18/11
  - Implementare chiamata a endpoint reale `/api/guardian/debug/testEndpoint`
  - Mostrare richiesta/risposta reale di ogni test
  - File: `client/src/components/Debug.tsx` (o simile)

### Pagina Log
- [ ] **Usare solo dati reali**
  - Chiamare `GET /api/logs/getLogs?serviceId=&agent=&limit=...`
  - Rimuovere dati mock con date 18/11
  - Aggiornare conteggi su dati reali
  - File: `client/src/components/LogDebug.tsx`

---

## 🟠 Priorità Alta

### Backend - HUB Shops e Services
- [ ] **Implementare UPDATE e DELETE per HUB Shops**
  - Aggiungere mutation `update` per modificare negozi esistenti
  - Aggiungere mutation `delete` con soft delete (status='inactive')
  - File: `server/dmsHubRouter.ts` (sezione shops, dopo riga 1193)

- [ ] **Implementare UPDATE e DELETE per HUB Services**
  - Aggiungere mutation `update` per modificare servizi esistenti
  - Aggiungere mutation `delete` con soft delete (status='inactive')
  - File: `server/dmsHubRouter.ts` (sezione services, dopo riga 1246)

### Frontend - HUB Shops e Services
- [ ] **Attivare pulsanti Edit/Delete per Negozi**
  - Implementare form di modifica precompilato
  - Implementare modal di conferma per delete
  - Collegare alle nuove API UPDATE/DELETE
  - File: `client/src/components/GestioneHubNegozi.tsx` (tab Negozi)

- [ ] **Attivare pulsanti Edit/Delete per Servizi**
  - Implementare form di modifica precompilato
  - Implementare modal di conferma per delete
  - Collegare alle nuove API UPDATE/DELETE
  - File: `client/src/components/GestioneHubNegozi.tsx` (tab Servizi)

### Centro Mobilità
- [ ] **Implementare architettura scalabile Centro Mobilità**
  - Aggiungere campo `mobilityProvider` alla tabella `markets` (già esiste!)
  - Creare tabella `mobility_providers` con configurazioni
  - Implementare API dinamica per provider
  - Sistema di fallback al Centro Mobilità Nazionale
  - Job di sincronizzazione dati mobility
  - Riferimento: `ARCHITETTURA_CENTRO_MOBILITA_SCALABILE.md`

---

## 🟢 Priorità Media

### Pagina Integrazioni
- [ ] **Completare Tab 3, 4, 5 con sezioni "Previsti"**
  - Tab 3 (API Keys): Aggiungere sezione chiavi previste
  - Tab 4 (Webhook): Aggiungere webhook configurabili
  - Tab 5 (Sync Status): Aggiungere job di sincronizzazione previsti
  - File: `client/src/components/Integrazioni.tsx`

---

## 🔵 Priorità Bassa

### Documentazione
- [ ] **Aggiornare README principale**
  - Aggiungere sezione HUB con schema completo
  - Documentare API CRUD complete (CREATE, READ, UPDATE, DELETE)
  - Aggiungere esempi di payload per ogni operazione
  - Spiegare comportamento soft delete

- [ ] **Creare documentazione API HUB**
  - Endpoint disponibili
  - Parametri richiesti/opzionali
  - Esempi di request/response
  - Codici errore

### Testing
- [ ] **Creare test per API HUB**
  - Test CRUD locations (CREATE, READ, UPDATE, DELETE soft)
  - Test CRUD shops (quando implementato)
  - Test CRUD services (quando implementato)
  - Test filtro `includeInactive`

---

## ✅ Completato

### 24 Novembre 2025
- [x] **Analisi problema deploy preview mappa GIS**
  - Identificato problema CORS backend Hetzner
  - Variabile `VITE_API_URL` configurata su Vercel
  - Deploy preview funzionante (eccetto mappa per CORS)

### 22 Novembre 2025
- [x] **Sincronizzazione TPER in Centro Mobilità**
  - Fix conversione lat/lng in stringhe
  - Caricamento 4,174 fermate TPER
  - Pulsante "Sincronizza Dati TPER"

- [x] **Pulsante Conferma Assegnazione in Gestione Mercati**
  - Aggiunto `id` ai dati posteggi
  - Conferma multipla posteggi riservati

### Fase 2 - Frontend HUB Locations
- [x] **Allineamento schema backend** (commit 12a2e6f)
  - Form con campi esatti: `marketId`, `city`, `lat`, `lng`, `areaGeojson`, `openingHours`, `description`, `photoUrl`
  - Rimossi campi inesistenti

- [x] **CRUD completo HUB Locations** (commit 12a2e6f)
  - CREATE con validazione
  - READ con dati reali
  - UPDATE con form precompilato
  - DELETE con modal conferma chiara

- [x] **UX migliorata** (commit 12a2e6f)
  - Loading states
  - Error states
  - Empty states
  - Badge ATTIVO/DISATTIVATO
  - Modal conferma delete con warning esplicito

### Fase 1 - Backend HUB Locations
- [x] **API UPDATE per HUB Locations** (commit 988953c)
  - Partial update (solo campi forniti)
  - Log automatico con valore vecchio/nuovo
  - Aggiornamento `updatedAt`

- [x] **API DELETE (soft) per HUB Locations** (commit 988953c)
  - Soft delete con `active=0`
  - Log automatico operazione
  - Nessuna cancellazione fisica dal database

- [x] **Filtro automatico lista HUB** (commit 988953c)
  - Default: solo `active=1`
  - Parametro `includeInactive: true` per vedere tutti

### Fasi Precedenti
- [x] Standardizzazione mappe (6 mappe sostituite con MarketMapComponent)
- [x] Fix problema Vercel (zoom e centro mappa)
- [x] Creazione tabelle HUB (hub_locations, hub_shops, hub_services)
- [x] Implementazione API HUB base (list, getById, create)
- [x] Aggiornamento blueprint con sezione Implementazione Grosseto
- [x] Pagina Integrazioni - Tab 1 e 2 riscritti con dati reali
- [x] Pagina Log & Debug creata (frontend con mock data)
- [x] Documentazione MobilityMap
- [x] Disabilitazione scroll zoom su tutte le mappe

---

## 📝 Note Tecniche

### Contratto Endpoint Orchestratore

**Request:**
```typescript
POST /mihub/orchestrator
{
  mode: "auto" | "manual",
  targetAgent?: "mio" | "dev" | "manus_worker" | "gemini_arch",
  conversationId: string | null,
  message: string,
  meta?: {
    source: string,
    agentBox?: string
  }
}
```

**Response (Success):**
```typescript
{
  success: true,
  agent: "mio",
  conversationId: "uuid",
  message: "testo risposta",
  meta?: { ... }
}
```

**Response (Error):**
```typescript
{
  success: false,
  agent: "mio",
  conversationId: "uuid_o_null",
  message: null,
  error: {
    type: "llm_rate_limit" | "llm_provider_error" | "validation_error",
    provider: "openai" | "gemini" | null,
    statusCode: 429,
    detail: "messaggio leggibile"
  }
}
```

### Schema HUB Locations (backend)
```typescript
{
  id: number (auto),
  marketId: number (FK markets.id),
  name: string,
  address: string,
  city: string,
  lat: string,
  lng: string,
  areaGeojson: string | null,
  openingHours: string | null,
  active: number (1=attivo, 0=disattivo),
  description: string | null,
  photoUrl: string | null,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### API HUB Locations Disponibili
```typescript
// Query
dmsHub.hub.locations.list({ includeInactive?: boolean })
dmsHub.hub.locations.getById({ id: number })

// Mutations
dmsHub.hub.locations.create({ marketId, name, address, city, lat, lng, ... })
dmsHub.hub.locations.update({ id, ...partialData })
dmsHub.hub.locations.delete({ id }) // Soft delete: active=0
```

### Comportamento Soft Delete
- **NON cancella** fisicamente dal database
- Imposta `active = 0` (disattivato)
- Aggiorna `updatedAt` automaticamente
- Log completo in `audit_logs` table
- Query `list` filtra automaticamente `active=1`
- Parametro `includeInactive: true` per vedere anche disattivati

---

## ⚠️ VINCOLI

### NON TOCCARE
- Modulo GIS (mappe mercati)
- Pagina `/mappa`
- Componente `GISMap`
- Pagina API Tokens (già funzionante)
- Sistema pagamenti e spunta

### FOCUS ATTUALE
1. MIO Agent (vista singola + 4 agenti)
2. Pagina Debug (richieste/risposte reali)
3. Pagina Log (solo log reali, niente 18/11)

---

**Prossima milestone:** Endpoint orchestratore + Fix MIO Agent + Debug/Log reali
