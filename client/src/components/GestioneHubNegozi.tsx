import React, { useState } from 'react';
import { Building2, Store, Wrench, MapPin, Phone, Mail, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock data per ora - in futuro verrà sostituito con chiamate API
const mockHubData = {
  id: 1,
  name: 'MIO-HUB Grosseto Centro',
  address: 'Via Roma 123, 58100 Grosseto',
  municipality: 'Grosseto',
  phone: '+39 0564 123456',
  email: 'info@mio-hub.grosseto.it',
  opening_hours: 'Lun-Ven: 8:00-20:00, Sab: 9:00-13:00',
  status: 'attivo',
  total_shops: 12,
  total_services: 8,
};

const mockShops = [
  {
    id: 1,
    name: 'Frutta e Verdura Bio',
    category: 'Alimentari',
    owner: 'Mario Rossi',
    phone: '+39 333 1234567',
    email: 'mario.rossi@example.com',
    opening_hours: 'Lun-Sab: 8:00-13:00, 16:00-19:30',
    status: 'attivo',
  },
  {
    id: 2,
    name: 'Panificio Artigianale',
    category: 'Alimentari',
    owner: 'Laura Bianchi',
    phone: '+39 333 2345678',
    email: 'laura.bianchi@example.com',
    opening_hours: 'Lun-Sab: 7:00-13:00',
    status: 'attivo',
  },
  {
    id: 3,
    name: 'Abbigliamento Sostenibile',
    category: 'Abbigliamento',
    owner: 'Giuseppe Verdi',
    phone: '+39 333 3456789',
    email: 'giuseppe.verdi@example.com',
    opening_hours: 'Lun-Sab: 9:00-13:00, 15:30-19:30',
    status: 'attivo',
  },
];

const mockServices = [
  {
    id: 1,
    name: 'Ritiro Pacchi',
    type: 'Logistica',
    provider: 'MIO-HUB',
    description: 'Servizio di ritiro e consegna pacchi',
    availability: 'Lun-Ven: 8:00-20:00',
    status: 'attivo',
  },
  {
    id: 2,
    name: 'Riparazione Biciclette',
    type: 'Mobilità',
    provider: 'Ciclo Service',
    description: 'Riparazione e manutenzione biciclette',
    availability: 'Mar-Sab: 9:00-13:00, 15:00-19:00',
    status: 'attivo',
  },
  {
    id: 3,
    name: 'Punto Informazioni',
    type: 'Servizi Generali',
    provider: 'MIO-HUB',
    description: 'Informazioni su servizi e attività dell\'HUB',
    availability: 'Lun-Sab: 8:00-20:00',
    status: 'attivo',
  },
];

export default function GestioneHubNegozi() {
  const [selectedTab, setSelectedTab] = useState('anagrafica');

  const getStatusBadge = (status: string) => {
    const colors = {
      attivo: 'bg-[#10b981] text-white',
      inattivo: 'bg-[#6b7280] text-white',
      manutenzione: 'bg-[#f59e0b] text-white',
    };
    return colors[status as keyof typeof colors] || colors.attivo;
  };

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
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center justify-between">
                <span>Dettagli HUB</span>
                <Badge className={getStatusBadge(mockHubData.status)}>
                  {mockHubData.status.toUpperCase()}
                </Badge>
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
                    <p className="text-[#e8fbff]">{mockHubData.name}</p>
                  </div>
                </div>

                {/* Comune */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#e8fbff]/70">Comune</label>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <p className="text-[#e8fbff]">{mockHubData.municipality}</p>
                  </div>
                </div>

                {/* Indirizzo */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-[#e8fbff]/70 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Indirizzo
                  </label>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <p className="text-[#e8fbff]">{mockHubData.address}</p>
                  </div>
                </div>

                {/* Telefono */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#e8fbff]/70 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefono
                  </label>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <p className="text-[#e8fbff]">{mockHubData.phone}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#e8fbff]/70 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <p className="text-[#e8fbff]">{mockHubData.email}</p>
                  </div>
                </div>

                {/* Orari */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-[#e8fbff]/70 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Orari Apertura
                  </label>
                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20">
                    <p className="text-[#e8fbff]">{mockHubData.opening_hours}</p>
                  </div>
                </div>
              </div>

              {/* Statistiche */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#14b8a6]/20">
                <div className="text-center p-4 bg-[#14b8a6]/10 rounded-lg border border-[#14b8a6]/30">
                  <div className="text-3xl font-bold text-[#14b8a6]">{mockHubData.total_shops}</div>
                  <div className="text-sm text-[#e8fbff]/70 mt-1">Negozi Attivi</div>
                </div>
                <div className="text-center p-4 bg-[#8b5cf6]/10 rounded-lg border border-[#8b5cf6]/30">
                  <div className="text-3xl font-bold text-[#8b5cf6]">{mockHubData.total_services}</div>
                  <div className="text-sm text-[#e8fbff]/70 mt-1">Servizi Disponibili</div>
                </div>
              </div>

              {/* Note Sviluppo Futuro */}
              <div className="mt-6 p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                <p className="text-sm text-[#e8fbff]/70">
                  <strong className="text-[#f59e0b]">Sviluppo Futuro:</strong> Questa sezione sarà collegata a API backend per gestione completa HUB (creazione, modifica, eliminazione). Attualmente utilizza dati mock per visualizzazione struttura.
                </p>
              </div>
            </CardContent>
          </Card>
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
                <Button className="bg-[#14b8a6] hover:bg-[#0d9488] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Negozio
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-[#14b8a6]/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#0b1220] border-[#14b8a6]/20 hover:bg-[#0b1220]">
                      <TableHead className="text-[#e8fbff]">Nome</TableHead>
                      <TableHead className="text-[#e8fbff]">Categoria</TableHead>
                      <TableHead className="text-[#e8fbff]">Titolare</TableHead>
                      <TableHead className="text-[#e8fbff]">Contatti</TableHead>
                      <TableHead className="text-[#e8fbff]">Orari</TableHead>
                      <TableHead className="text-[#e8fbff]">Stato</TableHead>
                      <TableHead className="text-[#e8fbff] text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockShops.map((shop) => (
                      <TableRow 
                        key={shop.id}
                        className="border-[#14b8a6]/20 hover:bg-[#14b8a6]/5"
                      >
                        <TableCell className="font-medium text-[#e8fbff]">
                          {shop.name}
                        </TableCell>
                        <TableCell className="text-[#e8fbff]/70">
                          <Badge variant="outline" className="border-[#14b8a6]/30 text-[#14b8a6]">
                            {shop.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#e8fbff]/70">{shop.owner}</TableCell>
                        <TableCell className="text-[#e8fbff]/70">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <Phone className="h-3 w-3" />
                              {shop.phone}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Mail className="h-3 w-3" />
                              {shop.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#e8fbff]/70 text-xs">
                          {shop.opening_hours}
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
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
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

              {/* Note Sviluppo Futuro */}
              <div className="mt-6 p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                <p className="text-sm text-[#e8fbff]/70">
                  <strong className="text-[#f59e0b]">Sviluppo Futuro:</strong> Questa sezione sarà collegata a API backend per gestione completa negozi (CRUD, filtri, ricerca, export). I pulsanti "Aggiungi", "Modifica" e "Elimina" saranno funzionanti.
                </p>
              </div>
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
                <Button className="bg-[#14b8a6] hover:bg-[#0d9488] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Servizio
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-[#14b8a6]/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#0b1220] border-[#14b8a6]/20 hover:bg-[#0b1220]">
                      <TableHead className="text-[#e8fbff]">Nome Servizio</TableHead>
                      <TableHead className="text-[#e8fbff]">Tipo</TableHead>
                      <TableHead className="text-[#e8fbff]">Fornitore</TableHead>
                      <TableHead className="text-[#e8fbff]">Descrizione</TableHead>
                      <TableHead className="text-[#e8fbff]">Disponibilità</TableHead>
                      <TableHead className="text-[#e8fbff]">Stato</TableHead>
                      <TableHead className="text-[#e8fbff] text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockServices.map((service) => (
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
                        <TableCell className="text-[#e8fbff]/70">{service.provider}</TableCell>
                        <TableCell className="text-[#e8fbff]/70 text-sm">
                          {service.description}
                        </TableCell>
                        <TableCell className="text-[#e8fbff]/70 text-xs">
                          {service.availability}
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
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
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

              {/* Note Sviluppo Futuro */}
              <div className="mt-6 p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg">
                <p className="text-sm text-[#e8fbff]/70">
                  <strong className="text-[#f59e0b]">Sviluppo Futuro:</strong> Questa sezione sarà collegata a API backend per gestione completa servizi (CRUD, prenotazioni, tariffe, statistiche utilizzo). Include integrazione con servizi esterni (logistica, mobilità, ecc.).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
