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
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { integrations, type IntegrationConfig } from '@/config/realEndpoints';

export default function ConnessioniV2() {
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

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
      // Testa connessione all'integrazione
      const response = await fetch(integration.baseUrl, {
        method: 'HEAD',
        mode: 'no-cors' // Evita problemi CORS per test semplice
      });
      
      toast.success(`Connessione a ${integration.name} verificata`);
    } catch (error: any) {
      toast.error(`Errore connessione a ${integration.name}: ${error.message}`);
    } finally {
      setTestingIntegration(null);
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
                    Endpoint Disponibili:
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
                    <Button
                      variant="outline"
                      className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Connesso
                    </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
              <h4 className="text-sm font-semibold text-[#14b8a6] mb-2">DMS Legacy</h4>
              <p className="text-xs text-[#e8fbff]/70">
                Master dei dati storici pre-2025. In fase di migrazione verso il nuovo sistema Core.
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
