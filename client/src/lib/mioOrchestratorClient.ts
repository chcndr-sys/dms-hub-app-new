/**
 * Tipo per i messaggi della chat MIO
 */
export interface MioChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

/**
 * WebSocket connection for realtime MIO chat
 */
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "wss://orchestratore.mio-hub.me/mio/ws";

let mioWS: WebSocket | null = null;

export function initMioWebSocket(): WebSocket {
  if (mioWS && mioWS.readyState === WebSocket.OPEN) {
    return mioWS;
  }

  mioWS = new WebSocket(WS_URL);

  mioWS.onopen = () => {
    console.log("[MIO] WebSocket connected ✅");
  };

  mioWS.onclose = () => {
    console.warn("[MIO] WebSocket disconnected ⚠️");
    // Auto-reconnect after 3 seconds
    setTimeout(() => {
      console.log("[MIO] Attempting to reconnect...");
      initMioWebSocket();
    }, 3000);
  };

  mioWS.onerror = (err) => {
    console.error("[MIO] WebSocket error:", err);
  };

  return mioWS;
}

export function getMioWebSocket(): WebSocket | null {
  return mioWS;
}

/**
 * Helper per inviare messaggi all'orchestratore MIO
 * Usato SOLO dalla chat principale MIO
 */
export async function sendMioMessage(
  text: string,
  currentConversationId: string | null
): Promise<{ messages: MioChatMessage[]; conversationId: string }> {
  const body: any = { message: text, mode: 'auto' };
  if (currentConversationId) {
    body.conversationId = currentConversationId;
  }

  console.log('[sendMioMessage] Request:', body);

  const res = await fetch('/api/mihub/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`orchestrator HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log('[sendMioMessage] Response:', data);

  // Controlla se il backend ha restituito un errore nel JSON
  if (data.error || data.success === false) {
    const errorMsg = data.error?.message || 'Unknown error';
    const errorCode = data.error?.statusCode || 500;
    throw new Error(`orchestrator error ${errorCode}: ${errorMsg}`);
  }

  // IMPORTANTISSIMO: usa SEMPRE il conversationId restituito dal backend
  const newConversationId = data.conversationId ?? currentConversationId ?? '';

  // Trasforma la risposta in messaggi
  const messages: MioChatMessage[] = [];
  const replyContent = data.message || data.reply; // Backend usa 'message' non 'reply'
  if (replyContent) {
    messages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: replyContent,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    messages,
    conversationId: newConversationId,
  };
}

/**
 * Tipo per i messaggi degli agenti
 */
export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  agent?: string;
}

/**
 * Helper per inviare messaggi diretti a un singolo agente
 * Usato dalle chat singole (GPT Dev, Manus, Abacus, Zapier)
 */
export async function sendAgentMessage(
  agent: 'gptdev' | 'manus' | 'abacus' | 'zapier',
  text: string,
  conversationId: string | null,
  setConversationId: (id: string) => void,
  pushMessage: (msg: AgentChatMessage) => void
): Promise<void> {
  const body: any = {
    message: text,
    mode: 'manual',
    targetAgent: agent,
  };
  
  if (conversationId) {
    body.conversationId = conversationId;
  }

  console.log('[sendAgentMessage] Request:', { agent, body });

  const res = await fetch('/api/mihub/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`orchestrator HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log('[sendAgentMessage] Response:', data);

  // Controlla se il backend ha restituito un errore nel JSON
  if (data.error || data.success === false) {
    const errorMsg = data.error?.message || 'Unknown error';
    const errorCode = data.error?.statusCode || 500;
    throw new Error(`orchestrator error ${errorCode}: ${errorMsg}`);
  }

  // Aggiorna conversationId se il backend ne ha restituito uno nuovo
  const newConversationId = data.conversationId ?? conversationId ?? '';
  if (newConversationId && newConversationId !== conversationId) {
    console.log('[sendAgentMessage] Updating conversationId:', newConversationId);
    setConversationId(newConversationId);
  }

  // Aggiungi la risposta dell'agente
  const replyContent = data.message || data.reply; // Backend usa 'message' non 'reply'
  if (replyContent) {
    pushMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: replyContent,
      createdAt: new Date().toISOString(),
      agent,
    });
  }
}
