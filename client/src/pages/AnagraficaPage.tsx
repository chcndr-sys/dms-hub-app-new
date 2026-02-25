/**
 * Anagrafica Impresa - Sezione Completa
 * Pagina per gestire anagrafica, concessioni, qualificazioni, autorizzazioni, domande spunta e collaboratori
 * v4.4.0 - Implementazione completa con 6 sotto-sezioni e API reali
 * 
 * APPROCCIO CHIRURGICO: Tutto inline in un unico file, nessun file esterno creato.
 * Replica il formato della Dashboard PA con design mobile-first.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Building2, MapPin, FileText, Users, Shield, ClipboardList,
  RefreshCw, Loader2, Calendar, Phone, Globe, ChevronRight,
  CheckCircle, XCircle, Store, User, Wallet, FileCheck, Clock, TrendingUp, Trash2,
  Camera, Upload, AlertCircle, Send, Eye, FileWarning,
  Landmark, Briefcase, GraduationCap, CreditCard, Heart
} from 'lucide-react';
import { PagaConWallet } from '@/components/PagaConWallet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { addComuneIdToUrl, authenticatedFetch } from '@/hooks/useImpersonation';

// ============================================================================
// TYPES
// ============================================================================
interface ImpresaData {
  id: number;
  denominazione: string;
  partita_iva: string;
  codice_fiscale: string;
  numero_rea: string;
  cciaa_sigla: string;
  forma_giuridica: string;
  stato_impresa: string;
  indirizzo_via: string;
  indirizzo_civico: string;
  indirizzo_cap: string;
  indirizzo_provincia: string;
  comune: string;
  settore: string;
  telefono: string;
  email: string;
  pec: string;
  codice_ateco: string;
  descrizione_ateco: string;
  rappresentante_legale: string;
  rappresentante_legale_cognome: string;
  rappresentante_legale_nome: string;
  rappresentante_legale_cf: string;
  rappresentante_legale_data_nascita: string;
  rappresentante_legale_luogo_nascita: string;
  rappresentante_legale_residenza_via: string;
  rappresentante_legale_residenza_civico: string;
  rappresentante_legale_residenza_cap: string;
  rappresentante_legale_residenza_comune: string;
  rappresentante_legale_residenza_provincia: string;
  capitale_sociale: string;
  numero_addetti: number;
  sito_web: string;
  data_iscrizione_ri: string;
  data_costituzione: string;
  note: string;
  social_facebook: string;
  social_instagram: string;
  social_website: string;
  social_whatsapp: string;
  created_at: string;
  updated_at: string;
}

interface ConcessioneData {
  id: number;
  market_name: string;
  market_code: string;
  stall_number: string;
  vendor_business_name: string;
  tipo_concessione: string;
  numero_protocollo: string;
  data_protocollazione: string;
  oggetto: string;
  stato: string;
  stato_calcolato: string;
  valid_from: string;
  valid_to: string;
  settore_merceologico: string;
  comune_rilascio: string;
  durata_anni: number;
  data_decorrenza: string;
  fila: string;
  mq: number;
  dimensioni_lineari: string;
  giorno: string;
  ubicazione: string;
  cf_concessionario: string;
  partita_iva: string;
  ragione_sociale: string;
  nome: string;
  cognome: string;
  impresa_denominazione: string;
}

interface QualificazioneData {
  id: number;
  impresa_id: number;
  tipo_qualifica: string;
  ente_rilascio: string;
  numero_attestato: string;
  data_rilascio: string;
  data_scadenza: string;
  stato: string;
  note: string;
  documento_url: string;
}

interface AutorizzazioneData {
  id: number;
  numero_autorizzazione: string;
  tipo: string;
  ente_rilascio: string;
  settore: string;
  data_rilascio: string;
  data_scadenza: string;
  stato: string;
  note: string;
  company_name: string;
  company_piva: string;
  company_cf: string;
  market_name: string;
  market_municipality: string;
  stall_number: string;
  durc_valido: boolean;
  durc_data: string;
  requisiti_morali: boolean;
  requisiti_professionali: boolean;
  rappresentante_legale_nome: string;
  rappresentante_legale_cognome: string;
  rappresentante_qualita: string;
  sede_legale_via: string;
  sede_legale_cap: string;
  sede_legale_comune: string;
  sede_legale_provincia: string;
}

interface DomandaSpuntaData {
  id: number;
  stato: string;
  data_richiesta: string;
  settore_richiesto: string;
  giorno_settimana: string;
  numero_presenze: number;
  data_prima_presenza: string;
  note: string;
  company_name: string;
  company_piva: string;
  company_cf: string;
  market_name: string;
  market_municipality: string;
  market_days: string;
  numero_autorizzazione: string;
  autorizzazione_tipo: string;
  wallet_id: number;
  wallet_balance: string;
}

interface PresenzaData {
  id: number;
  session_id: number | null;
  stall_id: number;
  stall_number: string;
  area_mq: string;
  impresa_id: number;
  impresa_nome: string;
  tipo_presenza: string;
  giorno: string;
  market_name: string;
  comune: string;
  ora_accesso: string;
  ora_uscita: string;
  ora_rifiuti: string | null;
  importo_addebitato: string;
  mq_posteggio: string;
  notes: string | null;
  presenze_totali: number;
  assenze_non_giustificate: number;
  // v4.5.4: Limiti orari dal market_settings per color-coding
  limite_entrata: string | null;
  limite_rifiuti: string | null;
  limite_uscita_min: string | null;
}

interface GiustificazioneData {
  id: number;
  impresa_id: number;
  comune_id: number;
  market_id: number | null;
  giorno_mercato: string;
  tipo_giustifica: string;
  reason: string;
  justification_file_url: string;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  reviewer_notes: string;
  market_name: string | null;
  comune_name: string | null;
  impresa_nome: string | null;
  created_at: string;
  updated_at: string;
}

interface PresenzeStats {
  totale_presenze: number;
  totale_incassato: string;
  mercati_frequentati: number;
  presenze_totali_graduatoria: number;
  assenze_non_giustificate: number;
}

// ============================================================================
// HELPERS
// ============================================================================
const API_BASE_URL = MIHUB_API_BASE_URL;

const getImpresaId = (): number | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.impresa_id || null;
    }
  } catch { /* ignore */ }
  return null;
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('it-IT');
  } catch { return '-'; }
};

