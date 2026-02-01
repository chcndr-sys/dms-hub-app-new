import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Navigation, ArrowLeft, Leaf, Clock, MapPin, TrendingUp, Car, Bike, Footprints, Bus, Loader2, Store, CheckCircle, XCircle, AlertCircle, Filter, Search, Send } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useEffect } from 'react';
// import MobilityMap from '@/components/MobilityMap'; // Rimosso - non più utilizzato
import { trpc } from '@/lib/trpc';
import { MarketMapComponent } from '@/components/MarketMapComponent';
import GestioneHubMapWrapper from '@/components/GestioneHubMapWrapper';
import { NavigationMode } from '@/components/NavigationMode';

interface RouteStop {
  name: string;
  address: string;
  duration: number; // minuti
}

interface RoutePlan {
  stops: RouteStop[];
  totalDistance: number; // km
  totalTime: number; // minuti
  co2Saved: number; // grammi
  creditsEarned: number;
}

export default function RoutePage() {
  const [location] = useLocation();
  const [mode, setMode] = useState('walk');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // GIS Map state
  const [gisStalls, setGisStalls] = useState<any[]>([]);
  const [gisMapData, setGisMapData] = useState<any | null>(null);
  const [gisMapCenter, setGisMapCenter] = useState<[number, number] | null>(null);
  const [gisMapRefreshKey, setGisMapRefreshKey] = useState(0);
  const [gisSearchQuery, setGisSearchQuery] = useState('');
  const [gisStatusFilter, setGisStatusFilter] = useState<string>('all');
  const gisMarketId = 1; // Mercato Grosseto ID=1
  
  // State per routing sulla mappa GIS
  const [routeConfig, setRouteConfig] = useState<{
    enabled: boolean;
    userLocation: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    mode: 'walking' | 'cycling' | 'driving';
  } | undefined>(undefined);
  
  // State per navigazione turn-by-turn sulla mappa GIS
  const [navigationActive, setNavigationActive] = useState(false);
  const [destinationName, setDestinationName] = useState('');
  
  // const mobilityData = trpc.mobility.list.useQuery(); // Rimosso - non più utilizzato

  // Auto-geolocalizzazione all'apertura della pagina
  useEffect(() => {
    if (navigator.geolocation && !userLocation) {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setOrigin(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setLoadingLocation(false);
          toast.success('📍 Posizione GPS rilevata');
        },
        (error) => {
          console.warn('Geolocation denied:', error);
          setLoadingLocation(false);
          // Non mostrare errore, l'utente può cliccare manualmente
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Auto-carica destinazione da URL params (coordinate o indirizzo)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const destinationLat = params.get('destinationLat');
    const destinationLng = params.get('destinationLng');
    const destinationName = params.get('destinationName');
    const marketName = params.get('marketName');
    const address = params.get('address');
    const shopName = params.get('name');
    
    if (destinationLat && destinationLng) {
      // Coordinate GPS dirette
      const name = destinationName || marketName || 'Destinazione';
      setDestination(`${name} (${destinationLat}, ${destinationLng})`);
      toast.success(`🎯 Destinazione caricata: ${name}`);
    } else if (address) {
      // Indirizzo testuale (fallback)
      setDestination(shopName ? `${shopName} - ${address}` : address);
      toast.success('Destinazione caricata!');
    }
  }, [location]);

  // Fetch GIS Map Data
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_MIHUB_API_URL || 'https://mihub.157-90-29-66.nip.io';
    
    const fetchGisData = async () => {
      try {
        const [stallsRes, mapRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/markets/${gisMarketId}/stalls`),
          fetch(`${API_BASE_URL}/api/gis/market-map`)
        ]);

        const stallsData = await stallsRes.json();
        const mapDataRes = await mapRes.json();

        if (stallsData.success) {
          setGisStalls(stallsData.data);
        }
        if (mapDataRes.success) {
          setGisMapData(mapDataRes.data);
          if (mapDataRes.data?.center) {
            setGisMapCenter([mapDataRes.data.center.lat, mapDataRes.data.center.lng]);
          }
        }
      } catch (error) {
        console.error('[GIS Map] Error fetching data:', error);
      }
    };
    
    fetchGisData();
  }, [gisMarketId]);

  // Filtered stalls based on search and status
  const filteredGisStalls = gisStalls.filter(stall => {
    // Filter by status
    if (gisStatusFilter !== 'all' && stall.status !== gisStatusFilter) {
      return false;
    }
    
    // Filter by search query
    if (gisSearchQuery) {
      const query = gisSearchQuery.toLowerCase();
      return (
        // Posteggio
        stall.number?.toLowerCase().includes(query) ||
        stall.gis_slot_id?.toLowerCase().includes(query) ||
        // Impresa
        stall.vendor_business_name?.toLowerCase().includes(query) ||
        // Mercato (hardcoded per ora - Grosseto)
        'grosseto'.includes(query) ||
        'mercato grosseto'.includes(query) ||
        'toscana'.includes(query) ||
        // Giorno mercato
        'giovedì'.includes(query) ||
        'giovedi'.includes(query) ||
        'thursday'.includes(query)
      );
    }
    
    return true;
  });

  // Funzione per rilevare posizione utente
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalizzazione non supportata dal browser');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setOrigin(`${latitude}, ${longitude}`);
        toast.success('✅ Posizione rilevata!');
        setLoadingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('❌ Impossibile rilevare posizione');
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePlanRoute = async () => {
    if (!origin || !destination) {
      toast.error('Inserisci partenza e destinazione');
      return;
    }

    // Se userLocation non è impostato, prova a parsare le coordinate dall'input origin
    let currentUserLocation = userLocation;
    if (!currentUserLocation) {
      const originCoordMatch = origin.match(/^\s*([-\d.]+)\s*,\s*([-\d.]+)\s*$/);
      if (originCoordMatch) {
        currentUserLocation = {
          lat: parseFloat(originCoordMatch[1]),
          lng: parseFloat(originCoordMatch[2])
        };
        setUserLocation(currentUserLocation);
      } else {
        toast.error('Rileva prima la tua posizione GPS o inserisci coordinate (lat, lng)');
        return;
      }
    }

    setLoading(true);

    try {
      // Parse destination (può essere coordinate GPS, stallId, o marketId)
      const coordMatch = destination.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
      const stallMatch = destination.match(/Posteggio #(\d+)/);
      
      let destinationPayload: any;
      
      if (coordMatch) {
        // Coordinate GPS dirette (es: "Frutta e Verdura (42.758, 11.112)")
        destinationPayload = {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        };
      } else if (stallMatch) {
        // StallId (es: "Posteggio #1")
        destinationPayload = { stallId: parseInt(stallMatch[1]) };
      } else {
        // Fallback a marketId
        destinationPayload = { marketId: 1 };
      }

      // Mappa modalità frontend → backend
      const modeMap: Record<string, string> = {
        'walk': 'walking',
        'bike': 'cycling',
        'transit': 'bus',
        'car': 'driving'
      };

      const apiMode = modeMap[mode] || 'walking';

      // Chiama API routing
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const requestPayload = {
        start: {
          lat: currentUserLocation.lat,
          lng: currentUserLocation.lng
        },
        destination: destinationPayload,
        mode: apiMode,
        includeTPL: mode === 'transit'
      };
      
      console.log('[DEBUG] API Request:', requestPayload);
      
      const response = await fetch(`${API_URL}/api/routing/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error('Errore calcolo percorso');
      }

      const data = await response.json();
      
      console.log('[DEBUG] API Response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Errore calcolo percorso');
      }

      // Converti risposta API in RoutePlan
      const route = data.route;
      console.log('[DEBUG] Route Summary:', route.summary);
      const plan: RoutePlan = {
        stops: [
          {
            name: route.destination.marketName || 'Destinazione',
            address: route.destination.marketAddress || '',
            duration: route.summary.duration_min
          }
        ],
        totalDistance: parseFloat(route.summary.distance_km),
        totalTime: route.summary.duration_min,
        co2Saved: route.summary.co2_saved_g,
        creditsEarned: route.summary.credits
      };

      setPlan(plan);
      // setDirections(route); // Rimosso - non più utilizzato
      
      // Configura routing per visualizzazione su mappa GIS
      // Estrai coordinate destinazione dal payload, dalla risposta API, o dalla stringa destination
      let destLat: number | undefined;
      let destLng: number | undefined;
      
      // 1. Prima prova dal payload
      if (destinationPayload.lat && destinationPayload.lng) {
        destLat = destinationPayload.lat;
        destLng = destinationPayload.lng;
        console.log('[DEBUG] destLat/destLng from payload:', destLat, destLng);
      } 
      // 2. Poi prova dalla geometria della risposta API
      else if (route.geometry?.coordinates?.length > 0) {
        const lastCoord = route.geometry.coordinates[route.geometry.coordinates.length - 1];
        destLat = lastCoord[1]; // GeoJSON è [lng, lat]
        destLng = lastCoord[0];
        console.log('[DEBUG] destLat/destLng from geometry:', destLat, destLng);
      }
      // 3. Fallback: estrai dalla stringa destination "Nome (lat, lng)"
      else {
        const destMatch = destination.match(/\(([\d.]+),\s*([\d.]+)\)/);
        if (destMatch) {
          destLat = parseFloat(destMatch[1]);
          destLng = parseFloat(destMatch[2]);
          console.log('[DEBUG] destLat/destLng from destination string:', destLat, destLng);
        }
      }
      
      console.log('[DEBUG] Final destLat/destLng:', destLat, destLng);
      console.log('[DEBUG] currentUserLocation:', currentUserLocation);
      
      if (currentUserLocation && destLat && destLng) {
        const modeMap: Record<string, 'walking' | 'cycling' | 'driving'> = {
          'walk': 'walking',
          'bike': 'cycling',
          'transit': 'walking', // Transit usa walking per ultimo miglio
          'car': 'driving'
        };
        const newRouteConfig = {
          enabled: true,
          userLocation: currentUserLocation,
          destination: { lat: destLat, lng: destLng },
          mode: modeMap[mode] || 'walking'
        };
        console.log('[DEBUG] Setting routeConfig:', newRouteConfig);
        setRouteConfig(newRouteConfig);
      } else {
        console.error('[DEBUG] Cannot set routeConfig - missing data:', {
          currentUserLocation,
          destLat,
          destLng
        });
        toast.error('Impossibile visualizzare percorso sulla mappa');
      }
      
      // Calcola anche altre modalità per confronto
      const modes = ['walking', 'cycling', 'bus', 'driving'];
      const options = await Promise.all(
        modes.map(async (m) => {
          try {
            const res = await fetch(`${API_URL}/api/routing/calculate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                start: { lat: currentUserLocation.lat, lng: currentUserLocation.lng },
                destination: destinationPayload,
                mode: m
              })
            });
            const d = await res.json();
            return {
              mode: m === 'walking' ? 'walk' : m === 'cycling' ? 'bike' : m === 'bus' ? 'transit' : 'car',
              label: m === 'walking' ? 'A piedi' : m === 'cycling' ? 'Bicicletta' : m === 'bus' ? 'Bus/Tram' : 'Auto',
              icon: m === 'walking' ? <Footprints className="h-4 w-4" /> : m === 'cycling' ? <Bike className="h-4 w-4" /> : m === 'bus' ? <Bus className="h-4 w-4" /> : <Car className="h-4 w-4" />,
              duration: d.route.summary.duration_min,
              distance: parseFloat(d.route.summary.distance_km),
              co2_saved: d.route.summary.co2_saved_g, // CO₂ risparmiata dal backend
              credits: d.route.summary.credits,
              sustainability: m === 'driving' ? 20 : m === 'bus' ? 75 : 100
            };
          } catch (e) {
            return null;
          }
        })
      );

      setRouteOptions(options.filter(o => o !== null) as any[]);
      setLoading(false);
      toast.success(`✅ Percorso calcolato! +${route.summary.credits} crediti`);
    } catch (error) {
      console.error('Error calculating route:', error);
      setLoading(false);
      toast.error('❌ Errore calcolo percorso. Riprova.');
    }
  };

  const handleStartNavigation = () => {
    console.log('[DEBUG] handleStartNavigation called');
    console.log('[DEBUG] plan:', plan);
    console.log('[DEBUG] routeConfig:', routeConfig);
    
    if (!plan || !routeConfig) {
      toast.error('Calcola prima il percorso');
      console.error('[DEBUG] Missing plan or routeConfig');
      return;
    }
    
    // Estrai nome destinazione dall'input
    const destName = destination.split('(')[0].trim() || 'Destinazione';
    setDestinationName(destName);
    
    // Attiva navigazione turn-by-turn sulla mappa GIS
    setNavigationActive(true);
    
    // Toast con crediti guadagnati
    toast.success(`🧭 Navigazione avviata sulla mappa! +${plan.creditsEarned} crediti al completamento`, {
      duration: 5000
    });
  };
  
  // Chiudi navigazione
  const handleCloseNavigation = () => {
    setNavigationActive(false);
    toast.info('Navigazione terminata');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header con gradient - Compatto su smartphone */}
      <header className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-2 sm:p-4 shadow-lg">
        <div className="w-full px-2 sm:px-4 md:px-8 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl">
              <Navigation className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold">Route Etico</h1>
              <p className="text-[10px] sm:text-xs text-white/70 hidden sm:block">Naviga sostenibile, guadagna crediti</p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-2 sm:px-4 md:px-8 py-3 sm:py-6 space-y-3 sm:space-y-6">
        {/* Form Pianificazione - Compatto su smartphone */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 overflow-hidden">
          <CardHeader className="pb-4 sm:pb-4 p-3 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-emerald-500 rounded-xl shadow-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Pianifica il tuo Percorso</CardTitle>
                <CardDescription className="text-base">
                  Ottimizziamo il tuo itinerario per risparmiare tempo e CO₂
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
            {/* Modalità trasporto */}
            <div className="space-y-2">
              <Label htmlFor="mode">Modalità di trasporto</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk">🚶 A piedi</SelectItem>
                  <SelectItem value="bike">🚲 Bicicletta</SelectItem>
                  <SelectItem value="transit">🚌 Trasporto pubblico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Partenza */}
            <div className="space-y-2">
              <Label htmlFor="origin">Partenza</Label>
              <div className="flex gap-2">
                <Input
                  id="origin"
                  placeholder="es. Via Mazzini 10, Grosseto"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={getUserLocation}
                  disabled={loadingLocation}
                  title="Usa posizione corrente"
                >
                  {loadingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Destinazione */}
            <div className="space-y-2">
              <Label htmlFor="destination">Destinazione finale</Label>
              <Input
                id="destination"
                placeholder="es. Centro città, Via Roma..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            {/* Confronto Modalità */}
            {routeOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Confronto Opzioni di Trasporto</Label>
                <div className="grid grid-cols-2 gap-2">
                  {routeOptions.map((option, idx) => (
                    <button
                      key={option.mode}
                      onClick={() => {
                        setMode(option.mode);
                        // Aggiorna plan con i valori della modalità selezionata
                        if (plan) {
                          setPlan({
                            ...plan,
                            totalDistance: option.distance,
                            totalTime: option.duration,
                            co2Saved: option.co2_saved,
                            creditsEarned: option.credits
                          });
                        }
                      }}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        mode === option.mode
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {option.icon}
                        <span className="font-semibold text-sm">{option.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {option.duration} min • -{option.co2_saved}g CO₂
                      </div>
                      <div className="text-xs font-semibold text-green-600 mt-1">
                        +{option.credits} crediti
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pulsante pianifica */}
            <Button 
              onClick={handlePlanRoute} 
              disabled={loading} 
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Calcolo in corso...
                </>
              ) : (
                <>
                  <Navigation className="h-5 w-5 mr-2" />
                  Pianifica Percorso
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Risultato Pianificazione */}
        {plan && (
          <>
            {/* Statistiche - Grid 2x2 su smartphone */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                <CardContent className="pt-3 sm:pt-6 text-center p-2 sm:p-6">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-blue-600">{plan.totalDistance}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">km</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
                <CardContent className="pt-3 sm:pt-6 text-center p-2 sm:p-6">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-purple-600">{plan.totalTime}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">min</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-green-500/10 to-green-600/5">
                <CardContent className="pt-3 sm:pt-6 text-center p-2 sm:p-6">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <Leaf className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-green-600">{plan.co2Saved}g</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">CO₂</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
                <CardContent className="pt-3 sm:pt-6 text-center p-2 sm:p-6">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-amber-600">+{plan.creditsEarned}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">crediti</div>
                </CardContent>
              </Card>
            </div>

            {/* Punteggio Sostenibilità - Compatto su smartphone */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-green-900 flex items-center gap-2 text-sm sm:text-base">
                  <Leaf className="h-4 w-4 sm:h-5 sm:w-5" />
                  Punteggio Sostenibilità
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="space-y-2 sm:space-y-4">
                  {/* Barra progresso sostenibilità */}
                  <div>
                    <div className="flex justify-between mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium text-green-900">Impatto Ambientale</span>
                      <span className="text-xs sm:text-sm font-bold text-green-600">
                        {routeOptions.find(o => o.mode === mode)?.sustainability || 0}%
                      </span>
                    </div>
                    <div className="h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${routeOptions.find(o => o.mode === mode)?.sustainability || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Badge Carbon Credits */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    <div className="text-center p-1.5 sm:p-3 bg-white rounded-lg border border-green-200">
                      <div className="text-base sm:text-2xl mb-0.5 sm:mb-1">🌱</div>
                      <div className="text-[9px] sm:text-xs font-semibold text-green-900">Eco</div>
                    </div>
                    <div className="text-center p-1.5 sm:p-3 bg-white rounded-lg border border-green-200">
                      <div className="text-base sm:text-2xl mb-0.5 sm:mb-1">♻️</div>
                      <div className="text-[9px] sm:text-xs font-semibold text-green-900">Low CO₂</div>
                    </div>
                    <div className="text-center p-1.5 sm:p-3 bg-white rounded-lg border border-green-200">
                      <div className="text-base sm:text-2xl mb-0.5 sm:mb-1">🌍</div>
                      <div className="text-[9px] sm:text-xs font-semibold text-green-900">Green</div>
                    </div>
                  </div>

                  {/* Confronto CO₂ */}
                  <div className="text-xs sm:text-sm text-green-900 bg-white p-2 sm:p-3 rounded-lg border border-green-200">
                    <p className="font-semibold mb-1 sm:mb-2">Risparmio CO₂ vs Auto:</p>
                    <div className="flex items-center justify-between">
                      <span>Auto</span>
                      <span className="font-bold text-red-600">
                        {Math.round(plan.totalDistance * 193)}g
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                      <span>A piedi</span>
                      <span className="font-bold text-green-600">0g</span>
                    </div>
                    <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Risparmiato:</span>
                        <span className="font-bold text-green-600 text-[10px] sm:text-sm">
                          {plan.co2Saved}g (≈ {(plan.co2Saved / 22).toFixed(1)} alberi)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mappa Percorso rimossa - Navigazione gestita da Google/Apple Maps nativa */}

            {/* Tappe del percorso - Compatto su smartphone */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Tappe del Percorso</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Percorso ottimizzato TSP</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3">
                  {plan.stops.map((stop, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm sm:text-base">{stop.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{stop.address}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          {stop.duration} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Turn-by-turn navigation gestita da Google/Apple Maps */}

            {/* Azioni - Pulsanti grandi su smartphone */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                onClick={() => setPlan(null)}
                className="h-14 sm:h-14 text-base sm:text-lg font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Modifica
              </Button>
              <Button 
                onClick={handleStartNavigation} 
                className="h-14 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <Navigation className="h-5 w-5 mr-2" />
                Navigazione
              </Button>
            </div>
          </>
        )}

        {/* Info Box - Compatto su smartphone */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 overflow-hidden">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                <Leaf className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm sm:text-lg text-emerald-700 mb-2 sm:mb-3">Perché usare Route Etico?</p>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white/50 rounded-lg">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] sm:text-sm text-emerald-800">Risparmia tempo</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white/50 rounded-lg">
                    <Leaf className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] sm:text-sm text-emerald-800">Riduci CO₂</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white/50 rounded-lg">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] sm:text-sm text-emerald-800">+15 eco-crediti</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white/50 rounded-lg">
                    <Store className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] sm:text-sm text-emerald-800">Commercio locale</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mappa GIS Mercato - Sempre Visibile */}
          {/* Barra Ricerca e Filtri - Compatto su smartphone */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col gap-2 sm:gap-4">
                {/* Input Ricerca */}
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cerca mercato, impresa..."
                      value={gisSearchQuery}
                      onChange={(e) => setGisSearchQuery(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-8 sm:pl-10 pr-10 sm:pr-12 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-sm sm:text-base text-[#e8fbff] placeholder-[#e8fbff]/40 focus:outline-none focus:border-[#14b8a6] transition-colors"
                    />
                    <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-[#14b8a6]/60" />
                    <button className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 sm:py-1.5 bg-[#14b8a6] hover:bg-[#14b8a6]/80 rounded-md transition-colors">
                      <Send className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Filtri Posteggi - Grid su mobile */}
                <div className="grid grid-cols-4 sm:flex gap-1.5 sm:gap-2">
                  <button 
                    onClick={() => setGisStatusFilter('all')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border font-medium text-xs sm:text-sm transition-colors ${
                      gisStatusFilter === 'all' 
                        ? 'border-[#14b8a6] bg-[#14b8a6] text-white' 
                        : 'border-[#14b8a6]/30 bg-[#14b8a6]/10 text-[#14b8a6] hover:bg-[#14b8a6]/20'
                    }`}
                  >
                    Tutti
                  </button>
                  <button 
                    onClick={() => setGisStatusFilter('libero')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border font-medium text-xs sm:text-sm transition-colors ${
                      gisStatusFilter === 'libero'
                        ? 'border-[#10b981] bg-[#10b981] text-white'
                        : 'border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20'
                    }`}
                  >
                    Liberi
                  </button>
                  <button 
                    onClick={() => setGisStatusFilter('occupato')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border font-medium text-xs sm:text-sm transition-colors ${
                      gisStatusFilter === 'occupato'
                        ? 'border-[#ef4444] bg-[#ef4444] text-white'
                        : 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20'
                    }`}
                  >
                    Occ.
                  </button>
                  <button 
                    onClick={() => setGisStatusFilter('riservato')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border font-medium text-xs sm:text-sm transition-colors ${
                      gisStatusFilter === 'riservato'
                        ? 'border-[#f59e0b] bg-[#f59e0b] text-white'
                        : 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20'
                    }`}
                  >
                    Ris.
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiche Mercato - Grid compatto su smartphone */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-[#e8fbff]/60">Totali</p>
                    <p className="text-lg sm:text-2xl font-bold text-[#e8fbff]">{gisStalls.length}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                    <Store className="h-4 w-4 sm:h-6 sm:w-6 text-[#14b8a6]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-[#e8fbff]/60">Liberi</p>
                    <p className="text-lg sm:text-2xl font-bold text-[#10b981]">{gisStalls.filter(s => s.status === 'libero').length}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-[#10b981]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-[#e8fbff]/60">Occupati</p>
                    <p className="text-lg sm:text-2xl font-bold text-[#ef4444]">{gisStalls.filter(s => s.status === 'occupato').length}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                    <XCircle className="h-4 w-4 sm:h-6 sm:w-6 text-[#ef4444]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#f59e0b]/30">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-[#e8fbff]/60">Riservati</p>
                    <p className="text-lg sm:text-2xl font-bold text-[#f59e0b]">{gisStalls.filter(s => s.status === 'riservato').length}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#f59e0b]/20 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6 text-[#f59e0b]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mappa Gemello Digitale del Commercio */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#14b8a6]" />
                Rete Gemello Digitale del Commercio
                {plan && userLocation && (
                  <span className="ml-2 text-sm font-normal text-[#10b981]">
                    • Percorso Attivo
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                <GestioneHubMapWrapper 
                  routeConfig={routeConfig} 
                  navigationMode={{
                    active: navigationActive,
                    destinationName: destinationName,
                    onClose: handleCloseNavigation
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Legenda - Compatto su smartphone */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader className="p-3 sm:p-6 pb-0 sm:pb-0">
              <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-sm sm:text-base">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-[#14b8a6]" />
                Legenda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-2 sm:pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#a855f7]"></div>
                  <span className="text-xs sm:text-sm text-[#e8fbff]/80">HUB</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#14b8a6]"></div>
                  <span className="text-xs sm:text-sm text-[#e8fbff]/80">Mercato</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-[#3b82f6]"></div>
                  <span className="text-xs sm:text-sm text-[#e8fbff]/80">Bus</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-[#ef4444]"></div>
                  <span className="text-xs sm:text-sm text-[#e8fbff]/80">Treno</span>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
