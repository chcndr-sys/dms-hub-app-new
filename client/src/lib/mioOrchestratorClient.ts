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
