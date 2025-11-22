import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Building2, Store, Wrench, MapPin, Phone, Mail, Clock, Plus, Edit, Trash2, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { MarketMapComponent } from './MarketMapComponent';
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
  const [mapData, setMapData] = useState<any>(null);
  const [stallsData, setStallsData] = useState<any[]>([]);
  const [selectedHubId, setSelectedHubId] = useState(1); // Default HUB Grosseto
  
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

  const createServiceMutation = trpc.dmsHub.hub.services.create.useMutation({
    onSuccess: () => {
      hubServicesQuery.refetch();
      setIsServiceDialogOpen(false);
      resetServiceForm();
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

  // Handle create shop
  const handleCreateShop = () => {
    createShopMutation.mutate({
      hubId: selectedHubId,
      ...shopForm
    });
  };

  // Handle create service
  const handleCreateService = () => {
    createServiceMutation.mutate({
      hubId: selectedHubId,
      ...serviceForm
    });
  };

  // Load map data
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const selectedMarketId = 1; // HUB Grosseto
        
        const [mapRes, stallsRes] = await Promise.all([
          fetch('https://orchestratore.mio-hub.me/api/gis/market-map'),
          fetch(`https://orchestratore.mio-hub.me/api/markets/${selectedMarketId}/stalls`)
        ]);

        const mapJson = await mapRes.json();
        const stallsJson = await stallsRes.json();

        if (mapJson.success && mapJson.data) {
          setMapData(mapJson.data);
        }

        if (stallsJson.success && Array.isArray(stallsJson.data)) {
          setStallsData(stallsJson.data);
        }
      } catch (error) {
        console.error('Error loading map data:', error);
      }
    };

    loadMapData();
  }, []);

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
        <TabsList className="grid w-full grid-cols-3 bg-[#1a2332] border-[#14b8a6]/30">
          <TabsTrigger 
            value="anagrafica"
            className="data-[state=active]:bg-[#14b8a6] data-[state=active]:text-white"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Anagrafica HUB
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

        {/* Tab 2: Negozi */}
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
                        onClick={handleCreateShop}
                        disabled={createShopMutation.isPending || !shopForm.name}
                        className="bg-[#14b8a6] hover:bg-[#0d9488] text-white"
                      >
                        {createShopMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Aggiungi Negozio
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
                                title="Modifica (TODO: implementare update)"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                                title="Elimina (TODO: implementare delete)"
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
                        onClick={handleCreateService}
                        disabled={createServiceMutation.isPending || !serviceForm.name || !serviceForm.type}
                        className="bg-[#14b8a6] hover:bg-[#0d9488] text-white"
                      >
                        {createServiceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Aggiungi Servizio
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
                                title="Modifica (TODO: implementare update)"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                                title="Elimina (TODO: implementare delete)"
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

      {/* Mappa HUB e Negozi */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mappa HUB Grosseto (Dati Reali)
          </CardTitle>
          <CardDescription className="text-[#e8fbff]/70">
            Visualizzazione geografica dell'HUB e dei negozi/servizi collegati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mapData && stallsData.length > 0 ? (
            <div className="h-[600px] rounded-lg overflow-hidden">
              <MarketMapComponent
                mapData={mapData}
                stallsData={stallsData}
                zoom={19}
              />
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center bg-[#0b1220] rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
            </div>
          )}
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
    </div>
  );
}
