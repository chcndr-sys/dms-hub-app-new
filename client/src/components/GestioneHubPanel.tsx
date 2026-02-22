/**
 * GestioneHubPanel.tsx
 * 
 * Componente principale per la sezione "Gestione Hub" della Dashboard PA.
 * Fornisce una vista aggregata per stakeholder (Associazioni, Cluster, Regione).
 * 
 * @author Manus AI
 * @date Gennaio 2026
 * @version 2.0 - Con dati reali dalle API
 */

import React, { useState, useEffect } from 'react';
import { 
  Globe, MapPin, Building2, Coins, Bell, FileBarChart,
  TrendingUp, TrendingDown, Users, Store, Leaf, Activity, BarChart3,
  Calendar, Clock, AlertCircle, CheckCircle, Award, DollarSign, Sliders,
  ArrowUpRight, ArrowDownRight, Filter, Search, Download, Wallet, Zap, Euro,
  Settings, Eye, Edit, Plus, RefreshCw, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

// Import componenti esistenti da riutilizzare
import MappaItaliaComponent from './MappaItaliaComponent';
import MappaItaliaPubblica from './MappaItaliaPubblica';
import { MarketMapComponent } from './MarketMapComponent';
import MappaHubMini from './MappaHubMini';
import GestioneHubNegozi from './GestioneHubNegozi';
import { HubMarketMapComponent } from './HubMarketMapComponent';
import GestioneHubMapWrapper from './GestioneHubMapWrapper';
import ImpreseQualificazioniPanel from './ImpreseQualificazioniPanel';
import { MarketCompaniesTab } from './markets/MarketCompaniesTab';
import WalletPanel from './WalletPanel';
import NotificationsPanel from './NotificationsPanel';

import { MIHUB_API_BASE_URL } from '@/config/api';
import { addComuneIdToUrl, isAssociazioneImpersonation } from '@/hooks/useImpersonation';

// ============================================================================
// TIPI E INTERFACCE
// ============================================================================

interface Market {
  id: number;
  code: string;
  name: string;
  municipality: string;
  days: string;
  total_stalls: number;
  status: string;
  latitude: string;
  longitude: string;
}

interface Vendor {
  id: number;
  code: string;
  business_name: string;
  vat_number: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

interface Stall {
  id: number;
  market_id: number;
  number: string;
  status: string;
  type: string;
}

interface Concession {
  id: number;
  vendor_id: number;
  stall_id: number;
  status: string;
  valid_from: string;
  valid_to: string;
}

interface HubKPI {
  label: string;
  value: string | number;
  trend: number;
  icon: React.ElementType;
  color: string;
}

interface HubData {
  id: string;
  name: string;
  comune: string;
  provincia: string;
  mercati: number;
  negozi: number;
  servizi: number;
  status: 'attivo' | 'in_attivazione' | 'sospeso';
  esgRating: number;
  posteggiTotali: number;
  posteggiOccupati: number;
}

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

export default function GestioneHubPanel() {
  // Leggi subtab da URL params (es. ?subtab=rete-hub)
  const urlParams = new URLSearchParams(window.location.search);
  const subtabFromUrl = urlParams.get('subtab');
  const [activeSubTab, setActiveSubTab] = useState(subtabFromUrl || 'cruscotto');
  const [selectedProvincia, setSelectedProvincia] = useState<string>('all');
  const [selectedRuolo, setSelectedRuolo] = useState<string>('regione');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stati per dati reali
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [imprese, setImprese] = useState<any[]>([]);
  const [impresaFilter, setImpresaFilter] = useState<'all' | 'ambulanti' | 'negozi_hub'>('all');

  // Stati per Carbon Credit (EcoCarbon tab)
  const [tccValue, setTccValue] = useState(1.50);
  const [appliedTccValue, setAppliedTccValue] = useState(1.50);
  
  const [editableParams, setEditableParams] = useState({
    fundBalance: 125000,
    burnRate: 8500,
    tccIssued: 125000,
    tccSpent: 78000,
    areaBoosts: [
      { area: 'Grosseto', boost: 0 },
      { area: 'Follonica', boost: -10 },
      { area: 'Orbetello', boost: +10 }
    ],
    categoryBoosts: [
      { category: 'BIO', boost: 20 },
      { category: 'KM0', boost: 15 },
      { category: 'DOP/IGP', boost: 10 },
      { category: 'Standard', boost: 0 }
    ]
  });

  // Funzioni calcolo Carbon Credit
  // NUOVA FORMULA: 1 TCC = 1 kg CO2 (basato su EU ETS)
  const CO2_PER_TCC = 1; // 1 TCC = 1 kg CO2
  const CO2_PER_TREE = 22; // 1 albero assorbe 22 kg CO2/anno (fonte: USDA)

  const calculateAreaValues = () => {
    return editableParams.areaBoosts.map(item => ({
      ...item,
      value: appliedTccValue * (1 + item.boost / 100)
    }));
  };

  const calculateCategoryValues = () => {
    return editableParams.categoryBoosts.map(item => ({
      ...item,
      finalValue: appliedTccValue * (1 + item.boost / 100)
    }));
  };

  const calculateMonthsRemaining = () => {
    if (editableParams.burnRate === 0) return '999';
    return (editableParams.fundBalance / editableParams.burnRate).toFixed(1);
  };

  const calculateVelocity = () => {
    if (editableParams.tccIssued === 0) return '0';
    return ((editableParams.tccSpent / editableParams.tccIssued) * 100).toFixed(1);
  };

  const calculateReimbursementNeeded = () => {
    return (editableParams.tccSpent * appliedTccValue).toFixed(2);
  };

  const calculateCO2Saved = () => {
    // TCC riscattati = kg CO2 evitata
    return (editableParams.tccSpent * CO2_PER_TCC).toFixed(0);
  };

  const calculateTreesEquivalent = () => {
    const co2Saved = parseFloat(calculateCO2Saved());
    return (co2Saved / CO2_PER_TREE).toFixed(1);
  };

  // Carica dati reali all'avvio
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    // Non caricare dati Hub per impersonificazione associazione
    if (isAssociazioneImpersonation()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [marketsRes, vendorsRes, stallsRes, concessionsRes, impreseRes] = await Promise.all([
        fetch(addComuneIdToUrl(`${MIHUB_API_BASE_URL}/api/markets`)),
        fetch(addComuneIdToUrl(`${MIHUB_API_BASE_URL}/api/vendors`)),
        fetch(addComuneIdToUrl(`${MIHUB_API_BASE_URL}/api/stalls`)),
        fetch(addComuneIdToUrl(`${MIHUB_API_BASE_URL}/api/concessions`)),
        fetch(addComuneIdToUrl(`${MIHUB_API_BASE_URL}/api/imprese`))
      ]);

      const [marketsData, vendorsData, stallsData, concessionsData, impreseData] = await Promise.all([
        marketsRes.json(),
        vendorsRes.json(),
        stallsRes.json(),
        concessionsRes.json(),
        impreseRes.json()
      ]);

      if (marketsData.success) setMarkets(marketsData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
      if (stallsData.success) setStalls(stallsData.data);
      if (concessionsData.success) setConcessions(concessionsData.data);
      if (impreseData.success) setImprese(impreseData.data);

    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Calcola KPI dai dati reali
  const calculateKPIs = (): HubKPI[] => {
    const totalMarkets = markets.length;
    const activeVendors = vendors.filter(v => v.status === 'active').length;
    const totalStalls = stalls.length;
    const occupiedStalls = stalls.filter(s => s.status === 'occupato').length;
    const activeConcessions = concessions.filter(c => c.status === 'ATTIVA' || c.status === 'attiva').length;
    
    // Calcola rating ESG simulato (basato su % occupazione)
    const occupancyRate = totalStalls > 0 ? (occupiedStalls / totalStalls) * 10 : 0;
    
    return [
      { label: 'Hub Attivi', value: totalMarkets, trend: 0, icon: Globe, color: '#06b6d4' },
      { label: 'Imprese Aderenti', value: activeVendors, trend: 0, icon: Building2, color: '#14b8a6' },
      { label: 'Posteggi Totali', value: totalStalls, trend: 0, icon: Store, color: '#10b981' },
      { label: 'Concessioni Attive', value: activeConcessions, trend: 0, icon: Coins, color: '#f59e0b' },
      { label: 'Tasso Occupazione', value: `${Math.round((occupiedStalls / totalStalls) * 100)}%`, trend: 0, icon: Leaf, color: '#22c55e' },
    ];
  };

  // Trasforma mercati in HubData
  const getHubsFromMarkets = (): HubData[] => {
    return markets.map(market => {
      const marketStalls = stalls.filter(s => s.market_id === market.id);
      const occupiedStalls = marketStalls.filter(s => s.status === 'occupato').length;
      const provincia = market.municipality.slice(0, 2).toUpperCase();
      
      return {
        id: `HUB-${market.code}`,
        name: market.name,
        comune: market.municipality,
        provincia: provincia,
        mercati: 1,
        negozi: marketStalls.length,
        servizi: Math.floor(marketStalls.length / 10),
        status: market.status === 'active' ? 'attivo' : 'sospeso',
        esgRating: marketStalls.length > 0 ? Math.round((occupiedStalls / marketStalls.length) * 10 * 10) / 10 : 0,
        posteggiTotali: marketStalls.length,
        posteggiOccupati: occupiedStalls
      };
    });
  };

  // Province uniche dai mercati
  const getUniqueProvinces = (): string[] => {
    const provinces = new Set(markets.map(m => m.municipality.slice(0, 2).toUpperCase()));
    return Array.from(provinces);
  };

  // Filtra Hub per provincia
  const filteredHubs = getHubsFromMarkets().filter(hub => {
    if (selectedProvincia !== 'all' && hub.provincia !== selectedProvincia) return false;
    if (searchQuery && !hub.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#06b6d4]" />
        <span className="ml-3 text-[#e8fbff]/70">Caricamento dati Hub...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con titolo e filtri globali */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#e8fbff] flex items-center gap-2">
            <Globe className="h-7 w-7 text-[#06b6d4]" />
            Gestione Hub Territoriale
          </h2>
          <p className="text-[#e8fbff]/60 mt-1">
            Cabina di regia per Hub Urbani e di Prossimità
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Selettore Ruolo */}
          <Select value={selectedRuolo} onValueChange={setSelectedRuolo}>
            <SelectTrigger className="w-[160px] bg-[#0b1220] border-[#8b5cf6]/30 text-[#e8fbff]">
              <SelectValue placeholder="Seleziona Ruolo" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2332] border-[#8b5cf6]/30">
              <SelectItem value="regione">🏛️ Regione</SelectItem>
              <SelectItem value="comune">🏘️ Comune</SelectItem>
              <SelectItem value="associazione">🤝 Associazione</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProvincia} onValueChange={setSelectedProvincia}>
            <SelectTrigger className="w-[180px] bg-[#0b1220] border-[#06b6d4]/30 text-[#e8fbff]">
              <SelectValue placeholder="Filtra Provincia" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2332] border-[#06b6d4]/30">
              <SelectItem value="all">Tutte le Province</SelectItem>
              {getUniqueProvinces().map(prov => (
                <SelectItem key={prov} value={prov}>{prov}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            className="border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/10"
            onClick={fetchAllData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          
          <Button variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/10">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="bg-[#0b1220] border border-[#06b6d4]/20 p-1 h-auto flex-wrap">
          <TabsTrigger 
            value="cruscotto" 
            className="data-[state=active]:bg-[#06b6d4]/20 data-[state=active]:text-[#06b6d4] text-[#e8fbff]/70"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Cruscotto
          </TabsTrigger>
          <TabsTrigger 
            value="rete-hub" 
            className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6] text-[#e8fbff]/70"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Rete Hub
          </TabsTrigger>
          <TabsTrigger 
            value="imprese" 
            className="data-[state=active]:bg-[#10b981]/20 data-[state=active]:text-[#10b981] text-[#e8fbff]/70"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Imprese
          </TabsTrigger>
          <TabsTrigger 
            value="ecocarbon" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b] text-[#e8fbff]/70"
          >
            <Coins className="h-4 w-4 mr-2" />
            EcoCarbon
          </TabsTrigger>
          <TabsTrigger 
            value="comunicazione" 
            className="data-[state=active]:bg-[#8b5cf6]/20 data-[state=active]:text-[#8b5cf6] text-[#e8fbff]/70"
          >
            <Bell className="h-4 w-4 mr-2" />
            Comunicazione
          </TabsTrigger>
          <TabsTrigger 
            value="report-esg" 
            className="data-[state=active]:bg-[#ec4899]/20 data-[state=active]:text-[#ec4899] text-[#e8fbff]/70"
          >
            <FileBarChart className="h-4 w-4 mr-2" />
            Report ESG
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* TAB 1: CRUSCOTTO TERRITORIALE */}
        {/* ================================================================ */}
        <TabsContent value="cruscotto" className="space-y-6 mt-6">
          {/* KPI Cards - Dati Reali */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {kpis.map((kpi, index) => (
              <Card key={index} className="bg-[#1a2332] border-[#06b6d4]/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                    <Badge 
                      variant="outline" 
                      className="text-xs text-[#10b981] border-[#10b981]/30"
                    >
                      Live
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-[#e8fbff]">{kpi.value}</div>
                  <div className="text-xs text-[#e8fbff]/60 mt-1">{kpi.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mappa e Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mappa GIS */}
            <div className="lg:col-span-2">
              <Card className="bg-[#1a2332] border-[#06b6d4]/30 h-[500px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#06b6d4]" />
                    Mappa Hub Territoriali
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[420px] p-0">
                  <div className="w-full h-full rounded-lg overflow-hidden">
                    <MappaHubMini 
                      onMarketClick={(marketId) => {
                        // Vai al tab Rete Hub quando si clicca su un mercato
                        setActiveSubTab('rete-hub');
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Panel */}
            <div className="lg:col-span-1">
              <Card className="bg-[#1a2332] border-[#06b6d4]/30 h-[500px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-[#f59e0b]" />
                    Alert & Notifiche
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 overflow-y-auto max-h-[420px]">
                  {/* Alert dinamici basati sui dati */}
                  <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
                    <div className="flex items-center gap-2 text-[#ef4444]">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        {concessions.filter(c => {
                          const validTo = new Date(c.valid_to);
                          const thirtyDaysFromNow = new Date();
                          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                          return validTo <= thirtyDaysFromNow && c.status === 'ATTIVA';
                        }).length} concessioni in scadenza
                      </span>
                    </div>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">Entro 30 giorni</p>
                  </div>

                  <div className="p-3 bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-lg">
                    <div className="flex items-center gap-2 text-[#06b6d4]">
                      <FileBarChart className="h-4 w-4" />
                      <span className="font-medium text-sm">Report mensile disponibile</span>
                    </div>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">Gennaio 2026 - Scarica PDF</p>
                  </div>

                  <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="flex items-center gap-2 text-[#10b981]">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium text-sm">{vendors.length} imprese attive</span>
                    </div>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">Sistema aggiornato</p>
                  </div>

                  <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                    <div className="flex items-center gap-2 text-[#8b5cf6]">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium text-sm">Prossimo mercato</span>
                    </div>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">
                      {markets[0]?.name || 'N/A'} - {markets[0]?.days || 'N/A'}
                    </p>
                  </div>

                  <div className="p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg">
                    <div className="flex items-center gap-2 text-[#22c55e]">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium text-sm">Tasso occupazione</span>
                    </div>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">
                      {stalls.length > 0 
                        ? `${Math.round((stalls.filter(s => s.status === 'occupato').length / stalls.length) * 100)}%`
                        : '0%'
                      } dei posteggi occupati
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lista Hub Attivi */}
          <Card className="bg-[#1a2332] border-[#06b6d4]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Store className="h-5 w-5 text-[#14b8a6]" />
                  Hub Attivi nel Territorio
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-[#14b8a6]/30 text-[#14b8a6]"
                  onClick={() => setActiveSubTab('rete-hub')}
                >
                  Vedi tutti
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHubs.map((hub) => (
                  <Card key={hub.id} className="bg-[#0b1220] border-[#14b8a6]/20 hover:border-[#14b8a6]/50 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-[#e8fbff]">{hub.name}</h4>
                          <p className="text-xs text-[#e8fbff]/60">{hub.comune} ({hub.provincia})</p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={
                            hub.status === 'attivo' 
                              ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30'
                              : hub.status === 'in_attivazione'
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30'
                              : 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30'
                          }
                        >
                          {hub.status === 'attivo' ? '● Attivo' : hub.status === 'in_attivazione' ? '○ In attivazione' : '● Sospeso'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="bg-[#1a2332] rounded p-2">
                          <div className="text-lg font-bold text-[#06b6d4]">{hub.mercati}</div>
                          <div className="text-[10px] text-[#e8fbff]/50">mercati</div>
                        </div>
                        <div className="bg-[#1a2332] rounded p-2">
                          <div className="text-lg font-bold text-[#14b8a6]">{hub.negozi}</div>
                          <div className="text-[10px] text-[#e8fbff]/50">posteggi</div>
                        </div>
                        <div className="bg-[#1a2332] rounded p-2">
                          <div className="text-lg font-bold text-[#f59e0b]">{hub.posteggiOccupati}</div>
                          <div className="text-[10px] text-[#e8fbff]/50">occupati</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#e8fbff]/60">Tasso Occupazione</span>
                        <span className="font-bold text-[#22c55e]">
                          {hub.posteggiTotali > 0 
                            ? `${Math.round((hub.posteggiOccupati / hub.posteggiTotali) * 100)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 2: RETE HUB */}
        {/* ================================================================ */}
        <TabsContent value="rete-hub" className="mt-6">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardContent className="p-0">
              <GestioneHubMapWrapper />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 3: IMPRESE */}
        {/* ================================================================ */}
        <TabsContent value="imprese" className="mt-6">
          {/* Stats Cards - Filtrate in base al tipo impresa selezionato */}
          {(() => {
            // Filtra imprese in base al filtro selezionato
            const filteredImprese = imprese.filter(i => {
              if (impresaFilter === 'negozi_hub') return i.hub_shop_id;
              if (impresaFilter === 'ambulanti') return !i.hub_shop_id;
              return true;
            });
            
            // Conta concessioni attive per le imprese filtrate
            const filteredImpreseIds = new Set(filteredImprese.map(i => i.id));
            const filteredConcessions = concessions.filter(c => {
              // Se filtro negozi_hub, le concessioni sono 0 (negozi non hanno concessioni mercato)
              if (impresaFilter === 'negozi_hub') return false;
              return c.status === 'ATTIVA' || c.status === 'attiva';
            });
            
            // Conta comuni unici
            const uniqueComuni = new Set(filteredImprese.map(i => i.comune).filter(Boolean));
            
            // Media concessioni per impresa
            const mediaConcessioni = filteredImprese.length > 0 
              ? (filteredConcessions.length / filteredImprese.length).toFixed(1) 
              : '0';
            
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/5 border border-[#14b8a6]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-[#14b8a6] mb-1">
                    <Building2 className="h-4 w-4" />
                    {impresaFilter === 'all' ? 'Imprese Totali' : impresaFilter === 'ambulanti' ? 'Ambulanti' : 'Negozi HUB'}
                  </div>
                  <div className="text-3xl font-bold text-white">{filteredImprese.length}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border border-[#10b981]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-[#10b981] mb-1">
                    <Coins className="h-4 w-4" />
                    Concessioni Attive
                  </div>
                  <div className="text-3xl font-bold text-white">{filteredConcessions.length}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#06b6d4]/20 to-[#06b6d4]/5 border border-[#06b6d4]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-[#06b6d4] mb-1">
                    <Users className="h-4 w-4" />
                    Comuni Coperti
                  </div>
                  <div className="text-3xl font-bold text-white">{uniqueComuni.size}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border border-[#f59e0b]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-[#f59e0b] mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Media Concess./Impresa
                  </div>
                  <div className="text-3xl font-bold text-white">{mediaConcessioni}</div>
                </div>
              </div>
            );
          })()}
          
          {/* Componente Imprese Completo con Filtri - passa callback per aggiornare filtro */}
          <MarketCompaniesTab 
            marketId="all" 
            marketName="Tutti gli HUB" 
            filterType={impresaFilter}
            onFilterChange={setImpresaFilter}
          />
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 4: ECOCARBON - CARBON CREDIT */}
        {/* ================================================================ */}
        <TabsContent value="ecocarbon" className="space-y-6 mt-6">
          {/* Fondo Liquidità */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#14b8a6]" />
                Fondo Liquidità Carbon Credit
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Gestione e monitoraggio del fondo per i crediti sostenibilità
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border border-[#10b981]/30 rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Saldo Attuale (click to edit)</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#10b981] text-xl">€</span>
                    <input
                      type="number"
                      value={editableParams.fundBalance}
                      onChange={(e) => setEditableParams({ ...editableParams, fundBalance: parseFloat(e.target.value) || 0 })}
                      className="text-3xl font-bold text-[#10b981] bg-transparent border-b-2 border-[#10b981]/50 focus:border-[#10b981] outline-none w-full"
                    />
                  </div>
                </div>
                <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Burn Rate (click to edit)</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[#f59e0b] text-xl">€</span>
                    <input
                      type="number"
                      value={editableParams.burnRate}
                      onChange={(e) => setEditableParams({ ...editableParams, burnRate: parseFloat(e.target.value) || 0 })}
                      className="text-2xl font-bold text-[#f59e0b] bg-transparent border-b-2 border-[#f59e0b]/50 focus:border-[#f59e0b] outline-none w-full"
                    />
                    <span className="text-sm text-[#e8fbff]/70">/mese</span>
                  </div>
                </div>
                <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Mesi Rimanenti</div>
                  <div className="text-2xl font-bold text-[#14b8a6]">{calculateMonthsRemaining()}</div>
                </div>
                <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Valuta</div>
                  <div className="text-2xl font-bold text-[#e8fbff]">EUR</div>
                </div>
              </div>

              {/* Entrate */}
              <div className="mb-4">
                <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#10b981]" />
                  Entrate Fondo
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-[#10b981]" />
                      <div>
                        <div className="text-[#e8fbff] font-medium">Contributo Regionale</div>
                        <div className="text-xs text-[#e8fbff]/50">Gen 2026</div>
                      </div>
                    </div>
                    <div className="text-[#10b981] font-semibold">+€50.000</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-[#10b981]" />
                      <div>
                        <div className="text-[#e8fbff] font-medium">Canone Mercati</div>
                        <div className="text-xs text-[#e8fbff]/50">Dic 2025</div>
                      </div>
                    </div>
                    <div className="text-[#10b981] font-semibold">+€35.000</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-[#10b981]" />
                      <div>
                        <div className="text-[#e8fbff] font-medium">Sponsor Sostenibilità</div>
                        <div className="text-xs text-[#e8fbff]/50">Nov 2025</div>
                      </div>
                    </div>
                    <div className="text-[#10b981] font-semibold">+€40.000</div>
                  </div>
                </div>
              </div>

              {/* Uscite */}
              <div>
                <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-[#ef4444]" />
                  Uscite Fondo
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Rimborsi</div>
                    <div className="text-xl font-bold text-[#ef4444]">€45.000</div>
                  </div>
                  <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Incentivi</div>
                    <div className="text-xl font-bold text-[#f59e0b]">€25.000</div>
                  </div>
                  <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Operativi</div>
                    <div className="text-xl font-bold text-[#8b5cf6]">€5.000</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valore TCC e Statistiche */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Valore TCC */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Coins className="h-5 w-5 text-[#14b8a6]" />
                  Valore Token Carbon Credit (TCC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="text-sm text-[#e8fbff]/70 mb-2">Valore Corrente</div>
                  <div className="text-5xl font-bold text-[#14b8a6] mb-1">€{appliedTccValue.toFixed(2).replace('.', ',')}</div>
                  <div className="text-sm text-[#e8fbff]/50">per 1 TCC</div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-[#e8fbff]/70 mb-3">Storico Variazioni</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                      <span className="text-xs text-[#e8fbff]/70">2025-09-01</span>
                      <span className="text-sm font-semibold text-[#14b8a6]">€1,20</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                      <span className="text-xs text-[#e8fbff]/70">2025-10-01</span>
                      <span className="text-sm font-semibold text-[#14b8a6]">€1,35</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                      <span className="text-xs text-[#e8fbff]/70">2025-11-01</span>
                      <span className="text-sm font-semibold text-[#14b8a6]">€1,50</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rimborsi e Top Negozi */}
            <Card className="bg-[#1a2332] border-[#f59e0b]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Store className="h-5 w-5 text-[#f59e0b]" />
                  Rimborsi Carbon Credit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                    <div className="text-xs text-[#e8fbff]/70 mb-1">In Attesa</div>
                    <div className="text-2xl font-bold text-[#f59e0b]">12</div>
                    <div className="text-xs text-[#e8fbff]/50">€3.450 da processare</div>
                  </div>
                  <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Processati</div>
                    <div className="text-2xl font-bold text-[#10b981]">156</div>
                    <div className="text-xs text-[#e8fbff]/50">€45.000 totali</div>
                  </div>
                </div>

                <h4 className="text-[#e8fbff] font-semibold mb-3">Top Negozi per Crediti Incassati</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#fbbf24] text-black">1°</Badge>
                      <span className="text-sm text-[#e8fbff]">Bio Market Toscana</span>
                    </div>
                    <span className="text-sm font-semibold text-[#10b981]">€8.500</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#94a3b8] text-black">2°</Badge>
                      <span className="text-sm text-[#e8fbff]">Frutta Fresca Modena</span>
                    </div>
                    <span className="text-sm font-semibold text-[#10b981]">€6.200</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#cd7f32] text-black">3°</Badge>
                      <span className="text-sm text-[#e8fbff]">Ortofrutta Km0</span>
                    </div>
                    <span className="text-sm font-semibold text-[#10b981]">€5.100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manopola Politica */}
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Sliders className="h-5 w-5 text-[#8b5cf6]" />
                Manopola Politica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="text-sm text-[#e8fbff]/70 mb-2 block">Regola Valore Base TCC</label>
                <input
                  type="range"
                  min="0"
                  max="5.00"
                  step="0.10"
                  value={tccValue}
                  onChange={(e) => setTccValue(parseFloat(e.target.value))}
                  className="w-full h-2 bg-[#0b1220] rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-[#e8fbff]/50 mt-1">
                  <span>€0,00</span>
                  <span>€2,50</span>
                  <span>€5,00</span>
                </div>
              </div>

              <div className="p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg mb-4">
                <div className="text-sm text-[#e8fbff] font-semibold mb-2">Simulatore Impatto</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Nuovo valore:</span>
                    <span className="text-[#8b5cf6] font-semibold">€{tccValue.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Incremento spesa:</span>
                    <span className="text-[#f59e0b] font-semibold">+€{((tccValue - appliedTccValue) * 1000).toFixed(0)}/mese</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Mesi rimanenti:</span>
                    <span className="text-[#14b8a6] font-semibold">{tccValue > 0 ? (editableParams.fundBalance / (tccValue * 1000)).toFixed(1) : '∞'}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => {
                  setAppliedTccValue(tccValue);
                  toast.success(`Valore TCC aggiornato a €${tccValue.toFixed(2).replace('.', ',')}!`);
                }}
                className="w-full bg-[#8b5cf6] hover:bg-[#8b5cf6]/80"
              >
                <Settings className="h-4 w-4 mr-2" />
                Applica Modifica
              </Button>
            </CardContent>
          </Card>

          {/* Regolazione per Area e Categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Per Area */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#14b8a6]" />
                  Regolazione per Area
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calculateAreaValues().map((area, idx) => (
                    <div key={area.area} className="p-3 bg-[#0b1220] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff] font-medium">{area.area}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={area.boost}
                            onChange={(e) => {
                              const newBoosts = [...editableParams.areaBoosts];
                              newBoosts[idx].boost = parseFloat(e.target.value) || 0;
                              setEditableParams({ ...editableParams, areaBoosts: newBoosts });
                            }}
                            className={`text-sm font-semibold px-2 py-1 rounded w-20 text-center ${
                              area.boost > 0 ? 'bg-[#10b981]/20 text-[#10b981]' :
                              area.boost < 0 ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                              'bg-[#14b8a6]/20 text-[#14b8a6]'
                            }`}
                          />
                          <span className="text-xs text-[#e8fbff]/50">%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#e8fbff]/50">Valore finale:</span>
                        <span className="text-lg font-bold text-[#14b8a6]">€{area.value.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Per Categoria */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#14b8a6]" />
                  Regolazione per Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calculateCategoryValues().map((cat, idx) => (
                    <div key={cat.category} className="p-3 bg-[#0b1220] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff] font-medium">{cat.category}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#e8fbff]/50">+</span>
                          <input
                            type="number"
                            value={cat.boost}
                            onChange={(e) => {
                              const newBoosts = [...editableParams.categoryBoosts];
                              newBoosts[idx].boost = parseFloat(e.target.value) || 0;
                              setEditableParams({ ...editableParams, categoryBoosts: newBoosts });
                            }}
                            className={`text-sm font-semibold px-2 py-1 rounded w-16 text-center ${
                              cat.boost > 0 ? 'bg-[#10b981]/20 text-[#10b981]' :
                              cat.boost < 0 ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                              'bg-[#14b8a6]/20 text-[#14b8a6]'
                            }`}
                          />
                          <span className="text-xs text-[#e8fbff]/50">%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#e8fbff]/50">Valore finale:</span>
                        <span className="text-lg font-bold text-[#14b8a6]">€{cat.finalValue.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sistema Rimborsi Negozi */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#14b8a6]" />
                Sistema Rimborsi Negozi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-[#f59e0b]" />
                    <span className="text-[#e8fbff] font-semibold">Pending</span>
                  </div>
                  <div className="text-3xl font-bold text-[#f59e0b] mb-1">23</div>
                  <div className="text-sm text-[#e8fbff]/70">€8450 da processare</div>
                </div>
                <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-[#10b981]" />
                    <span className="text-[#e8fbff] font-semibold">Processati</span>
                  </div>
                  <div className="text-3xl font-bold text-[#10b981] mb-1">156</div>
                  <div className="text-sm text-[#e8fbff]/70">€45.000 totali</div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-[#e8fbff] font-semibold mb-3">Top Negozi per Crediti Incassati</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                        <span className="text-[#14b8a6] font-bold">#1</span>
                      </div>
                      <span className="text-[#e8fbff]">Bio Market Centrale</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[#14b8a6] font-semibold">12.500 TCC</div>
                      <div className="text-xs text-[#e8fbff]/50">€18.750</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                        <span className="text-[#14b8a6] font-bold">#2</span>
                      </div>
                      <span className="text-[#e8fbff]">Ortofrutta KM0</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[#14b8a6] font-semibold">8.900 TCC</div>
                      <div className="text-xs text-[#e8fbff]/50">€13.350</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                        <span className="text-[#14b8a6] font-bold">#3</span>
                      </div>
                      <span className="text-[#e8fbff]">Formaggi Toscani</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[#14b8a6] font-semibold">6.200 TCC</div>
                      <div className="text-xs text-[#e8fbff]/50">€9300</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 bg-[#14b8a6] hover:bg-[#14b8a6]/80">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button className="flex-1 bg-[#8b5cf6] hover:bg-[#8b5cf6]/80">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Processa Batch
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Economici */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#14b8a6]" />
                Analytics Economici
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-[#0b1220] rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">TCC Emessi (click to edit)</div>
                  <input
                    type="number"
                    value={editableParams.tccIssued}
                    onChange={(e) => setEditableParams({ ...editableParams, tccIssued: parseFloat(e.target.value) || 0 })}
                    className="text-3xl font-bold text-[#14b8a6] bg-transparent border-b-2 border-[#14b8a6]/50 focus:border-[#14b8a6] outline-none w-full"
                  />
                </div>
                <div className="p-4 bg-[#0b1220] rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">TCC Spesi (click to edit)</div>
                  <input
                    type="number"
                    value={editableParams.tccSpent}
                    onChange={(e) => setEditableParams({ ...editableParams, tccSpent: parseFloat(e.target.value) || 0 })}
                    className="text-3xl font-bold text-[#10b981] bg-transparent border-b-2 border-[#10b981]/50 focus:border-[#10b981] outline-none w-full"
                  />
                </div>
                <div className="p-4 bg-[#0b1220] rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Velocity (Utilizzo)</div>
                  <div className="text-3xl font-bold text-[#f59e0b]">{calculateVelocity()}%</div>
                </div>
              </div>

              <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg mb-4">
                <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-[#10b981]" />
                  ROI Sostenibilità
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Investito (Fondo)</div>
                    <div className="text-xl font-bold text-[#e8fbff]">€{editableParams.fundBalance.toLocaleString('it-IT')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#e8fbff]/70 mb-1">CO₂ Risparmiata</div>
                    <div className="text-xl font-bold text-[#10b981]">{calculateCO2Saved()} kg</div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">(1 TCC = 1 kg CO₂)</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Alberi Equivalenti</div>
                    <div className="text-xl font-bold text-[#14b8a6]">{calculateTreesEquivalent()} alberi</div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">(CO₂ / 22 kg/albero)</div>
                  </div>
                </div>
              </div>

              {/* Impatto Fondo */}
              <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                  <Euro className="h-5 w-5 text-[#f59e0b]" />
                  Impatto Fondo Liquidità
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Rimborsi Necessari (TCC Spesi × Valore)</div>
                    <div className="text-xl font-bold text-[#f59e0b]">€{parseFloat(calculateReimbursementNeeded()).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#e8fbff]/70 mb-1">Fondo Disponibile</div>
                    <div className="text-xl font-bold text-[#14b8a6]">€{editableParams.fundBalance.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-[#0b1220] rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#e8fbff]/70">Copertura Fondo</span>
                    <span className="text-lg font-bold text-[#10b981]">
                      {parseFloat(calculateReimbursementNeeded()) > 0 ? ((editableParams.fundBalance / parseFloat(calculateReimbursementNeeded())) * 100).toFixed(1) : '∞'}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-[#0b1220] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#10b981] to-[#14b8a6] transition-all duration-300" 
                      style={{ width: `${Math.min(100, parseFloat(calculateReimbursementNeeded()) > 0 ? (editableParams.fundBalance / parseFloat(calculateReimbursementNeeded())) * 100 : 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integrazione TPAS */}
          <Card className="bg-gradient-to-br from-[#8b5cf6]/10 to-[#8b5cf6]/5 border-[#8b5cf6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#8b5cf6]" />
                Integrazione TPAS (Ready 2027)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">Stub API TPAS</span>
                  <span className="px-3 py-1 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full text-sm font-semibold">Standby</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">Mapping Ecocrediti</span>
                  <span className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] rounded-full text-sm font-semibold">Ready</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">Conversione Automatica</span>
                  <span className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] rounded-full text-sm font-semibold">Ready</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">Fondo TPAS → Fondo DMS</span>
                  <span className="px-3 py-1 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full text-sm font-semibold">2027+</span>
                </div>
                <div className="p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                  <p className="text-sm text-[#e8fbff]/70">
                    Il sistema è predisposto per l'integrazione con TPAS. Quando attivo (2027+), i TCC saranno automaticamente convertiti in Ecocrediti ufficiali e il fondo sarà alimentato dal Fondo TPAS nazionale.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 5: COMUNICAZIONE */}
        {/* ================================================================ */}
        <TabsContent value="comunicazione" className="mt-6">
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#8b5cf6]" />
                Centro Comunicazioni
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Notifiche, campagne e comunicazioni agli stakeholder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 6: REPORT ESG */}
        {/* ================================================================ */}
        <TabsContent value="report-esg" className="mt-6">
          <div className="space-y-6">
            {/* Header Report */}
            <Card className="bg-[#1a2332] border-[#ec4899]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <FileBarChart className="h-5 w-5 text-[#ec4899]" />
                  Report ESG - Indicatori di Sostenibilità
                </CardTitle>
                <CardDescription className="text-[#e8fbff]/60">
                  Environmental, Social, Governance metrics per il territorio
                </CardDescription>
              </CardHeader>
            </Card>

            {/* ESG Scores */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Environmental */}
              <Card className="bg-[#1a2332] border-[#22c55e]/30">
                <CardHeader>
                  <CardTitle className="text-[#22c55e] flex items-center gap-2">
                    <Leaf className="h-5 w-5" />
                    Environmental
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#22c55e]">7.8</div>
                    <div className="text-sm text-[#e8fbff]/60">/10</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">CO2 Risparmiata</span>
                      <span className="text-[#22c55e]">45 ton</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Riduzione Rifiuti</span>
                      <span className="text-[#22c55e]">12%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Energia Verde</span>
                      <span className="text-[#22c55e]">8 Hub</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social */}
              <Card className="bg-[#1a2332] border-[#3b82f6]/30">
                <CardHeader>
                  <CardTitle className="text-[#3b82f6] flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Social
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#3b82f6]">8.2</div>
                    <div className="text-sm text-[#e8fbff]/60">/10</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Occupazione</span>
                      <span className="text-[#3b82f6]">+{vendors.length} imprese</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Eventi Comunitari</span>
                      <span className="text-[#3b82f6]">24/anno</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Volontari Attivi</span>
                      <span className="text-[#3b82f6]">156</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Governance */}
              <Card className="bg-[#1a2332] border-[#a855f7]/30">
                <CardHeader>
                  <CardTitle className="text-[#a855f7] flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Governance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#a855f7]">7.5</div>
                    <div className="text-sm text-[#e8fbff]/60">/10</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Compliance</span>
                      <span className="text-[#a855f7]">98%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Digitalizzazione</span>
                      <span className="text-[#a855f7]">85%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#e8fbff]/70">Trasparenza</span>
                      <span className="text-[#a855f7]">92%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Riepilogo Dati Reali */}
            <Card className="bg-[#1a2332] border-[#ec4899]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff]">Riepilogo Dati Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0b1220] p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-[#06b6d4]">{markets.length}</div>
                    <div className="text-sm text-[#e8fbff]/60">Mercati</div>
                  </div>
                  <div className="bg-[#0b1220] p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-[#14b8a6]">{vendors.length}</div>
                    <div className="text-sm text-[#e8fbff]/60">Imprese</div>
                  </div>
                  <div className="bg-[#0b1220] p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-[#10b981]">{stalls.length}</div>
                    <div className="text-sm text-[#e8fbff]/60">Posteggi</div>
                  </div>
                  <div className="bg-[#0b1220] p-4 rounded-lg text-center">
                    <div className="text-3xl font-bold text-[#f59e0b]">{concessions.length}</div>
                    <div className="text-sm text-[#e8fbff]/60">Concessioni</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
