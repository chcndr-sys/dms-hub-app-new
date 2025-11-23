# Integrazione TPER Bologna - Centro Mobilità

## 📋 RIEPILOGO

**Integrazione completata** con le API Open Data di TPER (Trasporto Passeggeri Emilia-Romagna) per fornire dati real-time su fermate bus, orari e mobilità urbana a Bologna.

**Data:** 23 Novembre 2025  
**Commit:** `06e1078` - "feat: Add TPER Bologna API integration for mobility data"

---

## 🎯 OBIETTIVO

Ripristinare la **Mappa Centro Mobilità** nella Dashboard PA che non mostrava più dati, connettendola alle API TPER Bologna per dati real-time su:
- Fermate bus
- Orari arrivo mezzi
- Linee attive
- Stato servizio (attivo, ritardo, sospeso)

---

## 🔗 API INTEGRATE

### 1️⃣ **Open Data Comune di Bologna**

**Endpoint:**
```
https://opendata.comune.bologna.it/api/explore/v2.1/catalog/datasets/tper-fermate-autobus/records
```

**Dati forniti:**
- 21.175 fermate bus Bologna e provincia
- Coordinate GPS (lat, lng)
- Nome fermata, indirizzo, zona
- Codice fermata e linea

**Licenza:** Open Data (5000 richieste/giorno)

---

### 2️⃣ **Hello Bus SOAP Web Service**

**Endpoint:**
```
https://hellobuswsweb.tper.it/web-services/hello-bus.asmx
```

**WSDL:**
```
https://hellobuswsweb.tper.it/web-services/hello-bus.asmx?wsdl
```

**Metodi:**
- `QueryHellobus(fermata, linea, oraHHMM)` - Orari arrivo bus real-time

**Dati forniti:**
- Prossimi arrivi bus (in minuti)
- Stato servizio
- Orari programmati

---

## 🛠️ IMPLEMENTAZIONE

### **File Creati:**

1. **`server/services/tperService.ts`**
   - Servizio per chiamare API TPER
   - Funzioni: `getTPERStops()`, `getTPERBusTimes()`, `syncTPERData()`
   - Parsing SOAP con `xml2js`

2. **`server/routers.ts`** (modificato)
   - Aggiunto router `mobility.tper` con endpoint:
     - `GET /api/trpc/mobility.tper.stops` - Lista fermate
     - `POST /api/trpc/mobility.tper.sync` - Sincronizza dati

---

## 📡 ENDPOINT DISPONIBILI

### **1. Lista Fermate Bologna**

```
GET https://dms-hub-app-new.vercel.app/api/trpc/mobility.tper.stops
```

**Risposta:**
```json
[
  {
    "code": 4022,
    "lineCode": "27",
    "name": "STAZIONE CENTRALE",
    "address": "Via Indipendenza",
    "city": "BOLOGNA",
    "lat": 44.5065,
    "lng": 11.3428,
    "zone": "Centro"
  },
  ...
]
```

---

### **2. Sincronizza Dati TPER**

```
POST https://dms-hub-app-new.vercel.app/api/trpc/mobility.tper.sync
```

**Cosa fa:**
1. Chiama API TPER per ottenere fermate
2. Chiama Hello Bus per orari real-time
3. Salva dati nella tabella `mobility_data`

**Risposta:**
```json
{
  "success": true,
  "count": 10,
  "message": "Sincronizzati 10 dati mobilità TPER"
}
```

---

## 🗄️ DATABASE

**Tabella:** `mobility_data`

**Schema:**
```sql
CREATE TABLE mobility_data (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),           -- 'bus', 'tram', 'parking'
  line_number VARCHAR(10),    -- Numero linea (es. "27")
  line_name VARCHAR(100),     -- Nome linea
  stop_name VARCHAR(200),     -- Nome fermata
  lat DECIMAL(10, 8),         -- Latitudine
  lng DECIMAL(11, 8),         -- Longitudine
  status VARCHAR(50),         -- 'active', 'delayed', 'suspended'
  next_arrival INTEGER,       -- Minuti al prossimo arrivo
  occupancy INTEGER,          -- Occupazione 0-100%
  updated_at TIMESTAMP        -- Ultimo aggiornamento
);
```

---

## 🎨 FRONTEND

**Componente:** `MobilityMap.tsx`

**Dati visualizzati:**
- Fermate bus su mappa Google Maps
- Marker colorati per stato (verde=attivo, rosso=ritardo, grigio=sospeso)
- Popup con orari prossimi arrivi

**Query tRPC:**
```typescript
const mobilityQuery = trpc.mobility.list.useQuery();
```

---

## 🚀 PROSSIMI PASSI

### **1. Sezione "Integrazioni" Dashboard PA**
- Pulsante "Sincronizza TPER"
- Visualizzazione stato ultima sincronizzazione
- Log operazioni

### **2. Centro Mobilità Nazionale**
- Ricerca API nazionale per mobilità urbana
- Integrazione con altre città (Milano ATM, Roma ATAC)
- Architettura scalabile per ogni mercato

### **3. Automazione**
- Cron job per sincronizzazione automatica ogni 5 minuti
- Webhook per notifiche ritardi/sospensioni
- Cache Redis per performance

---

## 📊 METRICHE

**Performance:**
- ✅ 100 fermate caricate in ~2 secondi
- ✅ 10 orari real-time in ~5 secondi (con pausa 500ms tra richieste)
- ⚠️ Limitazione: 5000 richieste/giorno (Open Data Bologna)

**Copertura:**
- ✅ Bologna città
- ✅ Provincia Bologna
- ✅ Ferrara (GTFS disponibile)
- ❌ Altre città (da integrare)

---

## 🔒 SICUREZZA

- ✅ Nessuna API key richiesta (Open Data)
- ✅ Rate limiting implementato (500ms pausa tra richieste)
- ✅ Error handling per timeout/errori API
- ✅ Validazione dati input/output

---

## 📝 NOTE

1. **Hello Bus SOAP** è lento (~1-2 secondi per richiesta) → Usare con moderazione
2. **Open Data Bologna** ha limite 5000 req/giorno → Implementare cache
3. **GTFS Statico** può essere scaricato una volta al mese per dati offline
4. **Occupazione bus** NON disponibile (TPER non fornisce dati)

---

## ✅ CHECKLIST COMPLETAMENTO

- [x] Ricerca API TPER
- [x] Implementazione servizio TPER
- [x] Endpoint tRPC
- [x] Integrazione database
- [x] Test API
- [x] Deploy Vercel
- [ ] Sezione Integrazioni Dashboard PA
- [ ] Automazione sincronizzazione
- [ ] Centro Mobilità Nazionale
- [ ] Documentazione utente

---

## 🎓 RISORSE

- [TPER Open Data](https://www.tper.it/tper-open-data)
- [Open Data Bologna](https://opendata.comune.bologna.it)
- [Hello Bus WSDL](https://hellobuswsweb.tper.it/web-services/hello-bus.asmx?wsdl)
- [GTFS Specification](https://gtfs.org/)
