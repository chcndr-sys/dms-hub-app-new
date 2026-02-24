import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Phone, Mail, Globe, MapPin, Users, ChevronDown, ChevronUp, Save, X, Search, Download, Loader2, FileText, ShoppingBag, Shield, CreditCard, Eye, ExternalLink } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useImpersonation';

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

interface Mercato {
  id: number;
  code: string;
  name: string;
  municipality: string;
  days: string;
  total_stalls: number;
  status: string;
  latitude: string;
  longitude: string;
  cost_per_sqm: string;
  annual_market_days: number;
  total_area_sqm?: string;
  stalls_count?: string;
}

interface HubLocation {
  id: number;
  name: string;
  address: string;
  city: string;
  lat: string;
  lng: string;
  area_sqm: string;
  active: number;
  description: string;
  livello: string;
  tipo: string;
  provincia_sigla: string;
  shops: HubShop[];
  shops_count: number;
  total_shop_area: number;
}

interface HubShop {
  id: number;
  shop_number: string | null;
  letter: string;
  name: string;
  category: string;
  business_name: string;
  vat_number: string;
  phone: string;
  email: string;
  area_mq: string | null;
  status: string;
}

interface Contratto {
  id: number;
  comune_id: number;
  tipo_contratto: string;
  descrizione: string;
  data_inizio: string;
  data_fine: string;
  importo_annuale: number;
  stato: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface Fattura {
  id: number;
  comune_id: number;
  contratto_id: number;
  numero_fattura: string;
  data_emissione: string;
  data_scadenza: string;
  importo: number;
  iva: number;
  totale: number;
  stato: string;
  pagopa_iuv: string;
  data_pagamento: string;
  note: string;
  contratto_descrizione?: string;
  tipo_contratto?: string;
}

interface UtenteComune {
  id: number;
  comune_id: number;
  user_id: number;
  ruolo: string;
  permessi: Record<string, boolean>;
  attivo: boolean;
  email?: string;
  user_name?: string;
  created_at: string;
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
  const [mercatiComune, setMercatiComune] = useState<Mercato[]>([]);
  const [loadingMercati, setLoadingMercati] = useState(false);
  const [hubComune, setHubComune] = useState<HubLocation[]>([]);
  const [loadingHub, setLoadingHub] = useState(false);
  const [activeTab, setActiveTab] = useState<'anagrafica' | 'settori' | 'mercati' | 'hub' | 'fatturazione' | 'permessi'>('anagrafica');
  
  // Stato per fatturazione
  const [contratti, setContratti] = useState<Contratto[]>([]);
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [loadingFatturazione, setLoadingFatturazione] = useState(false);
  const [showContrattoForm, setShowContrattoForm] = useState(false);
  const [showFatturaForm, setShowFatturaForm] = useState(false);
  const [editingContratto, setEditingContratto] = useState<Contratto | null>(null);
  const [contrattoForm, setContrattoForm] = useState({
    tipo_contratto: 'servizio_miohub',
    descrizione: '',
    data_inizio: '',
    data_fine: '',
    importo_annuale: '',
    stato: 'attivo',
    note: ''
  });
  const [fatturaForm, setFatturaForm] = useState({
    contratto_id: '',
    numero_fattura: '',
    data_emissione: '',
    data_scadenza: '',
    importo: '',
    iva: '22',
    stato: 'emessa',
    note: ''
  });

  // Stato per permessi
  const [utentiComune, setUtentiComune] = useState<UtenteComune[]>([]);
  const [loadingPermessi, setLoadingPermessi] = useState(false);
  const [showUtenteForm, setShowUtenteForm] = useState(false);
  const [utenteForm, setUtenteForm] = useState({
    user_id: '',
    ruolo: 'operatore',
    email: ''
  });

  // Stato per impersonificazione
  const [impersonating, setImpersonating] = useState(false);

  // Ruoli disponibili
  const RUOLI_COMUNE = [
    { value: 'admin', label: 'Admin Comune', description: 'Accesso completo a tutte le funzionalità' },
    { value: 'operatore_mercato', label: 'Operatore Mercato', description: 'Gestione presenze e spunta mercati' },
    { value: 'polizia_locale', label: 'Polizia Locale', description: 'Controlli e verbali' },
    { value: 'tributi', label: 'Ufficio Tributi', description: 'Gestione COSAP e pagamenti' },
    { value: 'suap', label: 'SUAP', description: 'Autorizzazioni e pratiche' },
    { value: 'operatore', label: 'Operatore Generico', description: 'Accesso base in sola lettura' }
  ];

