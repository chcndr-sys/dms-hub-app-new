import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, Eye, ArrowRight, Calendar, Building2, MapPin,
  FileText, RefreshCw, ChevronDown, ChevronUp, History, X
} from 'lucide-react';
import { addComuneIdToUrl } from '@/hooks/useImpersonation';
import { toast } from 'sonner';

interface StoricoEvento {
  id: number;
  posteggio_id: number;
  market_id: number;
  data_evento: string;
  tipo_evento: string;
  cedente_impresa_id: number | null;
  cedente_ragione_sociale: string | null;
  cedente_cf: string | null;
  subentrante_impresa_id: number | null;
  subentrante_ragione_sociale: string | null;
  subentrante_cf: string | null;
  concessione_cedente_id: number | null;
  concessione_subentrante_id: number | null;
  scia_cedente_numero: string | null;
  scia_cedente_data: string | null;
  scia_cedente_comune: string | null;
  scia_subentrante_numero: string | null;
  scia_subentrante_data: string | null;
  scia_subentrante_comune: string | null;
  scia_subentrante_id: string | null;
  autorizzazione_precedente_pg: string | null;
  autorizzazione_precedente_data: string | null;
  autorizzazione_precedente_intestatario: string | null;
  riferimento_precedente_tipo: string | null;
  riferimento_precedente_id: string | null;
  riferimento_attuale_tipo: string | null;
  riferimento_attuale_id: string | null;
  saldo_trasferito: number;
  dati_presenze_cedente_json: any[] | null;
  dati_graduatoria_cedente_json: any[] | null;
  dati_scadenze_cedente_json: any[] | null;
  note: string | null;
  posteggio_numero: string | null;
  mercato_nome: string | null;
}

interface StoricoTitolaritaProps {
  comuneId?: number;
  marketId?: number;
}

const API_BASE = 'https://orchestratore.mio-hub.me/api';

