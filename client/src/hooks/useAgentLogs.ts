import { useEffect, useState, useRef, useCallback } from 'react';

export interface AgentLogMessage {
  id: string;
  conversation_id: string;
  agent_name: string;
  role: 'user' | 'assistant' | string;
  content: string;
  sender?: string;  // 🔥 FIX: Campo sender per distinguere MIO da Utente
  created_at: string;
  pending?: boolean;  // Flag per messaggi locali non ancora confermati dal server
}

interface UseAgentLogsOptions {
  conversationId: string | null;
  agentName?: string; // es. 'mio', 'abacus', 'manus', 'zapier'
  pollMs?: number;
  useWebSocket?: boolean; // Abilita WebSocket (default: true)
  enablePolling?: boolean; // Abilita polling (default: false per stabilità)
  excludeUserMessages?: boolean; // 🔥 VISTA 4 AGENTI: Esclude messaggi diretti dell'utente
}

export function useAgentLogs({ 
  conversationId, 
  agentName, 
  pollMs = 30000, // Aumentato a 30s come fallback
  useWebSocket = true,
  enablePolling = false, // 🔥 DISABILITATO di default per stabilità
  excludeUserMessages = false // 🔥 VISTA 4 AGENTI: Esclude messaggi utente
}: UseAgentLogsOptions) {
  const [messages, setMessages] = useState<AgentLogMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>();
  const wsConnectedRef = useRef<boolean>(false);
  
  // 🔥 FIX: Ref per la funzione load per poterla chiamare da refetch
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  // 🔥 FIX: Funzione refetch per ricaricare i messaggi manualmente
  const refetch = useCallback(async () => {
    if (loadRef.current) {
      console.log('[useAgentLogs] Manual refetch triggered');
      await loadRef.current();
    }
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    // 🔥 SVUOTA messaggi IMMEDIATAMENTE al cambio conversationId per evitare duplicati
    setMessages([]);

    let cancelled = false;
    let intervalId: number | undefined;
    let isFirstLoad = true;

    const load = async () => {
      console.log('[useAgentLogs] Loading messages:', { conversationId, agentName, excludeUserMessages });
      try {
        // Loading solo al primo caricamento, non durante polling
        if (isFirstLoad) {
          setLoading(true);
        }
        
        const params = new URLSearchParams({
          conversation_id: conversationId,
          limit: '500',  // Massimo consentito dal backend
        });
        console.log('[useAgentLogs] Initial params:', params.toString());
        if (agentName) params.set('agent_name', agentName);
        if (excludeUserMessages) {
          params.set('exclude_user_messages', 'true'); // 🔥 VISTA 4 AGENTI
          params.set('mode', 'auto'); // Vista 4 Agenti mostra solo coordinamento MIO
        }
        // 🔥 Chat singole NON usano filtro mode, caricano TUTTI i messaggi del conversation_id

        // 🚀 TUBO DIRETTO DATABASE→FRONTEND (bypassa Hetzner)
        const url = `/api/mihub/get-messages?${params.toString()}`;
        console.log('[useAgentLogs] Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        console.log('[useAgentLogs] Response data:', data);

        if (!cancelled) {
          // 🔥 FIX: Sostituisci completamente i messaggi invece di fare merge
          // Questo evita problemi di sincronizzazione dopo refetch
          const rawMessages = data.messages || data.data || data.logs || [];
          
          const serverMessages = rawMessages.map((msg: any) => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            agent_name: msg.agent_name || msg.agent,
            role: msg.role,
            content: msg.content || msg.message,
            sender: msg.sender, // 🔥 FIX: Include sender per mostrare "Tu" invece di "da MIO"
            created_at: msg.created_at,
            pending: false
          }));
          
          // Ordina per timestamp
          const sorted = serverMessages.sort((a: AgentLogMessage, b: AgentLogMessage) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          setMessages(sorted);
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

    // 🔥 FIX: Salva la funzione load nel ref per poterla chiamare da refetch
    loadRef.current = load;

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

    // 🔥 POLLING CONDIZIONALE: Abilitato solo per vista 4 agenti
    let fallbackTimeout: number | undefined;
    
    if (enablePolling) {
      console.log('[useAgentLogs] Polling ABILITATO (vista 4 agenti)');
      intervalId = window.setInterval(load, pollMs);
    } else {
      console.log('[useAgentLogs] Polling DISABILITATO - Caricamento solo al mount');
    }

    return () => {
      cancelled = true;
      loadRef.current = null;
      if (fallbackTimeout) window.clearTimeout(fallbackTimeout);
      if (intervalId) window.clearInterval(intervalId);
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, agentName, pollMs, useWebSocket]);

  return { messages, setMessages, loading, error, refetch };
}
