/**
 * Configurazione Endpoint Reali - DMS HUB
 * 
 * Questo file contiene la configurazione di tutti gli endpoint REALI
 * utilizzati dal sistema DMS HUB, organizzati per categoria.
 * 
 * Base URL: https://orchestratore.mio-hub.me
 */

export const API_BASE_URL = 'https://orchestratore.mio-hub.me';

export interface EndpointConfig {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  name: string;
  description: string;
  category: string;
  exampleParams?: Record<string, any>;
  exampleBody?: Record<string, any>;
  exampleResponse?: Record<string, any>;
  requiresAuth?: boolean;
  notes?: string;
}

/**
 * CATEGORIA: MERCATI
 * Gestione mercati e informazioni generali
 */
export const marketsEndpoints: EndpointConfig[] = [
  {
    id: 'markets-list',
    method: 'GET',
    path: '/api/markets',
    name: 'Lista Mercati',
    description: 'Ottieni la lista completa di tutti i mercati configurati nel sistema',
    category: 'Mercati',
    exampleResponse: {
      success: true,
      data: [
        {
          id: 1,
          code: 'GR001',
          name: 'Mercato Grosseto',
          municipality: 'Grosseto',
          days: 'Martedì, Giovedì',
          total_stalls: 160,
          status: 'active',
          gis_market_id: 'grosseto-market',
          latitude: '42.75855600',
          longitude: '11.11423200'
        }
      ],
      count: 1
    },
    notes: 'Endpoint principale per ottenere tutti i mercati. Usato nella dashboard e nelle selezioni.'
  },
  {
    id: 'markets-get-by-id',
    method: 'GET',
    path: '/api/markets/:id',
    name: 'Dettaglio Mercato',
    description: 'Ottieni i dettagli completi di un mercato specifico tramite ID',
    category: 'Mercati',
    exampleParams: { id: 1 },
    exampleResponse: {
      success: true,
      data: {
        id: 1,
        code: 'GR001',
        name: 'Mercato Grosseto',
        municipality: 'Grosseto',
        days: 'Martedì, Giovedì',
        total_stalls: 160,
        status: 'active',
        gis_market_id: 'grosseto-market',
        latitude: '42.75855600',
        longitude: '11.11423200',
        created_at: '2025-11-21T23:52:05.623Z',
        updated_at: '2025-11-21T23:52:05.623Z'
      }
    },
    notes: 'Usato per visualizzare dettagli specifici di un mercato selezionato.'
  },
  {
    id: 'markets-stalls',
    method: 'GET',
    path: '/api/markets/:id/stalls',
    name: 'Posteggi per Mercato',
    description: 'Ottieni tutti i posteggi di un mercato specifico con stato e assegnazioni',
    category: 'Mercati',
    exampleParams: { id: 1 },
    exampleResponse: {
      success: true,
      data: [
        {
          id: 1,
          market_id: 1,
          number: '1',
          gis_slot_id: 'slot-1',
          width: '4.00',
          depth: '7.60',
          type: 'standard',
          status: 'occupied',
          orientation: '45.5',
          concession_id: 1,
          vendor_id: 1,
          concession_type: 'annual',
          vendor_business_name: 'Frutta e Verdura Bio SRL',
          vendor_contact_name: 'Mario Rossi'
        }
      ],
      count: 160
    },
    notes: 'Endpoint CRITICO usato da MarketMapComponent per colorare i posteggi sulla mappa.'
  }
];

/**
 * CATEGORIA: POSTEGGI
 * Gestione singoli posteggi
 */
export const stallsEndpoints: EndpointConfig[] = [
  {
    id: 'stalls-get-by-id',
    method: 'GET',
    path: '/api/stalls/:id',
    name: 'Dettaglio Posteggio',
    description: 'Ottieni i dettagli completi di un posteggio specifico',
    category: 'Posteggi',
    exampleParams: { id: 1 },
    exampleResponse: {
      success: true,
      data: {
        id: 1,
        market_id: 1,
        number: '1',
        gis_slot_id: 'slot-1',
        width: '4.00',
        depth: '7.60',
        type: 'standard',
        status: 'occupied',
        orientation: '45.5',
        notes: null,
        concession_id: 1,
        vendor_id: 1
      }
    }
  },
  {
    id: 'stalls-update-status',
    method: 'PATCH',
    path: '/api/stalls/:id/status',
    name: 'Aggiorna Stato Posteggio',
    description: 'Modifica lo stato di un posteggio (free, occupied, reserved)',
    category: 'Posteggi',
    exampleParams: { id: 1 },
    exampleBody: {
      status: 'free'
    },
    exampleResponse: {
      success: true,
      data: {
        id: 1,
        status: 'free',
        updated_at: '2025-11-22T16:00:00.000Z'
      }
    },
    notes: 'Usato per liberare/occupare/riservare posteggi manualmente.'
  }
];

