# 🏗️ PROGETTO: HUB Emilia Romagna - Sistema Multi-Livello

> **Versione:** 1.0.0  
> **Data:** 8 Gennaio 2026  
> **Stato:** DA IMPLEMENTARE

---

## 📋 OBIETTIVO

Implementare un sistema di visualizzazione HUB a 3 livelli di colore sulla mappa:

1. **Capoluogo** (Bologna, Modena già esistenti) → Colore pieno (verde #10b981)
2. **Province** → Colore tenue (verde chiaro #34d399) - Visibili in **Vista Regione**
3. **Comuni** → Colore più tenue (verde pallido #6ee7b7) - Visibili in **Vista Provincia**

---

## 📊 DATI HUB EMILIA ROMAGNA

### Riepilogo per Provincia

| Provincia | Sigla | ID DB | N. HUB | Tipo |
|-----------|-------|-------|--------|------|
| Bologna | BO | 39 | 6 | Capoluogo + Comuni |
| Modena | MO | 42 | 12 | Capoluogo + Comuni |
| Reggio Emilia | RE | 46 | 10 | Capoluogo + Comuni |
| Parma | PR | 43 | 4 | Capoluogo + Comuni |
| Piacenza | PC | 44 | 3 | Capoluogo + Comuni |
| Ferrara | FE | 40 | 6 | Capoluogo + Comuni |
| Ravenna | RA | 45 | 2 | Capoluogo + Comuni |
| Forlì-Cesena | FC | 41 | 9 | Capoluogo + Comuni |
| Rimini | RN | 47 | 7 | Capoluogo + Comuni |

**TOTALE: 59 HUB**

---

## 🗄️ DATABASE

### Tabella: `hub_emilia_romagna`

```sql
CREATE TABLE IF NOT EXISTS hub_emilia_romagna (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'urbano' o 'prossimita'
  comune VARCHAR(255) NOT NULL,
  provincia_id INTEGER REFERENCES province(id),
  provincia_sigla VARCHAR(2) NOT NULL,
  regione_id INTEGER DEFAULT 8, -- Emilia-Romagna
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  livello VARCHAR(20) NOT NULL, -- 'capoluogo', 'provincia', 'comune'
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hub_er_provincia ON hub_emilia_romagna(provincia_id);
CREATE INDEX idx_hub_er_livello ON hub_emilia_romagna(livello);
```

### Dati da Inserire

#### BOLOGNA (provincia_id=39)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Bologna | urbano | Bologna | capoluogo | 44.4949 | 11.3426 |
| Hub urbano Budrio | urbano | Budrio | comune | 44.5374 | 11.5351 |
| Hub prossimità Vergato | prossimita | Vergato | comune | 44.2819 | 11.1122 |
| Hub urbano Castel San Pietro Terme | urbano | Castel San Pietro Terme | comune | 44.3989 | 11.5878 |
| Hub urbano Casalecchio | urbano | Casalecchio di Reno | comune | 44.4733 | 11.2756 |
| Hub urbano Centro Storico Imola | urbano | Imola | comune | 44.3531 | 11.7148 |

#### MODENA (provincia_id=42)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Modena | urbano | Modena | capoluogo | 44.6471 | 10.9252 |
| Hub urbano Pievepelago | urbano | Pievepelago | comune | 44.2089 | 10.6167 |
| Hub urbano Fiorano | urbano | Fiorano Modenese | comune | 44.5389 | 10.8156 |
| Hub urbano Fiumalbo | urbano | Fiumalbo | comune | 44.1789 | 10.6489 |
| Hub prossimità SantAnna San Cesario | prossimita | San Cesario sul Panaro | comune | 44.5622 | 11.0356 |
| Hub prossimità Spezzano Fiorano | prossimita | Fiorano Modenese | comune | 44.5267 | 10.8089 |
| Hub urbano Vignola Centro | urbano | Vignola | comune | 44.4789 | 11.0089 |
| Hub urbano Formigine | urbano | Formigine | comune | 44.5722 | 10.8478 |
| Hub urbano Concordia | urbano | Concordia sulla Secchia | comune | 44.9122 | 10.9822 |
| Hub urbano Sassuolo | urbano | Sassuolo | comune | 44.5422 | 10.7856 |
| Hub urbano San Cesario sul Panaro | urbano | San Cesario sul Panaro | comune | 44.5622 | 11.0356 |
| Hub urbano Centro storico Carpi | urbano | Carpi | comune | 44.7833 | 10.8833 |

#### REGGIO EMILIA (provincia_id=46)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Reggio Emilia | urbano | Reggio Emilia | capoluogo | 44.6989 | 10.6297 |
| Hub prossimità Correggio | prossimita | Correggio | comune | 44.7722 | 10.7822 |
| Hub prossimità Arceto Scandiano | prossimita | Scandiano | comune | 44.5956 | 10.6889 |
| Hub prossimità Villanova Reggiolo | prossimita | Reggiolo | comune | 44.9167 | 10.8167 |
| Hub prossimità Brugneto Reggiolo | prossimita | Reggiolo | comune | 44.9089 | 10.8089 |
| Hub prossimità Novellara | prossimita | Novellara | comune | 44.8456 | 10.7289 |
| Hub prossimità Guastalla | prossimita | Guastalla | comune | 44.9222 | 10.6556 |
| Hub urbano Scandiano | urbano | Scandiano | comune | 44.5956 | 10.6889 |
| Hub urbano Campagnola | urbano | Campagnola Emilia | comune | 44.8389 | 10.7556 |
| Hub urbano Reggiolo | urbano | Reggiolo | comune | 44.9167 | 10.8167 |

#### PARMA (provincia_id=43)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Parma | urbano | Parma | capoluogo | 44.8015 | 10.3279 |
| Hub urbano Fidenza | urbano | Fidenza | comune | 44.8667 | 10.0611 |
| Hub urbano Busseto Centro | urbano | Busseto | comune | 44.9789 | 10.0422 |
| Hub urbano Salsomaggiore Terme Hub centro | urbano | Salsomaggiore Terme | comune | 44.8167 | 9.9833 |

#### PIACENZA (provincia_id=44)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Piacenza | urbano | Piacenza | capoluogo | 45.0526 | 9.6930 |
| Hub urbano Calendasco | urbano | Calendasco | comune | 45.0789 | 9.5889 |
| Hub urbano Vernasca | urbano | Vernasca | comune | 44.8022 | 9.8289 |

#### FERRARA (provincia_id=40)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Ferrara | urbano | Ferrara | capoluogo | 44.8381 | 11.6198 |
| Hub urbano Codigoro | urbano | Codigoro | comune | 44.8322 | 12.1089 |
| Hub urbano Tresigallo Tresignana | urbano | Tresignana | comune | 44.8167 | 11.8833 |
| Hub urbano Formignana Tresignana | urbano | Tresignana | comune | 44.8389 | 11.8556 |
| Hub prossimità Ferrara | prossimita | Ferrara | capoluogo | 44.8381 | 11.6198 |
| Hub urbano Cento | urbano | Cento | comune | 44.7267 | 11.2889 |

#### RAVENNA (provincia_id=45)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Ravenna | urbano | Ravenna | capoluogo | 44.4184 | 12.2035 |
| Hub urbano Cervia Centro | urbano | Cervia | comune | 44.2622 | 12.3489 |

#### FORLÌ-CESENA (provincia_id=41)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Cesena | urbano | Cesena | capoluogo | 44.1378 | 12.2422 |
| Hub prossimità Bagno di Romagna | prossimita | Bagno di Romagna | comune | 43.8333 | 11.9667 |
| Hub prossimità Ranchio Sarsina | prossimita | Sarsina | comune | 43.9167 | 12.1333 |
| Hub prossimità Le Vigne Cesena | prossimita | Cesena | capoluogo | 44.1378 | 12.2422 |
| Hub prossimità Magnani Oltrepo Cesena | prossimita | Cesena | capoluogo | 44.1378 | 12.2422 |
| Hub urbano Bagno di Romagna | urbano | Bagno di Romagna | comune | 43.8333 | 11.9667 |
| Hub urbano Sarsina | urbano | Sarsina | comune | 43.9167 | 12.1333 |
| Hub urbano Forlimpopoli | urbano | Forlimpopoli | comune | 44.1889 | 12.1278 |
| Hub urbano Meldola | urbano | Meldola | comune | 44.1278 | 12.0589 |

#### RIMINI (provincia_id=47)

| Nome HUB | Tipo | Comune | Livello | Lat | Lng |
|----------|------|--------|---------|-----|-----|
| Hub urbano Rimini | urbano | Rimini | capoluogo | 44.0678 | 12.5695 |
| Hub prossimità Regina Elena Rimini | prossimita | Rimini | capoluogo | 44.0678 | 12.5695 |
| Hub prossimità MarinaCentro Rimini | prossimita | Rimini | capoluogo | 44.0622 | 12.5789 |
| Hub urbano Riccione Paese | urbano | Riccione | comune | 43.9989 | 12.6556 |
| Hub urbano Ceccarini Dante Riccione | urbano | Riccione | comune | 43.9956 | 12.6522 |
| Hub urbano Abissinia Riccione | urbano | Riccione | comune | 44.0022 | 12.6589 |
| Hub urbano Cattolica Centro | urbano | Cattolica | comune | 43.9622 | 12.7389 |

---

## 🎨 SISTEMA COLORI 3 LIVELLI

### Palette Colori

| Livello | Colore | Hex | Opacità | Visibilità |
|---------|--------|-----|---------|------------|
| **Capoluogo** | Verde pieno | #10b981 | 100% | Sempre visibile |
| **Provincia** | Verde chiaro | #34d399 | 80% | Solo in Vista Regione |
| **Comune** | Verde pallido | #6ee7b7 | 60% | Solo in Vista Provincia |

### Logica Visibilità

```typescript
// Determina quali marker mostrare in base alla vista corrente
const getVisibleHubs = (
  hubs: HubEmiliaRomagna[],
  selectedRegione: number | null,
  selectedProvincia: number | null
) => {
  // Vista Italia → Solo capoluoghi
  if (!selectedRegione && !selectedProvincia) {
    return hubs.filter(h => h.livello === 'capoluogo');
  }
  
  // Vista Regione → Capoluoghi + Province (marker tenue)
  if (selectedRegione && !selectedProvincia) {
    return hubs.filter(h => 
      h.livello === 'capoluogo' || h.livello === 'provincia'
    );
  }
  
  // Vista Provincia → Tutti (capoluogo + comuni della provincia)
  if (selectedProvincia) {
    return hubs.filter(h => 
      h.provincia_id === selectedProvincia
    );
  }
  
  return hubs;
};
```

---

## 🔌 API ENDPOINTS

### 1. GET /api/hub-emilia-romagna

Lista tutti gli HUB dell'Emilia Romagna.

**Query Parameters:**
- `provincia_id` (opzionale): Filtra per provincia
- `livello` (opzionale): Filtra per livello (capoluogo, provincia, comune)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "Hub urbano Bologna",
      "tipo": "urbano",
      "comune": "Bologna",
      "provincia_id": 39,
      "provincia_sigla": "BO",
      "lat": 44.4949,
      "lng": 11.3426,
      "livello": "capoluogo"
    }
  ],
  "count": 59
}
```

### 2. GET /api/hub-emilia-romagna/by-provincia/:provinciaId

Lista HUB di una specifica provincia.

**Response:**
```json
{
  "success": true,
  "data": [...],
  "provincia": {
    "id": 39,
    "nome": "Bologna",
    "sigla": "BO"
  }
}
```

---

## 🗺️ MODIFICHE FRONTEND

### File: `GestioneHubMapWrapper.tsx`

1. **Nuovo State:**
```typescript
const [hubEmiliaRomagna, setHubEmiliaRomagna] = useState<HubER[]>([]);
```

2. **Fetch HUB ER:**
```typescript
useEffect(() => {
  const fetchHubER = async () => {
    const res = await fetch(`${API_BASE_URL}/api/hub-emilia-romagna`);
    const data = await res.json();
    if (data.success) setHubEmiliaRomagna(data.data);
  };
  fetchHubER();
}, []);
```

3. **Passare a HubMarketMapComponent:**
```tsx
<HubMarketMapComponent
  hubEmiliaRomagna={hubEmiliaRomagna}
  selectedRegione={selectedRegione}
  selectedProvincia={selectedProvincia}
  // ... altri props
