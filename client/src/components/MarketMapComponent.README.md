# 🗺️ MarketMapComponent - Componente Mappa GIS Certificato

**Versione:** 1.0.0  
**Data Certificazione:** 22 Novembre 2025  
**Stato:** ✅ **CERTIFICATO E TESTATO**

---

## 📋 Descrizione

Componente React riusabile per visualizzare la mappa GIS del mercato con:
- ✅ **Numeri scalabili** con zoom (formula: `8 * 1.5^(zoom - 18)`)
- ✅ **Senza sfondo bianco** (numeri trasparenti)
- ✅ **Colori dinamici** basati su stato database
- ✅ **Popup informativi** con dati dal database
- ✅ **4 layer maps** selezionabili
- ✅ **Collegamento bidirezionale** con tabelle

---

## 🎯 Quando Usare Questo Componente

Usa `MarketMapComponent` quando devi:
1. Visualizzare la mappa GIS in una dashboard
2. Integrare la mappa con tabelle o form
3. Mostrare posteggi con colori dinamici dal database
4. Permettere selezione posteggi con click
5. Centrare la mappa programmaticamente su un posteggio

**NON modificare questo componente!** Se serve una variante, crea un nuovo componente che lo estende.

---

## 📦 Import

```tsx
import { MarketMapComponent } from '@/components/MarketMapComponent';
```

---

## 🔧 Props

| Prop | Tipo | Default | Descrizione |
|------|------|---------|-------------|
| `mapData` | `MapData` | **required** | Dati GeoJSON con geometrie posteggi |
| `center` | `[number, number]` | `mapData.center` | Centro mappa [lat, lng] |
| `zoom` | `number` | `17` | Livello zoom iniziale (17-21) |
| `height` | `string` | `'600px'` | Altezza mappa CSS |
| `onStallClick` | `(number) => void` | `undefined` | Callback click su posteggio |
| `selectedStallNumber` | `number` | `undefined` | Numero posteggio evidenziato |
| `stallsData` | `StallData[]` | `[]` | Dati aggiornati dal database |

### Tipo `MapData`

```typescript
interface MapData {
  center: {
    lat: number;
    lng: number;
  };
  stalls_geojson: {
    type: 'FeatureCollection';
    features: StallFeature[];
  };
}
```

### Tipo `StallData`

```typescript
interface StallData {
  number: number;
  status: 'free' | 'occupied' | 'reserved';
  kind: 'fixed' | 'spot' | 'free';
  vendor_name?: string;
  dimensions?: string;
}
```

---

## 💡 Esempi d'Uso

### Esempio 1: Mappa Base

```tsx
import { MarketMapComponent } from '@/components/MarketMapComponent';

function MyPage() {
  const [mapData, setMapData] = useState(null);

  useEffect(() => {
    fetch('https://orchestratore.mio-hub.me/api/gis/market-map')
      .then(res => res.json())
      .then(data => setMapData(data.data));
  }, []);

  if (!mapData) return <div>Caricamento...</div>;

  return (
    <MarketMapComponent
      mapData={mapData}
      zoom={18}
      height="700px"
    />
  );
}
```

### Esempio 2: Mappa con Selezione Posteggio

```tsx
function MarketDashboard() {
  const [mapData, setMapData] = useState(null);
  const [selectedStall, setSelectedStall] = useState(null);

  return (
    <div>
      <MarketMapComponent
        mapData={mapData}
        selectedStallNumber={selectedStall}
        onStallClick={(stallNumber) => {
          setSelectedStall(stallNumber);
          console.log('Posteggio selezionato:', stallNumber);
        }}
      />
    </div>
  );
}
```

### Esempio 3: Mappa con Dati Database (Gestione Mercati)

```tsx
function GestioneMercati() {
  const [mapData, setMapData] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);

  // Carica dati GIS
  useEffect(() => {
    fetch('https://orchestratore.mio-hub.me/api/gis/market-map')
      .then(res => res.json())
      .then(data => setMapData(data.data));
  }, []);

  // Carica posteggi dal database
  useEffect(() => {
    fetch('https://orchestratore.mio-hub.me/api/markets/1/stalls')
      .then(res => res.json())
      .then(data => setStalls(data.data));
  }, []);

  // Click su riga tabella → centra mappa
  const handleRowClick = (stallNumber) => {
    setSelectedStall(stallNumber);
    // Calcola centro posteggio e centra mappa
    const feature = mapData.stalls_geojson.features.find(
      f => f.properties.number === stallNumber
    );
    if (feature) {
      const coords = feature.geometry.coordinates[0];
      const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      setMapCenter([centerLat, centerLng]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Tabella posteggi */}
      <div>
        <table>
          {stalls.map(stall => (
            <tr 
              key={stall.id}
              onClick={() => handleRowClick(stall.number)}
              className={selectedStall === stall.number ? 'bg-teal-500/20' : ''}
            >
              <td>{stall.number}</td>
              <td>{stall.status}</td>
            </tr>
          ))}
        </table>
      </div>

      {/* Mappa GIS */}
      <div>
        <MarketMapComponent
          mapData={mapData}
          center={mapCenter}
          zoom={19}
          selectedStallNumber={selectedStall}
          stallsData={stalls}
          onStallClick={setSelectedStall}
        />
      </div>
    </div>
  );
}
```

