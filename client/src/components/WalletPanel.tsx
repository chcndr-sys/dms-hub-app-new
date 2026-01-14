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
  const [subTab, setSubTab] = useState<'wallet' | 'pagopa' | 'riconciliazione' | 'storico' | 'canone'>('wallet');
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  
  // Stati per Canone Unico
  const [canoneScadenze, setCanoneScadenze] = useState<any[]>([]);
  const [isLoadingCanone, setIsLoadingCanone] = useState(false);
  const [canoneFilters, setCanoneFilters] = useState({ mercato_id: 'all', tipo_operatore: 'all', impresa_search: '', stato: 'all' });
  const [showGeneraCanoneDialog, setShowGeneraCanoneDialog] = useState(false);
  const [showPagamentoStraordinarioDialog, setShowPagamentoStraordinarioDialog] = useState(false);
  const [canoneAnno, setCanoneAnno] = useState(new Date().getFullYear().toString());
  const [canoneDataScadenza, setCanoneDataScadenza] = useState('');
  const [straordinarioDescrizione, setStraordinarioDescrizione] = useState('');
  const [straordinarioImporto, setStraordinarioImporto] = useState('');
  const [straordinarioMercatoId, setStraordinarioMercatoId] = useState('');
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

  // --- FETCH DATA ---
  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/wallets`);
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
  const fetchCanoneScadenze = async () => {
    setIsLoadingCanone(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const params = new URLSearchParams();
      if (canoneFilters.mercato_id && canoneFilters.mercato_id !== 'all') params.append('mercato_id', canoneFilters.mercato_id);
      if (canoneFilters.tipo_operatore && canoneFilters.tipo_operatore !== 'all') params.append('tipo_operatore', canoneFilters.tipo_operatore);
      if (canoneFilters.impresa_search) params.append('impresa_search', canoneFilters.impresa_search);
      if (canoneFilters.stato && canoneFilters.stato !== 'all') params.append('stato', canoneFilters.stato);
      
      const response = await fetch(`${API_URL}/api/canone-unico/riepilogo?${params.toString()}`);
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

  const handleGeneraCanoneAnnuo = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/genera-canone-annuo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anno: parseInt(canoneAnno),
          data_scadenza: canoneDataScadenza || `${canoneAnno}-03-31`
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Generate ${data.scadenze_create} scadenze per l'anno ${canoneAnno}`);
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

  const handleGeneraPagamentoStraordinario = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/canone-unico/genera-pagamento-straordinario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mercato_id: parseInt(straordinarioMercatoId),
          descrizione: straordinarioDescrizione,
          importo: parseFloat(straordinarioImporto),
          data_scadenza: canoneDataScadenza
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Generati ${data.scadenze_create} avvisi di pagamento straordinario`);
        setShowPagamentoStraordinarioDialog(false);
        fetchCanoneScadenze();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (err) {
      console.error('Errore generazione pagamento straordinario:', err);
      alert('Errore di connessione');
    }
  };

  useEffect(() => {
    if (subTab === 'canone') {
      fetchCanoneScadenze();
      fetchMercatiList();
    }
  }, [subTab, canoneFilters]);

  // --- LISTA IMPRESE/CONCESSIONI (v3.36.0) ---
  const fetchMercatiList = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/markets`);
      const data = await response.json();
      if (data.success && data.data) {
        setMercatiList(data.data.map((m: any) => ({ id: m.id, name: m.name })));
      }
    } catch (err) {
      console.error('Errore caricamento mercati:', err);
    }
  };

  const fetchImpreseConcessioni = async (marketId: string) => {
    if (!marketId) return;
    setIsLoadingImprese(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const params = new URLSearchParams({ market_id: marketId });
      if (impreseSearch) params.append('search', impreseSearch);
      
      const response = await fetch(`${API_URL}/api/canone-unico/imprese-concessioni?${params.toString()}`);
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

  useEffect(() => {
    if (selectedMercatoId) {
      fetchImpreseConcessioni(selectedMercatoId);
    }
  }, [selectedMercatoId, impreseSearch]);

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
      const response = await fetch(`${API_URL}/api/wallet-history`);
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

  // --- ACTIONS ---

  const handleOpenDeposit = async (wallet: WalletItem, companyName: string) => {
    setSelectedWallet(wallet);
    setSelectedCompany(companyName);
    setDepositAmount('');
    setAnnualFeeData(null);
    setShowDepositDialog(true);

    // Se NON è SPUNTA, assumiamo sia CONCESSIONE (logica più robusta)
    if (wallet.type !== 'SPUNTA') {
      setIsCalculating(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
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
      } catch (err) {
        console.error(err);
      } finally {
        setIsCalculating(false);
      }
    }
  };

  const handleExecuteDeposit = async (mode: 'AVVISO' | 'PAGA_ORA') => {
    if (!selectedWallet || !depositAmount) return;
    setIsProcessing(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const res = await fetch(`${API_URL}/api/wallets/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: selectedWallet.id,
          amount: parseFloat(depositAmount),
          description: selectedWallet.type !== 'SPUNTA' 
            ? `Pagamento Canone Annuo - ${selectedWallet.market_name} - Posteggio ${selectedWallet.stall_number}`
            : `Ricarica Credito Spunta`
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(mode === 'AVVISO' ? "Avviso PagoPA generato con successo!" : "Pagamento effettuato con successo!");
        setShowDepositDialog(false);
        fetchWallets(); // Ricarica dati
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

  // --- FILTRI ---
  const filteredCompanies = companies.filter(c => 
    c.ragione_sociale.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.partita_iva.includes(searchQuery)
  );

  return (
    <div className="space-y-6 p-6 bg-[#0f172a] min-h-screen text-slate-100 border border-green-500/30 rounded-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wallet className="h-8 w-8 text-[#3b82f6]" />
            Wallet Operatori & PagoPA
          </h1>
          <p className="text-slate-400 mt-1">
            Gestione borsellini digitali: Spunta (ricaricabile) e Concessioni (canone annuo)
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600">
          <Button 
            size="sm"
            variant={subTab === 'wallet' ? 'default' : 'outline'}
            onClick={() => setSubTab('wallet')}
            className={subTab === 'wallet' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}
          >
            <Wallet className="mr-1 h-4 w-4" /> Wallet
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'pagopa' ? 'default' : 'outline'}
            onClick={() => setSubTab('pagopa')}
            className={subTab === 'pagopa' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}
          >
            <CreditCard className="mr-1 h-4 w-4" /> PagoPA
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'riconciliazione' ? 'default' : 'outline'}
            onClick={() => setSubTab('riconciliazione')}
            className={subTab === 'riconciliazione' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Riconc.
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'storico' ? 'default' : 'outline'}
            onClick={() => setSubTab('storico')}
            className={subTab === 'storico' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}
          >
            <HistoryIcon className="mr-1 h-4 w-4" /> Storico
          </Button>
          <Button 
            size="sm"
            variant={subTab === 'canone' ? 'default' : 'outline'}
            onClick={() => setSubTab('canone')}
            className={subTab === 'canone' ? 'bg-[#f59e0b]' : 'border-slate-700 text-slate-300'}
          >
            <Euro className="mr-1 h-4 w-4" /> Canone
          </Button>
        </div>
      </div>

      {/* Content */}
      {subTab === 'wallet' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cerca impresa per Ragione Sociale o P.IVA..." 
              className="pl-10 bg-[#1e293b] border-slate-700 text-white w-full md:w-96"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
                <div className="w-[150px]">
                  <Label className="text-slate-400 text-sm">Tipo Operatore</Label>
                  <Select value={canoneFilters.tipo_operatore} onValueChange={(v) => setCanoneFilters({...canoneFilters, tipo_operatore: v})}>
                    <SelectTrigger className="bg-[#0f172a] border-slate-700 text-white">
                      <SelectValue placeholder="Tutti" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-slate-700">
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="CONCESSIONE">Concessionari</SelectItem>
                      <SelectItem value="SPUNTA">Spuntisti</SelectItem>
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
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">ANNO</th>
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
                          <td className="px-4 py-3 text-slate-300">{s.anno_riferimento}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {s.data_scadenza ? new Date(s.data_scadenza).toLocaleDateString('it-IT') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {s.giorni_ritardo > 0 ? (
                              <Badge className={`${s.giorni_ritardo > 30 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {s.giorni_ritardo} giorni
                              </Badge>
                            ) : (
                              <span className="text-green-400">In regola</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-white">€ {Number(s.importo_dovuto || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-red-400">
                            {(Number(s.importo_mora || 0) + Number(s.importo_interessi || 0)) > 0 
                              ? `€ ${(Number(s.importo_mora || 0) + Number(s.importo_interessi || 0)).toFixed(2)}` 
                              : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${
                              s.stato === 'PAGATO' ? 'bg-green-500/20 text-green-400' :
                              s.stato === 'IN_MORA' ? 'bg-red-500/20 text-red-400' :
                              'bg-amber-500/20 text-amber-400'
                            }`}>
                              {s.stato || 'NON_PAGATO'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-8">
                                <Eye className="h-3 w-3" />
                              </Button>
                              {s.concessione_status !== 'SOSPESA' ? (
                                <Button size="sm" variant="outline" className="border-red-600 text-red-400 h-8" title="Blocca Concessione">
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="border-green-600 text-green-400 h-8" title="Sblocca Concessione">
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
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

          {/* Lista Imprese/Concessioni (v3.36.0) */}
          <Card className="bg-[#1e293b] border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Lista Imprese per Mercato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtri Lista Imprese */}
              <div className="flex flex-wrap gap-4 items-end mb-6">
                <div className="w-[250px]">
                  <Label className="text-slate-400 text-sm">Seleziona Mercato</Label>
                  <Select value={selectedMercatoId} onValueChange={(v) => setSelectedMercatoId(v)}>
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
                      key={`${impresa.impresa_id}-${impresa.concessione_id}`} 
                      className="bg-[#0f172a] border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-medium">{impresa.denominazione}</h4>
                          <p className="text-sm text-slate-400">P.IVA: {impresa.partita_iva || 'N/A'}</p>
                        </div>
                        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 h-8">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Badge Concessione/Posteggio */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Badge Concessione */}
                        <span className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-md ${
                          impresa.badge_color === 'red' 
                            ? 'text-red-400 bg-red-400/10 border border-red-400/20' 
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
                      </div>

                      {/* Info Scadenze */}
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
            <div>
              <Label className="text-slate-300">Anno</Label>
              <Input 
                type="number" 
                value={canoneAnno} 
                onChange={(e) => setCanoneAnno(e.target.value)}
                className="bg-[#0f172a] border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Data Scadenza (default: 31 marzo)</Label>
              <Input 
                type="date" 
                value={canoneDataScadenza} 
                onChange={(e) => setCanoneDataScadenza(e.target.value)}
                className="bg-[#0f172a] border-slate-700 text-white"
              />
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
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Pagamento Straordinario</DialogTitle>
            <DialogDescription className="text-slate-400">
              Genera avvisi di pagamento per fiere o eventi straordinari
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-slate-300">ID Mercato</Label>
              <Input 
                type="number" 
                value={straordinarioMercatoId} 
                onChange={(e) => setStraordinarioMercatoId(e.target.value)}
                placeholder="Es: 1"
                className="bg-[#0f172a] border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Descrizione Evento</Label>
              <Input 
                value={straordinarioDescrizione} 
                onChange={(e) => setStraordinarioDescrizione(e.target.value)}
                placeholder="Es: Fiera di Natale 2026"
                className="bg-[#0f172a] border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Importo (€)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={straordinarioImporto} 
                onChange={(e) => setStraordinarioImporto(e.target.value)}
                placeholder="Es: 150.00"
                className="bg-[#0f172a] border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Data Scadenza</Label>
              <Input 
                type="date" 
                value={canoneDataScadenza} 
                onChange={(e) => setCanoneDataScadenza(e.target.value)}
                className="bg-[#0f172a] border-slate-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoStraordinarioDialog(false)} className="border-slate-600">
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
              {selectedWallet?.type !== 'SPUNTA' ? 'Pagamento Canone Concessione' : 'Ricarica Credito Spunta'}
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
                </div>
              ) : (
                <p className="text-red-400 text-center">Impossibile calcolare il canone. Dati mancanti (Area, Tariffa o Giorni).</p>
              )
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
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
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
    </div>
  );
}
