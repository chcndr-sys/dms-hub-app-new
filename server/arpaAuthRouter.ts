/**
 * ARPA Authentication Router
 * MioHub - Backend OAuth2-OIDC per SPID/CIE/CNS via ARPA Regione Toscana
 *
 * Questo router gestisce il flusso di autenticazione OAuth2 Authorization Code Grant
 * con l'infrastruttura ARPA della Regione Toscana. Supporta SPID, CIE, CNS ed eIDAS.
 *
 * Endpoints:
 *   GET  /api/auth/login     - Genera URL di autorizzazione ARPA e restituisce al frontend
 *   POST /api/auth/callback  - Riceve authorization code, scambia per token, crea sessione
 *   GET  /api/auth/verify    - Verifica validità del session token
 *   GET  /api/auth/me        - Restituisce info utente corrente dal session token
 *   POST /api/auth/logout    - Invalida sessione e genera URL logout ARPA
 *   POST /api/auth/refresh   - Rinnova il session token
 *
 * Variabili d'ambiente richieste:
 *   ARPA_CLIENT_ID          - Client ID fornito dall'Integration Manager ARPA
 *   ARPA_CLIENT_SECRET      - Client Secret fornito dall'Integration Manager ARPA
 *   ARPA_REDIRECT_URI       - Redirect URI registrata su ARPA (es: https://orchestratore.mio-hub.me/api/auth/arpa/callback)
 *   ARPA_ENVIRONMENT        - 'staging' o 'production' (default: 'staging')
 *   ARPA_SESSION_SECRET     - Chiave segreta per firmare i JWT di sessione (min 32 chars)
 *
 * Documentazione ARPA:
 *   - Documento tecnico: "ARPA per gli Enti della P.P.A.A." v1.13 (22/01/2026)
 *   - Portale: https://auth.regione.toscana.it/
 *   - Integration Manager: https://auth.regione.toscana.it/im-fe/
 *   - Supporto: arpa@regione.toscana.it
 *
 * @author Manus AI per DMS Hub / MIO HUB
 * @version 1.0.0
 * @date 2026-02-11
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const router = Router();

// ============================================
// CONFIGURAZIONE ARPA
// ============================================

/**
 * Endpoint ARPA per ambiente Staging e Produzione.
 * Fonte: Documento tecnico ARPA Enti v1.13, Sezione 10 "Endpoint" (p.20)
 */
const ARPA_ENDPOINTS = {
  staging: {
    authorization: 'https://trial.auth.toscana.it/auth-trial/realms/enti/protocol/openid-connect/auth',
    token: 'https://trial.auth.toscana.it/auth-trial/realms/enti/protocol/openid-connect/token',
    userinfo: 'https://trial.auth.toscana.it/auth-trial/realms/enti/protocol/openid-connect/userinfo',
    introspect: 'https://trial.auth.toscana.it/auth-trial/realms/enti/protocol/openid-connect/token/introspect',
    certs: 'https://trial.auth.toscana.it/auth-trial/realms/enti/protocol/openid-connect/certs',
    logout: 'https://trial.auth.toscana.it/auth-trial/realms/enti/protocol/openid-connect/logout',
  },
  production: {
    authorization: 'https://auth.toscana.it/auth/realms/enti/protocol/openid-connect/auth',
    token: 'https://auth.toscana.it/auth/realms/enti/protocol/openid-connect/token',
    userinfo: 'https://auth.toscana.it/auth/realms/enti/protocol/openid-connect/userinfo',
    introspect: 'https://auth.toscana.it/auth/realms/enti/protocol/openid-connect/token/introspect',
    certs: 'https://auth.toscana.it/auth/realms/enti/protocol/openid-connect/certs',
    logout: 'https://auth.toscana.it/auth/realms/enti/protocol/openid-connect/logout',
  },
};

/**
 * Scope richiesti per MIO HUB.
 * - openid: obbligatorio per OIDC
 * - default: spidCode, name, familyName, fiscalNumber
 * - profile: placeOfBirth, dateOfBirth, gender
 * - email: indirizzo email
 * - professional: companyName, registeredOffice (CRUCIALE per imprese)
 *
 * Fonte: Documento tecnico ARPA Enti v1.13, Sezione 7 "UserInfo" (p.14-16)
 */
