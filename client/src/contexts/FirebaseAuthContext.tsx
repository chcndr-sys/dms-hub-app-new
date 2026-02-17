/**
 * Firebase Authentication Context
 * MioHub - Gestione stato autenticazione globale
 * 
 * Fornisce:
 * - Stato utente Firebase (user, loading, error)
 * - Funzioni di login/logout/register
 * - Sincronizzazione con il backend MioHub (token verification)
 * - BRIDGE: Dopo login Firebase, cerca l'utente nel DB legacy (orchestratore)
 *   per recuperare id, impresa_id, wallet_balance, assigned_roles, ecc.
 * - Registra eventi di login nel sistema di sicurezza
 * - Gestione ruoli (citizen, business, pa)
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  onAuthChange,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  loginWithApple,
  firebaseLogout,
  getIdToken,
  handleRedirectResult,
  resetPassword,
  getFirebaseErrorMessage,
  type FirebaseUser,
} from '@/lib/firebase';

// ============================================
// TYPES
// ============================================

export type UserRole = 'citizen' | 'business' | 'pa';

export interface MioHubUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  role: UserRole;
  fiscalCode?: string;
  verified: boolean;
  // Dati dal backend MioHub (orchestratore)
  miohubId?: number;
  impresaId?: number;
  walletBalance?: number;
  assignedRoles?: Array<{
    role_id: number;
    role_code: string;
    role_name: string;
    territory_type?: string | null;
    territory_id?: number | null;
  }>;
  permissions?: string[];
  openId?: string;
  isSuperAdmin?: boolean;
}

interface FirebaseAuthState {
  user: MioHubUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface FirebaseAuthContextType extends FirebaseAuthState {
  // Login methods
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  // Other methods
  logout: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  getToken: () => Promise<string | null>;
  setUserRole: (role: UserRole) => void;
  clearError: () => void;
}

// ============================================
// CONTEXT
// ============================================

const FirebaseAuthContext = createContext<FirebaseAuthContextType | null>(null);

// ============================================
// CONSTANTS
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';
const TRPC_BASE = import.meta.env.VITE_TRPC_URL || 'https://mihub.157-90-29-66.nip.io';

// ============================================
// HELPER: Lookup user in orchestratore legacy DB
// ============================================

interface LegacyUserData {
  id: number;
  name: string;
  email: string;
  openId?: string;
  impresa_id?: number;
  wallet_balance?: number;
  base_role: string;
  is_super_admin?: boolean;
  assigned_roles: Array<{
    role_id: number;
    role_code: string;
    role_name: string;
    territory_type?: string | null;
    territory_id?: number | null;
  }>;
}

/**
 * Cerca l'utente nel database legacy dell'orchestratore tramite email.
 * Prima fa una ricerca per email, poi recupera i dettagli completi.
 */
