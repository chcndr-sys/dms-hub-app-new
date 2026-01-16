import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  LogOut, 
  Users, 
  Award,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'https://mihub.157-90-29-66.nip.io';

interface GraduatoriaRecord {
  id: number;
  market_id: number;
  impresa_id: number;
  wallet_id: number;
  stall_id: number;
  tipo: string;
  presenze_totali: number;
  punteggio: number;
  posizione: number;
  data_prima_presenza: string;
  ultima_presenza: string;
  assenze_non_giustificate: number;
  soglia_revoca: number;
  stato_revoca: string;
  anno: number;
  impresa_nome: string;
  impresa_piva: string;
  codice_fiscale: string;
  stall_number: string;
  wallet_balance: number;
  wallet_type: string;
  annual_market_days: number;
}

interface PresenzaRecord {
  id: number;
  market_id: number;
  stall_id: number;
  impresa_id: number;
  wallet_id: number;
  tipo_presenza: string;
  giorno_mercato: string;
  checkin_time: string;
  checkout_time: string;
  orario_deposito_rifiuti: string;
  importo_addebitato: number;
  stall_number: string;
  impresa_nome: string;
  impresa_piva: string;
}

interface PresenzeGraduatoriaPanelProps {
  marketId: number | null;
  marketName?: string;
}

