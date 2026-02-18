/**
 * Firebase Authentication Router
 * MioHub - Backend per verifica token Firebase e sincronizzazione utenti
 * 
 * Endpoints:
 * POST /api/auth/firebase/sync    - Sincronizza utente Firebase con DB MioHub
 * POST /api/auth/firebase/verify   - Verifica token ID Firebase
 * GET  /api/auth/firebase/me       - Ottieni info utente corrente
 * POST /api/auth/firebase/logout   - Logout e pulizia sessione
 * POST /api/auth/login             - Login con email/password (legacy compat)
 * POST /api/auth/register          - Registrazione email/password (legacy compat)
 */
import { Router, type Request, type Response } from 'express';
import type { App as FirebaseAdminApp } from 'firebase-admin/app';

const router = Router();

// ============================================
// FIREBASE ADMIN SDK (lazy init)
// ============================================

let firebaseAdmin: FirebaseAdminApp | null = null;

async function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  
  try {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseAdmin = existingApps[0];
      return firebaseAdmin;
    }

    // Usa le credenziali dal service account o dalle variabili d'ambiente
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        firebaseAdmin = initializeApp({
          credential: cert(serviceAccount),
          projectId: 'dmshub-auth-2975e',
        });
      } catch {
        // Se il parsing fallisce, prova con Application Default Credentials
        firebaseAdmin = initializeApp({
          projectId: 'dmshub-auth-2975e',
        });
      }
    } else {
      // Fallback: inizializza senza credenziali (per ambienti con ADC)
      firebaseAdmin = initializeApp({
        projectId: 'dmshub-auth-2975e',
      });
    }
    
    console.log('[FirebaseAuth] Admin SDK inizializzato');
    return firebaseAdmin;
  } catch (error) {
    console.error('[FirebaseAuth] Errore inizializzazione Admin SDK:', error);
    throw error;
  }
}

/**
 * Verifica un token ID Firebase
 */
async function verifyFirebaseToken(idToken: string) {
  try {
    await getFirebaseAdmin();
    const { getAuth } = await import('firebase-admin/auth');
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    console.error('[FirebaseAuth] Token verification failed:', error.message);
    return null;
  }
}

/**
 * Estrae il token Bearer dall'header Authorization
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /api/auth/firebase/sync
 * Sincronizza un utente Firebase con il database MioHub
 * Richiede: Authorization: Bearer <firebase-id-token>
 */
router.post('/firebase/sync', async (req: Request, res: Response) => {
  try {
    const idToken = extractBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token di autenticazione mancante' 
      });
    }

    // Verifica il token Firebase
    const decodedToken = await verifyFirebaseToken(idToken);
    if (!decodedToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token non valido o scaduto' 
      });
    }

    const { uid, email, displayName, photoURL, provider, role } = req.body;

    // Verifica che l'UID nel body corrisponda al token
    if (uid !== decodedToken.uid) {
      return res.status(403).json({ 
        success: false, 
        error: 'UID non corrispondente al token' 
      });
    }

    // Sincronizza con il database MioHub
    const user = {
      id: undefined as number | undefined,
      uid: decodedToken.uid,
      email: email || decodedToken.email,
      displayName: displayName || decodedToken.name,
      photoURL: photoURL || decodedToken.picture,
      provider: provider || decodedToken.firebase?.sign_in_provider || 'email',
      role: role || 'citizen',
      fiscalCode: null,
      verified: decodedToken.email_verified || false,
      permissions: [] as string[],
      lastSignedIn: new Date().toISOString(),
    };

    // Assegna permessi in base al ruolo
    switch (user.role) {
      case 'citizen':
        user.permissions = ['view_markets', 'view_wallet', 'make_transactions', 'view_civic'];
        break;
      case 'business':
        user.permissions = ['view_markets', 'manage_shop', 'view_presenze', 'view_anagrafica', 'manage_products'];
        break;
      case 'pa':
        user.permissions = ['view_all', 'manage_markets', 'manage_users', 'view_analytics', 'manage_verbali', 'manage_integrations'];
        break;
    }

    console.log(`[FirebaseAuth] Utente sincronizzato: ${user.email} (${user.role})`);

    res.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('[FirebaseAuth] Sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante la sincronizzazione dell\'utente' 
    });
  }
});

