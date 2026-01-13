/**
 * ListaDomandeSpuntaSuap.tsx
 * 
 * Lista delle domande di partecipazione alla spunta per SSO SUAP.
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
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface DomandaSpunta {
  id: number;
  company_name: string;
  company_piva: string;
  company_cf: string;
  market_name: string;
  market_municipality: string;
  market_days: string;
  numero_autorizzazione: string;
  autorizzazione_tipo: string;
  settore_richiesto: string;
  numero_presenze: number;
  data_richiesta: string;
  data_approvazione: string;
  stato: string;
  wallet_balance: number;
  wallet_id: number;
  note: string;
}

interface ListaDomandeSpuntaSuapProps {
  onNuovaDomanda: () => void;
  onViewDomanda?: (id: number) => void;
}

export default function ListaDomandeSpuntaSuap({ 
  onNuovaDomanda, 
  onViewDomanda 
}: ListaDomandeSpuntaSuapProps) {
  const [domande, setDomande] = useState<DomandaSpunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStato, setFilterStato] = useState<string>('all');

  // Carica domande spunta
  const fetchDomande = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/domande-spunta`);
      const json = await response.json();
      
      if (json.success && json.data) {
        setDomande(json.data);
      }
    } catch (err) {
      console.error('Errore caricamento domande spunta:', err);
      toast.error('Errore nel caricamento delle domande');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomande();
  }, []);

  // Filtra domande
  const filteredDomande = domande.filter(dom => {
    const matchesSearch = 
      dom.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dom.company_piva?.includes(searchQuery) ||
      dom.market_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStato = filterStato === 'all' || dom.stato === filterStato;
    
    return matchesSearch && matchesStato;
  });

  // Formatta data
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  // Formatta importo
  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined) return '€ 0.00';
    return `€ ${Number(amount).toFixed(2)}`;
  };

  // Badge stato
  const getStatoBadge = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'APPROVATA':
      case 'ATTIVA':
        return <Badge className="bg-green-600 text-white">Approvata</Badge>;
      case 'IN_ATTESA':
        return <Badge className="bg-yellow-600 text-white">In Attesa</Badge>;
      case 'RIFIUTATA':
        return <Badge className="bg-red-600 text-white">Rifiutata</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{stato || 'N/D'}</Badge>;
    }
  };

  // Approva domanda
  const handleApprova = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/domande-spunta/${id}/approva`, {
        method: 'POST'
      });
      const json = await response.json();
      
      if (json.success) {
        toast.success('Domanda approvata');
        fetchDomande();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      toast.error('Errore approvazione', { description: err.message });
    }
  };

  // Rifiuta domanda
  const handleRifiuta = async (id: number) => {
    const motivo = prompt('Motivo del rifiuto:');
    if (!motivo) return;
    
    try {
      const response = await fetch(`${API_URL}/api/domande-spunta/${id}/rifiuta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      const json = await response.json();
      
      if (json.success) {
        toast.success('Domanda rifiutata');
        fetchDomande();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      toast.error('Errore rifiuto', { description: err.message });
    }
  };

  // Elimina domanda
  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa domanda?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/domande-spunta/${id}`, {
        method: 'DELETE'
      });
      const json = await response.json();
      
      if (json.success) {
        toast.success('Domanda eliminata');
        fetchDomande();
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
            <FileText className="w-5 h-5 text-green-400" />
            <CardTitle className="text-[#e8fbff]">Domande Spunta</CardTitle>
            <Badge variant="outline" className="ml-2 text-gray-400">
              {filteredDomande.length} risultati
            </Badge>
          </div>
          <Button 
            onClick={onNuovaDomanda}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Domanda Spunta
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
                placeholder="Cerca per impresa o mercato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
          </div>
          
          <Select value={filterStato} onValueChange={setFilterStato}>
            <SelectTrigger className="w-[150px] bg-[#020817] border-[#1e293b] text-[#e8fbff]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="APPROVATA">Approvata</SelectItem>
              <SelectItem value="IN_ATTESA">In Attesa</SelectItem>
              <SelectItem value="RIFIUTATA">Rifiutata</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={fetchDomande}
            className="border-[#1e293b] text-[#e8fbff]"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabella */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : (
          <div className="rounded-md border border-[#1e293b] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#020817] hover:bg-[#020817]">
                  <TableHead className="text-gray-400">Impresa</TableHead>
                  <TableHead className="text-gray-400">Mercato</TableHead>
                  <TableHead className="text-gray-400">Giorno</TableHead>
                  <TableHead className="text-gray-400">Settore</TableHead>
                  <TableHead className="text-gray-400">Autorizzazione</TableHead>
                  <TableHead className="text-gray-400">Data Richiesta</TableHead>
                  <TableHead className="text-gray-400">Presenze</TableHead>
                  <TableHead className="text-gray-400">Wallet</TableHead>
                  <TableHead className="text-gray-400">Stato</TableHead>
                  <TableHead className="text-gray-400 text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDomande.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-400">
                      Nessuna domanda spunta trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDomande.map((dom) => (
                    <TableRow key={dom.id} className="hover:bg-[#1e293b]/50">
                      <TableCell>
                        <div className="text-[#e8fbff]">{dom.company_name}</div>
                        <div className="text-xs text-gray-400">{dom.company_piva || dom.company_cf}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-[#e8fbff]">{dom.market_name}</div>
                        <div className="text-xs text-gray-400">{dom.market_municipality}</div>
                      </TableCell>
                      <TableCell className="text-[#e8fbff]">{dom.market_days || '-'}</TableCell>
                      <TableCell className="text-[#e8fbff]">{dom.settore_richiesto || '-'}</TableCell>
                      <TableCell className="text-[#e8fbff]">{dom.numero_autorizzazione || '-'}</TableCell>
                      <TableCell className="text-[#e8fbff]">{formatDate(dom.data_richiesta)}</TableCell>
                      <TableCell className="text-[#e8fbff]">{dom.numero_presenze || 0}</TableCell>
                      <TableCell>
                        {dom.wallet_id ? (
                          <div className="flex items-center gap-1">
                            <Wallet className="w-4 h-4 text-green-400" />
                            <span className="text-green-400">{formatCurrency(dom.wallet_balance)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatoBadge(dom.stato)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {dom.stato === 'IN_ATTESA' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleApprova(dom.id)}
                                className="text-green-400 hover:text-green-300"
                                title="Approva"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRifiuta(dom.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Rifiuta"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {onViewDomanda && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => onViewDomanda(dom.id)}
                              className="text-gray-400 hover:text-[#e8fbff]"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(dom.id)}
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
