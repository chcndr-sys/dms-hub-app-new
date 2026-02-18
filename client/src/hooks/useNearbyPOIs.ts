/**
 * Hook per rilevamento POI vicini tramite GPS
 * 
 * Gestisce:
 * - Rilevamento posizione GPS dello smartphone
 * - Chiamata all'endpoint /nearby-pois
 * - Check-in automatico per cultura e mobilità
 * - Gestione permessi geolocalizzazione
 * 
 * @version 3.77.0
 * @date 4 Febbraio 2026
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Configurazione — in produzione usa proxy Vercel, in dev URL diretto
const API_BASE_URL = import.meta.env.DEV
  ? 'https://orchestratore.mio-hub.me/api'
  : '/api';
const GPS_CHECK_INTERVAL = 30000; // 30 secondi tra ogni check
const MIN_DISTANCE_CHANGE = 10; // Metri minimi di spostamento per nuovo check

// Tipi
export interface NearbyPOI {
  id: number;
  type: 'culture' | 'mobility';
  poi_type: string;
  name: string;
  lat: number;
  lng: number;
  distance_m: number;
  tcc_reward: number;
  already_visited_today: boolean;
  stop_id?: string; // Solo per mobilità
}

export interface NearbyPOIsResponse {
  success: boolean;
  nearby_pois: NearbyPOI[];
  count: number;
  search_params: {
    lat: number;
    lng: number;
    radius: number;
    comune_id: number;
    types: string;
  };
  error?: string;
}

export interface CheckinResponse {
  success: boolean;
  credits_earned?: number;
  message?: string;
  error?: string;
}

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface UseNearbyPOIsOptions {
  comuneId: number;
  userId?: string;
  radius?: number;
  types?: 'culture' | 'mobility' | 'all';
  enabled?: boolean;
  onPOIFound?: (pois: NearbyPOI[]) => void;
  onCheckinSuccess?: (poi: NearbyPOI, credits: number) => void;
  onError?: (error: string) => void;
}

/**
 * Hook principale per rilevamento POI vicini
 */
