/**
 * Helper per inviare messaggi all'orchestratore MIO
 * Usato SOLO dalla chat principale MIO
 */
export async function sendMioMessage(message: string, conversationId: string) {
  console.log('[sendMioMessage] Sending', { message, conversationId });

  const res = await fetch('/api/mihub/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId, mode: 'auto' }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
