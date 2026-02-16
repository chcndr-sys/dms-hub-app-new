import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Building2, Store, Wrench, MapPin, Phone, Mail, Clock, Plus, Edit, Trash2, Loader2, AlertCircle, AlertTriangle, Users } from 'lucide-react';
import { MarketCompaniesTab } from './markets/MarketCompaniesTab';
import { MarketMapComponent } from './MarketMapComponent';
import { HubMapComponent } from './HubMapComponent';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function GestioneHubNegozi() {
  const [selectedTab, setSelectedTab] = useState('anagrafica');
  
  // MAP STATE - Unified Logic
  const [viewMode, setViewMode] = useState<'italia' | 'mercato' | 'hub'>('italia');
  const [mapType, setMapType] = useState<'mercati' | 'hub'>('mercati'); // Selettore tipo mappa
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [stallsData, setStallsData] = useState<any[]>([]);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  
  // HUB MAP STATE
  const [allHubLocations, setAllHubLocations] = useState<any[]>([]);
  const [selectedHubLocation, setSelectedHubLocation] = useState<any>(null);
  const [hubMapLoading, setHubMapLoading] = useState(false);
  
  // Default HUB selection (kept for backward compatibility with tabs)
  const [selectedHubId, setSelectedHubId] = useState(1); 
  
  // Dialog states
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  
  // Edit states
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  
  // Delete confirmation states
  const [deleteLocationId, setDeleteLocationId] = useState<number | null>(null);
  const [deleteShopId, setDeleteShopId] = useState<number | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null);

  // Form states for location (allineato allo schema backend)
  const [locationForm, setLocationForm] = useState({
    marketId: 1, // Default Grosseto
    name: '',
    address: '',
    city: '',
    lat: '',
    lng: '',
    areaGeojson: '',
    openingHours: '',
    description: '',
    photoUrl: ''
  });

  // Form states for shop (allineato allo schema backend)
  const [shopForm, setShopForm] = useState({
    name: '',
    category: '',
    certifications: '',
    ownerId: undefined as number | undefined,
    businessName: '',
    vatNumber: '',
    phone: '',
    email: '',
    lat: '',
    lng: '',
    areaMq: undefined as number | undefined,
    description: '',
    photoUrl: ''
  });

  // Form states for service (allineato allo schema backend)
  const [serviceForm, setServiceForm] = useState({
    name: '',
    type: '',
    description: '',
    capacity: undefined as number | undefined,
    available: undefined as number | undefined,
    price: undefined as number | undefined,
    lat: '',
    lng: '',
    metadata: ''
  });

  // tRPC Queries
  const hubLocationsQuery = trpc.dmsHub.hub.locations.list.useQuery();
  const hubShopsQuery = trpc.dmsHub.hub.shops.list.useQuery({ hubId: selectedHubId });
  const hubServicesQuery = trpc.dmsHub.hub.services.list.useQuery({ hubId: selectedHubId });

  // tRPC Mutations
  const createLocationMutation = trpc.dmsHub.hub.locations.create.useMutation({
    onSuccess: () => {
      hubLocationsQuery.refetch();
      setIsLocationDialogOpen(false);
      resetLocationForm();
    }
  });

  const updateLocationMutation = trpc.dmsHub.hub.locations.update.useMutation({
    onSuccess: () => {
      hubLocationsQuery.refetch();
      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      resetLocationForm();
    }
  });

  const deleteLocationMutation = trpc.dmsHub.hub.locations.delete.useMutation({
    onSuccess: () => {
      hubLocationsQuery.refetch();
      setDeleteLocationId(null);
    }
  });

  const createShopMutation = trpc.dmsHub.hub.shops.create.useMutation({
    onSuccess: () => {
      hubShopsQuery.refetch();
      setIsShopDialogOpen(false);
      resetShopForm();
    }
  });

  const updateShopMutation = trpc.dmsHub.hub.shops.update.useMutation({
    onSuccess: () => {
      hubShopsQuery.refetch();
      setIsShopDialogOpen(false);
      setEditingShop(null);
      resetShopForm();
    }
  });

  const deleteShopMutation = trpc.dmsHub.hub.shops.delete.useMutation({
    onSuccess: () => {
      hubShopsQuery.refetch();
      setDeleteShopId(null);
    }
  });

  const createServiceMutation = trpc.dmsHub.hub.services.create.useMutation({
    onSuccess: () => {
      hubServicesQuery.refetch();
      setIsServiceDialogOpen(false);
      resetServiceForm();
    }
  });

  const updateServiceMutation = trpc.dmsHub.hub.services.update.useMutation({
    onSuccess: () => {
      hubServicesQuery.refetch();
      setIsServiceDialogOpen(false);
      setEditingService(null);
      resetServiceForm();
    }
  });

  const deleteServiceMutation = trpc.dmsHub.hub.services.delete.useMutation({
    onSuccess: () => {
      hubServicesQuery.refetch();
      setDeleteServiceId(null);
    }
  });

  // Reset form functions
  const resetLocationForm = () => {
    setLocationForm({
      marketId: 1,
      name: '',
      address: '',
      city: '',
      lat: '',
      lng: '',
      areaGeojson: '',
      openingHours: '',
      description: '',
      photoUrl: ''
    });
  };

  const resetShopForm = () => {
    setShopForm({
      name: '',
      category: '',
      certifications: '',
      ownerId: undefined,
      businessName: '',
      vatNumber: '',
      phone: '',
      email: '',
      lat: '',
      lng: '',
      areaMq: undefined,
      description: '',
      photoUrl: ''
    });
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      type: '',
      description: '',
      capacity: undefined,
      available: undefined,
      price: undefined,
      lat: '',
      lng: '',
      metadata: ''
    });
  };

  // Handle create/update location
  const handleSaveLocation = () => {
    if (editingLocation) {
      // Update
      updateLocationMutation.mutate({
        id: editingLocation.id,
        ...locationForm
      });
    } else {
      // Create
      createLocationMutation.mutate(locationForm);
    }
  };

  // Handle edit location
  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setLocationForm({
      marketId: location.marketId,
      name: location.name,
      address: location.address,
      city: location.city,
      lat: location.lat,
      lng: location.lng,
      areaGeojson: location.areaGeojson || '',
      openingHours: location.openingHours || '',
      description: location.description || '',
      photoUrl: location.photoUrl || ''
    });
    setIsLocationDialogOpen(true);
  };

  // Handle delete location
  const handleDeleteLocation = () => {
    if (deleteLocationId) {
      deleteLocationMutation.mutate({ id: deleteLocationId });
    }
  };

  // Handle create/update shop
  const handleSubmitShop = () => {
    if (editingShop) {
      updateShopMutation.mutate({ id: editingShop.id, ...shopForm });
    } else {
      createShopMutation.mutate({ hubId: selectedHubId, ...shopForm });
    }
  };

  // Handle delete shop
  const handleDeleteShop = () => {
    if (deleteShopId) {
      deleteShopMutation.mutate({ id: deleteShopId });
    }
  };

  // Handle create/update service
  const handleSubmitService = () => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, ...serviceForm });
    } else {
      createServiceMutation.mutate({ hubId: selectedHubId, ...serviceForm });
    }
  };

  // Handle delete service
  const handleDeleteService = () => {
    if (deleteServiceId) {
      deleteServiceMutation.mutate({ id: deleteServiceId });
    }
  };

  // Load map data dynamically based on view mode and selection
  useEffect(() => {
    const loadMapData = async () => {
      try {
        // 1. Load Base Map (Italy View or Specific Market)
        const mapRes = await fetch('https://mihub.157-90-29-66.nip.io/api/gis/market-map');
        const mapJson = await mapRes.json();
        
        if (mapJson.success && mapJson.data) {
          setMapData(mapJson.data);
        }

        // 2. Load Stalls only if a market is selected
        if (selectedMarketId) {
          const stallsRes = await fetch(`https://mihub.157-90-29-66.nip.io/api/markets/${selectedMarketId}/stalls`);
          const stallsJson = await stallsRes.json();
          
          if (stallsJson.success && Array.isArray(stallsJson.data)) {
            setStallsData(stallsJson.data);
          } else {
            setStallsData([]);
          }
        } else {
          setStallsData([]);
        }
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    loadMapData();
  }, [selectedMarketId]); // Reload when market changes

  // Handle Market Selection from Map
  const handleMarketSelect = (marketId: number) => {
    setSelectedMarketId(marketId);
    setViewMode('mercato');
    setMapRefreshKey(prev => prev + 1);
  };

  // Handle Back to Italy View
  const handleBackToItaly = () => {
    setViewMode('italia');
    setSelectedMarketId(null);
    setSelectedHubLocation(null);
    setStallsData([]);
    setMapRefreshKey(prev => prev + 1);
  };

  // ============ HUB MAP FUNCTIONS ============
  
  // Load all HUB locations
  useEffect(() => {
    if (mapType === 'hub') {
      loadAllHubs();
    }
  }, [mapType]);

  const loadAllHubs = async () => {
    setHubMapLoading(true);
    try {
      const response = await fetch(`${MIHUB_API_BASE_URL}/api/hub/locations`);
      const json = await response.json();
      console.log('[GestioneHubNegozi] Loaded HUBs:', json);
      if (json.success && Array.isArray(json.data)) {
        setAllHubLocations(json.data);
      }
    } catch (error) {
      console.error('[GestioneHubNegozi] Error loading HUBs:', error);
    } finally {
      setHubMapLoading(false);
    }
  };

  // Load single HUB details
  const loadHubDetails = async (hubId: number) => {
    setHubMapLoading(true);
    try {
      const response = await fetch(`${MIHUB_API_BASE_URL}/api/hub/locations/${hubId}`);
      const json = await response.json();
      console.log('[GestioneHubNegozi] HUB Details:', json);
      if (json.success && json.data) {
        setSelectedHubLocation(json.data);
        setViewMode('hub');
        setMapRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('[GestioneHubNegozi] Error loading HUB details:', error);
    } finally {
      setHubMapLoading(false);
    }
  };

  // Handle HUB click from map
  const handleHubClick = (hubId: number) => {
    loadHubDetails(hubId);
  };

  // Handle shop click from map
  const handleShopClick = (shop: any) => {
    console.log('[GestioneHubNegozi] Shop clicked:', shop);
  };

  // Handle map type change
  const handleMapTypeChange = (type: 'mercati' | 'hub') => {
    setMapType(type);
    setViewMode('italia');
    setSelectedMarketId(null);
    setSelectedHubLocation(null);
    setMapRefreshKey(prev => prev + 1);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-[#10b981] text-white',
      suspended: 'bg-[#f59e0b] text-white',
      inactive: 'bg-[#6b7280] text-white',
      maintenance: 'bg-[#f59e0b] text-white',
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  // Get current HUB data
  const currentHub = hubLocationsQuery.data?.find(loc => loc.id === selectedHubId);
  const shops = hubShopsQuery.data || [];
  const services = hubServicesQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Building2 className="h-8 w-8" />
          Gestione HUB, Negozi e Servizi
        </h2>
        <p className="text-white/80 mt-2">
          Sistema di gestione centralizzato per HUB MIO-HUB, negozi e servizi collegati
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#1a2332] border-[#14b8a6]/30">
          <TabsTrigger 
            value="anagrafica"
            className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Anagrafica HUB
          </TabsTrigger>
          <TabsTrigger 
            value="imprese"
            className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Imprese
          </TabsTrigger>
          <TabsTrigger 
            value="negozi"
            className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white"
          >
            <Store className="h-4 w-4 mr-2" />
            Negozi
          </TabsTrigger>
          <TabsTrigger 
            value="servizi"
            className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white"
          >
            <Wrench className="h-4 w-4 mr-2" />
            Servizi
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Anagrafica HUB */}
        <TabsContent value="anagrafica" className="space-y-4">
          {hubLocationsQuery.isLoading ? (
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardContent className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
              </CardContent>
            </Card>
          ) : hubLocationsQuery.isError ? (
            <Alert className="bg-[#ef4444]/10 border-[#ef4444]/30">
              <AlertCircle className="h-4 w-4 text-[#ef4444]" />
              <AlertDescription className="text-[#e8fbff]">
                Errore nel caricamento dei dati HUB. Riprova più tardi.
              </AlertDescription>
            </Alert>
          ) : currentHub ? (
            <Card className="bg-[#1a2332] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center justify-between">
                  <span>Dettagli HUB</span>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(currentHub.active === 1 ? 'active' : 'inactive')}>
                      {currentHub.active === 1 ? 'ATTIVO' : 'DISATTIVATO'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditLocation(currentHub)}
                      className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription className="text-[#e8fbff]/70">
                  Informazioni principali dell'HUB MIO-HUB
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e8fbff]/70">Nome HUB</label>
                    <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                      <p className="text-[#e8fbff]">{currentHub.name}</p>
                    </div>
                  </div>

                  {/* Città */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e8fbff]/70">Città</label>
                    <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                      <p className="text-[#e8fbff]">{currentHub.city}</p>
                    </div>
                  </div>

                  {/* Indirizzo */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-[#e8fbff]/70 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Indirizzo
                    </label>
                    <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                      <p className="text-[#e8fbff]">{currentHub.address}</p>
                    </div>
                  </div>

                  {/* Coordinate */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e8fbff]/70">Latitudine</label>
                    <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                      <p className="text-[#e8fbff]">{currentHub.lat}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#e8fbff]/70">Longitudine</label>
                    <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                      <p className="text-[#e8fbff]">{currentHub.lng}</p>
                    </div>
                  </div>

                  {/* Orari */}
                  {currentHub.openingHours && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-[#e8fbff]/70 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Orari Apertura
                      </label>
                      <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                        <p className="text-[#e8fbff]">{currentHub.openingHours}</p>
                      </div>
                    </div>
                  )}

                  {/* Descrizione */}
                  {currentHub.description && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-[#e8fbff]/70">Descrizione</label>
                      <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                        <p className="text-[#e8fbff]">{currentHub.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Statistiche */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#14b8a6]/20">
                  <div className="text-center p-4 bg-[#14b8a6]/10 rounded-lg border border-[#14b8a6]/30">
                    <div className="text-3xl font-bold text-[#14b8a6]">{shops.length}</div>
                    <div className="text-sm text-[#e8fbff]/70 mt-1">Negozi Attivi</div>
                  </div>
                  <div className="text-center p-4 bg-[#8b5cf6]/10 rounded-lg border border-[#8b5cf6]/30">
                    <div className="text-3xl font-bold text-[#8b5cf6]">{services.length}</div>
                    <div className="text-sm text-[#e8fbff]/70 mt-1">Servizi Disponibili</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Dialog open={isLocationDialogOpen} onOpenChange={(open) => {
                    setIsLocationDialogOpen(open);
                    if (!open) {
                      setEditingLocation(null);
                      resetLocationForm();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-[#14b8a6] hover:bg-[#0d9488] text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Nuovo HUB
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1a2332] border-[#14b8a6]/30 text-[#e8fbff] max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-[#14b8a6]">
                          {editingLocation ? 'Modifica HUB' : 'Crea Nuovo HUB'}
                        </DialogTitle>
                        <DialogDescription className="text-[#e8fbff]/70">
                          {editingLocation ? 'Modifica i dati dell\'HUB esistente' : 'Inserisci i dati del nuovo HUB MIO-HUB'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Nome HUB *</Label>
                            <Input
                              id="name"
                              value={locationForm.name}
                              onChange={(e) => setLocationForm({...locationForm, name: e.target.value})}
                              className="bg-[#0b1220] border-[#14b8a6]/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city">Città *</Label>
                            <Input
                              id="city"
                              value={locationForm.city}
                              onChange={(e) => setLocationForm({...locationForm, city: e.target.value})}
                              className="bg-[#0b1220] border-[#14b8a6]/20"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address">Indirizzo *</Label>
                          <Input
                            id="address"
                            value={locationForm.address}
                            onChange={(e) => setLocationForm({...locationForm, address: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="lat">Latitudine *</Label>
                            <Input
                              id="lat"
                              value={locationForm.lat}
                              onChange={(e) => setLocationForm({...locationForm, lat: e.target.value})}
                              placeholder="42.760000"
                              className="bg-[#0b1220] border-[#14b8a6]/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="lng">Longitudine *</Label>
                            <Input
                              id="lng"
                              value={locationForm.lng}
                              onChange={(e) => setLocationForm({...locationForm, lng: e.target.value})}
                              placeholder="11.250000"
                              className="bg-[#0b1220] border-[#14b8a6]/20"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="openingHours">Orari Apertura</Label>
                          <Input
                            id="openingHours"
                            value={locationForm.openingHours}
                            onChange={(e) => setLocationForm({...locationForm, openingHours: e.target.value})}
                            placeholder="Lun-Ven: 8:00-20:00, Sab: 9:00-13:00"
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Descrizione</Label>
                          <Textarea
                            id="description"
                            value={locationForm.description}
                            onChange={(e) => setLocationForm({...locationForm, description: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="photoUrl">URL Foto</Label>
                          <Input
                            id="photoUrl"
                            value={locationForm.photoUrl}
                            onChange={(e) => setLocationForm({...locationForm, photoUrl: e.target.value})}
                            placeholder="https://..."
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsLocationDialogOpen(false);
                            setEditingLocation(null);
                            resetLocationForm();
                          }}
                          className="border-[#14b8a6]/30 text-[#e8fbff]"
                        >
                          Annulla
                        </Button>
                        <Button
                          onClick={handleSaveLocation}
                          disabled={
                            (editingLocation ? updateLocationMutation.isPending : createLocationMutation.isPending) ||
                            !locationForm.name ||
                            !locationForm.address ||
                            !locationForm.city ||
                            !locationForm.lat ||
                            !locationForm.lng
                          }
                          className="bg-[#14b8a6] hover:bg-[#0d9488] text-white"
                        >
                          {(editingLocation ? updateLocationMutation.isPending : createLocationMutation.isPending) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          {editingLocation ? 'Salva Modifiche' : 'Crea HUB'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    onClick={() => setDeleteLocationId(currentHub.id)}
                    className="w-full border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Disattiva HUB
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert className="bg-[#f59e0b]/10 border-[#f59e0b]/30">
              <AlertCircle className="h-4 w-4 text-[#f59e0b]" />
              <AlertDescription className="text-[#e8fbff]">
                Nessun HUB trovato. Crea il primo HUB per iniziare.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Tab 2: Imprese */}
        <TabsContent value="imprese" className="space-y-4">
          <MarketCompaniesTab 
            marketId={currentHub?.market_id || 1}
            marketName={currentHub?.name || 'HUB'}
            municipality={currentHub?.city || 'Grosseto'}
          />
        </TabsContent>

        {/* Tab 3: Negozi */}
        <TabsContent value="negozi" className="space-y-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#e8fbff]">Negozi e Attività</CardTitle>
                  <CardDescription className="text-[#e8fbff]/70">
                    Lista completa negozi all'interno dell'HUB
                  </CardDescription>
                </div>
                <Dialog open={isShopDialogOpen} onOpenChange={setIsShopDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#14b8a6] hover:bg-[#0d9488] text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Negozio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a2332] border-[#14b8a6]/30 text-[#e8fbff] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-[#14b8a6]">Aggiungi Nuovo Negozio</DialogTitle>
                      <DialogDescription className="text-[#e8fbff]/70">
                        Inserisci i dati del nuovo negozio
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="shop-name">Nome Negozio *</Label>
                          <Input
                            id="shop-name"
                            value={shopForm.name}
                            onChange={(e) => setShopForm({...shopForm, name: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shop-category">Categoria</Label>
                          <Input
                            id="shop-category"
                            value={shopForm.category}
                            onChange={(e) => setShopForm({...shopForm, category: e.target.value})}
                            placeholder="Alimentari, Artigianato, etc."
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="shop-businessName">Ragione Sociale</Label>
                          <Input
                            id="shop-businessName"
                            value={shopForm.businessName}
                            onChange={(e) => setShopForm({...shopForm, businessName: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shop-vatNumber">Partita IVA</Label>
                          <Input
                            id="shop-vatNumber"
                            value={shopForm.vatNumber}
                            onChange={(e) => setShopForm({...shopForm, vatNumber: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="shop-phone">Telefono</Label>
                          <Input
                            id="shop-phone"
                            value={shopForm.phone}
                            onChange={(e) => setShopForm({...shopForm, phone: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shop-email">Email</Label>
                          <Input
                            id="shop-email"
                            type="email"
                            value={shopForm.email}
                            onChange={(e) => setShopForm({...shopForm, email: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shop-description">Descrizione</Label>
                        <Textarea
                          id="shop-description"
                          value={shopForm.description}
                          onChange={(e) => setShopForm({...shopForm, description: e.target.value})}
                          className="bg-[#0b1220] border-[#14b8a6]/20"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsShopDialogOpen(false)}
                        className="border-[#14b8a6]/30 text-[#e8fbff]"
                      >
                        Annulla
                      </Button>
                      <Button
                        onClick={handleSubmitShop}
                        disabled={(editingShop ? updateShopMutation.isPending : createShopMutation.isPending) || !shopForm.name}
                        className="bg-[#14b8a6] hover:bg-[#0d9488] text-white"
                      >
                        {(editingShop ? updateShopMutation.isPending : createShopMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editingShop ? 'Salva Modifiche' : 'Aggiungi Negozio'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {hubShopsQuery.isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
                </div>
              ) : hubShopsQuery.isError ? (
                <Alert className="bg-[#ef4444]/10 border-[#ef4444]/30">
                  <AlertCircle className="h-4 w-4 text-[#ef4444]" />
                  <AlertDescription className="text-[#e8fbff]">
                    Errore nel caricamento dei negozi. Riprova più tardi.
                  </AlertDescription>
                </Alert>
              ) : shops.length === 0 ? (
                <Alert className="bg-[#f59e0b]/10 border-[#f59e0b]/30">
                  <AlertCircle className="h-4 w-4 text-[#f59e0b]" />
                  <AlertDescription className="text-[#e8fbff]">
                    Nessun negozio trovato. Aggiungi il primo negozio per iniziare.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-lg border border-[#14b8a6]/20 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#0b1220] border-[#14b8a6]/20 hover:bg-[#0b1220]">
                        <TableHead className="text-[#e8fbff]">Nome</TableHead>
                        <TableHead className="text-[#e8fbff]">Categoria</TableHead>
                        <TableHead className="text-[#e8fbff]">Ragione Sociale</TableHead>
                        <TableHead className="text-[#e8fbff]">Contatti</TableHead>
                        <TableHead className="text-[#e8fbff]">Stato</TableHead>
                        <TableHead className="text-[#e8fbff] text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shops.map((shop) => (
                        <TableRow 
                          key={shop.id}
                          className="border-[#14b8a6]/20 hover:bg-[#14b8a6]/5"
                        >
                          <TableCell className="font-medium text-[#e8fbff]">
                            {shop.name}
                          </TableCell>
                          <TableCell className="text-[#e8fbff]/70">
                            {shop.category && (
                              <Badge variant="outline" className="border-[#14b8a6]/30 text-[#14b8a6]">
                                {shop.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[#e8fbff]/70">{shop.businessName || 'N/D'}</TableCell>
                          <TableCell className="text-[#e8fbff]/70">
                            <div className="space-y-1">
                              {shop.phone && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Phone className="h-3 w-3" />
                                  {shop.phone}
                                </div>
                              )}
                              {shop.email && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Mail className="h-3 w-3" />
                                  {shop.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(shop.status)}>
                              {shop.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                                title="Modifica negozio"
                                onClick={() => {
                                  setEditingShop(shop);
                                  setShopForm({
                                    name: shop.name || '',
                                    category: shop.category || '',
                                    certifications: shop.certifications || '',
                                    ownerId: shop.ownerId || undefined,
                                    businessName: shop.businessName || '',
                                    vatNumber: shop.vatNumber || '',
                                    phone: shop.phone || '',
                                    email: shop.email || '',
                                    lat: shop.lat || '',
                                    lng: shop.lng || '',
                                    areaMq: shop.areaMq || undefined,
                                    description: shop.description || '',
                                    photoUrl: shop.photoUrl || '',
                                  });
                                  setIsShopDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                                title="Elimina negozio"
                                onClick={() => setDeleteShopId(shop.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Servizi */}
        <TabsContent value="servizi" className="space-y-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#e8fbff]">Servizi Collegati</CardTitle>
                  <CardDescription className="text-[#e8fbff]/70">
                    Servizi disponibili all'interno dell'HUB
                  </CardDescription>
                </div>
                <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#14b8a6] hover:bg-[#0d9488] text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Servizio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#1a2332] border-[#14b8a6]/30 text-[#e8fbff] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-[#14b8a6]">Aggiungi Nuovo Servizio</DialogTitle>
                      <DialogDescription className="text-[#e8fbff]/70">
                        Inserisci i dati del nuovo servizio
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="service-name">Nome Servizio *</Label>
                          <Input
                            id="service-name"
                            value={serviceForm.name}
                            onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="service-type">Tipo *</Label>
                          <Input
                            id="service-type"
                            value={serviceForm.type}
                            onChange={(e) => setServiceForm({...serviceForm, type: e.target.value})}
                            placeholder="parking, bike_sharing, locker, etc."
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="service-description">Descrizione</Label>
                        <Textarea
                          id="service-description"
                          value={serviceForm.description}
                          onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                          className="bg-[#0b1220] border-[#14b8a6]/20"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="service-capacity">Capacità</Label>
                          <Input
                            id="service-capacity"
                            type="number"
                            value={serviceForm.capacity || ''}
                            onChange={(e) => setServiceForm({...serviceForm, capacity: e.target.value ? parseInt(e.target.value) : undefined})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="service-available">Disponibili</Label>
                          <Input
                            id="service-available"
                            type="number"
                            value={serviceForm.available || ''}
                            onChange={(e) => setServiceForm({...serviceForm, available: e.target.value ? parseInt(e.target.value) : undefined})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="service-price">Prezzo (cents)</Label>
                          <Input
                            id="service-price"
                            type="number"
                            value={serviceForm.price || ''}
                            onChange={(e) => setServiceForm({...serviceForm, price: e.target.value ? parseInt(e.target.value) : undefined})}
                            className="bg-[#0b1220] border-[#14b8a6]/20"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsServiceDialogOpen(false)}
                        className="border-[#14b8a6]/30 text-[#e8fbff]"
                      >
                        Annulla
                      </Button>
                      <Button
                        onClick={handleSubmitService}
                        disabled={(editingService ? updateServiceMutation.isPending : createServiceMutation.isPending) || !serviceForm.name || !serviceForm.type}
                        className="bg-[#14b8a6] hover:bg-[#0d9488] text-white"
                      >
                        {(editingService ? updateServiceMutation.isPending : createServiceMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {editingService ? 'Salva Modifiche' : 'Aggiungi Servizio'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {hubServicesQuery.isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
                </div>
              ) : hubServicesQuery.isError ? (
                <Alert className="bg-[#ef4444]/10 border-[#ef4444]/30">
                  <AlertCircle className="h-4 w-4 text-[#ef4444]" />
                  <AlertDescription className="text-[#e8fbff]">
                    Errore nel caricamento dei servizi. Riprova più tardi.
                  </AlertDescription>
                </Alert>
              ) : services.length === 0 ? (
                <Alert className="bg-[#f59e0b]/10 border-[#f59e0b]/30">
                  <AlertCircle className="h-4 w-4 text-[#f59e0b]" />
                  <AlertDescription className="text-[#e8fbff]">
                    Nessun servizio trovato. Aggiungi il primo servizio per iniziare.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-lg border border-[#14b8a6]/20 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#0b1220] border-[#14b8a6]/20 hover:bg-[#0b1220]">
                        <TableHead className="text-[#e8fbff]">Nome Servizio</TableHead>
                        <TableHead className="text-[#e8fbff]">Tipo</TableHead>
                        <TableHead className="text-[#e8fbff]">Descrizione</TableHead>
                        <TableHead className="text-[#e8fbff]">Capacità</TableHead>
                        <TableHead className="text-[#e8fbff]">Stato</TableHead>
                        <TableHead className="text-[#e8fbff] text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow 
                          key={service.id}
                          className="border-[#14b8a6]/20 hover:bg-[#14b8a6]/5"
                        >
                          <TableCell className="font-medium text-[#e8fbff]">
                            {service.name}
                          </TableCell>
                          <TableCell className="text-[#e8fbff]/70">
                            <Badge variant="outline" className="border-[#8b5cf6]/30 text-[#8b5cf6]">
                              {service.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#e8fbff]/70 text-sm">
                            {service.description || 'N/D'}
                          </TableCell>
                          <TableCell className="text-[#e8fbff]/70">
                            {service.capacity ? `${service.available || 0}/${service.capacity}` : 'N/D'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(service.status)}>
                              {service.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                                title="Modifica servizio"
                                onClick={() => {
                                  setEditingService(service);
                                  setServiceForm({
                                    name: service.name || '',
                                    type: service.type || '',
                                    description: service.description || '',
                                    capacity: service.capacity || undefined,
                                    available: service.available || undefined,
                                    price: service.price || undefined,
                                    lat: service.lat || '',
                                    lng: service.lng || '',
                                    metadata: service.metadata || '',
                                  });
                                  setIsServiceDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                                title="Elimina servizio"
                                onClick={() => setDeleteServiceId(service.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mappa HUB e Negozi - UNIFIED MAP COMPONENT */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              {/* SELETTORE TIPO MAPPA */}
              <div className="flex bg-[#0b1220] rounded-lg p-1 border border-[#14b8a6]/30">
                <button
                  onClick={() => handleMapTypeChange('mercati')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mapType === 'mercati'
                      ? 'bg-[#ef4444] text-white shadow-lg'
                      : 'text-[#e8fbff]/70 hover:text-white hover:bg-[#1a2332]'
                  }`}
                >
                  🏪 Mercati
                </button>
                <button
                  onClick={() => handleMapTypeChange('hub')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    mapType === 'hub'
                      ? 'bg-[#9C27B0] text-white shadow-lg'
                      : 'text-[#e8fbff]/70 hover:text-white hover:bg-[#1a2332]'
                  }`}
                >
                  🏢 HUB
                </button>
              </div>
              
              <div>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {mapType === 'mercati' 
                    ? (viewMode === 'italia' ? 'Pianta Mercati - Vista Italia' : `Pianta Mercato ${selectedMarketId === 1 ? 'Grosseto' : 'Modena'} - GIS Interattiva`)
                    : (viewMode === 'italia' ? 'Mappa HUB - Vista Italia' : `HUB: ${selectedHubLocation?.name || ''} - Negozi`)
                  }
                </CardTitle>
                <CardDescription className="text-[#e8fbff]/70">
                  {mapType === 'mercati'
                    ? (viewMode === 'italia' 
                        ? 'Seleziona un mercato dalla mappa per visualizzare i dettagli' 
                        : 'Visualizzazione geografica dei posteggi e delle concessioni')
                    : (viewMode === 'italia'
                        ? `${allHubLocations.length} HUB disponibili - Clicca per vedere i negozi`
                        : `${selectedHubLocation?.shops?.length || 0} negozi in questo HUB`)
                  }
                </CardDescription>
              </div>
            </div>
            
            {/* Pulsante Torna alla Vista Italia */}
            {(viewMode === 'mercato' || viewMode === 'hub') && (
              <Button 
                variant="outline" 
                className={`border-${mapType === 'hub' ? '[#9C27B0]' : '[#14b8a6]'}/50 text-${mapType === 'hub' ? '[#9C27B0]' : '[#14b8a6]'} hover:bg-${mapType === 'hub' ? '[#9C27B0]' : '[#14b8a6]'}/10`}
                onClick={handleBackToItaly}
              >
                🌍 Torna alla Vista Italia
              </Button>
            )}
          </div>

          {/* BARRA DI RICERCA INTEGRATA */}
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Input
              type="text"
              placeholder="Cerca mercato (es. Modena, Grosseto)..."
              className="pl-10 bg-[#0b1220] border-[#14b8a6]/30 text-white placeholder:text-gray-500 focus:ring-[#14b8a6]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.toLowerCase();
                  if (val.includes('modena') || val.includes('novi sad')) {
                    handleMarketSelect(2); // ID Modena
                  } else if (val.includes('grosseto')) {
                    handleMarketSelect(1); // ID Grosseto
                  } else {
                    // TODO: Implementare ricerca posteggio
                    alert('Mercato non trovato. Prova "Modena" o "Grosseto".');
                  }
                }
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] rounded-lg overflow-hidden relative">
            {/* MAPPA MERCATI */}
            {mapType === 'mercati' && mapData && (
              <MarketMapComponent
                refreshKey={mapRefreshKey}
                mapData={mapData}
                stallsData={stallsData}
                center={viewMode === 'mercato' ? undefined : [42.5, 12.5]} 
                zoom={viewMode === 'mercato' ? 18 : 6}
                showItalyView={viewMode === 'italia'}
                onMarketClick={handleMarketSelect}
                height="100%"
              />
            )}
            
            {/* MAPPA HUB */}
            {mapType === 'hub' && (
              <HubMapComponent
                refreshKey={mapRefreshKey}
                hubData={selectedHubLocation}
                allHubs={allHubLocations}
                showItalyView={viewMode === 'italia'}
                onHubClick={handleHubClick}
                onShopClick={handleShopClick}
                zoom={viewMode === 'hub' ? 18 : 6}
                height="100%"
              />
            )}
            
            {/* Overlay caricamento Mercati */}
            {mapType === 'mercati' && viewMode === 'mercato' && stallsData.length === 0 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                <div className="bg-[#1e293b] p-4 rounded-lg shadow-xl flex items-center gap-3 border border-[#14b8a6]/30">
                  <Loader2 className="h-6 w-6 animate-spin text-[#14b8a6]" />
                  <span className="text-white font-medium">Caricamento mercato...</span>
                </div>
              </div>
            )}
            
            {/* Overlay caricamento HUB */}
            {mapType === 'hub' && hubMapLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                <div className="bg-[#1e293b] p-4 rounded-lg shadow-xl flex items-center gap-3 border border-[#9C27B0]/30">
                  <Loader2 className="h-6 w-6 animate-spin text-[#9C27B0]" />
                  <span className="text-white font-medium">Caricamento HUB...</span>
                </div>
              </div>
            )}
            
            {/* Loading iniziale */}
            {mapType === 'mercati' && !mapData && (
              <div className="h-full flex items-center justify-center bg-[#0b1220]">
                <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteLocationId !== null} onOpenChange={(open) => !open && setDeleteLocationId(null)}>
        <AlertDialogContent className="bg-[#1a2332] border-[#ef4444]/30 text-[#e8fbff]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Conferma Disattivazione HUB
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#e8fbff]/70">
              Sei sicuro di voler disattivare questo HUB? <strong>Non verrà cancellato dal database</strong> ma solo disattivato (active=0).
              Potrai riattivarlo in seguito se necessario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#14b8a6]/30 text-[#e8fbff]">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocation}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              {deleteLocationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disattiva HUB
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Shop Confirmation Dialog */}
      <AlertDialog open={deleteShopId !== null} onOpenChange={(open) => !open && setDeleteShopId(null)}>
        <AlertDialogContent className="bg-[#1a2332] border-[#ef4444]/30 text-[#e8fbff]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Conferma Disattivazione Negozio
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#e8fbff]/70">
              Sei sicuro di voler disattivare questo negozio? Lo stato verrà impostato su <strong>inactive</strong>.
              Potrai riattivarlo in seguito modificandone lo stato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#14b8a6]/30 text-[#e8fbff]">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShop}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              {deleteShopMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disattiva Negozio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Service Confirmation Dialog */}
      <AlertDialog open={deleteServiceId !== null} onOpenChange={(open) => !open && setDeleteServiceId(null)}>
        <AlertDialogContent className="bg-[#1a2332] border-[#ef4444]/30 text-[#e8fbff]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#ef4444] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Conferma Disattivazione Servizio
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#e8fbff]/70">
              Sei sicuro di voler disattivare questo servizio? Lo stato verrà impostato su <strong>inactive</strong>.
              Potrai riattivarlo in seguito modificandone lo stato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#14b8a6]/30 text-[#e8fbff]">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              {deleteServiceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Disattiva Servizio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
