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
  Plus, LayoutDashboard, List, FileSearch, AlertCircle, TrendingUp
} from 'lucide-react';
import { 
  getSuapStats, getSuapPratiche, getSuapPraticaById, 
  createSuapPratica, evaluateSuapPratica,
  SuapStats, SuapPratica, SuapEvento, SuapCheck 
} from '@/api/suap';
import SciaForm from '@/components/suap/SciaForm';
import ConcessioneForm from '@/components/suap/ConcessioneForm';
import { toast } from 'sonner';

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
  sub_ragione_sociale?: string;
  sub_nome?: string;
  sub_cognome?: string;
  sub_data_nascita?: string;
  sub_luogo_nascita?: string;
  sub_residenza_via?: string;
  sub_residenza_comune?: string;
  sub_residenza_cap?: string;
  sub_sede_via?: string;
  sub_sede_comune?: string;
  sub_sede_provincia?: string;
  sub_sede_cap?: string;
  sub_pec?: string;
  sub_telefono?: string;
  ced_cf?: string;
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
}

// ============================================================================
// COMPONENTI HELPER
// ============================================================================

function DataSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="bg-[#1e293b] border-[#334155]">
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lista' | 'dettaglio'>('dashboard');
  const [stats, setStats] = useState<SuapStats | null>(null);
  const [pratiche, setPratiche] = useState<SuapPratica[]>([]);
  const [selectedPratica, setSelectedPratica] = useState<SuapPraticaFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSciaForm, setShowSciaForm] = useState(false);
  const [showConcessioneForm, setShowConcessioneForm] = useState(false);

  // Carica dati iniziali
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, praticheData] = await Promise.all([
        getSuapStats(ENTE_ID),
        getSuapPratiche(ENTE_ID)
      ]);
      setStats(statsData);
      // Ordina per data creazione (più recenti prima)
      const sorted = praticheData.sort((a, b) => 
        new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      setPratiche(sorted);
    } catch (error) {
      console.error('Error loading SUAP data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
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
            onClick={() => setShowConcessioneForm(true)}
            variant="outline"
            className="border-[#1e293b] text-[#e8fbff] hover:bg-[#1e293b]"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Concessione
          </Button>
        </div>
      </div>

      {/* Tabs di navigazione */}
      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as 'dashboard' | 'lista' | 'dettaglio')}
      >
        <TabsList className="grid w-full grid-cols-3 bg-[#0b1220]/50">
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
                <div className="text-2xl font-bold text-white">{stats?.totale || 0}</div>
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

          {/* Attività Recente e Stato Integrazioni */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attività Recente */}
            <Card className="bg-[#1e293b] border-[#334155]">
              <CardHeader>
                <CardTitle className="text-[#e8fbff]">Attività Recente</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
                  </div>
                ) : pratiche.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Nessuna pratica presente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pratiche.slice(0, 5).map((pratica) => (
                      <div 
                        key={pratica.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-[#0b1220] hover:bg-[#0f172a] cursor-pointer transition-colors"
                        onClick={() => loadPraticaDetail(pratica.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#e8fbff]">{pratica.tipo_pratica}</span>
                            {getStatoBadge(pratica.stato)}
                          </div>
                          <p className="text-sm text-gray-500">
                            {pratica.richiedente_nome} - {pratica.richiedente_cf}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">{timeAgo(pratica.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stato Integrazioni */}
            <Card className="bg-[#1e293b] border-[#334155]">
              <CardHeader>
                <CardTitle className="text-[#e8fbff]">Stato Integrazioni</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[#e8fbff]">PDND Interoperabilità</span>
                  </div>
                  <span className="text-sm text-gray-500">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[#e8fbff]">INPS DURC OnLine</span>
                  </div>
                  <span className="text-sm text-gray-500">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-[#e8fbff]">Agenzia Entrate</span>
                  </div>
                  <span className="text-sm text-gray-500">Latenza Alta</span>
                </div>
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
                className="pl-10 bg-[#1e293b] border-[#334155] text-[#e8fbff]"
              />
            </div>
            <Button variant="outline" className="border-[#1e293b] text-[#e8fbff]">
              <Filter className="mr-2 h-4 w-4" />
              Filtri Avanzati
            </Button>
          </div>

          {/* Tabella pratiche */}
          <Card className="bg-[#1e293b] border-[#334155]">
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
                    <TableRow className="border-[#1e293b] hover:bg-transparent">
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
                        className="border-[#1e293b] hover:bg-[#0f172a] cursor-pointer"
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
            <Card className="bg-[#1e293b] border-[#334155]">
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
                </div>
                <Button 
                  onClick={handleEvaluate}
                  disabled={loading}
                  className="bg-[#00f0ff] text-[#0a1628] hover:bg-[#00d4e0]"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Esegui Valutazione
                </Button>
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
                </DataSection>
              )}

              {/* 3. Dati Subentrante (Sezione A) - Anagrafica + Residenza + Sede */}
              <DataSection title="A. Dati Subentrante (Cessionario)" icon={User}>
                <DataField label="CF / P.IVA" value={selectedPratica.richiedente_cf} />
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
              <DataSection title="B. Dati Cedente (Dante Causa)" icon={Users}>
                <DataField label="CF / P.IVA" value={selectedPratica.ced_cf} />
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
                {/* Controlli Automatici */}
                <Card className="bg-[#1e293b] border-[#334155]">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff]">Controlli Automatici</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPratica.checks && selectedPratica.checks.length > 0 ? (
                      <div className="space-y-3">
                        {selectedPratica.checks.map((check, idx) => {
                          // Gestisce sia boolean che string per esito
                          const isPassed = check.esito === true || check.esito === 'PASS' || check.esito === 'true';
                          const checkName = check.tipo_check || check.check_code || 'Controllo';
                          const checkTime = check.data_check || check.created_at;
                          
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#0b1220]">
                              <div className="flex items-center gap-2">
                                {isPassed ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                                <div>
                                  <p className="text-[#e8fbff] font-medium">{checkName}</p>
                                  <p className="text-xs text-gray-500">Fonte: {check.fonte}</p>
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
                    ) : (
                      <p className="text-gray-500 italic">Nessun controllo eseguito ancora. Clicca "Esegui Valutazione" per avviare i controlli.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Punteggio Affidabilità */}
                <Card className="bg-[#1e293b] border-[#334155]">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff]">Punteggio Affidabilità</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    {(() => {
                      // Calcola statistiche dai controlli
                      const checks = selectedPratica.checks || [];
                      const totalChecks = checks.length;
                      const passedChecks = checks.filter(c => 
                        c.esito === true || c.esito === 'PASS' || c.esito === 'true'
                      ).length;
                      const failedChecks = totalChecks - passedChecks;
                      const score = selectedPratica.score || 0;
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
              <Card className="bg-[#1e293b] border-[#334155]">
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
                            <p className="text-xs text-gray-500">{formatDateTime(evento.data_evento)}</p>
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
      </Tabs>

      {/* Modal Form SCIA */}
      {showSciaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <SciaForm 
              onSubmit={handleSciaSubmit}
              onCancel={() => setShowSciaForm(false)}
              isLoading={loading}
            />
          </div>
        </div>
      )}

      {/* Modal Form Concessione */}
      {showConcessioneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ConcessioneForm 
              onSubmit={() => {
                setShowConcessioneForm(false);
                loadData();
              }}
              onCancel={() => setShowConcessioneForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
