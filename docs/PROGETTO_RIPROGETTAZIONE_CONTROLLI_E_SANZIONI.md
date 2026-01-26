# Progetto di Riprogettazione: Sezione Controlli e Sanzioni PM

**Versione:** 2.0
**Data:** 26 Gennaio 2026
**Autore:** Manus AI

---

## 1. Introduzione

Questo documento delinea la riprogettazione completa della sezione "Controlli e Sanzioni" per la Polizia Municipale all'interno del DMS Hub. La versione attuale è stata giudicata inadeguata e non professionale. L'obiettivo è creare una soluzione di livello enterprise, basata su standard reali e gestionali PM professionali, che sia efficiente, completa e all'altezza del resto della piattaforma.

---

## 2. Analisi dei Requisiti e Criticità Attuali

La versione 1.0 presenta le seguenti criticità:

- **Lentezza:** Il modulo impiega troppo tempo a caricarsi.
- **Form Inadeguati:** I form per "Nuovo Controllo" e "Nuovo Verbale" sono troppo semplici e non contengono i campi necessari per un verbale di polizia amministrativa.
- **Mancanza di Dettaglio:** I verbali salvati non sono visualizzabili per intero.
- **Selezione Sanzione:** La pagina "Tipi Infrazione" è superflua; è sufficiente un popup di selezione.
- **Mancanza di Automazione:** I dati (Comune, Corpo PM, Agenti, testo di legge) non sono auto-compilati.
- **Architettura Debole:** L'architettura di invio, notifica e tracciamento non è robusta.

---

## 3. Ricerca e Riferimenti

La riprogettazione si basa sull'analisi di:

1. **Gazzetta Ufficiale (Schema di verbale di accertamento di violazione amministrativa):** Fornisce la struttura legale e i campi obbligatori di un verbale.
2. **Software Gestionale "Concilia" (Maggioli):** Offre un modello di riferimento per le funzionalità e l'iter procedurale di un gestionale PM professionale.
3. **D.Lgs. n. 114 del 1998 e L. 689/1981:** Forniscono i riferimenti normativi per le sanzioni amministrative in materia di commercio.

---

## 4. Architettura Proposta (Versione 2.0)

### 4.1. Flusso Utente e Interfaccia

1. **Form "Nuovo Verbale" a Pagina Intera:**
   - Sostituisce il popup attuale.
   - Layout a sezioni, basato sulla struttura del verbale ufficiale.
   - **Auto-compilazione** dei dati dell'Ente (Comune, Corpo PM) e dell'agente accertatore (loggato).
   - **Selezione Impresa/Trasgressore:** Ricerca anagrafica nell'elenco imprese del DMS Hub.
   - **Selezione Tipo Infrazione:** Tramite **popup di ricerca** che mostra il catalogo delle 16 infrazioni. Una volta selezionata, il campo "Testo di Legge Violato" e l'importo (min/max) vengono compilati automaticamente.

2. **Visualizzazione Verbale Completo (PDF):**
   - Dopo il salvataggio, il sistema genera un **PDF del verbale completo**, identico al formato cartaceo, con tutti i dati inseriti.
   - Il PDF viene salvato nello storico e può essere visualizzato o stampato in qualsiasi momento.

3. **Dashboard e Liste:**
   - La dashboard principale mostra KPI e riepiloghi.
   - La lista "Verbali Emessi" mostra i verbali con stato (Pagato, Non Pagato, In Ricorso) e permette di visualizzare il PDF completo.

### 4.2. Architettura Tecnica

**Database (Modifiche e Integrazioni):**

- **Tabella `sanctions` (Verbali):**
  - Aggiungere un campo `verbale_data_json` (tipo JSONB) per salvare **tutti** i dati del form del verbale, garantendo che nessuna informazione vada persa.
  - Aggiungere un campo `verbale_pdf_path` per memorizzare il percorso del PDF generato.

- **Tabella `infraction_types` (Tipi Infrazione):**
  - Aggiungere un campo `testo_legge_completo` (TEXT) con il riferimento normativo esatto da inserire nel verbale.

**Backend (Nuovi Endpoint e Modifiche):**

- **`POST /api/sanctions` (Nuovo Verbale):**
  - Riceve i dati dal nuovo form a pagina intera.
  - Salva i dati completi nel campo `verbale_data_json`.
  - **Genera il PDF del verbale** utilizzando una libreria come `fpdf2` o `reportlab` e lo salva in un bucket S3.
  - Salva il percorso del PDF in `verbale_pdf_path`.
  - Invia la notifica all'impresa con il link al PDF del verbale.

- **`GET /api/sanctions/:id/pdf`:**
  - Endpoint per recuperare e visualizzare il PDF di un verbale specifico.

**Frontend:**

- **Componente `NuovoVerbalePage.tsx`:**
  - Pagina dedicata (non più un modal) con il form completo.
  - Logica di auto-compilazione e selezione.

- **Componente `VisualizzaVerbale.tsx`:**
  - Componente per visualizzare il PDF del verbale all'interno dell'interfaccia.

### 4.3. Schema Architetturale

```mermaid
flowchart TD
    subgraph Frontend (React)
        A[Dashboard PM] -->|Click "Nuovo Verbale"| B(NuovoVerbalePage.tsx)
        B -->|Selezione Infrazione| C{Popup Selezione Infrazione}
        C -->|Seleziona| B
        B -->|Salva| D[API: POST /api/sanctions]
        E[Lista Verbali] -->|Click Visualizza| F[API: GET /api/sanctions/:id/pdf]
        F --> G(VisualizzaVerbale.tsx)
    end

    subgraph Backend (Node.js/Express)
        D --> H{Endpoint: POST /api/sanctions}
        H --> I[Salva dati in tabella `sanctions` (JSONB)]
        H --> J[Genera PDF Verbale]
        J --> K[Salva PDF in S3]
        H --> L[Invia Notifica a Impresa]
        F --> M{Endpoint: GET /api/sanctions/:id/pdf}
        M --> N[Recupera PDF da S3]
    end

    subgraph Database (PostgreSQL)
        I --> O(Tabella: sanctions)
        C --> P(Tabella: infraction_types)
    end

    subgraph Servizi Esterni
        K --> Q(Amazon S3)
    end
```

---

## 5. Piano di Sviluppo

1. **Sprint 1 (Backend):**
   - Modificare le tabelle `sanctions` e `infraction_types`.
   - Aggiornare l'endpoint `POST /api/sanctions` per gestire i dati JSON e la generazione/salvataggio del PDF.
   - Creare l'endpoint `GET /api/sanctions/:id/pdf`.

2. **Sprint 2 (Frontend):**
   - Creare la pagina `NuovoVerbalePage.tsx` con il form completo.
   - Implementare il popup di selezione infrazione.
   - Sostituire il vecchio modal con la nuova pagina.

3. **Sprint 3 (Integrazione e Finalizzazione):**
   - Creare il componente `VisualizzaVerbale.tsx`.
   - Integrare la visualizzazione del PDF nella lista verbali.
   - Testare l'intero flusso e ottimizzare le performance di caricamento.

---

Questo approccio garantisce una soluzione robusta, professionale e scalabile, in linea con le aspettative per una piattaforma di alto livello come il DMS Hub.
