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

  // IMPORTANTISSIMO: usa SEMPRE il conversationId restituito dal backend
  const newConversationId = data.conversationId ?? currentConversationId ?? '';

  // Trasforma la risposta in messaggi
  const messages: MioChatMessage[] = [];
  if (data.reply) {
    messages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: data.reply,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    messages,
    conversationId: newConversationId,
  };
}

/**
 * Helper per inviare messaggi diretti a un singolo agente
 * Usato dalle chat singole (GPT Dev, Manus, Abacus, Zapier)
 */
export interface SendAgentMessageParams {
  agent: 'gptdev' | 'manus' | 'abacus' | 'zapier';
  text: string;
  conversationId?: string;
  mode?: 'manual' | 'auto';
}

export interface SendAgentMessageResult {
  conversationId: string | null;
  error: string | null;
}

export async function sendAgentMessage(params: SendAgentMessageParams): Promise<SendAgentMessageResult> {
  const { agent, text, conversationId, mode = 'manual' } = params;
  
  console.log('[sendAgentMessage] Sending', { agent, text, conversationId, mode });

  try {
    const requestBody: any = {
      message: text,
      mode,
      agent, // Specifica quale agente deve rispondere
      source: `dashboard-pa-${agent}-single`,
    };

    // Invia conversationId solo se esiste (backend lo crea se manca)
    if (conversationId) {
      requestBody.conversationId = conversationId;
    }

    const res = await fetch('/api/mihub/orchestrator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = `HTTP ${res.status}`;
      console.error('[sendAgentMessage] Error:', errText);
      return { conversationId: null, error: errText };
    }

    const data = await res.json();
    console.log('[sendAgentMessage] Response:', data);

    return {
      conversationId: data.conversationId || null,
      error: null,
    };
  } catch (err: any) {
    const msg = err?.message ?? 'Errore di rete';
    console.error('[sendAgentMessage] Network error:', err);
    return { conversationId: null, error: msg };
  }
}
