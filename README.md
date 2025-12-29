# 🚀 DMS HUB - Sistema Multi-Agente MIO

**Dashboard PA per la gestione di Rete Mercati Made in Italy**

[![Deploy Status](https://img.shields.io/badge/deploy-vercel-brightgreen)](https://dms-hub-app-new.vercel.app)
[![Backend Status](https://img.shields.io/badge/backend-hetzner-blue)](https://orchestratore.mio-hub.me)

---

## 🚨 REGOLE FONDAMENTALI (LEGGERE PRIMA DI TUTTO!)

### ❌ COSA NON FARE MAI

| Azione Vietata | Motivo |
|----------------|--------|
| Modificare file sul server via SSH | Rompe l'allineamento con GitHub |
| Fare `git pull` manuale sul server | C'è l'auto-deploy! |
| Creare progetti paralleli su Manus WebDev | Duplica il lavoro, crea confusione |
| Hardcodare endpoint nel frontend | Aggiungi a `MIO-hub/api/index.json` |
| Ignorare il Blueprint | Contiene architettura e regole |

### ✅ COSA FARE SEMPRE

| Azione Corretta | Come |
|-----------------|------|
| Modifica codice | In locale o direttamente su GitHub |
| Deploy | Commit + Push → Auto-deploy |
| Nuovi endpoint | Aggiungi a `MIO-hub/api/index.json` |
| Modifiche significative | Aggiorna il Blueprint |
| Prima di iniziare | Leggi `Blueprint_Evolutivo_SUAP.md` |

### 🔄 FLUSSO AUTO-DEPLOY

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FLUSSO AUTO-DEPLOY                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FRONTEND (questo repo)              BACKEND (mihub-backend-rest)       │
│   ─────────────────────               ────────────────────────────       │
│                                                                          │
│   ┌─────────┐    ┌─────────┐          ┌─────────┐    ┌─────────┐        │
│   │ Commit  │───►│  Push   │          │ Commit  │───►│  Push   │        │
│   │ locale  │    │ GitHub  │          │ locale  │    │ GitHub  │        │
│   └─────────┘    └────┬────┘          └─────────┘    └────┬────┘        │
│                       │                                    │             │
│                       ▼                                    ▼             │
│              ┌────────────────┐                   ┌────────────────┐     │
│              │ Vercel Webhook │                   │ Hetzner Webhook│     │
│              │  (automatico)  │                   │  (automatico)  │     │
│              └────────┬───────┘                   └────────┬───────┘     │
│                       │                                    │             │
│                       ▼                                    ▼             │
│              ┌────────────────┐                   ┌────────────────┐     │
│              │ Deploy Vercel  │                   │ Deploy Hetzner │     │
│              │   (1-2 min)    │                   │   (1-2 min)    │     │
│              └────────────────┘                   └────────────────┘     │
│                                                                          │
│   NON SERVE FARE NULLA MANUALMENTE!                                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 ARCHITETTURA SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITETTURA MIOHUB                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND (Vercel)          BACKEND (Hetzner)                   │
│  ─────────────────          ────────────────────────            │
│  Repo: dms-hub-app-new      Repo: mihub-backend-rest            │
│        (QUESTO)                                                 │
│  URL: dms-hub-app-new       URL: orchestratore.mio-hub.me       │
│       .vercel.app           Server: 157.90.29.66                │
│                                                                 │
│                    DATABASE (Neon)                              │
│                    ───────────────                              │
│                    PostgreSQL serverless                        │
│                    ep-bold-silence-adftsojg                     │
│                                                                 │
│  CONFIGURAZIONI (GitHub)                                        │
│  ───────────────────────                                        │
│  Repo: MIO-hub                                                  │
│  File: api/index.json (150+ endpoint)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Repository Collegati

| Repository | Scopo | URL |
|------------|-------|-----|
| **dms-hub-app-new** (questo) | Frontend React | [GitHub](https://github.com/Chcndr/dms-hub-app-new) |
| **mihub-backend-rest** | Backend Express | [GitHub](https://github.com/Chcndr/mihub-backend-rest) |
| **MIO-hub** | Configurazioni, API index | [GitHub](https://github.com/Chcndr/MIO-hub) |

---

## 📚 DOCUMENTAZIONE IMPORTANTE

| Documento | Posizione | Descrizione |
|-----------|-----------|-------------|
| **Blueprint SUAP** | `Blueprint_Evolutivo_SUAP.md` | Architettura SUAP, regole agenti, roadmap |
| **Credenziali** | `CREDENZIALI_MIOHUB.md` | Accessi server, database, servizi |
| **API Index** | `MIO-hub/api/index.json` | Catalogo 150+ endpoint |

> **⚠️ AGENTI AI:** Prima di fare qualsiasi modifica, LEGGI il `Blueprint_Evolutivo_SUAP.md`!

---

## 🎯 Panoramica

DMS HUB è una piattaforma di gestione per la Rete Mercati Made in Italy, dotata di un sistema multi-agente AI chiamato **MIO** (Multi-agent Intelligence Orchestrator).

### Caratteristiche Principali

| Modulo | Descrizione |
|--------|-------------|
| **Dashboard PA** | Interfaccia amministrativa completa |
| **MIO Agent** | Orchestratore AI con 4 agenti specializzati |
| **SSO SUAP** | Gestione pratiche SCIA/Concessioni (Ente Sussidiario) |
| **Gestione Mercati** | CRUD mercati, posteggi, operatori |
| **Health Monitor** | Monitoraggio real-time di tutti i servizi |
| **Chat Multi-Agente** | Sistema di chat con routing intelligente |

---

## 🛠️ Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| **Frontend** | Vite + React + TypeScript + TailwindCSS |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL (Neon) |
| **Deploy Frontend** | Vercel (automatico) |
| **Deploy Backend** | Hetzner VPS (automatico via webhook) |
| **AI Models** | OpenAI GPT-4 |

---

## 🤖 Agenti AI

| Agente | Ruolo | Capacità |
|--------|-------|----------|
| **MIO** | Orchestratore | Routing, coordinamento, aggregazione |
| **Manus** | SysAdmin | SSH, file system, PM2, deploy |
| **Abacus** | Data Analyst | SQL, statistiche, report |
| **GPT Dev** | Sviluppatore | GitHub, codice, PR |
| **Zapier** | Automatore | WhatsApp, Calendar, Gmail |

---

## 📋 Aggiungere Nuovi Endpoint

**Procedura obbligatoria:**

1. **Crea l'endpoint** nel backend (`mihub-backend-rest/routes/`)
2. **Commit e push** su GitHub
3. **Aggiungi a `MIO-hub/api/index.json`** (obbligatorio!)
4. **Incrementa la versione** nel file index.json
5. **Commit e push** di MIO-hub

> **NON hardcodare endpoint in `Integrazioni.tsx`!** Devono essere tutti in `index.json`.

---

## 🚀 Deploy

### Frontend (Automatico - Vercel)

```bash
git add -A
git commit -m "feat: nuova funzionalità"
git push origin master
# Vercel deploya automaticamente in 1-2 minuti
```

### Backend (Automatico - Hetzner)

```bash
# Nel repo mihub-backend-rest
git add -A
git commit -m "feat: nuovo endpoint"
git push origin master
# Il webhook deploya automaticamente in 1-2 minuti
```

### ⚠️ NON FARE MAI

```bash
# ❌ SBAGLIATO - Non fare SSH per deployare!
ssh root@157.90.29.66
cd /root/mihub-backend-rest
git pull  # NO!
pm2 restart  # NO!
```

---

## 🛠️ Setup Sviluppo Locale

### Prerequisiti

- Node.js 18+
- pnpm
- Account Vercel
- Accesso ai repository GitHub

### Installazione

```bash
# Clone repository
git clone https://github.com/Chcndr/dms-hub-app-new.git
cd dms-hub-app-new

# Installa dipendenze
pnpm install

# Avvia dev server
pnpm dev
```

### Variabili d'Ambiente

Crea un file `.env.local`:

```env
VITE_BACKEND_URL=https://orchestratore.mio-hub.me
```

---

## 💬 Sistema di Messaggistica

### Conversation IDs

| Conversation ID | Descrizione | Mode |
|-----------------|-------------|------|
| `mio-main` | Chat principale con MIO | `auto` |
| `user-gptdev-direct` | Chat diretta con GPT Developer | `direct` |
| `user-manus-direct` | Chat diretta con Manus | `direct` |
| `user-abacus-direct` | Chat diretta con Abacus | `direct` |
| `user-zapier-direct` | Chat diretta con Zapier | `direct` |

---

## 🆘 Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Modifiche non visibili (frontend) | Aspetta 1-2 min per Vercel |
| Modifiche non visibili (backend) | Aspetta 1-2 min per webhook Hetzner |
| Errore 500 | Controlla Health Monitor in Dashboard |
| Endpoint non trovato | Verifica sia in `index.json` |

---

## 📞 Contatti

Per problemi critici, contattare l'amministratore del sistema.

---

*© 2025 MIO Hub. Tutti i diritti riservati.*
*Ultimo aggiornamento: 29 Dicembre 2025*
