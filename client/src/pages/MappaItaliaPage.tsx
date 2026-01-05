import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Search, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MappaItaliaComponent } from '@/components/MappaItaliaComponent';
import { MIHUB_API_BASE_URL } from '@/config/api';



interface Market {
  id: number;
  code: string;
  name: string;
  municipality: string;
  days: string;
  total_stalls: number;
  status: string;
  gis_market_id: string;
  latitude: string;
  longitude: string;
}

interface Stall {
  id: number;
  market_id: number;
  number: string;
  gis_slot_id: string;
  width: string;
  depth: string;
  type: string;
  status: string;
  vendor_business_name: string | null;
  impresa_id: number | null;
}

const API_BASE_URL = MIHUB_API_BASE_URL;

/**
 * MappaItaliaPage - Pagina Pubblica Mappa Italia
 * Gemello Digitale del Commercio Nazionale
 * 
 * SOLO LETTURA - Visualizza mercati e posteggi
 * Niente form admin, niente modifiche
 */
export default function MappaItaliaPage() {
  const [, navigate] = useLocation();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [viewMode, setViewMode] = useState<'italia' | 'mercato'>('italia');

  // Carica mercati
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/markets`);
        const data = await response.json();
        if (data.success) {
          setMarkets(data.data);
          if (data.data.length > 0) {
            setSelectedMarket(data.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching markets:', error);
        toast.error('Errore nel caricamento dei mercati');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);





  // Filtra mercati per ricerca
  const filteredMarkets = markets.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.municipality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMarketClick = (market: Market) => {
    setSelectedMarket(market);
    setViewMode('mercato');
    const lat = parseFloat(market.latitude);
    const lng = parseFloat(market.longitude);
    if (mapInstance && !isNaN(lat) && !isNaN(lng)) {
      mapInstance.setView([lat, lng], 15);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col">
      {/* Header Gradient */}
      <div className="bg-gradient-to-r from-[#14b8a6] via-[#06b6d4] to-[#0891b2] py-8 px-4 md:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2">
                <MapPin className="h-8 w-8" />
                Mappa Italia
              </h1>
              <p className="text-white/80 mt-1">Gemello Digitale del Commercio Nazionale</p>
            </div>
          </div>
          
          <p className="text-white/90 text-sm md:text-base max-w-2xl">
            Scopri i mercati, hub e negozi sostenibili in tutta Italia. Visualizza posteggi, imprese e servizi in tempo reale.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0b1220] px-4 md:px-8 py-6 border-b border-[#14b8a6]/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-3 flex-col md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#14b8a6]/50" />
              <input
                type="text"
                placeholder="Cerca mercato, città, regione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0f1729] border border-[#14b8a6]/30 rounded-lg text-white placeholder-[#e8fbff]/40 focus:outline-none focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]/50 transition-all"
              />
            </div>
          </div>
          
          <p className="text-[#e8fbff]/60 text-xs md:text-sm mt-3">
            💡 Digita il nome di un mercato, una città o una regione per trovare rapidamente quello che cerchi
          </p>
        </div>
      </div>

      {/* Main Content - Mappa e Lista */}
      <div className="flex-1 bg-[#0b1220] px-4 md:px-8 py-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Sidebar - Lista Mercati */}
            <div className="lg:col-span-1 bg-[#0f1729] border border-[#14b8a6]/20 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#14b8a6]/10">
                <h2 className="text-lg font-bold text-white">Mercati</h2>
                <p className="text-[#e8fbff]/60 text-xs mt-1">{filteredMarkets.length} risultati</p>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-[#14b8a6] animate-spin" />
                  </div>
                ) : filteredMarkets.length === 0 ? (
                  <div className="p-4 text-center">
                    <AlertCircle className="h-6 w-6 text-[#14b8a6]/50 mx-auto mb-2" />
                    <p className="text-[#e8fbff]/60 text-sm">Nessun mercato trovato</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredMarkets.map((market) => (
                      <button
                        key={market.id}
                        onClick={() => handleMarketClick(market)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedMarket?.id === market.id
                            ? 'bg-[#14b8a6]/20 border border-[#14b8a6] text-white'
                            : 'bg-[#0b1220] border border-[#14b8a6]/10 text-[#e8fbff]/80 hover:border-[#14b8a6]/30 hover:text-white'
                        }`}
                      >
                        <p className="font-semibold text-sm">{market.name}</p>
                        <p className="text-xs text-[#14b8a6] mt-1">{market.municipality}</p>
                        <p className="text-xs text-[#e8fbff]/50 mt-1">{market.total_stalls} posteggi</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mappa */}
            <div className="lg:col-span-3 bg-[#0f1729] border border-[#14b8a6]/20 rounded-2xl overflow-hidden shadow-2xl">
              {selectedMarket ? (
                <MappaItaliaComponent preselectedMarketId={selectedMarket.id} />
              ) : (
                <div className="w-full h-full min-h-[500px] md:min-h-[600px] flex items-center justify-center text-[#e8fbff]/60">
                  <p>Seleziona un mercato per visualizzare la mappa</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-[#0f1729] border-t border-[#14b8a6]/10 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#14b8a6] mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-[#e8fbff]/70">
                  <span className="font-semibold text-[#14b8a6]">Clicca su un mercato</span> per visualizzare i posteggi
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#14b8a6] mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-[#e8fbff]/70">
                  <span className="font-semibold text-[#14b8a6]">Zoom automatico</span> sulla mappa
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#14b8a6] mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-[#e8fbff]/70">
                  <span className="font-semibold text-[#14b8a6]">Ricerca veloce</span> per nome o città
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
