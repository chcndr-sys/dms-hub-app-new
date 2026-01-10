import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  const [activeTab, setActiveTab] = useState<'cliente' | 'impresa'>('cliente');
  
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
  
  // Riscatto state
  const [redeemAmount, setRedeemAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<any>(null);

  // Per demo, usiamo userId 30 (Anna Neri Test) e shopId 1 (Banco Frutta BIO Mario)
  const userId = 30;
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
  const resetScanner = () => {
    setQrInput('');
    setCitizenInfo(null);
    setScanResult(null);
    setEuroSpent('');
    setTransportMode('');
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchWalletData();
  }, []);

  useEffect(() => {
    if (activeTab === 'impresa') {
      fetchMerchantData();
    }
  }, [activeTab]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const balance = walletData?.balance || 0;
  const co2Saved = Math.round(balance * 0.5);
  const treesEquivalent = Math.round(co2Saved / 22);

  const getLevel = (balance: number) => {
    if (balance >= 500) return { name: 'Oro', color: 'amber', percentile: 'Top 5%' };
    if (balance >= 200) return { name: 'Argento', color: 'gray', percentile: 'Top 20%' };
    if (balance >= 50) return { name: 'Bronzo', color: 'orange', percentile: 'Top 50%' };
    return { name: 'Starter', color: 'blue', percentile: 'Benvenuto!' };
  };

  const level = getLevel(balance);

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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-4 shadow-lg">
        <div className="w-full px-4 md:px-8 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Wallet Carbon Credit</h1>
              <p className="text-xs text-white/70">
                {activeTab === 'cliente' ? walletData?.user?.name || 'I tuoi eco-crediti' : merchantData?.name || 'Area Commerciante'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Selector */}
      <div className="w-full px-4 md:px-8 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cliente' | 'impresa')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cliente" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Cliente
            </TabsTrigger>
            <TabsTrigger value="impresa" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Impresa
            </TabsTrigger>
          </TabsList>

          {/* ================================================================ */}
          {/* TAB CLIENTE */}
          {/* ================================================================ */}
          <TabsContent value="cliente" className="space-y-6 mt-4">
            {/* Saldo Principale */}
            <Card className="bg-gradient-to-br from-primary via-primary/90 to-emerald-600 text-primary-foreground border-0 shadow-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Wallet className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-primary-foreground text-xl">Saldo TCC</CardTitle>
                    <CardDescription className="text-primary-foreground/70">Token Carbon Credit</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-7xl font-bold mb-2">{balance}</div>
                <p className="text-primary-foreground/80">crediti disponibili (€{(balance * 0.01).toFixed(2)})</p>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
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
              <CardContent className="flex flex-col items-center">
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

            {/* Impatto Ambientale */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/5">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Leaf className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-green-600">{co2Saved} kg</div>
                  <div className="text-sm text-muted-foreground font-medium">CO₂ Evitata</div>
                  <p className="text-xs text-muted-foreground mt-2">Equivalente a {treesEquivalent} alberi</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-amber-600">{level.name}</div>
                  <div className="text-sm text-muted-foreground font-medium">Livello</div>
                  <p className="text-xs text-muted-foreground mt-2">{level.percentile}</p>
                </CardContent>
              </Card>
            </div>

            {/* Storico Transazioni */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Storico Transazioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Nessuna transazione ancora</p>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString('it-IT', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className={`text-lg font-semibold ${tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                          {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* TAB IMPRESA */}
          {/* ================================================================ */}
          <TabsContent value="impresa" className="space-y-6 mt-4">
            {loadingMerchant ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Saldo Commerciante */}
                <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <Store className="h-8 w-8" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-xl">{merchantData?.name || 'Commerciante'}</CardTitle>
                        <CardDescription className="text-white/70">TCC da riscattare</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-6xl font-bold mb-2">{merchantData?.pending_tcc || 0}</div>
                    <p className="text-white/80 text-lg">= €{merchantData?.pending_eur || '0.00'}</p>
                    <p className="text-white/60 text-sm mt-2">
                      Totale rimborsato: {merchantData?.total_reimbursed_tcc || 0} TCC (€{merchantData?.total_reimbursed_eur || '0.00'})
                    </p>
                  </CardContent>
                </Card>

                {/* Scanner QR Code */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Scansiona QR Cliente
                    </CardTitle>
                    <CardDescription>Inserisci il codice QR del cliente per assegnare TCC</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!citizenInfo ? (
                      <>
                        <div className="space-y-2">
                          <Label>Codice QR</Label>
                          <Input
                            placeholder="tcc://30/abc123..."
                            value={qrInput}
                            onChange={(e) => handleQRInput(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                        <Button onClick={() => validateQR(qrInput)} disabled={!qrInput || validating} className="w-full">
                          {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                          {validating ? 'Validazione...' : 'Valida QR Code'}
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Cliente Verificato */}
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                            <span className="font-semibold text-green-700">Cliente Verificato</span>
                          </div>
                          <p className="font-medium">{citizenInfo.name}</p>
                          <p className="text-sm text-muted-foreground">{citizenInfo.email}</p>
                          <p className="text-sm mt-2">Saldo: <strong>{citizenInfo.wallet_balance} TCC</strong></p>
                        </div>

                        {/* Form Assegnazione */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Tipo di guadagno</Label>
                            <Select value={earnType} onValueChange={setEarnType}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="purchase_bio">🌱 Acquisto BIO (2 TCC/€)</SelectItem>
                                <SelectItem value="purchase_km0">📍 Acquisto KM0 (3 TCC/€)</SelectItem>
                                <SelectItem value="checkin">📍 Check-in Mercato</SelectItem>
                                <SelectItem value="generic">🛒 Acquisto Generico (1 TCC/€)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {earnType === 'checkin' ? (
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { mode: 'walk', icon: Footprints, label: 'A piedi', bonus: '+8' },
                                { mode: 'bike', icon: Bike, label: 'Bici', bonus: '+5' },
                                { mode: 'public', icon: Bus, label: 'Bus', bonus: '+3' },
                                { mode: '', icon: null, label: 'Auto', bonus: '+0', emoji: '🚗' }
                              ].map(({ mode, icon: Icon, label, bonus, emoji }) => (
                                <Button
                                  key={mode}
                                  variant={transportMode === mode ? 'default' : 'outline'}
                                  onClick={() => setTransportMode(mode)}
                                  className="flex flex-col h-auto py-2"
                                >
                                  {Icon ? <Icon className="h-4 w-4 mb-1" /> : <span className="text-lg mb-1">{emoji}</span>}
                                  <span className="text-xs">{label}</span>
                                  <span className="text-xs text-muted-foreground">{bonus}</span>
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label>Importo speso (€)</Label>
                              <Input
                                type="number"
                                placeholder="25.00"
                                value={euroSpent}
                                onChange={(e) => setEuroSpent(e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </div>
                          )}

                          <div className="p-4 bg-primary/10 rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">TCC da assegnare</p>
                            <p className="text-4xl font-bold text-primary">{getEstimatedTCC()}</p>
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" onClick={resetScanner} className="flex-1">Annulla</Button>
                            <Button onClick={assignTCC} disabled={scanning || getEstimatedTCC() === 0} className="flex-1">
                              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                              Assegna {getEstimatedTCC()} TCC
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Risultato Scansione */}
                    {scanResult && (
                      <div className={`p-4 rounded-lg ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                        <div className="flex items-center gap-3">
                          {scanResult.success ? (
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                          ) : (
                            <XCircle className="h-8 w-8 text-red-600" />
                          )}
                          <div>
                            <p className={`font-semibold ${scanResult.success ? 'text-green-700' : 'text-red-700'}`}>
                              {scanResult.success ? scanResult.message : 'Errore'}
                            </p>
                            {!scanResult.success && <p className="text-sm text-red-600">{scanResult.error}</p>}
                          </div>
                        </div>
                        {scanResult.success && (
                          <Button onClick={resetScanner} variant="outline" className="w-full mt-3">
                            Scansiona altro cliente
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Riscatto TCC */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Euro className="h-5 w-5" />
                      Riscatta TCC in Euro
                    </CardTitle>
                    <CardDescription>Converti i tuoi TCC in Euro sul tuo conto</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Importo TCC da riscattare</Label>
                      <Input
                        type="number"
                        placeholder={`Max: ${merchantData?.pending_tcc || 0}`}
                        value={redeemAmount}
                        onChange={(e) => setRedeemAmount(e.target.value)}
                        max={merchantData?.pending_tcc || 0}
                        min="1"
                      />
                      {redeemAmount && (
                        <p className="text-sm text-muted-foreground">
                          = €{(parseInt(redeemAmount) * 0.01).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>IBAN</Label>
                      <Input
                        placeholder="IT60X0542811101000000123456"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                      />
                    </div>

                    <Button 
                      onClick={redeemTCC} 
                      disabled={redeeming || !redeemAmount || parseInt(redeemAmount) > (merchantData?.pending_tcc || 0)}
                      className="w-full"
                    >
                      {redeeming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 mr-2" />}
                      {redeeming ? 'Elaborazione...' : `Riscatta €${redeemAmount ? (parseInt(redeemAmount) * 0.01).toFixed(2) : '0.00'}`}
                    </Button>

                    {redeemResult && (
                      <div className={`p-4 rounded-lg ${redeemResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                        {redeemResult.success ? (
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                            <div>
                              <p className="font-semibold text-green-700">{redeemResult.message}</p>
                              <p className="text-sm text-green-600">Bonifico di €{redeemResult.eur_amount} in arrivo</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <XCircle className="h-8 w-8 text-red-600" />
                            <p className="text-red-700">{redeemResult.error}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Storico Rimborsi */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Storico Rimborsi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reimbursements.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">Nessun rimborso ancora</p>
                      ) : (
                        reimbursements.map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">{r.tcc_amount} TCC → €{parseFloat(r.eur_amount).toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {r.status === 'completed' ? 'Completato' : 'In attesa'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
