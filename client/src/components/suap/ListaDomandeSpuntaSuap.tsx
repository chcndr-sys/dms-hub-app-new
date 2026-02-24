/**
 * ListaDomandeSpuntaSuap.tsx
 * 
 * Lista delle domande di partecipazione alla spunta per SSO SUAP.
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
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { addComuneIdToUrl, addAssociazioneIdToUrl, authenticatedFetch } from '@/hooks/useImpersonation';
import { formatDate } from '@/lib/formatUtils';

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
  onEditDomanda?: (id: number) => void;
  isAssociazione?: boolean;
}

export default function ListaDomandeSpuntaSuap({ 
  onNuovaDomanda, 
  onViewDomanda,
  onEditDomanda,
  isAssociazione = false
}: ListaDomandeSpuntaSuapProps) {
  const [domande, setDomande] = useState<DomandaSpunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStato, setFilterStato] = useState<string>('all');

  // Carica domande spunta
  const fetchDomande = async () => {
    try {
      setLoading(true);
      const response = await fetch(addAssociazioneIdToUrl(addComuneIdToUrl(`${API_URL}/api/domande-spunta`)));
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

  // Formatta importo
  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined) return '€ 0.00';
    return `€ ${Number(amount).toFixed(2)}`;
  };

  // Badge stato con semafori
  const getStatoBadge = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'APPROVATA':
      case 'ATTIVA':
        return <Badge className="bg-green-500/20 text-green-400 border border-green-500/50">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5 animate-pulse"></span>
          Approvata
        </Badge>;
      case 'IN_ATTESA':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
          <span className="w-2 h-2 rounded-full bg-yellow-400 mr-1.5 animate-pulse"></span>
          In Attesa
        </Badge>;
      case 'DA_REVISIONARE':
      case 'REVISIONE':
        return <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/50">
          <span className="w-2 h-2 rounded-full bg-orange-400 mr-1.5 animate-pulse"></span>
          Da Revisionare
        </Badge>;
      case 'RIFIUTATA':
        return <Badge className="bg-red-500/20 text-red-400 border border-red-500/50">
          <span className="w-2 h-2 rounded-full bg-red-400 mr-1.5"></span>
          Rifiutata
        </Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{stato || 'N/D'}</Badge>;
    }
  };

  // Approva domanda
  const handleApprova = async (id: number) => {
    try {
      const response = await authenticatedFetch(`${API_URL}/api/domande-spunta/${id}/approva`, {
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

  // Richiedi revisione/regolarizzazione
  const handleRevisione = async (id: number) => {
    const motivo = prompt('Motivo della richiesta di regolarizzazione:');
    if (!motivo) return;
    
    try {
      const response = await authenticatedFetch(`${API_URL}/api/domande-spunta/${id}/revisione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      const json = await response.json();
      
      if (json.success) {
        toast.success('Richiesta revisione inviata', { 
          description: 'L\'impresa riceverà notifica per regolarizzare la domanda' 
        });
        fetchDomande();
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      toast.error('Errore richiesta revisione', { description: err.message });
    }
  };

  // Rifiuta domanda
  const handleRifiuta = async (id: number) => {
    const motivo = prompt('Motivo del rifiuto:');
    if (!motivo) return;
    
    try {
      const response = await authenticatedFetch(`${API_URL}/api/domande-spunta/${id}/rifiuta`, {
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
      const response = await authenticatedFetch(`${API_URL}/api/domande-spunta/${id}`, {
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

  // Visualizza domanda
  const handleView = (id: number) => {
    if (onViewDomanda) {
      onViewDomanda(id);
    } else {
      toast.info('Dettaglio domanda', { description: `ID: ${id}` });
    }
  };

  // Modifica domanda
  const handleEdit = (id: number) => {
    if (onEditDomanda) {
      onEditDomanda(id);
    } else {
      toast.info('Modifica domanda', { description: `ID: ${id}` });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con titolo e pulsante */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-semibold text-[#e8fbff]">Domande Spunta</h2>
          <Badge variant="outline" className="ml-2 text-gray-400 border-gray-600">
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

      {/* Filtri */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Cerca per impresa o mercato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
          />
        </div>
        
        <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-[150px] bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="APPROVATA">Approvata</SelectItem>
            <SelectItem value="IN_ATTESA">In Attesa</SelectItem>
            <SelectItem value="DA_REVISIONARE">Da Revisionare</SelectItem>
            <SelectItem value="RIFIUTATA">Rifiutata</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          onClick={fetchDomande}
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
              <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
          ) : filteredDomande.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nessuna domanda spunta trovata</p>
              <p className="text-sm mt-2">Le domande create appariranno qui</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#14b8a6]/30 hover:bg-transparent">
                  <TableHead className="text-gray-400">Impresa</TableHead>
                  <TableHead className="text-gray-400">Mercato</TableHead>
                  <TableHead className="text-gray-400">Giorno</TableHead>
                  <TableHead className="text-gray-400">Settore</TableHead>
                  <TableHead className="text-gray-400">Autorizzazione</TableHead>
                  <TableHead className="text-gray-400">Data Richiesta</TableHead>
                  <TableHead className="text-gray-400">Presenze</TableHead>
                  <TableHead className="text-gray-400">Wallet</TableHead>
                  <TableHead className="text-gray-400">Stato</TableHead>
                  <TableHead className="text-gray-400">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDomande.map((dom) => (
                  <TableRow 
                    key={dom.id} 
                    className="border-[#14b8a6]/30 hover:bg-[#0f172a] cursor-pointer"
                  >
                    <TableCell>
                      <div>
                        <p className="text-[#e8fbff]">{dom.company_name}</p>
                        <p className="text-xs text-gray-500">{dom.company_piva || dom.company_cf}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[#e8fbff]">{dom.market_name}</p>
                        <p className="text-xs text-gray-500">{dom.market_municipality}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#e8fbff]">{dom.market_days || '-'}</TableCell>
                    <TableCell className="text-[#e8fbff]">{dom.settore_richiesto || '-'}</TableCell>
                    <TableCell className="text-[#e8fbff]">{dom.numero_autorizzazione || '-'}</TableCell>
                    <TableCell className="text-gray-400">{formatDate(dom.data_richiesta)}</TableCell>
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-[#14b8a6] hover:bg-[#14b8a6]/10"
                          onClick={() => handleView(dom.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-yellow-400 hover:bg-yellow-400/10"
                          onClick={() => handleEdit(dom.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {/* Pulsanti per domande IN_ATTESA o DA_REVISIONARE - solo per PA */}
                        {!isAssociazione && (dom.stato === 'IN_ATTESA' || dom.stato === 'DA_REVISIONARE') && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-green-400 hover:bg-green-400/10"
                              onClick={() => handleApprova(dom.id)}
                              title="Approva domanda"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-amber-400 hover:bg-amber-400/10"
                              onClick={() => handleRevisione(dom.id)}
                              title="Richiedi regolarizzazione"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-400 hover:bg-red-400/10"
                              onClick={() => handleRifiuta(dom.id)}
                              title="Rifiuta domanda"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {!isAssociazione && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDelete(dom.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        )}
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
