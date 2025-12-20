import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

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
  stopGeneration: () => void;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
}

const MioContext = createContext<MioContextValue | undefined>(undefined);

// 🏝️ ARCHITETTURA 8 ISOLE - ID fisso per Chat MIO principale
const MIO_MAIN_CONVERSATION_ID = 'mio-main';

export function MioProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<MioMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(MIO_MAIN_CONVERSATION_ID);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 🔥 PERSISTENZA: Carica cronologia al mount
  useEffect(() => {
    const loadHistory = async () => {
      // 🔥 SVUOTA messaggi all'inizio per evitare duplicati al refresh
      setMessages([]);
      
      // 🏝️ USA SEMPRE mio-main per la chat principale
      setConversationId(MIO_MAIN_CONVERSATION_ID);

      try {
        // 🚀 TUBO DRITTO - Connessione diretta database → frontend
        console.log('🔥 [MioContext] Caricamento messaggi da:', MIO_MAIN_CONVERSATION_ID);
        const response = await fetch(`/api/mihub/get-messages?conversation_id=${MIO_MAIN_CONVERSATION_ID}&limit=500`);
        if (!response.ok) {
          console.error('🔥 [MioContext] Errore API:', response.status);
          return;
        }
        
        const data = await response.json();
        const rawMessages = data.messages || data.logs || [];
        if (rawMessages.length > 0) {
          // Converti formato backend → MioMessage
          const loadedMessages: MioMessage[] = rawMessages.map((log: any) => ({
            id: log.id,
            role: log.role as 'user' | 'assistant' | 'system',
            content: log.message || log.content || '',
            createdAt: log.created_at,
            agentName: log.agent_name || log.agent || log.sender,
          }));
          
          setMessages(loadedMessages);
          console.log('🔥 [MioContext] Cronologia caricata:', loadedMessages.length, 'messaggi');
        }
      } catch (err) {
        console.error('🔥 [MioContext] Errore caricamento cronologia:', err);
      }
    };

    loadHistory();
  }, []);

  // 🔥 TABULA RASA: Funzione sendMessage condivisa
  const sendMessage = useCallback(async (text: string, meta: Record<string, any> = {}) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    // Push ottimistico con ID temporaneo
    const tempUserId = `temp-user-${Date.now()}`;
    const userMsg: MioMessage = {
      id: tempUserId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      console.log('🔥 [MioContext] Invio messaggio a MIO...');
      console.log('🔥 [MioContext] ConversationId:', MIO_MAIN_CONVERSATION_ID);
      
      // Crea nuovo AbortController per questa richiesta
      abortControllerRef.current = new AbortController();
      
      const response = await fetch("/api/mihub/orchestrator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "auto",
          message: text,
          conversationId: MIO_MAIN_CONVERSATION_ID, // 🏝️ USA SEMPRE mio-main
          meta: { ...meta, source: meta.source || "mio_context" }
        }),
        signal: abortControllerRef.current.signal
      });

      console.log('🔥 [MioContext] Status Response:', response.status);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server ha risposto ${response.status}: ${errText}`);
      }

      const data = await response.json();
      console.log('🔥 [MioContext] Dati ricevuti:', data);

      // 🔥 RECONCILIAZIONE: Sostituisci messaggio temporaneo con quello reale dal server
      setMessages(prev => {
        // Rimuovi il messaggio temporaneo
        const withoutTemp = prev.filter(m => m.id !== tempUserId);
        
        // Aggiungi messaggio utente reale
        const userMsgConfirmed: MioMessage = {
          ...userMsg,
          id: data.userMessageId || tempUserId,
        };
        
        // Aggiungi la risposta
        const aiMsg: MioMessage = {
          id: data.assistantMessageId || crypto.randomUUID(),
          role: 'assistant',
          content: data.message || data.reply || data.response || "Risposta vuota",
          createdAt: new Date().toISOString(),
          agentName: data.agent || data.agentName || 'mio',
          source: data.source,
        };
        
        return [...withoutTemp, userMsgConfirmed, aiMsg];
      });
      console.log('🔥 [MioContext] SUCCESS! ✅');

      // 🔥 POLLING TEMPORANEO: Ricarica messaggi dopo 3s per catturare eventuali risposte aggiuntive
      setTimeout(async () => {
        try {
          console.log('🔄 [MioContext] Polling post-invio per nuove risposte...');
          const response = await fetch(`/api/mihub/get-messages?conversation_id=${MIO_MAIN_CONVERSATION_ID}&limit=500`);
          if (response.ok) {
            const pollData = await response.json();
            const rawMessages = pollData.messages || pollData.logs || [];
            if (rawMessages.length > 0) {
              const loadedMessages: MioMessage[] = rawMessages.map((log: any) => ({
                id: log.id,
                role: log.role as 'user' | 'assistant' | 'system',
                content: log.message || log.content || '',
                createdAt: log.created_at,
                agentName: log.agent_name || log.agent || log.sender,
              }));
              setMessages(loadedMessages);
              console.log('✅ [MioContext] Messaggi aggiornati dal polling:', loadedMessages.length);
            }
          }
        } catch (err) {
          console.error('❌ [MioContext] Errore polling post-invio:', err);
        }
      }, 3000);

    } catch (err: any) {
      console.error('🔥 [MioContext] ERROR:', err);
      
      // Se l'errore è dovuto all'abort, non mostrare errore
      if (err.name === 'AbortError') {
        console.log('🛑 [MioContext] Richiesta interrotta dall\'utente');
        const stopMsg: MioMessage = {
          id: crypto.randomUUID(),
          role: 'system',
          content: '⏸️ Generazione interrotta',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, stopMsg]);
      } else {
        setError(err.message);
        
        // Messaggio di errore
        const errorMsg: MioMessage = {
          id: crypto.randomUUID(),
          role: 'system',
          content: `🔥 ERROR: ${err.message}`,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('🛑 [MioContext] Interruzione generazione...');
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    // 🏝️ NON resettare conversationId - mantieni sempre mio-main
    setError(null);
  }, []);

  const value: MioContextValue = {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    stopGeneration,
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
