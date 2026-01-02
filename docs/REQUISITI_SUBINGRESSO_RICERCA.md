# Requisiti Normativi per Subingresso Commercio Ambulante

## Fonte: Comune di Formigine (MO) - Aggiornato 18/02/2025

### REQUISITI MORALI (Onorabilità)
Per ottenere l'autorizzazione all'esercizio dell'attività di commercio ambulante:

1. **Maggiore età** - Avere compiuto 18 anni
2. **Assenza condanne penali** - Non avere subito condanne in materia penale
3. **Assenza pendenze antimafia** - Non avere pendenze relative a reati soggetti alla legislazione antimafia

### REQUISITI PROFESSIONALI (Solo settore alimentare)
Per vendita prodotti alimentari e/o somministrazione bevande/alimenti, possedere UNO dei seguenti:

a) **Corso professionale** - Frequentato con esito positivo un corso di formazione professionale per il commercio nel settore merceologico alimentare, riconosciuto dalla Regione

b) **Esperienza lavorativa** - Esercitato un'attività analoga per almeno 2 anni negli ultimi 5 anni come:
   - Titolare
   - Socio
   - Dipendente qualificato
   - Collaboratore

c) **Titolo di studio** - Diploma di scuola secondaria superiore o laurea, o altra scuola a indirizzo professionale almeno triennale, purché nel corso di studi siano previste materie attinenti al commercio, alla preparazione o alla somministrazione degli alimenti

d) **REC** - Essere stato iscritto nel Registro Esercenti il Commercio (REC) per attività di somministrazione al pubblico di alimenti e bevande e/o per la vendita di generi alimentari

### REQUISITI AMMINISTRATIVI (Sempre obbligatori)
L'ambulante deve SEMPRE:

- ✅ **Partita IVA** - Essere in possesso della partita IVA
- ✅ **Registro Imprese** - Essere iscritto al Registro Imprese presso la Camera di Commercio
- ✅ **INPS** - Essere iscritto all'INPS per assistenza sanitaria e previdenziale (se attività esclusiva/prevalente)
- ✅ **INAIL** - Essere iscritto all'INAIL per assicurazione infortuni (se ha familiari collaboratori e/o dipendenti, o società)
- ✅ **DURC** - Essere in regola con i versamenti contributivi (DURC regolare)
- ✅ **Tributi locali** - Essere in regola con il pagamento di tutti i tributi locali

---

## Riferimenti Normativi

- **D.Lgs. 114/98** - Riforma del commercio (art. 27 ss. per commercio ambulante)
- **D.Lgs. 59/2010** - Art. 71 (requisiti morali)
- **Legge Antimafia** - Verifica assenza pregiudiziali
- **L.R. Emilia-Romagna 62/2018** - Art. 12 (requisiti professionali)

---

## Requisiti Specifici per SUBINGRESSO

Da ricerche aggiuntive (Comune di Milano, Trento, Rivoli):

1. **Requisiti morali** - Come sopra
2. **Requisiti professionali** - Solo per settore alimentare
3. **Assenza pregiudiziali antimafia** - Comunicazione dalla Prefettura
4. **Limite posteggi** - Non possedere già più posteggi del consentito:
   - Max 2 posteggi se mercato ≤ 100 posti
   - Max 3 posteggi se mercato > 100 posti
5. **Pagamenti in regola** - Canone unico e tributi locali

---

## Controlli da Implementare nel Sistema MioHub

### CONTROLLI HARD (Bloccanti)
| Codice | Descrizione | Fonte Dati |
|--------|-------------|------------|
| CHECK_DURC | Regolarità DURC | Qualificazioni |
| CHECK_ONORABILITA | Requisiti di onorabilità (autocertificazione) | Qualificazioni |
| CHECK_ANTIMAFIA | Assenza pregiudiziali antimafia | Qualificazioni |
| CHECK_CANONE | Pagamento canone unico non in mora | Wallet posteggio |
| CHECK_LIMITE_POSTEGGI | Non superare limite posteggi | Concessioni |
| CHECK_IMPRESA_ATTIVA | Impresa registrata e attiva | Imprese |

### CONTROLLI SOFT (Warning)
| Codice | Descrizione | Fonte Dati |
|--------|-------------|------------|
| CHECK_ALIMENTARE | Abilitazione somministrazione alimentari | Qualificazioni |
| CHECK_HACCP | Certificazione HACCP valida | Qualificazioni |
| CHECK_PEC | PEC valida | Imprese |
| CHECK_ATTO_NOTARILE | Estremi atto notarile completi | Pratica SCIA |

### Controlli da applicare a ENTRAMBI (Subentrante e Cedente)
- CHECK_DURC
- CHECK_ONORABILITA  
- CHECK_ANTIMAFIA
- CHECK_CANONE (solo cedente per posteggio ceduto)
- CHECK_IMPRESA_ATTIVA
