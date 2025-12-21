/**
 * Hook per persistenza conversazione
 * 
 * 🔥 IMPORTANTE: Per le chat singole (user-{agent}-direct), l'ID è FISSO
 * e viene passato come storageKey. NON viene mai cambiato.
 * 
 * Il localStorage viene usato SOLO per la chat MIO principale
 * dove l'ID può essere generato dinamicamente.
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
 * @param storageKey - Per chat singole: ID fisso (es. 'user-gptdev-direct')
 *                     Per chat MIO: chiave localStorage (default: 'mio_conversation_id')
 */
export function useConversationPersistence(storageKey?: string): ConversationPersistence {
  
  // 🔥 FIX CRITICO: Se storageKey inizia con 'user-' è una chat singola
  // In questo caso, USA SEMPRE storageKey come ID fisso!
  const isDirectChat = storageKey?.startsWith('user-');
  
  const [conversationId, setConversationIdState] = useState<string | null>(() => {
    // Chat singola: USA SEMPRE l'ID fisso passato come parametro
    if (isDirectChat && storageKey) {
      console.log('[Persistence] Chat singola - usando ID fisso:', storageKey);
      return storageKey;
    }
    
    // Chat MIO principale: leggi dal localStorage
    const STORAGE_KEY = storageKey || DEFAULT_STORAGE_KEY;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      console.log('[Persistence] Chat MIO - ID dal localStorage:', stored);
      return stored;
    }
    
    // Nessun ID salvato
    return null;
  });

  // Log per debug (solo al mount)
  useEffect(() => {
    console.log('[Persistence] Initialized:', { 
      conversationId, 
      storageKey, 
      isDirectChat 
    });
  }, []);

  // Salva conversation_id in localStorage (solo per chat MIO)
  const setConversationId = (id: string) => {
    // Per chat singole, non salvare - l'ID è fisso
    if (isDirectChat) {
      console.log('[Persistence] Chat singola - ID fisso, non salvo:', id);
      return;
    }
    
    const STORAGE_KEY = storageKey || DEFAULT_STORAGE_KEY;
    localStorage.setItem(STORAGE_KEY, id);
    setConversationIdState(id);
    console.log('[Persistence] Saved conversation_id:', id);
  };

  // Cancella conversation_id (solo per chat MIO)
  const clearConversation = () => {
    if (isDirectChat) {
      console.log('[Persistence] Chat singola - non posso cancellare ID fisso');
      return;
    }
    
    const STORAGE_KEY = storageKey || DEFAULT_STORAGE_KEY;
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
