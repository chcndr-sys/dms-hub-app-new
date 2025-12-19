import type { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';

const CONVERSATION_ID = 'dfab3001-0969-4d6d-93b5-e6f69eecb794';
const MAPPED_CONVERSATION_ID = 'mio-main';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Solo POST per sicurezza
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const sql = postgres(databaseUrl);

  try {
    console.log('🚀 Inizio migrazione...');
    
    // 1. Conta messaggi in agent_logs
    const countLogs = await sql`
      SELECT COUNT(*) as count 
      FROM agent_logs 
      WHERE conversation_id = ${CONVERSATION_ID}
    `;
    const logsCount = parseInt(countLogs[0].count);
    console.log(`📊 Messaggi in agent_logs: ${logsCount}`);
    
    // 2. Conta messaggi già in agent_messages
    const countMessages = await sql`
      SELECT COUNT(*) as count 
      FROM agent_messages 
      WHERE conversation_id = ${MAPPED_CONVERSATION_ID}
    `;
    const messagesCount = parseInt(countMessages[0].count);
    console.log(`📊 Messaggi già in agent_messages: ${messagesCount}`);
    
    // 3. Leggi tutti i messaggi da agent_logs
    const logs = await sql`
      SELECT 
        id,
        conversation_id,
        agent_name,
        role,
        message,
        created_at
      FROM agent_logs 
      WHERE conversation_id = ${CONVERSATION_ID}
      ORDER BY created_at ASC
    `;
    
    console.log(`📥 Letti ${logs.length} messaggi da agent_logs`);
    
    // 4. Inserisci in agent_messages
    let inserted = 0;
    let skipped = 0;
    
    for (const log of logs) {
      try {
        // Determina sender e recipient
        let sender, recipient;
        
        if (log.role === 'user') {
          sender = 'user';
          recipient = log.agent_name || 'mio';
        } else if (log.role === 'assistant') {
          sender = log.agent_name || 'mio';
          recipient = 'user';
        } else {
          sender = 'system';
          recipient = 'all';
        }
        
        await sql`
          INSERT INTO agent_messages (
            id,
            conversation_id,
            agent,
            sender,
            recipient,
            role,
            message,
            created_at
          ) VALUES (
            ${log.id},
            ${MAPPED_CONVERSATION_ID},
            ${log.agent_name || 'mio'},
            ${sender},
            ${recipient},
            ${log.role},
            ${log.message},
            ${log.created_at}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        inserted++;
      } catch (err: any) {
        console.error(`❌ Errore inserimento messaggio ${log.id}:`, err.message);
        skipped++;
      }
    }
    
    // 5. Verifica finale
    const finalCount = await sql`
      SELECT COUNT(*) as count 
      FROM agent_messages 
      WHERE conversation_id = ${MAPPED_CONVERSATION_ID}
    `;
    const finalTotal = parseInt(finalCount[0].count);
    
    await sql.end();
    
    return res.status(200).json({
      success: true,
      migration: {
        logs_count: logsCount,
        messages_before: messagesCount,
        messages_after: finalTotal,
        inserted,
        skipped
      }
    });
    
  } catch (error: any) {
    console.error('💥 Errore durante la migrazione:', error);
    await sql.end();
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
