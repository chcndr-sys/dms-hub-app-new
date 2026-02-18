import React, { useState } from 'react';
import { X, MapPin, Search, Filter, Store, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketMapComponent } from './MarketMapComponent';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'free' | 'occupied' | 'reserved'>('all');

  console.log('[MapModal] isOpen:', isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b1220]/95 backdrop-blur-sm">
      <div className="h-full w-full overflow-y-auto">
        <div className="min-h-full p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-[#14b8a6]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#e8fbff]">Mappa Mercati GIS</h2>
                <p className="text-sm text-[#e8fbff]/60">Visualizza e gestisci posteggi mercati</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 flex items-center justify-center transition-colors group"
            >
              <X className="h-5 w-5 text-[#ef4444] group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* Barra Ricerca e Filtri */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30 mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Input Ricerca */}
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cerca mercato, posteggio, impresa..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-10 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/40 focus:outline-none focus:border-[#14b8a6] transition-colors"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#14b8a6]/60" />
                  </div>
                </div>

                {/* Filtri Posteggi */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      activeFilter === 'all'
                        ? 'border-[#14b8a6] bg-[#14b8a6] text-white'
                        : 'border-[#14b8a6]/30 bg-[#14b8a6]/10 text-[#14b8a6] hover:bg-[#14b8a6]/20'
                    }`}
                  >
                    Tutti
                  </button>
                  <button
                    onClick={() => setActiveFilter('free')}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      activeFilter === 'free'
                        ? 'border-[#10b981] bg-[#10b981] text-white'
                        : 'border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20'
                    }`}
                  >
                    Liberi
                  </button>
                  <button
                    onClick={() => setActiveFilter('occupied')}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      activeFilter === 'occupied'
                        ? 'border-[#ef4444] bg-[#ef4444] text-white'
                        : 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20'
                    }`}
                  >
                    Occupati
                  </button>
                  <button
                    onClick={() => setActiveFilter('reserved')}
                    className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      activeFilter === 'reserved'
                        ? 'border-[#f59e0b] bg-[#f59e0b] text-white'
                        : 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20'
                    }`}
                  >
                    Riservati
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiche Mercato */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#e8fbff]/60">Posteggi Totali</p>
                    <p className="text-2xl font-bold text-[#e8fbff]">186</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                    <Store className="h-6 w-6 text-[#14b8a6]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#e8fbff]/60">Liberi</p>
                    <p className="text-2xl font-bold text-[#10b981]">45</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-[#10b981]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#e8fbff]/60">Occupati</p>
                    <p className="text-2xl font-bold text-[#ef4444]">128</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-[#ef4444]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-[#f59e0b]/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#e8fbff]/60">Riservati</p>
                    <p className="text-2xl font-bold text-[#f59e0b]">13</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#f59e0b]/20 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-[#f59e0b]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mappa GIS */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30 mb-6">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#14b8a6]" />
                Pianta Mercato Grosseto - GIS Interattiva
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#0b1220] rounded-lg border border-[#14b8a6]/20 overflow-hidden">
                <MarketMapComponent
                  mapData={{ center: { lat: 42.7635, lng: 11.1127 }, stalls_geojson: { type: 'FeatureCollection', features: [] } }}
                  onStallClick={(stallId) => console.log('Stall clicked:', stallId)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Legenda */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
                <Filter className="h-4 w-4 text-[#14b8a6]" />
                Legenda Mappa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#10b981]"></div>
                  <span className="text-sm text-[#e8fbff]/80">Posteggio Libero</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#ef4444]"></div>
                  <span className="text-sm text-[#e8fbff]/80">Posteggio Occupato</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#f59e0b]"></div>
                  <span className="text-sm text-[#e8fbff]/80">Posteggio Riservato</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#64748b]"></div>
                  <span className="text-sm text-[#e8fbff]/80">Non Assegnabile</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
