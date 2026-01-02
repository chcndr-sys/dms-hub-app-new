# 🔍 PROGETTO: Motore di Verifica SCIA - Controlli Reali

> **Versione:** 1.0.0  
> **Data:** 2 Gennaio 2026  
> **Autore:** Manus AI  
> **Stato:** PROGETTO

---

## 📋 EXECUTIVE SUMMARY

Questo documento descrive il progetto per l'implementazione di un **motore di verifica avanzato** per le pratiche SCIA di subingresso nel commercio ambulante. L'obiettivo è trasformare i controlli attuali, che sono principalmente formali e basati sulla completezza dei dati, in **verifiche sostanziali** che accedono ai dati reali del sistema MioHub.

---

## 🔄 STATO ATTUALE DEL MOTORE DI VERIFICA

### Analisi del Codice Esistente

Il motore di verifica attuale si trova nel file `/mihub-backend-rest/src/modules/suap/service.js` nella funzione `runEvaluation()`. Attualmente esegue **6 controlli** di base:

| Codice Check | Tipo | Peso | Descrizione | Implementazione Attuale |
|--------------|------|------|-------------|------------------------|
| `CHECK_CF_VALIDO` | HARD | 20 | Verifica Codice Fiscale | Controlla solo formato (16 o 11 caratteri) |
| `CHECK_DATI_COMPLETI` | HARD | 25 | Completezza Dati Obbligatori | Verifica presenza campi base |
| `CHECK_MERCATO_VALIDO` | HARD | 20 | Mercato e Posteggio Validi | Controlla solo se specificati |
| `CHECK_ATTO_NOTARILE` | SOFT | 15 | Estremi Atto Notarile | Verifica presenza notaio e repertorio |
| `CHECK_CEDENTE` | SOFT | 10 | Dati Cedente Completi | Controlla solo se CF cedente presente |
| `CHECK_PEC` | SOFT | 10 | PEC Valida | Verifica solo presenza @ |

### Problemi Identificati

1. **Nessuna verifica sostanziale** - I controlli non accedono ai dati reali del sistema
2. **Solo controlli sul Subentrante** - Il Cedente non viene verificato
3. **Nessun controllo su DURC** - La regolarità contributiva non è verificata
4. **Nessun controllo su Wallet** - I pagamenti del canone non sono verificati
5. **Nessun controllo su limite posteggi** - Non si verifica se l'impresa ha già troppi posteggi
6. **Nessun controllo su qualificazioni** - Onorabilità, antimafia, HACCP non verificati

---

## 📜 REQUISITI NORMATIVI

Dalla ricerca effettuata sui regolamenti comunali e la normativa nazionale, i requisiti per il subingresso nel commercio ambulante sono:

### Requisiti Morali (Onorabilità) - Art. 71 D.Lgs. 59/2010

> "Non avere subito condanne in materia penale, di non avere pendenze relative a reati soggetti alla legislazione antimafia."

Questi requisiti sono attualmente **autocertificati** dal richiedente. Il sistema deve:
- Registrare l'autocertificazione come qualificazione
- Verificare che esista e sia valida al momento della pratica

### Requisiti Professionali - Solo Settore Alimentare

Per la vendita di prodotti alimentari, il richiedente deve possedere **uno** dei seguenti:
- Corso professionale riconosciuto dalla Regione
- Esperienza lavorativa di almeno 2 anni negli ultimi 5
- Diploma/laurea con materie attinenti
- Iscrizione al REC

### Requisiti Amministrativi - Sempre Obbligatori

| Requisito | Fonte Dati MioHub |
|-----------|-------------------|
| DURC regolare | Tabella `qualificazioni` (tipo: DURC) |
| Impresa attiva | Tabella `imprese` (campo stato) |
| Pagamento canone | Tabella `wallets` (campo balance) |
| Limite posteggi | Tabella `concessions` (count per impresa) |

