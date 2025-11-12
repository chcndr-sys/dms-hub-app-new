# Script Import GTFS Universale

Script Node.js per importare dati GTFS (Google Transit Feed Specification) da qualsiasi città italiana nel database `mobility_data`.

## 🌍 Standard GTFS

**GTFS** è lo standard internazionale per dati trasporto pubblico, usato da Google Maps, Apple Maps e tutte le app di mobilità.

### Formato File GTFS

Un archivio GTFS è un file ZIP contenente file CSV:

- **stops.txt** - Fermate (stop_id, stop_name, stop_lat, stop_lon)
- **routes.txt** - Linee (route_id, route_short_name, route_type)
- **trips.txt** - Corse (trip_id, route_id, service_id)
- **stop_times.txt** - Orari (trip_id, stop_id, arrival_time)
- **calendar.txt** - Calendario servizio

## 📥 Dataset GTFS Italia Disponibili

### Regione Toscana (Autolinee Toscane)
- **Grosseto Urbano**: https://dati.toscana.it/.../51-urbanogrosseto.gtfs
- **Grosseto Extraurbano**: https://dati.toscana.it/.../30-extraurbanogrosseto.gtfs
- **Firenze**: https://dati.toscana.it/.../26-extraurbanofirenze.gtfs
- **Siena**: https://dati.toscana.it/.../29-extraurbanosiena.gtfs
- **Pisa**: https://dati.toscana.it/.../22-extraurbanopisa.gtfs

### Altre Regioni
- **Milano AMAT**: https://dati.comune.milano.it/dataset/ds634_tpl_gtfs
- **Genova AMT**: https://opendata.regione.liguria.it/dataset/amt-genova-gtfs
- **Roma ATAC**: https://romamobilita.it/it/azienda/open-data/gtfs
- **Torino GTT**: https://opendata.5t.torino.it/gtfs
- **Bologna TPER**: https://solweb.tper.it/web/tools/open-data/

## 🚀 Uso Script

### Prerequisiti

```bash
# Installare dipendenze
pnpm add adm-zip csv-parse pg
```

### Configurazione Database

Lo script legge le credenziali dalle variabili ambiente:

```bash
export DB_HOST=your_host
export DB_PORT=5432
export DB_NAME=dms_app
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_SSL=true  # Per connessioni remote
```

### Esecuzione

```bash
node scripts/import-gtfs.mjs <city_name> <gtfs_zip_url>
```

### Esempi

```bash
# Importare Grosseto
node scripts/import-gtfs.mjs Grosseto \
  "https://dati.toscana.it/dataset/.../51-urbanogrosseto.gtfs"

# Importare Milano
node scripts/import-gtfs.mjs Milano \
  "https://dati.comune.milano.it/dataset/ds634_tpl_gtfs/gtfs.zip"

# Importare Genova
node scripts/import-gtfs.mjs Genova \
  "https://opendata.regione.liguria.it/dataset/amt-genova-gtfs/gtfs_amt.zip"
```

## 📊 Cosa Fa lo Script

1. **Download** - Scarica il file GTFS ZIP dall'URL
2. **Estrazione** - Estrae stops.txt e routes.txt
3. **Parsing** - Legge i file CSV
4. **Mapping** - Converte route_type GTFS → nostro type
5. **Insert** - Inserisce nel database con `ON CONFLICT DO NOTHING`
6. **Cleanup** - Rimuove file temporanei

## 🗺️ Mapping Tipi Trasporto

| GTFS route_type | Nostro type |
|-----------------|-------------|
| 0 | tram |
| 1 | metro |
| 2 | train |
| 3 | bus |
| 4 | ferry |
| 7 | funicular |
| 11 | trolleybus |
| 12 | monorail |

## ⚠️ Limitazioni

### Real-time NON Disponibile

I file GTFS contengono solo **orari programmati statici**. Per dati real-time (ritardi, posizione mezzi) servono API proprietarie:

- **TPER Bologna**: HelloBus API (richiede auth)
- **ATAC Roma**: API real-time (richiede auth)
- **ATM Milano**: API real-time (richiede auth)

### Città Senza GTFS

Alcune città non pubblicano GTFS:
- ❌ **Modena** (SETA)
- ❌ **Reggio Emilia** (SETA)
- ❌ **Parma** (TEP)

Per queste città serve:
1. **Google Maps Transit API** (Google ha i dati)
2. **Web scraping** (ultima risorsa)
3. **Contattare azienda** trasporti

## 🔄 Gestione Duplicati

Lo script usa `ON CONFLICT DO NOTHING` per evitare duplicati. Puoi eseguirlo più volte senza problemi.

## 🎯 Integrazione con l'App

Dopo l'import, i dati sono subito disponibili:

- **Centro Mobilità Dashboard PA** - Visualizza fermate su mappa
- **Route Etico** - Calcola percorsi sostenibili
- **Endpoint API** - `mobility.list` restituisce tutte le fermate

## 📝 Note

- **Performance**: L'import di 1000+ fermate richiede ~2-3 minuti
- **Storage**: Ogni città occupa ~500KB-2MB nel database
- **Aggiornamenti**: GTFS viene aggiornato mensilmente dalle aziende

## 🆘 Troubleshooting

### Errore "relation mobility_data does not exist"

```bash
# Eseguire migrazione database
pnpm db:push
```

### Errore "Failed to download"

Verificare che l'URL GTFS sia corretto e accessibile.

### Errore "stops.txt not found"

Il file ZIP non contiene un GTFS valido.

## 📚 Risorse

- **GTFS Spec**: https://gtfs.org/
- **GTFS Italia**: https://www.dati.gov.it/node/192?tags=gtfs
- **Transit.land**: https://www.transit.land/ (catalogo mondiale GTFS)
- **BusMaps**: https://busmaps.com/en/italy/feedlist (lista GTFS Italia)

---

**Autore**: DMS Hub Team  
**Data**: 7 Novembre 2025  
**Versione**: 1.0.0
