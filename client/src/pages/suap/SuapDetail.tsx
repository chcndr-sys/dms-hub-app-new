import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Play, FileText, Clock, User, Building2, MapPin, FileCheck, Users } from 'lucide-react';
import { getSuapPraticaById, evaluateSuapPratica, SuapPratica, SuapEvento, SuapCheck } from '@/api/suap';
import { Link, useRoute } from 'wouter';
import { toast } from 'sonner';

// Tipo esteso per pratica con tutti i campi SCIA
interface SuapPraticaFull extends SuapPratica {
  timeline: SuapEvento[];
  checks: SuapCheck[];
  // Dati Pratica
  numero_protocollo?: string;
  comune_presentazione?: string;
  tipo_segnalazione?: string;
  motivo_subingresso?: string;
  settore_merceologico?: string;
  ruolo_dichiarante?: string;
  // Dati Subentrante
  sub_ragione_sociale?: string;
  sub_nome?: string;
  sub_cognome?: string;
  sub_data_nascita?: string;
  sub_luogo_nascita?: string;
  sub_residenza_via?: string;
  sub_residenza_comune?: string;
  sub_residenza_cap?: string;
  sub_sede_via?: string;
  sub_sede_comune?: string;
  sub_sede_provincia?: string;
  sub_sede_cap?: string;
  sub_pec?: string;
  sub_telefono?: string;
  // Dati Cedente
  ced_cf?: string;
  ced_ragione_sociale?: string;
  ced_nome?: string;
  ced_cognome?: string;
  ced_data_nascita?: string;
  ced_luogo_nascita?: string;
  ced_residenza_via?: string;
  ced_residenza_comune?: string;
  ced_residenza_cap?: string;
  ced_pec?: string;
  ced_scia_precedente?: string;
  ced_data_presentazione?: string;
  ced_comune_presentazione?: string;
  // Dati Mercato e Posteggio
  mercato_id?: string;
  mercato_nome?: string;
  posteggio_id?: string;
  posteggio_numero?: string;
  ubicazione_mercato?: string;
  giorno_mercato?: string;
  fila?: string;
  dimensioni_mq?: number;
  dimensioni_lineari?: string;
  attrezzature?: string;
  // Dati Atto Notarile
  notaio_rogante?: string;
  numero_repertorio?: string;
  data_atto?: string;
  // Dati Delegato
  del_nome?: string;
  del_cognome?: string;
  del_cf?: string;
  del_data_nascita?: string;
  del_luogo_nascita?: string;
  del_qualifica?: string;
  del_residenza_via?: string;
  del_residenza_comune?: string;
  del_residenza_cap?: string;
}

// Componente per visualizzare una sezione di dati
function DataSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="bg-[#0a1628] border-[#1e293b]">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#e8fbff] flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-[#00f0ff]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente per visualizzare un campo dati
function DataField({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-[#e8fbff]/50 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-[#e8fbff] mt-0.5">{value}</p>
    </div>
  );
}

// Formatta la data
function formatDate(dateString?: string | null) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('it-IT');
  } catch {
    return dateString;
  }
}

