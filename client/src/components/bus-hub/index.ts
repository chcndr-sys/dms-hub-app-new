/**
 * BUS HUB Components - Sistema di digitalizzazione mercati
 * 
 * Workflow:
 * 1. PngTransparentTool - Rimozione sfondo da piante mercato (PDF/immagini)
 * 2. SlotEditorV3 - Posizionamento georeferenziato posteggi su OpenStreetMap
 * 3. BusHubEditor - Orchestrazione workflow completo con salvataggio database
 * 
 * Sistema Bus:
 * - DMSBUS - Trasferimento dati tra step via IndexedDB/localStorage
 */

export { PngTransparentTool } from './PngTransparentTool';
export { SlotEditorV3 } from './SlotEditorV3';
export { BusHubEditor } from './BusHubEditor';
export { DMSBUS } from './dmsBus';
export type { 
  PngMeta, 
  PlantPosition, 
  StallData, 
  MarkerData, 
  AreaData, 
  MarketProject 
} from './dmsBus';
