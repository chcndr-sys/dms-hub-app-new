/**
 * ARPA Authentication Client
 * Integrazione con Regione Toscana per SPID/CIE/CNS
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

// Session token in sessionStorage (si cancella alla chiusura del browser, non accessibile da altri tab)
// User info resta in localStorage per persistenza UX
const SESSION_TOKEN_KEY = 'miohub_session_token';
const USER_INFO_KEY = 'miohub_user_info';

// Tipi
export interface User {
  id: number;
  email: string;
  name: string;
  fiscalCode?: string;
  authMethod?: string;
  roles?: Role[];
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  level: number;
}

export interface AuthConfig {
  environment: string;
  client_id: string;
  redirect_uri: string;
  authorization_endpoint: string;
  scopes: string;
  supported_auth_methods: string[];
}

export interface LoginResponse {
  session_token: string;
  user: User;
  return_url: string;
}

// ============================================
// STORAGE HELPERS
// ============================================

export function getSessionToken(): string | null {
  // Migrazione: se il token e' ancora in localStorage, spostalo
  const legacyToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (legacyToken) {
    sessionStorage.setItem(SESSION_TOKEN_KEY, legacyToken);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  // Rimuovi eventuale copia legacy
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function clearSessionToken(): void {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY); // pulizia legacy
  localStorage.removeItem(USER_INFO_KEY);
}

export function getCachedUser(): User | null {
  const cached = localStorage.getItem(USER_INFO_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
}

export function setCachedUser(user: User): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Ottiene la configurazione di autenticazione
 */
export async function getAuthConfig(): Promise<AuthConfig> {
  const response = await fetch(`${API_BASE_URL}/api/auth/config`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Errore nel recupero della configurazione');
  }
  
  return data.data;
}

/**
 * Inizia il flusso di login
 * Restituisce l'URL a cui reindirizzare l'utente
 */
export async function startLogin(returnUrl?: string): Promise<string> {
  const params = new URLSearchParams();
  if (returnUrl) {
    params.set('returnUrl', returnUrl);
  }
  
  const response = await fetch(`${API_BASE_URL}/api/auth/login?${params}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Errore nell\'inizializzazione del login');
  }
  
  // Salva state per verifica al callback
  sessionStorage.setItem('auth_state', data.data.state);
  
  return data.data.auth_url;
}

/**
 * Gestisce il callback OAuth
 * Da chiamare quando l'utente ritorna dal provider
 */
export async function handleCallback(code: string, state: string): Promise<LoginResponse> {
  // Verifica state
  const savedState = sessionStorage.getItem('auth_state');
  if (savedState !== state) {
    throw new Error('State non valido - possibile attacco CSRF');
  }
  sessionStorage.removeItem('auth_state');
  
  const response = await fetch(`${API_BASE_URL}/api/auth/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, state })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Errore durante l\'autenticazione');
  }
  
  // Salva session token e user info
  setSessionToken(data.data.session_token);
  setCachedUser(data.data.user);
  
  return data.data;
}

/**
 * Verifica se l'utente è autenticato
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    return data.success && data.data.valid;
  } catch {
    return false;
  }
}

/**
 * Ottiene le informazioni dell'utente corrente
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getSessionToken();
  if (!token) return null;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      // Token non valido, pulisci
      clearSessionToken();
      return null;
    }
    
    // Aggiorna cache
    setCachedUser(data.data);
    return data.data;
  } catch {
    return null;
  }
}

/**
 * Rinnova il token di sessione
 */
export async function refreshSession(): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_token: token })
    });
    
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

/**
 * Effettua il logout
 */
export async function logout(): Promise<string | null> {
  const token = getSessionToken();
  
  if (token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_token: token })
      });
      
      const data = await response.json();
      
      // Pulisci storage locale
      clearSessionToken();
      
      // Restituisci URL di logout ARPA (opzionale)
      return data.data?.logout_url || null;
    } catch {
      clearSessionToken();
      return null;
    }
  }
  
  clearSessionToken();
  return null;
}

/**
 * Hook per verificare i permessi dell'utente
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user || !user.roles) return false;
  
  // Super admin ha tutti i permessi
  if (user.roles.some(r => r.name === 'super_admin')) return true;
  
  // TODO: Implementare verifica permessi basata su role_permissions
  return true;
}

/**
 * Hook per verificare il livello minimo richiesto
 */
export function hasMinLevel(user: User | null, minLevel: number): boolean {
  if (!user || !user.roles) return false;
  
  return user.roles.some(r => r.level >= minLevel);
}

// ============================================
// REDIRECT HELPERS
// ============================================

/**
 * Reindirizza al login
 */
export function redirectToLogin(returnUrl?: string): void {
  startLogin(returnUrl || window.location.pathname)
    .then(authUrl => {
      window.location.href = authUrl;
    })
    .catch(error => {
      console.error('Errore redirect login:', error);
    });
}

/**
 * Gestisce il logout completo (con redirect a ARPA)
 */
export async function logoutAndRedirect(): Promise<void> {
  const logoutUrl = await logout();
  
  if (logoutUrl) {
    // Redirect a ARPA per logout completo
    window.location.href = logoutUrl;
  } else {
    // Redirect alla home
    window.location.href = '/';
  }
}
