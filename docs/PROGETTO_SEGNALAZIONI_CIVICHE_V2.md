# 📝 PROGETTO: SEGNALAZIONI CIVICHE V2

> **Versione:** 1.0  
> **Data:** 26 Gennaio 2026  
> **Autore:** Manus AI

---

## 1. OBIETTIVO

Completare il modulo **Segnalazioni Civiche** per permettere ai cittadini di inviare segnalazioni dall'app e alla Polizia Municipale di gestirle dalla Dashboard PA.

## 2. ANALISI AS-IS

| Componente | Stato Attuale |
|------------|---------------|
| **App (CivicPage.tsx)** | Form funzionante con geolocalizzazione, ma invio **simulato** (setTimeout) |
| **Dashboard PA** | Tab "Segnalazioni & IoT" con dati **mock** (finti) |
| **Backend** | Tabella `civic_reports` esiste, ma **nessun endpoint** per creare/aggiornare segnalazioni |
| **Database** | Tabella `civic_reports` presente con colonne base |

## 3. ARCHITETTURA TO-BE

### Schema Connessioni

```mermaid
graph TD
    subgraph App Cittadino
        A[CivicPage.tsx] -- Invio Segnalazione --> B{API /api/civic-reports/create};
    end

    subgraph Backend (Hetzner)
        B -- Salva su DB --> C[Tabella civic_reports];
        D[DashboardPA.tsx] -- Richiesta Dati --> E{API /api/civic-reports/list};
        E -- Legge da DB --> C;
    end

    subgraph Dashboard PA
        D -- Mostra dati --> F[Tab Segnalazioni];
    end
```

### Tabella `civic_reports` - Aggiornamento

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | SERIAL | PK |
| `user_id` | INT | FK a `users` |
| `comune_id` | INT | **NUOVA** - FK a `comuni` |
| `type` | VARCHAR | Categoria (Degrado, Rifiuti, etc.) |
| `description` | TEXT | Descrizione dettagliata |
| `lat` | VARCHAR | Latitudine |
| `lng` | VARCHAR | Longitudine |
| `address` | TEXT | **NUOVA** - Indirizzo da reverse geocoding |
| `photo_urls` | TEXT[] | **NUOVA** - Array di URL foto (S3) |
| `status` | VARCHAR | `pending`, `in_progress`, `resolved`, `rejected` |
| `assigned_to` | INT | **NUOVA** - FK a `users` (operatore PM) |
| `notes` | TEXT | **NUOVA** - Note interne della PM |
| `created_at` | TIMESTAMP | Data creazione |
| `updated_at` | TIMESTAMP | Data aggiornamento |

## 4. PIANO DI IMPLEMENTAZIONE

### FASE 1: Backend

1.  **Aggiornare tabella `civic_reports`** con le nuove colonne.
2.  **Creare endpoint API** in `mihub-backend-rest`:
    -   `POST /api/civic-reports/create` - Crea nuova segnalazione (con upload foto su S3)
    -   `GET /api/civic-reports/list` - Lista segnalazioni (con filtro per comune)
    -   `PUT /api/civic-reports/:id/assign` - Assegna a operatore
    -   `PUT /api/civic-reports/:id/status` - Aggiorna stato
    -   `POST /api/civic-reports/:id/notes` - Aggiungi nota interna

### FASE 2: App Cittadino (CivicPage.tsx)

1.  **Sostituire invio simulato** con chiamata a `POST /api/civic-reports/create`.
2.  **Implementare upload foto** (max 3) su S3 e passare gli URL all'API.
3.  **Migliorare UI** con feedback real-time (es. spinner durante upload).

### FASE 3: Dashboard PA

1.  **Creare sotto-tab "Segnalazioni"** in Controlli/Sanzioni.
2.  **Sostituire dati mock** con chiamata a `GET /api/civic-reports/list`.
3.  **Implementare UI di gestione**:
    -   Lista segnalazioni con filtri (stato, comune, categoria).
    -   Modal dettaglio con mappa, foto, e cronologia stati.
    -   Pulsanti per "Assegna a operatore", "Cambia Stato", "Aggiungi Nota".

## 5. VINCOLI E REQUISITI

-   Le foto devono essere salvate su un bucket S3 dedicato.
-   Le notifiche push (future) informeranno l'utente sui cambi di stato.
-   Il sistema deve garantire la privacy dei dati utente.
-   I crediti (+20) verranno assegnati solo allo stato `resolved`.

---
