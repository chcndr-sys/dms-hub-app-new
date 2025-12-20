/**
 * API Route TEMPORANEA: Fix campo agent=null nel database
 * 
 * Endpoint: POST /api/mihub/fix-agent-field
 * 
 * ⚠️ ATTENZIONE: Questo endpoint è TEMPORANEO e dovrebbe essere rimosso dopo l'uso
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('[fix-agent-field] DATABASE_URL not found');
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL not configured'
      });
    }

    const sql = postgres(databaseUrl);

    try {
      // Verifica PRIMA
      console.log('[fix-agent-field] Verifica stato PRIMA...');
      const before = await sql`
        SELECT 
          sender, 
          COUNT(*) as count,
          COUNT(CASE WHEN agent IS NULL THEN 1 END) as null_count
        FROM agent_messages
        WHERE sender IN ('manus', 'abacus', 'gptdev', 'zapier')
        GROUP BY sender
        ORDER BY sender
      `;

      const totalNullBefore = before.reduce((sum: number, row: any) => 
        sum + parseInt(row.null_count), 0
      );

      console.log('[fix-agent-field] Messaggi con agent=null:', totalNullBefore);

      if (totalNullBefore === 0) {
        await sql.end();
        return res.status(200).json({
          success: true,
          message: 'Database già corretto, nessun update necessario',
          before,
          updated: 0
        });
      }

      // UPDATE
      console.log('[fix-agent-field] Eseguo UPDATE...');
      const result = await sql`
        UPDATE agent_messages 
        SET agent = sender 
        WHERE agent IS NULL 
          AND sender IS NOT NULL
          AND sender IN ('manus', 'abacus', 'gptdev', 'zapier')
      `;

      console.log('[fix-agent-field] Righe aggiornate:', result.count);

      // Verifica DOPO
      console.log('[fix-agent-field] Verifica stato DOPO...');
      const after = await sql`
        SELECT 
          sender,
          agent,
          COUNT(*) as count
        FROM agent_messages
        WHERE sender IN ('manus', 'abacus', 'gptdev', 'zapier')
        GROUP BY sender, agent
        ORDER BY sender, agent
      `;

      const stillNull = after.filter((row: any) => row.agent === null)
        .reduce((sum: number, row: any) => sum + parseInt(row.count), 0);

      await sql.end();

      return res.status(200).json({
        success: true,
        message: 'Database aggiornato con successo',
        before,
        after,
        updated: result.count,
        stillNull
      });

    } catch (dbError: any) {
      console.error('[fix-agent-field] Database error:', dbError);
      await sql.end();
      throw dbError;
    }

  } catch (error: any) {
    console.error('[fix-agent-field] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}
