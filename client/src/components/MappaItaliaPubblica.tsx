/**
 * MappaItaliaPubblica.tsx
 * Versione PUBBLICA semplificata del componente Mappa Italia
 * 
 * DIFFERENZE dalla versione admin (MappaItaliaComponent.tsx):
 * - NO tab Anagrafica (dati sensibili del mercato)
 * - NO tab Imprese/Concessioni (dati sensibili delle imprese)
 * - NO editing posteggi (solo visualizzazione)
 * - NO scheda impresa dettagliata
 * - NO pulsante Spunta per assegnazioni
 * 
 * MANTIENE:
 * - Mappa interattiva con zoom Italia/Mercato
 * - Lista mercati con ricerca
 * - Statistiche posteggi (occupati/liberi/riservati)
 * - Lista posteggi in sola lettura
 */
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Building2,
  Loader2,
  X,
  Maximize2,
  Minimize2,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MarketMapComponent } from './MarketMapComponent';
import { getStallStatusLabel, getStallStatusClasses } from '@/lib/stallStatus';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE_URL = MIHUB_API_BASE_URL;

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

interface Stall {
  id: number;
  market_id: number;
  number: string;
  gis_slot_id: string;
  width: string;
  depth: string;
  type: string;
  status: string;
  orientation: string;
  notes: string | null;
  concession_id: number | null;
  vendor_id: number | null;
  concession_type: string | null;
  vendor_business_name: string | null;
  vendor_contact_name: string | null;
  impresa_id: number | null;
  dimensions?: string;
}

