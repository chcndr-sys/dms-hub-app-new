import { useState, useEffect } from 'react';
import { 
  Wallet, Euro, AlertTriangle, XCircle, CheckCircle, Clock,
  Search, ArrowUpRight, ArrowDownRight, FileText, Briefcase,
  Building2, Calendar, User, CreditCard, RefreshCw, Download,
  Plus, Filter, Eye, Edit, Trash2, Send, Bell, AlertCircle,
  ExternalLink, Copy, Loader2, QrCode, ChevronDown, ChevronUp,
  Store, History as HistoryIcon
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
  spunta_wallet?: WalletItem;
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
  const [subTab, setSubTab] = useState<'wallet' | 'pagopa' | 'riconciliazione'>('wallet');
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
            acc[row.company_id].spunta_wallet = wallet;
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
        if (c.spunta_wallet) walletIds.push(c.spunta_wallet.id);
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

  // --- FILTRI ---
  const filteredCompanies = companies.filter(c => 
    c.ragione_sociale.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.partita_iva.includes(searchQuery)
  );

  return (
    <div className="space-y-6 p-6 bg-[#0f172a] min-h-screen text-slate-100">
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
        <div className="flex gap-3">
          <Button 
            variant={subTab === 'wallet' ? 'default' : 'outline'}
            onClick={() => setSubTab('wallet')}
            className={subTab === 'wallet' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}
          >
            <Wallet className="mr-2 h-4 w-4" /> Wallet
          </Button>
          <Button 
            variant={subTab === 'pagopa' ? 'default' : 'outline'}
            onClick={() => setSubTab('pagopa')}
            className={subTab === 'pagopa' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}
          >
            <CreditCard className="mr-2 h-4 w-4" /> Storico PagoPA
          </Button>
          <Button 
            variant={subTab === 'riconciliazione' ? 'default' : 'outline'}
            onClick={() => setSubTab('riconciliazione')}
            className={subTab === 'riconciliazione' ? 'bg-[#3b82f6]' : 'border-slate-700 text-slate-300'}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Riconciliazione
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
                      
                      {/* Wallet Spunta (Sempre Visibile) */}
                      {company.spunta_wallet ? (
                        <div className="text-right">
                          <p className="text-xs text-slate-400 uppercase font-bold">Credito Spunta</p>
                          <p className={`text-xl font-bold ${company.spunta_wallet.balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            € {company.spunta_wallet.balance.toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                          Wallet Spunta Non Attivo
                        </Badge>
                      )}
                      
                      {company.spunta_wallet && (
                        <Button 
                          size="sm" 
                          className="bg-[#3b82f6] hover:bg-[#2563eb] ml-4"
                          onClick={() => handleOpenDeposit(company.spunta_wallet!, company.ragione_sociale)}
                        >
                          <Plus className="h-4 w-4" /> Ricarica
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4">
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full flex justify-between items-center text-slate-300 hover:text-white hover:bg-slate-800">
                          <span className="flex items-center gap-2">
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

                              <Button 
                                variant="outline" 
                                className="border-slate-600 hover:bg-slate-700 text-slate-200"
                                onClick={() => handleOpenDeposit(wallet, company.ragione_sociale)}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Paga Canone
                              </Button>
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
    </div>
  );
}
