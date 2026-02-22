/**
 * TesseratiAssociazionePanel - Pannello Tesserati dell'Associazione
 * Mostra le imprese tesserate (che pagano la quota annuale) di un'associazione
 * Con gestione CRUD: aggiunta, revoca tesseramenti
 * Con scheda dettaglio associato: dati tessera, stato pagamento, pratiche SCIA, concessioni
 * Visibile solo durante impersonificazione associazione
 *
 * Endpoint backend:
 *   GET    /api/associazioni/:id/tesseramenti?stats_only=true  → stats
 *   GET    /api/associazioni/:id/tesseramenti                  → lista con dati impresa in JOIN
 *   GET    /api/associazioni/:id/tesseramenti/:tid/scheda      → scheda completa associato
 *   POST   /api/associazioni/:id/tesseramenti                  → crea tesseramento
 *   PUT    /api/associazioni/:id/tesseramenti/:tid              → aggiorna stato
 *   DELETE /api/associazioni/:id/tesseramenti/:tid              → rimuovi
 *
 * @version 4.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, CheckCircle, XCircle, CreditCard, Plus,
  RefreshCw, Loader2, Search, Building2, Calendar,
  UserMinus, X, Save, Eye, FileText, ShieldCheck,
  MapPin, Phone, Mail, Store, Truck, AlertTriangle,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getImpersonationParams } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

const API_BASE_URL = MIHUB_API_BASE_URL;

interface Tesseramento {
  id: number;
  associazione_id: number;
  impresa_id: number;
  anno: number;
  data_tesseramento: string;
  data_scadenza?: string;
  quota_annuale?: number;
  stato: 'attivo' | 'scaduto' | 'sospeso' | 'revocato';
  note?: string;
  // Dati impresa dal JOIN
  impresa_nome?: string;
  impresa_codice_fiscale?: string;
  impresa_partita_iva?: string;
  impresa_citta?: string;
}

interface TesseramentiStats {
  totale_tesserati: number;
  attivi: number;
  scaduti: number;
  sospesi: number;
  quota_totale_incassata?: number;
}

interface ImpresaSearch {
  id: number;
  denominazione: string;
  codice_fiscale?: string;
  partita_iva?: string;
  comune?: string;
}

interface SchedaAssociato {
  tesseramento: {
    id: number;
    impresa_nome: string;
    impresa_cf: string;
    impresa_piva: string;
    impresa_pec: string;
    impresa_telefono: string;
    impresa_email: string;
    impresa_indirizzo: string;
    impresa_cap: string;
    impresa_comune: string;
    impresa_provincia: string;
    impresa_settore: string;
    tipo_impresa: 'ambulante' | 'negozio_fisso';
    descrizione_ateco: string;
    codice_ateco: string;
    hub_shop_id: number | null;
    data_iscrizione: string;
    data_scadenza: string | null;
    data_rinnovo: string | null;
    importo_annuale: string;
    importo_pagato: string;
    metodo_pagamento: string | null;
    stato: string;
    stato_pagamento: 'pagato' | 'da_pagare' | 'non_definito';
    tessera_scaduta: boolean;
    numero_tessera: string | null;
    categoria_associativa: string | null;
    settore_merceologico: string | null;
    note: string | null;
  };
  pratiche: Array<{
    id: string;
    cui: string;
    tipo_pratica: string;
    stato: string;
    score: number;
    created_at: string;
    sub_ragione_sociale: string;
    mercato_nome: string;
    posteggio_numero: string;
  }>;
  concessioni: Array<{
    id: number;
    numero_protocollo: string;
    tipo: string;
    stato: string;
    mercato_nome: string;
    posteggio_numero: string;
    data_scadenza: string;
    concessionario_nome: string;
  }>;
}

const STATO_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  attivo: { text: 'text-[#10b981]', border: 'border-[#10b981]/50', bg: 'bg-[#10b981]' },
  ATTIVO: { text: 'text-[#10b981]', border: 'border-[#10b981]/50', bg: 'bg-[#10b981]' },
  scaduto: { text: 'text-[#ef4444]', border: 'border-[#ef4444]/50', bg: 'bg-[#ef4444]' },
  sospeso: { text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/50', bg: 'bg-[#f59e0b]' },
  revocato: { text: 'text-[#6b7280]', border: 'border-[#6b7280]/50', bg: 'bg-[#6b7280]' },
};

const STATO_LABELS: Record<string, string> = {
  attivo: 'Attivo',
  ATTIVO: 'Attivo',
  scaduto: 'Scaduto',
  sospeso: 'Sospeso',
  revocato: 'Revocato',
};

export default function PresenzeAssociatiPanel() {
  const [tesseramenti, setTesseramenti] = useState<Tesseramento[]>([]);
  const [stats, setStats] = useState<TesseramentiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setSaving] = useState(false);

  // Scheda associato
  const [schedaOpen, setSchedaOpen] = useState(false);
  const [schedaLoading, setSchedaLoading] = useState(false);
  const [schedaData, setSchedaData] = useState<SchedaAssociato | null>(null);

  // Form nuovo tesseramento
  const [impresaSearch, setImpresaSearch] = useState('');
  const [impreseSuggestions, setImpreseSuggestions] = useState<ImpresaSearch[]>([]);
  const [selectedImpresa, setSelectedImpresa] = useState<ImpresaSearch | null>(null);
  const [nuovoAnno, setNuovoAnno] = useState(new Date().getFullYear());
  const [nuovaQuota, setNuovaQuota] = useState('');
  const [nuoveNote, setNuoveNote] = useState('');

  const impState = getImpersonationParams();
  const associazioneId = impState.associazioneId;
  const associazioneNome = impState.associazioneNome
    ? decodeURIComponent(impState.associazioneNome)
    : null;

  const loadTesseramenti = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      // Carica stats
      const statsRes = await fetch(
        `${API_BASE_URL}/api/associazioni/${associazioneId}/tesseramenti?stats_only=true`
      );
      const statsData = await statsRes.json();
      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }

      // Carica lista tesseramenti
      const res = await fetch(
        `${API_BASE_URL}/api/associazioni/${associazioneId}/tesseramenti`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setTesseramenti(data.data);
      } else {
        setTesseramenti([]);
      }
    } catch (error) {
      console.error('Errore caricamento tesseramenti:', error);
      setTesseramenti([]);
      setStats({
        totale_tesserati: 0,
        attivi: 0,
        scaduti: 0,
        sospesi: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [associazioneId]);

  useEffect(() => {
    loadTesseramenti();
  }, [loadTesseramenti]);

  // Carica scheda associato
  const loadSchedaAssociato = useCallback(async (tesseramentoId: number) => {
    if (!associazioneId) return;
    setSchedaLoading(true);
    setSchedaOpen(true);
    setSchedaData(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/associazioni/${associazioneId}/tesseramenti/${tesseramentoId}/scheda`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setSchedaData(data.data);
      } else {
        toast.error('Errore caricamento scheda associato');
        setSchedaOpen(false);
      }
    } catch (error) {
      console.error('Errore caricamento scheda:', error);
      toast.error('Errore di connessione');
      setSchedaOpen(false);
    } finally {
      setSchedaLoading(false);
    }
  }, [associazioneId]);

  // Cerca imprese per autocomplete
  const searchImprese = useCallback(async (query: string) => {
    if (query.length < 2) {
      setImpreseSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/imprese?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success && data.data) {
        setImpreseSuggestions(data.data);
      }
    } catch (error) {
      console.error('Errore ricerca imprese:', error);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchImprese(impresaSearch), 300);
    return () => clearTimeout(timeout);
  }, [impresaSearch, searchImprese]);

  const handleAddTesseramento = async () => {
    if (!associazioneId || !selectedImpresa) {
      toast.error('Seleziona un\'impresa');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${associazioneId}/tesseramenti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impresa_id: selectedImpresa.id,
          anno: nuovoAnno,
          quota_annuale: nuovaQuota ? parseFloat(nuovaQuota) : null,
          note: nuoveNote || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Tesseramento aggiunto: ${selectedImpresa.denominazione}`);
        setShowAddForm(false);
        resetForm();
        loadTesseramenti();
      } else {
        toast.error(data.error || 'Errore creazione tesseramento');
      }
    } catch (error) {
      console.error('Errore aggiunta tesseramento:', error);
      toast.error('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  const handleRevocaTesseramento = async (tesseramentoId: number, impresaNome: string) => {
    if (!associazioneId) return;
    if (!confirm(`Revocare il tesseramento di ${impresaNome}?`)) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/associazioni/${associazioneId}/tesseramenti/${tesseramentoId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stato: 'revocato' }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(`Tesseramento revocato: ${impresaNome}`);
        loadTesseramenti();
      } else {
        toast.error(data.error || 'Errore revoca');
      }
    } catch (error) {
      console.error('Errore revoca tesseramento:', error);
      toast.error('Errore di connessione');
    }
  };

  const resetForm = () => {
    setImpresaSearch('');
    setImpreseSuggestions([]);
    setSelectedImpresa(null);
    setNuovoAnno(new Date().getFullYear());
    setNuovaQuota('');
    setNuoveNote('');
  };

  const filteredTesseramenti = tesseramenti.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      (t.impresa_nome?.toLowerCase().includes(query) ?? false) ||
      (t.impresa_codice_fiscale?.toLowerCase().includes(query) ?? false) ||
      (t.impresa_partita_iva?.toLowerCase().includes(query) ?? false) ||
      (t.impresa_citta?.toLowerCase().includes(query) ?? false)
    );
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT');
    } catch {
      return dateStr;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#3b82f6]" />
            Tesserati
            {associazioneNome && (
              <Badge variant="outline" className="ml-2 text-[#3b82f6] border-[#3b82f6]/50">
                {associazioneNome}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAddForm(true); resetForm(); }}
              className="border-[#10b981]/30 text-[#10b981]"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuovo Tesseramento
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTesseramenti}
              className="border-[#3b82f6]/30 text-[#3b82f6]"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Form Nuovo Tesseramento */}
      {showAddForm && (
        <Card className="bg-[#1a2332] border-[#10b981]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#10b981] text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuovo Tesseramento
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ricerca impresa */}
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Impresa *</Label>
              {selectedImpresa ? (
                <div className="flex items-center gap-2 p-2 bg-[#0b1220] border border-[#10b981]/30 rounded-md">
                  <Building2 className="h-4 w-4 text-[#10b981]" />
                  <span className="text-[#e8fbff] flex-1">
                    {selectedImpresa.denominazione}
                    {selectedImpresa.partita_iva && <span className="text-[#e8fbff]/50 ml-2">P.IVA {selectedImpresa.partita_iva}</span>}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedImpresa(null); setImpresaSearch(''); }}>
                    <X className="h-3 w-3 text-[#e8fbff]/50" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    value={impresaSearch}
                    onChange={(e) => setImpresaSearch(e.target.value)}
                    placeholder="Cerca impresa per nome, CF o P.IVA..."
                    className="bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff] placeholder-[#e8fbff]/30"
                  />
                  {impreseSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[#1a2332] border border-[#3b82f6]/30 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {impreseSuggestions.map(imp => (
                        <button
                          key={imp.id}
                          onClick={() => {
                            setSelectedImpresa(imp);
                            setImpreseSuggestions([]);
                            setImpresaSearch('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#3b82f6]/10 border-b border-[#334155] last:border-b-0"
                        >
                          <p className="text-sm text-[#e8fbff]">{imp.denominazione}</p>
                          <p className="text-xs text-[#e8fbff]/50">
                            {imp.partita_iva && `P.IVA ${imp.partita_iva}`}
                            {imp.comune && ` · ${imp.comune}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Anno e Quota */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Anno *</Label>
                <Input
                  type="number"
                  value={nuovoAnno}
                  onChange={(e) => setNuovoAnno(parseInt(e.target.value) || new Date().getFullYear())}
                  className="bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Quota Annuale (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={nuovaQuota}
                  onChange={(e) => setNuovaQuota(e.target.value)}
                  placeholder="Es. 150.00"
                  className="bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff] placeholder-[#e8fbff]/30"
                />
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Note</Label>
              <Input
                value={nuoveNote}
                onChange={(e) => setNuoveNote(e.target.value)}
                placeholder="Note opzionali..."
                className="bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff] placeholder-[#e8fbff]/30"
              />
            </div>

            {/* Azioni */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="border-[#334155] text-[#e8fbff]/60">
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={handleAddTesseramento}
                disabled={!selectedImpresa || addLoading}
                className="bg-[#10b981] text-black hover:bg-[#10b981]/90"
              >
                {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Salva Tesseramento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-[#3b82f6]" />
              <p className="text-2xl font-bold text-[#e8fbff]">{stats.totale_tesserati}</p>
              <p className="text-xs text-[#e8fbff]/60">Tesserati Totali</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardContent className="pt-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-[#10b981]" />
              <p className="text-2xl font-bold text-[#10b981]">{stats.attivi}</p>
              <p className="text-xs text-[#e8fbff]/60">Attivi</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardContent className="pt-4 text-center">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-[#ef4444]" />
              <p className="text-2xl font-bold text-[#ef4444]">{stats.scaduti}</p>
              <p className="text-xs text-[#e8fbff]/60">Scaduti</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardContent className="pt-4 text-center">
              <CreditCard className="h-6 w-6 mx-auto mb-2 text-[#f59e0b]" />
              <p className="text-2xl font-bold text-[#f59e0b]">{stats.sospesi}</p>
              <p className="text-xs text-[#e8fbff]/60">Sospesi</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#e8fbff]/50" />
            <Input
              placeholder="Cerca per nome impresa, CF, P.IVA o citta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff] placeholder-[#e8fbff]/30"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
            </div>
          ) : filteredTesseramenti.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#e8fbff]/50">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p>Nessun tesseramento trovato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTesseramenti.map((t) => {
                const statoKey = t.stato?.toLowerCase() || 'attivo';
                const colors = STATO_COLORS[statoKey] ?? STATO_COLORS.attivo;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                      <div>
                        <p className="text-sm font-medium text-[#e8fbff]">
                          {t.impresa_nome ?? `Impresa #${t.impresa_id}`}
                        </p>
                        <p className="text-xs text-[#e8fbff]/50 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {t.impresa_citta ?? '\u2014'}
                          {t.impresa_partita_iva && (
                            <span>· P.IVA {t.impresa_partita_iva}</span>
                          )}
                        </p>
                        <p className="text-xs text-[#e8fbff]/40 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Anno {t.anno}
                          {t.quota_annuale != null && (
                            <span>· Quota: {t.quota_annuale.toFixed(2)} EUR</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${colors.text} ${colors.border}`}
                      >
                        {STATO_LABELS[statoKey] ?? t.stato}
                      </Badge>
                      {/* Icona Occhio - Apri scheda associato */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadSchedaAssociato(t.id)}
                        className="text-[#3b82f6] hover:bg-[#3b82f6]/10"
                        title="Apri scheda associato"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(statoKey === 'attivo') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevocaTesseramento(t.id, t.impresa_nome ?? `Impresa #${t.impresa_id}`)}
                          className="text-red-400 hover:bg-red-500/10"
                          title="Revoca tesseramento"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Scheda Associato */}
      <Dialog open={schedaOpen} onOpenChange={setSchedaOpen}>
        <DialogContent className="bg-[#1a2332] border-[#3b82f6]/30 text-[#e8fbff] max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#e8fbff] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#3b82f6]" />
              Scheda Associato
            </DialogTitle>
          </DialogHeader>

          {schedaLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
            </div>
          ) : schedaData ? (
            <div className="space-y-6">
              {/* Tipo Impresa Badge */}
              <div className="flex items-center gap-3">
                {schedaData.tesseramento.tipo_impresa === 'ambulante' ? (
                  <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/50 flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Ambulante
                  </Badge>
                ) : (
                  <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/50 flex items-center gap-1">
                    <Store className="h-3 w-3" />
                    Negozio Fisso
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={
                    schedaData.tesseramento.stato?.toLowerCase() === 'attivo'
                      ? 'text-[#10b981] border-[#10b981]/50'
                      : 'text-[#ef4444] border-[#ef4444]/50'
                  }
                >
                  Tessera: {schedaData.tesseramento.stato}
                </Badge>
              </div>

              {/* Dati Impresa */}
              <Card className="bg-[#0b1220] border-[#3b82f6]/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#3b82f6] flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Dati Impresa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Denominazione</p>
                      <p className="text-[#e8fbff] font-medium">{schedaData.tesseramento.impresa_nome || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Codice Fiscale</p>
                      <p className="text-[#e8fbff]">{schedaData.tesseramento.impresa_cf || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Partita IVA</p>
                      <p className="text-[#e8fbff]">{schedaData.tesseramento.impresa_piva || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Settore</p>
                      <p className="text-[#e8fbff]">{schedaData.tesseramento.impresa_settore || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> Indirizzo</p>
                      <p className="text-[#e8fbff]">
                        {schedaData.tesseramento.impresa_indirizzo || '—'}
                        {schedaData.tesseramento.impresa_cap && `, ${schedaData.tesseramento.impresa_cap}`}
                        {schedaData.tesseramento.impresa_comune && ` ${schedaData.tesseramento.impresa_comune}`}
                        {schedaData.tesseramento.impresa_provincia && ` (${schedaData.tesseramento.impresa_provincia})`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Codice ATECO</p>
                      <p className="text-[#e8fbff]">{schedaData.tesseramento.codice_ateco || '—'}</p>
                    </div>
                    {schedaData.tesseramento.impresa_telefono && (
                      <div>
                        <p className="text-[#e8fbff]/50 text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Telefono</p>
                        <p className="text-[#e8fbff]">{schedaData.tesseramento.impresa_telefono}</p>
                      </div>
                    )}
                    {schedaData.tesseramento.impresa_email && (
                      <div>
                        <p className="text-[#e8fbff]/50 text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                        <p className="text-[#e8fbff]">{schedaData.tesseramento.impresa_email}</p>
                      </div>
                    )}
                    {schedaData.tesseramento.impresa_pec && (
                      <div>
                        <p className="text-[#e8fbff]/50 text-xs">PEC</p>
                        <p className="text-[#e8fbff]">{schedaData.tesseramento.impresa_pec}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Dati Tessera */}
              <Card className="bg-[#0b1220] border-[#10b981]/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#10b981] flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Dati Tessera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">N. Tessera</p>
                      <p className="text-[#e8fbff]">{schedaData.tesseramento.numero_tessera || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Data Iscrizione</p>
                      <p className="text-[#e8fbff]">{formatDate(schedaData.tesseramento.data_iscrizione)}</p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Scadenza Tessera
                      </p>
                      <p className={`font-medium ${schedaData.tesseramento.tessera_scaduta ? 'text-[#ef4444]' : 'text-[#e8fbff]'}`}>
                        {formatDate(schedaData.tesseramento.data_scadenza)}
                        {schedaData.tesseramento.tessera_scaduta && (
                          <span className="ml-1 text-xs">
                            <AlertTriangle className="h-3 w-3 inline" /> SCADUTA
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Importo Annuale</p>
                      <p className="text-[#e8fbff]">
                        {parseFloat(schedaData.tesseramento.importo_annuale) > 0
                          ? `€ ${parseFloat(schedaData.tesseramento.importo_annuale).toFixed(2)}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Importo Pagato</p>
                      <p className="text-[#e8fbff]">
                        {parseFloat(schedaData.tesseramento.importo_pagato) > 0
                          ? `€ ${parseFloat(schedaData.tesseramento.importo_pagato).toFixed(2)}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#e8fbff]/50 text-xs">Stato Pagamento</p>
                      <Badge
                        variant="outline"
                        className={
                          schedaData.tesseramento.stato_pagamento === 'pagato'
                            ? 'text-[#10b981] border-[#10b981]/50'
                            : schedaData.tesseramento.stato_pagamento === 'da_pagare'
                            ? 'text-[#ef4444] border-[#ef4444]/50'
                            : 'text-[#e8fbff]/50 border-[#e8fbff]/20'
                        }
                      >
                        {schedaData.tesseramento.stato_pagamento === 'pagato'
                          ? 'Pagato'
                          : schedaData.tesseramento.stato_pagamento === 'da_pagare'
                          ? 'Da Pagare'
                          : 'Non definito'}
                      </Badge>
                    </div>
                    {schedaData.tesseramento.data_rinnovo && (
                      <div>
                        <p className="text-[#e8fbff]/50 text-xs">Data Rinnovo</p>
                        <p className="text-[#e8fbff]">{formatDate(schedaData.tesseramento.data_rinnovo)}</p>
                      </div>
                    )}
                    {schedaData.tesseramento.metodo_pagamento && (
                      <div>
                        <p className="text-[#e8fbff]/50 text-xs">Metodo Pagamento</p>
                        <p className="text-[#e8fbff]">{schedaData.tesseramento.metodo_pagamento}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pratiche SCIA */}
              <Card className="bg-[#0b1220] border-[#f59e0b]/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#f59e0b] flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pratiche SCIA
                    <Badge variant="outline" className="text-[#f59e0b] border-[#f59e0b]/50 text-xs">
                      {schedaData.pratiche.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schedaData.pratiche.length === 0 ? (
                    <p className="text-[#e8fbff]/40 text-sm text-center py-4">Nessuna pratica SCIA</p>
                  ) : (
                    <div className="space-y-2">
                      {schedaData.pratiche.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-[#1a2332] rounded border border-[#334155]">
                          <div>
                            <p className="text-sm text-[#e8fbff] font-medium">{p.cui}</p>
                            <p className="text-xs text-[#e8fbff]/50">
                              {p.tipo_pratica} · {p.sub_ragione_sociale || '—'}
                              {p.mercato_nome && ` · ${p.mercato_nome}`}
                              {p.posteggio_numero && ` Post. ${p.posteggio_numero}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                p.stato === 'APPROVED' ? 'text-[#10b981] border-[#10b981]/50' :
                                p.stato === 'EVALUATED' ? 'text-[#f59e0b] border-[#f59e0b]/50' :
                                'text-[#e8fbff]/50 border-[#e8fbff]/20'
                              }
                            >
                              {p.stato}
                            </Badge>
                            {p.score != null && (
                              <span className="text-xs text-[#e8fbff]/50">{p.score}/100</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Concessioni */}
              <Card className="bg-[#0b1220] border-[#8b5cf6]/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#8b5cf6] flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Concessioni
                    <Badge variant="outline" className="text-[#8b5cf6] border-[#8b5cf6]/50 text-xs">
                      {schedaData.concessioni.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {schedaData.concessioni.length === 0 ? (
                    <p className="text-[#e8fbff]/40 text-sm text-center py-4">Nessuna concessione</p>
                  ) : (
                    <div className="space-y-2">
                      {schedaData.concessioni.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 bg-[#1a2332] rounded border border-[#334155]">
                          <div>
                            <p className="text-sm text-[#e8fbff] font-medium">{c.numero_protocollo}</p>
                            <p className="text-xs text-[#e8fbff]/50">
                              {c.tipo} · {c.concessionario_nome || '—'}
                              {c.mercato_nome && ` · ${c.mercato_nome}`}
                              {c.posteggio_numero && ` Post. ${c.posteggio_numero}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                c.stato === 'ATTIVA' ? 'text-[#10b981] border-[#10b981]/50' :
                                c.stato === 'CESSATA' ? 'text-[#ef4444] border-[#ef4444]/50' :
                                'text-[#e8fbff]/50 border-[#e8fbff]/20'
                              }
                            >
                              {c.stato}
                            </Badge>
                            {c.data_scadenza && (
                              <span className="text-xs text-[#e8fbff]/50">Scad. {formatDate(c.data_scadenza)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
