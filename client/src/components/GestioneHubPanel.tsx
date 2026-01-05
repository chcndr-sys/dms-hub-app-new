/**
 * GestioneHubPanel.tsx
 * 
 * Componente principale per la sezione "Gestione Hub" della Dashboard PA.
 * Fornisce una vista aggregata per stakeholder (Associazioni, Cluster, Regione).
 * 
 * @author Manus AI
 * @date Gennaio 2026
 */

import React, { useState } from 'react';
import { 
  Globe, MapPin, Building2, Coins, Bell, FileBarChart,
  TrendingUp, Users, Store, Leaf, Activity, BarChart3,
  Calendar, Clock, AlertCircle, CheckCircle, Award,
  ArrowUpRight, ArrowDownRight, Filter, Search, Download,
  Settings, Eye, Edit, Plus, RefreshCw
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

// Import componenti esistenti da riutilizzare
import MappaItaliaComponent from './MappaItaliaComponent';
import GestioneHubNegozi from './GestioneHubNegozi';
import ImpreseQualificazioniPanel from './ImpreseQualificazioniPanel';
import WalletPanel from './WalletPanel';
import NotificationsPanel from './NotificationsPanel';

// ============================================================================
// TIPI E INTERFACCE
// ============================================================================

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
}

// ============================================================================
// DATI MOCK PER SVILUPPO UI
// ============================================================================

const mockKPIs: HubKPI[] = [
  { label: 'Hub Attivi', value: 12, trend: 2, icon: Globe, color: '#06b6d4' },
  { label: 'Imprese Aderenti', value: 847, trend: 15, icon: Building2, color: '#14b8a6' },
  { label: 'Flussi Mensili', value: '45.2K', trend: 8, icon: Users, color: '#10b981' },
  { label: 'Crediti Emessi', value: '125K', trend: 22, icon: Coins, color: '#f59e0b' },
  { label: 'Rating ESG', value: '7.8/10', trend: 0.3, icon: Leaf, color: '#22c55e' },
];

const mockHubs: HubData[] = [
  { id: 'HUB-MO-001', name: 'Hub Centro Storico Modena', comune: 'Modena', provincia: 'MO', mercati: 2, negozi: 45, servizi: 12, status: 'attivo', esgRating: 8.2 },
  { id: 'HUB-BO-003', name: 'Hub Quartiere Pilastro', comune: 'Bologna', provincia: 'BO', mercati: 1, negozi: 28, servizi: 8, status: 'attivo', esgRating: 7.5 },
  { id: 'HUB-PR-002', name: 'Hub Oltretorrente', comune: 'Parma', provincia: 'PR', mercati: 1, negozi: 32, servizi: 10, status: 'attivo', esgRating: 7.8 },
  { id: 'HUB-RE-001', name: 'Hub Centro Reggio', comune: 'Reggio Emilia', provincia: 'RE', mercati: 2, negozi: 38, servizi: 15, status: 'in_attivazione', esgRating: 7.2 },
  { id: 'HUB-GR-001', name: 'Hub Grosseto Centro', comune: 'Grosseto', provincia: 'GR', mercati: 1, negozi: 22, servizi: 6, status: 'attivo', esgRating: 7.9 },
];

const mockESGIndicators = {
  environmental: { score: 7.8, co2Saved: 45, wasteReduction: 12, greenEnergy: 8 },
  social: { score: 8.2, employment: 5, events: 24, volunteers: 156 },
  governance: { score: 7.5, compliance: 98, digitalization: 85, transparency: 92 },
};

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

