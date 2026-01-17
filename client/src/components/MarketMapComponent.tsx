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
  isOccupaMode?: boolean; // Modalità occupa (click su posteggio libero -> occupato)
  isLiberaMode?: boolean; // Modalità libera (click su posteggio occupato -> libero)
  onConfirmAssignment?: (stallId: number) => Promise<void>; // Callback per confermare assegnazione (spunta)
  onOccupaStall?: (stallId: number) => Promise<void>; // Callback per occupare posteggio
  onLiberaStall?: (stallId: number) => Promise<void>; // Callback per liberare posteggio
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
  bounds?: L.LatLngBoundsExpression;
  isMarketView?: boolean;
}

function MapCenterController(props: MapControllerProps) {
  const map = useMap();
  
  // Forza invalidateSize quando cambia il trigger (es. cambio tab o vista)
  useEffect(() => {
    if (props.trigger !== undefined) {
      console.log('[MapCenterController] Forzando invalidateSize per trigger:', props.trigger);
      // Invalidate size immediato e uno ritardato per sicurezza
      map.invalidateSize();
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [props.trigger, map]);

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
  isOccupaMode = false,
  isLiberaMode = false,
  onConfirmAssignment,
  onOccupaStall,
  onLiberaStall,
  routeConfig,
  // Props per Vista Italia (Gemello Digitale)
  allMarkets = [],
  onMarketClick,
  showItalyView = false,
  viewTrigger = 0,
  marketCenterFixed,
  selectedStallCenter
}: MarketMapComponentProps) {
  
  // Ottieni lo stato di animazione dal context per nascondere poligoni durante zoom
  const { isAnimating } = useAnimation();
  
  // Se showItalyView è true e non c'è un center specifico, usa coordinate Italia
  // Se mapData è null (vista Italia), usa coordinate Italia come fallback
  const mapCenter: [number, number] = center || (showItalyView || !mapData ? [42.5, 12.5] : [mapData.center.lat, mapData.center.lng]);
  
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
        .leaflet-tooltip-pane .stall-number-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: white;
          font-weight: bold;
          text-shadow: 1px 1px 2px black;
          pointer-events: none;
          white-space: nowrap;
        }
        .leaflet-tooltip-pane .stall-number-tooltip::before {
          display: none !important;
        }
      `}</style>

      <div style={{ height, width: '100%', position: 'relative' }}>
        <MapContainer
          center={mapCenter}
          zoom={showItalyView ? 6 : zoom}
          style={{ height: '100%', width: '100%', background: '#0b1220' }}
          zoomSnap={0.25}
          zoomDelta={0.25}
          ref={mapRef}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Strade (OpenStreetMap)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={21}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite (Esri)">
              <TileLayer
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="CartoDB Dark">
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
            zoom={showItalyView ? 6 : zoom} 
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
              <Marker position={fixedCenter}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-lg">Mercato</h3>
                    <p className="text-sm text-gray-600">Centro del mercato</p>
                  </div>
                </Popup>
              </Marker>
            );
          })()}

          {/* Marker per tutti i mercati (solo in vista Italia) */}
          {showItalyView && allMarkets.map(m => (
            <Marker 
              key={m.id} 
              position={[m.latitude, m.longitude]}
              eventHandlers={{
                click: () => onMarketClick?.(m.id)
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -20]}>
                {m.name}
              </Tooltip>
            </Marker>
          ))}

          {/* Poligoni dei posteggi (nascosti durante animazione zoom per performance) */}
          {!isAnimating && !showItalyView && mapData?.stalls_geojson?.features.map((feature, idx) => {
            if (feature.geometry.type !== 'Polygon') return null;
            
            const stallNumber = feature.properties.number;
            const dbStall = stallsByNumber.get(stallNumber);
            const isSelected = selectedStallNumber === stallNumber;
            
            // Colore dinamico basato sullo stato nel DB
            const fillColor = getStallColor(stallNumber);
            
            // Calcola dimensioni reali se disponibili
            const dimensions = feature.properties.dimensions || calculatePolygonDimensions(feature.geometry.coordinates[0]);
            
            return (
              <Polygon
                key={`${stallNumber}-${idx}`}
                positions={feature.geometry.coordinates[0].map((c: any) => [c[1], c[0]])}
                pathOptions={{
                  fillColor: fillColor,
                  fillOpacity: isSelected ? 0.8 : 0.5,
                  color: isSelected ? '#ffffff' : '#333',
                  weight: isSelected ? 3 : 1,
                }}
                eventHandlers={{
                  click: () => onStallClick?.(stallNumber),
                }}
              >
                <Tooltip 
                  permanent 
                  direction="center" 
                  className="stall-number-tooltip"
                >
                  {stallNumber}
                </Tooltip>
                <Popup>
                  <div className="p-3 min-w-[200px] bg-[#0b1220] text-white border border-[#14b8a6]/30 rounded-lg shadow-xl">
                    <div className="flex justify-between items-start mb-2 border-b border-[#14b8a6]/20 pb-2">
                      <h3 className="font-bold text-xl text-[#14b8a6]">Posteggio {stallNumber}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        dbStall?.status === 'occupied' ? 'bg-red-500/20 text-red-400' :
                        dbStall?.status === 'reserved' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {getStallStatusLabel(dbStall?.status || 'libero')}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Dimensioni:</span>
                        <span className="font-mono">{dimensions}</span>
                      </div>
                      
                      {dbStall?.vendor_name && (
                        <div className="mt-2 pt-2 border-t border-[#14b8a6]/10">
                          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Assegnatario</div>
                          <div className="font-bold text-[#14b8a6]">{dbStall.vendor_name}</div>
                          {dbStall.impresa_id && (
                            <Link href={`/dashboard/imprese/${dbStall.impresa_id}`}>
                              <a className="text-[10px] text-blue-400 hover:underline mt-1 block">Vedi Anagrafica Impresa</a>
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Azioni rapide in base alla modalità */}
                      <div className="mt-4 pt-3 border-t border-[#14b8a6]/20 flex flex-col gap-2">
                        {isOccupaMode && dbStall?.status === 'free' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onOccupaStall?.(dbStall.id);
                            }}
                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            ✅ Occupa Ora
                          </button>
                        )}
                        
                        {isLiberaMode && dbStall?.status === 'occupied' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onLiberaStall?.(dbStall.id);
                            }}
                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            🚮 Libera Posteggio
                          </button>
                        )}

                        {isSpuntaMode && dbStall?.status === 'reserved' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirmAssignment?.(dbStall.id);
                            }}
                            className="w-full py-2 bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded font-bold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            ✓ Conferma Spunta
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}
