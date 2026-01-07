/**
 * GestioneHubMapWrapper.tsx
 * 
 * Wrapper per HubMarketMapComponent con selettore Mercato/HUB
 * Gestisce il caricamento dati e lo switch tra modalità
 */

import React, { useState, useEffect } from 'react';
import { HubMarketMapComponent } from './HubMarketMapComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Building2, Store, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';

// Interfacce
interface Market {
  id: number;
  name: string;
  latitude: number | string;  // API restituisce stringhe
  longitude: number | string;
  comune?: string;
  giorno?: string;
  posteggi_totali?: number;
}

interface HubLocation {
  id: number;
  name: string;
  lat: number | string;  // API restituisce lat/lng, non latitude/longitude
  lng: number | string;
  latitude?: number;  // Fallback per compatibilità
  longitude?: number;
  address?: string;
  city?: string;
  area_geojson?: any;
  shops?: HubShop[];
}

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

interface MapData {
  center: { lat: number; lng: number };
  stalls_geojson: {
    type: 'FeatureCollection';
    features: any[];
  };
}

export default function GestioneHubMapWrapper() {
  // Stati
  const [mode, setMode] = useState<'mercato' | 'hub'>('hub'); // Default HUB per questa sezione
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dati Mercati
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [stallsData, setStallsData] = useState<any[]>([]);
  
  // Dati HUB
  const [hubs, setHubs] = useState<HubLocation[]>([]);
  const [selectedHub, setSelectedHub] = useState<HubLocation | null>(null);
  
  // Vista
  const [showItalyView, setShowItalyView] = useState(true);
  const [viewTrigger, setViewTrigger] = useState(0);

  // Carica dati iniziali
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carica mercati
      const marketsRes = await fetch(`${MIHUB_API_BASE_URL}/api/markets`);
      if (marketsRes.ok) {
        const marketsResponse = await marketsRes.json();
        // L'API markets restituisce {success: true, data: [...]}
        if (marketsResponse.success && Array.isArray(marketsResponse.data)) {
          setMarkets(marketsResponse.data);
          console.log('[GestioneHubMapWrapper] Loaded', marketsResponse.data.length, 'markets');
        } else {
          setMarkets([]);
        }
      }

      // Carica HUB
      const hubsRes = await fetch(`${MIHUB_API_BASE_URL}/api/hub/locations`);
      if (hubsRes.ok) {
        const hubsResponse = await hubsRes.json();
        // L'API hub/locations restituisce {success: true, data: [...], count: N}
        if (hubsResponse.success && Array.isArray(hubsResponse.data)) {
          setHubs(hubsResponse.data);
          console.log('[GestioneHubMapWrapper] Loaded', hubsResponse.data.length, 'HUBs');
        } else {
          setHubs([]);
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading data:', error);
      toast.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  // Gestione click su mercato
  const handleMarketClick = async (marketId: number) => {
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    setSelectedMarket(market);
    setShowItalyView(false);
    setViewTrigger(prev => prev + 1);

    // Carica dati mappa mercato
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/gis/market-map/${marketId}`);
      if (res.ok) {
        const response = await res.json();
        // L'API restituisce {success: true, data: {...}, meta: {...}}
        const mapDataFromApi = response.data || response;
        setMapData(mapDataFromApi);
        console.log('[GestioneHubMapWrapper] Loaded mapData with', mapDataFromApi?.stalls_geojson?.features?.length || 0, 'features');
      }

      // Carica posteggi
      const stallsRes = await fetch(`${MIHUB_API_BASE_URL}/api/stalls?market_id=${marketId}`);
      if (stallsRes.ok) {
        const stalls = await stallsRes.json();
        setStallsData(stalls);
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading market data:', error);
    }
  };

  // Gestione click su HUB
  const handleHubClick = async (hubId: number) => {
    const hub = hubs.find(h => h.id === hubId);
    if (!hub) return;

    setSelectedHub(hub);
    setShowItalyView(false);
    setViewTrigger(prev => prev + 1);

    // Carica dettagli HUB con negozi
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/hub/locations/${hubId}`);
      if (res.ok) {
        const hubResponse = await res.json();
        // L'API restituisce {success: true, data: {...}}
        const hubData = hubResponse.data || hubResponse;
        setSelectedHub(hubData);
        console.log('[GestioneHubMapWrapper] Loaded HUB with', hubData.shops?.length || 0, 'shops');
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading HUB data:', error);
    }
  };

  // Torna a Vista Italia
  const handleBackToItaly = () => {
    setShowItalyView(true);
    setSelectedMarket(null);
    setSelectedHub(null);
    setMapData(null);
    setViewTrigger(prev => prev + 1);
  };

  // Vai a Vista Mercato/HUB (zoom al selezionato)
  const handleGoToDetail = () => {
    if (selectedItem) {
      setShowItalyView(false);
      setViewTrigger(prev => prev + 1);
    }
  };

  // Gestione click su negozio
  const handleShopClick = (shop: HubShop) => {
    toast.info(`Negozio ${shop.letter}: ${shop.name}`);
  };

  // Filtra elementi in base alla ricerca (con controllo array)
  const filteredMarkets = Array.isArray(markets) ? markets.filter(m => 
    m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.comune?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const filteredHubs = Array.isArray(hubs) ? hubs.filter(h => 
    h.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.city?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Lista elementi da mostrare
  const currentList = mode === 'mercato' ? filteredMarkets : filteredHubs;
  const selectedItem = mode === 'mercato' ? selectedMarket : selectedHub;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
        <span className="ml-2 text-[#e8fbff]">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con Selettore e Ricerca */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Selettore Mercato/HUB */}
        <div className="flex bg-[#0b1220] rounded-lg p-1 border border-[#14b8a6]/30">
          <Button
            variant={mode === 'mercato' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMode('mercato'); handleBackToItaly(); }}
            className={mode === 'mercato' 
              ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white' 
              : 'text-[#e8fbff]/70 hover:text-[#e8fbff]'
            }
          >
            <Store className="h-4 w-4 mr-2" />
            🏪 Mercati ({markets.length})
          </Button>
          <Button
            variant={mode === 'hub' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMode('hub'); handleBackToItaly(); }}
            className={mode === 'hub' 
              ? 'bg-[#9C27B0] hover:bg-[#7B1FA2] text-white' 
              : 'text-[#e8fbff]/70 hover:text-[#e8fbff]'
            }
          >
            <Building2 className="h-4 w-4 mr-2" />
            🏢 HUB ({hubs.length})
          </Button>
        </div>

        {/* Ricerca */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder={`Cerca ${mode === 'mercato' ? 'mercato' : 'HUB'} per nome o città...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
          />
        </div>

        {/* Pulsante Vista Italia / Vista Dettaglio */}
        <Button
          variant="outline"
          size="sm"
          onClick={showItalyView ? handleGoToDetail : handleBackToItaly}
          disabled={showItalyView && !selectedItem}
          className="border-[#14b8a6]/30 text-[#e8fbff]"
        >
          <MapPin className="h-4 w-4 mr-2" />
          {showItalyView 
            ? `Vista ${mode === 'mercato' ? 'Mercato' : 'HUB'}` 
            : 'Vista Italia'
          }
        </Button>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          className="text-[#14b8a6]"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista elementi */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {currentList.slice(0, 10).map((item) => (
          <Card 
            key={item.id}
            className={`min-w-[200px] cursor-pointer transition-all ${
              selectedItem?.id === item.id 
                ? mode === 'mercato' 
                  ? 'border-[#ef4444] bg-[#ef4444]/10' 
                  : 'border-[#9C27B0] bg-[#9C27B0]/10'
                : 'border-[#14b8a6]/30 bg-[#1a2332] hover:border-[#14b8a6]/50'
            }`}
            onClick={() => mode === 'mercato' 
              ? handleMarketClick(item.id) 
              : handleHubClick(item.id)
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  mode === 'mercato' ? 'bg-[#ef4444]' : 'bg-[#9C27B0]'
                }`}>
                  {mode === 'mercato' ? 'M' : 'H'}
                </span>
                <span className="text-[#e8fbff] font-medium text-sm truncate">
                  {item.name}
                </span>
              </div>
              <div className="text-[#e8fbff]/60 text-xs">
                {mode === 'mercato' 
                  ? (item as Market).comune || 'Italia'
                  : (item as HubLocation).city || 'Italia'
                }
              </div>
              {mode === 'hub' && (item as HubLocation).shops && (
                <div className="text-[#9C27B0] text-xs mt-1">
                  {(item as HubLocation).shops?.length || 0} negozi
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dettaglio elemento selezionato */}
      {selectedItem && (
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                mode === 'mercato' ? 'bg-[#ef4444]' : 'bg-[#9C27B0]'
              }`}>
                {mode === 'mercato' ? 'M' : 'H'}
              </span>
              {selectedItem.name}
            </CardTitle>
            <CardDescription className="text-[#e8fbff]/60">
              {mode === 'mercato' 
                ? `Mercato - ${(selectedItem as Market).comune || ''} - ${(selectedItem as Market).giorno || ''}`
                : `HUB - ${(selectedItem as HubLocation).city || ''} - ${(selectedItem as HubLocation).address || ''}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {mode === 'mercato' ? (
                <>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#ef4444]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Posteggi Totali</div>
                    <div className="text-[#ef4444] text-xl font-bold">
                      {(selectedItem as Market).posteggi_totali || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#10b981]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Occupati</div>
                    <div className="text-[#10b981] text-xl font-bold">
                      {Array.isArray(stallsData) ? stallsData.filter(s => s.status === 'occupied').length : 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#6b7280]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Liberi</div>
                    <div className="text-[#6b7280] text-xl font-bold">
                      {Array.isArray(stallsData) ? stallsData.filter(s => s.status === 'free').length : 0}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#9C27B0]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Negozi Totali</div>
                    <div className="text-[#9C27B0] text-xl font-bold">
                      {(selectedItem as HubLocation).shops?.length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#10b981]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Attivi</div>
                    <div className="text-[#10b981] text-xl font-bold">
                      {(selectedItem as HubLocation).shops?.filter(s => s.status === 'active').length || 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#6b7280]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Inattivi</div>
                    <div className="text-[#6b7280] text-xl font-bold">
                      {(selectedItem as HubLocation).shops?.filter(s => s.status !== 'active').length || 0}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Coordinate GPS */}
            <div className="bg-[#0b1220] p-3 rounded-lg border border-[#14b8a6]/30">
              <div className="text-[10px] text-[#e8fbff]/50 uppercase tracking-wider mb-1">Coordinate GPS</div>
              <div className="font-mono text-xs text-[#e8fbff]/80 flex justify-between">
                {mode === 'mercato' ? (
                  <>
                    <span>Lat: {parseFloat(String((selectedItem as Market).latitude)) ? parseFloat(String((selectedItem as Market).latitude)).toFixed(6) : 'N/A'}</span>
                    <span>Lng: {parseFloat(String((selectedItem as Market).longitude)) ? parseFloat(String((selectedItem as Market).longitude)).toFixed(6) : 'N/A'}</span>
                  </>
                ) : (
                  <>
                    <span>Lat: {parseFloat(String((selectedItem as HubLocation).lat)) ? parseFloat(String((selectedItem as HubLocation).lat)).toFixed(6) : 'N/A'}</span>
                    <span>Lng: {parseFloat(String((selectedItem as HubLocation).lng)) ? parseFloat(String((selectedItem as HubLocation).lng)).toFixed(6) : 'N/A'}</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mappa */}
      <div className="h-[700px] rounded-lg overflow-hidden border border-[#14b8a6]/30">
        <HubMarketMapComponent
          mode={mode}
          mapData={mapData || undefined}
          stallsData={stallsData}
          allMarkets={mode === 'mercato' ? filteredMarkets : []}
          allHubs={mode === 'hub' ? filteredHubs : []}
          selectedHub={mode === 'hub' ? selectedHub || undefined : undefined}
          onMarketClick={handleMarketClick}
          onHubClick={handleHubClick}
          onShopClick={handleShopClick}
          showItalyView={showItalyView}
          viewTrigger={viewTrigger}
          height="100%"
          marketCenterFixed={selectedMarket && selectedMarket.latitude && selectedMarket.longitude ? [
            parseFloat(String(selectedMarket.latitude)) || 42.5,
            parseFloat(String(selectedMarket.longitude)) || 12.5
          ] : undefined}
          hubCenterFixed={selectedHub && selectedHub.lat && selectedHub.lng ? [
            parseFloat(String(selectedHub.lat)) || 42.5,
            parseFloat(String(selectedHub.lng)) || 12.5
          ] : undefined}
        />
      </div>
    </div>
  );
}
