# Report Tecnico: Analisi Modulo SSO SUAP

**Data:** 29 Dicembre 2025
**Autore:** Manus AI
**Stato:** Analisi Completata

---

## 1. Executive Summary

L'analisi del modulo **SSO SUAP** (Ente Sussidiario Automatizzato) ha rivelato una discrepanza tra l'implementazione Backend (completa e funzionante) e quella Frontend (parzialmente simulata).

L'utente ha segnalato che la dashboard appare "statica" e mostra dati non corretti (zeri o dati mockati). L'indagine ha confermato che:
1.  **Backend**: Gli endpoint API sono implementati correttamente e rispondono con dati reali dal database.
2.  **Frontend**: La dashboard utilizza dati **mockati (finti)** per la lista delle attività recenti e lo stato delle integrazioni, ignorando i dati reali del backend.
3.  **Connettività**: Un problema di configurazione URL (HTTP vs HTTPS) impediva al frontend di recuperare anche i soli contatori statistici, causando la visualizzazione di "0".

---

## 2. Analisi Dettagliata Frontend (`SuapDashboard.tsx`)

Il file `client/src/pages/suap/SuapDashboard.tsx` è responsabile della visualizzazione.

### 2.1. KPI Cards (Contatori)
*   **Stato**: Implementazione Reale (ma falliva).
*   **Codice**: Chiama `getSuapStats` per ottenere `total`, `in_lavorazione`, ecc.
*   **Problema**: La chiamata falliva silenziosamente a causa di un errore "Mixed Content" (Frontend HTTPS su Vercel chiamava Backend HTTP su Hetzner).
*   **Fix Applicato**: Aggiornato l'URL API a `https://orchestratore.mio-hub.me`. Ora i contatori dovrebbero funzionare se ci sono dati nel DB.

### 2.2. Attività Recente (Lista Pratiche)
*   **Stato**: **SIMULATA (MOCK)**.
*   **Codice Rilevato**:
    ```typescript
    {[1, 2, 3].map((i) => (
      // ... renderizza "Mario Rossi S.r.l." fisso
    ))}
    ```
*   **Conseguenza**: L'utente vede sempre 3 pratiche fittizie di "Mario Rossi", indipendentemente dai dati reali nel database. Le nuove pratiche create non appaiono in questa lista.

### 2.3. Stato Integrazioni (Semafori)
*   **Stato**: **SIMULATA (MOCK)**.
*   **Codice Rilevato**: I pallini verdi/gialli per PDND, INPS e Agenzia Entrate sono hardcoded nel JSX.
*   **Conseguenza**: I semafori sono sempre verdi/gialli fissi e non riflettono il reale stato dei servizi esterni.

---

## 3. Analisi Dettagliata Backend (`routes/suap.js`)

Il backend su Hetzner (`mihub-backend-rest`) è stato verificato ed è pronto.

### 3.1. Endpoint Disponibili
| Metodo | Endpoint | Stato | Note |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/suap/stats` | ✅ Attivo | Restituisce i conteggi reali dal DB. |
| `GET` | `/api/suap/pratiche` | ✅ Attivo | Restituisce la lista pratiche (filtrabile). |
| `POST` | `/api/suap/pratiche` | ✅ Attivo | Crea nuove pratiche nel DB. |
| `POST` | `/api/suap/valuta` | ✅ Attivo | Esegue il motore di regole (DURC, ecc.). |

### 3.2. Dati nel Database
*   Il database contiene le tabelle `suap_pratiche`, `suap_checks`, `suap_eventi`.
*   I test effettuati via `curl` confermano che i dati vengono salvati e recuperati correttamente.

---

## 4. Piano di Risoluzione (Roadmap)

Per rendere la dashboard completamente dinamica e funzionante, sono necessari i seguenti interventi:

### Fase 1: Collegamento Dati Reali (Frontend)
1.  **Sostituire la Lista Mock**: Modificare `SuapDashboard.tsx` per chiamare `getSuapPratiche` (limit 5, sort by date desc) e visualizzare i dati reali al posto di "Mario Rossi".
2.  **Implementare Status Reale**: Creare un endpoint `/api/system/status` (o simile) che verifichi realmente la connessione con PDND/INPS e collegarlo ai semafori della dashboard.

### Fase 2: Verifica Flusso Completo
1.  Creare una nuova pratica dalla dashboard ("Nuova Simulazione").
2.  Verificare che i contatori incrementino (+1).
3.  Verificare che la nuova pratica appaia in cima alla lista "Attività Recente".
4.  Verificare che cliccando sulla pratica si apra il dettaglio corretto.

---

## 5. Conclusione

L'impressione di "staticità" lamentata è corretta e dovuta alla presenza di codice mock nel frontend. Il backend è pronto a supportare l'applicazione reale.
Con l'approvazione dell'utente, si procederà immediatamente alla **Fase 1** del piano di risoluzione.
