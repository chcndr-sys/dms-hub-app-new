import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl, Tooltip, useMap } from 'react-leaflet';
import { ZoomFontUpdater } from './ZoomFontUpdater';
import { RouteLayer } from './RouteLayer';
import { getStallMapFillColor, getStallStatusLabel } from '@/lib/stallStatus';
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

interface MarketMapComponentProps {
  mapData: MapData;
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
  }>;
  refreshKey?: number; // Key per forzare re-mount completo della mappa
  isSpuntaMode?: boolean; // Modalità spunta per test dimensioni
  onConfirmAssignment?: (stallId: number) => Promise<void>; // Callback per confermare assegnazione
  routeConfig?: { // Configurazione routing (opzionale)
    enabled: boolean;
    userLocation: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: 'walking' | 'cycling' | 'driving';
  };
  // Props per Vista Italia (Gemello Digitale)
  allMarkets?: Array<{ id: number; name: string; latitude: number; longitude: number }>;
  onMarketClick?: (marketId: number) => void;
  showItalyView?: boolean;
  viewTrigger?: number; // Trigger per forzare flyTo quando cambia vista
  marketCenterFixed?: [number, number]; // Centro fisso del mercato per marker M (non si sposta con selezione posteggio)
  selectedStallCenter?: [number, number]; // Centro del posteggio selezionato per pan mappa
}

// Controller per centrare la mappa programmaticamente
interface MapControllerProps {
  center: [number, number];
  zoom?: number;
  trigger?: number;
  bounds?: L.LatLngBoundsExpression; // Bounds per fitBounds dinamico
  isMarketView?: boolean; // true = vista mercato, false = vista Italia
}

