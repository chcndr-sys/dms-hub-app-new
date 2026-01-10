/**
 * ClientiTab - Tab Clienti/Cittadini
 * Mostra la lista dei cittadini registrati con wallet TCC
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Wallet, 
  Search, 
  RefreshCw, 
  Mail, 
  Calendar, 
  Coins,
  UserCheck,
  UserX,
  TrendingUp,
  Download
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

interface Citizen {
  id: number;
  name: string;
  email: string;
  auth_provider: string;
  email_verified: boolean;
  created_at: string;
  wallet_balance: number;
  total_earned: number;
  total_spent: number;
}

interface CitizenStats {
  total_citizens: number;
  active_today: number;
  total_tcc_circulation: number;
  avg_balance: number;
}

export default function ClientiTab() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [stats, setStats] = useState<CitizenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCitizens = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/citizens`);
      if (!response.ok) throw new Error('Errore nel caricamento cittadini');
      const data = await response.json();
      setCitizens(data.citizens || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      // Dati mock per testing
      setCitizens([
        { id: 1, name: 'Mario Rossi', email: 'mario.rossi@email.com', auth_provider: 'email', email_verified: true, created_at: '2026-01-10T10:30:00Z', wallet_balance: 150, total_earned: 200, total_spent: 50 },
        { id: 2, name: 'Laura Bianchi', email: 'laura.bianchi@email.com', auth_provider: 'google', email_verified: true, created_at: '2026-01-09T14:20:00Z', wallet_balance: 75, total_earned: 100, total_spent: 25 },
        { id: 3, name: 'Giuseppe Verdi', email: 'giuseppe.verdi@email.com', auth_provider: 'spid', email_verified: true, created_at: '2026-01-08T09:15:00Z', wallet_balance: 320, total_earned: 400, total_spent: 80 },
      ]);
      setStats({
        total_citizens: 3,
        active_today: 2,
        total_tcc_circulation: 545,
        avg_balance: 181.67
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitizens();
  }, []);

  const filteredCitizens = citizens.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthProviderBadge = (provider: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      email: { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'Email' },
      google: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Google' },
      apple: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Apple' },
      spid: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'SPID' },
    };
    const badge = badges[provider] || badges.email;
    return (
      <span className={`px-2 py-1 rounded text-xs ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-[#14b8a6]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#14b8a6]/20 rounded-lg">
                <Users className="h-6 w-6 text-[#14b8a6]" />
              </div>
              <div>
                <p className="text-sm text-[#e8fbff]/70">Cittadini Registrati</p>
                <p className="text-2xl font-bold text-[#e8fbff]">{stats?.total_citizens || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#10b981]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#10b981]/20 rounded-lg">
                <UserCheck className="h-6 w-6 text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm text-[#e8fbff]/70">Attivi Oggi</p>
                <p className="text-2xl font-bold text-[#e8fbff]">{stats?.active_today || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#f59e0b]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#f59e0b]/20 rounded-lg">
                <Coins className="h-6 w-6 text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-sm text-[#e8fbff]/70">TCC in Circolazione</p>
                <p className="text-2xl font-bold text-[#e8fbff]">{stats?.total_tcc_circulation?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#8b5cf6]/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-[#8b5cf6]" />
              </div>
              <div>
                <p className="text-sm text-[#e8fbff]/70">Saldo Medio</p>
                <p className="text-2xl font-bold text-[#e8fbff]">{stats?.avg_balance?.toFixed(0) || 0} TCC</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista Cittadini */}
      <Card className="bg-[#1a2332] border-[#14b8a6]/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#14b8a6]" />
              Anagrafica Cittadini
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#e8fbff]/50" />
                <input
                  type="text"
                  placeholder="Cerca cittadino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-[#0b1220] border border-[#14b8a6]/30 rounded-lg text-[#e8fbff] placeholder-[#e8fbff]/50 focus:outline-none focus:border-[#14b8a6]"
                />
              </div>
              <button
                onClick={fetchCitizens}
                disabled={loading}
                className="p-2 bg-[#14b8a6]/20 border border-[#14b8a6]/30 rounded-lg hover:bg-[#14b8a6]/30 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 text-[#14b8a6] ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="p-2 bg-[#14b8a6]/20 border border-[#14b8a6]/30 rounded-lg hover:bg-[#14b8a6]/30 transition-colors"
              >
                <Download className="h-4 w-4 text-[#14b8a6]" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              ⚠️ {error} - Mostro dati di esempio
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#14b8a6]/20">
                  <th className="text-left py-3 px-4 text-[#e8fbff]/70 font-medium">Nome</th>
                  <th className="text-left py-3 px-4 text-[#e8fbff]/70 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-[#e8fbff]/70 font-medium">Metodo</th>
                  <th className="text-left py-3 px-4 text-[#e8fbff]/70 font-medium">Registrato</th>
                  <th className="text-right py-3 px-4 text-[#e8fbff]/70 font-medium">Saldo TCC</th>
                  <th className="text-right py-3 px-4 text-[#e8fbff]/70 font-medium">Guadagnati</th>
                  <th className="text-right py-3 px-4 text-[#e8fbff]/70 font-medium">Spesi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCitizens.map((citizen) => (
                  <tr key={citizen.id} className="border-b border-[#14b8a6]/10 hover:bg-[#14b8a6]/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#14b8a6]/20 rounded-full flex items-center justify-center">
                          <span className="text-[#14b8a6] font-medium">{citizen.name.charAt(0)}</span>
                        </div>
                        <span className="text-[#e8fbff]">{citizen.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#e8fbff]/50" />
                        <span className="text-[#e8fbff]/70">{citizen.email}</span>
                        {citizen.email_verified && (
                          <UserCheck className="h-4 w-4 text-[#10b981]" title="Email verificata" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getAuthProviderBadge(citizen.auth_provider)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#e8fbff]/50" />
                        <span className="text-[#e8fbff]/70 text-sm">{formatDate(citizen.created_at)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Wallet className="h-4 w-4 text-[#f59e0b]" />
                        <span className="text-[#f59e0b] font-semibold">{citizen.wallet_balance}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[#10b981]">+{citizen.total_earned}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[#ef4444]">-{citizen.total_spent}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCitizens.length === 0 && !loading && (
            <div className="text-center py-8 text-[#e8fbff]/50">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessun cittadino trovato</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
