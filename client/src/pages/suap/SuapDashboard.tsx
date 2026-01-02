import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { getSuapStats, getSuapPratiche, createSuapPratica, SuapStats, SuapPratica } from '@/api/suap';
import SciaForm from '@/components/suap/SciaForm';
import ConcessioneForm from '@/components/suap/ConcessioneForm';
import { toast } from 'sonner';
import { Link } from 'wouter';

export default function SuapDashboard({ embedded = false }: { embedded?: boolean }) {
  const [stats, setStats] = useState<SuapStats | null>(null);
  const [pratiche, setPratiche] = useState<SuapPratica[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPratiche, setLoadingPratiche] = useState(true);
  const [showSciaForm, setShowSciaForm] = useState(false);
  const [showConcessioneForm, setShowConcessioneForm] = useState(false);

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

  // Handler per submit SCIA
  const handleSciaSubmit = async (data: any) => {
    try {
      // Crea la pratica nel backend
      const newPratica = await createSuapPratica('00000000-0000-0000-0000-000000000001', {
        tipo_pratica: `SCIA ${data.motivazione_scia || 'Subingresso'}`,
        richiedente_nome: data.ragione_sociale_sub || `${data.nome_sub} ${data.cognome_sub}`,
        richiedente_cf: data.cf_subentrante,
        oggetto: `${data.motivazione_scia || 'Subingresso'} - ${data.mercato} - Posteggio ${data.posteggio}`
      });
      
      setShowSciaForm(false);
      toast.success("SCIA Inviata con successo!", { 
        description: `Protocollo: ${newPratica.protocollo || newPratica.cui}` 
      });
      
      // Ricarica le pratiche
      const updatedPratiche = await getSuapPratiche('00000000-0000-0000-0000-000000000001');
      setPratiche(updatedPratiche.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5));
      
      // Ricarica le statistiche
      const newStats = await getSuapStats('00000000-0000-0000-0000-000000000001');
      setStats(newStats);
      
    } catch (error) {
      console.error('Errore creazione SCIA:', error);
      toast.error("Errore", { description: "Impossibile creare la pratica SCIA" });
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

      {/* Recent Activity & Alerts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-[#0a1628] border-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-[#e8fbff]">Attività Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {loadingPratiche ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
                  <span className="ml-2 text-[#e8fbff]/60">Caricamento pratiche...</span>
                </div>
              ) : pratiche.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-[#e8fbff]/20 mb-4" />
                  <p className="text-[#e8fbff]/60">Nessuna pratica presente</p>
                  <p className="text-sm text-[#e8fbff]/40 mt-2">
                    Clicca su "Nuova SCIA" per creare la prima pratica
                  </p>
                </div>
              ) : (
                pratiche.map((pratica) => (
                  <div key={pratica.id} className="flex items-center">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none text-[#e8fbff]">
                          {pratica.tipo_pratica}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatoBadge(pratica.stato)}`}>
                          {pratica.stato}
                        </span>
                      </div>
                      <p className="text-sm text-[#e8fbff]/60">
                        {pratica.richiedente_nome} - {pratica.richiedente_cf}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-[#e8fbff]/60 text-sm">
                      {formatRelativeTime(pratica.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-[#0a1628] border-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-[#e8fbff]">Stato Integrazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-[#e8fbff]">PDND Interoperabilità</span>
                </div>
                <span className="text-xs text-[#e8fbff]/60">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-[#e8fbff]">INPS DURC OnLine</span>
                </div>
                <span className="text-xs text-[#e8fbff]/60">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-[#e8fbff]">Agenzia Entrate</span>
                </div>
                <span className="text-xs text-[#e8fbff]/60">Latenza Alta</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
