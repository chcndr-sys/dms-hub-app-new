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

// Mock data per il wallet
const mockWallets: WalletOperatore[] = [
  {
    id: 1,
    impresaId: 101,
    ragioneSociale: 'Alimentari Rossi & C.',
    partitaIva: '04567890123',
    saldo: 850.00,
    stato: 'ATTIVO',
    ultimoAggiornamento: '2025-12-22T10:30:00',
    tipoPosteggio: 'Alimentare',
    numeroPosteggio: '45',
    tariffaGiornaliera: 25.00,
    mercato: 'Mercato Centrale Grosseto'
  },
  {
    id: 2,
    impresaId: 102,
    ragioneSociale: 'Bio Market Italia',
    partitaIva: '06789012345',
    saldo: 45.00,
    stato: 'SALDO_BASSO',
    ultimoAggiornamento: '2025-12-22T09:15:00',
    tipoPosteggio: 'Alimentare Bio',
    numeroPosteggio: '78',
    tariffaGiornaliera: 30.00,
    mercato: 'Mercato Follonica Mare'
  },
  {
    id: 3,
    impresaId: 103,
    ragioneSociale: 'Calzature Neri',
    partitaIva: '45678901234',
    saldo: 0.00,
    stato: 'BLOCCATO',
    ultimoAggiornamento: '2025-12-21T16:45:00',
    tipoPosteggio: 'Non Alimentare',
    numeroPosteggio: '23',
    tariffaGiornaliera: 20.00,
    mercato: 'Mercato Centrale Grosseto'
  },
  {
    id: 4,
    impresaId: 104,
    ragioneSociale: 'Frutta e Verdura Rossi',
    partitaIva: '12345678901',
    saldo: 1250.00,
    stato: 'ATTIVO',
    ultimoAggiornamento: '2025-12-22T08:00:00',
    tipoPosteggio: 'Alimentare',
    numeroPosteggio: '12',
    tariffaGiornaliera: 25.00,
    mercato: 'Mercato Orbetello Centro'
  },
  {
    id: 5,
    impresaId: 105,
    ragioneSociale: 'Abbigliamento Verdi',
    partitaIva: '98765432101',
    saldo: 15.00,
    stato: 'BLOCCATO',
    ultimoAggiornamento: '2025-12-20T14:30:00',
    tipoPosteggio: 'Non Alimentare',
    numeroPosteggio: '56',
    tariffaGiornaliera: 20.00,
    mercato: 'Mercato Castiglione'
  },
  {
    id: 6,
    impresaId: 106,
    ragioneSociale: 'Formaggi Toscani DOP',
    partitaIva: '11223344556',
    saldo: 520.00,
    stato: 'ATTIVO',
    ultimoAggiornamento: '2025-12-22T11:00:00',
    tipoPosteggio: 'Alimentare',
    numeroPosteggio: '33',
    tariffaGiornaliera: 25.00,
    mercato: 'Mercato Centrale Grosseto'
  },
  {
    id: 7,
    impresaId: 107,
    ragioneSociale: 'Macelleria Bianchi',
    partitaIva: '55667788990',
    saldo: 65.00,
    stato: 'SALDO_BASSO',
    ultimoAggiornamento: '2025-12-22T07:30:00',
    tipoPosteggio: 'Alimentare',
    numeroPosteggio: '67',
    tariffaGiornaliera: 25.00,
    mercato: 'Mercato Follonica Mare'
  },
  {
    id: 8,
    impresaId: 108,
    ragioneSociale: 'Fiori e Piante Gialli',
    partitaIva: '99887766554',
    saldo: 180.00,
    stato: 'ATTIVO',
    ultimoAggiornamento: '2025-12-21T18:00:00',
    tipoPosteggio: 'Florovivaistico',
    numeroPosteggio: '89',
    tariffaGiornaliera: 15.00,
    mercato: 'Mercato Marina di Grosseto'
  }
];

