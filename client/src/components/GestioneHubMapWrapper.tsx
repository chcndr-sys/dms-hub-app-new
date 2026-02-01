/**
 * GestioneHubMapWrapper.tsx
 * 
 * Wrapper per HubMarketMapComponent con selettore Mercato/HUB
 * Gestisce il caricamento dati e lo switch tra modalità
 * 
 * v3.23.0 - Redesign compatto con indicatori sempre visibili
 * v3.76.0 - Mobile layout ottimizzato (solo CSS, nessuna riscrittura logica)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { HubMarketMapComponent } from './HubMarketMapComponent';
import { MarketMapComponent } from './MarketMapComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Building2, Store, Loader2, Map, Navigation, ChevronDown, ChevronLeft, X, Home, ArrowLeft } from 'lucide-react';
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

// Componenti Layer Trasporto Pubblico
import { MapWithTransportLayer } from './MapWithTransportLayer';

// Props per routing esterno e navigazione
interface GestioneHubMapWrapperProps {
  routeConfig?: {
    enabled: boolean;
    userLocation: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: 'walking' | 'cycling' | 'driving';
  };
  navigationMode?: {
    active: boolean;
    destinationName: string;
    onClose: () => void;
  };
}

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
  // Nuovi campi per sistema multi-livello Emilia Romagna
  provincia_id?: number;
  regione_id?: number;
  livello?: 'capoluogo' | 'provincia' | 'comune';
  tipo?: 'urbano' | 'prossimita';
  provincia_sigla?: string;
  // Coordinate centro HUB per animazione zoom
  center_lat?: number | string;
  center_lng?: number | string;
  // Area in metri quadri
  area_sqm?: number;
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

interface Regione {
  id: number;
  nome: string;
  codice_istat?: string;
  province_count?: number;
}

interface Provincia {
  id: number;
  nome: string;
  sigla: string;
  regione_id: number;
}

// Componente indicatore statistico compatto
const StatIndicator = ({ label, value, color, compact = false }: { label: string; value: number; color: string; compact?: boolean }) => {
  const colorMap: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    amber: '#f59e0b',
    purple: '#9C27B0',
    white: '#e8fbff'
  };
  
  if (compact) {
    // Versione compatta per mobile
    return (
      <div className="px-2 py-1 bg-[#1a2332] rounded border border-[#14b8a6]/30 text-center flex-shrink-0">
        <div className="text-[10px] text-[#e8fbff]/50 uppercase">{label}</div>
        <div className="text-sm font-bold" style={{ color: colorMap[color] || colorMap.white }}>{value}</div>
      </div>
    );
  }
  
  return (
    <div className="px-4 py-2 bg-[#1a2332] rounded border border-[#14b8a6]/30 text-center min-w-[80px]">
      <div className="text-[10px] text-[#e8fbff]/50 uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold" style={{ color: colorMap[color] || colorMap.white }}>{value}</div>
    </div>
  );
};

export function GestioneHubMapWrapper({ routeConfig, navigationMode }: GestioneHubMapWrapperProps) {
  // Stati principali
  const [mode, setMode] = useState<'mercato' | 'hub'>('hub');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [hubs, setHubs] = useState<HubLocation[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedHub, setSelectedHub] = useState<HubLocation | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [stallsData, setStallsData] = useState<any[]>([]);
  const [allStalls, setAllStalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selezione geografica
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

  // Rileva se smartphone (per layout mobile)
  const [isMobile, setIsMobile] = useState(false);
  
  // NUOVO: Stato per mappa fullscreen mobile
  const [showMobileFullscreenMap, setShowMobileFullscreenMap] = useState(false);

  // Statistiche aggregate (Italia/Regione/Provincia)
  const [marketStats, setMarketStats] = useState<{
    markets: number;
    totali: number;
    occupati: number;
    assegnazione: number;
    liberi: number;
    area_totale: number;
  } | null>(null);

  // Carica dati iniziali
  useEffect(() => {
    loadData();
    loadRegioni();
    loadMarketStats();
  }, []);

  // Ricarica statistiche quando cambia regione/provincia selezionata
  useEffect(() => {
    if (mode === 'mercato') {
      loadMarketStats(selectedRegione?.id, selectedProvincia?.id);
    }
  }, [mode, selectedRegione?.id, selectedProvincia?.id]);

  // Rileva se smartphone per layout mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Carica statistiche aggregate mercati (con filtri opzionali)
  const loadMarketStats = async (regioneId?: number, provinciaId?: number) => {
    try {
      let url = `${MIHUB_API_BASE_URL}/api/stalls/stats/totals`;
      const params = new URLSearchParams();
      if (provinciaId) {
        params.append('provincia_id', provinciaId.toString());
      } else if (regioneId) {
        params.append('regione_id', regioneId.toString());
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const response = await res.json();
        if (response.success && response.data) {
          setMarketStats(response.data);
          console.log('[GestioneHubMapWrapper] Loaded market stats:', response.data);
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading market stats:', error);
    }
  };

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
          console.log('[GestioneHubMapWrapper] Loaded', hubsResponse.data.length, 'hubs');
        } else {
          setHubs([]);
        }
      }

      // Carica TUTTI i posteggi di TUTTI i mercati (per calcolo Area mq)
      const allStallsRes = await fetch(`${MIHUB_API_BASE_URL}/api/stalls`);
      if (allStallsRes.ok) {
        const allStallsResponse = await allStallsRes.json();
        if (allStallsResponse.success && Array.isArray(allStallsResponse.data)) {
          setAllStalls(allStallsResponse.data);
          console.log('[GestioneHubMapWrapper] Loaded', allStallsResponse.data.length, 'total stalls for area calculation');
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegioni = async () => {
    setLoadingRegioni(true);
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/geo/regioni`);
      if (res.ok) {
        const response = await res.json();
        if (response.success && Array.isArray(response.data)) {
          setRegioni(response.data);
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading regioni:', error);
    } finally {
      setLoadingRegioni(false);
    }
  };

  const loadProvince = async (regioneId: number) => {
    setLoadingProvince(true);
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/geo/province?regione_id=${regioneId}`);
      if (res.ok) {
        const response = await res.json();
        if (response.success && Array.isArray(response.data)) {
          setProvince(response.data);
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading province:', error);
    } finally {
      setLoadingProvince(false);
    }
  };

  // Gestione selezione regione
  const handleRegioneSelect = (regione: Regione) => {
    setSelectedRegione(regione);
    setSelectedProvincia(null);
    loadProvince(regione.id);
    
    // Centra mappa sulla regione (coordinate approssimative)
    const regioniCoords: Record<string, [number, number]> = {
      'Lombardia': [45.4654, 9.1859],
      'Lazio': [41.9028, 12.4964],
      'Campania': [40.8518, 14.2681],
      'Sicilia': [37.5999, 14.0154],
      'Veneto': [45.4408, 12.3155],
      'Emilia-Romagna': [44.4949, 11.3426],
      'Piemonte': [45.0703, 7.6869],
      'Puglia': [41.1257, 16.8666],
      'Toscana': [43.7711, 11.2486],
      'Calabria': [38.9060, 16.5942],
      'Sardegna': [40.1209, 9.0129],
      'Liguria': [44.4056, 8.9463],
      'Marche': [43.6158, 13.5189],
      'Abruzzo': [42.3505, 13.3995],
      'Friuli-Venezia Giulia': [45.6495, 13.7768],
      'Trentino-Alto Adige': [46.0679, 11.1211],
      'Umbria': [42.8563, 12.3547],
      'Basilicata': [40.6333, 15.8000],
      'Molise': [41.5609, 14.6684],
      "Valle d'Aosta": [45.7370, 7.3206]
    };
    
    const coords = regioniCoords[regione.nome];
    if (coords) {
      setCustomCenter(coords);
      setCustomZoom(8);
      setShowItalyView(false);
      setViewTrigger(prev => prev + 1);
    }
  };

  // Gestione selezione provincia
  const handleProvinciaSelect = (provincia: Provincia) => {
    setSelectedProvincia(provincia);
    
    // Centra mappa sulla provincia
    // Per ora usiamo coordinate approssimative basate su capoluoghi
    const provinceCoords: Record<string, [number, number]> = {
      'MI': [45.4642, 9.1900],
      'RM': [41.9028, 12.4964],
      'NA': [40.8518, 14.2681],
      'TO': [45.0703, 7.6869],
      'PA': [38.1157, 13.3615],
      'GE': [44.4056, 8.9463],
      'BO': [44.4949, 11.3426],
      'FI': [43.7696, 11.2558],
      'VE': [45.4408, 12.3155],
      'BA': [41.1171, 16.8719],
      // Aggiungi altre province se necessario
    };
    
    const coords = provinceCoords[provincia.sigla];
    if (coords) {
      setCustomCenter(coords);
      setCustomZoom(10);
      setShowItalyView(false);
      setViewTrigger(prev => prev + 1);
    }
  };

  // Reset filtri geografici
  const handleResetGeo = () => {
    setSelectedRegione(null);
    setSelectedProvincia(null);
    setProvince([]);
    setCustomCenter(null);
    setCustomZoom(null);
    setShowItalyView(true);
    setViewTrigger(prev => prev + 1);
  };

  // Filtra mercati/hub in base a ricerca e selezione geografica
  const filteredMarkets = useMemo(() => {
    let filtered = markets;
    
    // Filtra per ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.comune?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [markets, searchQuery]);

  const filteredHubs = useMemo(() => {
    let filtered = hubs;
    
    // Filtra per ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(query) ||
        h.city?.toLowerCase().includes(query)
      );
    }
    
    // Filtra per regione
    if (selectedRegione) {
      filtered = filtered.filter(h => h.regione_id === selectedRegione.id);
    }
    
    // Filtra per provincia
    if (selectedProvincia) {
      filtered = filtered.filter(h => h.provincia_id === selectedProvincia.id);
    }
    
    return filtered;
  }, [hubs, searchQuery, selectedRegione, selectedProvincia]);

  // Gestione click mercato
  const handleMarketClick = async (marketId: number) => {
    const market = markets.find(m => m.id === marketId);
    if (!market) return;
    
    setSelectedMarket(market);
    setSelectedHub(null);
    setShowItalyView(false);
    setViewTrigger(prev => prev + 1);
    
    // MOBILE: Apri mappa fullscreen quando si seleziona un mercato
    if (isMobile) {
      setShowMobileFullscreenMap(true);
    }
    
    // Carica posteggi del mercato
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/stalls?market_id=${marketId}`);
      if (res.ok) {
        const response = await res.json();
        if (response.success && Array.isArray(response.data)) {
          setStallsData(response.data);
          
          // Crea mapData per il componente mappa
          const lat = parseFloat(String(market.latitude)) || 42.5;
          const lng = parseFloat(String(market.longitude)) || 12.5;
          
          setMapData({
            center: { lat, lng },
            stalls_geojson: {
              type: 'FeatureCollection',
              features: response.data.map((stall: any) => ({
                type: 'Feature',
                properties: {
                  id: stall.id,
                  number: stall.number,
                  status: stall.status,
                  area_sqm: stall.area_sqm
                },
                geometry: stall.geojson?.geometry || null
              })).filter((f: any) => f.geometry)
            }
          });
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading stalls:', error);
    }
  };

  // Gestione click HUB
  const handleHubClick = async (hubId: number) => {
    const hub = hubs.find(h => h.id === hubId);
    if (!hub) return;
    
    setSelectedHub(hub);
    setSelectedMarket(null);
    setShowItalyView(false);
    setViewTrigger(prev => prev + 1);
    
    // MOBILE: Apri mappa fullscreen quando si seleziona un hub
    if (isMobile) {
      setShowMobileFullscreenMap(true);
    }
    
    // Carica dettagli HUB con negozi
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/hub/locations/${hubId}`);
      if (res.ok) {
        const response = await res.json();
        if (response.success && response.data) {
          setSelectedHub(response.data);
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading hub details:', error);
    }
  };

  // Gestione click negozio
  const handleShopClick = (shop: HubShop) => {
    toast.info(`Negozio: ${shop.name}`, {
      description: shop.category || 'Categoria non specificata'
    });
  };

  // Torna a vista Italia
  const handleBackToItaly = () => {
    setSelectedMarket(null);
    setSelectedHub(null);
    setMapData(null);
    setStallsData([]);
    setShowItalyView(true);
    setViewTrigger(prev => prev + 1);
  };

  // Torna indietro (da provincia a regione, da regione a Italia)
  const handleGoBack = () => {
    if (selectedProvincia) {
      setSelectedProvincia(null);
      // Torna a vista regione
      if (selectedRegione) {
        handleRegioneSelect(selectedRegione);
      }
    } else if (selectedRegione) {
      handleResetGeo();
    }
  };

  // Calcola statistiche correnti
  const stats = useMemo(() => {
    if (mode === 'mercato') {
      // Usa statistiche aggregate dal backend se disponibili
      if (marketStats) {
        return {
          mercati: marketStats.markets,
          totali: marketStats.totali,
          occupati: marketStats.occupati,
          assegnazione: marketStats.assegnazione,
          liberi: marketStats.liberi
        };
      }
      // Fallback: calcola da dati locali
      const totalStalls = allStalls.length;
      const occupati = allStalls.filter(s => s.status === 'occupato').length;
      const assegnazione = allStalls.filter(s => s.status === 'assegnazione').length;
      const liberi = allStalls.filter(s => s.status === 'libero').length;
      return {
        mercati: filteredMarkets.length,
        totali: totalStalls,
        occupati,
        assegnazione,
        liberi
      };
    } else {
      // Modalità HUB
      const totalShops = filteredHubs.reduce((acc, hub) => acc + (hub.shops?.length || 0), 0);
      const activeShops = filteredHubs.reduce((acc, hub) => 
        acc + (hub.shops?.filter(s => s.status === 'attivo').length || 0), 0);
      return {
        mercati: filteredHubs.length,
        totali: totalShops,
        occupati: activeShops,
        assegnazione: 0,
        liberi: totalShops - activeShops
      };
    }
  }, [mode, filteredMarkets, filteredHubs, allStalls, marketStats]);

  // Calcola area totale in base ai filtri
  const areaTotal = useMemo(() => {
    if (mode === 'mercato') {
      // Usa area dal backend se disponibile
      if (marketStats?.area_totale) {
        return marketStats.area_totale;
      }
      // Fallback: calcola da dati locali
      return allStalls.reduce((acc, stall) => acc + (stall.area_sqm || 0), 0);
    } else {
      // Per HUB, somma le aree degli HUB filtrati
      return filteredHubs.reduce((acc, hub) => acc + (hub.area_sqm || 0), 0);
    }
  }, [mode, allStalls, filteredHubs, marketStats]);

  // Lista corrente (mercati o hub)
  const currentList = mode === 'mercato' ? filteredMarkets : filteredHubs;
  const selectedItem = mode === 'mercato' ? selectedMarket : selectedHub;

  // Label vista corrente
  const currentViewLabel = useMemo(() => {
    if (selectedProvincia) return selectedProvincia.nome;
    if (selectedRegione) return selectedRegione.nome;
    return 'Italia';
  }, [selectedRegione, selectedProvincia]);

  // Coordinate correnti per display
  const currentCoords = useMemo(() => {
    if (selectedItem) {
      if (mode === 'mercato' && selectedMarket) {
        return {
          lat: parseFloat(String(selectedMarket.latitude)).toFixed(4),
          lng: parseFloat(String(selectedMarket.longitude)).toFixed(4)
        };
      }
      if (mode === 'hub' && selectedHub) {
        const lat = selectedHub.center_lat || selectedHub.lat || selectedHub.latitude;
        const lng = selectedHub.center_lng || selectedHub.lng || selectedHub.longitude;
        return {
          lat: parseFloat(String(lat)).toFixed(4),
          lng: parseFloat(String(lng)).toFixed(4)
        };
      }
    }
    return { lat: '42.5000', lng: '12.5000' };
  }, [selectedItem, selectedMarket, selectedHub, mode]);

  // Può tornare indietro?
  const canGoBack = selectedRegione !== null || selectedProvincia !== null;

  // Formatta area con separatore migliaia (senza decimali)
  const formatArea = (area: number): string => {
    if (area === 0) return '—';
    // Arrotonda a intero e formatta con punto come separatore migliaia
    return Math.round(area).toLocaleString('it-IT', { maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
        <span className="ml-2 text-[#e8fbff]">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {/* ==================== MOBILE: Mappa Fullscreen ==================== */}
      {isMobile && showMobileFullscreenMap && (
        <div className="fixed inset-0 z-50 bg-[#0b1220]">
          {/* Header controlli mappa fullscreen */}
          <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between bg-gradient-to-b from-[#0b1220] to-transparent">
            {/* Freccia indietro */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFullscreenMap(false)}
              className="bg-[#1a2332]/80 backdrop-blur-sm text-[#e8fbff] hover:bg-[#1a2332] border border-[#14b8a6]/30 h-10 px-3"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Indietro
            </Button>
            
            {/* Pulsante Vista Italia */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleBackToItaly();
                setShowItalyView(true);
                setViewTrigger(prev => prev + 1);
              }}
              className="bg-[#1a2332]/80 backdrop-blur-sm text-[#14b8a6] hover:bg-[#1a2332] border border-[#14b8a6]/30 h-10 px-3"
            >
              <MapPin className="h-5 w-5 mr-1" />
              Vista Italia
            </Button>
          </div>
          
          {/* Nome elemento selezionato */}
          {selectedItem && (
            <div className="absolute top-16 left-3 right-3 z-10">
              <div className="bg-[#1a2332]/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-[#14b8a6]/30">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: mode === 'hub' ? '#9C27B0' : '#ef4444' }}
                  >
                    {mode === 'mercato' ? 'M' : 'H'}
                  </span>
                  <span className="text-[#e8fbff] font-medium">{selectedItem.name}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Mappa fullscreen */}
          <div className="h-full w-full">
            <MapWithTransportLayer
              referencePoint={(() => {
                if (mode === 'hub' && selectedHub) {
                  const lat = parseFloat(String(selectedHub.lat || selectedHub.latitude)) || 0;
                  const lng = parseFloat(String(selectedHub.lng || selectedHub.longitude)) || 0;
                  if (lat && lng) {
                    return { lat, lng, name: selectedHub.name, type: 'hub' as const };
                  }
                }
                if (mode === 'mercato' && selectedMarket) {
                  const lat = parseFloat(String(selectedMarket.latitude)) || 0;
                  const lng = parseFloat(String(selectedMarket.longitude)) || 0;
                  if (lat && lng) {
                    return { lat, lng, name: selectedMarket.name, type: 'mercato' as const };
                  }
                }
                return undefined;
              })()}
              searchRadiusKm={2}
              togglePosition="bottom-left"
              className="h-full"
            >
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
                hubCenterFixed={selectedHub ? (
                  selectedHub.center_lat && selectedHub.center_lng ? [
                    parseFloat(String(selectedHub.center_lat)) || 42.5,
                    parseFloat(String(selectedHub.center_lng)) || 12.5
                  ] : selectedHub.lat && selectedHub.lng ? [
                    parseFloat(String(selectedHub.lat)) || 42.5,
                    parseFloat(String(selectedHub.lng)) || 12.5
                  ] : customCenter || undefined
                ) : customCenter || undefined}
                customZoom={customZoom || undefined}
                routeConfig={routeConfig}
                navigationMode={navigationMode}
              />
            </MapWithTransportLayer>
          </div>
        </div>
      )}

      {/* ==================== MOBILE: Header compatto indicatori ==================== */}
      {isMobile && (
        <div className="sm:hidden flex items-center gap-2 overflow-x-auto pb-1">
          <StatIndicator 
            label={mode === 'mercato' ? 'Mercati' : 'HUB'} 
            value={stats.mercati} 
            color={mode === 'mercato' ? 'red' : 'purple'} 
            compact 
          />
          <StatIndicator 
            label={mode === 'mercato' ? 'Posteggi' : 'Negozi'} 
            value={stats.totali} 
            color="white" 
            compact 
          />
          <StatIndicator 
            label={mode === 'mercato' ? 'Occupati' : 'Attivi'} 
            value={stats.occupati} 
            color={mode === 'mercato' ? 'red' : 'green'} 
            compact 
          />
          <StatIndicator 
            label={mode === 'mercato' ? 'Liberi' : 'Inattivi'} 
            value={stats.liberi} 
            color={mode === 'mercato' ? 'green' : 'white'} 
            compact 
          />
        </div>
      )}

      {/* ==================== PC/TABLET: Header originale con indicatori ==================== */}
      <div className={`${isMobile ? 'hidden' : 'flex'} flex-wrap items-center gap-4 bg-[#0b1220] rounded-lg p-4 border border-[#14b8a6]/30`}>
        {/* Titolo e Vista - come primo indicatore */}
        <div className="px-5 py-2 bg-[#1a2332] rounded border border-[#14b8a6]/40 min-w-[280px] flex-shrink-0">
          <div className="text-xs text-white uppercase tracking-wider font-bold">GEMELLO DIGITALE DEL COMMERCIO</div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-medium ${mode === 'mercato' ? 'text-[#ef4444]' : 'text-[#9C27B0]'}`}>
              {mode === 'mercato' ? 'MERCATO:' : 'HUB:'}
            </span>
            <span className="text-sm font-semibold text-[#e8fbff] truncate max-w-[120px]">{currentViewLabel}</span>
          </div>
        </div>

        {/* Indicatori */}
        <StatIndicator 
          label={mode === 'mercato' ? 'Mercati' : 'HUB'} 
          value={stats.mercati} 
          color={mode === 'mercato' ? 'red' : 'purple'} 
        />
        <StatIndicator 
          label={mode === 'mercato' ? 'Posteggi' : 'Negozi'} 
          value={stats.totali} 
          color="white" 
        />
        <StatIndicator 
          label={mode === 'mercato' ? 'Occupati' : 'Attivi'} 
          value={stats.occupati} 
          color={mode === 'mercato' ? 'red' : 'green'} 
        />
        {mode === 'mercato' && (
          <StatIndicator label="Assegn." value={stats.assegnazione} color="amber" />
        )}
        <StatIndicator 
          label={mode === 'mercato' ? 'Liberi' : 'Inattivi'} 
          value={stats.liberi} 
          color={mode === 'mercato' ? 'green' : 'white'} 
        />
        
        {/* Coordinate GPS */}
        <div className="px-5 py-2 bg-[#1a2332] rounded border border-[#e8fbff]/20 text-center min-w-[180px] ml-auto">
          <div className="text-[10px] text-[#e8fbff]/50 uppercase tracking-wider">Coordinate GPS</div>
          <div className="text-sm font-mono text-[#14b8a6]">
            {currentCoords.lat} | {currentCoords.lng}
          </div>
        </div>
      </div>

      {/* ==================== Barra controlli ==================== */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Selettore Mercato/HUB - MOBILE: trasparente con bordo */}
        <div className={`flex rounded-lg p-1 border ${isMobile ? 'bg-transparent border-border/40' : 'bg-[#0b1220] border-[#14b8a6]/30'}`}>
          <Button
            variant={mode === 'mercato' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMode('mercato'); handleBackToItaly(); }}
            className={mode === 'mercato' 
              ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white h-8 text-sm' 
              : `${isMobile ? 'text-[#e8fbff]/70 hover:text-[#e8fbff] bg-transparent' : 'text-[#e8fbff]/70 hover:text-[#e8fbff]'} h-8 text-sm`
            }
          >
            <Store className="h-3 w-3 mr-1" />
            Mercati ({markets.length})
          </Button>
          <Button
            variant={mode === 'hub' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMode('hub'); handleBackToItaly(); }}
            className={mode === 'hub' 
              ? 'bg-[#9C27B0] hover:bg-[#7B1FA2] text-white h-8 text-sm' 
              : `${isMobile ? 'text-[#e8fbff]/70 hover:text-[#e8fbff] bg-transparent' : 'text-[#e8fbff]/70 hover:text-[#e8fbff]'} h-8 text-sm`
            }
          >
            <Building2 className="h-3 w-3 mr-1" />
            HUB ({hubs.length})
          </Button>
        </div>

        {/* Ricerca */}
        <div className="flex-1 min-w-[180px] max-w-[300px]">
          <Input
            placeholder={`Cerca ${mode === 'mercato' ? 'mercato' : 'hub'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff] h-8 text-sm"
          />
        </div>

        {/* Pulsante Vista Italia - NASCOSTO su mobile */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetGeo}
          className={`${isMobile ? 'hidden' : 'flex'} text-[#14b8a6] border-[#14b8a6]/50 hover:bg-[#14b8a6]/20 h-8 text-sm`}
        >
          <MapPin className="h-4 w-4 mr-1" />
          Vista Italia
        </Button>

        {/* Dropdown Regione - MOBILE: trasparente con bordo */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 text-sm ${isMobile 
                ? `bg-transparent border border-border/40 ${selectedRegione ? 'text-[#14b8a6]' : 'text-[#e8fbff]'}` 
                : `border-[#14b8a6]/30 ${selectedRegione ? 'bg-[#14b8a6]/20 text-[#14b8a6]' : 'text-[#e8fbff]'}`
              }`}
            >
              <Map className="h-3 w-3 mr-1" />
              {selectedRegione ? selectedRegione.nome : 'Regione'}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a2332] border-[#14b8a6]/30 max-h-[300px] overflow-y-auto z-[9999]" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <DropdownMenuLabel className="text-[#e8fbff]/60 text-xs">Seleziona Regione</DropdownMenuLabel>
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
                  className={`text-[#e8fbff] hover:bg-[#14b8a6]/20 cursor-pointer text-xs ${
                    selectedRegione?.id === regione.id ? 'bg-[#14b8a6]/30' : ''
                  }`}
                >
                  <div className="flex justify-between w-full">
                    <span>{regione.nome}</span>
                    <span className="text-[#e8fbff]/50 text-[10px] ml-2">
                      {regione.province_count} prov.
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown Provincia - MOBILE: trasparente con bordo */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedRegione}
              className={`h-8 text-sm ${!selectedRegione ? 'opacity-50' : ''} ${isMobile 
                ? `bg-transparent border border-border/40 ${selectedProvincia ? 'text-[#f59e0b]' : 'text-[#e8fbff]'}` 
                : `border-[#14b8a6]/30 ${selectedProvincia ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#e8fbff]'}`
              }`}
            >
              <Navigation className="h-3 w-3 mr-1" />
              {selectedProvincia ? `${selectedProvincia.sigla}` : 'Prov.'}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a2332] border-[#14b8a6]/30 max-h-[300px] overflow-y-auto z-[9999]" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <DropdownMenuLabel className="text-[#e8fbff]/60 text-xs">
              Province di {selectedRegione?.nome || '...'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#14b8a6]/20" />
            {loadingProvince ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#14b8a6]" />
              </div>
            ) : (
              province.map((provincia) => (
                <DropdownMenuItem
                  key={provincia.id}
                  onClick={() => handleProvinciaSelect(provincia)}
                  className={`text-[#e8fbff] hover:bg-[#f59e0b]/20 cursor-pointer text-xs ${
                    selectedProvincia?.id === provincia.id ? 'bg-[#f59e0b]/30' : ''
                  }`}
                >
                  <div className="flex justify-between w-full">
                    <span>{provincia.nome}</span>
                    <span className="text-[#e8fbff]/50 text-[10px] ml-2">
                      {provincia.sigla}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Pulsante Indietro */}
        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="text-[#f59e0b] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 h-8 text-sm"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Indietro
          </Button>
        )}

        {/* Indicatore Area (mq) - NASCOSTO su mobile */}
        <div className={`${isMobile ? 'hidden' : 'flex'} px-3 py-1 bg-[#0b1220] rounded border border-[#14b8a6]/40 text-center h-8 items-center gap-2`}>
          <span className="text-[10px] text-[#e8fbff]/50 uppercase tracking-wider">Area:</span>
          <span className="text-sm font-bold text-[#14b8a6]">{formatArea(areaTotal)} mq</span>
        </div>


      </div>

      {/* Lista elementi - Card più grandi con colori per livello HUB */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {currentList.map((item) => {
          // Determina colore in base al livello HUB
          const getHubCardColor = (hub: HubLocation) => {
            switch (hub.livello) {
              case 'capoluogo': return '#9C27B0'; // Viola pieno
              case 'provincia': return '#BA68C8'; // Viola chiaro
              case 'comune': return '#CE93D8';    // Viola pallido
              default: return '#9C27B0';          // Default viola pieno
            }
          };
          const hubColor = mode === 'hub' ? getHubCardColor(item as HubLocation) : '#ef4444';
          
          return (
          <div 
            key={item.id}
            className={`min-w-[160px] cursor-pointer transition-all rounded-lg p-3 border ${
              selectedItem?.id === item.id 
                ? mode === 'mercato' 
                  ? 'border-[#ef4444] bg-[#ef4444]/10' 
                  : `bg-opacity-10`
                : 'border-[#14b8a6]/30 bg-[#1a2332] hover:border-[#14b8a6]/50'
            }`}
            style={{
              borderColor: selectedItem?.id === item.id && mode === 'hub' ? hubColor : undefined,
              backgroundColor: selectedItem?.id === item.id && mode === 'hub' ? `${hubColor}20` : undefined
            }}
            onClick={() => mode === 'mercato' 
              ? handleMarketClick(item.id) 
              : handleHubClick(item.id)
            }
          >
            <div className="flex items-center gap-2">
              <span 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: mode === 'hub' ? hubColor : '#ef4444' }}
              >
                {mode === 'mercato' ? 'M' : 'H'}
              </span>
              <span className="text-[#e8fbff] font-medium text-sm truncate">
                {item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name}
              </span>
            </div>
            <div className="text-[#e8fbff]/50 text-xs ml-8 truncate mt-1">
              {mode === 'mercato' 
                ? (item as Market).comune || 'Italia'
                : (item as HubLocation).city || 'Italia'
              }
            </div>
          </div>
        );
        })}
      </div>

      {/* Mappa - NASCOSTA su mobile (si apre fullscreen al click) */}
      <div className={`${isMobile ? 'hidden' : 'block'} h-[calc(100vh-320px)] min-h-[500px] rounded-lg overflow-hidden border border-[#14b8a6]/30`}>
        <MapWithTransportLayer
          referencePoint={(() => {
            // Determina il punto di riferimento corrente (HUB o Mercato selezionato)
            if (mode === 'hub' && selectedHub) {
              const lat = parseFloat(String(selectedHub.lat || selectedHub.latitude)) || 0;
              const lng = parseFloat(String(selectedHub.lng || selectedHub.longitude)) || 0;
              if (lat && lng) {
                return { lat, lng, name: selectedHub.name, type: 'hub' as const };
              }
            }
            if (mode === 'mercato' && selectedMarket) {
              const lat = parseFloat(String(selectedMarket.latitude)) || 0;
              const lng = parseFloat(String(selectedMarket.longitude)) || 0;
              if (lat && lng) {
                return { lat, lng, name: selectedMarket.name, type: 'mercato' as const };
              }
            }
            return undefined;
          })()}
          searchRadiusKm={2}
          togglePosition="bottom-left"
          className="h-full"
        >
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
          hubCenterFixed={selectedHub ? (
            // Usa center_lat/center_lng se disponibili, altrimenti lat/lng
            selectedHub.center_lat && selectedHub.center_lng ? [
              parseFloat(String(selectedHub.center_lat)) || 42.5,
              parseFloat(String(selectedHub.center_lng)) || 12.5
            ] : selectedHub.lat && selectedHub.lng ? [
              parseFloat(String(selectedHub.lat)) || 42.5,
              parseFloat(String(selectedHub.lng)) || 12.5
            ] : customCenter || undefined
          ) : customCenter || undefined}
          customZoom={customZoom || undefined}
          routeConfig={routeConfig}
          navigationMode={navigationMode}
        />
        </MapWithTransportLayer>
      </div>
    </div>
  );
}

// Export default per compatibilità con import esistenti
export default GestioneHubMapWrapper;
