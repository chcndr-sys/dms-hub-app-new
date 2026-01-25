/**
 * ControlliSanzioniPanel - Modulo Controlli e Sanzioni per Polizia Municipale
 * Versione: 1.0.0
 * Data: 25 Gennaio 2026
 */

import { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, FileText, 
  MapPin, Search, Filter, Plus, Euro, Bell, Eye, 
  ChevronRight, RefreshCw, Building2, Store, Truck,
  ClipboardCheck, AlertCircle, Calendar, User, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { MarketMapComponent } from '@/components/MarketMapComponent';

// API Base URL
const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';

// Types
interface InspectionStats {
  controlli: {
    total: number;
    regolari: number;
    non_regolari: number;
    pending: number;
    oggi: number;
  };
  sanzioni: {
    total_verbali: string;
    totale_importi: string;
    pagati: string;
    non_pagati: string;
    in_ritardo: string;
  };
  watchlist: {
    da_controllare: number;
  };
}

interface WatchlistItem {
  id: number;
  impresa_id: number;
  impresa_nome: string;
  partita_iva: string;
  trigger_type: string;
  trigger_description: string;
  priority: string;
  status: string;
  created_at: string;
}

interface Sanction {
  id: number;
  verbale_code: string;
  impresa_nome: string;
  partita_iva: string;
  infraction_code: string;
  infraction_description: string;
  amount: string;
  payment_status: string;
  issue_date: string;
  due_date: string;
}

interface InfractionType {
  id: number;
  code: string;
  description: string;
  category: string;
  min_amount: string;
  max_amount: string;
  default_amount: string;
}

export default function ControlliSanzioniPanel() {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [infractionTypes, setInfractionTypes] = useState<InfractionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch stats
      const statsRes = await fetch(`${MIHUB_API}/inspections/stats`);
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      // Fetch watchlist
      const watchlistRes = await fetch(`${MIHUB_API}/watchlist?status=PENDING&limit=20`);
      const watchlistData = await watchlistRes.json();
      if (watchlistData.success) setWatchlist(watchlistData.data);

      // Fetch sanctions
      const sanctionsRes = await fetch(`${MIHUB_API}/sanctions?limit=20`);
      const sanctionsData = await sanctionsRes.json();
      if (sanctionsData.success) setSanctions(sanctionsData.data);

      // Fetch infraction types
      const typesRes = await fetch(`${MIHUB_API}/sanctions/types`);
      const typesData = await typesRes.json();
      if (typesData.success) setInfractionTypes(typesData.data);

    } catch (err) {
      setError('Errore nel caricamento dei dati');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ALTA': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIA': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGATO': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pagato</Badge>;
      case 'NON_PAGATO': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Non Pagato</Badge>;
      case 'IN_RITARDO': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">In Ritardo</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400">{status}</Badge>;
    }
  };

  // Category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MERCATO': return <Store className="h-4 w-4" />;
      case 'NEGOZIO': return <Building2 className="h-4 w-4" />;
      case 'AMBULANTE': return <Truck className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-[#f59e0b] animate-spin" />
        <span className="ml-3 text-[#e8fbff]/70">Caricamento dati...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con titolo e azioni */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#f59e0b]/10 rounded-lg">
            <Shield className="h-6 w-6 text-[#f59e0b]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e8fbff]">Controlli e Sanzioni</h2>
            <p className="text-sm text-[#e8fbff]/60">Polizia Municipale - Gestione Controlli Commercio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAllData}
            className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button 
            size="sm" 
            className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Controllo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 border-[#3b82f6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Controlli Totali</p>
                <p className="text-3xl font-bold text-[#3b82f6]">{stats?.controlli.total || 0}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-[#3b82f6]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Oggi: {stats?.controlli.oggi || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border-[#10b981]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Regolari</p>
                <p className="text-3xl font-bold text-[#10b981]">{stats?.controlli.regolari || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#10b981]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              {stats?.controlli.total ? Math.round((stats.controlli.regolari / stats.controlli.total) * 100) : 0}% del totale
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/5 border-[#ef4444]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Violazioni</p>
                <p className="text-3xl font-bold text-[#ef4444]">{stats?.controlli.non_regolari || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ef4444]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Verbali: {stats?.sanzioni.total_verbali || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border-[#f59e0b]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Da Controllare</p>
                <p className="text-3xl font-bold text-[#f59e0b]">{stats?.watchlist.da_controllare || 0}</p>
              </div>
              <Bell className="h-8 w-8 text-[#f59e0b]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Watchlist attiva
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/5 border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Importo Sanzioni</p>
                <p className="text-2xl font-bold text-[#14b8a6]">
                  €{parseFloat(stats?.sanzioni.totale_importi || '0').toLocaleString('it-IT')}
                </p>
              </div>
              <Euro className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Non pagati: {stats?.sanzioni.non_pagati || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="bg-[#1a2332] border border-[#3b82f6]/20 p-1">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <Eye className="h-4 w-4 mr-2" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger 
            value="watchlist" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <Bell className="h-4 w-4 mr-2" />
            Da Controllare ({stats?.watchlist.da_controllare || 0})
          </TabsTrigger>
          <TabsTrigger 
            value="sanctions" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Verbali ({stats?.sanzioni.total_verbali || 0})
          </TabsTrigger>
          <TabsTrigger 
            value="infractions" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Tipi Infrazione
          </TabsTrigger>
        </TabsList>

        {/* Tab: Panoramica */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ultimi Controlli */}
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-[#3b82f6]" />
                  Ultimi Controlli
                </CardTitle>
              </CardHeader>
              <CardContent>
                {watchlist.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-[#3b82f6]/30 mx-auto mb-3" />
                    <p className="text-[#e8fbff]/50">Nessun controllo recente</p>
                    <p className="text-[#e8fbff]/30 text-sm mt-1">I controlli appariranno qui</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {watchlist.slice(0, 5).map((item) => (
                      <div key={item.id} className="p-3 bg-[#0b1220] rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-[#e8fbff] font-medium text-sm">{item.impresa_nome || 'N/D'}</p>
                          <p className="text-[#e8fbff]/50 text-xs">{item.trigger_description}</p>
                        </div>
                        <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ultimi Verbali */}
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#ef4444]" />
                  Ultimi Verbali
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sanctions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-[#ef4444]/30 mx-auto mb-3" />
                    <p className="text-[#e8fbff]/50">Nessun verbale emesso</p>
                    <p className="text-[#e8fbff]/30 text-sm mt-1">I verbali appariranno qui</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sanctions.slice(0, 5).map((sanction) => (
                      <div key={sanction.id} className="p-3 bg-[#0b1220] rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-[#e8fbff] font-medium text-sm">{sanction.verbale_code}</p>
                          <p className="text-[#e8fbff]/50 text-xs">{sanction.impresa_nome || 'N/D'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#ef4444] font-bold">€{parseFloat(sanction.amount).toLocaleString('it-IT')}</p>
                          {getPaymentStatusBadge(sanction.payment_status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistiche Pagamenti */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
                <Euro className="h-4 w-4 text-[#14b8a6]" />
                Stato Pagamenti Sanzioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0b1220] rounded-lg text-center">
                  <p className="text-[#e8fbff]/60 text-xs mb-1">Totale Verbali</p>
                  <p className="text-2xl font-bold text-[#e8fbff]">{stats?.sanzioni.total_verbali || 0}</p>
                </div>
                <div className="p-4 bg-[#10b981]/10 rounded-lg text-center border border-[#10b981]/20">
                  <p className="text-[#10b981]/80 text-xs mb-1">Pagati</p>
                  <p className="text-2xl font-bold text-[#10b981]">{stats?.sanzioni.pagati || 0}</p>
                </div>
                <div className="p-4 bg-[#ef4444]/10 rounded-lg text-center border border-[#ef4444]/20">
                  <p className="text-[#ef4444]/80 text-xs mb-1">Non Pagati</p>
                  <p className="text-2xl font-bold text-[#ef4444]">{stats?.sanzioni.non_pagati || 0}</p>
                </div>
                <div className="p-4 bg-[#f59e0b]/10 rounded-lg text-center border border-[#f59e0b]/20">
                  <p className="text-[#f59e0b]/80 text-xs mb-1">In Ritardo</p>
                  <p className="text-2xl font-bold text-[#f59e0b]">{stats?.sanzioni.in_ritardo || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Watchlist (Da Controllare) */}
        <TabsContent value="watchlist" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#f59e0b]" />
                  Lista Controlli da Effettuare
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Cerca impresa..." 
                    className="w-64 bg-[#0b1220] border-[#3b82f6]/30 text-[#e8fbff]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Imprese con irregolarità, scadenze o segnalazioni da verificare
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchlist.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-[#10b981]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/70 text-lg">Nessun controllo in sospeso</p>
                  <p className="text-[#e8fbff]/40 text-sm mt-2">Tutte le imprese sono in regola</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchlist
                    .filter(item => 
                      !searchTerm || 
                      item.impresa_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.partita_iva?.includes(searchTerm)
                    )
                    .map((item) => (
                    <div key={item.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10 hover:border-[#f59e0b]/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            item.priority === 'URGENTE' ? 'bg-red-500/20' :
                            item.priority === 'ALTA' ? 'bg-orange-500/20' : 'bg-yellow-500/20'
                          }`}>
                            <AlertTriangle className={`h-5 w-5 ${
                              item.priority === 'URGENTE' ? 'text-red-400' :
                              item.priority === 'ALTA' ? 'text-orange-400' : 'text-yellow-400'
                            }`} />
                          </div>
                          <div>
                            <p className="text-[#e8fbff] font-semibold">{item.impresa_nome || 'Impresa N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-sm">P.IVA: {item.partita_iva || 'N/D'}</p>
                            <p className="text-[#e8fbff]/40 text-xs mt-1">{item.trigger_description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                          <Badge className="bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30">
                            {item.trigger_type.replace(/_/g, ' ')}
                          </Badge>
                          <Button size="sm" variant="outline" className="border-[#f59e0b]/30 text-[#f59e0b]">
                            <Eye className="h-4 w-4 mr-1" />
                            Dettagli
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Verbali */}
        <TabsContent value="sanctions" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#ef4444]" />
                  Registro Verbali
                </CardTitle>
                <Button size="sm" className="bg-[#ef4444] hover:bg-[#ef4444]/80 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Verbale
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sanctions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-[#ef4444]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/70 text-lg">Nessun verbale emesso</p>
                  <p className="text-[#e8fbff]/40 text-sm mt-2">I verbali emessi appariranno qui</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#3b82f6]/20">
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">CODICE</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">IMPRESA</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">INFRAZIONE</th>
                        <th className="text-right p-3 text-[#e8fbff]/60 text-xs font-medium">IMPORTO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">STATO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">SCADENZA</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sanctions.map((sanction) => (
                        <tr key={sanction.id} className="border-b border-[#3b82f6]/10 hover:bg-[#0b1220]/50">
                          <td className="p-3">
                            <span className="text-[#e8fbff] font-mono text-sm">{sanction.verbale_code}</span>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff] text-sm">{sanction.impresa_nome || 'N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{sanction.partita_iva}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff]/80 text-sm">{sanction.infraction_code}</p>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-[#ef4444] font-bold">€{parseFloat(sanction.amount).toLocaleString('it-IT')}</span>
                          </td>
                          <td className="p-3 text-center">
                            {getPaymentStatusBadge(sanction.payment_status)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/60 text-sm">
                              {sanction.due_date ? new Date(sanction.due_date).toLocaleDateString('it-IT') : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button size="sm" variant="ghost" className="text-[#3b82f6] hover:bg-[#3b82f6]/10">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-[#10b981] hover:bg-[#10b981]/10">
                              <Download className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tipi Infrazione */}
        <TabsContent value="infractions" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#3b82f6]" />
                Catalogo Tipi di Infrazione
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Elenco delle infrazioni configurate per il commercio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {infractionTypes.map((type) => (
                  <div key={type.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(type.category)}
                      <Badge className="bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30 text-xs">
                        {type.category}
                      </Badge>
                    </div>
                    <p className="text-[#e8fbff] font-medium text-sm mb-1">{type.code.replace(/_/g, ' ')}</p>
                    <p className="text-[#e8fbff]/50 text-xs mb-3">{type.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#e8fbff]/40">
                        Min: €{parseFloat(type.min_amount).toLocaleString('it-IT')}
                      </span>
                      <span className="text-[#ef4444] font-bold">
                        €{parseFloat(type.default_amount).toLocaleString('it-IT')}
                      </span>
                      <span className="text-[#e8fbff]/40">
                        Max: €{parseFloat(type.max_amount).toLocaleString('it-IT')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
