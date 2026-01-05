import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Leaf, TrendingUp, Award } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState(847);
  const [userId] = useState('USR-DEMO-12345');
  const [history, setHistory] = useState<Transaction[]>([
    { id: '1', amount: 45, description: 'Acquisto BIO + KM0', date: '2025-11-04T10:30:00' },
    { id: '2', amount: 20, description: 'Segnalazione risolta', date: '2025-11-03T15:20:00' },
    { id: '3', amount: 15, description: 'Shopping route completato', date: '2025-11-02T09:15:00' },
    { id: '4', amount: 30, description: 'Acquisto mercato', date: '2025-11-01T11:45:00' },
  ]);

  const co2Saved = Math.round(balance * 0.5); // 1 credito = ~0.5kg CO₂
  const treesEquivalent = Math.round(co2Saved / 22); // 1 albero = ~22kg CO₂/anno

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
              <p className="text-xs text-white/70">I tuoi eco-crediti sostenibili</p>
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
                <CardTitle className="text-primary-foreground text-xl">Saldo Eco-Crediti</CardTitle>
                <CardDescription className="text-primary-foreground/70">I tuoi crediti sostenibili</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-7xl font-bold mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">{balance}</div>
            <p className="text-primary-foreground/80 text-base">crediti disponibili</p>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Il tuo QR Code</CardTitle>
            <CardDescription className="text-card-foreground/70">
              Mostra questo codice al negoziante per ricevere i crediti
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-inner">
              <QRCodeSVG value={userId} size={200} level="H" />
            </div>
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
              <div className="text-4xl font-bold text-amber-600">Oro</div>
              <div className="text-sm text-muted-foreground font-medium">Livello</div>
              <p className="text-xs text-muted-foreground mt-2">
                Top 5% utenti più sostenibili
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
              {history.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{tx.description}</p>
                    <p className="text-sm text-card-foreground/60">
                      {new Date(tx.date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-lg font-semibold text-primary">+{tx.amount}</div>
                </div>
              ))}
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
