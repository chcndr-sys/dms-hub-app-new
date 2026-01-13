/**
 * ListaAutorizzazioniSuap.tsx
 * 
 * Lista delle autorizzazioni commercio su aree pubbliche per SSO SUAP.
 * Design coerente con ListaConcessioni.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Trash2, 
  Edit, 
  FileCheck,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface Autorizzazione {
  id: number;
  numero_autorizzazione: string;
  company_name: string;
  company_piva: string;
  company_cf: string;
  ente_rilascio: string;
  market_name: string;
  market_municipality: string;
  data_rilascio: string;
  data_scadenza: string;
  tipo: string;
  settore: string;
  stato: string;
  stall_number: string;
}

interface ListaAutorizzazioniSuapProps {
  onNuovaAutorizzazione: () => void;
  onViewAutorizzazione?: (id: number) => void;
  onEditAutorizzazione?: (id: number) => void;
}

export default function ListaAutorizzazioniSuap({ 
  onNuovaAutorizzazione, 
  onViewAutorizzazione,
  onEditAutorizzazione 
}: ListaAutorizzazioniSuapProps) {
  const [autorizzazioni, setAutorizzazioni] = useState<Autorizzazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStato, setFilterStato] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');

  // Carica autorizzazioni
  const fetchAutorizzazioni = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/autorizzazioni`);
      const json = await response.json();
      
      if (json.success && json.data) {
        setAutorizzazioni(json.data);
      }
    } catch (err) {
      console.error('Errore caricamento autorizzazioni:', err);
      toast.error('Errore nel caricamento delle autorizzazioni');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutorizzazioni();
  }, []);

  // Filtra autorizzazioni
  const filteredAutorizzazioni = autorizzazioni.filter(auth => {
    const matchesSearch = 
      auth.numero_autorizzazione?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auth.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auth.company_piva?.includes(searchQuery) ||
      auth.market_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStato = filterStato === 'all' || auth.stato === filterStato;
    const matchesTipo = filterTipo === 'all' || auth.tipo === filterTipo;
    
    return matchesSearch && matchesStato && matchesTipo;
  });

  // Formatta data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  // Badge stato
  const getStatoBadge = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'ATTIVA':
        return <Badge className="bg-green-600 text-white">Attiva</Badge>;
      case 'SCADUTA':
        return <Badge className="bg-red-600 text-white">Scaduta</Badge>;
      case 'SOSPESA':
        return <Badge className="bg-yellow-600 text-white">Sospesa</Badge>;
      case 'REVOCATA':
        return <Badge className="bg-gray-600 text-white">Revocata</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{stato || 'N/D'}</Badge>;
    }
  };

  // Badge tipo
  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'A':
        return <Badge className="bg-blue-600 text-white">Tipo A</Badge>;
      case 'B':
        return <Badge className="bg-purple-600 text-white">Tipo B</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{tipo || 'N/D'}</Badge>;
    }
  };

  // Elimina autorizzazione
  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa autorizzazione?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/autorizzazioni/${id}`, {
        method: 'DELETE'
      });
      const json = await response.json();
      
      if (json.success) {
        toast.success('Autorizzazione eliminata');
        fetchAutorizzazioni();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      toast.error('Errore eliminazione', { description: err.message });
    }
  };

  return (
    <Card className="bg-[#0a1628] border-[#1e293b]">
      <CardHeader className="border-b border-[#1e293b]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-[#e8fbff]">Lista Autorizzazioni</CardTitle>
            <Badge variant="outline" className="ml-2 text-gray-400">
              {filteredAutorizzazioni.length} risultati
            </Badge>
          </div>
          <Button 
            onClick={onNuovaAutorizzazione}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Autorizzazione
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {/* Filtri */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Cerca per numero, concessionario o mercato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
          </div>
          
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px] bg-[#020817] border-[#1e293b] text-[#e8fbff]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="A">Tipo A - Posteggio</SelectItem>
              <SelectItem value="B">Tipo B - Itinerante</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterStato} onValueChange={setFilterStato}>
            <SelectTrigger className="w-[150px] bg-[#020817] border-[#1e293b] text-[#e8fbff]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="ATTIVA">Attiva</SelectItem>
              <SelectItem value="SCADUTA">Scaduta</SelectItem>
              <SelectItem value="SOSPESA">Sospesa</SelectItem>
              <SelectItem value="REVOCATA">Revocata</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={fetchAutorizzazioni}
            className="border-[#1e293b] text-[#e8fbff]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabella */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="rounded-md border border-[#1e293b] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#020817] hover:bg-[#020817]">
                  <TableHead className="text-gray-400">N. Autorizzazione</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Impresa</TableHead>
                  <TableHead className="text-gray-400">Ente Rilascio</TableHead>
                  <TableHead className="text-gray-400">Mercato</TableHead>
                  <TableHead className="text-gray-400">Rilascio</TableHead>
                  <TableHead className="text-gray-400">Scadenza</TableHead>
                  <TableHead className="text-gray-400">Stato</TableHead>
                  <TableHead className="text-gray-400 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAutorizzazioni.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                      Nessuna autorizzazione trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAutorizzazioni.map((auth) => (
                    <TableRow key={auth.id} className="hover:bg-[#1e293b]/50">
                      <TableCell className="text-[#e8fbff] font-medium">
                        {auth.numero_autorizzazione}
                      </TableCell>
                      <TableCell>{getTipoBadge(auth.tipo)}</TableCell>
                      <TableCell>
                        <div className="text-[#e8fbff]">{auth.company_name}</div>
                        <div className="text-xs text-gray-400">{auth.company_piva || auth.company_cf}</div>
                      </TableCell>
                      <TableCell className="text-[#e8fbff]">{auth.ente_rilascio}</TableCell>
                      <TableCell className="text-[#e8fbff]">
                        {auth.market_name || '-'}
                        {auth.stall_number && <span className="text-gray-400 ml-1">({auth.stall_number})</span>}
                      </TableCell>
                      <TableCell className="text-[#e8fbff]">{formatDate(auth.data_rilascio)}</TableCell>
                      <TableCell className="text-[#e8fbff]">{formatDate(auth.data_scadenza)}</TableCell>
                      <TableCell>{getStatoBadge(auth.stato)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {onViewAutorizzazione && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => onViewAutorizzazione(auth.id)}
                              className="text-gray-400 hover:text-[#e8fbff]"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {onEditAutorizzazione && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => onEditAutorizzazione(auth.id)}
                              className="text-gray-400 hover:text-[#e8fbff]"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(auth.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
