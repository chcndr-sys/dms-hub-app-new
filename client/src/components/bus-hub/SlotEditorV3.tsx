/**
 * Slot Editor v3 - Editor georeferenziato per posteggi mercato
 * Integra OpenStreetMap con Leaflet per posizionamento preciso
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Marker, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Upload,
  RotateCw,
  Move,
  Square,
  Eye,
  EyeOff,
  Target,
  Layers,
  Database
} from 'lucide-react';
import { DMSBUS, StallData, MarkerData, AreaData, PngMeta, PlantPosition } from './dmsBus';

// Interfacce per i dati
interface SlotItem {
  id: string;
  number: string;
  lat: number;
  lng: number;
  width: number;
  height: number;
  rotation: number;
  status?: string;
  kind?: string;
}

interface MarkerItem {
  id: string;
  number: number;
  name: string;
  lat: number;
  lng: number;
  type: string;
  bgColor: string;
  textColor: string;
  description?: string;
}

interface AreaItem {
  id: string;
  number: number;
  name: string;
  coordinates: [number, number][];
  fillColor: string;
  fillOpacity: number;
  borderColor: string;
  type: string;
  description?: string;
}

interface SlotEditorV3Props {
  onSaveToDatabase?: (data: ExportData) => Promise<void>;
  onBack?: () => void;
  marketName?: string;
}

interface ExportData {
  container: [number, number][];
  center: { lat: number; lng: number };
  stalls_geojson: any;
  markers_geojson: any;
  areas_geojson: any;
  plant_rotation: number;
  plant_scale: number;
}

// Componente per gestire eventi mappa
function MapEventHandler({ 
  addMode, 
  markerMode, 
  areaMode,
  onAddSlot, 
  onAddMarker,
  onAddAreaVertex
}: { 
  addMode: boolean; 
  markerMode: boolean;
  areaMode: boolean;
  onAddSlot: (lat: number, lng: number) => void;
  onAddMarker: (lat: number, lng: number) => void;
  onAddAreaVertex: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (addMode) {
        onAddSlot(e.latlng.lat, e.latlng.lng);
      } else if (markerMode) {
        onAddMarker(e.latlng.lat, e.latlng.lng);
      } else if (areaMode) {
        onAddAreaVertex(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Componente per marker pianta draggabile
function PlantMarker({ 
  position, 
  onDrag 
}: { 
  position: [number, number]; 
  onDrag: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  
  const icon = L.divIcon({
    className: 'plant-marker',
    html: `<div style="
      background: #ef4444;
      color: white;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: move;
    ">M</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      draggable={true}
      eventHandlers={{
        drag: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onDrag(pos.lat, pos.lng);
        },
      }}
    />
  );
}

// Componente per slot marker
function SlotMarker({ 
  slot, 
  isSelected,
  onSelect,
  onDrag
}: { 
  slot: SlotItem;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (lat: number, lng: number) => void;
}) {
  const icon = L.divIcon({
    className: 'slot-marker',
    html: `<div style="
      background: ${isSelected ? '#f59e0b' : '#10b981'};
      color: white;
      min-width: 24px;
      height: 24px;
      padding: 0 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 11px;
      border: 2px solid ${isSelected ? '#d97706' : '#059669'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: pointer;
    ">${slot.number}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <Marker
      position={[slot.lat, slot.lng]}
      icon={icon}
      draggable={true}
      eventHandlers={{
        click: onSelect,
        drag: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onDrag(pos.lat, pos.lng);
        },
      }}
    />
  );
}

// Calcola bounds rettangolo posteggio
function calculateSlotBounds(
  center: { lat: number; lng: number },
  width: number,
  height: number,
  rotation: number
): [number, number][] {
  // Converti dimensioni da metri a gradi (approssimazione)
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(center.lat * Math.PI / 180);
  
  const halfW = (width / metersPerDegLng) / 2;
  const halfH = (height / metersPerDegLat) / 2;
  
  // 4 corners non ruotati
  let corners: [number, number][] = [
    [center.lat + halfH, center.lng - halfW], // top-left
    [center.lat + halfH, center.lng + halfW], // top-right
    [center.lat - halfH, center.lng + halfW], // bottom-right
    [center.lat - halfH, center.lng - halfW], // bottom-left
  ];
  
  // Applica rotazione se necessario
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const mercatorFactor = Math.cos(center.lat * Math.PI / 180);
    
    corners = corners.map(([lat, lng]) => {
      const dLat = lat - center.lat;
      const dLng = (lng - center.lng) * mercatorFactor;
      
      const rotatedLat = dLat * cos - dLng * sin;
      const rotatedLng = (dLat * sin + dLng * cos) / mercatorFactor;
      
      return [center.lat + rotatedLat, center.lng + rotatedLng] as [number, number];
    });
  }
  
  return corners;
}

// Calcola bounds pianta
function calculatePlantBounds(
  center: { lat: number; lng: number },
  imageWidth: number,
  imageHeight: number,
  rotation: number,
  scale: number
): [number, number][] {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(center.lat * Math.PI / 180);
  
  // Scala base: 1 pixel = 0.1 metri (regolabile con scale)
  const pixelToMeter = 0.1 * scale;
  
  const halfW = ((imageWidth * pixelToMeter) / metersPerDegLng) / 2;
  const halfH = ((imageHeight * pixelToMeter) / metersPerDegLat) / 2;
  
  return [
    [center.lat + halfH, center.lng - halfW], // top-left (NW)
    [center.lat + halfH, center.lng + halfW], // top-right (NE)
    [center.lat - halfH, center.lng + halfW], // bottom-right (SE)
    [center.lat - halfH, center.lng - halfW], // bottom-left (SW)
  ];
}

export function SlotEditorV3({ onSaveToDatabase, onBack, marketName = 'Nuovo Mercato' }: SlotEditorV3Props) {
  // State per pianta
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [pngOriginalUrl, setPngOriginalUrl] = useState<string | null>(null);
  const [plantCenter, setPlantCenter] = useState<[number, number]>([42.7589, 11.1135]); // Grosseto default
  const [plantRotation, setPlantRotation] = useState(0);
  const [plantScale, setPlantScale] = useState(1.0);
  const [plantOpacity, setPlantOpacity] = useState(70);
  const [plantImageSize, setPlantImageSize] = useState({ width: 500, height: 400 });
  const [showReference, setShowReference] = useState(false);
  
  // State per elementi
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [markers, setMarkers] = useState<MarkerItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  
  // State per modalità
  const [addMode, setAddMode] = useState(false);
  const [markerMode, setMarkerMode] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [currentAreaVertices, setCurrentAreaVertices] = useState<[number, number][]>([]);
  
  // Counters
  const [slotCounter, setSlotCounter] = useState(1);
  const [markerCounter, setMarkerCounter] = useState(1);
  const [areaCounter, setAreaCounter] = useState(1);
  
  // Default slot dimensions
  const [defaultWidth, setDefaultWidth] = useState(4);
  const [defaultHeight, setDefaultHeight] = useState(3);
  const [defaultRotation, setDefaultRotation] = useState(0);
  
  // Logs
  const [logs, setLogs] = useState<string[]>([]);
  
  const log = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : '📝';
    setLogs(prev => [...prev.slice(-9), `${prefix} ${message}`]);
    console.log(`[SlotEditor] ${prefix} ${message}`);
  }, []);

  // Carica dati dal Bus all'avvio
  useEffect(() => {
    const loadFromBus = async () => {
      try {
        log('Caricamento dati dal BUS...');
        
        // Carica PNG trasparente
        const { blob: pngBlob, meta: pngMeta } = await DMSBUS.getPngTransparent();
        if (pngBlob) {
          const url = URL.createObjectURL(pngBlob);
          setPngUrl(url);
          
          // Ottieni dimensioni immagine
          const img = new Image();
          img.onload = () => {
            setPlantImageSize({ width: img.width, height: img.height });
            log(`PNG caricato: ${img.width}x${img.height}`, 'success');
          };
          img.src = url;
        }
        
        // Carica PNG originale per riferimento
        const pngOriginal = await DMSBUS.getPngOriginal();
        if (pngOriginal) {
          setPngOriginalUrl(URL.createObjectURL(pngOriginal));
        }
        
        // Carica posizione pianta salvata
        const savedPosition = await DMSBUS.getPlantPosition();
        if (savedPosition) {
          if (savedPosition.center) {
            setPlantCenter([savedPosition.center.lat, savedPosition.center.lng]);
          }
          if (savedPosition.rotation !== undefined) {
            setPlantRotation(savedPosition.rotation);
          }
          if (savedPosition.scale !== undefined) {
            setPlantScale(savedPosition.scale);
          }
          if (savedPosition.opacity !== undefined) {
            setPlantOpacity(savedPosition.opacity);
          }
          log('Posizione pianta ripristinata', 'success');
        }
        
        // Carica posteggi salvati
        const savedStalls = await DMSBUS.getStalls();
        if (savedStalls && savedStalls.length > 0) {
          const loadedSlots = savedStalls.map((s, i) => ({
            id: s.id || `slot-${i}`,
            number: s.number,
            lat: s.position[0],
            lng: s.position[1],
            width: 4,
            height: 3,
            rotation: s.orientation || 0,
            status: s.status,
            kind: s.kind,
          }));
          setSlots(loadedSlots);
          setSlotCounter(loadedSlots.length + 1);
          log(`${loadedSlots.length} posteggi caricati`, 'success');
        }
        
      } catch (err) {
        log(`Errore caricamento: ${err}`, 'error');
      }
    };
    
    loadFromBus();
  }, [log]);

  // Calcola bounds pianta
  const plantBounds = calculatePlantBounds(
    { lat: plantCenter[0], lng: plantCenter[1] },
    plantImageSize.width,
    plantImageSize.height,
    plantRotation,
    plantScale
  );

  // Handler per aggiungere slot
  const handleAddSlot = (lat: number, lng: number) => {
    const newSlot: SlotItem = {
      id: `slot-${Date.now()}`,
      number: slotCounter.toString(),
      lat,
      lng,
      width: defaultWidth,
      height: defaultHeight,
      rotation: defaultRotation,
      status: 'free',
      kind: 'slot',
    };
    setSlots(prev => [...prev, newSlot]);
    setSlotCounter(prev => prev + 1);
    setSelectedSlotId(newSlot.id);
    log(`Posteggio ${newSlot.number} aggiunto`);
  };

  // Handler per aggiungere marker
  const handleAddMarker = (lat: number, lng: number) => {
    const newMarker: MarkerItem = {
      id: `marker-${Date.now()}`,
      number: markerCounter,
      name: `Marker ${markerCounter}`,
      lat,
      lng,
      type: 'info',
      bgColor: '#3b82f6',
      textColor: '#ffffff',
    };
    setMarkers(prev => [...prev, newMarker]);
    setMarkerCounter(prev => prev + 1);
    log(`Marker ${newMarker.number} aggiunto`);
  };

  // Handler per vertici area
  const handleAddAreaVertex = (lat: number, lng: number) => {
    setCurrentAreaVertices(prev => [...prev, [lat, lng]]);
  };

  // Completa area
  const handleCompleteArea = () => {
    if (currentAreaVertices.length < 3) {
      log('Servono almeno 3 vertici per un\'area', 'error');
      return;
    }
    
    const newArea: AreaItem = {
      id: `area-${Date.now()}`,
      number: areaCounter,
      name: `Area ${areaCounter}`,
      coordinates: currentAreaVertices,
      fillColor: '#10b981',
      fillOpacity: 0.3,
      borderColor: '#059669',
      type: 'zone',
    };
    setAreas(prev => [...prev, newArea]);
    setAreaCounter(prev => prev + 1);
    setCurrentAreaVertices([]);
    setAreaMode(false);
    log(`Area ${newArea.number} creata con ${currentAreaVertices.length} vertici`);
  };

  // Elimina slot selezionato
  const handleDeleteSelected = () => {
    if (!selectedSlotId) return;
    setSlots(prev => prev.filter(s => s.id !== selectedSlotId));
    setSelectedSlotId(null);
    log('Posteggio eliminato');
  };

  // Aggiorna posizione slot
  const handleSlotDrag = (slotId: string, lat: number, lng: number) => {
    setSlots(prev => prev.map(s => 
      s.id === slotId ? { ...s, lat, lng } : s
    ));
  };

  // Aggiorna posizione pianta
  const handlePlantDrag = (lat: number, lng: number) => {
    setPlantCenter([lat, lng]);
  };

  // Salva posizione pianta
  const handleSavePlantPosition = async () => {
    try {
      const position: PlantPosition = {
        center: { lat: plantCenter[0], lng: plantCenter[1] },
        imageSize: plantImageSize,
        rotation: plantRotation,
        scale: plantScale,
        opacity: plantOpacity,
      };
      await DMSBUS.savePlantPosition(position);
      log('Posizione pianta salvata', 'success');
    } catch (err) {
      log(`Errore salvataggio: ${err}`, 'error');
    }
  };

  // Salva posteggi nel Bus
  const handleSaveSlots = async () => {
    try {
      const stallsData: StallData[] = slots.map(s => ({
        id: s.id,
        number: s.number,
        position: [s.lat, s.lng],
        orientation: s.rotation,
        kind: s.kind,
        status: s.status,
      }));
      await DMSBUS.saveStalls(stallsData);
      log(`${slots.length} posteggi salvati nel Bus`, 'success');
    } catch (err) {
      log(`Errore salvataggio: ${err}`, 'error');
    }
  };

  // Esporta GeoJSON
  const handleExportGeoJSON = () => {
    if (slots.length === 0) {
      log('Aggiungi almeno un posteggio prima di esportare', 'error');
      return;
    }
    
    // Calcola centro mercato
    const avgLat = slots.reduce((sum, s) => sum + s.lat, 0) / slots.length;
    const avgLng = slots.reduce((sum, s) => sum + s.lng, 0) / slots.length;
    
    // GeoJSON posteggi
    const stallsGeoJSON = {
      type: 'FeatureCollection',
      features: slots.map(slot => {
        const corners = calculateSlotBounds(
          { lat: slot.lat, lng: slot.lng },
          slot.width,
          slot.height,
          slot.rotation
        );
        
        const polygonCoords = [
          ...corners.map(([lat, lng]) => [lng, lat]),
          [corners[0][1], corners[0][0]], // chiusura
        ];
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [polygonCoords],
          },
          properties: {
            number: slot.number,
            orientation: slot.rotation,
            kind: 'slot',
            status: slot.status || 'free',
            dimensions: `${slot.width}m × ${slot.height}m`,
          },
        };
      }),
    };
    
    // GeoJSON markers
    const markersGeoJSON = {
      type: 'FeatureCollection',
      features: markers.map(m => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [m.lng, m.lat],
        },
        properties: {
          name: m.name,
          type: m.type,
          color: m.bgColor,
          description: m.description,
        },
      })),
    };
    
    // GeoJSON aree
    const areasGeoJSON = {
      type: 'FeatureCollection',
      features: areas.map(a => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [a.coordinates.map(([lat, lng]) => [lng, lat])],
        },
        properties: {
          name: a.name,
          type: a.type,
          color: a.fillColor,
          opacity: a.fillOpacity,
          description: a.description,
        },
      })),
    };
    
    const exportData: ExportData = {
      container: plantBounds,
      center: { lat: avgLat, lng: avgLng },
      stalls_geojson: stallsGeoJSON,
      markers_geojson: markersGeoJSON,
      areas_geojson: areasGeoJSON,
      plant_rotation: plantRotation,
      plant_scale: plantScale,
    };
    
    // Download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${marketName.replace(/\s+/g, '-').toLowerCase()}-${slots.length}-posteggi-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    log(`Esportati ${slots.length} posteggi, ${markers.length} marker, ${areas.length} aree`, 'success');
  };

  // Salva nel database
  const handleSaveToDatabase = async () => {
    if (slots.length === 0) {
      log('Aggiungi almeno un posteggio prima di salvare', 'error');
      return;
    }
    
    const avgLat = slots.reduce((sum, s) => sum + s.lat, 0) / slots.length;
    const avgLng = slots.reduce((sum, s) => sum + s.lng, 0) / slots.length;
    
    const stallsGeoJSON = {
      type: 'FeatureCollection',
      features: slots.map(slot => {
        const corners = calculateSlotBounds(
          { lat: slot.lat, lng: slot.lng },
          slot.width,
          slot.height,
          slot.rotation
        );
        
        const polygonCoords = [
          ...corners.map(([lat, lng]) => [lng, lat]),
          [corners[0][1], corners[0][0]],
        ];
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [polygonCoords],
          },
          properties: {
            number: slot.number,
            orientation: slot.rotation,
            kind: 'slot',
            status: slot.status || 'free',
            dimensions: `${slot.width}m × ${slot.height}m`,
          },
        };
      }),
    };
    
    const exportData: ExportData = {
      container: plantBounds,
      center: { lat: avgLat, lng: avgLng },
      stalls_geojson: stallsGeoJSON,
      markers_geojson: { type: 'FeatureCollection', features: [] },
      areas_geojson: { type: 'FeatureCollection', features: [] },
      plant_rotation: plantRotation,
      plant_scale: plantScale,
    };
    
    if (onSaveToDatabase) {
      try {
        log('Salvataggio nel database...');
        await onSaveToDatabase(exportData);
        log('Mercato salvato nel database!', 'success');
      } catch (err) {
        log(`Errore salvataggio: ${err}`, 'error');
      }
    }
  };

  // Slot selezionato
  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Sidebar Controlli */}
      <Card className="w-full lg:w-96 flex-shrink-0 bg-[#0f2330] border-[#14b8a6]/30 overflow-y-auto max-h-[calc(100vh-200px)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#14b8a6] flex items-center gap-2">
            <Target className="h-5 w-5" />
            Slot Editor v3
          </CardTitle>
          <p className="text-xs text-[#e8fbff]/60">
            Sistema Unificato: Marker e Aree
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="plant" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#1a4a5a]">
              <TabsTrigger value="plant" className="text-xs">Pianta</TabsTrigger>
              <TabsTrigger value="slots" className="text-xs">Posteggi</TabsTrigger>
              <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
            </TabsList>
            
            {/* Tab Pianta */}
            <TabsContent value="plant" className="space-y-3 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-[#2196F3]/20 border-[#2196F3]/30 text-[#2196F3]"
                onClick={() => setShowReference(!showReference)}
              >
                {showReference ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showReference ? 'Nascondi' : 'Mostra'} Originale
              </Button>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label className="text-[#e8fbff]/80">Rotazione</Label>
                  <span className="text-[#14b8a6]">{plantRotation.toFixed(1)}°</span>
                </div>
                <Slider
                  value={[plantRotation]}
                  onValueChange={([v]) => setPlantRotation(v)}
                  min={0}
                  max={360}
                  step={0.1}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label className="text-[#e8fbff]/80">Scala</Label>
                  <span className="text-[#14b8a6]">{(plantScale * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[plantScale * 100]}
                  onValueChange={([v]) => setPlantScale(v / 100)}
                  min={10}
                  max={400}
                  step={1}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label className="text-[#e8fbff]/80">Opacità</Label>
                  <span className="text-[#14b8a6]">{plantOpacity}%</span>
                </div>
                <Slider
                  value={[plantOpacity]}
                  onValueChange={([v]) => setPlantOpacity(v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-[#10b981]/20 border-[#10b981]/30 text-[#10b981]"
                onClick={handleSavePlantPosition}
              >
                <Save className="h-4 w-4 mr-2" />
                Salva Posizione
              </Button>
            </TabsContent>
            
            {/* Tab Posteggi */}
            <TabsContent value="slots" className="space-y-3 mt-3">
              <div className="flex gap-2">
                <Button
                  variant={addMode ? 'default' : 'outline'}
                  size="sm"
                  className={addMode ? 'flex-1 bg-[#ff9800]' : 'flex-1 bg-[#1a4a5a] border-[#14b8a6]/30'}
                  onClick={() => { setAddMode(!addMode); setMarkerMode(false); setAreaMode(false); }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {addMode ? 'Attivo' : 'Aggiungi'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#ef4444]/20 border-[#ef4444]/30 text-[#ef4444]"
                  onClick={handleDeleteSelected}
                  disabled={!selectedSlotId}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-[#e8fbff]/60">Larghezza (m)</Label>
                  <Input
                    type="number"
                    value={defaultWidth}
                    onChange={(e) => setDefaultWidth(parseFloat(e.target.value) || 4)}
                    className="h-8 bg-[#1a4a5a] border-[#14b8a6]/30 text-[#e8fbff]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#e8fbff]/60">Altezza (m)</Label>
                  <Input
                    type="number"
                    value={defaultHeight}
                    onChange={(e) => setDefaultHeight(parseFloat(e.target.value) || 3)}
                    className="h-8 bg-[#1a4a5a] border-[#14b8a6]/30 text-[#e8fbff]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[#e8fbff]/60">Rotazione (°)</Label>
                  <Input
                    type="number"
                    value={defaultRotation}
                    onChange={(e) => setDefaultRotation(parseFloat(e.target.value) || 0)}
                    className="h-8 bg-[#1a4a5a] border-[#14b8a6]/30 text-[#e8fbff]"
                  />
                </div>
              </div>
              
              {/* Slot selezionato */}
              {selectedSlot && (
                <div className="p-2 bg-[#1a4a5a] rounded border border-[#f59e0b]/30">
                  <p className="text-sm font-medium text-[#f59e0b] mb-2">
                    Posteggio #{selectedSlot.number}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[#e8fbff]/60">Numero</Label>
                      <Input
                        value={selectedSlot.number}
                        onChange={(e) => {
                          setSlots(prev => prev.map(s => 
                            s.id === selectedSlotId ? { ...s, number: e.target.value } : s
                          ));
                        }}
                        className="h-7 bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
                      />
                    </div>
                    <div>
                      <Label className="text-[#e8fbff]/60">Rotazione</Label>
                      <Input
                        type="number"
                        value={selectedSlot.rotation}
                        onChange={(e) => {
                          setSlots(prev => prev.map(s => 
                            s.id === selectedSlotId ? { ...s, rotation: parseFloat(e.target.value) || 0 } : s
                          ));
                        }}
                        className="h-7 bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Lista posteggi */}
              <div className="max-h-32 overflow-y-auto bg-[#0b1220] rounded p-2 border border-[#14b8a6]/20">
                <p className="text-xs text-[#14b8a6] mb-1">Posteggi: {slots.length}</p>
                <div className="flex flex-wrap gap-1">
                  {slots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`px-2 py-0.5 text-xs rounded ${
                        selectedSlotId === slot.id 
                          ? 'bg-[#f59e0b] text-white' 
                          : 'bg-[#1a4a5a] text-[#e8fbff]/80'
                      }`}
                    >
                      {slot.number}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-[#10b981]/20 border-[#10b981]/30 text-[#10b981]"
                onClick={handleSaveSlots}
              >
                <Save className="h-4 w-4 mr-2" />
                Salva nel Bus
              </Button>
            </TabsContent>
            
            {/* Tab Export */}
            <TabsContent value="export" className="space-y-3 mt-3">
              <div className="p-2 bg-[#1a4a5a] rounded text-xs">
                <p className="text-[#e8fbff]/80">
                  <span className="text-[#14b8a6] font-medium">{slots.length}</span> posteggi
                </p>
                <p className="text-[#e8fbff]/80">
                  <span className="text-[#14b8a6] font-medium">{markers.length}</span> marker
                </p>
                <p className="text-[#e8fbff]/80">
                  <span className="text-[#14b8a6] font-medium">{areas.length}</span> aree
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-[#14b8a6]/20 border-[#14b8a6]/30 text-[#14b8a6]"
                onClick={handleExportGeoJSON}
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta GeoJSON
              </Button>
              
              <Button
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white"
                onClick={handleSaveToDatabase}
              >
                <Database className="h-4 w-4 mr-2" />
                Salva nel Database
              </Button>
              
              {onBack && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-[#6b7280]/20 border-[#6b7280]/30 text-[#e8fbff]/60"
                  onClick={onBack}
                >
                  ← Torna al PNG Tool
                </Button>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Console */}
          <div className="p-2 bg-[#0b1220] rounded border border-[#14b8a6]/20 max-h-24 overflow-y-auto">
            <p className="text-xs text-[#14b8a6] font-mono mb-1">Console:</p>
            {logs.map((log, i) => (
              <p key={i} className="text-xs text-[#e8fbff]/60 font-mono">{log}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mappa */}
      <Card className="flex-1 bg-[#0f2330] border-[#14b8a6]/30 overflow-hidden">
        <CardContent className="p-0 h-full min-h-[500px]">
          <MapContainer
            center={plantCenter}
            zoom={17}
            className="h-full w-full"
            style={{ minHeight: '500px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={21}
            />
            
            {/* PNG Overlay */}
            {pngUrl && (
              <ImageOverlay
                url={pngUrl}
                bounds={[
                  [plantBounds[0][0], plantBounds[0][1]],
                  [plantBounds[2][0], plantBounds[2][1]],
                ]}
                opacity={plantOpacity / 100}
              />
            )}
            
            {/* Plant Marker */}
            <PlantMarker 
              position={plantCenter} 
              onDrag={handlePlantDrag}
            />
            
            {/* Slot Markers */}
            {slots.map(slot => (
              <SlotMarker
                key={slot.id}
                slot={slot}
                isSelected={slot.id === selectedSlotId}
                onSelect={() => setSelectedSlotId(slot.id)}
                onDrag={(lat, lng) => handleSlotDrag(slot.id, lat, lng)}
              />
            ))}
            
            {/* Slot Polygons */}
            {slots.map(slot => {
              const corners = calculateSlotBounds(
                { lat: slot.lat, lng: slot.lng },
                slot.width,
                slot.height,
                slot.rotation
              );
              return (
                <Polygon
                  key={`poly-${slot.id}`}
                  positions={corners}
                  pathOptions={{
                    color: slot.id === selectedSlotId ? '#f59e0b' : '#10b981',
                    fillColor: slot.id === selectedSlotId ? '#f59e0b' : '#10b981',
                    fillOpacity: 0.3,
                    weight: 2,
                  }}
                />
              );
            })}
            
            {/* Area Polygons */}
            {areas.map(area => (
              <Polygon
                key={area.id}
                positions={area.coordinates}
                pathOptions={{
                  color: area.borderColor,
                  fillColor: area.fillColor,
                  fillOpacity: area.fillOpacity,
                  weight: 2,
                }}
              />
            ))}
            
            {/* Current Area Drawing */}
            {currentAreaVertices.length > 0 && (
              <Polygon
                positions={currentAreaVertices}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.2,
                  weight: 2,
                  dashArray: '5, 5',
                }}
              />
            )}
            
            {/* Map Event Handler */}
            <MapEventHandler
              addMode={addMode}
              markerMode={markerMode}
              areaMode={areaMode}
              onAddSlot={handleAddSlot}
              onAddMarker={handleAddMarker}
              onAddAreaVertex={handleAddAreaVertex}
            />
          </MapContainer>
        </CardContent>
      </Card>
      
      {/* Reference Panel */}
      {showReference && pngOriginalUrl && (
        <div className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-xl border-2 border-[#10b981] max-w-md">
          <div className="bg-[#10b981] text-white px-4 py-2 flex justify-between items-center rounded-t-lg">
            <span className="font-medium">Immagine Originale</span>
            <button onClick={() => setShowReference(false)} className="text-white hover:text-gray-200">
              ✕
            </button>
          </div>
          <div className="p-2 max-h-96 overflow-auto">
            <img src={pngOriginalUrl} alt="Originale" className="w-full h-auto" />
          </div>
        </div>
      )}
    </div>
  );
}

export default SlotEditorV3;
