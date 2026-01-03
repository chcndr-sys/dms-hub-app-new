# Analisi Dati SCIA per Autocompilazione Form Concessione

## SCIA-2026-4514 - Alimentari Verdi

### Dati Pratica SCIA
- NUMERO PROTOCOLLO: SCIA-2026-4514
- DATA PRESENTAZIONE: 02/01/2026
- COMUNE PRESENTAZIONE: MODENA
- TIPO SEGNALAZIONE: subingresso
- MOTIVO SUBINGRESSO: affitto
- SETTORE MERCEOLOGICO: Non Alimentare
- RUOLO DICHIARANTE: associazione

### Dati Delegato / Procuratore
- NOME: Chi
- COGNOME: ss
- CODICE FISCALE: DD
- DATA DI NASCITA: 02/01/1980
- LUOGO DI NASCITA: Bb
- QUALIFICA: Hhh
- RESIDENZA VIA: hhh
- RESIDENZA COMUNE: jjj
- RESIDENZA CAP: 55
- PEC: -

### A. Dati Subentrante (sub_*)
- PARTITA IVA: - (VUOTO!)
- CODICE FISCALE: IT34567890123
- RAGIONE SOCIALE: Alimentari Verdi
- NOME: Luca
- COGNOME: Verdi
- DATA DI NASCITA: 10/01/1978
- LUOGO DI NASCITA: Grosseto
- RESIDENZA VIA: Via Aurelia 120
- RESIDENZA COMUNE: Grosseto
- RESIDENZA CAP: 58100
- SEDE IMPRESA VIA: Via g verdi
- SEDE IMPRESA COMUNE: Grosseto
- SEDE IMPRESA PROVINCIA: - (VUOTO!)
- SEDE IMPRESA CAP: - (VUOTO!)
- PEC: alimentariverdi@pec.it
- TELEFONO: +39 333 3456789

### B. Dati Cedente (ced_*)
- PARTITA IVA: - (VUOTO!)
- CODICE FISCALE: chcndr71p20f257g
- RAGIONE SOCIALE: Intim8
- NOME: andrea
- COGNOME: checchi
- DATA DI NASCITA: 20/09/1971

## PROBLEMA IDENTIFICATO

Il problema è che nel database della SCIA:
1. **sub_partita_iva** è VUOTO (solo il CF è popolato)
2. **ced_partita_iva** è VUOTO
3. **sede_impresa_provincia** e **sede_impresa_cap** sono VUOTI

Quando si clicca "Genera Concessione", il preData viene costruito con questi valori vuoti.

## SOLUZIONE

Il form Concessione dovrebbe:
1. Pre-compilare TUTTI i campi disponibili dalla SCIA (non solo P.IVA)
2. I campi Nome, Cognome, Data Nascita, Residenza dovrebbero essere pre-compilati
3. Verificare che l'useEffect nel ConcessioneForm applichi correttamente initialData


## Dati Cedente (continuazione)
- LUOGO DI NASCITA: Modena
- RESIDENZA VIA: via di Mezzo 282
- RESIDENZA COMUNE: vignola
- RESIDENZA CAP: 41058
- PEC: checchiintim8@legalmail.it
- SCIA PRECEDENTE N. PROT.: 444
- DATA PRESENTAZIONE SCIA PREC.: 02/01/2024
- COMUNE PRESENTAZIONE SCIA PREC.: BOLOGNA

## C. Dati Posteggio e Mercato
- MERCATO: Mercato Grosseto
- ID MERCATO: 1
- NUMERO POSTEGGIO: 7
- ID POSTEGGIO: 7
- UBICAZIONE: Grosseto
- GIORNO MERCATO: Giovedì
- FILA: -
- DIMENSIONI (MQ): 30.40
- DIMENSIONI LINEARI: 4.00 x 7.60
- ATTREZZATURE: banco

## D. Estremi Atto Notarile
- NOTAIO ROGANTE: Scuderi
- N. REPERTORIO: 444444
- DATA ATTO: 02/01/2026

## MAPPATURA CAMPI SCIA -> FORM CONCESSIONE

| Campo SCIA | Campo Form Concessione | Valore Esempio |
|------------|------------------------|----------------|
| sub_partita_iva | partita_iva | (vuoto) |
| richiedente_cf | cf_concessionario | IT34567890123 |
| sub_ragione_sociale | ragione_sociale | Alimentari Verdi |
| sub_nome | nome | Luca |
| sub_cognome | cognome | Verdi |
| sub_data_nascita | data_nascita | 10/01/1978 |
| sub_luogo_nascita | luogo_nascita | Grosseto |
| sub_residenza_via | residenza_via | Via Aurelia 120 |
| sub_residenza_comune | residenza_comune | Grosseto |
| sub_residenza_cap | residenza_cap | 58100 |
| sub_sede_via | sede_legale_via | Via g verdi |
| sub_sede_comune | sede_legale_comune | Grosseto |
| sub_sede_provincia | sede_legale_provincia | (vuoto) |
| sub_sede_cap | sede_legale_cap | (vuoto) |
| ced_cf | cedente_cf | chcndr71p20f257g |
| ced_partita_iva | cedente_partita_iva | (vuoto) |
| ced_ragione_sociale | cedente_ragione_sociale | Intim8 |
| ced_scia_precedente | scia_precedente_numero | 444 |
| ced_data_presentazione | scia_precedente_data | 02/01/2024 |
| ced_comune_presentazione | scia_precedente_comune | BOLOGNA |
| mercato_id | mercato_id | 1 |
| mercato_nome | mercato | Mercato Grosseto |
| posteggio_id | posteggio_id | 7 |
| posteggio_numero | posteggio | 7 |
| dimensioni_mq | mq | 30.40 |
| dimensioni_lineari | dimensioni_lineari | 4.00 x 7.60 |
| giorno_mercato | giorno | Giovedì |
| attrezzature | attrezzature | banco |
