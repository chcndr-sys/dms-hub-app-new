/**
 * Guardian Logs Section Component
 * 
 * Componente per visualizzare i log centralizzati del sistema Guardian.
 * Si collega al backend REST su Hetzner per ottenere i log reali dal database.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, Shield, Activity, HeartPulse } from 'lucide-react';
import HealthDashboard from './HealthDashboard';
import { useQuery } from '@tanstack/react-query';
import { logsAPI } from '@/utils/mihubAPI';

export default function GuardianLogsSection() {
  // Query logs dal backend REST Hetzner
  const { data: logsData, isLoading: loading, error } = useQuery({
    queryKey: ['guardian-logs'],
    queryFn: () => logsAPI.getLogs({ limit: 100 }),
    retry: 1,
    refetchInterval: 30000, // 🔥 Polling ogni 30s (isolato dalla chat)
  });

  const guardianLogs = logsData?.logs || [];

  // Query stats
  const { data: statsData } = useQuery({
    queryKey: ['guardian-logs-stats'],
    queryFn: () => logsAPI.stats(),
    retry: 1,
    refetchInterval: 30000, // 🔥 Polling ogni 30s (isolato dalla chat)
  });

  // Calculate stats
  const stats = statsData?.stats ? {
    total: statsData.stats.total,
    info: statsData.stats.successful,
    warn: (statsData.stats as any).warnings || Math.max(0, statsData.stats.total - statsData.stats.successful - statsData.stats.failed),
    error: statsData.stats.failed,
  } : {
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
  };

  const getLevelBadge = (success: boolean) => {
    return success
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
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

  // Filtra log per agente
  const systemLogs = guardianLogs.filter((log: any) => log.agent === 'system' || log.agent === 'anonymous');
  const guardianOnlyLogs = guardianLogs.filter((log: any) => 
    log.agent === 'guardian' || log.agent === 'mio' || log.agent === 'dev' || log.agent === 'manus'
  );

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/5 border-[#14b8a6]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Totale Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#14b8a6]">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border-[#10b981]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Successi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#10b981]">{stats.info}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border-[#f59e0b]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Warning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#f59e0b]">{stats.warn}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/5 border-[#ef4444]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Errori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#ef4444]">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Health Monitor + Logs */}
      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-[#1a2332] border border-[#14b8a6]/30">
          <TabsTrigger value="health" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            <HeartPulse className="h-4 w-4 mr-1" />
            Health
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            Tutti i Log
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            System Logs
          </TabsTrigger>
          <TabsTrigger value="guardian" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            MIO Agent Logs
          </TabsTrigger>
          <TabsTrigger value="imprese" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            Imprese API
          </TabsTrigger>
        </TabsList>

        {/* Health Monitor Tab */}
        <TabsContent value="health" className="mt-4">
          <HealthDashboard />
        </TabsContent>

        {/* All Logs Tab */}
        <TabsContent value="all" className="mt-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#14b8a6]" />
                Tutti i Log ({guardianLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8 text-red-400">
                  <p className="font-semibold mb-2">Errore nel caricamento dei log</p>
                  <p className="text-sm text-[#e8fbff]/60">
                    {error instanceof Error ? error.message : 'Errore sconosciuto'}
                  </p>
                  <p className="text-xs text-[#e8fbff]/40 mt-2">
                    Verifica che il backend REST sia attivo su Hetzner
                  </p>
                </div>
              ) : loading ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  <Activity className="h-8 w-8 animate-spin text-[#14b8a6] mx-auto mb-4" />
                  Caricamento log dal database...
                </div>
              ) : guardianLogs.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  <p className="mb-2">Nessun log disponibile nel database.</p>
                  <p className="text-sm text-[#e8fbff]/40">
                    I log verranno creati automaticamente quando si usano le API.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {guardianLogs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        !log.success
                          ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                          : 'bg-[#0b1220] border-[#14b8a6]/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getLevelBadge(log.success)}`}>
                            {log.success ? 'SUCCESS' : 'ERROR'}
                          </span>
                          <span className="text-xs text-[#e8fbff]/70">{log.agent}</span>
                          {log.serviceId && (
                            <>
                              <span className="text-xs text-[#e8fbff]/50">•</span>
                              <span className="text-xs text-[#e8fbff]/50">{log.serviceId}</span>
                            </>
                          )}
                          {log.risk && (
                            <>
                              <span className="text-xs text-[#e8fbff]/50">•</span>
                              <span className={`text-xs ${
                                log.risk === 'high' ? 'text-red-400' :
                                log.risk === 'medium' ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {log.risk.toUpperCase()}
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#e8fbff] font-mono">{log.message}</p>
                      {log.endpoint && (
                        <div className="text-xs text-[#e8fbff]/50 mt-1">
                          {log.method} {log.endpoint} {log.statusCode && `- ${log.statusCode}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="system" className="mt-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[#14b8a6]" />
                System Logs ({systemLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemLogs.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  Nessun log di sistema disponibile.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {systemLogs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border bg-[#0b1220] border-[#14b8a6]/20"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getLevelBadge(log.success)}`}>
                            {log.success ? 'SUCCESS' : 'ERROR'}
                          </span>
                          <span className="text-xs text-[#e8fbff]/70">{log.agent}</span>
                        </div>
                        <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#e8fbff] font-mono">{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guardian Logs Tab */}
        <TabsContent value="guardian" className="mt-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#14b8a6]" />
                MIO Agent Logs ({guardianOnlyLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guardianOnlyLogs.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  Nessuna conversazione MIO Agent registrata.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {guardianOnlyLogs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        !log.success
                          ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                          : 'bg-[#0b1220] border-[#14b8a6]/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getLevelBadge(log.success)}`}>
                            {log.success ? 'SUCCESS' : 'ERROR'}
                          </span>
                          <span className="text-xs text-[#e8fbff]/70">{log.agent}</span>
                          {log.serviceId && (
                            <>
                              <span className="text-xs text-[#e8fbff]/50">•</span>
                              <span className="text-xs text-[#e8fbff]/50">{log.serviceId}</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#e8fbff] mb-1 font-mono">{log.message}</p>
                      {log.endpoint && (
                        <div className="text-xs text-[#e8fbff]/50">
                          {log.method} {log.endpoint}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Imprese API Logs Tab */}
        <TabsContent value="imprese" className="mt-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#14b8a6]" />
                Imprese & Qualificazioni API Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const impreseLogs = guardianLogs.filter((log: any) => 
                  log.endpoint?.includes('/api/imprese') || 
                  log.endpoint?.includes('/api/qualificazioni') ||
                  log.endpoint?.includes('/api/admin/migrate-pdnd')
                );
                return impreseLogs.length === 0 ? (
                  <div className="text-center py-8 text-[#e8fbff]/60">
                    <p className="mb-2">Nessun log per Imprese & Qualificazioni API.</p>
                    <p className="text-xs text-[#e8fbff]/40">
                      I log appariranno quando verranno effettuate chiamate agli endpoint:
                    </p>
                    <ul className="text-xs text-[#14b8a6] mt-2 space-y-1">
                      <li>GET /api/imprese</li>
                      <li>GET /api/imprese/:id</li>
                      <li>GET /api/qualificazioni</li>
                      <li>GET /api/imprese/:id/qualificazioni</li>
                      <li>GET /api/imprese/:id/rating (Semaforo Conformità)</li>
                      <li>POST /api/admin/migrate-pdnd (Migration)</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {impreseLogs.map((log: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          !log.success
                            ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                            : 'bg-[#0b1220] border-[#14b8a6]/20'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getLevelBadge(log.success)}`}>
                              {log.success ? 'SUCCESS' : 'ERROR'}
                            </span>
                            <span className="text-xs text-[#e8fbff]/70">{log.agent}</span>
                            {log.statusCode && (
                              <>
                                <span className="text-xs text-[#e8fbff]/50">•</span>
                                <span className={`text-xs font-mono ${
                                  log.statusCode >= 200 && log.statusCode < 300 ? 'text-[#10b981]' :
                                  log.statusCode >= 400 ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                                }`}>
                                  {log.statusCode}
                                </span>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        <p className="text-sm text-[#e8fbff] mb-1 font-mono">{log.message}</p>
                        {log.endpoint && (
                          <div className="text-xs text-[#e8fbff]/50">
                            {log.method} {log.endpoint}
                          </div>
                        )}
                        {log.meta && (
                          <details className="mt-2">
                            <summary className="text-xs text-[#14b8a6] cursor-pointer hover:text-[#10b981]">
                              Metadata
                            </summary>
                            <pre className="text-xs text-[#e8fbff]/60 mt-1 bg-[#0b1220] p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.meta, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
