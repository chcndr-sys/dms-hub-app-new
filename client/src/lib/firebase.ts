/**
 * Firebase Configuration & Authentication
 * MioHub - DMS Hub Authentication System
 * 
 * Supporta: Email/Password, Google Sign-In, Apple Sign-In
 * Progetto Firebase: dmshub-auth (dmshub-auth-2975e)
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type Auth,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth';

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBQLKp8jQi7Q19tXQtTYpdgivw-WyhocTg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dmshub-auth-2975e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dmshub-auth-2975e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dmshub-auth-2975e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "793464851990",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:793464851990:web:d6d70e95ac75bedb216f37",
};

// ============================================
// FIREBASE INITIALIZATION
// ============================================

let app: FirebaseApp;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Imposta la lingua italiana per i messaggi Firebase
  auth.languageCode = 'it';
} catch (error) {
  console.error('[Firebase] Errore inizializzazione:', error);
  throw error;
}

// ============================================
// AUTH PROVIDERS
// ============================================

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
// Forza la selezione dell'account Google
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Login con Email e Password
 */
export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Registrazione con Email e Password
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Aggiorna il profilo con il nome
  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName });
  }
  
  return credential;
}

/**
 * Login con Google (popup)
 */
export async function loginWithGoogle(): Promise<UserCredential> {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    // Se il popup è bloccato, prova con redirect
    if (error.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      // Il risultato verrà gestito da getRedirectResult
      throw new Error('REDIRECT_INITIATED');
    }
    throw error;
  }
}

/**
 * Login con Apple (popup)
 */
export async function loginWithApple(): Promise<UserCredential> {
  try {
    return await signInWithPopup(auth, appleProvider);
  } catch (error: any) {
    // Se il popup è bloccato, prova con redirect
    if (error.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, appleProvider);
      throw new Error('REDIRECT_INITIATED');
    }
    throw error;
  }
}

/**
 * Gestisce il risultato del redirect (per Google/Apple quando il popup è bloccato)
 */
export async function handleRedirectResult(): Promise<UserCredential | null> {
  return getRedirectResult(auth);
}

/**
 * Logout
 */
export async function firebaseLogout(): Promise<void> {
  return signOut(auth);
}

/**
 * Reset password via email
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Ottieni il token ID dell'utente corrente (per autenticazione server-side)
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

/**
 * Osserva i cambiamenti dello stato di autenticazione
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Ottieni l'utente corrente
 */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Traduce i codici di errore Firebase in messaggi italiani user-friendly
 */
export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || '';
  
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Indirizzo email non valido',
    'auth/user-disabled': 'Account disabilitato. Contatta il supporto.',
    'auth/user-not-found': 'Nessun account trovato con questa email',
    'auth/wrong-password': 'Password non corretta',
    'auth/email-already-in-use': 'Questa email è già registrata. Prova ad accedere.',
    'auth/weak-password': 'La password deve essere di almeno 6 caratteri',
    'auth/operation-not-allowed': 'Metodo di accesso non abilitato',
    'auth/popup-closed-by-user': 'Finestra di accesso chiusa. Riprova.',
    'auth/popup-blocked': 'Popup bloccato dal browser. Abilita i popup per questo sito.',
    'auth/cancelled-popup-request': 'Operazione annullata',
    'auth/account-exists-with-different-credential': 'Esiste già un account con questa email ma con un metodo di accesso diverso.',
    'auth/network-request-failed': 'Errore di rete. Verifica la connessione internet.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
    'auth/invalid-credential': 'Credenziali non valide. Riprova.',
    'auth/requires-recent-login': 'Per questa operazione è necessario un accesso recente.',
  };
  
  return messages[code] || `Errore di autenticazione: ${error?.message || 'Errore sconosciuto'}`;
}

// ============================================
// EXPORTS
// ============================================

export { auth, app };
export type { FirebaseUser };
