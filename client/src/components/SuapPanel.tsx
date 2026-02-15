import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, CheckCircle2, XCircle, Clock, Loader2, 
  Search, Filter, Eye, Play, User, Building2, MapPin, FileCheck, Users,
  Plus, LayoutDashboard, List, FileSearch, AlertCircle, TrendingUp, ScrollText, Stamp,
  ArrowLeft, RefreshCw, AlertTriangle, Bell, Inbox, Edit, Trash2, CreditCard, Wallet, Calendar
} from 'lucide-react';
import { 
  getSuapStats, getSuapPratiche, getSuapPraticaById, 
  createSuapPratica, evaluateSuapPratica,
  SuapStats, SuapPratica, SuapEvento, SuapCheck 
} from '@/api/suap';
import SciaForm from '@/components/suap/SciaForm';
import { addComuneIdToUrl } from '@/hooks/useImpersonation';
import ConcessioneForm from '@/components/suap/ConcessioneForm';
import AutorizzazioneForm from '@/components/suap/AutorizzazioneForm';
import DomandaSpuntaForm from '@/components/suap/DomandaSpuntaForm';
import ListaAutorizzazioniSuap from '@/components/suap/ListaAutorizzazioniSuap';
import ListaDomandeSpuntaSuap from '@/components/suap/ListaDomandeSpuntaSuap';
import AutorizzazioneDetail from '@/components/suap/AutorizzazioneDetail';
import DomandaSpuntaDetail from '@/components/suap/DomandaSpuntaDetail';
import NotificationManager from '@/components/suap/NotificationManager';
import { toast } from 'sonner';
import { getImpersonationParams } from '@/hooks/useImpersonation';

// Ente ID hardcoded per ora - in futuro da contesto utente
const ENTE_ID = 'ente_modena';

// ============================================================================
// TIPI
// ============================================================================

interface SuapPraticaFull extends SuapPratica {
  timeline: SuapEvento[];
  checks: SuapCheck[];
  numero_protocollo?: string;
  comune_presentazione?: string;
  tipo_segnalazione?: string;
  motivo_subingresso?: string;
  settore_merceologico?: string;
  ruolo_dichiarante?: string;
  sub_partita_iva?: string;
  sub_ragione_sociale?: string;
  sub_nome?: string;
  sub_cognome?: string;
  sub_data_nascita?: string;
  sub_luogo_nascita?: string;
  sub_residenza_via?: string;
  sub_residenza_comune?: string;
  sub_residenza_provincia?: string;
  sub_residenza_cap?: string;
  sub_sede_via?: string;
  sub_sede_comune?: string;
  sub_sede_provincia?: string;
  sub_sede_cap?: string;
  sub_pec?: string;
  sub_telefono?: string;
  ced_cf?: string;
  ced_impresa_id?: number | string;
  ced_partita_iva?: string;
  ced_ragione_sociale?: string;
  ced_nome?: string;
  ced_cognome?: string;
  ced_data_nascita?: string;
  ced_luogo_nascita?: string;
  ced_residenza_via?: string;
  ced_residenza_comune?: string;
  ced_residenza_cap?: string;
  ced_pec?: string;
  ced_scia_precedente?: string;
  ced_data_presentazione?: string;
  ced_comune_presentazione?: string;
  mercato_id?: string;
  mercato_nome?: string;
  posteggio_id?: string;
  posteggio_numero?: string;
  ubicazione_mercato?: string;
  giorno_mercato?: string;
  fila?: string;
  dimensioni_mq?: number;
  dimensioni_lineari?: string;
  attrezzature?: string;
  canone_annuo?: number;
  notaio_rogante?: string;
  numero_repertorio?: string;
  data_atto?: string;
  del_nome?: string;
  del_cognome?: string;
  del_cf?: string;
  del_data_nascita?: string;
  del_luogo_nascita?: string;
  del_qualifica?: string;
  del_residenza_via?: string;
  del_residenza_comune?: string;
  del_residenza_cap?: string;
  del_pec?: string;
  // Collegamento Concessione
  concessione_id?: number;
  concessione_numero?: string;
}

// ============================================================================
// COMPONENTI HELPER
// ============================================================================

function DataSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-[#14b8a6]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function DataField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-[#e8fbff] font-medium">{value || '-'}</p>
    </div>
  );
}

