/**
 * Helper centralizzato per inviare messaggi a MIO Orchestrator
 * Usato sia dalla chat principale che dal ChatWidget
 * 
 * IMPORTANTE: Usa path relativo /api/mihub/orchestrator che viene
 * gestito dal proxy Vercel (vercel.json) verso il backend Hetzner.
 * 
 * Versione: 2025-11-30 - Fix proxy Vercel path relativo
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
  const res = await fetch('/api/mihub/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: content,
      conversationId,
      mode: 'auto',
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}