### Limite Posteggi - Normativa Regionale

> "Non possedere già più di due posteggi se il mercato non è superiore a 100 posti, o tre posteggi se il mercato è superiore ai 100 posti."

---

## 🎯 NUOVI CONTROLLI DA IMPLEMENTARE

### Schema Controlli Proposto

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MOTORE VERIFICA SCIA v2.0                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 CONTROLLI SUBENTRANTE                        │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  [HARD] CHECK_DURC_SUB          → qualificazioni            │   │
│  │  [HARD] CHECK_ONORABILITA_SUB   → qualificazioni            │   │
│  │  [HARD] CHECK_ANTIMAFIA_SUB     → qualificazioni            │   │
│  │  [HARD] CHECK_IMPRESA_ATTIVA_SUB → imprese                  │   │
│  │  [HARD] CHECK_LIMITE_POSTEGGI   → concessions               │   │
│  │  [SOFT] CHECK_ALIMENTARE_SUB    → qualificazioni (se alim.) │   │
│  │  [SOFT] CHECK_HACCP_SUB         → qualificazioni (se alim.) │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 CONTROLLI CEDENTE                            │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  [HARD] CHECK_DURC_CED          → qualificazioni            │   │
│  │  [HARD] CHECK_ONORABILITA_CED   → qualificazioni            │   │
│  │  [HARD] CHECK_ANTIMAFIA_CED     → qualificazioni            │   │
│  │  [HARD] CHECK_IMPRESA_ATTIVA_CED → imprese                  │   │
│  │  [HARD] CHECK_CANONE_UNICO      → wallets (posteggio)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 CONTROLLI PRATICA                            │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │  [HARD] CHECK_DATI_COMPLETI     → pratica SCIA              │   │
│  │  [SOFT] CHECK_ATTO_NOTARILE     → pratica SCIA              │   │
│  │  [SOFT] CHECK_PEC               → pratica SCIA              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Dettaglio Controlli HARD (Bloccanti)

| Codice | Descrizione | Query | Condizione PASS |
|--------|-------------|-------|-----------------|
| `CHECK_DURC_SUB` | DURC Subentrante regolare | `SELECT * FROM qualificazioni WHERE impresa_id = {sub_id} AND tipo_qualifica = 'DURC' AND stato = 'Attiva' AND data_scadenza > NOW()` | Record trovato |
| `CHECK_DURC_CED` | DURC Cedente regolare | Come sopra con `ced_id` | Record trovato |
| `CHECK_ONORABILITA_SUB` | Onorabilità Subentrante | `SELECT * FROM qualificazioni WHERE impresa_id = {sub_id} AND tipo_qualifica = 'ONORABILITA' AND stato = 'Attiva'` | Record trovato |
| `CHECK_ONORABILITA_CED` | Onorabilità Cedente | Come sopra con `ced_id` | Record trovato |
| `CHECK_ANTIMAFIA_SUB` | Antimafia Subentrante | `SELECT * FROM qualificazioni WHERE impresa_id = {sub_id} AND tipo_qualifica = 'ANTIMAFIA' AND stato = 'Attiva'` | Record trovato |
| `CHECK_ANTIMAFIA_CED` | Antimafia Cedente | Come sopra con `ced_id` | Record trovato |
| `CHECK_IMPRESA_ATTIVA_SUB` | Impresa Subentrante attiva | `SELECT * FROM imprese WHERE id = {sub_id} AND stato = 'Attiva'` | Record trovato |
| `CHECK_IMPRESA_ATTIVA_CED` | Impresa Cedente attiva | Come sopra con `ced_id` | Record trovato |
| `CHECK_CANONE_UNICO` | Canone non in mora | `SELECT balance FROM wallets WHERE concession_id = {posteggio_id}` | balance >= 0 |
| `CHECK_LIMITE_POSTEGGI` | Limite posteggi rispettato | Vedi logica sotto | count < limite |

