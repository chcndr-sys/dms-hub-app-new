import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  History, Leaf, ArrowLeft, Loader2, Award, Trophy
} from 'lucide-react';
import { Link } from 'wouter';

// API Base URL — in produzione usa proxy Vercel (/api/tcc/* → orchestratore.mio-hub.me)
const API_BASE = import.meta.env.DEV
  ? 'https://orchestratore.mio-hub.me'
  : '';

// Livelli di score con soglie TCC
const SCORE_LEVELS = [
  { name: 'Principiante', min: 0, max: 500, color: 'from-red-500 to-orange-500' },
  { name: 'Eco-Curioso', min: 500, max: 2000, color: 'from-orange-500 to-yellow-500' },
  { name: 'Eco-Attivo', min: 2000, max: 5000, color: 'from-yellow-500 to-lime-500' },
  { name: 'Eco-Champion', min: 5000, max: 10000, color: 'from-lime-500 to-green-500' },
  { name: 'Eco-Hero', min: 10000, max: 20000, color: 'from-green-500 to-emerald-500' },
  { name: 'Eco-Legend', min: 20000, max: Infinity, color: 'from-emerald-500 to-teal-500' },
];

interface Transaction {
  id: number;
  type: string;
  amount: number;
  euro_value?: number;
  description: string;
  created_at: string;
  shop_name?: string;
}

