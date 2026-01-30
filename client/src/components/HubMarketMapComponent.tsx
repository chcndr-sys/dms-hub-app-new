import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl, Tooltip, useMap } from 'react-leaflet';
import { Link } from 'wouter';
import { ZoomFontUpdater } from './ZoomFontUpdater';
import { RouteLayer } from './RouteLayer';
import { getStallMapFillColor, getStallStatusLabel } from '@/lib/stallStatus';
import { calculatePolygonDimensions } from '@/lib/geodesic';
import { useMapAnimation } from '@/hooks/useMapAnimation';
import { useAnimation } from '@/contexts/AnimationContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix per icone marker Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface StallFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'Point';
    coordinates: any;
  };
  properties: {
    number: number;
    dimensions?: string;
    rotation?: number;
    status?: string;
    kind?: string;
    vendor_name?: string;
    vendor_business_name?: string;
    vendor_contact_name?: string;
    [key: string]: any;
  };
}

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

// ============================================================
// HubMarketMapComponent - Clone di MarketMapComponent
// Supporta sia Mercati che HUB con selettore
// ============================================================

// Interfaccia per HUB Location
interface HubLocation {
  id: number;
  name: string;
  lat: number | string;  // API restituisce lat/lng
  lng: number | string;
  latitude?: number;  // Fallback per compatibilità
  longitude?: number;
  address?: string;
  city?: string;
  area_geojson?: any;
  shops?: HubShop[];
  // Nuovi campi per sistema multi-livello Emilia Romagna
  provincia_id?: number;
  regione_id?: number;
  livello?: 'capoluogo' | 'provincia' | 'comune';
  tipo?: 'urbano' | 'prossimita';
  provincia_sigla?: string;
}

// Interfaccia per Shop (negozio)
interface HubShop {
  id: number;
  letter: string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
  status?: string;
  contact_phone?: string;
  contact_email?: string;
  description?: string;
  vetrina_url?: string;
}

interface HubMarketMapComponentProps {
  mapData?: MapData; // Opzionale per modalità HUB
  center?: [number, number];
  zoom?: number;
  height?: string;
  onStallClick?: (stallNumber: number) => void;
  selectedStallNumber?: number;
  stallsData?: Array<{
    id: number;
    number: number;
    status: string;
    type?: string;
    vendor_name?: string;
    impresa_id?: number;
    width?: string;
    depth?: string;
    dimensions?: string;
  }>;
  refreshKey?: number;
  isSpuntaMode?: boolean;
  onConfirmAssignment?: (stallId: number) => Promise<void>;
  routeConfig?: {
    enabled: boolean;
    userLocation: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: 'walking' | 'cycling' | 'driving';
  };
  // Props per Vista Italia (Gemello Digitale)
  allMarkets?: Array<{ id: number; name: string; latitude: number; longitude: number }>;
  onMarketClick?: (marketId: number) => void;
  showItalyView?: boolean;
  viewTrigger?: number;
  marketCenterFixed?: [number, number];
  selectedStallCenter?: [number, number];
  
  // ============ NUOVE PROPS PER HUB ============
  mode?: 'mercato' | 'hub'; // Modalità: mercato o hub
  allHubs?: HubLocation[]; // Lista di tutti gli HUB per Vista Italia
  selectedHub?: HubLocation; // HUB selezionato con negozi
  onHubClick?: (hubId: number) => void; // Callback click su HUB
  onShopClick?: (shop: HubShop) => void; // Callback click su negozio
  hubCenterFixed?: [number, number]; // Centro HUB fisso per zoom
  customZoom?: number; // Zoom personalizzato per navigazione regione/provincia
}

// Controller per centrare la mappa programmaticamente
interface MapControllerProps {
  center: [number, number];
  zoom?: number;
  trigger?: number;
  bounds?: L.LatLngBoundsExpression;
  isMarketView?: boolean;
}

function MapCenterController(props: MapControllerProps) {
  useMapAnimation(props);
  return null;
}

// Controller per centrare mappa su posteggio selezionato (pan senza animazione lunga)
function StallCenterController({ stallCenter }: { stallCenter?: [number, number] }) {
  const map = useMap();
  const lastCenterRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    if (!stallCenter) return;
    
    // Crea una chiave unica per questo centro
    const centerKey = `${stallCenter[0].toFixed(6)},${stallCenter[1].toFixed(6)}`;
    
    // Evita di ri-centrare se è lo stesso punto
    if (lastCenterRef.current === centerKey) return;
    lastCenterRef.current = centerKey;
    
    console.log('[StallCenterController] Centrando su posteggio:', stallCenter);
    
    // Pan veloce verso il posteggio con zoom appropriato
    map.flyTo(stallCenter, 19, {
      duration: 0.8, // Animazione veloce
      easeLinearity: 0.5
    });
  }, [stallCenter, map]);
  
  return null;
}

/**
 * Componente Mappa GIS Riusabile
 * 
 * Questo componente renderizza la mappa del mercato con:
 * - Rettangoli colorati per ogni posteggio
 * - Numeri scalabili con zoom (senza sfondo bianco)
 * - Popup informativi con dati dal database
 * - Layer control per cambiare mappa
 * - Marker rosso "M" al centro mercato
 * 
 * @param mapData - Dati GeoJSON con geometrie posteggi
 * @param center - Centro mappa [lat, lng] (opzionale, default: mapData.center)
 * @param zoom - Livello zoom iniziale (default: 17)
 * @param height - Altezza mappa (default: '600px')
 * @param onStallClick - Callback quando si clicca su un posteggio
 * @param selectedStallNumber - Numero posteggio selezionato (evidenziato)
 * @param stallsData - Dati aggiornati dei posteggi dal database (per override colori/stato)
 */
