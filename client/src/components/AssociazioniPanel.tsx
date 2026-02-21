import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Phone, Mail, Globe, MapPin, Users, Save, X, Search, Loader2, FileText, Shield, CreditCard, Eye, ExternalLink, Briefcase, UserCheck, Hash } from 'lucide-react';

const API_BASE_URL = 'https://orchestratore.mio-hub.me';

// Tipi di associazione
const TIPI_ASSOCIAZIONE = [
  { value: 'COMMERCIANTI', label: 'Commercianti' },
  { value: 'AMBULANTI', label: 'Ambulanti' },
  { value: 'ARTIGIANI', label: 'Artigiani' },
  { value: 'MISTA', label: 'Mista' },
  { value: 'AGRICOLTORI', label: 'Agricoltori' },
  { value: 'INDUSTRIALI', label: 'Industriali' },
  { value: 'TURISMO', label: 'Turismo' },
  { value: 'ALTRO', label: 'Altro' },
];

interface Associazione {
  id: number;
  nome: string;
  sigla: string;
  tipo: string;
  provincia: string;
  regione: string;
  citta: string;
  cap: string;
  codice_fiscale: string;
  partita_iva: string;
  pec: string;
  email: string;
  telefono: string;
  sito_web: string;
  indirizzo: string;
  logo_url: string;
  presidente_nome: string;
  presidente_cognome: string;
  presidente_email: string;
  referente_nome: string;
  referente_cognome: string;
  referente_email: string;
  referente_telefono: string;
  num_tesserati: number;
  data_iscrizione: string;
  stato: string;
  note: string;
  num_utenti?: number;
}

