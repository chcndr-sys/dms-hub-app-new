/**
 * HubMapTest.tsx
 * 
 * Componente di test per HubMapComponent.
 * Carica gli HUB dal database e li visualizza sulla mappa.
 * 
 * @author Manus AI
 * @date 06 Gennaio 2026
 */

import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Store, ArrowLeft, RefreshCw } from 'lucide-react';
import { HubMapComponent } from './HubMapComponent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE_URL = MIHUB_API_BASE_URL;

// Interfacce
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

export default function HubMapTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allHubs, setAllHubs] = useState<HubLocation[]>([]);
  const [selectedHub, setSelectedHub] = useState<HubLocation | null>(null);
  const [selectedShop, setSelectedShop] = useState<HubShop | null>(null);
  const [viewMode, setViewMode] = useState<'italia' | 'hub'>('italia');
  const [refreshKey, setRefreshKey] = useState(0);

  // Carica tutti gli HUB
  useEffect(() => {
    fetchAllHubs();
  }, []);

  const fetchAllHubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hub/locations`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      
      console.log('[HubMapTest] API Response:', json);
      
      if (json.success && Array.isArray(json.data)) {
        setAllHubs(json.data);
        console.log('[HubMapTest] Loaded', json.data.length, 'HUBs');
      } else {
        throw new Error('Formato risposta non valido');
      }
    } catch (err) {
      console.error('[HubMapTest] Errore:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Carica dettagli singolo HUB
  const fetchHubDetails = async (hubId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hub/locations/${hubId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      
      console.log('[HubMapTest] HUB Details:', json);
      
      if (json.success && json.data) {
        setSelectedHub(json.data);
        setViewMode('hub');
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('[HubMapTest] Errore caricamento HUB:', err);
    } finally {
      setLoading(false);
    }
  };

  // Torna alla vista Italia
  const handleBackToItaly = () => {
    setSelectedHub(null);
    setSelectedShop(null);
    setViewMode('italia');
    setRefreshKey(prev => prev + 1);
  };

  // Click su HUB
  const handleHubClick = (hubId: number) => {
    fetchHubDetails(hubId);
  };

  // Click su negozio
  const handleShopClick = (shop: HubShop) => {
    setSelectedShop(shop);
    console.log('[HubMapTest] Shop clicked:', shop);
  };

  if (loading && allHubs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#9C27B0]" />
        <span className="ml-3 text-[#e8fbff]/70">Caricamento HUB...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">❌ Errore: {error}</div>
        <Button onClick={fetchAllHubs} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-[#9C27B0] to-[#7B1FA2] border-none">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {viewMode === 'hub' && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleBackToItaly}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-6 w-6" />
                  {viewMode === 'italia' ? 'Mappa HUB Italia' : selectedHub?.name}
                </CardTitle>
                <p className="text-white/80 text-sm mt-1">
                  {viewMode === 'italia' 
                    ? `${allHubs.length} HUB disponibili`
                    : `${selectedHub?.shops?.length || 0} negozi - ${selectedHub?.city}`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={fetchAllHubs}
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistiche rapide */}
      {viewMode === 'hub' && selectedHub && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-[#1a2332] border-[#9C27B0]/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-[#9C27B0]">{selectedHub.shops?.length || 0}</div>
              <div className="text-xs text-[#e8fbff]/60">Negozi</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-[#10b981]">
                {selectedHub.shops?.filter(s => s.status === 'active').length || 0}
              </div>
              <div className="text-xs text-[#e8fbff]/60">Attivi</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-[#f59e0b]">
                {selectedHub.area_sqm ? `${selectedHub.area_sqm}` : '-'}
              </div>
              <div className="text-xs text-[#e8fbff]/60">m² Area</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#06b6d4]/30">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-[#06b6d4]">
                {selectedHub.services?.length || 0}
              </div>
              <div className="text-xs text-[#e8fbff]/60">Servizi</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mappa */}
      <Card className="bg-[#1a2332] border-[#9C27B0]/30">
        <CardContent className="p-0">
          <div className="h-[500px] rounded-lg overflow-hidden">
            <HubMapComponent
              hubData={selectedHub}
              allHubs={allHubs}
              showItalyView={viewMode === 'italia'}
              onHubClick={handleHubClick}
              onShopClick={handleShopClick}
              selectedShopId={selectedShop?.id}
              refreshKey={refreshKey}
              zoom={viewMode === 'hub' ? 18 : 6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista negozi (quando HUB selezionato) */}
      {viewMode === 'hub' && selectedHub && selectedHub.shops && selectedHub.shops.length > 0 && (
        <Card className="bg-[#1a2332] border-[#9C27B0]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-lg">
              <Store className="h-5 w-5 text-[#9C27B0]" />
              Negozi ({selectedHub.shops.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedHub.shops.map((shop) => (
                <div 
                  key={shop.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedShop?.id === shop.id 
                      ? 'bg-[#9C27B0]/20 border-[#9C27B0]' 
                      : 'bg-[#0b1220] border-gray-700 hover:border-[#9C27B0]/50'
                  }`}
                  onClick={() => handleShopClick(shop)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ 
                        background: shop.status === 'active' ? '#10b981' : 
                                   shop.status === 'inactive' ? '#6b7280' : '#ef4444' 
                      }}
                    >
                      {shop.letter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#e8fbff] truncate">{shop.name}</div>
                      <div className="text-xs text-[#e8fbff]/60 flex items-center gap-2">
                        <span>{shop.category}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1 py-0 ${
                            shop.status === 'active' ? 'border-green-500 text-green-400' :
                            shop.status === 'inactive' ? 'border-gray-500 text-gray-400' :
                            'border-red-500 text-red-400'
                          }`}
                        >
                          {shop.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
