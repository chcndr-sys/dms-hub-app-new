/**
 * DomandaSpuntaForm.tsx
 * 
 * Form per la creazione di Domande di partecipazione alla Spunta.
 * Design identico a ConcessioneForm.tsx con auto-popolamento dati.
 * 
 * La Spunta (D.Lgs. 114/1998):
 * - Assegnazione giornaliera dei posteggi liberi
 * - Priorità basata sul numero di presenze
 * - Crea automaticamente il Wallet Spunta per l'impresa
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Send, Loader2, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

interface Autorizzazione {
  id: number;
  numero_autorizzazione: string;
  ente_rilascio: string;
  data_rilascio: string;
  data_scadenza: string;
  tipo: string;
  stato: string;
}

interface DomandaSpuntaFormProps {
  onCancel: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  domandaId?: number | null;
  mode?: 'create' | 'view' | 'edit';
}

export default function DomandaSpuntaForm({ onCancel, onSubmit, initialData, domandaId, mode = 'create' }: DomandaSpuntaFormProps) {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  // Stati per dati dal database
  const [markets, setMarkets] = useState<Market[]>([]);
  const [allImprese, setAllImprese] = useState<Impresa[]>([]);
  const [autorizzazioni, setAutorizzazioni] = useState<Autorizzazione[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingAutorizzazioni, setLoadingAutorizzazioni] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImpresaId, setSelectedImpresaId] = useState<number | null>(null);
  
  // Stati per autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredImprese, setFilteredImprese] = useState<Impresa[]>([]);

  const [formData, setFormData] = useState({
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
    pec: '',
    telefono: '',
    
    // Mercato
    mercato: '',
    mercato_id: '',
    ubicazione: '',
    giorno: '',
    
    // Autorizzazione
    autorizzazione_id: '',
    numero_autorizzazione: '',
    ente_autorizzazione: '',
    data_autorizzazione: '',
    
    // Settore
    settore_richiesto: 'Non Alimentare',
    
    // Dichiarazioni
    dichiarazione_requisiti: false,
    dichiarazione_durc: false,
    dichiarazione_antimafia: false,
    
    // Note
    note: ''
  });

  // Carica mercati e imprese all'avvio
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingMarkets(true);
        
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

  // Carica dati domanda esistente in view/edit mode
  useEffect(() => {
    if (domandaId && (mode === 'view' || mode === 'edit')) {
      const fetchDomanda = async () => {
        try {
          const res = await fetch(`${API_URL}/api/domande-spunta/${domandaId}`);
          const json = await res.json();
          if (json.success && json.data) {
            const dom = json.data;
            setFormData(prev => ({
              ...prev,
              impresa_id: dom.company_id?.toString() || '',
              cf_impresa: dom.company_cf || '',
              partita_iva: dom.company_piva || '',
              ragione_sociale: dom.company_name || '',
              mercato: dom.market_name || '',
              mercato_id: dom.market_id?.toString() || '',
              giorno: dom.market_days || '',
              settore: dom.settore_richiesto || 'Non Alimentare',
              autorizzazione_id: dom.autorizzazione_id?.toString() || '',
              numero_autorizzazione: dom.numero_autorizzazione || '',
              data_richiesta: dom.data_richiesta ? new Date(dom.data_richiesta).toISOString().split('T')[0] : '',
              note: dom.note || '',
              stato: dom.stato || 'IN_ATTESA'
            }));
            setSearchQuery(dom.company_name || '');
          }
        } catch (err) {
          console.error('Errore caricamento domanda spunta:', err);
          toast.error('Errore nel caricamento della domanda');
        }
      };
      fetchDomanda();
    }
  }, [domandaId, mode]);

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

  // Seleziona impresa e popola campi + carica autorizzazioni
  const selectImpresa = async (impresa: Impresa) => {
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
      sede_legale_cap: impresa.indirizzo_cap || '',
      pec: impresa.pec || '',
      telefono: impresa.telefono || ''
    }));
    
    // Carica autorizzazioni dell'impresa
    setLoadingAutorizzazioni(true);
    try {
      const authRes = await fetch(`${API_URL}/api/autorizzazioni?impresa_id=${impresa.id}`);
      const authJson = await authRes.json();
      if (authJson.success && authJson.data) {
        // Filtra solo autorizzazioni attive di tipo B (itinerante)
        const validAuth = authJson.data.filter((a: Autorizzazione) => 
          a.stato === 'ATTIVA' && (a.tipo === 'B' || !a.tipo)
        );
        setAutorizzazioni(validAuth);
        
        if (validAuth.length === 0) {
          toast.warning('Nessuna autorizzazione itinerante attiva', { 
            description: 'Per partecipare alla spunta serve un\'autorizzazione tipo B' 
          });
        }
      }
    } catch (err) {
      console.error('Errore caricamento autorizzazioni:', err);
    } finally {
      setLoadingAutorizzazioni(false);
    }
    
    toast.success('Dati impresa caricati');
  };

  // Gestione cambio mercato
  const handleMarketChange = (marketId: string) => {
    const market = markets.find(m => m.id.toString() === marketId);
    if (!market) return;
    
    setSelectedMarket(market);
    
    setFormData(prev => ({
      ...prev,
      mercato: market.name,
      mercato_id: market.id.toString(),
      ubicazione: market.municipality,
      giorno: market.days
    }));
  };

  // Gestione cambio autorizzazione
  const handleAutorizzazioneChange = (authId: string) => {
    const auth = autorizzazioni.find(a => a.id.toString() === authId);
    if (!auth) return;
    
    setFormData(prev => ({
      ...prev,
      autorizzazione_id: auth.id.toString(),
      numero_autorizzazione: auth.numero_autorizzazione,
      ente_autorizzazione: auth.ente_rilascio,
      data_autorizzazione: auth.data_rilascio
    }));
  };

  // Invia domanda spunta (crea anche wallet)
  const handleSubmit = async () => {
    // Validazione
    if (!formData.impresa_id || !formData.mercato_id) {
      toast.error('Compila i campi obbligatori', { description: 'Impresa e Mercato sono richiesti' });
      return;
    }
    
    if (!formData.dichiarazione_requisiti || !formData.dichiarazione_durc) {
      toast.error('Conferma le dichiarazioni', { description: 'Devi confermare i requisiti e il DURC' });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${API_URL}/api/domande-spunta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impresa_id: parseInt(formData.impresa_id),
          mercato_id: parseInt(formData.mercato_id),
          autorizzazione_id: formData.autorizzazione_id ? parseInt(formData.autorizzazione_id) : null,
          giorno_settimana: formData.giorno,
          settore_richiesto: formData.settore_richiesto,
          note: formData.note
        })
      });
      
      const json = await response.json();
      
      if (!json.success) {
        throw new Error(json.error || 'Errore durante l\'invio');
      }
      
      toast.success('Domanda Spunta inviata con successo', {
        description: `Wallet Spunta creato per ${selectedMarket?.name}`
      });
      onSubmit(json.data);
    } catch (err: any) {
      console.error('Errore invio:', err);
      toast.error('Errore durante l\'invio', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-[#0a1628] border-[#1e293b] text-[#e8fbff]">
      <CardHeader className="border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-400" />
          <CardTitle className="text-[#e8fbff]">
            {isViewMode ? 'Dettaglio Domanda Spunta' : isEditMode ? 'Modifica Domanda Spunta' : 'Domanda di Partecipazione alla Spunta'}
          </CardTitle>
        </div>
        <CardDescription className="text-gray-400">
          Richiesta per partecipare all'assegnazione giornaliera dei posteggi liberi
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* ALERT INFORMATIVO */}
        <Alert className="bg-[#0a2540] border-green-600/50">
          <Wallet className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-[#e8fbff]">
            Inviando questa domanda, verrà creato automaticamente un <strong>Wallet Spunta</strong> per l'impresa, 
            che permetterà di pagare i canoni giornalieri per i posteggi assegnati.
          </AlertDescription>
        </Alert>

        {/* DATI IMPRESA */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Dati Impresa Richiedente</h3>
          
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
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Cognome</Label>
              <Input 
                value={formData.cognome}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">PEC</Label>
              <Input 
                value={formData.pec}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Telefono</Label>
              <Input 
                value={formData.telefono}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
          </div>

          {/* Sede Legale */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[#e8fbff]">Sede Legale (Via)</Label>
              <Input 
                value={formData.sede_legale_via}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Comune</Label>
              <Input 
                value={formData.sede_legale_comune}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Provincia</Label>
              <Input 
                value={formData.sede_legale_provincia}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">CAP</Label>
              <Input 
                value={formData.sede_legale_cap}
                readOnly
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
          </div>
        </div>

        {/* MERCATO */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Mercato di Riferimento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label className="text-[#e8fbff]">Comune</Label>
              <Input 
                value={formData.ubicazione}
                readOnly
                placeholder="Auto-popolato"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Giorno/i</Label>
              <Input 
                value={formData.giorno}
                readOnly
                placeholder="Auto-popolato"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Settore Richiesto</Label>
              <Select value={formData.settore_richiesto} onValueChange={(val) => setFormData({...formData, settore_richiesto: val})}>
                <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alimentare">Alimentare</SelectItem>
                  <SelectItem value="Non Alimentare">Non Alimentare</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* AUTORIZZAZIONE */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Autorizzazione Commercio (Tipo B - Itinerante)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Seleziona Autorizzazione</Label>
              <Select 
                onValueChange={handleAutorizzazioneChange} 
                disabled={loadingAutorizzazioni || autorizzazioni.length === 0}
              >
                <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                  <SelectValue placeholder={
                    loadingAutorizzazioni ? "Caricamento..." : 
                    autorizzazioni.length === 0 ? "Nessuna autorizzazione" : 
                    "Seleziona..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  {autorizzazioni.map((auth) => (
                    <SelectItem key={auth.id} value={auth.id.toString()}>
                      {auth.numero_autorizzazione} - {auth.ente_rilascio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Numero Autorizzazione</Label>
              <Input 
                value={formData.numero_autorizzazione}
                readOnly
                placeholder="Auto-popolato"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Ente Rilascio</Label>
              <Input 
                value={formData.ente_autorizzazione}
                readOnly
                placeholder="Auto-popolato"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Data Rilascio</Label>
              <Input 
                value={formData.data_autorizzazione}
                readOnly
                placeholder="Auto-popolato"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
              />
            </div>
          </div>
        </div>

        {/* DICHIARAZIONI */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Dichiarazioni</h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="requisiti"
                checked={formData.dichiarazione_requisiti}
                onCheckedChange={(checked) => setFormData({...formData, dichiarazione_requisiti: checked as boolean})}
                className="border-[#1e293b] data-[state=checked]:bg-green-600"
              />
              <Label htmlFor="requisiti" className="text-[#e8fbff] text-sm leading-relaxed">
                Dichiaro di essere in possesso dei requisiti morali e professionali previsti dall'art. 5 del D.Lgs. 114/1998
              </Label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="durc"
                checked={formData.dichiarazione_durc}
                onCheckedChange={(checked) => setFormData({...formData, dichiarazione_durc: checked as boolean})}
                className="border-[#1e293b] data-[state=checked]:bg-green-600"
              />
              <Label htmlFor="durc" className="text-[#e8fbff] text-sm leading-relaxed">
                Dichiaro di essere in regola con gli obblighi contributivi (DURC regolare)
              </Label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="antimafia"
                checked={formData.dichiarazione_antimafia}
                onCheckedChange={(checked) => setFormData({...formData, dichiarazione_antimafia: checked as boolean})}
                className="border-[#1e293b] data-[state=checked]:bg-green-600"
              />
              <Label htmlFor="antimafia" className="text-[#e8fbff] text-sm leading-relaxed">
                Dichiaro l'assenza di cause di divieto, decadenza o sospensione di cui all'art. 67 del D.Lgs. 159/2011 (Antimafia)
              </Label>
            </div>
          </div>
        </div>

        {/* NOTE */}
        <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
          <h3 className="text-sm font-semibold text-[#e8fbff]">Note</h3>
          <Textarea 
            value={formData.note}
            onChange={(e) => setFormData({...formData, note: e.target.value})}
            placeholder="Eventuali note o richieste specifiche..."
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
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? 'Salvataggio...' : 'Invio in corso...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isEditMode ? 'Salva Modifiche' : 'Invia Domanda Spunta'}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