interface Contratto {
  id: number;
  associazione_id: number;
  tipo_contratto: string;
  descrizione: string;
  data_inizio: string;
  data_fine: string;
  importo_annuale: number;
  percentuale_pratica: number;
  stato: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface Fattura {
  id: number;
  associazione_id: number;
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

interface UtenteAssociazione {
  id: number;
  associazione_id: number;
  user_id: number;
  ruolo: string;
  permessi: Record<string, boolean>;
  attivo: boolean;
  email?: string;
  user_name?: string;
  created_at: string;
}

export default function AssociazioniPanel() {
  const [associazioni, setAssociazioni] = useState<Associazione[]>([]);
  const [selectedAssociazione, setSelectedAssociazione] = useState<Associazione | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Associazione | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'anagrafica' | 'contatti' | 'fatturazione' | 'permessi'>('anagrafica');

  // Stato per fatturazione
  const [contratti, setContratti] = useState<Contratto[]>([]);
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [loadingFatturazione, setLoadingFatturazione] = useState(false);
  const [showContrattoForm, setShowContrattoForm] = useState(false);
  const [showFatturaForm, setShowFatturaForm] = useState(false);
  const [contrattoForm, setContrattoForm] = useState({
    tipo_contratto: 'servizio_miohub',
    descrizione: '',
    data_inizio: '',
    data_fine: '',
    importo_annuale: '',
    percentuale_pratica: '',
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
  const [utenti, setUtenti] = useState<UtenteAssociazione[]>([]);
  const [loadingPermessi, setLoadingPermessi] = useState(false);
  const [showUtenteForm, setShowUtenteForm] = useState(false);
  const [utenteForm, setUtenteForm] = useState({
    user_id: '',
    ruolo: 'operatore',
    email: ''
  });

  // Impersonificazione
  const [impersonating, setImpersonating] = useState(false);

  // Ruoli disponibili
  const RUOLI_ASSOCIAZIONE = [
    { value: 'admin', label: 'Admin Associazione', description: 'Accesso completo a tutte le funzionalità' },
    { value: 'presidente', label: 'Presidente', description: 'Visione completa e approvazione pratiche' },
    { value: 'referente_scia', label: 'Referente SCIA', description: 'Gestione pratiche SCIA e Domande Spunta' },
    { value: 'operatore', label: 'Operatore Generico', description: 'Accesso base in sola lettura' }
  ];

  // Form state
  const [form, setForm] = useState({
    nome: '', sigla: '', tipo: 'MISTA', provincia: '', regione: '', citta: '', cap: '',
    codice_fiscale: '', partita_iva: '', pec: '', email: '', telefono: '',
    sito_web: '', indirizzo: '', logo_url: '',
    presidente_nome: '', presidente_cognome: '', presidente_email: '',
    referente_nome: '', referente_cognome: '', referente_email: '', referente_telefono: '',
    num_tesserati: '', stato: 'attivo', note: ''
  });

  // ==================== FETCH ====================

  const fetchAssociazioni = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni`);
      const data = await res.json();
      if (data.success) {
        setAssociazioni(data.data);
      }
    } catch (error) {
      console.error('Error fetching associazioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFatturazione = async (id: number) => {
    setLoadingFatturazione(true);
    try {
      const [contrattiRes, fattureRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/associazioni/${id}/contratti`),
        fetch(`${API_BASE_URL}/api/associazioni/${id}/fatture`)
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

  const fetchPermessi = async (id: number) => {
    setLoadingPermessi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${id}/utenti`);
      const data = await res.json();
      if (data.success) setUtenti(data.data);
    } catch (error) {
      console.error('Error fetching permessi:', error);
    } finally {
      setLoadingPermessi(false);
    }
  };

  useEffect(() => { fetchAssociazioni(); }, []);

  useEffect(() => {
    if (selectedAssociazione) {
      if (activeTab === 'fatturazione') fetchFatturazione(selectedAssociazione.id);
      if (activeTab === 'permessi') fetchPermessi(selectedAssociazione.id);
    }
  }, [selectedAssociazione, activeTab]);

  // ==================== CRUD ====================

  const handleSave = async () => {
    try {
      const url = editing
        ? `${API_BASE_URL}/api/associazioni/${editing.id}`
        : `${API_BASE_URL}/api/associazioni`;

      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          num_tesserati: parseInt(form.num_tesserati) || 0
        })
      });

      const data = await res.json();
      if (data.success) {
        fetchAssociazioni();
        setShowForm(false);
        setEditing(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving associazione:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa associazione e tutti i dati correlati?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchAssociazioni();
        if (selectedAssociazione?.id === id) {
          setSelectedAssociazione(null);
        }
      }
    } catch (error) {
      console.error('Error deleting associazione:', error);
    }
  };

  const resetForm = () => {
    setForm({
      nome: '', sigla: '', tipo: 'MISTA', provincia: '', regione: '', citta: '', cap: '',
      codice_fiscale: '', partita_iva: '', pec: '', email: '', telefono: '',
      sito_web: '', indirizzo: '', logo_url: '',
      presidente_nome: '', presidente_cognome: '', presidente_email: '',
      referente_nome: '', referente_cognome: '', referente_email: '', referente_telefono: '',
      num_tesserati: '', stato: 'attivo', note: ''
    });
  };

  const openEdit = (a: Associazione) => {
    setEditing(a);
    setForm({
      nome: a.nome || '', sigla: a.sigla || '', tipo: a.tipo || 'MISTA',
      provincia: a.provincia || '', regione: a.regione || '', citta: a.citta || '', cap: a.cap || '',
      codice_fiscale: a.codice_fiscale || '', partita_iva: a.partita_iva || '',
      pec: a.pec || '', email: a.email || '', telefono: a.telefono || '',
      sito_web: a.sito_web || '', indirizzo: a.indirizzo || '', logo_url: a.logo_url || '',
      presidente_nome: a.presidente_nome || '', presidente_cognome: a.presidente_cognome || '',
      presidente_email: a.presidente_email || '',
      referente_nome: a.referente_nome || '', referente_cognome: a.referente_cognome || '',
      referente_email: a.referente_email || '', referente_telefono: a.referente_telefono || '',
      num_tesserati: String(a.num_tesserati || ''), stato: a.stato || 'attivo', note: a.note || ''
    });
    setShowForm(true);
  };

  // ==================== CONTRATTI ====================

  const handleCreateContratto = async () => {
    if (!selectedAssociazione) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${selectedAssociazione.id}/contratti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contrattoForm,
          importo_annuale: parseFloat(contrattoForm.importo_annuale) || 0,
          percentuale_pratica: parseFloat(contrattoForm.percentuale_pratica) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowContrattoForm(false);
        setContrattoForm({ tipo_contratto: 'servizio_miohub', descrizione: '', data_inizio: '', data_fine: '', importo_annuale: '', percentuale_pratica: '', stato: 'attivo', note: '' });
        fetchFatturazione(selectedAssociazione.id);
      }
    } catch (error) {
      console.error('Error creating contratto:', error);
    }
  };

  const handleDeleteContratto = async (contrattoId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo contratto?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/contratti/${contrattoId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && selectedAssociazione) {
        fetchFatturazione(selectedAssociazione.id);
      }
    } catch (error) {
      console.error('Error deleting contratto:', error);
    }
  };

  // ==================== FATTURE ====================

  const handleCreateFattura = async () => {
    if (!selectedAssociazione) return;
    const importo = parseFloat(fatturaForm.importo) || 0;
    const iva = parseFloat(fatturaForm.iva) || 22;
    const totale = importo + (importo * iva / 100);
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${selectedAssociazione.id}/fatture`, {
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
        fetchFatturazione(selectedAssociazione.id);
      }
    } catch (error) {
      console.error('Error creating fattura:', error);
    }
  };

  const handleUpdateFatturaStato = async (fatturaId: number, nuovoStato: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/fatture/${fatturaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: nuovoStato, data_pagamento: nuovoStato === 'pagata' ? new Date().toISOString().split('T')[0] : null })
      });
      const data = await res.json();
      if (data.success && selectedAssociazione) {
        fetchFatturazione(selectedAssociazione.id);
      }
    } catch (error) {
      console.error('Error updating fattura:', error);
    }
  };

  // ==================== UTENTI ====================

  const handleAssegnaUtente = async () => {
    if (!selectedAssociazione || !utenteForm.email) return;
    try {
      const userRes = await fetch(`${API_BASE_URL}/api/users?email=${encodeURIComponent(utenteForm.email)}`);
      const userData = await userRes.json();

      let userId = utenteForm.user_id;
      if (userData.success && userData.data?.length > 0) {
        userId = userData.data[0].id;
      } else if (!userId) {
        alert('Utente non trovato. Inserisci un ID utente valido o un\'email esistente.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/associazioni/${selectedAssociazione.id}/utenti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userId as string), ruolo: utenteForm.ruolo, email: utenteForm.email })
      });
      const data = await res.json();
      if (data.success) {
        setShowUtenteForm(false);
        setUtenteForm({ user_id: '', ruolo: 'operatore', email: '' });
        fetchPermessi(selectedAssociazione.id);
      }
    } catch (error) {
      console.error('Error assigning utente:', error);
    }
  };

  const handleUpdateRuolo = async (assegnazioneId: number, nuovoRuolo: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/utenti/${assegnazioneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruolo: nuovoRuolo })
      });
      const data = await res.json();
      if (data.success && selectedAssociazione) {
        fetchPermessi(selectedAssociazione.id);
      }
    } catch (error) {
      console.error('Error updating ruolo:', error);
    }
  };

  const handleRimuoviUtente = async (assegnazioneId: number) => {
    if (!confirm('Sei sicuro di voler rimuovere questo utente dall\'associazione?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/utenti/${assegnazioneId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && selectedAssociazione) {
        fetchPermessi(selectedAssociazione.id);
      }
    } catch (error) {
      console.error('Error removing utente:', error);
    }
  };

  // ==================== IMPERSONIFICAZIONE ====================

  const handleAccediComeAssociazione = async (assoc: Associazione) => {
    setImpersonating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${assoc.id}/utenti`);
      const data = await res.json();

      const adminUser = data.success && data.data.length > 0
        ? (data.data.find((u: UtenteAssociazione) => u.ruolo === 'admin' && u.attivo) || data.data.find((u: UtenteAssociazione) => u.attivo))
        : null;

      const nomeEncoded = encodeURIComponent(assoc.nome);
      const userEmail = adminUser ? encodeURIComponent(adminUser.email || '') : encodeURIComponent(`admin@assoc_${assoc.sigla?.toLowerCase() || assoc.id}.miohub.it`);

      const impersonateUrl = `/dashboard-pa?associazione_id=${assoc.id}&associazione_nome=${nomeEncoded}&user_email=${userEmail}&impersonate=true&role=associazione`;

      if (confirm(`Vuoi accedere come Admin dell'Associazione ${assoc.nome}?\n\nVerrai reindirizzato alla dashboard dell'associazione.`)) {
        window.location.href = impersonateUrl;
      }
    } catch (error) {
      console.error('Error impersonating associazione:', error);
      alert('Errore di connessione durante l\'impersonificazione');
    } finally {
      setImpersonating(false);
    }
  };

  // ==================== FILTRO ====================

  const filtered = associazioni.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.nome?.toLowerCase().includes(q) ||
      a.sigla?.toLowerCase().includes(q) ||
      a.citta?.toLowerCase().includes(q) ||
      a.provincia?.toLowerCase().includes(q) ||
      a.tipo?.toLowerCase().includes(q)
    );
  });

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const totalTesserati = associazioni.reduce((acc, a) => acc + (Number(a.num_tesserati) || 0), 0);
  const attive = associazioni.filter(a => a.stato === 'attivo').length;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Briefcase className="w-4 h-4" />
            Associazioni Totali
          </div>
          <div className="text-2xl font-bold text-cyan-400">{associazioni.length}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users className="w-4 h-4" />
            Tesserati Totali
          </div>
          <div className="text-2xl font-bold text-emerald-400">{totalTesserati.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <UserCheck className="w-4 h-4" />
            Associazioni Attive
          </div>
          <div className="text-2xl font-bold text-purple-400">{attive}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Hash className="w-4 h-4" />
            Media Tesserati
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {associazioni.length > 0 ? (totalTesserati / associazioni.length).toFixed(0) : '0'}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-cyan-400" />
          Gestione Associazioni
        </h2>
        <button
          onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuova Associazione
        </button>
      </div>

      {/* Layout: lista + dettaglio */}
      <div className="flex gap-6">
        {/* Lista */}
        <div className={`bg-gray-800/50 rounded-xl border border-gray-700 p-4 ${selectedAssociazione ? 'w-80 flex-shrink-0' : 'w-full'}`}>
          <h3 className="text-lg font-medium text-white mb-4">Associazioni Registrate</h3>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome, sigla, città..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna associazione trovata</p>
              <p className="text-sm">Clicca "Nuova Associazione" per iniziare</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map(assoc => (
                <div
                  key={assoc.id}
                  onClick={() => { setSelectedAssociazione(assoc); setActiveTab('anagrafica'); }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedAssociazione?.id === assoc.id
                      ? 'bg-cyan-600/20 border border-cyan-500'
                      : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{assoc.nome}</div>
                      <div className="text-sm text-gray-400">
                        {assoc.sigla && <span className="text-cyan-400 mr-2">{assoc.sigla}</span>}
                        {assoc.citta && `${assoc.citta} `}
                        {assoc.provincia && `(${assoc.provincia})`}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          assoc.stato === 'attivo' ? 'bg-emerald-500/20 text-emerald-400' :
                          assoc.stato === 'sospeso' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {assoc.stato}
                        </span>
                        <span className="text-xs text-gray-500">
                          {TIPI_ASSOCIAZIONE.find(t => t.value === assoc.tipo)?.label || assoc.tipo}
                        </span>
                        {assoc.num_tesserati > 0 && (
                          <span className="text-xs text-cyan-400">
                            <Users className="w-3 h-3 inline mr-1" />
                            {assoc.num_tesserati}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAccediComeAssociazione(assoc); }}
                        className="p-1 text-yellow-400 hover:text-yellow-300"
                        title="Accedi come Admin Associazione"
                        disabled={impersonating}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(assoc); }}
                        className="p-1 text-gray-400 hover:text-cyan-400"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(assoc.id); }}
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

        {/* Dettaglio */}
        {selectedAssociazione && (
          <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {selectedAssociazione.nome}
                {selectedAssociazione.sigla && (
                  <span className="text-sm text-cyan-400 ml-2">({selectedAssociazione.sigla})</span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAccediComeAssociazione(selectedAssociazione)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded-lg text-sm font-medium transition-colors"
                  disabled={impersonating}
                >
                  <Eye className="w-4 h-4" />
                  {impersonating ? 'Caricamento...' : 'Accedi come'}
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span className={`text-xs px-2 py-1 rounded ${
                  selectedAssociazione.stato === 'attivo' ? 'bg-emerald-600/30 text-emerald-300' :
                  selectedAssociazione.stato === 'sospeso' ? 'bg-yellow-600/30 text-yellow-300' :
                  'bg-red-600/30 text-red-300'
                }`}>
                  {selectedAssociazione.stato?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-700 mb-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('anagrafica')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'anagrafica' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Anagrafica
              </button>
              <button
                onClick={() => setActiveTab('contatti')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'contatti' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Phone className="w-4 h-4" />
                Contatti & Referenti
              </button>
              <button
                onClick={() => setActiveTab('fatturazione')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'fatturazione' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Fatturazione
              </button>
              <button
                onClick={() => setActiveTab('permessi')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'permessi' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                Permessi
              </button>
            </div>

            {/* ===== TAB ANAGRAFICA ===== */}
            {activeTab === 'anagrafica' && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  {selectedAssociazione.indirizzo && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {selectedAssociazione.indirizzo}
                    </div>
                  )}
                  {selectedAssociazione.citta && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {selectedAssociazione.citta} {selectedAssociazione.provincia && `(${selectedAssociazione.provincia})`} - {selectedAssociazione.regione}
                    </div>
                  )}
                  {selectedAssociazione.telefono && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {selectedAssociazione.telefono}
                    </div>
                  )}
                  {selectedAssociazione.email && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {selectedAssociazione.email}
                    </div>
                  )}
                  {selectedAssociazione.sito_web && (
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Globe className="w-4 h-4" />
                      <a href={selectedAssociazione.sito_web} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                        {selectedAssociazione.sito_web}
                      </a>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 p-3 bg-gray-700/30 rounded-lg text-xs">
                  {selectedAssociazione.pec && (
                    <div className="col-span-2">
                      <span className="text-gray-500">PEC:</span>
                      <span className="text-purple-300 ml-1">{selectedAssociazione.pec}</span>
                    </div>
                  )}
                  {selectedAssociazione.codice_fiscale && (
                    <div>
                      <span className="text-gray-500">C.F.:</span>
                      <span className="text-gray-300 ml-1">{selectedAssociazione.codice_fiscale}</span>
                    </div>
                  )}
                  {selectedAssociazione.partita_iva && (
                    <div>
                      <span className="text-gray-500">P.IVA:</span>
                      <span className="text-gray-300 ml-1">{selectedAssociazione.partita_iva}</span>
                    </div>
                  )}
                  {selectedAssociazione.cap && (
                    <div>
                      <span className="text-gray-500">CAP:</span>
                      <span className="text-gray-300 ml-1">{selectedAssociazione.cap}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Tipo:</span>
                    <span className="text-cyan-300 ml-1">{TIPI_ASSOCIAZIONE.find(t => t.value === selectedAssociazione.tipo)?.label || selectedAssociazione.tipo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tesserati:</span>
                    <span className="text-emerald-300 ml-1">{selectedAssociazione.num_tesserati || 0}</span>
                  </div>
                  {selectedAssociazione.data_iscrizione && (
                    <div>
                      <span className="text-gray-500">Iscrizione:</span>
                      <span className="text-gray-300 ml-1">{new Date(selectedAssociazione.data_iscrizione).toLocaleDateString('it-IT')}</span>
                    </div>
                  )}
                </div>

                {selectedAssociazione.note && (
                  <div className="p-3 bg-gray-700/30 rounded-lg text-sm text-gray-300">
                    <span className="text-gray-500 font-medium">Note: </span>
                    {selectedAssociazione.note}
                  </div>
                )}
              </>
            )}

            {/* ===== TAB CONTATTI & REFERENTI ===== */}
            {activeTab === 'contatti' && (
              <div className="space-y-4">
                {/* Presidente */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Presidente
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Nome:</span>
                      <span className="text-white ml-2">
                        {selectedAssociazione.presidente_nome || '-'} {selectedAssociazione.presidente_cognome || ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="text-cyan-400 ml-2">{selectedAssociazione.presidente_email || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Referente */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Referente Operativo
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Nome:</span>
                      <span className="text-white ml-2">
                        {selectedAssociazione.referente_nome || '-'} {selectedAssociazione.referente_cognome || ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="text-cyan-400 ml-2">{selectedAssociazione.referente_email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Telefono:</span>
                      <span className="text-white ml-2">{selectedAssociazione.referente_telefono || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Contatti generali */}
                <div className="p-4 bg-gray-700/30 rounded-lg">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contatti Generali
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="text-white ml-2">{selectedAssociazione.email || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">PEC:</span>
                      <span className="text-purple-300 ml-2">{selectedAssociazione.pec || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Telefono:</span>
                      <span className="text-white ml-2">{selectedAssociazione.telefono || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sito Web:</span>
                      {selectedAssociazione.sito_web ? (
                        <a href={selectedAssociazione.sito_web} target="_blank" rel="noopener noreferrer" className="text-cyan-400 ml-2 hover:underline">
                          {selectedAssociazione.sito_web}
                        </a>
                      ) : (
                        <span className="text-white ml-2">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== TAB FATTURAZIONE ===== */}
            {activeTab === 'fatturazione' && (
              <div className="space-y-4">
                {loadingFatturazione ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : (
                  <>
                    {/* Contratti */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          Contratti ({contratti.length})
                        </h4>
                        <button
                          onClick={() => setShowContrattoForm(true)}
                          className="flex items-center gap-1 px-3 py-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 rounded text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          Nuovo
                        </button>
                      </div>

                      {contratti.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">Nessun contratto</div>
                      ) : (
                        <div className="space-y-2">
                          {contratti.map(c => (
                            <div key={c.id} className="p-3 bg-gray-700/30 rounded-lg flex items-center justify-between">
                              <div>
                                <div className="text-sm text-white">{c.descrizione || c.tipo_contratto}</div>
                                <div className="text-xs text-gray-400">
                                  {c.data_inizio && new Date(c.data_inizio).toLocaleDateString('it-IT')} - {c.data_fine && new Date(c.data_fine).toLocaleDateString('it-IT')}
                                  {c.percentuale_pratica > 0 && <span className="text-amber-400 ml-2">Fee: {c.percentuale_pratica}%</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-emerald-400">
                                  {Number(c.importo_annuale).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  c.stato === 'attivo' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {c.stato}
                                </span>
                                <button onClick={() => handleDeleteContratto(c.id)} className="p-1 text-gray-400 hover:text-red-400">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fatture */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-amber-400" />
                          Fatture ({fatture.length})
                        </h4>
                        <button
                          onClick={() => setShowFatturaForm(true)}
                          className="flex items-center gap-1 px-3 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded text-xs"
                        >
                          <Plus className="w-3 h-3" />
                          Nuova
                        </button>
                      </div>

                      {fatture.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">Nessuna fattura</div>
                      ) : (
                        <div className="space-y-2">
                          {fatture.map(f => (
                            <div key={f.id} className="p-3 bg-gray-700/30 rounded-lg flex items-center justify-between">
                              <div>
                                <div className="text-sm text-white">
                                  {f.numero_fattura || `#${f.id}`}
                                  {f.contratto_descrizione && <span className="text-gray-400 ml-2 text-xs">({f.contratto_descrizione})</span>}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Emessa: {f.data_emissione && new Date(f.data_emissione).toLocaleDateString('it-IT')}
                                  {f.data_scadenza && ` - Scad: ${new Date(f.data_scadenza).toLocaleDateString('it-IT')}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  {Number(f.totale).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                                </span>
                                <select
                                  value={f.stato}
                                  onChange={(e) => handleUpdateFatturaStato(f.id, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded border-0 ${
                                    f.stato === 'pagata' ? 'bg-emerald-500/20 text-emerald-400' :
                                    f.stato === 'scaduta' ? 'bg-red-500/20 text-red-400' :
                                    'bg-amber-500/20 text-amber-400'
                                  }`}
                                >
                                  <option value="emessa">Emessa</option>
                                  <option value="pagata">Pagata</option>
                                  <option value="scaduta">Scaduta</option>
                                </select>
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

            {/* ===== TAB PERMESSI ===== */}
            {activeTab === 'permessi' && (
              <div className="space-y-4">
                {loadingPermessi ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-white">
                        Utenti Assegnati ({utenti.filter(u => u.attivo).length})
                      </h4>
                      <button
                        onClick={() => setShowUtenteForm(true)}
                        className="flex items-center gap-1 px-3 py-1 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 rounded text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        Assegna Utente
                      </button>
                    </div>

                    {/* Ruoli disponibili */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {RUOLI_ASSOCIAZIONE.map(r => (
                        <div key={r.value} className="p-2 bg-gray-700/30 rounded text-xs">
                          <div className="text-cyan-400 font-medium">{r.label}</div>
                          <div className="text-gray-500">{r.description}</div>
                          <div className="text-white font-bold mt-1">
                            {utenti.filter(u => u.ruolo === r.value && u.attivo).length}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Lista utenti */}
                    {utenti.filter(u => u.attivo).length === 0 ? (
                      <div className="text-center py-4 text-gray-500 text-sm">Nessun utente assegnato</div>
                    ) : (
                      <div className="space-y-2">
                        {utenti.filter(u => u.attivo).map(u => (
                          <div key={u.id} className="p-3 bg-gray-700/30 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="text-sm text-white">{u.user_name || u.email || `User #${u.user_id}`}</div>
                              <div className="text-xs text-gray-400">{u.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={u.ruolo}
                                onChange={(e) => handleUpdateRuolo(u.id, e.target.value)}
                                className="text-xs bg-gray-600 text-white px-2 py-1 rounded border-0"
                              >
                                {RUOLI_ASSOCIAZIONE.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              <button onClick={() => handleRimuoviUtente(u.id)} className="p-1 text-gray-400 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== MODAL: FORM ASSOCIAZIONE ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editing ? 'Modifica Associazione' : 'Nuova Associazione'}
              </h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Nome Associazione *</label>
                <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" placeholder="es. Confcommercio Grosseto" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Sigla</label>
                <input value={form.sigla} onChange={e => setForm({...form, sigla: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" placeholder="es. CONFCOM-GR" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                  {TIPI_ASSOCIAZIONE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Città</label>
                <input value={form.citta} onChange={e => setForm({...form, citta: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Provincia</label>
                <input value={form.provincia} onChange={e => setForm({...form, provincia: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" placeholder="es. GR" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Regione</label>
                <input value={form.regione} onChange={e => setForm({...form, regione: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">CAP</label>
                <input value={form.cap} onChange={e => setForm({...form, cap: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Indirizzo</label>
                <input value={form.indirizzo} onChange={e => setForm({...form, indirizzo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Codice Fiscale</label>
                <input value={form.codice_fiscale} onChange={e => setForm({...form, codice_fiscale: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Partita IVA</label>
                <input value={form.partita_iva} onChange={e => setForm({...form, partita_iva: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Email</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">PEC</label>
                <input value={form.pec} onChange={e => setForm({...form, pec: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Telefono</label>
                <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Sito Web</label>
                <input value={form.sito_web} onChange={e => setForm({...form, sito_web: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>

              {/* Presidente */}
              <div className="col-span-2 border-t border-gray-700 pt-3 mt-2">
                <span className="text-xs text-amber-400 font-semibold">PRESIDENTE</span>
              </div>
              <div>
                <label className="text-xs text-gray-400">Nome</label>
                <input value={form.presidente_nome} onChange={e => setForm({...form, presidente_nome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Cognome</label>
                <input value={form.presidente_cognome} onChange={e => setForm({...form, presidente_cognome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Email Presidente</label>
                <input value={form.presidente_email} onChange={e => setForm({...form, presidente_email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>

              {/* Referente */}
              <div className="col-span-2 border-t border-gray-700 pt-3 mt-2">
                <span className="text-xs text-emerald-400 font-semibold">REFERENTE OPERATIVO</span>
              </div>
              <div>
                <label className="text-xs text-gray-400">Nome</label>
                <input value={form.referente_nome} onChange={e => setForm({...form, referente_nome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Cognome</label>
                <input value={form.referente_cognome} onChange={e => setForm({...form, referente_cognome: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Email Referente</label>
                <input value={form.referente_email} onChange={e => setForm({...form, referente_email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Telefono Referente</label>
                <input value={form.referente_telefono} onChange={e => setForm({...form, referente_telefono: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>

              {/* Extra */}
              <div className="col-span-2 border-t border-gray-700 pt-3 mt-2">
                <span className="text-xs text-gray-400 font-semibold">ALTRO</span>
              </div>
              <div>
                <label className="text-xs text-gray-400">N. Tesserati</label>
                <input type="number" value={form.num_tesserati} onChange={e => setForm({...form, num_tesserati: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Stato</label>
                <select value={form.stato} onChange={e => setForm({...form, stato: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                  <option value="attivo">Attivo</option>
                  <option value="sospeso">Sospeso</option>
                  <option value="cessato">Cessato</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400">Note</label>
                <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" rows={2} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">
                Annulla
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">
                <Save className="w-4 h-4" />
                {editing ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: FORM CONTRATTO ===== */}
      {showContrattoForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nuovo Contratto</h3>
              <button onClick={() => setShowContrattoForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Tipo Contratto</label>
                <select value={contrattoForm.tipo_contratto} onChange={e => setContrattoForm({...contrattoForm, tipo_contratto: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                  <option value="servizio_miohub">Servizio MioHub</option>
                  <option value="scia_pratiche">SCIA & Pratiche</option>
                  <option value="consulenza">Consulenza</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Descrizione</label>
                <input value={contrattoForm.descrizione} onChange={e => setContrattoForm({...contrattoForm, descrizione: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Data Inizio</label>
                  <input type="date" value={contrattoForm.data_inizio} onChange={e => setContrattoForm({...contrattoForm, data_inizio: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Data Fine</label>
                  <input type="date" value={contrattoForm.data_fine} onChange={e => setContrattoForm({...contrattoForm, data_fine: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Importo Annuale (EUR)</label>
                  <input type="number" value={contrattoForm.importo_annuale} onChange={e => setContrattoForm({...contrattoForm, importo_annuale: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">% su Pratica</label>
                  <input type="number" step="0.5" value={contrattoForm.percentuale_pratica} onChange={e => setContrattoForm({...contrattoForm, percentuale_pratica: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" placeholder="es. 5" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">Note</label>
                <textarea value={contrattoForm.note} onChange={e => setContrattoForm({...contrattoForm, note: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowContrattoForm(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Annulla</button>
              <button onClick={handleCreateContratto} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">Crea Contratto</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: FORM FATTURA ===== */}
      {showFatturaForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nuova Fattura</h3>
              <button onClick={() => setShowFatturaForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Contratto</label>
                <select value={fatturaForm.contratto_id} onChange={e => setFatturaForm({...fatturaForm, contratto_id: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                  <option value="">-- Nessun contratto --</option>
                  {contratti.map(c => <option key={c.id} value={c.id}>{c.descrizione || c.tipo_contratto}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Numero Fattura</label>
                <input value={fatturaForm.numero_fattura} onChange={e => setFatturaForm({...fatturaForm, numero_fattura: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" placeholder="es. FT-2026-001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Data Emissione</label>
                  <input type="date" value={fatturaForm.data_emissione} onChange={e => setFatturaForm({...fatturaForm, data_emissione: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Data Scadenza</label>
                  <input type="date" value={fatturaForm.data_scadenza} onChange={e => setFatturaForm({...fatturaForm, data_scadenza: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Importo (EUR)</label>
                  <input type="number" value={fatturaForm.importo} onChange={e => setFatturaForm({...fatturaForm, importo: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">IVA %</label>
                  <input type="number" value={fatturaForm.iva} onChange={e => setFatturaForm({...fatturaForm, iva: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowFatturaForm(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Annulla</button>
              <button onClick={handleCreateFattura} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm">Crea Fattura</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: FORM UTENTE ===== */}
      {showUtenteForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Assegna Utente</h3>
              <button onClick={() => setShowUtenteForm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">Email Utente</label>
                <input value={utenteForm.email} onChange={e => setUtenteForm({...utenteForm, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm" placeholder="email@esempio.it" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Ruolo</label>
                <select value={utenteForm.ruolo} onChange={e => setUtenteForm({...utenteForm, ruolo: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm">
                  {RUOLI_ASSOCIAZIONE.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowUtenteForm(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Annulla</button>
              <button onClick={handleAssegnaUtente} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm">Assegna</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
