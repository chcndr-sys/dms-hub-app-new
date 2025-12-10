import { useEffect, useState, useRef } from 'react';

export interface AgentLogMessage {
  id: string;
  conversation_id: string;
  agent_name: string;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
  pending?: boolean;  // Flag per messaggi locali non ancora confermati dal server
}

interface UseAgentLogsOptions {
  conversationId: string | null;
  agentName?: string; // es. 'mio', 'abacus', 'manus', 'zapier'
  pollMs?: number;
  useWebSocket?: boolean; // Abilita WebSocket (default: true)
}

export function useAgentLogs({ 
  conversationId, 
  agentName, 
  pollMs = 30000, // Aumentato a 30s come fallback
  useWebSocket = true 
}: UseAgentLogsOptions) {
  const [messages, setMessages] = useState<AgentLogMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>();
  const wsConnectedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!conversationId) return;

    // 🔥 SVUOTA messaggi IMMEDIATAMENTE al cambio conversationId per evitare duplicati
    setMessages([]);

    let cancelled = false;
    let intervalId: number | undefined;
    let isFirstLoad = true;

    const load = async () => {
      try {
        // Loading solo al primo caricamento, non durante polling
        if (isFirstLoad) {
          setLoading(true);
        }
        
        const params = new URLSearchParams({
          conversation_id: conversationId,
          limit: '200',
        });
        if (agentName) params.set('agent_name', agentName);

        const res = await fetch(`/api/mio/agent-logs?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();

        if (!cancelled) {
          // 🔥 DEDUPLICAZIONE: Merge intelligente tra messaggi locali e server
          setMessages(prev => {
            const serverMessages = data.logs || [];
            
            // Crea un Set di ID dei messaggi dal server
            const serverIds = new Set(serverMessages.map((m: AgentLogMessage) => m.id));
            
            // Mantieni solo i messaggi locali che NON sono nel server (pending o temporanei)
            const localOnly = prev.filter(msg => !serverIds.has(msg.id));
            
            // Deduplica per contenuto + timestamp (per messaggi senza ID server)
            const deduped = serverMessages.filter((serverMsg: AgentLogMessage) => {
              // Se un messaggio locale ha stesso content e timestamp simile (±2 sec), è un duplicato
              const isDuplicate = localOnly.some(localMsg => 
                localMsg.content === serverMsg.content && 
                Math.abs(new Date(localMsg.created_at).getTime() - new Date(serverMsg.created_at).getTime()) < 2000
              );
              return !isDuplicate;
            });
            
            // Merge: messaggi locali pending + messaggi server dedupati
            const merged = [...localOnly, ...deduped].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            
            return merged;
          });
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Errore caricamento log');
        }
      } finally {
        if (!cancelled && isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };

    // WebSocket connection
    const connectWebSocket = () => {
      if (!useWebSocket || !conversationId) return;

      try {
        // Determina URL WebSocket in base all'ambiente
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname === 'localhost' 
          ? 'localhost:8080' 
          : 'api.mio-hub.me';
        const wsPath = window.location.hostname === 'localhost' ? '' : '/ws';
        const wsUrl = `${wsProtocol}//${wsHost}${wsPath}`;

        console.log('[useAgentLogs] Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[useAgentLogs] WebSocket connected');
          wsConnectedRef.current = true;
          // Subscribe to conversation
          ws.send(JSON.stringify({
            action: 'subscribe',
            conversation_id: conversationId
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[useAgentLogs] WebSocket message:', data);

            // Gestisci nuovo messaggio
            if (data.action === 'new_message' && data.message) {
              const newMessage: AgentLogMessage = {
                id: `ws-${Date.now()}`,
                conversation_id: data.conversation_id,
                agent_name: data.message.agent_name,
                role: data.message.role,
                content: data.message.message,
                created_at: data.message.timestamp || new Date().toISOString(),
              };

              setMessages(prev => {
                // Evita duplicati
                const exists = prev.some(msg => 
                  msg.agent_name === newMessage.agent_name &&
                  msg.content === newMessage.content &&
                  Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 1000
                );
                if (exists) return prev;
                return [...prev, newMessage];
              });
            }
          } catch (err) {
            console.error('[useAgentLogs] Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('[useAgentLogs] WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('[useAgentLogs] WebSocket disconnected');
          wsRef.current = null;
          wsConnectedRef.current = false;

          // Riconnetti dopo 5 secondi se non cancellato
          if (!cancelled && useWebSocket) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              console.log('[useAgentLogs] Reconnecting WebSocket...');
              connectWebSocket();
            }, 5000);
          }
        };
      } catch (error) {
        console.error('[useAgentLogs] Error creating WebSocket:', error);
      }
    };

    // Primo load al mount
    load();

    // Connetti WebSocket
    if (useWebSocket) {
      connectWebSocket();
    }

    // Polling silenzioso come fallback (ridotto a 30s)
    // Solo se WebSocket non è abilitato o fallisce
    let fallbackTimeout: number | undefined;
    if (!useWebSocket) {
      intervalId = window.setInterval(load, pollMs);
    } else {
      // Polling di fallback solo se WebSocket non si connette entro 10s
      fallbackTimeout = window.setTimeout(() => {
        if (!wsConnectedRef.current) {
          console.log('[useAgentLogs] WebSocket failed to connect, starting polling fallback');
          intervalId = window.setInterval(load, pollMs);
        }
      }, 10000);
    }

    return () => {
      cancelled = true;
      if (fallbackTimeout) window.clearTimeout(fallbackTimeout);
      if (intervalId) window.clearInterval(intervalId);
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, agentName, pollMs, useWebSocket]);

  return { messages, setMessages, loading, error };
}
