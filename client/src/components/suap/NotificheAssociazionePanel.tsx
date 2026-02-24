/**
 * NotificheAssociazionePanel - Notifiche SUAP ricevute dall'associazione
 *
 * Mostra le notifiche inviate dal SUAP all'associazione:
 * - Concessioni emesse
 * - Regolarizzazioni richieste
 * - Pratiche rifiutate
 * - Messaggi generici
 *
 * Endpoint backend:
 *   GET /api/associazioni/:id/notifiche → lista notifiche
 *   PUT /api/associazioni/:id/notifiche/:notificaId/letta → segna come letta
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Mail, MailOpen, CheckCircle, XCircle, AlertTriangle,
  MessageSquare, RefreshCw, Loader2, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getImpersonationParams, authenticatedFetch } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { formatDateTime as formatDate } from '@/lib/formatUtils';

const API_BASE_URL = MIHUB_API_BASE_URL;

interface NotificaAssociazione {
  id: number;
  associazione_id: number;
  pratica_id?: number;
  tipo: 'CONCESSIONE_EMESSA' | 'REGOLARIZZAZIONE_RICHIESTA' | 'PRATICA_RIFIUTATA' | 'MESSAGGIO';
  oggetto: string;
  messaggio: string;
  letta: boolean;
  created_at: string;
}

const TIPO_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  CONCESSIONE_EMESSA: { icon: CheckCircle, color: 'text-green-400', label: 'Concessione Emessa' },
  REGOLARIZZAZIONE_RICHIESTA: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Regolarizzazione Richiesta' },
  PRATICA_RIFIUTATA: { icon: XCircle, color: 'text-red-400', label: 'Pratica Rifiutata' },
  MESSAGGIO: { icon: MessageSquare, color: 'text-blue-400', label: 'Messaggio' },
};

interface NotificheAssociazionePanelProps {
  onNotificheUpdate?: () => void;
}

export default function NotificheAssociazionePanel({ onNotificheUpdate }: NotificheAssociazionePanelProps) {
  const [notifiche, setNotifiche] = useState<NotificaAssociazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'tutte' | 'non_lette' | 'lette'>('tutte');

  const { associazioneId } = getImpersonationParams();

  const loadNotifiche = useCallback(async () => {
    if (!associazioneId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/associazioni/${associazioneId}/notifiche`);
      const data = await res.json();
      if (data.success && data.data) {
        setNotifiche(data.data);
      } else {
        setNotifiche([]);
      }
    } catch (error) {
      console.error('Errore caricamento notifiche associazione:', error);
      setNotifiche([]);
    } finally {
      setLoading(false);
    }
  }, [associazioneId]);

  useEffect(() => {
    loadNotifiche();
  }, [loadNotifiche]);

  const markAsRead = async (notificaId: number) => {
    if (!associazioneId) return;
    try {
      await authenticatedFetch(`${API_BASE_URL}/api/associazioni/${associazioneId}/notifiche/${notificaId}/letta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      setNotifiche(prev => prev.map(n =>
        n.id === notificaId ? { ...n, letta: true } : n
      ));
      onNotificheUpdate?.();
    } catch (error) {
      console.error('Errore marcatura notifica:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!associazioneId) return;
    try {
      await authenticatedFetch(`${API_BASE_URL}/api/associazioni/${associazioneId}/notifiche/lette-tutte`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      setNotifiche(prev => prev.map(n => ({ ...n, letta: true })));
      onNotificheUpdate?.();
    } catch (error) {
      console.error('Errore marcatura tutte notifiche:', error);
    }
  };

  const filteredNotifiche = notifiche.filter(n => {
    if (filter === 'non_lette') return !n.letta;
    if (filter === 'lette') return n.letta;
    return true;
  });

  const nonLetteCount = notifiche.filter(n => !n.letta).length;

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-[#e8fbff] flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Notifiche SUAP
          </h3>
          {nonLetteCount > 0 && (
            <Badge className="bg-red-500 text-white">{nonLetteCount} non lette</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {nonLetteCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="border-blue-500/30 text-blue-400 text-xs"
            >
              <MailOpen className="h-3 w-3 mr-1" />
              Segna tutte lette
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadNotifiche}
            className="border-[#3b82f6]/30 text-[#3b82f6]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex gap-2">
        {(['tutte', 'non_lette', 'lette'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f
              ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
              : 'border-[#334155] text-[#e8fbff]/60'
            }
          >
            {f === 'tutte' ? 'Tutte' : f === 'non_lette' ? 'Non lette' : 'Lette'}
            {f === 'non_lette' && nonLetteCount > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs px-1">{nonLetteCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-[#3b82f6]" />
        </div>
      ) : filteredNotifiche.length === 0 ? (
        <Card className="bg-[#1a2332] border-[#334155]">
          <CardContent className="flex flex-col items-center justify-center h-32 text-[#e8fbff]/50">
            <Bell className="h-8 w-8 mb-2 opacity-40" />
            <p>Nessuna notifica {filter !== 'tutte' ? `(${filter === 'non_lette' ? 'non letta' : 'letta'})` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredNotifiche.map(notifica => {
            const config = TIPO_CONFIG[notifica.tipo] ?? TIPO_CONFIG.MESSAGGIO;
            const Icon = config.icon;
            return (
              <Card
                key={notifica.id}
                className={`bg-[#1a2332] border-[#334155] ${!notifica.letta ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`mt-0.5 ${config.color}`}>
                        {notifica.letta ? <MailOpen className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${config.color} bg-transparent border ${config.color.replace('text-', 'border-')}/30 text-xs`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {notifica.pratica_id && (
                            <span className="text-xs text-[#e8fbff]/40">Pratica #{notifica.pratica_id}</span>
                          )}
                        </div>
                        <p className={`text-sm font-medium ${!notifica.letta ? 'text-[#e8fbff]' : 'text-[#e8fbff]/70'}`}>
                          {notifica.oggetto}
                        </p>
                        <p className="text-xs text-[#e8fbff]/50 mt-1 line-clamp-2">
                          {notifica.messaggio}
                        </p>
                        <p className="text-xs text-[#e8fbff]/30 mt-1">
                          {formatDate(notifica.created_at)}
                        </p>
                      </div>
                    </div>
                    {!notifica.letta && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notifica.id)}
                        className="text-blue-400 hover:bg-blue-500/10"
                        title="Segna come letta"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
