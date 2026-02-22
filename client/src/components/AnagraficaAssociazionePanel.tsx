/**
 * AnagraficaAssociazionePanel - Anagrafica dell'associazione impersonificata
 * Mostra dati anagrafici, contratti e fatture dell'associazione
 * Visibile solo durante impersonificazione associazione
 *
 * @version 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Briefcase, FileText, Euro, Building2, Mail, Phone, MapPin,
  Calendar, RefreshCw, Loader2, ClipboardCheck, Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { getImpersonationParams } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE_URL = MIHUB_API_BASE_URL;

interface AssociazioneData {
  id: number;
  nome: string;
  codice_fiscale?: string;
  partita_iva?: string;
  indirizzo?: string;
  citta?: string;
  provincia?: string;
  cap?: string;
  email?: string;
  telefono?: string;
  pec?: string;
  tipo?: string;
  presidente?: string;
  data_costituzione?: string;
  num_associati?: number;
  stato?: string;
}

interface Contratto {
  id: number;
  tipo: string;
  descrizione: string;
  data_inizio: string;
  data_fine: string;
  importo?: number;
  stato: string;
}

interface Fattura {
  id: number;
  numero: string;
  data: string;
  importo: number;
  stato: 'pagata' | 'in_attesa' | 'scaduta';
  descrizione?: string;
}

export default function AnagraficaAssociazionePanel() {
  const [associazione, setAssociazione] = useState<AssociazioneData | null>(null);
  const [contratti, setContratti] = useState<Contratto[]>([]);
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dati');

  const impState = getImpersonationParams();
  const associazioneId = impState.associazioneId;
  const associazioneNome = impState.associazioneNome
    ? decodeURIComponent(impState.associazioneNome)
    : null;

  const loadData = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      const [assocRes, contrattiRes, fattureRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/associazioni/${associazioneId}`),
        fetch(`${API_BASE_URL}/api/associazioni/${associazioneId}/contratti`),
        fetch(`${API_BASE_URL}/api/associazioni/${associazioneId}/fatture`),
      ]);

      const assocData = await assocRes.json();
      if (assocData.success && assocData.data) {
        setAssociazione(assocData.data);
      }

      const contrattiData = await contrattiRes.json();
      if (contrattiData.success && contrattiData.data) {
        setContratti(contrattiData.data);
      }

      const fattureData = await fattureRes.json();
      if (fattureData.success && fattureData.data) {
        setFatture(fattureData.data);
      }
    } catch (error) {
      console.error('Errore caricamento anagrafica associazione:', error);
      // Fallback: dati vuoti senza toast (endpoints potrebbero non esistere ancora)
    } finally {
      setLoading(false);
    }
  }, [associazioneId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const getStatoFatturaBadge = (stato: Fattura['stato']) => {
    switch (stato) {
      case 'pagata':
        return <Badge className="bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30">Pagata</Badge>;
      case 'in_attesa':
        return <Badge className="bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30">In attesa</Badge>;
      case 'scaduta':
        return <Badge className="bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30">Scaduta</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#3b82f6]" />
            Anagrafica Associazione
            {associazioneNome && (
              <Badge variant="outline" className="ml-2 text-[#3b82f6] border-[#3b82f6]/50">
                {associazioneNome}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="border-[#3b82f6]/30 text-[#3b82f6]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0b1220] border border-[#3b82f6]/20">
          <TabsTrigger value="dati" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <Building2 className="h-4 w-4 mr-1" /> Dati
          </TabsTrigger>
          <TabsTrigger value="contratti" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <ClipboardCheck className="h-4 w-4 mr-1" /> Contratti
          </TabsTrigger>
          <TabsTrigger value="fatture" className="data-[state=active]:bg-[#3b82f6]/20 data-[state=active]:text-[#3b82f6]">
            <Euro className="h-4 w-4 mr-1" /> Fatture
          </TabsTrigger>
        </TabsList>

        {/* Tab Dati */}
        <TabsContent value="dati">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6">
              {associazione ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow icon={Building2} label="Nome" value={associazione.nome} />
                  <InfoRow icon={Hash} label="Codice Fiscale" value={associazione.codice_fiscale} />
                  <InfoRow icon={Hash} label="Partita IVA" value={associazione.partita_iva} />
                  <InfoRow icon={Briefcase} label="Tipo" value={associazione.tipo} />
                  <InfoRow icon={MapPin} label="Indirizzo" value={[associazione.indirizzo, associazione.citta, associazione.provincia].filter(Boolean).join(', ')} />
                  <InfoRow icon={Mail} label="Email" value={associazione.email} />
                  <InfoRow icon={Phone} label="Telefono" value={associazione.telefono} />
                  <InfoRow icon={Mail} label="PEC" value={associazione.pec} />
                  <InfoRow icon={Briefcase} label="Presidente" value={associazione.presidente} />
                  <InfoRow icon={Calendar} label="Data Costituzione" value={associazione.data_costituzione} />
                </div>
              ) : (
                <p className="text-[#e8fbff]/50 text-center py-8">Dati non disponibili</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Contratti */}
        <TabsContent value="contratti">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6">
              {contratti.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Nessun contratto registrato</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contratti.map((c) => (
                    <div key={c.id} className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-[#e8fbff]">{c.tipo}</span>
                        <Badge variant="outline" className="text-[#3b82f6] border-[#3b82f6]/50">{c.stato}</Badge>
                      </div>
                      <p className="text-sm text-[#e8fbff]/60">{c.descrizione}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#e8fbff]/40">
                        <span><Calendar className="h-3 w-3 inline mr-1" />{c.data_inizio} - {c.data_fine}</span>
                        {c.importo && <span><Euro className="h-3 w-3 inline mr-1" />{c.importo.toLocaleString('it-IT')} EUR</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Fatture */}
        <TabsContent value="fatture">
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardContent className="pt-6">
              {fatture.length === 0 ? (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  <Euro className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Nessuna fattura registrata</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fatture.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
                      <div>
                        <p className="font-medium text-[#e8fbff]">Fattura #{f.numero}</p>
                        <p className="text-xs text-[#e8fbff]/50">
                          <Calendar className="h-3 w-3 inline mr-1" />{f.data}
                          {f.descrizione && <span className="ml-2">· {f.descrizione}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#e8fbff]">{f.importo.toLocaleString('it-IT', { minimumFractionDigits: 2 })} EUR</span>
                        {getStatoFatturaBadge(f.stato)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/10">
      <Icon className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-[#e8fbff]/50">{label}</p>
        <p className="text-sm text-[#e8fbff]">{value || '-'}</p>
      </div>
    </div>
  );
}
