# 📘 DMS Hub System Blueprint
**Versione:** 3.2 (Aggiornamento Post-Integrazione)
**Data:** 26 Dicembre 2025
**Stato:** ✅ Operativo

---

## 🎯 Executive Summary

Il **DMS Hub** (Digital Market System) è l'ecosistema digitale integrato per la gestione dei mercati ambulanti, della mobilità sostenibile e dei servizi civici per la Pubblica Amministrazione.

Il sistema è composto da:
1.  **Dashboard PA**: Frontend React/Vite per il monitoraggio e la gestione.
2.  **Backend REST**: Node.js/Express su server Hetzner per le API core.
3.  **Database**: PostgreSQL su Neon (Serverless) con estensioni GIS.
4.  **Agenti AI**: Ecosistema multi-agente (MIO, GPT Dev, Manus, Abacus) per automazione e supporto.

---

## 🏗️ Architettura Tecnica

### 1. Frontend (Dashboard PA)
*   **Tecnologia**: React 18, Vite, TypeScript, TailwindCSS.
*   **Hosting**: Vercel (con deploy automatico da GitHub).
*   **Moduli Principali**:
    *   **Mappa GIS**: Visualizzazione mercati, posteggi e layer geografici.
    *   **Gestione Mercati**: CRUD mercati, posteggi, concessioni e operatori.
    *   **Reportistica**: Tab integrato con documentazione e link al Blueprint.
    *   **AI Chat**: Interfaccia per interagire con gli agenti MIO.

### 2. Backend (MIO Hub API)
*   **Tecnologia**: Node.js, Express.
*   **Hosting**: Hetzner VPS (Ubuntu 22.04), gestito con PM2.
*   **Endpoint Chiave**:
    *   `/api/gis/market-map/:marketId`: Restituisce GeoJSON dei posteggi con dati ricchi (dimensioni, rotazione).
    *   `/api/markets`: Gestione anagrafica mercati.
    *   `/api/concessions`: Gestione assegnazioni e scadenze.

### 3. Database (Neon PostgreSQL)
*   **Struttura**: 39 tabelle relazionali.
*   **Tabelle Core**:
    *   `markets`: Anagrafica mercati.
    *   `stalls`: Posteggi (include `geometry_geojson`, `dimensions`, `rotation`).
    *   `vendors`: Anagrafica operatori.
    *   `concessions`: Tabella di collegamento (storia assegnazioni).

---

## 🚀 Funzionalità Recenti (Changelog v3.2)

### ✅ Pop-up Mappa "Ricchi"
*   **Feature**: I pop-up dei posteggi sulla mappa ora mostrano:
    *   Dimensioni esatte (es. "6.00m x 9.00m").
    *   Superficie in mq.
    *   Rotazione (orientamento in gradi).
    *   Link diretto al "Vetrina Editor" per modifiche visuali.
*   **Implementazione**:
    *   DB: Aggiunte colonne `dimensions` (VARCHAR) e `rotation` (DECIMAL) a `stalls`.
    *   API: Aggiornato endpoint GIS per esporre questi campi.
    *   Frontend: Aggiornato `MarketMapComponent` per il rendering condizionale.

### ✅ Fix Associazione Concessioni
*   **Bug**: La creazione di una concessione falliva inviando il codice posteggio invece dell'ID.
*   **Fix**: Corretto il form in `MarketCompaniesTab.tsx` per usare `stall.id` come value della select.

### ✅ Integrazione Blueprint
*   **Feature**: Il tab "Report" della Dashboard ora funge da hub di documentazione.
*   **Contenuto**: Include card per accedere al Blueprint, allo stato del progetto e al resoconto dell'ecosistema.
*   **Accesso**: Link diretto a questo file (`BLUEPRINT.md`) e al repository GitHub.

---

## 🗺️ Roadmap & Next Steps

1.  **Vista "Gemello Digitale Italia"**: Implementare la vista nazionale con zoom animato sui mercati.
2.  **Integrazione TPER**: Completare il modulo per il trasporto pubblico (Centro Mobilità).
3.  **Notifiche Real-time**: Attivare il sistema di notifiche push per gli operatori.

---

*Documento generato automaticamente da Manus AI per il progetto DMS Hub.*
