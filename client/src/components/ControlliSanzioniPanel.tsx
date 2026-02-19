/**
 * ControlliSanzioniPanel - Modulo Controlli e Sanzioni per Polizia Municipale
 * Versione: 2.0.0
 * Data: 25 Gennaio 2026
 * 
 * Sotto-tab:
 * 1. Panoramica - KPI e overview
 * 2. Da Controllare - Watchlist imprese
 * 3. Verbali - Lista verbali emessi
 * 4. Tipi Infrazione - Catalogo infrazioni
 * 5. Pratiche SUAP - Nuove pratiche, concessioni, autorizzazioni
 * 6. Notifiche PM - Sistema invio notifiche
 */

import { useState, useEffect } from 'react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { 
  Shield, AlertTriangle, CheckCircle, Clock, FileText, 
  Search, Filter, Plus, Euro, Bell, Eye, Send,
  ChevronRight, RefreshCw, Building2, Store, Truck,
  ClipboardCheck, AlertCircle, Calendar, User, Download,
  FileCheck, Briefcase, X, MessageSquare, ExternalLink,
  Navigation, MapPin, Info, Trophy
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import NotificationManager from '@/components/suap/NotificationManager';

// API Base URL
const MIHUB_API = 'https://api.mio-hub.me/api';

// Types
interface InspectionStats {
  controlli: {
    total: number;
    regolari: number;
    non_regolari: number;
    pending: number;
    oggi: number;
  };
  sanzioni: {
    total_verbali: string;
    totale_importi: string;
    pagati: string;
    non_pagati: string;
    in_ritardo: string;
  };
  watchlist: {
    da_controllare: number;
  };
}

interface WatchlistItem {
  id: number;
  impresa_id: number;
  impresa_nome: string;
  partita_iva: string;
  trigger_type: string;
  trigger_description: string;
  priority: string;
  status: string;
  created_at: string;
}

interface Sanction {
  id: number;
  verbale_code: string;
  impresa_nome: string;
  partita_iva: string;
  infraction_code: string;
  infraction_description: string;
  amount: string;
  payment_status: string;
  issue_date: string;
  due_date: string;
  location?: string; // Campo per filtrare per comune
  // v3.54.2: Campi per importo pagato con sconto
  reduced_amount?: string;
  pagopa_payment_date?: string;
}

interface InfractionType {
  id: number;
  code: string;
  description: string;
  category: string;
  min_amount: string;
  max_amount: string;
  default_amount: string;
}

// Interfaccia per le domande spunta dal SUAP
interface DomandaSpunta {
  id: number;
  company_name: string;
  company_piva: string;
  company_cf: string;
  market_name: string;
  market_municipality: string;
  market_days: string;
  numero_autorizzazione: string;
  autorizzazione_tipo: string;
  settore_richiesto: string;
  numero_presenze: number;
  data_richiesta: string;
  data_approvazione: string;
  stato: string;
  wallet_balance: number;
  wallet_id: number;
  note: string;
}

interface Impresa {
  id: number;
  denominazione: string;
  partita_iva: string;
}

interface RispostaPM {
  id: number;
  mittente_id: number;
  mittente_nome: string;
  mittente_tipo?: string;
  titolo: string;
  messaggio: string;
  tipo_messaggio: string;
  created_at: string;
  letta: boolean;
}

// Notifica SUAP per la Polizia Municipale - stato pratiche
interface NotificaSUAP {
  id: number;
  pratica_id: number;
  numero_pratica: string;
  tipo_pratica: string;
  stato_precedente: string | null;
  stato_attuale: string;
  impresa_nome: string;
  impresa_cf: string;
  comune_id: number;
  comune_nome: string;
  messaggio: string;
  data_cambio_stato: string;
  letta: boolean;
}

// Interfaccia per le Concessioni dal SUAP
interface Concessione {
  id: number;
  numero_protocollo: string;
  // Campi corretti dall'API orchestratore
  ragione_sociale: string;
  impresa_denominazione: string;
  partita_iva: string;
  market_name: string;
  market_municipality: string;
  stall_number: string;
  tipo_concessione: string;
  valid_from: string;
  valid_to: string;
  stato: string;
  stato_calcolato: string;
  created_at: string;
  comune_rilascio?: string;
}

// Interfaccia per le Autorizzazioni dal SUAP
interface Autorizzazione {
  id: number;
  numero: string;
  company_name: string;
  company_piva: string;
  tipo: string;
  ente_rilascio: string;
  data_rilascio: string;
  data_scadenza: string;
  stato: string;
  created_at: string;
}

interface MarketSession {
  id: number;
  market_id: number;
  market_name: string;
  comune: string;
  data_mercato: string;
  ora_apertura: string | null;
  ora_chiusura: string | null;
  stato: string;
  totale_presenze: number;
  totale_incassato: string;
  posteggi_occupati: number;
  note: string | null;
  chiuso_da: string | null;
  created_at: string;
}

interface SessionDetail {
  id: number;
  stall_id: number;
  stall_number: string;
  area_mq: string;
  impresa_id: number;
  impresa_nome: string;
  impresa_piva: string;
  tipo_presenza: string;
  giorno: string;
  ora_accesso: string;
  ora_uscita: string | null;
  ora_rifiuti: string | null;
  importo_addebitato: string;
  presenze_totali: number;
  assenze_non_giustificate: number;
}

interface Transgression {
  id: number;
  market_id: number;
  market_name: string;
  market_date: string;
  business_id: number;
  business_name: string;
  business_cf: string;
  business_piva?: string;
  transgression_type: string;
  status: string;
  justification_deadline: string;
  justification_file_path: string | null;
  justification_status: string | null;
  justification_notes: string | null;
  justification_display_status: string;
  description?: string;
  days_remaining: number;
  checkin_time?: string;
  checkin_local?: string;
  detection_details?: string;
  sanction_id?: number;
  created_at: string;
}

// Giustificazioni manuali inviate dalle imprese (certificati medici, ecc.)
interface GiustificazioneManuale {
  id: number;
  impresa_id: number;
  impresa_nome: string;
  comune_id: number;
  comune_name: string;
  market_id: number | null;
  market_name: string | null;
  giorno_mercato: string;
  tipo_giustifica: string;
  reason: string;
  justification_file_url: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
}

