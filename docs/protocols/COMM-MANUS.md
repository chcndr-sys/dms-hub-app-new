# 🧭 Protocollo di Comunicazione Operativa – MANUS (Agente DevOps)

**Versione:** 1.0  
**Autore:** MIO (Agente Orchestratore)  
**Ultimo aggiornamento:** Dicembre 2025

---

## 🔹 SCOPO

Definisce il protocollo standard di comunicazione tra l'agente **MIO** e l'agente **Manus**.  
Ogni messaggio MIO → Manus deve seguire questa struttura per garantire chiarezza e coerenza operativa.

---

## 🔹 STRUTTURA STANDARD DEI MESSAGGI

### 1️⃣ CONTESTO RAPIDO

> Chi manda il messaggio e cosa serve fare.

**Esempio:**
> Messaggio da **MIO** – Configurazione backend Hetzner: riattivazione orchestratore.

---

### 2️⃣ ISTRUZIONI OPERATIVE

Blocchi chiari e numerati con i comandi **da copiare/incollare**.

- 🔧 = modifica file  
- 🖥️ = comando da terminale  
- 🔍 = verifica / controllo

**Esempio:**
```bash
# 🧩 Modifica .env
ENABLE_ORCHESTRATOR=true

# 🖥️ Riavvia backend
cd /var/www/mio-hub-backend
pm2 restart mio-hub-backend
```

---

### 3️⃣ RISULTATO ATTESO

Descrizione di ciò che Manus deve vedere se tutto è corretto.

**Esempio:**

✅ Orchestrator attivo | Risposta HTTP 200 con "success: true"

---

### 4️⃣ MESSAGGIO DI RITORNO

Cosa Manus deve incollare nella chat MIO per confermare:

```
✅ Task completato | Orchestrator attivo
```

---

### 5️⃣ FAILSAFE (in caso di errore)

Cosa fare se qualcosa non funziona.

**Esempio:**
```
Se ricevi errore 404 → esegui pm2 logs mio-hub-backend --lines 20
e incolla l'output nella chat MIO.
```

---

### 6️⃣ TRIGGER SUCCESSIVO

Chi deve agire dopo (MIO, Andrea, Zapier, ecc.).

**Esempio:**
```
Dopo conferma, MIO eseguirà test automatico e aggiornerà blueprint.
```

---

## 🔹 REPOSITORY PRINCIPALI

| Repository | Descrizione | Branch Default | Accesso |
|------------|-------------|----------------|---------|
| `Chcndr/dms-hub-app-new` | Frontend React / Dashboard PA | `master` | GitHub |
| `mihub-backend-rest` | Backend orchestratore su Hetzner | `main` | SSH Hetzner |
| `dms-system-blueprint` | Documentazione architettura | `main` | GitHub |

---

## 🔹 SERVER HETZNER

**Percorso backend:**
```
/var/www/mio-hub-backend
```

**Comandi principali:**
```bash
pm2 restart mio-hub-backend
pm2 stop mio-hub-backend
pm2 start mio-hub-backend
pm2 logs mio-hub-backend --lines 20
pm2 list
```

---

## 🔹 DEPLOY

### Backend Hetzner
```bash
cd /var/www/mio-hub-backend
git pull origin main
npm install --production
pm2 restart mio-hub-backend
```

### Frontend Vercel
Deploy automatico al push su `master` (`Chcndr/dms-hub-app-new`)

---

## 🔹 TEST ORCHESTRATORE

```bash
curl -X POST https://orchestratore.mio-hub.me/api/mihub/orchestrator \
  -H "Content-Type: application/json" \
  -d '{"agent":"mio","message":"ping","conversation_id":"manual-test"}'
```

**Risultato atteso:**
```json
{ "success": true, "reply": "Orchestrator attivo ✅" }
```

---

## 🔹 COMPORTAMENTO OPERATIVO

1. 🧠 Esegui solo ciò che è nel messaggio.
2. 🔁 Riporta sempre output completo.
3. 🕒 Rispondi entro 5 minuti.
4. 💬 Formato conferma:

```
✅ Task completato | <descrizione breve>
```

5. 📁 Non modificare configurazioni esterne (DNS, SSL, Vercel) senza ordine MIO.

---

## 🔹 ESEMPIO MESSAGGIO COMPLETO

```markdown
# Messaggio da MIO – Riavvio backend orchestratore

## 1️⃣ Contesto
Il backend Hetzner ha `ENABLE_ORCHESTRATOR=false`. Serve riattivarlo.

## 2️⃣ Istruzioni operative
🔧 Modifica file `.env` e aggiungi:
ENABLE_ORCHESTRATOR=true

🖥️ Riavvia servizio:
cd /var/www/mio-hub-backend
pm2 restart mio-hub-backend

🔍 Verifica stato:
pm2 logs mio-hub-backend | grep ENABLE_ORCHESTRATOR

## 3️⃣ Risultato atteso
`ENABLE_ORCHESTRATOR = true` visibile nei log

## 4️⃣ Messaggio di ritorno
✅ Task completato | Orchestrator riattivato

## 5️⃣ Failsafe
Se ricevi errore → incolla output `pm2 logs` in chat MIO.

## 6️⃣ Trigger successivo
MIO eseguirà test automatico e aggiornerà blueprint.
```

---

**Fine documento ✅**  
Versione 1.0 – Protocollo ufficiale di comunicazione MIO ↔ Manus.
