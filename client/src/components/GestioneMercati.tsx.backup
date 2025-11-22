import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Users, 
  Building2,
  Loader2,
  FileText,
  Edit,
  Save,
  X,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface Market {
  id: number;
  code: string;
  name: string;
  municipality: string;
  days: string;
  total_stalls: number;
  status: string;
  gis_market_id: string;
  latitude: string;
  longitude: string;
}

interface Stall {
  id: number;
  market_id: number;
  number: string;
  gis_slot_id: string;
  width: string;
  depth: string;
  type: string;
  status: string;
  orientation: string;
  notes: string | null;
  concession_id: number | null;
  vendor_id: number | null;
  concession_type: string | null;
  vendor_business_name: string | null;
  vendor_contact_name: string | null;
}

interface Vendor {
  id: number;
  code: string;
  business_name: string;
  vat_number: string;
  contact_name: string;
  phone: string;
  email: string;
  status: string;
}

interface Concession {
  id: number;
  market_id: number;
  stall_id: number;
  vendor_id: number;
  type: string;
  valid_from: string;
  valid_to: string | null;
  market_name: string;
  stall_number: string;
  vendor_business_name: string;
  vendor_code: string;
}

/**
 * Componente Gestione Mercati
 * Sistema completo per gestione mercati, posteggi e concessioni
 */
