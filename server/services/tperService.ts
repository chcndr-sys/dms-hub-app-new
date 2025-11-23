/**
 * TPER Bologna API Integration Service
 * 
 * Integrazione con le API Open Data di TPER (Trasporto Passeggeri Emilia-Romagna)
 * per ottenere dati real-time su fermate bus, orari e posizioni.
 */

import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// Endpoint API TPER
const TPER_OPENDATA_BASE = 'https://opendata.comune.bologna.it/api/explore/v2.1/catalog/datasets';
const TPER_HELLOBUS_WSDL = 'https://hellobuswsweb.tper.it/web-services/hello-bus.asmx';

/**
 * Interfaccia per una fermata bus TPER
 */
export interface TPERStop {
  code: number;
  lineCode: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  zone?: string;
}

/**
 * Interfaccia per orari bus real-time
 */
export interface TPERBusTime {
  stopCode: number;
  lineNumber: string;
  nextArrival: number; // minuti
  status: 'active' | 'delayed' | 'suspended';
}

/**
 * Ottiene tutte le fermate bus di Bologna
 */
export async function getTPERStops(): Promise<TPERStop[]> {
  try {
    const response = await axios.get(`${TPER_OPENDATA_BASE}/tper-fermate-autobus/records`, {
      params: {
        limit: 100, // Limitiamo a 100 per non sovraccaricare
        where: 'comune="BOLOGNA"',
        select: 'codice,codice_linea,denominazione,ubicazione,comune,geopoint,quartiere'
      }
    });

    const stops: TPERStop[] = response.data.results.map((record: any) => ({
      code: record.codice,
      lineCode: record.codice_linea,
      name: record.denominazione,
      address: record.ubicazione,
      city: record.comune,
      lat: record.geopoint.lat,
      lng: record.geopoint.lon,
      zone: record.quartiere
    }));

    return stops;
  } catch (error) {
    console.error('[TPER Service] Errore nel recupero delle fermate:', error);
    throw new Error('Impossibile recuperare le fermate TPER');
  }
}

/**
 * Ottiene gli orari real-time per una fermata e linea specifica
 * usando il servizio SOAP Hello Bus
 */
export async function getTPERBusTimes(stopCode: number, lineNumber: string): Promise<TPERBusTime | null> {
  try {
    // Costruisco la richiesta SOAP
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <QueryHellobus xmlns="https://hellobuswsweb.tper.it/web-services/hello-bus.asmx">
      <fermata>${stopCode}</fermata>
      <linea>${lineNumber}</linea>
      <oraHHMM></oraHHMM>
    </QueryHellobus>
  </soap:Body>
</soap:Envelope>`;

    const response = await axios.post(TPER_HELLOBUS_WSDL, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'https://hellobuswsweb.tper.it/web-services/hello-bus.asmx/QueryHellobus'
      }
    });

    // Parse della risposta XML
    const result = await parseStringPromise(response.data);
    const busResult = result['soap:Envelope']['soap:Body'][0]['QueryHellobusResponse'][0]['QueryHellobusResult'][0];

    // Estraggo i minuti di attesa dal risultato
    // Il formato è tipo: "Linea 27: 5 min, 15 min"
    const match = busResult.match(/(\d+)\s*min/);
    const nextArrival = match ? parseInt(match[1]) : 0;

    return {
      stopCode,
      lineNumber,
      nextArrival,
      status: nextArrival > 0 ? 'active' : 'suspended'
    };
  } catch (error) {
    console.error(`[TPER Service] Errore nel recupero orari per fermata ${stopCode}, linea ${lineNumber}:`, error);
    return null;
  }
}

/**
 * Sincronizza i dati TPER con il database locale
 */
export async function syncTPERData() {
  console.log('[TPER Service] Inizio sincronizzazione dati TPER...');
  
  try {
    // 1. Recupero le fermate
    const stops = await getTPERStops();
    console.log(`[TPER Service] Recuperate ${stops.length} fermate`);

    // 2. Per ogni fermata, recupero gli orari (solo per le prime 10 per non sovraccaricare)
    const mobilityData = [];
    for (const stop of stops.slice(0, 10)) {
      const busTime = await getTPERBusTimes(stop.code, stop.lineCode);
      
      if (busTime) {
        mobilityData.push({
          type: 'bus',
          lineNumber: stop.lineCode,
          lineName: `Linea ${stop.lineCode}`,
          stopName: stop.name,
          lat: stop.lat.toString(),
          lng: stop.lng.toString(),
          status: busTime.status,
          nextArrival: busTime.nextArrival,
          occupancy: null, // TPER non fornisce dati di occupazione
          updatedAt: new Date()
        });
      }

      // Pausa di 500ms tra le richieste per non sovraccaricare il server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[TPER Service] Sincronizzati ${mobilityData.length} dati mobilità`);
    return mobilityData;
  } catch (error) {
    console.error('[TPER Service] Errore durante la sincronizzazione:', error);
    throw error;
  }
}
