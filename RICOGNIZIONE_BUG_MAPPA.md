# Ricognizione Bug Aggiornamento Mappa Posteggi

**Data:** 2025-11-23  
**Problema:** La mappa non si aggiorna quando cambio lo stato del posteggio

---

## ✅ COSA FUNZIONA

### Backend Hetzner
- ✅ `GET https://orchestratore.mio-hub.me/api/markets` → HTTP 200
- ✅ `GET https://orchestratore.mio-hub.me/api/markets/1/stalls` → HTTP 200 (160 posteggi)
- ✅ `PATCH https://orchestratore.mio-hub.me/api/stalls/:id` → HTTP 200 (aggiorna stato)
- ✅ `GET https://orchestratore.mio-hub.me/api/gis/market-map` → HTTP 200 (GeoJSON)

### Frontend
- ✅ `fetch()` diretto funziona (testato in console)
- ✅ La mappa si renderizza correttamente (160 posteggi visibili)
- ✅ I dati vengono caricati correttamente

---

## ❌ COSA NON FUNZIONA

### Problema Principale
- ❌ Quando cambio lo stato del posteggio nella tabella, la mappa NON si aggiorna
- ❌ Il popup mostra ancora lo stato vecchio
- ❌ Il colore del polygon rimane verde (non diventa rosso)

### Problema Secondario
- ⚠️ Il tab "Posteggi" mostra uno spinner infinito (loading)
- ⚠️ La tabella non si carica mai
- ⚠️ Errori tRPC 404 in console (non correlati a GestioneMercati)

---

## 🔍 ANALISI TECNICA

### Architettura
```
Frontend (Vercel)
  ├─ GestioneMercati.tsx
  │   ├─ PosteggiTab (tabella + mappa)
  │   │   ├─ fetch() → Backend Hetzner ✅
  │   │   ├─ MarketMapComponent
  │   │   │   ├─ MapContainer (Leaflet)
  │   │   │   └─ Polygon[] (posteggi)
  │   │   └─ handleSave() → PATCH /api/stalls/:id ✅
  │   └─ mapRefreshKey (incrementato dopo save)
  └─ Backend Hetzner (orchestratore.mio-hub.me)
      ├─ GET /api/markets/:id/stalls
      ├─ PATCH /api/stalls/:id
      └─ GET /api/gis/market-map
```

### Flusso Attuale
1. User clicca "Salva" su posteggio → `handleSave()`
2. `PATCH /api/stalls/:id` → Backend Hetzner ✅
3. `fetchData()` → Ricarica dati ✅
4. `setMapRefreshKey(prev => prev + 1)` → Incrementa key ✅
5. `<MarketMapComponent refreshKey={mapRefreshKey} />` → Passa prop ✅
6. `<MapContainer key={map-${refreshKey}}>` → Dovrebbe ri-montare ❌

### Problema Identificato
**Leaflet NON usa il Virtual DOM di React!**

Anche se cambio la `key` del `<MapContainer>`, Leaflet ha già creato i layer DOM e **non li distrugge** quando cambia la key!

---

## 🛠️ SOLUZIONE IMPLEMENTATA

### Modifica 1: MarketMapComponent.tsx
```typescript
// PRIMA
export function MarketMapComponent({ mapData, stallsData, ... }) {
  return (
    <MapContainer ...>
      {/* Polygon */}
    </MapContainer>
  );
}

// DOPO
export function MarketMapComponent({ mapData, stallsData, refreshKey, ... }) {
  return (
    <MapContainer key={`map-${refreshKey}`} ...>
      {/* Polygon */}
    </MapContainer>
  );
}
```

### Modifica 2: GestioneMercati.tsx
```typescript
// PRIMA
<MarketMapComponent
  key={`map-refresh-${mapRefreshKey}`}
  mapData={mapData}
  ...
/>

// DOPO
<MarketMapComponent
  refreshKey={mapRefreshKey}
  mapData={mapData}
  ...
/>
```

### Commit
```
fd795be - fix: Force MapContainer re-mount on stall status change
```

---

## 🧪 TEST DA ESEGUIRE

1. ✅ Build locale → OK (nessun errore TypeScript)
2. ✅ Push al branch `feature/scalable-mobility-center` → OK
3. ⏳ Deploy Vercel → In corso
4. ⏳ Test funzionale:
   - [ ] Cambiare stato posteggio (libero → occupato)
   - [ ] Verificare tabella aggiornata
   - [ ] Verificare colore mappa cambiato
   - [ ] Verificare popup aggiornato
   - [ ] Verificare mappa Centro Mobilità funzionante
   - [ ] Verificare nessun errore console

---

## ⚠️ PROBLEMI APERTI

### Errori tRPC 404
```
[API Query Error] TRPCClientError: Unable to transform response from server
Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Causa:** Qualche componente nella pagina sta chiamando un endpoint tRPC che non esiste.

**Non bloccante:** Non impedisce il funzionamento di GestioneMercati.

**Da investigare:** Trovare quale componente sta facendo la chiamata tRPC.

### Tab Posteggi - Loading Infinito
**Causa:** Da investigare. Potrebbe essere correlato agli errori tRPC.

**Workaround:** Testare direttamente cambiando stato e verificando la mappa.

---

## 📊 STATO DEPLOY

- **Branch:** `feature/scalable-mobility-center`
- **Commit:** `fd795be`
- **Deploy:** In corso su Vercel
- **URL:** `https://dms-hub-app-new.vercel.app`

---

## 🎯 PROSSIMI PASSI

1. ⏳ Aspettare deploy Vercel
2. ⏳ Testare funzionalità cambio stato
3. ⏳ Verificare aggiornamento mappa
4. ⏳ Investigare errori tRPC 404
5. ⏳ Fixare loading infinito tab Posteggi
6. ⏳ Aggiornare blueprint con soluzione

---

## 📝 NOTE

- Gli errori TypeScript nel backend (`server/dmsHubRouter.ts`, `server/mihubRouter.ts`) **non sono bloccanti** per il deploy
- Vercel deploya comunque anche con warning TypeScript
- Da fixare in un secondo momento
