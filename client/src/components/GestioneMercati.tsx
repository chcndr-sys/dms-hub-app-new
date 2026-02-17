import { useState, useEffect, useRef } from "react";
import React from 'react';
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
  AlertCircle,
  Wallet,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketMapComponent } from './MarketMapComponent';
import { PresenzeGraduatoriaPanel } from './PresenzeGraduatoriaPanel';
import { trpc } from '@/lib/trpc';
import { MarketCompaniesTab, CompanyModal, CompanyRow, CompanyFormData } from './markets/MarketCompaniesTab';
import { MarketSettingsTab } from './markets/MarketSettingsTab';
import { getStallStatusLabel, getStallStatusClasses, getStallMapFillColor, STALL_STATUS_OPTIONS, normalizeStallStatus } from '@/lib/stallStatus';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { MIHUB_API_BASE_URL } from '@/config/api';
import { useImpersonation } from '@/hooks/useImpersonation';

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
  wallet_id: number | null; // ID wallet per detrazione importo
  spuntista_impresa_id: number | null;
  spuntista_nome: string | null;
  wallet_balance?: string | null;
  area_mq?: string | null;
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
  status?: string;
  stato?: string;
  stato_calcolato?: string;
  settore_merceologico?: string;
  comune_rilascio?: string;
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

// Interfaccia per i dati completi dell'impresa
interface CompanyDetails {
  id: string;
  code: string;
  denominazione: string;
  partita_iva?: string;
  codice_fiscale?: string;
  numero_rea?: string;
  cciaa_sigla?: string;
  forma_giuridica?: string;
  stato_impresa?: string;
  indirizzo_via?: string;
  indirizzo_civico?: string;
  indirizzo_cap?: string;
  indirizzo_provincia?: string;
  comune?: string;
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

  // Hook per impersonificazione - filtro mercati per comune
  const { isImpersonating, comuneNome } = useImpersonation();

  // tRPC fallback: dmsHub.markets.list è publicProcedure (nessuna auth richiesta)
  const trpcMarketsQuery = trpc.dmsHub.markets.list.useQuery();

  /** Applica filtro comune ai mercati */
  const applyFilters = (rawMarkets: Market[]) => {
    const userStr = localStorage.getItem('user');
    let userComune: string | null = null;
    let isSuperAdmin = false;

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        isSuperAdmin = user.is_super_admin === true;
        if (user.assigned_roles && user.assigned_roles.length > 0) {
          userComune = user.assigned_roles[0].comune_nome || null;
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }

    const comuneFilter = isImpersonating ? comuneNome : userComune;

    if (!isSuperAdmin && comuneFilter) {
      const filtered = rawMarkets.filter((market: Market) =>
        market.municipality?.toLowerCase() === comuneFilter.toLowerCase()
      );
      console.warn(`[GestioneMercati] Filtro mercati per comune: ${comuneFilter} - ${filtered.length} mercati`);
      return filtered;
    }
    console.warn(`[GestioneMercati] Nessun filtro comune - ${rawMarkets.length} mercati totali`);
    return rawMarkets;
  };

  useEffect(() => {
    fetchMarkets();
  }, [isImpersonating, comuneNome]);

