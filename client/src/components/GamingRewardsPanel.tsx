/**
 * GamingRewardsPanel - Pannello Gaming & Rewards per Dashboard PA
 * Versione: 1.3.5
 * Data: 07 Febbraio 2026
 * 
 * Sistema unificato di gamification e incentivi per l'ecosistema MioHub.
 * Include: Regolatori TCC, Heatmap Commerciale, Statistiche, Classifiche.
 * 
 * NOTA: Usa REST API invece di tRPC per compatibilità con Vercel static deployment
 */
import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Gamepad2, Settings, Save, RefreshCw, Loader2, 
  Radio, Bus, Landmark, ShoppingCart, Gift, Trophy,
  TrendingUp, Users, Leaf, Coins, MapPin, ChevronDown, ChevronUp,
  BarChart3, Store, AlertCircle, Clock, Camera, X, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useImpersonation } from '@/hooks/useImpersonation';

// Fix per icone marker Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// URL API REST Gaming Rewards — in produzione usa proxy Vercel (/api/gaming-rewards/* → orchestratore.mio-hub.me)
// In sviluppo usa l'URL diretto dell'orchestratore
const API_BASE_URL = import.meta.env.DEV
  ? 'https://orchestratore.mio-hub.me'
  : '';

// URL API Hetzner per civic-reports (servite da api.mio-hub.me)
const HETZNER_API_URL = 'https://api.mio-hub.me';

// Coordinate centri comuni
const COMUNI_COORDS: Record<number, { lat: number; lng: number; nome: string }> = {
  1: { lat: 42.7635, lng: 11.1126, nome: 'Grosseto' },
  6: { lat: 44.4949, lng: 11.3426, nome: 'Bologna' },
  7: { lat: 44.4898, lng: 11.0123, nome: 'Vignola' },
  8: { lat: 44.6471, lng: 10.9252, nome: 'Modena' },
  9: { lat: 44.7842, lng: 10.8847, nome: 'Carpi' },
  10: { lat: 44.5343, lng: 10.7847, nome: 'Sassuolo' },
  12: { lat: 44.4726, lng: 11.2755, nome: 'Casalecchio di Reno' },
  13: { lat: 44.4175, lng: 12.1996, nome: 'Ravenna' },
};

const DEFAULT_CENTER = { lat: 42.5, lng: 12.5 };
const DEFAULT_ZOOM = 6;

// Interfacce
interface GamingConfig {
  comune_id: number;
  civic_enabled: boolean;
  civic_tcc_default: number;
  civic_tcc_urgent: number;
  civic_tcc_photo_bonus: number;
  mobility_enabled: boolean;
  mobility_tcc_bus: number;
  mobility_tcc_bike_km: number;
  mobility_tcc_walk_km: number;
  culture_enabled: boolean;
  culture_tcc_museum: number;
  culture_tcc_monument: number;
  culture_tcc_route: number;
  shopping_enabled: boolean;
  shopping_cashback_percent: number;
  shopping_km0_bonus: number;
  shopping_market_bonus: number;
}

interface HeatmapPoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: 'shop' | 'hub' | 'market' | 'civic' | 'mobility' | 'culture' | 'referral';
  tcc_earned: number;
  tcc_spent: number;
  transactions: number;
  created_at?: string;
  comune_id?: number; // v1.3.3: per filtro preciso per comune
}

interface GamingStats {
  total_tcc_issued: number;
  total_tcc_spent: number;
  active_users: number;
  co2_saved_kg: number;
  top_shops: Array<{ name: string; tcc: number }>;
}

// Interfaccia per Azioni Mobilità Sostenibile (percorsi completati dai cittadini)
interface MobilityAction {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string; // bus, bike, walk
  tcc_reward: number;
  co2_saved_g: number;
  completed_at: string;
  user_id?: number;
  point_type: 'mobility_action';
  comune_id?: number; // v1.3.3: per filtro preciso per comune
}

// Interfaccia per Azioni Cultura (visite effettuate dai cittadini)
interface CultureAction {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: string; // museum, castle, monument, archaeological, theatre
  tcc_reward: number;
  visit_date: string;
  user_id?: number;
  poi_id?: number;
  point_type: 'culture_action';
  comune_id?: number; // v1.3.3: per filtro preciso per comune
}

// Interfaccia per Referral
interface ReferralItem {
  id: number;
  referrer_user_id: number;
  referred_user_id: number | null;
  referral_code: string;
  status: string; // pending, registered, first_purchase, expired
  tcc_earned_referrer: number;
  tcc_earned_referred: number;
  comune_id: number;
  created_at: string;
  registered_at: string | null;
  first_purchase_at: string | null;
  lat: number | null;
  lng: number | null;
}

// Interfaccia per Challenge
interface ChallengeItem {
  id: number;
  comune_id: number;
  title: string;
  description: string;
  category: string; // civic, mobility, culture, shopping
  challenge_type: string; // count, co2, visits, purchases
  target_value: number;
  tcc_reward: number;
  bonus_multiplier: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  icon: string;
  color: string;
  participants_count: number;
  completions_count: number;
  // Progresso utente (se user_id passato)
  user_progress?: number;
  user_completed?: boolean;
  user_rewarded?: boolean;
  user_joined_at?: string;
}

// Interfaccia per Top 5 Negozi
interface TopShop {
  name: string;
  tcc_earned: number;
  tcc_spent: number;
  transactions: number;
  comune_id?: number; // v1.3.3: per filtro preciso per comune
}

// Interfaccia per Trend TCC giornaliero
interface TrendDataPoint {
  date: string;
  tcc_earned: number;
  tcc_spent: number;
  reports: number;
  mobility?: number;  // Azioni mobilità sostenibile
  culture?: number;   // Visite culturali
  shopping?: number;  // Transazioni acquisti (totale, legacy)
  shopping_shop?: number;  // Acquisti Negozio
  shopping_market?: number;  // Acquisti Mercato
  referral?: number;  // Referral "Presenta un Amico"
}

// Default config
const DEFAULT_CONFIG: GamingConfig = {
  comune_id: 1,
  civic_enabled: true,
  civic_tcc_default: 10,
  civic_tcc_urgent: 5,
  civic_tcc_photo_bonus: 5,
  mobility_enabled: false,
  mobility_tcc_bus: 10,
  mobility_tcc_bike_km: 3,
  mobility_tcc_walk_km: 5,
  culture_enabled: false,
  culture_tcc_museum: 100,
  culture_tcc_monument: 50,
  culture_tcc_route: 300,
  shopping_enabled: true,
  shopping_cashback_percent: 1,
  shopping_km0_bonus: 20,
  shopping_market_bonus: 10,
};

