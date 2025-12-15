import { useState, useRef, useCallback, useEffect } from 'react';
import { Tldraw, TLEditorComponents, TLUiOverrides, useEditor, exportToBlob, AssetRecordType } from 'tldraw';
import 'tldraw/tldraw.css';
import { Maximize2, Minimize2, Save, Download, Upload } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveIntervalRef = useRef<number | undefined>();
  const autoReloadIntervalRef = useRef<number | undefined>();

  // Memoizza loadWorkspaceState per evitare re-render
  const loadWorkspaceState = useCallback(async () => {
    try {
      console.log('[SharedWorkspace] Loading workspace for conversationId:', effectiveConversationId);
      const response = await fetch(`https://api.mio-hub.me/api/workspace/load?conversationId=${effectiveConversationId}`);
      if (response.ok) {
        const data = await response.json();
        // Backend restituisce { success, data: { snapshot } }
        if (data.data?.snapshot && editorRef.current) {
          // Carica lo snapshot nel editor
          editorRef.current.store.loadSnapshot(data.data.snapshot);
          console.log('[SharedWorkspace] Snapshot loaded successfully from database');
        } else {
          console.log('[SharedWorkspace] No snapshot found in response');
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

  // Auto-reload ogni 5 secondi per caricare shapes aggiunte dagli agenti
  useEffect(() => {
    autoReloadIntervalRef.current = window.setInterval(() => {
      loadWorkspaceState();
    }, 5000);

    return () => {
      if (autoReloadIntervalRef.current) {
        window.clearInterval(autoReloadIntervalRef.current);
      }
    };
  }, [effectiveConversationId, loadWorkspaceState]);

  const handleManualSave = async () => {
    await handleAutoSave();
  };

  const handleExport = async () => {
    if (!editorRef.current) return;

    try {
      // 1. Seleziona tutte le shape per l'export
      const shapeIds = Array.from(editorRef.current.getCurrentPageShapeIds());
      if (shapeIds.length === 0) {
        alert("La lavagna \u00e8 vuota!");
        return;
      }
      
      // 2. Genera il Blob PNG usando exportToBlob da tldraw
      const blob = await exportToBlob({
        editor: editorRef.current,
        ids: shapeIds,
        format: 'png',
        opts: { background: true },
      });
      
      // 3. Scarica il file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shared-workspace-${new Date().toISOString().slice(0,10)}.png`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      console.log('[SharedWorkspace] Exported as PNG');
    } catch (error) {
      console.error('[SharedWorkspace] Export failed:', error);
      alert("Errore durante l'export dell'immagine.");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;

    // Limite 2MB per non appesantire il DB
    if (file.size > 2 * 1024 * 1024) {
      alert("L'immagine \u00e8 troppo grande (max 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const src = reader.result as string;
      
      // PAUSA AUTO-RELOAD durante upload
      if (autoReloadIntervalRef.current) {
        window.clearInterval(autoReloadIntervalRef.current);
        console.log('[SharedWorkspace] Auto-reload paused for image upload');
      }
      
      // Crea l'asset
      const assetId = AssetRecordType.createId();
      const imageWidth = 200; // Default width
      const imageHeight = 200; // Default height
      
      editorRef.current.createAssets([{
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name: file.name,
          src: src, // Base64
          w: imageWidth,
          h: imageHeight,
          mimeType: file.type,
          isAnimated: false
        },
        meta: {}
      }]);
      
      // Crea la shape che usa l'asset
      editorRef.current.createShape({
        type: 'image',
        x: 100, // Posizione default
        y: 100,
        props: {
          assetId: assetId,
          w: imageWidth,
          h: imageHeight,
        }
      });
      
      console.log('[SharedWorkspace] Image uploaded:', file.name);
      
      // AWAIT salvataggio completo
      await handleAutoSave();
      console.log('[SharedWorkspace] Image saved to database');
      
      // RIPRENDI AUTO-RELOAD dopo salvataggio
      autoReloadIntervalRef.current = window.setInterval(() => {
        loadWorkspaceState();
      }, 5000);
      console.log('[SharedWorkspace] Auto-reload resumed');
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
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
    <div className="w-full space-y-2">
      {/* Header con titolo e pulsanti - FUORI dalla lavagna */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a]/50 rounded-lg border border-[#14b8a6]/20">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[#14b8a6]">Shared Workspace</h3>
          {/* Status indicator */}
          {isSaving && (
            <span className="px-2 py-1 bg-[#14b8a6]/20 border border-[#14b8a6]/30 rounded text-[#14b8a6] text-xs">
              Saving...
            </span>
          )}
          {lastSaved && !isSaving && (
            <span className="px-2 py-1 bg-[#10b981]/20 border border-[#10b981]/30 rounded text-[#10b981] text-xs">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {/* Pulsanti azione */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSave}
            className="px-3 py-1.5 bg-[#14b8a6]/20 hover:bg-[#14b8a6]/30 border border-[#14b8a6]/30 rounded-lg text-[#14b8a6] text-xs font-medium flex items-center gap-2 transition-colors"
            title="Save Now"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            style={{ display: 'none' }}
          />
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 border border-[#8b5cf6]/30 rounded-lg text-[#8b5cf6] text-xs font-medium flex items-center gap-2 transition-colors"
            title="Export Snapshot"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={handleUploadClick}
            className="px-3 py-1.5 bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/30 rounded-lg text-[#10b981] text-xs font-medium flex items-center gap-2 transition-colors"
            title="Upload Image"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
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
      </div>

      {/* Canvas tldraw - SENZA pulsanti sovrapposti */}
      <div 
        ref={containerRef}
        className="relative w-full h-[600px] bg-[#0a0a0a] rounded-lg border border-[#14b8a6]/20 overflow-hidden"
      >
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
            
            // Esponi API globale per gli agenti
            (window as any).sharedWorkspaceAPI = {
              addShape: async (shape: any) => {
                if (!editorRef.current) return;
                editorRef.current.createShape(shape);
                // Salva automaticamente dopo aver aggiunto la forma
                await handleAutoSave();
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
            
            // Gestione upload immagini con Base64
            editor.registerExternalAssetHandler('file', async ({ file }) => {
              // Verifica che sia un'immagine
              if (!file.type.startsWith('image/')) {
                console.warn('[SharedWorkspace] File non supportato:', file.type);
                return null;
              }
              
              // Limite 2MB
              const MAX_SIZE = 2 * 1024 * 1024; // 2MB
              if (file.size > MAX_SIZE) {
                console.error('[SharedWorkspace] Immagine troppo grande (max 2MB):', file.size);
                alert('Immagine troppo grande! Limite: 2MB');
                return null;
              }
              
              // Converti in Base64
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = reader.result as string;
                  resolve({
                    id: `asset-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    type: 'image',
                    typeName: 'asset',
                    props: {
                      name: file.name,
                      src: base64, // Base64 data URL
                      w: 0, // tldraw calcolerà automaticamente
                      h: 0,
                      mimeType: file.type,
                      isAnimated: false,
                    },
                    meta: {},
                  });
                  console.log('[SharedWorkspace] Immagine caricata come Base64:', file.name);
                };
                reader.readAsDataURL(file);
              });
            });
            
            console.log('[SharedWorkspace] API exposed to window.sharedWorkspaceAPI');
            console.log('[SharedWorkspace] Image upload handler registered (Base64)');
            loadWorkspaceState();
          }}
          components={components}
          overrides={overrides}
        />
      </div>
    </div>
  );
}
