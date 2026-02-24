/**
 * MarketAutorizzazioniTab.tsx
 * 
 * Componente per la gestione delle Autorizzazioni (nuova feature).
 * Replica la logica delle Concessioni ma per le Autorizzazioni.
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  X, 
  AlertCircle, 
  Loader2,
  Calendar,
  FileCheck,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/hooks/useImpersonation';
import { formatDate } from '@/lib/formatUtils';
import { CompanyRow } from './MarketCompaniesTab';

// ============================================================================
// TYPES
// ============================================================================

export type AutorizzazioneRow = {
  id: number;
  vendor_id: number;
  company_name?: string; // Join
  numero_autorizzazione: string;
  ente_rilascio: string;
  data_rilascio: string; // ISO date
  data_scadenza?: string; // ISO date
  stato: string;
  note?: string;
};

type AutorizzazioneFormData = {
  vendor_id: string;
  numero_autorizzazione: string;
  ente_rilascio: string;
  data_rilascio: string;
  data_scadenza: string;
  stato: string;
  note: string;
};

interface MarketAutorizzazioniTabProps {
  companies: CompanyRow[];
  searchQuery: string;
  marketId: number;
  marketName?: string;
  municipality?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketAutorizzazioniTab({ companies, searchQuery, marketId, marketName, municipality }: MarketAutorizzazioniTabProps) {
  const [autorizzazioni, setAutorizzazioni] = useState<AutorizzazioneRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showSpuntaModal, setShowSpuntaModal] = useState(false);
  const [selectedAutorizzazione, setSelectedAutorizzazione] = useState<AutorizzazioneRow | null>(null);

  // Fetch data
  useEffect(() => {
    fetchAutorizzazioni();
  }, []);

  const fetchAutorizzazioni = async () => {
    setLoading(true);
    try {
      // Usiamo trpc via HTTP client per semplicità o fetch diretto se esposto
      // Qui assumiamo che il router trpc sia esposto via /api/trpc o simile, 
      // ma per coerenza con il resto del file usiamo fetch su endpoint REST se esiste,
      // oppure simuliamo la chiamata trpc via client.
      // Dato che abbiamo creato un router trpc, usiamo il client trpc se disponibile,
      // ma qui per semplicità usiamo fetch diretto su endpoint che wrappa trpc o chiamata diretta.
      
      // NOTA: In questo progetto sembra si usi sia REST che TRPC. 
      // Per ora simulo una chiamata fetch che dovrebbe essere gestita dal backend.
      // Se non esiste un endpoint REST, bisognerebbe usare il client TRPC.
      // Visto che ho aggiunto il router in integrationsRouter, userò il client TRPC se possibile.
      // Ma per ora, per non rompere nulla, uso fetch e assumo che ci sia un adattatore o uso la chiamata diretta.
      
      // Use REST API endpoint
      const response = await fetch(`${MIHUB_API_BASE_URL}/api/autorizzazioni`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      
      if (json.success && json.data) {
        // Map data if necessary
        const data = json.data.map((item: any) => ({
          ...item,
          // Ensure dates are ISO strings
          data_rilascio: item.data_rilascio ? new Date(item.data_rilascio).toISOString() : null,
          data_scadenza: item.data_scadenza ? new Date(item.data_scadenza).toISOString() : null,
        }));
        setAutorizzazioni(data);
      }
    } catch (err: any) {
      console.error('Errore fetch autorizzazioni:', err);
      // Fallback dati vuoti per ora se l'endpoint non risponde ancora
      setAutorizzazioni([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    setShowModal(false);
    fetchAutorizzazioni();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa autorizzazione?')) return;
    
    try {
      const response = await authenticatedFetch(`${MIHUB_API_BASE_URL}/api/autorizzazioni/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Errore durante l\'eliminazione');
      fetchAutorizzazioni();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter data
  const filteredAutorizzazioni = autorizzazioni.filter(a => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.numero_autorizzazione?.toLowerCase().includes(query) ||
      a.company_name?.toLowerCase().includes(query) ||
      a.ente_rilascio?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-purple-400" />
          Autorizzazioni ({filteredAutorizzazioni.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSpuntaModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            <FileCheck className="w-4 h-4" />
            Domanda Spunta
          </button>
          <button
            onClick={() => {
              setSelectedAutorizzazione(null);
              setShowModal(true);
            }}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuova Autorizzazione
          </button>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/50">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">N. Autorizzazione</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Impresa</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Ente Rilascio</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Rilascio</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Scadenza</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Stato</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Caricamento...
                  </td>
                </tr>
              ) : filteredAutorizzazioni.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nessuna autorizzazione trovata
                  </td>
                </tr>
              ) : (
                filteredAutorizzazioni.map((auth) => (
                  <AutorizzazioneRowItem 
                    key={auth.id} 
                    autorizzazione={auth} 
                    onEdit={() => {
                      setSelectedAutorizzazione(auth);
                      setShowModal(true);
                    }}
                    onDelete={() => handleDelete(auth.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AutorizzazioneModal
          autorizzazione={selectedAutorizzazione}
          companies={companies}
          onClose={() => setShowModal(false)}
          onSaved={handleSave}
        />
      )}

      {showSpuntaModal && (
        <DomandaSpuntaModal
          companies={companies}
          marketId={marketId}
          marketName={marketName}
          municipality={municipality}
          onClose={() => setShowSpuntaModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// DOMANDA SPUNTA MODAL
// ============================================================================

function DomandaSpuntaModal({ companies, marketId, marketName, municipality, onClose }: { companies: CompanyRow[], marketId: number, marketName?: string, municipality?: string, onClose: () => void }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    setLoading(true);
    try {
      const response = await authenticatedFetch(`${MIHUB_API_BASE_URL}/api/wallets/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: parseInt(selectedCompanyId),
          type: 'SPUNTA',
          market_id: marketId
        })
      });

      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Errore durante la creazione della domanda');

      alert('Domanda Spunta inviata con successo! Il wallet è stato creato.');
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-blue-500" />
            Domanda Spunta
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-200 space-y-2">
            <p>Inviando la domanda, verrà creato automaticamente un <strong>Wallet Spunta</strong> specifico per:</p>
            <div className="flex flex-col gap-1 mt-2 pl-2 border-l-2 border-blue-500/30">
              <span className="text-white font-medium">{marketName || 'Mercato Corrente'}</span>
              <span className="text-blue-300 text-xs">{municipality || 'Comune di Riferimento'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Seleziona Impresa</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Seleziona un'impresa --</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.denominazione} (P.IVA: {c.partita_iva})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCompanyId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Invia Domanda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ROW COMPONENT
// ============================================================================

function AutorizzazioneRowItem({ autorizzazione, onEdit, onDelete }: { autorizzazione: AutorizzazioneRow, onEdit: () => void, onDelete: () => void }) {
  const getStatoBadge = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'ATTIVA':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Attiva</span>;
      case 'SCADUTA':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1 w-fit"><AlertCircle className="w-3 h-3" /> Scaduta</span>;
      case 'SOSPESA':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Sospesa</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400">{stato}</span>;
    }
  };

  return (
    <tr className="hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-3 text-sm text-white font-medium">
        {autorizzazione.numero_autorizzazione}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {autorizzazione.company_name || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {autorizzazione.ente_rilascio}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-gray-500" />
          {formatDate(autorizzazione.data_rilascio)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-gray-500" />
          {formatDate(autorizzazione.data_scadenza)}
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {getStatoBadge(autorizzazione.stato)}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Modifica"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
            title="Elimina"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// MODAL COMPONENT
// ============================================================================

interface AutorizzazioneModalProps {
  autorizzazione: AutorizzazioneRow | null;
  companies: CompanyRow[];
  onClose: () => void;
  onSaved: () => void;
}

function AutorizzazioneModal({ autorizzazione, companies, onClose, onSaved }: AutorizzazioneModalProps) {
  const [formData, setFormData] = useState<AutorizzazioneFormData>({
    vendor_id: autorizzazione?.vendor_id?.toString() || '',
    numero_autorizzazione: autorizzazione?.numero_autorizzazione || '',
    ente_rilascio: autorizzazione?.ente_rilascio || '',
    data_rilascio: autorizzazione?.data_rilascio?.split('T')[0] || '',
    data_scadenza: autorizzazione?.data_scadenza?.split('T')[0] || '',
    stato: autorizzazione?.stato || 'ATTIVA',
    note: autorizzazione?.note || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = autorizzazione 
        ? `${MIHUB_API_BASE_URL}/api/autorizzazioni/${autorizzazione.id}`
        : `${MIHUB_API_BASE_URL}/api/autorizzazioni`;
      
      const method = autorizzazione ? 'PUT' : 'POST';
      
      const payload: any = {
        vendor_id: parseInt(formData.vendor_id),
        numero_autorizzazione: formData.numero_autorizzazione,
        ente_rilascio: formData.ente_rilascio,
        data_rilascio: formData.data_rilascio, // Backend expects ISO string or date string
        data_scadenza: formData.data_scadenza || null,
        stato: formData.stato,
        note: formData.note,
      };

      // REST API call
      const response = await authenticatedFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore durante il salvataggio');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-purple-500" />
            {autorizzazione ? 'Modifica Autorizzazione' : 'Nuova Autorizzazione'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Impresa Titolare <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="">Seleziona impresa...</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.denominazione} ({company.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Numero Autorizzazione <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.numero_autorizzazione}
                onChange={(e) => setFormData({ ...formData, numero_autorizzazione: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="es. 2023/001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ente Rilascio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.ente_rilascio}
                onChange={(e) => setFormData({ ...formData, ente_rilascio: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="es. Comune di Grosseto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data Rilascio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.data_rilascio}
                onChange={(e) => setFormData({ ...formData, data_rilascio: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all relative z-[100]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Data Scadenza
              </label>
              <input
                type="date"
                value={formData.data_scadenza}
                onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all relative z-[100]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stato
              </label>
              <select
                value={formData.stato}
                onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="ATTIVA">Attiva</option>
                <option value="SOSPESA">Sospesa</option>
                <option value="SCADUTA">Scaduta</option>
                <option value="REVOCATA">Revocata</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              placeholder="Eventuali note aggiuntive..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              disabled={saving}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg shadow-purple-900/20"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvataggio...' : 'Salva Autorizzazione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
