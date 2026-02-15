/**
 * GestioneHubMapWrapper.tsx
 * 
 * Wrapper per HubMarketMapComponent con selettore Mercato/HUB
 * Gestisce il caricamento dati e lo switch tra modalità
 * 
 * v3.23.0 - Redesign compatto con indicatori sempre visibili
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

// Componente indicatore compatto
const StatIndicator = ({ 
  label, 
  value, 
  color = 'cyan' 
}: { 
  label: string; 
  value: number | string; 
  color?: 'cyan' | 'red' | 'amber' | 'green' | 'purple' | 'white' 
}) => {
  const colorClasses = {
    cyan: 'border-[#14b8a6]/40 text-[#14b8a6]',
    red: 'border-[#ef4444]/40 text-[#ef4444]',
    amber: 'border-[#f59e0b]/40 text-[#f59e0b]',
    green: 'border-[#10b981]/40 text-[#10b981]',
    purple: 'border-[#9C27B0]/40 text-[#9C27B0]',
    white: 'border-[#e8fbff]/30 text-[#e8fbff]',
  };

  return (
    <div className={`px-1.5 sm:px-5 py-1 sm:py-2 bg-[#0b1220] rounded border ${colorClasses[color]} flex-1 text-center`}>
      <div className="text-[7px] sm:text-[10px] text-[#e8fbff]/50 uppercase tracking-wider truncate">{label}</div>
      <div className="text-sm sm:text-2xl font-bold">{value}</div>
    </div>
  );
};

export default function GestioneHubMapWrapper({ routeConfig, navigationMode }: GestioneHubMapWrapperProps = {}) {
  console.log('[DEBUG GestioneHubMapWrapper] routeConfig ricevuto:', routeConfig);
  console.log('[DEBUG GestioneHubMapWrapper] navigationMode ricevuto:', navigationMode);
  // Stati
  const [mode, setMode] = useState<'mercato' | 'hub'>('hub');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dati Mercati
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [stallsData, setStallsData] = useState<any[]>([]); // Posteggi del mercato selezionato
  const [allStallsData, setAllStallsData] = useState<any[]>([]); // TUTTI i posteggi di TUTTI i mercati
  
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

  // Rileva se smartphone (per layout mobile)
  const [isMobile, setIsMobile] = useState(false);
  
  // Stato per mostrare mappa fullscreen su mobile
  const [showMobileMap, setShowMobileMap] = useState(false);
  
  // Stato per vista zoom (true = zoom mercato/hub, false = vista Italia)
  const [mobileMapZoomed, setMobileMapZoomed] = useState(true);
  
  // ViewTrigger separato per mappa mobile (evita animazioni al mount)
  const [mobileViewTrigger, setMobileViewTrigger] = useState(0);

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
          setAllStallsData(allStallsResponse.data);
          console.log('[GestioneHubMapWrapper] Loaded', allStallsResponse.data.length, 'total stalls for area calculation');
        } else {
          setAllStallsData([]);
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading data:', error);
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
        }
      }
    } catch (error) {
      console.error('[GestioneHubMapWrapper] Error loading regioni:', error);
    } finally {
      setLoadingRegioni(false);
    }
  };

  // Carica province per regione
  const loadProvince = async (regioneId: number) => {
    setLoadingProvince(true);
    try {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/regioni/${regioneId}/province`);
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
    
    // Scroll alla mappa su mobile
    if (window.innerWidth < 640) {
      setTimeout(() => {
        const el = document.getElementById('map-container');
        if (el) { const r = el.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'smooth' }); }
      }, 100);
    }
    
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
    
    // Scroll alla mappa su mobile
    if (window.innerWidth < 640) {
      setTimeout(() => {
        const el = document.getElementById('map-container');
        if (el) { const r = el.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'smooth' }); }
      }, 100);
    }
    
    toast.success(`Vista: ${provincia.nome} (${provincia.sigla})`);
  };

  // Navigazione indietro
  const handleGoBack = () => {
    if (selectedMarket || selectedHub) {
      // Da mercato/hub specifico → torna a vista regione o Italia
      setSelectedMarket(null);
      setSelectedHub(null);
      setMapData(null);
      setStallsData([]);
      if (selectedProvincia) {
        const lat = parseFloat(String(selectedProvincia.lat));
        const lng = parseFloat(String(selectedProvincia.lng));
        setCustomCenter([lat, lng]);
        setCustomZoom(selectedProvincia.zoom);
      } else if (selectedRegione) {
        const lat = parseFloat(String(selectedRegione.lat));
        const lng = parseFloat(String(selectedRegione.lng));
        setCustomCenter([lat, lng]);
        setCustomZoom(selectedRegione.zoom);
      } else {
        setShowItalyView(true);
        setCustomCenter(null);
        setCustomZoom(null);
      }
      setViewTrigger(prev => prev + 1);
      // Scroll alla mappa su mobile
      if (window.innerWidth < 640) {
        setTimeout(() => {
          const el = document.getElementById('map-container');
          if (el) { const r = el.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'smooth' }); }
        }, 100);
      }
      toast.success('Vista precedente');
    } else if (selectedProvincia) {
      // Da provincia → torna a regione
      setSelectedProvincia(null);
      if (selectedRegione) {
        const lat = parseFloat(String(selectedRegione.lat));
        const lng = parseFloat(String(selectedRegione.lng));
        setCustomCenter([lat, lng]);
        setCustomZoom(selectedRegione.zoom);
        setViewTrigger(prev => prev + 1);
        // Scroll alla mappa su mobile
        if (window.innerWidth < 640) {
          setTimeout(() => {
            const el = document.getElementById('map-container');
            if (el) { const r = el.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'smooth' }); }
          }, 100);
        }
        toast.success(`Vista: ${selectedRegione.nome}`);
      }
    } else if (selectedRegione) {
      // Da regione → torna a Italia
      setSelectedRegione(null);
      setProvince([]);
      setCustomCenter(null);
      setCustomZoom(null);
      setShowItalyView(true);
      setViewTrigger(prev => prev + 1);
      // Scroll alla mappa su mobile
      if (window.innerWidth < 640) {
        setTimeout(() => {
          const el = document.getElementById('map-container');
          if (el) { const r = el.getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'smooth' }); }
        }, 100);
      }
      toast.success('Vista Italia');
    }
  };

  // Reset navigazione geografica - torna a vista Italia
  const handleResetGeo = () => {
    setSelectedRegione(null);
    setSelectedProvincia(null);
    setSelectedMarket(null);
    setSelectedHub(null);
    setProvince([]);
    setCustomCenter(null);
    setCustomZoom(null);
    setMapData(null);
    setStallsData([]);
    setShowItalyView(true);
    setViewTrigger(prev => prev + 1);
    toast.success('Vista Italia');
  };

  // Gestione click su mercato
  const handleMarketClick = async (marketId: number) => {
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    setSelectedMarket(market);
    setSelectedHub(null);

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
        if (stallsResponse.success && Array.isArray(stallsResponse.data)) {
          setStallsData(stallsResponse.data);
          console.log('[GestioneHubMapWrapper] Loaded', stallsResponse.data.length, 'stalls');
        }
      }
    // Su mobile: scrolla alla mappa lasciando visibile Indietro + lista hub
      if (isMobile) {
        const mapElement = document.getElementById('map-container');
        if (mapElement) {
          const rect = mapElement.getBoundingClientRect();
          const offset = 120; // Lascia spazio per Indietro + lista hub
          window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
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
    setSelectedMarket(null);
    setMapData(null);
    setStallsData([]);
    setShowItalyView(false);
    
    // Centra la mappa sulle coordinate dell'HUB
    if (hub.center_lat && hub.center_lng) {
      setCustomCenter([Number(hub.center_lat), Number(hub.center_lng)]);
      setCustomZoom(15); // Zoom ravvicinato per vedere l'area HUB
    }
    
    setViewTrigger(prev => prev + 1);
    
    // Su mobile: scrolla alla mappa lasciando visibile Indietro + lista hub
    if (isMobile) {
      const mapElement = document.getElementById('map-container');
      if (mapElement) {
        const rect = mapElement.getBoundingClientRect();
        const offset = 120; // Lascia spazio per Indietro + lista hub
        window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
      }
    }
  };

  // Gestione click su shop
  const handleShopClick = (shopId: number) => {
    console.log('[GestioneHubMapWrapper] Shop clicked:', shopId);
  };

  // Torna a vista Italia
  const handleBackToItaly = () => {
    handleResetGeo();
  };

  // Vai a dettaglio
  const handleGoToDetail = () => {
    if (selectedItem) {
      setShowItalyView(false);
      setViewTrigger(prev => prev + 1);
    }
  };

  // Filtra elementi
  const filteredMarkets = useMemo(() => {
    return markets.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.comune && m.comune.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [markets, searchQuery]);

  const filteredHubs = useMemo(() => {
    // Prima filtra per ricerca
    let filtered = hubs.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.city && h.city.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Poi filtra per visibilità in base a regione/provincia selezionata
    // Vista Italia: mostra solo capoluoghi
    // Vista Regione: mostra capoluoghi + province della regione
    // Vista Provincia: mostra tutti gli HUB della provincia
    if (selectedProvincia) {
      // Vista Provincia: mostra tutti gli HUB di quella provincia
      filtered = filtered.filter(h => h.provincia_id === selectedProvincia.id);
    } else if (selectedRegione) {
      // Vista Regione: mostra capoluoghi + province (livello != 'comune')
      filtered = filtered.filter(h => 
        h.regione_id === selectedRegione.id && 
        (h.livello === 'capoluogo' || h.livello === 'provincia')
      );
    } else {
      // Vista Italia: mostra capoluoghi + HUB con area configurata
      filtered = filtered.filter(h => 
        h.livello === 'capoluogo' || 
        !h.livello || 
        h.area_geojson  // Mostra anche HUB con area configurata
      );
    }
    
    return filtered;
  }, [hubs, searchQuery, selectedRegione, selectedProvincia]);

  const currentList = mode === 'mercato' ? filteredMarkets : filteredHubs;
  const selectedItem = mode === 'mercato' ? selectedMarket : selectedHub;

  // Calcola statistiche dinamiche
  const stats = useMemo(() => {
    if (mode === 'mercato') {
      if (selectedMarket && stallsData.length > 0) {
        // Statistiche mercato specifico
        const activeStalls = stallsData.filter(s => s.is_active === true);
        return {
          mercati: 1,
          totali: activeStalls.length,
          occupati: activeStalls.filter(s => s.status === 'occupato').length,
          assegnazione: activeStalls.filter(s => s.status === 'riservato').length,
          liberi: activeStalls.filter(s => s.status === 'libero').length,
        };
      } else {
        // Statistiche aggregate (Italia/Regione/Provincia) da API
        if (marketStats) {
          return {
            mercati: marketStats.markets,
            totali: marketStats.totali,
            occupati: marketStats.occupati,
            assegnazione: marketStats.assegnazione,
            liberi: marketStats.liberi,
          };
        }
        return {
          mercati: markets.length,
          totali: markets.reduce((acc, m) => acc + (m.posteggi_totali || 0), 0) || '—',
          occupati: '—',
          assegnazione: '—',
          liberi: '—',
        };
      }
    } else {
      // Modalità HUB
      if (selectedHub) {
        const shops = selectedHub.shops || [];
        return {
          mercati: 1,
          totali: shops.length,
          occupati: shops.filter(s => s.status === 'active').length,
          assegnazione: 0,
          liberi: shops.filter(s => s.status !== 'active').length,
        };
      } else {
        // Statistiche dinamiche in base alla vista:
        // - Vista Italia: totale nazionale (hubs.length)
        // - Vista Regione: HUB della regione (filtrati per regione_id)
        // - Vista Provincia: HUB della provincia (filtrati per provincia_id)
        const hubsToCount = selectedProvincia 
          ? hubs.filter(h => h.provincia_id === selectedProvincia.id)
          : selectedRegione 
            ? hubs.filter(h => h.regione_id === selectedRegione.id)
            : hubs;
        
        // Calcola totale negozi e attivi/inattivi sommando tutti gli HUB filtrati
        const allShops = hubsToCount.flatMap(h => h.shops || []);
        const totaleNegozi = allShops.length;
        const negoziAttivi = allShops.filter(s => s.status === 'active').length;
        const negoziInattivi = allShops.filter(s => s.status !== 'active').length;
        
        return {
          mercati: hubsToCount.length,
          totali: totaleNegozi,
          occupati: negoziAttivi,
          assegnazione: 0,
          liberi: negoziInattivi,
        };
      }
    }
  }, [mode, selectedMarket, selectedHub, stallsData, markets, hubs, marketStats, filteredHubs, selectedRegione, selectedProvincia]);

  // Coordinate correnti
  const currentCoords = useMemo(() => {
    if (selectedMarket) {
      return {
        lat: parseFloat(String(selectedMarket.latitude))?.toFixed(4) || '—',
        lng: parseFloat(String(selectedMarket.longitude))?.toFixed(4) || '—',
      };
    } else if (selectedHub) {
      return {
        lat: parseFloat(String(selectedHub.lat))?.toFixed(4) || '—',
        lng: parseFloat(String(selectedHub.lng))?.toFixed(4) || '—',
      };
    } else if (selectedProvincia) {
      return {
        lat: parseFloat(String(selectedProvincia.lat))?.toFixed(4) || '—',
        lng: parseFloat(String(selectedProvincia.lng))?.toFixed(4) || '—',
      };
    } else if (selectedRegione) {
      return {
        lat: parseFloat(String(selectedRegione.lat))?.toFixed(4) || '—',
        lng: parseFloat(String(selectedRegione.lng))?.toFixed(4) || '—',
      };
    }
    return { lat: '42.5000', lng: '12.5000' }; // Centro Italia
  }, [selectedMarket, selectedHub, selectedProvincia, selectedRegione]);

  // Determina se mostrare pulsante indietro
  const canGoBack = selectedRegione || selectedProvincia || selectedMarket || selectedHub;

  // Etichetta vista corrente
  const currentViewLabel = useMemo(() => {
    if (selectedMarket) return selectedMarket.name;
    if (selectedHub) return selectedHub.name;
    if (selectedProvincia) return `${selectedProvincia.nome} (${selectedProvincia.sigla})`;
    if (selectedRegione) return selectedRegione.nome;
    return 'Italia';
  }, [selectedMarket, selectedHub, selectedProvincia, selectedRegione]);

  // Calcolo Area (mq) dinamico
  // HUB: somma area_sqm degli HUB filtrati
  // Mercato: somma width * depth dei posteggi
  const areaTotal = useMemo(() => {
    // Funzione per calcolare area di un posteggio: width * depth
    const calcStallArea = (s: any): number => {
      const width = parseFloat(s.width) || 0;
      const depth = parseFloat(s.depth) || 0;
      return width * depth;
    };

    if (mode === 'mercato') {
      // Modalità MERCATO: Σ (stall.width * stall.depth) per posteggi attivi
      if (selectedMarket && stallsData.length > 0) {
        // Mercato singolo: somma mq dei posteggi del mercato selezionato
        const activeStalls = stallsData.filter(s => s.is_active === true);
        return activeStalls.reduce((acc, s) => acc + calcStallArea(s), 0);
      } else {
        // Vista Italia: somma mq di TUTTI i posteggi di tutti i mercati
        const activeStalls = allStallsData.filter(s => s.is_active === true);
        return activeStalls.reduce((acc, s) => acc + calcStallArea(s), 0);
      }
    } else {
      // Modalità HUB: somma area_sqm degli HUB
      if (selectedHub) {
        // HUB singolo: mostra area_sqm dell'HUB
        return selectedHub.area_sqm || 0;
      } else {
        // Vista aggregata: somma area_sqm degli HUB filtrati
        const hubsToSum = selectedProvincia 
          ? hubs.filter(h => h.provincia_id === selectedProvincia.id)
          : selectedRegione 
            ? hubs.filter(h => h.regione_id === selectedRegione.id)
            : hubs;
        
        return hubsToSum.reduce((acc, h) => acc + (h.area_sqm || 0), 0);
      }
    }
  }, [mode, selectedMarket, selectedHub, stallsData, allStallsData, hubs, selectedRegione, selectedProvincia]);

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
    <div className="space-y-2 sm:space-y-3 p-0 sm:p-4">
      
      
      
      {/* Header unico con Titolo + Indicatori nella stessa barra - NASCOSTO su mobile */}
      <div className="hidden sm:flex flex-nowrap items-center gap-1.5 sm:gap-4 bg-[#0b1220] sm:rounded-lg px-2 py-2 sm:p-4 sm:border border-[#14b8a6]/30">
        {/* Titolo e Vista - come primo indicatore */}
        <div className="hidden sm:block px-5 py-2 bg-[#1a2332] rounded border border-[#14b8a6]/40 min-w-[280px] flex-shrink-0">
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
        <div className="hidden sm:flex px-5 py-2 bg-[#1a2332] rounded border border-[#e8fbff]/20 text-center min-w-[180px] ml-auto">
          <div className="text-[10px] text-[#e8fbff]/50 uppercase tracking-wider">Coordinate GPS</div>
          <div className="text-sm font-mono text-[#14b8a6]">
            {currentCoords.lat} | {currentCoords.lng}
          </div>
        </div>
      </div>

      {/* Barra controlli - Layout mobile ottimizzato */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-1 sm:gap-2 px-1 sm:px-0">
        
        {/* Riga 1: Selettore Mercato/HUB */}
        <div className="flex w-full sm:w-auto bg-[#0b1220] rounded-lg p-1 border border-[#14b8a6]/30">
          <Button
            variant={mode === 'mercato' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMode('mercato'); handleBackToItaly(); }}
            className={mode === 'mercato' 
              ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white h-9 sm:h-8 text-xs sm:text-sm flex-1' 
              : 'text-[#e8fbff]/70 hover:text-[#e8fbff] h-9 sm:h-8 text-xs sm:text-sm flex-1'
            }
          >
            <Store className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Mercati ({markets.length})
          </Button>
          <Button
            variant={mode === 'hub' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMode('hub'); handleBackToItaly(); }}
            className={mode === 'hub' 
              ? 'bg-[#9C27B0] hover:bg-[#7B1FA2] text-white h-9 sm:h-8 text-xs sm:text-sm flex-1' 
              : 'text-[#e8fbff]/70 hover:text-[#e8fbff] h-9 sm:h-8 text-xs sm:text-sm flex-1'
            }
          >
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            HUB ({hubs.length})
          </Button>
        </div>

        {/* Riga 2: Ricerca - NASCOSTA su mobile */}
        <div className="hidden sm:block sm:flex-1 sm:min-w-[180px] sm:max-w-[300px]">
          <Input
            placeholder={`Cerca ${mode === 'mercato' ? 'mercato' : 'hub'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff] h-11 sm:h-8 text-sm"
          />
        </div>

        {/* Riga 3 Mobile: Regione - tab piccolo */}
        <div className="sm:hidden flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`w-full border-[#14b8a6]/30 h-9 text-xs px-2 justify-between ${selectedRegione ? 'bg-[#14b8a6]/20 text-[#14b8a6]' : 'text-[#e8fbff]'}`}
              >
                <div className="flex items-center">
                  <Map className="h-3 w-3 mr-1" />
                  {selectedRegione ? selectedRegione.nome.substring(0, 8) : 'Regione'}
                </div>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a2332] border-[#14b8a6]/30 max-h-[300px] overflow-y-auto z-[9999] w-[calc(100vw-32px)]" style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                    className={`text-[#e8fbff] hover:bg-[#14b8a6]/20 cursor-pointer text-xs ${selectedRegione?.id === regione.id ? 'bg-[#14b8a6]/30' : ''}`}
                  >
                    <div className="flex justify-between w-full">
                      <span>{regione.nome}</span>
                      <span className="text-[#e8fbff]/50 text-[10px] ml-2">{regione.province_count} prov.</span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Riga 4 Mobile: Provincia - tab piccolo */}
        <div className="sm:hidden flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedRegione}
                className={`w-full border-[#14b8a6]/30 h-9 text-xs px-2 justify-between ${selectedProvincia ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#e8fbff]'} ${!selectedRegione ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center">
                  <Navigation className="h-3 w-3 mr-1" />
                  {selectedProvincia ? selectedProvincia.sigla : 'Prov.'}
                </div>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a2332] border-[#14b8a6]/30 max-h-[300px] overflow-y-auto z-[9999] w-[calc(100vw-32px)]" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <DropdownMenuLabel className="text-[#e8fbff]/60 text-xs">Province di {selectedRegione?.nome || '...'}</DropdownMenuLabel>
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
                    className={`text-[#e8fbff] hover:bg-[#f59e0b]/20 cursor-pointer text-xs ${selectedProvincia?.id === provincia.id ? 'bg-[#f59e0b]/30' : ''}`}
                  >
                    <div className="flex justify-between w-full">
                      <span>{provincia.nome}</span>
                      <span className="text-[#e8fbff]/50 text-[10px] ml-2">{provincia.sigla}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Pulsante Vista Italia - mobile NASCOSTO (c'è già Indietro che fa la stessa cosa) */}
        {/* <Button
          variant="outline"
          size="sm"
          onClick={handleResetGeo}
          className="sm:hidden flex-1 text-[#14b8a6] border-[#14b8a6]/50 hover:bg-[#14b8a6]/20 h-9 text-xs px-2"
        >
          🇮🇹 Italia
        </Button> */}

        {/* Pulsante Vista Italia - desktop */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetGeo}
          className="hidden sm:flex text-[#14b8a6] border-[#14b8a6]/50 hover:bg-[#14b8a6]/20 h-8 text-sm"
        >
          <MapPin className="h-4 w-4 mr-1" />
          Vista Italia
        </Button>

        {/* Dropdown Regione - solo desktop */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`hidden sm:flex border-[#14b8a6]/30 h-8 text-sm ${selectedRegione ? 'bg-[#14b8a6]/20 text-[#14b8a6]' : 'text-[#e8fbff]'}`}
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

        {/* Dropdown Provincia - solo desktop */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedRegione}
              className={`hidden sm:flex border-[#14b8a6]/30 h-8 text-sm ${selectedProvincia ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#e8fbff]'} ${!selectedRegione ? 'opacity-50' : ''}`}
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

        {/* Indicatore Area (mq) - sempre visibile, calcolo dinamico - ULTIMO elemento */}
        <div className="hidden sm:flex px-3 py-1 bg-[#0b1220] rounded border border-[#14b8a6]/40 text-center h-8 items-center gap-2">
          <span className="text-[10px] text-[#e8fbff]/50 uppercase tracking-wider">Area:</span>
          <span className="text-sm font-bold text-[#14b8a6]">{formatArea(areaTotal)} mq</span>
        </div>


      </div>

      {/* Lista elementi - Card più grandi con colori per livello HUB */}
      <div className="flex gap-3 overflow-x-auto pb-2 px-2 sm:px-0">
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
              <span className="text-[#e8fbff] font-bold text-sm truncate">
                {mode === 'mercato' 
                  ? ((item as Market).comune || 'Italia')
                  : ((item as HubLocation).city || 'Italia')
                }
              </span>
            </div>
            <div className="text-[#e8fbff]/50 text-xs ml-8 truncate mt-1">
              {item.name.length > 18 ? item.name.substring(0, 18) + '...' : item.name}
            </div>
          </div>
        );
        })}
      </div>

      {/* MAPPA MOBILE FULLSCREEN - NASCOSTA per ora */}
      {false && showMobileMap && isMobile && (
        <div className="fixed inset-0 z-[9999] bg-[#0b1220] flex flex-col">
          {/* Header overlay mobile */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] flex-shrink-0">
            <button 
              onClick={() => {
                setShowMobileMap(false);
                setMobileMapZoomed(true);
              }}
              className="flex items-center gap-2 text-white"
            >
              <ArrowLeft className="h-6 w-6" />
              <span className="text-base font-medium">Indietro</span>
            </button>
            <span className="text-base font-bold text-white truncate max-w-[180px]">
              {selectedHub?.name || selectedMarket?.name || 'Mappa'}
            </span>
            <div className="w-20"></div>
          </div>
          
          {/* Container mappa fullscreen */}
          <div className="flex-1 relative">
            <HubMarketMapComponent
              mode={mode}
              mapData={mapData || undefined}
              stallsData={stallsData}
              allMarkets={mode === 'mercato' ? filteredMarkets.map(m => ({ ...m, latitude: Number(m.latitude), longitude: Number(m.longitude) })) : []}
              allHubs={mode === 'hub' ? filteredHubs : []}
              selectedHub={mode === 'hub' ? selectedHub || undefined : undefined}
              onMarketClick={(id) => { handleMarketClick(id); }}
              onHubClick={(id) => { handleHubClick(id); }}
              onShopClick={(shop) => { handleShopClick(shop.id); }}
              showItalyView={showItalyView}
              viewTrigger={mobileViewTrigger}
              height="100%"
              marketCenterFixed={selectedMarket?.latitude && selectedMarket?.longitude ? [
                parseFloat(String(selectedMarket!.latitude)) || 42.5,
                parseFloat(String(selectedMarket!.longitude)) || 12.5
              ] : undefined}
              hubCenterFixed={selectedHub ? (
                selectedHub!.center_lat && selectedHub!.center_lng ? [
                  parseFloat(String(selectedHub!.center_lat)) || 42.5,
                  parseFloat(String(selectedHub!.center_lng)) || 12.5
                ] : selectedHub!.lat && selectedHub!.lng ? [
                  parseFloat(String(selectedHub!.lat)) || 42.5,
                  parseFloat(String(selectedHub!.lng)) || 12.5
                ] : undefined
              ) : undefined}
              customZoom={mobileMapZoomed ? 15 : 6}
              routeConfig={routeConfig}
              navigationMode={navigationMode}
              interactionDisabled={!selectedHub && !selectedMarket}
            />
            
            {/* Tab galleggianti Apri/Italia */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 z-[10001]">
              <button
                onClick={() => {
                  setMobileMapZoomed(true);
                  setShowItalyView(false); // Zoom sull'hub/mercato
                  setMobileViewTrigger(prev => prev + 1); // Triggera animazione
                }}
                className={`px-6 py-3 rounded-full font-bold text-sm shadow-lg transition-all ${
                  mobileMapZoomed 
                    ? 'bg-[#14b8a6] text-white' 
                    : 'bg-white/90 text-[#0b1220] hover:bg-white'
                }`}
              >
                🔍 Apri
              </button>
              <button
                onClick={() => {
                  setMobileMapZoomed(false);
                  setShowItalyView(true);
                  setMobileViewTrigger(prev => prev + 1); // Triggera animazione
                }}
                className={`px-6 py-3 rounded-full font-bold text-sm shadow-lg transition-all ${
                  !mobileMapZoomed 
                    ? 'bg-[#14b8a6] text-white' 
                    : 'bg-white/90 text-[#0b1220] hover:bg-white'
                }`}
              >
                🇮🇹 Italia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAPPA - visibile su desktop e mobile */}
      <div id="map-container" className="h-[calc(100vh-100px)] sm:h-[calc(100vh-320px)] min-h-[500px] sm:min-h-[500px] rounded-lg sm:rounded-lg rounded-none overflow-hidden border-0 sm:border border-[#14b8a6]/30">
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
          allMarkets={mode === 'mercato' ? filteredMarkets.map(m => ({ ...m, latitude: Number(m.latitude), longitude: Number(m.longitude) })) : []}
          allHubs={mode === 'hub' ? filteredHubs : []}
          selectedHub={mode === 'hub' ? selectedHub || undefined : undefined}
          onMarketClick={handleMarketClick}
          onHubClick={handleHubClick}
          onShopClick={(shop) => { handleShopClick(shop.id); }}
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
          interactionDisabled={!selectedHub && !selectedMarket}
        />
        </MapWithTransportLayer>
      </div>

    </div>
  );
}
