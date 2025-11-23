import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl, Tooltip, useMap } from 'react-leaflet';
import { ZoomFontUpdater } from './ZoomFontUpdater';
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
    number: number;
    status: string;
    type?: string;
    vendor_name?: string;
  }>;
  refreshKey?: number; // Key per forzare re-mount completo della mappa
}

// Controller per centrare la mappa programmaticamente
function MapCenterController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), {
        duration: 0.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);
  
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
  refreshKey = 0
}: MarketMapComponentProps) {
  
  const mapCenter: [number, number] = center || [mapData.center.lat, mapData.center.lng];
  
  console.log('[DEBUG MarketMapComponent] RICEVUTO:', {
    refreshKey,
    stallsDataLength: stallsData.length,
    firstStall: stallsData[0],
    mapDataFeaturesCount: mapData.stalls_geojson.features.length
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
          {center && <MapCenterController center={center} zoom={zoom} />}

          {/* Marker rosso "M" al centro mercato */}
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

          {/* Piazzole (stalls) */}
          {(() => {
            console.log('[VERCEL DEBUG] MarketMapComponent - Rendering', mapData.stalls_geojson.features.length, 'stalls');
            return null;
          })()}
          {mapData.stalls_geojson.features.map((feature, idx) => {
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
                          href="/dashboard-pa#vetrine" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-[#14b8a6] hover:bg-[#0d9488] text-white font-medium py-2 px-4 rounded transition-colors"
                        >
                          🏪 Visita Vetrina
                        </a>
                      )}
                    </div>
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