const ARPA_SCOPES = 'openid profile email professional';

function getArpaConfig() {
  const environment = (process.env.ARPA_ENVIRONMENT || 'staging') as 'staging' | 'production';
  const clientId = process.env.ARPA_CLIENT_ID;
  const clientSecret = process.env.ARPA_CLIENT_SECRET;
  const redirectUri = process.env.ARPA_REDIRECT_URI;
  const sessionSecret = process.env.ARPA_SESSION_SECRET || process.env.SESSION_SECRET || 'miohub-arpa-session-secret-change-me-in-production';

  if (!clientId || !clientSecret || !redirectUri) {
    console.warn('[ARPA Auth] ⚠️ Variabili d\'ambiente ARPA non configurate. Impostare ARPA_CLIENT_ID, ARPA_CLIENT_SECRET, ARPA_REDIRECT_URI');
  }

  return {
    environment,
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    redirectUri: redirectUri || '',
    sessionSecret,
    endpoints: ARPA_ENDPOINTS[environment],
  };
}

// ============================================
// SESSION MANAGEMENT (JWT)
// ============================================

/**
 * In-memory store per gli state OAuth (anti-CSRF).
 * In produzione, considerare Redis o DB.
 * Ogni state ha un TTL di 5 minuti.
 */
const pendingStates = new Map<string, { returnUrl: string; createdAt: number }>();

// Pulizia periodica degli state scaduti (ogni 5 minuti)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingStates) {
    if (now - data.createdAt > 5 * 60 * 1000) {
      pendingStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * In-memory store per le sessioni attive.
 * Mappa: sessionId → { userId, email, arpaTokens, createdAt }
 * In produzione, usare Redis o DB table `user_sessions`.
 */
interface ArpaSession {
  sessionId: string;
  userId: number | null;
  email: string;
  name: string;
  fiscalCode: string;
  authMethod: string;
  authLevel: number;
  companyName?: string;
  registeredOffice?: string;
  arpaAccessToken: string;
  arpaRefreshToken?: string;
  arpaIdToken?: string;
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, ArpaSession>();

// Pulizia periodica sessioni scadute (ogni 30 minuti)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions) {
    if (now > session.expiresAt) {
      activeSessions.delete(id);
    }
  }
}, 30 * 60 * 1000);

/**
 * Genera un JWT di sessione per il frontend.
 */
async function createSessionJWT(session: ArpaSession): Promise<string> {
  const config = getArpaConfig();
  const secret = new TextEncoder().encode(config.sessionSecret);

  return new SignJWT({
    sessionId: session.sessionId,
    email: session.email,
    name: session.name,
    fiscalCode: session.fiscalCode,
    authMethod: session.authMethod,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('8h') // Sessione valida 8 ore
    .setIssuer('miohub-arpa')
    .sign(secret);
}

/**
 * Verifica e decodifica un JWT di sessione.
 */
async function verifySessionJWT(token: string): Promise<{ sessionId: string; email: string; name: string; fiscalCode: string; authMethod: string } | null> {
  const config = getArpaConfig();
  const secret = new TextEncoder().encode(config.sessionSecret);

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'miohub-arpa',
    });
    return payload as any;
  } catch {
    return null;
  }
}

// ============================================
// HELPER: Fetch con gestione errori
// ============================================

async function arpaFetch(url: string, options: RequestInit): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[ARPA Auth] Errore HTTP ${response.status} da ${url}:`, errorText);
    throw new Error(`ARPA HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

// ============================================
// ENDPOINT 1: GET /api/auth/login
// Genera URL di autorizzazione ARPA
// ============================================

/**
 * GET /api/auth/login?returnUrl=/dashboard-pa
 *
 * Il frontend chiama questo endpoint quando l'utente clicca "Entra con SPID/CIE/CNS".
 * Genera un URL di autorizzazione ARPA con i parametri OAuth2 e lo restituisce.
 *
 * Flusso (Documento ARPA v1.13, Sezione 3 "Flussi di Autenticazione"):
 * 1. Genera uno `state` random (anti-CSRF)
 * 2. Costruisce l'URL di autorizzazione con client_id, redirect_uri, scope, state
 * 3. Restituisce l'URL al frontend che farà il redirect
 *
 * Query params:
 *   - returnUrl (opzionale): URL a cui tornare dopo il login (es: /dashboard-pa, /dashboard-impresa)
 *   - authMethod (opzionale): 'spid' | 'cie' | 'cns' — per pre-selezionare il metodo
 *
 * Response: { success: true, data: { auth_url: string, state: string } }
 */
