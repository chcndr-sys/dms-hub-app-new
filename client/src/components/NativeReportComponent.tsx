import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Store, MapPin, Wallet, Bot, Network,
  FileText, Database, Code, ArrowRight, Download, ExternalLink,
  LayoutDashboard, Shield, Activity, Layers, Server, Cpu,
  CheckCircle, AlertCircle, TrendingUp, Lock, Globe, Zap
} from 'lucide-react';

// ─── Immagini blueprint (webp generate) ─────────────────────────────
const BLUEPRINT_SLIDES = {
  overview: [
    { id: 'ecosystem', title: 'Ecosistema DMS Hub', image: '/ecosystem_overview_generated.webp', desc: 'Panoramica architetturale completa del sistema' },
    { id: 'core', title: 'Core Business', image: '/core_business_generated.webp', desc: 'Gestione mercati e flussi operativi principali' },
    { id: 'integrations', title: 'Integrazioni', image: '/integrations_generated.webp', desc: 'Connettori TPER, Guardian e sistema AI' },
    { id: 'updates', title: 'Stato Sistema', image: '/blueprint_updates_generated.webp', desc: 'Architettura corrente e aggiornamenti' }
  ],
  modules: [
    {
      id: 'markets', title: 'Gestione Mercati', icon: Store,
      image: '/tech_markets_generated.webp',
      color: 'text-[#14b8a6]', borderColor: 'border-[#14b8a6]', bgColor: 'bg-[#14b8a6]',
      desc: 'Modulo core per anagrafiche e assegnazioni'
    },
    {
      id: 'gis', title: 'GIS & Mappe', icon: MapPin,
      image: '/tech_gis_generated.webp',
      color: 'text-[#10b981]', borderColor: 'border-[#10b981]', bgColor: 'bg-[#10b981]',
      desc: 'Visualizzazione geospaziale avanzata'
    },
    {
      id: 'wallet', title: 'Wallet & Finanza', icon: Wallet,
      image: '/tech_wallet_generated.webp',
      color: 'text-[#f59e0b]', borderColor: 'border-[#f59e0b]', bgColor: 'bg-[#f59e0b]',
      desc: 'Gestione finanziaria e PagoPA'
    },
    {
      id: 'agents', title: 'MIO Agent & AI', icon: Bot,
      image: '/tech_agents_generated.webp',
      color: 'text-[#8b5cf6]', borderColor: 'border-[#8b5cf6]', bgColor: 'bg-[#8b5cf6]',
      desc: 'Orchestrazione agenti autonomi'
    },
    {
      id: 'integrations', title: 'Connettività', icon: Network,
      image: '/tech_integrations_generated.webp',
      color: 'text-[#06b6d4]', borderColor: 'border-[#06b6d4]', bgColor: 'bg-[#06b6d4]',
      desc: 'Ponte verso sistemi esterni'
    }
  ]
};

