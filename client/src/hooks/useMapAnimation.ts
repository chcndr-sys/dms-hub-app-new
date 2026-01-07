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
          const targetZoom = map.getBoundsZoom(bounds, false, [10, 10]);
          // Limita lo zoom massimo a 17.5 per avere una vista bilanciata della pianta
          // Usa padding più generoso per i bounds
          const forcedZoom = Math.min(targetZoom + 0.5, 17.5);
          const currentZoom = map.getZoom();
          const zoomDiff = Math.abs(forcedZoom - currentZoom);
          const dynamicDuration = zoomDiff > 4 ? 6 : 1.5;

          map.flyTo(bounds.getCenter(), forcedZoom, {
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
