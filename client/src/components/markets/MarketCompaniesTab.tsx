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
import { ConcessionForm } from './ConcessionForm';
import { 
  Building2, 
  Plus, 
  Edit, 
  Edit2,
  X, 
  AlertCircle, 
  Loader2,
  FileText,
  Calendar,
  MapPin,
  FileCheck,
  CheckCircle,
  Clock,
  FileBadge,
  Trash2,
  Eye,
  XCircle,
  Users
} from 'lucide-react';
import { MarketAutorizzazioniTab } from './MarketAutorizzazioniTab';

// ============================================================================
// TYPES
// ============================================================================

export interface MarketCompaniesTabProps {
  marketId: string;              // es. "GRO001"
  marketName?: string;
  municipality?: string;
  stalls: { id: string; code: string }[]; // lista posteggi già caricata dalla pagina
}

export type CompanyRow = {
  id: string;
  code: string;          // es. "12345678901" (CF)
  denominazione: string;
  partita_iva?: string;
  referente?: string;
  telefono?: string;
  stato?: "active" | "suspended" | "closed";
  concessioni?: { id: number; mercato: string; posteggio_code: string; data_scadenza: string; stato: string; wallet_balance?: number }[];
  autorizzazioni?: { id: number; numero: string; ente: string; stato: string }[];
  spunta_wallets?: { id: number; market_id: number; market_name: string; balance: number }[];
  qualificazioni?: { id: number; type: string; status: string; start_date: string; end_date: string }[];
};

type ConcessionRow = {
  id: string;
  market_id?: number;
  stall_id?: string;
  stall_code: string;
  company_id: string;
  company_name: string;
  tipo_concessione: string;  // fisso/spunta/temporanea/subingresso
  valida_dal?: string;       // ISO date
  valida_al?: string;        // ISO date
  stato?: string;            // ATTIVA/SCADUTA/SOSPESA/DA_ASSOCIARE/CESSATA
  stato_calcolato?: string;  // Stato calcolato dinamicamente dal backend
  settore_merceologico?: string;  // Alimentare/Non Alimentare
  comune_rilascio?: string;       // Comune che ha rilasciato la concessione
  // Campi aggiuntivi per sincronizzazione con SSO SUAP
  numero_protocollo?: string;
  data_protocollazione?: string;
  oggetto?: string;
  cf_concessionario?: string;
  partita_iva?: string;
  ragione_sociale?: string;
  nome?: string;
  cognome?: string;
  durata_anni?: number;
  data_decorrenza?: string;
  fila?: string;
  mq?: number;
  dimensioni_lineari?: string;
  giorno?: string;
  ubicazione?: string;
  scia_id?: number;
  cedente_impresa_id?: number;
  market_name?: string;
  market_code?: string;
  vendor_code?: string;
  impresa_id?: number;
  impresa_denominazione?: string;
  impresa_partita_iva?: string;
};

