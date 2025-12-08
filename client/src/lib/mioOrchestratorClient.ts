/**
 * Tipo per i messaggi della chat MIO
 * Force rebuild: 2025-12-03 07:16
 */
export interface MioChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

/**
 * Helper per inviare messaggi all'orchestratore MIO
 * Usato SOLO dalla chat principale MIO
 */
export async function sendMioMessage(
  text: string,
  currentConversationId: string | null
): Promise<{ messages: MioChatMessage[]; conversationId: string }> {
  debugger; // FORCE STOP HERE - 2025-12-03 07:43
  const body: any = { message: text, mode: 'auto' };
  if (currentConversationId) {
    body.conversationId = currentConversationId;
  }

  console.log('[sendMioMessage] Request:', body);
  console.error('🚨🚨🚨 [FORCE REBUILD 2025-12-03 07:38] sendMioMessage CALLED! URL: https://orchestratore.mio-hub.me/api/mihub/orchestrator 🚨🚨🚨');
  console.error('🚨🚨🚨 THIS IS THE NEW CODE! 🚨🚨🚨');

  // DIRECT LINK: Bypassiamo il proxy Vercel e chiamiamo direttamente Hetzner
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
  // 🔥 FIX ERRORE 400: Usa conversationId: null per reset
  const body: any = {
    message: text,
    mode: 'manual',
    targetAgent: agent,
    conversationId: null, // 🔥 RESET: Forza nuova conversazione
  };

  console.log('🔥 [sendAgentMessage] Agent:', agent);
  console.log('🔥 [sendAgentMessage] Payload:', JSON.stringify(body, null, 2));

  // DIRECT LINK: Bypassiamo il proxy Vercel e chiamiamo direttamente Hetzner
  const res = await fetch('/api/mihub/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.log('🔥 [sendAgentMessage] Status:', res.status);

  if (!res.ok) {
    const errText = await res.text();
    console.error('🔥 [sendAgentMessage] ERROR Response:', errText);
    throw new Error(`orchestrator HTTP ${res.status}: ${errText}`);
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
