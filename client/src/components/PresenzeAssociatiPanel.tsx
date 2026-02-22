/**
 * PresenzeAssociatiPanel - Pannello Presenze Associati ai Mercati
 * Mostra le presenze degli associati di un'associazione ai mercati
 * Visibile solo durante impersonificazione associazione
 *
 * @version 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar, Clock, CheckCircle, XCircle, Users, Store,
  RefreshCw, Loader2, Search, Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getImpersonationParams } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE_URL = MIHUB_API_BASE_URL;

interface Presenza {
  id: number;
  associato_nome: string;
  mercato_nome: string;
  data: string;
  presente: boolean;
  posteggio?: string;
  note?: string;
}

interface PresenzeStats {
  totale_associati: number;
  presenti_oggi: number;
  assenti_oggi: number;
  tasso_presenza: number;
}

export default function PresenzeAssociatiPanel() {
  const [presenze, setPresenze] = useState<Presenza[]>([]);
  const [stats, setStats] = useState<PresenzeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);

  const impState = getImpersonationParams();
  const associazioneId = impState.associazioneId;
  const associazioneNome = impState.associazioneNome
    ? decodeURIComponent(impState.associazioneNome)
    : null;

  const loadPresenze = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/presenze?associazione_id=${associazioneId}&data=${dataFiltro}`
      );
      const data = await res.json();
      if (data.success && data.data) {
        setPresenze(data.data);
      } else {
        setPresenze([]);
      }

      // Stats
      const statsRes = await fetch(
        `${API_BASE_URL}/api/presenze/stats?associazione_id=${associazioneId}&data=${dataFiltro}`
      );
      const statsData = await statsRes.json();
      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Errore caricamento presenze:', error);
      // Fallback: mostra dati vuoti senza errore toast (endpoint potrebbe non esistere ancora)
      setPresenze([]);
      setStats({
        totale_associati: 0,
        presenti_oggi: 0,
        assenti_oggi: 0,
        tasso_presenza: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [associazioneId, dataFiltro]);

  useEffect(() => {
    loadPresenze();
  }, [loadPresenze]);

  const filteredPresenze = presenze.filter((p) =>
    p.associato_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.mercato_nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!associazioneId) {
    return (
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-[#e8fbff]/50">Nessuna associazione selezionata</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#3b82f6]" />
            Presenze Associati
            {associazioneNome && (
              <Badge variant="outline" className="ml-2 text-[#3b82f6] border-[#3b82f6]/50">
                {associazioneNome}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="w-40 bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={loadPresenze}
              className="border-[#3b82f6]/30 text-[#3b82f6]"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-[#3b82f6]" />
              <p className="text-2xl font-bold text-[#e8fbff]">{stats.totale_associati}</p>
              <p className="text-xs text-[#e8fbff]/60">Associati Totali</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardContent className="pt-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-[#10b981]" />
              <p className="text-2xl font-bold text-[#10b981]">{stats.presenti_oggi}</p>
              <p className="text-xs text-[#e8fbff]/60">Presenti</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardContent className="pt-4 text-center">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-[#ef4444]" />
              <p className="text-2xl font-bold text-[#ef4444]">{stats.assenti_oggi}</p>
              <p className="text-xs text-[#e8fbff]/60">Assenti</p>
            </CardContent>
          </Card>
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardContent className="pt-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-[#8b5cf6]" />
              <p className="text-2xl font-bold text-[#8b5cf6]">{stats.tasso_presenza}%</p>
              <p className="text-xs text-[#e8fbff]/60">Tasso Presenza</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#e8fbff]/50" />
            <Input
              placeholder="Cerca associato o mercato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0b1220] border-[#3b82f6]/20 text-[#e8fbff] placeholder-[#e8fbff]/30"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
            </div>
          ) : filteredPresenze.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#e8fbff]/50">
              <Calendar className="h-8 w-8 mb-2 opacity-40" />
              <p>Nessuna presenza registrata per questa data</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPresenze.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        p.presente ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#e8fbff]">{p.associato_nome}</p>
                      <p className="text-xs text-[#e8fbff]/50 flex items-center gap-1">
                        <Store className="h-3 w-3" /> {p.mercato_nome}
                        {p.posteggio && <span>· Post. {p.posteggio}</span>}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      p.presente
                        ? 'text-[#10b981] border-[#10b981]/50'
                        : 'text-[#ef4444] border-[#ef4444]/50'
                    }
                  >
                    {p.presente ? 'Presente' : 'Assente'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
