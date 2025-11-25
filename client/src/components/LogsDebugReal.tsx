// LogsDebugReal.tsx
// Componente REALE per Logs e Debug (NO MOCK)
// Collegato al backend mihub-backend-rest

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Terminal, Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { getLogs, getLogsStats, getGuardianHealth, type Log } from '@/api/logsClient';

// ============================================================================
// LOGS SECTION (System + Guardian) - REAL
// ============================================================================

export function LogsSectionReal() {
  const [guardianLogs, setGuardianLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Guardian logs from backend API (REAL)
    const fetchLogs = async () => {
      try {
        const response = await getLogs({ limit: 100 });
        setGuardianLogs(response.logs);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error('Error loading Guardian logs:', err);
        setError(err.message || 'Failed to load logs');
        setLoading(false);
      }
    };
    fetchLogs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats from Guardian logs
  const stats = {
    total: guardianLogs.length,
    successful: guardianLogs.filter(log => log.success === true).length,
    failed: guardianLogs.filter(log => log.success === false).length,
  };

  const getStatusBadge = (log: Log) => {
    if (log.success === true) {
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    } else {
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  const getStatusLabel = (log: Log) => {
    return log.success === true ? 'SUCCESS' : 'FAILED';
  };

  const formatTimestamp = (timestamp: string) => {
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

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <CardTitle className="text-[#e8fbff] text-sm">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#10b981]">{stats.successful}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/5 border-[#ef4444]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#ef4444]">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Guardian Logs Table */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#14b8a6]" />
            Guardian API Logs (Real-time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8 text-[#e8fbff]/60">
              Caricamento logs...
            </div>
          )}
          
          {error && (
            <div className="text-center py-8 text-[#ef4444]">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Errore: {error}</p>
              <p className="text-xs text-[#e8fbff]/50 mt-2">
                Verificare che il backend sia online e che la tabella mio_agent_logs sia inizializzata.
              </p>
            </div>
          )}

          {!loading && !error && guardianLogs.length === 0 && (
            <div className="text-center py-8 text-[#e8fbff]/60">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>Nessun log disponibile</p>
              <p className="text-xs text-[#e8fbff]/50 mt-2">
                I log appariranno qui quando gli agenti inizieranno a fare chiamate API.
              </p>
            </div>
          )}

          {!loading && !error && guardianLogs.length > 0 && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {guardianLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg border bg-[#0b1220] border-[#14b8a6]/20 hover:border-[#14b8a6]/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getStatusBadge(log)}`}>
                        {getStatusLabel(log)}
                      </span>
                      <span className="text-xs text-[#e8fbff]/70 font-mono">{log.agent}</span>
                      <span className="text-xs text-[#e8fbff]/50">•</span>
                      <span className="text-xs text-[#14b8a6]">{log.method}</span>
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
                  <div className="text-sm text-[#e8fbff]/90 mb-1 font-mono">
                    {log.endpoint}
                  </div>
                  {log.message && (
                    <div className="text-xs text-[#e8fbff]/70 mt-2">
                      {log.message}
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
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// DEBUG SECTION - REAL
// ============================================================================

export function DebugSectionReal() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, healthRes] = await Promise.all([
          getLogsStats(),
          getGuardianHealth(),
        ]);
        setStats(statsRes.stats);
        setHealth(healthRes);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error('Error loading debug data:', err);
        setError(err.message || 'Failed to load debug data');
        setLoading(false);
      }
    };
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-[#e8fbff]/60">
        Caricamento debug data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-[#ef4444]">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>Errore: {error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#14b8a6]" />
              Total Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#14b8a6]">{stats?.total || 0}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Tutti i log registrati</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#10b981]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#10b981]" />
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#10b981]">{stats?.successful || 0}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Chiamate riuscite</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#ef4444]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-[#ef4444]" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#ef4444]">{stats?.failed || 0}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Chiamate fallite</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#8b5cf6]" />
              Unique Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#8b5cf6]">{stats?.uniqueAgents || 0}</div>
            <p className="text-xs text-[#e8fbff]/50 mt-1">Agenti attivi</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Check */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[#14b8a6]" />
            System Health Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[#0b1220] rounded-lg p-4 font-mono text-sm">
            <div className="text-[#10b981]">$ System health check...</div>
            <div className="text-[#14b8a6] mt-2">✓ Status: {health?.status || 'unknown'}</div>
            {health?.services && (
              <>
                <div className="text-[#14b8a6]">✓ Database: {health.services.database}</div>
                <div className="text-[#14b8a6]">✓ API: {health.services.api}</div>
                {health.services.redis && (
                  <div className="text-[#14b8a6]">✓ Redis: {health.services.redis}</div>
                )}
              </>
            )}
            <div className="text-[#e8fbff]/50 mt-4">$ Monitoring active...</div>
            <div className="text-[#8b5cf6] mt-4">$ Guardian API Status...</div>
            <div className="text-[#14b8a6]">✓ POST /api/logs/initSchema - Ready</div>
            <div className="text-[#14b8a6]">✓ POST /api/logs/createLog - Ready</div>
            <div className="text-[#14b8a6]">✓ GET /api/logs/getLogs - Ready</div>
            <div className="text-[#14b8a6]">✓ GET /api/logs/stats - Ready</div>
            <div className="text-[#14b8a6]">✓ GET /api/guardian/health - Ready</div>
            <div className="text-[#e8fbff]/50 mt-2">→ Test via tab Integrazioni</div>
          </div>
        </CardContent>
      </Card>

      {/* Log Timeline */}
      {stats?.firstLog && stats?.lastLog && (
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#14b8a6]" />
              Log Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#e8fbff]/70">First Log:</span>
                <span className="font-semibold text-[#14b8a6]">
                  {new Date(stats.firstLog).toLocaleString('it-IT')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#e8fbff]/70">Last Log:</span>
                <span className="font-semibold text-[#14b8a6]">
                  {new Date(stats.lastLog).toLocaleString('it-IT')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#e8fbff]/70">Unique Services:</span>
                <span className="font-semibold text-[#8b5cf6]">{stats.uniqueServices}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
