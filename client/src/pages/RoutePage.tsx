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
import { Navigation, ArrowLeft, Leaf, Clock, MapPin, TrendingUp, Car, Bike, Footprints, Bus, Loader2, Store } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Link, useLocation } from 'wouter';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/hooks/useImpersonation';
import { toast } from 'sonner';
import { useEffect } from 'react';

import GestioneHubMapWrapper from '@/components/GestioneHubMapWrapper';

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
      const name = destinationName || marketName || 'Destinazione';
      setDestination(`${name} (${destinationLat}, ${destinationLng})`);
      toast.success(`🎯 Destinazione caricata: ${name}`);
    } else if (address) {
      setDestination(shopName ? `${shopName} - ${address}` : address);
      toast.success('Destinazione caricata!');
    }
  }, [location]);

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
      const coordMatch = destination.match(/\(([-\d.]+),\s*([-\d.]+)\)/);
      const stallMatch = destination.match(/Posteggio #(\d+)/);
      
      let destinationPayload: any;
      
      if (coordMatch) {
        destinationPayload = {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2])
        };
      } else if (stallMatch) {
        destinationPayload = { stallId: parseInt(stallMatch[1]) };
      } else {
        destinationPayload = { marketId: 1 };
      }

      const modeMap: Record<string, string> = {
        'walk': 'walking',
        'bike': 'cycling',
        'transit': 'bus',
        'car': 'driving'
      };

      const apiMode = modeMap[mode] || 'walking';

      const API_URL = MIHUB_API_BASE_URL;
      const requestPayload = {
        start: {
          lat: currentUserLocation.lat,
          lng: currentUserLocation.lng
        },
        destination: destinationPayload,
        mode: apiMode,
        includeTPL: mode === 'transit'
      };
      
      const response = await authenticatedFetch(`${API_URL}/api/routing/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error('Errore calcolo percorso');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Errore calcolo percorso');
      }

      const route = data.route;
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
      
      let destLat: number | undefined;
      let destLng: number | undefined;
      
      if (destinationPayload.lat && destinationPayload.lng) {
        destLat = destinationPayload.lat;
        destLng = destinationPayload.lng;
      }
      else if (route.geometry?.coordinates?.length > 0) {
        const lastCoord = route.geometry.coordinates[route.geometry.coordinates.length - 1];
        destLat = lastCoord[1];
        destLng = lastCoord[0];
      }
      else {
        const destMatch = destination.match(/\(([\d.]+),\s*([\d.]+)\)/);
        if (destMatch) {
          destLat = parseFloat(destMatch[1]);
          destLng = parseFloat(destMatch[2]);
        }
      }
      
      if (currentUserLocation && destLat && destLng) {
        const modeMap: Record<string, 'walking' | 'cycling' | 'driving'> = {
          'walk': 'walking',
          'bike': 'cycling',
          'transit': 'walking',
          'car': 'driving'
        };
        const newRouteConfig = {
          enabled: true,
          userLocation: currentUserLocation,
          destination: { lat: destLat, lng: destLng },
          mode: modeMap[mode] || 'walking'
        };
        setRouteConfig(newRouteConfig);
      } else {
        console.error('[DEBUG] Cannot set routeConfig - missing data:', {
          currentUserLocation,
          destLat,
          destLng
        });
        toast.error('Impossibile visualizzare percorso sulla mappa');
      }
      
      const modes = ['walking', 'cycling', 'bus', 'driving'];
      const options = await Promise.all(
        modes.map(async (m) => {
          try {
            const res = await authenticatedFetch(`${API_URL}/api/routing/calculate`, {
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
              co2_saved: d.route.summary.co2_saved_g,
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
    if (!plan || !routeConfig) {
      toast.error('Calcola prima il percorso');
      console.error('[DEBUG] Missing plan or routeConfig');
      return;
    }
    
    const destName = destination.split('(')[0].trim() || 'Destinazione';
    setDestinationName(destName);
    
    setNavigationActive(true);
    
    toast.success(`🧭 Navigazione avviata sulla mappa! +${plan.creditsEarned} crediti al completamento`, {
      duration: 5000
    });
  };
  
  const handleCloseNavigation = () => {
    setNavigationActive(false);
    toast.info('Navigazione terminata');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header con gradient - ABBASSATO */}
      <header className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-3 shadow-lg">
        <div className="w-full px-2 sm:px-4 md:px-8 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Shopping Route Etico</h1>
              <p className="text-[10px] text-white/70">Naviga sostenibile, guadagna crediti</p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-1 sm:px-2 py-2 sm:py-4 space-y-2 sm:space-y-4">
        {/* Form Pianificazione - COMPATTO */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 overflow-hidden rounded-none sm:rounded-lg">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary to-emerald-500 rounded-lg shadow-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Pianifica il tuo Percorso</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Ottimizziamo il tuo itinerario per risparmiare tempo e CO₂
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-3 pb-3">
            {/* Modalità trasporto */}
            <div className="space-y-1">
              <Label htmlFor="mode" className="text-xs">Modalità di trasporto</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger id="mode" className="h-9">
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
            <div className="space-y-1">
              <Label htmlFor="origin" className="text-xs">Partenza</Label>
              <div className="flex gap-2">
                <Input
                  id="origin"
                  placeholder="es. Via Mazzini 10, Grosseto"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={getUserLocation}
                  disabled={loadingLocation}
                  title="Usa posizione corrente"
                  className="h-9 w-9"
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
            <div className="space-y-1">
              <Label htmlFor="destination" className="text-xs">Destinazione finale</Label>
              <Input
                id="destination"
                placeholder="es. Centro città, Via Roma..."
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Confronto Modalità */}
            {routeOptions.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Confronto Opzioni di Trasporto</Label>
                <div className="grid grid-cols-2 gap-2">
                  {routeOptions.map((option, idx) => (
                    <button
                      key={option.mode}
                      onClick={() => {
                        setMode(option.mode);
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
                      className={`p-2 border rounded-lg text-left transition-all ${
                        mode === option.mode
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {option.icon}
                        <span className="font-semibold text-xs">{option.label}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {option.duration} min • -{option.co2_saved}g CO₂
                      </div>
                      <div className="text-[10px] font-semibold text-green-600">
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
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calcolo in corso...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Pianifica Percorso
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Risultato Pianificazione */}
        {plan && (
          <>
            {/* Statistiche - COMPATTE */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-1 sm:px-0">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg">
                <CardContent className="pt-3 pb-3 text-center px-2">
                  <div className="w-9 h-9 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{plan.totalDistance}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">km totali</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg">
                <CardContent className="pt-3 pb-3 text-center px-2">
                  <div className="w-9 h-9 mx-auto mb-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{plan.totalTime}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">minuti</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg">
                <CardContent className="pt-3 pb-3 text-center px-2">
                  <div className="w-9 h-9 mx-auto mb-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Leaf className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{plan.co2Saved}g</div>
                  <div className="text-[10px] text-muted-foreground font-medium">CO₂ evitata</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg">
                <CardContent className="pt-3 pb-3 text-center px-2">
                  <div className="w-9 h-9 mx-auto mb-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600">+{plan.creditsEarned}</div>
                  <div className="text-[10px] text-muted-foreground font-medium">crediti</div>
                </CardContent>
              </Card>
            </div>

            {/* Punteggio Sostenibilità - COMPATTO */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 rounded-none sm:rounded-lg mx-0">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-green-900 flex items-center gap-2 text-sm">
                  <Leaf className="h-4 w-4" />
                  Punteggio Sostenibilità
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  {/* Barra progresso sostenibilità */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-green-900">Impatto Ambientale</span>
                      <span className="text-xs font-bold text-green-600">
                        {routeOptions.find(o => o.mode === mode)?.sustainability || 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${routeOptions.find(o => o.mode === mode)?.sustainability || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Badge Carbon Credits - COMPATTI */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                      <div className="text-lg mb-0.5">🌱</div>
                      <div className="text-[9px] font-semibold text-green-900">Eco-Friendly</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                      <div className="text-lg mb-0.5">♻️</div>
                      <div className="text-[9px] font-semibold text-green-900">Low Carbon</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                      <div className="text-lg mb-0.5">🌍</div>
                      <div className="text-[9px] font-semibold text-green-900">Sustainable</div>
                    </div>
                  </div>

                  {/* Confronto CO₂ - COMPATTO */}
                  <div className="text-xs text-green-900 bg-white p-2 rounded-lg border border-green-200">
                    <p className="font-semibold mb-1">Risparmio CO₂ vs Auto:</p>
                    <div className="flex items-center justify-between">
                      <span>Auto (benzina)</span>
                      <span className="font-bold text-red-600">
                        {Math.round(plan.totalDistance * 193)}g CO₂
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span>A piedi</span>
                      <span className="font-bold text-green-600">0g CO₂</span>
                    </div>
                    <div className="mt-1 pt-1 border-t border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Risparmiato:</span>
                        <span className="font-bold text-green-600">
                          {plan.co2Saved}g CO₂ (≈ {(plan.co2Saved / 22).toFixed(1)} alberi/anno)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tappe del percorso - COMPATTO */}
            <Card className="rounded-none sm:rounded-lg">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm">Tappe del Percorso</CardTitle>
                <CardDescription className="text-xs">Percorso ottimizzato con algoritmo TSP</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-2">
                  {plan.stops.map((stop, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{stop.name}</p>
                        <p className="text-xs text-muted-foreground">{stop.address}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Tempo stimato: {stop.duration} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Azioni */}
            <div className="grid grid-cols-2 gap-2 px-1 sm:px-0">
              <Button 
                variant="outline" 
                onClick={() => setPlan(null)}
                className="h-11 text-sm font-semibold border-2 hover:bg-muted/50 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Modifica
              </Button>
              <Button 
                onClick={handleStartNavigation} 
                className="h-11 text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Navigation className="h-4 w-4 mr-1" />
                Avvia Navigazione
              </Button>
            </div>
          </>
        )}

        {/* Info Box - COMPATTO */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 overflow-hidden rounded-none sm:rounded-lg">
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-lg flex-shrink-0 h-fit">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-emerald-700 mb-2">Perché usare Shopping Route?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1.5 p-1.5 bg-white/50 rounded-lg">
                    <Clock className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] text-emerald-800">Percorso ottimizzato per risparmiare tempo</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-white/50 rounded-lg">
                    <Leaf className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] text-emerald-800">Riduci le emissioni di CO₂</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-white/50 rounded-lg">
                    <TrendingUp className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] text-emerald-800">Guadagna +15 eco-crediti al completamento</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 bg-white/50 rounded-lg">
                    <Store className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                    <span className="text-[10px] text-emerald-800">Supporta il commercio locale e sostenibile</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mappa Gemello Digitale del Commercio - FULLSCREEN MOBILE */}
        <div className="rounded-none sm:rounded-lg overflow-hidden border-0 sm:border sm:border-[#14b8a6]/30">
          <GestioneHubMapWrapper 
            routeConfig={routeConfig} 
            navigationMode={{
              active: navigationActive,
              destinationName: destinationName,
              onClose: handleCloseNavigation
            }}
          />
        </div>
      </div>
    </div>
  );
}
