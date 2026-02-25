/**
 * WalletAssociazionePanel - Wallet dell'associazione impersonificata
 * Mostra saldo, incassi per tipo e storico transazioni.
 *
 * Endpoint:
 *   GET /api/associazioni/:id/wallet
 *   GET /api/associazioni/:id/wallet/transazioni
 *
 * @version 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet, Euro, TrendingUp, RefreshCw, Loader2,
  ArrowDownLeft, Users, BookOpen, Briefcase, Search, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { getImpersonationParams } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE = MIHUB_API_BASE_URL;

interface WalletData {
  saldo: number;
  totale_incassato: number;
  incassi_mese: number;
  incassi_quote: number;
  incassi_servizi: number;
  incassi_corsi: number;
}

interface Transazione {
  id: number;
  tipo: 'QUOTA_ASSOCIATIVA' | 'SERVIZIO' | 'CORSO' | 'RIMBORSO' | 'ALTRO';
  importo: number;
  descrizione: string;
  impresa_nome?: string;
  data: string;
  stato: 'completata' | 'in_attesa' | 'annullata';
}

const EMPTY_WALLET: WalletData = {
  saldo: 0, totale_incassato: 0, incassi_mese: 0,
  incassi_quote: 0, incassi_servizi: 0, incassi_corsi: 0,
};

const TIPO_LABELS: Record<Transazione['tipo'], { label: string; color: string }> = {
  QUOTA_ASSOCIATIVA: { label: 'Quota', color: '#3b82f6' },
  SERVIZIO: { label: 'Servizio', color: '#10b981' },
  CORSO: { label: 'Corso', color: '#f59e0b' },
  RIMBORSO: { label: 'Rimborso', color: '#ef4444' },
  ALTRO: { label: 'Altro', color: '#8b5cf6' },
};

export default function WalletAssociazionePanel() {
  const [wallet, setWallet] = useState<WalletData>(EMPTY_WALLET);
  const [transazioni, setTransazioni] = useState<Transazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('riepilogo');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');

  const impState = getImpersonationParams();
  const associazioneId = impState.associazioneId;
  const associazioneNome = impState.associazioneNome
    ? decodeURIComponent(impState.associazioneNome)
    : 'Associazione';

  const loadData = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      const [walletRes, transRes] = await Promise.all([
        fetch(`${API_BASE}/api/associazioni/${associazioneId}/wallet`),
        fetch(`${API_BASE}/api/associazioni/${associazioneId}/wallet/transazioni`),
      ]);
      const walletData = await walletRes.json();
      if (walletData.success && walletData.data) {
        setWallet({ ...EMPTY_WALLET, ...walletData.data });
      }
      const transData = await transRes.json();
      if (transData.success && transData.data) {
        setTransazioni(transData.data);
      }
    } catch (error) {
      console.error('Errore caricamento wallet associazione:', error);
    } finally {
      setLoading(false);
    }
  }, [associazioneId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTransazioni = transazioni.filter(t => {
    const matchSearch = !searchTerm || (t.descrizione?.toLowerCase().includes(searchTerm.toLowerCase()) || t.impresa_nome?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchTipo = !filterTipo || t.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  if (!associazioneId) {
    return (
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-[#e8fbff]/50">Nessuna associazione selezionata</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Wallet className="h-5 w-5 text-[#10b981]" />
            Wallet Associazione
            <Badge variant="outline" className="ml-2 text-[#3b82f6] border-[#3b82f6]/50">
              {associazioneNome}
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadData} className="border-[#3b82f6]/30 text-[#3b82f6]">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[#1a2332] border-[#10b981]/30">
          <CardContent className="pt-4 pb-4 text-center">
            <Euro className="h-5 w-5 mx-auto text-[#10b981] mb-1" />
            <p className="text-2xl font-bold text-[#10b981]">{wallet.saldo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-[#e8fbff]/50">Saldo Attuale</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#3b82f6]/30">
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="h-5 w-5 mx-auto text-[#3b82f6] mb-1" />
            <p className="text-2xl font-bold text-[#3b82f6]">{wallet.incassi_quote.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-[#e8fbff]/50">Quote Incassate</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#f59e0b]/30">
          <CardContent className="pt-4 pb-4 text-center">
            <Briefcase className="h-5 w-5 mx-auto text-[#f59e0b] mb-1" />
            <p className="text-2xl font-bold text-[#f59e0b]">{wallet.incassi_servizi.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-[#e8fbff]/50">Servizi Incassati</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
          <CardContent className="pt-4 pb-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto text-[#8b5cf6] mb-1" />
            <p className="text-2xl font-bold text-[#8b5cf6]">{wallet.incassi_corsi.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-[#e8fbff]/50">Corsi Incassati</p>
          </CardContent>
        </Card>
      </div>

      {/* Riepilogo mese */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#10b981]" />
              <span className="text-sm text-[#e8fbff]/70">Incassi questo mese</span>
            </div>
            <span className="text-lg font-bold text-[#10b981]">
              EUR {wallet.incassi_mese.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-[#e8fbff]/70">Totale storico</span>
            <span className="text-sm text-[#e8fbff]">
              EUR {wallet.totale_incassato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Transazioni */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0b1220] border border-[#3b82f6]/20">
          <TabsTrigger value="riepilogo" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            Riepilogo
          </TabsTrigger>
          <TabsTrigger value="movimenti" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            Movimenti ({transazioni.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="riepilogo">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6 text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-[#3b82f6]/40 mb-3" />
              <p className="text-[#e8fbff]/50">I dati del wallet verranno popolati dal backend</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimenti">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-4 space-y-3">
              {/* Filtri */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e8fbff]/30" />
                  <Input
                    className="pl-9 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
                    placeholder="Cerca per descrizione o impresa..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="bg-[#0b1220] border border-[#3b82f6]/20 rounded-lg px-3 text-sm text-[#e8fbff]"
                  value={filterTipo}
                  onChange={e => setFilterTipo(e.target.value)}
                >
                  <option value="">Tutti i tipi</option>
                  <option value="QUOTA_ASSOCIATIVA">Quote</option>
                  <option value="SERVIZIO">Servizi</option>
                  <option value="CORSO">Corsi</option>
                  <option value="RIMBORSO">Rimborsi</option>
                </select>
              </div>

              {/* Lista */}
              {filteredTransazioni.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  <ArrowDownLeft className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Nessuna transazione trovata</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredTransazioni.map(t => {
                    const tipoInfo = TIPO_LABELS[t.tipo] || TIPO_LABELS.ALTRO;
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                        <div className="flex items-center gap-3">
                          <ArrowDownLeft className="h-4 w-4" style={{ color: tipoInfo.color }} />
                          <div>
                            <p className="text-sm text-[#e8fbff]">{t.descrizione}</p>
                            <p className="text-xs text-[#e8fbff]/40">
                              {t.impresa_nome && <>{t.impresa_nome} · </>}
                              {new Date(t.data).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#10b981]">
                            +{t.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                          <Badge className="text-[10px]" style={{ backgroundColor: `${tipoInfo.color}20`, color: tipoInfo.color, borderColor: `${tipoInfo.color}30` }}>
                            {tipoInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
