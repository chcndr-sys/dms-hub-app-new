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

interface CivicReportsHeatmapProps {
  reports: CivicReport[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showMarkers?: boolean;
  onReportClick?: (report: CivicReport) => void;
}

// Componente interno per aggiungere la heatmap
function HeatmapLayer({ reports }: { reports: CivicReport[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !reports || reports.length === 0) return;

    // Converti reports in punti heatmap
    // Formato: [lat, lng, intensity]
    const heatData: [number, number, number][] = reports
      .filter(r => r.lat && r.lng)
      .map(r => {
        const lat = typeof r.lat === 'string' ? parseFloat(r.lat) : r.lat;
        const lng = typeof r.lng === 'string' ? parseFloat(r.lng) : r.lng;
        // Intensità basata su priorità e status
        let intensity = 0.5;
        if (r.priority === 'URGENT') intensity = 1.0;
        if (r.status === 'pending') intensity += 0.3;
        return [lat, lng, Math.min(intensity, 1.0)];
      });

    // Crea layer heatmap con gradiente rosso-arancio-giallo
    const heatLayer = (L as any).heatLayer(heatData, {
      radius: 30,
      blur: 20,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#00ff00',  // Verde (bassa densità)
        0.25: '#adff2f', // Verde-giallo
        0.5: '#ffff00',  // Giallo
        0.75: '#ffa500', // Arancione
        1.0: '#ff0000'   // Rosso (alta densità)
      }
    }).addTo(map);

    // Cleanup
    return () => {
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, reports]);

  return null;
}

// Icone personalizzate per tipo segnalazione
const getMarkerIcon = (type: string, status: string) => {
  const emoji = {
    'Degrado': '🏚️',
    'Rifiuti': '🗑️',
    'Illuminazione': '💡',
    'Sicurezza': '🔒',
    'Buche': '🕳️',
    'Microcriminalità': '⚠️',
    'Abusivismo': '🚫',
    'Altro': '📝'
  }[type] || '📍';

  const bgColor = status === 'resolved' ? '#10b981' : 
                  status === 'in_progress' ? '#06b6d4' : '#f59e0b';

  return L.divIcon({
    className: 'civic-marker',
    html: `<div style="
      background: ${bgColor};
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      border: 2px solid white;
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

/**
 * Componente mappa termica per segnalazioni civiche
 * NON modifica MapReteHubWrapper - usa una MapContainer separata
 */
export function CivicReportsHeatmap({
  reports,
  center = [44.4898, 11.0123], // Default: Bologna
  zoom = 16,
  height = '400px',
  showMarkers = true,
  onReportClick
}: CivicReportsHeatmapProps) {
  console.log("CivicReportsHeatmap received reports:", reports);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  // Calcola centro automatico basato sui reports
  useEffect(() => {
    if (reports && reports.length > 0) {
      const validReports = reports.filter(r => r.lat && r.lng);
      if (validReports.length > 0) {
        const avgLat = validReports.reduce((sum, r) => 
          sum + (typeof r.lat === 'string' ? parseFloat(r.lat) : r.lat), 0) / validReports.length;
        const avgLng = validReports.reduce((sum, r) => 
          sum + (typeof r.lng === 'string' ? parseFloat(r.lng) : r.lng), 0) / validReports.length;
        setMapCenter([avgLat, avgLng]);
      }
    }
  }, [reports]);

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Layer Heatmap */}
        <HeatmapLayer reports={reports} />
        
        {/* Marker individuali (opzionali) */}
        {showMarkers && reports.filter(r => r.lat && r.lng).map(report => {
          const lat = typeof report.lat === 'string' ? parseFloat(report.lat) : report.lat;
          const lng = typeof report.lng === 'string' ? parseFloat(report.lng) : report.lng;
          
          return (
            <Marker
              key={report.id}
              position={[lat, lng]}
              icon={getMarkerIcon(report.type, report.status)}
              eventHandlers={{
                click: () => onReportClick?.(report)
              }}
            >
              <Popup>
                <div className="p-2">
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
  );
}

export default CivicReportsHeatmap;
