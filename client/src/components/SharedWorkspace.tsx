import { useState, useRef, useCallback, useEffect } from 'react';
import { Tldraw, TLEditorComponents, TLUiOverrides, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Maximize2, Minimize2, Save, Download } from 'lucide-react';

interface SharedWorkspaceProps {
  conversationId?: string;
  onSave?: (snapshot: any) => void;
}

export function SharedWorkspace({ conversationId, onSave }: SharedWorkspaceProps) {
  // 🔥 Genera un ID di default se conversationId è mancante
  const effectiveConversationId = conversationId || 'default-workspace';
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const autoSaveIntervalRef = useRef<number | undefined>();

  // Memoizza loadWorkspaceState per evitare re-render
  const loadWorkspaceState = useCallback(async () => {
    try {
      console.log('[SharedWorkspace] Loading workspace for conversationId:', effectiveConversationId);
      const response = await fetch(`https://api.mio-hub.me/api/workspace/load?conversationId=${effectiveConversationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.snapshot && editorRef.current) {
          // Carica lo snapshot nel editor
          editorRef.current.store.loadSnapshot(data.snapshot);
          console.log('[SharedWorkspace] Snapshot loaded successfully');
        }
      } else {
        console.log('[SharedWorkspace] No saved workspace found');
      }
    } catch (error) {
      console.error('[SharedWorkspace] Failed to load state:', error);
    }
  }, [effectiveConversationId]);

  // Memoizza handleAutoSave per evitare re-render
  const handleAutoSave = useCallback(async () => {
    if (!editorRef.current) return;

    try {
      setIsSaving(true);
      const snapshot = editorRef.current.store.getSnapshot();
      
      console.log('[SharedWorkspace] Saving workspace for conversationId:', effectiveConversationId);
      const response = await fetch('https://api.mio-hub.me/api/workspace/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: effectiveConversationId,
          snapshot,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        onSave?.(snapshot);
        console.log('[SharedWorkspace] Workspace saved successfully');
      } else {
        console.error('[SharedWorkspace] Save failed with status:', response.status);
      }
    } catch (error) {
      console.error('[SharedWorkspace] Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [effectiveConversationId, onSave]);

  // Auto-save ogni 10 secondi
  useEffect(() => {
    console.log('[SharedWorkspace] Initialized with conversationId:', effectiveConversationId);
    
    autoSaveIntervalRef.current = window.setInterval(() => {
      handleAutoSave();
    }, 10000);

    return () => {
      if (autoSaveIntervalRef.current) {
        window.clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [effectiveConversationId, handleAutoSave]);

  // Carica stato salvato al mount
  useEffect(() => {
    loadWorkspaceState();
  }, [effectiveConversationId, loadWorkspaceState]);

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
    link.download = `workspace-${effectiveConversationId}-${Date.now()}.json`;
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
    // Possiamo nascondere/modificare elementi UI
  };

  // API viene esposta in onMount callback (vedi Tldraw onMount)

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[600px] bg-[#0a0a0a] rounded-lg border border-[#14b8a6]/20 overflow-hidden"
    >
      {/* Header con pulsanti */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
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
          className="px-3 py-1.5 bg-[#3b82f6]/20 hover:bg-[#3b82f6]/30 border border-[#3b82f6]/30 rounded-lg text-[#3b82f6] text-xs font-medium flex items-center gap-2 transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          Fullscreen
        </button>
      </div>

      {/* Status indicator */}
      {isSaving && (
        <div className="absolute top-2 left-2 z-10 px-3 py-1.5 bg-[#14b8a6]/20 border border-[#14b8a6]/30 rounded-lg text-[#14b8a6] text-xs font-medium">
          Saving...
        </div>
      )}

      {lastSaved && !isSaving && (
        <div className="absolute top-2 left-2 z-10 px-3 py-1.5 bg-[#10b981]/20 border border-[#10b981]/30 rounded-lg text-[#10b981] text-xs font-medium">
          Saved {lastSaved.toLocaleTimeString()}
        </div>
      )}

      {/* tldraw canvas */}
      <Tldraw
        onMount={(editor) => {
          editorRef.current = editor;
          
          // Esponi API globale per gli agenti
          (window as any).sharedWorkspaceAPI = {
            addShape: (shape: any) => {
              if (!editorRef.current) return;
              editorRef.current.createShape(shape);
            },
            getSnapshot: () => {
              if (!editorRef.current) return null;
              return editorRef.current.store.getSnapshot();
            },
            loadSnapshot: (snapshot: any) => {
              if (!editorRef.current) return;
              editorRef.current.store.loadSnapshot(snapshot);
            },
          };
          
          console.log('[SharedWorkspace] API exposed to window.sharedWorkspaceAPI');
          loadWorkspaceState();
        }}
        components={components}
        overrides={overrides}
      />
    </div>
  );
}