export default function GestioneHubPanel() {
  const [activeSubTab, setActiveSubTab] = useState('cruscotto');
  const [selectedProvincia, setSelectedProvincia] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
          <Select value={selectedProvincia} onValueChange={setSelectedProvincia}>
            <SelectTrigger className="w-[180px] bg-[#0b1220] border-[#06b6d4]/30 text-[#e8fbff]">
              <SelectValue placeholder="Filtra Provincia" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2332] border-[#06b6d4]/30">
              <SelectItem value="all">Tutte le Province</SelectItem>
              <SelectItem value="MO">Modena</SelectItem>
              <SelectItem value="BO">Bologna</SelectItem>
              <SelectItem value="PR">Parma</SelectItem>
              <SelectItem value="RE">Reggio Emilia</SelectItem>
              <SelectItem value="GR">Grosseto</SelectItem>
            </SelectContent>
          </Select>
          
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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {mockKPIs.map((kpi, index) => (
              <Card key={index} className="bg-[#1a2332] border-[#06b6d4]/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${kpi.trend > 0 ? 'text-[#10b981] border-[#10b981]/30' : 'text-[#ef4444] border-[#ef4444]/30'}`}
                    >
                      {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
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
                  {/* Qui integriamo MappaItaliaComponent in modalità read-only */}
                  <div className="w-full h-full bg-[#0b1220] rounded-lg flex items-center justify-center border border-[#06b6d4]/20">
                    <div className="text-center">
                      <Globe className="h-16 w-16 text-[#06b6d4]/40 mx-auto mb-4" />
                      <p className="text-[#e8fbff]/60">Mappa Hub Integrata</p>
                      <p className="text-xs text-[#e8fbff]/40 mt-1">Visualizzazione aggregata di tutti gli Hub</p>
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
                  {/* Alert Items */}
                  <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-[#f59e0b] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#e8fbff] font-medium">3 concessioni in scadenza</p>
                        <p className="text-xs text-[#e8fbff]/60 mt-1">Entro 30 giorni - Hub Modena</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileBarChart className="h-4 w-4 text-[#06b6d4] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#e8fbff] font-medium">Report mensile disponibile</p>
                        <p className="text-xs text-[#e8fbff]/60 mt-1">Dicembre 2025 - Scarica PDF</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-[#10b981] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#e8fbff] font-medium">2 nuove adesioni</p>
                        <p className="text-xs text-[#e8fbff]/60 mt-1">Hub Bologna - In attesa approvazione</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-[#8b5cf6] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#e8fbff] font-medium">Evento: Festival Prossimità</p>
                        <p className="text-xs text-[#e8fbff]/60 mt-1">15 Gennaio 2026 - Tutti gli Hub</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#ec4899]/10 border border-[#ec4899]/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-[#ec4899] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#e8fbff] font-medium">Rating ESG migliorato</p>
                        <p className="text-xs text-[#e8fbff]/60 mt-1">+0.3 punti vs mese precedente</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lista Hub Rapida */}
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
                {mockHubs.slice(0, 6).map((hub) => (
                  <div 
                    key={hub.id} 
                    className="p-4 bg-[#0b1220] rounded-lg border border-[#06b6d4]/20 hover:border-[#06b6d4]/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-[#e8fbff] font-medium text-sm">{hub.name}</h4>
                        <p className="text-xs text-[#e8fbff]/60">{hub.comune} ({hub.provincia})</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          hub.status === 'attivo' 
                            ? 'text-[#10b981] border-[#10b981]/30' 
                            : 'text-[#f59e0b] border-[#f59e0b]/30'
                        }`}
                      >
                        {hub.status === 'attivo' ? '● Attivo' : '○ In attivazione'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#e8fbff]/70 mt-3">
                      <span>🏪 {hub.mercati} mercati</span>
                      <span>🏬 {hub.negozi} negozi</span>
                      <span>⚙️ {hub.servizi} servizi</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#06b6d4]/10">
                      <span className="text-xs text-[#e8fbff]/60">Rating ESG</span>
                      <span className="text-sm font-semibold text-[#10b981]">{hub.esgRating}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 2: RETE HUB */}
        {/* ================================================================ */}
        <TabsContent value="rete-hub" className="space-y-6 mt-6">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#14b8a6]" />
                Rete Hub - Anagrafica e Mappa
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Gestione completa degli Hub Urbani e di Prossimità
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Integrazione componente GestioneHubNegozi esistente */}
              <GestioneHubNegozi />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 3: IMPRESE ADERENTI */}
        {/* ================================================================ */}
        <TabsContent value="imprese" className="space-y-6 mt-6">
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#10b981]" />
                Imprese Aderenti agli Hub
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Anagrafica imprese, qualificazioni e sistema badge
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Integrazione componente ImpreseQualificazioniPanel esistente */}
              <ImpreseQualificazioniPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 4: ECOCARBONCREDIT */}
        {/* ================================================================ */}
        <TabsContent value="ecocarbon" className="space-y-6 mt-6">
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Coins className="h-5 w-5 text-[#f59e0b]" />
                Sistema EcoCarbonCredit
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Configurazione e monitoraggio crediti premianti
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Integrazione componente WalletPanel esistente */}
              <WalletPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 5: COMUNICAZIONE & EVENTI */}
        {/* ================================================================ */}
        <TabsContent value="comunicazione" className="space-y-6 mt-6">
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#8b5cf6]" />
                Comunicazione & Eventi
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Gestione campagne, notifiche e calendario eventi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Integrazione componente NotificationsPanel esistente */}
              <NotificationsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* TAB 6: REPORTISTICA & ESG */}
        {/* ================================================================ */}
        <TabsContent value="report-esg" className="space-y-6 mt-6">
          {/* Indicatori ESG */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Environmental */}
            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#10b981] flex items-center gap-2 text-lg">
                  <Leaf className="h-5 w-5" />
                  Environmental
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#e8fbff] mb-4">
                  {mockESGIndicators.environmental.score}<span className="text-lg text-[#e8fbff]/60">/10</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">CO₂ Evitata</span>
                    <span className="text-[#10b981]">-{mockESGIndicators.environmental.co2Saved} ton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Riduzione Rifiuti</span>
                    <span className="text-[#10b981]">-{mockESGIndicators.environmental.wasteReduction}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Energia Green</span>
                    <span className="text-[#10b981]">+{mockESGIndicators.environmental.greenEnergy}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social */}
            <Card className="bg-[#1a2332] border-[#06b6d4]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#06b6d4] flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Social
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#e8fbff] mb-4">
                  {mockESGIndicators.social.score}<span className="text-lg text-[#e8fbff]/60">/10</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Occupazione</span>
                    <span className="text-[#06b6d4]">+{mockESGIndicators.social.employment}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Eventi Organizzati</span>
                    <span className="text-[#06b6d4]">{mockESGIndicators.social.events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Volontari Attivi</span>
                    <span className="text-[#06b6d4]">{mockESGIndicators.social.volunteers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Governance */}
            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#8b5cf6] flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5" />
                  Governance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-[#e8fbff] mb-4">
                  {mockESGIndicators.governance.score}<span className="text-lg text-[#e8fbff]/60">/10</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Compliance</span>
                    <span className="text-[#8b5cf6]">{mockESGIndicators.governance.compliance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Digitalizzazione</span>
                    <span className="text-[#8b5cf6]">{mockESGIndicators.governance.digitalization}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Trasparenza</span>
                    <span className="text-[#8b5cf6]">{mockESGIndicators.governance.transparency}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Preconfigurati */}
          <Card className="bg-[#1a2332] border-[#ec4899]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-[#ec4899]" />
                Report Preconfigurati
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0b1220] rounded-lg border border-[#06b6d4]/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-[#e8fbff] font-medium">Report Mensile Hub</h4>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">Ultimo: 01/01/2026 | Prossimo: 01/02/2026</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4]">
                      Genera
                    </Button>
                    <Button size="sm" variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4]">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-[#0b1220] rounded-lg border border-[#06b6d4]/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-[#e8fbff] font-medium">Rendicontazione PNRR</h4>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">Ultimo: 15/12/2025 | Prossimo: 15/03/2026</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4]">
                      Genera
                    </Button>
                    <Button size="sm" variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4]">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-[#0b1220] rounded-lg border border-[#06b6d4]/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-[#e8fbff] font-medium">Report ESG Annuale</h4>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">Ultimo: 31/12/2025 | Prossimo: 31/12/2026</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4]">
                      Genera
                    </Button>
                    <Button size="sm" variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4]">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-[#0b1220] rounded-lg border border-[#06b6d4]/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-[#e8fbff] font-medium">Export Dati Completo</h4>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">Formati: CSV | Excel | JSON | PDF</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-[#06b6d4]/30 text-[#06b6d4]">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