interface MarketMapData {
  features: any[];
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

/**
 * Componente Mappa Italia Pubblica
 * Versione semplificata per utenti pubblici
 */
export default function MappaItaliaPubblica({ preselectedMarketId }: { preselectedMarketId?: number } = {}) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMarkets();
  }, []);

  // Preseleziona il mercato se fornito
  useEffect(() => {
    if (preselectedMarketId && markets.length > 0) {
      const market = markets.find(m => m.id === preselectedMarketId);
      if (market) {
        setSelectedMarket(market);
      }
    }
  }, [preselectedMarketId, markets]);

  const fetchMarkets = async () => {
    try {
     const response = await fetch(`${API_BASE_URL}/api/markets`);
      const data = await response.json();
      if (data.success) {
        setMarkets(data.data);
        if (data.data.length > 0 && !selectedMarket) {
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

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
        </CardContent>
      </Card>
    );
  }

  if (markets.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-[#14b8a6] mb-4" />
          <p className="text-[#e8fbff]/70 mb-4">Nessun mercato configurato</p>
        </CardContent>
      </Card>
    );
  }

  // Filtra mercati in base alla ricerca
  const filteredMarkets = markets.filter(market => 
    market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.municipality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Barra di Ricerca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cerca mercato per nome o città..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-12 bg-[#0b1220]/50 border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] placeholder:text-[#e8fbff]/50 focus:outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#14b8a6]/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#14b8a6] hover:bg-[#14b8a6]/80 rounded-md transition-colors">
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
        {searchQuery && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="bg-[#0b1220]/50 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/20"
          >
            <X className="h-4 w-4 mr-1" />
            Cancella
          </Button>
        )}
      </div>

      {/* Risultati Ricerca */}
      {searchQuery && (
        <div className="text-sm text-[#e8fbff]/70">
          {filteredMarkets.length} {filteredMarkets.length === 1 ? 'mercato trovato' : 'mercati trovati'}
        </div>
      )}

      {/* Lista Mercati */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMarkets.map((market) => (
          <Card 
            key={market.id} 
            className={`cursor-pointer transition-all bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 hover:border-[#14b8a6] ${
              selectedMarket?.id === market.id ? 'border-[#14b8a6] ring-2 ring-[#14b8a6]/50' : ''
            }`}
            onClick={() => setSelectedMarket(market)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#e8fbff]">
                <Building2 className="h-5 w-5 text-[#14b8a6]" />
                {market.name}
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/70">{market.municipality}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Codice</span>
                  <Badge variant="secondary" className="bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30">
                    {market.code}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Posteggi Totali</span>
                  <Badge variant="secondary" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                    {market.total_stalls}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Giorni</span>
                  <span className="text-xs text-[#e8fbff]">{market.days}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Stato</span>
                  <Badge 
                    variant="default" 
                    className={market.status === 'active' 
                      ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30" 
                      : "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"}
                  >
                    {market.status === 'active' ? "Attivo" : "Inattivo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dettaglio Mercato Selezionato */}
      {selectedMarket && (
        <MarketDetailPubblica market={selectedMarket} allMarkets={markets} />
      )}
    </div>
  );
}

/**
 * Dettaglio mercato PUBBLICO - solo mappa e statistiche
 */
function MarketDetailPubblica({ market, allMarkets }: { market: Market; allMarkets: Market[] }) {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [viewMode, setViewMode] = useState<'italia' | 'mercato'>('italia');
  const [viewTrigger, setViewTrigger] = useState(0);

  // Carica i posteggi al mount del componente
  useEffect(() => {
    const fetchStalls = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/markets/${market.id}/stalls`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          setStalls(json.data);
        }
      } catch (error) {
        console.error('[MarketDetailPubblica] Errore caricamento posteggi:', error);
      }
    };
    
    fetchStalls();
  }, [market.id]);

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
      <CardHeader>
        <CardTitle className="text-[#e8fbff]">Dettaglio: {market.name}</CardTitle>
        <CardDescription className="text-[#e8fbff]/70">Esplora la mappa dei posteggi</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pulsante Toggle Vista */}
        <div className="mb-4">
          <Button
            variant="outline"
            className="w-full bg-[#0b1220]/50 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/20"
            onClick={() => {
              setViewMode(prev => prev === 'italia' ? 'mercato' : 'italia');
              setViewTrigger(prev => prev + 1);
            }}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {viewMode === 'italia' ? 'Vista Mercato' : 'Vista Italia'}
          </Button>
        </div>

        {/* Contenuto Mappa */}
        <PosteggiTabPubblica 
          marketId={market.id} 
          marketCode={market.code} 
          marketCenter={[parseFloat(market.latitude), parseFloat(market.longitude)]} 
          stalls={stalls} 
          setStalls={setStalls} 
          allMarkets={allMarkets} 
          viewMode={viewMode} 
          setViewMode={setViewMode} 
          viewTrigger={viewTrigger} 
          setViewTrigger={setViewTrigger} 
        />
      </CardContent>
    </Card>
  );
}

/**
 * Tab Posteggi PUBBLICO - solo visualizzazione, NO editing
 */
function PosteggiTabPubblica({ 
  marketId, 
  marketCode, 
  marketCenter, 
  stalls, 
  setStalls, 
  allMarkets, 
  viewMode, 
  setViewMode, 
  viewTrigger, 
  setViewTrigger 
}: { 
  marketId: number; 
  marketCode: string; 
  marketCenter: [number, number]; 
  stalls: Stall[]; 
  setStalls: React.Dispatch<React.SetStateAction<Stall[]>>; 
  allMarkets: Market[]; 
  viewMode: 'italia' | 'mercato'; 
  setViewMode: React.Dispatch<React.SetStateAction<'italia' | 'mercato'>>; 
  viewTrigger: number; 
  setViewTrigger: React.Dispatch<React.SetStateAction<number>> 
}) {
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStallId, setSelectedStallId] = useState<number | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const listContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [marketId]);

  const fetchData = async () => {
    try {
      const [stallsRes, mapRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/markets/${marketId}/stalls`),
        fetch(`${API_BASE_URL}/api/gis/market-map/${marketId}`)
      ]);

      const stallsData = await stallsRes.json();
      const mapDataRes = await mapRes.json();

      if (stallsData.success) {
        setStalls(stallsData.data);
      }
      if (mapDataRes.success) {
        setMapData(mapDataRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Calcola statistiche
  const occupiedCount = stalls.filter(s => s.status === 'occupato').length;
  const freeCount = stalls.filter(s => s.status === 'libero').length;
  const reservedCount = stalls.filter(s => s.status === 'riservato').length;

  // Mappa per lookup veloce
  const stallsByNumber = new Map(stalls.map(s => [s.number, s]));

  const handleRowClick = (stall: Stall) => {
    setSelectedStallId(stall.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistiche Posteggi */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 p-4 rounded-lg">
          <div className="text-sm text-[#ef4444] mb-1">Occupati</div>
          <div className="text-3xl font-bold text-[#ef4444]">{occupiedCount}</div>
        </div>
        <div className="bg-[#10b981]/10 border border-[#10b981]/30 p-4 rounded-lg">
          <div className="text-sm text-[#10b981] mb-1">Liberi</div>
          <div className="text-3xl font-bold text-[#10b981]">{freeCount}</div>
        </div>
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 p-4 rounded-lg">
          <div className="text-sm text-[#f59e0b] mb-1">Riservati</div>
          <div className="text-3xl font-bold text-[#f59e0b]">{reservedCount}</div>
        </div>
      </div>

      {/* Mappa */}
      <div className={`relative border border-[#14b8a6]/20 rounded-lg overflow-hidden ${isMapExpanded ? 'h-[850px]' : 'h-[600px]'}`}>
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2 z-[1000] bg-[#0b1220]/90 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/20"
          onClick={() => setIsMapExpanded(!isMapExpanded)}
        >
          {isMapExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {mapData && (() => {
          const stallsDataForMap = stalls.map(s => ({
            id: s.id,
            number: s.number,
            status: s.status,
            type: s.type,
            vendor_name: s.vendor_business_name || undefined,
            dimensions: s.dimensions
          }));
          return (
            <MarketMapComponent
              refreshKey={0}
              mapData={mapData}
              center={viewMode === 'mercato' ? marketCenter : [42.5, 12.5] as [number, number]}
              zoom={viewMode === 'mercato' ? 17 : 6}
              height="100%"
              isSpuntaMode={false}
              onStallClick={(stallNumber) => {
                const dbStall = stallsByNumber.get(stallNumber);
                if (dbStall) {
                  setSelectedStallId(dbStall.id);
                  setTimeout(() => {
                    const row = document.querySelector(`[data-stall-id="${dbStall.id}"]`) as HTMLElement;
                    if (row && listContainerRef.current) {
                      const container = listContainerRef.current;
                      const rowTop = row.offsetTop;
                      const containerHeight = container.clientHeight;
                      const rowHeight = row.clientHeight;
                      const scrollTo = rowTop - (containerHeight / 2) + (rowHeight / 2);
                      container.scrollTo({ top: scrollTo, behavior: 'smooth' });
                    }
                  }, 100);
                }
              }}
              selectedStallNumber={stalls.find(s => s.id === selectedStallId)?.number}
              stallsData={stallsDataForMap}
              allMarkets={allMarkets.map(m => ({
                id: m.id,
                name: m.name,
                latitude: parseFloat(m.latitude),
                longitude: parseFloat(m.longitude)
              }))}
              showItalyView={viewMode === 'italia'}
              viewTrigger={viewTrigger}
              marketCenterFixed={marketCenter}
              onMarketClick={(clickedMarketId) => {
                setViewMode('mercato');
                setViewTrigger(prev => prev + 1);
              }}
            />
          );
        })()}
      </div>

      {/* Lista Posteggi - SOLO LETTURA */}
      <div className="border border-[#14b8a6]/20 rounded-lg overflow-hidden">
        <div className="bg-[#0b1220]/50 px-4 py-2 border-b border-[#14b8a6]/20">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Lista Posteggi</h3>
        </div>
        <div ref={listContainerRef} className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-[#0b1220]/95 z-10">
              <TableRow className="border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
                <TableHead className="text-[#e8fbff]/70 text-xs">N°</TableHead>
                <TableHead className="text-[#e8fbff]/70 text-xs">Tipo</TableHead>
                <TableHead className="text-[#e8fbff]/70 text-xs">Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...stalls].sort((a, b) => {
                const numA = parseInt(a.number, 10);
                const numB = parseInt(b.number, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.number.localeCompare(b.number);
              }).map((stall) => (
                <TableRow 
                  key={stall.id}
                  data-stall-id={stall.id}
                  className={`cursor-pointer hover:bg-[#14b8a6]/10 border-[#14b8a6]/10 ${
                    selectedStallId === stall.id ? 'bg-[#14b8a6]/20' : ''
                  }`}
                  onClick={() => handleRowClick(stall)}
                >
                  <TableCell className="font-medium text-[#e8fbff] text-sm">{stall.number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30 text-xs">
                      {stall.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className={`${getStallStatusClasses(stall.status)} text-xs`}>
                      {getStallStatusLabel(stall.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
