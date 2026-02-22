import { useState, useEffect } from 'react';
import { Eye, X, AlertTriangle, Building2, Briefcase } from 'lucide-react';
import { getImpersonationParams, endImpersonation, type EntityType } from '@/hooks/useImpersonation';

interface ImpersonationData {
  entity_type: EntityType;
  entity_id: number;
  entity_nome: string;
  user_email: string;
}

/**
 * Banner che mostra quando l'admin sta visualizzando come un comune o un'associazione
 * Appare in alto nella pagina con sfondo giallo
 * 
 * SUPPORTA:
 * - Impersonificazione COMUNE: mostra "Stai visualizzando come: NomeComune"
 * - Impersonificazione ASSOCIAZIONE: mostra "Stai visualizzando come: NomeAssociazione"
 * 
 * @version 2.0.0 - Aggiunto supporto associazioni
 */
export default function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Controlla se siamo in modalità impersonificazione (URL o sessionStorage)
    const checkImpersonation = () => {
      const state = getImpersonationParams();
      
      if (state.isImpersonating && (state.comuneId || state.associazioneId)) {
        let entityType: EntityType = state.entityType;
        let entityId: number;
        let entityNome: string;

        if (state.entityType === 'associazione' && state.associazioneId) {
          entityId = parseInt(state.associazioneId);
          entityNome = state.associazioneNome 
            ? decodeURIComponent(state.associazioneNome) 
            : `Associazione #${state.associazioneId}`;
        } else {
          entityType = 'comune';
          entityId = parseInt(state.comuneId || '0');
          entityNome = state.comuneNome 
            ? decodeURIComponent(state.comuneNome) 
            : `Comune #${state.comuneId}`;
        }

        setImpersonationData({
          entity_type: entityType,
          entity_id: entityId,
          entity_nome: entityNome,
          user_email: state.userEmail ? decodeURIComponent(state.userEmail) : ''
        });
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setImpersonationData(null);
      }
    };

    checkImpersonation();
    
    // Ascolta cambiamenti di storage
    window.addEventListener('storage', checkImpersonation);
    window.addEventListener('popstate', checkImpersonation);
    
    return () => {
      window.removeEventListener('storage', checkImpersonation);
      window.removeEventListener('popstate', checkImpersonation);
    };
  }, []);

  const handleEndImpersonation = () => {
    endImpersonation();
    setIsVisible(false);
    setImpersonationData(null);
    // Ricarica la pagina per pulire lo stato
    window.location.href = window.location.pathname;
  };

  if (!isVisible || !impersonationData) return null;

  const isAssociazione = impersonationData.entity_type === 'associazione';
  const EntityIcon = isAssociazione ? Briefcase : Building2;
  const label = isAssociazione ? 'ASSOCIAZIONE' : 'COMUNE';

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-yellow-600/30 px-3 py-1 rounded-full">
            <Eye className="w-4 h-4" />
            <span className="font-semibold">MODALITÀ VISUALIZZAZIONE</span>
          </div>
          <div className="flex items-center gap-2">
            <EntityIcon className="w-4 h-4" />
            <span className="text-xs font-bold bg-yellow-600/30 px-2 py-0.5 rounded">{label}</span>
          </div>
          <span className="text-sm">
            Stai visualizzando come: <strong>{impersonationData.entity_nome}</strong>
            {impersonationData.user_email && (
              <span className="ml-2 text-yellow-800">({impersonationData.user_email})</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-yellow-800">
            <AlertTriangle className="w-3 h-3" />
            Tutte le azioni sono registrate
          </div>
          <button
            onClick={handleEndImpersonation}
            className="flex items-center gap-1 px-3 py-1 bg-black/20 hover:bg-black/30 rounded-lg text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Termina Sessione
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook per verificare se siamo in modalità impersonificazione
 * e ottenere il comune_id per filtrare i dati
 * 
 * @deprecated Usa useImpersonation da '@/hooks/useImpersonation' invece
 */
export function useImpersonation() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [comuneId, setComuneId] = useState<number | null>(null);

  useEffect(() => {
    const state = getImpersonationParams();
    setIsImpersonating(state.isImpersonating);
    setComuneId(state.comuneId ? parseInt(state.comuneId) : null);
  }, []);

  return { isImpersonating, comuneId };
}
