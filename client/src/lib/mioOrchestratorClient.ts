/**
 * Helper centralizzato per inviare messaggi a MIO Orchestrator
 * Usato sia dalla chat principale che dal ChatWidget
 * 
 * IMPORTANTE: Usa dominio diretto orchestratore.mio-hub.me perché
 * il proxy Vercel /api/mihub/orchestrator non funziona dal browser
 * (funziona da curl ma non da fetch nel browser, probabilmente CORS).
 * 
 * Versione: 2025-11-30 - Fix con dominio diretto
 */

export interface SendMioMessageResponse {
  success: boolean;
  agent: string;
  message: string | null;
  conversationId: string | null;
  error?: {
    type: string;
    provider?: string | null;
    statusCode?: number;
    message?: string;
  } | null;
}

export async function sendMioMessage(
  content: string,
  conversationId: string | null
): Promise<SendMioMessageResponse> {
  console.log('[sendMioMessage] Sending:', { content, conversationId });
  const res = await fetch('https://orchestratore.mio-hub.me/api/mihub/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: content,
      conversationId,
      mode: 'auto',
    }),
  });

  if (!res.ok) {
    console.error('[sendMioMessage] HTTP error:', res.status, res.statusText);
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log('[sendMioMessage] Response:', data);
  return data;
}
