# Report di Allineamento Tecnico e Normativo: Modulo SUAP/SSO MioHub

**Data:** 29 Dicembre 2024
**Autore:** Manus AI per MioHub Team
**Oggetto:** Gap Analysis tra implementazione attuale MioHub e specifiche tecniche nazionali (SSET, AgID, Impresa in un Giorno)

---

## 1. Introduzione e Obiettivo

Il presente documento analizza lo stato dell'arte del modulo "SSO SUAP" della piattaforma MioHub rispetto alle specifiche tecniche e normative fornite per l'interoperabilità con il Sistema Informativo degli Sportelli Unici (SSU) e il ruolo di Ente Terzo/Sussidiario.

L'analisi si basa sui seguenti documenti di riferimento forniti:
*   *SSET_ManualeOperativo_v.1_20250516.pdf* (Specifiche Soluzione Sussidiaria Enti Terzi)
*   *20231130_AgID_DocumentoOperativo_Pattern_di_interazione_v1.1* (Linee Guida Interoperabilità AgID)
*   *ImportaPraticaSUAP_manuale_d'uso_1.0.pdf* (Specifiche Web Service Importazione)
*   Altri manuali operativi e linee guida allegati.

## 2. Sintesi dell'Analisi (Executive Summary)

**Stato Attuale:** MioHub dispone di una dashboard moderna ed efficace per la gestione interna delle pratiche (Frontend React, Backend Node.js/Express), con moduli per la creazione manuale di SCIA e Concessioni.

**Gap Principale:** Manca l'infrastruttura di **interoperabilità standardizzata** necessaria per dialogare automaticamente con il Front Office nazionale (es. Impresa in un Giorno) o agire formalmente come Back Office Ente Terzo (BOET) accreditato. Attualmente il sistema è "isolato" e opera su dati inseriti manualmente o simulati, mentre le specifiche richiedono un'integrazione machine-to-machine basata su protocolli rigidi (SOAP/REST standard AgID).

**Verdetto:** Siamo sulla "giusta strada" per quanto riguarda l'esperienza utente e la gestione dei processi (workflow), ma è necessario un significativo intervento di sviluppo backend per conformarsi ai protocolli di scambio dati nazionali.

---

## 3. Analisi Dettagliata dei Requisiti vs Implementazione

### 3.1 Ruolo nel Sistema (SSET Manuale Operativo)

| Requisito Normativo | Stato MioHub | Gap / Azione Richiesta |
| :--- | :--- | :--- |
| **Ruolo Ente Terzo:** Il sistema deve agire come "Back Office Ente Terzo" (BOET) capace di ricevere istanze dal SUAP, chiedere integrazioni e inviare pareri. | MioHub gestisce pratiche internamente ma non ha "porte" aperte verso il SUAP nazionale. | **CRITICO:** Implementare i web service di ricezione pratiche secondo le specifiche tecniche dell'Allegato Tecnico al DPR 160/2010. |
| **Interoperabilità:** Comunicazione telematica obbligatoria tra Sportello Unico e Enti Terzi. | Comunicazione assente. Le pratiche sono create localmente. | Sviluppare connettori per ricevere il pacchetto della pratica (XML + Allegati) dal portale nazionale. |
| **SSET (Soluzione Sussidiaria):** Utilizzo transitorio della piattaforma SSET se il gestionale proprio non è pronto entro luglio 2025. | MioHub si candida come gestionale proprio (alternativa a SSET). | MioHub deve superare la **verifica di conformità** tecnica al MIMIT per sostituire la SSET. |

### 3.2 Protocolli di Comunicazione (AgID & ImportaPraticaSUAP)

| Requisito Tecnico | Stato MioHub | Gap / Azione Richiesta |
| :--- | :--- | :--- |
| **Web Service SOAP:** Il documento `ImportaPraticaSUAP` descrive un WS SOAP (`EsportaPraticaSuap`) per ricevere pratiche. | MioHub utilizza API REST JSON proprietarie. | **ALTO:** È necessario implementare un'interfaccia SOAP (o REST conforme alle nuove specifiche AgID ModI) che esponga i metodi standard (es. `esportaPraticaSuap`). |
| **Pattern di Interazione:** AgID definisce pattern bloccanti/non bloccanti (RPC, PUSH/PULL). | MioHub usa pattern REST standard sincroni. | Valutare l'adozione di pattern asincroni per la gestione di file di grandi dimensioni o processi lunghi, come suggerito dalle linee guida AgID. |
| **Formato Dati Input:** File `.ZIP` contenente `suap.xml` e documenti firmati (`.p7m`). | MioHub accetta dati JSON da form web. | Sviluppare un modulo di **Ingestion** che accetti file ZIP, li decomprima, validi l'XML `suap.xml` e estragga i metadati per popolare il database. |

### 3.3 Sicurezza e Autenticazione

| Requisito Sicurezza | Stato MioHub | Gap / Azione Richiesta |
| :--- | :--- | :--- |
| **Autenticazione Forte:** Accesso tramite SPID, CIE, CNS. | Accesso non specificato / Login proprietaria. | Integrare un gateway SPID/CIE per l'accesso degli operatori comunali. |
| **Sicurezza WS:** Autenticazione WS con username/password criptata o certificati (WS-Security). | Autenticazione JWT standard. | Implementare i meccanismi di sicurezza richiesti dai WS nazionali (es. cifratura password descritta in `ImportaPraticaSUAP`). |

---

## 4. Roadmap di Adeguamento Suggerita

Per trasformare MioHub da "gestionale isolato" a "nodo interoperabile" del sistema SUAP nazionale, suggerisco le seguenti fasi di sviluppo:

### Fase 1: Modulo di Ingestion (Priorità Alta)
*   Sviluppare un parser per il formato standard `suap.xml`.
*   Creare una funzione di upload che accetti il file `.ZIP` standard (come quello generato da Impresa in un Giorno).
*   Mappare i campi del `suap.xml` sul database di MioHub (richiedente, oggetto, allegati).
*   *Obiettivo:* Poter caricare manualmente una pratica scaricata dal portale nazionale e vederla correttamente nella dashboard.

### Fase 2: Interfaccia Web Service (Priorità Media)
*   Implementare l'endpoint SOAP/REST conforme alle specifiche `EsportaPraticaSuap`.
*   Gestire l'handshake di sicurezza e la ricezione automatica del pacchetto.
*   *Obiettivo:* Ricezione automatica machine-to-machine delle pratiche.

### Fase 3: Gestione Flussi di Ritorno (Priorità Bassa)
*   Implementare la generazione dei messaggi di ritorno (es. richiesta integrazione, parere, esito).
*   Generare i file XML di risposta conformi alle specifiche.
*   *Obiettivo:* Chiudere il ciclo di comunicazione inviando gli esiti al SUAP centrale.

## 5. Conclusione

MioHub ha un'ottima base funzionale e di interfaccia. L'allineamento alle specifiche inviate non richiede di riscrivere l'applicazione, ma di **aggiungere un layer di integrazione** (un "adattatore") che traduca il linguaggio standard nazionale (SOAP, XML, ZIP) nel linguaggio interno di MioHub (REST, JSON, DB).

Procedendo con la **Fase 1 (Modulo di Ingestion)**, potremo immediatamente testare la compatibilità con i dati reali senza dover attendere accreditamenti complessi.
