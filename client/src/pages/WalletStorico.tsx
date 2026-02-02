import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  History, TrendingUp, Leaf, ArrowLeft, Loader2
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Link } from 'wouter';

const API_BASE = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function WalletStorico() {
  // Autenticazione
  const [currentUser, setCurrentUser] = useState<{id: number; name: string; email: string} | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Dati
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

  // Carica transazioni
  useEffect(() => {
    if (currentUser?.id) {
      fetch(`${API_BASE}/api/tcc/wallet/${currentUser.id}/transactions`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTransactions(data.transactions || []);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [currentUser?.id]);

  // Calcoli
  const totalCO2 = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const totalTrees = (totalCO2 / 22).toFixed(1);
  
  // Ultima transazione
  const lastTx = transactions.length > 0 ? transactions[0] : null;
  const lastCO2 = lastTx ? Math.abs(lastTx.amount) : 0;

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
        <BottomNav />
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
          <h1 className="text-base sm:text-lg font-bold">Storico</h1>
          <p className="text-xs text-white/70">{transactions.length} transazioni</p>
        </div>
      </header>

      {/* Statistiche - Due colonne affiancate */}
      <div className="shrink-0 p-3 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3">
        {/* Colonna 1: CO2 e Alberi */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground">Impatto</span>
            </div>
            <div className="space-y-1">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalCO2.toLocaleString('it-IT')} kg</p>
                <p className="text-xs text-muted-foreground">CO₂ totale</p>
              </div>
              <div className="pt-2 border-t border-green-500/20">
                <p className="text-lg font-semibold text-green-600">🌳 {totalTrees}</p>
                <p className="text-xs text-muted-foreground">alberi equiv.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colonna 2: Trend */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs text-muted-foreground">Trend</span>
            </div>
            <div className="space-y-1">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{lastCO2} kg</p>
                <p className="text-xs text-muted-foreground">ultima op.</p>
              </div>
              <div className="pt-2 border-t border-blue-500/20">
                <p className="text-sm font-medium text-blue-600">
                  {lastTx?.type === 'earn' ? '↑ Accredito' : '↓ Pagamento'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastTx ? new Date(lastTx.created_at).toLocaleDateString('it-IT') : '-'}
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
              Transazioni
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">Nessuna transazione</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className={`text-base sm:text-lg font-semibold ml-2 ${tx.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type === 'earn' ? '+' : '-'}{Math.abs(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
