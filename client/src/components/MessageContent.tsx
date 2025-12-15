import React, { useState } from 'react';
import { Play, Check, AlertCircle } from 'lucide-react';

interface MessageContentProps {
  content: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  const [executedBlocks, setExecutedBlocks] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Map<number, string>>(new Map());

  // Rileva blocchi di codice JavaScript che contengono window.sharedWorkspaceAPI
  const detectWorkspaceCode = (text: string): { hasCode: boolean; blocks: { code: string; index: number }[] } => {
    const codeBlockRegex = /```javascript\n([\s\S]*?)```/g;
    const blocks: { code: string; index: number }[] = [];
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const code = match[1];
      if (code.includes('window.sharedWorkspaceAPI')) {
        blocks.push({ code, index });
        index++;
      }
    }

    return { hasCode: blocks.length > 0, blocks };
  };

  const executeCode = (code: string, blockIndex: number) => {
    try {
      // Esegui il codice JavaScript
      eval(code);
      
      // Marca come eseguito
      setExecutedBlocks(prev => new Set(prev).add(blockIndex));
      setErrors(prev => {
        const newErrors = new Map(prev);
        newErrors.delete(blockIndex);
        return newErrors;
      });
    } catch (error) {
      console.error('Errore esecuzione codice lavagna:', error);
      setErrors(prev => new Map(prev).set(blockIndex, error instanceof Error ? error.message : 'Errore sconosciuto'));
    }
  };

  const { hasCode, blocks } = detectWorkspaceCode(content);

  if (!hasCode) {
    // Nessun codice workspace, renderizza normalmente
    return (
      <p className="text-[#e8fbff] text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
        {content}
      </p>
    );
  }

  // Ha codice workspace, renderizza con pulsanti di esecuzione
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const codeBlockRegex = /```javascript\n([\s\S]*?)```/g;
  let match;
  let blockCounter = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const code = match[1];
    const isWorkspaceCode = code.includes('window.sharedWorkspaceAPI');

    // Aggiungi testo prima del blocco
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${match.index}`}>
          {content.substring(lastIndex, match.index)}
        </span>
      );
    }

    if (isWorkspaceCode) {
      const currentBlockIndex = blockCounter;
      const isExecuted = executedBlocks.has(currentBlockIndex);
      const error = errors.get(currentBlockIndex);

      parts.push(
        <div key={`code-${match.index}`} className="my-3 bg-[#0a0f1a] rounded-lg border border-[#8b5cf6]/30 overflow-hidden">
          <div className="bg-[#8b5cf6]/10 px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-[#8b5cf6] font-mono">🎨 Codice Lavagna</span>
            <button
              onClick={() => executeCode(code, currentBlockIndex)}
              disabled={isExecuted}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                isExecuted
                  ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                  : 'bg-[#8b5cf6] text-white hover:bg-[#8b5cf6]/90'
              }`}
            >
              {isExecuted ? (
                <>
                  <Check className="h-3 w-3" />
                  Eseguito
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  Esegui sulla Lavagna
                </>
              )}
            </button>
          </div>
          <pre className="p-3 text-xs text-[#e8fbff]/80 font-mono overflow-x-auto">
            <code>{code}</code>
          </pre>
          {error && (
            <div className="bg-red-500/10 border-t border-red-500/30 px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}
        </div>
      );
      blockCounter++;
    } else {
      // Blocco di codice normale (non workspace)
      parts.push(
        <pre key={`code-${match.index}`} className="my-2 bg-[#0a0f1a] rounded p-3 text-xs text-[#e8fbff]/80 font-mono overflow-x-auto">
          <code>{code}</code>
        </pre>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Aggiungi testo rimanente
  if (lastIndex < content.length) {
    parts.push(
      <span key="text-end">
        {content.substring(lastIndex)}
      </span>
    );
  }

  return (
    <div className="text-[#e8fbff] text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
      {parts}
    </div>
  );
};