### Logica CHECK_LIMITE_POSTEGGI

```javascript
// 1. Conta posteggi attuali del subentrante
const countResult = await db.query(`
  SELECT COUNT(*) as count 
  FROM concessions c
  JOIN vendors v ON c.vendor_id = v.id
  WHERE v.impresa_id = $1 
  AND (c.valid_to IS NULL OR c.valid_to > NOW())
`, [subentranteImpresaId]);

// 2. Conta posti totali del mercato
const marketResult = await db.query(`
  SELECT COUNT(*) as total_stalls 
  FROM stalls 
  WHERE market_id = $1
`, [mercatoId]);

// 3. Determina limite
const limite = marketResult.rows[0].total_stalls > 100 ? 3 : 2;

// 4. Verifica (il nuovo posteggio non deve superare il limite)
const esito = countResult.rows[0].count < limite;
```

### Dettaglio Controlli SOFT (Warning)

| Codice | Descrizione | Query | Condizione PASS |
|--------|-------------|-------|-----------------|
| `CHECK_ALIMENTARE_SUB` | Abilitazione alimentare | `SELECT * FROM qualificazioni WHERE impresa_id = {sub_id} AND tipo_qualifica IN ('SAB', 'REC', 'CORSO_ALIMENTARE') AND stato = 'Attiva'` | Record trovato (se settore alimentare) |
| `CHECK_HACCP_SUB` | Certificazione HACCP | `SELECT * FROM qualificazioni WHERE impresa_id = {sub_id} AND tipo_qualifica = 'HACCP' AND stato = 'Attiva' AND data_scadenza > NOW()` | Record trovato (se settore alimentare) |
| `CHECK_ATTO_NOTARILE` | Estremi atto completi | Verifica campi pratica | notaio E repertorio presenti |
| `CHECK_PEC` | PEC valida | Verifica formato | Contiene @ e dominio valido |

---

## 🗄️ MODIFICHE AL DATABASE

### Nuovi Tipi Qualificazione

Aggiungere alla tabella `qualificazioni` i seguenti tipi:

```sql
-- Tipi qualificazione esistenti: DURC, ISO 14001, ISO 22000, HACCP
-- Nuovi tipi da aggiungere:

INSERT INTO qualificazioni (impresa_id, tipo_qualifica, ente_rilascio, data_rilascio, stato, note)
VALUES 
  -- Per ogni impresa che presenta SCIA
  ('{impresa_id}', 'ONORABILITA', 'Autocertificazione', NOW(), 'Attiva', 'Dichiarazione art. 71 D.Lgs. 59/2010'),
  ('{impresa_id}', 'ANTIMAFIA', 'Autocertificazione', NOW(), 'Attiva', 'Dichiarazione art. 67 D.Lgs. 159/2011');
```

### Schema Tabella Qualificazioni Aggiornato

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | SERIAL | Primary key |
| impresa_id | INTEGER | FK a imprese |
| tipo_qualifica | VARCHAR | DURC, ONORABILITA, ANTIMAFIA, HACCP, SAB, REC, CORSO_ALIMENTARE, ISO_14001, ISO_22000 |
| ente_rilascio | VARCHAR | Ente che ha rilasciato |
| numero_attestato | VARCHAR | Numero documento |
| data_rilascio | DATE | Data rilascio |
| data_scadenza | DATE | Data scadenza (NULL se non scade) |
| stato | VARCHAR | Attiva, Scaduta, Revocata |
| note | TEXT | Note aggiuntive |

---

