/**
 * MapWithTransportLayer.tsx
 * 
 * Wrapper che aggiunge il layer trasporti sopra qualsiasi mappa esistente.
 * NON modifica i componenti mappa originali - li avvolge semplicemente.
 * 
 * Uso:
 * <MapWithTransportLayer>
 *   <HubMarketMapComponent ... />
 * </MapWithTransportLayer>
 */

import React, { useState, ReactNode } from 'react';
import { TransportProvider, useTransport } from '@/contexts/TransportContext';
import { TransportLayerToggle } from './TransportLayerToggle';
import { NearbyStopsPanel } from './NearbyStopsPanel';
import { TransportStop } from './TransportStopsLayer';

interface ReferencePoint {
  lat: number;
  lng: number;
  name: string;
  type: 'hub' | 'mercato';
}

interface MapWithTransportLayerProps {
  children: ReactNode;
  // Punto di riferimento corrente (HUB o Mercato selezionato)
  referencePoint?: ReferencePoint;
  // Raggio di ricerca fermate in km
  searchRadiusKm?: number;
  // Mostra automaticamente pannello fermate quando si seleziona un punto
  autoShowNearbyPanel?: boolean;
  // Callback quando si clicca su una fermata
  onStopClick?: (stop: TransportStop) => void;
  // Posizione del toggle
  togglePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  // Classe CSS aggiuntiva
  className?: string;
}

// Componente interno che usa il context
function MapWithTransportLayerInner({
  children,
  referencePoint,
  searchRadiusKm = 2,
  autoShowNearbyPanel = true,
  onStopClick,
  togglePosition = 'top-right',
  className = '',
}: MapWithTransportLayerProps) {
  const { transportLayerVisible, setTransportLayerVisible } = useTransport();
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);
  const [selectedStop, setSelectedStop] = useState<TransportStop | null>(null);
  const [showRoute, setShowRoute] = useState(false);

  // Mostra automaticamente il pannello quando si seleziona un punto
  React.useEffect(() => {
    if (autoShowNearbyPanel && referencePoint && transportLayerVisible) {
      setShowNearbyPanel(true);
    }
  }, [referencePoint, autoShowNearbyPanel, transportLayerVisible]);

  // Reset route quando cambia il punto di riferimento
  React.useEffect(() => {
    setShowRoute(false);
    setSelectedStop(null);
  }, [referencePoint]);

  const handleStopClick = (stop: TransportStop) => {
    setSelectedStop(stop);
    setShowRoute(true); // Attiva il routing quando si clicca sulla freccia
    onStopClick?.(stop);
    console.log('[MapWithTransportLayer] Fermata selezionata per routing:', stop.stop_name, 'Coordinate:', stop.stop_lat, stop.stop_lon);
  };

  // Configura routing se abbiamo sia punto di partenza che fermata selezionata
  const routeConfig = (showRoute && referencePoint && selectedStop) ? {
    enabled: true,
    userLocation: { lat: referencePoint.lat, lng: referencePoint.lng },
    destination: { lat: selectedStop.stop_lat, lng: selectedStop.stop_lon },
    mode: 'walking' as const
  } : undefined;

  return (
    <div className={`relative ${className}`}>
      {/* Mappa originale (children) - passa routeConfig per il routing */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          const childProps = child.props as any;
          // Usa routeConfig del trasporto se attivo, altrimenti mantieni quello del parent
          const finalRouteConfig = routeConfig || childProps.routeConfig;
          return React.cloneElement(child as React.ReactElement<any>, {
            selectedStopCenter: selectedStop ? [selectedStop.stop_lat, selectedStop.stop_lon] as [number, number] : undefined,
            selectedStopName: selectedStop?.stop_name,
            routeConfig: finalRouteConfig,
          });
        }
        return child;
      })}

      {/* Overlay: Toggle trasporti */}
      <TransportLayerToggle position={togglePosition} />

      {/* Pannello fermate vicine */}
      <NearbyStopsPanel
        isOpen={showNearbyPanel && transportLayerVisible}
        referencePoint={referencePoint}
        radiusKm={searchRadiusKm}
        onStopClick={handleStopClick}
        onClose={() => setShowNearbyPanel(false)}
      />

      {/* Pulsante per aprire pannello fermate (se chiuso) */}
      {transportLayerVisible && referencePoint && !showNearbyPanel && (
        <button
          onClick={() => setShowNearbyPanel(true)}
          className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2 bg-[#14b8a6] text-white rounded-lg shadow-lg hover:bg-[#0d9488] transition-colors"
        >
          <span>🚌</span>
          <span className="text-sm font-medium">Fermate vicine</span>
        </button>
      )}

      {/* Info routing attivo con pulsante chiudi */}
      {showRoute && selectedStop && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#1e293b] border border-[#14b8a6] rounded-lg shadow-xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚶</span>
            <div>
              <p className="text-white text-sm font-medium">Percorso a piedi verso</p>
              <p className="text-[#14b8a6] text-xs">{selectedStop.stop_name}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowRoute(false);
              setSelectedStop(null);
            }}
            className="ml-2 p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-colors"
            title="Chiudi percorso"
          >
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// Componente esportato con Provider
export function MapWithTransportLayer(props: MapWithTransportLayerProps) {
  return (
    <TransportProvider>
      <MapWithTransportLayerInner {...props} />
    </TransportProvider>
  );
}

export default MapWithTransportLayer;
