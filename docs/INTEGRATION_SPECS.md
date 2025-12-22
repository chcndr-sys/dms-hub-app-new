# Specifiche di Integrazione - PagoPA e SSO SUAP

## 1. Integrazione PagoPA

### 1.1 Panoramica

L'integrazione con PagoPA permette di gestire i pagamenti del canone mercatale, delle sanzioni e di altri tributi comunali. La piattaforma DMS HUB si integrerà con il Nodo dei Pagamenti-SPC per:

- **Generare avvisi di pagamento** con Identificativo Univoco di Versamento (IUV)
- **Verificare lo stato dei pagamenti** in tempo reale
- **Riconciliare gli incassi** con la tesoreria comunale

### 1.2 Modalità di Integrazione

La modalità di integrazione scelta è tramite **API asincrone**, che non richiede il conferimento obbligatorio delle posizioni debitorie all'Archivio Centralizzato Avviso (ACA).

### 1.3 Flusso di Pagamento

1. **Generazione Avviso**: Il DMS HUB genera un avviso di pagamento con IUV per ogni concessione o sanzione.
2. **Notifica al Cittadino**: L'avviso viene notificato all'operatore tramite email, PEC o App IO.
3. **Pagamento**: L'operatore paga l'avviso tramite i canali PagoPA (online, app, tabaccherie, ecc.).
4. **Ricevuta Telematica (RT)**: Il Nodo dei Pagamenti invia una Ricevuta Telematica al DMS HUB che attesta l'avvenuto pagamento.
5. **Aggiornamento Stato**: Lo stato del pagamento viene aggiornato nel tab "Wallet/PagoPA" della dashboard.

### 1.4 Endpoint API (da implementare)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/pagopa/avvisi` | Crea un nuovo avviso di pagamento |
| `GET` | `/api/pagopa/avvisi/{iuv}` | Verifica lo stato di un avviso |
| `POST` | `/api/pagopa/rt` | Endpoint di notifica per la Ricevuta Telematica |

### 1.5 Tab "Wallet/PagoPA" nella Dashboard

Il tab "Wallet/PagoPA" mostrerà:

- **Statistiche**: Totale Incassato, Pagamenti Completati, In Attesa, Scaduti
- **Lista Pagamenti**: Dettaglio dei pagamenti con stato (Pagato, In Attesa, Scaduto)
- **Azioni**: Genera avviso, Invia sollecito, Visualizza ricevuta

---

## 2. Integrazione SSO SUAP

### 2.1 Panoramica

L'integrazione con la **Soluzione Sussidiaria Enti Terzi (SSET)** del sistema SUAP permette di ricevere e gestire le pratiche telematiche (SCIA, subingressi, volture) direttamente nella dashboard DMS HUB.

### 2.2 Flusso Dati

1. **Invio Pratica**: L'impresa invia una pratica (es. SCIA di subingresso) al SUAP tramite il portale "impresainungiorno.gov.it".
2. **Inoltro a SSET**: Il SUAP inoltra la pratica alla SSET, che funge da Back Office per l'Ente Terzo (in questo caso, il gestore del mercato).
3. **Notifica a DMS HUB**: La SSET notifica al DMS HUB la ricezione di una nuova pratica tramite API/webhook.
4. **Visualizzazione in Dashboard**: La pratica viene visualizzata nel tab "SSO SUAP" della dashboard con tutti i dettagli e gli allegati.
5. **Gestione Pratica**: L'operatore del Comune può visualizzare la pratica, richiedere integrazioni e inviare il parere finale.

### 2.3 Endpoint API (da implementare)

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/suap/pratiche` | Endpoint di notifica per nuove pratiche da SSET |
| `GET` | `/api/suap/pratiche` | Ottiene la lista di tutte le pratiche |
| `GET` | `/api/suap/pratiche/{id}` | Ottiene il dettaglio di una singola pratica |
| `POST` | `/api/suap/pratiche/{id}/parere` | Invia il parere (favorevole/sfavorevole) alla SSET |

### 2.4 Tab "SSO SUAP" nella Dashboard

Il tab "SSO SUAP" mostrerà:

- **Statistiche**: Pratiche Totali, In Lavorazione, Approvate, Rigettate
- **Lista Pratiche**: Dettaglio delle pratiche con stato (In Lavorazione, Approvata, Integrazione Richiesta, Rigettata)
- **Azioni**: Visualizza pratica, Scarica allegati, Richiedi integrazione, Invia parere

## 3. Riferimenti

- [Documentazione PagoPA per Enti Creditori](https://developer.pagopa.it/pago-pa/guides/sanp)
- [Soluzione Sussidiaria Enti Terzi (SSET) - impresainungiorno.gov.it](https://www.impresainungiorno.gov.it/web/l-impresa-e-la-pa-centrale/ssu-soluzione-sussidiaria-enti-terzi)
- [Manuale Operativo Catalogo SSU su PDND](https://catalogo.impresainungiorno.gov.it/assets/config/files/manuale_operativo_Eservice_CatalogoSSU.pdf)