/**
 * POST /api/auth/firebase/verify
 * Verifica un token ID Firebase e restituisce i dati dell'utente
 */
router.post('/firebase/verify', async (req: Request, res: Response) => {
  try {
    const idToken = extractBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token mancante' 
      });
    }

    const decodedToken = await verifyFirebaseToken(idToken);
    if (!decodedToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token non valido' 
      });
    }

    res.json({
      success: true,
      data: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        email_verified: decodedToken.email_verified,
        provider: decodedToken.firebase?.sign_in_provider,
        valid: true,
      },
    });
  } catch (error: any) {
    console.error('[FirebaseAuth] Verify error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante la verifica' 
    });
  }
});

/**
 * GET /api/auth/firebase/me
 * Ottieni informazioni sull'utente corrente
 */
router.get('/firebase/me', async (req: Request, res: Response) => {
  try {
    const idToken = extractBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Non autenticato' 
      });
    }

    const decodedToken = await verifyFirebaseToken(idToken);
    if (!decodedToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Sessione scaduta' 
      });
    }

    res.json({
      success: true,
      data: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture,
        email_verified: decodedToken.email_verified,
      },
    });
  } catch (error: any) {
    console.error('[FirebaseAuth] Me error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore nel recupero dati utente' 
    });
  }
});

/**
 * POST /api/auth/firebase/logout
 * Logout - revoca il refresh token Firebase (opzionale)
 */
router.post('/firebase/logout', async (req: Request, res: Response) => {
  try {
    const idToken = extractBearerToken(req);
    if (idToken) {
      const decodedToken = await verifyFirebaseToken(idToken);
      if (decodedToken) {
        try {
          const { getAuth } = await import('firebase-admin/auth');
          await getAuth().revokeRefreshTokens(decodedToken.uid);
          console.log(`[FirebaseAuth] Refresh tokens revocati per: ${decodedToken.uid}`);
        } catch (err) {
          // Non bloccare il logout se la revoca fallisce
          console.warn('[FirebaseAuth] Revoca token fallita:', err);
        }
      }
    }

    res.json({
      success: true,
      message: 'Logout effettuato',
    });
  } catch (error: any) {
    console.error('[FirebaseAuth] Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante il logout' 
    });
  }
});

// ============================================
// LEGACY COMPATIBILITY ENDPOINTS
// ============================================

/**
 * POST /api/auth/login
 * Login con email/password - compatibilità con il vecchio sistema
 * Ora usa Firebase Auth internamente
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email e password sono obbligatori' 
    });
  }

  try {
    // Per il login email/password, il client deve usare Firebase SDK direttamente
    // Questo endpoint è mantenuto per compatibilità ma restituisce un messaggio informativo
    res.json({
      success: false,
      error: 'Usa il login Firebase dal client. Questo endpoint è deprecato.',
      redirect: 'firebase',
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: 'Errore durante il login' 
    });
  }
});

/**
 * POST /api/auth/register
 * Registrazione - compatibilità con il vecchio sistema
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email e password sono obbligatori' 
    });
  }

  try {
    // Crea l'utente tramite Firebase Admin SDK
    await getFirebaseAdmin();
    const { getAuth } = await import('firebase-admin/auth');
    
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name || undefined,
      emailVerified: false,
    });

    console.log(`[FirebaseAuth] Nuovo utente registrato: ${email} (${userRecord.uid})`);

    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
      },
      message: 'Registrazione completata. Effettua il login.',
    });
  } catch (error: any) {
    console.error('[FirebaseAuth] Register error:', error);
    
    let errorMessage = 'Errore durante la registrazione';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'Questa email è già registrata';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email non valida';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password troppo debole (minimo 6 caratteri)';
    }
    
    res.status(400).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

/**
 * GET /api/auth/config
 * Restituisce la configurazione di autenticazione pubblica
 */
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      environment: process.env.NODE_ENV || 'development',
      firebase: {
        projectId: 'dmshub-auth-2975e',
        authDomain: 'dmshub-auth-2975e.firebaseapp.com',
      },
      supported_auth_methods: ['email', 'google', 'apple', 'spid', 'cie', 'cns'],
      roles: ['citizen', 'business', 'pa'],
    },
  });
});

export default router;
