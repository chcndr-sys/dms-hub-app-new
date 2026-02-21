# PROGETTO: Integrazione Marca da Bollo Digitale (@e.bollo)

> **Versione:** v8.12.0
> **Data:** 21 Febbraio 2026
> **Autore:** Manus AI
> **Stato:** Progetto per Approvazione

---

## 1. Analisi e Contesto Normativo

La ricerca ha evidenziato un punto fondamentale: la **SCIA (Segnalazione Certificata di Inizio Attività) è generalmente esente da imposta di bollo**. Tuttavia, per il commercio su aree pubbliche, l'imposta è dovuta sulla **domanda di autorizzazione** e sul **rilascio della concessione**. Pertanto, sono necessarie **due marche da bollo da 16€** per un totale di 32€ per completare il ciclo.

## 2. Soluzioni di Integrazione: 3 Fasi

Per integrare il pagamento del bollo nel nostro sistema, propongo un approccio a 3 fasi, dalla più semplice e immediata alla più completa e integrata.

### Fase 1 (Immediata): Dichiarazione Sostitutiva

Questa è la soluzione più pragmatica e veloce, già adottata dalla maggior parte dei SUAP in Italia. Non richiede alcuna integrazione tecnica con sistemi esterni.

**Come funziona:**
1. L'utente (associazione) acquista le due marche da bollo fisiche (es. in tabaccheria).
2. Nel form di compilazione della SCIA/Domanda, vengono aggiunti i seguenti campi:
   - Numero Identificativo marca da bollo 1 (14 cifre)
   - Data di emissione marca da bollo 1
   - Numero Identificativo marca da bollo 2
   - Data di emissione marca da bollo 2
3. L'utente compila i campi e spunta una casella di **dichiarazione sostitutiva di atto di notorietà** (ai sensi del D.P.R. 445/2000), con cui dichiara di aver assolto l'imposta, di aver annullato i bolli e che non verranno riutilizzati.
4. La pratica viene inviata al SUAP con questa dichiarazione allegata.

**Vantaggi:**
- **Implementazione immediata:** si tratta solo di aggiungere campi al form.
- **Nessun costo di integrazione** o canone per servizi esterni.
- **Conformità normativa** garantita (D.M. 10/11/2011).

**Svantaggi:**
- L'esperienza utente non è completamente digitale.

### Fase 2 (Medio Termine): Integrazione PagoPA con @e.bollo

Questa soluzione offre un'esperienza utente completamente digitale e integrata, ma richiede un significativo sforzo burocratico e tecnico.

**Come funziona:**
1. **Adesione a PagoPA:** Il nostro sistema (DMS HUB) deve aderire a PagoPA come **Ente Creditore (EC)**, oppure, più realisticamente, tramite un **Partner Tecnologico Intermediario** (es. Abaco, Step, InfoCamere, etc.).
2. **Flusso di pagamento:**
   - L'utente compila la pratica.
   - Il nostro backend calcola l'hash del documento e invia una richiesta a PagoPA (`paGetPaymentV2`) con il tag `richiestaMarcaDaBollo`.
   - L'utente viene reindirizzato al checkout di PagoPA per pagare i 32€.
   - Il PSP (Prestatore di Servizi di Pagamento) elabora il pagamento e restituisce al nostro backend la marca da bollo digitale (un file XML) via `sendPaymentOutcomeV2`.
   - Il nostro sistema allega il file XML della marca da bollo alla pratica e la invia al SUAP.

**Vantaggi:**
- **Esperienza utente fluida e 100% digitale.**
- **Maggiore professionalità** e valore percepito del servizio.

**Svantaggi:**
- **Complessità burocratica:** l'adesione a PagoPA e la convenzione con l'Agenzia delle Entrate possono richiedere mesi.
- **Costi:** canoni per il partner tecnologico e commissioni per ogni transazione.
- **Complessità tecnica:** richiede lo sviluppo dell'integrazione con le API di PagoPA.

### Fase 3 (Lungo Termine): Acquisto Diretto e Wallet Bolli

Questa è l'evoluzione finale, che trasforma il bollo in un servizio a valore aggiunto.

