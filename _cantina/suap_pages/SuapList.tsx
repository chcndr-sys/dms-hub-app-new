import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Eye, ArrowLeft } from 'lucide-react';
import { getSuapPratiche, SuapPratica } from '@/api/suap';
import { Link } from 'wouter';

export default function SuapList() {
  const [pratiche, setPratiche] = useState<SuapPratica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadPratiche() {
      try {
        const data = await getSuapPratiche('MOCK_ENTE_001', { search });
        setPratiche(data);
      } catch (error) {
        console.error('Failed to load pratiche', error);
      } finally {
        setLoading(false);
      }
    }
    // Debounce search could be added here
    loadPratiche();
  }, [search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'REJECTED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'EVALUATED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'RECEIVED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-8 p-8 bg-[#020817] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suap">
            <Button variant="ghost" size="icon" className="text-[#e8fbff]/60 hover:text-[#e8fbff]">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#e8fbff] tracking-tight">Lista Pratiche</h1>
            <p className="text-[#e8fbff]/60 mt-2">
              Elenco completo delle istanze ricevute
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#e8fbff]/40" />
          <Input 
            placeholder="Cerca per CUI, Richiedente o CF..." 
            className="pl-10 bg-[#0a1628] border-[#1e293b] text-[#e8fbff]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-[#e8fbff]/20 text-[#e8fbff]">
          <Filter className="mr-2 h-4 w-4" />
          Filtri Avanzati
        </Button>
      </div>

      {/* Table / List */}
      <Card className="bg-[#0a1628] border-[#1e293b]">
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm text-left">
              <thead className="[&_tr]:border-b [&_tr]:border-[#1e293b]">
                <tr className="border-b border-[#1e293b] transition-colors hover:bg-[#1e293b]/50 data-[state=selected]:bg-[#1e293b]">
                  <th className="h-12 px-4 align-middle font-medium text-[#e8fbff]/60">CUI</th>
                  <th className="h-12 px-4 align-middle font-medium text-[#e8fbff]/60">Tipo</th>
                  <th className="h-12 px-4 align-middle font-medium text-[#e8fbff]/60">Richiedente</th>
                  <th className="h-12 px-4 align-middle font-medium text-[#e8fbff]/60">Data</th>
                  <th className="h-12 px-4 align-middle font-medium text-[#e8fbff]/60">Stato</th>
                  <th className="h-12 px-4 align-middle font-medium text-[#e8fbff]/60">Score</th>
                  <th className="h-12 px-4 align-middle font-medium text-[#e8fbff]/60">Azioni</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-[#e8fbff]/60">Caricamento...</td>
                  </tr>
                ) : pratiche.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-[#e8fbff]/60">Nessuna pratica trovata</td>
                  </tr>
                ) : (
                  pratiche.map((p) => (
                    <tr key={p.id} className="border-b border-[#1e293b] transition-colors hover:bg-[#1e293b]/50">
                      <td className="p-4 font-medium text-[#e8fbff]">{p.cui}</td>
                      <td className="p-4 text-[#e8fbff]">{p.tipo_pratica}</td>
                      <td className="p-4 text-[#e8fbff]">
                        <div>{p.richiedente_nome}</div>
                        <div className="text-xs text-[#e8fbff]/40">{p.richiedente_cf}</div>
                      </td>
                      <td className="p-4 text-[#e8fbff]">{new Date(p.data_presentazione).toLocaleDateString()}</td>
                      <td className="p-4">
                        <Badge variant="outline" className={getStatusColor(p.stato)}>
                          {p.stato}
                        </Badge>
                      </td>
                      <td className="p-4 text-[#e8fbff]">
                        {p.score !== undefined ? (
                          <span className={p.score >= 80 ? 'text-green-400' : 'text-yellow-400'}>
                            {p.score}/100
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-4">
                        <Link href={`/suap/detail/${p.id}`}>
                          <Button variant="ghost" size="sm" className="text-[#00f0ff] hover:text-[#00f0ff]/80 hover:bg-[#00f0ff]/10">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
