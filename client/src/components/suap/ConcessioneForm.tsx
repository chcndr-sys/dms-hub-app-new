import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Printer, Search, Loader2 } from 'lucide-react';
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
  cost_per_sqm?: string;
  annual_market_days?: number;
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
  vendor_business_name?: string;
  impresa_id?: number;
  valid_from?: string;
  valid_to?: string;
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

interface ConcessioneFormProps {
  onCancel: () => void;
  onSubmit: (data: any) => void;
  initialData?: any; // Dati pre-compilati da SCIA
}

export default function ConcessioneForm({ onCancel, onSubmit, initialData }: ConcessioneFormProps) {
  // Stati per dati dal database
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [allImprese, setAllImprese] = useState<Impresa[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [loadingImpresa, setLoadingImpresa] = useState(false);
  const [loadingCedente, setLoadingCedente] = useState(false);
  const [selectedStallId, setSelectedStallId] = useState<number | null>(null);
  const [selectedImpresaId, setSelectedImpresaId] = useState<number | null>(null);
  
  // Stati per autocomplete Concessionario
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredImprese, setFilteredImprese] = useState<Impresa[]>([]);
  
  // Stati per autocomplete Cedente
  const [cedenteSearchQuery, setCedenteSearchQuery] = useState('');
  const [showCedenteSuggestions, setShowCedenteSuggestions] = useState(false);
  const [filteredCedenteImprese, setFilteredCedenteImprese] = useState<Impresa[]>([]);

  const [formData, setFormData] = useState({
    // Dati Generali (Frontespizio)
    numero_protocollo: '',
    data_protocollazione: new Date().toISOString().split('T')[0],
    oggetto: '', // Vuoto - da compilare a scelta
    numero_file: '',
    
    // Dati Concessione
    durata_anni: '10', // Default 10 anni
    data_decorrenza: new Date().toISOString().split('T')[0],
    data_scadenza: (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 10); return d.toISOString().split('T')[0]; })(), // Calcolata automaticamente
    tipo_concessione: 'subingresso', // nuova, subingresso, conversione, rinnovo, voltura
    sottotipo_conversione: '', // tipo_b_a, merceologia, dimensioni
    
    // Concessionario
    cf_concessionario: '',
    partita_iva: '',
    ragione_sociale: '',
    qualita: 'legale rappresentante', // titolare, legale rappresentante
    nome: '',
    cognome: '',
    data_nascita: '',
    luogo_nascita: '',
    residenza_via: '',
    residenza_comune: '',
    residenza_provincia: '',
    residenza_cap: '',
    // Sede Legale (nuovi campi)
    sede_legale_via: '',
    sede_legale_comune: '',
    sede_legale_provincia: '',
    sede_legale_cap: '',
    
    // Cedente (solo per subingresso)
    cedente_cf: '',
    cedente_partita_iva: '',
    cedente_ragione_sociale: '',
    cedente_impresa_id: '',
    autorizzazione_precedente_pg: '',
    autorizzazione_precedente_data: '',
    autorizzazione_precedente_intestatario: '',
    
    // Posteggio
    mercato: '',
    mercato_id: '',
    ubicazione: '',
    posteggio: '',
    posteggio_id: '',
    fila: '',
    mq: '',
    dimensioni_lineari: '',
    giorno: '',
    tipo_posteggio: '',
    attrezzature: '',
    merceologia: 'Non Alimentare',
    limitazioni_merceologia: '',
    
    // Conversione (nuovi campi)
    merceologia_precedente: '',
    merceologia_nuova: '',
    dimensioni_precedenti: '',
    dimensioni_nuove: '',
    mq_precedenti: '',
    mq_nuovi: '',
    
    // Dati Economici
    canone_unico: '',
    
    // Riferimenti
    scia_precedente_numero: '',
    scia_precedente_data: '',
    scia_precedente_comune: '',
    
    // Allegati
    planimetria_allegata: false,
    prescrizioni: ''
  });

  // Pre-compila il form se ci sono dati iniziali (da SCIA)
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
      
      // NOTA: La pre-selezione del mercato viene gestita nell'useEffect che carica i mercati
      // per evitare race condition
      
      toast.info('Form pre-compilato con i dati della SCIA', { description: 'Verifica e completa i dati mancanti' });
    }
  }, [initialData]);

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
          console.log('[ConcessioneForm] Mercati caricati:', marketsJson.data.length);
          console.log('[ConcessioneForm] initialData.mercato_id:', initialData?.mercato_id);
          
          // Se c'è mercato_id da initialData, trova e seleziona il mercato
          if (initialData?.mercato_id) {
            const mercatoIdNum = Number(initialData.mercato_id);
            console.log('[ConcessioneForm] Cercando mercato con ID:', mercatoIdNum);
            const targetMarket = marketsJson.data.find((m: Market) => m.id === mercatoIdNum);
            console.log('[ConcessioneForm] Mercato trovato:', targetMarket);
            
            if (targetMarket) {
              // Setta PRIMA selectedMarketId per il Select
              setSelectedMarketId(targetMarket.id);
              setSelectedMarket(targetMarket);
              
              // Aggiorna formData con i dati del mercato
              setFormData(prev => ({
                ...prev,
                mercato: targetMarket.name,
                ubicazione: targetMarket.municipality,
                giorno: targetMarket.days
              }));
              
              console.log('[ConcessioneForm] Mercato pre-selezionato:', targetMarket.name, 'ID:', targetMarket.id);
            } else {
              console.warn('[ConcessioneForm] Mercato non trovato con ID:', mercatoIdNum);
            }
          }
        }
        
        // Carica tutte le imprese per autocomplete
        const impreseRes = await fetch(`${API_URL}/api/imprese`);
        const impreseJson = await impreseRes.json();
        if (impreseJson.success && impreseJson.data) {
          setAllImprese(impreseJson.data);
        }
      } catch (error) {
        console.error('Errore fetch dati:', error);
        toast.error('Errore caricamento dati');
      } finally {
        setLoadingMarkets(false);
      }
    };
    
    fetchData();
  }, [initialData]);

  // Filtra imprese mentre si digita (autocomplete Concessionario)
  useEffect(() => {
    if (searchQuery.length < 2) {
      setFilteredImprese([]);
      setShowSuggestions(false);
      return;
    }
    
    const query = searchQuery.toUpperCase();
    const filtered = allImprese.filter(i => 
      i.denominazione?.toUpperCase().includes(query) ||
      i.codice_fiscale?.toUpperCase().includes(query) ||
      i.partita_iva?.includes(query.replace(/\D/g, ''))
    ).slice(0, 10); // Max 10 suggerimenti
    
    setFilteredImprese(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [searchQuery, allImprese]);

  // Filtra imprese mentre si digita (autocomplete Cedente)
  useEffect(() => {
    if (cedenteSearchQuery.length < 2) {
      setFilteredCedenteImprese([]);
      setShowCedenteSuggestions(false);
      return;
    }
    
    const query = cedenteSearchQuery.toUpperCase();
    const filtered = allImprese.filter(i => 
      i.denominazione?.toUpperCase().includes(query) ||
      i.codice_fiscale?.toUpperCase().includes(query) ||
      i.partita_iva?.includes(query.replace(/\D/g, ''))
    ).slice(0, 10); // Max 10 suggerimenti
    
    setFilteredCedenteImprese(filtered);
    setShowCedenteSuggestions(filtered.length > 0);
  }, [cedenteSearchQuery, allImprese]);

  // Carica posteggi quando cambia mercato
  useEffect(() => {
    if (!selectedMarketId) {
      setStalls([]);
      return;
    }

    const fetchStalls = async () => {
      try {
        setLoadingStalls(true);
        const res = await fetch(`${API_URL}/api/markets/${selectedMarketId}/stalls`);
        const json = await res.json();
        
        if (json.success && json.data) {
          // Ordina posteggi per numero
          const sortedStalls = json.data.sort((a: Stall, b: Stall) => {
            const numA = parseInt(a.number) || 0;
            const numB = parseInt(b.number) || 0;
            return numA - numB;
          });
          setStalls(sortedStalls);
          
          // Se c'è posteggio_id da initialData, auto-seleziona il posteggio
          if (initialData?.posteggio_id || initialData?.posteggio) {
            const targetStall = sortedStalls.find((s: Stall) => 
              s.id === Number(initialData.posteggio_id) || 
              s.number === String(initialData.posteggio_id) ||
              s.number === String(initialData.posteggio)
            );
            if (targetStall) {
              // Setta l'ID per il Select
              setSelectedStallId(targetStall.id);
              // Auto-compila i dati del posteggio
              setFormData(prev => ({
                ...prev,
                posteggio: targetStall.number,
                posteggio_id: targetStall.id.toString(),
                mq: targetStall.area_mq || '',
                dimensioni_lineari: targetStall.dimensions || '',
                tipo_posteggio: targetStall.type || ''
              }));
            }
          }
        } else {
          console.error('Errore caricamento posteggi:', json);
        }
      } catch (error) {
        console.error('Errore fetch posteggi:', error);
        toast.error('Errore caricamento posteggi');
      } finally {
        setLoadingStalls(false);
      }
    };
    
    fetchStalls();
  }, [selectedMarketId, initialData]);

  // Seleziona impresa dall'autocomplete (Concessionario)
  const selectImpresa = (impresa: Impresa) => {
    setFormData(prev => ({
      ...prev,
      cf_concessionario: impresa.codice_fiscale || '',
      partita_iva: impresa.partita_iva || '',
      ragione_sociale: impresa.denominazione || '',
      nome: impresa.rappresentante_legale_nome || '',
      cognome: impresa.rappresentante_legale_cognome || '',
      data_nascita: impresa.rappresentante_legale_data_nascita ? impresa.rappresentante_legale_data_nascita.split('T')[0] : '',
      luogo_nascita: impresa.rappresentante_legale_luogo_nascita || '',
      residenza_via: impresa.rappresentante_legale_residenza_via ? `${impresa.rappresentante_legale_residenza_via} ${impresa.rappresentante_legale_residenza_civico || ''}`.trim() : `${impresa.indirizzo_via || ''} ${impresa.indirizzo_civico || ''}`.trim(),
      residenza_comune: impresa.rappresentante_legale_residenza_comune || impresa.comune || '',
      residenza_provincia: impresa.rappresentante_legale_residenza_provincia || impresa.indirizzo_provincia || '',
      residenza_cap: impresa.rappresentante_legale_residenza_cap || impresa.indirizzo_cap || '',
      // Sede Legale
      sede_legale_via: impresa.indirizzo_via ? `${impresa.indirizzo_via} ${impresa.indirizzo_civico || ''}`.trim() : '',
      sede_legale_comune: impresa.comune || '',
      sede_legale_provincia: impresa.indirizzo_provincia || '',
      sede_legale_cap: impresa.indirizzo_cap || ''
    }));
    setSearchQuery('');
    setShowSuggestions(false);
    setSelectedImpresaId(impresa.id);
    toast.success('Concessionario selezionato!', { description: impresa.denominazione });
  };

  // Seleziona cedente dall'autocomplete
  const selectCedente = (impresa: Impresa) => {
    setFormData(prev => ({
      ...prev,
      cedente_cf: impresa.codice_fiscale || '',
      cedente_partita_iva: impresa.partita_iva || '',
      cedente_ragione_sociale: impresa.denominazione || '',
      cedente_impresa_id: impresa.id?.toString() || '',
      autorizzazione_precedente_intestatario: impresa.denominazione || ''
    }));
    setCedenteSearchQuery('');
    setShowCedenteSuggestions(false);
    toast.success('Cedente selezionato!', { description: impresa.denominazione });
  };

  // Handler cambio mercato
  const handleMarketChange = (marketId: string) => {
    const market = markets.find(m => m.id === parseInt(marketId));
    setSelectedMarketId(parseInt(marketId));
    setSelectedMarket(market || null);
    setFormData(prev => ({
      ...prev,
      mercato: market?.name || '',
      mercato_id: marketId,
      ubicazione: market?.municipality || '',
      giorno: market?.days || '',
      // Reset posteggio quando cambia mercato
      posteggio: '',
      posteggio_id: '',
      mq: '',
      dimensioni_lineari: '',
      tipo_posteggio: '',
      canone_unico: ''
    }));
  };

  // Handler cambio posteggio - Auto-popola dimensioni e calcola canone
  const handleStallChange = (stallId: string) => {
    setSelectedStallId(parseInt(stallId));
    const stall = stalls.find(s => s.id === parseInt(stallId));
    if (stall) {
      // Calcola canone se disponibili i dati
      let canone = '';
      if (selectedMarket?.cost_per_sqm && selectedMarket?.annual_market_days && stall.area_mq) {
        const canoneAnnuo = parseFloat(stall.area_mq) * parseFloat(selectedMarket.cost_per_sqm) * selectedMarket.annual_market_days;
        canone = canoneAnnuo.toFixed(2);
      }
      
      setFormData(prev => ({
        ...prev,
        posteggio: stall.number,
        posteggio_id: stallId,
        mq: stall.area_mq || '',
        dimensioni_lineari: stall.dimensions || `${stall.width} x ${stall.depth}`,
        tipo_posteggio: stall.type || '',
        canone_unico: canone
      }));
      toast.success(`Posteggio ${stall.number} selezionato`, { 
        description: `${stall.area_mq} mq - ${stall.dimensions || `${stall.width} x ${stall.depth}`}` 
      });
    }
  };

  const calculateExpiry = (years: string) => {
    const date = new Date(formData.data_decorrenza || formData.data_protocollazione);
    date.setFullYear(date.getFullYear() + parseInt(years));
    setFormData(prev => ({
      ...prev,
      durata_anni: years,
      data_scadenza: date.toISOString().split('T')[0]
    }));
  };

  // Ricalcola scadenza quando cambia data decorrenza
  const handleDecorrenzaChange = (dataDecorrenza: string) => {
    const date = new Date(dataDecorrenza);
    date.setFullYear(date.getFullYear() + parseInt(formData.durata_anni));
    setFormData(prev => ({
      ...prev,
      data_decorrenza: dataDecorrenza,
      data_scadenza: date.toISOString().split('T')[0]
    }));
  };

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazione campi obbligatori
    if (!selectedMarketId) {
      toast.error('Seleziona un mercato');
      return;
    }
    if (!selectedStallId) {
      toast.error('Seleziona un posteggio');
      return;
    }
    
    setSaving(true);
    
    try {
      // Prepara i dati per l'API
      const dataToSave = {
        ...formData,
        market_id: selectedMarketId,
        stall_id: selectedStallId,
        valid_to: formData.data_scadenza,
        impresa_id: selectedImpresaId || null,
        scia_id: initialData?.scia_id || null
      };
      
      const response = await fetch(`${API_URL}/api/concessions/full`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Concessione salvata con successo!');
        onSubmit(result.data);
      } else {
        toast.error(`Errore: ${result.error || 'Impossibile salvare la concessione'}`);
      }
    } catch (error) {
      console.error('Errore salvataggio concessione:', error);
      toast.error('Errore di connessione al server');
    } finally {
      setSaving(false);
    }
  };

  // Verifica se mostrare sezioni condizionali
  const mostraCedente = formData.tipo_concessione === 'subingresso';
  const mostraConversione = formData.tipo_concessione === 'conversione';
  const mostraScia = formData.tipo_concessione === 'subingresso';
  const mostraAutorizzazionePrecedente = ['subingresso', 'conversione', 'rinnovo', 'voltura'].includes(formData.tipo_concessione);

  return (
    <Card className="bg-[#0a1628] border-[#1e293b] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-[#e8fbff] flex items-center gap-2">
          <FileText className="text-[#00f0ff]" />
          Generazione Atto di Concessione
        </CardTitle>
        <CardDescription className="text-[#e8fbff]/60">
          Frontespizio Documento Informatico e Concessione
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* DATI GENERALI (FRONTESPIZIO) */}
          <div className="space-y-4 border-b border-[#1e293b] pb-6">
            <h3 className="text-lg font-semibold text-[#e8fbff]">Dati Generali (Frontespizio)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Numero / Anno PG</Label>
                <Input 
                  value={formData.numero_protocollo}
                  onChange={(e) => setFormData({...formData, numero_protocollo: e.target.value})}
                  placeholder="Es. 449021/2024"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Protocollazione</Label>
                <Input 
                  type="date"
                  value={formData.data_protocollazione}
                  onChange={(e) => setFormData({...formData, data_protocollazione: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Numero File</Label>
                <Input 
                  value={formData.numero_file}
                  onChange={(e) => setFormData({...formData, numero_file: e.target.value})}
                  placeholder="Es. 2"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Oggetto</Label>
              <Textarea 
                value={formData.oggetto}
                onChange={(e) => setFormData({...formData, oggetto: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] min-h-[80px]"
              />
            </div>
          </div>

          {/* TIPO E DURATA CONCESSIONE */}
          <div className="space-y-4 border-b border-[#1e293b] pb-6">
            <h3 className="text-lg font-semibold text-[#e8fbff]">Tipo e Durata Concessione</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Tipo Concessione *</Label>
                <Select value={formData.tipo_concessione} onValueChange={(val) => setFormData({...formData, tipo_concessione: val, sottotipo_conversione: ''})}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuova">Nuova Autorizzazione</SelectItem>
                    <SelectItem value="subingresso">Subingresso</SelectItem>
                    <SelectItem value="conversione">Conversione</SelectItem>
                    <SelectItem value="rinnovo">Rinnovo</SelectItem>
                    <SelectItem value="voltura">Voltura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Sottotipo Conversione - visibile solo se tipo = conversione */}
              {mostraConversione && (
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Sottotipo Conversione *</Label>
                  <Select value={formData.sottotipo_conversione} onValueChange={(val) => setFormData({...formData, sottotipo_conversione: val})}>
                    <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tipo_b_a">Tipo B → Tipo A</SelectItem>
                      <SelectItem value="merceologia">Cambio Merceologia</SelectItem>
                      <SelectItem value="dimensioni">Cambio Dimensioni</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Durata (Anni)</Label>
                <Select value={formData.durata_anni} onValueChange={calculateExpiry}>
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
                <Label className="text-[#e8fbff]">Data Decorrenza</Label>
                <Input 
                  type="date"
                  value={formData.data_decorrenza}
                  onChange={(e) => handleDecorrenzaChange(e.target.value)}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
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
          </div>

          {/* CONCESSIONARIO */}
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Dati Concessionario (Subentrante)</h3>
            
            {/* Riga 1: Ricerca con autocomplete, P.IVA, CF e Ragione Sociale */}
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
                  placeholder="Partita IVA"
                  value={formData.partita_iva}
                  readOnly
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Codice Fiscale</Label>
                <Input 
                  placeholder="Codice Fiscale"
                  value={formData.cf_concessionario}
                  readOnly
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ragione Sociale</Label>
                <Input 
                  placeholder="Ragione Sociale"
                  value={formData.ragione_sociale}
                  readOnly
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                />
              </div>
            </div>

            {/* Riga 2: Qualità e Dati Personali */}
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

            {/* Riga 3: Residenza */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
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
                  onChange={(e) => setFormData({...formData, residenza_provincia: e.target.value.toUpperCase()})}
                  placeholder="Es. BO"
                  maxLength={2}
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

            {/* Riga 4: Sede Legale */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
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
                  onChange={(e) => setFormData({...formData, sede_legale_provincia: e.target.value.toUpperCase()})}
                  placeholder="Es. BO"
                  maxLength={2}
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

          {/* CEDENTE - Solo per Subingresso */}
          {mostraCedente && (
            <div className="space-y-4 border p-4 rounded-lg border-[#14b8a6]/30 bg-[#14b8a6]/5">
              <h3 className="text-sm font-semibold text-[#14b8a6]">Dati Cedente (Solo per Subingresso)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 relative">
                  <Label className="text-[#14b8a6]">Cerca Cedente *</Label>
                  <Input 
                    placeholder="P.IVA / CF / Nome"
                    value={cedenteSearchQuery}
                    onChange={(e) => setCedenteSearchQuery(e.target.value.toUpperCase())}
                    onFocus={() => cedenteSearchQuery.length >= 2 && setShowCedenteSuggestions(true)}
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                  {showCedenteSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-[#0a1628] border border-[#1e293b] rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCedenteImprese.map((impresa) => (
                        <div
                          key={impresa.id}
                          className="px-3 py-2 cursor-pointer hover:bg-[#1e293b] text-[#e8fbff] text-sm"
                          onClick={() => selectCedente(impresa)}
                        >
                          <div className="font-medium">{impresa.denominazione}</div>
                          <div className="text-xs text-gray-400">
                            P.IVA: {impresa.partita_iva || '-'} | CF: {impresa.codice_fiscale || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[#14b8a6]">Partita IVA Cedente</Label>
                  <Input 
                    placeholder="01234567890"
                    value={formData.cedente_partita_iva || ''}
                    readOnly
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#14b8a6]">Codice Fiscale Cedente</Label>
                  <Input 
                    placeholder="RSSMRA..."
                    value={formData.cedente_cf}
                    readOnly
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#14b8a6]">Ragione Sociale Cedente</Label>
                  <Input 
                    placeholder="Ragione Sociale Cedente"
                    value={formData.cedente_ragione_sociale}
                    readOnly
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]"
                  />
                </div>
              </div>
              
              {/* Autorizzazione Precedente */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Autorizzazione Prec. PG</Label>
                  <Input 
                    value={formData.autorizzazione_precedente_pg}
                    onChange={(e) => setFormData({...formData, autorizzazione_precedente_pg: e.target.value})}
                    placeholder="Es. 123456/2020"
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Data Autorizzazione Prec.</Label>
                  <Input 
                    type="date"
                    value={formData.autorizzazione_precedente_data}
                    onChange={(e) => setFormData({...formData, autorizzazione_precedente_data: e.target.value})}
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Intestatario Prec.</Label>
                  <Input 
                    value={formData.autorizzazione_precedente_intestatario}
                    onChange={(e) => setFormData({...formData, autorizzazione_precedente_intestatario: e.target.value})}
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CONVERSIONE - Solo per Conversione */}
          {mostraConversione && formData.sottotipo_conversione && (
            <div className="space-y-4 border p-4 rounded-lg border-[#f59e0b]/30 bg-[#f59e0b]/5">
              <h3 className="text-sm font-semibold text-[#f59e0b]">Dati Conversione</h3>
              
              {formData.sottotipo_conversione === 'merceologia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#e8fbff]">Merceologia Precedente</Label>
                    <Select value={formData.merceologia_precedente} onValueChange={(val) => setFormData({...formData, merceologia_precedente: val})}>
                      <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alimentare">Alimentare</SelectItem>
                        <SelectItem value="Non Alimentare">Non Alimentare</SelectItem>
                        <SelectItem value="Misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#e8fbff]">Merceologia Nuova</Label>
                    <Select value={formData.merceologia_nuova} onValueChange={(val) => setFormData({...formData, merceologia_nuova: val})}>
                      <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alimentare">Alimentare</SelectItem>
                        <SelectItem value="Non Alimentare">Non Alimentare</SelectItem>
                        <SelectItem value="Misto">Misto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {formData.sottotipo_conversione === 'dimensioni' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#e8fbff]">MQ Precedenti</Label>
                    <Input 
                      value={formData.mq_precedenti}
                      onChange={(e) => setFormData({...formData, mq_precedenti: e.target.value})}
                      className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#e8fbff]">Dimensioni Prec. (m x m)</Label>
                    <Input 
                      value={formData.dimensioni_precedenti}
                      onChange={(e) => setFormData({...formData, dimensioni_precedenti: e.target.value})}
                      placeholder="Es. 4 x 6"
                      className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#e8fbff]">MQ Nuovi</Label>
                    <Input 
                      value={formData.mq_nuovi}
                      onChange={(e) => setFormData({...formData, mq_nuovi: e.target.value})}
                      className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#e8fbff]">Dimensioni Nuove (m x m)</Label>
                    <Input 
                      value={formData.dimensioni_nuove}
                      onChange={(e) => setFormData({...formData, dimensioni_nuove: e.target.value})}
                      placeholder="Es. 5 x 8"
                      className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* POSTEGGIO */}
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Dati Posteggio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DROPDOWN MERCATI DINAMICO */}
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Mercato *</Label>
                <Select value={selectedMarketId?.toString() || ''} onValueChange={handleMarketChange} disabled={loadingMarkets}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder={loadingMarkets ? "Caricamento..." : "Seleziona Mercato"} />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name} ({m.municipality})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ubicazione</Label>
                <Input 
                  value={formData.ubicazione} 
                  onChange={(e) => setFormData({...formData, ubicazione: e.target.value})}
                  placeholder="Auto-popolato dal mercato"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Fila</Label>
                <Input 
                  value={formData.fila} 
                  onChange={(e) => setFormData({...formData, fila: e.target.value})}
                  placeholder="Es. A, B, C"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
              {/* DROPDOWN POSTEGGI FILTRATO */}
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Posteggio *</Label>
                <Select 
                  value={selectedStallId?.toString() || ''}
                  onValueChange={handleStallChange} 
                  disabled={!selectedMarketId || loadingStalls}
                >
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder={
                      !selectedMarketId 
                        ? "Prima seleziona mercato" 
                        : loadingStalls 
                          ? "Caricamento..." 
                          : "Seleziona Posteggio"
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {stalls.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.number} - {s.area_mq} mq {s.vendor_business_name ? `(${s.vendor_business_name})` : '(Libero)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">MQ</Label>
                <Input 
                  value={formData.mq} 
                  onChange={(e) => setFormData({...formData, mq: e.target.value})}
                  placeholder="Auto-popolato"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]" 
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni (m x m)</Label>
                <Input 
                  value={formData.dimensioni_lineari} 
                  onChange={(e) => setFormData({...formData, dimensioni_lineari: e.target.value})}
                  placeholder="Auto-popolato"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]" 
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Giorno</Label>
                <Input 
                  value={formData.giorno} 
                  onChange={(e) => setFormData({...formData, giorno: e.target.value})}
                  placeholder="Auto-popolato"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]" 
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Tipo Posteggio</Label>
                <Input 
                  value={formData.tipo_posteggio} 
                  onChange={(e) => setFormData({...formData, tipo_posteggio: e.target.value})}
                  placeholder="Auto-popolato (fisso/spunta)"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff] bg-[#0a1628]" 
                  readOnly
                />
              </div>
               <div className="space-y-2">
                <Label className="text-[#e8fbff]">Attrezzature</Label>
                <Input 
                  value={formData.attrezzature} 
                  onChange={(e) => setFormData({...formData, attrezzature: e.target.value})}
                  placeholder="Es. Banco e automezzo"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Merceologia</Label>
                <Select 
                  value={formData.merceologia}
                  onValueChange={(val) => setFormData({...formData, merceologia: val})}
                >
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alimentare">Alimentare</SelectItem>
                    <SelectItem value="Non Alimentare">Non Alimentare</SelectItem>
                    <SelectItem value="Misto">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Limitazioni Merceologia</Label>
              <Input 
                value={formData.limitazioni_merceologia} 
                onChange={(e) => setFormData({...formData, limitazioni_merceologia: e.target.value})}
                placeholder="Es. Esclusi prodotti ittici"
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
              />
            </div>
          </div>

          {/* RIFERIMENTI SCIA E CANONE */}
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Riferimenti e Canone</h3>
            
            {/* SCIA - Solo per Subingresso */}
            {mostraScia && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-[#1e293b]">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">SCIA Precedente N.</Label>
                  <Input 
                    value={formData.scia_precedente_numero} 
                    onChange={(e) => setFormData({...formData, scia_precedente_numero: e.target.value})}
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Data SCIA</Label>
                  <Input 
                    type="date"
                    value={formData.scia_precedente_data} 
                    onChange={(e) => setFormData({...formData, scia_precedente_data: e.target.value})}
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Comune SCIA</Label>
                  <Input 
                    value={formData.scia_precedente_comune} 
                    onChange={(e) => setFormData({...formData, scia_precedente_comune: e.target.value})}
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Canone Annuo (€)</Label>
                <Input 
                  value={formData.canone_unico} 
                  onChange={(e) => setFormData({...formData, canone_unico: e.target.value})}
                  placeholder="Auto-calcolato o da Wallet/PagoPA"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
            </div>
          </div>

          {/* ALLEGATI E PRESCRIZIONI */}
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Allegati e Prescrizioni</h3>
            
            <div className="flex items-center gap-4">
              <input 
                type="checkbox"
                id="planimetria"
                checked={formData.planimetria_allegata}
                onChange={(e) => setFormData({...formData, planimetria_allegata: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="planimetria" className="text-[#e8fbff]">Planimetria Allegata</Label>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Prescrizioni</Label>
              <Textarea 
                value={formData.prescrizioni}
                onChange={(e) => setFormData({...formData, prescrizioni: e.target.value})}
                placeholder="Eventuali prescrizioni o note..."
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff] min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel} className="border-[#e8fbff]/20 text-[#e8fbff]">
              Annulla
            </Button>
            <Button type="submit" className="bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90" disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...</>
              ) : (
                <><Printer className="mr-2 h-4 w-4" /> Genera Atto</>
              )}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