export function HubMarketMapComponent({
  mapData,
  center,
  zoom = 17,
  height = '600px',
  onStallClick,
  selectedStallNumber,
  stallsData = [],
  refreshKey = 0,
  isSpuntaMode = false,
  onConfirmAssignment,
  routeConfig,
  // Props per Vista Italia (Gemello Digitale)
  allMarkets = [],
  onMarketClick,
  showItalyView = false,
  viewTrigger = 0,
  marketCenterFixed,
  selectedStallCenter,
  // Props per HUB
  mode = 'mercato',
  allHubs = [],
  selectedHub,
  onHubClick,
  onShopClick,
  hubCenterFixed,
  customZoom
}: HubMarketMapComponentProps) {
  
  // Ottieni lo stato di animazione dal context per nascondere poligoni durante zoom
  const { isAnimating } = useAnimation();
  
  // Se showItalyView è true, usa coordinate Italia
  // Se c'è hubCenterFixed (regione/provincia/hub), usa quello
  // Se c'è marketCenterFixed, usa quello
  // Altrimenti usa mapData.center o fallback Italia
  const mapCenter: [number, number] = center || (
    showItalyView 
      ? [42.5, 12.5]  // Centro Italia fisso
      : hubCenterFixed
        ? hubCenterFixed  // Centro regione/provincia/HUB
        : marketCenterFixed
          ? marketCenterFixed  // Centro Mercato selezionato
          : mapData?.center 
            ? [mapData.center.lat, mapData.center.lng] 
            : [42.5, 12.5]  // Fallback Italia
  );
  
  // Calcola zoom in base alla vista
  // Vista Italia: zoom 6 per vedere tutta Italia
  // Vista HUB: zoom 16 per vedere i negozi
  // Vista Mercato: zoom 17 per vedere i posteggi
  const effectiveZoom = customZoom 
    ? customZoom  // Zoom personalizzato per navigazione regione/provincia
    : showItalyView 
      ? 6 
      : mode === 'hub' && hubCenterFixed 
        ? 16 
        : mode === 'mercato' && marketCenterFixed
          ? 19  // Zoom mercato (aumentato a 19)
          : zoom;
  
  // Rimosso stato locale ridondante che causava loop
  // L'animazione è gestita direttamente da MapCenterController tramite useAnimation

  // Ref per gestire la chiusura automatica dei popup
  const mapRef = React.useRef<L.Map | null>(null);

  // Effetto per chiudere i popup quando cambia la selezione (se diverso da quello corrente)
  useEffect(() => {
    if (mapRef.current && selectedStallNumber) {
      mapRef.current.closePopup();
    }
  }, [selectedStallNumber]);

  // Calcola bounds dinamici dal GeoJSON (area mercato o tutti i posteggi)
  const marketBounds = React.useMemo(() => {
    if (!mapData?.stalls_geojson?.features?.length) return null;
    
    // Cerca prima il feature "area" del mercato (ha i confini completi)
    const areaFeature = mapData.stalls_geojson.features.find(
      (f: any) => f.properties?.kind === 'area' && f.geometry?.type === 'Polygon'
    );
    
    let allCoords: [number, number][] = [];
    
    if (areaFeature && areaFeature.geometry.coordinates?.[0]) {
      // Usa le coordinate del poligono area
      allCoords = areaFeature.geometry.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
      console.log('[DEBUG] Bounds calcolati da area mercato, punti:', allCoords.length);
    } else {
      // Fallback: calcola bounds da tutti i posteggi
      mapData.stalls_geojson.features.forEach((feature: any) => {
        if (feature.geometry?.type === 'Polygon' && feature.geometry.coordinates?.[0]) {
          feature.geometry.coordinates[0].forEach((coord: number[]) => {
            allCoords.push([coord[1], coord[0]]);
          });
        }
      });
      console.log('[DEBUG] Bounds calcolati da posteggi, punti:', allCoords.length);
    }
    
    if (allCoords.length === 0) return null;
    
    // Crea LatLngBounds da tutte le coordinate
    const bounds = L.latLngBounds(allCoords);
    console.log('[DEBUG] Bounds mercato:', bounds.toBBoxString());
    return bounds;
  }, [mapData]);
  
  // Calcola bounds dinamici dall'area_geojson dell'HUB selezionato
  const hubBounds = React.useMemo(() => {
    if (!selectedHub?.area_geojson) return null;
    
    try {
      // Parse area_geojson se è una stringa
      const areaGeojson = typeof selectedHub.area_geojson === 'string' 
        ? JSON.parse(selectedHub.area_geojson) 
        : selectedHub.area_geojson;
      
      if (areaGeojson?.type !== 'Polygon' || !areaGeojson.coordinates?.[0]) return null;
      
      // Converti coordinate GeoJSON [lng, lat] in Leaflet [lat, lng]
      const allCoords: [number, number][] = areaGeojson.coordinates[0].map(
        (c: number[]) => [c[1], c[0]] as [number, number]
      );
      
      if (allCoords.length === 0) return null;
      
      // Crea LatLngBounds da tutte le coordinate
      const bounds = L.latLngBounds(allCoords);
      console.log('[DEBUG] Bounds HUB calcolati:', bounds.toBBoxString());
      return bounds;
    } catch (e) {
      console.error('[DEBUG] Errore parsing area_geojson HUB:', e);
      return null;
    }
  }, [selectedHub]);
  
  console.log('[DEBUG MarketMapComponent] RICEVUTO:', {
    refreshKey,
    stallsDataLength: stallsData.length,
    firstStall: stallsData[0],
    mapDataFeaturesCount: mapData?.stalls_geojson?.features?.length ?? 0,
    showItalyView
  });
  
  // Mappa stallsData per accesso rapido
  // Crea due chiavi: sia numero che stringa per gestire entrambi i casi
  const stallsByNumber = new Map<number | string, typeof stallsData[0]>();
  stallsData.forEach(s => {
    // Aggiungi sia come numero che come stringa
    const num = typeof s.number === 'string' ? parseInt(s.number, 10) : s.number;
    stallsByNumber.set(num, s);
    stallsByNumber.set(s.number, s);
  });
  
  // DEBUG: Log stallsData
  console.log('[DEBUG MarketMapComponent] stallsData length:', stallsData.length);
  console.log('[DEBUG MarketMapComponent] stallsData sample:', stallsData.slice(0, 5));
  console.log('[DEBUG MarketMapComponent] impresa_id check:', stallsData.filter(s => s.vendor_name).map(s => ({ number: s.number, vendor: s.vendor_name, impresa_id: s.impresa_id })));
  console.log('[DEBUG MarketMapComponent] stallsByNumber keys sample:', Array.from(stallsByNumber.keys()).slice(0, 10));
  
  // Funzione per determinare il colore in base allo stato
  // USA SOLO stallsData, IGNORA il GeoJSON statico!
  const getStallColor = (stallNumber: number): string => {
    const dbStall = stallsByNumber.get(stallNumber);
    const status = dbStall?.status || 'libero';
    console.log(`[DEBUG getStallColor] Posteggio ${stallNumber}: dbStall=${!!dbStall}, status=${status}`);
    return getStallMapFillColor(status);
  };
  
  return (
    <>
      {/* Style CSS per rimuovere sfondo bianco dai numeri */}
      <style id="dynamic-tooltip-style">{`
        .stall-number-tooltip.leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          color: white !important;
          font-size: 8px !important;
          font-weight: bold !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
          pointer-events: none !important;
        }
        .stall-number-tooltip.leaflet-tooltip-left:before,
        .stall-number-tooltip.leaflet-tooltip-right:before {
          display: none !important;
        }
      `}</style>
      
      <div style={{ height, width: '100%' }}>
        <MapContainer
          key={`map-${refreshKey}`}
          center={mapCenter}
          zoom={effectiveZoom}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          zoomDelta={0.25}
          zoomSnap={0.25}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="🗺️ Stradale">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={21}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="🛰️ Satellite">
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={21}
              />
            </LayersControl.BaseLayer>
            
            <LayersControl.BaseLayer name="🌙 Dark Mode">
              <TileLayer
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                maxZoom={21}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          {/* Componente per aggiornare font size dinamicamente con zoom */}
          <ZoomFontUpdater minZoom={18} baseFontSize={8} scaleFactor={1.5} />
          
          {/* Controller per centrare mappa programmaticamente (cambio vista Italia/Mercato/HUB) */}
          <MapCenterController 
            center={mapCenter} 
            zoom={effectiveZoom} 
            trigger={viewTrigger}
            bounds={mode === 'hub' ? (hubBounds || undefined) : (marketBounds || undefined)}
            isMarketView={!showItalyView}
          />
          
          {/* Controller per centrare su posteggio selezionato dalla lista */}
          <StallCenterController stallCenter={selectedStallCenter} />
          
          {/* Routing layer (opzionale) */}
          {routeConfig?.enabled && (
            <RouteLayer
              userLocation={routeConfig.userLocation}
              destination={routeConfig.destination}
              mode={routeConfig.mode}
            />
          )}

          {/* Marker rosso "M" al centro mercato (nascosto in modalità routing e in vista Italia) */}
          {/* Usa marketCenterFixed se disponibile, altrimenti fallback a mapData.center */}
          {!routeConfig?.enabled && !showItalyView && mapData && (() => {
            const fixedCenter = marketCenterFixed || (mapData.center ? [mapData.center.lat, mapData.center.lng] as [number, number] : null);
            if (!fixedCenter) return null;
            return (
              <Marker
                position={fixedCenter}
                icon={L.divIcon({
                  className: 'market-center-marker',
                  html: `<div style="
                    background: #ef4444;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: bold;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    border: 3px solid white;
                  ">M</div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold text-base mb-1">
                      📍 Centro Mercato
                    </div>
                    <div className="text-gray-600">
                      Lat: {fixedCenter[0].toFixed(6)}
                    </div>
                    <div className="text-gray-600">
                      Lng: {fixedCenter[1].toFixed(6)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })()}

          {/* Marker "M" per tutti i mercati (Vista Italia) */}
          {allMarkets.length > 0 && allMarkets.map((market) => {
            // Converti le coordinate da stringa a numero
            const marketLat = parseFloat(market.latitude) || 0;
            const marketLng = parseFloat(market.longitude) || 0;
            if (!marketLat || !marketLng) return null;
            return (
            <Marker
              key={`market-${market.id}`}
              position={[marketLat, marketLng]}
              icon={L.divIcon({
                className: 'market-center-marker',
                html: `<div style="
                  background: #ef4444;
                  color: white;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 18px;
                  font-weight: bold;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                  border: 3px solid white;
                  cursor: pointer;
                ">M</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })}
              eventHandlers={{
                click: (e) => {
                  // Se il popup è già aperto, il click lo chiude e attiva lo zoom (gestito da onMarketClick)
                  // Se è chiuso, il click apre il popup (comportamento default di Leaflet)
                  const marker = e.target;
                  if (marker.isPopupOpen()) {
                    marker.closePopup();
                    onMarketClick?.(market.id);
                  }
                }
              }}
            >
              <Popup className="market-popup" minWidth={280}>
                <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '280px' }}>
                  {/* Header Scuro */}
                  <div className="bg-[#ef4444] p-3 border-b border-red-800 flex justify-between items-center">
                    <div className="font-bold text-lg text-white flex items-center gap-2">
                      <span className="bg-white text-[#ef4444] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border border-red-800">M</span>
                      {market.name}
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3 text-sm">
                    {/* Comune */}
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Comune:</span>
                      <span className="font-medium text-white">{market.comune || 'Non specificato'}</span>
                    </div>
                    
                    {/* Giorno */}
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Giorno:</span>
                      <span className="font-medium text-white capitalize">{market.giorno || 'Settimanale'}</span>
                    </div>
                    
                    {/* Posteggi */}
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Posteggi Totali:</span>
                      <span className="font-bold text-[#14b8a6]">{market.posteggi_totali || '-'}</span>
                    </div>
                    
                    {/* Coordinate */}
                    <div className="bg-[#1e293b] p-2 rounded border border-gray-700 mt-2">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Coordinate GPS</div>
                      <div className="font-mono text-xs text-gray-300 flex justify-between">
                        <span>Lat: {marketLat.toFixed(6)}</span>
                        <span>Lng: {marketLng.toFixed(6)}</span>
                      </div>
                    </div>
                    
                    {/* CTA */}
                    <div className="pt-2 text-center text-xs text-gray-500 italic">
                      Clicca di nuovo per entrare nel mercato
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
          })}

          {/* ============ MARKER HUB (Vista Italia/Regione/Provincia) ============ */}
          {mode === 'hub' && allHubs.length > 0 && allHubs.map((hub) => {
            // Converti le coordinate da stringa a numero
            const hubLat = parseFloat(hub.lat || hub.latitude) || 0;
            const hubLng = parseFloat(hub.lng || hub.longitude) || 0;
            if (!hubLat || !hubLng) return null;
            
            // Determina colore in base al livello
            // Capoluogo: viola pieno (#9C27B0)
            // Provincia: viola chiaro (#BA68C8) 
            // Comune: viola pallido (#CE93D8)
            const getHubColor = (livello?: string) => {
              switch (livello) {
                case 'capoluogo': return '#9C27B0'; // Viola pieno
                case 'provincia': return '#BA68C8'; // Viola chiaro
                case 'comune': return '#CE93D8';    // Viola pallido
                default: return '#9C27B0';          // Default viola pieno
              }
            };
            
            // Determina dimensione in base al livello
            const getHubSize = (livello?: string) => {
              switch (livello) {
                case 'capoluogo': return 32;
                case 'provincia': return 28;
                case 'comune': return 24;
                default: return 32;
              }
            };
            
            const hubColor = getHubColor(hub.livello);
            const hubSize = getHubSize(hub.livello);
            const fontSize = hub.livello === 'capoluogo' ? 18 : hub.livello === 'provincia' ? 16 : 14;
            
            // Contorno diverso per tipo: urbano = bianco, prossimità = viola scuro
            const isProssimita = hub.tipo === 'prossimita';
            const borderColor = isProssimita ? '#6A1B9A' : 'white'; // Viola scuro per prossimità
            const borderWidth = isProssimita ? 3 : (hub.livello === 'capoluogo' ? 3 : 2);
            
            return (
            <Marker
              key={`hub-${hub.id}`}
              position={[hubLat, hubLng]}
              icon={L.divIcon({
                className: 'hub-center-marker',
                html: `<div style="
                  background: ${hubColor};
                  color: white;
                  width: ${hubSize}px;
                  height: ${hubSize}px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: ${fontSize}px;
                  font-weight: bold;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                  border: ${borderWidth}px solid ${borderColor};
                  cursor: pointer;
                  opacity: ${hub.livello === 'capoluogo' ? 1 : hub.livello === 'provincia' ? 0.9 : 0.8};
                ">H</div>`,
                iconSize: [hubSize, hubSize],
                iconAnchor: [hubSize/2, hubSize/2],
              })}
              eventHandlers={{
                click: (e) => {
                  const marker = e.target;
                  if (marker.isPopupOpen()) {
                    marker.closePopup();
                    onHubClick?.(hub.id);
                  }
                }
              }}
            >
              <Popup className="hub-popup" minWidth={280}>
                <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '280px' }}>
                  <div style={{ background: hubColor }} className="p-3 border-b border-purple-800 flex justify-between items-center">
                    <div className="font-bold text-lg text-white flex items-center gap-2">
                      <span className="bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border border-purple-800" style={{ color: hubColor }}>H</span>
                      {hub.name}
                    </div>
                    {hub.livello && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-white/20 text-white">
                        {hub.livello}
                      </span>
                    )}
                  </div>
                  
                  <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Città:</span>
                      <span className="font-medium text-white">{hub.city || 'Non specificato'}</span>
                    </div>
                    
                    {hub.provincia_sigla && (
                      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Provincia:</span>
                        <span className="font-medium text-white">{hub.provincia_sigla}</span>
                      </div>
                    )}
                    
                    {hub.tipo && (
                      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Tipo:</span>
                        <span className="font-medium text-white capitalize">{hub.tipo === 'urbano' ? 'Hub Urbano' : 'Hub Prossimità'}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Negozi:</span>
                      <span className="font-bold" style={{ color: hubColor }}>{hub.shops?.length || 0}</span>
                    </div>
                    
                    <div className="bg-[#1e293b] p-2 rounded border border-gray-700 mt-2">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Coordinate GPS</div>
                      <div className="font-mono text-xs text-gray-300 flex justify-between">
                        <span>Lat: {hubLat.toFixed(6)}</span>
                        <span>Lng: {hubLng.toFixed(6)}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 text-center text-xs text-gray-500 italic">
                      Clicca di nuovo per entrare nell'HUB
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
          })}

          {/* ============ NEGOZI HUB (Vista HUB) ============ */}
          {mode === 'hub' && selectedHub && selectedHub.shops && selectedHub.shops.map((shop) => {
            const shopColor = shop.status === 'active' ? '#10b981' : shop.status === 'closed' ? '#ef4444' : '#6b7280';
            // Converti le coordinate da stringa a numero
            const shopLat = parseFloat(shop.lat) || 0;
            const shopLng = parseFloat(shop.lng) || 0;
            if (!shopLat || !shopLng) return null;
            return (
              <Marker
                key={`shop-${shop.id}`}
                position={[shopLat, shopLng]}
                icon={L.divIcon({
                  className: 'shop-marker',
                  html: `<div style="
                    background: ${shopColor};
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    cursor: pointer;
                  ">${shop.letter || 'N'}</div>`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                })}
                eventHandlers={{
                  click: () => onShopClick?.(shop)
                }}
              >
                <Popup className="shop-popup" minWidth={280}>
                  <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '280px' }}>
                    {/* Header con colore distintivo viola/magenta per negozi HUB */}
                    <div style={{ background: '#9C27B0' }} className="p-3 border-b border-gray-700 flex justify-between items-center">
                      <div className="font-bold text-lg text-white flex items-center gap-2">
                        <span className="bg-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold" style={{ color: '#9C27B0' }}>{shop.letter}</span>
                        {shop.name}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                        shop.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                        shop.status === 'closed' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                        'bg-gray-900/50 text-gray-400 border border-gray-800'
                      }`}>
                        {shop.status === 'active' ? 'ATTIVO' : shop.status === 'closed' ? 'CHIUSO' : 'INATTIVO'}
                      </span>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {/* Tipo e Coordinate */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                          <div className="text-gray-400 mb-1">TIPO</div>
                          <div className="font-medium text-white capitalize">
                            {shop.category || 'Negozio HUB'}
                          </div>
                        </div>
                        <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                          <div className="text-gray-400 mb-1">COORDINATE</div>
                          <div className="font-medium text-white truncate" title={shop.lat && shop.lng ? `${Number(shop.lat).toFixed(5)}, ${Number(shop.lng).toFixed(5)}` : '-'}>
                            {shop.lat && shop.lng ? `${Number(shop.lat).toFixed(4)}, ${Number(shop.lng).toFixed(4)}` : '-'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Contatti */}
                      {(shop.contact_phone || shop.contact_email) && (
                        <div className="bg-[#1e293b] p-3 rounded border border-gray-700">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                            <span>📞 Contatti</span>
                          </div>
                          {shop.contact_phone && (
                            <div className="text-sm text-white mb-1">📱 {shop.contact_phone}</div>
                          )}
                          {shop.contact_email && (
                            <div className="text-sm text-white">✉️ {shop.contact_email}</div>
                          )}
                        </div>
                      )}
                      
                      {/* Descrizione */}
                      {shop.description && (
                        <div className="text-gray-300 text-xs italic bg-[#1e293b] p-2 rounded border border-gray-700">
                          {shop.description}
                        </div>
                      )}
                      
                      {/* Tasto Vetrina - sempre visibile per negozi HUB */}
                      <button 
                        onClick={() => {
                          if (shop.vetrina_url) {
                            window.open(shop.vetrina_url, '_blank');
                          } else if (shop.owner_id) {
                            // Naviga alla vetrina dell'impresa collegata (owner_id = impresa_id)
                            window.location.href = `/vetrine/${shop.owner_id}`;
                          } else {
                            // Fallback: cerca per nome
                            window.location.href = `/vetrine?q=${encodeURIComponent(shop.name || '')}`;
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-[#9C27B0] hover:bg-[#7B1FA2] text-white py-2.5 px-4 rounded transition-colors text-sm font-medium"
                      >
                        <span>🛍️</span>
                        <span>Visita Vetrina</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ============ POLIGONO AREA HUB ============ */}
          {/* Nasconde area durante animazione zoom per evitare macchia viola */}
          {mode === 'hub' && selectedHub && selectedHub.area_geojson && !isAnimating && (() => {
            try {
              const areaData = typeof selectedHub.area_geojson === 'string' 
                ? JSON.parse(selectedHub.area_geojson) 
                : selectedHub.area_geojson;
              
              if (areaData.type === 'Polygon' && areaData.coordinates) {
                const positions = areaData.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number]);
                return (
                  <Polygon
                    positions={positions}
                    pathOptions={{
                      color: '#9C27B0',
                      fillColor: '#9C27B0',
                      fillOpacity: 0.2,
                      weight: 3,
                      dashArray: '5, 10'
                    }}
                  />
                );
              }
            } catch (e) {
              console.error('[HubMarketMap] Error parsing area_geojson:', e);
            }
            return null;
          })()}

          {/* Piazzole (stalls) - solo se mapData esiste */}
          {mapData?.stalls_geojson?.features && (() => {
            console.log('[VERCEL DEBUG] MarketMapComponent - Rendering', mapData.stalls_geojson.features.length, 'stalls');
            return null;
          })()}
          {/* Layer Macchia Verde (Area Mercato) - Renderizza PRIMA dei posteggi */}
          {mapData?.stalls_geojson?.features && !showItalyView && mapData.stalls_geojson.features
            .filter(f => (f.properties?.kind === 'area' || f.properties?.type === 'mercato') && f.geometry?.type === 'Polygon')
            .map((feature, idx) => (
              <Polygon
                key={`area-${idx}`}
                positions={(feature.geometry.coordinates[0] as number[][]).map(c => [c[1], c[0]] as [number, number])}
                pathOptions={{
                  color: '#14b8a6',
                  fillColor: '#14b8a6',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '5, 10'
                }}
                interactive={false}
              />
            ))
          }

          {/* Renderizza posteggi SOLO quando NON siamo in vista Italia E NON durante animazione zoom */}
          {/* Questo previene le "macchie verdi" che appaiono durante la transizione */}
          {mapData?.stalls_geojson?.features && !showItalyView && !isAnimating && mapData.stalls_geojson.features.map((feature, idx) => {
            const props = feature.properties;
            
            // SKIP: Escludi solo i poligoni "area" del mercato (macchia verde)
            // Renderizza tutto ciò che ha un numero posteggio
            if (props.kind === 'area' || props.type === 'mercato') {
              return null;
            }
            
            // Se non ha numero, salta (non è un posteggio valido)
            if (!props.number) {
              return null;
            }
            
            if (idx === 0) {
              console.log('[VERCEL DEBUG] First feature:', {
                type: feature.geometry.type,
                properties: props,
                coordsLength: feature.geometry.coordinates?.[0]?.length
              });
            }
            
            // Converti coordinate Polygon in formato Leaflet [lat, lng][]
            let positions: [number, number][] = [];
            
            if (feature.geometry.type === 'Polygon') {
              const coords = feature.geometry.coordinates as [number, number][][];
              positions = coords[0].map(
                ([lng, lat]: [number, number]) => [lat, lng]
              );
            } else if (feature.geometry.type === 'Point') {
              // Fallback per Point: salta o gestisci diversamente
              return null;
            }
            
            const fillColor = getStallColor(props.number); // USA SOLO stallsData!
            // Confronto robusto (gestisce stringhe e numeri)
            const isSelected = String(selectedStallNumber) === String(props.number);
            
            // Recupera dati aggiornati dal database
            const dbStall = stallsByNumber.get(props.number);
            const displayStatus = dbStall?.status || 'libero'; // USA SOLO stallsData!
            
            // DEBUG: Log primi 3 posteggi
            if (idx < 3) {
              console.log(`[DEBUG] Stall ${props.number}:`, {
                dbStatus: dbStall?.status,
                propsStatus: props.status,
                finalStatus: dbStall?.status || props.status || 'libero',
                fillColor
              });
            }
            const displayVendor = dbStall?.vendor_name || props.vendor_name || '-';
            
            if (idx === 0) {
              console.log('[VERCEL DEBUG] First polygon positions:', positions.length, 'points');
              console.log('[VERCEL DEBUG] First polygon color:', fillColor);
            }
            
            // Colore magenta flash per posteggio selezionato (massima visibilità)
            const selectedColor = '#ff00ff'; // Magenta/Fucsia
            
            // Se selezionato, forza colori molto evidenti
            // FIX: Confronto stringhe per supportare posteggi alfanumerici (es. "41 A")
            // Normalizza rimuovendo spazi e convertendo a stringa
            const normalizeStall = (val: any) => String(val || '').replace(/\s+/g, '').toUpperCase();
            const isTrulySelected = normalizeStall(selectedStallNumber) === normalizeStall(props.number);
            const actualFillColor = isTrulySelected ? selectedColor : fillColor;
            // BORDO DELLO STESSO COLORE se selezionato, per mantenere dimensioni
            const actualBorderColor = isTrulySelected ? selectedColor : fillColor; 
            
            return (
              <React.Fragment key={`stall-${props.number}-${dbStall?.status || props.status}`}>
                <Polygon
                  positions={positions}
                  className={isTrulySelected ? 'selected-stall-glow' : ''}
                  pathOptions={{
                    color: actualBorderColor,
                    fillColor: actualFillColor,
                    fillOpacity: isTrulySelected ? 0.9 : 0.7,
                    weight: isTrulySelected ? 4 : 2, // Peso 4 per bordo visibile ma integrato
                    // Forza dashArray nullo se selezionato
                    dashArray: isTrulySelected ? undefined : undefined 
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onStallClick) {
                        onStallClick(props.number);
                      }
                    },
                  }}
                >
                  {/* Numero posteggio senza sfondo bianco */}
                  <Tooltip 
                    permanent 
                    direction="center" 
                    className="stall-number-tooltip"
                    opacity={1}
                  >
                    {props.number}
                  </Tooltip>
                  
                  {/* Popup informativo */}
                  <Popup className="stall-popup" minWidth={280}>
                    {isSpuntaMode && displayStatus === 'riservato' ? (
                      /* Popup Spunta per posteggi riservati - DARK MODE */
                      <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '280px' }}>
                        {/* Header Scuro */}
                        <div className="bg-[#1e293b] p-3 border-b border-gray-700 flex justify-between items-center">
                          <div className="font-bold text-lg text-white">
                            ✓ Spunta #{props.number}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-orange-900/50 text-orange-400 border border-orange-800">
                            {getStallStatusLabel(displayStatus)}
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-4">
                          {/* Tipo */}
                          {dbStall?.type && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Tipo:</span>
                              <span className="text-gray-200 capitalize font-medium">{dbStall.type}</span>
                            </div>
                          )}
                          
                          {/* Dimensioni (Priorità DB, poi Geometria) */}
                          {(() => {
                            // Funzione di formattazione intelligente
                            const smartFormat = (val: number) => {
                              if (isNaN(val)) return '-';
                              if (Math.abs(val - Math.round(val)) < 0.05) {
                                return Math.round(val).toString();
                              }
                              return val.toFixed(2);
                            };

                            let widthStr = '-';
                            let lengthStr = '-';
                            let areaStr = '-';
                            let isEstimated = true;

                            // 1. Prova a parsare le dimensioni dal DB (priorità assoluta)
                            // Controlla sia props.dimensions (dal GeoJSON) che dbStall.dimensions (dal DB aggiornato)
                            const dimensionsSource = dbStall?.dimensions || props.dimensions;

                            if (dimensionsSource) {
                              // Regex migliorata: supporta virgole, punti, spazi extra e formati vari (es. "4,00 x 3,00", "4x3", "4.00 X 3.00")
                              // Sostituisce virgole con punti prima del parsing
                              const normalized = dimensionsSource.replace(/,/g, '.');
                              const match = normalized.match(/([\d.]+)\s*m?\s*[x×*]\s*([\d.]+)\s*m?/i);
                              
                              if (match) {
                                const w = parseFloat(match[1]);
                                const l = parseFloat(match[2]);
                                widthStr = smartFormat(w);
                                lengthStr = smartFormat(l);
                                areaStr = smartFormat(w * l);
                                isEstimated = false; // Dimensioni ufficiali da DB
                              }
                            }

                            // 2. Se mancano nel DB, usa calcolo geometrico
                            if (isEstimated) {
                              const dims = calculatePolygonDimensions(positions);
                              widthStr = dims.width.toFixed(2);
                              lengthStr = dims.height.toFixed(2);
                              areaStr = dims.area.toFixed(2);
                            }
                            
                            return (
                              <div className="bg-[#1e293b] p-3 rounded border border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-semibold text-gray-300">📏 Dimensioni</span>
                                  {isEstimated && <span className="text-[10px] bg-gray-700 text-gray-400 px-1 rounded">STIMATE</span>}
                                </div>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Larghezza:</span>
                                    <span className="font-medium text-gray-200">{widthStr} m</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Lunghezza:</span>
                                    <span className="font-medium text-gray-200">{lengthStr} m</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                                    <span className="text-gray-400 font-medium">Superficie:</span>
                                    <span className="font-bold text-white">{areaStr} m²</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Intestatario (se presente) */}
                          {displayVendor !== '-' && (
                            <div className="bg-[#1e293b] p-3 rounded border border-gray-700">
                              <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">IMPRESA INTESTATARIA</div>
                              <div className="font-medium text-white flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-400 text-xs border border-indigo-800">
                                  {displayVendor.charAt(0)}
                                </div>
                                <span className="truncate">{displayVendor}</span>
                              </div>
                            </div>
                          )}

                          {/* Pulsante Visita Vetrina (se presente) */}
                          {(dbStall?.vendor_name || props.vendor_name) && (
                            <Link 
                              href={(() => {
                                const companyId = dbStall?.impresa_id || props.impresa_id || props.company_id;
                                if (!companyId) {
                                  const name = dbStall?.vendor_name || props.vendor_name;
                                  if (name) return `/vetrine?q=${encodeURIComponent(name)}`;
                                  return '/vetrine';
                                }
                                return `/vetrine/${companyId}`;
                              })()}
                              className="flex items-center justify-center gap-2 w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium py-2.5 px-4 rounded transition-all hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] text-sm cursor-pointer"
                            >
                              <span>🏪</span>
                              <span>Visita Vetrina</span>
                            </Link>
                          )}

                          {/* Canone di occupazione */}
                          <div className="bg-[#1e3a8a]/20 p-3 rounded border border-[#1e3a8a]/50">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-blue-400">💶 Canone:</span>
                              <div className="flex items-center bg-[#0b1220] px-2 py-1 rounded border border-blue-500/30">
                                <span className="text-gray-500 mr-1">€</span>
                                <input 
                                  type="text" 
                                  defaultValue="15,00"
                                  className="w-16 text-right font-bold text-blue-400 outline-none bg-transparent"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Pulsante Conferma Assegnazione */}
                          <button
                            className="w-full bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg shadow-orange-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          onClick={async () => {
                            if (!onConfirmAssignment) {
                              alert('Funzione "Conferma Assegnazione" non configurata!');
                              return;
                            }
                            
                            if (!dbStall?.id) {
                              alert('Impossibile trovare l\'ID del posteggio!');
                              return;
                            }
                            
                            try {
                              await onConfirmAssignment(dbStall.id);
                            } catch (error) {
                              console.error('[ERROR] Conferma assegnazione:', error);
                              alert('Errore durante la conferma assegnazione!');
                            }
                          }}
                          disabled={!onConfirmAssignment || !dbStall?.id}
                        >
                          ✓ Conferma Assegnazione
                        </button>
                      </div>
                    </div>
                    ) : (
                      /* Popup normale */
                      <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '280px' }}>
                        {/* Header Scuro */}
                        <div className="bg-[#1e293b] p-3 border-b border-gray-700 flex justify-between items-center">
                          <div className="font-bold text-lg text-white">
                            Posteggio #{props.number}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                            displayStatus === 'libero' ? 'bg-green-900/50 text-green-400 border border-green-800' :
                            displayStatus === 'occupato' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                            'bg-orange-900/50 text-orange-400 border border-orange-800'
                          }`}>
                            {getStallStatusLabel(displayStatus)}
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-4">
                          {/* Tipo e Coordinate */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                              <div className="text-gray-400 mb-1">TIPO</div>
                              <div className="font-medium text-white capitalize">
                                {dbStall?.type || 'Standard'}
                              </div>
                            </div>
                            <div className="bg-[#1e293b] p-2 rounded border border-gray-700">
                              <div className="text-gray-400 mb-1">COORDINATE</div>
                              <div className="font-medium text-white truncate" title={`${positions[0]?.[0].toFixed(5)}, ${positions[0]?.[1].toFixed(5)}`}>
                                {positions[0] ? `${positions[0][0].toFixed(4)}, ${positions[0][1].toFixed(4)}` : '-'}
                              </div>
                            </div>
                          </div>

                          {/* Dimensioni Ricche */}
                          {(() => {
                            // Funzione di formattazione intelligente
                            const smartFormat = (val: number) => {
                              if (isNaN(val)) return '-';
                              // Se è molto vicino a un intero (es. 3.999 o 4.001), arrotonda all'intero
                              if (Math.abs(val - Math.round(val)) < 0.05) {
                                return Math.round(val).toString();
                              }
                              // Altrimenti usa 2 decimali
                              return val.toFixed(2);
                            };

                            let width = '-';
                            let length = '-';
                            let area = '-';
                            let hasDimensions = false;
                            let isFromDB = false;

                            // 1. PRIORITÀ: Usa width e depth dal DB (campi separati)
                            const dbWidth = dbStall?.width ? parseFloat(dbStall.width) : null;
                            const dbDepth = dbStall?.depth ? parseFloat(dbStall.depth) : null;
                            
                            if (dbWidth && dbDepth && !isNaN(dbWidth) && !isNaN(dbDepth)) {
                              width = smartFormat(dbWidth);
                              length = smartFormat(dbDepth);
                              area = smartFormat(dbWidth * dbDepth);
                              hasDimensions = true;
                              isFromDB = true;
                            }

                            // 2. Fallback: Prova a parsare le dimensioni dal campo dimensions (formato "4x7.60")
                            if (!hasDimensions) {
                              const dimensionsSource = dbStall?.dimensions || props.dimensions;
                              
                              if (dimensionsSource) {
                                const normalized = dimensionsSource.replace(/,/g, '.');
                                const match = normalized.match(/([\d.]+)\s*m?\s*[x×*]\s*([\d.]+)\s*m?/i);
                                
                                if (match) {
                                  const w = parseFloat(match[1]);
                                  const l = parseFloat(match[2]);
                                  width = smartFormat(w);
                                  length = smartFormat(l);
                                  area = smartFormat(w * l);
                                  hasDimensions = true;
                                  isFromDB = true;
                                }
                              }
                            }

                            // 3. Ultimo fallback: Calcolo geometrico dal poligono GeoJSON
                            if (!hasDimensions && positions.length > 0) {
                              try {
                                const lats = positions.map(p => p[0]);
                                const lngs = positions.map(p => p[1]);
                                const minLat = Math.min(...lats);
                                const maxLat = Math.max(...lats);
                                const minLng = Math.min(...lngs);
                                const maxLng = Math.max(...lngs);

                                const latDiff = maxLat - minLat;
                                const lngDiff = maxLng - minLng;
                                const latMeters = latDiff * 111320;
                                const lngMeters = lngDiff * 40075000 * Math.cos(minLat * Math.PI / 180) / 360;

                                const w = Math.min(latMeters, lngMeters);
                                const l = Math.max(latMeters, lngMeters);
                                
                                width = smartFormat(w);
                                length = smartFormat(l);
                                area = smartFormat(w * l);
                                hasDimensions = true;
                              } catch (e) {
                                console.warn('Errore calcolo dimensioni geometriche:', e);
                              }
                            }

                            if (!hasDimensions) return null;
                            
                            return (
                              <div className="bg-[#1e293b] p-3 rounded border border-gray-700">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                  <span>📏 Dimensioni {isFromDB ? '' : '(Stimate)'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[10px] text-gray-500">LARGHEZZA</div>
                                    <div className="text-sm font-medium text-white">{width} m</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-gray-500">LUNGHEZZA</div>
                                    <div className="text-sm font-medium text-white">{length} m</div>
                                  </div>
                                  <div className="col-span-2 border-t border-gray-700 pt-2 mt-1 flex justify-between items-center">
                                    <div className="text-[10px] text-gray-500">SUPERFICIE TOTALE</div>
                                    <div className="text-sm font-bold text-[#14b8a6]">{area} m²</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {/* Intestatario */}
                          {displayVendor !== '-' && (
                            <div className="bg-[#1e293b] p-3 rounded border border-gray-700">
                              <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">IMPRESA INTESTATARIA</div>
                              <div className="font-medium text-white flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-900/50 flex items-center justify-center text-indigo-400 text-xs border border-indigo-800">
                                  {displayVendor.charAt(0)}
                                </div>
                                <span className="truncate">{displayVendor}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Pulsante Visita Vetrina */}
                          {(dbStall?.vendor_name || props.vendor_name) && (
                            <Link 
                              href={(() => {
                                // Logica robusta per trovare l'ID impresa
                                // 1. Cerca in dbStall (dati live)
                                // 2. Cerca in props (dati GeoJSON)
                                const companyId = dbStall?.impresa_id || props.impresa_id || props.company_id;
                                
                                if (!companyId) {
                                  console.warn(`[DEBUG] Impresa ID mancante per posteggio ${props.number}`, { dbStall, props });
                                  // Fallback alla ricerca per nome se manca l'ID (meglio di niente)
                                  const name = dbStall?.vendor_name || props.vendor_name;
                                  if (name) return `/vetrine?q=${encodeURIComponent(name)}`;
                                  return '/vetrine';
                                }
                                return `/vetrine/${companyId}`;
                              })()}
                              className="flex items-center justify-center gap-2 w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium py-2.5 px-4 rounded transition-all hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] text-sm cursor-pointer"
                            >
                              <span>🏪</span>
                              <span>Visita Vetrina</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </Popup>
                </Polygon>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}
