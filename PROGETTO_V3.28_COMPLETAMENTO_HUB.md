# PROGETTO v3.28.0 - Completamento Sistema HUB Italia

## Obiettivo
Completare il sistema HUB con:
1. Indicatore mq Area HUB per i comuni
2. Rimozione pulsante freccia curve (reflex)
3. Aggiunta capoluoghi regionali mancanti

---

## 1. INDICATORE MQ AREA HUB

### Descrizione
Aggiungere un indicatore che mostra i metri quadrati dell'area HUB, visibile solo in **Vista Provincia** (quando si vedono i comuni).

### Posizione UI
- Dopo il dropdown "Provincia" nella barra di navigazione
- Stesso stile dei tab esistenti (bordo, sfondo scuro)
- Formato: `📐 1.250 mq` o `Area: 1.250 mq`

### Database
- **Colonna esistente:** `area_sqm` (già presente in `hub_locations`)
- **Valore:** Calcolato automaticamente dall'Editor V3 quando si disegna l'area GeoJSON
- **Attualmente:** Tutti NULL (nessuna area disegnata ancora)

### Logica Visualizzazione
```
=== MODALITÀ HUB ===
Vista Italia    → Somma area_sqm di TUTTI gli HUB nazionali
Vista Regione   → Somma area_sqm di tutti gli HUB della REGIONE
Vista Provincia → Somma area_sqm di tutti gli HUB della PROVINCIA
Vista HUB       → area_sqm dell'HUB selezionato

=== MODALITÀ MERCATO ===
Vista Italia    → Somma mq posteggi di TUTTI i mercati nazionali
Vista Regione   → Somma mq posteggi di tutti i mercati della REGIONE
Vista Provincia → Somma mq posteggi di tutti i mercati della PROVINCIA
Vista Mercato   → Somma mq posteggi del MERCATO selezionato
```

### Calcolo mq
**HUB:**
- Formula: `totalAreaSqm = Σ (hub.area_sqm)` per gli HUB filtrati
- Se nessun HUB ha area_sqm, mostrare '—'

**Mercato:**
- Ogni posteggio ha dimensioni (larghezza x profondità)
- Formula: `totalMqPosteggi = Σ (stall.width * stall.depth)` per tutti i posteggi attivi
- Se non ci sono dimensioni, mostrare '—'

### File da Modificare
- `client/src/components/GestioneHubMapWrapper.tsx`
  - Aggiungere calcolo `totalAreaSqm` basato su:
    - **Modalità HUB:** `selectedProvincia` o `selectedHub` → somma `area_sqm`
    - **Modalità Mercato:** `selectedMarket` + `stallsData` → somma `width * depth`
  - Aggiungere componente indicatore dopo dropdown Provincia

### Codice Indicatore (esempio)
```tsx
{/* Indicatore Area mq - visibile solo in Vista Provincia/HUB */}
{(selectedProvincia || selectedHub) && (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm">
    <span className="text-gray-400">Area:</span>
    <span className="text-cyan-400 font-medium">
      {totalAreaSqm ? `${totalAreaSqm.toLocaleString()} mq` : '—'}
    </span>
  </div>
)}
```

---

## 2. RIMOZIONE PULSANTE FRECCIA CURVE (REFLEX)

### Descrizione
Rimuovere il pulsante con icona freccia curve che non ha funzionalità utile.

### Identificazione
- Cercare nel codice: icona freccia/curve/reflex
- Probabilmente un pulsante di refresh o navigazione non utilizzato

### File da Modificare
- `client/src/components/GestioneHubMapWrapper.tsx`
  - Rimuovere il pulsante dalla barra di navigazione

---

## 3. AGGIUNTA CAPOLUOGHI REGIONALI MANCANTI

### Capoluoghi Esistenti (11)
| Città | Regione | Status |
|-------|---------|--------|
| Roma | Lazio | ✅ |
| Milano | Lombardia | ✅ |
| Napoli | Campania | ✅ |
| Torino | Piemonte | ✅ |
| Palermo | Sicilia | ✅ |
| Genova | Liguria | ✅ |
| Bologna | Emilia-Romagna | ✅ |
| Firenze | Toscana | ✅ |
| Bari | Puglia | ✅ |
| Venezia | Veneto | ✅ |
| Grosseto | Toscana | ✅ (da correggere: non è capoluogo regionale) |

### Capoluoghi Mancanti (10)
| Città | Regione | Lat | Lng | regione_id |
|-------|---------|-----|-----|------------|
| Aosta | Valle d'Aosta | 45.7375 | 7.3154 | 2 |
| Trento | Trentino-Alto Adige | 46.0679 | 11.1211 | 4 |
| Trieste | Friuli Venezia Giulia | 45.6495 | 13.7768 | 6 |
| Perugia | Umbria | 43.1107 | 12.3908 | 10 |
| Ancona | Marche | 43.6158 | 13.5189 | 11 |
| L'Aquila | Abruzzo | 42.3498 | 13.3995 | 13 |
| Campobasso | Molise | 41.5603 | 14.6626 | 14 |
| Potenza | Basilicata | 40.6404 | 15.8056 | 17 |
| Catanzaro | Calabria | 38.9098 | 16.5877 | 18 |
| Cagliari | Sardegna | 39.2238 | 9.1217 | 20 |

