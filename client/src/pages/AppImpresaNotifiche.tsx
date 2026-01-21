/**
 * App Impresa - Gestione Notifiche
 * Pagina dedicata per visualizzare e gestire le notifiche ricevute dall'impresa
 * Può essere integrata nell'app DMS per ambulanti o come pagina web per negozianti
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Bell, BellRing, Mail, MailOpen, Send, Calendar, Clock, 
  Building2, GraduationCap, Landmark, CheckCircle, Archive,
  MessageSquare, ArrowLeft, User, RefreshCw, Filter, Search,
  AlertCircle, FileText, Briefcase, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Tipo notifica
interface Notifica {
  id: number;
  mittente_id: number;
  mittente_tipo: string;
  mittente_nome: string;
  titolo: string;
  messaggio: string;
  tipo_messaggio: string;
  data_invio: string;
  id_conversazione: number | null;
  target_tipo: string;
  target_nome: string;
  destinatario_id: number;
  stato: string;
  data_lettura: string | null;
}

export default function AppImpresaNotifiche() {
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [notificaSelezionata, setNotificaSelezionata] = useState<Notifica | null>(null);
  const [nonLette, setNonLette] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'tutte' | 'non_lette' | 'lette'>('tutte');
  const [rispostaText, setRispostaText] = useState('');
  const [invioRisposta, setInvioRisposta] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // ID impresa demo (in produzione verrà dall'autenticazione)
  const IMPRESA_ID = 1;
  const IMPRESA_NOME = 'Mercato Centrale S.r.l.';
  
  const MIHUB_API = import.meta.env.VITE_MIHUB_API_BASE_URL || 'https://orchestratore.mio-hub.me/api';

  // Carica notifiche
  const fetchNotifiche = async () => {
    try {
      setLoading(true);
      const statoParam = filtro === 'non_lette' ? '&stato=INVIATO' : filtro === 'lette' ? '&stato=LETTO' : '';
      const response = await fetch(`${MIHUB_API}/notifiche/impresa/${IMPRESA_ID}?limit=50${statoParam}`);
      const data = await response.json();
      
      if (data.success) {
        setNotifiche(data.data.notifiche || []);
        setNonLette(data.data.non_lette || 0);
      }
    } catch (error) {
      console.error('Errore caricamento notifiche:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifiche();
    // Polling ogni 30 secondi per nuove notifiche
    const interval = setInterval(fetchNotifiche, 30000);
    return () => clearInterval(interval);
  }, [filtro]);

  // Segna come letta
  const segnaComeLetta = async (notifica: Notifica) => {
    if (notifica.stato === 'LETTO') return;
    
    try {
      await fetch(`${MIHUB_API}/notifiche/leggi/${notifica.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impresa_id: IMPRESA_ID })
      });
      
      // Aggiorna stato locale
      setNotifiche(prev => prev.map(n => 
        n.id === notifica.id ? { ...n, stato: 'LETTO', data_lettura: new Date().toISOString() } : n
      ));
      setNonLette(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Errore aggiornamento lettura:', error);
    }
  };

  // Invia risposta
  const inviaRisposta = async (tipoRisposta: string = 'RISPOSTA') => {
    if (!notificaSelezionata || !rispostaText.trim()) return;
    
    setInvioRisposta(true);
    try {
      const response = await fetch(`${MIHUB_API}/notifiche/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifica_originale_id: notificaSelezionata.id,
          impresa_id: IMPRESA_ID,
          impresa_nome: IMPRESA_NOME,
          messaggio: rispostaText,
          tipo_risposta: tipoRisposta
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setRispostaText('');
        alert('Risposta inviata con successo!');
        fetchNotifiche();
      } else {
        alert('Errore: ' + data.error);
      }
    } catch (error) {
      alert('Errore invio risposta');
    } finally {
      setInvioRisposta(false);
    }
  };

  // Archivia notifica
  const archiviaNotifica = async (notifica: Notifica) => {
    try {
      await fetch(`${MIHUB_API}/notifiche/archivia/${notifica.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impresa_id: IMPRESA_ID })
      });
      
      setNotifiche(prev => prev.filter(n => n.id !== notifica.id));
      if (notificaSelezionata?.id === notifica.id) {
        setNotificaSelezionata(null);
      }
    } catch (error) {
      console.error('Errore archiviazione:', error);
    }
  };

  // Icona mittente
  const getMittenteIcon = (tipo: string) => {
    switch (tipo) {
      case 'ENTE_FORMATORE': return <GraduationCap className="w-5 h-5 text-blue-400" />;
      case 'ASSOCIAZIONE': return <Landmark className="w-5 h-5 text-emerald-400" />;
      case 'PA': return <Building2 className="w-5 h-5 text-purple-400" />;
      default: return <Mail className="w-5 h-5 text-gray-400" />;
    }
  };

  // Colore tipo messaggio
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'INFORMATIVA': return 'bg-blue-500/20 text-blue-400';
      case 'PROMOZIONALE': return 'bg-emerald-500/20 text-emerald-400';
      case 'URGENTE': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e8fbff]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#0b1220] border-b border-[#3b82f6]/20 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e8fbff]">Notifiche Impresa</h1>
              <p className="text-sm text-[#e8fbff]/50">{IMPRESA_NOME}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {nonLette > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {nonLette} nuove
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchNotifiche}
              className="border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista Notifiche */}
          <div className="lg:col-span-1">
            <Card className="bg-[#1a2332] border-[#3b82f6]/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#e8fbff] text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#3b82f6]" />
                    Messaggi
                  </CardTitle>
                  <select 
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value as any)}
                    className="bg-[#0b1220] border border-[#3b82f6]/30 rounded px-2 py-1 text-sm text-[#e8fbff]"
                  >
                    <option value="tutte">Tutte</option>
                    <option value="non_lette">Non lette</option>
                    <option value="lette">Lette</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8 text-[#e8fbff]/50">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Caricamento...</p>
                    </div>
                  ) : notifiche.length === 0 ? (
                    <div className="text-center py-8 text-[#e8fbff]/50">
                      <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>Nessuna notifica</p>
                    </div>
                  ) : (
                    notifiche.map((notifica) => (
                      <div
                        key={notifica.id}
                        onClick={() => {
                          setNotificaSelezionata(notifica);
                          segnaComeLetta(notifica);
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          notificaSelezionata?.id === notifica.id
                            ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/50'
                            : notifica.stato === 'INVIATO'
                            ? 'bg-[#0b1220] border border-[#3b82f6]/30 hover:border-[#3b82f6]/50'
                            : 'bg-[#0b1220]/50 border border-transparent hover:border-[#3b82f6]/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {notifica.stato === 'INVIATO' ? (
                              <BellRing className="w-4 h-4 text-[#3b82f6]" />
                            ) : (
                              <MailOpen className="w-4 h-4 text-[#e8fbff]/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getMittenteIcon(notifica.mittente_tipo)}
                              <span className="text-sm font-medium truncate">{notifica.mittente_nome}</span>
                            </div>
                            <p className={`text-sm truncate ${notifica.stato === 'INVIATO' ? 'font-semibold' : ''}`}>
                              {notifica.titolo}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`text-xs ${getTipoColor(notifica.tipo_messaggio)}`}>
                                {notifica.tipo_messaggio}
                              </Badge>
                              <span className="text-xs text-[#e8fbff]/30">
                                {new Date(notifica.data_invio).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#e8fbff]/30 flex-shrink-0" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dettaglio Notifica */}
          <div className="lg:col-span-2">
            {notificaSelezionata ? (
              <Card className="bg-[#1a2332] border-[#3b82f6]/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getMittenteIcon(notificaSelezionata.mittente_tipo)}
                      <div>
                        <CardTitle className="text-[#e8fbff]">{notificaSelezionata.titolo}</CardTitle>
                        <CardDescription className="text-[#e8fbff]/50">
                          Da: {notificaSelezionata.mittente_nome} • {new Date(notificaSelezionata.data_invio).toLocaleString('it-IT')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getTipoColor(notificaSelezionata.tipo_messaggio)}>
                        {notificaSelezionata.tipo_messaggio}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => archiviaNotifica(notificaSelezionata)}
                        className="text-[#e8fbff]/50 hover:text-[#e8fbff]"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messaggio */}
                  <div className="bg-[#0b1220] rounded-lg p-4 border border-[#3b82f6]/10">
                    <div className="prose prose-invert max-w-none">
                      {notificaSelezionata.messaggio.split('\n').map((line, idx) => (
                        <p key={idx} className="text-[#e8fbff]/80 mb-2">
                          {line.startsWith('**') && line.endsWith('**') ? (
                            <strong>{line.replace(/\*\*/g, '')}</strong>
                          ) : line.startsWith('- ') ? (
                            <span className="flex items-start gap-2">
                              <span className="text-[#3b82f6]">•</span>
                              {line.substring(2)}
                            </span>
                          ) : (
                            line
                          )}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Azioni Rapide */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      className="border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
                      onClick={() => {
                        setRispostaText('Vorrei richiedere un appuntamento per discutere di questo argomento.');
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Richiedi Appuntamento
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10"
                      onClick={() => {
                        setRispostaText('Vorrei iscrivermi al corso menzionato. Potete inviarmi maggiori dettagli?');
                      }}
                    >
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Iscriviti al Corso
                    </Button>
                  </div>

                  {/* Form Risposta */}
                  <div className="bg-[#0b1220] rounded-lg p-4 border border-[#3b82f6]/10">
                    <label className="block text-sm text-[#e8fbff]/70 mb-2">Rispondi al messaggio</label>
                    <textarea
                      value={rispostaText}
                      onChange={(e) => setRispostaText(e.target.value)}
                      rows={3}
                      placeholder="Scrivi la tua risposta..."
                      className="w-full bg-[#1a2332] border border-[#3b82f6]/30 rounded-lg p-3 text-[#e8fbff] resize-none focus:outline-none focus:border-[#3b82f6]"
                    />
                    <div className="flex justify-end mt-3 gap-2">
                      <Button 
                        variant="ghost"
                        onClick={() => setRispostaText('')}
                        className="text-[#e8fbff]/50"
                      >
                        Annulla
                      </Button>
                      <Button 
                        onClick={() => inviaRisposta()}
                        disabled={!rispostaText.trim() || invioRisposta}
                        className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white"
                      >
                        {invioRisposta ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Invia Risposta
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#1a2332] border-[#3b82f6]/20 h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-[#3b82f6]/30" />
                  <p className="text-[#e8fbff]/50 text-lg">Seleziona un messaggio per visualizzarlo</p>
                  <p className="text-[#e8fbff]/30 text-sm mt-2">
                    Riceverai notifiche da enti formatori, associazioni e PA
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sezione Azioni Rapide */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-[#e8fbff] mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#3b82f6]" />
            Azioni Rapide
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#1a2332] border-[#3b82f6]/20 hover:border-[#3b82f6]/50 cursor-pointer transition-all">
              <CardContent className="p-4 text-center">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-[#3b82f6]" />
                <p className="text-sm font-medium">Corsi Disponibili</p>
                <p className="text-xs text-[#e8fbff]/50">Visualizza e iscriviti</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#10b981]/20 hover:border-[#10b981]/50 cursor-pointer transition-all">
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-[#10b981]" />
                <p className="text-sm font-medium">Bandi Aperti</p>
                <p className="text-xs text-[#e8fbff]/50">Opportunità di finanziamento</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#8b5cf6]/20 hover:border-[#8b5cf6]/50 cursor-pointer transition-all">
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-[#8b5cf6]" />
                <p className="text-sm font-medium">Prenota Appuntamento</p>
                <p className="text-xs text-[#e8fbff]/50">Con l'associazione</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2332] border-[#f59e0b]/20 hover:border-[#f59e0b]/50 cursor-pointer transition-all">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#f59e0b]" />
                <p className="text-sm font-medium">Stato Regolarità</p>
                <p className="text-xs text-[#e8fbff]/50">DURC, SCIA, Attestati</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
