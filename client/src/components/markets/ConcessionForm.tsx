import React, { useState } from 'react';
import { FileText, X, AlertCircle, Loader2, Trash2, Users, MapPin, Calendar, Building2 } from 'lucide-react';

const API_BASE_URL = 'https://orchestratore.mio-hub.me';

const TIPO_CONCESSIONE_OPTIONS = [
  { value: 'subingresso', label: 'Subingresso' },
  { value: 'nuova', label: 'Nuova Concessione' },
  { value: 'rinnovo', label: 'Rinnovo' },
  { value: 'conversione', label: 'Conversione' },
  { value: 'voltura', label: 'Voltura' },
];

const STATO_CONCESSIONE_OPTIONS = [
  { value: 'ATTIVA', label: 'Attiva' },
  { value: 'SCADUTA', label: 'Scaduta' },
  { value: 'SOSPESA', label: 'Sospesa' },
  { value: 'CESSATA', label: 'Cessata' },
  { value: 'DA_ASSOCIARE', label: 'Da Associare' },
];

interface Company {
  id: string;
  denominazione: string;
  partita_iva?: string;
  codice_fiscale?: string;
}

interface Stall {
  id: string;
  code: string;
}

interface Concession {
  id: number;
  company_id?: string;
  stall_id?: string;
  tipo_concessione?: string;
  type?: string;
  valida_dal?: string;
  valida_al?: string;
  stato?: string;
  numero_protocollo?: string;
  data_protocollazione?: string;
  oggetto?: string;
  durata_anni?: number;
  data_decorrenza?: string;
  partita_iva?: string;
  cf_concessionario?: string;
  ragione_sociale?: string;
  nome?: string;
  cognome?: string;
  ubicazione?: string;
  fila?: string;
  mq?: number;
  dimensioni_lineari?: string;
  giorno?: string;
  settore_merceologico?: string;
  comune_rilascio?: string;
  notes?: string;
  scia_id?: number;
}

