import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Phone, Mail, Globe, MapPin, Users, ChevronDown, ChevronUp, Save, X, Search, Download, Loader2, FileText, ShoppingBag, Shield, CreditCard } from 'lucide-react';

const API_BASE_URL = 'https://orchestratore.mio-hub.me';

// Tipi di settore disponibili
const TIPI_SETTORE = [
  { value: 'SUAP', label: 'SUAP - Sportello Unico Attività Produttive' },
  { value: 'POLIZIA_LOCALE', label: 'Polizia Locale / Municipale' },
  { value: 'TRIBUTI', label: 'Ufficio Tributi' },
  { value: 'DEMOGRAFICI', label: 'Servizi Demografici (SED)' },
  { value: 'COMMERCIO', label: 'Ufficio Commercio' },
  { value: 'TECNICO', label: 'Ufficio Tecnico' },
  { value: 'RAGIONERIA', label: 'Ragioneria / Bilancio' },
  { value: 'AMBIENTE', label: 'Ambiente / Ecologia' },
  { value: 'SEGRETERIA', label: 'Segreteria Generale' },
  { value: 'URP', label: 'URP - Relazioni con il Pubblico' },
  { value: 'PROTEZIONE_CIVILE', label: 'Protezione Civile' },
  { value: 'ALTRO', label: 'Altro Settore' },
];

interface Comune {
  id: number;
  nome: string;
  provincia: string;
  regione: string;
  cap: string;
  codice_istat: string;
  codice_catastale: string;
  codice_ipa?: string;
  pec: string;
  email: string;
  telefono: string;
  sito_web: string;
  indirizzo: string;
  logo_url: string;
  num_settori?: number;
}

interface Settore {
  id: number;
  comune_id: number;
  tipo_settore: string;
  nome_settore: string;
  responsabile_nome: string;
  responsabile_cognome: string;
  email: string;
  pec: string;
  telefono: string;
  indirizzo: string;
  orari_apertura: string;
  note: string;
}

interface IPAResult {
  codice_ipa: string;
  denominazione: string;
  codice_fiscale: string;
  tipologia: string;
  indirizzo: string;
  cap: string;
  codice_istat: string;
  codice_comune_istat: string;
  codice_catastale: string;
  pec: string;
  email: string;
  sito_web: string;
  responsabile_nome: string;
  responsabile_cognome: string;
  titolo_responsabile: string;
}

