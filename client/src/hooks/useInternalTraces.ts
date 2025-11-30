import { useState, useEffect, useRef } from 'react';

export interface InternalTrace {
  id: string;
  conversation_id: string;
  agent_name: string;
  role: string;
  step: string | null;
  message: string;
  meta: any;
  created_at: string;
  error: boolean;
}

export interface AgentLog {
  from: string;
  to: string;
  message: string;
  timestamp: string;
  meta?: any;
}

/**
 * Hook per fetching automatico dei log agenti da Neon PostgreSQL
 * 
 * @param conversationId - ID conversazione MIO
 * @param pollingInterval - Intervallo polling in ms (default 3000)
 * @returns { traces, loading, error }
 */
export function useInternalTraces(
  conversationId: string | null,
  pollingInterval: number = 3000
): { traces: AgentLog[]; loading: boolean; error: string | null } {
  const [traces, setTraces] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Se non c'è conversationId, non fare nulla
    if (!conversationId) {
      setTraces([]);
      return;
    }

    // Funzione per fetchare i log
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';
        const response = await fetch(
          `${apiBaseUrl}/api/mio/agent-logs?conversation_id=${conversationId}&limit=100`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          // Trasforma i log dal formato database al formato UI
          const transformedTraces: AgentLog[] = data.data.map((log: InternalTrace) => {
            // Determina "from" e "to" in base al role
            let from = log.agent_name;
            let to = 'mio';

            if (log.role === 'user') {
              // MIO chiede ad un agente
              from = 'mio';
              to = log.agent_name;
            } else if (log.role === 'assistant') {
              // Agente risponde a MIO
              from = log.agent_name;
              to = 'mio';
            }

            return {
              from,
              to,
              message: log.message,
              timestamp: log.created_at,
              meta: log.meta
            };
          });

          setTraces(transformedTraces);
        }
      } catch (err) {
        console.error('[useInternalTraces] Error fetching logs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediato
    fetchLogs();

    // Setup polling
    intervalRef.current = setInterval(fetchLogs, pollingInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [conversationId, pollingInterval]);

  return { traces, loading, error };
}
