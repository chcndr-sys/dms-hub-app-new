import React, { useState } from 'react';
import { Brain, Wrench, Calculator, Zap, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Tipi
export type AgentType = 'mio' | 'manus' | 'abacus' | 'zapier';
export type ViewMode = 'single' | 'multi';

export interface InternalTrace {
  from: string;
  to: string;
  message: string;
  timestamp: string;
  meta?: any;
}

export interface MultiAgentChatViewProps {
  mode: ViewMode;
  selectedAgent?: AgentType;
  internalTraces: InternalTrace[];
  onSendMessage?: (agent: AgentType, message: string) => void;
}

// Configurazione agenti
const agentConfig = {
  mio: {
    name: 'MIO',
    subtitle: 'GPT-5 Coordinatore',
    icon: Brain,
    color: 'purple',
    borderColor: 'border-[#8b5cf6]/30',
    bgColor: 'bg-[#8b5cf6]/10',
    textColor: 'text-purple-400',
  },
  manus: {
    name: 'Manus',
    subtitle: 'Operatore Esecutivo',
    icon: Wrench,
    color: 'blue',
    borderColor: 'border-[#3b82f6]/30',
    bgColor: 'bg-[#3b82f6]/10',
    textColor: 'text-blue-400',
  },
  abacus: {
    name: 'Abacus',
    subtitle: 'Analisi Dati',
    icon: Calculator,
    color: 'green',
    borderColor: 'border-[#10b981]/30',
    bgColor: 'bg-[#10b981]/10',
    textColor: 'text-green-400',
  },
  zapier: {
    name: 'Zapier',
    subtitle: 'Automazioni',
    icon: Zap,
    color: 'orange',
    borderColor: 'border-[#f59e0b]/30',
    bgColor: 'bg-[#f59e0b]/10',
    textColor: 'text-orange-400',
  },
};

// Componente singola card agente
interface AgentCardProps {
  agent: AgentType;
  traces: InternalTrace[];
  showInput: boolean;
  onSendMessage?: (message: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, traces, showInput, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const config = agentConfig[agent];
  const Icon = config.icon;

  const handleSend = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <Card className={`bg-[#0a0f1a] ${config.borderColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.textColor}`} />
            <span className={config.textColor}>{config.name}</span>
          </div>
          <span className="text-xs text-[#e8fbff]/50">{config.subtitle}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Area messaggi */}
        <div className="h-64 bg-[#0b1220] rounded-lg p-3 overflow-y-auto space-y-2">
          {traces.length === 0 ? (
            <p className="text-[#e8fbff]/50 text-center text-xs">Nessun dialogo interno</p>
          ) : (
            traces.map((trace, idx) => (
              <div key={idx} className={`p-2 rounded ${config.bgColor} border ${config.borderColor}`}>
                <div className="text-xs text-[#e8fbff]/50 mb-1">
                  {trace.from} → {trace.to}
                </div>
                <p className="text-xs text-[#e8fbff]">{trace.message}</p>
                {trace.timestamp && (
                  <div className="text-xs text-[#e8fbff]/30 mt-1">
                    {new Date(trace.timestamp).toLocaleTimeString('it-IT', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input (solo se showInput) */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && showInput) {
                handleSend();
              }
            }}
            placeholder={showInput ? `Messaggio a ${config.name}...` : `Messaggio da ${config.name}...`}
            className={`flex-1 bg-[#0b1220] border ${config.borderColor} rounded px-3 py-1.5 text-sm text-[#e8fbff] placeholder-[#e8fbff]/30 focus:outline-none focus:border-${config.color}-400`}
            disabled={!showInput}
          />
          <Button 
            size="sm" 
            className="bg-[#10b981] hover:bg-[#059669]" 
            disabled={!showInput || !inputValue.trim()}
            onClick={handleSend}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente principale
export const MultiAgentChatView: React.FC<MultiAgentChatViewProps> = ({
  mode,
  selectedAgent = 'mio',
  internalTraces,
  onSendMessage,
}) => {
  // Filtra traces per agente
  const getTracesForAgent = (agent: AgentType): InternalTrace[] => {
    return internalTraces.filter(
      (trace) => trace.from === agent || trace.to === agent
    );
  };

  // Vista 4 agenti
  if (mode === 'multi') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
        {(['mio', 'manus', 'abacus', 'zapier'] as AgentType[]).map((agent) => (
          <AgentCard
            key={agent}
            agent={agent}
            traces={getTracesForAgent(agent)}
            showInput={false}
            onSendMessage={undefined}
          />
        ))}

        <p className="col-span-2 text-xs text-[#e8fbff]/30 text-center mt-2">
          Vista 4 Quadranti - Dialoghi interni MIO ↔ Agenti (read-only)
        </p>
      </div>
    );
  }

  // Vista singola
  return (
    <div className="max-w-2xl mx-auto">
      <AgentCard
        agent={selectedAgent}
        traces={getTracesForAgent(selectedAgent)}
        showInput={true}
        onSendMessage={(message) => {
          if (onSendMessage) {
            onSendMessage(selectedAgent, message);
          }
        }}
      />

      <p className="text-xs text-[#e8fbff]/30 text-center mt-2">
        Vista singola - Chat diretta con {agentConfig[selectedAgent].name}
      </p>
    </div>
  );
};

export default MultiAgentChatView;