**Come funziona:**
1. **Tab "Acquista @e.bollo":** Una nuova sezione nella dashboard permette alle associazioni di pre-acquistare pacchetti di marche da bollo digitali (es. 10, 50, 100 bolli) che vengono salvate in un "Wallet Bolli".
2. **Partnership con PSP:** Stringiamo un accordo diretto con un PSP convenzionato con @e.bollo per l'acquisto massivo.
3. **Compilazione Pratica:** Durante la compilazione della pratica, l'utente sceglie di usare i bolli dal proprio wallet. Il sistema associa l'IUBD del bollo all'hash del documento e lo allega.

**Vantaggi:**
- **Massima efficienza** per le associazioni che gestiscono molte pratiche.
- **Nuova opportunità di business:** possiamo applicare un piccolo margine sul costo dei pacchetti di bolli.
- **Fidelizzazione** del cliente.

## 3. La Scoperta E-FIL e la Nuova Proposta Operativa

La ricerca ha portato a una scoperta fondamentale: il **Comune di Grosseto utilizza già Plug&Pay di E-FIL** come portale di pagamento PagoPA. Questo cambia completamente lo scenario della Fase 2, rendendola molto più concreta e veloce.

**Prove:**
- Il portale pagamenti del Comune di Grosseto è `cittadino.plugandpay.it/C_E202`.
- La piattaforma Plug&Pay di E-FIL **supporta nativamente il "Bollo Virtuale"** come pagamento spontaneo (dimostrato dal Comune di Desenzano del Garda).
- Il Comune di Grosseto al momento **non ha ancora attivato** questo specifico servizio, ma è solo una questione di configurazione.

### Nuova Proposta Operativa (v2)

Alla luce di queste scoperte, la proposta operativa diventa:

**FASE 1 (Immediata): Dichiarazione Sostitutiva (Confermata)**
- **Azione:** Implementare subito i campi per l'inserimento dei numeri seriali dei bolli fisici e la dichiarazione sostitutiva nel form SCIA/Domanda.
- **Obiettivo:** Andare live immediatamente con una soluzione conforme alla normativa.

**FASE 2 (Medio Termine): Integrazione API E-FIL (Nuova)**
- **Azione:** Contattare E-FIL per:
  1. Chiedere l'attivazione del servizio "Bollo Virtuale" come pagamento spontaneo per il Comune di Grosseto (e per gli altri comuni clienti).
  2. Ottenere accesso alle loro **API per la creazione programmatica di posizioni debitorie**.
- **Flusso Tecnico:**
  1. L'utente compila la pratica nel nostro sistema.
  2. Al momento del bollo, il nostro backend chiama l'API di E-FIL per creare una posizione debitoria di 16€ per "Bollo Virtuale" associata al CF dell'utente.
  3. Il nostro sistema fa un redirect dell'utente alla pagina di pagamento di Plug&Pay con la posizione debitoria pre-compilata.
  4. L'utente paga tramite PagoPA.
  5. E-FIL notifica al nostro sistema l'avvenuto pagamento (via webhook o API di stato).
  6. Il nostro sistema allega la ricevuta di pagamento alla pratica e la invia al SUAP.
- **Vantaggi:** Molto più veloce e meno costoso dell'adesione diretta a PagoPA. Sfruttiamo un partner già integrato.

**FASE 3 (Lungo Termine): Wallet Bolli (Confermata)**
- Rimane come obiettivo a lungo termine, da valutare dopo il successo della Fase 2.

Questa nuova roadmap è molto più concreta e sfrutta l'infrastruttura esistente del vostro partner tecnologico E-FIL, riducendo drasticamente tempi e costi per la digitalizzazione del bollo.

---


Propongo di procedere come segue:

1. **Implementare immediatamente la Fase 1 (Dichiarazione Sostitutiva)** per rendere subito operativa la funzionalità. Questo ci permette di andare sul mercato senza ritardi.
2. **Avviare parallelamente l'iter burocratico per la Fase 2 (Integrazione PagoPA)**, contattando alcuni partner tecnologici per valutare costi e tempi di adesione.
3. **Valutare la Fase 3 (Wallet Bolli)** solo dopo aver completato con successo la Fase 2 e aver raggiunto un volume di pratiche significativo.

In questo modo, offriamo subito una soluzione funzionante e allo stesso tempo lavoriamo per un'integrazione futura più sofisticata e redditizia.