export default function StoricoTitolarita({ comuneId, marketId: initialMarketId }: StoricoTitolaritaProps) {
  const [searchPosteggio, setSearchPosteggio] = useState('');
  const [eventi, setEventi] = useState<StoricoEvento[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<'posteggio' | 'mercato'>('mercato');
  const [stalls, setStalls] = useState<any[]>([]);
  const [selectedPosteggio, setSelectedPosteggio] = useState<number | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | undefined>(initialMarketId);

  // Carica lista mercati del comune
  const loadMarkets = useCallback(async () => {
    try {
      const url = addComuneIdToUrl(`${API_BASE}/markets`);
      const response = await fetch(url);
      const data = await response.json();
      const marketList = Array.isArray(data) ? data : (data.data || data.markets || []);
      setMarkets(marketList);
      // Se non c'è un mercato selezionato, seleziona il primo
      if (!selectedMarketId && marketList.length > 0) {
        setSelectedMarketId(marketList[0].id);
      }
    } catch (err) {
      console.error('Errore caricamento mercati:', err);
    }
  }, [selectedMarketId]);

  // Carica posteggi del mercato per il dropdown di ricerca
  const loadStalls = useCallback(async () => {
    if (!selectedMarketId) return;
    try {
      const url = addComuneIdToUrl(`${API_BASE}/stalls?market_id=${selectedMarketId}`);
      const response = await fetch(url);
      const data = await response.json();
      if (data.success !== false) {
        const stallList = Array.isArray(data) ? data : (data.data || []);
        setStalls(stallList.sort((a: any, b: any) => {
          const numA = parseInt(a.number) || 0;
          const numB = parseInt(b.number) || 0;
          return numA - numB;
        }));
      }
    } catch (err) {
      console.error('Errore caricamento posteggi:', err);
    }
  }, [selectedMarketId]);

  // Carica storico per mercato
  const loadStoricoMercato = useCallback(async () => {
    if (!selectedMarketId) return;
    setLoading(true);
    try {
      let url = `${API_BASE}/concessions/storico-titolarita/mercato/${selectedMarketId}?limit=100`;
      if (comuneId) url += `&comune_id=${comuneId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setEventi(data.data || []);
      } else {
        toast.error('Errore nel caricamento dello storico');
      }
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }, [selectedMarketId, comuneId]);

  // Carica storico per posteggio specifico
  const loadStoricoPosteggio = useCallback(async (posteggioId: number) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/concessions/storico-titolarita/${posteggioId}`;
      if (comuneId) url += `?comune_id=${comuneId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setEventi(data.data || []);
        setSelectedPosteggio(posteggioId);
      } else {
        toast.error('Errore nel caricamento dello storico');
      }
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  }, [comuneId]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    if (selectedMarketId) {
      loadStalls();
      loadStoricoMercato();
    }
  }, [selectedMarketId, loadStalls, loadStoricoMercato]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getTipoEventoBadge = (tipo: string) => {
    switch (tipo) {
      case 'SUBINGRESSO':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Subingresso</Badge>;
      case 'RINNOVO':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Rinnovo</Badge>;
      case 'CREAZIONE':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Creazione</Badge>;
      case 'CESSAZIONE':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cessazione</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{tipo}</Badge>;
    }
  };

  const handleSearchPosteggio = () => {
    if (!searchPosteggio.trim()) {
      setSelectedPosteggio(null);
      loadStoricoMercato();
      return;
    }
    // Cerca il posteggio per numero
    const found = stalls.find((s: any) => 
      String(s.number).toLowerCase() === searchPosteggio.toLowerCase().trim()
    );
    if (found) {
      loadStoricoPosteggio(found.id);
    } else {
      toast.error(`Posteggio "${searchPosteggio}" non trovato`);
    }
  };

  const clearSearch = () => {
    setSearchPosteggio('');
    setSelectedPosteggio(null);
    loadStoricoMercato();
  };

  return (
    <div className="space-y-4">
      {/* Header con ricerca */}
      <Card className="bg-[#1e293b] border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <History className="h-5 w-5 text-amber-400" />
            Storico Titolarità Posteggio
          </CardTitle>
          <CardDescription className="text-gray-400">
            Timeline completa dei cambi di titolarità per ogni posteggio del mercato.
            Dati archiviati per graduatorie Bolkestein e documentazione legale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            {/* Selettore Mercato */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Mercato</label>
              <select
                value={selectedMarketId || ''}
                onChange={(e) => {
                  setSelectedMarketId(parseInt(e.target.value));
                  setSelectedPosteggio(null);
                  setSearchPosteggio('');
                }}
                className="bg-[#0f172a] border border-gray-600 text-white rounded-md px-3 py-2 text-sm min-w-[200px]"
              >
                {markets.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name || m.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1 block">Cerca per numero posteggio</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Es. A001, 7, 151..."
                  value={searchPosteggio}
                  onChange={(e) => setSearchPosteggio(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPosteggio()}
                  className="bg-[#0f172a] border-gray-600 text-white"
                />
                <Button 
                  onClick={handleSearchPosteggio}
                  className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Cerca
                </Button>
                {selectedPosteggio && (
                  <Button 
                    onClick={clearSearch}
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Tutti
                  </Button>
                )}
                <Button 
                  onClick={selectedPosteggio ? () => loadStoricoPosteggio(selectedPosteggio) : loadStoricoMercato}
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {selectedPosteggio && (
            <div className="mt-2">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <MapPin className="h-3 w-3 mr-1" />
                Filtro attivo: Posteggio {stalls.find(s => s.id === selectedPosteggio)?.number || selectedPosteggio}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabella eventi */}
      <Card className="bg-[#1e293b] border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-400 mr-2" />
              <span className="text-gray-400">Caricamento storico...</span>
            </div>
          ) : eventi.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nessun evento di titolarità registrato</p>
              <p className="text-sm mt-1">Gli eventi verranno registrati automaticamente durante i subingressi e i rinnovi</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-400">Data</TableHead>
                  <TableHead className="text-gray-400">Posteggio</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Cedente</TableHead>
                  <TableHead className="text-gray-400">Subentrante</TableHead>
                  <TableHead className="text-gray-400">Saldo</TableHead>
                  <TableHead className="text-gray-400">Rif. SCIA</TableHead>
                  <TableHead className="text-gray-400 text-center">Dettagli</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventi.map((evento) => (
                  <React.Fragment key={evento.id}>
                    <TableRow 
                      className="border-gray-700 hover:bg-[#0f172a]/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === evento.id ? null : evento.id)}
                    >
                      <TableCell className="text-gray-300 text-sm">
                        {formatDateTime(evento.data_evento)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                          {evento.posteggio_numero || evento.posteggio_id}
                        </Badge>
                      </TableCell>
                      <TableCell>{getTipoEventoBadge(evento.tipo_evento)}</TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {evento.cedente_ragione_sociale || '-'}
                        {evento.cedente_cf && (
                          <div className="text-xs text-gray-500">{evento.cedente_cf}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {evento.subentrante_ragione_sociale || '-'}
                        {evento.subentrante_cf && (
                          <div className="text-xs text-gray-500">{evento.subentrante_cf}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {evento.saldo_trasferito !== 0 ? (
                          <span className={evento.saldo_trasferito < 0 ? 'text-red-400' : 'text-green-400'}>
                            €{Number(evento.saldo_trasferito).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-500">€0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {evento.scia_cedente_numero && (
                          <div className="text-xs">Ced: {evento.scia_cedente_numero}</div>
                        )}
                        {evento.scia_subentrante_numero && (
                          <div className="text-xs">Sub: {evento.scia_subentrante_numero}</div>
                        )}
                        {!evento.scia_cedente_numero && !evento.scia_subentrante_numero && '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-amber-400 hover:text-amber-300"
                        >
                          {expandedId === evento.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {/* Riga espansa con dettagli */}
                    {expandedId === evento.id && (
                      <TableRow className="border-gray-700 bg-[#0f172a]/70">
                        <TableCell colSpan={8} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Colonna 1: Riferimenti */}
                            <div className="space-y-2">
                              <h4 className="text-amber-400 font-semibold text-sm flex items-center gap-1">
                                <FileText className="h-4 w-4" /> Riferimenti
                              </h4>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Conc. Cedente:</span>
                                  <span className="text-gray-300">#{evento.concessione_cedente_id || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Conc. Subentrante:</span>
                                  <span className="text-gray-300">#{evento.concessione_subentrante_id || '-'}</span>
                                </div>
                                {evento.scia_cedente_numero && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">SCIA Cedente:</span>
                                    <span className="text-gray-300">{evento.scia_cedente_numero} ({formatDate(evento.scia_cedente_data)})</span>
                                  </div>
                                )}
                                {evento.scia_subentrante_numero && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">SCIA Subentrante:</span>
                                    <span className="text-gray-300">{evento.scia_subentrante_numero} ({formatDate(evento.scia_subentrante_data)})</span>
                                  </div>
                                )}
                                {evento.autorizzazione_precedente_pg && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Aut. Precedente:</span>
                                    <span className="text-gray-300">{evento.autorizzazione_precedente_pg}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Rif. Precedente:</span>
                                  <span className="text-gray-300">{evento.riferimento_precedente_tipo}: {evento.riferimento_precedente_id || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Rif. Attuale:</span>
                                  <span className="text-gray-300">{evento.riferimento_attuale_tipo}: {evento.riferimento_attuale_id || '-'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Colonna 2: Dati Archiviati */}
                            <div className="space-y-2">
                              <h4 className="text-amber-400 font-semibold text-sm flex items-center gap-1">
                                <History className="h-4 w-4" /> Dati Archiviati
                              </h4>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Presenze:</span>
                                  <span className="text-gray-300">
                                    {evento.dati_presenze_cedente_json 
                                      ? `${Array.isArray(evento.dati_presenze_cedente_json) ? evento.dati_presenze_cedente_json.length : 0} registrate`
                                      : 'Nessuna'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Graduatoria:</span>
                                  <span className="text-gray-300">
                                    {evento.dati_graduatoria_cedente_json 
                                      ? `${Array.isArray(evento.dati_graduatoria_cedente_json) ? evento.dati_graduatoria_cedente_json.length : 0} record`
                                      : 'Nessuna'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Scadenze:</span>
                                  <span className="text-gray-300">
                                    {evento.dati_scadenze_cedente_json 
                                      ? `${Array.isArray(evento.dati_scadenze_cedente_json) ? evento.dati_scadenze_cedente_json.length : 0} rate`
                                      : 'Nessuna'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Saldo trasferito:</span>
                                  <span className={evento.saldo_trasferito < 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                                    €{Number(evento.saldo_trasferito).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Colonna 3: Note */}
                            <div className="space-y-2">
                              <h4 className="text-amber-400 font-semibold text-sm flex items-center gap-1">
                                <Building2 className="h-4 w-4" /> Note
                              </h4>
                              <p className="text-sm text-gray-400">
                                {evento.note || 'Nessuna nota'}
                              </p>
                              <div className="text-xs text-gray-600 mt-2">
                                Mercato: {evento.mercato_nome || '-'}
                              </div>
                            </div>
                          </div>

                          {/* Tabella presenze archiviate (se presenti) */}
                          {evento.dati_presenze_cedente_json && Array.isArray(evento.dati_presenze_cedente_json) && evento.dati_presenze_cedente_json.length > 0 && (
                            <div className="mt-4 border-t border-gray-700 pt-3">
                              <h4 className="text-amber-400 font-semibold text-sm mb-2">
                                Presenze Archiviate del Dante Causa ({evento.dati_presenze_cedente_json.length})
                              </h4>
                              <div className="max-h-48 overflow-y-auto rounded border border-gray-700">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-gray-700 hover:bg-transparent">
                                      <TableHead className="text-gray-500 text-xs">Data</TableHead>
                                      <TableHead className="text-gray-500 text-xs">Tipo</TableHead>
                                      <TableHead className="text-gray-500 text-xs">Stato</TableHead>
                                      <TableHead className="text-gray-500 text-xs">Ingresso</TableHead>
                                      <TableHead className="text-gray-500 text-xs">Uscita</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {evento.dati_presenze_cedente_json.slice(0, 20).map((p: any, idx: number) => (
                                      <TableRow key={idx} className="border-gray-700/50">
                                        <TableCell className="text-gray-300 text-xs">{formatDate(p.data_presenza || p.date)}</TableCell>
                                        <TableCell className="text-gray-300 text-xs">{p.tipo_presenza || p.type || '-'}</TableCell>
                                        <TableCell className="text-gray-300 text-xs">{p.stato || p.status || '-'}</TableCell>
                                        <TableCell className="text-gray-300 text-xs">{p.ora_ingresso || p.check_in || '-'}</TableCell>
                                        <TableCell className="text-gray-300 text-xs">{p.ora_uscita || p.check_out || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {evento.dati_presenze_cedente_json.length > 20 && (
                                  <div className="text-center py-1 text-xs text-gray-500">
                                    ... e altre {evento.dati_presenze_cedente_json.length - 20} presenze
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Riepilogo */}
      {eventi.length > 0 && (
        <div className="flex gap-3 text-sm text-gray-500">
          <span>Totale eventi: {eventi.length}</span>
          <span>|</span>
          <span>Subingressi: {eventi.filter(e => e.tipo_evento === 'SUBINGRESSO').length}</span>
          <span>|</span>
          <span>Rinnovi: {eventi.filter(e => e.tipo_evento === 'RINNOVO').length}</span>
        </div>
      )}
    </div>
  );
}
