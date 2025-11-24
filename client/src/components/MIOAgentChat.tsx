/**
 * MIO Agent Chat Component
 * 
 * Interfaccia chat per l'orchestratore multi-agente
 * - Chat principale (mode: auto)
 * - Vista 4 agenti (mode: manual)
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface OrchestratorRequest {
  mode: 'auto' | 'manual';
  targetAgent?: 'mio' | 'dev' | 'manus_worker' | 'gemini_arch';
  conversationId: string | null;
  message: string;
  meta?: {
    source: string;
    agentBox?: string;
  };
}

interface OrchestratorError {
  type: 'llm_rate_limit' | 'llm_provider_error' | 'llm_config_error' | 'unknown_error';
  provider?: 'openai' | 'gemini';
  statusCode?: number;
  message: string;
}

interface OrchestratorResponse {
  success: boolean;
  conversationId?: string;
  agent?: string;
  message?: string;
  error?: OrchestratorError;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  agent: string;
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface AgentConfig {
  id: 'mio' | 'dev' | 'manus_worker' | 'gemini_arch';
  name: string;
  icon: string;
  color: string;
  description: string;
}

// ============================================================================
// AGENT CONFIGURATIONS
// ============================================================================

const AGENTS: AgentConfig[] = [
  {
    id: 'mio',
    name: 'MIO',
    icon: '🎯',
    color: 'bg-blue-500',
    description: 'Orchestratore centrale',
  },
  {
    id: 'dev',
    name: 'Dev',
    icon: '💻',
    color: 'bg-green-500',
    description: 'Agente sviluppo',
  },
  {
    id: 'manus_worker',
    name: 'Manus',
    icon: '🔧',
    color: 'bg-orange-500',
    description: 'Worker manuale',
  },
  {
    id: 'gemini_arch',
    name: 'Gemini',
    icon: '🌟',
    color: 'bg-purple-500',
    description: 'Architetto AI',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MIOAgentChat() {
  const [view, setView] = useState<'single' | 'quad'>('single');
  
  // Single chat state
  const [singleMessages, setSingleMessages] = useState<Message[]>([]);
  const [singleInput, setSingleInput] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleConversationId, setSingleConversationId] = useState<string | null>(null);
  const [singleError, setSingleError] = useState<OrchestratorError | null>(null);
  
  // Quad chat state (per agent)
  const [quadMessages, setQuadMessages] = useState<Record<string, Message[]>>({
    mio: [],
    dev: [],
    manus_worker: [],
    gemini_arch: [],
  });
  const [quadInputs, setQuadInputs] = useState<Record<string, string>>({
    mio: '',
    dev: '',
    manus_worker: '',
    gemini_arch: '',
  });
  const [quadLoading, setQuadLoading] = useState<Record<string, boolean>>({
    mio: false,
    dev: false,
    manus_worker: false,
    gemini_arch: false,
  });
  const [quadConversationIds, setQuadConversationIds] = useState<Record<string, string | null>>({
    mio: null,
    dev: null,
    manus_worker: null,
    gemini_arch: null,
  });
  const [quadErrors, setQuadErrors] = useState<Record<string, OrchestratorError | null>>({
    mio: null,
    dev: null,
    manus_worker: null,
    gemini_arch: null,
  });

  const singleChatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    singleChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [singleMessages]);

  // ============================================================================
  // SINGLE CHAT FUNCTIONS
  // ============================================================================

  const sendSingleMessage = async () => {
    if (!singleInput.trim() || singleLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      agent: 'user',
      content: singleInput,
      timestamp: new Date(),
    };

    setSingleMessages((prev) => [...prev, userMessage]);
    setSingleInput('');
    setSingleLoading(true);
    setSingleError(null);

    try {
      const requestBody: OrchestratorRequest = {
        mode: 'auto',
        conversationId: singleConversationId,
        message: singleInput,
        meta: { source: 'dashboard_main' },
      };

      const response = await fetch(`${API_BASE_URL}/api/mihub/orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: OrchestratorResponse = await response.json();

      if (data.success && data.message) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          agent: data.agent || 'unknown',
          content: data.message,
          timestamp: new Date(),
        };

        setSingleMessages((prev) => [...prev, assistantMessage]);
        if (data.conversationId) {
          setSingleConversationId(data.conversationId);
        }
      } else if (data.error) {
        // Gestione errori strutturati (429, 5xx)
        setSingleError(data.error);
        
        // Mostra messaggio errore nella chat
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          agent: 'system',
          content: getErrorMessage(data.error),
          timestamp: new Date(),
          error: true,
        };
        
        setSingleMessages((prev) => [...prev, errorMessage]);
      } else {
        throw new Error('Risposta non valida dal server');
      }
    } catch (err) {
      const networkError: OrchestratorError = {
        type: 'unknown_error',
        message: 'Errore di connessione al server',
      };
      setSingleError(networkError);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        agent: 'system',
        content: 'Errore di connessione al server. Riprova più tardi.',
        timestamp: new Date(),
        error: true,
      };
      
      setSingleMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSingleLoading(false);
    }
  };

  // ============================================================================
  // QUAD CHAT FUNCTIONS
  // ============================================================================

  const sendQuadMessage = async (agentId: AgentConfig['id']) => {
    const input = quadInputs[agentId];
    if (!input.trim() || quadLoading[agentId]) return;

    const userMessage: Message = {
      id: `${agentId}-${Date.now()}`,
      role: 'user',
      agent: 'user',
      content: input,
      timestamp: new Date(),
    };

    setQuadMessages((prev) => ({
      ...prev,
      [agentId]: [...prev[agentId], userMessage],
    }));

    setQuadInputs((prev) => ({ ...prev, [agentId]: '' }));
    setQuadLoading((prev) => ({ ...prev, [agentId]: true }));
    setQuadErrors((prev) => ({ ...prev, [agentId]: null }));

    try {
      const requestBody: OrchestratorRequest = {
        mode: 'manual',
        targetAgent: agentId,
        conversationId: quadConversationIds[agentId],
        message: input,
        meta: { source: 'dashboard_quad', agentBox: agentId },
      };

      const response = await fetch(`${API_BASE_URL}/api/mihub/orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data: OrchestratorResponse = await response.json();

      if (data.success && data.message) {
        const assistantMessage: Message = {
          id: `${agentId}-${Date.now() + 1}`,
          role: 'assistant',
          agent: data.agent || agentId,
          content: data.message,
          timestamp: new Date(),
        };

        setQuadMessages((prev) => ({
          ...prev,
          [agentId]: [...prev[agentId], assistantMessage],
        }));

        if (data.conversationId) {
          setQuadConversationIds((prev) => ({
            ...prev,
            [agentId]: data.conversationId!,
          }));
        }
      } else if (data.error) {
        setQuadErrors((prev) => ({ ...prev, [agentId]: data.error! }));
        
        const errorMessage: Message = {
          id: `${agentId}-${Date.now() + 1}`,
          role: 'assistant',
          agent: 'system',
          content: getErrorMessage(data.error),
          timestamp: new Date(),
          error: true,
        };
        
        setQuadMessages((prev) => ({
          ...prev,
          [agentId]: [...prev[agentId], errorMessage],
        }));
      } else {
        throw new Error('Risposta non valida dal server');
      }
    } catch (err) {
      const networkError: OrchestratorError = {
        type: 'unknown_error',
        message: 'Errore di connessione',
      };
      setQuadErrors((prev) => ({ ...prev, [agentId]: networkError }));
      
      const errorMessage: Message = {
        id: `${agentId}-${Date.now() + 1}`,
        role: 'assistant',
        agent: 'system',
        content: 'Errore di connessione. Riprova.',
        timestamp: new Date(),
        error: true,
      };
      
      setQuadMessages((prev) => ({
        ...prev,
        [agentId]: [...prev[agentId], errorMessage],
      }));
    } finally {
      setQuadLoading((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getErrorMessage = (error: OrchestratorError): string => {
    switch (error.type) {
      case 'llm_rate_limit':
        return `⚠️ Limite richieste raggiunto per ${error.provider || 'il modello'}. Riprova tra qualche secondo.`;
      case 'llm_provider_error':
        return `⚠️ Errore temporaneo del provider ${error.provider || 'LLM'}. Riprova più tardi.`;
      case 'llm_config_error':
        return '⚠️ Configurazione LLM mancante. Contatta l\'amministratore.';
      default:
        return `⚠️ ${error.message || 'Errore sconosciuto'}`;
    }
  };

  // ============================================================================
  // RENDER: SINGLE CHAT VIEW
  // ============================================================================

  const renderSingleChat = () => (
    <div className="flex flex-col h-full">
      {/* Error Banner */}
      {singleError && (
        <div className="m-4 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200 font-medium">
              {singleError.type === 'llm_rate_limit'
                ? 'Limite richieste raggiunto'
                : singleError.type === 'llm_provider_error'
                ? 'Errore provider LLM'
                : 'Errore'}
            </p>
            <p className="text-red-300 text-sm mt-1">{singleError.message}</p>
            {singleError.provider && (
              <p className="text-red-400 text-xs mt-1">
                Provider: {singleError.provider}
              </p>
            )}
          </div>
          <button
            onClick={() => setSingleError(null)}
            className="text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {singleMessages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <p className="text-lg font-medium">Benvenuto in MIO Agent</p>
            <p className="text-sm mt-2">
              Inizia una conversazione con l'orchestratore multi-agente
            </p>
          </div>
        )}

        {singleMessages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className={`w-8 h-8 rounded-full ${message.error ? 'bg-red-500' : 'bg-blue-500'} flex items-center justify-center flex-shrink-0`}>
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.error
                  ? 'bg-red-900/50 border border-red-700 text-red-200'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {message.role === 'assistant' && !message.error && (
                <p className="text-xs text-gray-400 mb-1">
                  Agente: {message.agent}
                </p>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">U</span>
              </div>
            )}
          </div>
        ))}

        {singleLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={singleChatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={singleInput}
            onChange={(e) => setSingleInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendSingleMessage()}
            placeholder="Scrivi un messaggio..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={singleLoading}
          />
          <button
            onClick={sendSingleMessage}
            disabled={singleLoading || !singleInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
          >
            <Send className="w-5 h-5" />
            Invia
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: QUAD CHAT VIEW
  // ============================================================================

  const renderQuadChat = () => (
    <div className="grid grid-cols-2 gap-4 h-full p-4">
      {AGENTS.map((agent) => (
        <div key={agent.id} className="flex flex-col bg-gray-800 rounded-lg overflow-hidden">
          {/* Agent Header */}
          <div className={`${agent.color} p-3 flex items-center gap-2`}>
            <span className="text-2xl">{agent.icon}</span>
            <div className="flex-1">
              <h3 className="text-white font-bold">{agent.name}</h3>
              <p className="text-white/80 text-xs">{agent.description}</p>
            </div>
          </div>

          {/* Error Banner (per agent) */}
          {quadErrors[agent.id] && (
            <div className="m-2 p-2 bg-red-900/50 border border-red-700 rounded text-xs">
              <p className="text-red-200">{quadErrors[agent.id]!.message}</p>
              <button
                onClick={() => setQuadErrors((prev) => ({ ...prev, [agent.id]: null }))}
                className="text-red-400 hover:text-red-300 text-xs mt-1"
              >
                Chiudi
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {quadMessages[agent.id].length === 0 && (
              <p className="text-gray-400 text-sm text-center mt-4">
                Nessun messaggio
              </p>
            )}

            {quadMessages[agent.id].map((message) => (
              <div
                key={message.id}
                className={`text-sm p-2 rounded ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white ml-4'
                    : message.error
                    ? 'bg-red-900/50 border border-red-700 text-red-200 mr-4'
                    : 'bg-gray-700 text-gray-100 mr-4'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}

            {quadLoading[agent.id] && (
              <div className="bg-gray-700 rounded p-2 mr-4">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-2 border-t border-gray-700">
            <div className="flex gap-1">
              <input
                type="text"
                value={quadInputs[agent.id]}
                onChange={(e) =>
                  setQuadInputs((prev) => ({ ...prev, [agent.id]: e.target.value }))
                }
                onKeyPress={(e) => e.key === 'Enter' && sendQuadMessage(agent.id)}
                placeholder="Messaggio..."
                className="flex-1 bg-gray-900 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={quadLoading[agent.id]}
              />
              <button
                onClick={() => sendQuadMessage(agent.id)}
                disabled={quadLoading[agent.id] || !quadInputs[agent.id].trim()}
                className={`${agent.color} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-2 py-1 text-sm transition-opacity`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-700">
        <Bot className="w-6 h-6 text-blue-400" />
        <h2 className="text-xl font-bold text-white">MIO Agent</h2>
        <span className="text-sm text-gray-400 ml-auto mr-4">
          Orchestratore Multi-Agente
        </span>
        <button
          onClick={() => setView(view === 'single' ? 'quad' : 'single')}
          className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-2 flex items-center gap-2 transition-colors"
          title={view === 'single' ? 'Vista 4 agenti' : 'Chat principale'}
        >
          {view === 'single' ? (
            <>
              <Maximize2 className="w-4 h-4" />
              <span className="text-sm">4 Agenti</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-4 h-4" />
              <span className="text-sm">Chat</span>
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {view === 'single' ? renderSingleChat() : renderQuadChat()}
      </div>
    </div>
  );
}
