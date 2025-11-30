/**
 * Hook per persistenza conversazione
 * 
 * Salva e ripristina conversation_id in localStorage
 * per mantenere la cronologia chat dopo refresh
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mio_conversation_id';

export interface ConversationPersistence {
  conversationId: string | null;
  setConversationId: (id: string) => void;
  clearConversation: () => void;
}

/**
 * Hook per gestire la persistenza del conversation_id
 */
export function useConversationPersistence(): ConversationPersistence {
  const [conversationId, setConversationIdState] = useState<string | null>(null);

  // Carica o genera conversation_id al mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setConversationIdState(stored);
      console.log('[Persistence] Restored conversation_id:', stored);
    } else {
      // Genera nuovo conversationId client-side
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(STORAGE_KEY, newId);
      setConversationIdState(newId);
      console.log('[Persistence] Generated new conversation_id:', newId);
    }
  }, []);

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
