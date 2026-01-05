import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import MappaItaliaPubblica from '@/components/MappaItaliaPubblica';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';

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

const API_BASE_URL = MIHUB_API_BASE_URL;

/**
 * MappaItaliaPage - Pagina Pubblica Mappa Italia
 * Gemello Digitale del Commercio Nazionale
 * 
 * Usa il componente MappaItaliaPubblica (versione pubblica semplificata)
 * con la logica Vista Italia/Mercato e animazione zoom
 * SENZA accesso a dati sensibili (anagrafica, imprese, editing)
 */
export default function MappaItaliaPage() {
  const [, navigate] = useLocation();
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  // Carica il primo mercato (Grosseto) come default
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/markets`);
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          // Seleziona il primo mercato (Grosseto)
          setSelectedMarket(data.data[0]);
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

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#14b8a6] via-[#06b6d4] to-[#0891b2] text-white p-3 md:p-4 shadow-lg flex-shrink-0">
        <div className="w-full px-4 md:px-8 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold">Mappa Italia</h1>
            <p className="text-xs text-white/70">Gemello Digitale del Commercio</p>
          </div>
        </div>
      </header>

      {/* Mappa Container */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-[#0b1220]">
            <p className="text-[#e8fbff]/60">Caricamento mappa...</p>
          </div>
        ) : selectedMarket ? (
          <MappaItaliaPubblica preselectedMarketId={selectedMarket.id} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0b1220]">
            <p className="text-[#e8fbff]/60">Nessun mercato disponibile</p>
          </div>
        )}
      </div>
    </div>
  );
}
