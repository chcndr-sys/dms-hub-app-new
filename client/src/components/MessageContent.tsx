import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Code, AlertCircle } from 'lucide-react';

interface MessageContentProps {
  content: string;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  const [autoExecuted, setAutoExecuted] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Map<number, string>>(new Map());
  const [showCode, setShowCode] = useState<Map<number, boolean>>(new Map());
  const hasAutoExecuted = useRef<Set<number>>(new Set());

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
      // Validazione: permetti solo codice che chiama window.sharedWorkspaceAPI
      const trimmed = code.trim();
      if (!trimmed.includes('window.sharedWorkspaceAPI')) {
        throw new Error('Codice non autorizzato: deve usare window.sharedWorkspaceAPI');
      }
      // Usa Function constructor invece di eval() per isolare dallo scope locale
      new Function(trimmed)();

      // Marca come eseguito
      setAutoExecuted(prev => new Set(prev).add(blockIndex));
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

  // AUTO-RUN: Esegui automaticamente i blocchi di codice workspace
  useEffect(() => {
    if (hasCode && blocks.length > 0) {
      // Delay di 500ms per assicurarsi che la lavagna sia pronta
      const timer = setTimeout(() => {
        blocks.forEach(({ code, index }) => {
          // Esegui solo se non è già stato eseguito
          if (!hasAutoExecuted.current.has(index)) {
            executeCode(code, index);
            hasAutoExecuted.current.add(index);
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [hasCode, blocks.length]);

  if (!hasCode) {
    // Nessun codice workspace, renderizza normalmente
    return (
      <p className="text-[#e8fbff] text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
        {content}
      </p>
    );
  }

  // Ha codice workspace, renderizza con badge elegante
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
      const isExecuted = autoExecuted.has(currentBlockIndex);
      const error = errors.get(currentBlockIndex);
      const codeVisible = showCode.get(currentBlockIndex) || false;

      parts.push(
        <div key={`code-${match.index}`} className="my-3">
          {/* Badge elegante */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-full">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-300 font-medium">
              Disegno aggiunto alla lavagna
            </span>
            {/* Pulsante Show Code (opzionale per debug) */}
            <button
              onClick={() => setShowCode(prev => new Map(prev).set(currentBlockIndex, !codeVisible))}
              className="ml-2 p-1 hover:bg-purple-500/20 rounded transition-colors"
              title={codeVisible ? "Nascondi codice" : "Mostra codice"}
            >
              <Code className="h-3 w-3 text-purple-400/60" />
            </button>
          </div>

          {/* Codice (nascosto di default) */}
          {codeVisible && (
            <div className="mt-2 bg-[#0a0f1a] rounded-lg border border-[#8b5cf6]/30 overflow-hidden">
              <div className="bg-[#8b5cf6]/10 px-3 py-2">
                <span className="text-xs text-[#8b5cf6] font-mono">🎨 Codice Lavagna</span>
              </div>
              <pre className="p-3 text-xs text-[#e8fbff]/80 font-mono overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          )}

          {/* Errore (se presente) */}
          {error && (
            <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
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
