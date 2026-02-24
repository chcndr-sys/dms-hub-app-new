import { useState, useEffect } from 'react';
import GuardianIntegrations from './GuardianIntegrations';
import ConnessioniV2 from './ConnessioniV2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Plug,
  Key,
  Webhook,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Trash2,
  Plus,
  ExternalLink,
  Activity,
  Clock,
  Database,
  Code,
  Play,
  FileJson,
  Settings as SettingsIcon,
  Shield,
  Eye,
  EyeOff,
  Save,
  Zap,
  Github,
  Cloud,
  Building2,
  Server,
  AlertTriangle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpcQuery, trpcMutate } from '@/lib/trpcHttp';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { addComuneIdToUrl, authenticatedFetch } from '@/hooks/useImpersonation';

export default function Integrazioni() {
  const [activeTab, setActiveTab] = useState('api-dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#e8fbff]">Integrazioni e API</h2>
          <p className="text-[#e8fbff]/60 mt-1">
            Gestisci connessioni esterne, API keys, webhook e sincronizzazioni
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-[#0a1628]">
          <TabsTrigger value="api-dashboard">
            <Code className="h-4 w-4 mr-2" />
            API Dashboard
          </TabsTrigger>
          <TabsTrigger value="connections">
            <Plug className="h-4 w-4 mr-2" />
            Connessioni
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="secrets">
            <Shield className="h-4 w-4 mr-2" />
            Secrets
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="sync-status">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Status
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: API DASHBOARD */}
        <TabsContent value="api-dashboard" className="space-y-6">
          <APIDashboard />
        </TabsContent>

        {/* TAB 2: CONNESSIONI ESTERNE */}
        <TabsContent value="connections" className="space-y-6">
          <ConnessioniV2 />
        </TabsContent>

        {/* TAB 3: API KEYS */}
        <TabsContent value="api-keys" className="space-y-6">
          <APIKeysManager />
        </TabsContent>

        {/* TAB 4: SECRETS */}
        <TabsContent value="secrets" className="space-y-6">
          <SecretsManager />
        </TabsContent>

        {/* TAB 5: WEBHOOK */}
        <TabsContent value="webhooks" className="space-y-6">
          <WebhookManager />
        </TabsContent>

        {/* TAB 6: SYNC STATUS */}
        <TabsContent value="sync-status" className="space-y-6">
          <SyncStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// TAB 1: API DASHBOARD
// ============================================================================
function APIDashboard() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [requestBody, setRequestBody] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiEndpoints, setApiEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [endpointSearch, setEndpointSearch] = useState('');
  const [playgroundStats, setPlaygroundStats] = useState<{
    requestsToday: number;
    totalResponseTime: number;
    successCount: number;
    errorCount: number;
  }>({ requestsToday: 0, totalResponseTime: 0, successCount: 0, errorCount: 0 });
  const [backendStats, setBackendStats] = useState<{
    active: number;
    backup: number;
    total: number;
  }>({ active: 0, backup: 0, total: 0 });
  
  const queryClient = useQueryClient();
  const { data: apiStats } = useQuery({
    queryKey: ['integrations-apiStats-today'],
    queryFn: () => trpcQuery<any>('integrations.apiStats.today'),
  });
  
  // Fetch dynamic endpoint count from backend Hetzner
  useEffect(() => {
    fetch('https://api.mio-hub.me/api/dashboard/integrations/endpoint-count')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setBackendStats({
            active: data.active || 0,
            backup: data.backup || 0,
            total: data.total || 0
          });
        }
      })
      .catch(err => console.error('Error fetching backend stats:', err));
  }, []);

  // Fetch ALL endpoints from MIO-hub api/index.json (single source of truth)
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/Chcndr/MIO-hub/master/api/index.json')
      .then(r => r.json())
      .then(data => {
        // Group endpoints by category
        const endpointsByCategory: { [key: string]: any[] } = {};
        
        data.services?.forEach((service: any) => {
          service.endpoints?.forEach((ep: any) => {
            const category = ep.category || 'Other';
            if (!endpointsByCategory[category]) {
              endpointsByCategory[category] = [];
            }
            endpointsByCategory[category].push({
              id: ep.id,
              method: ep.method,
              path: ep.path,
              description: ep.description,
              risk_level: ep.risk_level,
              enabled: ep.enabled,
              test: ep.test,
              service_id: service.id,
              base_url: service.base_url
            });
          });
        });
        
        // NOTE: SUAP & GIS endpoints are now loaded automatically from MIO-hub/api/index.json
        // See: https://github.com/Chcndr/MIO-hub/blob/master/api/index.json
        // To add new endpoints, update index.json in MIO-hub repository
        
        // All endpoints are now loaded automatically from MIO-hub/api/index.json
        // No hardcoded endpoints needed here
        
        // Legacy fallback only for endpoints not yet in index.json
        if (!endpointsByCategory['System & Workspace']) {
          endpointsByCategory['System & Workspace'] = [];
        }
        // System endpoints that may not be in index.json yet
        const systemEndpoints = [
          {
            id: 'system.status',
            method: 'GET',
            path: '/api/system/status',
            description: 'Stato del sistema e servizi',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'mihub-backend-rest',
            base_url: 'https://orchestratore.mio-hub.me'
          },
          {
            id: 'workspace.list',
            method: 'GET',
            path: '/api/workspace/files',
            description: 'Lista file workspace condiviso',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'mihub-backend-rest',
            base_url: 'https://orchestratore.mio-hub.me'
          },
          {
            id: 'chats.list',
            method: 'GET',
            path: '/api/mihub/chats',
            description: 'Storico chat agenti',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'mihub-backend-rest',
            base_url: 'https://orchestratore.mio-hub.me'
          }
        ];
        // Add system endpoints only if not already present from index.json
        systemEndpoints.forEach(ep => {
          const existingIds = endpointsByCategory['System & Workspace']?.map((e: any) => e.id) || [];
          if (!existingIds.includes(ep.id)) {
            endpointsByCategory['System & Workspace'].push(ep);
          }
        });

        // ============================================
        // DMS Legacy (Heroku) - Endpoint diretti su Hetzner
        // ============================================
        if (!endpointsByCategory['DMS Legacy (Heroku)']) {
          endpointsByCategory['DMS Legacy (Heroku)'] = [];
        }
        const dmsLegacyEndpoints = [
          {
            id: 'dms-legacy.health',
            method: 'GET',
            path: '/api/integrations/dms-legacy/health',
            description: 'Health check connessione DMS Legacy Heroku',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          },
          {
            id: 'dms-legacy.markets',
            method: 'GET',
            path: '/api/integrations/dms-legacy/markets',
            description: 'Lista mercati da DMS Legacy (Bologna, Cervia)',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          },
          {
            id: 'dms-legacy.vendors',
            method: 'GET',
            path: '/api/integrations/dms-legacy/vendors',
            description: 'Lista ambulanti/operatori da DMS Legacy',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          },
          {
            id: 'dms-legacy.concessions',
            method: 'GET',
            path: '/api/integrations/dms-legacy/concessions',
            description: 'Lista concessioni da DMS Legacy',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          },
          {
            id: 'dms-legacy.presences',
            method: 'GET',
            path: '/api/integrations/dms-legacy/presences/:marketId',
            description: 'Presenze per mercato da DMS Legacy (usa {"marketId": 1})',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          },
          {
            id: 'dms-legacy.market-sessions',
            method: 'GET',
            path: '/api/integrations/dms-legacy/market-sessions/:marketId',
            description: 'Sessioni mercato da DMS Legacy (usa {"marketId": 1})',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          },
          {
            id: 'dms-legacy.sync',
            method: 'POST',
            path: '/api/integrations/dms-legacy/sync',
            description: 'Avvia sincronizzazione manuale DMS Legacy',
            risk_level: 'medium',
            enabled: true,
            test: { enabled: false },
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          },
          {
            id: 'dms-legacy.cron-sync',
            method: 'GET',
            path: '/api/integrations/dms-legacy/cron-sync',
            description: 'Stato CRON sincronizzazione DMS Legacy',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'dms-legacy',
            base_url: 'https://api.mio-hub.me'
          }
        ];
        dmsLegacyEndpoints.forEach(ep => {
          const existingIds = endpointsByCategory['DMS Legacy (Heroku)']?.map((e: any) => e.id) || [];
          if (!existingIds.includes(ep.id)) {
            endpointsByCategory['DMS Legacy (Heroku)'].push(ep);
          }
        });

        // ============================================
        // MercaWeb — Abaco S.p.A. - Endpoint su Hetzner
        // ============================================
        if (!endpointsByCategory['MercaWeb — Abaco S.p.A.']) {
          endpointsByCategory['MercaWeb — Abaco S.p.A.'] = [];
        }
        const mercawebEndpoints = [
          {
            id: 'mercaweb.health',
            method: 'GET',
            path: '/api/integrations/mercaweb/health',
            description: 'Health check connessione MercaWeb',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.status',
            method: 'GET',
            path: '/api/integrations/mercaweb/status',
            description: 'Stato e conteggio record sincronizzati MercaWeb',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.import.ambulanti',
            method: 'POST',
            path: '/api/integrations/mercaweb/import/ambulanti',
            description: 'Import ambulanti da MercaWeb (UPSERT su mercaweb_id)',
            risk_level: 'medium',
            enabled: true,
            test: { enabled: false },
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.import.mercati',
            method: 'POST',
            path: '/api/integrations/mercaweb/import/mercati',
            description: 'Import mercati da MercaWeb (UPSERT su mercaweb_id)',
            risk_level: 'medium',
            enabled: true,
            test: { enabled: false },
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.import.piazzole',
            method: 'POST',
            path: '/api/integrations/mercaweb/import/piazzole',
            description: 'Import piazzole/posteggi da MercaWeb',
            risk_level: 'medium',
            enabled: true,
            test: { enabled: false },
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.import.concessioni',
            method: 'POST',
            path: '/api/integrations/mercaweb/import/concessioni',
            description: 'Import concessioni da MercaWeb',
            risk_level: 'medium',
            enabled: true,
            test: { enabled: false },
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.import.spuntisti',
            method: 'POST',
            path: '/api/integrations/mercaweb/import/spuntisti',
            description: 'Import spuntisti da MercaWeb',
            risk_level: 'medium',
            enabled: true,
            test: { enabled: false },
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.export.presenze',
            method: 'GET',
            path: '/api/integrations/mercaweb/export/presenze/:marketId',
            description: 'Export presenze per mercato verso MercaWeb (usa {"marketId": 1})',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          },
          {
            id: 'mercaweb.export.mapping',
            method: 'GET',
            path: '/api/integrations/mercaweb/export/mapping/:entity',
            description: 'Tabella mapping ID MioHub↔MercaWeb (usa {"entity": "imprese"})',
            risk_level: 'low',
            enabled: true,
            test: true,
            service_id: 'mercaweb',
            base_url: 'https://api.mio-hub.me',
            requiresApiKey: true
          }
        ];
        mercawebEndpoints.forEach(ep => {
          const existingIds = endpointsByCategory['MercaWeb — Abaco S.p.A.']?.map((e: any) => e.id) || [];
          if (!existingIds.includes(ep.id)) {
            endpointsByCategory['MercaWeb — Abaco S.p.A.'].push(ep);
          }
        });

        // Convert to array format
        const categorizedEndpoints = Object.entries(endpointsByCategory).map(([category, endpoints]) => ({
          category,
          endpoints
        }));
        
        setApiEndpoints(categorizedEndpoints);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading endpoints from MIO-hub:', err);
        setLoading(false);
      });
  }, []);

  // Total count from MIO-hub
  const totalEndpointsCount = apiEndpoints.reduce((sum, cat) => sum + cat.endpoints.length, 0);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'POST': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'PUT': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DELETE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleTestEndpoint = async (endpointPath: string, customBody?: string) => {
    setSelectedEndpoint(endpointPath);
    setTestResult(null);
    setIsLoading(true);
    
    const startTime = Date.now();
    
    // Find endpoint info from MIO-hub data
    const endpointInfo = apiEndpoints
      .flatMap(cat => cat.endpoints)
      .find(ep => ep.path === endpointPath);
    
    // Parse request body se presente (dichiarato fuori try per usarlo nel catch)
    let parsedBody: any = {};

    try {
      let data: any = null;

      const bodyToUse = customBody || requestBody;
      if (bodyToUse && bodyToUse.trim()) {
        try {
          parsedBody = JSON.parse(bodyToUse);
        } catch (e) {
          throw new Error('JSON non valido nel Request Body');
        }
      }
      
      // Mappa endpoint → chiamata TRPC
      switch (endpointPath) {
        // ============================================
        // DMSHUB - MERCATI (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.markets.importAuto':
        case '/api/dmsHub/markets/importAuto':
          data = await trpcMutate("dmsHub.markets.importAuto", parsedBody);
          break;
        case '/api/trpc/dmsHub.markets.list':
        case '/api/dmsHub/markets/list':
          data = await trpcQuery("dmsHub.markets.list");
          break;
        case '/api/trpc/dmsHub.markets.getById':
        case '/api/dmsHub/markets/getById':
          data = await trpcQuery("dmsHub.markets.getById", parsedBody);
          break;
          
        // ============================================
        // DMSHUB - POSTEGGI (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.stalls.listByMarket':
        case '/api/dmsHub/stalls/listByMarket':
          data = await trpcQuery("dmsHub.stalls.listByMarket", parsedBody);
          break;
        case '/api/trpc/dmsHub.stalls.updateStatus':
        case '/api/dmsHub/stalls/updateStatus':
          data = await trpcMutate("dmsHub.stalls.updateStatus", parsedBody);
          break;
        case '/api/trpc/dmsHub.stalls.getStatuses':
        case '/api/dmsHub/stalls/getStatuses':
          data = await trpcQuery("dmsHub.stalls.getStatuses", parsedBody);
          break;
          
        // ============================================
        // DMSHUB - OPERATORI (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.vendors.list':
        case '/api/dmsHub/vendors/list':
          data = await trpcQuery("dmsHub.vendors.list");
          break;
        case '/api/trpc/dmsHub.vendors.create':
        case '/api/dmsHub/vendors/create':
          data = await trpcMutate("dmsHub.vendors.create", parsedBody);
          break;
        case '/api/trpc/dmsHub.vendors.update':
        case '/api/dmsHub/vendors/update':
          data = await trpcMutate("dmsHub.vendors.update", parsedBody);
          break;
        case '/api/trpc/dmsHub.vendors.getFullDetails':
        case '/api/dmsHub/vendors/getFullDetails':
          data = await trpcQuery("dmsHub.vendors.getFullDetails", parsedBody);
          break;
          
        // ============================================
        // DMSHUB - PRENOTAZIONI (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.bookings.create':
        case '/api/dmsHub/bookings/create':
          data = await trpcMutate("dmsHub.bookings.create", parsedBody);
          break;
        case '/api/trpc/dmsHub.bookings.listActive':
        case '/api/dmsHub/bookings/listActive':
          data = await trpcQuery("dmsHub.bookings.listActive", parsedBody);
          break;
        case '/api/trpc/dmsHub.bookings.confirmCheckin':
        case '/api/dmsHub/bookings/confirmCheckin':
          data = await trpcMutate("dmsHub.bookings.confirmCheckin", parsedBody);
          break;
        case '/api/trpc/dmsHub.bookings.cancel':
        case '/api/dmsHub/bookings/cancel':
          data = await trpcMutate("dmsHub.bookings.cancel", parsedBody);
          break;
          
        // ============================================
        // DMSHUB - PRESENZE (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.presences.checkout':
        case '/api/dmsHub/presences/checkout':
          data = await trpcMutate("dmsHub.presences.checkout", parsedBody);
          break;
        case '/api/trpc/dmsHub.presences.getTodayByMarket':
        case '/api/dmsHub/presences/getTodayByMarket':
          data = await trpcQuery("dmsHub.presences.getTodayByMarket", parsedBody);
          break;
          
        // ============================================
        // DMSHUB - CONTROLLI (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.inspections.create':
        case '/api/dmsHub/inspections/create':
          data = await trpcMutate("dmsHub.inspections.create", parsedBody);
          break;
        case '/api/trpc/dmsHub.inspections.list':
        case '/api/dmsHub/inspections/list':
          data = await trpcQuery("dmsHub.inspections.list");
          break;
          
        // ============================================
        // DMSHUB - VERBALI (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.violations.create':
        case '/api/dmsHub/violations/create':
          data = await trpcMutate("dmsHub.violations.create", parsedBody);
          break;
        case '/api/trpc/dmsHub.violations.list':
        case '/api/dmsHub/violations/list':
          data = await trpcQuery("dmsHub.violations.list");
          break;
          
        // ============================================
        // DMSHUB - LOCATIONS (path tRPC)
        // ============================================
        case '/api/trpc/dmsHub.locations.list':
          data = await trpcQuery("dmsHub.locations.list");
          break;
        case '/api/trpc/dmsHub.locations.getById':
          data = await trpcQuery("dmsHub.locations.getById", parsedBody);
          break;
        case '/api/trpc/dmsHub.locations.create':
          data = await trpcMutate("dmsHub.locations.create", parsedBody);
          break;
        case '/api/trpc/dmsHub.locations.update':
          data = await trpcMutate("dmsHub.locations.update", parsedBody);
          break;
        case '/api/trpc/dmsHub.locations.delete':
          data = await trpcMutate("dmsHub.locations.delete", parsedBody);
          break;
          
        // MIO AGENT - chiamate REST dirette
        case '/api/logs/initSchema':
          const initResponse = await authenticatedFetch('/api/logs/initSchema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await initResponse.json();
          break;
        case '/api/logs/createLog':
          const createResponse = await authenticatedFetch('/api/logs/createLog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedBody),
          });
          data = await createResponse.json();
          break;
        case '/api/logs/getLogs':
          const getResponse = await fetch('/api/logs/getLogs', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await getResponse.json();
          break;
        case '/api/logs/stats':
          const statsResponse = await fetch('/api/logs/stats', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await statsResponse.json();
          break;
        case '/api/guardian/health':
          const healthResponse = await fetch('/api/guardian/health', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await healthResponse.json();
          break;
        case '/api/guardian/debug/testEndpoint':
          const testEndpointResponse = await authenticatedFetch('/api/guardian/debug/testEndpoint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedBody),
          });
          data = await testEndpointResponse.json();
          break;
          
        // SUAP & PDND - chiamate REST dirette
        case '/api/suap/stats':
          const suapStatsRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/suap/stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'x-ente-id': 'MOCK_ENTE_001' },
          });
          data = await suapStatsRes.json();
          break;
        case '/api/suap/pratiche':
          if (endpointInfo?.method === 'POST') {
            const suapCreateRes = await authenticatedFetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/suap/pratiche`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-ente-id': 'MOCK_ENTE_001' },
              body: JSON.stringify(parsedBody),
            });
            data = await suapCreateRes.json();
          } else {
            const suapListRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/suap/pratiche?${new URLSearchParams(parsedBody)}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json', 'x-ente-id': 'MOCK_ENTE_001' },
            });
            data = await suapListRes.json();
          }
          break;
        case '/api/suap/pratiche/:id':
          const suapId = parsedBody.id || 1;
          const suapDetailRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/suap/pratiche/${suapId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'x-ente-id': 'MOCK_ENTE_001' },
          });
          data = await suapDetailRes.json();
          break;

        case '/api/suap/pratiche/:id/valuta':
          const suapEvalId = parsedBody.id || 1;
          const suapEvalRes = await authenticatedFetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/suap/pratiche/${suapEvalId}/valuta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-ente-id': 'MOCK_ENTE_001' },
          });
          data = await suapEvalRes.json();
          break;

        // SYSTEM & WORKSPACE
        case '/api/system/status':
          const sysStatusRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/system/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await sysStatusRes.json();
          break;
        case '/api/workspace/files':
          const wsFilesRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/workspace/files`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await wsFilesRes.json();
          break;
        case '/api/mihub/chats':
          const chatsRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/mihub/chats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await chatsRes.json();
          break;

        // GIS & ABACUS
        case '/api/stalls/stats/totals':
          const stallsStatsRes = await fetch(addComuneIdToUrl(`${MIHUB_API_BASE_URL}/api/stalls/stats/totals`), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await stallsStatsRes.json();
          break;
        case '/api/gis/markets':
          const gisRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/gis/markets`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await gisRes.json();
          break;
        case '/api/abacus/sql/query':
          const abacusRes = await authenticatedFetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/abacus/sql/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-agent-id': 'dev' }, // Requires auth
            body: JSON.stringify(parsedBody),
          });
          data = await abacusRes.json();
          break;

        // IMPRESE & QUALIFICAZIONI - chiamate REST dirette
        case '/api/imprese':
          const impreseResponse = await fetch('https://orchestratore.mio-hub.me/api/imprese', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await impreseResponse.json();
          break;
        case '/api/imprese/:id':
          const impresaId = parsedBody.id || 1;
          const impresaResponse = await fetch(`https://orchestratore.mio-hub.me/api/imprese/${impresaId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await impresaResponse.json();
          break;
        case '/api/qualificazioni':
          const qualificazioniResponse = await fetch('https://orchestratore.mio-hub.me/api/qualificazioni', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await qualificazioniResponse.json();
          break;
        case '/api/imprese/:id/qualificazioni':
          const impresaIdForQual = parsedBody.id || 1;
          const qualificazioniByImpresaResponse = await fetch(`https://orchestratore.mio-hub.me/api/imprese/${impresaIdForQual}/qualificazioni`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await qualificazioniByImpresaResponse.json();
           break;

        // COLLABORATORI IMPRESA - chiamate REST dirette
        case '/api/collaboratori?impresa_id=:id':
          const collabImpresaId = parsedBody.impresa_id || 38;
          const collabResponse = await fetch(`https://api.mio-hub.me/api/collaboratori?impresa_id=${collabImpresaId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await collabResponse.json();
          break;
        case '/api/collaboratori':
          const createCollabResponse = await authenticatedFetch('https://api.mio-hub.me/api/collaboratori', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedBody),
          });
          data = await createCollabResponse.json();
          break;
        case '/api/collaboratori/:id':
          if (parsedBody._method === 'DELETE') {
            const deleteCollabResponse = await authenticatedFetch(`https://api.mio-hub.me/api/collaboratori/${parsedBody.id || 1}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
            });
            data = await deleteCollabResponse.json();
          } else {
            const updateCollabResponse = await authenticatedFetch(`https://api.mio-hub.me/api/collaboratori/${parsedBody.id || 1}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parsedBody),
            });
            data = await updateCollabResponse.json();
          }
          break;
        case '/api/collaboratori/:id/toggle-presenze':
          const toggleCollabResponse = await authenticatedFetch(`https://api.mio-hub.me/api/collaboratori/${parsedBody.id || 1}/toggle-presenze`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await toggleCollabResponse.json();
          break;
           
        // WALLET / PAGOPA - chiamate tRPC
        case '/api/trpc/wallet.stats':
          data = await trpcQuery("wallet.stats");
          break;
        case '/api/trpc/wallet.list':
          data = await trpcQuery("wallet.list");
          break;
        case '/api/trpc/wallet.getById':
          data = await trpcQuery("wallet.getById", parsedBody);
          break;
        case '/api/trpc/wallet.getByImpresa':
          data = await trpcQuery("wallet.getByImpresa", parsedBody);
          break;
        case '/api/trpc/wallet.create':
          data = await trpcMutate("wallet.create", parsedBody);
          break;
        case '/api/trpc/wallet.updateStatus':
          data = await trpcMutate("wallet.updateStatus", parsedBody);
          break;
        case '/api/trpc/wallet.transazioni':
          data = await trpcQuery("wallet.transazioni", parsedBody);
          break;
        case '/api/trpc/wallet.ricarica':
          data = await trpcMutate("wallet.ricarica", parsedBody);
          break;
        case '/api/trpc/wallet.decurtazione':
          data = await trpcMutate("wallet.decurtazione", parsedBody);
          break;
        case '/api/trpc/wallet.generaAvvisoPagopa':
          data = await trpcMutate("wallet.generaAvvisoPagopa", parsedBody);
          break;
        case '/api/trpc/wallet.avviaPagamentoPagopa':
          data = await trpcMutate("wallet.avviaPagamentoPagopa", parsedBody);
          break;
        case '/api/trpc/wallet.verificaPagamento':
          data = await trpcQuery("wallet.verificaPagamento", parsedBody);
          break;
        case '/api/trpc/wallet.generaPdfAvviso':
          data = await trpcQuery("wallet.generaPdfAvviso", parsedBody);
          break;
        case '/api/trpc/wallet.generaPdfQuietanza':
          data = await trpcQuery("wallet.generaPdfQuietanza", parsedBody);
          break;
        case '/api/trpc/wallet.avvisiPagopa':
          data = await trpcQuery("wallet.avvisiPagopa", parsedBody);
          break;
        case '/api/trpc/wallet.tariffe':
          data = await trpcQuery("wallet.tariffe", parsedBody);
          break;
        case '/api/trpc/wallet.upsertTariffa':
          data = await trpcMutate("wallet.upsertTariffa", parsedBody);
          break;
        case '/api/trpc/wallet.verificaSaldoPresenza':
          data = await trpcQuery("wallet.verificaSaldoPresenza", parsedBody);
          break;
        case '/api/trpc/wallet.ricercaPagamentiGiornalieri':
          data = await trpcQuery("wallet.ricercaPagamentiGiornalieri", parsedBody);
          break;
        case '/api/trpc/wallet.reportMovimenti':
          data = await trpcQuery("wallet.reportMovimenti", parsedBody);
          break;
          
        // GUARDIAN - chiamate tRPC
        case '/api/trpc/guardian.integrations':
          data = await trpcQuery("guardian.integrations");
          break;
        case '/api/trpc/guardian.logs':
          data = await trpcQuery("guardian.logs", parsedBody);
          break;
        case '/api/trpc/guardian.stats':
          data = await trpcQuery("guardian.stats");
          break;
        case '/api/trpc/guardian.testEndpoint':
          data = await trpcMutate("guardian.testEndpoint", parsedBody);
          break;
        case '/api/trpc/guardian.logApiCall':
          data = await trpcMutate("guardian.logApiCall", parsedBody);
          break;
          
        // HUB SHOPS - chiamate REST dirette a Hetzner
        case '/api/hub/shops/create-with-impresa':
          const createShopResponse = await authenticatedFetch(`${MIHUB_API_BASE_URL}/api/hub/shops/create-with-impresa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedBody),
          });
          data = await createShopResponse.json();
          break;
          
        // SHOPPING ROUTE - chiamate REST dirette
        case '/api/routing/calculate':
          const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
          const routingResponse = await authenticatedFetch(`${API_URL}/api/routing/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedBody),
          });
          data = await routingResponse.json();
          break;
        case '/api/routing/tpl-stops':
          const tplStopsResponse = await fetch(`${API_URL}/api/routing/tpl-stops?${new URLSearchParams(parsedBody)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await tplStopsResponse.json();
          break;
          
        // ============================================
        // DMS LEGACY (Heroku) - Chiamate REST dirette su Hetzner
        // ============================================
        case '/api/integrations/dms-legacy/health':
        case '/api/integrations/dms-legacy/markets':
        case '/api/integrations/dms-legacy/vendors':
        case '/api/integrations/dms-legacy/concessions':
        case '/api/integrations/dms-legacy/cron-sync': {
          const dmsRes = await fetch(`https://api.mio-hub.me${endpointPath}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await dmsRes.json();
          break;
        }
        case '/api/integrations/dms-legacy/presences/:marketId': {
          const dmsMarketId = parsedBody.marketId || 1;
          const dmsPresRes = await fetch(`https://api.mio-hub.me/api/integrations/dms-legacy/presences/${dmsMarketId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await dmsPresRes.json();
          break;
        }
        case '/api/integrations/dms-legacy/market-sessions/:marketId': {
          const dmsSessionMarketId = parsedBody.marketId || 1;
          const dmsSessionRes = await fetch(`https://api.mio-hub.me/api/integrations/dms-legacy/market-sessions/${dmsSessionMarketId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          data = await dmsSessionRes.json();
          break;
        }
        case '/api/integrations/dms-legacy/sync': {
          const dmsSyncRes = await authenticatedFetch('https://api.mio-hub.me/api/integrations/dms-legacy/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedBody),
          });
          data = await dmsSyncRes.json();
          break;
        }

        // ============================================
        // MERCAWEB — Abaco S.p.A. - Chiamate REST con API Key
        // ============================================
        case '/api/integrations/mercaweb/health':
        case '/api/integrations/mercaweb/status': {
          const mwGetRes = await fetch(`https://api.mio-hub.me${endpointPath}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-MercaWeb-API-Key': import.meta.env.VITE_MERCAWEB_API_KEY || ''
            },
          });
          data = await mwGetRes.json();
          break;
        }
        case '/api/integrations/mercaweb/export/presenze/:marketId': {
          const mwMarketId = parsedBody.marketId || 1;
          const mwPresRes = await fetch(`https://api.mio-hub.me/api/integrations/mercaweb/export/presenze/${mwMarketId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-MercaWeb-API-Key': import.meta.env.VITE_MERCAWEB_API_KEY || ''
            },
          });
          data = await mwPresRes.json();
          break;
        }
        case '/api/integrations/mercaweb/export/mapping/:entity': {
          const mwEntity = parsedBody.entity || 'imprese';
          const mwMapRes = await fetch(`https://api.mio-hub.me/api/integrations/mercaweb/export/mapping/${mwEntity}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-MercaWeb-API-Key': import.meta.env.VITE_MERCAWEB_API_KEY || ''
            },
          });
          data = await mwMapRes.json();
          break;
        }
        case '/api/integrations/mercaweb/import/ambulanti':
        case '/api/integrations/mercaweb/import/mercati':
        case '/api/integrations/mercaweb/import/piazzole':
        case '/api/integrations/mercaweb/import/concessioni':
        case '/api/integrations/mercaweb/import/spuntisti': {
          const mwImportRes = await authenticatedFetch(`https://api.mio-hub.me${endpointPath}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-MercaWeb-API-Key': import.meta.env.VITE_MERCAWEB_API_KEY || ''
            },
            body: JSON.stringify(parsedBody),
          });
          data = await mwImportRes.json();
          break;
        }

        default:
          // Chiamata REST diretta per tutti gli endpoint non mappati
          // Usa base_url da api/index.json o fallback a Hetzner
          if (endpointInfo) {
            const baseUrl = endpointInfo.base_url || MIHUB_API_BASE_URL;
            let restPath = endpointPath;
            
            // Converti path tRPC in path REST se necessario
            // /api/trpc/dmsHub.markets.list -> /api/markets
            if (restPath.includes('/api/trpc/dmsHub.')) {
              const parts = restPath.replace('/api/trpc/dmsHub.', '').split('.');
              const resource = parts[0]; // markets, stalls, bookings, etc.
              const action = parts[1]; // list, create, getById, etc.
              
              // Mappa azioni comuni
              if (action === 'list' || action === 'listActive' || action === 'listByMarket') {
                restPath = `/api/${resource}`;
              } else if (action === 'getById' || action === 'get') {
                restPath = `/api/${resource}/${parsedBody.id || parsedBody.marketId || 1}`;
              } else if (action === 'create') {
                restPath = `/api/${resource}`;
              } else if (action === 'update' || action === 'updateStatus') {
                restPath = `/api/${resource}/${parsedBody.id || 1}`;
              } else if (action === 'delete') {
                restPath = `/api/${resource}/${parsedBody.id || 1}`;
              } else {
                // Fallback: usa il path originale convertito
                restPath = `/api/${resource}/${action}`;
              }
            }
            
            // Sostituisci parametri path (es. :id, :marketId)
            Object.entries(parsedBody).forEach(([key, value]) => {
              restPath = restPath.replace(`:${key}`, String(value));
            });
            
            const fullUrl = `${baseUrl}${restPath}`;
            const method = endpointInfo.method || 'GET';
            
            const fetchOptions: RequestInit = {
              method,
              headers: { 'Content-Type': 'application/json' },
            };
            
            // Aggiungi body per POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(method) && Object.keys(parsedBody).length > 0) {
              fetchOptions.body = JSON.stringify(parsedBody);
            }
            
            // Aggiungi query params per GET
            let urlWithParams = fullUrl;
            if (method === 'GET' && Object.keys(parsedBody).length > 0) {
              const queryParams = new URLSearchParams();
              Object.entries(parsedBody).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  queryParams.append(key, String(value));
                }
              });
              const queryString = queryParams.toString();
              if (queryString) {
                urlWithParams = `${fullUrl}?${queryString}`;
              }
            }
            
            const restResponse = await authenticatedFetch(urlWithParams, fetchOptions);
            data = await restResponse.json();
          } else {
            throw new Error(`Endpoint sconosciuto: ${endpointPath}`);
          }
      }
      
      const endTime = Date.now();
      const time = `${endTime - startTime}ms`;
      
      setTestResult({
        status: 200,
        time,
        data
      });
      
      // Aggiorna statistiche Playground
      setPlaygroundStats(prev => ({
        requestsToday: prev.requestsToday + 1,
        totalResponseTime: prev.totalResponseTime + (endTime - startTime),
        successCount: prev.successCount + 1,
        errorCount: prev.errorCount
      }));
      
      // Log del test su Guardian
      try {
        await trpcMutate("guardian.logApiCall", {
          endpoint: endpointPath,
          method: endpointInfo?.method || 'GET',
          statusCode: 200,
          responseTime: endTime - startTime,
          params: parsedBody,
        });
      } catch (e) {
        console.error('[Guardian] Errore logging test:', e);
      }
      
      toast.success('✅ Test API completato con successo!');
    } catch (error: any) {
      const endTime = Date.now();
      const time = `${endTime - startTime}ms`;
      
      setTestResult({
        status: 500,
        time,
        data: { success: false, error: error.message || 'Errore sconosciuto' }
      });
      
      // Aggiorna statistiche Playground
      setPlaygroundStats(prev => ({
        requestsToday: prev.requestsToday + 1,
        totalResponseTime: prev.totalResponseTime + (endTime - startTime),
        successCount: prev.successCount,
        errorCount: prev.errorCount + 1
      }));
      
      // Log dell'errore su Guardian
      try {
        await trpcMutate("guardian.logApiCall", {
          endpoint: endpointPath,
          method: endpointInfo?.method || 'GET',
          statusCode: 500,
          responseTime: endTime - startTime,
          error: error.message || 'Errore sconosciuto',
          params: parsedBody,
        });
      } catch (e) {
        console.error('[Guardian] Errore logging test:', e);
      }
      
      toast.error('❌ Test API fallito: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadExampleJSON = () => {
    // Mappa esempi JSON per endpoint
    const examplesByEndpoint: Record<string, any> = {
      // LOCATIONS
      '/api/trpc/dmsHub.locations.delete': { id: 1 },
      '/api/trpc/dmsHub.locations.getById': { id: 1 },
      '/api/trpc/dmsHub.locations.update': { id: 1, name: 'HUB Aggiornato', address: 'Via Nuova 123' },
      '/api/trpc/dmsHub.locations.create': { name: 'Nuovo HUB', address: 'Via Test 123', city: 'Grosseto', lat: 42.7635, lng: 11.1093 },
      
      // SUAP
      // '/api/suap/pratiche': { stato: 'RECEIVED' }, // GET filter example (Commented to avoid duplicate key)
      '/api/suap/pratiche/:id': { id: 1 },
      '/api/suap/pratiche/:id/valuta': { id: 1 },
      '/api/suap/pratiche': { // POST example
        cui: 'SUAP-2025-0001',
        tipo_pratica: 'SCIA_A',
        richiedente_cf: 'RSSMRA80A01H501U',
        richiedente_nome: 'Mario Rossi'
      },

      // MARKETS
      '/api/trpc/dmsHub.markets.getById': { id: 1 },
      '/api/trpc/dmsHub.markets.importAuto': {
        stalls_geojson: { type: 'FeatureCollection', features: [] },
        markers_geojson: { type: 'FeatureCollection', features: [] },
        areas_geojson: { type: 'FeatureCollection', features: [] },
        marketName: 'Mercato Test',
        city: 'Grosseto',
        address: 'Via Test 123'
      },
      
      // STALLS
      '/api/trpc/dmsHub.stalls.listByMarket': { marketId: 1 },
      '/api/trpc/dmsHub.stalls.updateStatus': { stallId: 1, status: 'available' },
      '/api/trpc/dmsHub.stalls.getStatuses': { marketId: 1 },
      
      // VENDORS
      '/api/trpc/dmsHub.vendors.create': { name: 'Mario Rossi', fiscalCode: 'RSSMRA80A01H501Z', email: 'mario@test.it' },
      '/api/trpc/dmsHub.vendors.update': { id: 1, name: 'Mario Rossi Aggiornato' },
      '/api/trpc/dmsHub.vendors.getFullDetails': { id: 1 },
      
      // BOOKINGS
      '/api/trpc/dmsHub.bookings.create': { vendorId: 1, stallId: 1, marketId: 1, date: new Date().toISOString().split('T')[0] },
      '/api/trpc/dmsHub.bookings.listActive': { marketId: 1 },
      '/api/trpc/dmsHub.bookings.confirmCheckin': { bookingId: 1 },
      '/api/trpc/dmsHub.bookings.cancel': { bookingId: 1 },
      
      // PRESENCES
      '/api/trpc/dmsHub.presences.checkout': { presenceId: 1 },
      '/api/trpc/dmsHub.presences.getTodayByMarket': { marketId: 1 },
      
      // INSPECTIONS
      '/api/trpc/dmsHub.inspections.create': { vendorId: 1, marketId: 1, notes: 'Controllo di routine' },
      
      // VIOLATIONS
      '/api/trpc/dmsHub.violations.create': { inspectionId: 1, type: 'MINOR', description: 'Violazione minore' },
      
      // WALLET
      '/api/trpc/wallet.getById': { id: 1 },
      '/api/trpc/wallet.getByImpresa': { impresaId: 1 },
      '/api/trpc/wallet.create': { impresaId: 1, saldoIniziale: 100 },
      '/api/trpc/wallet.updateStatus': { id: 1, stato: 'attivo' },
      '/api/trpc/wallet.transazioni': { walletId: 1 },
      '/api/trpc/wallet.ricarica': { walletId: 1, importo: 50, causale: 'Ricarica test' },
      '/api/trpc/wallet.decurtazione': { walletId: 1, importo: 10, causale: 'Decurtazione test' },
      '/api/trpc/wallet.generaAvvisoPagopa': { walletId: 1, importo: 100 },
      '/api/trpc/wallet.avviaPagamentoPagopa': { walletId: 1, importo: 100 },
      '/api/trpc/wallet.verificaPagamento': { iuv: 'TEST123456789' },
      '/api/trpc/wallet.generaPdfAvviso': { iuv: 'TEST123456789' },
      '/api/trpc/wallet.generaPdfQuietanza': { iuv: 'TEST123456789' },
      '/api/trpc/wallet.avvisiPagopa': { walletId: 1 },
      '/api/trpc/wallet.tariffe': { marketId: 1 },
      '/api/trpc/wallet.upsertTariffa': { marketId: 1, tipoPosteggio: 'standard', tariffa: 15 },
      '/api/trpc/wallet.verificaSaldoPresenza': { walletId: 1, marketId: 1 },
      '/api/trpc/wallet.ricercaPagamentiGiornalieri': { data: new Date().toISOString().split('T')[0] },
      '/api/trpc/wallet.reportMovimenti': { walletId: 1, dataInizio: '2024-01-01', dataFine: '2024-12-31' },
      
      // GUARDIAN
      '/api/trpc/guardian.logs': { level: 'info', limit: 10 },
      '/api/trpc/guardian.testEndpoint': { url: 'https://api.example.com/test', method: 'GET' },
      '/api/trpc/guardian.logApiCall': { endpoint: '/test', method: 'GET', statusCode: 200, responseTime: 100 },
      
      // IMPRESE
      '/api/imprese/:id': { id: 1 },
      '/api/imprese/:id/qualificazioni': { id: 1 },
      '/api/imprese/:id/rating': { id: 1 },

      // DMS LEGACY (Heroku)
      '/api/integrations/dms-legacy/presences/:marketId': { marketId: 1 },
      '/api/integrations/dms-legacy/market-sessions/:marketId': { marketId: 1 },
      '/api/integrations/dms-legacy/sync': { entities: ['markets', 'vendors', 'concessions'] },

      // MERCAWEB — Abaco S.p.A.
      '/api/integrations/mercaweb/export/presenze/:marketId': { marketId: 1 },
      '/api/integrations/mercaweb/export/mapping/:entity': { entity: 'imprese' },
      '/api/integrations/mercaweb/import/ambulanti': {
        records: [{
          mercaweb_id: '9001',
          ragione_sociale: 'Ditta Test S.r.l.',
          codice_fiscale: 'TSTTST80A01H501Z',
          partita_iva: '01234567890',
          indirizzo: 'Via Roma 1',
          comune: 'Grosseto',
          telefono: '0564123456'
        }]
      },
      '/api/integrations/mercaweb/import/mercati': {
        records: [{
          mercaweb_id: 'M001',
          nome: 'Mercato Test',
          comune: 'Grosseto',
          indirizzo: 'Piazza Dante',
          giorno_svolgimento: 'Luned\u00ec',
          num_posteggi: 50
        }]
      },
      '/api/integrations/mercaweb/import/piazzole': {
        records: [{
          mercaweb_id: 'P001',
          mercato_mercaweb_id: 'M001',
          numero: '1A',
          metratura: 12,
          tipo: 'alimentare'
        }]
      },
      '/api/integrations/mercaweb/import/concessioni': {
        records: [{
          mercaweb_id: 'C001',
          ambulante_mercaweb_id: '9001',
          piazzola_mercaweb_id: 'P001',
          data_inizio: '2025-01-01',
          data_fine: '2030-12-31',
          tipo: 'ordinaria'
        }]
      },
      '/api/integrations/mercaweb/import/spuntisti': {
        records: [{
          mercaweb_id: 'S001',
          ambulante_mercaweb_id: '9001',
          mercato_mercaweb_id: 'M001',
          data: '2025-06-15',
          piazzola_assegnata: '1A'
        }]
      },
    };
    
    // Cerca esempio per endpoint selezionato
    const example = selectedEndpoint ? examplesByEndpoint[selectedEndpoint] : null;

    setRequestBody(JSON.stringify(example || { marketId: 1, id: 1 }, null, 2));
    toast.success('JSON esempio caricato per: ' + (selectedEndpoint || '').split('/').pop());
  };

  return (
    <div className="space-y-6">
      {/* Statistiche Endpoint */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Inventario - da MIO-hub index.json */}
        <Card className="bg-[#1a2332] border-[#3b82f6]/30">
          <CardContent className="p-3">
            <p className="text-[#e8fbff]/60 text-xs">Inventario</p>
            <p className="text-xl font-bold text-[#3b82f6]">{totalEndpointsCount}</p>
          </CardContent>
        </Card>
        
        {/* Attivi Backend - dal backend Hetzner */}
        <Card className="bg-[#1a2332] border-[#10b981]/30">
          <CardContent className="p-3">
            <p className="text-[#e8fbff]/60 text-xs">Attivi Backend</p>
            <p className="text-xl font-bold text-[#10b981]">{backendStats.active}</p>
          </CardContent>
        </Card>
        
        {/* Totale Backend */}
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-3">
            <p className="text-[#e8fbff]/60 text-xs">Totale Backend</p>
            <p className="text-xl font-bold text-[#14b8a6]">{backendStats.total}</p>
          </CardContent>
        </Card>
        
        {/* Backup */}
        <Card className="bg-[#1a2332] border-[#f59e0b]/30">
          <CardContent className="p-3">
            <p className="text-[#e8fbff]/60 text-xs">Backup</p>
            <p className="text-xl font-bold text-[#f59e0b]">{backendStats.backup}</p>
          </CardContent>
        </Card>
        
        {/* Richieste Oggi */}
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardContent className="p-3">
            <p className="text-[#e8fbff]/60 text-xs">Richieste Oggi</p>
            <p className="text-xl font-bold text-[#8b5cf6]">{(apiStats as any)?.totalRequests || apiStats?.requestsToday || 0}</p>
          </CardContent>
        </Card>
        
        {/* Success Rate */}
        <Card className="bg-[#1a2332] border-[#06b6d4]/30">
          <CardContent className="p-3">
            <p className="text-[#e8fbff]/60 text-xs">Success Rate</p>
            <p className="text-xl font-bold text-[#06b6d4]">{apiStats?.successRate || '0%'}</p>
          </CardContent>
        </Card>
        
        {/* TOTALE GENERALE */}
        <Card className="bg-gradient-to-r from-[#1a2332] to-[#0f1419] border-[#ec4899]/50">
          <CardContent className="p-3">
            <p className="text-[#e8fbff]/60 text-xs">TOTALE</p>
            <p className="text-xl font-bold text-[#ec4899]">{totalEndpointsCount + backendStats.active}</p>
            <p className="text-[#e8fbff]/40 text-[10px]">Inv + Attivi</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lista Endpoint */}
      <div className="space-y-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Code className="h-5 w-5 text-[#14b8a6]" />
              Endpoint Disponibili
              <Badge className="bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30 border ml-2">
                {apiEndpoints.reduce((acc, cat) => acc + cat.endpoints.length, 0)}
              </Badge>
            </CardTitle>
            {/* Barra di ricerca */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e8fbff]/40" />
              <Input
                placeholder="Cerca endpoint, categoria o descrizione..."
                value={endpointSearch}
                onChange={(e) => setEndpointSearch(e.target.value)}
                className="pl-10 bg-[#0a1628] border-[#14b8a6]/20 text-[#e8fbff] placeholder:text-[#e8fbff]/30 focus:border-[#14b8a6]/50"
              />
              {endpointSearch && (
                <button
                  onClick={() => setEndpointSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e8fbff]/40 hover:text-[#e8fbff]/70 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

          </CardHeader>
          <CardContent className="pt-0">
            {loading && (
              <div className="text-center py-4 text-[#e8fbff]/60 text-sm">
                Caricamento endpoint da MIO-hub...
              </div>
            )}
            {/* Container scrollabile */}
            <div className="max-h-[600px] overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-[#14b8a6]/30 scrollbar-track-transparent">
              {apiEndpoints
                .map((category) => {
                  const searchLower = endpointSearch.toLowerCase();
                  // Filtra: se la ricerca matcha la categoria, mostra tutti gli endpoint
                  const categoryMatch = category.category.toLowerCase().includes(searchLower);
                  const filteredEndpoints = categoryMatch
                    ? category.endpoints
                    : category.endpoints.filter((ep: any) =>
                        ep.path.toLowerCase().includes(searchLower) ||
                        (ep.description || '').toLowerCase().includes(searchLower)
                      );
                  if (filteredEndpoints.length === 0) return null;
                  return { ...category, endpoints: filteredEndpoints };
                })
                .filter(Boolean)
                .map((category: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-sm font-semibold text-[#14b8a6] sticky top-0 bg-[#1a2332] py-1 z-10">{category.category}</h3>
                    {category.endpoints.map((endpoint: any, eidx: number) => (
                      <div
                        key={eidx}
                        className="flex items-center gap-2 p-3 bg-[#0a1628] rounded-lg border border-[#14b8a6]/20 hover:border-[#14b8a6]/40 transition-colors cursor-pointer"
                        onClick={() => handleTestEndpoint(endpoint.path)}
                      >
                        <Badge className={`${getMethodColor(endpoint.method)} border`}>
                          {endpoint.method}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-mono text-[#e8fbff]/80 truncate">{endpoint.path}</p>
                            {endpoint.test?.enabled === false ? (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border text-[10px]">
                                Manual Test
                              </Badge>
                            ) : (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border text-[10px]">
                                Auto Test
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-[#e8fbff]/50">{endpoint.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#14b8a6] hover:bg-[#14b8a6]/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestEndpoint(endpoint.path);
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              {/* Messaggio nessun risultato */}
              {endpointSearch && apiEndpoints.every((cat) => {
                const searchLower = endpointSearch.toLowerCase();
                const categoryMatch = cat.category.toLowerCase().includes(searchLower);
                return !categoryMatch && cat.endpoints.every((ep: any) =>
                  !ep.path.toLowerCase().includes(searchLower) &&
                  !(ep.description || '').toLowerCase().includes(searchLower)
                );
              }) && (
                <div className="text-center py-8 text-[#e8fbff]/40">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nessun endpoint trovato per "{endpointSearch}"</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Playground */}
      <div className="space-y-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Play className="h-5 w-5 text-[#14b8a6]" />
              API Playground
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedEndpoint ? (
              <>
                <div>
                  <Label className="text-[#e8fbff]/70">Endpoint</Label>
                  <Input
                    value={selectedEndpoint}
                    readOnly
                    className="bg-[#0a1628] border-[#14b8a6]/30 text-[#e8fbff] font-mono text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[#e8fbff]/70">Request Body (JSON)</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={loadExampleJSON}
                      className="text-xs text-[#14b8a6] border-[#14b8a6]/30 hover:bg-[#14b8a6]/10"
                    >
                      <FileJson className="h-3 w-3 mr-1" />
                      Carica Esempio
                    </Button>
                  </div>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full h-40 bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-3 text-[#e8fbff] font-mono text-xs overflow-auto"
                    placeholder='{\n  "marketId": 1,\n  "param2": "value2"\n}'
                  />
                </div>

                <Button 
                  onClick={() => handleTestEndpoint(selectedEndpoint)}
                  disabled={isLoading}
                  className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Esecuzione...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Esegui Test
                    </>
                  )}
                </Button>

                {testResult && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Status: {testResult.status}
                      </Badge>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Time: {testResult.time}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-[#e8fbff]/70">Response</Label>
                      <pre className="bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-3 text-[#e8fbff] font-mono text-xs overflow-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Code className="h-16 w-16 text-[#14b8a6]/50 mx-auto mb-4" />
                <p className="text-[#e8fbff]/70">Seleziona un endpoint per testarlo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiche API */}
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#14b8a6]" />
              Statistiche Utilizzo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
                <p className="text-[#e8fbff]/60 text-sm">Richieste (Sessione)</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{((apiStats?.requestsToday || 0) + playgroundStats.requestsToday).toLocaleString()}</p>
              </div>
              <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
                <p className="text-[#e8fbff]/60 text-sm">Tempo Medio</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{playgroundStats.requestsToday > 0 ? Math.round(playgroundStats.totalResponseTime / playgroundStats.requestsToday) : (apiStats?.avgResponseTime || 0)}ms</p>
              </div>
              <div className="bg-[#0a1628] p-4 rounded-lg border border-green-500/20">
                <p className="text-[#e8fbff]/60 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">{playgroundStats.requestsToday > 0 ? ((playgroundStats.successCount / playgroundStats.requestsToday) * 100).toFixed(1) : (apiStats?.successRate || 0)}%</p>
              </div>
              <div className="bg-[#0a1628] p-4 rounded-lg border border-red-500/20">
                <p className="text-[#e8fbff]/60 text-sm">Errori</p>
                <p className="text-2xl font-bold text-red-400">{(apiStats?.errors || 0) + playgroundStats.errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}

// ============================================================================
// TAB 2: CONNESSIONI ESTERNE
// ============================================================================
function ConnessioniEsterne() {
  const { data: connections = [], refetch } = useQuery({
    queryKey: ['integrations-connections-list'],
    queryFn: () => trpcQuery<any[]>('integrations.connections.list'),
  });
  const healthCheckMutation = useMutation({
    mutationFn: (params: { id: number }) => trpcMutate<any>('integrations.connections.healthCheck', params),
  });
  const healthCheckAllMutation = useMutation({
    mutationFn: () => trpcMutate<any>('integrations.connections.healthCheckAll'),
  });
  
  const handleHealthCheck = async (id: number) => {
    try {
      const result = await healthCheckMutation.mutateAsync({ id });
      await refetch();
      toast.success(`Health check completato: ${result.status}`);
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };
  
  const handleHealthCheckAll = async () => {
    try {
      await healthCheckAllMutation.mutateAsync();
      await refetch();
      toast.success('Health check completato per tutte le connessioni');
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };
  


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Connesso</Badge>;
      case 'disconnected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Disconnesso</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertCircle className="h-3 w-3 mr-1" />In Configurazione</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {connections.map((conn, idx) => (
        <Card key={idx} className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <CardTitle className="text-[#e8fbff]">{conn.name}</CardTitle>
                  <p className="text-sm text-[#e8fbff]/60 mt-1">{conn.type}</p>
                </div>
              </div>
              {getStatusBadge(conn.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-[#14b8a6]" />
                <span className="text-[#e8fbff]/70">Ultimo sync:</span>
                <span className="text-[#e8fbff]">{conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString('it-IT') : 'Mai'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-[#14b8a6]" />
                <span className="text-[#e8fbff]/70 font-mono text-xs truncate">{conn.endpoint}</span>
              </div>
            </div>

            {conn.features && (
              <div>
                <p className="text-sm text-[#e8fbff]/70 mb-2">Features:</p>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(conn.features).map((feature: string, fidx: number) => (
                    <Badge key={fidx} variant="outline" className="bg-[#0a1628] border-[#14b8a6]/30 text-[#14b8a6]">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {conn.status === 'connected' ? (
                <>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                    onClick={() => handleHealthCheck(conn.id)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Health Check
                  </Button>
                  <Button variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <XCircle className="h-4 w-4 mr-2" />
                    Disconnetti
                  </Button>
                </>
              ) : (
                <Button className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white">
                  <Plug className="h-4 w-4 mr-2" />
                  Connetti
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// TAB 3: API KEYS MANAGER
// ============================================================================
function APIKeysManager() {
  const { data: apiKeys = [], refetch } = useQuery({
    queryKey: ['integrations-apiKeys-list'],
    queryFn: () => trpcQuery<any[]>('integrations.apiKeys.list'),
  });
  const createMutation = useMutation({
    mutationFn: (params: { name: string; environment?: string }) => trpcMutate<any>('integrations.apiKeys.create', params),
  });
  const deleteMutation = useMutation({
    mutationFn: (params: { id: number }) => trpcMutate<any>('integrations.apiKeys.delete', params),
  });
  const regenerateMutation = useMutation({
    mutationFn: (params: { id: number }) => trpcMutate<any>('integrations.apiKeys.regenerate', params),
  });
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API Key copiata negli appunti');
  };

  const handleDeleteKey = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await refetch();
      toast.success('API Key eliminata');
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };
  
  const handleRegenerateKey = async (id: number) => {
    try {
      const result = await regenerateMutation.mutateAsync({ id });
      await refetch();
      toast.success('API Key rigenerata: ' + result.key);
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };
  
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Inserisci un nome per la API Key');
      return;
    }
    
    try {
      const result = await createMutation.mutateAsync({
        name: newKeyName,
        environment: 'production',
      });
      await refetch();
      setShowCreateDialog(false);
      setNewKeyName('');
      toast.success('API Key creata: ' + result.key);
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con pulsante nuovo */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#e8fbff]">API Keys Attive</h3>
          <p className="text-sm text-[#e8fbff]/60">Gestisci le chiavi API per autenticare le applicazioni</p>
        </div>
        <Button 
          className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuova API Key
        </Button>
      </div>

      {/* Lista API Keys */}
      <div className="grid grid-cols-1 gap-4">
        {apiKeys.map((apiKey) => (
          <Card key={apiKey.id} className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-[#e8fbff] font-semibold">{apiKey.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-[#0a1628] px-3 py-1 rounded text-sm text-[#14b8a6] font-mono">
                      {apiKey.key}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#14b8a6] hover:bg-[#14b8a6]/10"
                      onClick={() => handleCopyKey(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Badge className={apiKey.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
                  {apiKey.status === 'active' ? 'Attiva' : 'Inattiva'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-[#e8fbff]/60">Creata</p>
                  <p className="text-sm text-[#e8fbff]">{new Date(apiKey.createdAt).toLocaleDateString('it-IT')}</p>
                </div>
                <div>
                  <p className="text-xs text-[#e8fbff]/60">Ultimo Utilizzo</p>
                  <p className="text-sm text-[#e8fbff]">{apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString('it-IT') : 'Mai'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#e8fbff]/60">Rate Limit</p>
                  <p className="text-sm text-[#e8fbff]">{apiKey.rateLimit} req/min</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                  onClick={() => handleRegenerateKey(apiKey.id)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rigenera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleDeleteKey(apiKey.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Dialog Nuova API Key */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-[#e8fbff]">Nuova API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[#e8fbff]/70">Nome</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Es: App Cittadini - Production"
                  className="bg-[#0a1628] border-[#14b8a6]/30 text-[#e8fbff]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="border-[#14b8a6]/30 text-[#e8fbff]"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleCreateKey}
                  className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
                >
                  Crea
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB 4: WEBHOOK MANAGER
// ============================================================================
function WebhookManager() {
  const { data: webhooks = [], refetch } = useQuery({
    queryKey: ['integrations-webhooks-list'],
    queryFn: () => trpcQuery<any[]>('integrations.webhooks.list'),
  });
  const createMutation = useMutation({
    mutationFn: (params: { name: string; url: string; events: string[] }) => trpcMutate<any>('integrations.webhooks.create', params),
  });
  const testMutation = useMutation({
    mutationFn: (params: { id: number }) => trpcMutate<any>('integrations.webhooks.test', params),
  });
  const deleteMutation = useMutation({
    mutationFn: (params: { id: number }) => trpcMutate<any>('integrations.webhooks.delete', params),
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: ['market.updated', 'wallet.transaction'] });

  const handleTestWebhook = async (id: number) => {
    try {
      const result = await testMutation.mutateAsync({ id });
      toast.success(`Test completato: ${result.statusCode} (${result.responseTime}ms)`);
    } catch (error: any) {
      toast.error('Test fallito: ' + error.message);
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await refetch();
      toast.success('Webhook eliminato');
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
      toast.error('Nome e URL sono obbligatori');
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
      });
      await refetch();
      setShowCreateDialog(false);
      setNewWebhook({ name: '', url: '', events: ['market.updated', 'wallet.transaction'] });
      toast.success('Webhook creato con successo');
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#e8fbff]">Webhook Configurati</h3>
          <p className="text-sm text-[#e8fbff]/60">Ricevi notifiche real-time su eventi del sistema</p>
        </div>
        <Button className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Webhook
        </Button>
      </div>

      {/* Create Webhook Dialog */}
      {showCreateDialog && (
        <Card className="bg-[#0b1220] border-[#14b8a6]/50">
          <CardContent className="p-6 space-y-4">
            <h4 className="text-[#e8fbff] font-semibold">Nuovo Webhook</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-[#e8fbff]/70">Nome</label>
                <input
                  className="w-full px-3 py-2 bg-[#1a2332] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm"
                  placeholder="Es. Notifica Pagamenti"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#e8fbff]/70">URL Endpoint</label>
                <input
                  className="w-full px-3 py-2 bg-[#1a2332] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm"
                  placeholder="https://example.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[#e8fbff]/70">Eventi (separati da virgola)</label>
              <input
                className="w-full px-3 py-2 bg-[#1a2332] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] text-sm"
                value={newWebhook.events.join(', ')}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, events: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-[#14b8a6]/30 text-[#e8fbff]">
                Annulla
              </Button>
              <Button onClick={handleCreateWebhook} disabled={createMutation.isPending} className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white">
                {createMutation.isPending ? 'Creazione...' : 'Crea Webhook'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista Webhook */}
      <div className="grid grid-cols-1 gap-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id} className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-[#e8fbff] font-semibold">{webhook.name}</h4>
                    <Badge className={webhook.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}>
                      {webhook.status === 'active' ? 'Attivo' : 'In Configurazione'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#e8fbff]/70">
                    <ExternalLink className="h-4 w-4 text-[#14b8a6]" />
                    <code className="font-mono text-xs">{webhook.url}</code>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-[#e8fbff]/60 mb-2">Eventi:</p>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(webhook.events).map((event: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="bg-[#0a1628] border-[#14b8a6]/30 text-[#14b8a6] font-mono text-xs">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-[#e8fbff]/60">Ultimo Trigger</p>
                    <p className="text-sm text-[#e8fbff]">{webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleString('it-IT') : 'Mai'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#e8fbff]/60">Success Rate</p>
                    <p className="text-sm text-[#e8fbff]">{webhook.successCount + webhook.failureCount > 0 ? ((webhook.successCount / (webhook.successCount + webhook.failureCount)) * 100).toFixed(1) : 0}%</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                  onClick={() => handleTestWebhook(webhook.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Log
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 5: SYNC STATUS (Gestionale Heroku) - COLLEGATO AD API REALI
// ============================================================================
function SyncStatus() {
  // Query per stato sincronizzazione
  const { data: syncStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['integrations-sync-status'],
    queryFn: () => trpcQuery<any>('integrations.sync.status'),
  });

  // Query per job recenti
  const { data: syncJobs, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['integrations-sync-jobs'],
    queryFn: () => trpcQuery<any>('integrations.sync.jobs', { limit: 10 }),
  });

  // Query per configurazione
  const { data: syncConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['integrations-sync-config'],
    queryFn: () => trpcQuery<any>('integrations.sync.getConfig'),
  });

  // Mutation per trigger sync
  const triggerSync = useMutation({
    mutationFn: () => trpcMutate<any>('integrations.sync.trigger'),
    onSuccess: (data: any) => {
      toast.success(`Sincronizzazione completata${data.simulated ? ' (simulata)' : ''}`, {
        description: `${data.results.length} entità processate`,
      });
      refetchStatus();
      refetchJobs();
    },
    onError: (error: any) => {
      toast.error('Errore sincronizzazione', { description: error.message });
    },
  });

  // Mutation per aggiornare config
  const updateConfig = useMutation({
    mutationFn: (params: { frequency: string; mode: string; entities: string[] }) => trpcMutate<any>('integrations.sync.updateConfig', params),
    onSuccess: () => {
      toast.success('Configurazione salvata');
      refetchConfig();
      refetchStatus();
    },
    onError: (error: any) => {
      toast.error('Errore salvataggio', { description: error.message });
    },
  });
  
  // State per form configurazione
  const [frequency, setFrequency] = useState(syncConfig?.frequency || 300);
  const [mode, setMode] = useState(syncConfig?.mode || 'bidirectional');
  const [entities, setEntities] = useState<string[]>(syncConfig?.entities || ['operatori', 'presenze', 'concessioni', 'pagamenti', 'documenti']);
  
  // Aggiorna state quando config cambia
  useEffect(() => {
    if (syncConfig) {
      setFrequency(syncConfig.frequency || 300);
      setMode(syncConfig.mode || 'bidirectional');
      setEntities(syncConfig.entities || ['operatori', 'presenze', 'concessioni', 'pagamenti', 'documenti']);
    }
  }, [syncConfig]);
  
  // Formatta tempo relativo
  const formatRelativeTime = (date: Date | string | null) => {
    if (!date) return 'Mai';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Adesso';
    if (diffMins < 60) return `${diffMins} minuti fa`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ore fa`;
    return d.toLocaleDateString('it-IT');
  };
  
  const formatFutureTime = (date: Date | string | null) => {
    if (!date) return 'Non programmato';
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Imminente';
    if (diffMins < 60) return `Tra ${diffMins} minuti`;
    const diffHours = Math.floor(diffMins / 60);
    return `Tra ${diffHours} ore`;
  };
  
  const handleSaveConfig = () => {
    updateConfig.mutate({
      frequency,
      mode: mode as 'unidirectional' | 'bidirectional',
      entities,
    });
  };
  
  const toggleEntity = (entity: string) => {
    setEntities(prev => 
      prev.includes(entity) 
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
  };
  
  const entityLabels: Record<string, string> = {
    operatori: 'Operatori',
    presenze: 'Presenze',
    concessioni: 'Concessioni',
    pagamenti: 'Pagamenti',
    documenti: 'Documenti',
    mercati: 'Mercati',
    posteggi: 'Posteggi',
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Database className="h-5 w-5 text-[#14b8a6]" />
              Sincronizzazione Gestionale Heroku
            </CardTitle>
            {syncStatus?.enabled ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Attiva
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                Non Configurata
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
              <p className="text-[#e8fbff]/60 text-sm">Ultimo Sync</p>
              <p className="text-lg font-bold text-[#14b8a6]">
                {statusLoading ? '...' : formatRelativeTime(syncStatus?.lastSync)}
              </p>
            </div>
            <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
              <p className="text-[#e8fbff]/60 text-sm">Prossimo Sync</p>
              <p className="text-lg font-bold text-[#14b8a6]">
                {statusLoading ? '...' : formatFutureTime(syncStatus?.nextSync)}
              </p>
            </div>
            <div className="bg-[#0a1628] p-4 rounded-lg border border-green-500/20">
              <p className="text-[#e8fbff]/60 text-sm">Totale Sincronizzati</p>
              <p className="text-lg font-bold text-green-400">
                {statusLoading ? '...' : syncStatus?.totalSynced || 0}
              </p>
            </div>
            <div className="bg-[#0a1628] p-4 rounded-lg border border-red-500/20">
              <p className="text-[#e8fbff]/60 text-sm">Errori</p>
              <p className="text-lg font-bold text-red-400">
                {statusLoading ? '...' : syncStatus?.errors || 0}
              </p>
            </div>
          </div>

          {/* Azioni */}
          <div className="flex gap-2">
            <Button 
              className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
              onClick={() => triggerSync.mutate()}
              disabled={triggerSync.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
              {triggerSync.isPending ? 'Sincronizzazione...' : 'Sincronizza Ora'}
            </Button>
            <Button 
              variant="outline" 
              className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
              onClick={() => {
                if (syncConfig?.externalUrl) {
                  window.open(syncConfig.externalUrl, '_blank');
                } else {
                  toast.info('URL gestionale non configurato');
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Apri Gestionale
            </Button>
          </div>
          
          {/* Info se non configurato */}
          {!syncStatus?.config?.externalUrl && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Modalità Simulazione</span>
              </div>
              <p className="text-sm text-[#e8fbff]/60 mt-1">
                Il gestionale Heroku non è ancora configurato. Le sincronizzazioni verranno simulate.
                Configura l'URL del gestionale nella sezione sottostante quando sarà disponibile.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Sincronizzazione */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#14b8a6]" />
            Log Sincronizzazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="text-center py-8 text-[#e8fbff]/60">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Caricamento log...
            </div>
          ) : syncJobs && syncJobs.length > 0 ? (
            <div className="space-y-2">
              {syncJobs.map((job: any) => (
                <div
                  key={job.id}
                  className="flex items-center gap-4 p-3 bg-[#0a1628] rounded-lg border border-[#14b8a6]/20"
                >
                  <span className="text-sm text-[#e8fbff]/60 font-mono">
                    {new Date(job.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge variant="outline" className="bg-[#0a1628] border-[#14b8a6]/30 text-[#14b8a6]">
                    {entityLabels[job.entity] || job.entity}
                  </Badge>
                  <span className="text-sm text-[#e8fbff]/80 flex-1">
                    Sync {job.direction === 'pull' ? 'ricezione' : job.direction === 'push' ? 'invio' : 'bidirezionale'}
                  </span>
                  {job.status === 'success' ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                  ) : job.status === 'partial' ? (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Parziale
                    </Badge>
                  ) : job.status === 'running' ? (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      In corso
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      <XCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  <span className="text-sm text-[#e8fbff]/60">{job.recordsSuccess} record</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#e8fbff]/60">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessuna sincronizzazione effettuata</p>
              <p className="text-sm">Clicca "Sincronizza Ora" per avviare la prima sync</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurazione Sync */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-[#14b8a6]" />
            Configurazione Sincronizzazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#e8fbff]/70">Frequenza Sync</Label>
              <select 
                className="w-full mt-2 bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-2 text-[#e8fbff]"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
              >
                <option value={300}>Ogni 5 minuti</option>
                <option value={900}>Ogni 15 minuti</option>
                <option value={1800}>Ogni 30 minuti</option>
                <option value={3600}>Ogni ora</option>
              </select>
            </div>
            <div>
              <Label className="text-[#e8fbff]/70">Modalità</Label>
              <select 
                className="w-full mt-2 bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-2 text-[#e8fbff]"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="bidirectional">Bidirezionale</option>
                <option value="unidirectional">Solo Ricezione</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[#e8fbff]/70">Entità da Sincronizzare</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(entityLabels).map(([key, label]) => (
                <label 
                  key={key} 
                  className="flex items-center gap-2 p-2 bg-[#0a1628] rounded border border-[#14b8a6]/20 cursor-pointer hover:border-[#14b8a6]/40"
                >
                  <input 
                    type="checkbox" 
                    checked={entities.includes(key)}
                    onChange={() => toggleEntity(key)}
                    className="text-[#14b8a6]" 
                  />
                  <span className="text-sm text-[#e8fbff]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button 
            className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
            onClick={handleSaveConfig}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? 'Salvataggio...' : 'Salva Configurazione'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


// ============================================
// SECRETS MANAGER COMPONENT
// ============================================
interface SecretMeta {
  id: string;
  label: string;
  category: string;
  envVar: string;
  env: string;
  present: boolean;
  lastUpdated: string | null;
  notes: string;
  deprecated: boolean;
}

const CATEGORY_ICONS: Record<string, any> = {
  'LLM': Zap,
  'GitHub': Github,
  'Database': Database,
  'Cloud': Cloud,
  'Auth': Key,
  'Payment': Building2,
  'Deploy': Server,
  'Mobility': Activity,
};

const CATEGORY_COLORS: Record<string, string> = {
  'LLM': 'text-yellow-500',
  'GitHub': 'text-purple-500',
  'Database': 'text-blue-500',
  'Cloud': 'text-sky-500',
  'Auth': 'text-green-500',
  'Payment': 'text-orange-500',
  'Deploy': 'text-cyan-500',
  'Mobility': 'text-teal-500',
};

function SecretsManager() {
  const [secrets, setSecrets] = useState<SecretMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSecret, setEditingSecret] = useState<string | null>(null);
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSecretsMetadata();
  }, []);

  const loadSecretsMetadata = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mihub/secrets-meta');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        const mappedSecrets = data.secrets.map((secret: any) => ({
          ...secret,
          envVar: secret.envvar || secret.envVar
        }));
        setSecrets(mappedSecrets);
      } else {
        throw new Error('Failed to load secrets metadata');
      }
    } catch (err) {
      console.error('Error loading secrets metadata:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSecret = async (envVar: string) => {
    const value = secretValues[envVar] || '';
    if (!value.trim()) {
      toast.error('Il valore del secret non può essere vuoto');
      return;
    }

    setSaving(true);
    
    try {
      const response = await authenticatedFetch(`/api/mihub/secrets/${envVar}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: value.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSecretValues(prev => ({ ...prev, [envVar]: '' }));
        setEditingSecret(null);
        setShowValues(prev => ({ ...prev, [envVar]: false }));
        await loadSecretsMetadata();
        toast.success(`Secret ${envVar} salvato con successo!`);
      } else {
        throw new Error(data.error || 'Failed to save secret');
      }
    } catch (err) {
      console.error(`Error saving secret ${envVar}:`, err);
      toast.error(`Errore nel salvataggio: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (editingSecret) {
      setSecretValues(prev => ({ ...prev, [editingSecret]: '' }));
      setShowValues(prev => ({ ...prev, [editingSecret]: false }));
    }
    setEditingSecret(null);
  };

  const groupedSecrets = secrets.reduce((acc, secret) => {
    if (!acc[secret.category]) {
      acc[secret.category] = [];
    }
    acc[secret.category].push(secret);
    return acc;
  }, {} as Record<string, SecretMeta[]>);

  const stats = {
    total: secrets.length,
    present: secrets.filter(s => s.present).length,
    missing: secrets.filter(s => !s.present).length,
    deprecated: secrets.filter(s => s.deprecated).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-[#14b8a6]" />
        <span className="ml-3 text-lg text-[#e8fbff]">Caricamento secrets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#1a2332] border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>Errore: {error}</span>
          </div>
          <Button onClick={loadSecretsMetadata} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Riprova
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[#e8fbff]">Gestione Secrets</h3>
          <p className="text-[#e8fbff]/60 text-sm">Credenziali e variabili d'ambiente per servizi esterni</p>
        </div>
        <Button onClick={loadSecretsMetadata} variant="outline" className="border-[#14b8a6]/30 text-[#14b8a6]">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <p className="text-[#e8fbff]/60 text-sm">Totale Secrets</p>
            <p className="text-2xl font-bold text-[#14b8a6]">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-green-500/30">
          <CardContent className="p-4">
            <p className="text-[#e8fbff]/60 text-sm">Configurati</p>
            <p className="text-2xl font-bold text-green-400">{stats.present}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-orange-500/30">
          <CardContent className="p-4">
            <p className="text-[#e8fbff]/60 text-sm">Mancanti</p>
            <p className="text-2xl font-bold text-orange-400">{stats.missing}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-red-500/30">
          <CardContent className="p-4">
            <p className="text-[#e8fbff]/60 text-sm">Deprecati</p>
            <p className="text-2xl font-bold text-red-400">{stats.deprecated}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secrets by Category */}
      {Object.entries(groupedSecrets).map(([category, categorySecrets]) => {
        const Icon = CATEGORY_ICONS[category] || Key;
        const colorClass = CATEGORY_COLORS[category] || 'text-gray-500';
        
        return (
          <Card key={category} className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Icon className={`h-5 w-5 ${colorClass}`} />
                {category}
                <Badge variant="outline" className="ml-2 border-[#14b8a6]/30 text-[#14b8a6]">
                  {categorySecrets.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {categorySecrets.map((secret) => (
                <div
                  key={secret.id}
                  className={`p-4 bg-[#0a1628] rounded-lg border ${
                    secret.deprecated ? 'border-red-500/30 opacity-60' : 'border-[#14b8a6]/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#e8fbff]">{secret.label}</span>
                        {secret.present ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Configurato
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            <XCircle className="h-3 w-3 mr-1" />
                            Non configurato
                          </Badge>
                        )}
                        {secret.deprecated && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            DEPRECATED
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#e8fbff]/60 mb-2">{secret.notes}</p>
                      <code className="text-xs px-2 py-1 bg-[#1a2332] rounded text-[#14b8a6]">
                        {secret.envVar}
                      </code>
                    </div>
                    
                    {!secret.deprecated && (
                      <Button
                        variant={editingSecret === secret.envVar ? "secondary" : "outline"}
                        size="sm"
                        className="border-[#14b8a6]/30 text-[#14b8a6]"
                        onClick={() => {
                          if (editingSecret === secret.envVar) {
                            handleCancelEdit();
                          } else {
                            setEditingSecret(secret.envVar);
                            setSecretValues(prev => ({ ...prev, [secret.envVar]: '' }));
                            setShowValues(prev => ({ ...prev, [secret.envVar]: false }));
                          }
                        }}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {editingSecret === secret.envVar ? 'Annulla' : (secret.present ? 'Aggiorna' : 'Configura')}
                      </Button>
                    )}
                  </div>

                  {/* Form di inserimento */}
                  {editingSecret === secret.envVar && (
                    <div className="mt-4 pt-4 border-t border-[#14b8a6]/20">
                      <Label className="text-[#e8fbff]/70 mb-2 block">Inserisci il valore del secret</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={secretValues[secret.envVar] || ''}
                            onChange={(e) => setSecretValues(prev => ({ ...prev, [secret.envVar]: e.target.value }))}
                            placeholder={`Incolla qui il valore di ${secret.envVar}`}
                            className="font-mono text-sm bg-[#0a1628] border-[#14b8a6]/30 text-[#e8fbff] pr-10"
                            type={showValues[secret.envVar] ? 'text' : 'password'}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 right-1 h-8 w-8 p-0"
                            onClick={() => setShowValues(prev => ({ ...prev, [secret.envVar]: !prev[secret.envVar] }))}
                          >
                            {showValues[secret.envVar] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleSaveSecret(secret.envVar)}
                          disabled={saving || !(secretValues[secret.envVar] || '').trim()}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {saving ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Salva
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
