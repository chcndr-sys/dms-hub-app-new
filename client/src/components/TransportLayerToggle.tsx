/**
 * TransportLayerToggle.tsx
 * 
 * Componente UI per attivare/disattivare il layer delle fermate trasporto pubblico.
 * Si posiziona come overlay sulla mappa.
 */

import React from 'react';
import { useTransport } from '@/contexts/TransportContext';

interface TransportLayerToggleProps {
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function TransportLayerToggle({ 
  className = '',
  position = 'top-right'
}: TransportLayerToggleProps) {
  const {
    transportLayerVisible,
    setTransportLayerVisible,
    showBusStops,
    setShowBusStops,
    showTrainStops,
    setShowTrainStops,
    stops,
    isLoading,
  } = useTransport();

  const [expanded, setExpanded] = React.useState(false);

  // Conta fermate per tipo
  const busCount = stops.filter(s => s.stop_type === 'bus').length;
  const trainCount = stops.filter(s => s.stop_type === 'train' || s.stop_type === 'tram' || s.stop_type === 'metro').length;

  // Posizionamento - top-right spostato più in basso per non coprire i controlli layer mappa
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-16 right-4', // Spostato più in basso (era top-4)
    'bottom-left': 'bottom-4 left-4', // Angolo inferiore sinistro
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div 
      className={`absolute ${positionClasses[position]} z-[1000] ${className}`}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Pulsante principale */}
      <button
        onClick={() => {
          if (!transportLayerVisible) {
            setTransportLayerVisible(true);
          }
          setExpanded(!expanded);
        }}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
          transition-all duration-200 font-medium text-sm
          ${transportLayerVisible 
            ? 'bg-[#14b8a6] text-white hover:bg-[#0d9488]' 
            : 'bg-[#1e293b] text-gray-300 hover:bg-[#334155] border border-gray-700'
          }
        `}
        title="Mostra/nascondi fermate trasporto pubblico"
      >
        <span className="text-lg">🚌</span>
        <span className="hidden sm:inline">Trasporti</span>
        {transportLayerVisible && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
            {stops.length}
          </span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Pannello espanso */}
      {expanded && (
        <div className="mt-2 bg-[#0b1220] border border-gray-700 rounded-lg shadow-xl p-4 min-w-[220px]">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">
            Layer Trasporti
          </div>

          {/* Toggle principale */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
            <span className="text-sm text-white">Mostra fermate</span>
            <button
              onClick={() => setTransportLayerVisible(!transportLayerVisible)}
              className={`
                relative w-11 h-6 rounded-full transition-colors
                ${transportLayerVisible ? 'bg-[#14b8a6]' : 'bg-gray-600'}
              `}
            >
              <span 
                className={`
                  absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${transportLayerVisible ? 'left-5' : 'left-0.5'}
                `}
              />
            </button>
          </div>

          {/* Filtri per tipo */}
          {transportLayerVisible && (
            <div className="space-y-3">
              {/* Bus */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚌</span>
                  <span className="text-sm text-gray-300 group-hover:text-white">Bus</span>
                  <span className="text-xs text-gray-500">({busCount})</span>
                </div>
                <input
                  type="checkbox"
                  checked={showBusStops}
                  onChange={(e) => setShowBusStops(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#14b8a6] focus:ring-[#14b8a6] focus:ring-offset-0"
                />
              </label>

              {/* Treni */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚂</span>
                  <span className="text-sm text-gray-300 group-hover:text-white">Treni</span>
                  <span className="text-xs text-gray-500">({trainCount})</span>
                </div>
                <input
                  type="checkbox"
                  checked={showTrainStops}
                  onChange={(e) => setShowTrainStops(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-[#14b8a6] focus:ring-[#14b8a6] focus:ring-offset-0"
                />
              </label>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-400">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Caricamento fermate...
            </div>
          )}

          {/* Info */}
          <div className="mt-3 pt-3 border-t border-gray-700 text-[10px] text-gray-500">
            Dati GTFS: TPER, Trenitalia, Tiemme
          </div>
        </div>
      )}
    </div>
  );
}

export default TransportLayerToggle;