// Componente per centrare la mappa
// Aggiornato: ora reagisce anche al cambio di selectedLayer per flyTo sui punti filtrati
// v1.2.0: Aggiunto supporto per mobility e culture layers
function MapCenterUpdater({ 
  points, 
  civicReports,
  mobilityActions,
  cultureActions,
  referralList = [],
  comuneId, 
  selectedLayer,
  layerTrigger,
  geoFilter = 'italia'
}: { 
  points: HeatmapPoint[]; 
  civicReports: HeatmapPoint[]; 
  mobilityActions: MobilityAction[];
  cultureActions: CultureAction[];
  referralList?: ReferralItem[];
  comuneId: number | null;
  selectedLayer: string;
  layerTrigger: number;
  geoFilter?: 'italia' | 'comune';
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // v1.3.0: Se geoFilter='italia', mostra vista Italia
    if (geoFilter === 'italia') {
      map.flyTo([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM, { duration: 1 });
      return;
    }
    
    // Se geoFilter='comune', centra sul comune selezionato
    if (comuneId && COMUNI_COORDS[comuneId]) {
      const coords = COMUNI_COORDS[comuneId];
      map.flyTo([coords.lat, coords.lng], 14, { duration: 1.5 });
      return;
    }
    
    // Fallback: determina quali punti mostrare in base al layer selezionato
    let targetPoints: Array<{lat: number; lng: number}> = [];
    
    if (selectedLayer === 'civic') {
      targetPoints = civicReports;
    } else if (selectedLayer === 'shop') {
      targetPoints = points.filter(p => p.type === 'shop');
    } else if (selectedLayer === 'market') {
      targetPoints = points.filter(p => p.type === 'market');
    } else if (selectedLayer === 'mobility') {
      targetPoints = mobilityActions.map(m => ({ lat: parseFloat(String(m.lat)), lng: parseFloat(String(m.lng)) }));
    } else if (selectedLayer === 'culture') {
      targetPoints = cultureActions.map(c => ({ lat: parseFloat(String(c.lat)), lng: parseFloat(String(c.lng)) }));
    } else if (selectedLayer === 'referral') {
      targetPoints = referralList.filter(r => r.lat && r.lng).map(r => ({ lat: Number(r.lat), lng: Number(r.lng) }));
    } else {
      targetPoints = [...points, ...civicReports];
    }
    
    if (targetPoints.length > 0) {
      const lats = targetPoints.map(p => p.lat);
      const lngs = targetPoints.map(p => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      if (maxLat - minLat < 0.01 && maxLng - minLng < 0.01) {
        const avgLat = (minLat + maxLat) / 2;
        const avgLng = (minLng + maxLng) / 2;
        map.flyTo([avgLat, avgLng], 15, { duration: 1.5 });
      } else {
        map.flyToBounds(
          [[minLat, minLng], [maxLat, maxLng]],
          { padding: [50, 50], duration: 1.5, maxZoom: 16 }
        );
      }
      return;
    }
    
    map.flyTo([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM, { duration: 1 });
  }, [map, points, civicReports, comuneId, selectedLayer, layerTrigger, geoFilter]);
  
  return null;
}

// Componente Heatmap Layer - filtra per selectedLayer
function HeatmapLayer({ points, selectedLayer }: { points: HeatmapPoint[]; selectedLayer: string }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    
    // Filtra i punti in base al layer selezionato
    let filteredPoints = points;
    if (selectedLayer === 'civic') {
      filteredPoints = points.filter(p => p.type === 'civic');
    } else if (selectedLayer === 'shop') {
      filteredPoints = points.filter(p => p.type === 'shop');
    } else if (selectedLayer === 'market') {
      filteredPoints = points.filter(p => p.type === 'market');
    } else if (selectedLayer === 'mobility') {
      filteredPoints = points.filter(p => p.type === 'mobility');
    } else if (selectedLayer === 'culture') {
      filteredPoints = points.filter(p => p.type === 'culture');
    } else if (selectedLayer === 'referral') {
      filteredPoints = points.filter(p => p.type === 'referral');
    }
    // 'all' mostra tutti i punti
    
    if (filteredPoints.length === 0) return;
    
    const heatData: [number, number, number][] = filteredPoints.map(p => {
      // Intensità base bassa per tutti i tipi - più punti vicini = più calore
      let intensity: number;
      if (p.type === 'civic') {
        intensity = 0.25; // Intensità bassa per segnalazioni
      } else if (p.type === 'mobility') {
        intensity = 0.25; // Intensità bassa per mobilità
      } else if (p.type === 'culture') {
        intensity = 0.25; // Intensità bassa per cultura
      } else {
        // Acquisti: intensità bassa, scala con TCC ma max 0.3
        intensity = Math.min((p.tcc_earned + p.tcc_spent) / 20000, 0.3);
        if (intensity === 0) intensity = 0.15; // Minimo visibile per mercati
      }
      return [p.lat, p.lng, intensity];
    });
    
    const heatLayer = (L as any).heatLayer(heatData, {
      radius: 35,
      blur: 20,
      maxZoom: 18,
      max: 1.0,
      gradient: {
        0.0: '#22c55e',
        0.25: '#84cc16',
        0.5: '#eab308',
        0.75: '#f97316',
        1.0: '#ef4444'
      }
    }).addTo(map);
    
    return () => {
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points, selectedLayer]);
  
   return null;
}

// Funzione generica per calcolare offset spirale per punti sovrapposti
// Funziona con qualsiasi tipo di punto che abbia lat e lng
function applySpiralOffsetGeneric<T extends { lat: number; lng: number }>(points: T[]): (T & { offsetLat: number; offsetLng: number })[] {
  // Raggruppa per posizione (arrotondando a 5 decimali per raggruppare punti molto vicini)
  const groups: Map<string, T[]> = new Map();
  
  points.forEach(point => {
    const key = `${point.lat.toFixed(5)}_${point.lng.toFixed(5)}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  });
  
  const result: (T & { offsetLat: number; offsetLng: number })[] = [];
  
  groups.forEach((groupPoints) => {
    if (groupPoints.length === 1) {
      // Singolo punto, nessun offset
      result.push({ ...groupPoints[0], offsetLat: 0, offsetLng: 0 });
    } else {
      // Multipli punti - disponi in spirale
      const baseRadius = 0.00004; // Raggio base in gradi (~4m) - marker appoggiati
      const radiusIncrement = 0.00003; // Incremento raggio per ogni giro
      const pointsPerRing = 6; // Punti per ogni anello della spirale
      
      groupPoints.forEach((point, index) => {
        if (index === 0) {
          // Primo punto al centro
          result.push({ ...point, offsetLat: 0, offsetLng: 0 });
        } else {
          // Calcola posizione spirale
          const ring = Math.floor((index - 1) / pointsPerRing); // Quale anello
          const posInRing = (index - 1) % pointsPerRing; // Posizione nell'anello
          const radius = baseRadius + (ring * radiusIncrement);
          const angle = (posInRing / pointsPerRing) * 2 * Math.PI + (ring * 0.5); // Angolo con rotazione per ogni anello
          
          const offsetLat = radius * Math.cos(angle);
          const offsetLng = radius * Math.sin(angle);
          
          result.push({ ...point, offsetLat, offsetLng });
        }
      });
    }
  });
  
  return result;
}

// Funzione per calcolare offset spirale per punti sovrapposti (HeatmapPoint)
// Raggruppa i punti per posizione e li dispone in cerchi concentrici
function applySpiralOffset(points: HeatmapPoint[]): (HeatmapPoint & { offsetLat: number; offsetLng: number })[] {
  // Raggruppa per posizione (arrotondando a 5 decimali per raggruppare punti molto vicini)
  const groups: Map<string, HeatmapPoint[]> = new Map();
  
  points.forEach(point => {
    const key = `${point.lat.toFixed(5)}_${point.lng.toFixed(5)}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  });
  
  const result: (HeatmapPoint & { offsetLat: number; offsetLng: number })[] = [];
  
  groups.forEach((groupPoints) => {
    if (groupPoints.length === 1) {
      // Singolo punto, nessun offset
      result.push({ ...groupPoints[0], offsetLat: 0, offsetLng: 0 });
    } else {
      // Multipli punti - disponi in spirale
      const baseRadius = 0.00004; // Raggio base in gradi (~4m) - marker appoggiati
      const radiusIncrement = 0.00003; // Incremento raggio per ogni giro
      const pointsPerRing = 6; // Punti per ogni anello della spirale
      
      groupPoints.forEach((point, index) => {
        if (index === 0) {
          // Primo punto al centro
          result.push({ ...point, offsetLat: 0, offsetLng: 0 });
        } else {
          // Calcola posizione spirale
          const ring = Math.floor((index - 1) / pointsPerRing); // Quale anello
          const posInRing = (index - 1) % pointsPerRing; // Posizione nell'anello
          const radius = baseRadius + (ring * radiusIncrement);
          const angle = (posInRing / pointsPerRing) * 2 * Math.PI + (ring * 0.5); // Angolo con rotazione per ogni anello
          
          const offsetLat = radius * Math.cos(angle);
          const offsetLng = radius * Math.sin(angle);
          
          result.push({ ...point, offsetLat, offsetLng });
        }
      });
    }
  });
  
  return result;
}

// Icone marker per tipo
const getMarkerIcon = (type: string, intensity: number = 0.5) => {
  const emoji: Record<string, string> = {
    // Shopping
    'shop': '🏪',
    'hub': '🏢',
    'market': '🛒',
    // Civic
    'civic': '📢',
    // Mobility
    'bus': '🚌',
    'tram': '🚊',
    'train': '🚆',
    'stop': '🚏',
    // Culture
    'museum': '🏛️',
    'castle': '🏰',
    'monument': '🗿',
    'archaeological': '⛏️',
    'theatre': '🎭',
    // Referral
    'referral': '🎁',
  };
  
  const iconEmoji = emoji[type] || '📍';
  
  // Colore specifico per tipo
  let bgColor = '#22c55e'; // Default verde
  if (type === 'civic') {
    bgColor = '#f97316'; // Arancione per segnalazioni
  } else if (['bus', 'tram', 'train', 'stop'].includes(type)) {
    bgColor = '#06b6d4'; // Cyan per mobilità
  } else if (['museum', 'castle', 'monument', 'archaeological', 'theatre'].includes(type)) {
    bgColor = '#a855f7'; // Viola per cultura
  } else if (type === 'referral') {
    bgColor = '#EC4899'; // Fuchsia per referral
  } else if (intensity > 0.7) {
    bgColor = '#8b5cf6'; // Viola per alta intensità
  } else if (intensity > 0.4) {
    bgColor = '#eab308'; // Giallo per media intensità
  }
  
  // Dimensione marker - tutti uniformi a 15px
  const size = 15;
  const fontSize = 9;
  
  return L.divIcon({
    html: `<div style="
      background: ${bgColor};
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${iconEmoji}</div>`,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

// Componente Card Categoria
function CategoryCard({ 
  title, 
  icon: Icon, 
  color, 
  enabled, 
  onToggle, 
  children 
}: { 
  title: string; 
  icon: any; 
  color: string; 
  enabled: boolean; 
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={`bg-[#1a2332] border-${color}/30 ${!enabled ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-base">
            <Icon className={`h-5 w-5 text-${color}`} />
            {title}
          </CardTitle>
          <Switch 
            checked={enabled} 
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-[#8b5cf6]"
          />
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// Componente Input Parametro
function ParamInput({ 
  label, 
  value, 
  onChange, 
  suffix = 'TCC',
  min = 0,
  max = 1000
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[#e8fbff]/70 text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
          className="bg-[#0b1220] border-[#8b5cf6]/30 text-[#e8fbff] h-8 text-sm"
          min={min}
          max={max}
        />
        <span className="text-[#e8fbff]/50 text-xs w-10">{suffix}</span>
      </div>
    </div>
  );
}

// Componente Principale
export default function GamingRewardsPanel() {
  const [config, setConfig] = useState<GamingConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<GamingStats | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [civicReports, setCivicReports] = useState<HeatmapPoint[]>([]);
  const [mobilityActions, setMobilityActions] = useState<MobilityAction[]>([]);
  const [cultureActions, setCultureActions] = useState<CultureAction[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [layerTrigger, setLayerTrigger] = useState<number>(0); // Trigger per forzare flyTo su cambio layer
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  // v1.3.0: Leggo impersonalizzazione PRIMA di inizializzare geoFilter
  const { comuneId, comuneNome, isImpersonating } = useImpersonation();
  
  // geoFilter default: sempre 'italia' all'ingresso, così l'utente vede la mappa Italia
  // e cliccando il tab del comune parte l'animazione zoom
  const [geoFilter, setGeoFilter] = useState<'italia' | 'comune'>('italia');
  const [topShops, setTopShops] = useState<TopShop[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [selectedReport, setSelectedReport] = useState<HeatmapPoint | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(true);
  const [referralList, setReferralList] = useState<ReferralItem[]>([]);
  const [referralTotal, setReferralTotal] = useState(0);
  const [challengesList, setChallengesList] = useState<ChallengeItem[]>([]);
  const [challengesExpanded, setChallengesExpanded] = useState(true);
  
  // Se admin non sta impersonando, non filtrare per comune (vede tutto)
  // Se sta impersonando, usa il comune selezionato
  const currentComuneId = isImpersonating && comuneId ? parseInt(comuneId) : null;
  // v1.3.3: Le API caricano SEMPRE TUTTI i dati (senza filtro comune)
  // Il filtro per comune è SOLO client-side via filterByGeo con comune_id diretto
  // Così "Tutta Italia" mostra tutto e "[Comune]" filtra localmente per comune_id
  const comuneQueryParam = ''; // Non filtrare mai lato server
  // v1.3.4: Il trend è un'aggregazione giornaliera (SUM per date), NON può essere filtrato client-side.
  // Quindi passiamo comune_id all'API trend SOLO quando geoFilter='comune'
  // v1.3.5: Il trend ora risponde ai filtri temporali (Tutto, Oggi, 7gg, 30gg, 1 anno)
  const trendDaysMap: Record<string, number> = { 'all': 3650, 'today': 1, 'week': 7, 'month': 30, 'year': 365 };
  const trendDays = trendDaysMap[timeFilter] || 7;
  const trendQueryParams: string[] = [];
  if (geoFilter === 'comune' && currentComuneId) trendQueryParams.push(`comune_id=${currentComuneId}`);
  trendQueryParams.push(`days=${trendDays}`);
  const trendComuneQueryParam = trendQueryParams.join('&');
  // Per la configurazione: usare sempre un comune_id valido (default Grosseto=1)
  const configComuneId = currentComuneId || 1;

  // v1.3.3: Filtro per comune_id DIRETTO (non più coordinate+raggio)
  // Quando geoFilter='comune': filtra per item.comune_id === currentComuneId (match esatto)
  // Quando geoFilter='italia': ritorna tutti i dati
  // Fallback: se item non ha comune_id, usa coordinate con raggio 5km (molto stretto)
  const filterByGeo = useCallback((items: any[]) => {
    if (geoFilter === 'italia' || !currentComuneId) return items;
    
    const comuneCoords = COMUNI_COORDS[currentComuneId];
    
    return items.filter(item => {
      // Priorità 1: filtro per comune_id diretto (preciso)
      if (item.comune_id !== undefined && item.comune_id !== null) {
        return parseInt(item.comune_id) === currentComuneId;
      }
      
      // Fallback: se non ha comune_id, usa coordinate con raggio 5km (stretto)
      if (!comuneCoords) return false;
      const lat = parseFloat(item.lat) || 0;
      const lng = parseFloat(item.lng) || 0;
      if (!lat || !lng) return false;
      
      const dLat = (lat - comuneCoords.lat) * 111;
      const dLng = (lng - comuneCoords.lng) * 111 * Math.cos(comuneCoords.lat * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return distance <= 5; // 5km fallback (era 30km)
    });
  }, [geoFilter, currentComuneId]);

  // Funzione per filtrare per periodo temporale
  const filterByTime = useCallback((items: any[], dateField: string = 'created_at') => {
    if (timeFilter === 'all') return items;
    
    const now = new Date();
    const startDate = new Date();
    
    switch (timeFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate;
    });
  }, [timeFilter]);

  // Funzione combinata per filtrare per geo + tempo
  const filterData = useCallback((items: any[], dateField: string = 'created_at') => {
    return filterByTime(filterByGeo(items), dateField);
  }, [filterByGeo, filterByTime]);

  // Funzione per caricare la configurazione via REST API
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/config?comune_id=${configComuneId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const cfg = result.data;
          // Il backend ritorna struttura annidata: civic_reports, mobility, culture, shopping
          // Mappiamo correttamente i campi
          setConfig({
            comune_id: currentComuneId || 1,
            // Civic Reports
            civic_enabled: cfg.civic_reports?.enabled ?? cfg.civic_enabled ?? true,
            civic_tcc_default: cfg.civic_reports?.tcc_default ?? cfg.civic_tcc_default ?? 10,
            civic_tcc_urgent: cfg.civic_reports?.tcc_urgent ?? cfg.civic_tcc_urgent ?? 5,
            civic_tcc_photo_bonus: cfg.civic_reports?.bonus_photo ?? cfg.civic_tcc_photo_bonus ?? 5,
            // Mobility
            mobility_enabled: cfg.mobility?.enabled ?? cfg.mobility_enabled ?? false,
            mobility_tcc_bus: cfg.mobility?.tcc_bus_tram ?? cfg.mobility_tcc_bus ?? 10,
            mobility_tcc_bike_km: cfg.mobility?.tcc_per_km_bike ?? cfg.mobility_tcc_bike_km ?? 3,
            mobility_tcc_walk_km: cfg.mobility?.tcc_per_km_walk ?? cfg.mobility_tcc_walk_km ?? 5,
            // Culture
            culture_enabled: cfg.culture?.enabled ?? cfg.culture_enabled ?? false,
            culture_tcc_museum: cfg.culture?.tcc_museo ?? cfg.culture_tcc_museum ?? 100,
            culture_tcc_monument: cfg.culture?.tcc_monumento ?? cfg.culture_tcc_monument ?? 50,
            culture_tcc_route: cfg.culture?.tcc_percorso ?? cfg.culture_tcc_route ?? 300,
            // Shopping
            shopping_enabled: cfg.shopping?.enabled ?? cfg.shopping_enabled ?? true,
            shopping_cashback_percent: parseFloat(cfg.shopping?.cashback_percent ?? cfg.shopping_cashback_percent) || 1,
            shopping_km0_bonus: cfg.shopping?.bonus_km0_percent ?? cfg.shopping_km0_bonus ?? 20,
            shopping_market_bonus: cfg.shopping?.bonus_mercato_percent ?? cfg.shopping_market_bonus ?? 10,
          });
        }
      }
    } catch (error) {
      console.error('Errore caricamento config:', error);
    }
  }, [configComuneId]);

  // Funzione per caricare le statistiche via REST API
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/stats${comuneQueryParam ? '?' + comuneQueryParam : ''}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Il backend ritorna i dati direttamente in result.data (non in result.data.stats)
          const s = result.data;
          setStats({
            total_tcc_issued: s.tcc_emessi || s.total_tcc_earned || 0,
            total_tcc_spent: s.tcc_spesi || s.total_tcc_spent || 0,
            active_users: s.utenti_attivi || s.active_users || 0,
            co2_saved_kg: s.co2_risparmiata_kg || s.co2_saved || 0,
            top_shops: s.top_shops || []
          });
        }
      }
    } catch (error) {
      console.error('Errore caricamento stats:', error);
    }
  }, [comuneQueryParam]);

  // Funzione per caricare le segnalazioni civiche
  // v1.3.6: Carica TUTTE le segnalazioni (non solo stats.recent) per storico completo
  const loadCivicReports = useCallback(async () => {
    if (!config.civic_enabled) {
      setCivicReports([]);
      return;
    }
    try {
      // Carica lista completa segnalazioni, fallback su stats.recent
      const [reportsRes, statsRes] = await Promise.all([
        fetch(`${HETZNER_API_URL}/api/civic-reports?limit=200`).catch(() => null),
        fetch(`${HETZNER_API_URL}/api/civic-reports/stats`).catch(() => null),
      ]);

      let rawReports: any[] = [];
      if (reportsRes?.ok) {
        const reportsData = await reportsRes.json();
        if (reportsData.success && Array.isArray(reportsData.data)) {
          rawReports = reportsData.data;
        }
      }
      // Fallback: se la lista completa non disponibile, usa stats.recent
      if (rawReports.length === 0 && statsRes?.ok) {
        const data = await statsRes.json();
        if (data.success && data.data?.recent) {
          rawReports = data.data.recent;
        }
      }

      const points: HeatmapPoint[] = rawReports
        .filter((r: any) => r.lat && r.lng)
        .map((r: any) => ({
          id: r.id,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lng),
          name: r.type || 'Segnalazione',
          type: 'civic' as const,
          tcc_earned: r.tcc_reward || 0,
          tcc_spent: 0,
          transactions: 1,
          created_at: r.created_at || r.resolved_at || undefined,
          comune_id: r.comune_id ? parseInt(r.comune_id) : undefined,
        }));
      setCivicReports(points);
    } catch (error) {
      console.error('Errore caricamento segnalazioni:', error);
    }
  }, [config.civic_enabled]);

  // Funzione per caricare i punti heatmap via REST API
  const loadHeatmapPoints = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/heatmap${comuneQueryParam ? '?' + comuneQueryParam : ''}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          const points: HeatmapPoint[] = result.data.map((p: any) => ({
            id: p.id,
            lat: parseFloat(p.lat) || 0,
            lng: parseFloat(p.lng) || 0,
            name: p.name || 'Punto',
            type: p.type || 'shop',
            tcc_earned: p.tcc_earned || 0,
            tcc_spent: p.tcc_spent || 0,
            transactions: p.transaction_count || 1,
            created_at: p.created_at || new Date().toISOString(),
            comune_id: p.comune_id ? parseInt(p.comune_id) : undefined, // v1.3.3
          }));
          setHeatmapPoints(points);
        }
      }
    } catch (error) {
      console.error('Errore caricamento heatmap:', error);
    }
  }, [comuneQueryParam]);

  // Funzione per caricare Top 5 Negozi via REST API
  const loadTopShops = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/top-shops${comuneQueryParam ? '?' + comuneQueryParam : ''}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          // Mappa i campi del backend ai campi del frontend
          const mappedShops: TopShop[] = result.data.slice(0, 5).map((shop: any) => ({
            name: shop.shop_name || shop.name || 'Negozio',
            tcc_earned: parseInt(shop.total_tcc) || shop.tcc_earned || 0,
            tcc_spent: parseInt(shop.tcc_spent) || 0,
            transactions: parseInt(shop.transaction_count) || shop.transactions || 0,
            comune_id: shop.comune_id ? parseInt(shop.comune_id) : undefined, // v1.3.3
          }));
          setTopShops(mappedShops);
        }
      }
    } catch (error) {
      console.error('Errore caricamento top shops:', error);
    }
  }, [comuneQueryParam]);

  // Funzione per caricare Trend TCC (ultimi 7 giorni) via REST API
  const loadTrendData = useCallback(async () => {
    try {
      // v1.3.5: Il trend usa trendComuneQueryParam (dipende da geoFilter + timeFilter)
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/trend?${trendComuneQueryParam}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          // Mappa i campi del backend ai campi del frontend
          const mappedTrend: TrendDataPoint[] = result.data.map((day: any) => ({
            date: day.date,
            tcc_earned: parseInt(day.tcc_earned) || 0,
            tcc_spent: parseInt(day.tcc_spent) || 0,
            reports: parseInt(day.reports) || 0,
            mobility: parseInt(day.mobility) || 0,
            culture: parseInt(day.culture) || 0,
            shopping: parseInt(day.shopping) || 0,
            shopping_shop: parseInt(day.shopping_shop) || 0,
            shopping_market: parseInt(day.shopping_market) || 0,
            referral: parseInt(day.referral) || 0,
          }));
          setTrendData(mappedTrend);
        }
      }
    } catch (error) {
      console.error('Errore caricamento trend data:', error);
    }
  }, [trendComuneQueryParam]);

  // Funzione per caricare le Azioni Mobilità (percorsi completati dai cittadini)
  // v1.3.1: Carica SEMPRE i dati del comune impersonalizzato (NON dipende da geoFilter)
  const loadMobilityActions = useCallback(async () => {
    if (!config.mobility_enabled) {
      setMobilityActions([]);
      return;
    }
    try {
      const periodMap: Record<string, string> = {
        'all': 'all',
        'today': 'today',
        'week': '7days',
        'month': '30days',
        'year': '1year'
      };
      const period = periodMap[timeFilter] || 'all';
      
      // v1.3.2: Carica TUTTI i dati senza filtro comune — filtro è solo client-side
      let url = `${API_BASE_URL}/api/gaming-rewards/mobility/heatmap?period=${period}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          const actions: MobilityAction[] = result.data.map((a: any) => ({
            id: a.id,
            name: a.name || 'Percorso sostenibile',
            lat: parseFloat(a.lat) || 0,
            lng: parseFloat(a.lng) || 0,
            type: a.type || 'bus',
            tcc_reward: a.tcc_reward || 10,
            co2_saved_g: parseFloat(a.co2_saved_g) || 0,
            completed_at: a.completed_at,
            user_id: a.user_id,
            point_type: 'mobility_action' as const,
            comune_id: a.comune_id ? parseInt(a.comune_id) : undefined, // v1.3.3
          }));
          setMobilityActions(actions);
        } else {
          setMobilityActions([]);
        }
      }
    } catch (error) {
      console.error('Errore caricamento mobility actions:', error);
      setMobilityActions([]);
    }
  }, [config.mobility_enabled, timeFilter]);

  // Funzione per caricare le Azioni Cultura (visite effettuate dai cittadini)
  // v1.3.2: Carica TUTTI i dati senza filtro comune — filtro è solo client-side
  const loadCultureActions = useCallback(async () => {
    if (!config.culture_enabled) {
      setCultureActions([]);
      return;
    }
    try {
      const periodMap: Record<string, string> = {
        'all': 'all',
        'today': 'today',
        'week': '7days',
        'month': '30days',
        'year': '1year'
      };
      const period = periodMap[timeFilter] || 'all';
      
      // v1.3.2: Carica TUTTI i dati senza filtro comune
      let url = `${API_BASE_URL}/api/gaming-rewards/culture/heatmap?period=${period}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          const actions: CultureAction[] = result.data.map((v: any) => ({
            id: v.id,
            name: v.name || 'Visita culturale',
            lat: parseFloat(v.lat) || 0,
            lng: parseFloat(v.lng) || 0,
            type: v.type || 'museum',
            tcc_reward: v.tcc_reward || 15,
            visit_date: v.visit_date,
            user_id: v.user_id,
            poi_id: v.poi_id,
            point_type: 'culture_action' as const,
            comune_id: v.comune_id ? parseInt(v.comune_id) : undefined, // v1.3.3
          }));
          setCultureActions(actions);
        } else {
          setCultureActions([]);
        }
      }
    } catch (error) {
      console.error('Errore caricamento culture actions:', error);
      setCultureActions([]);
    }
  }, [config.culture_enabled, timeFilter]);

  // Funzione per caricare la lista Referral dal backend
  const loadReferralList = useCallback(async () => {
    if (!config.shopping_enabled) {
      setReferralList([]);
      setReferralTotal(0);
      return;
    }
    try {
      const periodMap: Record<string, number> = {
        'all': 3650,
        'today': 1,
        'week': 7,
        'month': 30,
        'year': 365
      };
      const days = periodMap[timeFilter] || 3650;
      // v1.3.2: Carica TUTTI i dati senza filtro comune
      let referralUrl = `${API_BASE_URL}/api/gaming-rewards/referral/list?days=${days}`;
      const response = await fetch(referralUrl);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setReferralList(result.data || []);
          setReferralTotal(result.total || 0);
        } else {
          setReferralList([]);
          setReferralTotal(0);
        }
      }
    } catch (error) {
      console.error('Errore caricamento referral list:', error);
      setReferralList([]);
      setReferralTotal(0);
    }
  }, [config.shopping_enabled, timeFilter]);

  // Funzione per caricare le Challenges dal backend
  const loadChallenges = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/challenges?comune_id=${configComuneId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setChallengesList(result.data);
        } else {
          setChallengesList([]);
        }
      }
    } catch (error) {
      console.error('Errore caricamento challenges:', error);
      setChallengesList([]);
    }
  }, [configComuneId]);

  // Carica la configurazione SOLO all'avvio o quando cambia il comune
  // NON ricaricare quando cambiano i toggle (altrimenti sovrascrive le modifiche utente)
  useEffect(() => {
    loadConfig();
  }, [configComuneId]); // Solo quando cambia il comune, non loadConfig stesso

  // Carica i dati (stats, heatmap, etc.) all'avvio e quando cambiano le dipendenze
  // ESCLUSO loadConfig per evitare di sovrascrivere i toggle modificati dall'utente
  // v1.3.4b: loadTrendData RIMOSSO da qui — ha il suo useEffect separato
  // così quando cambia geoFilter (Italia↔Comune) il trend si ricarica in background
  // SENZA setLoading(true) che causerebbe il reload visibile di tutta la pagina
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadStats(), 
        loadHeatmapPoints(), 
        loadCivicReports(), 
        loadTopShops(), 
        loadMobilityActions(),
        loadCultureActions(),
        loadReferralList(),
        loadChallenges()
      ]);
      setLoading(false);
    };
    loadAllData();
  }, [loadStats, loadHeatmapPoints, loadCivicReports, loadTopShops, loadMobilityActions, loadCultureActions, loadReferralList, loadChallenges]);

  // v1.3.4b: useEffect SEPARATO per il trend — si ricarica silenziosamente in background
  // quando cambia geoFilter (Italia↔Comune) senza causare setLoading(true)
  // Questo permette lo switch istantaneo: la mappa zooma, i dati si filtrano client-side,
  // e il trend si aggiorna in background senza ricaricare la pagina
  useEffect(() => {
    loadTrendData();
  }, [loadTrendData]);

  // Salva configurazione via REST API
  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comune_id: currentComuneId || 1, // Default a Grosseto se admin non impersona
          civic_enabled: config.civic_enabled,
          civic_tcc_default: config.civic_tcc_default,
          civic_tcc_urgent: config.civic_tcc_urgent,
          civic_tcc_photo_bonus: config.civic_tcc_photo_bonus,
          mobility_enabled: config.mobility_enabled,
          mobility_tcc_bus: config.mobility_tcc_bus,
          mobility_tcc_bike_km: config.mobility_tcc_bike_km,
          mobility_tcc_walk_km: config.mobility_tcc_walk_km,
          culture_enabled: config.culture_enabled,
          culture_tcc_museum: config.culture_tcc_museum,
          culture_tcc_monument: config.culture_tcc_monument,
          culture_tcc_route: config.culture_tcc_route,
          shopping_enabled: config.shopping_enabled,
          shopping_cashback_percent: config.shopping_cashback_percent,
          shopping_km0_bonus: config.shopping_km0_bonus,
          shopping_market_bonus: config.shopping_market_bonus,
        }),
      });

      if (response.ok) {
        toast.success('Configurazione Gaming & Rewards salvata!');
        // Ricarica i dati
        await loadConfig();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore sconosciuto');
      }
    } catch (error) {
      console.error('Errore salvataggio config:', error);
      toast.error(`Errore nel salvataggio: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Funzione refresh dati
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      loadConfig(), 
      loadStats(), 
      loadHeatmapPoints(), 
      loadCivicReports(), 
      loadTopShops(), 
      loadTrendData(),
      loadMobilityActions(),
      loadCultureActions()
    ]);
    setLoading(false);
    toast.success('Dati aggiornati');
  };

  // Determina centro iniziale mappa
  // v1.3.0: Rispetta geoFilter - se 'italia' vista Italia, se 'comune' centra sul comune
  const getInitialCenter = (): [number, number] => {
    if (geoFilter === 'comune' && currentComuneId && COMUNI_COORDS[currentComuneId]) {
      return [COMUNI_COORDS[currentComuneId].lat, COMUNI_COORDS[currentComuneId].lng];
    }
    return [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#8b5cf6]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-[#8b5cf6]" />
            Gaming & Rewards
            {comuneNome && <Badge variant="outline" className="ml-2 text-[#8b5cf6] border-[#8b5cf6]/50">{comuneNome}</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshData}
              className="border-[#8b5cf6]/50 text-[#e8fbff] hover:bg-[#8b5cf6]/20"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Aggiorna
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setConfigExpanded(!configExpanded)}
              className="border-[#8b5cf6]/50 text-[#e8fbff] hover:bg-[#8b5cf6]/20"
            >
              <Settings className="h-4 w-4 mr-1" />
              Configura
              {configExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Pannello Configurazione (collassabile) */}
      {configExpanded && (
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-[#8b5cf6]" />
              Configurazione Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Segnalazioni Civiche */}
              <CategoryCard
                title="Segnalazioni Civiche"
                icon={Radio}
                color="orange-500"
                enabled={config.civic_enabled}
                onToggle={(v) => setConfig({ ...config, civic_enabled: v })}
              >
                <div className="space-y-3">
                  <ParamInput
                    label="TCC Default (risolta)"
                    value={config.civic_tcc_default}
                    onChange={(v) => setConfig({ ...config, civic_tcc_default: v })}
                  />
                  <ParamInput
                    label="TCC Urgenti"
                    value={config.civic_tcc_urgent}
                    onChange={(v) => setConfig({ ...config, civic_tcc_urgent: v })}
                  />
                  <ParamInput
                    label="Bonus Foto"
                    value={config.civic_tcc_photo_bonus}
                    onChange={(v) => setConfig({ ...config, civic_tcc_photo_bonus: v })}
                  />
                </div>
              </CategoryCard>

              {/* Mobilità Sostenibile */}
              <CategoryCard
                title="Mobilità Sostenibile"
                icon={Bus}
                color="green-500"
                enabled={config.mobility_enabled}
                onToggle={(v) => setConfig({ ...config, mobility_enabled: v })}
              >
                <div className="space-y-3">
                  <ParamInput
                    label="TCC Bus/Tram"
                    value={config.mobility_tcc_bus}
                    onChange={(v) => setConfig({ ...config, mobility_tcc_bus: v })}
                  />
                  <ParamInput
                    label="TCC/km Bici"
                    value={config.mobility_tcc_bike_km}
                    onChange={(v) => setConfig({ ...config, mobility_tcc_bike_km: v })}
                  />
                  <ParamInput
                    label="TCC/km Piedi"
                    value={config.mobility_tcc_walk_km}
                    onChange={(v) => setConfig({ ...config, mobility_tcc_walk_km: v })}
                  />
                </div>
              </CategoryCard>

              {/* Cultura & Turismo */}
              <CategoryCard
                title="Cultura & Turismo"
                icon={Landmark}
                color="purple-500"
                enabled={config.culture_enabled}
                onToggle={(v) => setConfig({ ...config, culture_enabled: v })}
              >
                <div className="space-y-3">
                  <ParamInput
                    label="TCC Museo"
                    value={config.culture_tcc_museum}
                    onChange={(v) => setConfig({ ...config, culture_tcc_museum: v })}
                  />
                  <ParamInput
                    label="TCC Monumento"
                    value={config.culture_tcc_monument}
                    onChange={(v) => setConfig({ ...config, culture_tcc_monument: v })}
                  />
                  <ParamInput
                    label="TCC Percorso"
                    value={config.culture_tcc_route}
                    onChange={(v) => setConfig({ ...config, culture_tcc_route: v })}
                  />
                </div>
              </CategoryCard>

              {/* Presenta un Amico */}
              <CategoryCard
                title="Presenta un Amico"
                icon={Gift}
                color="pink-500"
                enabled={config.shopping_enabled}
                onToggle={(v) => setConfig({ ...config, shopping_enabled: v })}
              >
                <div className="space-y-3">
                  <ParamInput
                    label="TCC Invito"
                    value={config.shopping_cashback_percent}
                    onChange={(v) => setConfig({ ...config, shopping_cashback_percent: v })}
                    suffix="TCC"
                    max={1000}
                  />
                  <ParamInput
                    label="TCC Benvenuto"
                    value={config.shopping_km0_bonus}
                    onChange={(v) => setConfig({ ...config, shopping_km0_bonus: v })}
                    suffix="TCC"
                    max={1000}
                  />
                  <ParamInput
                    label="Bonus Primo Acquisto"
                    value={config.shopping_market_bonus}
                    onChange={(v) => setConfig({ ...config, shopping_market_bonus: v })}
                    suffix="TCC"
                    max={1000}
                  />
                </div>
              </CategoryCard>
            </div>

            {/* Pulsante Salva */}
            <div className="flex justify-end mt-6">
              <Button
                onClick={saveConfig}
                disabled={savingConfig}
                className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
              >
                {savingConfig ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Configurazione
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiche */}
      {/* v1.3.3: Stats calcolate combinando API /stats + somma TCC dalle azioni caricate */}
      {/* Quando geoFilter='comune': usa SOLO dati filtrati localmente (no stats API globali) */}
      {/* Quando geoFilter='italia': usa stats API + dati locali */}
      {(() => {
        // Calcola TCC dalle azioni caricate (mobilità + cultura + segnalazioni + acquisti)
        const filteredMobility = filterData(mobilityActions, 'completed_at');
        const filteredCulture = filterData(cultureActions, 'visit_date');
        const filteredCivic = filterData(civicReports, 'created_at');
        const filteredShops = filterData(heatmapPoints, 'created_at');
        
        // TCC rilasciati = somma TCC da tutte le azioni
        const tccFromMobility = filteredMobility.reduce((sum, a) => sum + (a.tcc_reward || 0), 0);
        const tccFromCulture = filteredCulture.reduce((sum, a) => sum + (a.tcc_reward || 0), 0);
        const tccFromCivic = filteredCivic.reduce((sum, r) => sum + (r.tcc_earned || 0), 0);
        const tccFromShops = filteredShops.reduce((sum, p) => sum + (p.tcc_earned || 0), 0);
        // v1.3.3: stats API sono globali, usale SOLO in vista Italia
        const tccFromApi = geoFilter === 'italia' ? (stats?.total_tcc_issued || 0) : 0;
        const totalTccIssued = tccFromMobility + tccFromCulture + tccFromCivic + tccFromShops + tccFromApi;
        
        // v1.3.3: TCC riscattati - in vista comune, calcola dai dati filtrati
        // In vista Italia, usa stats API
        const tccSpentFromShops = filteredShops.reduce((sum, p) => sum + (p.tcc_spent || 0), 0);
        const totalTccSpent = geoFilter === 'italia' ? (stats?.total_tcc_spent || 0) : tccSpentFromShops;
        
        // Utenti attivi = utenti unici dalle azioni filtrate
        const uniqueUserIds = new Set<number>();
        filteredMobility.forEach(a => a.user_id && uniqueUserIds.add(a.user_id));
        filteredCulture.forEach(a => a.user_id && uniqueUserIds.add(a.user_id));
        const totalActiveUsers = geoFilter === 'italia'
          ? Math.max(stats?.active_users || 0, uniqueUserIds.size)
          : uniqueUserIds.size;
        
        // CO2 = in vista comune solo dalla mobilità filtrata, in vista Italia anche stats API
        const co2FromMobility = filteredMobility.reduce((sum, a) => sum + (a.co2_saved_g || 0), 0) / 1000;
        const totalCo2 = geoFilter === 'italia'
          ? (stats?.co2_saved_kg || 0) + co2FromMobility
          : co2FromMobility;
        
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-[#e8fbff]/70 text-sm mb-1">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  TCC Rilasciati
                </div>
                <div className="text-2xl font-bold text-[#22c55e]">
                  {totalTccIssued.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-[#e8fbff]/70 text-sm mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  TCC Riscattati
                </div>
                <div className="text-2xl font-bold text-[#3b82f6]">
                  {totalTccSpent.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-[#e8fbff]/70 text-sm mb-1">
                  <Users className="h-4 w-4 text-purple-500" />
                  Utenti Attivi
                </div>
                <div className="text-2xl font-bold text-[#8b5cf6]">
                  {totalActiveUsers.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-[#e8fbff]/70 text-sm mb-1">
                  <Leaf className="h-4 w-4 text-green-500" />
                  CO₂ Risparmiata
                </div>
                <div className="text-2xl font-bold text-[#22c55e]">
                  {totalCo2.toFixed(1)} kg
                </div>
                <div className="text-xs text-slate-400">
                  ({(totalCo2 / 1000).toFixed(2)}t)
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Heatmap */}
      <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#8b5cf6]" />
            Heatmap Ecosistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtri Layer */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Tab Geografici - prima i filtri per area */}
            <button
              onClick={() => { setGeoFilter('italia'); setSelectedLayer('all'); setLayerTrigger(t => t + 1); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                geoFilter === 'italia' 
                  ? 'bg-[#eab308] text-black' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              🇮🇹 Tutta Italia
            </button>
            {isImpersonating && comuneNome && (
              <button
                onClick={() => { setGeoFilter('comune'); setSelectedLayer('all'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  geoFilter === 'comune' 
                    ? 'bg-[#8b5cf6] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                📍 {comuneNome}
              </button>
            )}
            
            {/* Separatore */}
            <div className="w-px h-6 bg-[#e8fbff]/20 mx-1"></div>
            
            {/* Filtri per tipo di layer */}
            <button
              onClick={() => { setSelectedLayer('all'); setLayerTrigger(t => t + 1); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedLayer === 'all' 
                  ? 'bg-[#3b82f6] text-white' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              🌐 Tutti
            </button>
            {config.civic_enabled && (
              <button
                onClick={() => { setSelectedLayer('civic'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'civic' 
                    ? 'bg-[#f97316] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                📢 Segnalazioni ({filterData(civicReports, 'created_at').length})
              </button>
            )}
            {config.shopping_enabled && (
              <button
                onClick={() => { setSelectedLayer('shop'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'shop' 
                    ? 'bg-[#84cc16] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🏪 Negozio ({filterData(heatmapPoints, 'created_at').filter(p => p.type === 'shop').length})
              </button>
            )}
            {config.shopping_enabled && (
              <button
                onClick={() => { setSelectedLayer('market'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'market' 
                    ? 'bg-[#eab308] text-black' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🛒 Mercato ({filterData(heatmapPoints, 'created_at').filter(p => p.type === 'market').length})
              </button>
            )}
            {config.mobility_enabled && (
              <button
                onClick={() => { setSelectedLayer('mobility'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'mobility' 
                    ? 'bg-[#06b6d4] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🚌 Mobilità ({filterData(mobilityActions, 'completed_at').length})
              </button>
            )}
            {config.culture_enabled && (
              <button
                onClick={() => { setSelectedLayer('culture'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'culture' 
                    ? 'bg-[#a855f7] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🏛️ Cultura ({filterData(cultureActions, 'visit_date').length})
              </button>
            )}
            {config.shopping_enabled && (
              <button
                onClick={() => { setSelectedLayer('referral'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'referral' 
                    ? 'bg-[#EC4899] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🎁 Referral ({filterData(referralList, 'created_at').length})
              </button>
            )}
            
            {/* Separatore */}
            <div className="w-px h-6 bg-[#e8fbff]/20 mx-2"></div>
            
            {/* Filtri Temporali */}
            <span className="text-[#e8fbff]/50 text-xs">📅</span>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                timeFilter === 'all' 
                  ? 'bg-[#3b82f6] text-white' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              Tutto
            </button>
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                timeFilter === 'today' 
                  ? 'bg-[#3b82f6] text-white' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              Oggi
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                timeFilter === 'week' 
                  ? 'bg-[#3b82f6] text-white' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              7gg
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                timeFilter === 'month' 
                  ? 'bg-[#3b82f6] text-white' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              30gg
            </button>
            <button
              onClick={() => setTimeFilter('year')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                timeFilter === 'year' 
                  ? 'bg-[#3b82f6] text-white' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              1 anno
            </button>
          </div>
          <div className="h-[600px] rounded-lg overflow-hidden">
            <MapContainer
              center={getInitialCenter()}
              zoom={geoFilter === 'italia' ? DEFAULT_ZOOM : 14}
              style={{ height: '100%', width: '100%' }}
              className="rounded-lg"
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
              dragging={true}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenterUpdater points={heatmapPoints} civicReports={filterData(civicReports, 'created_at')} mobilityActions={mobilityActions} cultureActions={cultureActions} referralList={referralList} comuneId={currentComuneId} selectedLayer={selectedLayer} layerTrigger={layerTrigger} geoFilter={geoFilter} />
              <HeatmapLayer points={[
                ...filterData(heatmapPoints, 'created_at'), 
                ...filterData(civicReports, 'created_at'),
                // Aggiungi punti mobilità filtrati come HeatmapPoint
                ...filterData(mobilityActions, 'completed_at').map(m => ({
                  id: m.id,
                  lat: parseFloat(String(m.lat)),
                  lng: parseFloat(String(m.lng)),
                  name: m.name,
                  type: 'mobility' as const,
                  tcc_earned: m.tcc_reward,
                  tcc_spent: 0,
                  transactions: 1
                })),
                // Aggiungi punti cultura filtrati come HeatmapPoint
                ...filterData(cultureActions, 'visit_date').map(c => ({
                  id: c.id,
                  lat: parseFloat(String(c.lat)),
                  lng: parseFloat(String(c.lng)),
                  name: c.name,
                  type: 'culture' as const,
                  tcc_earned: c.tcc_reward,
                  tcc_spent: 0,
                  transactions: 1
                })),
                // Aggiungi punti referral filtrati come HeatmapPoint
                ...filterData(referralList, 'created_at').filter(r => r.lat && r.lng).map(r => ({
                  id: r.id,
                  lat: parseFloat(String(r.lat)),
                  lng: parseFloat(String(r.lng)),
                  name: `Referral ${r.referral_code}`,
                  type: 'referral' as const,
                  tcc_earned: r.tcc_earned_referrer || 0,
                  tcc_spent: 0,
                  transactions: 1
                }))
              ]} selectedLayer={selectedLayer} />
              {/* Marker negozi/hub/mercati - con offset spirale per punti sovrapposti */}
              {(selectedLayer === 'all' || selectedLayer === 'shop' || selectedLayer === 'market') && applySpiralOffset(filterData(heatmapPoints, 'created_at')).filter(p => selectedLayer === 'all' || p.type === selectedLayer).map((point) => {
                const intensity = Math.min((point.tcc_earned + point.tcc_spent) / 5000, 1.0);
                return (
                  <Marker
                    key={`shop-${point.id}`}
                    position={[point.lat + point.offsetLat, point.lng + point.offsetLng]}
                    icon={getMarkerIcon(point.type, intensity)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-bold">{point.name}</div>
                        <div>TCC: {point.tcc_earned > 0 ? `+${point.tcc_earned}` : `-${point.tcc_spent}`}</div>
                        <div className="text-xs text-gray-500">{point.created_at ? new Date(point.created_at).toLocaleString('it-IT') : '-'}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {/* Marker segnalazioni civiche - con offset spirale per punti sovrapposti */}
              {(selectedLayer === 'all' || selectedLayer === 'civic') && applySpiralOffset(filterData(civicReports, 'created_at')).map((report) => (
                <Marker
                  key={`civic-${report.id}`}
                  position={[report.lat + report.offsetLat, report.lng + report.offsetLng]}
                  icon={getMarkerIcon('civic', 0.8)}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold text-orange-600">📢 {report.name}</div>
                      <div>TCC Reward: {report.tcc_earned}</div>
                      <div className="text-xs text-gray-500">Segnalazione Civica</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {/* Marker Mobilità Sostenibile - azioni cittadini (percorsi completati) - con offset spirale */}
              {(selectedLayer === 'all' || selectedLayer === 'mobility') && config.mobility_enabled && applySpiralOffsetGeneric(filterData(mobilityActions, 'completed_at')).map((action) => (
                <Marker
                  key={`mobility-${action.id}`}
                  position={[action.lat + action.offsetLat, action.lng + action.offsetLng]}
                  icon={getMarkerIcon(action.type || 'bus')}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold text-cyan-600">
                        {action.type === 'bus' && '🚌 '}
                        {action.type === 'bike' && '🚲 '}
                        {action.type === 'walk' && '🚶 '}
                        {action.name}
                      </div>
                      <div className="text-xs text-gray-600 capitalize">Percorso {action.type}</div>
                      <div>TCC Rilasciati: <span className="text-green-600 font-semibold">+{action.tcc_reward}</span></div>
                      {action.co2_saved_g > 0 && (
                        <div className="text-xs text-emerald-600">🌿 CO₂ risparmiata: {(action.co2_saved_g / 1000).toFixed(2)} kg</div>
                      )}
                      {action.completed_at && (
                        <div className="text-xs text-gray-500">📅 {new Date(action.completed_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(action.completed_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              {/* Marker Cultura - visite effettuate dai cittadini - con offset spirale */}
              {(selectedLayer === 'all' || selectedLayer === 'culture') && config.culture_enabled && applySpiralOffsetGeneric(filterData(cultureActions, 'visit_date')).map((visit) => (
                <Marker
                  key={`culture-${visit.id}`}
                  position={[visit.lat + visit.offsetLat, visit.lng + visit.offsetLng]}
                  icon={getMarkerIcon(visit.type || 'museum')}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <div className="font-bold text-purple-600">
                        {visit.type === 'museum' && '🏛️ '}
                        {visit.type === 'castle' && '🏰 '}
                        {visit.type === 'monument' && '🗿 '}
                        {visit.type === 'archaeological' && '⛏️ '}
                        {visit.type === 'theatre' && '🎭 '}
                        {visit.name}
                      </div>
                      <div className="text-xs text-gray-600 capitalize">Visita {visit.type}</div>
                      <div>TCC Rilasciati: <span className="text-green-600 font-semibold">+{visit.tcc_reward}</span></div>
                      {visit.visit_date && (
                        <div className="text-xs text-gray-500">📅 {new Date(visit.visit_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(visit.visit_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Marker Referral "Presenta un Amico" - punti fuchsia - con offset spirale e filtro geo+tempo */}
              {(selectedLayer === 'all' || selectedLayer === 'referral') && applySpiralOffsetGeneric(filterData(referralList, 'created_at').filter(r => r.lat && r.lng).map(r => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) }))).map((ref) => (
                <Marker
                  key={`referral-${ref.id}`}
                  position={[ref.lat + ref.offsetLat, ref.lng + ref.offsetLng]}
                  icon={getMarkerIcon('referral', 0.8)}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <div className="font-bold text-pink-600">
                        🎁 Presenta un Amico
                      </div>
                      <div className="text-xs text-gray-600">Codice: {ref.referral_code}</div>
                      <div className="text-xs text-gray-600">Stato: <span className={`font-semibold ${
                        ref.status === 'first_purchase' ? 'text-pink-600' :
                        ref.status === 'registered' ? 'text-yellow-600' :
                        'text-gray-500'
                      }`}>
                        {ref.status === 'first_purchase' ? 'Primo acquisto completato' :
                         ref.status === 'registered' ? 'Amico registrato' :
                         ref.status === 'pending' ? 'In attesa' :
                         ref.status === 'expired' ? 'Scaduto' : ref.status}
                      </span></div>
                      <div>TCC Guadagnati: <span className="text-green-600 font-semibold">+{ref.tcc_earned_referrer}</span></div>
                      {ref.created_at && (
                        <div className="text-xs text-gray-500">📅 {new Date(ref.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-[#e8fbff]/70">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f97316]"></span> 📢 Segnalazioni</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#84cc16]"></span> 🏪 Negozi</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#eab308]"></span> 🛒 Mercati</span>
            {config.mobility_enabled && (
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span> 🚌 Percorsi Sostenibili</span>
            )}
            {config.culture_enabled && (
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#a855f7]"></span> 🏛️ Visite Culturali</span>
            )}
            {config.shopping_enabled && (
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#EC4899]"></span> 🎁 Presenta un Amico</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sezione Top 5 Negozi e Trend TCC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Negozi */}
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Store className="h-5 w-5 text-[#22c55e]" />
              Top 5 Negozi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* v1.3.3: Filtro top shops per comune_id */}
            {(() => {
              const filteredShops = geoFilter === 'comune' && currentComuneId
                ? topShops.filter(s => s.comune_id !== undefined ? parseInt(String(s.comune_id)) === currentComuneId : false)
                : topShops;
              return filteredShops.length > 0 ? (
              <div className="space-y-3">
                {filteredShops.map((shop, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-[#1a2332] text-[#e8fbff]/70'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-[#e8fbff] font-medium">{shop.name}</div>
                        <div className="text-xs text-[#e8fbff]/50">{shop.transactions} transazioni</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#22c55e] font-bold">+{shop.tcc_earned.toLocaleString('it-IT')}</div>
                      <div className="text-xs text-[#e8fbff]/50">TCC rilasciati</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <Store className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessun dato disponibile</p>
              </div>
            );
            })()}
          </CardContent>
        </Card>

        {/* Trend TCC - Ultimi 7 giorni */}
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#3b82f6]" />
              Trend TCC - {timeFilter === 'all' ? 'Tutto il periodo' : timeFilter === 'today' ? 'Oggi' : timeFilter === 'week' ? 'Ultimi 7 giorni' : timeFilter === 'month' ? 'Ultimi 30 giorni' : 'Ultimo anno'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <div className="space-y-4">
                {/* Grafico a barre semplice */}
                <div className="flex items-end justify-between h-40 gap-2">
                  {trendData.map((day, index) => {
                    const maxValue = Math.max(...trendData.map(d => Math.max(d.tcc_earned, d.tcc_spent)));
                    const maxActivities = Math.max(...trendData.map(d => Math.max(d.reports || 0, d.mobility || 0, d.culture || 0, d.shopping_shop || 0, d.shopping_market || 0, d.referral || 0)));
                    const earnedHeight = maxValue > 0 ? (day.tcc_earned / maxValue) * 100 : 0;
                    const spentHeight = maxValue > 0 ? (day.tcc_spent / maxValue) * 100 : 0;
                    const reportsHeight = maxActivities > 0 ? ((day.reports || 0) / maxActivities) * 100 : 0;
                    const mobilityHeight = maxActivities > 0 ? ((day.mobility || 0) / maxActivities) * 100 : 0;
                    const cultureHeight = maxActivities > 0 ? ((day.culture || 0) / maxActivities) * 100 : 0;
                    const shopHeight = maxActivities > 0 ? ((day.shopping_shop || 0) / maxActivities) * 100 : 0;
                    const marketHeight = maxActivities > 0 ? ((day.shopping_market || 0) / maxActivities) * 100 : 0;
                    const referralHeight = maxActivities > 0 ? ((day.referral || 0) / maxActivities) * 100 : 0;
                    const dayName = new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short' });
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="flex gap-0.5 items-end h-32">
                          <div 
                            className="w-2 bg-[#22c55e] rounded-t transition-all" 
                            style={{ height: `${earnedHeight}%`, minHeight: day.tcc_earned > 0 ? '4px' : '0' }}
                            title={`TCC Rilasciati: ${day.tcc_earned}`}
                          />
                          <div 
                            className="w-2 bg-[#3b82f6] rounded-t transition-all" 
                            style={{ height: `${spentHeight}%`, minHeight: day.tcc_spent > 0 ? '4px' : '0' }}
                            title={`TCC Spesi: ${day.tcc_spent}`}
                          />
                          {config.shopping_enabled && (
                            <div 
                              className="w-2 bg-[#84cc16] rounded-t transition-all" 
                              style={{ height: `${shopHeight}%`, minHeight: (day.shopping_shop || 0) > 0 ? '4px' : '0' }}
                              title={`Negozio: ${day.shopping_shop || 0}`}
                            />
                          )}
                          {config.shopping_enabled && (
                            <div 
                              className="w-2 bg-[#eab308] rounded-t transition-all" 
                              style={{ height: `${marketHeight}%`, minHeight: (day.shopping_market || 0) > 0 ? '4px' : '0' }}
                              title={`Mercato: ${day.shopping_market || 0}`}
                            />
                          )}
                          <div 
                            className="w-2 bg-[#f97316] rounded-t transition-all" 
                            style={{ height: `${reportsHeight}%`, minHeight: (day.reports || 0) > 0 ? '4px' : '0' }}
                            title={`Segnalazioni: ${day.reports || 0}`}
                          />
                          {config.mobility_enabled && (
                            <div 
                              className="w-2 bg-[#06b6d4] rounded-t transition-all" 
                              style={{ height: `${mobilityHeight}%`, minHeight: (day.mobility || 0) > 0 ? '4px' : '0' }}
                              title={`Mobilità: ${day.mobility || 0}`}
                            />
                          )}
                          {config.culture_enabled && (
                            <div 
                              className="w-2 bg-[#a855f7] rounded-t transition-all" 
                              style={{ height: `${cultureHeight}%`, minHeight: (day.culture || 0) > 0 ? '4px' : '0' }}
                              title={`Cultura: ${day.culture || 0}`}
                            />
                          )}
                          {/* Barra Referral fuchsia */}
                          <div 
                            className="w-2 bg-[#EC4899] rounded-t transition-all" 
                            style={{ height: `${referralHeight}%`, minHeight: (day.referral || 0) > 0 ? '4px' : '0' }}
                            title={`Referral: ${day.referral || 0}`}
                          />

                        </div>
                        <span className="text-xs text-[#e8fbff]/50 mt-2 capitalize">{dayName}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Legenda */}
                <div className="flex justify-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-[#22c55e]"></span>
                    <span className="text-[#e8fbff]/70">TCC+</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-[#3b82f6]"></span>
                    <span className="text-[#e8fbff]/70">TCC-</span>
                  </span>
                  {config.shopping_enabled && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-[#84cc16]"></span>
                      <span className="text-[#e8fbff]/70">Negozio</span>
                    </span>
                  )}
                  {config.shopping_enabled && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-[#eab308]"></span>
                      <span className="text-[#e8fbff]/70">Mercato</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-[#f97316]"></span>
                    <span className="text-[#e8fbff]/70">Civic</span>
                  </span>
                  {config.mobility_enabled && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-[#06b6d4]"></span>
                      <span className="text-[#e8fbff]/70">Mobilità</span>
                    </span>
                  )}
                  {config.culture_enabled && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-[#a855f7]"></span>
                      <span className="text-[#e8fbff]/70">Cultura</span>
                    </span>
                  )}
                  {config.shopping_enabled && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-[#EC4899]"></span>
                      <span className="text-[#e8fbff]/70">Referral</span>
                    </span>
                  )}
                </div>
                {/* Totali periodo */}
                <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 pt-4 border-t border-[#e8fbff]/10">
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#22c55e]">
                      {trendData.reduce((sum, d) => sum + d.tcc_earned, 0)}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50">TCC+</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#3b82f6]">
                      {trendData.reduce((sum, d) => sum + d.tcc_spent, 0)}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50">TCC-</div>
                  </div>
                  {config.shopping_enabled && (
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#84cc16]">
                        {trendData.reduce((sum, d) => sum + (d.shopping_shop || 0), 0)}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">Negozio</div>
                    </div>
                  )}
                  {config.shopping_enabled && (
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#eab308]">
                        {trendData.reduce((sum, d) => sum + (d.shopping_market || 0), 0)}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">Mercato</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#f97316]">
                      {trendData.reduce((sum, d) => sum + d.reports, 0)}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50">Civic</div>
                  </div>
                  {config.mobility_enabled && (
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#06b6d4]">
                        {trendData.reduce((sum, d) => sum + (d.mobility || 0), 0)}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">Mobilità</div>
                    </div>
                  )}
                  {config.culture_enabled && (
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#a855f7]">
                        {trendData.reduce((sum, d) => sum + (d.culture || 0), 0)}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">Cultura</div>
                    </div>
                  )}
                  {config.shopping_enabled && (
                    <div className="text-center">
                      <div className="text-sm font-bold text-[#EC4899]">
                        {filterData(referralList, 'created_at').length}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">Referral</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessun dato disponibile</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sezione Lista Segnalazioni Civiche */}
      <Card className="bg-[#1a2332] border-[#f97316]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#f97316]" />
              Segnalazioni Civiche
            </span>
            <Badge variant="outline" className="text-[#f97316] border-[#f97316]/50">
              {filterData(civicReports, 'created_at').length} totali
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filterData(civicReports, 'created_at').length > 0 ? (
            <div className="max-h-80 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-[#f97316]/30 scrollbar-track-transparent">
              {filterData(civicReports, 'created_at').map((report, index) => (
                <div 
                  key={`list-${report.id}`}
                  onClick={() => {
                    setSelectedReport(report);
                    setShowReportModal(true);
                  }}
                  className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg cursor-pointer hover:bg-[#0b1220]/80 hover:border-[#f97316]/50 border border-transparent transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#f97316]/20 flex items-center justify-center text-[#f97316]">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[#e8fbff] font-medium group-hover:text-[#f97316] transition-colors">
                        Segnalazione {report.name}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2 flex-wrap">
                        {report.created_at ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(report.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {' '}
                            {new Date(report.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                          </span>
                        )}
                        {report.tcc_earned > 0 && (
                          <span className="text-[#22c55e]">Risolta</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[#22c55e] font-bold">+{report.tcc_earned}</div>
                      <div className="text-xs text-[#e8fbff]/50">TCC</div>
                    </div>
                    <Eye className="h-4 w-4 text-[#e8fbff]/30 group-hover:text-[#f97316] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#e8fbff]/50 py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nessuna segnalazione nel periodo selezionato</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sezione Lista Mobilità Sostenibile */}
      {config.mobility_enabled && (
        <Card className="bg-[#1a2332] border-[#06b6d4]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bus className="h-5 w-5 text-[#06b6d4]" />
                Mobilità Sostenibile
              </span>
              <Badge variant="outline" className="text-[#06b6d4] border-[#06b6d4]/50">
                {filterData(mobilityActions, 'completed_at').length} totali
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterData(mobilityActions, 'completed_at').length > 0 ? (
              <div className="max-h-80 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-[#06b6d4]/30 scrollbar-track-transparent">
                {filterData(mobilityActions, 'completed_at').map((action) => (
                  <div 
                    key={`mobility-list-${action.id}`}
                    className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg hover:bg-[#0b1220]/80 hover:border-[#06b6d4]/50 border border-transparent transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#06b6d4]/20 flex items-center justify-center text-lg">
                        {action.type === 'bus' && '🚌'}
                        {action.type === 'bike' && '🚲'}
                        {action.type === 'walk' && '🚶'}
                        {action.type === 'tram' && '🚊'}
                        {action.type === 'train' && '🚆'}
                        {!['bus', 'bike', 'walk', 'tram', 'train'].includes(action.type) && '🚏'}
                      </span>
                      <div>
                        <div className="text-[#e8fbff] font-medium">
                          {action.name}
                        </div>
                        <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2 flex-wrap">
                          <span className="capitalize">
                            {action.type === 'bus' ? 'Autobus' :
                             action.type === 'train' ? 'Treno' :
                             action.type === 'tram' ? 'Tram' :
                             action.type === 'bike' ? 'Bicicletta' :
                             action.type === 'walk' ? 'A piedi' :
                             action.type === 'stop' ? 'Check-in fermata' :
                             action.type}
                          </span>
                          {action.completed_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(action.completed_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {' '}
                              {new Date(action.completed_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {action.co2_saved_g > 0 && (
                            <span className="text-emerald-400">🌿 {(action.co2_saved_g / 1000).toFixed(2)} kg CO₂</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#22c55e] font-bold">+{action.tcc_reward}</div>
                      <div className="text-xs text-[#e8fbff]/50">TCC</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <Bus className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessun percorso nel periodo selezionato</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sezione Lista Cultura & Turismo */}
      {config.culture_enabled && (
        <Card className="bg-[#1a2332] border-[#a855f7]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-[#a855f7]" />
                Cultura & Turismo
              </span>
              <Badge variant="outline" className="text-[#a855f7] border-[#a855f7]/50">
                {filterData(cultureActions, 'visit_date').length} totali
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterData(cultureActions, 'visit_date').length > 0 ? (
              <div className="max-h-80 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-[#a855f7]/30 scrollbar-track-transparent">
                {filterData(cultureActions, 'visit_date').map((visit) => (
                  <div 
                    key={`culture-list-${visit.id}`}
                    className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg hover:bg-[#0b1220]/80 hover:border-[#a855f7]/50 border border-transparent transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#a855f7]/20 flex items-center justify-center text-lg">
                        {visit.type === 'museum' && '🏛️'}
                        {visit.type === 'castle' && '🏰'}
                        {visit.type === 'monument' && '🗿'}
                        {visit.type === 'archaeological' && '⛏️'}
                        {visit.type === 'theatre' && '🎭'}
                        {!['museum', 'castle', 'monument', 'archaeological', 'theatre'].includes(visit.type) && '📍'}
                      </span>
                      <div>
                        <div className="text-[#e8fbff] font-medium">
                          {visit.name}
                        </div>
                        <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2 flex-wrap">
                          <span className="capitalize">
                            {visit.type === 'museum' ? 'Museo' :
                             visit.type === 'castle' ? 'Castello' :
                             visit.type === 'monument' ? 'Monumento' :
                             visit.type === 'archaeological' ? 'Sito Archeologico' :
                             visit.type === 'theatre' ? 'Teatro' :
                             visit.type === 'memorial' ? 'Memoriale' :
                             visit.type}
                          </span>
                          {visit.visit_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(visit.visit_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {' '}
                              {new Date(visit.visit_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#22c55e] font-bold">+{visit.tcc_reward}</div>
                      <div className="text-xs text-[#e8fbff]/50">TCC</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <Landmark className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessuna visita nel periodo selezionato</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sezione Lista Acquisti Negozio */}
      {config.shopping_enabled && (
        <Card className="bg-[#1a2332] border-[#84cc16]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Store className="h-5 w-5 text-[#84cc16]" />
                Acquisti Negozio
              </span>
              <Badge variant="outline" className="text-[#84cc16] border-[#84cc16]/50">
                {filterData(heatmapPoints, 'created_at').filter(p => p.type === 'shop').length} totali
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterData(heatmapPoints, 'created_at').filter(p => p.type === 'shop').length > 0 ? (
              <div className="max-h-80 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-[#84cc16]/30 scrollbar-track-transparent">
                {filterData(heatmapPoints, 'created_at').filter(p => p.type === 'shop').map((point) => (
                  <div 
                    key={`shop-list-${point.id}`}
                    className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg hover:bg-[#0b1220]/80 hover:border-[#84cc16]/50 border border-transparent transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#84cc16]/20 flex items-center justify-center text-lg">
                        🏪
                      </span>
                      <div>
                        <div className="text-[#e8fbff] font-medium">
                          {point.name}
                        </div>
                        <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2 flex-wrap">
                          <span>🏠 Negozio</span>
                          {point.created_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(point.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {' '}
                              {new Date(point.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {point.transactions > 1 && (
                            <span>{point.transactions} operazioni</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {point.tcc_earned > 0 && (
                        <div className="text-[#84cc16] font-bold">+{point.tcc_earned}</div>
                      )}
                      {point.tcc_spent > 0 && (
                        <div className="text-[#3b82f6] font-bold">-{point.tcc_spent}</div>
                      )}
                      <div className="text-xs text-[#e8fbff]/50">TCC</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <Store className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessun acquisto in negozio nel periodo selezionato</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sezione Lista Acquisti Mercato */}
      {config.shopping_enabled && (
        <Card className="bg-[#1a2332] border-[#eab308]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#eab308]" />
                Acquisti Mercato
              </span>
              <Badge variant="outline" className="text-[#eab308] border-[#eab308]/50">
                {filterData(heatmapPoints, 'created_at').filter(p => p.type === 'market').length} totali
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterData(heatmapPoints, 'created_at').filter(p => p.type === 'market').length > 0 ? (
              <div className="max-h-80 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-[#eab308]/30 scrollbar-track-transparent">
                {filterData(heatmapPoints, 'created_at').filter(p => p.type === 'market').map((point) => (
                  <div 
                    key={`market-list-${point.id}`}
                    className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg hover:bg-[#0b1220]/80 hover:border-[#eab308]/50 border border-transparent transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#eab308]/20 flex items-center justify-center text-lg">
                        🛒
                      </span>
                      <div>
                        <div className="text-[#e8fbff] font-medium">
                          {point.name}
                        </div>
                        <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2 flex-wrap">
                          <span>🛒 Mercato</span>
                          {point.created_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(point.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              {' '}
                              {new Date(point.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {point.transactions > 1 && (
                            <span>{point.transactions} operazioni</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {point.tcc_earned > 0 && (
                        <div className="text-[#eab308] font-bold">+{point.tcc_earned}</div>
                      )}
                      {point.tcc_spent > 0 && (
                        <div className="text-[#3b82f6] font-bold">-{point.tcc_spent}</div>
                      )}
                      <div className="text-xs text-[#e8fbff]/50">TCC</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessun acquisto in mercato nel periodo selezionato</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sezione Lista Presenta un Amico (Referral) */}
      {config.shopping_enabled && (
        <Card className="bg-[#1a2332] border-[#EC4899]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-[#EC4899]" />
                Presenta un Amico
              </span>
              <Badge variant="outline" className="text-[#EC4899] border-[#EC4899]/50">
                {filterData(referralList, 'created_at').length} totali
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterData(referralList, 'created_at').length === 0 ? (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <Gift className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessun referral nel periodo selezionato</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filterData(referralList, 'created_at').map((ref, idx) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        ref.status === 'first_purchase' ? 'bg-[#EC4899]/20 text-[#EC4899]' :
                        ref.status === 'registered' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-[#e8fbff] text-sm font-medium">
                          Codice: {ref.referral_code}
                        </p>
                        <p className="text-[#e8fbff]/50 text-xs">
                           {ref.status === 'pending' ? '⏳ In attesa' :
                            ref.status === 'registered' ? '✅ Registrato' :
                            ref.status === 'first_purchase' ? '🎉 Primo acquisto completato' :
                            ref.status === 'expired' ? '⌛ Scaduto' :
                            ref.status === 'completed' ? '✅ Completato' :
                            ref.status}
                           {ref.created_at && ` · ${new Date(ref.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                         </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#EC4899] font-bold text-sm">
                        +{ref.tcc_earned_referrer}
                      </span>
                      <p className="text-[#e8fbff]/50 text-xs">TCC</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sezione Sfide & Challenges */}
      <Card className="bg-[#1a2332] border-amber-500/30">
        <CardHeader>
          <CardTitle 
            className="text-[#e8fbff] flex items-center justify-between cursor-pointer"
            onClick={() => setChallengesExpanded(!challengesExpanded)}
          >
            <span className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Sfide Attive
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-400 border-amber-500/50">
                {challengesList.length} sfide
              </Badge>
              {challengesExpanded ? <ChevronUp className="h-4 w-4 text-[#e8fbff]/50" /> : <ChevronDown className="h-4 w-4 text-[#e8fbff]/50" />}
            </div>
          </CardTitle>
        </CardHeader>
        {challengesExpanded && (
          <CardContent>
            {challengesList.length === 0 ? (
              <div className="text-center text-[#e8fbff]/50 py-8">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nessuna sfida attiva per questo comune</p>
              </div>
            ) : (
              <div className="space-y-3">
                {challengesList.map((challenge) => {
                  const categoryColors: Record<string, string> = {
                    civic: '#f97316',
                    mobility: '#3b82f6',
                    culture: '#a855f7',
                    shopping: '#84cc16',
                  };
                  const categoryIcons: Record<string, string> = {
                    civic: '🏛️',
                    mobility: '🚌',
                    culture: '🏛️',
                    shopping: '🛒',
                  };
                  const color = categoryColors[challenge.category] || '#6b7280';
                  const icon = categoryIcons[challenge.category] || '🏆';
                  const progressPercent = challenge.user_progress 
                    ? Math.min((challenge.user_progress / challenge.target_value) * 100, 100) 
                    : 0;
                  
                  return (
                    <div key={challenge.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#1e3a5f]/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <div>
                            <p className="text-[#e8fbff] font-medium text-sm">{challenge.title}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{challenge.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm" style={{ color }}>+{challenge.tcc_reward}</span>
                          <p className="text-[#e8fbff]/50 text-xs">TCC</p>
                        </div>
                      </div>
                      {/* Barra progresso */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-[#e8fbff]/50 mb-1">
                          <span>Obiettivo: {challenge.target_value} {challenge.challenge_type}</span>
                          <span>{challenge.participants_count} partecipanti · {challenge.completions_count} completate</span>
                        </div>
                        <div className="w-full h-2 bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                      {/* Date */}
                      {(challenge.start_date || challenge.end_date) && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#e8fbff]/40">
                          <Clock className="h-3 w-3" />
                          {challenge.start_date && <span>Dal {new Date(challenge.start_date).toLocaleDateString('it-IT')}</span>}
                          {challenge.end_date && <span>al {new Date(challenge.end_date).toLocaleDateString('it-IT')}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal Dettagli Segnalazione */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="bg-[#1a2332] border-[#f97316]/30 text-[#e8fbff] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#f97316]">
              <AlertCircle className="h-5 w-5" />
              Dettagli Segnalazione
            </DialogTitle>
            <DialogDescription className="text-[#e8fbff]/70">
              Informazioni complete sulla segnalazione civica
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 pt-4">
              {/* Tipo segnalazione */}
              <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                <span className="text-[#e8fbff]/70">Tipo</span>
                <Badge className="bg-[#f97316]/20 text-[#f97316] border-[#f97316]/50">
                  {selectedReport.name}
                </Badge>
              </div>
              
              {/* Coordinate */}
              <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                <span className="text-[#e8fbff]/70 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Posizione
                </span>
                <span className="text-[#e8fbff] font-mono text-sm">
                  {selectedReport.lat.toFixed(6)}, {selectedReport.lng.toFixed(6)}
                </span>
              </div>
              
              {/* TCC Reward */}
              <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                <span className="text-[#e8fbff]/70 flex items-center gap-2">
                  <Coins className="h-4 w-4" /> TCC Rilasciati
                </span>
                <span className="text-[#22c55e] font-bold text-lg">
                  +{selectedReport.tcc_earned}
                </span>
              </div>
              
              {/* ID Segnalazione */}
              <div className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                <span className="text-[#e8fbff]/70">ID</span>
                <span className="text-[#e8fbff]/50 font-mono text-sm">
                  #{selectedReport.id}
                </span>
              </div>
              
              {/* Azioni */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 border-[#f97316]/50 text-[#f97316] hover:bg-[#f97316]/10"
                  onClick={() => {
                    // Centra la mappa sulla segnalazione
                    setShowReportModal(false);
                    setSelectedLayer('civic');
                    setLayerTrigger(prev => prev + 1);
                    toast.success(`Mappa centrata su segnalazione #${selectedReport.id}`);
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Mostra su Mappa
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
