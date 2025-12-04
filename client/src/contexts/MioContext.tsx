import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// 🔥 TABULA RASA: Context condiviso per MIO (Widget + Dashboard)

export interface MioMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  agentName?: string; // Per supporto multi-agente
  source?: string; // Per tracking
}

interface MioContextValue {
  // Stato
  messages: MioMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Azioni
  sendMessage: (text: string, meta?: Record<string, any>) => Promise<void>;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
}

const MioContext = createContext<MioContextValue | undefined>(undefined);

export function MioProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<MioMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ♾️ CHAT ETERNA: Carica conversation_id esistente al mount
  useEffect(() => {
    const loadHistory = async () => {
      // 1. Cerca un ID esistente nel localStorage
      const storedId = localStorage.getItem('mihub_global_conversation_id');
      
      if (!storedId) {
        // Nessun ID salvato - prima volta
        // NON generare UUID qui! Il backend lo creerà alla prima chiamata
        console.log('♾️ [MioContext Chat Eterna] Nessun conversation_id, sarà creato dal backend');
        return;
      }

      // 2. Valida UUID v4
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storedId);
      if (!isValidUUID) {
        console.warn('♾️ [MioContext] UUID non valido, rimuovo:', storedId);
        localStorage.removeItem('mihub_global_conversation_id');
        return;
      }

      // 3. Usa l'ID esistente
      console.log('♾️ [MioContext Chat Eterna] Conversation_id esistente caricato:', storedId);
      setConversationId(storedId);

      // 4. Carica cronologia dal backend

      try {
        const params = new URLSearchParams({
          conversation_id: storedId,
          agent_name: 'mio',
          limit: '200',
        });
        
        const response = await fetch(`/api/mio/agent-logs?${params.toString()}`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.logs && data.logs.length > 0) {
          // Converti formato backend → MioMessage
          const loadedMessages: MioMessage[] = data.logs.map((log: any) => ({
            id: log.id,
            role: log.role as 'user' | 'assistant' | 'system',
            content: log.message || log.content || '',
            createdAt: log.created_at,
            agentName: log.agent_name,
          }));
          
          setMessages(loadedMessages);
          setConversationId(storedId);
          console.log('🔥 [MioContext] Cronologia caricata:', loadedMessages.length, 'messaggi');
        }
      } catch (err) {
        console.error('🔥 [MioContext] Errore caricamento cronologia:', err);
      }
    };

    loadHistory();
  }, []);

  // ♾️ CHAT ETERNA: Salva conversationId in localStorage quando cambia
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('mihub_global_conversation_id', conversationId);
    }
  }, [conversationId]);

  // 🔥 TABULA RASA: Funzione sendMessage condivisa
  const sendMessage = useCallback(async (text: string, meta: Record<string, any> = {}) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    // Push ottimistico
    const userMsg: MioMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      console.log('🔥 [MioContext TABULA RASA] Inizio chiamata diretta...');
      console.log('🔥 [MioContext TABULA RASA] ConversationId:', conversationId);
      
      const response = await fetch("https://orchestratore.mio-hub.me/api/mihub/orchestrator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "auto",
          message: text,
          conversationId: conversationId, // Usa conversationId esistente o null per nuova
          meta: { ...meta, source: meta.source || "mio_context" }
        })
      });

      console.log('🔥 [MioContext TABULA RASA] Status Response:', response.status);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server ha risposto ${response.status}: ${errText}`);
      }

      const data = await response.json();
      console.log('🔥 [MioContext TABULA RASA] Dati ricevuti:', data);

      // Aggiorna conversationId se nuovo
      if (data.conversationId && data.conversationId !== conversationId) {
        console.log('🔥 [MioContext TABULA RASA] Nuovo conversationId:', data.conversationId);
        setConversationId(data.conversationId);
      }

      // Aggiungi la risposta
      const aiMsg: MioMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || data.reply || data.response || "Risposta vuota",
        createdAt: new Date().toISOString(),
        agentName: data.agent || data.agentName || 'mio',
        source: data.source,
      };
      
      setMessages(prev => [...prev, aiMsg]);
      console.log('🔥 [MioContext TABULA RASA] SUCCESS! ✅');

    } catch (err: any) {
      console.error('🔥 [MioContext TABULA RASA] ERROR:', err);
      setError(err.message);
      
      // Messaggio di errore
      const errorMsg: MioMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `🔥 TABULA RASA ERROR: ${err.message}`,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  const value: MioContextValue = {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    setConversationId,
  };

  return (
    <MioContext.Provider value={value}>
      {children}
    </MioContext.Provider>
  );
}

// Hook per usare il context
export function useMio() {
  const context = useContext(MioContext);
  if (context === undefined) {
    throw new Error('useMio must be used within a MioProvider');
  }
  return context;
}