export default function WalletStorico() {
  // Autenticazione
  const [currentUser, setCurrentUser] = useState<{id: number; name: string; email: string} | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Dati
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletStats, setWalletStats] = useState<{total_earned: number; total_spent: number; total_transactions: number; balance: number} | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        setIsAuthenticated(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Carica transazioni e dati wallet
  useEffect(() => {
    if (currentUser?.id) {
      // Carica transazioni
      const txPromise = fetch(`${API_BASE}/api/tcc/wallet/${currentUser.id}/transactions?limit=500`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTransactions(data.transactions || []);
          }
        });
      // Carica wallet stats (total_earned reale dal backend)
      const walletPromise = fetch(`${API_BASE}/api/tcc/wallet/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.wallet) {
            setWalletStats({
              total_earned: data.wallet.stats?.total_earned || 0,
              total_spent: data.wallet.stats?.total_spent || 0,
              total_transactions: data.wallet.stats?.total_transactions || 0,
              balance: data.wallet.balance || 0
            });
          }
        });
      Promise.all([txPromise, walletPromise])
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [currentUser?.id]);

  // Score = total_earned + total_spent dal wallet API (entrambe sono azioni sostenibili: guadagnare E spendere TCC)
  const totalTCC = walletStats ? (walletStats.total_earned + walletStats.total_spent) : transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalTrees = (totalTCC / 22).toFixed(1);
  
  // Ultima transazione
  const lastTx = transactions.length > 0 ? transactions[0] : null;
  const lastTCC = lastTx ? Math.abs(lastTx.amount) : 0;
  const lastTrees = (lastTCC / 22).toFixed(1);

  // Calcola livello score
  const getCurrentLevel = () => {
    for (let i = SCORE_LEVELS.length - 1; i >= 0; i--) {
      if (totalTCC >= SCORE_LEVELS[i].min) {
        return { ...SCORE_LEVELS[i], index: i };
      }
    }
    return { ...SCORE_LEVELS[0], index: 0 };
  };
  
  const currentLevel = getCurrentLevel();
  const nextLevel = SCORE_LEVELS[Math.min(currentLevel.index + 1, SCORE_LEVELS.length - 1)];
  const progressInLevel = totalTCC - currentLevel.min;
  const levelRange = currentLevel.max === Infinity ? 10000 : currentLevel.max - currentLevel.min;
  const progressPercent = Math.min(100, (progressInLevel / levelRange) * 100);

  // Formatta data e ora
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Estrai nome negozio dalla description o usa shop_name
  const getShopName = (tx: Transaction) => {
    if (tx.shop_name) return tx.shop_name;
    // Per tipi speciali, usa la description direttamente
    if (tx.type === 'civic') {
      // Estrai tipo segnalazione dalla description (es: "Segnalazione Illuminazione risolta")
      const match = tx.description.match(/Segnalazione (.+?) risolta/i);
      return match ? `Segnalazione ${match[1]}` : 'Segnalazione Civica';
    }
    if (tx.type === 'mobility') return 'Mobilità Sostenibile';
    if (tx.type === 'culture') return 'Cultura & Turismo';
    if (tx.type === 'referral') {
      if (tx.description.includes('registrato') || tx.description.includes('invito')) return 'Invito Amico';
      if (tx.description.includes('primo acquisto')) return 'Bonus Primo Acquisto';
      if (tx.description.includes('Benvenuto')) return 'Benvenuto Referral';
      return 'Presenta un Amico';
    }
    // Fallback: cerca nel description
    const match = tx.description.match(/presso (.+?)(?:\s*-|$)/i);
    return match ? match[1] : (tx.type === 'earn' ? 'Acquisto' : 'Pagamento');
  };

  // Se non autenticato
  if (!isAuthenticated && !loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col">
        <header className="bg-gradient-to-r from-primary to-emerald-600 text-white p-3 flex items-center gap-3 shrink-0">
          <Link href="/wallet">
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <History className="h-6 w-6" />
          <h1 className="text-lg font-bold">Storico</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm text-center">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">Devi accedere per vedere lo storico</p>
              <Link href="/wallet">
                <Button>Vai al Wallet</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-emerald-600 text-white p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shrink-0">
        <Link href="/wallet">
          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </Link>
        <History className="h-5 w-5 sm:h-6 sm:w-6" />
        <div>
          <h1 className="text-base sm:text-lg font-bold">Storico & Impatto</h1>
          <p className="text-xs text-white/70">{walletStats?.total_transactions || transactions.length} transazioni</p>
        </div>
      </header>

      {/* Statistiche - Due colonne affiancate */}
      <div className="shrink-0 p-3 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3">
        {/* Colonna 1: Ultima Transazione - VERDE SFUMATO BELLO come albero */}
        <Card 
          className="border-0 shadow-xl overflow-hidden relative"
          style={{ 
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(52, 211, 153, 0.8) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(4, 120, 87, 0.9) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.7) 0%, transparent 70%),
              linear-gradient(160deg, #064e3b 0%, #065f46 20%, #047857 40%, #059669 60%, #10b981 80%, #34d399 100%)
            `,
            boxShadow: '0 10px 40px -10px rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
        >
          <CardContent className="p-3 sm:p-4 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(135deg, #6ee7b7 0%, #34d399 30%, #10b981 60%, #059669 100%)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
              >
                <Leaf className="h-5 w-5 text-white drop-shadow-md" />
              </div>
              <span className="text-xs text-emerald-200 font-semibold">Ultima Transazione</span>
            </div>
            <div className="space-y-1">
              {lastTx ? (
                <>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg">
                      €{lastTx.euro_value ? (lastTx.euro_value / 100).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-lg font-bold" style={{ color: ['earn', 'civic', 'mobility', 'culture', 'referral'].includes(lastTx.type) ? '#6ee7b7' : '#fca5a5' }}>
                      {['earn', 'civic', 'mobility', 'culture', 'referral'].includes(lastTx.type) ? '+' : '-'}{Math.abs(lastTx.amount)} TCC
                    </p>
                  </div>
                  <div className="pt-2 border-t border-emerald-400/30">
                    <p className="text-sm text-emerald-100">
                      <span className="font-bold text-white">{Math.abs(lastTx.amount)}</span> kg CO₂
                    </p>
                    <p className="text-sm text-emerald-200 flex items-center gap-1">
                      🌳 <span className="font-bold text-white">{(Math.abs(lastTx.amount) / 22).toFixed(1)}</span> alberi
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-emerald-200">Nessuna transazione</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colonna 2: Score - INDICATORE CHE SI RIEMPIE */}
        <Card 
          className="border-0 shadow-xl overflow-hidden relative"
          style={{ 
            background: progressPercent >= 100
              ? 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)'
              : `linear-gradient(to top, 
                  #dc2626 0%, 
                  #ea580c ${Math.max(0, progressPercent * 0.3)}%, 
                  #f59e0b ${Math.max(0, progressPercent * 0.6)}%, 
                  #84cc16 ${Math.max(0, progressPercent * 0.85)}%, 
                  #22c55e ${progressPercent}%, 
                  #1e293b ${progressPercent}%, 
                  #1e293b 100%)`
          }}
        >
          <CardContent className="p-3 sm:p-4 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs text-white/80 font-medium">Il Tuo Score</span>
            </div>
            <div className="space-y-1">
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">
                  {totalTCC.toLocaleString('it-IT')}
                </p>
                <p className="text-sm font-semibold text-white/90">TCC totali</p>
              </div>
              <div className="pt-2 border-t border-white/20">
                <p className="text-lg text-white font-bold">{currentLevel.name}</p>
                <p className="text-xs text-white/70">
                  {Math.round(progressPercent)}% • {currentLevel.max === Infinity ? '🏆 MAX!' : `Prossimo: ${nextLevel.name}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista transazioni - scrollabile */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 pt-0">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Transazioni Recenti
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">Nessuna transazione</p>
              ) : (
                transactions.map((tx) => {
                  const { date, time } = formatDateTime(tx.created_at);
                  const shopName = getShopName(tx);
                  return (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        {/* Nome negozio/impresa */}
                        <p className="font-semibold text-sm truncate">{shopName}</p>
                        {/* Data e ora */}
                        <p className="text-xs text-muted-foreground">
                          {date} • {time}
                        </p>
                        {/* Badge tipo - supporta earn, spend, civic, mobility, culture */}
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                          tx.type === 'earn' ? 'bg-green-500/20 text-green-600' :
                          tx.type === 'civic' ? 'bg-orange-500/20 text-orange-600' :
                          tx.type === 'mobility' ? 'bg-blue-500/20 text-blue-600' :
                          tx.type === 'culture' ? 'bg-purple-500/20 text-purple-600' :
                          tx.type === 'referral' ? 'bg-pink-500/20 text-pink-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {tx.type === 'earn' ? 'Acquisto' : 
                           tx.type === 'civic' ? 'Segnalazione Civica' :
                           tx.type === 'mobility' ? 'Mobilità Sostenibile' :
                           tx.type === 'culture' ? 'Cultura & Turismo' :
                           tx.type === 'referral' ? 'Presenta un Amico' :
                           'Pagamento TCC'}
                        </span>
                      </div>
                      <div className="text-right ml-3">
                        {/* Euro */}
                        {tx.euro_value && (
                          <p className="text-sm font-medium">
                            €{(tx.euro_value / 100).toFixed(2)}
                          </p>
                        )}
                        {/* TCC - verde per accrediti (earn, civic, mobility, culture, referral), rosso per spese */}
                        <p className={`text-lg font-bold ${
                          ['earn', 'civic', 'mobility', 'culture', 'referral'].includes(tx.type) 
                            ? 'text-green-600' 
                            : 'text-red-500'
                        }`}>
                          {['earn', 'civic', 'mobility', 'culture', 'referral'].includes(tx.type) ? '+' : '-'}{Math.abs(tx.amount)} TCC
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
