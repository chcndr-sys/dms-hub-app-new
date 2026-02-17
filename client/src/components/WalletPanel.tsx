import { useState, useEffect } from 'react';
import { 
  Wallet, Euro, AlertTriangle, XCircle, CheckCircle, Clock,
  Search, ArrowUpRight, ArrowDownRight, FileText, Briefcase,
  Building2, Calendar, User, CreditCard, RefreshCw, Download,
  Plus, Filter, Eye, Edit, Trash2, Send, Bell, AlertCircle,
  ExternalLink, Copy, Loader2, QrCode, ChevronDown, ChevronUp,
  Store, History as HistoryIcon, MapPin, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { addComuneIdToUrl, getImpersonationParams } from '@/hooks/useImpersonation';
import NotificationManager from '@/components/suap/NotificationManager';

// --- TIPI ---

interface WalletItem {
  id: number;
  type: 'SPUNTA' | 'CONCESSIONE';
  balance: number;
  status: 'ACTIVE' | 'BLOCKED' | 'LOW_BALANCE';
  market_name?: string;
  concession_code?: string;
  stall_number?: string;
  stall_area?: number;
  cost_per_sqm?: number;
  annual_market_days?: number;
  updated_at: string;
}

interface CompanyWallets {
  company_id: number;
  ragione_sociale: string;
  partita_iva: string;
  spunta_wallets: WalletItem[];
  concession_wallets: WalletItem[];
}

interface AnnualFeeCalculation {
  wallet_id: number;
  year: number;
  market_id: number;
  calculation: {
    cost_per_sqm: number;
    area_mq: number;
    days_per_year: number;
  };
  total_amount: number;
}

export default function WalletPanel() {
  const [subTab, setSubTab] = useState<'wallet' | 'pagopa' | 'riconciliazione' | 'storico' | 'canone' | 'sanzioni' | 'notifiche'>('wallet');  // v3.53.0: aggiunto sanzioni
  const [notificheNonLette, setNotificheNonLette] = useState(0);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  
  // Stati per Canone Unico
  const [canoneScadenze, setCanoneScadenze] = useState<any[]>([]);
  const [isLoadingCanone, setIsLoadingCanone] = useState(false);
  const [canoneFilters, setCanoneFilters] = useState({ mercato_id: 'all', tipo_operatore: 'all', impresa_search: '', stato: 'all' });
  const [showGeneraCanoneDialog, setShowGeneraCanoneDialog] = useState(false);
  const [showPagamentoStraordinarioDialog, setShowPagamentoStraordinarioDialog] = useState(false);
  const [canoneAnno, setCanoneAnno] = useState(new Date().getFullYear().toString());
  const [canoneDataPrimaRata, setCanoneDataPrimaRata] = useState(`${new Date().getFullYear()}-03-31`);
  const [canoneNumeroRate, setCanoneNumeroRate] = useState('1');
  const [straordinarioDescrizione, setStraordinarioDescrizione] = useState('');
  const [straordinarioImporto, setStraordinarioImporto] = useState('');
  const [straordinarioMercatoId, setStraordinarioMercatoId] = useState('all');
  const [straordinarioDataScadenza, setStraordinarioDataScadenza] = useState('');
  const [straordinarioImpresaId, setStraordinarioImpresaId] = useState('');
  const [straordinarioImpresaSearch, setStraordinarioImpresaSearch] = useState('');
  const [straordinarioPosteggio, setStraordinarioPosteggio] = useState('');
  const [straordinarioImpreseSuggestions, setStraordinarioImpreseSuggestions] = useState<any[]>([]);
  const [straordinarioPosteggiList, setStraordinarioPosteggiList] = useState<{posteggi_impresa: any[], altri_posteggi: any[]}>({posteggi_impresa: [], altri_posteggi: []});
  const [isLoadingPosteggi, setIsLoadingPosteggi] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [companies, setCompanies] = useState<CompanyWallets[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Stati per Dialog Ricarica/Pagamento
  const [selectedWallet, setSelectedWallet] = useState<WalletItem | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>(''); // Nome impresa
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stati per Calcolo Canone
  const [annualFeeData, setAnnualFeeData] = useState<AnnualFeeCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [walletScadenze, setWalletScadenze] = useState<any[]>([]); // Rate da pagare per il wallet selezionato

  // Stati per Dialog Elimina Wallet
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<WalletItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stati per Lista Imprese/Concessioni (v3.36.0)
  const [mercatiList, setMercatiList] = useState<{id: number, name: string}[]>([]);
  const [selectedMercatoId, setSelectedMercatoId] = useState<string>('');
  const [impreseConcessioni, setImpreseConcessioni] = useState<any[]>([]);
  const [isLoadingImprese, setIsLoadingImprese] = useState(false);
  const [impreseSearch, setImpreseSearch] = useState('');
  const [impreseTipoOperatore, setImpreseTipoOperatore] = useState<string>('all'); // v3.58.0: filtro tipo operatore

  // Stati per Ricariche Spunta (v3.55.0)
  const [ricaricheSpunta, setRicaricheSpunta] = useState<any[]>([]);
  const [isLoadingRicariche, setIsLoadingRicariche] = useState(false);

  // v3.53.0: Stati per Sanzioni/Verbali PM
  const [sanzioniList, setSanzioniList] = useState<any[]>([]);
  const [isLoadingSanzioni, setIsLoadingSanzioni] = useState(false);
  const [sanzioniFilters, setSanzioniFilters] = useState({ stato: 'all', impresa_search: '' });
  const [sanzioniTotali, setSanzioniTotali] = useState({ non_pagato: 0, pagato: 0, totale: 0 });
  const [showRegistraPagamentoDialog, setShowRegistraPagamentoDialog] = useState(false);
  const [selectedSanzione, setSelectedSanzione] = useState<any>(null);
  const [isRegistrandoPagamento, setIsRegistrandoPagamento] = useState(false);

  // Stati per Impostazioni Mora (v3.46.0)
  const [showImpostazioniMoraDialog, setShowImpostazioniMoraDialog] = useState(false);
  const [impostazioniMora, setImpostazioniMora] = useState<{
    mora_abilitata: boolean;
    tasso_interesse_giornaliero: number;
    tasso_mora_fisso: number;
    giorni_grazia: number;
  }>({
    mora_abilitata: false,
    tasso_interesse_giornaliero: 0.000137,
    tasso_mora_fisso: 0.05,
    giorni_grazia: 0
  });
  const [isSavingMora, setIsSavingMora] = useState(false);

  // --- FETCH DATA ---
  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/wallets`));
      const data = await response.json();

      if (data.success) {
        // Raggruppa per Company
        const grouped = data.data.reduce((acc: Record<number, CompanyWallets>, row: any) => {
          if (!acc[row.company_id]) {
            acc[row.company_id] = {
              company_id: row.company_id,
              ragione_sociale: row.ragione_sociale || 'Impresa Sconosciuta',
              partita_iva: row.partita_iva || 'N/A',
              spunta_wallets: [],
              concession_wallets: []
            };
          }

          let typeNormalized = row.type ? row.type.toUpperCase().trim() : 'SPUNTA';
          
          // Se mancano i dati del posteggio, forziamo il tipo a SPUNTA
          if (!row.stall_number && !row.market_name) {
            typeNormalized = 'SPUNTA';
          }

          const wallet: WalletItem = {
            id: row.id,
            type: typeNormalized as 'SPUNTA' | 'CONCESSIONE',
            balance: parseFloat(row.balance),
            status: row.status,
            market_name: row.market_name,
            concession_code: row.concession_code,
            stall_number: row.stall_number,
            stall_area: parseFloat(row.stall_area),
            cost_per_sqm: parseFloat(row.cost_per_sqm),
            annual_market_days: parseInt(row.annual_market_days),
            updated_at: row.updated_at
          };

          if (typeNormalized === 'SPUNTA') {
            acc[row.company_id].spunta_wallets.push(wallet);
          } else {
            acc[row.company_id].concession_wallets.push(wallet);
          }

          return acc;
        }, {});

        setCompanies(Object.values(grouped));
      } else {
        setError(data.message || "Errore caricamento dati");
      }
    } catch (err) {
      console.error(err);
      setError("Errore di connessione al server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  // --- CANONE UNICO ---
  // Funzione per caricare impostazioni mora (v3.46.0)
  const fetchImpostazioniMora = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/impostazioni-mora`);
      const data = await response.json();
      if (data.success) {
        setImpostazioniMora({
          mora_abilitata: data.impostazioni.mora_abilitata,
          tasso_interesse_giornaliero: parseFloat(data.impostazioni.tasso_interesse_giornaliero),
          tasso_mora_fisso: parseFloat(data.impostazioni.tasso_mora_fisso),
          giorni_grazia: data.impostazioni.giorni_grazia
        });
      }
    } catch (err) {
      console.error('Errore caricamento impostazioni mora:', err);
    }
  };

  // Funzione per salvare impostazioni mora (v3.46.0)
  const handleSaveImpostazioniMora = async () => {
    setIsSavingMora(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/impostazioni-mora`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(impostazioniMora)
      });
      const data = await response.json();
      if (data.success) {
        alert('Impostazioni mora salvate');
        setShowImpostazioniMoraDialog(false);
        // Se mora abilitata, aggiorna le scadenze in mora
        if (impostazioniMora.mora_abilitata) {
          await fetch(`${API_URL}/api/canone-unico/aggiorna-mora`, { method: 'POST' });
          fetchCanoneScadenze();
        }
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error('Errore salvataggio impostazioni mora:', err);
      alert('Errore di connessione');
    } finally {
      setIsSavingMora(false);
    }
  };

  const fetchCanoneScadenze = async () => {
    setIsLoadingCanone(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const params = new URLSearchParams();
      if (canoneFilters.mercato_id && canoneFilters.mercato_id !== 'all') params.append('mercato_id', canoneFilters.mercato_id);
      if (canoneFilters.tipo_operatore && canoneFilters.tipo_operatore !== 'all') params.append('tipo_operatore', canoneFilters.tipo_operatore);
      if (canoneFilters.impresa_search) params.append('impresa_search', canoneFilters.impresa_search);
      if (canoneFilters.stato && canoneFilters.stato !== 'all') params.append('stato', canoneFilters.stato);
      
      // Usa addComuneIdToUrl per filtrare per comune
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/canone-unico/riepilogo?${params.toString()}`));
      const data = await response.json();
      if (data.success) {
        setCanoneScadenze(data.data);
      }
    } catch (err) {
      console.error('Errore caricamento scadenze canone:', err);
    } finally {
      setIsLoadingCanone(false);
    }
  };

  // Funzione per caricare le ricariche Spunta (v3.55.0)
  const fetchRicaricheSpunta = async () => {
    setIsLoadingRicariche(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const params = new URLSearchParams();
      if (canoneFilters.mercato_id && canoneFilters.mercato_id !== 'all') params.append('mercato_id', canoneFilters.mercato_id);
      if (canoneFilters.impresa_search) params.append('impresa_search', canoneFilters.impresa_search);
      
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/canone-unico/ricariche-spunta?${params.toString()}`));
      const data = await response.json();
      if (data.success) {
        setRicaricheSpunta(data.data);
      }
    } catch (err) {
      console.error('Errore caricamento ricariche spunta:', err);
    } finally {
      setIsLoadingRicariche(false);
    }
  };

  const handleGeneraCanoneAnnuo = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/genera-canone-annuo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anno: parseInt(canoneAnno),
          numero_rate: parseInt(canoneNumeroRate),
          data_prima_rata: canoneDataPrimaRata,
          mercato_id: canoneFilters.mercato_id !== 'all' ? parseInt(canoneFilters.mercato_id) : null
        })
      });
      const data = await response.json();
      if (data.success) {
        const mercatoNome = canoneFilters.mercato_id !== 'all' 
          ? mercatiList.find((m: any) => m.id.toString() === canoneFilters.mercato_id)?.name || 'mercato selezionato'
          : 'TUTTI i mercati';
        alert(`Generate ${data.scadenze_create} scadenze (${data.numero_rate} rate) per l'anno ${canoneAnno}\nMercato: ${mercatoNome}`);
        setShowGeneraCanoneDialog(false);
        fetchCanoneScadenze();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error('Errore generazione canone:', err);
      alert('Errore di connessione');
    }
  };

  // Handler per eliminare una scadenza
  const handleDeleteScadenza = async (scadenzaId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa scadenza?')) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/scadenza/${scadenzaId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        alert('Scadenza eliminata');
        fetchCanoneScadenze();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error('Errore eliminazione scadenza:', err);
      alert('Errore di connessione');
    }
  };

  // Handler per visualizzare dettaglio scadenza
  const handleViewScadenza = async (scadenzaId: number) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/scadenza/${scadenzaId}`);
      const data = await response.json();
      if (data.success) {
        const s = data.scadenza;
        alert(`Dettaglio Scadenza #${s.id}\n\nImpresa: ${s.ragione_sociale}\nMercato: ${s.mercato_nome}\nPosteggio: ${s.posteggio}\nAnno: ${s.anno_riferimento}\nRata: ${s.rata_numero}/${s.rata_totale}\nImporto: €${Number(s.importo_dovuto).toFixed(2)}\nStato: ${s.stato}\nScadenza: ${new Date(s.data_scadenza).toLocaleDateString('it-IT')}`);
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error('Errore dettaglio scadenza:', err);
      alert('Errore di connessione');
    }
  };

  // Handler per eliminare tutte le scadenze di un anno
  const handleDeleteScadenzeAnno = async () => {
    const anno = prompt('Inserisci l\'anno delle scadenze da eliminare (es. 2026):');
    if (!anno) return;
    if (!confirm(`Sei sicuro di voler eliminare TUTTE le scadenze dell'anno ${anno}?`)) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/scadenze/${anno}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        alert(`Eliminate ${data.scadenze_eliminate} scadenze per l'anno ${anno}`);
        fetchCanoneScadenze();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error('Errore eliminazione scadenze:', err);
      alert('Errore di connessione');
    }
  };

  const handleGeneraPagamentoStraordinario = async () => {
    if (!straordinarioDescrizione || !straordinarioImporto || !straordinarioDataScadenza) {
      alert('Compila tutti i campi obbligatori: Descrizione, Importo, Data Scadenza');
      return;
    }
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/genera-pagamento-straordinario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mercato_id: straordinarioMercatoId !== 'all' ? parseInt(straordinarioMercatoId) : null,
          impresa_id: straordinarioImpresaId ? parseInt(straordinarioImpresaId) : null,
          posteggio: straordinarioPosteggio || null,
          descrizione: straordinarioDescrizione,
          importo: parseFloat(straordinarioImporto),
          data_scadenza: straordinarioDataScadenza,
          tutti: straordinarioMercatoId === 'all' && !straordinarioImpresaId && !straordinarioPosteggio
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Generati ${data.scadenze_create} avvisi di pagamento straordinario per ${data.imprese_coinvolte} imprese`);
        setShowPagamentoStraordinarioDialog(false);
        setStraordinarioDescrizione('');
        setStraordinarioImporto('');
        setStraordinarioDataScadenza('');
        setStraordinarioImpresaId('');
        setStraordinarioImpresaSearch('');
        setStraordinarioPosteggio('');
        fetchCanoneScadenze();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error('Errore generazione pagamento straordinario:', err);
      alert('Errore di connessione');
    }
  };
  
  // Carica posteggi del mercato per dropdown straordinario (v3.52.0)
  const loadPosteggiMercato = async (mercatoId: string, impresaId?: string) => {
    if (!mercatoId || mercatoId === 'all') {
      setStraordinarioPosteggiList({posteggi_impresa: [], altri_posteggi: []});
      return;
    }
    
    setIsLoadingPosteggi(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const params = new URLSearchParams();
      if (impresaId) params.append('impresa_id', impresaId);
      
      // v3.90.0: Filtro per comune_id durante impersonificazione
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/canone-unico/posteggi-mercato/${mercatoId}?${params.toString()}`));
      const data = await response.json();
      if (data.success) {
        setStraordinarioPosteggiList({
          posteggi_impresa: data.posteggi_impresa || [],
          altri_posteggi: data.altri_posteggi || []
        });
      }
    } catch (err) {
      console.error('Errore caricamento posteggi:', err);
      setStraordinarioPosteggiList({posteggi_impresa: [], altri_posteggi: []});
    } finally {
      setIsLoadingPosteggi(false);
    }
  };

  // Ricerca imprese per pagamento straordinario
  const handleSearchImpresaStraordinario = async (search: string) => {
    setStraordinarioImpresaSearch(search);
    setStraordinarioImpresaId('');
    
    if (search.length < 2) {
      setStraordinarioImpreseSuggestions([]);
      return;
    }
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      // v3.90.0: Filtro per comune_id durante impersonificazione
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/imprese?search=${encodeURIComponent(search)}&limit=5`));
      const data = await response.json();
      if (data.success) {
        setStraordinarioImpreseSuggestions(data.data || []);
      }
    } catch (err) {
      console.error('Errore ricerca imprese:', err);
    }
  };

  useEffect(() => {
    if (subTab === 'canone') {
      fetchCanoneScadenze();
      fetchMercatiList();
      fetchImpostazioniMora();
      // Carica ricariche Spunta se filtro è Spuntisti o Tutti
      if (canoneFilters.tipo_operatore === 'SPUNTA' || canoneFilters.tipo_operatore === 'all') {
        fetchRicaricheSpunta();
      } else {
        setRicaricheSpunta([]);
      }
    }
  }, [subTab, canoneFilters]);

  // --- LISTA IMPRESE/CONCESSIONI (v3.36.0) ---
  const fetchMercatiList = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      // Usa addComuneIdToUrl per filtrare i mercati per comune (v3.60.0)
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/markets`));
      const data = await response.json();
      if (data.success && data.data) {
        const mercati = data.data.map((m: any) => ({ id: m.id, name: m.name }));
        setMercatiList(mercati);
        
        // v3.60.0 fix: Pre-seleziona il primo mercato SOLO per la sezione imprese/concessioni
        // NON modificare canoneFilters per evitare re-fetch che azzera le scadenze visibili
        if (mercati.length > 0 && !selectedMercatoId) {
          const primoMercato = mercati[0].id.toString();
          setSelectedMercatoId(primoMercato);
          // Pre-seleziona il filtro canone SOLO se c'è un solo mercato (impersonificazione comune)
          // Se admin vede tutti i mercati, lascia il filtro su 'all' per mostrare tutte le scadenze
          if (mercati.length === 1) {
            setCanoneFilters(prev => ({ ...prev, mercato_id: primoMercato }));
          }
        }
      }
    } catch (err) {
      console.error('Errore caricamento mercati:', err);
    }
  };

  const fetchImpreseConcessioni = async (marketId: string, tipoOperatore?: string) => {
    if (!marketId) return;
    setIsLoadingImprese(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const params = new URLSearchParams({ market_id: marketId });
      if (impreseSearch) params.append('search', impreseSearch);
      if (tipoOperatore && tipoOperatore !== 'all') params.append('tipo_operatore', tipoOperatore);
      
      // v3.90.0: Filtro per comune_id durante impersonificazione
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/canone-unico/imprese-concessioni?${params.toString()}`));
      const data = await response.json();
      if (data.success) {
        setImpreseConcessioni(data.data || []);
      }
    } catch (err) {
      console.error('Errore caricamento imprese/concessioni:', err);
    } finally {
      setIsLoadingImprese(false);
    }
  };

  // Sincronizza selectedMercatoId con il filtro mercato principale (v3.57.0)
  useEffect(() => {
    if (canoneFilters.mercato_id && canoneFilters.mercato_id !== 'all') {
      setSelectedMercatoId(canoneFilters.mercato_id);
    }
  }, [canoneFilters.mercato_id]);

  useEffect(() => {
    if (selectedMercatoId) {
      fetchImpreseConcessioni(selectedMercatoId, impreseTipoOperatore);
    }
  }, [selectedMercatoId, impreseSearch, impreseTipoOperatore]);

  // Carica posteggi automaticamente quando cambiano mercato o impresa (v3.52.0)
  useEffect(() => {
    if (straordinarioMercatoId && straordinarioMercatoId !== 'all') {
      loadPosteggiMercato(straordinarioMercatoId, straordinarioImpresaId || undefined);
    } else {
      setStraordinarioPosteggiList({posteggi_impresa: [], altri_posteggi: []});
    }
  }, [straordinarioMercatoId, straordinarioImpresaId]);

  // --- TRANSACTIONS ---
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  const fetchAllTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      // Fetch transactions for all wallets of all companies
      // Since we don't have a global transactions endpoint, we'll fetch for each wallet
      // In a real app, we should have a dedicated endpoint. For now, we iterate.
      
      let allTx: any[] = [];
      
      // Collect all wallet IDs
      const walletIds: number[] = [];
      companies.forEach(c => {
        c.spunta_wallets.forEach(w => walletIds.push(w.id));
        c.concession_wallets.forEach(w => walletIds.push(w.id));
      });

      // Fetch in parallel
      const promises = walletIds.map(id => 
        fetch(`${API_URL}/api/wallets/${id}/transactions`).then(r => r.json())
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(res => {
        if (res.success && Array.isArray(res.data)) {
          allTx = [...allTx, ...res.data];
        }
      });

      // Filter out invalid transactions and sort safely
      const validTx = allTx.filter(tx => tx && typeof tx === 'object');
      
      validTx.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      
      setTransactions(validTx);
    } catch (err) {
      console.error("Error fetching transactions", err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    if (subTab === 'pagopa') {
      fetchAllTransactions();
    }
  }, [subTab, companies]);

  // Fetch storico wallet
  const fetchWalletHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      // Usa addComuneIdToUrl per filtrare per comune
      const response = await fetch(addComuneIdToUrl(`${API_URL}/api/wallet-history`));
      const data = await response.json();
      if (data.success) {
        setWalletHistory(data.data || []);
      }
    } catch (err) {
      console.error('Errore caricamento storico wallet:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (subTab === 'storico') {
      fetchWalletHistory();
    }
  }, [subTab]);

  // v3.53.0: Carica sanzioni quando si seleziona il subtab
  const fetchSanzioni = async () => {
    setIsLoadingSanzioni(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const params = new URLSearchParams();
      if (sanzioniFilters.stato !== 'all') params.append('stato', sanzioniFilters.stato);
      if (sanzioniFilters.impresa_search) params.append('impresa_search', sanzioniFilters.impresa_search);
      params.append('limit', '100');
      
      const url = addComuneIdToUrl(`${API_URL}/api/sanctions/riepilogo-pagamenti?${params.toString()}`);
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSanzioniList(data.data || []);
        setSanzioniTotali(data.totali || { non_pagato: 0, pagato: 0, totale: 0 });
      }
    } catch (error) {
      console.error('Errore caricamento sanzioni:', error);
    } finally {
      setIsLoadingSanzioni(false);
    }
  };

  useEffect(() => {
    if (subTab === 'sanzioni') {
      fetchSanzioni();
    }
  }, [subTab, sanzioniFilters]);
  
  // v3.54.1: Carica sanzioni anche nel tab PagoPA per mostrare lo storico pagamenti
  useEffect(() => {
    if (subTab === 'pagopa' && sanzioniList.length === 0) {
      fetchSanzioni();
    }
  }, [subTab]);

  // v3.53.0: Registra pagamento manuale sanzione
  const handleRegistraPagamentoSanzione = async () => {
    if (!selectedSanzione) return;
    setIsRegistrandoPagamento(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const iuv = `MAN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      const response = await fetch(`${API_URL}/api/sanctions/${selectedSanzione.id}/paga-pagopa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importo_pagato: parseFloat(selectedSanzione.amount),
          pagopa_iuv: iuv,
          metodo_pagamento: 'MANUALE',
          note: 'Pagamento registrato manualmente da operatore'
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Pagamento registrato! Riferimento: ${iuv}`);
        setShowRegistraPagamentoDialog(false);
        setSelectedSanzione(null);
        fetchSanzioni();
      } else {
        alert('Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      console.error('Errore registrazione pagamento:', err);
      alert('Errore di connessione');
    } finally {
      setIsRegistrandoPagamento(false);
    }
  };

  // Carica conteggio notifiche non lette per Tributi
  const loadNotificheCount = async () => {
    try {
      const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';
      // v4.6.0: Usa comune_id dinamico dall'impersonificazione (fix bug cross-comune)
      const { comuneId } = getImpersonationParams();
      const tributiId = comuneId || '1'; // fallback a 1 se non in impersonificazione
      const url = addComuneIdToUrl(`${MIHUB_API}/notifiche/messaggi/TRIBUTI/${tributiId}`);
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotificheNonLette(data.non_letti || 0);
      }
    } catch (error) {
      console.error('Errore caricamento notifiche:', error);
    }
  };

  useEffect(() => {
    loadNotificheCount();
  }, []);

  // --- ACTIONS ---

  const handleOpenDeposit = async (wallet: WalletItem, companyName: string) => {
    setSelectedWallet(wallet);
    setSelectedCompany(companyName);
    setDepositAmount('');
    setAnnualFeeData(null);
    setWalletScadenze([]);
    setShowDepositDialog(true);

    // Carica le scadenze/rate da pagare per TUTTI i tipi di wallet
    setIsCalculating(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const anno = new Date().getFullYear();
      
      // Prima prova a caricare le scadenze esistenti
      const scadenzeRes = await fetch(`${API_URL}/api/canone-unico/semaforo-rate/${wallet.id}/${anno}`);
      const scadenzeData = await scadenzeRes.json();
      
      if (scadenzeData.success && scadenzeData.semaforo && scadenzeData.semaforo.length > 0) {
        // Ci sono scadenze generate - mostra TUTTE le rate (pagate e non pagate)
        setWalletScadenze(scadenzeData.semaforo);
        
        // Trova la prima rata da pagare (NON_PAGATO o IN_MORA)
        const rateNonPagate = scadenzeData.semaforo.filter((r: any) => r.stato !== 'PAGATO');
        if (rateNonPagate.length > 0) {
          // Imposta l'importo della prima rata (usa importo_totale che include mora)
          const primaRata = rateNonPagate[0];
          const importoConMora = primaRata.importo_totale || primaRata.importo;
          setDepositAmount(importoConMora.toFixed(2));
          // Crea un oggetto compatibile con annualFeeData per mostrare i dettagli
          setAnnualFeeData({
            wallet_id: wallet.id,
            year: anno,
            market_id: wallet.market_id || 0,
            calculation: {
              cost_per_sqm: 0,
              area_mq: 0,
              days_per_year: 0
            },
            total_amount: scadenzeData.totale_dovuto || 0
          });
        }
      } else if (wallet.type !== 'SPUNTA') {
        // Nessuna scadenza e NON è SPUNTA - calcola il canone annuo (fallback)
        const res = await fetch(`${API_URL}/api/wallets/calculate-annual-fee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_id: wallet.id })
        });
        const data = await res.json();
        if (data.success) {
          setAnnualFeeData(data.data);
          setDepositAmount(data.data.total_amount.toFixed(2));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExecuteDeposit = async (mode: 'AVVISO' | 'PAGA_ORA') => {
    if (!selectedWallet || !depositAmount) return;
    setIsProcessing(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      
      // Determina la descrizione e la scadenza da pagare
      let description = '';
      let scadenza_id: number | null = null;
      
      if (selectedWallet.type !== 'SPUNTA') {
        if (walletScadenze.length > 0) {
          // Trova la prima rata non pagata (quella evidenziata)
          const primaRataDaPagare = walletScadenze.find(s => s.stato !== 'PAGATO');
          if (primaRataDaPagare) {
            scadenza_id = primaRataDaPagare.id;
            description = `Pagamento Canone Rata ${primaRataDaPagare.rata} - ${selectedWallet.market_name} - Posteggio ${selectedWallet.stall_number}`;
          } else {
            description = `Pagamento Canone Annuo - ${selectedWallet.market_name} - Posteggio ${selectedWallet.stall_number}`;
          }
        } else {
          description = `Pagamento Canone Annuo - ${selectedWallet.market_name} - Posteggio ${selectedWallet.stall_number}`;
        }
      } else {
        // Wallet SPUNTA - verifica se ci sono scadenze straordinarie da pagare
        if (walletScadenze.length > 0) {
          const primaScadenzaDaPagare = walletScadenze.find(s => s.stato !== 'PAGATO');
          if (primaScadenzaDaPagare) {
            scadenza_id = primaScadenzaDaPagare.id;
            description = primaScadenzaDaPagare.causale || `Pagamento Straordinario`;
          } else {
            description = `Ricarica Credito Spunta`;
          }
        } else {
          description = `Ricarica Credito Spunta`;
        }
      }
      
      const res = await fetch(`${API_URL}/api/wallets/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: selectedWallet.id,
          amount: parseFloat(depositAmount),
          description,
          scadenza_id
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(mode === 'AVVISO' ? "Avviso PagoPA generato con successo!" : "Pagamento effettuato con successo!");
        setShowDepositDialog(false);
        fetchWallets(); // Ricarica dati wallet
        // Ricarica sempre le scadenze dopo pagamento (per aggiornare semaforo)
        fetchCanoneScadenze();
      } else {
        alert("Errore: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Errore di connessione");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ELIMINA WALLET ---
  const handleOpenDeleteDialog = (wallet: WalletItem) => {
    setWalletToDelete(wallet);
    setShowDeleteDialog(true);
  };

  const handleDeleteWallet = async () => {
    if (!walletToDelete) return;
    setIsDeleting(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const res = await fetch(`${API_URL}/api/wallets/${walletToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        alert(`Wallet #${walletToDelete.id} eliminato con successo!`);
        setShowDeleteDialog(false);
        setWalletToDelete(null);
        fetchWallets(); // Ricarica dati
      } else {
        alert("Errore: " + (data.error || data.message || 'Eliminazione fallita'));
      }
    } catch (err) {
      console.error(err);
      alert("Errore di connessione");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- AZZERA WALLET ---
  const handleAzzeraWallet = async (walletId: number) => {
    if (!confirm(`Vuoi azzerare il saldo del wallet #${walletId}?`)) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const res = await fetch(`${API_URL}/api/canone-unico/wallet/${walletId}/azzera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        alert(`Wallet #${walletId} azzerato! Saldo precedente: €${data.saldo_precedente}`);
        fetchWallets();
        fetchCanoneScadenze();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Errore di connessione');
    }
  };

  const handleAzzeraTuttiWallet = async () => {
    if (!confirm('ATTENZIONE: Vuoi azzerare il saldo di TUTTI i wallet? Questa operazione è per test.')) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const res = await fetch(`${API_URL}/api/canone-unico/wallets/azzera-tutti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        alert(`${data.wallets_azzerati} wallet azzerati! Totale: €${data.totale_azzerato}`);
        fetchWallets();
        fetchCanoneScadenze();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Errore di connessione');
    }
  };

  // --- FILTRI ---
  const filteredCompanies = companies.filter(c => 
    c.ragione_sociale.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.partita_iva.includes(searchQuery)
  );

  return (
    <div className="space-y-6 p-6 bg-[#0f172a] min-h-screen text-slate-100 border border-green-500/30 rounded-lg">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[#3b82f6]" />
            Wallet Operatori & PagoPA
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestione borsellini digitali: Spunta (ricaricabile) e Concessioni (canone annuo)
          </p>
        </div>
        <div className="flex gap-1">
          <Button 
            size="sm"
            variant={subTab === 'wallet' ? 'default' : 'outline'}
            onClick={() => setSubTab('wallet')}
            className={`flex-shrink-0 ${subTab === 'wallet' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}`}
          >
            <Wallet className="mr-1 h-4 w-4" /> Wallet
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'pagopa' ? 'default' : 'outline'}
            onClick={() => setSubTab('pagopa')}
            className={`flex-shrink-0 ${subTab === 'pagopa' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}`}
          >
            <CreditCard className="mr-1 h-4 w-4" /> PagoPA
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'riconciliazione' ? 'default' : 'outline'}
            onClick={() => setSubTab('riconciliazione')}
            className={`flex-shrink-0 ${subTab === 'riconciliazione' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}`}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Riconc.
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'storico' ? 'default' : 'outline'}
            onClick={() => setSubTab('storico')}
            className={`flex-shrink-0 ${subTab === 'storico' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}`}
          >
            <HistoryIcon className="mr-1 h-4 w-4" /> Storico
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'canone' ? 'default' : 'outline'}
            onClick={() => setSubTab('canone')}
            className={`flex-shrink-0 ${subTab === 'canone' ? 'bg-[#f59e0b]' : 'border-slate-700 text-slate-300'}`}
          >
            <Euro className="mr-1 h-4 w-4" /> Canone
          </Button>
          {/* v3.53.0: Pulsante Sanzioni */}
          <Button 
            size="sm"
            variant={subTab === 'sanzioni' ? 'default' : 'outline'}
            onClick={() => setSubTab('sanzioni')}
            className={`flex-shrink-0 ${subTab === 'sanzioni' ? 'bg-[#ef4444]' : 'border-slate-700 text-slate-300'}`}
          >
            <AlertTriangle className="mr-1 h-4 w-4" /> Sanzioni
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'notifiche' ? 'default' : 'outline'}
            onClick={() => setSubTab('notifiche')}
            className={`flex-shrink-0 whitespace-nowrap ${subTab === 'notifiche' ? 'bg-[#8b5cf6]' : 'border-slate-700 text-slate-300'}`}
          >
            <Bell className="mr-1 h-4 w-4" /> Notifiche
            {notificheNonLette > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5">
                {notificheNonLette}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {subTab === 'wallet' && (
        <div className="space-y-6">
          {/* Search + Pulsanti Test */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Cerca impresa per Ragione Sociale o P.IVA..." 
                className="pl-10 bg-[#1e293b] border-slate-700 text-white w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600/10"
              onClick={handleAzzeraTuttiWallet}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Svuota Tutti Wallet (Test)
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Caricamento wallet...</div>
          ) : (
            <div className="grid gap-6">
              {filteredCompanies.map(company => (
                <Card key={company.company_id} className="bg-[#1e293b] border-slate-700 overflow-hidden">
                  <CardHeader className="bg-[#0f172a]/50 border-b border-slate-700 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                          <Briefcase className="h-5 w-5 text-[#3b82f6]" />
                          {company.ragione_sociale}
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-1">P.IVA: {company.partita_iva}</p>
                      </div>
                      
                      {/* Wallet Summary Badge */}
                      <div className="text-right flex flex-col items-end gap-1">
                        <Badge variant="outline" className="border-white text-white bg-white/10">
                          WALLET: {
                            // Escludiamo i wallet generici (senza market_name) dal conteggio
                            company.spunta_wallets.filter(w => w.market_name).length + 
                            company.concession_wallets.length
                          }
                        </Badge>
                        <div className="text-sm font-bold text-white">
                          TOTALE: € {
                            (company.spunta_wallets
                              .filter(w => w.market_name) // Escludiamo saldo wallet generici
                              .reduce((acc, w) => acc + w.balance, 0) + 
                             company.concession_wallets.reduce((acc, w) => acc + w.balance, 0)).toFixed(2)
                          }
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4 space-y-4">
                    {/* Sezione Wallet Spunta */}
                    <Collapsible defaultOpen={false}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full flex justify-between items-center text-slate-300 hover:text-white hover:bg-slate-800 mb-2">
                          <span className="flex items-center gap-2 text-yellow-500">
                            <Wallet className="h-4 w-4" />
                            Portafogli Spunta ({company.spunta_wallets.filter(w => w.market_name).length})
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3">
                        {company.spunta_wallets.length > 0 ? (
                          company.spunta_wallets.map(wallet => (
                            <div key={wallet.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-[#0f172a] rounded-lg border border-slate-700 gap-4">
                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                  {wallet.market_name ? (
                                    <>
                                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                        {wallet.market_name}
                                      </Badge>
                                      <span className="text-slate-300 font-medium">Credito Spunta</span>
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                                      GENERICO
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-slate-400">
                                  ID Wallet: #{wallet.id}
                                </div>
                              </div>

                              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                  <p className="text-xs text-slate-400 uppercase font-bold">Saldo Wallet</p>
                                  <p className={`text-xl font-bold ${wallet.balance <= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    € {wallet.balance.toFixed(2)}
                                  </p>
                                  <p className={`text-xs ${wallet.balance <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {wallet.balance <= 0 ? 'Da Ricaricare' : 'In Regola'}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline"
                                    className="border-slate-600 hover:bg-slate-800 text-white gap-2"
                                    onClick={() => handleOpenDeposit(wallet, company.ragione_sociale)}
                                  >
                                    <Plus className="h-4 w-4" /> Ricarica
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    className="border-red-600 hover:bg-red-900/50 text-red-400 gap-2"
                                    onClick={() => handleOpenDeleteDialog(wallet)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-slate-500 bg-[#0f172a] rounded-lg border border-slate-800 border-dashed">
                            Nessun wallet spunta attivo per questa impresa
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Sezione Concessioni */}
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full flex justify-between items-center text-slate-300 hover:text-white hover:bg-slate-800">
                          <span className="flex items-center gap-2 text-blue-400">
                            <Store className="h-4 w-4" />
                            Concessioni Attive ({company.concession_wallets.length})
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4 space-y-3">
                        {company.concession_wallets.length > 0 ? (
                          company.concession_wallets.map(wallet => (
                            <div key={wallet.id} className="flex flex-col md:flex-row justify-between items-center p-4 bg-[#0f172a] rounded-lg border border-slate-700 gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                    {wallet.market_name}
                                  </Badge>
                                  <span className="text-slate-300 font-medium">Posteggio {wallet.stall_number}</span>
                                </div>
                                <div className="text-sm text-slate-500 flex gap-4">
                                  <span>Area: {isNaN(wallet.stall_area || NaN) ? '-' : wallet.stall_area} mq</span>
                                  <span>Tariffa: {isNaN(wallet.cost_per_sqm || NaN) ? '-' : `€ ${wallet.cost_per_sqm}/mq`}</span>
                                  <span>Giorni: {isNaN(wallet.annual_market_days || NaN) ? '-' : `${wallet.annual_market_days}/anno`}</span>
                                </div>
                              </div>
                              
                              <div className="text-right min-w-[120px]">
                                <p className="text-xs text-slate-400">Saldo Wallet</p>
                                <p className={`text-lg font-bold ${wallet.balance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  € {wallet.balance.toFixed(2)}
                                </p>
                                <p className={`text-xs ${wallet.balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {wallet.balance > 0 ? 'In Regola' : 'Da Pagare'}
                                </p>
                              </div>

                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  className="border-slate-600 hover:bg-slate-700 text-slate-200"
                                  onClick={() => handleOpenDeposit(wallet, company.ragione_sociale)}
                                >
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Paga Canone
                                </Button>
                                <Button 
                                  variant="outline"
                                  className="border-amber-600 hover:bg-amber-900/50 text-amber-400"
                                  onClick={() => handleAzzeraWallet(wallet.id)}
                                  title="Svuota Wallet"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline"
                                  className="border-red-600 hover:bg-red-900/50 text-red-400"
                                  onClick={() => handleOpenDeleteDialog(wallet)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-slate-500 py-4">Nessuna concessione attiva per questa impresa.</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'pagopa' && (
        <div className="space-y-6">
          <Card className="bg-[#1e293b] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-blue-500" />
                Storico Transazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTx ? (
                <div className="text-center py-8 text-slate-400">Caricamento transazioni...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nessuna transazione trovata.</p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-700 overflow-hidden">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="bg-slate-800 text-slate-100 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Descrizione</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3 text-right">Importo</th>
                        <th className="px-4 py-3 text-center">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {transactions.map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            {(() => {
                              try {
                                if (!tx.created_at) return '-';
                                const d = new Date(tx.created_at);
                                if (isNaN(d.getTime())) return 'Data non valida';
                                return d.toLocaleDateString('it-IT', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                });
                              } catch (e) {
                                return 'Errore Data';
                              }
                            })()}
                          </td>
                          <td className="px-4 py-3 font-medium text-white">
                            {tx.description || 'Movimento Wallet'}
                            {tx.reference_id && <span className="block text-xs text-slate-500">Rif: {tx.reference_id}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={
                              tx.type === 'DEPOSIT' 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }>
                              {tx.type === 'DEPOSIT' ? 'Ricarica / Pagamento' : 'Addebito'}
                            </Badge>
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${
                            tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {tx.type === 'DEPOSIT' ? '+' : '-'} € {Number(tx.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-green-600">Completato</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* v3.54.1: Sezione Sanzioni Pagate */}
          <Card className="bg-[#1e293b] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Pagamenti Sanzioni/Verbali PM
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sanzioniList.filter(s => s.payment_status === 'PAGATO').length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nessuna sanzione pagata.</p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-700 overflow-hidden">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="bg-slate-800 text-slate-100 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Data Pagamento</th>
                        <th className="px-4 py-3">Verbale</th>
                        <th className="px-4 py-3">Impresa</th>
                        <th className="px-4 py-3">Infrazione</th>
                        <th className="px-4 py-3 text-right">Importo Originale</th>
                        <th className="px-4 py-3 text-right">Importo Pagato</th>
                        <th className="px-4 py-3 text-center">Sconto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {sanzioniList.filter(s => s.payment_status === 'PAGATO').map((sanzione, idx) => {
                        const importoEffettivo = sanzione.importo_effettivo_pagato 
                          ? parseFloat(sanzione.importo_effettivo_pagato) 
                          : (sanzione.pagato_in_ridotto ? parseFloat(sanzione.importo_ridotto) : parseFloat(sanzione.amount));
                        const haSconto = sanzione.pagato_in_ridotto || (sanzione.reduced_amount && parseFloat(sanzione.reduced_amount) < parseFloat(sanzione.amount));
                        
                        return (
                          <tr key={sanzione.id || idx} className="hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                              {sanzione.paid_date ? new Date(sanzione.paid_date).toLocaleDateString('it-IT', {
                                day: '2-digit', month: '2-digit', year: 'numeric'
                              }) : '-'}
                            </td>
                            <td className="px-4 py-3 font-medium text-white">
                              {sanzione.verbale_code}
                            </td>
                            <td className="px-4 py-3">
                              {sanzione.impresa_nome || '-'}
                              {sanzione.partita_iva && <span className="block text-xs text-slate-500">P.IVA: {sanzione.partita_iva}</span>}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {sanzione.infraction_description || sanzione.infraction_code}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-400">
                              € {parseFloat(sanzione.amount).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-green-400">
                              € {importoEffettivo.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {haSconto ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">-30%</Badge>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {subTab === 'riconciliazione' && (
        <div className="text-center py-12 text-slate-400 bg-[#1e293b] rounded-lg border border-slate-700">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-medium text-white">Riconciliazione Incassi</h3>
          <p className="max-w-md mx-auto mt-2">
            Area riservata per il caricamento dei flussi XML di rendicontazione e l'allineamento automatico dei wallet.
          </p>
        </div>
      )}

      {subTab === 'storico' && (
        <div className="space-y-6">
          <Card className="bg-[#1e293b] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-blue-500" />
                Storico Eventi Wallet
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Cronologia creazione, eliminazione e trasferimenti wallet con motivi e saldi residui
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="text-center py-8 text-slate-400">Caricamento storico...</div>
              ) : walletHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nessun evento registrato.</p>
                  <p className="text-sm mt-2">Gli eventi verranno registrati automaticamente durante le operazioni sui wallet.</p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-700 overflow-hidden">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="bg-slate-800 text-slate-100 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Wallet</th>
                        <th className="px-4 py-3">Impresa</th>
                        <th className="px-4 py-3">Evento</th>
                        <th className="px-4 py-3">Motivo</th>
                        <th className="px-4 py-3 text-right">Saldo</th>
                        <th className="px-4 py-3">Dettagli</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {walletHistory.map((event, idx) => (
                        <tr key={event.id || idx} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            {(() => {
                              try {
                                if (!event.created_at) return '-';
                                const d = new Date(event.created_at);
                                if (isNaN(d.getTime())) return 'Data non valida';
                                return d.toLocaleDateString('it-IT', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                });
                              } catch (e) {
                                return 'Errore Data';
                              }
                            })()}
                          </td>
                          <td className="px-4 py-3 font-medium text-white">
                            #{event.wallet_id}
                          </td>
                          <td className="px-4 py-3">
                            {event.impresa_nome || '-'}
                            {event.partita_iva && <span className="block text-xs text-slate-500">P.IVA: {event.partita_iva}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={
                              event.evento === 'CREATO' 
                                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                : event.evento === 'ELIMINATO'
                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }>
                              {event.evento}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">
                              {event.motivo || 'MANUALE'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-400">
                            € {Number(event.saldo_al_momento || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {event.mercato_nome && <span className="block">Mercato: {event.mercato_nome}</span>}
                            {event.posteggio_numero && <span className="block">Posteggio: {event.posteggio_numero}</span>}
                            {event.saldo_trasferito_a && <span className="block text-blue-400">Trasferito a: #{event.saldo_trasferito_a}</span>}
                            {event.note && <span className="block italic">{event.note}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Canone Unico */}
      {subTab === 'canone' && (
        <div className="space-y-6">
          {/* Filtri */}
          <Card className="bg-[#1e293b] border-slate-700">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-slate-400 text-sm">Cerca Impresa</Label>
                  <Input 
                    placeholder="Ragione Sociale o P.IVA..."
                    value={canoneFilters.impresa_search}
                    onChange={(e) => setCanoneFilters({...canoneFilters, impresa_search: e.target.value})}
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
                <div className="w-[180px]">
                  <Label className="text-slate-400 text-sm">Mercato</Label>
                  <Select value={canoneFilters.mercato_id} onValueChange={(v) => setCanoneFilters({...canoneFilters, mercato_id: v})}>
                    <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700">
                      <SelectItem value="all">Tutti i Mercati</SelectItem>
                      {mercatiList.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label className="text-slate-400 text-sm">Tipo Operatore</Label>
                  <Select value={canoneFilters.tipo_operatore} onValueChange={(v) => setCanoneFilters({...canoneFilters, tipo_operatore: v})}>
                    <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700">
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="CONCESSION">Concessionari</SelectItem>
                      <SelectItem value="SPUNTA">Spuntisti</SelectItem>
                      <SelectItem value="STRAORDINARIO">Straordinari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label className="text-slate-400 text-sm">Stato</Label>
                  <Select value={canoneFilters.stato} onValueChange={(v) => setCanoneFilters({...canoneFilters, stato: v})}>
                    <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700">
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="PAGATO">Pagato</SelectItem>
                      <SelectItem value="NON_PAGATO">Non Pagato</SelectItem>
                      <SelectItem value="IN_MORA">In Mora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => setShowGeneraCanoneDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" /> Genera Canone Annuo
                </Button>
                <Button 
                  onClick={() => setShowPagamentoStraordinarioDialog(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Euro className="mr-2 h-4 w-4" /> Pagamento Straordinario
                </Button>
                <Button 
                  onClick={handleDeleteScadenzeAnno}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Elimina Scadenze Anno
                </Button>
                <Button 
                  onClick={() => setShowImpostazioniMoraDialog(true)}
                  variant="outline"
                  className="border-purple-600 text-purple-400 hover:bg-purple-600/10"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Impostazioni Mora
                </Button>
              </div>
              
              {/* Indicatori Totali Canone */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                {/* Canoni Da Pagare */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="text-xs text-red-400 uppercase font-semibold">Da Pagare</div>
                  <div className="text-xl font-bold text-red-400">
                    € {canoneScadenze
                      .filter((s: any) => s.stato_dinamico !== 'PAGATO')
                      .reduce((sum: number, s: any) => sum + parseFloat(s.importo_dovuto || 0), 0)
                      .toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-400">
                    {canoneScadenze.filter((s: any) => s.stato_dinamico !== 'PAGATO').length} rate
                  </div>
                </div>
                
                {/* Interessi Mora / Ricariche Spunta */}
                {canoneFilters.tipo_operatore === 'SPUNTA' ? (
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <div className="text-xs text-cyan-400 uppercase font-semibold">Ricariche Spunta</div>
                    <div className="text-xl font-bold text-cyan-400">
                      € {ricaricheSpunta
                        .reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0)
                        .toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400">
                      {ricaricheSpunta.length} ricariche
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="text-xs text-amber-400 uppercase font-semibold">Interessi Mora</div>
                    <div className="text-xl font-bold text-amber-400">
                      € {canoneScadenze
                        .reduce((sum: number, s: any) => sum + parseFloat(s.importo_mora || 0), 0)
                        .toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-slate-400">
                      {canoneScadenze.filter((s: any) => s.stato_dinamico === 'IN_MORA' || s.pagato_in_mora).length} rate in mora
                    </div>
                  </div>
                )}
                
                {/* Canoni Pagati / Totale Ricariche */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="text-xs text-green-400 uppercase font-semibold">
                    {canoneFilters.tipo_operatore === 'SPUNTA' ? 'Totale Incassato' : 'Pagati'}
                  </div>
                  <div className="text-xl font-bold text-green-400">
                    € {(() => {
                      // Calcolo totale pagato dalle scadenze
                      const totaleScadenzePagate = canoneScadenze
                        .filter((s: any) => s.stato === 'PAGATO')
                        .reduce((sum: number, s: any) => sum + parseFloat(s.importo_pagato || s.importo_dovuto || 0), 0);
                      
                      // Se filtro Spuntisti, aggiungi anche le ricariche
                      if (canoneFilters.tipo_operatore === 'SPUNTA' || canoneFilters.tipo_operatore === 'all') {
                        const totaleRicariche = ricaricheSpunta
                          .reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);
                        return (totaleScadenzePagate + totaleRicariche).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      }
                      
                      return totaleScadenzePagate.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}
                  </div>
                  <div className="text-xs text-slate-400">
                    {canoneFilters.tipo_operatore === 'SPUNTA' 
                      ? `${ricaricheSpunta.length} ricariche`
                      : `${canoneScadenze.filter((s: any) => s.stato === 'PAGATO').length} rate`
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabella Scadenze */}
          <Card className="bg-[#1e293b] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-400" />
                Scadenze Canone Unico ({canoneScadenze.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCanone ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-amber-500" /></div>
              ) : canoneScadenze.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Euro className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nessuna scadenza trovata</p>
                  <p className="text-sm">Usa "Genera Canone Annuo" per creare le scadenze</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">IMPRESA</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">MERCATO</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">POSTEGGIO</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">CAUSALE</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">ANNO</th>
                        <th className="text-center px-4 py-3 text-slate-400 font-medium">RATA</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">SCADENZA</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">GIORNI RITARDO</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-medium">IMPORTO</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-medium">MORA</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">STATO</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {canoneScadenze.map((s: any) => (
                        <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <span className="text-white font-medium">{s.ragione_sociale}</span>
                            <span className="block text-xs text-slate-400">{s.partita_iva}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{s.mercato_nome || '-'}</td>
                          <td className="px-4 py-3 text-slate-300">{s.posteggio || '-'}</td>
                          <td className="px-4 py-3 text-slate-300 text-xs max-w-[150px] truncate" title={s.tipo === 'STRAORDINARIO' && s.note ? (typeof s.note === 'string' && s.note.startsWith('{') ? JSON.parse(s.note).descrizione : s.note) : (s.tipo || 'Canone Annuo')}>
                            {s.tipo === 'STRAORDINARIO' ? (
                              <span className="text-amber-400">
                                {s.note && typeof s.note === 'string' && s.note.startsWith('{') 
                                  ? JSON.parse(s.note).descrizione 
                                  : (s.note?.replace('STRAORDINARIO: ', '').split(' - ')[0] || 'Straordinario')}
                              </span>
                            ) : (
                              <span className="text-slate-400">Canone Annuo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300">{s.anno_riferimento}</td>
                          <td className="px-4 py-3 text-center">
                            {s.rata_totale > 1 ? (
                              <span className="inline-flex items-center gap-1">
                                <span className={`w-3 h-3 rounded-full ${(s.stato_dinamico || s.stato) === 'PAGATO' ? 'bg-green-500' : (s.stato_dinamico || s.stato) === 'IN_MORA' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                                <span className="text-slate-300 text-sm">{s.rata_numero}/{s.rata_totale}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {s.data_scadenza ? new Date(s.data_scadenza).toLocaleDateString('it-IT') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {(s.giorni_ritardo_calc || s.giorni_ritardo || 0) > 0 ? (
                              <Badge className={`${(s.giorni_ritardo_calc || s.giorni_ritardo) > 30 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {s.giorni_ritardo_calc || s.giorni_ritardo} gg
                              </Badge>
                            ) : (
                              <span className="text-green-400">In regola</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white">€ {Number(s.importo_dovuto || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-red-400">
                            {(Number(s.importo_mora || 0) + Number(s.importo_interessi || 0)) > 0 
                              ? `€ ${(Number(s.importo_mora || 0) + Number(s.importo_interessi || 0)).toFixed(2)}` 
                              : (s.giorni_ritardo_calc || s.giorni_ritardo || 0) > 0 ? `${s.giorni_ritardo_calc || s.giorni_ritardo} gg` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${
                              (s.stato_dinamico || s.stato) === 'PAGATO' ? 'bg-green-500/20 text-green-400' :
                              (s.stato_dinamico || s.stato) === 'IN_MORA' ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {(s.stato_dinamico || s.stato) === 'PAGATO' ? 'PAGATO' : 
                               (s.stato_dinamico || s.stato) === 'IN_MORA' ? 'IN MORA' : 'NON PAGATO'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-slate-600 text-slate-300 h-8"
                                onClick={() => handleViewScadenza(s.id)}
                                title="Visualizza dettaglio"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-600 text-red-400 h-8" 
                                title="Elimina scadenza"
                                onClick={() => handleDeleteScadenza(s.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sezione Ricariche Spunta (v3.55.0) */}
          {(canoneFilters.tipo_operatore === 'SPUNTA' || canoneFilters.tipo_operatore === 'all') && (
            <Card className="bg-[#1e293b] border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-cyan-400" />
                  Ricariche Wallet Spunta ({ricaricheSpunta.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingRicariche ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-cyan-500" /></div>
                ) : ricaricheSpunta.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Wallet className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nessuna ricarica trovata</p>
                    <p className="text-sm">Le ricariche dei wallet Spunta appariranno qui</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">IMPRESA</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">MERCATO</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">DATA</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">DESCRIZIONE</th>
                          <th className="text-right px-4 py-3 text-slate-400 font-medium">IMPORTO</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">STATO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ricaricheSpunta.map((r: any) => (
                          <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                              <span className="text-white font-medium">{r.ragione_sociale}</span>
                              <span className="block text-xs text-slate-400">{r.partita_iva}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-300">{r.mercato_nome || '-'}</td>
                            <td className="px-4 py-3 text-slate-300">
                              {r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('it-IT') : '-'}
                            </td>
                            <td className="px-4 py-3 text-cyan-400">{r.description || 'Ricarica'}</td>
                            <td className="px-4 py-3 text-right font-bold text-green-400">+ € {Number(r.amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <Badge className="bg-green-500/20 text-green-400">COMPLETATA</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Lista Imprese/Concessioni (v3.36.0 - v3.57.0 sincronizzato con filtro principale) */}
          <Card className="bg-[#1e293b] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Lista Imprese per Mercato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtri Lista Imprese - v3.57.0/v3.58.0: sincronizzato con filtro principale + tipo operatore */}
              <div className="flex flex-wrap gap-4 items-end mb-6">
                <div className="w-[250px]">
                  <Label className="text-slate-400 text-sm">Seleziona Mercato</Label>
                  <Select value={selectedMercatoId} onValueChange={(v) => {
                    setSelectedMercatoId(v);
                    // Sincronizza anche il filtro principale
                    setCanoneFilters({...canoneFilters, mercato_id: v});
                  }}>
                    <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                      <SelectValue placeholder="Seleziona un mercato..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700">
                      {mercatiList.map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label className="text-slate-400 text-sm">Tipo Operatore</Label>
                  <Select value={impreseTipoOperatore} onValueChange={(v) => setImpreseTipoOperatore(v)}>
                    <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700">
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="CONCESSION">Concessionari</SelectItem>
                      <SelectItem value="SPUNTA">Spuntisti</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-slate-400 text-sm">Cerca Impresa</Label>
                  <Input 
                    placeholder="Denominazione o P.IVA..."
                    value={impreseSearch}
                    onChange={(e) => setImpreseSearch(e.target.value)}
                    className="bg-[#0f172a] border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Risultati */}
              {!selectedMercatoId ? (
                <div className="text-center py-8 text-slate-400">
                  <Store className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Seleziona un mercato per visualizzare le imprese</p>
                </div>
              ) : isLoadingImprese ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
              ) : impreseConcessioni.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Building2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nessuna impresa trovata per questo mercato</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {impreseConcessioni.map((impresa: any) => (
                    <div 
                      key={`${impresa.impresa_id}-${impresa.concessione_id || 'spunta'}`} 
                      className={`bg-[#0f172a] border rounded-lg p-4 hover:border-slate-600 transition-colors ${
                        impresa.tipo_record === 'SPUNTA' ? 'border-yellow-700/50' : 'border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-medium">{impresa.denominazione}</h4>
                          <p className="text-sm text-slate-400">P.IVA: {impresa.partita_iva || 'N/A'}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-slate-600 text-slate-300 h-8"
                          onClick={() => {
                            const isSpuntista = impresa.tipo_record === 'SPUNTA';
                            const info = isSpuntista 
                              ? `📋 DETTAGLI SPUNTISTA\n\n` +
                                `🏢 Impresa: ${impresa.denominazione}\n` +
                                `📄 P.IVA: ${impresa.partita_iva || 'N/A'}\n` +
                                `📊 Tipo: SPUNTISTA (senza concessione)\n` +
                                `💰 Saldo Wallet Spunta: € ${Number(impresa.wallet_balance || 0).toFixed(2)}`
                              : `📋 DETTAGLI CONCESSIONE\n\n` +
                                `🏢 Impresa: ${impresa.denominazione}\n` +
                                `📄 P.IVA: ${impresa.partita_iva || 'N/A'}\n` +
                                `📍 Posteggio: ${impresa.posteggio_numero}\n` +
                                `📊 Stato: ${impresa.badge_concessione}\n` +
                                `💰 Saldo Wallet: € ${Number(impresa.wallet_balance || 0).toFixed(2)}\n` +
                                `📅 Valida dal: ${impresa.valid_from ? new Date(impresa.valid_from).toLocaleDateString('it-IT') : 'N/A'}\n` +
                                `📅 Scadenza: ${impresa.valid_to ? new Date(impresa.valid_to).toLocaleDateString('it-IT') : 'N/A'}\n` +
                                `💵 Canone Annuo: € ${Number(impresa.canone_unico || 0).toFixed(2)}\n` +
                                `⚠️ Scadenze non pagate: ${impresa.scadenze_non_pagate || 0}\n` +
                                `💸 Totale dovuto: € ${Number(impresa.totale_dovuto || 0).toFixed(2)}`;
                            alert(info);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Badge Concessione/Posteggio o Spuntista */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {impresa.tipo_record === 'SPUNTA' ? (
                          /* Badge per Spuntista senza concessione */
                          <span className="inline-flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-md text-yellow-400 bg-yellow-400/10 border border-yellow-400/20">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              SPUNTISTA
                            </div>
                            {impresa.wallet_balance !== undefined && (
                              <div className={`flex items-center gap-1 pl-2 border-l border-yellow-400/20 ${impresa.wallet_balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <div className={`w-2 h-2 rounded-full ${impresa.wallet_balance > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="font-bold">€ {Number(impresa.wallet_balance).toFixed(2)}</span>
                              </div>
                            )}
                          </span>
                        ) : (
                          /* Badge per Concessionario */
                          <>
                            <span className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-md ${
                              impresa.badge_color === 'red' 
                                ? 'text-red-400 bg-red-400/10 border border-red-400/20' 
                                : impresa.badge_color === 'yellow'
                                  ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20'
                                  : 'text-blue-400 bg-blue-400/10 border border-blue-400/20'
                            }`}>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Posteggio {impresa.posteggio_numero}
                                {impresa.badge_concessione !== 'ATTIVA' && (
                                  <span className="ml-1 text-[10px] uppercase font-bold">({impresa.badge_concessione})</span>
                                )}
                              </div>
                              {impresa.wallet_balance !== undefined && (
                                <div className={`flex items-center gap-1 pl-2 border-l ${
                                  impresa.badge_color === 'red' ? 'border-red-400/20' : 'border-blue-400/20'
                                } ${impresa.wallet_balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  <div className={`w-2 h-2 rounded-full ${impresa.wallet_balance > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span className="font-bold">€ {Number(impresa.wallet_balance).toFixed(2)}</span>
                                </div>
                              )}
                            </span>

                            {/* Badge Spunta se presente */}
                            {impresa.badge_wallet === 'SPUNTA' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-md">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                Spunta
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Info Scadenze - solo per concessionari */}
                      {impresa.tipo_record !== 'SPUNTA' && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-400">
                            Scadenza: {impresa.valid_to ? new Date(impresa.valid_to).toLocaleDateString('it-IT') : 'N/A'}
                          </div>
                          {impresa.scadenze_non_pagate > 0 && (
                            <Badge className="bg-red-500/20 text-red-400">
                              {impresa.scadenze_non_pagate} scadenze non pagate
                            </Badge>
                          )}
                          {impresa.totale_dovuto > 0 && (
                            <span className="text-red-400 font-bold">
                              Dovuto: € {Number(impresa.totale_dovuto).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* v3.53.0: Tab Sanzioni/Verbali PM */}
      {subTab === 'sanzioni' && (
        <div className="space-y-6">
          {/* Filtri */}
          <Card className="bg-[#1e293b] border-slate-700">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Cerca impresa..."
                    value={sanzioniFilters.impresa_search}
                    onChange={(e) => setSanzioniFilters(prev => ({ ...prev, impresa_search: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <Select
                  value={sanzioniFilters.stato}
                  onValueChange={(value) => setSanzioniFilters(prev => ({ ...prev, stato: value }))}
                >
                  <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="NON_PAGATO">Non Pagato</SelectItem>
                    <SelectItem value="PAGATO">Pagato</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSanzioni}
                  className="border-slate-600 text-slate-300"
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Aggiorna
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Riepilogo Totali */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#1e293b] border-red-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Da Incassare</p>
                    <p className="text-2xl font-bold text-red-400">€{sanzioniTotali.non_pagato.toFixed(2)}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-400/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1e293b] border-green-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Incassato</p>
                    <p className="text-2xl font-bold text-green-400">€{sanzioniTotali.pagato.toFixed(2)}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1e293b] border-slate-600">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Totale Verbali</p>
                    <p className="text-2xl font-bold text-white">€{sanzioniTotali.totale.toFixed(2)}</p>
                  </div>
                  <FileText className="h-8 w-8 text-slate-400/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista Sanzioni */}
          <Card className="bg-[#1e293b] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Elenco Sanzioni/Verbali PM
                <Badge className="bg-slate-700 text-slate-300 ml-2">{sanzioniList.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSanzioni ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : sanzioniList.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                  <p>Nessuna sanzione trovata</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sanzioniList.map((sanzione) => (
                    <div key={sanzione.id} className={`p-4 rounded-lg border ${
                      sanzione.payment_status === 'PAGATO' 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{sanzione.verbale_code}</p>
                            <Badge className={sanzione.payment_status === 'PAGATO' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                              {sanzione.payment_status}
                            </Badge>
                            {sanzione.pagato_in_ridotto && (
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs">-30%</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-400">
                            {sanzione.impresa_nome} - {sanzione.partita_iva}
                          </p>
                          <p className="text-xs text-slate-500">
                            {sanzione.infraction_description || sanzione.infraction_code}
                          </p>
                          <p className="text-xs text-slate-500">
                            Emesso: {new Date(sanzione.issue_date).toLocaleDateString('it-IT')} | 
                            Scadenza: {new Date(sanzione.due_date).toLocaleDateString('it-IT')}
                            {sanzione.comune_verbale && ` | ${sanzione.comune_verbale}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">€{parseFloat(sanzione.amount).toFixed(2)}</p>
                          {sanzione.payment_status === 'PAGATO' && sanzione.paid_date && (
                            <p className="text-xs text-green-400">
                              Pagato il {new Date(sanzione.paid_date).toLocaleDateString('it-IT')}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300"
                              onClick={() => window.open(`https://api.mio-hub.me/api/verbali/${sanzione.id}/pdf`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {sanzione.payment_status !== 'PAGATO' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedSanzione(sanzione);
                                  setShowRegistraPagamentoDialog(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" /> Registra
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Notifiche */}
      {subTab === 'notifiche' && (
        <div className="space-y-6">
          <NotificationManager
            mittenteTipo="TRIBUTI"
            mittenteId={getImpersonationParams().comuneId ? parseInt(getImpersonationParams().comuneId!) : 1}
            mittenteNome={`Ufficio Tributi Comune di ${getImpersonationParams().comuneNome || 'Grosseto'}`}
            onNotificheUpdate={loadNotificheCount}
            comuneId={getImpersonationParams().comuneId ? parseInt(getImpersonationParams().comuneId!) : undefined}
          />
        </div>
      )}

      {/* Dialog Genera Canone Annuo */}
      <Dialog open={showGeneraCanoneDialog} onOpenChange={setShowGeneraCanoneDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Genera Canone Annuo</DialogTitle>
            <DialogDescription className="text-slate-400">
              Genera le scadenze del canone per tutti i concessionari attivi
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Indicazione mercato selezionato */}
            <div className={`p-3 rounded-lg text-sm ${canoneFilters.mercato_id !== 'all' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <div className={`font-medium mb-1 ${canoneFilters.mercato_id !== 'all' ? 'text-blue-400' : 'text-amber-400'}`}>Mercato Target:</div>
              <div className="text-slate-300">
                {canoneFilters.mercato_id !== 'all' 
                  ? mercatiList.find((m: any) => m.id.toString() === canoneFilters.mercato_id)?.name || 'Mercato selezionato'
                  : 'TUTTI i mercati (usa il filtro nella pagina per selezionare un mercato specifico)'
                }
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Anno</Label>
              <Input 
                type="number" 
                value={canoneAnno} 
                onChange={(e) => {
                  setCanoneAnno(e.target.value);
                  // Aggiorna anche la data prima rata con l'anno selezionato
                  setCanoneDataPrimaRata(`${e.target.value}-03-31`);
                }}
                className="bg-[#0f172a] border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Numero Rate</Label>
              <select 
                value={canoneNumeroRate} 
                onChange={(e) => setCanoneNumeroRate(e.target.value)}
                className="w-full p-2 rounded bg-[#0f172a] border border-slate-700 text-white"
              >
                <option value="1">1 rata (pagamento unico)</option>
                <option value="2">2 rate (semestrale)</option>
                <option value="3">3 rate (quadrimestrale)</option>
                <option value="4">4 rate (trimestrale)</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-300">Data Prima Rata</Label>
              <Input 
                type="date" 
                value={canoneDataPrimaRata} 
                onChange={(e) => setCanoneDataPrimaRata(e.target.value)}
                className="bg-[#0f172a] border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                {canoneNumeroRate === '1' && 'Scadenza unica'}
                {canoneNumeroRate === '2' && 'Le rate saranno a 6 mesi di distanza'}
                {canoneNumeroRate === '3' && 'Le rate saranno a 4 mesi di distanza'}
                {canoneNumeroRate === '4' && 'Le rate saranno a 3 mesi di distanza'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneraCanoneDialog(false)} className="border-slate-600">
              Annulla
            </Button>
            <Button onClick={handleGeneraCanoneAnnuo} className="bg-green-600 hover:bg-green-700">
              Genera Scadenze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Pagamento Straordinario */}
      <Dialog open={showPagamentoStraordinarioDialog} onOpenChange={setShowPagamentoStraordinarioDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pagamento Straordinario</DialogTitle>
            <DialogDescription className="text-slate-400">
              Genera avvisi di pagamento per fiere, eventi o addebiti extra
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Selezione destinatari */}
            <div className="bg-slate-800/50 p-3 rounded-lg space-y-3">
              <Label className="text-slate-300 font-medium">Destinatari</Label>
              
              {/* Cerca impresa singola */}
              <div className="relative">
                <Label className="text-slate-400 text-xs">Cerca Impresa (opzionale)</Label>
                <Input 
                  value={straordinarioImpresaSearch} 
                  onChange={(e) => handleSearchImpresaStraordinario(e.target.value)}
                  placeholder="Cerca per ragione sociale o P.IVA..."
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
                {straordinarioImpreseSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {straordinarioImpreseSuggestions.map((impresa: any) => (
                      <div 
                        key={impresa.id} 
                        className="p-2 hover:bg-slate-700 cursor-pointer text-sm"
                        onClick={() => {
                          setStraordinarioImpresaId(impresa.id.toString());
                          setStraordinarioImpresaSearch(impresa.denominazione);
                          setStraordinarioImpreseSuggestions([]);
                          // Ricarica posteggi con la nuova impresa selezionata
                          if (straordinarioMercatoId !== 'all') {
                            loadPosteggiMercato(straordinarioMercatoId, impresa.id.toString());
                          }
                        }}
                      >
                        <div className="font-medium">{impresa.denominazione}</div>
                        <div className="text-slate-400 text-xs">P.IVA: {impresa.partita_iva}</div>
                      </div>
                    ))}
                  </div>
                )}
                {straordinarioImpresaId && (
                  <div className="mt-1 text-xs text-green-400">Impresa selezionata (ID: {straordinarioImpresaId})</div>
                )}
              </div>
              
              {/* Seleziona mercato */}
              <div>
                <Label className="text-slate-400 text-xs">Seleziona Mercato {!straordinarioImpresaId && '*'}</Label>
                <select 
                  value={straordinarioMercatoId} 
                  onChange={(e) => {
                    setStraordinarioMercatoId(e.target.value);
                    setStraordinarioPosteggio('');
                    loadPosteggiMercato(e.target.value, straordinarioImpresaId);
                  }}
                  className="w-full p-2 rounded bg-[#0f172a] border border-slate-700 text-white"
                >
                  <option value="all">Tutti i mercati</option>
                  {mercatiList.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Posteggio (opzionale) - Dropdown con gruppi v3.52.0 */}
              {straordinarioMercatoId !== 'all' && (
                <div>
                  <Label className="text-slate-400 text-xs">Posteggio (opzionale)</Label>
                  {isLoadingPosteggi ? (
                    <div className="text-slate-400 text-sm py-2">Caricamento posteggi...</div>
                  ) : (
                    <select 
                      value={straordinarioPosteggio} 
                      onChange={(e) => setStraordinarioPosteggio(e.target.value)}
                      className="w-full p-2 rounded bg-[#0f172a] border border-slate-700 text-white"
                    >
                      <option value="">Tutti i posteggi del mercato</option>
                      {straordinarioPosteggiList.posteggi_impresa.length > 0 && (
                        <optgroup label="📍 Posteggi dell'impresa selezionata" className="bg-green-900/30">
                          {straordinarioPosteggiList.posteggi_impresa.map((p: any) => (
                            <option key={p.stall_id} value={p.numero} className="bg-green-900/20 text-green-300">
                              ⭐ Posteggio {p.numero} {p.dimensioni ? `(${p.dimensioni})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {straordinarioPosteggiList.altri_posteggi.length > 0 && (
                        <optgroup label="📦 Altri posteggi del mercato">
                          {straordinarioPosteggiList.altri_posteggi.map((p: any) => (
                            <option key={p.stall_id} value={p.numero}>
                              Posteggio {p.numero} {p.impresa_nome ? `- ${p.impresa_nome}` : '(libero)'} {p.dimensioni ? `(${p.dimensioni})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}
                  <div className="text-xs text-slate-500 mt-1">Lascia vuoto per tutti i posteggi del mercato</div>
                </div>
              )}
            </div>
            
            {/* Dettagli pagamento */}
            <div>
              <Label className="text-slate-300">Descrizione Evento *</Label>
              <Input 
                value={straordinarioDescrizione} 
                onChange={(e) => setStraordinarioDescrizione(e.target.value)}
                placeholder="Es: Fiera di Natale 2026"
                className="bg-[#0f172a] border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300">Importo (€) *</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={straordinarioImporto} 
                  onChange={(e) => setStraordinarioImporto(e.target.value)}
                  placeholder="150.00"
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Data Scadenza *</Label>
                <Input 
                  type="date" 
                  value={straordinarioDataScadenza} 
                  onChange={(e) => setStraordinarioDataScadenza(e.target.value)}
                  className="bg-[#0f172a] border-slate-700 text-white"
                />
              </div>
            </div>
            
            {/* Riepilogo */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-sm">
              <div className="text-amber-400 font-medium mb-1">Riepilogo:</div>
              <div className="text-slate-300">
                {straordinarioImpresaId 
                  ? `Pagamento per: ${straordinarioImpresaSearch}${straordinarioMercatoId !== 'all' ? ` (${mercatiList.find((m: any) => m.id.toString() === straordinarioMercatoId)?.name || 'Mercato'})` : ''}${straordinarioPosteggio ? ` - Posteggio ${straordinarioPosteggio}` : ''}` 
                  : straordinarioMercatoId === 'all' 
                    ? 'Pagamento per: TUTTI i concessionari di TUTTI i mercati' 
                    : straordinarioPosteggio
                      ? `Pagamento per: Posteggio ${straordinarioPosteggio} del ${mercatiList.find((m: any) => m.id.toString() === straordinarioMercatoId)?.name || 'mercato'}`
                      : `Pagamento per: TUTTI i concessionari del ${mercatiList.find((m: any) => m.id.toString() === straordinarioMercatoId)?.name || 'mercato selezionato'}`
                }
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPagamentoStraordinarioDialog(false);
              setStraordinarioImpresaId('');
              setStraordinarioImpresaSearch('');
              setStraordinarioPosteggio('');
              setStraordinarioMercatoId('all');
            }} className="border-slate-600">
              Annulla
            </Button>
            <Button onClick={handleGeneraPagamentoStraordinario} className="bg-amber-600 hover:bg-amber-700">
              Genera Avvisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ricarica / Pagamento */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedWallet?.type !== 'SPUNTA' 
                ? 'Pagamento Canone Concessione' 
                : walletScadenze.length > 0 
                  ? 'Pagamenti Straordinari' 
                  : 'Ricarica Credito Spunta'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedCompany}
              {selectedWallet?.type !== 'SPUNTA' && (
                <>
                  {' - '}
                  {selectedWallet?.stall_number ? `Posteggio ${selectedWallet.stall_number}` : 'Posteggio N/A'}
                  {selectedWallet?.market_name ? ` (${selectedWallet.market_name})` : ''}
                </>
              )}
              {selectedWallet?.type === 'SPUNTA' && ' - Borsellino Ricaricabile'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            {selectedWallet?.type !== 'SPUNTA' ? (
              isCalculating ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
              ) : walletScadenze.length > 0 ? (
                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700 space-y-3">
                  <div className="text-sm text-slate-400 mb-2">Rate per {annualFeeData?.year || new Date().getFullYear()}:</div>
                  {(() => {
                    // Trova la prima rata da pagare (NON_PAGATO o IN_MORA)
                    const rateNonPagate = walletScadenze.filter((r: any) => r.stato !== 'PAGATO');
                    const primaRataDaPagare = rateNonPagate.length > 0 ? rateNonPagate[0] : null;
                    
                    return walletScadenze.map((rata: any, idx: number) => {
                      const isPagata = rata.stato === 'PAGATO';
                      const isInMora = rata.stato === 'IN_MORA';
                      const isPagatoInMora = isPagata && rata.pagato_in_mora;
                      const isPrimaRataDaPagare = primaRataDaPagare && rata.rata === primaRataDaPagare.rata;
                      const isBloccata = !isPagata && !isPrimaRataDaPagare;
                      
                      // Usa importo_totale se disponibile (include mora), altrimenti importo base
                      const importoDaMostrare = rata.importo_totale || rata.importo;
                      const hasMora = rata.importo_mora > 0;
                      
                      return (
                        <div key={idx} className={`flex justify-between items-center p-2 rounded ${
                          isPagatoInMora
                            ? 'bg-red-500/20 border border-red-500/50 opacity-80'
                            : isPagata 
                              ? 'bg-green-500/10 border border-green-500/30 opacity-70' 
                              : isPrimaRataDaPagare 
                                ? isInMora
                                  ? 'bg-red-500/20 border border-red-500'
                                  : 'bg-blue-500/20 border border-blue-500' 
                                : 'bg-slate-800 opacity-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                              isPagatoInMora ? 'bg-red-500' : isPagata ? 'bg-green-500' : isInMora ? 'bg-red-500' : 'bg-amber-500'
                            }`}></span>
                            <span className={isPagatoInMora ? 'text-red-400' : isPagata ? 'text-green-400' : isPrimaRataDaPagare ? 'text-white' : 'text-slate-500'}>Rata {rata.rata}</span>
                            <span className="text-slate-400 text-xs">scad. {new Date(rata.scadenza).toLocaleDateString('it-IT')}</span>
                            {isPagatoInMora && (
                              <>
                                <span className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded">{rata.giorni_ritardo} gg MORA</span>
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">PAGATA</span>
                              </>
                            )}
                            {isPagata && !isPagatoInMora && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">PAGATA</span>}
                            {isInMora && !isPagata && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">{rata.giorni_ritardo} gg MORA</span>}
                            {isBloccata && <span className="text-xs text-slate-500">🔒</span>}
                          </div>
                          <div className="text-right">
                            {hasMora && (isPrimaRataDaPagare || isPagatoInMora) && (
                              <div className="text-xs text-red-400">+€ {rata.importo_mora.toFixed(2)} mora</div>
                            )}
                            <span className={`font-bold ${
                              isPagatoInMora ? 'text-red-400' : isPagata ? 'text-green-400' : isPrimaRataDaPagare ? (isInMora ? 'text-red-400' : 'text-blue-400') : 'text-slate-500'
                            }`}>€ {importoDaMostrare.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {(() => {
                    const rateNonPagate = walletScadenze.filter((r: any) => r.stato !== 'PAGATO');
                    const primaRata = rateNonPagate[0];
                    if (rateNonPagate.length > 0 && primaRata) {
                      const importoTotale = primaRata.importo_totale || primaRata.importo;
                      const hasMora = primaRata.importo_mora > 0;
                      return (
                        <>
                          {rateNonPagate.length > 1 && (
                            <div className="text-xs text-slate-500 mt-2">* Paga prima la Rata {primaRata.rata} per sbloccare le successive</div>
                          )}
                          <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-lg">
                            <span className="text-white">Importo da Pagare:</span>
                            <span className={hasMora ? 'text-red-400' : 'text-blue-400'}>€ {importoTotale.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <div className="border-t border-slate-700 pt-2 text-center text-green-400 font-bold">
                          ✅ Tutte le rate sono state pagate!
                        </div>
                      );
                    }
                  })()}
                </div>
              ) : annualFeeData ? (
                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Superficie:</span>
                    <span>{annualFeeData.calculation.area_mq} mq</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tariffa {annualFeeData.year}:</span>
                    <span>€ {annualFeeData.calculation.cost_per_sqm.toFixed(2)} / mq</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Giorni Mercato:</span>
                    <span>{annualFeeData.calculation.days_per_year} gg</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-bold text-lg">
                    <span className="text-white">Totale Annuo:</span>
                    <span className="text-blue-400">€ {annualFeeData.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-amber-400 mt-2">* Nessuna scadenza generata. Genera le scadenze dalla tab Canone.</div>
                </div>
              ) : (
                <p className="text-red-400 text-center">Impossibile calcolare il canone. Dati mancanti (Area, Tariffa o Giorni).</p>
              )
            ) : (
              // Wallet SPUNTA - mostra scadenze straordinarie se presenti, altrimenti form ricarica
              isCalculating ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
              ) : walletScadenze.length > 0 ? (
                <div className="bg-[#0f172a] p-4 rounded-lg border border-slate-700 space-y-3">
                  <div className="text-sm text-slate-400 mb-2">Pagamenti Straordinari {annualFeeData?.year || new Date().getFullYear()}:</div>
                  {(() => {
                    // Trova la prima scadenza da pagare
                    const scadenzeNonPagate = walletScadenze.filter((r: any) => r.stato !== 'PAGATO');
                    const primaScadenzaDaPagare = scadenzeNonPagate.length > 0 ? scadenzeNonPagate[0] : null;
                    
                    return walletScadenze.map((scadenza: any, idx: number) => {
                      const isPagata = scadenza.stato === 'PAGATO';
                      const isInMora = scadenza.stato === 'IN_MORA';
                      const isPrimaScadenzaDaPagare = primaScadenzaDaPagare && scadenza.id === primaScadenzaDaPagare.id;
                      const isBloccata = !isPagata && !isPrimaScadenzaDaPagare;
                      
                      const importoDaMostrare = scadenza.importo_totale || scadenza.importo;
                      const hasMora = scadenza.importo_mora > 0;
                      // Usa la causale se disponibile, altrimenti fallback a "Evento #N"
                      const causale = scadenza.causale || `Evento #${idx + 1}`;
                      
                      return (
                        <div key={idx} className={`flex justify-between items-center p-3 rounded ${
                          isPagata 
                            ? 'bg-green-500/20 border border-green-500/50' 
                            : isPrimaScadenzaDaPagare 
                              ? isInMora
                                ? 'bg-red-500/20 border border-red-500'
                                : 'bg-amber-500/20 border border-amber-500' 
                              : 'bg-slate-800 opacity-50'
                        }`}>
                          <div className="flex items-center gap-3 flex-1">
                            <span className={`w-3 h-3 rounded-full ${
                              isPagata ? 'bg-green-500' : isInMora ? 'bg-red-500' : 'bg-amber-500'
                            }`}></span>
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isPagata ? 'text-green-400' : isPrimaScadenzaDaPagare ? 'text-white' : 'text-slate-500'}`}>
                                {causale}
                              </span>
                              <span className="text-xs text-slate-400">
                                scad. {new Date(scadenza.scadenza).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              {hasMora && isPrimaScadenzaDaPagare && (
                                <div className="text-xs text-red-400">+€ {scadenza.importo_mora.toFixed(2)} mora</div>
                              )}
                              <span className={`font-bold ${
                                isPagata ? 'text-green-400' : 
                                isPrimaScadenzaDaPagare ? (isInMora ? 'text-red-400' : 'text-white') : 
                                'text-slate-500'
                              }`}>€ {importoDaMostrare.toFixed(2)}</span>
                            </div>
                            {/* Badge stato */}
                            {isPagata ? (
                              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded font-medium">PAGATA</span>
                            ) : isInMora ? (
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded font-medium">{scadenza.giorni_ritardo} gg MORA</span>
                            ) : (
                              <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded font-medium">DA PAGARE</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  
                  {/* Messaggio se tutte pagate */}
                  {walletScadenze.every((s: any) => s.stato === 'PAGATO') && (
                    <div className="text-center text-green-400 py-2 flex items-center justify-center gap-2">
                      <span>✅</span> Tutti i pagamenti sono stati effettuati!
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Importo da Ricaricare (€)</Label>
                  <Input 
                    type="number" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="bg-[#0f172a] border-slate-700 text-white text-lg"
                    placeholder="0.00"
                  />
                </div>
              )
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Nascondi pulsanti se tutte le scadenze sono pagate (per wallet SPUNTA con scadenze) */}
            {selectedWallet?.type === 'SPUNTA' && walletScadenze.length > 0 && walletScadenze.every((s: any) => s.stato === 'PAGATO') ? (
              <Button 
                variant="outline" 
                className="border-green-600 text-green-400 hover:bg-green-900/20"
                onClick={() => setShowDepositDialog(false)}
              >
                Chiudi
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => handleExecuteDeposit('AVVISO')}
                  disabled={isProcessing || !depositAmount}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Genera Avviso PagoPA
                </Button>
                <Button 
                  className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                  onClick={() => handleExecuteDeposit('PAGA_ORA')}
                  disabled={isProcessing || !depositAmount}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Paga Ora (Simulazione)
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Conferma Eliminazione Wallet */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Elimina Wallet
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Sei sicuro di voler eliminare questo wallet?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="bg-[#0f172a] p-4 rounded-lg border border-red-500/30">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">ID Wallet:</span>
                <span className="text-white font-mono">#{walletToDelete?.id}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Tipo:</span>
                <span className="text-white">{walletToDelete?.type}</span>
              </div>
              {walletToDelete?.market_name && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Mercato:</span>
                  <span className="text-white">{walletToDelete.market_name}</span>
                </div>
              )}
              {walletToDelete?.stall_number && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Posteggio:</span>
                  <span className="text-white">{walletToDelete.stall_number}</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-slate-700 pt-2 mt-2">
                <span className="text-slate-400">Saldo Attuale:</span>
                <span className={`font-bold ${(walletToDelete?.balance || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  € {walletToDelete?.balance?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-300 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Attenzione:</strong> Questa azione eliminerà definitivamente il wallet e tutte le transazioni associate. L'operazione non può essere annullata.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Annulla
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteWallet}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Elimina Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Impostazioni Mora (v3.46.0) */}
      <Dialog open={showImpostazioniMoraDialog} onOpenChange={setShowImpostazioniMoraDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-purple-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Impostazioni Mora
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Configura il calcolo automatico degli interessi di mora
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Toggle Abilita Mora */}
            <div className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-slate-700">
              <div>
                <Label className="text-white font-medium">Calcolo Mora Abilitato</Label>
                <p className="text-xs text-slate-400">Se abilitato, calcola automaticamente gli interessi di mora</p>
              </div>
              <button
                onClick={() => setImpostazioniMora({...impostazioniMora, mora_abilitata: !impostazioniMora.mora_abilitata})}
                className={`w-12 h-6 rounded-full transition-colors ${impostazioniMora.mora_abilitata ? 'bg-purple-600' : 'bg-slate-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${impostazioniMora.mora_abilitata ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>

            {/* Tasso Interesse Giornaliero */}
            <div className="space-y-2">
              <Label className="text-slate-300">Tasso Interesse Giornaliero (%)</Label>
              <Input
                type="number"
                step="0.001"
                value={(impostazioniMora.tasso_interesse_giornaliero * 100).toFixed(4)}
                onChange={(e) => setImpostazioniMora({...impostazioniMora, tasso_interesse_giornaliero: parseFloat(e.target.value) / 100 || 0})}
                className="bg-[#0f172a] border-slate-600 text-white"
                disabled={!impostazioniMora.mora_abilitata}
              />
              <p className="text-xs text-slate-500">Es: 0.0137% = tasso legale 5%/365 giorni</p>
            </div>

            {/* Tasso Mora Fisso */}
            <div className="space-y-2">
              <Label className="text-slate-300">Mora Fissa (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={(impostazioniMora.tasso_mora_fisso * 100).toFixed(1)}
                onChange={(e) => setImpostazioniMora({...impostazioniMora, tasso_mora_fisso: parseFloat(e.target.value) / 100 || 0})}
                className="bg-[#0f172a] border-slate-600 text-white"
                disabled={!impostazioniMora.mora_abilitata}
              />
              <p className="text-xs text-slate-500">Percentuale fissa applicata all'importo in mora</p>
            </div>

            {/* Giorni di Grazia */}
            <div className="space-y-2">
              <Label className="text-slate-300">Giorni di Grazia</Label>
              <Input
                type="number"
                value={impostazioniMora.giorni_grazia}
                onChange={(e) => setImpostazioniMora({...impostazioniMora, giorni_grazia: parseInt(e.target.value) || 0})}
                className="bg-[#0f172a] border-slate-600 text-white"
              />
              <p className="text-xs text-slate-500">Giorni dopo la scadenza prima di applicare la mora</p>
            </div>

            {/* Riepilogo Calcolo */}
            {impostazioniMora.mora_abilitata && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                <p className="text-purple-300 text-sm">
                  <strong>Formula:</strong> Importo × {(impostazioniMora.tasso_mora_fisso * 100).toFixed(1)}% + (Importo × {(impostazioniMora.tasso_interesse_giornaliero * 100).toFixed(4)}% × giorni ritardo)
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => setShowImpostazioniMoraDialog(false)}
              disabled={isSavingMora}
            >
              Annulla
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleSaveImpostazioniMora}
              disabled={isSavingMora}
            >
              {isSavingMora ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Salva Impostazioni
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* v3.53.0: Dialog Registra Pagamento Sanzione */}
      <Dialog open={showRegistraPagamentoDialog} onOpenChange={setShowRegistraPagamentoDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-400" />
              Registra Pagamento Sanzione
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Registra manualmente il pagamento di una sanzione (contanti/bonifico)
            </DialogDescription>
          </DialogHeader>
          
          {selectedSanzione && (
            <div className="py-4 space-y-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <p className="font-medium text-white">{selectedSanzione.verbale_code}</p>
                <p className="text-sm text-slate-400">{selectedSanzione.impresa_nome}</p>
                <p className="text-xs text-slate-500">{selectedSanzione.infraction_description || selectedSanzione.infraction_code}</p>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                <span className="text-slate-300">Importo da Registrare:</span>
                <span className="text-2xl font-bold text-green-400">€{parseFloat(selectedSanzione.amount).toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300"
              onClick={() => setShowRegistraPagamentoDialog(false)}
              disabled={isRegistrandoPagamento}
            >
              Annulla
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleRegistraPagamentoSanzione}
              disabled={isRegistrandoPagamento}
            >
              {isRegistrandoPagamento ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Conferma Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