// ─── Dati reali per ogni modulo ──────────────────────────────────────
const MODULE_DETAILS: Record<string, {
  stats: { label: string; value: string; color: string }[];
  highlights: string[];
  tech: string;
}> = {
  markets: {
    stats: [
      { label: 'Procedure tRPC', value: '38', color: '#14b8a6' },
      { label: 'Tabelle DB', value: '12', color: '#06b6d4' },
      { label: 'Componenti', value: '15+', color: '#a855f7' },
    ],
    highlights: [
      'CRUD completo mercati, posteggi e operatori',
      'Gestione concessioni con scadenze e rinnovi',
      'Registro presenze giornaliere digitale',
      'Mobilità operatori e gestione spuntisti',
    ],
    tech: 'Drizzle ORM + tRPC v11 + React Query'
  },
  gis: {
    stats: [
      { label: 'Layer mappa', value: '6', color: '#10b981' },
      { label: 'Formato', value: 'GeoJSON', color: '#06b6d4' },
      { label: 'Engine', value: 'Leaflet', color: '#a855f7' },
    ],
    highlights: [
      'Mappa interattiva mercati su scala nazionale',
      'Layer trasporti TPER Bologna integrato',
      'Heatmap segnalazioni civiche in tempo reale',
      'Route optimizer multi-destinazione',
    ],
    tech: 'Leaflet + OpenStreetMap + PostGIS'
  },
  wallet: {
    stats: [
      { label: 'Procedure tRPC', value: '20', color: '#f59e0b' },
      { label: 'Gateway', value: 'PagoPA', color: '#ef4444' },
      { label: 'Protocollo', value: 'E-FIL SOAP', color: '#06b6d4' },
    ],
    highlights: [
      'Borsellino elettronico per operatori',
      'Integrazione pagamenti PagoPA via E-FIL',
      'Generazione avvisi di pagamento (IUV)',
      'Storico transazioni e riconciliazione',
    ],
    tech: 'E-FIL SOAP + tRPC + PostgreSQL'
  },
  agents: {
    stats: [
      { label: 'Agenti AI', value: '5', color: '#8b5cf6' },
      { label: 'LLM', value: 'Gemini 2.5', color: '#14b8a6' },
      { label: 'Knowledge', value: '30 PDF', color: '#f59e0b' },
    ],
    highlights: [
      'MIO: orchestratore e coordinamento multi-agente',
      'GPT-Dev: sviluppo e refactoring codice',
      'Manus: sysadmin, deploy, infrastruttura',
      'Abacus: analisi dati e report statistici',
    ],
    tech: 'Gemini 2.5 Flash + WebSocket + REST'
  },
  integrations: {
    stats: [
      { label: 'Router tRPC', value: '21', color: '#06b6d4' },
      { label: 'Endpoints', value: '796', color: '#14b8a6' },
      { label: 'Auth', value: 'Firebase', color: '#f59e0b' },
    ],
    highlights: [
      'Firebase Auth + OAuth SPID/CIE/CNS',
      'TPER trasporto pubblico Bologna',
      'API keys + webhook management',
      'Guardian monitoring e alerting',
    ],
    tech: 'Firebase + OAuth 2.0 + tRPC v11'
  }
};

// ─── Schema DB raggruppato (75 tabelle) ──────────────────────────────
const DB_GROUPS = [
  { name: 'Core Business', color: '#14b8a6', icon: Store, count: 12,
    tables: ['markets', 'stalls', 'vendors', 'concessions', 'presences', 'daily_presences', 'market_sectors', 'stall_types', 'vendor_categories', 'market_schedules', 'market_operators', 'market_fees'] },
  { name: 'Wallet & Pagamenti', color: '#f59e0b', icon: Wallet, count: 8,
    tables: ['wallet_accounts', 'wallet_transactions', 'payment_notices', 'wallet_recharges', 'payment_receipts', 'payment_methods', 'invoices', 'fee_schedules'] },
  { name: 'Auth & RBAC', color: '#ef4444', icon: Lock, count: 5,
    tables: ['users', 'user_roles', 'role_permissions', 'permissions', 'user_role_assignments'] },
  { name: 'AI & Agenti', color: '#8b5cf6', icon: Bot, count: 10,
    tables: ['agent_logs', 'tasks', 'projects', 'brain_entries', 'messages', 'workspaces', 'workspace_drawings', 'agent_configs', 'orchestrator_runs', 'ai_conversations'] },
  { name: 'Segnalazioni Civiche', color: '#06b6d4', icon: AlertCircle, count: 4,
    tables: ['civic_reports', 'civic_categories', 'civic_responses', 'civic_attachments'] },
  { name: 'Integrazioni & API', color: '#10b981', icon: Network, count: 8,
    tables: ['api_keys', 'webhooks', 'api_metrics', 'integrations', 'tper_routes', 'tper_stops', 'external_connections', 'webhook_logs'] },
  { name: 'Comuni & Territorio', color: '#f97316', icon: Globe, count: 6,
    tables: ['comuni', 'territories', 'provinces', 'regions', 'addresses', 'geo_boundaries'] },
  { name: 'Sostenibilità', color: '#22c55e', icon: TrendingUp, count: 5,
    tables: ['carbon_credits', 'carbon_transactions', 'sustainability_metrics', 'green_certificates', 'emission_reports'] },
  { name: 'Notifiche & Sistema', color: '#64748b', icon: Activity, count: 7,
    tables: ['notifications', 'system_logs', 'audit_trail', 'sessions', 'app_settings', 'feature_flags', 'maintenance_windows'] },
  { name: 'Commercio & SUAP', color: '#ec4899', icon: FileText, count: 5,
    tables: ['businesses', 'licenses', 'suap_requests', 'inspections', 'business_categories'] },
  { name: 'TCC Security & Anti-Frode', color: '#f43f5e', icon: Shield, count: 5,
    tables: ['tcc_rate_limits', 'tcc_fraud_events', 'tcc_idempotency_keys', 'tcc_daily_limits', 'tcc_qr_tokens'] },
];

