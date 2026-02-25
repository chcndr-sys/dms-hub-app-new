/**
 * GestioneCorsiAssociazionePanel - CRUD corsi + iscrizioni + rilascio attestati
 * Visibile solo durante impersonificazione associazione.
 *
 * Endpoint:
 *   GET    /api/associazioni/:id/corsi
 *   POST   /api/associazioni/:id/corsi
 *   PUT    /api/associazioni/:id/corsi/:cid
 *   DELETE /api/associazioni/:id/corsi/:cid
 *   GET    /api/associazioni/:id/iscrizioni-corsi
 *   POST   /api/associazioni/:id/corsi/:cid/rilascia-attestato
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
  BookOpen, Plus, Edit3, Trash2, Loader2, RefreshCw, Search,
  CheckCircle2, Users, Calendar, Clock, Euro, Award, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { getImpersonationParams, authenticatedFetch } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE = MIHUB_API_BASE_URL;

interface Corso {
  id: number;
  titolo: string;
  descrizione: string;
  categoria: string;
  durata_ore: number;
  prezzo: number;
  data_inizio: string;
  data_fine: string;
  posti_totali: number;
  posti_occupati: number;
  sede: string;
  attivo: boolean;
}

interface IscrizioneCorso {
  id: number;
  corso_id: number;
  corso_titolo: string;
  impresa_id: number;
  impresa_nome: string;
  stato: 'iscritta' | 'completata' | 'annullata';
  data_iscrizione: string;
  attestato_rilasciato: boolean;
}

const EMPTY_CORSO: Omit<Corso, 'id' | 'posti_occupati'> = {
  titolo: '', descrizione: '', categoria: 'sicurezza',
  durata_ore: 8, prezzo: 0, data_inizio: '', data_fine: '',
  posti_totali: 20, sede: '', attivo: true,
};

const CATEGORIE_CORSI = ['sicurezza', 'haccp', 'normativa', 'digitale', 'marketing', 'gestione', 'altro'];

export default function GestioneCorsiAssociazionePanel() {
  const [corsi, setCorsi] = useState<Corso[]>([]);
  const [iscrizioni, setIscrizioni] = useState<IscrizioneCorso[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('corsi');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_CORSO);
  const [saving, setSaving] = useState(false);
  const [selectedCorsoId, setSelectedCorsoId] = useState<number | null>(null);

  const impState = getImpersonationParams();
  const associazioneId = impState.associazioneId;
  const associazioneNome = impState.associazioneNome
    ? decodeURIComponent(impState.associazioneNome)
    : 'Associazione';

  const loadData = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      const [corsiRes, iscrizioniRes] = await Promise.all([
        fetch(`${API_BASE}/api/associazioni/${associazioneId}/corsi`),
        fetch(`${API_BASE}/api/associazioni/${associazioneId}/iscrizioni-corsi`),
      ]);
      const cData = await corsiRes.json();
      if (cData.success && cData.data) setCorsi(cData.data);
      const iData = await iscrizioniRes.json();
      if (iData.success && iData.data) setIscrizioni(iData.data);
    } catch (error) {
      console.error('Errore caricamento corsi:', error);
    } finally {
      setLoading(false);
    }
  }, [associazioneId]);

  useEffect(() => { loadData(); }, [loadData]);

  const openNew = () => { setForm(EMPTY_CORSO); setEditingId(null); setShowForm(true); };
  const openEdit = (c: Corso) => {
    const { id, posti_occupati, ...rest } = c;
    setForm(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const saveCorso = async () => {
    if (!associazioneId || !form.titolo.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? `${API_BASE}/api/associazioni/${associazioneId}/corsi/${editingId}`
        : `${API_BASE}/api/associazioni/${associazioneId}/corsi`;
      const res = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Corso aggiornato' : 'Corso creato');
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

  const deleteCorso = async (id: number) => {
    if (!associazioneId) return;
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/associazioni/${associazioneId}/corsi/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Corso eliminato');
        loadData();
      } else {
        toast.error(data.error || 'Errore eliminazione');
      }
    } catch (error) {
      toast.error('Errore di rete');
    }
  };

  const rilasciaAttestato = async (corsoId: number, iscrizioneId: number) => {
    if (!associazioneId) return;
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/associazioni/${associazioneId}/corsi/${corsoId}/rilascia-attestato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iscrizione_id: iscrizioneId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Attestato rilasciato');
        loadData();
      } else {
        toast.error(data.error || 'Errore rilascio attestato');
      }
    } catch (error) {
      toast.error('Errore di rete');
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

  const iscrittiPerCorso = (corsoId: number) => iscrizioni.filter(i => i.corso_id === corsoId);
  const iscrizioniDaCompletare = iscrizioni.filter(i => i.stato === 'iscritta' && !i.attestato_rilasciato).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#8b5cf6]" />
            Gestione Corsi
            <Badge variant="outline" className="ml-2 text-[#3b82f6] border-[#3b82f6]/50">
              {associazioneNome}
            </Badge>
            {iscrizioniDaCompletare > 0 && (
              <Badge className="bg-[#f59e0b] text-white ml-2">{iscrizioniDaCompletare} in corso</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="border-[#3b82f6]/30 text-[#3b82f6]">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={openNew} className="bg-[#8b5cf6] hover:bg-[#8b5cf6]/80 text-white">
              <Plus className="h-4 w-4 mr-1" /> Nuovo Corso
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-xl font-bold text-[#8b5cf6]">{corsi.length}</p>
            <p className="text-xs text-[#e8fbff]/50">Corsi</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#3b82f6]/30">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-xl font-bold text-[#3b82f6]">{iscrizioni.length}</p>
            <p className="text-xs text-[#e8fbff]/50">Iscrizioni</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#10b981]/30">
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-xl font-bold text-[#10b981]">{iscrizioni.filter(i => i.attestato_rilasciato).length}</p>
            <p className="text-xs text-[#e8fbff]/50">Attestati</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0b1220] border border-[#3b82f6]/20">
          <TabsTrigger value="corsi" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <BookOpen className="h-4 w-4 mr-1" /> Corsi ({corsi.length})
          </TabsTrigger>
          <TabsTrigger value="iscrizioni" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <Users className="h-4 w-4 mr-1" /> Iscrizioni ({iscrizioni.length})
          </TabsTrigger>
        </TabsList>

        {/* Corsi */}
        <TabsContent value="corsi">
          {showForm && (
            <Card className="bg-[#1a2332] border-[#8b5cf6]/30 mb-4">
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-sm font-medium text-[#e8fbff]">
                  {editingId ? 'Modifica Corso' : 'Nuovo Corso'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <Label className="text-xs text-[#e8fbff]/50">Titolo</Label>
                    <Input className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Categoria</Label>
                    <select className="w-full mt-1 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff]"
                      value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                      {CATEGORIE_CORSI.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Durata (ore)</Label>
                    <Input type="number" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.durata_ore} onChange={e => setForm(f => ({ ...f, durata_ore: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Prezzo (EUR)</Label>
                    <Input type="number" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.prezzo} onChange={e => setForm(f => ({ ...f, prezzo: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Posti totali</Label>
                    <Input type="number" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.posti_totali} onChange={e => setForm(f => ({ ...f, posti_totali: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Data inizio</Label>
                    <Input type="date" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.data_inizio} onChange={e => setForm(f => ({ ...f, data_inizio: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-[#e8fbff]/50">Data fine</Label>
                    <Input type="date" className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                      value={form.data_fine} onChange={e => setForm(f => ({ ...f, data_fine: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-[#e8fbff]/50">Sede</Label>
                    <Input className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]" placeholder="Indirizzo sede corso"
                      value={form.sede} onChange={e => setForm(f => ({ ...f, sede: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-[#e8fbff]/50">Descrizione</Label>
                    <textarea className="w-full mt-1 p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-sm text-[#e8fbff] resize-y"
                      rows={2} value={form.descrizione} onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)}
                    className="border-[#ef4444]/30 text-[#ef4444]">Annulla</Button>
                  <Button size="sm" onClick={saveCorso} disabled={saving || !form.titolo.trim()}
                    className="bg-[#8b5cf6] hover:bg-[#8b5cf6]/80 text-white">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    {editingId ? 'Salva' : 'Crea'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-4 space-y-3">
              {corsi.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Nessun corso configurato</p>
                  <Button variant="outline" size="sm" onClick={openNew} className="mt-3 border-[#8b5cf6]/30 text-[#8b5cf6]">
                    <Plus className="h-4 w-4 mr-1" /> Crea il primo corso
                  </Button>
                </div>
              ) : (
                corsi.map(c => (
                  <div key={c.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#e8fbff]">{c.titolo}</span>
                          <Badge variant="outline" className="text-[10px] text-[#e8fbff]/60 border-[#e8fbff]/20">
                            {c.categoria}
                          </Badge>
                          {!c.attivo && <Badge className="bg-[#ef4444]/20 text-[#ef4444] text-[10px]">Disattivo</Badge>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-[#e8fbff]/50">
                          <span><Clock className="h-3 w-3 inline mr-1" />{c.durata_ore}h</span>
                          <span><Euro className="h-3 w-3 inline mr-1" />{c.prezzo} EUR</span>
                          <span><Users className="h-3 w-3 inline mr-1" />{c.posti_occupati}/{c.posti_totali} posti</span>
                          {c.data_inizio && <span><Calendar className="h-3 w-3 inline mr-1" />{c.data_inizio}</span>}
                          {c.sede && <span><MapPin className="h-3 w-3 inline mr-1" />{c.sede}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedCorsoId(c.id); setActiveTab('iscrizioni'); }}
                          className="text-[#3b82f6] h-8 w-8" title="Vedi iscritti">
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="text-[#3b82f6] h-8 w-8">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCorso(c.id)} className="text-[#ef4444] h-8 w-8">
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

        {/* Iscrizioni */}
        <TabsContent value="iscrizioni">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-4 space-y-3">
              {/* Filtro per corso */}
              <select
                className="w-full bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff]"
                value={selectedCorsoId ?? ''}
                onChange={e => setSelectedCorsoId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Tutti i corsi</option>
                {corsi.map(c => <option key={c.id} value={c.id}>{c.titolo}</option>)}
              </select>

              {iscrizioni.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Nessuna iscrizione</p>
                </div>
              ) : (
                iscrizioni
                  .filter(i => !selectedCorsoId || i.corso_id === selectedCorsoId)
                  .map(i => (
                    <div key={i.id} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                      <div>
                        <p className="text-sm text-[#e8fbff]">{i.impresa_nome}</p>
                        <p className="text-xs text-[#e8fbff]/50">
                          {i.corso_titolo} · {new Date(i.data_iscrizione).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {i.attestato_rilasciato ? (
                          <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">
                            <Award className="h-3 w-3 mr-1" /> Attestato
                          </Badge>
                        ) : i.stato === 'iscritta' ? (
                          <Button size="sm" onClick={() => rilasciaAttestato(i.corso_id, i.id)}
                            className="bg-[#10b981] hover:bg-[#10b981]/80 text-white h-7 text-xs">
                            <Award className="h-3 w-3 mr-1" /> Rilascia Attestato
                          </Button>
                        ) : (
                          <Badge className="bg-[#ef4444]/20 text-[#ef4444]">{i.stato}</Badge>
                        )}
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
