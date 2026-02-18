/**
 * PiattaformePA — Pannello unificato PDND, App IO, ANPR, SSO
 *
 * Sostituisce il vecchio tab "Impostazioni" nella Dashboard PA.
 * Gestisce la configurazione e il monitoraggio delle piattaforme nazionali.
 *
 * NOTA: I router tRPC pdnd/appIo/piattaforme sono stati rimossi.
 * I dati sono mock/simulati fino alla futura integrazione con le piattaforme reali.
 */

import React, { useState } from 'react';
import {
  Globe, Server, Shield, Smartphone, FileSearch, UserCheck,
  CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw,
  Send, Search, Activity, Clock, ChevronRight, Database,
  Key, Lock, Wifi, WifiOff, Play, Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from '@tanstack/react-query';

// ============================================
// Mock Data — Le piattaforme nazionali non sono ancora integrate.
// Questi dati simulano le risposte che arriveranno da PDND, App IO, ANPR, SSO.
// ============================================

const MOCK_PDND_STATUS = {
  connected: true,
  mode: 'mock' as const,
  hasPurposeId: true,
  hasPrivateKey: false,
};

const MOCK_ESERVICES = [
  { id: 'dms-mercati', name: 'API Mercati', description: 'Dati mercati ambulanti', version: '1.0', technology: 'REST', status: 'published' },
  { id: 'dms-concessioni', name: 'API Concessioni', description: 'Gestione concessioni posteggi', version: '1.0', technology: 'REST', status: 'draft' },
  { id: 'dms-operatori', name: 'API Operatori', description: 'Anagrafica operatori commercio', version: '1.0', technology: 'REST', status: 'draft' },
];

const MOCK_APPIO_STATUS = {
  connected: true,
  mode: 'mock' as const,
  hasApiKey: true,
  templatesCount: 3,
};

const MOCK_TEMPLATES = [
  { id: 'scadenza_concessione', name: 'Scadenza Concessione', subject: 'La tua concessione sta per scadere', requiredParams: ['nome', 'data_scadenza', 'mercato'] },
  { id: 'pagamento_canone', name: 'Avviso Pagamento', subject: 'Nuovo avviso di pagamento', requiredParams: ['importo', 'scadenza'] },
  { id: 'comunicazione_mercato', name: 'Comunicazione Mercato', subject: 'Comunicazione importante', requiredParams: ['messaggio', 'mercato'] },
];

const MOCK_SSO_STATUS = {
  mockMode: true,
  providers: [
    { provider: 'spid', isActive: true, isConfigured: true },
    { provider: 'cie', isActive: true, isConfigured: true },
    { provider: 'cns', isActive: false, isConfigured: false },
    { provider: 'eidas', isActive: false, isConfigured: false },
  ],
};

const MOCK_SSO_PROVIDERS = [
  { provider: 'spid', name: 'SPID — Sistema Pubblico Identita\' Digitale', spidLevel: 2, isActive: true, isConfigured: true, environment: 'test', ssoUrl: 'https://idp.spid.gov.it' },
  { provider: 'cie', name: 'CIE — Carta d\'Identita\' Elettronica', spidLevel: 3, isActive: true, isConfigured: true, environment: 'test', ssoUrl: 'https://idserver.servizicie.interno.gov.it' },
  { provider: 'cns', name: 'CNS — Carta Nazionale dei Servizi', spidLevel: null, isActive: false, isConfigured: false, environment: 'test', ssoUrl: '' },
  { provider: 'eidas', name: 'eIDAS — European Identity', spidLevel: null, isActive: false, isConfigured: false, environment: 'test', ssoUrl: '' },
];

const MOCK_CF_DB: Record<string, { nome: string; cognome: string; dataNascita: string; comuneNascita: string; indirizzo: string; civico: string; cap: string; comune: string; provincia: string }> = {
  'RSSMRA85M01H501Z': { nome: 'Mario', cognome: 'Rossi', dataNascita: '01/08/1985', comuneNascita: 'Roma', indirizzo: 'Via Roma', civico: '10', cap: '00100', comune: 'Roma', provincia: 'RM' },
  'VRDLGI90A41F205X': { nome: 'Luigia', cognome: 'Verdi', dataNascita: '01/01/1990', comuneNascita: 'Milano', indirizzo: 'Via Milano', civico: '5', cap: '20100', comune: 'Milano', provincia: 'MI' },
  'BNCGPP75D15L219Y': { nome: 'Giuseppe', cognome: 'Bianchi', dataNascita: '15/04/1975', comuneNascita: 'Torino', indirizzo: 'Corso Torino', civico: '22', cap: '10100', comune: 'Torino', provincia: 'TO' },
};

const MOCK_AUDIT_ITEMS = [
  { id: 1, platform: 'pdnd', action: 'getStatus', status: 'success', user_email: 'admin@dmshub.it', created_at: new Date(Date.now() - 3600000).toISOString(), duration_ms: 120 },
  { id: 2, platform: 'appio', action: 'checkProfile', status: 'success', user_email: 'admin@dmshub.it', created_at: new Date(Date.now() - 7200000).toISOString(), duration_ms: 230 },
  { id: 3, platform: 'anpr', action: 'verificaCF', status: 'success', user_email: 'operatore@comune.grosseto.it', created_at: new Date(Date.now() - 10800000).toISOString(), duration_ms: 450 },
  { id: 4, platform: 'sso', action: 'testProvider (SPID)', status: 'success', user_email: 'admin@dmshub.it', created_at: new Date(Date.now() - 86400000).toISOString(), duration_ms: 180 },
  { id: 5, platform: 'pdnd', action: 'listEServices', status: 'error', user_email: 'admin@dmshub.it', created_at: new Date(Date.now() - 172800000).toISOString(), duration_ms: 5000 },
];

// ============================================
// Sub-componente: PDND Panel
// ============================================
function PdndPanel() {
  const statusQuery = useQuery({
    queryKey: ['pdnd-status'],
    queryFn: async () => MOCK_PDND_STATUS,
  });
  const eservicesQuery = useQuery({
    queryKey: ['pdnd-eservices'],
    queryFn: async () => MOCK_ESERVICES,
  });
  const testMutation = useMutation({
    mutationFn: async () => {
      await new Promise((r) => setTimeout(r, 800));
      return { success: true, responseTimeMs: 120 };
    },
  });
  const publishMutation = useMutation({
    mutationFn: async (_params: { serviceId: string; metadata: { name: string; description: string; technology: string; version: string } }) => {
      await new Promise((r) => setTimeout(r, 1000));
      return { success: true };
    },
  });

  const status = statusQuery.data;
  const eservices = eservicesQuery.data;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Server className="h-5 w-5 text-[#3b82f6]" />
            Stato Connessione PDND
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#3b82f6]/20">
              <div className="flex items-center gap-2 mb-1">
                {status?.connected ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <span className="text-xs text-[#e8fbff]/60">Connessione</span>
              </div>
              <p className="text-sm font-semibold text-[#e8fbff]">
                {status?.connected ? 'Attiva' : 'Non connesso'}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#3b82f6]/20">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-xs text-[#e8fbff]/60">Modalita'</span>
              </div>
              <p className="text-sm font-semibold text-[#e8fbff]">
                {status?.mode === 'mock' ? (
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30">Mock</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Live</Badge>
                )}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#3b82f6]/20">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-xs text-[#e8fbff]/60">Purpose ID</span>
              </div>
              <p className="text-sm font-semibold text-[#e8fbff]">
                {status?.hasPurposeId ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400 inline" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 inline" />
                )}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#3b82f6]/20">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-xs text-[#e8fbff]/60">Chiave RSA</span>
              </div>
              <p className="text-sm font-semibold text-[#e8fbff]">
                {status?.hasPrivateKey ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400 inline" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 inline" />
                )}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${testMutation.isPending ? 'animate-spin' : ''}`} />
              Test Connessione
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* e-Service Catalog */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-[#3b82f6]" />
            Catalogo e-Service
          </CardTitle>
          <CardDescription className="text-[#e8fbff]/50">
            Servizi esposti su PDND per l'interoperabilita' con altre PA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eservices?.map((service) => (
              <div
                key={service.id}
                className="p-4 bg-[#0f1729] border border-[#3b82f6]/20 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[#e8fbff] font-medium text-sm">{service.name}</h4>
                    <p className="text-[#e8fbff]/50 text-xs mt-1">{service.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs text-[#e8fbff]/60 border-[#e8fbff]/20">
                        v{service.version}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-[#e8fbff]/60 border-[#e8fbff]/20">
                        {service.technology}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {service.status === 'published' ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Pubblicato
                      </Badge>
                    ) : service.status === 'draft' ? (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-400/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Bozza
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-400/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        {service.status}
                      </Badge>
                    )}
                    {service.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
                        onClick={() =>
                          publishMutation.mutate({
                            serviceId: service.id,
                            metadata: {
                              name: service.name,
                              description: service.description,
                              technology: service.technology,
                              version: service.version,
                            },
                          })
                        }
                        disabled={publishMutation.isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Pubblica
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!eservices?.length && !eservicesQuery.isLoading && (
              <p className="text-[#e8fbff]/40 text-sm text-center py-4">
                Nessun e-Service configurato
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Sub-componente: App IO Panel
// ============================================
function AppIoPanel() {
  const statusQuery = useQuery({
    queryKey: ['appio-status'],
    queryFn: async () => MOCK_APPIO_STATUS,
  });
  const templatesQuery = useQuery({
    queryKey: ['appio-templates'],
    queryFn: async () => MOCK_TEMPLATES,
  });
  const [cfInput, setCfInput] = useState('');
  const checkProfileQuery = useQuery({
    queryKey: ['appio-check-profile', cfInput],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return { senderAllowed: !!MOCK_CF_DB[cfInput] };
    },
    enabled: cfInput.length === 16,
  });

  const status = statusQuery.data;

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card className="bg-[#1a2332] border-[#10b981]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5 text-[#10b981]" />
            Stato Connessione App IO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#10b981]/20">
              <span className="text-xs text-[#e8fbff]/60">Connessione</span>
              <p className="text-sm font-semibold text-[#e8fbff] mt-1">
                {status?.connected ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="h-4 w-4 text-emerald-400" /> Attiva
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-4 w-4 text-red-400" /> Non connesso
                  </span>
                )}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#10b981]/20">
              <span className="text-xs text-[#e8fbff]/60">Modalita'</span>
              <p className="text-sm font-semibold text-[#e8fbff] mt-1">
                {status?.mode === 'mock' ? (
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30">Mock</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Live</Badge>
                )}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#10b981]/20">
              <span className="text-xs text-[#e8fbff]/60">API Key</span>
              <p className="text-sm font-semibold text-[#e8fbff] mt-1">
                {status?.hasApiKey ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400 inline" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 inline" />
                )}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#10b981]/20">
              <span className="text-xs text-[#e8fbff]/60">Template</span>
              <p className="text-sm font-semibold text-[#e8fbff] mt-1">
                {status?.templatesCount ?? 0} disponibili
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template */}
      <Card className="bg-[#1a2332] border-[#10b981]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Send className="h-5 w-5 text-[#10b981]" />
            Template Notifiche
          </CardTitle>
          <CardDescription className="text-[#e8fbff]/50">
            Template predefiniti per notifiche ai cittadini tramite App IO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templatesQuery.data?.map((template) => (
              <div
                key={template.id}
                className="p-3 bg-[#0f1729] border border-[#10b981]/20 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[#e8fbff] font-medium text-sm">{template.name}</h4>
                    <p className="text-[#e8fbff]/50 text-xs mt-1">
                      Oggetto: {template.subject}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {template.requiredParams.map((param) => (
                        <Badge key={param} variant="outline" className="text-xs text-[#e8fbff]/40 border-[#e8fbff]/10">
                          {'{' + param + '}'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                    {template.id}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Verifica Profilo */}
      <Card className="bg-[#1a2332] border-[#10b981]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Search className="h-5 w-5 text-[#10b981]" />
            Verifica Profilo Cittadino
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Codice Fiscale (16 caratteri)"
              value={cfInput}
              onChange={(e) => setCfInput(e.target.value.toUpperCase())}
              maxLength={16}
              className="flex-1 px-3 py-2 bg-[#0f1729] border border-[#10b981]/30 rounded-lg text-[#e8fbff] text-sm placeholder:text-[#e8fbff]/30 focus:outline-none focus:ring-1 focus:ring-[#10b981]"
            />
          </div>
          {cfInput.length === 16 && checkProfileQuery.data && (
            <div className="mt-3 p-3 bg-[#0f1729] border border-[#10b981]/20 rounded-lg">
              <div className="flex items-center gap-2">
                {checkProfileQuery.data.senderAllowed ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">
                      App IO attiva per {cfInput}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-400" />
                    <span className="text-red-400 text-sm font-medium">
                      App IO non attiva per {cfInput}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Sub-componente: ANPR Panel
// ============================================
function AnprPanel() {
  const [cfInput, setCfInput] = useState('');
  const [searchType, setSearchType] = useState<'cf' | 'residenza'>('cf');

  const cfQuery = useQuery({
    queryKey: ['anpr-verifica-cf', cfInput],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      const person = MOCK_CF_DB[cfInput];
      if (!person) return { found: false };
      return { found: true, nome: person.nome, cognome: person.cognome, dataNascita: person.dataNascita, comuneNascita: person.comuneNascita };
    },
    enabled: cfInput.length === 16 && searchType === 'cf',
  });

  const residenzaQuery = useQuery({
    queryKey: ['anpr-verifica-residenza', cfInput],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      const person = MOCK_CF_DB[cfInput];
      if (!person) return { found: false };
      return { found: true, indirizzo: person.indirizzo, civico: person.civico, cap: person.cap, comune: person.comune, provincia: person.provincia };
    },
    enabled: cfInput.length === 16 && searchType === 'residenza',
  });

  return (
    <div className="space-y-4">
      <Card className="bg-[#1a2332] border-[#f59e0b]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <FileSearch className="h-5 w-5 text-[#f59e0b]" />
            ANPR — Anagrafe Nazionale Popolazione Residente
          </CardTitle>
          <CardDescription className="text-[#e8fbff]/50">
            Interrogazioni ANPR via PDND per verifica codice fiscale e residenza
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Codice Fiscale (16 caratteri)"
              value={cfInput}
              onChange={(e) => setCfInput(e.target.value.toUpperCase())}
              maxLength={16}
              className="flex-1 px-3 py-2 bg-[#0f1729] border border-[#f59e0b]/30 rounded-lg text-[#e8fbff] text-sm placeholder:text-[#e8fbff]/30 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
            />
            <Button
              size="sm"
              variant="outline"
              className={`border-[#f59e0b]/30 ${searchType === 'cf' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#e8fbff]/60'} hover:bg-[#f59e0b]/10`}
              onClick={() => setSearchType('cf')}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Verifica CF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`border-[#f59e0b]/30 ${searchType === 'residenza' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-[#e8fbff]/60'} hover:bg-[#f59e0b]/10`}
              onClick={() => setSearchType('residenza')}
            >
              <Globe className="h-4 w-4 mr-1" />
              Residenza
            </Button>
          </div>

          {/* Risultato CF */}
          {cfInput.length === 16 && searchType === 'cf' && cfQuery.data && (
            <div className="p-4 bg-[#0f1729] border border-[#f59e0b]/20 rounded-lg">
              {cfQuery.data.found ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium text-sm">Soggetto trovato su ANPR</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">Nome</span>
                      <p className="text-sm text-[#e8fbff]">{cfQuery.data.nome}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">Cognome</span>
                      <p className="text-sm text-[#e8fbff]">{cfQuery.data.cognome}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">Data Nascita</span>
                      <p className="text-sm text-[#e8fbff]">{cfQuery.data.dataNascita}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">Comune Nascita</span>
                      <p className="text-sm text-[#e8fbff]">{cfQuery.data.comuneNascita}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 text-sm">Codice Fiscale non trovato su ANPR</span>
                </div>
              )}
            </div>
          )}

          {/* Risultato Residenza */}
          {cfInput.length === 16 && searchType === 'residenza' && residenzaQuery.data && (
            <div className="p-4 bg-[#0f1729] border border-[#f59e0b]/20 rounded-lg">
              {residenzaQuery.data.found ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium text-sm">Residenza trovata</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">Indirizzo</span>
                      <p className="text-sm text-[#e8fbff]">
                        {residenzaQuery.data.indirizzo} {residenzaQuery.data.civico}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">CAP</span>
                      <p className="text-sm text-[#e8fbff]">{residenzaQuery.data.cap}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">Comune</span>
                      <p className="text-sm text-[#e8fbff]">{residenzaQuery.data.comune}</p>
                    </div>
                    <div>
                      <span className="text-xs text-[#e8fbff]/40">Provincia</span>
                      <p className="text-sm text-[#e8fbff]">{residenzaQuery.data.provincia}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400 text-sm">Residenza non trovata per {cfInput}</span>
                </div>
              )}
            </div>
          )}

          {cfInput.length < 16 && (
            <p className="text-[#e8fbff]/30 text-xs text-center py-2">
              Inserisci un codice fiscale di 16 caratteri per avviare la ricerca
            </p>
          )}
        </CardContent>
      </Card>

      {/* Codici Fiscali di Test */}
      <Card className="bg-[#1a2332] border-[#f59e0b]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-[#f59e0b]" />
            Codici Fiscali di Test (Mock Mode)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { cf: 'RSSMRA85M01H501Z', name: 'Mario Rossi — Roma' },
              { cf: 'VRDLGI90A41F205X', name: 'Luigia Verdi — Milano' },
              { cf: 'BNCGPP75D15L219Y', name: 'Giuseppe Bianchi — Torino' },
            ].map((item) => (
              <div
                key={item.cf}
                className="flex items-center justify-between p-2 bg-[#0f1729] border border-[#f59e0b]/10 rounded-lg cursor-pointer hover:border-[#f59e0b]/30 transition-colors"
                onClick={() => setCfInput(item.cf)}
              >
                <div>
                  <code className="text-[#f59e0b] text-xs font-mono">{item.cf}</code>
                  <p className="text-[#e8fbff]/50 text-xs">{item.name}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#e8fbff]/20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Sub-componente: SSO Panel
// ============================================
function SsoPanel() {
  const statusQuery = useQuery({
    queryKey: ['sso-status'],
    queryFn: async () => MOCK_SSO_STATUS,
  });
  const providersQuery = useQuery({
    queryKey: ['sso-providers'],
    queryFn: async () => MOCK_SSO_PROVIDERS,
  });
  const testMutation = useMutation({
    mutationFn: async (params: { provider: string }) => {
      await new Promise((r) => setTimeout(r, 600));
      return { success: params.provider === 'spid' || params.provider === 'cie', responseTimeMs: 180, errorMessage: params.provider === 'cns' || params.provider === 'eidas' ? 'Provider non configurato' : undefined };
    },
  });

  const providerIcons: Record<string, React.ReactNode> = {
    spid: <Shield className="h-5 w-5 text-[#0066cc]" />,
    cie: <UserCheck className="h-5 w-5 text-[#003399]" />,
    cns: <Key className="h-5 w-5 text-[#006633]" />,
    eidas: <Globe className="h-5 w-5 text-[#003399]" />,
  };

  const providerColors: Record<string, string> = {
    spid: '#0066cc',
    cie: '#003399',
    cns: '#006633',
    eidas: '#003399',
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-[#8b5cf6]" />
            SSO — Single Sign-On Federato
          </CardTitle>
          <CardDescription className="text-[#e8fbff]/50">
            Autenticazione SPID, CIE, CNS ed eIDAS per cittadini e operatori
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#8b5cf6]/20">
              <span className="text-xs text-[#e8fbff]/60">Modalita'</span>
              <p className="text-sm font-semibold text-[#e8fbff] mt-1">
                {statusQuery.data?.mockMode ? (
                  <Badge variant="outline" className="text-amber-400 border-amber-400/30">Mock</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Live</Badge>
                )}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#8b5cf6]/20">
              <span className="text-xs text-[#e8fbff]/60">Provider Totali</span>
              <p className="text-lg font-bold text-[#e8fbff] mt-1">
                {statusQuery.data?.providers.length ?? 0}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#8b5cf6]/20">
              <span className="text-xs text-[#e8fbff]/60">Attivi</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {statusQuery.data?.providers.filter((p: any) => p.isActive).length ?? 0}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729] rounded-lg border border-[#8b5cf6]/20">
              <span className="text-xs text-[#e8fbff]/60">Configurati</span>
              <p className="text-lg font-bold text-[#8b5cf6] mt-1">
                {statusQuery.data?.providers.filter((p: any) => p.isConfigured).length ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providersQuery.data?.map((provider) => {
          const color = providerColors[provider.provider] || '#8b5cf6';
          return (
            <Card key={provider.provider} className="bg-[#1a2332] border-[#8b5cf6]/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                      {providerIcons[provider.provider]}
                    </div>
                    <div>
                      <h4 className="text-[#e8fbff] font-medium text-sm">{provider.name}</h4>
                      <p className="text-[#e8fbff]/40 text-xs mt-1">
                        Provider: {provider.provider.toUpperCase()}
                      </p>
                      {provider.spidLevel && (
                        <Badge variant="outline" className="text-xs mt-1 text-[#e8fbff]/50 border-[#e8fbff]/20">
                          Livello {provider.spidLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {provider.isActive ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30">
                        Attivo
                      </Badge>
                    ) : (
                      <Badge className="bg-[#e8fbff]/10 text-[#e8fbff]/40 border-[#e8fbff]/10">
                        Non attivo
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs text-[#e8fbff]/40 border-[#e8fbff]/10">
                      {provider.environment}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#e8fbff]/5 flex justify-between items-center">
                  <div className="text-xs text-[#e8fbff]/30">
                    {provider.ssoUrl ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        Endpoint configurato
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-400" />
                        Endpoint da configurare
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 h-7 text-xs"
                    onClick={() => testMutation.mutate({ provider: provider.provider })}
                    disabled={testMutation.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${testMutation.isPending ? 'animate-spin' : ''}`} />
                    Test
                  </Button>
                </div>

                {/* Test Result */}
                {testMutation.data && testMutation.variables?.provider === provider.provider && (
                  <div className="mt-2 p-2 bg-[#0f1729] rounded-lg border border-[#8b5cf6]/10">
                    <div className="flex items-center gap-2">
                      {testMutation.data.success ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`text-xs ${testMutation.data.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {testMutation.data.success ? 'Connessione OK' : 'Errore connessione'}
                      </span>
                      <span className="text-xs text-[#e8fbff]/30 ml-auto">
                        {testMutation.data.responseTimeMs}ms
                      </span>
                    </div>
                    {testMutation.data.errorMessage && (
                      <p className="text-xs text-red-400/70 mt-1">{testMutation.data.errorMessage}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Sub-componente: Audit Trail Panel
// ============================================
function AuditTrailPanel() {
  const [platformFilter, setPlatformFilter] = useState<string | undefined>(undefined);

  const auditQuery = useQuery({
    queryKey: ['piattaforme-audit', platformFilter],
    queryFn: async () => {
      const items = platformFilter
        ? MOCK_AUDIT_ITEMS.filter((i) => i.platform === platformFilter)
        : MOCK_AUDIT_ITEMS;
      return { items };
    },
  });

  const statsQuery = useQuery({
    queryKey: ['piattaforme-audit-stats'],
    queryFn: async () => ({
      last24h: MOCK_AUDIT_ITEMS.filter((i) => Date.now() - new Date(i.created_at).getTime() < 86400000).length,
      last7d: MOCK_AUDIT_ITEMS.length,
      byPlatform: [
        { platform: 'pdnd', count: MOCK_AUDIT_ITEMS.filter((i) => i.platform === 'pdnd').length },
        { platform: 'appio', count: MOCK_AUDIT_ITEMS.filter((i) => i.platform === 'appio').length },
        { platform: 'anpr', count: MOCK_AUDIT_ITEMS.filter((i) => i.platform === 'anpr').length },
        { platform: 'sso', count: MOCK_AUDIT_ITEMS.filter((i) => i.platform === 'sso').length },
      ],
    }),
  });

  const platformColors: Record<string, string> = {
    pdnd: '#3b82f6',
    appio: '#10b981',
    anpr: '#f59e0b',
    sso: '#8b5cf6',
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/20">
          <CardContent className="p-4">
            <span className="text-xs text-[#e8fbff]/60">Ultime 24h</span>
            <p className="text-2xl font-bold text-[#14b8a6] mt-1">
              {statsQuery.data?.last24h ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#14b8a6]/20">
          <CardContent className="p-4">
            <span className="text-xs text-[#e8fbff]/60">Ultimi 7 giorni</span>
            <p className="text-2xl font-bold text-[#14b8a6] mt-1">
              {statsQuery.data?.last7d ?? 0}
            </p>
          </CardContent>
        </Card>
        {(statsQuery.data?.byPlatform as Array<{ platform: string; count: number }>)?.slice(0, 2).map((item) => (
          <Card key={item.platform} className="bg-[#1a2332] border-[#14b8a6]/20">
            <CardContent className="p-4">
              <span className="text-xs text-[#e8fbff]/60">{item.platform?.toUpperCase()}</span>
              <p className="text-2xl font-bold text-[#e8fbff] mt-1">
                {item.count ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-[#14b8a6]" />
            Registro Operazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={!platformFilter ? 'default' : 'outline'}
              className={!platformFilter ? 'bg-[#14b8a6] text-white' : 'border-[#14b8a6]/30 text-[#e8fbff]/60'}
              onClick={() => setPlatformFilter(undefined)}
            >
              Tutte
            </Button>
            {['pdnd', 'appio', 'anpr', 'sso'].map((p) => (
              <Button
                key={p}
                size="sm"
                variant={platformFilter === p ? 'default' : 'outline'}
                className={platformFilter === p
                  ? `text-white`
                  : `border-[#e8fbff]/20 text-[#e8fbff]/60`
                }
                style={platformFilter === p ? { backgroundColor: platformColors[p] } : {}}
                onClick={() => setPlatformFilter(p)}
              >
                {p.toUpperCase()}
              </Button>
            ))}
          </div>

          {/* Lista */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {(auditQuery.data?.items as Array<{
              id: number;
              platform: string;
              action: string;
              status: string;
              user_email: string;
              created_at: string;
              duration_ms: number;
            }>)?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-[#0f1729] border border-[#e8fbff]/5 rounded-lg"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      item.status === 'success'
                        ? '#10b981'
                        : item.status === 'error'
                          ? '#ef4444'
                          : '#f59e0b',
                  }}
                />
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ color: platformColors[item.platform], borderColor: `${platformColors[item.platform]}40` }}
                >
                  {item.platform}
                </Badge>
                <span className="text-[#e8fbff] text-sm flex-1">{item.action}</span>
                <span className="text-[#e8fbff]/30 text-xs">
                  {item.user_email?.split('@')[0]}
                </span>
                {item.duration_ms && (
                  <span className="text-[#e8fbff]/20 text-xs">{item.duration_ms}ms</span>
                )}
                <span className="text-[#e8fbff]/20 text-xs">
                  {new Date(item.created_at).toLocaleString('it-IT', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
            {(!auditQuery.data?.items || (auditQuery.data.items as unknown[]).length === 0) && (
              <p className="text-[#e8fbff]/30 text-sm text-center py-8">
                Nessuna operazione registrata
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Componente Principale
// ============================================
export default function PiattaformePA() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e8fbff] flex items-center gap-2">
            <Globe className="h-6 w-6 text-[#14b8a6]" />
            Piattaforme PA
          </h2>
          <p className="text-[#e8fbff]/50 text-sm mt-1">
            PDND, App IO, ANPR e SSO — Interoperabilita' e identita' digitale
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="pdnd" className="w-full">
        <TabsList className="bg-[#0f1729] border border-[#e8fbff]/10 p-1">
          <TabsTrigger
            value="pdnd"
            className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]"
          >
            <Server className="h-4 w-4 mr-2" />
            PDND
          </TabsTrigger>
          <TabsTrigger
            value="appio"
            className="data-[state=active]:bg-[#10b981]/20 data-[state=active]:text-[#10b981]"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            App IO
          </TabsTrigger>
          <TabsTrigger
            value="anpr"
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <FileSearch className="h-4 w-4 mr-2" />
            ANPR
          </TabsTrigger>
          <TabsTrigger
            value="sso"
            className="data-[state=active]:bg-[#8b5cf6]/20 data-[state=active]:text-[#8b5cf6]"
          >
            <Shield className="h-4 w-4 mr-2" />
            SSO
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
          >
            <Activity className="h-4 w-4 mr-2" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdnd" className="mt-4">
          <PdndPanel />
        </TabsContent>

        <TabsContent value="appio" className="mt-4">
          <AppIoPanel />
        </TabsContent>

        <TabsContent value="anpr" className="mt-4">
          <AnprPanel />
        </TabsContent>

        <TabsContent value="sso" className="mt-4">
          <SsoPanel />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditTrailPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
