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
          
          // Calcola lo zoom ottimale per i bounds
          const targetZoom = map.getBoundsZoom(latLngBounds, false, [50, 50]);
          // Aggiungi +2 allo zoom calcolato per avere una vista più ravvicinata
          // Limita tra 18 e 20 per avere una vista bilanciata (aumentato di 1 scatto)
          const forcedZoom = Math.min(Math.max(targetZoom + 2, 18), 20);
          
          const currentZoom = map.getZoom();
          const zoomDiff = Math.abs(forcedZoom - currentZoom);
          const dynamicDuration = zoomDiff > 4 ? 6 : 1.5;

          console.log('[useMapAnimation] Animating to bounds:', {
            targetZoom,
            forcedZoom,
            currentZoom,
            boundsCenter: latLngBounds.getCenter()
          });

          // Usa flyToBounds per animazione fluida che rispetta i bounds
          map.flyToBounds(latLngBounds, {
            duration: dynamicDuration,
            easeLinearity: 0.25,
            padding: [30, 30], // Padding in pixel per non tagliare i bordi
            maxZoom: 20 // Zoom massimo aumentato a 20
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
