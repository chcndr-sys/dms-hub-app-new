import { useState, useEffect } from 'react';
import { Search, Shield, AlertTriangle, CheckCircle, XCircle, Play } from 'lucide-react';

// Types from MIO-hub JSON
interface Endpoint {
  id: string;
  method: string;
  path: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  require_auth: boolean;
  category: string;
  test?: {
    enabled: boolean;
    default_params?: Record<string, any>;
  };
}

interface Service {
  id: string;
  display_name: string;
  base_url: string;
  env: string;
  endpoints: Endpoint[];
}

interface EndpointsData {
  version: number;
  services: Service[];
}

interface AgentPermission {
  endpoint_id: string;
  mode: 'read' | 'write';
  require_confirmation?: boolean;
}

interface Agent {
  id: string;
  display_name: string;
  max_risk: 'low' | 'medium' | 'high';
  permissions: AgentPermission[];
}

interface PermissionsData {
  version: number;
  agents: Agent[];
}

export default function GuardianEndpoints() {
  const [endpointsData, setEndpointsData] = useState<EndpointsData | null>(null);
  const [permissionsData, setPermissionsData] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('mio');

  useEffect(() => {
    // Load data from MIO-hub GitHub repository
    Promise.all([
      fetch('https://raw.githubusercontent.com/Chcndr/MIO-hub/master/api/index.json').then(r => r.json()),
      fetch('https://raw.githubusercontent.com/Chcndr/MIO-hub/master/agents/permissions.json').then(r => r.json())
    ])
      .then(([endpoints, permissions]) => {
        setEndpointsData(endpoints);
        setPermissionsData(permissions);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading Guardian data:', err);
        setLoading(false);
      });
  }, []);

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getAgentPermission = (endpointId: string, agentId: string): AgentPermission | null => {
    if (!permissionsData) return null;
    const agent = permissionsData.agents.find(a => a.id === agentId);
    if (!agent) return null;
    return agent.permissions.find(p => p.endpoint_id === endpointId) || null;
  };

  const canAgentAccess = (endpoint: Endpoint, agentId: string): boolean => {
    const permission = getAgentPermission(endpoint.id, agentId);
    return permission !== null;
  };

  const handleTestEndpoint = (endpoint: Endpoint) => {
    alert(`Test simulato per endpoint:\n\n${endpoint.method} ${endpoint.path}\n\nParametri default: ${JSON.stringify(endpoint.test?.default_params || {}, null, 2)}\n\n(Quando il backend Guardian sarà deployato, questo farà una chiamata reale)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento catalogo endpoint da MIO-hub...</p>
        </div>
      </div>
    );
  }

  if (!endpointsData || !permissionsData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Errore nel caricamento dei dati Guardian da MIO-hub</p>
      </div>
    );
  }

  const allEndpoints = endpointsData.services.flatMap(service =>
    service.endpoints.map(endpoint => ({ ...endpoint, service }))
  );

  const filteredEndpoints = allEndpoints.filter(({ endpoint, service }) => {
    const matchesSearch = searchTerm === '' ||
      endpoint.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesService = selectedService === 'all' || service.id === selectedService;
    const matchesRisk = selectedRisk === 'all' || endpoint.risk_level === selectedRisk;

    return matchesSearch && matchesService && matchesRisk;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Guardian - Endpoint & Test</h1>
            <p className="text-gray-600">Catalogo endpoint MIHUB + GitHub con controllo permessi</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca endpoint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tutti i servizi</option>
            {endpointsData.services.map(service => (
              <option key={service.id} value={service.id}>{service.display_name}</option>
            ))}
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tutti i rischi</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>

          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {permissionsData.agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Totale Endpoint</div>
          <div className="text-2xl font-bold text-gray-900">{allEndpoints.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Low Risk</div>
          <div className="text-2xl font-bold text-green-600">
            {allEndpoints.filter(({ endpoint }) => endpoint.risk_level === 'low').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">Medium Risk</div>
          <div className="text-2xl font-bold text-yellow-600">
            {allEndpoints.filter(({ endpoint }) => endpoint.risk_level === 'medium').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-sm text-gray-600">High Risk</div>
          <div className="text-2xl font-bold text-red-600">
            {allEndpoints.filter(({ endpoint }) => endpoint.risk_level === 'high').length}
          </div>
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servizio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permesso {selectedAgent.toUpperCase()}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEndpoints.map(({ endpoint, service }) => {
                const permission = getAgentPermission(endpoint.id, selectedAgent);
                const canAccess = permission !== null;

                return (
                  <tr key={endpoint.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{endpoint.id}</div>
                      <div className="text-sm text-gray-500">{endpoint.path}</div>
                      <div className="text-xs text-gray-400 mt-1">{endpoint.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{service.display_name}</div>
                      <div className="text-xs text-gray-500">{service.env}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {endpoint.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 w-fit ${getRiskBadgeColor(endpoint.risk_level)}`}>
                        {getRiskIcon(endpoint.risk_level)}
                        {endpoint.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canAccess ? (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 w-fit">
                            ✓ {permission.mode}
                          </span>
                          {permission.require_confirmation && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 w-fit">
                              ⚠ Conferma richiesta
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 w-fit">
                          ✗ Negato
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {endpoint.test?.enabled && (
                        <button
                          onClick={() => handleTestEndpoint(endpoint)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Test
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEndpoints.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nessun endpoint trovato con i filtri selezionati</p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Fonte dati:</strong> MIO-hub repository (GitHub)
          <br />
          <strong>File:</strong> api/index.json, agents/permissions.json
          <br />
          <strong>Nota:</strong> Quando il backend Guardian sarà deployato, i dati verranno caricati da MIHUB tramite tRPC
        </p>
      </div>
    </div>
  );
}
