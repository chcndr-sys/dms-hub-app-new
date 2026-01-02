import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, FileText, Loader2, Building2, X } from 'lucide-react';
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
  vendor_business_name?: string;
  vendor_contact_name?: string;
  impresa_id?: number;
  concession_id?: number;
}

interface Impresa {
  id: number;
  denominazione: string;
  partita_iva: string;
  codice_fiscale: string;
  pec: string;
  telefono: string;
  email: string;
  indirizzo_via: string;
  indirizzo_civico: string;
  indirizzo_cap: string;
  comune: string;
  indirizzo_provincia: string;
  rappresentante_legale_nome: string;
  rappresentante_legale_cognome: string;
  rappresentante_legale_cf: string;
  rappresentante_legale_data_nascita: string;
  rappresentante_legale_luogo_nascita: string;
  rappresentante_legale_residenza_via: string;
  rappresentante_legale_residenza_civico: string;
  rappresentante_legale_residenza_cap: string;
  rappresentante_legale_residenza_comune: string;
  rappresentante_legale_residenza_provincia: string;
}

// Funzione per capitalizzare la prima lettera
const capitalize = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Funzione per capitalizzare ogni parola
const capitalizeWords = (str: string) => {
  if (!str) return str;
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

export default function SciaForm({ onCancel, onSubmit }: { onCancel: () => void, onSubmit: (data: any) => void }) {
  // Stati per dati dal database
  const [markets, setMarkets] = useState<Market[]>([]);
  const [allStalls, setAllStalls] = useState<Map<number, Stall[]>>(new Map()); // Tutti i posteggi per mercato
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [allImprese, setAllImprese] = useState<Impresa[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [selectedImpresa, setSelectedImpresa] = useState<Impresa | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [loadingImpresa, setLoadingImpresa] = useState(false);
  
  // Stati per autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredImprese, setFilteredImprese] = useState<Impresa[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Stati per mercati/posteggi filtrati per impresa
  const [impresaMarkets, setImpresaMarkets] = useState<number[]>([]); // IDs dei mercati dove l'impresa ha posteggi
  const [impresaStalls, setImpresaStalls] = useState<Map<number, number[]>>(new Map()); // market_id -> [stall_ids]

  // Genera numero protocollo SCIA automatico
  const generateProtocollo = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `SCIA-${year}-${random}`;
  };

  // Form data
  const [formData, setFormData] = useState({
    // Dati Protocollo SCIA
    numero_protocollo: generateProtocollo(),
    data_presentazione: new Date().toISOString().split('T')[0],
    comune_presentazione: 'MODENA',
    
    // Motivazione SCIA
    motivazione_scia: 'subingresso',
    
    // Motivo Subingresso (visibile solo se motivazione_scia = subingresso)
    motivo_subingresso: 'acquisto',
    
    // Ruolo dichiarante
    ruolo_dichiarante: 'titolare',
    
    // Tipologia attività
    tipologia_attivita: 'non_alimentare',
    
    // Sezione A - Subentrante
    cf_subentrante: '',
    ragione_sociale_sub: '',
    nome_sub: '',
    cognome_sub: '',
    data_nascita_sub: '',
    luogo_nascita_sub: '',
    residenza_via_sub: '',
    residenza_comune_sub: '',
    residenza_cap_sub: '',
    sede_via_sub: '',
    sede_comune_sub: '',
    sede_cap_sub: '',
    sede_provincia_sub: '',
    pec_sub: '',
    
    // Dati Delegato (se ruolo_dichiarante != titolare)
    delegato_nome: '',
    delegato_cognome: '',
    delegato_cf: '',
    delegato_data_nascita: '',
    delegato_luogo_nascita: '',
    delegato_residenza_via: '',
    delegato_residenza_comune: '',
    delegato_residenza_cap: '',
    delegato_residenza_provincia: '',
    delegato_qualifica: '',
    telefono_sub: '',
    
    // Sezione B - Cedente
    cf_cedente: '',
    ragione_sociale_ced: '',
    nome_ced: '',
    cognome_ced: '',
    data_nascita_ced: '',
    luogo_nascita_ced: '',
    residenza_via_ced: '',
    residenza_comune_ced: '',
    residenza_cap_ced: '',
    pec_ced: '',
    scia_precedente_protocollo: '',
    scia_precedente_data: '',
    scia_precedente_comune: 'BOLOGNA',

    // Sezione C - Posteggio
    mercato: '',
    mercato_id: '',
    ubicazione_mercato: '',
    giorno_mercato: '',
    posteggio: '',
    posteggio_id: '',
    fila: '',
    dimensioni_mq: '',
    dimensioni_lineari: '',
    settore: '',
    merceologia: 'non_alimentare',
    attrezzature: '',

    // Sezione D - Atto Notarile
    notaio: '',
    repertorio: '',
    data_atto: ''
  });

  // Chiudi suggerimenti quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra imprese mentre si digita
  useEffect(() => {
    if (searchQuery.length < 2) {
      setFilteredImprese([]);
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
          
          // Carica tutti i posteggi per ogni mercato
          const stallsMap = new Map<number, Stall[]>();
          for (const market of marketsJson.data) {
            try {
              const stallsRes = await fetch(`${API_URL}/api/markets/${market.id}/stalls`);
              const stallsJson = await stallsRes.json();
              if (stallsJson.success && stallsJson.data) {
                const sorted = stallsJson.data.sort((a: Stall, b: Stall) => {
                  const numA = parseInt(a.number) || 0;
                  const numB = parseInt(b.number) || 0;
                  return numA - numB;
                });
                stallsMap.set(market.id, sorted);
              }
            } catch (e) {
              console.error(`Errore caricamento posteggi mercato ${market.id}:`, e);
            }
          }
          setAllStalls(stallsMap);
        }
        
        // Carica tutte le imprese per ricerca locale
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
  }, []);

  // Quando cambia l'impresa selezionata, trova i suoi mercati e posteggi
  useEffect(() => {
    if (!selectedImpresa) {
      setImpresaMarkets([]);
      setImpresaStalls(new Map());
      return;
    }
    
    const marketIds: number[] = [];
    const stallsPerMarket = new Map<number, number[]>();
    
    // Cerca in tutti i posteggi quelli intestati a questa impresa
    allStalls.forEach((stalls, marketId) => {
      const impresaStallIds = stalls
        .filter(s => s.impresa_id === selectedImpresa.id)
        .map(s => s.id);
      
      if (impresaStallIds.length > 0) {
        marketIds.push(marketId);
        stallsPerMarket.set(marketId, impresaStallIds);
      }
    });
    
    setImpresaMarkets(marketIds);
    setImpresaStalls(stallsPerMarket);
    
    // Reset selezione mercato/posteggio quando cambia impresa
    setSelectedMarketId(null);
    setStalls([]);
    setFormData(prev => ({
      ...prev,
      mercato: '',
      mercato_id: '',
      ubicazione_mercato: '',
      giorno_mercato: '',
      posteggio: '',
      posteggio_id: '',
      dimensioni_mq: '',
      dimensioni_lineari: '',
      attrezzature: ''
    }));
  }, [selectedImpresa, allStalls]);

  // Carica posteggi quando cambia mercato (filtrati per impresa se selezionata)
  useEffect(() => {
    if (!selectedMarketId) {
      setStalls([]);
      return;
    }

    const marketStalls = allStalls.get(selectedMarketId) || [];
    
    // Se c'è un'impresa selezionata, filtra solo i suoi posteggi
    if (selectedImpresa && impresaStalls.has(selectedMarketId)) {
      const allowedIds = impresaStalls.get(selectedMarketId) || [];
      const filtered = marketStalls.filter(s => allowedIds.includes(s.id));
      setStalls(filtered);
    } else if (!selectedImpresa) {
      // Se non c'è impresa selezionata, mostra tutti
      setStalls(marketStalls);
    } else {
      setStalls([]);
    }
  }, [selectedMarketId, selectedImpresa, allStalls, impresaStalls]);

  // Mercati filtrati (solo quelli dove l'impresa ha posteggi, se selezionata)
  const filteredMarkets = useMemo(() => {
    if (!selectedImpresa || impresaMarkets.length === 0) {
      return markets;
    }
    return markets.filter(m => impresaMarkets.includes(m.id));
  }, [markets, selectedImpresa, impresaMarkets]);

  // Popola dati impresa nel form (per Subentrante)
  const populateSubentranteData = (impresa: Impresa) => {
    setFormData(prev => ({
      ...prev,
      cf_subentrante: impresa.codice_fiscale || impresa.partita_iva || '',
      ragione_sociale_sub: impresa.denominazione || '',
      nome_sub: capitalizeWords(impresa.rappresentante_legale_nome || ''),
      cognome_sub: capitalizeWords(impresa.rappresentante_legale_cognome || ''),
      data_nascita_sub: impresa.rappresentante_legale_data_nascita ? impresa.rappresentante_legale_data_nascita.split('T')[0] : '',
      luogo_nascita_sub: capitalizeWords(impresa.rappresentante_legale_luogo_nascita || ''),
      residenza_via_sub: capitalizeWords(`${impresa.rappresentante_legale_residenza_via || ''} ${impresa.rappresentante_legale_residenza_civico || ''}`.trim()),
      residenza_comune_sub: capitalizeWords(impresa.rappresentante_legale_residenza_comune || ''),
      residenza_cap_sub: impresa.rappresentante_legale_residenza_cap || '',
      sede_via_sub: capitalizeWords(`${impresa.indirizzo_via || ''} ${impresa.indirizzo_civico || ''}`.trim()),
      sede_comune_sub: capitalizeWords(impresa.comune || ''),
      sede_cap_sub: impresa.indirizzo_cap || '',
      pec_sub: impresa.pec || '',
      telefono_sub: impresa.telefono || ''
    }));
  };

  // Popola dati impresa nel form (per Cedente)
  const populateCedenteData = (impresa: Impresa) => {
    setFormData(prev => ({
      ...prev,
      cf_cedente: impresa.codice_fiscale || impresa.partita_iva || '',
      ragione_sociale_ced: impresa.denominazione || '',
      nome_ced: capitalizeWords(impresa.rappresentante_legale_nome || ''),
      cognome_ced: capitalizeWords(impresa.rappresentante_legale_cognome || ''),
      data_nascita_ced: impresa.rappresentante_legale_data_nascita ? impresa.rappresentante_legale_data_nascita.split('T')[0] : '',
      luogo_nascita_ced: capitalizeWords(impresa.rappresentante_legale_luogo_nascita || ''),
      residenza_via_ced: capitalizeWords(`${impresa.rappresentante_legale_residenza_via || ''} ${impresa.rappresentante_legale_residenza_civico || ''}`.trim()),
      residenza_comune_ced: capitalizeWords(impresa.rappresentante_legale_residenza_comune || ''),
      residenza_cap_ced: impresa.rappresentante_legale_residenza_cap || '',
      pec_ced: impresa.pec || ''
    }));
  };

  // Seleziona impresa dall'autocomplete
  const handleSelectImpresa = (impresa: Impresa) => {
    setSelectedImpresa(impresa);
    setSearchQuery(impresa.denominazione);
    setShowSuggestions(false);
    populateSubentranteData(impresa);
    toast.success('Impresa selezionata!', { 
      description: `${impresa.denominazione} - ${impresaMarkets.length > 0 ? `${impresaMarkets.length} mercati` : 'Nessun posteggio'}` 
    });
  };

  // Reset impresa selezionata
  const handleClearImpresa = () => {
    setSelectedImpresa(null);
    setSearchQuery('');
    setFormData(prev => ({
      ...prev,
      cf_subentrante: '',
      ragione_sociale_sub: '',
      nome_sub: '',
      cognome_sub: '',
      data_nascita_sub: '',
      luogo_nascita_sub: '',
      residenza_via_sub: '',
      residenza_comune_sub: '',
      residenza_cap_sub: '',
      sede_via_sub: '',
      sede_comune_sub: '',
      sede_cap_sub: '',
      pec_sub: '',
      telefono_sub: '',
      mercato: '',
      mercato_id: '',
      posteggio: '',
      posteggio_id: ''
    }));
  };

  // Handler cambio mercato
  const handleMarketChange = (marketId: string) => {
    const market = markets.find(m => m.id === parseInt(marketId));
    setSelectedMarketId(parseInt(marketId));
    setFormData(prev => ({
      ...prev,
      mercato: market?.name || '',
      mercato_id: marketId,
      ubicazione_mercato: market?.municipality || '',
      giorno_mercato: market?.days || '',
      posteggio: '',
      posteggio_id: '',
      dimensioni_mq: '',
      dimensioni_lineari: '',
      // Reset cedente solo se non c'è impresa selezionata
      ...(selectedImpresa ? {} : {
        cf_cedente: '',
        ragione_sociale_ced: '',
        nome_ced: '',
        cognome_ced: '',
        data_nascita_ced: '',
        luogo_nascita_ced: '',
        residenza_via_ced: '',
        residenza_comune_ced: '',
        residenza_cap_ced: '',
        pec_ced: ''
      })
    }));
  };

  // Handler cambio posteggio - Auto-popola dimensioni E dati cedente
  const handleStallChange = async (stallId: string) => {
    const stall = stalls.find(s => s.id === parseInt(stallId));
    if (!stall) return;

    // Aggiorna dati posteggio
    setFormData(prev => ({
      ...prev,
      posteggio: stall.number,
      posteggio_id: stallId,
      dimensioni_mq: stall.area_mq || '',
      dimensioni_lineari: stall.dimensions || `${stall.width} x ${stall.depth}`,
      attrezzature: stall.type === 'fisso' ? 'banco' : 'banco_automezzo'
    }));

    // Se il posteggio ha un'impresa associata, carica i dati del cedente
    if (stall.impresa_id) {
      try {
        setLoadingImpresa(true);
        const res = await fetch(`${API_URL}/api/imprese/${stall.impresa_id}`);
        const json = await res.json();
        
        if (json.success && json.data) {
          populateCedenteData(json.data);
          toast.success(`Posteggio ${stall.number} selezionato`, { 
            description: `Cedente: ${json.data.denominazione}` 
          });
        }
      } catch (error) {
        console.error('Errore caricamento impresa cedente:', error);
        toast.success(`Posteggio ${stall.number} selezionato`, { 
          description: `${stall.area_mq} mq` 
        });
      } finally {
        setLoadingImpresa(false);
      }
    } else {
      toast.success(`Posteggio ${stall.number} selezionato`, { 
        description: stall.status === 'libero' ? 'Posteggio libero' : `${stall.area_mq} mq` 
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="bg-[#0f172a] border-[#1e293b] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-[#e8fbff] flex items-center gap-2">
          <FileText className="text-[#14b8a6]" />
          Compilazione Guidata SCIA
        </CardTitle>
        <CardDescription className="text-[#e8fbff]/60">
          Modello Unificato Regionale - Commercio su Aree Pubbliche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* DATI PROTOCOLLO SCIA */}
          <div className="space-y-4 p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/30">
            <h3 className="text-lg font-semibold text-[#14b8a6]">
              Dati Pratica SCIA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Numero Protocollo</Label>
                <Input 
                  value={formData.numero_protocollo}
                  onChange={(e) => setFormData({...formData, numero_protocollo: e.target.value})}
                  className="bg-[#0b1220] border-[#14b8a6]/50 text-[#14b8a6] font-mono font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Presentazione</Label>
                <Input 
                  type="date"
                  value={formData.data_presentazione}
                  onChange={(e) => setFormData({...formData, data_presentazione: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Presentazione</Label>
                <Input 
                  value={formData.comune_presentazione || 'MODENA'}
                  onChange={(e) => setFormData({...formData, comune_presentazione: e.target.value.toUpperCase()})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] uppercase"
                />
              </div>
            </div>
          </div>

          {/* RICERCA IMPRESA CON AUTOCOMPLETE */}
          <div className="space-y-4 p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/30">
            <h3 className="text-lg font-semibold text-[#3b82f6] flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Ricerca Impresa Subentrante
            </h3>
            <p className="text-sm text-[#e8fbff]/60">
              Inizia a digitare per cercare l'impresa per nome, CF o P.IVA. I mercati e posteggi verranno filtrati automaticamente.
            </p>
            
            <div className="relative" ref={searchRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Es. Alimentari Verdi, IT34567890123..."
                    className="bg-[#0b1220] border-[#3b82f6]/50 text-[#e8fbff] pr-10"
                    disabled={loadingMarkets}
                  />
                  {selectedImpresa && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                      onClick={handleClearImpresa}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Dropdown suggerimenti */}
              {showSuggestions && filteredImprese.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredImprese.map((impresa) => (
                    <button
                      key={impresa.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-[#334155] border-b border-[#334155] last:border-0 transition-colors"
                      onClick={() => handleSelectImpresa(impresa)}
                    >
                      <div className="font-medium text-[#e8fbff]">{impresa.denominazione}</div>
                      <div className="text-sm text-gray-400">
                        {impresa.codice_fiscale || impresa.partita_iva} • {impresa.comune}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Badge impresa selezionata */}
            {selectedImpresa && (
              <div className="flex items-center gap-2 p-3 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-lg">
                <Building2 className="w-5 h-5 text-[#3b82f6]" />
                <div className="flex-1">
                  <div className="font-medium text-[#e8fbff]">{selectedImpresa.denominazione}</div>
                  <div className="text-sm text-gray-400">
                    {selectedImpresa.codice_fiscale} • 
                    {impresaMarkets.length > 0 
                      ? ` ${impresaMarkets.length} mercati con posteggi`
                      : ' Nessun posteggio intestato'
                    }
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MOTIVAZIONE SCIA */}
          <div className="space-y-4 p-4 bg-[#0b1220] rounded-lg border border-[#1e293b]">
            <h3 className="text-lg font-semibold text-[#14b8a6]">
              Tipo di Segnalazione
            </h3>
            <RadioGroup 
              value={formData.motivazione_scia} 
              onValueChange={(value) => setFormData({...formData, motivazione_scia: value})}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="subingresso" id="subingresso" />
                <Label htmlFor="subingresso" className="text-[#e8fbff]">Subingresso</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cessazione" id="cessazione" />
                <Label htmlFor="cessazione" className="text-[#e8fbff]">Cessazione</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sospensione" id="sospensione" />
                <Label htmlFor="sospensione" className="text-[#e8fbff]">Sospensione</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ripresa" id="ripresa" />
                <Label htmlFor="ripresa" className="text-[#e8fbff]">Ripresa Attività</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="modifica_rs" id="modifica_rs" />
                <Label htmlFor="modifica_rs" className="text-[#e8fbff]">Modifica Ragione Sociale</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="variazione" id="variazione" />
                <Label htmlFor="variazione" className="text-[#e8fbff]">Variazione</Label>
              </div>
            </RadioGroup>
          </div>

          {/* MOTIVO SUBINGRESSO - Visibile solo se motivazione è subingresso */}
          {formData.motivazione_scia === 'subingresso' && (
            <div className="space-y-4 p-4 bg-[#0b1220] rounded-lg border border-[#1e293b]">
              <h3 className="text-lg font-semibold text-[#14b8a6]">
                Motivo del Subingresso
              </h3>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Seleziona il motivo *</Label>
                <Select 
                  value={formData.motivo_subingresso || 'acquisto'} 
                  onValueChange={(value) => setFormData({...formData, motivo_subingresso: value})}
                >
                  <SelectTrigger className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acquisto">Acquisto azienda / ramo d'azienda</SelectItem>
                    <SelectItem value="affitto">Affitto ramo d'azienda</SelectItem>
                    <SelectItem value="donazione">Donazione</SelectItem>
                    <SelectItem value="successione">Successione ereditaria</SelectItem>
                    <SelectItem value="fusione">Fusione / Scissione societaria</SelectItem>
                    <SelectItem value="conferimento">Conferimento in società</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* TIPOLOGIA ATTIVITÀ */}
          <div className="space-y-4 p-4 bg-[#0b1220] rounded-lg border border-[#1e293b]">
            <h3 className="text-lg font-semibold text-[#14b8a6]">
              Tipologia Attività
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Settore Merceologico *</Label>
                <Select 
                  value={formData.tipologia_attivita} 
                  onValueChange={(value) => setFormData({...formData, tipologia_attivita: value, merceologia: value})}
                >
                  <SelectTrigger className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alimentare">Alimentare</SelectItem>
                    <SelectItem value="non_alimentare">Non Alimentare</SelectItem>
                    <SelectItem value="misto">Misto (Alimentare e Non)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ruolo Dichiarante *</Label>
                <Select 
                  value={formData.ruolo_dichiarante} 
                  onValueChange={(value) => setFormData({...formData, ruolo_dichiarante: value})}
                >
                  <SelectTrigger className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="titolare">Titolare</SelectItem>
                    <SelectItem value="legale_rappresentante">Legale Rappresentante</SelectItem>
                    <SelectItem value="associazione">Associazione</SelectItem>
                    <SelectItem value="curatore_fallimentare">Curatore Fallimentare</SelectItem>
                    <SelectItem value="erede">Erede / Avente Causa</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SEZIONE DELEGATO - Visibile solo se ruolo_dichiarante != titolare */}
          {formData.ruolo_dichiarante !== 'titolare' && (
            <div className="space-y-4 p-4 bg-[#0f172a] rounded-lg border border-[#f59e0b]/30">
              <h3 className="text-lg font-semibold text-[#f59e0b]">
                Dati del Delegato / Procuratore
              </h3>
              <p className="text-sm text-[#e8fbff]/60">
                Compilare i dati del soggetto che presenta la SCIA in qualità di: <strong className="text-[#f59e0b]">{formData.ruolo_dichiarante.replace('_', ' ').toUpperCase()}</strong>
              </p>
              
              {/* Riga 1: Nome, Cognome, CF */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Nome Delegato *</Label>
                  <Input 
                    value={formData.delegato_nome}
                    onChange={(e) => setFormData({...formData, delegato_nome: capitalizeWords(e.target.value)})}
                    className="bg-[#0b1220] border-[#f59e0b]/50 text-[#e8fbff] capitalize"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Cognome Delegato *</Label>
                  <Input 
                    value={formData.delegato_cognome}
                    onChange={(e) => setFormData({...formData, delegato_cognome: capitalizeWords(e.target.value)})}
                    className="bg-[#0b1220] border-[#f59e0b]/50 text-[#e8fbff] capitalize"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Codice Fiscale Delegato *</Label>
                  <Input 
                    value={formData.delegato_cf}
                    onChange={(e) => setFormData({...formData, delegato_cf: e.target.value.toUpperCase()})}
                    className="bg-[#0b1220] border-[#f59e0b]/50 text-[#e8fbff] uppercase"
                    required
                  />
                </div>
              </div>

              {/* Riga 2: Data/Luogo Nascita, Qualifica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Data di Nascita</Label>
                  <Input 
                    type="date"
                    value={formData.delegato_data_nascita}
                    onChange={(e) => setFormData({...formData, delegato_data_nascita: e.target.value})}
                    className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
                  <Input 
                    value={formData.delegato_luogo_nascita}
                    onChange={(e) => setFormData({...formData, delegato_luogo_nascita: capitalizeWords(e.target.value)})}
                    className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Qualifica / Titolo *</Label>
                  <Input 
                    value={formData.delegato_qualifica}
                    onChange={(e) => setFormData({...formData, delegato_qualifica: capitalizeWords(e.target.value)})}
                    placeholder="Es. Procuratore, Curatore, Erede..."
                    className="bg-[#0b1220] border-[#f59e0b]/50 text-[#e8fbff] capitalize"
                    required
                  />
                </div>
              </div>

              {/* Riga 3: Residenza Delegato */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
                  <Input 
                    value={formData.delegato_residenza_via}
                    onChange={(e) => setFormData({...formData, delegato_residenza_via: capitalizeWords(e.target.value)})}
                    className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">Comune</Label>
                  <Input 
                    value={formData.delegato_residenza_comune}
                    onChange={(e) => setFormData({...formData, delegato_residenza_comune: capitalizeWords(e.target.value)})}
                    className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]">CAP</Label>
                  <Input 
                    value={formData.delegato_residenza_cap}
                    onChange={(e) => setFormData({...formData, delegato_residenza_cap: e.target.value})}
                    maxLength={5}
                    className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEZIONE A: SUBENTRANTE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              A. Dati Subentrante (Cessionario)
            </h3>
            
            {/* Riga 1: CF e Ragione Sociale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CF / P.IVA *</Label>
                <Input 
                  value={formData.cf_subentrante}
                  onChange={(e) => setFormData({...formData, cf_subentrante: e.target.value.toUpperCase()})}
                  placeholder="Es. RSSMRA... o 01234567890"
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ragione Sociale *</Label>
                <Input 
                  value={formData.ragione_sociale_sub}
                  onChange={(e) => setFormData({...formData, ragione_sociale_sub: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 2: Nome, Cognome, Data/Luogo Nascita */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Nome</Label>
                <Input 
                  value={formData.nome_sub}
                  onChange={(e) => setFormData({...formData, nome_sub: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Cognome</Label>
                <Input 
                  value={formData.cognome_sub}
                  onChange={(e) => setFormData({...formData, cognome_sub: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data di Nascita</Label>
                <Input 
                  type="date"
                  value={formData.data_nascita_sub}
                  onChange={(e) => setFormData({...formData, data_nascita_sub: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
                <Input 
                  value={formData.luogo_nascita_sub}
                  onChange={(e) => setFormData({...formData, luogo_nascita_sub: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
            </div>

            {/* Riga 3: Residenza */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
                <Input 
                  value={formData.residenza_via_sub}
                  onChange={(e) => setFormData({...formData, residenza_via_sub: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune</Label>
                <Input 
                  value={formData.residenza_comune_sub}
                  onChange={(e) => setFormData({...formData, residenza_comune_sub: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CAP</Label>
                <Input 
                  value={formData.residenza_cap_sub}
                  onChange={(e) => setFormData({...formData, residenza_cap_sub: e.target.value})}
                  maxLength={5}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 4: Sede Impresa */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Sede Impresa (Via)</Label>
                <Input 
                  value={formData.sede_via_sub}
                  onChange={(e) => setFormData({...formData, sede_via_sub: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Sede</Label>
                <Input 
                  value={formData.sede_comune_sub}
                  onChange={(e) => setFormData({...formData, sede_comune_sub: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Provincia</Label>
                <Input 
                  value={formData.sede_provincia_sub}
                  onChange={(e) => setFormData({...formData, sede_provincia_sub: e.target.value.toUpperCase()})}
                  maxLength={2}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CAP Sede</Label>
                <Input 
                  value={formData.sede_cap_sub}
                  onChange={(e) => setFormData({...formData, sede_cap_sub: e.target.value})}
                  maxLength={5}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 5: PEC e Telefono */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">PEC</Label>
                <Input 
                  value={formData.pec_sub}
                  onChange={(e) => setFormData({...formData, pec_sub: e.target.value.toLowerCase()})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] lowercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Telefono</Label>
                <Input 
                  value={formData.telefono_sub}
                  onChange={(e) => setFormData({...formData, telefono_sub: e.target.value})}
                  placeholder="Es. 059 123456"
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          {/* SEZIONE C: POSTEGGIO E MERCATO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              C. Dati Posteggio e Mercato
            </h3>
            
            {selectedImpresa && impresaMarkets.length === 0 && (
              <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg text-[#f59e0b] text-sm">
                ⚠️ L'impresa selezionata non ha posteggi intestati. Seleziona manualmente mercato e posteggio.
              </div>
            )}
            
            {/* Riga 1: Mercato e Posteggio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">
                  Mercato *
                  {selectedImpresa && impresaMarkets.length > 0 && (
                    <span className="text-[#3b82f6] text-xs ml-2">
                      (filtrato per {selectedImpresa.denominazione})
                    </span>
                  )}
                </Label>
                <Select 
                  value={formData.mercato_id} 
                  onValueChange={handleMarketChange}
                  disabled={loadingMarkets}
                >
                  <SelectTrigger className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder={loadingMarkets ? "Caricamento..." : "Seleziona Mercato"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMarkets.map(market => (
                      <SelectItem key={market.id} value={market.id.toString()}>
                        {market.name} ({market.municipality})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">
                  Numero Posteggio *
                  {selectedImpresa && selectedMarketId && impresaStalls.has(selectedMarketId) && (
                    <span className="text-[#3b82f6] text-xs ml-2">
                      ({impresaStalls.get(selectedMarketId)?.length} posteggi)
                    </span>
                  )}
                </Label>
                <Select 
                  value={formData.posteggio_id} 
                  onValueChange={handleStallChange}
                  disabled={!selectedMarketId || loadingStalls}
                >
                  <SelectTrigger className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder={loadingStalls ? "Caricamento..." : "Seleziona Posteggio"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stalls.map(stall => (
                      <SelectItem key={stall.id} value={stall.id.toString()}>
                        {stall.number} - {stall.area_mq} mq ({stall.vendor_business_name || 'Libero'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Riga 2: Ubicazione e Giorno */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ubicazione Mercato</Label>
                <Input 
                  value={formData.ubicazione_mercato}
                  onChange={(e) => setFormData({...formData, ubicazione_mercato: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Giorno Mercato</Label>
                <Input 
                  value={formData.giorno_mercato}
                  onChange={(e) => setFormData({...formData, giorno_mercato: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                  readOnly
                />
              </div>
            </div>

            {/* Riga 3: Dimensioni */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Fila</Label>
                <Input 
                  value={formData.fila}
                  onChange={(e) => setFormData({...formData, fila: e.target.value.toUpperCase()})}
                  placeholder="Es. A, B, C"
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni (MQ)</Label>
                <Input 
                  value={formData.dimensioni_mq}
                  readOnly
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni Lineari (m x m)</Label>
                <Input 
                  value={formData.dimensioni_lineari}
                  readOnly
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Attrezzature</Label>
                <Input 
                  value={formData.attrezzature}
                  onChange={(e) => setFormData({...formData, attrezzature: e.target.value.toLowerCase()})}
                  placeholder="Es. banco, automezzo"
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] lowercase"
                />
              </div>
            </div>
          </div>

          {/* SEZIONE B: CEDENTE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              B. Dati Cedente (Dante Causa)
            </h3>
            <p className="text-sm text-[#e8fbff]/60">
              I dati del cedente vengono compilati automaticamente quando selezioni un posteggio occupato
            </p>
            
            {/* Riga 1: CF e Ragione Sociale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CF / P.IVA Cedente *</Label>
                <Input 
                  value={formData.cf_cedente}
                  onChange={(e) => setFormData({...formData, cf_cedente: e.target.value.toUpperCase()})}
                  placeholder="Es. VRDLGI..."
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ragione Sociale Cedente</Label>
                <Input 
                  value={formData.ragione_sociale_ced}
                  onChange={(e) => setFormData({...formData, ragione_sociale_ced: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 2: Nome, Cognome, Data/Luogo Nascita Cedente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Nome</Label>
                <Input 
                  value={formData.nome_ced}
                  onChange={(e) => setFormData({...formData, nome_ced: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Cognome</Label>
                <Input 
                  value={formData.cognome_ced}
                  onChange={(e) => setFormData({...formData, cognome_ced: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data di Nascita</Label>
                <Input 
                  type="date"
                  value={formData.data_nascita_ced}
                  onChange={(e) => setFormData({...formData, data_nascita_ced: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
                <Input 
                  value={formData.luogo_nascita_ced}
                  onChange={(e) => setFormData({...formData, luogo_nascita_ced: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
            </div>

            {/* Riga 3: Residenza Cedente */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
                <Input 
                  value={formData.residenza_via_ced}
                  onChange={(e) => setFormData({...formData, residenza_via_ced: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune</Label>
                <Input 
                  value={formData.residenza_comune_ced}
                  onChange={(e) => setFormData({...formData, residenza_comune_ced: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CAP</Label>
                <Input 
                  value={formData.residenza_cap_ced}
                  onChange={(e) => setFormData({...formData, residenza_cap_ced: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">PEC</Label>
                <Input 
                  value={formData.pec_ced}
                  onChange={(e) => setFormData({...formData, pec_ced: e.target.value.toLowerCase()})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] lowercase"
                />
              </div>
            </div>

            {/* Riga 4: SCIA Precedente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">SCIA Precedente N. Prot.</Label>
                <Input 
                  value={formData.scia_precedente_protocollo}
                  onChange={(e) => setFormData({...formData, scia_precedente_protocollo: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Presentazione</Label>
                <Input 
                  type="date"
                  value={formData.scia_precedente_data}
                  onChange={(e) => setFormData({...formData, scia_precedente_data: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Presentazione</Label>
                <Input 
                  value={formData.scia_precedente_comune}
                  onChange={(e) => setFormData({...formData, scia_precedente_comune: e.target.value.toUpperCase()})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] uppercase"
                />
              </div>
            </div>
          </div>

          {/* SEZIONE D: ATTO NOTARILE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              D. Estremi Atto Notarile
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Notaio Rogante</Label>
                <Input 
                  value={formData.notaio}
                  onChange={(e) => setFormData({...formData, notaio: capitalizeWords(e.target.value)})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff] capitalize"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">N. Repertorio</Label>
                <Input 
                  value={formData.repertorio}
                  onChange={(e) => setFormData({...formData, repertorio: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Atto</Label>
                <Input 
                  type="date"
                  value={formData.data_atto}
                  onChange={(e) => setFormData({...formData, data_atto: e.target.value})}
                  className="bg-[#0b1220] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          {/* PULSANTI */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#1e293b]">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annulla
            </Button>
            <Button type="submit" className="bg-[#14b8a6] text-[#020817] hover:bg-[#14b8a6]/80">
              Genera SCIA
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
