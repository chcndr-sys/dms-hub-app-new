/**
 * Wallet Impresa - Pagamenti PagoPA
 * Pagina dedicata per visualizzare il wallet dell'impresa loggata
 * v3.73.0 - Fix wallet GENERICO: testo corretto, pulsante Ricarica, dialog ricarica
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Wallet, Euro, Calendar, Clock, CreditCard, CheckCircle, 
  AlertCircle, ArrowLeft, RefreshCw, FileText, Building2,
  Receipt, TrendingUp, ChevronRight, ChevronDown, ChevronUp,
  Store, MapPin, AlertTriangle, Plus, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tipi wallet
interface WalletItem {
  id: number;
  type: 'SPUNTA' | 'CONCESSIONE' | 'GENERICO';
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

// Tipo scadenza dal backend
interface ScadenzaAPI {
  id: number;
  wallet_id: number;
  anno_riferimento: number;
  importo_dovuto: string;
  importo_pagato: string;
  data_scadenza: string;
  data_pagamento: string | null;
  stato: string;
  giorni_ritardo: number;
  importo_mora: string;
  importo_interessi: string;
  rata_numero: number;
  rata_totale: number;
  pagato_in_mora: boolean;
  tipo: string;
  note: string | null;
  wallet_tipo: string;
  wallet_saldo: string;
  ragione_sociale: string;
  partita_iva: string;
  mercato_nome: string;
  posteggio: string;
  concessione_status: string;
  concessione_id: number;
  giorni_ritardo_calc: number;
  giorni_grazia: number;
  stato_dinamico: string;
}

// Tipo sanzione/verbale dal backend (v3.53.0, v3.54.1)
interface SanzioneAPI {
  id: number;
  verbale_code: string;
  infraction_code: string;
  infraction_description: string;
  amount: string;
  payment_status: string;
  issue_date: string;
  due_date: string;
  notified_at: string | null;
  paid_date: string | null;  // v3.54.1
  in_periodo_ridotto: boolean;
  importo_ridotto: string;
  scadenza_ridotto: string | null;
  giorni_ridotto_rimanenti: number;
  comune_nome: string | null;
  comune_id: number | null;
  impresa_nome: string;
  partita_iva: string;
  // v3.54.1: Campi per storico pagamenti
  pagato_in_ridotto?: boolean;
  importo_effettivo_pagato?: string;
  reduced_amount?: string;
}

export default function WalletImpresaPage() {
  const [, setLocation] = useLocation();
  const [company, setCompany] = useState<CompanyWallets | null>(null);
  const [scadenze, setScadenze] = useState<ScadenzaAPI[]>([]);
  const [sanzioni, setSanzioni] = useState<SanzioneAPI[]>([]);  // v3.53.0: Sanzioni/Verbali PM
  const [sanzioniPagate, setSanzioniPagate] = useState<SanzioneAPI[]>([]);  // v3.54.1: Storico sanzioni pagate
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallet');
  const [expandedSpunta, setExpandedSpunta] = useState(true);
  const [expandedConcessioni, setExpandedConcessioni] = useState(true);
  const [selectedScadenza, setSelectedScadenza] = useState<ScadenzaAPI | null>(null);
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false);
  
  // v3.53.0: Stati per pagamento sanzioni
  const [selectedSanzione, setSelectedSanzione] = useState<SanzioneAPI | null>(null);
  const [showPagamentoSanzioneDialog, setShowPagamentoSanzioneDialog] = useState(false);
  const [isProcessingSanzione, setIsProcessingSanzione] = useState(false);
  
  // Stati per dialog ricarica wallet GENERICO
  const [showRicaricaDialog, setShowRicaricaDialog] = useState(false);
  const [selectedWalletRicarica, setSelectedWalletRicarica] = useState<WalletItem | null>(null);
  const [ricaricaAmount, setRicaricaAmount] = useState('');
  const [isProcessingRicarica, setIsProcessingRicarica] = useState(false);
  
  // Stato per transazioni (storico ricariche)
  const [transactions, setTransactions] = useState<any[]>([]);

  // ID impresa risolto con multi-strategia (v5.8.0)
  const [resolvedImpresaId, setResolvedImpresaId] = useState<number | null>(null);
  const [impresaResolving, setImpresaResolving] = useState(true);

  // In produzione usa proxy Vercel (/api/wallets/* → api.mio-hub.me), in dev URL diretto
  const API_BASE_URL = import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL || 'https://api.mio-hub.me')
    : '';
  const ORCHESTRATORE_URL = import.meta.env.DEV
    ? 'https://orchestratore.mio-hub.me'
    : '';
  const MIHUB_URL = import.meta.env.VITE_MIHUB_API_URL || 'https://mihub.157-90-29-66.nip.io';

  // Risolvi impresa_id con multi-strategia (come DashboardImpresa)
  useEffect(() => {
    async function resolveImpresa() {
      let impresaId: number | null = null;
      let userEmail = '';
      let userId = 0;
      let userCF = '';

      // Strategia 1: da miohub_firebase_user (Firebase format)
      try {
        const fbStr = localStorage.getItem('miohub_firebase_user');
        if (fbStr) {
          const fbUser = JSON.parse(fbStr);
          if (fbUser.impresaId) impresaId = fbUser.impresaId;
          userEmail = fbUser.email || '';
          userId = fbUser.miohubId || 0;
          userCF = fbUser.fiscalCode || '';
        }
      } catch { /* ignore */ }

      // Strategia 2: da localStorage['user'] (legacy bridge)
      if (!impresaId) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.impresa_id) impresaId = user.impresa_id;
            if (!userEmail) userEmail = user.email || '';
            if (!userId) userId = user.id || 0;
            if (!userCF) userCF = user.fiscal_code || user.fiscalCode || '';
          }
        } catch { /* ignore */ }
      }

      // Se trovato via localStorage, usa direttamente
      if (impresaId) {
        setResolvedImpresaId(impresaId);
        setImpresaResolving(false);
        return;
      }

      // Strategia 3: cerca impresa per email su MIHUB
      if (userEmail) {
        try {
          const res = await fetch(`${MIHUB_URL}/api/imprese?email=${encodeURIComponent(userEmail)}`);
          if (res.ok) {
            const data = await res.json();
            const list = data.success ? data.data : (Array.isArray(data) ? data : null);
            if (list && list.length > 0 && list[0].id) {
              impresaId = list[0].id;
            }
          }
        } catch { /* ignore */ }
      }

      // Strategia 4: cerca impresa per email su orchestratore
      if (!impresaId && userEmail) {
        try {
          const res = await fetch(`${ORCHESTRATORE_URL}/api/imprese?email=${encodeURIComponent(userEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data && data.data.length > 0) {
              impresaId = data.data[0].id;
            }
          }
        } catch { /* ignore */ }
      }

      // Strategia 5: cerca per user_id su orchestratore
      if (!impresaId && userId) {
        try {
          const res = await fetch(`${ORCHESTRATORE_URL}/api/imprese?user_id=${userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data && data.data.length > 0) {
              impresaId = data.data[0].id;
            }
          }
        } catch { /* ignore */ }
      }

      // Strategia 6: cerca per codice fiscale su orchestratore
      if (!impresaId && userCF) {
        try {
          const res = await fetch(`${ORCHESTRATORE_URL}/api/imprese?rappresentante_legale_cf=${userCF}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data && data.data.length > 0) {
              impresaId = data.data[0].id;
            }
          }
        } catch { /* ignore */ }
      }

      // Se trovato, salva in localStorage per le prossime volte
      if (impresaId) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            user.impresa_id = impresaId;
            localStorage.setItem('user', JSON.stringify(user));
          }
          const fbStr = localStorage.getItem('miohub_firebase_user');
          if (fbStr) {
            const fbUser = JSON.parse(fbStr);
            fbUser.impresaId = impresaId;
            localStorage.setItem('miohub_firebase_user', JSON.stringify(fbUser));
          }
        } catch { /* ignore */ }
      }

      setResolvedImpresaId(impresaId);
      setImpresaResolving(false);
    }

    resolveImpresa();
  }, []);

  // Carica dati wallet impresa
  const fetchData = async () => {
    if (!resolvedImpresaId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch wallet impresa
      const walletsRes = await fetch(`${API_BASE_URL}/api/wallets/company/${resolvedImpresaId}`);
      const walletsData = await walletsRes.json();
      
      let spuntaWallets: WalletItem[] = [];
      let concessionWallets: WalletItem[] = [];
      
      if (walletsData.success && walletsData.data) {
        const wallets = walletsData.data;
        // v3.73.0: Aggiunto supporto per tipo SPUNTISTA (mostrato come GENERICO)
        spuntaWallets = wallets.filter((w: any) => w.type === 'SPUNTA' || w.type === 'GENERICO' || w.type === 'SPUNTISTA').map((w: any) => ({
          id: w.id,
          type: (w.type === 'GENERICO' || w.type === 'SPUNTISTA' ? 'GENERICO' : 'SPUNTA') as 'SPUNTA' | 'GENERICO',
          balance: parseFloat(w.balance) || 0,
          status: w.status,
          market_name: w.market_name,
          stall_number: w.stall_number,
          updated_at: w.last_update
        }));
        concessionWallets = wallets.filter((w: any) => w.type === 'CONCESSION').map((w: any) => ({
          id: w.id,
          type: 'CONCESSIONE' as const,
          balance: parseFloat(w.balance) || 0,
          status: w.status,
          market_name: w.market_name,
          concession_code: w.concession_code,
          stall_number: w.stall_number,
          stall_area: parseFloat(w.stall_area) || 0,
          updated_at: w.last_update
        }));
      }
      
      // Fetch dati impresa
      const impresaRes = await fetch(`${API_BASE_URL}/api/imprese/${resolvedImpresaId}`);
      const impresaData = await impresaRes.json();
      
      setCompany({
        company_id: resolvedImpresaId,
        ragione_sociale: impresaData.success ? impresaData.data?.denominazione : 'Impresa',
        partita_iva: impresaData.success ? impresaData.data?.partita_iva : 'N/A',
        spunta_wallets: spuntaWallets,
        concession_wallets: concessionWallets
      });
      
      // Fetch scadenze usando l'endpoint riepilogo con filtro per ragione sociale
      const ragioneSociale = impresaData.success ? impresaData.data?.denominazione : '';
      if (ragioneSociale) {
        const scadenzeRes = await fetch(`${API_BASE_URL}/api/canone-unico/riepilogo?impresa_search=${encodeURIComponent(ragioneSociale)}`);
        const scadenzeData = await scadenzeRes.json();
        if (scadenzeData.success) {
          setScadenze(scadenzeData.data || []);
        }
      }
      
      // v3.53.0: Fetch sanzioni/verbali PM non pagati
      try {
        const sanzioniRes = await fetch(`${API_BASE_URL}/api/sanctions/impresa/${resolvedImpresaId}/da-pagare`);
        const sanzioniData = await sanzioniRes.json();
        if (sanzioniData.success) {
          setSanzioni(sanzioniData.data || []);
        }
      } catch (e) {
        console.error('Errore fetch sanzioni:', e);
      }
      
      // v3.54.1: Fetch sanzioni pagate per storico
      try {
        const sanzioniPagateRes = await fetch(`${API_BASE_URL}/api/sanctions?impresa_id=${resolvedImpresaId}&payment_status=PAGATO&limit=50`);
        const sanzioniPagateData = await sanzioniPagateRes.json();
        if (sanzioniPagateData.success) {
          // Calcola importo effettivo pagato per ogni sanzione
          const sanzioniConImporto = (sanzioniPagateData.data || []).map((s: SanzioneAPI) => {
            // Se reduced_amount è salvato, usalo; altrimenti calcola se pagato in ridotto
            let importoEffettivo = parseFloat(s.amount);
            let pagatoInRidotto = false;
            
            if (s.reduced_amount) {
              importoEffettivo = parseFloat(s.reduced_amount);
              pagatoInRidotto = true;
            } else if (s.paid_date && s.notified_at) {
              const paidDate = new Date(s.paid_date);
              const notifiedDate = new Date(s.notified_at);
              const diffDays = Math.floor((paidDate.getTime() - notifiedDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 5) {
                importoEffettivo = parseFloat(s.amount) * 0.7;
                pagatoInRidotto = true;
              }
            }
            
            return {
              ...s,
              importo_effettivo_pagato: importoEffettivo.toFixed(2),
              pagato_in_ridotto: pagatoInRidotto
            };
          });
          setSanzioniPagate(sanzioniConImporto);
        }
      } catch (e) {
        console.error('Errore fetch sanzioni pagate:', e);
      }
      
      // v3.73.1: Fetch transazioni per tutti i wallet (storico ricariche)
      const allWallets = [...spuntaWallets, ...concessionWallets];
      const allTransactions: any[] = [];
      for (const wallet of allWallets) {
        try {
          const txRes = await fetch(`${API_BASE_URL}/api/wallets/${wallet.id}/transactions`);
          const txData = await txRes.json();
          if (txData.success && txData.data) {
            allTransactions.push(...txData.data.map((tx: any) => ({
              ...tx,
              wallet_type: wallet.type,
              market_name: wallet.market_name
            })));
          }
        } catch (e) {
          console.error(`Errore fetch transazioni wallet ${wallet.id}:`, e);
        }
      }
      // Ordina per data decrescente
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Errore caricamento dati wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!impresaResolving) {
      fetchData();
    }
  }, [resolvedImpresaId, impresaResolving]);

  // Calcola totali
  const totaleSaldo = company ? 
    [...(company.spunta_wallets || []), ...(company.concession_wallets || [])]
      .reduce((sum, w) => sum + (w.balance || 0), 0) : 0;
  
  const scadenzeNonPagate = scadenze.filter(s => s.stato !== 'PAGATO');
  const totaleDaPagare = scadenzeNonPagate.reduce((sum, s) => {
    const importo = parseFloat(s.importo_dovuto) || 0;
    const mora = parseFloat(s.importo_mora) || 0;
    const interessi = parseFloat(s.importo_interessi) || 0;
    return sum + importo + mora + interessi;
  }, 0);
  
  // v3.53.0: Calcola totale sanzioni da pagare
  const totaleSanzioni = sanzioni.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  // Gestisce pagamento simulato
  const handlePaga = async (scadenza: ScadenzaAPI) => {
    setSelectedScadenza(scadenza);
    setShowPagamentoDialog(true);
  };
  
  // v3.53.0: Gestisce pagamento sanzione
  const handlePagaSanzione = (sanzione: SanzioneAPI) => {
    setSelectedSanzione(sanzione);
    setShowPagamentoSanzioneDialog(true);
  };
  
  // v3.53.0: Conferma pagamento sanzione
  const handleConfirmaPagamentoSanzione = async () => {
    if (!selectedSanzione) return;
    setIsProcessingSanzione(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      // Usa importo ridotto se nel periodo ridotto
      const importo = selectedSanzione.in_periodo_ridotto 
        ? parseFloat(selectedSanzione.importo_ridotto) 
        : parseFloat(selectedSanzione.amount);
      
      // Genera IUV simulato
      const iuv = `IUV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const response = await fetch(`${API_URL}/api/sanctions/${selectedSanzione.id}/paga-pagopa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importo_pagato: importo,
          pagopa_iuv: iuv,
          metodo_pagamento: 'PAGOPA'
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Pagamento sanzione completato! IUV: ${iuv}`);
        setShowPagamentoSanzioneDialog(false);
        setSelectedSanzione(null);
        fetchData(); // Ricarica dati
      } else {
        alert('Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      console.error('Errore pagamento sanzione:', err);
      alert('Errore di connessione');
    } finally {
      setIsProcessingSanzione(false);
    }
  };

  const handleConfirmaPagamento = async () => {
    if (!selectedScadenza) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const importoTotale = parseFloat(selectedScadenza.importo_dovuto) + parseFloat(selectedScadenza.importo_mora || '0') + parseFloat(selectedScadenza.importo_interessi || '0');
      const description = `Pagamento Canone ${selectedScadenza.tipo === 'CANONE_ANNUO' ? 'Annuo' : selectedScadenza.tipo} - Rata ${selectedScadenza.rata_numero}/${selectedScadenza.rata_totale} - ${selectedScadenza.mercato_nome} - Posteggio ${selectedScadenza.posteggio}`;
      
      // Usa l'endpoint corretto /api/wallets/deposit
      const response = await fetch(`${API_URL}/api/wallets/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: selectedScadenza.wallet_id,
          amount: importoTotale,
          description: description,
          scadenza_id: selectedScadenza.id
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Pagamento simulato completato!');
        setShowPagamentoDialog(false);
        fetchData();
      } else {
        alert('Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      console.error('Errore pagamento:', err);
      alert('Errore di connessione');
    }
  };

  // Gestisce apertura dialog ricarica wallet GENERICO
  const handleOpenRicarica = (wallet: WalletItem) => {
    setSelectedWalletRicarica(wallet);
    setRicaricaAmount('');
    setShowRicaricaDialog(true);
  };

  // Esegue ricarica wallet GENERICO
  const handleExecuteRicarica = async (mode: 'AVVISO' | 'PAGA_ORA') => {
    if (!selectedWalletRicarica || !ricaricaAmount) return;
    setIsProcessingRicarica(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const description = `Ricarica Wallet Generico - ${company?.ragione_sociale}`;
      
      const response = await fetch(`${API_URL}/api/wallets/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: selectedWalletRicarica.id,
          amount: parseFloat(ricaricaAmount),
          description
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(mode === 'AVVISO' ? "Avviso PagoPA generato con successo!" : "Ricarica effettuata con successo!");
        setShowRicaricaDialog(false);
        fetchData(); // Ricarica dati wallet
      } else {
        alert("Errore: " + data.error);
      }
    } catch (err) {
      console.error('Errore ricarica:', err);
      alert('Errore di connessione');
    } finally {
      setIsProcessingRicarica(false);
    }
  };

  // Colore stato wallet
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400';
      case 'BLOCKED': return 'bg-red-500/20 text-red-400';
      case 'LOW_BALANCE': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Colore stato scadenza
  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'PAGATO': return 'bg-green-500/20 text-green-400';
      case 'NON_PAGATO': return 'bg-yellow-500/20 text-yellow-400';
      case 'IN_MORA': return 'bg-red-500/20 text-red-400';
      case 'SCADUTO': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Se sta ancora risolvendo l'impresa, mostra loading
  if (impresaResolving) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-[#e8fbff] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-[#14b8a6] animate-spin" />
          <p className="mt-4 text-[#e8fbff]/70">Ricerca impresa associata...</p>
        </div>
      </div>
    );
  }

  // Se non c'è impresa_id dopo la risoluzione, mostra messaggio
  if (!resolvedImpresaId) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-[#e8fbff] flex items-center justify-center">
        <Card className="bg-[#1a2332] border-[#14b8a6]/20 max-w-md mx-2 sm:mx-auto">
          <CardContent className="p-4 sm:p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-xl font-bold mb-2">Nessuna impresa collegata</h2>
            <p className="text-[#e8fbff]/70 mb-4">
              Il tuo account non risulta associato a nessuna impresa.
              Contatta l'amministratore per collegare il tuo account all'impresa.
            </p>
            <Button onClick={() => setLocation('/')} className="bg-[#14b8a6] hover:bg-[#14b8a6]/80">
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e8fbff]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#0b1220] border-b border-[#14b8a6]/20 p-2 sm:p-4">
        <div className="w-full sm:px-2 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/')}
            className="text-[#e8fbff]/70 hover:text-[#e8fbff] px-1 sm:px-3"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Torna alla Home</span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#14b8a6]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#e8fbff]">Wallet Impresa</h1>
              <p className="text-sm text-[#e8fbff]/50">{company?.ragione_sociale || 'Caricamento...'}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10 px-2 sm:px-3"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Aggiorna</span>
          </Button>
        </div>
      </div>

      <div className="w-full px-0 sm:px-2 py-2 sm:py-4 space-y-3 sm:space-y-4">
        {/* Cards Riepilogo (v4.3.6 - card più larghe, font più grande, gap ridotto) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 sm:gap-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4 px-3 sm:px-6">
              <p className="text-sm sm:text-sm text-[#e8fbff]/50">Saldo Totale</p>
              <p className={`text-xl sm:text-2xl font-bold ${totaleSaldo >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                €{totaleSaldo.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4 px-3 sm:px-6">
              <p className="text-sm sm:text-sm text-[#e8fbff]/50">Wallet Spunta</p>
              <p className="text-xl sm:text-2xl font-bold text-[#14b8a6]">{company?.spunta_wallets?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4 px-3 sm:px-6">
              <p className="text-sm sm:text-sm text-[#e8fbff]/50">Concessioni</p>
              <p className="text-xl sm:text-2xl font-bold text-[#3b82f6]">{company?.concession_wallets?.length || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#14b8a6]/20 rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4 px-3 sm:px-6">
              <p className="text-sm sm:text-sm text-[#e8fbff]/50">Da Pagare</p>
              <p className="text-xl sm:text-2xl font-bold text-[#ef4444] truncate">€{totaleDaPagare.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1a2332] border border-[#14b8a6]/20 w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="wallet" className="data-[state=active]:bg-[#14b8a6]/20 text-xs sm:text-sm px-2 sm:px-3">
              <Wallet className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="scadenze" className="data-[state=active]:bg-[#14b8a6]/20 text-xs sm:text-sm px-2 sm:px-3">
              <Calendar className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Scadenze ({scadenzeNonPagate.length})</span>
            </TabsTrigger>
            <TabsTrigger value="storico" className="data-[state=active]:bg-[#14b8a6]/20 text-xs sm:text-sm px-2 sm:px-3">
              <Receipt className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Storico</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Wallet */}
          <TabsContent value="wallet" className="max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin pr-1">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20 overflow-hidden py-0 sm:py-6 gap-0 sm:gap-6 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="border-b border-[#14b8a6]/10 p-3 sm:p-6 px-3 sm:px-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#14b8a6] flex-shrink-0" />
                    <div className="min-w-0">
                      <CardTitle className="text-[#e8fbff] text-sm sm:text-base truncate">{company?.ragione_sociale}</CardTitle>
                      <CardDescription className="text-[#e8fbff]/50 text-xs">P.IVA: {company?.partita_iva}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant="outline" className="border-[#14b8a6]/30 text-[#14b8a6] text-[10px] sm:text-xs">
                      WALLET: {(company?.spunta_wallets?.length || 0) + (company?.concession_wallets?.length || 0)}
                    </Badge>
                    <p className={`text-sm sm:text-lg font-bold ${totaleSaldo >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      €{totaleSaldo.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-2 sm:px-6">
                {loading ? (
                  <div className="text-center py-8 text-[#e8fbff]/50">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    Caricamento...
                  </div>
                ) : (
                  <>
                    {/* Portafogli Spunta / Generici */}
                    <Collapsible open={expandedSpunta} onOpenChange={setExpandedSpunta}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20 hover:border-[#14b8a6]/40 transition-colors">
                        <div className="flex items-center gap-2 text-[#14b8a6]">
                          <Wallet className="w-4 h-4" />
                          <span className="font-medium">Portafogli Spunta ({company?.spunta_wallets?.length || 0})</span>
                        </div>
                        {expandedSpunta ? <ChevronUp className="w-4 h-4 text-[#e8fbff]/50" /> : <ChevronDown className="w-4 h-4 text-[#e8fbff]/50" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        {company?.spunta_wallets?.map((wallet) => (
                          <div key={wallet.id} className="p-4 bg-[#0b1220]/50 rounded-lg border border-[#14b8a6]/10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                {wallet.type === 'GENERICO' ? (
                                  <Badge className="bg-slate-600 text-white">GENERICO</Badge>
                                ) : (
                                  <Badge className="bg-[#14b8a6]/20 text-[#14b8a6]">{wallet.market_name}</Badge>
                                )}
                                <div>
                                  <p className="text-sm text-[#e8fbff]/50">ID Wallet: #{wallet.id}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-xs text-[#e8fbff]/50 uppercase">Saldo Wallet</p>
                                  <p className={`text-xl font-bold ${wallet.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                    €{wallet.balance.toFixed(2)}
                                  </p>
                                  <p className={`text-xs ${wallet.balance <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {wallet.balance <= 0 ? 'Da Ricaricare' : 'In Regola'}
                                  </p>
                                </div>
                                
                                {/* Pulsante Ricarica per wallet GENERICO */}
                                {wallet.type === 'GENERICO' && (
                                  <Button 
                                    variant="outline"
                                    className="border-[#14b8a6]/30 hover:bg-[#14b8a6]/10 text-[#e8fbff] gap-2"
                                    onClick={() => handleOpenRicarica(wallet)}
                                  >
                                    <Plus className="h-4 w-4" /> Ricarica
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!company?.spunta_wallets || company.spunta_wallets.length === 0) && (
                          <p className="text-center py-4 text-[#e8fbff]/50">Nessun portafoglio spunta</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Concessioni Attive */}
                    <Collapsible open={expandedConcessioni} onOpenChange={setExpandedConcessioni}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/20 hover:border-[#3b82f6]/40 transition-colors">
                        <div className="flex items-center gap-2 text-[#3b82f6]">
                          <Store className="w-4 h-4" />
                          <span className="font-medium">Concessioni Attive ({company?.concession_wallets?.length || 0})</span>
                        </div>
                        {expandedConcessioni ? <ChevronUp className="w-4 h-4 text-[#e8fbff]/50" /> : <ChevronDown className="w-4 h-4 text-[#e8fbff]/50" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        {company?.concession_wallets?.map((wallet) => (
                          <div key={wallet.id} className="p-3 sm:p-4 bg-[#0b1220]/50 rounded-lg border border-[#3b82f6]/10">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <Badge className="bg-[#3b82f6]/20 text-[#3b82f6] text-[10px] sm:text-xs mb-1">{wallet.market_name}</Badge>
                                <p className="font-medium text-[#e8fbff] text-sm sm:text-base">Posteggio {wallet.stall_number}</p>
                                <p className="text-xs sm:text-sm text-[#e8fbff]/50">Area: {wallet.stall_area} mq</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[10px] sm:text-xs text-[#e8fbff]/50 uppercase">Saldo Wallet</p>
                                <p className={`text-base sm:text-xl font-bold ${wallet.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                  €{wallet.balance.toFixed(2)}
                                </p>
                                <div className="flex items-center gap-1 justify-end">
                                  <Badge className={`${getStatusColor(wallet.status)} text-[10px] sm:text-xs`}>{wallet.status}</Badge>
                                </div>
                                <p className={`text-[10px] sm:text-xs ${wallet.balance <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                  {wallet.balance <= 0 ? 'Da Ricaricare' : 'In Regola'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!company?.concession_wallets || company.concession_wallets.length === 0) && (
                          <p className="text-center py-4 text-[#e8fbff]/50">Nessuna concessione attiva</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Scadenze */}
          <TabsContent value="scadenze" className="max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin pr-1">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 sm:py-6 gap-0 sm:gap-6 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#14b8a6]" />
                  Scadenze da Pagare
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {scadenzeNonPagate.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-[#10b981]" />
                    <p className="text-[#e8fbff]/70">Nessuna scadenza da pagare</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scadenzeNonPagate.map((scadenza) => (
                      <div key={scadenza.id} className="p-3 sm:p-4 bg-[#0b1220] rounded-lg border border-[#14b8a6]/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#e8fbff]">{scadenza.mercato_nome}</p>
                            <p className="text-sm text-[#e8fbff]/50">
                              Posteggio {scadenza.posteggio} • Rata {scadenza.rata_numero}/{scadenza.rata_totale}
                            </p>
                            <p className="text-xs text-[#e8fbff]/30">
                              Scadenza: {new Date(scadenza.data_scadenza).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatoColor(scadenza.stato_dinamico || scadenza.stato)}>
                              {scadenza.stato_dinamico || scadenza.stato}
                            </Badge>
                            <p className="text-lg font-bold text-[#e8fbff]">
                              €{(parseFloat(scadenza.importo_dovuto) + parseFloat(scadenza.importo_mora || '0')).toFixed(2)}
                            </p>
                            {parseFloat(scadenza.importo_mora) > 0 && (
                              <p className="text-xs text-red-400">
                                +€{parseFloat(scadenza.importo_mora).toFixed(2)} mora
                              </p>
                            )}
                            <Button 
                              size="sm" 
                              className="mt-2 bg-[#14b8a6] hover:bg-[#14b8a6]/80"
                              onClick={() => handlePaga(scadenza)}
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              Paga
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* v3.53.0: Sezione Sanzioni/Verbali PM */}
            {sanzioni.length > 0 && (
              <Card className="bg-[#1a2332] border-[#f59e0b]/20 mt-4 py-0 sm:py-6 gap-0 sm:gap-6 rounded-none sm:rounded-xl border-x-0 sm:border-x">
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
                    Sanzioni/Verbali PM da Pagare
                    <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] ml-2">{sanzioni.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-[#e8fbff]/50">
                    Verbali di contestazione emessi dalla Polizia Municipale
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <div className="space-y-3">
                    {sanzioni.map((sanzione) => (
                      <div key={sanzione.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#f59e0b]/20 overflow-hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-[#e8fbff] truncate">{sanzione.verbale_code}</p>
                              {sanzione.in_periodo_ridotto && (
                                <Badge className="bg-green-500/20 text-green-400 text-xs">
                                  Sconto 30%
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-[#e8fbff]/50 break-words line-clamp-2">
                              {(sanzione.infraction_description || sanzione.infraction_code || '').replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-[#e8fbff]/30">
                              Scadenza: {new Date(sanzione.due_date).toLocaleDateString('it-IT')}
                              {sanzione.comune_nome && ` · ${sanzione.comune_nome}`}
                            </p>
                            {sanzione.in_periodo_ridotto && sanzione.giorni_ridotto_rimanenti > 0 && (
                              <p className="text-xs text-green-400 mt-1">
                                ⚡ Paga entro {sanzione.giorni_ridotto_rimanenti} giorni per lo sconto!
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge className="bg-[#f59e0b]/20 text-[#f59e0b]">
                              {sanzione.payment_status}
                            </Badge>
                            {sanzione.in_periodo_ridotto ? (
                              <>
                                <p className="text-lg font-bold text-green-400">
                                  €{parseFloat(sanzione.importo_ridotto).toFixed(2)}
                                </p>
                                <p className="text-xs text-[#e8fbff]/30 line-through">
                                  €{parseFloat(sanzione.amount).toFixed(2)}
                                </p>
                              </>
                            ) : (
                              <p className="text-lg font-bold text-[#e8fbff]">
                                €{parseFloat(sanzione.amount).toFixed(2)}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                                onClick={() => window.open(`https://api.mio-hub.me/api/verbali/${sanzione.id}/pdf`, '_blank')}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black"
                                onClick={() => handlePagaSanzione(sanzione)}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Paga
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Totale Sanzioni */}
                  <div className="mt-4 p-3 bg-[#f59e0b]/10 rounded-lg border border-[#f59e0b]/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[#e8fbff]/70">Totale Sanzioni da Pagare:</span>
                      <span className="text-xl font-bold text-[#f59e0b]">€{totaleSanzioni.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Storico */}
          <TabsContent value="storico" className="max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-thin pr-1">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20 py-0 sm:py-6 gap-0 sm:gap-6 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#14b8a6]" />
                  Storico Movimenti
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {scadenze.filter(s => s.stato === 'PAGATO').length === 0 && transactions.length === 0 && sanzioniPagate.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 mx-auto mb-4 text-[#e8fbff]/30" />
                    <p className="text-[#e8fbff]/50">Nessun movimento effettuato</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* v3.73.1: Ricariche Wallet - Solo wallet SPUNTISTA/GENERICO, non CONCESSION */}
                    {transactions.filter(tx => tx.type === 'DEPOSIT' && tx.wallet_type === 'GENERICO').map((tx) => (
                      <div key={`tx-${tx.id}`} className="p-4 bg-[#0b1220] rounded-lg border border-blue-500/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#e8fbff]">
                              <Plus className="w-4 h-4 inline mr-1 text-blue-400" />
                              Ricarica Wallet {tx.wallet_type === 'GENERICO' ? 'Generico' : tx.market_name || 'Spunta'}
                            </p>
                            <p className="text-sm text-[#e8fbff]/50">
                              {tx.description || 'Ricarica PagoPA'}
                            </p>
                            <p className="text-xs text-[#e8fbff]/30">
                              {new Date(tx.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-blue-500/20 text-blue-400">RICARICA</Badge>
                            <p className="text-lg font-bold text-blue-400">
                              +€{parseFloat(tx.amount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Pagamenti Canone */}
                    {scadenze.filter(s => s.stato === 'PAGATO').map((scadenza) => (
                      <div key={scadenza.id} className="p-4 bg-[#0b1220] rounded-lg border border-green-500/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-[#e8fbff]">{scadenza.mercato_nome}</p>
                            <p className="text-sm text-[#e8fbff]/50">
                              Posteggio {scadenza.posteggio} • Rata {scadenza.rata_numero}/{scadenza.rata_totale}
                            </p>
                            <p className="text-xs text-[#e8fbff]/30">
                              Pagato il: {scadenza.data_pagamento ? new Date(scadenza.data_pagamento).toLocaleDateString('it-IT') : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-500/20 text-green-400">PAGATO</Badge>
                            <p className="text-lg font-bold text-green-400">
                              €{parseFloat(scadenza.importo_pagato || scadenza.importo_dovuto).toFixed(2)}
                            </p>
                            {scadenza.pagato_in_mora && (
                              <p className="text-xs text-red-400">Pagato in mora</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* v3.54.1: Sanzioni/Verbali PM Pagati */}
                    {sanzioniPagate.map((sanzione) => (
                      <div key={`sanzione-${sanzione.id}`} className="p-4 bg-[#0b1220] rounded-lg border border-red-500/10 overflow-hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#e8fbff] truncate">
                              <AlertTriangle className="w-4 h-4 inline mr-1 text-red-400" />
                              Verbale {sanzione.verbale_code}
                            </p>
                            <p className="text-sm text-[#e8fbff]/50 break-words line-clamp-2">
                              {sanzione.infraction_description || sanzione.infraction_code}
                            </p>
                            <p className="text-xs text-[#e8fbff]/30">
                              Pagato il: {sanzione.paid_date ? new Date(sanzione.paid_date).toLocaleDateString('it-IT') : 'N/A'}
                            </p>
                            {/* Pulsante PDF verbale */}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="mt-2 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
                              onClick={() => window.open(`https://api.mio-hub.me/api/verbali/${sanzione.id}/pdf`, '_blank')}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Vedi Verbale
                            </Button>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge className="bg-red-500/20 text-red-400">SANZIONE</Badge>
                            <p className="text-lg font-bold text-red-400">
                              €{sanzione.importo_effettivo_pagato || parseFloat(sanzione.amount).toFixed(2)}
                            </p>
                            {sanzione.pagato_in_ridotto && (
                              <p className="text-xs text-green-400">Sconto 30% applicato</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Pagamento Scadenza (v4.3.5b - fix aggressivo mobile overflow) */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent className="bg-[#1a2332] border-[#14b8a6]/20 text-[#e8fbff] w-[calc(100vw-2rem)] sm:max-w-lg mx-auto p-3 sm:p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#14b8a6] flex-shrink-0" />
              Pagamento Canone
            </DialogTitle>
            <DialogDescription className="text-[#e8fbff]/70 text-xs sm:text-sm truncate">
              {selectedScadenza?.mercato_nome} - Post. {selectedScadenza?.posteggio}
            </DialogDescription>
          </DialogHeader>
          
          {selectedScadenza && (
            <div className="space-y-3 sm:space-y-4 overflow-hidden">
              <div className="bg-[#0b1220] p-2.5 sm:p-4 rounded-lg overflow-hidden">
                <div className="flex justify-between mb-2 text-xs sm:text-base">
                  <span className="text-[#e8fbff]/70">Rata {selectedScadenza.rata_numero}/{selectedScadenza.rata_totale}</span>
                  <span className="text-[#e8fbff]">€{parseFloat(selectedScadenza.importo_dovuto).toFixed(2)}</span>
                </div>
                {parseFloat(selectedScadenza.importo_mora) > 0 && (
                  <div className="flex justify-between mb-2 text-red-400 text-xs sm:text-base">
                    <span>Mora ({selectedScadenza.giorni_ritardo_calc} gg)</span>
                    <span>+€{parseFloat(selectedScadenza.importo_mora).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(selectedScadenza.importo_interessi) > 0 && (
                  <div className="flex justify-between mb-2 text-red-400 text-xs sm:text-base">
                    <span>Interessi</span>
                    <span>+€{parseFloat(selectedScadenza.importo_interessi).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-[#14b8a6]/20 pt-2 mt-2 flex justify-between font-bold text-sm sm:text-lg">
                  <span>TOTALE</span>
                  <span className="text-[#14b8a6]">
                    €{(parseFloat(selectedScadenza.importo_dovuto) + parseFloat(selectedScadenza.importo_mora || '0') + parseFloat(selectedScadenza.importo_interessi || '0')).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <Button variant="outline" onClick={() => setShowPagamentoDialog(false)} className="border-[#14b8a6]/30 text-xs sm:text-sm w-full sm:w-auto">
                  Annulla
                </Button>
                <Button onClick={handleConfirmaPagamento} className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-xs sm:text-sm w-full sm:w-auto">
                  <CreditCard className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  Paga Ora
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* v3.53.0: Dialog Pagamento Sanzione */}
      <Dialog open={showPagamentoSanzioneDialog} onOpenChange={setShowPagamentoSanzioneDialog}>
        <DialogContent className="bg-[#1a2332] border-[#f59e0b]/20 text-[#e8fbff] w-[calc(100vw-2rem)] sm:max-w-lg mx-auto p-3 sm:p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#f59e0b] flex-shrink-0" />
              Pagamento Sanzione
            </DialogTitle>
            <DialogDescription className="text-[#e8fbff]/70 text-xs sm:text-sm">
              Verbale {selectedSanzione?.verbale_code}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSanzione && (
            <div className="space-y-3 sm:space-y-4 overflow-hidden">
              <div className="bg-[#0b1220] p-2.5 sm:p-4 rounded-lg overflow-hidden">
                <p className="text-sm text-[#e8fbff]/70 mb-2">
                  {selectedSanzione.infraction_description || selectedSanzione.infraction_code}
                </p>
                
                {selectedSanzione.in_periodo_ridotto ? (
                  <>
                    <div className="flex justify-between mb-2">
                      <span className="text-[#e8fbff]/70">Importo Originale</span>
                      <span className="text-[#e8fbff]/50 line-through">€{parseFloat(selectedSanzione.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-green-400">
                      <span>Sconto 30% (pagamento entro 5gg)</span>
                      <span>-€{(parseFloat(selectedSanzione.amount) * 0.3).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#f59e0b]/20 pt-2 mt-2 flex justify-between font-bold text-lg">
                      <span>TOTALE DA PAGARE</span>
                      <span className="text-green-400">€{parseFloat(selectedSanzione.importo_ridotto).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-green-400 mt-2">
                      ⚡ Hai ancora {selectedSanzione.giorni_ridotto_rimanenti} giorni per usufruire dello sconto!
                    </p>
                  </>
                ) : (
                  <div className="border-t border-[#f59e0b]/20 pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>TOTALE DA PAGARE</span>
                    <span className="text-[#f59e0b]">€{parseFloat(selectedSanzione.amount).toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <Button variant="outline" onClick={() => setShowPagamentoSanzioneDialog(false)} className="border-[#f59e0b]/30 text-xs sm:text-sm w-full sm:w-auto">
                  Annulla
                </Button>
                <Button 
                  onClick={handleConfirmaPagamentoSanzione} 
                  className="bg-[#f59e0b] hover:bg-[#f59e0b]/80 text-black text-xs sm:text-sm w-full sm:w-auto"
                  disabled={isProcessingSanzione}
                >
                  {isProcessingSanzione ? (
                    <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  )}
                  Paga Ora
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Ricarica Wallet GENERICO */}
      <Dialog open={showRicaricaDialog} onOpenChange={setShowRicaricaDialog}>
        <DialogContent className="bg-[#1a2332] border-[#14b8a6]/20 text-[#e8fbff] max-w-[95vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#14b8a6]" />
              Ricarica Wallet Generico
            </DialogTitle>
            <DialogDescription className="text-[#e8fbff]/70">
              {company?.ragione_sociale} - Borsellino Ricaricabile
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[#e8fbff]/70">Importo da Ricaricare (€)</Label>
              <Input 
                type="number" 
                value={ricaricaAmount}
                onChange={(e) => setRicaricaAmount(e.target.value)}
                className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff] text-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="border-[#14b8a6]/30 text-[#e8fbff]/70 hover:bg-[#14b8a6]/10"
              onClick={() => handleExecuteRicarica('AVVISO')}
              disabled={isProcessingRicarica || !ricaricaAmount}
            >
              {isProcessingRicarica ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Genera Avviso PagoPA
            </Button>
            <Button 
              className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
              onClick={() => handleExecuteRicarica('PAGA_ORA')}
              disabled={isProcessingRicarica || !ricaricaAmount}
            >
              {isProcessingRicarica ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Paga Ora (Simulazione)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
