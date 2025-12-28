import { useState, useEffect } from 'react';
import { 
  Wallet, Euro, AlertTriangle, XCircle, CheckCircle, Clock,
  Search, ArrowUpRight, ArrowDownRight, FileText, Briefcase,
  Building2, Calendar, User, CreditCard, RefreshCw, Download,
  Plus, Filter, Eye, Edit, Trash2, Send, Bell, AlertCircle,
  ExternalLink, Copy, Loader2, QrCode
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
import { trpc } from '@/lib/trpc';

// Tipi per il sistema Wallet
interface WalletOperatore {
  id: number;
  impresaId: number;
  ragioneSociale: string;
  partitaIva: string;
  saldo: number;
  stato: 'ATTIVO' | 'SALDO_BASSO' | 'BLOCCATO';
  ultimoAggiornamento: string;
  tipoPosteggio: string;
  numeroPosteggio: string;
  tariffaGiornaliera: number;
  mercato: string;
}

interface WalletTransazione {
  id: number;
  impresaId: number;
  tipo: 'RICARICA' | 'DECURTAZIONE' | 'RIMBORSO';
  importo: number;
  data: string;
  riferimento: string;
  descrizione: string;
  saldoPrecedente: number;
  saldoSuccessivo: number;
}

interface TariffaPosteggio {
  id: number;
  tipoPosteggio: string;
  tariffaGiornaliera: number;
  descrizione: string;
}

interface AvvisoPagoPA {
  id: number;
  iuv: string;
  codiceAvviso?: string;
  impresaId: number;
  ragioneSociale: string;
  importo: number;
  dataEmissione: string;
  dataScadenza: string;
  stato: 'EMESSO' | 'PAGATO' | 'SCADUTO' | 'ANNULLATO';
  causale: string;
  redirectUrl?: string;
}

// Genera IUV mock realistico (solo per UI, il backend lo genererà davvero)
const generateMockIUV = () => {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.random().toString().slice(2, 9);
  return `RF${timestamp}${random}`;
};

// Genera codice avviso mock
const generateMockCodiceAvviso = () => {
  const aux = '3'; // Cifra ausiliaria
  const codiceIUV = Math.random().toString().slice(2, 19).padEnd(17, '0');
  return `${aux}${codiceIUV}`;
};

export default function WalletPanel() {
  const [subTab, setSubTab] = useState<'wallet' | 'pagopa' | 'tariffe' | 'riconciliazione'>('wallet');
  const [wallets, setWallets] = useState<WalletOperatore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Wallets from Real API
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
        const response = await fetch(`${API_URL}/api/wallets`);
        const data = await response.json();
        if (data.success) {
          // Mappa i dati dal DB al formato UI
          const mappedWallets = data.data.map((w: any) => ({
            id: w.id,
            impresaId: w.company_id,
            ragioneSociale: w.ragione_sociale || 'Impresa Sconosciuta',
            partitaIva: w.partita_iva || 'N/A',
            saldo: parseFloat(w.balance),
            stato: parseFloat(w.balance) > 0 ? 'ATTIVO' : 'BLOCCATO', // Logica semplificata
            ultimoAggiornamento: w.updated_at,
            tipoPosteggio: 'Generico', // Da arricchire
            numeroPosteggio: 'N/A',
            tariffaGiornaliera: 0,
            mercato: 'Mercato Test'
          }));
          setWallets(mappedWallets);
        } else {
          setError("Errore nel caricamento dei dati: " + (data.message || "Errore sconosciuto"));
        }
      } catch (error) {
        console.error("Errore fetch wallets:", error);
        setError("Impossibile connettersi al server. Verifica la connessione.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWallets();
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletOperatore | null>(null);
  const [filterStato, setFilterStato] = useState<string>('tutti');
  const [filterMercato, setFilterMercato] = useState<string>('tutti');
  
  // Stati per dialog ricarica
  const [showRicaricaDialog, setShowRicaricaDialog] = useState(false);
  const [ricaricaImporto, setRicaricaImporto] = useState('');
  const [isGeneratingAvviso, setIsGeneratingAvviso] = useState(false);
  const [generatedAvviso, setGeneratedAvviso] = useState<AvvisoPagoPA | null>(null);
  
  // Stati per dialog pagamento immediato
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false);
  const [pagamentoImporto, setPagamentoImporto] = useState('');
  const [isProcessingPagamento, setIsProcessingPagamento] = useState(false);
  
  // Stati per notifiche
  const [showNotificaDialog, setShowNotificaDialog] = useState(false);
  
  // Stati per avvisi PagoPA
  const [avvisiPagoPA, setAvvisiPagoPA] = useState<AvvisoPagoPA[]>([]);

  // Filtra wallet in base a ricerca e filtri
  const filteredWallets = wallets.filter(wallet => {
    const matchesSearch = 
      wallet.ragioneSociale.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wallet.partitaIva.includes(searchQuery) ||
      wallet.numeroPosteggio.includes(searchQuery);
    
    const matchesStato = filterStato === 'tutti' || wallet.stato === filterStato;
    const matchesMercato = filterMercato === 'tutti' || wallet.mercato === filterMercato;
    
    return matchesSearch && matchesStato && matchesMercato;
  });

  // Calcola statistiche
  const stats = {
    totaleWallet: wallets.length,
    walletAttivi: wallets.filter(w => w.stato === 'ATTIVO').length,
    walletSaldoBasso: wallets.filter(w => w.stato === 'SALDO_BASSO').length,
    walletBloccati: wallets.filter(w => w.stato === 'BLOCCATO').length,
    saldoTotale: wallets.reduce((sum, w) => sum + w.saldo, 0),
    avvisiInAttesa: avvisiPagoPA.filter(a => a.stato === 'EMESSO').length,
    avvisiPagati: avvisiPagoPA.filter(a => a.stato === 'PAGATO').length,
    avvisiScaduti: avvisiPagoPA.filter(a => a.stato === 'SCADUTO').length,
    totaleIncassato: avvisiPagoPA.filter(a => a.stato === 'PAGATO').reduce((sum, a) => sum + a.importo, 0)
  };

  // Ottieni transazioni per wallet selezionato
  const getTransazioniWallet = (impresaId: number) => {
    // TODO: Fetch real transactions from API
    return [];
  };

  // Calcola giorni coperti dal saldo
  const calcolaGiorniCoperti = (saldo: number, tariffaGiornaliera: number) => {
    if (tariffaGiornaliera === 0) return 0;
    return Math.floor(saldo / tariffaGiornaliera);
  };

  // Ottieni colore stato
  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'ATTIVO': return 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30';
      case 'SALDO_BASSO': return 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30';
      case 'BLOCCATO': return 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  // Ottieni colore avviso PagoPA
  const getAvvisoColor = (stato: string) => {
    switch (stato) {
      case 'PAGATO': return 'border-[#10b981]/30';
      case 'EMESSO': return 'border-[#f59e0b]/30';
      case 'SCADUTO': return 'border-[#ef4444]/30';
      case 'ANNULLATO': return 'border-gray-500/30';
      default: return 'border-gray-500/30';
    }
  };

  // Lista mercati unici
  const mercatiUnici = [...new Set(wallets.map(w => w.mercato))];

  // Genera avviso PagoPA (mock che simula chiamata API E-FIL)
  const handleGeneraAvviso = async () => {
    if (!selectedWallet || !ricaricaImporto) return;
    
    setIsGeneratingAvviso(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const response = await fetch(`${API_URL}/api/wallets/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: selectedWallet.impresaId,
          amount: parseFloat(ricaricaImporto),
          description: `Ricarica PagoPA - ${selectedWallet.ragioneSociale}`
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Aggiorna il saldo locale
        setWallets(prev => prev.map(w => {
          if (w.id === selectedWallet.id) {
            return { ...w, saldo: parseFloat(data.new_balance) };
          }
          return w;
        }));
        
        // Chiudi dialog e resetta
        setShowRicaricaDialog(false);
        setRicaricaImporto('');
        alert("Ricarica effettuata con successo!");
      } else {
        alert("Errore durante la ricarica: " + data.message);
      }
    } catch (error) {
      console.error("Errore ricarica:", error);
      alert("Errore di connessione durante la ricarica.");
    } finally {
      setIsGeneratingAvviso(false);
    }
  };

  // Avvia pagamento immediato (mock che simula redirect a checkout PagoPA)
  const handlePagamentoImmediato = async () => {
    // Implementazione simile a handleGeneraAvviso ma con logica di pagamento immediato
    // Per ora usiamo la stessa logica di deposito per semplicità
    await handleGeneraAvviso();
  };

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
            Gestione borsellini digitali, ricariche e riconciliazione incassi
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="mr-2 h-4 w-4" />
            Export Dati
          </Button>
          <Button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizza PagoPA
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1e293b] border-slate-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Saldo Totale Wallet</p>
                <h3 className="text-2xl font-bold text-white mt-2">€ {stats.saldoTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-2 bg-[#3b82f6]/20 rounded-lg">
                <Euro className="h-6 w-6 text-[#3b82f6]" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-slate-400">
              <span className="text-[#10b981] flex items-center mr-2">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                +12.5%
              </span>
              rispetto al mese scorso
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Wallet Attivi</p>
                <h3 className="text-2xl font-bold text-white mt-2">{stats.walletAttivi} <span className="text-sm text-slate-500 font-normal">/ {stats.totaleWallet}</span></h3>
              </div>
              <div className="p-2 bg-[#10b981]/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-[#10b981]" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-slate-400">
              <span className="text-slate-300 font-medium mr-2">{stats.walletBloccati}</span>
              bloccati per credito insufficiente
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Incassato Mese</p>
                <h3 className="text-2xl font-bold text-white mt-2">€ {stats.totaleIncassato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-2 bg-[#8b5cf6]/20 rounded-lg">
                <CreditCard className="h-6 w-6 text-[#8b5cf6]" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-slate-400">
              <span className="text-slate-300 font-medium mr-2">{stats.avvisiPagati}</span>
              transazioni PagoPA confermate
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e293b] border-slate-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-400">Avvisi in Scadenza</p>
                <h3 className="text-2xl font-bold text-white mt-2">{stats.avvisiInAttesa}</h3>
              </div>
              <div className="p-2 bg-[#f59e0b]/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-[#f59e0b]" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-slate-400">
              <span className="text-[#ef4444] font-medium mr-2">{stats.avvisiScaduti}</span>
              avvisi già scaduti
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setSubTab('wallet')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'wallet' 
              ? 'border-[#3b82f6] text-[#3b82f6]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Wallet Operatori
        </button>
        <button
          onClick={() => setSubTab('pagopa')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'pagopa' 
              ? 'border-[#3b82f6] text-[#3b82f6]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          PagoPA
        </button>
        <button
          onClick={() => setSubTab('tariffe')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'tariffe' 
              ? 'border-[#3b82f6] text-[#3b82f6]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tariffe
        </button>
        <button
          onClick={() => setSubTab('riconciliazione')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'riconciliazione' 
              ? 'border-[#3b82f6] text-[#3b82f6]' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Riconciliazione
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
            <span className="ml-2 text-slate-400">Caricamento dati wallet...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 text-center">
            <AlertCircle className="h-12 w-12 text-[#ef4444] mb-4" />
            <h3 className="text-xl font-bold text-white">Errore di caricamento</h3>
            <p className="text-slate-400 mt-2">{error}</p>
            <Button 
              className="mt-4 bg-[#3b82f6] hover:bg-[#2563eb]"
              onClick={() => window.location.reload()}
            >
              Riprova
            </Button>
          </div>
        ) : subTab === 'wallet' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-[#1e293b] p-4 rounded-lg border border-slate-700">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Cerca per ragione sociale, P.IVA o posteggio..." 
                  className="pl-10 bg-[#0f172a] border-slate-700 text-white w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Select value={filterStato} onValueChange={setFilterStato}>
                  <SelectTrigger className="w-[180px] bg-[#0f172a] border-slate-700 text-white">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                    <SelectItem value="tutti">Tutti gli stati</SelectItem>
                    <SelectItem value="ATTIVO">Attivo</SelectItem>
                    <SelectItem value="SALDO_BASSO">Saldo Basso</SelectItem>
                    <SelectItem value="BLOCCATO">Bloccato</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterMercato} onValueChange={setFilterMercato}>
                  <SelectTrigger className="w-[220px] bg-[#0f172a] border-slate-700 text-white">
                    <SelectValue placeholder="Mercato" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-slate-700 text-white">
                    <SelectItem value="tutti">Tutti i mercati</SelectItem>
                    {mercatiUnici.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Wallets List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredWallets.length === 0 ? (
                <div className="text-center py-12 bg-[#1e293b] rounded-lg border border-slate-700">
                  <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white">Nessun wallet trovato</h3>
                  <p className="text-slate-400 mt-2">Prova a modificare i filtri di ricerca</p>
                </div>
              ) : (
                filteredWallets.map((wallet) => (
                  <Card key={wallet.id} className="bg-[#1e293b] border-slate-700 hover:border-[#3b82f6]/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        {/* Info Impresa */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">{wallet.ragioneSociale}</h3>
                            <Badge className={getStatoColor(wallet.stato)}>
                              {wallet.stato.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm text-slate-400">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              P.IVA: {wallet.partitaIva}
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {wallet.mercato}
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Posteggio: {wallet.numeroPosteggio} ({wallet.tipoPosteggio})
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Aggiornato: {new Date(wallet.ultimoAggiornamento).toLocaleString('it-IT')}
                            </div>
                          </div>
                        </div>

                        {/* Saldo e Azioni */}
                        <div className="flex flex-col md:flex-row items-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-700 pt-4 lg:pt-0 lg:pl-6">
                          <div className="text-center md:text-right min-w-[150px]">
                            <p className="text-sm text-slate-400 mb-1">Saldo Disponibile</p>
                            <h2 className={`text-3xl font-bold ${wallet.saldo < 0 ? 'text-[#ef4444]' : 'text-white'}`}>
                              € {wallet.saldo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                              Copertura stimata: {calcolaGiorniCoperti(wallet.saldo, wallet.tariffaGiornaliera)} presenze
                            </p>
                          </div>
                          
                          <div className="flex flex-col gap-2 w-full md:w-auto">
                            <Dialog open={showRicaricaDialog && selectedWallet?.id === wallet.id} onOpenChange={(open) => {
                              setShowRicaricaDialog(open);
                              if (!open) setSelectedWallet(null);
                              else setSelectedWallet(wallet);
                            }}>
                              <DialogTrigger asChild>
                                <Button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white w-full">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Ricarica Wallet
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-[#1e293b] border-slate-700 text-white">
                                <DialogHeader>
                                  <DialogTitle>Ricarica Wallet</DialogTitle>
                                  <DialogDescription className="text-slate-400">
                                    Genera un avviso PagoPA o effettua un pagamento immediato per ricaricare il wallet di {wallet.ragioneSociale}.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Importo Ricarica (€)</Label>
                                    <Input 
                                      type="number" 
                                      placeholder="0.00" 
                                      className="bg-[#0f172a] border-slate-700 text-white"
                                      value={ricaricaImporto}
                                      onChange={(e) => setRicaricaImporto(e.target.value)}
                                    />
                                  </div>
                                  <div className="p-4 bg-[#0f172a] rounded-lg border border-slate-700">
                                    <h4 className="text-sm font-medium text-slate-300 mb-2">Riepilogo</h4>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-slate-400">Saldo attuale:</span>
                                      <span className="text-white">€ {wallet.saldo.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold">
                                      <span className="text-slate-400">Nuovo saldo stimato:</span>
                                      <span className="text-[#10b981]">€ {(wallet.saldo + (parseFloat(ricaricaImporto) || 0)).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter className="flex-col sm:flex-row gap-2">
                                  <Button 
                                    variant="outline" 
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                    onClick={() => handleGeneraAvviso()}
                                    disabled={isGeneratingAvviso || !ricaricaImporto}
                                  >
                                    {isGeneratingAvviso ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                    Genera Avviso
                                  </Button>
                                  <Button 
                                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                                    onClick={() => handlePagamentoImmediato()}
                                    disabled={isProcessingPagamento || !ricaricaImporto}
                                  >
                                    {isProcessingPagamento ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                                    Paga Ora
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full">
                              <FileText className="mr-2 h-4 w-4" />
                              Storico Movimenti
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {subTab === 'pagopa' && (
          <div className="text-center py-12 bg-[#1e293b] rounded-lg border border-slate-700">
            <CreditCard className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">Sezione PagoPA in sviluppo</h3>
            <p className="text-slate-400 mt-2">Qui verranno visualizzati tutti gli avvisi PagoPA generati e il loro stato.</p>
          </div>
        )}

        {subTab === 'tariffe' && (
          <div className="text-center py-12 bg-[#1e293b] rounded-lg border border-slate-700">
            <Euro className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">Gestione Tariffe</h3>
            <p className="text-slate-400 mt-2">Configurazione delle tariffe per mercato e tipologia di posteggio.</p>
          </div>
        )}

        {subTab === 'riconciliazione' && (
          <div className="text-center py-12 bg-[#1e293b] rounded-lg border border-slate-700">
            <RefreshCw className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">Riconciliazione Incassi</h3>
            <p className="text-slate-400 mt-2">Strumenti per la riconciliazione automatica dei flussi PagoPA.</p>
          </div>
        )}
      </div>
    </div>
  );
}
