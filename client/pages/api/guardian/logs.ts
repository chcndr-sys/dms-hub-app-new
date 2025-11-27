import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch logs from Neon via Abacus SQL endpoint
    const response = await fetch('https://mihub.157-90-29-66.nip.io/api/abacus/sql/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT 
          timestamp, 
          agent, 
          endpoint as path, 
          method, 
          CASE WHEN success THEN 'allowed' ELSE 'denied' END as status,
          risk as risk_level,
          message as reason
        FROM mio_agent_logs 
        WHERE agent IN ('mio', 'manus', 'abacus', 'zapier')
        ORDER BY timestamp DESC 
        LIMIT 50`
      })
    });

    const result = await response.json();

    if (result.success && result.data?.rows) {
      return res.status(200).json(result.data.rows);
    } else {
      console.error('Failed to fetch Guardian logs:', result.error);
      return res.status(500).json({ error: result.error || 'Failed to fetch logs' });
    }
  } catch (error) {
    console.error('Guardian logs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