/**
 * CATEGORIA: OPERATORI
 * Gestione venditori/ambulanti
 */
export const vendorsEndpoints: EndpointConfig[] = [
  {
    id: 'vendors-list',
    method: 'GET',
    path: '/api/vendors',
    name: 'Lista Operatori',
    description: 'Ottieni la lista completa di tutti i venditori/ambulanti registrati',
    category: 'Operatori',
    exampleResponse: {
      success: true,
      data: [
        {
          id: 1,
          code: 'VEN001',
          business_name: 'Frutta e Verdura Bio SRL',
          vat_number: 'IT12345678901',
          contact_name: 'Mario Rossi',
          phone: '+39 0564 123456',
          email: 'mario.rossi@fruttivendolo.it',
          status: 'active'
        }
      ],
      count: 5
    }
  },
  {
    id: 'vendors-create',
    method: 'POST',
    path: '/api/vendors',
    name: 'Crea Operatore',
    description: 'Registra un nuovo venditore/ambulante nel sistema',
    category: 'Operatori',
    exampleBody: {
      code: 'VEN006',
      business_name: 'Salumeria Toscana',
      vat_number: 'IT98765432109',
      contact_name: 'Luigi Bianchi',
      phone: '+39 0564 987654',
      email: 'luigi@salumeria.it',
      status: 'active'
    },
    exampleResponse: {
      success: true,
      data: {
        id: 6,
        code: 'VEN006',
        business_name: 'Salumeria Toscana',
        created_at: '2025-11-22T16:00:00.000Z'
      }
    }
  }
];

/**
 * CATEGORIA: CONCESSIONI
 * Gestione assegnazioni posteggi
 */
export const concessionsEndpoints: EndpointConfig[] = [
  {
    id: 'concessions-list',
    method: 'GET',
    path: '/api/concessions',
    name: 'Lista Concessioni',
    description: 'Ottieni tutte le concessioni attive (assegnazioni posteggi a venditori)',
    category: 'Concessioni',
    exampleResponse: {
      success: true,
      data: [
        {
          id: 1,
          vendor_id: 1,
          stall_id: 1,
          market_id: 1,
          type: 'annual',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          status: 'active'
        }
      ],
      count: 5
    }
  }
];

/**
 * CATEGORIA: GIS / MAPPA MERCATO
 * Dati geografici e geometrie
 */
export const gisEndpoints: EndpointConfig[] = [
  {
    id: 'gis-market-map',
    method: 'GET',
    path: '/api/gis/market-map',
    name: 'Dati GeoJSON Mappa Mercato',
    description: 'Ottieni il GeoJSON completo con geometrie di tutti i 160 posteggi del mercato',
    category: 'GIS',
    exampleResponse: {
      success: true,
      data: {
        stalls_geojson: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[[11.114232, 42.758556], [11.114245, 42.758568]]]
              },
              properties: {
                number: '1',
                orientation: 45.5,
                kind: 'slot',
                status: 'free',
                dimensions: '4.0m × 7.6m'
              }
            }
          ]
        },
        markers_geojson: {
          type: 'FeatureCollection',
          features: []
        },
        areas_geojson: {
          type: 'FeatureCollection',
          features: []
        }
      },
      meta: {
        endpoint: 'gis.marketMap',
        timestamp: '2025-11-22T16:00:00.000Z',
        source: 'editor-v3-full.json',
        stalls_count: 160
      }
    },
    notes: 'Endpoint CRITICO per MarketMapComponent. Contiene le geometrie precise dei posteggi.'
  }
];

/**
 * CATEGORIA: MOBILITÀ / TPER
 * Dati trasporto pubblico e mobilità urbana
 */
