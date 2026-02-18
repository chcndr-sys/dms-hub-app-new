import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, AlertCircle, RefreshCw, Search, ChevronDown } from 'lucide-react';
import { MarketMapComponent } from '../components/MarketMapComponent';

interface MarketMapData {
  container: [number, number][];
  center: { lat: number; lng: number };
  stalls_geojson: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'Point' | 'Polygon';
        coordinates: [number, number] | [number, number][][];
      };
      properties: {
        number: number | string;
        orientation?: number;
        kind?: string;
        status?: string;
        dimensions?: string;
        [key: string]: any;
      };
    }>;
  };
  markers_geojson?: any;
  areas_geojson?: any;
}

interface ApiResponse {
  success: boolean;
  error?: string;
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

export default function MarketGISPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  
  // Stati per selettore mercati
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  // Carica lista mercati all'avvio
  const loadMarkets = async () => {
    try {
      const apiUrl = import.meta.env.VITE_MIHUB_API_URL || 'https://orchestratore.mio-hub.me';
      const response = await fetch(`${apiUrl}/api/markets`);
      const result = await response.json();
      if (result.success && result.data) {
        setMarkets(result.data);
        // NON selezionare il primo mercato di default, lascia Vista Italia
        // if (result.data.length > 0 && !selectedMarket) {
        //   setSelectedMarket(result.data[0]);
        // }
      }
    } catch (err) {
      console.error('Errore caricamento mercati:', err);
    }
  };

  const loadMarketMap = async (marketId?: number) => {
    // Se non c'è marketId e non c'è selectedMarket, carica la mappa Italia (base)
    const targetMarketId = marketId || selectedMarket?.id;
    
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_MIHUB_API_URL || 'https://orchestratore.mio-hub.me';
      // Se non c'è targetMarketId, carica la mappa base (Italia)
      const endpoint = targetMarketId 
        ? `${apiUrl}/api/gis/market-map/${targetMarketId}`
        : `${apiUrl}/api/gis/market-map`; // Endpoint base

      const response = await fetch(endpoint);
      
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
    loadMarketMap(); // Carica mappa base (Italia)
  }, []);
  
  // Carica mappa quando cambia il mercato selezionato
  useEffect(() => {
    if (selectedMarket) {
      loadMarketMap(selectedMarket.id);
    } else {
      // Se deselezionato, ricarica mappa base
      loadMarketMap();
    }
  }, [selectedMarket]);
  
  // Filtra mercati in base alla ricerca
  const filteredMarkets = markets.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.municipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.code.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Gestisce selezione mercato
  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setSearchQuery('');
    setShowDropdown(false);
    setMapRefreshKey(prev => prev + 1);
  };

  // Torna alla vista Italia
  const handleBackToItaly = () => {
    setSelectedMarket(null);
    setMapRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <div className="h-screen flex flex-col bg-[#0b1220]">
      {/* Header con Selettore Mercati */}
      <div className="bg-[#1a2332] border-b border-[#14b8a6]/30 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#14b8a6]" />
            <div>
              <h1 className="text-lg font-semibold text-[#e8fbff]">Pepe GIS - Mappa Mercato</h1>
              <p className="text-xs text-[#e8fbff]/70">
                {selectedMarket ? `${selectedMarket.name} (${selectedMarket.code})` : 'Vista Italia - Seleziona un mercato'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {selectedMarket && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToItaly}
                className="border-[#14b8a6]/50 text-[#14b8a6] hover:bg-[#14b8a6]/10"
              >
                🌍 Vista Italia
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMarketMap()}
              disabled={loading}
              className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Barra di Ricerca Mercati */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca mercato per nome, città o codice..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-10 pr-4 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          
          {/* Dropdown Lista Mercati */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2332] border border-[#14b8a6]/30 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {filteredMarkets.length === 0 ? (
                <div className="p-3 text-center text-[#e8fbff]/50 text-sm">
                  Nessun mercato trovato
                </div>
              ) : (
                filteredMarkets.map((market) => (
                  <div
                    key={market.id}
                    onClick={() => handleSelectMarket(market)}
                    className={`p-3 cursor-pointer hover:bg-[#14b8a6]/10 border-b border-[#14b8a6]/10 last:border-b-0 ${
                      selectedMarket?.id === market.id ? 'bg-[#14b8a6]/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#e8fbff]">{market.name}</div>
                        <div className="text-xs text-[#e8fbff]/70">{market.municipality} • {market.code}</div>
                      </div>
                      <div className="text-sm text-[#14b8a6] font-medium">
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

      {/* Contenuto */}
      <div className="flex-1 relative bg-[#0b1220]">
        {loading && !mapData && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b1220] z-10">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#14b8a6] mx-auto mb-3" />
              <p className="text-[#e8fbff]/70">Caricamento mappa mercato...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0b1220] z-10">
            <div className="text-center max-w-md p-6">
              <AlertCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-[#e8fbff] mb-2">
                Errore caricamento mappa
              </h2>
              <p className="text-[#e8fbff]/70 mb-4">{error}</p>
              <Button onClick={() => loadMarketMap()} variant="outline" className="border-[#14b8a6]/30 text-[#14b8a6]">
                Riprova
              </Button>
            </div>
          </div>
        )}

        {/* UNIFIED MAP COMPONENT */}
        {mapData && (
          <MarketMapComponent
            refreshKey={mapRefreshKey}
            mapData={mapData}
            // Trasformiamo i dati geojson nel formato stallsData che il componente si aspetta
            stallsData={mapData.stalls_geojson.features.map(f => ({
              id: parseInt(String(f.properties.number)) || 0, // Fallback ID
              number: f.properties.number,
              status: f.properties.status || 'free',
              type: f.properties.kind || 'fisso',
              dimensions: f.properties.dimensions
            }))}
            center={selectedMarket ? [mapData.center.lat, mapData.center.lng] : [42.5, 12.5]}
            zoom={selectedMarket ? 19 : 6}
            height="100%"
            showItalyView={!selectedMarket} 
            onMarketClick={(id) => {
               // Trova il mercato nella lista e selezionalo
               const m = markets.find(m => m.id === id);
               if (m) handleSelectMarket(m);
            }}
          />
        )}
      </div>
    </div>
    </>
  );
}
