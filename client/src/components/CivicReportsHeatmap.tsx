import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

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

interface CivicReport {
  id: number;
  type: string;
  description: string;
  lat: string | number;
  lng: string | number;
  status: string;
  priority?: string;
  created_at?: string;
}

// Componente per centrare automaticamente la mappa sui reports
function MapCenterUpdater({ reports }: { reports: CivicReport[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !reports || reports.length === 0) return;
    
    const validReports = reports.filter(r => r.lat && r.lng);
    if (validReports.length === 0) return;
    
    const avgLat = validReports.reduce((sum, r) => 
      sum + (typeof r.lat === 'string' ? parseFloat(r.lat) : r.lat), 0) / validReports.length;
    const avgLng = validReports.reduce((sum, r) => 
      sum + (typeof r.lng === 'string' ? parseFloat(r.lng) : r.lng), 0) / validReports.length;
    
    map.flyTo([avgLat, avgLng], 17, { duration: 1.5 });
  }, [map, reports]);
  
  return null;
}

// Componente interno per aggiungere la heatmap
function HeatmapLayer({ reports }: { reports: CivicReport[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || !reports || reports.length === 0) return;
    
    const heatData: [number, number, number][] = reports
      .filter(r => r.lat && r.lng)
      .map(r => {
        const lat = typeof r.lat === 'string' ? parseFloat(r.lat) : r.lat;
        const lng = typeof r.lng === 'string' ? parseFloat(r.lng) : r.lng;
        let intensity = 0.5;
        if (r.priority === 'URGENT') intensity = 1.0;
        if (r.status === 'pending') intensity += 0.3;
        return [lat, lng, Math.min(intensity, 1.0)];
      });
    
    if (heatData.length === 0) return;
    
    const heatLayer = (L as any).heatLayer(heatData, {
      radius: 40,
      blur: 30,
      maxZoom: 18,
      max: 1.0,
      gradient: {
        0.0: '#00ff00',
        0.25: '#adff2f',
        0.5: '#ffff00',
        0.75: '#ffa500',
        1.0: '#ff0000'
      }
    }).addTo(map);
    
    return () => {
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, reports]);
  
  return null;
}

// Icone personalizzate per tipo segnalazione - 15px
const getMarkerIcon = (type: string, status: string) => {
  const emoji: Record<string, string> = {
    'Degrado': '🏚️',
    'Rifiuti': '🗑️',
    'Illuminazione': '💡',
    'Sicurezza': '🔒',
    'Buche': '🕳️',
    'Microcriminalità': '⚠️',
    'Abusivismo': '🚫',
    'Altro': '📝'
  };
  
  const bgColor = status === 'resolved' ? '#10b981' : 
                  status === 'in_progress' ? '#06b6d4' : '#f59e0b';
  
  return L.divIcon({
    className: 'civic-marker',
    html: `<div style="
      background: ${bgColor};
      color: white;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.5);
      border: 1px solid white;
    ">${emoji[type] || '📍'}</div>`,
    iconSize: [15, 15],
    iconAnchor: [7, 7]
  });
};

