# Ricerca API TPER Bologna

## 📋 RIEPILOGO

**TPER (Trasporto Passeggeri Emilia-Romagna)** fornisce Open Data per i trasporti pubblici di Bologna e Ferrara.

---

## 🔗 API DISPONIBILI

### 1️⃣ **Open Data Comune di Bologna**

**Base URL:**
```
https://opendata.comune.bologna.it/api/explore/v2.1/catalog/datasets/
```

**Dataset:**
- `tper-fermate-autobus` - Fermate autobus (21.175 records)

**Endpoint Esempio:**
```
https://opendata.comune.bologna.it/api/explore/v2.1/catalog/datasets/tper-fermate-autobus/records
```

**Dati disponibili:**
- `codice`: ID fermata
- `codice_linea`: Numero linea (es. "61", "T2", "36")
- `denominazione`: Nome fermata
- `ubicazione`: Indirizzo
- `comune`: Città
- `geopoint`: `{ lat, lon }`
- `quartiere`: Zona

---

### 2️⃣ **GTFS Statico (TPER)**

**URL Download:**
```
https://solweb.tper.it/web/tools/open-data/open-data-download.aspx?source=solweb.tper.it&filename=gommagtfsbo&version=20251103&format=zip
```

**Formato:** GTFS (ZIP)  
**Versione:** 20251103  
**Licenza:** Creative Commons Attribuzione 3.0 Italia

**Contenuto:**
- Orari bus
- Percorsi
- Fermate
- Linee

---

### 3️⃣ **Hello Bus (Real-Time)**

**Servizio:** Web services real-time  
**Documentazione:** https://www.tper.it/hello-bus

**Funzionalità:**
- Orari arrivo bus in tempo reale
- Localizzazione satellitare mezzi
- Disponibile via SMS e web services

**WSDL:** https://solweb.tper.it/web/tools/open-data/open-data.aspx (link "definizione del servizio Hello Bus")

---

## 📊 DATI NECESSARI PER IL CENTRO MOBILITÀ

Per popolare la tabella `mobility_data` servono:

1. **Fermate** (da Open Data Comune Bologna)
   - lat, lng
   - stopName
   - lineNumber

2. **Orari real-time** (da Hello Bus)
   - nextArrival (minuti)
   - status (active, delayed, suspended)

3. **Occupazione** (se disponibile)
   - occupancy (0-100%)

---

## 🚀 PROSSIMI PASSI

1. ✅ Implementare endpoint backend per chiamare API TPER
2. ✅ Popolare tabella `mobility_data`
3. ✅ Mostrare nella sezione "Integrazioni" della Dashboard PA
4. ✅ Collegare al Centro Mobilità Nazionale (se esiste)

---

## 📝 NOTE

- **Nessuna API key richiesta** per Open Data Comune Bologna (limite 5000 richieste/giorno)
- **Licenza:** Creative Commons Attribuzione 3.0 Italia
- **Aggiornamento:** Dati aggiornati mensilmente (GTFS) e in tempo reale (Hello Bus)
