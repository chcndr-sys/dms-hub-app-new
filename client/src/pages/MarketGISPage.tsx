import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, LayersControl, Tooltip, useMap } from 'react-leaflet';
import { ZoomFontUpdater } from '../components/ZoomFontUpdater';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertCircle, RefreshCw, Search, ChevronDown, Globe, ArrowLeft } from 'lucide-react';
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

// Coordinate centro Italia per vista iniziale
const ITALY_CENTER: [number, number] = [42.5, 12.5];
const ITALY_ZOOM = 6;
const MARKET_ZOOM = 17;

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

interface Market {
  id: number;
  code: string;
  name: string;
  municipality: string;
  total_stalls: number;
  latitude: string;
  longitude: string;
}

// Componente per zoom animato sulla mappa
function AnimatedZoom({ 
  target, 
  zoom, 
  onComplete 
}: { 
  target: [number, number] | null; 
  zoom: number;
  onComplete?: () => void;
}) {
  const map = useMap();
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (target && !hasAnimated.current) {
      hasAnimated.current = true;
      map.flyTo(target, zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      });
      
      // Callback dopo animazione
      if (onComplete) {
        setTimeout(onComplete, 1600);
      }
    }
  }, [target, zoom, map, onComplete]);
  
  // Reset quando target cambia
  useEffect(() => {
    hasAnimated.current = false;
  }, [target?.[0], target?.[1]]);
  
  return null;
}

// Componente per tornare alla vista Italia
function BackToItaly({ onClick }: { onClick: () => void }) {
  const map = useMap();
  
  const handleClick = () => {
    map.flyTo(ITALY_CENTER, ITALY_ZOOM, {
      duration: 1.5,
      easeLinearity: 0.25
    });
    onClick();
  };
  
  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: '80px', marginLeft: '10px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleClick}
          className="bg-white hover:bg-gray-100 text-gray-700 font-medium py-2 px-3 rounded-lg shadow-lg border border-gray-300 flex items-center gap-2 text-sm"
          title="Torna alla vista Italia"
        >
          <Globe className="w-4 h-4" />
          Italia
        </button>
      </div>
    </div>
  );
}

// Icona marker mercato personalizzata
const createMarketIcon = (isSelected: boolean = false) => L.divIcon({
  className: 'market-marker',
  html: `<div style="
    background: ${isSelected ? '#ef4444' : '#10b981'};
    color: white;
    width: ${isSelected ? '36px' : '28px'};
    height: ${isSelected ? '36px' : '28px'};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${isSelected ? '16px' : '14px'};
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    border: 3px solid white;
    transition: all 0.3s ease;
  ">M</div>`,
  iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
  iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
});

