import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  BarChart3,
  QrCode,
  Wallet,
  TrendingUp,
  Users,
  Leaf,
  LogIn,
  LogOut,
  Camera,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Send,
  Clock,
  AlertCircle,
  ArrowLeft,
  WifiOff
} from 'lucide-react';
import { useLocation, Link } from 'wouter';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

// API Base URL — passa per il proxy Vercel (/api/tcc/* → orchestratore.mio-hub.me)
// Fallback diretto se in sviluppo locale
const API_BASE = import.meta.env.DEV
  ? 'https://orchestratore.mio-hub.me/api/tcc/v2'
  : '/api/tcc/v2';

// API Base URL per il backend principale (Hetzner) — usato per verifica locale qualifiche
const MAIN_API_BASE = import.meta.env.VITE_MIHUB_API_URL || 'https://mihub.157-90-29-66.nip.io';

// Helper: verifica locale qualifiche impresa dal backend principale
// Stessa logica di WalletTCCBadge in MarketCompaniesTab — calcola stato da data_scadenza
async function checkQualificationsLocally(impresaId: number): Promise<{ walletEnabled: boolean; label: string }> {
  try {
    const response = await fetch(`${MAIN_API_BASE}/api/imprese/${impresaId}/qualificazioni`);
    if (!response.ok) return { walletEnabled: false, label: 'Errore verifica' };
    const data = await response.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
      return { walletEnabled: false, label: 'No Qualifiche' };
    }
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const hasExpired = data.data.some((q: any) => {
      // Calcola stato DINAMICAMENTE dalla data di scadenza (stessa logica di CompanyCard)
      // perché il DB potrebbe avere uno stato obsoleto (es. SCADUTA quando in realtà la data è valida)
      const dataScadenza = q.data_scadenza || q.end_date;
      if (dataScadenza) {
        const scadenza = new Date(String(dataScadenza).split('T')[0]);
        scadenza.setHours(23, 59, 59, 999);
        return scadenza < oggi;
      }
      // Solo se non c'è data_scadenza, usa lo stato del DB come fallback
      const stato = (q.stato || q.status || '').toUpperCase();
      return stato === 'SCADUTA';
    });
    if (hasExpired) {
      return { walletEnabled: false, label: 'Qualifiche Scadute' };
    }
    return { walletEnabled: true, label: 'Qualificato' };
  } catch {
    return { walletEnabled: false, label: 'Errore verifica' };
  }
}

// ============================================================================
// WALLET STATUS INDICATOR (v5.7.0)
// Semaforo stato wallet TCC nella barra header
// ============================================================================

interface WalletStatusIndicatorProps {
  operatorId: number;
  impresaId?: number | null;
  authToken: string | null;
  onStatusChange?: (status: 'loading' | 'active' | 'suspended' | 'none' | 'error', impresaName?: string | null) => void;
}