## 📊 FLUSSO DI VERIFICA

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FLUSSO VERIFICA SCIA                             │
└──────────────────────────────────────────────────────────────────────────┘

     ┌─────────────┐
     │ PRATICA     │
     │ RICEVUTA    │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐
     │ IDENTIFICA  │
     │ IMPRESE     │
     └──────┬──────┘
            │
            ├──────────────────────────────────────┐
            │                                      │
            ▼                                      ▼
     ┌─────────────┐                        ┌─────────────┐
     │ SUBENTRANTE │                        │  CEDENTE    │
     │ (CF/PIVA)   │                        │  (CF/PIVA)  │
     └──────┬──────┘                        └──────┬──────┘
            │                                      │
            ▼                                      ▼
     ┌─────────────┐                        ┌─────────────┐
     │ CERCA IN    │                        │ CERCA IN    │
     │ imprese     │                        │ imprese     │
     └──────┬──────┘                        └──────┬──────┘
            │                                      │
            ▼                                      ▼
     ┌─────────────┐                        ┌─────────────┐
     │ VERIFICA    │                        │ VERIFICA    │
     │ QUALIFICHE  │                        │ QUALIFICHE  │
     │ - DURC      │                        │ - DURC      │
     │ - ONORAB.   │                        │ - ONORAB.   │
     │ - ANTIMAFIA │                        │ - ANTIMAFIA │
     │ - HACCP     │                        │             │
     └──────┬──────┘                        └──────┬──────┘
            │                                      │
            ▼                                      ▼
     ┌─────────────┐                        ┌─────────────┐
     │ VERIFICA    │                        │ VERIFICA    │
     │ LIMITE      │                        │ WALLET      │
     │ POSTEGGI    │                        │ POSTEGGIO   │
     └──────┬──────┘                        └──────┬──────┘
            │                                      │
            └──────────────┬───────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ CALCOLA     │
                    │ SCORE       │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │ HARD FAIL   │ │ SCORE < 70  │ │ SCORE >= 70 │
     │ → REVIEW    │ │ → REVIEW    │ │ → AUTO_OK   │
     └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🛠️ IMPLEMENTAZIONE

### Step 1: Aggiungere Tipi Qualificazione

**File:** `/mihub-backend-rest/scripts/add_qualifica_types.sql`

```sql
-- Aggiungi nuovi tipi qualificazione se non esistono
DO $$
BEGIN
  -- Verifica e aggiungi tipo ONORABILITA
  IF NOT EXISTS (
    SELECT 1 FROM qualificazioni WHERE tipo_qualifica = 'ONORABILITA' LIMIT 1
  ) THEN
    RAISE NOTICE 'Tipo ONORABILITA disponibile per inserimento';
  END IF;
  
  -- Verifica e aggiungi tipo ANTIMAFIA
  IF NOT EXISTS (
    SELECT 1 FROM qualificazioni WHERE tipo_qualifica = 'ANTIMAFIA' LIMIT 1
  ) THEN
    RAISE NOTICE 'Tipo ANTIMAFIA disponibile per inserimento';
  END IF;
END $$;
```

### Step 2: Modificare runEvaluation()

**File:** `/mihub-backend-rest/src/modules/suap/service.js`

