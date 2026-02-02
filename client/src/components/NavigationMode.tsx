import { useEffect, useState, useCallback, useRef } from 'react';
import { useMap, Marker, Polyline } from 'react-leaflet';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Navigation, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface NavigationModeProps {
  destination: { lat: number; lng: number };
  destinationName: string;
  mode: 'walking' | 'cycling' | 'driving';
  onClose: () => void;
  routeGeometry?: { type: string; coordinates: number[][] };
}

interface NavigationInstruction {
  text: string;
  distance: number;
  duration: number;
  type: string;
  modifier?: string;
}

/**
 * Componente per la navigazione turn-by-turn sulla mappa GIS
 * - GPS tracking in tempo reale
 * - Istruzioni di navigazione
 * - Percorso tracciato
 * - Ricalcolo automatico se fuori percorso
 * 
 * v2.0 - Overlay renderizzato FUORI dalla mappa tramite Portal
 */
export function NavigationMode({ 
  destination, 
  destinationName, 
  mode, 
  onClose,
  routeGeometry 
}: NavigationModeProps) {
  console.log('[DEBUG NavigationMode] MOUNTED! destination:', destination, 'mode:', mode);
  const map = useMap();
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [instructions, setInstructions] = useState<NavigationInstruction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [arrived, setArrived] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  
  // Ref per il container dell'overlay (fuori dalla mappa)
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(null);

  // Trova il container per l'overlay (sopra i controlli mappa)
  useEffect(() => {
    // Cerca il container della mappa nel DOM
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      // Cerca o crea il container per l'overlay navigazione
      let overlay = document.getElementById('navigation-overlay-container');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'navigation-overlay-container';
        overlay.className = 'relative z-[9999]';
        // Inserisci PRIMA del map-container (sopra i controlli)
        mapContainer.parentNode?.insertBefore(overlay, mapContainer);
      }
      setOverlayContainer(overlay);
    }
    
    return () => {
      // Cleanup: rimuovi il container quando il componente smonta
      const overlay = document.getElementById('navigation-overlay-container');
      if (overlay) {
        overlay.remove();
      }
    };
  }, []);

  // Icona utente con direzione
  const userIcon = L.divIcon({
    className: 'user-navigation-marker',
    html: `<div style="
      width: 40px;
      height: 40px;
      background: #3b82f6;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(${heading}deg);
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  // Calcola distanza tra due punti
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // metri
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fetch route con istruzioni da OSRM
  const fetchRoute = useCallback(async (start: { lat: number; lng: number }) => {
    try {
      const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'car';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        
        // Estrai coordinate del percorso
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        );
        setRouteCoords(coords);
        
        // Estrai istruzioni
        const steps = route.legs[0]?.steps || [];
        const navInstructions: NavigationInstruction[] = steps.map((step: any) => ({
          // Usa sempre getManeuverText per avere istruzioni in italiano (ignora instruction inglese da OSRM)
          text: getManeuverText(step.maneuver?.type, step.maneuver?.modifier, step.name),
          distance: step.distance,
          duration: step.duration,
          type: step.maneuver?.type || 'continue',
          modifier: step.maneuver?.modifier
        }));
        setInstructions(navInstructions);
        
        // Distanza e tempo totali
        setDistanceRemaining(route.distance);
        setTimeRemaining(route.duration);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Errore fetch route:', error);
      return false;
    }
  }, [destination, mode]);

  // Genera testo istruzione da tipo manovra (tutto in italiano)
  const getManeuverText = (type: string, modifier?: string, streetName?: string): string => {
    const maneuvers: Record<string, string> = {
      // Svolte
      'turn-right': '↱ Gira a destra',
      'turn-left': '↰ Gira a sinistra',
      'turn-straight': '↑ Prosegui dritto',
      'turn-slight right': '↗ Leggermente a destra',
      'turn-slight left': '↖ Leggermente a sinistra',
      'turn-sharp right': '⤵ Svolta decisa a destra',
      'turn-sharp left': '⤴ Svolta decisa a sinistra',
      'turn-uturn': '↩ Inversione a U',
      // Continua
      'continue-straight': '↑ Continua dritto',
      'continue-slight right': '↗ Continua leggermente a destra',
      'continue-slight left': '↖ Continua leggermente a sinistra',
      'continue-right': '↱ Continua a destra',
      'continue-left': '↰ Continua a sinistra',
      'continue-uturn': '↩ Inversione a U',
      // Fork (bivio)
      'fork-right': '↱ Tieni la destra al bivio',
      'fork-left': '↰ Tieni la sinistra al bivio',
      'fork-slight right': '↗ Tieni leggermente a destra al bivio',
      'fork-slight left': '↖ Tieni leggermente a sinistra al bivio',
      'fork-straight': '↑ Prosegui dritto al bivio',
      // End of road
      'end of road-right': '↱ Fine strada, gira a destra',
      'end of road-left': '↰ Fine strada, gira a sinistra',
      // Merge
      'merge-right': '↱ Immettiti a destra',
      'merge-left': '↰ Immettiti a sinistra',
      'merge-slight right': '↗ Immettiti leggermente a destra',
      'merge-slight left': '↖ Immettiti leggermente a sinistra',
      'merge-straight': '↑ Immettiti',
      // New name (cambio nome strada)
      'new name-straight': '↑ Continua',
      'new name-slight right': '↗ Continua leggermente a destra',
      'new name-slight left': '↖ Continua leggermente a sinistra',
      // On ramp / Off ramp
      'on ramp-right': '↱ Prendi la rampa a destra',
      'on ramp-left': '↰ Prendi la rampa a sinistra',
      'on ramp-slight right': '↗ Prendi la rampa leggermente a destra',
      'on ramp-slight left': '↖ Prendi la rampa leggermente a sinistra',
      'off ramp-right': '↱ Esci a destra',
      'off ramp-left': '↰ Esci a sinistra',
      'off ramp-slight right': '↗ Esci leggermente a destra',
      'off ramp-slight left': '↖ Esci leggermente a sinistra',
      // Rotonda
      'roundabout-right': '🔄 Alla rotonda, esci a destra',
      'roundabout-left': '🔄 Alla rotonda, esci a sinistra',
      'roundabout-straight': '🔄 Alla rotonda, prosegui dritto',
      'roundabout-slight right': '🔄 Alla rotonda, esci leggermente a destra',
      'roundabout-slight left': '🔄 Alla rotonda, esci leggermente a sinistra',
      'roundabout turn-right': '🔄 Alla rotonda, gira a destra',
      'roundabout turn-left': '🔄 Alla rotonda, gira a sinistra',
      'roundabout turn-straight': '🔄 Alla rotonda, prosegui dritto',
      // Rotonda piccola
      'exit roundabout-right': '🔄 Esci dalla rotonda a destra',
      'exit roundabout-left': '🔄 Esci dalla rotonda a sinistra',
      'exit roundabout-straight': '🔄 Esci dalla rotonda dritto',
      // Tipi base
      'straight': '↑ Prosegui dritto',
      'slight-right': '↗ Leggermente a destra',
      'slight-left': '↖ Leggermente a sinistra',
      'sharp-right': '⤵ Svolta decisa a destra',
      'sharp-left': '⤴ Svolta decisa a sinistra',
      'uturn': '↩ Inversione a U',
      'arrive': '🎯 Sei arrivato!',
      'depart': '🚀 Parti',
      'roundabout': '🔄 Rotonda',
      'continue': '↑ Continua',
      'turn': '↱ Gira',
      'fork': '↗ Bivio',
      'merge': '↱ Immettiti',
      'notification': '📍 Nota',
      'exit rotary': '🔄 Esci dalla rotonda'
    };
    
    const key = modifier ? `${type}-${modifier}` : type;
    let text = maneuvers[key] || maneuvers[type];
    
    // Fallback per tipi non mappati
    if (!text) {
      // Traduci tipi comuni non mappati
      if (type === 'fork' && modifier === 'slight right') text = '↗ Tieni leggermente a destra al bivio';
      else if (type === 'fork' && modifier === 'slight left') text = '↖ Tieni leggermente a sinistra al bivio';
      else if (modifier === 'right') text = '↱ Gira a destra';
      else if (modifier === 'left') text = '↰ Gira a sinistra';
      else if (modifier === 'straight') text = '↑ Prosegui dritto';
      else if (modifier === 'slight right') text = '↗ Leggermente a destra';
      else if (modifier === 'slight left') text = '↖ Leggermente a sinistra';
      else text = '↑ Continua';
    }
    
    // Aggiungi nome strada se disponibile
    if (streetName && streetName !== '' && !streetName.includes('unnamed')) {
      text += ` su ${streetName}`;
    }
    
    return text;
  };

  // Sintesi vocale per istruzioni
  const speakInstruction = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Aggiorna step corrente basato sulla posizione
  const updateCurrentStep = useCallback((position: { lat: number; lng: number }) => {
    if (instructions.length === 0 || routeCoords.length === 0) return;
    
    // Trova il punto più vicino sul percorso
    let minDist = Infinity;
    let closestIdx = 0;
    
    routeCoords.forEach((coord, idx) => {
      const dist = calculateDistance(position.lat, position.lng, coord[0], coord[1]);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    
    // Se troppo lontano dal percorso (>50m), segnala fuori percorso
    if (minDist > 50) {
      setIsOffRoute(true);
    } else {
      setIsOffRoute(false);
    }
    
    // Aggiorna distanza rimanente
    let remainingDist = 0;
    for (let i = closestIdx; i < routeCoords.length - 1; i++) {
      remainingDist += calculateDistance(
        routeCoords[i][0], routeCoords[i][1],
        routeCoords[i+1][0], routeCoords[i+1][1]
      );
    }
    setDistanceRemaining(remainingDist);
    
    // Calcola tempo rimanente (stima)
    const speed = mode === 'walking' ? 1.4 : mode === 'cycling' ? 4.5 : 13.9; // m/s
    setTimeRemaining(remainingDist / speed);
    
    // Verifica arrivo
    const distToDestination = calculateDistance(
      position.lat, position.lng,
      destination.lat, destination.lng
    );
    
    if (distToDestination < 30) {
      setArrived(true);
      speakInstruction('Sei arrivato a destinazione!');
    }
    
    // Aggiorna step corrente basato sulla distanza percorsa
    let accumulatedDist = 0;
    for (let i = 0; i < instructions.length; i++) {
      accumulatedDist += instructions[i].distance;
      if (closestIdx * (routeCoords.length / instructions.length) < i + 1) {
        if (i !== currentStep) {
          setCurrentStep(i);
          speakInstruction(instructions[i].text);
        }
        break;
      }
    }
  }, [instructions, routeCoords, destination, mode, currentStep, speakInstruction]);

  // Stato per loading GPS
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Zoom iniziale sulla destinazione quando parte la navigazione
  useEffect(() => {
    // Centra subito sulla destinazione mentre aspetta GPS
    map.setView([destination.lat, destination.lng], 15, { animate: true });
  }, [map, destination]);

  // Avvia GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalizzazione non supportata');
      setGpsLoading(false);
      return;
    }

    // Opzioni GPS ad alta precisione
    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    // Watch position per tracking continuo
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGpsLoading(false);
        setGpsError(null);
        
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserPosition(newPos);
        
        // Aggiorna heading se disponibile
        if (position.coords.heading !== null) {
          setHeading(position.coords.heading);
        }
        
        // Centra mappa sulla posizione utente
        map.setView([newPos.lat, newPos.lng], 17, { animate: true });
        
        // Aggiorna navigazione
        updateCurrentStep(newPos);
      },
      (error) => {
        console.error('Errore GPS:', error);
        setGpsLoading(false);
        if (error.code === 1) {
          setGpsError('Permesso GPS negato. Abilita la posizione.');
        } else if (error.code === 2) {
          setGpsError('Posizione non disponibile.');
        } else {
          setGpsError('Timeout GPS. Riprova.');
        }
      },
      geoOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [map, updateCurrentStep]);

  // Fetch route iniziale
  useEffect(() => {
    if (userPosition) {
      fetchRoute(userPosition);
    }
  }, [userPosition?.lat, userPosition?.lng, fetchRoute]);

  // Ricalcola percorso se fuori rotta
  const handleRecalculate = async () => {
    if (userPosition) {
      setIsOffRoute(false);
      await fetchRoute(userPosition);
      speakInstruction('Percorso ricalcolato');
    }
  };

  // Formatta distanza
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Formatta tempo
  const formatTime = (seconds: number): string => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}min`;
  };

  // Componente UI Overlay (renderizzato tramite Portal)
  const NavigationOverlayUI = () => (
    <div className="mb-2 px-1 sm:px-0">
      <Card className="bg-slate-900/95 backdrop-blur-md border-slate-700 p-3 sm:p-4">
        {/* Header con destinazione e controlli */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
            <span className="text-white font-medium truncate max-w-[150px] sm:max-w-[200px] text-sm sm:text-base">
              {destinationName}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-white"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? <Volume2 className="h-3 w-3 sm:h-4 sm:w-4" /> : <VolumeX className="h-3 w-3 sm:h-4 sm:w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {/* Istruzione corrente */}
        {arrived ? (
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3 sm:p-4 text-center">
            <span className="text-xl sm:text-2xl">🎉</span>
            <p className="text-emerald-400 font-bold text-base sm:text-lg mt-2">Sei arrivato!</p>
            <p className="text-slate-400 text-xs sm:text-sm">{destinationName}</p>
          </div>
        ) : gpsError ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-2 sm:p-3">
            <p className="text-red-400 text-sm">❌ {gpsError}</p>
            <p className="text-slate-400 text-xs mt-1">Verifica le impostazioni GPS del dispositivo</p>
          </div>
        ) : gpsLoading ? (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <p className="text-blue-400 text-sm">Acquisizione posizione GPS...</p>
            </div>
            <p className="text-slate-400 text-xs mt-1">Assicurati che il GPS sia attivo</p>
          </div>
        ) : instructions[currentStep] ? (
          <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3">
            <p className="text-white text-lg sm:text-xl font-bold">
              🚀 {instructions[currentStep].text.includes('depart') || instructions[currentStep].type === 'depart' ? 'Parti' : instructions[currentStep].text}
            </p>
            {instructions[currentStep + 1] && (
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Poi: {instructions[currentStep + 1].text}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-lg p-2 sm:p-3">
            <p className="text-slate-400 text-sm">Calcolo percorso in corso...</p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between mt-2 sm:mt-3 text-xs sm:text-sm">
          <div className="text-slate-400">
            <span className="text-white font-bold">{formatDistance(distanceRemaining)}</span>
            {' '}rimanenti
          </div>
          <div className="text-slate-400">
            <span className="text-white font-bold">{formatTime(timeRemaining)}</span>
            {' '}stimati
          </div>
        </div>

        {/* Avviso fuori percorso */}
        {isOffRoute && (
          <div className="mt-2 sm:mt-3 bg-amber-500/20 border border-amber-500/30 rounded-lg p-2 sm:p-3 flex items-center justify-between">
            <span className="text-amber-400 text-xs sm:text-sm">⚠️ Sei fuori percorso</span>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500 text-amber-400 hover:bg-amber-500/20 h-7 text-xs"
              onClick={handleRecalculate}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Ricalcola
            </Button>
          </div>
        )}
      </Card>
      
      {/* Pulsante Termina Navigazione */}
      <Button
        className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white h-10 sm:h-11"
        onClick={onClose}
      >
        <X className="h-4 w-4 mr-2" />
        Termina Navigazione
      </Button>
    </div>
  );

  return (
    <>
      {/* Percorso sulla mappa */}
      {routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{
            color: '#10b981',
            weight: 6,
            opacity: 0.8
          }}
        />
      )}

      {/* Marker posizione utente */}
      {userPosition && (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
          icon={userIcon}
        />
      )}

      {/* Marker destinazione */}
      <Marker
        position={[destination.lat, destination.lng]}
        icon={L.divIcon({
          className: 'destination-marker',
          html: `<div style="
            background: #10b981;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
            border: 3px solid white;
          ">🎯</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        })}
      />

      {/* UI Navigazione overlay - renderizzato FUORI dalla mappa tramite Portal */}
      {overlayContainer && createPortal(<NavigationOverlayUI />, overlayContainer)}
    </>
  );
}