const mockTransazioni: WalletTransazione[] = [
  {
    id: 1,
    impresaId: 101,
    tipo: 'RICARICA',
    importo: 500.00,
    data: '2025-12-20T14:30:00',
    riferimento: 'IUV-0123456789012345678',
    descrizione: 'Ricarica tramite PagoPA',
    saldoPrecedente: 375.00,
    saldoSuccessivo: 875.00
  },
  {
    id: 2,
    impresaId: 101,
    tipo: 'DECURTAZIONE',
    importo: 25.00,
    data: '2025-12-21T08:15:00',
    riferimento: 'PRES-2025-12-21-45',
    descrizione: 'Presenza mercato 21/12/2025',
    saldoPrecedente: 875.00,
    saldoSuccessivo: 850.00
  },
  {
    id: 3,
    impresaId: 102,
    tipo: 'DECURTAZIONE',
    importo: 30.00,
    data: '2025-12-22T08:00:00',
    riferimento: 'PRES-2025-12-22-78',
    descrizione: 'Presenza mercato 22/12/2025',
    saldoPrecedente: 75.00,
    saldoSuccessivo: 45.00
  },
  {
    id: 4,
    impresaId: 104,
    tipo: 'RICARICA',
    importo: 1000.00,
    data: '2025-12-18T10:00:00',
    riferimento: 'IUV-9876543210987654321',
    descrizione: 'Ricarica tramite PagoPA',
    saldoPrecedente: 350.00,
    saldoSuccessivo: 1350.00
  },
  {
    id: 5,
    impresaId: 104,
    tipo: 'DECURTAZIONE',
    importo: 25.00,
    data: '2025-12-19T08:10:00',
    riferimento: 'PRES-2025-12-19-12',
    descrizione: 'Presenza mercato 19/12/2025',
    saldoPrecedente: 1350.00,
    saldoSuccessivo: 1325.00
  }
];

const mockTariffe: TariffaPosteggio[] = [
  { id: 1, tipoPosteggio: 'Alimentare', tariffaGiornaliera: 25.00, descrizione: 'Posteggio per vendita prodotti alimentari' },
  { id: 2, tipoPosteggio: 'Alimentare Bio', tariffaGiornaliera: 30.00, descrizione: 'Posteggio per vendita prodotti biologici certificati' },
  { id: 3, tipoPosteggio: 'Non Alimentare', tariffaGiornaliera: 20.00, descrizione: 'Posteggio per vendita prodotti non alimentari' },
  { id: 4, tipoPosteggio: 'Florovivaistico', tariffaGiornaliera: 15.00, descrizione: 'Posteggio per vendita fiori e piante' },
  { id: 5, tipoPosteggio: 'Produttore Agricolo', tariffaGiornaliera: 18.00, descrizione: 'Posteggio riservato a produttori agricoli diretti' }
];