// ─── Gruppi componenti (143 totali) ──────────────────────────────────
const COMPONENT_GROUPS = [
  { name: 'Dashboard PA', count: 14, desc: '28 tab protetti con sistema RBAC + ProtectedTab', color: '#14b8a6', icon: LayoutDashboard },
  { name: 'Gestione Mercati', count: 12, desc: 'Mercati, posteggi, concessioni, presenze, operatori', color: '#06b6d4', icon: Store },
  { name: 'Mappe & GIS', count: 10, desc: 'Leaflet maps, layer manager, route optimizer', color: '#10b981', icon: MapPin },
  { name: 'Wallet & Pagamenti', count: 8, desc: 'Borsellino, PagoPA E-FIL, transazioni', color: '#f59e0b', icon: Wallet },
  { name: 'AI & Chat', count: 8, desc: 'MIO Agent, workspace collaborativo, brain', color: '#8b5cf6', icon: Bot },
  { name: 'Auth & Security', count: 6, desc: 'Login, RBAC manager, impersonation, guard', color: '#ef4444', icon: Lock },
  { name: 'UI Base (shadcn)', count: 53, desc: 'Button, Card, Dialog, Table, Select, etc.', color: '#64748b', icon: Layers },
  { name: 'Report & Docs', count: 5, desc: 'Blueprint navigator, dossier, report cards', color: '#a855f7', icon: FileText },
  { name: 'Segnalazioni', count: 6, desc: 'Civic reports panel, heatmap, categorie', color: '#06b6d4', icon: AlertCircle },
  { name: 'Impresa & Operatori', count: 10, desc: 'Dashboard impresa, anagrafica, notifiche, hub', color: '#f97316', icon: Globe },
  { name: 'Pagine Pubbliche', count: 15, desc: 'Home, mappa, vetrine, SUAP, presentazione', color: '#22c55e', icon: Globe },
];

// ─── Metriche dossier ────────────────────────────────────────────────
const PA_INTEGRATIONS = [
  { name: 'PagoPA', status: 'ok' as const, detail: 'E-FIL SOAP integrato — gateway attivo' },
  { name: 'SPID/CIE/CNS', status: 'ok' as const, detail: 'OAuth + Firebase Auth multi-provider' },
  { name: 'Firebase Auth', status: 'ok' as const, detail: 'Pienamente operativo con JWT + RBAC' },
  { name: 'TPER Bologna', status: 'ok' as const, detail: 'API real-time integrata' },
  { name: 'PDND', status: 'partial' as const, detail: 'Predisposto — in attesa accreditamento' },
  { name: 'ANPR', status: 'partial' as const, detail: 'Predisposto — in attesa accreditamento' },
  { name: 'AppIO', status: 'partial' as const, detail: 'Predisposto — in attesa accreditamento' },
  { name: 'SUAP Impresa.gov', status: 'ok' as const, detail: 'Modulo SUAP completo con dashboard' },
];