function getStatoBadge(stato: string) {
  const variants: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    'RECEIVED': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Clock className="w-3 h-3" /> },
    'IN_LAVORAZIONE': { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    'EVALUATED': { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: <FileSearch className="w-3 h-3" /> },
    'APPROVED': { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    'REJECTED': { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
  };
  const v = variants[stato] || variants['RECEIVED'];
  return (
    <Badge className={`${v.bg} ${v.text} border-0 gap-1`}>
      {v.icon}
      {stato}
    </Badge>
  );
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('it-IT');
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('it-IT');
}

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes} min fa`;
  if (hours < 24) return `${hours} ore fa`;
  return `${days} giorni fa`;
}

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

export default function SuapPanel() {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lista' | 'dettaglio' | 'concessioni' | 'autorizzazioni' | 'domandespunta' | 'notifiche'>('dashboard');
  const [stats, setStats] = useState<SuapStats | null>(null);
  const [pratiche, setPratiche] = useState<SuapPratica[]>([]);
  const [selectedPratica, setSelectedPratica] = useState<SuapPraticaFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSciaForm, setShowSciaForm] = useState(false);
  const [showConcessioneForm, setShowConcessioneForm] = useState(false);
  const [showAutorizzazioneForm, setShowAutorizzazioneForm] = useState(false);
  const [showDomandaSpuntaForm, setShowDomandaSpuntaForm] = useState(false);
  const [selectedAutorizzazioneId, setSelectedAutorizzazioneId] = useState<number | null>(null);
  const [selectedDomandaSpuntaId, setSelectedDomandaSpuntaId] = useState<number | null>(null);
  const [autorizzazioneMode, setAutorizzazioneMode] = useState<'create' | 'view' | 'edit'>('create');
  const [domandaSpuntaMode, setDomandaSpuntaMode] = useState<'create' | 'view' | 'edit'>('create');
  const [concessionePreData, setConcessionePreData] = useState<any>(null);
  const [concessioneMode, setConcessioneMode] = useState<'create' | 'edit'>('create');
  const [selectedConcessioneId, setSelectedConcessioneId] = useState<number | null>(null);
  const [concessioni, setConcessioni] = useState<any[]>([]);
  const [searchConcessioni, setSearchConcessioni] = useState('');
  const [showConcessioniFilters, setShowConcessioniFilters] = useState(false);
  const [concessioniFilterTipo, setConcessioniFilterTipo] = useState<string>('all');
  const [concessioniFilterStato, setConcessioniFilterStato] = useState<string>('all');
  const [concessioniFilterMercato, setConcessioniFilterMercato] = useState<string>('all');
  const [showAllChecks, setShowAllChecks] = useState(false); // false = solo ultima verifica, true = storico completo
  const [selectedConcessione, setSelectedConcessione] = useState<any | null>(null);
  const [concessioneDetailTab, setConcessioneDetailTab] = useState<'dati' | 'posteggio' | 'esporta'>('dati');
  const [domandeSpuntaDashboard, setDomandeSpuntaDashboard] = useState<any[]>([]);
  const [notificheNonLette, setNotificheNonLette] = useState<number>(0);
  
  // Dati comune per notifiche dinamiche
  const [comuneData, setComuneData] = useState<{id: number, nome: string} | null>(null);

  // Carica dati comune all'avvio
  useEffect(() => {
    loadComuneData();
  }, []);

  // Carica dati del comune corrente
  const loadComuneData = async () => {
    try {
      const { comuneId, comuneNome } = getImpersonationParams();
      const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
      
      // Se siamo in modalità impersonificazione, usa quei dati
      if (comuneId) {
        // Fetch nome comune se non presente
        if (!comuneNome) {
          const response = await fetch(`${MIHUB_API}/comuni/${comuneId}`);
          const data = await response.json();
          if (data.success && data.data) {
            setComuneData({ id: parseInt(comuneId), nome: data.data.nome });
            return;
          }
        }
        setComuneData({ id: parseInt(comuneId), nome: comuneNome || 'Comune' });
        return;
      }
      
      // Default: Grosseto (id=1)
      const response = await fetch(`${MIHUB_API}/comuni/1`);
      const data = await response.json();
      if (data.success && data.data) {
        setComuneData({ id: 1, nome: data.data.nome });
      } else {
        setComuneData({ id: 1, nome: 'Grosseto' });
      }
    } catch (error) {
      console.error('Error loading comune data:', error);
      setComuneData({ id: 1, nome: 'Grosseto' });
    }
  };

  // Carica dati iniziali - ricarica quando cambia il comune
  useEffect(() => {
    if (comuneData) {
      loadData();
    }
  }, [comuneData]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Filtra le pratiche SCIA per comune tramite mercato.municipality
      const comuneNomeFilter = comuneData?.nome?.toUpperCase() || '';
      const [statsData, praticheData] = await Promise.all([
        getSuapStats(ENTE_ID),
        getSuapPratiche(ENTE_ID, { comune_nome: comuneNomeFilter })
      ]);
      setStats(statsData);
      // Ordina per data creazione (più recenti prima)
      const sorted = praticheData.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      setPratiche(sorted);
      
      // Carica anche le concessioni, le domande spunta e le notifiche
      await loadConcessioni();
      await loadDomandeSpuntaDashboard();
      await loadNotificheCount();
    } catch (error) {
      console.error('Error loading SUAP data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };
  
  const loadConcessioni = async () => {
    try {
      const response = await fetch(addComuneIdToUrl('https://orchestratore.mio-hub.me/api/concessions'));
      const data = await response.json();
      if (data.success) {
        // Usa stato_calcolato dal backend se presente, altrimenti calcola
        const oggi = new Date();
        const concessionsWithStatus = data.data.map((conc: any) => {
          // Se il backend ha già calcolato lo stato, usalo direttamente
          if (conc.stato_calcolato) {
            return conc;
          }
          // Se lo stato è CESSATA, mantienilo
          if (conc.status === 'CESSATA' || conc.stato === 'CESSATA') {
            return { ...conc, stato_calcolato: 'CESSATA' };
          }
          // Altrimenti calcola lo stato basato sulla data di scadenza
          let stato_calcolato = conc.stato || 'ATTIVA';
          if (conc.valid_to) {
            const scadenza = new Date(conc.valid_to);
            if (scadenza < oggi) {
              stato_calcolato = 'SCADUTA';
            } else {
              stato_calcolato = 'ATTIVA';
            }
          }
          return { ...conc, stato_calcolato };
        });
        // Ordina per data creazione (più recenti prima)
        const sorted = concessionsWithStatus.sort((a: any, b: any) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        setConcessioni(sorted);
      }
    } catch (error) {
      console.error('Error loading concessioni:', error);
    }
  };

  const loadDomandeSpuntaDashboard = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      // Usa addComuneIdToUrl per filtrare per comune
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/domande-spunta`));
      const data = await response.json();
      if (data.success && data.data) {
        // Ordina per data creazione (più recenti prima)
        const sorted = data.data.sort((a: any, b: any) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        setDomandeSpuntaDashboard(sorted);
      }
    } catch (error) {
      console.error('Error loading domande spunta:', error);
    }
  };

  // Carica conteggio notifiche non lette per il badge sul tab
  const loadNotificheCount = async () => {
    try {
      const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
      // Usa il comune_id dinamico dal contesto
      const currentComuneId = comuneData?.id || 1;
      const response = await fetch(`${MIHUB_API}/notifiche/messaggi/SUAP/${currentComuneId}`);
      const data = await response.json();
      if (data.success) {
        setNotificheNonLette(data.non_letti || 0);
      }
    } catch (error) {
      console.error('Error loading notifiche count:', error);
    }
  };

  const loadPraticaDetail = async (id: number) => {
    setLoading(true);
    try {
      const pratica = await getSuapPraticaById(String(id), ENTE_ID);
      setSelectedPratica(pratica as SuapPraticaFull);
      setActiveTab('dettaglio');
    } catch (error) {
      console.error('Error loading pratica:', error);
      toast.error('Errore nel caricamento della pratica');
    } finally {
      setLoading(false);
    }
  };

  const handleSciaSubmit = async (formData: any) => {
    setLoading(true);
    try {
      // Mappa i nomi dei campi dal form SciaForm ai nomi del backend
      // Form usa: ragione_sociale_sub, nome_sub, cf_cedente, mercato, posteggio
      // Backend vuole: sub_ragione_sociale, sub_nome, ced_cf, mercato_nome, posteggio_numero
      const praticaData = {
        tipo_pratica: `SCIA ${formData.motivazione_scia?.toUpperCase() || 'SUBINGRESSO'}`,
        richiedente_cf: formData.cf_subentrante || 'NON_SPECIFICATO',
        richiedente_nome: formData.ragione_sociale_sub || `${formData.nome_sub} ${formData.cognome_sub}` || 'Non specificato',
        oggetto: `SCIA ${formData.motivazione_scia || 'Subingresso'} - ${formData.ragione_sociale_sub || formData.nome_sub || 'N/A'}`,
        // Dati pratica
        numero_protocollo: formData.numero_protocollo,
        data_presentazione: formData.data_presentazione,
        comune_presentazione: formData.comune_presentazione,
        tipo_segnalazione: formData.motivazione_scia,  // form usa motivazione_scia
        motivo_subingresso: formData.motivo_subingresso,
        settore_merceologico: formData.tipologia_attivita === 'alimentare' ? 'Alimentare' : 
                              formData.tipologia_attivita === 'misto' ? 'Misto' : 'Non Alimentare',
        ruolo_dichiarante: formData.ruolo_dichiarante,
        // Dati subentrante (form usa suffisso _sub)
        sub_partita_iva: formData.partita_iva_sub,
        sub_ragione_sociale: formData.ragione_sociale_sub,
        sub_nome: formData.nome_sub,
        sub_cognome: formData.cognome_sub,
        sub_data_nascita: formData.data_nascita_sub,
        sub_luogo_nascita: formData.luogo_nascita_sub,
        sub_residenza_via: formData.residenza_via_sub,
        sub_residenza_comune: formData.residenza_comune_sub,
        sub_residenza_cap: formData.residenza_cap_sub,
        sub_sede_via: formData.sede_via_sub,
        sub_sede_comune: formData.sede_comune_sub,
        sub_sede_provincia: formData.sede_provincia_sub,
        sub_sede_cap: formData.sede_cap_sub,
        sub_pec: formData.pec_sub,
        sub_telefono: formData.telefono_sub,
        // Dati cedente (form usa suffisso _ced e cf_cedente)
        ced_partita_iva: formData.partita_iva_ced,
        ced_cf: formData.cf_cedente,
        ced_ragione_sociale: formData.ragione_sociale_ced,
        ced_nome: formData.nome_ced,
        ced_cognome: formData.cognome_ced,
        ced_data_nascita: formData.data_nascita_ced,
        ced_luogo_nascita: formData.luogo_nascita_ced,
        ced_residenza_via: formData.residenza_via_ced,
        ced_residenza_comune: formData.residenza_comune_ced,
        ced_residenza_cap: formData.residenza_cap_ced,
        ced_pec: formData.pec_ced,
        ced_scia_precedente: formData.scia_precedente_protocollo,
        ced_data_presentazione: formData.scia_precedente_data,
        ced_comune_presentazione: formData.scia_precedente_comune,
        // Dati mercato/posteggio (form usa mercato e posteggio come nomi)
        mercato_id: formData.mercato_id,
        mercato_nome: formData.mercato,  // form usa 'mercato' non 'mercato_nome'
        posteggio_id: formData.posteggio_id,
        posteggio_numero: formData.posteggio,  // form usa 'posteggio' non 'posteggio_numero'
        ubicazione_mercato: formData.ubicazione_mercato,
        giorno_mercato: formData.giorno_mercato,
        fila: formData.fila,
        dimensioni_mq: formData.dimensioni_mq,
        dimensioni_lineari: formData.dimensioni_lineari,
        attrezzature: formData.attrezzature,
        // Dati atto notarile (form usa notaio e repertorio)
        notaio_rogante: formData.notaio,  // form usa 'notaio' non 'notaio_rogante'
        numero_repertorio: formData.repertorio,  // form usa 'repertorio' non 'numero_repertorio'
        data_atto: formData.data_atto,
        // Dati delegato
        del_nome: formData.delegato_nome,
        del_cognome: formData.delegato_cognome,
        del_cf: formData.delegato_cf,
        del_data_nascita: formData.delegato_data_nascita,
        del_luogo_nascita: formData.delegato_luogo_nascita,
        del_qualifica: formData.delegato_qualifica,
        del_residenza_via: formData.delegato_residenza_via,
        del_residenza_comune: formData.delegato_residenza_comune,
        del_residenza_cap: formData.delegato_residenza_cap,
        del_pec: formData.pec_del,
      };

      console.log('Dati pratica da inviare:', praticaData);  // Debug

      await createSuapPratica(ENTE_ID, praticaData);
      toast.success('SCIA creata con successo!');
      setShowSciaForm(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating SCIA:', error);
      toast.error(error.message || 'Errore nella creazione della SCIA');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedPratica) return;
    setLoading(true);
    try {
      await evaluateSuapPratica(String(selectedPratica.id), ENTE_ID);
      toast.success('Valutazione avviata');
      await loadPraticaDetail(selectedPratica.id);
    } catch (error) {
      console.error('Error evaluating pratica:', error);
      toast.error('Errore nella valutazione');
    } finally {
      setLoading(false);
    }
  };

  // Filtra pratiche
  const filteredPratiche = pratiche.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.cui?.toLowerCase().includes(q) ||
      p.richiedente_nome?.toLowerCase().includes(q) ||
      p.richiedente_cf?.toLowerCase().includes(q) ||
      p.tipo_pratica?.toLowerCase().includes(q)
    );
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#e8fbff]">SSO SUAP</h2>
          <p className="text-gray-400">Gestione automatizzata pratiche amministrative e integrazione PDND</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowSciaForm(true)}
            className="bg-[#00f0ff] text-[#0a1628] hover:bg-[#00d4e0]"
          >
            <FileText className="mr-2 h-4 w-4" />
            Nuova SCIA
          </Button>
          <Button 
            onClick={() => {
              setConcessioneMode('create');
              setSelectedConcessioneId(null);
              setConcessionePreData(null);
              setShowConcessioneForm(true);
            }}
            variant="outline"
            className="border-[#14b8a6]/30 text-[#e8fbff] hover:bg-[#1e293b]"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Concessione
          </Button>
        </div>
      </div>

      {/* Tabs di navigazione */}
      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as 'dashboard' | 'lista' | 'dettaglio' | 'concessioni' | 'autorizzazioni' | 'domandespunta' | 'notifiche')}
      >
        <TabsList className="grid w-full grid-cols-7 bg-[#0b1220]/50">
          <TabsTrigger 
            value="dashboard"
            className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="lista"
            className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
          >
            <List className="mr-2 h-4 w-4" />
            Lista Pratiche
          </TabsTrigger>
          <TabsTrigger 
            value="dettaglio"
            className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            disabled={!selectedPratica}
          >
            <FileSearch className="mr-2 h-4 w-4" />
            Dettaglio Pratica
          </TabsTrigger>
          <TabsTrigger 
            value="concessioni"
            className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
          >
            <ScrollText className="mr-2 h-4 w-4" />
            Lista Concessioni
          </TabsTrigger>
          <TabsTrigger 
            value="autorizzazioni"
            className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Autorizzazioni
          </TabsTrigger>
          <TabsTrigger 
            value="domandespunta"
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            <Users className="mr-2 h-4 w-4" />
            Domande Spunta
          </TabsTrigger>
          <TabsTrigger 
            value="notifiche"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 relative"
          >
            <Bell className="mr-2 h-4 w-4" />
            Notifiche
            {notificheNonLette > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                {notificheNonLette}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ================================================================== */}
        {/* TAB DASHBOARD */}
        {/* ================================================================== */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1">
                  <FileText className="w-4 h-4" />
                  Totale Pratiche
                </div>
                <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
                <p className="text-xs text-gray-500">+20.1% dal mese scorso</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  In Lavorazione
                </div>
                <div className="text-2xl font-bold text-white">{stats?.in_lavorazione || 0}</div>
                <p className="text-xs text-gray-500">Richiedono attenzione</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Approvate Auto
                </div>
                <div className="text-2xl font-bold text-white">{stats?.approvate || 0}</div>
                <p className="text-xs text-gray-500">Processate automaticamente</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                  <XCircle className="w-4 h-4" />
                  Rigettate / Bloccate
                </div>
                <div className="text-2xl font-bold text-white">{stats?.rigettate || 0}</div>
                <p className="text-xs text-gray-500">Anomalie rilevate</p>
              </CardContent>
            </Card>
          </div>

          {/* Pratiche Pendenti & Nuove Domande */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pratiche Pendenti - Da Revisionare */}
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-orange-500/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                  Pratiche Pendenti
                </CardTitle>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
                  {pratiche.filter(p => (p.stato as string) === 'IN_LAVORAZIONE' || p.stato === 'EVALUATED').length} da revisionare
                </span>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
                  </div>
                ) : pratiche.filter(p => (p.stato as string) === 'IN_LAVORAZIONE' || p.stato === 'EVALUATED').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-400/40 mb-4" />
                    <p className="text-[#e8fbff]/60">Nessuna pratica pendente</p>
                    <p className="text-sm text-[#e8fbff]/40 mt-2">Tutte le pratiche sono state processate</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {pratiche.filter(p => (p.stato as string) === 'IN_LAVORAZIONE' || p.stato === 'EVALUATED').map((pratica) => (
                      <div 
                        key={pratica.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 cursor-pointer transition-colors"
                        onClick={() => loadPraticaDetail(pratica.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                            <span className="font-medium text-[#e8fbff]">{pratica.tipo_pratica}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Da Revisionare</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {pratica.richiedente_nome} - {pratica.richiedente_cf}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <span className="text-xs text-gray-500">{timeAgo(pratica.created_at)}</span>
                          <Button size="sm" variant="ghost" className="text-orange-400 hover:bg-orange-400/10 mt-1 block">
                            Verifica
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Nuove Domande Arrivate (SCIA + Domande Spunta) */}
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-blue-500/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-400" />
                  Nuove Domande
                </CardTitle>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                  {pratiche.filter(p => p.stato === 'RECEIVED').length + domandeSpuntaDashboard.filter(d => d.stato === 'IN_ATTESA' || d.stato === 'DA_REVISIONARE').length} nuove
                </span>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  </div>
                ) : (pratiche.filter(p => p.stato === 'RECEIVED').length + domandeSpuntaDashboard.filter(d => d.stato === 'IN_ATTESA' || d.stato === 'DA_REVISIONARE').length) === 0 ? (
                  <div className="text-center py-8">
                    <Inbox className="h-12 w-12 mx-auto text-[#e8fbff]/20 mb-4" />
                    <p className="text-[#e8fbff]/60">Nessuna nuova domanda</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {/* Pratiche SCIA */}
                    {pratiche.filter(p => p.stato === 'RECEIVED').map((pratica) => (
                      <div 
                        key={`pratica-${pratica.id}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 cursor-pointer transition-colors"
                        onClick={() => loadPraticaDetail(pratica.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                            <span className="font-medium text-[#e8fbff]">{pratica.tipo_pratica}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Nuova</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {pratica.richiedente_nome} - {pratica.richiedente_cf}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <span className="text-xs text-gray-500">{timeAgo(pratica.created_at)}</span>
                          <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-400/10 mt-1 block">
                            Esamina
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Domande Spunta */}
                    {domandeSpuntaDashboard.filter(d => d.stato === 'IN_ATTESA' || d.stato === 'DA_REVISIONARE').map((domanda) => (
                      <div 
                        key={`spunta-${domanda.id}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 cursor-pointer transition-colors"
                        onClick={() => {
                          setDomandaSpuntaMode('view');
                          setSelectedDomandaSpuntaId(domanda.id);
                          setActiveTab('domandespunta');
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="font-medium text-[#e8fbff]">Domanda Spunta</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">In Attesa</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {domanda.company_name || domanda.denominazione} - {domanda.market_name || domanda.mercato}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <span className="text-xs text-gray-500">{timeAgo(domanda.created_at)}</span>
                          <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-400/10 mt-1 block">
                            Esamina
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB LISTA PRATICHE */}
        {/* ================================================================== */}
        <TabsContent value="lista" className="space-y-4 mt-6">
          {/* Barra ricerca e filtri */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Cerca per CUI, Richiedente o CF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
              />
            </div>
            <Button variant="outline" className="border-[#14b8a6]/30 text-[#e8fbff]">
              <Filter className="mr-2 h-4 w-4" />
              Filtri Avanzati
            </Button>
          </div>

          {/* Tabella pratiche */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
                </div>
              ) : filteredPratiche.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Nessuna pratica trovata</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#14b8a6]/30 hover:bg-transparent">
                      <TableHead className="text-gray-400">CUI</TableHead>
                      <TableHead className="text-gray-400">Tipo</TableHead>
                      <TableHead className="text-gray-400">Richiedente</TableHead>
                      <TableHead className="text-gray-400">Data</TableHead>
                      <TableHead className="text-gray-400">Stato</TableHead>
                      <TableHead className="text-gray-400">Score</TableHead>
                      <TableHead className="text-gray-400">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPratiche.map((pratica) => (
                      <TableRow 
                        key={pratica.id} 
                        className="border-[#14b8a6]/30 hover:bg-[#0f172a] cursor-pointer"
                        onClick={() => loadPraticaDetail(pratica.id)}
                      >
                        <TableCell className="text-[#e8fbff] font-medium">{pratica.cui}</TableCell>
                        <TableCell className="text-[#e8fbff]">{pratica.tipo_pratica}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-[#e8fbff]">{pratica.richiedente_nome}</p>
                            <p className="text-xs text-gray-500">{pratica.richiedente_cf}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">{formatDate(pratica.data_presentazione)}</TableCell>
                        <TableCell>{getStatoBadge(pratica.stato)}</TableCell>
                        <TableCell className="text-[#00f0ff]">{pratica.score || 0}/100</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-[#00f0ff] hover:bg-[#00f0ff]/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadPraticaDetail(pratica.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB DETTAGLIO PRATICA */}
        {/* ================================================================== */}
        <TabsContent value="dettaglio" className="space-y-6 mt-6">
          {!selectedPratica ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
              <CardContent className="py-16 text-center">
                <FileSearch className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-500">Seleziona una pratica dalla lista per visualizzare i dettagli</p>
                <Button 
                  className="mt-4"
                  variant="outline"
                  onClick={() => setActiveTab('lista')}
                >
                  Vai alla Lista Pratiche
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header pratica */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#e8fbff] flex items-center gap-3">
                    {selectedPratica.cui}
                    {getStatoBadge(selectedPratica.stato)}
                  </h3>
                  <p className="text-gray-400">
                    {selectedPratica.tipo_pratica} - {selectedPratica.richiedente_nome} ({selectedPratica.richiedente_cf})
                  </p>
                  {/* Semaforo Stato Concessione */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-3 h-3 rounded-full ${selectedPratica.concessione_id ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className={`text-sm font-medium ${selectedPratica.concessione_id ? 'text-green-400' : 'text-red-400'}`}>
                      Concessione: {selectedPratica.concessione_id ? 'Creata' : 'Da Creare'}
                    </span>
                    {selectedPratica.concessione_id && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs ml-2">
                        #{selectedPratica.concessione_id}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleEvaluate}
                    disabled={loading}
                    className="bg-[#00f0ff] text-[#0a1628] hover:bg-[#00d4e0]"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Esegui Valutazione
                  </Button>
                  <Button 
                    onClick={() => {
                      // Pre-compila il form concessione con i dati della SCIA
                      const preData = {
                        // Dati Generali - Pre-compilati dalla SCIA
                        numero_protocollo: selectedPratica.numero_protocollo || '',
                        data_protocollazione: new Date().toISOString().split('T')[0],
                        comune_rilascio: selectedPratica.comune_presentazione || '',
                        oggetto: `Subingresso ${selectedPratica.sub_ragione_sociale || selectedPratica.richiedente_nome || ''} - Posteggio ${selectedPratica.posteggio_numero || ''}`,
                        tipo_concessione: 'subingresso',
                        cf_concessionario: selectedPratica.richiedente_cf || '',
                        partita_iva: selectedPratica.sub_partita_iva || '',
                        ragione_sociale: selectedPratica.sub_ragione_sociale || selectedPratica.richiedente_nome || '',
                        nome: selectedPratica.sub_nome || '',
                        cognome: selectedPratica.sub_cognome || '',
                        data_nascita: selectedPratica.sub_data_nascita?.split('T')[0] || '',
                        luogo_nascita: selectedPratica.sub_luogo_nascita || '',
                        residenza_via: selectedPratica.sub_residenza_via || '',
                        residenza_comune: selectedPratica.sub_residenza_comune || '',
                        residenza_cap: selectedPratica.sub_residenza_cap || '',
                        residenza_provincia: selectedPratica.sub_residenza_provincia || '',
                        sede_legale_via: selectedPratica.sub_sede_via || '',
                        sede_legale_comune: selectedPratica.sub_sede_comune || '',
                        sede_legale_provincia: selectedPratica.sub_sede_provincia || '',
                        sede_legale_cap: selectedPratica.sub_sede_cap || '',
                        // Cedente
                        cedente_cf: selectedPratica.ced_cf || '',
                        cedente_partita_iva: selectedPratica.ced_partita_iva || '',
                        cedente_ragione_sociale: selectedPratica.ced_ragione_sociale || '',
                        cedente_impresa_id: selectedPratica.ced_impresa_id?.toString() || '',
                        // Posteggio - ID per pre-selezione automatica
                        mercato_id: selectedPratica.mercato_id || null,
                        posteggio_id: selectedPratica.posteggio_id || null,
                        mercato: selectedPratica.mercato_nome || selectedPratica.mercato_id || '',
                        ubicazione: selectedPratica.ubicazione_mercato || '',
                        posteggio: selectedPratica.posteggio_numero || selectedPratica.posteggio_id || '',
                        fila: selectedPratica.fila || '',
                        mq: selectedPratica.dimensioni_mq?.toString() || '',
                        dimensioni_lineari: selectedPratica.dimensioni_lineari || '',
                        giorno: selectedPratica.giorno_mercato || '',
                        attrezzature: selectedPratica.attrezzature || '',
                        tipo_posteggio: 'fisso', // Concessione è sempre fisso, mai spunta
                        merceologia: selectedPratica.settore_merceologico || 'Non Alimentare',
                        canone_unico: selectedPratica.canone_annuo?.toString() || '',
                        // SCIA riferimento
                        scia_precedente_numero: selectedPratica.ced_scia_precedente || '',
                        scia_precedente_data: selectedPratica.ced_data_presentazione?.split('T')[0] || '',
                        scia_precedente_comune: selectedPratica.ced_comune_presentazione || '',
                        // Autorizzazione precedente
                        autorizzazione_precedente_pg: selectedPratica.ced_scia_precedente || '',
                        autorizzazione_precedente_data: selectedPratica.ced_data_presentazione?.split('T')[0] || '',
                        autorizzazione_precedente_intestatario: selectedPratica.ced_ragione_sociale || '',
                        // ID SCIA per collegamento
                        scia_id: selectedPratica.id
                      };
                      setConcessionePreData(preData);
                      setConcessioneMode('create');
                      setSelectedConcessioneId(null);
                      setShowConcessioneForm(true);
                    }}
                    className="bg-[#14b8a6] text-black hover:bg-[#14b8a6]/90"
                  >
                    <Stamp className="mr-2 h-4 w-4" />
                    Genera Concessione
                  </Button>
                </div>
              </div>

              {/* ============================================================== */}
              {/* SEZIONI ORDINATE COME IL FORM SCIA */}
              {/* ============================================================== */}

              {/* 1. Dati Pratica SCIA */}
              <DataSection title="Dati Pratica SCIA" icon={FileText}>
                <DataField label="Numero Protocollo" value={selectedPratica.numero_protocollo || selectedPratica.cui} />
                <DataField label="Data Presentazione" value={formatDate(selectedPratica.data_presentazione)} />
                <DataField label="Comune Presentazione" value={selectedPratica.comune_presentazione} />
                <DataField label="Tipo Segnalazione" value={selectedPratica.tipo_segnalazione} />
                <DataField label="Motivo Subingresso" value={selectedPratica.motivo_subingresso} />
                <DataField label="Settore Merceologico" value={selectedPratica.settore_merceologico} />
                <DataField label="Ruolo Dichiarante" value={selectedPratica.ruolo_dichiarante} />
              </DataSection>

              {/* 2. Dati Delegato/Procuratore - SUBITO DOPO se ruolo != titolare */}
              {((selectedPratica.ruolo_dichiarante && selectedPratica.ruolo_dichiarante.toLowerCase() !== 'titolare') || 
                selectedPratica.del_cf || selectedPratica.del_nome) && (
                <DataSection title="Dati Delegato / Procuratore" icon={User}>
                  <DataField label="Nome" value={selectedPratica.del_nome} />
                  <DataField label="Cognome" value={selectedPratica.del_cognome} />
                  <DataField label="Codice Fiscale" value={selectedPratica.del_cf} />
                  <DataField label="Data di Nascita" value={formatDate(selectedPratica.del_data_nascita)} />
                  <DataField label="Luogo di Nascita" value={selectedPratica.del_luogo_nascita} />
                  <DataField label="Qualifica" value={selectedPratica.del_qualifica} />
                  <DataField label="Residenza Via" value={selectedPratica.del_residenza_via} />
                  <DataField label="Residenza Comune" value={selectedPratica.del_residenza_comune} />
                  <DataField label="Residenza CAP" value={selectedPratica.del_residenza_cap} />
                  <DataField label="PEC" value={selectedPratica.del_pec} />
                </DataSection>
              )}

              {/* 3. Dati Subentrante (Sezione A) - Anagrafica + Residenza + Sede */}
              <DataSection title="A. Dati Subentrante" icon={User}>
                <DataField label="Partita IVA" value={selectedPratica.sub_partita_iva} />
                <DataField label="Codice Fiscale" value={selectedPratica.richiedente_cf} />
                <DataField label="Ragione Sociale" value={selectedPratica.sub_ragione_sociale || selectedPratica.richiedente_nome} />
                <DataField label="Nome" value={selectedPratica.sub_nome} />
                <DataField label="Cognome" value={selectedPratica.sub_cognome} />
                <DataField label="Data di Nascita" value={formatDate(selectedPratica.sub_data_nascita)} />
                <DataField label="Luogo di Nascita" value={selectedPratica.sub_luogo_nascita} />
                <DataField label="Residenza Via" value={selectedPratica.sub_residenza_via} />
                <DataField label="Residenza Comune" value={selectedPratica.sub_residenza_comune} />
                <DataField label="Residenza CAP" value={selectedPratica.sub_residenza_cap} />
                <DataField label="Sede Impresa Via" value={selectedPratica.sub_sede_via} />
                <DataField label="Sede Impresa Comune" value={selectedPratica.sub_sede_comune} />
                <DataField label="Sede Impresa Provincia" value={selectedPratica.sub_sede_provincia} />
                <DataField label="Sede Impresa CAP" value={selectedPratica.sub_sede_cap} />
                <DataField label="PEC" value={selectedPratica.sub_pec} />
                <DataField label="Telefono" value={selectedPratica.sub_telefono} />
              </DataSection>

              {/* 4. Dati Cedente (Sezione B) - Anagrafica + Residenza + SCIA Precedente */}
              <DataSection title="B. Dati Cedente" icon={Users}>
                <DataField label="Partita IVA" value={selectedPratica.ced_partita_iva} />
                <DataField label="Codice Fiscale" value={selectedPratica.ced_cf} />
                <DataField label="Ragione Sociale" value={selectedPratica.ced_ragione_sociale} />
                <DataField label="Nome" value={selectedPratica.ced_nome} />
                <DataField label="Cognome" value={selectedPratica.ced_cognome} />
                <DataField label="Data di Nascita" value={formatDate(selectedPratica.ced_data_nascita)} />
                <DataField label="Luogo di Nascita" value={selectedPratica.ced_luogo_nascita} />
                <DataField label="Residenza Via" value={selectedPratica.ced_residenza_via} />
                <DataField label="Residenza Comune" value={selectedPratica.ced_residenza_comune} />
                <DataField label="Residenza CAP" value={selectedPratica.ced_residenza_cap} />
                <DataField label="PEC" value={selectedPratica.ced_pec} />
                <DataField label="SCIA Precedente N. Prot." value={selectedPratica.ced_scia_precedente} />
                <DataField label="Data Presentazione SCIA Prec." value={formatDate(selectedPratica.ced_data_presentazione)} />
                <DataField label="Comune Presentazione SCIA Prec." value={selectedPratica.ced_comune_presentazione} />
              </DataSection>

              {/* 5. Dati Posteggio e Mercato (Sezione C) */}
              <DataSection title="C. Dati Posteggio e Mercato" icon={MapPin}>
                {/* mercato_id contiene il nome se mercato_nome è vuoto (bug nel salvataggio) */}
                <DataField label="Mercato" value={selectedPratica.mercato_nome || selectedPratica.mercato_id} />
                <DataField label="ID Mercato" value={selectedPratica.mercato_nome ? selectedPratica.mercato_id : '-'} />
                {/* posteggio_id contiene il numero se posteggio_numero è vuoto */}
                <DataField label="Numero Posteggio" value={selectedPratica.posteggio_numero || selectedPratica.posteggio_id} />
                <DataField label="ID Posteggio" value={selectedPratica.posteggio_numero ? selectedPratica.posteggio_id : '-'} />
                <DataField label="Ubicazione" value={selectedPratica.ubicazione_mercato} />
                <DataField label="Giorno Mercato" value={selectedPratica.giorno_mercato} />
                <DataField label="Fila" value={selectedPratica.fila} />
                <DataField label="Dimensioni (MQ)" value={selectedPratica.dimensioni_mq} />
                <DataField label="Dimensioni Lineari" value={selectedPratica.dimensioni_lineari} />
                <DataField label="Attrezzature" value={selectedPratica.attrezzature} />
              </DataSection>

              {/* 6. Estremi Atto Notarile (Sezione D) */}
              <DataSection title="D. Estremi Atto Notarile" icon={FileCheck}>
                <DataField label="Notaio Rogante" value={selectedPratica.notaio_rogante} />
                <DataField label="N. Repertorio" value={selectedPratica.numero_repertorio} />
                <DataField label="Data Atto" value={formatDate(selectedPratica.data_atto)} />
              </DataSection>

              {/* Controlli e Punteggio */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Controlli Automatici v2.0 */}
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                        Controlli Automatici
                        <Badge className="bg-[#00f0ff]/20 text-[#00f0ff] text-xs">v2.0</Badge>
                      </CardTitle>
                      {/* Toggle Ultima Verifica / Storico */}
                      {selectedPratica?.checks && selectedPratica.checks.length > 0 && (
                        <button
                          onClick={() => setShowAllChecks(!showAllChecks)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            showAllChecks 
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b] hover:bg-[#f59e0b]/30' 
                              : 'bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30'
                          }`}
                        >
                          {showAllChecks ? '🔄 Mostra Solo Ultima' : '📜 Mostra Storico'}
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedPratica.checks && selectedPratica.checks.length > 0 ? (
                      <div className="space-y-4">
                        {/* Raggruppa per categoria */}
                        {(() => {
                          const allChecks = selectedPratica.checks || [];
                          
                          // Filtra per mostrare solo ultima verifica o tutto
                          let checks = allChecks;
                          if (!showAllChecks && allChecks.length > 0) {
                            // Trova il timestamp più recente
                            const latestTime = Math.max(...allChecks.map(c => 
                              new Date(c.data_check || c.created_at || 0).getTime()
                            ));
                            // Considera "ultima verifica" i check entro 5 minuti dal più recente
                            const threshold = latestTime - (5 * 60 * 1000); // 5 minuti
                            checks = allChecks.filter(c => {
                              const checkTime = new Date(c.data_check || c.created_at || 0).getTime();
                              return checkTime >= threshold;
                            });
                          }
                          const grouped: Record<string, typeof checks> = {};
                          
                          checks.forEach(check => {
                            // Estrai categoria dal dettaglio o dal check_code
                            let categoria = 'PRATICA';
                            try {
                              const dettaglio = typeof check.dettaglio === 'string' ? JSON.parse(check.dettaglio) : check.dettaglio;
                              categoria = dettaglio?.categoria || 'PRATICA';
                            } catch {
                              // Determina categoria dal nome del check
                              if (check.check_code?.includes('_SUB')) categoria = 'SUBENTRANTE';
                              else if (check.check_code?.includes('_CED') || check.check_code?.includes('CANONE')) categoria = 'CEDENTE';
                            }
                            if (!grouped[categoria]) grouped[categoria] = [];
                            grouped[categoria].push(check);
                          });
                          
                          const categorieOrder = ['SUBENTRANTE', 'CEDENTE', 'PRATICA'];
                          const categorieLabels: Record<string, { label: string; color: string; icon: string }> = {
                            'SUBENTRANTE': { label: 'Subentrante', color: '#00f0ff', icon: '👤' },
                            'CEDENTE': { label: 'Cedente', color: '#f59e0b', icon: '📤' },
                            'PRATICA': { label: 'Pratica', color: '#8b5cf6', icon: '📄' }
                          };
                          
                          return categorieOrder.map(cat => {
                            const catChecks = grouped[cat];
                            if (!catChecks || catChecks.length === 0) return null;
                            const catInfo = categorieLabels[cat] || { label: cat, color: '#6b7280', icon: '✓' };
                            
                            return (
                              <div key={cat} className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: catInfo.color }}>
                                  <span>{catInfo.icon}</span>
                                  <span>{catInfo.label}</span>
                                  <span className="text-xs text-gray-500">({catChecks.length})</span>
                                </div>
                                <div className="space-y-2 pl-4 border-l-2" style={{ borderColor: catInfo.color + '40' }}>
                                  {catChecks.map((check, idx) => {
                                    const isPassed = check.esito === true || check.esito === 'PASS' || check.esito === 'true';
                                    const checkName = check.tipo_check || check.check_code || 'Controllo';
                                    const checkTime = check.data_check || check.created_at;
                                    
                                    // Estrai motivo dal dettaglio
                                    let motivo = '';
                                    try {
                                      const dettaglio = typeof check.dettaglio === 'string' ? JSON.parse(check.dettaglio) : check.dettaglio;
                                      motivo = dettaglio?.motivo || '';
                                    } catch {}
                                    
                                    return (
                                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#0b1220]/50">
                                        <div className="flex items-center gap-2">
                                          {isPassed ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                          )}
                                          <div>
                                            <p className="text-[#e8fbff] text-sm">{checkName}</p>
                                            {motivo && <p className="text-xs text-gray-500">{motivo}</p>}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <span className={`text-xs font-medium ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
                                            {isPassed ? 'PASS' : 'FAIL'}
                                          </span>
                                          {checkTime && (
                                            <p className="text-xs text-gray-500">
                                              {formatDateTime(checkTime)}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Nessun controllo eseguito ancora. Clicca "Esegui Valutazione" per avviare i controlli.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Punteggio Affidabilità */}
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff]">Punteggio Affidabilità</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    {(() => {
                      // Calcola statistiche dai controlli - SOLO ULTIMA VERIFICA
                      const allChecks = selectedPratica.checks || [];
                      
                      // Filtra per mostrare solo ultima verifica (stesso filtro usato nella lista)
                      let checks = allChecks;
                      if (allChecks.length > 0) {
                        const latestTime = Math.max(...allChecks.map(c => 
                          new Date(c.data_check || c.created_at || 0).getTime()
                        ));
                        const threshold = latestTime - (5 * 60 * 1000); // 5 minuti
                        checks = allChecks.filter(c => {
                          const checkTime = new Date(c.data_check || c.created_at || 0).getTime();
                          return checkTime >= threshold;
                        });
                      }
                      
                      const totalChecks = checks.length;
                      const passedChecks = checks.filter(c => 
                        c.esito === true || c.esito === 'PASS' || c.esito === 'true'
                      ).length;
                      const failedChecks = totalChecks - passedChecks;
                      
                      // Ricalcola score basato solo sull'ultima verifica
                      const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
                      const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
                      
                      return (
                        <>
                          <div className="relative w-32 h-32">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="64" cy="64" r="56"
                                stroke="#1e293b"
                                strokeWidth="12"
                                fill="none"
                              />
                              <circle
                                cx="64" cy="64" r="56"
                                stroke={scoreColor}
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray={`${score * 3.52} 352`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-3xl font-bold text-[#e8fbff]">{score}</span>
                            </div>
                          </div>
                          <div className="mt-4 text-center">
                            {totalChecks > 0 ? (
                              <>
                                <p className="text-gray-400">
                                  <span className="text-green-400 font-medium">{passedChecks}</span> superati / 
                                  <span className="text-red-400 font-medium"> {failedChecks}</span> falliti
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  su {totalChecks} controlli totali
                                </p>
                              </>
                            ) : (
                              <p className="text-gray-500">Nessun controllo effettuato</p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Eventi */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff]">Timeline Eventi</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPratica.timeline && selectedPratica.timeline.length > 0 ? (
                    <div className="space-y-4">
                      {selectedPratica.timeline.map((evento, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-[#00f0ff]" />
                            {idx < selectedPratica.timeline.length - 1 && (
                              <div className="w-0.5 h-full bg-[#1e293b] my-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-xs text-gray-500">{formatDateTime((evento as any).data_evento || evento.created_at)}</p>
                            <p className="text-[#e8fbff] font-medium">{evento.tipo_evento}</p>
                            <p className="text-sm text-gray-400">{evento.descrizione}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Nessun evento registrato.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB LISTA CONCESSIONI */}
        {/* ================================================================== */}
        <TabsContent value="concessioni" className="space-y-4 mt-6">
          {/* Vista dettaglio concessione inline */}
          {selectedConcessione ? (
            <div className="space-y-6">
              {/* Header con pulsante torna */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedConcessione(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Torna alla lista
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      (selectedConcessione.stato_calcolato || selectedConcessione.stato) === 'ATTIVA'
                        ? 'bg-green-500' 
                        : (selectedConcessione.stato_calcolato || selectedConcessione.stato) === 'SCADUTA'
                          ? 'bg-red-500'
                          : (selectedConcessione.stato_calcolato || selectedConcessione.stato) === 'CESSATA'
                            ? 'bg-gray-500'
                            : 'bg-orange-500 animate-pulse'
                    }`} />
                    <span className="text-sm text-gray-400">
                      {selectedConcessione.stato_calcolato || selectedConcessione.stato || 'DA_ASSOCIARE'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Titolo concessione */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#e8fbff] flex items-center gap-3">
                    Concessione {selectedConcessione.numero_protocollo || `#${selectedConcessione.id}`}
                    <Badge className={`${
                      (selectedConcessione.stato_calcolato || selectedConcessione.stato) === 'ATTIVA'
                        ? 'bg-green-500/20 text-green-400'
                        : (selectedConcessione.stato_calcolato || selectedConcessione.stato) === 'SCADUTA'
                          ? 'bg-red-500/20 text-red-400'
                          : (selectedConcessione.stato_calcolato || selectedConcessione.stato) === 'CESSATA'
                            ? 'bg-gray-500/20 text-gray-400'
                            : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {selectedConcessione.stato_calcolato || selectedConcessione.stato || 'DA_ASSOCIARE'}
                    </Badge>
                  </h3>
                  <p className="text-gray-400">
                    {(selectedConcessione.tipo_concessione || 'FISSO').toUpperCase()} - {selectedConcessione.ragione_sociale || 'N/A'} ({selectedConcessione.partita_iva || 'N/A'})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-[#14b8a6]/30 text-[#e8fbff]"
                    onClick={() => {
                      // Genera PDF della concessione
                      const conc = selectedConcessione;
                      const content = `
CONCESSIONE N. ${conc.numero_protocollo || conc.id}
${'='.repeat(50)}

FRONTESPIZIO
------------
Numero Protocollo: ${conc.numero_protocollo || '-'}
Data Protocollazione: ${conc.data_protocollazione ? new Date(conc.data_protocollazione).toLocaleDateString('it-IT') : '-'}
Comune Rilascio: ${conc.comune_rilascio || '-'}
Durata: ${conc.durata_anni || 10} anni
Tipo Concessione: ${conc.tipo_concessione || 'fisso'}
Settore Merceologico: ${conc.settore_merceologico || '-'}
Data Decorrenza: ${conc.data_decorrenza ? new Date(conc.data_decorrenza).toLocaleDateString('it-IT') : '-'}
Data Scadenza: ${conc.valid_to ? new Date(conc.valid_to).toLocaleDateString('it-IT') : '-'}
Oggetto: ${conc.oggetto || '-'}

CONCESSIONARIO
--------------
Ragione Sociale: ${conc.ragione_sociale || '-'}
Partita IVA: ${conc.partita_iva || '-'}
Codice Fiscale: ${conc.cf_concessionario || '-'}
Nome: ${conc.nome || '-'}
Cognome: ${conc.cognome || '-'}

DATI POSTEGGIO E MERCATO
------------------------
Mercato: ${conc.mercato_nome || conc.market_name || '-'}
Numero Posteggio: ${conc.numero_posteggio || conc.stall_number || '-'}
Ubicazione: ${conc.ubicazione || '-'}
Giorno Mercato: ${conc.giorno_mercato || '-'}
Fila: ${conc.fila || '-'}
Dimensioni (MQ): ${conc.mq || '-'}
Dimensioni Lineari: ${conc.dimensioni_lineari || '-'}

CEDENTE (se subingresso)
------------------------
Ragione Sociale: ${conc.cedente_ragione_sociale || '-'}
Partita IVA: ${conc.cedente_partita_iva || '-'}
Codice Fiscale: ${conc.cedente_cf || '-'}
Autorizzazione Precedente: ${conc.autorizzazione_precedente_pg || '-'}

${'='.repeat(50)}
Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
                      `.trim();
                      
                      // Download come file TXT
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Concessione_${conc.numero_protocollo || conc.id}_${new Date().toISOString().split('T')[0]}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      
                      toast.success('Concessione esportata!', {
                        description: `File scaricato: Concessione_${conc.numero_protocollo || conc.id}.txt`
                      });
                    }}
                  >
                    <FileCheck className="mr-2 h-4 w-4" />
                    Esporta
                  </Button>
                </div>
              </div>
              
              {/* Sezione Frontespizio */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Frontespizio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">N. Protocollo</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.numero_protocollo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Data Protocollazione</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.data_protocollazione ? formatDate(selectedConcessione.data_protocollazione) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Comune Rilascio</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.comune_rilascio || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Durata</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.durata_anni || 10} anni</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Data Decorrenza</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.valid_from ? formatDate(selectedConcessione.valid_from) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Scadenza</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.valid_to ? formatDate(selectedConcessione.valid_to) : '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Oggetto</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.oggetto || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Sezione Concessionario */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Concessionario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Ragione Sociale</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.ragione_sociale || selectedConcessione.vendor_business_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Partita IVA</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.partita_iva || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Codice Fiscale</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.cf_concessionario || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Cognome</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.cognome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Settore Merceologico</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.settore_merceologico || '-'}</p>
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Sede Legale</p>
                      <p className="text-[#e8fbff] font-medium">
                        {[selectedConcessione.sede_legale_via, selectedConcessione.sede_legale_cap, selectedConcessione.sede_legale_comune, selectedConcessione.sede_legale_provincia].filter(Boolean).join(', ') || '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Sezione Posteggio */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Dati Posteggio e Mercato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Mercato</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.market_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Numero Posteggio</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.stall_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Ubicazione</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.ubicazione || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Giorno Mercato</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.giorno || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Fila</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.fila || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Dimensioni (MQ)</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.mq || selectedConcessione.stall_area || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Dimensioni Lineari</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.dimensioni_lineari || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Sezione Cedente (solo per subingresso) */}
              {selectedConcessione.tipo_concessione === 'subingresso' && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5" />
                      Cedente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Ragione Sociale</p>
                        <p className="text-[#e8fbff] font-medium">{selectedConcessione.cedente_ragione_sociale || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Partita IVA</p>
                        <p className="text-[#e8fbff] font-medium">{selectedConcessione.cedente_partita_iva || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Codice Fiscale</p>
                        <p className="text-[#e8fbff] font-medium">{selectedConcessione.cedente_cf || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
                        <p className="text-[#e8fbff] font-medium">{selectedConcessione.cedente_nome || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Cognome</p>
                        <p className="text-[#e8fbff] font-medium">{selectedConcessione.cedente_cognome || '-'}</p>
                      </div>
                      <div className="col-span-2 md:col-span-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Sede Legale Cedente</p>
                        <p className="text-[#e8fbff] font-medium">
                          {selectedConcessione.cedente_sede_legale || [selectedConcessione.cedente_indirizzo_via, selectedConcessione.cedente_indirizzo_cap, selectedConcessione.cedente_indirizzo_comune, selectedConcessione.cedente_indirizzo_provincia].filter(Boolean).join(', ') || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Sezione Autorizzazione Precedente */}
              {(selectedConcessione.autorizzazione_precedente_pg || selectedConcessione.scia_precedente_numero) && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                      <FileCheck className="h-5 w-5" />
                      Autorizzazione / SCIA Precedente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedConcessione.autorizzazione_precedente_pg && (
                        <div><p className="text-xs text-gray-500 uppercase tracking-wide">N. Protocollo Aut.</p><p className="text-[#e8fbff] font-medium">{selectedConcessione.autorizzazione_precedente_pg}</p></div>
                      )}
                      {selectedConcessione.autorizzazione_precedente_data && (
                        <div><p className="text-xs text-gray-500 uppercase tracking-wide">Data Aut.</p><p className="text-[#e8fbff] font-medium">{new Date(selectedConcessione.autorizzazione_precedente_data).toLocaleDateString('it-IT')}</p></div>
                      )}
                      {selectedConcessione.autorizzazione_precedente_intestatario && (
                        <div><p className="text-xs text-gray-500 uppercase tracking-wide">Intestatario Aut.</p><p className="text-[#e8fbff] font-medium">{selectedConcessione.autorizzazione_precedente_intestatario}</p></div>
                      )}
                      {selectedConcessione.scia_precedente_numero && (
                        <div><p className="text-xs text-gray-500 uppercase tracking-wide">N. SCIA Prec.</p><p className="text-[#e8fbff] font-medium">{selectedConcessione.scia_precedente_numero}</p></div>
                      )}
                      {selectedConcessione.scia_precedente_data && (
                        <div><p className="text-xs text-gray-500 uppercase tracking-wide">Data SCIA Prec.</p><p className="text-[#e8fbff] font-medium">{new Date(selectedConcessione.scia_precedente_data).toLocaleDateString('it-IT')}</p></div>
                      )}
                      {selectedConcessione.scia_precedente_comune && (
                        <div><p className="text-xs text-gray-500 uppercase tracking-wide">Comune SCIA Prec.</p><p className="text-[#e8fbff] font-medium">{selectedConcessione.scia_precedente_comune}</p></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Sezione Dati Economici */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    Dati Economici e Attrezzature
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedConcessione.canone_unico && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Canone Unico</p><p className="text-[#14b8a6] font-bold text-lg">€ {Number(selectedConcessione.canone_unico).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p></div>
                    )}
                    {selectedConcessione.attrezzature && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Attrezzature</p><p className="text-[#e8fbff] font-medium">{selectedConcessione.attrezzature}</p></div>
                    )}
                    {selectedConcessione.tipo_posteggio && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wide">Tipo Posteggio</p><p className="text-[#e8fbff] font-medium">{selectedConcessione.tipo_posteggio}</p></div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Sezione Wallet Concessione - Stile Domanda Spunta */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5" />
                    Wallet Concessione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">ID Wallet</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.wallet_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo</p>
                      <p className="text-[#e8fbff] font-medium text-lg">
                        <span className={Number(selectedConcessione.wallet_balance || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                          € {Number(selectedConcessione.wallet_balance || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Stato Wallet</p>
                      <p className="text-[#e8fbff] font-medium">
                        {selectedConcessione.wallet_status === 'ACTIVE' ? (
                          <span className="text-green-400">✓ Attivo</span>
                        ) : selectedConcessione.wallet_id ? (
                          <span className="text-orange-400">⚠ {selectedConcessione.wallet_status || 'Sospeso'}</span>
                        ) : (
                          <span className="text-gray-400">- Non creato</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Sezione Requisiti e Documentazione - Stile Autorizzazione */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5" />
                    Requisiti e Documentazione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">DURC Valido</p>
                      <p className="text-[#e8fbff] font-medium">
                        {selectedConcessione.durc_scadenza_qualifica && new Date(selectedConcessione.durc_scadenza_qualifica) > new Date() ? (
                          <span className="text-green-400">✓ Sì</span>
                        ) : selectedConcessione.durc_scadenza_qualifica ? (
                          <span className="text-orange-400">⚠ Scaduto</span>
                        ) : (
                          <span className="text-red-400">✗ Non presente</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Scadenza DURC</p>
                      <p className="text-[#e8fbff] font-medium">{selectedConcessione.durc_scadenza_qualifica ? new Date(selectedConcessione.durc_scadenza_qualifica).toLocaleDateString('it-IT') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Requisiti Morali</p>
                      <p className="text-[#e8fbff] font-medium">
                        {selectedConcessione.requisiti_morali ? (
                          <span className="text-green-400">✓ Verificati</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Requisiti Professionali</p>
                      <p className="text-[#e8fbff] font-medium">
                        {selectedConcessione.requisiti_professionali ? (
                          <span className="text-green-400">✓ Verificati</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Sezione Note e Riferimenti */}
              {(selectedConcessione.notes || selectedConcessione.scia_id) && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
                      <FileCheck className="h-5 w-5" />
                      Note e Riferimenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedConcessione.notes && (<div className="col-span-2 md:col-span-3"><p className="text-xs text-gray-500 uppercase tracking-wide">Note / Prescrizioni</p><p className="text-[#e8fbff] font-medium whitespace-pre-wrap">{selectedConcessione.notes}</p></div>)}
                      {selectedConcessione.scia_id && (<div><p className="text-xs text-gray-500 uppercase tracking-wide">Riferimento SCIA</p><p className="text-[#e8fbff] font-medium">SCIA #{selectedConcessione.scia_id}</p></div>)}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Sezione Aggiorna Posteggi (solo per subingresso DA_ASSOCIARE) */}
              {selectedConcessione.tipo_concessione === 'subingresso' && 
               (selectedConcessione.stato === 'DA_ASSOCIARE' || !selectedConcessione.stato) && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-yellow-500/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-yellow-400 flex items-center gap-2 text-lg">
                      <RefreshCw className="h-5 w-5" />
                      Aggiorna Posteggi
                      <span className="ml-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 text-yellow-400 mb-2">
                        <AlertCircle className="h-5 w-5" />
                        <span className="font-medium">Azione richiesta</span>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Questa concessione di subingresso richiede l'associazione del posteggio al nuovo concessionario.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="bg-[#0b1220] rounded-lg p-4 border border-red-500/30">
                        <h4 className="text-red-400 font-medium mb-3">DA: Cedente</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500">Operatore:</span> <span className="text-[#e8fbff]">{selectedConcessione.cedente_ragione_sociale || '-'}</span></div>
                          <div><span className="text-gray-500">CF/P.IVA:</span> <span className="text-[#e8fbff]">{selectedConcessione.cedente_cf || selectedConcessione.cedente_partita_iva || '-'}</span></div>
                          <div><span className="text-gray-500">Posteggio:</span> <span className="text-[#e8fbff]">{selectedConcessione.stall_number} - {selectedConcessione.market_name}</span></div>
                        </div>
                      </div>
                      
                      <div className="bg-[#0b1220] rounded-lg p-4 border border-green-500/30">
                        <h4 className="text-green-400 font-medium mb-3">A: Subentrante</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-500">Operatore:</span> <span className="text-[#e8fbff]">{selectedConcessione.ragione_sociale || '-'}</span></div>
                          <div><span className="text-gray-500">CF/P.IVA:</span> <span className="text-[#e8fbff]">{selectedConcessione.cf_concessionario || selectedConcessione.partita_iva || '-'}</span></div>
                          <div><span className="text-gray-500">Posteggio:</span> <span className="text-[#e8fbff]">{selectedConcessione.stall_number} - {selectedConcessione.market_name}</span></div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
                      disabled={loading}
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const response = await fetch(`https://orchestratore.mio-hub.me/api/concessions/${selectedConcessione.id}/associa-posteggio`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                          });
                          const result = await response.json();
                          if (result.success) {
                            toast.success('Posteggio associato!', { description: 'Il trasferimento è stato completato' });
                            setSelectedConcessione({ ...selectedConcessione, stato: 'ATTIVA' });
                            loadConcessioni();
                          } else {
                            toast.error('Errore', { description: result.error || 'Impossibile associare il posteggio' });
                          }
                        } catch (err) {
                          toast.error('Errore di rete');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Elaborazione...</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Conferma Associazione</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {/* Sezione Note */}
              {selectedConcessione.notes && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#f97316]/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#f97316] flex items-center gap-2 text-lg">
                      <FileCheck className="h-5 w-5" />
                      Note e Prescrizioni
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#e8fbff]">{selectedConcessione.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <>
          {/* Barra ricerca e filtri */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Cerca per numero, concessionario o mercato..."
                value={searchConcessioni}
                onChange={(e) => setSearchConcessioni(e.target.value)}
                className="pl-10 bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
              />
            </div>
            <Button 
              variant="outline" 
              className={`border-[#14b8a6]/30 text-[#e8fbff] ${showConcessioniFilters ? 'bg-[#14b8a6]/20' : ''}`}
              onClick={() => setShowConcessioniFilters(!showConcessioniFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtri
            </Button>
            <Button 
              onClick={() => {
                setConcessionePreData(null);
                setConcessioneMode('create');
                setSelectedConcessioneId(null);
                setShowConcessioneForm(true);
              }}
              className="bg-[#14b8a6] text-black hover:bg-[#14b8a6]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuova Concessione
            </Button>
          </div>

          {/* Pannello Filtri Espandibile */}
          {showConcessioniFilters && (
            <div className="flex flex-wrap gap-4 p-4 bg-[#0f172a] rounded-lg border border-[#14b8a6]/20">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                <select
                  value={concessioniFilterTipo}
                  onChange={(e) => setConcessioniFilterTipo(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a2332] border border-[#14b8a6]/30 rounded-md text-[#e8fbff] text-sm"
                >
                  <option value="all">Tutti i tipi</option>
                  <option value="rinnovo">Rinnovo</option>
                  <option value="subingresso">Subingresso</option>
                  <option value="nuova">Nuova</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-400 mb-1 block">Stato</label>
                <select
                  value={concessioniFilterStato}
                  onChange={(e) => setConcessioniFilterStato(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a2332] border border-[#14b8a6]/30 rounded-md text-[#e8fbff] text-sm"
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="ATTIVA">Attiva</option>
                  <option value="SCADUTA">Scaduta</option>
                  <option value="CESSATA">Cessata</option>
                  <option value="SOSPESA">Sospesa</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs text-gray-400 mb-1 block">Mercato</label>
                <select
                  value={concessioniFilterMercato}
                  onChange={(e) => setConcessioniFilterMercato(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a2332] border border-[#14b8a6]/30 rounded-md text-[#e8fbff] text-sm"
                >
                  <option value="all">Tutti i mercati</option>
                  {Array.from(new Set(concessioni.map(c => c.market_name).filter(Boolean))).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConcessioniFilterTipo('all');
                    setConcessioniFilterStato('all');
                    setConcessioniFilterMercato('all');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Reset
                </Button>
              </div>
            </div>
          )}

          {/* Tabella concessioni */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
            <CardContent className="p-0">
              {concessioni.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <ScrollText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Nessuna concessione presente</p>
                  <p className="text-sm mt-2">Le concessioni generate appariranno qui</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#14b8a6]/30 hover:bg-transparent">
                      <TableHead className="text-gray-400">N. Protocollo</TableHead>
                      <TableHead className="text-gray-400">Tipo</TableHead>
                      <TableHead className="text-gray-400">Concessionario</TableHead>
                      <TableHead className="text-gray-400">Sede Legale</TableHead>
                      <TableHead className="text-gray-400">Mercato</TableHead>
                      <TableHead className="text-gray-400">Posteggio</TableHead>
                      <TableHead className="text-gray-400">Scadenza</TableHead>
                      <TableHead className="text-gray-400">Stato</TableHead>
                      <TableHead className="text-gray-400">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {concessioni
                      .filter((conc) => {
                        // Filtro ricerca testuale
                        if (searchConcessioni) {
                          const search = searchConcessioni.toLowerCase();
                          const matchesSearch = (
                            conc.numero_protocollo?.toLowerCase().includes(search) ||
                            conc.ragione_sociale?.toLowerCase().includes(search) ||
                            conc.market_name?.toLowerCase().includes(search) ||
                            conc.cf_concessionario?.toLowerCase().includes(search)
                          );
                          if (!matchesSearch) return false;
                        }
                        // Filtro tipo
                        if (concessioniFilterTipo !== 'all') {
                          const tipo = (conc.tipo_concessione || 'nuova').toLowerCase();
                          if (tipo !== concessioniFilterTipo.toLowerCase()) return false;
                        }
                        // Filtro stato
                        if (concessioniFilterStato !== 'all') {
                          const stato = (conc.stato_calcolato || conc.stato || '').toUpperCase();
                          if (stato !== concessioniFilterStato) return false;
                        }
                        // Filtro mercato
                        if (concessioniFilterMercato !== 'all') {
                          if (conc.market_name !== concessioniFilterMercato) return false;
                        }
                        return true;
                      })
                      .map((conc) => (
                      <TableRow 
                        key={conc.id} 
                        className="border-[#14b8a6]/30 hover:bg-[#0f172a] cursor-pointer"
                      >
                        <TableCell className="text-[#e8fbff] font-medium">
                          {conc.numero_protocollo || `#${conc.id}`}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#14b8a6]/20 text-[#14b8a6]">
                            {conc.tipo_concessione || 'nuova'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-[#e8fbff]">{conc.ragione_sociale || conc.vendor_business_name || '-'}</p>
                            <p className="text-xs text-gray-500">{conc.cf_concessionario || conc.partita_iva || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#e8fbff] text-xs">
                          {[conc.sede_legale_via, conc.sede_legale_comune, conc.sede_legale_provincia].filter(Boolean).join(', ') || '-'}
                        </TableCell>
                        <TableCell className="text-[#e8fbff]">{conc.market_name || '-'}</TableCell>
                        <TableCell className="text-[#e8fbff]">{conc.stall_number || '-'}</TableCell>
                        <TableCell className="text-gray-400">
                          {conc.valid_to ? formatDate(conc.valid_to) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            (conc.stato_calcolato || conc.stato) === 'ATTIVA' 
                              ? 'bg-green-500/20 text-green-400' 
                              : (conc.stato_calcolato || conc.stato) === 'SCADUTA'
                                ? 'bg-red-500/20 text-red-400'
                                : (conc.stato_calcolato || conc.stato) === 'CESSATA'
                                  ? 'bg-gray-500/20 text-gray-400'
                                  : (conc.stato_calcolato || conc.stato) === 'DA_ASSOCIARE'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-gray-500/20 text-gray-400'
                          }>
                            {conc.stato_calcolato || conc.stato || 'N/D'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-[#14b8a6] hover:bg-[#14b8a6]/10"
                            title="Visualizza"
                            onClick={async () => {
                              // Carica i dettagli completi della concessione (inclusi campi cedente)
                              try {
                                const response = await fetch(`https://orchestratore.mio-hub.me/api/concessions/${conc.id}`);
                                const data = await response.json();
                                if (data.success && data.data) {
                                  let concessioneData = { ...conc, ...data.data };
                                  // Se c'è cedente_impresa_id, carica anche i dati dell'impresa cedente
                                  if (data.data.cedente_impresa_id) {
                                    try {
                                      const cedenteResponse = await fetch(`https://orchestratore.mio-hub.me/api/imprese/${data.data.cedente_impresa_id}`);
                                      const cedenteData = await cedenteResponse.json();
                                      if (cedenteData.success && cedenteData.data) {
                                        concessioneData = {
                                          ...concessioneData,
                                          cedente_nome: cedenteData.data.rappresentante_legale_nome || '',
                                          cedente_cognome: cedenteData.data.rappresentante_legale_cognome || '',
                                          cedente_sede_legale: [cedenteData.data.indirizzo_via, cedenteData.data.indirizzo_cap, cedenteData.data.comune, cedenteData.data.indirizzo_provincia].filter(Boolean).join(', ') || ''
                                        };
                                      }
                                    } catch (cedenteError) {
                                      console.error('Errore caricamento impresa cedente:', cedenteError);
                                    }
                                  }
                                  setSelectedConcessione(concessioneData);
                                } else {
                                  setSelectedConcessione(conc);
                                }
                              } catch (error) {
                                console.error('Errore caricamento dettagli concessione:', error);
                                setSelectedConcessione(conc);
                              }
                              setConcessioneDetailTab('dati');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-yellow-400 hover:bg-yellow-400/10"
                            title="Modifica"
                            onClick={async () => {
                              // Carica i dettagli completi della concessione prima di aprire il form
                              try {
                                const response = await fetch(`https://orchestratore.mio-hub.me/api/concessions/${conc.id}`);
                                const data = await response.json();
                                if (data.success && data.data) {
                                  // Combina i dati della lista con i dettagli completi
                                  const fullConcessioneData = {
                                    ...conc,
                                    ...data.data,
                                    // Assicurati che mercato_id e posteggio_id siano presenti
                                    mercato_id: data.data.market_id || conc.market_id,
                                    posteggio_id: data.data.stall_id || conc.stall_id,
                                    posteggio: data.data.stall_number || conc.stall_number
                                  };
                                  setConcessionePreData(fullConcessioneData);
                                  setConcessioneMode('edit');
                                  setSelectedConcessioneId(conc.id);
                                  setShowConcessioneForm(true);
                                } else {
                                  // Fallback: usa i dati dalla lista
                                  setConcessionePreData(conc);
                                  setConcessioneMode('edit');
                                  setSelectedConcessioneId(conc.id);
                                  setShowConcessioneForm(true);
                                }
                              } catch (error) {
                                console.error('Errore caricamento dettagli concessione:', error);
                                // Fallback: usa i dati dalla lista
                                setConcessionePreData(conc);
                                setConcessioneMode('edit');
                                setSelectedConcessioneId(conc.id);
                                setShowConcessioneForm(true);
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-red-400 hover:bg-red-400/10"
                            title="Elimina"
                            onClick={async () => {
                              if (!confirm(`Sei sicuro di voler eliminare la concessione ${conc.numero_protocollo || '#' + conc.id}?`)) return;
                              try {
                                const response = await fetch(`https://orchestratore.mio-hub.me/api/concessions/${conc.id}`, {
                                  method: 'DELETE'
                                });
                                const data = await response.json();
                                if (data.success) {
                                  toast.success('Concessione eliminata');
                                  loadConcessioni();
                                } else {
                                  toast.error(data.error || 'Errore eliminazione');
                                }
                              } catch (error) {
                                console.error('Errore eliminazione:', error);
                                toast.error('Errore di connessione');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          </>
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB AUTORIZZAZIONI */}
        {/* ================================================================== */}
        <TabsContent value="autorizzazioni" className="space-y-4 mt-6">
          {showAutorizzazioneForm ? (
            <AutorizzazioneForm 
              onSubmit={() => {
                setShowAutorizzazioneForm(false);
                setSelectedAutorizzazioneId(null);
                setAutorizzazioneMode('create');
                toast.success(autorizzazioneMode === 'create' ? 'Autorizzazione creata!' : 'Autorizzazione aggiornata!');
              }}
              onCancel={() => {
                setShowAutorizzazioneForm(false);
                setSelectedAutorizzazioneId(null);
                setAutorizzazioneMode('create');
              }}
              autorizzazioneId={selectedAutorizzazioneId}
              mode={autorizzazioneMode}
            />
          ) : autorizzazioneMode === 'view' && selectedAutorizzazioneId ? (
            <AutorizzazioneDetail
              autorizzazioneId={selectedAutorizzazioneId}
              onBack={() => {
                setSelectedAutorizzazioneId(null);
                setAutorizzazioneMode('create');
              }}
            />
          ) : (
            <ListaAutorizzazioniSuap 
              onNuovaAutorizzazione={() => {
                setAutorizzazioneMode('create');
                setSelectedAutorizzazioneId(null);
                setShowAutorizzazioneForm(true);
              }}
              onViewAutorizzazione={(id) => {
                setAutorizzazioneMode('view');
                setSelectedAutorizzazioneId(id);
              }}
              onEditAutorizzazione={(id) => {
                setAutorizzazioneMode('edit');
                setSelectedAutorizzazioneId(id);
                setShowAutorizzazioneForm(true);
              }}
            />
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB DOMANDE SPUNTA */}
        {/* ================================================================== */}
        <TabsContent value="domandespunta" className="space-y-4 mt-6">
          {showDomandaSpuntaForm ? (
            <DomandaSpuntaForm 
              onSubmit={() => {
                setShowDomandaSpuntaForm(false);
                setSelectedDomandaSpuntaId(null);
                setDomandaSpuntaMode('create');
                toast.success(domandaSpuntaMode === 'create' ? 'Domanda Spunta inviata!' : 'Domanda Spunta aggiornata!');
              }}
              onCancel={() => {
                setShowDomandaSpuntaForm(false);
                setSelectedDomandaSpuntaId(null);
                setDomandaSpuntaMode('create');
              }}
              domandaId={selectedDomandaSpuntaId}
              mode={domandaSpuntaMode}
            />
          ) : domandaSpuntaMode === 'view' && selectedDomandaSpuntaId ? (
            <DomandaSpuntaDetail
              domandaId={selectedDomandaSpuntaId}
              onBack={() => {
                setSelectedDomandaSpuntaId(null);
                setDomandaSpuntaMode('create');
              }}
            />
          ) : (
            <ListaDomandeSpuntaSuap 
              onNuovaDomanda={() => {
                setDomandaSpuntaMode('create');
                setSelectedDomandaSpuntaId(null);
                setShowDomandaSpuntaForm(true);
              }}
              onViewDomanda={(id) => {
                setDomandaSpuntaMode('view');
                setSelectedDomandaSpuntaId(id);
              }}
              onEditDomanda={(id) => {
                setDomandaSpuntaMode('edit');
                setSelectedDomandaSpuntaId(id);
                setShowDomandaSpuntaForm(true);
              }}
            />
          )}
        </TabsContent>

        {/* ================================================================== */}
        {/* TAB NOTIFICHE */}
        {/* ================================================================== */}
        <TabsContent value="notifiche" className="space-y-6 mt-6">
          <NotificationManager 
            mittenteTipo="SUAP"
            mittenteId={comuneData?.id || 1}
            mittenteNome={`SUAP Comune di ${comuneData?.nome || 'Grosseto'}`}
            onNotificheUpdate={loadNotificheCount}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Form SCIA */}
      {showSciaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <SciaForm
              onSubmit={handleSciaSubmit}
              onCancel={() => setShowSciaForm(false)}
            />
          </div>
        </div>
      )}

      {/* Form Concessione - Modal allargato senza overlay */}
      {showConcessioneForm && (
        <div className="fixed inset-0 z-50 bg-[#0b1220] overflow-y-auto p-4">
          <ConcessioneForm 
            onSubmit={(savedConcessione) => {
              setShowConcessioneForm(false);
              setConcessionePreData(null);
              setConcessioneMode('create');
              setSelectedConcessioneId(null);
              loadConcessioni(); // Ricarica le concessioni
              // Aggiorna la pratica selezionata con il nuovo concessione_id
              if (selectedPratica && savedConcessione?.id) {
                setSelectedPratica({
                  ...selectedPratica,
                  concessione_id: savedConcessione.id
                });
                // Aggiorna anche nella lista pratiche
                setPratiche(prev => prev.map(p => 
                  p.id === selectedPratica.id 
                    ? { ...p, concessione_id: savedConcessione.id }
                    : p
                ));
              }
              setActiveTab('concessioni'); // Vai al tab concessioni
              toast.success(concessioneMode === 'edit' ? 'Concessione aggiornata!' : 'Concessione salvata!', { 
                description: `N. ${savedConcessione?.numero_protocollo || savedConcessione?.id}` 
              });
            }}
            onCancel={() => {
              setShowConcessioneForm(false);
              setConcessionePreData(null);
              setConcessioneMode('create');
              setSelectedConcessioneId(null);
            }}
            initialData={concessionePreData}
            mode={concessioneMode}
            concessioneId={selectedConcessioneId || undefined}
          />
        </div>
      )}
    </div>
  );
}
