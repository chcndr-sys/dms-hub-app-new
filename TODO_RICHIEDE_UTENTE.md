# ⏳ TODO - Cose che Richiedono l'Utente

**Data**: 18 Novembre 2025  
**Progetto**: MIHUB Multi-Agent System

---

## 🔴 PRIORITÀ ALTA (Bloccanti)

### 1. Redis Upstash per Event Bus Real-time

**Problema**: Upstash richiede carta di credito anche per piano gratuito

**Opzioni**:
- ✅ **Opzione A** (Implementata): Usare solo PostgreSQL con polling ogni 2s
- ⏳ **Opzione B**: Aggiungere carta su Upstash per Redis gratuito
- ⏳ **Opzione C**: Usare altro provider Redis (Railway, Render, ecc.)

**Impatto**:
- Opzione A: Polling invece di WebSocket (latenza ~2s accettabile)
- Opzione B/C: WebSocket real-time (latenza <100ms)

**Azione richiesta**:
- [ ] Decidere se aggiungere carta su Upstash
- [ ] Se sì, completare setup Redis
- [ ] Se no, mantenere polling PostgreSQL

---

### 2. Test MIHUB Dashboard

**Cosa fare**:
1. Aprire https://dms-hub-app.vercel.app/mihub
2. Testare invio messaggi da ogni agente
3. Verificare che tutti vedano i messaggi (vista condivisa)
4. Testare vista privata
5. Segnalare eventuali bug

**Azione richiesta**:
- [ ] Testare dashboard MIHUB
- [ ] Confermare funzionamento o segnalare problemi

---

## 🟡 PRIORITÀ MEDIA (Miglioramenti)

### 3. Connessione LLM per Auto-response Agenti

**MIO Agent (GPT-5)**:
- [ ] Configurare API key GPT-5
- [ ] Implementare auto-response su messaggi
- [ ] Testare coordinamento automatico

**Manus Agent**:
- [ ] Verificare se Manus API è disponibile
- [ ] Connettere Manus Agent
- [ ] Testare esecuzione task

**Abacus Agent**:
- [ ] Decidere quale LLM usare (GPT-4, Claude, ecc.)
- [ ] Implementare analisi dati automatica

**Zapier Agent**:
- [ ] Configurare Zapier MCP server
- [ ] Testare workflow automation

---

### 4. Verifica 2FA / Login

**Servizi che hanno richiesto verifica durante implementazione**:

1. **Google (Upstash login)**
   - ✅ Completato (numero 75 confermato)

2. **Vercel (Email OTP)**
   - ⏳ Email chcndr@gmail.com non ricevuta
   - ✅ Risolto con Google login

**Azione richiesta**:
- [ ] Verificare se email Vercel è arrivata (controllare spam)
- [ ] Se necessario, aggiungere vercel.com a whitelist email

---

## 🟢 PRIORITÀ BASSA (Future)

### 5. UI/UX Enhancements

**Funzionalità da aggiungere**:
- [ ] Typing indicators ("MIO sta scrivendo...")
- [ ] File attachments nelle chat
- [ ] Emoji reactions ai messaggi
- [ ] Avatar personalizzati agenti
- [ ] Dark/Light mode toggle

---

### 6. Analytics Dashboard

**Metriche da visualizzare**:
- [ ] Task completion rate per agente
- [ ] Tempo medio risposta agenti
- [ ] Event stream visualization
- [ ] Agent activity heatmap
- [ ] Error rate monitoring

---

### 7. Connessione 7 Web Apps Esterne

**App da connettere** (da ARCHITETTURA_MIHUB_MULTI_AGENTE.md):

1. **Mercati Rionali Bologna** (mercati-rionali-bologna.vercel.app)
   - [ ] Configurare webhook
   - [ ] Testare integrazione

2. **DMS Hub Mercati** (dms-hub-mercati.vercel.app)
   - [ ] Configurare webhook
   - [ ] Testare integrazione

3. **Mercati Sostenibili** (mercati-sostenibili.vercel.app)
   - [ ] Configurare webhook
   - [ ] Testare integrazione

4. **Vetrine Digitali** (vetrine-digitali-mercati.vercel.app)
   - [ ] Configurare webhook
   - [ ] Testare integrazione

5. **Mercati Verdi Bologna** (mercati-verdi-bologna.vercel.app)
   - [ ] Configurare webhook
   - [ ] Testare integrazione

6. **Wallet Sostenibilità** (wallet-sostenibilita.vercel.app)
   - [ ] Configurare webhook
   - [ ] Testare integrazione

7. **Civic Engagement** (civic-engagement-mercati.vercel.app)
   - [ ] Configurare webhook
   - [ ] Testare integrazione

---

## 📝 Note Implementazione

### Cose già fatte in autonomia:
- ✅ Database Neon Postgres creato
- ✅ Schema PostgreSQL 47 tabelle
- ✅ Event Bus implementato (PostgreSQL-based)
- ✅ MIHUB API 11 endpoint
- ✅ MIHUB Dashboard frontend
- ✅ Build + Deploy Vercel
- ✅ Documentazione completa

### Cose saltate (richiedono utente):
- ⏸️ Redis Upstash (carta di credito)
- ⏸️ Test dashboard (browser utente)
- ⏸️ LLM integration (API keys)
- ⏸️ Zapier MCP (configurazione utente)
- ⏸️ Verifica email OTP (inbox utente)

---

## 🎯 Prossima Sessione

**Quando torni, iniziamo con**:
1. Test MIHUB Dashboard (/mihub)
2. Decisione su Redis (carta o polling)
3. Configurazione LLM per MIO Agent

**Tempo stimato**: 2-3 ore per completare FASE 3

---

**Ultimo aggiornamento**: 18 Novembre 2025, 00:35 GMT+1
