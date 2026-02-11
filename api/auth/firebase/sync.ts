/**
 * Vercel Serverless Function: Firebase Auth Sync
 * POST /api/auth/firebase/sync
 * 
 * Sincronizza un utente Firebase con MioHub.
 * Se il body contiene trackLogin: true e legacyUserId > 0,
 * inserisce un record in login_attempts e aggiorna lastSignedIn.
 * 
 * ⚠️ Colonne REALI della tabella login_attempts nel DB Neon
 * (verificato con query diretta a information_schema.columns — 11 Feb 2026):
 * id (serial), username (varchar), user_id (integer), ip_address (varchar NOT NULL),
 * user_agent (text), success (boolean NOT NULL), failure_reason (varchar), created_at (timestamptz)
 * 
 * ❌ NON ESISTONO: user_email, user_name, email
 * ✅ Per l'email usare la colonna "username"
 * 
 * Colonna users: "lastSignedIn" (camelCase, richiede virgolette doppie nel SQL)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token mancante' });
    }

    const idToken = authHeader.substring(7);
    const { uid, email, displayName, photoURL, provider, role, trackLogin, legacyUserId, userName, userEmail } = req.body;

    // Verifica il token Firebase usando Firebase Admin SDK
    let decodedToken;
    try {
      const { initializeApp, cert, getApps } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      
      if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountKey) {
          const serviceAccount = JSON.parse(serviceAccountKey);
          initializeApp({ credential: cert(serviceAccount), projectId: 'dmshub-auth-2975e' });
        } else {
          initializeApp({ projectId: 'dmshub-auth-2975e' });
        }
      }
      
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (verifyError: any) {
      console.error('[Firebase Sync] Token verification failed:', verifyError.message);
      decodedToken = null;
    }

    // Costruisci l'oggetto utente
    const user = {
      uid: decodedToken?.uid || uid,
      email: decodedToken?.email || email,
      displayName: decodedToken?.name || displayName,
      photoURL: decodedToken?.picture || photoURL,
      provider: decodedToken?.firebase?.sign_in_provider || provider || 'email',
      role: role || 'citizen',
      fiscalCode: null,
      verified: decodedToken?.email_verified || false,
      permissions: [] as string[],
    };

    // Assegna permessi
    switch (user.role) {
      case 'citizen':
        user.permissions = ['view_markets', 'view_wallet', 'make_transactions', 'view_civic'];
        break;
      case 'business':
        user.permissions = ['view_markets', 'manage_shop', 'view_presenze', 'view_anagrafica'];
        break;
      case 'pa':
        user.permissions = ['view_all', 'manage_markets', 'manage_users', 'view_analytics', 'manage_verbali'];
        break;
    }

    // ============================================
    // LOGIN TRACKING: INSERT login_attempts + UPDATE lastSignedIn
    // ============================================
    let loginTracked = false;
    
    // Accetta trackLogin come boolean o stringa "true", e legacyUserId come number o stringa
    const shouldTrack = (trackLogin === true || trackLogin === 'true') && legacyUserId && Number(legacyUserId) > 0;
    
    if (shouldTrack) {
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          const postgres = (await import('postgres')).default;
          const sql = postgres(dbUrl, { ssl: 'require' });

          const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
            || req.socket?.remoteAddress 
            || 'unknown';
          const clientUserAgent = (req.headers['user-agent'] as string) || 'unknown';
          // L'email va nella colonna "username" (è l'unica colonna varchar per identificare l'utente)
          const loginEmail = userEmail || user.email || email || '';

          // INSERT login_attempt con le colonne REALI del DB
          // ⚠️ Colonne verificate con query diretta: username, user_id, ip_address, user_agent, success, created_at
          // ❌ NON usare user_email, user_name — NON ESISTONO nel DB!
          await sql`
            INSERT INTO login_attempts (username, user_id, ip_address, user_agent, success, created_at)
            VALUES (${loginEmail}, ${Number(legacyUserId)}, ${clientIp}, ${clientUserAgent}, true, NOW())
          `;

          // UPDATE lastSignedIn nella tabella users
          await sql`
            UPDATE users SET "lastSignedIn" = NOW(), "updatedAt" = NOW() WHERE id = ${Number(legacyUserId)}
          `;

          await sql.end();
          loginTracked = true;
          console.log(`[Firebase Sync] Login tracked: user_id=${legacyUserId}, email=${loginEmail}`);
        } else {
          console.warn('[Firebase Sync] DATABASE_URL non configurato, login tracking saltato');
        }
      } catch (trackError: any) {
        console.error('[Firebase Sync] Errore login tracking:', trackError.message);
        // Non bloccare il login se il tracking fallisce
      }
    }

    return res.status(200).json({ success: true, user, loginTracked });
  } catch (error: any) {
    console.error('[Firebase Sync] Error:', error);
    return res.status(500).json({ success: false, error: 'Errore interno del server' });
  }
}