export const mobilityEndpoints: EndpointConfig[] = [
  {
    id: 'mobility-list',
    method: 'GET',
    path: '/api/trpc/mobility.list',
    name: 'Lista Dati Mobilità',
    description: 'Ottieni tutti i dati di mobilità salvati nel database (bus, tram, parcheggi)',
    category: 'Mobilità',
    exampleResponse: {
      result: {
        data: [
          {
            id: 1,
            type: 'bus',
            stopName: 'Stazione Centrale',
            lineNumber: '27',
            lineName: 'Stazione - Ospedale',
            lat: '44.4949',
            lng: '11.3426',
            nextArrival: 5,
            status: 'active'
          }
        ]
      }
    },
    notes: 'Usato da MobilityMap per visualizzare fermate su mappa. Legge da tabella mobility_data.'
  },
  {
    id: 'mobility-tper-stops',
    method: 'GET',
    path: '/api/trpc/mobility.tper.stops',
    name: 'Fermate TPER Bologna',
    description: 'Recupera le fermate bus TPER da API esterna Bologna Open Data (21,175 fermate)',
    category: 'Mobilità',
    exampleResponse: {
      result: {
        data: {
          total_count: 21175,
          results: [
            {
              codice_fermata: '1001',
              denominazione: 'Stazione Centrale',
              coordinate: {
                lat: 44.4949,
                lon: 11.3426
              }
            }
          ]
        }
      }
    },
    notes: 'Chiama API esterna Bologna Open Data. NON salva nel database, solo visualizzazione.'
  },
  {
    id: 'mobility-tper-sync',
    method: 'POST',
    path: '/api/trpc/mobility.tper.sync',
    name: '🔄 Sincronizza TPER',
    description: 'SINCRONIZZA i dati TPER nel database. Recupera fermate da API esterna e le salva in mobility_data.',
    category: 'Mobilità',
    exampleBody: {},
    exampleResponse: {
      result: {
        data: {
          success: true,
          count: 21175,
          message: 'Dati TPER sincronizzati con successo'
        }
      }
    },
    notes: '⚠️ ENDPOINT CRITICO! Popola la tabella mobility_data. Chiamare PRIMA di visualizzare la mappa Centro Mobilità.'
  }
];

/**
 * TUTTI GLI ENDPOINT ORGANIZZATI
 */
export const allRealEndpoints: EndpointConfig[] = [
  ...marketsEndpoints,
  ...stallsEndpoints,
  ...vendorsEndpoints,
  ...concessionsEndpoints,
  ...gisEndpoints,
  ...mobilityEndpoints
];

/**
 * INTEGRAZIONI ESTERNE
 */
export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  status: 'active' | 'in_preparation' | 'inactive';
  dataOwner: string;
  notes: string;
  endpoints?: string[];
}

export const integrations: IntegrationConfig[] = [
  {
    id: 'dms-legacy',
    name: 'DMS Legacy (Heroku)',
    description: 'Sistema DMS precedente ospitato su Heroku. Contiene dati storici e alcune funzionalità legacy ancora in uso.',
    baseUrl: 'https://dms-legacy.herokuapp.com',
    status: 'in_preparation',
    dataOwner: 'DMS Legacy',
    notes: 'In fase di migrazione verso il nuovo sistema. Alcuni dati devono ancora essere sincronizzati. Master dei dati: DMS Legacy per dati storici pre-2025.',
    endpoints: [
      '/api/legacy/markets',
      '/api/legacy/vendors',
      '/api/legacy/transactions'
    ]
  },
  {
    id: 'pepe-gis',
    name: 'Pepe GIS / Market Map',
    description: 'Sistema GIS per la gestione delle mappe dei mercati. Fornisce geometrie precise dei posteggi e dati geografici.',
    baseUrl: 'https://orchestratore.mio-hub.me',
    status: 'active',
    dataOwner: 'Pepe GIS Editor',
    notes: 'Master dei dati: Pepe GIS per geometrie e coordinate. File sorgente: editor-v3-full.json. Alimenta MarketMapComponent con 160 posteggi del Mercato Grosseto.',
    endpoints: [
      '/api/gis/market-map'
    ]
  },
  {
    id: 'mobility-tper',
    name: 'Mobility / TPER',
    description: 'Sistema di mobilità urbana e trasporto pubblico. Fornisce dati su fermate bus, tram e parcheggi.',
    baseUrl: 'https://api.tper.it',
    status: 'in_preparation',
    dataOwner: 'TPER / Comune',
    notes: 'Collegato a MobilityMap.tsx (Centro Mobilità). API esterne TPER non ancora integrate direttamente. Dati attualmente mock nel frontend.',
    endpoints: [
      '/api/mobility/stops',
      '/api/mobility/lines',
      '/api/mobility/parking'
    ]
  }
];
