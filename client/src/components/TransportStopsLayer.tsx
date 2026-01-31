/**
 * TransportStopsLayer.tsx
 * 
 * Layer Leaflet per visualizzare fermate bus e treni sulla mappa.
 * Si integra con HubMarketMapComponent senza modificarlo.
 * 
 * Funzionalità:
 * - Mostra fermate bus (icona 🚌) e treni (icona 🚂)
 * - Toggle on/off tramite LayersControl
 * - Popup con orari programmati
 * - Filtro per fermate vicine a un punto (HUB/Mercato)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Marker, Popup, LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Interfacce per i dati GTFS
export interface TransportStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_type: 'bus' | 'train' | 'tram' | 'metro';
  agency_name?: string;
  routes?: TransportRoute[];
  next_departures?: StopTime[];
}

export interface TransportRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number; // 0=tram, 1=metro, 2=rail, 3=bus
  route_color?: string;
}

export interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  route_short_name?: string;
  route_long_name?: string;
  headsign?: string;
}

interface TransportStopsLayerProps {
  stops: TransportStop[];
  visible?: boolean;
  filterNearPoint?: { lat: number; lng: number; radiusKm?: number };
  onStopClick?: (stop: TransportStop) => void;
  showBus?: boolean;
  showTrain?: boolean;
  maxStops?: number;
}

// Icone personalizzate per tipo di fermata
const createStopIcon = (type: string, isSelected: boolean = false) => {
  const iconConfig = {
    bus: { emoji: '🚌', color: '#2196F3', bgColor: '#E3F2FD' },
    train: { emoji: '🚂', color: '#4CAF50', bgColor: '#E8F5E9' },
    tram: { emoji: '🚊', color: '#FF9800', bgColor: '#FFF3E0' },
    metro: { emoji: '🚇', color: '#9C27B0', bgColor: '#F3E5F5' },
  };
  
  const config = iconConfig[type] || iconConfig.bus;
  const size = isSelected ? 36 : 28;
  const borderWidth = isSelected ? 3 : 2;
  
  return L.divIcon({
    className: 'transport-stop-marker',
    html: `<div style="
      background: ${config.bgColor};
      color: ${config.color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: ${borderWidth}px solid ${config.color};
      cursor: pointer;
      transition: transform 0.2s;
    ">${config.emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Calcola distanza tra due punti in km (formula Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Raggio Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Formatta orario per visualizzazione
const formatTime = (time: string): string => {
  if (!time) return '-';
  // Gestisce orari > 24:00 (es. 25:30 = 01:30 giorno dopo)
  const parts = time.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    if (hours >= 24) hours -= 24;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  return time;
};

export function TransportStopsLayer({
  stops,
  visible = true,
  filterNearPoint,
  onStopClick,
  showBus = true,
  showTrain = true,
  maxStops = 100,
}: TransportStopsLayerProps) {
  const map = useMap();
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Filtra fermate in base ai criteri
  const filteredStops = useMemo(() => {
    let result = stops;

    // Filtra per tipo
    result = result.filter(stop => {
      if (stop.stop_type === 'bus' && !showBus) return false;
      if ((stop.stop_type === 'train' || stop.stop_type === 'tram' || stop.stop_type === 'metro') && !showTrain) return false;
      return true;
    });

    // Filtra per vicinanza a un punto
    if (filterNearPoint) {
      const radiusKm = filterNearPoint.radiusKm || 2; // Default 2km
      result = result.filter(stop => {
        const distance = calculateDistance(
          filterNearPoint.lat,
          filterNearPoint.lng,
          stop.stop_lat,
          stop.stop_lon
        );
        return distance <= radiusKm;
      });

      // Ordina per distanza
      result.sort((a, b) => {
        const distA = calculateDistance(filterNearPoint.lat, filterNearPoint.lng, a.stop_lat, a.stop_lon);
        const distB = calculateDistance(filterNearPoint.lat, filterNearPoint.lng, b.stop_lat, b.stop_lon);
        return distA - distB;
      });
    }

    // Limita numero di fermate visualizzate
    return result.slice(0, maxStops);
  }, [stops, filterNearPoint, showBus, showTrain, maxStops]);

  // Log per debug
  useEffect(() => {
    console.log('[TransportStopsLayer] Fermate filtrate:', filteredStops.length, 'di', stops.length);
  }, [filteredStops.length, stops.length]);

  if (!visible || filteredStops.length === 0) {
    return null;
  }

  return (
    <LayerGroup>
      {filteredStops.map((stop) => {
        const isSelected = selectedStopId === stop.stop_id;
        const distance = filterNearPoint 
          ? calculateDistance(filterNearPoint.lat, filterNearPoint.lng, stop.stop_lat, stop.stop_lon)
          : null;

        return (
          <Marker
            key={stop.stop_id}
            position={[stop.stop_lat, stop.stop_lon]}
            icon={createStopIcon(stop.stop_type, isSelected)}
            eventHandlers={{
              click: () => {
                setSelectedStopId(stop.stop_id);
                onStopClick?.(stop);
              },
            }}
          >
            <Popup className="transport-stop-popup" minWidth={300} maxWidth={400}>
              <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '300px' }}>
                {/* Header con colore in base al tipo */}
                <div 
                  className="p-3 border-b border-gray-700 flex justify-between items-center"
                  style={{ 
                    background: stop.stop_type === 'train' ? '#4CAF50' : 
                               stop.stop_type === 'tram' ? '#FF9800' :
                               stop.stop_type === 'metro' ? '#9C27B0' : '#2196F3'
                  }}
                >
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="text-xl">
                      {stop.stop_type === 'train' ? '🚂' : 
                       stop.stop_type === 'tram' ? '🚊' :
                       stop.stop_type === 'metro' ? '🚇' : '🚌'}
                    </span>
                    <span className="truncate max-w-[200px]">{stop.stop_name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-white/20 text-white">
                    {stop.stop_type}
                  </span>
                </div>

                <div className="p-4 space-y-3 text-sm">
                  {/* Agenzia */}
                  {stop.agency_name && (
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Operatore:</span>
                      <span className="font-medium text-white">{stop.agency_name}</span>
                    </div>
                  )}

                  {/* Distanza */}
                  {distance !== null && (
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Distanza:</span>
                      <span className="font-medium text-[#14b8a6]">
                        {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
                      </span>
                    </div>
                  )}

                  {/* Linee che passano */}
                  {stop.routes && stop.routes.length > 0 && (
                    <div className="border-b border-gray-800 pb-3">
                      <div className="text-gray-400 mb-2">Linee:</div>
                      <div className="flex flex-wrap gap-2">
                        {stop.routes.slice(0, 8).map((route) => (
                          <span
                            key={route.route_id}
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                              background: route.route_color ? `#${route.route_color}` : '#374151',
                              color: 'white',
                            }}
                            title={route.route_long_name}
                          >
                            {route.route_short_name || route.route_id}
                          </span>
                        ))}
                        {stop.routes.length > 8 && (
                          <span className="px-2 py-1 rounded text-xs text-gray-400">
                            +{stop.routes.length - 8} altre
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prossime partenze */}
                  {stop.next_departures && stop.next_departures.length > 0 && (
                    <div>
                      <div className="text-gray-400 mb-2">Prossime partenze:</div>
                      <div className="bg-[#1e293b] rounded border border-gray-700 overflow-hidden">
                        {stop.next_departures.slice(0, 5).map((departure, idx) => (
                          <div
                            key={`${departure.trip_id}-${idx}`}
                            className={`flex justify-between items-center px-3 py-2 ${
                              idx !== 0 ? 'border-t border-gray-700' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#14b8a6] font-bold">
                                {formatTime(departure.departure_time)}
                              </span>
                              {departure.route_short_name && (
                                <span className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] font-bold">
                                  {departure.route_short_name}
                                </span>
                              )}
                            </div>
                            {departure.headsign && (
                              <span className="text-gray-400 text-xs truncate max-w-[120px]">
                                → {departure.headsign}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coordinate */}
                  <div className="bg-[#1e293b] p-2 rounded border border-gray-700 mt-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Coordinate GPS</div>
                    <div className="font-mono text-xs text-gray-300 flex justify-between">
                      <span>Lat: {stop.stop_lat.toFixed(6)}</span>
                      <span>Lng: {stop.stop_lon.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
}

export default TransportStopsLayer;