function WalletStatusIndicator({ operatorId, impresaId, authToken, onStatusChange }: WalletStatusIndicatorProps) {
  const [status, setStatus] = useState<'loading' | 'active' | 'suspended' | 'none' | 'error'>('loading');
  const [qualification, setQualification] = useState<any>(null);
  const [impresaName, setImpresaName] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Helper per processare la risposta wallet (restituisce i dati per ulteriori controlli)
  const processWalletResponse = useCallback((data: any): { found: boolean; resolvedImpresaId?: number; denominazione?: string } => {
    if (data.success && data.wallet) {
      if (data.impresa) {
        return {
          found: true,
          resolvedImpresaId: data.impresa.id,
          denominazione: data.impresa.denominazione,
        };
      }
    }
    return { found: false };
  }, []);

  const fetchStatus = useCallback(async () => {
    if ((!operatorId || operatorId <= 0) && !impresaId) {
      setStatus('none');
      onStatusChange?.('none');
      return;
    }

    setStatus('loading');
    try {
      const token = authToken || localStorage.getItem('token') || '';
      let walletFound = false;
      let resolvedImpresaId: number | undefined;
      let denominazione: string | undefined;

      // Tentativo 1: cerca per operatorId (endpoint originale)
      if (operatorId && operatorId > 0) {
        try {
          const response = await fetch(`${API_BASE}/operator/wallet/${operatorId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            const result = processWalletResponse(data);
            if (result.found) {
              walletFound = true;
              resolvedImpresaId = result.resolvedImpresaId;
              denominazione = result.denominazione;
            }
          } else if (response.status >= 500) {
            console.error('Server error fetching operator wallet:', response.status);
            setStatus('error');
            onStatusChange?.('error');
            return;
          }
        } catch (err) {
          console.warn('Operator wallet lookup failed:', err);
        }
      }

      // Tentativo 2: cerca per impresaId (endpoint diretto impresa)
      if (!walletFound && impresaId && impresaId > 0) {
        try {
          const response = await fetch(`${API_BASE}/impresa/${impresaId}/wallet`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            const result = processWalletResponse(data);
            if (result.found) {
              walletFound = true;
              resolvedImpresaId = result.resolvedImpresaId;
              denominazione = result.denominazione;
            }
          }
        } catch (err) {
          console.warn('Impresa wallet lookup failed:', err);
        }
      }

      if (!walletFound) {
        setStatus('none');
        onStatusChange?.('none');
        return;
      }

      // Wallet trovato — ora verifica qualifiche LOCALMENTE dal backend principale
      // Questo evita il problema di dati stale/disconnessi sull'orchestratore
      setImpresaName(denominazione || null);
      const checkId = resolvedImpresaId || (impresaId && impresaId > 0 ? impresaId : null);
      if (checkId) {
        const localCheck = await checkQualificationsLocally(checkId);
        setQualification({ walletEnabled: localCheck.walletEnabled, label: localCheck.label });
        if (localCheck.walletEnabled) {
          setStatus('active');
          onStatusChange?.('active', denominazione || null);
        } else {
          setStatus('suspended');
          onStatusChange?.('suspended', denominazione || null);
        }
      } else {
        // Nessun impresaId disponibile — default attivo (wallet esiste ma non possiamo verificare qualifiche)
        setQualification(null);
        setStatus('active');
        onStatusChange?.('active', denominazione || null);
      }
    } catch (error) {
      console.error('Error fetching wallet status:', error);
      setStatus('error');
      onStatusChange?.('error');
    }
  }, [operatorId, impresaId, authToken, onStatusChange, processWalletResponse]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg">
        <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
        <span className="text-sm font-medium text-white/80">Caricamento...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        onClick={handleRetry}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/40 rounded-lg cursor-pointer hover:bg-red-500/60 transition-colors"
      >
        <WifiOff className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">Disconnesso</span>
        <RefreshCw className="w-3 h-3 text-white/80" />
      </button>
    );
  }

  if (status === 'none') {
    return (
      <button
        onClick={handleRetry}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg cursor-pointer hover:bg-white/30 transition-colors"
      >
        <div className="w-3 h-3 rounded-full bg-gray-400" />
        <Wallet className="w-4 h-4 text-white/60" />
        <span className="text-sm font-medium text-white/60">No Wallet</span>
        <RefreshCw className="w-3 h-3 text-white/40" />
      </button>
    );
  }

  if (status === 'suspended') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-lg shadow-lg">
        <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
        <Wallet className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">
          {impresaName || 'WALLET'} - SOSPESO
        </span>
        {qualification && (
          <span className="text-xs text-white/80">({qualification.label})</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-600 rounded-lg shadow-lg">
      <div className="w-3 h-3 rounded-full bg-white" />
      <Wallet className="w-4 h-4 text-white" />
      <span className="text-sm font-bold text-white">
        {impresaName || 'WALLET'} - ATTIVO
      </span>
    </div>
  );
}

export default function HubOperatore() {
  // Firebase Auth — fonte primaria dei dati utente
  const { user: authUser, isAuthenticated, getToken } = useFirebaseAuth();

  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // Stati per Scanner e TCC
  const [scanMode, setScanMode] = useState<'issue' | 'redeem'>('issue');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [validatedCustomer, setValidatedCustomer] = useState<any>(null);
  const [validatedSpendRequest, setValidatedSpendRequest] = useState<any>(null);
  const [amount, setAmount] = useState<string>('');
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [calculatedCredits, setCalculatedCredits] = useState(0);
  const [co2Saved, setCo2Saved] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Camera Scanner
  const [cameraActive, setCameraActive] = useState(false);
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('manual');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Wallet Operatore
  const [operatorWallet, setOperatorWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tccConfig, setTccConfig] = useState<any>(null);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'issue' | 'redeem' | 'settlement' | 'reimbursement_received'>('all');

  // Nome impresa collegata al wallet (v5.7.0)
  const [impresaNome, setImpresaNome] = useState<string | null>(null);
  // Stato abilitazione wallet (v5.7.0) - false se qualifiche scadute/mancanti
  const [walletEnabled, setWalletEnabled] = useState<boolean>(true);
  // Stato connessione API
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  // Token auth corrente
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Operatore da Firebase Auth (con fallback a localStorage per backward compat)
  // Include impresaId per fallback wallet lookup (v5.8.0)
  const operatore = (() => {
    if (authUser && authUser.miohubId && authUser.miohubId > 0) {
      return {
        id: authUser.miohubId,
        nome: authUser.displayName || 'Operatore',
        negozio: authUser.displayName || 'Negozio',
        ruolo: 'Operatore',
        impresaId: authUser.impresaId || null,
      };
    }
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.id && user.id > 0) {
          return {
            id: user.id,
            nome: user.name || 'Operatore',
            negozio: user.shopName || user.name || 'Negozio',
            ruolo: 'Operatore',
            impresaId: user.impresa_id || null,
          };
        }
      }
    } catch {}
    // Ultimo fallback: prova miohub_firebase_user
    try {
      const fbStr = localStorage.getItem('miohub_firebase_user');
      if (fbStr) {
        const fbUser = JSON.parse(fbStr);
        return {
          id: fbUser.miohubId || 0,
          nome: fbUser.displayName || 'Operatore',
          negozio: fbUser.displayName || 'Negozio',
          ruolo: 'Operatore',
          impresaId: fbUser.impresaId || null,
        };
      }
    } catch {}
    return { id: 0, nome: 'Operatore', negozio: 'Negozio', ruolo: 'Operatore', impresaId: null as number | null };
  })();

  // Recupera il token auth all'avvio e quando cambia l'utente
  useEffect(() => {
    const refreshToken = async () => {
      if (getToken) {
        const token = await getToken();
        setAuthToken(token);
      } else {
        setAuthToken(localStorage.getItem('token'));
      }
    };
    refreshToken();
  }, [authUser, getToken]);

  // Helper per ottenere token corrente
  const getCurrentToken = useCallback(async (): Promise<string> => {
    if (getToken) {
      const token = await getToken();
      if (token) return token;
    }
    return authToken || localStorage.getItem('token') || '';
  }, [getToken, authToken]);

  // Carica dati iniziali quando abbiamo un operatore valido e il token
  useEffect(() => {
    if (operatore.id > 0 || operatore.impresaId) {
      loadOperatorWallet();
      loadTransactions();
    }
    loadTccConfig();
  }, [operatore.id, operatore.impresaId, authToken]);

  // Calcolo automatico crediti
  useEffect(() => {
    const val = parseFloat(amount) || 0;
    const multiplier = 1 + (selectedCerts.length * 0.2);
    const credits = Math.floor(val * multiplier);
    setCalculatedCredits(credits);
    setCo2Saved(parseFloat((credits * 0.05).toFixed(2)));
  }, [amount, selectedCerts]);

  const loadOperatorWallet = async () => {
    if (operatore.id <= 0 && !operatore.impresaId) return;
    try {
      const token = await getCurrentToken();
      let data: any = null;

      // Tentativo 1: cerca per operatorId
      if (operatore.id > 0) {
        try {
          const res = await fetch(`${API_BASE}/operator/wallet/${operatore.id}?_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            data = await res.json();
            if (!data.success || !data.wallet) data = null;
          } else if (res.status >= 500) {
            setApiConnected(false);
            return;
          }
        } catch (err) {
          console.warn('Operator wallet fetch failed:', err);
        }
      }

      // Tentativo 2: cerca per impresaId (fallback v5.8.0)
      if (!data && operatore.impresaId) {
        try {
          const res = await fetch(`${API_BASE}/impresa/${operatore.impresaId}/wallet?_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            data = await res.json();
            if (!data.success || !data.wallet) data = null;
          }
        } catch (err) {
          console.warn('Impresa wallet fetch failed:', err);
        }
      }

      if (data && data.success) {
        setApiConnected(true);
        setOperatorWallet(data.wallet);
        if (data.impresa?.denominazione) {
          setImpresaNome(data.impresa.denominazione);
        }
        // Verifica qualifiche LOCALMENTE dal backend principale (stessa logica del semaforo card imprese)
        const checkId = data.impresa?.id || operatore.impresaId;
        if (checkId) {
          const localCheck = await checkQualificationsLocally(checkId);
          setWalletEnabled(localCheck.walletEnabled);
        } else {
          setWalletEnabled(data.qualification?.walletEnabled ?? true);
        }
      } else {
        setApiConnected(true);
      }
    } catch (error) {
      console.error('Errore caricamento wallet:', error);
      setApiConnected(false);
    }
  };

  const loadTransactions = async () => {
    if (operatore.id <= 0 && !operatore.impresaId) return;
    try {
      const token = await getCurrentToken();
      let data: any = null;

      // Tentativo 1: transazioni per operatorId
      if (operatore.id > 0) {
        try {
          const res = await fetch(`${API_BASE}/operator/transactions/${operatore.id}?limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            data = await res.json();
          }
        } catch (err) {
          console.warn('Operator transactions fetch failed:', err);
        }
      }

      // Tentativo 2: transazioni per impresaId (fallback v5.8.0)
      if ((!data || !data.success || !Array.isArray(data.transactions) || data.transactions.length === 0) && operatore.impresaId) {
        try {
          const res = await fetch(`${API_BASE}/impresa/${operatore.impresaId}/wallet/transactions?limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            data = await res.json();
          }
        } catch (err) {
          console.warn('Impresa transactions fetch failed:', err);
        }
      }

      if (data && data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Errore caricamento transazioni:', error);
      setTransactions([]);
    }
  };

  const loadTccConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setTccConfig(data.config);
      }
    } catch (error) {
      console.error('Errore caricamento config:', error);
    }
  };

  const handleCheckIn = () => {
    const now = new Date().toLocaleTimeString('it-IT');
    setCheckInTime(now);
    setIsCheckedIn(true);
    toast.success('Check-in effettuato con successo');
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
    toast.info('Check-out effettuato');
  };

  const toggleCert = (cert: string) => {
    setSelectedCerts(prev => 
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  // Valida QR Code cliente (per assegnazione TCC)
  const validateCustomerQR = async (qrData: string) => {
    try {
      const token = await getCurrentToken();
      const qrValidateUrl = import.meta.env.DEV
        ? 'https://orchestratore.mio-hub.me/api/tcc/validate-qr'
        : '/api/tcc/validate-qr';
      const res = await fetch(qrValidateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_data: qrData })
      });
      const data = await res.json();
      if (data.success && data.valid) {
        setValidatedCustomer(data.citizen);
        toast.success(`Cliente verificato: ${data.citizen.name}`);
        return true;
      } else {
        toast.error(data.error || 'QR Code non valido');
        return false;
      }
    } catch (error) {
      toast.error('Errore validazione QR');
      return false;
    }
  };

  // Assegna TCC al cliente
  const handleIssueCredits = async () => {
    if (!scannedData || !validatedCustomer) {
      toast.error('Scansiona prima il QR del cliente');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getCurrentToken();
      const res = await fetch(`${API_BASE}/operator/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          operator_id: operatore.id,
          qr_data: scannedData,
          euro_amount: parseFloat(amount),
          certifications: selectedCerts,
          timestamp: Date.now(),
        })
      });
      const data = await res.json();
      
      if (data.success) {
        const txNum = data.transaction?.transaction_number || '';
        toast.success(data.message, {
          description: `${txNum ? `#${txNum} - ` : ''}Nuovo saldo cliente: ${data.citizen.new_balance} TCC`
        });
        // Reset form
        setAmount('');
        setSelectedCerts([]);
        setScannedData(null);
        setValidatedCustomer(null);
        // Ricarica dati con piccolo delay per evitare race condition
        setTimeout(() => {
          loadOperatorWallet();
          loadTransactions();
        }, 500);
      } else {
        toast.error(data.error || 'Errore assegnazione TCC');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  // Incassa TCC dal cliente (riscatto)
  const handleRedeemSpend = async () => {
    if (!scannedData) {
      toast.error('Scansiona il QR di spesa del cliente');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getCurrentToken();
      const res = await fetch(`${API_BASE}/operator/redeem-spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          operator_id: operatore.id,
          qr_data: scannedData,
          timestamp: Date.now(),
        })
      });
      const data = await res.json();
      
      if (data.success) {
        const txNum = data.transaction?.transaction_number || '';
        toast.success(data.message, {
          description: txNum ? `#${txNum}` : undefined
        });
        setScannedData(null);
        setValidatedSpendRequest(null);
        // Ricarica dati con piccolo delay per evitare race condition
        setTimeout(() => {
          loadOperatorWallet();
          loadTransactions();
        }, 500);
      } else {
        toast.error(data.error || 'Errore incasso TCC');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  // Chiusura giornaliera
  const handleSettlement = async () => {
    if (!window.confirm('Confermi la chiusura giornaliera? I TCC riscattati verranno inviati al fondo per il rimborso.')) {
      return;
    }

    setIsLoading(true);
    try {
      const token = await getCurrentToken();
      const res = await fetch(`${API_BASE}/operator/settlement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ operator_id: operatore.id })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        // Usa i dati del nuovo wallet dalla risposta se disponibili
        if (data.new_wallet) {
          setOperatorWallet({
            ...data.new_wallet,
            id: 0, // Sarà aggiornato dal reload
            operator_id: operatore.id,
            difference: 0,
            difference_eur: '0.00',
            redeemed_eur: '0.00',
            exchange_rate: operatorWallet?.exchange_rate || 0.089,
            impresa_id: operatorWallet?.impresa_id,
            wallet_status: 'active'
          });
        }
        // Ricarica anche dal server dopo un breve delay per conferma
        setTimeout(() => {
          loadOperatorWallet();
          loadTransactions();
        }, 500);
      } else {
        toast.error(data.error || 'Errore chiusura giornaliera');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  // Avvia scanner camera
  const startCameraScanner = async () => {
    try {
      if (!scannerContainerRef.current) {
        console.error('Scanner container not found');
        toast.error('Errore: container scanner non trovato');
        return;
      }
      
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
            // QR box più grande per cattura più facile
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7);
            return { width: qrboxSize, height: qrboxSize };
          },
          aspectRatio: 1.0,
          disableFlip: false
        },
        async (decodedText) => {
          // QR Code scansionato con successo
          toast.success('QR Code letto!');
          setScannedData(decodedText);
          
          if (scanMode === 'issue') {
            await validateCustomerQR(decodedText);
          } else {
            // Valida QR di spesa e recupera info cliente
            await validateSpendQR(decodedText);
          }
          
          await stopCameraScanner();
          setInputMode('manual');
        },
        (errorMessage) => {
          // Ignora errori di scansione continua (normale)
        }
      );
      setCameraActive(true);
    } catch (err) {
      console.error('Errore avvio camera:', err);
      toast.error('Errore avvio fotocamera: ' + (err as Error).message);
      setInputMode('manual');
    }
  };

  // Ferma scanner camera
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
    if (inputMode === 'camera' && !validatedCustomer && !scannedData) {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
  }, [inputMode, validatedCustomer, scannedData]);

  // Valida QR di spesa e recupera info cliente
  const validateSpendQR = async (qrData: string) => {
    try {
      const token = await getCurrentToken();
      const res = await fetch(`${API_BASE}/operator/validate-spend-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ qr_data: qrData })
      });
      const data = await res.json();
      
      if (data.success) {
        setValidatedSpendRequest({
          customer: data.customer,
          spend: data.spend_request
        });
        toast.success(`Cliente verificato: ${data.customer.name}`);
      } else {
        toast.error(data.error || 'QR non valido');
        setScannedData(null);
        setValidatedSpendRequest(null);
      }
    } catch (error) {
      toast.error('Errore validazione QR');
      setScannedData(null);
      setValidatedSpendRequest(null);
    }
  };

  // Input manuale QR
  const handleManualQRInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const qrInput = formData.get('qrInput') as string;
    
    if (!qrInput) return;
    
    setScannedData(qrInput);
    
    if (scanMode === 'issue') {
      await validateCustomerQR(qrInput);
    } else {
      // Valida QR di spesa e recupera info cliente
      await validateSpendQR(qrInput);
    }
    
    setIsScanning(false);
  };

  // Verifica se arriviamo dalla HomePage
  const [location] = useLocation();
  const fromHome = location.includes('/hub-operatore');

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e8fbff]">
      {/* Torna alla Home */}
      <div className="w-full px-2 pt-4">
        <Link href="/" className="inline-flex items-center gap-2 text-[#4fd1c5] hover:text-[#81e6d9] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Torna alla Home</span>
        </Link>
      </div>
      
      {/* Banner connessione API */}
      {apiConnected === false && (
        <div className="bg-red-600/90 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-white" />
            <span className="text-sm text-white">API TCC non raggiungibile — Verifica la connessione</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => { loadOperatorWallet(); loadTransactions(); loadTccConfig(); }}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Riprova
          </Button>
        </div>
      )}

      {/* Banner utente non autenticato */}
      {operatore.id <= 0 && (
        <div className="bg-amber-600/90 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-white" />
          <span className="text-sm text-white">Effettua il login per accedere al wallet TCC</span>
          <Link href="/login" className="text-white underline text-sm ml-2">Accedi</Link>
        </div>
      )}

      {/* Header (v4.3.3 - fix mobile overflow + dati corretti) */}
      <header className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] p-3 sm:p-4 shadow-lg mt-2">
        <div className="w-full px-1 sm:px-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">HUB Operatore</h1>
            </div>
            {/* Semaforo Wallet TCC (v5.7.0 + v5.8.0 fallback impresaId) */}
            <WalletStatusIndicator
              operatorId={operatore.id}
              impresaId={operatore.impresaId}
              authToken={authToken}
              onStatusChange={(status, name) => {
                if (name) setImpresaNome(name);
                setApiConnected(status !== 'error');
              }}
            />
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{impresaNome || operatore.nome}</p>
          </div>
        </div>
      </header>

      <div className="w-full px-0 sm:px-2 py-4 space-y-4">
        {/* Gestione Presenze RIMOSSO in v4.3.4 — residuo non necessario */}

        {/* Statistiche Giornaliere (v4.3.6 - card più larghe, font più grande) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 sm:gap-4">
          <Card className="bg-[#1e293b] border-[#334155] overflow-hidden rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4">
              <p className="text-sm sm:text-sm text-[#94a3b8]">Vendite Oggi</p>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xl sm:text-2xl font-bold text-[#e8fbff] truncate">
                  €{parseFloat(operatorWallet?.euro_sales || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#10b981] flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155] overflow-hidden rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4">
              <p className="text-sm sm:text-sm text-[#94a3b8]">TCC Rilasciati</p>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xl sm:text-2xl font-bold text-[#14b8a6] truncate">
                  {operatorWallet?.tcc_issued || 0}
                </p>
                <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#14b8a6] flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155] overflow-hidden rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4">
              <p className="text-sm sm:text-sm text-[#94a3b8]">TCC Riscattati</p>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xl sm:text-2xl font-bold text-[#f59e0b] truncate">
                  {operatorWallet?.tcc_redeemed || 0}
                </p>
                <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#f59e0b] flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155] overflow-hidden rounded-md sm:rounded-lg py-0 sm:py-6 gap-0 sm:gap-6">
            <CardContent className="p-3 sm:p-4">
              <p className="text-sm sm:text-sm text-[#94a3b8]">Differenza</p>
              <div className="flex items-center justify-between gap-1">
                <p className="text-xl sm:text-2xl font-bold text-[#10b981] truncate">
                  {operatorWallet?.difference || 0}
                </p>
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-[#10b981] flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Funzionalita (v4.3.3 - fix mobile text truncation) */}
        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#1e293b]">
            <TabsTrigger value="scanner" className="data-[state=active]:bg-[#f97316] text-xs sm:text-sm px-1 sm:px-3">
              <QrCode className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Scanner</span>
            </TabsTrigger>
            <TabsTrigger value="transazioni" className="data-[state=active]:bg-[#f97316] text-xs sm:text-sm px-1 sm:px-3">
              <BarChart3 className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Transazioni</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-[#f97316] text-xs sm:text-sm px-1 sm:px-3">
              <Wallet className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Wallet</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Scanner QR */}
          <TabsContent value="scanner" className="space-y-4">
            {/* Toggle Modalita */}
            <div className="flex gap-2">
              <Button
                variant={scanMode === 'issue' ? 'default' : 'outline'}
                className={scanMode === 'issue' ? 'bg-[#10b981] hover:bg-[#059669]' : 'border-[#334155]'}
                onClick={() => { setScanMode('issue'); setScannedData(null); setValidatedCustomer(null); }}
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Assegna TCC
              </Button>
              <Button
                variant={scanMode === 'redeem' ? 'default' : 'outline'}
                className={scanMode === 'redeem' ? 'bg-[#f59e0b] hover:bg-[#d97706]' : 'border-[#334155]'}
                onClick={() => { setScanMode('redeem'); setScannedData(null); setValidatedCustomer(null); }}
              >
                <ArrowDownCircle className="w-4 h-4 mr-2" />
                Incassa TCC
              </Button>
            </div>

            <Card className="bg-[#1e293b] border-[#334155] py-0 sm:py-6 gap-0 sm:gap-6 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-[#e8fbff]">
                  {scanMode === 'issue' ? 'Assegna TCC al Cliente' : 'Incassa TCC dal Cliente'}
                </CardTitle>
                <CardDescription className="text-[#94a3b8]">
                  {scanMode === 'issue' 
                    ? 'Inserisci importo, poi scansiona il QR del cliente' 
                    : 'Scansiona il QR di spesa generato dal cliente'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-2 sm:px-6">
                
                {/* Form Importo (solo per issue) */}
                {scanMode === 'issue' && (
                  <div className="space-y-4 p-4 bg-[#0b1220] rounded-lg">
                    <div>
                      <label className="text-sm text-[#94a3b8]">Importo Vendita (EUR)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full mt-1 px-3 py-3 bg-[#1e293b] border border-[#334155] rounded-md text-[#e8fbff] text-xl font-bold focus:outline-none focus:border-[#14b8a6]"
                        autoComplete="off"
                        data-form-type="other"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-[#94a3b8] mb-2 block">Certificazioni (+20% cad.)</label>
                      <div className="flex flex-wrap gap-2">
                        {['BIO', 'KM0', 'Fair Trade', 'DOP'].map(cert => (
                          <Badge 
                            key={cert}
                            onClick={() => toggleCert(cert)}
                            className={`cursor-pointer transition-all ${
                              selectedCerts.includes(cert) 
                                ? 'bg-[#14b8a6] hover:bg-[#0d9488] ring-2 ring-white/20' 
                                : 'bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8]'
                            }`}
                          >
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-[#14b8a6]/10 border border-[#14b8a6]/30 rounded-md">
                      <p className="text-sm text-[#94a3b8]">TCC da Assegnare</p>
                      <p className="text-3xl font-bold text-[#14b8a6]">{calculatedCredits} TCC</p>
                      <p className="text-xs text-[#94a3b8] mt-1">CO2 risparmiata: {co2Saved} kg</p>
                    </div>
                  </div>
                )}

                {/* Toggle Camera/Manual */}
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={inputMode === 'camera' ? 'default' : 'outline'}
                    onClick={() => setInputMode('camera')}
                    className={`flex-1 ${inputMode === 'camera' ? 'bg-[#f97316] hover:bg-[#ea580c]' : 'border-[#334155]'}`}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Fotocamera
                  </Button>
                  <Button
                    type="button"
                    variant={inputMode === 'manual' ? 'default' : 'outline'}
                    onClick={() => { stopCameraScanner(); setInputMode('manual'); }}
                    className={`flex-1 ${inputMode === 'manual' ? 'bg-[#14b8a6] hover:bg-[#0d9488]' : 'border-[#334155]'}`}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Manuale
                  </Button>
                </div>

                {/* Scanner Section */}
                <div 
                  ref={scannerContainerRef}
                  className="bg-[#0b1220] rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-[#334155] overflow-hidden relative"
                  style={{ minHeight: '350px' }}
                >
                  {inputMode === 'camera' ? (
                    <div className="w-full h-full">
                      <div 
                        id="qr-reader" 
                        className="w-full"
                        style={{ minHeight: '300px' }}
                      ></div>
                      {cameraActive ? (
                        <p className="text-center text-sm text-[#10b981] py-2 font-medium">
                          📷 Fotocamera attiva - Inquadra il QR Code
                        </p>
                      ) : (
                        <p className="text-center text-sm text-[#94a3b8] py-2">
                          Avvio fotocamera...
                        </p>
                      )}
                    </div>
                  ) : validatedCustomer ? (
                    <div className="text-center p-4">
                      <CheckCircle2 className="w-16 h-16 text-[#10b981] mx-auto mb-4" />
                      <p className="text-[#e8fbff] font-medium mb-2">Cliente Verificato</p>
                      <p className="text-lg font-bold text-[#14b8a6]">{validatedCustomer.name}</p>
                      <p className="text-sm text-[#94a3b8]">{validatedCustomer.email}</p>
                      <p className="text-sm text-[#94a3b8] mt-2">Saldo: {validatedCustomer.wallet_balance} TCC</p>
                      <Button 
                        className="mt-4 bg-[#f97316] hover:bg-[#ea580c]"
                        onClick={() => { setScannedData(null); setValidatedCustomer(null); }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Nuovo Cliente
                      </Button>
                    </div>
                  ) : scannedData && scanMode === 'redeem' && validatedSpendRequest ? (
                    <div className="text-center p-4">
                      <CheckCircle2 className="w-16 h-16 text-[#f59e0b] mx-auto mb-4" />
                      <p className="text-[#e8fbff] font-medium mb-2">Cliente Verificato</p>
                      <p className="text-[#14b8a6] text-xl font-bold mb-1">{validatedSpendRequest.customer.name}</p>
                      <p className="text-[#94a3b8] text-sm mb-4">Saldo: {validatedSpendRequest.customer.wallet_balance} TCC</p>
                      
                      <div className="bg-[#1e293b] rounded-lg p-4 mb-4">
                        <p className="text-[#94a3b8] text-sm">TCC da Incassare</p>
                        <p className="text-[#f59e0b] text-3xl font-bold">{validatedSpendRequest.spend.tcc_amount} TCC</p>
                        <p className="text-[#10b981] text-lg font-semibold">€{validatedSpendRequest.spend.euro_amount.toFixed(2)}</p>
                      </div>
                      
                      <Button 
                        className="bg-[#f97316] hover:bg-[#ea580c]"
                        onClick={() => { setScannedData(null); setValidatedSpendRequest(null); }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Nuovo QR
                      </Button>
                    </div>
                  ) : scannedData && scanMode === 'redeem' ? (
                    <div className="text-center p-4">
                      <AlertCircle className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
                      <p className="text-[#e8fbff] font-medium mb-2">QR non valido o scaduto</p>
                      <p className="text-[#94a3b8] text-sm mb-4">Il codice QR potrebbe essere già stato usato o essere scaduto</p>
                      <Button 
                        className="bg-[#f97316] hover:bg-[#ea580c]"
                        onClick={() => { setScannedData(null); setValidatedSpendRequest(null); }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Riprova
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleManualQRInput} className="w-full p-4 space-y-4" autoComplete="off" data-form-type="other">
                      <p className="text-center text-[#94a3b8] mb-4">
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-[#14b8a6]" />
                        Inserisci il codice QR manualmente
                      </p>
                      <input
                        name="qrInput"
                        type="text"
                        placeholder={scanMode === 'issue' ? 'tcc://userId/token' : 'tcc-spend://userId/token'}
                        className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded-md text-[#e8fbff] focus:outline-none focus:border-[#14b8a6]"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                      />
                      <Button type="submit" className="w-full bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] active:scale-95 transition-all duration-150 disabled:opacity-50" disabled={!walletEnabled}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Conferma
                      </Button>
                    </form>
                  )}
                </div>

                {/* Pulsante Azione */}
                {scanMode === 'issue' ? (
                  <Button 
                    className="w-full bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] active:scale-95 transition-all duration-150 disabled:opacity-50 text-lg py-6"
                    onClick={handleIssueCredits}
                    disabled={!validatedCustomer || !amount || parseFloat(amount) <= 0 || isLoading || !walletEnabled}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 mr-2" />
                    )}
                    {isLoading ? 'Invio in corso...' : `Assegna ${calculatedCredits} TCC`}
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] active:scale-95 transition-all duration-150 disabled:opacity-50 text-lg py-6"
                    onClick={handleRedeemSpend}
                    disabled={!scannedData || !validatedSpendRequest || isLoading || !walletEnabled}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 mr-2" />
                    )}
                    {isLoading ? 'Elaborazione...' : validatedSpendRequest ? `Incassa ${validatedSpendRequest.spend.tcc_amount} TCC (€${validatedSpendRequest.spend.euro_amount.toFixed(2)})` : 'Incassa TCC'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Transazioni */}
          <TabsContent value="transazioni" className="space-y-4">
            <Card className="bg-[#1e293b] border-[#334155] py-0 sm:py-6 gap-0 sm:gap-6 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-[#e8fbff]">Storico Transazioni</CardTitle>
                <CardDescription className="text-[#94a3b8]">
                  Tutte le operazioni tracciate del negozio
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {/* Filtri Transazioni */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    size="sm"
                    variant={transactionFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setTransactionFilter('all')}
                    className={transactionFilter === 'all' ? 'bg-[#f97316]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Tutte
                  </Button>
                  <Button
                    size="sm"
                    variant={transactionFilter === 'issue' ? 'default' : 'outline'}
                    onClick={() => setTransactionFilter('issue')}
                    className={transactionFilter === 'issue' ? 'bg-[#14b8a6]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Vendite
                  </Button>
                  <Button
                    size="sm"
                    variant={transactionFilter === 'redeem' ? 'default' : 'outline'}
                    onClick={() => setTransactionFilter('redeem')}
                    className={transactionFilter === 'redeem' ? 'bg-[#f59e0b]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Pagamenti TCC
                  </Button>
                  <Button
                    size="sm"
                    variant={transactionFilter === 'settlement' ? 'default' : 'outline'}
                    onClick={() => setTransactionFilter('settlement')}
                    className={transactionFilter === 'settlement' ? 'bg-[#8b5cf6]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Chiusure
                  </Button>
                  <Button
                    size="sm"
                    variant={transactionFilter === 'reimbursement_received' ? 'default' : 'outline'}
                    onClick={() => setTransactionFilter('reimbursement_received')}
                    className={transactionFilter === 'reimbursement_received' ? 'bg-[#10b981]' : 'border-[#334155] text-[#94a3b8]'}
                  >
                    Rimborsi
                  </Button>
                </div>

                {/* Lista Transazioni */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(!transactions || transactions.length === 0) ? (
                    <p className="text-center text-[#94a3b8] py-8">Nessuna transazione</p>
                  ) : (
                    (transactions || []).filter(tx => transactionFilter === 'all' || tx.type === transactionFilter).map((tx, i) => (
                      <div key={tx.id || i} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center gap-3">
                          {tx.type === 'issue' ? (
                            <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
                              <ArrowUpCircle className="w-4 h-4 text-[#14b8a6]" />
                            </div>
                          ) : tx.type === 'redeem' ? (
                            <div className="w-8 h-8 rounded-full bg-[#f59e0b]/20 flex items-center justify-center">
                              <ArrowDownCircle className="w-4 h-4 text-[#f59e0b]" />
                            </div>
                          ) : tx.type === 'settlement' ? (
                            <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center">
                              <Send className="w-4 h-4 text-[#8b5cf6]" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#10b981]/20 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[#e8fbff]">
                              {tx.type === 'issue' ? tx.customer_name || 'Cliente' :
                               tx.type === 'redeem' ? tx.customer_name || 'Cliente' :
                               tx.type === 'settlement' ? `Chiusura Giornata${tx.description?.startsWith('#') ? ' ' + tx.description.split('|')[0] : ''}` :
                               tx.type === 'reimbursement_received' ? `Rimborso Ricevuto${tx.description?.startsWith('#') ? ' ' + tx.description.split('|')[0] : ''}` :
                               'Rimborso Ricevuto'}
                            </p>
                            {/* Numero progressivo transazione */}
                            {tx.description && tx.description.includes('#TRX-') && (
                              <p className="text-xs text-[#14b8a6] font-mono">
                                #{tx.description.match(/#TRX-(\d{8}-\d{6})/)?.[1]}
                              </p>
                            )}
                            <p className="text-sm text-[#94a3b8]">
                              {new Date(tx.created_at).toLocaleDateString('it-IT')} - {new Date(tx.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <Badge className={`text-xs mt-1 ${
                              tx.type === 'issue' ? 'bg-[#14b8a6]/20 text-[#14b8a6]' :
                              tx.type === 'redeem' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                              tx.type === 'settlement' ? 'bg-[#8b5cf6]/20 text-[#8b5cf6]' :
                              'bg-[#10b981]/20 text-[#10b981]'
                            }`}>
                              {tx.type === 'issue' ? 'Vendita' :
                               tx.type === 'redeem' ? 'Pagamento TCC' :
                               tx.type === 'settlement' ? 'Chiusura' :
                               'Rimborso'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            tx.type === 'reimbursement_received' ? 'text-[#10b981]' :
                            tx.type === 'settlement' ? 'text-[#8b5cf6]' :
                            'text-[#e8fbff]'
                          }`}>
                            {tx.type === 'reimbursement_received' ? '+' : ''}€{parseFloat(tx.euro_amount || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </p>
                          <p className={`text-sm ${
                            tx.type === 'issue' ? 'text-[#14b8a6]' :
                            tx.type === 'redeem' ? 'text-[#f59e0b]' :
                            tx.type === 'settlement' ? 'text-[#8b5cf6]' :
                            'text-[#10b981]'
                          }`}>
                            {tx.type === 'issue' ? '+' : tx.type === 'redeem' ? '-' : ''}{tx.tcc_amount} TCC
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Wallet */}
          <TabsContent value="wallet" className="space-y-4">
            <Card className="bg-[#1e293b] border-[#334155] py-0 sm:py-6 gap-0 sm:gap-6 rounded-none sm:rounded-xl border-x-0 sm:border-x">
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-[#e8fbff]">Wallet Operatore</CardTitle>
                <CardDescription className="text-[#94a3b8]">
                  Riepilogo giornaliero TCC e chiusura cassa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-2 sm:px-6">
                {/* Riepilogo Wallet */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0b1220] rounded-lg">
                    <p className="text-sm text-[#94a3b8]">TCC Rilasciati</p>
                    <p className="text-3xl font-bold text-[#14b8a6]">{operatorWallet?.tcc_issued || 0}</p>
                    <p className="text-xs text-[#94a3b8]">Assegnati ai clienti</p>
                  </div>
                  <div className="p-4 bg-[#0b1220] rounded-lg">
                    <p className="text-sm text-[#94a3b8]">TCC Riscattati</p>
                    <p className="text-3xl font-bold text-[#f59e0b]">{operatorWallet?.tcc_redeemed || 0}</p>
                    <p className="text-xs text-[#94a3b8]">Ricevuti dai clienti</p>
                  </div>
                </div>

                {/* Differenza e Valore */}
                <div className="p-4 bg-[#14b8a6]/10 border border-[#14b8a6]/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-[#94a3b8]">Differenza (Rilasciati - Riscattati)</p>
                      <p className="text-2xl font-bold text-[#e8fbff]">{operatorWallet?.difference || 0} TCC</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#94a3b8]">Valore Riscattati</p>
                      <p className="text-2xl font-bold text-[#10b981]">€{parseFloat(operatorWallet?.redeemed_eur || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                  </div>
                </div>

                {/* Tasso di Cambio */}
                {tccConfig && (
                  <div className="p-3 bg-[#0b1220] rounded-lg flex justify-between items-center">
                    <span className="text-sm text-[#94a3b8]">Tasso di Cambio Attuale</span>
                    <span className="font-bold text-[#e8fbff]">1 TCC = €{parseFloat(tccConfig.effective_rate).toLocaleString('it-IT', {minimumFractionDigits: 4, maximumFractionDigits: 4})}</span>
                  </div>
                )}

                {/* Stato Chiusura */}
                <div className="p-3 bg-[#0b1220] rounded-lg flex justify-between items-center">
                  <span className="text-sm text-[#94a3b8]">Stato Giornata</span>
                  <Badge className={operatorWallet?.settlement_status === 'open' ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}>
                    {operatorWallet?.settlement_status === 'open' ? 'Aperta' : 
                     operatorWallet?.settlement_status === 'pending' ? 'In Elaborazione' : 'Chiusa'}
                  </Badge>
                </div>

                {/* Pulsante Chiusura */}
                <Button 
                  className="w-full bg-[#ef4444] hover:bg-[#dc2626] active:bg-[#b91c1c] active:scale-95 transition-all duration-150 disabled:opacity-50"
                  onClick={handleSettlement}
                  disabled={operatorWallet?.settlement_status !== 'open' || isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Elaborazione...' : 'Chiudi Giornata e Invia al Fondo'}
                </Button>

                <p className="text-xs text-[#94a3b8] text-center">
                  La chiusura inviera i TCC riscattati al fondo per il rimborso in EUR
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
