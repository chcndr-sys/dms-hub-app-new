# Mappatura Campi SCIA e Concessione vs Database MIO Hub

**Obiettivo**: Definire la corrispondenza tra i campi dei moduli ufficiali (SCIA Subingresso, Concessione) e le tabelle del database interno per abilitare l'auto-compilazione.

---

## 1. SCIA - Segnalazione Certificata di Inizio Attività (Subingresso)

**Fonte**: Modello Unificato Regionale (Emilia-Romagna) / Nazionale.

### Sezione A: Dati Anagrafici (Cessionario / Subentrante)
| Campo Modulo | Tabella DB (`imprese`) | Colonna DB | Note |
| :--- | :--- | :--- | :--- |
| Codice Fiscale / P.IVA | `imprese` | `codice_fiscale` | **Chiave di Ricerca** |
| Denominazione / Ragione Sociale | `imprese` | `ragione_sociale` | Auto-fill |
| Comune Sede Legale | `imprese` | `comune` | Auto-fill |
| Indirizzo Sede Legale | `imprese` | `indirizzo` | Auto-fill |
| PEC | `imprese` | `pec` | Auto-fill |
| Legale Rappresentante | `imprese` | `legale_rappresentante` | Auto-fill |

### Sezione B: Dati Cedente (Dante Causa)
| Campo Modulo | Tabella DB (`imprese`) | Colonna DB | Note |
| :--- | :--- | :--- | :--- |
| Codice Fiscale Cedente | `imprese` | `codice_fiscale` | **Input Manuale** (Lookup su DB) |
| Denominazione Cedente | `imprese` | `ragione_sociale` | Auto-fill da Lookup |

### Sezione C: Attività e Posteggio
| Campo Modulo | Tabella DB (`stalls`, `markets`) | Colonna DB | Note |
| :--- | :--- | :--- | :--- |
| Comune Mercato | `markets` | `city` | Auto-fill da contesto |
| Denominazione Mercato | `markets` | `name` | Auto-fill da contesto |
| Numero Posteggio | `stalls` | `code` | **Input Manuale** (Select) |
| Dimensioni (Mq) | `stalls` | `area_mq` | Auto-fill |
| Dimensioni (Front x Prof) | `stalls` | `width`, `depth` | Auto-fill |
| Settore Merceologico | `vendors` | `sector` | Auto-fill (se presente) |

### Sezione D: Estremi Atto Notarile
*   Notaio Rogante (Input Manuale)
*   Numero Repertorio (Input Manuale)
*   Data Atto (Input Manuale)
*   Data Registrazione (Input Manuale)

---

## 2. Atto di Concessione Posteggio

**Fonte**: Fac-simile Atto Concessione (Mantova/Standard).

### Dati Intestazione
| Campo Modulo | Tabella DB | Colonna DB | Note |
| :--- | :--- | :--- | :--- |
| Numero Concessione | `concessions` | `code` | Generato / Input |
| Data Rilascio | `concessions` | `issue_date` | Input / Oggi |
| Scadenza | `concessions` | `expiry_date` | Calcolato (es. 12 anni) |

### Dati Concessionario
*   Vedi Sezione A della SCIA (prelevati da `imprese`).

### Dati Posteggio
| Campo Modulo | Tabella DB (`stalls`) | Colonna DB | Note |
| :--- | :--- | :--- | :--- |
| Ubicazione (Via/Piazza) | `markets` | `address` | Auto-fill |
| Numero Posteggio | `stalls` | `code` | Auto-fill |
| Superficie (mq) | `stalls` | `area_mq` | Auto-fill |
| Giorno di Mercato | `markets` | `day_of_week` | Auto-fill |

### Dati Economici (Canone)
| Campo Modulo | Tabella DB (`wallets`) | Colonna DB | Note |
| :--- | :--- | :--- | :--- |
| Canone Annuo (CUP) | - | - | Calcolato da Regolamento |
| Stato Pagamenti | `wallets` | `balance` | Check Regolarità (Semaforo) |

---

## 3. Strategia di Implementazione Frontend

### Componente `SciaForm.tsx`
*   **Step 1**: Inserimento CF Subentrante -> Lookup DB -> Pre-compilazione Anagrafica.
*   **Step 2**: Selezione Mercato e Posteggio -> Lookup DB -> Pre-compilazione Dati Tecnici.
*   **Step 3**: Inserimento Dati Atto (Manuale).
*   **Step 4**: Generazione PDF (Anteprima).

### Componente `ConcessioneForm.tsx`
*   **Step 1**: Selezione Pratica SCIA (se derivata) o Inserimento CF.
*   **Step 2**: Visualizzazione Dati Posteggio (Read-only da DB).
*   **Step 3**: Definizione Durata e Scadenza.
*   **Step 4**: Stampa Atto.
