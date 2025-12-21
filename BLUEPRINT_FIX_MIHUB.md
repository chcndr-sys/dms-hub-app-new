# BLUEPRINT: Fix MIHUBDashboard - Tubo Diretto Database

**Data**: 21 Dicembre 2024  
**Problema**: La pagina `/mihub` mostra "Nessun messaggio" mentre `/dashboard-pa?tab=mio` funziona correttamente

---

## 1. DIAGNOSI DEL PROBLEMA

### 1.1 Sintomo
- Pagina `/mihub` → Mostra "Nessun messaggio" ❌
- Pagina `/dashboard-pa?tab=mio` → Mostra messaggi correttamente ✅

### 1.2 Causa Root
| Componente | Metodo Lettura | Funziona? |
|------------|----------------|-----------|
| `DashboardPA.tsx` | Tubo diretto → `/api/mihub/get-messages` | ✅ SÌ |
| `MIHUBDashboard.tsx` | TRPC → `trpc.mihub.getMessages` | ❌ NO |

**Il problema**: `MIHUBDashboard.tsx` usa TRPC che passa per il backend Hetzner, ma il backend non è compatibile con Vercel per la trasformazione messaggi.

---

## 2. ARCHITETTURA ATTUALE (NON FUNZIONANTE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITETTURA ATTUALE                               │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   /mihub Page    │
                    │ (MIHUBDashboard) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │      TRPC        │
                    │ trpc.mihub.      │
                    │ getMessages      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Backend Hetzner │  ◄── PROBLEMA: Non trasforma
                    │ api.mio-hub.me   │      correttamente i dati
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    Database      │
                    │   PostgreSQL     │
                    └──────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   ERRORE 404     │  ◄── Messaggi non arrivano
                    │ "Nessun msg"     │      al frontend
                    └──────────────────┘
```

---

## 3. ARCHITETTURA TARGET (FUNZIONANTE)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITETTURA TARGET                                │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   /mihub Page    │
                    │ (MIHUBDashboard) │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   TUBO DIRETTO   │  ◄── NUOVO: Bypassa Hetzner
                    │ /api/mihub/      │
                    │ get-messages     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Vercel API      │  ◄── API serverless su Vercel
                    │ (Serverless)     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    Database      │
                    │   PostgreSQL     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   MESSAGGI OK    │  ◄── Messaggi arrivano
                    │   Visualizzati   │      correttamente
                    └──────────────────┘
```

---

## 4. SCHEMA COMPLETO DEI FLUSSI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCHEMA FLUSSI COMPLETO MIO HUB                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   /dashboard-pa │     │     /mihub      │     │  Chat Singole   │
│   ?tab=mio      │     │                 │     │  (user-*-direct)│
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ useAgentLogs          │ TRPC ❌→ TUBO ✅      │ useAgentLogs
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TUBO DIRETTO (LETTURA)                       │
│              /api/mihub/get-messages (Vercel API)                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                 │
│                    PostgreSQL (TiDB/Neon)                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Tabella: messages                       │    │
│  │  - id, conversation_id, sender, message, agent, ...     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                    SCRITTURA (via Hetzner)                       │
│           orchestratore.mio-hub.me/api/mihub/orchestrator        │
└─────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────┴────────┐     ┌────────┴────────┐     ┌────────┴────────┐
│  Chat MIO       │     │  Chat Agenti    │     │  Chat Singole   │
│  (Principale)   │     │  (4 Quadranti)  │     │  (Direct)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 5. CONVERSATION_ID MAPPING

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONVERSATION_ID MAPPING                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CANALE                    │ CONVERSATION_ID              │ DESCRIZIONE      │
├───────────────────────────┼──────────────────────────────┼──────────────────┤
│ Chat Principale MIO       │ mio-main-{uuid}              │ Chat utente↔MIO  │
├───────────────────────────┼──────────────────────────────┼──────────────────┤
│ Vista 4 Agenti - MIO↔GPT  │ mio-gptdev-coordination      │ Coordinamento    │
│ Vista 4 Agenti - MIO↔Manus│ mio-manus-coordination       │ Coordinamento    │
│ Vista 4 Agenti - MIO↔Abacus│ mio-abacus-coordination     │ Coordinamento    │
│ Vista 4 Agenti - MIO↔Zapier│ mio-zapier-coordination     │ Coordinamento    │
├───────────────────────────┼──────────────────────────────┼──────────────────┤
│ Chat Singola GPT Dev      │ user-gptdev-direct           │ Utente↔GPT Dev   │
│ Chat Singola Manus        │ user-manus-direct            │ Utente↔Manus     │
│ Chat Singola Abacus       │ user-abacus-direct           │ Utente↔Abacus    │
│ Chat Singola Zapier       │ user-zapier-direct           │ Utente↔Zapier    │
├───────────────────────────┼──────────────────────────────┼──────────────────┤
│ /mihub (ATTUALE)          │ mihub_global_conversation_id │ UUID random ❌   │
│ /mihub (TARGET)           │ mio-*-coordination           │ ID fissi ✅      │
└───────────────────────────┴──────────────────────────────┴──────────────────┘
```

---

## 6. MODIFICHE DA IMPLEMENTARE

### 6.1 File: `MIHUBDashboard.tsx`

**PRIMA (TRPC - Non funziona):**
```typescript
// Linea 109-114
const { data: messages = [], refetch } = trpc.mihub.getMessages.useQuery({
  conversationId,
  limit: 100,
}, {
  refetchInterval: 2000,
});
```

**DOPO (Tubo Diretto - Funziona):**
```typescript
// Usa fetch diretto come DashboardPA.tsx
const [messages, setMessages] = useState<Message[]>([]);