const STATUS_COLORS = {
  ok: { bg: 'bg-[#10b981]/20', text: 'text-[#10b981]', label: 'Operativo' },
  partial: { bg: 'bg-[#f59e0b]/20', text: 'text-[#f59e0b]', label: 'Parziale' },
  missing: { bg: 'bg-[#ef4444]/20', text: 'text-[#ef4444]', label: 'Da fare' },
};

// ─── Score bar component ─────────────────────────────────────────────
function ScoreBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = (score / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#e8fbff]/70">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{score}/{max}</span>
      </div>
      <div className="h-2 bg-[#0b1220] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
export function NativeReportComponent() {
  const [activeTab, setActiveTab] = useState('architecture');
  const [activeModule, setActiveModule] = useState(BLUEPRINT_SLIDES.modules[0]);

  const renderContent = () => {
    switch (activeTab) {

      // ─── TAB: ARCHITETTURA ───────────────────────────────────────
      case 'architecture': {
        const details = MODULE_DETAILS[activeModule.id];
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Module Navigation */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="bg-[#1a2332] border-[#06b6d4]/30 h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#e8fbff] text-lg">Moduli di Sistema</CardTitle>
                    <p className="text-xs text-[#e8fbff]/40">5 moduli core — 82.000 righe di codice (client+server)</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {BLUEPRINT_SLIDES.modules.map((module) => (
                      <div
                        key={module.id}
                        onClick={() => setActiveModule(module)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 group ${
                          activeModule.id === module.id
                            ? `bg-[#0b1220] ${module.borderColor} shadow-[0_0_15px_rgba(6,182,212,0.15)]`
                            : 'bg-[#0b1220]/50 border-transparent hover:bg-[#0b1220] hover:border-[#e8fbff]/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md bg-[#1a2332] ${module.color}`}>
                              <module.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className={`font-semibold text-sm ${activeModule.id === module.id ? 'text-[#e8fbff]' : 'text-[#e8fbff]/70'}`}>
                                {module.title}
                              </h3>
                              <p className="text-xs text-[#e8fbff]/40">{module.desc}</p>
                            </div>
                          </div>
                          <ArrowRight className={`h-4 w-4 transition-transform ${
                            activeModule.id === module.id ? 'text-[#06b6d4] translate-x-1' : 'text-[#e8fbff]/20'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Image + Data Panel */}
              <div className="lg:col-span-8 space-y-4">
                {/* Image Card */}
                <Card className="bg-[#0b1220] border-[#06b6d4]/30 overflow-hidden">
                  <div className="relative min-h-[380px] bg-black/40 group">
                    <img
                      src={activeModule.image}
                      alt={activeModule.title}
                      className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/90 to-transparent p-6 pt-12">
                      <div className="flex items-center gap-3 mb-2">
                        <activeModule.icon className={`h-6 w-6 ${activeModule.color}`} />
                        <h3 className="text-2xl font-bold text-[#e8fbff]">{activeModule.title}</h3>
                      </div>
                      <p className="text-sm text-[#e8fbff]/60">{details?.tech}</p>
                    </div>
                  </div>
                </Card>

                {/* Stats + Highlights Panel */}
                {details && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stats */}
                    <Card className="bg-[#1a2332] border-[#1e293b]">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-semibold text-[#e8fbff]/50 uppercase tracking-wider mb-3">Metriche</h4>
                        <div className="space-y-3">
                          {details.stats.map((stat, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-sm text-[#e8fbff]/70">{stat.label}</span>
                              <span className="text-sm font-bold font-mono px-2 py-0.5 rounded" style={{ color: stat.color, backgroundColor: stat.color + '15' }}>
                                {stat.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Highlights */}
                    <Card className="bg-[#1a2332] border-[#1e293b]">
                      <CardContent className="p-4">
                        <h4 className="text-xs font-semibold text-[#e8fbff]/50 uppercase tracking-wider mb-3">Funzionalità</h4>
                        <ul className="space-y-2">
                          {details.highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[#e8fbff]/70">
                              <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-[#10b981] shrink-0" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // ─── TAB: FLUSSO DATI ────────────────────────────────────────
      case 'dataflow':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* System summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Codice attivo', value: '115K righe', color: '#14b8a6' },
                { label: 'Totale progetto', value: '219K righe', color: '#06b6d4' },
                { label: 'Router tRPC', value: '21', color: '#a855f7' },
                { label: 'Endpoints API', value: '796', color: '#f59e0b' },
              ].map((s, i) => (
                <Card key={i} className="bg-[#1a2332] border-[#1e293b]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-[#e8fbff]/50 mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Overview slides */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {BLUEPRINT_SLIDES.overview.map((slide) => (
                <Card
                  key={slide.id}
                  className="bg-[#1a2332] border-[#06b6d4]/20 hover:border-[#06b6d4]/50 transition-colors cursor-pointer group overflow-hidden"
                  onClick={() => window.open(slide.image, '_blank')}
                >
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a2332] to-transparent" />
                  </div>
                  <CardContent className="pt-4 relative">
                    <h4 className="text-[#e8fbff] font-semibold mb-1 group-hover:text-[#06b6d4] transition-colors">
                      {slide.title}
                    </h4>
                    <p className="text-sm text-[#e8fbff]/50">{slide.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      // ─── TAB: DATABASE ───────────────────────────────────────────
      case 'database':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Tabelle totali', value: '75', color: '#14b8a6' },
                { label: 'ORM', value: 'Drizzle', color: '#06b6d4' },
                { label: 'Database', value: 'Neon PostgreSQL', color: '#a855f7' },
              ].map((s, i) => (
                <Card key={i} className="bg-[#1a2332] border-[#1e293b]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-[#e8fbff]/50 mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table groups grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DB_GROUPS.map((group, i) => (
                <Card key={i} className="bg-[#1a2332] border-[#1e293b] hover:border-opacity-50 transition-colors" style={{ borderColor: group.color + '30' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-[#0b1220]" style={{ color: group.color }}>
                          <group.icon className="h-4 w-4" />
                        </div>
                        <h4 className="text-sm font-semibold text-[#e8fbff]">{group.name}</h4>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ color: group.color, backgroundColor: group.color + '15' }}>
                        {group.count} tabelle
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.tables.map((t, j) => (
                        <span key={j} className="text-[10px] font-mono px-2 py-1 rounded bg-[#0b1220] text-[#e8fbff]/50 border border-[#1e293b]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center pt-2">
              <Button
                variant="outline"
                className="border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/10"
                onClick={() => window.open('https://github.com/Chcndr/dms-hub-app-new/blob/master/drizzle/schema.ts', '_blank')}
              >
                <Code className="h-4 w-4 mr-2" />
                Vedi Schema Completo su GitHub
              </Button>
            </div>
          </div>
        );

      // ─── TAB: COMPONENTI ─────────────────────────────────────────
      case 'components':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Componenti React', value: '143', color: '#14b8a6' },
                { label: 'Pagine', value: '37', color: '#06b6d4' },
                { label: 'Framework', value: 'React 19', color: '#a855f7' },
                { label: 'Build', value: 'Vite 7', color: '#f59e0b' },
              ].map((s, i) => (
                <Card key={i} className="bg-[#1a2332] border-[#1e293b]">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-[#e8fbff]/50 mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Component groups */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COMPONENT_GROUPS.map((group, i) => (
                <Card key={i} className="bg-[#1a2332] border-[#1e293b] hover:border-opacity-50 transition-colors" style={{ borderColor: group.color + '30' }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-[#0b1220] shrink-0" style={{ color: group.color }}>
                        <group.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#e8fbff]">{group.name}</h4>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded-full shrink-0" style={{ color: group.color, backgroundColor: group.color + '15' }}>
                            {group.count}
                          </span>
                        </div>
                        <p className="text-xs text-[#e8fbff]/50 mt-1">{group.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tech stack summary */}
            <Card className="bg-[#0b1220] border-[#1e293b]">
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-[#e8fbff]/50 uppercase tracking-wider mb-3">Stack Frontend</h4>
                <div className="flex flex-wrap gap-2">
                  {['React 19', 'Vite 7', 'TypeScript strict', 'Tailwind 4', 'shadcn/ui', 'Wouter', 'React Query', 'tRPC client', 'Leaflet', 'Lucide Icons', 'Recharts', 'Firebase SDK'].map((tech, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-[#1a2332] text-[#e8fbff]/60 border border-[#1e293b]">
                      {tech}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      // ─── TAB: DOSSIER TECNICO ────────────────────────────────────
      case 'dossier':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Compliance scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#1a2332] border-[#1e293b]">
                <CardContent className="p-5 space-y-4">
                  <h4 className="text-sm font-semibold text-[#e8fbff] flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#a855f7]" />
                    Analisi Conformità
                  </h4>
                  <ScoreBar label="HTTPS & Certificati" score={10} max={10} color="#10b981" />
                  <ScoreBar label="Autenticazione" score={10} max={10} color="#10b981" />
                  <ScoreBar label="Validazione Input (Zod)" score={10} max={10} color="#10b981" />
                  <ScoreBar label="RBAC & Autorizzazione" score={10} max={10} color="#10b981" />
                  <ScoreBar label="Rate Limiting" score={10} max={10} color="#10b981" />
                  <ScoreBar label="Security Headers" score={10} max={10} color="#10b981" />
                  <ScoreBar label="Audit Trail" score={10} max={10} color="#10b981" />
                  <ScoreBar label="GDPR Compliance" score={10} max={10} color="#10b981" />
                </CardContent>
              </Card>

              <div className="space-y-4">
                {/* Economic valuation */}
                <Card className="bg-[#1a2332] border-[#1e293b]">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-[#e8fbff] flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-[#10b981]" />
                      Valutazione Economica
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-[#0b1220] text-center">
                        <p className="text-xl font-bold text-[#14b8a6] font-mono">280-440K</p>
                        <p className="text-[10px] text-[#e8fbff]/40 mt-1">Valore Asset (EUR)</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0b1220] text-center">
                        <p className="text-xl font-bold text-[#a855f7] font-mono">0.75-5M</p>
                        <p className="text-[10px] text-[#e8fbff]/40 mt-1">Potenziale Commerciale</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#e8fbff]/40 mt-3">Target: 8.000 mercati italiani — SaaS/on-premise per PA</p>
                  </CardContent>
                </Card>

                {/* Quick doc count */}
                <Card className="bg-[#1a2332] border-[#1e293b]">
                  <CardContent className="p-5">
                    <h4 className="text-sm font-semibold text-[#e8fbff] flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-[#06b6d4]" />
                      Biblioteca Documentale
                    </h4>
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="text-3xl font-bold text-[#06b6d4] font-mono">42</span>
                        <p className="text-xs text-[#e8fbff]/40">PDF tecnici e normativi</p>
                      </div>
                      <div>
                        <span className="text-3xl font-bold text-[#f59e0b] font-mono">14</span>
                        <p className="text-xs text-[#e8fbff]/40">Regolamenti EU</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Conformità Normativa */}
            <Card className="bg-[#1a2332] border-[#1e293b]">
              <CardContent className="p-5">
                <h4 className="text-sm font-semibold text-[#e8fbff] flex items-center gap-2 mb-4">
                  <Lock className="h-4 w-4 text-[#10b981]" />
                  Conformita' Normativa v6.6 (aggiornata 16 Feb 2026)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'GDPR — Privacy Policy', status: 'ok' as const, detail: 'Pagina /privacy conforme Art. 13/14' },
                    { name: 'GDPR — Cookie Consent', status: 'ok' as const, detail: 'Banner consenso esplicito attivo' },
                    { name: 'WCAG 2.1 AA', status: 'ok' as const, detail: 'Skip-to-content, focus-visible, lang="it"' },
                    { name: 'Dichiarazione Accessibilita\'', status: 'ok' as const, detail: 'Pagina /accessibilita conforme AgID' },
                    { name: 'Security Headers (Helmet)', status: 'ok' as const, detail: 'CSP, HSTS, X-Frame-Options attivi' },
                    { name: 'Rate Limiting', status: 'ok' as const, detail: 'Globale 100/15min + 4 finanziari' },
                    { name: 'Anti-Frode TCC', status: 'ok' as const, detail: 'QR HMAC-SHA256, GPS validation, audit' },
                    { name: 'PWA + Service Worker', status: 'ok' as const, detail: 'Installabile, offline page, manifest' },
                    { name: 'Cifratura PII (AES-256-GCM)', status: 'ok' as const, detail: 'CF, PIVA, IBAN cifrati con IV random + auth tag' },
                    { name: 'GDPR — Export Dati (Art. 20)', status: 'ok' as const, detail: 'Endpoint gdpr.exportMyData con 12 tabelle' },
                    { name: 'GDPR — Diritto Oblio (Art. 17)', status: 'ok' as const, detail: 'Anonimizzazione account gdpr.deleteMyAccount' },
                    { name: 'Data Retention Policy', status: 'ok' as const, detail: '90gg metrics, 365gg logs, 5y audit (obbligo legale)' },
                    { name: 'CI/CD Pipeline', status: 'ok' as const, detail: 'GitHub Actions: check + test + build + audit' },
                    { name: 'SBOM', status: 'ok' as const, detail: 'CycloneDX JSON generato automaticamente' },
                    { name: 'Test Suite (36 test)', status: 'ok' as const, detail: 'Vitest: crypto, security, RBAC, router, schema' },
                    { name: 'ARIA/WCAG Landmarks', status: 'ok' as const, detail: 'role=main, aria-label, aria-live, nav semantica' },
                    { name: 'GDPR Consent Checkbox', status: 'ok' as const, detail: 'Consenso obbligatorio in registrazione' },
                    { name: 'API Key Middleware', status: 'ok' as const, detail: 'Validazione X-API-Key + lastUsedAt tracking' },
                    { name: 'RBAC Granulare', status: 'ok' as const, detail: 'requirePermission() middleware per permessi singoli' },
                    { name: 'Error Monitoring', status: 'ok' as const, detail: 'ErrorBoundary + window.error → backend' },
                    { name: 'Code Splitting', status: 'ok' as const, detail: 'React.lazy() su 30+ pagine, bundle ridotto' },
                    { name: 'Console.log Cleanup', status: 'ok' as const, detail: '~185 console.log rimossi da 30 file' },
                    { name: 'PDND', status: 'partial' as const, detail: 'Predisposto — in attesa accreditamento' },
                    { name: 'DPIA', status: 'partial' as const, detail: 'Da redigere formalmente' },
                    { name: 'Qualificazione ACN SaaS', status: 'missing' as const, detail: 'Da avviare per vendita a PA' },
                  ].map((int, i) => {
                    const st = STATUS_COLORS[int.status];
                    return (
                      <div key={i} className="p-3 rounded-lg bg-[#0b1220] border border-[#1e293b]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#e8fbff]">{int.name}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#e8fbff]/40">{int.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* PA Integrations status */}
            <Card className="bg-[#1a2332] border-[#1e293b]">
              <CardContent className="p-5">
                <h4 className="text-sm font-semibold text-[#e8fbff] flex items-center gap-2 mb-4">
                  <Globe className="h-4 w-4 text-[#f59e0b]" />
                  Stato Integrazioni PA
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {PA_INTEGRATIONS.map((int, i) => {
                    const st = STATUS_COLORS[int.status];
                    return (
                      <div key={i} className="p-3 rounded-lg bg-[#0b1220] border border-[#1e293b]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#e8fbff]">{int.name}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#e8fbff]/40">{int.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Open full dossier */}
            <div className="text-center pt-2">
              <Button
                className="bg-[#a855f7] hover:bg-[#a855f7]/80 text-white px-8 py-3 text-base"
                onClick={() => window.open('/dossier/index.html', '_blank')}
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Apri Dossier Tecnico Completo
              </Button>
              <p className="text-xs text-[#e8fbff]/30 mt-2">10 sezioni — architettura, sicurezza, conformità AGID/EU, valutazione economica</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const SIDEBAR_TABS = [
    { id: 'architecture', label: 'Architettura', icon: Server },
    { id: 'dataflow', label: 'Flusso Dati', icon: Activity },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'components', label: 'Componenti', icon: Layers },
    { id: 'dossier', label: 'Dossier Tecnico', icon: Shield },
  ];

  const TAB_HEADERS: Record<string, { title: string; subtitle: string }> = {
    architecture: { title: 'Panoramica Architetturale', subtitle: 'Struttura ad alto livello del sistema DMS Hub e moduli core.' },
    dataflow: { title: 'Flussi Dati & Processi', subtitle: 'Architettura e flussi informativi tra frontend, backend e servizi esterni.' },
    database: { title: 'Schema Database — 75 Tabelle', subtitle: 'PostgreSQL su Neon Serverless — ORM Drizzle — 10 domini funzionali.' },
    components: { title: 'Componenti Frontend — 143 React', subtitle: 'React 19 + Vite 7 + TypeScript strict + Tailwind 4 + shadcn/ui.' },
    dossier: { title: 'Dossier Tecnico di Sistema', subtitle: 'Analisi conformità, sicurezza, integrazioni PA e valutazione economica.' },
  };

  const currentHeader = TAB_HEADERS[activeTab] || TAB_HEADERS.architecture;

  return (
    <div className="flex h-[850px] bg-[#0b1220] rounded-xl border border-[#1e293b] overflow-hidden">
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <div className="w-64 bg-[#1a2332] border-r border-[#1e293b] flex flex-col shrink-0">
        <div className="p-6 border-b border-[#1e293b]">
          <h2 className="text-xl font-bold text-[#e8fbff] flex items-center gap-2">
            <Activity className="h-6 w-6 text-[#a855f7]" />
            Analisi Sistema
          </h2>
          <p className="text-xs text-[#e8fbff]/50 mt-1">DMS Hub — Report Tecnico v6.6</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? tab.id === 'dossier'
                    ? 'bg-[#a855f7]/10 text-[#a855f7] ring-1 ring-[#a855f7]/30'
                    : 'bg-[#a855f7]/10 text-[#a855f7]'
                  : 'text-[#e8fbff]/70 hover:bg-[#e8fbff]/5 hover:text-[#e8fbff]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'dossier' && activeTab !== 'dossier' && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[#a855f7]/20 text-[#a855f7]">NEW</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#1e293b] space-y-2">
          <Button
            variant="outline"
            className="w-full border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/10"
            onClick={() => window.open('/dossier/index.html', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Dossier Completo
          </Button>
          <Button
            variant="outline"
            className="w-full border-[#06b6d4]/30 text-[#06b6d4] hover:bg-[#06b6d4]/10"
            onClick={() => window.open('/STATO_PROGETTO_AGGIORNATO.md', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Stato Progetto
          </Button>
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#0b1220] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#e8fbff] mb-2">{currentHeader.title}</h1>
            <p className="text-[#e8fbff]/60">{currentHeader.subtitle}</p>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