---

## ✅ Checklist Validazione

Prima di usare il componente in produzione, verifica:

- [ ] **Numeri scalano con zoom** (zoom in/out, i numeri cambiano dimensione)
- [ ] **Numeri trasparenti** (NO sfondo bianco)
- [ ] **Colori corretti** (verde=libero, rosso=occupato, arancione=riservato)
- [ ] **Popup funzionanti** (click su rettangolo mostra popup)
- [ ] **Layer control** (pulsante in alto a destra per cambiare mappa)
- [ ] **Marker centro** (marker rosso "M" al centro mercato)
- [ ] **Click handler** (se `onStallClick` definito, viene chiamato)
- [ ] **Selezione visibile** (posteggio selezionato evidenziato)

---

## 🚫 Cosa NON Fare

### ❌ NON Rimuovere `id="dynamic-tooltip-style"`

```tsx
// ❌ SBAGLIATO - Numeri non scaleranno
<style>{`
  .stall-number-tooltip { ... }
`}</style>

// ✅ CORRETTO
<style id="dynamic-tooltip-style">{`
  .stall-number-tooltip { ... }
`}</style>
```

### ❌ NON Rimuovere `font-size: 8px !important;`

```tsx
// ❌ SBAGLIATO - Font size non definito
.stall-number-tooltip {
  color: white !important;
  font-weight: bold !important;
}

// ✅ CORRETTO
.stall-number-tooltip {
  color: white !important;
  font-size: 8px !important;  // Base size per ZoomFontUpdater
  font-weight: bold !important;
}
```

### ❌ NON Rimuovere `<ZoomFontUpdater>`

```tsx
// ❌ SBAGLIATO - Numeri non scaleranno
<MapContainer>
  {/* ... */}
</MapContainer>

// ✅ CORRETTO
<MapContainer>
  <ZoomFontUpdater minZoom={18} baseFontSize={8} scaleFactor={1.5} />
  {/* ... */}
</MapContainer>
```

### ❌ NON Modificare i Parametri di `ZoomFontUpdater`

```tsx
// ❌ SBAGLIATO - Numeri troppo grandi o troppo piccoli
<ZoomFontUpdater minZoom={15} baseFontSize={12} scaleFactor={2} />

// ✅ CORRETTO - Parametri certificati
<ZoomFontUpdater minZoom={18} baseFontSize={8} scaleFactor={1.5} />
```

---

## 🔍 Troubleshooting

### Problema: Numeri non scalano con zoom

**Causa:** Style tag senza ID o `ZoomFontUpdater` mancante

**Soluzione:**
1. Verifica che `<style id="dynamic-tooltip-style">` sia presente
2. Verifica che `<ZoomFontUpdater>` sia dentro `<MapContainer>`
3. Verifica che `font-size: 8px !important;` sia nel CSS

### Problema: Numeri con sfondo bianco

**Causa:** CSS tooltip non corretto

**Soluzione:**
```css
.stall-number-tooltip.leaflet-tooltip {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
```

### Problema: Colori non aggiornati dal database

**Causa:** `stallsData` non passato o formato errato

**Soluzione:**
```tsx
<MarketMapComponent
  mapData={mapData}
  stallsData={stallsFromDatabase}  // Array con { number, status, ... }
/>
```

---

## 📚 File Correlati

| File | Descrizione |
|------|-------------|
| `MarketMapComponent.tsx` | Componente principale (QUESTO FILE) |
| `ZoomFontUpdater.tsx` | Componente per scaling dinamico font |
| `MarketGISPage.tsx` | Pagina standalone mappa GIS (versione perfetta) |
| `GestioneMercati.tsx` | Esempio uso in dashboard |

---

## 🔗 Link Utili

- **Mappa Live:** https://dms-hub-app-new.vercel.app/market-gis
- **Dashboard PA:** https://dms-hub-app-new.vercel.app/dashboard-pa
- **API Endpoint:** https://orchestratore.mio-hub.me/api/gis/market-map
- **Blueprint GIS:** https://github.com/Chcndr/dms-system-blueprint/blob/master/GIS_SYSTEM_UPDATE_21NOV2025.md

---

## 📝 Changelog

### v1.0.0 (22 Novembre 2025)
- ✅ Componente certificato e testato
- ✅ Numeri scalabili con zoom
- ✅ Colori dinamici dal database
- ✅ Collegamento bidirezionale tabelle-mappa
- ✅ 4 layer maps selezionabili
- ✅ Popup informativi
- ✅ Marker centro mercato

---

## 👤 Maintainer

**Manus AI** - Sistema DMS MIO-HUB  
**Ultima Revisione:** 22 Novembre 2025

---

## ⚠️ IMPORTANTE

**Questo componente è certificato e testato.**  
**NON modificare senza aggiornare questa documentazione.**  
**Se serve una variante, crea un nuovo componente.**

---
