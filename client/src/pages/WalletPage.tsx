import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import LoginModal from '@/components/LoginModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, Leaf, TrendingUp, Award, RefreshCw, Loader2,
  User, Store, QrCode, Camera, CameraOff, Keyboard,
  CheckCircle2, XCircle, ShoppingBag, Bike, Footprints, Bus,
  Euro, ArrowDownToLine, History
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API_BASE = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

// ============================================================================
// INTERFACES
// ============================================================================

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  customer_name?: string;
}

interface WalletData {
  balance: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface QRData {
  qr_string: string;
  expires_at: string;
}

interface MerchantData {
  id: number;
  name: string;
  pending_tcc: number;
  pending_eur: string;
  total_reimbursed_tcc: number;
  total_reimbursed_eur: string;
  bank_account: string | null;
}

interface CitizenInfo {
  id: number;
  name: string;
  email: string;
  wallet_balance: number;
}

interface ScanResult {
  success: boolean;
  citizen?: CitizenInfo & { new_balance?: number };
  tcc_assigned?: number;
  message?: string;
  error?: string;
}

// ============================================================================
// WALLET PAGE COMPONENT
// ============================================================================

export default function WalletPage() {
  // ============================================================================
  // AUTENTICAZIONE
  // ============================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{id: number; name: string; email: string} | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Controlla autenticazione all'avvio
  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (userStr && token) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          setIsAuthenticated(true);
        } catch (e) {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    };
    checkAuth();
    // Ascolta cambiamenti localStorage (per login da altre tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);
  
  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setWalletData(null);
    setTransactions([]);
    setQrData(null);
  };
  
  // Rimosso tab Impresa - ora solo Cliente con funzione Paga con TCC
  const [activeTab] = useState<'cliente'>('cliente');
  
  // Stato per Paga con TCC
  const [spendAmount, setSpendAmount] = useState('');
  const [spendQRData, setSpendQRData] = useState<{qr_string: string; tcc_amount: number; expires_at: string} | null>(null);
  const [generatingSpendQR, setGeneratingSpendQR] = useState(false);
  
  // Valore TCC in euro (basato su EU ETS: €89/tonnellata / 1000 = €0,089 per kg CO₂)
  const TCC_VALUE_EUR = 0.089;
  
  // Cliente state
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingQR, setRefreshingQR] = useState(false);
  
  // Impresa state
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [merchantTransactions, setMerchantTransactions] = useState<Transaction[]>([]);
  const [reimbursements, setReimbursements] = useState<any[]>([]);
  const [loadingMerchant, setLoadingMerchant] = useState(false);
  
  // Scanner state
  const [qrInput, setQrInput] = useState('');
  const [earnType, setEarnType] = useState<string>('purchase_bio');
  const [euroSpent, setEuroSpent] = useState<string>('');
  const [transportMode, setTransportMode] = useState<string>('');
  const [validating, setValidating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [citizenInfo, setCitizenInfo] = useState<CitizenInfo | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('manual');
  const [cameraActive, setCameraActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  
  // Riscatto state
  const [redeemAmount, setRedeemAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<any>(null);

  // Usa l'utente loggato invece di userId hardcoded
  const userId = currentUser?.id || 0;
  const shopId = 1;

  // ============================================================================
  // CLIENTE FUNCTIONS
  // ============================================================================

  const fetchWalletData = async () => {
    try {
      setLoading(true);

      const walletRes = await fetch(`${API_BASE}/api/tcc/wallet/${userId}`);
      if (walletRes.ok) {
        const data = await walletRes.json();
        if (data.success) {
          setWalletData({
            balance: data.wallet.balance,
            user: data.wallet
          });
        }
      }

      const txRes = await fetch(`${API_BASE}/api/tcc/wallet/${userId}/transactions`);
      if (txRes.ok) {
        const data = await txRes.json();
        if (data.success) {
          setTransactions(data.transactions || []);
        }
      }

      await refreshQRCode();

    } catch (err) {
      console.error('Errore caricamento wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshQRCode = async () => {
    try {
      setRefreshingQR(true);
      const qrRes = await fetch(`${API_BASE}/api/tcc/qrcode/${userId}`);
      if (qrRes.ok) {
        const data = await qrRes.json();
        if (data.success) {
          setQrData({
            qr_string: data.qr_string,
            expires_at: data.expires_at
          });
        }
      }
    } catch (err) {
      console.error('Errore generazione QR:', err);
    } finally {
      setRefreshingQR(false);
    }
  };

  // Genera QR per spendere TCC
  const generateSpendQR = async () => {
    if (!spendAmount || parseFloat(spendAmount) <= 0) return;
    
    try {
      setGeneratingSpendQR(true);
      const res = await fetch(`${API_BASE}/api/tcc/v2/generate-spend-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          euro_amount: parseFloat(spendAmount)
        })
      });
      const data = await res.json();
      if (data.success) {
        setSpendQRData({
          qr_string: data.qr_string,
          tcc_amount: data.tcc_amount,
          expires_at: data.expires_at
        });
      } else {
        alert(data.error || 'Errore generazione QR');
      }
    } catch (err) {
      console.error('Errore generazione QR spesa:', err);
      alert('Errore di connessione');
    } finally {
      setGeneratingSpendQR(false);
    }
  };

  // ============================================================================
  // IMPRESA FUNCTIONS
  // ============================================================================

  const fetchMerchantData = async () => {
    try {
      setLoadingMerchant(true);

      const merchantRes = await fetch(`${API_BASE}/api/tcc/merchant/${shopId}`);
      if (merchantRes.ok) {
        const data = await merchantRes.json();
        if (data.success) {
          setMerchantData(data.merchant);
          setMerchantTransactions(data.recent_transactions || []);
          if (data.merchant.bank_account) {
            setBankAccount(data.merchant.bank_account);
          }
        }
      }

      const reimbRes = await fetch(`${API_BASE}/api/tcc/merchant/${shopId}/reimbursements`);
      if (reimbRes.ok) {
        const data = await reimbRes.json();
        if (data.success) {
          setReimbursements(data.reimbursements || []);
        }
      }

    } catch (err) {
      console.error('Errore caricamento dati commerciante:', err);
    } finally {
      setLoadingMerchant(false);
    }
  };

  // Valida QR Code
  const validateQR = async (qrData: string) => {
    console.log('validateQR called with:', qrData);
    alert('Validazione QR: ' + qrData);
    try {
      setValidating(true);
      setCitizenInfo(null);
      setScanResult(null);

      const response = await fetch(`${API_BASE}/api/tcc/validate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: qrData })
      });

      const data = await response.json();

      if (data.success && data.valid) {
        setCitizenInfo(data.citizen);
      } else {
        setScanResult({
          success: false,
          error: data.error || 'QR Code non valido o scaduto'
        });
      }
    } catch (err) {
      console.error('Errore validazione QR:', err);
      setScanResult({
        success: false,
        error: 'Errore di connessione'
      });
    } finally {
      setValidating(false);
    }
  };

  // Assegna TCC
  const assignTCC = async () => {
    if (!citizenInfo || !qrInput) return;

    try {
      setScanning(true);

      const body: any = {
        qr_data: qrInput,
        shop_id: shopId,
        earn_type: earnType
      };

      if (earnType === 'checkin' && transportMode) {
        body.transport_mode = transportMode;
      } else if (euroSpent) {
        body.euro_spent = parseFloat(euroSpent);
      }

      const response = await fetch(`${API_BASE}/api/tcc/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        setScanResult({
          success: true,
          citizen: data.citizen,
          tcc_assigned: data.tcc_assigned,
          message: data.message
        });
        setQrInput('');
        setCitizenInfo(null);
        setEuroSpent('');
        // Ricarica dati commerciante
        fetchMerchantData();
      } else {
        setScanResult({
          success: false,
          error: data.error || 'Errore assegnazione TCC'
        });
      }
    } catch (err) {
      console.error('Errore assegnazione TCC:', err);
      setScanResult({
        success: false,
        error: 'Errore di connessione'
      });
    } finally {
      setScanning(false);
    }
  };

  // Riscatta TCC
  const redeemTCC = async () => {
    if (!redeemAmount || !merchantData) return;

    try {
      setRedeeming(true);
      setRedeemResult(null);

      const response = await fetch(`${API_BASE}/api/tcc/merchant/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          amount: parseInt(redeemAmount),
          bank_account: bankAccount
        })
      });

      const data = await response.json();

      if (data.success) {
        setRedeemResult({
          success: true,
          message: data.message,
          eur_amount: data.reimbursement.eur_amount
        });
        setRedeemAmount('');
        // Ricarica dati commerciante
        fetchMerchantData();
      } else {
        setRedeemResult({
          success: false,
          error: data.error
        });
      }
    } catch (err) {
      console.error('Errore riscatto:', err);
      setRedeemResult({
        success: false,
        error: 'Errore di connessione'
      });
    } finally {
      setRedeeming(false);
    }
  };

  // Calcola TCC stimati
  const getEstimatedTCC = () => {
    const amount = parseFloat(euroSpent) || 0;
    switch (earnType) {
      case 'purchase_bio': return Math.floor(amount * 2);
      case 'purchase_km0': return Math.floor(amount * 3);
      case 'checkin':
        let base = 10;
        if (transportMode === 'bike') base += 5;
        if (transportMode === 'walk') base += 8;
        if (transportMode === 'public') base += 3;
        return base;
      default: return Math.floor(amount * 1);
    }
  };

  // Gestione input QR
  const handleQRInput = (value: string) => {
    setQrInput(value);
    setScanResult(null);
    setCitizenInfo(null);
    
    if (value.startsWith('tcc://') && value.length > 10) {
      validateQR(value);
    }
  };

  // Reset scanner
  // Camera Scanner Functions
  const startCameraScanner = async () => {
    try {
      if (!scannerContainerRef.current) {
        console.error('Scanner container not found');
        return;
      }
      
      console.log('Starting camera scanner...');
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // QR Code scansionato con successo
          console.log('QR Code scansionato:', decodedText);
          alert('QR Code letto: ' + decodedText);
          setQrInput(decodedText);
          validateQR(decodedText);
          stopCameraScanner();
          setInputMode('manual');
        },
        (errorMessage) => {
          // Ignora errori di scansione continua (normale)
        }
      );
      setCameraActive(true);
      console.log('Camera scanner started successfully');
    } catch (err) {
      console.error('Errore avvio camera:', err);
      alert('Errore avvio fotocamera: ' + (err as Error).message);
      setInputMode('manual');
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Errore stop camera:', err);
      }
    }
    setCameraActive(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Start/stop camera based on inputMode
  useEffect(() => {
    if (inputMode === 'camera' && !citizenInfo) {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
  }, [inputMode, activeTab, citizenInfo]);

  const resetScanner = () => {
    stopCameraScanner();
    setQrInput('');
    setCitizenInfo(null);
    setScanResult(null);
    setEuroSpent('');
    setTransportMode('');
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Carica dati wallet solo se autenticato
  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      fetchWalletData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    // Tab Impresa rimosso - fetchMerchantData non piu necessario
  }, [activeTab]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const balance = walletData?.balance || 0;
  
  // CO2 dell'ultima operazione (non del saldo totale)
  const lastTransaction = transactions.length > 0 ? transactions[0] : null;
  const lastOperationCO2 = lastTransaction ? Math.abs(lastTransaction.amount) : 0;
  const lastOperationTrees = (lastOperationCO2 / 22).toFixed(1); // 22 kg CO2 per albero/anno
  const lastOperationType = lastTransaction?.type === 'earn' ? 'Accredito' : 'Pagamento';
  
  // Totale cumulativo di tutte le operazioni (somma dei valori assoluti)
  const totalCumulativeCO2 = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalCumulativeTrees = (totalCumulativeCO2 / 22).toFixed(1);
  
  // Scala livelli da 500 a 20.000 kg
  const MAX_CO2_SCALE = 20000;
  
  const getLevel = (totalCO2: number) => {
    if (totalCO2 >= 20000) return { name: 'Leggenda', color: 'emerald', percentile: 'Eco-Leggenda!', progress: 100 };
    if (totalCO2 >= 15000) return { name: 'Eco-Champion', color: 'emerald', percentile: 'Top 1%', progress: 95 };
    if (totalCO2 >= 10000) return { name: 'Platino', color: 'slate', percentile: 'Top 3%', progress: 80 };
    if (totalCO2 >= 5000) return { name: 'Oro', color: 'amber', percentile: 'Top 5%', progress: 60 };
    if (totalCO2 >= 2000) return { name: 'Argento', color: 'gray', percentile: 'Top 15%', progress: 40 };
    if (totalCO2 >= 500) return { name: 'Bronzo', color: 'orange', percentile: 'Top 30%', progress: 20 };
    return { name: 'Starter', color: 'blue', percentile: 'Benvenuto!', progress: Math.max(5, (totalCO2 / 500) * 15) };
  };

  const level = getLevel(totalCumulativeCO2);
  
  // Calcola percentuale progresso per la barra verde (0-100)
  const progressPercent = Math.min(100, (totalCumulativeCO2 / MAX_CO2_SCALE) * 100);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento wallet...</p>
        </div>
      </div>
    );
  }

  // Se non autenticato, mostra schermata di benvenuto con login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-4 shadow-lg">
          <div className="w-full px-4 md:px-8 flex items-center gap-4">
            <a
              href="/"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Wallet className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Wallet Carbon Credit</h1>
                <p className="text-xs text-white/70">Accedi per vedere i tuoi crediti</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Contenuto non autenticato */}
        <div className="w-full px-4 md:px-8 pt-8">
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-emerald-600/10 border-primary/30">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="p-4 bg-primary/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Wallet className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Benvenuto nel Wallet TCC</h2>
              <p className="text-muted-foreground mb-6">
                Accedi o registrati per iniziare a guadagnare Token Carbon Credit con i tuoi acquisti sostenibili.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => setShowLoginModal(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg"
                >
                  <User className="h-5 w-5 mr-2" />
                  Accedi o Registrati
                </Button>
              </div>
              
              {/* Info sui vantaggi */}
              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-background/50 rounded-lg">
                  <Leaf className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Guadagna TCC</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Risparmia CO₂</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <Award className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Sali di livello</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Login Modal */}
        <LoginModal isOpen={showLoginModal} onClose={() => {
          setShowLoginModal(false);
          // Ricontrolla autenticazione dopo chiusura modal
          const userStr = localStorage.getItem('user');
          const token = localStorage.getItem('token');
          if (userStr && token) {
            try {
              const user = JSON.parse(userStr);
              setCurrentUser(user);
              setIsAuthenticated(true);
            } catch (e) {}
          }
        }} />
        
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen sm:min-h-screen bg-background pb-0 sm:pb-20 overflow-hidden sm:overflow-auto">
      {/* Header - v3.75.2: freccia visibile sempre, logout solo PC/Tablet */}
      <header className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-3 sm:p-4 shadow-lg">
        <div className="w-full px-3 sm:px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Freccia indietro - visibile SEMPRE (mobile + PC/Tablet) */}
            <a
              href="/"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div className="p-2 bg-white/20 rounded-xl">
              <Wallet className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Wallet TCC</h1>
              <p className="text-xs text-white/70">
                {currentUser?.name || walletData?.user?.name || 'I tuoi eco-crediti'}
              </p>
            </div>
          </div>
          {/* Pulsante Logout - SOLO PC/Tablet */}
          <button
            onClick={handleLogout}
            className="hidden sm:flex p-2 rounded-full bg-white/10 hover:bg-red-500/50 transition-all text-white/80 hover:text-white"
            title="Esci"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tab Selector - Mobile: fullscreen, Desktop: invariato */}
      <div className="w-full px-0 sm:px-4 md:px-8 pt-2 sm:pt-4">
        <Tabs value={activeTab}>
          {/* Tab Impresa rimosso - ora disponibile in HUB Operatore */}

          {/* ================================================================ */}
          {/* TAB CLIENTE */}
          {/* ================================================================ */}
          <TabsContent value="cliente" className="flex flex-col h-[calc(100vh-60px)] sm:h-auto sm:space-y-6 mt-0 sm:mt-4 px-0 sm:px-0 overflow-hidden sm:overflow-visible">
            {/* Saldo Principale - Mobile: barra più alta con nome, Desktop: card grande - v3.75.0 */}
            <div className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-4 sm:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-6 w-6" />
                  <span className="font-bold text-2xl">{balance} TCC</span>
                </div>
                <span className="text-lg text-white/90 font-semibold">€{(balance * 0.089).toLocaleString('it-IT', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
            {/* Desktop: card grande */}
            <Card className="hidden sm:block bg-gradient-to-br from-primary via-primary/90 to-emerald-600 text-primary-foreground border-0 sm:border shadow-none sm:shadow-2xl rounded-none sm:rounded-lg">
              <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl">
                    <Wallet className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-primary-foreground text-base sm:text-xl">Saldo TCC</CardTitle>
                    <CardDescription className="text-primary-foreground/70 text-xs sm:text-sm">Token Carbon Credit</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-5xl sm:text-7xl font-bold mb-1 sm:mb-2">{balance}</div>
                <p className="text-primary-foreground/80 text-sm sm:text-base">crediti disponibili (€{(balance * 0.089).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</p>
              </CardContent>
            </Card>

            {/* QR Code per RICEVERE crediti - Mobile: compatto, Desktop: card */}
            <div className="flex flex-col items-center justify-center sm:hidden py-3 px-4">
              <p className="text-xs text-muted-foreground mb-2">Mostra al negoziante per ricevere crediti</p>
              <div className="bg-white p-3 rounded-xl shadow-lg">
                <QRCodeSVG value={qrData?.qr_string || `tcc://${userId}/demo`} size={150} level="H" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                {qrData?.expires_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Valido: {new Date(qrData.expires_at).toLocaleString('it-IT')}
                  </p>
                )}
                <Button variant="ghost" size="sm" onClick={refreshQRCode} disabled={refreshingQR} className="h-6 px-2">
                  <RefreshCw className={`h-3 w-3 ${refreshingQR ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            {/* Desktop: card QR */}
            <Card className="hidden sm:block rounded-lg border shadow">
              <CardHeader className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Il tuo QR Code</CardTitle>
                    <CardDescription>Mostra questo codice al negoziante per ricevere i crediti</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={refreshQRCode} disabled={refreshingQR}>
                    <RefreshCw className={`h-5 w-5 ${refreshingQR ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center p-6 pt-0">
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <QRCodeSVG value={qrData?.qr_string || `tcc://${userId}/demo`} size={200} level="H" />
                </div>
                {qrData?.expires_at && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Valido fino: {new Date(qrData.expires_at).toLocaleString('it-IT')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 2 Tab in basso per mobile: Paga e Storico - v3.75.2: completamente trasparenti, solo bordo */}
            <div className="grid grid-cols-2 gap-4 p-4 mt-auto sm:hidden">
              <a href="/wallet/paga" className="flex flex-col items-center justify-center gap-3 py-6 rounded-xl border border-border/50 bg-transparent hover:bg-white/5 transition-all">
                <Euro className="h-7 w-7 text-foreground/80" />
                <span className="text-base font-semibold text-foreground">Paga</span>
              </a>
              <a href="/wallet/storico" className="flex flex-col items-center justify-center gap-3 py-6 rounded-xl border border-border/50 bg-transparent hover:bg-white/5 transition-all">
                <History className="h-7 w-7 text-foreground/80" />
                <span className="text-base font-semibold text-foreground">Storico</span>
              </a>
            </div>

            {/* Impatto Ambientale - SOLO Desktop */}
            <div className="hidden sm:grid grid-cols-2 gap-4">
              {/* Card Verde - Ultima Operazione */}
              <Card className="border-0 shadow-none sm:shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-none sm:rounded-lg">
                <CardContent className="pt-3 sm:pt-6 text-center p-2 sm:p-6">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <Leaf className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div className="text-2xl sm:text-4xl font-bold text-green-600">{lastOperationCO2.toLocaleString('it-IT')} kg</div>
                  <div className="text-xs sm:text-sm text-muted-foreground font-medium">CO₂ Evitata</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">= {lastOperationTrees} alberi</p>
                </CardContent>
              </Card>

              {/* Card Livello - SOLO Desktop */}
              <Card className="border-0 shadow-lg overflow-hidden relative rounded-lg">
                {/* Sfondo arancione base */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/10" />
                {/* Sfondo verde che cresce dal basso */}
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-green-400/80 transition-all duration-1000 ease-out"
                  style={{ height: `${progressPercent}%` }}
                />
                <CardContent className="pt-3 sm:pt-6 text-center relative z-10 p-2 sm:p-6">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <Award className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-amber-600">{level.name}</div>
                  <div className="text-sm sm:text-lg font-semibold text-green-600">{totalCumulativeCO2.toLocaleString('it-IT')} kg</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">CO₂ totale</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{level.percentile}</p>
                </CardContent>
              </Card>
            </div>

            {/* Paga con TCC - SOLO Desktop */}
            <Card className="hidden sm:block border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-lg shadow">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-amber-600 text-sm sm:text-base">
                  <Euro className="h-4 w-4 sm:h-5 sm:w-5" />
                  Paga con TCC
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Genera QR per pagare con Token</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
                {!spendQRData ? (
                  <>
                    <div>
                      <Label className="text-xs sm:text-sm">Importo (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={spendAmount}
                        onChange={(e) => setSpendAmount(e.target.value)}
                        className="text-xl sm:text-2xl font-bold h-12 sm:h-14"
                      />
                    </div>
                    {spendAmount && parseFloat(spendAmount) > 0 && (
                      <div className="p-2 sm:p-3 bg-amber-500/10 rounded-lg">
                        <p className="text-xs sm:text-sm text-muted-foreground">TCC necessari</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600">
                          ~{Math.ceil(parseFloat(spendAmount) / TCC_VALUE_EUR).toLocaleString('it-IT')} TCC
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          1 TCC = €{TCC_VALUE_EUR.toLocaleString('it-IT', {minimumFractionDigits: 3})}
                        </p>
                      </div>
                    )}
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 h-10 sm:h-11 text-sm sm:text-base"
                      onClick={generateSpendQR}
                      disabled={!spendAmount || parseFloat(spendAmount) <= 0 || generatingSpendQR}
                    >
                      {generatingSpendQR ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      Genera QR
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-3 sm:space-y-4">
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow-inner inline-block">
                      <QRCodeSVG value={spendQRData.qr_string} size={140} level="H" className="sm:hidden" />
                      <QRCodeSVG value={spendQRData.qr_string} size={180} level="H" className="hidden sm:block" />
                    </div>
                    <div className="p-2 sm:p-3 bg-amber-500/10 rounded-lg">
                      <p className="text-xs sm:text-sm text-muted-foreground">Importo</p>
                      <p className="text-xl sm:text-2xl font-bold">€{parseFloat(spendAmount || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                      <p className="text-base sm:text-lg text-amber-600 font-semibold">{spendQRData.tcc_amount} TCC</p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Valido: {new Date(spendQRData.expires_at).toLocaleTimeString('it-IT')}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => { setSpendQRData(null); setSpendAmount(''); }}
                      className="h-9 sm:h-10 text-sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Nuovo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Storico Transazioni - SOLO Desktop */}
            <Card className="hidden sm:block rounded-lg border shadow">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  Storico
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3 max-h-[200px] sm:max-h-none overflow-y-auto">
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-3 sm:py-4 text-sm">Nessuna transazione</p>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs sm:text-base truncate">{tx.description}</p>
                          <p className="text-[10px] sm:text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('it-IT', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className={`text-base sm:text-lg font-semibold ml-2 ${tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* BottomNav nascosto su mobile */}
      <div className="hidden sm:block">
        <BottomNav />
      </div>
    </div>
  );
}
