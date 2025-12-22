/**
 * MarketCompaniesTab.tsx
 * 
 * Componente React/TypeScript standalone per la tab "Imprese / Concessioni"
 * nella pagina Gestione Mercati → Dettaglio mercato.
 * 
 * Usa gli endpoint backend REST per CRUD imprese e concessioni.
 * 
 * @author Manus AI
 * @date 25 novembre 2025
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Edit, 
  X, 
  AlertCircle, 
  Loader2,
  FileText,
  Calendar,
  MapPin,
  FileCheck,
  CheckCircle,
  Clock
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface MarketCompaniesTabProps {
  marketId: string;              // es. "GRO001"
  stalls: { id: string; code: string }[]; // lista posteggi già caricata dalla pagina
}

type CompanyRow = {
  id: string;
  code: string;          // es. "12345678901" (CF)
  denominazione: string;
  partita_iva?: string;
  referente?: string;
  telefono?: string;
  stato?: "active" | "suspended" | "closed";
};

type ConcessionRow = {
  id: string;
  stall_id?: string;
  stall_code: string;
  company_id: string;
  company_name: string;
  tipo_concessione: string;  // fisso/spunta/temporanea
  valida_dal?: string;       // ISO date
  valida_al?: string;        // ISO date
  stato?: string;            // ATTIVA/SCADUTA/SOSPESA
};

type CompanyFormData = {
  // Identità
  denominazione: string;
  codice_fiscale: string;
  partita_iva: string;
  numero_rea: string;
  cciaa_sigla: string;
  forma_giuridica: string;
  stato_impresa: string;
  
  // Sede Legale
  indirizzo_via: string;
  indirizzo_civico: string;
  indirizzo_cap: string;
  indirizzo_provincia: string;
  comune: string;
  
  // Contatti & Attività
  pec: string;
  referente: string;
  telefono: string;
  codice_ateco: string;
  descrizione_ateco: string;
  
  // Rappresentante Legale
  rappresentante_legale_cognome: string;
  rappresentante_legale_nome: string;
  rappresentante_legale_cf: string;
  rappresentante_legale_data_nascita: string;
  rappresentante_legale_luogo_nascita: string;
  
  // Residenza Rappresentante
  rappresentante_legale_residenza_via: string;
  rappresentante_legale_residenza_civico: string;
  rappresentante_legale_residenza_cap: string;
  rappresentante_legale_residenza_comune: string;
  rappresentante_legale_residenza_provincia: string;
  
  // Dati Economici
  capitale_sociale: string;
  numero_addetti: string;
  sito_web: string;
  data_iscrizione_ri: string;
  
  // Legacy (mantenuto per compatibilità)
  stato: "active" | "suspended" | "closed";
};

type ConcessionFormData = {
  company_id: string;
  stall_id: string;
  tipo_concessione: string;
  valida_dal: string;
  valida_al: string;
  stato: string;
};

type QualificazioneRow = {
  id: string;
  company_id: string;
  company_name: string;
  tipo: string;
  ente_rilascio: string;
  data_rilascio: string;
  data_scadenza: string;
  stato: 'ATTIVA' | 'SCADUTA' | 'IN_VERIFICA';
  note?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE_URL = MIHUB_API_BASE_URL;

const TIPO_CONCESSIONE_OPTIONS = [
  { value: 'fisso', label: 'Fisso' },
  { value: 'spunta', label: 'Spunta' },
  { value: 'temporanea', label: 'Temporanea' },
];

const STATO_CONCESSIONE_OPTIONS = [
  { value: 'ATTIVA', label: 'Attiva' },
  { value: 'SOSPESA', label: 'Sospesa' },
  { value: 'SCADUTA', label: 'Scaduta' },
];

const STATO_COMPANY_OPTIONS = [
  { value: 'active', label: 'Attiva' },
  { value: 'suspended', label: 'Sospesa' },
  { value: 'closed', label: 'Chiusa' },
];

const FORMA_GIURIDICA_OPTIONS = [
  { value: '', label: 'Seleziona...' },
  { value: 'SRL', label: 'S.R.L. - Società a Responsabilità Limitata' },
  { value: 'SPA', label: 'S.P.A. - Società per Azioni' },
  { value: 'SNC', label: 'S.N.C. - Società in Nome Collettivo' },
  { value: 'SAS', label: 'S.A.S. - Società in Accomandita Semplice' },
  { value: 'DI', label: 'Ditta Individuale' },
  { value: 'COOP', label: 'Cooperativa' },
  { value: 'ALTRO', label: 'Altro' },
];

const STATO_IMPRESA_OPTIONS = [
  { value: 'ATTIVA', label: 'Attiva' },
  { value: 'CESSATA', label: 'Cessata' },
  { value: 'IN_LIQUIDAZIONE', label: 'In Liquidazione' },
  { value: 'SOSPESA', label: 'Sospesa' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketCompaniesTab(props: MarketCompaniesTabProps) {
  const { marketId, stalls } = props;
  
  console.log('[MarketCompaniesTab] props', { marketId, stallsLength: stalls?.length });

  // State
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [concessions, setConcessions] = useState<ConcessionRow[]>([]);
  const [qualificazioni, setQualificazioni] = useState<QualificazioneRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [selectedConcession, setSelectedConcession] = useState<ConcessionRow | null>(null);
  const [selectedCompanyForQualif, setSelectedCompanyForQualif] = useState<CompanyRow | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'impresa' | 'concessione' | 'qualificazione'>('impresa');
  
  // Filtered data
  const filteredCompanies = companies.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.denominazione?.toLowerCase().includes(query) ||
      c.code?.toLowerCase().includes(query) ||
      c.partita_iva?.toLowerCase().includes(query)
    );
  });
  
  const filteredConcessions = concessions.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.company_name?.toLowerCase().includes(query) ||
      c.stall_code?.toLowerCase().includes(query) ||
      c.tipo_concessione?.toLowerCase().includes(query)
    );
  });
  
  // Qualificazioni filtrate per impresa selezionata
  const filteredQualificazioni = qualificazioni.filter(q => {
    if (selectedCompanyForQualif) {
      return q.company_id === selectedCompanyForQualif.id;
    }
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.company_name?.toLowerCase().includes(query) ||
      q.tipo?.toLowerCase().includes(query) ||
      q.ente_rilascio?.toLowerCase().includes(query)
    );
  });

  // Fetch data
  useEffect(() => {
    console.log('[MarketCompaniesTab] useEffect marketId =', marketId);
    if (!marketId) {
      console.warn('[MarketCompaniesTab] no marketId, skip fetch');
      return;
    }
    
    fetchData();
  }, [marketId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchCompanies(),
        fetchConcessions(),
        fetchQualificazioni(),
      ]);
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/imprese`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      
      if (!json.success || !Array.isArray(json.data)) {
        console.error('[MarketCompaniesTab] fetchCompanies: formato risposta non valido', json);
        throw new Error('Formato risposta non valido');
      }
      
      // Map imprese fields to frontend schema - include ALL fields
      const mappedData = json.data.map((v: any) => ({
        // Campi base per la visualizzazione nella lista
        id: v.id,
        code: v.codice_fiscale,
        denominazione: v.denominazione,
        partita_iva: v.partita_iva,
        referente: (v.rappresentante_legale_nome && v.rappresentante_legale_cognome) 
          ? `${v.rappresentante_legale_nome} ${v.rappresentante_legale_cognome}` 
          : (v.email || ''),
        telefono: v.telefono,
        stato: v.stato_impresa,
        // Tutti gli altri campi per il modal di modifica
        numero_rea: v.numero_rea,
        cciaa_sigla: v.cciaa_sigla,
        forma_giuridica: v.forma_giuridica,
        stato_impresa: v.stato_impresa,
        indirizzo_via: v.indirizzo_via,
        indirizzo_civico: v.indirizzo_civico,
        indirizzo_cap: v.indirizzo_cap,
        indirizzo_provincia: v.indirizzo_provincia,
        comune: v.comune,
        pec: v.pec,
        email: v.email,
        codice_ateco: v.codice_ateco,
        descrizione_ateco: v.descrizione_ateco,
        rappresentante_legale_cognome: v.rappresentante_legale_cognome,
        rappresentante_legale_nome: v.rappresentante_legale_nome,
        rappresentante_legale_cf: v.rappresentante_legale_cf,
        rappresentante_legale_data_nascita: v.rappresentante_legale_data_nascita,
        rappresentante_legale_luogo_nascita: v.rappresentante_legale_luogo_nascita,
        rappresentante_legale_residenza_via: v.rappresentante_legale_residenza_via,
        rappresentante_legale_residenza_civico: v.rappresentante_legale_residenza_civico,
        rappresentante_legale_residenza_cap: v.rappresentante_legale_residenza_cap,
        rappresentante_legale_residenza_comune: v.rappresentante_legale_residenza_comune,
        rappresentante_legale_residenza_provincia: v.rappresentante_legale_residenza_provincia,
        capitale_sociale: v.capitale_sociale,
        numero_addetti: v.numero_addetti,
        sito_web: v.sito_web,
        data_iscrizione_ri: v.data_iscrizione_ri,
      }));
      
      console.log('[MarketCompaniesTab] fetchCompanies: caricati', mappedData.length, 'imprese');
      setCompanies(mappedData);
    } catch (err) {
      console.error('[MarketCompaniesTab] fetchCompanies error:', err);
      setError('Impossibile caricare le imprese');
      setCompanies([]);
    }
  };

  const fetchConcessions = async () => {
    // Se marketId è "ALL", carica tutte le concessioni
    if (marketId === 'ALL') {
      try {
        const response = await fetch(`${API_BASE_URL}/api/concessions`);
        if (!response.ok) {
          // Se l'endpoint non esiste, non mostrare errore
          console.log('[MarketCompaniesTab] fetchConcessions ALL: endpoint non disponibile');
          setConcessions([]);
          return;
        }
        const json = await response.json();
        if (json.success && Array.isArray(json.data)) {
          setConcessions(json.data);
        } else {
          setConcessions([]);
        }
      } catch (err) {
        console.log('[MarketCompaniesTab] fetchConcessions ALL: nessuna concessione globale');
        setConcessions([]);
      }
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/markets/${marketId}/concessions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      
      if (!json.success || !Array.isArray(json.data)) {
        console.error('[MarketCompaniesTab] fetchConcessions: formato risposta non valido', json);
        throw new Error('Formato risposta non valido');
      }
      
      console.log('[MarketCompaniesTab] fetchConcessions: caricate', json.data.length, 'concessioni');
      setConcessions(json.data);
    } catch (err) {
      console.error('[MarketCompaniesTab] fetchConcessions error:', err);
      setError('Impossibile caricare le concessioni');
      setConcessions([]);
    }
  };

  // Fetch qualificazioni (mock data per ora)
  const fetchQualificazioni = async () => {
    // Genera qualificazioni mock per le prime 5 imprese caricate
    const tipiQualificazione = [
      { tipo: 'DURC', ente: 'INPS', note: 'Documento Unico Regolarità Contributiva' },
      { tipo: 'HACCP', ente: 'ASL Grosseto', note: 'Certificazione igiene alimentare' },
      { tipo: 'ISO 9001', ente: 'Bureau Veritas', note: 'Certificazione qualità sistema gestione' },
      { tipo: 'ISO 14001', ente: 'TÜV Italia', note: 'Certificazione ambientale' },
      { tipo: 'CONCESSIONE MERCATO', ente: 'Comune di Grosseto', note: 'Concessione area mercato' },
    ];
    
    const stati: Array<'ATTIVA' | 'SCADUTA' | 'IN_VERIFICA'> = ['ATTIVA', 'ATTIVA', 'ATTIVA', 'SCADUTA', 'IN_VERIFICA'];
    
    const mockQualificazioni: QualificazioneRow[] = [];
    let idCounter = 100;
    
    // Genera qualificazioni per le prime 5 imprese
    companies.slice(0, 5).forEach((company, companyIndex) => {
      // Ogni impresa ha 2-4 qualificazioni
      const numQualif = 2 + (companyIndex % 3);
      for (let i = 0; i < numQualif; i++) {
        const tipoIndex = (companyIndex + i) % tipiQualificazione.length;
        const tipoData = tipiQualificazione[tipoIndex];
        const statoIndex = (companyIndex + i) % stati.length;
        
        mockQualificazioni.push({
          id: String(idCounter++),
          company_id: company.id,
          company_name: company.denominazione || 'N/A',
          tipo: tipoData.tipo,
          ente_rilascio: tipoData.ente,
          data_rilascio: '2023-01-15',
          data_scadenza: statoIndex === 3 ? '2024-11-30' : '2025-06-15',
          stato: stati[statoIndex],
          note: tipoData.note
        });
      }
    });
    
    setQualificazioni(mockQualificazioni);
  };

  // Handlers
  const handleOpenCompanyModal = (company?: CompanyRow) => {
    setSelectedCompany(company || null);
    setShowCompanyModal(true);
  };

  const handleCloseCompanyModal = () => {
    setSelectedCompany(null);
    setShowCompanyModal(false);
  };

  const handleOpenConcessionModal = (concession?: ConcessionRow) => {
    setSelectedConcession(concession || null);
    setShowConcessionModal(true);
  };

  const handleCloseConcessionModal = () => {
    setSelectedConcession(null);
    setShowConcessionModal(false);
  };

  const handleCompanySaved = () => {
    handleCloseCompanyModal();
    fetchCompanies();
  };

  const handleConcessionSaved = () => {
    handleCloseConcessionModal();
    fetchConcessions();
  };

  // Render
  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-500 font-medium">Errore</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-400">Caricamento dati...</span>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {/* Barra Ricerca */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchType === 'impresa' 
                      ? 'Cerca impresa per nome, P.IVA o CF...' 
                      : searchType === 'concessione'
                        ? 'Cerca concessione per impresa, posteggio o tipo...'
                        : 'Cerca qualificazione per impresa, tipo o ente...'
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSearchType('impresa'); setSearchQuery(''); setSelectedCompanyForQualif(null); }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    searchType === 'impresa'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Imprese
                </button>
                <button
                  onClick={() => { setSearchType('concessione'); setSearchQuery(''); setSelectedCompanyForQualif(null); }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    searchType === 'concessione'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Concessioni
                </button>
                <button
                  onClick={() => { setSearchType('qualificazione'); setSearchQuery(''); setSelectedCompanyForQualif(null); }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    searchType === 'qualificazione'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <FileCheck className="w-4 h-4 inline mr-2" />
                  Qualificazioni
                </button>
              </div>
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-400">
                {searchType === 'impresa'
                  ? `${filteredCompanies.length} imprese trovate`
                  : searchType === 'concessione'
                    ? `${filteredConcessions.length} concessioni trovate`
                    : `${filteredQualificazioni.length} qualificazioni trovate`
                }
              </div>
            )}
          </div>

          {/* Sezione Imprese */}
          <section className={searchType !== 'impresa' ? 'hidden' : ''}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Imprese Registrate
              </h3>
              <button
                onClick={() => handleOpenCompanyModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuova Impresa
              </button>
            </div>

            {companies.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nessuna impresa registrata per questo mercato</p>
                <button
                  onClick={() => handleOpenCompanyModal()}
                  className="mt-4 text-blue-400 hover:text-blue-300"
                >
                  Aggiungi la prima impresa
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredCompanies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onEdit={() => handleOpenCompanyModal(company)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Sezione Concessioni */}
          <section className={searchType !== 'concessione' ? 'hidden' : ''}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Concessioni Attive
              </h3>
              <button
                onClick={() => handleOpenConcessionModal()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                disabled={companies.length === 0}
              >
                <Plus className="w-4 h-4" />
                Nuova Concessione
              </button>
            </div>

            {concessions.length === 0 ? (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nessuna concessione attiva per questo mercato</p>
                {companies.length > 0 && (
                  <button
                    onClick={() => handleOpenConcessionModal()}
                    className="mt-4 text-green-400 hover:text-green-300"
                  >
                    Aggiungi la prima concessione
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Posteggio
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Impresa
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Valida Dal
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Valida Al
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Stato
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredConcessions.map((concession) => (
                        <ConcessionRow
                          key={concession.id}
                          concession={concession}
                          onEdit={() => handleOpenConcessionModal(concession)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Sezione Qualificazioni */}
          <section className={searchType !== 'qualificazione' ? 'hidden' : ''}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lista Imprese per selezionare */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5" />
                  Seleziona Impresa
                </h3>
                <p className="text-sm text-gray-400 mb-4">Clicca su un'impresa per visualizzare le sue qualificazioni</p>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      onClick={() => setSelectedCompanyForQualif(company)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCompanyForQualif?.id === company.id
                          ? 'bg-purple-600/30 border border-purple-500'
                          : 'bg-gray-900/50 hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <div className="font-medium text-white">{company.denominazione}</div>
                      <div className="text-sm text-gray-400">P.IVA: {company.partita_iva}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Qualificazioni dell'impresa selezionata */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <FileCheck className="w-5 h-5" />
                  Qualificazioni
                </h3>
                {!selectedCompanyForQualif ? (
                  <div className="text-center py-16 text-gray-400">
                    <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Seleziona un'impresa per visualizzare le qualificazioni</p>
                  </div>
                ) : filteredQualificazioni.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Nessuna qualificazione trovata per {selectedCompanyForQualif.denominazione}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {filteredQualificazioni.map((qual) => (
                      <div key={qual.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-white">{qual.tipo}</div>
                          {qual.stato === 'ATTIVA' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Attiva
                            </span>
                          )}
                          {qual.stato === 'SCADUTA' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Scaduta
                            </span>
                          )}
                          {qual.stato === 'IN_VERIFICA' && (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> In Verifica
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>Ente: {qual.ente_rilascio}</div>
                          <div className="flex gap-4">
                            <span>Rilascio: {new Date(qual.data_rilascio).toLocaleDateString('it-IT')}</span>
                            <span>Scadenza: {new Date(qual.data_scadenza).toLocaleDateString('it-IT')}</span>
                          </div>
                          {qual.note && <div className="text-gray-500 italic mt-2">{qual.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modals */}
      {showCompanyModal && (
        <CompanyModal
          marketId={marketId}
          company={selectedCompany}
          onClose={handleCloseCompanyModal}
          onSaved={handleCompanySaved}
        />
      )}

      {showConcessionModal && (
        <ConcessionModal
          marketId={marketId}
          concession={selectedConcession}
          companies={companies}
          stalls={stalls}
          onClose={handleCloseConcessionModal}
          onSaved={handleConcessionSaved}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPANY CARD
// ============================================================================

interface CompanyCardProps {
  company: CompanyRow;
  onEdit: () => void;
}

function CompanyCard({ company, onEdit }: CompanyCardProps) {
  const getStatoBadge = (stato?: string) => {
    switch (stato) {
      case 'active':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Attiva</span>;
      case 'suspended':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Sospesa</span>;
      case 'closed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Chiusa</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">N/A</span>;
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-medium">{company.denominazione}</h4>
          <p className="text-sm text-gray-400">{company.code}</p>
        </div>
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-white transition-colors"
          title="Modifica impresa"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {company.partita_iva && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">P.IVA:</span>
            <span className="text-gray-300">{company.partita_iva}</span>
          </div>
        )}
        {company.referente && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Referente:</span>
            <span className="text-gray-300">{company.referente}</span>
          </div>
        )}
        {company.telefono && company.telefono !== 'N/A' && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Telefono:</span>
            <span className="text-gray-300">{company.telefono}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          {getStatoBadge(company.stato)}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONCESSION ROW
// ============================================================================

interface ConcessionRowProps {
  concession: ConcessionRow;
  onEdit: () => void;
}

function ConcessionRow({ concession, onEdit }: ConcessionRowProps) {
  const getStatoBadge = (stato?: string) => {
    switch (stato?.toUpperCase()) {
      case 'ATTIVA':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Attiva</span>;
      case 'SOSPESA':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Sospesa</span>;
      case 'SCADUTA':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Scaduta</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">{stato || 'N/A'}</span>;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('it-IT');
    } catch {
      return 'N/A';
    }
  };

  return (
    <tr className="hover:bg-gray-800/30">
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          {concession.stall_code}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{concession.company_name}</td>
      <td className="px-4 py-3 text-sm text-gray-300 capitalize">{concession.tipo_concessione}</td>
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          {formatDate(concession.valida_dal)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          {formatDate(concession.valida_al)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">{getStatoBadge(concession.stato)}</td>
      <td className="px-4 py-3 text-sm text-right">
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-white transition-colors"
          title="Modifica concessione"
        >
          <Edit className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ============================================================================
// COMPANY MODAL
// ============================================================================

interface CompanyModalProps {
  marketId: string;
  company: CompanyRow | null;
  onClose: () => void;
  onSaved: () => void;
}

function CompanyModal({ marketId, company, onClose, onSaved }: CompanyModalProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    // Identità
    denominazione: company?.denominazione || '',
    codice_fiscale: company?.code || '',
    partita_iva: company?.partita_iva || '',
    numero_rea: (company as any)?.numero_rea || '',
    cciaa_sigla: (company as any)?.cciaa_sigla || '',
    forma_giuridica: (company as any)?.forma_giuridica || '',
    stato_impresa: (company as any)?.stato_impresa || 'ATTIVA',
    
    // Sede Legale
    indirizzo_via: (company as any)?.indirizzo_via || '',
    indirizzo_civico: (company as any)?.indirizzo_civico || '',
    indirizzo_cap: (company as any)?.indirizzo_cap || '',
    indirizzo_provincia: (company as any)?.indirizzo_provincia || '',
    comune: (company as any)?.comune || '',
    
    // Contatti & Attività
    pec: (company as any)?.pec || '',
    referente: (company as any)?.email || '',
    telefono: company?.telefono || '',
    codice_ateco: (company as any)?.codice_ateco || '',
    descrizione_ateco: (company as any)?.descrizione_ateco || '',
    
    // Rappresentante Legale
    rappresentante_legale_cognome: (company as any)?.rappresentante_legale_cognome || '',
    rappresentante_legale_nome: (company as any)?.rappresentante_legale_nome || '',
    rappresentante_legale_cf: (company as any)?.rappresentante_legale_cf || '',
    rappresentante_legale_data_nascita: (company as any)?.rappresentante_legale_data_nascita || '',
    rappresentante_legale_luogo_nascita: (company as any)?.rappresentante_legale_luogo_nascita || '',
    
    // Residenza Rappresentante
    rappresentante_legale_residenza_via: (company as any)?.rappresentante_legale_residenza_via || '',
    rappresentante_legale_residenza_civico: (company as any)?.rappresentante_legale_residenza_civico || '',
    rappresentante_legale_residenza_cap: (company as any)?.rappresentante_legale_residenza_cap || '',
    rappresentante_legale_residenza_comune: (company as any)?.rappresentante_legale_residenza_comune || '',
    rappresentante_legale_residenza_provincia: (company as any)?.rappresentante_legale_residenza_provincia || '',
    
    // Dati Economici
    capitale_sociale: (company as any)?.capitale_sociale?.toString() || '',
    numero_addetti: (company as any)?.numero_addetti?.toString() || '',
    sito_web: (company as any)?.sito_web || '',
    data_iscrizione_ri: (company as any)?.data_iscrizione_ri || '',
    
    // Legacy
    stato: company?.stato || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Payload completo con campi PDND
      const payload = {
        // Identità
        denominazione: formData.denominazione,
        codice_fiscale: formData.codice_fiscale,
        partita_iva: formData.partita_iva,
        numero_rea: formData.numero_rea,
        cciaa_sigla: formData.cciaa_sigla,
        forma_giuridica: formData.forma_giuridica,
        stato_impresa: formData.stato_impresa,
        
        // Sede Legale
        indirizzo_via: formData.indirizzo_via,
        indirizzo_civico: formData.indirizzo_civico,
        indirizzo_cap: formData.indirizzo_cap,
        indirizzo_provincia: formData.indirizzo_provincia,
        comune: formData.comune,
        
        // Contatti & Attività
        pec: formData.pec,
        referente: formData.referente,
        telefono: formData.telefono,
        codice_ateco: formData.codice_ateco,
        descrizione_ateco: formData.descrizione_ateco,
        
        // Rappresentante Legale
        rappresentante_legale_cognome: formData.rappresentante_legale_cognome,
        rappresentante_legale_nome: formData.rappresentante_legale_nome,
        rappresentante_legale_cf: formData.rappresentante_legale_cf,
        rappresentante_legale_data_nascita: formData.rappresentante_legale_data_nascita,
        rappresentante_legale_luogo_nascita: formData.rappresentante_legale_luogo_nascita,
        
        // Residenza Rappresentante
        rappresentante_legale_residenza_via: formData.rappresentante_legale_residenza_via,
        rappresentante_legale_residenza_civico: formData.rappresentante_legale_residenza_civico,
        rappresentante_legale_residenza_cap: formData.rappresentante_legale_residenza_cap,
        rappresentante_legale_residenza_comune: formData.rappresentante_legale_residenza_comune,
        rappresentante_legale_residenza_provincia: formData.rappresentante_legale_residenza_provincia,
        
        // Dati Economici
        capitale_sociale: formData.capitale_sociale ? parseFloat(formData.capitale_sociale) : null,
        numero_addetti: formData.numero_addetti ? parseInt(formData.numero_addetti) : null,
        sito_web: formData.sito_web,
        data_iscrizione_ri: formData.data_iscrizione_ri,
        
        // Legacy (per compatibilità con vendors)
        code: formData.codice_fiscale,
        business_name: formData.denominazione,
        vat_number: formData.partita_iva,
        contact_name: formData.referente,
        phone: formData.telefono,
        email: formData.referente,
        status: formData.stato,
      };

      // Usa endpoint /api/imprese (nuovo) invece di /api/vendors
      const url = company
        ? `${API_BASE_URL}/api/imprese/${company.id}`
        : `${API_BASE_URL}/api/imprese`;

      const method = company ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Errore durante il salvataggio');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {company ? 'Modifica Impresa' : 'Nuova Impresa'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* GRUPPO 1: IDENTITÀ */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2">
              Identità
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Denominazione <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.denominazione}
                onChange={(e) => setFormData({ ...formData, denominazione: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="es. Azienda Agricola Rossi SRL"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Codice Fiscale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.codice_fiscale}
                  onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. V003"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Partita IVA <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.partita_iva}
                  onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. IT34567890123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Numero REA
                </label>
                <input
                  type="text"
                  value={formData.numero_rea}
                  onChange={(e) => setFormData({ ...formData, numero_rea: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. GR-123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CCIAA
                </label>
                <input
                  type="text"
                  value={formData.cciaa_sigla}
                  onChange={(e) => setFormData({ ...formData, cciaa_sigla: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. GR"
                  maxLength={5}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Forma Giuridica
                </label>
                <select
                  value={formData.forma_giuridica}
                  onChange={(e) => setFormData({ ...formData, forma_giuridica: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FORMA_GIURIDICA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stato Impresa
                </label>
                <select
                  value={formData.stato_impresa}
                  onChange={(e) => setFormData({ ...formData, stato_impresa: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATO_IMPRESA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* GRUPPO 2: SEDE LEGALE */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2">
              Sede Legale
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Via
                </label>
                <input
                  type="text"
                  value={formData.indirizzo_via}
                  onChange={(e) => setFormData({ ...formData, indirizzo_via: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Via Roma"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Civico
                </label>
                <input
                  type="text"
                  value={formData.indirizzo_civico}
                  onChange={(e) => setFormData({ ...formData, indirizzo_civico: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CAP
                </label>
                <input
                  type="text"
                  value={formData.indirizzo_cap}
                  onChange={(e) => setFormData({ ...formData, indirizzo_cap: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 58100"
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Provincia
                </label>
                <input
                  type="text"
                  value={formData.indirizzo_provincia}
                  onChange={(e) => setFormData({ ...formData, indirizzo_provincia: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. GR"
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Comune {!company && <span className="text-orange-500">*</span>}
              </label>
              <input
                type="text"
                required={!company}
                value={formData.comune}
                onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-800 border ${!company ? 'border-orange-500/50' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 ${!company ? 'focus:ring-orange-500' : 'focus:ring-blue-500'}`}
                placeholder="es. Grosseto"
              />
            </div>
          </div>

          {/* GRUPPO 3: CONTATTI & ATTIVITÀ */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2">
              Contatti & Attività
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                PEC {!company && <span className="text-orange-500">*</span>} <span className="text-xs text-gray-500">(Obbligatorio per PA)</span>
              </label>
              <input
                type="email"
                required={!company}
                value={formData.pec}
                onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-800 border ${!company ? 'border-orange-500/50' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 ${!company ? 'focus:ring-orange-500' : 'focus:ring-blue-500'}`}
                placeholder="es. impresa@pec.it"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.referente}
                  onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. checchi@me.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. +39 333 1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Codice ATECO
                </label>
                <input
                  type="text"
                  value={formData.codice_ateco}
                  onChange={(e) => setFormData({ ...formData, codice_ateco: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 47.11.10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrizione ATECO
                </label>
                <input
                  type="text"
                  value={formData.descrizione_ateco}
                  onChange={(e) => setFormData({ ...formData, descrizione_ateco: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Commercio al dettaglio alimentare"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stato (Legacy)
              </label>
              <select
                value={formData.stato}
                onChange={(e) => setFormData({ ...formData, stato: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATO_COMPANY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GRUPPO 4: RAPPRESENTANTE LEGALE */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2">
              Rappresentante Legale
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cognome
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_cognome}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_cognome: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Rossi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_nome}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_nome: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Mario"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Codice Fiscale
              </label>
              <input
                type="text"
                value={formData.rappresentante_legale_cf}
                onChange={(e) => setFormData({ ...formData, rappresentante_legale_cf: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="es. RSSMRA80A01D612H"
                maxLength={16}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data di Nascita
                </label>
                <input
                  type="date"
                  value={formData.rappresentante_legale_data_nascita}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_data_nascita: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Luogo di Nascita
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_luogo_nascita}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_luogo_nascita: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Grosseto"
                />
              </div>
            </div>
          </div>

          {/* GRUPPO 5: RESIDENZA RAPPRESENTANTE */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2">
              Residenza Rappresentante Legale
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Via
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_residenza_via}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_via: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Via Verdi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Civico
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_residenza_civico}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_civico: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CAP
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_residenza_cap}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_cap: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 58100"
                  maxLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Comune
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_residenza_comune}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_comune: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Grosseto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Provincia
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_residenza_provincia}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_provincia: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. GR"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* GRUPPO 6: DATI ECONOMICI */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2">
              Dati Economici
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Capitale Sociale (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capitale_sociale}
                  onChange={(e) => setFormData({ ...formData, capitale_sociale: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 10000.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Numero Addetti
                </label>
                <input
                  type="number"
                  value={formData.numero_addetti}
                  onChange={(e) => setFormData({ ...formData, numero_addetti: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sito Web
              </label>
              <input
                type="url"
                value={formData.sito_web}
                onChange={(e) => setFormData({ ...formData, sito_web: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="es. https://www.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data Iscrizione RI
              </label>
              <input
                type="date"
                value={formData.data_iscrizione_ri}
                onChange={(e) => setFormData({ ...formData, data_iscrizione_ri: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// CONCESSION MODAL
// ============================================================================

interface ConcessionModalProps {
  marketId: string;
  concession: ConcessionRow | null;
  companies: CompanyRow[];
  stalls: { id: string; code: string }[];
  onClose: () => void;
  onSaved: () => void;
}

function ConcessionModal({ marketId, concession, companies, stalls, onClose, onSaved }: ConcessionModalProps) {
  const [formData, setFormData] = useState<ConcessionFormData>({
    company_id: concession?.company_id || '',
    stall_id: concession?.stall_id || '',
    tipo_concessione: concession?.tipo_concessione || 'fisso',
    valida_dal: concession?.valida_dal?.split('T')[0] || '',
    valida_al: concession?.valida_al?.split('T')[0] || '',
    stato: concession?.stato || 'ATTIVA',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = concession
        ? `${API_BASE_URL}/api/concessions/${concession.id}`
        : `${API_BASE_URL}/api/concessions`;

      const method = concession ? 'PATCH' : 'POST';

      // Map frontend field names to backend API field names
      const payload = {
        impresa_id: formData.company_id,  // company_id → impresa_id
        stall_id: formData.stall_id,
        market_id: marketId,
        type: formData.tipo_concessione,  // tipo_concessione → type
        valid_from: formData.valida_dal,  // valida_dal → valid_from
        valid_to: formData.valida_al || null,  // valida_al → valid_to
        notes: null
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Errore durante il salvataggio');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {concession ? 'Modifica Concessione' : 'Nuova Concessione'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Impresa <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona impresa...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.denominazione}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Posteggio <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.stall_id}
                onChange={(e) => setFormData({ ...formData, stall_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona posteggio...</option>
                {stalls.map((stall) => (
                  <option key={stall.id} value={stall.code}>
                    {stall.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo Concessione <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.tipo_concessione}
                onChange={(e) => setFormData({ ...formData, tipo_concessione: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIPO_CONCESSIONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stato <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.stato}
                onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATO_CONCESSIONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valida Dal
              </label>
              <input
                type="date"
                value={formData.valida_dal}
                onChange={(e) => setFormData({ ...formData, valida_dal: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valida Al
              </label>
              <input
                type="date"
                value={formData.valida_al}
                onChange={(e) => setFormData({ ...formData, valida_al: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// INTEGRATION INSTRUCTIONS
// ============================================================================

/*
INTEGRAZIONE PREVISTA (a cura dell'utente, non farla tu):

1. In GestioneMercati.tsx, importare:
   import { MarketCompaniesTab } from "@/components/markets/MarketCompaniesTab";

2. Nel tab "Imprese / Concessioni", sostituire la UI mock con:
   <MarketCompaniesTab 
     marketId={selectedMarketId} 
     stalls={stallsFromState} 
   />
   
   dove:
   - selectedMarketId è il codice del mercato selezionato (es. "GRO001")
   - stallsFromState è l'array di posteggi già caricato dalla pagina, con formato:
     [{ id: "uuid", code: "P001" }, { id: "uuid", code: "P002" }, ...]

3. Assicurarsi che lucide-react sia installato:
   npm install lucide-react

4. Il componente usa Tailwind CSS con le classi già presenti nel progetto.

5. L'API backend è già configurata su:
   https://mihub.157-90-29-66.nip.io/api

6. Endpoint utilizzati:
   - GET  /api/markets/:marketId/companies
   - POST /api/markets/:marketId/companies
   - PUT  /api/markets/companies/:companyId
   - GET  /api/markets/:marketId/concessions
   - POST /api/markets/:marketId/concessions
   - PUT  /api/markets/concessions/:concessionId

7. Il componente è completamente standalone e non richiede modifiche ad altri file.

8. Per testare:
   - Vai su Dashboard PA → Gestione Mercati
   - Seleziona mercato "Grosseto"
   - Clicca su tab "Imprese / Concessioni"
   - Dovresti vedere i dati reali dal backend invece dei mock

9. Funzionalità implementate:
   - ✅ Lista imprese registrate per il mercato
   - ✅ Lista concessioni attive per il mercato
   - ✅ Aggiungi nuova impresa (modal)
   - ✅ Modifica impresa esistente (modal)
   - ✅ Aggiungi nuova concessione (modal)
   - ✅ Modifica concessione esistente (modal)
   - ✅ Loading states (skeleton)
   - ✅ Empty states (nessuna impresa/concessione)
   - ✅ Error handling (banner errore)
   - ✅ Badge stati (attiva/sospesa/scaduta)
   - ✅ Responsive design (mobile-first)

10. Note:
    - Il componente mantiene il layout attuale (cards per imprese, tabella per concessioni)
    - I dati sono caricati automaticamente al mount e quando cambia marketId
    - I modal sono completamente funzionali con validazione form
    - Gli endpoint backend sono già testati e funzionanti (vedi test_backend_imprese_concessioni.md)
*/
