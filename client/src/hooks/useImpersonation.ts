/**
 * Hook per gestire la modalità impersonificazione
 * Legge i parametri dall'URL e li salva in sessionStorage per persistenza tra pagine
 * 
 * SUPPORTA:
 * - Impersonificazione COMUNE: ?comune_id=X&comune_nome=Y&impersonate=true
 * - Impersonificazione ASSOCIAZIONE: ?associazione_id=X&associazione_nome=Y&impersonate=true&role=associazione
 * 
 * IMPORTANTE: Usa sessionStorage per mantenere l'impersonificazione quando si naviga
 * a nuove pagine (es. da dashboard a nuovo-verbale)
 * 
 * @version 2.0.0 - Aggiunto supporto associazioni
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'miohub_impersonation';

export type EntityType = 'comune' | 'associazione' | null;

export interface ImpersonationState {
  isImpersonating: boolean;
  comuneId: string | null;
  comuneNome: string | null;
  associazioneId: string | null;
  associazioneNome: string | null;
  userEmail: string | null;
  entityType: EntityType;
}

export interface UseImpersonationReturn extends ImpersonationState {
  // Helper per aggiungere comune_id alle URL
  addComuneIdToUrl: (url: string) => string;
  // Helper per aggiungere comune_id ai parametri fetch
  getFetchOptions: () => { headers?: Record<string, string> };
  // Helper per terminare l'impersonificazione
  endImpersonation: () => void;
  // Nome entità impersonificata (comune o associazione)
  entityName: string | null;
  // ID entità impersonificata
  entityId: string | null;
}

// Funzione per salvare in sessionStorage
function saveToStorage(state: ImpersonationState): void {
  try {
    if (state.isImpersonating) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[Impersonation] Errore salvataggio sessionStorage:', e);
  }
}

// Funzione per leggere da sessionStorage
function loadFromStorage(): ImpersonationState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[Impersonation] Errore lettura sessionStorage:', e);
  }
  return null;
}

// Funzione per leggere i parametri dall'URL
function getParamsFromUrl(): ImpersonationState {
  const params = new URLSearchParams(window.location.search);
  const isImpersonating = params.get('impersonate') === 'true';
  const comuneId = params.get('comune_id');
  const comuneNome = params.get('comune_nome');
  const associazioneId = params.get('associazione_id');
  const associazioneNome = params.get('associazione_nome');
  const role = params.get('role');

  // Determina il tipo di entità
  let entityType: EntityType = null;
  if (isImpersonating) {
    if (associazioneId || role === 'associazione') {
      entityType = 'associazione';
    } else if (comuneId) {
      entityType = 'comune';
    }
  }

  return {
    isImpersonating,
    comuneId,
    comuneNome,
    associazioneId,
    associazioneNome,
    userEmail: params.get('user_email'),
    entityType
  };
}

// Funzione per ottenere lo stato combinato (URL ha priorità, poi sessionStorage)
function getCombinedState(): ImpersonationState {
  const urlState = getParamsFromUrl();
  
  // Se l'URL ha i parametri di impersonificazione, usali e salvali
  if (urlState.isImpersonating && (urlState.comuneId || urlState.associazioneId)) {
    saveToStorage(urlState);
    return urlState;
  }
  
  // Altrimenti, prova a leggere da sessionStorage
  const storedState = loadFromStorage();
  if (storedState && storedState.isImpersonating && (storedState.comuneId || storedState.associazioneId)) {
    return storedState;
  }
  
  // Nessuna impersonificazione attiva
  return {
    isImpersonating: false,
    comuneId: null,
    comuneNome: null,
    associazioneId: null,
    associazioneNome: null,
    userEmail: null,
    entityType: null
  };
}

export function useImpersonation(): UseImpersonationReturn {
  const [state, setState] = useState<ImpersonationState>(getCombinedState);

  // Aggiorna lo state quando cambia l'URL o al mount
  useEffect(() => {
    const handleUrlChange = () => {
      const newState = getCombinedState();
      setState(newState);
    };

    // Ascolta cambiamenti di popstate (navigazione browser)
    window.addEventListener('popstate', handleUrlChange);
    
    // Ascolta storage events (per sincronizzare tra tab)
    window.addEventListener('storage', handleUrlChange);
    
    // Aggiorna immediatamente
    handleUrlChange();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('storage', handleUrlChange);
    };
  }, []);

  // Helper per aggiungere comune_id alle URL delle API
  const addComuneIdToUrl = useCallback((url: string): string => {
    // Prima controlla URL, poi sessionStorage
    const currentState = getCombinedState();
    
    if (!currentState.isImpersonating || !currentState.comuneId) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}comune_id=${currentState.comuneId}`;
  }, []);

  // Helper per opzioni fetch
  const getFetchOptions = useCallback(() => {
    const currentState = getCombinedState();
    
    if (!currentState.isImpersonating) {
      return {};
    }

    const headers: Record<string, string> = {};
    if (currentState.comuneId) {
      headers['X-Comune-Id'] = currentState.comuneId;
    }
    if (currentState.associazioneId) {
      headers['X-Associazione-Id'] = currentState.associazioneId;
    }

    return Object.keys(headers).length > 0 ? { headers } : {};
  }, []);

  // Helper per terminare l'impersonificazione
  const endImpersonation = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState({
      isImpersonating: false,
      comuneId: null,
      comuneNome: null,
      associazioneId: null,
      associazioneNome: null,
      userEmail: null,
      entityType: null
    });
    // Rimuovi i parametri dall'URL
    const url = new URL(window.location.href);
    url.searchParams.delete('impersonate');
    url.searchParams.delete('comune_id');
    url.searchParams.delete('comune_nome');
    url.searchParams.delete('associazione_id');
    url.searchParams.delete('associazione_nome');
    url.searchParams.delete('user_email');
    url.searchParams.delete('role');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Calcola nome e ID entità
  const entityName = state.entityType === 'associazione'
    ? state.associazioneNome
    : state.entityType === 'comune'
    ? state.comuneNome
    : null;

  const entityId = state.entityType === 'associazione'
    ? state.associazioneId
    : state.entityType === 'comune'
    ? state.comuneId
    : null;

  return {
    ...state,
    addComuneIdToUrl,
    getFetchOptions,
    endImpersonation,
    entityName,
    entityId
  };
}

// Funzione standalone per uso fuori dai componenti React
export function getImpersonationParams(): ImpersonationState {
  return getCombinedState();
}

// Helper standalone per aggiungere comune_id alle URL
export function addComuneIdToUrl(url: string): string {
  const { isImpersonating, comuneId } = getCombinedState();
  
  if (!isImpersonating || !comuneId) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}comune_id=${comuneId}`;
}

// Helper per terminare l'impersonificazione (standalone)
export function endImpersonation(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  const url = new URL(window.location.href);
  url.searchParams.delete('impersonate');
  url.searchParams.delete('comune_id');
  url.searchParams.delete('comune_nome');
  url.searchParams.delete('associazione_id');
  url.searchParams.delete('associazione_nome');
  url.searchParams.delete('user_email');
  url.searchParams.delete('role');
  window.history.replaceState({}, '', url.toString());
}

export default useImpersonation;
