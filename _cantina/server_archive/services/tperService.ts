/**
 * TPER Bologna API Integration Service
 * 
 * Integrazione con le API Open Data di TPER (Trasporto Passeggeri Emilia-Romagna)
 * per ottenere dati real-time su fermate bus, orari e posizioni.
 */

import axios from 'axios';
import { getDb } from '../db';
import { mobilityData } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { parseStringPromise } from 'xml2js';

// Endpoint API TPER
const TPER_REALTIME_BASE = 'https://hellobuswsweb.tper.it/web-services/hello-bus.asmx';
const TPER_OPENDATA_BASE = 'https://opendata.comune.bologna.it/api/explore/v2.1/catalog/datasets';
// const TPER_HELLOBUS_WSDL = 'https://hellobuswsweb.tper.it/web-services/hello-bus.asmx';

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
	  const url = `${TPER_OPENDATA_BASE}/tper-fermate-autobus/records`;
	  console.log(`[TPER Service] Chiamata TPER Open Data: ${url}`);
	  try {
	    const response = await axios.get(url, {
      params: {
        limit: 5000,
        where: 'comune="BOLOGNA"',
        select: 'codice,codice_linea,denominazione,ubicazione,comune,geopoint,quartiere'
      },
      timeout: 15000, // 15s timeout for external TPER API
    });

    console.log(`[TPER Service] Risposta API TPER (Status: ${response.status}, Body: ${JSON.stringify(response.data).substring(0, 200)}...)`);
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
  } catch (error: any) {
	    console.error('[TPER Service] Errore nel recupero delle fermate:', error.message, error.stack);
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

    const response = await axios.post(TPER_REALTIME_BASE, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'https://hellobuswsweb.tper.it/web-services/hello-bus.asmx/QueryHellobus'
      },
      timeout: 10000, // 10s timeout for TPER SOAP real-time API
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
  } catch (error: any) {
	    console.error(`[TPER Service] Errore nel recupero orari per fermata ${stopCode}, linea ${lineNumber}:`, error.message);
	    return null;
	  }
}

/**
 * Sincronizza i dati TPER con il database locale
 * Carica tutte le fermate da Open Data Bologna (senza Hello Bus per velocità)
 */
export async function syncTPERData() {
  console.log('[TPER Service] Inizio sincronizzazione dati TPER...');
  
  try {
    // 1. Recupero TUTTE le fermate da Open Data Bologna
    const stops = await getTPERStops();
    console.log(`[TPER Service] Recuperate ${stops.length} fermate`);

    // 2. Converto in formato mobility_data (SENZA chiamare Hello Bus)
    const mobilityData = stops.map(stop => ({
      marketId: 1, // Assumiamo marketId di default 1 per Bologna

      type: 'bus',
      lineNumber: stop.lineCode,
      lineName: `Linea ${stop.lineCode}`,
      stopName: stop.name,
      lat: stop.lat.toString(),
      lng: stop.lng.toString(),
      status: 'active', // Assumiamo tutte attive
      nextArrival: undefined, // Non abbiamo dati real-time (lasciamo undefined per Drizzle)
      occupancy: undefined, // TPER non fornisce dati di occupazione (lasciamo undefined per Drizzle)
      updatedAt: new Date()
    }));

    console.log(`[TPER Service] Sincronizzati ${mobilityData.length} dati mobilità`);
    return mobilityData;
  } catch (error: any) {
	    console.error('[TPER Service] Errore durante la sincronizzazione:', error.message);
	    throw error;
	  }
}


/**
 * Aggiorna i dati real-time per tutte le fermate nel database
 */
export async function updateTPERRealtimeData() {
  console.log('[TPER Service] Inizio aggiornamento dati real-time...');
  
  try {
    // 1. Recupero tutte le fermate dal database
    const db = await getDb();
    if (!db) {
      console.error('[TPER Service] Database connection not available');
      return;
    }
    const stops = await db.select().from(mobilityData).where(eq(mobilityData.type, 'bus'));
    console.log(`[TPER Service] Recuperate ${stops.length} fermate dal database`);

    // 2. Per ogni fermata, recupero i dati real-time
    for (const stop of stops) {
      if (stop.lineNumber) {
        const busTime = await getTPERBusTimes(stop.id, stop.lineNumber);
        if (busTime) {
          await db.update(mobilityData).set({
            nextArrival: busTime.nextArrival,
            status: busTime.status,
            updatedAt: new Date()
          }).where(eq(mobilityData.id, stop.id));
        }
      }
    }

    console.log('[TPER Service] Aggiornamento dati real-time completato');
  } catch (error: any) {
	    console.error('[TPER Service] Errore durante l\'aggiornamento real-time:', error.message);
	    throw error;
	  }
}