router.get('/login', (req: Request, res: Response) => {
  const config = getArpaConfig();

  // Verifica configurazione
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    console.error('[ARPA Auth] Configurazione mancante. Impostare ARPA_CLIENT_ID, ARPA_CLIENT_SECRET, ARPA_REDIRECT_URI');
    return res.status(503).json({
      success: false,
      error: 'Servizio SPID/CIE non ancora configurato. Contattare l\'amministratore.',
      details: 'Le credenziali ARPA non sono state ancora configurate nell\'Integration Manager.',
    });
  }

  const returnUrl = (req.query.returnUrl as string) || '/';
  const authMethod = req.query.authMethod as string | undefined;

  // Genera state anti-CSRF (32 bytes hex)
  const state = crypto.randomBytes(32).toString('hex');

  // Salva state con returnUrl per il callback
  pendingStates.set(state, {
    returnUrl,
    createdAt: Date.now(),
  });

  // Costruisci URL di autorizzazione ARPA
  // Fonte: Documento ARPA v1.13, Sezione 3 + Sezione 10
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: ARPA_SCOPES,
    state,
  });

  // Parametro opzionale: pre-seleziona metodo di autenticazione
  // Per CIE su mobile: idp_hint=CIE,CieId (Documento ARPA v1.13, Sezione 3.1)
  if (authMethod === 'cie') {
    params.set('idp_hint', 'CIE,CieId');
  }

  const authUrl = `${config.endpoints.authorization}?${params.toString()}`;

  console.log(`[ARPA Auth] Login iniziato → returnUrl: ${returnUrl}, authMethod: ${authMethod || 'any'}, environment: ${config.environment}`);

  res.json({
    success: true,
    data: {
      auth_url: authUrl,
      state,
    },
  });
});

// ============================================
// ENDPOINT 2: POST /api/auth/callback
// Scambia authorization code per token + crea sessione
// ============================================

/**
 * POST /api/auth/callback
 * Body: { code: string, state: string }
 *
 * Il frontend chiama questo endpoint dopo il redirect da ARPA con il code.
 * (Pagina AuthCallback.tsx → handleCallback() in authClient.ts)
 *
 * Flusso:
 * 1. Verifica state anti-CSRF
 * 2. Scambia code per Access Token + Refresh Token (server-to-server verso ARPA Token Endpoint)
 * 3. Chiama UserInfo Endpoint per ottenere dati utente
 * 4. Crea/aggiorna utente nel DB MioHub
 * 5. Traccia login nella tabella login_attempts
 * 6. Crea sessione JWT e restituisce al frontend
 *
 * Response: { success: true, data: { session_token: string, user: User, return_url: string } }
 */
