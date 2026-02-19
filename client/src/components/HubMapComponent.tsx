/**
 * HubMapComponent.tsx
 * 
 * Componente mappa per visualizzare HUB indipendenti con negozi.
 * Differenza con MarketMapComponent:
 * - HUB: negozi come PUNTI (markers)
 * - Mercati: posteggi come POLIGONI
 * 
 * @author Manus AI
 * @date 06 Gennaio 2026
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl, CircleMarker, useMap } from 'react-leaflet';
import { useAnimation } from '@/contexts/AnimationContext';
import { useMapAnimation } from '@/hooks/useMapAnimation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// ============================================================================
// INTERFACCE
// ============================================================================

interface HubShop {
  id: number;
  hub_id: number;
  shop_number: number;
  letter: string;
  name: string;
  category: string;
  lat: string;
  lng: string;
  status: string;
  phone: string | null;
  email: string | null;
  vetrina_url: string | null;
  description: string | null;
}

interface HubLocation {
  id: number;
  market_id: number | null;
  name: string;
  address: string;
  city: string;
  lat: string;
  lng: string;
  center_lat: string;
  center_lng: string;
  area_geojson: any;
  corner_geojson: any;
  opening_hours: string | null;
  active: number;
  is_independent: number;
  description: string | null;
  photo_url: string | null;
  area_sqm: number | null;
  shops: HubShop[];
  services: any[];
}

interface HubMapComponentProps {
  hubData?: HubLocation | null;        // Singolo HUB con dettagli
  allHubs?: HubLocation[];             // Lista tutti gli HUB per vista Italia
  center?: [number, number];
  zoom?: number;
  height?: string;
  onHubClick?: (hubId: number) => void;
  onShopClick?: (shop: HubShop) => void;
  selectedShopId?: number;
  showItalyView?: boolean;
  refreshKey?: number;
}

// Controller per centrare la mappa
interface MapControllerProps {
  center: [number, number];
  zoom?: number;
  trigger?: number;
  bounds?: L.LatLngBoundsExpression;
}

function MapCenterController(props: MapControllerProps) {
  useMapAnimation(props);
  return null;
}

// ============================================================================
// FUNZIONI HELPER
// ============================================================================

// Verifica se coordinate sono valide (non null, non NaN, range Italia plausibile)
const isValidCoord = (lat: string | number | null | undefined, lng: string | number | null | undefined): boolean => {
  if (lat == null || lng == null || lat === '' || lng === '') return false;
  const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
  const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return false;
  // Range plausibile per l'Italia (con margine)
  if (latNum < 35 || latNum > 48 || lngNum < 6 || lngNum > 19) return false;
  return true;
};

// Colore in base alla categoria del negozio
const getShopCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'shop': '#9C27B0',      // Viola
    'food': '#FF9800',      // Arancione
    'restaurant': '#E91E63', // Rosa
    'bar': '#795548',       // Marrone
    'clothing': '#2196F3',  // Blu
    'service': '#607D8B',   // Grigio
    'other': '#9E9E9E',     // Grigio chiaro
  };
  return colors[category] || colors['shop'];
};

// Colore in base allo stato del negozio
const getShopStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return '#10b981'; // Verde
    case 'inactive': return '#6b7280'; // Grigio
    case 'closed': return '#ef4444'; // Rosso
    default: return '#10b981';
  }
};

// Icona categoria
const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    'shop': '🏪',
    'food': '🍕',
    'restaurant': '🍽️',
    'bar': '☕',
    'clothing': '👕',
    'service': '🛠️',
    'other': '📌',
  };
  return icons[category] || icons['shop'];
};

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

export function HubMapComponent({
  hubData,
  allHubs = [],
  center,
  zoom = 17,
  height = '600px',
  onHubClick,
  onShopClick,
  selectedShopId,
  showItalyView = false,
  refreshKey = 0,
}: HubMapComponentProps) {
  
  const { isAnimating } = useAnimation();
  
  // Centro mappa: se vista Italia usa centro Italia, altrimenti centro HUB
  const mapCenter: [number, number] = center || (
    showItalyView 
      ? [43.5, 12.5] 
      : hubData 
        ? [parseFloat(hubData.center_lat || hubData.lat), parseFloat(hubData.center_lng || hubData.lng)]
        : [43.5, 12.5]
  );
  
  const mapZoom = showItalyView ? 6.3 : zoom;

  // Ref per la mappa
  const mapRef = React.useRef<L.Map | null>(null);

  return (
    <>
      {/* Stili CSS per i marker negozi */}
      <style>{`
        .shop-marker-tooltip.leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          color: white !important;
          font-size: 12px !important;
          font-weight: bold !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
          pointer-events: none !important;
        }
        .shop-marker-tooltip.leaflet-tooltip-left:before,
        .shop-marker-tooltip.leaflet-tooltip-right:before {
          display: none !important;
        }
      `}</style>
      
      <div style={{ height, width: '100%' }}>
        <MapContainer
          key={`hub-map-${refreshKey}`}
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          {/* Layer Control */}
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri'
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Controller per animazioni */}
          <MapCenterController 
            center={mapCenter} 
            zoom={mapZoom}
            trigger={refreshKey}
          />

          {/* ========== VISTA ITALIA: Marker "H" per tutti gli HUB ========== */}
          {showItalyView && allHubs.filter((hub) => isValidCoord(hub.lat, hub.lng)).map((hub) => (
            <Marker
              key={`hub-marker-${hub.id}`}
              position={[parseFloat(hub.lat), parseFloat(hub.lng)]}
              icon={L.divIcon({
                className: 'hub-center-marker',
                html: `<div style="
                  background: #9C27B0;
                  color: white;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 18px;
                  font-weight: bold;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                  border: 3px solid white;
                  cursor: pointer;
                ">H</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })}
              eventHandlers={{
                click: () => onHubClick?.(hub.id)
              }}
            >
              <Popup className="hub-popup" minWidth={280}>
                <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '280px' }}>
                  {/* Header */}
                  <div className="bg-[#9C27B0] p-3 border-b border-purple-800 flex justify-between items-center">
                    <div className="font-bold text-lg text-white flex items-center gap-2">
                      <span className="bg-white text-[#9C27B0] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">H</span>
                      {hub.name}
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3 text-sm">
                    {/* Città */}
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Città:</span>
                      <span className="font-medium text-white">{hub.city}</span>
                    </div>
                    
                    {/* Indirizzo */}
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Indirizzo:</span>
                      <span className="font-medium text-white">{hub.address}</span>
                    </div>
                    
                    {/* Negozi */}
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                      <span className="text-gray-400">Negozi:</span>
                      <span className="font-bold text-[#9C27B0]">{hub.shops?.length || 0}</span>
                    </div>
                    
                    {/* Superficie */}
                    {hub.area_sqm && (
                      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-gray-400">Superficie:</span>
                        <span className="font-medium text-white">{hub.area_sqm} m²</span>
                      </div>
                    )}
                    
                    {/* CTA */}
                    <div className="pt-2 text-center text-xs text-gray-500 italic">
                      Clicca per vedere i dettagli
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* ========== VISTA DETTAGLIO HUB ========== */}
          {!showItalyView && hubData && (
            <>
              {/* Poligono Area HUB */}
              {hubData.area_geojson && hubData.area_geojson.coordinates && (
                <Polygon
                  positions={hubData.area_geojson.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number])}
                  pathOptions={{
                    color: '#9C27B0',
                    fillColor: '#9C27B0',
                    fillOpacity: 0.2,
                    weight: 3,
                    dashArray: '5, 10'
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold text-base mb-2">🏢 {hubData.name}</div>
                      <div className="text-gray-600">Area HUB</div>
                      {hubData.area_sqm && (
                        <div className="text-gray-600">Superficie: {hubData.area_sqm} m²</div>
                      )}
                      <div className="text-gray-600 mt-1">Negozi: {hubData.shops?.length || 0}</div>
                    </div>
                  </Popup>
                </Polygon>
              )}

              {/* Marker Centro HUB */}
              <Marker
                position={[parseFloat(hubData.center_lat || hubData.lat), parseFloat(hubData.center_lng || hubData.lng)]}
                icon={L.divIcon({
                  className: 'hub-center-marker',
                  html: `<div style="
                    background: #9C27B0;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: bold;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                    border: 3px solid white;
                  ">H</div>`,
                  iconSize: [40, 40],
                  iconAnchor: [20, 20],
                })}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold text-base mb-1">🏢 Centro HUB</div>
                    <div className="font-medium">{hubData.name}</div>
                    <div className="text-gray-600">{hubData.address}, {hubData.city}</div>
                  </div>
                </Popup>
              </Marker>

              {/* ========== NEGOZI COME PUNTI (MARKERS) ========== */}
              {hubData.shops && hubData.shops.filter((shop) => isValidCoord(shop.lat, shop.lng)).map((shop) => {
                const isSelected = selectedShopId === shop.id;
                const shopColor = getShopStatusColor(shop.status);
                const categoryIcon = getCategoryIcon(shop.category);
                
                return (
                  <Marker
                    key={`shop-${shop.id}`}
                    position={[parseFloat(shop.lat), parseFloat(shop.lng)]}
                    icon={L.divIcon({
                      className: 'shop-marker',
                      html: `<div style="
                        background: ${shopColor};
                        color: white;
                        width: ${isSelected ? '36px' : '28px'};
                        height: ${isSelected ? '36px' : '28px'};
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: ${isSelected ? '16px' : '14px'};
                        font-weight: bold;
                        box-shadow: 0 ${isSelected ? '4px 8px' : '2px 4px'} rgba(0,0,0,${isSelected ? '0.4' : '0.3'});
                        border: ${isSelected ? '4px' : '2px'} solid white;
                        cursor: pointer;
                        transition: all 0.2s ease;
                      ">${shop.letter}</div>`,
                      iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
                      iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
                    })}
                    eventHandlers={{
                      click: () => onShopClick?.(shop)
                    }}
                  >
                    <Popup className="shop-popup" minWidth={250}>
                      <div className="p-0 bg-[#0b1220] text-gray-100 rounded-md overflow-hidden" style={{ minWidth: '250px' }}>
                        {/* Header */}
                        <div style={{ background: shopColor }} className="p-3 flex items-center gap-2">
                          <span className="bg-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold" style={{ color: shopColor }}>
                            {shop.letter}
                          </span>
                          <div>
                            <div className="font-bold text-white">{shop.name}</div>
                            <div className="text-white/80 text-xs">{categoryIcon} {shop.category}</div>
                          </div>
                        </div>
                        
                        <div className="p-3 space-y-2 text-sm">
                          {/* Stato */}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Stato:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              shop.status === 'active' ? 'bg-green-500/20 text-green-400' :
                              shop.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {shop.status === 'active' ? '🟢 Attivo' : 
                               shop.status === 'inactive' ? '⚪ Inattivo' : '🔴 Chiuso'}
                            </span>
                          </div>
                          
                          {/* Contatti */}
                          {shop.phone && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">📞 Tel:</span>
                              <span className="text-white">{shop.phone}</span>
                            </div>
                          )}
                          {shop.email && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">✉️ Email:</span>
                              <span className="text-white text-xs">{shop.email}</span>
                            </div>
                          )}
                          
                          {/* Descrizione */}
                          {shop.description && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <div className="text-gray-400 text-xs mb-1">Descrizione:</div>
                              <div className="text-white text-xs">{shop.description}</div>
                            </div>
                          )}
                          
                          {/* Vetrina */}
                          {shop.vetrina_url && (
                            <div className="mt-2">
                              <a 
                                href={shop.vetrina_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#9C27B0] hover:underline text-xs"
                              >
                                🔗 Visita Vetrina
                              </a>
                            </div>
                          )}
                          
                          {/* Coordinate */}
                          <div className="bg-[#1e293b] p-2 rounded border border-gray-700 mt-2">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Coordinate GPS</div>
                            <div className="font-mono text-xs text-gray-300 flex justify-between">
                              <span>Lat: {parseFloat(shop.lat).toFixed(6)}</span>
                              <span>Lng: {parseFloat(shop.lng).toFixed(6)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          )}
        </MapContainer>
      </div>
    </>
  );
}

export default HubMapComponent;