```javascript
async runEvaluation(praticaId, operatore = 'SYSTEM') {
    const praticaResult = await this.db.query('SELECT * FROM suap_pratiche WHERE id = $1', [praticaId]);
    const pratica = praticaResult.rows[0];
    if (!pratica) throw new Error('Pratica non trovata');
    
    // 1. Identifica imprese da CF/PIVA
    const subentranteImpresa = await this.findImpresaByCF(pratica.richiedente_cf);
    const cedenteImpresa = await this.findImpresaByCF(pratica.ced_cf);
    
    // 2. Definisci controlli
    const checksToRun = [
        // Controlli Subentrante
        { check_code: 'CHECK_DURC_SUB', tipo: 'HARD', peso: 15, descrizione: 'DURC Subentrante regolare' },
        { check_code: 'CHECK_ONORABILITA_SUB', tipo: 'HARD', peso: 15, descrizione: 'Requisiti onorabilità Subentrante' },
        { check_code: 'CHECK_ANTIMAFIA_SUB', tipo: 'HARD', peso: 15, descrizione: 'Dichiarazione antimafia Subentrante' },
        { check_code: 'CHECK_IMPRESA_ATTIVA_SUB', tipo: 'HARD', peso: 10, descrizione: 'Impresa Subentrante attiva' },
        { check_code: 'CHECK_LIMITE_POSTEGGI', tipo: 'HARD', peso: 10, descrizione: 'Limite posteggi rispettato' },
        
        // Controlli Cedente
        { check_code: 'CHECK_DURC_CED', tipo: 'HARD', peso: 10, descrizione: 'DURC Cedente regolare' },
        { check_code: 'CHECK_ONORABILITA_CED', tipo: 'HARD', peso: 10, descrizione: 'Requisiti onorabilità Cedente' },
        { check_code: 'CHECK_ANTIMAFIA_CED', tipo: 'HARD', peso: 10, descrizione: 'Dichiarazione antimafia Cedente' },
        { check_code: 'CHECK_CANONE_UNICO', tipo: 'HARD', peso: 10, descrizione: 'Canone unico non in mora' },
        
        // Controlli Soft
        { check_code: 'CHECK_ALIMENTARE_SUB', tipo: 'SOFT', peso: 5, descrizione: 'Abilitazione alimentare' },
        { check_code: 'CHECK_HACCP_SUB', tipo: 'SOFT', peso: 5, descrizione: 'Certificazione HACCP' },
        { check_code: 'CHECK_ATTO_NOTARILE', tipo: 'SOFT', peso: 5, descrizione: 'Estremi atto notarile' },
        { check_code: 'CHECK_PEC', tipo: 'SOFT', peso: 5, descrizione: 'PEC valida' }
    ];
    
    // 3. Esegui controlli
    // ... (vedi implementazione completa nel codice)
}
```

### Step 3: Implementare Helper Functions

```javascript
// Trova impresa da CF o PIVA
async findImpresaByCF(cf) {
    if (!cf) return null;
    const result = await this.db.query(`
        SELECT * FROM imprese 
        WHERE codice_fiscale = $1 OR partita_iva = $1
    `, [cf.toUpperCase()]);
    return result.rows[0] || null;
}

// Verifica qualificazione
async checkQualificazione(impresaId, tipoQualifica) {
    if (!impresaId) return { esito: false, motivo: 'Impresa non trovata nel sistema' };
    
    const result = await this.db.query(`
        SELECT * FROM qualificazioni 
        WHERE impresa_id = $1 
        AND tipo_qualifica = $2 
        AND stato = 'Attiva'
        AND (data_scadenza IS NULL OR data_scadenza > NOW())
    `, [impresaId, tipoQualifica]);
    
    if (result.rows.length > 0) {
        return { 
            esito: true, 
            motivo: `${tipoQualifica} valido fino al ${result.rows[0].data_scadenza || 'N/A'}`,
            data: result.rows[0]
        };
    }
    return { 
        esito: false, 
        motivo: `${tipoQualifica} non trovato o scaduto` 
    };
}

// Verifica wallet posteggio
async checkWalletPosteggio(posteggioId) {
    if (!posteggioId) return { esito: false, motivo: 'Posteggio non specificato' };
    
    // Trova concessione attiva per il posteggio
    const concessionResult = await this.db.query(`
        SELECT c.id, w.balance 
        FROM concessions c
        LEFT JOIN wallets w ON w.concession_id = c.id
        WHERE c.stall_id = $1 
        AND (c.valid_to IS NULL OR c.valid_to > NOW())
    `, [posteggioId]);
    
    if (concessionResult.rows.length === 0) {
        return { esito: false, motivo: 'Nessuna concessione attiva per questo posteggio' };
    }
    
    const balance = Number(concessionResult.rows[0].balance) || 0;
    if (balance >= 0) {
        return { esito: true, motivo: `Saldo wallet: €${balance.toFixed(2)}` };
    }
    return { 
        esito: false, 
        motivo: `Wallet in rosso: €${balance.toFixed(2)} - Canone non pagato` 
    };
}

// Verifica limite posteggi
async checkLimitePosteggi(impresaId, mercatoId) {
    if (!impresaId) return { esito: false, motivo: 'Impresa non trovata' };
    
    // Conta posteggi attuali
    const countResult = await this.db.query(`
        SELECT COUNT(*) as count 
        FROM concessions c
        JOIN vendors v ON c.vendor_id = v.id
        WHERE v.impresa_id = $1 
        AND (c.valid_to IS NULL OR c.valid_to > NOW())
    `, [impresaId]);
    
    // Conta posti totali mercato
    const marketResult = await this.db.query(`
        SELECT COUNT(*) as total_stalls 
        FROM stalls 
        WHERE market_id = $1
    `, [mercatoId]);
    
    const currentCount = Number(countResult.rows[0].count);
    const totalStalls = Number(marketResult.rows[0].total_stalls);
    const limite = totalStalls > 100 ? 3 : 2;
    
    if (currentCount < limite) {
        return { 
            esito: true, 
            motivo: `Posteggi attuali: ${currentCount}/${limite} (mercato ${totalStalls} posti)` 
        };
    }
    return { 
        esito: false, 
        motivo: `Limite superato: ${currentCount}/${limite} posteggi (mercato ${totalStalls} posti)` 
    };
}
```

