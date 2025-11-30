import { useEffect, useState } from 'react';

export interface AgentLogMessage {
  id: string;
  conversation_id: string;
  agent_name: string;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
}

interface UseAgentLogsOptions {
  conversationId: string | null;
  agentName?: string; // es. 'mio', 'abacus', 'manus', 'zapier'
  pollMs?: number;
}

export function useAgentLogs({ conversationId, agentName, pollMs = 5000 }: UseAgentLogsOptions) {
  const [messages, setMessages] = useState<AgentLogMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

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
          setMessages(data.logs || []);
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

    // primo load al mount
    load();

    // polling silenzioso (senza loading)
    intervalId = window.setInterval(load, pollMs);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [conversationId, agentName, pollMs]);

  return { messages, setMessages, loading, error };
}
