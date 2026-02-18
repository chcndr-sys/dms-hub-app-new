import { useState, useEffect } from 'react';
import { Euro, ArrowLeft, QrCode, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

// API Base URL — in produzione usa proxy Vercel (/api/tcc/* → orchestratore.mio-hub.me)
const API_BASE = import.meta.env.DEV
  ? 'https://orchestratore.mio-hub.me'
  : '';

export default function WalletPaga() {
  const [importo, setImporto] = useState('');
  const [qrGenerato, setQrGenerato] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dati QR dal backend
  const [qrString, setQrString] = useState('');
  const [tccNecessari, setTccNecessari] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [saldoAttuale, setSaldoAttuale] = useState<number | null>(null);
  
  // Ottieni user_id dal localStorage
  const [userId, setUserId] = useState<number | null>(null);
  
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserId(user.id);
      } catch (e) {
        console.error('Errore parsing user:', e);
      }
    }
  }, []);
  
  // Calcolo TCC preview (solo per visualizzazione, il valore reale viene dal backend)
  const tccPreview = importo ? Math.ceil(parseFloat(importo) / 0.089) : 0;

  const handleGeneraQR = async () => {
    if (!importo || parseFloat(importo) <= 0) {
      setError('Inserisci un importo valido');
      return;
    }
    
    if (!userId) {
      setError('Devi effettuare il login per pagare con TCC');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/tcc/v2/generate-spend-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          euro_amount: parseFloat(importo)
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setQrString(data.qr_string);
        setTccNecessari(data.tcc_amount);
        setExpiresAt(data.expires_at);
        setSaldoAttuale(data.current_balance);
        setQrGenerato(true);
      } else {
        setError(data.error || 'Errore generazione QR');
      }
    } catch (err) {
      console.error('Errore generazione QR:', err);
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const handleNuovoPagamento = () => {
    setImporto('');
    setQrGenerato(false);
    setQrString('');
    setTccNecessari(0);
    setExpiresAt(null);
    setError(null);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - stile coerente con Wallet */}
      <header className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-3 flex items-center gap-3 shadow-lg">
        <a href="/wallet" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Euro className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg">Paga con TCC</span>
        </div>
      </header>

      {/* Contenuto */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!qrGenerato ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Inserisci l'importo da pagare in Euro
            </p>
            
            {error && (
              <div className="w-full max-w-xs mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <div className="w-full max-w-xs">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">€</span>
                <input
                  type="number"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-center text-4xl font-bold py-4 pl-10 pr-4 bg-muted/30 border-2 border-muted rounded-xl focus:border-amber-500 focus:outline-none"
                  step="0.01"
                  min="0"
                />
              </div>
              
              {importo && parseFloat(importo) > 0 && (
                <p className="text-center mt-3 text-lg">
                  ≈ <span className="font-bold text-amber-600">{tccPreview} TCC</span>
                </p>
              )}
            </div>

            <Button 
              onClick={handleGeneraQR}
              disabled={!importo || parseFloat(importo) <= 0 || loading || !userId}
              className="mt-6 px-8 py-3 text-lg border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/70 text-foreground"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5 mr-2" />
                  Genera QR Pagamento
                </>
              )}
            </Button>
            
            {!userId && (
              <p className="text-xs text-amber-500 mt-2">
                Effettua il login per generare il QR
              </p>
            )}
          </>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-lg font-semibold">Importo: €{parseFloat(importo).toFixed(2)}</p>
              <p className="text-amber-600 font-bold text-xl">{tccNecessari} TCC</p>
              {saldoAttuale !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo dopo: {saldoAttuale - tccNecessari} TCC
                </p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <QRCodeSVG value={qrString} size={200} level="H" />
            </div>
            
            <p className="text-xs text-muted-foreground mt-3">
              Mostra questo QR al negoziante
            </p>
            
            {expiresAt && (
              <p className="text-xs text-amber-500 mt-1">
                Valido fino alle {new Date(expiresAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            <Button 
              onClick={handleNuovoPagamento}
              variant="outline"
              className="mt-6"
            >
              Nuovo Pagamento
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
