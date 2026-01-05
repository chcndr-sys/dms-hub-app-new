import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import MappaItaliaComponent from '@/components/MappaItaliaComponent';
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

const API_BASE_URL = MIHUB_API_BASE_URL;

/**
 * MappaItaliaPage - Pagina Pubblica Mappa Italia
 * Gemello Digitale del Commercio Nazionale
 * 
 * SOLO LETTURA - Visualizza mercati e posteggi
 * Design mobile-first, coerente con altre pagine pubbliche
 */
export default function MappaItaliaPage() {
  const [, navigate] = useLocation();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Carica mercati
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/markets`);
        const data = await response.json();
        if (data.success) {
          setMarkets(data.data);
          if (data.data.length > 0) {
            setSelectedMarketId(data.data[0].id);
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

  const handleBack = () => {
    navigate('/');
  };

  const handleMarketSelect = (marketId: number) => {
    setSelectedMarketId(marketId);
  };

  const selectedMarket = markets.find(m => m.id === selectedMarketId);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Gradient */}
      <header className="bg-gradient-to-r from-[#14b8a6] via-[#06b6d4] to-[#0891b2] text-white p-4 shadow-lg">
        <div className="w-full px-4 md:px-8 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <MapPin className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mappa Italia</h1>
              <p className="text-xs text-white/70">Gemello Digitale del Commercio Nazionale</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full px-4 md:px-8 py-6 space-y-6">
        {/* Search Card */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-[#14b8a6] to-[#06b6d4] rounded-xl shadow-lg">
                <Search className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Cerca Mercati</CardTitle>
                <CardDescription className="text-sm">
                  Trova mercati, hub e negozi sostenibili in tutta Italia
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cerca per nome, città o regione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Digita il nome di un mercato o una città per trovare rapidamente quello che cerchi
            </p>
          </CardContent>
        </Card>

        {/* Mercati List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nessun mercato trovato</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market) => (
              <button
                key={market.id}
                onClick={() => handleMarketSelect(market.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                  selectedMarketId === market.id
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-base">{market.name}</h3>
                    <p className="text-sm text-muted-foreground">{market.municipality}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-primary/20 text-primary rounded-full">
                    {market.code}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Posteggi</p>
                    <p className="font-bold text-primary">{market.total_stalls}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Giorno</p>
                    <p className="font-bold">{market.days}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mappa */}
        {selectedMarket && (
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{selectedMarket.name}</CardTitle>
              <CardDescription>{selectedMarket.municipality}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full h-[500px] md:h-[600px]">
                <MappaItaliaComponent preselectedMarketId={selectedMarket.id} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p><span className="font-semibold text-primary">Clicca su un mercato</span> per visualizzare la mappa e i posteggi</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p><span className="font-semibold text-primary">Zoom automatico</span> sulla mappa quando selezioni un mercato</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p><span className="font-semibold text-primary">Ricerca veloce</span> per trovare il mercato che cerchi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
