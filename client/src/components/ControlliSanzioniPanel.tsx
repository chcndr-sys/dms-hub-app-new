/**
 * ControlliSanzioniPanel - Modulo Controlli e Sanzioni per Polizia Municipale
 * Versione: 2.0.0
 * Data: 25 Gennaio 2026
 * 
 * Sotto-tab:
 * 1. Panoramica - KPI e overview
 * 2. Da Controllare - Watchlist imprese
 * 3. Verbali - Lista verbali emessi
 * 4. Tipi Infrazione - Catalogo infrazioni
 * 5. Pratiche SUAP - Nuove pratiche, concessioni, autorizzazioni
 * 6. Notifiche PM - Sistema invio notifiche
 */

import { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, FileText, 
  Search, Filter, Plus, Euro, Bell, Eye, Send,
  ChevronRight, RefreshCw, Building2, Store, Truck,
  ClipboardCheck, AlertCircle, Calendar, User, Download,
  FileCheck, Briefcase, X, MessageSquare, ExternalLink,
  Navigation, MapPin, Info
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// API Base URL
const MIHUB_API = 'https://api.mio-hub.me/api';

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

interface SuapPratica {
  id: number;
  numero_pratica: string;
  tipo_pratica: string;
  stato: string;
  impresa_nome: string;
  comune_nome: string;
  data_presentazione: string;
  data_scadenza: string;
}

interface Impresa {
  id: number;
  denominazione: string;
  partita_iva: string;
}

interface RispostaPM {
  id: number;
  mittente_id: number;
  mittente_nome: string;
  titolo: string;
  messaggio: string;
  tipo_messaggio: string;
  created_at: string;
  letta: boolean;
}

interface MarketSession {
  id: number;
  market_id: number;
  market_name: string;
  comune: string;
  data_mercato: string;
  ora_apertura: string | null;
  ora_chiusura: string | null;
  stato: string;
  totale_presenze: number;
  totale_incassato: string;
  posteggi_occupati: number;
  note: string | null;
  chiuso_da: string | null;
  created_at: string;
}

interface SessionDetail {
  id: number;
  stall_id: number;
  stall_number: string;
  area_mq: string;
  impresa_id: number;
  impresa_nome: string;
  impresa_piva: string;
  tipo_presenza: string;
  giorno: string;
  ora_accesso: string;
  ora_uscita: string | null;
  ora_rifiuti: string | null;
  importo_addebitato: string;
  presenze_totali: number;
  assenze_non_giustificate: number;
}

interface Transgression {
  id: number;
  market_id: number;
  market_name: string;
  market_date: string;
  business_id: number;
  business_name: string;
  business_cf: string;
  transgression_type: string;
  status: string;
  justification_deadline: string;
  justification_file_path: string | null;
  justification_status: string | null;
  justification_notes: string | null;
  justification_display_status: string;
  days_remaining: number;
  created_at: string;
}

export default function ControlliSanzioniPanel() {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [infractionTypes, setInfractionTypes] = useState<InfractionType[]>([]);
  const [praticheSuap, setPraticheSuap] = useState<SuapPratica[]>([]);
  const [impreseList, setImpreseList] = useState<Impresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showNuovoControlloModal, setShowNuovoControlloModal] = useState(false);
  const [nuovoControlloLoading, setNuovoControlloLoading] = useState(false);
  const [showNuovoVerbaleModal, setShowNuovoVerbaleModal] = useState(false);
  const [nuovoVerbaleLoading, setNuovoVerbaleLoading] = useState(false);
  const [invioNotificaLoading, setInvioNotificaLoading] = useState(false);
  const [rispostePM, setRispostePM] = useState<RispostaPM[]>([]);
  const [risposteLoading, setRisposteLoading] = useState(false);
  const [selectedRisposta, setSelectedRisposta] = useState<RispostaPM | null>(null);
  const [showRispostaModal, setShowRispostaModal] = useState(false);
  const [transgressions, setTransgressions] = useState<Transgression[]>([]);
  const [transgressionsLoading, setTransgressionsLoading] = useState(false);
  
  // Storico sessioni mercato
  const [marketSessions, setMarketSessions] = useState<MarketSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MarketSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [storicoDateFilter, setStoricoDateFilter] = useState<string>('');
  
  // Modal dettaglio watchlist
  const [selectedWatchlistItem, setSelectedWatchlistItem] = useState<WatchlistItem | null>(null);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [watchlistPosteggio, setWatchlistPosteggio] = useState<{lat: number, lng: number, numero: string} | null>(null);

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
      if (watchlistData.success) setWatchlist(watchlistData.data || []);

      // Fetch sanctions
      const sanctionsRes = await fetch(`${MIHUB_API}/sanctions?limit=20`);
      const sanctionsData = await sanctionsRes.json();
      if (sanctionsData.success) setSanctions(sanctionsData.data || []);

      // Fetch infraction types
      const typesRes = await fetch(`${MIHUB_API}/sanctions/types`);
      const typesData = await typesRes.json();
      if (typesData.success) setInfractionTypes(typesData.data || []);

      // Fetch pratiche SUAP (solo espletate, negate, revocate)
      const praticheRes = await fetch(`${MIHUB_API}/suap/pratiche?limit=50&stato=APPROVATA,RIFIUTATA,REVOCATA`);
      const praticheData = await praticheRes.json();
      if (praticheData.success) setPraticheSuap(praticheData.data || []);

      // Fetch imprese list for notifications
      const impreseRes = await fetch(`${MIHUB_API}/imprese?limit=100`);
      const impreseData = await impreseRes.json();
      if (impreseData.success) setImpreseList(impreseData.data || []);

      // Fetch risposte PM (risposte delle imprese destinate alla PM)
      const risposteRes = await fetch(`${MIHUB_API}/notifiche/risposte`);
      const risposteData = await risposteRes.json();
      if (risposteData.success) {
        // Filtra solo le risposte destinate alla Polizia Municipale
        const rispostePMFiltered = (risposteData.data || []).filter(
          (r: any) => r.target_tipo === 'POLIZIA_MUNICIPALE'
        );
        setRispostePM(rispostePMFiltered);
      }

      // Fetch trasgressioni in attesa di giustifica
      const transgressionsRes = await fetch(`${MIHUB_API}/market-settings/transgressions/pending-justifications`);
      const transgressionsData = await transgressionsRes.json();
      if (transgressionsData.success) setTransgressions(transgressionsData.data || []);

      // Fetch storico sessioni mercato (usa nuovo endpoint market_sessions)
      const sessionsRes = await fetch(`${MIHUB_API}/presenze/sessioni?limit=50`);
      const sessionsData = await sessionsRes.json();
      if (sessionsData.success) setMarketSessions(sessionsData.data || []);

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

  // Pratica status badge
  const getPraticaStatusBadge = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'APPROVATA': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approvata</Badge>;
      case 'RIFIUTATA': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rifiutata</Badge>;
      case 'IN_LAVORAZIONE': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Lavorazione</Badge>;
      case 'IN_ATTESA': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Attesa</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400">{stato}</Badge>;
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

  // Handle nuovo controllo submit
  const handleNuovoControlloSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNuovoControlloLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      business_id: formData.get('impresa_id'),
      type: formData.get('tipo_controllo') || 'CONTROLLO_PM',
      notes: formData.get('note') || '',
      inspector: 'Polizia Municipale',
      status: 'scheduled'
    };

    try {
      const response = await fetch(`${MIHUB_API}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Controllo registrato con successo!');
        setShowNuovoControlloModal(false);
        fetchAllData();
      } else {
        alert('❌ Errore: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      alert('❌ Errore nella registrazione del controllo');
    } finally {
      setNuovoControlloLoading(false);
    }
  };

  // Handle nuovo verbale submit
  const handleNuovoVerbaleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNuovoVerbaleLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const impresaId = formData.get('impresa_id');
    const infractionCode = formData.get('infraction_code') as string;
    const amount = formData.get('amount');
    const description = formData.get('description');
    const luogoAccertamento = formData.get('luogo_accertamento');
    
    // Genera codice verbale
    const verbaleCode = `PM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const data = {
      impresa_id: impresaId,
      infraction_code: infractionCode,
      verbale_code: verbaleCode,
      amount: parseFloat(amount as string) || 0,
      description: description || `Verbale per ${infractionCode}`,
      luogo_accertamento: luogoAccertamento || 'Non specificato'
    };

    try {
      const response = await fetch(`${MIHUB_API}/sanctions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Verbale ${verbaleCode} emesso con successo! Notifica inviata all'impresa.`);
        setShowNuovoVerbaleModal(false);
        fetchAllData();
      } else {
        alert('❌ Errore: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      alert('❌ Errore nella creazione del verbale');
    } finally {
      setNuovoVerbaleLoading(false);
    }
  };

  // Handle invio notifica PM
  const handleInvioNotifica = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInvioNotificaLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const targetTipo = formData.get('target_tipo') as string;
    const targetId = formData.get('target_id') as string;
    
    let targetNome = '';
    if (targetTipo === 'IMPRESA' && targetId) {
      const impresa = impreseList.find(i => i.id === parseInt(targetId));
      targetNome = impresa?.denominazione || '';
    }

    try {
      const response = await fetch(`${MIHUB_API}/notifiche/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mittente_tipo: 'POLIZIA_MUNICIPALE',
          mittente_id: 1,
          mittente_nome: 'Polizia Municipale',
          titolo: formData.get('titolo'),
          messaggio: formData.get('messaggio'),
          tipo_messaggio: formData.get('tipo_messaggio'),
          target_tipo: targetTipo,
          target_id: targetId || null,
          target_nome: targetNome
        })
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Notifica inviata con successo a ${data.data?.destinatari_count || 0} destinatari!`);
        (e.target as HTMLFormElement).reset();
      } else {
        alert('❌ Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      alert('❌ Errore invio notifica');
    } finally {
      setInvioNotificaLoading(false);
    }
  };

  // Loading inline - la UI rimane sempre visibile
  const isLoading = loading;

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
            disabled={isLoading}
            className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Caricamento...' : 'Aggiorna'}
          </Button>
          <Button 
            size="sm" 
            className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black"
            onClick={() => setShowNuovoControlloModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Controllo
          </Button>
        </div>
      </div>

      {/* Modal Nuovo Controllo */}
      {showNuovoControlloModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-[#f59e0b]/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#e8fbff]">Nuovo Controllo</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNuovoControlloModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleNuovoControlloSubmit} className="space-y-4">
              <div>
                <Label className="text-[#e8fbff]/70">Impresa</Label>
                <select 
                  name="impresa_id" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#f59e0b]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="">Seleziona impresa...</option>
                  {impreseList.map(imp => (
                    <option key={imp.id} value={imp.id}>{imp.denominazione} - {imp.partita_iva}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Tipo Controllo</Label>
                <select 
                  name="tipo_controllo" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#f59e0b]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="ORDINARIO">Controllo Ordinario</option>
                  <option value="STRAORDINARIO">Controllo Straordinario</option>
                  <option value="SU_SEGNALAZIONE">Su Segnalazione</option>
                  <option value="VERIFICA_DOCUMENTALE">Verifica Documentale</option>
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Note</Label>
                <Textarea 
                  name="note" 
                  placeholder="Note sul controllo..."
                  className="mt-1 bg-[#0b1220] border-[#f59e0b]/30 text-[#e8fbff]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNuovoControlloModal(false)}
                  className="flex-1 border-[#e8fbff]/20"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={nuovoControlloLoading}
                  className="flex-1 bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black"
                >
                  {nuovoControlloLoading ? 'Salvataggio...' : 'Registra Controllo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuovo Verbale */}
      {showNuovoVerbaleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-[#ef4444]/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#e8fbff]">Nuovo Verbale</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNuovoVerbaleModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleNuovoVerbaleSubmit} className="space-y-4">
              <div>
                <Label className="text-[#e8fbff]/70">Impresa</Label>
                <select 
                  name="impresa_id" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#ef4444]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="">Seleziona impresa...</option>
                  {impreseList.map(imp => (
                    <option key={imp.id} value={imp.id}>{imp.denominazione} - {imp.partita_iva}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Tipo Infrazione</Label>
                <select 
                  name="infraction_code" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#ef4444]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="">Seleziona infrazione...</option>
                  {infractionTypes.map(inf => (
                    <option key={inf.id} value={inf.code}>
                      {inf.code} - {inf.description} (€{inf.default_amount})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Importo (€)</Label>
                <Input 
                  type="number" 
                  name="amount" 
                  placeholder="Importo sanzione"
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Descrizione</Label>
                <Textarea 
                  name="description" 
                  placeholder="Descrizione della violazione..."
                  className="mt-1 bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Luogo Accertamento</Label>
                <Input 
                  type="text" 
                  name="luogo_accertamento" 
                  placeholder="Es: Mercato Grosseto, Posteggio 15"
                  className="mt-1 bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNuovoVerbaleModal(false)}
                  className="flex-1 border-[#e8fbff]/20"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={nuovoVerbaleLoading}
                  className="flex-1 bg-[#ef4444] hover:bg-[#ef4444]/80 text-white"
                >
                  {nuovoVerbaleLoading ? 'Emissione...' : 'Emetti Verbale'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <TabsList className="bg-[#1a2332] border border-[#3b82f6]/20 p-1 flex-wrap h-auto">
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
          <TabsTrigger 
            value="suap" 
            className="data-[state=active]:bg-[#8b5cf6]/20 data-[state=active]:text-[#8b5cf6]"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Pratiche SUAP ({praticheSuap.length})
          </TabsTrigger>
          <TabsTrigger 
            value="notifiche" 
            className="data-[state=active]:bg-[#ec4899]/20 data-[state=active]:text-[#ec4899]"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Notifiche PM
          </TabsTrigger>
          <TabsTrigger 
            value="giustifiche" 
            className="data-[state=active]:bg-[#10b981]/20 data-[state=active]:text-[#10b981]"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Giustifiche ({transgressions.length})
          </TabsTrigger>
          <TabsTrigger 
            value="storico" 
            className="data-[state=active]:bg-[#8b5cf6]/20 data-[state=active]:text-[#8b5cf6]"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Storico ({marketSessions.length})
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

        {/* Tab: Da Controllare (Watchlist) */}
        <TabsContent value="watchlist" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#f59e0b]" />
                  Imprese da Controllare
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Cerca impresa..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 bg-[#0b1220] border-[#f59e0b]/30 text-[#e8fbff]"
                  />
                </div>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Imprese con irregolarità o scadenze da verificare
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchlist.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-[#10b981]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessuna impresa da controllare</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">La watchlist è vuota</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#3b82f6]/20">
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">IMPRESA</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">MOTIVO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">PRIORITÀ</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">DATA</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchlist
                        .filter(item => 
                          !searchTerm || 
                          item.impresa_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.partita_iva?.includes(searchTerm)
                        )
                        .map((item) => (
                        <tr 
                          key={item.id} 
                          className="border-b border-[#3b82f6]/10 hover:bg-[#0b1220]/50 cursor-pointer"
                          onClick={async () => {
                            setSelectedWatchlistItem(item);
                            setShowWatchlistModal(true);
                            // Cerca il posteggio dell'impresa
                            try {
                              const res = await fetch(`${MIHUB_API}/stalls?impresa_id=${item.impresa_id}`);
                              const data = await res.json();
                              if (data.success && data.data?.length > 0) {
                                const stall = data.data[0];
                                if (stall.latitude && stall.longitude) {
                                  setWatchlistPosteggio({
                                    lat: parseFloat(stall.latitude),
                                    lng: parseFloat(stall.longitude),
                                    numero: stall.number || 'N/D'
                                  });
                                } else {
                                  setWatchlistPosteggio(null);
                                }
                              } else {
                                setWatchlistPosteggio(null);
                              }
                            } catch (err) {
                              console.error('Errore fetch posteggio:', err);
                              setWatchlistPosteggio(null);
                            }
                          }}
                        >
                          <td className="p-3">
                            <p className="text-[#e8fbff] font-medium text-sm">{item.impresa_nome || 'N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{item.partita_iva}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff]/80 text-sm">{item.trigger_description}</p>
                            <p className="text-[#e8fbff]/40 text-xs">{item.trigger_type}</p>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/60 text-sm">
                              {new Date(item.created_at).toLocaleDateString('it-IT')}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#f59e0b] hover:bg-[#f59e0b]/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWatchlistItem(item);
                                setShowWatchlistModal(true);
                              }}
                            >
                              <Info className="h-4 w-4 mr-1" />
                              Dettagli
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

        {/* Tab: Verbali */}
        <TabsContent value="sanctions" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#ef4444]" />
                  Verbali Emessi
                </CardTitle>
                <Button 
                  size="sm" 
                  className="bg-[#ef4444] hover:bg-[#ef4444]/80 text-white"
                  onClick={() => window.location.href = '/pm/nuovo-verbale'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Verbale Professionale
                </Button>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Elenco dei verbali di sanzione emessi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sanctions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-[#ef4444]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessun verbale emesso</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">I verbali appariranno qui</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#3b82f6]/20">
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">VERBALE</th>
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
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
                              onClick={() => window.open(`${MIHUB_API}/verbali/${sanction.id}/pdf`, '_blank')}
                              title="Visualizza Verbale"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#3b82f6] hover:bg-[#3b82f6]/10"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${MIHUB_API}/verbali/${sanction.id}/pdf`;
                                link.download = `Verbale_${sanction.verbale_code}.pdf`;
                                link.click();
                              }}
                              title="Scarica PDF Verbale"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#10b981] hover:bg-[#10b981]/10"
                              onClick={async () => {
                                if (confirm('Inviare notifica verbale all\'impresa?')) {
                                  try {
                                    const res = await fetch(`${MIHUB_API}/verbali/${sanction.id}/invia`, { method: 'POST' });
                                    const data = await res.json();
                                    if (data.success) alert('✅ Notifica inviata!');
                                    else alert('❌ Errore: ' + data.error);
                                  } catch (e) { alert('❌ Errore invio'); }
                                }
                              }}
                              title="Invia Notifica all'Impresa"
                            >
                              <Send className="h-4 w-4" />
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

        {/* Tab: Pratiche SUAP */}
        <TabsContent value="suap" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
<Briefcase className="h-5 w-5 text-[#8b5cf6]" />
                Pratiche SUAP - Esiti (Approvate/Negate/Revocate)
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={fetchAllData}
                  className="border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aggiorna
                </Button>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Pratiche espletate, negate o revocate dal sistema SUAP - per verifica e controllo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {praticheSuap.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-16 w-16 text-[#8b5cf6]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessuna pratica SUAP recente</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">Le nuove pratiche appariranno qui</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#8b5cf6]/20">
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">N° PRATICA</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">TIPO</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">IMPRESA</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">COMUNE</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">STATO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">DATA</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {praticheSuap.map((pratica) => (
                        <tr key={pratica.id} className="border-b border-[#8b5cf6]/10 hover:bg-[#0b1220]/50">
                          <td className="p-3">
                            <span className="text-[#8b5cf6] font-mono text-sm">{pratica.numero_pratica}</span>
                          </td>
                          <td className="p-3">
                            <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30 text-xs">
                              {pratica.tipo_pratica}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff] text-sm">{pratica.impresa_nome || 'N/D'}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff]/70 text-sm">{pratica.comune_nome || 'N/D'}</p>
                          </td>
                          <td className="p-3 text-center">
                            {getPraticaStatusBadge(pratica.stato)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/60 text-sm">
                              {pratica.data_presentazione ? new Date(pratica.data_presentazione).toLocaleDateString('it-IT') : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button size="sm" variant="ghost" className="text-[#8b5cf6] hover:bg-[#8b5cf6]/10">
                              <Eye className="h-4 w-4" />
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

        {/* Tab: Notifiche PM */}
        <TabsContent value="notifiche" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#ec4899]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#ec4899]" />
                Invio Notifiche - Polizia Municipale
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Invia comunicazioni ufficiali alle imprese del territorio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvioNotifica} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#e8fbff]/70">Destinatari</Label>
                    <select 
                      name="target_tipo" 
                      required
                      className="w-full mt-1 bg-[#0b1220] border border-[#ec4899]/30 rounded-lg p-2 text-[#e8fbff]"
                    >
                      <option value="TUTTI">Tutte le Imprese</option>
                      <option value="IMPRESA">Impresa Singola...</option>
                      <option value="MERCATO">Imprese del Mercato</option>
                      <option value="HUB">Negozi dell'HUB</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[#e8fbff]/70">Impresa Specifica (opzionale)</Label>
                    <select 
                      name="target_id"
                      className="w-full mt-1 bg-[#0b1220] border border-[#ec4899]/30 rounded-lg p-2 text-[#e8fbff]"
                    >
                      <option value="">Seleziona impresa...</option>
                      {impreseList.map(imp => (
                        <option key={imp.id} value={imp.id}>{imp.denominazione}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#e8fbff]/70">Tipo Messaggio</Label>
                    <select 
                      name="tipo_messaggio" 
                      required
                      className="w-full mt-1 bg-[#0b1220] border border-[#ec4899]/30 rounded-lg p-2 text-[#e8fbff]"
                    >
                      <option value="AVVISO">Avviso</option>
                      <option value="COMUNICAZIONE">Comunicazione Ufficiale</option>
                      <option value="SCADENZA">Promemoria Scadenza</option>
                      <option value="CONTROLLO">Preavviso Controllo</option>
                      <option value="SANZIONE">Notifica Sanzione</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[#e8fbff]/70">Titolo</Label>
                    <Input 
                      name="titolo" 
                      required
                      placeholder="Oggetto della comunicazione..."
                      className="mt-1 bg-[#0b1220] border-[#ec4899]/30 text-[#e8fbff]"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[#e8fbff]/70">Messaggio</Label>
                  <Textarea 
                    name="messaggio" 
                    required
                    rows={5}
                    placeholder="Scrivi il contenuto della comunicazione..."
                    className="mt-1 bg-[#0b1220] border-[#ec4899]/30 text-[#e8fbff]"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={invioNotificaLoading}
                    className="bg-[#ec4899] hover:bg-[#ec4899]/80 text-white"
                  >
                    {invioNotificaLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Invia Notifica
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Risposte Ricevute dalle Imprese */}
          <Card className="bg-[#0b1220] border-[#ec4899]/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#ec4899]" />
                  <CardTitle className="text-[#e8fbff] text-lg">Risposte Ricevute</CardTitle>
                  {rispostePM.filter(r => !r.letta).length > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      {rispostePM.filter(r => !r.letta).length} nuove
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    setRisposteLoading(true);
                    try {
                      const risposteRes = await fetch(`${MIHUB_API}/notifiche/risposte`);
                      const risposteData = await risposteRes.json();
                      if (risposteData.success) {
                        const rispostePMFiltered = (risposteData.data || []).filter(
                          (r: any) => r.target_tipo === 'POLIZIA_MUNICIPALE'
                        );
                        setRispostePM(rispostePMFiltered);
                      }
                    } catch (err) {
                      console.error('Errore:', err);
                    } finally {
                      setRisposteLoading(false);
                    }
                  }}
                  disabled={risposteLoading}
                  className="border-[#ec4899]/30 text-[#ec4899] hover:bg-[#ec4899]/10"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${risposteLoading ? 'animate-spin' : ''}`} />
                  {risposteLoading ? 'Caricamento...' : 'Aggiorna'}
                </Button>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Messaggi e risposte ricevute dalle imprese
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rispostePM.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-[#ec4899]/30 mx-auto mb-3" />
                  <p className="text-[#e8fbff]/60">Nessuna risposta ricevuta</p>
                  <p className="text-[#e8fbff]/40 text-sm">Le risposte delle imprese appariranno qui</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {rispostePM.map((risposta) => (
                    <div 
                      key={risposta.id} 
                      className={`p-4 rounded-lg border ${
                        risposta.letta 
                          ? 'bg-[#0b1220]/50 border-[#ec4899]/10' 
                          : 'bg-[#ec4899]/10 border-[#ec4899]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[#e8fbff]">{risposta.mittente_nome}</span>
                            {!risposta.letta && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                Nuova
                              </Badge>
                            )}
                          </div>
                          <p className="text-[#e8fbff]/80 font-medium text-sm">{risposta.titolo}</p>
                          <p className="text-[#e8fbff]/60 text-sm mt-1">{risposta.messaggio}</p>
                          <p className="text-[#e8fbff]/40 text-xs mt-2">
                            {new Date(risposta.created_at).toLocaleString('it-IT')}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-[#ec4899] hover:bg-[#ec4899]/10"
                          onClick={async () => {
                            // Apri modal e segna come letta
                            setSelectedRisposta(risposta);
                            setShowRispostaModal(true);
                            if (!risposta.letta) {
                              try {
                                await fetch(`${MIHUB_API}/notifiche/risposte/${risposta.id}/letta`, {
                                  method: 'PUT'
                                });
                                // Aggiorna lo stato locale
                                setRispostePM(prev => prev.map(r => 
                                  r.id === risposta.id ? { ...r, letta: true } : r
                                ));
                              } catch (err) {
                                console.error('Errore:', err);
                              }
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-[#0b1220] border-[#ec4899]/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-[#ec4899] mt-0.5" />
                <div>
                  <p className="text-[#e8fbff] font-medium text-sm">Sistema Notifiche Integrato</p>
                  <p className="text-[#e8fbff]/60 text-xs mt-1">
                    Le notifiche vengono inviate direttamente all'app delle imprese. 
                    I destinatari riceveranno una notifica push e potranno visualizzare il messaggio nella loro area riservata.
                    Questo sistema è connesso a SSO SUAP e Wallet PagoPA per una comunicazione unificata.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Giustifiche */}
        <TabsContent value="giustifiche" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#10b981]" />
                Giustifiche Trasgressioni Mercato
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Gestisci le giustifiche inviate dalle imprese per uscite anticipate o altre trasgressioni
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transgressions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-[#10b981]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessuna giustifica in attesa</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">
                    Le trasgressioni rilevate automaticamente appariranno qui
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats rapide */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#0f1729] rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-400">
                        {transgressions.filter(t => t.justification_display_status === 'IN_ATTESA').length}
                      </p>
                      <p className="text-xs text-[#e8fbff]/50">In Attesa</p>
                    </div>
                    <div className="bg-[#0f1729] rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-400">
                        {transgressions.filter(t => t.justification_display_status === 'CERTIFICATO_INVIATO').length}
                      </p>
                      <p className="text-xs text-[#e8fbff]/50">Da Valutare</p>
                    </div>
                    <div className="bg-[#0f1729] rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">
                        {transgressions.filter(t => t.justification_display_status === 'SCADUTA').length}
                      </p>
                      <p className="text-xs text-[#e8fbff]/50">Scadute</p>
                    </div>
                    <div className="bg-[#0f1729] rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-[#10b981]">
                        {transgressions.length}
                      </p>
                      <p className="text-xs text-[#e8fbff]/50">Totale</p>
                    </div>
                  </div>

                  {/* Lista trasgressioni */}
                  <div className="space-y-3">
                    {transgressions.map((t) => (
                      <div 
                        key={t.id} 
                        className="bg-[#0f1729] rounded-lg p-4 border border-[#10b981]/20 hover:border-[#10b981]/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge 
                                className={`${
                                  t.transgression_type === 'USCITA_ANTICIPATA' 
                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    : t.transgression_type === 'PRESENZA_TARDIVA'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    : 'bg-green-500/20 text-green-400 border-green-500/30'
                                }`}
                              >
                                {t.transgression_type.replace(/_/g, ' ')}
                              </Badge>
                              <Badge 
                                className={`${
                                  t.justification_display_status === 'SCADUTA'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : t.justification_display_status === 'CERTIFICATO_INVIATO'
                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                }`}
                              >
                                {t.justification_display_status === 'SCADUTA' ? 'Scaduta' 
                                  : t.justification_display_status === 'CERTIFICATO_INVIATO' ? 'Certificato Inviato'
                                  : 'In Attesa'}
                              </Badge>
                            </div>
                            <p className="text-[#e8fbff] font-medium">{t.business_name || 'Impresa N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-sm">
                              {t.market_name} - {new Date(t.market_date).toLocaleDateString('it-IT')}
                            </p>
                            {t.days_remaining !== null && t.justification_display_status === 'IN_ATTESA' && (
                              <p className={`text-xs mt-1 ${
                                t.days_remaining <= 1 ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                                <Clock className="h-3 w-3 inline mr-1" />
                                {t.days_remaining <= 0 
                                  ? 'Scadenza oggi!' 
                                  : `${Math.ceil(t.days_remaining)} giorni rimanenti`}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {t.justification_file_path && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                                onClick={() => window.open(t.justification_file_path!, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Vedi Certificato
                              </Button>
                            )}
                            {t.justification_display_status === 'CERTIFICATO_INVIATO' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`${MIHUB_API}/market-settings/transgressions/${t.id}/review`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'APPROVE', notes: 'Giustifica approvata' })
                                      });
                                      if (res.ok) {
                                        setTransgressions(prev => prev.filter(tr => tr.id !== t.id));
                                      }
                                    } catch (err) {
                                      console.error('Errore approvazione:', err);
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approva
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`${MIHUB_API}/market-settings/transgressions/${t.id}/review`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'REJECT', notes: 'Giustifica non valida' })
                                      });
                                      if (res.ok) {
                                        setTransgressions(prev => prev.filter(tr => tr.id !== t.id));
                                      }
                                    } catch (err) {
                                      console.error('Errore rifiuto:', err);
                                    }
                                  }}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Rifiuta
                                </Button>
                              </>
                            )}
                            {(t.justification_display_status === 'SCADUTA' || t.justification_display_status === 'IN_ATTESA') && (
                              <Button
                                size="sm"
                                className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-white"
                                onClick={() => {
                                  // Naviga alla pagina nuovo verbale con dati precompilati
                                  window.location.href = `/pm/nuovo-verbale?impresa=${t.business_id}&tipo=TRASGRESSIONE_MERCATO`;
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Prepara Verbale
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Storico Sessioni Mercato */}
        <TabsContent value="storico" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#8b5cf6]" />
                    Storico Sessioni Mercato
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Cronologia dei mercati chiusi con dettaglio presenze
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-[#e8fbff]/60 text-sm">Cerca per data:</Label>
                    <Input
                      type="date"
                      value={storicoDateFilter}
                      onChange={(e) => setStoricoDateFilter(e.target.value)}
                      className="w-44 bg-[#0b1220] border-[#8b5cf6]/30 text-[#e8fbff]"
                    />
                  </div>
                  {storicoDateFilter && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStoricoDateFilter('')}
                      className="text-gray-400 hover:text-[#e8fbff]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10"
                    onClick={() => {
                      // Genera CSV delle sessioni filtrate
                      const filteredSessions = marketSessions.filter(session => {
                        if (!storicoDateFilter) return true;
                        const sessionDate = session.data_mercato.split('T')[0];
                        return sessionDate === storicoDateFilter;
                      });
                      const csvContent = [
                        ['Mercato', 'Comune', 'Data', 'Posteggi Occupati', 'Presenze', 'Totale Incassato'].join(';'),
                        ...filteredSessions.map(s => [
                          s.market_name,
                          s.comune,
                          new Date(s.data_mercato).toLocaleDateString('it-IT'),
                          s.posteggi_occupati,
                          s.totale_presenze,
                          `€${parseFloat(s.totale_incassato || '0').toFixed(2)}`
                        ].join(';'))
                      ].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `storico_mercati_${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {marketSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna sessione mercato chiusa</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {marketSessions
                    .filter(session => {
                      if (!storicoDateFilter) return true;
                      const sessionDate = session.data_mercato.split('T')[0];
                      return sessionDate === storicoDateFilter;
                    })
                    .map((session, idx) => (
                    <div 
                      key={`${session.market_id}-${session.data_mercato}-${idx}`}
                      className="bg-[#0d1520] border border-[#8b5cf6]/20 rounded-lg p-4 hover:border-[#8b5cf6]/50 cursor-pointer transition-colors"
                      onClick={async () => {
                        setSelectedSession(session);
                        setShowSessionModal(true);
                        setDetailsLoading(true);
                        try {
                          const dataStr = session.data_mercato.split('T')[0];
                          const res = await fetch(`${MIHUB_API}/presenze/storico/dettaglio/${session.market_id}/${dataStr}`);
                          const data = await res.json();
                          if (data.success) {
                            // Rimuovi duplicati basandosi su stall_id
                            const uniqueDetails = data.presenze.filter((p: SessionDetail, i: number, arr: SessionDetail[]) => 
                              arr.findIndex(x => x.stall_id === p.stall_id) === i
                            );
                            setSessionDetails(uniqueDetails);
                          }
                        } catch (err) {
                          console.error('Errore fetch dettaglio:', err);
                        } finally {
                          setDetailsLoading(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-[#8b5cf6]/20 p-3 rounded-lg">
                            <Store className="h-6 w-6 text-[#8b5cf6]" />
                          </div>
                          <div>
                            <h4 className="text-[#e8fbff] font-medium">{session.market_name}</h4>
                            <p className="text-gray-400 text-sm">{session.comune}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-[#e8fbff] font-bold">
                              {new Date(session.data_mercato).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-gray-400 text-xs">Data Mercato</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[#3b82f6] font-bold">{session.posteggi_occupati}</p>
                            <p className="text-gray-400 text-xs">Posteggi</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[#10b981] font-bold">€{parseFloat(session.totale_incassato || '0').toFixed(2)}</p>
                            <p className="text-gray-400 text-xs">Incassato</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {marketSessions.filter(session => {
                    if (!storicoDateFilter) return true;
                    const sessionDate = session.data_mercato.split('T')[0];
                    return sessionDate === storicoDateFilter;
                  }).length === 0 && storicoDateFilter && (
                    <div className="text-center py-8 text-gray-400">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nessuna sessione trovata per la data selezionata</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Dettaglio Watchlist con Navigazione GPS */}
      {showWatchlistModal && selectedWatchlistItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#f59e0b]/30 rounded-lg w-full max-w-lg">
            <div className="p-4 border-b border-[#f59e0b]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#f59e0b]/20 p-2 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-[#f59e0b]" />
                </div>
                <div>
                  <h3 className="text-[#e8fbff] font-bold text-lg">Controllo da Effettuare</h3>
                  <p className="text-gray-400 text-sm">{selectedWatchlistItem.impresa_nome}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowWatchlistModal(false);
                  setSelectedWatchlistItem(null);
                  setWatchlistPosteggio(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {/* Info Impresa */}
              <div className="bg-[#0b1220] rounded-lg p-4">
                <h4 className="text-[#e8fbff]/60 text-xs uppercase mb-2">Dati Impresa</h4>
                <p className="text-[#e8fbff] font-medium">{selectedWatchlistItem.impresa_nome}</p>
                <p className="text-[#e8fbff]/60 text-sm">P.IVA: {selectedWatchlistItem.partita_iva}</p>
              </div>
              
              {/* Motivo Controllo */}
              <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-4">
                <h4 className="text-[#f59e0b] text-xs uppercase mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Motivo del Controllo
                </h4>
                <p className="text-[#e8fbff] font-medium">{selectedWatchlistItem.trigger_description}</p>
                <p className="text-[#e8fbff]/50 text-sm mt-1">Tipo: {selectedWatchlistItem.trigger_type?.replace(/_/g, ' ')}</p>
              </div>
              
              {/* Priorità e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0b1220] rounded-lg p-3 text-center">
                  <p className="text-[#e8fbff]/60 text-xs mb-1">Priorità</p>
                  <Badge className={getPriorityColor(selectedWatchlistItem.priority)}>
                    {selectedWatchlistItem.priority}
                  </Badge>
                </div>
                <div className="bg-[#0b1220] rounded-lg p-3 text-center">
                  <p className="text-[#e8fbff]/60 text-xs mb-1">Data Segnalazione</p>
                  <p className="text-[#e8fbff] font-medium">
                    {new Date(selectedWatchlistItem.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
              
              {/* Navigazione GPS */}
              {watchlistPosteggio ? (
                <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-4">
                  <h4 className="text-[#10b981] text-xs uppercase mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Posizione Posteggio
                  </h4>
                  <p className="text-[#e8fbff] text-sm mb-3">Posteggio n. {watchlistPosteggio.numero}</p>
                  <Button
                    className="w-full bg-[#10b981] hover:bg-[#10b981]/80 text-white"
                    onClick={() => {
                      // Apri Google Maps con navigazione
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${watchlistPosteggio.lat},${watchlistPosteggio.lng}&travelmode=driving`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Avvia Navigazione GPS
                  </Button>
                </div>
              ) : (
                <div className="bg-[#0b1220] rounded-lg p-4 text-center">
                  <MapPin className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Coordinate GPS non disponibili per questo posteggio</p>
                </div>
              )}
              
              {/* Azioni */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
                  onClick={() => {
                    setShowWatchlistModal(false);
                    window.location.href = `/pm/nuovo-verbale?impresa=${selectedWatchlistItem.impresa_id}`;
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Prepara Verbale
                </Button>
                <Button
                  className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/80 text-white"
                  onClick={() => {
                    // Segna come controllato
                    setShowWatchlistModal(false);
                    setSelectedWatchlistItem(null);
                    alert('✅ Controllo registrato!');
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Segna Controllato
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettaglio Sessione */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-[#8b5cf6]/20 flex items-center justify-between">
              <div>
                <h3 className="text-[#e8fbff] font-bold text-lg">{selectedSession.market_name}</h3>
                <p className="text-gray-400 text-sm">
                  {new Date(selectedSession.data_mercato).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10"
                  onClick={() => {
                    // Separa concessionari e spuntisti
                    const concessionari = sessionDetails.filter(d => d.tipo_presenza === 'CONCESSION' || !d.tipo_presenza);
                    const spuntisti = sessionDetails.filter(d => d.tipo_presenza === 'SPUNTA');
                    
                    // Calcola statistiche dai dettagli
                    const usciteRegistrate = sessionDetails.filter(d => d.ora_uscita).length;
                    const totaleIncassato = sessionDetails.reduce((sum, d) => sum + parseFloat(d.importo_addebitato || '0'), 0);
                    
                    // Trova prima entrata e ultima uscita dai dettagli
                    const orariAccesso = sessionDetails.filter(d => d.ora_accesso).map(d => d.ora_accesso).sort();
                    const orariUscita = sessionDetails.filter(d => d.ora_uscita).map(d => d.ora_uscita).sort();
                    const primaEntrata = orariAccesso[0] || '-';
                    const ultimaUscita = orariUscita[orariUscita.length - 1] || '-';
                    
                    // Header resoconto in formato tabella CSV con separatore tab per Excel
                    const SEP = '\t'; // Tab separator per Excel
                    const csvContent = [
                      // BOM per Excel UTF-8
                      '\uFEFF',
                      // Resoconto in formato tabella
                      'RESOCONTO MERCATO',
                      `Campo${SEP}Valore`,
                      `Mercato${SEP}${selectedSession.market_name}`,
                      `Comune${SEP}${selectedSession.comune}`,
                      `Data${SEP}${new Date(selectedSession.data_mercato).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`,
                      `Prima Entrata${SEP}${primaEntrata}`,
                      `Ultima Uscita${SEP}${ultimaUscita}`,
                      `Posteggi Occupati${SEP}${sessionDetails.length}`,
                      `Concessionari${SEP}${concessionari.length}`,
                      `Spuntisti${SEP}${spuntisti.length}`,
                      `Uscite Registrate${SEP}${usciteRegistrate}`,
                      `Totale Incassato${SEP}${totaleIncassato.toFixed(2)} EUR`,
                      '',
                      // Sezione Concessionari
                      `LISTA CONCESSIONARI (${concessionari.length})`,
                      `N° Posteggio${SEP}Impresa${SEP}P.IVA${SEP}Importo${SEP}Giorno${SEP}Accesso${SEP}Rifiuti${SEP}Uscita${SEP}Presenze${SEP}Assenze`,
                      ...concessionari.map(d => [
                        d.stall_number || '',
                        d.impresa_nome || '',
                        d.impresa_piva || '',
                        parseFloat(d.importo_addebitato || '0').toFixed(2),
                        d.giorno ? new Date(d.giorno).toLocaleDateString('it-IT') : '-',
                        d.ora_accesso || '-',
                        d.ora_rifiuti || '-',
                        d.ora_uscita || '-',
                        d.presenze_totali || 0,
                        d.assenze_non_giustificate || 0
                      ].join(SEP)),
                      '',
                      // Sezione Spuntisti
                      `LISTA SPUNTISTI (${spuntisti.length})`,
                      `N° Posteggio${SEP}Impresa${SEP}P.IVA${SEP}Importo${SEP}Giorno${SEP}Accesso${SEP}Rifiuti${SEP}Uscita${SEP}Presenze${SEP}Assenze`,
                      ...spuntisti.map(d => [
                        d.stall_number || '',
                        d.impresa_nome || '',
                        d.impresa_piva || '',
                        parseFloat(d.importo_addebitato || '0').toFixed(2),
                        d.giorno ? new Date(d.giorno).toLocaleDateString('it-IT') : '-',
                        d.ora_accesso || '-',
                        d.ora_rifiuti || '-',
                        d.ora_uscita || '-',
                        d.presenze_totali || 0,
                        d.assenze_non_giustificate || 0
                      ].join(SEP))
                    ].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `presenze_${selectedSession.market_name.replace(/\s+/g, '_')}_${new Date(selectedSession.data_mercato).toISOString().split('T')[0]}.csv`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Presenze
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedSession(null);
                    setSessionDetails([]);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              {detailsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#8b5cf6]" />
                  <p className="text-gray-400 mt-2">Caricamento cronologia...</p>
                </div>
              ) : (
                <>
                  {/* Stats rapide - calcolate dai dettagli */}
                  {(() => {
                    const usciteCalcolate = sessionDetails.filter(d => d.ora_uscita).length;
                    const totaleCalcolato = sessionDetails.reduce((sum, d) => sum + parseFloat(d.importo_addebitato || '0'), 0);
                    const concessionariCount = sessionDetails.filter(d => d.tipo_presenza === 'CONCESSION' || !d.tipo_presenza).length;
                    const spuntistiCount = sessionDetails.filter(d => d.tipo_presenza === 'SPUNTA').length;
                    return (
                      <div className="grid grid-cols-5 gap-3 mb-4">
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#3b82f6] font-bold text-xl">{sessionDetails.length}</p>
                          <p className="text-gray-400 text-xs">Posteggi Occupati</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#10b981] font-bold text-xl">{concessionariCount}</p>
                          <p className="text-gray-400 text-xs">Concessionari</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#f97316] font-bold text-xl">{spuntistiCount}</p>
                          <p className="text-gray-400 text-xs">Spuntisti</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#f59e0b] font-bold text-xl">{usciteCalcolate}</p>
                          <p className="text-gray-400 text-xs">Uscite Registrate</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#8b5cf6] font-bold text-xl">€{totaleCalcolato.toFixed(2)}</p>
                          <p className="text-gray-400 text-xs">Totale Incassato</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tabella Concessionari */}
                  {(() => {
                    const concessionari = sessionDetails.filter(d => d.tipo_presenza === 'CONCESSION' || !d.tipo_presenza);
                    const spuntisti = sessionDetails.filter(d => d.tipo_presenza === 'SPUNTA');
                    
                    const renderTable = (data: SessionDetail[], title: string, color: string) => (
                      <div className="mb-6">
                        <h4 className={`text-${color} font-semibold mb-2 flex items-center gap-2`}>
                          <Store className="h-4 w-4" />
                          {title} ({data.length})
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[#8b5cf6]/20">
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">N°</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Impresa</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Importo</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Giorno</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Accesso</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Rifiuti</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Uscita</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Pres.</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Ass.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.map((detail, idx) => (
                                <tr key={`${detail.id}-${idx}`} className="border-b border-[#8b5cf6]/10 hover:bg-[#0d1520]/50">
                                  <td className="py-2 px-3 text-[#3b82f6] font-medium">{detail.stall_number}</td>
                                  <td className="py-2 px-3">
                                    <p className="text-[#e8fbff] text-sm">{detail.impresa_nome}</p>
                                    <p className="text-gray-500 text-xs">{detail.impresa_piva}</p>
                                  </td>
                                  <td className="py-2 px-3 text-[#10b981]">€{parseFloat(detail.importo_addebitato || '0').toFixed(2)}</td>
                                  <td className="py-2 px-3 text-gray-400 text-sm">
                                    {new Date(detail.giorno).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  <td className="py-2 px-3 text-[#3b82f6]">{detail.ora_accesso || '-'}</td>
                                  <td className="py-2 px-3 text-gray-400">{detail.ora_rifiuti || '-'}</td>
                                  <td className="py-2 px-3 text-[#f59e0b]">{detail.ora_uscita || '-'}</td>
                                  <td className="py-2 px-3 text-[#10b981]">{detail.presenze_totali || 0}</td>
                                  <td className="py-2 px-3 text-red-400">{detail.assenze_non_giustificate || 0}</td>
                                </tr>
                              ))}
                              {data.length === 0 && (
                                <tr>
                                  <td colSpan={9} className="py-4 text-center text-gray-500">Nessuna presenza registrata</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                    
                    return (
                      <>
                        {renderTable(concessionari, 'Concessionari', '[#10b981]')}
                        {renderTable(spuntisti, 'Spuntisti', '[#f97316]')}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal Visualizzazione Risposta */}
      {showRispostaModal && selectedRisposta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#ec4899]/30 rounded-lg w-full max-w-lg">
            <div className="p-4 border-b border-[#ec4899]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#ec4899]" />
                <h3 className="text-[#e8fbff] font-bold">Messaggio Ricevuto</h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowRispostaModal(false);
                  setSelectedRisposta(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-[#0d1520] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">MITTENTE</p>
                <p className="text-[#e8fbff] font-medium">{selectedRisposta.mittente_nome}</p>
                <p className="text-gray-500 text-xs">{selectedRisposta.mittente_tipo}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-xs mb-1">OGGETTO</p>
                <p className="text-[#e8fbff] font-medium">{selectedRisposta.titolo}</p>
              </div>
              
              <div className="bg-[#0d1520] p-4 rounded-lg">
                <p className="text-gray-400 text-xs mb-2">MESSAGGIO</p>
                <p className="text-[#e8fbff] whitespace-pre-wrap">{selectedRisposta.messaggio}</p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Ricevuto: {new Date(selectedRisposta.created_at).toLocaleString('it-IT')}</span>
                <Badge className={selectedRisposta.letta ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                  {selectedRisposta.letta ? 'Letto' : 'Non letto'}
                </Badge>
              </div>
            </div>
            <div className="p-4 border-t border-[#ec4899]/20 flex justify-end">
              <Button 
                onClick={() => {
                  setShowRispostaModal(false);
                  setSelectedRisposta(null);
                }}
                className="bg-[#ec4899]/20 text-[#ec4899] hover:bg-[#ec4899]/30"
              >
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
