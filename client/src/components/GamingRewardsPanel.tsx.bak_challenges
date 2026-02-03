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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Gamepad2, Settings, Save, RefreshCw, Loader2, 
  Radio, Bus, Landmark, ShoppingCart, Gift, Trophy,
  TrendingUp, Users, Leaf, Coins, MapPin, ChevronDown, ChevronUp
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
}

interface GamingStats {
  total_tcc_issued: number;
  total_tcc_spent: number;
  active_users: number;
  co2_saved_kg: number;
  top_shops: Array<{ name: string; tcc: number }>;
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
function MapCenterUpdater({ points, civicReports, comuneId }: { points: HeatmapPoint[]; civicReports: HeatmapPoint[]; comuneId: number | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // Combina tutti i punti (heatmap + segnalazioni civiche)
    const allPoints = [...points, ...civicReports];
    
    if (allPoints.length > 0) {
      const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
      const avgLng = allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length;
      map.flyTo([avgLat, avgLng], 14, { duration: 1.5 });
      return;
    }
    
    if (comuneId && COMUNI_COORDS[comuneId]) {
      const coords = COMUNI_COORDS[comuneId];
      map.flyTo([coords.lat, coords.lng], 14, { duration: 1.5 });
      return;
    }
    
    map.flyTo([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM, { duration: 1 });
  }, [map, points, civicReports, comuneId]);
  
  return null;
}

// Componente Heatmap Layer
function HeatmapLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    
    const heatData: [number, number, number][] = points.map(p => {
      // Per le segnalazioni civiche (type='civic') usa un'intensità fissa alta
      // Per gli altri punti usa tcc_earned + tcc_spent
      let intensity: number;
      if (p.type === 'civic') {
        intensity = 0.8; // Intensità alta per segnalazioni
      } else {
        intensity = Math.min((p.tcc_earned + p.tcc_spent) / 5000, 1.0);
        if (intensity === 0) intensity = 0.3; // Minimo visibile per mercati
      }
      return [p.lat, p.lng, intensity];
    });
    
    if (heatData.length === 0) return;
    
    const heatLayer = (L as any).heatLayer(heatData, {
      radius: 40,
      blur: 25,
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
  }, [map, points]);
  
  return null;
}

