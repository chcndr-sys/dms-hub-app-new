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
  Phone,
  Play,
  Flag,
  RotateCcw,
  CheckCircle
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
  stall_status: string;
  wallet_balance: number;
  wallet_type: string;
  annual_market_days: number;
  // Dati presenza odierna
  presenza_giorno: string;
  presenza_accesso: string;
  presenza_rifiuti: string;
  presenza_uscita: string;
  presenza_importo: number;
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

interface SpuntistaRecord {
  wallet_id: number;
  impresa_id: number;
  impresa_nome: string;
  impresa_piva: string;
  codice_fiscale: string;
  wallet_balance: number;
  posizione: number;
  posizione_graduatoria?: number; // Posizione calcolata dinamicamente
  punteggio: number;
  presenze_totali: number;
  data_prima_presenza: string;
  // Campi presenza giornaliera
  presenza_id?: number;
  giorno_presenza?: string;
  orario_arrivo?: string;
  orario_deposito_rifiuti?: string;
  orario_uscita?: string;
  importo_pagato?: number;
  stall_scelto?: string;
  stato_presenza?: 'presente' | 'rinunciato' | 'rinuncia_forzata' | null;
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
  onRefreshStalls?: () => Promise<void>;
  refreshTrigger?: number;
}

export function PresenzeGraduatoriaPanel({ marketId, marketName, stalls = [], onRefreshStalls, refreshTrigger }: PresenzeGraduatoriaPanelProps) {
  const [activeTab, setActiveTab] = useState('concessionari');
  const [graduatoria, setGraduatoria] = useState<GraduatoriaRecord[]>([]);
  const [presenze, setPresenze] = useState<PresenzaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<GraduatoriaRecord>>({});
  const [showStoricoPopup, setShowStoricoPopup] = useState<{
    stallId?: number; 
    stallNumber?: string; 
    presenze: number; 
    primaPresenza: string | null;
    walletId?: number;
    impresaId?: number;
    impresaNome?: string;
  } | null>(null);
  const [spuntisti, setSpuntisti] = useState<SpuntistaRecord[]>([]);
  const [loadingSpuntisti, setLoadingSpuntisti] = useState(false);
  
  // Stati per Test Mercato
  const [testMercatoActive, setTestMercatoActive] = useState(false);
  const [spuntaActive, setSpuntaActive] = useState(false);
  const [testMercatoStato, setTestMercatoStato] = useState<{
    posteggi: { libero?: number; occupato?: number; riservato?: number };
    presenze: { CONCESSION?: number; SPUNTA?: number };
    spuntisti_in_attesa: number;
    totale_incassato: number;
  } | null>(null);

  // Fetch graduatoria quando cambia mercato, tab o trigger
  useEffect(() => {
    if (marketId) {
      fetchGraduatoria();
      fetchPresenze();
      fetchTestMercatoStato();
      if (activeTab === 'spuntisti') {
        fetchSpuntisti();
      }
    }
  }, [marketId, activeTab, refreshTrigger]);

  // Sincronizzazione Real-Time: Aggiorna quando cambiano i posteggi (stalls)
  useEffect(() => {
    if (marketId && stalls.length > 0) {
      console.log('[PresenzeGraduatoriaPanel] Rilevato cambiamento posteggi, sincronizzo...');
      fetchGraduatoria();
      fetchPresenze();
      fetchTestMercatoStato();
      if (activeTab === 'spuntisti') {
        fetchSpuntisti();
      }
    }
  }, [stalls]);

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

  // Fetch spuntisti con wallet SPUNTA dal nuovo endpoint
  const fetchSpuntisti = async () => {
    if (!marketId) return;
    setLoadingSpuntisti(true);
    try {
      const response = await fetch(`${API_BASE}/api/spuntisti/mercato/${marketId}`);
      const data = await response.json();
      
      if (data.success) {
        setSpuntisti(data.data);
      } else {
        console.error('Errore fetch spuntisti:', data.error);
        setSpuntisti([]);
      }
    } catch (error) {
      console.error('Errore fetch spuntisti:', error);
      setSpuntisti([]);
    } finally {
      setLoadingSpuntisti(false);
    }
  };

  // === FUNZIONI TEST MERCATO ===
  const fetchTestMercatoStato = async () => {
    if (!marketId) return;
    try {
      const response = await fetch(`${API_BASE}/api/test-mercato/stato/${marketId}`);
      const data = await response.json();
      if (data.success) {
        setTestMercatoStato(data.data);
      }
    } catch (error) {
      console.error('Errore fetch stato test mercato:', error);
    }
  };

  const handleStartTestMercato = async () => {
    if (!marketId) return;
    try {
      const response = await fetch(`${API_BASE}/api/test-mercato/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`✅ ${data.message}`);
        setTestMercatoActive(true);
        setSpuntaActive(false);
        fetchTestMercatoStato();
        fetchGraduatoria();
        fetchPresenze();
        if (onRefreshStalls) await onRefreshStalls();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Errore avvio test mercato');
    }
  };

  const handleRegistraPresenzaConcessionario = async (stallId: number) => {
    if (!marketId) return;
    try {
      const response = await fetch(`${API_BASE}/api/test-mercato/registra-presenza-concessionario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stall_id: stallId, market_id: marketId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`✅ ${data.message}`);
        if (data.data.addebito_effettuato) {
          toast.info(`💰 Addebitato €${data.data.costo_posteggio.toFixed(2)} - Nuovo saldo: €${data.data.nuovo_saldo_wallet?.toFixed(2)}`);
        }
        fetchTestMercatoStato();
        fetchGraduatoria();
        fetchPresenze();
        if (onRefreshStalls) await onRefreshStalls();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Errore registrazione presenza');
    }
  };

  const handleAvviaSpunta = async () => {
    if (!marketId) return;
    try {
      const response = await fetch(`${API_BASE}/api/test-mercato/avvia-spunta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`🏁 ${data.message}`);
        setSpuntaActive(true);
        fetchTestMercatoStato();
        fetchSpuntisti();
        fetchGraduatoria();
        fetchPresenze();
        if (onRefreshStalls) await onRefreshStalls();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Errore avvio spunta');
    }
  };

  const handleAssegnaPosteggioSpunta = async (stallId: number) => {
    if (!marketId) return;
    try {
      const response = await fetch(`${API_BASE}/api/test-mercato/assegna-posteggio-spunta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stall_id: stallId, market_id: marketId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`✅ ${data.message}`);
        if (data.data.addebito_effettuato) {
          toast.info(`💰 Addebitato €${data.data.costo_posteggio.toFixed(2)} - Nuovo saldo: €${data.data.nuovo_saldo_wallet?.toFixed(2)}`);
        }
        fetchTestMercatoStato();
        fetchSpuntisti();
        fetchGraduatoria();
        if (onRefreshStalls) await onRefreshStalls();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Errore assegnazione posteggio');
    }
  };

  const handleResetTestMercato = async () => {
    if (!marketId) return;
    if (!confirm('Sei sicuro di voler resettare il test mercato? Tutte le presenze del giorno verranno eliminate.')) return;
    try {
      const response = await fetch(`${API_BASE}/api/test-mercato/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`🔄 ${data.message}`);
        setTestMercatoActive(false);
        setSpuntaActive(false);
        fetchTestMercatoStato();
        fetchGraduatoria();
        fetchPresenze();
        fetchSpuntisti();
        if (onRefreshStalls) await onRefreshStalls();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Errore reset test mercato');
    }
  };

  // Carica stato test mercato quando cambia il mercato
  useEffect(() => {
    if (marketId) {
      fetchTestMercatoStato();
    }
  }, [marketId]);

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

  // Funzione per ottenere il badge stato spuntista
  const getStatoSpuntistaBadge = (record: SpuntistaRecord) => {
    if (record.stato_presenza === 'presente' && record.stall_scelto) {
      // Verde con numero posteggio
      return (
        <Badge className="bg-green-500 text-white font-bold min-w-[60px] justify-center">
          {record.stall_scelto}
        </Badge>
      );
    } else if (record.stato_presenza === 'rinunciato') {
      // Arancione - ha fatto presenza ma non ha scelto posteggio
      return (
        <Badge className="bg-orange-500 text-white text-[10px] min-w-[60px] justify-center">
          RINUNCIATO
        </Badge>
      );
    } else if (record.stato_presenza === 'rinuncia_forzata') {
      // Rosso - non ci sono più posteggi disponibili
      return (
        <Badge className="bg-red-500 text-white text-[10px] min-w-[60px] justify-center">
          RINUNCIA
        </Badge>
      );
    } else {
      // Grigio - non ancora presente
      return (
        <Badge className="bg-slate-600 text-slate-300 text-[10px] min-w-[60px] justify-center">
          IN ATTESA
        </Badge>
      );
    }
  };

  // Salva storico spuntista
  const handleSaveStoricoSpuntista = async () => {
    if (!showStoricoPopup) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/graduatoria/aggiorna-storico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: showStoricoPopup.walletId,
          impresa_id: showStoricoPopup.impresaId,
          market_id: marketId,
          presenze_totali: showStoricoPopup.presenze,
          data_prima_presenza: showStoricoPopup.primaPresenza
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Storico aggiornato!');
        fetchSpuntisti();
        setShowStoricoPopup(null);
      } else {
        toast.error(data.error || 'Errore salvataggio');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    }
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
        {/* === STATO MERCATO (Sincronizzato) === */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          {/* Stato Mercato Real-Time */}
          {testMercatoStato && (
            <div className="flex-1 flex items-center justify-end gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-green-400">●</span>
                <span className="text-slate-400">Liberi: {testMercatoStato.posteggi?.libero || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-orange-400">●</span>
                <span className="text-slate-400">Assegn: {testMercatoStato.posteggi?.riservato || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-400">●</span>
                <span className="text-slate-400">Occupati: {testMercatoStato.posteggi?.occupato || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400">●</span>
                <span className="text-slate-400">Spuntisti in attesa: {testMercatoStato.spuntisti_in_attesa}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-cyan-400 font-bold">💰</span>
                <span className="text-cyan-400 font-bold">Incassato: €{testMercatoStato.totale_incassato?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          )}
        </div>

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
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-700 rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-800 z-10">
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
                    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' }))
                    .map((stall) => {
                    const record = graduatoria.find(g => g.stall_id === stall.id);
                    const presenza = presenze.find(p => p.stall_id === stall.id);
                    const isSpuntista = stall.type === 'spunta';
                    const isRevoca = record?.stato_revoca === 'REVOCA';
                    const getStatoBadge = (status: string, stallId: number) => {
                      switch(status) {
                        case 'occupato': return <Badge className="bg-red-500 text-[10px] px-1">OCCUP.</Badge>;
                        case 'riservato': return (
                          <Badge 
                            className="bg-orange-500 text-[10px] px-1 cursor-pointer hover:bg-orange-600" 
                            onClick={() => handleAssegnaPosteggioSpunta(stallId)}
                            title="Click per assegnare a spuntista"
                          >
                            ASSEGN.
                          </Badge>
                        );
                        case 'libero': default: return (
                          <Badge 
                            className="bg-green-500 text-[10px] px-1 cursor-pointer hover:bg-green-600" 
                            onClick={() => handleRegistraPresenzaConcessionario(stallId)}
                            title="Click per registrare presenza"
                          >
                            LIBERO
                          </Badge>
                        );
                      }
                    };
                    return (
                    <tr key={stall.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${stall.status === 'occupato' ? 'bg-red-900/10' : ''}`}>
                      <td className="p-1 text-center">
                        <span className="text-cyan-400 font-mono font-bold">{stall.number}</span>
                      </td>
                      <td className="p-1 text-center">
                        {getStatoBadge(stall.status, stall.id)}
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
                        {presenza?.giorno_mercato ? new Date(presenza.giorno_mercato).toLocaleDateString('it-IT', {weekday: 'short', day: '2-digit', month: '2-digit'}) : '-'}
                      </td>
                      <td className="p-1 text-center text-green-400">
                        {presenza?.checkin_time ? new Date(presenza.checkin_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}) : '-'}
                      </td>
                      <td className="p-1 text-center text-orange-400">
                        {presenza?.orario_deposito_rifiuti ? new Date(presenza.orario_deposito_rifiuti).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}) : '-'}
                      </td>
                      <td className="p-1 text-center text-blue-400">
                        {presenza?.checkout_time ? new Date(presenza.checkout_time).toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}) : '-'}
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
            {showStoricoPopup && showStoricoPopup.stallId && (
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

          {/* TAB SPUNTISTI - Stessa struttura dei concessionari */}
          <TabsContent value="spuntisti" className="mt-4">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-700 rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-800 z-10">
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="text-center p-1 w-12"># Pos.</th>
                    <th className="text-center p-1">Stato/Post.</th>
                    <th className="text-left p-1">Impresa</th>
                    <th className="text-center p-1">Saldo Wallet</th>
                    <th className="text-center p-1">Giorno</th>
                    <th className="text-center p-1">Arrivo</th>
                    <th className="text-center p-1">Rifiuti</th>
                    <th className="text-center p-1">Uscita</th>
                    <th className="text-center p-1">Pagato</th>
                    <th className="text-center p-1 cursor-pointer hover:text-yellow-400" title="Click per storico">Presenze</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSpuntisti ? (
                    <tr>
                      <td colSpan={10} className="text-center p-4 text-slate-400">Caricamento spuntisti...</td>
                    </tr>
                  ) : spuntisti.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center p-4 text-slate-400">
                        Nessuno spuntista con wallet SPUNTA per questo mercato.
                      </td>
                    </tr>
                  ) : spuntisti.map((record) => {
                    // Usa posizione_graduatoria calcolata dal backend (basata su presenze DESC, data ASC)
                    const pos = record.posizione_graduatoria || 999;
                    return (
                    <tr key={record.wallet_id} className="border-b border-slate-700/50 hover:bg-yellow-900/20 bg-yellow-900/10">
                      <td className="p-1 text-center">
                        <Badge className={`${pos === 1 ? 'bg-yellow-500' : pos === 2 ? 'bg-slate-400' : pos === 3 ? 'bg-amber-600' : 'bg-slate-600'} text-[10px]`}>
                          #{pos}
                        </Badge>
                      </td>
                      <td className="p-1 text-center">
                        {getStatoSpuntistaBadge(record)}
                      </td>
                      <td className="p-1">
                        <div className="text-yellow-400 font-medium text-xs">{record.impresa_nome}</div>
                        <div className="text-slate-500 text-[10px]">{record.impresa_piva || record.codice_fiscale}</div>
                      </td>
                      <td className="p-1 text-center">
                        <span className={`font-bold text-xs ${parseFloat(String(record.wallet_balance || 0)) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(parseFloat(String(record.wallet_balance || 0)))}
                        </span>
                      </td>
                      <td className="p-1 text-center text-slate-300 text-xs">
                        {record.giorno_presenza ? new Date(record.giorno_presenza).toLocaleDateString('it-IT', {weekday: 'short', day: '2-digit', month: '2-digit'}) : '-'}
                      </td>
                      <td className="p-1 text-center text-green-400 text-xs">
                        {record.orario_arrivo || '-'}
                      </td>
                      <td className="p-1 text-center text-orange-400 text-xs">
                        {record.orario_deposito_rifiuti || '-'}
                      </td>
                      <td className="p-1 text-center text-blue-400 text-xs">
                        {record.orario_uscita || '-'}
                      </td>
                      <td className="p-1 text-center text-xs">
                        <span className={record.importo_pagato ? 'text-green-400 font-bold' : 'text-slate-500'}>
                          {record.importo_pagato ? formatCurrency(record.importo_pagato) : '-'}
                        </span>
                      </td>
                      <td className="p-1 text-center">
                        <button 
                          onClick={() => setShowStoricoPopup({
                            walletId: record.wallet_id,
                            impresaId: record.impresa_id,
                            impresaNome: record.impresa_nome,
                            presenze: record.presenze_totali || 0,
                            primaPresenza: record.data_prima_presenza || null
                          })}
                          className="text-white font-bold hover:text-yellow-400 cursor-pointer text-xs"
                        >
                          {record.presenze_totali || 0}
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
              {spuntisti.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
                  <p className="text-yellow-400 text-sm">
                    📋 <strong>{spuntisti.length}</strong> spuntisti con wallet SPUNTA attivo per questo mercato
                  </p>
                </div>
              )}
            </div>

            {/* Popup Storico Presenze Spuntista - Editabile */}
            {showStoricoPopup && showStoricoPopup.walletId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowStoricoPopup(null)}>
                <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-yellow-500/30" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-yellow-400 mb-4">📊 Storico Presenze - {showStoricoPopup.impresaNome}</h3>
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
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                      onClick={handleSaveStoricoSpuntista}
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

          {/* TAB FIERE/STRAORDINARI */}
          <TabsContent value="straordinari" className="mt-4">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800 z-10">
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