export default function ComuniPanel() {
  const [comuni, setComuni] = useState<Comune[]>([]);
  const [selectedComune, setSelectedComune] = useState<Comune | null>(null);
  const [settori, setSettori] = useState<Settore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComuneForm, setShowComuneForm] = useState(false);
  const [showSettoreForm, setShowSettoreForm] = useState(false);
  const [editingComune, setEditingComune] = useState<Comune | null>(null);
  const [editingSettore, setEditingSettore] = useState<Settore | null>(null);
  const [expandedSettori, setExpandedSettori] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stato per ricerca IPA
  const [showIPASearch, setShowIPASearch] = useState(false);
  const [ipaSearchQuery, setIpaSearchQuery] = useState('');
  const [ipaResults, setIpaResults] = useState<IPAResult[]>([]);
  const [ipaLoading, setIpaLoading] = useState(false);
  const [ipaError, setIpaError] = useState('');
  const [importingSettori, setImportingSettori] = useState(false);
  const [activeTab, setActiveTab] = useState<'anagrafica' | 'settori' | 'mercati' | 'fatturazione' | 'permessi'>('anagrafica');

  // Form state per comune
  const [comuneForm, setComuneForm] = useState({
    nome: '', provincia: '', regione: '', cap: '', codice_istat: '',
    codice_catastale: '', codice_ipa: '', pec: '', email: '', telefono: '', sito_web: '',
    indirizzo: '', logo_url: ''
  });

  // Form state per settore
  const [settoreForm, setSettoreForm] = useState({
    tipo_settore: '', nome_settore: '', responsabile_nome: '', responsabile_cognome: '',
    email: '', pec: '', telefono: '', indirizzo: '', orari_apertura: '', note: ''
  });

  // Carica comuni
  const fetchComuni = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/comuni`);
      const data = await res.json();
      if (data.success) {
        setComuni(data.data);
      }
    } catch (error) {
      console.error('Error fetching comuni:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carica settori di un comune
  const fetchSettori = async (comuneId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/comuni/${comuneId}/settori`);
      const data = await res.json();
      if (data.success) {
        setSettori(data.data);
      }
    } catch (error) {
      console.error('Error fetching settori:', error);
    }
  };

  // Ricerca su IndicePA
  const searchIPA = async () => {
    if (!ipaSearchQuery || ipaSearchQuery.length < 3) {
      setIpaError('Inserisci almeno 3 caratteri');
      return;
    }
    
    setIpaLoading(true);
    setIpaError('');
    setIpaResults([]);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/ipa/search?q=${encodeURIComponent(ipaSearchQuery)}`);
      const data = await res.json();
      
      if (data.success) {
        setIpaResults(data.data);
        if (data.data.length === 0) {
          setIpaError('Nessun risultato trovato');
        }
      } else {
        setIpaError(data.error || 'Errore nella ricerca');
      }
    } catch (error) {
      console.error('Error searching IPA:', error);
      setIpaError('Errore di connessione');
    } finally {
      setIpaLoading(false);
    }
  };

  // Mapping codice provincia ISTAT -> sigla provincia
  const provinceISTATMap: { [key: string]: string } = {
    '001': 'TO', '002': 'VC', '003': 'NO', '004': 'CN', '005': 'AT', '006': 'AL', '096': 'BI', '103': 'VB',
    '007': 'AO',
    '012': 'VA', '013': 'CO', '014': 'SO', '015': 'MI', '016': 'BG', '017': 'BS', '018': 'PV', '019': 'CR', '020': 'MN', '097': 'LC', '098': 'LO', '108': 'MB',
    '021': 'BZ', '022': 'TN',
    '023': 'VR', '024': 'VI', '025': 'BL', '026': 'TV', '027': 'VE', '028': 'PD', '029': 'RO',
    '030': 'UD', '031': 'GO', '032': 'TS', '093': 'PN',
    '008': 'IM', '009': 'SV', '010': 'GE', '011': 'SP',
    '033': 'PC', '034': 'PR', '035': 'RE', '036': 'MO', '037': 'BO', '038': 'FE', '039': 'RA', '040': 'FC', '099': 'RN',
    '045': 'MS', '046': 'LU', '047': 'PT', '048': 'FI', '049': 'LI', '050': 'PI', '051': 'AR', '052': 'SI', '053': 'GR', '100': 'PO',
    '054': 'PG', '055': 'TR',
    '041': 'PU', '042': 'AN', '043': 'MC', '044': 'AP', '109': 'FM',
    '056': 'VT', '057': 'RI', '058': 'RM', '059': 'LT', '060': 'FR',
    '066': 'AQ', '067': 'TE', '068': 'PE', '069': 'CH',
    '070': 'CB', '094': 'IS',
    '061': 'CE', '062': 'BN', '063': 'NA', '064': 'AV', '065': 'SA',
    '071': 'FG', '072': 'BA', '073': 'TA', '074': 'BR', '075': 'LE', '110': 'BT',
    '076': 'PZ', '077': 'MT',
    '078': 'CS', '079': 'CZ', '080': 'RC', '101': 'KR', '102': 'VV',
    '081': 'TP', '082': 'PA', '083': 'ME', '084': 'AG', '085': 'CL', '086': 'EN', '087': 'CT', '088': 'RG', '089': 'SR',
    '090': 'SS', '091': 'NU', '092': 'CA', '095': 'OR', '111': 'SU'
  };

  // Importa dati da IPA nel form
  const importFromIPA = (ipa: IPAResult) => {
    // Estrai provincia dal codice comune ISTAT (primi 3 caratteri = codice provincia)
    let provincia = '';
    if (ipa.codice_comune_istat && ipa.codice_comune_istat.length >= 3) {
      const codProvincia = ipa.codice_comune_istat.substring(0, 3);
      provincia = provinceISTATMap[codProvincia] || '';
    }
    
    // Estrai regione dal codice ISTAT (primi 2 caratteri = regione)
    let regione = '';
    const regioniMap: { [key: string]: string } = {
      '01': 'Piemonte', '02': 'Valle d\'Aosta', '03': 'Lombardia', '04': 'Trentino-Alto Adige',
      '05': 'Veneto', '06': 'Friuli-Venezia Giulia', '07': 'Liguria', '08': 'Emilia-Romagna',
      '09': 'Toscana', '10': 'Umbria', '11': 'Marche', '12': 'Lazio', '13': 'Abruzzo',
      '14': 'Molise', '15': 'Campania', '16': 'Puglia', '17': 'Basilicata', '18': 'Calabria',
      '19': 'Sicilia', '20': 'Sardegna'
    };
    if (ipa.codice_comune_istat && ipa.codice_comune_istat.length >= 2) {
      const codRegione = ipa.codice_comune_istat.substring(0, 2);
      regione = regioniMap[codRegione] || '';
    }
    
    // Estrai nome comune dalla denominazione (rimuovi "Comune di ")
    let nomeComune = ipa.denominazione;
    if (nomeComune.toLowerCase().startsWith('comune di ')) {
      nomeComune = nomeComune.substring(10);
    }
    
    setComuneForm({
      nome: nomeComune,
      provincia: provincia,
      regione: regione,
      cap: ipa.cap || '',
      codice_istat: ipa.codice_comune_istat || '',
      codice_catastale: ipa.codice_catastale || '',
      codice_ipa: ipa.codice_ipa || '',
      pec: ipa.pec || '',
      email: ipa.email || '',
      telefono: '',
      sito_web: ipa.sito_web || '',
      indirizzo: ipa.indirizzo || '',
      logo_url: ''
    });
    
    setShowIPASearch(false);
    setShowComuneForm(true);
  };

  useEffect(() => {
    fetchComuni();
  }, []);

  useEffect(() => {
    if (selectedComune) {
      fetchSettori(selectedComune.id);
    }
  }, [selectedComune]);

  // Import settori da IPA
  const handleImportSettoriIPA = async () => {
    if (!selectedComune?.codice_ipa) {
      alert('Questo comune non ha un codice IPA. Importa prima i dati del comune da IndicePA.');
      return;
    }
    
    if (!confirm(`Vuoi importare le Unità Organizzative da IndicePA per ${selectedComune.nome}?\n\nQuesto aggiungerà i settori trovati senza eliminare quelli esistenti.`)) {
      return;
    }
    
    setImportingSettori(true);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/ipa/uo/${selectedComune.codice_ipa}`);
      const data = await res.json();
      
      if (data.success) {
        const uoList = data.data;
        
        if (uoList.length === 0) {
          alert('Nessuna Unità Organizzativa trovata per questo ente su IndicePA.');
          return;
        }
        
        // Importa ogni UO come settore
        let imported = 0;
        let errors = 0;
        
        for (const uo of uoList) {
          try {
            const settoreData = {
              tipo_settore: uo.tipo_settore || 'ALTRO',
              nome_settore: uo.nome_uo || '',
              responsabile_nome: uo.responsabile_nome || '',
              responsabile_cognome: uo.responsabile_cognome || '',
              email: uo.email || '',
              pec: uo.pec || '',
              telefono: uo.telefono || '',
              indirizzo: uo.indirizzo || '',
              orari_apertura: '',
              note: `Importato da IPA - Codice UO: ${uo.codice_uo || 'N/A'}`
            };
            
            const saveRes = await fetch(`${API_BASE_URL}/api/comuni/${selectedComune.id}/settori`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settoreData)
            });
            
            const saveData = await saveRes.json();
            if (saveData.success) {
              imported++;
            } else {
              errors++;
            }
          } catch (e) {
            errors++;
          }
        }
        
        // Ricarica settori
        fetchSettori(selectedComune.id);
        fetchComuni();
        
        alert(`Import completato!\n\n✅ Settori importati: ${imported}\n❌ Errori: ${errors}\n📊 Totale UO trovate: ${uoList.length}`);
      } else {
        alert(`Errore: ${data.error || 'Impossibile recuperare le UO da IPA'}`);
      }
    } catch (error) {
      console.error('Error importing UO from IPA:', error);
      alert('Errore di connessione durante l\'import da IPA');
    } finally {
      setImportingSettori(false);
    }
  };

  // Salva comune
  const handleSaveComune = async () => {
    try {
      const url = editingComune 
        ? `${API_BASE_URL}/api/comuni/${editingComune.id}`
        : `${API_BASE_URL}/api/comuni`;
      
      const res = await fetch(url, {
        method: editingComune ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comuneForm)
      });
      
      const data = await res.json();
      if (data.success) {
        fetchComuni();
        setShowComuneForm(false);
        setEditingComune(null);
        setComuneForm({
          nome: '', provincia: '', regione: '', cap: '', codice_istat: '',
          codice_catastale: '', codice_ipa: '', pec: '', email: '', telefono: '', sito_web: '',
          indirizzo: '', logo_url: ''
        });
      }
    } catch (error) {
      console.error('Error saving comune:', error);
    }
  };

  // Elimina comune
  const handleDeleteComune = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo comune e tutti i suoi settori?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/comuni/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchComuni();
        if (selectedComune?.id === id) {
          setSelectedComune(null);
          setSettori([]);
        }
      }
    } catch (error) {
      console.error('Error deleting comune:', error);
    }
  };

  // Salva settore
  const handleSaveSettore = async () => {
    if (!selectedComune) return;
    
    try {
      const url = editingSettore 
        ? `${API_BASE_URL}/api/comuni/settori/${editingSettore.id}`
        : `${API_BASE_URL}/api/comuni/${selectedComune.id}/settori`;
      
      const res = await fetch(url, {
        method: editingSettore ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settoreForm)
      });
      
      const data = await res.json();
      if (data.success) {
        fetchSettori(selectedComune.id);
        fetchComuni(); // Aggiorna conteggio settori
        setShowSettoreForm(false);
        setEditingSettore(null);
        setSettoreForm({
          tipo_settore: '', nome_settore: '', responsabile_nome: '', responsabile_cognome: '',
          email: '', pec: '', telefono: '', indirizzo: '', orari_apertura: '', note: ''
        });
      }
    } catch (error) {
      console.error('Error saving settore:', error);
    }
  };

  // Elimina settore
  const handleDeleteSettore = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo settore?')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/comuni/settori/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && selectedComune) {
        fetchSettori(selectedComune.id);
        fetchComuni();
      }
    } catch (error) {
      console.error('Error deleting settore:', error);
    }
  };

  // Apri form modifica comune
  const openEditComune = (comune: Comune) => {
    setEditingComune(comune);
    setComuneForm({
      nome: comune.nome || '',
      provincia: comune.provincia || '',
      regione: comune.regione || '',
      cap: comune.cap || '',
      codice_istat: comune.codice_istat || '',
      codice_catastale: comune.codice_catastale || '',
      codice_ipa: comune.codice_ipa || '',
      pec: comune.pec || '',
      email: comune.email || '',
      telefono: comune.telefono || '',
      sito_web: comune.sito_web || '',
      indirizzo: comune.indirizzo || '',
      logo_url: comune.logo_url || ''
    });
    setShowComuneForm(true);
  };

  // Apri form modifica settore
  const openEditSettore = (settore: Settore) => {
    setEditingSettore(settore);
    setSettoreForm({
      tipo_settore: settore.tipo_settore || '',
      nome_settore: settore.nome_settore || '',
      responsabile_nome: settore.responsabile_nome || '',
      responsabile_cognome: settore.responsabile_cognome || '',
      email: settore.email || '',
      pec: settore.pec || '',
      telefono: settore.telefono || '',
      indirizzo: settore.indirizzo || '',
      orari_apertura: settore.orari_apertura || '',
      note: settore.note || ''
    });
    setShowSettoreForm(true);
  };

  const toggleSettoreExpand = (id: number) => {
    setExpandedSettori(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getTipoSettoreLabel = (tipo: string) => {
    return TIPI_SETTORE.find(t => t.value === tipo)?.label || tipo;
  };

  // Filtra comuni in base alla ricerca
  const filteredComuni = comuni.filter(comune => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      comune.nome?.toLowerCase().includes(query) ||
      comune.provincia?.toLowerCase().includes(query) ||
      comune.regione?.toLowerCase().includes(query) ||
      comune.cap?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  // Calcola statistiche
  const totalSettori = comuni.reduce((acc, c) => acc + (c.num_settori || 0), 0);
  const comuniConSettori = comuni.filter(c => (c.num_settori || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Building2 className="w-4 h-4" />
            Comuni Totali
          </div>
          <div className="text-2xl font-bold text-cyan-400">{comuni.length}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users className="w-4 h-4" />
            Settori Totali
          </div>
          <div className="text-2xl font-bold text-emerald-400">{totalSettori}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Building2 className="w-4 h-4" />
            Comuni Configurati
          </div>
          <div className="text-2xl font-bold text-purple-400">{comuniConSettori}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Mail className="w-4 h-4" />
            Media Settori/Comune
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {comuni.length > 0 ? (totalSettori / comuni.length).toFixed(1) : '0'}
          </div>
        </div>
      </div>

      {/* Header con pulsanti */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          Gestione Comuni
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowIPASearch(true);
              setIpaSearchQuery('');
              setIpaResults([]);
              setIpaError('');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Importa da IPA
          </button>
          <button
            onClick={() => {
              setEditingComune(null);
              setComuneForm({
                nome: '', provincia: '', regione: '', cap: '', codice_istat: '',
                codice_catastale: '', codice_ipa: '', pec: '', email: '', telefono: '', sito_web: '',
                indirizzo: '', logo_url: ''
              });
              setShowComuneForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuovo Comune
          </button>
        </div>
      </div>

      {/* Layout a due colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista Comuni */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <h3 className="text-lg font-medium text-white mb-4">Comuni Registrati</h3>
          
          {/* Ricerca locale */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome, provincia, regione o CAP..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          {filteredComuni.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessun comune trovato</p>
              <p className="text-sm">Clicca "Importa da IPA" o "Nuovo Comune" per iniziare</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredComuni.map(comune => (
                <div
                  key={comune.id}
                  onClick={() => setSelectedComune(comune)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedComune?.id === comune.id
                      ? 'bg-cyan-600/20 border border-cyan-500'
                      : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{comune.nome}</div>
                      <div className="text-sm text-gray-400">
                        {comune.provincia} - {comune.regione}
                      </div>
                      {comune.num_settori !== undefined && comune.num_settori > 0 && (
                        <div className="text-xs text-cyan-400 mt-1">
                          <Users className="w-3 h-3 inline mr-1" />
                          {comune.num_settori} settori configurati
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditComune(comune); }}
                        className="p-1 text-gray-400 hover:text-cyan-400"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteComune(comune.id); }}
                        className="p-1 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dettaglio Comune */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          {selectedComune ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">{selectedComune.nome}</h3>
                {selectedComune.codice_ipa && (
                  <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">
                    IPA: {selectedComune.codice_ipa}
                  </span>
                )}
              </div>
              
              {/* Tab Navigation */}
              <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('anagrafica')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'anagrafica'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Anagrafica
                </button>
                <button
                  onClick={() => setActiveTab('settori')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'settori'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Settori
                </button>
                <button
                  onClick={() => setActiveTab('mercati')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'mercati'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Mercati
                </button>
                <button
                  onClick={() => setActiveTab('fatturazione')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'fatturazione'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Fatturazione
                </button>
                <button
                  onClick={() => setActiveTab('permessi')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'permessi'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Permessi
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'anagrafica' && (
                <>
              {/* Info Comune */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                {selectedComune.indirizzo && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {selectedComune.indirizzo}
                  </div>
                )}
                {selectedComune.telefono && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedComune.telefono}
                  </div>
                )}
                {selectedComune.email && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {selectedComune.email}
                  </div>
                )}
                {selectedComune.sito_web && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Globe className="w-4 h-4" />
                    <a href={selectedComune.sito_web} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                      {selectedComune.sito_web}
                    </a>
                  </div>
                )}
              </div>

              {/* Dati Aggiuntivi IPA */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 p-3 bg-gray-700/30 rounded-lg text-xs">
                {selectedComune.pec && (
                  <div className="col-span-2">
                    <span className="text-gray-500">PEC:</span>
                    <span className="text-purple-300 ml-1">{selectedComune.pec}</span>
                  </div>
                )}
                {selectedComune.cap && (
                  <div>
                    <span className="text-gray-500">CAP:</span>
                    <span className="text-gray-300 ml-1">{selectedComune.cap}</span>
                  </div>
                )}
                {selectedComune.codice_istat && (
                  <div>
                    <span className="text-gray-500">ISTAT:</span>
                    <span className="text-gray-300 ml-1">{selectedComune.codice_istat}</span>
                  </div>
                )}
                {selectedComune.codice_catastale && (
                  <div>
                    <span className="text-gray-500">Catastale:</span>
                    <span className="text-gray-300 ml-1">{selectedComune.codice_catastale}</span>
                  </div>
                )}
                {selectedComune.codice_ipa && (
                  <div>
                    <span className="text-gray-500">IPA:</span>
                    <span className="text-purple-300 ml-1">{selectedComune.codice_ipa}</span>
                  </div>
                )}
              </div>
                </>
              )}

              {/* Tab Settori */}
              {activeTab === 'settori' && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">Settori e Referenti</h4>
                  <div className="flex gap-2">
                    {selectedComune?.codice_ipa && (
                      <button
                        onClick={() => handleImportSettoriIPA()}
                        disabled={importingSettori}
                        className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        {importingSettori ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {importingSettori ? 'Importo...' : 'Import da IPA'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingSettore(null);
                        setSettoreForm({
                          tipo_settore: '', nome_settore: '', responsabile_nome: '', responsabile_cognome: '',
                          email: '', pec: '', telefono: '', indirizzo: '', orari_apertura: '', note: ''
                        });
                        setShowSettoreForm(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Aggiungi Settore
                    </button>
                  </div>
                </div>

                {settori.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    Nessun settore configurato
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {settori.map(settore => (
                      <div key={settore.id} className="bg-gray-700/50 rounded-lg border border-gray-600">
                        <div
                          onClick={() => toggleSettoreExpand(settore.id)}
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700/70"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {getTipoSettoreLabel(settore.tipo_settore)}
                            </span>
                            {(settore.responsabile_nome || settore.responsabile_cognome) && (
                              <span className="text-gray-400 text-sm ml-2">
                                - {settore.responsabile_nome} {settore.responsabile_cognome}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditSettore(settore); }}
                              className="p-1 text-gray-400 hover:text-cyan-400"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSettore(settore.id); }}
                              className="p-1 text-gray-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {expandedSettori.includes(settore.id) ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        {expandedSettori.includes(settore.id) && (
                          <div className="px-3 pb-3 pt-1 border-t border-gray-600 text-sm">
                            <div className="grid grid-cols-2 gap-2 text-gray-300">
                              {settore.email && (
                                <div><Mail className="w-3 h-3 inline mr-1" />{settore.email}</div>
                              )}
                              {settore.telefono && (
                                <div><Phone className="w-3 h-3 inline mr-1" />{settore.telefono}</div>
                              )}
                              {settore.pec && (
                                <div className="col-span-2 text-xs text-gray-400">PEC: {settore.pec}</div>
                              )}
                              {settore.orari_apertura && (
                                <div className="col-span-2 text-xs text-gray-400">Orari: {settore.orari_apertura}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Tab Mercati */}
              {activeTab === 'mercati' && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-white">Mercati del Comune</h4>
                  </div>
                  <div className="text-center py-8 text-gray-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nessun mercato associato a questo comune</p>
                    <p className="text-sm mt-2">I mercati vengono associati automaticamente dalla sezione Gestione Mercati</p>
                  </div>
                </div>
              )}

              {/* Tab Fatturazione */}
              {activeTab === 'fatturazione' && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-white">Fatturazione e Contratti</h4>
                    <button className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors">
                      <Plus className="w-3 h-3" />
                      Nuovo Contratto
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">Contratto Servizio MIO-HUB</span>
                        <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded">In attesa</span>
                      </div>
                      <p className="text-sm text-gray-400">Contratto per utilizzo piattaforma MIO-HUB con integrazione PagoPA</p>
                      <div className="mt-3 flex gap-2">
                        <button className="text-xs text-cyan-400 hover:underline">Visualizza</button>
                        <button className="text-xs text-emerald-400 hover:underline">Genera Fattura</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Permessi */}
              {activeTab === 'permessi' && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-white">Gestione Permessi e Ruoli</h4>
                    <button className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors">
                      <Plus className="w-3 h-3" />
                      Assegna Utente
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-white">Admin Comune</span>
                          <p className="text-xs text-gray-400">Accesso completo a tutte le funzionalità del comune</p>
                        </div>
                        <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">0 utenti</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-white">Operatore Mercato</span>
                          <p className="text-xs text-gray-400">Gestione presenze e spunta mercati</p>
                        </div>
                        <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">0 utenti</span>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-white">Polizia Locale</span>
                          <p className="text-xs text-gray-400">Controlli e verbali</p>
                        </div>
                        <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">0 utenti</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Seleziona un comune per vedere i dettagli</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Ricerca IPA */}
      {showIPASearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-purple-400" />
                Importa da IndicePA
              </h3>
              <button onClick={() => setShowIPASearch(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              Cerca un comune nell'Indice delle Pubbliche Amministrazioni (IPA) per importare automaticamente i dati ufficiali.
            </p>

            {/* Campo ricerca IPA */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={ipaSearchQuery}
                  onChange={e => setIpaSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchIPA()}
                  placeholder="es. Comune di Grosseto, Comune di Bologna..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
              <button
                onClick={searchIPA}
                disabled={ipaLoading || ipaSearchQuery.length < 3}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {ipaLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Cerca
              </button>
            </div>

            {/* Errore */}
            {ipaError && (
              <div className="text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg">
                {ipaError}
              </div>
            )}

            {/* Risultati IPA */}
            {ipaResults.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <p className="text-sm text-gray-400 mb-2">
                  {ipaResults.length} risultati trovati - clicca per importare
                </p>
                {ipaResults.map((ipa, index) => (
                  <div
                    key={index}
                    onClick={() => importFromIPA(ipa)}
                    className="p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-purple-500 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-white">{ipa.denominazione}</div>
                        <div className="text-sm text-gray-400">
                          {ipa.indirizzo}, {ipa.cap}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Codice IPA: {ipa.codice_ipa} | CF: {ipa.codice_fiscale}
                        </div>
                        {ipa.pec && (
                          <div className="text-xs text-cyan-400 mt-1">
                            PEC: {ipa.pec}
                          </div>
                        )}
                      </div>
                      <Download className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Form Comune */}
      {showComuneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingComune ? 'Modifica Comune' : 'Nuovo Comune'}
              </h3>
              <button onClick={() => setShowComuneForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {comuneForm.codice_ipa && (
              <div className="mb-4 p-3 bg-purple-900/20 rounded-lg border border-purple-700">
                <div className="text-sm text-purple-300">
                  <Download className="w-4 h-4 inline mr-2" />
                  Dati importati da IndicePA - Codice: {comuneForm.codice_ipa}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Nome Comune *</label>
                <input
                  type="text"
                  value={comuneForm.nome}
                  onChange={e => setComuneForm({...comuneForm, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Bologna"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Provincia</label>
                <input
                  type="text"
                  value={comuneForm.provincia}
                  onChange={e => setComuneForm({...comuneForm, provincia: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. BO"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Regione</label>
                <input
                  type="text"
                  value={comuneForm.regione}
                  onChange={e => setComuneForm({...comuneForm, regione: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Emilia-Romagna"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">CAP</label>
                <input
                  type="text"
                  value={comuneForm.cap}
                  onChange={e => setComuneForm({...comuneForm, cap: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 40100"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Codice ISTAT</label>
                <input
                  type="text"
                  value={comuneForm.codice_istat}
                  onChange={e => setComuneForm({...comuneForm, codice_istat: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 037006"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Codice Catastale</label>
                <input
                  type="text"
                  value={comuneForm.codice_catastale}
                  onChange={e => setComuneForm({...comuneForm, codice_catastale: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. A944"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefono</label>
                <input
                  type="text"
                  value={comuneForm.telefono}
                  onChange={e => setComuneForm({...comuneForm, telefono: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 051 123456"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={comuneForm.email}
                  onChange={e => setComuneForm({...comuneForm, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. info@comune.bologna.it"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">PEC</label>
                <input
                  type="email"
                  value={comuneForm.pec}
                  onChange={e => setComuneForm({...comuneForm, pec: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. comune.bologna@cert.it"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Indirizzo</label>
                <input
                  type="text"
                  value={comuneForm.indirizzo}
                  onChange={e => setComuneForm({...comuneForm, indirizzo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Piazza Maggiore 1"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Sito Web</label>
                <input
                  type="url"
                  value={comuneForm.sito_web}
                  onChange={e => setComuneForm({...comuneForm, sito_web: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. https://www.comune.bologna.it"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowComuneForm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveComune}
                disabled={!comuneForm.nome}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingComune ? 'Salva Modifiche' : 'Crea Comune'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Settore */}
      {showSettoreForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingSettore ? 'Modifica Settore' : 'Nuovo Settore'}
              </h3>
              <button onClick={() => setShowSettoreForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Tipo Settore *</label>
                <select
                  value={settoreForm.tipo_settore}
                  onChange={e => setSettoreForm({...settoreForm, tipo_settore: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">Seleziona tipo...</option>
                  {TIPI_SETTORE.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome Responsabile</label>
                <input
                  type="text"
                  value={settoreForm.responsabile_nome}
                  onChange={e => setSettoreForm({...settoreForm, responsabile_nome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Mario"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cognome Responsabile</label>
                <input
                  type="text"
                  value={settoreForm.responsabile_cognome}
                  onChange={e => setSettoreForm({...settoreForm, responsabile_cognome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Rossi"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={settoreForm.email}
                  onChange={e => setSettoreForm({...settoreForm, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. suap@comune.bologna.it"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">PEC</label>
                <input
                  type="email"
                  value={settoreForm.pec}
                  onChange={e => setSettoreForm({...settoreForm, pec: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. suap@pec.comune.bologna.it"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefono</label>
                <input
                  type="text"
                  value={settoreForm.telefono}
                  onChange={e => setSettoreForm({...settoreForm, telefono: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 051 123456"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Orari Apertura</label>
                <input
                  type="text"
                  value={settoreForm.orari_apertura}
                  onChange={e => setSettoreForm({...settoreForm, orari_apertura: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Lun-Ven 9-13"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Note</label>
                <textarea
                  value={settoreForm.note}
                  onChange={e => setSettoreForm({...settoreForm, note: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={2}
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettoreForm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveSettore}
                disabled={!settoreForm.tipo_settore}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingSettore ? 'Salva Modifiche' : 'Crea Settore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