useEffect(() => {
  const fetchMessages = async () => {
    // Usa conversation_id fissi per ogni agente (come DashboardPA)
    const conversationIds = {
      mio: 'mio-gptdev-coordination',
      manus: 'mio-manus-coordination',
      abacus: 'mio-abacus-coordination',
      zapier: 'mio-zapier-coordination'
    };
    
    // Fetch per ogni agente
    const allMessages = [];
    for (const [agent, convId] of Object.entries(conversationIds)) {
      const response = await fetch(`/api/mihub/get-messages?conversation_id=${convId}&limit=50`);
      const data = await response.json();
      if (data.success && data.messages) {
        allMessages.push(...data.messages);
      }
    }
    
    // Ordina per timestamp
    allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setMessages(allMessages);
  };
  
  fetchMessages();
  const interval = setInterval(fetchMessages, 2000);
  return () => clearInterval(interval);
}, []);
```

### 6.2 Rimuovere dipendenze TRPC

```typescript
// RIMUOVERE:
import { trpc } from "../lib/trpc";

// RIMUOVERE:
const sendMessage = trpc.mihub.sendMessage.useMutation({...});
const markAsRead = trpc.mihub.markMessageAsRead.useMutation();
```

### 6.3 Usare conversation_id fissi

```typescript
// RIMUOVERE il sistema UUID random:
const [conversationId, setConversationId] = useState<string>('');
useEffect(() => {
  let storedId = localStorage.getItem('mihub_global_conversation_id');
  // ...
}, []);

// USARE conversation_id fissi come DashboardPA:
const CONVERSATION_IDS = {
  mio: 'mio-gptdev-coordination',
  manus: 'mio-manus-coordination', 
  abacus: 'mio-abacus-coordination',
  zapier: 'mio-zapier-coordination'
};
```

---

## 7. CHECKLIST IMPLEMENTAZIONE

- [ ] Backup di `MIHUBDashboard.tsx`
- [ ] Rimuovere import TRPC
- [ ] Sostituire `trpc.mihub.getMessages.useQuery` con fetch diretto
- [ ] Usare conversation_id fissi (`mio-*-coordination`)
- [ ] Mantenere `handleSendMessage` che già usa fetch diretto per l'orchestrator
- [ ] Testare su `/mihub`
- [ ] Verificare che i messaggi appaiano
- [ ] Deploy su Vercel

---

## 8. RISCHI E MITIGAZIONI

| Rischio | Mitigazione |
|---------|-------------|
| Breaking change | Backup del file originale |
| Polling troppo frequente | Mantenere 2000ms come attuale |
| Messaggi duplicati | Usare `id` come key per deduplicazione |
| Perdita funzionalità | Mantenere `handleSendMessage` invariato |

---

## 9. RISULTATO ATTESO

Dopo le modifiche:
- `/mihub` mostrerà i messaggi correttamente ✅
- Stesso comportamento di `/dashboard-pa?tab=mio` ✅
- Tubo diretto Database → Frontend ✅
- Nessun passaggio per Hetzner nella lettura ✅

---

**CONFERMA RICHIESTA**: Procedo con l'implementazione?
