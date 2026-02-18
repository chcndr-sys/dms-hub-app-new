/**
 * Hook per gestione orchestratore multi-agente
 * 
 * Gestisce:
 * - Invio messaggi all'orchestratore
 * - Recupero conversazioni
 * - Stato messaggi per ogni agente
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callOrchestrator } from '@/api/orchestratorClient';
import { MIHUB_API_BASE_URL } from '@/config/api';

export type AgentId = 'mio_dev' | 'abacus' | 'zapier' | 'manus_worker';
export type Mode = 'auto' | 'manual';

export interface Message {
  id: number;
  sender: 'user' | AgentId;
  content: string;
  timestamp: string; // ISO string
  metadata?: any;
}

export interface OrchestratorRequest {
  message: string;
  mode: Mode;
  targetAgent?: AgentId;
}

export interface OrchestratorResponse {
  success: boolean;
  message: string;
  agentsUsed: AgentId[];
  conversationId: string;
  timestamp: string; // ISO string
}

/**
 * Hook principale orchestratore — usa REST client diretto
 */
export function useOrchestrator(userId: string = 'user_dashboard') {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Invia messaggio all'orchestratore via REST
   */
  const sendMessage = async (request: OrchestratorRequest): Promise<OrchestratorResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await callOrchestrator({
        message: request.message,
        mode: request.mode === 'manual' ? 'direct' : 'auto',
        targetAgent: request.targetAgent as any,
        meta: { userId, dashboardTab: 'mio' },
      });

      setIsLoading(false);
      return {
        success: response.success,
        message: response.message || '',
        agentsUsed: [response.agent] as AgentId[],
        conversationId: response.conversationId || '',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(errorMessage);
      setIsLoading(false);
      console.error('[useOrchestrator] Error:', err);
      return null;
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
  };
}

/**
 * Hook per conversazione singolo agente — REST polling
 */
export function useAgentConversation(agentId: AgentId, userId: string = 'user_dashboard') {
  const [messages, setMessages] = useState<Message[]>([]);

  const conversationQuery = useQuery({
    queryKey: ['mihub-conversation', userId, agentId],
    queryFn: async () => {
      const params = new URLSearchParams({ userId, agentId, limit: '50' });
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/mihub/conversations?${params}`);
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (conversationQuery.data) {
      const rawMessages = Array.isArray(conversationQuery.data) ? conversationQuery.data : conversationQuery.data.messages || [];
      const formattedMessages: Message[] = rawMessages.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        metadata: msg.metadata,
      }));
      setMessages(formattedMessages);
    }
  }, [conversationQuery.data]);

  return {
    messages,
    isLoading: conversationQuery.isLoading,
    error: conversationQuery.error,
    refetch: conversationQuery.refetch,
  };
}

/**
 * Hook per tutte le conversazioni (4 agenti) — REST polling
 */
export function useAllConversations(userId: string = 'user_dashboard') {
  const [conversations, setConversations] = useState<Record<AgentId, Message[]>>({
    mio_dev: [],
    abacus: [],
    zapier: [],
    manus_worker: [],
  });

  const allConversationsQuery = useQuery({
    queryKey: ['mihub-all-conversations', userId],
    queryFn: async () => {
      const params = new URLSearchParams({ userId });
      const res = await fetch(`${MIHUB_API_BASE_URL}/api/mihub/conversations/all?${params}`);
      if (!res.ok) throw new Error(`Errore ${res.status}: ${res.statusText}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (allConversationsQuery.data) {
      const formatted: Record<AgentId, Message[]> = {
        mio_dev: [],
        abacus: [],
        zapier: [],
        manus_worker: [],
      };

      for (const agentId of ['mio_dev', 'abacus', 'zapier', 'manus_worker'] as AgentId[]) {
        const agentMessages = allConversationsQuery.data[agentId] || [];
        formatted[agentId] = agentMessages.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          metadata: msg.metadata,
        }));
      }

      setConversations(formatted);
    }
  }, [allConversationsQuery.data]);

  return {
    conversations,
    isLoading: allConversationsQuery.isLoading,
    error: allConversationsQuery.error,
    refetch: allConversationsQuery.refetch,
  };
}

/**
 * Formatta timestamp per visualizzazione
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Mappa agent ID backend → frontend
 */
export function mapAgentId(backendId: AgentId): 'mio' | 'manus' | 'abacus' | 'zapier' {
  const mapping: Record<AgentId, 'mio' | 'manus' | 'abacus' | 'zapier'> = {
    mio_dev: 'mio',
    manus_worker: 'manus',
    abacus: 'abacus',
    zapier: 'zapier',
  };
  return mapping[backendId];
}

/**
 * Mappa agent ID frontend → backend
 */
export function mapAgentIdToBackend(frontendId: 'mio' | 'manus' | 'abacus' | 'zapier'): AgentId {
  const mapping: Record<'mio' | 'manus' | 'abacus' | 'zapier', AgentId> = {
    mio: 'mio_dev',
    manus: 'manus_worker',
    abacus: 'abacus',
    zapier: 'zapier',
  };
  return mapping[frontendId];
}