export function PresenzeGraduatoriaPanel({ marketId, marketName }: PresenzeGraduatoriaPanelProps) {
  const [activeTab, setActiveTab] = useState('concessionari');
  const [graduatoria, setGraduatoria] = useState<GraduatoriaRecord[]>([]);
  const [presenze, setPresenze] = useState<PresenzaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<GraduatoriaRecord>>({});
  // toast importato da sonner

  // Fetch graduatoria quando cambia mercato o tab
  useEffect(() => {
    if (marketId) {
      fetchGraduatoria();
      fetchPresenze();
    }
  }, [marketId, activeTab]);

  const fetchGraduatoria = async () => {
    if (!marketId) return;
    setLoading(true);
    try {
      const tipoMap: Record<string, string> = {
        'concessionari': 'CONCESSION',
        'spuntisti': 'SPUNTA',
        'straordinari': 'STRAORDINARIO'
      };
      const tipo = tipoMap[activeTab] || 'all';
      
      const response = await fetch(`${API_BASE}/api/graduatoria/mercato/${marketId}?tipo=${tipo}`);
      const data = await response.json();
      
      if (data.success) {
        setGraduatoria(data.data);
      }
    } catch (error) {
      console.error('Errore fetch graduatoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPresenze = async () => {
    if (!marketId) return;
    try {
      const tipoMap: Record<string, string> = {
        'concessionari': 'CONCESSION',
        'spuntisti': 'SPUNTA',
        'straordinari': 'STRAORDINARIO'
      };
      const tipo = tipoMap[activeTab] || 'all';
      
      const response = await fetch(`${API_BASE}/api/presenze/mercato/${marketId}?tipo=${tipo}`);
      const data = await response.json();
      
      if (data.success) {
        setPresenze(data.data);
      }
    } catch (error) {
      console.error('Errore fetch presenze:', error);
    }
  };

  const handleEdit = (record: GraduatoriaRecord) => {
    setEditingId(record.id);
    setEditValues({
      presenze_totali: record.presenze_totali,
      punteggio: record.punteggio,
      data_prima_presenza: record.data_prima_presenza,
      assenze_non_giustificate: record.assenze_non_giustificate
    });
  };

  const handleSave = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE}/api/graduatoria/aggiorna`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editValues })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || "Dati aggiornati con successo");
        setEditingId(null);
        fetchGraduatoria();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleChiamaTurno = (record: GraduatoriaRecord) => {
    toast.info(`📢 Chiamata Turno #${record.posizione} - ${record.impresa_nome}`);
    // TODO: Attivare modalità selezione posteggio sulla mappa
  };

  const getStatoRevocaBadge = (stato: string) => {
    switch (stato) {
      case 'REVOCA':
        return <Badge variant="destructive" className="animate-pulse">⚠️ REVOCA</Badge>;
      case 'WARNING':
        return <Badge className="bg-yellow-500">⚠️ WARNING</Badge>;
      default:
        return <Badge className="bg-green-500">✓ OK</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT');
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  if (!marketId) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Seleziona un mercato per visualizzare presenze e graduatoria</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Award className="w-5 h-5 text-yellow-400" />
          Presenze e Graduatoria
          {marketName && <span className="text-slate-400 text-sm font-normal">- {marketName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
            <TabsTrigger value="concessionari" className="data-[state=active]:bg-cyan-600">
              Presenze Concessionari
            </TabsTrigger>
            <TabsTrigger value="spuntisti" className="data-[state=active]:bg-yellow-600">
              Presenze Spuntisti
            </TabsTrigger>
            <TabsTrigger value="straordinari" className="data-[state=active]:bg-purple-600">
              Fiere/Straordinari
            </TabsTrigger>
          </TabsList>

          {/* TAB CONCESSIONARI */}
          <TabsContent value="concessionari" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="text-left p-2">Posteggio</th>
                    <th className="text-left p-2">Impresa</th>
                    <th className="text-center p-2">Presenze</th>
                    <th className="text-center p-2">Prima Presenza</th>
                    <th className="text-center p-2">Assenze N.G.</th>
                    <th className="text-center p-2">Stato</th>
                    <th className="text-center p-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-slate-400">Caricamento...</td>
                    </tr>
                  ) : graduatoria.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-slate-400">
                        Nessun record trovato. I dati verranno popolati con le presenze.
                      </td>
                    </tr>
                  ) : graduatoria.map((record) => (
                    <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="p-2">
                        <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400">
                          {record.stall_number || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="text-white font-medium">{record.impresa_nome}</div>
                        <div className="text-slate-400 text-xs">{record.impresa_piva}</div>
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={editValues.presenze_totali || 0}
                            onChange={(e) => setEditValues({...editValues, presenze_totali: parseInt(e.target.value)})}
                            className="w-20 h-8 text-center bg-slate-700"
                          />
                        ) : (
                          <span className="text-white font-bold">{record.presenze_totali}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="date"
                            value={editValues.data_prima_presenza || ''}
                            onChange={(e) => setEditValues({...editValues, data_prima_presenza: e.target.value})}
                            className="w-32 h-8 bg-slate-700"
                          />
                        ) : (
                          <span className="text-slate-300">{formatDate(record.data_prima_presenza)}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={editValues.assenze_non_giustificate || 0}
                            onChange={(e) => setEditValues({...editValues, assenze_non_giustificate: parseInt(e.target.value)})}
                            className="w-20 h-8 text-center bg-slate-700"
                          />
                        ) : (
                          <span className={record.assenze_non_giustificate >= (record.soglia_revoca * 0.8) ? 'text-red-400 font-bold' : 'text-white'}>
                            {record.assenze_non_giustificate} / {record.soglia_revoca}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {getStatoRevocaBadge(record.stato_revoca)}
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="ghost" onClick={() => handleSave(record.id)} className="text-green-400 hover:text-green-300">
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel} className="text-red-400 hover:text-red-300">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(record)} className="text-slate-400 hover:text-white">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB SPUNTISTI */}
          <TabsContent value="spuntisti" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="text-center p-2"># Pos.</th>
                    <th className="text-left p-2">Impresa</th>
                    <th className="text-center p-2">Saldo Wallet</th>
                    <th className="text-center p-2">Punteggio</th>
                    <th className="text-center p-2">Presenze</th>
                    <th className="text-center p-2">Prima Presenza</th>
                    <th className="text-center p-2">Presente</th>
                    <th className="text-center p-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center p-4 text-slate-400">Caricamento...</td>
                    </tr>
                  ) : graduatoria.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-4 text-slate-400">
                        Nessuno spuntista registrato per questo mercato.
                      </td>
                    </tr>
                  ) : graduatoria.map((record) => (
                    <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="p-2 text-center">
                        <Badge className={`${record.posizione === 1 ? 'bg-yellow-500' : record.posizione === 2 ? 'bg-slate-400' : record.posizione === 3 ? 'bg-amber-600' : 'bg-slate-600'}`}>
                          #{record.posizione || '-'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="text-white font-medium">{record.impresa_nome}</div>
                        <div className="text-slate-400 text-xs">{record.impresa_piva}</div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`font-bold ${(record.wallet_balance || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(record.wallet_balance)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={editValues.punteggio || 0}
                            onChange={(e) => setEditValues({...editValues, punteggio: parseInt(e.target.value)})}
                            className="w-20 h-8 text-center bg-slate-700"
                          />
                        ) : (
                          <span className="text-yellow-400 font-bold">{record.punteggio}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={editValues.presenze_totali || 0}
                            onChange={(e) => setEditValues({...editValues, presenze_totali: parseInt(e.target.value)})}
                            className="w-20 h-8 text-center bg-slate-700"
                          />
                        ) : (
                          <span className="text-white">{record.presenze_totali}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="date"
                            value={editValues.data_prima_presenza || ''}
                            onChange={(e) => setEditValues({...editValues, data_prima_presenza: e.target.value})}
                            className="w-32 h-8 bg-slate-700"
                          />
                        ) : (
                          <span className="text-slate-300">{formatDate(record.data_prima_presenza)}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <Checkbox className="border-yellow-500 data-[state=checked]:bg-yellow-500" />
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          {editingId === record.id ? (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleSave(record.id)} className="text-green-400 hover:text-green-300">
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancel} className="text-red-400 hover:text-red-300">
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(record)} className="text-slate-400 hover:text-white">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleChiamaTurno(record)} className="text-yellow-400 hover:text-yellow-300">
                                <Phone className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB FIERE/STRAORDINARI */}
          <TabsContent value="straordinari" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="text-left p-2">Posteggio</th>
                    <th className="text-left p-2">Impresa</th>
                    <th className="text-center p-2">Tipo Evento</th>
                    <th className="text-center p-2">Data</th>
                    <th className="text-center p-2">Importo</th>
                    <th className="text-center p-2">Presenze</th>
                    <th className="text-center p-2">Prima Presenza</th>
                    <th className="text-center p-2">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center p-4 text-slate-400">Caricamento...</td>
                    </tr>
                  ) : graduatoria.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-4 text-slate-400">
                        Nessun evento straordinario registrato.
                      </td>
                    </tr>
                  ) : graduatoria.map((record) => (
                    <tr key={record.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="p-2">
                        <Badge variant="outline" className="bg-purple-500/20 text-purple-400">
                          {record.stall_number || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="text-white font-medium">{record.impresa_nome}</div>
                        <div className="text-slate-400 text-xs">{record.impresa_piva}</div>
                      </td>
                      <td className="p-2 text-center">
                        <Badge className="bg-purple-600">STRAORDINARIO</Badge>
                      </td>
                      <td className="p-2 text-center text-slate-300">
                        {formatDate(record.ultima_presenza)}
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-green-400 font-bold">-</span>
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="number"
                            value={editValues.presenze_totali || 0}
                            onChange={(e) => setEditValues({...editValues, presenze_totali: parseInt(e.target.value)})}
                            className="w-20 h-8 text-center bg-slate-700"
                          />
                        ) : (
                          <span className="text-white">{record.presenze_totali}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <Input
                            type="date"
                            value={editValues.data_prima_presenza || ''}
                            onChange={(e) => setEditValues({...editValues, data_prima_presenza: e.target.value})}
                            className="w-32 h-8 bg-slate-700"
                          />
                        ) : (
                          <span className="text-slate-300">{formatDate(record.data_prima_presenza)}</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {editingId === record.id ? (
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" variant="ghost" onClick={() => handleSave(record.id)} className="text-green-400 hover:text-green-300">
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel} className="text-red-400 hover:text-red-300">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(record)} className="text-slate-400 hover:text-white">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default PresenzeGraduatoriaPanel;
