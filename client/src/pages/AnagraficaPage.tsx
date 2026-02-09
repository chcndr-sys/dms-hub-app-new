/**
 * Anagrafica Impresa - Sezione Completa
 * Pagina per gestire anagrafica, concessioni, qualificazioni, autorizzazioni, domande spunta e collaboratori
 * v4.4.0 - Implementazione completa con 6 sotto-sezioni e API reali
 * 
 * APPROCCIO CHIRURGICO: Tutto inline in un unico file, nessun file esterno creato.
 * Replica il formato della Dashboard PA con design mobile-first.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, Building2, MapPin, FileText, Users, Shield, ClipboardList,
  RefreshCw, Loader2, Calendar, Phone, Globe, ChevronRight,
  CheckCircle, XCircle, Store, User, Wallet, FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

// ============================================================================
// HELPERS
// ============================================================================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';

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
function QualificazioniSection({ qualificazioni, loading }: { qualificazioni: QualificazioneData[]; loading: boolean }) {
  if (loading) return <LoadingSpinner />;
  if (qualificazioni.length === 0) return <EmptyState text="Nessuna qualificazione trovata" />;

  return (
    <div className="space-y-2 sm:space-y-3">
      {qualificazioni.map((q) => {
        const isScaduta = q.stato?.toUpperCase() === 'SCADUTA' || 
          (q.data_scadenza && new Date(q.data_scadenza) < new Date());
        const statoDisplay = isScaduta ? 'SCADUTA' : (q.stato || 'ATTIVA');
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
                      <span className="text-gray-500">Rilascio:</span> {formatDate(q.data_rilascio)} \u2014 <span className="text-gray-500">Scadenza:</span> {formatDate(q.data_scadenza)}
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
// SUB-SECTION: COLLABORATORI
// ============================================================================
function CollaboratoriSection({ impresaId }: { impresaId: number | null }) {
  const [collaboratori, setCollaboratori] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!impresaId) { setLoading(false); return; }
    const fetchCollaboratori = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/vendors`);
        const json = await res.json();
        if (json.success && json.data) {
          setCollaboratori(json.data.slice(0, 20));
        }
      } catch (err) {
        console.error('Errore fetch collaboratori:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollaboratori();
  }, [impresaId]);

  if (loading) return <LoadingSpinner />;
  if (collaboratori.length === 0) return <EmptyState text="Nessun collaboratore trovato" />;

  return (
    <div className="space-y-2 sm:space-y-3">
      {collaboratori.map((c: any) => (
        <Card key={c.id} className="bg-[#1a2332] border-[#14b8a6]/20 py-0 gap-0 rounded-none sm:rounded-xl border-x-0 sm:border-x">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#14b8a6]/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#14b8a6]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-[#e8fbff] truncate">
                  {c.contact_name || c.business_name || 'Operatore'}
                </p>
                <p className="text-xs sm:text-sm text-gray-400 truncate">
                  {c.code || ''} {c.phone ? `\u00b7 ${c.phone}` : ''} {c.email ? `\u00b7 ${c.email}` : ''}
                </p>
              </div>
              <Badge className={`text-[10px] sm:text-xs ${getStatoBadgeClass(c.status)}`}>{c.status || 'N/D'}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
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
// MAIN COMPONENT
// ============================================================================
export default function AnagraficaPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('impresa');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [impresa, setImpresa] = useState<ImpresaData | null>(null);
  const [concessioni, setConcessioni] = useState<ConcessioneData[]>([]);
  const [qualificazioni, setQualificazioni] = useState<QualificazioneData[]>([]);
  const [autorizzazioni, setAutorizzazioni] = useState<AutorizzazioneData[]>([]);
  const [domande, setDomande] = useState<DomandaSpuntaData[]>([]);

  const [selectedConcessione, setSelectedConcessione] = useState<ConcessioneData | null>(null);
  const [selectedAutorizzazione, setSelectedAutorizzazione] = useState<AutorizzazioneData | null>(null);
  const [selectedDomanda, setSelectedDomanda] = useState<DomandaSpuntaData | null>(null);

  const IMPRESA_ID = getImpresaId();

  const concessioniAttive = concessioni.filter(c => (c.stato_calcolato || c.stato)?.toUpperCase() === 'ATTIVA').length;
  const qualificazioniAttive = qualificazioni.filter(q => q.stato?.toUpperCase() === 'ATTIVA' || (!q.stato && q.data_scadenza && new Date(q.data_scadenza) >= new Date())).length;
  const autorizzazioniAttive = autorizzazioni.filter(a => a.stato?.toUpperCase() === 'ATTIVA').length;

  const fetchAllData = useCallback(async (showRefresh = false) => {
    if (!IMPRESA_ID) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const impresaRes = await fetch(`${API_BASE_URL}/api/imprese/${IMPRESA_ID}`);
      const impresaJson = await impresaRes.json();
      if (impresaJson.success) setImpresa(impresaJson.data);

      try {
        const concRes = await fetch(`${API_BASE_URL}/api/concessions?vendor_id=${IMPRESA_ID}`);
        const concJson = await concRes.json();
        if (concJson.success) setConcessioni(concJson.data || []);
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
    { id: 'autorizzazioni', label: 'Autoriz.', icon: FileCheck, count: autorizzazioni.length },
    { id: 'domande', label: 'Spunta', icon: ClipboardList, count: domande.length },
    { id: 'collaboratori', label: 'Team', icon: Users, count: null },
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
        {activeTab === 'qualificazioni' && <QualificazioniSection qualificazioni={qualificazioni} loading={loading} />}
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
        {activeTab === 'collaboratori' && <CollaboratoriSection impresaId={IMPRESA_ID} />}

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
