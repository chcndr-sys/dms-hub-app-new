import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initMioAgentLogsTable } from '../../server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('[initSchema] Starting table initialization...');
    const result = await initMioAgentLogsTable();
    console.log('[initSchema] Result:', result);
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[initSchema] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize schema'
    });
  }
}