/>
```

### File: `HubMarketMapComponent.tsx`

1. **Nuovi Props:**
```typescript
interface Props {
  hubEmiliaRomagna?: HubER[];
  selectedRegione?: number | null;
  selectedProvincia?: number | null;
  // ... altri props esistenti
}
```

2. **Render Marker HUB ER:**
```tsx
{hubEmiliaRomagna?.map(hub => {
  // Determina se mostrare questo marker
  const isVisible = shouldShowHub(hub, selectedRegione, selectedProvincia);
  if (!isVisible) return null;
  
  // Determina colore in base al livello
  const color = getHubColor(hub.livello);
  
  return (
    <CircleMarker
      key={`hub-er-${hub.id}`}
      center={[hub.lat, hub.lng]}
      radius={hub.livello === 'capoluogo' ? 12 : hub.livello === 'provincia' ? 10 : 8}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: hub.livello === 'capoluogo' ? 1 : hub.livello === 'provincia' ? 0.8 : 0.6,
        weight: 2
      }}
    >
      <Popup>
        <div>
          <strong>{hub.nome}</strong>
          <br />
          {hub.comune} ({hub.provincia_sigla})
          <br />
          <span className="text-xs text-gray-500">{hub.tipo}</span>
        </div>
      </Popup>
    </CircleMarker>
  );
})}
```

3. **Funzioni Helper:**
```typescript
const getHubColor = (livello: string): string => {
  switch (livello) {
    case 'capoluogo': return '#10b981'; // Verde pieno
    case 'provincia': return '#34d399'; // Verde chiaro
    case 'comune': return '#6ee7b7';    // Verde pallido
    default: return '#10b981';
  }
};

