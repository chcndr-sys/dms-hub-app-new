/**
 * GestioneServiziAssociazionePanel - CRUD servizi dell'associazione + richieste ricevute
 * Visibile solo durante impersonificazione associazione.
 *
 * Endpoint:
 *   GET    /api/associazioni/:id/servizi
 *   POST   /api/associazioni/:id/servizi
 *   PUT    /api/associazioni/:id/servizi/:sid
 *   DELETE /api/associazioni/:id/servizi/:sid
 *   GET    /api/associazioni/:id/richieste-servizi
 *   PUT    /api/associazioni/:id/richieste-servizi/:rid/stato
 *
 * @version 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Briefcase, Plus, Edit3, Trash2, Loader2, RefreshCw,
  Search, CheckCircle2, XCircle, Clock, Euro, Package,
  ArrowRight, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { getImpersonationParams, authenticatedFetch } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE = MIHUB_API_BASE_URL;

interface Servizio {
  id: number;
  nome: string;
  descrizione: string;
  categoria: string;
  prezzo_base: number;
  prezzo_associati: number;
  tempo_medio_gg: number;
  attivo: boolean;
}

interface RichiestaServizio {
  id: number;
  servizio_id: number;
  servizio_nome: string;
  impresa_id: number;
  impresa_nome: string;
  stato: 'in_attesa' | 'in_lavorazione' | 'completata' | 'rifiutata';
  data_richiesta: string;
  note?: string;
}

const EMPTY_SERVIZIO: Omit<Servizio, 'id'> = {
  nome: '', descrizione: '', categoria: 'consulenza',
  prezzo_base: 0, prezzo_associati: 0, tempo_medio_gg: 7, attivo: true,
};

const CATEGORIE = ['consulenza', 'assistenza', 'formazione', 'legale', 'fiscale', 'tecnica', 'altro'];

const STATO_COLORS: Record<RichiestaServizio['stato'], string> = {
  in_attesa: '#f59e0b',
  in_lavorazione: '#3b82f6',
  completata: '#10b981',
  rifiutata: '#ef4444',
};

export default function GestioneServiziAssociazionePanel() {
  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [richieste, setRichieste] = useState<RichiestaServizio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('catalogo');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_SERVIZIO);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const impState = getImpersonationParams();
  const associazioneId = impState.associazioneId;
  const associazioneNome = impState.associazioneNome
    ? decodeURIComponent(impState.associazioneNome)
    : 'Associazione';

  const loadData = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      const [serviziRes, richiesteRes] = await Promise.all([
        fetch(`${API_BASE}/api/associazioni/${associazioneId}/servizi`),
        fetch(`${API_BASE}/api/associazioni/${associazioneId}/richieste-servizi`),
      ]);
      const sData = await serviziRes.json();
      if (sData.success && sData.data) setServizi(sData.data);
      const rData = await richiesteRes.json();
      if (rData.success && rData.data) setRichieste(rData.data);
    } catch (error) {
      console.error('Errore caricamento servizi:', error);
    } finally {
      setLoading(false);
    }
  }, [associazioneId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openNew = () => { setForm(EMPTY_SERVIZIO); setEditingId(null); setShowForm(true); };
  const openEdit = (s: Servizio) => {
    const { id, ...rest } = s;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const saveServizio = async () => {
    if (!associazioneId || !form.nome.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API_BASE}/api/associazioni/${associazioneId}/servizi/${editingId}`
        : `${API_BASE}/api/associazioni/${associazioneId}/servizi`;
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Servizio aggiornato' : 'Servizio creato');
        setShowForm(false);
        loadData();
      } else {
        toast.error(data.error || 'Errore salvataggio');
      }
    } catch (error) {
      toast.error('Errore di rete');
    } finally {
      setSaving(false);
    }
  };

  const deleteServizio = async (id: number) => {
    if (!associazioneId) return;
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/associazioni/${associazioneId}/servizi/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Servizio eliminato');
        loadData();
      } else {
        toast.error(data.error || 'Errore eliminazione');
      }
    } catch (error) {
      toast.error('Errore di rete');
    }
  };

  const updateStatoRichiesta = async (rid: number, stato: RichiestaServizio['stato']) => {
    if (!associazioneId) return;
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/associazioni/${associazioneId}/richieste-servizi/${rid}/stato`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Richiesta ${stato === 'completata' ? 'completata' : stato === 'rifiutata' ? 'rifiutata' : 'aggiornata'}`);
        loadData();
      }
    } catch (error) {
      toast.error('Errore aggiornamento');
    }
  };

  if (!associazioneId) {
    return (
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-[#e8fbff]/50">Nessuna associazione selezionata</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
        </CardContent>
      </Card>
    );
  }

  const richiesteInAttesa = richieste.filter(r => r.stato === 'in_attesa').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Package className="h-5 w-5 text-[#f59e0b]" />
            Gestione Servizi
            <Badge variant="outline" className="ml-2 text-[#3b82f6] border-[#3b82f6]/50">
              {associazioneNome}
            </Badge>
            {richiesteInAttesa > 0 && (
              <Badge className="bg-[#ef4444] text-white ml-2">{richiesteInAttesa} nuove</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="border-[#3b82f6]/30 text-[#3b82f6]">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={openNew} className="bg-[#10b981] hover:bg-[#10b981]/80 text-white">
              <Plus className="h-4 w-4 mr-1" /> Nuovo Servizio
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0b1220] border border-[#3b82f6]/20">
          <TabsTrigger value="catalogo" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <Package className="h-4 w-4 mr-1" /> Catalogo ({servizi.length})
          </TabsTrigger>
          <TabsTrigger value="richieste" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <Clock className="h-4 w-4 mr-1" /> Richieste ({richieste.length})
            {richiesteInAttesa > 0 && <Badge className="bg-[#ef4444] text-white ml-1 text-[10px] h-4">{richiesteInAttesa}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Catalogo Servizi */}
        <TabsContent value="catalogo">
          {/* Form nuovo/modifica */}
          {showForm && (
            <Card className="bg-[#1a2332] border-[#10b981]/30 mb-4">
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-sm font-medium text-[#e8fbff]">
                  {editingId ? 'Modifica Servizio' : 'Nuovo Servizio'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Nome</Label>
                    <Input className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Categoria</Label>
                    <select className="w-full mt-1 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff]"
                      value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                      {CATEGORIE.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-[#e8fbff]/50">Descrizione</Label>
                    <textarea className="w-full mt-1 p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-sm text-[#e8fbff] resize-y"
                      rows={2} value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Prezzo Base (EUR)</Label>
                    <Input type="number" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.prezzo_base} onChange={e => setForm(f => ({ ...f, prezzo_base: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Prezzo Associati (EUR)</Label>
                    <Input type="number" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.prezzo_associati} onChange={e => setForm(f => ({ ...f, prezzo_associati: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Tempo medio (giorni)</Label>
                    <Input type="number" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.tempo_medio_gg} onChange={e => setForm(f => ({ ...f, tempo_medio_gg: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}
                    className="border-[#ef4444]/30 text-[#ef4444]">Annulla</Button>
                  <Button size="sm" onClick={saveServizio} disabled={saving || !form.nome.trim()}
                    className="bg-[#10b981] hover:bg-[#10b981]/80 text-white">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    {editingId ? 'Salva' : 'Crea'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista servizi */}
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-4 space-y-3">
              {servizi.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Nessun servizio configurato</p>
                  <Button variant="outline" size="sm" onClick={openNew} className="mt-3 border-[#3b82f6]/30 text-[#3b82f6]">
                    <Plus className="h-4 w-4 mr-1" /> Crea il primo servizio
                  </Button>
                </div>
              ) : (
                servizi.map(s => (
                  <div key={s.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#e8fbff]">{s.nome}</span>
                          <Badge variant="outline" className="text-[10px] text-[#e8fbff]/60 border-[#e8fbff]/20">
                            {s.categoria}
                          </Badge>
                          {!s.attivo && <Badge className="bg-[#ef4444]/20 text-[#ef4444] text-[10px]">Disattivo</Badge>}
                        </div>
                        <p className="text-xs text-[#e8fbff]/50 mt-1">{s.descrizione}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4">
                          <p className="text-xs text-[#e8fbff]/50">Base: <span className="text-[#e8fbff]">{s.prezzo_base} EUR</span></p>
                          <p className="text-xs text-[#10b981]">Soci: {s.prezzo_associati} EUR</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="text-[#3b82f6] h-8 w-8">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteServizio(s.id)} className="text-[#ef4444] h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Richieste Ricevute */}
        <TabsContent value="richieste">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e8fbff]/30" />
                <Input className="pl-9 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                  placeholder="Cerca richieste..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>

              {richieste.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Nessuna richiesta ricevuta</p>
                </div>
              ) : (
                richieste
                  .filter(r => !searchTerm || r.impresa_nome?.toLowerCase().includes(searchTerm.toLowerCase()) || r.servizio_nome?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(r => (
                    <div key={r.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#e8fbff]">{r.servizio_nome}</span>
                            <ArrowRight className="h-3 w-3 text-[#e8fbff]/30" />
                            <span className="text-sm text-[#e8fbff]/70">{r.impresa_nome}</span>
                          </div>
                          <p className="text-xs text-[#e8fbff]/40 mt-1">
                            {new Date(r.data_richiesta).toLocaleDateString('it-IT')}
                            {r.note && ` · ${r.note}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge style={{ backgroundColor: `${STATO_COLORS[r.stato]}20`, color: STATO_COLORS[r.stato], borderColor: `${STATO_COLORS[r.stato]}30` }}>
                            {r.stato.replace('_', ' ')}
                          </Badge>
                          {r.stato === 'in_attesa' && (
                            <>
                              <Button size="sm" onClick={() => updateStatoRichiesta(r.id, 'in_lavorazione')}
                                className="bg-[#3b82f6] hover:bg-[#3b82f6]/80 text-white h-7 text-xs">
                                Prendi in carico
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatoRichiesta(r.id, 'rifiutata')}
                                className="border-[#ef4444]/30 text-[#ef4444] h-7 text-xs">
                                Rifiuta
                              </Button>
                            </>
                          )}
                          {r.stato === 'in_lavorazione' && (
                            <Button size="sm" onClick={() => updateStatoRichiesta(r.id, 'completata')}
                              className="bg-[#10b981] hover:bg-[#10b981]/80 text-white h-7 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Completa
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
