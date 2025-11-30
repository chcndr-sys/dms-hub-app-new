/**
 * Hook per persistenza conversazione
 * 
 * Salva e ripristina conversation_id in localStorage
 * per mantenere la cronologia chat dopo refresh
 */

import { useState, useEffect } from 'react';

const DEFAULT_STORAGE_KEY = 'mio_conversation_id';

export interface ConversationPersistence {
  conversationId: string | null;
  setConversationId: (id: string) => void;
  clearConversation: () => void;
}

/**
 * Hook per gestire la persistenza del conversation_id
 * @param storageKey - Chiave localStorage opzionale (default: 'mio_conversation_id')
 */
export function useConversationPersistence(storageKey?: string): ConversationPersistence {
  const STORAGE_KEY = storageKey || DEFAULT_STORAGE_KEY;
  const [conversationId, setConversationIdState] = useState<string | null>(null);

  // Carica conversation_id al mount (se esiste)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setConversationIdState(stored);
      console.log('[Persistence] Restored conversation_id:', stored);
    } else {
      // NON generare ID client-side! Il backend lo creerà alla prima chiamata
      setConversationIdState(null);
      console.log('[Persistence] No conversation_id found, will be created by backend');
    }
  }, [STORAGE_KEY]);

  // Salva conversation_id in localStorage
  const setConversationId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setConversationIdState(id);
    console.log('[Persistence] Saved conversation_id:', id);
  };

  // Cancella conversation_id
  const clearConversation = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConversationIdState(null);
    console.log('[Persistence] Cleared conversation_id');
  };

  return {
    conversationId,
    setConversationId,
    clearConversation,
  };
}
