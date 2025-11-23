/**
 * Guardian Debug Section Component
 * 
 * Componente per visualizzare solo gli errori e i warning del sistema Guardian.
 * Utilizzato nella sezione Debug della Dashboard PA per il monitoraggio degli errori.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Terminal, 
  XCircle, 
  AlertTriangle, 
  Bug, 
  Lightbulb,
  Activity,
  RefreshCw 
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function GuardianDebugSection() {
  // Query Guardian logs filtrati per errori e warning
  const { data: logsData, isLoading: loading, refetch } = trpc.guardian.logs.useQuery({
    level: 'error', // Filtra solo errori
  });
  
  const errorLogs = logsData?.data?.logs || [];
  const logsStats = logsData?.data?.stats || null;

  // Query per tutti i log per calcolare anche i warning
  const { data: allLogsData } = trpc.guardian.logs.useQuery();
  const allLogs = allLogsData?.data?.logs || [];
  
  const warnLogs = allLogs.filter((log: any) => log.level === 'warn');
  const debugLogs = allLogs.filter((log: any) => log.level === 'debug');

  const stats = {
    errors: errorLogs.length,
    warnings: warnLogs.length,
    debug: debugLogs.length,
    total: allLogs.length,
  };

  const getSuggestion = (log: any): string => {
    if (log.message?.includes('Unknown agent')) {
      return 'Aggiungi questo agente in agents/permissions.json con i permessi appropriati';
    }
    if (log.message?.includes('Unknown endpoint')) {
      return 'Verifica che l\'endpoint sia registrato nell\'inventario API';
    }
    if (log.message?.includes('Permission denied')) {
      return `Aggiungi una regola permesso per ${log.userEmail} per l'endpoint ${log.endpoint}`;
    }
    if (log.message?.includes('timeout')) {
      return 'Verifica la connessione al database o aumenta il timeout';
    }
    if (log.message?.includes('Database')) {
      return 'Controlla lo stato del database e le query SQL';
    }
    return 'Verifica la configurazione Guardian e i log di sistema';
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Log aggiornati');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-[#14b8a6] mx-auto mb-4" />
          <p className="text-[#e8fbff]/60">Caricamento debug info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con pulsante refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#e8fbff]">Guardian Debug & Error Monitoring</h3>
          <p className="text-[#e8fbff]/60 text-sm mt-1">
            Monitoraggio errori e suggerimenti per la risoluzione
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Guardian Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#ef4444]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-[#ef4444]" />
              Errori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ef4444]">{stats.errors}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Errori critici</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#f59e0b]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
              Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#f59e0b]">{stats.warnings}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Avvisi da verificare</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-sm">
              <Bug className="h-4 w-4 text-[#8b5cf6]" />
              Debug
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#8b5cf6]">{stats.debug}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Info di debug</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-[#14b8a6]" />
              Totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#14b8a6]">{stats.total}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Log totali</p>
          </CardContent>
        </Card>
      </div>

      {/* Guardian Issues List */}
      {errorLogs.length === 0 && warnLogs.length === 0 ? (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Terminal className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Tutto OK! 🎉</h3>
            <p className="text-[#e8fbff]/60">
              Nessun errore o warning rilevato. Il sistema funziona correttamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Errori */}
          {errorLogs.length > 0 && (
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-[#ef4444]" />
                  Errori Critici ({errorLogs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {errorLogs.map((log: any, idx: number) => (
                    <div key={idx} className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-[#ef4444]" />
                          <span className="text-[#ef4444] font-semibold">{log.app}</span>
                          <span className="text-[#e8fbff]/50 text-sm">•</span>
                          <span className="text-[#e8fbff]/50 text-sm">{log.type}</span>
                        </div>
                        <span className="text-[#e8fbff]/50 text-xs">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      
                      <p className="text-[#e8fbff] text-sm mb-2 font-mono">{log.message}</p>
                      
                      {log.endpoint && (
                        <div className="text-[#e8fbff]/60 text-xs mb-2">
                          <span className="font-semibold">Endpoint:</span> {log.method} {log.endpoint}
                          {log.statusCode && ` - ${log.statusCode}`}
                        </div>
                      )}
                      
                      {log.userEmail && (
                        <div className="text-[#e8fbff]/60 text-xs mb-2">
                          <span className="font-semibold">User:</span> {log.userEmail}
                        </div>
                      )}
                      
                      <div className="mt-3 p-3 bg-[#0a1628] rounded-lg border border-[#14b8a6]/20">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-[#14b8a6] mt-0.5" />
                          <div>
                            <p className="text-[#14b8a6] font-semibold text-xs mb-1">Suggerimento:</p>
                            <p className="text-[#e8fbff]/80 text-xs">{getSuggestion(log)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-[#e8fbff]/60 text-xs cursor-pointer hover:text-[#e8fbff]">
                            Dettagli tecnici
                          </summary>
                          <pre className="mt-2 bg-[#0a1628] p-2 rounded text-[#e8fbff]/70 text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          {warnLogs.length > 0 && (
            <Card className="bg-[#1a2332] border-[#f59e0b]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
                  Warning ({warnLogs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {warnLogs.map((log: any, idx: number) => (
                    <div key={idx} className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
                          <span className="text-[#f59e0b] font-semibold">{log.app}</span>
                          <span className="text-[#e8fbff]/50 text-sm">•</span>
                          <span className="text-[#e8fbff]/50 text-sm">{log.type}</span>
                        </div>
                        <span className="text-[#e8fbff]/50 text-xs">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      
                      <p className="text-[#e8fbff] text-sm mb-2 font-mono">{log.message}</p>
                      
                      {log.endpoint && (
                        <div className="text-[#e8fbff]/60 text-xs">
                          <span className="font-semibold">Endpoint:</span> {log.method} {log.endpoint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Console Logs Live (come prima) */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[#14b8a6]" />
            Console Logs Live
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[#0a1628] p-4 rounded-lg font-mono text-sm">
            <div className="text-[#10b981]">$ Guardian API Status...</div>
            <div className="text-[#8b5cf6] mt-4">$ MIO Agent API Status...</div>
            <div className="text-[#14b8a6]">✓ POST /api/guardian/integrations - Ready</div>
            <div className="text-[#14b8a6]">✓ POST /api/guardian/logs - Ready</div>
            <div className="text-[#14b8a6]">✓ POST /api/guardian/debug/testEndpoint - Ready</div>
            <div className="text-[#e8fbff]/50 mt-2">→ Test via tab Integrazioni</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
