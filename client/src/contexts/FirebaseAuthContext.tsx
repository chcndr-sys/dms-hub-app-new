/**
 * Firebase Authentication Context
 * MioHub - Gestione stato autenticazione globale
 * 
 * Fornisce:
 * - Stato utente Firebase (user, loading, error)
 * - Funzioni di login/logout/register
 * - Sincronizzazione con il backend MioHub (token verification)
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
  // Dati dal backend MioHub
  miohubId?: number;
  permissions?: string[];
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
// HELPER: Sync user with MioHub backend
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

async function syncUserWithBackend(firebaseUser: FirebaseUser, role: UserRole): Promise<MioHubUser> {
  const idToken = await firebaseUser.getIdToken();
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/firebase/sync`, {
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
        provider: firebaseUser.providerData[0]?.providerId || 'email',
        role,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.user) {
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          provider: firebaseUser.providerData[0]?.providerId || 'email',
          role: data.user.role || role,
          fiscalCode: data.user.fiscalCode,
          verified: data.user.verified || false,
          miohubId: data.user.id,
          permissions: data.user.permissions,
        };
      }
    }
  } catch (err) {
    console.warn('[FirebaseAuth] Backend sync fallito, uso dati locali:', err);
  }

  // Fallback: usa i dati Firebase locali
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    provider: firebaseUser.providerData[0]?.providerId || 'email',
    role,
    verified: firebaseUser.emailVerified,
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
          
          // BRIDGE: Popola anche le chiavi legacy usate da HomePage e PermissionsContext
          // Questo garantisce che il sistema di sicurezza ruoli e l'impersonalizzazione funzionino
          const legacyUser = {
            id: miohubUser.miohubId || 0,
            email: miohubUser.email,
            name: miohubUser.displayName || miohubUser.email,
            base_role: miohubUser.role === 'pa' ? 'admin' : miohubUser.role,
            is_super_admin: miohubUser.email === 'chcndr@gmail.com',
            assigned_roles: miohubUser.permissions ? [{ role_id: miohubUser.role === 'pa' ? 2 : 13, role_code: miohubUser.role }] : [],
            photoURL: miohubUser.photoURL,
            provider: miohubUser.provider,
          };
          localStorage.setItem('user', JSON.stringify(legacyUser));
          // Usa il Firebase ID Token come token legacy
          const idToken = await firebaseUser.getIdToken();
          localStorage.setItem('token', idToken);
          localStorage.setItem('auth_token', idToken);
          // Dispatch storage event per notificare HomePage
          window.dispatchEvent(new Event('storage'));
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
