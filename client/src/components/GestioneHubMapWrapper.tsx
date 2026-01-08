/**
 * GestioneHubMapWrapper.tsx
 * 
 * Wrapper per HubMarketMapComponent con selettore Mercato/HUB
 * Gestisce il caricamento dati e lo switch tra modalità
 * 
 * v3.22.0 - Aggiunta navigazione Regione/Provincia
 */

import React, { useState, useEffect } from 'react';
import { HubMarketMapComponent } from './HubMarketMapComponent';
import { MarketMapComponent } from './MarketMapComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Building2, Store, Loader2, RefreshCw, Map, Navigation, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Interfacce
interface Market {
  id: number;
  name: string;
  latitude: number | string;
  longitude: number | string;
  comune?: string;
  giorno?: string;
  posteggi_totali?: number;
}

interface HubLocation {
  id: number;
  name: string;
  lat: number | string;
  lng: number | string;
  latitude?: number;
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

// Interfacce per Regioni e Province
interface Regione {
  id: number;
  nome: string;
  codice_istat: string;
  capoluogo: string;
  lat: string | number;
  lng: string | number;
  zoom: number;
  province_count?: string | number;
}

interface Provincia {
  id: number;
  nome: string;
  sigla: string;
  capoluogo: string;
  lat: string | number;
  lng: string | number;
  zoom: number;
  regione_id?: number;
  regione_nome?: string;
}

export default function GestioneHubMapWrapper() {
  // Stati
  const [mode, setMode] = useState<'mercato' | 'hub'>('hub');
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
  
  // Dati Regioni e Province
  const [regioni, setRegioni] = useState<Regione[]>([]);
  const [province, setProvince] = useState<Provincia[]>([]);
  const [selectedRegione, setSelectedRegione] = useState<Regione | null>(null);
  const [selectedProvincia, setSelectedProvincia] = useState<Provincia | null>(null);
  const [loadingRegioni, setLoadingRegioni] = useState(false);
  const [loadingProvince, setLoadingProvince] = useState(false);
  
  // Vista
  const [showItalyView, setShowItalyView] = useState(true);
  const [viewTrigger, setViewTrigger] = useState(0);
  
  // Centro e zoom personalizzati per navigazione regione/provincia
  const [customCenter, setCustomCenter] = useState<[number, number] | null>(null);
  const [customZoom, setCustomZoom] = useState<number | null>(null);

  // Carica dati iniziali
  useEffect(() => {
    loadData();
    loadRegioni();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carica mercati
      const marketsRes = await fetch(`${MIHUB_API_BASE_URL}/api/markets`);
      if (marketsRes.ok) {
        const marketsResponse = await marketsRes.json();
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

  // Carica regioni
  const loadRegioni = async () => {
    setLoadingRegioni(true);
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/regioni`);
      if (res.ok) {
        const response = await res.json();
        if (response.success && Array.isArray(response.data)) {
          setRegioni(response.data);
          console.log('[GestioneHubMapWrapper] Loaded', response.data.length, 'regioni');
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading regioni:', error);
    } finally {
      setLoadingRegioni(false);
    }
  };

  // Carica province di una regione
  const loadProvince = async (regioneId: number) => {
    setLoadingProvince(true);
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/regioni/${regioneId}/province`);
      if (res.ok) {
        const response = await res.json();
        if (response.success && Array.isArray(response.data)) {
          setProvince(response.data);
          console.log('[GestioneHubMapWrapper] Loaded', response.data.length, 'province');
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading province:', error);
    } finally {
      setLoadingProvince(false);
    }
  };

  // Gestione selezione regione
  const handleRegioneSelect = async (regione: Regione) => {
    setSelectedRegione(regione);
    setSelectedProvincia(null);
    setSelectedMarket(null);
    setSelectedHub(null);
    
    // Zoom sulla regione
    const lat = parseFloat(String(regione.lat));
    const lng = parseFloat(String(regione.lng));
    setCustomCenter([lat, lng]);
    setCustomZoom(regione.zoom);
    setShowItalyView(false);
    setViewTrigger(prev => prev + 1);
    
    // Carica province
    await loadProvince(regione.id);
    
    toast.success(`Vista: ${regione.nome}`);
  };

  // Gestione selezione provincia
  const handleProvinciaSelect = (provincia: Provincia) => {
    setSelectedProvincia(provincia);
    setSelectedMarket(null);
    setSelectedHub(null);
    
    // Zoom sulla provincia
    const lat = parseFloat(String(provincia.lat));
    const lng = parseFloat(String(provincia.lng));
    setCustomCenter([lat, lng]);
    setCustomZoom(provincia.zoom);
    setShowItalyView(false);
    setViewTrigger(prev => prev + 1);
    
    toast.success(`Vista: ${provincia.nome} (${provincia.sigla})`);
  };

  // Reset navigazione geografica
  const handleResetGeo = () => {
    setSelectedRegione(null);
    setSelectedProvincia(null);
    setProvince([]);
    setCustomCenter(null);
    setCustomZoom(null);
  };

  // Gestione click su mercato
  const handleMarketClick = async (marketId: number) => {
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    setSelectedMarket(market);
    handleResetGeo(); // Reset navigazione geografica quando si seleziona un mercato

    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/gis/market-map/${marketId}`);
      if (res.ok) {
        const response = await res.json();
        if (response.success && response.data) {
          setMapData(response.data);
          console.log('[GestioneHubMapWrapper] Loaded mapData with', response.data?.stalls_geojson?.features?.length || 0, 'features');
          setTimeout(() => {
            setShowItalyView(false);
            setViewTrigger(prev => prev + 1);
          }, 500);
        } else {
          setShowItalyView(false);
          setViewTrigger(prev => prev + 1);
        }
      }

      const stallsRes = await fetch(`${MIHUB_API_BASE_URL}/api/stalls?market_id=${marketId}`);
      if (stallsRes.ok) {
        const stallsResponse = await stallsRes.json();
        if (stallsResponse.success && stallsResponse.data) {
          setStallsData(stallsResponse.data);
          console.log('[GestioneHubMapWrapper] Loaded stallsData with', stallsResponse.data.length, 'stalls');
        }
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
    handleResetGeo(); // Reset navigazione geografica quando si seleziona un HUB
    setShowItalyView(false);
    setViewTrigger(prev => prev + 1);

    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/hub/locations/${hubId}`);
      if (res.ok) {
        const hubResponse = await res.json();
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
    handleResetGeo();
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

  // Filtra elementi in base alla ricerca
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

        {/* Dropdown Regione */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`border-[#14b8a6]/30 ${selectedRegione ? 'bg-[#14b8a6]/20 text-[#14b8a6]' : 'text-[#e8fbff]'}`}
            >
              <Map className="h-4 w-4 mr-2" />
              {selectedRegione ? selectedRegione.nome : 'Regione'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a2332] border-[#14b8a6]/30 max-h-[300px] overflow-y-auto z-[9999]" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <DropdownMenuLabel className="text-[#e8fbff]/60">Seleziona Regione</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#14b8a6]/20" />
            {loadingRegioni ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#14b8a6]" />
              </div>
            ) : (
              regioni.map((regione) => (
                <DropdownMenuItem
                  key={regione.id}
                  onClick={() => handleRegioneSelect(regione)}
                  className={`text-[#e8fbff] hover:bg-[#14b8a6]/20 cursor-pointer ${
                    selectedRegione?.id === regione.id ? 'bg-[#14b8a6]/30' : ''
                  }`}
                >
                  <div className="flex justify-between w-full">
                    <span>{regione.nome}</span>
                    <span className="text-[#e8fbff]/50 text-xs ml-2">
                      {regione.province_count} prov.
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown Provincia */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedRegione}
              className={`border-[#14b8a6]/30 ${selectedProvincia ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#e8fbff]'} ${!selectedRegione ? 'opacity-50' : ''}`}
            >
              <Navigation className="h-4 w-4 mr-2" />
              {selectedProvincia ? `${selectedProvincia.nome} (${selectedProvincia.sigla})` : 'Provincia'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a2332] border-[#14b8a6]/30 max-h-[300px] overflow-y-auto z-[9999]" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <DropdownMenuLabel className="text-[#e8fbff]/60">
              Province di {selectedRegione?.nome || '...'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#14b8a6]/20" />
            {loadingProvince ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#14b8a6]" />
              </div>
            ) : province.length === 0 ? (
              <div className="text-[#e8fbff]/50 text-sm p-4 text-center">
                Seleziona prima una regione
              </div>
            ) : (
              province.map((provincia) => (
                <DropdownMenuItem
                  key={provincia.id}
                  onClick={() => handleProvinciaSelect(provincia)}
                  className={`text-[#e8fbff] hover:bg-[#f59e0b]/20 cursor-pointer ${
                    selectedProvincia?.id === provincia.id ? 'bg-[#f59e0b]/30' : ''
                  }`}
                >
                  <div className="flex justify-between w-full">
                    <span>{provincia.nome}</span>
                    <span className="text-[#e8fbff]/50 text-xs ml-2">
                      {provincia.sigla}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Reset Geo (se selezionato regione o provincia) */}
        {(selectedRegione || selectedProvincia) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetGeo}
            className="text-[#ef4444] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

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

      {/* Badge navigazione attiva */}
      {(selectedRegione || selectedProvincia) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#e8fbff]/60">Navigazione:</span>
          {selectedRegione && (
            <span className="bg-[#14b8a6]/20 text-[#14b8a6] px-2 py-1 rounded">
              {selectedRegione.nome}
            </span>
          )}
          {selectedProvincia && (
            <>
              <span className="text-[#e8fbff]/40">→</span>
              <span className="bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-1 rounded">
                {selectedProvincia.nome} ({selectedProvincia.sigla})
              </span>
            </>
          )}
        </div>
      )}

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
            <div className="grid grid-cols-4 gap-4 mb-4">
              {mode === 'mercato' ? (
                <>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Posteggi Totali</div>
                    <div className="text-[#14b8a6] text-xl font-bold">
                      {Array.isArray(stallsData) ? stallsData.filter(s => s.is_active === true).length : 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#ef4444]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Occupati</div>
                    <div className="text-[#ef4444] text-xl font-bold">
                      {Array.isArray(stallsData) ? stallsData.filter(s => s.is_active === true && s.status === 'occupato').length : 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#f59e0b]/30">
                    <div className="text-[#e8fbff]/60 text-xs">In Assegnazione</div>
                    <div className="text-[#f59e0b] text-xl font-bold">
                      {Array.isArray(stallsData) ? stallsData.filter(s => s.is_active === true && s.status === 'riservato').length : 0}
                    </div>
                  </div>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#10b981]/30">
                    <div className="text-[#e8fbff]/60 text-xs">Liberi</div>
                    <div className="text-[#10b981] text-xl font-bold">
                      {Array.isArray(stallsData) ? stallsData.filter(s => s.is_active === true && s.status === 'libero').length : 0}
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
          ] : customCenter || undefined}
          hubCenterFixed={selectedHub && selectedHub.lat && selectedHub.lng ? [
            parseFloat(String(selectedHub.lat)) || 42.5,
            parseFloat(String(selectedHub.lng)) || 12.5
          ] : customCenter || undefined}
          customZoom={customZoom || undefined}
        />
      </div>
    </div>
  );
}