async function lookupLegacyUser(email: string): Promise<LegacyUserData | null> {
  try {
    // Step 1: Cerca utente per email
    const searchRes = await fetch(`${API_BASE}/api/security/users?search=${encodeURIComponent(email)}&limit=1`);
    if (!searchRes.ok) {
      console.warn('[FirebaseAuth] Ricerca utente legacy fallita:', searchRes.status);
      return null;
    }
    const searchData = await searchRes.json();
    if (!searchData.success || !searchData.data || searchData.data.length === 0) {
      console.warn('[FirebaseAuth] Utente legacy non trovato per email:', email);
      return null;
    }

    const basicUser = searchData.data[0];
    const userId = basicUser.id;

    // Step 2: Recupera dettagli completi (include impresa_id, wallet_balance, roles, ecc.)
    const detailRes = await fetch(`${API_BASE}/api/security/users/${userId}`);
    if (!detailRes.ok) {
      console.warn('[FirebaseAuth] Dettagli utente legacy non disponibili:', detailRes.status);
      // Usa i dati base dalla ricerca
      return {
        id: basicUser.id,
        name: basicUser.name || email,
        email: basicUser.email,
        base_role: basicUser.base_role || 'user',
        is_super_admin: basicUser.is_super_admin === true,
        assigned_roles: basicUser.assigned_roles || [],
      };
    }
    const detailData = await detailRes.json();
    if (!detailData.success || !detailData.data) {
      return {
        id: basicUser.id,
        name: basicUser.name || email,
        email: basicUser.email,
        base_role: basicUser.base_role || 'user',
        is_super_admin: basicUser.is_super_admin === true,
        assigned_roles: basicUser.assigned_roles || [],
      };
    }

    const fullUser = detailData.data;
    console.warn(`[FirebaseAuth] Utente legacy trovato: ID=${fullUser.id}, impresa_id=${fullUser.impresa_id}, wallet=${fullUser.wallet_balance}, is_super_admin=${fullUser.is_super_admin}`);

    return {
      id: fullUser.id,
      name: fullUser.name || email,
      email: fullUser.email,
      openId: fullUser.openId,
      impresa_id: fullUser.impresa_id || undefined,
      wallet_balance: fullUser.wallet_balance || 0,
      base_role: fullUser.role || 'user',
      is_super_admin: fullUser.is_super_admin === true,
      assigned_roles: (fullUser.roles || []).map((r: any) => ({
        role_id: r.role_id,
        role_code: r.role_code,
        role_name: r.role_name,
        territory_type: r.territory_type,
        territory_id: r.territory_id,
      })),
    };
  } catch (err) {
    console.error('[FirebaseAuth] Errore lookup utente legacy:', err);
    return null;
  }
}

/**
 * Controlla i ruoli dell'utente nel Neon DB (il vero RBAC system).
 * Chiama il tRPC backend su Hetzner che ha accesso al Neon DB.
 * Formato: httpBatchLink + superjson
 */
async function checkNeonRoles(email: string): Promise<{ roles: any[]; isAdmin: boolean }> {
  try {
    const input = encodeURIComponent(JSON.stringify({ "0": { json: { email } } }));
    const url = `${TRPC_BASE}/api/trpc/auth.checkRoles?batch=1&input=${input}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      console.warn('[FirebaseAuth] Neon checkRoles fallito:', res.status);
      return { roles: [], isAdmin: false };
    }
    const data = await res.json();
    // httpBatchLink response: [{ result: { data: { json: ... } } }]
    const result = data?.[0]?.result?.data?.json || data?.[0]?.result?.data;
    if (result) {
      console.warn(`[FirebaseAuth] Neon roles: isAdmin=${result.isAdmin}, roles=${JSON.stringify(result.roles)}`);
      return result;
    }
    return { roles: [], isAdmin: false };
  } catch (err) {
    console.warn('[FirebaseAuth] Neon checkRoles errore:', err);
    return { roles: [], isAdmin: false };
  }
}

/**
 * Tenta il bootstrap admin nel Neon DB (one-time, solo se non esiste admin).
 * Formato: httpBatchLink + superjson mutation
 */
async function tryBootstrapAdmin(email: string): Promise<boolean> {
  try {
    const res = await fetch(`${TRPC_BASE}/api/trpc/auth.bootstrapAdmin?batch=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ "0": { json: { email } } }),
    });
    if (!res.ok) {
      console.warn('[FirebaseAuth] Bootstrap admin HTTP fallito:', res.status);
      return false;
    }
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json || data?.[0]?.result?.data;
    if (result?.success) {
      console.warn('[FirebaseAuth] Bootstrap admin riuscito:', result.message);
      return true;
    }
    console.warn('[FirebaseAuth] Bootstrap admin rifiutato:', result?.error);
    return false;
  } catch (err) {
    console.warn('[FirebaseAuth] Bootstrap admin errore:', err);
    return false;
  }
}

/**
 * Crea una sessione JWT sul backend tRPC (Hetzner) dopo login Firebase.
 * Questo è il passo critico: setta il cookie app_session_id sul dominio del backend,
 * così le successive chiamate tRPC protectedProcedure funzionano.
 */