// Genera IUV mock realistico
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
  const [avvisiPagoPA, setAvvisiPagoPA] = useState<AvvisoPagoPA[]>([
    {
      id: 1,
      iuv: '0123456789012345678',
      codiceAvviso: '301234567890123456',
      impresaId: 101,
      ragioneSociale: 'Alimentari Rossi & C.',
      importo: 500.00,
      dataEmissione: '2025-12-18',
      dataScadenza: '2025-12-28',
      stato: 'PAGATO',
      causale: 'Ricarica Wallet Operatore Mercatale'
    },
    {
      id: 2,
      iuv: '0123456789012345679',
      codiceAvviso: '301234567890123457',
      impresaId: 102,
      ragioneSociale: 'Bio Market Italia',
      importo: 300.00,
      dataEmissione: '2025-12-20',
      dataScadenza: '2025-12-30',
      stato: 'EMESSO',
      causale: 'Ricarica Wallet Operatore Mercatale'
    },
    {
      id: 3,
      iuv: '0123456789012345680',
      codiceAvviso: '301234567890123458',
      impresaId: 103,
      ragioneSociale: 'Calzature Neri',
      importo: 200.00,
      dataEmissione: '2025-12-05',
      dataScadenza: '2025-12-15',
      stato: 'SCADUTO',
      causale: 'Ricarica Wallet Operatore Mercatale'
    },
    {
      id: 4,
      iuv: '9876543210987654321',
      codiceAvviso: '309876543210987654',
      impresaId: 104,
      ragioneSociale: 'Frutta e Verdura Rossi',
      importo: 1000.00,
      dataEmissione: '2025-12-15',
      dataScadenza: '2025-12-25',
      stato: 'PAGATO',
      causale: 'Ricarica Wallet Operatore Mercatale'
    }
  ]);

  // Filtra wallet in base a ricerca e filtri
  const filteredWallets = mockWallets.filter(wallet => {
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
    totaleWallet: mockWallets.length,
    walletAttivi: mockWallets.filter(w => w.stato === 'ATTIVO').length,
    walletSaldoBasso: mockWallets.filter(w => w.stato === 'SALDO_BASSO').length,
    walletBloccati: mockWallets.filter(w => w.stato === 'BLOCCATO').length,
    saldoTotale: mockWallets.reduce((sum, w) => sum + w.saldo, 0),
    avvisiInAttesa: avvisiPagoPA.filter(a => a.stato === 'EMESSO').length,
    avvisiPagati: avvisiPagoPA.filter(a => a.stato === 'PAGATO').length,
    avvisiScaduti: avvisiPagoPA.filter(a => a.stato === 'SCADUTO').length,
    totaleIncassato: avvisiPagoPA.filter(a => a.stato === 'PAGATO').reduce((sum, a) => sum + a.importo, 0)
  };

  // Ottieni transazioni per wallet selezionato
  const getTransazioniWallet = (impresaId: number) => {
    return mockTransazioni.filter(t => t.impresaId === impresaId).sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  };

  // Calcola giorni coperti dal saldo
  const calcolaGiorniCoperti = (saldo: number, tariffaGiornaliera: number) => {
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
  const mercatiUnici = [...new Set(mockWallets.map(w => w.mercato))];

  // Genera avviso PagoPA (mock che simula chiamata API E-FIL)
  const handleGeneraAvviso = async () => {
    if (!selectedWallet || !ricaricaImporto) return;
    
    setIsGeneratingAvviso(true);
    
    // Simula chiamata API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const importoNum = parseFloat(ricaricaImporto);
    const iuv = generateMockIUV();
    const codiceAvviso = generateMockCodiceAvviso();
    const oggi = new Date();
    const scadenza = new Date(oggi);
    scadenza.setDate(scadenza.getDate() + 30);
    
    const nuovoAvviso: AvvisoPagoPA = {
      id: avvisiPagoPA.length + 1,
      iuv,
      codiceAvviso,
      impresaId: selectedWallet.impresaId,
      ragioneSociale: selectedWallet.ragioneSociale,
      importo: importoNum,
      dataEmissione: oggi.toISOString().split('T')[0],
      dataScadenza: scadenza.toISOString().split('T')[0],
      stato: 'EMESSO',
      causale: `Ricarica Wallet Operatore Mercatale - ${selectedWallet.ragioneSociale}`
    };
    
    setAvvisiPagoPA(prev => [nuovoAvviso, ...prev]);
    setGeneratedAvviso(nuovoAvviso);
    setIsGeneratingAvviso(false);
  };

  // Avvia pagamento immediato (mock che simula redirect a checkout PagoPA)
  const handlePagamentoImmediato = async () => {
    if (!selectedWallet || !pagamentoImporto) return;
    
    setIsProcessingPagamento(true);
    
    // Simula chiamata API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const importoNum = parseFloat(pagamentoImporto);
    const iuv = generateMockIUV();
    const codiceAvviso = generateMockCodiceAvviso();
    const oggi = new Date();
    const scadenza = new Date(oggi);
    scadenza.setDate(scadenza.getDate() + 1);
    
    // URL checkout mock (in produzione sarebbe l'URL E-FIL)
    const checkoutUrl = `https://checkout.pagopa.it/pay/${codiceAvviso}?amount=${importoNum * 100}`;
    
    const nuovoAvviso: AvvisoPagoPA = {
      id: avvisiPagoPA.length + 1,
      iuv,
      codiceAvviso,
      impresaId: selectedWallet.impresaId,
      ragioneSociale: selectedWallet.ragioneSociale,
      importo: importoNum,
      dataEmissione: oggi.toISOString().split('T')[0],
      dataScadenza: scadenza.toISOString().split('T')[0],
      stato: 'EMESSO',
      causale: `Ricarica Wallet - Pagamento Immediato - ${selectedWallet.ragioneSociale}`,
      redirectUrl: checkoutUrl
    };
    
    setAvvisiPagoPA(prev => [nuovoAvviso, ...prev]);
    setIsProcessingPagamento(false);
    setShowPagamentoDialog(false);
    setPagamentoImporto('');
    
    // Apri checkout in nuova finestra
    window.open(checkoutUrl, '_blank');
  };

  // Copia negli appunti
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Reset dialog ricarica
  const resetRicaricaDialog = () => {
    setShowRicaricaDialog(false);
    setRicaricaImporto('');
    setGeneratedAvviso(null);
  };

  return (
    <div className="space-y-6">
      {/* Sotto-tab */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={subTab === 'wallet' ? 'default' : 'outline'}
          onClick={() => setSubTab('wallet')}
          className={subTab === 'wallet' ? 'bg-[#3b82f6] text-white' : 'border-[#3b82f6]/30 text-[#e8fbff]/70'}
        >
          <Wallet className="h-4 w-4 mr-2" />
          Wallet Operatori
        </Button>
        <Button
          variant={subTab === 'pagopa' ? 'default' : 'outline'}
          onClick={() => setSubTab('pagopa')}
          className={subTab === 'pagopa' ? 'bg-[#10b981] text-white' : 'border-[#10b981]/30 text-[#e8fbff]/70'}
        >
          <Euro className="h-4 w-4 mr-2" />
          PagoPA
        </Button>
        <Button
          variant={subTab === 'tariffe' ? 'default' : 'outline'}
          onClick={() => setSubTab('tariffe')}
          className={subTab === 'tariffe' ? 'bg-[#8b5cf6] text-white' : 'border-[#8b5cf6]/30 text-[#e8fbff]/70'}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Tariffe
        </Button>
        <Button
          variant={subTab === 'riconciliazione' ? 'default' : 'outline'}
          onClick={() => setSubTab('riconciliazione')}
          className={subTab === 'riconciliazione' ? 'bg-[#f59e0b] text-white' : 'border-[#f59e0b]/30 text-[#e8fbff]/70'}
        >
          <FileText className="h-4 w-4 mr-2" />
          Riconciliazione
        </Button>
      </div>

      {/* SOTTO-TAB: WALLET OPERATORI */}
      {subTab === 'wallet' && (
        <>
          {/* Statistiche Wallet */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Wallet className="h-8 w-8 text-[#3b82f6]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Totale Wallet</p>
                    <p className="text-2xl font-bold text-[#3b82f6]">{stats.totaleWallet}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-[#10b981]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Attivi</p>
                    <p className="text-2xl font-bold text-[#10b981]">{stats.walletAttivi}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#f59e0b]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-[#f59e0b]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Saldo Basso</p>
                    <p className="text-2xl font-bold text-[#f59e0b]">{stats.walletSaldoBasso}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-[#ef4444]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Bloccati</p>
                    <p className="text-2xl font-bold text-[#ef4444]">{stats.walletBloccati}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Euro className="h-8 w-8 text-[#10b981]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Saldo Totale</p>
                    <p className="text-2xl font-bold text-[#10b981]">€ {stats.saldoTotale.toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtri e Ricerca */}
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#e8fbff]/50" />
                    <Input
                      placeholder="Cerca per ragione sociale, P.IVA o posteggio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[#0b1220] border-[#3b82f6]/30 text-[#e8fbff]"
                    />
                  </div>
                </div>
                <Select value={filterStato} onValueChange={setFilterStato}>
                  <SelectTrigger className="w-[180px] bg-[#0b1220] border-[#3b82f6]/30 text-[#e8fbff]">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-[#3b82f6]/30">
                    <SelectItem value="tutti">Tutti gli stati</SelectItem>
                    <SelectItem value="ATTIVO">Attivo</SelectItem>
                    <SelectItem value="SALDO_BASSO">Saldo Basso</SelectItem>
                    <SelectItem value="BLOCCATO">Bloccato</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterMercato} onValueChange={setFilterMercato}>
                  <SelectTrigger className="w-[220px] bg-[#0b1220] border-[#3b82f6]/30 text-[#e8fbff]">
                    <SelectValue placeholder="Mercato" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-[#3b82f6]/30">
                    <SelectItem value="tutti">Tutti i mercati</SelectItem>
                    {mercatiUnici.map(mercato => (
                      <SelectItem key={mercato} value={mercato}>{mercato}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lista Wallet e Dettaglio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista Wallet */}
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#3b82f6]" />
                  Wallet Operatori ({filteredWallets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredWallets.map(wallet => (
                    <div 
                      key={wallet.id}
                      className={`p-3 bg-[#0b1220] rounded-lg border cursor-pointer transition-all ${
                        selectedWallet?.id === wallet.id 
                          ? 'border-[#3b82f6] ring-1 ring-[#3b82f6]' 
                          : 'border-[#3b82f6]/20 hover:border-[#3b82f6]/50'
                      }`}
                      onClick={() => setSelectedWallet(wallet)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-[#e8fbff] font-medium">{wallet.ragioneSociale}</p>
                          <p className="text-xs text-[#e8fbff]/50">
                            Post. {wallet.numeroPosteggio} • {wallet.mercato}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            wallet.stato === 'ATTIVO' ? 'text-[#10b981]' :
                            wallet.stato === 'SALDO_BASSO' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                          }`}>
                            € {wallet.saldo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${getStatoColor(wallet.stato)}`}>
                            {wallet.stato.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredWallets.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-[#e8fbff]/30 mx-auto mb-4" />
                      <p className="text-[#e8fbff]/50">Nessun wallet trovato</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dettaglio Wallet Selezionato */}
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-[#3b82f6]" />
                  {selectedWallet ? 'Dettaglio Wallet' : 'Seleziona un operatore'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedWallet ? (
                  <div className="space-y-4">
                    {/* Info Operatore */}
                    <div className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/30">
                      <h4 className="text-[#e8fbff] font-semibold mb-3">{selectedWallet.ragioneSociale}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-[#e8fbff]/70">P.IVA:</p>
                        <p className="text-[#e8fbff]">{selectedWallet.partitaIva}</p>
                        <p className="text-[#e8fbff]/70">Posteggio:</p>
                        <p className="text-[#e8fbff]">{selectedWallet.numeroPosteggio} - {selectedWallet.tipoPosteggio}</p>
                        <p className="text-[#e8fbff]/70">Mercato:</p>
                        <p className="text-[#e8fbff]">{selectedWallet.mercato}</p>
                        <p className="text-[#e8fbff]/70">Tariffa giornaliera:</p>
                        <p className="text-[#e8fbff]">€ {selectedWallet.tariffaGiornaliera.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Saldo e Azioni */}
                    <div className={`p-4 bg-[#0b1220] rounded-lg border ${getStatoColor(selectedWallet.stato).split(' ')[2]}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-[#e8fbff]/70">Saldo Attuale</p>
                          <p className={`text-3xl font-bold ${
                            selectedWallet.stato === 'ATTIVO' ? 'text-[#10b981]' :
                            selectedWallet.stato === 'SALDO_BASSO' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                          }`}>
                            € {selectedWallet.saldo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#e8fbff]/70">Giorni coperti</p>
                          <p className="text-2xl font-bold text-[#3b82f6]">
                            {calcolaGiorniCoperti(selectedWallet.saldo, selectedWallet.tariffaGiornaliera)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Pulsanti Azione */}
                      <div className="flex gap-2 flex-wrap">
                        {/* Dialog Genera Avviso PagoPA */}
                        <Dialog open={showRicaricaDialog} onOpenChange={(open) => {
                          if (!open) resetRicaricaDialog();
                          else setShowRicaricaDialog(true);
                        }}>
                          <DialogTrigger asChild>
                            <Button className="flex-1 bg-[#10b981] hover:bg-[#10b981]/80">
                              <FileText className="h-4 w-4 mr-2" />
                              Genera Avviso
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#1a2332] border-[#3b82f6]/30 max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-[#e8fbff]">
                                {generatedAvviso ? '✅ Avviso Generato' : 'Genera Avviso PagoPA'}
                              </DialogTitle>
                              <DialogDescription className="text-[#e8fbff]/70">
                                {generatedAvviso 
                                  ? 'Avviso di pagamento generato con successo'
                                  : `Genera un avviso di pagamento PagoPA per ${selectedWallet.ragioneSociale}`
                                }
                              </DialogDescription>
                            </DialogHeader>
                            
                            {!generatedAvviso ? (
                              <>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label className="text-[#e8fbff]">Importo ricarica (€)</Label>
                                    <Input
                                      type="number"
                                      placeholder="Es. 500.00"
                                      value={ricaricaImporto}
                                      onChange={(e) => setRicaricaImporto(e.target.value)}
                                      className="bg-[#0b1220] border-[#3b82f6]/30 text-[#e8fbff] text-lg"
                                      min="1"
                                      step="0.01"
                                    />
                                  </div>
                                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/30">
                                    <p className="text-sm text-[#e8fbff]/70 mb-2">Importi suggeriti:</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {[50, 100, 250, 500, 1000].map(importo => (
                                        <Button
                                          key={importo}
                                          size="sm"
                                          variant="outline"
                                          className={`border-[#3b82f6]/30 ${
                                            ricaricaImporto === importo.toString() 
                                              ? 'bg-[#3b82f6] text-white' 
                                              : 'text-[#e8fbff]'
                                          }`}
                                          onClick={() => setRicaricaImporto(importo.toString())}
                                        >
                                          € {importo}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  {ricaricaImporto && (
                                    <div className="p-3 bg-[#10b981]/10 rounded-lg border border-[#10b981]/30">
                                      <p className="text-sm text-[#10b981]">
                                        Nuovo saldo dopo ricarica: <strong>€ {(selectedWallet.saldo + parseFloat(ricaricaImporto || '0')).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong>
                                      </p>
                                      <p className="text-xs text-[#10b981]/70 mt-1">
                                        Giorni coperti: {calcolaGiorniCoperti(selectedWallet.saldo + parseFloat(ricaricaImporto || '0'), selectedWallet.tariffaGiornaliera)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <DialogFooter>
                                  <Button 
                                    variant="outline" 
                                    onClick={resetRicaricaDialog} 
                                    className="border-[#3b82f6]/30 text-[#e8fbff]"
                                  >
                                    Annulla
                                  </Button>
                                  <Button 
                                    className="bg-[#10b981] hover:bg-[#10b981]/80" 
                                    onClick={handleGeneraAvviso}
                                    disabled={!ricaricaImporto || parseFloat(ricaricaImporto) <= 0 || isGeneratingAvviso}
                                  >
                                    {isGeneratingAvviso ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generazione...
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Genera Avviso
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </>
                            ) : (
                              <>
                                <div className="space-y-4 py-4">
                                  {/* Riepilogo Avviso Generato */}
                                  <div className="p-4 bg-[#10b981]/10 rounded-lg border border-[#10b981]/30">
                                    <div className="flex items-center gap-2 mb-3">
                                      <CheckCircle className="h-5 w-5 text-[#10b981]" />
                                      <span className="text-[#10b981] font-semibold">Avviso PagoPA Generato</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[#e8fbff]/70">Importo:</span>
                                        <span className="text-[#e8fbff] font-bold text-lg">€ {generatedAvviso.importo.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[#e8fbff]/70">Scadenza:</span>
                                        <span className="text-[#e8fbff]">{generatedAvviso.dataScadenza}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* IUV */}
                                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/30">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-[#e8fbff]/70">IUV (Identificativo Univoco Versamento)</span>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 px-2 text-[#3b82f6]"
                                        onClick={() => copyToClipboard(generatedAvviso.iuv)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <p className="text-[#e8fbff] font-mono text-sm">{generatedAvviso.iuv}</p>
                                  </div>
                                  
                                  {/* Codice Avviso */}
                                  <div className="p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/30">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-[#e8fbff]/70">Codice Avviso (18 cifre)</span>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 px-2 text-[#3b82f6]"
                                        onClick={() => copyToClipboard(generatedAvviso.codiceAvviso || '')}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <p className="text-[#e8fbff] font-mono text-lg tracking-wider">{generatedAvviso.codiceAvviso}</p>
                                  </div>
                                  
                                  {/* Azioni */}
                                  <div className="flex gap-2">
                                    <Button 
                                      className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/80"
                                      onClick={() => {
                                        // In produzione: chiamata API per PDF
                                        alert('Download PDF avviso (mock)');
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Scarica PDF
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      className="flex-1 border-[#10b981]/30 text-[#10b981]"
                                      onClick={() => {
                                        // In produzione: redirect a checkout
                                        const checkoutUrl = `https://checkout.pagopa.it/pay/${generatedAvviso.codiceAvviso}`;
                                        window.open(checkoutUrl, '_blank');
                                      }}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Paga Ora
                                    </Button>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    onClick={resetRicaricaDialog}
                                    className="w-full bg-[#1a2332] border border-[#3b82f6]/30 text-[#e8fbff] hover:bg-[#0b1220]"
                                  >
                                    Chiudi
                                  </Button>
                                </DialogFooter>
                              </>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Dialog Pagamento Immediato */}
                        <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
                          <DialogTrigger asChild>
                            <Button className="flex-1 bg-[#3b82f6] hover:bg-[#3b82f6]/80">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Paga Ora
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[#1a2332] border-[#3b82f6]/30 max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-[#e8fbff]">Pagamento Immediato PagoPA</DialogTitle>
                              <DialogDescription className="text-[#e8fbff]/70">
                                Verrai reindirizzato al checkout PagoPA per completare il pagamento
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label className="text-[#e8fbff]">Importo ricarica (€)</Label>
                                <Input
                                  type="number"
                                  placeholder="Es. 100.00"
                                  value={pagamentoImporto}
                                  onChange={(e) => setPagamentoImporto(e.target.value)}
                                  className="bg-[#0b1220] border-[#3b82f6]/30 text-[#e8fbff] text-lg"
                                  min="1"
                                  step="0.01"
                                />
                              </div>
                              <div className="p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/30">
                                <p className="text-sm text-[#e8fbff]/70 mb-2">Importi rapidi:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {[25, 50, 100, 200].map(importo => (
                                    <Button
                                      key={importo}
                                      size="sm"
                                      variant="outline"
                                      className={`border-[#3b82f6]/30 ${
                                        pagamentoImporto === importo.toString() 
                                          ? 'bg-[#3b82f6] text-white' 
                                          : 'text-[#e8fbff]'
                                      }`}
                                      onClick={() => setPagamentoImporto(importo.toString())}
                                    >
                                      € {importo}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div className="p-3 bg-[#f59e0b]/10 rounded-lg border border-[#f59e0b]/30">
                                <p className="text-xs text-[#f59e0b]">
                                  ⚠️ Verrai reindirizzato al portale PagoPA per completare il pagamento con carta, conto corrente o altri metodi.
                                </p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setShowPagamentoDialog(false);
                                  setPagamentoImporto('');
                                }} 
                                className="border-[#3b82f6]/30 text-[#e8fbff]"
                              >
                                Annulla
                              </Button>
                              <Button 
                                className="bg-[#3b82f6] hover:bg-[#3b82f6]/80" 
                                onClick={handlePagamentoImmediato}
                                disabled={!pagamentoImporto || parseFloat(pagamentoImporto) <= 0 || isProcessingPagamento}
                              >
                                {isProcessingPagamento ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Elaborazione...
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Vai al Pagamento
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Button 
                          variant="outline" 
                          className="border-[#f59e0b]/30 text-[#f59e0b]"
                          onClick={() => setShowNotificaDialog(true)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Ultime Transazioni */}
                    <div>
                      <h4 className="text-[#e8fbff] font-semibold mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Ultime Transazioni
                      </h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {getTransazioniWallet(selectedWallet.impresaId).map(transazione => (
                          <div 
                            key={transazione.id}
                            className={`flex items-center justify-between p-2 bg-[#0b1220] rounded border ${
                              transazione.tipo === 'RICARICA' ? 'border-[#10b981]/20' : 'border-[#ef4444]/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {transazione.tipo === 'RICARICA' ? (
                                <ArrowUpRight className="h-4 w-4 text-[#10b981]" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-[#ef4444]" />
                              )}
                              <div>
                                <span className="text-sm text-[#e8fbff]">{transazione.descrizione}</span>
                                <p className="text-xs text-[#e8fbff]/50">
                                  {new Date(transazione.data).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                            </div>
                            <span className={`font-semibold ${
                              transazione.tipo === 'RICARICA' ? 'text-[#10b981]' : 'text-[#ef4444]'
                            }`}>
                              {transazione.tipo === 'RICARICA' ? '+' : '-'}€ {transazione.importo.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        {getTransazioniWallet(selectedWallet.impresaId).length === 0 && (
                          <p className="text-center text-[#e8fbff]/50 py-4">Nessuna transazione</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-16 w-16 text-[#e8fbff]/30 mx-auto mb-4" />
                    <p className="text-[#e8fbff]/50">Seleziona un operatore dalla lista per vedere i dettagli del wallet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Regole Blocco */}
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
                Regole di Blocco Automatico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0b1220] rounded-lg border border-[#10b981]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-[#10b981]" />
                    <span className="text-[#10b981] font-semibold">ATTIVO</span>
                  </div>
                  <p className="text-sm text-[#e8fbff]/70">Saldo ≥ Tariffa giornaliera × 3</p>
                  <p className="text-sm text-[#e8fbff]/70">Può effettuare presenza</p>
                </div>
                <div className="p-4 bg-[#0b1220] rounded-lg border border-[#f59e0b]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
                    <span className="text-[#f59e0b] font-semibold">SALDO BASSO</span>
                  </div>
                  <p className="text-sm text-[#e8fbff]/70">Saldo &lt; Tariffa giornaliera × 3</p>
                  <p className="text-sm text-[#e8fbff]/70">Notifica automatica inviata</p>
                </div>
                <div className="p-4 bg-[#0b1220] rounded-lg border border-[#ef4444]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-[#ef4444]" />
                    <span className="text-[#ef4444] font-semibold">BLOCCATO</span>
                  </div>
                  <p className="text-sm text-[#e8fbff]/70">Saldo &lt; Tariffa giornaliera</p>
                  <p className="text-sm text-[#e8fbff]/70">Presenza non consentita</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* SOTTO-TAB: PAGOPA */}
      {subTab === 'pagopa' && (
        <>
          {/* Statistiche PagoPA */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Euro className="h-8 w-8 text-[#10b981]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Totale Incassato</p>
                    <p className="text-2xl font-bold text-[#10b981]">€ {stats.totaleIncassato.toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-[#3b82f6]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Pagati</p>
                    <p className="text-2xl font-bold text-[#3b82f6]">{stats.avvisiPagati}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#f59e0b]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-[#f59e0b]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">In Attesa</p>
                    <p className="text-2xl font-bold text-[#f59e0b]">{stats.avvisiInAttesa}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-[#ef4444]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Scaduti</p>
                    <p className="text-2xl font-bold text-[#ef4444]">{stats.avvisiScaduti}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista Avvisi PagoPA */}
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-[#10b981]" />
                  Avvisi PagoPA ({avvisiPagoPA.length})
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-[#3b82f6]/30 text-[#e8fbff]">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Verifica Pagamenti
                  </Button>
                  <Button size="sm" className="bg-[#10b981] hover:bg-[#10b981]/80">
                    <Download className="h-4 w-4 mr-1" />
                    Esporta
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {avvisiPagoPA.map(avviso => (
                  <div key={avviso.id} className={`p-4 bg-[#0b1220] rounded-lg border ${getAvvisoColor(avviso.stato)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[#e8fbff] font-semibold">{avviso.causale}</p>
                        <p className="text-sm text-[#e8fbff]/70">{avviso.ragioneSociale}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[#e8fbff]/50">
                          <span className="flex items-center gap-1">
                            <QrCode className="h-3 w-3" />
                            IUV: {avviso.iuv.slice(0, 10)}...
                          </span>
                          <span>Emesso: {avviso.dataEmissione}</span>
                          <span>Scadenza: {avviso.dataScadenza}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className={`font-bold text-xl ${
                          avviso.stato === 'PAGATO' ? 'text-[#10b981]' :
                          avviso.stato === 'EMESSO' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                        }`}>
                          € {avviso.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          avviso.stato === 'PAGATO' ? 'bg-[#10b981]/20 text-[#10b981]' :
                          avviso.stato === 'EMESSO' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                          'bg-[#ef4444]/20 text-[#ef4444]'
                        }`}>
                          {avviso.stato}
                        </span>
                        {avviso.stato === 'EMESSO' && (
                          <div className="flex gap-1 mt-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 border-[#3b82f6]/30 text-[#3b82f6]">
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 border-[#10b981]/30 text-[#10b981]">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {avviso.stato === 'PAGATO' && (
                          <Button size="sm" variant="outline" className="h-7 px-2 border-[#10b981]/30 text-[#10b981]">
                            <FileText className="h-3 w-3 mr-1" />
                            Quietanza
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/30">
                <p className="text-sm text-[#e8fbff]/70 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#3b82f6]" />
                  Integrazione E-FIL Plug&Pay attiva in modalità <strong className="text-[#f59e0b]">MOCK</strong> - Configurare credenziali per produzione
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* SOTTO-TAB: TARIFFE */}
      {subTab === 'tariffe' && (
        <>
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#8b5cf6]" />
                  Tariffe Posteggio
                </span>
                <Button size="sm" className="bg-[#8b5cf6] hover:bg-[#8b5cf6]/80">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuova Tariffa
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTariffe.map(tariffa => (
                  <div key={tariffa.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#8b5cf6]/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#e8fbff] font-semibold">{tariffa.tipoPosteggio}</p>
                        <p className="text-sm text-[#e8fbff]/70">{tariffa.descrizione}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#8b5cf6]">€ {tariffa.tariffaGiornaliera.toFixed(2)}</p>
                          <p className="text-xs text-[#e8fbff]/50">al giorno</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="border-[#8b5cf6]/30 text-[#e8fbff]">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-[#ef4444]/30 text-[#ef4444]">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* SOTTO-TAB: RICONCILIAZIONE */}
      {subTab === 'riconciliazione' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#1a2332] border-[#10b981]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="h-8 w-8 text-[#10b981]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Totale Ricariche</p>
                    <p className="text-2xl font-bold text-[#10b981]">€ {stats.totaleIncassato.toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#ef4444]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="h-8 w-8 text-[#ef4444]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Totale Decurtazioni</p>
                    <p className="text-2xl font-bold text-[#ef4444]">€ {mockTransazioni.filter(t => t.tipo === 'DECURTAZIONE').reduce((sum, t) => sum + t.importo, 0).toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#3b82f6]/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Wallet className="h-8 w-8 text-[#3b82f6]" />
                  <div>
                    <p className="text-sm text-[#e8fbff]/70">Saldo Complessivo</p>
                    <p className="text-2xl font-bold text-[#3b82f6]">€ {stats.saldoTotale.toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader>
              <CardTitle className="text-[#e8fbff] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#f59e0b]" />
                  Riconciliazione Giornaliera
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-[#3b82f6]/30 text-[#e8fbff]">
                    <Calendar className="h-4 w-4 mr-1" />
                    Seleziona Data
                  </Button>
                  <Button size="sm" className="bg-[#f59e0b] hover:bg-[#f59e0b]/80">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sincronizza E-FIL
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-[#0b1220] rounded-lg border border-[#f59e0b]/30 text-center">
                <FileText className="h-12 w-12 text-[#f59e0b]/50 mx-auto mb-3" />
                <p className="text-[#e8fbff]/70">Seleziona una data per visualizzare i pagamenti ricevuti</p>
                <p className="text-sm text-[#e8fbff]/50 mt-2">
                  La riconciliazione sincronizza automaticamente i pagamenti PagoPA con i wallet degli operatori
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Notifica */}
      <Dialog open={showNotificaDialog} onOpenChange={setShowNotificaDialog}>
        <DialogContent className="bg-[#1a2332] border-[#3b82f6]/30">
          <DialogHeader>
            <DialogTitle className="text-[#e8fbff]">Invia Notifica</DialogTitle>
            <DialogDescription className="text-[#e8fbff]/70">
              Invia una notifica all'operatore per ricordargli di ricaricare il wallet
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[#e8fbff]">
              Vuoi inviare una notifica a <strong>{selectedWallet?.ragioneSociale}</strong> per ricordargli di ricaricare il wallet?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificaDialog(false)} className="border-[#3b82f6]/30 text-[#e8fbff]">
              Annulla
            </Button>
            <Button className="bg-[#f59e0b] hover:bg-[#f59e0b]/80" onClick={() => {
              alert('Notifica inviata (mock)');
              setShowNotificaDialog(false);
            }}>
              <Send className="h-4 w-4 mr-2" />
              Invia Notifica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
