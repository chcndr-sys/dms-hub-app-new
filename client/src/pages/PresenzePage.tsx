/**
 * Presenze - App DMS integrata via iframe
 * Carica l'app DMS (Digital Market System) direttamente nel tab Presenze
 * L'app DMS è connessa al server Heroku (lapsy-dms.herokuapp.com)
 * v4.3.1
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  ClipboardList, ExternalLink, ArrowLeft, Loader2, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DMS_APP_URL = 'https://dms.associates/wp-admin/images/DMSAPP/#/login';
const HEROKU_FALLBACK_URL = 'https://lapsy-dms.herokuapp.com/index.html';

export default function PresenzePage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const handleOpenExternal = () => {
    window.open(DMS_APP_URL, '_blank');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Fallback: se l'iframe non carica, mostra il redirect
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-[#e8fbff] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a2332] to-[#0b1220] border-b border-[#14b8a6]/20 p-3">
          <div className="container mx-auto flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/')}
              className="text-[#e8fbff]/70 hover:text-[#e8fbff]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Home
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-[#1a2332] border border-[#14b8a6]/20 rounded-xl max-w-md w-full p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] flex items-center justify-center">
              <ClipboardList className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#e8fbff] mb-2">Gestione Presenze</h1>
              <p className="text-[#e8fbff]/60">L'app DMS si aprirà in una nuova scheda</p>
            </div>
            <Button 
              onClick={handleOpenExternal}
              className="w-full bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Apri App DMS
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#0b1220] text-[#e8fbff] flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'}`}>
      {/* Header compatto */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#0b1220] border-b border-[#14b8a6]/20 px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/')}
              className="text-[#e8fbff]/70 hover:text-[#e8fbff] h-8 px-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#e8fbff] leading-tight">App DMS Presenze</h1>
                <p className="text-[10px] text-[#14b8a6]/70 leading-tight hidden sm:block">Digital Market System — Heroku</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-[#e8fbff]/70 hover:text-[#e8fbff] h-8 w-8 p-0"
              title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenExternal}
              className="text-[#e8fbff]/70 hover:text-[#e8fbff] h-8 w-8 p-0"
              title="Apri in nuova scheda"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center bg-[#0b1220]">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#14b8a6] mx-auto" />
            <p className="text-[#e8fbff]/60 text-sm">Caricamento App DMS...</p>
          </div>
        </div>
      )}

      {/* Iframe con l'app DMS */}
      <iframe
        src={DMS_APP_URL}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        className={`flex-1 w-full border-0 ${isLoading ? 'h-0 overflow-hidden' : ''}`}
        style={{ minHeight: isLoading ? 0 : 'calc(100vh - 48px)' }}
        title="App DMS - Gestione Presenze"
        allow="geolocation; camera; microphone"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
      />
    </div>
  );
}
