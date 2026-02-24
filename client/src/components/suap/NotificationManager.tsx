/**
 * NotificationManager.tsx
 * Componente riutilizzabile per la gestione notifiche tra settori comunali e imprese
 * 
 * Utilizzo:
 * - SSO SUAP: <NotificationManager mittenteTipo="SUAP" mittenteId={comuneId} mittenteNome="SUAP Comune di X" />
 * - Polizia Municipale: <NotificationManager mittenteTipo="POLIZIA_MUNICIPALE" mittenteId={comuneId} mittenteNome="PM Comune di X" />
 * - Tributi: <NotificationManager mittenteTipo="TRIBUTI" mittenteId={comuneId} mittenteNome="Tributi Comune di X" />
 */

import { useState, useEffect } from 'react';
import { 
  Bell, Send, MessageSquare, RefreshCw, Mail, MailOpen,
  CheckCircle, Clock, Users, Building2, Store, User,
  Filter, Eye, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime as formatDate } from '@/lib/formatUtils';
import { authenticatedFetch } from '@/hooks/useImpersonation';

// v5.9.0: Usa MIHUB Hetzner (stesso backend di ControlliSanzioniPanel per coerenza notifiche)
const MIHUB_API = (import.meta.env.VITE_MIHUB_API_URL || 'https://mihub.157-90-29-66.nip.io') + '/api';

// Interfacce
interface Messaggio {
  id: number;
  mittente_id: number;
  mittente_tipo: string;
  mittente_nome: string;
  titolo: string;
  messaggio: string;
  tipo_messaggio: string;
  target_tipo: string;
  target_id: number | null;
  target_nome: string | null;
  created_at: string;
  direzione: 'INVIATO' | 'RICEVUTO';
  totale_destinatari: number;
  letti: number;
  non_letti: number;
  letta?: boolean;
}

interface Mercato {
  id: number;
  name?: string;
  nome?: string;
}

interface Hub {
  hub_id: number;
  comune_nome: string;
}

interface Impresa {
  id: number;
  denominazione: string;
}

interface NotificationManagerProps {
  mittenteTipo: string;      // 'SUAP' | 'POLIZIA_MUNICIPALE' | 'TRIBUTI'
  mittenteId: number;        // ID del comune
  mittenteNome: string;      // Nome visualizzato (es. "SUAP Comune di Grosseto")
  onNotificheUpdate?: () => void;  // Callback per aggiornare il conteggio notifiche nel parent
  comuneId?: number;         // ID del comune per filtrare i dati (opzionale, usato in impersonificazione)
}

