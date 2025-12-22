/**
 * BUS HUB Editor - Workflow completo per digitalizzazione mercati
 * Integra PNG Transparent Tool e Slot Editor v3 in un unico flusso
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Image as ImageIcon, 
  Target, 
  Database,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Store
} from 'lucide-react';
import { PngTransparentTool } from './PngTransparentTool';
import { SlotEditorV3 } from './SlotEditorV3';
import { DMSBUS, PngMeta, MarketProject } from './dmsBus';

type WorkflowStep = 'setup' | 'png-tool' | 'slot-editor' | 'complete';

interface BusHubEditorProps {
  onClose?: () => void;
  onSaveComplete?: (marketId: number) => void;
  apiBaseUrl?: string;
}

interface WorkflowStatus {
  pngComplete: boolean;
  slotEditorComplete: boolean;
  savedToDatabase: boolean;
}

export function BusHubEditor({ onClose, onSaveComplete, apiBaseUrl }: BusHubEditorProps) {
  // State per workflow
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('setup');
  const [marketName, setMarketName] = useState('');
  const [marketLocation, setMarketLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Status workflow
  const [status, setStatus] = useState<WorkflowStatus>({
    pngComplete: false,
    slotEditorComplete: false,
    savedToDatabase: false,
  });

  // Calcola progresso
  const getProgress = () => {
    switch (currentStep) {
      case 'setup': return 0;
      case 'png-tool': return 33;
      case 'slot-editor': return 66;
      case 'complete': return 100;
      default: return 0;
    }
  };

  // Handler per completamento PNG Tool
  const handlePngComplete = useCallback((blob: Blob, meta: PngMeta) => {
    setStatus(prev => ({ ...prev, pngComplete: true }));
    console.log('[BusHub] PNG completato:', meta);
  }, []);

  // Naviga a Slot Editor
  const handleNavigateToSlotEditor = useCallback(() => {
    setCurrentStep('slot-editor');
  }, []);

  // Salva nel database tramite Pepe GIS
  const handleSaveToDatabase = useCallback(async (data: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Endpoint Pepe GIS su Hetzner
      const PEPE_GIS_URL = 'https://orchestratore.mio-hub.me/api/gis/import-market';
      
      // Prepara payload per Pepe GIS
      const payload = {
        name: marketName || 'Nuovo Mercato',
        municipality: marketLocation || 'Italia',
        slotEditorData: data,
      };
      
      console.log('[BusHub] Invio dati a Pepe GIS:', payload);
      
      const response = await fetch(PEPE_GIS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setStatus(prev => ({ ...prev, slotEditorComplete: true, savedToDatabase: true }));
        setCurrentStep('complete');
        
        if (onSaveComplete && result.data?.marketId) {
          onSaveComplete(result.data.marketId);
        }
        
        console.log('[BusHub] Mercato salvato in Pepe GIS:', result);
      } else {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }
    } catch (err) {
      console.error('[BusHub] Errore salvataggio:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [marketName, marketLocation, onSaveComplete]);

  // Reset workflow
  const handleReset = useCallback(async () => {
    await DMSBUS.clear();
    setCurrentStep('setup');
    setMarketName('');
    setMarketLocation('');
    setStatus({
      pngComplete: false,
      slotEditorComplete: false,
      savedToDatabase: false,
    });
    setError(null);
  }, []);

  // Render step setup
  const renderSetup = () => (
    <Card className="max-w-2xl mx-auto bg-[#0f2330] border-[#14b8a6]/30">
      <CardHeader>
        <CardTitle className="text-[#14b8a6] flex items-center gap-2">
          <Store className="h-6 w-6" />
          Crea Nuovo Mercato
        </CardTitle>
        <p className="text-sm text-[#e8fbff]/60">
          Inizia il processo di digitalizzazione inserendo i dati base del mercato
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-[#e8fbff]/80">Nome Mercato *</Label>
            <Input
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              placeholder="Es: Mercato Settimanale Grosseto"
              className="mt-1 bg-[#1a4a5a] border-[#14b8a6]/30 text-[#e8fbff]"
            />
          </div>
          
          <div>
            <Label className="text-[#e8fbff]/80">Località</Label>
            <Input
              value={marketLocation}
              onChange={(e) => setMarketLocation(e.target.value)}
              placeholder="Es: Piazza Esperanto, Grosseto"
              className="mt-1 bg-[#1a4a5a] border-[#14b8a6]/30 text-[#e8fbff]"
            />
          </div>
        </div>
        
        {/* Workflow Steps Preview */}
        <div className="bg-[#0b1220] rounded-lg p-4 border border-[#14b8a6]/20">
          <p className="text-sm font-medium text-[#14b8a6] mb-3">Fasi del Workflow:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-[#e8fbff]/80">
              <div className="w-6 h-6 rounded-full bg-[#14b8a6]/20 flex items-center justify-center text-[#14b8a6]">1</div>
              <ImageIcon className="h-4 w-4 text-[#14b8a6]" />
              <span>PNG Transparent Tool - Rimozione sfondo pianta</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#e8fbff]/80">
              <div className="w-6 h-6 rounded-full bg-[#14b8a6]/20 flex items-center justify-center text-[#14b8a6]">2</div>
              <Target className="h-4 w-4 text-[#14b8a6]" />
              <span>Slot Editor v3 - Posizionamento posteggi</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#e8fbff]/80">
              <div className="w-6 h-6 rounded-full bg-[#14b8a6]/20 flex items-center justify-center text-[#14b8a6]">3</div>
              <Database className="h-4 w-4 text-[#14b8a6]" />
              <span>Salvataggio nel Database</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-[#6b7280]/20 border-[#6b7280]/30 text-[#e8fbff]/60"
            >
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
          )}
          <Button
            onClick={() => setCurrentStep('png-tool')}
            disabled={!marketName.trim()}
            className="flex-1 bg-[#14b8a6] hover:bg-[#0d9488] text-white"
          >
            Inizia
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render step complete
  const renderComplete = () => (
    <Card className="max-w-2xl mx-auto bg-[#0f2330] border-[#10b981]/30">
      <CardHeader>
        <CardTitle className="text-[#10b981] flex items-center gap-2">
          <Check className="h-6 w-6" />
          Mercato Creato con Successo!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-[#10b981]/10 rounded-lg p-6 border border-[#10b981]/30 text-center">
          <div className="w-16 h-16 rounded-full bg-[#10b981]/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-[#10b981]" />
          </div>
          <h3 className="text-xl font-semibold text-[#e8fbff] mb-2">{marketName}</h3>
          <p className="text-[#e8fbff]/60">{marketLocation}</p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-[#1a4a5a] rounded">
            <span className="text-[#e8fbff]/80">PNG Trasparente</span>
            <Badge className="bg-[#10b981]">Completato</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#1a4a5a] rounded">
            <span className="text-[#e8fbff]/80">Posteggi Georeferenziati</span>
            <Badge className="bg-[#10b981]">Completato</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#1a4a5a] rounded">
            <span className="text-[#e8fbff]/80">Salvato nel Database</span>
            <Badge className="bg-[#10b981]">Completato</Badge>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1 bg-[#14b8a6]/20 border-[#14b8a6]/30 text-[#14b8a6]"
          >
            Crea Altro Mercato
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white"
            >
              Chiudi
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header con Progress */}
      <div className="bg-[#0f2330] border-b border-[#14b8a6]/30 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-[#14b8a6]" />
            <span className="font-medium text-[#e8fbff]">
              BUS HUB - Digitalizzazione Mercato
            </span>
            {marketName && (
              <Badge variant="outline" className="border-[#14b8a6]/30 text-[#14b8a6]">
                {marketName}
              </Badge>
            )}
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            <StepIndicator 
              step={1} 
              label="PNG" 
              active={currentStep === 'png-tool'} 
              complete={status.pngComplete}
            />
            <ArrowRight className="h-4 w-4 text-[#e8fbff]/30" />
            <StepIndicator 
              step={2} 
              label="Editor" 
              active={currentStep === 'slot-editor'} 
              complete={status.slotEditorComplete}
            />
            <ArrowRight className="h-4 w-4 text-[#e8fbff]/30" />
            <StepIndicator 
              step={3} 
              label="Salva" 
              active={currentStep === 'complete'} 
              complete={status.savedToDatabase}
            />
          </div>
        </div>
        
        <Progress value={getProgress()} className="h-1 bg-[#1a4a5a]" />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444] text-sm">
            {error}
          </div>
        )}
        
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#0f2330] p-6 rounded-lg border border-[#14b8a6]/30 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#14b8a6]" />
              <span className="text-[#e8fbff]">Salvataggio in corso...</span>
            </div>
          </div>
        )}
        
        {currentStep === 'setup' && renderSetup()}
        
        {currentStep === 'png-tool' && (
          <div className="h-full">
            <div className="mb-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('setup')}
                className="text-[#e8fbff]/60 hover:text-[#e8fbff]"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Indietro
              </Button>
            </div>
            <PngTransparentTool
              onComplete={handlePngComplete}
              onNavigateToSlotEditor={handleNavigateToSlotEditor}
            />
          </div>
        )}
        
        {currentStep === 'slot-editor' && (
          <div className="h-full">
            <SlotEditorV3
              marketName={marketName}
              onSaveToDatabase={handleSaveToDatabase}
              onBack={() => setCurrentStep('png-tool')}
            />
          </div>
        )}
        
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  );
}

// Componente Step Indicator
function StepIndicator({ 
  step, 
  label, 
  active, 
  complete 
}: { 
  step: number; 
  label: string; 
  active: boolean; 
  complete: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded ${
      active ? 'bg-[#14b8a6]/20' : complete ? 'bg-[#10b981]/20' : 'bg-[#1a4a5a]'
    }`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
        complete ? 'bg-[#10b981] text-white' : 
        active ? 'bg-[#14b8a6] text-white' : 
        'bg-[#6b7280] text-[#e8fbff]/60'
      }`}>
        {complete ? <Check className="h-3 w-3" /> : step}
      </div>
      <span className={`text-xs ${
        active ? 'text-[#14b8a6]' : complete ? 'text-[#10b981]' : 'text-[#e8fbff]/60'
      }`}>
        {label}
      </span>
    </div>
  );
}

export default BusHubEditor;