const shouldShowHub = (
  hub: HubER,
  selectedRegione: number | null,
  selectedProvincia: number | null
): boolean => {
  // Vista Italia → Solo capoluoghi
  if (!selectedRegione && !selectedProvincia) {
    return hub.livello === 'capoluogo';
  }
  
  // Vista Regione Emilia-Romagna → Capoluoghi + Province
  if (selectedRegione === 8 && !selectedProvincia) {
    return hub.livello === 'capoluogo' || hub.livello === 'provincia';
  }
  
  // Vista Provincia → Tutti gli HUB di quella provincia
  if (selectedProvincia) {
    return hub.provincia_id === selectedProvincia;
  }
  
  return false;
};
```

---

## 📝 CHECKLIST IMPLEMENTAZIONE

### Backend (mihub-backend-rest)

- [ ] Creare tabella `hub_emilia_romagna` con migration SQL
- [ ] Inserire tutti i 59 HUB con coordinate
- [ ] Creare endpoint `GET /api/hub-emilia-romagna`
- [ ] Creare endpoint `GET /api/hub-emilia-romagna/by-provincia/:id`
- [ ] Registrare endpoint in Guardian

### Frontend (dms-hub-app-new)

- [ ] Aggiungere tipo `HubEmiliaRomagna` in types
- [ ] Modificare `GestioneHubMapWrapper.tsx` per fetch HUB ER
- [ ] Modificare `HubMarketMapComponent.tsx` per render marker
- [ ] Implementare logica visibilità 3 livelli
- [ ] Implementare palette colori
- [ ] Testare zoom regione/provincia

### Documentazione

- [ ] Aggiornare MASTER_BLUEPRINT con v3.26.0
- [ ] Documentare nuovi endpoint
- [ ] Documentare logica colori

---

## 🎯 RISULTATO ATTESO

1. **Vista Italia**: Solo marker Bologna e altri capoluoghi (verde pieno)
2. **Vista Emilia-Romagna**: Tutti i capoluoghi + marker province (verde chiaro)
3. **Vista Provincia (es. Bologna)**: Tutti gli HUB della provincia (verde pallido per comuni)

---

## 📅 TIMELINE

| Fase | Tempo Stimato |
|------|---------------|
| Database + Migration | 30 min |
| API Backend | 30 min |
| Frontend Wrapper | 20 min |
| Frontend Map Component | 40 min |
| Testing | 20 min |
| Documentazione | 20 min |

**TOTALE: ~2.5 ore**
