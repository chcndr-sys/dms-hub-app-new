/**
 * Hook per gestione orchestratore multi-agente
 * 
 * Gestisce:
 * - Invio messaggi all'orchestratore
 * - Recupero conversazioni
 * - Stato messaggi per ogni agente
 */

import { useState, useEffect } from 'react';

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
 * Hook principale orchestratore
 */
export function useOrchestrator(userId: string = 'user_dashboard') {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Invia messaggio all'orchestratore
   */
  const sendMessage = async (request: OrchestratorRequest): Promise<OrchestratorResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://orchestratore.mio-hub.me/api/mihub/orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: request.message,
          userId,
          mode: request.mode,
          targetAgent: request.targetAgent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setIsLoading(false);
      return {
        success: data.success,
        message: data.message,
        agentsUsed: data.agentsUsed || [],
        conversationId: data.conversationId,
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
 * Hook per conversazione singolo agente
 */
export function useAgentConversation(agentId: AgentId, userId: string = 'user_dashboard') {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchConversation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://orchestratore.mio-hub.me/api/mihub/conversations/${userId}/${agentId}?limit=50`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        metadata: msg.metadata,
      }));
      setMessages(formattedMessages);
      setIsLoading(false);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    const interval = setInterval(fetchConversation, 5000);
    return () => clearInterval(interval);
  }, [userId, agentId]);

  return {
    messages,
    isLoading,
    error,
    refetch: fetchConversation,
  };
}

/**
 * Hook per tutte le conversazioni (4 agenti)
 */
export function useAllConversations(userId: string = 'user_dashboard') {
  const [conversations, setConversations] = useState<Record<AgentId, Message[]>>({
    mio_dev: [],
    abacus: [],
    zapier: [],
    manus_worker: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchAllConversations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://orchestratore.mio-hub.me/api/mihub/conversations/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const formatted: Record<AgentId, Message[]> = {
        mio_dev: [],
        abacus: [],
        zapier: [],
        manus_worker: [],
      };

      for (const agentId of ['mio_dev', 'abacus', 'zapier', 'manus_worker'] as AgentId[]) {
        const agentMessages = data[agentId] || [];
        formatted[agentId] = agentMessages.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          metadata: msg.metadata,
        }));
      }

      setConversations(formatted);
      setIsLoading(false);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllConversations();
    const interval = setInterval(fetchAllConversations, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  return {
    conversations,
    isLoading,
    error,
    refetch: fetchAllConversations,
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