// Icone marker per tipo
const getMarkerIcon = (type: string, intensity: number) => {
  const emoji: Record<string, string> = {
    'shop': '🏪',
    'hub': '🏢',
    'market': '🛒',
    'civic': '📢',
  };
  
  const iconEmoji = emoji[type] || '📍';
  
  // Colore specifico per tipo
  let bgColor = '#22c55e'; // Default verde
  if (type === 'civic') {
    bgColor = '#f97316'; // Arancione per segnalazioni
  } else if (intensity > 0.7) {
    bgColor = '#8b5cf6'; // Viola per alta intensità
  } else if (intensity > 0.4) {
    bgColor = '#eab308'; // Giallo per media intensità
  }
  
  // Dimensione marker più grande per civic
  const size = type === 'civic' ? 28 : 20;
  const fontSize = type === 'civic' ? 16 : 12;
  
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
  const [selectedLayer, setSelectedLayer] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(true);
  
  const { selectedComune, comuneId, comuneNome, isImpersonating } = useImpersonation();
  const currentComuneId = comuneId ? parseInt(comuneId) : 1;

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

  // Funzione per caricare la configurazione via REST API
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/config?comune_id=${currentComuneId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const cfg = result.data;
          setConfig({
            comune_id: currentComuneId,
            civic_enabled: cfg.civic_enabled ?? true,
            civic_tcc_default: cfg.civic_tcc_default ?? 10,
            civic_tcc_urgent: cfg.civic_tcc_urgent ?? 5,
            civic_tcc_photo_bonus: cfg.civic_tcc_photo_bonus ?? 5,
            mobility_enabled: cfg.mobility_enabled ?? false,
            mobility_tcc_bus: cfg.mobility_tcc_bus ?? 10,
            mobility_tcc_bike_km: cfg.mobility_tcc_bike_km ?? 3,
            mobility_tcc_walk_km: cfg.mobility_tcc_walk_km ?? 5,
            culture_enabled: cfg.culture_enabled ?? false,
            culture_tcc_museum: cfg.culture_tcc_museum ?? 100,
            culture_tcc_monument: cfg.culture_tcc_monument ?? 50,
            culture_tcc_route: cfg.culture_tcc_route ?? 300,
            shopping_enabled: cfg.shopping_enabled ?? false,
            shopping_cashback_percent: parseFloat(cfg.shopping_cashback_percent) || 1,
            shopping_km0_bonus: cfg.shopping_km0_bonus ?? 20,
            shopping_market_bonus: cfg.shopping_market_bonus ?? 10,
          });
        }
      }
    } catch (error) {
      console.error('Errore caricamento config:', error);
    }
  }, [currentComuneId]);

  // Funzione per caricare le statistiche via REST API
  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/stats?comune_id=${currentComuneId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.stats) {
          const s = result.data.stats;
          setStats({
            total_tcc_issued: s.total_tcc_earned || 0,
            total_tcc_spent: s.total_tcc_spent || 0,
            active_users: s.active_users || 0,
            co2_saved_kg: s.co2_saved || 0,
            top_shops: s.top_shops || []
          });
        }
      }
    } catch (error) {
      console.error('Errore caricamento stats:', error);
    }
  }, [currentComuneId]);

  // Carica Top 5 negozi
  const loadTopShops = useCallback(async () => {
    try {
      const response = await fetch(`https://api.mio-hub.me/api/gaming-rewards/top-shops?comune_id=${currentComuneId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setTopShops(result.data);
      }
    } catch (error) {
      console.error('Errore caricamento top shops:', error);
      // Dati mock se API non disponibile
      setTopShops([
        { name: 'Mercato Centrale', tcc_total: 450, transactions: 89 },
        { name: 'Bottega Bio', tcc_total: 320, transactions: 67 },
        { name: 'Panificio Rossi', tcc_total: 280, transactions: 54 },
        { name: 'Fruttivendolo Verde', tcc_total: 210, transactions: 43 },
        { name: 'Macelleria Bianchi', tcc_total: 180, transactions: 38 }
      ]);
    }
  }, [currentComuneId]);

  // Carica dati trend
  const loadTrendData = useCallback(async () => {
    try {
      const response = await fetch(`https://api.mio-hub.me/api/gaming-rewards/trend?comune_id=${currentComuneId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setTrendData(result.data);
      }
    } catch (error) {
      console.error('Errore caricamento trend:', error);
      // Dati mock se API non disponibile
      const mockTrend = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        mockTrend.push({
          date: date.toISOString().split('T')[0],
          tcc_earned: Math.floor(Math.random() * 50) + 10,
          tcc_spent: Math.floor(Math.random() * 30) + 5,
          reports: Math.floor(Math.random() * 5) + 1
        });
      }
      setTrendData(mockTrend);
    }
  }, [currentComuneId]);

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
  }, [currentComuneId, config.civic_enabled]);

  // Funzione per caricare i punti heatmap via REST API
  const loadHeatmapPoints = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/heatmap?comune_id=${currentComuneId}`);
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
            transactions: p.transaction_count || 0,
          }));
          setHeatmapPoints(points);
        }
      }
    } catch (error) {
      console.error('Errore caricamento heatmap:', error);
    }
  }, [currentComuneId]);

  // Carica tutti i dati all'avvio e quando cambia il comune
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadStats(), loadHeatmapPoints(), loadCivicReports()]);
      setLoading(false);
    };
    loadAllData();
  }, [loadConfig, loadStats, loadHeatmapPoints, loadCivicReports]);

  // Salva configurazione via REST API
  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/gaming-rewards/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comune_id: currentComuneId,
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
    await Promise.all([loadConfig(), loadStats(), loadHeatmapPoints(), loadCivicReports()]);
    setLoading(false);
    toast.success('Dati aggiornati');
  };

  // Determina centro iniziale mappa
  const getInitialCenter = (): [number, number] => {
    if (currentComuneId && COMUNI_COORDS[currentComuneId]) {
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

              {/* Acquisti Locali */}
              <CategoryCard
                title="Acquisti Locali"
                icon={ShoppingCart}
                color="blue-500"
                enabled={config.shopping_enabled}
                onToggle={(v) => setConfig({ ...config, shopping_enabled: v })}
              >
                <div className="space-y-3">
                  <ParamInput
                    label="Cashback"
                    value={config.shopping_cashback_percent}
                    onChange={(v) => setConfig({ ...config, shopping_cashback_percent: v })}
                    suffix="%"
                    max={100}
                  />
                  <ParamInput
                    label="Bonus Km0"
                    value={config.shopping_km0_bonus}
                    onChange={(v) => setConfig({ ...config, shopping_km0_bonus: v })}
                    suffix="%"
                    max={100}
                  />
                  <ParamInput
                    label="Bonus Mercato"
                    value={config.shopping_market_bonus}
                    onChange={(v) => setConfig({ ...config, shopping_market_bonus: v })}
                    suffix="%"
                    max={100}
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
              TCC Emessi
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
              TCC Spesi
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
              {(stats?.co2_saved_kg || 0).toFixed(1)}t
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Negozi e Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Negozi */}
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top 5 Negozi per TCC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topShops.slice(0, 5).map((shop, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-[#0b1220]/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-gray-400 text-black' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-[#1a2332] text-[#e8fbff]/70'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-[#e8fbff] text-sm">{shop.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[#22c55e] font-bold">{shop.tcc_total} TCC</div>
                    <div className="text-[#e8fbff]/50 text-xs">{shop.transactions} transazioni</div>
                  </div>
                </div>
              ))}
              {topShops.length === 0 && (
                <div className="text-center text-[#e8fbff]/50 py-4">
                  Nessun dato disponibile
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Grafico Trend */}
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Trend Ultimi 7 Giorni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trendData.map((day, index) => {
                const maxValue = Math.max(...trendData.map(d => d.tcc_earned + d.tcc_spent));
                const earnedWidth = maxValue > 0 ? (day.tcc_earned / maxValue) * 100 : 0;
                const spentWidth = maxValue > 0 ? (day.tcc_spent / maxValue) * 100 : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs text-[#e8fbff]/70">
                      <span>{new Date(day.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}</span>
                      <span>{day.tcc_earned + day.tcc_spent} TCC</span>
                    </div>
                    <div className="flex gap-1 h-4">
                      <div 
                        className="bg-[#22c55e] rounded-l"
                        style={{ width: `${earnedWidth}%` }}
                        title={`Guadagnati: ${day.tcc_earned}`}
                      ></div>
                      <div 
                        className="bg-[#3b82f6] rounded-r"
                        style={{ width: `${spentWidth}%` }}
                        title={`Spesi: ${day.tcc_spent}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {trendData.length === 0 && (
                <div className="text-center text-[#e8fbff]/50 py-4">
                  Nessun dato disponibile
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#22c55e]"></span>
                <span className="text-[#e8fbff]/70">TCC Guadagnati</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#3b82f6]"></span>
                <span className="text-[#e8fbff]/70">TCC Spesi</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Challenges Attive */}
      <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-orange-500" />
              Challenge Attive
            </CardTitle>
            <button
              onClick={() => setShowChallengeForm(!showChallengeForm)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-[#8b5cf6] text-white rounded-lg hover:bg-[#7c3aed] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuova
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Form nuova challenge */}
          {showChallengeForm && (
            <div className="mb-4 p-4 bg-[#0b1220] rounded-lg space-y-3">
              <input
                type="text"
                placeholder="Titolo challenge"
                value={newChallenge.title}
                onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})}
                className="w-full px-3 py-2 bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg text-[#e8fbff] text-sm"
              />
              <textarea
                placeholder="Descrizione"
                value={newChallenge.description}
                onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})}
                className="w-full px-3 py-2 bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg text-[#e8fbff] text-sm resize-none"
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newChallenge.category}
                  onChange={(e) => setNewChallenge({...newChallenge, category: e.target.value})}
                  className="px-3 py-2 bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg text-[#e8fbff] text-sm"
                >
                  <option value="civic">Segnalazioni</option>
                  <option value="mobility">Mobilità</option>
                  <option value="culture">Cultura</option>
                  <option value="shopping">Acquisti</option>
                </select>
                <input
                  type="number"
                  placeholder="Obiettivo"
                  value={newChallenge.target_value}
                  onChange={(e) => setNewChallenge({...newChallenge, target_value: parseInt(e.target.value)})}
                  className="px-3 py-2 bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg text-[#e8fbff] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="TCC Reward"
                  value={newChallenge.tcc_reward}
                  onChange={(e) => setNewChallenge({...newChallenge, tcc_reward: parseInt(e.target.value)})}
                  className="px-3 py-2 bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg text-[#e8fbff] text-sm"
                />
                <input
                  type="color"
                  value={newChallenge.color}
                  onChange={(e) => setNewChallenge({...newChallenge, color: e.target.value})}
                  className="w-full h-10 bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createChallenge}
                  className="flex-1 px-4 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors text-sm"
                >
                  Crea Challenge
                </button>
                <button
                  onClick={() => setShowChallengeForm(false)}
                  className="px-4 py-2 bg-[#374151] text-white rounded-lg hover:bg-[#4b5563] transition-colors text-sm"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
          
          {/* Lista challenges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {challenges.map((challenge) => {
              const IconComponent = challenge.icon === 'shield' ? Shield :
                                   challenge.icon === 'leaf' ? Leaf :
                                   challenge.icon === 'landmark' ? Landmark :
                                   challenge.icon === 'shopping-cart' ? ShoppingCart : Trophy;
              return (
                <div 
                  key={challenge.id} 
                  className="p-4 rounded-lg bg-[#0b1220]/50 border-l-4"
                  style={{ borderColor: challenge.color }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: challenge.color + '20' }}
                      >
                        <IconComponent className="h-5 w-5" style={{ color: challenge.color }} />
                      </div>
                      <div>
                        <h4 className="text-[#e8fbff] font-medium text-sm">{challenge.title}</h4>
                        <p className="text-[#e8fbff]/50 text-xs">{challenge.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteChallenge(challenge.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-[#e8fbff]/70">
                        <span className="text-[#22c55e] font-bold">{challenge.tcc_reward}</span> TCC
                      </span>
                      <span className="text-[#e8fbff]/50">
                        Obiettivo: {challenge.target_value}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#e8fbff]/50">
                      <Users className="h-3 w-3" />
                      {challenge.participants_count || 0}
                      <span className="text-[#22c55e]">✓ {challenge.completions_count || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {challenges.length === 0 && (
              <div className="col-span-2 text-center text-[#e8fbff]/50 py-8">
                Nessuna challenge attiva. Crea la prima!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
            <button
              onClick={() => setSelectedLayer('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedLayer === 'all' 
                  ? 'bg-[#8b5cf6] text-white' 
                  : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
              }`}
            >
              🌐 Tutti
            </button>
            {config.civic_enabled && (
              <button
                onClick={() => setSelectedLayer('civic')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'civic' 
                    ? 'bg-[#f97316] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                📢 Segnalazioni ({filterByTime(civicReports, 'created_at').length})
              </button>
            )}
            {config.shopping_enabled && (
              <button
                onClick={() => setSelectedLayer('shopping')}
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
                onClick={() => setSelectedLayer('mobility')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'mobility' 
                    ? 'bg-[#06b6d4] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🚲 Mobilità
              </button>
            )}
            {config.culture_enabled && (
              <button
                onClick={() => setSelectedLayer('culture')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedLayer === 'culture' 
                    ? 'bg-[#a855f7] text-white' 
                    : 'bg-[#0b1220] text-[#e8fbff]/70 hover:bg-[#0b1220]/80'
                }`}
              >
                🏛️ Cultura
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
              <MapCenterUpdater points={heatmapPoints} civicReports={civicReports} comuneId={currentComuneId} />
              <HeatmapLayer points={[...heatmapPoints, ...filterByTime(civicReports, 'created_at')]} />
              {/* Marker negozi/hub/mercati */}
              {(selectedLayer === 'all' || selectedLayer === 'shopping') && heatmapPoints.map((point) => {
                const intensity = Math.min((point.tcc_earned + point.tcc_spent) / 5000, 1.0);
                return (
                  <Marker
                    key={`shop-${point.id}`}
                    position={[point.lat, point.lng]}
                    icon={getMarkerIcon(point.type, intensity)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-bold">{point.name}</div>
                        <div>TCC Guadagnati: {point.tcc_earned}</div>
                        <div>TCC Spesi: {point.tcc_spent}</div>
                        <div>Transazioni: {point.transactions}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {/* Marker segnalazioni civiche */}
              {(selectedLayer === 'all' || selectedLayer === 'civic') && filterByTime(civicReports, 'created_at').map((report) => (
                <Marker
                  key={`civic-${report.id}`}
                  position={[report.lat, report.lng]}
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
            </MapContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-[#e8fbff]/70">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f97316]"></span> 📢 Segnalazioni</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#22c55e]"></span> 🏪 Negozi</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#eab308]"></span> 🛒 Mercati</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#8b5cf6]"></span> 🏢 Hub</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