export function useNearbyPOIs(options: UseNearbyPOIsOptions) {
  const {
    comuneId,
    userId,
    radius = 50,
    types = 'all',
    enabled = true,
    onPOIFound,
    onCheckinSuccess,
    onError,
  } = options;

  // Stati
  const [nearbyPOIs, setNearbyPOIs] = useState<NearbyPOI[]>([]);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);

  // Refs per evitare re-render inutili
  const lastPositionRef = useRef<GPSPosition | null>(null);
  const watchIdRef = useRef<number | null>(null);

  /**
   * Calcola distanza tra due punti GPS (formula Haversine)
   */
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Raggio Terra in metri
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  /**
   * Verifica permessi geolocalizzazione
   */
  const checkPermissions = useCallback(async () => {
    if (!navigator.permissions) {
      setPermissionStatus('unknown');
      return 'unknown';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
      
      // Ascolta cambiamenti permessi
      result.onchange = () => {
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
      };
      
      return result.state;
    } catch (err) {
      console.warn('[useNearbyPOIs] Cannot check permissions:', err);
      setPermissionStatus('unknown');
      return 'unknown';
    }
  }, []);

  /**
   * Chiama l'endpoint /nearby-pois
   */
  const fetchNearbyPOIs = useCallback(async (position: GPSPosition): Promise<NearbyPOI[]> => {
    try {
      const params = new URLSearchParams({
        lat: position.lat.toString(),
        lng: position.lng.toString(),
        comune_id: comuneId.toString(),
        radius: radius.toString(),
        types: types,
        ...(userId && { user_id: userId }),
      });

      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_BASE_URL}/gaming-rewards/nearby-pois?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data: NearbyPOIsResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Errore nel recupero POI vicini');
      }

      return data.nearby_pois;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('[useNearbyPOIs] Fetch error:', errorMsg);
      throw err;
    }
  }, [comuneId, radius, types, userId]);

  /**
   * Effettua check-in per un POI
   */
  const doCheckin = useCallback(async (poi: NearbyPOI): Promise<CheckinResponse> => {
    if (!currentPosition) {
      return { success: false, error: 'Posizione GPS non disponibile' };
    }

    // Verifica accuracy GPS prima di procedere
    if (currentPosition.accuracy > 150) {
      return { success: false, error: 'Precisione GPS insufficiente. Spostati in un\'area aperta.' };
    }

    try {
      const endpoint = poi.type === 'culture'
        ? `${API_BASE_URL}/gaming-rewards/culture/checkin`
        : `${API_BASE_URL}/gaming-rewards/mobility/checkin`;

      // Genera idempotency key e nonce anti-replay
      const idempotencyKey = crypto.randomUUID();
      const nonce = crypto.randomUUID();
      const token = localStorage.getItem('token') || '';

      const body = poi.type === 'culture'
        ? {
            user_id: userId,
            poi_type: poi.poi_type,
            poi_id: poi.id.toString(),
            poi_name: poi.name,
            lat: currentPosition.lat,
            lng: currentPosition.lng,
            accuracy: currentPosition.accuracy,
            comune_id: comuneId,
            timestamp: Date.now(),
            nonce,
          }
        : {
            user_id: userId,
            stop_id: poi.stop_id,
            stop_name: poi.name,
            lat: currentPosition.lat,
            lng: currentPosition.lng,
            accuracy: currentPosition.accuracy,
            comune_id: comuneId,
            timestamp: Date.now(),
            nonce,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success && onCheckinSuccess) {
        onCheckinSuccess(poi, data.credits_earned || poi.tcc_reward);
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore check-in';
      console.error('[useNearbyPOIs] Checkin error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [currentPosition, userId, comuneId, onCheckinSuccess]);

  /**
   * Gestisce aggiornamento posizione GPS
   */
  const handlePositionUpdate = useCallback(async (position: GeolocationPosition) => {
    const newPosition: GPSPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };

    // Verifica se ci siamo spostati abbastanza
    if (lastPositionRef.current) {
      const distance = calculateDistance(
        lastPositionRef.current.lat,
        lastPositionRef.current.lng,
        newPosition.lat,
        newPosition.lng
      );

      // Se non ci siamo spostati abbastanza e non è passato abbastanza tempo, skip
      const timeSinceLastCheck = Date.now() - lastCheckTime;
      if (distance < MIN_DISTANCE_CHANGE && timeSinceLastCheck < GPS_CHECK_INTERVAL) {
        return;
      }
    }

    lastPositionRef.current = newPosition;
    setCurrentPosition(newPosition);
    setLastCheckTime(Date.now());
    setIsLoading(true);
    setError(null);

    try {
      const pois = await fetchNearbyPOIs(newPosition);
      setNearbyPOIs(pois);

      // Callback se trovati POI non ancora visitati
      const unvisitedPOIs = pois.filter(p => !p.already_visited_today);
      if (unvisitedPOIs.length > 0 && onPOIFound) {
        onPOIFound(unvisitedPOIs);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [calculateDistance, fetchNearbyPOIs, lastCheckTime, onPOIFound, onError]);

  /**
   * Gestisce errore geolocalizzazione
   */
  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    let errorMsg = 'Errore geolocalizzazione';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMsg = 'Permesso geolocalizzazione negato';
        setPermissionStatus('denied');
        break;
      case error.POSITION_UNAVAILABLE:
        errorMsg = 'Posizione non disponibile';
        break;
      case error.TIMEOUT:
        errorMsg = 'Timeout richiesta posizione';
        break;
    }

    setError(errorMsg);
    if (onError) onError(errorMsg);
    console.error('[useNearbyPOIs] GPS Error:', errorMsg);
  }, [onError]);

  /**
   * Avvia tracking GPS
   */
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata');
      return;
    }

    // Prima ottieni posizione corrente
    navigator.geolocation.getCurrentPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Poi avvia watch per aggiornamenti continui
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Cache 30 secondi
      }
    );
  }, [handlePositionUpdate, handlePositionError]);

  /**
   * Ferma tracking GPS
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  /**
   * Forza refresh posizione
   */
  const refreshPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [handlePositionUpdate, handlePositionError]);

  // Effetti
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  useEffect(() => {
    if (enabled && permissionStatus !== 'denied') {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, permissionStatus, startTracking, stopTracking]);

  return {
    // Dati
    nearbyPOIs,
    currentPosition,
    permissionStatus,
    
    // Stati
    isLoading,
    error,
    
    // Azioni
    doCheckin,
    refreshPosition,
    startTracking,
    stopTracking,
    
    // Helpers
    hasUnvisitedPOIs: nearbyPOIs.some(p => !p.already_visited_today),
    unvisitedCount: nearbyPOIs.filter(p => !p.already_visited_today).length,
    totalTCCAvailable: nearbyPOIs
      .filter(p => !p.already_visited_today)
      .reduce((sum, p) => sum + p.tcc_reward, 0),
  };
}

/**
 * Hook semplificato per ottenere solo la posizione GPS
 */
export function useGPSPosition() {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalizzazione non supportata');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return { position, error, isLoading, getPosition };
}

export default useNearbyPOIs;