export default function MarketGISPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  // Stati per selettore mercati
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Stato per vista: 'italy' o 'market'
  const [viewMode, setViewMode] = useState<'italy' | 'market'>('italy');
  const [zoomTarget, setZoomTarget] = useState<[number, number] | null>(null);
  const [targetZoom, setTargetZoom] = useState<number>(ITALY_ZOOM);
  const [selectedStall, setSelectedStall] = useState<any>(null);

  // Carica lista mercati all'avvio
  const loadMarkets = async () => {
    try {
      const apiUrl = import.meta.env.VITE_MIHUB_API_URL || 'https://orchestratore.mio-hub.me';
      const response = await fetch(`${apiUrl}/api/markets`);
      const result = await response.json();
      if (result.success && result.data) {
        setMarkets(result.data);
      }
    } catch (err) {
      console.error('Errore caricamento mercati:', err);
    }
  };

  const loadMarketMap = async (marketId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_MIHUB_API_URL || 'https://orchestratore.mio-hub.me';
      const response = await fetch(`${apiUrl}/api/gis/market-map/${marketId}`);
      
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

  // Carica mercati all'avvio
  useEffect(() => {
    loadMarkets();
  }, []);
  
  // Filtra mercati in base alla ricerca
  const filteredMarkets = markets.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.municipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Gestisce selezione mercato (da dropdown o click su marker)
  const handleSelectMarket = async (market: Market) => {
    setSelectedMarket(market);
    setSearchQuery('');
    setShowDropdown(false);
    
    // Zoom animato verso il mercato
    const lat = parseFloat(market.latitude);
    const lng = parseFloat(market.longitude);
    setZoomTarget([lat, lng]);
    setTargetZoom(MARKET_ZOOM);
    setViewMode('market');
    
    // Carica i dati del mercato
    await loadMarketMap(market.id);
  };
  
  // Gestisce ricerca con Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredMarkets.length > 0) {
      handleSelectMarket(filteredMarkets[0]);
    }
  };
  
  // Torna alla vista Italia
  const handleBackToItaly = () => {
    setSelectedMarket(null);
    setMapData(null);
    setViewMode('italy');
    setZoomTarget(null);
  };

  return (
    <>
      {/* Style dinamico aggiornato da ZoomFontUpdater */}
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
        }
        .stall-number-tooltip.leaflet-tooltip-left:before,
        .stall-number-tooltip.leaflet-tooltip-right:before {
          display: none !important;
        }
        .market-marker {
          transition: transform 0.3s ease;
        }
        .market-marker:hover {
          transform: scale(1.2);
        }
      `}</style>
      <div className="h-screen flex flex-col">
      {/* Header con Selettore Mercati */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {viewMode === 'market' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToItaly}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Italia
              </Button>
            )}
            <MapPin className="w-6 h-6 text-emerald-600" />
            <div>
              <h1 className="text-lg font-semibold">
                {viewMode === 'italy' ? 'Gemello Digitale - Rete Mercati Italia' : 'Pepe GIS - Mappa Mercato'}
              </h1>
              <p className="text-xs text-gray-500">
                {viewMode === 'italy' 
                  ? `${markets.length} mercati disponibili - Clicca su un marker o cerca`
                  : selectedMarket 
                    ? `${selectedMarket.name} (${selectedMarket.code}) - ${selectedMarket.municipality}`
                    : 'Seleziona un mercato'
                }
              </p>
            </div>
          </div>
          
          {viewMode === 'market' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedMarket && loadMarketMap(selectedMarket.id)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
        
        {/* Barra di Ricerca Mercati */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca mercato per nome, città o codice... (premi Invio)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          
          {/* Dropdown Lista Mercati */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {filteredMarkets.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-sm">
                  Nessun mercato trovato
                </div>
              ) : (
                filteredMarkets.map((market) => (
                  <div
                    key={market.id}
                    onClick={() => handleSelectMarket(market)}
                    className={`p-3 cursor-pointer hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 ${
                      selectedMarket?.id === market.id ? 'bg-emerald-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{market.name}</div>
                        <div className="text-xs text-gray-500">{market.municipality} • {market.code}</div>
                      </div>
                      <div className="text-sm text-emerald-600 font-medium">
                        {market.total_stalls} posteggi
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenuto Mappa */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
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
              <Button onClick={() => selectedMarket && loadMarketMap(selectedMarket.id)} variant="outline">
                Riprova
              </Button>
            </div>
          </div>
        )}

        <MapContainer
          center={ITALY_CENTER}
          zoom={ITALY_ZOOM}
          className="h-full w-full"
        >
          {/* Componente per zoom animato */}
          {zoomTarget && (
            <AnimatedZoom 
              target={zoomTarget} 
              zoom={targetZoom}
            />
          )}
          
          {/* Pulsante torna a Italia (visibile solo in vista mercato) */}
          {viewMode === 'market' && (
            <BackToItaly onClick={handleBackToItaly} />
          )}
          
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
          
          {/* Componente per aggiornare font size dinamicamente con zoom */}
          <ZoomFontUpdater minZoom={18} baseFontSize={8} scaleFactor={1.5} />

          {/* Marker mercati sulla mappa Italia */}
          {markets.map((market) => {
            const lat = parseFloat(market.latitude);
            const lng = parseFloat(market.longitude);
            const isSelected = selectedMarket?.id === market.id;
            
            return (
              <Marker
                key={`market-${market.id}`}
                position={[lat, lng]}
                icon={createMarketIcon(isSelected)}
                eventHandlers={{
                  click: () => handleSelectMarket(market)
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <div className="font-semibold text-base mb-2 text-emerald-700">
                      📍 {market.name}
                    </div>
                    <div className="text-gray-600 mb-1">
                      🏙️ {market.municipality}
                    </div>
                    <div className="text-gray-600 mb-1">
                      🏷️ Codice: {market.code}
                    </div>
                    <div className="text-gray-600 mb-3">
                      📊 {market.total_stalls} posteggi
                    </div>
                    <button
                      onClick={() => handleSelectMarket(market)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      Apri Mappa Mercato →
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Piazzole (stalls) - visibili solo quando c'è mapData */}
          {mapData && mapData.stalls_geojson.features.map((feature, idx) => {
            const props = feature.properties;
            
            // Converti coordinate Polygon in formato Leaflet [lat, lng][]
            let positions: [number, number][] = [];
            
            if (feature.geometry.type === 'Polygon') {
              const coords = feature.geometry.coordinates as [number, number][][];
              positions = coords[0].map(
                ([lng, lat]: [number, number]) => [lat, lng]
              );
            } else if (feature.geometry.type === 'Point') {
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

          {/* Marker centro mercato (visibile solo in vista mercato) */}
          {mapData && viewMode === 'market' && (
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
          )}

        </MapContainer>
      </div>

      {/* Info footer */}
      <div className="bg-white border-t px-4 py-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          {viewMode === 'italy' ? (
            <>
              <span>
                🇮🇹 Rete Mercati Made in Italy
              </span>
              <span className="text-emerald-600">
                {markets.length} mercati • Clicca su un marker per esplorare
              </span>
            </>
          ) : (
            <>
              <span>
                📍 Piazzole: {mapData?.stalls_geojson.features.length || 0}
              </span>
              <span className="text-emerald-600">
                ✓ Dati caricati da Editor v3
              </span>
            </>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
