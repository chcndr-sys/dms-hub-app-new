import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless Function Proxy per MIO Orchestrator
 * 
 * Questa function fa da proxy tra il frontend Vercel e il backend Hetzner.
 * Risolve il problema del rewrite che non funziona correttamente.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Permetti solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Endpoint backend Hetzner
    const backendUrl = 'https://orchestratore.mio-hub.me/api/mihub/orchestrator';

    console.log('[Proxy] Forwarding request to:', backendUrl);
    console.log('[Proxy] Request body:', req.body);

    // Forward della richiesta al backend
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward altri headers se necessario
        ...(req.headers.authorization && {
          'Authorization': req.headers.authorization as string
        }),
      },
      body: JSON.stringify(req.body),
    });

    console.log('[Proxy] Backend response status:', response.status);

    // Leggi la risposta
    const data = await response.json();
    console.log('[Proxy] Backend response data:', data);

    // Forward della risposta al client
    return res.status(response.status).json(data);

  } catch (error: any) {
    console.error('[Proxy] Error:', error);
    return res.status(500).json({
      error: 'Proxy Error',
      message: error.message,
      success: false,
    });
  }
}
