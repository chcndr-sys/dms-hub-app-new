import { useState, useEffect } from 'react';
import { FileText, Filter, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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

export default function GuardianLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Load logs from MIO-hub GitHub repository
    fetch('https://raw.githubusercontent.com/Chcndr/MIO-hub/master/logs/api-guardian.log')
      .then(r => r.text())
      .then(text => {
        const logLines = text.trim().split('\n').filter(line => line.trim());
        const parsedLogs = logLines.map(line => JSON.parse(line) as LogEntry);
        setLogs(parsedLogs);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading Guardian logs:', err);
        setLoading(false);
      });
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'allowed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Allowed
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Denied
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        );
      default:
        return null;
    }
  };

  const getRiskBadge = (risk?: string) => {
    if (!risk) return null;
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[risk as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {risk}
      </span>
    );
  };

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

  const handleExportCSV = () => {
    const csv = [
      ['Timestamp', 'Agent', 'Endpoint', 'Method', 'Status', 'Risk', 'Confirmation', 'Reason'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.agent,
        log.endpoint_id,
        log.method,
        log.status,
        log.risk_level || '',
        log.require_confirmation ? 'Yes' : 'No',
        log.reason || '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guardian-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento log da MIO-hub...</p>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    const matchesAgent = filterAgent === 'all' || log.agent === filterAgent;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesSearch = searchTerm === '' ||
      log.endpoint_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.agent.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesAgent && matchesStatus && matchesSearch;
  });

  const agents = Array.from(new Set(logs.map(log => log.agent)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Guardian - Log</h1>
              <p className="text-gray-600">Storico chiamate API con controllo permessi</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca endpoint, path, agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

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

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tutti gli stati</option>
            <option value="allowed">Allowed</option>
            <option value="denied">Denied</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Totale Log</div>
          <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Allowed</div>
          <div className="text-2xl font-bold text-green-600">
            {logs.filter(log => log.status === 'allowed').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Denied</div>
          <div className="text-2xl font-bold text-red-600">
            {logs.filter(log => log.status === 'denied').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Error</div>
          <div className="text-2xl font-bold text-orange-600">
            {logs.filter(log => log.status === 'error').length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dettagli
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {log.agent.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{log.endpoint_id}</div>
                    <div className="text-xs text-gray-500">{log.path}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      {log.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(log.risk_level)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {log.require_confirmation && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 w-fit">
                          ⚠ Conferma richiesta
                        </span>
                      )}
                      {log.reason && (
                        <span className="text-xs text-red-600">
                          {log.reason}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nessun log trovato con i filtri selezionati</p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Fonte dati:</strong> MIO-hub repository (GitHub)
          <br />
          <strong>File:</strong> logs/api-guardian.log
          <br />
          <strong>Nota:</strong> Quando il backend Guardian sarà deployato, i log verranno scritti in tempo reale e caricati da MIHUB
        </p>
      </div>
    </div>
  );
}
