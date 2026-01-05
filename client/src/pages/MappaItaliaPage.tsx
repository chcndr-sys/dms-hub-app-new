import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MIHUB_API_BASE_URL } from '@/config/api';

// Fix per icone marker Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
 * Niente form admin, niente modifiche
 */
export default function MappaItaliaPage() {
  const [, navigate] = useLocation();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [markersGroup, setMarkersGroup] = useState<L.FeatureGroup | null>(null);

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

  // Inizializza mappa
  useEffect(() => {
    if (!mapInstance) {
      const map = L.map('map-container').setView([42.5, 12.5], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      
      const group = L.featureGroup().addTo(map);
      setMarkersGroup(group);
      setMapInstance(map);
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Aggiorna marcatori sulla mappa
  useEffect(() => {
    if (!mapInstance || !markersGroup || markets.length === 0) return;

    // Rimuovi marcatori precedenti
    markersGroup.clearLayers();

    // Aggiungi marcatori per ogni mercato
    markets.forEach((market) => {
      const lat = parseFloat(market.latitude);
      const lng = parseFloat(market.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng], {
          icon: L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzE0YjhhNiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk08L3RleHQ+PC9zdmc+',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          }),
        }).bindPopup(`<strong>${market.name}</strong><br/>${market.municipality}`);

        marker.on('click', () => {
          setSelectedMarket(market);
          // Zoom su mercato
          mapInstance.setView([lat, lng], 15);
        });

        markersGroup.addLayer(marker);
      }
    });
  }, [mapInstance, markersGroup, markets]);

  // Filtra mercati per ricerca
  const filteredMarkets = markets.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.municipality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMarketClick = (market: Market) => {
    setSelectedMarket(market);
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
    <div className="min-h-screen bg-[#0b1220] flex flex-col pb-20">
      {/* Header Gradient */}
      <div className="bg-gradient-to-r from-[#14b8a6] via-[#06b6d4] to-[#0891b2] py-6 px-4 md:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                Mappa Italia
              </h1>
              <p className="text-white/80 text-sm">Gemello Digitale del Commercio Nazionale</p>
            </div>
          </div>
          
          <p className="text-white/90 text-xs md:text-sm">
            Scopri i mercati, hub e negozi sostenibili in tutta Italia
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0b1220] px-4 md:px-8 py-4 border-b border-[#14b8a6]/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#14b8a6]/50" />
              <input
                type="text"
                placeholder="Cerca mercato, città, regione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0f1729] border border-[#14b8a6]/30 rounded-lg text-sm text-white placeholder-[#e8fbff]/40 focus:outline-none focus:border-[#14b8a6] focus:ring-1 focus:ring-[#14b8a6]/50 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mappa e Lista */}
      <div className="flex-1 bg-[#0b1220] px-4 md:px-8 py-4 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Sidebar - Lista Mercati */}
            <div className="lg:col-span-1 bg-[#0f1729] border border-[#14b8a6]/20 rounded-xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[#14b8a6]/10 bg-[#0b1220]">
                <h2 className="text-sm font-bold text-white">Mercati</h2>
                <p className="text-[#e8fbff]/60 text-xs mt-0.5">{filteredMarkets.length} risultati</p>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-[#14b8a6] animate-spin" />
                  </div>
                ) : filteredMarkets.length === 0 ? (
                  <div className="p-4 text-center">
                    <AlertCircle className="h-5 w-5 text-[#14b8a6]/50 mx-auto mb-2" />
                    <p className="text-[#e8fbff]/60 text-xs">Nessun mercato trovato</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-3">
                    {filteredMarkets.map((market) => (
                      <button
                        key={market.id}
                        onClick={() => handleMarketClick(market)}
                        className={`w-full text-left p-2.5 rounded-lg transition-all text-xs ${
                          selectedMarket?.id === market.id
                            ? 'bg-[#14b8a6]/20 border border-[#14b8a6] text-white'
                            : 'bg-[#0b1220] border border-[#14b8a6]/10 text-[#e8fbff]/80 hover:border-[#14b8a6]/30 hover:text-white'
                        }`}
                      >
                        <p className="font-semibold">{market.name}</p>
                        <p className="text-[#14b8a6] mt-0.5">{market.municipality}</p>
                        <p className="text-[#e8fbff]/50 mt-0.5">{market.total_stalls} posteggi</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mappa */}
            <div className="lg:col-span-3 bg-[#0f1729] border border-[#14b8a6]/20 rounded-xl overflow-hidden shadow-2xl">
              <div id="map-container" className="w-full h-full min-h-[400px] md:min-h-[500px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-[#0f1729] border-t border-[#14b8a6]/10 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] flex-shrink-0" />
              <p className="text-[#e8fbff]/70">
                <span className="font-semibold text-[#14b8a6]">Clicca su un mercato</span> per visualizzare i posteggi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] flex-shrink-0" />
              <p className="text-[#e8fbff]/70">
                <span className="font-semibold text-[#14b8a6]">Zoom automatico</span> sulla mappa
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#14b8a6] flex-shrink-0" />
              <p className="text-[#e8fbff]/70">
                <span className="font-semibold text-[#14b8a6]">Ricerca veloce</span> per nome o città
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