export default function SuapDetail() {
  const [match, params] = useRoute('/suap/detail/:id');
  const [pratica, setPratica] = useState<SuapPraticaFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const id = params?.id;

  useEffect(() => {
    if (!id) return;
    loadPratica();
  }, [id]);

  async function loadPratica() {
    try {
      const data = await getSuapPraticaById(id!, '00000000-0000-0000-0000-000000000001');
      setPratica(data as SuapPraticaFull);
    } catch (error) {
      console.error('Failed to load pratica', error);
      toast.error('Errore caricamento pratica');
    } finally {
      setLoading(false);
    }
  }

  async function handleEvaluate() {
    if (!id) return;
    setEvaluating(true);
    try {
      await evaluateSuapPratica(id, '00000000-0000-0000-0000-000000000001');
      toast.success('Valutazione completata');
      await loadPratica(); // Reload to see updates
    } catch (error) {
      console.error('Evaluation failed', error);
      toast.error('Errore durante la valutazione');
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) return <div className="p-8 text-[#e8fbff]">Caricamento dettaglio...</div>;
  if (!pratica) return <div className="p-8 text-[#e8fbff]">Pratica non trovata</div>;

  // Verifica se ci sono dati SCIA completi
  const hasSciaData = pratica.sub_nome || pratica.sub_cognome || pratica.mercato_nome || pratica.ced_cf;

  return (
    <div className="space-y-6 p-8 bg-[#020817] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/suap/list">
            <Button variant="ghost" size="icon" className="text-[#e8fbff]/60 hover:text-[#e8fbff]">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[#e8fbff] tracking-tight">{pratica.cui}</h1>
              <Badge variant="outline" className="text-[#e8fbff] border-[#e8fbff]/30">
                {pratica.stato}
              </Badge>
            </div>
            <p className="text-[#e8fbff]/60 mt-2">
              {pratica.tipo_pratica} - {pratica.richiedente_nome} ({pratica.richiedente_cf})
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={handleEvaluate} 
            disabled={evaluating || pratica.stato === 'APPROVED' || pratica.stato === 'REJECTED'}
            className="bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90"
          >
            {evaluating ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Esegui Valutazione
          </Button>
        </div>
      </div>

      {/* Dati SCIA Completi */}
      {hasSciaData && (
        <div className="space-y-6">
          {/* Dati Pratica */}
          <DataSection title="Dati Pratica SCIA" icon={FileCheck}>
            <DataField label="Numero Protocollo" value={pratica.numero_protocollo || pratica.cui} />
            <DataField label="Data Presentazione" value={formatDate(pratica.data_presentazione)} />
            <DataField label="Comune Presentazione" value={pratica.comune_presentazione} />
            <DataField label="Tipo Segnalazione" value={pratica.tipo_segnalazione} />
            <DataField label="Motivo Subingresso" value={pratica.motivo_subingresso} />
            <DataField label="Settore Merceologico" value={pratica.settore_merceologico} />
            <DataField label="Ruolo Dichiarante" value={pratica.ruolo_dichiarante} />
          </DataSection>

          {/* Dati Subentrante */}
          {(pratica.sub_nome || pratica.sub_cognome || pratica.sub_ragione_sociale) && (
            <DataSection title="Dati Subentrante (Cessionario)" icon={User}>
              <DataField label="Ragione Sociale" value={pratica.sub_ragione_sociale} />
              <DataField label="Nome" value={pratica.sub_nome} />
              <DataField label="Cognome" value={pratica.sub_cognome} />
              <DataField label="Codice Fiscale" value={pratica.richiedente_cf} />
              <DataField label="Data di Nascita" value={formatDate(pratica.sub_data_nascita)} />
              <DataField label="Luogo di Nascita" value={pratica.sub_luogo_nascita} />
              <DataField label="Residenza" value={pratica.sub_residenza_via} />
              <DataField label="Comune Residenza" value={pratica.sub_residenza_comune} />
              <DataField label="CAP Residenza" value={pratica.sub_residenza_cap} />
              <DataField label="Sede Impresa" value={pratica.sub_sede_via} />
              <DataField label="Comune Sede" value={pratica.sub_sede_comune} />
              <DataField label="Provincia Sede" value={pratica.sub_sede_provincia} />
              <DataField label="CAP Sede" value={pratica.sub_sede_cap} />
              <DataField label="PEC" value={pratica.sub_pec} />
              <DataField label="Telefono" value={pratica.sub_telefono} />
            </DataSection>
          )}

          {/* Dati Cedente */}
          {(pratica.ced_nome || pratica.ced_cognome || pratica.ced_cf) && (
            <DataSection title="Dati Cedente (Dante Causa)" icon={Users}>
              <DataField label="Codice Fiscale" value={pratica.ced_cf} />
              <DataField label="Ragione Sociale" value={pratica.ced_ragione_sociale} />
              <DataField label="Nome" value={pratica.ced_nome} />
              <DataField label="Cognome" value={pratica.ced_cognome} />
              <DataField label="Data di Nascita" value={formatDate(pratica.ced_data_nascita)} />
              <DataField label="Luogo di Nascita" value={pratica.ced_luogo_nascita} />
              <DataField label="Residenza" value={pratica.ced_residenza_via} />
              <DataField label="Comune" value={pratica.ced_residenza_comune} />
              <DataField label="CAP" value={pratica.ced_residenza_cap} />
              <DataField label="PEC" value={pratica.ced_pec} />
              <DataField label="SCIA Precedente N. Prot." value={pratica.ced_scia_precedente} />
              <DataField label="Data Presentazione SCIA" value={formatDate(pratica.ced_data_presentazione)} />
              <DataField label="Comune Presentazione" value={pratica.ced_comune_presentazione} />
            </DataSection>
          )}

          {/* Dati Mercato e Posteggio */}
          {(pratica.mercato_nome || pratica.posteggio_numero) && (
            <DataSection title="Dati Posteggio e Mercato" icon={MapPin}>
              <DataField label="Mercato" value={pratica.mercato_nome} />
              <DataField label="Numero Posteggio" value={pratica.posteggio_numero} />
              <DataField label="Ubicazione" value={pratica.ubicazione_mercato} />
              <DataField label="Giorno Mercato" value={pratica.giorno_mercato} />
              <DataField label="Fila" value={pratica.fila} />
              <DataField label="Dimensioni (MQ)" value={pratica.dimensioni_mq} />
              <DataField label="Dimensioni Lineari" value={pratica.dimensioni_lineari} />
              <DataField label="Attrezzature" value={pratica.attrezzature} />
            </DataSection>
          )}

          {/* Dati Atto Notarile */}
          {(pratica.notaio_rogante || pratica.numero_repertorio) && (
            <DataSection title="Estremi Atto Notarile" icon={FileText}>
              <DataField label="Notaio Rogante" value={pratica.notaio_rogante} />
              <DataField label="N. Repertorio" value={pratica.numero_repertorio} />
              <DataField label="Data Atto" value={formatDate(pratica.data_atto)} />
            </DataSection>
          )}

          {/* Dati Delegato */}
          {(pratica.del_nome || pratica.del_cognome || pratica.del_cf) && (
            <DataSection title="Dati Delegato / Procuratore" icon={User}>
              <DataField label="Nome" value={pratica.del_nome} />
              <DataField label="Cognome" value={pratica.del_cognome} />
              <DataField label="Codice Fiscale" value={pratica.del_cf} />
              <DataField label="Data di Nascita" value={formatDate(pratica.del_data_nascita)} />
              <DataField label="Luogo di Nascita" value={pratica.del_luogo_nascita} />
              <DataField label="Qualifica / Titolo" value={pratica.del_qualifica} />
              <DataField label="Residenza" value={pratica.del_residenza_via} />
              <DataField label="Comune" value={pratica.del_residenza_comune} />
              <DataField label="CAP" value={pratica.del_residenza_cap} />
            </DataSection>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Info & Checks */}
        <div className="md:col-span-2 space-y-6">
          {/* Checks Card */}
          <Card className="bg-[#0a1628] border-[#1e293b]">
            <CardHeader>
              <CardTitle className="text-[#e8fbff]">Controlli Automatici</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pratica.checks.length === 0 ? (
                  <p className="text-[#e8fbff]/40 italic">Nessun controllo eseguito ancora.</p>
                ) : (
                  pratica.checks.map((check) => (
                    <div key={check.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1e293b]/30 border border-[#1e293b]">
                      <div className="flex items-center gap-3">
                        {check.esito ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[#e8fbff]">{check.check_code}</p>
                          <p className="text-xs text-[#e8fbff]/60">Fonte: {check.fonte}</p>
                        </div>
                      </div>
                      <div className="text-xs text-[#e8fbff]/40">
                        {new Date(check.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Placeholder */}
          <Card className="bg-[#0a1628] border-[#1e293b]">
            <CardHeader>
              <CardTitle className="text-[#e8fbff]">Documentazione</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-[#1e293b] rounded-lg">
                <p className="text-[#e8fbff]/40">Nessun documento allegato</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline & Score */}
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="bg-[#0a1628] border-[#1e293b]">
            <CardHeader>
              <CardTitle className="text-[#e8fbff]">Punteggio Affidabilità</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="relative flex items-center justify-center h-32 w-32 rounded-full border-8 border-[#1e293b]">
                <span className="text-4xl font-bold text-[#e8fbff]">{pratica.score ?? '-'}</span>
              </div>
              <p className="mt-4 text-sm text-[#e8fbff]/60 text-center">
                Basato su {pratica.checks.length} controlli effettuati
              </p>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="bg-[#0a1628] border-[#1e293b]">
            <CardHeader>
              <CardTitle className="text-[#e8fbff]">Timeline Eventi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-[#1e293b] ml-2 space-y-6">
                {pratica.timeline.map((event) => (
                  <div key={event.id} className="ml-6 relative">
                    <div className="absolute -left-[29px] h-3 w-3 rounded-full bg-[#00f0ff] border-2 border-[#0a1628]" />
                    <p className="text-xs text-[#e8fbff]/40 mb-1">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-[#e8fbff]">{event.tipo_evento}</p>
                    <p className="text-xs text-[#e8fbff]/60 mt-1">{event.descrizione}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
