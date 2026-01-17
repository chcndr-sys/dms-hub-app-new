import { useState, useEffect, useRef } from "react";
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
  Send,
  Phone,
  Mail,
  User,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketMapComponent } from './MarketMapComponent';
import { PresenzeGraduatoriaPanel } from './PresenzeGraduatoriaPanel';
import { trpc } from '@/lib/trpc';
import { MarketCompaniesTab, CompanyModal, CompanyRow, CompanyFormData, FORMA_GIURIDICA_OPTIONS, STATO_IMPRESA_OPTIONS } from './markets/MarketCompaniesTab';
import { getStallStatusLabel, getStallStatusClasses, getStallMapFillColor, STALL_STATUS_OPTIONS } from '@/lib/stallStatus';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'wouter';

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
  cost_per_sqm?: number;
  annual_market_days?: number;
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
  start_date: string;
  end_date: string;
  status: string;
}

interface MarketMapData {
  center: { lat: number; lng: number };
  stalls_geojson: {
    type: string;
    features: any[];
  };
}

interface CompanyDetails {
  id: number;
  ragione_sociale: string;
  piva: string;
  codice_fiscale: string;
  email?: string;
  pec?: string;
  referente?: string;
  telefono?: string;
  codice_ateco?: string;
  descrizione_ateco?: string;
  stato?: string;
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
  const [marketStalls, setMarketStalls] = useState<Stall[]>([]);
  const [refreshStallsCallback, setRefreshStallsCallback] = useState<(() => Promise<void>) | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        <MarketDetail 
          market={selectedMarket} 
          allMarkets={markets} 
          onUpdate={fetchMarkets} 
          onStallsLoaded={setMarketStalls} 
          onRefreshStallsReady={setRefreshStallsCallback} 
          onActionTriggered={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Presenze e Graduatoria */}
      {selectedMarket && (
        <PresenzeGraduatoriaPanel 
          marketId={selectedMarket.id} 
          marketName={selectedMarket.name} 
          stalls={marketStalls} 
          onRefreshStalls={refreshStallsCallback || undefined}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  );
}

/**
 * Dettaglio mercato con tab
 */
function MarketDetail({ market, allMarkets, onUpdate, onStallsLoaded, onRefreshStallsReady, onActionTriggered }: { market: Market; allMarkets: Market[]; onUpdate: () => void; onStallsLoaded?: (stalls: Stall[]) => void; onRefreshStallsReady?: (callback: (() => Promise<void>) | null) => void; onActionTriggered?: () => void }) {
  const [activeTab, setActiveTab] = useState("anagrafica");
  const [stalls, setStalls] = useState<Stall[]>([]);
  // Stato per Vista Italia / Vista Mercato: 'italia' | 'mercato'
  const [viewMode, setViewMode] = useState<'italia' | 'mercato'>('italia');
  const [viewTrigger, setViewTrigger] = useState(0); // Trigger per forzare flyTo

  // Funzione per caricare i posteggi (esposta per refresh esterno)
  const fetchStalls = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/${market.id}/stalls`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setStalls(json.data);
        onStallsLoaded?.(json.data);
      }
    } catch (error) {
      console.error('[MarketDetail] Errore caricamento posteggi:', error);
    }
  };

  // Carica i posteggi al mount del componente
  useEffect(() => {
    fetchStalls();
    // Reset vista all'apertura di un nuovo mercato
    // Forza immediatamente lo stato italia
    setViewMode('italia');
    // Uso un piccolo timeout per assicurarmi che la mappa sia pronta prima del trigger
    setTimeout(() => {
      setViewTrigger(prev => prev + 1);
    }, 100);
  }, [market.id]);

  // Sincronizza lo stato locale dei posteggi con il componente padre per il pannello presenze
  useEffect(() => {
    onStallsLoaded?.(stalls);
  }, [stalls, onStallsLoaded]);

  // Espone la funzione fetchStalls al componente padre
  useEffect(() => {
    onRefreshStallsReady?.(fetchStalls);
    return () => onRefreshStallsReady?.(null);
  }, [market.id, onRefreshStallsReady]);

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
      <CardHeader>
        <CardTitle className="text-[#e8fbff]">Dettaglio: {market.name}</CardTitle>
        <CardDescription className="text-[#e8fbff]/70">Gestisci anagrafica, posteggi e concessioni</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            setActiveTab(value);
            
            // Gestione reset vista quando si cambia tab
            if (value === 'posteggi') {
              // Quando si entra nel tab posteggi, forza sempre Vista Italia
              setViewMode('italia');
              // Trigger per assicurare che la mappa si posizioni correttamente
              setTimeout(() => setViewTrigger(prev => prev + 1), 100);
            } else {
              // Quando si esce dal tab posteggi, resetta selezioni
              // setSelectedStallId(null);
              // setSelectedStallCenter(null);
              // Resetta anche viewMode per sicurezza
              setViewMode('italia');
            }
          }}
        >
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
            <AnagraficaTab market={market} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="posteggi" className="space-y-4">
            <div className="flex justify-center mb-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-[#0b1220]/50 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/20"
                onClick={() => {
                  setViewMode(prev => prev === 'italia' ? 'mercato' : 'italia');
                  setViewTrigger(prev => prev + 1);
                }}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {viewMode === 'italia' ? 'Vai a Vista Mercato' : 'Torna a Vista Italia'}
              </Button>
            </div>
            <PosteggiTab 
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
              onActionTriggered={onActionTriggered}
            />
          </TabsContent>

          <TabsContent value="concessioni" className="space-y-4">
            <MarketCompaniesTab 
              marketId={market.id.toString()} 
              marketName={market.name}
              municipality={market.municipality}
              stalls={stalls.map(s => ({ id: s.id.toString(), code: s.number }))} 
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Tab Anagrafica Mercato
 */
function AnagraficaTab({ market, onUpdate }: { market: Market; onUpdate: () => void }) {
  const [formData, setFormData] = useState({
    days: market.days || '',
    cost_per_sqm: market.cost_per_sqm || 0,
    annual_market_days: market.annual_market_days || 52
  });
  const [saving, setSaving] = useState(false);

  // Aggiorna il form quando cambia il mercato selezionato
  useEffect(() => {
    setFormData({
      days: market.days || '',
      cost_per_sqm: market.cost_per_sqm || 0,
      annual_market_days: market.annual_market_days || 52
    });
  }, [market]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/${market.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Dati mercato aggiornati con successo');
        onUpdate();
      } else {
        throw new Error('Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Error updating market:', error);
      toast.error('Errore durante il salvataggio delle modifiche');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-[#e8fbff]">Dati Generali e Tariffe</h3>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salva Modifiche
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Campi Sola Lettura */}
        <div className="bg-[#0b1220]/30 p-4 rounded-lg border border-[#14b8a6]/10">
          <label className="text-sm font-medium text-[#e8fbff]/50">Codice</label>
          <p className="text-lg font-semibold text-[#e8fbff]/70 mt-1">{market.code}</p>
        </div>
        <div className="bg-[#0b1220]/30 p-4 rounded-lg border border-[#14b8a6]/10">
          <label className="text-sm font-medium text-[#e8fbff]/50">Nome</label>
          <p className="text-lg font-semibold text-[#e8fbff]/70 mt-1">{market.name}</p>
        </div>
        <div className="bg-[#0b1220]/30 p-4 rounded-lg border border-[#14b8a6]/10">
          <label className="text-sm font-medium text-[#e8fbff]/50">Comune</label>
          <p className="text-lg font-semibold text-[#e8fbff]/70 mt-1">{market.municipality}</p>
        </div>
        <div className="bg-[#0b1220]/30 p-4 rounded-lg border border-[#14b8a6]/10">
          <label className="text-sm font-medium text-[#e8fbff]/50">Posteggi Totali</label>
          <p className="text-lg font-semibold text-[#e8fbff]/70 mt-1">{market.total_stalls}</p>
        </div>

        {/* Campi Modificabili - Configurazione Mercato */}
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/30 ring-1 ring-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#14b8a6]">Giorno Settimanale</label>
          <input
            type="text"
            value={formData.days}
            onChange={(e) => setFormData({ ...formData, days: e.target.value })}
            className="w-full mt-2 px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-md text-[#e8fbff] focus:outline-none focus:border-[#14b8a6]"
            placeholder="Es. Lunedì"
          />
        </div>

        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/30 ring-1 ring-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#14b8a6]">Giorni/Anno (per calcolo canone)</label>
          <input
            type="number"
            value={formData.annual_market_days}
            onChange={(e) => setFormData({ ...formData, annual_market_days: parseInt(e.target.value) || 0 })}
            className="w-full mt-2 px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-md text-[#e8fbff] focus:outline-none focus:border-[#14b8a6]"
            placeholder="Es. 52"
          />
        </div>

        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/30 ring-1 ring-[#14b8a6]/20 col-span-2">
          <label className="text-sm font-medium text-[#14b8a6]">Costo al mq (€)</label>
          <div className="relative mt-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#e8fbff]/50">€</span>
            <input
              type="number"
              step="0.01"
              value={formData.cost_per_sqm}
              onChange={(e) => setFormData({ ...formData, cost_per_sqm: parseFloat(e.target.value) || 0 })}
              className="w-full pl-8 pr-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-md text-[#e8fbff] focus:outline-none focus:border-[#14b8a6]"
              placeholder="0.00"
            />
          </div>
          <p className="text-xs text-[#e8fbff]/50 mt-2">
            Utilizzato per il calcolo automatico del canone unico (Costo mq × Mq Posteggio × Giorni Anno)
          </p>
        </div>

        {/* Altri Dati Tecnici */}
        <div className="bg-[#0b1220]/30 p-4 rounded-lg border border-[#14b8a6]/10">
          <label className="text-sm font-medium text-[#e8fbff]/50">Latitudine</label>
          <p className="text-lg font-semibold text-[#e8fbff]/70 mt-1">{market.latitude}</p>
        </div>
        <div className="bg-[#0b1220]/30 p-4 rounded-lg border border-[#14b8a6]/10">
          <label className="text-sm font-medium text-[#e8fbff]/50">Longitudine</label>
          <p className="text-lg font-semibold text-[#e8fbff]/70 mt-1">{market.longitude}</p>
        </div>
        <div className="bg-[#0b1220]/30 p-4 rounded-lg border border-[#14b8a6]/10 col-span-2">
          <label className="text-sm font-medium text-[#e8fbff]/50">GIS Market ID</label>
          <p className="text-lg font-semibold text-[#e8fbff]/70 mt-1">{market.gis_market_id}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Posteggi con Mappa e Lista
 */
function PosteggiTab({ marketId, marketCode, marketCenter, stalls, setStalls, allMarkets, viewMode, setViewMode, viewTrigger, setViewTrigger, onActionTriggered }: { marketId: number; marketCode: string; marketCenter: [number, number]; stalls: Stall[]; setStalls: React.Dispatch<React.SetStateAction<Stall[]>>; allMarkets: Market[]; viewMode: 'italia' | 'mercato'; setViewMode: (mode: 'italia' | 'mercato') => void; viewTrigger: number; setViewTrigger: React.Dispatch<React.SetStateAction<number>>; onActionTriggered?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  const [selectedStallId, setSelectedStallId] = useState<number | null>(null);
  const [selectedStallCenter, setSelectedStallCenter] = useState<[number, number] | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [concessionsByStallId, setConcessionsByStallId] = useState<Record<string, any>>({});
  const [isSpuntaMode, setIsSpuntaMode] = useState(false);
  const [isOccupaMode, setIsOccupaMode] = useState(false);
  const [isLiberaMode, setIsLiberaMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const stopAnimationRef = useRef(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Stati per editing posteggio
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Stall>>({});

  // Stati per CompanyModal
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<CompanyDetails | null>(null);

  useEffect(() => {
    fetchData();
  }, [marketId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mapRes, concessionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/markets/${marketId}/map`),
        fetch(`${API_BASE_URL}/api/concessions?market_id=${marketId}`)
      ]);

      const mapJson = await mapRes.json();
      const concessionsJson = await concessionsRes.json();

      if (mapJson.success) {
        setMapData(mapJson.data);
      }
      
      if (concessionsJson.success) {
        const mapping: Record<string, any> = {};
        concessionsJson.data.forEach((c: any) => {
          mapping[c.stall_number] = {
            companyName: c.vendor_business_name,
            tipoConcessione: c.type,
            vendorId: c.vendor_id,
            impresaId: c.impresa_id
          };
        });
        setConcessionsByStallId(mapping);
      }
    } catch (error) {
      console.error('Error fetching posteggi data:', error);
      toast.error('Errore nel caricamento dei dati posteggi');
    } finally {
      setLoading(false);
    }
  };

  // Conferma assegnazione spunta
  const handleConfirmAssignment = async (stallId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'occupato' }),
      });

      const data = await response.json();
      if (data.success) {
        try {
          await fetch(`${API_BASE_URL}/api/presenze/registra-spunta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              market_id: marketId,
              stall_id: stallId,
              giorno_mercato: new Date().toISOString().split('T')[0]
            })
          });
          toast.success('Assegnazione confermata');
        } catch (e) {
          toast.success('Posteggio assegnato');
        }
        
        setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'occupato' } : s));
        setSelectedStallId(null);
        setSelectedStallCenter(null);
        onActionTriggered?.();
      } else {
        toast.error('Errore nell\'assegnazione');
      }
    } catch (error) {
      toast.error('Errore durante l\'assegnazione');
    }
  };

  // Occupa un posteggio libero
  const handleOccupaStall = async (stallId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'occupato' }),
      });

      const data = await response.json();
      if (data.success) {
        const stall = stalls.find(s => s.id === stallId);
        const impresaId = stall?.impresa_id || concessionsByStallId[stall?.number || '']?.impresa_id;
        const walletId = 1; // Default wallet

        if (impresaId) {
          try {
            await fetch(`${API_BASE_URL}/api/presenze/registra-arrivo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                market_id: marketId,
                stall_id: stallId,
                impresa_id: impresaId,
                wallet_id: walletId,
                tipo_presenza: 'CONCESSION',
                giorno_mercato: new Date().toISOString().split('T')[0]
              })
            });
            toast.success('Arrivo registrato');
          } catch (e) {
            toast.success('Posteggio occupato');
          }
        } else {
          toast.success('Posteggio occupato!');
        }
        
        setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'occupato' } : s));
        setSelectedStallId(null);
        setSelectedStallCenter(null);
        onActionTriggered?.();
      } else {
        toast.error('Errore nell\'occupazione');
      }
    } catch (error) {
      toast.error('Errore durante l\'occupazione');
    }
  };

  // Libera un posteggio occupato
  const handleLiberaStall = async (stallId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'libero' }),
      });

      const data = await response.json();
      if (data.success) {
        try {
          await fetch(`${API_BASE_URL}/api/presenze/registra-uscita`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              market_id: marketId,
              stall_id: stallId,
              giorno_mercato: new Date().toISOString().split('T')[0]
            })
          });
          toast.success('Uscita registrata');
        } catch (e) {
          toast.success('Posteggio liberato');
        }
        
        setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'libero' } : s));
        setSelectedStallId(null);
        setSelectedStallCenter(null);
        onActionTriggered?.();
      } else {
        toast.error('Errore nella liberazione');
      }
    } catch (error) {
      toast.error('Errore durante la liberazione');
    }
  };

  const handleEdit = (stall: Stall) => {
    setEditingId(stall.id);
    setEditData(stall);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleRowClick = (stall: Stall) => {
    if (selectedStallId === stall.id) {
      setSelectedStallId(null);
      setSelectedStallCenter(null);
      return;
    }
    
    setSelectedStallId(stall.id);
    
    const mapFeature = mapData?.stalls_geojson.features.find(
      f => f.properties.number === stall.number
    );
    
    if (mapFeature && mapFeature.geometry.type === 'Polygon') {
      const coords = mapFeature.geometry.coordinates as [number, number][][];
      const lats = coords[0].map(c => c[1]);
      const lngs = coords[0].map(c => c[0]);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      
      setSelectedStallCenter([centerLat, centerLng]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#14b8a6]" />
        <p className="text-[#e8fbff]/70 animate-pulse">Caricamento mappa e posteggi in corso...</p>
      </div>
    );
  }

  const occupiedCount = stalls.filter(s => s.status === 'occupato').length;
  const freeCount = stalls.filter(s => s.status === 'libero').length;
  const reservedCount = stalls.filter(s => s.status === 'riservato').length;
  const stallsByNumber = new Map(stalls.map(s => [s.number, s]));
  const selectedStall = stalls.find(s => s.id === selectedStallId) || null;

  return (
    <div className="space-y-4">
      {/* Statistiche Posteggi */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`bg-[#ef4444]/10 border p-4 rounded-lg relative ${isOccupaMode ? 'border-[#ef4444] ring-2 ring-[#ef4444]/50' : 'border-[#ef4444]/30'}`}>
          <div className="text-sm text-[#ef4444] mb-1">Occupati</div>
          <div className="text-3xl font-bold text-[#ef4444]">{occupiedCount}</div>
          <Button
            size="sm"
            variant={isOccupaMode ? "default" : "outline"}
            className={`absolute top-2 right-2 text-xs ${isOccupaMode ? 'bg-[#ef4444] text-white' : 'text-[#ef4444] border-[#ef4444]/50'}`}
            onClick={() => { setIsOccupaMode(!isOccupaMode); setIsLiberaMode(false); setIsSpuntaMode(false); }}
          >
            ✅ Occupa
          </Button>
        </div>
        
        <div className={`bg-[#10b981]/10 border p-4 rounded-lg relative ${isLiberaMode ? 'border-[#10b981] ring-2 ring-[#10b981]/50' : 'border-[#10b981]/30'}`}>
          <div className="text-sm text-[#10b981] mb-1">Liberi</div>
          <div className="text-3xl font-bold text-[#10b981]">{freeCount}</div>
          <Button
            size="sm"
            variant={isLiberaMode ? "default" : "outline"}
            className={`absolute top-2 right-2 text-xs ${isLiberaMode ? 'bg-[#10b981] text-white' : 'text-[#10b981] border-[#10b981]/50'}`}
            onClick={() => { setIsLiberaMode(!isLiberaMode); setIsOccupaMode(false); setIsSpuntaMode(false); }}
          >
            🚮 Libera
          </Button>
        </div>

        <div className={`bg-[#f59e0b]/10 border p-4 rounded-lg relative ${isSpuntaMode ? 'border-[#f59e0b] ring-2 ring-[#f59e0b]/50' : 'border-[#f59e0b]/30'}`}>
          <div className="text-sm text-[#f59e0b] mb-1">Riservati</div>
          <div className="text-3xl font-bold text-[#f59e0b]">{reservedCount}</div>
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-[#f59e0b] border-[#f59e0b]/50"
            >
              🟠 Prepara
            </Button>
            <Button
              size="sm"
              variant={isSpuntaMode ? "default" : "outline"}
              className={`text-xs ${isSpuntaMode ? 'bg-[#f59e0b] text-white' : 'text-[#f59e0b] border-[#f59e0b]/50'}`}
              onClick={() => { setIsSpuntaMode(!isSpuntaMode); setIsOccupaMode(false); setIsLiberaMode(false); }}
            >
              ✓ Spunta
            </Button>
          </div>
        </div>
      </div>

      {/* Barra Azioni Massive */}
      {(isLiberaMode || isOccupaMode || isSpuntaMode) && (
        <div className="mb-4">
          <Button
            className={`w-full font-semibold py-3 border-2 ${
              isLiberaMode ? 'bg-[#10b981]' : isOccupaMode ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
            } text-white`}
            onClick={async () => {
              if (isAnimating) { stopAnimationRef.current = true; return; }
              const targetStalls = isLiberaMode ? stalls.filter(s => s.status === 'occupato') : 
                                 isOccupaMode ? stalls.filter(s => s.status === 'libero') : 
                                 stalls.filter(s => s.status === 'riservato');
              if (targetStalls.length === 0) return;
              if (!window.confirm(`Eseguire l'azione su ${targetStalls.length} posteggi?`)) return;
              
              setIsAnimating(true);
              stopAnimationRef.current = false;
              for (const stall of targetStalls) {
                if (stopAnimationRef.current) break;
                if (isLiberaMode) await handleLiberaStall(stall.id);
                else if (isOccupaMode) await handleOccupaStall(stall.id);
                else await handleConfirmAssignment(stall.id);
              }
              setIsAnimating(false);
              onActionTriggered?.();
            }}
          >
            {isAnimating ? '⏹ STOP' : `Esegui Azione Massiva (${isLiberaMode ? occupiedCount : isOccupaMode ? freeCount : reservedCount} posteggi)`}
          </Button>
        </div>
      )}

      {/* Mappa */}
      <div className={`relative border border-[#14b8a6]/20 rounded-lg overflow-hidden ${isMapExpanded ? 'h-[850px]' : 'h-[600px]'}`}>
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2 z-[1000] bg-[#0b1220]/90 border-[#14b8a6]/30 text-[#14b8a6]"
          onClick={() => setIsMapExpanded(!isMapExpanded)}
        >
          {isMapExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {mapData && (
          <MarketMapComponent
            refreshKey={mapRefreshKey}
            mapData={mapData}
            center={viewMode === 'mercato' ? marketCenter : [42.5, 12.5]}
            zoom={viewMode === 'mercato' ? 17 : 6}
            height="100%"
            isSpuntaMode={isSpuntaMode}
            isOccupaMode={isOccupaMode}
            isLiberaMode={isLiberaMode}
            onConfirmAssignment={handleConfirmAssignment}
            onOccupaStall={handleOccupaStall}
            onLiberaStall={handleLiberaStall}
            onStallClick={(num) => {
              const s = stallsByNumber.get(num);
              if (s) setSelectedStallId(s.id);
            }}
            selectedStallNumber={stalls.find(s => s.id === selectedStallId)?.number}
            stallsData={stalls.map(s => ({
              id: s.id,
              number: s.number,
              status: s.status,
              type: s.type,
              vendor_name: s.vendor_business_name || undefined,
              dimensions: s.dimensions
            }))}
            allMarkets={allMarkets.map(m => ({
              id: m.id,
              name: m.name,
              latitude: parseFloat(m.latitude),
              longitude: parseFloat(m.longitude)
            }))}
            showItalyView={viewMode === 'italia'}
            viewTrigger={viewTrigger}
            marketCenterFixed={marketCenter}
            selectedStallCenter={selectedStallCenter || undefined}
            onMarketClick={() => { setViewMode('mercato'); setViewTrigger(prev => prev + 1); }}
          />
        )}
      </div>

      {/* Lista e Scheda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-[#14b8a6]/20 rounded-lg overflow-hidden">
          <div className="bg-[#0b1220]/50 px-4 py-2 border-b border-[#14b8a6]/20">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Lista Posteggi</h3>
          </div>
          <div ref={listContainerRef} className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-[#0b1220]/95 z-10">
                <TableRow className="border-[#14b8a6]/20">
                  <TableHead className="text-[#e8fbff]/70 text-xs">N°</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs">Tipo</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs">Stato</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs">Intestatario</TableHead>
                  <TableHead className="text-right text-[#e8fbff]/70 text-xs">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stalls.map((stall) => (
                  <TableRow 
                    key={stall.id}
                    className={`cursor-pointer hover:bg-[#14b8a6]/10 border-[#14b8a6]/10 ${selectedStallId === stall.id ? 'bg-[#14b8a6]/20' : ''}`}
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
                    <TableCell className="text-sm truncate max-w-[120px]">
                      {stall.vendor_business_name || concessionsByStallId[stall.number]?.companyName || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleEdit(stall); }} className="hover:bg-[#14b8a6]/20 text-[#14b8a6] h-6 w-6 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="h-[450px] flex flex-col bg-[#0b1220]/30 rounded-lg border border-[#14b8a6]/10 overflow-hidden relative">
          {!selectedStall ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MapPin className="h-12 w-12 text-[#14b8a6]/30 mb-4" />
              <p className="text-[#e8fbff]/50 text-sm">Seleziona un posteggio per i dettagli</p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#14b8a6]/20 bg-[#14b8a6]/5">
                <div>
                  <h3 className="text-sm font-semibold text-[#e8fbff]">Posteggio {selectedStall.number}</h3>
                  <Badge className={`${getStallStatusClasses(selectedStall.status)} text-xs mt-1`}>{getStallStatusLabel(selectedStall.status)}</Badge>
                </div>
                <button onClick={() => setSelectedStallId(null)} className="text-[#e8fbff]/50 hover:text-[#e8fbff]"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#14b8a6]" />
                  <span className="text-[#e8fbff] font-semibold">{selectedStall.vendor_business_name || 'Nessuna impresa'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
