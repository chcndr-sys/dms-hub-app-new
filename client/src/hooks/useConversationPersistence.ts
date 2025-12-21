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
 * 🔥 FIX: Funzione helper per ottenere il valore iniziale SINCRONAMENTE
 * Questo evita il problema del null al primo render
 */
function getInitialConversationId(storageKey?: string): string | null {
  const STORAGE_KEY = storageKey || DEFAULT_STORAGE_KEY;
  
  // Prova a leggere dal localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }
  
  // Se c'è una storageKey specifica (es. 'user-gptdev-direct'), usala come ID fisso
  if (storageKey) {
    localStorage.setItem(STORAGE_KEY, storageKey);
    return storageKey;
  }
  
  // Per il default, ritorna null
  return null;
}

/**
 * Hook per gestire la persistenza del conversation_id
 * @param storageKey - Chiave localStorage opzionale (default: 'mio_conversation_id')
 */
export function useConversationPersistence(storageKey?: string): ConversationPersistence {
  const STORAGE_KEY = storageKey || DEFAULT_STORAGE_KEY;
  
  // 🔥 FIX: Inizializza SINCRONAMENTE con il valore dal localStorage
  // Questo evita il problema del null al primo render che causava
  // il mancato caricamento dei messaggi nelle chat singole
  const [conversationId, setConversationIdState] = useState<string | null>(() => {
    return getInitialConversationId(storageKey);
  });

  // Log per debug (solo al mount)
  useEffect(() => {
    console.log('[Persistence] Initialized with conversationId:', conversationId, 'storageKey:', storageKey);
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
