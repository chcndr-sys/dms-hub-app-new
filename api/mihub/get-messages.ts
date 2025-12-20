/**
 * API Route: Recupera messaggi dal database
 * 
 * Endpoint: GET /api/mihub/get-messages?conversation_id=xxx&agent_name=yyy
 * 
 * Query params:
 * - conversation_id (required): ID conversazione
 * - agent_name (optional): Filtra per agente specifico
 * - limit (optional): Numero massimo messaggi (default 200)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversation_id, agent_name, limit = '200' } = req.query;

    // Validazione
    if (!conversation_id || typeof conversation_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: conversation_id'
      });
    }

    // Check DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('[get-messages] DATABASE_URL not found');
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL not configured'
      });
    }

    const sql = postgres(databaseUrl);

    try {
      let messages;

      // Query con o senza filtro agent_name
      if (agent_name && typeof agent_name === 'string') {
        messages = await sql`
          SELECT 
            id,
            conversation_id,
            agent,
            sender,
            role,
            message,
            created_at,
            meta
          FROM agent_messages
          WHERE conversation_id = ${conversation_id}
            AND agent = ${agent_name}
          ORDER BY created_at ASC
          LIMIT ${parseInt(limit as string)}
        `;
      } else {
        messages = await sql`
          SELECT 
            id,
            conversation_id,
            agent,
            sender,
            role,
            message,
            created_at,
            meta
          FROM agent_messages
          WHERE conversation_id = ${conversation_id}
          ORDER BY created_at ASC
          LIMIT ${parseInt(limit as string)}
        `;
      }

      console.log('[get-messages] Found', messages.length, 'messages');

      return res.status(200).json({
        success: true,
        messages: messages,  // 🔥 FIX: Usa 'messages' invece di 'logs'
        pagination: {
          total: messages.length,
          limit: parseInt(limit as string),
          has_more: false
        }
      });

    } finally {
      await sql.end();
    }

  } catch (err: any) {
    console.error('[get-messages] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
