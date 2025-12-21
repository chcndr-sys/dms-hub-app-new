# 🔴 REPORT SALVATAGGI DUPLICATI - orchestrator.js

## PANORAMICA

Trovati **8 punti di salvataggio** nel file `routes/orchestrator.js`.
Alcuni sono **DUPLICATI** che causano messaggi ripetuti.

---

## 📋 MAPPA COMPLETA SALVATAGGI

### 1. SALVATAGGIO MESSAGGIO UTENTE (Linee 253-277)

| Linea | Funzione | Destinazione | Condizione | Stato |
|-------|----------|--------------|------------|-------|
| 253 | `saveDirectMessage` | `mio-main` | `mode === 'auto'` | ✅ OK |
| 265 | `saveDirectMessage` | `user-{agent}-direct` | `mode === 'direct'` | ✅ OK |
| 277 | `saveAgentLog` | Vista 4 agenti | SEMPRE | ⚠️ Potrebbe duplicare |

---

### 2. RISPOSTA ABACUS SQL (Linea 532)

| Linea | Funzione | Destinazione | Condizione | Stato |
|-------|----------|--------------|------------|-------|
| 532 | `saveDirectMessage` | `mio-abacus-coordination` o `user-abacus-direct` | Basato su mode | ✅ OK |

---

### 3. TOOL EXECUTOR - RICHIESTA MIO → AGENTE (Linea 647)

| Linea | Funzione | Destinazione | Condizione | Stato |
|-------|----------|--------------|------------|-------|
| 647 | `saveDirectMessage` | `user-{agent}-direct` o `mio-{agent}-coordination` | Basato su mode | ✅ OK |

**Problema**: Salva `taskDescription` che spesso è **VUOTO** → messaggi con solo puntino!

---

### 4. TOOL EXECUTOR - RISPOSTA AGENTE (Linea 913)

| Linea | Funzione | Destinazione | Condizione | Stato |
|-------|----------|--------------|------------|-------|
| 913 | `saveDirectMessage` | `user-{agent}-direct` o `mio-{agent}-coordination` | Basato su mode | ✅ OK |

---

### 5. 🔴 RISPOSTA FINALE AGENTE (Linee 1042-1062)

| Linea | Funzione | Destinazione | Condizione | Stato |
|-------|----------|--------------|------------|-------|
| 1042 | `saveDirectMessage` | `agentIsland` (dinamico) | Basato su mode | ✅ OK |
| **1054** | `saveDirectMessage` | **`mio-main` SEMPRE** | NESSUNA | 🔴 **DUPLICATO!** |

**PROBLEMA CRITICO**: La linea 1054 salva la risposta dell'agente su `mio-main` **SEMPRE**, indipendentemente dal mode!

Questo causa:
- Risposte di ABACUS/MANUS/GPTDEV che appaiono nella chat principale di MIO
- Duplicazione dei messaggi

---

## 🔧 FIX NECESSARI

### FIX 1: Rimuovere DOPPIO CANALE (Linee 1052-1062)

```javascript
// 🔴 DA RIMUOVERE O CONDIZIONARE
// 🚀 DOPPIO CANALE - Salva risposta agente su mio-main SEMPRE (filtrato poi dal frontend)
await saveDirectMessage(
  'mio-main',
  agent,
  'user',
  'assistant',
  responseMessage,
  agent,
  mode
);
```

**Soluzione**: Rimuovere completamente questo blocco, oppure condizionarlo:

```javascript
// Salva su mio-main SOLO se mode='auto' E l'agente è MIO stesso
if (mode === 'auto' && agent === 'mio') {
  await saveDirectMessage('mio-main', ...);
}
```

---

### FIX 2: Verificare taskDescription vuoto (Linea 652)

La linea 652 salva `taskDescription` che spesso è vuoto.
Questo causa i messaggi "MIO" con solo puntino nelle mini-chat.

**Soluzione**: Verificare che `taskDescription` non sia vuoto prima di salvare.

---

## 📊 RIEPILOGO

| Problema | Linea | Gravità | Fix |
|----------|-------|---------|-----|
| Risposta agente duplicata su mio-main | 1054 | 🔴 CRITICO | Rimuovere blocco |
| taskDescription vuoto | 652 | 🟡 MEDIO | Validare contenuto |
| saveAgentLog sempre | 277 | 🟢 BASSO | Verificare se necessario |

---

Data: 21 Dicembre 2024
