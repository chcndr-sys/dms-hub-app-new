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
  MapPin
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
  denominazione: string;
  codice_fiscale: string;
  partita_iva: string;
  referente: string;
  telefono: string;
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

// ============================================================================
// CONSTANTS
// ============================================================================

const API_BASE_URL = 'https://mihub.157-90-29-66.nip.io/api';

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketCompaniesTab(props: MarketCompaniesTabProps) {
  const { marketId, stalls } = props;
  
  console.log('[MarketCompaniesTab] props', { marketId, stallsLength: stalls?.length });

  // State
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [concessions, setConcessions] = useState<ConcessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [selectedConcession, setSelectedConcession] = useState<ConcessionRow | null>(null);

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
      ]);
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/markets/${marketId}/companies`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      
      if (!json.success || !Array.isArray(json.data)) {
        console.error('[MarketCompaniesTab] fetchCompanies: formato risposta non valido', json);
        throw new Error('Formato risposta non valido');
      }
      
      console.log('[MarketCompaniesTab] fetchCompanies: caricati', json.data.length, 'imprese');
      setCompanies(json.data);
    } catch (err) {
      console.error('[MarketCompaniesTab] fetchCompanies error:', err);
      setError('Impossibile caricare le imprese');
      setCompanies([]);
    }
  };

  const fetchConcessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/markets/${marketId}/concessions`);
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
          {/* Sezione Imprese */}
          <section>
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
                {companies.map((company) => (
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
          <section>
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
                      {concessions.map((concession) => (
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
    denominazione: company?.denominazione || '',
    codice_fiscale: company?.code || '',
    partita_iva: company?.partita_iva || '',
    referente: company?.referente || '',
    telefono: company?.telefono || '',
    stato: company?.stato || 'active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = company
        ? `${API_BASE_URL}/markets/companies/${company.id}`
        : `${API_BASE_URL}/markets/${marketId}/companies`;

      const method = company ? 'PUT' : 'POST';

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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

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
                placeholder="es. 12345678901"
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
                placeholder="es. IT12345678901"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Referente (Email)
              </label>
              <input
                type="email"
                value={formData.referente}
                onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="es. mario.rossi@example.com"
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Stato
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
        ? `${API_BASE_URL}/markets/concessions/${concession.id}`
        : `${API_BASE_URL}/markets/${marketId}/concessions`;

      const method = concession ? 'PUT' : 'POST';

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
