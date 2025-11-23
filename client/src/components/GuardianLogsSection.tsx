/**
 * Guardian Logs Section Component
 * 
 * Componente per visualizzare i log centralizzati del sistema Guardian.
 * Si collega all'endpoint Guardian per ottenere i log in tempo reale.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, Shield, Activity } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function GuardianLogsSection() {
  // Query Guardian logs dal backend MIHUB
  const { data: logsData, isLoading: loading } = trpc.guardian.logs.useQuery();
  
  const guardianLogs = logsData?.data?.logs || [];
  const logsStats = logsData?.data?.stats || null;

  // Calculate stats from Guardian logs
  const stats = logsStats ? {
    total: logsStats.total,
    info: logsStats.byLevel.info,
    warn: logsStats.byLevel.warn,
    error: logsStats.byLevel.error,
  } : {
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'warn':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'debug':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
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

  // Filtra log per tipo (System = DMS_HUB, Guardian = GUARDIAN/MIHUB/MIO_AGENT)
  const systemLogs = guardianLogs.filter((log: any) => log.app === 'DMS_HUB');
  const guardianOnlyLogs = guardianLogs.filter((log: any) => 
    log.app === 'GUARDIAN' || log.app === 'MIHUB' || log.app === 'MIO_AGENT'
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
            <CardTitle className="text-[#e8fbff] text-sm">Info</CardTitle>
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
            <CardTitle className="text-[#e8fbff] text-sm">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#ef4444]">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: System Logs + Guardian Logs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#1a2332] border border-[#14b8a6]/30">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            Tutti i Log
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            System Logs
          </TabsTrigger>
          <TabsTrigger value="guardian" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            Guardian Logs
          </TabsTrigger>
        </TabsList>

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
              {loading ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  <Activity className="h-8 w-8 animate-spin text-[#14b8a6] mx-auto mb-4" />
                  Caricamento log...
                </div>
              ) : guardianLogs.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  Nessun log disponibile. Inizializza i log di demo dalla sezione Integrazioni.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {guardianLogs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        log.level === 'error'
                          ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                          : log.level === 'warn'
                          ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
                          : 'bg-[#0b1220] border-[#14b8a6]/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getLevelBadge(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-[#e8fbff]/70">{log.app}</span>
                          <span className="text-xs text-[#e8fbff]/50">•</span>
                          <span className="text-xs text-[#e8fbff]/50">{log.type}</span>
                        </div>
                        <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#e8fbff] font-mono">{log.message}</p>
                      {log.endpoint && (
                        <div className="text-xs text-[#e8fbff]/50 mt-1">
                          {log.method} {log.endpoint} {log.statusCode && `- ${log.statusCode}`}
                        </div>
                      )}
                      {log.userEmail && (
                        <div className="text-xs text-[#e8fbff]/50 mt-1">User: {log.userEmail}</div>
                      )}
                      {log.responseTime && (
                        <div className="text-xs text-[#e8fbff]/50 mt-1">Response Time: {log.responseTime}ms</div>
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
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getLevelBadge(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-[#e8fbff]/70">{log.app}</span>
                          <span className="text-xs text-[#e8fbff]/50">•</span>
                          <span className="text-xs text-[#e8fbff]/50">{log.type}</span>
                        </div>
                        <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#e8fbff] font-mono">{log.message}</p>
                      {log.userEmail && (
                        <div className="text-xs text-[#e8fbff]/50 mt-1">User: {log.userEmail}</div>
                      )}
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
                Guardian API Logs ({guardianOnlyLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guardianOnlyLogs.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  Nessun log Guardian disponibile.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {guardianOnlyLogs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        log.level === 'error'
                          ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                          : 'bg-[#0b1220] border-[#14b8a6]/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getLevelBadge(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                          <span className="text-xs text-[#e8fbff]/70">{log.app}</span>
                          <span className="text-xs text-[#e8fbff]/50">•</span>
                          <span className="text-xs text-[#e8fbff]/50">{log.type}</span>
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
      </Tabs>
    </>
  );
}
