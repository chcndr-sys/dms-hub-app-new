import { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Market {
  id: number;
  name: string;
  city: string;
  lat: string;
  lng: string;
}

interface Stall {
  id: number;
  marketId: number;
  number: string;
  lat: string;
  lng: string;
  orientation?: number;
  kind?: string;
  status: string;
  widthM?: number;
  depthM?: number;
}

export default function MercatiPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Fetch markets list
  useEffect(() => {
    fetchMarkets();
  }, []);

  // Initialize map when market is selected
  useEffect(() => {
    if (selectedMarket && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [selectedMarket]);

  // Update map markers when stalls change
  useEffect(() => {
    if (map.current && stalls.length > 0) {
      addStallsToMap();
    }
  }, [stalls]);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/trpc/dmsHub.markets.list`);
      const data = await response.json();
      setMarkets(data.result.data || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketDetails = async (marketId: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/trpc/dmsHub.markets.getById?input=${encodeURIComponent(JSON.stringify({ marketId }))}`
      );
      const data = await response.json();
      const result = data.result.data;
      
      if (result) {
        setStalls(result.stalls || []);
      }
    } catch (error) {
      console.error('Error fetching market details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketSelect = (market: Market) => {
    setSelectedMarket(market);
    fetchMarketDetails(market.id);
  };

  const initializeMap = () => {
    if (!selectedMarket || !mapContainer.current) return;

    const centerLat = parseFloat(selectedMarket.lat);
    const centerLng = parseFloat(selectedMarket.lng);

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm',
          type: 'raster',
          source: 'osm'
        }]
      },
      center: [centerLng, centerLat],
      zoom: 17
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
  };

  const addStallsToMap = () => {
    if (!map.current) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.stall-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add stall markers
    stalls.forEach(stall => {
      const lat = parseFloat(stall.lat);
      const lng = parseFloat(stall.lng);

      if (isNaN(lat) || isNaN(lng)) return;

      const el = document.createElement('div');
      el.className = 'stall-marker';
      el.style.backgroundColor = getStallColor(stall.status);
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '10px';
      el.style.fontWeight = 'bold';
      el.style.color = 'white';
      el.textContent = stall.number;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">Piazzola ${stall.number}</h3>
          <p style="margin: 4px 0; font-size: 12px;"><strong>Stato:</strong> ${stall.status}</p>
          ${stall.widthM && stall.depthM ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Dimensioni:</strong> ${stall.widthM}m × ${stall.depthM}m</p>` : ''}
          ${stall.orientation ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Orientamento:</strong> ${stall.orientation}°</p>` : ''}
          ${stall.kind ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Tipo:</strong> ${stall.kind}</p>` : ''}
        </div>
      `);

      new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);
    });
  };

  const getStallColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'free':
        return '#10b981'; // green
      case 'occupied':
        return '#ef4444'; // red
      case 'reserved':
        return '#f59e0b'; // orange
      case 'booked':
        return '#3b82f6'; // blue
      case 'maintenance':
        return '#6b7280'; // gray
      default:
        return '#9ca3af'; // light gray
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '16px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>Mercati</h2>
        
        {loading && <p>Caricamento...</p>}
        
        {!loading && markets.length === 0 && (
          <p style={{ color: '#6b7280' }}>Nessun mercato disponibile</p>
        )}
        
        {markets.map(market => (
          <div
            key={market.id}
            onClick={() => handleMarketSelect(market)}
            style={{
              padding: '12px',
              marginBottom: '8px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedMarket?.id === market.id ? '#eff6ff' : 'white',
              borderColor: selectedMarket?.id === market.id ? '#3b82f6' : '#e5e7eb'
            }}
          >
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>{market.name}</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{market.city}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {!selectedMarket ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#6b7280'
          }}>
            <p>Seleziona un mercato per visualizzare la mappa</p>
          </div>
        ) : (
          <>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              left: '16px', 
              zIndex: 1,
              backgroundColor: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>{selectedMarket.name}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                {stalls.length} piazzole
              </p>
            </div>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          </>
        )}
      </div>
    </div>
  );
}