export type CompanyFormData = {
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
  // Dati base (corrispondono a campi DB)
  company_id: string;           // → impresa_id (via vendor)
  stall_id: string;             // → stall_id
  tipo_concessione: string;     // → tipo_concessione
  type: string;                 // → type (fisso/spunta/temporanea)
  valida_dal: string;           // → valid_from
  valida_al: string;            // → valid_to
  stato: string;                // → stato
  
  // Dati Generali - Frontespizio (campi DB)
  numero_protocollo: string;    // → numero_protocollo
  data_protocollazione: string; // → data_protocollazione
  oggetto: string;              // → oggetto
  
  // Tipo e Durata (campi DB)
  durata_anni: string;          // → durata_anni
  data_decorrenza: string;      // → data_decorrenza
  
  // Dati Concessionario (campi DB)
  partita_iva: string;          // → partita_iva
  cf_concessionario: string;    // → cf_concessionario
  ragione_sociale: string;      // → ragione_sociale
  nome: string;                 // → nome
  cognome: string;              // → cognome
  
  // Dati Posteggio (campi DB)
  ubicazione: string;           // → ubicazione
  fila: string;                 // → fila
  mq: string;                   // → mq
  dimensioni_lineari: string;   // → dimensioni_lineari
  giorno: string;               // → giorno
  settore_merceologico: string; // → settore_merceologico
  comune_rilascio: string;      // → comune_rilascio
  
  // Note (campo DB)
  notes: string;                // → notes
  
  // Riferimento SCIA (campo DB)
  scia_id: string;              // → scia_id
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

export const FORMA_GIURIDICA_OPTIONS = [
  { value: '', label: 'Seleziona...' },
  { value: 'SRL', label: 'S.R.L. - Società a Responsabilità Limitata' },
  { value: 'SPA', label: 'S.P.A. - Società per Azioni' },
  { value: 'SNC', label: 'S.N.C. - Società in Nome Collettivo' },
  { value: 'SAS', label: 'S.A.S. - Società in Accomandita Semplice' },
  { value: 'DI', label: 'Ditta Individuale' },
  { value: 'COOP', label: 'Cooperativa' },
  { value: 'ALTRO', label: 'Altro' },
];

export const STATO_IMPRESA_OPTIONS = [
  { value: 'ATTIVA', label: 'Attiva' },
  { value: 'CESSATA', label: 'Cessata' },
  { value: 'IN_LIQUIDAZIONE', label: 'In Liquidazione' },
  { value: 'SOSPESA', label: 'Sospesa' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketCompaniesTab(props: MarketCompaniesTabProps) {
  const { marketId, marketName, municipality, stalls } = props;
  
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
  const [showQualificazioneModal, setShowQualificazioneModal] = useState(false);
  const [selectedQualificazione, setSelectedQualificazione] = useState<QualificazioneRow | null>(null);
  
  // Dettaglio concessione (sincronizzato con SSO SUAP)
  const [selectedConcessionDetail, setSelectedConcessionDetail] = useState<ConcessionRow | null>(null);
  const [concessionDetailTab, setConcessionDetailTab] = useState<'dati' | 'posteggio' | 'modifica'>('dati');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'impresa' | 'concessione' | 'qualificazione' | 'autorizzazione'>('impresa');
  
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
  
  const handleOpenQualificazioneModal = (qualificazione?: QualificazioneRow) => {
    setSelectedQualificazione(qualificazione || null);
    setShowQualificazioneModal(true);
  };

  const handleCloseQualificazioneModal = () => {
    setShowQualificazioneModal(false);
    setSelectedQualificazione(null);
  };

  const handleQualificazioneSaved = async () => {
    await fetchQualificazioni();
    handleCloseQualificazioneModal();
  };

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
      // Prima carichiamo companies e concessions
      await Promise.all([
        fetchCompanies(),
        fetchConcessions(),
      ]);
      // fetchQualificazioni viene chiamata separatamente dopo che companies è stato aggiornato
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };
  
  // Effetto per caricare le qualificazioni quando si seleziona un'impresa
  useEffect(() => {
    if (selectedCompanyForQualif) {
      fetchQualificazioni();
    }
  }, [selectedCompanyForQualif]);

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
	        concessioni: (v.concessioni_attive || []).map((c: any) => ({
	          ...c,
	          wallet_balance: c.wallet_balance !== undefined ? Number(c.wallet_balance) : undefined
	        })),
	        autorizzazioni: v.autorizzazioni_attive || [],
	        spunta_wallets: v.spunta_wallets || [],
            // Mappiamo le qualificazioni dal backend (nuovo campo aggiunto in v3.1)
            qualificazioni: v.qualificazioni || [],
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
          const mappedData = json.data.map((c: any) => ({
            id: c.id,
            stall_id: c.stall_id,
            stall_code: c.stall_number || c.stall_code || 'N/A',
            company_id: c.vendor_id || c.company_id,
            company_name: c.vendor_business_name || c.company_name || 'N/A',
            tipo_concessione: c.type || c.tipo_concessione || 'N/A',
            valida_dal: c.valid_from || c.valida_dal,
            valida_al: c.valid_to || c.valida_al,
            stato: c.status || (
              (c.valid_to && new Date(c.valid_to) < new Date()) ? 'SCADUTA' : 'ATTIVA'
            ),
            settore_merceologico: c.settore_merceologico || 'Alimentare',
            comune_rilascio: c.comune_rilascio || ''
          }));
          setConcessions(mappedData);
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
      
      const mappedData = json.data.map((c: any) => ({
        id: c.id,
        market_id: c.market_id,
        stall_id: c.stall_id,
        stall_code: c.stall_number || c.stall_code || 'N/A',
        company_id: c.vendor_id || c.company_id,
        company_name: c.vendor_business_name || c.company_name || 'N/A',
        tipo_concessione: c.type || c.tipo_concessione || 'N/A',
        valida_dal: c.valid_from || c.valida_dal,
        valida_al: c.valid_to || c.valida_al,
        // Usa stato_calcolato dal backend (calcolo dinamico SCADUTA)
        stato: c.stato_calcolato || c.stato || c.status || 'ATTIVA',
        stato_calcolato: c.stato_calcolato,
        settore_merceologico: c.settore_merceologico || 'Alimentare',
        comune_rilascio: c.comune_rilascio || '',
        // Campi aggiuntivi per dettaglio (sincronizzato con SSO SUAP)
        numero_protocollo: c.numero_protocollo,
        data_protocollazione: c.data_protocollazione,
        oggetto: c.oggetto,
        cf_concessionario: c.cf_concessionario,
        partita_iva: c.partita_iva,
        ragione_sociale: c.ragione_sociale,
        nome: c.nome,
        cognome: c.cognome,
        durata_anni: c.durata_anni,
        data_decorrenza: c.data_decorrenza,
        fila: c.fila,
        mq: c.mq,
        dimensioni_lineari: c.dimensioni_lineari,
        giorno: c.giorno,
        ubicazione: c.ubicazione,
        scia_id: c.scia_id,
        cedente_impresa_id: c.cedente_impresa_id,
        market_name: c.market_name,
        market_code: c.market_code,
        vendor_code: c.vendor_code,
        impresa_id: c.impresa_id,
        impresa_denominazione: c.impresa_denominazione,
        impresa_partita_iva: c.impresa_partita_iva
      }));
      
      setConcessions(mappedData);
    } catch (err) {
      console.error('[MarketCompaniesTab] fetchConcessions error:', err);
      setError('Impossibile caricare le concessioni');
      setConcessions([]);
    }
  };

  // Fetch qualificazioni (mock data per ora)
  const fetchQualificazioni = async () => {
    try {
      if (selectedCompanyForQualif) {
        const response = await fetch(`${API_BASE_URL}/api/imprese/${selectedCompanyForQualif.id}/qualificazioni`);
        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            setQualificazioni(prev => {
              const others = prev.filter(q => q.company_id !== selectedCompanyForQualif.id);
              const newQualificazioni = json.data.map((q: any) => {
                // Calcola lo stato DINAMICAMENTE dalla data di scadenza
                let stato = q.stato || 'ATTIVA';
                if (q.data_scadenza) {
                  const oggi = new Date();
                  oggi.setHours(0, 0, 0, 0); // Confronta solo le date, non le ore
                  // Normalizza la data di scadenza per evitare problemi di fuso orario
                  const scadenzaStr = q.data_scadenza.split('T')[0]; // Prende solo YYYY-MM-DD
                  const [year, month, day] = scadenzaStr.split('-').map(Number);
                  const scadenza = new Date(year, month - 1, day); // Crea data locale
                  scadenza.setHours(23, 59, 59, 999); // Fine giornata della scadenza
                  // Determina lo stato SOLO dalla data
                  if (scadenza < oggi) {
                    stato = 'SCADUTA';
                  } else {
                    stato = 'ATTIVA';
                  }
                }
                return {
                  id: q.id.toString(),
                  company_id: selectedCompanyForQualif.id,
                  company_name: selectedCompanyForQualif.denominazione,
                  tipo: q.tipo,
                  ente_rilascio: q.ente_rilascio,
                  data_rilascio: q.data_rilascio ? q.data_rilascio.split('T')[0] : '',
                  data_scadenza: q.data_scadenza ? q.data_scadenza.split('T')[0] : '',
                  stato: stato,
                  note: q.note
                };
              });
              return [...others, ...newQualificazioni];
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching qualificazioni:', err);
    }
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
            onClick={() => setSearchType('qualificazione')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              searchType === 'qualificazione'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Qualificazioni
          </button>
          
          <button
            onClick={() => setSearchType('autorizzazione')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              searchType === 'autorizzazione'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <FileBadge className="w-4 h-4" />
            Autorizzazioni
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
                    marketId={marketId}
                    qualificazioni={qualificazioni.filter(q => q.company_id === company.id)}
                    onEdit={() => handleOpenCompanyModal(company)}
                    onViewQualificazioni={() => {
                      setSearchType('qualificazione');
                      setSelectedCompanyForQualif(company);
                      // Scroll to qualifications section if needed, or just switch tab
                    }}
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
                          Settore
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Comune
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
                          onView={() => {
                            setSelectedConcessionDetail(concession);
                            setConcessionDetailTab('dati');
                          }}
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5" />
                    Qualificazioni
                  </h3>
                  {selectedCompanyForQualif && (
                    <button
                      onClick={() => handleOpenQualificazioneModal()}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Nuova
                    </button>
                  )}
                </div>
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
                      <div 
                        key={qual.id} 
                        className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-purple-500/50 hover:bg-gray-800/50 transition-all group"
                        onClick={() => handleOpenQualificazioneModal(qual)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-white group-hover:text-purple-300 transition-colors">{qual.tipo}</div>
                          <div className="flex items-center gap-2">
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
                            <Edit2 className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                          </div>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>Ente: {qual.ente_rilascio}</div>
                          <div className="flex gap-4">
                            <span>Rilascio: {new Date(qual.data_rilascio).toLocaleDateString('it-IT')}</span>
                            <span>Scadenza: {new Date(qual.data_scadenza).toLocaleDateString('it-IT')}</span>
                          </div>
                          {qual.note && <div className="text-gray-500 italic mt-2">{qual.note}</div>}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Clicca per modificare o eliminare
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

      {searchType === 'autorizzazione' && (
        <MarketAutorizzazioniTab 
          companies={companies} 
          searchQuery={searchQuery} 
          marketId={parseInt(marketId)}
          marketName={marketName}
          municipality={municipality}
        />
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
        <ConcessionForm
          marketId={marketId}
          marketName={marketName}
          concession={selectedConcession}
          companies={companies}
          stalls={stalls}
          onClose={handleCloseConcessionModal}
          onSaved={handleConcessionSaved}
          onDeleted={handleConcessionSaved}
        />
      )}

      {showQualificazioneModal && selectedCompanyForQualif && (
        <QualificazioneModal
          company={selectedCompanyForQualif}
          qualificazione={selectedQualificazione}
          onClose={handleCloseQualificazioneModal}
          onSaved={handleQualificazioneSaved}
        />
      )}

      {/* ================================================================== */}
      {/* MODALE DETTAGLIO CONCESSIONE (sincronizzato con SSO SUAP) */}
      {/* ================================================================== */}
      {selectedConcessionDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] rounded-xl border border-amber-500/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <FileText className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Concessione #{selectedConcessionDetail.numero_protocollo || selectedConcessionDetail.id}
                    </h2>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      selectedConcessionDetail.tipo_concessione === 'subingresso' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {selectedConcessionDetail.tipo_concessione || 'fisso'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedConcessionDetail(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setConcessionDetailTab('dati')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    concessionDetailTab === 'dati'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Dati Concessione
                </button>
                {selectedConcessionDetail.tipo_concessione === 'subingresso' && 
                 selectedConcessionDetail.stato === 'DA_ASSOCIARE' && (
                  <button
                    onClick={() => setConcessionDetailTab('posteggio')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      concessionDetailTab === 'posteggio'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    Aggiorna Posteggi
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedConcessionDetail(null);
                    handleOpenConcessionModal(selectedConcessionDetail);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Modifica
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {concessionDetailTab === 'dati' && (
                <div className="space-y-6">
                  {/* Info Mercato e Posteggio */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Mercato</h4>
                      <p className="text-white font-semibold">{selectedConcessionDetail.market_name || marketName || 'N/A'}</p>
                      <p className="text-sm text-gray-400">{selectedConcessionDetail.market_code || marketId}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Posteggio</h4>
                      <p className="text-white font-semibold">N. {selectedConcessionDetail.stall_code}</p>
                      {selectedConcessionDetail.fila && <p className="text-sm text-gray-400">Fila: {selectedConcessionDetail.fila}</p>}
                      {selectedConcessionDetail.mq && <p className="text-sm text-gray-400">{selectedConcessionDetail.mq} mq</p>}
                    </div>
                  </div>
                  
                  {/* Info Concessionario */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Concessionario</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Ragione Sociale</p>
                        <p className="text-white">{selectedConcessionDetail.ragione_sociale || selectedConcessionDetail.company_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">P.IVA</p>
                        <p className="text-white">{selectedConcessionDetail.partita_iva || selectedConcessionDetail.impresa_partita_iva || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Codice Fiscale</p>
                        <p className="text-white">{selectedConcessionDetail.cf_concessionario || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Settore</p>
                        <p className="text-white">{selectedConcessionDetail.settore_merceologico || 'Alimentare'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Date e Stato */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Valida Dal</h4>
                      <p className="text-white">
                        {selectedConcessionDetail.valida_dal 
                          ? new Date(selectedConcessionDetail.valida_dal).toLocaleDateString('it-IT')
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Scadenza</h4>
                      <p className="text-white">
                        {selectedConcessionDetail.valida_al 
                          ? new Date(selectedConcessionDetail.valida_al).toLocaleDateString('it-IT')
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Stato</h4>
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        selectedConcessionDetail.stato === 'ATTIVA' ? 'bg-green-500/20 text-green-400' :
                        selectedConcessionDetail.stato === 'SCADUTA' ? 'bg-red-500/20 text-red-400' :
                        selectedConcessionDetail.stato === 'DA_ASSOCIARE' ? 'bg-orange-500/20 text-orange-400' :
                        selectedConcessionDetail.stato === 'SOSPESA' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {selectedConcessionDetail.stato || 'ATTIVA'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Info aggiuntive se presenti */}
                  {(selectedConcessionDetail.durata_anni || selectedConcessionDetail.giorno || selectedConcessionDetail.ubicazione) && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-3">Dettagli Aggiuntivi</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {selectedConcessionDetail.durata_anni && (
                          <div>
                            <p className="text-xs text-gray-500">Durata</p>
                            <p className="text-white">{selectedConcessionDetail.durata_anni} anni</p>
                          </div>
                        )}
                        {selectedConcessionDetail.giorno && (
                          <div>
                            <p className="text-xs text-gray-500">Giorno</p>
                            <p className="text-white">{selectedConcessionDetail.giorno}</p>
                          </div>
                        )}
                        {selectedConcessionDetail.ubicazione && (
                          <div>
                            <p className="text-xs text-gray-500">Ubicazione</p>
                            <p className="text-white">{selectedConcessionDetail.ubicazione}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Link SCIA se presente */}
                  {selectedConcessionDetail.scia_id && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <p className="text-sm text-purple-400">
                        Questa concessione è collegata alla SCIA #{selectedConcessionDetail.scia_id}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {concessionDetailTab === 'posteggio' && selectedConcessionDetail.tipo_concessione === 'subingresso' && (
                <div className="space-y-6">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <h4 className="text-orange-400 font-medium mb-2">Trasferimento Posteggio</h4>
                    <p className="text-sm text-gray-300">
                      Questa concessione di subingresso richiede il trasferimento del posteggio dal cedente al subentrante.
                    </p>
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const response = await fetch(`https://orchestratore.mio-hub.me/api/concessions/${selectedConcessionDetail.id}/associa-posteggio`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                          });
                          const result = await response.json();
                          if (result.success) {
                            alert('Posteggio associato con successo!');
                            setSelectedConcessionDetail({ ...selectedConcessionDetail, stato: 'ATTIVA' });
                            fetchConcessions();
                          } else {
                            alert('Errore: ' + result.error);
                          }
                        } catch (error) {
                          alert('Errore di connessione');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Associazione in corso...' : 'Associa Posteggio'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUALIFICAZIONE MODAL
// ============================================================================

interface QualificazioneModalProps {
  company: CompanyRow;
  qualificazione: QualificazioneRow | null;
  onClose: () => void;
  onSaved: () => void;
}

function QualificazioneModal({ company, qualificazione, onClose, onSaved }: QualificazioneModalProps) {
  // Helper per formattare date per input type="date"
  const formatDateForInput = (dateValue: string | null | undefined): string => {
    if (!dateValue) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    tipo: qualificazione?.tipo || '',
    ente_rilascio: qualificazione?.ente_rilascio || '',
    data_rilascio: formatDateForInput(qualificazione?.data_rilascio),
    data_scadenza: formatDateForInput(qualificazione?.data_scadenza),
    stato: qualificazione?.stato || 'ATTIVA',
    note: qualificazione?.note || ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = qualificazione
        ? `${API_BASE_URL}/api/imprese/${company.id}/qualificazioni/${qualificazione.id}`
        : `${API_BASE_URL}/api/imprese/${company.id}/qualificazioni`;

      const method = qualificazione ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  const handleDelete = async () => {
    if (!qualificazione) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/imprese/${company.id}/qualificazioni/${qualificazione.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Errore durante l\'eliminazione');
      }
      
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {qualificazione ? 'Modifica Qualificazione' : 'Nuova Qualificazione'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
            <select
              required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Seleziona tipo...</option>
              {/* Requisiti Obbligatori */}
              <option value="DURC">DURC - Regolarità Contributiva</option>
              <option value="ONORABILITA">ONORABILITA - Requisiti Morali (Art. 71 D.Lgs. 59/2010)</option>
              <option value="ANTIMAFIA">ANTIMAFIA - Dichiarazione (Art. 67 D.Lgs. 159/2011)</option>
              {/* Certificazioni Alimentari */}
              <option value="HACCP">HACCP - Sicurezza Alimentare</option>
              <option value="SAB">SAB - Somministrazione Alimenti e Bevande</option>
              <option value="REC">REC - Registro Esercenti Commercio</option>
              <option value="CORSO_ALIMENTARE">CORSO ALIMENTARE - Formazione Regionale</option>
              {/* Certificazioni Qualità */}
              <option value="ISO 9001">ISO 9001 - Qualità</option>
              <option value="ISO 14001">ISO 14001 - Ambiente</option>
              <option value="ISO 22000">ISO 22000 - Sicurezza Alimentare</option>
              {/* Altro */}
              <option value="CONCESSIONE MERCATO">CONCESSIONE MERCATO</option>
              <option value="ALTRO">ALTRO</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ente Rilascio</label>
            <input
              type="text"
              required
              value={formData.ente_rilascio}
              onChange={(e) => setFormData({ ...formData, ente_rilascio: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data Rilascio</label>
              <input
                type="date"
                required
                value={formData.data_rilascio}
                onChange={(e) => setFormData({ ...formData, data_rilascio: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 relative z-[100]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Data Scadenza</label>
              <input
                type="date"
                value={formData.data_scadenza}
                onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 relative z-[100]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Stato</label>
            <select
              value={formData.stato}
              onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ATTIVA">ATTIVA</option>
              <option value="IN_VERIFICA">IN VERIFICA</option>
              <option value="SCADUTA">SCADUTA</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            {/* Pulsante Elimina - solo in modifica */}
            {qualificazione && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
            )}
            
            {/* Conferma eliminazione */}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-sm">Confermi?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Eliminazione...' : 'Sì, elimina'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  No
                </button>
              </div>
            )}
            
            {!qualificazione && <div />}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving || showDeleteConfirm}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// COMPANY CARD
// ============================================================================

interface CompanyCardProps {
  company: CompanyRow;
  qualificazioni?: QualificazioneRow[];
  marketId: string | number;
  onEdit: () => void;
  onViewQualificazioni?: () => void;
}

function CompanyCard({ company, qualificazioni = [], marketId, onEdit, onViewQualificazioni }: CompanyCardProps) {
  // Usiamo le qualificazioni passate come prop (dal fetch dettagliato) se presenti,
  // altrimenti usiamo quelle incorporate nell'oggetto company (dal fetch lista)
  // Calcoliamo dinamicamente lo stato SCADUTA basandoci sulla data di scadenza
  const displayQualificazioni = React.useMemo(() => {
    const quals = qualificazioni.length > 0 ? qualificazioni : (company.qualificazioni || []);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    return quals.map(q => {
      // Calcola lo stato DINAMICAMENTE dalla data di scadenza, ignorando lo stato del DB
      // perché il DB potrebbe avere uno stato obsoleto
      let stato = q.status || q.stato || 'ATTIVA';
      if (q.data_scadenza) {
        // Normalizza la data di scadenza per evitare problemi di fuso orario
        const scadenzaStr = q.data_scadenza.split('T')[0]; // Prende solo YYYY-MM-DD
        const [year, month, day] = scadenzaStr.split('-').map(Number);
        const scadenza = new Date(year, month - 1, day); // Crea data locale senza fuso orario
        scadenza.setHours(23, 59, 59, 999); // Fine giornata della scadenza
        // Determina lo stato SOLO dalla data
        if (scadenza < oggi) {
          stato = 'SCADUTA';
        } else {
          // Se la data NON è scaduta, forza ATTIVA (sovrascrive eventuale stato errato nel DB)
          stato = 'ATTIVA';
        }
      }
      return { ...q, stato };
    });
  }, [qualificazioni, company.qualificazioni]);
  // Filtra i wallet spunta da visualizzare
  // Se siamo in un mercato specifico, mettiamo quello corrente per primo, poi gli altri
  const sortedSpuntaWallets = React.useMemo(() => {
    if (!company.spunta_wallets || company.spunta_wallets.length === 0) return [];
    
    if (marketId && marketId !== 'ALL') {
      const currentId = Number(marketId);
      return [...company.spunta_wallets].sort((a, b) => {
        if (a.market_id === currentId) return -1;
        if (b.market_id === currentId) return 1;
        return 0;
      });
    }
    return company.spunta_wallets;
  }, [company.spunta_wallets, marketId]);
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
        
        {/* Badge Concessioni, Autorizzazioni e Qualificazioni */}
        <div className="flex flex-wrap gap-2 pt-2">
          {/* Wallet Spunta Badges */}
          {sortedSpuntaWallets.length > 0 ? (
            sortedSpuntaWallets.map((wallet) => (
              <span 
                key={wallet.id}
                className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-md ${
                  wallet.market_name 
                    ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' 
                    : 'text-white bg-white/10 border border-white/20'
                } ${marketId && Number(marketId) === wallet.market_id ? 'ring-1 ring-yellow-500/50' : ''}`}
              >
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${wallet.market_name ? 'bg-yellow-500' : 'bg-white'}`} />
                  {wallet.market_name ? `Spunta ${wallet.market_name}` : 'GENERICO'}
                </div>
                <div className={`flex items-center gap-1 pl-2 border-l ${wallet.market_name ? 'border-yellow-400/20' : 'border-white/20'} ${wallet.balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${wallet.balance > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-bold">€ {Number(wallet.balance).toFixed(2)}</span>
                </div>
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md bg-gray-500/10 text-gray-500 border-gray-500/20">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              No Spunta
            </span>
          )}

	          {/* Semaforo Qualificazioni */}
	          {onViewQualificazioni && (
	            <button
	              onClick={(e) => {
	                e.stopPropagation();
	                onViewQualificazioni();
	              }}
	              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-md transition-colors ${
	                displayQualificazioni.length === 0
	                  ? 'text-gray-400 bg-gray-400/10 border-gray-400/20 hover:bg-gray-400/20'
	                  : displayQualificazioni.some(q => (q.status || q.stato) === 'SCADUTA')
	                    ? 'text-red-400 bg-red-400/10 border-red-400/20 hover:bg-red-400/20'
	                    : displayQualificazioni.some(q => (q.status || q.stato) === 'IN_VERIFICA')
	                      ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20 hover:bg-yellow-400/20'
	                      : 'text-green-400 bg-green-400/10 border-green-400/20 hover:bg-green-400/20'
	              }`}
	              title="Clicca per gestire le qualificazioni"
	            >
	              <FileCheck className="w-3 h-3" />
	              {displayQualificazioni.length === 0 ? 'No Qualifiche' : 
	               displayQualificazioni.some(q => (q.status || q.stato) === 'SCADUTA') ? 'Qualifiche Scadute' :
	               displayQualificazioni.some(q => (q.status || q.stato) === 'IN_VERIFICA') ? 'In Verifica' : 'Qualificato'}
	            </button>
	          )}

          {company.autorizzazioni && company.autorizzazioni.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md">
              <FileBadge className="w-3 h-3" />
              Autorizzato
            </span>
          )}
          
          {company.concessioni && company.concessioni.map((conc, idx) => {
            const hasBalance = conc.wallet_balance !== undefined;
            const isPaid = hasBalance && conc.wallet_balance! > 0;
            const isExpired = conc.stato === 'SCADUTA';
            
            return (
              <span key={idx} className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-md ${
                isExpired 
                  ? 'text-red-400 bg-red-400/10 border border-red-400/20' 
                  : 'text-blue-400 bg-blue-400/10 border border-blue-400/20'
              }`}>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {conc.mercato}: {conc.posteggio_code}
                  {isExpired && <span className="ml-1 text-[10px] uppercase font-bold">(Scaduta)</span>}
                </div>
                {hasBalance && (
                  <div className={`flex items-center gap-1 pl-2 border-l ${isExpired ? 'border-red-400/20' : 'border-blue-400/20'} ${isPaid ? 'text-green-400' : 'text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-bold">€ {conc.wallet_balance!.toFixed(2)}</span>
                  </div>
                )}
              </span>
            );
          })}
        </div>

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
  onView: () => void;
  onEdit: () => void;
}

function ConcessionRow({ concession, onView, onEdit }: ConcessionRowProps) {
  const getStatoBadge = (stato?: string) => {
    switch (stato?.toUpperCase()) {
      case 'ATTIVA':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Attiva</span>;
      case 'SOSPESA':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Sospesa</span>;
      case 'SCADUTA':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Scaduta</span>;
      case 'DA_ASSOCIARE':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-400">Da Associare</span>;
      case 'CESSATA':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">Cessata</span>;
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
      <td className="px-4 py-3 text-sm text-gray-300">
        <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400">
          {concession.settore_merceologico || 'Alimentare'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{concession.comune_rilascio || '-'}</td>
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
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onView}
            className="text-amber-400 hover:text-amber-300 transition-colors"
            title="Visualizza dettaglio"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-white transition-colors"
            title="Modifica concessione"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// COMPANY MODAL
// ============================================================================

export interface CompanyModalProps {
  marketId: string;
  company: CompanyRow | null;
  onClose: () => void;
  onSaved: () => void;
  inline?: boolean; // Se true, usa posizionamento inline invece di fixed
}

// Helper function per formattare le date ISO in YYYY-MM-DD per input type="date"
const formatDateForInput = (dateValue: string | null | undefined): string => {
  if (!dateValue) return '';
  // Se è già nel formato YYYY-MM-DD, restituiscilo
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  // Altrimenti prova a parsare e formattare
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

// Helper function per capitalizzare le parole (prima lettera maiuscola)
const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s|')\S/g, (match) => match.toUpperCase());
};

export function CompanyModal({ marketId, company, onClose, onSaved, inline = false }: CompanyModalProps) {
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
    rappresentante_legale_data_nascita: formatDateForInput((company as any)?.rappresentante_legale_data_nascita),
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
    data_iscrizione_ri: formatDateForInput((company as any)?.data_iscrizione_ri),
    
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

  // Stili condizionali per modalità inline vs modal
  const containerClass = inline 
    ? "absolute inset-0 z-10 flex flex-col bg-[#0b1220]"
    : "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4";
  
  const modalClass = inline
    ? "flex-1 flex flex-col overflow-hidden"
    : "bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto";
  
  const headerClass = inline
    ? "sticky top-0 bg-[#0b1220] border-b border-[#14b8a6]/20 px-4 py-3 flex items-center justify-between"
    : "sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between";
  
  const formClass = inline
    ? "flex-1 overflow-y-auto p-3 space-y-3"
    : "p-6 space-y-6";
  
  const titleClass = inline
    ? "text-sm font-semibold text-[#e8fbff]"
    : "text-lg font-semibold text-white";
  
  const labelClass = inline
    ? "block text-[10px] font-medium text-[#e8fbff]/70 mb-1"
    : "block text-sm font-medium text-gray-300 mb-2";
  
  const inputClass = inline
    ? "w-full px-2 py-1.5 text-xs bg-[#1a2332] border border-[#14b8a6]/30 rounded text-[#e8fbff] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
    : "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  
  const sectionClass = inline
    ? "text-[10px] font-semibold text-[#14b8a6] uppercase tracking-wide border-b border-[#14b8a6]/20 pb-1 mb-2"
    : "text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2";

  return (
    <div className={containerClass}>
      <div className={modalClass}>
        <div className={headerClass}>
          <h3 className={titleClass}>
            {company ? 'Modifica Impresa' : 'Nuova Impresa'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className={inline ? "w-4 h-4" : "w-5 h-5"} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={formClass}>
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
                  onChange={(e) => setFormData({ ...formData, indirizzo_via: capitalizeWords(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, comune: capitalizeWords(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_cognome: capitalizeWords(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_nome: capitalizeWords(e.target.value) })}
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
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onBlur={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-[100]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Luogo di Nascita
                </label>
                <input
                  type="text"
                  value={formData.rappresentante_legale_luogo_nascita}
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_luogo_nascita: capitalizeWords(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_via: capitalizeWords(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, rappresentante_legale_residenza_comune: capitalizeWords(e.target.value) })}
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
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-[100]"
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
