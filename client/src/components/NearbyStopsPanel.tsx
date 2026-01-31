/**
 * NearbyStopsPanel.tsx
 * 
 * Pannello che mostra le fermate bus/treni vicine a un HUB o Mercato selezionato.
 * Si apre come sidebar o modal quando l'utente clicca su un punto di interesse.
 */

import React, { useEffect, useState } from 'react';
import { useTransport } from '@/contexts/TransportContext';
import { TransportStop } from '@/components/TransportStopsLayer';

interface NearbyStopsPanelProps {
  // Punto di riferimento (HUB o Mercato)
  referencePoint?: {
    lat: number;
    lng: number;
    name: string;
    type: 'hub' | 'mercato';
  };
  // Raggio di ricerca in km
  radiusKm?: number;
  // Callback quando si clicca su una fermata
  onStopClick?: (stop: TransportStop) => void;
  // Callback per chiudere il pannello
  onClose?: () => void;
  // Visibilità
  isOpen?: boolean;
}

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

// Formatta distanza per visualizzazione
const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

// Stima tempo a piedi (5 km/h media)
const estimateWalkTime = (km: number): string => {
  const minutes = Math.round((km / 5) * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
};

export function NearbyStopsPanel({
  referencePoint,
  radiusKm = 2,
  onStopClick,
  onClose,
  isOpen = false,
}: NearbyStopsPanelProps) {
  const { stops, loadStopsNearPoint, isLoading } = useTransport();
  const [nearbyStops, setNearbyStops] = useState<TransportStop[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'bus' | 'train'>('all');

  // Carica fermate vicine quando cambia il punto di riferimento
  useEffect(() => {
    if (!referencePoint || !isOpen) {
      setNearbyStops([]);
      return;
    }

    const loadNearby = async () => {
      // Prima prova API
      const apiStops = await loadStopsNearPoint(
        referencePoint.lat,
        referencePoint.lng,
        radiusKm
      );

      if (apiStops.length > 0) {
        setNearbyStops(apiStops);
      } else {
        // Fallback: filtra dalle fermate già caricate
        const filtered = stops
          .map(stop => ({
            ...stop,
            distance: calculateDistance(
              referencePoint.lat,
              referencePoint.lng,
              stop.stop_lat,
              stop.stop_lon
            ),
          }))
          .filter(stop => stop.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance);
        
        setNearbyStops(filtered);
      }
    };

    loadNearby();
  }, [referencePoint, radiusKm, isOpen, stops, loadStopsNearPoint]);

  // Filtra per tipo selezionato
  const filteredStops = nearbyStops.filter(stop => {
    if (selectedType === 'all') return true;
    if (selectedType === 'bus') return stop.stop_type === 'bus';
    if (selectedType === 'train') return ['train', 'tram', 'metro'].includes(stop.stop_type);
    return true;
  });

  // Conta per tipo
  const busCount = nearbyStops.filter(s => s.stop_type === 'bus').length;
  const trainCount = nearbyStops.filter(s => ['train', 'tram', 'metro'].includes(s.stop_type)).length;

  if (!isOpen || !referencePoint) {
    return null;
  }

  return (
    <div className="absolute right-0 top-0 h-full w-full sm:w-96 bg-[#0b1220] border-l border-gray-700 shadow-2xl z-[1001] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-[#1e293b]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {referencePoint.type === 'hub' ? '🏢' : '🏪'}
            </span>
            <div>
              <h2 className="font-bold text-white text-lg">{referencePoint.name}</h2>
              <p className="text-xs text-gray-400">
                Fermate nel raggio di {radiusKm} km
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filtri tipo */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-[#14b8a6] text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tutti ({nearbyStops.length})
          </button>
          <button
            onClick={() => setSelectedType('bus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              selectedType === 'bus'
                ? 'bg-[#2196F3] text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🚌 Bus ({busCount})
          </button>
          <button
            onClick={() => setSelectedType('train')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              selectedType === 'train'
                ? 'bg-[#4CAF50] text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🚂 Treni ({trainCount})
          </button>
        </div>
      </div>

      {/* Lista fermate */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <svg className="animate-spin w-8 h-8 text-[#14b8a6]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl mb-4 block">🚫</span>
            <p className="text-gray-400">
              Nessuna fermata trovata nel raggio di {radiusKm} km
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredStops.map((stop, index) => {
              const distance = referencePoint
                ? calculateDistance(
                    referencePoint.lat,
                    referencePoint.lng,
                    stop.stop_lat,
                    stop.stop_lon
                  )
                : 0;

              return (
                <button
                  key={stop.stop_id}
                  onClick={() => onStopClick?.(stop)}
                  className="w-full p-4 text-left hover:bg-[#1e293b] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Icona tipo */}
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                      style={{
                        background: stop.stop_type === 'train' ? '#E8F5E9' :
                                   stop.stop_type === 'tram' ? '#FFF3E0' :
                                   stop.stop_type === 'metro' ? '#F3E5F5' : '#E3F2FD',
                      }}
                    >
                      {stop.stop_type === 'train' ? '🚂' :
                       stop.stop_type === 'tram' ? '🚊' :
                       stop.stop_type === 'metro' ? '🚇' : '🚌'}
                    </div>

                    {/* Info fermata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white truncate">
                          {stop.stop_name}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400 shrink-0">
                          #{index + 1}
                        </span>
                      </div>
                      
                      {stop.agency_name && (
                        <p className="text-xs text-gray-500 mb-2">
                          {stop.agency_name}
                        </p>
                      )}

                      {/* Linee */}
                      {stop.routes && stop.routes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {stop.routes.slice(0, 5).map(route => (
                            <span
                              key={route.route_id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                background: route.route_color ? `#${route.route_color}` : '#374151',
                                color: 'white',
                              }}
                            >
                              {route.route_short_name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Distanza e tempo */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[#14b8a6] font-medium">
                          📍 {formatDistance(distance)}
                        </span>
                        <span className="text-gray-500">
                          🚶 {estimateWalkTime(distance)}
                        </span>
                      </div>
                    </div>

                    {/* Freccia */}
                    <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 bg-[#1e293b]">
        <p className="text-[10px] text-gray-500 text-center">
          Dati GTFS • TPER • Trenitalia • Tiemme • Aggiornamento: Gen 2026
        </p>
      </div>
    </div>
  );
}

export default NearbyStopsPanel;
