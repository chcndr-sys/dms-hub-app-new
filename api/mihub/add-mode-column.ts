/**
 * Endpoint temporaneo per aggiungere colonna mode e migrare dati
 * POST /api/mihub/add-mode-column
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

  try {
    // Step 1: Aggiungere colonna mode
    await sql`
      ALTER TABLE agent_messages 
      ADD COLUMN IF NOT EXISTS mode varchar DEFAULT 'auto'
    `;

    // Step 2: Migrare dati esistenti
    const result1 = await sql`
      UPDATE agent_messages 
      SET mode = 'auto' 
      WHERE conversation_id = 'mio-main' AND mode IS NULL
    `;

    const result2 = await sql`
      UPDATE agent_messages 
      SET mode = 'auto' 
      WHERE conversation_id LIKE 'mio-%coordination' AND mode IS NULL
    `;

    const result3 = await sql`
      UPDATE agent_messages 
      SET mode = 'direct' 
      WHERE conversation_id LIKE 'user-%direct' AND mode IS NULL
    `;

    // Verificare risultati
    const stats = await sql`
      SELECT 
        mode, 
        COUNT(*) as count
      FROM agent_messages
      GROUP BY mode
      ORDER BY mode
    `;

    await sql.end();

    return res.status(200).json({
      success: true,
      message: 'Colonna mode aggiunta e dati migrati',
      updated: {
        mio_main: result1.count,
        mio_coordination: result2.count,
        user_direct: result3.count
      },
      stats: stats
    });

  } catch (error: any) {
    console.error('[add-mode-column] Error:', error);
    await sql.end();
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
