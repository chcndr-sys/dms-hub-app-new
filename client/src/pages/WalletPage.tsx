import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Leaf, TrendingUp, Award, RefreshCw, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API_BASE = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
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

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingQR, setRefreshingQR] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per demo, usiamo userId 30 (Anna Neri Test)
  // In produzione, questo verrebbe dal contesto di autenticazione
  const userId = 30;

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch wallet data
      const walletRes = await fetch(`${API_BASE}/api/tcc/wallet/${userId}`);
      if (walletRes.ok) {
        const data = await walletRes.json();
        if (data.success) {
          setWalletData({
            balance: data.wallet.balance,
            user: data.wallet.user
          });
        }
      }

      // Fetch transactions
      const txRes = await fetch(`${API_BASE}/api/tcc/wallet/${userId}/transactions`);
      if (txRes.ok) {
        const data = await txRes.json();
        if (data.success) {
          setTransactions(data.transactions || []);
        }
      }

      // Fetch QR Code
      await refreshQRCode();

    } catch (err) {
      console.error('Errore caricamento wallet:', err);
      setError('Errore nel caricamento dei dati');
      // Fallback a dati demo
      setWalletData({
        balance: 847,
        user: { id: 0, name: 'Demo User', email: 'demo@example.com' }
      });
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

  useEffect(() => {
    fetchWalletData();
  }, []);

  const balance = walletData?.balance || 0;
  const co2Saved = Math.round(balance * 0.5); // 1 credito = ~0.5kg CO₂
  const treesEquivalent = Math.round(co2Saved / 22); // 1 albero = ~22kg CO₂/anno

  // Calcola livello
  const getLevel = (balance: number) => {
    if (balance >= 500) return { name: 'Oro', color: 'amber', percentile: 'Top 5%' };
    if (balance >= 200) return { name: 'Argento', color: 'gray', percentile: 'Top 20%' };
    if (balance >= 50) return { name: 'Bronzo', color: 'orange', percentile: 'Top 50%' };
    return { name: 'Starter', color: 'blue', percentile: 'Benvenuto!' };
  };

  const level = getLevel(balance);

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
    <div className="min-h-screen bg-background pb-16">
      {/* Header con gradient */}
      <header className="bg-gradient-to-r from-primary via-primary/90 to-emerald-600 text-primary-foreground p-4 shadow-lg">
        <div className="w-full px-4 md:px-8 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105"
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
              <p className="text-xs text-white/70">{walletData?.user?.name || 'I tuoi eco-crediti sostenibili'}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 py-6 space-y-6">
        {/* Saldo Principale */}
        <Card className="bg-gradient-to-br from-primary via-primary/90 to-emerald-600 text-primary-foreground border-0 shadow-2xl overflow-hidden">
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
            <div className="text-7xl font-bold mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{balance}</div>
            <p className="text-primary-foreground/80 text-base">crediti disponibili (€{(balance * 0.01).toFixed(2)})</p>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Il tuo QR Code</CardTitle>
                <CardDescription className="text-card-foreground/70">
                  Mostra questo codice al negoziante per ricevere i crediti
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={refreshQRCode}
                disabled={refreshingQR}
              >
                <RefreshCw className={`h-5 w-5 ${refreshingQR ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg shadow-inner">
              <QRCodeSVG 
                value={qrData?.qr_string || `tcc://${userId}/demo`} 
                size={200} 
                level="H" 
              />
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
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="pt-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Leaf className="h-7 w-7 text-white" />
              </div>
              <div className="text-4xl font-bold text-green-600">{co2Saved} kg</div>
              <div className="text-sm text-muted-foreground font-medium">CO₂ Evitata</div>
              <p className="text-xs text-muted-foreground mt-2">
                Equivalente a {treesEquivalent} alberi piantati
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
            <CardContent className="pt-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Award className="h-7 w-7 text-white" />
              </div>
              <div className="text-4xl font-bold text-amber-600">{level.name}</div>
              <div className="text-sm text-muted-foreground font-medium">Livello</div>
              <p className="text-xs text-muted-foreground mt-2">
                {level.percentile}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Storico Transazioni */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5" />
              Storico Transazioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nessuna transazione ancora. Inizia a guadagnare TCC!
                </p>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{tx.description}</p>
                      <p className="text-sm text-card-foreground/60">
                        {new Date(tx.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
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

        {/* Azioni */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            Riscatta Crediti
          </Button>
          <Button variant="outline" className="w-full h-14 text-lg font-semibold border-2 hover:bg-muted/50 transition-all duration-300">
            Classifica
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