router.post('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.body;

  if (!code || !state) {
    return res.status(400).json({
      success: false,
      error: 'Parametri mancanti: code e state sono obbligatori',
    });
  }

  // 1. Verifica state anti-CSRF
  const pendingState = pendingStates.get(state);
  if (!pendingState) {
    return res.status(400).json({
      success: false,
      error: 'State non valido o scaduto. Riprova il login.',
    });
  }
  pendingStates.delete(state);

  // Verifica TTL (5 minuti)
  if (Date.now() - pendingState.createdAt > 5 * 60 * 1000) {
    return res.status(400).json({
      success: false,
      error: 'Sessione di autenticazione scaduta. Riprova il login.',
    });
  }

  const config = getArpaConfig();

  try {
    // 2. Scambia code per token (server-to-server)
    // Fonte: Documento ARPA v1.13, Sezione 3 "Authorization Code Grant"
    const tokenResponse = await arpaFetch(config.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    });

    console.log('[ARPA Auth] Token ottenuto con successo');

    // 3. Chiama UserInfo per dati utente completi
    // Fonte: Documento ARPA v1.13, Sezione 7 "UserInfo" (p.14-16)
    const userInfo = await arpaFetch(config.endpoints.userinfo, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenResponse.access_token}`,
      },
    });

    console.log('[ARPA Auth] UserInfo ricevuta:', JSON.stringify(userInfo, null, 2));

    // 4. Estrai dati utente dalla risposta ARPA
    // I dati sono nel campo "extras" della UserInfo (Documento ARPA v1.13, p.14)
    const extras = userInfo.extras || userInfo;
    const userData = {
      fiscalCode: extras.fiscalNumber || userInfo.preferred_username || '',
      name: extras.name || userInfo.given_name || '',
      familyName: extras.familyName || userInfo.family_name || '',
      email: extras.email || userInfo.email || '',
      companyName: extras.companyName || '',
      registeredOffice: extras.registeredOffice || '',
      spidCode: extras.spidCode || '',
      dateOfBirth: extras.dateOfBirth || '',
      placeOfBirth: extras.placeOfBirth || '',
      gender: extras.gender || '',
      mobilePhone: extras.mobilePhone || '',
    };

    // Estrai auth_type e auth_level dall'Access Token JWT (senza verificare firma — è già verificato da ARPA)
    let authType = 'SPID';
    let authLevel = 2;
    try {
      const tokenParts = tokenResponse.access_token.split('.');
      if (tokenParts.length === 3) {
        const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        authType = tokenPayload.auth_type || 'SPID';
        authLevel = parseInt(tokenPayload.auth_level) || 2;
      }
    } catch {
      console.warn('[ARPA Auth] Impossibile decodificare Access Token JWT per auth_type/auth_level');
    }

    // 5. Crea/aggiorna utente nel DB MioHub
    let dbUserId: number | null = null;
    try {
      const { getDb } = await import('./db');
      const db = await getDb();

      if (db) {
        const { users, loginAttempts } = await import('../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');

        // Cerca utente per email o codice fiscale
        const fullName = `${userData.name} ${userData.familyName}`.trim();
        const userEmail = userData.email || `${userData.fiscalCode}@spid.miohub.app`;

        // Upsert utente: cerca per email, se non esiste crea
        const existingUsers = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);

        if (existingUsers.length > 0) {
          // Aggiorna utente esistente
          dbUserId = existingUsers[0].id;
          await db.update(users)
            .set({
              name: fullName || existingUsers[0].name,
              loginMethod: authType,
              lastSignedIn: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, dbUserId));
          console.log(`[ARPA Auth] Utente aggiornato: ${userEmail} (ID: ${dbUserId})`);
        } else {
          // Crea nuovo utente
          // Genera un openId univoco per ARPA (basato su fiscalCode)
          const arpaOpenId = `arpa_${crypto.createHash('sha256').update(userData.fiscalCode || userData.email).digest('hex').substring(0, 32)}`;

          const insertResult = await db.insert(users).values({
            openId: arpaOpenId,
            name: fullName,
            email: userEmail,
            loginMethod: authType,
            role: 'user',
            lastSignedIn: new Date(),
          }).returning({ id: users.id });

          dbUserId = insertResult[0]?.id || null;
          console.log(`[ARPA Auth] Nuovo utente creato: ${userEmail} (ID: ${dbUserId})`);
        }

        // 5b. Traccia login nella tabella login_attempts
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';

        await db.execute(sql`
          INSERT INTO login_attempts (username, user_id, ip_address, user_agent, success, created_at, user_email, user_name)
          VALUES (
            ${userData.fiscalCode || userEmail},
            ${dbUserId},
            ${ipAddress},
            ${userAgent},
            true,
            NOW(),
            ${userEmail},
            ${fullName}
          )
        `);
        console.log(`[ARPA Auth] Login tracciato per ${userEmail}`);

        // 5c. Traccia dati di monitoraggio obbligatori (Documento ARPA v1.13, Sezione 9)
        // auth_time, fiscal_number, auth_type, auth_level, sid
        try {
          const tokenParts = tokenResponse.access_token.split('.');
          if (tokenParts.length === 3) {
            const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log(`[ARPA Auth] Monitoraggio: auth_time=${tokenPayload.auth_time}, fiscal_number=${userData.fiscalCode}, auth_type=${authType}, auth_level=${authLevel}, sid=${tokenPayload.sid}`);
          }
        } catch {
          // Non critico
        }
      }
    } catch (dbError) {
      console.error('[ARPA Auth] Errore DB (non bloccante):', dbError);
      // Non blocchiamo il login se il DB fallisce
    }

    // 6. Crea sessione
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session: ArpaSession = {
      sessionId,
      userId: dbUserId,
      email: userData.email,
      name: `${userData.name} ${userData.familyName}`.trim(),
      fiscalCode: userData.fiscalCode,
      authMethod: authType,
      authLevel,
      companyName: userData.companyName,
      registeredOffice: userData.registeredOffice,
      arpaAccessToken: tokenResponse.access_token,
      arpaRefreshToken: tokenResponse.refresh_token,
      arpaIdToken: tokenResponse.id_token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 ore
    };

    activeSessions.set(sessionId, session);

    // Genera JWT per il frontend
    const sessionToken = await createSessionJWT(session);

    console.log(`[ARPA Auth] ✅ Login completato: ${session.name} (${session.email}), metodo: ${authType}, livello: ${authLevel}`);

    res.json({
      success: true,
      data: {
        session_token: sessionToken,
        user: {
          id: dbUserId,
          email: session.email,
          name: session.name,
          fiscalCode: session.fiscalCode,
          authMethod: session.authMethod,
          companyName: session.companyName,
          registeredOffice: session.registeredOffice,
        },
        return_url: pendingState.returnUrl,
      },
    });
  } catch (error: any) {
    console.error('[ARPA Auth] ❌ Errore callback:', error.message);

    // Traccia login fallito
    try {
      const { getDb } = await import('./db');
      const db = await getDb();
      if (db) {
        const { sql } = await import('drizzle-orm');
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';

        await db.execute(sql`
          INSERT INTO login_attempts (username, ip_address, user_agent, success, failure_reason, created_at, user_email)
          VALUES (
            'arpa_callback_error',
            ${ipAddress},
            ${userAgent},
            false,
            ${error.message?.substring(0, 100) || 'unknown_error'},
            NOW(),
            'unknown'
          )
        `);
      }
    } catch {
      // Non critico
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante l\'autenticazione SPID/CIE. Riprova.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ============================================
// ENDPOINT 3: GET /api/auth/verify
// Verifica validità del session token
// ============================================

/**
 * GET /api/auth/verify
 * Headers: Authorization: Bearer <session_token>
 *
 * Verifica che il session token JWT sia valido e non scaduto.
 *
 * Response: { success: true, data: { valid: true, user: { ... } } }
 */
router.get('/verify', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({
      success: true,
      data: { valid: false },
    });
  }

  const token = authHeader.substring(7);
  const payload = await verifySessionJWT(token);

  if (!payload) {
    return res.json({
      success: true,
      data: { valid: false },
    });
  }

  // Verifica che la sessione sia ancora attiva in memoria
  const session = activeSessions.get(payload.sessionId);
  if (!session || Date.now() > session.expiresAt) {
    return res.json({
      success: true,
      data: { valid: false },
    });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        fiscalCode: session.fiscalCode,
        authMethod: session.authMethod,
      },
    },
  });
});

// ============================================
// ENDPOINT 4: GET /api/auth/me
// Restituisce info utente corrente
// ============================================

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <session_token>
 *
 * Restituisce le informazioni complete dell'utente autenticato.
 *
 * Response: { success: true, data: { id, email, name, fiscalCode, authMethod, companyName, ... } }
 */
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token di sessione mancante',
    });
  }

  const token = authHeader.substring(7);
  const payload = await verifySessionJWT(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Token di sessione non valido o scaduto',
    });
  }

  const session = activeSessions.get(payload.sessionId);
  if (!session || Date.now() > session.expiresAt) {
    return res.status(401).json({
      success: false,
      error: 'Sessione scaduta. Effettua nuovamente il login.',
    });
  }

  // Prova a ottenere dati aggiornati dal DB
  let roles: any[] = [];
  try {
    const { getDb } = await import('./db');
    const db = await getDb();
    if (db && session.userId) {
      const { users } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const dbUser = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
      if (dbUser.length > 0) {
        roles = [{ id: 1, name: dbUser[0].role, display_name: dbUser[0].role, level: 1 }];
      }
    }
  } catch {
    // Non critico
  }

  res.json({
    success: true,
    data: {
      id: session.userId,
      email: session.email,
      name: session.name,
      fiscalCode: session.fiscalCode,
      authMethod: session.authMethod,
      companyName: session.companyName,
      registeredOffice: session.registeredOffice,
      authLevel: session.authLevel,
      roles,
    },
  });
});

// ============================================
// ENDPOINT 5: POST /api/auth/logout
// Invalida sessione e genera URL logout ARPA
// ============================================

/**
 * POST /api/auth/logout
 * Body: { session_token: string }
 *
 * Invalida la sessione locale e genera l'URL di logout ARPA per il redirect.
 * Il frontend farà redirect all'URL di logout ARPA per completare il logout SSO.
 *
 * Logout ARPA (Documento ARPA v1.13, Sezione 8 "Logout"):
 * - Usa post_logout_redirect_uri (NON redirect_uri, deprecato)
 * - Richiede id_token_hint o client_id
 *
 * Response: { success: true, data: { logout_url: string | null } }
 */
router.post('/logout', async (req: Request, res: Response) => {
  const { session_token } = req.body;

  let logoutUrl: string | null = null;

  if (session_token) {
    const payload = await verifySessionJWT(session_token);

    if (payload) {
      const session = activeSessions.get(payload.sessionId);

      if (session) {
        const config = getArpaConfig();

        // Costruisci URL di logout ARPA
        // Fonte: Documento ARPA v1.13, Sezione 8 "Logout" — metodo GET
        if (session.arpaIdToken && config.clientId) {
          const logoutParams = new URLSearchParams({
            id_token_hint: session.arpaIdToken,
            post_logout_redirect_uri: `${config.redirectUri.replace('/api/auth/arpa/callback', '')}`,
            client_id: config.clientId,
          });
          logoutUrl = `${config.endpoints.logout}?${logoutParams.toString()}`;
        }

        // Invalida sessione locale
        activeSessions.delete(payload.sessionId);
        console.log(`[ARPA Auth] Logout: ${session.email}`);
      }
    }
  }

  res.json({
    success: true,
    data: {
      logout_url: logoutUrl,
    },
  });
});

// ============================================
// ENDPOINT 6: POST /api/auth/refresh
// Rinnova il session token
// ============================================

/**
 * POST /api/auth/refresh
 * Body: { session_token: string }
 *
 * Rinnova la sessione estendendo la scadenza.
 * Se ARPA ha fornito un refresh_token, lo usa per ottenere un nuovo access_token.
 *
 * Response: { success: true }
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const { session_token } = req.body;

  if (!session_token) {
    return res.status(400).json({
      success: false,
      error: 'Session token mancante',
    });
  }

  const payload = await verifySessionJWT(session_token);
  if (!payload) {
    return res.json({ success: false, error: 'Token non valido' });
  }

  const session = activeSessions.get(payload.sessionId);
  if (!session) {
    return res.json({ success: false, error: 'Sessione non trovata' });
  }

  // Estendi scadenza sessione
  session.expiresAt = Date.now() + 8 * 60 * 60 * 1000;

  // Se abbiamo un refresh_token ARPA, prova a rinnovare l'access_token
  if (session.arpaRefreshToken) {
    try {
      const config = getArpaConfig();
      const tokenResponse = await arpaFetch(config.endpoints.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: session.arpaRefreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }).toString(),
      });

      session.arpaAccessToken = tokenResponse.access_token;
      if (tokenResponse.refresh_token) {
        session.arpaRefreshToken = tokenResponse.refresh_token;
      }
      console.log(`[ARPA Auth] Token ARPA rinnovato per ${session.email}`);
    } catch (error) {
      console.warn('[ARPA Auth] Impossibile rinnovare token ARPA:', error);
      // Non blocchiamo — la sessione locale è comunque estesa
    }
  }

  res.json({ success: true });
});

export default router;
