/**
 * CivicReportsPanel - Pannello Segnalazioni Civiche per Dashboard PA
 * Versione: 1.0.0
 * Data: 29 Gennaio 2026
 * 
 * Mostra segnalazioni civiche con dati reali dall'API e configurazione TCC.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Radio, MapPin, Settings, Save, RefreshCw, AlertCircle, 
  CheckCircle, Clock, TrendingUp, Coins, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useCivicReports } from '@/contexts/CivicReportsContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';

interface CivicStats {
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  total: number;
  todayNew: number;
  todayResolved: number;
  recent: any[];
  byType: { type: string; count: number }[];
}

interface CivicConfig {
  comune_id: number;
  tcc_reward_default: number;
  tcc_reward_urgent: number;
  tcc_reward_photo_bonus: number;
  auto_assign_enabled: boolean;
  notify_pm_enabled: boolean;
  notify_pa_enabled: boolean;
}

export default function CivicReportsPanel() {
  const [stats, setStats] = useState<CivicStats | null>(null);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [config, setConfig] = useState<CivicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { comuneId: impersonatedComuneId } = useImpersonation();
  const { setSelectedReport } = useCivicReports();
  const comuneId = impersonatedComuneId ? parseInt(impersonatedComuneId) : 1;

  // Carica statistiche + lista completa segnalazioni
  const loadStats = async () => {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/civic-reports/stats?comune_id=${comuneId}`),
        fetch(`${API_BASE_URL}/api/civic-reports?comune_id=${comuneId}&limit=200`)
      ]);
      const data = await statsRes.json();
      if (data.success) {
        setStats(data.data);
      }
      const reportsData = await reportsRes.json();
      if (reportsData.success && reportsData.data) {
        setAllReports(reportsData.data);
      } else if (data.success && data.data?.recent) {
        setAllReports(data.data.recent);
      }
    } catch (error) {
      console.error('Errore caricamento stats:', error);
    }
  };

  // Carica configurazione TCC
  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/civic-reports/config?comune_id=${comuneId}`);
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Errore caricamento config:', error);
    }
  };

  // Salva configurazione TCC
  const saveConfig = async () => {
    if (!config) return;
    
    setSavingConfig(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/civic-reports/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Configurazione TCC salvata!');
        setShowConfigPanel(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Errore salvataggio config:', error);
      toast.error('Errore nel salvataggio della configurazione');
    } finally {
      setSavingConfig(false);
    }
  };

  // Carica dati all'avvio e quando cambia il comune
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadConfig()]);
      setLoading(false);
    };
    loadData();
  }, [comuneId]);

  // Formatta data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="bg-[#1a2332] border-[#06b6d4]/30">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#06b6d4]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con titolo e pulsanti */}
      <Card className="bg-[#1a2332] border-[#06b6d4]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#06b6d4]" />
            Segnalazioni Civiche
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => { setRefreshing(true); await Promise.all([loadStats(), loadConfig()]); setRefreshing(false); }}
              className="border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/10"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
            >
              <Settings className="h-4 w-4 mr-1" />
              Config TCC
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistiche KPI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
              <div className="text-sm text-[#e8fbff]/70 mb-1">Pending</div>
              <div className="text-3xl font-bold text-[#f59e0b]">{stats?.pending || 0}</div>
            </div>
            <div className="p-4 bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-lg">
              <div className="text-sm text-[#e8fbff]/70 mb-1">In Progress</div>
              <div className="text-3xl font-bold text-[#06b6d4]">{stats?.inProgress || 0}</div>
            </div>
            <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
              <div className="text-sm text-[#e8fbff]/70 mb-1">Resolved</div>
              <div className="text-3xl font-bold text-[#10b981]">{stats?.resolved || 0}</div>
            </div>
            <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
              <div className="text-sm text-[#e8fbff]/70 mb-1">Totali</div>
              <div className="text-3xl font-bold text-[#e8fbff]">{stats?.total || 0}</div>
            </div>
          </div>

          {/* Pannello Configurazione TCC (collapsible) */}
          {showConfigPanel && config && (
            <div className="mb-6 p-4 bg-[#0b1220] border border-[#f59e0b]/30 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Coins className="h-5 w-5 text-[#f59e0b]" />
                <h3 className="text-lg font-semibold text-[#e8fbff]">Configurazione Reward TCC</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-[#e8fbff]/70">TCC Reward Default</Label>
                  <Input
                    type="number"
                    value={config.tcc_reward_default}
                    onChange={(e) => setConfig({ ...config, tcc_reward_default: parseInt(e.target.value) || 0 })}
                    className="bg-[#1a2332] border-[#06b6d4]/30 text-[#e8fbff]"
                  />
                  <p className="text-xs text-[#e8fbff]/50 mt-1">Crediti per segnalazione risolta</p>
                </div>
                <div>
                  <Label className="text-[#e8fbff]/70">TCC Reward Urgenti</Label>
                  <Input
                    type="number"
                    value={config.tcc_reward_urgent}
                    onChange={(e) => setConfig({ ...config, tcc_reward_urgent: parseInt(e.target.value) || 0 })}
                    className="bg-[#1a2332] border-[#06b6d4]/30 text-[#e8fbff]"
                  />
                  <p className="text-xs text-[#e8fbff]/50 mt-1">Crediti per segnalazioni urgenti</p>
                </div>
                <div>
                  <Label className="text-[#e8fbff]/70">TCC Bonus Foto</Label>
                  <Input
                    type="number"
                    value={config.tcc_reward_photo_bonus}
                    onChange={(e) => setConfig({ ...config, tcc_reward_photo_bonus: parseInt(e.target.value) || 0 })}
                    className="bg-[#1a2332] border-[#06b6d4]/30 text-[#e8fbff]"
                  />
                  <p className="text-xs text-[#e8fbff]/50 mt-1">Bonus se include foto</p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button 
                  onClick={saveConfig}
                  disabled={savingConfig}
                  className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black"
                >
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Salva Configurazione
                </Button>
              </div>
            </div>
          )}

          {/* Lista segnalazioni - storico completo */}
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {allReports.length > 0 ? (
              allReports.map((report: any) => (
                <div key={report.id} className="p-4 bg-[#0b1220] rounded-lg flex items-center justify-between cursor-pointer hover:bg-[#0b1220]/80 transition-colors" onClick={() => { if (report.lat && report.lng) { setSelectedReport({ id: report.id, lat: parseFloat(report.lat), lng: parseFloat(report.lng), type: report.type }); toast.info(`Centrato su: ${report.type}`); } }}>
                  <div className="flex-1">
                    <div className="text-[#e8fbff] font-semibold">{report.type}</div>
                    <div className="text-sm text-[#e8fbff]/70">
                      {report.description?.substring(0, 100)}{report.description?.length > 100 ? '...' : ''}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">
                      {report.user_name || 'Anonimo'} • {formatDate(report.created_at)}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    report.status === 'pending' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                    report.status === 'in_progress' ? 'bg-[#06b6d4]/20 text-[#06b6d4]' :
                    report.status === 'resolved' ? 'bg-[#10b981]/20 text-[#10b981]' :
                    'bg-[#ef4444]/20 text-[#ef4444]'
                  }`}>
                    {report.status === 'pending' ? 'Da assegnare' : 
                     report.status === 'in_progress' ? 'In corso' : 
                     report.status === 'resolved' ? 'Risolto' : 'Rifiutato'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#e8fbff]/50">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nessuna segnalazione presente</p>
                <p className="text-sm mt-1">Le segnalazioni inviate dai cittadini appariranno qui</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistiche per tipo */}
      {stats?.byType && stats.byType.length > 0 && (
        <Card className="bg-[#1a2332] border-[#06b6d4]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#06b6d4]" />
              Distribuzione per Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.byType.map((item: any, index: number) => (
                <div key={index} className="p-3 bg-[#0b1220] rounded-lg text-center">
                  <div className="text-2xl font-bold text-[#06b6d4]">{item.count}</div>
                  <div className="text-sm text-[#e8fbff]/70">{item.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
