import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plug,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
  Database,
  RefreshCw,
  Info,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { integrations, API_BASE_URL, type IntegrationConfig } from '@/config/realEndpoints';
import { authenticatedFetch } from '@/hooks/useImpersonation';

export default function ConnessioniV2() {
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [syncingIntegration, setSyncingIntegration] = useState<string | null>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<Record<string, { timestamp: string; status: string; details?: any }>>({});

  const getStatusBadge = (status: IntegrationConfig['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Attivo
          </Badge>
        );
      case 'in_preparation':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            In Preparazione
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Inattivo
          </Badge>
        );
    }
  };

  const handleHealthCheck = async (integration: IntegrationConfig) => {
    setTestingIntegration(integration.id);
    
    try {
      if (integration.id === 'dms-legacy') {
        // Per DMS Legacy, usa l'endpoint health dedicato
        const response = await fetch(`${API_BASE_URL}/api/integrations/dms-legacy/health`);
        const data = await response.json();
        if (data.success && data.data?.status === 'healthy') {
          toast.success(`DMS Legacy: Connessione OK - Auth ${data.data.auth?.responseTime}, API ${data.data.api?.responseTime}`);
        } else {
          toast.error(`DMS Legacy: ${data.data?.error || 'Non raggiungibile'}`);
        }
      } else if (integration.id === 'mercaweb') {
        // Per MercaWeb, usa l'endpoint health dedicato con API Key
        const response = await fetch(`${API_BASE_URL}/api/integrations/mercaweb/health`, {
          headers: { 'X-MercaWeb-API-Key': import.meta.env.VITE_MERCAWEB_API_KEY || '' }
        });
        const data = await response.json();
        if (data.success && data.data?.status === 'connected') {
          toast.success(`MercaWeb: Connessione OK - DB: ${data.data.database}`);
        } else {
          toast.error(`MercaWeb: ${data.error || 'Non raggiungibile'}`);
        }
      } else {
        // Per le altre integrazioni, test generico
        const response = await fetch(integration.baseUrl, {
          method: 'HEAD',
          mode: 'no-cors'
        });
        toast.success(`Connessione a ${integration.name} verificata`);
      }
    } catch (error: any) {
      toast.error(`Errore connessione a ${integration.name}: ${error.message}`);
    } finally {
      setTestingIntegration(null);
    }
  };

  const handleMercaWebStatus = async () => {
    setSyncingIntegration('mercaweb');
    try {
      const response = await fetch(`${API_BASE_URL}/api/integrations/mercaweb/status`, {
        headers: { 'X-MercaWeb-API-Key': import.meta.env.VITE_MERCAWEB_API_KEY || '' }
      });
      const data = await response.json();
      if (data.success) {
        const counts = data.data.recordCounts;
        setLastSyncInfo(prev => ({
          ...prev,
          'mercaweb': {
            timestamp: data.data.lastImport?.timestamp || new Date().toISOString(),
            status: data.data.lastImport?.status || 'ready',
            details: counts
          }
        }));
        const mktCount = counts?.markets?.with_mercaweb_id || 0;
        const impCount = counts?.imprese?.with_mercaweb_id || 0;
        const concCount = counts?.concessions?.with_mercaweb_id || 0;
        toast.success(
          `MercaWeb Status: Mercati MW: ${mktCount}, Imprese MW: ${impCount}, Concessioni MW: ${concCount}`
        );
      } else {
        toast.error(`Errore status MercaWeb: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Errore connessione MercaWeb: ${error.message}`);
    } finally {
      setSyncingIntegration(null);
    }
  };

  const handleSync = async (integration: IntegrationConfig) => {
    if (integration.id !== 'dms-legacy') return;
    
    setSyncingIntegration(integration.id);
    
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/integrations/dms-legacy/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        const syncData = data.data;
        setLastSyncInfo(prev => ({
          ...prev,
          'dms-legacy': {
            timestamp: syncData.timestamp,
            status: syncData.status,
            details: syncData.details
          }
        }));
        
        const marketCount = syncData.details?.markets?.count || 0;
        const vendorCount = syncData.details?.vendors?.count || 0;
        const concessionCount = syncData.details?.concessions?.count || 0;
        
        toast.success(
          `Sync DMS Legacy completata in ${syncData.duration} - Mercati: ${marketCount}, Ambulanti: ${vendorCount}, Concessioni: ${concessionCount}`
        );
      } else {
        toast.error(`Errore sync: ${data.error}`);
      }
    } catch (error: any) {
      toast.error(`Errore sync DMS Legacy: ${error.message}`);
    } finally {
      setSyncingIntegration(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-300 mb-1">
                Pannello Integrazioni Esterne
              </h3>
              <p className="text-xs text-blue-200/70">
                Questo pannello mostra tutte le integrazioni esterne del sistema DMS HUB. 
                Ogni integrazione ha un "Data Owner" che indica chi è il master dei dati per quella specifica area.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Integrazioni Totali</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{integrations.length}</p>
              </div>
              <Plug className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Attive</p>
                <p className="text-2xl font-bold text-green-400">
                  {integrations.filter(i => i.status === 'active').length}
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
                <p className="text-[#e8fbff]/60 text-sm">In Preparazione</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {integrations.filter(i => i.status === 'in_preparation').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Integrazioni */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    {integration.name}
                  </CardTitle>
                  <p className="text-sm text-[#e8fbff]/60 mt-1">{integration.description}</p>
                </div>
                {getStatusBadge(integration.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Base */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-[#14b8a6]" />
                  <span className="text-[#e8fbff]/70">URL Base:</span>
                </div>
                <code className="block bg-[#0a1628] border border-[#14b8a6]/20 rounded-md p-2 text-[#14b8a6] font-mono text-xs break-all">
                  {integration.baseUrl}
                </code>
              </div>

              {/* Data Owner */}
              <div className="flex items-start gap-2 text-sm">
                <Database className="h-4 w-4 text-[#14b8a6] mt-0.5" />
                <div>
                  <span className="text-[#e8fbff]/70">Data Owner:</span>
                  <span className="text-[#e8fbff] ml-2 font-semibold">{integration.dataOwner}</span>
                </div>
              </div>

              {/* Ultimo Status MercaWeb */}
              {integration.id === 'mercaweb' && lastSyncInfo['mercaweb'] && (
                <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                  <p className="text-xs text-green-300 font-semibold mb-1">Ultimo Status:</p>
                  <p className="text-xs text-green-200/70">
                    {lastSyncInfo['mercaweb'].timestamp ? new Date(lastSyncInfo['mercaweb'].timestamp).toLocaleString('it-IT') : 'N/D'} - 
                    Stato: {lastSyncInfo['mercaweb'].status}
                  </p>
                  {lastSyncInfo['mercaweb'].details && (
                    <div className="mt-1 flex gap-3 text-xs text-green-200/60">
                      <span>Mercati MW: {lastSyncInfo['mercaweb'].details.markets?.with_mercaweb_id || 0}</span>
                      <span>Imprese MW: {lastSyncInfo['mercaweb'].details.imprese?.with_mercaweb_id || 0}</span>
                      <span>Concessioni MW: {lastSyncInfo['mercaweb'].details.concessions?.with_mercaweb_id || 0}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Ultimo Sync (solo per DMS Legacy) */}
              {integration.id === 'dms-legacy' && lastSyncInfo['dms-legacy'] && (
                <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                  <p className="text-xs text-green-300 font-semibold mb-1">Ultimo Sync:</p>
                  <p className="text-xs text-green-200/70">
                    {new Date(lastSyncInfo['dms-legacy'].timestamp).toLocaleString('it-IT')} - 
                    Stato: {lastSyncInfo['dms-legacy'].status}
                  </p>
                  {lastSyncInfo['dms-legacy'].details && (
                    <div className="mt-1 flex gap-3 text-xs text-green-200/60">
                      <span>Mercati: {lastSyncInfo['dms-legacy'].details.markets?.count || 0}</span>
                      <span>Ambulanti: {lastSyncInfo['dms-legacy'].details.vendors?.count || 0}</span>
                      <span>Concessioni: {lastSyncInfo['dms-legacy'].details.concessions?.count || 0}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Note Tecniche */}
              <div className="bg-[#0a1628] p-3 rounded-lg border border-[#14b8a6]/20">
                <p className="text-xs text-[#e8fbff]/70 mb-1 font-semibold">Note Tecniche:</p>
                <p className="text-xs text-[#e8fbff]/60">{integration.notes}</p>
              </div>

              {/* Endpoint */}
              {integration.endpoints && integration.endpoints.length > 0 && (
                <div>
                  <p className="text-sm text-[#e8fbff]/70 mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4 text-[#14b8a6]" />
                    Endpoint Disponibili ({integration.endpoints.length}):
                  </p>
                  <div className="space-y-1">
                    {integration.endpoints.map((endpoint, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0a1628] px-3 py-2 rounded border border-[#14b8a6]/10"
                      >
                        <code className="text-xs text-[#14b8a6] font-mono">{endpoint}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Azioni */}
              <div className="flex gap-2 pt-2">
                {integration.status === 'active' ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                      onClick={() => handleHealthCheck(integration)}
                      disabled={testingIntegration === integration.id}
                    >
                      {testingIntegration === integration.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#14b8a6] mr-2"></div>
                          Test...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Health Check
                        </>
                      )}
                    </Button>
                    {integration.id === 'dms-legacy' ? (
                      <Button
                        variant="outline"
                        className="flex-1 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        onClick={() => handleSync(integration)}
                        disabled={syncingIntegration === integration.id}
                      >
                        {syncingIntegration === integration.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400 mr-2"></div>
                            Sync...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Sincronizza Ora
                          </>
                        )}
                      </Button>
                    ) : integration.id === 'mercaweb' ? (
                      <Button
                        variant="outline"
                        className="flex-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        onClick={() => handleMercaWebStatus()}
                        disabled={syncingIntegration === 'mercaweb'}
                      >
                        {syncingIntegration === 'mercaweb' ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400 mr-2"></div>
                            Caricamento...
                          </>
                        ) : (
                          <>
                            <Database className="h-4 w-4 mr-2" />
                            Stato Sync
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Connesso
                      </Button>
                    )}
                  </>
                ) : integration.status === 'in_preparation' ? (
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                    disabled
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    In Configurazione
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                    disabled
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Inattivo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Aggiuntiva */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] text-lg">
            Informazioni Data Ownership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
              <h4 className="text-sm font-semibold text-[#14b8a6] mb-2">DMS Legacy</h4>
              <p className="text-xs text-[#e8fbff]/70">
                Master dei dati mercati Bologna/Cervia e app di spunta. Integrazione attiva via API Proxy (Lapsy srl - Heroku).
              </p>
            </div>
            
            <div className="bg-[#0a1628] p-4 rounded-lg border border-purple-500/20">
              <h4 className="text-sm font-semibold text-purple-400 mb-2">MercaWeb — Abaco S.p.A.</h4>
              <p className="text-xs text-[#e8fbff]/70">
                Integrazione bidirezionale per anagrafiche e presenze. Usato dalla Polizia Municipale di Grosseto.
              </p>
            </div>
            
            <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
              <h4 className="text-sm font-semibold text-[#14b8a6] mb-2">Pepe GIS</h4>
              <p className="text-xs text-[#e8fbff]/70">
                Master delle geometrie e coordinate dei posteggi. File sorgente: editor-v3-full.json.
              </p>
            </div>
            
            <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
              <h4 className="text-sm font-semibold text-[#14b8a6] mb-2">TPER / Comune</h4>
              <p className="text-xs text-[#e8fbff]/70">
                Master dei dati mobilità (fermate, linee, orari). API esterne da integrare.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
