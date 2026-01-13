/**
 * AutorizzazioneForm.tsx
 * 
 * Form per la creazione di Autorizzazioni commercio su aree pubbliche.
 * Design identico a ConcessioneForm.tsx con auto-popolamento dati.
 * 
 * Tipi di Autorizzazione (D.Lgs. 114/1998):
 * - Tipo A: Posteggio Fisso (10 anni, rinnovabile)
 * - Tipo B: Itinerante (illimitata)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Printer, Search, Loader2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

// Tipi per i dati dal database
interface Market {
  id: number;
  code: string;
  name: string;
  municipality: string;
  days: string;
  total_stalls: number;
  status: string;
}

interface Stall {
  id: number;
  market_id: number;
  number: string;
  width: string;
  depth: string;
  dimensions: string;
  area_mq: string;
  type: string;
  status: string;
}

interface Impresa {
  id: number;
  denominazione: string;
  codice_fiscale: string;
  partita_iva: string;
  comune: string;
  indirizzo_via: string;
  indirizzo_civico: string;
  indirizzo_cap: string;
  indirizzo_provincia: string;
  rappresentante_legale_nome: string;
  rappresentante_legale_cognome: string;
  rappresentante_legale_cf: string;
  rappresentante_legale_data_nascita: string;
  rappresentante_legale_luogo_nascita: string;
  rappresentante_legale_residenza_via: string;
  rappresentante_legale_residenza_civico: string;
  rappresentante_legale_residenza_comune: string;
  rappresentante_legale_residenza_provincia: string;
  rappresentante_legale_residenza_cap: string;
  pec: string;
  telefono: string;
}

interface AutorizzazioneFormProps {
  onCancel: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  autorizzazioneId?: number | null;
  mode?: 'create' | 'view' | 'edit';
}

export default function AutorizzazioneForm({ onCancel, onSubmit, initialData, autorizzazioneId, mode = 'create' }: AutorizzazioneFormProps) {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  // Stati per dati dal database
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [allImprese, setAllImprese] = useState<Impresa[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [loadingImpresa, setLoadingImpresa] = useState(false);
  const [selectedStallId, setSelectedStallId] = useState<number | null>(null);
  const [selectedImpresaId, setSelectedImpresaId] = useState<number | null>(null);
  
  // Stati per autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredImprese, setFilteredImprese] = useState<Impresa[]>([]);

  const [formData, setFormData] = useState({
    // Dati Generali
    numero_autorizzazione: '',
    data_rilascio: new Date().toISOString().split('T')[0],
    ente_rilascio: '',
    tipo: 'A', // A = Posteggio, B = Itinerante
    
    // Durata (solo per tipo A)
    data_scadenza: (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 10); return d.toISOString().split('T')[0]; })(),
    
    // Impresa
    impresa_id: '',
    cf_impresa: '',
    partita_iva: '',
    ragione_sociale: '',
    qualita: 'legale rappresentante',
    nome: '',
    cognome: '',
    data_nascita: '',
    luogo_nascita: '',
    residenza_via: '',
    residenza_comune: '',
    residenza_provincia: '',
    residenza_cap: '',
    sede_legale_via: '',
    sede_legale_comune: '',
    sede_legale_provincia: '',
    sede_legale_cap: '',
    
    // Posteggio (solo per tipo A)
    mercato: '',
    mercato_id: '',
    ubicazione: '',
    posteggio: '',
    posteggio_id: '',
    fila: '',
    mq: '',
    dimensioni_lineari: '',
    giorno: '',
    
    // Settore Merceologico
    settore: 'Non Alimentare',
    sottosettore: '',
    limitazioni: '',
    
    // DURC
    durc_numero: '',
    durc_data_rilascio: '',
    durc_data_scadenza: '',
    
    // Note
    note: '',
    stato: 'ATTIVA'
  });

  // Carica mercati e imprese all'avvio
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingMarkets(true);
        
        // Carica il prossimo numero autorizzazione
        try {
          const nextNumRes = await fetch(`${API_URL}/api/autorizzazioni/next-number`);
          const nextNumJson = await nextNumRes.json();
          if (nextNumJson.success && nextNumJson.data) {
            setFormData(prev => ({
              ...prev,
              numero_autorizzazione: nextNumJson.data.next_number
            }));
          }
        } catch (err) {
          console.warn('Errore nel caricare il prossimo numero:', err);
          // Fallback: genera numero basato su timestamp
          const currentYear = new Date().getFullYear();
          setFormData(prev => ({
            ...prev,
            numero_autorizzazione: `${currentYear}/${String(Date.now()).slice(-4)}`
          }));
        }
        
        // Carica mercati
        const marketsRes = await fetch(`${API_URL}/api/markets`);
        const marketsJson = await marketsRes.json();
        if (marketsJson.success && marketsJson.data) {
          setMarkets(marketsJson.data);
        }
        
        // Carica imprese
        const impreseRes = await fetch(`${API_URL}/api/imprese`);
        const impreseJson = await impreseRes.json();
        if (impreseJson.success && impreseJson.data) {
          setAllImprese(impreseJson.data);
        }
      } catch (err) {
        console.error('Errore caricamento dati:', err);
        toast.error('Errore nel caricamento dei dati');
      } finally {
        setLoadingMarkets(false);
      }
    };
    
    fetchData();
  }, []);

  // Pre-compila se ci sono dati iniziali
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      toast.info('Form pre-compilato', { description: 'Verifica e completa i dati mancanti' });
    }
  }, [initialData]);

  // Carica dati autorizzazione esistente in view/edit mode
  useEffect(() => {
    if (autorizzazioneId && (mode === 'view' || mode === 'edit')) {
      const fetchAutorizzazione = async () => {
        try {
          const res = await fetch(`${API_URL}/api/autorizzazioni/${autorizzazioneId}`);
          const json = await res.json();
          if (json.success && json.data) {
            const aut = json.data;
            setFormData(prev => ({
              ...prev,
              numero_autorizzazione: aut.numero_autorizzazione || '',
              data_rilascio: aut.data_rilascio ? new Date(aut.data_rilascio).toISOString().split('T')[0] : '',
              data_scadenza: aut.data_scadenza ? new Date(aut.data_scadenza).toISOString().split('T')[0] : '',
              ente_rilascio: aut.ente_rilascio || '',
              tipo: aut.tipo || 'A',
              impresa_id: aut.vendor_id?.toString() || '',
              cf_impresa: aut.company_cf || '',
              partita_iva: aut.company_piva || '',
              ragione_sociale: aut.company_name || '',
              mercato: aut.market_name || '',
              mercato_id: aut.market_id?.toString() || '',
              settore: aut.settore || 'Non Alimentare',
              note: aut.note || '',
              stato: aut.stato || 'ATTIVA'
            }));
          }
        } catch (err) {
          console.error('Errore caricamento autorizzazione:', err);
          toast.error('Errore nel caricamento dell\'autorizzazione');
        }
      };
      fetchAutorizzazione();
    }
  }, [autorizzazioneId, mode]);

  // Filtra imprese per autocomplete
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      const filtered = allImprese.filter(imp => 
        imp.denominazione?.toLowerCase().includes(query) ||
        imp.codice_fiscale?.toLowerCase().includes(query) ||
        imp.partita_iva?.includes(query)
      ).slice(0, 10);
      setFilteredImprese(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredImprese([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allImprese]);

  // Seleziona impresa e popola campi
  const selectImpresa = (impresa: Impresa) => {
    setSelectedImpresaId(impresa.id);
    setSearchQuery(impresa.denominazione);
    setShowSuggestions(false);
    
    setFormData(prev => ({
      ...prev,
      impresa_id: impresa.id.toString(),
      cf_impresa: impresa.codice_fiscale || '',
      partita_iva: impresa.partita_iva || '',
      ragione_sociale: impresa.denominazione || '',
      nome: impresa.rappresentante_legale_nome || '',
      cognome: impresa.rappresentante_legale_cognome || '',
      data_nascita: impresa.rappresentante_legale_data_nascita || '',
      luogo_nascita: impresa.rappresentante_legale_luogo_nascita || '',
      residenza_via: impresa.rappresentante_legale_residenza_via || '',
      residenza_comune: impresa.rappresentante_legale_residenza_comune || '',
      residenza_provincia: impresa.rappresentante_legale_residenza_provincia || '',
      residenza_cap: impresa.rappresentante_legale_residenza_cap || '',
      sede_legale_via: impresa.indirizzo_via || '',
      sede_legale_comune: impresa.comune || '',
      sede_legale_provincia: impresa.indirizzo_provincia || '',
      sede_legale_cap: impresa.indirizzo_cap || ''
    }));
    
    toast.success('Dati impresa caricati');
  };

  // Gestione cambio mercato
  const handleMarketChange = async (marketId: string) => {
    const market = markets.find(m => m.id.toString() === marketId);
    if (!market) return;
    
    setSelectedMarketId(market.id);
    setSelectedMarket(market);
    setLoadingStalls(true);
    
    setFormData(prev => ({
      ...prev,
      mercato: market.name,
      mercato_id: market.id.toString(),
      ubicazione: market.municipality,
      giorno: market.days,
      ente_rilascio: market.municipality // Auto-popola ente rilascio con comune
    }));
    
    // Carica posteggi del mercato
    try {
      const stallsRes = await fetch(`${API_URL}/api/stalls?market_id=${market.id}`);
      const stallsJson = await stallsRes.json();
      if (stallsJson.success && stallsJson.data) {
        // Filtra solo posteggi liberi
        const freeStalls = stallsJson.data.filter((s: Stall) => s.status === 'free' || s.status === 'libero');
        setStalls(freeStalls);
      }
    } catch (err) {
      console.error('Errore caricamento posteggi:', err);
    } finally {
      setLoadingStalls(false);
    }
  };

  // Gestione cambio posteggio
  const handleStallChange = (stallId: string) => {
    const stall = stalls.find(s => s.id.toString() === stallId);
    if (!stall) return;
    
    setSelectedStallId(stall.id);
    
    setFormData(prev => ({
      ...prev,
      posteggio: stall.number,
      posteggio_id: stall.id.toString(),
      mq: stall.area_mq || '',
      dimensioni_lineari: stall.dimensions || `${stall.width}x${stall.depth}`
    }));
  };

  // Calcola scadenza automatica
  const calculateExpiry = (years: string) => {
    const startDate = new Date(formData.data_rilascio);
    startDate.setFullYear(startDate.getFullYear() + parseInt(years));
    setFormData(prev => ({
      ...prev,
      data_scadenza: startDate.toISOString().split('T')[0]
    }));
  };

  // Salva autorizzazione
  const handleSave = async () => {
    // Validazione
    if (!formData.impresa_id || !formData.numero_autorizzazione || !formData.ente_rilascio) {
      toast.error('Compila i campi obbligatori', { description: 'Impresa, Numero Autorizzazione e Ente Rilascio sono richiesti' });
      return;
    }
    
    if (formData.tipo === 'A' && !formData.mercato_id) {
      toast.error('Seleziona un mercato', { description: 'Per autorizzazioni Tipo A è richiesto un mercato' });
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/autorizzazioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impresa_id: parseInt(formData.impresa_id),
          numero_autorizzazione: formData.numero_autorizzazione,
          ente_rilascio: formData.ente_rilascio,
          data_rilascio: formData.data_rilascio,
          data_scadenza: formData.tipo === 'A' ? formData.data_scadenza : null,
          tipo: formData.tipo,
          settore: formData.settore,
          sottosettore: formData.sottosettore,
          mercato_id: formData.mercato_id ? parseInt(formData.mercato_id) : null,
          posteggio_id: formData.posteggio_id ? parseInt(formData.posteggio_id) : null,
          durc_numero: formData.durc_numero,
          durc_data_rilascio: formData.durc_data_rilascio || null,
          durc_data_scadenza: formData.durc_data_scadenza || null,
          stato: formData.stato,
          note: formData.note
        })
      });
      
      const json = await response.json();
      
      if (!json.success) {
        throw new Error(json.error || 'Errore durante il salvataggio');
      }
      
      toast.success('Autorizzazione creata con successo');
      onSubmit(json.data);
    } catch (err: any) {
      console.error('Errore salvataggio:', err);
      toast.error('Errore durante il salvataggio', { description: err.message });
    }
  };

  // Mostra sezione posteggio solo per tipo A
  const mostraPosteggio = formData.tipo === 'A';

  return (
    <Card className="bg-[#0a1628] border-[#1e293b] text-[#e8fbff]">
      <CardHeader className="border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-400" />
          <CardTitle className="text-[#e8fbff]">
            {isViewMode ? 'Dettaglio Autorizzazione' : isEditMode ? 'Modifica Autorizzazione' : 'Generazione Autorizzazione Commercio'}
          </CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          Autorizzazione per il commercio su aree pubbliche (D.Lgs. 114/1998)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* DATI GENERALI */}
        <div className="space-y-4 border-b border-[#1e293b] pb-6">
          <h3 className="text-lg font-semibold text-[#e8fbff]">Dati Generali</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Numero Autorizzazione *</Label>
              <Input 
                value={formData.numero_autorizzazione}
                onChange={(e) => setFormData({...formData, numero_autorizzazione: e.target.value})}
                placeholder="Es. 2026/001"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Data Rilascio</Label>
              <Input 
                type="date"
                value={formData.data_rilascio}
                onChange={(e) => setFormData({...formData, data_rilascio: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Ente Rilascio *</Label>
              <Input 
                value={formData.ente_rilascio}
                onChange={(e) => setFormData({...formData, ente_rilascio: e.target.value})}
                placeholder="Es. Comune di Grosseto"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Tipo Autorizzazione *</Label>
              <Select value={formData.tipo} onValueChange={(val) => setFormData({...formData, tipo: val})}>
                <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Tipo A - Posteggio Fisso</SelectItem>
                  <SelectItem value="B">Tipo B - Itinerante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Scadenza solo per tipo A */}
          {formData.tipo === 'A' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Durata (Anni)</Label>
                <Select defaultValue="10" onValueChange={calculateExpiry}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 Anni</SelectItem>
                    <SelectItem value="12">12 Anni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Scadenza (auto)</Label>
                <Input 
                  type="date"
                  value={formData.data_scadenza}
                  readOnly
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                />
              </div>
            </div>
          )}
        </div>

        {/* DATI IMPRESA */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Dati Impresa</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 relative">
              <Label className="text-[#e8fbff]">Cerca Impresa *</Label>
              <Input 
                placeholder="P.IVA / CF / Denominazione"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-[#0a1628] border border-[#1e293b] rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredImprese.map((impresa) => (
                    <div
                      key={impresa.id}
                      className="px-3 py-2 cursor-pointer hover:bg-[#1e293b] text-[#e8fbff] text-sm"
                      onClick={() => selectImpresa(impresa)}
                    >
                      <div className="font-medium">{impresa.denominazione}</div>
                      <div className="text-xs text-gray-400">
                        {impresa.codice_fiscale || impresa.partita_iva} • {impresa.comune}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Partita IVA</Label>
              <Input 
                value={formData.partita_iva}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Codice Fiscale</Label>
              <Input 
                value={formData.cf_impresa}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Ragione Sociale</Label>
              <Input 
                value={formData.ragione_sociale}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
          </div>

          {/* Dati Titolare/Legale Rappresentante */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Qualità</Label>
              <Select value={formData.qualita} onValueChange={(val) => setFormData({...formData, qualita: val})}>
                <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="titolare">Titolare</SelectItem>
                  <SelectItem value="legale rappresentante">Legale Rappresentante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Nome</Label>
              <Input 
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Cognome</Label>
              <Input 
                value={formData.cognome}
                onChange={(e) => setFormData({...formData, cognome: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Data di Nascita</Label>
              <Input 
                type="date"
                value={formData.data_nascita}
                onChange={(e) => setFormData({...formData, data_nascita: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
              <Input 
                value={formData.luogo_nascita}
                onChange={(e) => setFormData({...formData, luogo_nascita: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
          </div>

          {/* Residenza */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
              <Input 
                value={formData.residenza_via}
                onChange={(e) => setFormData({...formData, residenza_via: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Comune</Label>
              <Input 
                value={formData.residenza_comune}
                onChange={(e) => setFormData({...formData, residenza_comune: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Provincia</Label>
              <Input 
                value={formData.residenza_provincia}
                onChange={(e) => setFormData({...formData, residenza_provincia: e.target.value})}
                placeholder="Es. GR"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">CAP</Label>
              <Input 
                value={formData.residenza_cap}
                onChange={(e) => setFormData({...formData, residenza_cap: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
          </div>

          {/* Sede Legale */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[#e8fbff]">Sede Legale (Via)</Label>
              <Input 
                value={formData.sede_legale_via}
                onChange={(e) => setFormData({...formData, sede_legale_via: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Comune</Label>
              <Input 
                value={formData.sede_legale_comune}
                onChange={(e) => setFormData({...formData, sede_legale_comune: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Provincia</Label>
              <Input 
                value={formData.sede_legale_provincia}
                onChange={(e) => setFormData({...formData, sede_legale_provincia: e.target.value})}
                placeholder="Es. GR"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">CAP</Label>
              <Input 
                value={formData.sede_legale_cap}
                onChange={(e) => setFormData({...formData, sede_legale_cap: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
          </div>
        </div>

        {/* DATI POSTEGGIO (solo per tipo A) */}
        {mostraPosteggio && (
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Dati Posteggio</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Mercato *</Label>
                <Select onValueChange={handleMarketChange}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona Mercato" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map((market) => (
                      <SelectItem key={market.id} value={market.id.toString()}>
                        {market.name} - {market.municipality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ubicazione</Label>
                <Input 
                  value={formData.ubicazione}
                  readOnly
                  placeholder="Auto-popolato dal mercato"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Posteggio</Label>
                <Select onValueChange={handleStallChange} disabled={loadingStalls || stalls.length === 0}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder={loadingStalls ? "Caricamento..." : "Seleziona Posteggio"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stalls.map((stall) => (
                      <SelectItem key={stall.id} value={stall.id.toString()}>
                        {stall.number} - {stall.area_mq}mq
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">MQ</Label>
                <Input 
                  value={formData.mq}
                  readOnly
                  placeholder="Auto-popolato"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Giorno</Label>
                <Input 
                  value={formData.giorno}
                  readOnly
                  placeholder="Auto-popolato"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                />
              </div>
            </div>
          </div>
        )}

        {/* SETTORE MERCEOLOGICO */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Settore Merceologico</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Settore *</Label>
              <Select value={formData.settore} onValueChange={(val) => setFormData({...formData, settore: val})}>
                <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alimentare">Alimentare</SelectItem>
                  <SelectItem value="Non Alimentare">Non Alimentare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Sottosettore</Label>
              <Input 
                value={formData.sottosettore}
                onChange={(e) => setFormData({...formData, sottosettore: e.target.value})}
                placeholder="Es. Frutta e Verdura, Abbigliamento"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Limitazioni</Label>
              <Input 
                value={formData.limitazioni}
                onChange={(e) => setFormData({...formData, limitazioni: e.target.value})}
                placeholder="Es. Esclusi prodotti ittici"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
          </div>
        </div>

        {/* DURC */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">DURC (Documento Unico Regolarità Contributiva)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Numero DURC</Label>
              <Input 
                value={formData.durc_numero}
                onChange={(e) => setFormData({...formData, durc_numero: e.target.value})}
                placeholder="Es. INPS-2026-123456"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Data Rilascio</Label>
              <Input 
                type="date"
                value={formData.durc_data_rilascio}
                onChange={(e) => setFormData({...formData, durc_data_rilascio: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Data Scadenza</Label>
              <Input 
                type="date"
                value={formData.durc_data_scadenza}
                onChange={(e) => setFormData({...formData, durc_data_scadenza: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
          </div>
        </div>

        {/* NOTE */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Note e Prescrizioni</h3>
          <Textarea 
            value={formData.note}
            onChange={(e) => setFormData({...formData, note: e.target.value})}
            placeholder="Eventuali prescrizioni o note..."
            className="bg-[#020817] border-[#1e293b] text-[#e8fbff] min-h-[80px]"
          />
        </div>

        {/* PULSANTI */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#1e293b]">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-[#1e293b] text-[#e8fbff] hover:bg-[#1e293b]"
          >
            Annulla
          </Button>
          {!isViewMode && (
            <Button 
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              {isEditMode ? 'Salva Modifiche' : 'Genera Autorizzazione'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