export function NotificationManager({ mittenteTipo, mittenteId, mittenteNome, onNotificheUpdate, comuneId }: NotificationManagerProps) {
  // State
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [filtroMessaggi, setFiltroMessaggi] = useState<'tutti' | 'inviati' | 'ricevuti'>('tutti');
  const [loading, setLoading] = useState(true);
  const [invioLoading, setInvioLoading] = useState(false);
  const [nonLetti, setNonLetti] = useState(0);
  
  // Liste per destinatari
  const [mercatiList, setMercatiList] = useState<Mercato[]>([]);
  const [hubList, setHubList] = useState<Hub[]>([]);
  const [impreseList, setImpreseList] = useState<Impresa[]>([]);
  
  // Form state
  const [targetTipo, setTargetTipo] = useState<string>('TUTTI');
  const [targetId, setTargetId] = useState<string>('');
  const [tipoMessaggio, setTipoMessaggio] = useState<string>('INFORMATIVA');
  const [titolo, setTitolo] = useState<string>('');
  const [messaggio, setMessaggio] = useState<string>('');
  
  // Messaggio selezionato per visualizzazione
  const [messaggioSelezionato, setMessaggioSelezionato] = useState<Messaggio | null>(null);

  // Fetch messaggi
  const fetchMessaggi = async () => {
    try {
      setLoading(true);
      // Costruisce i parametri query
      const params = new URLSearchParams();
      if (filtroMessaggi !== 'tutti') params.append('filtro', filtroMessaggi);
      if (comuneId) params.append('comune_id', comuneId.toString());
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const response = await fetch(`${MIHUB_API}/notifiche/messaggi/${mittenteTipo}/${mittenteId}${queryString}`);
      const data = await response.json();
      
      if (data.success) {
        setMessaggi(data.data || []);
        setNonLetti(data.non_letti || 0);
      }
    } catch (error) {
      console.error('Errore caricamento messaggi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch liste destinatari
  const fetchDestinatari = async () => {
    try {
      // Costruisce query param per comune_id
      const comuneParam = comuneId ? `?comune_id=${comuneId}` : '';
      
      // Mercati - filtrati per comune se specificato
      const mercatiRes = await fetch(`${MIHUB_API}/notifiche/markets${comuneParam}`);
      const mercatiData = await mercatiRes.json();
      if (mercatiData.success) setMercatiList(mercatiData.data || []);
      
      // Imprese - filtrate per comune se specificato
      const impreseRes = await fetch(`${MIHUB_API}/notifiche/imprese${comuneParam}`);
      const impreseData = await impreseRes.json();
      if (impreseData.success) setImpreseList(impreseData.data || []);
      
      // HUB (da targets)
      const targetsRes = await fetch(`${MIHUB_API}/notifiche/targets`);
      const targetsData = await targetsRes.json();
      if (targetsData.success && targetsData.data?.hubs) {
        setHubList(targetsData.data.hubs);
      }
    } catch (error) {
      console.error('Errore caricamento destinatari:', error);
    }
  };

  useEffect(() => {
    fetchMessaggi();
    fetchDestinatari();
    
    // Polling ogni 30 secondi
    const interval = setInterval(fetchMessaggi, 30000);
    return () => clearInterval(interval);
  }, [mittenteTipo, mittenteId, filtroMessaggi]);

  // Invio notifica
  const handleInviaNotifica = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titolo.trim() || !messaggio.trim()) {
      alert('Titolo e messaggio sono obbligatori');
      return;
    }
    
    setInvioLoading(true);
    try {
      let targetNome = null;
      if (targetTipo === 'MERCATO' && targetId) {
        const mercato = mercatiList.find(m => m.id === parseInt(targetId));
        targetNome = mercato?.name || mercato?.nome;
      } else if (targetTipo === 'HUB' && targetId) {
        const hub = hubList.find(h => h.hub_id === parseInt(targetId));
        targetNome = hub?.comune_nome;
      } else if (targetTipo === 'IMPRESA' && targetId) {
        const impresa = impreseList.find(i => i.id === parseInt(targetId));
        targetNome = impresa?.denominazione;
      }
      
      const response = await authenticatedFetch(`${MIHUB_API}/notifiche/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mittente_tipo: mittenteTipo,
          mittente_id: mittenteId,
          mittente_nome: mittenteNome,
          titolo: titolo,
          messaggio: messaggio,
          tipo_messaggio: tipoMessaggio,
          target_tipo: targetTipo,
          target_id: targetId || null,
          target_nome: targetNome
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`✅ Notifica inviata con successo a ${data.data.destinatari_count} destinatari!`);
        // Reset form
        setTitolo('');
        setMessaggio('');
        setTargetTipo('TUTTI');
        setTargetId('');
        // Refresh lista
        fetchMessaggi();
      } else {
        alert('❌ Errore: ' + data.error);
      }
    } catch (error) {
      alert('❌ Errore invio notifica');
    } finally {
      setInvioLoading(false);
    }
  };

  // Segna risposta come letta
  const segnaComeLetta = async (msg: Messaggio) => {
    if (msg.direzione !== 'RICEVUTO' || msg.letta) return;
    
    try {
      await authenticatedFetch(`${MIHUB_API}/notifiche/risposte/${msg.id}/letta`, {
        method: 'PUT'
      });
      
      // Aggiorna stato locale
      setMessaggi(prev => prev.map(m => 
        m.id === msg.id ? { ...m, letta: true } : m
      ));
      setNonLetti(prev => Math.max(0, prev - 1));
      
      // Notifica il parent per aggiornare il badge sul tab
      if (onNotificheUpdate) {
        onNotificheUpdate();
      }
    } catch (error) {
      console.error('Errore segna letta:', error);
    }
  };

  // Colore tipo messaggio
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'INFORMATIVA': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'PROMOZIONALE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'URGENTE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'RISPOSTA': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Icona destinatario
  const getTargetIcon = (tipo: string) => {
    switch (tipo) {
      case 'TUTTI': return <Users className="w-4 h-4" />;
      case 'MERCATO': return <Store className="w-4 h-4" />;
      case 'HUB': return <Building2 className="w-4 h-4" />;
      case 'IMPRESA': return <User className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  // Filtra messaggi
  const messaggiFiltrati = messaggi.filter(m => {
    if (filtroMessaggi === 'inviati') return m.direzione === 'INVIATO';
    if (filtroMessaggi === 'ricevuti') return m.direzione === 'RICEVUTO';
    return true;
  });

  const countInviati = messaggi.filter(m => m.direzione === 'INVIATO').length;
  const countRicevuti = messaggi.filter(m => m.direzione === 'RICEVUTO').length;

  return (
    <div className="space-y-6">
      {/* Form Invio Notifica */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/20">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#3b82f6]" />
            Invia Notifica alle Imprese
          </CardTitle>
          <CardDescription className="text-[#e8fbff]/50">
            Invia comunicazioni informative o promozionali alle imprese iscritte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviaNotifica} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#e8fbff]/70 mb-1">Destinatari</label>
                <select 
                  value={targetTipo}
                  onChange={(e) => {
                    setTargetTipo(e.target.value);
                    setTargetId('');
                  }}
                  className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]"
                  required
                >
                  <option value="TUTTI">Tutte le Imprese</option>
                  <option value="MERCATO">Imprese del Mercato...</option>
                  <option value="HUB">Negozi dell'HUB...</option>
                  <option value="IMPRESA">Impresa Singola...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#e8fbff]/70 mb-1">Tipo Messaggio</label>
                <select 
                  value={tipoMessaggio}
                  onChange={(e) => setTipoMessaggio(e.target.value)}
                  className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]"
                  required
                >
                  <option value="INFORMATIVA">Informativa</option>
                  <option value="URGENTE">Urgente</option>
                  <option value="PROMOZIONALE">Promozionale</option>
                </select>
              </div>
            </div>
            
            {/* Selezione destinatario specifico */}
            {['MERCATO', 'HUB', 'IMPRESA'].includes(targetTipo) && (
              <div>
                <label className="block text-sm text-[#e8fbff]/70 mb-1">Seleziona Destinatario Specifico</label>
                <select 
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]"
                  required
                >
                  <option value="">Seleziona...</option>
                  {targetTipo === 'MERCATO' && mercatiList.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.nome}</option>
                  ))}
                  {targetTipo === 'HUB' && hubList.map(h => (
                    <option key={h.hub_id} value={h.hub_id}>{h.comune_nome}</option>
                  ))}
                  {targetTipo === 'IMPRESA' && impreseList.map(i => (
                    <option key={i.id} value={i.id}>{i.denominazione}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm text-[#e8fbff]/70 mb-1">Titolo</label>
              <input 
                type="text" 
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                placeholder="Es: Avviso importante dal SUAP" 
                className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm text-[#e8fbff]/70 mb-1">Messaggio</label>
              <textarea 
                value={messaggio}
                onChange={(e) => setMessaggio(e.target.value)}
                rows={4} 
                placeholder="Scrivi il messaggio da inviare alle imprese..."
                className="w-full bg-[#0b1220] border border-[#3b82f6]/30 rounded-lg p-2 text-[#e8fbff]" 
                required 
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={invioLoading}
                className="px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {invioLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Invia Notifica
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista Messaggi */}
      <Card className="bg-[#1a2332] border-[#3b82f6]/20">
        <CardHeader>
          <CardTitle className="text-[#e8fbff] flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#3b82f6]" />
            Messaggi
            {nonLetti > 0 && (
              <Badge className="bg-red-500 text-white ml-2">
                {nonLetti} nuove
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-[#e8fbff]/50">
            Messaggi inviati e ricevuti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtri */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filtroMessaggi === 'tutti' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroMessaggi('tutti')}
              className={filtroMessaggi === 'tutti' ? 'bg-[#3b82f6]' : 'border-[#3b82f6]/30 text-[#e8fbff]/70'}
            >
              Tutti
            </Button>
            <Button
              variant={filtroMessaggi === 'inviati' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroMessaggi('inviati')}
              className={filtroMessaggi === 'inviati' ? 'bg-[#3b82f6]' : 'border-[#3b82f6]/30 text-[#e8fbff]/70'}
            >
              Inviati ({countInviati})
            </Button>
            <Button
              variant={filtroMessaggi === 'ricevuti' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroMessaggi('ricevuti')}
              className={filtroMessaggi === 'ricevuti' ? 'bg-[#3b82f6]' : 'border-[#3b82f6]/30 text-[#e8fbff]/70'}
            >
              Ricevuti ({countRicevuti})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMessaggi}
              className="ml-auto text-[#e8fbff]/70 hover:text-[#e8fbff]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Lista */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {loading && messaggi.length === 0 ? (
              <div className="text-center py-8 text-[#e8fbff]/50">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                Caricamento...
              </div>
            ) : messaggiFiltrati.length === 0 ? (
              <div className="text-center py-8 text-[#e8fbff]/50">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Nessun messaggio
              </div>
            ) : (
              messaggiFiltrati.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setMessaggioSelezionato(msg);
                    if (msg.direzione === 'RICEVUTO') segnaComeLetta(msg);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-[#0b1220]/50 ${
                    msg.direzione === 'RICEVUTO' && !msg.letta 
                      ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30' 
                      : 'bg-[#0b1220]/30 border-[#3b82f6]/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.direzione === 'INVIATO' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                      }`}>
                        {msg.direzione === 'INVIATO' ? (
                          <Send className="w-4 h-4 text-emerald-400" />
                        ) : (
                          msg.letta ? <MailOpen className="w-4 h-4 text-blue-400" /> : <Mail className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#e8fbff] truncate">
                            {msg.direzione === 'INVIATO' ? (
                              <>A: {msg.target_nome || msg.target_tipo}</>
                            ) : (
                              <>Da: {msg.mittente_nome}</>
                            )}
                          </span>
                          <Badge className={`text-xs ${getTipoColor(msg.tipo_messaggio)}`}>
                            {msg.tipo_messaggio}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#e8fbff]/80 font-medium truncate">{msg.titolo}</p>
                        <p className="text-xs text-[#e8fbff]/50 truncate">{msg.messaggio}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#e8fbff]/50">{formatDate(msg.created_at)}</p>
                      {msg.direzione === 'INVIATO' && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-[#e8fbff]/50">
                          <CheckCircle className="w-3 h-3" />
                          {msg.letti}/{msg.totale_destinatari}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Dettaglio Messaggio */}
      {messaggioSelezionato && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1a2332] border-[#3b82f6]/20 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="border-b border-[#3b82f6]/20">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                    {messaggioSelezionato.direzione === 'INVIATO' ? (
                      <Send className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Mail className="w-5 h-5 text-blue-400" />
                    )}
                    {messaggioSelezionato.titolo}
                  </CardTitle>
                  <CardDescription className="text-[#e8fbff]/50 mt-1">
                    {messaggioSelezionato.direzione === 'INVIATO' ? (
                      <>Inviato a: {messaggioSelezionato.target_nome || messaggioSelezionato.target_tipo}</>
                    ) : (
                      <>Da: {messaggioSelezionato.mittente_nome}</>
                    )}
                    {' • '}{formatDate(messaggioSelezionato.created_at)}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMessaggioSelezionato(null)}
                  className="text-[#e8fbff]/50 hover:text-[#e8fbff]"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Badge className={`mb-4 ${getTipoColor(messaggioSelezionato.tipo_messaggio)}`}>
                {messaggioSelezionato.tipo_messaggio}
              </Badge>
              <div className="bg-[#0b1220] rounded-lg p-4 text-[#e8fbff]/90 whitespace-pre-wrap">
                {messaggioSelezionato.messaggio}
              </div>
              {messaggioSelezionato.direzione === 'INVIATO' && (
                <div className="mt-4 flex items-center gap-4 text-sm text-[#e8fbff]/50">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {messaggioSelezionato.totale_destinatari} destinatari
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {messaggioSelezionato.letti} letti
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {messaggioSelezionato.non_letti} non letti
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default NotificationManager;
