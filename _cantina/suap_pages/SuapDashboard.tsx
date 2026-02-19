import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, Bell, Inbox } from 'lucide-react';
import { getSuapStats, getSuapPratiche, createSuapPratica, SuapStats, SuapPratica } from '@/api/suap';
import SciaForm from '@/components/suap/SciaForm';
import ConcessioneForm from '@/components/suap/ConcessioneForm';
import { toast } from 'sonner';
import { Link } from 'wouter';

const API_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface PraticaPendente {
  id: number;
  tipo: string;
  impresa: string;
  mercato: string;
  motivo?: string;
  data: string;
}

interface NuovaDomanda {
  id: number;
  tipo: string;
  impresa: string;
  data: string;
}

export default function SuapDashboard({ embedded = false }: { embedded?: boolean }) {
  const [stats, setStats] = useState<SuapStats | null>(null);
  const [pratiche, setPratiche] = useState<SuapPratica[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPratiche, setLoadingPratiche] = useState(true);
  const [showSciaForm, setShowSciaForm] = useState(false);
  const [showConcessioneForm, setShowConcessioneForm] = useState(false);
  
  // Nuovi state per pratiche pendenti e nuove domande
  const [pratichePendenti, setPratichePendenti] = useState<PraticaPendente[]>([]);
  const [nuoveDomande, setNuoveDomande] = useState<NuovaDomanda[]>([]);
  const [loadingPendenti, setLoadingPendenti] = useState(true);
  const [loadingNuove, setLoadingNuove] = useState(true);

  // Carica statistiche
  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getSuapStats('00000000-0000-0000-0000-000000000001');
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Carica pratiche recenti
  useEffect(() => {
    async function loadPratiche() {
      try {
        const data = await getSuapPratiche('00000000-0000-0000-0000-000000000001');
        // Prendi solo le ultime 5 pratiche ordinate per data
        const sorted = data.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 5);
        setPratiche(sorted);
      } catch (error) {
        console.error('Failed to load pratiche', error);
        // Se fallisce, mostra array vuoto (nessun mock)
        setPratiche([]);
      } finally {
        setLoadingPratiche(false);
      }
    }
    loadPratiche();
  }, []);

  // Carica pratiche pendenti (DA_REVISIONARE)
  useEffect(() => {
    async function loadPratichePendenti() {
      try {
        // Carica domande spunta da revisionare
        const domandeRes = await fetch(`${API_URL}/api/domande-spunta?stato=DA_REVISIONARE`);
        const domandeJson = await domandeRes.json();
        
        // Carica autorizzazioni da revisionare
        const autRes = await fetch(`${API_URL}/api/autorizzazioni?stato=DA_REVISIONARE`);
        const autJson = await autRes.json();
        
        const pendenti: PraticaPendente[] = [];
        
        // Aggiungi domande spunta
        if (domandeJson.success && domandeJson.data) {
          domandeJson.data.forEach((d: any) => {
            pendenti.push({
              id: d.id,
              tipo: 'Domanda Spunta',
              impresa: d.company_name || 'N/D',
              mercato: d.market_name || 'N/D',
              motivo: d.note?.includes('RICHIESTA REGOLARIZZAZIONE') 
                ? d.note.split('RICHIESTA REGOLARIZZAZIONE:')[1]?.trim() 
                : undefined,
              data: d.updated_at || d.created_at
            });
          });
        }
        
        // Aggiungi autorizzazioni
        if (autJson.success && autJson.data) {
          autJson.data.forEach((a: any) => {
            pendenti.push({
              id: a.id,
              tipo: 'Autorizzazione',
              impresa: a.ragione_sociale || 'N/D',
              mercato: a.ente_rilascio || 'N/D',
              motivo: a.note,
              data: a.updated_at || a.created_at
            });
          });
        }
        
        // Ordina per data
        pendenti.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setPratichePendenti(pendenti.slice(0, 5));
      } catch (error) {
        console.error('Failed to load pratiche pendenti', error);
        setPratichePendenti([]);
      } finally {
        setLoadingPendenti(false);
      }
    }
    loadPratichePendenti();
  }, []);

  // Carica nuove domande (IN_ATTESA)
  useEffect(() => {
    async function loadNuoveDomande() {
      try {
        // Carica domande spunta in attesa
        const domandeRes = await fetch(`${API_URL}/api/domande-spunta?stato=IN_ATTESA`);
        const domandeJson = await domandeRes.json();
        
        const nuove: NuovaDomanda[] = [];
        
        if (domandeJson.success && domandeJson.data) {
          domandeJson.data.forEach((d: any) => {
            nuove.push({
              id: d.id,
              tipo: 'Domanda Spunta',
              impresa: d.company_name || 'N/D',
              data: d.created_at
            });
          });
        }
        
        // Ordina per data (più recenti prima)
        nuove.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        setNuoveDomande(nuove.slice(0, 5));
      } catch (error) {
        console.error('Failed to load nuove domande', error);
        setNuoveDomande([]);
      } finally {
        setLoadingNuove(false);
      }
    }
    loadNuoveDomande();
  }, []);

  // Handler per submit SCIA
  const handleSciaSubmit = async (data: any) => {
    try {
      // Prepara i dati completi per la creazione della pratica
      const praticaData = {
        // Dati base
        tipo_pratica: `SCIA ${data.tipo_segnalazione || data.motivazione_scia || 'Subingresso'}`.toUpperCase(),
        richiedente_nome: data.ragione_sociale_sub || `${data.nome_sub || ''} ${data.cognome_sub || ''}`.trim() || 'Non specificato',
        richiedente_cf: data.cf_subentrante || 'NON_SPECIFICATO',
        oggetto: `${(data.tipo_segnalazione || data.motivazione_scia || 'Subingresso').toUpperCase()} - Mercato: ${data.mercato || 'N/D'} - Posteggio: ${data.posteggio || 'N/D'}`,
        
        // Dati Pratica SCIA
        numero_protocollo: data.numero_protocollo,
        data_presentazione: data.data_presentazione,
        comune_presentazione: data.comune_presentazione,
        tipo_segnalazione: data.tipo_segnalazione,
        motivo_subingresso: data.motivo_subingresso,
        settore_merceologico: data.settore_merceologico,
        ruolo_dichiarante: data.ruolo_dichiarante,
        
        // Dati Subentrante
        sub_ragione_sociale: data.ragione_sociale_sub,
        sub_nome: data.nome_sub,
        sub_cognome: data.cognome_sub,
        sub_data_nascita: data.data_nascita_sub,
        sub_luogo_nascita: data.luogo_nascita_sub,
        sub_residenza_via: data.residenza_sub,
        sub_residenza_comune: data.comune_residenza_sub,
        sub_residenza_cap: data.cap_residenza_sub,
        sub_sede_via: data.sede_impresa_sub,
        sub_sede_comune: data.comune_sede_sub,
        sub_sede_provincia: data.provincia_sede_sub,
        sub_sede_cap: data.cap_sede_sub,
        sub_pec: data.pec_sub,
        sub_telefono: data.telefono_sub,
        
        // Dati Cedente
        ced_cf: data.cf_cedente,
        ced_ragione_sociale: data.ragione_sociale_cedente,
        ced_nome: data.nome_cedente,
        ced_cognome: data.cognome_cedente,
        ced_data_nascita: data.data_nascita_cedente,
        ced_luogo_nascita: data.luogo_nascita_cedente,
        ced_residenza_via: data.residenza_cedente,
        ced_residenza_comune: data.comune_cedente,
        ced_residenza_cap: data.cap_cedente,
        ced_pec: data.pec_cedente,
        ced_scia_precedente: data.scia_precedente,
        ced_data_presentazione: data.data_presentazione_cedente,
        ced_comune_presentazione: data.comune_presentazione_cedente,
        
        // Dati Mercato e Posteggio
        mercato_id: data.mercato,
        mercato_nome: data.mercato_nome,
        posteggio_id: data.posteggio,
        posteggio_numero: data.posteggio_numero,
        ubicazione_mercato: data.ubicazione_mercato,
        giorno_mercato: data.giorno_mercato,
        fila: data.fila,
        dimensioni_mq: data.dimensioni_mq,
        dimensioni_lineari: data.dimensioni_lineari,
        attrezzature: data.attrezzature,
        
        // Dati Atto Notarile
        notaio_rogante: data.notaio,
        numero_repertorio: data.repertorio,
        data_atto: data.data_atto,
        
        // Dati Delegato (se presente)
        del_nome: data.delegato_nome,
        del_cognome: data.delegato_cognome,
        del_cf: data.delegato_cf,
        del_data_nascita: data.delegato_data_nascita,
        del_luogo_nascita: data.delegato_luogo_nascita,
        del_qualifica: data.delegato_qualifica,
        del_residenza_via: data.delegato_residenza,
        del_residenza_comune: data.delegato_comune,
        del_residenza_cap: data.delegato_cap
      };
      
      // Crea la pratica nel backend
      const newPratica = await createSuapPratica('00000000-0000-0000-0000-000000000001', praticaData);
      
      setShowSciaForm(false);
      toast.success("SCIA Inviata con successo!", { 
        description: `Protocollo: ${newPratica.cui || data.numero_protocollo}` 
      });
      
      // Ricarica le pratiche
      try {
        const updatedPratiche = await getSuapPratiche('00000000-0000-0000-0000-000000000001');
        setPratiche(updatedPratiche.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 5));
      } catch (e) {
        console.warn('Errore ricarica pratiche:', e);
      }
      
      // Ricarica le statistiche
      try {
        const newStats = await getSuapStats('00000000-0000-0000-0000-000000000001');
        setStats(newStats);
      } catch (e) {
        console.warn('Errore ricarica stats:', e);
      }
      
    } catch (error: any) {
      console.error('Errore creazione SCIA:', error);
      const errorMessage = error?.message || 'Errore sconosciuto';
      toast.error("Errore Creazione SCIA", { 
        description: errorMessage.includes('Failed') 
          ? "Impossibile contattare il server. Riprova tra poco." 
          : errorMessage 
      });
    }
  };

  // Formatta la data relativa
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT');
  };

  // Mappa stato a colore badge
  const getStatoBadge = (stato: string) => {
    const colors: Record<string, string> = {
      'RECEIVED': 'bg-blue-500/20 text-blue-400',
      'PRECHECK': 'bg-yellow-500/20 text-yellow-400',
      'EVALUATED': 'bg-purple-500/20 text-purple-400',
      'APPROVED': 'bg-green-500/20 text-green-400',
      'REJECTED': 'bg-red-500/20 text-red-400',
      'INTEGRATION_NEEDED': 'bg-orange-500/20 text-orange-400'
    };
    return colors[stato] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return <div className="p-8 text-[#e8fbff]">Caricamento dashboard SUAP...</div>;
  }

  return (
    <div className={`space-y-8 ${embedded ? '' : 'p-8 bg-[#020817] min-h-screen'}`}>
      {/* Header */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e8fbff] tracking-tight">SUAP Dashboard</h1>
          <p className="text-[#e8fbff]/60 mt-2">
            Gestione automatizzata pratiche amministrative e integrazione PDND
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/suap/list">
            <Button variant="outline" className="border-[#e8fbff]/20 text-[#e8fbff] hover:bg-[#e8fbff]/10">
              <FileText className="mr-2 h-4 w-4" />
              Lista Pratiche
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button 
              className="bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90"
              onClick={() => setShowSciaForm(true)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Nuova SCIA
            </Button>
            <Button 
              className="bg-[#e8fbff] text-black hover:bg-[#e8fbff]/90"
              onClick={() => setShowConcessioneForm(true)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Concessione
            </Button>
          </div>
        </div>
      </div>
      )}

      {showSciaForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8">
            <SciaForm 
              onCancel={() => setShowSciaForm(false)} 
              onSubmit={handleSciaSubmit} 
            />
          </div>
        </div>
      )}

      {showConcessioneForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8">
            <ConcessioneForm 
              onCancel={() => setShowConcessioneForm(false)} 
              onSubmit={async (data) => {
                setShowConcessioneForm(false);
                toast.success("Concessione Rilasciata", { description: `N. ${data.numero_concessione}` });
              }} 
            />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#0a1628] border-[#1e293b]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#e8fbff]/80">Totale Pratiche</CardTitle>
            <FileText className="h-4 w-4 text-[#00f0ff]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#e8fbff]">{stats?.total || 0}</div>
            <p className="text-xs text-[#e8fbff]/60">+20.1% dal mese scorso</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a1628] border-[#1e293b]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#e8fbff]/80">In Lavorazione</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#e8fbff]">{stats?.in_lavorazione || 0}</div>
            <p className="text-xs text-[#e8fbff]/60">Richiedono attenzione</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a1628] border-[#1e293b]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#e8fbff]/80">Approvate Auto</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#e8fbff]">{stats?.approvate || 0}</div>
            <p className="text-xs text-[#e8fbff]/60">Processate automaticamente</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0a1628] border-[#1e293b]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#e8fbff]/80">Rigettate / Bloccate</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#e8fbff]">{stats?.rigettate || 0}</div>
            <p className="text-xs text-[#e8fbff]/60">Anomalie rilevate</p>
          </CardContent>
        </Card>
      </div>

      {/* Pratiche Pendenti & Nuove Domande */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Pratiche Pendenti - Da Revisionare */}
        <Card className="col-span-4 bg-[#0a1628] border-[#1e293b]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Pratiche Pendenti
            </CardTitle>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
              {pratichePendenti.length} da revisionare
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingPendenti ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                  <span className="ml-2 text-[#e8fbff]/60">Caricamento...</span>
                </div>
              ) : pratichePendenti.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-400/40 mb-4" />
                  <p className="text-[#e8fbff]/60">Nessuna pratica pendente</p>
                  <p className="text-sm text-[#e8fbff]/40 mt-2">
                    Tutte le pratiche sono state processate
                  </p>
                </div>
              ) : (
                pratichePendenti.map((pratica) => (
                  <div key={pratica.id} className="flex items-center p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10 cursor-pointer transition-colors">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                        <p className="text-sm font-medium leading-none text-[#e8fbff]">
                          {pratica.tipo}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                          Da Revisionare
                        </span>
                      </div>
                      <p className="text-sm text-[#e8fbff]/60">
                        {pratica.impresa} - {pratica.mercato}
                      </p>
                      {pratica.motivo && (
                        <p className="text-xs text-orange-400/80 mt-1">
                          Motivo: {pratica.motivo}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-[#e8fbff]/60">{formatRelativeTime(pratica.data)}</p>
                      <Button size="sm" variant="ghost" className="text-orange-400 hover:bg-orange-400/10 mt-1">
                        Verifica
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nuove Domande Arrivate */}
        <Card className="col-span-3 bg-[#0a1628] border-[#1e293b]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-400" />
              Nuove Domande
            </CardTitle>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
              {nuoveDomande.length} nuove
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingNuove ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              ) : nuoveDomande.length === 0 ? (
                <div className="text-center py-8">
                  <Inbox className="h-12 w-12 mx-auto text-[#e8fbff]/20 mb-4" />
                  <p className="text-[#e8fbff]/60">Nessuna nuova domanda</p>
                </div>
              ) : (
                nuoveDomande.map((domanda) => (
                  <div key={domanda.id} className="flex items-center p-2 rounded-lg hover:bg-blue-500/5 cursor-pointer transition-colors border border-transparent hover:border-blue-500/20">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                      <div>
                        <p className="text-sm text-[#e8fbff] font-medium">{domanda.tipo}</p>
                        <p className="text-xs text-[#e8fbff]/60">{domanda.impresa}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#e8fbff]/40">{formatRelativeTime(domanda.data)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
