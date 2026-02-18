/**
 * Guardian Integrations Component
 * 
 * Componente per visualizzare l'inventario API completo del sistema DMS Hub.
 * Si collega all'endpoint Guardian per ottenere la lista dinamica di tutti gli endpoint disponibili.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Code,
  Play,
  FileJson,
  Activity,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Shield,
  Zap,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MIHUB_API_BASE_URL } from '@/config/api';

export default function GuardianIntegrations() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [requestParams, setRequestParams] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Query REST per ottenere l'inventario API da Guardian
  const { data: inventoryData, isLoading: isLoadingInventory, error: inventoryError } = useQuery({
    queryKey: ['guardian-integrations'],
    queryFn: async () => {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/guardian/integrations`);
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
    retry: 1,
  });

  // Mutation REST per testare un endpoint
  const testEndpointMutation = useMutation({
    mutationFn: async (params: { endpoint: string; method: string; params: any }) => {
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/guardian/debug/testEndpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const endpoints = inventoryData?.endpoints || [];
  const stats = inventoryData?.stats || null;

  // Filtra endpoint
  const filteredEndpoints = endpoints.filter((endpoint: any) => {
    const matchesCategory = filterCategory === 'all' || endpoint.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || endpoint.status === filterStatus;
    return matchesCategory && matchesStatus;
  });

  // Raggruppa endpoint per categoria
  const endpointsByCategory = filteredEndpoints.reduce((acc: any, endpoint: any) => {
    if (!acc[endpoint.category]) {
      acc[endpoint.category] = [];
    }
    acc[endpoint.category].push(endpoint);
    return acc;
  }, {});

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Attivo</Badge>;
      case 'beta': return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Beta</Badge>;
      case 'deprecated': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Deprecato</Badge>;
      case 'maintenance': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Manutenzione</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analytics': return <TrendingUp className="h-4 w-4" />;
      case 'integrations': return <Zap className="h-4 w-4" />;
      case 'mobility': return <Activity className="h-4 w-4" />;
      case 'logs': return <FileJson className="h-4 w-4" />;
      case 'system': return <Database className="h-4 w-4" />;
      case 'guardian': return <Shield className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return;
    
    setTestResult(null);
    setIsLoading(true);
    
    try {
      let params = {};
      if (requestParams) {
        try {
          params = JSON.parse(requestParams);
        } catch (e) {
          toast.error('Parametri non validi. Usa formato JSON.');
          setIsLoading(false);
          return;
        }
      }
      
      const result = await testEndpointMutation.mutateAsync({
        endpoint: selectedEndpoint.path,
        method: selectedEndpoint.method,
        params,
      });
      
      setTestResult(result);
      
      if (result.success) {
        toast.success('Test completato con successo!');
      } else {
        toast.error('Test fallito: ' + result.error);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
      });
      toast.error('Errore durante il test: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success('Path copiato negli appunti!');
  };

  if (inventoryError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-semibold mb-2">Errore nel caricamento dell'inventario API</p>
          <p className="text-[#e8fbff]/60 text-sm">{inventoryError.message}</p>
        </div>
      </div>
    );
  }

  if (isLoadingInventory) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin text-[#14b8a6] mx-auto mb-4" />
          <p className="text-[#e8fbff]/60">Caricamento inventario API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {/* Inventario Guardian - Endpoint documentati */}
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#e8fbff]/60 text-sm">Inventario</p>
                  <p className="text-2xl font-bold text-[#3b82f6]">{endpoints.length}</p>
                </div>
                <FileJson className="h-8 w-8 text-[#3b82f6]/50" />
              </div>
            </CardContent>
          </Card>
          
          {/* Endpoint Attivi - Dal backend Hetzner */}
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#e8fbff]/60 text-sm">Attivi Backend</p>
                  <p className="text-2xl font-bold text-[#10b981]">{stats.active || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-[#10b981]/50" />
              </div>
            </CardContent>
          </Card>
          
          {/* Totale Backend (attivi + backup) */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#e8fbff]/60 text-sm">Totale Backend</p>
                  <p className="text-2xl font-bold text-[#14b8a6]">{stats.total || 0}</p>
                </div>
                <Code className="h-8 w-8 text-[#14b8a6]/50" />
              </div>
            </CardContent>
          </Card>
          
          {/* Backup files */}
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#e8fbff]/60 text-sm">Backup</p>
                  <p className="text-2xl font-bold text-[#f59e0b]">{stats.backup || 0}</p>
                </div>
                <Database className="h-8 w-8 text-[#f59e0b]/50" />
              </div>
            </CardContent>
          </Card>
          
          {/* Con Auth */}
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#e8fbff]/60 text-sm">Con Auth</p>
                  <p className="text-2xl font-bold text-[#8b5cf6]">{stats.requiresAuth}</p>
                </div>
                <Shield className="h-8 w-8 text-[#8b5cf6]/50" />
              </div>
            </CardContent>
          </Card>
          
          {/* Categorie */}
          <Card className="bg-[#1a2332] border-[#06b6d4]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#e8fbff]/60 text-sm">Categorie</p>
                  <p className="text-2xl font-bold text-[#06b6d4]">{Object.keys(stats.byCategory).length}</p>
                </div>
                <Code className="h-8 w-8 text-[#06b6d4]/50" />
              </div>
            </CardContent>
          </Card>
          
          {/* TOTALE GENERALE - Inventario + Attivi Backend */}
          <Card className="bg-gradient-to-r from-[#1a2332] to-[#0f1419] border-[#ec4899]/50 col-span-full md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#e8fbff]/60 text-sm">TOTALE GENERALE</p>
                  <p className="text-3xl font-bold text-[#ec4899]">{endpoints.length + (stats.active || 0)}</p>
                  <p className="text-[#e8fbff]/40 text-xs mt-1">Inventario + Attivi</p>
                </div>
                <Zap className="h-10 w-10 text-[#ec4899]/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtri */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#14b8a6]" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#e8fbff]/70">Categoria</Label>
              <select
                className="w-full mt-1 bg-[#0a1628] border border-[#14b8a6]/30 rounded-lg px-3 py-2 text-[#e8fbff]"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Tutte le categorie</option>
                {stats && Object.keys(stats.byCategory).map(category => (
                  <option key={category} value={category}>{category} ({stats.byCategory[category]})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[#e8fbff]/70">Stato</Label>
              <select
                className="w-full mt-1 bg-[#0a1628] border border-[#14b8a6]/30 rounded-lg px-3 py-2 text-[#e8fbff]"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tutti gli stati</option>
                <option value="active">Attivo</option>
                <option value="beta">Beta</option>
                <option value="deprecated">Deprecato</option>
                <option value="maintenance">Manutenzione</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista endpoint per categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonna sinistra: Lista endpoint */}
        <div className="space-y-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Code className="h-5 w-5 text-[#14b8a6]" />
                Endpoint Disponibili ({filteredEndpoints.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.entries(endpointsByCategory).map(([category, categoryEndpoints]: [string, any]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(category)}
                      <h3 className="text-[#14b8a6] font-semibold uppercase text-sm">{category}</h3>
                      <Badge className="bg-[#14b8a6]/20 text-[#14b8a6]">{categoryEndpoints.length}</Badge>
                    </div>
                    <div className="space-y-2 ml-6">
                      {categoryEndpoints.map((endpoint: any) => (
                        <div
                          key={endpoint.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedEndpoint?.id === endpoint.id
                              ? 'bg-[#14b8a6]/20 border-[#14b8a6]'
                              : 'bg-[#0a1628] border-[#14b8a6]/20 hover:border-[#14b8a6]/50'
                          }`}
                          onClick={() => setSelectedEndpoint(endpoint)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={getMethodColor(endpoint.method)}>{endpoint.method}</Badge>
                            {getStatusBadge(endpoint.status)}
                          </div>
                          <p className="text-[#e8fbff] text-sm font-mono">{endpoint.path}</p>
                          <p className="text-[#e8fbff]/60 text-xs mt-1">{endpoint.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonna destra: Dettagli e test */}
        <div className="space-y-4">
          {selectedEndpoint ? (
            <>
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-[#14b8a6]" />
                    Dettagli Endpoint
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-[#e8fbff]/70">ID</Label>
                    <p className="text-[#e8fbff] font-mono text-sm">{selectedEndpoint.id}</p>
                  </div>
                  <div>
                    <Label className="text-[#e8fbff]/70">Path</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-[#e8fbff] font-mono text-sm flex-1">{selectedEndpoint.path}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#14b8a6]/30"
                        onClick={() => handleCopyPath(selectedEndpoint.path)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[#e8fbff]/70">Descrizione</Label>
                    <p className="text-[#e8fbff]/80 text-sm">{selectedEndpoint.description}</p>
                  </div>
                  {selectedEndpoint.documentation && (
                    <div>
                      <Label className="text-[#e8fbff]/70">Documentazione</Label>
                      <p className="text-[#e8fbff]/80 text-sm">{selectedEndpoint.documentation}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#e8fbff]/70">Versione</Label>
                      <p className="text-[#e8fbff]">{selectedEndpoint.version}</p>
                    </div>
                    <div>
                      <Label className="text-[#e8fbff]/70">Autenticazione</Label>
                      <p className="text-[#e8fbff]">{selectedEndpoint.requiresAuth ? 'Richiesta' : 'Non richiesta'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Play className="h-5 w-5 text-[#14b8a6]" />
                    Test Endpoint
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-[#e8fbff]/70">Parametri (JSON)</Label>
                    <textarea
                      className="w-full mt-1 bg-[#0a1628] border border-[#14b8a6]/30 rounded-lg px-3 py-2 text-[#e8fbff] font-mono text-sm"
                      rows={4}
                      placeholder='{"param1": "value1"}'
                      value={requestParams}
                      onChange={(e) => setRequestParams(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleTestEndpoint}
                    disabled={isLoading}
                    className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80"
                  >
                    {isLoading ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Test in corso...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Esegui Test
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {testResult && (
                <Card className={`border-2 ${testResult.success ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      Risultato Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-[#0a1628] p-4 rounded-lg text-[#e8fbff] text-xs overflow-x-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardContent className="py-12 text-center">
                <Code className="h-12 w-12 text-[#14b8a6]/50 mx-auto mb-4" />
                <p className="text-[#e8fbff]/60">Seleziona un endpoint per vedere i dettagli e testarlo</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
