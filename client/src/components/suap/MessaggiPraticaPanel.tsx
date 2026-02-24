/**
 * MessaggiPraticaPanel - Messaggistica diretta SUAP ↔ Associazione per una pratica
 *
 * Thread di messaggi collegati a una pratica SUAP.
 * Usato sia lato SUAP che lato associazione.
 *
 * Endpoint backend:
 *   GET  /api/suap/pratiche/:id/messaggi → lista messaggi
 *   POST /api/suap/pratiche/:id/messaggi → invia messaggio
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare, Send, Loader2, RefreshCw, User, Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { getImpersonationParams, isAssociazioneImpersonation, authenticatedFetch } from '@/hooks/useImpersonation';
import { formatDateTime as formatDate } from '@/lib/formatUtils';

const API_BASE_URL = MIHUB_API_BASE_URL;

interface MessaggioPratica {
  id: number;
  pratica_id: number;
  mittente_tipo: 'SUAP' | 'ASSOCIAZIONE';
  mittente_id: number;
  oggetto?: string;
  messaggio: string;
  letto: boolean;
  created_at: string;
}

interface MessaggiPraticaPanelProps {
  praticaId: number;
  mittenteId: number;
}

export default function MessaggiPraticaPanel({ praticaId, mittenteId }: MessaggiPraticaPanelProps) {
  const [messaggi, setMessaggi] = useState<MessaggioPratica[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [nuovoMessaggio, setNuovoMessaggio] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAssociazione = isAssociazioneImpersonation();
  const mittenteTipo = isAssociazione ? 'ASSOCIAZIONE' : 'SUAP';

  const loadMessaggi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/suap/pratiche/${praticaId}/messaggi`);
      const data = await res.json();
      if (data.success && data.data) {
        setMessaggi(data.data);
      } else {
        setMessaggi([]);
      }
    } catch (error) {
      console.error('Errore caricamento messaggi pratica:', error);
      setMessaggi([]);
    } finally {
      setLoading(false);
    }
  }, [praticaId]);

  useEffect(() => {
    loadMessaggi();
  }, [loadMessaggi]);

  useEffect(() => {
    // Scroll to bottom when messaggi change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messaggi]);

  const inviaMessaggio = async () => {
    if (!nuovoMessaggio.trim()) return;
    setSending(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/suap/pratiche/${praticaId}/messaggi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mittente_tipo: mittenteTipo,
          mittente_id: mittenteId,
          messaggio: nuovoMessaggio.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessaggi(prev => [...prev, data.data]);
        setNuovoMessaggio('');
      }
    } catch (error) {
      console.error('Errore invio messaggio:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#3b82f6]/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#e8fbff] text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            Messaggi Pratica
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMessaggi}
            className="text-[#3b82f6] hover:bg-[#3b82f6]/10"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-5 w-5 animate-spin text-[#3b82f6]" />
          </div>
        ) : (
          <>
            {/* Thread messaggi */}
            <div
              ref={scrollRef}
              className="max-h-64 overflow-y-auto space-y-3 mb-3 pr-1"
            >
              {messaggi.length === 0 ? (
                <p className="text-sm text-[#e8fbff]/40 text-center py-4">
                  Nessun messaggio. Avvia la conversazione.
                </p>
              ) : (
                messaggi.map(msg => {
                  const isMio = msg.mittente_tipo === mittenteTipo;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          isMio
                            ? 'bg-blue-500/20 border border-blue-500/30'
                            : 'bg-[#0b1220] border border-[#334155]'
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {msg.mittente_tipo === 'SUAP' ? (
                            <Building2 className="h-3 w-3 text-[#14b8a6]" />
                          ) : (
                            <User className="h-3 w-3 text-blue-400" />
                          )}
                          <span className="text-xs text-[#e8fbff]/50">
                            {msg.mittente_tipo === 'SUAP' ? 'SUAP' : 'Associazione'}
                          </span>
                          <span className="text-xs text-[#e8fbff]/30 ml-auto">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-[#e8fbff]">{msg.messaggio}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input invio messaggio */}
            <div className="flex gap-2">
              <Input
                value={nuovoMessaggio}
                onChange={(e) => setNuovoMessaggio(e.target.value)}
                placeholder="Scrivi un messaggio..."
                className="bg-[#0b1220] border-[#334155] text-[#e8fbff] placeholder-[#e8fbff]/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    inviaMessaggio();
                  }
                }}
              />
              <Button
                onClick={inviaMessaggio}
                disabled={sending || !nuovoMessaggio.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
