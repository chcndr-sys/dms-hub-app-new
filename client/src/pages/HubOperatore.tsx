import { useState, useEffect, useRef } from 'react';
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
  Clock
} from 'lucide-react';

// API Base URL
const API_BASE = 'https://orchestratore.mio-hub.me/api/tcc/v2';

export default function HubOperatore() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  
  // Stati per Scanner e TCC
  const [scanMode, setScanMode] = useState<'issue' | 'redeem'>('issue');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [validatedCustomer, setValidatedCustomer] = useState<any>(null);
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

  // Mock data operatore (in futuro da auth)
  const operatore = {
    id: 1,
    nome: 'Luca Bianchi',
    negozio: 'Frutta e Verdura Bio',
    ruolo: 'Operatore',
  };

  // Carica dati iniziali
  useEffect(() => {
    loadOperatorWallet();
    loadTransactions();
    loadTccConfig();
  }, []);

  // Calcolo automatico crediti
  useEffect(() => {
    const val = parseFloat(amount) || 0;
    const multiplier = 1 + (selectedCerts.length * 0.2);
    const credits = Math.floor(val * multiplier);
    setCalculatedCredits(credits);
    setCo2Saved(parseFloat((credits * 0.05).toFixed(2)));
  }, [amount, selectedCerts]);

  const loadOperatorWallet = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/wallet/${operatore.id}`);
      const data = await res.json();
      if (data.success) {
        setOperatorWallet(data.wallet);
      }
    } catch (error) {
      console.error('Errore caricamento wallet:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/transactions/${operatore.id}?limit=20`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
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
      const res = await fetch('https://orchestratore.mio-hub.me/api/tcc/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${API_BASE}/operator/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: operatore.id,
          qr_data: scannedData,
          euro_amount: parseFloat(amount),
          certifications: selectedCerts
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message, {
          description: `Nuovo saldo cliente: ${data.citizen.new_balance} TCC`
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
      const res = await fetch(`${API_BASE}/operator/redeem-spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_id: operatore.id,
          qr_data: scannedData
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setScannedData(null);
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
      const res = await fetch(`${API_BASE}/operator/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_id: operatore.id })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        loadOperatorWallet();
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
      
      console.log('Starting camera scanner...');
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
          disableFlip: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        async (decodedText) => {
          // QR Code scansionato con successo
          console.log('QR Code scansionato:', decodedText);
          toast.success('QR Code letto!');
          setScannedData(decodedText);
          
          if (scanMode === 'issue') {
            await validateCustomerQR(decodedText);
          } else {
            toast.success('QR di spesa rilevato');
          }
          
          await stopCameraScanner();
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
      // Per riscatto, il QR contiene gia i dati necessari
      toast.success('QR di spesa rilevato');
    }
    
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e8fbff]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">HUB Operatore</h1>
            <p className="text-sm text-white/80">{operatore.negozio}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80">{operatore.ruolo}</p>
            <p className="font-semibold text-white">{operatore.nome}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 space-y-6">
        {/* Gestione Presenze */}
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#e8fbff]">
              <Clock className="w-5 h-5" />
              Gestione Presenze
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                {isCheckedIn ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                    <span className="text-[#10b981] font-semibold">Check-in effettuato</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-[#ef4444]" />
                    <span className="text-[#94a3b8]">Non in servizio</span>
                  </div>
                )}
                {checkInTime && (
                  <p className="text-sm text-[#94a3b8] mt-1">Entrata: {checkInTime}</p>
                )}
              </div>
              {!isCheckedIn ? (
                <Button 
                  onClick={handleCheckIn}
                  className="bg-[#10b981] hover:bg-[#059669] text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Check-in
                </Button>
              ) : (
                <Button 
                  onClick={handleCheckOut}
                  variant="destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Check-out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistiche Giornaliere dal Wallet Reale */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <CardDescription className="text-[#94a3b8]">Vendite Oggi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-[#e8fbff]">
                  EUR{operatorWallet?.euro_sales?.toFixed(2) || '0.00'}
                </p>
                <TrendingUp className="w-5 h-5 text-[#10b981]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <CardDescription className="text-[#94a3b8]">TCC Rilasciati</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-[#14b8a6]">
                  {operatorWallet?.tcc_issued || 0}
                </p>
                <ArrowUpCircle className="w-5 h-5 text-[#14b8a6]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <CardDescription className="text-[#94a3b8]">TCC Riscattati</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-[#f59e0b]">
                  {operatorWallet?.tcc_redeemed || 0}
                </p>
                <ArrowDownCircle className="w-5 h-5 text-[#f59e0b]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <CardDescription className="text-[#94a3b8]">Differenza</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-[#10b981]">
                  {operatorWallet?.difference || 0}
                </p>
                <Leaf className="w-5 h-5 text-[#10b981]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Funzionalita */}
        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#1e293b]">
            <TabsTrigger value="scanner" className="data-[state=active]:bg-[#f97316]">
              <QrCode className="w-4 h-4 mr-2" />
              Scanner QR
            </TabsTrigger>
            <TabsTrigger value="vendite" className="data-[state=active]:bg-[#f97316]">
              <BarChart3 className="w-4 h-4 mr-2" />
              Vendite
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-[#f97316]">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
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

            <Card className="bg-[#1e293b] border-[#334155]">
              <CardHeader>
                <CardTitle className="text-[#e8fbff]">
                  {scanMode === 'issue' ? 'Assegna TCC al Cliente' : 'Incassa TCC dal Cliente'}
                </CardTitle>
                <CardDescription className="text-[#94a3b8]">
                  {scanMode === 'issue' 
                    ? 'Inserisci importo, poi scansiona il QR del cliente' 
                    : 'Scansiona il QR di spesa generato dal cliente'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
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
                  ) : scannedData && scanMode === 'redeem' ? (
                    <div className="text-center p-4">
                      <CheckCircle2 className="w-16 h-16 text-[#f59e0b] mx-auto mb-4" />
                      <p className="text-[#e8fbff] font-medium mb-2">QR Spesa Rilevato</p>
                      <code className="bg-[#1e293b] px-2 py-1 rounded text-xs text-[#94a3b8] block overflow-hidden text-ellipsis">
                        {scannedData}
                      </code>
                      <Button 
                        className="mt-4 bg-[#f97316] hover:bg-[#ea580c]"
                        onClick={() => { setScannedData(null); }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Nuovo QR
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleManualQRInput} className="w-full p-4 space-y-4">
                      <p className="text-center text-[#94a3b8] mb-4">
                        <QrCode className="w-8 h-8 mx-auto mb-2 text-[#14b8a6]" />
                        Inserisci il codice QR manualmente
                      </p>
                      <input
                        name="qrInput"
                        type="text"
                        placeholder={scanMode === 'issue' ? 'tcc://userId/token' : 'tcc-spend://userId/token'}
                        className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded-md text-[#e8fbff] focus:outline-none focus:border-[#14b8a6]"
                        autoFocus
                      />
                      <Button type="submit" className="w-full bg-[#10b981] hover:bg-[#059669]">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Conferma
                      </Button>
                    </form>
                  )}
                </div>

                {/* Pulsante Azione */}
                {scanMode === 'issue' ? (
                  <Button 
                    className="w-full bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-lg py-6"
                    onClick={handleIssueCredits}
                    disabled={!validatedCustomer || !amount || parseFloat(amount) <= 0 || isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 mr-2" />
                    )}
                    Assegna {calculatedCredits} TCC
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-lg py-6"
                    onClick={handleRedeemSpend}
                    disabled={!scannedData || isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 mr-2" />
                    )}
                    Incassa TCC
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Vendite */}
          <TabsContent value="vendite" className="space-y-4">
            <Card className="bg-[#1e293b] border-[#334155]">
              <CardHeader>
                <CardTitle className="text-[#e8fbff]">Ultime Transazioni</CardTitle>
                <CardDescription className="text-[#94a3b8]">
                  Storico vendite e TCC assegnati/riscattati oggi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(!transactions || transactions.length === 0) ? (
                    <p className="text-center text-[#94a3b8] py-8">Nessuna transazione oggi</p>
                  ) : (
                    (transactions || []).map((tx, i) => (
                      <div key={tx.id || i} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg">
                        <div className="flex items-center gap-3">
                          {tx.type === 'issue' ? (
                            <ArrowUpCircle className="w-5 h-5 text-[#14b8a6]" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5 text-[#f59e0b]" />
                          )}
                          <div>
                            <p className="font-semibold text-[#e8fbff]">
                              {tx.customer_name || 'Cliente'}
                            </p>
                            <p className="text-sm text-[#94a3b8]">
                              {new Date(tx.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-[#e8fbff]">
                            EUR{tx.euro_amount?.toFixed(2) || '0.00'}
                          </p>
                          <p className={`text-sm ${tx.type === 'issue' ? 'text-[#14b8a6]' : 'text-[#f59e0b]'}`}>
                            {tx.type === 'issue' ? '+' : '-'}{tx.tcc_amount} TCC
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
            <Card className="bg-[#1e293b] border-[#334155]">
              <CardHeader>
                <CardTitle className="text-[#e8fbff]">Wallet Operatore</CardTitle>
                <CardDescription className="text-[#94a3b8]">
                  Riepilogo giornaliero TCC e chiusura cassa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      <p className="text-2xl font-bold text-[#10b981]">EUR{operatorWallet?.redeemed_eur || '0.00'}</p>
                    </div>
                  </div>
                </div>

                {/* Tasso di Cambio */}
                {tccConfig && (
                  <div className="p-3 bg-[#0b1220] rounded-lg flex justify-between items-center">
                    <span className="text-sm text-[#94a3b8]">Tasso di Cambio Attuale</span>
                    <span className="font-bold text-[#e8fbff]">1 TCC = EUR{tccConfig.effective_rate}</span>
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
                  className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50"
                  onClick={handleSettlement}
                  disabled={operatorWallet?.settlement_status !== 'open' || isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Chiudi Giornata e Invia al Fondo
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
