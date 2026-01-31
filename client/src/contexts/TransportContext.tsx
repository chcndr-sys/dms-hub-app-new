/**
 * TransportContext.tsx
 * 
 * Context React per gestire i dati GTFS del trasporto pubblico.
 * Fornisce accesso centralizzato a fermate, linee e orari.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TransportStop, TransportRoute, StopTime } from '@/components/TransportStopsLayer';

// API base URL - usa il backend esistente
const API_BASE = '/api';

interface TransportContextType {
  // Dati
  stops: TransportStop[];
  routes: TransportRoute[];
  isLoading: boolean;
  error: string | null;
  
  // Filtri attivi
  showBusStops: boolean;
  showTrainStops: boolean;
  transportLayerVisible: boolean;
  
  // Azioni
  setShowBusStops: (show: boolean) => void;
  setShowTrainStops: (show: boolean) => void;
  setTransportLayerVisible: (visible: boolean) => void;
  
  // Funzioni
  loadStops: (region?: string) => Promise<void>;
  loadStopsNearPoint: (lat: number, lng: number, radiusKm?: number) => Promise<TransportStop[]>;
  getNextDepartures: (stopId: string, limit?: number) => Promise<StopTime[]>;
  getRoutesForStop: (stopId: string) => Promise<TransportRoute[]>;
}

const TransportContext = createContext<TransportContextType | undefined>(undefined);

interface TransportProviderProps {
  children: ReactNode;
}

export function TransportProvider({ children }: TransportProviderProps) {
  const [stops, setStops] = useState<TransportStop[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtri
  const [showBusStops, setShowBusStops] = useState(true);
  const [showTrainStops, setShowTrainStops] = useState(true);
  const [transportLayerVisible, setTransportLayerVisible] = useState(false);

  // Carica fermate per regione
  const loadStops = useCallback(async (region?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      
      const response = await fetch(`${API_BASE}/transport/stops?${params}`);
      
      if (!response.ok) {
        throw new Error(`Errore caricamento fermate: ${response.status}`);
      }
      
      const data = await response.json();
      setStops(data.stops || []);
      console.log('[TransportContext] Caricate', data.stops?.length || 0, 'fermate');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(message);
      console.error('[TransportContext] Errore:', message);
      
      // Fallback: carica dati demo se API non disponibile
      loadDemoStops();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carica fermate vicine a un punto
  const loadStopsNearPoint = useCallback(async (
    lat: number, 
    lng: number, 
    radiusKm: number = 2
  ): Promise<TransportStop[]> => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radiusKm.toString(),
      });
      
      const response = await fetch(`${API_BASE}/transport/stops/nearby?${params}`);
      
      if (!response.ok) {
        throw new Error(`Errore: ${response.status}`);
      }
      
      const data = await response.json();
      return data.stops || [];
    } catch (err) {
      console.error('[TransportContext] Errore caricamento fermate vicine:', err);
      
      // Fallback: filtra dalle fermate già caricate
      return filterStopsNearPoint(stops, lat, lng, radiusKm);
    }
  }, [stops]);

  // Ottieni prossime partenze per una fermata
  const getNextDepartures = useCallback(async (
    stopId: string, 
    limit: number = 10
  ): Promise<StopTime[]> => {
    try {
      const params = new URLSearchParams({
        stop_id: stopId,
        limit: limit.toString(),
      });
      
      const response = await fetch(`${API_BASE}/transport/departures?${params}`);
      
      if (!response.ok) {
        throw new Error(`Errore: ${response.status}`);
      }
      
      const data = await response.json();
      return data.departures || [];
    } catch (err) {
      console.error('[TransportContext] Errore caricamento partenze:', err);
      return [];
    }
  }, []);

  // Ottieni linee che passano per una fermata
  const getRoutesForStop = useCallback(async (stopId: string): Promise<TransportRoute[]> => {
    try {
      const response = await fetch(`${API_BASE}/transport/stops/${stopId}/routes`);
      
      if (!response.ok) {
        throw new Error(`Errore: ${response.status}`);
      }
      
      const data = await response.json();
      return data.routes || [];
    } catch (err) {
      console.error('[TransportContext] Errore caricamento linee:', err);
      return [];
    }
  }, []);

  // Funzione helper per filtrare fermate vicine (client-side)
  const filterStopsNearPoint = (
    allStops: TransportStop[], 
    lat: number, 
    lng: number, 
    radiusKm: number
  ): TransportStop[] => {
    return allStops.filter(stop => {
      const distance = calculateDistance(lat, lng, stop.stop_lat, stop.stop_lon);
      return distance <= radiusKm;
    }).sort((a, b) => {
      const distA = calculateDistance(lat, lng, a.stop_lat, a.stop_lon);
      const distB = calculateDistance(lat, lng, b.stop_lat, b.stop_lon);
      return distA - distB;
    });
  };

  // Calcola distanza Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Carica dati demo per sviluppo/fallback
  const loadDemoStops = () => {
    console.log('[TransportContext] Caricamento dati demo...');
    
    // Fermate demo per Emilia-Romagna e Grosseto
    const demoStops: TransportStop[] = [
      // Bologna - Stazioni ferroviarie
      {
        stop_id: 'train_bologna_centrale',
        stop_name: 'Bologna Centrale',
        stop_lat: 44.5058,
        stop_lon: 11.3426,
        stop_type: 'train',
        agency_name: 'Trenitalia',
        routes: [
          { route_id: 'RV', route_short_name: 'RV', route_long_name: 'Regionale Veloce', route_type: 2 },
          { route_id: 'R', route_short_name: 'R', route_long_name: 'Regionale', route_type: 2 },
        ],
      },
      {
        stop_id: 'train_bologna_fiera',
        stop_name: 'Bologna Fiera',
        stop_lat: 44.5106,
        stop_lon: 11.3892,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      // Bologna - Fermate bus TPER
      {
        stop_id: 'bus_bo_piazza_maggiore',
        stop_name: 'Piazza Maggiore',
        stop_lat: 44.4938,
        stop_lon: 11.3430,
        stop_type: 'bus',
        agency_name: 'TPER',
        routes: [
          { route_id: '11', route_short_name: '11', route_long_name: 'Stazione - Pilastro', route_type: 3, route_color: 'FF5722' },
          { route_id: '13', route_short_name: '13', route_long_name: 'Stazione - San Lazzaro', route_type: 3, route_color: '2196F3' },
        ],
      },
      {
        stop_id: 'bus_bo_autostazione',
        stop_name: 'Autostazione',
        stop_lat: 44.5062,
        stop_lon: 11.3462,
        stop_type: 'bus',
        agency_name: 'TPER',
      },
      // Modena
      {
        stop_id: 'train_modena',
        stop_name: 'Modena',
        stop_lat: 44.6458,
        stop_lon: 10.9248,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      {
        stop_id: 'bus_mo_piazza_grande',
        stop_name: 'Piazza Grande',
        stop_lat: 44.6467,
        stop_lon: 10.9254,
        stop_type: 'bus',
        agency_name: 'SETA',
      },
      // Ferrara
      {
        stop_id: 'train_ferrara',
        stop_name: 'Ferrara',
        stop_lat: 44.8423,
        stop_lon: 11.6034,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      {
        stop_id: 'bus_fe_castello',
        stop_name: 'Castello Estense',
        stop_lat: 44.8378,
        stop_lon: 11.6189,
        stop_type: 'bus',
        agency_name: 'TPER',
      },
      // Grosseto
      {
        stop_id: 'train_grosseto',
        stop_name: 'Grosseto',
        stop_lat: 42.7604,
        stop_lon: 11.1012,
        stop_type: 'train',
        agency_name: 'Trenitalia',
        routes: [
          { route_id: 'R_GR', route_short_name: 'R', route_long_name: 'Regionale Grosseto-Roma', route_type: 2 },
        ],
      },
      {
        stop_id: 'bus_gr_piazza_dante',
        stop_name: 'Piazza Dante',
        stop_lat: 42.7614,
        stop_lon: 11.1128,
        stop_type: 'bus',
        agency_name: 'Tiemme',
      },
      {
        stop_id: 'bus_gr_stazione',
        stop_name: 'Stazione FS Grosseto',
        stop_lat: 42.7608,
        stop_lon: 11.1018,
        stop_type: 'bus',
        agency_name: 'Tiemme',
      },
      // Parma
      {
        stop_id: 'train_parma',
        stop_name: 'Parma',
        stop_lat: 44.8015,
        stop_lon: 10.3289,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      // Reggio Emilia
      {
        stop_id: 'train_reggio_emilia',
        stop_name: 'Reggio Emilia',
        stop_lat: 44.6989,
        stop_lon: 10.6312,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      // Rimini
      {
        stop_id: 'train_rimini',
        stop_name: 'Rimini',
        stop_lat: 44.0645,
        stop_lon: 12.5683,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      // Ravenna
      {
        stop_id: 'train_ravenna',
        stop_name: 'Ravenna',
        stop_lat: 44.4184,
        stop_lon: 12.2035,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      // Forlì
      {
        stop_id: 'train_forli',
        stop_name: 'Forlì',
        stop_lat: 44.2227,
        stop_lon: 12.0407,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      // Cesena
      {
        stop_id: 'train_cesena',
        stop_name: 'Cesena',
        stop_lat: 44.1391,
        stop_lon: 12.2428,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
      // Piacenza
      {
        stop_id: 'train_piacenza',
        stop_name: 'Piacenza',
        stop_lat: 45.0526,
        stop_lon: 9.6929,
        stop_type: 'train',
        agency_name: 'Trenitalia',
      },
    ];
    
    setStops(demoStops);
    console.log('[TransportContext] Caricate', demoStops.length, 'fermate demo');
  };

  // Carica dati iniziali
  useEffect(() => {
    // Carica fermate demo all'avvio
    loadDemoStops();
    
    // Tenta di caricare dati reali
    // loadStops('emilia-romagna');
  }, []);

  const value: TransportContextType = {
    stops,
    routes,
    isLoading,
    error,
    showBusStops,
    showTrainStops,
    transportLayerVisible,
    setShowBusStops,
    setShowTrainStops,
    setTransportLayerVisible,
    loadStops,
    loadStopsNearPoint,
    getNextDepartures,
    getRoutesForStop,
  };

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
}

export function useTransport() {
  const context = useContext(TransportContext);
  if (context === undefined) {
    throw new Error('useTransport must be used within a TransportProvider');
  }
  return context;
}

export default TransportContext;
