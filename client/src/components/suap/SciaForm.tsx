import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, FileText, Loader2 } from 'lucide-react';
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

export default function SciaForm({ onCancel, onSubmit }: { onCancel: () => void, onSubmit: (data: any) => void }) {
  // Stati per dati dal database
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [allImprese, setAllImprese] = useState<Impresa[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [loadingStalls, setLoadingStalls] = useState(false);
  const [loadingImpresa, setLoadingImpresa] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
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
    pec_sub: '',
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
          const sortedStalls = json.data.sort((a: Stall, b: Stall) => {
            const numA = parseInt(a.number) || 0;
            const numB = parseInt(b.number) || 0;
            return numA - numB;
          });
          setStalls(sortedStalls);
        }
      } catch (error) {
        console.error('Errore fetch posteggi:', error);
        toast.error('Errore caricamento posteggi');
      } finally {
        setLoadingStalls(false);
      }
    };
    
    fetchStalls();
  }, [selectedMarketId]);

  // Funzione per cercare impresa (CF, P.IVA o denominazione)
  const searchImpresa = (searchValue: string): Impresa | undefined => {
    const normalizedSearch = searchValue.toUpperCase().trim();
    
    // Cerca per codice fiscale (esatto)
    let found = allImprese.find(i => 
      i.codice_fiscale?.toUpperCase() === normalizedSearch
    );
    if (found) return found;
    
    // Cerca per partita IVA (esatto)
    found = allImprese.find(i => 
      i.partita_iva === normalizedSearch || 
      i.partita_iva === searchValue.replace(/\D/g, '')
    );
    if (found) return found;
    
    // Cerca per denominazione (contiene)
    found = allImprese.find(i => 
      i.denominazione?.toUpperCase().includes(normalizedSearch)
    );
    if (found) return found;
    
    // Cerca per nome/cognome rappresentante
    found = allImprese.find(i => {
      const fullName = `${i.rappresentante_legale_nome || ''} ${i.rappresentante_legale_cognome || ''}`.toUpperCase();
      return fullName.includes(normalizedSearch);
    });
    
    return found;
  };

  // Popola dati impresa nel form (per Subentrante)
  const populateSubentranteData = (impresa: Impresa) => {
    setFormData(prev => ({
      ...prev,
      cf_subentrante: impresa.codice_fiscale || impresa.partita_iva || '',
      ragione_sociale_sub: impresa.denominazione || '',
      nome_sub: impresa.rappresentante_legale_nome || '',
      cognome_sub: impresa.rappresentante_legale_cognome || '',
      data_nascita_sub: impresa.rappresentante_legale_data_nascita ? impresa.rappresentante_legale_data_nascita.split('T')[0] : '',
      luogo_nascita_sub: impresa.rappresentante_legale_luogo_nascita || '',
      residenza_via_sub: `${impresa.rappresentante_legale_residenza_via || ''} ${impresa.rappresentante_legale_residenza_civico || ''}`.trim(),
      residenza_comune_sub: impresa.rappresentante_legale_residenza_comune || '',
      residenza_cap_sub: impresa.rappresentante_legale_residenza_cap || '',
      sede_via_sub: `${impresa.indirizzo_via || ''} ${impresa.indirizzo_civico || ''}`.trim(),
      sede_comune_sub: impresa.comune || '',
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
      nome_ced: impresa.rappresentante_legale_nome || '',
      cognome_ced: impresa.rappresentante_legale_cognome || '',
      data_nascita_ced: impresa.rappresentante_legale_data_nascita ? impresa.rappresentante_legale_data_nascita.split('T')[0] : '',
      luogo_nascita_ced: impresa.rappresentante_legale_luogo_nascita || '',
      residenza_via_ced: `${impresa.rappresentante_legale_residenza_via || ''} ${impresa.rappresentante_legale_residenza_civico || ''}`.trim(),
      residenza_comune_ced: impresa.rappresentante_legale_residenza_comune || '',
      residenza_cap_ced: impresa.rappresentante_legale_residenza_cap || '',
      pec_ced: impresa.pec || ''
    }));
  };

  // Lookup Subentrante
  const handleLookupSubentrante = async () => {
    if (!formData.cf_subentrante) {
      toast.error('Inserire CF, P.IVA o Denominazione');
      return;
    }

    setLoadingImpresa(true);
    const impresa = searchImpresa(formData.cf_subentrante);
    
    if (impresa) {
      populateSubentranteData(impresa);
      toast.success('Impresa trovata!', { description: impresa.denominazione });
    } else {
      toast.error('Impresa non trovata', { description: 'Inserire i dati manualmente' });
    }
    setLoadingImpresa(false);
  };

  // Lookup Cedente
  const handleLookupCedente = async () => {
    if (!formData.cf_cedente) {
      toast.error('Inserire CF, P.IVA o Denominazione Cedente');
      return;
    }

    setLoadingImpresa(true);
    const impresa = searchImpresa(formData.cf_cedente);
    
    if (impresa) {
      populateCedenteData(impresa);
      toast.success('Cedente trovato!', { description: impresa.denominazione });
    } else {
      toast.error('Cedente non trovato', { description: 'Inserire i dati manualmente' });
    }
    setLoadingImpresa(false);
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
      // Reset posteggio e cedente quando cambia mercato
      posteggio: '',
      posteggio_id: '',
      dimensioni_mq: '',
      dimensioni_lineari: '',
      // Reset cedente
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
    <Card className="bg-[#0a1628] border-[#1e293b] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-[#e8fbff] flex items-center gap-2">
          <FileText className="text-[#00f0ff]" />
          Compilazione Guidata SCIA
        </CardTitle>
        <CardDescription className="text-[#e8fbff]/60">
          Modello Unificato Regionale - Commercio su Aree Pubbliche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* MOTIVAZIONE SCIA */}
          <div className="space-y-4 p-4 bg-[#020817] rounded-lg border border-[#1e293b]">
            <h3 className="text-lg font-semibold text-[#00f0ff]">
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
            <div className="space-y-4 p-4 bg-[#020817] rounded-lg border border-[#1e293b]">
              <h3 className="text-lg font-semibold text-[#00f0ff]">
                Motivo del Subingresso
              </h3>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Seleziona il motivo *</Label>
                <Select 
                  value={formData.motivo_subingresso || 'acquisto'} 
                  onValueChange={(value) => setFormData({...formData, motivo_subingresso: value})}
                >
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
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
          <div className="space-y-4 p-4 bg-[#020817] rounded-lg border border-[#1e293b]">
            <h3 className="text-lg font-semibold text-[#00f0ff]">
              Tipologia Attività
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Settore Merceologico *</Label>
                <Select 
                  value={formData.tipologia_attivita} 
                  onValueChange={(value) => setFormData({...formData, tipologia_attivita: value, merceologia: value})}
                >
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
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
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
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

          {/* SEZIONE A: SUBENTRANTE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              A. Dati Subentrante (Cessionario)
            </h3>
            
            {/* Riga 1: CF/P.IVA/Denominazione e Ricerca */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CF / P.IVA / Denominazione *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.cf_subentrante}
                    onChange={(e) => setFormData({...formData, cf_subentrante: e.target.value.toUpperCase()})}
                    placeholder="Es. RSSMRA... o 01234567890 o Nome Impresa"
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                  <Button 
                    type="button" 
                    onClick={handleLookupSubentrante} 
                    variant="secondary"
                    disabled={loadingImpresa}
                    title="Cerca impresa registrata"
                  >
                    {loadingImpresa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-[#e8fbff]/40">Cerca per Codice Fiscale, Partita IVA o Nome</p>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ragione Sociale / Denominazione</Label>
                <Input 
                  value={formData.ragione_sociale_sub}
                  onChange={(e) => setFormData({...formData, ragione_sociale_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 2: Nome, Cognome, Data/Luogo Nascita */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Nome</Label>
                <Input 
                  value={formData.nome_sub}
                  onChange={(e) => setFormData({...formData, nome_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Cognome</Label>
                <Input 
                  value={formData.cognome_sub}
                  onChange={(e) => setFormData({...formData, cognome_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data di Nascita</Label>
                <Input 
                  type="date"
                  value={formData.data_nascita_sub}
                  onChange={(e) => setFormData({...formData, data_nascita_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
                <Input 
                  value={formData.luogo_nascita_sub}
                  onChange={(e) => setFormData({...formData, luogo_nascita_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 3: Residenza */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
                <Input 
                  value={formData.residenza_via_sub}
                  onChange={(e) => setFormData({...formData, residenza_via_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Residenza</Label>
                <Input 
                  value={formData.residenza_comune_sub}
                  onChange={(e) => setFormData({...formData, residenza_comune_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CAP</Label>
                <Input 
                  value={formData.residenza_cap_sub}
                  onChange={(e) => setFormData({...formData, residenza_cap_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 4: Sede Impresa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Sede Impresa (Via/Piazza)</Label>
                <Input 
                  value={formData.sede_via_sub}
                  onChange={(e) => setFormData({...formData, sede_via_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Sede</Label>
                <Input 
                  value={formData.sede_comune_sub}
                  onChange={(e) => setFormData({...formData, sede_comune_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">PEC</Label>
                <Input 
                  value={formData.pec_sub}
                  onChange={(e) => setFormData({...formData, pec_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
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
            
            {/* Riga 1: CF e Ricerca manuale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CF / P.IVA / Denominazione Cedente *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.cf_cedente}
                    onChange={(e) => setFormData({...formData, cf_cedente: e.target.value.toUpperCase()})}
                    placeholder="Es. VRDLGI..."
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                  <Button 
                    type="button" 
                    onClick={handleLookupCedente} 
                    variant="secondary"
                    disabled={loadingImpresa}
                    title="Cerca cedente"
                  >
                    {loadingImpresa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ragione Sociale Cedente</Label>
                <Input 
                  value={formData.ragione_sociale_ced}
                  onChange={(e) => setFormData({...formData, ragione_sociale_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 2: Nome, Cognome, Data/Luogo Nascita Cedente */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Nome</Label>
                <Input 
                  value={formData.nome_ced}
                  onChange={(e) => setFormData({...formData, nome_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Cognome</Label>
                <Input 
                  value={formData.cognome_ced}
                  onChange={(e) => setFormData({...formData, cognome_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data di Nascita</Label>
                <Input 
                  type="date"
                  value={formData.data_nascita_ced}
                  onChange={(e) => setFormData({...formData, data_nascita_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
                <Input 
                  value={formData.luogo_nascita_ced}
                  onChange={(e) => setFormData({...formData, luogo_nascita_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 3: Residenza Cedente */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
                <Input 
                  value={formData.residenza_via_ced}
                  onChange={(e) => setFormData({...formData, residenza_via_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune</Label>
                <Input 
                  value={formData.residenza_comune_ced}
                  onChange={(e) => setFormData({...formData, residenza_comune_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CAP</Label>
                <Input 
                  value={formData.residenza_cap_ced}
                  onChange={(e) => setFormData({...formData, residenza_cap_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">PEC</Label>
                <Input 
                  value={formData.pec_ced}
                  onChange={(e) => setFormData({...formData, pec_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
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
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Presentazione</Label>
                <Input 
                  type="date"
                  value={formData.scia_precedente_data}
                  onChange={(e) => setFormData({...formData, scia_precedente_data: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Presentazione</Label>
                <Input 
                  value={formData.scia_precedente_comune}
                  onChange={(e) => setFormData({...formData, scia_precedente_comune: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          {/* SEZIONE C: POSTEGGIO E MERCATO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              C. Dati Posteggio e Mercato
            </h3>
            
            {/* Riga 1: Mercato e Posteggio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Mercato *</Label>
                <Select 
                  value={formData.mercato_id} 
                  onValueChange={handleMarketChange}
                  disabled={loadingMarkets}
                >
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder={loadingMarkets ? "Caricamento..." : "Seleziona Mercato"} />
                  </SelectTrigger>
                  <SelectContent>
                    {markets.map(market => (
                      <SelectItem key={market.id} value={market.id.toString()}>
                        {market.name} ({market.municipality})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Numero Posteggio *</Label>
                <Select 
                  value={formData.posteggio_id} 
                  onValueChange={handleStallChange}
                  disabled={!selectedMarketId || loadingStalls}
                >
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
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
                  onChange={(e) => setFormData({...formData, ubicazione_mercato: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Giorno Mercato</Label>
                <Input 
                  value={formData.giorno_mercato}
                  onChange={(e) => setFormData({...formData, giorno_mercato: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
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
                  onChange={(e) => setFormData({...formData, fila: e.target.value})}
                  placeholder="Es. A, B, C"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni (MQ)</Label>
                <Input 
                  value={formData.dimensioni_mq}
                  readOnly
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni Lineari (m x m)</Label>
                <Input 
                  value={formData.dimensioni_lineari}
                  readOnly
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Attrezzature</Label>
                <Input 
                  value={formData.attrezzature}
                  onChange={(e) => setFormData({...formData, attrezzature: e.target.value})}
                  placeholder="Es. banco, automezzo"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
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
                  onChange={(e) => setFormData({...formData, notaio: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">N. Repertorio</Label>
                <Input 
                  value={formData.repertorio}
                  onChange={(e) => setFormData({...formData, repertorio: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Atto</Label>
                <Input 
                  type="date"
                  value={formData.data_atto}
                  onChange={(e) => setFormData({...formData, data_atto: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          {/* PULSANTI */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#1e293b]">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annulla
            </Button>
            <Button type="submit" className="bg-[#00f0ff] text-[#020817] hover:bg-[#00f0ff]/80">
              Genera SCIA
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