### Step 4: Aggiornare Frontend per Mostrare Nuovi Check

**File:** `/dms-hub-app-new/client/src/components/suap/SuapPraticaDetail.tsx`

Aggiungere visualizzazione dettagliata dei nuovi controlli con:
- Icone colorate per PASS/FAIL
- Dettagli espandibili per ogni controllo
- Separazione visiva tra controlli Subentrante e Cedente

---

## 📅 PIANO DI IMPLEMENTAZIONE

| Fase | Attività | Durata | Dipendenze |
|------|----------|--------|------------|
| 1 | Aggiungere tipi qualificazione al DB | 1h | - |
| 2 | Implementare helper functions nel service | 2h | Fase 1 |
| 3 | Modificare runEvaluation() | 3h | Fase 2 |
| 4 | Aggiornare frontend per nuovi check | 2h | Fase 3 |
| 5 | Testing e debug | 2h | Fase 4 |
| 6 | Documentazione e deploy | 1h | Fase 5 |

**Tempo totale stimato:** 11 ore

---

## ✅ CHECKLIST PRE-IMPLEMENTAZIONE

- [ ] Verificare struttura tabella `qualificazioni` esistente
- [ ] Verificare struttura tabella `wallets` esistente
- [ ] Verificare struttura tabella `concessions` esistente
- [ ] Creare backup del service.js attuale
- [ ] Preparare dati di test per ogni tipo di controllo
- [ ] Definire casi di test per ogni scenario (PASS/FAIL)

---

## 📚 RIFERIMENTI NORMATIVI

1. **D.Lgs. 114/98** - Riforma del commercio (art. 27 ss. per commercio ambulante)
2. **D.Lgs. 59/2010** - Art. 71 (requisiti morali)
3. **D.Lgs. 159/2011** - Art. 67 (effetti misure prevenzione antimafia)
4. **L.R. Emilia-Romagna 62/2018** - Art. 12 (requisiti professionali)
5. **Regolamento Comune di Formigine** - Requisiti morali e professionali

---

## 🔗 DOCUMENTI CORRELATI

- `MASTER_BLUEPRINT_MIOHUB.md` - Blueprint principale del sistema
- `REQUISITI_SUBINGRESSO_RICERCA.md` - Ricerca normativa completa
- `/mihub-backend-rest/src/modules/suap/service.js` - Codice attuale

---

*Documento generato da Manus AI - 2 Gennaio 2026*
