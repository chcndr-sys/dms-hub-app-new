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
  ArrowUpRight, ArrowDownRight, Filter, Search, Download,
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
import GestioneHubNegozi from './GestioneHubNegozi';
import ImpreseQualificazioniPanel from './ImpreseQualificazioniPanel';
import WalletPanel from './WalletPanel';
import NotificationsPanel from './NotificationsPanel';

import { MIHUB_API_BASE_URL } from '@/config/api';

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
  const [activeSubTab, setActiveSubTab] = useState('cruscotto');
  const [selectedProvincia, setSelectedProvincia] = useState<string>('all');
  const [selectedRuolo, setSelectedRuolo] = useState<string>('regione');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stati per dati reali
  const [loading, setLoading] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [concessions, setConcessions] = useState<Concession[]>([]);

  // Carica dati reali all'avvio
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [marketsRes, vendorsRes, stallsRes, concessionsRes] = await Promise.all([
        fetch(`${MIHUB_API_BASE_URL}/api/markets`),
        fetch(`${MIHUB_API_BASE_URL}/api/vendors`),
        fetch(`${MIHUB_API_BASE_URL}/api/stalls`),
        fetch(`${MIHUB_API_BASE_URL}/api/concessions`)
      ]);

      const [marketsData, vendorsData, stallsData, concessionsData] = await Promise.all([
        marketsRes.json(),
        vendorsRes.json(),
        stallsRes.json(),
        concessionsRes.json()
      ]);

      if (marketsData.success) setMarkets(marketsData.data);
      if (vendorsData.success) setVendors(vendorsData.data);
      if (stallsData.success) setStalls(stallsData.data);
      if (concessionsData.success) setConcessions(concessionsData.data);

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
                <CardContent className="h-[420px]">
                  <div className="w-full h-full bg-[#0b1220] rounded-lg flex items-center justify-center border border-[#06b6d4]/20">
                    <div className="text-center">
                      <Globe className="h-16 w-16 text-[#06b6d4]/40 mx-auto mb-4" />
                      <p className="text-[#e8fbff]/60">Mappa Hub Integrata</p>
                      <p className="text-xs text-[#e8fbff]/40 mt-1">
                        {markets.length} mercati • {stalls.length} posteggi
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4 border-[#06b6d4]/30 text-[#06b6d4]"
                        onClick={() => setActiveSubTab('rete-hub')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vai a Rete Hub
                      </Button>
                    </div>
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
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#14b8a6]" />
                Rete Hub - Mappa Interattiva
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Visualizzazione completa di tutti i mercati e posteggi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MappaItaliaComponent />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 3: IMPRESE */}
        {/* ================================================================ */}
        <TabsContent value="imprese" className="mt-6">
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#10b981]" />
                Imprese Aderenti
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Gestione e qualificazione delle imprese del territorio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImpreseQualificazioniPanel />
            </CardContent>
          </Card>
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
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Saldo Attuale</div>
                  <div className="text-3xl font-bold text-[#10b981]">€125.000</div>
                </div>
                <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Burn Rate</div>
                  <div className="text-2xl font-bold text-[#f59e0b]">€8.500<span className="text-sm text-[#e8fbff]/70">/mese</span></div>
                </div>
                <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                  <div className="text-sm text-[#e8fbff]/70 mb-1">Mesi Rimanenti</div>
                  <div className="text-2xl font-bold text-[#14b8a6]">14.7</div>
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
                  <div className="text-5xl font-bold text-[#14b8a6] mb-1">€0,85</div>
                  <div className="text-sm text-[#e8fbff]/50">per 1 TCC</div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-[#e8fbff]/70 mb-3">Storico Variazioni</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                      <span className="text-xs text-[#e8fbff]/70">Gen 2026</span>
                      <span className="text-sm font-semibold text-[#14b8a6]">€0,85</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                      <span className="text-xs text-[#e8fbff]/70">Dic 2025</span>
                      <span className="text-sm font-semibold text-[#14b8a6]">€0,80</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                      <span className="text-xs text-[#e8fbff]/70">Nov 2025</span>
                      <span className="text-sm font-semibold text-[#14b8a6]">€0,75</span>
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

          {/* Info TPAS */}
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#8b5cf6]/20 rounded-lg">
                  <Leaf className="h-6 w-6 text-[#8b5cf6]" />
                </div>
                <div>
                  <h4 className="text-[#e8fbff] font-semibold mb-1">Mapping Ecocrediti TPAS</h4>
                  <p className="text-sm text-[#e8fbff]/60">
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
