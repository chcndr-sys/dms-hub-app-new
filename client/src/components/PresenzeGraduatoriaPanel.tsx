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
  giorno_presenza: string;
  checkin_time: string;
  checkout_time: string;
  orario_accesso: string;
  orario_rifiuti: string;
  orario_uscita: string;
  orario_deposito_rifiuti: string;
  importo_addebitato: number;
  stall_number: string;
  impresa_nome: string;
  impresa_piva: string;
}

interface StallData {
  id: number;
  number: string;
  type: string;
  status: string;
  vendor_business_name: string | null;
  impresa_id: number | null;
}

interface PresenzeGraduatoriaPanelProps {
  marketId: number | null;
  marketName?: string;
  stalls?: StallData[];
}

export function PresenzeGraduatoriaPanel({ marketId, marketName, stalls = [] }: PresenzeGraduatoriaPanelProps) {
  const [activeTab, setActiveTab] = useState('concessionari');
  const [graduatoria, setGraduatoria] = useState<GraduatoriaRecord[]>([]);
  const [presenze, setPresenze] = useState<PresenzaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<GraduatoriaRecord>>({});
  const [showStoricoPopup, setShowStoricoPopup] = useState<{stallId: number; stallNumber: string; presenze: number; primaPresenza: string | null} | null>(null);
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="text-center p-1 w-12">N°</th>
                    <th className="text-center p-1">Stato</th>
                    <th className="text-left p-1">Impresa</th>
                    <th className="text-center p-1">Giorno</th>
                    <th className="text-center p-1">Accesso</th>
                    <th className="text-center p-1">Rifiuti</th>
                    <th className="text-center p-1">Uscita</th>
                    <th className="text-center p-1 cursor-pointer hover:text-cyan-400" title="Click per storico">Presenze</th>
                    <th className="text-center p-1">Assenze</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center p-4 text-slate-400">Caricamento...</td>
                    </tr>
                  ) : stalls.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-4 text-slate-400">
                        Nessun posteggio trovato per questo mercato.
                      </td>
                    </tr>
                  ) : stalls
                    .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                    .map((stall) => {
                    const record = graduatoria.find(g => g.stall_id === stall.id);
                    const presenza = presenze.find(p => p.stall_id === stall.id);
                    const isSpuntista = stall.type === 'spunta';
                    const isRevoca = record?.stato_revoca === 'REVOCA';
                    const getStatoBadge = (status: string) => {
                      switch(status) {
                        case 'occupato': return <Badge className="bg-red-500 text-[10px] px-1">OCCUP.</Badge>;
                        case 'riservato': return <Badge className="bg-yellow-500 text-[10px] px-1">ASSEGN.</Badge>;
                        case 'libero': default: return <Badge className="bg-green-500 text-[10px] px-1">LIBERO</Badge>;
                      }
                    };
                    return (
                    <tr key={stall.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${stall.status === 'occupato' ? 'bg-red-900/10' : ''}`}>
                      <td className="p-1 text-center">
                        <span className="text-cyan-400 font-mono font-bold">{stall.number}</span>
                      </td>
                      <td className="p-1 text-center">
                        {getStatoBadge(stall.status)}
                      </td>
                      <td className="p-1">
                        {stall.vendor_business_name ? (
                          <span className={`font-medium ${isSpuntista ? 'text-yellow-400' : 'text-white'}`}>
                            {stall.vendor_business_name}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-1 text-center text-slate-300">
                        {presenza?.giorno_presenza ? new Date(presenza.giorno_presenza).toLocaleDateString('it-IT', {weekday: 'short', day: '2-digit', month: '2-digit'}) : '-'}
                      </td>
                      <td className="p-1 text-center text-green-400">
                        {presenza?.orario_accesso || '-'}
                      </td>
                      <td className="p-1 text-center text-orange-400">
                        {presenza?.orario_rifiuti || '-'}
                      </td>
                      <td className="p-1 text-center text-blue-400">
                        {presenza?.orario_uscita || '-'}
                      </td>
                      <td className="p-1 text-center">
                        <button 
                          onClick={() => setShowStoricoPopup({
                            stallId: stall.id,
                            stallNumber: stall.number,
                            presenze: record?.presenze_totali || 0,
                            primaPresenza: record?.data_prima_presenza || null
                          })}
                          className="text-white font-bold hover:text-cyan-400 cursor-pointer"
                        >
                          {record?.presenze_totali || 0}
                        </button>
                      </td>
                      <td className="p-1 text-center">
                        <span className={isRevoca ? 'text-red-500 font-bold animate-pulse' : 'text-slate-300'}>
                          {record ? record.assenze_non_giustificate : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* Popup Storico Presenze - Editabile */}
            {showStoricoPopup && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStoricoPopup(null)}>
                <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-cyan-500/30" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-white mb-4">📊 Storico Presenze - Posteggio {showStoricoPopup.stallNumber}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-400 text-sm block mb-1">Presenze Totali (storico):</label>
                      <input 
                        type="number"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-lg font-bold"
                        value={showStoricoPopup.presenze}
                        onChange={(e) => setShowStoricoPopup({...showStoricoPopup, presenze: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm block mb-1">Data Prima Presenza:</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                        value={showStoricoPopup.primaPresenza || ''}
                        onChange={(e) => setShowStoricoPopup({...showStoricoPopup, primaPresenza: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        try {
                          const response = await fetch(`${API_BASE}/api/graduatoria/aggiorna-storico`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              stall_id: showStoricoPopup.stallId,
                              market_id: marketId,
                              presenze_totali: showStoricoPopup.presenze,
                              data_prima_presenza: showStoricoPopup.primaPresenza
                            })
                          });
                          const data = await response.json();
                          if (data.success) {
                            toast.success('Storico aggiornato!');
                            fetchGraduatoria();
                            setShowStoricoPopup(null);
                          } else {
                            toast.error(data.error || 'Errore salvataggio');
                          }
                        } catch (error) {
                          toast.error('Errore di connessione');
                        }
                      }}
                    >
                      💾 Salva
                    </Button>
                    <Button 
                      variant="outline"
                      className="flex-1 border-slate-600"
                      onClick={() => setShowStoricoPopup(null)}
                    >
                      Annulla
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