### Grosseto (Comune Pilota)
- Grosseto resta come 'capoluogo' perché è il **comune pilota** del progetto
- Deve essere visibile in Vista Italia insieme agli altri capoluoghi regionali
- **area_geojson**: GIÀ PRESENTE ✅
- **area_sqm**: DA CALCOLARE (attualmente NULL)

### Script SQL
```sql
-- Inserimento nuovi capoluoghi regionali
INSERT INTO hub_locations (name, address, city, lat, lng, center_lat, center_lng, active, is_independent, livello, tipo, regione_id)
VALUES 
  ('HUB Market Aosta', 'Centro Città', 'Aosta', '45.7375', '7.3154', '45.7375', '7.3154', 1, 1, 'capoluogo', 'urbano', 2),
  ('HUB Market Trento', 'Centro Città', 'Trento', '46.0679', '11.1211', '46.0679', '11.1211', 1, 1, 'capoluogo', 'urbano', 4),
  ('HUB Market Trieste', 'Centro Città', 'Trieste', '45.6495', '13.7768', '45.6495', '13.7768', 1, 1, 'capoluogo', 'urbano', 6),
  ('HUB Market Perugia', 'Centro Città', 'Perugia', '43.1107', '12.3908', '43.1107', '12.3908', 1, 1, 'capoluogo', 'urbano', 10),
  ('HUB Market Ancona', 'Centro Città', 'Ancona', '43.6158', '13.5189', '43.6158', '13.5189', 1, 1, 'capoluogo', 'urbano', 11),
  ('HUB Market L''Aquila', 'Centro Città', 'L''Aquila', '42.3498', '13.3995', '42.3498', '13.3995', 1, 1, 'capoluogo', 'urbano', 13),
  ('HUB Market Campobasso', 'Centro Città', 'Campobasso', '41.5603', '14.6626', '41.5603', '14.6626', 1, 1, 'capoluogo', 'urbano', 14),
  ('HUB Market Potenza', 'Centro Città', 'Potenza', '40.6404', '15.8056', '40.6404', '15.8056', 1, 1, 'capoluogo', 'urbano', 17),
  ('HUB Market Catanzaro', 'Centro Città', 'Catanzaro', '38.9098', '16.5877', '38.9098', '16.5877', 1, 1, 'capoluogo', 'urbano', 18),
  ('HUB Market Cagliari', 'Centro Città', 'Cagliari', '39.2238', '9.1217', '39.2238', '9.1217', 1, 1, 'capoluogo', 'urbano', 20);
```

---

## 4. DATI VERIFICATI

### Mercati con mq Posteggi
| Mercato | ID | Posteggi | Totale mq |
|---------|----|---------|-----------|
| Mercato Grosseto | 1 | 160 | 4.864 mq |
| Mercato Novi Sad Modena | 5 | 382 | 14.102 mq |
| **TOTALE NAZIONALE** | - | 542 | **18.966 mq** |

### Campo mq Posteggi
- Colonna: `area_mq` (già esistente e popolata)
- Alternativa: `width * depth` se `area_mq` è NULL

### HUB con area_sqm
- Grosseto: `area_geojson` presente, `area_sqm` da calcolare
- Altri HUB: `area_sqm` tutti NULL (aree non ancora disegnate)

---

## 5. CHECKLIST IMPLEMENTAZIONE

### Frontend
- [ ] Aggiungere indicatore mq Area dopo dropdown Provincia
- [ ] Calcolare `totalAreaSqm` in base a vista corrente
- [ ] Rimuovere pulsante freccia curve (reflex)
- [ ] Aggiungere `area_sqm` all'interfaccia TypeScript `HubLocation`

### Database
- [ ] Correggere Grosseto: livello da 'capoluogo' a 'provincia'
- [ ] Inserire 10 nuovi capoluoghi regionali mancanti
- [ ] Verificare che tutti abbiano `center_lat` e `center_lng`

### Test
- [ ] Verificare Vista Italia mostra 20 capoluoghi
- [ ] Verificare indicatore mq nascosto in Vista Italia/Regione
- [ ] Verificare indicatore mq visibile in Vista Provincia
- [ ] Verificare pulsante reflex rimosso

### Deploy
- [ ] Commit frontend
- [ ] Eseguire script SQL su database
- [ ] Push su GitHub
- [ ] Verificare deploy Vercel

---

## 5. RISULTATO ATTESO

### Vista Italia
- 20 marker capoluoghi regionali (tutti con colore viola pieno)
- Indicatore HUB: 69 → 79 (dopo aggiunta 10 nuovi)
- Indicatore Area: Nascosto

### Vista Regione
- Capoluogo + Province della regione
- Indicatore Area: Nascosto

### Vista Provincia
- Tutti gli HUB della provincia (urbani + prossimità)
- Indicatore Area: Visibile (somma mq della provincia)
- Contorno viola scuro per HUB prossimità

### Barra Navigazione (dopo modifiche)
```
[Vista Italia] [Regione ▼] [Prov. ▼] [Area: X mq] [< Indietro] [🔄]
```
(Rimosso pulsante freccia curve)

---

## File Allegato
Questo documento è salvato in: `/home/ubuntu/dms-hub-app-new/PROGETTO_V3.28_COMPLETAMENTO_HUB.md`
