import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  User, 
  Wallet,
  ShoppingBag,
  Bike,
  Footprints,
  Bus
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface CitizenInfo {
  id: number;
  name: string;
  email: string;
  wallet_balance: number;
}

interface ScanResult {
  success: boolean;
  citizen?: CitizenInfo;
  tcc_assigned?: number;
  message?: string;
  error?: string;
}

interface MerchantQRScannerProps {
  shopId: number;
  shopName?: string;
}

export default function MerchantQRScanner({ shopId, shopName = 'Il tuo negozio' }: MerchantQRScannerProps) {
  const [qrInput, setQrInput] = useState('');
  const [earnType, setEarnType] = useState<string>('purchase_bio');
  const [euroSpent, setEuroSpent] = useState<string>('');
  const [transportMode, setTransportMode] = useState<string>('');
  const [validating, setValidating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [citizenInfo, setCitizenInfo] = useState<CitizenInfo | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Valida QR Code senza assegnare TCC
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
          error: data.error || 'QR Code non valido'
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

  // Assegna TCC al cittadino
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
        // Reset form
        setQrInput('');
        setCitizenInfo(null);
        setEuroSpent('');
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

  // Calcola TCC stimati
  const getEstimatedTCC = () => {
    const amount = parseFloat(euroSpent) || 0;
    switch (earnType) {
      case 'purchase_bio':
        return Math.floor(amount * 2);
      case 'purchase_km0':
        return Math.floor(amount * 3);
      case 'checkin':
        let base = 10;
        if (transportMode === 'bike') base += 5;
        if (transportMode === 'walk') base += 8;
        if (transportMode === 'public') base += 3;
        return base;
      default:
        return Math.floor(amount * 1);
    }
  };

  // Gestione input QR manuale
  const handleQRInput = (value: string) => {
    setQrInput(value);
    setScanResult(null);
    setCitizenInfo(null);
    
    // Auto-valida se sembra un QR valido
    if (value.startsWith('tcc://') && value.length > 10) {
      validateQR(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <QrCode className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-white text-xl">Scanner TCC</CardTitle>
              <CardDescription className="text-white/70">{shopName}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Input QR Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scansiona QR Code
          </CardTitle>
          <CardDescription>
            Inserisci il codice QR del cliente o scansionalo con la fotocamera
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qr-input">Codice QR</Label>
            <Input
              id="qr-input"
              placeholder="tcc://30/abc123..."
              value={qrInput}
              onChange={(e) => handleQRInput(e.target.value)}
              className="font-mono"
            />
          </div>

          <Button 
            onClick={() => validateQR(qrInput)} 
            disabled={!qrInput || validating}
            className="w-full"
            variant="outline"
          >
            {validating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validazione...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Valida QR Code
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Cittadino */}
      {citizenInfo && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Cliente Verificato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">{citizenInfo.name}</p>
                <p className="text-sm text-muted-foreground">{citizenInfo.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-medium">Saldo attuale:</span>
              <span className="text-xl font-bold text-primary">{citizenInfo.wallet_balance} TCC</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Assegnazione TCC */}
      {citizenInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Assegna TCC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo di guadagno</Label>
              <Select value={earnType} onValueChange={setEarnType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase_bio">🌱 Acquisto BIO (2 TCC/€)</SelectItem>
                  <SelectItem value="purchase_km0">📍 Acquisto KM0 (3 TCC/€)</SelectItem>
                  <SelectItem value="checkin">📍 Check-in Mercato</SelectItem>
                  <SelectItem value="generic">🛒 Acquisto Generico (1 TCC/€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {earnType === 'checkin' ? (
              <div className="space-y-2">
                <Label>Mezzo di trasporto</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={transportMode === 'walk' ? 'default' : 'outline'}
                    onClick={() => setTransportMode('walk')}
                    className="flex flex-col h-auto py-3"
                  >
                    <Footprints className="h-5 w-5 mb-1" />
                    <span className="text-xs">A piedi</span>
                    <span className="text-xs text-muted-foreground">+8 TCC</span>
                  </Button>
                  <Button
                    variant={transportMode === 'bike' ? 'default' : 'outline'}
                    onClick={() => setTransportMode('bike')}
                    className="flex flex-col h-auto py-3"
                  >
                    <Bike className="h-5 w-5 mb-1" />
                    <span className="text-xs">Bici</span>
                    <span className="text-xs text-muted-foreground">+5 TCC</span>
                  </Button>
                  <Button
                    variant={transportMode === 'public' ? 'default' : 'outline'}
                    onClick={() => setTransportMode('public')}
                    className="flex flex-col h-auto py-3"
                  >
                    <Bus className="h-5 w-5 mb-1" />
                    <span className="text-xs">Bus</span>
                    <span className="text-xs text-muted-foreground">+3 TCC</span>
                  </Button>
                  <Button
                    variant={transportMode === '' ? 'default' : 'outline'}
                    onClick={() => setTransportMode('')}
                    className="flex flex-col h-auto py-3"
                  >
                    <span className="text-lg mb-1">🚗</span>
                    <span className="text-xs">Auto</span>
                    <span className="text-xs text-muted-foreground">+0 TCC</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="euro-spent">Importo speso (€)</Label>
                <Input
                  id="euro-spent"
                  type="number"
                  placeholder="25.00"
                  value={euroSpent}
                  onChange={(e) => setEuroSpent(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {/* Preview TCC */}
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">TCC da assegnare</p>
              <p className="text-4xl font-bold text-primary">{getEstimatedTCC()}</p>
            </div>

            <Button 
              onClick={assignTCC} 
              disabled={scanning || getEstimatedTCC() === 0}
              className="w-full h-14 text-lg"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Assegnazione in corso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Assegna {getEstimatedTCC()} TCC
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Risultato Scansione */}
      {scanResult && (
        <Card className={scanResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {scanResult.success ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                  <div>
                    <p className="font-semibold text-lg text-green-700">
                      {scanResult.message}
                    </p>
                    {scanResult.citizen && (
                      <p className="text-sm text-green-600">
                        Nuovo saldo: {scanResult.citizen.new_balance} TCC
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-red-600" />
                  <div>
                    <p className="font-semibold text-lg text-red-700">Errore</p>
                    <p className="text-sm text-red-600">{scanResult.error}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
