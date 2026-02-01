# Progetto: Flusso Ricerca → Vetrina → Navigazione

> **Versione:** 2.0.0  
> **Data:** 01 Febbraio 2026  
> **Autore:** Manus AI  
> **Stato:** Analisi Corretta - In Attesa di Approvazione

---

## Sommario Esecutivo

Questo documento presenta l'analisi corretta e il piano di implementazione per il flusso di navigazione dell'app pubblica MioHub. L'analisi precedente conteneva errori che sono stati corretti dopo la revisione del codice e del blueprint.

**Correzioni rispetto all'analisi precedente:**

1. **Le coordinate esistono già** - Negozi HUB hanno `lat/lng`, posteggi mercato hanno `latitude/longitude`
2. **La mappa GIS è l'unica da usare** - `GestioneHubMapWrapper` con `RouteLayer` per il percorso (NO Google Maps per visualizzazione)
3. **Il tracciamento percorso funzionava** - Il problema è che RoutePage non passa `routeConfig` a GestioneHubMapWrapper

---

## Indice

1. [Analisi del Sistema Attuale](#analisi-del-sistema-attuale)
2. [Problemi Identificati (Corretti)](#problemi-identificati-corretti)
3. [Architettura del Routing](#architettura-del-routing)
4. [Piano di Implementazione](#piano-di-implementazione)
5. [Checklist](#checklist)

---

## Analisi del Sistema Attuale

### Come Funziona il Routing sulla Mappa GIS

Il sistema di routing è già implementato e funzionante. Ecco la catena di componenti:

```
RoutePage.tsx
    └── GestioneHubMapWrapper (senza props!)
            └── MapWithTransportLayer (wrapper con routing)
                    └── HubMarketMapComponent (accetta routeConfig)
                            └── RouteLayer (disegna il percorso)
```

**Il problema:** `GestioneHubMapWrapper` è chiamato senza props in RoutePage (linea 824):
```tsx
<GestioneHubMapWrapper />
```

Ma `GestioneHubMapWrapper` **non accetta props** - è definito come:
```tsx
export default function GestioneHubMapWrapper() {
  // Nessun parametro!
}
```

### Come Funziona il Routing Trasporti (che funziona!)

Il routing verso le fermate trasporto funziona perché `MapWithTransportLayer` gestisce internamente il `routeConfig`:

```tsx
// MapWithTransportLayer.tsx - linea 78
const routeConfig = (showRoute && referencePoint && selectedStop) ? {
  enabled: true,
  userLocation: { lat: referencePoint.lat, lng: referencePoint.lng },
  destination: { lat: selectedStop.stop_lat, lng: selectedStop.stop_lon },
  mode: 'walking' as const
} : undefined;

// Poi lo passa a HubMarketMapComponent - linea 93
routeConfig: routeConfig,
```

### Flusso Attuale Vetrina → Route

Il flusso da VetrinePage a RoutePage funziona correttamente:

1. **VetrinePage.tsx** - `handleNavigate()` cerca coordinate:
   - Prima cerca negozio HUB (`/api/hub/shops` con `owner_id = impresa.id`)
   - Se non trova, cerca posteggio mercato (`/api/markets/1/stalls` con `impresa_id = impresa.id`)
   - Naviga a `/route?destinationLat=...&destinationLng=...&destinationName=...`

2. **RoutePage.tsx** - Riceve i parametri URL e li usa per:
   - Compilare il campo destinazione
   - Calcolare il percorso via API `/api/routing/calculate`
   - **MA NON PASSA routeConfig alla mappa!**

---

## Problemi Identificati (Corretti)

### Problema 1: Click Ricerca Porta a Dashboard PA

**File:** `HomePage.tsx` - linea 159-162

**Codice Attuale:**
```tsx
const handleResultClick = (result: SearchResult) => {
  setLocation(`/mappa?lat=${result.lat}&lng=${result.lng}&zoom=15&id=${result.id}`);
};
```

**Problema:** `/mappa` (MapPage) fa redirect a `/dashboard-pa?tab=mappa` (linea 29 di MapPage.tsx)

**Soluzione:** Per imprese/negozi, navigare a `/vetrine/{id}` invece di `/mappa`

---

### Problema 2: GestioneHubMapWrapper Non Accetta routeConfig

**File:** `GestioneHubMapWrapper.tsx` - linea 139

**Codice Attuale:**
```tsx
export default function GestioneHubMapWrapper() {
  // Nessun props!
}
```

**Problema:** Non c'è modo di passare `routeConfig` dall'esterno per mostrare il percorso

**Soluzione:** Aggiungere props opzionali per `routeConfig` e passarli a `HubMarketMapComponent`

---

### Problema 3: RoutePage Non Passa routeConfig alla Mappa

**File:** `RoutePage.tsx` - linea 824

**Codice Attuale:**
```tsx
<GestioneHubMapWrapper />
```

**Problema:** Anche se calcoliamo il percorso con l'API, non viene visualizzato sulla mappa

**Soluzione:** Passare `routeConfig` con `userLocation` e `destination`

---

### Problema 4: Geolocalizzazione Non Automatica

**File:** `RoutePage.tsx`

**Problema:** L'utente deve cliccare manualmente il pulsante GPS

**Soluzione:** Aggiungere `useEffect` per richiedere GPS automaticamente all'apertura

---

### Problema 5: Avvia Navigazione Non Funziona

**File:** `RoutePage.tsx`

**Problema:** Il pulsante "Avvia Navigazione" non fa nulla di utile (solo scroll)

**Soluzione:** Aprire l'app di navigazione nativa (Google Maps su Android, Apple Maps su iOS) con deep link

---

## Architettura del Routing

### Diagramma Flusso Corretto

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUSSO RICERCA → VETRINA → NAVIGAZIONE            │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   HomePage      │
│  Barra Ricerca  │
└────────┬────────┘
         │ handleResultClick()
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MODIFICA: Navigare a /vetrine/{id} per imprese/negozi               │
│           invece di /mappa che fa redirect a Dashboard PA           │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  VetrinePage    │
│  /vetrine/:id   │
└────────┬────────┘
         │ handleNavigate() - GIÀ FUNZIONANTE
         │ (cerca coordinate da HUB shop o posteggio)
         ▼
┌─────────────────┐
│   RoutePage     │
│   /route        │
└────────┬────────┘
         │
         │ MODIFICHE NECESSARIE:
         │ 1. Auto-geolocalizzazione
         │ 2. Passare routeConfig a GestioneHubMapWrapper
         │ 3. Avvia navigazione con deep link
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  GestioneHubMapWrapper (MODIFICA: accettare routeConfig props)      │
│      └── MapWithTransportLayer                                       │
│              └── HubMarketMapComponent (routeConfig)                 │
│                      └── RouteLayer (OSRM) ← DISEGNA PERCORSO       │
└─────────────────────────────────────────────────────────────────────┘
```

### Componenti Coinvolti

| Componente | File | Modifica Necessaria |
|------------|------|---------------------|
| HomePage | `pages/HomePage.tsx` | Modificare `handleResultClick` |
| VetrinePage | `pages/VetrinePage.tsx` | Nessuna (già funzionante) |
| RoutePage | `pages/RoutePage.tsx` | Auto-GPS + passare routeConfig + deep link |
| GestioneHubMapWrapper | `components/GestioneHubMapWrapper.tsx` | Accettare props routeConfig |
| HubMarketMapComponent | `components/HubMarketMapComponent.tsx` | Nessuna (già accetta routeConfig) |
| RouteLayer | `components/RouteLayer.tsx` | Nessuna (già funzionante) |

---

## Piano di Implementazione

### Fase 1: Fix Navigazione Ricerca → Vetrina

**File:** `client/src/pages/HomePage.tsx`

**Modifica:**
```tsx
const handleResultClick = (result: SearchResult) => {
  if (result.type === 'impresa' || result.type === 'negozio' || result.type === 'vetrina') {
    // Estrai ID numerico da "impresa_25" → 25
    const numericId = result.id.replace(/\D/g, '');
    setLocation(`/vetrine/${numericId}?from=search&q=${encodeURIComponent(searchQuery)}`);
  } else if (result.type === 'mercato' || result.type === 'hub') {
    // Per mercati e hub, vai alla mappa GIS nella dashboard
    setLocation(`/dashboard-pa?tab=mappa&lat=${result.lat}&lng=${result.lng}&zoom=15`);
  } else {
    // Fallback per città, merceologia, ecc.
    setLocation(`/dashboard-pa?tab=mappa&lat=${result.lat}&lng=${result.lng}&zoom=12`);
  }
};
```

---

### Fase 2: GestioneHubMapWrapper Accetta routeConfig

**File:** `client/src/components/GestioneHubMapWrapper.tsx`

**Modifica 1 - Aggiungere interface props:**
```tsx
interface GestioneHubMapWrapperProps {
  routeConfig?: {
    enabled: boolean;
    userLocation: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: 'walking' | 'cycling' | 'driving';
  };
}

export default function GestioneHubMapWrapper({ routeConfig }: GestioneHubMapWrapperProps = {}) {
```

**Modifica 2 - Passare routeConfig a HubMarketMapComponent (linea ~977):**
```tsx
<HubMarketMapComponent
  // ... altri props esistenti ...
  routeConfig={routeConfig}  // AGGIUNGERE QUESTA LINEA
/>
```

---

### Fase 3: RoutePage Passa routeConfig e Auto-GPS

**File:** `client/src/pages/RoutePage.tsx`

**Modifica 1 - Stato per routeConfig:**
```tsx
// Aggiungere dopo gli altri useState (circa linea 55)
const [routeConfig, setRouteConfig] = useState<{
  enabled: boolean;
  userLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: 'walking' | 'cycling' | 'driving';
} | undefined>(undefined);
```

**Modifica 2 - Auto-geolocalizzazione:**
```tsx
// Aggiungere useEffect per GPS automatico
useEffect(() => {
  if (navigator.geolocation && !userLocation) {
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setOrigin(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setLoadingLocation(false);
        toast.success('📍 Posizione GPS rilevata');
      },
      (error) => {
        console.warn('Geolocation denied:', error);
        setLoadingLocation(false);
        toast.info('Clicca l\'icona GPS per rilevare la posizione');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
}, []);
```

**Modifica 3 - Aggiornare routeConfig quando si calcola il percorso:**
```tsx
// Nella funzione handleCalculateRoute, dopo aver ricevuto il piano
if (plan && userLocation) {
  // Estrai coordinate destinazione
  const coordMatch = destination.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
  if (coordMatch) {
    setRouteConfig({
      enabled: true,
      userLocation: userLocation,
      destination: {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      },
      mode: mode === 'walk' ? 'walking' : mode === 'bike' ? 'cycling' : 'driving'
    });
  }
}
```

**Modifica 4 - Passare routeConfig a GestioneHubMapWrapper (linea 824):**
```tsx
<GestioneHubMapWrapper routeConfig={routeConfig} />
```

---

### Fase 4: Avvia Navigazione con Deep Link

**File:** `client/src/pages/RoutePage.tsx`

**Modifica - handleStartNavigation:**
```tsx
const handleStartNavigation = () => {
  if (!routeConfig || !userLocation) {
    toast.error('Calcola prima il percorso');
    return;
  }
  
  const { destination } = routeConfig;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Mappa modalità
  const modeMap: Record<string, string> = {
    walk: 'walking',
    bike: 'bicycling',
    transit: 'transit',
    car: 'driving'
  };
  const navMode = modeMap[mode] || 'walking';
  
  let url: string;
  
  if (isIOS) {
    // Apple Maps
    const dirflg = navMode === 'walking' ? 'w' : navMode === 'driving' ? 'd' : 'r';
    url = `maps://maps.apple.com/?saddr=${userLocation.lat},${userLocation.lng}&daddr=${destination.lat},${destination.lng}&dirflg=${dirflg}`;
  } else {
    // Google Maps
    url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}&travelmode=${navMode}`;
  }
  
  window.open(url, '_blank');
  toast.success('🧭 Navigazione avviata');
};
```

---

## Checklist

### Fase 1: Fix Ricerca → Vetrina
- [ ] Modificare `handleResultClick` in `HomePage.tsx`
- [ ] Testare ricerca per nome impresa → apre vetrina
- [ ] Testare ricerca per merceologia → apre vetrina

### Fase 2: GestioneHubMapWrapper Props
- [ ] Aggiungere interface `GestioneHubMapWrapperProps`
- [ ] Modificare firma funzione per accettare props
- [ ] Passare `routeConfig` a `HubMarketMapComponent`

### Fase 3: RoutePage Routing
- [ ] Aggiungere stato `routeConfig`
- [ ] Implementare auto-geolocalizzazione
- [ ] Aggiornare `routeConfig` dopo calcolo percorso
- [ ] Passare `routeConfig` a `GestioneHubMapWrapper`
- [ ] Testare visualizzazione percorso su mappa GIS

### Fase 4: Avvia Navigazione
- [ ] Implementare deep link Google Maps
- [ ] Implementare deep link Apple Maps
- [ ] Testare su mobile (Android e iOS)

---

## Note Tecniche

### Coordinate Disponibili

Le coordinate sono già disponibili nel sistema:

| Tipo | Tabella | Campi |
|------|---------|-------|
| Negozi HUB | `hub_shops` | `lat`, `lng` |
| Posteggi Mercato | `stalls` | `latitude`, `longitude` |
| Mercati | `markets` | `latitude`, `longitude` |
| HUB | `hub_locations` | `lat`, `lng`, `center_lat`, `center_lng` |

### RouteLayer (OSRM)

Il componente `RouteLayer.tsx` usa Leaflet Routing Machine con OSRM:
- Endpoint: `https://router.project-osrm.org/route/v1`
- Profili: `foot`, `bike`, `car`
- Stile linea: verde (#10b981), spessore 6px

---

**Documento aggiornato:** 01 Febbraio 2026  
**Autore:** Manus AI
