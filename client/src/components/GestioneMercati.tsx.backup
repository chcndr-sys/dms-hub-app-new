import { useState, useEffect, useRef } from "react";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Users, 
  Building2,
  Loader2,
  FileText,
  Edit,
  Save,
  X,
  Maximize2,
  Minimize2,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketMapComponent } from './MarketMapComponent';
import { MarketCompaniesTab } from './markets/MarketCompaniesTab';
import { getStallStatusLabel, getStallStatusClasses, getStallMapFillColor, STALL_STATUS_OPTIONS } from '@/lib/stallStatus';
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
}

interface Vendor {
  id: number;
  code: string;
  business_name: string;
  vat_number: string;
  contact_name: string;
  phone: string;
  email: string;
  status: string;
}

interface Concession {
  id: number;
  market_id: number;
  stall_id: number;
  vendor_id: number;
  type: string;
  valid_from: string;
  valid_to: string | null;
  market_name: string;
  stall_number: string;
  vendor_business_name: string;
  vendor_code: string;
}

interface MarketMapData {
  container: [number, number][];
  center: { lat: number; lng: number };
  stalls_geojson: {
    type: string;
    features: Array<{
      type: string;
      geometry: {
        type: 'Point' | 'Polygon';
        coordinates: [number, number] | [number, number][][];
      };
      properties: {
        number: string;
        orientation?: number;
        kind?: string;
        status?: string;
        dimensions?: string;
      };
    }>;
  };
}

/**
 * Componente per centrare la mappa su un posteggio
 */
function MapCenterController({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 19, {
        duration: 1.0
      });
    }
  }, [center, zoom, map]);
  
  return null;
}

/**
 * Componente Gestione Mercati
 * Sistema completo per gestione mercati, posteggi e concessioni
 */
export default function GestioneMercati() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMarkets();
  }, []);

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
        <MarketDetail market={selectedMarket} />
      )}
    </div>
  );
}

/**
 * Dettaglio mercato con tab
 */
function MarketDetail({ market }: { market: Market }) {
  const [activeTab, setActiveTab] = useState("anagrafica");
  const [stalls, setStalls] = useState<Stall[]>([]);

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
        console.error('[MarketDetail] Errore caricamento posteggi:', error);
      }
    };
    
    fetchStalls();
  }, [market.id]);

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
      <CardHeader>
        <CardTitle className="text-[#e8fbff]">Dettaglio: {market.name}</CardTitle>
        <CardDescription className="text-[#e8fbff]/70">Gestisci anagrafica, posteggi e concessioni</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-[#0b1220]/50">
            <TabsTrigger 
              value="anagrafica"
              className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            >
              <FileText className="mr-2 h-4 w-4" />
              Anagrafica
            </TabsTrigger>
            <TabsTrigger 
              value="posteggi"
              className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Posteggi
            </TabsTrigger>
            <TabsTrigger 
              value="concessioni"
              className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            >
              <Users className="mr-2 h-4 w-4" />
              Imprese / Concessioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anagrafica" className="space-y-4">
            <AnagraficaTab market={market} />
          </TabsContent>

          <TabsContent value="posteggi" className="space-y-4">
            <PosteggiTab marketId={market.id} marketCode={market.code} marketCenter={[parseFloat(market.latitude), parseFloat(market.longitude)]} stalls={stalls} setStalls={setStalls} />
          </TabsContent>

          <TabsContent value="concessioni" className="space-y-4">
            <MarketCompaniesTab marketId={market.id.toString()} stalls={stalls.map(s => ({ id: s.id.toString(), code: s.number }))} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Tab Anagrafica Mercato
 */
function AnagraficaTab({ market }: { market: Market }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Codice</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.code}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Nome</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.name}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Comune</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.municipality}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Giorni Mercato</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.days}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Posteggi Totali</label>
          <p className="text-lg font-semibold text-[#14b8a6] mt-1">{market.total_stalls}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Stato</label>
          <Badge 
            variant="default" 
            className={`mt-1 ${market.status === 'active' 
              ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30" 
              : "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"}`}
          >
            {market.status === 'active' ? "Attivo" : "Inattivo"}
          </Badge>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Latitudine</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.latitude}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Longitudine</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.longitude}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20 col-span-2">
          <label className="text-sm font-medium text-[#e8fbff]/70">GIS Market ID</label>
          <p className="text-lg font-semibold text-[#8b5cf6] mt-1">{market.gis_market_id}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Posteggi con tabella modificabile E MAPPA GIS
 */
