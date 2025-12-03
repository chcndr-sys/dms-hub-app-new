import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy endpoint per agent_logs dal backend Hetzner
 * GET /api/mio/agent-logs?conversation_id=xxx&agent_name=yyy&limit=200
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversation_id, agent_name, limit = '200', offset = '0' } = req.query;

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    // Build query params
    const params = new URLSearchParams({
      conversation_id: conversation_id as string,
      limit: limit as string,
      offset: offset as string,
    });

    if (agent_name) {
      params.set('agent_name', agent_name as string);
    }

    // Proxy to Hetzner backend
    const backendUrl = `https://orchestratore.mio-hub.me/api/mio/agent-logs?${params.toString()}`;
    const response = await fetch(backendUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[agent-logs] Backend error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Backend error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();

    // Transform backend response to match frontend expectations
    // Backend returns: { success: true, data: [...], pagination: {...} }
    // Frontend expects: { logs: [...] }
    // CRITICAL: Map 'message' field to 'content' to match AgentLogMessage interface
    const transformedLogs = (data.data || []).map((log: any) => ({
      ...log,
      content: log.message || log.content,  // Backend usa 'message', frontend si aspetta 'content'
    }));

    return res.status(200).json({
      logs: transformedLogs,
      pagination: data.pagination,
    });
  } catch (error: any) {
    console.error('[agent-logs] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message 
    });
  }
}
