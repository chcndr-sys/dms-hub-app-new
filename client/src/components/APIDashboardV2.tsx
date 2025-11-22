import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Code,
  Play,
  FileJson,
  Activity,
  Copy,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { allRealEndpoints, API_BASE_URL, type EndpointConfig } from '@/config/realEndpoints';

export default function APIDashboardV2() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointConfig | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [requestBody, setRequestBody] = useState<string>('');
  const [requestParams, setRequestParams] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Raggruppa endpoint per categoria
  const endpointsByCategory = allRealEndpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.category]) {
      acc[endpoint.category] = [];
    }
    acc[endpoint.category].push(endpoint);
    return acc;
  }, {} as Record<string, EndpointConfig[]>);

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

  const handleTestEndpoint = async () => {
    if (!selectedEndpoint) return;
    
    setTestResult(null);
    setIsLoading(true);
    
    const startTime = Date.now();
    
    try {
      // Costruisci URL con parametri
      let url = `${API_BASE_URL}${selectedEndpoint.path}`;
      
      // Sostituisci parametri path (es. :id)
      if (requestParams) {
        try {
          const params = JSON.parse(requestParams);
          Object.entries(params).forEach(([key, value]) => {
            url = url.replace(`:${key}`, String(value));
          });
        } catch (e) {
          toast.error('Parametri non validi. Usa formato JSON: {"id": 1}');
          setIsLoading(false);
          return;
        }
      }
      
      // Prepara opzioni fetch
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      // Aggiungi body se necessario
      if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && requestBody) {
        try {
          JSON.parse(requestBody); // Valida JSON
          options.body = requestBody;
        } catch (e) {
          toast.error('Request Body non è un JSON valido');
          setIsLoading(false);
          return;
        }
      }
      
      // Esegui richiesta
      const response = await fetch(url, options);
      const data = await response.json();
      const endTime = Date.now();
      
      setTestResult({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        responseTime: endTime - startTime,
        url
      });
      
      if (response.ok) {
        toast.success(`Richiesta completata in ${endTime - startTime}ms`);
      } else {
        toast.error(`Errore ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      const endTime = Date.now();
      setTestResult({
        success: false,
        status: 0,
        statusText: 'Network Error',
        error: error.message,
        responseTime: endTime - startTime
      });
      toast.error('Errore di rete: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyExample = (type: 'params' | 'body') => {
    if (!selectedEndpoint) return;
    
    const example = type === 'params' 
      ? selectedEndpoint.exampleParams 
      : selectedEndpoint.exampleBody;
    
    if (example) {
      const jsonString = JSON.stringify(example, null, 2);
      if (type === 'params') {
        setRequestParams(jsonString);
      } else {
        setRequestBody(jsonString);
      }
      toast.success('Esempio copiato!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Endpoint Totali</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{allRealEndpoints.length}</p>
              </div>
              <Code className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Categorie</p>
                <p className="text-2xl font-bold text-[#14b8a6]">{Object.keys(endpointsByCategory).length}</p>
              </div>
              <FileJson className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Base URL</p>
                <p className="text-sm font-mono text-[#14b8a6] truncate">{API_BASE_URL.replace('https://', '')}</p>
              </div>
              <Activity className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e8fbff]/60 text-sm">Stato Backend</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-semibold text-green-400">Online</p>
                </div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista Endpoint */}
        <Card className="lg:col-span-1 bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Code className="h-5 w-5 text-[#14b8a6]" />
              Endpoint Disponibili
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-4">
            {Object.entries(endpointsByCategory).map(([category, endpoints]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-[#14b8a6] mb-2 uppercase tracking-wide">
                  {category}
                </h3>
                <div className="space-y-2">
                  {endpoints.map((endpoint) => (
                    <button
                      key={endpoint.id}
                      onClick={() => {
                        setSelectedEndpoint(endpoint);
                        setRequestBody(endpoint.exampleBody ? JSON.stringify(endpoint.exampleBody, null, 2) : '');
                        setRequestParams(endpoint.exampleParams ? JSON.stringify(endpoint.exampleParams, null, 2) : '');
                        setTestResult(null);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedEndpoint?.id === endpoint.id
                          ? 'bg-[#14b8a6]/20 border-[#14b8a6]'
                          : 'bg-[#0a1628] border-[#14b8a6]/20 hover:border-[#14b8a6]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </Badge>
                        <span className="text-xs font-mono text-[#e8fbff]/70 truncate">
                          {endpoint.path}
                        </span>
                      </div>
                      <p className="text-sm text-[#e8fbff]">{endpoint.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pannello Test */}
        <Card className="lg:col-span-2 bg-[#1a2332] border-[#14b8a6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Play className="h-5 w-5 text-[#14b8a6]" />
              Test Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEndpoint ? (
              <div className="space-y-4">
                {/* Info Endpoint */}
                <div className="bg-[#0a1628] p-4 rounded-lg border border-[#14b8a6]/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getMethodColor(selectedEndpoint.method)}>
                        {selectedEndpoint.method}
                      </Badge>
                      <code className="text-sm text-[#14b8a6]">{selectedEndpoint.path}</code>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-[#e8fbff] mb-1">{selectedEndpoint.name}</h3>
                  <p className="text-sm text-[#e8fbff]/70">{selectedEndpoint.description}</p>
                  {selectedEndpoint.notes && (
                    <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
                      💡 {selectedEndpoint.notes}
                    </div>
                  )}
                </div>

                {/* Request Params */}
                {selectedEndpoint.path.includes(':') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[#e8fbff]/70">Path Parameters</Label>
                      {selectedEndpoint.exampleParams && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyExample('params')}
                          className="text-xs text-[#14b8a6] hover:text-[#14b8a6]/80"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Usa esempio
                        </Button>
                      )}
                    </div>
                    <textarea
                      value={requestParams}
                      onChange={(e) => setRequestParams(e.target.value)}
                      placeholder='{"id": 1}'
                      className="w-full h-20 bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-3 text-[#e8fbff] font-mono text-sm resize-none"
                    />
                  </div>
                )}

                {/* Request Body */}
                {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[#e8fbff]/70">Request Body (JSON)</Label>
                      {selectedEndpoint.exampleBody && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyExample('body')}
                          className="text-xs text-[#14b8a6] hover:text-[#14b8a6]/80"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Usa esempio
                        </Button>
                      )}
                    </div>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      placeholder="{}"
                      className="w-full h-32 bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-3 text-[#e8fbff] font-mono text-sm resize-none"
                    />
                  </div>
                )}

                {/* Pulsante Test */}
                <Button
                  onClick={handleTestEndpoint}
                  disabled={isLoading}
                  className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Esecuzione...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Esegui Richiesta
                    </>
                  )}
                </Button>

                {/* Risultato */}
                {testResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                        <Badge className={testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {testResult.status} {testResult.statusText}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#e8fbff]/70">
                        <Clock className="h-4 w-4" />
                        {testResult.responseTime}ms
                      </div>
                    </div>
                    
                    {testResult.url && (
                      <div>
                        <Label className="text-[#e8fbff]/70">URL Chiamato</Label>
                        <code className="block bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-2 text-[#14b8a6] font-mono text-xs break-all">
                          {testResult.url}
                        </code>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-[#e8fbff]/70">Response</Label>
                      <pre className="bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-3 text-[#e8fbff] font-mono text-xs overflow-auto max-h-96">
                        {JSON.stringify(testResult.data || testResult.error, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Example Response */}
                {selectedEndpoint.exampleResponse && !testResult && (
                  <div>
                    <Label className="text-[#e8fbff]/70">Example Response</Label>
                    <pre className="bg-[#0a1628] border border-[#14b8a6]/30 rounded-md p-3 text-[#e8fbff]/60 font-mono text-xs overflow-auto max-h-64">
                      {JSON.stringify(selectedEndpoint.exampleResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Code className="h-16 w-16 text-[#14b8a6]/50 mx-auto mb-4" />
                <p className="text-[#e8fbff]/70">Seleziona un endpoint dalla lista per testarlo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
