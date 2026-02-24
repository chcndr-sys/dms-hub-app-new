import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNearbyPOIs, type NearbyPOI } from '@/hooks/useNearbyPOIs';
import { NearbyPOIPopup, NearbyPOIBanner, NearbyPOIList } from '@/components/NearbyPOIPopup';
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
  Euro, ArrowDownToLine, History, ChevronLeft, MapPin, Landmark,
  Share2, Gift, Copy, Check
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { authenticatedFetch } from '@/hooks/useImpersonation';

// API Base URL — in produzione usa proxy Vercel (/api/tcc/* → orchestratore.mio-hub.me)
// MIHUB_API_BASE_URL punta a mihub Hetzner che NON serve API TCC, quindi usiamo il proxy
const API_BASE = import.meta.env.DEV
  ? 'https://orchestratore.mio-hub.me'
  : '';

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
  
  // Tab disponibili: cliente (wallet) e eco_credit (programma ECO CREDIT)
  const [activeTab, setActiveTab] = useState<'cliente' | 'eco_credit'>('cliente');
  
  // Stato ECO CREDIT - salvato in localStorage E nel database
  const [ecoCreditsEnabled, setEcoCreditsEnabled] = useState(() => {
    return localStorage.getItem('eco_credit_enabled') === 'true';
  });
  const [ecoToggleLoading, setEcoToggleLoading] = useState(false);
  
  // Stato Referral "Presenta un Amico"
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  // Lista comuni con Hub attivo + stato 4 slot gaming
  const [activeComuni, setActiveComuni] = useState<{id: number; nome: string; provincia: string; civic: boolean; mobility: boolean; culture: boolean; shopping: boolean}[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/api/gaming-rewards/config/all`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setActiveComuni(data.data.map((c: any) => ({
            id: c.comune_id,
            nome: c.nome || `Comune ${c.comune_id}`,
            provincia: c.provincia || '',
            civic: !!c.civic,
            mobility: !!c.mobility,
            culture: !!c.culture,
            shopping: !!c.shopping
          })));
        }
      })
      .catch(() => {});
  }, []);
  
  const toggleEcoCredit = async (enabled: boolean) => {
    // Aggiorna subito lo stato locale per UX reattiva
    setEcoCreditsEnabled(enabled);
    localStorage.setItem('eco_credit_enabled', enabled ? 'true' : 'false');
    
    // Sincronizza con il database se l'utente è autenticato
    if (currentUser?.id) {
      setEcoToggleLoading(true);
      try {
        const response = await authenticatedFetch(`${API_BASE}/api/citizens/${currentUser.id}/eco-credit`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ active: enabled })
        });
        
        if (!response.ok) {
          console.error('Errore sincronizzazione ECO CREDIT:', await response.text());
          // Rollback in caso di errore
          setEcoCreditsEnabled(!enabled);
          localStorage.setItem('eco_credit_enabled', !enabled ? 'true' : 'false');
        }
      } catch (error) {
        console.error('Errore chiamata API ECO CREDIT:', error);
        // Rollback in caso di errore
        setEcoCreditsEnabled(!enabled);
        localStorage.setItem('eco_credit_enabled', !enabled ? 'true' : 'false');
      } finally {
        setEcoToggleLoading(false);
      }
    }
  };
  
  // Genera link referral "Presenta un Amico"
  const generateReferralLink = async () => {
    if (!currentUser?.id) return;
    setReferralLoading(true);
    try {
      // Manda lat/lng dalla geolocalizzazione - il backend determina il comune automaticamente
      const bodyData: any = { user_id: currentUser.id };
      if (currentPosition) {
        bodyData.lat = currentPosition.lat;
        bodyData.lng = currentPosition.lng;
      } else {
        // Fallback: se GPS non disponibile, prova a ottenere la posizione ora
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          bodyData.lat = pos.coords.latitude;
          bodyData.lng = pos.coords.longitude;
        } catch {
          // Se GPS non disponibile, il backend rifiuterà la richiesta
          console.warn('GPS non disponibile per referral');
        }
      }
      const response = await authenticatedFetch(`${API_BASE}/api/gaming-rewards/referral/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bodyData)
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.referral_code) {
          setReferralCode(result.data.referral_code);
        }
      }
    } catch (error) {
      console.error('Errore generazione referral:', error);
    } finally {
      setReferralLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/#/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    });
  };

  const shareReferralLink = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/#/register?ref=${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Unisciti a MIO HUB!',
          text: 'Registrati con il mio codice e guadagna TCC!',
          url: link
        });
      } catch (e) {
        // Utente ha annullato la condivisione
      }
    } else {
      copyReferralLink();
    }
  };

  // Stato per POI vicini e popup check-in
  const [selectedPOI, setSelectedPOI] = useState<NearbyPOI | null>(null);
  const [showPOIPopup, setShowPOIPopup] = useState(false);
  
  // Hook per rilevamento POI vicini (attivo solo se ECO CREDIT è abilitato)
  // Il comune_id per useNearbyPOIs non serve più per il referral (usa lat/lng)
  // Per i POI vicini, passiamo null e il backend gestisce il filtro per coordinate
  const comuneId = 1; // Per useNearbyPOIs - il referral ora usa lat/lng direttamente
  const {
    nearbyPOIs,
    currentPosition,
    permissionStatus,
    isLoading: gpsLoading,
    error: gpsError,
    doCheckin,
    refreshPosition,
    hasUnvisitedPOIs,
    unvisitedCount,
    totalTCCAvailable,
  } = useNearbyPOIs({
    comuneId,
    userId: currentUser?.id?.toString(),
    radius: 50,
    types: 'all',
    enabled: ecoCreditsEnabled && isAuthenticated,
    onPOIFound: (pois) => {
      // Mostra popup automatico per il primo POI non visitato
      if (pois.length > 0 && !showPOIPopup) {
        setSelectedPOI(pois[0]);
        setShowPOIPopup(true);
      }
    },
    onCheckinSuccess: (poi, credits) => {
      // Aggiorna il wallet dopo check-in
      if (walletData) {
        setWalletData({
          ...walletData,
          balance: walletData.balance + credits
        });
      }
    },
  });
  
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

      const token = localStorage.getItem('token') || '';
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const walletRes = await fetch(`${API_BASE}/api/tcc/wallet/${userId}`, {
        headers: authHeaders,
      });
      if (walletRes.ok) {
        const data = await walletRes.json();
        if (data.success) {
          setWalletData({
            balance: data.wallet.balance,
            user: data.wallet
          });
        }
      }

      const txRes = await fetch(`${API_BASE}/api/tcc/wallet/${userId}/transactions?limit=500`, {
        headers: authHeaders,
      });
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
      const token = localStorage.getItem('token') || '';
      const qrRes = await fetch(`${API_BASE}/api/tcc/qrcode/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
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
      const token = localStorage.getItem('token') || '';
      const res = await authenticatedFetch(`${API_BASE}/api/tcc/v2/generate-spend-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          user_id: userId,
          euro_amount: parseFloat(spendAmount),
          timestamp: Date.now(),
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
        console.warn('[Wallet] QR generation error:', data.error || 'Errore generazione QR');
      }
    } catch (err) {
      console.error('Errore generazione QR spesa:', err);
      console.warn('[Wallet] Connection error generating spend QR');
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
    try {
      setValidating(true);
      setCitizenInfo(null);
      setScanResult(null);

      const token = localStorage.getItem('token') || '';
      const response = await authenticatedFetch(`${API_BASE}/api/tcc/validate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

      const response = await authenticatedFetch(`${API_BASE}/api/tcc/scan`, {
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

      const response = await authenticatedFetch(`${API_BASE}/api/tcc/merchant/redeem`, {
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
    } catch (err) {
      console.error('Errore avvio camera:', err);
      console.warn('[Wallet] Camera error:', (err as Error).message);
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
    <div className="h-screen sm:min-h-screen bg-background pb-0 sm:pb-20 overflow-y-auto sm:overflow-auto">
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cliente' | 'eco_credit')}>
          {/* Tab Selector nascosto - navigazione tramite bottoni in basso */}

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

            {/* 3 Tab in basso per mobile: Paga, Storico, ECO CREDIT - v3.76.0 */}
            <div className="grid grid-cols-3 gap-3 p-4 mt-auto sm:hidden">
              <a href="/wallet/paga" className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-border/50 bg-transparent hover:bg-white/5 transition-all">
                <Euro className="h-6 w-6 text-foreground/80" />
                <span className="text-sm font-semibold text-foreground">Paga</span>
              </a>
              <a href="/wallet/storico" className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-border/50 bg-transparent hover:bg-white/5 transition-all">
                <History className="h-6 w-6 text-foreground/80" />
                <span className="text-sm font-semibold text-foreground">Storico</span>
              </a>
              <button 
                onClick={() => setActiveTab('eco_credit')}
                className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
              >
                <Leaf className="h-6 w-6 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-500">ECO</span>
              </button>
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
                      <p className="text-xl sm:text-2xl font-bold">€{parseFloat(spendAmount || '0').toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
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

            {/* ECO CREDIT - SOLO Desktop */}
            <Card className="hidden sm:block border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-lg shadow cursor-pointer hover:border-emerald-500/50 transition-all" onClick={() => setActiveTab('eco_credit')}>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-emerald-600 text-sm sm:text-base">
                  <Leaf className="h-4 w-4 sm:h-5 sm:w-5" />
                  Programma ECO CREDIT
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Guadagna TCC con azioni sostenibili</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${ecoCreditsEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <span className="text-sm">{ecoCreditsEnabled ? 'Attivo' : 'Non attivo'}</span>
                  </div>
                  <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-500/50 hover:bg-emerald-500/10">
                    Configura
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Presenta un Amico - SOLO Desktop */}
            {ecoCreditsEnabled && (
              <Card className="hidden sm:block border-2 border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-fuchsia-500/5 rounded-lg shadow">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-pink-500 text-sm sm:text-base">
                    <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                    Presenta un Amico
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Invita amici e guadagna TCC</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Condividi il tuo link e guadagna TCC per ogni amico che si registra!</p>
                    </div>
                    {!referralCode ? (
                      <Button
                        size="sm"
                        onClick={generateReferralLink}
                        disabled={referralLoading}
                        className="bg-pink-500 hover:bg-pink-600 text-white ml-4 flex-shrink-0"
                      >
                        {referralLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Share2 className="h-4 w-4 mr-1" /> Genera Link</>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyReferralLink}
                          className="text-xs"
                        >
                          {referralCopied ? (
                            <><Check className="h-3 w-3 mr-1 text-emerald-500" /> Copiato!</>
                          ) : (
                            <><Copy className="h-3 w-3 mr-1" /> Copia</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={shareReferralLink}
                          className="bg-pink-500 hover:bg-pink-600 text-white text-xs"
                        >
                          <Share2 className="h-3 w-3 mr-1" /> Invia
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Mostra link generato e info TCC - Desktop */}
                  {referralCode && (
                    <div className="mt-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                      <p className="text-xs text-pink-700 font-medium mb-1">Il tuo link referral:</p>
                      <p className="text-xs text-pink-600 break-all font-mono bg-white/50 p-2 rounded">
                        {`${window.location.origin}/#/register?ref=${referralCode}`}
                      </p>
                      <div className="mt-2 text-xs text-pink-600 flex gap-4">
                        <span>🎁 Tu ricevi <strong>TCC</strong> per ogni invito</span>
                        <span>👋 Il tuo amico riceve <strong>TCC</strong> di benvenuto</span>
                        <span>🛒 Bonus <strong>TCC</strong> al primo acquisto</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                    transactions.map((tx) => {
                      // Determina se è un accredito (earn, civic, mobility, culture, referral) o una spesa
                      const isCredit = ['earn', 'civic', 'mobility', 'culture', 'referral'].includes(tx.type);
                      
                      // Badge colore per tipo
                      const badgeClass = 
                        tx.type === 'civic' ? 'bg-orange-500/20 text-orange-500' :
                        tx.type === 'mobility' ? 'bg-blue-500/20 text-blue-500' :
                        tx.type === 'culture' ? 'bg-purple-500/20 text-purple-500' :
                        tx.type === 'earn' ? 'bg-green-500/20 text-green-500' :
                        tx.type === 'referral' ? 'bg-pink-500/20 text-pink-500' :
                        'bg-red-500/20 text-red-500';
                      
                      // Semaforino colore
                      const dotColor = 
                        tx.type === 'civic' ? 'bg-orange-500' :
                        tx.type === 'mobility' ? 'bg-blue-500' :
                        tx.type === 'culture' ? 'bg-purple-500' :
                        tx.type === 'earn' ? 'bg-green-500' :
                        tx.type === 'referral' ? 'bg-pink-500' :
                        'bg-red-500';
                      
                      // Label tipo accredito
                      const typeLabel = 
                        tx.type === 'civic' ? 'Segnalazione Civica' :
                        tx.type === 'mobility' ? 'Mobilità Sostenibile' :
                        tx.type === 'culture' ? 'Cultura & Turismo' :
                        tx.type === 'earn' ? 'Acquisto' :
                        tx.type === 'referral' ? 'Presenta un Amico' :
                        'Pagamento TCC';
                      
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Semaforino colorato */}
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-base truncate">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`inline-block px-2 py-0.5 text-[10px] sm:text-xs rounded-full ${badgeClass}`}>
                                  {typeLabel}
                                </span>
                                <span className="text-[10px] sm:text-sm text-muted-foreground">
                                  {new Date(tx.created_at).toLocaleDateString('it-IT', {
                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className={`text-base sm:text-lg font-semibold ml-2 ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
                            {isCredit ? '+' : '-'}{Math.abs(tx.amount)} TCC
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB ECO CREDIT */}
          {/* ================================================================ */}
          <TabsContent value="eco_credit" className="flex flex-col h-[calc(100vh-70px)] sm:h-auto mt-0 sm:mt-4 px-0 sm:px-0 overflow-hidden sm:overflow-visible">

            {/* ===== MOBILE: Layout con header fisso + scroll interno ===== */}
            <div className="flex flex-col h-full sm:hidden">
              {/* HEADER FISSO: Programma + Toggle + Referral */}
              <div className="flex-shrink-0">
                {/* Barra verde programma */}
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-white" />
                      <p className="text-base font-bold text-white">Programma ECO CREDIT</p>
                    </div>
                    <Button
                      size="sm"
                      variant={ecoCreditsEnabled ? 'destructive' : 'default'}
                      onClick={() => toggleEcoCredit(!ecoCreditsEnabled)}
                      className={`h-8 text-xs ${ecoCreditsEnabled ? '' : 'bg-white text-emerald-700 hover:bg-white/90'}`}
                    >
                      {ecoCreditsEnabled ? 'Disattiva' : 'Attiva'}
                    </Button>
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    {ecoCreditsEnabled ? 'Attivo — Stai guadagnando TCC!' : 'Attiva per guadagnare Token con azioni sostenibili'}
                  </p>
                </div>

                {/* Presenta un Amico - compatto sotto la barra verde - DARK */}
                {ecoCreditsEnabled && (
                  <div className="px-3 py-2 bg-pink-950/40 border-b border-pink-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-pink-400" />
                        <span className="text-sm font-semibold text-pink-300">Presenta un Amico</span>
                      </div>
                      {!referralCode ? (
                        <Button
                          size="sm"
                          onClick={generateReferralLink}
                          disabled={referralLoading}
                          className="bg-pink-500 hover:bg-pink-600 text-white h-7 text-xs px-3"
                        >
                          {referralLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <><Share2 className="h-3 w-3 mr-1" /> Genera Link</>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={copyReferralLink} className="text-xs px-2 h-7 border-pink-500/30 text-pink-300 hover:bg-pink-500/10">
                            {referralCopied ? <><Check className="h-3 w-3 mr-1 text-emerald-400" /> Copiato!</> : <><Copy className="h-3 w-3 mr-1" /> Copia</>}
                          </Button>
                          <Button size="sm" onClick={shareReferralLink} className="bg-pink-500 hover:bg-pink-600 text-white text-xs px-2 h-7">
                            <Share2 className="h-3 w-3 mr-1" /> Invia
                          </Button>
                        </div>
                      )}
                    </div>
                    {referralCode && (
                      <div className="mt-2 text-[11px] text-pink-400 flex gap-3">
                        <span>🎁 TCC per invito</span>
                        <span>👋 TCC amico</span>
                        <span>🛒 TCC 1° acquisto</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Statistiche compatte - DARK */}
                {ecoCreditsEnabled && (
                  <div className="grid grid-cols-2 gap-2 px-3 py-2 border-b border-slate-700/50">
                    <div className="text-center p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30">
                      <p className="text-lg font-bold text-emerald-400">{walletData?.balance || 0}</p>
                      <p className="text-[10px] text-emerald-300/70">TCC Totali</p>
                    </div>
                    <div className="text-center p-2 rounded-lg border border-blue-500/30 bg-blue-950/30">
                      <p className="text-lg font-bold text-blue-400">{((walletData?.balance || 0) * 0.089).toFixed(2)}€</p>
                      <p className="text-[10px] text-blue-300/70">Valore in Euro</p>
                    </div>
                  </div>
                )}
              </div>

              {/* CONTAINER SCROLLABILE INTERNO */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-6">
                {/* POI Vicini - DARK */}
                {ecoCreditsEnabled && (
                  <div className="rounded-xl border border-emerald-500/20 bg-slate-800/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-sm text-white">Luoghi Vicini</span>
                      {gpsLoading && <Loader2 className="h-3 w-3 animate-spin ml-1 text-emerald-400" />}
                    </div>
                    {currentPosition && (
                      <p className="text-[10px] text-slate-400 mb-2">Posizione rilevata (precisione: {Math.round(currentPosition.accuracy)}m)</p>
                    )}
                    {hasUnvisitedPOIs && nearbyPOIs.filter(p => !p.already_visited_today)[0] && (
                      <div className="mb-2">
                        <NearbyPOIBanner 
                          poi={nearbyPOIs.filter(p => !p.already_visited_today)[0]}
                          onTap={() => {
                            setSelectedPOI(nearbyPOIs.filter(p => !p.already_visited_today)[0]);
                            setShowPOIPopup(true);
                          }}
                        />
                      </div>
                    )}
                    {permissionStatus === 'denied' && (
                      <div className="p-2 bg-red-950/30 border border-red-500/30 rounded text-red-400 text-xs mb-2">
                        <strong>GPS negato.</strong> Abilita la geolocalizzazione nelle impostazioni.
                      </div>
                    )}
                    {nearbyPOIs.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-slate-400">{unvisitedCount} luoghi ({totalTCCAvailable} TCC)</p>
                          <Button variant="ghost" size="sm" onClick={refreshPosition} disabled={gpsLoading} className="h-6 w-6 p-0 text-slate-400 hover:text-white">
                            <RefreshCw className={`h-3 w-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        <NearbyPOIList 
                          pois={nearbyPOIs}
                          onSelectPOI={(poi) => { setSelectedPOI(poi); setShowPOIPopup(true); }}
                          isLoading={gpsLoading}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <MapPin className="h-6 w-6 mx-auto mb-1 text-slate-600" />
                        <p className="text-xs text-slate-500">Nessun luogo nelle vicinanze</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Come guadagnare TCC - DARK */}
                <div className="rounded-xl border border-emerald-500/20 bg-slate-800/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-sm text-white">Come guadagnare TCC</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-blue-500/20 bg-blue-950/20">
                      <Bus className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-300">Mobilità Sostenibile</p>
                        <p className="text-[10px] text-blue-400/60">Bus, bici, a piedi — rilevamento automatico</p>
                      </div>
                      <span className="text-xs font-bold text-blue-400 flex-shrink-0">TCC</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-purple-500/20 bg-purple-950/20">
                      <Award className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-purple-300">Cultura & Turismo</p>
                        <p className="text-[10px] text-purple-400/60">Musei, monumenti, percorsi culturali</p>
                      </div>
                      <span className="text-xs font-bold text-purple-400 flex-shrink-0">TCC</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-amber-500/20 bg-amber-950/20">
                      <Store className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-300">Acquisti Locali</p>
                        <p className="text-[10px] text-amber-400/60">Cashback sostenibile nei negozi aderenti</p>
                      </div>
                      <span className="text-xs font-bold text-amber-400 flex-shrink-0">TCC</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-orange-500/20 bg-orange-950/20">
                      <TrendingUp className="h-4 w-4 text-orange-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-orange-300">Segnalazioni Civiche</p>
                        <p className="text-[10px] text-orange-400/60">Segnala problemi alla PA, ricevi TCC</p>
                      </div>
                      <span className="text-xs font-bold text-orange-400 flex-shrink-0">TCC</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg border border-pink-500/20 bg-pink-950/20">
                      <Gift className="h-4 w-4 text-pink-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-pink-300">Presenta un Amico</p>
                        <p className="text-[10px] text-pink-400/60">Invita amici e guadagna entrambi</p>
                      </div>
                      <span className="text-xs font-bold text-pink-400 flex-shrink-0">TCC</span>
                    </div>
                  </div>
                </div>

                {/* Comuni con Hub Attivo - CARD SCROLL ORIZZONTALE - DARK */}
                {activeComuni.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-slate-800/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Landmark className="h-4 w-4 text-emerald-400" />
                      <span className="font-semibold text-sm text-white">Comuni con Hub Attivo</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">{activeComuni.length}</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch'}}>
                      {activeComuni.map((c) => (
                        <div key={c.id} className="flex-shrink-0 w-[160px] snap-start rounded-xl border border-slate-600/40 bg-slate-900/60 p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Landmark className="h-3.5 w-3.5 text-emerald-400" />
                            <p className="text-xs font-semibold text-white truncate">{c.nome}</p>
                          </div>
                          {c.provincia && <p className="text-[10px] text-slate-400 -mt-1">({c.provincia})</p>}
                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-full ${c.civic ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[9px] ${c.civic ? 'text-emerald-400' : 'text-slate-500'}`}>Civic</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-full ${c.mobility ? 'bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[9px] ${c.mobility ? 'text-blue-400' : 'text-slate-500'}`}>Mobilità</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-full ${c.culture ? 'bg-purple-400 shadow-[0_0_4px_rgba(192,132,252,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[9px] ${c.culture ? 'text-purple-400' : 'text-slate-500'}`}>Cultura</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-full ${c.shopping ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[9px] ${c.shopping ? 'text-amber-400' : 'text-slate-500'}`}>Shopping</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Informativa GPS - DARK */}
                <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
                  <p className="text-[10px] text-slate-500">
                    📍 <strong className="text-slate-400">GPS e Privacy:</strong> La posizione viene rilevata solo quando apri l'app, non in background. 
                    Serve per rilevare fermate bus, musei e percorsi sostenibili. Dati trattati in conformità al GDPR.
                  </p>
                </div>
              </div>{/* Fine container scrollabile mobile */}
            </div>{/* Fine layout mobile */}

            {/* ===== DESKTOP/TABLET: Layout classico con cards - DARK ===== */}
            <div className="hidden sm:flex sm:flex-col sm:gap-4">
              {/* Card Programma + Toggle - DARK */}
              <Card className="border border-emerald-500/20 shadow-xl bg-slate-800/50">
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 p-4 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Leaf className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">Programma ECO CREDIT</p>
                      <p className="text-xs text-white/80">Guadagna Token con azioni sostenibili</p>
                    </div>
                  </div>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${ecoCreditsEnabled ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                        {ecoCreditsEnabled ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <XCircle className="h-6 w-6 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">Partecipazione al Programma</p>
                        <p className="text-sm text-slate-400">
                          {ecoCreditsEnabled ? 'Attivo - Stai guadagnando TCC!' : 'Non attivo'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={ecoCreditsEnabled ? 'destructive' : 'default'}
                      onClick={() => toggleEcoCredit(!ecoCreditsEnabled)}
                      className={ecoCreditsEnabled ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
                    >
                      {ecoCreditsEnabled ? 'Disattiva' : 'Attiva'}
                    </Button>
                  </div>

                  {/* Presenta un Amico - Desktop DARK */}
                  {ecoCreditsEnabled && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-pink-500/20">
                            <Gift className="h-5 w-5 text-pink-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-white">Presenta un Amico</p>
                            <p className="text-xs text-slate-400">Condividi il tuo link e guadagna TCC per ogni amico che si registra!</p>
                          </div>
                        </div>
                        {!referralCode ? (
                          <Button
                            size="sm"
                            onClick={generateReferralLink}
                            disabled={referralLoading}
                            className="bg-pink-500 hover:bg-pink-600 text-white ml-4 flex-shrink-0"
                          >
                            {referralLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><Share2 className="h-4 w-4 mr-1" /> Genera Link</>
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={copyReferralLink} className="text-xs border-pink-500/30 text-pink-300 hover:bg-pink-500/10">
                              {referralCopied ? <><Check className="h-3 w-3 mr-1 text-emerald-400" /> Copiato!</> : <><Copy className="h-3 w-3 mr-1" /> Copia</>}
                            </Button>
                            <Button size="sm" onClick={shareReferralLink} className="bg-pink-500 hover:bg-pink-600 text-white text-xs">
                              <Share2 className="h-3 w-3 mr-1" /> Invia
                            </Button>
                          </div>
                        )}
                      </div>
                      {referralCode && (
                        <div className="mt-3 p-3 bg-pink-950/30 rounded-lg border border-pink-500/20">
                          <p className="text-xs text-pink-300 font-medium mb-1">Il tuo link referral:</p>
                          <p className="text-xs text-pink-400 break-all font-mono bg-slate-900/50 p-2 rounded">
                            {`${window.location.origin}/#/register?ref=${referralCode}`}
                          </p>
                          <div className="mt-2 text-xs text-pink-400 flex gap-4">
                            <span>🎁 Tu ricevi <strong>TCC</strong> per ogni invito</span>
                            <span>👋 Il tuo amico riceve <strong>TCC</strong> di benvenuto</span>
                            <span>🛒 Bonus <strong>TCC</strong> al primo acquisto</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Statistiche - Desktop DARK */}
              {ecoCreditsEnabled && (
                <Card className="border border-slate-700/50 bg-slate-800/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                      Le Tue Statistiche
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30">
                        <p className="text-3xl font-bold text-emerald-400">{walletData?.balance || 0}</p>
                        <p className="text-xs text-emerald-300/70">TCC Totali</p>
                      </div>
                      <div className="text-center p-4 rounded-xl border border-blue-500/30 bg-blue-950/30">
                        <p className="text-3xl font-bold text-blue-400">{((walletData?.balance || 0) * 0.089).toFixed(2)}€</p>
                        <p className="text-xs text-blue-300/70">Valore in Euro</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* POI Vicini - Desktop DARK */}
              {ecoCreditsEnabled && (
                <Card className="border border-emerald-500/20 bg-slate-800/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <MapPin className="h-5 w-5 text-emerald-400" />
                      Luoghi Vicini
                      {gpsLoading && <Loader2 className="h-4 w-4 animate-spin ml-2 text-emerald-400" />}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {currentPosition 
                        ? `Posizione rilevata (precisione: ${Math.round(currentPosition.accuracy)}m)`
                        : 'Rilevamento posizione in corso...'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasUnvisitedPOIs && nearbyPOIs.filter(p => !p.already_visited_today)[0] && (
                      <div className="mb-4">
                        <NearbyPOIBanner 
                          poi={nearbyPOIs.filter(p => !p.already_visited_today)[0]}
                          onTap={() => {
                            setSelectedPOI(nearbyPOIs.filter(p => !p.already_visited_today)[0]);
                            setShowPOIPopup(true);
                          }}
                        />
                      </div>
                    )}
                    {permissionStatus === 'denied' && (
                      <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">
                        <strong>Permesso GPS negato.</strong> Abilita la geolocalizzazione nelle impostazioni del browser.
                      </div>
                    )}
                    {gpsError && (
                      <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-400 text-sm mb-4">{gpsError}</div>
                    )}
                    {nearbyPOIs.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-slate-400">{unvisitedCount} luoghi da visitare ({totalTCCAvailable} TCC disponibili)</p>
                          <Button variant="ghost" size="sm" onClick={refreshPosition} disabled={gpsLoading} className="text-slate-400 hover:text-white">
                            <RefreshCw className={`h-4 w-4 ${gpsLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        <NearbyPOIList 
                          pois={nearbyPOIs}
                          onSelectPOI={(poi) => { setSelectedPOI(poi); setShowPOIPopup(true); }}
                          isLoading={gpsLoading}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <MapPin className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                        <p className="text-slate-400">Nessun luogo nelle vicinanze</p>
                        <p className="text-sm text-slate-500">Avvicinati a un museo, monumento o fermata</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Come Funziona - Desktop DARK */}
              <Card className="border border-emerald-500/20 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Award className="h-5 w-5 text-emerald-400" />
                    Come Funziona
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-400">
                    Il programma ECO CREDIT ti premia per le tue azioni sostenibili con <strong className="text-white">Token Commercio Circolare (TCC)</strong>, 
                    che puoi spendere nei negozi aderenti del territorio.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-blue-500/20 bg-blue-950/20">
                      <Bus className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-300">Mobilità Sostenibile</p>
                        <p className="text-sm text-blue-400/60">Guadagna TCC usando bus, bici o camminando. Rilevamento automatico vicino alle fermate.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-purple-500/20 bg-purple-950/20">
                      <Award className="h-5 w-5 text-purple-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-purple-300">Cultura & Turismo</p>
                        <p className="text-sm text-purple-400/60">Visita musei, monumenti e luoghi culturali del territorio per ricevere TCC.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-950/20">
                      <Store className="h-5 w-5 text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-300">Acquisti Locali</p>
                        <p className="text-sm text-amber-400/60">Compra nei negozi aderenti e ricevi TCC come cashback sostenibile.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-orange-500/20 bg-orange-950/20">
                      <TrendingUp className="h-5 w-5 text-orange-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-300">Segnalazioni Civiche</p>
                        <p className="text-sm text-orange-400/60">Segnala problemi alla PA e ricevi TCC quando vengono risolti.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-pink-500/20 bg-pink-950/20">
                      <Gift className="h-5 w-5 text-pink-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-pink-300">Presenta un Amico</p>
                        <p className="text-sm text-pink-400/60">Invita amici e guadagna TCC per ogni registrazione.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comuni con Hub Attivo - Desktop DARK - SCROLL ORIZZONTALE */}
              {activeComuni.length > 0 && (
                <Card className="border border-emerald-500/20 bg-slate-800/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Landmark className="h-5 w-5 text-emerald-400" />
                      Comuni con Hub Attivo
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">{activeComuni.length}</span>
                    </CardTitle>
                    <CardDescription className="text-slate-400">Il programma ECO CREDIT è disponibile in questi comuni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory" style={{scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch'}}>
                      {activeComuni.map((c) => (
                        <div key={c.id} className="flex-shrink-0 w-[200px] snap-start rounded-xl border border-slate-600/40 bg-slate-900/60 p-4 space-y-3 hover:border-emerald-500/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10">
                              <Landmark className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{c.nome}</p>
                              {c.provincia && <p className="text-[10px] text-slate-400">({c.provincia})</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className={`h-2.5 w-2.5 rounded-full ${c.civic ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[10px] ${c.civic ? 'text-emerald-400' : 'text-slate-500'}`}>Civic</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`h-2.5 w-2.5 rounded-full ${c.mobility ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[10px] ${c.mobility ? 'text-blue-400' : 'text-slate-500'}`}>Mobilità</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`h-2.5 w-2.5 rounded-full ${c.culture ? 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[10px] ${c.culture ? 'text-purple-400' : 'text-slate-500'}`}>Cultura</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`h-2.5 w-2.5 rounded-full ${c.shopping ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' : 'bg-slate-600'}`} />
                              <span className={`text-[10px] ${c.shopping ? 'text-amber-400' : 'text-slate-500'}`}>Shopping</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Privacy e GPS - Desktop DARK */}
              <Card className="border border-slate-700/50 bg-slate-800/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-300">
                    📍 Informativa GPS e Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    Attivando il programma ECO CREDIT, autorizzi l'app a utilizzare la tua posizione GPS per rilevare fermate bus/tram, 
                    musei, luoghi culturali e percorsi sostenibili. <strong className="text-slate-400">La posizione viene rilevata solo quando apri l'app</strong>, 
                    non in background. I tuoi dati sono trattati in conformità al GDPR e non vengono condivisi con terze parti.
                  </p>
                </CardContent>
              </Card>
            </div>{/* Fine layout desktop */}

          </TabsContent>

        </Tabs>
      </div>

      {/* BottomNav nascosto su mobile */}
      <div className="hidden sm:block">
        <BottomNav />
      </div>
      
      {/* Popup Check-in POI */}
      <NearbyPOIPopup
        poi={selectedPOI}
        isOpen={showPOIPopup}
        onClose={() => {
          setShowPOIPopup(false);
          setSelectedPOI(null);
        }}
        onCheckin={doCheckin}
        isLoading={gpsLoading}
      />
    </div>
  );
}
