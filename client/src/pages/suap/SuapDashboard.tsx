import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, FileText, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { getSuapStats, createPratica, runEvaluation, SuapStats } from '@/api/suap';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

export default function SuapDashboard({ embedded = false }: { embedded?: boolean }) {
  const [stats, setStats] = useState<SuapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [simulating, setSimulating] = useState(false);

  const handleSimulation = async () => {
    setSimulating(true);
    try {
      // 1. Crea Pratica
      const newPratica = await createPratica('00000000-0000-0000-0000-000000000001', {
        tipo_pratica: 'SCIA Apertura',
        richiedente_nome: 'Simulazione ' + new Date().toLocaleTimeString(),
        richiedente_cf: 'SIMUL00000000001',
        oggetto: 'Apertura Esercizio Simulato'
      });
      
      toast({ title: "Pratica Creata", description: `Protocollo: ${newPratica.protocollo}` });

      // 2. Avvia Valutazione (Simulata)
      await runEvaluation(newPratica.id);
      toast({ title: "Valutazione Avviata", description: "Controlli in corso..." });

      // 3. Refresh Dati
      const newStats = await getSuapStats('00000000-0000-0000-0000-000000000001');
      setStats(newStats);
      
    } catch (error) {
      console.error(error);
      toast({ title: "Errore Simulazione", description: "Impossibile creare la pratica", variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  };

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
          <Button 
            className="bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90"
            onClick={handleSimulation}
            disabled={simulating}
          >
            <Activity className={`mr-2 h-4 w-4 ${simulating ? 'animate-spin' : ''}`} />
            {simulating ? 'Simulazione...' : 'Nuova Simulazione'}
          </Button>
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
            <div className="space-y-8">
              {/* Mock Activity List */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-[#e8fbff]">
                      Pratica SCIA-{2025000 + i} ricevuta
                    </p>
                    <p className="text-sm text-[#e8fbff]/60">
                      Mario Rossi S.r.l. - Apertura Esercizio
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-[#e8fbff]/60">Just now</div>
                </div>
              ))}
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
