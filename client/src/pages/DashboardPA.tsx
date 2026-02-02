import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { PanicButton } from '@/components/PanicButton';
import { useLocation } from 'wouter';
import { useAnimation } from '@/contexts/AnimationContext';
import { 
  Users, TrendingUp, Store, ShoppingCart, Leaf, MapPin, 
  Activity, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, ArrowDown, ArrowUpCircle, ArrowDownCircle,
  Bike, Car, Bus, Footprints, Zap, Package, Globe, Award,
  Calendar, Clock, AlertCircle, AlertTriangle, CheckCircle, Download, FileText, Bot, Send,
  Shield, Lock, UserCheck, Terminal, Bug, Code, Wrench, RefreshCw,
  Coins, DollarSign, Wallet, Settings, Sliders, TrendingDown,
  Building2, GraduationCap, Target, TrendingUpDown, Briefcase,
  Radio, CloudRain, Wind, UserCog, ClipboardCheck, Scale, Bell, BellRing,
  Navigation, Train, ParkingCircle, TrafficCone, FileBarChart, Plug, SettingsIcon, Euro, Newspaper, Rocket,
  XCircle, Lightbulb, MessageSquare, Brain, Calculator, ExternalLink, StopCircle,
  Search, Filter, Plus, Landmark, BookOpen, Star, FileCheck, HandCoins, Mail, MailOpen, Home
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import MobilityMap from '@/components/MobilityMap';
import GestioneMercati from '@/components/GestioneMercati';
import Integrazioni from '@/components/Integrazioni';
import { GISMap } from '@/components/GISMap';
import { MarketMapComponent } from '@/components/MarketMapComponent';
import CivicReportsHeatmap from '@/components/CivicReportsHeatmap';
import SuapPanel from '@/components/SuapPanel';

import MIOAgent from '@/components/MIOAgent';
import { LogsSectionReal, DebugSectionReal } from '@/components/LogsDebugReal';
import GuardianLogsSection from '@/components/GuardianLogsSection';
import ImpreseQualificazioniPanel from '@/components/ImpreseQualificazioniPanel';
import { MarketCompaniesTab } from '@/components/markets/MarketCompaniesTab';
import { NativeReportComponent } from '@/components/NativeReportComponent';
import { LegacyReportCards } from '@/components/LegacyReportCards';
import { MultiAgentChatView } from '@/components/multi-agent/MultiAgentChatView';
import { SharedWorkspace } from '@/components/SharedWorkspace';
import NotificationsPanel from '@/components/NotificationsPanel';
import ComuniPanel from '@/components/ComuniPanel';
import WalletPanel from '@/components/WalletPanel';
import SecurityTab from '@/components/SecurityTab';
import ClientiTab from '@/components/ClientiTab';
import GestioneHubPanel from '@/components/GestioneHubPanel';
import GestioneHubMapWrapper from '@/components/GestioneHubMapWrapper';
import { useTransport } from '@/contexts/TransportContext';
import ControlliSanzioniPanel from '@/components/ControlliSanzioniPanel';
import CivicReportsPanel from '@/components/CivicReportsPanel';
import { BusHubEditor } from '@/components/bus-hub';
import { ProtectedTab, ProtectedQuickAccess } from '@/components/ProtectedTab';
import { MessageContent } from '@/components/MessageContent';
import { callOrchestrator } from '@/api/orchestratorClient';
import { sendAgentMessage, AgentChatMessage } from '@/lib/mioOrchestratorClient';
import { sendDirectMessageToHetzner, DirectMioMessage } from '@/lib/DirectMioClient';
import { sendToAgent } from '@/lib/agentHelper';

// 👻 GHOSTBUSTER: MioChatMessage sostituito con DirectMioMessage
// 🔥 FORCE REBUILD: 2024-12-20 12:46 - Fix agentName filter removed from single chats
type MioChatMessage = DirectMioMessage;
import { getLogs, getLogsStats, getGuardianHealth } from '@/api/logsClient';
// import { useInternalTraces } from '@/hooks/useInternalTraces'; // TODO: implementare hook
import { useConversationPersistence } from '@/hooks/useConversationPersistence';
import { useAgentLogs } from '@/hooks/useAgentLogs';
import { useMio } from '@/contexts/MioContext';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Hook per dati reali da backend
function useDashboardData() {
  const overviewQuery = trpc.analytics.overview.useQuery();
  const marketsQuery = trpc.analytics.markets.useQuery();
  const shopsQuery = trpc.analytics.shops.useQuery();
  const transactionsQuery = trpc.analytics.transactions.useQuery();
  const systemLogsQuery = trpc.logs.system.useQuery();
  const userAnalyticsQuery = trpc.users.analytics.useQuery();
  const sustainabilityQuery = trpc.sustainability.metrics.useQuery();
  const businessesQuery = trpc.businesses.list.useQuery();
  const inspectionsQuery = trpc.inspections.list.useQuery();
  const notificationsQuery = trpc.notifications.list.useQuery();
  const civicReportsQuery = trpc.civicReports.list.useQuery();
  const mobilityQuery = trpc.mobility.list.useQuery();

  // Fetch stats overview dal backend REST MIHUB
  const [statsOverview, setStatsOverview] = useState<any>(null);
  const [statsRealtime, setStatsRealtime] = useState<any>(null);
  const [statsGrowth, setStatsGrowth] = useState<any>(null);
  const [statsQualificazione, setStatsQualificazione] = useState<any>(null);
  const [formazioneStats, setFormazioneStats] = useState<any>(null);
  const [bandiStats, setBandiStats] = useState<any>(null);
  
  useEffect(() => {
    const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
    
    // Leggi comune_id dall'URL se in modalità impersonificazione
    const urlParams = new URLSearchParams(window.location.search);
    const comuneId = urlParams.get('comune_id');
    const isImpersonating = urlParams.get('impersonate') === 'true';
    
    // Costruisci query string per filtro comune
    const comuneFilter = (comuneId && isImpersonating) ? `?comune_id=${comuneId}` : '';
    
    // Fetch overview (con filtro comune se impersonificazione)
    fetch(`${MIHUB_API}/stats/overview${comuneFilter}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatsOverview(data.data);
        }
      })
      .catch(err => console.log('Stats overview fetch error:', err));
    
    // Fetch realtime
    fetch(`${MIHUB_API}/stats/realtime`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatsRealtime(data.data);
        }
      })
      .catch(err => console.log('Stats realtime fetch error:', err));
    
    // Fetch growth
    fetch(`${MIHUB_API}/stats/growth`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatsGrowth(data.data);
        }
      })
      .catch(err => console.log('Stats growth fetch error:', err));
    
    // Fetch qualificazione (Tab Imprese)
    fetch(`${MIHUB_API}/stats/qualificazione/overview`)
      .then(res => res.json())
      .then(async data => {
        if (data.success) {
          // Fetch anche scadenze, demografia, top-imprese, indici
          const [scadenzeRes, demografiaRes, topImpreseRes, indiciRes] = await Promise.all([
            fetch(`${MIHUB_API}/stats/qualificazione/scadenze`).then(r => r.json()),
            fetch(`${MIHUB_API}/stats/qualificazione/demografia`).then(r => r.json()),
            fetch(`${MIHUB_API}/stats/qualificazione/top-imprese`).then(r => r.json()),
            fetch(`${MIHUB_API}/stats/qualificazione/indici`).then(r => r.json())
          ]);
          
          setStatsQualificazione({
            overview: data.data,
            scadenze: scadenzeRes.success ? scadenzeRes.data : [],
            demografia: demografiaRes.success ? demografiaRes.data : null,
            topImprese: topImpreseRes.success ? topImpreseRes.data : [],
            indici: indiciRes.success ? indiciRes.data : null
          });
        }
      })
      .catch(err => console.log('Stats qualificazione fetch error:', err));
    
    // Fetch formazione stats (enti formatori e corsi)
    fetch(`${MIHUB_API}/formazione/stats`)
      .then(res => res.json())
      .then(async data => {
        if (data.success) {
          // Fetch anche lista enti, corsi e iscrizioni
          const [entiRes, corsiRes, iscrizioniRes] = await Promise.all([
            fetch(`${MIHUB_API}/formazione/enti`).then(r => r.json()),
            fetch(`${MIHUB_API}/formazione/corsi`).then(r => r.json()),
            fetch(`${MIHUB_API}/formazione/iscrizioni/stats`).then(r => r.json())
          ]);
          
          setFormazioneStats({
            stats: data.data,
            enti: entiRes.success ? entiRes.data : [],
            corsi: corsiRes.success ? corsiRes.data : [],
            iscrizioni: iscrizioniRes.success ? iscrizioniRes.data : null
          });
        }
      })
      .catch(err => console.log('Formazione stats fetch error:', err));
    
    // Fetch bandi stats (associazioni e catalogo bandi)
    fetch(`${MIHUB_API}/bandi/stats`)
      .then(res => res.json())
      .then(async data => {
        if (data.success) {
          // Fetch anche lista associazioni, bandi, servizi, richieste e regolarità
          const [assocRes, catalogoRes, serviziRes, richiesteRes, regolaritaRes] = await Promise.all([
            fetch(`${MIHUB_API}/bandi/associazioni`).then(r => r.json()),
            fetch(`${MIHUB_API}/bandi/catalogo`).then(r => r.json()),
            fetch(`${MIHUB_API}/bandi/servizi`).then(r => r.json()),
            fetch(`${MIHUB_API}/bandi/richieste/stats`).then(r => r.json()),
            fetch(`${MIHUB_API}/bandi/regolarita/stats`).then(r => r.json())
          ]);
          
          setBandiStats({
            stats: data.data,
            associazioni: assocRes.success ? assocRes.data : [],
            catalogo: catalogoRes.success ? catalogoRes.data : [],
            servizi: serviziRes.success ? serviziRes.data : [],
            richieste: richiesteRes.success ? richiesteRes.data : null,
            regolarita: regolaritaRes.success ? regolaritaRes.data : null
          });
        }
      })
      .catch(err => console.log('Bandi stats fetch error:', err));
  }, []);

  // Combina dati tRPC con dati REST
  const combinedOverview = useMemo(() => {
    if (statsOverview) {
      return {
        totalUsers: statsOverview.utenti_totali || 0,
        userGrowth: 0,
        activeMarkets: statsOverview.mercati_attivi || 0,
        totalShops: statsOverview.hub || 0,
        totalTransactions: statsOverview.transazioni || 0,
        transactionGrowth: 0,
        sustainabilityRating: statsOverview.rating_sostenibilita || 0,
        co2Saved: statsOverview.tcc?.total_redeemed || 0,
        // Dati aggiuntivi
        vendors: statsOverview.vendors || 0,
        stalls: statsOverview.stalls || 0,
        comuni: statsOverview.comuni || 0,
        imprese: statsOverview.imprese || 0,
        autorizzazioni: statsOverview.autorizzazioni || 0,
        domande_spunta: statsOverview.domande_spunta || 0,
        tcc: statsOverview.tcc || {},
        today: statsOverview.today || {}
      };
    }
    return overviewQuery.data;
  }, [statsOverview, overviewQuery.data]);

  return {
    overview: combinedOverview,
    markets: marketsQuery.data || [],
    shops: shopsQuery.data || [],
    transactions: transactionsQuery.data || [],
    systemLogs: systemLogsQuery.data || [],
    userAnalytics: userAnalyticsQuery.data || [],
    sustainabilityMetrics: sustainabilityQuery.data || [],
    businesses: businessesQuery.data || [],
    inspections: inspectionsQuery.data || [],
    notifications: notificationsQuery.data || [],
    civicReports: civicReportsQuery.data || [],
    mobilityData: mobilityQuery.data || [],
    isLoading: overviewQuery.isLoading && !statsOverview,
    statsOverview: statsOverview,
    statsRealtime: statsRealtime,
    statsGrowth: statsGrowth,
    statsQualificazione: statsQualificazione,
    formazioneStats: formazioneStats,
    bandiStats: bandiStats
  };
}

// Mock data fallback per UI development
const mockData = {
  overview: {
    totalUsers: 15847,
    userGrowth: 8.5,
    activeMarkets: 12,
    totalShops: 156,
    totalTransactions: 24150,
    transactionGrowth: 12.3,
    sustainabilityRating: 7.8,
    co2Saved: 4654
  },
  usersGrowth: [
    { date: '01 Gen', users: 14500, new: 120 },
    { date: '08 Gen', users: 14850, new: 135 },
    { date: '15 Gen', users: 15200, new: 148 },
    { date: '22 Gen', users: 15550, new: 152 },
    { date: '29 Gen', users: 15847, new: 165 }
  ],
  transport: [
    { mode: 'A piedi', count: 6500, percentage: 41.0, co2: 0, color: '#10b981' },
    { mode: 'Bicicletta', count: 3200, percentage: 20.2, co2: 1280, color: '#14b8a6' },
    { mode: 'Bus', count: 2800, percentage: 17.7, co2: 1680, color: '#06b6d4' },
    { mode: 'Auto', count: 2500, percentage: 15.8, co2: 0, color: '#ef4444' },
    { mode: 'Elettrico', count: 847, percentage: 5.3, co2: 1694, color: '#8b5cf6' }
  ],
  topMarkets: [
    { name: 'Mercato Centrale Grosseto', visits: 12500, users: 4200, duration: 35, rank: 1 },
    { name: 'Mercato Follonica Mare', visits: 8900, users: 3100, duration: 28, rank: 2 },
    { name: 'Mercato Orbetello Centro', visits: 5200, users: 2100, duration: 32, rank: 3 },
    { name: 'Mercato Castiglione', visits: 3800, users: 1500, duration: 25, rank: 4 },
    { name: 'Mercato Marina di Grosseto', visits: 2900, users: 1200, duration: 22, rank: 5 }
  ],
  categories: [
    { name: 'Frutta e Verdura', purchases: 8500, percentage: 35.2, bio: 68.5, color: '#10b981' },
    { name: 'Formaggi e Latticini', purchases: 4200, percentage: 17.4, bio: 52.1, color: '#f59e0b' },
    { name: 'Pane e Dolci', purchases: 3800, percentage: 15.7, bio: 41.2, color: '#ef4444' },
    { name: 'Carne e Pesce', purchases: 2980, percentage: 12.3, bio: 38.5, color: '#ec4899' },
    { name: 'Altro', purchases: 4670, percentage: 19.4, bio: 25.8, color: '#8b5cf6' }
  ],
  certifications: [
    { type: 'BIO', count: 12500, percentage: 51.8, color: '#10b981' },
    { type: 'KM0', count: 9800, percentage: 40.6, color: '#14b8a6' },
    { type: 'DOP/IGP', count: 4500, percentage: 18.6, color: '#f59e0b' },
    { type: 'Fair Trade', count: 2100, percentage: 8.7, color: '#8b5cf6' }
  ],
  ecommerceVsPhysical: {
    ecommerce: { purchases: 18000, percentage: 40.0, co2: 54000, avgCo2: 3.0 },
    physical: { purchases: 27000, percentage: 60.0, co2: 8100, avgCo2: 0.3 },
    co2Savings: 45900
  },
  productOrigin: {
    local: { count: 75000, percentage: 60.0, avgDistance: 15, avgCo2: 0.2 },
    national: { count: 35000, percentage: 28.0, avgDistance: 450, avgCo2: 1.5 },
    eu: { count: 10000, percentage: 8.0, avgDistance: 1200, avgCo2: 3.5 },
    extraEu: { count: 5000, percentage: 4.0, avgDistance: 8500, avgCo2: 12.0 }
  },
  realtime: {
    activeUsers: 342,
    activeVendors: 87,
    todayCheckins: 124,
    todayTransactions: 456,
    systemStatus: {
      api: 'operational',
      database: 'operational',
      redis: 'operational',
      tpas: 'standby'
    }
  },
  logs: [
    { id: 1, timestamp: '2025-11-07 11:25:43', app: 'APP Clienti', type: 'check-in', level: 'info', user: 'mario.rossi@email.com', message: 'Check-in Mercato Centrale Grosseto', ip: '192.168.1.45' },
    { id: 2, timestamp: '2025-11-07 11:24:12', app: 'APP Operatori', type: 'vendita', level: 'info', user: 'operatore.bio@dms.it', message: 'Vendita prodotto BIO - 50 carbon credits assegnati', ip: '192.168.1.102' },
    { id: 3, timestamp: '2025-11-07 11:23:05', app: 'DMS Backend', type: 'error', level: 'error', user: 'system', message: 'Database connection timeout - retry 3/3', ip: '10.0.0.5' },
    { id: 4, timestamp: '2025-11-07 11:22:18', app: 'WebApp PM', type: 'route', level: 'info', user: 'giulia.bianchi@email.com', message: 'Percorso ottimizzato calcolato: 3 stop, 2.5km', ip: '192.168.1.78' },
    { id: 5, timestamp: '2025-11-07 11:21:30', app: 'APP Clienti', type: 'segnalazione', level: 'warning', user: 'luca.verdi@email.com', message: 'Segnalazione civica: Rifiuti non raccolti', ip: '192.168.1.92' }
  ],
  security: {
    totalAccesses: 15847,
    failedLogins: 23,
    activeUsers: 342,
    suspiciousActivity: 2,
    lastAudit: '2025-11-06 23:00:00',
    vulnerabilities: { critical: 0, high: 1, medium: 3, low: 5 }
  },
  debug: {
    errors: { total: 12, resolved: 8, pending: 4 },
    performance: { avgResponseTime: 145, p95: 320, p99: 580 },
    healthChecks: { api: 'healthy', database: 'healthy', redis: 'healthy', storage: 'healthy' },
    deployments: { lastDeploy: '2025-11-06 18:30:00', version: 'v2.1.3', status: 'stable' }
  },
  carbonCredits: {
    fund: {
      balance: 125000,
      currency: 'EUR',
      sources: [
        { name: 'Regione Toscana', amount: 80000, date: '2025-10-01' },
        { name: 'Comune Grosseto', amount: 30000, date: '2025-10-15' },
        { name: 'Sponsor Privati', amount: 15000, date: '2025-11-01' }
      ],
      expenses: { reimbursements: 45000, incentives: 12000, operations: 3000 },
      burnRate: 8500,
      monthsRemaining: 7.8
    },
    value: {
      current: 1.50,
      history: [
        { date: '2025-09-01', value: 1.20 },
        { date: '2025-10-01', value: 1.35 },
        { date: '2025-11-01', value: 1.50 }
      ],
      byArea: [
        { area: 'Grosseto', value: 1.50, boost: 0 },
        { area: 'Follonica', value: 1.35, boost: -10 },
        { area: 'Orbetello', value: 1.65, boost: +10 }
      ],
      byCategory: [
        { category: 'BIO', boost: 20, finalValue: 1.80 },
        { category: 'KM0', boost: 15, finalValue: 1.73 },
        { category: 'DOP/IGP', boost: 10, finalValue: 1.65 },
        { category: 'Standard', boost: 0, finalValue: 1.50 }
      ]
    },
    reimbursements: {
      pending: { count: 23, amount: 8450 },
      processed: { count: 156, amount: 45000 },
      topShops: [
        { name: 'Bio Market Centrale', credits: 12500, euros: 18750 },
        { name: 'Ortofrutta KM0', credits: 8900, euros: 13350 },
        { name: 'Formaggi Toscani', credits: 6200, euros: 9300 }
      ]
    },
    analytics: {
      issued: 125000,
      spent: 78000,
      velocity: 62.4,
      roi: { invested: 125000, co2Saved: 4654, costPerKg: 26.85 }
    }
  },
  businesses: {
    total: 450,
    fullyCompliant: 320,
    partiallyCompliant: 95,
    nonCompliant: 35,
    avgScore: 78.5,
    atRiskSuspension: 12,
    demographics: {
      openings: 45,
      closures: 12,
      netGrowth: 33,
      growthRate: 7.9,
      byGender: { male: 280, female: 150, company: 20 },
      byAge: { '18-30': 45, '31-45': 180, '46-60': 180, '60+': 45 },
      byOrigin: { native: 380, italian: 50, foreign: 20 }
    },
    indices: {
      requalification: 72.5,
      digitalization: 68.3,
      sustainability: 75.8
    },
    expiringDocs: [
      { business: 'Bio Market Centrale', doc: 'DURC', days: 5, critical: true },
      { business: 'Ortofrutta KM0', doc: 'HACCP', days: 12, critical: false },
      { business: 'Formaggi Toscani', doc: 'Antincendio', days: 18, critical: false },
      { business: 'Macelleria Grosseto', doc: 'Primo Soccorso', days: 25, critical: false }
    ],
    training: {
      completed: 285,
      scheduled: 45,
      avgCost: 350,
      topTrainers: [
        { name: 'Safety Training Toscana', courses: 85, rating: 4.8 },
        { name: 'Formazione Sicurezza SRL', courses: 62, rating: 4.6 },
        { name: 'Academy HACCP', courses: 48, rating: 4.7 }
      ]
    },
    grants: {
      active: 8,
      applications: 45,
      approved: 28,
      successRate: 62.2,
      avgAmount: 12500,
      topGrants: [
        { title: 'Digitalizzazione PMI 2025', applicants: 15, approved: 10, amount: 150000 },
        { title: 'Formazione Sicurezza', applicants: 12, approved: 9, amount: 45000 },
        { title: 'Sostenibilità Imprese', applicants: 10, approved: 6, amount: 85000 }
      ]
    },
    topScoring: [
      { name: 'Bio Market Centrale', score: 98, sector: 'Alimentare', digitalization: 95 },
      { name: 'Ortofrutta KM0', score: 96, sector: 'Alimentare', digitalization: 92 },
      { name: 'Formaggi Toscani', score: 94, sector: 'Alimentare', digitalization: 88 },
      { name: 'Artigianato Locale', score: 91, sector: 'Artigianato', digitalization: 85 },
      { name: 'Macelleria Grosseto', score: 89, sector: 'Alimentare', digitalization: 82 }
    ]
  },
  // Nuove sezioni
  civicReports: {
    total: 127,
    pending: 45,
    inProgress: 38,
    resolved: 44,
    byType: [
      { type: 'Rifiuti', count: 35, percentage: 27.6 },
      { type: 'Illuminazione', count: 28, percentage: 22.0 },
      { type: 'Strade', count: 24, percentage: 18.9 },
      { type: 'Verde pubblico', count: 22, percentage: 17.3 },
      { type: 'Altro', count: 18, percentage: 14.2 }
    ],
    recent: [
      { id: 1, type: 'Rifiuti', description: 'Cassonetti pieni', status: 'pending', date: '2025-11-07', user: 'Cliente', location: 'Via Roma' },
      { id: 2, type: 'Illuminazione', description: 'Lampione rotto', status: 'in_progress', date: '2025-11-06', user: 'Commerciante', location: 'Piazza Dante' },
      { id: 3, type: 'Strade', description: 'Buca pericolosa', status: 'pending', date: '2025-11-06', user: 'Cliente', location: 'Corso Italia' }
    ]
  },
  iotSensors: {
    airQuality: {
      pm10: 28.5,
      pm25: 15.2,
      no2: 35.8,
      status: 'good',
      lastUpdate: '2025-11-07 13:00'
    },
    weather: {
      temp: 18.5,
      humidity: 65,
      pressure: 1015,
      wind: 12.5
    },
    sensors: [
      { id: 1, name: 'Centro Storico', type: 'Aria', status: 'online', pm10: 28.5 },
      { id: 2, name: 'Mercato Centrale', type: 'Aria', status: 'online', pm10: 32.1 },
      { id: 3, name: 'Marina', type: 'Aria', status: 'offline', pm10: null }
    ]
  },
  businessUsers: {
    total: 156,
    active: 142,
    inactive: 14,
    byCategory: [
      { category: 'Alimentari', count: 65, revenue: 125000 },
      { category: 'Artigianato', count: 38, revenue: 85000 },
      { category: 'Servizi', count: 28, revenue: 62000 },
      { category: 'Altro', count: 25, revenue: 45000 }
    ],
    topUsers: [
      { name: 'Bio Market Centrale', sales: 2850, credits: 1250, rating: 4.9 },
      { name: 'Ortofrutta KM0', sales: 2340, credits: 980, rating: 4.8 },
      { name: 'Formaggi Toscani', sales: 1920, credits: 850, rating: 4.7 }
    ]
  },
  inspections: {
    scheduled: 28,
    completed: 156,
    violations: 12,
    fines: 8,
    totalFines: 15000,
    upcoming: [
      { id: 1, business: 'Macelleria Rossi', type: 'HACCP', date: '2025-11-10', inspector: 'M. Bianchi' },
      { id: 2, business: 'Panificio Centro', type: 'Sicurezza', date: '2025-11-12', inspector: 'L. Verdi' },
      { id: 3, business: 'Bar Piazza', type: 'DURC', date: '2025-11-15', inspector: 'A. Rossi' }
    ],
    violationsList: [
      { id: 1, business: 'Ristorante Mare', type: 'HACCP', fine: 2000, status: 'paid', date: '2025-10-28' },
      { id: 2, business: 'Negozio Abbigliamento', type: 'Sicurezza', fine: 1500, status: 'pending', date: '2025-11-02' }
    ]
  },
  notifications: {
    sent: 2450,
    delivered: 2380,
    opened: 1850,
    clicked: 920,
    openRate: 77.7,
    clickRate: 38.7,
    recent: [
      { id: 1, title: 'Nuovo mercato aperto', type: 'push', sent: 1250, opened: 980, date: '2025-11-06' },
      { id: 2, title: 'Scadenza DURC', type: 'email', sent: 45, opened: 38, date: '2025-11-05' },
      { id: 3, title: 'Promozione carbon credits', type: 'sms', sent: 850, opened: 720, date: '2025-11-04' }
    ]
  },
  mobility: {
    busLines: 12,
    totalBusStops: 85,
    activeBuses: 28,
    passengers: 3450,
    parkingSpots: 1200,
    parkingOccupied: 850,
    parkingAvailable: 350,
    stops: [
      { id: 1, name: 'Stazione FS', line: '1, 3, 5', nextBus: '3 min', passengers: 15 },
      { id: 2, name: 'Piazza Dante', line: '2, 4', nextBus: '8 min', passengers: 8 },
      { id: 3, name: 'Mercato Centrale', line: '1, 2, 6', nextBus: '12 min', passengers: 22 }
    ],
    traffic: [
      { road: 'Via Aurelia', status: 'heavy', incidents: 1 },
      { road: 'Corso Carducci', status: 'moderate', incidents: 0 },
      { road: 'Via Senese', status: 'light', incidents: 0 }
    ]
  }
};

export default function DashboardPA() {
  // 🆘 FORZATURA DI EMERGENZA: Ripristino conversation_id storico
  useEffect(() => {
    const TARGET_ID = 'dfab3001-0969-4d6d-93b5-e6f69eecb794';
    
    if (localStorage.getItem('mihub_global_conversation_id') !== TARGET_ID) {
      console.log("⚠️ RIPRISTINO CHAT STORICA...");
      localStorage.setItem('mihub_global_conversation_id', TARGET_ID);
      window.location.reload(); // Ricarica per applicare
    }
  }, []);

  // Dati reali dal backend MIHUB
  const realData = useDashboardData();
  
  // Dati GTFS reali dal TransportContext (api.mio-hub.me/api/gtfs)
  const { stops: gtfsStops, stats: gtfsStats, loadStats: loadGtfsStats, isLoading: gtfsLoading } = useTransport();
  
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [realtimeData, setRealtimeData] = useState(mockData.realtime);
   // Leggi tab da URL params (es. ?tab=mappa)
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'dashboard');
  
  // Modalità impersonificazione: nascondi tab admin
  const isImpersonating = urlParams.get('impersonate') === 'true';
  const comuneIdFromUrl = urlParams.get('comune_id');
  const comuneNomeFromUrl = urlParams.get('comune_nome');
  
  // Tab da nascondere in modalità impersonificazione (solo per comuni)
  const hiddenTabsForComuni = [
    'security', 'sistema', 'ai', 'integrations', 'settings', 
    'comuni', 'reports', 'workspace', 'docs'
  ];
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'mercati'>('overview');
  const [sistemaSubTab, setSistemaSubTab] = useState<'logs' | 'debug'>('logs');
  const [walletSubTab, setWalletSubTab] = useState<'wallet' | 'pagopa'>('wallet');
  const [walletSearch, setWalletSearch] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<number | null>(null);

  // Leva Politica: TCC assegnati per €10 spesi (range 0-30, default 10)
  const [tccValue, setTccValue] = useState(10); // Valore diretto: 10 = 10 TCC per €10
  
  // Carbon Credits - Simulatore completo
  const [editableParams, setEditableParams] = useState({
    fundBalance: 0,
    burnRate: 0,
    tccIssued: 0,
    tccSpent: 0,
    areaBoosts: [
      { area: 'Grosseto', boost: 0 },
      { area: 'Follonica', boost: -10 },
      { area: 'Orbetello', boost: +10 }
    ],
    categoryBoosts: [
      { category: 'BIO', boost: 20 },
      { category: 'KM0', boost: 15 },
      { category: 'DOP/IGP', boost: 10 },
      { category: 'Standard', boost: 0 }
    ]
  });

  // Calcola valori dinamici basati su slider e boost
  const calculateAreaValues = () => {
    return editableParams.areaBoosts.map(item => ({
      ...item,
      value: tccValue * (1 + item.boost / 100)
    }));
  };

  const calculateCategoryValues = () => {
    return editableParams.categoryBoosts.map(item => ({
      ...item,
      finalValue: tccValue * (1 + item.boost / 100)
    }));
  };

  // Funzione per formattazione italiana numeri (punto migliaia, virgola decimali)
  const formatNumberIT = (num: number | string | undefined | null, decimals: number = 0): string => {
    if (num === undefined || num === null || isNaN(Number(num))) return '0';
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return n.toLocaleString('it-IT', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  // Funzione per formattazione euro
  const formatEuroIT = (num: number | string | undefined | null, decimals: number = 2): string => {
    if (num === undefined || num === null || isNaN(Number(num))) return '€0,00';
    const n = typeof num === 'string' ? parseFloat(num) : num;
    return '€' + n.toLocaleString('it-IT', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const calculateMonthsRemaining = () => {
    if (editableParams.burnRate === 0) return '999';
    return formatNumberIT(editableParams.fundBalance / editableParams.burnRate, 1);
  };

  const calculateVelocity = () => {
    if (editableParams.tccIssued === 0) return 0;
    return ((editableParams.tccSpent / editableParams.tccIssued) * 100).toFixed(1);
  };

  const calculateReimbursementNeeded = () => {
    // Rimborsi = TCC spesi × valore TCC in euro (€0,089)
    return (editableParams.tccSpent * appliedTccValue).toFixed(2);
  };

  // NUOVA FORMULA: 1 TCC = 1 kg CO2 (basato su EU ETS: 1 TCC rappresenta 1 kg di CO2)
  const CO2_PER_TCC = 1; // 1 TCC = 1 kg CO2
  // 1 albero assorbe circa 22 kg CO₂ all'anno (fonte: USDA)
  const CO2_PER_TREE = 22;

  const calculateCO2Saved = () => {
    // TCC riscattati = kg CO2 evitata
    return (editableParams.tccSpent * CO2_PER_TCC).toFixed(0);
  };

  const calculateTreesEquivalent = () => {
    const co2Saved = parseFloat(calculateCO2Saved());
    return (co2Saved / CO2_PER_TREE).toFixed(1);
  };

  // Chat AI
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'ai', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [appliedTccValue, setAppliedTccValue] = useState(0.089); // Valore TCC in euro (€0,089 basato su EU ETS)
  
  // Guardian Logs for MIO Agent tab
  const [guardianLogs, setGuardianLogs] = useState<any[]>([]);
  
  // Fund TCC Stats - Dati reali dal backend
  const [fundStats, setFundStats] = useState<any>(null);
  const [fundLoading, setFundLoading] = useState(true);
  const [fundMovementFilter, setFundMovementFilter] = useState<'all' | 'deposit' | 'reimbursement'>('all');
  
  // TCC v2.1 - Comuni e Regole
  const [tccComuni, setTccComuni] = useState<any[]>([]);
  const [selectedComuneId, setSelectedComuneId] = useState<number | null>(null);
  const [tccRules, setTccRules] = useState<any[]>([]);
  const [tccRulesLoading, setTccRulesLoading] = useState(false);
  
  // TCC v2.1 - Environment Data (Meteo, Qualità Aria, ETS)
  const [envData, setEnvData] = useState<any>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [editableEtsPrice, setEditableEtsPrice] = useState<number>(89.56);
  
  // Documentation Modal state
  const [docModalContent, setDocModalContent] = useState<{ title: string; content: string } | null>(null);
  
  // Statistiche Imprese
  const [impreseStats, setImpreseStats] = useState({ total: 0, concessioni: 0, comuni: 0, media: '0' });
  
  // Carica lista comuni con hub attivo (TCC v2.1)
  useEffect(() => {
    const loadComuni = async () => {
      try {
        const response = await fetch('https://orchestratore.mio-hub.me/api/tcc/v2/comuni');
        const data = await response.json();
        if (data.success && data.comuni) {
          setTccComuni(data.comuni);
          // Imposta il comune di default (primo con area definita, es. Grosseto)
          if (data.default_hub_id && !selectedComuneId) {
            setSelectedComuneId(data.default_hub_id);
          } else if (data.comuni.length > 0 && !selectedComuneId) {
            setSelectedComuneId(data.comuni[0].hub_id);
          }
        }
      } catch (error) {
        console.error('Error loading comuni:', error);
      }
    };
    loadComuni();
  }, []);
  
  // Carica regole boost per il comune selezionato (TCC v2.1)
  useEffect(() => {
    const loadRules = async () => {
      if (!selectedComuneId) return;
      try {
        setTccRulesLoading(true);
        const response = await fetch(`https://orchestratore.mio-hub.me/api/tcc/v2/rules?comune_id=${selectedComuneId}`);
        const data = await response.json();
        if (data.success && data.rules) {
          setTccRules(data.rules);
          // Aggiorna i boost editabili con i dati reali
          const areaRules = data.rules.filter((r: any) => r.type === 'area');
          const categoryRules = data.rules.filter((r: any) => r.type === 'category');
          setEditableParams(prev => ({
            ...prev,
            areaBoosts: areaRules.length > 0 
              ? areaRules.map((r: any) => ({ area: r.name, boost: (parseFloat(r.multiplier_boost) - 1) * 100, ruleId: r.id }))
              : prev.areaBoosts,
            categoryBoosts: categoryRules.length > 0
              ? categoryRules.map((r: any) => ({ category: r.value, boost: (parseFloat(r.multiplier_boost) - 1) * 100, ruleId: r.id }))
              : prev.categoryBoosts
          }));
        }
      } catch (error) {
        console.error('Error loading TCC rules:', error);
      } finally {
        setTccRulesLoading(false);
      }
    };
    loadRules();
  }, [selectedComuneId]);
  
  // Carica dati ambientali per l'hub selezionato (TCC v2.1 - Environment)
  useEffect(() => {
    const fetchEnvironmentData = async () => {
      if (!selectedComuneId) return;
      setEnvLoading(true);
      try {
        const response = await fetch(`https://orchestratore.mio-hub.me/api/tcc/v2/environment/${selectedComuneId}`);
        const data = await response.json();
        if (data.success) {
          setEnvData(data);
          setEditableEtsPrice(data.ets?.price_per_tonne || 89.56);
        }
      } catch (error) {
        console.error('Error fetching environment data:', error);
      } finally {
        setEnvLoading(false);
      }
    };
    fetchEnvironmentData();
  }, [selectedComuneId]);
  
  // Funzione per aggiornare il prezzo ETS
  const handleEtsPriceUpdate = async () => {
    if (!editableEtsPrice || editableEtsPrice <= 0) return;
    try {
      const response = await fetch('https://orchestratore.mio-hub.me/api/tcc/v2/ets-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ets_price: editableEtsPrice,
          notes: 'Aggiornamento manuale da dashboard'
        })
      });
      const data = await response.json();
      if (data.success && selectedComuneId) {
        // Ricarica i dati ambientali per aggiornare il valore TCC
        const envResponse = await fetch(`https://orchestratore.mio-hub.me/api/tcc/v2/environment/${selectedComuneId}`);
        const envData = await envResponse.json();
        if (envData.success) {
          setEnvData(envData);
        }
      }
    } catch (error) {
      console.error('Error updating ETS price:', error);
    }
  };
  
  // Carica statistiche fondo TCC NAZIONALI (endpoint originale senza comune)
  useEffect(() => {
    const loadFundStats = async () => {
      try {
        setFundLoading(true);
        // Usa l'endpoint originale per le statistiche nazionali
        const [statsResponse, transactionsResponse] = await Promise.all([
          fetch('https://orchestratore.mio-hub.me/api/tcc/v2/fund/stats'),
          fetch('https://orchestratore.mio-hub.me/api/tcc/v2/fund/transactions')
        ]);
        const statsData = await statsResponse.json();
        const transactionsData = await transactionsResponse.json();
        
        if (statsData.success) {
          // Combina stats con transactions
          const fundWithTransactions = {
            ...statsData.fund,
            transactions: transactionsData.success ? transactionsData.transactions : []
          };
          setFundStats(fundWithTransactions);
          // Aggiorna anche i parametri editabili con i dati reali
          setEditableParams(prev => ({
            ...prev,
            tccIssued: statsData.fund.total_issued || 0,
            tccSpent: statsData.fund.total_redeemed || 0,
            fundBalance: parseFloat(statsData.fund.fund_requirement_eur || '0') // Fabbisogno fondo in euro
          }));
          // Aggiorna il valore TCC applicato dalla config nazionale
          if (statsData.fund.config?.tcc_value) {
            setAppliedTccValue(parseFloat(statsData.fund.config.tcc_value));
          }
          // Aggiorna la leva politica (policy_multiplier)
          if (statsData.fund.config?.policy_multiplier) {
            // policy_multiplier = TCC per €10 spesi (valore diretto)
            setTccValue(parseFloat(statsData.fund.config.policy_multiplier));
          }
        }
      } catch (error) {
        console.error('Error loading fund stats:', error);
      } finally {
        setFundLoading(false);
      }
    };
    loadFundStats();
    // Refresh ogni 30 secondi
    const interval = setInterval(loadFundStats, 30000);
    return () => clearInterval(interval);
  }, []); // Carica una volta all'avvio, non dipende dal comune selezionato
  
  // Carica statistiche imprese
  useEffect(() => {
    fetch('https://api.mio-hub.me/api/imprese')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          const imprese = data.data;
          const totalConcessioni = imprese.reduce((acc: number, i: any) => acc + (i.concessioni_attive?.length || 0), 0);
          const comuniUnici = [...new Set(imprese.map((i: any) => i.comune).filter(Boolean))].length;
          const media = imprese.length > 0 ? (totalConcessioni / imprese.length).toFixed(1) : '0';
          setImpreseStats({ total: imprese.length, concessioni: totalConcessioni, comuni: comuniUnici, media });
        }
      })
      .catch(err => console.error('Error loading imprese stats:', err));
  }, []);
  
  // Multi-Agent Chat state
  const [showMultiAgentChat, setShowMultiAgentChat] = useState(true);  // 🎯 FIX: Mostra Vista 4 Agenti di default
  const [selectedAgent, setSelectedAgent] = useState<'mio' | 'gptdev' | 'manus' | 'abacus' | 'zapier'>('gptdev');
  const [viewMode, setViewMode] = useState<'single' | 'quad'>('quad');  // 🎯 FIX: Vista 4 Agenti come default
  
  // 🔥 MIO Agent Chat state - USA CONTEXT CONDIVISO!
  const [mioInputValue, setMioInputValue] = useState('');
  const [showMioScrollButton, setShowMioScrollButton] = useState(false);
  const mioMessagesRef = useRef<HTMLDivElement>(null);
  const [showSingleChatScrollButton, setShowSingleChatScrollButton] = useState(false);
  const singleChatMessagesRef = useRef<HTMLDivElement>(null);
  
  // 🔥 CONTEXT CONDIVISO: Stato MIO dal Context
  const {
    messages: mioMessages,
    conversationId: mioMainConversationId,
    isLoading: mioSending,
    error: mioSendError,
    sendMessage: sendMioMessage,
    setConversationId: setMioMainConversationId,
    stopGeneration,
  } = useMio();
  
  // 👥 DOPPIO CANALE - Vista Singola usa user-{agent}-direct
  const { conversationId: manusConversationId, setConversationId: setManusConversationId } = useConversationPersistence('user-manus-direct');
  const { conversationId: abacusConversationId, setConversationId: setAbacusConversationId } = useConversationPersistence('user-abacus-direct');
  const { conversationId: zapierConversationId, setConversationId: setZapierConversationId } = useConversationPersistence('user-zapier-direct');
  const { conversationId: gptdevConversationId, setConversationId: setGptdevConversationId } = useConversationPersistence('user-gptdev-direct');
  
  // 🔥 4 Conversazioni separate per MIO (una per ogni agente)
  const { conversationId: mioManusConversationId, setConversationId: setMioManusConversationId } = useConversationPersistence('mio-manus-coordination');
  const { conversationId: mioAbacusConversationId, setConversationId: setMioAbacusConversationId } = useConversationPersistence('mio-abacus-coordination');
  const { conversationId: mioZapierConversationId, setConversationId: setMioZapierConversationId } = useConversationPersistence('mio-zapier-coordination');
  const { conversationId: mioGptdevConversationId, setConversationId: setMioGptdevConversationId } = useConversationPersistence('mio-gptdev-coordination');
  
  // Variabili di compatibilità per non rompere il resto del codice
  const mioLoading = false;
  const mioError = null;  // Converti formato per compatibilità
  // Rimosso: vecchia conversione mioMessages da useAgentLogs
  
  // ========== VISTA 4 AGENTI (READ-ONLY) - LAZY LOAD ==========
  // 🔥 CARICAMENTO CONDIZIONALE: Questi hook si attivano SOLO quando viewMode === 'quad'
  // Questo previene duplicati al refresh quando si è in vista singola
  const {
    messages: gptdevQuadMessages,
    loading: gptdevQuadLoading,
  } = useAgentLogs({
    conversationId: viewMode === 'quad' ? mioGptdevConversationId : null, // 🔥 Chat MIO ↔ GPT Dev (isolata)
    agentName: 'gptdev',
    mode: 'auto',  // 🎯 Vista 4: coordinamento MIO
    enablePolling: viewMode === 'quad',
    excludeUserMessages: true, // 🔥 Solo coordinamento MIO ↔ GPT Dev
  });

  const {
    messages: manusQuadMessages,
    loading: manusQuadLoading,
  } = useAgentLogs({
    conversationId: viewMode === 'quad' ? mioManusConversationId : null, // 🔥 Chat MIO ↔ Manus (isolata)
    agentName: 'manus',
    mode: 'auto',  // 🎯 Vista 4: coordinamento MIO
    enablePolling: viewMode === 'quad',
    excludeUserMessages: true, // 🔥 Solo coordinamento MIO ↔ Manus
  });

  const {
    messages: abacusQuadMessages,
    loading: abacusQuadLoading,
  } = useAgentLogs({
    conversationId: viewMode === 'quad' ? mioAbacusConversationId : null, // 🔥 Chat MIO ↔ Abacus (isolata)
    agentName: 'abacus',
    mode: 'auto',  // 🎯 Vista 4: coordinamento MIO
    enablePolling: viewMode === 'quad',
    excludeUserMessages: true, // 🔥 Solo coordinamento MIO ↔ Abacus
  });

  const {
    messages: zapierQuadMessages,
    loading: zapierQuadLoading,
  } = useAgentLogs({
    conversationId: viewMode === 'quad' ? mioZapierConversationId : null, // 🔥 Chat MIO ↔ Zapier (isolata)
    agentName: 'zapier',
    mode: 'auto',  // 🎯 Vista 4: coordinamento MIO
    enablePolling: viewMode === 'quad',
    excludeUserMessages: true, // 🔥 Solo coordinamento MIO ↔ Zapier
  });

  // ========== VISTA SINGOLA AGENTI - Usa conversationId separati ==========
  // Questi hook gestiscono le 4 chat isolate (GPT Dev, Manus, Abacus, Zapier)
  const {
    messages: manusMessagesRaw,
    setMessages: setManusMessages,
    loading: manusLoading,
    error: manusError,
    refetch: refetchManus,
  } = useAgentLogs({
    conversationId: manusConversationId,
    // 🔥 FIX: Rimosso agentName per caricare TUTTI i messaggi (user + assistant)
    // Il conversation_id 'user-manus-direct' è già sufficiente
  });
  
  const manusMessages = manusMessagesRaw.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,  // Backend ora restituisce già 'content'
    agent: msg.agent_name,
    sender: msg.sender,  // 🔥 FIX: Aggiungo sender per distinguere MIO da Utente (rebuild 20/12/2024)
    created_at: msg.created_at,  // 🕒 FIX: Aggiungo timestamp per mostrare orario
    pending: msg.pending  // Preserva flag pending per Optimistic UI
  }));
  
  // Hook separato per Abacus (vista singola isolata)
  const {
    messages: abacusMessagesRaw,
    setMessages: setAbacusMessages,
    loading: abacusLoading,
    error: abacusError,
    refetch: refetchAbacus,
  } = useAgentLogs({
    conversationId: abacusConversationId,
    // 🔥 FIX: Rimosso agentName per caricare TUTTI i messaggi (user + assistant)
    // Il conversation_id 'user-abacus-direct' è già sufficiente
  });
  
  const abacusMessages = abacusMessagesRaw.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,  // Backend ora restituisce già 'content'
    agent: msg.agent_name,
    sender: msg.sender,  // 🔥 FIX: Aggiungo sender per distinguere MIO da Utente (rebuild 20/12/2024)
    created_at: msg.created_at,  // 🕒 FIX: Aggiungo timestamp per mostrare orario
    pending: msg.pending  // Preserva flag pending per Optimistic UI
  }));
  
  // Hook separato per Zapier (vista singola isolata)
  const {
    messages: zapierMessagesRaw,
    setMessages: setZapierMessages,
    loading: zapierLoading,
    error: zapierError,
    refetch: refetchZapier,
  } = useAgentLogs({
    conversationId: zapierConversationId,
    // 🔥 FIX: Rimosso agentName per caricare TUTTI i messaggi (user + assistant)
    // Il conversation_id 'user-zapier-direct' è già sufficiente
  });
  
  // Hook separato per GPT Developer (vista singola isolata)
  const {
    messages: gptdevMessagesRaw,
    setMessages: setGptdevMessages,
    loading: gptdevLoading,
    error: gptdevError,
    refetch: refetchGptdev,
  } = useAgentLogs({
    conversationId: gptdevConversationId,
    // 🔥 FIX: Rimosso agentName per caricare TUTTI i messaggi (user + assistant)
    // Il conversation_id 'user-gptdev-direct' è già sufficiente
  });
  
  const gptdevMessages = gptdevMessagesRaw.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,  // Backend ora restituisce già 'content'
    agent: msg.agent_name,
    sender: msg.sender,  // 🔥 FIX: Aggiungo sender per distinguere MIO da Utente (rebuild 20/12/2024)
    created_at: msg.created_at,  // 🕒 FIX: Aggiungo timestamp per mostrare orario
    pending: msg.pending  // Preserva flag pending per Optimistic UI
  }));
  
  const zapierMessages = zapierMessagesRaw.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,  // Backend ora restituisce già 'content'
    agent: msg.agent_name,
    sender: msg.sender,  // 🔥 FIX: Aggiungo sender per distinguere MIO da Utente (rebuild 20/12/2024)
    created_at: msg.created_at,  // 🕒 FIX: Aggiungo timestamp per mostrare orario
    pending: msg.pending  // Preserva flag pending per Optimistic UI
  }));
  
  const [gptdevInputValue, setGptdevInputValue] = useState('');
  const [manusInputValue, setManusInputValue] = useState('');
  const [abacusInputValue, setAbacusInputValue] = useState('');
  const [zapierInputValue, setZapierInputValue] = useState('');
  
  // Stati di loading per invio messaggi agenti singoli
  const [gptdevSending, setGptdevSending] = useState(false);
  const [manusSending, setManusSending] = useState(false);
  const [abacusSending, setAbacusSending] = useState(false);
  const [zapierSending, setZapierSending] = useState(false);
  
  // Rimosso: mioSendingLoading e mioSendingError (ora usati mioSending e mioSendError)
  
  // Internal traces per Vista 4 agenti (dialoghi MIO ↔ Agenti)
  const [internalTracesMessages, setInternalTracesMessages] = useState<Array<{ from: string; to: string; message: string; timestamp: string; meta?: any }>>([]);
  
  // ♾️ CHAT ETERNA: Un UUID generato UNA VOLTA e salvato PER SEMPRE
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // Carica o genera l'ID FISSO al mount
  useEffect(() => {
    // Helper: Valida UUID v4
    const isValidUUID = (uuid: string): boolean => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
    };

    // 1. Cerca un ID esistente nel localStorage ("cassetto" del browser)
    let storedId = localStorage.getItem('mihub_global_conversation_id');

    // 2. Se non c'è (o è vecchio/invalido), ne crea uno NUOVO e lo salva PER SEMPRE
    if (!storedId || !isValidUUID(storedId)) {
      storedId = crypto.randomUUID(); // Genera UUID valido
      localStorage.setItem('mihub_global_conversation_id', storedId);
      console.log('♾️ [DashboardPA Chat Eterna] Nuovo conversation_id generato:', storedId);
    } else {
      console.log('♾️ [DashboardPA Chat Eterna] Conversation_id esistente caricato:', storedId);
    }

    // 3. Usa quell'ID. Punto.
    setCurrentConversationId(storedId);
  }, []);

  // Hook per fetching automatico internalTraces
  // const { traces: fetchedTraces } = useInternalTraces(currentConversationId, 3000); // TODO: implementare hook
  const fetchedTraces: any[] = []; // Placeholder
  
  // ELIMINATO: loadChatHistory() - causava 404 su endpoint inesistenti
  // useAgentLogs gestisce automaticamente il caricamento della cronologia
  
  // Salva internalTraces in localStorage ogni volta che cambiano
  useEffect(() => {
    if (internalTracesMessages.length > 0) {
      localStorage.setItem('mihub_internal_traces', JSON.stringify(internalTracesMessages));
    }
  }, [internalTracesMessages]);
  
  // Merge fetchedTraces con internalTracesMessages
  useEffect(() => {
    if (fetchedTraces.length > 0) {
      setInternalTracesMessages(prev => {
        const existingKeys = new Set(prev.map(t => `${t.timestamp}-${t.from}-${t.to}`));
        const newTraces = fetchedTraces.filter(t => !existingKeys.has(`${t.timestamp}-${t.from}-${t.to}`));
        return [...prev, ...newTraces];
      });
    }
  }, [fetchedTraces]);

  // 🔔 NOTIFICHE STATE - Sistema bidirezionale PA/Associazioni ↔ Imprese
  const [notificheStats, setNotificheStats] = useState<any>(null);
  const [notificheRisposte, setNotificheRisposte] = useState<any[]>([]);
  const [notificheRisposteEnti, setNotificheRisposteEnti] = useState<any[]>([]);
  const [notificheRisposteAssoc, setNotificheRisposteAssoc] = useState<any[]>([]);
  const [mercatiList, setMercatiList] = useState<any[]>([]);
  const [hubList, setHubList] = useState<any[]>([]);
  const [impreseList, setImpreseList] = useState<any[]>([]);
  const [invioNotificaLoading, setInvioNotificaLoading] = useState(false);
  const [selectedNotifica, setSelectedNotifica] = useState<any>(null);
  const [notificheNonLette, setNotificheNonLette] = useState(0);
  const [filtroMessaggiEnti, setFiltroMessaggiEnti] = useState<'tutti' | 'inviati' | 'ricevuti'>('tutti');
  const [filtroMessaggiAssoc, setFiltroMessaggiAssoc] = useState<'tutti' | 'inviati' | 'ricevuti'>('tutti');
  const [messaggiInviatiEnti, setMessaggiInviatiEnti] = useState<any[]>([]);
  const [messaggiInviatiAssoc, setMessaggiInviatiAssoc] = useState<any[]>([]);
  
  // Funzione per segnare una risposta come letta
  const segnaRispostaComeLetta = async (risposta: any) => {
    if (risposta.letta) return; // Già letta
    const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
    try {
      await fetch(`${MIHUB_API}/notifiche/risposte/${risposta.id}/letta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      // Aggiorna stato locale
      if (risposta.target_tipo === 'ENTE_FORMATORE') {
        setNotificheRisposteEnti(prev => prev.map(r => r.id === risposta.id ? { ...r, letta: true } : r));
      } else {
        setNotificheRisposteAssoc(prev => prev.map(r => r.id === risposta.id ? { ...r, letta: true } : r));
      }
      // Aggiorna contatore non lette
      setNotificheNonLette(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Errore segna come letta:', error);
    }
  };
  
  // Fetch notifiche stats e risposte
  useEffect(() => {
    const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
    
    // Fetch stats notifiche (solo per statistiche generali, NON per badge)
    fetch(`${MIHUB_API}/notifiche/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotificheStats(data.data);
          // NON settare notificheNonLette qui - viene calcolato dalle risposte
        }
      })
      .catch(err => console.log('Notifiche stats fetch error:', err));
    
    // Fetch risposte (messaggi dalle imprese) - separate per Enti e Associazioni
    fetch(`${MIHUB_API}/notifiche/risposte`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setNotificheRisposte(data.data);
          // Filtra per target_tipo (chi era il destinatario originale della notifica)
          const risposteEnti = data.data.filter((r: any) => r.target_tipo === 'ENTE_FORMATORE');
          const risposteAssoc = data.data.filter((r: any) => r.target_tipo === 'ASSOCIAZIONE');
          setNotificheRisposteEnti(risposteEnti);
          setNotificheRisposteAssoc(risposteAssoc);
          // Calcola totale risposte non lette per badge barra rapida
          const totaleNonLette = data.data.filter((r: any) => !r.letta).length;
          setNotificheNonLette(totaleNonLette);
        }
      })
      .catch(err => console.log('Notifiche risposte fetch error:', err));
    
    // Fetch messaggi inviati - Enti Formatori (ID=1)
    fetch(`${MIHUB_API}/notifiche/messaggi/ENTE_FORMATORE/1?filtro=inviati`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setMessaggiInviatiEnti(data.data.map((m: any) => ({
            ...m,
            destinatari: m.totale_destinatari || 0,
            lette: m.letti || 0
          })));
        }
      })
      .catch(err => console.log('Messaggi inviati Enti fetch error:', err));
    
    // Fetch messaggi inviati - Associazioni (ID=2)
    fetch(`${MIHUB_API}/notifiche/messaggi/ASSOCIAZIONE/2?filtro=inviati`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setMessaggiInviatiAssoc(data.data.map((m: any) => ({
            ...m,
            destinatari: m.totale_destinatari || 0,
            lette: m.letti || 0
          })));
        }
      })
      .catch(err => console.log('Messaggi inviati Assoc fetch error:', err));
    
    // Fetch lista mercati
    fetch(`${MIHUB_API}/stats/overview`)
      .then(res => res.json())
      .then(async data => {
        // Fetch mercati separatamente
        const mercatiRes = await fetch(`${MIHUB_API}/markets`).then(r => r.json()).catch(() => ({ data: [] }));
        if (mercatiRes.data) {
          setMercatiList(mercatiRes.data);
        }
      })
      .catch(err => console.log('Mercati fetch error:', err));
    
    // Fetch lista hub
    fetch(`${MIHUB_API}/tcc/v2/comuni`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.comuni) {
          setHubList(data.comuni);
        }
      })
      .catch(err => console.log('Hub fetch error:', err));
    
    // Fetch lista imprese
    fetch('https://api.mio-hub.me/api/imprese')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setImpreseList(data.data);
        }
      })
      .catch(err => console.log('Imprese fetch error:', err));
    
    // Polling ogni 30 secondi per aggiornare notifiche
    const interval = setInterval(() => {
      fetch(`${MIHUB_API}/notifiche/stats`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setNotificheStats(data.data);
          }
        })
        .catch(err => console.log('Notifiche stats poll error:', err));
      // Aggiorna anche risposte non lette
      fetch(`${MIHUB_API}/notifiche/risposte`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setNotificheRisposte(data.data);
            setNotificheRisposteEnti(data.data.filter((r: any) => r.target_tipo === 'ENTE_FORMATORE'));
            setNotificheRisposteAssoc(data.data.filter((r: any) => r.target_tipo === 'ASSOCIAZIONE'));
            setNotificheNonLette(data.data.filter((r: any) => !r.letta).length);
          }
        })
        .catch(err => console.log('Notifiche risposte poll error:', err));
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // GIS Map state (blocco ufficiale da GestioneMercati)
  const [gisStalls, setGisStalls] = useState<any[]>([]);
  const [gisMapData, setGisMapData] = useState<any | null>(null);
  const [gisMapCenter, setGisMapCenter] = useState<[number, number] | null>(null);
  const [gisMapRefreshKey, setGisMapRefreshKey] = useState(0);
  
  // GIS Map filters
  const [gisSearchQuery, setGisSearchQuery] = useState('');
  const [showBusHubEditor, setShowBusHubEditor] = useState(false);
  const [gisStatusFilter, setGisStatusFilter] = useState<string>('all');
  const gisMarketId = 1; // Mercato Grosseto ID=1 (default)
  
  // Filtered stalls based on search and status
  const filteredGisStalls = gisStalls.filter(stall => {
    // Filter by status
    if (gisStatusFilter !== 'all' && stall.status !== gisStatusFilter) {
      return false;
    }
    
    // Filter by search query
    if (gisSearchQuery) {
      const query = gisSearchQuery.toLowerCase();
      return (
        // Posteggio
        stall.number?.toLowerCase().includes(query) ||
        stall.gis_slot_id?.toLowerCase().includes(query) ||
        // Impresa
        stall.vendor_business_name?.toLowerCase().includes(query) ||
        // Mercato (hardcoded per ora - Grosseto)
        'grosseto'.includes(query) ||
        'mercato grosseto'.includes(query) ||
        'toscana'.includes(query) ||
        // Giorno mercato
        'giovedì'.includes(query) ||
        'giovedi'.includes(query) ||
        'thursday'.includes(query)
      );
    }
    
    return true;
  });
  
  // Format timestamp for Guardian logs
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' (ora locale)';
  };
  
  // 🔥 Handler per invio messaggio MIO - USA CONTEXT!
  // ---------------------------------------------------------
  const handleSendMio = async () => {
    const text = mioInputValue.trim();
    if (!text || mioSending) return;

    setMioInputValue('');

    // Non cambiamo la vista quando si invia un messaggio
    // setViewMode('single');  // RIMOSSO: lasciamo la vista corrente
    setSelectedAgent('mio');

    // 🔥 USA LA FUNZIONE DEL CONTEXT!
    await sendMioMessage(text, { source: "dashboard_pa" });
    
    // Forza scroll dopo invio messaggio
    setTimeout(() => scrollMioToBottom(), 100);
  };
  // ---------------------------------------------------------
  // FINE BLOCCO TABULA RASA
  // ---------------------------------------------------------
  
  // ========== HANDLER VISTA SINGOLA AGENTI ==========
  // Ogni agente ha il suo handler che usa sendAgentMessage
  
  const handleSendGptdev = async () => {
    const text = gptdevInputValue.trim();
    if (!text || gptdevSending) return;
    setGptdevInputValue('');
    setGptdevSending(true);

    try {
      await sendToAgent({
        targetAgent: 'gptdev',
        message: text,
        conversationId: gptdevConversationId,
        mode: 'direct',
        onUpdateMessages: () => {}, // 🔥 FIX: Non usare setMessages, usa refetch
        onUpdateConversationId: setGptdevConversationId,
      });
      // 🔥 FIX: Ricarica messaggi dal database dopo la risposta
      await refetchGptdev();
    } finally {
      setGptdevSending(false);
    }
  };

  const handleSendManus = async () => {
    const text = manusInputValue.trim();
    if (!text || manusSending) return;
    setManusInputValue('');
    setManusSending(true);

    try {
      await sendToAgent({
        targetAgent: 'manus',
        message: text,
        conversationId: manusConversationId,
        mode: 'direct',
        onUpdateMessages: () => {}, // 🔥 FIX: Non usare setMessages, usa refetch
        onUpdateConversationId: setManusConversationId,
      });
      // 🔥 FIX: Ricarica messaggi dal database dopo la risposta
      await refetchManus();
    } finally {
      setManusSending(false);
    }
  };

  const handleSendAbacus = async () => {
    const text = abacusInputValue.trim();
    if (!text || abacusSending) return;
    setAbacusInputValue('');
    setAbacusSending(true);

    try {
      await sendToAgent({
        targetAgent: 'abacus',
        message: text,
        conversationId: abacusConversationId,
        mode: 'direct',
        onUpdateMessages: () => {}, // 🔥 FIX: Non usare setMessages, usa refetch
        onUpdateConversationId: setAbacusConversationId,
      });
      // 🔥 FIX: Ricarica messaggi dal database dopo la risposta
      await refetchAbacus();
    } finally {
      setAbacusSending(false);
    }
  };

  const handleSendZapier = async () => {
    const text = zapierInputValue.trim();
    if (!text || zapierSending) return;
    setZapierInputValue('');
    setZapierSending(true);

    try {
      await sendToAgent({
        targetAgent: 'zapier',
        message: text,
        conversationId: zapierConversationId,
        mode: 'direct',
        onUpdateMessages: () => {}, // 🔥 FIX: Non usare setMessages, usa refetch
        onUpdateConversationId: setZapierConversationId,
      });
      // 🔥 FIX: Ricarica messaggi dal database dopo la risposta
      await refetchZapier();
    } finally {
      setZapierSending(false);
    }
  };
  
  // ELIMINATO: loadConversationHistory() - causava 404 su endpoint inesistente
  // useAgentLogs per ogni agente gestisce automaticamente il caricamento
  
  // Fetch GIS Map Data (blocco ufficiale da GestioneMercati)
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_MIHUB_API_URL || 'https://mihub.157-90-29-66.nip.io';
    
    const fetchGisData = async () => {
      try {
        const [stallsRes, mapRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/markets/${gisMarketId}/stalls`),
          fetch(`${API_BASE_URL}/api/gis/market-map`)
        ]);

        const stallsData = await stallsRes.json();
        const mapDataRes = await mapRes.json();

        if (stallsData.success) {
          setGisStalls(stallsData.data);
        }
        if (mapDataRes.success) {
          setGisMapData(mapDataRes.data);
          if (mapDataRes.data?.center) {
            setGisMapCenter([mapDataRes.data.center.lat, mapDataRes.data.center.lng]);
          }
        }
      } catch (error) {
        console.error('[GIS Map] Error fetching data:', error);
      }
    };
    
    fetchGisData();
  }, [gisMarketId]);
  
  // Fetch Guardian logs from Neon database via Abacus SQL
  // 🔥 FIX: Carica attività agenti da agent_messages invece di guardian_logs
  // 🔥 FIX 27/01/2026: Ridotto polling e aggiunto controllo visibilità tab per risparmiare CPU Vercel
  useEffect(() => {
    const fetchAgentActivity = async () => {
      // Non fare polling se la tab non è visibile (risparmia CPU Vercel)
      if (document.hidden) {
        console.log('[DashboardPA] Tab non visibile, skip polling agenti');
        return;
      }
      try {
        // Carica gli ultimi messaggi degli agenti da tutte le conversazioni di coordinamento
        const conversationIds = [
          'mio-manus-coordination',
          'mio-abacus-coordination', 
          'mio-zapier-coordination',
          'mio-gptdev-coordination',
          'mio-main'
        ];
        
        const allLogs: any[] = [];
        
        for (const convId of conversationIds) {
          const response = await fetch(`/api/mihub/get-messages?conversation_id=${convId}&limit=20&order=desc`);
          const data = await response.json();
          if (data.success && Array.isArray(data.messages)) {
            // Trasforma i messaggi nel formato log
            const logs = data.messages.map((msg: any) => ({
              timestamp: msg.created_at,
              agent: msg.agent || msg.sender || 'unknown',
              status: 'allowed',
              method: msg.meta?.tool || 'message',
              path: msg.message?.substring(0, 100) + (msg.message?.length > 100 ? '...' : ''),
              reason: null,
              response_time_ms: null,
              conversation_id: msg.conversation_id
            }));
            allLogs.push(...logs);
          }
        }
        
        // Ordina per timestamp decrescente e prendi gli ultimi 50
        allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setGuardianLogs(allLogs.slice(0, 50));
        
      } catch (error) {
        console.error('Failed to fetch agent activity:', error);
        setGuardianLogs([]);
      }
    };
    fetchAgentActivity();
    // Refresh every 30 seconds for real-time updates (era 10s, aumentato per risparmiare CPU Vercel)
    const interval = setInterval(fetchAgentActivity, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Simula aggiornamento real-time
  const { isAnimating } = useAnimation();

  // Aggiorna realtimeData con dati reali dal backend
  useEffect(() => {
    if (realData.statsRealtime) {
      setRealtimeData(prev => ({
        ...prev,
        activeUsers: realData.statsRealtime.activeUsers || 0,
        activeVendors: realData.statsRealtime.activeVendors || 0,
        todayCheckins: realData.statsRealtime.todayCheckins || 0,
        todayTransactions: realData.statsRealtime.todayTransactions || 0
      }));
    }
  }, [realData.statsRealtime]);

  // Refresh realtime ogni 30 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAnimating) return;
      const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
      fetch(`${MIHUB_API}/stats/realtime`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRealtimeData(prev => ({
              ...prev,
              activeUsers: data.data.activeUsers || 0,
              activeVendors: data.data.activeVendors || 0,
              todayCheckins: data.data.todayCheckins || 0,
              todayTransactions: data.data.todayTransactions || 0
            }));
          }
        })
        .catch(err => console.log('Realtime refresh error:', err));
    }, 30000);

    return () => clearInterval(interval);
  }, [isAnimating]);

  const [location, setLocation] = useLocation();
  
  // Read URL param ?tab=mio and set activeTab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  // Scroll MIO chat to bottom
  const scrollMioToBottom = () => {
    if (mioMessagesRef.current) {
      mioMessagesRef.current.scrollTo({
        top: mioMessagesRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Scroll MIO quando cambiano messaggi
  useEffect(() => {
    if (!mioMessagesRef.current || mioMessages.length === 0) return;
    
    // Timeout per assicurarsi che il DOM sia aggiornato
    const timeoutId = setTimeout(() => {
      if (mioMessagesRef.current) {
        mioMessagesRef.current.scrollTo({
          top: mioMessagesRef.current.scrollHeight,
          behavior: 'smooth' // Animazione fluida
        });
      }
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [mioMessages]);

  // Listener scroll MIO per bottone
  useEffect(() => {
    const messagesDiv = mioMessagesRef.current;
    if (!messagesDiv) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesDiv;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowMioScrollButton(!isNearBottom);
    };

    messagesDiv.addEventListener('scroll', handleScroll);
    return () => messagesDiv.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll chat singole to bottom
  const scrollSingleChatToBottom = () => {
    if (singleChatMessagesRef.current) {
      singleChatMessagesRef.current.scrollTo({
        top: singleChatMessagesRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll chat singole quando cambiano messaggi (SOLO se utente è già in fondo)
  useEffect(() => {
    const messagesDiv = singleChatMessagesRef.current;
    if (!messagesDiv) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesDiv;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    // Scrolla SOLO se l'utente è già vicino al fondo (previene effetto molla)
    if (isNearBottom) {
      scrollSingleChatToBottom();
    }
  }, [gptdevMessages, manusMessages, abacusMessages, zapierMessages, selectedAgent]);

  // Scroll iniziale chat singole al mount
  useEffect(() => {
    const currentMessages = 
      selectedAgent === 'gptdev' ? gptdevMessages :
      selectedAgent === 'manus' ? manusMessages :
      selectedAgent === 'abacus' ? abacusMessages :
      zapierMessages;

    if (currentMessages.length > 0 && singleChatMessagesRef.current) {
      setTimeout(() => {
        if (singleChatMessagesRef.current) {
          singleChatMessagesRef.current.scrollTo({
            top: singleChatMessagesRef.current.scrollHeight,
            behavior: 'instant' as ScrollBehavior
          });
        }
      }, 300);
    }
  }, [selectedAgent]);

  // Listener scroll chat singole per bottone
  useEffect(() => {
    const messagesDiv = singleChatMessagesRef.current;
    if (!messagesDiv) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesDiv;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowSingleChatScrollButton(!isNearBottom);
    };

    messagesDiv.addEventListener('scroll', handleScroll);
    return () => messagesDiv.removeEventListener('scroll', handleScroll);
  }, []);

  // Documentation Modal handler
  const openDocModal = (docKey: string) => {
    const content: Record<string, { title: string; content: string }> = {
      executive_summary: {
        title: '🎯 Executive Summary',
        content: `
          <p><b>Versione:</b> 3.1 (Fix Bug Critici) | <b>Ultimo Aggiornamento:</b> 7 Dicembre 2025</p>
          <p class="mt-3">Il DMS Hub è un ecosistema integrato <b>operativo</b> per la gestione dei mercati, della mobilità sostenibile e dei servizi civici. La piattaforma si compone di:</p>
          <ul class="mt-2">
            <li>✅ <b>Frontend Dashboard PA</b> (React + Vite + TypeScript su Vercel)</li>
            <li>✅ <b>Backend MIO Hub</b> (Node.js + Express su Hetzner)</li>
            <li>✅ <b>5 Agenti AI Operativi</b> (MIO, GPT Dev, Manus, Abacus, Zapier)</li>
            <li>✅ <b>Database PostgreSQL</b> (39 tabelle su Neon)</li>
            <li>✅ <b>LLM Council</b> (Confronto multi-modello AI)</li>
            <li>⏳ <b>8 Applicazioni Web</b> (2 operative, 6 in sviluppo)</li>
          </ul>
          <p class="mt-4"><a href="https://github.com/Chcndr/dms-system-blueprint/blob/master/01_architettura/MASTER_SYSTEM_PLAN.md" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-semibold">📖 Apri Documentazione Completa su GitHub →</a></p>
        `
      },
      architettura_tecnica: {
        title: '🏭 Architettura Tecnica',
        content: `
          <p><b>Stack Tecnologico Operativo:</b></p>
          <ul class="mt-2">
            <li><b>Frontend:</b> React 18 + Vite + TypeScript + TailwindCSS (Vercel)</li>
            <li><b>Backend:</b> Node.js + Express + PM2 (Hetzner VPS)</li>
            <li><b>Database:</b> PostgreSQL 15 (Neon) - 39 tabelle</li>
            <li><b>LLM Council:</b> Python/FastAPI + React (Hetzner)</li>
            <li><b>Storage:</b> File system locale + GitHub logs</li>
          </ul>
          <p class="mt-3"><b>Domini Attivi:</b></p>
          <ul>
            <li>✅ <code>app.mio-hub.me</code> - Dashboard PA</li>
            <li>✅ <code>api.mio-hub.me</code> - Backend API (porta 3000)</li>
            <li>✅ <code>council.mio-hub.me</code> - LLM Council Frontend (porta 8002)</li>
            <li>✅ <code>council-api.mio-hub.me</code> - LLM Council API (porta 8001)</li>
          </ul>
          <p class="mt-4"><a href="https://github.com/Chcndr/dms-system-blueprint/blob/master/01_architettura/orchestratore-multi-agente.md" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-semibold">📖 Apri Architettura Completa su GitHub →</a></p>
        `
      },
      applicazioni_web: {
        title: '📱 8 Applicazioni Web',
        content: `
          <p><b>Stato delle Applicazioni Web:</b></p>
          <p class="mt-2"><b class="text-green-400">✅ OPERATIVE (2/8):</b></p>
          <ul>
            <li><b>Dashboard PA:</b> Centro di controllo per la Pubblica Amministrazione</li>
            <li><b>LLM Council:</b> Confronto e valutazione modelli AI (Gemini, GPT, Claude)</li>
          </ul>
          <p class="mt-3"><b class="text-yellow-400">⏳ IN SVILUPPO (6/8):</b></p>
          <ul>
            <li><b>BUS Hub:</b> Gestione trasporto pubblico e Centro Mobilità</li>
            <li><b>Core Map:</b> Mappa GIS interattiva con layer Pepe GIS</li>
            <li><b>Sito Pubblico:</b> Portale per cittadini e operatori</li>
            <li><b>Hub Operatore:</b> Gestione mercati e posteggi</li>
            <li><b>Vetrine Digitali:</b> Showcase prodotti Made in Italy</li>
            <li><b>Gestionale DMS:</b> Backoffice completo</li>
          </ul>
          <p class="mt-4"><a href="https://github.com/Chcndr/dms-system-blueprint/blob/master/01_architettura/MASTER_SYSTEM_PLAN.md" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-semibold">📖 Apri Documentazione Completa su GitHub →</a></p>
        `
      },
      integrazioni: {
        title: '⭐ Sistema Integrazioni',
        content: `
          <p><b>Integrazioni Operative:</b></p>
          <ul class="mt-2">
            <li>✅ <b>LLM Council:</b> Confronto multi-modello AI (Gemini, GPT, Claude)</li>
            <li>✅ <b>GitHub:</b> Gestione codice, CI/CD, deploy automatico</li>
            <li>✅ <b>Zapier:</b> Automazione workflow e integrazioni business</li>
            <li>✅ <b>Neon:</b> Database PostgreSQL serverless (39 tabelle)</li>
            <li>✅ <b>Pepe GIS:</b> Mappe interattive e layer geografici</li>
          </ul>
          <p class="mt-3"><b>In Sviluppo:</b></p>
          <ul>
            <li>⏳ <b>TPER:</b> Integrazione trasporto pubblico Bologna (Centro Mobilità)</li>
          </ul>
          <p class="mt-4"><a href="https://github.com/Chcndr/dms-system-blueprint/tree/master/07_guide_operative" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-semibold">📖 Apri Guide Operative su GitHub →</a></p>
        `
      },
      funzionalita_operative: {
        title: '✅ Funzionalità Operative',
        content: `
          <p><b>Funzionalità Operative (Aggiornato 07/12/2025):</b></p>
          <ul class="mt-2">
            <li>✅ <b>Orchestratore Multi-Agente:</b> MIO agent operativo (fix 07/12/2025)</li>
            <li>✅ <b>5 Agenti AI:</b> MIO, GPT Dev, Manus, Abacus, Zapier (tutti operativi)</li>
            <li>✅ <b>Guardian Logs:</b> Sistema di monitoring agenti (visibile in tab Logs)</li>
            <li>✅ <b>Chat Multi-Agente:</b> Vista singola + 4 quadranti con auto-scroll</li>
            <li>✅ <b>Dashboard PA:</b> Metriche real-time, grafici, analytics</li>
            <li>✅ <b>Backend API:</b> REST + tRPC su Hetzner (PM2)</li>
            <li>✅ <b>Database:</b> PostgreSQL Neon (39 tabelle)</li>
            <li>✅ <b>Deploy Automatico:</b> GitHub → Vercel + Hetzner</li>
            <li>✅ <b>LLM Council:</b> Confronto Gemini, GPT, Claude</li>
          </ul>
          <p class="mt-3"><b>Fix Recenti (07/12/2025):</b></p>
          <ul>
            <li>✅ Bug duplicazione messaggi - RISOLTO</li>
            <li>✅ Bug saveAgentLog - RISOLTO</li>
            <li>✅ Bug tool_calls Gemini - RISOLTO</li>
            <li>✅ Auto-scroll chat - RISOLTO</li>
          </ul>
          <p class="mt-4"><a href="https://github.com/Chcndr/dms-system-blueprint/blob/master/01_architettura/MASTER_SYSTEM_PLAN.md" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-semibold">📖 Apri Stato Completo su GitHub →</a></p>
        `
      },
      todo_prioritizzati: {
        title: '📅 TODO Prioritizzati',
        content: `
          <p><b>Roadmap Sviluppo (Aggiornato 07/12/2025):</b></p>
          <h4 class="text-red-400 font-semibold mt-3 mb-2">🔴 Alta Priorità</h4>
          <ul>
            <li>Completare integrazione Centro Mobilità TPER</li>
            <li>Verificare e completare le 6 applicazioni web in sviluppo</li>
            <li>Espandere Guardian logs con analytics avanzati</li>
            <li>Implementare sistema notifiche real-time</li>
          </ul>
          <h4 class="text-yellow-400 font-semibold mt-3 mb-2">🟡 Media Priorità</h4>
          <ul>
            <li>Aggiungere dashboard metriche sostenibilità</li>
            <li>Migliorare UI/UX vetrine digitali</li>
            <li>Documentazione API completa</li>
            <li>Configurare redirect domini www.mio-hub.me e mio-hub.me</li>
          </ul>
          <h4 class="text-green-400 font-semibold mt-3 mb-2">🟢 Bassa Priorità</h4>
          <ul>
            <li>Ottimizzazione performance query database</li>
            <li>Test automatici E2E</li>
            <li>Refactoring codice legacy</li>
          </ul>
          <p class="mt-4"><a href="https://github.com/Chcndr/dms-system-blueprint/blob/master/01_architettura/MASTER_SYSTEM_PLAN.md" target="_blank" class="text-cyan-400 hover:text-cyan-300 font-semibold">📖 Apri Roadmap Completa su GitHub →</a></p>
        `
      },
      stato_progetto: {
        title: '📋 Stato Progetto Aggiornato',
        content: `<p>Documento completo con stato attuale, architettura, funzionalità operative, TODO prioritizzati e guide.</p>`
      },
      resoconto_ecosistema: {
        title: '📊 Resoconto Completo Ecosistema',
        content: `<p>Resoconto originale completo dell'ecosistema DMS Hub con tutte le 8 applicazioni web integrate.</p>`
      }
    };
    setDocModalContent(content[docKey]);
  };

  const QuickAccessButton = ({ href, icon, label, color = 'teal', badge = 0 }: any) => (
    <button
      onClick={() => setLocation(href)}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
        color === 'orange'
          ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 text-[#f59e0b]'
          : color === 'yellow'
          ? 'bg-[#eab308]/10 border-[#eab308]/30 hover:bg-[#eab308]/20 text-[#eab308]'
          : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );

  const KPICard = ({ title, value, growth, icon: Icon, suffix = '' }: any) => (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[#e8fbff]/70">{title}</CardTitle>
        <Icon className="h-5 w-5 text-[#14b8a6]" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-[#e8fbff]">
          {value.toLocaleString()}{suffix}
        </div>
        {growth !== undefined && (
          <div className="flex items-center mt-2 text-sm">
            {growth >= 0 ? (
              <>
                <ArrowUpRight className="h-4 w-4 text-[#10b981] mr-1" />
                <span className="text-[#10b981]">+{growth}%</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="h-4 w-4 text-[#ef4444] mr-1" />
                <span className="text-[#ef4444]">{growth}%</span>
              </>
            )}
            <span className="text-[#e8fbff]/50 ml-2">vs mese scorso</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 🟢 System Status Indicators Component
  const SystemStatusIndicators = () => {
    const { apiStatus, pm2Status } = useSystemStatus(30000); // Check ogni 30s

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'online': return 'bg-green-400';
        case 'offline': return 'bg-red-500';
        case 'checking': return 'bg-yellow-400';
        default: return 'bg-gray-400';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'online': return 'Online';
        case 'offline': return 'Offline';
        case 'checking': return 'Check...';
        default: return 'Unknown';
      }
    };

    return (
      <div className="flex items-center gap-3">
        {/* Backend API Indicator */}
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(apiStatus)} ${apiStatus === 'online' ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-medium">API</span>
          <span className="text-xs opacity-75">{getStatusText(apiStatus)}</span>
        </div>

        {/* PM2 Status Indicator */}
        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(pm2Status)} ${pm2Status === 'online' ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-medium">PM2</span>
          <span className="text-xs opacity-75">{getStatusText(pm2Status)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1220] overflow-x-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white py-3 px-6 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Pulsante Home per tornare alla pagina principale */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/')}
              className="bg-white/20 hover:bg-white/30 text-white border-none"
              title="Torna alla Home"
            >
              <Home className="h-5 w-5" />
            </Button>
            <BarChart3 className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Dashboard PA - DMS HUB</h1>
              <p className="text-xs opacity-90">Analytics e Monitoraggio Ecosistema</p>
            </div>
          </div>
          
          {/* 🟢 Status Indicators */}
          <SystemStatusIndicators />
          
          <div className="flex items-center gap-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-white/20 text-white px-4 py-2 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="day">Oggi</option>
              <option value="week">Settimana</option>
              <option value="month">Mese</option>
              <option value="year">Anno</option>
            </select>
            <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Download className="h-4 w-4 mr-2" />
              Esporta Report
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Access Navigation */}
      <div className="bg-[#1a2332] border-b border-[#14b8a6]/30 py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-sm font-semibold text-[#e8fbff]/70 mb-3">Accesso Rapido Applicativi</h3>
          <div className="grid grid-cols-11 gap-2">
            <ProtectedQuickAccess quickId="home">
              <QuickAccessButton href="/" icon={<Store className="h-5 w-5" />} label="Home" />
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="wallet">
              <QuickAccessButton href="/wallet" icon={<Leaf className="h-5 w-5" />} label="Wallet" />
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="route">
              <QuickAccessButton href="/route" icon={<TrendingUp className="h-5 w-5" />} label="Route" />
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="civic">
              <QuickAccessButton href="/civic" icon={<AlertCircle className="h-5 w-5" />} label="Segnala" />
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="vetrine">
              <QuickAccessButton href="/vetrine" icon={<Store className="h-5 w-5" />} label="Vetrine" />
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="hub_operatore">
              <QuickAccessButton href="/hub-operatore" icon={<Activity className="h-5 w-5" />} label="Hub Operatore" color="orange" />
            </ProtectedQuickAccess>

            <ProtectedQuickAccess quickId="bus_hub">
            <button
              onClick={() => window.open('https://api.mio-hub.me/tools/bus_hub.html', '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-[#8b5cf6]/10 border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20 text-[#8b5cf6]"
            >
              <Wrench className="h-5 w-5" />
              <span className="text-sm font-medium">BUS HUB</span>
            </button>
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="core_map">
            <button
              onClick={() => window.open('https://chcndr.github.io/dms-gemello-core/index-grosseto.html', '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-[#f59e0b]/10 border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 text-[#f59e0b]"
            >
              <MapPin className="h-5 w-5" />
              <span className="text-sm font-medium">Core Map</span>
            </button>
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="sito_pubblico">
            <button
              onClick={() => window.open('https://chcndr.github.io/dms-gemello-core/', '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-[#10b981]/10 border-[#10b981]/30 hover:bg-[#10b981]/20 text-[#10b981]"
            >
              <Globe className="h-5 w-5" />
              <span className="text-sm font-medium">Sito Pubblico</span>
            </button>
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="dms_news">
            <button
              onClick={() => window.open('https://chcndr.github.io/dms-gemello-news/landing/home.html', '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-[#3b82f6]/10 border-[#3b82f6]/30 hover:bg-[#3b82f6]/20 text-[#3b82f6]"
            >
              <Newspaper className="h-5 w-5" />
              <span className="text-sm font-medium">DMS News</span>
            </button>
            </ProtectedQuickAccess>
            <ProtectedQuickAccess quickId="gestionale">
            <button
              onClick={() => window.open('https://lapsy-dms.herokuapp.com/index.html', '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-[#ef4444]/10 border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[#ef4444]"
            >
              <Rocket className="h-5 w-5" />
              <span className="text-sm font-medium">Gestionale DMS</span>
            </button>
            </ProtectedQuickAccess>
          </div>
        </div>
      </div>



      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Utenti Totali"
            value={realData.overview?.totalUsers || 0}
            growth={realData.overview?.userGrowth || 0}
            icon={Users}
          />
          <KPICard
            title="Mercati Attivi"
            value={realData.overview?.activeMarkets || 0}
            icon={Store}
          />
          <KPICard
            title="Transazioni"
            value={realData.overview?.totalTransactions || 0}
            growth={realData.overview?.transactionGrowth || 0}
            icon={ShoppingCart}
          />
          <KPICard
            title="Rating Sostenibilità"
            value={realData.overview?.sustainabilityRating || 0}
            icon={Leaf}
            suffix="/10"
          />
        </div>

        {/* Loading State */}
        {realData.isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="text-[#14b8a6] animate-pulse">Caricamento dati dal backend MIHUB...</div>
          </div>
        )}

        {/* Tabs Navigation - Stile Card */}
        <div className="bg-[#1a2332] border border-[#14b8a6]/30 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-[#e8fbff]/70 mb-3">Sezioni Dashboard</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <ProtectedTab tabId="dashboard">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#14b8a6] border-[#14b8a6] text-white shadow-lg'
                  : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
              }`}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-xs font-medium">Dashboard</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="users">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'users'
                  ? 'bg-[#14b8a6] border-[#14b8a6] text-white shadow-lg'
                  : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
              }`}
            >
              <Users className="h-6 w-6" />
              <span className="text-xs font-medium">Clienti</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="wallet">
            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'wallet'
                  ? 'bg-[#3b82f6] border-[#3b82f6] text-white shadow-lg'
                  : 'bg-[#3b82f6]/10 border-[#3b82f6]/30 hover:bg-[#3b82f6]/20 text-[#3b82f6]'
              }`}
            >
              <Euro className="h-6 w-6" />
              <span className="text-xs font-medium">Wallet/PagoPA</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="products">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'products'
                  ? 'bg-[#14b8a6] border-[#14b8a6] text-white shadow-lg'
                  : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
              }`}
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="text-xs font-medium">Prodotti</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="sustainability">
            <button
              onClick={() => setActiveTab('sustainability')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'sustainability'
                  ? 'bg-[#10b981] border-[#10b981] text-white shadow-lg'
                  : 'bg-[#10b981]/10 border-[#10b981]/30 hover:bg-[#10b981]/20 text-[#10b981]'
              }`}
            >
              <Leaf className="h-6 w-6" />
              <span className="text-xs font-medium">Sostenibilità</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="tpas">
            <button
              onClick={() => setActiveTab('tpas')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'tpas'
                  ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-lg'
                  : 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20 text-[#8b5cf6]'
              }`}
            >
              <Package className="h-6 w-6" />
              <span className="text-xs font-medium">TPAS</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="carboncredits">
            <button
              onClick={() => setActiveTab('carboncredits')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'carboncredits'
                  ? 'bg-[#f59e0b] border-[#f59e0b] text-white shadow-lg'
                  : 'bg-[#f59e0b]/10 border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 text-[#f59e0b]'
              }`}
            >
              <Coins className="h-6 w-6" />
              <span className="text-xs font-medium">Carbon Credits</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="realtime">
            <button
              onClick={() => setActiveTab('realtime')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'realtime'
                  ? 'bg-[#ef4444] border-[#ef4444] text-white shadow-lg'
                  : 'bg-[#ef4444]/10 border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[#ef4444]'
              }`}
            >
              <Activity className="h-6 w-6" />
              <span className="text-xs font-medium">Real-time</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="sistema">
            <button
              onClick={() => setActiveTab('sistema')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'sistema'
                  ? 'bg-[#06b6d4] border-[#06b6d4] text-white shadow-lg'
                  : 'bg-[#06b6d4]/10 border-[#06b6d4]/30 hover:bg-[#06b6d4]/20 text-[#06b6d4]'
              }`}
            >
              <Terminal className="h-6 w-6" />
              <span className="text-xs font-medium">Sistema</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="ai">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'ai'
                  ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-lg'
                  : 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20 text-[#8b5cf6]'
              }`}
            >
              <Bot className="h-6 w-6" />
              <span className="text-xs font-medium">Agente AI</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="security">
            <button
              onClick={() => setActiveTab('security')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'security'
                  ? 'bg-[#ef4444] border-[#ef4444] text-white shadow-lg'
                  : 'bg-[#ef4444]/10 border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[#ef4444]'
              }`}
            >
              <Shield className="h-6 w-6" />
              <span className="text-xs font-medium">Sicurezza</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="ssosuap">
            <button
              onClick={() => setActiveTab('ssosuap')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'ssosuap'
                  ? 'bg-[#f59e0b] border-[#f59e0b] text-white shadow-lg'
                  : 'bg-[#f59e0b]/10 border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 text-[#f59e0b]'
              }`}
            >
              <FileText className="h-6 w-6" />
              <span className="text-xs font-medium">SSO SUAP</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="businesses">
            <button
              onClick={() => setActiveTab('businesses')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'businesses'
                  ? 'bg-[#10b981] border-[#10b981] text-white shadow-lg'
                  : 'bg-[#10b981]/10 border-[#10b981]/30 hover:bg-[#10b981]/20 text-[#10b981]'
              }`}
            >
              <Building2 className="h-6 w-6" />
              <span className="text-xs font-medium">Qualificazione</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="civic">
            <button
              onClick={() => setActiveTab('civic')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'civic'
                  ? 'bg-[#06b6d4] border-[#06b6d4] text-white shadow-lg'
                  : 'bg-[#06b6d4]/10 border-[#06b6d4]/30 hover:bg-[#06b6d4]/20 text-[#06b6d4]'
              }`}
            >
              <Radio className="h-6 w-6" />
              <span className="text-xs font-medium">Segnalazioni & IoT</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="comuni">
            <button
              onClick={() => setActiveTab('comuni')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'comuni'
                  ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-lg'
                  : 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20 text-[#8b5cf6]'
              }`}
            >
              <Building2 className="h-6 w-6" />
              <span className="text-xs font-medium">Comuni</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="inspections">
            <button
              onClick={() => setActiveTab('inspections')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'inspections'
                  ? 'bg-[#f59e0b] border-[#f59e0b] text-white shadow-lg'
                  : 'bg-[#f59e0b]/10 border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 text-[#f59e0b]'
              }`}
            >
              <Scale className="h-6 w-6" />
              <span className="text-xs font-medium">Controlli/Sanzioni</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="notifications">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'notifications'
                  ? 'bg-[#ec4899] border-[#ec4899] text-white shadow-lg'
                  : 'bg-[#ec4899]/10 border-[#ec4899]/30 hover:bg-[#ec4899]/20 text-[#ec4899]'
              }`}
            >
              <Bell className="h-6 w-6" />
              <span className="text-xs font-medium">Notifiche</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="mobility">
            <button
              onClick={() => setActiveTab('mobility')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'mobility'
                  ? 'bg-[#3b82f6] border-[#3b82f6] text-white shadow-lg'
                  : 'bg-[#3b82f6]/10 border-[#3b82f6]/30 hover:bg-[#3b82f6]/20 text-[#3b82f6]'
              }`}
            >
              <Train className="h-6 w-6" />
              <span className="text-xs font-medium">Centro Mobilità</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="reports">
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'reports'
                  ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-lg'
                  : 'bg-[#a855f7]/10 border-[#a855f7]/30 hover:bg-[#a855f7]/20 text-[#a855f7]'
              }`}
            >
              <FileBarChart className="h-6 w-6" />
              <span className="text-xs font-medium">Report</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="integrations">
            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'integrations'
                  ? 'bg-[#14b8a6] border-[#14b8a6] text-white shadow-lg'
                  : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
              }`}
            >
              <Plug className="h-6 w-6" />
              <span className="text-xs font-medium">Integrazioni</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="settings">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#64748b] border-[#64748b] text-white shadow-lg'
                  : 'bg-[#64748b]/10 border-[#64748b]/30 hover:bg-[#64748b]/20 text-[#64748b]'
              }`}
            >
              <SettingsIcon className="h-6 w-6" />
              <span className="text-xs font-medium">Impostazioni</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="mercati">
            <button
              onClick={() => setActiveTab('mercati')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'mercati'
                  ? 'bg-[#f59e0b] border-[#f59e0b] text-white shadow-lg'
                  : 'bg-[#f59e0b]/10 border-[#f59e0b]/30 hover:bg-[#f59e0b]/20 text-[#f59e0b]'
              }`}
            >
              <Building2 className="h-6 w-6" />
              <span className="text-xs font-medium">Gestione Mercati</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="imprese">
            <button
              onClick={() => setActiveTab('imprese')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'imprese'
                  ? 'bg-[#10b981] border-[#10b981] text-white shadow-lg'
                  : 'bg-[#10b981]/10 border-[#10b981]/30 hover:bg-[#10b981]/20 text-[#10b981]'
              }`}
            >
              <Building2 className="h-6 w-6" />
              <span className="text-xs font-medium">Imprese</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="docs">
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'docs'
                  ? 'bg-[#06b6d4] border-[#06b6d4] text-white shadow-lg'
                  : 'bg-[#06b6d4]/10 border-[#06b6d4]/30 hover:bg-[#06b6d4]/20 text-[#06b6d4]'
              }`}
            >
              <FileText className="h-6 w-6" />
              <span className="text-xs font-medium">Enti & Associazioni</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="mio">
            <button
              onClick={() => {
                setActiveTab('mio');
                // Non impostiamo più viewMode qui, lasciamo il default 'quad'
                setSelectedAgent('mio');
                // Scroll automatico alla chat MIO dopo un breve delay
                setTimeout(() => {
                  if (mioMessagesRef.current) {
                    mioMessagesRef.current.scrollTo({
                      top: mioMessagesRef.current.scrollHeight,
                      behavior: 'smooth'
                    });
                  }
                }, 300);
              }}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'mio'
                  ? 'bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-lg'
                  : 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30 hover:bg-[#8b5cf6]/20 text-[#8b5cf6]'
              }`}
            >
              <Bot className="h-6 w-6" />
              <span className="text-xs font-medium">MIO Agent</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="mappa">
            <button
              onClick={() => setActiveTab('mappa')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'mappa'
                  ? 'bg-[#14b8a6] border-[#14b8a6] text-white shadow-lg'
                  : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
              }`}
            >
              <MapPin className="h-6 w-6" />
              <span className="text-xs font-medium">Mappa GIS</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="workspace">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                activeTab === 'workspace'
                  ? 'bg-[#06b6d4] border-[#06b6d4] text-white shadow-lg'
                  : 'bg-[#06b6d4]/10 border-[#06b6d4]/30 hover:bg-[#06b6d4]/20 text-[#06b6d4]'
              }`}
            >
              <Globe className="h-6 w-6" />
              <span className="text-xs font-medium">Gestione HUB</span>
            </button>
            </ProtectedTab>
            <ProtectedTab tabId="council">
            <button
              onClick={() => window.location.href = '/council'}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg border transition-all bg-gradient-to-br from-[#a855f7]/10 to-[#ec4899]/10 border-[#a855f7]/30 hover:from-[#a855f7]/20 hover:to-[#ec4899]/20 text-[#a855f7] hover:scale-105"
            >
              <Scale className="h-6 w-6" />
              <span className="text-xs font-medium">Concilio AI</span>
            </button>
            </ProtectedTab>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          {/* TAB: DASHBOARD (Overview + Mercati unificati) */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Sotto-tab interni */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDashboardSubTab('overview')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  dashboardSubTab === 'overview'
                    ? 'bg-[#14b8a6] border-[#14b8a6] text-white'
                    : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
                }`}
              >
                <span className="text-sm font-medium">Overview</span>
              </button>
              <button
                onClick={() => setDashboardSubTab('mercati')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  dashboardSubTab === 'mercati'
                    ? 'bg-[#14b8a6] border-[#14b8a6] text-white'
                    : 'bg-[#14b8a6]/10 border-[#14b8a6]/30 hover:bg-[#14b8a6]/20 text-[#14b8a6]'
                }`}
              >
                <span className="text-sm font-medium">Mercati</span>
              </button>
            </div>

            {/* Contenuto Overview */}
            {dashboardSubTab === 'overview' && (
              <div className="space-y-6">
            {/* Crescita Utenti - Dati Reali dal Backend */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#14b8a6]" />
                  Crescita Utenti
                  {realData.statsGrowth?.growth && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {realData.statsGrowth?.growth && realData.statsGrowth.growth.length > 0 ? (
                  <div className="h-64 flex items-end justify-between gap-2">
                    {(realData.statsGrowth?.growth || []).map((item: any, i: number) => {
                      const growthData = realData.statsGrowth?.growth || [];
                      const maxUsers = Math.max(...growthData.map((d: any) => parseInt(d.new_users) || 0));
                      const currentValue = parseInt(item.new_users) || 0;
                      // Formatta la data della settimana
                      const weekDate = new Date(item.week);
                      const formattedDate = weekDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-[#14b8a6]/20 rounded-t-lg relative" style={{ height: `${maxUsers > 0 ? (currentValue / maxUsers) * 100 : 0}%`, minHeight: '20px' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-[#14b8a6] to-[#14b8a6]/50 rounded-t-lg"></div>
                          </div>
                          <span className="text-xs text-[#e8fbff]/70">{formattedDate}</span>
                          <span className="text-sm font-semibold text-[#14b8a6]">{currentValue.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-[#14b8a6]/30 mx-auto mb-2" />
                      <p className="text-[#e8fbff]/50">Caricamento dati crescita...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mappa Rete HUB Italia - Overview */}
            <GestioneHubMapWrapper />
              </div>
            )}

            {/* Contenuto Mercati */}
            {dashboardSubTab === 'mercati' && (
              <div className="space-y-6">
                {/* Mappa Rete HUB Italia - Mercati */}
                <GestioneHubMapWrapper />

                <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <Store className="h-5 w-5 text-[#14b8a6]" />
                      Ranking Mercati Più Frequentati
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockData.topMarkets.map((market, i) => (
                      <div key={i} className="p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20 hover:border-[#14b8a6]/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-[#14b8a6]">#{market.rank}</span>
                            <span className="text-[#e8fbff] font-semibold">{market.name}</span>
                          </div>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, j) => (
                              <span key={j} className={j < market.rank ? 'text-[#f59e0b]' : 'text-[#e8fbff]/20'}>⭐</span>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-[#e8fbff]/70">Visite</span>
                            <p className="text-[#14b8a6] font-semibold">{market.visits.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-[#e8fbff]/70">Utenti Unici</span>
                            <p className="text-[#14b8a6] font-semibold">{market.users.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-[#e8fbff]/70">Durata Media</span>
                            <p className="text-[#14b8a6] font-semibold">{market.duration} min</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* TAB: CLIENTI - Anagrafica Cittadini */}
          <TabsContent value="users" className="space-y-6">
            <ClientiTab />
          </TabsContent>

          {/* TAB: WALLET / PAGOPA - Borsellino Elettronico Prepagato */}
          <TabsContent value="wallet" className="space-y-6">
            <WalletPanel />
          </TabsContent>

          {/* TAB 4: PRODOTTI */}
          <TabsContent value="products" className="space-y-6">
            {/* Avviso dati non disponibili */}
            <Card className="bg-[#1a2332] border-[#f59e0b]/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#f59e0b]/10 rounded-lg">
                    <Clock className="h-8 w-8 text-[#f59e0b]" />
                  </div>
                  <div>
                    <h3 className="text-[#e8fbff] font-semibold text-lg">Modulo Prodotti in Sviluppo</h3>
                    <p className="text-[#e8fbff]/70">I dati sui prodotti saranno disponibili con l'integrazione TPAS (Q1 2027)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Categorie - Struttura Futura */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30 opacity-60">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-[#14b8a6]" />
                  Categorie Più Acquistate
                  <span className="text-xs text-[#f59e0b] ml-2">Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-[#14b8a6]/30 mx-auto mb-3" />
                  <p className="text-[#e8fbff]/50">Dati categorie non ancora disponibili</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-1">Richiede integrazione con sistema vendite</p>
                </div>
              </CardContent>
            </Card>

            {/* Preview Certificazioni - Struttura Futura */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30 opacity-60">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#14b8a6]" />
                  Certificazioni Prodotti
                  <span className="text-xs text-[#f59e0b] ml-2">Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-[#14b8a6]/30 mx-auto mb-3" />
                  <p className="text-[#e8fbff]/50">Dati certificazioni non ancora disponibili</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-1">Richiede integrazione con database prodotti</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: SOSTENIBILITÀ */}
          <TabsContent value="sustainability" className="space-y-6">
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-[#14b8a6]" />
                  Rating Sostenibilità Popolazione
                  {realData.statsOverview && <span className="text-xs text-[#10b981] ml-2">● Dati Reali</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold text-[#14b8a6] mb-2">
                    {realData.overview?.sustainabilityRating || 0}/10
                  </div>
                  <p className="text-[#e8fbff]/70">Media popolazione basata su TCC</p>
                </div>
                
                {/* Dati TCC Reali */}
                {realData.statsOverview?.tcc && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-[#0b1220] rounded-lg border border-[#10b981]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf className="h-5 w-5 text-[#10b981]" />
                        <span className="text-[#e8fbff]/70 text-sm">TCC in Circolazione</span>
                      </div>
                      <div className="text-3xl font-bold text-[#10b981]">
                        {(realData.statsOverview.tcc.total_in_circulation || 0).toLocaleString('it-IT')}
                      </div>
                    </div>
                    <div className="p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-[#14b8a6]" />
                        <span className="text-[#e8fbff]/70 text-sm">TCC Emessi Totali</span>
                      </div>
                      <div className="text-3xl font-bold text-[#14b8a6]">
                        {(realData.statsOverview.tcc.total_issued || 0).toLocaleString('it-IT')}
                      </div>
                    </div>
                    <div className="p-4 bg-[#0b1220] rounded-lg border border-[#f59e0b]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-[#f59e0b]" />
                        <span className="text-[#e8fbff]/70 text-sm">TCC Riscattati</span>
                      </div>
                      <div className="text-3xl font-bold text-[#f59e0b]">
                        {(realData.statsOverview.tcc.total_redeemed || 0).toLocaleString('it-IT')}
                      </div>
                    </div>
                    <div className="p-4 bg-[#0b1220] rounded-lg border border-[#8b5cf6]/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-[#8b5cf6]" />
                        <span className="text-[#e8fbff]/70 text-sm">Utenti TCC</span>
                      </div>
                      <div className="text-3xl font-bold text-[#8b5cf6]">
                        {(realData.statsOverview.tcc.active_users || 0).toLocaleString('it-IT')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Indicatori Sostenibilità */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">Carbon Credits (TCC)</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-[#14b8a6]/20 rounded-full h-2">
                        <div className="bg-[#14b8a6] h-2 rounded-full" style={{ width: `${Math.min((realData.statsOverview?.tcc?.total_in_circulation || 0) / 20000 * 100, 100)}%` }}></div>
                      </div>
                      <span className="text-[#14b8a6] font-semibold">
                        {((realData.statsOverview?.tcc?.total_in_circulation || 0) / 2000).toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">Tasso Riscatto TCC</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-[#14b8a6]/20 rounded-full h-2">
                        <div className="bg-[#10b981] h-2 rounded-full" style={{ 
                          width: `${realData.statsOverview?.tcc?.total_issued > 0 
                            ? ((realData.statsOverview?.tcc?.total_redeemed || 0) / (realData.statsOverview?.tcc?.total_issued || 1) * 100) 
                            : 0}%` 
                        }}></div>
                      </div>
                      <span className="text-[#10b981] font-semibold">
                        {realData.statsOverview?.tcc?.total_issued > 0 
                          ? (((realData.statsOverview?.tcc?.total_redeemed || 0) / (realData.statsOverview?.tcc?.total_issued || 1) * 10).toFixed(1))
                          : '0.0'}/10
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">CO₂ Risparmiata</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#10b981] font-semibold">
                        {((realData.statsOverview?.tcc?.total_redeemed || 0)).toLocaleString('it-IT')} kg
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">Alberi Equivalenti</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#14b8a6] font-semibold">
                        {Math.round((realData.statsOverview?.tcc?.total_redeemed || 0) / 22)} alberi
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: TPAS */}
          <TabsContent value="tpas" className="space-y-6">
            {/* E-commerce vs Fisico */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#14b8a6]" />
                  E-commerce vs Negozi Fisici
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-[#ef4444]" />
                      <span className="text-[#e8fbff] font-semibold">E-commerce</span>
                    </div>
                    <div className="text-3xl font-bold text-[#ef4444] mb-1">
                      {mockData.ecommerceVsPhysical.ecommerce.percentage}%
                    </div>
                    <div className="text-sm text-[#e8fbff]/70">
                      {mockData.ecommerceVsPhysical.ecommerce.purchases.toLocaleString()} acquisti
                    </div>
                    <div className="text-sm text-[#ef4444] mt-2">
                      CO₂: {mockData.ecommerceVsPhysical.ecommerce.avgCo2} kg/acquisto
                    </div>
                  </div>
                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="h-5 w-5 text-[#10b981]" />
                      <span className="text-[#e8fbff] font-semibold">Negozi Fisici</span>
                    </div>
                    <div className="text-3xl font-bold text-[#10b981] mb-1">
                      {mockData.ecommerceVsPhysical.physical.percentage}%
                    </div>
                    <div className="text-sm text-[#e8fbff]/70">
                      {mockData.ecommerceVsPhysical.physical.purchases.toLocaleString()} acquisti
                    </div>
                    <div className="text-sm text-[#10b981] mt-2">
                      CO₂: {mockData.ecommerceVsPhysical.physical.avgCo2} kg/acquisto
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-[#10b981]">
                    <Leaf className="h-5 w-5" />
                    <span className="font-semibold">
                      Risparmio CO₂ acquisti fisici: {mockData.ecommerceVsPhysical.co2Savings.toLocaleString()} kg/mese
                    </span>
                  </div>
                  <p className="text-sm text-[#e8fbff]/70 mt-2">Equivalente a 200 alberi piantati</p>
                </div>
              </CardContent>
            </Card>

            {/* Origine Prodotti */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#14b8a6]" />
                  Origine Prodotti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🇮🇹</span>
                    <span className="text-[#e8fbff]">Locale (0-50km)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#e8fbff]/70">{mockData.productOrigin.local.count.toLocaleString()}</span>
                    <span className="font-semibold text-[#10b981]">{mockData.productOrigin.local.percentage}%</span>
                    <span className="text-xs text-[#10b981]">CO₂: {mockData.productOrigin.local.avgCo2} kg</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🇮🇹</span>
                    <span className="text-[#e8fbff]">Nazionale</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#e8fbff]/70">{mockData.productOrigin.national.count.toLocaleString()}</span>
                    <span className="font-semibold text-[#14b8a6]">{mockData.productOrigin.national.percentage}%</span>
                    <span className="text-xs text-[#f59e0b]">CO₂: {mockData.productOrigin.national.avgCo2} kg</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🇪🇺</span>
                    <span className="text-[#e8fbff]">UE</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#e8fbff]/70">{mockData.productOrigin.eu.count.toLocaleString()}</span>
                    <span className="font-semibold text-[#f59e0b]">{mockData.productOrigin.eu.percentage}%</span>
                    <span className="text-xs text-[#ef4444]">CO₂: {mockData.productOrigin.eu.avgCo2} kg</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌍</span>
                    <span className="text-[#e8fbff]">Extra-UE</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#e8fbff]/70">{mockData.productOrigin.extraEu.count.toLocaleString()}</span>
                    <span className="font-semibold text-[#ef4444]">{mockData.productOrigin.extraEu.percentage}%</span>
                    <span className="text-xs text-[#ef4444]">CO₂: {mockData.productOrigin.extraEu.avgCo2} kg</span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-[#8b5cf6]">
                    <Award className="h-5 w-5" />
                    <span className="font-semibold">Sustainability Score: 8.5/10</span>
                  </div>
                  <p className="text-sm text-[#e8fbff]/70 mt-2">88% prodotti italiani, 60% locali</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 7: CARBON CREDITS */}
          <TabsContent value="carboncredits" className="space-y-6">
            {/* SELETTORE COMUNE - TCC v2.1 */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#14b8a6]" />
                  Seleziona Comune
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <select
                    value={selectedComuneId || ''}
                    onChange={(e) => setSelectedComuneId(parseInt(e.target.value))}
                    className="flex-1 p-3 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent"
                  >
                    {tccComuni.length === 0 && (
                      <option value="">Caricamento comuni...</option>
                    )}
                    {tccComuni.map((comune) => (
                      <option key={comune.hub_id} value={comune.hub_id}>
                        {comune.nome} ({comune.provincia}) - {comune.hub_name}
                      </option>
                    ))}
                  </select>
                  {tccComuni.length > 0 && (
                    <div className="text-sm text-[#e8fbff]/70">
                      <span className="text-[#14b8a6] font-semibold">{tccComuni.length}</span> hub attivi
                    </div>
                  )}
                </div>
                {tccComuni.length === 0 && (
                  <div className="mt-2 text-sm text-[#f59e0b]">
                    Nessun comune con area geografica definita. Crea prima un'area hub.
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* DATI AMBIENTALI IN TEMPO REALE */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#14b8a6]" />
                  Dati Ambientali in Tempo Reale
                  {envLoading && <RefreshCw className="h-4 w-4 animate-spin text-[#14b8a6]" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* METEO */}
                  <div className="p-4 bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 border border-[#3b82f6]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CloudRain className="h-5 w-5 text-[#3b82f6]" />
                      <span className="text-sm font-semibold text-[#e8fbff]">Meteo</span>
                    </div>
                    {envData?.weather ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">Temperatura</span>
                          <span className="text-2xl font-bold text-[#3b82f6]">{envData.weather.temperature}°C</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">Condizioni</span>
                          <span className="text-sm text-[#e8fbff]">{envData.weather.weather_description}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">Umidità</span>
                          <span className="text-sm text-[#e8fbff]">{envData.weather.humidity}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">Vento</span>
                          <span className="text-sm text-[#e8fbff]">{envData.weather.wind_speed} km/h</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[#e8fbff]/50 text-sm">Caricamento...</div>
                    )}
                  </div>
                  
                  {/* QUALITÀ ARIA */}
                  <div className="p-4 bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border border-[#10b981]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Wind className="h-5 w-5 text-[#10b981]" />
                      <span className="text-sm font-semibold text-[#e8fbff]">Qualità Aria</span>
                    </div>
                    {envData?.air_quality ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">AQI Europeo</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold" style={{ color: envData.air_quality.aqi_color }}>{envData.air_quality.european_aqi}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: envData.air_quality.aqi_color + '30', color: envData.air_quality.aqi_color }}>{envData.air_quality.aqi_label}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="text-center p-2 bg-[#0b1220] rounded">
                            <div className="text-xs text-[#e8fbff]/50">PM10</div>
                            <div className="text-sm font-semibold text-[#e8fbff]">{envData.air_quality.pm10?.toFixed(1)}</div>
                          </div>
                          <div className="text-center p-2 bg-[#0b1220] rounded">
                            <div className="text-xs text-[#e8fbff]/50">PM2.5</div>
                            <div className="text-sm font-semibold text-[#e8fbff]">{envData.air_quality.pm2_5?.toFixed(1)}</div>
                          </div>
                          <div className="text-center p-2 bg-[#0b1220] rounded">
                            <div className="text-xs text-[#e8fbff]/50">NO₂</div>
                            <div className="text-sm font-semibold text-[#e8fbff]">{envData.air_quality.no2?.toFixed(1)}</div>
                          </div>
                          <div className="text-center p-2 bg-[#0b1220] rounded">
                            <div className="text-xs text-[#e8fbff]/50">O₃</div>
                            <div className="text-sm font-semibold text-[#e8fbff]">{envData.air_quality.o3?.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[#e8fbff]/50 text-sm">Caricamento...</div>
                    )}
                  </div>
                  
                  {/* PREZZO ETS */}
                  <div className="p-4 bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border border-[#f59e0b]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Euro className="h-5 w-5 text-[#f59e0b]" />
                      <span className="text-sm font-semibold text-[#e8fbff]">Prezzo EU ETS</span>
                    </div>
                    {envData?.ets ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">€/tonnellata CO₂</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-[#f59e0b]">€</span>
                            <input
                              type="number"
                              value={editableEtsPrice}
                              onChange={(e) => setEditableEtsPrice(parseFloat(e.target.value) || 0)}
                              onBlur={handleEtsPriceUpdate}
                              className="w-20 text-2xl font-bold text-[#f59e0b] bg-transparent border-b border-[#f59e0b]/50 focus:border-[#f59e0b] outline-none text-right"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">Valore 1 TCC</span>
                          <span className="text-lg font-semibold text-[#14b8a6]">€{(envData.tcc?.effective_value || 0).toLocaleString('it-IT', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#e8fbff]/70 text-sm">Policy Multiplier</span>
                          <span className="text-sm text-[#e8fbff]">{envData.tcc?.policy_multiplier}x</span>
                        </div>
                        <div className="text-xs text-[#e8fbff]/50 mt-2 pt-2 border-t border-[#f59e0b]/20">
                          Formula: 1 TCC = 1 kg CO₂ = ETS/1000
                        </div>
                      </div>
                    ) : (
                      <div className="text-[#e8fbff]/50 text-sm">Caricamento...</div>
                    )}
                  </div>
                </div>
                
                {/* Info Hub e Timestamp */}
                {envData?.hub && (
                  <div className="mt-4 flex items-center justify-between text-xs text-[#e8fbff]/50">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{envData.hub.city} ({envData.hub.coordinates.lat.toFixed(4)}, {envData.hub.coordinates.lon.toFixed(4)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Aggiornato: {new Date(envData.timestamp).toLocaleTimeString('it-IT')}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* DATI REALI DAL DATABASE */}
            {fundStats && (
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#14b8a6]" />
                    Statistiche TCC in Tempo Reale
                    {fundLoading && <RefreshCw className="h-4 w-4 animate-spin text-[#14b8a6]" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/5 border border-[#14b8a6]/30 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">TCC in Circolazione</div>
                      <div className="text-3xl font-bold text-[#14b8a6]">{formatNumberIT(fundStats.total_circulation)}</div>
                      <div className="text-xs text-[#e8fbff]/50">Nei wallet utenti</div>
                    </div>
                    <div className="p-4 bg-[#0b1220] border border-[#10b981]/20 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">TCC Totali Rilasciati</div>
                      <div className="text-2xl font-bold text-[#10b981]">{formatNumberIT(fundStats.total_issued)}</div>
                      <div className="text-xs text-[#e8fbff]/50">Dagli operatori</div>
                    </div>
                    <div className="p-4 bg-[#0b1220] border border-[#f59e0b]/20 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">TCC Totali Riscattati</div>
                      <div className="text-2xl font-bold text-[#f59e0b]">{formatNumberIT(fundStats.total_redeemed)}</div>
                      <div className="text-xs text-[#e8fbff]/50">Dai clienti</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-[#8b5cf6]/20 to-[#8b5cf6]/5 border border-[#8b5cf6]/30 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">Fabbisogno Fondo</div>
                      <div className="text-2xl font-bold text-[#8b5cf6]">{formatEuroIT(fundStats.fund_requirement_eur)}</div>
                      <div className="text-xs text-[#e8fbff]/50">Per coprire circolazione</div>
                    </div>
                  </div>
                  
                  {/* Statistiche Oggi */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                      <div className="text-xs text-[#e8fbff]/70">Rilasciati Oggi</div>
                      <div className="text-xl font-bold text-[#10b981]">{formatNumberIT(fundStats.today?.issued || 0)} TCC</div>
                    </div>
                    <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                      <div className="text-xs text-[#e8fbff]/70">Riscattati Oggi</div>
                      <div className="text-xl font-bold text-[#f59e0b]">{formatNumberIT(fundStats.today?.redeemed || 0)} TCC</div>
                    </div>
                    <div className="p-3 bg-[#14b8a6]/10 border border-[#14b8a6]/30 rounded-lg">
                      <div className="text-xs text-[#e8fbff]/70">Vendite Oggi</div>
                      <div className="text-xl font-bold text-[#14b8a6]">{formatEuroIT(fundStats.today?.sales_eur || 0)}</div>
                    </div>
                  </div>
                  
                  {/* Utenti */}
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-[#14b8a6]" />
                      <span className="text-[#e8fbff]">Utenti Registrati</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#e8fbff]">{formatNumberIT(fundStats.users?.total || 0)}</div>
                        <div className="text-xs text-[#e8fbff]/50">Totali</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#10b981]">{formatNumberIT(fundStats.users?.active || 0)}</div>
                        <div className="text-xs text-[#e8fbff]/50">Con TCC</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Fondo Liquidità - SIMULATORE */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#14b8a6]" />
                  Fondo Liquidità
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border border-[#10b981]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Saldo Attuale (click to edit)</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#10b981]">€</span>
                      <input
                        type="number"
                        value={editableParams.fundBalance}
                        onChange={(e) => setEditableParams({ ...editableParams, fundBalance: parseFloat(e.target.value) || 0 })}
                        className="text-3xl font-bold text-[#10b981] bg-transparent border-b-2 border-[#10b981]/50 focus:border-[#10b981] outline-none w-full"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Burn Rate (click to edit)</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#f59e0b]">€</span>
                      <input
                        type="number"
                        value={editableParams.burnRate}
                        onChange={(e) => setEditableParams({ ...editableParams, burnRate: parseFloat(e.target.value) || 0 })}
                        className="text-2xl font-bold text-[#f59e0b] bg-transparent border-b-2 border-[#f59e0b]/50 focus:border-[#f59e0b] outline-none w-full"
                      />
                      <span className="text-sm text-[#e8fbff]/70">/mese</span>
                    </div>
                  </div>
                  <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Mesi Rimanenti</div>
                    <div className="text-2xl font-bold text-[#14b8a6]">
                      {calculateMonthsRemaining()}
                    </div>
                  </div>
                  <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Valuta</div>
                    <div className="text-2xl font-bold text-[#e8fbff]">
                      EUR
                    </div>
                  </div>
                </div>

                {/* Entrate */}
                <div className="mb-4">
                  <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#10b981]" />
                    Entrate Fondo
                  </h4>
                  <div className="space-y-2">
                    {(fundStats?.sources || [
                      { name: 'Fondo Comunale', amount: editableParams.fundBalance, date: new Date().toISOString().split('T')[0] }
                    ]).map((source: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center gap-3">
                          <Coins className="h-5 w-5 text-[#10b981]" />
                          <div>
                            <div className="text-[#e8fbff] font-medium">{source.name}</div>
                            <div className="text-xs text-[#e8fbff]/50">{source.date}</div>
                          </div>
                        </div>
                        <div className="text-[#10b981] font-semibold">+€{(source.amount || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Uscite */}
                <div>
                  <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-[#ef4444]" />
                    Uscite Fondo
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
                      <div className="text-xs text-[#e8fbff]/70 mb-1">Rimborsi</div>
                      <div className="text-xl font-bold text-[#ef4444]">
                        €{(fundStats?.expenses?.reimbursements || parseFloat(calculateReimbursementNeeded())).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                      <div className="text-xs text-[#e8fbff]/70 mb-1">Incentivi</div>
                      <div className="text-xl font-bold text-[#f59e0b]">
                        €{(fundStats?.expenses?.incentives || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                      <div className="text-xs text-[#e8fbff]/70 mb-1">Operativi</div>
                      <div className="text-xl font-bold text-[#8b5cf6]">
                        €{(fundStats?.expenses?.operations || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valore TCC e Manopola Politica */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Valore TCC */}
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Coins className="h-5 w-5 text-[#14b8a6]" />
                    Valore Token Carbon Credit (TCC)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <div className="text-sm text-[#e8fbff]/70 mb-2">Valore Corrente</div>
                    <div className="text-5xl font-bold text-[#14b8a6] mb-1">
                      €{appliedTccValue.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 4})}
                    </div>
                    <div className="text-sm text-[#e8fbff]/50">per 1 TCC</div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-[#e8fbff]/70 mb-3">Storico Variazioni</div>
                    <div className="space-y-2">
                      {(fundStats?.value_history || [
                        { date: new Date().toISOString().split('T')[0], value: appliedTccValue }
                      ]).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                          <span className="text-xs text-[#e8fbff]/70">{item.date}</span>
                          <span className="text-sm font-semibold text-[#14b8a6]">€{parseFloat(item.value || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leva Politica TCC */}
              <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-[#8b5cf6]" />
                    Leva Politica TCC
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <label className="text-sm text-[#e8fbff]/70 mb-2 block">TCC assegnati per €10 spesi</label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={tccValue}
                      onChange={(e) => setTccValue(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#0b1220] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-[#e8fbff]/50 mt-1">
                      <span>0</span>
                      <span>10</span>
                      <span>20</span>
                      <span>30</span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg mb-4">
                    <div className="text-sm text-[#e8fbff] font-semibold mb-2">Anteprima Assegnazione</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#e8fbff]/70">€10 spesi =</span>
                        <span className="text-[#10b981] font-bold text-lg">{Math.round(tccValue)} TCC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#e8fbff]/70">€50 spesi =</span>
                        <span className="text-[#10b981] font-semibold">{Math.round(tccValue * 5)} TCC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#e8fbff]/70">€100 spesi =</span>
                        <span className="text-[#10b981] font-semibold">{Math.round(tccValue * 10)} TCC</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm text-[#e8fbff]/70 mb-2 block">Oppure inserisci manualmente:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={Math.round(tccValue)}
                        onChange={(e) => setTccValue(Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="flex-1 px-3 py-2 bg-[#0b1220] border border-[#8b5cf6]/30 rounded-lg text-[#e8fbff] text-center text-lg font-bold focus:ring-2 focus:ring-[#8b5cf6]"
                      />
                      <span className="text-[#e8fbff]/70">TCC per €10</span>
                    </div>
                  </div>

                  <Button 
                    onClick={async () => {
                      if (!selectedComuneId) {
                        alert('Seleziona prima un comune!');
                        return;
                      }
                      try {
                        // tccValue = valore dello slider (TCC per €10 spesi)
                        // policy_multiplier = tccValue direttamente
                        // Es: slider su 10 → policy_multiplier = 10 → €100 spesi = (100/10)*10 = 100 TCC
                        const policyMultiplier = tccValue;
                        
                        const response = await fetch(`https://orchestratore.mio-hub.me/api/tcc/v2/config/update/${selectedComuneId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            policy_multiplier: policyMultiplier,
                            // NON sovrascrivere tcc_value - deve rimanere €0,089!
                            policy_notes: `Leva: ${policyMultiplier} TCC per €10 - ${new Date().toLocaleDateString('it-IT')}`
                          })
                        });
                        const data = await response.json();
                        if (data.success) {
                          setAppliedTccValue(0.089); // Valore fisso EU ETS
                          alert(`Leva politica salvata!\n\n€10 spesi = ${policyMultiplier} TCC assegnati`);
                        } else {
                          alert(`Errore: ${data.error || 'Impossibile salvare'}`);
                        }
                      } catch (error) {
                        console.error('Error updating TCC config:', error);
                        alert('Errore di connessione');
                      }
                    }}
                    className="w-full bg-[#8b5cf6] hover:bg-[#8b5cf6]/80"
                    disabled={!selectedComuneId}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Salva Leva Politica
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Regolazione per Area e Categoria */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Per Area */}
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#14b8a6]" />
                    Bonus TCC per Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {calculateAreaValues().map((area, idx) => (
                      <div key={idx} className="p-3 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#e8fbff] font-medium">{area.area}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={area.boost}
                              onChange={(e) => {
                                const newBoosts = [...editableParams.areaBoosts];
                                newBoosts[idx].boost = parseFloat(e.target.value) || 0;
                                setEditableParams({ ...editableParams, areaBoosts: newBoosts });
                              }}
                              className={`text-sm font-semibold px-2 py-1 rounded w-16 text-center ${
                                area.boost > 0 ? 'bg-[#10b981]/20 text-[#10b981]' :
                                area.boost < 0 ? 'bg-[#ef4444]/20 text-[#ef4444]' :
                                'bg-[#14b8a6]/20 text-[#14b8a6]'
                              } border-none focus:ring-2 focus:ring-[#14b8a6]`}
                            />
                            <span className="text-xs text-[#e8fbff]/50">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#e8fbff]/50">€10 spesi =</span>
                          <span className="text-lg font-bold text-[#10b981]">{Math.round(10 * tccValue * (1 + area.boost/100))} TCC</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Per Categoria */}
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#14b8a6]" />
                    Bonus TCC per Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {calculateCategoryValues().map((cat, idx) => (
                      <div key={idx} className="p-3 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#e8fbff] font-medium">{cat.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#e8fbff]/50">+</span>
                            <input
                              type="number"
                              value={cat.boost}
                              onChange={(e) => {
                                const newBoosts = [...editableParams.categoryBoosts];
                                newBoosts[idx].boost = parseFloat(e.target.value) || 0;
                                setEditableParams({ ...editableParams, categoryBoosts: newBoosts });
                              }}
                              className={`text-sm font-semibold px-2 py-1 rounded w-16 text-center ${
                                cat.boost > 0 ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#14b8a6]/20 text-[#14b8a6]'
                              } border-none focus:ring-2 focus:ring-[#14b8a6]`}
                            />
                            <span className="text-xs text-[#e8fbff]/50">%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#e8fbff]/50">€10 spesi =</span>
                          <span className="text-lg font-bold text-[#10b981]">{Math.round(10 * tccValue * (1 + cat.boost/100))} TCC</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sistema Rimborsi */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#14b8a6]" />
                  Sistema Rimborsi Negozi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-[#f59e0b]" />
                      <span className="text-[#e8fbff] font-semibold">Pending</span>
                    </div>
                    <div className="text-3xl font-bold text-[#f59e0b] mb-1">
                      {fundStats?.reimbursements?.pending?.count || 0}
                    </div>
                    <div className="text-sm text-[#e8fbff]/70">
                      €{(fundStats?.reimbursements?.pending?.amount || 0).toLocaleString()} da processare
                    </div>
                  </div>
                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-[#10b981]" />
                      <span className="text-[#e8fbff] font-semibold">Processati</span>
                    </div>
                    <div className="text-3xl font-bold text-[#10b981] mb-1">
                      {fundStats?.reimbursements?.processed?.count || 0}
                    </div>
                    <div className="text-sm text-[#e8fbff]/70">
                      €{(fundStats?.reimbursements?.processed?.amount || 0).toLocaleString()} totali
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-[#e8fbff] font-semibold mb-3">Top Negozi per Crediti Incassati</h4>
                  <div className="space-y-2">
                    {(fundStats?.top_operators || []).map((shop: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                            <span className="text-[#14b8a6] font-bold">#{idx + 1}</span>
                          </div>
                          <span className="text-[#e8fbff]">{shop.name || shop.operator_name || 'Operatore'}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[#14b8a6] font-semibold">{(shop.credits || shop.total_issued || 0).toLocaleString()} TCC</div>
                          <div className="text-xs text-[#e8fbff]/50">€{(shop.euros || (shop.total_issued * appliedTccValue) || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-[#14b8a6] hover:bg-[#14b8a6]/80"
                    onClick={() => {
                      // Export CSV dei rimborsi
                      const data = fundStats?.top_operators || [];
                      if (data.length === 0) {
                        toast.info('Nessun dato da esportare');
                        return;
                      }
                      const csv = 'Operatore,TCC Rilasciati,TCC Riscattati,Vendite EUR\n' + 
                        data.map((op: any) => `${op.operator_name || op.operator_id},${op.total_issued || 0},${op.total_redeemed || 0},${op.total_sales || 0}`).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `rimborsi_tcc_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      toast.success('CSV esportato!');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button 
                    className="flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] active:bg-[#6d28d9] active:scale-95 transition-all duration-150 disabled:opacity-50"
                    id="processBatchBtn"
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                      const originalContent = btn.innerHTML;
                      btn.disabled = true;
                      btn.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2 inline" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Elaborazione...';
                      try {
                        const response = await fetch('https://orchestratore.mio-hub.me/api/tcc/v2/process-batch-reimbursements', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        if (data.success) {
                          if (data.processed === 0) {
                            toast.info('Nessun rimborso pending da processare');
                          } else {
                            toast.success(`Processati ${data.processed} rimborsi per \u20ac${data.total_euro}`);
                            window.location.reload();
                          }
                        } else {
                          toast.error(data.error || 'Errore nel processare i rimborsi');
                        }
                      } catch (error) {
                        console.error('Errore:', error);
                        toast.error('Errore di connessione');
                      } finally {
                        btn.disabled = false;
                        btn.innerHTML = originalContent;
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Processa Batch
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Storico Movimenti Fondo */}
            {fundStats && (
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#14b8a6]" />
                  Storico Movimenti Fondo
                </CardTitle>
                <CardDescription className="text-[#94a3b8]">
                  Registro completo di tutte le operazioni del fondo TCC
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filtri Movimenti */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    size="sm"
                    variant={fundMovementFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setFundMovementFilter('all')}
                    className={fundMovementFilter === 'all' ? 'bg-[#f97316]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Tutti
                  </Button>
                  <Button
                    size="sm"
                    variant={fundMovementFilter === 'deposit' ? 'default' : 'outline'}
                    onClick={() => setFundMovementFilter('deposit')}
                    className={fundMovementFilter === 'deposit' ? 'bg-[#10b981]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Entrate
                  </Button>
                  <Button
                    size="sm"
                    variant={fundMovementFilter === 'reimbursement' ? 'default' : 'outline'}
                    onClick={() => setFundMovementFilter('reimbursement')}
                    className={fundMovementFilter === 'reimbursement' ? 'bg-[#ef4444]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Rimborsi
                  </Button>
                </div>

                {/* Lista Movimenti */}
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {(!fundStats?.transactions || !Array.isArray(fundStats.transactions) || fundStats.transactions.length === 0) ? (
                    <p className="text-center text-[#94a3b8] py-8">Nessun movimento registrato</p>
                  ) : (
                    fundStats.transactions.filter(tx => {
                      if (fundMovementFilter === 'all') return true;
                      if (fundMovementFilter === 'deposit') return tx.type === 'deposit';
                      if (fundMovementFilter === 'reimbursement') return tx.type === 'reimbursement' || tx.type === 'reimbursement_batch';
                      return true;
                    }).map((tx, i) => {
                      const isDeposit = tx.type === 'deposit';
                      const euroValue = tx.euro_value ? (tx.euro_value / 100) : (tx.amount || 0);
                      return (
                      <div key={tx.id || i} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center gap-3">
                          {isDeposit ? (
                            <div className="w-8 h-8 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                              <ArrowUpCircle className="w-4 h-4 text-[#10b981]" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                              <ArrowDownCircle className="w-4 h-4 text-[#ef4444]" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[#e8fbff]">
                              {isDeposit ? 'Deposito Fondo' : (tx.type === 'reimbursement_batch' ? (
                                tx.description?.includes('[') 
                                  ? `Batch Rimborsi ${tx.description.match(/\[(.*?)\]/)?.[0] || ''}`
                                  : 'Batch Rimborsi'
                              ) : tx.description || 'Rimborso')}
                            </p>
                            <p className="text-sm text-[#94a3b8]">
                              {new Date(tx.created_at).toLocaleDateString('it-IT')} - {new Date(tx.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <Badge className={`text-xs mt-1 ${isDeposit ? 'bg-[#10b981]/20 text-[#10b981]' : tx.status === 'completed' ? 'bg-[#14b8a6]/20 text-[#14b8a6]' : 'bg-[#f59e0b]/20 text-[#f59e0b]'}`}>
                              {isDeposit ? 'Entrata' : tx.status === 'completed' ? 'Completato' : 'In Attesa'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${isDeposit ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {isDeposit ? '+' : '-'}€{euroValue.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                          {tx.amount > 0 && (
                            <p className="text-sm text-[#94a3b8]">
                              {tx.amount} TCC
                            </p>
                          )}
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Analytics Economici */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#14b8a6]" />
                  Analytics Economici
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-[#0b1220] rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">TCC Emessi (click to edit)</div>
                    <input
                      type="number"
                      value={editableParams.tccIssued}
                      onChange={(e) => setEditableParams({ ...editableParams, tccIssued: parseFloat(e.target.value) || 0 })}
                      className="text-3xl font-bold text-[#14b8a6] bg-transparent border-b-2 border-[#14b8a6]/50 focus:border-[#14b8a6] outline-none w-full"
                    />
                  </div>
                  <div className="p-4 bg-[#0b1220] rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">TCC Spesi (click to edit)</div>
                    <input
                      type="number"
                      value={editableParams.tccSpent}
                      onChange={(e) => setEditableParams({ ...editableParams, tccSpent: parseFloat(e.target.value) || 0 })}
                      className="text-3xl font-bold text-[#10b981] bg-transparent border-b-2 border-[#10b981]/50 focus:border-[#10b981] outline-none w-full"
                    />
                  </div>
                  <div className="p-4 bg-[#0b1220] rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Velocity (Utilizzo)</div>
                    <div className="text-3xl font-bold text-[#f59e0b]">
                      {calculateVelocity()}%
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg mb-4">
                  <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-[#10b981]" />
                    ROI Sostenibilità
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-[#e8fbff]/70 mb-1">Investito (Fondo)</div>
                      <div className="text-xl font-bold text-[#e8fbff]">
                        €{editableParams.fundBalance.toLocaleString('it-IT')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#e8fbff]/70 mb-1">CO₂ Risparmiata</div>
                      <div className="text-xl font-bold text-[#10b981]">
                        {parseFloat(calculateCO2Saved()).toLocaleString('it-IT')} kg
                      </div>
                      <div className="text-xs text-[#e8fbff]/50 mt-1">
                        (1 TCC = 1 kg CO₂)
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#e8fbff]/70 mb-1">Alberi Equivalenti</div>
                      <div className="text-xl font-bold text-[#14b8a6]">
                        {calculateTreesEquivalent()} alberi
                      </div>
                      <div className="text-xs text-[#e8fbff]/50 mt-1">
                        (CO₂ / 22 kg/albero)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impatto Fondo */}
                <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                  <h4 className="text-[#e8fbff] font-semibold mb-3 flex items-center gap-2">
                    <Euro className="h-5 w-5 text-[#f59e0b]" />
                    Impatto Fondo Liquidità
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-[#e8fbff]/70 mb-1">Rimborsi Necessari (TCC Spesi × Valore)</div>
                      <div className="text-xl font-bold text-[#f59e0b]">
                        €{parseFloat(calculateReimbursementNeeded()).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#e8fbff]/70 mb-1">Fondo Disponibile</div>
                      <div className="text-xl font-bold text-[#14b8a6]">
                        €{editableParams.fundBalance.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#e8fbff]/70">Copertura Fondo</span>
                      <span className="text-lg font-bold text-[#10b981]">
                        {(() => {
                          const reimbursement = parseFloat(calculateReimbursementNeeded()) || 0;
                          if (reimbursement === 0) return '100.0';
                          const coverage = (editableParams.fundBalance / reimbursement) * 100;
                          return coverage > 1000 ? '>1000' : coverage.toFixed(1);
                        })()}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-[#0b1220] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#10b981] to-[#14b8a6] transition-all duration-300"
                        style={{ width: `${Math.min(100, (() => {
                          const reimbursement = parseFloat(calculateReimbursementNeeded()) || 1;
                          return (editableParams.fundBalance / reimbursement) * 100;
                        })())}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integrazione TPAS */}
            <Card className="bg-gradient-to-br from-[#8b5cf6]/10 to-[#8b5cf6]/5 border-[#8b5cf6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#8b5cf6]" />
                  Integrazione TPAS (Ready 2027)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">Stub API TPAS</span>
                    <span className="px-3 py-1 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full text-sm font-semibold">Standby</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">Mapping Ecocrediti</span>
                    <span className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] rounded-full text-sm font-semibold">Ready</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">Conversione Automatica</span>
                    <span className="px-3 py-1 bg-[#10b981]/20 text-[#10b981] rounded-full text-sm font-semibold">Ready</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <span className="text-[#e8fbff]">Fondo TPAS → Fondo DMS</span>
                    <span className="px-3 py-1 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded-full text-sm font-semibold">2027+</span>
                  </div>
                  <div className="p-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                    <p className="text-sm text-[#e8fbff]/70">
                      Il sistema è predisposto per l'integrazione con TPAS. Quando attivo (2027+), i TCC saranno automaticamente convertiti in Ecocrediti ufficiali e il fondo sarà alimentato dal Fondo TPAS nazionale.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 8: REAL-TIME */}
          <TabsContent value="realtime" className="space-y-6">
            {/* Attività Real-time */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#14b8a6] animate-pulse" />
                  Attività Real-time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-[#14b8a6]" />
                      <span className="text-[#e8fbff]/70 text-sm">Utenti Online</span>
                    </div>
                    <div className="text-3xl font-bold text-[#14b8a6]">{realtimeData.activeUsers}</div>
                  </div>
                  <div className="p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="h-5 w-5 text-[#14b8a6]" />
                      <span className="text-[#e8fbff]/70 text-sm">Operatori Attivi</span>
                    </div>
                    <div className="text-3xl font-bold text-[#14b8a6]">{realtimeData.activeVendors}</div>
                  </div>
                  <div className="p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-[#10b981]" />
                      <span className="text-[#e8fbff]/70 text-sm">Check-in Oggi</span>
                    </div>
                    <div className="text-3xl font-bold text-[#10b981]">{realtimeData.todayCheckins}</div>
                  </div>
                  <div className="p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-5 w-5 text-[#14b8a6]" />
                      <span className="text-[#e8fbff]/70 text-sm">Transazioni Oggi</span>
                    </div>
                    <div className="text-3xl font-bold text-[#14b8a6]">{realtimeData.todayTransactions}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Sistemi */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#14b8a6]" />
                  Status Sistemi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">API Backend</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#10b981]" />
                    <span className="text-[#10b981] font-semibold">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">Database PostgreSQL</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#10b981]" />
                    <span className="text-[#10b981] font-semibold">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">Redis Event Bus</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-[#10b981]" />
                    <span className="text-[#10b981] font-semibold">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                  <span className="text-[#e8fbff]">TPAS Integration</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#f59e0b]" />
                    <span className="text-[#f59e0b] font-semibold">Standby (2027)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: SISTEMA (Logs + Debug unificati) */}
          <TabsContent value="sistema" className="space-y-6">
            {/* Sotto-tab interni */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSistemaSubTab('logs')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  sistemaSubTab === 'logs'
                    ? 'bg-[#06b6d4] border-[#06b6d4] text-white'
                    : 'bg-[#06b6d4]/10 border-[#06b6d4]/30 hover:bg-[#06b6d4]/20 text-[#06b6d4]'
                }`}
              >
                <span className="text-sm font-medium">Logs</span>
              </button>
              <button
                onClick={() => setSistemaSubTab('debug')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  sistemaSubTab === 'debug'
                    ? 'bg-[#06b6d4] border-[#06b6d4] text-white'
                    : 'bg-[#06b6d4]/10 border-[#06b6d4]/30 hover:bg-[#06b6d4]/20 text-[#06b6d4]'
                }`}
              >
                <span className="text-sm font-medium">Debug</span>
              </button>
            </div>

            {/* Contenuto Logs */}
            {sistemaSubTab === 'logs' && (
              <GuardianLogsSection />
            )}

            {/* Contenuto Debug */}
            {sistemaSubTab === 'debug' && (
              <DebugSectionReal />
            )}
          </TabsContent>

          {/* TAB 9: AGENTE AI */}
          <TabsContent value="ai" className="space-y-6">
            <Card className="bg-[#1a2332] border-[#14b8a6]/30 h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Bot className="h-5 w-5 text-[#14b8a6]" />
                  Agente AI - Assistente PA
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 bg-[#0b1220] rounded-lg p-4 mb-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-5 w-5 text-[#14b8a6]" />
                      </div>
                      <div className="bg-[#14b8a6]/10 border border-[#14b8a6]/30 rounded-lg p-3 max-w-[80%]">
                        <p className="text-sm text-[#e8fbff]">Ciao! Sono l'Agente AI della Dashboard PA. Posso aiutarti con:</p>
                        <ul className="text-sm text-[#e8fbff]/70 mt-2 space-y-1 list-disc list-inside">
                          <li>Analytics e statistiche</li>
                          <li>Generazione report</li>
                          <li>Query dati in linguaggio naturale</li>
                          <li>Alert e notifiche</li>
                        </ul>
                      </div>
                    </div>
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-5 w-5 text-[#14b8a6]" />
                          </div>
                        )}
                        <div className={`rounded-lg p-3 max-w-[80%] ${
                          msg.role === 'user' 
                            ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/30' 
                            : 'bg-[#14b8a6]/10 border border-[#14b8a6]/30'
                        }`}>
                          <p className="text-sm text-[#e8fbff]">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && chatInput.trim()) {
                        const userMsg = chatInput.trim();
                        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
                        setChatInput('');
                        setTimeout(() => {
                          setChatMessages(prev => [...prev, { 
                            role: 'ai', 
                            content: `Ho ricevuto la tua richiesta: "${userMsg}". Questa è una risposta simulata. In produzione, qui ci sarà l'integrazione con un vero modello AI per analizzare i dati della Dashboard PA.`
                          }]);
                        }, 500);
                      }
                    }}
                    placeholder="Chiedi qualcosa... (es: Quanti utenti oggi?)"
                    className="flex-1 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg px-4 py-2 text-[#e8fbff] placeholder:text-[#e8fbff]/50 focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/50"
                  />
                  <Button 
                    onClick={() => {
                      if (chatInput.trim()) {
                        const userMsg = chatInput.trim();
                        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
                        setChatInput('');
                        setTimeout(() => {
                          setChatMessages(prev => [...prev, { 
                            role: 'ai', 
                            content: `Ho ricevuto la tua richiesta: "${userMsg}". Questa è una risposta simulata. In produzione, qui ci sarà l'integrazione con un vero modello AI per analizzare i dati della Dashboard PA.`
                          }]);
                        }, 500);
                      }
                    }}
                    className="bg-[#14b8a6] hover:bg-[#14b8a6]/80"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 10: SICUREZZA */}
          <TabsContent value="security" className="space-y-6">
            <SecurityTab />
          </TabsContent>

          {/* TAB: SSO SUAP - Pratiche Ente Sussidiario */}
          <TabsContent value="ssosuap" className="space-y-6">
            <SuapPanel />
          </TabsContent>

          {/* TAB 13: QUALIFICAZIONE IMPRESE */}
          <TabsContent value="businesses" className="space-y-6">
            {/* KPI Conformità - Dati Reali */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border-[#10b981]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#e8fbff]/70 flex items-center gap-2">
                    Pienamente Conformi
                    {realData.statsQualificazione && <span className="text-xs text-[#10b981]">● Live</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-[#10b981] mb-1">
                    {realData.statsQualificazione?.overview?.conformi ?? mockData.businesses.fullyCompliant}
                  </div>
                  <div className="text-sm text-[#e8fbff]/50">
                    {realData.statsQualificazione?.overview?.conformi_percentuale ?? ((mockData.businesses.fullyCompliant / mockData.businesses.total) * 100).toFixed(1)}% del totale
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border-[#f59e0b]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#e8fbff]/70">Con Riserva</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-[#f59e0b] mb-1">
                    {realData.statsQualificazione?.overview?.con_riserva ?? mockData.businesses.partiallyCompliant}
                  </div>
                  <div className="text-sm text-[#e8fbff]/50">
                    {realData.statsQualificazione?.overview?.con_riserva_percentuale ?? ((mockData.businesses.partiallyCompliant / mockData.businesses.total) * 100).toFixed(1)}% del totale
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/5 border-[#ef4444]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#e8fbff]/70">Non Conformi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-[#ef4444] mb-1">
                    {realData.statsQualificazione?.overview?.non_conformi ?? mockData.businesses.nonCompliant}
                  </div>
                  <div className="text-sm text-[#e8fbff]/50">
                    {realData.statsQualificazione?.overview?.non_conformi_percentuale ?? ((mockData.businesses.nonCompliant / mockData.businesses.total) * 100).toFixed(1)}% del totale
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/5 border-[#14b8a6]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#e8fbff]/70">Totale Imprese</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-[#14b8a6] mb-1">
                    {realData.statsQualificazione?.overview?.totale ?? mockData.businesses.total}
                  </div>
                  <div className="text-sm text-[#e8fbff]/50">nel sistema</div>
                </CardContent>
              </Card>
            </div>

            {/* Scadenze Imminenti - Dati Reali */}
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-[#ef4444]" />
                  Scadenze Imminenti ({realData.statsQualificazione?.scadenze?.length ?? mockData.businesses.atRiskSuspension})
                  {realData.statsQualificazione?.scadenze && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(realData.statsQualificazione?.scadenze || mockData.businesses.expiringDocs).map((item: any, idx: number) => {
                    const isReal = realData.statsQualificazione?.scadenze;
                    const isCritical = isReal ? item.giorni_rimanenti <= 15 : item.critical;
                    const businessName = isReal ? item.impresa_nome : item.business;
                    const docType = isReal ? item.tipo_qualifica : item.doc;
                    const daysLeft = isReal ? item.giorni_rimanenti : item.days;
                    
                    return (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${
                        isCritical ? 'bg-[#ef4444]/10 border border-[#ef4444]/30' : 'bg-[#0b1220]'
                      }`}>
                        <div className="flex items-center gap-3">
                          {isCritical && <AlertCircle className="h-5 w-5 text-[#ef4444]" />}
                          <div>
                            <div className="text-[#e8fbff] font-medium">{businessName}</div>
                            <div className="text-sm text-[#e8fbff]/70">{docType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            isCritical ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                          }`}>
                            {daysLeft} giorni
                          </div>
                          <Button size="sm" variant="outline" className="mt-1">
                            Invia Reminder
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Demografia e Indici - Dati Reali */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demografia */}
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#14b8a6]" />
                    Demografia Imprese
                    {realData.statsQualificazione?.demografia && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-[#0b1220] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff]/70">Aperture 2026</span>
                        <span className="text-2xl font-bold text-[#10b981]">+{realData.statsQualificazione?.demografia?.aperture_anno ?? mockData.businesses.demographics.openings}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff]/70">Cessazioni 2026</span>
                        <span className="text-2xl font-bold text-[#ef4444]">-{realData.statsQualificazione?.demografia?.cessazioni_anno ?? mockData.businesses.demographics.closures}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#14b8a6]/30">
                        <span className="text-[#e8fbff] font-semibold">Crescita Netta</span>
                        <span className="text-2xl font-bold text-[#14b8a6]">+{realData.statsQualificazione?.demografia?.crescita_netta ?? mockData.businesses.demographics.netGrowth}</span>
                      </div>
                    </div>

                    {/* Per Settore - Dati Reali */}
                    <div className="p-3 bg-[#0b1220] rounded-lg">
                      <div className="text-xs text-[#e8fbff]/70 mb-2">Per Settore (Top 5)</div>
                      <div className="text-sm space-y-1">
                        {(realData.statsQualificazione?.demografia?.per_settore?.slice(0, 5) || [
                          { settore: 'Alimentare', count: 180 },
                          { settore: 'Abbigliamento', count: 95 },
                          { settore: 'Artigianato', count: 75 }
                        ]).map((s: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-[#e8fbff]/70 truncate max-w-[150px]">{s.settore}</span>
                            <span className="text-[#14b8a6] font-semibold">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Indici Strategici - Dati Reali */}
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#14b8a6]" />
                    Indici Strategici
                    {realData.statsQualificazione?.indici && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff]">Riqualificazione</span>
                        <span className="text-2xl font-bold text-[#14b8a6]">{realData.statsQualificazione?.indici?.riqualificazione ?? mockData.businesses.indices.requalification}</span>
                      </div>
                      <div className="w-full bg-[#0b1220] rounded-full h-3">
                        <div className="bg-gradient-to-r from-[#14b8a6] to-[#10b981] h-3 rounded-full" style={{width: `${realData.statsQualificazione?.indici?.riqualificazione ?? mockData.businesses.indices.requalification}%`}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff]">Digitalizzazione</span>
                        <span className="text-2xl font-bold text-[#8b5cf6]">{realData.statsQualificazione?.indici?.digitalizzazione ?? mockData.businesses.indices.digitalization}</span>
                      </div>
                      <div className="w-full bg-[#0b1220] rounded-full h-3">
                        <div className="bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] h-3 rounded-full" style={{width: `${mockData.businesses.indices.digitalization}%`}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff]">Sostenibilità</span>
                        <span className="text-2xl font-bold text-[#10b981]">{realData.statsQualificazione?.indici?.sostenibilita ?? mockData.businesses.indices.sustainability}</span>
                      </div>
                      <div className="w-full bg-[#0b1220] rounded-full h-3">
                        <div className="bg-gradient-to-r from-[#10b981] to-[#34d399] h-3 rounded-full" style={{width: `${realData.statsQualificazione?.indici?.sostenibilita ?? mockData.businesses.indices.sustainability}%`}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#e8fbff]">Conformità</span>
                        <span className="text-2xl font-bold text-[#06b6d4]">{realData.statsQualificazione?.indici?.conformita?.toFixed(1) ?? '97.1'}</span>
                      </div>
                      <div className="w-full bg-[#0b1220] rounded-full h-3">
                        <div className="bg-gradient-to-r from-[#06b6d4] to-[#22d3ee] h-3 rounded-full" style={{width: `${realData.statsQualificazione?.indici?.conformita ?? 97}%`}}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Formazione e Bandi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formazione */}
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-[#14b8a6]" />
                    Formazione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">Completati</div>
                      <div className="text-3xl font-bold text-[#10b981]">{mockData.businesses.training.completed}</div>
                    </div>
                    <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">Programmati</div>
                      <div className="text-3xl font-bold text-[#f59e0b]">{mockData.businesses.training.scheduled}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-[#e8fbff]/70 mb-2">Top Formatori</div>
                    <div className="space-y-2">
                      {mockData.businesses.training.topTrainers.map((trainer, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#0b1220] rounded">
                          <div>
                            <div className="text-[#e8fbff] text-sm">{trainer.name}</div>
                            <div className="text-xs text-[#e8fbff]/50">{trainer.courses} corsi</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-[#f59e0b]" />
                            <span className="text-[#f59e0b] font-semibold">{trainer.rating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-[#14b8a6]/10 border border-[#14b8a6]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Costo Medio Corso</div>
                    <div className="text-2xl font-bold text-[#14b8a6]">€{mockData.businesses.training.avgCost}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Bandi */}
              <Card className="bg-[#1a2332] border-[#14b8a6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#14b8a6]" />
                    Bandi Attivi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">Bandi Aperti</div>
                      <div className="text-3xl font-bold text-[#8b5cf6]">{mockData.businesses.grants.active}</div>
                    </div>
                    <div className="p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                      <div className="text-sm text-[#e8fbff]/70 mb-1">Success Rate</div>
                      <div className="text-3xl font-bold text-[#10b981]">{mockData.businesses.grants.successRate}%</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-[#e8fbff]/70 mb-2">Top Bandi</div>
                    <div className="space-y-2">
                      {mockData.businesses.grants.topGrants.map((grant, idx) => (
                        <div key={idx} className="p-3 bg-[#0b1220] rounded-lg">
                          <div className="text-[#e8fbff] font-medium mb-1">{grant.title}</div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#e8fbff]/70">{grant.applicants} domande</span>
                            <span className="text-[#10b981] font-semibold">{grant.approved} approvate</span>
                          </div>
                          <div className="text-xs text-[#14b8a6] mt-1">€{grant.amount.toLocaleString()} totali</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Imprese - Dati Reali */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#f59e0b]" />
                  Top 5 Imprese per Score Qualificazione
                  {realData.statsQualificazione?.topImprese && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(realData.statsQualificazione?.topImprese || mockData.businesses.topScoring).map((business: any, idx: number) => {
                    const isReal = realData.statsQualificazione?.topImprese;
                    const name = isReal ? business.denominazione : business.name;
                    const sector = isReal ? business.settore : business.sector;
                    const score = isReal ? business.score : business.score;
                    const digitalization = isReal ? business.score_digitalizzazione : business.digitalization;
                    
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#f97316] flex items-center justify-center">
                            <span className="text-white font-bold text-lg">#{idx + 1}</span>
                          </div>
                          <div>
                            <div className="text-[#e8fbff] font-semibold">{name}</div>
                            <div className="text-sm text-[#e8fbff]/50">{sector}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-[#10b981] mb-1">{score}</div>
                          <div className="text-xs text-[#e8fbff]/70">Digitalizzazione: {digitalization}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 14: SEGNALAZIONI & IOT */}
          <TabsContent value="civic" className="space-y-6">
            {/* Pannello Segnalazioni Civiche con dati reali e config TCC */}
            <CivicReportsPanel />
            {/* Mappa Termica Segnalazioni */}
            <CivicReportsHeatmap />

            {/* Mappa Rete HUB Italia - Segnalazioni Civiche */}
            <GestioneHubMapWrapper />

            <Card className="bg-[#1a2332] border-[#06b6d4]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <CloudRain className="h-5 w-5 text-[#06b6d4]" />
                  Sensori IoT Ambientali (ARPAE Emilia-Romagna)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">PM10</div>
                    <div className="text-3xl font-bold text-[#10b981]">{mockData.iotSensors.airQuality.pm10}</div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">µg/m³</div>
                  </div>
                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">PM2.5</div>
                    <div className="text-3xl font-bold text-[#10b981]">{mockData.iotSensors.airQuality.pm25}</div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">µg/m³</div>
                  </div>
                  <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">NO₂</div>
                    <div className="text-3xl font-bold text-[#f59e0b]">{mockData.iotSensors.airQuality.no2}</div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">µg/m³</div>
                  </div>
                  <div className="p-4 bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Temperatura</div>
                    <div className="text-3xl font-bold text-[#06b6d4]">{mockData.iotSensors.weather.temp}°C</div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">Umidità: {mockData.iotSensors.weather.humidity}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 15: COMUNI */}
          <TabsContent value="comuni" className="space-y-6">
            <ComuniPanel />
          </TabsContent>

          {/* TAB 16: CONTROLLI/SANZIONI */}
          <TabsContent value="inspections" className="space-y-6">
            <ControlliSanzioniPanel />
          </TabsContent>
          <TabsContent value="notifications" className="space-y-6">
            <NotificationsPanel />
          </TabsContent>

          {/* TAB 18: CENTRO MOBILITÀ - Dati GTFS Reali da api.mio-hub.me */}
          <TabsContent value="mobility" className="space-y-6">
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Train className="h-5 w-5 text-[#3b82f6]" />
                  Centro Mobilità GTFS - Rete Trasporti Italia
                  {gtfsStats && <span className="text-xs text-[#10b981] ml-2">● Live API</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Totale Fermate</div>
                    <div className="text-3xl font-bold text-[#3b82f6]">
                      {gtfsStats?.totalStops?.toLocaleString() || '21.206'}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">TPER + Trenitalia</div>
                  </div>
                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Fermate Bus</div>
                    <div className="text-3xl font-bold text-[#10b981]">
                      {gtfsStats?.busStops?.toLocaleString() || '21.176'}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">TPER Bologna/Ferrara</div>
                  </div>
                  <div className="p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Stazioni Treni</div>
                    <div className="text-3xl font-bold text-[#f59e0b]">
                      {gtfsStats?.trainStops?.toLocaleString() || '30'}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">Trenitalia</div>
                  </div>
                  <div className="p-4 bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Linee Totali</div>
                    <div className="text-3xl font-bold text-[#e8fbff]">
                      {gtfsStats?.totalRoutes || '37'}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">Bus + Treni</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[#e8fbff] font-semibold mb-3">Fermate Principali (da API GTFS)</h4>
                  {gtfsLoading ? (
                    <div className="text-center py-4 text-[#e8fbff]/50">Caricamento dati GTFS...</div>
                  ) : gtfsStops.length > 0 ? (
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                      {/* Mescola fermate da tutti i provider: prendi alcune TPER, alcune Trenitalia, alcune Tiemme */}
                      {(() => {
                        const tperStops = gtfsStops.filter((s: any) => s.provider === 'tper').slice(0, 10);
                        const trainStops = gtfsStops.filter((s: any) => s.stop_type === 'train').slice(0, 5);
                        const tiemmeStops = gtfsStops.filter((s: any) => s.provider === 'tiemme' && !s.stop_name?.includes('(Tmp)')).slice(0, 5);
                        // Combina e ordina per numero di routes (decrescente)
                        const mixedStops = [...tperStops, ...trainStops, ...tiemmeStops]
                          .sort((a: any, b: any) => (b.routes?.length || 0) - (a.routes?.length || 0));
                        return mixedStops.map((stop: any, idx: number) => (
                          <div key={stop.stop_id || idx} className="p-4 bg-[#0b1220] rounded-lg flex items-center justify-between hover:bg-[#0b1220]/80 transition-colors">
                            <div className="flex-1">
                              <div className="text-[#e8fbff] font-semibold">{stop.stop_name}</div>
                              <div className="text-sm text-[#e8fbff]/70 flex items-center gap-2">
                                <span>{stop.stop_type === 'bus' ? '🚌' : '🚂'}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  stop.provider === 'tper' ? 'bg-blue-500/20 text-blue-400' :
                                  stop.provider === 'trenitalia' ? 'bg-green-500/20 text-green-400' :
                                  'bg-orange-500/20 text-orange-400'
                                }`}>
                                  {stop.provider?.toUpperCase() || 'TPER'}
                                </span>
                                <span className="text-[#e8fbff]/50">{stop.region}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-[#10b981]">
                                {stop.routes?.length || 0} linee
                              </div>
                              <div className="text-xs text-[#e8fbff]/50">
                                {parseFloat(stop.stop_lat)?.toFixed(4)}, {parseFloat(stop.stop_lon)?.toFixed(4)}
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[#e8fbff]/50">
                      Attiva il layer Trasporti sulla mappa per caricare i dati
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <ParkingCircle className="h-5 w-5 text-[#3b82f6]" />
                  Parcheggi Bologna
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0b1220] rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Posti Totali</div>
                    <div className="text-3xl font-bold text-[#e8fbff]">{mockData.mobility.parkingSpots}</div>
                  </div>
                  <div className="p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Occupati</div>
                    <div className="text-3xl font-bold text-[#ef4444]">{mockData.mobility.parkingOccupied}</div>
                  </div>
                  <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
                    <div className="text-sm text-[#e8fbff]/70 mb-1">Disponibili</div>
                    <div className="text-3xl font-bold text-[#10b981]">{mockData.mobility.parkingAvailable}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grafici Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#1a2332] border-[#3b82f6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#3b82f6]" />
                    Trend Passeggeri Settimanale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[
                      { day: 'Lun', passeggeri: 3200 },
                      { day: 'Mar', passeggeri: 3450 },
                      { day: 'Mer', passeggeri: 3100 },
                      { day: 'Gio', passeggeri: 3600 },
                      { day: 'Ven', passeggeri: 3800 },
                      { day: 'Sab', passeggeri: 2900 },
                      { day: 'Dom', passeggeri: 2400 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3b82f6" opacity={0.1} />
                      <XAxis dataKey="day" stroke="#e8fbff" />
                      <YAxis stroke="#e8fbff" />
                      <Tooltip contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #3b82f6' }} />
                      <Line type="monotone" dataKey="passeggeri" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-[#1a2332] border-[#10b981]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#10b981]" />
                    Utilizzo Linee per Fascia Oraria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { fascia: '6-9', bus: 850, tram: 420 },
                      { fascia: '9-12', bus: 620, tram: 380 },
                      { fascia: '12-15', bus: 480, tram: 290 },
                      { fascia: '15-18', bus: 720, tram: 450 },
                      { fascia: '18-21', bus: 890, tram: 520 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#10b981" opacity={0.1} />
                      <XAxis dataKey="fascia" stroke="#e8fbff" />
                      <YAxis stroke="#e8fbff" />
                      <Tooltip contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #10b981' }} />
                      <Legend />
                      <Bar dataKey="bus" fill="#3b82f6" />
                      <Bar dataKey="tram" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Mappa Interattiva - Riusa la mappa del Gemello Digitale con HUB e Mercati */}
              <Card className="bg-[#1a2332] border-[#3b82f6]/30">
                <CardHeader>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#3b82f6]" />
                    Mappa Trasporti Pubblici - Rete HUB Italia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg">
                    {/* Riutilizzo del componente GestioneHubMapWrapper che mostra HUB, Mercati e layer Trasporti */}
                    <GestioneHubMapWrapper />
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* TAB 19: REPORT & DOCUMENTAZIONE */}
          <TabsContent value="reports" className="space-y-6">
            {/* Sezione Originale Ripristinata: Card e Link Documentazione */}
            <LegacyReportCards />
            
            {/* Nuova Sezione: Navigatore Interattivo (Append, non Replace) */}
            <div className="pt-8 border-t border-[#1e293b]">
              <h3 className="text-xl font-bold text-[#e8fbff] mb-4 flex items-center gap-2">
                <Activity className="h-6 w-6 text-[#a855f7]" />
                Navigatore Interattivo Analisi
              </h3>
              <NativeReportComponent />
            </div>
          </TabsContent>

          {/* TAB 20: INTEGRAZIONI */}
          <TabsContent value="integrations" className="space-y-6">
            <Integrazioni />
          </TabsContent>

          {/* TAB 21: IMPOSTAZIONI */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-[#1a2332] border-[#64748b]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5 text-[#64748b]" />
                  Impostazioni Dashboard PA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* API & Agent Tokens */}
                  <div 
                    onClick={() => window.location.href = '/settings/api-tokens'}
                    className="p-4 bg-[#0f1729] border border-[#64748b]/30 rounded-lg hover:border-[#64748b]/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Lock className="h-5 w-5 text-[#64748b]" />
                      <h3 className="text-[#e8fbff] font-semibold">API & Agent Tokens</h3>
                    </div>
                    <p className="text-[#e8fbff]/60 text-sm">
                      Gestione sicura dei token API per servizi esterni (OpenAI, Gemini, ecc.)
                    </p>
                  </div>

                  {/* Altre impostazioni (placeholder) */}
                  <div className="p-4 bg-[#0f1729] border border-[#64748b]/30 rounded-lg opacity-50">
                    <div className="flex items-center gap-3 mb-2">
                      <UserCog className="h-5 w-5 text-[#64748b]" />
                      <h3 className="text-[#e8fbff] font-semibold">Permessi Utenti</h3>
                    </div>
                    <p className="text-[#e8fbff]/60 text-sm">
                      Configurazione permessi e ruoli utenti (in sviluppo)
                    </p>
                  </div>

                  <div className="p-4 bg-[#0f1729] border border-[#64748b]/30 rounded-lg opacity-50">
                    <div className="flex items-center gap-3 mb-2">
                      <Sliders className="h-5 w-5 text-[#64748b]" />
                      <h3 className="text-[#e8fbff] font-semibold">Preferenze Dashboard</h3>
                    </div>
                    <p className="text-[#e8fbff]/60 text-sm">
                      Personalizzazione visualizzazione e layout (in sviluppo)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 22: GESTIONE MERCATI */}
          <TabsContent value="mercati" className="space-y-6">
            <GestioneMercati />
          </TabsContent>

          {/* TAB 23: IMPRESE & CONCESSIONI */}
          <TabsContent value="imprese" className="space-y-6">
            {/* Statistiche Imprese */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1">
                    <Building2 className="w-4 h-4" />
                    Imprese Totali
                  </div>
                  <div className="text-2xl font-bold text-white">{impreseStats.total}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                    <FileText className="w-4 h-4" />
                    Concessioni Attive
                  </div>
                  <div className="text-2xl font-bold text-white">{impreseStats.concessioni}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                    <Users className="w-4 h-4" />
                    Comuni Coperti
                  </div>
                  <div className="text-2xl font-bold text-white">{impreseStats.comuni}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-orange-400 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Media Concess./Impresa
                  </div>
                  <div className="text-2xl font-bold text-white">{impreseStats.media}</div>
                </CardContent>
              </Card>
            </div>
            {/* Componente Imprese & Concessioni */}
            <MarketCompaniesTab marketId="ALL" stalls={[]} />
          </TabsContent>

          {/* TAB 24: DOCUMENTAZIONE - ENTI FORMATORI & BANDI */}
          <TabsContent value="docs" className="space-y-6">
            {/* Sotto-tab per Formazione e Bandi */}
            <Tabs defaultValue="formazione" className="w-full">
              <TabsList className="bg-[#1a2332] border border-[#3b82f6]/20 mb-6">
                <TabsTrigger value="formazione" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Enti Formatori
                </TabsTrigger>
                <TabsTrigger value="bandi" className="data-[state=active]:bg-[#10b981]/20 data-[state=active]:text-[#10b981]">
                  <Landmark className="w-4 h-4 mr-2" />
                  Associazioni & Bandi
                </TabsTrigger>
              </TabsList>

              {/* SOTTO-TAB: ENTI FORMATORI */}
              <TabsContent value="formazione" className="space-y-6">
                {/* KPI Formazione */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-blue-400 text-sm mb-1">
                        <Building2 className="w-4 h-4" />
                        Enti Accreditati
                        {realData.formazioneStats && <span className="text-xs text-[#10b981]">● Live</span>}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {realData.formazioneStats?.stats?.enti?.totale ?? 0}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">
                        Rating medio: {realData.formazioneStats?.stats?.enti?.rating_medio ?? '-'}/5
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1">
                        <BookOpen className="w-4 h-4" />
                        Corsi Programmati
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {realData.formazioneStats?.stats?.corsi?.programmati ?? 0}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">
                        {realData.formazioneStats?.stats?.corsi?.iscritti_totali ?? 0} iscritti totali
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                        <FileCheck className="w-4 h-4" />
                        Attestati Registrati
                        {realData.formazioneStats?.stats?.attestati && <span className="text-xs text-[#10b981]">● Live</span>}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {realData.formazioneStats?.stats?.attestati?.totale ?? 0}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">
                        {realData.formazioneStats?.stats?.attestati?.attivi ?? 0} attivi
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        In Scadenza
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {realData.formazioneStats?.stats?.attestati?.in_scadenza_30 ?? 0}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">
                        {realData.formazioneStats?.stats?.attestati?.scaduti ?? 0} scaduti
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista Enti Formatori */}
                <Card className="bg-[#1a2332] border-[#3b82f6]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-[#3b82f6]" />
                      Enti Formatori Accreditati
                      {realData.formazioneStats?.enti && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(realData.formazioneStats?.enti || []).map((ente: any, idx: number) => (
                        <div key={ente.id || idx} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-[#3b82f6]/30'}`}>
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="text-[#e8fbff] font-medium">{ente.nome}</div>
                              <div className="text-xs text-[#e8fbff]/50">
                                {(() => { try { const spec = typeof ente.specializzazioni === 'string' ? JSON.parse(ente.specializzazioni) : ente.specializzazioni; return Array.isArray(spec) ? spec.join(', ') : 'Formazione generale'; } catch { return 'Formazione generale'; } })()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-yellow-400">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="font-bold">{ente.rating || '-'}</span>
                            </div>
                            <div className="text-xs text-[#e8fbff]/50">
                              {ente.corsi_count || 0} corsi
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!realData.formazioneStats?.enti || realData.formazioneStats.enti.length === 0) && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Caricamento enti formatori...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Corsi Disponibili */}
                <Card className="bg-[#1a2332] border-[#3b82f6]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[#3b82f6]" />
                      Corsi Disponibili
                      {realData.formazioneStats?.corsi && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(realData.formazioneStats?.corsi || []).map((corso: any, idx: number) => (
                        <div key={corso.id || idx} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-[#e8fbff] font-medium">{corso.titolo}</div>
                              <div className="text-xs text-[#e8fbff]/50">{corso.ente_nome}</div>
                            </div>
                            <Badge className={`${corso.tipo_attestato === 'HACCP' ? 'bg-emerald-500/20 text-emerald-400' : corso.tipo_attestato === 'Antincendio' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {corso.tipo_attestato}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <div className="text-[#e8fbff]/70">
                              <span className="text-cyan-400 font-bold">€{corso.costo || 0}</span> · {corso.durata_ore || 0}h
                            </div>
                            <div className="text-[#e8fbff]/50">
                              {corso.posti_disponibili || 0}/{corso.max_partecipanti || 0} posti
                            </div>
                          </div>
                          {corso.data_inizio && (
                            <div className="mt-2 text-xs text-[#e8fbff]/50">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              Inizio: {new Date(corso.data_inizio).toLocaleDateString('it-IT')}
                            </div>
                          )}
                        </div>
                      ))}
                      {(!realData.formazioneStats?.corsi || realData.formazioneStats.corsi.length === 0) && (
                        <div className="col-span-2 text-center text-[#e8fbff]/50 py-8">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Caricamento corsi...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Lista Imprese con Attestati - Scadenze */}
                <Card className="bg-[#1a2332] border-[#f59e0b]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
                      Scadenze Attestati Imprese
                      {realData.formazioneStats?.stats?.scadenze_imprese && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      Attestati in scadenza e scaduti ordinati per data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                      {(realData.formazioneStats?.stats?.scadenze_imprese || []).map((item: any, idx: number) => (
                        <div key={item.id || idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.stato_scadenza === 'scaduto' ? 'bg-red-500/10 border-red-500/30' :
                          item.stato_scadenza === 'urgente' ? 'bg-orange-500/10 border-orange-500/30' :
                          item.stato_scadenza === 'in_scadenza' ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-[#0b1220] border-[#3b82f6]/10'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-[#e8fbff]/50" />
                              <span className="text-[#e8fbff] font-medium">{item.impresa_nome}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-[#e8fbff]/50">
                              <span className="flex items-center gap-1">
                                <FileCheck className="w-3 h-3" />
                                {item.tipo}
                              </span>
                              <span>{item.ente_rilascio}</span>
                              {item.numero_certificato && <span>#{item.numero_certificato}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-bold ${
                              item.stato_scadenza === 'scaduto' ? 'text-red-400' :
                              item.stato_scadenza === 'urgente' ? 'text-orange-400' :
                              item.stato_scadenza === 'in_scadenza' ? 'text-yellow-400' :
                              'text-emerald-400'
                            }`}>
                              {item.stato_scadenza === 'scaduto' ? `Scaduto da ${Math.abs(item.giorni_rimanenti)} gg` :
                               item.giorni_rimanenti <= 0 ? 'Scaduto' :
                               `${item.giorni_rimanenti} giorni`}
                            </div>
                            <div className="text-xs text-[#e8fbff]/50">
                              Scade: {new Date(item.data_scadenza).toLocaleDateString('it-IT')}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!realData.formazioneStats?.stats?.scadenze_imprese || realData.formazioneStats.stats.scadenze_imprese.length === 0) && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <FileCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessun attestato registrato</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* FORM REGISTRAZIONE ATTESTATO */}
                <Card className="bg-[#1a2332] border-[#10b981]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-[#10b981]" />
                      Registra Nuovo Attestato
                      <Badge className="bg-emerald-500/20 text-emerald-400 ml-2">Nuovo</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const formData = new FormData(form);
                      const data = {
                        impresa_id: parseInt(formData.get('impresa_id') as string),
                        tipo_qualifica: formData.get('tipo_qualifica'),
                        ente_rilascio: formData.get('ente_rilascio'),
                        numero_attestato: formData.get('numero_attestato'),
                        data_rilascio: formData.get('data_rilascio'),
                        data_scadenza: formData.get('data_scadenza'),
                        ore_formazione: parseInt(formData.get('ore_formazione') as string) || null,
                        docente: formData.get('docente'),
                        note: formData.get('note')
                      };
                      try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/formazione/attestati`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(data)
                        });
                        const result = await res.json();
                        if (result.success) {
                          alert('✅ ' + result.message);
                          form.reset();
                        } else {
                          alert('❌ Errore: ' + result.error);
                        }
                      } catch (err) {
                        alert('❌ Errore di connessione');
                      }
                    }} className="space-y-4">
                      {/* Ricerca Impresa */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Cerca Impresa *</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Cerca per nome, P.IVA o CF..."
                              className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/30 focus:border-[#10b981] focus:outline-none"
                              onChange={async (e) => {
                                const q = e.target.value;
                                if (q.length < 2) return;
                                try {
                                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me'}/api/formazione/imprese/search?q=${encodeURIComponent(q)}`);
                                  const data = await res.json();
                                  const list = document.getElementById('imprese-list');
                                  if (list && data.success) {
                                    list.innerHTML = data.data.map((i: any) => 
                                      `<div class="p-2 hover:bg-[#3b82f6]/20 cursor-pointer rounded" onclick="document.getElementById('impresa_id').value='${i.id}'; document.getElementById('impresa_nome').value='${i.denominazione} (${i.partita_iva})'; document.getElementById('imprese-list').innerHTML='';">${i.denominazione} - ${i.partita_iva} - ${i.comune || ''}</div>`
                                    ).join('');
                                  }
                                } catch {}
                              }}
                            />
                            <div id="imprese-list" className="absolute z-10 w-full bg-[#1a2332] border border-[#3b82f6]/20 rounded-lg mt-1 max-h-40 overflow-y-auto text-[#e8fbff] text-sm"></div>
                          </div>
                          <input type="hidden" name="impresa_id" id="impresa_id" required />
                          <input type="text" id="impresa_nome" readOnly placeholder="Impresa selezionata" className="w-full p-2 bg-[#0b1220]/50 border border-[#10b981]/30 rounded text-[#10b981] text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Tipo Attestato *</label>
                          <select name="tipo_qualifica" required className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] focus:border-[#10b981] focus:outline-none">
                            <option value="">Seleziona tipo...</option>
                            <option value="HACCP">HACCP - Sicurezza Alimentare</option>
                            <option value="SICUREZZA_LAVORO">Sicurezza sul Lavoro (D.Lgs 81/08)</option>
                            <option value="ANTINCENDIO">Prevenzione Incendi</option>
                            <option value="PRIMO_SOCCORSO">Primo Soccorso</option>
                            <option value="PRIVACY_GDPR">Privacy e GDPR</option>
                            <option value="IGIENE_ALIMENTARE">Igiene Alimentare</option>
                            <option value="RSPP">RSPP - Responsabile Sicurezza</option>
                            <option value="RLS">RLS - Rappresentante Lavoratori</option>
                            <option value="CARRELLISTA">Patentino Carrello Elevatore</option>
                            <option value="PES_PAV">PES/PAV - Lavori Elettrici</option>
                            <option value="ALTRO">Altro</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Date e Ente */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Data Rilascio *</label>
                          <input type="date" name="data_rilascio" required className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] focus:border-[#10b981] focus:outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Data Scadenza *</label>
                          <input type="date" name="data_scadenza" required className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] focus:border-[#10b981] focus:outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Ente Rilascio</label>
                          <input type="text" name="ente_rilascio" placeholder="Nome ente formatore" className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/30 focus:border-[#10b981] focus:outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">N. Attestato</label>
                          <input type="text" name="numero_attestato" placeholder="Es: ATT-2026-001" className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/30 focus:border-[#10b981] focus:outline-none" />
                        </div>
                      </div>
                      
                      {/* Dettagli Corso */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Ore Formazione</label>
                          <input type="number" name="ore_formazione" min="1" placeholder="Es: 8" className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/30 focus:border-[#10b981] focus:outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Docente</label>
                          <input type="text" name="docente" placeholder="Nome docente" className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/30 focus:border-[#10b981] focus:outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-[#e8fbff]/70">Note</label>
                          <input type="text" name="note" placeholder="Note aggiuntive" className="w-full p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/30 focus:border-[#10b981] focus:outline-none" />
                        </div>
                      </div>
                      
                      {/* Submit */}
                      <div className="flex justify-end gap-3 pt-4">
                        <button type="reset" className="px-6 py-3 bg-[#0b1220] border border-[#e8fbff]/20 rounded-lg text-[#e8fbff]/70 hover:bg-[#1a2332] transition-colors">
                          Annulla
                        </button>
                        <button type="submit" className="px-6 py-3 bg-gradient-to-r from-[#10b981] to-[#3b82f6] rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                          <FileCheck className="w-4 h-4" />
                          Registra Attestato
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* LISTA ISCRIZIONI AI CORSI */}
                <Card className="bg-[#1a2332] border-[#8b5cf6]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#8b5cf6]" />
                      Imprese Iscritte ai Corsi
                      {realData.formazioneStats?.iscrizioni && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                      <Badge className="bg-purple-500/20 text-purple-400 ml-2">Nuovo</Badge>
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      Iscrizioni registrate dall'app imprese - {realData.formazioneStats?.iscrizioni?.conteggi?.totale || 0} totali
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* KPI Iscrizioni */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#8b5cf6]/20 text-center">
                        <div className="text-2xl font-bold text-[#8b5cf6]">{realData.formazioneStats?.iscrizioni?.conteggi?.iscritti || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Iscritti</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#10b981]/20 text-center">
                        <div className="text-2xl font-bold text-[#10b981]">{realData.formazioneStats?.iscrizioni?.conteggi?.confermati || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Confermati</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#3b82f6]/20 text-center">
                        <div className="text-2xl font-bold text-[#3b82f6]">{realData.formazioneStats?.iscrizioni?.conteggi?.completati || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Completati</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#ef4444]/20 text-center">
                        <div className="text-2xl font-bold text-[#ef4444]">{realData.formazioneStats?.iscrizioni?.conteggi?.annullati || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Annullati</div>
                      </div>
                    </div>
                    
                    {/* Lista Iscrizioni */}
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                      {(realData.formazioneStats?.iscrizioni?.iscrizioni_recenti || []).map((item: any, idx: number) => (
                        <div key={item.id || idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.stato === 'COMPLETATO' ? 'bg-blue-500/10 border-blue-500/30' :
                          item.stato === 'CONFERMATO' ? 'bg-green-500/10 border-green-500/30' :
                          item.stato === 'ANNULLATO' ? 'bg-red-500/10 border-red-500/30' :
                          'bg-purple-500/10 border-purple-500/30'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#e8fbff]">{item.impresa_nome}</span>
                              <Badge className={`text-xs ${
                                item.stato === 'COMPLETATO' ? 'bg-blue-500/20 text-blue-400' :
                                item.stato === 'CONFERMATO' ? 'bg-green-500/20 text-green-400' :
                                item.stato === 'ANNULLATO' ? 'bg-red-500/20 text-red-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {item.stato}
                              </Badge>
                            </div>
                            <div className="text-sm text-[#e8fbff]/60 mt-1">
                              <span className="text-[#3b82f6]">{item.corso_titolo}</span>
                              {item.ente_nome && <span className="ml-2">• {item.ente_nome}</span>}
                            </div>
                            {item.utente_nome && (
                              <div className="text-xs text-[#e8fbff]/40 mt-1">
                                Partecipante: {item.utente_nome}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-[#e8fbff]/70">
                              {item.corso_data ? new Date(item.corso_data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </div>
                            <div className="text-xs text-[#e8fbff]/40">
                              Iscritto: {item.data_iscrizione ? new Date(item.data_iscrizione).toLocaleDateString('it-IT') : '-'}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!realData.formazioneStats?.iscrizioni?.iscrizioni_recenti || realData.formazioneStats.iscrizioni.iscrizioni_recenti.length === 0) && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessuna iscrizione registrata</p>
                          <p className="text-xs mt-1">Le imprese potranno iscriversi ai corsi dall'app</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Form Invio Notifiche Enti Formatori */}
                <Card className="bg-[#1a2332] border-[#3b82f6]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#3b82f6]" />
                      Invia Notifica alle Imprese
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      Invia comunicazioni informative o promozionali alle imprese iscritte
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const formData = new FormData(form);
                      const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
                      
                      setInvioNotificaLoading(true);
                      try {
                        const targetTipo = formData.get('target_tipo');
                        const targetId = formData.get('target_id');
                        let targetNome = null;
                        
                        if (targetTipo === 'MERCATO' && targetId) {
                          const mercato = mercatiList.find(m => m.id === parseInt(targetId as string));
                          targetNome = mercato?.name || mercato?.nome;
                        } else if (targetTipo === 'HUB' && targetId) {
                          const hub = hubList.find(h => h.hub_id === parseInt(targetId as string));
                          targetNome = hub?.comune_nome;
                        } else if (targetTipo === 'IMPRESA' && targetId) {
                          const impresa = impreseList.find(i => i.id === parseInt(targetId as string));
                          targetNome = impresa?.denominazione;
                        }
                        
                        const response = await fetch(`${MIHUB_API}/notifiche/send`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mittente_tipo: 'ENTE_FORMATORE',
                            mittente_id: 1,
                            mittente_nome: 'Ente Formatore',
                            titolo: formData.get('titolo'),
                            messaggio: formData.get('messaggio'),
                            tipo_messaggio: formData.get('tipo_messaggio'),
                            target_tipo: targetTipo,
                            target_id: targetId || null,
                            target_nome: targetNome
                          })
                        });
                        const data = await response.json();
                        if (data.success) {
                          alert(`✅ Notifica inviata con successo a ${data.data.destinatari_count} destinatari!`);
                          form.reset();
                        } else {
                          alert('❌ Errore: ' + data.error);
                        }
                      } catch (err) {
                        alert('❌ Errore invio notifica');
                      } finally {
                        setInvioNotificaLoading(false);
                      }
                    }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[#e8fbff]/70 mb-1">Destinatari</label>
                          <select name="target_tipo" id="enti_target_tipo" className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]" required
                            onChange={(e) => {
                              const targetIdSelect = document.getElementById('enti_target_id') as HTMLSelectElement;
                              const targetIdContainer = document.getElementById('enti_target_id_container');
                              if (targetIdContainer) {
                                targetIdContainer.style.display = ['MERCATO', 'HUB', 'IMPRESA'].includes(e.target.value) ? 'block' : 'none';
                              }
                              if (targetIdSelect) {
                                targetIdSelect.innerHTML = '<option value="">Seleziona...</option>';
                                if (e.target.value === 'MERCATO') {
                                  mercatiList.forEach(m => {
                                    const opt = document.createElement('option');
                                    opt.value = m.id;
                                    opt.textContent = m.name || m.nome;
                                    targetIdSelect.appendChild(opt);
                                  });
                                } else if (e.target.value === 'HUB') {
                                  hubList.forEach(h => {
                                    const opt = document.createElement('option');
                                    opt.value = h.hub_id;
                                    opt.textContent = h.comune_nome;
                                    targetIdSelect.appendChild(opt);
                                  });
                                } else if (e.target.value === 'IMPRESA') {
                                  impreseList.forEach(i => {
                                    const opt = document.createElement('option');
                                    opt.value = i.id;
                                    opt.textContent = i.denominazione;
                                    targetIdSelect.appendChild(opt);
                                  });
                                }
                              }
                            }}>
                            <option value="TUTTI">Tutte le Imprese</option>
                            <option value="MERCATO">Imprese del Mercato...</option>
                            <option value="HUB">Negozi dell'HUB...</option>
                            <option value="IMPRESA">Impresa Singola...</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-[#e8fbff]/70 mb-1">Tipo Messaggio</label>
                          <select name="tipo_messaggio" className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]" required>
                            <option value="INFORMATIVA">Informativa</option>
                            <option value="PROMOZIONALE">Promozionale (Corsi)</option>
                          </select>
                        </div>
                      </div>
                      <div id="enti_target_id_container" style={{ display: 'none' }}>
                        <label className="block text-sm text-[#e8fbff]/70 mb-1">Seleziona Destinatario Specifico</label>
                        <select name="target_id" id="enti_target_id" className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]">
                          <option value="">Seleziona...</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#e8fbff]/70 mb-1">Titolo</label>
                        <input type="text" name="titolo" placeholder="Es: Nuovo corso HACCP disponibile" 
                          className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]" required />
                      </div>
                      <div>
                        <label className="block text-sm text-[#e8fbff]/70 mb-1">Messaggio</label>
                        <textarea name="messaggio" rows={4} placeholder="Scrivi il messaggio da inviare alle imprese..."
                          className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]" required />
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" disabled={invioNotificaLoading}
                          className="px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                          {invioNotificaLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Invio in corso...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Invia Notifica
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Lista Messaggi - Enti Formatori */}
                <Card className="bg-[#1a2332] border-[#3b82f6]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-[#3b82f6]" />
                      Messaggi
                      {(notificheRisposteEnti || []).filter((r: any) => !r.letta).length > 0 && (
                        <Badge className="bg-red-500 text-white ml-2">
                          {(notificheRisposteEnti || []).filter((r: any) => !r.letta).length} nuove
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      Messaggi inviati e ricevuti
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Filtri */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setFiltroMessaggiEnti('tutti')}
                        className={`px-3 py-1 rounded-full text-sm ${filtroMessaggiEnti === 'tutti' ? 'bg-blue-500 text-white' : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-blue-500/20'}`}
                      >
                        Tutti
                      </button>
                      <button
                        onClick={() => setFiltroMessaggiEnti('inviati')}
                        className={`px-3 py-1 rounded-full text-sm ${filtroMessaggiEnti === 'inviati' ? 'bg-blue-500 text-white' : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-blue-500/20'}`}
                      >
                        Inviati ({(messaggiInviatiEnti || []).length})
                      </button>
                      <button
                        onClick={() => setFiltroMessaggiEnti('ricevuti')}
                        className={`px-3 py-1 rounded-full text-sm ${filtroMessaggiEnti === 'ricevuti' ? 'bg-blue-500 text-white' : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-blue-500/20'}`}
                      >
                        Ricevuti ({(notificheRisposteEnti || []).length})
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-3">
                      {/* Messaggi Inviati */}
                      {(filtroMessaggiEnti === 'tutti' || filtroMessaggiEnti === 'inviati') && (messaggiInviatiEnti || []).map((msg: any, idx: number) => (
                        <div key={`inv-${idx}`} className="p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Send className="w-4 h-4 text-blue-400" />
                              <span className="text-[#e8fbff] font-medium">Inviato</span>
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs">→ {msg.destinatari || 0} imprese</Badge>
                            </div>
                            <span className="text-xs text-[#e8fbff]/50">
                              {new Date(msg.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-[#e8fbff]/80">{msg.titolo}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-[#e8fbff]/50">Letti: {msg.lette || 0}/{msg.destinatari || 0}</span>
                          </div>
                        </div>
                      ))}
                      {/* Messaggi Ricevuti */}
                      {(filtroMessaggiEnti === 'tutti' || filtroMessaggiEnti === 'ricevuti') && (notificheRisposteEnti || []).map((risposta: any, idx: number) => (
                        <div 
                          key={`ric-${idx}`} 
                          onClick={() => segnaRispostaComeLetta(risposta)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${!risposta.letta ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0b1220] border-[#3b82f6]/20'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {risposta.letta ? (
                                <MailOpen className="w-4 h-4 text-[#e8fbff]/40" />
                              ) : (
                                <Mail className="w-4 h-4 text-amber-400" />
                              )}
                              <span className="text-[#e8fbff] font-medium">{risposta.mittente_nome || 'Impresa'}</span>
                              {!risposta.letta && <Badge className="bg-amber-500 text-white text-xs">Nuova</Badge>}
                            </div>
                            <span className="text-xs text-[#e8fbff]/50">
                              {new Date(risposta.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-[#e8fbff]/80">{risposta.titolo}</p>
                          <p className="text-xs text-[#e8fbff]/60 mt-1 line-clamp-2">{risposta.messaggio}</p>
                        </div>
                      ))}
                      {/* Empty states */}
                      {filtroMessaggiEnti === 'inviati' && (messaggiInviatiEnti || []).length === 0 && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <Send className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessun messaggio inviato</p>
                        </div>
                      )}
                      {filtroMessaggiEnti === 'ricevuti' && (notificheRisposteEnti || []).length === 0 && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessuna risposta ricevuta</p>
                        </div>
                      )}
                      {filtroMessaggiEnti === 'tutti' && (messaggiInviatiEnti || []).length === 0 && (notificheRisposteEnti || []).length === 0 && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessun messaggio</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SOTTO-TAB: ASSOCIAZIONI & BANDI */}
              <TabsContent value="bandi" className="space-y-6">
                {/* KPI Bandi */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
                        <Landmark className="w-4 h-4" />
                        Associazioni Partner
                        {realData.bandiStats && <span className="text-xs text-[#10b981]">● Live</span>}
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {realData.bandiStats?.stats?.associazioni?.totale ?? 0}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">
                        Success rate: {realData.bandiStats?.stats?.associazioni?.success_rate_medio ?? '-'}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1">
                        <FileText className="w-4 h-4" />
                        Bandi Aperti
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {realData.bandiStats?.stats?.bandi?.aperti ?? 0}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">
                        {realData.bandiStats?.stats?.bandi?.in_scadenza ?? 0} in scadenza
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
                        <HandCoins className="w-4 h-4" />
                        Importo Totale
                      </div>
                      <div className="text-2xl font-bold text-white">
                        €{((realData.bandiStats?.stats?.bandi?.importo_totale ?? 0) / 1000).toFixed(0)}K
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                        <Target className="w-4 h-4" />
                        Rating Medio
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {realData.bandiStats?.stats?.associazioni?.rating_medio ?? '-'}/5
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista Associazioni */}
                <Card className="bg-[#1a2332] border-[#10b981]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-[#10b981]" />
                      Associazioni Partner
                      {realData.bandiStats?.associazioni && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(realData.bandiStats?.associazioni || []).map((assoc: any, idx: number) => (
                        <div key={assoc.id || idx} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#10b981]/10">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-[#10b981]/30'}`}>
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="text-[#e8fbff] font-medium">{assoc.nome}</div>
                              <div className="text-xs text-[#e8fbff]/50">
                                {assoc.tipo_ente} · {(() => { try { const spec = typeof assoc.specializzazioni === 'string' ? JSON.parse(assoc.specializzazioni) : assoc.specializzazioni; return Array.isArray(spec) ? spec.join(', ') : 'Generale'; } catch { return 'Generale'; } })()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-emerald-400">
                              <TrendingUp className="w-4 h-4" />
                              <span className="font-bold">{assoc.success_rate || 0}%</span>
                            </div>
                            <div className="text-xs text-[#e8fbff]/50">
                              {assoc.pratiche_gestite || 0} pratiche
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!realData.bandiStats?.associazioni || realData.bandiStats.associazioni.length === 0) && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <Landmark className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Caricamento associazioni...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Catalogo Bandi */}
                <Card className="bg-[#1a2332] border-[#10b981]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#10b981]" />
                      Catalogo Bandi Attivi
                      {realData.bandiStats?.catalogo && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(realData.bandiStats?.catalogo || []).map((bando: any, idx: number) => (
                        <div key={bando.id || idx} className="p-4 bg-[#0b1220] rounded-lg border border-[#10b981]/10">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-[#e8fbff] font-medium">{bando.titolo}</div>
                              <div className="text-xs text-[#e8fbff]/50">{bando.ente_erogatore}</div>
                            </div>
                            <Badge className={`${bando.tipo_ente === 'regionale' ? 'bg-blue-500/20 text-blue-400' : bando.tipo_ente === 'nazionale' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {bando.tipo_ente}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm mb-2">
                            <div className="text-yellow-400 font-bold">
                              €{((bando.importo_max || 0) / 1000).toFixed(0)}K max
                            </div>
                            <div className="text-[#e8fbff]/50">
                              Fondo: €{((bando.fondo_totale || 0) / 1000).toFixed(0)}K
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs text-[#e8fbff]/50">
                            <div>
                              <Calendar className="w-3 h-3 inline mr-1" />
                              Scade: {bando.scadenza ? new Date(bando.scadenza).toLocaleDateString('it-IT') : 'N/D'}
                            </div>
                            <div className="text-emerald-400">
                              {bando.settori_target?.slice(0, 2).join(', ') || 'Tutti i settori'}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!realData.bandiStats?.catalogo || realData.bandiStats.catalogo.length === 0) && (
                        <div className="col-span-2 text-center text-[#e8fbff]/50 py-8">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Caricamento bandi...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* CATALOGO SERVIZI ASSOCIAZIONI */}
                <Card className="bg-[#1a2332] border-[#8b5cf6]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-[#8b5cf6]" />
                      Servizi Professionali
                      {realData.bandiStats?.servizi && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                      <Badge className="bg-purple-500/20 text-purple-400 ml-2">Nuovo</Badge>
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      DURC, SCIA, Contabilità, Paghe, Consulenza - {realData.bandiStats?.servizi?.length || 0} servizi disponibili
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                      {[
                        { cat: 'REGOLARIZZAZIONE', nome: 'DURC', icona: Shield, colore: 'red' },
                        { cat: 'PRATICHE', nome: 'SCIA & Pratiche', icona: FileText, colore: 'blue' },
                        { cat: 'CONTABILITA', nome: 'Contabilità', icona: Calculator, colore: 'green' },
                        { cat: 'PAGHE', nome: 'Paghe', icona: Users, colore: 'yellow' },
                        { cat: 'CONSULENZA', nome: 'Consulenza', icona: Briefcase, colore: 'purple' },
                        { cat: 'ASSOCIATIVO', nome: 'Associativo', icona: Award, colore: 'cyan' }
                      ].map(({ cat, nome, icona: Icona, colore }) => {
                        const count = (realData.bandiStats?.servizi || []).filter((s: any) => s.categoria === cat).length;
                        return (
                          <div key={cat} className={`bg-[#0b1220] p-3 rounded-lg border border-${colore}-500/20 text-center`}>
                            <Icona className={`w-6 h-6 mx-auto mb-1 text-${colore}-400`} />
                            <div className="text-lg font-bold text-white">{count}</div>
                            <div className="text-xs text-[#e8fbff]/50">{nome}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                      {(realData.bandiStats?.servizi || []).slice(0, 12).map((servizio: any, idx: number) => (
                        <div key={servizio.id || idx} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#8b5cf6]/10">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#e8fbff]">{servizio.nome}</span>
                              <Badge className={`text-xs ${
                                servizio.categoria === 'REGOLARIZZAZIONE' ? 'bg-red-500/20 text-red-400' :
                                servizio.categoria === 'PRATICHE' ? 'bg-blue-500/20 text-blue-400' :
                                servizio.categoria === 'CONTABILITA' ? 'bg-green-500/20 text-green-400' :
                                servizio.categoria === 'PAGHE' ? 'bg-yellow-500/20 text-yellow-400' :
                                servizio.categoria === 'CONSULENZA' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-cyan-500/20 text-cyan-400'
                              }`}>
                                {servizio.categoria}
                              </Badge>
                            </div>
                            <div className="text-xs text-[#e8fbff]/50 mt-1">
                              {servizio.associazione_nome || 'Tutte le associazioni'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-[#10b981]">€{servizio.prezzo_associati || servizio.prezzo_base}</div>
                            {servizio.prezzo_base !== servizio.prezzo_associati && (
                              <div className="text-xs text-[#e8fbff]/30 line-through">€{servizio.prezzo_base}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* RICHIESTE SERVIZI DALLE IMPRESE */}
                <Card className="bg-[#1a2332] border-[#f59e0b]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5 text-[#f59e0b]" />
                      Richieste Servizi
                      {realData.bandiStats?.richieste && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                      <Badge className="bg-orange-500/20 text-orange-400 ml-2">Nuovo</Badge>
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      Richieste dalle imprese - {realData.bandiStats?.richieste?.conteggi?.totale || 0} totali
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* KPI Richieste */}
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#f59e0b]/20 text-center">
                        <div className="text-2xl font-bold text-[#f59e0b]">{realData.bandiStats?.richieste?.conteggi?.in_attesa || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">In Attesa</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#3b82f6]/20 text-center">
                        <div className="text-2xl font-bold text-[#3b82f6]">{realData.bandiStats?.richieste?.conteggi?.in_lavorazione || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">In Lavorazione</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#10b981]/20 text-center">
                        <div className="text-2xl font-bold text-[#10b981]">{realData.bandiStats?.richieste?.conteggi?.completate || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Completate</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#ef4444]/20 text-center">
                        <div className="text-2xl font-bold text-[#ef4444]">{realData.bandiStats?.richieste?.conteggi?.urgenti || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Urgenti</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#e8fbff]/10 text-center">
                        <div className="text-2xl font-bold text-[#e8fbff]">{realData.bandiStats?.richieste?.conteggi?.totale || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Totale</div>
                      </div>
                    </div>
                    
                    {/* Lista Richieste */}
                    <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
                      {(realData.bandiStats?.richieste?.richieste_recenti || []).map((item: any, idx: number) => (
                        <div key={item.id || idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.priorita === 'URGENTE' ? 'bg-red-500/10 border-red-500/30' :
                          item.priorita === 'ALTA' ? 'bg-orange-500/10 border-orange-500/30' :
                          item.stato === 'COMPLETATA' ? 'bg-green-500/10 border-green-500/30' :
                          item.stato === 'IN_LAVORAZIONE' ? 'bg-blue-500/10 border-blue-500/30' :
                          'bg-[#0b1220] border-[#e8fbff]/10'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#e8fbff]">{item.impresa_nome}</span>
                              <Badge className={`text-xs ${
                                item.stato === 'COMPLETATA' ? 'bg-green-500/20 text-green-400' :
                                item.stato === 'IN_LAVORAZIONE' ? 'bg-blue-500/20 text-blue-400' :
                                item.stato === 'ANNULLATA' ? 'bg-gray-500/20 text-gray-400' :
                                'bg-orange-500/20 text-orange-400'
                              }`}>
                                {item.stato}
                              </Badge>
                              {item.priorita === 'URGENTE' && (
                                <Badge className="bg-red-500/20 text-red-400 text-xs">URGENTE</Badge>
                              )}
                              {item.priorita === 'ALTA' && (
                                <Badge className="bg-orange-500/20 text-orange-400 text-xs">ALTA</Badge>
                              )}
                            </div>
                            <div className="text-sm text-[#e8fbff]/60 mt-1">
                              <span className="text-[#8b5cf6]">{item.servizio_nome}</span>
                              <span className="ml-2 text-[#e8fbff]/40">({item.servizio_categoria})</span>
                            </div>
                            {item.operatore_assegnato && (
                              <div className="text-xs text-[#e8fbff]/40 mt-1">
                                Operatore: {item.operatore_assegnato}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-[#e8fbff]/50">
                              {item.data_richiesta ? new Date(item.data_richiesta).toLocaleDateString('it-IT') : '-'}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!realData.bandiStats?.richieste?.richieste_recenti || realData.bandiStats.richieste.richieste_recenti.length === 0) && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessuna richiesta registrata</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* IMPRESE CON PROBLEMI DI REGOLARITÀ */}
                <Card className="bg-[#1a2332] border-[#ef4444]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-[#ef4444]" />
                      Imprese con Problemi di Regolarità
                      {realData.bandiStats?.regolarita && <span className="text-xs text-[#10b981] ml-2">● Live</span>}
                      <Badge className="bg-red-500/20 text-red-400 ml-2">Attenzione</Badge>
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      DURC irregolare, SCIA scaduta, Autorizzazioni mancanti
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* KPI Regolarità */}
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#ef4444]/20 text-center">
                        <div className="text-2xl font-bold text-[#ef4444]">{realData.bandiStats?.regolarita?.conteggi?.irregolari || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Irregolari</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#f59e0b]/20 text-center">
                        <div className="text-2xl font-bold text-[#f59e0b]">{realData.bandiStats?.regolarita?.conteggi?.scaduti || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Scaduti</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-yellow-500/20 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{realData.bandiStats?.regolarita?.conteggi?.in_scadenza || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">In Scadenza</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#8b5cf6]/20 text-center">
                        <div className="text-2xl font-bold text-[#8b5cf6]">{realData.bandiStats?.regolarita?.conteggi?.da_verificare || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Da Verificare</div>
                      </div>
                      <div className="bg-[#0b1220] p-3 rounded-lg border border-[#10b981]/20 text-center">
                        <div className="text-2xl font-bold text-[#10b981]">{realData.bandiStats?.regolarita?.conteggi?.regolari || 0}</div>
                        <div className="text-xs text-[#e8fbff]/50">Regolari</div>
                      </div>
                    </div>

                    {/* Conteggi per Tipo */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {(realData.bandiStats?.regolarita?.per_tipo || []).map((tipo: any) => (
                        <div key={tipo.tipo} className="bg-[#0b1220] p-2 rounded border border-[#e8fbff]/10 text-center">
                          <div className="text-xs text-[#e8fbff]/50">{tipo.tipo}</div>
                          <div className="text-sm font-bold text-white">{tipo.totale}</div>
                          {tipo.problematici > 0 && (
                            <div className="text-xs text-[#ef4444]">{tipo.problematici} problemi</div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Lista Imprese Problematiche */}
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                      {(realData.bandiStats?.regolarita?.imprese_problematiche || []).map((item: any, idx: number) => (
                        <div key={item.id || idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.stato === 'IRREGOLARE' ? 'bg-red-500/10 border-red-500/30' :
                          item.stato === 'SCADUTO' ? 'bg-orange-500/10 border-orange-500/30' :
                          item.stato === 'IN_SCADENZA' ? 'bg-yellow-500/10 border-yellow-500/30' :
                          'bg-purple-500/10 border-purple-500/30'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#e8fbff]">{item.impresa_nome}</span>
                              <Badge className={`text-xs ${
                                item.stato === 'IRREGOLARE' ? 'bg-red-500/20 text-red-400' :
                                item.stato === 'SCADUTO' ? 'bg-orange-500/20 text-orange-400' :
                                item.stato === 'IN_SCADENZA' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {item.stato}
                              </Badge>
                              <Badge className="bg-[#e8fbff]/10 text-[#e8fbff]/70 text-xs">
                                {item.tipo}
                              </Badge>
                            </div>
                            <div className="text-sm text-[#e8fbff]/60 mt-1">
                              {item.impresa_piva && <span>P.IVA: {item.impresa_piva}</span>}
                              {item.impresa_comune && <span className="ml-2">• {item.impresa_comune}</span>}
                            </div>
                            {item.note && (
                              <div className="text-xs text-[#e8fbff]/40 mt-1">
                                {item.note}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {item.data_scadenza && (
                              <div className={`text-sm font-bold ${
                                item.giorni_rimanenti < 0 ? 'text-[#ef4444]' :
                                item.giorni_rimanenti <= 30 ? 'text-[#f59e0b]' :
                                'text-yellow-400'
                              }`}>
                                {item.giorni_rimanenti < 0 
                                  ? `Scaduto da ${Math.abs(item.giorni_rimanenti)} gg`
                                  : `${item.giorni_rimanenti} gg`
                                }
                              </div>
                            )}
                            <div className="text-xs text-[#e8fbff]/50">
                              {item.data_scadenza ? new Date(item.data_scadenza).toLocaleDateString('it-IT') : 'N/D'}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!realData.bandiStats?.regolarita?.imprese_problematiche || realData.bandiStats.regolarita.imprese_problematiche.length === 0) && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30 text-[#10b981]" />
                          <p>Tutte le imprese sono in regola!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Form Invio Notifiche Associazioni */}
                <Card className="bg-[#1a2332] border-[#10b981]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <Bell className="h-5 w-5 text-[#10b981]" />
                      Invia Notifica alle Imprese
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      Invia comunicazioni su bandi, servizi o avvisi importanti
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const formData = new FormData(form);
                      const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
                      
                      setInvioNotificaLoading(true);
                      try {
                        const targetTipo = formData.get('target_tipo');
                        const targetId = formData.get('target_id');
                        let targetNome = null;
                        
                        if (targetTipo === 'MERCATO' && targetId) {
                          const mercato = mercatiList.find(m => m.id === parseInt(targetId as string));
                          targetNome = mercato?.name || mercato?.nome;
                        } else if (targetTipo === 'HUB' && targetId) {
                          const hub = hubList.find(h => h.hub_id === parseInt(targetId as string));
                          targetNome = hub?.comune_nome;
                        } else if (targetTipo === 'IMPRESA' && targetId) {
                          const impresa = impreseList.find(i => i.id === parseInt(targetId as string));
                          targetNome = impresa?.denominazione;
                        }
                        
                        const response = await fetch(`${MIHUB_API}/notifiche/send`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mittente_tipo: 'ASSOCIAZIONE',
                            mittente_id: 2,
                            mittente_nome: 'Associazione di Categoria',
                            titolo: formData.get('titolo'),
                            messaggio: formData.get('messaggio'),
                            tipo_messaggio: formData.get('tipo_messaggio'),
                            target_tipo: targetTipo,
                            target_id: targetId || null,
                            target_nome: targetNome
                          })
                        });
                        const data = await response.json();
                        if (data.success) {
                          alert(`✅ Notifica inviata con successo a ${data.data.destinatari_count} destinatari!`);
                          form.reset();
                        } else {
                          alert('❌ Errore: ' + data.error);
                        }
                      } catch (err) {
                        alert('❌ Errore invio notifica');
                      } finally {
                        setInvioNotificaLoading(false);
                      }
                    }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[#e8fbff]/70 mb-1">Destinatari</label>
                          <select name="target_tipo" id="assoc_target_tipo" className="w-full bg-[#0b1220] border border-[#10b981]/30 rounded-lg p-2 text-[#e8fbff]" required
                            onChange={(e) => {
                              const targetIdSelect = document.getElementById('assoc_target_id') as HTMLSelectElement;
                              const targetIdContainer = document.getElementById('assoc_target_id_container');
                              if (targetIdContainer) {
                                targetIdContainer.style.display = ['MERCATO', 'HUB', 'IMPRESA'].includes(e.target.value) ? 'block' : 'none';
                              }
                              if (targetIdSelect) {
                                targetIdSelect.innerHTML = '<option value="">Seleziona...</option>';
                                if (e.target.value === 'MERCATO') {
                                  mercatiList.forEach(m => {
                                    const opt = document.createElement('option');
                                    opt.value = m.id;
                                    opt.textContent = m.name || m.nome;
                                    targetIdSelect.appendChild(opt);
                                  });
                                } else if (e.target.value === 'HUB') {
                                  hubList.forEach(h => {
                                    const opt = document.createElement('option');
                                    opt.value = h.hub_id;
                                    opt.textContent = h.comune_nome;
                                    targetIdSelect.appendChild(opt);
                                  });
                                } else if (e.target.value === 'IMPRESA') {
                                  impreseList.forEach(i => {
                                    const opt = document.createElement('option');
                                    opt.value = i.id;
                                    opt.textContent = i.denominazione;
                                    targetIdSelect.appendChild(opt);
                                  });
                                }
                              }
                            }}>
                            <option value="TUTTI">Tutte le Imprese</option>
                            <option value="MERCATO">Imprese del Mercato...</option>
                            <option value="HUB">Negozi dell'HUB...</option>
                            <option value="IMPRESA">Impresa Singola...</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-[#e8fbff]/70 mb-1">Tipo Messaggio</label>
                          <select name="tipo_messaggio" className="w-full bg-[#0b1220] border border-[#10b981]/30 rounded-lg p-2 text-[#e8fbff]" required>
                            <option value="INFORMATIVA">Informativa</option>
                            <option value="PROMOZIONALE">Promozionale (Bandi/Servizi)</option>
                          </select>
                        </div>
                      </div>
                      <div id="assoc_target_id_container" style={{ display: 'none' }}>
                        <label className="block text-sm text-[#e8fbff]/70 mb-1">Seleziona Destinatario Specifico</label>
                        <select name="target_id" id="assoc_target_id" className="w-full bg-[#0b1220] border border-[#10b981]/30 rounded-lg p-2 text-[#e8fbff]">
                          <option value="">Seleziona...</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-[#e8fbff]/70 mb-1">Titolo</label>
                        <input type="text" name="titolo" placeholder="Es: Nuovo bando contributi digitalizzazione" 
                          className="w-full bg-[#0b1220] border border-[#10b981]/30 rounded-lg p-2 text-[#e8fbff]" required />
                      </div>
                      <div>
                        <label className="block text-sm text-[#e8fbff]/70 mb-1">Messaggio</label>
                        <textarea name="messaggio" rows={4} placeholder="Scrivi il messaggio da inviare alle imprese..."
                          className="w-full bg-[#0b1220] border border-[#10b981]/30 rounded-lg p-2 text-[#e8fbff]" required />
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" disabled={invioNotificaLoading}
                          className="px-6 py-3 bg-gradient-to-r from-[#10b981] to-[#3b82f6] rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                          {invioNotificaLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Invio in corso...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Invia Notifica
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Lista Messaggi - Associazioni */}
                <Card className="bg-[#1a2332] border-[#10b981]/20">
                  <CardHeader>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-[#10b981]" />
                      Messaggi
                      {(notificheRisposteAssoc || []).filter((r: any) => !r.letta).length > 0 && (
                        <Badge className="bg-red-500 text-white ml-2">
                          {(notificheRisposteAssoc || []).filter((r: any) => !r.letta).length} nuove
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      Messaggi inviati e ricevuti
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Filtri */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setFiltroMessaggiAssoc('tutti')}
                        className={`px-3 py-1 rounded-full text-sm ${filtroMessaggiAssoc === 'tutti' ? 'bg-emerald-500 text-white' : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-emerald-500/20'}`}
                      >
                        Tutti
                      </button>
                      <button
                        onClick={() => setFiltroMessaggiAssoc('inviati')}
                        className={`px-3 py-1 rounded-full text-sm ${filtroMessaggiAssoc === 'inviati' ? 'bg-emerald-500 text-white' : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-emerald-500/20'}`}
                      >
                        Inviati ({(messaggiInviatiAssoc || []).length})
                      </button>
                      <button
                        onClick={() => setFiltroMessaggiAssoc('ricevuti')}
                        className={`px-3 py-1 rounded-full text-sm ${filtroMessaggiAssoc === 'ricevuti' ? 'bg-emerald-500 text-white' : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-emerald-500/20'}`}
                      >
                        Ricevuti ({(notificheRisposteAssoc || []).length})
                      </button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-3">
                      {/* Messaggi Inviati */}
                      {(filtroMessaggiAssoc === 'tutti' || filtroMessaggiAssoc === 'inviati') && (messaggiInviatiAssoc || []).map((msg: any, idx: number) => (
                        <div key={`inv-${idx}`} className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Send className="w-4 h-4 text-emerald-400" />
                              <span className="text-[#e8fbff] font-medium">Inviato</span>
                              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">→ {msg.destinatari || 0} imprese</Badge>
                            </div>
                            <span className="text-xs text-[#e8fbff]/50">
                              {new Date(msg.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-[#e8fbff]/80">{msg.titolo}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-[#e8fbff]/50">Letti: {msg.lette || 0}/{msg.destinatari || 0}</span>
                          </div>
                        </div>
                      ))}
                      {/* Messaggi Ricevuti */}
                      {(filtroMessaggiAssoc === 'tutti' || filtroMessaggiAssoc === 'ricevuti') && (notificheRisposteAssoc || []).map((risposta: any, idx: number) => (
                        <div 
                          key={`ric-${idx}`} 
                          onClick={() => segnaRispostaComeLetta(risposta)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${!risposta.letta ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0b1220] border-[#10b981]/20'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {risposta.letta ? (
                                <MailOpen className="w-4 h-4 text-[#e8fbff]/40" />
                              ) : (
                                <Mail className="w-4 h-4 text-amber-400" />
                              )}
                              <span className="text-[#e8fbff] font-medium">{risposta.mittente_nome || 'Impresa'}</span>
                              {!risposta.letta && <Badge className="bg-amber-500 text-white text-xs">Nuova</Badge>}
                            </div>
                            <span className="text-xs text-[#e8fbff]/50">
                              {new Date(risposta.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm text-[#e8fbff]/80">{risposta.titolo}</p>
                          <p className="text-xs text-[#e8fbff]/60 mt-1 line-clamp-2">{risposta.messaggio}</p>
                        </div>
                      ))}
                      {/* Empty states */}
                      {filtroMessaggiAssoc === 'inviati' && (messaggiInviatiAssoc || []).length === 0 && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <Send className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessun messaggio inviato</p>
                        </div>
                      )}
                      {filtroMessaggiAssoc === 'ricevuti' && (notificheRisposteAssoc || []).length === 0 && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessuna risposta ricevuta</p>
                        </div>
                      )}
                      {filtroMessaggiAssoc === 'tutti' && (messaggiInviatiAssoc || []).length === 0 && (notificheRisposteAssoc || []).length === 0 && (
                        <div className="text-center text-[#e8fbff]/50 py-8">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>Nessun messaggio</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB 25: MIO AGENT */}
          <TabsContent value="mio" className="space-y-6">
            {/* SEZIONE A: Chat Principale MIO (sempre visibile) */}
            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#8b5cf6]" />
                  MIO Agent - Chat Principale (GPT-5 Coordinatore)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-[#e8fbff]/70 text-sm">
                    Chat principale con il "cervello" che coordina tutti gli agenti. QG strategico per ragionare sui progetti.
                  </p>

                  {/* Area chat principale MIO */}
                  <div className="bg-[#0b1220] border border-[#8b5cf6]/30 rounded-lg p-4">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-400" />
                          <span className="text-[#e8fbff] font-medium">MIO</span>
                          <span className="text-xs text-[#e8fbff]/50">GPT-5 Coordinatore</span>
                          {mioMainConversationId && (
                            <span className="text-xs text-[#e8fbff]/30">ID: {mioMainConversationId.slice(0, 8)}...</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#e8fbff]/50">{mioMessages.length} messaggi</span>
                          {/* Pulsante STOP sempre visibile */}
                          <button
                            onClick={stopGeneration}
                            disabled={!mioSending}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                              mioSending
                                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse cursor-pointer'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                            }`}
                            title={mioSending ? 'Interrompi tutti gli agenti' : 'Nessuna elaborazione in corso'}
                          >
                            <StopCircle className="h-4 w-4" />
                            <span className="text-sm">STOP</span>
                          </button>
                        </div>
                      </div>
                      {/* Area messaggi */}
                      <div className="relative">
                        <div ref={mioMessagesRef} className="h-96 bg-[#0a0f1a] rounded-lg p-4 overflow-y-scroll space-y-3 chat-messages-container">
                        {mioMessages.length === 0 ? (
                          <p className="text-[#e8fbff]/50 text-center text-sm">Nessun messaggio</p>
                        ) : (
                          mioMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 ml-8'
                                  : msg.role === 'assistant'
                                  ? 'bg-[#10b981]/20 border border-[#10b981]/30 mr-8'
                                  : 'bg-[#ef4444]/20 border border-[#ef4444]/30'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {msg.role === 'assistant' && (
                                  <Brain className="h-4 w-4 text-purple-400 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <div className="text-xs text-[#e8fbff]/50 mb-1 flex items-center justify-between">
                                    <span>
                                      {msg.role === 'user' ? 'Tu' : msg.role === 'assistant' ? (
                                        msg.agentName ? `${msg.agentName.toUpperCase()}` : 'MIO'
                                      ) : 'Errore'}
                                      {msg.source && <span className="ml-2 text-[#e8fbff]/30">({msg.source})</span>}
                                    </span>
                                    <span className="text-[#e8fbff]/30">
                                      {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <MessageContent content={msg.content} />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {mioLoading && (
                          <div className="p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 mr-8">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 text-[#10b981] animate-spin" />
                              <p className="text-[#e8fbff]/70 text-sm">MIO sta pensando...</p>
                            </div>
                          </div>
                        )}
                        </div>
                        {/* Bottone Scroll to Bottom */}
                        {showMioScrollButton && mioMessages.length > 0 && (
                          <button
                            onClick={() => scrollMioToBottom()}
                            className="absolute bottom-2 right-2 z-10 size-10 rounded-full bg-[#8b5cf6] shadow-lg flex items-center justify-center hover:bg-[#8b5cf6]/90 transition-all"
                            aria-label="Torna all'ultimo messaggio"
                          >
                            <ArrowDown className="size-5 text-white" />
                          </button>
                        )}
                      </div>
                      {/* Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mioInputValue}
                          onChange={(e) => setMioInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !mioSending) {
                              e.preventDefault();
                              handleSendMio();
                            }
                          }}
                          placeholder="Messaggio a MIO..."
                          className="flex-1 bg-[#0a0f1a] border border-[#8b5cf6]/30 rounded-lg px-4 py-2 text-[#e8fbff] placeholder-[#e8fbff]/30 focus:outline-none focus:border-[#8b5cf6]"
                          disabled={mioSending}
                        />
                        <button
                          type="button"
                          onClick={handleSendMio}
                          disabled={mioSending}
                          className="bg-[#10b981] hover:bg-[#059669] px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {mioSending ? 'Invio...' : 'Invia'}
                        </button>
                      </div>
                      {mioSendError && (
                        <p className="text-xs text-[#ef4444] text-center">
                          Errore MIO: {mioSendError}
                        </p>
                      )}
                      {mioError && (
                        <p className="text-xs text-[#ef4444] text-center">
                          {mioError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SEZIONE B: Pannello Multi-Agente (sotto la chat principale) */}
            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#8b5cf6]" />
                  Chat Multi-Agente (MIO / Manus / Abacus / Zapier)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-[#e8fbff]/70 text-sm">
                    Sala controllo con 4 agenti specializzati. Visualizza singolarmente o tutti insieme.
                  </p>

                  {/* Barra toggle Vista singola / Vista 4 agenti */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setViewMode('single')}
                      className={viewMode === 'single' 
                        ? 'flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white' 
                        : 'flex-1 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6]'}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Vista singola
                    </Button>
                    <Button
                      onClick={() => setViewMode('quad')}
                      className={viewMode === 'quad' 
                        ? 'flex-1 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white' 
                        : 'flex-1 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6]'}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Vista 4 agenti
                    </Button>
                  </div>

                  {/* Bottoni agenti - Disabilitati in vista quadrants */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setSelectedAgent('gptdev')}
                      disabled={viewMode === 'quad'}
                      className={`text-center p-3 rounded-lg border transition-all ${
                        viewMode === 'quad' 
                          ? 'opacity-50 cursor-not-allowed bg-[#6366f1]/5 border-[#6366f1]/20'
                          : selectedAgent === 'gptdev'
                          ? 'bg-[#6366f1]/20 border-[#6366f1] shadow-lg shadow-[#6366f1]/20'
                          : 'bg-[#0a0f1a] border-[#6366f1]/30 hover:bg-[#6366f1]/10 hover:border-[#6366f1]/50'
                      }`}
                    >
                      <Brain className="h-5 w-5 text-indigo-400 mx-auto mb-1" />
                      <div className="text-xs text-[#e8fbff]/70">GPT Dev</div>
                      <div className="text-xs text-[#e8fbff]/50">Sviluppatore</div>
                    </button>
                    <button
                      onClick={() => setSelectedAgent('manus')}
                      disabled={viewMode === 'quad'}
                      className={`text-center p-3 rounded-lg border transition-all ${
                        viewMode === 'quad' 
                          ? 'opacity-50 cursor-not-allowed bg-[#3b82f6]/5 border-[#3b82f6]/20'
                          : selectedAgent === 'manus'
                          ? 'bg-[#3b82f6]/20 border-[#3b82f6]'
                          : 'bg-[#3b82f6]/10 border-[#3b82f6]/30 hover:bg-[#3b82f6]/15'
                      }`}
                    >
                      <Wrench className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                      <div className="text-xs text-[#e8fbff]/70">Manus</div>
                      <div className="text-xs text-[#e8fbff]/50">Esecutivo</div>
                    </button>
                    <button
                      onClick={() => setSelectedAgent('abacus')}
                      disabled={viewMode === 'quad'}
                      className={`text-center p-3 rounded-lg border transition-all ${
                        viewMode === 'quad' 
                          ? 'opacity-50 cursor-not-allowed bg-[#10b981]/5 border-[#10b981]/20'
                          : selectedAgent === 'abacus'
                          ? 'bg-[#10b981]/20 border-[#10b981]'
                          : 'bg-[#10b981]/10 border-[#10b981]/30 hover:bg-[#10b981]/15'
                      }`}
                    >
                      <Calculator className="h-5 w-5 text-green-400 mx-auto mb-1" />
                      <div className="text-xs text-[#e8fbff]/70">Abacus</div>
                      <div className="text-xs text-[#e8fbff]/50">Analisi</div>
                    </button>
                    <button
                      onClick={() => setSelectedAgent('zapier')}
                      disabled={viewMode === 'quad'}
                      className={`text-center p-3 rounded-lg border transition-all ${
                        viewMode === 'quad' 
                          ? 'opacity-50 cursor-not-allowed bg-[#f59e0b]/5 border-[#f59e0b]/20'
                          : selectedAgent === 'zapier'
                          ? 'bg-[#f59e0b]/20 border-[#f59e0b]'
                          : 'bg-[#f59e0b]/10 border-[#f59e0b]/30 hover:bg-[#f59e0b]/15'
                      }`}
                    >
                      <Zap className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                      <div className="text-xs text-[#e8fbff]/70">Zapier</div>
                      <div className="text-xs text-[#e8fbff]/50">Automazioni</div>
                    </button>
                  </div>

                  {/* AREA CHAT - UN SOLO WRAPPER CON CONDITIONAL RENDERING */}
                  <div className="bg-[#0b1220] border border-[#8b5cf6]/30 rounded-lg p-4 min-h-[24rem]">
                    {viewMode === 'single' && (
                      <div className="space-y-4">
                        {/* Header chat singola */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedAgent === 'gptdev' && <Brain className="h-5 w-5 text-indigo-400" />}
                            {selectedAgent === 'manus' && <Wrench className="h-5 w-5 text-blue-400" />}
                            {selectedAgent === 'abacus' && <Calculator className="h-5 w-5 text-green-400" />}
                            {selectedAgent === 'zapier' && <Zap className="h-5 w-5 text-orange-400" />}
                            <span className="text-[#e8fbff] font-medium">
                              {selectedAgent === 'gptdev' && 'GPT Developer'}
                              {selectedAgent === 'manus' && 'Manus'}
                              {selectedAgent === 'abacus' && 'Abacus'}
                              {selectedAgent === 'zapier' && 'Zapier'}
                            </span>
                            <span className="text-xs text-[#e8fbff]/50">
                              {selectedAgent === 'gptdev' && 'Sviluppatore AI'}
                              {selectedAgent === 'manus' && 'Operatore Esecutivo'}
                              {selectedAgent === 'abacus' && 'Analisi Dati'}
                              {selectedAgent === 'zapier' && 'Automazioni'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#e8fbff]/50">
                              {selectedAgent === 'gptdev' && `${gptdevMessages.length} messaggi`}
                              {selectedAgent === 'manus' && `${manusMessages.length} messaggi`}
                              {selectedAgent === 'abacus' && `${abacusMessages.length} messaggi`}
                              {selectedAgent === 'zapier' && `${zapierMessages.length} messaggi`}
                            </span>
                            {/* 🛑 Pulsante STOP per Vista Singola Agente */}
                            <button
                              onClick={stopGeneration}
                              disabled={
                                (selectedAgent === 'gptdev' && !gptdevSending) ||
                                (selectedAgent === 'manus' && !manusSending) ||
                                (selectedAgent === 'abacus' && !abacusSending) ||
                                (selectedAgent === 'zapier' && !zapierSending)
                              }
                              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 text-xs ${
                                (selectedAgent === 'gptdev' && gptdevSending) ||
                                (selectedAgent === 'manus' && manusSending) ||
                                (selectedAgent === 'abacus' && abacusSending) ||
                                (selectedAgent === 'zapier' && zapierSending)
                                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse cursor-pointer'
                                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                              }`}
                              title={
                                (selectedAgent === 'gptdev' && gptdevSending) ||
                                (selectedAgent === 'manus' && manusSending) ||
                                (selectedAgent === 'abacus' && abacusSending) ||
                                (selectedAgent === 'zapier' && zapierSending)
                                  ? 'Interrompi agente'
                                  : 'Nessuna elaborazione in corso'
                              }
                            >
                              <StopCircle className="h-3.5 w-3.5" />
                              <span>STOP</span>
                            </button>
                          </div>
                        </div>
                        {/* Area messaggi */}
                        <div className="relative">
                          <div ref={singleChatMessagesRef} className="h-96 bg-[#0a0f1a] rounded-lg p-4 overflow-y-scroll chat-messages-container">
                          {selectedAgent === 'gptdev' && gptdevMessages.length === 0 && (
                            <p className="text-[#e8fbff]/50 text-center text-sm">Nessun messaggio</p>
                          )}
                          {selectedAgent === 'manus' && manusMessages.length === 0 && (
                            <p className="text-[#e8fbff]/50 text-center text-sm">Nessun messaggio</p>
                          )}
                          {selectedAgent === 'abacus' && abacusMessages.length === 0 && (
                            <p className="text-[#e8fbff]/50 text-center text-sm">Nessun messaggio</p>
                          )}
                          {selectedAgent === 'zapier' && zapierMessages.length === 0 && (
                            <p className="text-[#e8fbff]/50 text-center text-sm">Nessun messaggio</p>
                          )}
                          
                          {/* Messaggi GPT Developer */}
                          {selectedAgent === 'gptdev' && gptdevMessages.map((msg, idx) => (
                            <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}>
                              <div className={`p-3 rounded-lg ${
                                msg.role === 'user' 
                                  ? 'bg-indigo-500/20 border border-indigo-500/30 ml-auto' 
                                  : msg.role === 'system'
                                  ? 'bg-red-500/10 border border-red-500/30'
                                  : 'bg-[#10b981]/10 border border-[#10b981]/20'
                              }`}>
                                <MessageContent content={msg.content} />
                                <div className="flex items-center justify-between text-[#e8fbff]/50 text-xs mt-1">
                                  <span>da {msg.role === 'user' ? 'Tu' : (msg.agent || 'agente')}</span>
                                  <span className="text-[#e8fbff]/30">
                                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Messaggi Manus */}
                          {selectedAgent === 'manus' && manusMessages.map((msg, idx) => (
                            <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}>
                              <div className={`p-3 rounded-lg ${
                                msg.role === 'user' 
                                  ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30 ml-auto' 
                                  : msg.role === 'system'
                                  ? 'bg-red-500/10 border border-red-500/30'
                                  : 'bg-[#10b981]/10 border border-[#10b981]/20'
                              }`}>
                                <MessageContent content={msg.content} />
                                <div className="flex items-center justify-between text-[#e8fbff]/50 text-xs mt-1">
                                  <span>da {msg.role === 'user' ? 'Tu' : (msg.agent || 'agente')}</span>
                                  <span className="text-[#e8fbff]/30">
                                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Messaggi Abacus */}
                          {selectedAgent === 'abacus' && abacusMessages.map((msg, idx) => (
                            <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}>
                              <div className={`p-3 rounded-lg ${
                                msg.role === 'user' 
                                  ? 'bg-[#10b981]/20 border border-[#10b981]/30 ml-auto' 
                                  : msg.role === 'system'
                                  ? 'bg-red-500/10 border border-red-500/30'
                                  : 'bg-[#10b981]/10 border border-[#10b981]/20'
                              }`}>
                                <MessageContent content={msg.content} />
                                <div className="flex items-center justify-between text-[#e8fbff]/50 text-xs mt-1">
                                  <span>da {msg.role === 'user' ? 'Tu' : (msg.agent || 'agente')}</span>
                                  <span className="text-[#e8fbff]/30">
                                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Messaggi Zapier */}
                          {selectedAgent === 'zapier' && zapierMessages.map((msg, idx) => (
                            <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}>
                              <div className={`p-3 rounded-lg ${
                                msg.role === 'user' 
                                  ? 'bg-[#f59e0b]/20 border border-[#f59e0b]/30 ml-auto' 
                                  : msg.role === 'system'
                                  ? 'bg-red-500/10 border border-red-500/30'
                                  : 'bg-[#10b981]/10 border border-[#10b981]/20'
                              }`}>
                                <MessageContent content={msg.content} />
                                <div className="flex items-center justify-between text-[#e8fbff]/50 text-xs mt-1">
                                  <span>da {msg.role === 'user' ? 'Tu' : (msg.agent || 'agente')}</span>
                                  <span className="text-[#e8fbff]/30">
                                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Loading indicator */}
                          {selectedAgent === 'gptdev' && gptdevSending && (
                            <div className="p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 mr-8">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-[#10b981] animate-spin" />
                                <p className="text-[#e8fbff]/70 text-sm">GPT Developer sta pensando...</p>
                              </div>
                            </div>
                          )}
                          {selectedAgent === 'manus' && manusSending && (
                            <div className="p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 mr-8">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-[#10b981] animate-spin" />
                                <p className="text-[#e8fbff]/70 text-sm">Manus sta lavorando...</p>
                              </div>
                            </div>
                          )}
                          {selectedAgent === 'abacus' && abacusSending && (
                            <div className="p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 mr-8">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-[#10b981] animate-spin" />
                                <p className="text-[#e8fbff]/70 text-sm">Abacus sta analizzando...</p>
                              </div>
                            </div>
                          )}
                          {selectedAgent === 'zapier' && zapierSending && (
                            <div className="p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 mr-8">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-[#10b981] animate-spin" />
                                <p className="text-[#e8fbff]/70 text-sm">Zapier sta elaborando...</p>
                              </div>
                            </div>
                          )}
                          </div>
                          {/* Bottone Scroll to Bottom */}
                          {showSingleChatScrollButton && (
                            <button
                              onClick={() => scrollSingleChatToBottom()}
                              className="absolute bottom-2 right-2 z-10 size-10 rounded-full bg-[#8b5cf6] shadow-lg flex items-center justify-center hover:bg-[#8b5cf6]/90 transition-all"
                              aria-label="Torna all'ultimo messaggio"
                            >
                              <ArrowDown className="size-5 text-white" />
                            </button>
                          )}
                        </div>
                        {/* Input e bottone Invia per ogni agente */}
                        <div className="flex gap-2">
                          {selectedAgent === 'gptdev' && (
                            <>
                              <input
                                type="text"
                                value={gptdevInputValue}
                                onChange={(e) => setGptdevInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !gptdevSending) {
                                    e.preventDefault();
                                    handleSendGptdev();
                                  }
                                }}
                                placeholder="Messaggio a GPT Developer..."
                                disabled={gptdevSending}
                                className="flex-1 bg-[#0a0f1a] border border-[#6366f1]/30 rounded-lg px-4 py-2 text-[#e8fbff] placeholder-[#e8fbff]/30 focus:outline-none focus:border-[#6366f1]"
                              />
                              <button
                                onClick={handleSendGptdev}
                                disabled={gptdevSending}
                                className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#10b981]/50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                <Send className="h-4 w-4" />
                                {gptdevSending ? 'Invio...' : 'Invia'}
                              </button>
                            </>
                          )}
                          {selectedAgent === 'manus' && (
                            <>
                              <input
                                type="text"
                                value={manusInputValue}
                                onChange={(e) => setManusInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !manusSending) {
                                    e.preventDefault();
                                    handleSendManus();
                                  }
                                }}
                                placeholder="Messaggio a Manus..."
                                disabled={manusSending}
                                className="flex-1 bg-[#0a0f1a] border border-[#3b82f6]/30 rounded-lg px-4 py-2 text-[#e8fbff] placeholder-[#e8fbff]/30 focus:outline-none focus:border-[#3b82f6]"
                              />
                              <button
                                onClick={handleSendManus}
                                disabled={manusSending}
                                className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#10b981]/50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                <Send className="h-4 w-4" />
                                {manusLoading ? 'Invio...' : 'Invia'}
                              </button>
                            </>
                          )}
                          {selectedAgent === 'abacus' && (
                            <>
                              <input
                                type="text"
                                value={abacusInputValue}
                                onChange={(e) => setAbacusInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !abacusSending) {
                                    e.preventDefault();
                                    handleSendAbacus();
                                  }
                                }}
                                placeholder="Messaggio a Abacus..."
                                disabled={abacusSending}
                                className="flex-1 bg-[#0a0f1a] border border-[#10b981]/30 rounded-lg px-4 py-2 text-[#e8fbff] placeholder-[#e8fbff]/30 focus:outline-none focus:border-[#10b981]"
                              />
                              <button
                                onClick={handleSendAbacus}
                                disabled={abacusSending}
                                className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#10b981]/50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                <Send className="h-4 w-4" />
                                {abacusLoading ? 'Invio...' : 'Invia'}
                              </button>
                            </>
                          )}
                          {selectedAgent === 'zapier' && (
                            <>
                              <input
                                type="text"
                                value={zapierInputValue}
                                onChange={(e) => setZapierInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey && !zapierSending) {
                                    e.preventDefault();
                                    handleSendZapier();
                                  }
                                }}
                                placeholder="Messaggio a Zapier..."
                                disabled={zapierSending}
                                className="flex-1 bg-[#0a0f1a] border border-[#f59e0b]/30 rounded-lg px-4 py-2 text-[#e8fbff] placeholder-[#e8fbff]/30 focus:outline-none focus:border-[#f59e0b]"
                              />
                              <button
                                onClick={handleSendZapier}
                                disabled={zapierSending}
                                className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#10b981]/50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                              >
                                <Send className="h-4 w-4" />
                                {zapierLoading ? 'Invio...' : 'Invia'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {viewMode === 'quad' && (
                      <MultiAgentChatView
                        gptdevMessages={gptdevQuadMessages}
                        manusMessages={manusQuadMessages}
                        abacusMessages={abacusQuadMessages}
                        zapierMessages={zapierQuadMessages}
                        gptdevLoading={gptdevQuadLoading}
                        manusLoading={manusQuadLoading}
                        abacusLoading={abacusQuadLoading}
                        zapierLoading={zapierQuadLoading}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 🎨 SHARED WORKSPACE - Area di lavoro condivisa */}
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-[#14b8a6]" />
                  Shared Workspace - Lavagna Collaborativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#e8fbff]/70 text-sm mb-4">
                  Area di staging per output complessi, diagrammi e annotazioni. Gli agenti possono disegnare automaticamente schemi e report.
                </p>
                <SharedWorkspace 
                  conversationId={mioMainConversationId}
                  onSave={(snapshot) => {
                    console.log('[Dashboard] Workspace saved:', snapshot);
                  }}
                />
              </CardContent>
            </Card>

            {/* Attività Agenti Recente Card */}
            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#8b5cf6]" />
                  Attività Agenti Recente (Guardian)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guardianLogs
                    .filter(log => {
                      // Vista 4 agenti: mostra tutti gli agenti (mio, gptdev, manus, abacus, zapier)
                      if (viewMode === 'quad') {
                        return ['mio', 'gptdev', 'manus', 'abacus', 'zapier'].includes(log.agent);
                      }
                      // Vista singola: mostra solo l'agente selezionato
                      if (viewMode === 'single' && selectedAgent) {
                        return log.agent === selectedAgent;
                      }
                      // Default: mostra tutti
                      return true;
                    })
                    .slice(0, 50)
                    .map((log, idx) => {
                    const statusColor = log.status === 'allowed' ? 'text-[#10b981]' : 'text-[#ef4444]';
                    const statusBg = log.status === 'allowed' ? 'bg-[#10b981]/10 border-[#10b981]/30' : 'bg-[#ef4444]/10 border-[#ef4444]/30';
                    const agentColor = 
                      log.agent === 'mio' ? 'text-purple-400' :
                      log.agent === 'manus' ? 'text-blue-400' :
                      log.agent === 'abacus' ? 'text-green-400' :
                      log.agent === 'zapier' ? 'text-orange-400' : 'text-gray-400';
                    
                    return (
                      <div key={idx} className="p-3 bg-[#0b1220] border border-[#8b5cf6]/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${statusBg} ${statusColor}`}>
                              {log.status.toUpperCase()}
                            </span>
                            <span className={`text-sm font-medium ${agentColor}`}>
                              {log.agent}
                            </span>
                            <span className="text-xs text-[#e8fbff]/50">•</span>
                            <span className="text-xs text-[#e8fbff]/50">{log.method}</span>
                          </div>
                          <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        <p className="text-sm text-[#e8fbff] font-mono mb-1">{log.path}</p>
                        {log.reason && (
                          <p className="text-xs text-[#ef4444] mt-2">⚠️ {log.reason}</p>
                        )}
                        {log.status === 'allowed' && log.response_time_ms !== undefined && (
                          <p className="text-xs text-[#10b981] mt-2">✓ Response time: {log.response_time_ms}ms</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-[#8b5cf6]/20">
                  <p className="text-xs text-[#e8fbff]/50 text-center">
                    Ultimi 50 eventi • Aggiornamento automatico ogni 10s
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: MAPPA GIS - Ora usa GestioneHubMapWrapper (Vista Italia HUB) */}
          <TabsContent value="mappa" className="space-y-4">
            {/* BUS HUB Editor - Schermo Intero */}
            {showBusHubEditor ? (
              <div className="fixed inset-0 z-[100] bg-[#0b1220]">
                <BusHubEditor
                  onClose={() => setShowBusHubEditor(false)}
                  onSaveComplete={(marketId) => {
                    console.log('Mercato salvato con ID:', marketId);
                    setShowBusHubEditor(false);
                  }}
                />
              </div>
            ) : (
              <>
                {/* Pulsante BUS HUB - Accesso rapido all'editor */}
                <div className="flex justify-end px-4">
                  <Button
                    onClick={() => setShowBusHubEditor(true)}
                    className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-medium px-6"
                  >
                    <Bus className="h-4 w-4 mr-2" />
                    BUS HUB Editor
                  </Button>
                </div>
                {/* Vista Italia HUB */}
                <GestioneHubMapWrapper />
              </>
            )}
          </TabsContent>

          {/* TAB: GESTIONE HUB */}
          <TabsContent value="workspace" className="space-y-6">
            <GestioneHubPanel />
          </TabsContent>

        </Tabs>
      </div>
      
      {/* Modale Documentazione */}
      <DocModal content={docModalContent} onClose={() => setDocModalContent(null)} />
    </div>
  );
}

// ============================================================================
// LOGS SECTION (System + Guardian)
// ============================================================================
function LogsSection() {
  const [guardianLogs, setGuardianLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Guardian logs from backend API
    const fetchLogs = async () => {
      try {
        const response = await getLogs({ limit: 100 });
        setGuardianLogs(response.logs);
        setLoading(false);
      } catch (err) {
        console.error('Error loading Guardian logs:', err);
        setLoading(false);
      }
    };
    fetchLogs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats from Guardian logs
  const stats = {
    total: guardianLogs.length,
    allowed: guardianLogs.filter(log => log.success === true).length,
    denied: guardianLogs.filter(log => log.success === false && log.statusCode !== null).length,
    error: guardianLogs.filter(log => log.success === false && log.statusCode === null).length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'allowed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'denied':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'error':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Mock system logs
  const systemLogs = [
    { id: 1, timestamp: new Date().toISOString(), level: 'info', app: 'DMS_HUB', type: 'API_CALL', message: 'GET /api/markets/list - 200 OK', userEmail: 'system' },
    { id: 2, timestamp: new Date(Date.now() - 60000).toISOString(), level: 'info', app: 'DMS_HUB', type: 'DATABASE', message: 'Query executed successfully', userEmail: 'admin@dms.it' },
    { id: 3, timestamp: new Date(Date.now() - 120000).toISOString(), level: 'warn', app: 'MIHUB', type: 'RATE_LIMIT', message: 'Rate limit approaching for agent: mio', userEmail: 'system' },
  ];

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/5 border-[#14b8a6]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Totale Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#14b8a6]">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border-[#10b981]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Allowed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#10b981]">{stats.allowed}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/5 border-[#ef4444]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#ef4444]">{stats.denied}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border-[#f59e0b]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#f59e0b]">{stats.error}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: System Logs + Guardian Logs */}
      <Tabs defaultValue="guardian" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#1a2332] border border-[#14b8a6]/30">
          <TabsTrigger value="system" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            System Logs
          </TabsTrigger>
          <TabsTrigger value="guardian" className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white">
            Guardian Logs
          </TabsTrigger>
        </TabsList>

        {/* System Logs Tab */}
        <TabsContent value="system" className="mt-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[#14b8a6]" />
                System Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {systemLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border bg-[#0b1220] border-[#14b8a6]/20"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                          log.level === 'info' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-[#e8fbff]/70">{log.app}</span>
                        <span className="text-xs text-[#e8fbff]/50">•</span>
                        <span className="text-xs text-[#e8fbff]/50">{log.type}</span>
                      </div>
                      <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <p className="text-sm text-[#e8fbff] font-mono">{log.message}</p>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">User: {log.userEmail}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guardian Logs Tab */}
        <TabsContent value="guardian" className="mt-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#14b8a6]" />
                Guardian API Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-[#e8fbff]/60">
                  Caricamento log Guardian...
                </div>
              ) : (
                <div className="space-y-2">
                  {guardianLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        log.status === 'denied' || log.status === 'error'
                          ? 'bg-[#ef4444]/10 border-[#ef4444]/30'
                          : 'bg-[#0b1220] border-[#14b8a6]/20'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getStatusBadge(log.status)}`}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-[#e8fbff]/70">{log.agent}</span>
                          <span className="text-xs text-[#e8fbff]/50">•</span>
                          <span className="text-xs text-[#e8fbff]/50">{log.method}</span>
                        </div>
                        <span className="text-xs text-[#e8fbff]/50">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#e8fbff] mb-1 font-mono">{log.path}</p>
                      {log.reason && (
                        <div className="flex items-center gap-2 text-xs text-[#e8fbff]/50">
                          <span>📝 {log.reason}</span>
                        </div>
                      )}
                      {log.risk_level && (
                        <div className="flex items-center gap-2 text-xs text-[#e8fbff]/50 mt-1">
                          <span>Risk: {log.risk_level}</span>
                          {log.require_confirmation && <span>• Require Confirmation</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
          {/* TAB: MAPPA GIS - Ora usa GestioneHubMapWrapper (Vista Italia HUB) */}
          <TabsContent value="mappa" className="space-y-4">
            {/* BUS HUB Editor - Schermo Intero */}
            {showBusHubEditor ? (
              <div className="fixed inset-0 z-[100] bg-[#0b1220]">
                <BusHubEditor
                  onClose={() => setShowBusHubEditor(false)}
                  onSaveComplete={(marketId) => {
                    console.log('Mercato salvato con ID:', marketId);
                    setShowBusHubEditor(false);
                  }}
                />
              </div>
            ) : (
              <>
                {/* Pulsante BUS HUB - Accesso rapido all'editor */}
                <div className="flex justify-end px-4">
                  <Button
                    onClick={() => setShowBusHubEditor(true)}
                    className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-medium px-6"
                  >
                    <Bus className="h-4 w-4 mr-2" />
                    BUS HUB Editor
                  </Button>
                </div>
                {/* Vista Italia HUB */}
                <GestioneHubMapWrapper />
              </>
            )}
          </TabsContent>

          {/* TAB: GESTIONE HUB (placeholder vuoto) */}
          <TabsContent value="workspace" className="space-y-6">
            <Card className="bg-[#1a2332] border-[#06b6d4]/30">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Globe className="h-16 w-16 text-[#06b6d4]/40 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/60 text-lg">Gestione HUB</p>
                  <p className="text-sm text-[#e8fbff]/40 mt-2">Contenuto da definire</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
      <PanicButton />

    </>
  );
}


const DocModal: React.FC<{ content: { title: string; content: string } | null; onClose: () => void }> = ({ content, onClose }) => {
  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a2332] border border-[#06b6d4]/30 rounded-lg p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-[#e8fbff] mb-4">{content.title}</h2>
        <div className="text-[#e8fbff]/80 space-y-4" dangerouslySetInnerHTML={{ __html: content.content }} />
        <Button onClick={onClose} className="mt-6 bg-[#06b6d4] hover:bg-[#06b6d4]/80">Chiudi</Button>
      </div>
    </div>
  );
};
// Force rebuild Sun Jan 11 22:54:53 EST 2026
