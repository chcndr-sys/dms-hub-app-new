import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, LayersControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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

interface MarketMapData {
  container: [number, number][];
  center: { lat: number; lng: number };
  stalls_geojson: {
    type: string;
    features: Array<{
      type: string;
      geometry: {
        type: 'Point' | 'Polygon';
        coordinates: [number, number] | [number, number][][];
      };
      properties: {
        number: string;
        orientation?: number;
        kind?: string;
        status?: string;
        dimensions?: string;
      };
    }>;
  };
  markers_geojson?: any;
  areas_geojson?: any;
}

interface ApiResponse {
  success: boolean;
  data: MarketMapData;
  meta: {
    endpoint: string;
    timestamp: string;
    source: string;
    stalls_count: number;
  };
}

export default function MarketGISPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const loadMarketMap = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Chiamata all'endpoint backend
      const apiUrl = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';
      const response = await fetch(`${apiUrl}/api/gis/market-map`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: ApiResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Errore nel caricamento dei dati');
      }
      
      setMapData(result.data);
      console.log('✅ Dati mappa caricati:', result.meta);
      
    } catch (err) {
      console.error('❌ Errore caricamento mappa:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketMap();
  }, []);

  // Converti container in formato Leaflet [[lat, lng], ...]
  const containerPolygon = mapData?.container.map(([lat, lng]) => [lat, lng] as [number, number]) || [];

  return (
    <>
      <style>{`
        /* Rimuovi background dai tooltip dei numeri */
        .stall-number-tooltip.leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          color: white !important;
          font-size: 11px !important;
          font-weight: bold !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
        }
        .stall-number-tooltip.leaflet-tooltip-left:before,
        .stall-number-tooltip.leaflet-tooltip-right:before {
          display: none !important;
        }
      `}</style>
      <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-emerald-600" />
          <div>
            <h1 className="text-lg font-semibold">Mappa GIS Mercato</h1>
            <p className="text-xs text-gray-500">
              Integrazione Editor v3 - Pepe GIS
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={loadMarketMap}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Contenuto */}
      <div className="flex-1 relative">
        {loading && !mapData && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-3" />
              <p className="text-gray-600">Caricamento mappa mercato...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center max-w-md p-6">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Errore caricamento mappa
              </h2>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <Button onClick={loadMarketMap} variant="outline">
                Riprova
              </Button>
            </div>
          </div>
        )}

        {mapData && (
          <MapContainer
            center={[mapData.center.lat, mapData.center.lng]}
            zoom={17}
            className="h-full w-full"
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
              
              <LayersControl.BaseLayer name="🏞️ Topografica">
                <TileLayer
                  attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                  url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                  maxZoom={17}
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

            {/* Contorno mercato - RIMOSSO come da richiesta utente */}
            {/* {containerPolygon.length > 0 && (
              <Polygon
                positions={containerPolygon}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            )} */}

            {/* Marker rosso "M" al centro del mercato */}
            <Marker
              position={[mapData.center.lat, mapData.center.lng]}
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
                    Lat: {mapData.center.lat.toFixed(6)}
                  </div>
                  <div className="text-gray-600">
                    Lng: {mapData.center.lng.toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Piazzole (stalls) */}
            {mapData.stalls_geojson.features.map((feature, idx) => {
              const props = feature.properties;
              
              // Debug: log primo posteggio
              if (idx === 0) {
                console.log('🔍 Primo posteggio:', {
                  type: feature.geometry.type,
                  number: props.number,
                  orientation: props.orientation,
                  coordinates: feature.geometry.coordinates
                });
              }
              
              // Converti coordinate Polygon in formato Leaflet [lat, lng][]
              let positions: [number, number][] = [];
              
              if (feature.geometry.type === 'Polygon') {
                // Polygon: array di array di coordinate [[lng, lat], ...]
                const coords = feature.geometry.coordinates as [number, number][][];
                positions = coords[0].map(
                  ([lng, lat]: [number, number]) => [lat, lng]
                );
              } else if (feature.geometry.type === 'Point') {
                // Fallback per Point: crea un piccolo cerchio
                const [lng, lat] = feature.geometry.coordinates;
                return (
                  <Circle
                    key={`stall-${idx}`}
                    center={[lat, lng]}
                    radius={3}
                    pathOptions={{
                      color: props.status === 'occupied' ? '#ef4444' : '#10b981',
                      fillColor: props.status === 'occupied' ? '#ef4444' : '#10b981',
                      fillOpacity: 0.6,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold text-base mb-1">
                          Piazzola #{props.number}
                        </div>
                        {props.dimensions && (
                          <div className="text-gray-600">📏 {props.dimensions}</div>
                        )}
                        {props.status && (
                          <div className="text-gray-600">
                            🏷️ {props.status === 'free' ? 'Libera' : 'Occupata'}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Circle>
                );
              }
              
              // Nessun DivIcon - usiamo Tooltip che scala con zoom
              
              return (
                <React.Fragment key={`stall-${idx}`}>
                  <Polygon
                    positions={positions}
                    pathOptions={{
                      color: props.status === 'occupied' ? '#ef4444' : '#10b981',
                      fillColor: props.status === 'occupied' ? '#ef4444' : '#10b981',
                      fillOpacity: 0.7,
                      weight: 2,
                    }}
                    eventHandlers={{
                      click: () => setSelectedStall(props),
                    }}
                  >
                    <Tooltip 
                      permanent 
                      direction="center" 
                      className="stall-number-tooltip"
                      opacity={1}
                    >
                      {props.number}
                    </Tooltip>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold text-base mb-1">
                          Piazzola #{props.number}
                        </div>
                        {props.dimensions && (
                          <div className="text-gray-600">
                            📏 {props.dimensions}
                          </div>
                        )}
                        {props.status && (
                          <div className="text-gray-600">
                            🏷️ {props.status === 'free' ? 'Libera' : 'Occupata'}
                          </div>
                        )}
                        {props.kind && (
                          <div className="text-gray-600 text-xs mt-1">
                            Tipo: {props.kind}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polygon>
                </React.Fragment>
              );
            })}


          </MapContainer>
        )}
        
        {/* Pannello Debug */}
        {mapData && debugInfo.length > 0 && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border-2 border-blue-500 rounded-lg shadow-lg p-3 max-w-xs z-[1000]">
            <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
              🔍 Debug Info - Numeri Posteggi
            </div>
            <div className="space-y-1 text-xs font-mono">
              {debugInfo.map((info, idx) => (
                <div key={idx} className="text-gray-700">{info}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info footer */}
      {mapData && (
        <div className="bg-white border-t px-4 py-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>
              📍 Piazzole: {mapData.stalls_geojson.features.length}
            </span>
            <span className="text-emerald-600">
              ✓ Dati caricati da Editor v3
            </span>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
