import type { NextApiRequest, NextApiResponse } from 'next';
import { NodeSSH } from 'node-ssh';

/**
 * Emergency Deploy API Route
 * 
 * Questo endpoint usa la chiave SSH configurata su Vercel
 * per connettersi al server Hetzner e deployare il backend.
 * 
 * Sicurezza: Solo agenti autorizzati (manus, mio)
 */

interface DeployResponse {
  success: boolean;
  message: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  timestamp?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeployResponse>
) {
  // Accetta sia GET che POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use GET or POST.'
    });
  }

  // Verifica agent ID
  const agentId = req.headers['x-agent-id'] as string;
  const allowedAgents = ['manus', 'mio'];
  
  if (!agentId || !allowedAgents.includes(agentId)) {
    return res.status(403).json({
      success: false,
      message: `Forbidden. Agent '${agentId}' not authorized.`
    });
  }

  // Estrai parametri (da body per POST, da query per GET)
  const reason = req.method === 'POST' 
    ? req.body?.reason 
    : req.query?.reason as string;
  
  const branch = req.method === 'POST'
    ? req.body?.branch || 'master'
    : req.query?.branch as string || 'master';

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Field "reason" is required'
    });
  }

  console.log(`[DEPLOY] Agent '${agentId}' requested deploy: ${reason}`);

  const ssh = new NodeSSH();

  try {
    // Verifica che la chiave SSH sia configurata
    if (!process.env.HETZNER_SSH_KEY) {
      throw new Error('HETZNER_SSH_KEY not configured on Vercel!');
    }

    console.log('[DEPLOY] Connecting to Hetzner server...');

    // Connessione SSH
    await ssh.connect({
      host: '157.90.29.66',
      username: 'root',
      privateKey: process.env.HETZNER_SSH_KEY.replace(/\\n/g, '\n'),
      port: 22,
      readyTimeout: 30000
    });

    console.log('[DEPLOY] Connected! Executing deploy commands...');

    // Comando di deploy
    const deployCommand = `
      cd /root/mihub-backend-rest && \
      echo "📥 Pulling latest changes..." && \
      git pull origin ${branch} && \
      echo "📦 Installing dependencies..." && \
      npm install --production && \
      echo "🔄 Restarting PM2..." && \
      pm2 restart mihub-backend && \
      echo "✅ Deploy completed!" && \
      pm2 list
    `;

    const result = await ssh.execCommand(deployCommand);

    console.log('[DEPLOY] Command output:', result.stdout);
    
    if (result.stderr) {
      console.warn('[DEPLOY] Command stderr:', result.stderr);
    }

    ssh.dispose();

    // Successo
    return res.status(200).json({
      success: true,
      message: 'Deploy completed successfully',
      stdout: result.stdout,
      stderr: result.stderr || undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[DEPLOY] Error:', error);

    // Cleanup connessione
    if (ssh.isConnected()) {
      ssh.dispose();
    }

    return res.status(500).json({
      success: false,
      message: 'Deploy failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
