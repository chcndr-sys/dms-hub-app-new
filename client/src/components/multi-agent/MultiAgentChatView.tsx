import React, { useEffect, useRef } from 'react';
import { Brain, Wrench, Calculator, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Tipi
export type AgentType = 'gptdev' | 'manus' | 'abacus' | 'zapier';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_name: string;
  sender?: string;  // 🔥 FIX: Aggiunto campo sender per distinguere MIO da Utente
  created_at: string;
}

export interface MultiAgentChatViewProps {
  gptdevMessages: AgentMessage[];
  manusMessages: AgentMessage[];
  abacusMessages: AgentMessage[];
  zapierMessages: AgentMessage[];
  gptdevLoading?: boolean;
  manusLoading?: boolean;
  abacusLoading?: boolean;
  zapierLoading?: boolean;
}

// Configurazione agenti
const agentConfig = {
  gptdev: {
    name: 'GPT Developer',
    subtitle: 'Sviluppatore AI',
    icon: Brain,
    borderColor: 'border-[#6366f1]/30',
    bgColor: 'bg-[#6366f1]/10',
    textColor: 'text-indigo-400',
  },
  manus: {
    name: 'Manus',
    subtitle: 'Operatore Esecutivo',
    icon: Wrench,
    borderColor: 'border-[#3b82f6]/30',
    bgColor: 'bg-[#3b82f6]/10',
    textColor: 'text-blue-400',
  },
  abacus: {
    name: 'Abacus',
    subtitle: 'Analisi Dati',
    icon: Calculator,
    borderColor: 'border-[#10b981]/30',
    bgColor: 'bg-[#10b981]/10',
    textColor: 'text-green-400',
  },
  zapier: {
    name: 'Zapier',
    subtitle: 'Automazioni',
    icon: Zap,
    borderColor: 'border-[#f59e0b]/30',
    bgColor: 'bg-[#f59e0b]/10',
    textColor: 'text-orange-400',
  },
};

// Componente singola card agente (READ-ONLY)
interface AgentCardProps {
  agent: AgentType;
  messages: AgentMessage[];
  loading?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, messages, loading }) => {
  const config = agentConfig[agent];
  const Icon = config.icon;
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ AUTO-SCROLL ABILITATO - Scrolla SOLO il container, mai la pagina
  useEffect(() => {
    if (containerRef.current && messages.length > 0) {
      // Timeout per assicurarsi che il DOM sia aggiornato
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          // Scrolla direttamente il container usando scrollTop
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  return (
    <Card className={`bg-[#0a0f1a] ${config.borderColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.textColor}`} />
            <span className={config.textColor}>{config.name}</span>
          </div>
          <span className="text-xs text-[#e8fbff]/50">{messages.length} msg</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Area messaggi - SOLO LETTURA */}
        <div ref={containerRef} className="h-64 bg-[#0b1220] rounded-lg p-3 overflow-y-scroll space-y-2 multi-agent-chat-container">
          {messages.length === 0 ? (
            <p className="text-[#e8fbff]/50 text-center text-xs">
              {loading ? 'Caricamento...' : 'Nessun messaggio ancora.'}
            </p>
          ) : (
            <>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`p-2 rounded border ${
                    msg.role === 'user' 
                      ? 'bg-[#8b5cf6]/10 border-[#8b5cf6]/30' 
                      : `${config.bgColor} ${config.borderColor}`
                  }`}
                >
                  <div className="text-xs text-[#e8fbff]/50 mb-1">
                    {msg.role === 'user' 
                      ? (msg.sender === 'user' ? 'Tu' : 'MIO')  // 🔥 FIX: Mostra MIO quando orchestrator delega, Tu quando utente invia
                      : config.name
                    }
                  </div>
                  <p className="text-xs text-[#e8fbff] whitespace-pre-wrap">{msg.content}</p>
                  <div className="text-xs text-[#e8fbff]/30 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('it-IT', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Nessun input - READ ONLY */}
        <p className="text-xs text-[#e8fbff]/30 text-center">
          Solo lettura - Chat {config.name}
        </p>
      </CardContent>
    </Card>
  );
};

// Componente principale - Vista 4 agenti READ-ONLY
export const MultiAgentChatView: React.FC<MultiAgentChatViewProps> = ({
  gptdevMessages,
  manusMessages,
  abacusMessages,
  zapierMessages,
  gptdevLoading,
  manusLoading,
  abacusLoading,
  zapierLoading,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgentCard agent="gptdev" messages={gptdevMessages} loading={gptdevLoading} />
        <AgentCard agent="manus" messages={manusMessages} loading={manusLoading} />
        <AgentCard agent="abacus" messages={abacusMessages} loading={abacusLoading} />
        <AgentCard agent="zapier" messages={zapierMessages} loading={zapierLoading} />
      </div>

      <p className="text-xs text-[#e8fbff]/30 text-center">
        Vista 4 Quadranti - Monitora le chat degli agenti specializzati
      </p>
    </div>
  );
};

export default MultiAgentChatView;