function PosteggiTab({ marketId, marketCode, marketCenter, stalls, setStalls }: { marketId: number; marketCode: string; marketCenter: [number, number]; stalls: Stall[]; setStalls: React.Dispatch<React.SetStateAction<Stall[]>> }) {
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  const [concessionsByStallId, setConcessionsByStallId] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Stall>>({});
  const [selectedStallId, setSelectedStallId] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [isSpuntaMode, setIsSpuntaMode] = useState(false);

  useEffect(() => {
    fetchData();
  }, [marketId]);

  const fetchData = async () => {
    try {
      const [stallsRes, mapRes, concessionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/markets/${marketId}/stalls`),
        fetch(`${API_BASE_URL}/api/gis/market-map/${marketId}`),
        fetch(`${API_BASE_URL}/api/markets/${marketCode}/stalls/concessions`)
      ]);

      const stallsData = await stallsRes.json();
      const mapDataRes = await mapRes.json();
      const concessionsData = await concessionsRes.json();

      console.log('[DEBUG fetchData] Dati ricevuti:', {
        stallsCount: stallsData.data?.length,
        firstStall: stallsData.data?.[0],
        mapDataExists: !!mapDataRes.data,
        concessionsCount: concessionsData.data?.length
      });

      if (stallsData.success) {
        setStalls(stallsData.data);
        console.log('[DEBUG fetchData] stalls aggiornato, length:', stallsData.data.length);
      }
      if (mapDataRes.success) {
        setMapData(mapDataRes.data);
        console.log('[DEBUG fetchData] mapData aggiornato');
      }
      if (concessionsData.success && Array.isArray(concessionsData.data)) {
        const map: Record<string, any> = {};
        for (const row of concessionsData.data) {
          map[row.stallId] = {
            companyName: row.companyName,
            tipoConcessione: row.tipoConcessione,
            stato: row.stato,
            validaDal: row.validaDal,
            validaAl: row.validaAl
          };
        }
        setConcessionsByStallId(map);
        console.log('[DEBUG fetchData] concessioni caricate:', Object.keys(map).length);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (stall: Stall) => {
    setEditingId(stall.id);
    setEditData({
      type: stall.type,
      status: stall.status,
      notes: stall.notes
    });
  };

  const handleSave = async (stallId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      const data = await response.json();
      if (data.success) {
        console.log('[DEBUG handleSave] Posteggio aggiornato:', stallId, editData);
        toast.success('Posteggio aggiornato con successo');
        await fetchData(); // Ricarica dati
        console.log('[DEBUG handleSave] PRIMA refreshKey:', mapRefreshKey);
        setMapRefreshKey(prev => {
          const newKey = prev + 1;
          console.log('[DEBUG handleSave] DOPO refreshKey:', newKey);
          return newKey;
        });
        setEditingId(null);
        setEditData({});
      } else {
        toast.error('Errore nell\'aggiornamento');
      }
    } catch (error) {
      console.error('Error updating stall:', error);
      toast.error('Errore nell\'aggiornamento del posteggio');
    }
  };

  // Conferma assegnazione posteggio (da riservato a occupato)
  const handleConfirmAssignment = async (stallId: number) => {
    try {
      console.log('[DEBUG handleConfirmAssignment] Confermando assegnazione posteggio:', stallId);
      
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'occupato' }),
      });

      const data = await response.json();
      if (data.success) {
        console.log('[DEBUG handleConfirmAssignment] Posteggio assegnato:', stallId);
        toast.success('Posteggio assegnato con successo!');
        
        // Disattiva modalità spunta
        setIsSpuntaMode(false);
        
        // Ricarica dati e aggiorna mappa
        await fetchData();
        setMapRefreshKey(prev => prev + 1);
      } else {
        toast.error('Errore nell\'assegnazione del posteggio');
      }
    } catch (error) {
      console.error('[ERROR handleConfirmAssignment]:', error);
      toast.error('Errore durante l\'assegnazione del posteggio');
      throw error; // Rilancia l'errore per gestirlo nel popup
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleRowClick = (stall: Stall) => {
    setSelectedStallId(stall.id);
    
    // Trova il posteggio nella mappa tramite gis_slot_id
    const mapFeature = mapData?.stalls_geojson.features.find(
      f => f.properties.number === stall.number
    );
    
    if (mapFeature && mapFeature.geometry.type === 'Polygon') {
      // Calcola il centro del poligono
      const coords = mapFeature.geometry.coordinates as [number, number][][];
      const lats = coords[0].map(c => c[1]);
      const lngs = coords[0].map(c => c[0]);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      
      setMapCenter([centerLat, centerLng]);
      toast.success(`Centrato su posteggio ${stall.number}`);
    }
  };

  // Funzioni di mappatura stati spostate in @/lib/stallStatus

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  const occupiedCount = stalls.filter(s => s.status === 'occupato').length;
  const freeCount = stalls.filter(s => s.status === 'libero').length;
  const reservedCount = stalls.filter(s => s.status === 'riservato').length;

  // Crea una mappa per lookup veloce stall by number
  const stallsByNumber = new Map(stalls.map(s => [s.number, s]));

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
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 p-4 rounded-lg relative">
          <div className="text-sm text-[#f59e0b] mb-1">Riservati</div>
          <div className="text-3xl font-bold text-[#f59e0b]">{reservedCount}</div>
          <Button
            size="sm"
            variant={isSpuntaMode ? "default" : "outline"}
            className={`absolute top-2 right-2 text-xs ${
              isSpuntaMode 
                ? 'bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white border-[#f59e0b]' 
                : 'bg-transparent hover:bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/50'
            }`}
            onClick={() => setIsSpuntaMode(!isSpuntaMode)}
          >
            ✓ Spunta
          </Button>
        </div>
      </div>

      {/* Pulsante Conferma Assegnazione Globale (solo in modalità Spunta) */}
      {isSpuntaMode && reservedCount > 0 && (
        <div className="mb-4">
          <Button
            className="w-full bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white font-semibold py-3 border-2 border-[#f59e0b]/50"
            onClick={async () => {
              const reservedStalls = stalls.filter(s => s.status === 'riservato');
              if (reservedStalls.length === 0) {
                toast.info('Nessun posteggio riservato da confermare');
                return;
              }
              
              const confirmed = window.confirm(
                `Confermare l'assegnazione di ${reservedStalls.length} posteggi riservati?\n\n` +
                `Tutti i posteggi riservati diventeranno occupati.`
              );
              
              if (!confirmed) return;
              
              try {
                let successCount = 0;
                let errorCount = 0;
                
                for (const stall of reservedStalls) {
                  try {
                    await handleConfirmAssignment(stall.id);
                    successCount++;
                  } catch (error) {
                    console.error(`Errore conferma posteggio ${stall.number}:`, error);
                    errorCount++;
                  }
                }
                
                if (successCount > 0) {
                  toast.success(`${successCount} posteggi confermati con successo!`);
                }
                if (errorCount > 0) {
                  toast.error(`${errorCount} posteggi non confermati`);
                }
                
                // Ricarica dati
                await fetchData();
                setMapRefreshKey(prev => prev + 1);
                setIsSpuntaMode(false);
              } catch (error) {
                console.error('Errore conferma assegnazioni:', error);
                toast.error('Errore durante la conferma delle assegnazioni');
              }
            }}
          >
            ✓ Conferma Assegnazione ({reservedCount} posteggi)
          </Button>
        </div>
      )}

      {/* Layout Tabella + Mappa */}
      <div className={`grid ${isMapExpanded ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {/* Tabella Posteggi */}
        {!isMapExpanded && (
          <div className="border border-[#14b8a6]/20 rounded-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-[#0b1220]/95 z-10">
                  <TableRow className="border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
                    <TableHead className="text-[#e8fbff]/70">N°</TableHead>
                    <TableHead className="text-[#e8fbff]/70">Tipo</TableHead>
                    <TableHead className="text-[#e8fbff]/70">Stato</TableHead>
                    <TableHead className="text-[#e8fbff]/70">Intestatario</TableHead>
                    <TableHead className="text-[#e8fbff]/70">Impresa / Concessione</TableHead>
                    <TableHead className="text-right text-[#e8fbff]/70">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stalls.map((stall) => (
                    <TableRow 
                      key={stall.id}
                      className={`cursor-pointer hover:bg-[#14b8a6]/10 border-[#14b8a6]/10 ${
                        selectedStallId === stall.id ? 'bg-[#14b8a6]/20' : ''
                      }`}
                      onClick={() => handleRowClick(stall)}
                    >
                      <TableCell className="font-medium text-[#e8fbff]">{stall.number}</TableCell>
                      <TableCell>
                        {editingId === stall.id ? (
                          <Select
                            value={editData.type}
                            onValueChange={(value) => setEditData({ ...editData, type: value })}
                          >
                            <SelectTrigger className="w-[100px] bg-[#0b1220] border-[#14b8a6]/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fisso">Fisso</SelectItem>
                              <SelectItem value="spunta">Spunta</SelectItem>
                              <SelectItem value="libero">Libero</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30 text-xs">
                            {stall.type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === stall.id ? (
                          <Select
                            value={editData.status}
                            onValueChange={(value) => setEditData({ ...editData, status: value })}
                          >
                            <SelectTrigger className="w-[100px] bg-[#0b1220] border-[#14b8a6]/30">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STALL_STATUS_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="default" className={`${getStallStatusClasses(stall.status)} text-xs`}>
                            {getStallStatusLabel(stall.status)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {stall.vendor_business_name ? (
                          <div>
                            <p className="font-medium text-[#e8fbff] text-xs">{stall.vendor_business_name}</p>
                          </div>
                        ) : (
                          <span className="text-[#e8fbff]/50 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {concessionsByStallId[stall.number] ? (
                          <div>
                            <p className="font-medium text-[#e8fbff] text-xs">{concessionsByStallId[stall.number].companyName}</p>
                            <p className="text-[#e8fbff]/60 text-xs">{concessionsByStallId[stall.number].tipoConcessione}</p>
                          </div>
                        ) : (
                          <span className="text-[#e8fbff]/50 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === stall.id ? (
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(stall.id);
                              }}
                              className="bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border-[#10b981]/30 h-7 w-7 p-0"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel();
                              }}
                              className="bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border-[#ef4444]/30 h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(stall);
                            }}
                            className="hover:bg-[#14b8a6]/20 text-[#14b8a6] h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Mappa GIS */}
        <div className={`relative border border-[#14b8a6]/20 rounded-lg overflow-hidden ${isMapExpanded ? 'h-[800px]' : 'h-[600px]'}`}>
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
              vendor_name: s.vendor_business_name || undefined
            }));
            console.log('[DEBUG render] Passando a MarketMapComponent:', {
              refreshKey: mapRefreshKey,
              stallsDataLength: stallsDataForMap.length,
              firstStall: stallsDataForMap[0],
              mapDataExists: !!mapData
            });
            return (
              <MarketMapComponent
                refreshKey={mapRefreshKey}
                mapData={mapData}
                center={mapCenter}
                zoom={19}
                height="100%"
                isSpuntaMode={isSpuntaMode}
                onConfirmAssignment={handleConfirmAssignment}
                onStallClick={(stallNumber) => {
                  const dbStall = stallsByNumber.get(stallNumber);
                  if (dbStall) {
                    setSelectedStallId(dbStall.id);
                    // Scroll alla riga nella tabella
                    const row = document.querySelector(`[data-stall-id="${dbStall.id}"]`);
                    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                selectedStallNumber={stalls.find(s => s.id === selectedStallId)?.number}
                stallsData={stallsDataForMap}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Concessioni (identico a prima)
 */
function ConcessioniTab({ marketId }: { marketId: number }) {
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [marketId]);

  const fetchData = async () => {
    try {
      const [concessionsRes, vendorsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/concessions?market_id=${marketId}`),
        fetch(`${API_BASE_URL}/api/vendors`)
      ]);

      const concessionsData = await concessionsRes.json();
      const vendorsData = await vendorsRes.json();

      if (concessionsData.success) {
        setConcessions(concessionsData.data);
      }
      if (vendorsData.success) {
        setVendors(vendorsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sezione Imprese */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-[#e8fbff]">Imprese Registrate</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-base text-[#e8fbff]">{vendor.business_name}</CardTitle>
                <CardDescription className="text-[#e8fbff]/70">{vendor.code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">P.IVA</span>
                    <span className="font-medium text-[#e8fbff]">{vendor.vat_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Referente</span>
                    <span className="font-medium text-[#e8fbff]">{vendor.contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Telefono</span>
                    <span className="font-medium text-[#e8fbff]">{vendor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Stato</span>
                    <Badge 
                      variant="default" 
                      className={vendor.status === 'active' 
                        ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30' 
                        : 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30'}
                    >
                      {vendor.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sezione Concessioni */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-[#e8fbff]">Concessioni Attive</h3>
        <div className="border border-[#14b8a6]/20 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0b1220]/50 border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
                <TableHead className="text-[#e8fbff]/70">Posteggio</TableHead>
                <TableHead className="text-[#e8fbff]/70">Impresa</TableHead>
                <TableHead className="text-[#e8fbff]/70">Tipo</TableHead>
                <TableHead className="text-[#e8fbff]/70">Valida Dal</TableHead>
                <TableHead className="text-[#e8fbff]/70">Valida Al</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concessions.map((concession) => (
                <TableRow key={concession.id} className="border-[#14b8a6]/10 hover:bg-[#14b8a6]/5">
                  <TableCell className="font-medium text-[#e8fbff]">{concession.stall_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#e8fbff]">{concession.vendor_business_name}</p>
                      <p className="text-xs text-[#e8fbff]/70">{concession.vendor_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                      {concession.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#e8fbff]">
                    {new Date(concession.valid_from).toLocaleDateString('it-IT')}
                  </TableCell>
                  <TableCell className="text-[#e8fbff]">
                    {concession.valid_to 
                      ? new Date(concession.valid_to).toLocaleDateString('it-IT')
                      : 'Indeterminato'}
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
