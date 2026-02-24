/**
 * API & Agent Tokens Page
 * 
 * Pagina per la gestione sicura di API key e token per gli agenti multi-agent.
 * Solo accessibile agli amministratori.
 * 
 * SICUREZZA:
 * - I token sono cifrati con AES-256-GCM sul backend
 * - Nessun token è mai salvato in localStorage/sessionStorage
 * - Nessun token è mai loggato in console
 * - I form input vengono svuotati immediatamente dopo il salvataggio
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Key, Database, Github, Cloud, Zap, Building2, Server, Save, Eye, EyeOff } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useImpersonation';

// API_BASE_URL rimosso - usa path relativi per sfruttare il rewrite Vercel

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

interface SecretsMetaResponse {
  success: boolean;
  count: number;
  secrets: SecretMeta[];
}

const CATEGORY_ICONS: Record<string, any> = {
  'LLM': Zap,
  'GitHub': Github,
  'Database': Database,
  'Backend': Server,
  'Infra': Server,
  'PA': Building2,
  'Deploy': Cloud,
  'Mobility': Cloud,
};

const CATEGORY_COLORS: Record<string, string> = {
  'LLM': 'text-purple-500',
  'GitHub': 'text-gray-700',
  'Database': 'text-blue-500',
  'Backend': 'text-green-500',
  'Infra': 'text-orange-500',
  'PA': 'text-indigo-500',
  'Deploy': 'text-cyan-500',
  'Mobility': 'text-teal-500',
};

export default function APITokensPage() {
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
      
      const data: SecretsMetaResponse = await response.json();
      
      if (data.success) {
        // Mappa envvar → envVar per compatibilità backend
        const mappedSecrets = data.secrets.map(secret => ({
          ...secret,
          envVar: (secret as any).envvar || secret.envVar
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
      alert('Il valore del secret non può essere vuoto');
      return;
    }

    setSaving(true);
    
    try {
      const response = await authenticatedFetch(`/admin/secrets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: envVar,
          scope: 'global',
          value: value,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Svuota immediatamente il campo input
        setSecretValues(prev => ({ ...prev, [envVar]: '' }));
        setEditingSecret(null);
        setShowValues(prev => ({ ...prev, [envVar]: false }));
        
        // Ricarica i metadata per aggiornare lo stato
        await loadSecretsMetadata();
        
        alert(`✅ Secret ${envVar} salvato con successo!`);
      } else {
        throw new Error(data.error || 'Failed to save secret');
      }
    } catch (err) {
      console.error(`Error saving secret ${envVar}:`, err);
      alert(`❌ Errore nel salvataggio: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Svuota il campo e chiudi il form
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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Caricamento metadata secrets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API & Agent Tokens</h1>
        <p className="text-muted-foreground">
          Gestione sicura delle API key per il sistema multi-agente. I token sono cifrati con AES-256-GCM e non sono mai visibili in chiaro.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Errore nel caricamento dei metadata: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totale Secrets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Configurati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mancanti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.missing}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deprecati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.deprecated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Secrets by Category */}
      {Object.entries(groupedSecrets).map(([category, categorySecrets]) => {
        const Icon = CATEGORY_ICONS[category] || Key;
        const colorClass = CATEGORY_COLORS[category] || 'text-gray-500';
        
        return (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon className={`h-5 w-5 ${colorClass}`} />
              <h2 className="text-xl font-semibold">{category}</h2>
              <Badge variant="secondary">{categorySecrets.length}</Badge>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {categorySecrets.map((secret) => (
                <Card key={secret.id} className={secret.deprecated ? 'opacity-60 border-red-200' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{secret.label}</CardTitle>
                          {secret.present ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Configurato
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Non configurato
                            </Badge>
                          )}
                          {secret.deprecated && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              DEPRECATED
                            </Badge>
                          )}
                          <Badge variant="outline">{secret.category}</Badge>
                        </div>
                        <CardDescription className="mt-2">{secret.notes}</CardDescription>
                      </div>
                      
                      {!secret.deprecated && (
                        <Button
                          variant={editingSecret === secret.envVar ? "secondary" : "outline"}
                          size="sm"
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
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">Variabile d'ambiente</div>
                        <code className="px-2 py-1 bg-muted rounded text-xs">{secret.envVar}</code>
                      </div>
                      
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">Ambiente</div>
                        <Badge variant={secret.env === 'prod' ? 'default' : 'secondary'}>
                          {secret.env}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">Ultimo aggiornamento</div>
                        <div className="text-muted-foreground">
                          {secret.lastUpdated 
                            ? new Date(secret.lastUpdated).toLocaleString('it-IT') 
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Form di inserimento/aggiornamento secret */}
                    {editingSecret === secret.envVar && (
                      <div className="border-t pt-4 mt-4">
                        <Label htmlFor={`secret-${secret.envVar}`} className="mb-2 block">
                          Inserisci il valore del secret
                        </Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={`secret-${secret.envVar}`}
                              value={secretValues[secret.envVar] || ''}
                              onChange={(e) => setSecretValues(prev => ({ ...prev, [secret.envVar]: e.target.value }))}
                              placeholder={`Incolla qui il valore di ${secret.envVar}`}
                              className="font-mono text-sm"
                              type={showValues[secret.envVar] ? 'text' : 'password'}
                              autoComplete="off"
                              spellCheck={false}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
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
                        <p className="text-xs text-muted-foreground mt-2">
                          ⚠️ Il valore verrà cifrato con AES-256-GCM e salvato nel database. Non sarà mai più visibile in chiaro.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Security Notes */}
      <Alert className="mt-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>⚠️ Note di Sicurezza</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>I token sono cifrati con AES-256-GCM usando una master key sul server</li>
            <li>Solo le ultime 4 cifre sono visibili in chiaro</li>
            <li>Gli agenti LLM NON possono accedere a questi endpoint</li>
            <li>Ogni modifica viene loggata dal sistema Guardian</li>
            <li>Non condividere mai i token in chat o in altri canali non sicuri</li>
            <li>I token non sono mai salvati in localStorage, sessionStorage o cookie</li>
            <li>I form input vengono svuotati immediatamente dopo il salvataggio</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