function MapCenterController({ center, zoom, trigger, bounds, isMarketView }: MapControllerProps) {
  const map = useMap();
  const lastTriggerRef = React.useRef<number | undefined>(undefined);
  const isAnimatingRef = React.useRef(false);
  const { setAnimating } = useAnimation(); // Usa direttamente il context qui
  
  useEffect(() => {
    // Esegui flyTo/fitBounds solo quando trigger cambia (e non è il primo mount)
    if (lastTriggerRef.current !== undefined && 
        trigger !== lastTriggerRef.current && 
        !isAnimatingRef.current) {
      
      isAnimatingRef.current = true;
      setAnimating(true); // Notifica inizio animazione
      
      if (isMarketView && bounds) {
        // Vista Mercato: usa fitBounds con i corner del mercato
        console.log('[MapCenterController] Avvio flyToBounds verso bounds mercato');
        // Calcola il livello di zoom ottimale per i bounds con padding minimo
        const targetZoom = map.getBoundsZoom(bounds, false, [10, 10]);
        // Aggiunge mezzo scatto di zoom per avvicinare Modena senza rompere Grosseto
        const forcedZoom = Math.min(targetZoom + 0.5, 19);
        
        console.log('[MapCenterController] Zoom calcolato:', targetZoom, 'Zoom forzato:', forcedZoom);

        // Usa flyTo al centro dei bounds con lo zoom forzato
        // Calcola la distanza di zoom per decidere la durata
        const currentZoom = map.getZoom();
        const zoomDiff = Math.abs(forcedZoom - currentZoom);
        
        // Se la differenza di zoom è grande (es. da Italia a Mercato), usa animazione lenta (6s)
        // Se è piccola (es. reset da posteggio), usa animazione veloce (1.5s)
        const dynamicDuration = zoomDiff > 4 ? 6 : 1.5;
        
        console.log('[MapCenterController] Zoom diff:', zoomDiff, 'Duration:', dynamicDuration);

        map.flyTo(bounds.getCenter(), forcedZoom, {
          duration: dynamicDuration,
          easeLinearity: 0.25
        });
      } else if (center) {
        // Vista Italia: usa flyTo con centro e zoom fisso
        console.log('[MapCenterController] Avvio flyTo verso Italia:', center, 'zoom:', zoom);
        
        // Anche per tornare all'Italia, se siamo vicini (mercato) ci mettiamo 6s, se siamo già lontani meno
        const currentZoom = map.getZoom();
        const targetZoom = zoom || 6;
        const zoomDiff = Math.abs(targetZoom - currentZoom);
        const dynamicDuration = zoomDiff > 4 ? 6 : 2;

        map.flyTo(center, targetZoom, {
          duration: dynamicDuration,
          easeLinearity: 0.25
        });
      }
      
      // Listener per quando l'animazione finisce
      const onMoveEnd = () => {
        console.log('[MapCenterController] Animazione completata, mappa stabile');
        isAnimatingRef.current = false;
        setAnimating(false); // Notifica fine animazione
        map.off('moveend', onMoveEnd);
      };
      
      // Aspetta un po' prima di aggiungere il listener (per evitare trigger immediato)
      setTimeout(() => {
        map.on('moveend', onMoveEnd);
      }, 100);
      
      // Fallback timeout nel caso moveend non si triggeri (aumentato a 7s per coprire animazione lunga)
      setTimeout(() => {
        if (isAnimatingRef.current) {
          isAnimatingRef.current = false;
          setAnimating(false); // Notifica fine animazione (fallback)
          map.off('moveend', onMoveEnd);
        }
      }, 7000);
    }
    
    // Aggiorna sempre il ref del trigger
    lastTriggerRef.current = trigger;
  }, [center, zoom, trigger, bounds, isMarketView, map, setAnimating]);
  
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
export function MarketMapComponent({
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
  selectedStallCenter
}: MarketMapComponentProps) {
  
  // Se showItalyView è true e non c'è un center specifico, usa coordinate Italia
  // Se mapData è null (vista Italia), usa coordinate Italia come fallback
  const mapCenter: [number, number] = center || (showItalyView || !mapData ? [42.5, 12.5] : [mapData.center.lat, mapData.center.lng]);
  
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
          zoom={zoom}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          zoomDelta={0.5}
          zoomSnap={0.5}
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
          
          {/* Controller per centrare mappa programmaticamente (cambio vista Italia/Mercato) */}
          <MapCenterController 
            center={mapCenter} 
            zoom={zoom} 
            trigger={viewTrigger}
            bounds={marketBounds || undefined}
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
          {allMarkets.length > 0 && allMarkets.map((market) => (
            <Marker
              key={`market-${market.id}`}
              position={[market.latitude, market.longitude]}
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
                click: () => onMarketClick?.(market.id)
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-base mb-1">📍 {market.name}</div>
                  <div className="text-gray-600">Lat: {market.latitude.toFixed(6)}</div>
                  <div className="text-gray-600">Lng: {market.longitude.toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Piazzole (stalls) - solo se mapData esiste */}
          {mapData && (() => {
            console.log('[VERCEL DEBUG] MarketMapComponent - Rendering', mapData.stalls_geojson.features.length, 'stalls');
            return null;
          })()}
          {/* Layer Macchia Verde (Area Mercato) - Renderizza PRIMA dei posteggi */}
          {mapData && !showItalyView && mapData.stalls_geojson.features
            .filter(f => (f.properties?.kind === 'area' || f.properties?.type === 'mercato') && f.geometry.type === 'Polygon')
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

          {/* Renderizza posteggi SOLO quando NON siamo in vista Italia */}
          {mapData && !showItalyView && mapData.stalls_geojson.features.map((feature, idx) => {
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
                      /* Popup Spunta per posteggi riservati */
                      <div className="p-3">
                        <div className="font-bold text-lg mb-3 text-[#0b1220] border-b border-gray-200 pb-2">
                          ✓ Spunta Posteggio #{props.number}
                        </div>
                        
                        {/* Stato */}
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Stato:</span>
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                            {getStallStatusLabel(displayStatus)}
                          </span>
                        </div>
                        
                        {/* Tipo */}
                        {dbStall?.type && (
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-gray-600 font-medium">Tipo:</span>
                            <span className="text-gray-800 capitalize">{dbStall.type}</span>
                          </div>
                        )}
                        
                        {/* Dimensioni dettagliate */}
                        {props.dimensions && (() => {
                          // Supporta sia 'x' che '×'
                          const match = props.dimensions.match(/([\d.]+)\s*m?\s*[x×]\s*([\d.]+)\s*m?/i);
                          const width = match ? parseFloat(match[1]).toFixed(2) : '-';
                          const length = match ? parseFloat(match[2]).toFixed(2) : '-';
                          
                          return (
                            <div className="mb-3 bg-gray-50 p-3 rounded border border-gray-200">
                              <div className="text-sm font-semibold text-gray-700 mb-2">📏 Dimensioni:</div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Larghezza:</span>
                                  <span className="font-medium text-gray-800">{width} m</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Lunghezza:</span>
                                  <span className="font-medium text-gray-800">{length} m</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-300 pt-1 mt-1">
                                  <span className="text-gray-700 font-medium">Metratura:</span>
                                  <span className="font-bold text-gray-900">{area} m²</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        
                        {/* Canone di occupazione */}
                        <div className="mb-3 bg-blue-50 p-3 rounded border border-blue-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-blue-700">💶 Canone:</span>
                            <span className="text-lg font-bold text-blue-900">€ 15,00</span>
                          </div>
                        </div>
                        
                        {/* Pulsante Conferma Assegnazione */}
                        <button
                          className="w-full bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                            // 1. Prova a parsare le dimensioni dal DB
                            if (props.dimensions) {
                              const match = props.dimensions.match(/([\d.]+)\s*m?\s*[x×]\s*([\d.]+)\s*m?/i);
                              if (match) {
                                const w = parseFloat(match[1]);
                                const l = parseFloat(match[2]);
                                width = smartFormat(w);
                                length = smartFormat(l);
                                area = smartFormat(w * l);
                                hasDimensions = true;
                              }
                            }

                            // 2. Fallback: Calcolo geometrico se mancano i dati DB
                            if (!hasDimensions && positions.length > 0) {
                              try {
                                // Calcola la bounding box del poligono
                                const lats = positions.map(p => p[0]);
                                const lngs = positions.map(p => p[1]);
                                const minLat = Math.min(...lats);
                                const maxLat = Math.max(...lats);
                                const minLng = Math.min(...lngs);
                                const maxLng = Math.max(...lngs);

                                // Converti gradi in metri (approssimazione locale)
                                // 1 grado lat ~= 111km, 1 grado lng ~= 111km * cos(lat)
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
                                  <span>📏 Dimensioni {props.dimensions ? '' : '(Stimate)'}</span>
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
                          {dbStall?.vendor_name && (
                            <a 
                              href={(() => {
                                // DEBUG: Log per capire perché non trova l'ID
                                if (!dbStall?.impresa_id) {
                                  console.warn(`[DEBUG] Impresa ID mancante per posteggio ${props.number}`, dbStall);
                                }
                                return dbStall?.impresa_id ? `/vetrine/${dbStall.impresa_id}` : '/vetrine';
                              })()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium py-2.5 px-4 rounded transition-all hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] text-sm"
                            >
                              <span>🏪</span>
                              <span>Visita Vetrina</span>
                            </a>
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