const getStatoBadgeClass = (stato: string | null | undefined): string => {
  switch (stato?.toUpperCase()) {
    case 'ATTIVA': case 'ACTIVE': case 'APPROVATA':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'SCADUTA': case 'EXPIRED': case 'RIFIUTATA':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'SOSPESA': case 'SUSPENDED': case 'IN_ATTESA': case 'PENDING':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'CESSATA': case 'REVOCATA': case 'CLOSED':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'DA_ASSOCIARE':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

// ============================================================================
// FIELD DISPLAY COMPONENT (inline)
// ============================================================================
function InfoField({ label, value, wide }: { label: string; value: string | number | null | undefined; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm sm:text-base text-[#e8fbff] font-medium break-words">{value || '-'}</p>
    </div>
  );
}

// ============================================================================
// SECTION CARD COMPONENT (inline) — mobile-optimized
// ============================================================================
function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/20 py-0 sm:py-4 gap-0 sm:gap-4 rounded-none sm:rounded-xl border-x-0 sm:border-x">
      <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
        <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-base sm:text-lg">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUB-SECTION: DATI IMPRESA
// ============================================================================
function DatiImpresaSection({ impresa, loading }: { impresa: ImpresaData | null; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (!impresa) return <EmptyState text="Nessun dato impresa trovato" />;

  return (
    <div className="space-y-2 sm:space-y-4">
      <SectionCard icon={Building2} title="Identit\u00e0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Denominazione" value={impresa.denominazione} />
          <InfoField label="Codice Fiscale" value={impresa.codice_fiscale} />
          <InfoField label="Partita IVA" value={impresa.partita_iva} />
          <InfoField label="Numero REA" value={impresa.numero_rea} />
          <InfoField label="CCIAA" value={impresa.cciaa_sigla} />
          <InfoField label="Forma Giuridica" value={impresa.forma_giuridica} />
          <InfoField label="Stato Impresa" value={impresa.stato_impresa} />
          <InfoField label="Settore" value={impresa.settore} />
          <InfoField label="Codice ATECO" value={impresa.codice_ateco} />
        </div>
      </SectionCard>

      <SectionCard icon={MapPin} title="Sede Legale">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Via" value={impresa.indirizzo_via} />
          <InfoField label="Civico" value={impresa.indirizzo_civico} />
          <InfoField label="CAP" value={impresa.indirizzo_cap} />
          <InfoField label="Comune" value={impresa.comune} />
          <InfoField label="Provincia" value={impresa.indirizzo_provincia} />
        </div>
      </SectionCard>

      <SectionCard icon={Phone} title="Contatti e Attivit\u00e0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Telefono" value={impresa.telefono} />
          <InfoField label="Email" value={impresa.email} />
          <InfoField label="PEC" value={impresa.pec} />
          <InfoField label="Sito Web" value={impresa.sito_web} />
          <InfoField label="Descrizione ATECO" value={impresa.descrizione_ateco} wide />
        </div>
      </SectionCard>

      <SectionCard icon={User} title="Rappresentante Legale">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Cognome" value={impresa.rappresentante_legale_cognome} />
          <InfoField label="Nome" value={impresa.rappresentante_legale_nome} />
          <InfoField label="Codice Fiscale" value={impresa.rappresentante_legale_cf} />
          <InfoField label="Data di Nascita" value={formatDate(impresa.rappresentante_legale_data_nascita)} />
          <InfoField label="Luogo di Nascita" value={impresa.rappresentante_legale_luogo_nascita} />
        </div>
      </SectionCard>

      <SectionCard icon={MapPin} title="Residenza Rappresentante Legale">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Via" value={impresa.rappresentante_legale_residenza_via} />
          <InfoField label="Civico" value={impresa.rappresentante_legale_residenza_civico} />
          <InfoField label="CAP" value={impresa.rappresentante_legale_residenza_cap} />
          <InfoField label="Comune" value={impresa.rappresentante_legale_residenza_comune} />
          <InfoField label="Provincia" value={impresa.rappresentante_legale_residenza_provincia} />
        </div>
      </SectionCard>

      <SectionCard icon={FileText} title="Dati Economici">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Capitale Sociale" value={impresa.capitale_sociale ? `\u20ac ${impresa.capitale_sociale}` : null} />
          <InfoField label="Numero Addetti" value={impresa.numero_addetti} />
          <InfoField label="Data Iscrizione RI" value={formatDate(impresa.data_iscrizione_ri)} />
          <InfoField label="Data Costituzione" value={formatDate(impresa.data_costituzione)} />
        </div>
      </SectionCard>

      {(impresa.social_facebook || impresa.social_instagram || impresa.social_whatsapp) && (
        <SectionCard icon={Globe} title="Social e Web">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <InfoField label="Facebook" value={impresa.social_facebook} />
            <InfoField label="Instagram" value={impresa.social_instagram} />
            <InfoField label="WhatsApp" value={impresa.social_whatsapp} />
            <InfoField label="Sito Web" value={impresa.social_website} />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ============================================================================
// SUB-SECTION: CONCESSIONI
// ============================================================================
function ConcessioniSection({ concessioni, loading, onSelect }: { concessioni: ConcessioneData[]; loading: boolean; onSelect: (c: ConcessioneData) => void }) {
  if (loading) return <LoadingSpinner />;
  if (concessioni.length === 0) return <EmptyState text="Nessuna concessione trovata" />;

  return (
    <div className="space-y-2 sm:space-y-3">
      {concessioni.map((c) => {
        const stato = c.stato_calcolato || c.stato || 'N/D';
        return (
          <button key={c.id} onClick={() => onSelect(c)} className="w-full text-left">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20 hover:border-[#14b8a6]/50 transition-all py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-semibold text-[#e8fbff] truncate">
                        {c.numero_protocollo || `Concessione #${c.id}`}
                      </span>
                      <Badge className={`text-[10px] sm:text-xs ${getStatoBadgeClass(stato)}`}>{stato}</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
                      {c.tipo_concessione ? c.tipo_concessione.toUpperCase() : ''} \u2014 {c.ragione_sociale || c.impresa_denominazione || 'N/A'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Store className="w-3 h-3" /> {c.market_name || '-'}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Post. {c.stall_number || '-'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(c.valid_from)} \u2192 {formatDate(c.valid_to)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function ConcessioneDetailView({ concessione, onBack }: { concessione: ConcessioneData; onBack: () => void }) {
  const stato = concessione.stato_calcolato || concessione.stato || 'N/D';
  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white px-1 sm:px-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
      </div>
      <div className="px-3 sm:px-1">
        <h3 className="text-lg sm:text-xl font-bold text-[#e8fbff] flex items-center gap-2 flex-wrap">
          {concessione.numero_protocollo || `Concessione #${concessione.id}`}
          <Badge className={getStatoBadgeClass(stato)}>{stato}</Badge>
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          {concessione.tipo_concessione?.toUpperCase() || ''} \u2014 {concessione.ragione_sociale || concessione.impresa_denominazione || 'N/A'} ({concessione.cf_concessionario || 'N/A'})
        </p>
      </div>
      <SectionCard icon={FileText} title="Dati Concessione">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Numero Protocollo" value={concessione.numero_protocollo} />
          <InfoField label="Data Protocollazione" value={formatDate(concessione.data_protocollazione)} />
          <InfoField label="Comune Rilascio" value={concessione.comune_rilascio} />
          <InfoField label="Tipo Concessione" value={concessione.tipo_concessione} />
          <InfoField label="Durata" value={concessione.durata_anni ? `${concessione.durata_anni} anni` : null} />
          <InfoField label="Settore Merceologico" value={concessione.settore_merceologico} />
          <InfoField label="Data Decorrenza" value={formatDate(concessione.data_decorrenza)} />
          <InfoField label="Scadenza" value={formatDate(concessione.valid_to)} />
          <InfoField label="Oggetto" value={concessione.oggetto} wide />
        </div>
      </SectionCard>
      <SectionCard icon={User} title="Concessionario">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Ragione Sociale" value={concessione.ragione_sociale} />
          <InfoField label="Partita IVA" value={concessione.partita_iva} />
          <InfoField label="Codice Fiscale" value={concessione.cf_concessionario} />
          <InfoField label="Nome" value={concessione.nome} />
          <InfoField label="Cognome" value={concessione.cognome} />
          <InfoField label="Settore" value={concessione.settore_merceologico} />
        </div>
      </SectionCard>
      <SectionCard icon={Store} title="Dati Posteggio e Mercato">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Mercato" value={concessione.market_name} />
          <InfoField label="Numero Posteggio" value={concessione.stall_number} />
          <InfoField label="Ubicazione" value={concessione.ubicazione || concessione.comune_rilascio} />
          <InfoField label="Giorno Mercato" value={concessione.giorno} />
          <InfoField label="Fila" value={concessione.fila} />
          <InfoField label="Dimensioni (MQ)" value={concessione.mq ? `${concessione.mq}` : null} />
          <InfoField label="Dimensioni Lineari" value={concessione.dimensioni_lineari} />
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================================
// SUB-SECTION: QUALIFICAZIONI
// ============================================================================
function QualificazioniSection({ qualificazioni, loading, impresaId }: { qualificazioni: QualificazioneData[]; loading: boolean; impresaId?: number | null }) {
  const [adempimenti, setAdempimenti] = useState<any[]>([]);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [sendingAlert, setSendingAlert] = useState(false);

  // Carica adempimenti obbligatori
  useEffect(() => {
    if (!impresaId) return;
    fetch(addComuneIdToUrl(`${API_BASE_URL}/api/adempimenti/impresa/${impresaId}`))
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.adempimenti)) {
          setAdempimenti(data.adempimenti);
        }
      })
      .catch(() => {});
  }, [impresaId]);

  // Calcola conteggi per il centro allerte
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const scadute = qualificazioni.filter(q => {
    const scadenza = q.data_scadenza ? new Date(q.data_scadenza) : null;
    return scadenza ? scadenza < now : q.stato?.toUpperCase() === 'SCADUTA';
  });
  const inScadenza = qualificazioni.filter(q => {
    const scadenza = q.data_scadenza ? new Date(q.data_scadenza) : null;
    return scadenza && scadenza >= now && scadenza <= thirtyDaysFromNow;
  });
  const mancanti = adempimenti.filter(a => a.mancante === true);
  const regolari = qualificazioni.filter(q => {
    const scadenza = q.data_scadenza ? new Date(q.data_scadenza) : null;
    if (!scadenza) return q.stato?.toUpperCase() !== 'SCADUTA';
    return scadenza > thirtyDaysFromNow;
  });

  const handleSendAlert = async (qualifica: any) => {
    if (!impresaId) return;
    setSendingAlert(true);
    try {
      // Controlla se l'impresa e' tesserata
      const tessRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/tesseramenti/impresa/${impresaId}`));
      const tessData = await tessRes.json();
      const isTestserata = tessData.success && tessData.data && tessData.data.stato === 'ATTIVO';

      if (!isTestserata) {
        alert('Non sei ancora associato a un\'associazione. Vai al tab "La Mia Associazione" per associarti e poter inviare segnalazioni.');
        setSendingAlert(false);
        setShowAlertDialog(false);
        return;
      }

      const res = await authenticatedFetch(`${API_BASE_URL}/api/notifiche/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_messaggio: 'ALLERTA_ANOMALIA',
          impresa_id: impresaId,
          anomalia: qualifica.tipo_qualifica || qualifica.tipo || 'Qualifica mancante/scaduta',
          messaggio: alertMessage || 'Richiesta assistenza per adempimento scaduto/mancante',
          data_scadenza: qualifica.data_scadenza || qualifica.dataScadenza,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Segnalazione inviata all\'associazione con successo!');
        setShowAlertDialog(false);
        setAlertMessage('');
      } else {
        alert(data.error || 'Errore invio segnalazione');
      }
    } catch {
      alert('Errore di connessione');
    } finally {
      setSendingAlert(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (qualificazioni.length === 0 && adempimenti.length === 0) return <EmptyState text="Nessuna qualificazione trovata" />;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Centro Allerte — contatori */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Card className="bg-red-500/10 border-red-500/30 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardContent className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold text-red-400">{scadute.length}</p>
            <p className="text-[9px] sm:text-xs text-red-400/70">Scadute</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/30 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardContent className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold text-orange-400">{inScadenza.length}</p>
            <p className="text-[9px] sm:text-xs text-orange-400/70">In Scadenza</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardContent className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold text-yellow-400">{mancanti.length}</p>
            <p className="text-[9px] sm:text-xs text-yellow-400/70">Mancanti</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardContent className="p-2 sm:p-3 text-center">
            <p className="text-lg sm:text-2xl font-bold text-green-400">{regolari.length}</p>
            <p className="text-[9px] sm:text-xs text-green-400/70">Regolari</p>
          </CardContent>
        </Card>
      </div>

      {/* Schede allerta per qualifiche scadute e mancanti */}
      {[...scadute.map(q => ({ ...q, alertType: 'scaduta' as const })), ...mancanti.map(a => ({ ...a, alertType: 'mancante' as const, tipo_qualifica: a.tipo }))].map((item, idx) => (
        <Card key={`alert-${idx}`} className={`py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x ${item.alertType === 'scaduta' ? 'bg-red-500/5 border-red-500/30' : 'bg-yellow-500/5 border-yellow-500/30'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.alertType === 'scaduta' ? 'text-red-400' : 'text-yellow-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#e8fbff]">{item.tipo_qualifica || 'Adempimento'}</p>
                {item.alertType === 'scaduta' && (
                  <p className="text-xs text-red-400 mt-0.5">Scaduta il {formatDate((item as any).data_scadenza)}</p>
                )}
                {item.alertType === 'mancante' && (item as any).normativa && (
                  <p className="text-xs text-[#e8fbff]/50 mt-0.5">{(item as any).normativa}</p>
                )}
                {(item as any).azioneRichiesta && (
                  <p className="text-xs text-[#e8fbff]/60 mt-1">{(item as any).azioneRichiesta}</p>
                )}
                <Button
                  size="sm"
                  className="mt-2 bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs h-7"
                  onClick={() => { setSelectedAlert(item); setShowAlertDialog(true); }}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Segnala all'Associazione e Chiedi Aiuto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog invio allerta */}
      {showAlertDialog && selectedAlert && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAlertDialog(false)}>
          <Card className="bg-[#1a2332] border-[#f59e0b]/30 w-full max-w-md py-0 gap-0" onClick={e => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#f59e0b]" />
                <h3 className="text-base font-semibold text-[#e8fbff]">Segnala Anomalia</h3>
              </div>
              <div className="bg-[#0b1220]/50 rounded-lg p-3 border border-[#f59e0b]/20">
                <p className="text-sm text-[#e8fbff]/60">Anomalia</p>
                <p className="text-base font-medium text-[#e8fbff]">{selectedAlert.tipo_qualifica || 'Adempimento mancante'}</p>
              </div>
              <div>
                <label className="text-sm text-[#e8fbff]/60 block mb-1">Messaggio aggiuntivo</label>
                <textarea
                  value={alertMessage}
                  onChange={e => setAlertMessage(e.target.value)}
                  rows={3}
                  placeholder="Descrivi il problema o la richiesta di aiuto..."
                  className="w-full bg-[#0b1220] border border-[#f59e0b]/30 rounded-lg p-3 text-[#e8fbff] resize-none focus:outline-none focus:border-[#f59e0b] text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 text-[#e8fbff]/50" onClick={() => setShowAlertDialog(false)}>Annulla</Button>
                <Button
                  className="flex-1 bg-[#f59e0b] hover:bg-[#d97706] text-white"
                  disabled={sendingAlert}
                  onClick={() => handleSendAlert(selectedAlert)}
                >
                  {sendingAlert ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Invia
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista qualificazioni esistenti */}
      {qualificazioni.map((q) => {
        // Calcola lo stato dalla data di scadenza (priorità sulle date reali, non sul campo stato DB)
        const now = new Date();
        const scadenza = q.data_scadenza ? new Date(q.data_scadenza) : null;
        const isScaduta = scadenza ? scadenza < now : (q.stato?.toUpperCase() === 'SCADUTA');
        const statoDisplay = isScaduta ? 'SCADUTA' : 'ATTIVA';
        return (
          <Card key={q.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold text-[#e8fbff]">
                      {q.tipo_qualifica || 'Qualificazione'}
                    </span>
                    <Badge className={`text-[10px] sm:text-xs ${getStatoBadgeClass(statoDisplay)}`}>{statoDisplay}</Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs sm:text-sm text-gray-400">
                      <span className="text-gray-500">Ente:</span> {q.ente_rilascio || '-'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400">
                      <span className="text-gray-500">Rilascio:</span> {formatDate(q.data_rilascio)} &mdash; <span className="text-gray-500">Scadenza:</span> {formatDate(q.data_scadenza)}
                    </p>
                    {q.numero_attestato && (
                      <p className="text-xs sm:text-sm text-gray-400">
                        <span className="text-gray-500">N. Attestato:</span> {q.numero_attestato}
                      </p>
                    )}
                    {q.note && <p className="text-xs text-gray-500 mt-1 italic">{q.note}</p>}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isScaduta ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// SUB-SECTION: AUTORIZZAZIONI
// ============================================================================
function AutorizzazioniSection({ autorizzazioni, loading, onSelect }: { autorizzazioni: AutorizzazioneData[]; loading: boolean; onSelect: (a: AutorizzazioneData) => void }) {
  if (loading) return <LoadingSpinner />;
  if (autorizzazioni.length === 0) return <EmptyState text="Nessuna autorizzazione trovata" />;

  return (
    <div className="space-y-2 sm:space-y-3">
      {autorizzazioni.map((a) => (
        <button key={a.id} onClick={() => onSelect(a)} className="w-full text-left">
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 hover:border-[#14b8a6]/50 transition-all py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold text-[#e8fbff] truncate">
                      Autorizzazione {a.numero_autorizzazione || `#${a.id}`}
                    </span>
                    <Badge className={`text-[10px] sm:text-xs ${getStatoBadgeClass(a.stato)}`}>{a.stato || 'N/D'}</Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
                    {a.tipo === 'A' ? 'TIPO A - POSTEGGIO' : a.tipo === 'B' ? 'TIPO B - ITINERANTE' : a.tipo || ''} \u2014 {a.company_name || 'N/A'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {a.ente_rilascio || '-'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(a.data_rilascio)}</span>
                    {a.settore && <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {a.settore}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

function AutorizzazioneDetailView({ autorizzazione, onBack }: { autorizzazione: AutorizzazioneData; onBack: () => void }) {
  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white px-1 sm:px-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
      </div>
      <div className="px-3 sm:px-1">
        <h3 className="text-lg sm:text-xl font-bold text-[#e8fbff] flex items-center gap-2 flex-wrap">
          Autorizzazione {autorizzazione.numero_autorizzazione || `#${autorizzazione.id}`}
          <Badge className={getStatoBadgeClass(autorizzazione.stato)}>{autorizzazione.stato || 'N/D'}</Badge>
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          {autorizzazione.tipo === 'A' ? 'TIPO A - POSTEGGIO' : autorizzazione.tipo === 'B' ? 'TIPO B - ITINERANTE' : autorizzazione.tipo || ''} \u2014 {autorizzazione.company_name || 'N/A'} ({autorizzazione.company_piva || 'N/A'})
        </p>
      </div>
      <SectionCard icon={FileText} title="Dati Generali">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="N. Autorizzazione" value={autorizzazione.numero_autorizzazione} />
          <InfoField label="Tipo" value={autorizzazione.tipo === 'A' ? 'Tipo A - Posteggio' : autorizzazione.tipo === 'B' ? 'Tipo B - Itinerante' : autorizzazione.tipo} />
          <InfoField label="Ente Rilascio" value={autorizzazione.ente_rilascio} />
          <InfoField label="Settore" value={autorizzazione.settore} />
          <InfoField label="Data Rilascio" value={formatDate(autorizzazione.data_rilascio)} />
          <InfoField label="Data Scadenza" value={formatDate(autorizzazione.data_scadenza)} />
          <InfoField label="Note" value={autorizzazione.note} wide />
        </div>
      </SectionCard>
      <SectionCard icon={User} title="Titolare">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Ragione Sociale" value={autorizzazione.company_name} />
          <InfoField label="Partita IVA" value={autorizzazione.company_piva} />
          <InfoField label="Codice Fiscale" value={autorizzazione.company_cf} />
          <InfoField label="Nome" value={autorizzazione.rappresentante_legale_nome} />
          <InfoField label="Cognome" value={autorizzazione.rappresentante_legale_cognome} />
          <InfoField label="Qualit\u00e0" value={autorizzazione.rappresentante_qualita || 'Legale Rappresentante'} />
          <InfoField label="Sede Legale" value={
            [autorizzazione.sede_legale_via, autorizzazione.sede_legale_cap, autorizzazione.sede_legale_comune, autorizzazione.sede_legale_provincia].filter(Boolean).join(', ') || null
          } wide />
        </div>
      </SectionCard>
      {autorizzazione.market_name && (
        <SectionCard icon={Store} title="Dati Mercato e Posteggio">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <InfoField label="Mercato" value={autorizzazione.market_name} />
            <InfoField label="Comune" value={autorizzazione.market_municipality} />
            <InfoField label="Posteggio" value={autorizzazione.stall_number} />
          </div>
        </SectionCard>
      )}
      <SectionCard icon={Shield} title="Requisiti e Documentazione">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">DURC Valido</p>
            <p className="text-sm sm:text-base font-medium">
              {autorizzazione.durc_valido
                ? <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> S\u00ec</span>
                : <span className="text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> No</span>}
            </p>
          </div>
          <InfoField label="Data DURC" value={formatDate(autorizzazione.durc_data)} />
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Requisiti Morali</p>
            <p className="text-sm sm:text-base font-medium">
              {autorizzazione.requisiti_morali
                ? <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verificati</span>
                : <span className="text-gray-400">-</span>}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Requisiti Professionali</p>
            <p className="text-sm sm:text-base font-medium">
              {autorizzazione.requisiti_professionali
                ? <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verificati</span>
                : <span className="text-gray-400">-</span>}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================================
// SUB-SECTION: DOMANDE SPUNTA
// ============================================================================
function DomandeSpuntaSection({ domande, loading, onSelect }: { domande: DomandaSpuntaData[]; loading: boolean; onSelect: (d: DomandaSpuntaData) => void }) {
  if (loading) return <LoadingSpinner />;
  if (domande.length === 0) return <EmptyState text="Nessuna domanda spunta trovata" />;

  return (
    <div className="space-y-2 sm:space-y-3">
      {domande.map((d) => (
        <button key={d.id} onClick={() => onSelect(d)} className="w-full text-left">
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 hover:border-[#14b8a6]/50 transition-all py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold text-[#e8fbff]">Domanda Spunta #{d.id}</span>
                    <Badge className={`text-[10px] sm:text-xs ${getStatoBadgeClass(d.stato)}`}>{d.stato || 'N/D'}</Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
                    {d.market_name || 'N/A'} \u2014 {d.company_name || 'N/A'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(d.data_richiesta)}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {d.settore_richiesto || '-'}</span>
                    {d.wallet_balance && (
                      <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> \u20ac {parseFloat(d.wallet_balance).toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}

function DomandaSpuntaDetailView({ domanda, onBack }: { domanda: DomandaSpuntaData; onBack: () => void }) {
  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white px-1 sm:px-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
        </Button>
      </div>
      <div className="px-3 sm:px-1">
        <h3 className="text-lg sm:text-xl font-bold text-[#e8fbff] flex items-center gap-2 flex-wrap">
          Domanda Spunta #{domanda.id}
          <Badge className={getStatoBadgeClass(domanda.stato)}>{domanda.stato || 'N/D'}</Badge>
        </h3>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          {domanda.market_name || 'N/A'} \u2014 {domanda.company_name || 'N/A'} ({domanda.company_piva || 'N/A'})
        </p>
      </div>
      <SectionCard icon={FileText} title="Dati Domanda">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="N. Domanda" value={`#${domanda.id}`} />
          <InfoField label="Data Richiesta" value={formatDate(domanda.data_richiesta)} />
          <InfoField label="Settore Richiesto" value={domanda.settore_richiesto} />
          <InfoField label="Giorno" value={domanda.giorno_settimana || domanda.market_days} />
          <InfoField label="Presenze" value={domanda.numero_presenze || 0} />
          <InfoField label="Data Prima Presenza" value={formatDate(domanda.data_prima_presenza)} />
          <InfoField label="Note" value={domanda.note} wide />
        </div>
      </SectionCard>
      <SectionCard icon={User} title="Impresa Richiedente">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Ragione Sociale" value={domanda.company_name} />
          <InfoField label="Partita IVA" value={domanda.company_piva} />
          <InfoField label="Codice Fiscale" value={domanda.company_cf} />
        </div>
      </SectionCard>
      <SectionCard icon={Store} title="Mercato di Riferimento">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="Mercato" value={domanda.market_name} />
          <InfoField label="Comune" value={domanda.market_municipality} />
          <InfoField label="Giorno Mercato" value={domanda.market_days} />
        </div>
      </SectionCard>
      <SectionCard icon={ClipboardList} title="Autorizzazione di Riferimento">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="N. Autorizzazione" value={domanda.numero_autorizzazione} />
          <InfoField label="Tipo" value={
            domanda.autorizzazione_tipo === 'A' ? 'Tipo A - Posteggio' :
            domanda.autorizzazione_tipo === 'B' ? 'Tipo B - Itinerante' : domanda.autorizzazione_tipo
          } />
        </div>
      </SectionCard>
      <SectionCard icon={Wallet} title="Wallet Spunta">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <InfoField label="ID Wallet" value={domanda.wallet_id} />
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Saldo</p>
            <p className={`text-base sm:text-lg font-bold ${parseFloat(domanda.wallet_balance || '0') > 0 ? 'text-green-400' : 'text-orange-400'}`}>
              \u20ac {parseFloat(domanda.wallet_balance || '0').toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Stato Wallet</p>
            <p className="text-sm sm:text-base font-medium">
              {domanda.wallet_id
                ? <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Attivo</span>
                : <span className="text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> Non creato</span>}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================================
// SUB-SECTION: COLLABORATORI (TEAM)
// Formato persona fisica: familiari, soci, dipendenti
// Con numero di telefono per autorizzazione presenze via App DMS
// ============================================================================
interface Collaboratore {
  id: string;
  nome: string;
  cognome: string;
  codice_fiscale: string;
  ruolo: 'Titolare' | 'Socio' | 'Familiare' | 'Dipendente' | 'Collaboratore';
  telefono: string;
  autorizzato_presenze: boolean;
}

function CollaboratoriSection({ impresaId, impresa }: { impresaId: number | null; impresa: ImpresaData | null }) {
  const [collaboratori, setCollaboratori] = useState<Collaboratore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!impresaId) { setLoading(false); return; }
    // Carica collaboratori dall'API DB reale, con fallback localStorage
    const loadCollaboratori = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/collaboratori?impresa_id=${impresaId}`);
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setCollaboratori(json.data.map((c: any) => ({
            id: String(c.id),
            nome: c.nome || '',
            cognome: c.cognome || '',
            codice_fiscale: c.codice_fiscale || '',
            ruolo: c.ruolo || 'Collaboratore',
            telefono: c.telefono || '',
            autorizzato_presenze: c.autorizzato_presenze ?? false,
          })));
          setLoading(false);
          return;
        }
      } catch { /* fallback a localStorage */ }

      // Fallback: localStorage
      try {
        const stored = localStorage.getItem(`team_impresa_${impresaId}`);
        if (stored) {
          setCollaboratori(JSON.parse(stored));
        } else if (impresa?.rappresentante_legale_nome && impresa?.rappresentante_legale_cognome) {
          const titolare: Collaboratore = {
            id: 'titolare-1',
            nome: impresa.rappresentante_legale_nome,
            cognome: impresa.rappresentante_legale_cognome,
            codice_fiscale: impresa.rappresentante_legale_cf || '',
            ruolo: 'Titolare',
            telefono: impresa.telefono || '',
            autorizzato_presenze: true,
          };
          setCollaboratori([titolare]);
          // Salva anche nel DB
          try {
            await authenticatedFetch(`${API_BASE_URL}/api/collaboratori`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ impresa_id: impresaId, ...titolare }),
            });
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    loadCollaboratori();
  }, [impresaId, impresa]);

  const toggleAutorizzazione = async (id: string) => {
    const collab = collaboratori.find(c => c.id === id);
    if (!collab) return;
    const updated = collaboratori.map(c => 
      c.id === id ? { ...c, autorizzato_presenze: !c.autorizzato_presenze } : c
    );
    setCollaboratori(updated);
    localStorage.setItem(`team_impresa_${impresaId}`, JSON.stringify(updated));
    // Sync con DB
    try {
      await authenticatedFetch(`${API_BASE_URL}/api/collaboratori/${id}/toggle-presenze`, { method: 'PATCH' });
    } catch { /* ignore */ }
  };

  const addCollaboratore = async () => {
    const newCollab: Collaboratore = {
      id: `collab-${Date.now()}`,
      nome: '',
      cognome: '',
      codice_fiscale: '',
      ruolo: 'Collaboratore',
      telefono: '',
      autorizzato_presenze: false,
    };
    // Salva nel DB
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/collaboratori`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impresa_id: impresaId, ...newCollab }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        newCollab.id = String(json.data.id);
      }
    } catch { /* fallback a localStorage */ }
    const updated = [...collaboratori, newCollab];
    setCollaboratori(updated);
    localStorage.setItem(`team_impresa_${impresaId}`, JSON.stringify(updated));
  };

  const updateCollaboratore = (id: string, field: keyof Collaboratore, value: string | boolean) => {
    const updated = collaboratori.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    setCollaboratori(updated);
    localStorage.setItem(`team_impresa_${impresaId}`, JSON.stringify(updated));
    // Debounced sync con DB (salva dopo 1s di inattività)
    clearTimeout((window as any).__collabSaveTimer);
    (window as any).__collabSaveTimer = setTimeout(async () => {
      const collab = updated.find(c => c.id === id);
      if (!collab) return;
      try {
        await authenticatedFetch(`${API_BASE_URL}/api/collaboratori/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collab),
        });
      } catch { /* ignore */ }
    }, 1000);
  };

  const removeCollaboratore = async (id: string) => {
    if (collaboratori.find(c => c.id === id)?.ruolo === 'Titolare') return;
    const updated = collaboratori.filter(c => c.id !== id);
    setCollaboratori(updated);
    localStorage.setItem(`team_impresa_${impresaId}`, JSON.stringify(updated));
    // Rimuovi dal DB
    try {
      await authenticatedFetch(`${API_BASE_URL}/api/collaboratori/${id}`, { method: 'DELETE' });
    } catch { /* ignore */ }
  };

  const ruoloColors: Record<string, string> = {
    'Titolare': 'bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30',
    'Socio': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Familiare': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Dipendente': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Collaboratore': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <Card className="bg-[#14b8a6]/5 border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-[#14b8a6] mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-[#e8fbff]/70">
              I collaboratori autorizzati potranno scaricare l'app DMS e registrare le presenze sui posteggi dell'impresa inserendo il numero di telefono associato.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista collaboratori */}
      {collaboratori.map((c) => (
        <Card key={c.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#14b8a6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-5 h-5 text-[#14b8a6]" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {/* Riga 1: Nome e Cognome */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome"
                      value={c.nome}
                      onChange={(e) => updateCollaboratore(c.id, 'nome', e.target.value)}
                      className="bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-2.5 py-1.5 text-sm text-[#e8fbff] placeholder-gray-600 focus:border-[#14b8a6]/50 focus:outline-none w-full"
                      readOnly={c.ruolo === 'Titolare'}
                    />
                    <input
                      type="text"
                      placeholder="Cognome"
                      value={c.cognome}
                      onChange={(e) => updateCollaboratore(c.id, 'cognome', e.target.value)}
                      className="bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-2.5 py-1.5 text-sm text-[#e8fbff] placeholder-gray-600 focus:border-[#14b8a6]/50 focus:outline-none w-full"
                      readOnly={c.ruolo === 'Titolare'}
                    />
                  </div>
                </div>
                {/* Riga 2: CF e Ruolo */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Codice Fiscale"
                    value={c.codice_fiscale}
                    onChange={(e) => updateCollaboratore(c.id, 'codice_fiscale', e.target.value.toUpperCase())}
                    className="bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#e8fbff] placeholder-gray-600 focus:border-[#14b8a6]/50 focus:outline-none uppercase"
                    maxLength={16}
                  />
                  <select
                    value={c.ruolo}
                    onChange={(e) => updateCollaboratore(c.id, 'ruolo', e.target.value)}
                    disabled={c.ruolo === 'Titolare'}
                    className="bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-2.5 py-1.5 text-xs text-[#e8fbff] focus:border-[#14b8a6]/50 focus:outline-none"
                  >
                    <option value="Titolare">Titolare</option>
                    <option value="Socio">Socio</option>
                    <option value="Familiare">Familiare</option>
                    <option value="Dipendente">Dipendente</option>
                    <option value="Collaboratore">Collaboratore</option>
                  </select>
                </div>
                {/* Riga 3: Telefono */}
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <input
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={c.telefono}
                    onChange={(e) => updateCollaboratore(c.id, 'telefono', e.target.value)}
                    className="bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-2.5 py-1.5 text-sm text-[#e8fbff] placeholder-gray-600 focus:border-[#14b8a6]/50 focus:outline-none flex-1"
                  />
                </div>
                {/* Riga 4: Badge ruolo + Autorizzato + Rimuovi */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] border ${ruoloColors[c.ruolo] || ruoloColors['Collaboratore']}`}>
                      {c.ruolo}
                    </Badge>
                    <button
                      onClick={() => toggleAutorizzazione(c.id)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                        c.autorizzato_presenze
                          ? 'bg-[#14b8a6]/15 text-[#14b8a6] border-[#14b8a6]/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {c.autorizzato_presenze ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {c.autorizzato_presenze ? 'Autorizzato' : 'Non Autoriz.'}
                    </button>
                  </div>
                  {c.ruolo !== 'Titolare' && (
                    <button
                      onClick={() => removeCollaboratore(c.id)}
                      className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pulsante Aggiungi */}
      <button
        onClick={addCollaboratore}
        className="w-full border-2 border-dashed border-[#14b8a6]/20 rounded-none sm:rounded-xl py-4 text-sm text-[#14b8a6]/60 hover:text-[#14b8a6] hover:border-[#14b8a6]/40 transition-all flex items-center justify-center gap-2"
      >
        <Users className="w-4 h-4" />
        Aggiungi Collaboratore
      </button>
    </div>
  );
}

// ============================================================================
// PRESENZE SECTION — Storico presenze giornate di mercato
// ============================================================================
function PresenzeSection({ presenze, stats, loading, onNavigateGiustifica, giustificazioni = [] }: { presenze: PresenzaData[]; stats: PresenzeStats | null; loading: boolean; onNavigateGiustifica?: (p?: PresenzaData) => void; giustificazioni?: GiustificazioneData[] }) {
  if (loading) return <LoadingSpinner />;
  
  // Raggruppa presenze per giorno + mercato
  const grouped = presenze.reduce((acc, p) => {
    const key = `${p.giorno?.split('T')[0]}_${p.market_name}`;
    if (!acc[key]) {
      acc[key] = {
        giorno: p.giorno,
        market_name: p.market_name,
        comune: p.comune,
        presenze: []
      };
    }
    acc[key].presenze.push(p);
    return acc;
  }, {} as Record<string, { giorno: string; market_name: string; comune: string; presenze: PresenzaData[] }>);

  const giornate = Object.values(grouped).sort((a, b) => 
    new Date(b.giorno).getTime() - new Date(a.giorno).getTime()
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-green-400">{stats.presenze_totali_graduatoria}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Presenze Totali</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-red-400">{stats.assenze_non_giustificate}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Assenze</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Wallet className="w-4 h-4 text-[#14b8a6]" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[#14b8a6]">&euro;{stats.totale_incassato}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Totale Pagato</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Store className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-purple-400">{stats.mercati_frequentati}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Mercati</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Giornate di mercato — lista scrollabile */}
      {giornate.length === 0 ? (
        <EmptyState text="Nessuna presenza registrata" />
      ) : (
        <div className="max-h-[60vh] sm:max-h-[65vh] overflow-y-auto space-y-3 sm:space-y-4 pr-1 scrollbar-thin">
        {giornate.map((g, idx) => {
          const dataStr = g.giorno ? new Date(g.giorno).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
          const totalePagato = g.presenze.reduce((sum, p) => sum + parseFloat(p.importo_addebitato || '0'), 0);
          
          return (
            <Card key={idx} className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x overflow-hidden">
              {/* Header giornata */}
              <div className="bg-[#14b8a6]/5 border-b border-[#14b8a6]/10 px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#14b8a6]" />
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-[#e8fbff] capitalize">{dataStr}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{g.market_name} &middot; {g.comune}</p>
                    </div>
                  </div>
                  <Badge className="bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30 text-xs">
                    &euro;{totalePagato.toFixed(2)}
                  </Badge>
                </div>
              </div>
              
              {/* Dettaglio presenze della giornata */}
              <CardContent className="p-0">
                {g.presenze.map((p, pIdx) => (
                  <div key={pIdx} className={`px-3 sm:px-4 py-2.5 sm:py-3 ${pIdx > 0 ? 'border-t border-[#14b8a6]/5' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#14b8a6]">{p.stall_number}</span>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-[#e8fbff]">Posteggio {p.stall_number}</p>
                          <p className="text-[10px] text-gray-500">{p.tipo_presenza === 'CONCESSION' ? 'Concessione' : 'Spunta'} &middot; {p.mq_posteggio} mq</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[#14b8a6]">&euro;{parseFloat(p.importo_addebitato || '0').toFixed(2)}</span>
                    </div>
                    
                    {/* Timeline orari - v4.5.4: Color-coding condizionale verde/rosso */}
                    {(() => {
                      // Funzione helper per confrontare orari HH:MM con limiti HH:MM:SS
                      const parseTime = (t: string | null) => {
                        if (!t) return null;
                        const parts = t.split(':').map(Number);
                        return parts[0] * 60 + parts[1];
                      };
                      const oraAccMin = parseTime(p.ora_accesso);
                      const limiteEntMin = parseTime(p.limite_entrata);
                      const oraRifMin = parseTime(p.ora_rifiuti);
                      const limiteRifMin = parseTime(p.limite_rifiuti);
                      const oraUscMin = parseTime(p.ora_uscita);
                      const limiteUscMin = parseTime(p.limite_uscita_min);
                      
                      // Entrata: verde se registrata E entro il limite, rosso se in ritardo o mancante
                      const entrataOk = oraAccMin !== null && (limiteEntMin === null || oraAccMin <= limiteEntMin);
                      // Rifiuti: verde se registrato E entro il limite, rosso se in ritardo o mancante
                      const rifiutiOk = oraRifMin !== null && (limiteRifMin === null || oraRifMin <= limiteRifMin);
                      // Uscita: verde se registrata E dopo il limite minimo, rosso se anticipata o mancante
                      const uscitaOk = oraUscMin !== null && (limiteUscMin === null || oraUscMin >= limiteUscMin);
                      
                      const entrataColor = p.ora_accesso ? (entrataOk ? 'text-green-400' : 'text-red-400') : 'text-gray-500';
                      const rifiutiColor = p.ora_rifiuti ? (rifiutiOk ? 'text-green-400' : 'text-red-400') : 'text-gray-500';
                      const uscitaColor = p.ora_uscita ? (uscitaOk ? 'text-green-400' : 'text-red-400') : 'text-gray-500';
                      
                      return (
                    <>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className={`bg-[#0b1220]/50 rounded-lg p-2 text-center ${p.ora_accesso && !entrataOk ? 'border border-red-500/30' : ''}`}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Clock className={`w-3 h-3 ${entrataColor}`} />
                        </div>
                        <p className={`text-xs sm:text-sm font-mono font-bold ${entrataColor}`}>{p.ora_accesso || '--:--'}</p>
                        <p className="text-[9px] text-gray-500">Entrata</p>
                        {p.limite_entrata && <p className="text-[8px] text-gray-600">max {p.limite_entrata.substring(0,5)}</p>}
                      </div>
                      <div className={`bg-[#0b1220]/50 rounded-lg p-2 text-center ${p.ora_rifiuti && !rifiutiOk ? 'border border-red-500/30' : ''}`}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Trash2 className={`w-3 h-3 ${rifiutiColor}`} />
                        </div>
                        <p className={`text-xs sm:text-sm font-mono font-bold ${rifiutiColor}`}>{p.ora_rifiuti || '--:--'}</p>
                        <p className="text-[9px] text-gray-500">Rifiuti</p>
                        {p.limite_rifiuti && <p className="text-[8px] text-gray-600">max {p.limite_rifiuti.substring(0,5)}</p>}
                      </div>
                      <div className={`bg-[#0b1220]/50 rounded-lg p-2 text-center ${p.ora_uscita && !uscitaOk ? 'border border-red-500/30' : ''}`}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <ArrowLeft className={`w-3 h-3 ${uscitaColor}`} />
                        </div>
                        <p className={`text-xs sm:text-sm font-mono font-bold ${uscitaColor}`}>{p.ora_uscita || '--:--'}</p>
                        <p className="text-[9px] text-gray-500">Uscita</p>
                        {p.limite_uscita_min && <p className="text-[8px] text-gray-600">min {p.limite_uscita_min.substring(0,5)}</p>}
                      </div>
                    </div>
                    {/* v4.5.6d: Banner uscita anticipata con stato giustifica sincronizzato */}
                    {p.ora_uscita && !uscitaOk && (() => {
                      // Cross-reference con giustificazioni per determinare lo stato
                      const giornoPresenza = p.giorno ? p.giorno.split('T')[0] : '';
                      const giustifica = giustificazioni.find(g => {
                        const giornoGiust = g.giorno_mercato ? g.giorno_mercato.split('T')[0] : '';
                        return giornoGiust === giornoPresenza && 
                          (g.market_name === p.market_name || !g.market_name);
                      });
                      
                      if (giustifica?.status === 'ACCETTATA') {
                        return (
                          <div className="w-full mt-2 flex items-center justify-between px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <span className="text-[10px] text-green-400 font-medium">✓ Giustificazione accettata</span>
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          </div>
                        );
                      } else if (giustifica?.status === 'INVIATA') {
                        return (
                          <div className="w-full mt-2 flex items-center justify-between px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <span className="text-[10px] text-yellow-400 font-medium">⏳ Giustificazione in attesa</span>
                            <Clock className="w-3 h-3 text-yellow-400" />
                          </div>
                        );
                      } else if (giustifica?.status === 'RIFIUTATA') {
                        return (
                          <button
                            onClick={() => onNavigateGiustifica?.(p)}
                            className="w-full mt-2 flex items-center justify-between px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            <span className="text-[10px] text-red-400 font-medium">✗ Rifiutata — Invia nuova giustifica</span>
                            <ArrowLeft className="w-3 h-3 text-red-400 rotate-180" />
                          </button>
                        );
                      } else {
                        return (
                          <button
                            onClick={() => onNavigateGiustifica?.(p)}
                            className="w-full mt-2 flex items-center justify-between px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            <span className="text-[10px] text-red-400 font-medium">Uscita anticipata — Da giustificare</span>
                            <ArrowLeft className="w-3 h-3 text-red-400 rotate-180" />
                          </button>
                        );
                      }
                    })()}
                    </>
                      );
                    })()}
                    
                    {/* Contatori */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#14b8a6]/5">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-[#14b8a6]" />
                        <span className="text-[10px] text-gray-400">Presenze: <span className="text-[#14b8a6] font-semibold">{p.presenze_totali}</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-400/60" />
                        <span className="text-[10px] text-gray-400">Assenze: <span className="text-red-400 font-semibold">{p.assenze_non_giustificate}</span></span>
                      </div>
                      {p.notes && (
                        <span className="text-[10px] text-yellow-400/60 ml-auto">Note: {p.notes}</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-SECTION: LA MIA ASSOCIAZIONE
// ============================================================================
function AssociazioneSection({ impresaId }: { impresaId: number | null }) {
  const [tesseramento, setTesseramento] = useState<any>(null);
  const [associazioni, setAssociazioni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssociazione, setSelectedAssociazione] = useState<any>(null);
  const [pagaOpen, setPagaOpen] = useState(false);
  const [pagaInfo, setPagaInfo] = useState<{ importo: number; descrizione: string; tipo: 'quota_associativa' | 'servizio' | 'corso'; riferimentoId?: number }>({ importo: 0, descrizione: '', tipo: 'quota_associativa' });
  const [richiestaInCorso, setRichiestaInCorso] = useState(false);

  useEffect(() => {
    if (!impresaId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        // Verifica tesseramento attivo
        const tessRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/tesseramenti/impresa/${impresaId}`));
        const tessData = await tessRes.json();
        if (tessData.success && tessData.data) {
          setTesseramento(tessData.data);
        } else {
          setTesseramento(null);
          // Carica lista associazioni disponibili
          const assocRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/associazioni/pubbliche`));
          const assocData = await assocRes.json();
          if (assocData.success && Array.isArray(assocData.data)) {
            setAssociazioni(assocData.data);
          }
        }
      } catch {
        setTesseramento(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [impresaId]);

  const [schedaPubblica, setSchedaPubblica] = useState<any>(null);
  const [loadingScheda, setLoadingScheda] = useState(false);

  // Carica scheda pubblica quando si seleziona un'associazione
  const viewSchedaPubblica = async (assoc: any) => {
    setSelectedAssociazione(assoc);
    setLoadingScheda(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${assoc.id}/scheda-pubblica`);
      const data = await res.json();
      if (data.success && data.data) {
        setSchedaPubblica(data.data);
      } else {
        setSchedaPubblica(null);
      }
    } catch {
      setSchedaPubblica(null);
    } finally {
      setLoadingScheda(false);
    }
  };

  // Flusso "Associati e Paga" — apre PagaConWallet con quota
  const handleAssociatiEPaga = (assoc: any) => {
    const quota = parseFloat(assoc.quota_annuale || '50');
    setPagaInfo({
      importo: quota,
      descrizione: `Quota Associativa ${new Date().getFullYear()} — ${assoc.nome}`,
      tipo: 'quota_associativa',
      riferimentoId: assoc.id,
    });
    setPagaOpen(true);
  };

  // Al successo del pagamento, crea tesseramento diretto
  const onPagamentoSuccess = async () => {
    if (!impresaId || !selectedAssociazione) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/tesseramenti/richiedi-e-paga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          impresa_id: impresaId,
          associazione_id: selectedAssociazione.id,
          pagamento_confermato: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTesseramento(data.data || { stato: 'ATTIVO', associazione_nome: selectedAssociazione.nome, quota_pagata: true });
      }
    } catch {
      // Fallback: il pagamento è andato, mostra comunque come attivo
      setTesseramento({ stato: 'ATTIVO', associazione_nome: selectedAssociazione?.nome, quota_pagata: true });
    }
  };

  // Fallback: richiesta senza pagamento (flusso legacy)
  const handleRichiestaAssociazione = async (associazioneId: number) => {
    if (!impresaId) return;
    setRichiestaInCorso(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/tesseramenti/richiedi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impresa_id: impresaId, associazione_id: associazioneId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Richiesta di adesione inviata con successo! Sarai contattato dall\'associazione.');
        setTesseramento(data.data || { stato: 'IN_ATTESA' });
      } else {
        alert(data.error || 'Errore richiesta adesione');
      }
    } catch {
      alert('Errore di connessione');
    } finally {
      setRichiestaInCorso(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Impresa tesserata
  if (tesseramento && tesseramento.stato === 'ATTIVO') {
    return (
      <div className="space-y-3 sm:space-y-4">
        <SectionCard icon={Landmark} title="La Mia Associazione">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#e8fbff]">{tesseramento.associazione_nome || 'Associazione'}</p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Tesserato</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <InfoField label="N. Tessera" value={tesseramento.numero_tessera} />
              <InfoField label="Scadenza" value={formatDate(tesseramento.data_scadenza)} />
              <InfoField label="Stato Tesseramento" value={tesseramento.stato} />
            </div>
            {/* Quota annuale */}
            <div className="bg-[#0b1220]/50 rounded-lg p-3 border border-[#14b8a6]/10 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/50">Quota Annuale</p>
                <p className="text-base font-bold text-[#e8fbff]">&euro;{parseFloat(tesseramento.quota_annuale || '0').toFixed(2)}</p>
              </div>
              <Badge className={tesseramento.quota_pagata ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}>
                {tesseramento.quota_pagata ? 'Pagata' : 'Da Pagare'}
              </Badge>
            </div>
            {/* Azioni */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10">
                <Send className="w-3 h-3 mr-1" /> Contatta
              </Button>
              <Button size="sm" variant="outline" className="border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/10">
                <Briefcase className="w-3 h-3 mr-1" /> Richiedi Servizio
              </Button>
              {!tesseramento.quota_pagata && (
                <Button
                  size="sm"
                  className="bg-[#10b981] hover:bg-[#059669] text-white"
                  onClick={() => {
                    setPagaInfo({ importo: parseFloat(tesseramento.quota_annuale || '50'), descrizione: `Quota Associativa ${new Date().getFullYear()} — ${tesseramento.associazione_nome}`, tipo: 'quota_associativa', riferimentoId: tesseramento.id });
                    setPagaOpen(true);
                  }}
                >
                  <Wallet className="w-3 h-3 mr-1" /> Rinnova Quota
                </Button>
              )}
            </div>
            {/* Delega procuratore */}
            <div className="bg-[#0b1220]/30 rounded-lg p-3 border border-[#14b8a6]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#14b8a6]" />
                <span className="text-sm text-[#e8fbff]/70">Delega come Procuratore</span>
              </div>
              <input type="checkbox" className="w-4 h-4 rounded" defaultChecked={tesseramento.delega_procuratore} />
            </div>
          </div>
        </SectionCard>
        <PagaConWallet open={pagaOpen} onClose={() => setPagaOpen(false)} importo={pagaInfo.importo} descrizione={pagaInfo.descrizione} tipo={pagaInfo.tipo} riferimentoId={pagaInfo.riferimentoId} impresaId={impresaId} onSuccess={() => { setTesseramento({ ...tesseramento, quota_pagata: true }); }} />
      </div>
    );
  }

  // Impresa NON tesserata
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Banner vantaggi */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-[#14b8a6]/10 border-emerald-500/30 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Heart className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-base font-semibold text-[#e8fbff] mb-1">Unisciti a un'Associazione</h3>
              <p className="text-sm text-[#e8fbff]/60">
                Le associazioni di categoria offrono assistenza burocratica, corsi di formazione,
                servizi DURC/SCIA, e rappresentanza presso la PA. Associandoti avrai accesso
                a tariffe agevolate e supporto dedicato.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheda pubblica dell'associazione selezionata */}
      {selectedAssociazione && (
        <Card className="bg-[#1a2332] border-emerald-500/30 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[#e8fbff]">{selectedAssociazione.nome}</p>
                  {selectedAssociazione.sigla && <p className="text-xs text-[#e8fbff]/50">{selectedAssociazione.sigla}</p>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedAssociazione(null); setSchedaPubblica(null); }}
                className="text-[#e8fbff]/50 text-xs">Chiudi</Button>
            </div>

            {loadingScheda ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-400" /></div>
            ) : schedaPubblica ? (
              <div className="space-y-3">
                {schedaPubblica.descrizione && (
                  <p className="text-sm text-[#e8fbff]/70">{schedaPubblica.descrizione}</p>
                )}
                {schedaPubblica.benefici?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#e8fbff]/50 mb-1">Vantaggi per gli associati</p>
                    <ul className="space-y-1">
                      {schedaPubblica.benefici.map((b: string, i: number) => (
                        <li key={i} className="text-xs text-[#e8fbff]/70 flex items-center gap-1">
                          <span className="text-emerald-400">&#10003;</span> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {schedaPubblica.contatti?.telefono && (
                  <p className="text-xs text-[#e8fbff]/50">Tel: {schedaPubblica.contatti.telefono}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#e8fbff]/40 italic">Informazioni non ancora disponibili</p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#e8fbff]/10">
              <div className="text-xs text-[#e8fbff]/50">
                Quota: <span className="text-[#e8fbff] font-bold">&euro;{parseFloat(selectedAssociazione.quota_annuale || '50').toFixed(2)}/anno</span>
              </div>
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                onClick={() => handleAssociatiEPaga(selectedAssociazione)}>
                <Wallet className="w-3 h-3 mr-1" /> Associati e Paga
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista associazioni */}
      {associazioni.length === 0 ? (
        <EmptyState text="Nessuna associazione disponibile al momento" />
      ) : (
        associazioni.map((assoc) => (
          <Card key={assoc.id} className="bg-[#1a2332] border-[#14b8a6]/20 hover:border-[#14b8a6]/40 transition-all py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x cursor-pointer"
            onClick={() => viewSchedaPubblica(assoc)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-[#e8fbff]">{assoc.nome}</p>
                  {assoc.descrizione && <p className="text-xs text-[#e8fbff]/50 mt-1 line-clamp-2">{assoc.descrizione}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                    {assoc.quota_annuale && <span>Quota: &euro;{parseFloat(assoc.quota_annuale).toFixed(2)}/anno</span>}
                    {assoc.servizi_count && <span>{assoc.servizi_count} servizi</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-7"
                      onClick={(e) => { e.stopPropagation(); handleAssociatiEPaga(assoc); }}>
                      <Wallet className="w-3 h-3 mr-1" /> Associati e Paga
                    </Button>
                    <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs h-7"
                      disabled={richiestaInCorso}
                      onClick={(e) => { e.stopPropagation(); handleRichiestaAssociazione(assoc.id); }}>
                      {richiestaInCorso ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Heart className="w-3 h-3 mr-1" />}
                      Solo Richiesta
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <PagaConWallet open={pagaOpen} onClose={() => setPagaOpen(false)} importo={pagaInfo.importo} descrizione={pagaInfo.descrizione} tipo={pagaInfo.tipo} riferimentoId={pagaInfo.riferimentoId} impresaId={impresaId} onSuccess={onPagamentoSuccess} />
    </div>
  );
}

// ============================================================================
// SUB-SECTION: SERVIZI
// ============================================================================
function ServiziSection({ impresaId }: { impresaId: number | null }) {
  const [servizi, setServizi] = useState<any[]>([]);
  const [richieste, setRichieste] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'catalogo' | 'richieste'>('catalogo');
  const [pagaOpen, setPagaOpen] = useState(false);
  const [pagaInfo, setPagaInfo] = useState<{ importo: number; descrizione: string; riferimentoId?: number }>({ importo: 0, descrizione: '' });

  useEffect(() => {
    if (!impresaId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        // Carica catalogo servizi (endpoint gia' esistente)
        const servRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/bandi/servizi`));
        const servData = await servRes.json();
        if (servData.success && Array.isArray(servData.data)) {
          setServizi(servData.data);
        }
        // Carica le mie richieste (endpoint gia' esistente)
        const richRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/bandi/richieste?impresa_id=${impresaId}`));
        const richData = await richRes.json();
        if (richData.success && Array.isArray(richData.data)) {
          setRichieste(richData.data);
        }
      } catch { /* silenzioso */ }
      setLoading(false);
    };
    load();
  }, [impresaId]);

  const handleRichiestaServizio = async (servizio: any) => {
    if (!impresaId) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/bandi/richieste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impresa_id: impresaId, servizio_id: servizio.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Richiesta servizio inviata!');
        setRichieste(prev => [...prev, data.data || { id: Date.now(), servizio_nome: servizio.nome, stato: 'RICHIESTA', created_at: new Date().toISOString() }]);
        // Offri pagamento se ha un prezzo
        if (servizio.prezzo_associati || servizio.prezzo_base) {
          setPagaInfo({
            importo: parseFloat(servizio.prezzo_associati || servizio.prezzo_base || '0'),
            descrizione: `Servizio: ${servizio.nome}`,
            riferimentoId: servizio.id,
          });
          setPagaOpen(true);
        }
      } else {
        alert(data.error || 'Errore invio richiesta');
      }
    } catch {
      alert('Errore di connessione');
    }
  };

  if (loading) return <LoadingSpinner />;

  const getStatoRichiestaColor = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'RICHIESTA': return 'bg-blue-500/20 text-blue-400';
      case 'IN_LAVORAZIONE': return 'bg-yellow-500/20 text-yellow-400';
      case 'COMPLETATA': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('catalogo')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${subTab === 'catalogo' ? 'bg-[#14b8a6] text-white' : 'bg-[#1a2332] text-[#e8fbff]/60 hover:text-[#e8fbff]'}`}
        >
          Catalogo Servizi
        </button>
        <button
          onClick={() => setSubTab('richieste')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${subTab === 'richieste' ? 'bg-[#14b8a6] text-white' : 'bg-[#1a2332] text-[#e8fbff]/60 hover:text-[#e8fbff]'}`}
        >
          Le Mie Richieste ({richieste.length})
        </button>
      </div>

      {subTab === 'catalogo' && (
        servizi.length === 0 ? (
          <EmptyState text="Nessun servizio disponibile" />
        ) : (
          servizi.map((s) => (
            <Card key={s.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-[#e8fbff]">{s.nome}</p>
                    {s.categoria && <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] text-xs mt-1">{s.categoria}</Badge>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      {s.prezzo_base && <span>Prezzo: &euro;{parseFloat(s.prezzo_base).toFixed(2)}</span>}
                      {s.prezzo_associati && <span className="text-emerald-400">Soci: &euro;{parseFloat(s.prezzo_associati).toFixed(2)}</span>}
                      {s.tempo_medio && <span>Tempo: {s.tempo_medio}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white text-xs h-8"
                    onClick={() => handleRichiestaServizio(s)}
                  >
                    <Briefcase className="w-3 h-3 mr-1" /> Richiedi
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )
      )}

      {subTab === 'richieste' && (
        richieste.length === 0 ? (
          <EmptyState text="Nessuna richiesta di servizio effettuata" />
        ) : (
          richieste.map((r) => (
            <Card key={r.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#e8fbff]">{r.servizio_nome || `Richiesta #${r.id}`}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(r.created_at)}</p>
                  </div>
                  <Badge className={getStatoRichiestaColor(r.stato)}>{r.stato}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )
      )}

      <PagaConWallet open={pagaOpen} onClose={() => setPagaOpen(false)} importo={pagaInfo.importo} descrizione={pagaInfo.descrizione} tipo="servizio" riferimentoId={pagaInfo.riferimentoId} impresaId={impresaId} />
    </div>
  );
}

// ============================================================================
// SUB-SECTION: FORMAZIONE
// ============================================================================
function FormazioneSection({ impresaId, qualificazioni }: { impresaId: number | null; qualificazioni: QualificazioneData[] }) {
  const [corsi, setCorsi] = useState<any[]>([]);
  const [iscrizioni, setIscrizioni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'attestati' | 'corsi' | 'iscrizioni'>('attestati');
  const [pagaOpen, setPagaOpen] = useState(false);
  const [pagaInfo, setPagaInfo] = useState<{ importo: number; descrizione: string; riferimentoId?: number }>({ importo: 0, descrizione: '' });

  useEffect(() => {
    if (!impresaId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        // Carica corsi disponibili (endpoint gia' esistente)
        const corsiRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/formazione/corsi`));
        const corsiData = await corsiRes.json();
        if (corsiData.success && Array.isArray(corsiData.data)) {
          setCorsi(corsiData.data);
        }
        // Carica le mie iscrizioni (endpoint gia' esistente)
        const iscrRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/formazione/iscrizioni?impresa_id=${impresaId}`));
        const iscrData = await iscrRes.json();
        if (iscrData.success && Array.isArray(iscrData.data)) {
          setIscrizioni(iscrData.data);
        }
      } catch { /* silenzioso */ }
      setLoading(false);
    };
    load();
  }, [impresaId]);

  const handleIscrizione = async (corso: any) => {
    if (!impresaId) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/formazione/iscrizioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impresa_id: impresaId, corso_id: corso.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Iscrizione al corso completata!');
        setIscrizioni(prev => [...prev, data.data || { id: Date.now(), corso_nome: corso.nome, stato: 'ISCRITTO', created_at: new Date().toISOString() }]);
        // Pagamento se il corso ha un prezzo
        if (corso.prezzo && parseFloat(corso.prezzo) > 0) {
          setPagaInfo({
            importo: parseFloat(corso.prezzo),
            descrizione: `Iscrizione: ${corso.nome}`,
            riferimentoId: corso.id,
          });
          setPagaOpen(true);
        }
      } else {
        alert(data.error || 'Errore iscrizione');
      }
    } catch {
      alert('Errore di connessione');
    }
  };

  if (loading) return <LoadingSpinner />;

  // Raggruppa qualificazioni per tipo (attestati)
  const attestatiPerTipo = qualificazioni.reduce((acc, q) => {
    const tipo = q.tipo_qualifica || 'Altro';
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(q);
    return acc;
  }, {} as Record<string, QualificazioneData[]>);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setSubTab('attestati')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${subTab === 'attestati' ? 'bg-[#14b8a6] text-white' : 'bg-[#1a2332] text-[#e8fbff]/60 hover:text-[#e8fbff]'}`}
        >
          I Miei Attestati ({qualificazioni.length})
        </button>
        <button
          onClick={() => setSubTab('corsi')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${subTab === 'corsi' ? 'bg-[#14b8a6] text-white' : 'bg-[#1a2332] text-[#e8fbff]/60 hover:text-[#e8fbff]'}`}
        >
          Corsi Disponibili ({corsi.length})
        </button>
        <button
          onClick={() => setSubTab('iscrizioni')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${subTab === 'iscrizioni' ? 'bg-[#14b8a6] text-white' : 'bg-[#1a2332] text-[#e8fbff]/60 hover:text-[#e8fbff]'}`}
        >
          Le Mie Iscrizioni ({iscrizioni.length})
        </button>
      </div>

      {subTab === 'attestati' && (
        Object.keys(attestatiPerTipo).length === 0 ? (
          <EmptyState text="Nessun attestato registrato" />
        ) : (
          Object.entries(attestatiPerTipo).map(([tipo, items]) => (
            <SectionCard key={tipo} icon={FileCheck} title={tipo}>
              <div className="space-y-2">
                {items.map(q => {
                  const scadenza = q.data_scadenza ? new Date(q.data_scadenza) : null;
                  const isScaduta = scadenza ? scadenza < new Date() : q.stato?.toUpperCase() === 'SCADUTA';
                  return (
                    <div key={q.id} className="flex items-center justify-between p-2 bg-[#0b1220]/30 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm text-[#e8fbff]">{q.ente_rilascio || '-'}</p>
                        <p className="text-xs text-gray-500">N. {q.numero_attestato || '-'} — Scadenza: {formatDate(q.data_scadenza)}</p>
                      </div>
                      {isScaduta ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ))
        )
      )}

      {subTab === 'corsi' && (
        corsi.length === 0 ? (
          <EmptyState text="Nessun corso disponibile" />
        ) : (
          corsi.map((c) => (
            <Card key={c.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-[#e8fbff]">{c.nome}</p>
                    {c.ente && <p className="text-xs text-gray-400 mt-0.5">{c.ente}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      {c.data && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(c.data)}</span>}
                      {c.durata && <span>{c.durata}</span>}
                      {c.sede && <span>{c.sede}</span>}
                      {c.posti && <span>Posti: {c.posti}</span>}
                    </div>
                    {c.prezzo && <p className="text-xs text-[#14b8a6] font-medium mt-1">&euro;{parseFloat(c.prezzo).toFixed(2)}</p>}
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-8"
                    onClick={() => handleIscrizione(c)}
                  >
                    <GraduationCap className="w-3 h-3 mr-1" /> Iscriviti
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )
      )}

      {subTab === 'iscrizioni' && (
        iscrizioni.length === 0 ? (
          <EmptyState text="Nessuna iscrizione a corsi" />
        ) : (
          iscrizioni.map((i) => (
            <Card key={i.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#e8fbff]">{i.corso_nome || `Iscrizione #${i.id}`}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(i.created_at)}</p>
                  </div>
                  <Badge className={i.stato === 'COMPLETATO' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}>
                    {i.stato || 'ISCRITTO'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )
      )}

      <PagaConWallet open={pagaOpen} onClose={() => setPagaOpen(false)} importo={pagaInfo.importo} descrizione={pagaInfo.descrizione} tipo="corso" riferimentoId={pagaInfo.riferimentoId} impresaId={impresaId} />
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-[#14b8a6] animate-spin" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="bg-[#1a2332]/50 border-[#14b8a6]/10 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
      <CardContent className="p-6 sm:p-8 text-center">
        <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm sm:text-base text-gray-500">{text}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// GIUSTIFICAZIONI SECTION — Upload certificati medici / giustifiche uscite anticipate
// ============================================================================
function GiustificazioniSection({ impresaId, giustificazioni, concessioni, onRefresh, prefill, onPrefillConsumed }: { impresaId: number | null; giustificazioni: GiustificazioneData[]; concessioni: ConcessioneData[]; onRefresh: () => void; prefill?: { market_name: string; stall_number: string; giorno: string; comune: string } | null; onPrefillConsumed?: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    giorno_mercato: new Date().toISOString().split('T')[0],
    tipo_giustifica: 'certificato_medico',
    reason: '',
    concessione_idx: '', // indice nella lista concessioni per selezionare comune/mercato
    posteggio_idx: '', // v4.5.6: indice del posteggio selezionato
  });

  // v4.5.6: Estrai lista unica di comuni/mercati dalle concessioni attive (deduplicata per market_name)
  // Ora include market_id per derivare il comune_id corretto
  const comuniMercati = concessioni
    .filter(c => c.stato_calcolato === 'ATTIVA' || c.stato === 'ATTIVA')
    .reduce((acc, c) => {
      const key = `${c.market_name || ''}_${c.comune_rilascio || ''}`;
      if (!acc.find(x => `${x.market_name || ''}_${x.comune_rilascio || ''}` === key)) {
        acc.push({
          idx: acc.length,
          label: `${c.market_name || 'Mercato N/D'} - ${c.comune_rilascio || 'Comune N/D'}`,
          market_name: c.market_name,
          comune_rilascio: c.comune_rilascio,
          market_id: (c as any).market_id || null,
        });
      }
      return acc;
    }, [] as { idx: number; label: string; market_name: string; comune_rilascio: string; market_id: number | null }[]);

  // v4.5.6b: Pre-compilazione dal banner presenze (approccio robusto con ref)
  const prefillApplied = useRef(false);
  useEffect(() => {
    // Reset flag quando arriva un nuovo prefill
    if (prefill) prefillApplied.current = false;
  }, [prefill]);
  
  useEffect(() => {
    if (!prefill || prefillApplied.current || comuniMercati.length === 0) return;
    
    // Trova il mercato corrispondente (confronto case-insensitive)
    const mercatoIdx = comuniMercati.findIndex(cm => {
      const nameMatch = cm.market_name && prefill.market_name && 
        cm.market_name.toLowerCase() === prefill.market_name.toLowerCase();
      const comuneMatch = cm.comune_rilascio && prefill.comune &&
        cm.comune_rilascio.toLowerCase() === prefill.comune.toLowerCase();
      return nameMatch || comuneMatch;
    });
    
    // Converti giorno da ISO (2026-02-09T00:00:00.000Z) a YYYY-MM-DD
    const giornoClean = prefill.giorno ? prefill.giorno.split('T')[0] : new Date().toISOString().split('T')[0];
    
    if (mercatoIdx >= 0) {
      // Trova il posteggio corrispondente
      const filteredConc = concessioni.filter(c => 
        (c.stato_calcolato === 'ATTIVA' || c.stato === 'ATTIVA') && 
        c.market_name === comuniMercati[mercatoIdx].market_name && 
        c.comune_rilascio === comuniMercati[mercatoIdx].comune_rilascio
      );
      const postIdx = filteredConc.findIndex(c => String(c.stall_number) === String(prefill.stall_number));
      
      setFormData({
        concessione_idx: String(mercatoIdx),
        giorno_mercato: giornoClean,
        tipo_giustifica: 'uscita_anticipata',
        reason: '',
        posteggio_idx: postIdx >= 0 ? String(postIdx) : '',
      });
    } else {
      // Mercato non trovato, apri il form con la data precompilata
      setFormData(prev => ({
        ...prev,
        giorno_mercato: giornoClean,
        tipo_giustifica: 'uscita_anticipata',
      }));
    }
    setShowForm(true);
    prefillApplied.current = true;
    onPrefillConsumed?.();
  }, [prefill, comuniMercati.length, concessioni]);

  // v4.5.6: Filtra i posteggi disponibili per il mercato selezionato
  const selectedMercato = formData.concessione_idx !== '' ? comuniMercati[Number(formData.concessione_idx)] : null;
  const posteggiFiltrati = selectedMercato 
    ? concessioni.filter(c => 
        (c.stato_calcolato === 'ATTIVA' || c.stato === 'ATTIVA') && 
        c.market_name === selectedMercato.market_name && 
        c.comune_rilascio === selectedMercato.comune_rilascio
      )
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!impresaId || !selectedFile) return;
    setSending(true);
    try {
      // v4.5.6: Recupera comune_id dal mercato della concessione selezionata (non più dal localStorage)
      const selectedConc = formData.concessione_idx !== '' ? comuniMercati[Number(formData.concessione_idx)] : null;
      const selectedPost = formData.posteggio_idx !== '' ? posteggiFiltrati[Number(formData.posteggio_idx)] : null;
      
      // Recupera comune_id dal market_id della concessione selezionata via API
      let comuneId = null;
      if (selectedConc?.market_id) {
        try {
          const mktRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/markets/${selectedConc.market_id}`));
          const mktData = await mktRes.json();
          const mkt = mktData?.data || mktData;
          const mktObj = Array.isArray(mkt) ? mkt[0] : mkt;
          comuneId = mktObj?.comune_id || null;
        } catch { /* fallback */ }
      }

      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('impresa_id', String(impresaId));
      fd.append('comune_id', String(comuneId));
      fd.append('giorno_mercato', formData.giorno_mercato);
      fd.append('tipo_giustifica', formData.tipo_giustifica);
      fd.append('reason', formData.reason);
      if (selectedConc) {
        fd.append('market_name', selectedConc.market_name || '');
        fd.append('comune_name', selectedConc.comune_rilascio || '');
        if (selectedConc.market_id) fd.append('market_id', String(selectedConc.market_id));
      }
      if (selectedPost) {
        fd.append('stall_number', selectedPost.stall_number || '');
      }

      const res = await authenticatedFetch(`${API_BASE_URL}/api/giustificazioni`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setShowForm(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setFormData({ giorno_mercato: new Date().toISOString().split('T')[0], tipo_giustifica: 'certificato_medico', reason: '', concessione_idx: '', posteggio_idx: '' });
        onRefresh();
      } else {
        alert(json.error || json.message || 'Errore invio giustifica');
      }
    } catch (err: any) {
      console.error('Errore invio giustifica:', err);
      alert(`Errore: ${err?.message || 'Connessione al server non riuscita. Verifica la connessione internet e riprova.'}`);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'INVIATA': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'ACCETTATA': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'RIFIUTATA': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'INVIATA': return 'In Attesa';
      case 'ACCETTATA': return 'Accettata';
      case 'RIFIUTATA': return 'Rifiutata';
      default: return status;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'certificato_medico': return 'Certificato Medico';
      case 'uscita_anticipata': return 'Uscita Anticipata';
      case 'altro': return 'Altro';
      default: return tipo;
    }
  };

  const pendenti = giustificazioni.filter(g => g.status === 'INVIATA').length;
  const accettate = giustificazioni.filter(g => g.status === 'ACCETTATA').length;
  const rifiutate = giustificazioni.filter(g => g.status === 'RIFIUTATA').length;

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <Card className="bg-[#14b8a6]/5 border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#14b8a6] mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-[#e8fbff]/70">
              Invia certificati medici o giustificazioni per uscite anticipate dal mercato. I documenti saranno esaminati dalla Polizia Municipale.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {giustificazioni.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-[#1a2332] border-yellow-500/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-lg sm:text-2xl font-bold text-yellow-400">{pendenti}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">In Attesa</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-green-500/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-lg sm:text-2xl font-bold text-green-400">{accettate}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Accettate</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-red-500/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
            <CardContent className="p-2 sm:p-3 text-center">
              <p className="text-lg sm:text-2xl font-bold text-red-400">{rifiutate}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Rifiutate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pulsante Nuova Giustifica */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-gradient-to-r from-[#14b8a6] to-[#0ea5e9] text-white font-medium py-3 rounded-none sm:rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <Camera className="w-5 h-5" />
          Invia Giustificazione
        </button>
      )}

      {/* Form Nuova Giustifica */}
      {showForm && (
        <Card className="bg-[#1a2332] border-[#14b8a6]/30 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-6">
            <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-base">
              <Send className="w-4 h-4" />
              Nuova Giustificazione
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-3">
            {/* Selettore Comune/Mercato */}
            {comuniMercati.length > 0 && (
              <div>
                <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Comune / Mercato</label>
                <select
                  value={formData.concessione_idx}
                  onChange={(e) => setFormData({ ...formData, concessione_idx: e.target.value, posteggio_idx: '' })}
                  className="w-full bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff] focus:border-[#14b8a6]/50 focus:outline-none mt-1"
                >
                  <option value="">Seleziona mercato...</option>
                  {comuniMercati.map((cm) => (
                    <option key={cm.idx} value={String(cm.idx)}>{cm.label}</option>
                  ))}
                </select>
              </div>
            )}
            {/* v4.5.6: Selettore Posteggio (filtrato per mercato selezionato) */}
            {posteggiFiltrati.length > 0 && (
              <div>
                <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Posteggio</label>
                <select
                  value={formData.posteggio_idx}
                  onChange={(e) => setFormData({ ...formData, posteggio_idx: e.target.value })}
                  className="w-full bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff] focus:border-[#14b8a6]/50 focus:outline-none mt-1"
                >
                  <option value="">Seleziona posteggio...</option>
                  {posteggiFiltrati.map((p, i) => (
                    <option key={`post-${i}`} value={String(i)}>Post. {p.stall_number} — {p.settore_merceologico || 'N/D'}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Data mercato */}
            <div>
              <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Giorno Mercato</label>
              <input
                type="date"
                value={formData.giorno_mercato}
                onChange={(e) => setFormData({ ...formData, giorno_mercato: e.target.value })}
                className="w-full bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff] focus:border-[#14b8a6]/50 focus:outline-none mt-1"
              />
            </div>
            {/* Tipo giustifica */}
            <div>
              <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Tipo Giustificazione</label>
              <select
                value={formData.tipo_giustifica}
                onChange={(e) => setFormData({ ...formData, tipo_giustifica: e.target.value })}
                className="w-full bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff] focus:border-[#14b8a6]/50 focus:outline-none mt-1"
              >
                <option value="certificato_medico">Certificato Medico</option>
                <option value="uscita_anticipata">Uscita Anticipata</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            {/* Motivo */}
            <div>
              <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Motivo (opzionale)</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Descrivi brevemente il motivo..."
                rows={2}
                className="w-full bg-[#0b1220] border border-[#14b8a6]/20 rounded-lg px-3 py-2 text-sm text-[#e8fbff] placeholder-gray-600 focus:border-[#14b8a6]/50 focus:outline-none mt-1 resize-none"
              />
            </div>
            {/* Upload file */}
            <div>
              <label className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Documento / Foto Certificato</label>
              <div className="mt-1">
                {!selectedFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-[#14b8a6]/20 rounded-lg cursor-pointer hover:border-[#14b8a6]/40 transition-all bg-[#0b1220]/50">
                    <Upload className="w-8 h-8 text-[#14b8a6]/40 mb-1" />
                    <span className="text-xs text-gray-500">Tocca per caricare foto o PDF</span>
                    <span className="text-[10px] text-gray-600 mt-0.5">JPG, PNG, PDF — max 10MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="bg-[#0b1220]/50 border border-[#14b8a6]/20 rounded-lg p-3">
                    {previewUrl && (
                      <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#14b8a6] flex-shrink-0" />
                        <span className="text-xs text-[#e8fbff] truncate">{selectedFile.name}</span>
                      </div>
                      <button
                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                        className="text-[10px] text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
                      >
                        Rimuovi
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Azioni */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowForm(false); setSelectedFile(null); setPreviewUrl(null); }}
                className="flex-1 bg-gray-700/50 text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedFile || sending}
                className="flex-1 bg-gradient-to-r from-[#14b8a6] to-[#0ea5e9] text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Invio...' : 'Invia'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storico giustifiche */}
      {giustificazioni.length === 0 ? (
        <EmptyState text="Nessuna giustificazione inviata" />
      ) : (
        <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {giustificazioni.map((g) => (
            <Card key={g.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#14b8a6]/10 flex items-center justify-center">
                      <FileWarning className="w-4 h-4 text-[#14b8a6]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#e8fbff]">{getTipoLabel(g.tipo_giustifica)}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(g.giorno_mercato)}{g.market_name ? ` — ${g.market_name}` : ''}</p>
                    </div>
                  </div>
                  <Badge className={`text-[10px] border ${getStatusBadge(g.status)}`}>
                    {getStatusLabel(g.status)}
                  </Badge>
                </div>
                {g.reason && (
                  <p className="text-xs text-gray-400 mb-2 pl-10">{g.reason}</p>
                )}
                <div className="flex items-center justify-between pl-10">
                  <span className="text-[10px] text-gray-500">Inviata il {formatDate(g.created_at)}</span>
                  <div className="flex items-center gap-2">
                    {g.justification_file_url && (
                      <a
                        href={g.justification_file_url.startsWith('/') ? `${API_BASE_URL}${g.justification_file_url}` : g.justification_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-[#14b8a6] hover:text-[#14b8a6]/80"
                      >
                        <Eye className="w-3 h-3" />
                        Vedi
                      </a>
                    )}
                  </div>
                </div>
                {g.reviewer_notes && g.status !== 'INVIATA' && (
                  <div className="mt-2 pl-10 pt-2 border-t border-[#14b8a6]/5">
                    <p className="text-[10px] text-gray-500">Note revisore:</p>
                    <p className="text-xs text-[#e8fbff]/70">{g.reviewer_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AnagraficaPage() {
  const [, setLocation] = useLocation();
  // Leggi tab iniziale da URL params (?tab=associazione)
  const initialTab = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'impresa';
    } catch { return 'impresa'; }
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  // v4.5.6: Stato per pre-compilare il form giustifica dal banner presenze
  const [prefillGiustifica, setPrefillGiustifica] = useState<{ market_name: string; stall_number: string; giorno: string; comune: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [impresa, setImpresa] = useState<ImpresaData | null>(null);
  const [concessioni, setConcessioni] = useState<ConcessioneData[]>([]);
  const [qualificazioni, setQualificazioni] = useState<QualificazioneData[]>([]);
  const [autorizzazioni, setAutorizzazioni] = useState<AutorizzazioneData[]>([]);
  const [domande, setDomande] = useState<DomandaSpuntaData[]>([]);
  const [presenze, setPresenze] = useState<PresenzaData[]>([]);
  const [presenzeStats, setPresenzeStats] = useState<PresenzeStats | null>(null);
  const [giustificazioni, setGiustificazioni] = useState<GiustificazioneData[]>([]);

  const [selectedConcessione, setSelectedConcessione] = useState<ConcessioneData | null>(null);
  const [selectedAutorizzazione, setSelectedAutorizzazione] = useState<AutorizzazioneData | null>(null);
  const [selectedDomanda, setSelectedDomanda] = useState<DomandaSpuntaData | null>(null);

  const IMPRESA_ID = getImpresaId();

  const concessioniAttive = concessioni.filter(c => (c.stato_calcolato || c.stato)?.toUpperCase() === 'ATTIVA').length;
  const qualificazioniAttive = qualificazioni.filter(q => {
    const scadenza = q.data_scadenza ? new Date(q.data_scadenza) : null;
    return scadenza ? scadenza >= new Date() : q.stato?.toUpperCase() !== 'SCADUTA';
  }).length;
  const autorizzazioniAttive = autorizzazioni.filter(a => a.stato?.toUpperCase() === 'ATTIVA').length;

  const fetchAllData = useCallback(async (showRefresh = false) => {
    if (!IMPRESA_ID) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Usa fields=light per evitare di caricare vetrina_immagine_principale (4.8MB base64)
      const impresaRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/imprese/${IMPRESA_ID}?fields=light`));
      const impresaJson = await impresaRes.json();
      if (impresaJson.success) setImpresa(impresaJson.data);

      try {
        // Step 1: Trova il vendor_id associato all'impresa (Number() per evitare mismatch string/number)
        const vendorsRes = await fetch(`${API_BASE_URL}/api/vendors`);
        const vendorsJson = await vendorsRes.json();
        const impresaIdNum = Number(IMPRESA_ID);
        const myVendors = (vendorsJson.data || []).filter((v: any) => Number(v.impresa_id) === impresaIdNum);
        
        if (myVendors.length > 0) {
          // Step 2: Carica concessioni per ogni vendor dell'impresa
          const allConcessioni: ConcessioneData[] = [];
          for (const vendor of myVendors) {
            const concRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/concessions?vendor_id=${vendor.id}`));
            const concJson = await concRes.json();
            if (concJson.success && concJson.data) {
              allConcessioni.push(...concJson.data);
            }
          }
          setConcessioni(allConcessioni);
        } else {
          setConcessioni([]);
        }
      } catch { /* silenzioso */ }

      try {
        const qualRes = await fetch(`${API_BASE_URL}/api/qualificazioni/impresa/${IMPRESA_ID}`);
        const qualJson = await qualRes.json();
        if (qualJson.success) setQualificazioni(qualJson.data || []);
      } catch { /* silenzioso */ }

      try {
        const autRes = await fetch(`${API_BASE_URL}/api/autorizzazioni?impresa_id=${IMPRESA_ID}`);
        const autJson = await autRes.json();
        if (autJson.success) setAutorizzazioni(autJson.data || []);
      } catch { /* silenzioso */ }

      try {
        const domRes = await fetch(`${API_BASE_URL}/api/domande-spunta?impresa_id=${IMPRESA_ID}`);
        const domJson = await domRes.json();
        if (domJson.success) setDomande(domJson.data || []);
      } catch { /* silenzioso */ }

      try {
        const presRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/presenze/impresa/${IMPRESA_ID}`));
        const presJson = await presRes.json();
        if (presJson.success) {
          setPresenze(presJson.data || []);
          setPresenzeStats(presJson.stats || null);
        }
      } catch { /* silenzioso */ }

      try {
        const giustRes = await fetch(`${API_BASE_URL}/api/giustificazioni/impresa/${IMPRESA_ID}`);
        const giustJson = await giustRes.json();
        if (giustJson.success) setGiustificazioni(giustJson.data || []);
      } catch { /* silenzioso */ }

    } catch (err) {
      console.error('Errore fetch anagrafica:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [IMPRESA_ID]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    setSelectedConcessione(null);
    setSelectedAutorizzazione(null);
    setSelectedDomanda(null);
  }, [activeTab]);

  const tabs = [
    { id: 'impresa', label: 'Impresa', icon: Building2, count: null },
    { id: 'concessioni', label: 'Concessioni', icon: MapPin, count: concessioni.length },
    { id: 'qualificazioni', label: 'Qualifiche', icon: Shield, count: qualificazioni.length },
    { id: 'associazione', label: 'Associazione', icon: Landmark, count: null },
    { id: 'servizi', label: 'Servizi', icon: Briefcase, count: null },
    { id: 'formazione', label: 'Formazione', icon: GraduationCap, count: null },
    { id: 'autorizzazioni', label: 'Autoriz.', icon: FileCheck, count: autorizzazioni.length },
    { id: 'domande', label: 'Spunta', icon: ClipboardList, count: domande.length },
    { id: 'presenze', label: 'Presenze', icon: Clock, count: presenze.length },
    { id: 'collaboratori', label: 'Team', icon: Users, count: null },
    { id: 'giustificazioni', label: 'Giustif.', icon: FileWarning, count: giustificazioni.length },
  ];

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e8fbff]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#0b1220] border-b border-[#14b8a6]/20 p-2 sm:p-4">
        <div className="w-full sm:container sm:mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')} className="text-[#e8fbff]/70 hover:text-[#e8fbff] px-1 sm:px-3">
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] flex items-center justify-center">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-[#e8fbff]">Anagrafica</h1>
              <p className="text-[10px] sm:text-sm text-[#e8fbff]/50 truncate max-w-[150px] sm:max-w-none">
                {impresa?.denominazione || 'Caricamento...'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchAllData(true)} disabled={refreshing} className="text-[#e8fbff]/70 hover:text-[#e8fbff] px-1 sm:px-3">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#1a2332]/50 border-b border-[#14b8a6]/10 overflow-x-auto">
        <div className="flex min-w-max px-1 sm:px-0 sm:container sm:mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#14b8a6] text-[#14b8a6]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-[#14b8a6]/20 text-[#14b8a6]' : 'bg-gray-700 text-gray-400'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="w-full sm:container sm:mx-auto sm:p-4 py-2">
        {activeTab === 'impresa' && <DatiImpresaSection impresa={impresa} loading={loading} />}
        {activeTab === 'concessioni' && (
          selectedConcessione
            ? <ConcessioneDetailView concessione={selectedConcessione} onBack={() => setSelectedConcessione(null)} />
            : <ConcessioniSection concessioni={concessioni} loading={loading} onSelect={setSelectedConcessione} />
        )}
        {activeTab === 'qualificazioni' && <QualificazioniSection qualificazioni={qualificazioni} loading={loading} impresaId={IMPRESA_ID} />}
        {activeTab === 'associazione' && <AssociazioneSection impresaId={IMPRESA_ID} />}
        {activeTab === 'servizi' && <ServiziSection impresaId={IMPRESA_ID} />}
        {activeTab === 'formazione' && <FormazioneSection impresaId={IMPRESA_ID} qualificazioni={qualificazioni} />}
        {activeTab === 'autorizzazioni' && (
          selectedAutorizzazione
            ? <AutorizzazioneDetailView autorizzazione={selectedAutorizzazione} onBack={() => setSelectedAutorizzazione(null)} />
            : <AutorizzazioniSection autorizzazioni={autorizzazioni} loading={loading} onSelect={setSelectedAutorizzazione} />
        )}
        {activeTab === 'domande' && (
          selectedDomanda
            ? <DomandaSpuntaDetailView domanda={selectedDomanda} onBack={() => setSelectedDomanda(null)} />
            : <DomandeSpuntaSection domande={domande} loading={loading} onSelect={setSelectedDomanda} />
        )}
        {activeTab === 'presenze' && <PresenzeSection presenze={presenze} stats={presenzeStats} loading={loading} giustificazioni={giustificazioni} onNavigateGiustifica={(p?: PresenzaData) => {
          if (p) {
            setPrefillGiustifica({ market_name: p.market_name, stall_number: p.stall_number, giorno: p.giorno, comune: p.comune });
          }
          setActiveTab('giustificazioni');
        }} />}
        {activeTab === 'collaboratori' && <CollaboratoriSection impresaId={IMPRESA_ID} impresa={impresa} />}
        {activeTab === 'giustificazioni' && <GiustificazioniSection impresaId={IMPRESA_ID} giustificazioni={giustificazioni} concessioni={concessioni} onRefresh={() => fetchAllData(true)} prefill={prefillGiustifica} onPrefillConsumed={() => setPrefillGiustifica(null)} />}

        {/* Summary indicators */}
        {activeTab === 'impresa' && !loading && impresa && (
          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:gap-3 px-0">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-2xl font-bold text-[#14b8a6]">{concessioniAttive}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Concessioni Attive</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-2xl font-bold text-[#14b8a6]">{qualificazioniAttive}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Qualifiche Attive</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardContent className="p-2 sm:p-3 text-center">
                <p className="text-lg sm:text-2xl font-bold text-[#14b8a6]">{autorizzazioniAttive}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Autoriz. Attive</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