async function createFirebaseSession(idToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${TRPC_BASE}/api/trpc/auth.createFirebaseSession?batch=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ "0": { json: { token: idToken } } }),
    });
    if (!res.ok) {
      console.warn('[FirebaseAuth] createFirebaseSession HTTP fallito:', res.status);
      return false;
    }
    const data = await res.json();
    const result = data?.[0]?.result?.data?.json || data?.[0]?.result?.data;
    if (result?.success) {
      console.warn(`[FirebaseAuth] Sessione JWT creata con successo per ${result.email}`);
      return true;
    }
    console.warn('[FirebaseAuth] createFirebaseSession fallito:', result?.error);
    return false;
  } catch (err) {
    console.warn('[FirebaseAuth] createFirebaseSession errore:', err);
    return false;
  }
}

/**
 * Registra un evento di login nel sistema di sicurezza dell'orchestratore.
 */
async function trackLoginEvent(userId: number, email: string, provider: string, success: boolean): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/security/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: success ? 'login_success' : 'login_failed',
        severity: success ? 'low' : 'medium',
        user_id: userId,
        description: `Login Firebase via ${provider} - ${email}`,
        details: { provider, email, timestamp: new Date().toISOString() },
      }),
    });
    console.warn(`[FirebaseAuth] Evento login registrato per user_id=${userId}`);
  } catch (err) {
    console.warn('[FirebaseAuth] Registrazione evento login fallita:', err);
  }
}

// ============================================
// HELPER: Sync user with MioHub backend
// ============================================

