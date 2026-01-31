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

  // Mostra automaticamente il pannello quando si seleziona un punto
  React.useEffect(() => {
    if (autoShowNearbyPanel && referencePoint && transportLayerVisible) {
      setShowNearbyPanel(true);
    }
  }, [referencePoint, autoShowNearbyPanel, transportLayerVisible]);

  const handleStopClick = (stop: TransportStop) => {
    onStopClick?.(stop);
    // Qui potremmo aggiungere logica per centrare la mappa sulla fermata
    console.log('[MapWithTransportLayer] Fermata selezionata:', stop.stop_name);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Mappa originale (children) */}
      {children}

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