export default function GestioneMercati() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets`);
      const data = await response.json();
      if (data.success) {
        setMarkets(data.data);
        if (data.data.length > 0 && !selectedMarket) {
          setSelectedMarket(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
      toast.error('Errore nel caricamento dei mercati');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
        </CardContent>
      </Card>
    );
  }

  if (markets.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-[#14b8a6] mb-4" />
          <p className="text-[#e8fbff]/70 mb-4">Nessun mercato configurato</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista Mercati */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {markets.map((market) => (
          <Card 
            key={market.id} 
            className={`cursor-pointer transition-all bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 hover:border-[#14b8a6] ${
              selectedMarket?.id === market.id ? 'border-[#14b8a6] ring-2 ring-[#14b8a6]/50' : ''
            }`}
            onClick={() => setSelectedMarket(market)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#e8fbff]">
                <Building2 className="h-5 w-5 text-[#14b8a6]" />
                {market.name}
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/70">{market.municipality}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Codice</span>
                  <Badge variant="secondary" className="bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30">
                    {market.code}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Posteggi Totali</span>
                  <Badge variant="secondary" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                    {market.total_stalls}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Giorni</span>
                  <span className="text-xs text-[#e8fbff]">{market.days}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#e8fbff]/70">Stato</span>
                  <Badge 
                    variant="default" 
                    className={market.status === 'active' 
                      ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30" 
                      : "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"}
                  >
                    {market.status === 'active' ? "Attivo" : "Inattivo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dettaglio Mercato Selezionato */}
      {selectedMarket && (
        <MarketDetail market={selectedMarket} />
      )}
    </div>
  );
}

/**
 * Dettaglio mercato con tab
 */
function MarketDetail({ market }: { market: Market }) {
  const [activeTab, setActiveTab] = useState("anagrafica");

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
      <CardHeader>
        <CardTitle className="text-[#e8fbff]">Dettaglio: {market.name}</CardTitle>
        <CardDescription className="text-[#e8fbff]/70">Gestisci anagrafica, posteggi e concessioni</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-[#0b1220]/50">
            <TabsTrigger 
              value="anagrafica"
              className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            >
              <FileText className="mr-2 h-4 w-4" />
              Anagrafica
            </TabsTrigger>
            <TabsTrigger 
              value="posteggi"
              className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Posteggi
            </TabsTrigger>
            <TabsTrigger 
              value="concessioni"
              className="data-[state=active]:bg-[#14b8a6]/20 data-[state=active]:text-[#14b8a6]"
            >
              <Users className="mr-2 h-4 w-4" />
              Imprese / Concessioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anagrafica" className="space-y-4">
            <AnagraficaTab market={market} />
          </TabsContent>

          <TabsContent value="posteggi" className="space-y-4">
            <PosteggiTab marketId={market.id} />
          </TabsContent>

          <TabsContent value="concessioni" className="space-y-4">
            <ConcessioniTab marketId={market.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Tab Anagrafica Mercato
 */
function AnagraficaTab({ market }: { market: Market }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Codice</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.code}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Nome</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.name}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Comune</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.municipality}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Giorni Mercato</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.days}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Posteggi Totali</label>
          <p className="text-lg font-semibold text-[#14b8a6] mt-1">{market.total_stalls}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Stato</label>
          <Badge 
            variant="default" 
            className={`mt-1 ${market.status === 'active' 
              ? "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30" 
              : "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30"}`}
          >
            {market.status === 'active' ? "Attivo" : "Inattivo"}
          </Badge>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Latitudine</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.latitude}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20">
          <label className="text-sm font-medium text-[#e8fbff]/70">Longitudine</label>
          <p className="text-lg font-semibold text-[#e8fbff] mt-1">{market.longitude}</p>
        </div>
        <div className="bg-[#0b1220]/50 p-4 rounded-lg border border-[#14b8a6]/20 col-span-2">
          <label className="text-sm font-medium text-[#e8fbff]/70">GIS Market ID</label>
          <p className="text-lg font-semibold text-[#8b5cf6] mt-1">{market.gis_market_id}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Posteggi con tabella modificabile
 */
function PosteggiTab({ marketId }: { marketId: number }) {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Stall>>({});

  useEffect(() => {
    fetchStalls();
  }, [marketId]);

  const fetchStalls = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/${marketId}/stalls`);
      const data = await response.json();
      if (data.success) {
        setStalls(data.data);
      }
    } catch (error) {
      console.error('Error fetching stalls:', error);
      toast.error('Errore nel caricamento dei posteggi');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (stall: Stall) => {
    setEditingId(stall.id);
    setEditData({
      type: stall.type,
      status: stall.status,
      notes: stall.notes
    });
  };

  const handleSave = async (stallId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stalls/${stallId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Posteggio aggiornato con successo');
        fetchStalls();
        setEditingId(null);
        setEditData({});
      } else {
        toast.error('Errore nell\'aggiornamento');
      }
    } catch (error) {
      console.error('Error updating stall:', error);
      toast.error('Errore nell\'aggiornamento del posteggio');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupato':
        return 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30';
      case 'libero':
        return 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30';
      case 'riservato':
        return 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30';
      default:
        return 'bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  const occupiedCount = stalls.filter(s => s.status === 'occupato').length;
  const freeCount = stalls.filter(s => s.status === 'libero').length;
  const reservedCount = stalls.filter(s => s.status === 'riservato').length;

  return (
    <div className="space-y-4">
      {/* Statistiche Posteggi */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 p-4 rounded-lg">
          <div className="text-sm text-[#ef4444] mb-1">Occupati</div>
          <div className="text-3xl font-bold text-[#ef4444]">{occupiedCount}</div>
        </div>
        <div className="bg-[#10b981]/10 border border-[#10b981]/30 p-4 rounded-lg">
          <div className="text-sm text-[#10b981] mb-1">Liberi</div>
          <div className="text-3xl font-bold text-[#10b981]">{freeCount}</div>
        </div>
        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 p-4 rounded-lg">
          <div className="text-sm text-[#f59e0b] mb-1">Riservati</div>
          <div className="text-3xl font-bold text-[#f59e0b]">{reservedCount}</div>
        </div>
      </div>

      <div className="border border-[#14b8a6]/20 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#0b1220]/50 border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
              <TableHead className="text-[#e8fbff]/70">Numero</TableHead>
              <TableHead className="text-[#e8fbff]/70">GIS Slot ID</TableHead>
              <TableHead className="text-[#e8fbff]/70">Dimensioni</TableHead>
              <TableHead className="text-[#e8fbff]/70">Tipo</TableHead>
              <TableHead className="text-[#e8fbff]/70">Stato</TableHead>
              <TableHead className="text-[#e8fbff]/70">Intestatario</TableHead>
              <TableHead className="text-right text-[#e8fbff]/70">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stalls.map((stall) => (
              <TableRow 
                key={stall.id}
                className="cursor-pointer hover:bg-[#14b8a6]/5 border-[#14b8a6]/10"
              >
                <TableCell className="font-medium text-[#e8fbff]">{stall.number}</TableCell>
                <TableCell className="text-xs text-[#e8fbff]/70">{stall.gis_slot_id}</TableCell>
                <TableCell className="text-sm text-[#e8fbff]">{stall.width}m × {stall.depth}m</TableCell>
                <TableCell>
                  {editingId === stall.id ? (
                    <Select
                      value={editData.type}
                      onValueChange={(value) => setEditData({ ...editData, type: value })}
                    >
                      <SelectTrigger className="w-[120px] bg-[#0b1220] border-[#14b8a6]/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisso">Fisso</SelectItem>
                        <SelectItem value="spunta">Spunta</SelectItem>
                        <SelectItem value="libero">Libero</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                      {stall.type}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === stall.id ? (
                    <Select
                      value={editData.status}
                      onValueChange={(value) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger className="w-[120px] bg-[#0b1220] border-[#14b8a6]/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="libero">Libero</SelectItem>
                        <SelectItem value="occupato">Occupato</SelectItem>
                        <SelectItem value="riservato">Riservato</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="default" className={getStatusColor(stall.status)}>
                      {stall.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {stall.vendor_business_name ? (
                    <div>
                      <p className="font-medium text-[#e8fbff]">{stall.vendor_business_name}</p>
                      <p className="text-xs text-[#e8fbff]/70">{stall.vendor_contact_name}</p>
                    </div>
                  ) : (
                    <span className="text-[#e8fbff]/50">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === stall.id ? (
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleSave(stall.id)}
                        className="bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border-[#10b981]/30"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancel}
                        className="bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] border-[#ef4444]/30"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleEdit(stall)}
                      className="hover:bg-[#14b8a6]/20 text-[#14b8a6]"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Tab Concessioni (solo lettura per ora)
 */
function ConcessioniTab({ marketId }: { marketId: number }) {
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [marketId]);

  const fetchData = async () => {
    try {
      const [concessionsRes, vendorsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/concessions?market_id=${marketId}`),
        fetch(`${API_BASE_URL}/api/vendors`)
      ]);

      const concessionsData = await concessionsRes.json();
      const vendorsData = await vendorsRes.json();

      if (concessionsData.success) {
        setConcessions(concessionsData.data);
      }
      if (vendorsData.success) {
        setVendors(vendorsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#14b8a6]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sezione Imprese */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-[#e8fbff]">Imprese Registrate</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
              <CardHeader>
                <CardTitle className="text-base text-[#e8fbff]">{vendor.business_name}</CardTitle>
                <CardDescription className="text-[#e8fbff]/70">{vendor.code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">P.IVA</span>
                    <span className="font-medium text-[#e8fbff]">{vendor.vat_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Referente</span>
                    <span className="font-medium text-[#e8fbff]">{vendor.contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Telefono</span>
                    <span className="font-medium text-[#e8fbff]">{vendor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#e8fbff]/70">Stato</span>
                    <Badge 
                      variant="default" 
                      className={vendor.status === 'active' 
                        ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30' 
                        : 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30'}
                    >
                      {vendor.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sezione Concessioni */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-[#e8fbff]">Concessioni Attive</h3>
        <div className="border border-[#14b8a6]/20 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0b1220]/50 border-[#14b8a6]/20 hover:bg-[#0b1220]/50">
                <TableHead className="text-[#e8fbff]/70">Posteggio</TableHead>
                <TableHead className="text-[#e8fbff]/70">Impresa</TableHead>
                <TableHead className="text-[#e8fbff]/70">Tipo</TableHead>
                <TableHead className="text-[#e8fbff]/70">Valida Dal</TableHead>
                <TableHead className="text-[#e8fbff]/70">Valida Al</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concessions.map((concession) => (
                <TableRow key={concession.id} className="border-[#14b8a6]/10 hover:bg-[#14b8a6]/5">
                  <TableCell className="font-medium text-[#e8fbff]">{concession.stall_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#e8fbff]">{concession.vendor_business_name}</p>
                      <p className="text-xs text-[#e8fbff]/70">{concession.vendor_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                      {concession.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#e8fbff]">
                    {new Date(concession.valid_from).toLocaleDateString('it-IT')}
                  </TableCell>
                  <TableCell className="text-[#e8fbff]">
                    {concession.valid_to 
                      ? new Date(concession.valid_to).toLocaleDateString('it-IT')
                      : 'Indeterminato'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