export default function ControlliSanzioniPanel() {
  // Hook per impersonificazione - legge comune_id dall'URL
  const { isImpersonating, comuneId: impersonatedComuneId, addComuneIdToUrl } = useImpersonation();
  
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [infractionTypes, setInfractionTypes] = useState<InfractionType[]>([]);
  const [domandeSpunta, setDomandeSpunta] = useState<DomandaSpunta[]>([]);
  const [impreseList, setImpreseList] = useState<Impresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showNuovoControlloModal, setShowNuovoControlloModal] = useState(false);
  const [nuovoControlloLoading, setNuovoControlloLoading] = useState(false);
  const [showNuovoVerbaleModal, setShowNuovoVerbaleModal] = useState(false);
  const [nuovoVerbaleLoading, setNuovoVerbaleLoading] = useState(false);
  const [invioNotificaLoading, setInvioNotificaLoading] = useState(false);
  const [rispostePM, setRispostePM] = useState<RispostaPM[]>([]);
  const [risposteLoading, setRisposteLoading] = useState(false);
  const [selectedRisposta, setSelectedRisposta] = useState<RispostaPM | null>(null);
  const [showRispostaModal, setShowRispostaModal] = useState(false);
  const [transgressions, setTransgressions] = useState<Transgression[]>([]);
  const [transgressionsLoading, setTransgressionsLoading] = useState(false);
  const [giustificazioniManuali, setGiustificazioniManuali] = useState<GiustificazioneManuale[]>([]);
  
  // Notifiche SUAP per PM
  const [notificheSuap, setNotificheSuap] = useState<NotificaSUAP[]>([]);
  const [notificheSuapLoading, setNotificheSuapLoading] = useState(false);
  
  // Concessioni e Autorizzazioni dal SUAP
  const [concessioni, setConcessioni] = useState<Concessione[]>([]);
  const [autorizzazioni, setAutorizzazioni] = useState<Autorizzazione[]>([]);
  
  // Storico sessioni mercato
  const [marketSessions, setMarketSessions] = useState<MarketSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<MarketSession | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [storicoDateFilter, setStoricoDateFilter] = useState<string>('');
  
  // Graduatoria spuntisti SUAP
  const [graduatoriaSpunta, setGraduatoriaSpunta] = useState<any[]>([]);
  const [graduatoriaLoading, setGraduatoriaLoading] = useState(false);
  const [suapSubTab, setSuapSubTab] = useState<string>('domande');
  
  // Modal dettaglio watchlist
  const [selectedWatchlistItem, setSelectedWatchlistItem] = useState<WatchlistItem | null>(null);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [watchlistPosteggio, setWatchlistPosteggio] = useState<{lat: number, lng: number, numero: string} | null>(null);
  
  // v4.5.4: Sub-tab per Da Controllare (attive vs controllate)
  const [watchlistSubTab, setWatchlistSubTab] = useState<'attive' | 'controllate' | 'archiviate'>('attive');
  const [archiveNotes, setArchiveNotes] = useState<string>('');
  const [archivingId, setArchivingId] = useState<number | null>(null);

  // Fetch data on mount e quando cambia l'impersonificazione
  useEffect(() => {
    fetchAllData();
  }, [isImpersonating, impersonatedComuneId]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    // Leggi i parametri URL per il filtro
    const urlParams = new URLSearchParams(window.location.search);
    const isImpersonatingFromUrl = urlParams.get('impersonate') === 'true';
    const comuneIdFromUrl = urlParams.get('comune_id');
    const comuneNomeFromUrl = urlParams.get('comune_nome');
    
    // Log impersonificazione per debug
    if (isImpersonatingFromUrl && comuneNomeFromUrl) {
      console.warn('[ControlliSanzioni] Modalita impersonificazione attiva, comune:', comuneNomeFromUrl);
    }
    
    try {
      // Fetch stats - filtrato per comune se in impersonificazione
      const statsRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/inspections/stats`));
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      // Fetch watchlist - filtrato per comune se in impersonificazione
      const watchlistRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/watchlist?status=PENDING&limit=20`));
      const watchlistData = await watchlistRes.json();
      if (watchlistData.success) setWatchlist(watchlistData.data || []);

      // v3.54.2: Fetch sanctions - filtrato per comune_id lato backend
      let sanctionsUrl = `${MIHUB_API}/sanctions?limit=100`;
      if (isImpersonatingFromUrl && comuneIdFromUrl) {
        sanctionsUrl += `&comune_id=${comuneIdFromUrl}`;
      }
      const sanctionsRes = await fetch(sanctionsUrl);
      const sanctionsData = await sanctionsRes.json();
      if (sanctionsData.success) {
        const sanctionsFiltered = sanctionsData.data || [];
        
        // Ricalcola le stats localmente dai verbali (già filtrati dal backend)
        if (isImpersonatingFromUrl && comuneIdFromUrl) {
          const totaleImporti = sanctionsFiltered.reduce((sum: number, s: Sanction) => sum + parseFloat(s.amount || '0'), 0);
          const nonPagati = sanctionsFiltered.filter((s: Sanction) => s.payment_status === 'NON_PAGATO').length;
          const pagati = sanctionsFiltered.filter((s: Sanction) => s.payment_status === 'PAGATO').length;
          
          // Aggiorna le stats con i valori filtrati
          setStats(prev => prev ? {
            ...prev,
            sanzioni: {
              ...prev.sanzioni,
              total_verbali: String(sanctionsFiltered.length),
              totale_importi: totaleImporti.toFixed(2),
              non_pagati: String(nonPagati),
              pagati: String(pagati)
            }
          } : prev);
        }
        setSanctions(sanctionsFiltered);
      }

      // Fetch infraction types (non filtrato - sono globali)
      const typesRes = await fetch(`${MIHUB_API}/sanctions/types`);
      const typesData = await typesRes.json();
      if (typesData.success) setInfractionTypes(typesData.data || []);

      // Fetch domande spunta dal SUAP - filtrato per comune se in impersonificazione
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const domandeRes = await fetch(addComuneIdToUrl(`${API_URL}/api/domande-spunta`));
      const domandeData = await domandeRes.json();
      if (domandeData.success) {
        // Ordina per data (più recenti prima)
        const sorted = (domandeData.data || []).sort((a: DomandaSpunta, b: DomandaSpunta) => 
          new Date(b.data_richiesta || '').getTime() - new Date(a.data_richiesta || '').getTime()
        );
        setDomandeSpunta(sorted);
      }

      // Fetch imprese list - filtrato per comune se in impersonificazione
      const impreseRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/imprese?limit=100`));
      const impreseData = await impreseRes.json();
      if (impreseData.success) setImpreseList(impreseData.data || []);

      // Fetch risposte PM - filtrato per comune se in impersonificazione
      const risposteRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/notifiche/risposte`));
      const risposteData = await risposteRes.json();
      if (risposteData.success) {
        // Filtra solo le risposte destinate alla Polizia Municipale
        const rispostePMFiltered = (risposteData.data || []).filter(
          (r: any) => r.target_tipo === 'POLIZIA_MUNICIPALE'
        );
        setRispostePM(rispostePMFiltered);
      }

      // Fetch trasgressioni in attesa di giustifica - filtrato per comune se in impersonificazione
      const transgressionsRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/market-settings/transgressions/pending-justifications`));
      const transgressionsData = await transgressionsRes.json();
      if (transgressionsData.success) setTransgressions(transgressionsData.data || []);

      // Fetch giustificazioni manuali inviate dalle imprese (certificati medici, ecc.)
      try {
        const giustManualiRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/giustificazioni`));
        const giustManualiData = await giustManualiRes.json();
        if (giustManualiData.success) setGiustificazioniManuali(giustManualiData.data || []);
      } catch (e) { console.error('Errore fetch giustificazioni manuali:', e); }

      // Fetch storico sessioni mercato - v4.6.0: filtrato lato backend con comune_id (senza limite)
      const sessionsRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/presenze/sessioni`));
      const sessionsData = await sessionsRes.json();
      if (sessionsData.success) {
        setMarketSessions(sessionsData.data || []);
      }

      // Fetch concessioni dal SUAP - filtrato per comune se in impersonificazione
      let concessioniData: any = { data: [] };
      try {
        const concessioniRes = await fetch(addComuneIdToUrl('https://orchestratore.mio-hub.me/api/concessions'));
        concessioniData = await concessioniRes.json();
        if (concessioniData.success) {
          // Calcola stato se non presente
          const oggi = new Date();
          const concessioniWithStatus = (concessioniData.data || []).map((c: any) => {
            if (c.stato_calcolato) return c;
            if (c.status === 'CESSATA' || c.stato === 'CESSATA') return { ...c, stato_calcolato: 'CESSATA' };
            let stato_calcolato = c.stato || 'ATTIVA';
            if (c.valid_to) {
              const scadenza = new Date(c.valid_to);
              stato_calcolato = scadenza < oggi ? 'SCADUTA' : 'ATTIVA';
            }
            return { ...c, stato_calcolato };
          });
          // Ordina per data creazione (più recenti prima)
          const sorted = concessioniWithStatus.sort((a: any, b: any) => 
            new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
          );
          setConcessioni(sorted);
        }
      } catch (concErr) {
        console.warn('[ControlliSanzioni] Errore fetch concessioni:', concErr);
      }

      // Fetch autorizzazioni dal SUAP - filtrato per comune se in impersonificazione
      let autorizzazioniData: any = { data: [] };
      try {
        const autorizzazioniRes = await fetch(addComuneIdToUrl(`${API_URL}/api/autorizzazioni`));
        autorizzazioniData = await autorizzazioniRes.json();
        if (autorizzazioniData.success || autorizzazioniData.data) {
          // Ordina per data creazione (più recenti prima)
          const sorted = (autorizzazioniData.data || []).sort((a: any, b: any) => 
            new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
          );
          setAutorizzazioni(sorted);
        }
      } catch (autErr) {
        console.warn('[ControlliSanzioni] Errore fetch autorizzazioni:', autErr);
      }

      // Fetch notifiche SUAP per PM - notifiche di cambio stato pratiche
      // Queste sono le stesse notifiche inviate alle imprese quando il SUAP approva/nega/revisiona
      try {
        const notificheSuapRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/suap/notifiche-pm?limit=50`));
        const notificheSuapData = await notificheSuapRes.json();
        if (notificheSuapData.success) {
          setNotificheSuap(notificheSuapData.data || []);
        } else {
          // Se l'endpoint non esiste, generiamo le notifiche da domande spunta, concessioni e autorizzazioni
          // Questo è un fallback per quando il backend non ha ancora l'endpoint dedicato
          const notificheFromDomande = (domandeData.data || []).map((d: DomandaSpunta, idx: number) => ({
            id: idx + 1,
            pratica_id: d.id,
            numero_pratica: d.numero_autorizzazione || `DS-${d.id}`,
            tipo_pratica: 'Domanda Spunta',
            stato_precedente: null,
            stato_attuale: d.stato,
            impresa_nome: d.company_name || 'N/D',
            impresa_cf: d.company_cf || '',
            comune_id: 0,
            comune_nome: d.market_municipality || 'N/D',
            messaggio: `Domanda Spunta ${d.company_name} - Mercato ${d.market_name}: stato ${d.stato}`,
            data_cambio_stato: d.data_richiesta,
            letta: false
          }));
          
          // Aggiungi notifiche dalle concessioni
          const notificheFromConcessioni = (concessioniData.data || []).map((c: any, idx: number) => ({
            id: 1000 + idx + 1,
            pratica_id: c.id,
            numero_pratica: c.numero_protocollo || `CONC-${c.id}`,
            tipo_pratica: 'Concessione',
            stato_precedente: null,
            stato_attuale: c.stato_calcolato || c.stato || 'ATTIVA',
            impresa_nome: c.ragione_sociale || c.impresa_denominazione || 'N/D',
            impresa_cf: c.partita_iva || '',
            comune_id: 0,
            comune_nome: c.market_municipality || 'N/D',
            messaggio: `Concessione ${c.ragione_sociale || c.impresa_denominazione || 'N/D'} - Mercato ${c.market_name} - Posteggio ${c.stall_number || 'N/D'}: stato ${c.stato_calcolato || c.stato}`,
            data_cambio_stato: c.created_at,
            letta: false
          }));
          
          // Aggiungi notifiche dalle autorizzazioni
          const notificheFromAutorizzazioni = (autorizzazioniData.data || []).map((a: any, idx: number) => ({
            id: 2000 + idx + 1,
            pratica_id: a.id,
            numero_pratica: a.numero || `AUT-${a.id}`,
            tipo_pratica: 'Autorizzazione',
            stato_precedente: null,
            stato_attuale: a.stato || 'ATTIVA',
            impresa_nome: a.company_name || 'N/D',
            impresa_cf: a.company_piva || '',
            comune_id: 0,
            comune_nome: 'N/D',
            messaggio: `Autorizzazione ${a.tipo || 'N/D'} - ${a.company_name}: stato ${a.stato || 'ATTIVA'}`,
            data_cambio_stato: a.created_at,
            letta: false
          }));
          
          // Unisci tutte le notifiche e ordina per data
          const allNotifiche = [...notificheFromDomande, ...notificheFromConcessioni, ...notificheFromAutorizzazioni]
            .sort((a, b) => new Date(b.data_cambio_stato || '').getTime() - new Date(a.data_cambio_stato || '').getTime());
          setNotificheSuap(allNotifiche);
        }
      } catch (notifErr) {
        console.warn('[ControlliSanzioni] Endpoint notifiche-pm non disponibile, usando fallback');
        // Fallback: generiamo le notifiche da domande spunta, concessioni e autorizzazioni
        const notificheFromDomande = (domandeData.data || []).map((d: DomandaSpunta, idx: number) => ({
          id: idx + 1,
          pratica_id: d.id,
          numero_pratica: d.numero_autorizzazione || `DS-${d.id}`,
          tipo_pratica: 'Domanda Spunta',
          stato_precedente: null,
          stato_attuale: d.stato,
          impresa_nome: d.company_name || 'N/D',
          impresa_cf: d.company_cf || '',
          comune_id: 0,
          comune_nome: d.market_municipality || 'N/D',
          messaggio: `Domanda Spunta ${d.company_name} - Mercato ${d.market_name}: stato ${d.stato}`,
          data_cambio_stato: d.data_richiesta,
          letta: false
        }));
        
        // Aggiungi notifiche dalle concessioni
        const notificheFromConcessioni = (concessioniData.data || []).map((c: any, idx: number) => ({
          id: 1000 + idx + 1,
          pratica_id: c.id,
          numero_pratica: c.numero_protocollo || `CONC-${c.id}`,
          tipo_pratica: 'Concessione',
          stato_precedente: null,
          stato_attuale: c.stato_calcolato || c.stato || 'ATTIVA',
          impresa_nome: c.ragione_sociale || c.impresa_denominazione || 'N/D',
          impresa_cf: c.partita_iva || '',
          comune_id: 0,
          comune_nome: c.market_municipality || 'N/D',
          messaggio: `Concessione ${c.ragione_sociale || c.impresa_denominazione || 'N/D'} - Mercato ${c.market_name} - Posteggio ${c.stall_number || 'N/D'}: stato ${c.stato_calcolato || c.stato}`,
          data_cambio_stato: c.created_at,
          letta: false
        }));
        
        // Aggiungi notifiche dalle autorizzazioni
        const notificheFromAutorizzazioni = (autorizzazioniData.data || []).map((a: any, idx: number) => ({
          id: 2000 + idx + 1,
          pratica_id: a.id,
          numero_pratica: a.numero || `AUT-${a.id}`,
          tipo_pratica: 'Autorizzazione',
          stato_precedente: null,
          stato_attuale: a.stato || 'ATTIVA',
          impresa_nome: a.company_name || 'N/D',
          impresa_cf: a.company_piva || '',
          comune_id: 0,
          comune_nome: 'N/D',
          messaggio: `Autorizzazione ${a.tipo || 'N/D'} - ${a.company_name}: stato ${a.stato || 'ATTIVA'}`,
          data_cambio_stato: a.created_at,
          letta: false
        }));
        
        // Unisci tutte le notifiche e ordina per data
        const allNotifiche = [...notificheFromDomande, ...notificheFromConcessioni, ...notificheFromAutorizzazioni]
          .sort((a, b) => new Date(b.data_cambio_stato || '').getTime() - new Date(a.data_cambio_stato || '').getTime());
        setNotificheSuap(allNotifiche);
      }

      // Fetch graduatoria spuntisti per tutti i mercati del comune
      try {
        setGraduatoriaLoading(true);
        // Prendi i mercati dal comune per fetchare la graduatoria
        const marketsRes = await fetch(addComuneIdToUrl(`${MIHUB_API}/presenze/sessioni`));
        const marketsData = await marketsRes.json();
        if (marketsData.success && marketsData.data?.length > 0) {
          // Prendi i market_id unici dalle sessioni
          const marketIds = Array.from(new Set((marketsData.data || []).map((s: any) => s.market_id)));
          let allGraduatoria: any[] = [];
          for (const mId of marketIds) {
            try {
              const gradRes = await fetch(`${MIHUB_API}/presenze/graduatoria/mercato/${mId}?tipo=SPUNTA`);
              const gradData = await gradRes.json();
              if (gradData.success && gradData.data) {
                allGraduatoria = [...allGraduatoria, ...gradData.data];
              }
            } catch (gradErr) {
              console.warn(`[ControlliSanzioni] Errore fetch graduatoria mercato ${mId}:`, gradErr);
            }
          }
          setGraduatoriaSpunta(allGraduatoria);
        }
      } catch (gradErr) {
        console.warn('[ControlliSanzioni] Errore fetch graduatoria:', gradErr);
      } finally {
        setGraduatoriaLoading(false);
      }

    } catch (err) {
      setError('Errore nel caricamento dei dati');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ALTA': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIA': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Payment status badge
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGATO': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Pagato</Badge>;
      case 'NON_PAGATO': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Non Pagato</Badge>;
      case 'IN_RITARDO': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">In Ritardo</Badge>;
      default: return <Badge className="bg-gray-500/20 text-gray-400">{status}</Badge>;
    }
  };

  // Pratica status indicator - Semaforo con stato scritto
  const getPraticaStatusIndicator = (stato: string) => {
    const statoUpper = stato?.toUpperCase();
    
    // Configurazione per ogni stato
    const statusConfig: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
      'APPROVATA': { 
        bg: 'bg-green-500/10', 
        border: 'border-green-500', 
        text: 'text-green-400', 
        dot: 'bg-green-500',
        label: 'APPROVATA'
      },
      'APPROVED': { 
        bg: 'bg-green-500/10', 
        border: 'border-green-500', 
        text: 'text-green-400', 
        dot: 'bg-green-500',
        label: 'APPROVATA'
      },
      'RIFIUTATA': { 
        bg: 'bg-red-500/10', 
        border: 'border-red-500', 
        text: 'text-red-400', 
        dot: 'bg-red-500',
        label: 'NEGATA'
      },
      'REJECTED': { 
        bg: 'bg-red-500/10', 
        border: 'border-red-500', 
        text: 'text-red-400', 
        dot: 'bg-red-500',
        label: 'NEGATA'
      },
      'NEGATA': { 
        bg: 'bg-red-500/10', 
        border: 'border-red-500', 
        text: 'text-red-400', 
        dot: 'bg-red-500',
        label: 'NEGATA'
      },
      'REVOCATA': { 
        bg: 'bg-orange-500/10', 
        border: 'border-orange-500', 
        text: 'text-orange-400', 
        dot: 'bg-orange-500',
        label: 'REVOCATA'
      },
      'IN_LAVORAZIONE': { 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500', 
        text: 'text-blue-400', 
        dot: 'bg-blue-500 animate-pulse',
        label: 'IN LAVORAZIONE'
      },
      'IN_REVISIONE': { 
        bg: 'bg-yellow-500/10', 
        border: 'border-yellow-500', 
        text: 'text-yellow-400', 
        dot: 'bg-yellow-500 animate-pulse',
        label: 'IN REVISIONE'
      },
      'INTEGRATION_NEEDED': { 
        bg: 'bg-yellow-500/10', 
        border: 'border-yellow-500', 
        text: 'text-yellow-400', 
        dot: 'bg-yellow-500 animate-pulse',
        label: 'IN REVISIONE'
      },
      'IN_ATTESA': { 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500', 
        text: 'text-amber-400', 
        dot: 'bg-amber-500',
        label: 'IN ATTESA'
      },
      'RECEIVED': { 
        bg: 'bg-cyan-500/10', 
        border: 'border-cyan-500', 
        text: 'text-cyan-400', 
        dot: 'bg-cyan-500',
        label: 'RICEVUTA'
      },
      'PRECHECK': { 
        bg: 'bg-indigo-500/10', 
        border: 'border-indigo-500', 
        text: 'text-indigo-400', 
        dot: 'bg-indigo-500 animate-pulse',
        label: 'VERIFICA'
      },
      'EVALUATED': { 
        bg: 'bg-purple-500/10', 
        border: 'border-purple-500', 
        text: 'text-purple-400', 
        dot: 'bg-purple-500',
        label: 'VALUTATA'
      }
    };
    
    const config = statusConfig[statoUpper] || { 
      bg: 'bg-gray-500/10', 
      border: 'border-gray-500', 
      text: 'text-gray-400', 
      dot: 'bg-gray-500',
      label: stato || 'N/D'
    };
    
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} border ${config.border}`}>
        <span className={`w-3 h-3 rounded-full ${config.dot}`}></span>
        <span className={`text-xs font-bold tracking-wide ${config.text}`}>
          {config.label}
        </span>
      </div>
    );
  };

  // Manteniamo anche la versione badge per retrocompatibilità
  const getPraticaStatusBadge = (stato: string) => {
    switch (stato?.toUpperCase()) {
      case 'APPROVATA': 
      case 'APPROVED': 
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approvata</Badge>;
      case 'RIFIUTATA': 
      case 'REJECTED': 
      case 'NEGATA': 
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Negata</Badge>;
      case 'IN_LAVORAZIONE': 
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">In Lavorazione</Badge>;
      case 'IN_ATTESA': 
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Attesa</Badge>;
      case 'IN_REVISIONE':
      case 'INTEGRATION_NEEDED':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">In Revisione</Badge>;
      default: 
        return <Badge className="bg-gray-500/20 text-gray-400">{stato}</Badge>;
    }
  };

  // Category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MERCATO': return <Store className="h-4 w-4" />;
      case 'NEGOZIO': return <Building2 className="h-4 w-4" />;
      case 'AMBULANTE': return <Truck className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  // Handle nuovo controllo submit
  const handleNuovoControlloSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNuovoControlloLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      business_id: formData.get('impresa_id'),
      type: formData.get('tipo_controllo') || 'CONTROLLO_PM',
      notes: formData.get('note') || '',
      inspector: 'Polizia Municipale',
      status: 'scheduled'
    };

    try {
      const response = await fetch(`${MIHUB_API}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Controllo registrato con successo!');
        setShowNuovoControlloModal(false);
        fetchAllData();
      } else {
        alert('❌ Errore: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      alert('❌ Errore nella registrazione del controllo');
    } finally {
      setNuovoControlloLoading(false);
    }
  };

  // Handle nuovo verbale submit
  const handleNuovoVerbaleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNuovoVerbaleLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const impresaId = formData.get('impresa_id');
    const infractionCode = formData.get('infraction_code') as string;
    const amount = formData.get('amount');
    const description = formData.get('description');
    const luogoAccertamento = formData.get('luogo_accertamento');
    
    // Genera codice verbale
    const verbaleCode = `PM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const data = {
      impresa_id: impresaId,
      infraction_code: infractionCode,
      verbale_code: verbaleCode,
      amount: parseFloat(amount as string) || 0,
      description: description || `Verbale per ${infractionCode}`,
      luogo_accertamento: luogoAccertamento || 'Non specificato'
    };

    try {
      const response = await fetch(`${MIHUB_API}/sanctions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Verbale ${verbaleCode} emesso con successo! Notifica inviata all'impresa.`);
        setShowNuovoVerbaleModal(false);
        fetchAllData();
      } else {
        alert('❌ Errore: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      alert('❌ Errore nella creazione del verbale');
    } finally {
      setNuovoVerbaleLoading(false);
    }
  };

  // Handle invio notifica PM
  const handleInvioNotifica = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInvioNotificaLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const targetTipo = formData.get('target_tipo') as string;
    const targetId = formData.get('target_id') as string;
    
    let targetNome = '';
    if (targetTipo === 'IMPRESA' && targetId) {
      const impresa = impreseList.find(i => i.id === parseInt(targetId));
      targetNome = impresa?.denominazione || '';
    }

    try {
      const response = await fetch(`${MIHUB_API}/notifiche/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mittente_tipo: 'POLIZIA_MUNICIPALE',
          mittente_id: 1,
          mittente_nome: 'Polizia Municipale',
          titolo: formData.get('titolo'),
          messaggio: formData.get('messaggio'),
          tipo_messaggio: formData.get('tipo_messaggio'),
          target_tipo: targetTipo,
          target_id: targetId || null,
          target_nome: targetNome
        })
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Notifica inviata con successo a ${data.data?.destinatari_count || 0} destinatari!`);
        (e.target as HTMLFormElement).reset();
      } else {
        alert('❌ Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      alert('❌ Errore invio notifica');
    } finally {
      setInvioNotificaLoading(false);
    }
  };

  // Loading inline - la UI rimane sempre visibile
  const isLoading = loading;

  return (
    <div className="space-y-6">
      {/* Header con titolo e azioni */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#f59e0b]/10 rounded-lg">
            <Shield className="h-6 w-6 text-[#f59e0b]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#e8fbff]">Controlli e Sanzioni</h2>
            <p className="text-sm text-[#e8fbff]/60">Polizia Municipale - Gestione Controlli Commercio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAllData}
            disabled={isLoading}
            className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Caricamento...' : 'Aggiorna'}
          </Button>
          <Button 
            size="sm" 
            className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black"
            onClick={() => setShowNuovoControlloModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Controllo
          </Button>
        </div>
      </div>

      {/* Modal Nuovo Controllo */}
      {showNuovoControlloModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-[#f59e0b]/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#e8fbff]">Nuovo Controllo</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNuovoControlloModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleNuovoControlloSubmit} className="space-y-4">
              <div>
                <Label className="text-[#e8fbff]/70">Impresa</Label>
                <select 
                  name="impresa_id" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#f59e0b]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="">Seleziona impresa...</option>
                  {impreseList.map(imp => (
                    <option key={imp.id} value={imp.id}>{imp.denominazione} - {imp.partita_iva}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Tipo Controllo</Label>
                <select 
                  name="tipo_controllo" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#f59e0b]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="ORDINARIO">Controllo Ordinario</option>
                  <option value="STRAORDINARIO">Controllo Straordinario</option>
                  <option value="SU_SEGNALAZIONE">Su Segnalazione</option>
                  <option value="VERIFICA_DOCUMENTALE">Verifica Documentale</option>
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Note</Label>
                <Textarea 
                  name="note" 
                  placeholder="Note sul controllo..."
                  className="mt-1 bg-[#0b1220] border-[#f59e0b]/30 text-[#e8fbff]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNuovoControlloModal(false)}
                  className="flex-1 border-[#e8fbff]/20"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={nuovoControlloLoading}
                  className="flex-1 bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black"
                >
                  {nuovoControlloLoading ? 'Salvataggio...' : 'Registra Controllo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuovo Verbale */}
      {showNuovoVerbaleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-[#ef4444]/30 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#e8fbff]">Nuovo Verbale</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNuovoVerbaleModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleNuovoVerbaleSubmit} className="space-y-4">
              <div>
                <Label className="text-[#e8fbff]/70">Impresa</Label>
                <select 
                  name="impresa_id" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#ef4444]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="">Seleziona impresa...</option>
                  {impreseList.map(imp => (
                    <option key={imp.id} value={imp.id}>{imp.denominazione} - {imp.partita_iva}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Tipo Infrazione</Label>
                <select 
                  name="infraction_code" 
                  required
                  className="w-full mt-1 bg-[#0b1220] border border-[#ef4444]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="">Seleziona infrazione...</option>
                  {infractionTypes.map(inf => (
                    <option key={inf.id} value={inf.code}>
                      {inf.code} - {inf.description} (€{inf.default_amount})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Importo (€)</Label>
                <Input 
                  type="number" 
                  name="amount" 
                  placeholder="Importo sanzione"
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Descrizione</Label>
                <Textarea 
                  name="description" 
                  placeholder="Descrizione della violazione..."
                  className="mt-1 bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
              <div>
                <Label className="text-[#e8fbff]/70">Luogo Accertamento</Label>
                <Input 
                  type="text" 
                  name="luogo_accertamento" 
                  placeholder="Es: Mercato Grosseto, Posteggio 15"
                  className="mt-1 bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNuovoVerbaleModal(false)}
                  className="flex-1 border-[#e8fbff]/20"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={nuovoVerbaleLoading}
                  className="flex-1 bg-[#ef4444] hover:bg-[#ef4444]/80 text-white"
                >
                  {nuovoVerbaleLoading ? 'Emissione...' : 'Emetti Verbale'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 border-[#3b82f6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Controlli Totali</p>
                <p className="text-3xl font-bold text-[#3b82f6]">{stats?.controlli.total || 0}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-[#3b82f6]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Oggi: {stats?.controlli.oggi || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border-[#10b981]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Regolari</p>
                <p className="text-3xl font-bold text-[#10b981]">{stats?.controlli.regolari || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[#10b981]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              {stats?.controlli.total ? Math.round((stats.controlli.regolari / stats.controlli.total) * 100) : 0}% del totale
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/5 border-[#ef4444]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Violazioni</p>
                <p className="text-3xl font-bold text-[#ef4444]">{stats?.controlli.non_regolari || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[#ef4444]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Verbali: {stats?.sanzioni.total_verbali || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#f59e0b]/20 to-[#f59e0b]/5 border-[#f59e0b]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Da Controllare</p>
                <p className="text-3xl font-bold text-[#f59e0b]">{(stats?.watchlist.da_controllare || 0) + transgressions.filter(t => t.justification_display_status === 'SEGNALAZIONE' || t.justification_display_status === 'VERBALE_AUTOMATICO').length}</p>
              </div>
              <Bell className="h-8 w-8 text-[#f59e0b]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Watchlist attiva
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#14b8a6]/20 to-[#14b8a6]/5 border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#e8fbff]/60 mb-1">Importo Sanzioni</p>
                <p className="text-2xl font-bold text-[#14b8a6]">
                  €{parseFloat(stats?.sanzioni.totale_importi || '0').toLocaleString('it-IT')}
                </p>
              </div>
              <Euro className="h-8 w-8 text-[#14b8a6]/50" />
            </div>
            <p className="text-xs text-[#e8fbff]/40 mt-2">
              Non pagati: {stats?.sanzioni.non_pagati || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="bg-[#1a2332] border border-[#3b82f6]/20 p-1 flex-wrap h-auto">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <Eye className="h-4 w-4 mr-2" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger 
            value="watchlist" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <Bell className="h-4 w-4 mr-2" />
            Da Controllare ({(stats?.watchlist.da_controllare || 0) + transgressions.filter(t => t.justification_display_status === 'SEGNALAZIONE' || t.justification_display_status === 'VERBALE_AUTOMATICO').length})
          </TabsTrigger>
          <TabsTrigger 
            value="sanctions" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Verbali ({stats?.sanzioni.total_verbali || 0})
          </TabsTrigger>
          <TabsTrigger 
            value="infractions" 
            className="data-[state=active]:bg-[#f59e0b]/20 data-[state=active]:text-[#f59e0b]"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Tipi Infrazione
          </TabsTrigger>
          <TabsTrigger 
            value="suap" 
            className="data-[state=active]:bg-[#8b5cf6]/20 data-[state=active]:text-[#8b5cf6]"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Pratiche SUAP ({domandeSpunta.length})
          </TabsTrigger>
          <TabsTrigger 
            value="notifiche" 
            className="data-[state=active]:bg-[#ec4899]/20 data-[state=active]:text-[#ec4899]"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Notifiche PM
          </TabsTrigger>
          <TabsTrigger 
            value="giustifiche" 
            className="data-[state=active]:bg-[#10b981]/20 data-[state=active]:text-[#10b981]"
          >
            <FileCheck className="h-4 w-4 mr-2" />
            Giustifiche ({giustificazioniManuali.length})
          </TabsTrigger>
          <TabsTrigger 
            value="storico" 
            className="data-[state=active]:bg-[#8b5cf6]/20 data-[state=active]:text-[#8b5cf6]"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Storico ({marketSessions.length})
          </TabsTrigger>
          <TabsTrigger 
            value="segnalazioni" 
            className="data-[state=active]:bg-[#06b6d4]/20 data-[state=active]:text-[#06b6d4]"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Segnalazioni
          </TabsTrigger>
        </TabsList>

        {/* Tab: Panoramica */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ultimi Controlli */}
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-[#3b82f6]" />
                  Ultimi Controlli
                </CardTitle>
              </CardHeader>
              <CardContent>
                {watchlist.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-[#3b82f6]/30 mx-auto mb-3" />
                    <p className="text-[#e8fbff]/50">Nessun controllo recente</p>
                    <p className="text-[#e8fbff]/30 text-sm mt-1">I controlli appariranno qui</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {watchlist.slice(0, 5).map((item) => (
                      <div key={item.id} className="p-3 bg-[#0b1220] rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-[#e8fbff] font-medium text-sm">{item.impresa_nome || 'N/D'}</p>
                          <p className="text-[#e8fbff]/50 text-xs">{item.trigger_description}</p>
                        </div>
                        <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ultimi Verbali */}
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#ef4444]" />
                  Ultimi Verbali
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sanctions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-[#ef4444]/30 mx-auto mb-3" />
                    <p className="text-[#e8fbff]/50">Nessun verbale emesso</p>
                    <p className="text-[#e8fbff]/30 text-sm mt-1">I verbali appariranno qui</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sanctions.slice(0, 5).map((sanction) => (
                      <div key={sanction.id} className="p-3 bg-[#0b1220] rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-[#e8fbff] font-medium text-sm">{sanction.verbale_code}</p>
                          <p className="text-[#e8fbff]/50 text-xs">{sanction.impresa_nome || 'N/D'}</p>
                        </div>
                        <div className="text-right">
                          {/* v3.54.2: Mostra importo pagato se disponibile */}
                          {sanction.payment_status === 'PAGATO' && sanction.reduced_amount ? (
                            <>
                              <p className="text-[#22c55e] font-bold">€{parseFloat(sanction.reduced_amount).toLocaleString('it-IT')}</p>
                              <p className="text-[#e8fbff]/40 text-xs line-through">€{parseFloat(sanction.amount).toLocaleString('it-IT')}</p>
                            </>
                          ) : (
                            <p className="text-[#ef4444] font-bold">€{parseFloat(sanction.amount).toLocaleString('it-IT')}</p>
                          )}
                          {getPaymentStatusBadge(sanction.payment_status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistiche Pagamenti */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
                <Euro className="h-4 w-4 text-[#14b8a6]" />
                Stato Pagamenti Sanzioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0b1220] rounded-lg text-center">
                  <p className="text-[#e8fbff]/60 text-xs mb-1">Totale Verbali</p>
                  <p className="text-2xl font-bold text-[#e8fbff]">{stats?.sanzioni.total_verbali || 0}</p>
                </div>
                <div className="p-4 bg-[#10b981]/10 rounded-lg text-center border border-[#10b981]/20">
                  <p className="text-[#10b981]/80 text-xs mb-1">Pagati</p>
                  <p className="text-2xl font-bold text-[#10b981]">{stats?.sanzioni.pagati || 0}</p>
                </div>
                <div className="p-4 bg-[#ef4444]/10 rounded-lg text-center border border-[#ef4444]/20">
                  <p className="text-[#ef4444]/80 text-xs mb-1">Non Pagati</p>
                  <p className="text-2xl font-bold text-[#ef4444]">{stats?.sanzioni.non_pagati || 0}</p>
                </div>
                <div className="p-4 bg-[#f59e0b]/10 rounded-lg text-center border border-[#f59e0b]/20">
                  <p className="text-[#f59e0b]/80 text-xs mb-1">In Ritardo</p>
                  <p className="text-2xl font-bold text-[#f59e0b]">{stats?.sanzioni.in_ritardo || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Da Controllare (Watchlist + Segnalazioni CRON) */}
        <TabsContent value="watchlist" className="space-y-4 mt-4">
          {/* v4.5.4: Sub-tab Attive / Controllate */}
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={watchlistSubTab === 'attive' ? 'default' : 'outline'}
              className={watchlistSubTab === 'attive' ? 'bg-[#f59e0b] text-black hover:bg-[#f59e0b]/80' : 'border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10'}
              onClick={() => setWatchlistSubTab('attive')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Attive
              <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30">
                {transgressions.filter(t => t.justification_display_status === 'SEGNALAZIONE' || t.justification_display_status === 'VERBALE_AUTOMATICO' || t.justification_display_status === 'IN_ATTESA' || t.justification_display_status === 'SCADUTA' || t.justification_display_status === 'CERTIFICATO_INVIATO').length + watchlist.length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={watchlistSubTab === 'controllate' ? 'default' : 'outline'}
              className={watchlistSubTab === 'controllate' ? 'bg-[#10b981] text-black hover:bg-[#10b981]/80' : 'border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10'}
              onClick={() => setWatchlistSubTab('controllate')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Controllate
              <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                {transgressions.filter(t => t.justification_display_status === 'SANZIONATO').length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={watchlistSubTab === 'archiviate' ? 'default' : 'outline'}
              className={watchlistSubTab === 'archiviate' ? 'bg-[#6b7280] text-white hover:bg-[#6b7280]/80' : 'border-[#6b7280]/30 text-[#6b7280] hover:bg-[#6b7280]/10'}
              onClick={() => setWatchlistSubTab('archiviate')}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Archiviate
              <Badge className="ml-2 bg-gray-500/20 text-gray-400 border-gray-500/30">
                {transgressions.filter(t => t.justification_display_status === 'ARCHIVIATA').length}
              </Badge>
            </Button>
          </div>

          {/* === SUB-TAB ATTIVE === */}
          {watchlistSubTab === 'attive' && (
          <>
          {/* Sezione Segnalazioni CRON */}
          {transgressions.filter(t => t.justification_display_status === 'SEGNALAZIONE' || t.justification_display_status === 'VERBALE_AUTOMATICO').length > 0 && (
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-[#ef4444]" />
                  Segnalazioni Automatiche CRON
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 ml-2">
                    {transgressions.filter(t => t.justification_display_status === 'SEGNALAZIONE' || t.justification_display_status === 'VERBALE_AUTOMATICO').length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[#e8fbff]/60">
                  Trasgressioni rilevate automaticamente dal sistema di monitoraggio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transgressions
                    .filter(t => t.justification_display_status === 'SEGNALAZIONE' || t.justification_display_status === 'VERBALE_AUTOMATICO')
                    .map((t) => (
                    <div 
                      key={`cron-${t.id}`} 
                      className="bg-[#0f1729] rounded-lg p-4 border border-[#ef4444]/20 hover:border-[#ef4444]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {t.transgression_type.replace(/_/g, ' ')}
                            </Badge>
                            {/* Semaforo sanzione */}
                            {t.justification_display_status === 'VERBALE_AUTOMATICO' || t.sanction_id ? (
                              <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
                                Sanzione Emessa
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                                Da Sanzionare
                              </Badge>
                            )}
                          </div>
                          <p className="text-[#e8fbff] font-medium text-lg">{t.business_name || 'Impresa N/D'}</p>
                          <p className="text-[#e8fbff]/50 text-sm">
                            P.IVA: {t.business_piva || t.business_cf || 'N/D'}
                          </p>
                          <p className="text-[#e8fbff]/50 text-sm mt-1">
                            {t.market_name} - {new Date(t.market_date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          {/* Orario entrata */}
                          <div className="mt-2 flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-[#f59e0b]" />
                              <span className="text-[#f59e0b] font-medium text-sm">
                                {t.checkin_local ? `Entrata: ${t.checkin_local}` : 'Nessuna entrata registrata'}
                              </span>
                            </div>
                            {t.detection_details && (
                              <span className="text-[#e8fbff]/40 text-xs">
                                {t.detection_details}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* Pulsante Emetti Sanzione */}
                          {!t.sanction_id && t.justification_display_status !== 'VERBALE_AUTOMATICO' && (
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={async () => {
                                if (!confirm(`Emettere sanzione per ${t.business_name}?\n\nVerrà creato un verbale automatico con importo predefinito.`)) return;
                                try {
                                  const res = await fetch(`${MIHUB_API}/market-settings/transgressions/${t.id}/sanction`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({})
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    alert(`Verbale ${data.data?.verbale_code || ''} creato con successo!`);
                                    setTransgressions(prev => prev.map(tr => 
                                      tr.id === t.id ? { ...tr, status: 'SANCTIONED', justification_display_status: 'VERBALE_AUTOMATICO', sanction_id: data.data?.id || -1 } : tr
                                    ));
                                  } else {
                                    alert(`Errore: ${data.error || 'Errore sconosciuto'}`);
                                  }
                                } catch (err) {
                                  console.error('Errore emissione sanzione:', err);
                                  alert('Errore di rete durante l\'emissione della sanzione');
                                }
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Emetti Sanzione
                            </Button>
                          )}
                          {(t.sanction_id || t.justification_display_status === 'VERBALE_AUTOMATICO') && (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30 justify-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Sanzionato
                            </Badge>
                          )}
                          {/* v4.5.5: Pulsante Archivia */}
                          {!t.sanction_id && t.justification_display_status !== 'VERBALE_AUTOMATICO' && (
                            archivingId === t.id ? (
                              <div className="flex flex-col gap-1">
                                <Input
                                  placeholder="Note (opzionale)"
                                  value={archiveNotes}
                                  onChange={(e) => setArchiveNotes(e.target.value)}
                                  className="bg-[#0b1220] border-gray-600 text-sm h-8"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="bg-gray-600 hover:bg-gray-700 text-white text-xs flex-1"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`${MIHUB_API}/market-settings/transgressions/${t.id}/archive`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ notes: archiveNotes })
                                        });
                                        const data = await res.json();
                                        if (res.ok && data.success) {
                                          // v4.5.6: Usa i dati completi dal backend per aggiornare lo stato locale
                                          // incluse le justification_notes appena salvate
                                          setTransgressions(prev => prev.map(tr =>
                                            tr.id === t.id ? { ...tr, ...data.data, justification_display_status: 'ARCHIVIATA' } : tr
                                          ));
                                          setArchivingId(null);
                                          setArchiveNotes('');
                                        } else {
                                          alert(`Errore: ${data.error || 'Errore'}`);
                                        }
                                      } catch (err) {
                                        alert('Errore di rete');
                                      }
                                    }}
                                  >
                                    Conferma
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-gray-600"
                                    onClick={() => { setArchivingId(null); setArchiveNotes(''); }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                                onClick={() => setArchivingId(t.id)}
                              >
                                <FileCheck className="h-4 w-4 mr-1" />
                                Archivia
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sezione Watchlist classica */}
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#f59e0b]" />
                  Imprese da Controllare
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Cerca impresa..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 bg-[#0b1220] border-[#f59e0b]/30 text-[#e8fbff]"
                  />
                </div>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Imprese con irregolarità o scadenze da verificare
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchlist.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-[#10b981]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessuna impresa da controllare</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">La watchlist è vuota</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#3b82f6]/20">
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">IMPRESA</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">MOTIVO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">PRIORITÀ</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">DATA</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchlist
                        .filter(item => 
                          !searchTerm || 
                          item.impresa_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.partita_iva?.includes(searchTerm)
                        )
                        .map((item) => (
                        <tr 
                          key={item.id} 
                          className="border-b border-[#3b82f6]/10 hover:bg-[#0b1220]/50 cursor-pointer"
                          onClick={async () => {
                            setSelectedWatchlistItem(item);
                            setShowWatchlistModal(true);
                            // Cerca il posteggio dell'impresa
                            try {
                              const res = await fetch(`${MIHUB_API}/stalls?impresa_id=${item.impresa_id}`);
                              const data = await res.json();
                              if (data.success && data.data?.length > 0) {
                                const stall = data.data[0];
                                if (stall.latitude && stall.longitude) {
                                  setWatchlistPosteggio({
                                    lat: parseFloat(stall.latitude),
                                    lng: parseFloat(stall.longitude),
                                    numero: stall.number || 'N/D'
                                  });
                                } else {
                                  setWatchlistPosteggio(null);
                                }
                              } else {
                                setWatchlistPosteggio(null);
                              }
                            } catch (err) {
                              console.error('Errore fetch posteggio:', err);
                              setWatchlistPosteggio(null);
                            }
                          }}
                        >
                          <td className="p-3">
                            <p className="text-[#e8fbff] font-medium text-sm">{item.impresa_nome || 'N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{item.partita_iva}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff]/80 text-sm">{item.trigger_description}</p>
                            <p className="text-[#e8fbff]/40 text-xs">{item.trigger_type}</p>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/60 text-sm">
                              {new Date(item.created_at).toLocaleDateString('it-IT')}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#f59e0b] hover:bg-[#f59e0b]/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWatchlistItem(item);
                                setShowWatchlistModal(true);
                              }}
                            >
                              <Info className="h-4 w-4 mr-1" />
                              Dettagli
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          </>
          )}

          {/* === SUB-TAB CONTROLLATE === */}
          {watchlistSubTab === 'controllate' && (
            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[#10b981]" />
                  Trasgressioni Controllate / Sanzionate
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">
                    {transgressions.filter(t => t.justification_display_status === 'SANZIONATO').length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[#e8fbff]/60">
                  Trasgressioni per cui è già stato emesso un verbale di sanzione
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transgressions.filter(t => t.justification_display_status === 'SANZIONATO').length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-[#10b981]/30 mx-auto mb-4" />
                    <p className="text-[#e8fbff]/50 text-lg">Nessuna trasgressione controllata</p>
                    <p className="text-[#e8fbff]/30 text-sm mt-2">Le trasgressioni sanzionate appariranno qui</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transgressions
                      .filter(t => t.justification_display_status === 'SANZIONATO')
                      .map((t) => (
                      <div 
                        key={`ctrl-${t.id}`} 
                        className="bg-[#0f1729] rounded-lg p-4 border border-[#10b981]/20 hover:border-[#10b981]/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                {t.transgression_type.replace(/_/g, ' ')}
                              </Badge>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                SANZIONATO
                              </Badge>
                            </div>
                            <p className="text-[#e8fbff] font-medium">{t.business_name}</p>
                            <p className="text-[#e8fbff]/50 text-sm">{t.market_name} &middot; {new Date(t.market_date).toLocaleDateString('it-IT')}</p>
                            <p className="text-[#e8fbff]/40 text-xs mt-1">{t.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Controllato
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* === SUB-TAB ARCHIVIATE === */}
          {watchlistSubTab === 'archiviate' && (
            <Card className="bg-[#1a2332] border-[#6b7280]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-[#6b7280]" />
                  Trasgressioni Archiviate
                  <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 ml-2">
                    {transgressions.filter(t => t.justification_display_status === 'ARCHIVIATA').length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[#e8fbff]/60">
                  Trasgressioni archiviate senza emissione di verbale
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transgressions.filter(t => t.justification_display_status === 'ARCHIVIATA').length === 0 ? (
                  <div className="text-center py-12">
                    <FileCheck className="h-16 w-16 text-[#6b7280]/30 mx-auto mb-4" />
                    <p className="text-[#e8fbff]/50 text-lg">Nessuna trasgressione archiviata</p>
                    <p className="text-[#e8fbff]/30 text-sm mt-2">Le trasgressioni archiviate appariranno qui</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transgressions
                      .filter(t => t.justification_display_status === 'ARCHIVIATA')
                      .map((t) => (
                      <div 
                        key={`arch-${t.id}`} 
                        className="bg-[#0f1729] rounded-lg p-4 border border-[#6b7280]/20 hover:border-[#6b7280]/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                {t.transgression_type.replace(/_/g, ' ')}
                              </Badge>
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                ARCHIVIATA
                              </Badge>
                            </div>
                            <p className="text-[#e8fbff] font-medium">{t.business_name}</p>
                            <p className="text-[#e8fbff]/50 text-sm">{t.market_name} &middot; {new Date(t.market_date).toLocaleDateString('it-IT')}</p>
                            <p className="text-[#e8fbff]/40 text-xs mt-1">{t.justification_notes || 'Archiviata senza note'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                              <FileCheck className="h-3 w-3 mr-1" />
                              Archiviata
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Verbali */}
        <TabsContent value="sanctions" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#ef4444]" />
                  Verbali Emessi
                </CardTitle>
                <Button 
                  size="sm" 
                  className="bg-[#ef4444] hover:bg-[#ef4444]/80 text-white"
                  onClick={() => window.location.href = '/pm/nuovo-verbale'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Verbale Professionale
                </Button>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Elenco dei verbali di sanzione emessi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sanctions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-[#ef4444]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessun verbale emesso</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">I verbali appariranno qui</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#3b82f6]/20">
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">VERBALE</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">IMPRESA</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">INFRAZIONE</th>
                        <th className="text-right p-3 text-[#e8fbff]/60 text-xs font-medium">IMPORTO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">STATO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">SCADENZA</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sanctions.map((sanction) => (
                        <tr key={sanction.id} className="border-b border-[#3b82f6]/10 hover:bg-[#0b1220]/50">
                          <td className="p-3">
                            <span className="text-[#e8fbff] font-mono text-sm">{sanction.verbale_code}</span>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff] text-sm">{sanction.impresa_nome || 'N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{sanction.partita_iva}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff]/80 text-sm">{sanction.infraction_code}</p>
                          </td>
                          <td className="p-3 text-right">
                            {/* v3.54.2: Mostra importo pagato se disponibile */}
                            {sanction.payment_status === 'PAGATO' && sanction.reduced_amount ? (
                              <div>
                                <span className="text-[#22c55e] font-bold">€{parseFloat(sanction.reduced_amount).toLocaleString('it-IT')}</span>
                                <p className="text-[#e8fbff]/40 text-xs line-through">€{parseFloat(sanction.amount).toLocaleString('it-IT')}</p>
                              </div>
                            ) : (
                              <span className="text-[#ef4444] font-bold">€{parseFloat(sanction.amount).toLocaleString('it-IT')}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {getPaymentStatusBadge(sanction.payment_status)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/60 text-sm">
                              {sanction.due_date ? new Date(sanction.due_date).toLocaleDateString('it-IT') : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
                              onClick={() => window.open(`${MIHUB_API}/verbali/${sanction.id}/pdf`, '_blank')}
                              title="Visualizza Verbale"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#3b82f6] hover:bg-[#3b82f6]/10"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${MIHUB_API}/verbali/${sanction.id}/pdf`;
                                link.download = `Verbale_${sanction.verbale_code}.pdf`;
                                link.click();
                              }}
                              title="Scarica PDF Verbale"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-[#10b981] hover:bg-[#10b981]/10"
                              onClick={async () => {
                                if (confirm('Inviare notifica verbale all\'impresa?')) {
                                  try {
                                    const res = await fetch(`${MIHUB_API}/verbali/${sanction.id}/invia`, { method: 'POST' });
                                    const data = await res.json();
                                    if (data.success) alert('✅ Notifica inviata!');
                                    else alert('❌ Errore: ' + data.error);
                                  } catch (e) { alert('❌ Errore invio'); }
                                }
                              }}
                              title="Invia Notifica all'Impresa"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tipi Infrazione */}
        <TabsContent value="infractions" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#3b82f6]" />
                Catalogo Tipi di Infrazione
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Elenco delle infrazioni configurate per il commercio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {infractionTypes.map((type) => (
                  <div key={type.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(type.category)}
                      <Badge className="bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30 text-xs">
                        {type.category}
                      </Badge>
                    </div>
                    <p className="text-[#e8fbff] font-medium text-sm mb-1">{type.code.replace(/_/g, ' ')}</p>
                    <p className="text-[#e8fbff]/50 text-xs mb-3">{type.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#e8fbff]/40">
                        Min: €{parseFloat(type.min_amount).toLocaleString('it-IT')}
                      </span>
                      <span className="text-[#ef4444] font-bold">
                        €{parseFloat(type.default_amount).toLocaleString('it-IT')}
                      </span>
                      <span className="text-[#e8fbff]/40">
                        Max: €{parseFloat(type.max_amount).toLocaleString('it-IT')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pratiche SUAP - Domande Spunta */}
        <TabsContent value="suap" className="space-y-4 mt-4">
          {/* Sezione Notifiche Stato Pratiche con Semaforo */}
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#8b5cf6]" />
                  Notifiche SUAP - Stato Pratiche
                </CardTitle>
                <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                  {notificheSuap.filter(n => !n.letta).length} nuove
                </Badge>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Notifiche automatiche dal SUAP quando una pratica viene approvata, negata o messa in revisione
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificheSuap.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-[#8b5cf6]/30 mx-auto mb-3" />
                  <p className="text-[#e8fbff]/50">Nessuna notifica SUAP</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-1">Le notifiche di cambio stato pratiche appariranno qui</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {notificheSuap.slice(0, 5).map((notifica) => (
                    <div 
                      key={notifica.id} 
                      className={`p-4 rounded-lg border transition-all ${
                        notifica.letta 
                          ? 'bg-[#0f1729]/50 border-[#8b5cf6]/10' 
                          : 'bg-[#8b5cf6]/5 border-[#8b5cf6]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[#8b5cf6] font-mono text-sm">{notifica.numero_pratica}</span>
                            <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30 text-xs">
                              {notifica.tipo_pratica}
                            </Badge>
                            {!notifica.letta && (
                              <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse"></span>
                            )}
                          </div>
                          <p className="text-[#e8fbff] text-sm mb-1">
                            <span className="text-[#e8fbff]/60">Impresa:</span> {notifica.impresa_nome}
                          </p>
                          <p className="text-[#e8fbff]/70 text-sm">{notifica.messaggio}</p>
                          <p className="text-[#e8fbff]/40 text-xs mt-2">
                            {notifica.data_cambio_stato ? new Date(notifica.data_cambio_stato).toLocaleString('it-IT') : '-'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getPraticaStatusIndicator(notifica.stato_attuale)}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Dettagli
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabella Domande Spunta */}
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-[#8b5cf6]" />
                  Domande Spunta - Pratiche SUAP
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={fetchAllData}
                  className="border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aggiorna
                </Button>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Domande di partecipazione alla spunta - stato e esiti dal SUAP
              </CardDescription>
            </CardHeader>
            <CardContent>
              {domandeSpunta.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-16 w-16 text-[#8b5cf6]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessuna domanda spunta recente</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">Le nuove domande appariranno qui</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#8b5cf6]/20">
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">IMPRESA</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">MERCATO</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">GIORNO</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">SETTORE</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">PRESENZE</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">WALLET</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">STATO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">DATA</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {domandeSpunta.map((domanda) => (
                        <tr key={domanda.id} className="border-b border-[#8b5cf6]/10 hover:bg-[#0b1220]/50">
                          <td className="p-3">
                            <p className="text-[#e8fbff] text-sm font-medium">{domanda.company_name || 'N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{domanda.company_piva}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff] text-sm">{domanda.market_name || 'N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{domanda.market_municipality}</p>
                          </td>
                          <td className="p-3">
                            <span className="text-[#e8fbff]/70 text-sm">{domanda.market_days || '-'}</span>
                          </td>
                          <td className="p-3">
                            <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30 text-xs">
                              {domanda.settore_richiesto || 'N/D'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff] text-sm">{domanda.numero_presenze || 0}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-sm font-medium ${parseFloat(String(domanda.wallet_balance || 0)) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                              € {parseFloat(String(domanda.wallet_balance || 0)).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {getPraticaStatusIndicator(domanda.stato)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/60 text-sm">
                              {domanda.data_richiesta ? new Date(domanda.data_richiesta).toLocaleDateString('it-IT') : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button size="sm" variant="ghost" className="text-[#8b5cf6] hover:bg-[#8b5cf6]/10">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sottotab Graduatoria Spunta */}
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#f59e0b]" />
                  Graduatoria Spuntisti
                </CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={fetchAllData}
                  className="border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aggiorna
                </Button>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Graduatoria presenze spuntisti - punteggio e posizione per l'anno corrente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {graduatoriaLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 text-[#f59e0b]/50 mx-auto mb-3 animate-spin" />
                  <p className="text-[#e8fbff]/50">Caricamento graduatoria...</p>
                </div>
              ) : graduatoriaSpunta.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-[#f59e0b]/30 mx-auto mb-4" />
                  <p className="text-[#e8fbff]/50 text-lg">Nessuno spuntista in graduatoria</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">La graduatoria si popola quando gli spuntisti registrano presenze</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#f59e0b]/20">
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">POS.</th>
                        <th className="text-left p-3 text-[#e8fbff]/60 text-xs font-medium">IMPRESA</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">PRESENZE</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">PUNTEGGIO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">POSTEGGIO</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">WALLET</th>
                        <th className="text-center p-3 text-[#e8fbff]/60 text-xs font-medium">ANNO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {graduatoriaSpunta
                        .sort((a, b) => (b.punteggio || 0) - (a.punteggio || 0))
                        .map((spuntista, idx) => (
                        <tr key={spuntista.id || idx} className="border-b border-[#f59e0b]/10 hover:bg-[#0b1220]/50">
                          <td className="p-3 text-center">
                            <span className={`text-sm font-bold ${
                              idx === 0 ? 'text-[#f59e0b]' : idx === 1 ? 'text-[#94a3b8]' : idx === 2 ? 'text-[#cd7f32]' : 'text-[#e8fbff]/70'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="text-[#e8fbff] text-sm font-medium">{spuntista.impresa_nome || 'N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-xs">{spuntista.impresa_piva || spuntista.codice_fiscale || ''}</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#3b82f6] text-sm font-medium">{spuntista.presenze_totali || 0}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#f59e0b] text-sm font-bold">{spuntista.punteggio || 0}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/70 text-sm">{spuntista.stall_number || '-'}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-sm font-medium ${parseFloat(String(spuntista.wallet_balance || 0)) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {spuntista.wallet_balance != null ? `\u20ac ${parseFloat(String(spuntista.wallet_balance)).toFixed(2)}` : '-'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[#e8fbff]/60 text-sm">{spuntista.anno || new Date().getFullYear()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notifiche PM - Usa NotificationManager come SUAP e Wallet */}
        <TabsContent value="notifiche" className="space-y-6 mt-4">
          {/* Sezione Notifiche SUAP - Messaggi dal SUAP */}
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#8b5cf6]" />
                  Notifiche dal SUAP
                </CardTitle>
                <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30">
                  {notificheSuap.filter(n => !n.letta).length} nuove
                </Badge>
              </div>
              <CardDescription className="text-[#e8fbff]/60">
                Comunicazioni automatiche dal SUAP - stesse notifiche inviate alle imprese
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificheSuap.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-[#8b5cf6]/30 mx-auto mb-3" />
                  <p className="text-[#e8fbff]/50">Nessuna notifica dal SUAP</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-1">Le comunicazioni del SUAP appariranno qui</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {notificheSuap.map((notifica) => (
                    <div 
                      key={notifica.id} 
                      className={`p-4 rounded-lg border transition-all ${
                        notifica.letta 
                          ? 'bg-[#0f1729]/50 border-[#8b5cf6]/10' 
                          : 'bg-[#8b5cf6]/5 border-[#8b5cf6]/30'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="h-5 w-5 text-[#8b5cf6]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[#e8fbff] font-medium">SUAP</span>
                            <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30 text-xs">
                              {notifica.tipo_pratica}
                            </Badge>
                            {!notifica.letta && (
                              <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse"></span>
                            )}
                          </div>
                          <p className="text-[#e8fbff] text-sm font-medium mb-1">
                            Pratica {notifica.numero_pratica} - {notifica.impresa_nome}
                          </p>
                          <p className="text-[#e8fbff]/70 text-sm">{notifica.messaggio}</p>
                          <p className="text-[#e8fbff]/40 text-xs mt-2">
                            {notifica.data_cambio_stato ? new Date(notifica.data_cambio_stato).toLocaleString('it-IT') : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sezione Notifiche Manuali PM */}
          <NotificationManager 
            mittenteTipo="POLIZIA_MUNICIPALE"
            mittenteId={isImpersonating && impersonatedComuneId ? parseInt(impersonatedComuneId) : 1}
            mittenteNome={`Polizia Municipale${isImpersonating ? '' : ' - Comune di Grosseto'}`}
            comuneId={isImpersonating && impersonatedComuneId ? parseInt(impersonatedComuneId) : undefined}
          />
        </TabsContent>

        {/* Tab: Giustifiche */}
        <TabsContent value="giustifiche" className="space-y-4 mt-4">
          {/* Sezione Giustificazioni Manuali (inviate dalle imprese) */}
          <Card className="bg-[#1a2332] border-[#14b8a6]/30 mt-4">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#14b8a6]" />
                Certificati e Giustificazioni Imprese
              </CardTitle>
              <CardDescription className="text-[#e8fbff]/60">
                Giustificazioni inviate manualmente dalle imprese (certificati medici, uscite anticipate)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* v4.5.6: Indicatori colorati grandi SEMPRE visibili */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-lg p-4 text-center border border-yellow-500/20">
                    <p className="text-3xl font-bold text-yellow-400">
                      {giustificazioniManuali.filter(g => g.status === 'INVIATA').length}
                    </p>
                    <p className="text-xs text-[#e8fbff]/50 mt-1">Da Valutare</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 rounded-lg p-4 text-center border border-[#10b981]/20">
                    <p className="text-3xl font-bold text-[#10b981]">
                      {giustificazioniManuali.filter(g => g.status === 'ACCETTATA').length}
                    </p>
                    <p className="text-xs text-[#e8fbff]/50 mt-1">Accettate</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-lg p-4 text-center border border-red-500/20">
                    <p className="text-3xl font-bold text-red-400">
                      {giustificazioniManuali.filter(g => g.status === 'RIFIUTATA').length}
                    </p>
                    <p className="text-xs text-[#e8fbff]/50 mt-1">Rifiutate</p>
                  </div>
                </div>
              {giustificazioniManuali.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-[#14b8a6]/30 mx-auto mb-3" />
                  <p className="text-[#e8fbff]/50">Nessuna giustificazione in attesa di revisione</p>
                </div>
              ) : (
                <div>
                  {/* Lista giustificazioni manuali */}
                  <div className="space-y-3">
                    {giustificazioniManuali.map((g) => (
                      <div 
                        key={`manual-${g.id}`} 
                        className="bg-[#0f1729] rounded-lg p-4 border border-[#14b8a6]/20 hover:border-[#14b8a6]/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30">
                                {g.tipo_giustifica === 'certificato_medico' ? 'Certificato Medico'
                                  : g.tipo_giustifica === 'uscita_anticipata' ? 'Uscita Anticipata'
                                  : 'Altro'}
                              </Badge>
                              <Badge 
                                className={`${
                                  g.status === 'INVIATA'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : g.status === 'ACCETTATA'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}
                              >
                                {g.status === 'INVIATA' ? 'Da Valutare' : g.status === 'ACCETTATA' ? 'Accettata' : 'Rifiutata'}
                              </Badge>
                            </div>
                            <p className="text-[#e8fbff] font-medium">{g.impresa_nome || 'Impresa N/D'}</p>
                            <p className="text-[#e8fbff]/50 text-sm">
                              {g.market_name ? `${g.market_name} - ` : ''}{new Date(g.giorno_mercato).toLocaleDateString('it-IT')}
                            </p>
                            {g.reason && (
                              <p className="text-[#e8fbff]/40 text-xs mt-1 italic">"{g.reason}"</p>
                            )}
                            {g.file_name && (
                              <p className="text-[#e8fbff]/30 text-xs mt-1">📎 {g.file_name}</p>
                            )}
                            <p className="text-[#e8fbff]/30 text-xs mt-1">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Inviata il {new Date(g.created_at).toLocaleDateString('it-IT')} alle {new Date(g.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            {g.justification_file_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/20"
                                onClick={() => window.open(`https://api.mio-hub.me${g.justification_file_url}`, '_blank')}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Vedi
                              </Button>
                            )}
                            {g.status === 'INVIATA' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`${MIHUB_API}/giustificazioni/${g.id}/review`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'APPROVE', notes: 'Giustificazione accettata' })
                                      });
                                      if (res.ok) {
                                        setGiustificazioniManuali(prev => prev.map(gm => gm.id === g.id ? { ...gm, status: 'ACCETTATA' } : gm));
                                      }
                                    } catch (err) {
                                      console.error('Errore approvazione giustificazione:', err);
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accetta
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`${MIHUB_API}/giustificazioni/${g.id}/review`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'REJECT', notes: 'Giustificazione rifiutata' })
                                      });
                                      if (res.ok) {
                                        setGiustificazioniManuali(prev => prev.map(gm => gm.id === g.id ? { ...gm, status: 'RIFIUTATA' } : gm));
                                      }
                                    } catch (err) {
                                      console.error('Errore rifiuto giustificazione:', err);
                                    }
                                  }}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Rifiuta
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                 </div>
              )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Tab: Storico Sessioni Mercato */}
        <TabsContent value="storico" className="space-y-4 mt-4">
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#8b5cf6]" />
                    Storico Sessioni Mercato
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Cronologia dei mercati chiusi con dettaglio presenze
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-[#e8fbff]/60 text-sm">Cerca per data:</Label>
                    <Input
                      type="date"
                      value={storicoDateFilter}
                      onChange={(e) => setStoricoDateFilter(e.target.value)}
                      className="w-44 bg-[#0b1220] border-[#8b5cf6]/30 text-[#e8fbff]"
                    />
                  </div>
                  {storicoDateFilter && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setStoricoDateFilter('')}
                      className="text-gray-400 hover:text-[#e8fbff]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10"
                    onClick={() => {
                      // Genera CSV delle sessioni filtrate
                      const filteredSessions = marketSessions.filter(session => {
                        if (!storicoDateFilter) return true;
                        const sessionDate = session.data_mercato.split('T')[0];
                        return sessionDate === storicoDateFilter;
                      });
                      // BOM per Excel UTF-8 + CSV con separatore punto e virgola
                      const csvContent = [
                        '\uFEFF' + ['Mercato', 'Comune', 'Data', 'Posteggi Occupati', 'Presenze', 'Totale Incassato EUR'].join(';'),
                        ...filteredSessions.map(s => [
                          s.market_name,
                          s.comune,
                          new Date(s.data_mercato).toLocaleDateString('it-IT'),
                          s.posteggi_occupati,
                          s.totale_presenze,
                          parseFloat(s.totale_incassato || '0').toFixed(2).replace('.', ',')
                        ].join(';'))
                      ].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `storico_mercati_${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {marketSessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna sessione mercato chiusa</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {marketSessions
                    .filter(session => {
                      if (!storicoDateFilter) return true;
                      const sessionDate = session.data_mercato.split('T')[0];
                      return sessionDate === storicoDateFilter;
                    })
                    .map((session, idx) => (
                    <div 
                      key={`${session.market_id}-${session.data_mercato}-${idx}`}
                      className="bg-[#0d1520] border border-[#8b5cf6]/20 rounded-lg p-4 hover:border-[#8b5cf6]/50 cursor-pointer transition-colors"
                      onClick={async () => {
                        setSelectedSession(session);
                        setShowSessionModal(true);
                        setDetailsLoading(true);
                        try {
                          // Usa l'ID della sessione per ottenere i dettagli corretti
                          const res = await fetch(`${MIHUB_API}/presenze/sessioni/${session.id}/dettaglio`);
                          const data = await res.json();
                          if (data.success) {
                            // Rimuovi duplicati basandosi su stall_id
                            const uniqueDetails = data.presenze.filter((p: SessionDetail, i: number, arr: SessionDetail[]) => 
                              arr.findIndex(x => x.stall_id === p.stall_id) === i
                            );
                            setSessionDetails(uniqueDetails);
                          }
                        } catch (err) {
                          console.error('Errore fetch dettaglio:', err);
                        } finally {
                          setDetailsLoading(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-[#8b5cf6]/20 p-3 rounded-lg">
                            <Store className="h-6 w-6 text-[#8b5cf6]" />
                          </div>
                          <div>
                            <h4 className="text-[#e8fbff] font-medium">{session.market_name}</h4>
                            <p className="text-gray-400 text-sm">{session.comune}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-[#e8fbff] font-bold">
                              {new Date(session.data_mercato).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-gray-400 text-xs">Data Mercato</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[#3b82f6] font-bold">{session.posteggi_occupati}</p>
                            <p className="text-gray-400 text-xs">Posteggi</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[#10b981] font-bold">€{parseFloat(session.totale_incassato || '0').toFixed(2)}</p>
                            <p className="text-gray-400 text-xs">Incassato</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {marketSessions.filter(session => {
                    if (!storicoDateFilter) return true;
                    const sessionDate = session.data_mercato.split('T')[0];
                    return sessionDate === storicoDateFilter;
                  }).length === 0 && storicoDateFilter && (
                    <div className="text-center py-8 text-gray-400">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nessuna sessione trovata per la data selezionata</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Segnalazioni Civiche per PM */}
        <TabsContent value="segnalazioni" className="space-y-4 mt-4">
          <SegnalazioniPMSubtab comuneId={isImpersonating && impersonatedComuneId ? parseInt(impersonatedComuneId) : 1} />
        </TabsContent>
      </Tabs>

      {/* Modal Dettaglio Watchlist con Navigazione GPS */}
      {showWatchlistModal && selectedWatchlistItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#f59e0b]/30 rounded-lg w-full max-w-lg">
            <div className="p-4 border-b border-[#f59e0b]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#f59e0b]/20 p-2 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-[#f59e0b]" />
                </div>
                <div>
                  <h3 className="text-[#e8fbff] font-bold text-lg">Controllo da Effettuare</h3>
                  <p className="text-gray-400 text-sm">{selectedWatchlistItem.impresa_nome}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowWatchlistModal(false);
                  setSelectedWatchlistItem(null);
                  setWatchlistPosteggio(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {/* Info Impresa */}
              <div className="bg-[#0b1220] rounded-lg p-4">
                <h4 className="text-[#e8fbff]/60 text-xs uppercase mb-2">Dati Impresa</h4>
                <p className="text-[#e8fbff] font-medium">{selectedWatchlistItem.impresa_nome}</p>
                <p className="text-[#e8fbff]/60 text-sm">P.IVA: {selectedWatchlistItem.partita_iva}</p>
              </div>
              
              {/* Motivo Controllo */}
              <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-4">
                <h4 className="text-[#f59e0b] text-xs uppercase mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Motivo del Controllo
                </h4>
                <p className="text-[#e8fbff] font-medium">{selectedWatchlistItem.trigger_description}</p>
                <p className="text-[#e8fbff]/50 text-sm mt-1">Tipo: {selectedWatchlistItem.trigger_type?.replace(/_/g, ' ')}</p>
              </div>
              
              {/* Priorità e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0b1220] rounded-lg p-3 text-center">
                  <p className="text-[#e8fbff]/60 text-xs mb-1">Priorità</p>
                  <Badge className={getPriorityColor(selectedWatchlistItem.priority)}>
                    {selectedWatchlistItem.priority}
                  </Badge>
                </div>
                <div className="bg-[#0b1220] rounded-lg p-3 text-center">
                  <p className="text-[#e8fbff]/60 text-xs mb-1">Data Segnalazione</p>
                  <p className="text-[#e8fbff] font-medium">
                    {new Date(selectedWatchlistItem.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>
              
              {/* Navigazione GPS */}
              {watchlistPosteggio ? (
                <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-4">
                  <h4 className="text-[#10b981] text-xs uppercase mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Posizione Posteggio
                  </h4>
                  <p className="text-[#e8fbff] text-sm mb-3">Posteggio n. {watchlistPosteggio.numero}</p>
                  <Button
                    className="w-full bg-[#10b981] hover:bg-[#10b981]/80 text-white"
                    onClick={() => {
                      // Apri Google Maps con navigazione
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${watchlistPosteggio.lat},${watchlistPosteggio.lng}&travelmode=driving`;
                      window.open(url, '_blank');
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Avvia Navigazione GPS
                  </Button>
                </div>
              ) : (
                <div className="bg-[#0b1220] rounded-lg p-4 text-center">
                  <MapPin className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Coordinate GPS non disponibili per questo posteggio</p>
                </div>
              )}
              
              {/* Azioni */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
                  onClick={() => {
                    setShowWatchlistModal(false);
                    window.location.href = `/pm/nuovo-verbale?impresa=${selectedWatchlistItem.impresa_id}`;
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Prepara Verbale
                </Button>
                <Button
                  className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/80 text-white"
                  onClick={() => {
                    // Segna come controllato
                    setShowWatchlistModal(false);
                    setSelectedWatchlistItem(null);
                    alert('✅ Controllo registrato!');
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Segna Controllato
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettaglio Sessione */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#8b5cf6]/30 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-[#8b5cf6]/20 flex items-center justify-between">
              <div>
                <h3 className="text-[#e8fbff] font-bold text-lg">{selectedSession.market_name}</h3>
                <p className="text-gray-400 text-sm">
                  {new Date(selectedSession.data_mercato).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10"
                  onClick={() => {
                    // Separa concessionari e spuntisti
                    const concessionari = sessionDetails.filter(d => d.tipo_presenza === 'CONCESSION' || !d.tipo_presenza);
                    const spuntisti = sessionDetails.filter(d => d.tipo_presenza === 'SPUNTA');
                    
                    // Calcola statistiche dai dettagli
                    const usciteRegistrate = sessionDetails.filter(d => d.ora_uscita).length;
                    const totaleIncassato = sessionDetails.reduce((sum, d) => sum + parseFloat(d.importo_addebitato || '0'), 0);
                    // Calcola posteggi unici (non duplicati) - escludi null/undefined per spuntisti senza posteggio
                    const posteggiUnici = new Set(sessionDetails.map(d => d.stall_number).filter(Boolean)).size;
                    
                    // Trova prima entrata e ultima uscita dai dettagli
                    const orariAccesso = sessionDetails.filter(d => d.ora_accesso).map(d => d.ora_accesso).sort();
                    const orariUscita = sessionDetails.filter(d => d.ora_uscita).map(d => d.ora_uscita).sort();
                    const primaEntrata = orariAccesso[0] || '-';
                    const ultimaUscita = orariUscita[orariUscita.length - 1] || '-';
                    
                    // CSV con separatore punto e virgola (standard italiano per Excel)
                    const SEP = ';';
                    // Funzione per formattare data in modo sicuro
                    const formatData = (dataStr: string | null | undefined) => {
                      if (!dataStr) return '-';
                      try {
                        const d = new Date(dataStr);
                        if (isNaN(d.getTime())) return '-';
                        return d.toLocaleDateString('it-IT');
                      } catch { return '-'; }
                    };
                    // Funzione per formattare orario in modo sicuro
                    const formatOrario = (orario: string | null | undefined) => {
                      if (!orario || orario === 'null' || orario === 'undefined') return '-';
                      // Se è già in formato HH:MM, restituiscilo
                      if (/^\d{2}:\d{2}$/.test(orario)) return orario;
                      // Prova a parsare come data
                      try {
                        const d = new Date(orario);
                        if (isNaN(d.getTime())) return orario;
                        return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                      } catch { return orario; }
                    };
                    const csvContent = [
                      // BOM per Excel UTF-8
                      '\uFEFF',
                      // Resoconto in formato tabella
                      'RESOCONTO MERCATO',
                      `Campo${SEP}Valore`,
                      `Mercato${SEP}${selectedSession.market_name}`,
                      `Comune${SEP}${selectedSession.comune}`,
                      `Data${SEP}${new Date(selectedSession.data_mercato).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`,
                      `Prima Entrata${SEP}${primaEntrata}`,
                      `Ultima Uscita${SEP}${ultimaUscita}`,
                      `Posteggi Occupati${SEP}${posteggiUnici}`,
                      `Concessionari${SEP}${concessionari.length}`,
                      `Spuntisti${SEP}${spuntisti.length}`,
                      `Uscite Registrate${SEP}${usciteRegistrate}`,
                      `Totale Incassato${SEP}${totaleIncassato.toFixed(2)} EUR`,
                      '',
                      // Sezione Concessionari
                      `LISTA CONCESSIONARI (${concessionari.length})`,
                      `N. Posteggio${SEP}Impresa${SEP}P.IVA${SEP}Importo EUR${SEP}Giorno${SEP}Accesso${SEP}Rifiuti${SEP}Uscita${SEP}Presenze${SEP}Assenze`,
                      ...concessionari.map(d => [
                        d.stall_number || '',
                        d.impresa_nome || '',
                        d.impresa_piva || '',
                        parseFloat(d.importo_addebitato || '0').toFixed(2).replace('.', ','),
                        formatData(d.giorno),
                        formatOrario(d.ora_accesso),
                        formatOrario(d.ora_rifiuti),
                        formatOrario(d.ora_uscita),
                        d.presenze_totali || 0,
                        d.assenze_non_giustificate || 0
                      ].join(SEP)),
                      '',
                      // Sezione Spuntisti
                      `LISTA SPUNTISTI (${spuntisti.length})`,
                      `N. Posteggio${SEP}Impresa${SEP}P.IVA${SEP}Importo EUR${SEP}Giorno${SEP}Accesso${SEP}Rifiuti${SEP}Uscita${SEP}Presenze${SEP}Assenze`,
                      ...spuntisti.map(d => [
                        d.stall_number || '',
                        d.impresa_nome || '',
                        d.impresa_piva || '',
                        parseFloat(d.importo_addebitato || '0').toFixed(2).replace('.', ','),
                        formatData(d.giorno),
                        formatOrario(d.ora_accesso),
                        formatOrario(d.ora_rifiuti),
                        formatOrario(d.ora_uscita),
                        d.presenze_totali || 0,
                        d.assenze_non_giustificate || 0
                      ].join(SEP))
                    ].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `presenze_${selectedSession.market_name.replace(/\s+/g, '_')}_${new Date(selectedSession.data_mercato).toISOString().split('T')[0]}.csv`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Esporta Presenze
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setShowSessionModal(false);
                    setSelectedSession(null);
                    setSessionDetails([]);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              {detailsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#8b5cf6]" />
                  <p className="text-gray-400 mt-2">Caricamento cronologia...</p>
                </div>
              ) : (
                <>
                  {/* Stats rapide - calcolate dai dettagli */}
                  {(() => {
                    const usciteCalcolate = sessionDetails.filter(d => d.ora_uscita).length;
                    const totaleCalcolato = sessionDetails.reduce((sum, d) => sum + parseFloat(d.importo_addebitato || '0'), 0);
                    const concessionariCount = sessionDetails.filter(d => d.tipo_presenza === 'CONCESSION' || !d.tipo_presenza).length;
                    const spuntistiCount = sessionDetails.filter(d => d.tipo_presenza === 'SPUNTA').length;
                    // Calcola posteggi unici (non duplicati) - escludi null/undefined per spuntisti senza posteggio
                    const posteggiUnici = new Set(sessionDetails.map(d => d.stall_number).filter(Boolean)).size;
                    return (
                      <div className="grid grid-cols-5 gap-3 mb-4">
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#3b82f6] font-bold text-xl">{posteggiUnici}</p>
                          <p className="text-gray-400 text-xs">Posteggi Occupati</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#10b981] font-bold text-xl">{concessionariCount}</p>
                          <p className="text-gray-400 text-xs">Concessionari</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#f97316] font-bold text-xl">{spuntistiCount}</p>
                          <p className="text-gray-400 text-xs">Spuntisti</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#f59e0b] font-bold text-xl">{usciteCalcolate}</p>
                          <p className="text-gray-400 text-xs">Uscite Registrate</p>
                        </div>
                        <div className="bg-[#0d1520] p-3 rounded-lg text-center">
                          <p className="text-[#8b5cf6] font-bold text-xl">€{totaleCalcolato.toFixed(2)}</p>
                          <p className="text-gray-400 text-xs">Totale Incassato</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Tabella Concessionari */}
                  {(() => {
                    const concessionari = sessionDetails.filter(d => d.tipo_presenza === 'CONCESSION' || !d.tipo_presenza);
                    const spuntisti = sessionDetails.filter(d => d.tipo_presenza === 'SPUNTA');
                    
                    const renderTable = (data: SessionDetail[], title: string, color: string) => (
                      <div className="mb-6">
                        <h4 className={`text-${color} font-semibold mb-2 flex items-center gap-2`}>
                          <Store className="h-4 w-4" />
                          {title} ({data.length})
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-[#8b5cf6]/20">
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">N°</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Impresa</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Importo</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Giorno</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Accesso</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Rifiuti</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Uscita</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Pres.</th>
                                <th className="text-left py-2 px-3 text-gray-400 text-sm">Ass.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.map((detail, idx) => (
                                <tr key={`${detail.id}-${idx}`} className="border-b border-[#8b5cf6]/10 hover:bg-[#0d1520]/50">
                                  <td className="py-2 px-3 text-[#3b82f6] font-medium">{detail.stall_number}</td>
                                  <td className="py-2 px-3">
                                    <p className="text-[#e8fbff] text-sm">{detail.impresa_nome}</p>
                                    <p className="text-gray-500 text-xs">{detail.impresa_piva}</p>
                                  </td>
                                  <td className="py-2 px-3 text-[#10b981]">€{parseFloat(detail.importo_addebitato || '0').toFixed(2)}</td>
                                  <td className="py-2 px-3 text-gray-400 text-sm">
                                    {new Date(detail.giorno).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  <td className="py-2 px-3 text-[#3b82f6]">{detail.ora_accesso || '-'}</td>
                                  <td className="py-2 px-3 text-gray-400">{detail.ora_rifiuti || '-'}</td>
                                  <td className="py-2 px-3 text-[#f59e0b]">{detail.ora_uscita || '-'}</td>
                                  <td className="py-2 px-3 text-[#10b981]">{detail.presenze_totali || 0}</td>
                                  <td className="py-2 px-3 text-red-400">{detail.assenze_non_giustificate || 0}</td>
                                </tr>
                              ))}
                              {data.length === 0 && (
                                <tr>
                                  <td colSpan={9} className="py-4 text-center text-gray-500">Nessuna presenza registrata</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                    
                    return (
                      <>
                        {renderTable(concessionari, 'Concessionari', '[#10b981]')}
                        {renderTable(spuntisti, 'Spuntisti', '[#f97316]')}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal Visualizzazione Risposta */}
      {showRispostaModal && selectedRisposta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#ec4899]/30 rounded-lg w-full max-w-lg">
            <div className="p-4 border-b border-[#ec4899]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#ec4899]" />
                <h3 className="text-[#e8fbff] font-bold">Messaggio Ricevuto</h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowRispostaModal(false);
                  setSelectedRisposta(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-[#0d1520] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">MITTENTE</p>
                <p className="text-[#e8fbff] font-medium">{selectedRisposta.mittente_nome}</p>
                <p className="text-gray-500 text-xs">{selectedRisposta.mittente_tipo}</p>
              </div>
              
              <div>
                <p className="text-gray-400 text-xs mb-1">OGGETTO</p>
                <p className="text-[#e8fbff] font-medium">{selectedRisposta.titolo}</p>
              </div>
              
              <div className="bg-[#0d1520] p-4 rounded-lg">
                <p className="text-gray-400 text-xs mb-2">MESSAGGIO</p>
                <p className="text-[#e8fbff] whitespace-pre-wrap">{selectedRisposta.messaggio}</p>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Ricevuto: {new Date(selectedRisposta.created_at).toLocaleString('it-IT')}</span>
                <Badge className={selectedRisposta.letta ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                  {selectedRisposta.letta ? 'Letto' : 'Non letto'}
                </Badge>
              </div>
            </div>
            <div className="p-4 border-t border-[#ec4899]/20 flex justify-end">
              <Button 
                onClick={() => {
                  setShowRispostaModal(false);
                  setSelectedRisposta(null);
                }}
                className="bg-[#ec4899]/20 text-[#ec4899] hover:bg-[#ec4899]/30"
              >
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SegnalazioniPMSubtab - Subtab per visualizzare segnalazioni civiche per PM
 */
function SegnalazioniPMSubtab({ comuneId }: { comuneId: number }) {
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Carica stats
        const statsRes = await fetch(`${MIHUB_API}/civic-reports/stats?comune_id=${comuneId}`);
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data);

        // Carica lista segnalazioni - storico completo
        const reportsRes = await fetch(`${MIHUB_API}/civic-reports?comune_id=${comuneId}&limit=200`);
        const reportsData = await reportsRes.json();
        if (reportsData.success) setReports(reportsData.data || []);
      } catch (error) {
        console.error('Errore caricamento segnalazioni:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [comuneId]);

  const handleAssign = async (reportId: number) => {
    try {
      const res = await fetch(`${MIHUB_API}/civic-reports/${reportId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: 1 }) // ID utente PM
      });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'in_progress', assigned_to: 'PM' } : r));
      }
    } catch (error) {
      console.error('Errore assegnazione:', error);
    }
  };

  const handleResolve = async (reportId: number) => {
    try {
      const res = await fetch(`${MIHUB_API}/civic-reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: 'Risolto da PM', credit_tcc: true })
      });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
        // Aggiorna stats dopo risoluzione
        const statsRes = await fetch(`${MIHUB_API}/civic-reports/stats?comune_id=${comuneId}`);
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data);
      }
    } catch (error) {
      console.error('Errore risoluzione:', error);
    }
  };

  const openGoogleMaps = (lat: string, lng: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Card className="bg-[#1a2332] border-[#06b6d4]/30">
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#06b6d4]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#f59e0b]/10 border-[#f59e0b]/30">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-[#f59e0b]">{stats?.pending || 0}</div>
            <div className="text-sm text-[#e8fbff]/70">Da Assegnare</div>
          </CardContent>
        </Card>
        <Card className="bg-[#06b6d4]/10 border-[#06b6d4]/30">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-[#06b6d4]">{stats?.inProgress || 0}</div>
            <div className="text-sm text-[#e8fbff]/70">In Corso</div>
          </CardContent>
        </Card>
        <Card className="bg-[#10b981]/10 border-[#10b981]/30">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-[#10b981]">{stats?.resolved || 0}</div>
            <div className="text-sm text-[#e8fbff]/70">Risolte</div>
          </CardContent>
        </Card>
        <Card className="bg-[#0b1220] border-[#14b8a6]/20">
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-[#e8fbff]">{stats?.total || 0}</div>
            <div className="text-sm text-[#e8fbff]/70">Totali</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Segnalazioni */}
      <Card className="bg-[#1a2332] border-[#06b6d4]/30">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Navigation className="h-5 w-5 text-[#06b6d4]" />
            Segnalazioni Civiche da Gestire
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8 text-[#e8fbff]/50">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessuna segnalazione presente</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  className="p-4 bg-[#0b1220] rounded-lg flex items-center justify-between hover:bg-[#0b1220]/80 cursor-pointer"
                  onClick={() => { setSelectedReport(report); setShowDetailModal(true); }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#e8fbff] font-semibold">{report.type}</span>
                      {report.priority === 'URGENT' && (
                        <Badge className="bg-[#ef4444]/20 text-[#ef4444]">Urgente</Badge>
                      )}
                    </div>
                    <div className="text-sm text-[#e8fbff]/70">
                      {report.description?.substring(0, 80)}{report.description?.length > 80 ? '...' : ''}
                    </div>
                    <div className="text-xs text-[#e8fbff]/50 mt-1">
                      {new Date(report.created_at).toLocaleDateString('it-IT')} • 
                      {report.lat && report.lng && (
                        <span 
                          className="text-[#06b6d4] hover:underline cursor-pointer ml-1"
                          onClick={(e) => { e.stopPropagation(); openGoogleMaps(report.lat, report.lng); }}
                        >
                          📍 Naviga
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${
                      report.status === 'pending' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                      report.status === 'in_progress' ? 'bg-[#06b6d4]/20 text-[#06b6d4]' :
                      report.status === 'resolved' ? 'bg-[#10b981]/20 text-[#10b981]' :
                      'bg-[#ef4444]/20 text-[#ef4444]'
                    }`}>
                      {report.status === 'pending' ? 'Da assegnare' : 
                       report.status === 'in_progress' ? 'In corso' : 
                       report.status === 'resolved' ? 'Risolto' : 'Rifiutato'}
                    </Badge>
                    {report.status === 'pending' && (
                      <Button 
                        size="sm" 
                        className="bg-[#06b6d4] hover:bg-[#06b6d4]/80"
                        onClick={(e) => { e.stopPropagation(); handleAssign(report.id); }}
                      >
                        Prendi in carico
                      </Button>
                    )}
                    {report.status === 'in_progress' && (
                      <Button 
                        size="sm" 
                        className="bg-[#10b981] hover:bg-[#10b981]/80"
                        onClick={(e) => { e.stopPropagation(); handleResolve(report.id); }}
                      >
                        Risolvi
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dettaglio */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#06b6d4]/30 rounded-lg w-full max-w-lg">
            <div className="p-4 border-b border-[#06b6d4]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#06b6d4]/20 p-2 rounded-lg">
                  <Navigation className="h-6 w-6 text-[#06b6d4]" />
                </div>
                <div>
                  <h3 className="text-[#e8fbff] font-bold text-lg">{selectedReport.type}</h3>
                  <p className="text-gray-400 text-sm">ID: {selectedReport.id}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowDetailModal(false); setSelectedReport(null); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-[#0b1220] rounded-lg p-4">
                <h4 className="text-[#e8fbff]/60 text-xs uppercase mb-2">Descrizione</h4>
                <p className="text-[#e8fbff]">{selectedReport.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0b1220] rounded-lg p-3">
                  <p className="text-[#e8fbff]/60 text-xs">Data Segnalazione</p>
                  <p className="text-[#e8fbff] font-medium">
                    {new Date(selectedReport.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div className="bg-[#0b1220] rounded-lg p-3">
                  <p className="text-[#e8fbff]/60 text-xs">Priorità</p>
                  <Badge className={selectedReport.priority === 'URGENT' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#06b6d4]/20 text-[#06b6d4]'}>
                    {selectedReport.priority || 'NORMAL'}
                  </Badge>
                </div>
              </div>
              {selectedReport.lat && selectedReport.lng && (
                <Button 
                  className="w-full bg-[#10b981] hover:bg-[#10b981]/80"
                  onClick={() => openGoogleMaps(selectedReport.lat, selectedReport.lng)}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Naviga verso la segnalazione
                </Button>
              )}
              <div className="flex gap-2">
                {selectedReport.status === 'pending' && (
                  <Button 
                    className="flex-1 bg-[#06b6d4] hover:bg-[#06b6d4]/80"
                    onClick={() => { handleAssign(selectedReport.id); setShowDetailModal(false); }}
                  >
                    Prendi in carico
                  </Button>
                )}
                {selectedReport.status === 'in_progress' && (
                  <Button 
                    className="flex-1 bg-[#10b981] hover:bg-[#10b981]/80"
                    onClick={() => { handleResolve(selectedReport.id); setShowDetailModal(false); }}
                  >
                    Segna come Risolto
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => { setShowDetailModal(false); setSelectedReport(null); }}
                >
                  Chiudi
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
