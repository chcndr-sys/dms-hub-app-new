/**
 * API & Agent Tokens Page
 * 
 * Pagina per la gestione sicura di API key e token per gli agenti multi-agent.
 * Solo accessibile agli amministratori.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';

interface SecretMetadata {
  name: string;
  scope: string;
  last4: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TokenConfig {
  name: string;
  scope: string;
  label: string;
  description: string;
  placeholder: string;
}

const TOKEN_CONFIGS: TokenConfig[] = [
  {
    name: 'OPENAI_API_KEY',
    scope: 'llm',
    label: 'OpenAI API Key',
    description: 'Usata dagli agenti mio e dev per chiamate GPT-4',
    placeholder: 'sk-...',
  },
  {
    name: 'GEMINI_API_KEY',
    scope: 'llm',
    label: 'Gemini API Key',
    description: 'Usata dall\'agente gemini_arch per analisi architettura',
    placeholder: 'AIza...',
  },
  {
    name: 'GITHUB_PAT_DEV',
    scope: 'repo',
    label: 'GitHub Personal Access Token',
    description: 'Usata dall\'agente dev per accesso repository',
    placeholder: 'ghp_...',
  },
  {
    name: 'VERCEL_TOKEN',
    scope: 'deploy',
    label: 'Vercel Token',
    description: 'Usata per deploy automatici su Vercel',
    placeholder: 'vercel_...',
  },
  {
    name: 'TPER_API_KEY',
    scope: 'mobility',
    label: 'TPER API Key',
    description: 'Usata per integrazioni trasporto pubblico',
    placeholder: 'tper_...',
  },
  {
    name: 'HETZNER_SSH_KEY',
    scope: 'infra',
    label: 'Hetzner SSH – Backend Mercati/GIS',
    description: 'Chiave SSH per accesso server Hetzner (157.90.29.66) - root@157.90.29.66 - Path: /home/ubuntu/.ssh/hetzner_deploy_key - Fingerprint: SHA256:Gsnr7z2Zy+ehoj0dvlTFHiFntLRbeP267ZlZJs2nNDk',
    placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----',
  },
];

export default function APITokensPage() {
  const [secrets, setSecrets] = useState<Record<string, SecretMetadata>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carica metadata dei secret esistenti
  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/secrets`);
      const data = await response.json();

      if (data.success) {
        const secretsMap: Record<string, SecretMetadata> = {};
        data.secrets.forEach((secret: SecretMetadata) => {
          secretsMap[secret.name] = secret;
        });
        setSecrets(secretsMap);
      }
    } catch (error) {
      console.error('Error loading secrets:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei token' });
    } finally {
      setLoading(false);
    }
  };

  const saveSecret = async (config: TokenConfig) => {
    const value = values[config.name];
    if (!value || value.trim() === '') {
      setMessage({ type: 'error', text: `Inserisci un valore per ${config.label}` });
      return;
    }

    setSaving({ ...saving, [config.name]: true });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/secrets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: config.name,
          scope: config.scope,
          value: value,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSecrets({ ...secrets, [config.name]: data.secret });
        setValues({ ...values, [config.name]: '' }); // Clear input
        setMessage({ type: 'success', text: `${config.label} salvata con successo` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
      }
    } catch (error) {
      console.error('Error saving secret:', error);
      setMessage({ type: 'error', text: 'Errore nel salvataggio del token' });
    } finally {
      setSaving({ ...saving, [config.name]: false });
    }
  };

  const toggleShowValue = (name: string) => {
    setShowValues({ ...showValues, [name]: !showValues[name] });
  };

  const isConfigured = (name: string) => {
    return secrets[name] !== undefined;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API & Agent Tokens</h1>
        <p className="text-muted-foreground">
          Gestione sicura delle API key per il sistema multi-agente.
          I token sono cifrati con AES-256-GCM e non sono mai visibili in chiaro.
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {TOKEN_CONFIGS.map((config) => {
          const secret = secrets[config.name];
          const configured = isConfigured(config.name);

          return (
            <Card key={config.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {config.label}
                      {configured ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Configurato
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Non configurato
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{config.scope}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {configured && secret && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ultime 4 cifre:</span>
                      <span className="ml-2 font-mono">****{secret.last4}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Aggiornato:</span>
                      <span className="ml-2">{formatDate(secret.updated_at)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor={config.name}>
                    {configured ? 'Aggiorna token' : 'Inserisci token'}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={config.name}
                        type={showValues[config.name] ? 'text' : 'password'}
                        placeholder={config.placeholder}
                        value={values[config.name] || ''}
                        onChange={(e) => setValues({ ...values, [config.name]: e.target.value })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleShowValue(config.name)}
                      >
                        {showValues[config.name] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      onClick={() => saveSecret(config)}
                      disabled={saving[config.name] || !values[config.name]}
                    >
                      {saving[config.name] ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salva
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Il token verrà cifrato con AES-256-GCM prima di essere salvato nel database.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">⚠️ Note di Sicurezza</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• I token sono cifrati con AES-256-GCM usando una master key sul server</li>
          <li>• Solo le ultime 4 cifre sono visibili in chiaro</li>
          <li>• Gli agenti LLM NON possono accedere a questi endpoint</li>
          <li>• Ogni modifica viene loggata dal sistema Guardian</li>
          <li>• Non condividere mai i token in chat o in altri canali non sicuri</li>
        </ul>
      </div>
    </div>
  );
}
