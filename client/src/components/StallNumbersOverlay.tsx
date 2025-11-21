import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface StallFeature {
  type: string;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  properties: {
    number: string | number;
    [key: string]: any;
  };
}

interface StallNumbersOverlayProps {
  features: StallFeature[];
  minZoom?: number;
}

export function StallNumbersOverlay({ features, minZoom = 16 }: StallNumbersOverlayProps) {
  const map = useMap();

  useEffect(() => {
    console.log('🔍 StallNumbersOverlay mounted', { featuresCount: features.length, minZoom });
    
    // Crea elemento SVG usando DOM API
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'stall-numbers-overlay');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '600';
    
    // Aggiungi SVG al pane overlay
    const overlayPane = map.getPanes().overlayPane;
    if (overlayPane) {
      overlayPane.appendChild(svg);
    }
    
    // Funzione di rendering
    const render = () => {
      const zoom = map.getZoom();
      console.log('🎨 Rendering numbers', { zoom, minZoom, shouldShow: zoom >= minZoom });
      
      // Nascondi numeri sotto la soglia minima di zoom
      if (zoom < minZoom) {
        svg.innerHTML = '';
        return;
      }
      
      // Pulisci SVG
      svg.innerHTML = '';
      
      // Calcola dimensione font in base allo zoom
      // Formula: fontSize = base * 2^(zoom - referenceZoom)
      const referenceZoom = 18;
      const baseFontSize = 10;
      const fontSize = baseFontSize * Math.pow(1.4, zoom - referenceZoom);
      
      // Renderizza ogni numero
      features.forEach((feature) => {
        if (feature.geometry.type !== 'Polygon') return;
        
        // Calcola centro del polygon
        const coords = feature.geometry.coordinates[0];
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        
        // Converti coordinate geografiche in pixel
        const point = map.latLngToLayerPoint([centerLat, centerLng]);
        
        // Crea elemento text SVG
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', point.x.toString());
        text.setAttribute('y', point.y.toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', `${fontSize}px`);
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('stroke', 'rgba(0,0,0,0.8)');
        text.setAttribute('stroke-width', '0.5');
        text.setAttribute('paint-order', 'stroke');
        text.textContent = feature.properties.number.toString();
        
        svg.appendChild(text);
      });
    };
    
    // Render iniziale
    render();
    
    // Re-render su zoom e pan
    map.on('zoom', render);
    map.on('move', render);
    map.on('viewreset', render);
    
    // Cleanup
    return () => {
      map.off('zoom', render);
      map.off('move', render);
      map.off('viewreset', render);
      
      if (svg && svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
    };
  }, [map, features, minZoom]);
  
  return null;
}
