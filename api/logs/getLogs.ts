import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMioAgentLogs } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    console.log('[getLogs] Fetching logs with limit:', limit, 'offset:', offset);

    const logs = await getMioAgentLogs();

    console.log('[getLogs] Found', logs.length, 'logs');

    return res.status(200).json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (error: any) {
    console.error('[getLogs] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch logs'
    });
  }
}