  const fetchMarkets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets`);
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        const filteredMarkets = applyFilters(data.data);
        setMarkets(filteredMarkets);
        if (filteredMarkets.length > 0 && !selectedMarket) {
          setSelectedMarket(filteredMarkets[0]);
        }
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error fetching markets from REST:', error);
    }
    // REST failed or returned empty — tRPC fallback will handle via useEffect
    setLoading(false);
  };

  // Fallback tRPC: se REST non ha caricato mercati, usa dati dal Neon DB
  useEffect(() => {
    if (markets.length === 0 && trpcMarketsQuery.data && trpcMarketsQuery.data.length > 0) {
      const mapped: Market[] = trpcMarketsQuery.data.map((m: any) => ({
        id: m.id,
        code: String(m.id),
        name: m.name,
        municipality: m.city,
        days: m.openingHours || '',
        total_stalls: m.totalStalls || 0,
        status: m.active === 1 ? 'active' : 'inactive',
        gis_market_id: String(m.id),
        latitude: m.lat,
        longitude: m.lng,
      }));
      const filtered = applyFilters(mapped);
      setMarkets(filtered);
      if (filtered.length > 0 && !selectedMarket) {
        setSelectedMarket(filtered[0]);
      }
      setLoading(false);
    }
  }, [trpcMarketsQuery.data, markets.length]);

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
        <MarketDetail market={selectedMarket} allMarkets={markets} onUpdate={fetchMarkets} onStallsLoaded={setMarketStalls} onRefreshStallsReady={setRefreshStallsCallback} />
      )}

      {/* Pannello Presenze e Graduatoria RIMOSSO - ora integrato nella lista posteggi superiore */}
    </div>
  );
}

/**
 * Dettaglio mercato con tab
 */
function MarketDetail({ market, allMarkets, onUpdate, onStallsLoaded, onRefreshStallsReady }: { market: Market; allMarkets: Market[]; onUpdate: () => void; onStallsLoaded?: (stalls: Stall[]) => void; onRefreshStallsReady?: (callback: (() => Promise<void>) | null) => void }) {
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
        // Normalizza stati: DB potrebbe restituire inglese (free/occupied/reserved)
        const normalizedStalls = json.data.map((s: Stall) => ({
          ...s,
          status: normalizeStallStatus(s.status)
        }));
        setStalls(normalizedStalls);
        onStallsLoaded?.(normalizedStalls);
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
              // Quando si esce dal tab posteggi, resetta viewMode per sicurezza
              setViewMode('italia');
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-4 bg-[#0b1220]/50">
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
            <TabsTrigger 
              value="impostazioni"
              className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Impostazioni
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
            <PosteggiTab marketId={market.id} marketCode={market.code} marketCenter={[parseFloat(market.latitude), parseFloat(market.longitude)]} stalls={stalls} setStalls={setStalls} allMarkets={allMarkets} viewMode={viewMode} setViewMode={setViewMode} viewTrigger={viewTrigger} setViewTrigger={setViewTrigger} />
          </TabsContent>

          <TabsContent value="concessioni" className="space-y-4">
            <MarketCompaniesTab 
              marketId={market.id.toString()} 
              marketName={market.name}
              municipality={market.municipality}
              stalls={stalls.map(s => ({ id: s.id.toString(), code: s.number }))} 
            />
          </TabsContent>

          <TabsContent value="impostazioni" className="space-y-4">
            <MarketSettingsTab 
              marketId={market.id} 
              marketName={market.name}
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
          <p className="text-lg font-semibold text-[#8b5cf6]/70 mt-1">{market.gis_market_id}</p>
        </div>
      </div>
    </div>
  );
}

// Costanti per i select del form impresa
const FORMA_GIURIDICA_OPTIONS = [
  { value: '', label: 'Seleziona...' },
  { value: 'SRL', label: 'S.R.L.' },
  { value: 'SPA', label: 'S.P.A.' },
  { value: 'SNC', label: 'S.N.C.' },
  { value: 'SAS', label: 'S.A.S.' },
  { value: 'DI', label: 'Ditta Individuale' },
  { value: 'COOP', label: 'Cooperativa' },
  { value: 'ALTRO', label: 'Altro' },
];

const STATO_IMPRESA_OPTIONS = [
  { value: 'Attiva', label: 'Attiva' },
  { value: 'Cessata', label: 'Cessata' },
  { value: 'In Liquidazione', label: 'In Liquidazione' },
  { value: 'Sospesa', label: 'Sospesa' },
];

/**
 * Componente Scheda Impresa - mostra il form completo di modifica impresa
 * come nel tab Imprese/Concessioni
 */
function CompanyDetailCard({ 
  stall, 
  concessionData,
  onClose 
}: { 
  stall: Stall | null;
  concessionData: any;
  onClose: () => void;
}) {
  const [companyData, setCompanyData] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    denominazione: '',
    codice_fiscale: '',
    partita_iva: '',
    numero_rea: '',
    cciaa_sigla: '',
    forma_giuridica: '',
    stato_impresa: 'Attiva',
    indirizzo_via: '',
    indirizzo_civico: '',
    indirizzo_cap: '',
    indirizzo_provincia: '',
    comune: '',
    pec: '',
    referente: '',
    telefono: '',
    codice_ateco: '',
    descrizione_ateco: '',
  });

  // Carica i dati dell'impresa quando cambia il posteggio selezionato
  useEffect(() => {
    if (stall?.vendor_id) {
      fetchCompanyData(stall.vendor_id);
    } else if (concessionData?.companyId) {
      fetchCompanyData(concessionData.companyId);
    } else {
      setCompanyData(null);
    }
  }, [stall?.vendor_id, concessionData?.companyId]);

  const fetchCompanyData = async (companyId: number | string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imprese/${companyId}`);
      const data = await response.json();
      if (data.success && data.data) {
        setCompanyData(data.data);
        setFormData({
          denominazione: data.data.denominazione || '',
          codice_fiscale: data.data.codice_fiscale || '',
          partita_iva: data.data.partita_iva || '',
          numero_rea: data.data.numero_rea || '',
          cciaa_sigla: data.data.cciaa_sigla || '',
          forma_giuridica: data.data.forma_giuridica || '',
          stato_impresa: data.data.stato_impresa || 'Attiva',
          indirizzo_via: data.data.indirizzo_via || '',
          indirizzo_civico: data.data.indirizzo_civico || '',
          indirizzo_cap: data.data.indirizzo_cap || '',
          indirizzo_provincia: data.data.indirizzo_provincia || '',
          comune: data.data.comune || '',
          pec: data.data.pec || '',
          referente: data.data.email || data.data.referente || '',
          telefono: data.data.telefono || '',
          codice_ateco: data.data.codice_ateco || '',
          descrizione_ateco: data.data.descrizione_ateco || '',
        });
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!companyData?.id) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imprese/${companyData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Impresa aggiornata con successo');
      } else {
        toast.error('Errore durante il salvataggio');
      }
    } catch (error) {
      console.error('Error saving company:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (!stall) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#0b1220]/30 rounded-lg border border-[#14b8a6]/10">
        <MapPin className="h-12 w-12 text-[#14b8a6]/30 mb-4" />
        <p className="text-[#e8fbff]/50 text-sm">
          Seleziona un posteggio dalla lista per visualizzare i dettagli dell'impresa
        </p>
      </div>
    );
  }

  const hasCompany = stall.vendor_business_name || concessionData;

  if (!hasCompany) {
    return (
      <div className="h-full flex flex-col bg-[#0b1220]/30 rounded-lg border border-[#14b8a6]/10">
        <div className="flex items-center justify-between p-4 border-b border-[#14b8a6]/20">
          <h3 className="text-sm font-semibold text-[#e8fbff]">
            Posteggio {stall.number}
          </h3>
          <button onClick={onClose} className="text-[#e8fbff]/50 hover:text-[#e8fbff]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Building2 className="h-12 w-12 text-[#10b981]/30 mb-4" />
          <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 mb-2">
            {getStallStatusLabel(stall.status)}
          </Badge>
          <p className="text-[#e8fbff]/50 text-sm">
            Nessuna impresa associata a questo posteggio
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0b1220]/30 rounded-lg border border-[#14b8a6]/10">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
        <p className="text-[#e8fbff]/50 text-sm mt-2">Caricamento dati impresa...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0b1220]/30 rounded-lg border border-[#14b8a6]/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#14b8a6]/20 bg-[#14b8a6]/5">
        <div>
          <h3 className="text-sm font-semibold text-[#e8fbff]">
            Modifica Impresa
          </h3>
        </div>
        <button onClick={onClose} className="text-[#e8fbff]/50 hover:text-[#e8fbff]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form Content - scrollabile */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* IDENTITÀ */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#e8fbff]/50 uppercase tracking-wide border-b border-[#14b8a6]/20 pb-1">
            Identità
          </h4>
          
          <div>
            <label className="block text-xs text-[#e8fbff]/70 mb-1">Denominazione *</label>
            <input
              type="text"
              value={formData.denominazione}
              onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })}
              className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Codice Fiscale *</label>
              <input
                type="text"
                value={formData.codice_fiscale}
                onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Partita IVA *</label>
              <input
                type="text"
                value={formData.partita_iva}
                onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Numero REA</label>
              <input
                type="text"
                value={formData.numero_rea}
                onChange={(e) => setFormData({ ...formData, numero_rea: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                placeholder="es. GR-123456"
              />
            </div>
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">CCIAA</label>
              <input
                type="text"
                value={formData.cciaa_sigla}
                onChange={(e) => setFormData({ ...formData, cciaa_sigla: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                placeholder="es. GR"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Forma Giuridica</label>
              <select
                value={formData.forma_giuridica}
                onChange={(e) => setFormData({ ...formData, forma_giuridica: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              >
                {FORMA_GIURIDICA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Stato Impresa</label>
              <select
                value={formData.stato_impresa}
                onChange={(e) => setFormData({ ...formData, stato_impresa: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              >
                {STATO_IMPRESA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SEDE LEGALE */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#e8fbff]/50 uppercase tracking-wide border-b border-[#14b8a6]/20 pb-1">
            Sede Legale
          </h4>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Via</label>
              <input
                type="text"
                value={formData.indirizzo_via}
                onChange={(e) => setFormData({ ...formData, indirizzo_via: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Civico</label>
              <input
                type="text"
                value={formData.indirizzo_civico}
                onChange={(e) => setFormData({ ...formData, indirizzo_civico: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">CAP</label>
              <input
                type="text"
                value={formData.indirizzo_cap}
                onChange={(e) => setFormData({ ...formData, indirizzo_cap: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Provincia</label>
              <input
                type="text"
                value={formData.indirizzo_provincia}
                onChange={(e) => setFormData({ ...formData, indirizzo_provincia: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
                maxLength={2}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#e8fbff]/70 mb-1">Comune</label>
            <input
              type="text"
              value={formData.comune}
              onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
              className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
            />
          </div>
        </div>

        {/* CONTATTI & ATTIVITÀ */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[#e8fbff]/50 uppercase tracking-wide border-b border-[#14b8a6]/20 pb-1">
            Contatti & Attività
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Email/Referente</label>
              <input
                type="email"
                value={formData.referente}
                onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#e8fbff]/70 mb-1">Telefono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer con pulsante Salva */}
      <div className="p-3 border-t border-[#14b8a6]/20 bg-[#0b1220]/50">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvataggio...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Salva Modifiche</>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Form inline per modifica impresa (38 campi) - versione compatta per colonna destra
 */
function CompanyInlineForm({ company, marketId, onClose, onSaved }: {
  company: CompanyRow & Record<string, any>;
  marketId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState<CompanyFormData>({
    denominazione: company?.denominazione || '',
    codice_fiscale: company?.code || company?.codice_fiscale || '',
    partita_iva: company?.partita_iva || '',
    numero_rea: company?.numero_rea || '',
    cciaa_sigla: company?.cciaa_sigla || '',
    forma_giuridica: company?.forma_giuridica || '',
    stato_impresa: company?.stato_impresa || 'ATTIVA',
    indirizzo_via: company?.indirizzo_via || '',
    indirizzo_civico: company?.indirizzo_civico || '',
    indirizzo_cap: company?.indirizzo_cap || '',
    indirizzo_provincia: company?.indirizzo_provincia || '',
    comune: company?.comune || '',
    pec: company?.pec || '',
    referente: company?.referente || '',
    telefono: company?.telefono || '',
    codice_ateco: company?.codice_ateco || '',
    descrizione_ateco: company?.descrizione_ateco || '',
    stato: company?.stato || 'active',
    rappresentante_legale_cognome: company?.rappresentante_legale_cognome || '',
    rappresentante_legale_nome: company?.rappresentante_legale_nome || '',
    rappresentante_legale_cf: company?.rappresentante_legale_cf || '',
    rappresentante_legale_data_nascita: company?.rappresentante_legale_data_nascita || '',
    rappresentante_legale_luogo_nascita: company?.rappresentante_legale_luogo_nascita || '',
    rappresentante_legale_residenza_via: company?.rappresentante_legale_residenza_via || '',
    rappresentante_legale_residenza_civico: company?.rappresentante_legale_residenza_civico || '',
    rappresentante_legale_residenza_cap: company?.rappresentante_legale_residenza_cap || '',
    rappresentante_legale_residenza_comune: company?.rappresentante_legale_residenza_comune || '',
    rappresentante_legale_residenza_provincia: company?.rappresentante_legale_residenza_provincia || '',
    capitale_sociale: company?.capitale_sociale?.toString() || '',
    numero_addetti: company?.numero_addetti?.toString() || '',
    sito_web: company?.sito_web || '',
    data_iscrizione_ri: company?.data_iscrizione_ri || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        capitale_sociale: formData.capitale_sociale ? parseFloat(formData.capitale_sociale) : null,
        numero_addetti: formData.numero_addetti ? parseInt(formData.numero_addetti) : null,
        code: formData.codice_fiscale,
        business_name: formData.denominazione,
        vat_number: formData.partita_iva,
        contact_name: formData.referente,
        phone: formData.telefono,
        email: formData.referente,
      };
      const response = await fetch(`${API_BASE_URL}/api/imprese/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Errore durante il salvataggio');
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-2 py-1.5 text-xs bg-[#1a2332] border border-[#14b8a6]/30 rounded text-[#e8fbff] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]";
  const labelClass = "block text-[10px] font-medium text-[#e8fbff]/70 mb-1";
  const sectionClass = "text-[10px] font-semibold text-[#14b8a6] uppercase tracking-wide border-b border-[#14b8a6]/20 pb-1 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-[10px]">{error}</p>
        </div>
      )}

      {/* IDENTITÀ */}
      <div>
        <h4 className={sectionClass}>Identità</h4>
        <div className="space-y-2">
          <div>
            <label className={labelClass}>Denominazione *</label>
            <input type="text" required value={formData.denominazione} onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Codice Fiscale *</label>
              <input type="text" required value={formData.codice_fiscale} onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Partita IVA *</label>
              <input type="text" required value={formData.partita_iva} onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Numero REA</label>
              <input type="text" value={formData.numero_rea} onChange={(e) => setFormData({ ...formData, numero_rea: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>CCIAA</label>
              <input type="text" value={formData.cciaa_sigla} onChange={(e) => setFormData({ ...formData, cciaa_sigla: e.target.value })} className={inputClass} maxLength={5} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Forma Giuridica</label>
              <select value={formData.forma_giuridica} onChange={(e) => setFormData({ ...formData, forma_giuridica: e.target.value })} className={inputClass}>
                {FORMA_GIURIDICA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Stato Impresa</label>
              <select value={formData.stato_impresa} onChange={(e) => setFormData({ ...formData, stato_impresa: e.target.value })} className={inputClass}>
                {STATO_IMPRESA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SEDE LEGALE */}
      <div>
        <h4 className={sectionClass}>Sede Legale</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className={labelClass}>Via</label>
              <input type="text" value={formData.indirizzo_via} onChange={(e) => setFormData({ ...formData, indirizzo_via: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Civico</label>
              <input type="text" value={formData.indirizzo_civico} onChange={(e) => setFormData({ ...formData, indirizzo_civico: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>CAP</label>
              <input type="text" value={formData.indirizzo_cap} onChange={(e) => setFormData({ ...formData, indirizzo_cap: e.target.value })} className={inputClass} maxLength={5} />
            </div>
            <div>
              <label className={labelClass}>Comune</label>
              <input type="text" value={formData.comune} onChange={(e) => setFormData({ ...formData, comune: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Provincia</label>
              <input type="text" value={formData.indirizzo_provincia} onChange={(e) => setFormData({ ...formData, indirizzo_provincia: e.target.value.toUpperCase() })} className={inputClass} maxLength={2} />
            </div>
          </div>
        </div>
      </div>

      {/* CONTATTI & ATTIVITÀ */}
      <div>
        <h4 className={sectionClass}>Contatti & Attività</h4>
        <div className="space-y-2">
          <div>
            <label className={labelClass}>PEC</label>
            <input type="email" value={formData.pec} onChange={(e) => setFormData({ ...formData, pec: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={formData.referente} onChange={(e) => setFormData({ ...formData, referente: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefono</label>
              <input type="tel" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Codice ATECO</label>
              <input type="text" value={formData.codice_ateco} onChange={(e) => setFormData({ ...formData, codice_ateco: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Descrizione ATECO</label>
              <input type="text" value={formData.descrizione_ateco} onChange={(e) => setFormData({ ...formData, descrizione_ateco: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* RAPPRESENTANTE LEGALE */}
      <div>
        <h4 className={sectionClass}>Rappresentante Legale</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Cognome</label>
              <input type="text" value={formData.rappresentante_legale_cognome} onChange={(e) => setFormData({ ...formData, rappresentante_legale_cognome: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nome</label>
              <input type="text" value={formData.rappresentante_legale_nome} onChange={(e) => setFormData({ ...formData, rappresentante_legale_nome: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Codice Fiscale</label>
            <input type="text" value={formData.rappresentante_legale_cf} onChange={(e) => setFormData({ ...formData, rappresentante_legale_cf: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Data Nascita</label>
              <input type="date" value={formData.rappresentante_legale_data_nascita} onChange={(e) => setFormData({ ...formData, rappresentante_legale_data_nascita: e.target.value })} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} onBlur={(e) => e.stopPropagation()} className={`${inputClass} relative z-[100]`} />
            </div>
            <div>
              <label className={labelClass}>Luogo Nascita</label>
              <input type="text" value={formData.rappresentante_legale_luogo_nascita} onChange={(e) => setFormData({ ...formData, rappresentante_legale_luogo_nascita: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* RESIDENZA RAPPRESENTANTE */}
      <div>
        <h4 className={sectionClass}>Residenza Rappresentante</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className={labelClass}>Via</label>
              <input type="text" value={formData.rappresentante_legale_residenza_via} onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_via: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Civico</label>
              <input type="text" value={formData.rappresentante_legale_residenza_civico} onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_civico: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>CAP</label>
              <input type="text" value={formData.rappresentante_legale_residenza_cap} onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_cap: e.target.value })} className={inputClass} maxLength={5} />
            </div>
            <div>
              <label className={labelClass}>Comune</label>
              <input type="text" value={formData.rappresentante_legale_residenza_comune} onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_comune: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Provincia</label>
              <input type="text" value={formData.rappresentante_legale_residenza_provincia} onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_provincia: e.target.value.toUpperCase() })} className={inputClass} maxLength={2} />
            </div>
          </div>
        </div>
      </div>

      {/* DATI ECONOMICI */}
      <div>
        <h4 className={sectionClass}>Dati Economici</h4>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Capitale Sociale (€)</label>
              <input type="number" step="0.01" value={formData.capitale_sociale} onChange={(e) => setFormData({ ...formData, capitale_sociale: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Numero Addetti</label>
              <input type="number" value={formData.numero_addetti} onChange={(e) => setFormData({ ...formData, numero_addetti: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Sito Web</label>
            <input type="url" value={formData.sito_web} onChange={(e) => setFormData({ ...formData, sito_web: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Data Iscrizione RI</label>
            <input type="date" value={formData.data_iscrizione_ri} onChange={(e) => setFormData({ ...formData, data_iscrizione_ri: e.target.value })} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} onBlur={(e) => e.stopPropagation()} className={`${inputClass} relative z-[100]`} />
          </div>
        </div>
      </div>

      {/* PULSANTI */}
      <div className="flex gap-2 pt-2 border-t border-[#14b8a6]/20">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1 text-xs border-[#14b8a6]/30 text-[#e8fbff]/70 hover:bg-[#14b8a6]/10">
          Annulla
        </Button>
        <Button type="submit" size="sm" disabled={saving} className="flex-1 text-xs bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white">
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Salva
        </Button>
      </div>
    </form>
  );
}

/**
 * Tab Posteggi con NUOVO LAYOUT:
 * - Mappa rettangolare in alto (full width)
 * - Sotto: Lista posteggi a sinistra (con scroll) + Scheda impresa a destra
 */
function PosteggiTab({ marketId, marketCode, marketCenter, stalls, setStalls, allMarkets, viewMode, setViewMode, viewTrigger, setViewTrigger }: { marketId: number; marketCode: string; marketCenter: [number, number]; stalls: Stall[]; setStalls: React.Dispatch<React.SetStateAction<Stall[]>>; allMarkets: Market[]; viewMode: 'italia' | 'mercato'; setViewMode: React.Dispatch<React.SetStateAction<'italia' | 'mercato'>>; viewTrigger: number; setViewTrigger: React.Dispatch<React.SetStateAction<number>> }) {
  const [mapData, setMapData] = useState<MarketMapData | null>(null);
  const [concessionsByStallId, setConcessionsByStallId] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Stall>>({});
  const [selectedStallId, setSelectedStallId] = useState<number | null>(null);
  const [selectedStallCenter, setSelectedStallCenter] = useState<[number, number] | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [isSpuntaMode, setIsSpuntaMode] = useState(false);
  const [isOccupaMode, setIsOccupaMode] = useState(false);
  const [isLiberaMode, setIsLiberaMode] = useState(false);
  const updateStallStatus = trpc.dmsHub.stalls.updateStatus.useMutation();
  const [isAnimating, setIsAnimating] = useState(false); // Animazione in corso
  const stopAnimationRef = React.useRef(false); // Flag per fermare l'animazione
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<CompanyRow | null>(null);
  const [showConcessionDetailModal, setShowConcessionDetailModal] = useState(false);
  const [selectedConcessionForModal, setSelectedConcessionForModal] = useState<any>(null);
  const [sidebarView, setSidebarView] = useState<'impresa' | 'concessione' | 'domanda_spunta'>('impresa');
  const [sidebarConcessionData, setSidebarConcessionData] = useState<any>(null);
  const [sidebarDomandaSpuntaData, setSidebarDomandaSpuntaData] = useState<any>(null);
  const [sidebarCompanyData, setSidebarCompanyData] = useState<any>(null);
  const [sidebarCompanyLoading, setSidebarCompanyLoading] = useState(false);
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Nuovi state per presenze e graduatoria (integrazione lista unificata)
  const [presenze, setPresenze] = useState<any[]>([]);
  const [graduatoria, setGraduatoria] = useState<any[]>([]);
  const [spuntisti, setSpuntisti] = useState<any[]>([]);
  const [listFilter, setListFilter] = useState<'concessionari' | 'spunta' | 'fiere'>('concessionari');
  const [showPresenzePopup, setShowPresenzePopup] = useState(false);
  const [selectedSpuntistaForPresenze, setSelectedSpuntistaForPresenze] = useState<any>(null);
  const [selectedSpuntistaForDetail, setSelectedSpuntistaForDetail] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [marketId]);

  // Carica dati concessione quando viene selezionato un posteggio con concessione
  useEffect(() => {
    const loadConcessionData = async () => {
      const stall = stalls.find(s => s.id === selectedStallId);
      if (stall?.concession_id) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/concessions/${stall.concession_id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setSidebarConcessionData(data.data);
            }
          }
        } catch (error) {
          console.error('Error loading concession:', error);
        }
      } else {
        setSidebarConcessionData(null);
      }
    };
    if (selectedStallId) {
      loadConcessionData();
    }
  }, [selectedStallId, stalls]);

  // Carica dati domanda spunta quando viene selezionato un posteggio con spuntista
  useEffect(() => {
    const loadDomandaSpuntaData = async () => {
      const stall = stalls.find(s => s.id === selectedStallId);
      if (stall?.spuntista_impresa_id) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/domande-spunta?impresa_id=${stall.spuntista_impresa_id}&mercato_id=${marketId}`
          );
          if (response.ok) {
            const data = await response.json();
            const domande = data.data || data;
            const domandaApprovata = Array.isArray(domande)
              ? domande.find((d: any) => d.stato === 'APPROVATA') || domande[0]
              : domande;
            setSidebarDomandaSpuntaData(domandaApprovata || null);
          }
        } catch (error) {
          console.error('Error loading domanda spunta:', error);
        }
      } else {
        setSidebarDomandaSpuntaData(null);
      }
    };
    if (selectedStallId) {
      loadDomandaSpuntaData();
    }
  }, [selectedStallId, stalls]);

  // Carica dati impresa quando viene selezionato un posteggio
  useEffect(() => {
    const loadCompanyData = async () => {
      const stall = stalls.find(s => s.id === selectedStallId);
      const companyId = stall?.impresa_id || stall?.vendor_id || stall?.spuntista_impresa_id || concessionsByStallId[stall?.number || '']?.companyId;
      
      if (companyId) {
        setSidebarCompanyLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/imprese/${companyId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setSidebarCompanyData({
                id: data.data.id,
                code: data.data.codice_fiscale || data.data.code,
                denominazione: data.data.denominazione,
                partita_iva: data.data.partita_iva,
                referente: data.data.referente || data.data.email,
                telefono: data.data.telefono,
                stato: data.data.stato || 'active',
                ...data.data
              });
            }
          }
        } catch (error) {
          console.error('Error loading company:', error);
        } finally {
          setSidebarCompanyLoading(false);
        }
      } else {
        setSidebarCompanyData(null);
      }
    };
    if (selectedStallId) {
      loadCompanyData();
    } else {
      setSidebarCompanyData(null);
    }
  }, [selectedStallId, stalls, concessionsByStallId]);

  // Carica dati impresa e domanda spunta quando si clicca su uno spuntista dalla lista Spunta
  useEffect(() => {
    const loadSpuntistaDetail = async () => {
      if (!selectedSpuntistaForDetail) return;
      const impresaId = selectedSpuntistaForDetail.impresa_id;
      if (!impresaId) return;

      // Resetta selectedStallId per evitare conflitti
      setSelectedStallId(null);
      setSelectedStallCenter(null);

      // Carica impresa
      setSidebarCompanyLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/imprese/${impresaId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSidebarCompanyData({
              id: data.data.id,
              code: data.data.codice_fiscale || data.data.code,
              denominazione: data.data.denominazione,
              partita_iva: data.data.partita_iva,
              referente: data.data.referente || data.data.email,
              telefono: data.data.telefono,
              stato: data.data.stato || 'active',
              ...data.data
            });
          }
        }
      } catch (error) {
        console.error('Error loading spuntista company:', error);
      } finally {
        setSidebarCompanyLoading(false);
      }

      // Carica domanda spunta
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/domande-spunta?impresa_id=${impresaId}&mercato_id=${marketId}`
        );
        if (response.ok) {
          const data = await response.json();
          const domande = data.data || data;
          const domandaApprovata = Array.isArray(domande)
            ? domande.find((d: any) => d.stato === 'APPROVATA') || domande[0]
            : domande;
          setSidebarDomandaSpuntaData(domandaApprovata || null);
        }
      } catch (error) {
        console.error('Error loading spuntista domanda spunta:', error);
      }

      // Imposta vista domanda spunta di default
      setSidebarView('impresa');
    };
    loadSpuntistaDetail();
  }, [selectedSpuntistaForDetail]);

  const fetchData = async () => {
    try {
      const [stallsRes, mapRes, concessionsRes, presenzeRes, graduatoriaRes, spuntistiRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/markets/${marketId}/stalls`),
        fetch(`${API_BASE_URL}/api/gis/market-map/${marketId}`),
        fetch(`${API_BASE_URL}/api/markets/${marketId}/concessions`),
        fetch(`${API_BASE_URL}/api/presenze/mercato/${marketId}`).catch(() => ({ json: () => ({ success: false }) })),
        fetch(`${API_BASE_URL}/api/graduatoria/mercato/${marketId}`).catch(() => ({ json: () => ({ success: false }) })),
        fetch(`${API_BASE_URL}/api/spuntisti/mercato/${marketId}`).catch(() => ({ json: () => ({ success: false }) }))
      ]);

      const stallsData = await stallsRes.json();
      const mapDataRes = await mapRes.json();
      const concessionsData = await concessionsRes.json();
      const spuntistiData = await spuntistiRes.json();
      const presenzeData = await presenzeRes.json();
      const graduatoriaData = await graduatoriaRes.json();

      if (stallsData.success) {
        // Normalizza gli stati: il DB potrebbe restituire inglese (free/occupied/reserved)
        // ma il frontend usa italiano (libero/occupato/riservato)
        const normalizedStalls = stallsData.data.map((s: Stall) => ({
          ...s,
          number: String(s.number), // L'API può restituire number come intero — forza stringa
          status: normalizeStallStatus(s.status)
        }));
        setStalls(normalizedStalls);
      }
      if (mapDataRes.success) {
        setMapData(mapDataRes.data);
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
      }
      // Carica presenze e graduatoria - RESET se non ci sono dati
      if (presenzeData.success && Array.isArray(presenzeData.data)) {
        setPresenze(presenzeData.data);
      } else {
        setPresenze([]);
      }
      if (graduatoriaData.success && Array.isArray(graduatoriaData.data)) {
        setGraduatoria(graduatoriaData.data);
      } else {
        setGraduatoria([]);
      }
      // Carica spuntisti da endpoint /api/spuntisti/mercato/:id (già arricchito con dati impresa e wallet)
      const spuntistiArray = spuntistiData.data || spuntistiData;
      if (Array.isArray(spuntistiArray) && spuntistiArray.length > 0) {
        // L'endpoint già restituisce i dati arricchiti, ordina per presenze (posizione_graduatoria)
        const spuntistiOrdinati = spuntistiArray.sort((a: any, b: any) => 
          (a.posizione_graduatoria || 999) - (b.posizione_graduatoria || 999)
        );
        setSpuntisti(spuntistiOrdinati);
      } else {
        setSpuntisti([]);
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
        toast.success('Posteggio aggiornato con successo');
        await fetchData(); // Ricarica dati
        setMapRefreshKey(prev => prev + 1);
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
  // Esteso per calcolare importo e addebitare wallet
  const handleConfirmAssignment = async (stallId: number, impresaId?: number, walletId?: number) => {
    try {
      // Se siamo in modalità spunta, usa l'endpoint dedicato
      if (isSpuntaMode) {
        // Aggiorna stato locale IMMEDIATAMENTE per feedback visivo
        setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'occupato' } : s));
        setSelectedStallId(null);
        setSelectedStallCenter(null);

        try {
          const response = await fetch(`${API_BASE_URL}/api/test-mercato/assegna-posteggio-spunta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ market_id: marketId, stall_id: stallId }),
          });

          const data = await response.json();
          if (data.success) {
            if (data.no_spuntisti) {
              toast.info(
                `📭 Posteggio ${data.data.stall_number} - Nessuno spuntista disponibile\nStato: LIBERO`,
                { duration: 2000 }
              );
              setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'libero' } : s));
              return;
            }

            const spuntista = data.data.spuntista;
            const costo = data.data.costo_posteggio;
            const nuovoSaldo = data.data.nuovo_saldo_wallet;

            toast.success(
              `🎯 Posteggio ${data.data.stall_number} assegnato a ${spuntista.impresa_name}\n` +
              `💰 Costo: ${costo.toFixed(2)}€ | Saldo: ${nuovoSaldo}€\n` +
              `📊 Presenze: ${spuntista.nuove_presenze_totali}`,
              { duration: 4000 }
            );

            setStalls(prev => prev.map(s =>
              s.id === stallId ? {
                ...s,
                status: 'occupato',
                spuntista_impresa_id: spuntista.impresa_id,
                spuntista_nome: spuntista.impresa_name
              } : s
            ));

            await fetchData();
          } else {
            console.warn('API assegna-posteggio-spunta risposta non success:', data);
            toast.success('Posteggio assegnato (solo locale)');
          }
        } catch (apiError) {
          console.warn('API assegna-posteggio-spunta non raggiungibile:', apiError);
          toast.success('Posteggio assegnato (solo locale)');
        }
        return;
      }
      
      // Modalità normale (non spunta): aggiorna stato locale IMMEDIATAMENTE
      setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'occupato' } : s));
      setSelectedStallId(null);
      setSelectedStallCenter(null);

      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'occupato' }),
      });

      const data = await response.json();
      if (data.success) {
        // Se abbiamo impresa e wallet, registra presenza con calcolo importo
        if (impresaId && walletId) {
          try {
            const presenzaResponse = await fetch(`${API_BASE_URL}/api/presenze/registra`, {
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
            
            const presenzaData = await presenzaResponse.json();
            if (presenzaData.success) {
              toast.success(`Presenza registrata - ${presenzaData.data.importo_addebitato?.toFixed(2) || '0.00'}€ addebitati`);
            } else {
              console.warn('[WARN] Presenza non registrata:', presenzaData.error);
              toast.success('Posteggio assegnato (presenza non registrata)');
            }
          } catch (presenzaError) {
            console.warn('[WARN] Errore registrazione presenza:', presenzaError);
            toast.success('Posteggio assegnato (presenza non registrata)');
          }
        } else {
          toast.success('Posteggio assegnato con successo!');
        }
        
        // Aggiorna SOLO lo stato locale per evitare reload mappa
        setStalls(prevStalls => 
          prevStalls.map(s => 
            s.id === stallId ? { ...s, status: 'occupato' } : s
          )
        );
        
        // Deseleziona il posteggio per fermare il lampeggiamento e chiudere il popup
        setSelectedStallId(null);
        setSelectedStallCenter(null);
      } else {
        toast.error('Errore nell\'assegnazione del posteggio');
      }
    } catch (error) {
      console.error('[ERROR handleConfirmAssignment]:', error);
      toast.error('Errore durante l\'assegnazione del posteggio');
      throw error; // Rilancia l'errore per gestirlo nel popup
    }
  };

  // Occupa un posteggio libero (registra arrivo/presenza)
  const handleOccupaStall = async (stallId: number, impresaId?: number, walletId?: number) => {
    // Aggiorna stato locale IMMEDIATAMENTE per feedback visivo
    setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'occupato' } : s));
    setSelectedStallId(null);
    setSelectedStallCenter(null);

    try {
      // 1. Aggiorna stato posteggio a occupato via API
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'occupato' }),
      });

      const data = await response.json();
      if (data.success) {
        // 2. Registra presenza (arrivo) se abbiamo impresa e wallet
        if (impresaId && walletId) {
          try {
            const presenzaResponse = await fetch(`${API_BASE_URL}/api/presenze/registra`, {
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

            const presenzaData = await presenzaResponse.json();
            if (presenzaData.success) {
              toast.success(`Arrivo registrato - ${presenzaData.data.importo_addebitato?.toFixed(2) || '0.00'}€`);
            } else {
              toast.success('Posteggio occupato (presenza non registrata)');
            }
          } catch (presenzaError) {
            console.warn('[WARN] Errore registrazione presenza:', presenzaError);
            toast.success('Posteggio occupato (presenza non registrata)');
          }
        } else {
          toast.success('Posteggio occupato!');
        }

        // Ricarica dati per sincronizzare lista completa
        await fetchData();
      } else {
        console.warn('[WARN] API occupazione fallita, stato locale gia aggiornato');
        toast.success('Posteggio occupato (solo locale)');
      }
    } catch (error) {
      console.error('[ERROR handleOccupaStall]:', error);
      toast.error('Errore API, ma il posteggio e\' stato aggiornato localmente');
      throw error;
    }
  };

  // Libera un posteggio occupato (registra uscita)
  const handleLiberaStall = async (stallId: number) => {
    // Aggiorna stato locale IMMEDIATAMENTE per feedback visivo
    setStalls(prev => prev.map(s => s.id === stallId ? { ...s, status: 'libero' } : s));
    setSelectedStallId(null);
    setSelectedStallCenter(null);

    try {
      // 1. Aggiorna stato posteggio a libero via API
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'libero' }),
      });

      const data = await response.json();
      if (data.success) {
        // 2. Registra uscita (aggiorna presenza esistente)
        try {
          const uscitaResponse = await fetch(`${API_BASE_URL}/api/presenze/registra-uscita`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              market_id: marketId,
              stall_id: stallId,
              giorno_mercato: new Date().toISOString().split('T')[0]
            })
          });

          const uscitaData = await uscitaResponse.json();
          if (uscitaData.success) {
            toast.success('Uscita registrata!');
          } else {
            toast.success('Posteggio liberato (uscita non registrata)');
          }
        } catch (uscitaError) {
          console.warn('[WARN] Errore registrazione uscita:', uscitaError);
          toast.success('Posteggio liberato (uscita non registrata)');
        }

        // Ricarica dati per sincronizzare lista completa
        await fetchData();
      } else {
        console.warn('[WARN] API liberazione fallita, stato locale gia aggiornato');
        toast.success('Posteggio liberato (solo locale)');
      }
    } catch (error) {
      console.error('[ERROR handleLiberaStall]:', error);
      toast.error('Errore API, ma il posteggio e\' stato aggiornato localmente');
      throw error;
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleRowClick = (stall: Stall) => {
    // Se clicco la stessa riga già selezionata, resetta e torna alla vista mercato originale
    if (selectedStallId === stall.id) {
      setSelectedStallId(null);
      setSelectedStallCenter(null);
      // Torna alla vista mercato (zoom out)
      setViewMode('mercato');
      setViewTrigger(prev => prev + 1);
      return;
    }
    
    setSelectedStallId(stall.id);
    
    // Trova il posteggio nella mappa tramite gis_slot_id
    const mapFeature = mapData?.stalls_geojson.features.find(
      f => String(f.properties.number) === String(stall.number)
    );
    
    if (mapFeature && mapFeature.geometry.type === 'Polygon') {
      // Calcola il centro del poligono
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

  // Crea una mappa per lookup veloce stall by number
  const stallsByNumber = new Map(stalls.map(s => [s.number, s]));

  // Trova il posteggio selezionato
  const selectedStall = stalls.find(s => s.id === selectedStallId) || null;

  return (
    <div className="space-y-4">
      {/* Statistiche Posteggi - Con Pulsanti Azione */}
      <div className="grid grid-cols-3 gap-4">
        {/* Indicatore OCCUPATI - Pulsante Occupa (per occupare i liberi) */}
        <div className={`bg-[#ef4444]/10 border p-4 rounded-lg relative ${
          isOccupaMode ? 'border-[#ef4444] ring-2 ring-[#ef4444]/50' : 'border-[#ef4444]/30'
        }`}>
          <div className="text-sm text-[#ef4444] mb-1">Occupati</div>
          <div className="text-3xl font-bold text-[#ef4444]">{occupiedCount}</div>
          <Button
            size="sm"
            variant={isOccupaMode ? "default" : "outline"}
            className={`absolute top-2 right-2 text-xs ${
              isOccupaMode 
                ? 'bg-[#ef4444] hover:bg-[#ef4444]/80 text-white border-[#ef4444]' 
                : 'bg-transparent hover:bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/50'
            }`}
            onClick={() => {
              setIsOccupaMode(!isOccupaMode);
              setIsLiberaMode(false);
              setIsSpuntaMode(false);
            }}
          >
            ✅ Occupa
          </Button>
        </div>
        
        {/* Indicatore LIBERI - Pulsante Libera (per liberare gli occupati) */}
        <div className={`bg-[#10b981]/10 border p-4 rounded-lg relative ${
          isLiberaMode ? 'border-[#10b981] ring-2 ring-[#10b981]/50' : 'border-[#10b981]/30'
        }`}>
          <div className="text-sm text-[#10b981] mb-1">Liberi</div>
          <div className="text-3xl font-bold text-[#10b981]">{freeCount}</div>
          <Button
            size="sm"
            variant={isLiberaMode ? "default" : "outline"}
            className={`absolute top-2 right-2 text-xs ${
              isLiberaMode 
                ? 'bg-[#10b981] hover:bg-[#10b981]/80 text-white border-[#10b981]' 
                : 'bg-transparent hover:bg-[#10b981]/20 text-[#10b981] border-[#10b981]/50'
            }`}
            onClick={() => {
              setIsLiberaMode(!isLiberaMode);
              setIsOccupaMode(false);
              setIsSpuntaMode(false);
            }}
          >
            🚮 Libera
          </Button>
        </div>
        
        {/* Indicatore RISERVATI - Due Pulsanti: Prepara Spunta + Spunta */}
        <div className={`bg-[#f59e0b]/10 border p-4 rounded-lg relative ${
          isSpuntaMode ? 'border-[#f59e0b] ring-2 ring-[#f59e0b]/50' : 'border-[#f59e0b]/30'
        }`}>
          <div className="text-sm text-[#f59e0b] mb-1">Riservati</div>
          <div className="text-3xl font-bold text-[#f59e0b]">{reservedCount}</div>
          <div className="absolute top-2 right-2 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs bg-transparent hover:bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/50"
              onClick={async () => {
                // Se animazione in corso, ferma
                if (isAnimating) {
                  stopAnimationRef.current = true;
                  toast.info('Animazione fermata!');
                  return;
                }

                // Prepara Spunta: chiama endpoint backend che:
                // 1. Mette posteggi liberi in stato 'riservato'
                // 2. Registra presenza per tutti gli spuntisti con giorno/orario
                const freeStalls = stalls.filter(s => s.status === 'libero');
                if (freeStalls.length === 0) {
                  toast.info('Nessun posteggio libero da preparare per la spunta');
                  return;
                }
                const confirmed = window.confirm(
                  `Preparare ${freeStalls.length} posteggi liberi per la spunta?\n\nTutti i posteggi liberi diventeranno riservati (arancioni) e verrà registrata la presenza per tutti gli spuntisti con data e orario corrente.`
                );
                if (!confirmed) return;
                
                try {
                  setIsAnimating(true);

                  // Aggiorna stato locale IMMEDIATAMENTE: tutti i liberi → riservato
                  setStalls(prev => prev.map(s =>
                    s.status === 'libero' || s.status === 'free'
                      ? { ...s, status: 'riservato' }
                      : s
                  ));
                  setIsSpuntaMode(true);
                  setIsOccupaMode(false);
                  setIsLiberaMode(false);

                  // Chiama endpoint avvia-spunta in background
                  try {
                    const response = await fetch(`${API_BASE_URL}/api/test-mercato/avvia-spunta`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ market_id: marketId }),
                    });

                    const data = await response.json();
                    if (data.success) {
                      toast.success(`🏁 ${data.message}`);
                    } else {
                      console.warn('API avvia-spunta risposta non success:', data);
                      toast.success('Posteggi preparati per la spunta (solo locale)');
                    }
                  } catch (apiError) {
                    console.warn('API avvia-spunta non raggiungibile, stato locale aggiornato:', apiError);
                    toast.success('Posteggi preparati per la spunta (solo locale)');
                  }

                  await fetchData();
                  setIsAnimating(false);
                } catch (error) {
                  console.error('Errore preparazione spunta:', error);
                  toast.error('Errore durante la preparazione della spunta');
                  setIsAnimating(false);
                }
              }}
            >
              {isAnimating ? '⏹ STOP' : '🟠 Prepara'}
            </Button>
            <Button
              size="sm"
              variant={isSpuntaMode ? "default" : "outline"}
              className={`text-xs ${
                isSpuntaMode 
                  ? 'bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white border-[#f59e0b]' 
                  : 'bg-transparent hover:bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/50'
              }`}
              onClick={() => {
                setIsSpuntaMode(!isSpuntaMode);
                setIsOccupaMode(false);
                setIsLiberaMode(false);
              }}
            >
              ✓ Spunta
            </Button>
          </div>
        </div>
      </div>

      {/* Barra LIBERA TUTTI (modalità Libera) */}
      {isLiberaMode && (
        <div className="mb-4">
          <Button
            className={`w-full font-semibold py-3 border-2 ${
              isAnimating 
                ? 'bg-gray-600 hover:bg-gray-500 border-gray-500 text-white' 
                : 'bg-[#10b981] hover:bg-[#10b981]/80 border-[#10b981]/50 text-white'
            }`}
            onClick={async () => {
              // Se animazione in corso, ferma
              if (isAnimating) {
                stopAnimationRef.current = true;
                toast.info('Animazione fermata!');
                return;
              }
              
              const occupiedStalls = stalls.filter(s => s.status === 'occupato');
              if (occupiedStalls.length === 0) {
                toast.info('Nessun posteggio occupato da liberare');
                return;
              }
              
              const confirmed = window.confirm(
                `Liberare ${occupiedStalls.length} posteggi occupati?\n\n` +
                `Tutti i posteggi occupati diventeranno liberi e verrà registrata l'uscita.\n\nPuoi cliccare STOP per fermare l'animazione.`
              );
              
              if (!confirmed) return;
              
              try {
                setIsAnimating(true);
                stopAnimationRef.current = false;
                let successCount = 0;
                let errorCount = 0;
                
                for (const stall of occupiedStalls) {
                  // Controlla se l'utente ha cliccato STOP
                  if (stopAnimationRef.current) {
                    toast.info(`Animazione fermata dopo ${successCount} posteggi`);
                    break;
                  }
                  try {
                    await handleLiberaStall(stall.id);
                    successCount++;
                  } catch (error) {
                    console.error(`Errore liberazione posteggio ${stall.number}:`, error);
                    errorCount++;
                  }
                }
                
                if (successCount > 0 && !stopAnimationRef.current) {
                  toast.success(`${successCount} posteggi liberati con successo!`);
                }
                if (errorCount > 0) {
                  toast.error(`${errorCount} posteggi non liberati`);
                }
                
                await fetchData();
                // Non resettare la mappa per mantenere zoom/posizione
                setIsAnimating(false);
                if (!stopAnimationRef.current) {
                  setIsLiberaMode(false);
                }
              } catch (error) {
                console.error('Errore liberazione posteggi:', error);
                toast.error('Errore durante la liberazione dei posteggi');
                setIsAnimating(false);
              }
            }}
          >
            {isAnimating ? '⏹ STOP' : `🚮 Libera Tutti (${occupiedCount} posteggi)`}
          </Button>
        </div>
      )}

      {/* Barra OCCUPA TUTTI (modalità Occupa) */}
      {isOccupaMode && (
        <div className="mb-4 space-y-2">
          {/* Pulsante INIZIA MERCATO - Azzera presenze del giorno */}
          <Button
            className="w-full font-semibold py-2 border-2 bg-[#3b82f6] hover:bg-[#3b82f6]/80 border-[#3b82f6]/50 text-white"
            onClick={async () => {
              const confirmed = window.confirm(
                `🚀 Iniziare la giornata mercato?\n\n` +
                `Questa azione:\n` +
                `• Azzererà tutte le presenze del giorno (concessionari + spuntisti)\n` +
                `• Reset pulito per iniziare la giornata\n\n` +
                `Usare solo all'inizio della giornata!`
              );
              
              if (!confirmed) return;
              
              try {
                const response = await fetch(`${API_BASE_URL}/api/test-mercato/inizia-mercato`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ market_id: marketId }),
                });

                const data = await response.json();
                if (data.success) {
                  toast.success(`🚀 ${data.message}`);
                } else {
                  toast.error(data.error || 'Errore durante l\'inizializzazione mercato');
                }
                
                await fetchData();
              } catch (error) {
                console.error('Errore inizia mercato:', error);
                toast.error('Errore durante l\'inizializzazione del mercato');
              }
            }}
          >
            🚀 Inizia Mercato (Azzera Presenze)
          </Button>
          
          {/* Pulsante OCCUPA TUTTI esistente */}
          <Button
            className={`w-full font-semibold py-3 border-2 ${
              isAnimating 
                ? 'bg-gray-600 hover:bg-gray-500 border-gray-500 text-white' 
                : 'bg-[#ef4444] hover:bg-[#ef4444]/80 border-[#ef4444]/50 text-white'
            }`}
            onClick={async () => {
              // Se animazione in corso, ferma
              if (isAnimating) {
                stopAnimationRef.current = true;
                toast.info('Animazione fermata!');
                return;
              }
              
              const freeStalls = stalls.filter(s => s.status === 'libero');
              if (freeStalls.length === 0) {
                toast.info('Nessun posteggio libero da occupare');
                return;
              }
              
              const confirmed = window.confirm(
                `Occupare ${freeStalls.length} posteggi liberi?\n\n` +
                `Tutti i posteggi liberi diventeranno occupati e verrà registrato l'arrivo.\n\nPuoi cliccare STOP per fermare l'animazione.`
              );
              
              if (!confirmed) return;
              
              try {
                setIsAnimating(true);
                stopAnimationRef.current = false;
                let successCount = 0;
                let errorCount = 0;
                
                for (const stall of freeStalls) {
                  // Controlla se l'utente ha cliccato STOP
                  if (stopAnimationRef.current) {
                    toast.info(`Animazione fermata dopo ${successCount} posteggi`);
                    break;
                  }
                  try {
                    await handleOccupaStall(stall.id, stall.impresa_id || undefined, stall.wallet_id || undefined);
                    successCount++;
                  } catch (error) {
                    console.error(`Errore occupazione posteggio ${stall.number}:`, error);
                    errorCount++;
                  }
                }
                
                if (successCount > 0 && !stopAnimationRef.current) {
                  toast.success(`${successCount} posteggi occupati con successo!`);
                }
                if (errorCount > 0) {
                  toast.error(`${errorCount} posteggi non occupati`);
                }
                
                await fetchData();
                // Non resettare la mappa per mantenere zoom/posizione
                setIsAnimating(false);
                if (!stopAnimationRef.current) {
                  setIsOccupaMode(false);
                }
              } catch (error) {
                console.error('Errore occupazione posteggi:', error);
                toast.error('Errore durante l\'occupazione dei posteggi');
                setIsAnimating(false);
              }
            }}
          >
            {isAnimating ? '⏹ STOP' : `✅ Occupa Tutti (${freeCount} posteggi)`}
          </Button>
        </div>
      )}

      {/* Barra CONFERMA ASSEGNAZIONE (modalità Spunta) */}
      {isSpuntaMode && (
        <div className="mb-4">
          <Button
            className={`w-full font-semibold py-3 border-2 ${
              isAnimating 
                ? 'bg-gray-600 hover:bg-gray-500 border-gray-500 text-white' 
                : 'bg-[#f59e0b] hover:bg-[#f59e0b]/80 border-[#f59e0b]/50 text-white'
            }`}
            onClick={async () => {
              // Se animazione in corso, ferma
              if (isAnimating) {
                stopAnimationRef.current = true;
                toast.info('Animazione fermata!');
                return;
              }
              
              const reservedStalls = stalls.filter(s => s.status === 'riservato');
              if (reservedStalls.length === 0) {
                toast.info('Nessun posteggio riservato da confermare');
                return;
              }
              
              const confirmed = window.confirm(
                `Confermare l'assegnazione di ${reservedStalls.length} posteggi riservati?\n\n` +
                `Tutti i posteggi riservati diventeranno occupati.\n\nPuoi cliccare STOP per fermare l'animazione.`
              );
              
              if (!confirmed) return;
              
              try {
                setIsAnimating(true);
                stopAnimationRef.current = false;
                let successCount = 0;
                let errorCount = 0;
                
                for (const stall of reservedStalls) {
                  // Controlla se l'utente ha cliccato STOP
                  if (stopAnimationRef.current) {
                    toast.info(`Animazione fermata dopo ${successCount} posteggi`);
                    break;
                  }
                  try {
                    await handleConfirmAssignment(stall.id);
                    successCount++;
                  } catch (error) {
                    console.error(`Errore conferma posteggio ${stall.number}:`, error);
                    errorCount++;
                  }
                }
                
                if (successCount > 0 && !stopAnimationRef.current) {
                  toast.success(`${successCount} posteggi confermati con successo!`);
                }
                if (errorCount > 0) {
                  toast.error(`${errorCount} posteggi non confermati`);
                }
                
                // Ricarica dati
                await fetchData();
                // Non resettare la mappa per mantenere zoom/posizione
                setIsAnimating(false);
                if (!stopAnimationRef.current) {
                  setIsSpuntaMode(false);
                }
              } catch (error) {
                console.error('Errore conferma assegnazioni:', error);
                toast.error('Errore durante la conferma delle assegnazioni');
                setIsAnimating(false);
              }
            }}
          >
            {isAnimating ? '⏹ STOP' : `✓ Conferma Assegnazione (${reservedCount} posteggi)`}
          </Button>
          
          {/* Pulsante Registra Deposito Rifiuti - registra orario deposito spazzatura per TUTTI */}
          <Button
            className="w-full mt-2 font-semibold py-2 border-2 bg-[#22c55e] hover:bg-[#22c55e]/80 border-[#22c55e]/50 text-white"
            onClick={async () => {
              const confirmed = window.confirm(
                `Registrare il deposito rifiuti?\n\n` +
                `Questa azione registrerà l'orario di deposito spazzatura per tutte le presenze del giorno.`
              );
              
              if (!confirmed) return;
              
              try {
                const response = await fetch(`${API_BASE_URL}/api/test-mercato/registra-rifiuti`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ market_id: marketId }),
                });

                const data = await response.json();
                if (data.success) {
                  toast.success(`♻️ ${data.message}`);
                } else {
                  toast.error(data.error || 'Errore durante la registrazione rifiuti');
                }
                
                await fetchData();
              } catch (error) {
                console.error('Errore registrazione rifiuti:', error);
                toast.error('Errore durante la registrazione deposito rifiuti');
              }
            }}
          >
            ♻️ Registra Deposito Rifiuti
          </Button>
          
          {/* Pulsante Chiudi Mercato - registra uscita per TUTTI e libera TUTTI i posteggi */}
          <Button
            className="w-full mt-2 font-semibold py-2 border-2 bg-[#ef4444] hover:bg-[#ef4444]/80 border-[#ef4444]/50 text-white"
            onClick={async () => {
              const confirmed = window.confirm(
                `Chiudere il mercato?\n\n` +
                `Questa azione:\n` +
                `• Registrerà l'orario di uscita per TUTTI (concessionari + spuntisti)\n` +
                `• Libererà TUTTI i posteggi\n` +
                `• Reset completo per il giorno successivo`
              );
              
              if (!confirmed) return;
              
              try {
                const response = await fetch(`${API_BASE_URL}/api/test-mercato/chiudi-mercato`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ market_id: marketId }),
                });

                const data = await response.json();
                if (data.success) {
                  toast.success(`🏪 ${data.message}`);
                  setIsSpuntaMode(false);
                  setIsOccupaMode(false);
                  setIsLiberaMode(false);
                } else {
                  toast.error(data.error || 'Errore durante la chiusura mercato');
                }
                
                await fetchData();
              } catch (error) {
                console.error('Errore chiusura mercato:', error);
                toast.error('Errore durante la chiusura del mercato');
              }
            }}
          >
            🏪 Chiudi Mercato
          </Button>
        </div>
      )}

      {/* NUOVO LAYOUT: Mappa in alto (rettangolare) */}
      <div className={`relative border border-[#14b8a6]/20 rounded-lg overflow-hidden ${isMapExpanded ? 'h-[850px]' : 'h-[700px]'}`}>
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
            number: s.number,  // NON usare parseInt - rompe il lookup sulla mappa!
            status: s.status,
            type: s.type,
            vendor_name: s.vendor_business_name || undefined,
            impresa_id: s.impresa_id || undefined,
            wallet_id: s.wallet_id || undefined, // Per detrazione importo
            dimensions: s.width && s.depth ? `${s.width}x${s.depth}` : undefined
          }));
          return (
            <MarketMapComponent
              refreshKey={mapRefreshKey}
              mapData={mapData as any}  // Passa sempre mapData così i posteggi sono visibili durante l'animazione
              center={viewMode === 'mercato' ? marketCenter : [42.5, 12.5] as [number, number]}
              zoom={viewMode === 'mercato' ? 17 : 6}
              height="100%"
              isSpuntaMode={isSpuntaMode}
              isOccupaMode={isOccupaMode}
              isLiberaMode={isLiberaMode}
              onConfirmAssignment={handleConfirmAssignment}
              onOccupaStall={handleOccupaStall}
              onLiberaStall={handleLiberaStall}
              costPerSqm={allMarkets.find(m => m.id === marketId)?.cost_per_sqm || 0.90}
              onStallClick={(stallNumber) => {
                const dbStall = stallsByNumber.get(String(stallNumber));
                if (dbStall) {
                  setSelectedStallId(dbStall.id);
                  // Scroll alla riga nella lista (solo dentro il container, non la pagina)
                  setTimeout(() => {
                    const row = document.querySelector(`[data-stall-id="${dbStall.id}"]`) as HTMLElement;
                    if (row && listContainerRef.current) {
                      // Calcola la posizione relativa al container
                      const container = listContainerRef.current;
                      const rowTop = row.offsetTop;
                      const containerHeight = container.clientHeight;
                      const rowHeight = row.clientHeight;
                      // Centra la riga nel container
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
              selectedStallCenter={selectedStallCenter || undefined}
              onMarketClick={(clickedMarketId) => {
                // Quando clicchi su un marker, passa a vista mercato e triggera flyTo
                setViewMode('mercato');
                setViewTrigger(prev => prev + 1);
              }}
            />
          );
        })()}
      </div>

      {/* LAYOUT UNIFICATO: Lista posteggi a tutta larghezza */}
      <div className="space-y-4">
        {/* Lista Posteggi con scroll interno */}
        <div className="border border-[#14b8a6]/20 rounded-lg overflow-hidden">
          {/* Header con Tab Filtro */}
          <div className="bg-[#0b1220]/50 px-4 py-2 border-b border-[#14b8a6]/20">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#e8fbff]">Lista Posteggi</h3>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={listFilter === 'concessionari' ? 'default' : 'outline'}
                  className={`text-xs h-7 ${listFilter === 'concessionari' ? 'bg-[#14b8a6] text-white' : 'bg-transparent text-[#e8fbff]/70 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20'}`}
                  onClick={() => setListFilter('concessionari')}
                >
                  Concessionari
                </Button>
                <Button
                  size="sm"
                  variant={listFilter === 'spunta' ? 'default' : 'outline'}
                  className={`text-xs h-7 ${listFilter === 'spunta' ? 'bg-[#f59e0b] text-white' : 'bg-transparent text-[#e8fbff]/70 border-[#f59e0b]/30 hover:bg-[#f59e0b]/20'}`}
                  onClick={() => setListFilter('spunta')}
                >
                  Spunta
                </Button>
                <Button
                  size="sm"
                  variant={listFilter === 'fiere' ? 'default' : 'outline'}
                  className={`text-xs h-7 ${listFilter === 'fiere' ? 'bg-[#8b5cf6] text-white' : 'bg-transparent text-[#e8fbff]/70 border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20'}`}
                  onClick={() => setListFilter('fiere')}
                >
                  Fiere/Straord.
                </Button>
              </div>
            </div>
          </div>
          <div ref={listContainerRef} className="max-h-[400px] overflow-y-auto">
            {/* TABELLA SPUNTISTI - quando tab Spunta è selezionato */}
            {listFilter === 'spunta' ? (
              <Table>
                <TableHeader className="sticky top-0 bg-[#0b1220]/95 z-10">
                  <TableRow className="border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
                    <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '5%'}}>#</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '10%'}}>Stato</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '20%'}}>Impresa</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '10%'}}>Wallet</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '10%'}}>Importo</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '10%'}}>Giorno</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '8%'}}>Accesso</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '8%'}}>Rifiuti</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '8%'}}>Uscita</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs text-center cursor-pointer hover:text-[#14b8a6]" style={{width: '6%'}} title="Clicca per modificare">Pres.</TableHead>
                    <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '5%'}}>Ass.</TableHead>
                    <TableHead className="text-right text-[#e8fbff]/70 text-xs" style={{width: '5%'}}>⚙️</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spuntisti.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-[#e8fbff]/50 py-8">
                        Nessuno spuntista registrato per questo mercato
                      </TableCell>
                    </TableRow>
                  ) : (
                    spuntisti.map((spuntista, index) => {
                      // Trova il posteggio assegnato (se presente)
                      // Cerca per spuntista_impresa_id (campo corretto per spuntisti) o per stall_scelto (numero posteggio)
                      const posteggioAssegnato = stalls.find(s => 
                        s.spuntista_impresa_id === spuntista.impresa_id ||
                        s.vendor_id === spuntista.impresa_id || 
                        s.impresa_id === spuntista.impresa_id ||
                        (spuntista.stall_scelto && String(s.number) === String(spuntista.stall_scelto))
                      );
                      // Trova presenza di oggi
                      const presenzaOggi = presenze.find(p => 
                        p.impresa_id === spuntista.impresa_id
                      );
                      // Determina stato semaforo basato su dati dall'endpoint spuntisti/mercato
                      // Usa stato_presenza e stall_scelto come in PresenzeGraduatoriaPanel
                      const statoPresenza = spuntista.stato_presenza;
                      const stallScelto = spuntista.stall_scelto || posteggioAssegnato?.number;
                      
                      let statoLabel = 'IN ATTESA';
                      let statoColor = 'bg-gray-500/20 text-gray-400'; // Grigio - default
                      
                      if (statoPresenza === 'presente' && stallScelto) {
                        // Verde con numero posteggio - ha scelto posteggio
                        statoLabel = stallScelto;
                        statoColor = 'bg-[#10b981]/20 text-[#10b981]';
                      } else if (statoPresenza === 'rinunciato') {
                        // Arancione - ha fatto presenza ma non ha scelto posteggio
                        statoLabel = 'RINUNCIATO';
                        statoColor = 'bg-[#f59e0b]/20 text-[#f59e0b]';
                      } else if (statoPresenza === 'rinuncia_forzata') {
                        // Rosso - non ci sono più posteggi disponibili
                        statoLabel = 'RINUNCIA';
                        statoColor = 'bg-[#ef4444]/20 text-[#ef4444]';
                      } else if (statoPresenza === 'presente') {
                        // Verde - presente ma non ha ancora scelto
                        statoLabel = 'PRESENTE';
                        statoColor = 'bg-[#10b981]/20 text-[#10b981]';
                      } else {
                        // Grigio - non ancora presente
                        statoLabel = 'IN ATTESA';
                        statoColor = 'bg-gray-500/20 text-gray-400';
                      }
                      
                      return (
                        <TableRow 
                          key={spuntista.impresa_id || index}
                          className={`cursor-pointer hover:bg-[#14b8a6]/10 border-[#14b8a6]/10 ${selectedSpuntistaForDetail?.impresa_id === spuntista.impresa_id ? 'bg-[#14b8a6]/20' : ''}`}
                          onClick={() => {
                            if (selectedSpuntistaForDetail?.impresa_id === spuntista.impresa_id) {
                              // Deseleziona
                              setSelectedSpuntistaForDetail(null);
                              setSidebarCompanyData(null);
                              setSidebarDomandaSpuntaData(null);
                            } else {
                              setSelectedSpuntistaForDetail(spuntista);
                            }
                          }}
                        >
                          {/* # Posizione Graduatoria */}
                          <TableCell className="font-medium text-[#14b8a6] text-sm">{index + 1}</TableCell>
                          
                          {/* Stato Semaforo */}
                          <TableCell>
                            <Badge variant="default" className={`${statoColor} text-xs`}>
                              {statoLabel}
                            </Badge>
                          </TableCell>
                          
                          {/* Impresa (sempre giallo per spuntisti) */}
                          <TableCell className="text-sm">
                            <p className="font-medium text-xs truncate max-w-[150px] text-[#f59e0b]">
                              {spuntista.impresa_nome || spuntista.ragione_sociale || 'N/D'}
                            </p>
                          </TableCell>
                          
                          {/* Wallet - semaforino con saldo */}
                          <TableCell className="text-xs text-center">
                            {(spuntista.wallet_balance !== undefined || spuntista.wallet_saldo !== undefined) ? (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${parseFloat(String(spuntista.wallet_balance || spuntista.wallet_saldo || 0)) > 0 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                                €{parseFloat(String(spuntista.wallet_balance || spuntista.wallet_saldo || 0)).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[#e8fbff]/30">-</span>
                            )}
                          </TableCell>
                          
                          {/* Importo Speso - importo pagato dall'endpoint */}
                          <TableCell className="text-xs text-center">
                            {(spuntista.importo_pagato !== undefined && spuntista.importo_pagato !== null && spuntista.importo_pagato > 0) ? (
                              <span className="text-[#f59e0b] font-medium">€{parseFloat(String(spuntista.importo_pagato)).toFixed(2)}</span>
                            ) : (
                              <span className="text-[#e8fbff]/30">-</span>
                            )}
                          </TableCell>
                          
                          {/* Giorno */}
                          <TableCell className="text-xs text-[#e8fbff]/70">
                            {(() => {
                              const raw = spuntista.giorno_presenza || presenzaOggi?.giorno || presenzaOggi?.data;
                              if (!raw) return '-';
                              const s = String(raw).split('T')[0];
                              const parts = s.split('-');
                              if (parts.length === 3) {
                                const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
                                const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                const wd = !isNaN(dt.getTime()) ? days[dt.getDay()] : '';
                                return `${wd} ${parts[2]}/${parts[1]}`;
                              }
                              return '-';
                            })()}
                          </TableCell>
                          
                          {/* Accesso */}
                          <TableCell className="text-xs text-center text-[#10b981]">
                            {spuntista.orario_arrivo || presenzaOggi?.ora_accesso || presenzaOggi?.checkin || '-'}
                          </TableCell>
                          
                          {/* Rifiuti */}
                          <TableCell className="text-xs text-center text-[#f59e0b]">
                            {spuntista.orario_deposito_rifiuti || presenzaOggi?.ora_rifiuti || '-'}
                          </TableCell>
                          
                          {/* Uscita */}
                          <TableCell className="text-xs text-center text-[#3b82f6]">
                            {spuntista.orario_uscita || presenzaOggi?.ora_uscita || presenzaOggi?.checkout || '-'}
                          </TableCell>
                          
                          {/* Presenze - CLICCABILE per popup */}
                          <TableCell 
                            className="text-xs text-center text-[#e8fbff] cursor-pointer hover:text-[#14b8a6] hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSpuntistaForPresenze(spuntista);
                              setShowPresenzePopup(true);
                            }}
                          >
                            {spuntista.presenze_totali || spuntista.numero_presenze || 0}
                          </TableCell>
                          
                          {/* Assenze */}
                          <TableCell className="text-xs text-center text-[#e8fbff]/50">
                            {spuntista.numero_assenze || 0}
                          </TableCell>
                          
                          {/* Azioni */}
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Apri dettaglio spuntista
                              }}
                              className="hover:bg-[#14b8a6]/20 text-[#14b8a6] h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
            /* TABELLA POSTEGGI - per tab Concessionari e Fiere */
            <Table>
              <TableHeader className="sticky top-0 bg-[#0b1220]/95 z-10">
                <TableRow className="border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
                  <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '5%'}}>N°</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '10%'}}>Stato</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '20%'}}>Impresa</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '10%'}}>Wallet</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '10%'}}>Importo</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs" style={{width: '10%'}}>Giorno</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '8%'}}>Accesso</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '8%'}}>Rifiuti</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '8%'}}>Uscita</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '6%'}}>Pres.</TableHead>
                  <TableHead className="text-[#e8fbff]/70 text-xs text-center" style={{width: '5%'}}>Ass.</TableHead>
                  <TableHead className="text-right text-[#e8fbff]/70 text-xs" style={{width: '5%'}}>⚙️</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...stalls]
                  // Filtra per tipo in base al tab selezionato
                  // Concessionari = solo posteggi che esistono nella mappa (con poligono)
                  // Fiere = solo posteggi straordinari/fiere
                  .filter(stall => {
                    // Prima verifica che il posteggio esista nel GeoJSON della mappa
                    // Converti entrambi a stringa per confronto sicuro
                    const stallNumber = String(stall.number);
                    const existsInMap = mapData?.stalls_geojson?.features?.some(
                      f => String(f.properties.number) === stallNumber
                    ) ?? false;
                    
                    // Se mapData non è ancora caricato, mostra tutti i posteggi temporaneamente
                    if (!mapData?.stalls_geojson?.features) return true;
                    
                    if (listFilter === 'concessionari') return existsInMap; // Solo posteggi con poligono
                    if (listFilter === 'fiere') return existsInMap && (stall.type === 'straordinario' || stall.type === 'fiera');
                    return existsInMap;
                  })
                  .sort((a, b) => {
                  // Ordina alfanumerico naturale: 1, 2, 22, 22A, 22B, 23
                  // String() necessario: l'API può restituire number come intero o stringa
                  return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
                }).map((stall) => {                  // Trova i dati di presenza per questo posteggio
                  const presenzaOggi = presenze.find(p => String(p.stall_number) === String(stall.number) || p.stallId === stall.id);
                  // Cerca graduatoria: prima per posteggio (ID), poi per impresa del concessionario, poi per spuntista
                  let gradRecord = graduatoria.find(g => g.stallId === stall.id || g.stall_id === stall.id);
                  // Se non trovato, cerca per impresa_id del concessionario
                  if (!gradRecord && stall.impresa_id) {
                    gradRecord = graduatoria.find(g => g.impresa_id === stall.impresa_id);
                  }
                  // Se non trovato e c'è uno spuntista assegnato, cerca per impresa_id dello spuntista
                  if (!gradRecord && stall.spuntista_impresa_id) {
                    gradRecord = graduatoria.find(g => g.impresa_id === stall.spuntista_impresa_id);
                  }
                  
                  return (
                  <TableRow 
                    key={stall.id}
                    data-stall-id={stall.id}
                    className={`cursor-pointer hover:bg-[#14b8a6]/10 border-[#14b8a6]/10 ${
                      selectedStallId === stall.id ? 'bg-[#14b8a6]/20' : ''
                    }`}
                    onClick={() => handleRowClick(stall)}
                  >
                    {/* N° Posteggio */}
                    <TableCell className="font-medium text-[#14b8a6] text-sm">{stall.number}</TableCell>
                    
                    {/* Stato */}
                    <TableCell>
                      <Badge variant="default" className={`${getStallStatusClasses(stall.status)} text-xs`}>
                        {getStallStatusLabel(stall.status)}
                      </Badge>
                    </TableCell>
                    
                    {/* Impresa - colore giallo se spuntista assegnato */}
                    <TableCell className="text-sm">
                      {stall.spuntista_nome ? (
                        // Spuntista assegnato - sempre in giallo
                        <p className="font-medium text-xs truncate max-w-[150px] text-[#f59e0b]">
                          🎯 {stall.spuntista_nome}
                        </p>
                      ) : stall.vendor_business_name ? (
                        <p className="font-medium text-xs truncate max-w-[150px] text-[#e8fbff]">
                          {stall.vendor_business_name}
                        </p>
                      ) : concessionsByStallId[stall.number] ? (
                        <p className="font-medium text-xs truncate max-w-[150px] text-[#e8fbff]">
                          {concessionsByStallId[stall.number].companyName}
                        </p>
                      ) : (
                        <span className="text-[#e8fbff]/50 text-xs">-</span>
                      )}
                    </TableCell>
                    
                    {/* Wallet - semaforino con saldo (usa direttamente stall.wallet_balance dall'endpoint stalls) */}
                    <TableCell className="text-xs text-center">
                      {/* Mostra wallet solo se: ha concessionario O ha spuntista assegnato O è occupato */}
                      {(stall.vendor_business_name || stall.spuntista_nome || concessionsByStallId[stall.number] || stall.status === 'occupato') && stall.wallet_balance !== undefined ? (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${parseFloat(stall.wallet_balance || '0') > 0 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
                          €{parseFloat(stall.wallet_balance || '0').toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[#e8fbff]/30">-</span>
                      )}
                    </TableCell>
                    
                    {/* Importo Posteggio - calcolato da area_mq * cost_per_sqm o dalla presenza */}
                    <TableCell className="text-xs text-center">
                      {(() => {
                        // Prima controlla se c'è un importo dalla presenza di oggi
                        if (presenzaOggi?.importo_addebitato || gradRecord?.presenza_importo) {
                          const importo = parseFloat(presenzaOggi?.importo_addebitato || gradRecord?.presenza_importo || '0');
                          return <span className="text-[#f59e0b] font-medium">€{importo.toFixed(2)}</span>;
                        }
                        // Se c'è uno spuntista assegnato, cerca il suo importo
                        if (stall.spuntista_impresa_id) {
                          const spuntistaAssegnato = spuntisti.find(s => s.impresa_id === stall.spuntista_impresa_id);
                          if (spuntistaAssegnato?.importo_pagato) {
                            return <span className="text-[#f59e0b] font-medium">€{parseFloat(String(spuntistaAssegnato.importo_pagato)).toFixed(2)}</span>;
                          }
                        }
                        // Altrimenti calcola l'importo teorico del posteggio
                        const areaMq = parseFloat(stall.area_mq || '0');
                        const costPerSqm = allMarkets.find(m => m.id === marketId)?.cost_per_sqm || 0.90;
                        if (areaMq > 0) {
                          const importoTeorico = areaMq * costPerSqm;
                          return <span className="text-[#e8fbff]/50">€{importoTeorico.toFixed(2)}</span>;
                        }
                        return <span className="text-[#e8fbff]/30">-</span>;
                      })()}
                    </TableCell>
                    
                    {/* Giorno */}
                    <TableCell className="text-xs text-[#e8fbff]/70">
                      {(() => {
                        const raw = presenzaOggi?.giorno || presenzaOggi?.data;
                        if (!raw) return '-';
                        const s = String(raw).split('T')[0];
                        const parts = s.split('-');
                        if (parts.length === 3) {
                          const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
                          const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                          const wd = !isNaN(dt.getTime()) ? days[dt.getDay()] : '';
                          return `${wd} ${parts[2]}/${parts[1]}`;
                        }
                        return '-';
                      })()}
                    </TableCell>
                    
                    {/* Accesso */}
                    <TableCell className="text-xs text-center text-[#10b981]">
                      {presenzaOggi?.ora_accesso || presenzaOggi?.checkin || '-'}
                    </TableCell>
                    
                    {/* Rifiuti */}
                    <TableCell className="text-xs text-center text-[#f59e0b]">
                      {presenzaOggi?.ora_rifiuti || '-'}
                    </TableCell>
                    
                    {/* Uscita */}
                    <TableCell className="text-xs text-center text-[#3b82f6]">
                      {presenzaOggi?.ora_uscita || presenzaOggi?.checkout || '-'}
                    </TableCell>
                    
                    {/* Presenze totali - cliccabile per modificare */}
                    <TableCell 
                      className="text-xs text-center text-[#e8fbff] cursor-pointer hover:text-[#14b8a6] hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Prepara i dati per il popup
                        const concessionario = concessionsByStallId[stall.number];
                        if (concessionario || gradRecord) {
                          setSelectedSpuntistaForPresenze({
                            impresa_id: concessionario?.impresa_id || gradRecord?.impresa_id,
                            impresa_nome: concessionario?.ragione_sociale || stall.vendor_business_name,
                            ragione_sociale: concessionario?.ragione_sociale || stall.vendor_business_name,
                            wallet_id: gradRecord?.wallet_id || concessionario?.wallet_id,
                            presenze_totali: gradRecord?.presenze_totali || 0,
                            data_prima_presenza: gradRecord?.data_prima_presenza
                          });
                          setShowPresenzePopup(true);
                        }
                      }}
                      title="Clicca per modificare le presenze storiche"
                    >
                      {gradRecord?.presenze_totali || gradRecord?.presenze || 0}
                    </TableCell>
                    
                    {/* Assenze */}
                    <TableCell className="text-xs text-center text-[#e8fbff]/50">
                      {gradRecord?.assenze_totali || gradRecord?.assenze || 0}
                    </TableCell>
                    
                    {/* Azioni */}
                    <TableCell className="text-right">
                      {editingId === stall.id ? (
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSave(stall.id);
                            }}
                            className="bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border-[#10b981]/30 h-6 w-6 p-0"
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
                            className="bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border-[#ef4444]/30 h-6 w-6 p-0"
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
                          className="hover:bg-[#14b8a6]/20 text-[#14b8a6] h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            )}
          </div>
        </div>

        {/* Popup Modifica Presenze */}
        {showPresenzePopup && selectedSpuntistaForPresenze && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg p-6 w-[400px]">
              <h3 className="text-lg font-semibold text-[#e8fbff] mb-4">
                Modifica Presenze - {selectedSpuntistaForPresenze.impresa_nome || selectedSpuntistaForPresenze.ragione_sociale}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#e8fbff]/70 mb-1">Presenze Storiche</label>
                  <input 
                    type="number" 
                    id="presenze-storiche-input"
                    defaultValue={selectedSpuntistaForPresenze.presenze_totali || selectedSpuntistaForPresenze.numero_presenze || 0}
                    className="w-full bg-[#0b1220] border border-[#14b8a6]/30 rounded px-3 py-2 text-[#e8fbff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#e8fbff]/70 mb-1">Data Prima Presenza</label>
                  <input 
                    type="date" 
                    id="data-prima-presenza-input"
                    defaultValue={selectedSpuntistaForPresenze.data_prima_presenza ? new Date(selectedSpuntistaForPresenze.data_prima_presenza).toISOString().split('T')[0] : ''}
                    className="w-full bg-[#0b1220] border border-[#14b8a6]/30 rounded px-3 py-2 text-[#e8fbff]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPresenzePopup(false);
                    setSelectedSpuntistaForPresenze(null);
                  }}
                  className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                >
                  Annulla
                </Button>
                <Button 
                  onClick={async () => {
                    const presenzeInput = document.getElementById('presenze-storiche-input') as HTMLInputElement;
                    const dataInput = document.getElementById('data-prima-presenza-input') as HTMLInputElement;
                    const nuovePresenze = parseInt(presenzeInput?.value || '0');
                    const nuovaData = dataInput?.value || null;
                    
                    try {
                      // Usa l'endpoint corretto /api/graduatoria/aggiorna-storico
                      const response = await fetch(`${API_BASE_URL}/api/graduatoria/aggiorna-storico`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          wallet_id: selectedSpuntistaForPresenze.wallet_id,
                          impresa_id: selectedSpuntistaForPresenze.impresa_id,
                          market_id: marketId,
                          presenze_totali: nuovePresenze,
                          data_prima_presenza: nuovaData
                        })
                      });
                      
                      const data = await response.json();
                      if (data.success) {
                        toast.success('Presenze aggiornate');
                        // Ricarica i dati per avere i valori aggiornati
                        fetchData();
                      } else {
                        toast.error(data.error || 'Errore nel salvataggio');
                      }
                    } catch (error) {
                      console.error('Errore salvataggio presenze:', error);
                      toast.error('Errore nel salvataggio');
                    }
                    
                    setShowPresenzePopup(false);
                    setSelectedSpuntistaForPresenze(null);
                  }}
                  className="bg-[#10b981] hover:bg-[#10b981]/80 text-white"
                >
                  Salva
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scheda Impresa - Form inline o preview */}
        <div className="h-[450px] flex flex-col bg-[#0b1220]/30 rounded-lg border border-[#14b8a6]/10 overflow-hidden relative">
          {/* Modal inline per modifica impresa */}
          {showCompanyModal && selectedCompanyForModal && (
            <CompanyModal
              marketId={marketCode}
              company={selectedCompanyForModal}
              inline={true}
              onClose={() => {
                setShowCompanyModal(false);
                setSelectedCompanyForModal(null);
              }}
              onSaved={() => {
                setShowCompanyModal(false);
                setSelectedCompanyForModal(null);
                fetchData();
                toast.success('Impresa aggiornata con successo');
              }}
            />
          )}
          
          {!selectedStall && !selectedSpuntistaForDetail ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MapPin className="h-12 w-12 text-[#14b8a6]/30 mb-4" />
              <p className="text-[#e8fbff]/50 text-sm">
                Seleziona un posteggio dalla lista o dalla mappa per visualizzare i dettagli dell'impresa
              </p>
            </div>
          ) : selectedSpuntistaForDetail && !selectedStall ? (
            /* Pannello dettaglio spuntista (senza posteggio selezionato) */
            <div className="h-full flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-[#f59e0b]/20 bg-[#f59e0b]/5">
                <div>
                  <h3 className="text-sm font-semibold text-[#e8fbff]">
                    {selectedSpuntistaForDetail.impresa_nome || selectedSpuntistaForDetail.impresa_name || selectedSpuntistaForDetail.ragione_sociale || 'Spuntista'}
                  </h3>
                  <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30 text-xs mt-1">
                    Spuntista
                  </Badge>
                </div>
                <button onClick={() => { setSelectedSpuntistaForDetail(null); setSidebarView('impresa'); setSidebarCompanyData(null); setSidebarDomandaSpuntaData(null); }} className="text-[#e8fbff]/50 hover:text-[#e8fbff]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Tab switcher Vista Impresa / Vista Domanda Spunta */}
              <div className="flex border-b border-[#f59e0b]/20">
                <button
                  onClick={() => setSidebarView('impresa')}
                  className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${sidebarView === 'impresa' ? 'text-[#14b8a6] border-b-2 border-[#14b8a6] bg-[#14b8a6]/10' : 'text-[#e8fbff]/50 hover:text-[#e8fbff]'}`}
                >
                  <Building2 className="h-4 w-4 inline mr-2" />Vista Impresa
                </button>
                <button
                  onClick={() => setSidebarView('domanda_spunta')}
                  className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${sidebarView === 'domanda_spunta' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b] bg-[#f59e0b]/10' : 'text-[#e8fbff]/50 hover:text-[#e8fbff]'}`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />Vista Domanda Spunta
                </button>
              </div>

              {/* Contenuto Vista Impresa */}
              {sidebarView === 'impresa' && (
                <>
                  {sidebarCompanyLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14b8a6]"></div>
                    </div>
                  ) : sidebarCompanyData ? (
                    <CompanyModal
                      marketId={marketCode}
                      company={sidebarCompanyData}
                      inline={true}
                      onClose={() => {
                        setSelectedSpuntistaForDetail(null);
                        setSidebarCompanyData(null);
                      }}
                      onSaved={() => {
                        fetchData();
                        toast.success('Impresa aggiornata con successo');
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <Building2 className="h-12 w-12 text-[#14b8a6]/30 mb-4" />
                      <p className="text-[#e8fbff]/50 text-sm">Nessun dato impresa disponibile</p>
                    </div>
                  )}
                </>
              )}

              {/* Contenuto Vista Domanda Spunta */}
              {sidebarView === 'domanda_spunta' && (
                sidebarDomandaSpuntaData ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Dati Domanda */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" /> Dati Domanda
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">N. Domanda</span>
                        <p className="text-[#e8fbff] text-sm">#{sidebarDomandaSpuntaData.id || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Stato</span>
                        <p><Badge className={`text-xs ${sidebarDomandaSpuntaData.stato === 'APPROVATA' ? 'bg-green-500/20 text-green-400' : sidebarDomandaSpuntaData.stato === 'RIFIUTATA' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{sidebarDomandaSpuntaData.stato || '-'}</Badge></p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Data Richiesta</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.data_richiesta ? new Date(sidebarDomandaSpuntaData.data_richiesta).toLocaleDateString('it-IT') : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Settore Richiesto</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.settore_richiesto || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Giorno</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.giorno_settimana || sidebarDomandaSpuntaData.giorno || sidebarDomandaSpuntaData.market_days || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Note</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.note || 'Nessuna'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Richiedente */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" /> Richiedente
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Ragione Sociale</span>
                        <p className="text-[#e8fbff] font-semibold text-sm">{sidebarDomandaSpuntaData.ragione_sociale || sidebarCompanyData?.denominazione || selectedSpuntistaForDetail?.impresa_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Partita IVA</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.partita_iva || sidebarCompanyData?.partita_iva || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Codice Fiscale</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.codice_fiscale || sidebarCompanyData?.codice_fiscale || sidebarCompanyData?.code || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Nome</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.rappresentante_legale_nome || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Cognome</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.rappresentante_legale_cognome || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Autorizzazione */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" /> Autorizzazione
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Numero</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.numero_autorizzazione || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Tipo</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.autorizzazione_tipo === 'A' ? 'Tipo A - Posteggio' : sidebarDomandaSpuntaData.autorizzazione_tipo === 'B' ? 'Tipo B - Itinerante' : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Ente Rilascio</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.autorizzazione_ente || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Data Rilascio</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.autorizzazione_data ? new Date(sidebarDomandaSpuntaData.autorizzazione_data).toLocaleDateString('it-IT') : '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Presenze e Wallet */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Wallet className="h-4 w-4" /> Presenze e Wallet
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Presenze</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.numero_presenze || selectedSpuntistaForDetail?.presenze_totali || 0}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Saldo Wallet</span>
                        <p className={`font-semibold text-sm ${parseFloat(sidebarDomandaSpuntaData.wallet_balance || selectedSpuntistaForDetail?.wallet_balance || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          &euro; {parseFloat(sidebarDomandaSpuntaData.wallet_balance || selectedSpuntistaForDetail?.wallet_balance || '0').toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Stato Wallet</span>
                        <p className={`text-sm ${(sidebarDomandaSpuntaData.wallet_id || selectedSpuntistaForDetail?.wallet_id) ? 'text-green-400' : 'text-red-400'}`}>
                          {(sidebarDomandaSpuntaData.wallet_id || selectedSpuntistaForDetail?.wallet_id) ? '\u2713 Attivo' : '\u2717 Non creato'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b]"></div>
                </div>
                )
              )}

              {/* Pulsante Modifica Impresa per spuntista */}
              {selectedSpuntistaForDetail?.impresa_id && (
                <div className="p-4 border-t border-[#f59e0b]/20 bg-[#0b1220]/50">
                  <Button
                    onClick={async () => {
                      const companyId = selectedSpuntistaForDetail.impresa_id;
                      if (companyId) {
                        try {
                          const response = await fetch(`${API_BASE_URL}/api/imprese/${companyId}`);
                          const data = await response.json();
                          if (data.success && data.data) {
                            setSelectedCompanyForModal({
                              id: data.data.id,
                              code: data.data.codice_fiscale || data.data.code,
                              denominazione: data.data.denominazione,
                              partita_iva: data.data.partita_iva,
                              referente: data.data.referente || data.data.email,
                              telefono: data.data.telefono,
                              stato: data.data.stato || 'active',
                              ...data.data
                            });
                            setShowCompanyModal(true);
                          }
                        } catch (error) {
                          console.error('Error loading company:', error);
                          toast.error("Errore nel caricamento dell'impresa");
                        }
                      }
                    }}
                    className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Modifica Impresa (38 campi)
                  </Button>
                </div>
              )}
            </div>
          ) : selectedStall && !selectedStall.vendor_business_name && !concessionsByStallId[selectedStall.number] && !selectedStall.spuntista_impresa_id ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#14b8a6]/20">
                <h3 className="text-sm font-semibold text-[#e8fbff]">
                  Posteggio {selectedStall.number}
                </h3>
                <button onClick={() => setSelectedStallId(null)} className="text-[#e8fbff]/50 hover:text-[#e8fbff]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Building2 className="h-12 w-12 text-[#10b981]/30 mb-4" />
                <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 mb-2">
                  {getStallStatusLabel(selectedStall.status)}
                </Badge>
                <p className="text-[#e8fbff]/50 text-sm">
                  Nessuna impresa associata a questo posteggio
                </p>
              </div>
            </div>
          ) : selectedStall ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[#14b8a6]/20 bg-[#14b8a6]/5">
                <div>
                  <h3 className="text-sm font-semibold text-[#e8fbff]">
                    Posteggio {selectedStall.number}
                  </h3>
                  <Badge className={`${getStallStatusClasses(selectedStall.status)} text-xs mt-1`}>
                    {getStallStatusLabel(selectedStall.status)}
                  </Badge>
                </div>
                <button onClick={() => { setSelectedStallId(null); setSidebarView('impresa'); setSidebarConcessionData(null); }} className="text-[#e8fbff]/50 hover:text-[#e8fbff]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tab switcher Vista Impresa / Vista Concessione */}
              {selectedStall.concession_id && (
                <div className="flex border-b border-[#14b8a6]/20">
                  <button
                    onClick={() => setSidebarView('impresa')}
                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${sidebarView === 'impresa' ? 'text-[#14b8a6] border-b-2 border-[#14b8a6] bg-[#14b8a6]/10' : 'text-[#e8fbff]/50 hover:text-[#e8fbff]'}`}
                  >
                    <Building2 className="h-4 w-4 inline mr-2" />Vista Impresa
                  </button>
                  <button
                    onClick={() => setSidebarView('concessione')}
                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${sidebarView === 'concessione' ? 'text-[#8b5cf6] border-b-2 border-[#8b5cf6] bg-[#8b5cf6]/10' : 'text-[#e8fbff]/50 hover:text-[#e8fbff]'}`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />Vista Concessione
                  </button>
                </div>
              )}

              {/* Tab switcher Vista Impresa / Vista Domanda Spunta — per spuntisti */}
              {!selectedStall.concession_id && selectedStall.spuntista_impresa_id && (
                <div className="flex border-b border-[#f59e0b]/20">
                  <button
                    onClick={() => setSidebarView('impresa')}
                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${sidebarView === 'impresa' ? 'text-[#14b8a6] border-b-2 border-[#14b8a6] bg-[#14b8a6]/10' : 'text-[#e8fbff]/50 hover:text-[#e8fbff]'}`}
                  >
                    <Building2 className="h-4 w-4 inline mr-2" />Vista Impresa
                  </button>
                  <button
                    onClick={() => setSidebarView('domanda_spunta')}
                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${sidebarView === 'domanda_spunta' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b] bg-[#f59e0b]/10' : 'text-[#e8fbff]/50 hover:text-[#e8fbff]'}`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />Vista Domanda Spunta
                  </button>
                </div>
              )}
              
              {/* Contenuto Vista Impresa - Mostra CompanyModal inline */}
              {sidebarView === 'impresa' && (
                <>
                  {sidebarCompanyLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14b8a6]"></div>
                    </div>
                  ) : sidebarCompanyData ? (
                    <CompanyModal
                      marketId={marketCode}
                      company={sidebarCompanyData}
                      inline={true}
                      onClose={() => {
                        setSelectedStallId(null);
                        setSidebarCompanyData(null);
                      }}
                      onSaved={() => {
                        fetchData();
                        toast.success('Impresa aggiornata con successo');
                      }}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                      <Building2 className="h-12 w-12 text-[#14b8a6]/30 mb-4" />
                      <p className="text-[#e8fbff]/50 text-sm">
                        Nessun dato impresa disponibile
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Contenuto Vista Concessione */}
              {sidebarView === 'concessione' && sidebarConcessionData && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Frontespizio */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#14b8a6]/20">
                    <h4 className="text-[#14b8a6] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" /> Frontespizio
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">N. Protocollo</span>
                        <p className="text-[#e8fbff] text-sm">#{sidebarConcessionData.id || sidebarConcessionData.numero_protocollo || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Data Protocollazione</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.data_protocollazione ? new Date(sidebarConcessionData.data_protocollazione).toLocaleDateString('it-IT') : (sidebarConcessionData.valid_from ? new Date(sidebarConcessionData.valid_from).toLocaleDateString('it-IT') : '-')}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Comune Rilascio</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.comune_rilascio || sidebarConcessionData.ubicazione || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Durata</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.durata_anni ? `${sidebarConcessionData.durata_anni} anni` : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Data Decorrenza</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.data_decorrenza ? new Date(sidebarConcessionData.data_decorrenza).toLocaleDateString('it-IT') : (sidebarConcessionData.valid_from ? new Date(sidebarConcessionData.valid_from).toLocaleDateString('it-IT') : '-')}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Scadenza</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.valid_to ? new Date(sidebarConcessionData.valid_to).toLocaleDateString('it-IT') : '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Oggetto</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.oggetto || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Concessionario */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#14b8a6]/20">
                    <h4 className="text-[#14b8a6] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" /> Concessionario
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Ragione Sociale</span>
                        <p className="text-[#e8fbff] font-semibold text-sm">{sidebarConcessionData.ragione_sociale || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Partita IVA</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.partita_iva || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Codice Fiscale</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.cf_concessionario || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Nome</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.nome || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Cognome</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.cognome || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Settore Merceologico</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.settore_merceologico || '-'}</p>
                      </div>
                      <div className="col-span-3">
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Sede Legale</span>
                        <p className="text-[#e8fbff] text-sm">
                          {[sidebarConcessionData.sede_legale_via, sidebarConcessionData.sede_legale_cap, sidebarConcessionData.sede_legale_comune, sidebarConcessionData.sede_legale_provincia].filter(Boolean).join(', ') || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dati Posteggio e Mercato */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#14b8a6]/20">
                    <h4 className="text-[#14b8a6] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" /> Dati Posteggio e Mercato
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Mercato</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.market_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Numero Posteggio</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.stall_code || sidebarConcessionData.stall_number || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Ubicazione</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.ubicazione || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Giorno Mercato</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.giorno || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Fila</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.fila || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Dimensioni (MQ)</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.mq || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Dimensioni Lineari</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.dimensioni_lineari || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dati Economici e Attrezzature */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#14b8a6]/20">
                    <h4 className="text-[#14b8a6] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" /> Dati Economici e Attrezzature
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Canone Unico</span>
                        <p className="font-semibold text-sm text-[#14b8a6]">
                          € {parseFloat(sidebarConcessionData.canone_unico || '0').toLocaleString('it-IT', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Tipo Posteggio</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.tipo_posteggio || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Concessione */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#14b8a6]/20">
                    <h4 className="text-[#14b8a6] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Wallet className="h-4 w-4" /> Wallet Concessione
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">ID Wallet</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.wallet_id || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Saldo</span>
                        <p className={`font-semibold text-sm ${parseFloat(sidebarConcessionData.wallet_balance || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          € {parseFloat(sidebarConcessionData.wallet_balance || '0').toLocaleString('it-IT', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Stato Wallet</span>
                        <p className={`text-sm ${sidebarConcessionData.wallet_status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {sidebarConcessionData.wallet_status === 'ACTIVE' ? '✓ Attivo' : sidebarConcessionData.wallet_status || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Requisiti e Documentazione */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#14b8a6]/20">
                    <h4 className="text-[#14b8a6] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" /> Requisiti e Documentazione
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">DURC Valido</span>
                        <p className={`text-sm ${sidebarConcessionData.durc_scadenza_qualifica ? (new Date(sidebarConcessionData.durc_scadenza_qualifica) > new Date() ? 'text-green-400' : 'text-yellow-400') : 'text-red-400'}`}>
                          {sidebarConcessionData.durc_scadenza_qualifica ? (new Date(sidebarConcessionData.durc_scadenza_qualifica) > new Date() ? '✓ Sì' : '⚠ Scaduto') : '✗ Non presente'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Scadenza DURC</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarConcessionData.durc_scadenza_qualifica ? new Date(sidebarConcessionData.durc_scadenza_qualifica).toLocaleDateString('it-IT') : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Requisiti Morali</span>
                        <p className={`text-sm ${sidebarConcessionData.requisiti_morali ? 'text-green-400' : 'text-[#e8fbff]/50'}`}>
                          {sidebarConcessionData.requisiti_morali ? '✓ Verificati' : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Requisiti Professionali</span>
                        <p className={`text-sm ${sidebarConcessionData.requisiti_professionali ? 'text-green-400' : 'text-[#e8fbff]/50'}`}>
                          {sidebarConcessionData.requisiti_professionali ? '✓ Verificati' : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading per Vista Concessione */}
              {sidebarView === 'concessione' && !sidebarConcessionData && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b5cf6]"></div>
                </div>
              )}

              {/* Contenuto Vista Domanda Spunta — per spuntisti */}
              {sidebarView === 'domanda_spunta' && selectedStall.spuntista_impresa_id && (
                sidebarDomandaSpuntaData ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Dati Domanda */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" /> Dati Domanda
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">N. Domanda</span>
                        <p className="text-[#e8fbff] text-sm">#{sidebarDomandaSpuntaData.id || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Stato</span>
                        <p><Badge className={`text-xs ${sidebarDomandaSpuntaData.stato === 'APPROVATA' ? 'bg-green-500/20 text-green-400' : sidebarDomandaSpuntaData.stato === 'RIFIUTATA' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{sidebarDomandaSpuntaData.stato || '-'}</Badge></p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Data Richiesta</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.data_richiesta ? new Date(sidebarDomandaSpuntaData.data_richiesta).toLocaleDateString('it-IT') : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Settore Richiesto</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.settore_richiesto || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Giorno</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.giorno_settimana || sidebarDomandaSpuntaData.market_days || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Note</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.note || 'Nessuna'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Richiedente */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" /> Richiedente
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Ragione Sociale</span>
                        <p className="text-[#e8fbff] font-semibold text-sm">{sidebarDomandaSpuntaData.company_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Partita IVA</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.company_piva || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Codice Fiscale</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.company_cf || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Nome</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.rappresentante_legale_nome || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Cognome</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.rappresentante_legale_cognome || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Autorizzazione */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4" /> Autorizzazione
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Numero</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.numero_autorizzazione || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Tipo</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.autorizzazione_tipo === 'A' ? 'Tipo A - Posteggio' : sidebarDomandaSpuntaData.autorizzazione_tipo === 'B' ? 'Tipo B - Itinerante' : '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Ente Rilascio</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.autorizzazione_ente || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Data Rilascio</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.autorizzazione_data ? new Date(sidebarDomandaSpuntaData.autorizzazione_data).toLocaleDateString('it-IT') : '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Presenze e Wallet */}
                  <div className="bg-[#0d1829] rounded-lg p-3 border border-[#f59e0b]/20">
                    <h4 className="text-[#f59e0b] font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Wallet className="h-4 w-4" /> Presenze e Wallet
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Presenze</span>
                        <p className="text-[#e8fbff] text-sm">{sidebarDomandaSpuntaData.numero_presenze || 0}</p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Saldo Wallet</span>
                        <p className={`font-semibold text-sm ${parseFloat(sidebarDomandaSpuntaData.wallet_balance || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          € {parseFloat(sidebarDomandaSpuntaData.wallet_balance || '0').toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-[#e8fbff]/50 uppercase">Stato Wallet</span>
                        <p className={`text-sm ${sidebarDomandaSpuntaData.wallet_id ? 'text-green-400' : 'text-red-400'}`}>
                          {sidebarDomandaSpuntaData.wallet_id ? '✓ Attivo' : '✗ Non creato'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b]"></div>
                </div>
                )
              )}

              {/* Pulsanti per posteggi senza concessione */}
              {!selectedStall.concession_id && (
                <div className="p-4 border-t border-[#14b8a6]/20 bg-[#0b1220]/50">
                  <Button
                    onClick={async () => {
                      const companyId = selectedStall.impresa_id || concessionsByStallId[selectedStall.number]?.companyId;
                      if (companyId) {
                        try {
                          const response = await fetch(`${API_BASE_URL}/api/imprese/${companyId}`);
                          const data = await response.json();
                          if (data.success && data.data) {
                            setSelectedCompanyForModal({
                              id: data.data.id,
                              code: data.data.codice_fiscale || data.data.code,
                              denominazione: data.data.denominazione,
                              partita_iva: data.data.partita_iva,
                              referente: data.data.referente || data.data.email,
                              telefono: data.data.telefono,
                              stato: data.data.stato || 'active',
                              ...data.data
                            });
                            setShowCompanyModal(true);
                          }
                        } catch (error) {
                          console.error('Error loading company:', error);
                          toast.error('Errore nel caricamento dell\'impresa');
                        }
                      }
                    }}
                    className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
                  >
                    <Edit className="h-4 w-4 mr-2" /> Modifica Impresa (38 campi)
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>


      {/* Modal Dettaglio Concessione */}
      {showConcessionDetailModal && selectedConcessionForModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0b1220] border-b border-[#14b8a6]/20 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#14b8a6]">
                Concessione #{selectedConcessionForModal.numero_protocollo || selectedConcessionForModal.id}
              </h2>
              <button onClick={() => setShowConcessionDetailModal(false)} className="text-[#e8fbff]/50 hover:text-[#e8fbff]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Dati Concessione */}
              <div className="bg-[#0d1829] rounded-lg p-4 border border-[#14b8a6]/20">
                <h3 className="text-[#14b8a6] font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Dati Concessione
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Tipo</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.tipo_concessione || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Stato</span>
                    <Badge className={selectedConcessionForModal.stato === 'ATTIVA' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                      {selectedConcessionForModal.stato || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Valida Dal</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.valid_from ? new Date(selectedConcessionForModal.valid_from).toLocaleDateString('it-IT') : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Valida Al</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.valid_to ? new Date(selectedConcessionForModal.valid_to).toLocaleDateString('it-IT') : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Concessionario */}
              <div className="bg-[#0d1829] rounded-lg p-4 border border-[#14b8a6]/20">
                <h3 className="text-[#14b8a6] font-semibold mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" /> Concessionario
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Ragione Sociale</span>
                    <p className="text-[#e8fbff] font-semibold">{selectedConcessionForModal.ragione_sociale || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Nome</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.nome || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Cognome</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.cognome || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Partita IVA</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.partita_iva || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Codice Fiscale</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.cf_concessionario || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Sede Legale</span>
                    <p className="text-[#e8fbff]">
                      {[selectedConcessionForModal.sede_legale_via, selectedConcessionForModal.sede_legale_cap, selectedConcessionForModal.sede_legale_comune, selectedConcessionForModal.sede_legale_provincia].filter(Boolean).join(', ') || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dati Posteggio e Mercato */}
              <div className="bg-[#0d1829] rounded-lg p-4 border border-[#14b8a6]/20">
                <h3 className="text-[#14b8a6] font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Dati Posteggio e Mercato
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Mercato</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.market_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Posteggio</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.stall_code || selectedConcessionForModal.stall_number || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Ubicazione</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.ubicazione || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Giorno</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.giorno || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">MQ</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.mq || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Dimensioni</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.dimensioni_lineari || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Dati Economici */}
              <div className="bg-[#0d1829] rounded-lg p-4 border border-[#14b8a6]/20">
                <h3 className="text-[#14b8a6] font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Dati Economici
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Canone Unico</span>
                    <p className={`font-semibold ${parseFloat(selectedConcessionForModal.canone_unico || '0') > 0 ? 'text-red-400' : 'text-[#e8fbff]'}`}>
                      € {parseFloat(selectedConcessionForModal.canone_unico || '0').toLocaleString('it-IT', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Tipo Posteggio</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.tipo_posteggio || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Wallet Concessione */}
              <div className="bg-[#0d1829] rounded-lg p-4 border border-[#14b8a6]/20">
                <h3 className="text-[#14b8a6] font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Wallet Concessione
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">ID Wallet</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.wallet_id || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Saldo</span>
                    <p className={`font-semibold ${parseFloat(selectedConcessionForModal.wallet_balance || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      € {parseFloat(selectedConcessionForModal.wallet_balance || '0').toLocaleString('it-IT', {minimumFractionDigits: 2})}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Stato Wallet</span>
                    <p className={`${selectedConcessionForModal.wallet_status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {selectedConcessionForModal.wallet_status === 'ACTIVE' ? '✓ Attivo' : selectedConcessionForModal.wallet_status || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requisiti e Documentazione */}
              <div className="bg-[#0d1829] rounded-lg p-4 border border-[#14b8a6]/20">
                <h3 className="text-[#14b8a6] font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Requisiti e Documentazione
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">DURC Valido</span>
                    <p className={selectedConcessionForModal.durc_scadenza_qualifica ? (new Date(selectedConcessionForModal.durc_scadenza_qualifica) > new Date() ? 'text-green-400' : 'text-yellow-400') : 'text-red-400'}>
                      {selectedConcessionForModal.durc_scadenza_qualifica ? (new Date(selectedConcessionForModal.durc_scadenza_qualifica) > new Date() ? '✓ Sì' : '⚠ Scaduto') : '✗ Non presente'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Scadenza DURC</span>
                    <p className="text-[#e8fbff]">{selectedConcessionForModal.durc_scadenza_qualifica ? new Date(selectedConcessionForModal.durc_scadenza_qualifica).toLocaleDateString('it-IT') : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Requisiti Morali</span>
                    <p className={selectedConcessionForModal.requisiti_morali ? 'text-green-400' : 'text-[#e8fbff]/50'}>
                      {selectedConcessionForModal.requisiti_morali ? '✓ Verificati' : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[#e8fbff]/50 uppercase">Requisiti Professionali</span>
                    <p className={selectedConcessionForModal.requisiti_professionali ? 'text-green-400' : 'text-[#e8fbff]/50'}>
                      {selectedConcessionForModal.requisiti_professionali ? '✓ Verificati' : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#14b8a6]" />
        <p className="text-[#e8fbff]/70 animate-pulse">Caricamento mappa e posteggi in corso...</p>
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
        <h3 className="text-lg font-semibold mb-4 text-[#e8fbff]">Concessioni</h3>
        <div className="border border-[#14b8a6]/20 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0b1220]/50 border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
                <TableHead className="text-[#e8fbff]/70">Posteggio</TableHead>
                <TableHead className="text-[#e8fbff]/70">Impresa</TableHead>
                <TableHead className="text-[#e8fbff]/70">Settore</TableHead>
                <TableHead className="text-[#e8fbff]/70">Comune</TableHead>
                <TableHead className="text-[#e8fbff]/70">Valida Dal</TableHead>
                <TableHead className="text-[#e8fbff]/70">Valida Al</TableHead>
                <TableHead className="text-[#e8fbff]/70">Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concessions.map((concession) => {
                // Priorità: stato dal DB (CESSATA, SOSPESA) > calcolo dinamico (SCADUTA) > ATTIVA
                const isCessata = concession.status === 'CESSATA' || concession.stato === 'CESSATA' || concession.stato_calcolato === 'CESSATA';
                const isSospesa = concession.stato === 'SOSPESA' || concession.stato_calcolato === 'SOSPESA';
                const isExpired = !isCessata && !isSospesa && concession.valid_to && new Date(concession.valid_to) < new Date();
                const displayStato = isCessata ? 'Cessata' : isSospesa ? 'Sospesa' : isExpired ? 'Scaduta' : 'Attiva';
                const badgeClass = isCessata ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
                  : isSospesa ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : isExpired ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : 'bg-green-500/20 text-green-400 border-green-500/30';
                return (
                <TableRow key={concession.id} className={`border-[#14b8a6]/10 hover:bg-[#14b8a6]/5 ${isCessata || isExpired ? 'opacity-70' : ''}`}>
                  <TableCell className="font-medium text-[#e8fbff]">{concession.stall_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#e8fbff]">{concession.vendor_business_name}</p>
                      <p className="text-xs text-[#e8fbff]/70">{concession.vendor_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                      {concession.settore_merceologico || 'Alimentare'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#e8fbff]">
                    {concession.comune_rilascio || '-'}
                  </TableCell>
                  <TableCell className="text-[#e8fbff]">
                    {new Date(concession.valid_from).toLocaleDateString('it-IT')}
                  </TableCell>
                  <TableCell className="text-[#e8fbff]">
                    {concession.valid_to 
                      ? new Date(concession.valid_to).toLocaleDateString('it-IT')
                      : 'Indeterminato'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={badgeClass}>
                      {displayStato}
                    </Badge>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