interface ConcessionFormProps {
  marketId: string;
  marketName?: string;
  concession?: Concession | null;
  companies: Company[];
  stalls: Stall[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function ConcessionForm({ 
  marketId, 
  marketName, 
  concession, 
  companies, 
  stalls, 
  onClose, 
  onSaved, 
  onDeleted 
}: ConcessionFormProps) {
  const [formData, setFormData] = useState({
    company_id: concession?.company_id || '',
    stall_id: concession?.stall_id || '',
    tipo_concessione: concession?.tipo_concessione || 'subingresso',
    type: concession?.type || 'fisso',
    valida_dal: concession?.valida_dal?.split('T')[0] || '',
    valida_al: concession?.valida_al?.split('T')[0] || '',
    stato: concession?.stato || 'ATTIVA',
    numero_protocollo: concession?.numero_protocollo || '',
    data_protocollazione: concession?.data_protocollazione?.split('T')[0] || new Date().toISOString().split('T')[0],
    oggetto: concession?.oggetto || '',
    durata_anni: concession?.durata_anni?.toString() || '10',
    data_decorrenza: concession?.data_decorrenza?.split('T')[0] || '',
    partita_iva: concession?.partita_iva || '',
    cf_concessionario: concession?.cf_concessionario || '',
    ragione_sociale: concession?.ragione_sociale || '',
    nome: concession?.nome || '',
    cognome: concession?.cognome || '',
    ubicazione: concession?.ubicazione || '',
    fila: concession?.fila || '',
    mq: concession?.mq?.toString() || '',
    dimensioni_lineari: concession?.dimensioni_lineari || '',
    giorno: concession?.giorno || '',
    settore_merceologico: concession?.settore_merceologico || 'Alimentare',
    comune_rilascio: concession?.comune_rilascio || '',
    notes: concession?.notes || '',
    scia_id: concession?.scia_id?.toString() || '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcolaDataScadenza = (dataDecorrenza: string, durataAnni: string) => {
    if (!dataDecorrenza || !durataAnni) return '';
    const data = new Date(dataDecorrenza);
    data.setFullYear(data.getFullYear() + parseInt(durataAnni));
    return data.toISOString().split('T')[0];
  };

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setFormData({
        ...formData,
        company_id: companyId,
        partita_iva: company.partita_iva || '',
        cf_concessionario: company.codice_fiscale || '',
        ragione_sociale: company.denominazione || '',
      });
    } else {
      setFormData({ ...formData, company_id: companyId });
    }
  };

  const handleDelete = async () => {
    if (!concession?.id) return;
    if (!confirm('Sei sicuro di voler eliminare questa concessione?')) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/concessions/${concession.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Errore durante l\'eliminazione');
      }
      
      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = concession
        ? `${API_BASE_URL}/api/concessions/${concession.id}`
        : `${API_BASE_URL}/api/concessions`;

      const method = concession ? 'PATCH' : 'POST';

      const payload = {
        impresa_id: formData.company_id,
        stall_id: formData.stall_id,
        market_id: marketId,
        tipo_concessione: formData.tipo_concessione,
        type: formData.type,
        valid_from: formData.valida_dal || formData.data_decorrenza,
        valid_to: formData.valida_al,
        stato: formData.stato,
        numero_protocollo: formData.numero_protocollo,
        data_protocollazione: formData.data_protocollazione,
        oggetto: formData.oggetto,
        durata_anni: parseInt(formData.durata_anni) || 10,
        data_decorrenza: formData.data_decorrenza || formData.valida_dal,
        partita_iva: formData.partita_iva,
        cf_concessionario: formData.cf_concessionario,
        ragione_sociale: formData.ragione_sociale,
        nome: formData.nome,
        cognome: formData.cognome,
        ubicazione: formData.ubicazione,
        fila: formData.fila,
        mq: parseFloat(formData.mq) || null,
        dimensioni_lineari: formData.dimensioni_lineari,
        giorno: formData.giorno,
        settore_merceologico: formData.settore_merceologico,
        comune_rilascio: formData.comune_rilascio,
        notes: formData.notes,
        scia_id: formData.scia_id ? parseInt(formData.scia_id) : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || `Errore server (${response.status})`);
        }
        throw new Error(
          response.status === 404
            ? 'Endpoint non trovato. Verifica che il backend sia attivo.'
            : `Errore server (${response.status})`
        );
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // Design identico alla SCIA - sezioni in verticale scrollabile
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header sticky */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {concession ? `Concessione #${concession.id}` : 'Nuova Concessione'}
              </h3>
              <p className="text-sm text-gray-400">{marketName || `Mercato ID: ${marketId}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg">
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

          {/* SEZIONE 1: Dati Generali */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h4 className="text-cyan-400 font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dati Generali
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Numero Protocollo</label>
                <input
                  type="text"
                  value={formData.numero_protocollo}
                  onChange={(e) => setFormData({ ...formData, numero_protocollo: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                  placeholder="Es. 449021/2024"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Data Protocollazione</label>
                <input
                  type="date"
                  value={formData.data_protocollazione}
                  onChange={(e) => setFormData({ ...formData, data_protocollazione: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Comune Rilascio</label>
                <input
                  type="text"
                  value={formData.comune_rilascio}
                  onChange={(e) => setFormData({ ...formData, comune_rilascio: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                  placeholder="Es. Grosseto"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Oggetto</label>
              <textarea
                value={formData.oggetto}
                onChange={(e) => setFormData({ ...formData, oggetto: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 min-h-[80px]"
                placeholder="Oggetto della concessione..."
              />
            </div>
          </div>

          {/* SEZIONE 2: Tipo e Durata Concessione */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h4 className="text-amber-400 font-semibold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Tipo e Durata Concessione
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Tipo Concessione <span className="text-red-400">*</span></label>
                <select
                  required
                  value={formData.tipo_concessione}
                  onChange={(e) => setFormData({ ...formData, tipo_concessione: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                >
                  {TIPO_CONCESSIONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Tipo Posteggio</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                >
                  <option value="fisso">Fisso</option>
                  <option value="spunta">Spunta</option>
                  <option value="temporanea">Temporanea</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Durata (Anni)</label>
                <select
                  value={formData.durata_anni}
                  onChange={(e) => {
                    const newDurata = e.target.value;
                    const newScadenza = calcolaDataScadenza(formData.data_decorrenza || formData.valida_dal, newDurata);
                    setFormData({ ...formData, durata_anni: newDurata, valida_al: newScadenza });
                  }}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                >
                  {[1,2,3,4,5,6,7,8,9,10,12,15,20].map(n => (
                    <option key={n} value={n}>{n} Anni</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Data Decorrenza</label>
                <input
                  type="date"
                  value={formData.data_decorrenza || formData.valida_dal}
                  onChange={(e) => {
                    const newDecorrenza = e.target.value;
                    const newScadenza = calcolaDataScadenza(newDecorrenza, formData.durata_anni);
                    setFormData({ ...formData, data_decorrenza: newDecorrenza, valida_dal: newDecorrenza, valida_al: newScadenza });
                  }}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Data Scadenza</label>
                <input
                  type="date"
                  value={formData.valida_al}
                  onChange={(e) => setFormData({ ...formData, valida_al: e.target.value })}
                  className="w-full bg-gray-800/30 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Stato <span className="text-red-400">*</span></label>
                <select
                  required
                  value={formData.stato}
                  onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                >
                  {STATO_CONCESSIONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SEZIONE 3: Dati Concessionario */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h4 className="text-green-400 font-semibold mb-6 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Dati Concessionario
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Cerca Impresa <span className="text-red-400">*</span></label>
                <select
                  required
                  value={formData.company_id}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                >
                  <option value="">Seleziona impresa...</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.denominazione} - P.IVA: {company.partita_iva || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Partita IVA</label>
                <input
                  type="text"
                  value={formData.partita_iva}
                  onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                  placeholder="Partita IVA"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Codice Fiscale</label>
                <input
                  type="text"
                  value={formData.cf_concessionario}
                  onChange={(e) => setFormData({ ...formData, cf_concessionario: e.target.value.toUpperCase() })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                  placeholder="Codice Fiscale"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Ragione Sociale</label>
                <input
                  type="text"
                  value={formData.ragione_sociale}
                  onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                  placeholder="Ragione Sociale"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                  placeholder="Nome"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Cognome</label>
                <input
                  type="text"
                  value={formData.cognome}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                  placeholder="Cognome"
                />
              </div>
            </div>
          </div>

          {/* SEZIONE 4: Dati Posteggio */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h4 className="text-purple-400 font-semibold mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Dati Posteggio
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Posteggio <span className="text-red-400">*</span></label>
                <select
                  required
                  value={formData.stall_id}
                  onChange={(e) => setFormData({ ...formData, stall_id: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                >
                  <option value="">Seleziona posteggio...</option>
                  {stalls
                    .sort((a, b) => {
                      const numA = parseInt(a.code, 10);
                      const numB = parseInt(b.code, 10);
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      return a.code.localeCompare(b.code);
                    })
                    .map((stall) => (
                      <option key={stall.id} value={stall.id}>{stall.code}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Fila</label>
                <input
                  type="text"
                  value={formData.fila}
                  onChange={(e) => setFormData({ ...formData, fila: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  placeholder="Es. A, B, C"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">MQ</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.mq}
                  onChange={(e) => setFormData({ ...formData, mq: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  placeholder="Es. 25.50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Dimensioni (m x m)</label>
                <input
                  type="text"
                  value={formData.dimensioni_lineari}
                  onChange={(e) => setFormData({ ...formData, dimensioni_lineari: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  placeholder="Es. 5.00 x 5.00"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Giorno Mercato</label>
                <input
                  type="text"
                  value={formData.giorno}
                  onChange={(e) => setFormData({ ...formData, giorno: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                  placeholder="Es. Giovedì"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Settore Merceologico</label>
                <select
                  value={formData.settore_merceologico}
                  onChange={(e) => setFormData({ ...formData, settore_merceologico: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                >
                  <option value="Alimentare">Alimentare</option>
                  <option value="Non Alimentare">Non Alimentare</option>
                  <option value="Misto">Misto</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Ubicazione</label>
              <input
                type="text"
                value={formData.ubicazione}
                onChange={(e) => setFormData({ ...formData, ubicazione: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                placeholder="Ubicazione del posteggio nel mercato"
              />
            </div>
          </div>

          {/* SEZIONE 5: Note e Prescrizioni */}
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h4 className="text-orange-400 font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Note e Prescrizioni
            </h4>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-2">Note / Prescrizioni</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 min-h-[120px]"
                placeholder="Eventuali prescrizioni o note..."
              />
            </div>
            {formData.scia_id && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400">
                  <strong>Collegata a SCIA:</strong> #{formData.scia_id}
                </p>
              </div>
            )}
          </div>

          {/* Footer con pulsanti */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-700">
            {concession && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            )}
            
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                disabled={saving || deleting}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvataggio...' : 'Salva Concessione'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
