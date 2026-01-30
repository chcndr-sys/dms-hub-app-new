import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useAnimation } from '@/contexts/AnimationContext';
import L from 'leaflet';

interface UseMapAnimationProps {
  center?: [number, number];
  zoom?: number;
  trigger?: number;
  bounds?: L.LatLngBoundsExpression;
  isMarketView?: boolean;
}

export function useMapAnimation({ center, zoom, trigger, bounds, isMarketView }: UseMapAnimationProps) {
  const map = useMap();
  const lastTriggerRef = useRef<number | undefined>(undefined);
  const isAnimatingRef = useRef(false);
  const { setAnimating } = useAnimation();

  useEffect(() => {
    if (lastTriggerRef.current !== undefined && 
        trigger !== lastTriggerRef.current && 
        !isAnimatingRef.current) {
      
      isAnimatingRef.current = true;
      setAnimating(true);
      
      if (isMarketView && bounds) {
        try {
          // Usa fitBounds per adattare la mappa ai bounds della pianta
          // con padding per non tagliare i bordi
          const latLngBounds = bounds instanceof L.LatLngBounds ? bounds : L.latLngBounds(bounds as L.LatLngBoundsLiteral);
          
          // P20 FIX: Corner a filo schermo
          // Calcola lo zoom ottimale per i bounds SENZA padding
          // così i corner dell'area arrivano esattamente ai bordi dello schermo
          const rawZoom = map.getBoundsZoom(latLngBounds, false, [0, 0]);
          // Arrotonda a 0.25 più vicino per quarti di scatto (la mappa ha zoomSnap: 0.25)
          const roundedToQuarter = Math.round(rawZoom * 4) / 4;
          // Usa lo zoom calcolato direttamente, senza margini aggiuntivi
          const forcedZoom = Math.min(roundedToQuarter, 19);
          
          const currentZoom = map.getZoom();
          const zoomDiff = Math.abs(forcedZoom - currentZoom);
          const dynamicDuration = zoomDiff > 4 ? 6 : 1.5;

          // Calcola il centro dei bounds
          const boundsCenter = latLngBounds.getCenter();

          console.log('[useMapAnimation] Animating to bounds center with forced zoom:', {
            rawZoom,
            roundedToQuarter,
            forcedZoom,
            currentZoom,
            boundsCenter: [boundsCenter.lat, boundsCenter.lng]
          });

          // USA flyTo con zoom forzato invece di flyToBounds
          // flyToBounds ignora il nostro zoom calcolato, quindi usiamo flyTo
          map.flyTo([boundsCenter.lat, boundsCenter.lng], forcedZoom, {
            duration: dynamicDuration,
            easeLinearity: 0.25
          });
        } catch (e) {
          console.error('[useMapAnimation] Error with bounds:', e);
          isAnimatingRef.current = false;
          setAnimating(false);
        }
      } else if (center && !isNaN(center[0]) && !isNaN(center[1])) {
        const currentZoom = map.getZoom();
        const targetZoom = zoom || 6;
        const zoomDiff = Math.abs(targetZoom - currentZoom);
        const dynamicDuration = zoomDiff > 4 ? 6 : 2;

        map.flyTo(center, targetZoom, {
          duration: dynamicDuration,
          easeLinearity: 0.25
        });
      } else {
        // Coordinate non valide, resetta lo stato animazione
        console.warn('[useMapAnimation] Invalid center coordinates:', center);
        isAnimatingRef.current = false;
        setAnimating(false);
        return;
      }
      
      const onMoveEnd = () => {
        isAnimatingRef.current = false;
        setAnimating(false);
        map.off('moveend', onMoveEnd);
      };
      
      setTimeout(() => {
        map.on('moveend', onMoveEnd);
      }, 100);
      
      setTimeout(() => {
        if (isAnimatingRef.current) {
          isAnimatingRef.current = false;
          setAnimating(false);
          map.off('moveend', onMoveEnd);
        }
      }, 7000);
    }
    
    lastTriggerRef.current = trigger;
  }, [center, zoom, trigger, bounds, isMarketView, map, setAnimating]);
}
