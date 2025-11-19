import { useState, useEffect } from 'react';
import { Bug, AlertTriangle, XCircle, Lightbulb } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  agent: string;
  endpoint_id: string;
  method: string;
  path: string;
  status: 'allowed' | 'denied' | 'error';
  risk_level?: string;
  require_confirmation?: boolean;
  reason?: string;
}

export default function GuardianDebug() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>('all');

  useEffect(() => {
    // Load logs from MIO-hub GitHub repository
    fetch('https://raw.githubusercontent.com/Chcndr/MIO-hub/master/logs/api-guardian.log')
      .then(r => r.text())
      .then(text => {
        const logLines = text.trim().split('\n').filter(line => line.trim());
        const parsedLogs = logLines
          .map(line => JSON.parse(line) as LogEntry)
          .filter(log => log.status === 'denied' || log.status === 'error'); // Only errors and denied
        setLogs(parsedLogs);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading Guardian debug logs:', err);
        setLoading(false);
      });
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSuggestion = (log: LogEntry): string => {
    if (log.reason?.includes('Unknown agent')) {
      return 'Aggiungi questo agente in agents/permissions.json con i permessi appropriati';
    }
    if (log.reason?.includes('Unknown endpoint')) {
      return 'Aggiungi questo endpoint in api/index.json oppure verifica che l\'endpoint_id sia corretto';
    }
    if (log.reason?.includes('No permission rule')) {
      return `Aggiungi una regola permesso per ${log.agent} in agents/permissions.json per l'endpoint ${log.endpoint_id}`;
    }
    return 'Verifica la configurazione Guardian in MIO-hub';
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento debug log da MIO-hub...</p>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    return filterAgent === 'all' || log.agent === filterAgent;
  });

  const agents = Array.from(new Set(logs.map(log => log.agent)));

  const unknownAgents = logs.filter(log => log.reason?.includes('Unknown agent'));
  const unknownEndpoints = logs.filter(log => log.reason?.includes('Unknown endpoint'));
  const noPermissions = logs.filter(log => log.reason?.includes('No permission'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bug className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Guardian - Debug</h1>
            <p className="text-gray-600">Solo errori e accessi negati con suggerimenti risoluzione</p>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-6">
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tutti gli agenti</option>
            {agents.map(agent => (
              <option key={agent} value={agent}>{agent.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Totale Problemi</div>
          <div className="text-2xl font-bold text-red-600">{logs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Unknown Agents</div>
          <div className="text-2xl font-bold text-orange-600">{unknownAgents.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Unknown Endpoints</div>
          <div className="text-2xl font-bold text-orange-600">{unknownEndpoints.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">No Permissions</div>
          <div className="text-2xl font-bold text-red-600">{noPermissions.length}</div>
        </div>
      </div>

      {/* Debug Cards */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Nessun problema rilevato!</h3>
            <p className="text-green-700">Tutti gli accessi API sono stati autorizzati correttamente.</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border-l-4 border-red-500 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(log.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {log.status === 'denied' ? 'Accesso Negato' : 'Errore'}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {log.agent.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">{formatTimestamp(log.timestamp)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Endpoint</div>
                      <div className="text-sm font-medium text-gray-900">{log.endpoint_id}</div>
                      <div className="text-xs text-gray-500">{log.path}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Method</div>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {log.method}
                      </span>
                    </div>
                  </div>

                  {log.reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <div className="text-xs text-red-600 uppercase mb-1">Motivo</div>
                      <div className="text-sm text-red-800 font-medium">{log.reason}</div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-blue-600 uppercase mb-1">Suggerimento</div>
                        <div className="text-sm text-blue-800">{getSuggestion(log)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Fonte dati:</strong> MIO-hub repository (GitHub)
          <br />
          <strong>File:</strong> logs/api-guardian.log (filtrato per status=denied/error)
          <br />
          <strong>Nota:</strong> Quando il backend Guardian sarà deployato, i log verranno aggiornati in tempo reale
        </p>
      </div>
    </div>
  );
}
