import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Phone, Mail, Globe, MapPin, Users, ChevronDown, ChevronUp, Save, X, Search } from 'lucide-react';

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
];

interface Comune {
  id: number;
  nome: string;
  provincia: string;
  regione: string;
  cap: string;
  codice_istat: string;
  codice_catastale: string;
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

  // Form state per comune
  const [comuneForm, setComuneForm] = useState({
    nome: '', provincia: '', regione: '', cap: '', codice_istat: '',
    codice_catastale: '', pec: '', email: '', telefono: '', sito_web: '',
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

  useEffect(() => {
    fetchComuni();
  }, []);

  useEffect(() => {
    if (selectedComune) {
      fetchSettori(selectedComune.id);
    }
  }, [selectedComune]);

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
          codice_catastale: '', pec: '', email: '', telefono: '', sito_web: '',
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
          <div className="text-2xl font-bold text-orange-400">
            {comuni.length > 0 ? (totalSettori / comuni.length).toFixed(1) : '0'}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Gestione Comuni</h2>
        </div>
        <button
          onClick={() => {
            setEditingComune(null);
            setComuneForm({
              nome: '', provincia: '', regione: '', cap: '', codice_istat: '',
              codice_catastale: '', pec: '', email: '', telefono: '', sito_web: '',
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista Comuni */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-4">Comuni Registrati</h3>
          
          {/* Barra di ricerca */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome, provincia, regione o CAP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {filteredComuni.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              {searchQuery ? (
                <>
                  <p>Nessun comune trovato per "{searchQuery}"</p>
                  <p className="text-sm">Prova con un altro termine di ricerca</p>
                </>
              ) : (
                <>
                  <p>Nessun comune registrato</p>
                  <p className="text-sm">Clicca "Nuovo Comune" per iniziare</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredComuni.map(comune => (
                <div
                  key={comune.id}
                  onClick={() => setSelectedComune(comune)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedComune?.id === comune.id
                      ? 'bg-cyan-900/30 border-cyan-500'
                      : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{comune.nome}</h4>
                      <p className="text-sm text-gray-400">
                        {comune.provincia && `${comune.provincia} - `}{comune.regione}
                      </p>
                      {comune.num_settori !== undefined && (
                        <p className="text-xs text-cyan-400 mt-1">
                          <Users className="w-3 h-3 inline mr-1" />
                          {comune.num_settori} settori configurati
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditComune(comune); }}
                        className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteComune(comune.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
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

        {/* Dettaglio Comune e Settori */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          {selectedComune ? (
            <>
              {/* Info Comune */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-3">{selectedComune.nome}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedComune.indirizzo && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {selectedComune.indirizzo}
                    </div>
                  )}
                  {selectedComune.telefono && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-4 h-4 text-gray-500" />
                      {selectedComune.telefono}
                    </div>
                  )}
                  {selectedComune.email && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {selectedComune.email}
                    </div>
                  )}
                  {selectedComune.sito_web && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <a href={selectedComune.sito_web} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                        {selectedComune.sito_web}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Settori */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-white">Settori e Referenti</h4>
                  <button
                    onClick={() => {
                      setEditingSettore(null);
                      setSettoreForm({
                        tipo_settore: '', nome_settore: '', responsabile_nome: '', responsabile_cognome: '',
                        email: '', pec: '', telefono: '', indirizzo: '', orari_apertura: '', note: ''
                      });
                      setShowSettoreForm(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Aggiungi Settore
                  </button>
                </div>

                {settori.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nessun settore configurato</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {settori.map(settore => (
                      <div key={settore.id} className="bg-gray-700/30 rounded-lg border border-gray-600">
                        <div
                          onClick={() => toggleSettoreExpand(settore.id)}
                          className="flex items-center justify-between p-3 cursor-pointer"
                        >
                          <div>
                            <span className="text-white font-medium">{getTipoSettoreLabel(settore.tipo_settore)}</span>
                            {settore.responsabile_nome && (
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
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Seleziona un comune per vedere i dettagli</p>
            </div>
          )}
        </div>
      </div>

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
                <label className="block text-sm text-gray-400 mb-1">Telefono</label>
                <input
                  type="text"
                  value={settoreForm.telefono}
                  onChange={e => setSettoreForm({...settoreForm, telefono: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. 051 123456"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">PEC</label>
                <input
                  type="email"
                  value={settoreForm.pec}
                  onChange={e => setSettoreForm({...settoreForm, pec: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. suap@pec.comune.bologna.it"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Orari Apertura</label>
                <input
                  type="text"
                  value={settoreForm.orari_apertura}
                  onChange={e => setSettoreForm({...settoreForm, orari_apertura: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="es. Lun-Ven 9:00-13:00, Mar-Gio 15:00-17:00"
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
                {editingSettore ? 'Salva Modifiche' : 'Aggiungi Settore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
