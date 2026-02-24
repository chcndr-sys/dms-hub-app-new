/**
 * ListaAutorizzazioniSuap.tsx
 * 
 * Lista delle autorizzazioni commercio su aree pubbliche per SSO SUAP.
 * Design coerente con ListaConcessioni (sfondo grigio, righe verdi).
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { addComuneIdToUrl, authenticatedFetch } from '@/hooks/useImpersonation';
import { formatDate } from '@/lib/formatUtils';

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
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/autorizzazioni`));
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

  // Badge stato
  const getStatoBadge = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'ATTIVA':
        return <Badge className="bg-green-500/20 text-green-400">Attiva</Badge>;
      case 'SCADUTA':
        return <Badge className="bg-red-500/20 text-red-400">Scaduta</Badge>;
      case 'SOSPESA':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Sospesa</Badge>;
      case 'REVOCATA':
        return <Badge className="bg-gray-500/20 text-gray-400">Revocata</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{stato || 'N/D'}</Badge>;
    }
  };

  // Badge tipo
  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'A':
        return <Badge className="bg-purple-500/20 text-purple-400">Tipo A</Badge>;
      case 'B':
        return <Badge className="bg-purple-500/20 text-purple-400">Tipo B</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{tipo || 'N/D'}</Badge>;
    }
  };

  // Elimina autorizzazione
  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa autorizzazione?')) return;
    
    try {
      const response = await authenticatedFetch(`${API_URL}/api/autorizzazioni/${id}`, {
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

  // Visualizza autorizzazione
  const handleView = (id: number) => {
    if (onViewAutorizzazione) {
      onViewAutorizzazione(id);
    } else {
      toast.info('Dettaglio autorizzazione', { description: `ID: ${id}` });
    }
  };

  // Modifica autorizzazione
  const handleEdit = (id: number) => {
    if (onEditAutorizzazione) {
      onEditAutorizzazione(id);
    } else {
      toast.info('Modifica autorizzazione', { description: `ID: ${id}` });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con titolo e pulsante */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-[#e8fbff]">Lista Autorizzazioni</h2>
          <Badge variant="outline" className="ml-2 text-gray-400 border-gray-600">
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

      {/* Filtri */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Cerca per numero, concessionario o mercato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
          />
        </div>
        
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[150px] bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]">
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
          <SelectTrigger className="w-[150px] bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]">
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
          className="border-[#14b8a6]/30 text-[#e8fbff]"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabella */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : filteredAutorizzazioni.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nessuna autorizzazione trovata</p>
              <p className="text-sm mt-2">Le autorizzazioni create appariranno qui</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#14b8a6]/30 hover:bg-transparent">
                  <TableHead className="text-gray-400">N. Autorizzazione</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Impresa</TableHead>
                  <TableHead className="text-gray-400">Ente Rilascio</TableHead>
                  <TableHead className="text-gray-400">Mercato</TableHead>
                  <TableHead className="text-gray-400">Rilascio</TableHead>
                  <TableHead className="text-gray-400">Scadenza</TableHead>
                  <TableHead className="text-gray-400">Stato</TableHead>
                  <TableHead className="text-gray-400">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAutorizzazioni.map((auth) => (
                  <TableRow 
                    key={auth.id} 
                    className="border-[#14b8a6]/30 hover:bg-[#0f172a] cursor-pointer"
                  >
                    <TableCell className="text-[#e8fbff] font-medium">
                      {auth.numero_autorizzazione}
                    </TableCell>
                    <TableCell>{getTipoBadge(auth.tipo)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[#e8fbff]">{auth.company_name}</p>
                        <p className="text-xs text-gray-500">{auth.company_piva || auth.company_cf}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#e8fbff]">{auth.ente_rilascio}</TableCell>
                    <TableCell className="text-[#e8fbff]">
                      {auth.market_name || '-'}
                      {auth.stall_number && <span className="text-gray-400 ml-1">({auth.stall_number})</span>}
                    </TableCell>
                    <TableCell className="text-gray-400">{formatDate(auth.data_rilascio)}</TableCell>
                    <TableCell className="text-gray-400">{formatDate(auth.data_scadenza)}</TableCell>
                    <TableCell>{getStatoBadge(auth.stato)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-[#14b8a6] hover:bg-[#14b8a6]/10"
                          onClick={() => handleView(auth.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-yellow-400 hover:bg-yellow-400/10"
                          onClick={() => handleEdit(auth.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDelete(auth.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
