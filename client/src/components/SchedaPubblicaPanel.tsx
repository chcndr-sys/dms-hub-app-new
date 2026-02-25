/**
 * SchedaPubblicaPanel - Gestione scheda pubblica dell'associazione
 * Visibile solo durante impersonificazione associazione.
 * Permette di editare le informazioni che le imprese vedono prima di associarsi.
 *
 * Endpoint:
 *   GET  /api/associazioni/:id/scheda-pubblica
 *   PUT  /api/associazioni/:id/scheda-pubblica
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
  Globe, Save, Eye, Edit3, Plus, Trash2, Loader2,
  MapPin, Clock, Phone, Mail, User, FileText, Gift, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { getImpersonationParams, authenticatedFetch } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE = MIHUB_API_BASE_URL;

interface SchedaPubblica {
  descrizione: string;
  benefici: string[];
  sedi: Array<{ nome: string; indirizzo: string; orari: string }>;
  contatti: { telefono?: string; email?: string; referente_nome?: string; referente_ruolo?: string };
  logo_url: string;
  servizi_count: number;
  corsi_count: number;
  tesserati_count: number;
}

const EMPTY_SCHEDA: SchedaPubblica = {
  descrizione: '',
  benefici: [],
  sedi: [],
  contatti: {},
  logo_url: '',
  servizi_count: 0,
  corsi_count: 0,
  tesserati_count: 0,
};

export default function SchedaPubblicaPanel() {
  const [scheda, setScheda] = useState<SchedaPubblica>(EMPTY_SCHEDA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

  const impState = getImpersonationParams();
  const associazioneId = impState.associazioneId;
  const associazioneNome = impState.associazioneNome
    ? decodeURIComponent(impState.associazioneNome)
    : 'Associazione';

  const loadScheda = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/associazioni/${associazioneId}/scheda-pubblica`);
      const data = await res.json();
      if (data.success && data.data) {
        setScheda({ ...EMPTY_SCHEDA, ...data.data });
      }
    } catch (error) {
      console.error('Errore caricamento scheda pubblica:', error);
    } finally {
      setLoading(false);
    }
  }, [associazioneId]);

  useEffect(() => { loadScheda(); }, [loadScheda]);

  const saveScheda = async () => {
    if (!associazioneId) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/associazioni/${associazioneId}/scheda-pubblica`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheda),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Scheda pubblica aggiornata');
        setEditMode(false);
      } else {
        toast.error(data.error || 'Errore salvataggio');
      }
    } catch (error) {
      toast.error('Errore di rete');
    } finally {
      setSaving(false);
    }
  };

  const addBeneficio = () => setScheda(s => ({ ...s, benefici: [...s.benefici, ''] }));
  const removeBeneficio = (i: number) => setScheda(s => ({ ...s, benefici: s.benefici.filter((_, idx) => idx !== i) }));
  const updateBeneficio = (i: number, val: string) => setScheda(s => ({ ...s, benefici: s.benefici.map((b, idx) => idx === i ? val : b) }));

  const addSede = () => setScheda(s => ({ ...s, sedi: [...s.sedi, { nome: '', indirizzo: '', orari: '' }] }));
  const removeSede = (i: number) => setScheda(s => ({ ...s, sedi: s.sedi.filter((_, idx) => idx !== i) }));
  const updateSede = (i: number, field: keyof SchedaPubblica['sedi'][0], val: string) =>
    setScheda(s => ({ ...s, sedi: s.sedi.map((sede, idx) => idx === i ? { ...sede, [field]: val } : sede) }));

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#3b82f6]" />
            Scheda Pubblica
            <Badge variant="outline" className="ml-2 text-[#3b82f6] border-[#3b82f6]/50">
              {associazioneNome}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditMode(false); loadScheda(); }}
                  className="border-[#ef4444]/30 text-[#ef4444]">
                  Annulla
                </Button>
                <Button size="sm" onClick={saveScheda} disabled={saving}
                  className="bg-[#10b981] hover:bg-[#10b981]/80 text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Salva
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}
                className="border-[#3b82f6]/30 text-[#3b82f6]">
                <Edit3 className="h-4 w-4 mr-1" /> Modifica
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0b1220] border border-[#3b82f6]/20">
          <TabsTrigger value="preview" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <Eye className="h-4 w-4 mr-1" /> Anteprima
          </TabsTrigger>
          <TabsTrigger value="descrizione" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <FileText className="h-4 w-4 mr-1" /> Descrizione
          </TabsTrigger>
          <TabsTrigger value="benefici" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <Gift className="h-4 w-4 mr-1" /> Benefici
          </TabsTrigger>
          <TabsTrigger value="sedi" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <MapPin className="h-4 w-4 mr-1" /> Sedi & Contatti
          </TabsTrigger>
        </TabsList>

        {/* Preview */}
        <TabsContent value="preview">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10 text-center">
                  <p className="text-2xl font-bold text-[#3b82f6]">{scheda.tesserati_count}</p>
                  <p className="text-xs text-[#e8fbff]/50">Tesserati</p>
                </div>
                <div className="p-3 bg-[#0b1220] rounded-lg border border-[#10b981]/10 text-center">
                  <p className="text-2xl font-bold text-[#10b981]">{scheda.servizi_count}</p>
                  <p className="text-xs text-[#e8fbff]/50">Servizi</p>
                </div>
                <div className="p-3 bg-[#0b1220] rounded-lg border border-[#f59e0b]/10 text-center">
                  <p className="text-2xl font-bold text-[#f59e0b]">{scheda.corsi_count}</p>
                  <p className="text-xs text-[#e8fbff]/50">Corsi</p>
                </div>
              </div>

              {/* Descrizione */}
              <div>
                <h4 className="text-sm font-medium text-[#e8fbff]/70 mb-2">Chi siamo</h4>
                <p className="text-sm text-[#e8fbff]">
                  {scheda.descrizione || <span className="text-[#e8fbff]/30 italic">Nessuna descrizione. Clicca "Modifica" per aggiungerne una.</span>}
                </p>
              </div>

              {/* Benefici */}
              {scheda.benefici.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#e8fbff]/70 mb-2">Vantaggi per gli associati</h4>
                  <ul className="space-y-1">
                    {scheda.benefici.map((b, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[#e8fbff]">
                        <span className="text-[#10b981]">&#10003;</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sedi */}
              {scheda.sedi.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#e8fbff]/70 mb-2">Sedi</h4>
                  <div className="space-y-2">
                    {scheda.sedi.map((s, i) => (
                      <div key={i} className="p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                        <p className="text-sm font-medium text-[#e8fbff]">{s.nome || 'Sede'}</p>
                        <p className="text-xs text-[#e8fbff]/50"><MapPin className="h-3 w-3 inline mr-1" />{s.indirizzo}</p>
                        {s.orari && <p className="text-xs text-[#e8fbff]/50"><Clock className="h-3 w-3 inline mr-1" />{s.orari}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contatti */}
              {(scheda.contatti.telefono || scheda.contatti.email || scheda.contatti.referente_nome) && (
                <div>
                  <h4 className="text-sm font-medium text-[#e8fbff]/70 mb-2">Contatti</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {scheda.contatti.referente_nome && (
                      <div className="flex items-center gap-2 text-sm text-[#e8fbff]">
                        <User className="h-4 w-4 text-[#3b82f6]" />
                        {scheda.contatti.referente_nome} {scheda.contatti.referente_ruolo && `(${scheda.contatti.referente_ruolo})`}
                      </div>
                    )}
                    {scheda.contatti.telefono && (
                      <div className="flex items-center gap-2 text-sm text-[#e8fbff]">
                        <Phone className="h-4 w-4 text-[#3b82f6]" /> {scheda.contatti.telefono}
                      </div>
                    )}
                    {scheda.contatti.email && (
                      <div className="flex items-center gap-2 text-sm text-[#e8fbff]">
                        <Mail className="h-4 w-4 text-[#3b82f6]" /> {scheda.contatti.email}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Descrizione edit */}
        <TabsContent value="descrizione">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-[#e8fbff]/70">Descrizione</Label>
                <textarea
                  className="w-full mt-1 p-3 bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg text-sm text-[#e8fbff] resize-y min-h-[120px] disabled:opacity-50"
                  rows={5}
                  disabled={!editMode}
                  placeholder="Descrivi la tua associazione, la storia, la missione..."
                  value={scheda.descrizione}
                  onChange={e => setScheda(s => ({ ...s, descrizione: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">URL Logo</Label>
                <Input
                  className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                  disabled={!editMode}
                  placeholder="https://..."
                  value={scheda.logo_url}
                  onChange={e => setScheda(s => ({ ...s, logo_url: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefici edit */}
        <TabsContent value="benefici">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6 space-y-3">
              {scheda.benefici.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff] flex-1"
                    disabled={!editMode}
                    value={b}
                    placeholder="Es: Assistenza SCIA e pratiche burocratiche"
                    onChange={e => updateBeneficio(i, e.target.value)}
                  />
                  {editMode && (
                    <Button variant="ghost" size="icon" onClick={() => removeBeneficio(i)} className="text-[#ef4444] hover:text-[#ef4444]/80">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editMode && (
                <Button variant="outline" size="sm" onClick={addBeneficio} className="border-[#3b82f6]/30 text-[#3b82f6]">
                  <Plus className="h-4 w-4 mr-1" /> Aggiungi Beneficio
                </Button>
              )}
              {!editMode && scheda.benefici.length === 0 && (
                <p className="text-sm text-[#e8fbff]/30 italic text-center py-4">Nessun beneficio configurato</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sedi & Contatti edit */}
        <TabsContent value="sedi">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6 space-y-4">
              <h4 className="text-sm font-medium text-[#e8fbff]/70">Sedi</h4>
              {scheda.sedi.map((s, i) => (
                <div key={i} className="p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#e8fbff]/50">Sede #{i + 1}</span>
                    {editMode && (
                      <Button variant="ghost" size="icon" onClick={() => removeSede(i)} className="text-[#ef4444] hover:text-[#ef4444]/80 h-6 w-6">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Input className="bg-[#1a2332] border-[#3b82f6]/20 text-[#e8fbff]" disabled={!editMode}
                    placeholder="Nome sede" value={s.nome} onChange={e => updateSede(i, 'nome', e.target.value)} />
                  <Input className="bg-[#1a2332] border-[#3b82f6]/20 text-[#e8fbff]" disabled={!editMode}
                    placeholder="Indirizzo" value={s.indirizzo} onChange={e => updateSede(i, 'indirizzo', e.target.value)} />
                  <Input className="bg-[#1a2332] border-[#3b82f6]/20 text-[#e8fbff]" disabled={!editMode}
                    placeholder="Orari (es: Lun-Ven 9-17)" value={s.orari} onChange={e => updateSede(i, 'orari', e.target.value)} />
                </div>
              ))}
              {editMode && (
                <Button variant="outline" size="sm" onClick={addSede} className="border-[#3b82f6]/30 text-[#3b82f6]">
                  <Plus className="h-4 w-4 mr-1" /> Aggiungi Sede
                </Button>
              )}

              <h4 className="text-sm font-medium text-[#e8fbff]/70 mt-6">Contatti per nuove adesioni</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#e8fbff]/50">Referente</Label>
                  <Input className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]" disabled={!editMode}
                    placeholder="Nome e cognome" value={scheda.contatti.referente_nome || ''}
                    onChange={e => setScheda(s => ({ ...s, contatti: { ...s.contatti, referente_nome: e.target.value } }))} />
                </div>
                <div>
                  <Label className="text-xs text-[#e8fbff]/50">Ruolo</Label>
                  <Input className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]" disabled={!editMode}
                    placeholder="Es: Segretario" value={scheda.contatti.referente_ruolo || ''}
                    onChange={e => setScheda(s => ({ ...s, contatti: { ...s.contatti, referente_ruolo: e.target.value } }))} />
                </div>
                <div>
                  <Label className="text-xs text-[#e8fbff]/50">Telefono</Label>
                  <Input className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]" disabled={!editMode}
                    placeholder="+39..." value={scheda.contatti.telefono || ''}
                    onChange={e => setScheda(s => ({ ...s, contatti: { ...s.contatti, telefono: e.target.value } }))} />
                </div>
                <div>
                  <Label className="text-xs text-[#e8fbff]/50">Email</Label>
                  <Input className="mt-1 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]" disabled={!editMode}
                    placeholder="info@..." value={scheda.contatti.email || ''}
                    onChange={e => setScheda(s => ({ ...s, contatti: { ...s.contatti, email: e.target.value } }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
