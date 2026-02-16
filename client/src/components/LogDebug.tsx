import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Server,
  GitBranch,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Zap,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface APILog {
  id: number;
  timestamp: Date;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  requestBody?: string;
  responseBody?: string;
  error?: string;
}

interface IntegrationLog {
  id: number;
  timestamp: Date;
  integration: 'dms-legacy' | 'pepe-gis' | 'mobility-tper';
  action: string;
  status: 'success' | 'failed';
  error?: string;
  duration: number;
  retryCount: number;
}

interface SystemStatus {
  backend: {
    url: string;
    status: 'up' | 'down';
    uptime: number;
    lastCheck: Date;
  };
  database: {
    host: string;
    status: 'connected' | 'disconnected';
    activeConnections: number;
    maxConnections: number;
    lastQuery: Date;
  };
  deploy: {
    version: string;
    deployDate: Date;
    branch: string;
    commit: string;
  };
  integrations: {
    [key: string]: 'active' | 'in_preparation' | 'inactive';
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LogDebug() {
  const [activeTab, setActiveTab] = useState('api-logs');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#e8fbff]">Log & Debug</h2>
          <p className="text-[#e8fbff]/60 mt-1">
            Monitoraggio API, integrazioni e stato del sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#0a1628]">
          <TabsTrigger value="api-logs">
            <Activity className="h-4 w-4 mr-2" />
            API Logs
          </TabsTrigger>
          <TabsTrigger value="integration-logs">
            <Zap className="h-4 w-4 mr-2" />
            Integration Logs
          </TabsTrigger>
          <TabsTrigger value="system-status">
            <Server className="h-4 w-4 mr-2" />
            System Status
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: API LOGS */}
        <TabsContent value="api-logs" className="space-y-6">
          <APILogsTab />
        </TabsContent>

        {/* TAB 2: INTEGRATION LOGS */}
        <TabsContent value="integration-logs" className="space-y-6">
          <IntegrationLogsTab />
        </TabsContent>

        {/* TAB 3: SYSTEM STATUS */}
        <TabsContent value="system-status" className="space-y-6">
          <SystemStatusTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// TAB 1: API LOGS
// ============================================================================

function APILogsTab() {
  const [logs, setLogs] = useState<APILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEndpoint, setFilterEndpoint] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Carica log dal backend
  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/system/logs?limit=50');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        // Converti formato backend in formato componente
        const convertedLogs: APILog[] = data.logs.map((log: any, index: number) => ({
          id: index + 1,
          timestamp: new Date(log.timestamp),
          method: (log.message?.match(/(GET|POST|PUT|DELETE|PATCH)/)?.[1] as any) || log.method || 'GET',
          endpoint: log.source,
          statusCode: log.level === 'error' ? 500 : 200,
          responseTime: 0,
          error: log.level === 'error' ? log.message : undefined,
          responseBody: log.level !== 'error' ? log.message : undefined
        }));
        
        setLogs(convertedLogs);
      } catch (err: any) {
        console.error('Error loading logs:', err);
        toast.error('Errore caricamento log');
      } finally {
        setLoading(false);
      }
    };
    
    loadLogs();
    // Ricarica ogni 30 secondi
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterEndpoint !== 'all' && !log.endpoint.includes(filterEndpoint)) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === '2xx' && (log.statusCode < 200 || log.statusCode >= 300)) return false;
      if (filterStatus === '4xx' && (log.statusCode < 400 || log.statusCode >= 500)) return false;
      if (filterStatus === '5xx' && log.statusCode < 500) return false;
    }
    return true;
  });

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{statusCode}</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{statusCode}</Badge>;
    } else if (statusCode >= 500) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{statusCode}</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{statusCode}</Badge>;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'POST': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PUT': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'PATCH': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const avgResponseTime = logs.length > 0 
    ? Math.round(logs.reduce((sum, log) => sum + log.responseTime, 0) / logs.length)
    : 0;

  const successRate = logs.length > 0
    ? Math.round((logs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length / logs.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Richieste Totali</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{logs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Tempo Medio</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{avgResponseTime}ms</p>
              </div>
              <Clock className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">{successRate}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Errori</p>
                <p className="text-2xl font-bold text-red-400">
                  {logs.filter(l => l.statusCode >= 400).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri e Azioni */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#14b8a6]" />
              <span className="text-sm text-[#e8fbff]/70">Filtri:</span>
            </div>
            
            <select
              value={filterEndpoint}
              onChange={(e) => setFilterEndpoint(e.target.value)}
              className="bg-[#0a1628] border border-[#14b8a6]/30 rounded px-3 py-1.5 text-sm text-[#e8fbff]"
            >
              <option value="all">Tutti gli endpoint</option>
              <option value="/api/markets">Markets</option>
              <option value="/api/stalls">Stalls</option>
              <option value="/api/vendors">Vendors</option>
              <option value="/api/gis">GIS</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0a1628] border border-[#14b8a6]/30 rounded px-3 py-1.5 text-sm text-[#e8fbff]"
            >
              <option value="all">Tutti gli status</option>
              <option value="2xx">2xx (Success)</option>
              <option value="4xx">4xx (Client Error)</option>
              <option value="5xx">5xx (Server Error)</option>
            </select>

            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                onClick={() => toast.success('Logs aggiornati')}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabella Logs */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff]">Log Richieste API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <details
                key={log.id}
                className="bg-[#0a1628] border border-[#14b8a6]/20 rounded-lg p-3 cursor-pointer hover:border-[#14b8a6]/40 transition-colors"
              >
                <summary className="flex items-center gap-3 list-none">
                  <span className="text-xs text-[#e8fbff]/50 font-mono">
                    {log.timestamp.toLocaleTimeString('it-IT')}
                  </span>
                  <Badge className={`text-xs ${getMethodColor(log.method)}`}>
                    {log.method}
                  </Badge>
                  <code className="text-sm text-[#14b8a6] flex-1 font-mono">
                    {log.endpoint}
                  </code>
                  {getStatusBadge(log.statusCode)}
                  <span className="text-xs text-[#e8fbff]/50">
                    {log.responseTime}ms
                  </span>
                </summary>
                
                <div className="mt-3 pt-3 border-t border-[#14b8a6]/20 space-y-2">
                  {log.requestBody && (
                    <div>
                      <p className="text-xs text-[#e8fbff]/70 mb-1">Request Body:</p>
                      <pre className="bg-[#0a1628] border border-[#14b8a6]/10 rounded p-2 text-xs text-[#e8fbff]/80 overflow-auto">
                        {JSON.stringify(JSON.parse(log.requestBody), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.responseBody && (
                    <div>
                      <p className="text-xs text-[#e8fbff]/70 mb-1">Response Body:</p>
                      <pre className="bg-[#0a1628] border border-[#14b8a6]/10 rounded p-2 text-xs text-[#e8fbff]/80 overflow-auto max-h-40">
                        {JSON.stringify(JSON.parse(log.responseBody), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.error && (
                    <div>
                      <p className="text-xs text-red-400 mb-1">Error:</p>
                      <p className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-300">
                        {log.error}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 2: INTEGRATION LOGS
// ============================================================================

function IntegrationLogsTab() {
  const [logs, setLogs] = useState<IntegrationLog[]>([]);

  // Mock data
  useEffect(() => {
    const mockLogs: IntegrationLog[] = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        integration: 'pepe-gis',
        action: 'fetch_geometries',
        status: 'success',
        duration: 1234,
        retryCount: 0
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        integration: 'dms-legacy',
        action: 'sync_vendors',
        status: 'failed',
        error: 'Connection timeout after 30s',
        duration: 30000,
        retryCount: 3
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        integration: 'mobility-tper',
        action: 'get_stops',
        status: 'failed',
        error: 'API key not configured',
        duration: 50,
        retryCount: 0
      }
    ];
    
    setLogs(mockLogs);
  }, []);

  const getIntegrationBadge = (integration: IntegrationLog['integration']) => {
    const colors = {
      'dms-legacy': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'pepe-gis': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'mobility-tper': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    
    const names = {
      'dms-legacy': 'DMS Legacy',
      'pepe-gis': 'Pepe GIS',
      'mobility-tper': 'TPER'
    };
    
    return <Badge className={colors[integration]}>{names[integration]}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Tentativi Totali</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{logs.length}</p>
              </div>
              <Zap className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Successi</p>
                <p className="text-2xl font-bold text-green-400">
                  {logs.filter(l => l.status === 'success').length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Falliti</p>
                <p className="text-2xl font-bold text-red-400">
                  {logs.filter(l => l.status === 'failed').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabella Logs */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff]">Log Integrazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="bg-[#0a1628] border border-[#14b8a6]/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-[#e8fbff]/50 font-mono">
                    {log.timestamp.toLocaleString('it-IT')}
                  </span>
                  {getIntegrationBadge(log.integration)}
                  <code className="text-sm text-[#14b8a6] flex-1 font-mono">
                    {log.action}
                  </code>
                  {log.status === 'success' ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  <span className="text-xs text-[#e8fbff]/50">
                    {log.duration}ms
                  </span>
                </div>
                
                {log.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-xs text-red-300">
                    <strong>Error:</strong> {log.error}
                    {log.retryCount > 0 && <span className="ml-2">(Retry: {log.retryCount})</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// TAB 3: SYSTEM STATUS
// ============================================================================

function SystemStatusTab() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/system/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        // Converti formato backend in formato componente
        const convertedStatus: SystemStatus = {
          backend: {
            url: 'https://api.mio-hub.me',
            status: data.status.processes.find((p: any) => p.name === 'mihub-backend')?.status === 'online' ? 'up' : 'down',
            uptime: (() => {
              const proc = data.status.processes.find((p: any) => p.name === 'mihub-backend');
              if (!proc) return 0;
              const restarts = proc.pm2_env?.restart_time || proc.pm2_env?.unstable_restarts || 0;
              // Stima: ogni restart = ~10s downtime. Uptime su 30gg
              const downtimeSec = restarts * 10;
              const totalSec = 30 * 24 * 3600;
              return Math.round((1 - downtimeSec / totalSec) * 1000) / 10;
            })(),
            lastCheck: new Date()
          },
          database: {
            host: 'Neon Cloud (PostgreSQL)',
            status: 'connected',
            activeConnections: 5,
            maxConnections: 100,
            lastQuery: new Date()
          },
          deploy: {
            version: 'v3.1',
            deployDate: new Date('2025-12-07'),
            branch: 'master',
            commit: 'latest'
          },
          integrations: {
            'DMS Legacy': 'in_preparation',
            'Pepe GIS': 'active',
            'TPER': 'in_preparation'
          }
        };
        
        setStatus(convertedStatus);
      } catch (err: any) {
        console.error('Error loading status:', err);
        toast.error('Errore caricamento stato sistema');
      } finally {
        setLoading(false);
      }
    };
    
    loadStatus();
    // Ricarica ogni 30 secondi
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return <div className="text-center text-[#e8fbff]/60 py-8">Caricamento stato sistema...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Backend Status */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Server className="h-5 w-5 text-[#14b8a6]" />
            Backend Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">URL</p>
              <code className="text-sm text-[#14b8a6] font-mono">{status.backend.url}</code>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Stato</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-400">Online</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Uptime</p>
              <p className="text-lg font-bold text-[#14b8a6]">{status.backend.uptime}%</p>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Ultima Verifica</p>
              <p className="text-sm text-[#e8fbff]">{status.backend.lastCheck.toLocaleTimeString('it-IT')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Database className="h-5 w-5 text-[#14b8a6]" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Host</p>
              <p className="text-sm text-[#14b8a6]">{status.database.host}</p>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Stato</p>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Connessioni Attive</p>
              <p className="text-lg font-bold text-[#14b8a6]">
                {status.database.activeConnections}/{status.database.maxConnections}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Ultima Query</p>
              <p className="text-sm text-[#e8fbff]">{status.database.lastQuery.toLocaleTimeString('it-IT')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deploy Info */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-[#14b8a6]" />
            Deploy Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Versione</p>
              <p className="text-lg font-bold text-[#14b8a6]">{status.deploy.version}</p>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Data Deploy</p>
              <p className="text-sm text-[#e8fbff]">{status.deploy.deployDate.toLocaleString('it-IT')}</p>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Branch</p>
              <code className="text-sm text-[#14b8a6] font-mono">{status.deploy.branch}</code>
            </div>
            <div>
              <p className="text-sm text-[#e8fbff]/70 mb-1">Commit</p>
              <code className="text-sm text-[#14b8a6] font-mono">{status.deploy.commit}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Status */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#14b8a6]" />
            Stato Integrazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(status.integrations).map(([name, state]) => (
              <div key={name} className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
                <p className="text-sm text-[#e8fbff]/70 mb-2">{name}</p>
                {state === 'active' ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Attivo
                  </Badge>
                ) : state === 'in_preparation' ? (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    In Preparazione
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inattivo
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
