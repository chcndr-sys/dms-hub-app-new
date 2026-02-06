/**
 * GamingRewardsPanel - Pannello Gaming & Rewards per Dashboard PA
 * Versione: 1.1.0
 * Data: 03 Febbraio 2026
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

// URL API REST Backend Hetzner
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';

// Coordinate centri comuni
const COMUNI_COORDS: Record<number, { lat: number; lng: number; nome: string }> = {
  1: { lat: 42.7635, lng: 11.1126, nome: 'Grosseto' },
  6: { lat: 44.4949, lng: 11.3426, nome: 'Bologna' },
  7: { lat: 44.4898, lng: 11.0123, nome: 'Vignola' },
  8: { lat: 44.6471, lng: 10.9252, nome: 'Modena' },
  9: { lat: 44.7842, lng: 10.8847, nome: 'Carpi' },
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
  type: 'shop' | 'hub' | 'market' | 'civic';
  tcc_earned: number;
  tcc_spent: number;
  transactions: number;
  created_at?: string;
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
}

// Interfaccia per Top 5 Negozi
interface TopShop {
  name: string;
  tcc_earned: number;
  tcc_spent: number;
  transactions: number;
}

// Interfaccia per Trend TCC giornaliero
interface TrendDataPoint {
  date: string;
  tcc_earned: number;
  tcc_spent: number;
  reports: number;
  mobility?: number;  // Azioni mobilità sostenibile
  culture?: number;   // Visite culturali
  shopping?: number;  // Transazioni acquisti
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
  comuneId, 
  selectedLayer,
  layerTrigger 
}: { 
  points: HeatmapPoint[]; 
  civicReports: HeatmapPoint[]; 
  mobilityActions: MobilityAction[];
  cultureActions: CultureAction[];
  comuneId: number | null;
  selectedLayer: string;
  layerTrigger: number;
}) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // Determina quali punti mostrare in base al layer selezionato
    let targetPoints: Array<{lat: number; lng: number}> = [];
    
    if (selectedLayer === 'civic') {
      targetPoints = civicReports;
    } else if (selectedLayer === 'shopping') {
      targetPoints = points.filter(p => p.type === 'shop' || p.type === 'market');
    } else if (selectedLayer === 'mobility') {
      // Converti mobilityActions in punti con lat/lng
      targetPoints = mobilityActions.map(m => ({ lat: parseFloat(String(m.lat)), lng: parseFloat(String(m.lng)) }));
    } else if (selectedLayer === 'culture') {
      // Converti cultureActions in punti con lat/lng
      targetPoints = cultureActions.map(c => ({ lat: parseFloat(String(c.lat)), lng: parseFloat(String(c.lng)) }));
    } else if (selectedLayer === 'all') {
      targetPoints = [...points, ...civicReports];
    } else {
      targetPoints = [...points, ...civicReports];
    }
    
    if (targetPoints.length > 0) {
      // Calcola bounding box per mostrare tutti i punti
      const lats = targetPoints.map(p => p.lat);
      const lngs = targetPoints.map(p => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Se c'è un solo punto o punti molto vicini, usa flyTo
      if (maxLat - minLat < 0.01 && maxLng - minLng < 0.01) {
        const avgLat = (minLat + maxLat) / 2;
        const avgLng = (minLng + maxLng) / 2;
        map.flyTo([avgLat, avgLng], 15, { duration: 1.5 });
      } else {
        // Usa fitBounds per mostrare tutti i punti
        map.flyToBounds(
          [[minLat, minLng], [maxLat, maxLng]],
          { padding: [50, 50], duration: 1.5, maxZoom: 16 }
        );
      }
      return;
    }
    
    if (comuneId && COMUNI_COORDS[comuneId]) {
      const coords = COMUNI_COORDS[comuneId];
      map.flyTo([coords.lat, coords.lng], 14, { duration: 1.5 });
      return;
    }
    
    map.flyTo([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM, { duration: 1 });
  }, [map, points, civicReports, comuneId, selectedLayer, layerTrigger]);
  
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
    } else if (selectedLayer === 'shopping') {
      filteredPoints = points.filter(p => p.type === 'shop' || p.type === 'market' || p.type === 'hub');
    } else if (selectedLayer === 'mobility') {
      filteredPoints = points.filter(p => p.type === 'mobility');
    } else if (selectedLayer === 'culture') {
      filteredPoints = points.filter(p => p.type === 'culture');
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
  const [geoFilter, setGeoFilter] = useState<'italia' | 'comune'>('italia'); // Filtro geografico: tutta Italia o solo comune
  const [topShops, setTopShops] = useState<TopShop[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [selectedReport, setSelectedReport] = useState<HeatmapPoint | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(true);
  
  const { comuneId, comuneNome, isImpersonating } = useImpersonation();
  // Se admin non sta impersonando, non filtrare per comune (vede tutto)
  // Se sta impersonando, usa il comune selezionato
  const currentComuneId = isImpersonating && comuneId ? parseInt(comuneId) : null;
  // Per i dati: non passare comune_id se admin non impersona (vede tutto)
  const comuneQueryParam = currentComuneId ? `comune_id=${currentComuneId}` : '';
  // Per la configurazione: usare sempre un comune_id valido (default Grosseto=1)
  const configComuneId = currentComuneId || 1;

  // Funzione per filtrare per area geografica (Italia vs Comune)
  const filterByGeo = useCallback((items: any[]) => {
    if (geoFilter === 'italia' || !currentComuneId) return items;
    
    // Filtra per comune usando le coordinate del comune selezionato
    const comuneCoords = COMUNI_COORDS[currentComuneId];
    if (!comuneCoords) return items;
    
    // Raggio di 30km dal centro del comune
    const radiusKm = 30;
    return items.filter(item => {
      const lat = parseFloat(item.lat) || 0;
      const lng = parseFloat(item.lng) || 0;
      if (!lat || !lng) return false;
      
      // Calcolo distanza approssimativa in km
      const dLat = (lat - comuneCoords.lat) * 111;
      const dLng = (lng - comuneCoords.lng) * 111 * Math.cos(comuneCoords.lat * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      return distance <= radiusKm;
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
            comune_id: currentComuneId,
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
  const loadCivicReports = useCallback(async () => {
    if (!config.civic_enabled) {
      setCivicReports([]);
      return;
    }
    try {
      const url = currentComuneId 
        ? `${API_BASE_URL}/api/civic-reports/stats?comune_id=${currentComuneId}`
        : `${API_BASE_URL}/api/civic-reports/stats`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.recent) {
          const points: HeatmapPoint[] = data.data.recent
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
            }));
          setCivicReports(points);
        }
      }
    } catch (error) {
      console.error('Errore caricamento segnalazioni:', error);
    }
  }, [configComuneId, config.civic_enabled]);

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
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/trend${comuneQueryParam ? '?' + comuneQueryParam : ''}`);
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
          }));
          setTrendData(mappedTrend);
        }
      }
    } catch (error) {
      console.error('Errore caricamento trend data:', error);
    }
  }, [comuneQueryParam]);

  // Funzione per caricare le Azioni Mobilità (percorsi completati dai cittadini)
  const loadMobilityActions = useCallback(async () => {
    if (!config.mobility_enabled) {
      setMobilityActions([]);
      return;
    }
    try {
      // Usa le coordinate del comune per centrare la ricerca
      const coords = COMUNI_COORDS[configComuneId];
      const lat = coords?.lat || 44.49;
      const lng = coords?.lng || 11.34;
      // Mappa timeFilter al parametro period dell'API
      const periodMap: Record<string, string> = {
        'all': 'all',
        'today': 'today',
        'week': '7days',
        'month': '30days',
        'year': '1year'
      };
      const period = periodMap[timeFilter] || 'all';
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/mobility/heatmap?lat=${lat}&lng=${lng}&radius=50&period=${period}`);
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
  }, [configComuneId, config.mobility_enabled, timeFilter]);

  // Funzione per caricare le Azioni Cultura (visite effettuate dai cittadini)
  const loadCultureActions = useCallback(async () => {
    if (!config.culture_enabled) {
      setCultureActions([]);
      return;
    }
    try {
      // Usa le coordinate del comune per centrare la ricerca
      const coords = COMUNI_COORDS[configComuneId];
      const lat = coords?.lat || 44.49;
      const lng = coords?.lng || 11.34;
      // Mappa timeFilter al parametro period dell'API
      const periodMap: Record<string, string> = {
        'all': 'all',
        'today': 'today',
        'week': '7days',
        'month': '30days',
        'year': '1year'
      };
      const period = periodMap[timeFilter] || 'all';
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/culture/heatmap?lat=${lat}&lng=${lng}&radius=50&period=${period}`);
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
  }, [configComuneId, config.culture_enabled, timeFilter]);

  // Carica la configurazione SOLO all'avvio o quando cambia il comune
  // NON ricaricare quando cambiano i toggle (altrimenti sovrascrive le modifiche utente)
  useEffect(() => {
    loadConfig();
  }, [configComuneId]); // Solo quando cambia il comune, non loadConfig stesso

  // Carica i dati (stats, heatmap, etc.) all'avvio e quando cambiano le dipendenze
  // ESCLUSO loadConfig per evitare di sovrascrivere i toggle modificati dall'utente
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadStats(), 
        loadHeatmapPoints(), 
        loadCivicReports(), 
        loadTopShops(), 
        loadTrendData(),
        loadMobilityActions(),
        loadCultureActions()
      ]);
      setLoading(false);
    };
    loadAllData();
  }, [loadStats, loadHeatmapPoints, loadCivicReports, loadTopShops, loadTrendData, loadMobilityActions, loadCultureActions]);

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
  const getInitialCenter = (): [number, number] => {
    if (configComuneId && COMUNI_COORDS[configComuneId]) {
      return [COMUNI_COORDS[configComuneId].lat, COMUNI_COORDS[configComuneId].lng];
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-[#e8fbff]/70 text-sm mb-1">
              <Coins className="h-4 w-4 text-yellow-500" />
              TCC Rilasciati
            </div>
            <div className="text-2xl font-bold text-[#22c55e]">
              {stats?.total_tcc_issued?.toLocaleString() || 0}
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
              {stats?.total_tcc_spent?.toLocaleString() || 0}
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
              {stats?.active_users?.toLocaleString() || 0}
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
              {(stats?.co2_saved_kg || 0).toFixed(1)} kg
            </div>
            <div className="text-xs text-slate-400">
              ({((stats?.co2_saved_kg || 0) / 1000).toFixed(2)}t)
            </div>
          </CardContent>
        </Card>
      </div>

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
                onClick={() => { setSelectedLayer('shopping'); setLayerTrigger(t => t + 1); }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'shopping' 
                    ? 'bg-[#22c55e] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🛒 Acquisti ({heatmapPoints.filter(p => p.type === 'shop').length})
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
                🚌 Mobilità ({mobilityActions.length})
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
                🏛️ Cultura ({cultureActions.length})
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
              zoom={14}
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
              <MapCenterUpdater points={heatmapPoints} civicReports={filterData(civicReports, 'created_at')} mobilityActions={mobilityActions} cultureActions={cultureActions} comuneId={currentComuneId} selectedLayer={selectedLayer} layerTrigger={layerTrigger} />
              <HeatmapLayer points={[
                ...heatmapPoints, 
                ...filterData(civicReports, 'created_at'),
                // Aggiungi punti mobilità come HeatmapPoint
                ...mobilityActions.map(m => ({
                  id: m.id,
                  lat: parseFloat(String(m.lat)),
                  lng: parseFloat(String(m.lng)),
                  name: m.name,
                  type: 'mobility' as const,
                  tcc_earned: m.tcc_reward,
                  tcc_spent: 0,
                  transactions: 1
                })),
                // Aggiungi punti cultura come HeatmapPoint
                ...cultureActions.map(c => ({
                  id: c.id,
                  lat: parseFloat(String(c.lat)),
                  lng: parseFloat(String(c.lng)),
                  name: c.name,
                  type: 'culture' as const,
                  tcc_earned: c.tcc_reward,
                  tcc_spent: 0,
                  transactions: 1
                }))
              ]} selectedLayer={selectedLayer} />
              {/* Marker negozi/hub/mercati - con offset spirale per punti sovrapposti */}
              {(selectedLayer === 'all' || selectedLayer === 'shopping') && applySpiralOffset(heatmapPoints).map((point) => {
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
                        <div className="text-xs text-gray-500">{new Date(point.created_at).toLocaleString('it-IT')}</div>
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
              {(selectedLayer === 'all' || selectedLayer === 'mobility') && config.mobility_enabled && applySpiralOffsetGeneric(mobilityActions).map((action) => (
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
                        <div className="text-xs text-gray-500">📅 {new Date(action.completed_at).toLocaleDateString('it-IT')}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              {/* Marker Cultura - visite effettuate dai cittadini - con offset spirale */}
              {(selectedLayer === 'all' || selectedLayer === 'culture') && config.culture_enabled && applySpiralOffsetGeneric(cultureActions).map((visit) => (
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
                        <div className="text-xs text-gray-500">📅 {new Date(visit.visit_date).toLocaleDateString('it-IT')}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-[#e8fbff]/70">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f97316]"></span> 📢 Segnalazioni</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#22c55e]"></span> 🏪 Negozi</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#eab308]"></span> 🛒 Mercati</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span> 🏢 Hub</span>
            {config.mobility_enabled && (
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span> 🚌 Percorsi Sostenibili</span>
            )}
            {config.culture_enabled && (
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#a855f7]"></span> 🏛️ Visite Culturali</span>
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
            {topShops.length > 0 ? (
              <div className="space-y-3">
                {topShops.map((shop, index) => (
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
            )}
          </CardContent>
        </Card>

        {/* Trend TCC - Ultimi 7 giorni */}
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#3b82f6]" />
              Trend TCC - Ultimi 7 giorni
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <div className="space-y-4">
                {/* Grafico a barre semplice */}
                <div className="flex items-end justify-between h-40 gap-2">
                  {trendData.map((day, index) => {
                    const maxValue = Math.max(...trendData.map(d => Math.max(d.tcc_earned, d.tcc_spent)));
                    const maxActivities = Math.max(...trendData.map(d => Math.max(d.reports || 0, d.mobility || 0, d.culture || 0, d.shopping || 0)));
                    const earnedHeight = maxValue > 0 ? (day.tcc_earned / maxValue) * 100 : 0;
                    const spentHeight = maxValue > 0 ? (day.tcc_spent / maxValue) * 100 : 0;
                    const reportsHeight = maxActivities > 0 ? ((day.reports || 0) / maxActivities) * 100 : 0;
                    const mobilityHeight = maxActivities > 0 ? ((day.mobility || 0) / maxActivities) * 100 : 0;
                    const cultureHeight = maxActivities > 0 ? ((day.culture || 0) / maxActivities) * 100 : 0;
                    const shoppingHeight = maxActivities > 0 ? ((day.shopping || 0) / maxActivities) * 100 : 0;
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
                          {config.shopping_enabled && (
                            <div 
                              className="w-2 bg-[#eab308] rounded-t transition-all" 
                              style={{ height: `${shoppingHeight}%`, minHeight: (day.shopping || 0) > 0 ? '4px' : '0' }}
                              title={`Acquisti: ${day.shopping || 0}`}
                            />
                          )}
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
                      <span className="w-2 h-2 rounded bg-[#eab308]"></span>
                      <span className="text-[#e8fbff]/70">Acquisti</span>
                    </span>
                  )}
                </div>
                {/* Totali periodo */}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 pt-4 border-t border-[#e8fbff]/10">
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
                      <div className="text-sm font-bold text-[#eab308]">
                        {trendData.reduce((sum, d) => sum + (d.shopping || 0), 0)}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50">Acquisti</div>
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
                        {report.name}
                      </div>
                      <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
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
                        <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2">
                          <span className="capitalize">{action.type}</span>
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
                        <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2">
                          <span className="capitalize">{visit.type}</span>
                          {visit.visit_date && (
                            <span>📅 {new Date(visit.visit_date).toLocaleDateString('it-IT')}</span>
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

      {/* Sezione Lista Acquisti */}
      {config.shopping_enabled && (
        <Card className="bg-[#1a2332] border-[#22c55e]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#22c55e]" />
                Acquisti & Cashback
              </span>
              <Badge variant="outline" className="text-[#22c55e] border-[#22c55e]/50">
                {filterData(heatmapPoints, 'created_at').length} totali
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filterData(heatmapPoints, 'created_at').length > 0 ? (
              <div className="max-h-80 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-[#22c55e]/30 scrollbar-track-transparent">
                {filterData(heatmapPoints, 'created_at').map((point) => (
                  <div 
                    key={`shopping-list-${point.id}`}
                    className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg hover:bg-[#0b1220]/80 hover:border-[#22c55e]/50 border border-transparent transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-lg">
                        {point.type === 'shop' && '🏪'}
                        {point.type === 'hub' && '🏢'}
                        {point.type === 'market' && '🛒'}
                        {!['shop', 'hub', 'market'].includes(point.type) && '📍'}
                      </span>
                      <div>
                        <div className="text-[#e8fbff] font-medium">
                          {point.name}
                        </div>
                        <div className="text-xs text-[#e8fbff]/50 flex items-center gap-2">
                          <span className="capitalize">{point.type}</span>
                          <span>{point.transactions} transazioni</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {point.tcc_earned > 0 && (
                        <div className="text-[#22c55e] font-bold">+{point.tcc_earned}</div>
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
                <p>Nessun acquisto nel periodo selezionato</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
