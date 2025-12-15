import { useEffect, useState, useRef, useCallback } from 'react';
import { Tldraw, TLEditorComponents, TLUiOverrides, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Maximize2, Minimize2, Save, Download } from 'lucide-react';

interface SharedWorkspaceProps {
  conversationId?: string;
  onSave?: (snapshot: any) => void;
}

export function SharedWorkspace({ conversationId, onSave }: SharedWorkspaceProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const autoSaveIntervalRef = useRef<number | undefined>();

  // Memoizza loadWorkspaceState per evitare re-render
  const loadWorkspaceState = useCallback(async () => {
    try {
      const response = await fetch(`https://api.mio-hub.me/api/workspace/load?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.snapshot && editorRef.current) {
          // Carica lo snapshot nel editor
          editorRef.current.store.loadSnapshot(data.snapshot);
        }
      }
    } catch (error) {
      console.error('[SharedWorkspace] Failed to load state:', error);
    }
  }, [conversationId]);

  // Memoizza handleAutoSave per evitare re-render
  const handleAutoSave = useCallback(async () => {
    if (!editorRef.current || !conversationId) return;

    try {
      setIsSaving(true);
      const snapshot = editorRef.current.store.getSnapshot();
      
      const response = await fetch('https://api.mio-hub.me/api/workspace/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          snapshot,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        onSave?.(snapshot);
      }
    } catch (error) {
      console.error('[SharedWorkspace] Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [conversationId, onSave]);

  // Auto-save ogni 10 secondi
  useEffect(() => {
    autoSaveIntervalRef.current = window.setInterval(() => {
      handleAutoSave();
    }, 10000);

    return () => {
      if (autoSaveIntervalRef.current) {
        window.clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [handleAutoSave]);

  // Carica stato salvato al mount
  useEffect(() => {
    if (conversationId) {
      loadWorkspaceState();
    }
  }, [conversationId, loadWorkspaceState]);

  const handleManualSave = async () => {
    await handleAutoSave();
  };

  const handleExport = () => {
    if (!editorRef.current) return;

    const snapshot = editorRef.current.store.getSnapshot();
    const dataStr = JSON.stringify(snapshot, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `workspace-${conversationId || 'export'}-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Custom UI components per tldraw
  const components: TLEditorComponents = {
    // Possiamo customizzare toolbar, menu, ecc.
  };

  // Custom overrides per tldraw UI
  const overrides: TLUiOverrides = {
    // Possiamo customizzare azioni, tools, ecc.
  };

  // Hook per accedere all'editor dopo il mount
  const handleMount = (editor: any) => {
    editorRef.current = editor;
    
    // Carica stato salvato se disponibile
    if (conversationId) {
      loadWorkspaceState();
    }
  };

  // 🤖 API per input programmatico da parte degli agenti
  const addShapeFromAgent = (shapeData: any) => {
    if (!editorRef.current) {
      console.warn('[SharedWorkspace] Editor not ready for agent input');
      return;
    }

    try {
      const editor = editorRef.current;
      
      // Aggiungi shape al canvas
      editor.createShape(shapeData);
      
      // Auto-save dopo modifica da agente
      setTimeout(() => handleAutoSave(), 1000);
    } catch (error) {
      console.error('[SharedWorkspace] Failed to add shape from agent:', error);
    }
  };

  // Esponi API per agenti via window (per chiamate esterne)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).sharedWorkspaceAPI = {
        addShape: addShapeFromAgent,
        getSnapshot: () => editorRef.current?.store.getSnapshot(),
        loadSnapshot: (snapshot: any) => editorRef.current?.store.loadSnapshot(snapshot),
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).sharedWorkspaceAPI;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-[#1a2332] border border-[#14b8a6]/30 rounded-lg overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-[9999]' : ''
      }`}
      style={{ height: isFullscreen ? '100vh' : '700px' }}
    >
      {/* Header con controlli */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-[#0b1220]/90 backdrop-blur-sm border-b border-[#14b8a6]/30 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[#e8fbff] font-semibold text-sm">Shared Workspace</h3>
          {isSaving && (
            <span className="text-xs text-[#14b8a6] flex items-center gap-1">
              <div className="w-2 h-2 bg-[#14b8a6] rounded-full animate-pulse" />
              Saving...
            </span>
          )}
          {lastSaved && !isSaving && (
            <span className="text-xs text-[#e8fbff]/50">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSave}
            className="px-3 py-1.5 bg-[#14b8a6]/20 hover:bg-[#14b8a6]/30 border border-[#14b8a6]/30 rounded-lg text-[#14b8a6] text-xs font-medium flex items-center gap-2 transition-colors"
            title="Save Now"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 border border-[#8b5cf6]/30 rounded-lg text-[#8b5cf6] text-xs font-medium flex items-center gap-2 transition-colors"
            title="Export Snapshot"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs font-medium flex items-center gap-2 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                Exit
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                Fullscreen
              </>
            )}
          </button>
        </div>
      </div>

      {/* tldraw Canvas */}
      <div className="absolute inset-0 pt-12" style={{ width: '100%', height: 'calc(100% - 48px)' }}>
        <Tldraw
          onMount={handleMount}
          components={components}
          overrides={overrides}
          inferDarkMode
          autoFocus={false}
        />
      </div>
    </div>
  );
}
