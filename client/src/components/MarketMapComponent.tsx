import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl, Tooltip, useMap } from 'react-leaflet';
import { ZoomFontUpdater } from './ZoomFontUpdater';
import { RouteLayer } from './RouteLayer';
import { getStallMapFillColor, getStallStatusLabel } from '@/lib/stallStatus';
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
    status?: string;
    kind?: string;
    vendor_name?: string;
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
  
  useEffect(() => {
    // Esegui flyTo/fitBounds solo quando trigger cambia (e non è il primo mount)
    if (lastTriggerRef.current !== undefined && 
        trigger !== lastTriggerRef.current && 
        !isAnimatingRef.current) {
      
      isAnimatingRef.current = true;
      
      if (isMarketView && bounds) {
        // Vista Mercato: usa fitBounds con i corner del mercato
        console.log('[MapCenterController] Avvio flyToBounds verso bounds mercato');
        map.flyToBounds(bounds, {
          duration: 6,
          easeLinearity: 0.25,
          padding: [30, 30], // Padding per non tagliare i bordi
          maxZoom: 19 // Limite massimo zoom
        });
      } else if (center) {
        // Vista Italia: usa flyTo con centro e zoom fisso
        console.log('[MapCenterController] Avvio flyTo verso Italia:', center, 'zoom:', zoom);
        map.flyTo(center, zoom || 6, {
          duration: 6,
          easeLinearity: 0.25
        });
      }
      
      // Listener per quando l'animazione finisce
      const onMoveEnd = () => {
        console.log('[MapCenterController] Animazione completata, mappa stabile');
        isAnimatingRef.current = false;
        map.off('moveend', onMoveEnd);
      };
      
      // Aspetta un po' prima di aggiungere il listener (per evitare trigger immediato)
      setTimeout(() => {
        map.on('moveend', onMoveEnd);
      }, 100);
      
      // Fallback timeout nel caso moveend non si triggeri
      setTimeout(() => {
        isAnimatingRef.current = false;
        map.off('moveend', onMoveEnd);
      }, 7000);
    }
    
    // Aggiorna sempre il ref del trigger
    lastTriggerRef.current = trigger;
  }, [center, zoom, trigger, bounds, isMarketView, map]);
  
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
  viewTrigger = 0
}: MarketMapComponentProps) {
  
  // Se showItalyView è true e non c'è un center specifico, usa coordinate Italia
  // Se mapData è null (vista Italia), usa coordinate Italia come fallback
  const mapCenter: [number, number] = center || (showItalyView || !mapData ? [42.5, 12.5] : [mapData.center.lat, mapData.center.lng]);
  
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
          
          {/* Controller per centrare mappa programmaticamente */}
          <MapCenterController 
            center={mapCenter} 
            zoom={zoom} 
            trigger={viewTrigger}
            bounds={marketBounds || undefined}
            isMarketView={!showItalyView}
          />
          
          {/* Routing layer (opzionale) */}
          {routeConfig?.enabled && (
            <RouteLayer
              userLocation={routeConfig.userLocation}
              destination={routeConfig.destination}
              mode={routeConfig.mode}
            />
          )}

          {/* Marker rosso "M" al centro mercato (nascosto in modalità routing e in vista Italia) */}
          {!routeConfig?.enabled && !showItalyView && (
            <Marker
              position={mapCenter}
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
                  Lat: {mapCenter[0].toFixed(6)}
                </div>
                <div className="text-gray-600">
                  Lng: {mapCenter[1].toFixed(6)}
                </div>
              </div>
            </Popup>
            </Marker>
          )}

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
          {mapData && mapData.stalls_geojson.features.map((feature, idx) => {
            const props = feature.properties;
            
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
            const isSelected = selectedStallNumber === props.number;
            
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
            
            return (
              <React.Fragment key={`stall-${props.number}-${dbStall?.status || props.status}`}>
                <Polygon
                  positions={positions}
                  pathOptions={{
                    color: fillColor,
                    fillColor: fillColor,
                    fillOpacity: isSelected ? 0.9 : 0.7,
                    weight: isSelected ? 3 : 2,
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
                  <Popup className="stall-popup" minWidth={250}>
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
                          const match = props.dimensions.match(/([\d.]+)m\s*×\s*([\d.]+)m/);
                          const width = match ? parseFloat(match[1]).toFixed(2) : '-';
                          const length = match ? parseFloat(match[2]).toFixed(2) : '-';
                          const area = match ? (parseFloat(match[1]) * parseFloat(match[2])).toFixed(2) : '-';
                          
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
                      <div className="p-2">
                        {/* Header */}
                        <div className="font-bold text-lg mb-3 text-[#0b1220] border-b border-gray-200 pb-2">
                          Posteggio #{props.number}
                        </div>
                        
                        {/* Stato con badge colorato */}
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-gray-600 font-medium">Stato:</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            displayStatus === 'libero' ? 'bg-green-100 text-green-700' :
                            displayStatus === 'occupato' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {getStallStatusLabel(displayStatus)}
                          </span>
                        </div>
                        
                        {/* Tipo posteggio */}
                        {dbStall?.type && (
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-gray-600 font-medium">Tipo:</span>
                            <span className="text-gray-800 capitalize">{dbStall.type}</span>
                          </div>
                        )}
                        
                        {/* Dimensioni */}
                        {props.dimensions && (
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-gray-600 font-medium">Dimensioni:</span>
                            <span className="text-gray-800">{props.dimensions}</span>
                          </div>
                        )}
                        
                        {/* Intestatario */}
                        {displayVendor !== '-' && (
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-gray-600 font-medium">Intestatario:</span>
                            <span className="text-gray-800 font-semibold">{displayVendor}</span>
                          </div>
                        )}
                        
                        {/* Pulsante Visita Vetrina */}
                        {dbStall?.vendor_name && (
                          <a 
                            href={dbStall?.impresa_id ? `/vetrine/${dbStall.impresa_id}` : '/vetrine'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium py-2 px-4 rounded transition-colors"
                          >
                            🏪 Visita Vetrina
                          </a>
                        )}
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