  // Form state per comune
  const [comuneForm, setComuneForm] = useState({
    nome: '', provincia: '', regione: '', cap: '', codice_istat: '',
    codice_catastale: '', codice_ipa: '', pec: '', email: '', telefono: '', sito_web: '',
    indirizzo: '', logo_url: '', codice_fiscale: '', tipologia: '',
    sindaco_nome: '', sindaco_cognome: '', sindaco_titolo: '', acronimo: ''
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

  // Carica mercati di un comune
  const fetchMercati = async (comuneId: number) => {
    setLoadingMercati(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/comuni/${comuneId}/mercati`);
      const data = await res.json();
      if (data.success) {
        setMercatiComune(data.data);
      }
    } catch (error) {
      console.error('Error fetching mercati:', error);
    } finally {
      setLoadingMercati(false);
    }
  };

  // Carica HUB di un comune
  const fetchHub = async (comuneId: number) => {
    setLoadingHub(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/comuni/${comuneId}/hub`);
      const data = await res.json();
      if (data.success) {
        setHubComune(data.data);
      }
    } catch (error) {
      console.error('Error fetching hub:', error);
    } finally {
      setLoadingHub(false);
    }
  };

  // Carica contratti e fatture di un comune
  const fetchFatturazione = async (comuneId: number) => {
    setLoadingFatturazione(true);
    try {
      const [contrattiRes, fattureRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/comuni/${comuneId}/contratti`),
        fetch(`${API_BASE_URL}/api/comuni/${comuneId}/fatture`)
      ]);
      const contrattiData = await contrattiRes.json();
      const fattureData = await fattureRes.json();
      if (contrattiData.success) setContratti(contrattiData.data);
      if (fattureData.success) setFatture(fattureData.data);
    } catch (error) {
      console.error('Error fetching fatturazione:', error);
    } finally {
      setLoadingFatturazione(false);
    }
  };

  // Crea nuovo contratto
  const handleCreateContratto = async () => {
    if (!selectedComune) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/${selectedComune.id}/contratti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contrattoForm,
          importo_annuale: parseFloat(contrattoForm.importo_annuale) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowContrattoForm(false);
        setContrattoForm({ tipo_contratto: 'servizio_miohub', descrizione: '', data_inizio: '', data_fine: '', importo_annuale: '', stato: 'attivo', note: '' });
        fetchFatturazione(selectedComune.id);
      }
    } catch (error) {
      console.error('Error creating contratto:', error);
    }
  };

  // Crea nuova fattura
  const handleCreateFattura = async () => {
    if (!selectedComune) return;
    const importo = parseFloat(fatturaForm.importo) || 0;
    const iva = parseFloat(fatturaForm.iva) || 22;
    const totale = importo + (importo * iva / 100);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/${selectedComune.id}/fatture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fatturaForm,
          contratto_id: parseInt(fatturaForm.contratto_id) || null,
          importo,
          iva: importo * iva / 100,
          totale
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowFatturaForm(false);
        setFatturaForm({ contratto_id: '', numero_fattura: '', data_emissione: '', data_scadenza: '', importo: '', iva: '22', stato: 'emessa', note: '' });
        fetchFatturazione(selectedComune.id);
      }
    } catch (error) {
      console.error('Error creating fattura:', error);
    }
  };

  // Aggiorna stato fattura
  const handleUpdateFatturaStato = async (fatturaId: number, nuovoStato: string) => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/fatture/${fatturaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: nuovoStato, data_pagamento: nuovoStato === 'pagata' ? new Date().toISOString().split('T')[0] : null })
      });
      const data = await res.json();
      if (data.success && selectedComune) {
        fetchFatturazione(selectedComune.id);
      }
    } catch (error) {
      console.error('Error updating fattura:', error);
    }
  };

  // Elimina contratto
  const handleDeleteContratto = async (contrattoId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo contratto?')) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/contratti/${contrattoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && selectedComune) {
        fetchFatturazione(selectedComune.id);
      }
    } catch (error) {
      console.error('Error deleting contratto:', error);
    }
  };

  // Carica utenti assegnati al comune
  const fetchPermessi = async (comuneId: number) => {
    setLoadingPermessi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/comuni/${comuneId}/utenti`);
      const data = await res.json();
      if (data.success) setUtentiComune(data.data);
    } catch (error) {
      console.error('Error fetching permessi:', error);
    } finally {
      setLoadingPermessi(false);
    }
  };

  // Assegna utente al comune
  const handleAssegnaUtente = async () => {
    if (!selectedComune || !utenteForm.email) return;
    try {
      // Prima cerchiamo l'utente per email
      const userRes = await fetch(`${API_BASE_URL}/api/users?email=${encodeURIComponent(utenteForm.email)}`);
      const userData = await userRes.json();
      
      let userId = utenteForm.user_id;
      if (userData.success && userData.data?.length > 0) {
        userId = userData.data[0].id;
      } else if (!userId) {
        alert('Utente non trovato. Inserisci un ID utente valido o un\'email esistente.');
        return;
      }
      
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/${selectedComune.id}/utenti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userId as string), ruolo: utenteForm.ruolo })
      });
      const data = await res.json();
      if (data.success) {
        setShowUtenteForm(false);
        setUtenteForm({ user_id: '', ruolo: 'operatore', email: '' });
        fetchPermessi(selectedComune.id);
      }
    } catch (error) {
      console.error('Error assigning utente:', error);
    }
  };

  // Aggiorna ruolo utente
  const handleUpdateRuolo = async (assegnazioneId: number, nuovoRuolo: string) => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/utenti/${assegnazioneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruolo: nuovoRuolo })
      });
      const data = await res.json();
      if (data.success && selectedComune) {
        fetchPermessi(selectedComune.id);
      }
    } catch (error) {
      console.error('Error updating ruolo:', error);
    }
  };

  // Rimuovi utente dal comune
  const handleRimuoviUtente = async (assegnazioneId: number) => {
    if (!confirm('Sei sicuro di voler rimuovere questo utente dal comune?')) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/utenti/${assegnazioneId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && selectedComune) {
        fetchPermessi(selectedComune.id);
      }
    } catch (error) {
      console.error('Error removing utente:', error);
    }
  };

  // Conta utenti per ruolo
  const getUtentiPerRuolo = (ruolo: string) => {
    return utentiComune.filter(u => u.ruolo === ruolo && u.attivo).length;
  };

  // Funzione per accedere come admin del comune (impersonificazione)
  const handleAccediComeComune = async (comune: Comune) => {
    if (!confirm(`Vuoi accedere come Admin del Comune di ${comune.nome}?\n\nVerrà aperta una nuova finestra con la vista del comune.`)) return;
    
    setImpersonating(true);
    try {
      // Cerca l'admin del comune
      const res = await fetch(`${API_BASE_URL}/api/comuni/${comune.id}/utenti`);
      const data = await res.json();
      
      // Trova l'admin o il primo utente attivo (se esiste)
      const adminUser = data.success && data.data.length > 0 
        ? (data.data.find((u: UtenteComune) => u.ruolo === 'admin' && u.attivo) || data.data.find((u: UtenteComune) => u.attivo))
        : null;
      
      // ADMIN BYPASS: Se non c'è un utente assegnato, permetti comunque l'impersonificazione diretta
      // L'admin di sistema può visualizzare qualsiasi comune senza bisogno di un utente locale
      const comuneNomeEncoded = encodeURIComponent(comune.nome);
      const userEmail = adminUser ? encodeURIComponent(adminUser.email || '') : encodeURIComponent(`admin@c_${comune.codice_catastale?.toLowerCase() || comune.id}.miohub.it`);
      
      // Costruisci URL impersonificazione
      const impersonateUrl = `/dashboard-pa?comune_id=${comune.id}&comune_nome=${comuneNomeEncoded}&user_email=${userEmail}&impersonate=true`;
      
      // Usa sempre redirect nella stessa pagina (evita problemi popup su Safari/iPad)
      // I dati di impersonificazione vengono salvati in sessionStorage dal hook useImpersonation
      if (confirm(`Vuoi accedere come Admin del Comune di ${comune.nome}?\n\nVerrai reindirizzato alla dashboard del comune.`)) {
        window.location.href = impersonateUrl;
      }
    } catch (error) {
      console.error('Error impersonating comune:', error);
      alert('❌ Errore di connessione durante l\'impersonificazione');
    } finally {
      setImpersonating(false);
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
    
    // Estrai regione dalla sigla provincia
    let regione = '';
    const provinciaRegioneMap: { [key: string]: string } = {
      // Piemonte
      'TO': 'Piemonte', 'VC': 'Piemonte', 'NO': 'Piemonte', 'CN': 'Piemonte', 'AT': 'Piemonte', 'AL': 'Piemonte', 'BI': 'Piemonte', 'VB': 'Piemonte',
      // Valle d'Aosta
      'AO': "Valle d'Aosta",
      // Lombardia
      'VA': 'Lombardia', 'CO': 'Lombardia', 'SO': 'Lombardia', 'MI': 'Lombardia', 'BG': 'Lombardia', 'BS': 'Lombardia', 'PV': 'Lombardia', 'CR': 'Lombardia', 'MN': 'Lombardia', 'LC': 'Lombardia', 'LO': 'Lombardia', 'MB': 'Lombardia',
      // Trentino-Alto Adige
      'BZ': 'Trentino-Alto Adige', 'TN': 'Trentino-Alto Adige',
      // Veneto
      'VR': 'Veneto', 'VI': 'Veneto', 'BL': 'Veneto', 'TV': 'Veneto', 'VE': 'Veneto', 'PD': 'Veneto', 'RO': 'Veneto',
      // Friuli-Venezia Giulia
      'UD': 'Friuli-Venezia Giulia', 'GO': 'Friuli-Venezia Giulia', 'TS': 'Friuli-Venezia Giulia', 'PN': 'Friuli-Venezia Giulia',
      // Liguria
      'IM': 'Liguria', 'SV': 'Liguria', 'GE': 'Liguria', 'SP': 'Liguria',
      // Emilia-Romagna
      'PC': 'Emilia-Romagna', 'PR': 'Emilia-Romagna', 'RE': 'Emilia-Romagna', 'MO': 'Emilia-Romagna', 'BO': 'Emilia-Romagna', 'FE': 'Emilia-Romagna', 'RA': 'Emilia-Romagna', 'FC': 'Emilia-Romagna', 'RN': 'Emilia-Romagna',
      // Toscana
      'MS': 'Toscana', 'LU': 'Toscana', 'PT': 'Toscana', 'FI': 'Toscana', 'LI': 'Toscana', 'PI': 'Toscana', 'AR': 'Toscana', 'SI': 'Toscana', 'GR': 'Toscana', 'PO': 'Toscana',
      // Umbria
      'PG': 'Umbria', 'TR': 'Umbria',
      // Marche
      'PU': 'Marche', 'AN': 'Marche', 'MC': 'Marche', 'AP': 'Marche', 'FM': 'Marche',
      // Lazio
      'VT': 'Lazio', 'RI': 'Lazio', 'RM': 'Lazio', 'LT': 'Lazio', 'FR': 'Lazio',
      // Abruzzo
      'AQ': 'Abruzzo', 'TE': 'Abruzzo', 'PE': 'Abruzzo', 'CH': 'Abruzzo',
      // Molise
      'CB': 'Molise', 'IS': 'Molise',
      // Campania
      'CE': 'Campania', 'BN': 'Campania', 'NA': 'Campania', 'AV': 'Campania', 'SA': 'Campania',
      // Puglia
      'FG': 'Puglia', 'BA': 'Puglia', 'TA': 'Puglia', 'BR': 'Puglia', 'LE': 'Puglia', 'BT': 'Puglia',
      // Basilicata
      'PZ': 'Basilicata', 'MT': 'Basilicata',
      // Calabria
      'CS': 'Calabria', 'CZ': 'Calabria', 'KR': 'Calabria', 'VV': 'Calabria', 'RC': 'Calabria',
      // Sicilia
      'TP': 'Sicilia', 'PA': 'Sicilia', 'ME': 'Sicilia', 'AG': 'Sicilia', 'CL': 'Sicilia', 'EN': 'Sicilia', 'CT': 'Sicilia', 'RG': 'Sicilia', 'SR': 'Sicilia',
      // Sardegna
      'SS': 'Sardegna', 'NU': 'Sardegna', 'CA': 'Sardegna', 'OR': 'Sardegna', 'SU': 'Sardegna'
    };
    if (provincia) {
      regione = provinciaRegioneMap[provincia] || '';
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
      logo_url: '',
      codice_fiscale: ipa.codice_fiscale || '',
      tipologia: ipa.tipologia || '',
      sindaco_nome: ipa.responsabile_nome || '',
      sindaco_cognome: ipa.responsabile_cognome || '',
      sindaco_titolo: ipa.titolo_responsabile || '',
      acronimo: ''
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
      fetchMercati(selectedComune.id);
      fetchHub(selectedComune.id);
      fetchFatturazione(selectedComune.id);
      fetchPermessi(selectedComune.id);
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
            
            const saveRes = await authenticatedFetch(`${API_BASE_URL}/api/comuni/${selectedComune.id}/settori`, {
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
      
      const isNewComune = !editingComune;
      const codiceIPA = comuneForm.codice_ipa;
      
      const res = await authenticatedFetch(url, {
        method: editingComune ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comuneForm)
      });
      
      const data = await res.json();
      if (data.success) {
        // Se è un nuovo comune importato da IPA, importa automaticamente i settori
        if (isNewComune && codiceIPA) {
          const newComuneId = data.data?.id || data.id;
          if (newComuneId) {
            await importSettoriAutomatici(newComuneId, codiceIPA);
          }
        }
        
        fetchComuni();
        setShowComuneForm(false);
        setEditingComune(null);
        setComuneForm({
          nome: '', provincia: '', regione: '', cap: '', codice_istat: '',
          codice_catastale: '', codice_ipa: '', pec: '', email: '', telefono: '', sito_web: '',
          indirizzo: '', logo_url: '', codice_fiscale: '', tipologia: '',
          sindaco_nome: '', sindaco_cognome: '', sindaco_titolo: '', acronimo: ''
        });
      }
    } catch (error) {
      console.error('Error saving comune:', error);
    }
  };

  // Importa automaticamente i settori da IPA dopo la creazione del comune
  const importSettoriAutomatici = async (comuneId: number, codiceIPA: string) => {
    try {
      console.warn(`[ComuniPanel] Importazione automatica settori per comune ${comuneId} da IPA ${codiceIPA}`);
      
      // Recupera le UO da IndicePA
      const resUO = await fetch(`${API_BASE_URL}/api/ipa/uo/${codiceIPA}`);
      const dataUO = await resUO.json();
      
      if (dataUO.success && dataUO.data && dataUO.data.length > 0) {
        let importati = 0;
        
        for (const uo of dataUO.data) {
          // Mappa il tipo settore usando nome_uo (campo corretto dall'API)
          const tipoSettore = uo.tipo_settore || mapTipoSettore(uo.nome_uo || '');
          
          const settoreData = {
            tipo_settore: tipoSettore,
            nome_settore: uo.nome_uo || 'Settore',
            responsabile_nome: uo.responsabile_nome || '',
            responsabile_cognome: uo.responsabile_cognome || '',
            email: uo.email || '',
            pec: uo.pec || '',
            telefono: uo.telefono || '',
            indirizzo: uo.indirizzo || '',
            orari_apertura: '',
            note: `Importato da IndicePA - Codice UO: ${uo.codice_uo || ''}`
          };
          
          // Salva il settore
          const resSave = await authenticatedFetch(`${API_BASE_URL}/api/comuni/${comuneId}/settori`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settoreData)
          });
          
          if (resSave.ok) {
            importati++;
          }
        }
        
        console.warn(`[ComuniPanel] Importati ${importati} settori da IndicePA`);
        alert(`Comune creato con successo!\n\nImportati automaticamente ${importati} settori da IndicePA.`);
      } else {
        console.warn('[ComuniPanel] Nessun settore trovato su IndicePA');
      }
    } catch (error) {
      console.error('Errore import settori automatici:', error);
    }
  };

  // Mappa la descrizione UO al tipo settore
  const mapTipoSettore = (descrizione: string): string => {
    const desc = descrizione.toLowerCase();
    if (desc.includes('suap') || desc.includes('attività produttive')) return 'SUAP';
    if (desc.includes('commercio')) return 'COMMERCIO';
    if (desc.includes('tributi')) return 'TRIBUTI';
    if (desc.includes('polizia') || desc.includes('vigili')) return 'POLIZIA_LOCALE';
    if (desc.includes('anagrafe') || desc.includes('demografic')) return 'DEMOGRAFICI';
    if (desc.includes('urbanistic') || desc.includes('edilizi')) return 'TECNICO';
    if (desc.includes('ambiente') || desc.includes('ecolog')) return 'AMBIENTE';
    if (desc.includes('social')) return 'ALTRO';
    if (desc.includes('ragioneria') || desc.includes('bilancio')) return 'RAGIONERIA';
    if (desc.includes('personale') || desc.includes('risorse umane')) return 'ALTRO';
    if (desc.includes('segreteria')) return 'SEGRETERIA';
    if (desc.includes('tecnico') || desc.includes('lavori pubblici')) return 'TECNICO';
    if (desc.includes('urp') || desc.includes('relazioni')) return 'URP';
    if (desc.includes('protezione civile')) return 'PROTEZIONE_CIVILE';
    return 'ALTRO';
  };

  // Elimina comune
  const handleDeleteComune = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo comune e tutti i suoi settori?')) return;
    
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/${id}`, { method: 'DELETE' });
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
      
      const res = await authenticatedFetch(url, {
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
      const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/settori/${id}`, { method: 'DELETE' });
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
      logo_url: comune.logo_url || '',
      codice_fiscale: (comune as any).codice_fiscale || '',
      tipologia: (comune as any).tipologia || '',
      sindaco_nome: (comune as any).sindaco_nome || '',
      sindaco_cognome: (comune as any).sindaco_cognome || '',
      sindaco_titolo: (comune as any).sindaco_titolo || '',
      acronimo: (comune as any).acronimo || ''
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
  const totalSettori = comuni.reduce((acc, c) => acc + (Number(c.num_settori) || 0), 0);
  const comuniConSettori = comuni.filter(c => (Number(c.num_settori) || 0) > 0).length;

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
                indirizzo: '', logo_url: '', codice_fiscale: '', tipologia: '', sindaco_nome: '', sindaco_cognome: '', sindaco_titolo: '', acronimo: ''
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

      {/* Layout: lista stretta + dettaglio largo */}
      <div className="flex gap-6">
        {/* Lista Comuni - sidebar stretta */}
        <div className={`bg-gray-800/50 rounded-xl border border-gray-700 p-4 ${selectedComune ? 'w-80 flex-shrink-0' : 'w-full'}`}>
          <h3 className="text-lg font-medium text-white mb-4">Comuni Registrati</h3>
          
          {/* Ricerca locale */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                // Deseleziona se il comune selezionato non è nei risultati filtrati
                if (selectedComune) {
                  const query = e.target.value.toLowerCase();
                  const isInResults = comuni.some(c => 
                    c.id === selectedComune.id && (
                      c.nome.toLowerCase().includes(query) ||
                      c.provincia.toLowerCase().includes(query) ||
                      c.regione.toLowerCase().includes(query) ||
                      (c.cap && c.cap.includes(query))
                    )
                  );
                  if (!isInResults && query.length > 0) {
                    setSelectedComune(null);
                  }
                }
              }}
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
                        onClick={(e) => { e.stopPropagation(); handleAccediComeComune(comune); }}
                        className="p-1 text-yellow-400 hover:text-yellow-300" 
                        title="Accedi come Admin del Comune"
                        disabled={impersonating}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

        {/* Dettaglio Comune - occupa tutto lo spazio rimanente */}
        {selectedComune && (
        <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">{selectedComune.nome}</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAccediComeComune(selectedComune)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded-lg text-sm font-medium transition-colors"
                    disabled={impersonating}
                  >
                    <Eye className="w-4 h-4" />
                    {impersonating ? 'Caricamento...' : 'Accedi come'}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  {selectedComune.codice_ipa && (
                    <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">
                      IPA: {selectedComune.codice_ipa}
                    </span>
                  )}
                </div>
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
                  onClick={() => setActiveTab('hub')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'hub'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  HUB
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
                    <span className="text-sm text-gray-400">{mercatiComune.length} mercati</span>
                  </div>
                  
                  {loadingMercati ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                      <p className="text-gray-400 mt-2">Caricamento mercati...</p>
                    </div>
                  ) : mercatiComune.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nessun mercato associato a questo comune</p>
                      <p className="text-sm mt-2">I mercati vengono associati dalla sezione Gestione Mercati</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mercatiComune.map(mercato => (
                        <div key={mercato.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-white">{mercato.name}</h5>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${mercato.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                  {mercato.status === 'active' ? 'Attivo' : 'Inattivo'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">Codice: {mercato.code}</p>
                            </div>
                            <a 
                              href="/dashboard-pa?tab=workspace&subtab=rete-hub"
                              className="text-cyan-400 hover:text-cyan-300 text-sm"
                            >
                              Vai al mercato →
                            </a>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 pt-3 border-t border-gray-700">
                            <div>
                              <p className="text-xs text-gray-500">Giorni</p>
                              <p className="text-sm text-white">{mercato.days || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Posteggi</p>
                              <p className="text-sm text-white">{mercato.total_stalls || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Area Totale</p>
                              <p className="text-sm text-white font-medium text-cyan-400">{mercato.total_area_sqm ? `${parseFloat(mercato.total_area_sqm).toLocaleString('it-IT', { maximumFractionDigits: 0 })} mq` : '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Costo/mq</p>
                              <p className="text-sm text-white">€ {mercato.cost_per_sqm || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Giornate/anno</p>
                              <p className="text-sm text-white">{mercato.annual_market_days || '-'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab HUB */}
              {activeTab === 'hub' && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-white">HUB del Comune</h4>
                    <span className="text-sm text-gray-400">{hubComune.length} HUB</span>
                  </div>
                  
                  {loadingHub ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                      <p className="text-gray-400 mt-2">Caricamento HUB...</p>
                    </div>
                  ) : hubComune.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nessun HUB associato a questo comune</p>
                      <p className="text-sm mt-2">Gli HUB vengono creati dalla sezione Vista Italia</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hubComune.map(hub => (
                        <div key={hub.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-white">{hub.name}</h5>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${hub.active === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                  {hub.active === 1 ? 'Attivo' : 'Inattivo'}
                                </span>
                                {hub.livello && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
                                    {hub.livello}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 mt-1">{hub.address}, {hub.city} {hub.provincia_sigla && `(${hub.provincia_sigla})`}</p>
                              {hub.description && <p className="text-xs text-gray-500 mt-1">{hub.description}</p>}
                            </div>
                            <a 
                              href="/dashboard-pa?tab=workspace&subtab=rete-hub"
                              className="text-cyan-400 hover:text-cyan-300 text-sm"
                            >
                              Vai all'HUB →
                            </a>
                          </div>
                          
                          {/* Statistiche HUB */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t border-gray-700">
                            <div>
                              <p className="text-xs text-gray-500">Negozi</p>
                              <p className="text-sm text-white font-medium">{hub.shops_count}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Area Totale</p>
                              <p className="text-sm text-cyan-400 font-medium">{hub.area_sqm ? `${parseFloat(hub.area_sqm).toLocaleString('it-IT', { maximumFractionDigits: 0 })} mq` : '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Tipo</p>
                              <p className="text-sm text-white">{hub.tipo || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Coordinate</p>
                              <p className="text-sm text-white">{hub.lat && hub.lng ? `${parseFloat(hub.lat).toFixed(4)}, ${parseFloat(hub.lng).toFixed(4)}` : '-'}</p>
                            </div>
                          </div>

                          {/* Lista Negozi */}
                          {hub.shops && hub.shops.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-700">
                              <p className="text-xs text-gray-500 mb-2">Negozi nell'HUB:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {hub.shops.map(shop => (
                                  <div key={shop.id} className="flex items-center gap-2 bg-gray-700/30 rounded px-3 py-2">
                                    <span className={`w-2 h-2 rounded-full ${shop.status === 'active' ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white truncate">{shop.name}</p>
                                      <p className="text-xs text-gray-400">{shop.category}</p>
                                    </div>
                                    {shop.phone && <span className="text-xs text-gray-500">{shop.phone}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Fatturazione */}
              {activeTab === 'fatturazione' && (
                <div className="pt-2">
                  {loadingFatturazione ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                      <p className="text-gray-400 mt-2">Caricamento dati fatturazione...</p>
                    </div>
                  ) : (
                    <>
                      {/* Sezione Contratti */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            Contratti ({contratti.length})
                          </h4>
                          <button 
                            onClick={() => setShowContrattoForm(true)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Nuovo Contratto
                          </button>
                        </div>
                        
                        {contratti.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Nessun contratto attivo</p>
                            <p className="text-sm mt-1">Crea un nuovo contratto per iniziare</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {contratti.map(contratto => (
                              <div key={contratto.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-medium text-white">{contratto.descrizione || contratto.tipo_contratto}</h5>
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        contratto.stato === 'attivo' ? 'bg-emerald-500/20 text-emerald-400' :
                                        contratto.stato === 'scaduto' ? 'bg-red-500/20 text-red-400' :
                                        'bg-yellow-500/20 text-yellow-400'
                                      }`}>
                                        {contratto.stato}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">
                                      Dal {contratto.data_inizio ? new Date(contratto.data_inizio).toLocaleDateString('it-IT') : '-'} 
                                      al {contratto.data_fine ? new Date(contratto.data_fine).toLocaleDateString('it-IT') : '-'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-semibold text-emerald-400">€ {Number(contratto.importo_annuale || 0).toLocaleString('it-IT')}</p>
                                    <p className="text-xs text-gray-500">annuale</p>
                                  </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        setFatturaForm(prev => ({ ...prev, contratto_id: String(contratto.id) }));
                                        setShowFatturaForm(true);
                                      }}
                                      className="text-xs text-emerald-400 hover:underline"
                                    >
                                      + Genera Fattura
                                    </button>
                                  </div>
                                  <button 
                                    onClick={() => handleDeleteContratto(contratto.id)}
                                    className="text-xs text-red-400 hover:underline"
                                  >
                                    Elimina
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sezione Fatture */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-white flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-purple-400" />
                            Fatture ({fatture.length})
                          </h4>
                          <button 
                            onClick={() => setShowFatturaForm(true)}
                            className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Nuova Fattura
                          </button>
                        </div>
                        
                        {fatture.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700">
                            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Nessuna fattura emessa</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {fatture.map(fattura => (
                              <div key={fattura.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <span className="font-medium text-white">#{fattura.numero_fattura}</span>
                                      <p className="text-xs text-gray-500">
                                        {fattura.data_emissione ? new Date(fattura.data_emissione).toLocaleDateString('it-IT') : '-'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-white">€ {Number(fattura.totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                                      <p className="text-xs text-gray-500">IVA incl.</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      fattura.stato === 'pagata' ? 'bg-emerald-500/20 text-emerald-400' :
                                      fattura.stato === 'scaduta' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {fattura.stato}
                                    </span>
                                    {fattura.stato !== 'pagata' && (
                                      <button 
                                        onClick={() => handleUpdateFatturaStato(fattura.id, 'pagata')}
                                        className="text-xs text-emerald-400 hover:underline"
                                      >
                                        Segna pagata
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab Permessi */}
              {activeTab === 'permessi' && (
                <div className="pt-2">
                  {loadingPermessi ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                      <p className="text-gray-400 mt-2">Caricamento permessi...</p>
                    </div>
                  ) : (
                    <>
                      {/* Header con pulsante aggiungi */}
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-white flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-400" />
                          Gestione Permessi e Ruoli
                        </h4>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async () => {
                              if (!selectedComune) return;
                              if (!confirm(`Vuoi generare le credenziali Admin per ${selectedComune.nome}?\n\nVerrà creato un utente admin con password temporanea.`)) return;
                              try {
                                const res = await authenticatedFetch(`${API_BASE_URL}/api/comuni/${selectedComune.id}/provision-admin`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const data = await res.json();
                                if (data.success) {
                                  alert(`✅ Admin creato!\n\nEmail: ${data.data.admin_email}\nPassword: ${data.data.temp_password}\n\n⚠️ IMPORTANTE: Salva queste credenziali e inviale alla PEC del comune!`);
                                  fetchPermessi(selectedComune.id);
                                } else {
                                  alert(`❌ Errore: ${data.error}${data.existing_admin ? `\n\nAdmin esistente: ${data.existing_admin}` : ''}`);
                                }
                              } catch (error) {
                                console.error('Error provisioning admin:', error);
                                alert('❌ Errore di connessione');
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                            title="Genera automaticamente un utente admin con credenziali temporanee"
                          >
                            <Shield className="w-3 h-3" />
                            Genera Admin
                          </button>
                          <button 
                            onClick={() => setShowUtenteForm(true)}
                            className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            Assegna Utente
                          </button>
                        </div>
                      </div>

                      {/* Riepilogo ruoli */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {RUOLI_COMUNE.map(ruolo => (
                          <div key={ruolo.value} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">{ruolo.label}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                getUtentiPerRuolo(ruolo.value) > 0 
                                  ? 'bg-purple-500/20 text-purple-400' 
                                  : 'bg-gray-600/30 text-gray-500'
                              }`}>
                                {getUtentiPerRuolo(ruolo.value)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{ruolo.description}</p>
                          </div>
                        ))}
                      </div>

                      {/* Lista utenti assegnati */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-3">Utenti Assegnati ({utentiComune.length})</h5>
                        {utentiComune.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700">
                            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Nessun utente assegnato</p>
                            <p className="text-sm mt-1">Clicca "Assegna Utente" per aggiungere operatori</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {utentiComune.map(utente => (
                              <div key={utente.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center">
                                      <Users className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-white">{utente.user_name || utente.email || `Utente #${utente.user_id}`}</p>
                                      <p className="text-xs text-gray-500">{utente.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={utente.ruolo}
                                      onChange={(e) => handleUpdateRuolo(utente.id, e.target.value)}
                                      className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                                    >
                                      {RUOLI_COMUNE.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleRimuoviUtente(utente.id)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                      title="Rimuovi utente"
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
                    </>
                  )}
                </div>
              )}
            </>
        </div>
        )}
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
              
              {/* Nuovi campi IPA */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Codice Fiscale Ente</label>
                <input
                  type="text"
                  value={comuneForm.codice_fiscale}
                  onChange={e => setComuneForm({...comuneForm, codice_fiscale: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 01232710374"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipologia Ente</label>
                <input
                  type="text"
                  value={comuneForm.tipologia}
                  onChange={e => setComuneForm({...comuneForm, tipologia: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Pubbliche Amministrazioni"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome Sindaco</label>
                <input
                  type="text"
                  value={comuneForm.sindaco_nome}
                  onChange={e => setComuneForm({...comuneForm, sindaco_nome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Matteo"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Cognome Sindaco</label>
                <input
                  type="text"
                  value={comuneForm.sindaco_cognome}
                  onChange={e => setComuneForm({...comuneForm, sindaco_cognome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Lepore"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Titolo Sindaco</label>
                <input
                  type="text"
                  value={comuneForm.sindaco_titolo}
                  onChange={e => setComuneForm({...comuneForm, sindaco_titolo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Sindaco"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Acronimo</label>
                <input
                  type="text"
                  value={comuneForm.acronimo}
                  onChange={e => setComuneForm({...comuneForm, acronimo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. BO"
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

      {/* Modal Form Contratto */}
      {showContrattoForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nuovo Contratto</h3>
              <button onClick={() => setShowContrattoForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipo Contratto</label>
                <select
                  value={contrattoForm.tipo_contratto}
                  onChange={e => setContrattoForm({...contrattoForm, tipo_contratto: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="servizio_miohub">Servizio MIO-HUB</option>
                  <option value="licenza_annuale">Licenza Annuale</option>
                  <option value="manutenzione">Manutenzione</option>
                  <option value="consulenza">Consulenza</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={contrattoForm.descrizione}
                  onChange={e => setContrattoForm({...contrattoForm, descrizione: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Contratto annuale piattaforma MIO-HUB"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Data Inizio</label>
                  <input
                    type="date"
                    value={contrattoForm.data_inizio}
                    onChange={e => setContrattoForm({...contrattoForm, data_inizio: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Data Fine</label>
                  <input
                    type="date"
                    value={contrattoForm.data_fine}
                    onChange={e => setContrattoForm({...contrattoForm, data_fine: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Importo Annuale (€)</label>
                <input
                  type="number"
                  value={contrattoForm.importo_annuale}
                  onChange={e => setContrattoForm({...contrattoForm, importo_annuale: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 5000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stato</label>
                <select
                  value={contrattoForm.stato}
                  onChange={e => setContrattoForm({...contrattoForm, stato: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="attivo">Attivo</option>
                  <option value="in_attesa">In Attesa</option>
                  <option value="sospeso">Sospeso</option>
                  <option value="scaduto">Scaduto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Note</label>
                <textarea
                  value={contrattoForm.note}
                  onChange={e => setContrattoForm({...contrattoForm, note: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={2}
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowContrattoForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                Annulla
              </button>
              <button
                onClick={handleCreateContratto}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                <Save className="w-4 h-4" />
                Crea Contratto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Fattura */}
      {showFatturaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nuova Fattura</h3>
              <button onClick={() => setShowFatturaForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Contratto Associato</label>
                <select
                  value={fatturaForm.contratto_id}
                  onChange={e => setFatturaForm({...fatturaForm, contratto_id: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">-- Nessun contratto --</option>
                  {contratti.map(c => (
                    <option key={c.id} value={c.id}>{c.descrizione || c.tipo_contratto}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Numero Fattura *</label>
                <input
                  type="text"
                  value={fatturaForm.numero_fattura}
                  onChange={e => setFatturaForm({...fatturaForm, numero_fattura: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. FT-2025-001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Data Emissione</label>
                  <input
                    type="date"
                    value={fatturaForm.data_emissione}
                    onChange={e => setFatturaForm({...fatturaForm, data_emissione: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Data Scadenza</label>
                  <input
                    type="date"
                    value={fatturaForm.data_scadenza}
                    onChange={e => setFatturaForm({...fatturaForm, data_scadenza: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Importo (€)</label>
                  <input
                    type="number"
                    value={fatturaForm.importo}
                    onChange={e => setFatturaForm({...fatturaForm, importo: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="es. 1000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">IVA %</label>
                  <input
                    type="number"
                    value={fatturaForm.iva}
                    onChange={e => setFatturaForm({...fatturaForm, iva: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="22"
                  />
                </div>
              </div>
              {fatturaForm.importo && (
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Imponibile:</span>
                    <span className="text-white">€ {parseFloat(fatturaForm.importo || '0').toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">IVA ({fatturaForm.iva}%):</span>
                    <span className="text-white">€ {(parseFloat(fatturaForm.importo || '0') * parseFloat(fatturaForm.iva || '22') / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-600 pt-2 mt-2">
                    <span className="text-gray-300">Totale:</span>
                    <span className="text-emerald-400">€ {(parseFloat(fatturaForm.importo || '0') * (1 + parseFloat(fatturaForm.iva || '22') / 100)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stato</label>
                <select
                  value={fatturaForm.stato}
                  onChange={e => setFatturaForm({...fatturaForm, stato: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="emessa">Emessa</option>
                  <option value="inviata">Inviata</option>
                  <option value="pagata">Pagata</option>
                  <option value="scaduta">Scaduta</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowFatturaForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                Annulla
              </button>
              <button
                onClick={handleCreateFattura}
                disabled={!fatturaForm.numero_fattura}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg"
              >
                <Save className="w-4 h-4" />
                Crea Fattura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Assegna Utente */}
      {showUtenteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Assegna Utente al Comune</h3>
              <button onClick={() => setShowUtenteForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email Utente *</label>
                <input
                  type="email"
                  value={utenteForm.email}
                  onChange={e => setUtenteForm({...utenteForm, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. operatore@comune.it"
                />
                <p className="text-xs text-gray-500 mt-1">L'utente deve essere già registrato nel sistema</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Oppure ID Utente</label>
                <input
                  type="number"
                  value={utenteForm.user_id}
                  onChange={e => setUtenteForm({...utenteForm, user_id: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 123"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ruolo *</label>
                <select
                  value={utenteForm.ruolo}
                  onChange={e => setUtenteForm({...utenteForm, ruolo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {RUOLI_COMUNE.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {RUOLI_COMUNE.find(r => r.value === utenteForm.ruolo)?.description}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowUtenteForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">
                Annulla
              </button>
              <button
                onClick={handleAssegnaUtente}
                disabled={!utenteForm.email && !utenteForm.user_id}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg"
              >
                <Save className="w-4 h-4" />
                Assegna Utente
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