async function syncUserWithBackend(firebaseUser: FirebaseUser, role: UserRole): Promise<MioHubUser> {
  const idToken = await firebaseUser.getIdToken();
  const email = firebaseUser.email || '';
  const provider = firebaseUser.providerData[0]?.providerId || 'email';

  // ============================================
  // STEP 1: Cerca l'utente nel DB legacy (orchestratore)
  // Questo è il passo critico per recuperare id, impresa_id, wallet_balance
  // ============================================
  let legacyUser: LegacyUserData | null = null;
  if (email) {
    legacyUser = await lookupLegacyUser(email);
  }

  // ============================================
  // STEP 2: Sync con backend Firebase (Vercel serverless function)
  // URL RELATIVO: va a Vercel (dove gira il client), NON a Hetzner
  // Include trackLogin per registrare il login nel DB
  // ============================================
  let backendSyncData: any = null;
  try {
    const response = await fetch(`/api/auth/firebase/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        provider,
        role,
        // Login tracking data
        trackLogin: true,
        legacyUserId: legacyUser?.id || 0,
        userName: legacyUser?.name || firebaseUser.displayName || '',
        userEmail: firebaseUser.email || email,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        backendSyncData = data.user;
      }
      if (data.loginTracked) {
        console.warn('[FirebaseAuth] Login tracciato con successo nel DB');
      }
    }
  } catch (err) {
    console.warn('[FirebaseAuth] Backend sync fallito:', err);
  }

  // ============================================
  // STEP 3: Registra evento di login nel sistema di sicurezza
  // ============================================
  if (legacyUser) {
    trackLoginEvent(legacyUser.id, email, provider, true);
  }

  // ============================================
  // STEP 4: Controlla ruoli nel Neon DB (il vero RBAC system)
  // Il Neon DB ha user_role_assignments che è la fonte di verità.
  // L'orchestratore legacy è un fallback.
  // Firebase conosce solo il ruolo scelto alla registrazione ('citizen').
  // ============================================
  let neonAdmin = false;
  let neonRoles: any[] = [];
  const hasImpresa = !!legacyUser?.impresa_id;

  if (email) {
    const neonResult = await checkNeonRoles(email);
    neonAdmin = neonResult.isAdmin;
    neonRoles = neonResult.roles;

    // Se non e' admin nel Neon DB E ha un'impresa associata,
    // assicura che sia admin (ensureAdmin e' idempotente)
    if (!neonAdmin && hasImpresa) {
      const bootstrapped = await tryBootstrapAdmin(email);
      if (bootstrapped) {
        const recheck = await checkNeonRoles(email);
        neonAdmin = recheck.isAdmin;
        neonRoles = recheck.roles;
      }
    }
  }

  const isLegacyAdmin = legacyUser?.is_super_admin === true ||
    legacyUser?.base_role === 'admin' ||
    (legacyUser?.assigned_roles || []).some(
      (r: { role_id: number }) => r.role_id === 1
    );

  // Admin se Neon DB O orchestratore legacy lo dicono
  const isAdmin = neonAdmin || isLegacyAdmin;

  // Merge ruoli: Neon DB ha la priorità, poi legacy
  const mergedRoles = neonRoles.length > 0
    ? neonRoles.map((r: any) => ({
        role_id: r.role_id,
        role_code: r.role_code,
        role_name: r.role_name,
        territory_type: r.territory_type,
        territory_id: r.territory_id,
      }))
    : legacyUser?.assigned_roles || [];

  // ============================================
  // STEP 5: Crea sessione JWT sul backend (cookie app_session_id)
  // Senza questo cookie, tutte le protectedProcedure tRPC falliscono con 401.
  // ============================================
  await createFirebaseSession(idToken);

  // ============================================
  // STEP 6: Costruisci il MioHubUser con tutti i dati
  // ============================================

  // Determina ruolo effettivo: admin > business (ha impresa) > Firebase > citizen
  let effectiveRole: UserRole;
  if (isAdmin) {
    effectiveRole = 'pa';
  } else if (hasImpresa) {
    effectiveRole = 'business';
  } else {
    effectiveRole = backendSyncData?.role || role;
  }

  const miohubUser: MioHubUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    provider,
    role: effectiveRole,
    fiscalCode: backendSyncData?.fiscalCode || undefined,
    verified: firebaseUser.emailVerified,
    // Dati dal DB legacy (orchestratore) - questi sono i dati critici
    miohubId: legacyUser?.id || backendSyncData?.id || 0,
    impresaId: legacyUser?.impresa_id || undefined,
    walletBalance: legacyUser?.wallet_balance || 0,
    assignedRoles: mergedRoles,
    openId: legacyUser?.openId || undefined,
    permissions: backendSyncData?.permissions || [],
    isSuperAdmin: isAdmin,
  };

  return miohubUser;
}

// ============================================
// HELPER: Build legacy user object for localStorage
// ============================================

function buildLegacyUser(miohubUser: MioHubUser): Record<string, any> {
  return {
    id: miohubUser.miohubId || 0,
    email: miohubUser.email,
    name: miohubUser.displayName || miohubUser.email,
    base_role: miohubUser.role === 'pa' ? 'admin' : miohubUser.role,
    is_super_admin: miohubUser.isSuperAdmin === true,
    assigned_roles: miohubUser.assignedRoles && miohubUser.assignedRoles.length > 0
      ? miohubUser.assignedRoles
      : [{ role_id: miohubUser.role === 'pa' ? 2 : 13, role_code: miohubUser.role }],
    photoURL: miohubUser.photoURL,
    provider: miohubUser.provider,
    // Campi critici dal DB legacy
    impresa_id: miohubUser.impresaId || null,
    wallet_balance: miohubUser.walletBalance || 0,
    openId: miohubUser.openId || null,
  };
}

// ============================================
// PROVIDER COMPONENT
// ============================================

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FirebaseAuthState>({
    user: null,
    firebaseUser: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  });

  const [selectedRole, setSelectedRole] = useState<UserRole>(() => {
    // Recupera il ruolo salvato dal localStorage
    const saved = localStorage.getItem('miohub_user_role');
    return (saved as UserRole) || 'citizen';
  });

  // Ascolta i cambiamenti di stato Firebase
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const miohubUser = await syncUserWithBackend(firebaseUser, selectedRole);
          setState({
            user: miohubUser,
            firebaseUser,
            loading: false,
            error: null,
            isAuthenticated: true,
          });
          // Salva info utente nel localStorage per accesso rapido
          localStorage.setItem('miohub_firebase_user', JSON.stringify(miohubUser));
          
          // BRIDGE: Popola anche le chiavi legacy usate da HomePage, PermissionsContext,
          // WalletPage, AnagraficaPage, WalletImpresaPage, SecurityTab, ecc.
          const legacyUser = buildLegacyUser(miohubUser);
          localStorage.setItem('user', JSON.stringify(legacyUser));
          
          // Usa il Firebase ID Token come token legacy
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('token', idToken);
          localStorage.setItem('auth_token', idToken);
          
          // Dispatch storage event per notificare HomePage e altri componenti
          window.dispatchEvent(new Event('storage'));
          
          console.warn(`[FirebaseAuth] Bridge completato: id=${miohubUser.miohubId}, impresa_id=${miohubUser.impresaId}, wallet=${miohubUser.walletBalance}`);
        } catch (err) {
          console.error('[FirebaseAuth] Errore sync utente:', err);
          setState({
            user: null,
            firebaseUser: null,
            loading: false,
            error: 'Errore durante la sincronizzazione dell\'utente',
            isAuthenticated: false,
          });
        }
      } else {
        setState({
          user: null,
          firebaseUser: null,
          loading: false,
          error: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('miohub_firebase_user');
        // BRIDGE: Rimuovi anche le chiavi legacy al logout
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('permissions');
        // Dispatch storage event per notificare HomePage
        window.dispatchEvent(new Event('storage'));
      }
    });

    return () => unsubscribe();
  }, [selectedRole]);

  // Gestisci redirect result (per quando popup è bloccato)
  useEffect(() => {
    handleRedirectResult().catch((err) => {
      if (err) {
        console.error('[FirebaseAuth] Redirect result error:', err);
      }
    });
  }, []);

  // ============================================
  // AUTH METHODS
  // ============================================

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await loginWithEmail(email, password);
      // onAuthStateChanged gestirà il resto
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error);
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await registerWithEmail(email, password, name);
      // onAuthStateChanged gestirà il resto
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error);
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  }, []);

  const signInWithGoogleHandler = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await loginWithGoogle();
      // onAuthStateChanged gestirà il resto
    } catch (error: any) {
      if (error.message === 'REDIRECT_INITIATED') {
        // Redirect in corso, non mostrare errore
        return;
      }
      const message = getFirebaseErrorMessage(error);
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  }, []);

  const signInWithAppleHandler = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await loginWithApple();
      // onAuthStateChanged gestirà il resto
    } catch (error: any) {
      if (error.message === 'REDIRECT_INITIATED') {
        return;
      }
      const message = getFirebaseErrorMessage(error);
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw new Error(message);
    }
  }, []);

  const logoutHandler = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      await firebaseLogout();
      localStorage.removeItem('miohub_firebase_user');
      localStorage.removeItem('miohub_user_role');
      // BRIDGE: Rimuovi anche le chiavi legacy
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('permissions');
      // Dispatch storage event
      window.dispatchEvent(new Event('storage'));
      // onAuthStateChanged gestirà il reset dello stato
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error);
      setState(prev => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    try {
      await resetPassword(email);
    } catch (error: any) {
      const message = getFirebaseErrorMessage(error);
      throw new Error(message);
    }
  }, []);

  const getToken = useCallback(async () => {
    return getIdToken(false);
  }, []);

  const setUserRole = useCallback((role: UserRole) => {
    setSelectedRole(role);
    localStorage.setItem('miohub_user_role', role);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: FirebaseAuthContextType = {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle: signInWithGoogleHandler,
    signInWithApple: signInWithAppleHandler,
    logout: logoutHandler,
    sendResetEmail,
    getToken,
    setUserRole,
    clearError,
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useFirebaseAuth(): FirebaseAuthContextType {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth deve essere usato dentro FirebaseAuthProvider');
  }
  return context;
}