// Funzione per calcolare offset a spirale per marker con stesse coordinate
// Forma un "gomitolo" con tutti i punti visibili attaccati
function calculateSpiralOffsets(reports: CivicReport[]): Map<number, { latOffset: number; lngOffset: number }> {
  const offsets = new Map<number, { latOffset: number; lngOffset: number }>();
  const coordGroups = new Map<string, CivicReport[]>();
  
  // Raggruppa per coordinate (arrotondate a 4 decimali - circa 10m)
  reports.forEach(r => {
    const lat = typeof r.lat === 'string' ? parseFloat(r.lat) : r.lat;
    const lng = typeof r.lng === 'string' ? parseFloat(r.lng) : r.lng;
    const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    
    if (!coordGroups.has(key)) {
      coordGroups.set(key, []);
    }
    coordGroups.get(key)!.push(r);
  });
  
  // Calcola offset a spirale per ogni gruppo
  coordGroups.forEach((group) => {
    if (group.length === 1) {
      offsets.set(group[0].id, { latOffset: 0, lngOffset: 0 });
    } else {
      // Disponi a spirale/cerchio attorno al centro
      const baseRadius = 0.00006; // ~6 metri raggio base
      const angleStep = (2 * Math.PI) / Math.min(group.length, 8); // Max 8 per cerchio
      
      group.forEach((r, index) => {
        if (index === 0) {
          // Primo marker al centro
          offsets.set(r.id, { latOffset: 0, lngOffset: 0 });
        } else {
          // Altri marker in cerchi concentrici
          const ring = Math.floor((index - 1) / 8); // Quale anello
          const posInRing = (index - 1) % 8; // Posizione nell'anello
          const radius = baseRadius * (ring + 1);
          const angle = posInRing * angleStep + (ring * 0.4); // Ruota leggermente ogni anello
          
          offsets.set(r.id, { 
            latOffset: radius * Math.cos(angle),
            lngOffset: radius * Math.sin(angle)
          });
        }
      });
    }
  });
  
  return offsets;
}

/**
 * Componente mappa termica per segnalazioni civiche
 * Carica i dati direttamente dall'API REST
 */
export function CivicReportsHeatmap() {
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dati dall'API REST
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://api.mio-hub.me/api/civic-reports/stats');
        const data = await response.json();
        
        if (data.success && data.data?.recent) {
          console.log('Segnalazioni caricate:', data.data.recent.length, data.data.recent);
          setReports(data.data.recent);
        } else {
          console.error('Formato dati non valido:', data);
          setError('Formato dati non valido');
        }
      } catch (err) {
        console.error('Errore fetch segnalazioni:', err);
        setError('Errore caricamento dati');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="h-[600px] w-full rounded-lg border border-[#f59e0b]/30 bg-[#1a2332] flex items-center justify-center">
        <div className="text-[#f59e0b] animate-pulse">Caricamento mappa termica...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px] w-full rounded-lg border border-red-500/30 bg-[#1a2332] flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const validReports = reports.filter(r => r.lat && r.lng);
  const offsets = calculateSpiralOffsets(validReports);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-[#e8fbff]/70">
          🔥 Mappa Termica Segnalazioni
        </span>
        <span className="text-xs text-[#10b981]">
          ● {validReports.length} segnalazioni con coordinate
        </span>
      </div>
      <div style={{ height: '600px', width: '100%' }} className="rounded-lg overflow-hidden border border-[#f59e0b]/30">
        <MapContainer
          center={[44.4898, 11.0123]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {validReports.length > 0 && (
            <>
              <MapCenterUpdater reports={validReports} />
              <HeatmapLayer reports={validReports} />
            </>
          )}
          
          {validReports.map(report => {
            const baseLat = typeof report.lat === 'string' ? parseFloat(report.lat) : report.lat;
            const baseLng = typeof report.lng === 'string' ? parseFloat(report.lng) : report.lng;
            const offset = offsets.get(report.id) || { latOffset: 0, lngOffset: 0 };
            const lat = baseLat + offset.latOffset;
            const lng = baseLng + offset.lngOffset;
            
            return (
              <Marker
                key={report.id}
                position={[lat, lng]}
                icon={getMarkerIcon(report.type, report.status)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="font-bold text-lg">{report.type}</div>
                    <div className="text-sm text-gray-600 mt-1">{report.description}</div>
                    <div className={`mt-2 inline-block px-2 py-1 rounded text-xs font-medium ${
                      report.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      report.status === 'in_progress' ? 'bg-cyan-100 text-cyan-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {report.status === 'pending' ? 'Da assegnare' : 
                       report.status === 'in_progress' ? 'In corso' : 'Risolto'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default CivicReportsHeatmap;
