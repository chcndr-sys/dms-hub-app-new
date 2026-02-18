import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

interface RouteLayerProps {
  userLocation: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  mode: 'walking' | 'cycling' | 'driving';
}

/**
 * Componente per aggiungere routing alla mappa
 * Usa Leaflet Routing Machine per calcolare e visualizzare il percorso
 * NOTA: Pannello istruzioni nascosto - usiamo NavigationMode per UI custom
 */
export function RouteLayer({ userLocation, destination, mode }: RouteLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !userLocation || !destination) return;

    // Crea routing control con pannello COMPLETAMENTE nascosto
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLocation.lat, userLocation.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'car'
      }),
      lineOptions: {
        styles: [
          {
            color: '#10b981',
            opacity: 0.8,
            weight: 6
          }
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      showAlternatives: false,
      fitSelectedRoutes: true,
      show: false, // Nascondi pannello istruzioni
      addWaypoints: false,
      // @ts-expect-error leaflet-routing-machine types
      draggableWaypoints: false,
      routeWhileDragging: false, // Disabilita routing durante drag
      collapsible: false, // Non collassabile
      // @ts-ignore - containerClassName non è tipizzato ma funziona
      containerClassName: 'leaflet-routing-container-hidden', // Classe CSS per nascondere
      createMarker: (i: number, waypoint: any) => {
        // Marker personalizzati
        if (i === 0) {
          // Marker partenza (blu)
          return L.marker(waypoint.latLng, {
            icon: L.divIcon({
              className: 'route-start-marker',
              html: `<div style="
                background: #3b82f6;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">📍</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            })
          });
        } else {
          // Marker destinazione (verde)
          return L.marker(waypoint.latLng, {
            icon: L.divIcon({
              className: 'route-end-marker',
              html: `<div style="
                background: #10b981;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                border: 3px solid white;
              ">🎯</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          });
        }
      }
    }).addTo(map);

    // Nascondi completamente il container delle istruzioni dopo l'aggiunta
    setTimeout(() => {
      const containers = document.querySelectorAll('.leaflet-routing-container');
      containers.forEach(container => {
        (container as HTMLElement).style.display = 'none';
      });
    }, 100);

    // Cleanup quando component unmounts
    return () => {
      if (map && routingControl) {
        map.removeControl(routingControl);
      }
    };
  }, [map, userLocation, destination, mode]);

  return null;
}
