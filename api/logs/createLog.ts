import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMioAgentLog } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { agent, action, status, message, details } = req.body;

    // Validate required fields
    if (!agent || !action || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agent, action, status'
      });
    }

    // Validate status enum
    const validStatuses = ['success', 'error', 'warning', 'info'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log('[createLog] Creating log:', { agent, action, status });

    const result = await createMioAgentLog({
      agent,
      action,
      status,
      message,
      details
    });

    console.log('[createLog] Log created:', result);

    return res.status(200).json({
      success: true,
      log: result
    });
  } catch (error: any) {
    console.error('[createLog] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create log'
    });
  }
}
