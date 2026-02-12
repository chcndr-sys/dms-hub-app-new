/**
 * Configurazione Endpoint Reali - DMS HUB
 * 
 * Questo file contiene la configurazione di tutti gli endpoint REALI
 * utilizzati dal sistema DMS HUB, organizzati per categoria.
 * 
 * Base URL: https://orchestratore.mio-hub.me
 */

// AGGIORNATO: 28 novembre 2025 - Audit endpoint reali
// Solo endpoint FUNZIONANTI (testati con curl, 200 OK)
// ⚠️ ATTENZIONE: Endpoint /api/dmsHub/* NON DEPLOYATI su Hetzner production
//    Backend Hetzner non ha commit fe1eab7, serve deploy manuale
//    Runbook: docs/deploy/MIHUB_BACKEND_HETZNER_MANUALE.md
export const API_BASE_URL = 'https://mihub.157-90-29-66.nip.io';

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
    notes: '✅ FUNZIONANTE - Testato 28/11/2025 - Endpoint principale per ottenere tutti i mercati. Usato nella dashboard e nelle selezioni.'
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
    notes: '✅ FUNZIONANTE - Testato 28/11/2025 - Usato per visualizzare dettagli specifici di un mercato selezionato.'
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
    notes: '✅ FUNZIONANTE - Testato 28/11/2025 - Endpoint CRITICO usato da MarketMapComponent per colorare i posteggi sulla mappa. 160 posteggi Grosseto.'
  }
];

/**
 * CATEGORIA: POSTEGGI
 * Gestione singoli posteggi
 */
// ⚠️ ENDPOINT NON TESTATI - Richiede body JSON e possibile autenticazione
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
// ⚠️ ENDPOINT PARZIALMENTE FUNZIONANTI - GET /api/vendors funziona ma DB vuoto
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
      count: 0
    },
    notes: '✅ FUNZIONANTE - Testato 28/11/2025 - Lista vuota (nessun vendor nel database Neon)'
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
// ⚠️ ENDPOINT NON TESTATI
// ❌ ENDPOINT NON DEPLOYATI - Backend Hetzner non ha commit fe1eab7
// Implementati in codice ma 404 NOT FOUND su production
// Runbook deploy: docs/deploy/MIHUB_BACKEND_HETZNER_MANUALE.md
export const dmsHubEndpoints: EndpointConfig[] = [
  {
    id: 'dmshub-markets-list',
    method: 'GET',
    path: '/api/dmsHub/markets/list',
    description: 'Lista mercati (formato DMS Hub)',
    mockResponse: {
      success: true,
      data: [{ id: 1, code: 'GR001', name: 'Mercato Grosseto' }],
      count: 1
    },
    notes: '❌ NON DEPLOYATO - 404 NOT FOUND - Backend Hetzner non ha commit fe1eab7'
  },
  {
    id: 'dmshub-markets-getbyid',
    method: 'GET',
    path: '/api/dmsHub/markets/getById',
    description: 'Dettagli mercato per ID (formato DMS Hub)',
    mockResponse: {
      success: true,
      data: { id: 1, code: 'GR001', name: 'Mercato Grosseto' }
    },
    notes: '❌ NON DEPLOYATO - 404 NOT FOUND - Backend Hetzner non ha commit fe1eab7'
  },
  {
    id: 'dmshub-stalls-listbymarket',
    method: 'GET',
    path: '/api/dmsHub/stalls/listByMarket',
    description: 'Lista posteggi per mercato (formato DMS Hub)',
    mockResponse: {
      success: true,
      data: [],
      count: 160
    },
    notes: '❌ NON DEPLOYATO - 404 NOT FOUND - Backend Hetzner non ha commit fe1eab7'
  },
  {
    id: 'dmshub-vendors-list',
    method: 'GET',
    path: '/api/dmsHub/vendors/list',
    description: 'Lista vendor/imprese (formato DMS Hub)',
    mockResponse: {
      success: true,
      data: [],
      count: 0
    },
    notes: '❌ NON DEPLOYATO - 404 NOT FOUND - Backend Hetzner non ha commit fe1eab7'
  },
  {
    id: 'dmshub-concessions-list',
    method: 'GET',
    path: '/api/dmsHub/concessions/list',
    description: 'Lista concessioni (formato DMS Hub)',
    mockResponse: {
      success: true,
      data: [],
      count: 0
    },
    notes: '❌ NON DEPLOYATO - 404 NOT FOUND - Backend Hetzner non ha commit fe1eab7'
  }
];

/**
 * CATEGORIA: CONCESSIONI
 * Gestione assegnazioni posteggi
 */
// ⚠️ ENDPOINT NON TESTATI
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
      data: [{ id: 1, vendor_id: 1, stall_id: 1, market_id: 1, type: 'annual', status: 'ATTIVA' }],
      count: 21
    },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'concessions-get-by-id',
    method: 'GET',
    path: '/api/concessions/:id',
    name: 'Dettaglio Concessione',
    description: 'Ottieni i dettagli completi di una concessione specifica',
    category: 'Concessioni',
    exampleParams: { id: 36 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'concessions-create',
    method: 'POST',
    path: '/api/concessions',
    name: 'Crea Concessione',
    description: 'Crea una nuova concessione (assegnazione posteggio)',
    category: 'Concessioni',
    exampleBody: { market_id: 1, stall_id: 152, vendor_id: 11, type: 'fisso' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'concessions-create-full',
    method: 'POST',
    path: '/api/concessions/full',
    name: 'Crea Concessione Completa',
    description: 'Crea concessione con tutti i 60+ campi da SCIA, gestisce subingresso automatico',
    category: 'Concessioni',
    exampleBody: { market_id: 1, stall_id: 152, impresa_id: 2, tipo_concessione: 'subingresso' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026 - Gestisce trasferimento wallet e cessazione vecchia concessione'
  },
  {
    id: 'concessions-update',
    method: 'PUT',
    path: '/api/concessions/:id',
    name: 'Aggiorna Concessione',
    description: 'Aggiorna tutti i campi di una concessione esistente',
    category: 'Concessioni',
    exampleParams: { id: 36 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'concessions-patch',
    method: 'PATCH',
    path: '/api/concessions/:id',
    name: 'Aggiorna Parziale Concessione',
    description: 'Aggiorna campi specifici: stato, scia_id, comune_rilascio, durata_anni, etc.',
    category: 'Concessioni',
    exampleParams: { id: 36 },
    exampleBody: { scia_id: 'uuid-pratica', stato: 'ATTIVA' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'concessions-delete',
    method: 'DELETE',
    path: '/api/concessions/:id',
    name: 'Elimina Concessione',
    description: 'Elimina una concessione e libera il posteggio',
    category: 'Concessioni',
    exampleParams: { id: 36 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'concessions-associa-posteggio',
    method: 'POST',
    path: '/api/concessions/:id/associa-posteggio',
    name: 'Associa Posteggio',
    description: 'Associa un posteggio a una concessione esistente',
    category: 'Concessioni',
    exampleParams: { id: 36 },
    exampleBody: { stall_id: 152 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  }
];

/**
 * CATEGORIA: SUAP / PRATICHE
 * Gestione pratiche SCIA e workflow SUAP
 */
export const suapEndpoints: EndpointConfig[] = [
  {
    id: 'suap-stats',
    method: 'GET',
    path: '/api/suap/stats',
    name: 'Statistiche SUAP',
    description: 'Ottieni statistiche aggregate delle pratiche SUAP',
    category: 'SUAP',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-list',
    method: 'GET',
    path: '/api/suap/pratiche',
    name: 'Lista Pratiche SCIA',
    description: 'Ottieni tutte le pratiche SCIA con filtri opzionali',
    category: 'SUAP',
    exampleResponse: { success: true, data: [], count: 0 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-get',
    method: 'GET',
    path: '/api/suap/pratiche/:id',
    name: 'Dettaglio Pratica SCIA',
    description: 'Ottieni dettagli completi di una pratica SCIA con checks, eventi, documenti',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-create',
    method: 'POST',
    path: '/api/suap/pratiche',
    name: 'Crea Pratica SCIA',
    description: 'Crea una nuova pratica SCIA nel sistema',
    category: 'SUAP',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-patch',
    method: 'PATCH',
    path: '/api/suap/pratiche/:id',
    name: 'Aggiorna Pratica SCIA',
    description: 'Aggiorna campi pratica: concessione_id, stato, note, esito',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    exampleBody: { concessione_id: 36, stato: 'APPROVED' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026 - Nuovo endpoint'
  },
  {
    id: 'suap-pratiche-valuta',
    method: 'POST',
    path: '/api/suap/pratiche/:id/valuta',
    name: 'Valuta Pratica',
    description: 'Esegue valutazione automatica della pratica SCIA',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-stato',
    method: 'POST',
    path: '/api/suap/pratiche/:id/stato',
    name: 'Cambia Stato Pratica',
    description: 'Cambio stato manuale della pratica con motivazione',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    exampleBody: { nuovo_stato: 'APPROVED', motivazione: 'Approvata' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-refresh',
    method: 'POST',
    path: '/api/suap/pratiche/:id/refresh',
    name: 'Refresh Dati Pratica',
    description: 'Aggiorna dati pratica con enrichment esterno',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-checks',
    method: 'GET',
    path: '/api/suap/pratiche/:id/checks',
    name: 'Lista Verifiche Pratica',
    description: 'Ottieni tutte le verifiche eseguite sulla pratica',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-checks-create',
    method: 'POST',
    path: '/api/suap/pratiche/:id/checks',
    name: 'Registra Verifica Manuale',
    description: 'Registra esito di una verifica manuale',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    exampleBody: { check_code: 'CHECK_DURC', esito: true, dettaglio: 'DURC valido' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-eventi',
    method: 'GET',
    path: '/api/suap/pratiche/:id/eventi',
    name: 'Storico Eventi Pratica',
    description: 'Ottieni lo storico di tutti gli eventi della pratica',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-documenti',
    method: 'GET',
    path: '/api/suap/pratiche/:id/documenti',
    name: 'Lista Documenti Pratica',
    description: 'Ottieni tutti i documenti allegati alla pratica',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-documenti-upload',
    method: 'POST',
    path: '/api/suap/pratiche/:id/documenti',
    name: 'Upload Documento',
    description: 'Carica un documento allegato alla pratica (multipart/form-data)',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-documenti-download',
    method: 'GET',
    path: '/api/suap/documenti/:docId/download',
    name: 'Download Documento',
    description: 'Scarica un documento allegato tramite URL firmato S3',
    category: 'SUAP',
    exampleParams: { docId: 'uuid-documento' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-azioni',
    method: 'GET',
    path: '/api/suap/pratiche/:id/azioni',
    name: 'Lista Azioni Workflow',
    description: 'Ottieni tutte le azioni workflow della pratica',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-pratiche-azioni-create',
    method: 'POST',
    path: '/api/suap/pratiche/:id/azioni',
    name: 'Crea Azione Workflow',
    description: 'Crea una nuova azione nel workflow della pratica',
    category: 'SUAP',
    exampleParams: { id: 'uuid-pratica' },
    exampleBody: { tipo_azione: 'RICHIESTA_INTEGRAZIONE', payload: {} },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-regole',
    method: 'GET',
    path: '/api/suap/regole',
    name: 'Lista Regole Valutazione',
    description: 'Ottieni tutte le regole di valutazione configurate',
    category: 'SUAP',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-regole-update',
    method: 'PUT',
    path: '/api/suap/regole/:checkCode',
    name: 'Aggiorna Regola',
    description: 'Aggiorna configurazione di una regola di valutazione',
    category: 'SUAP',
    exampleParams: { checkCode: 'CHECK_DURC' },
    exampleBody: { enabled: true, peso: 10 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'suap-import',
    method: 'POST',
    path: '/api/suap/import',
    name: 'Import Pratiche',
    description: 'Importa pratiche SCIA da file o sistema esterno',
    category: 'SUAP',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  }
];

/**
 * CATEGORIA: WALLETS
 * Gestione wallet PagoPA e transazioni
 */
export const walletsEndpoints: EndpointConfig[] = [
  {
    id: 'wallets-list',
    method: 'GET',
    path: '/api/wallets',
    name: 'Lista Wallets',
    description: 'Ottieni tutti i wallet attivi nel sistema',
    category: 'Wallets',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-by-company',
    method: 'GET',
    path: '/api/wallets/company/:companyId',
    name: 'Wallets per Impresa',
    description: 'Ottieni tutti i wallet di una specifica impresa',
    category: 'Wallets',
    exampleParams: { companyId: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-transactions',
    method: 'GET',
    path: '/api/wallets/:id/transactions',
    name: 'Transazioni Wallet',
    description: 'Ottieni lo storico transazioni di un wallet',
    category: 'Wallets',
    exampleParams: { id: 1 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-create',
    method: 'POST',
    path: '/api/wallets',
    name: 'Crea Wallet',
    description: 'Crea un nuovo wallet per una concessione',
    category: 'Wallets',
    exampleBody: { concession_id: 36, company_id: 2, balance: 0 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-init',
    method: 'POST',
    path: '/api/wallets/init',
    name: 'Inizializza Schema Wallets',
    description: 'Crea le tabelle wallets e wallet_transactions se non esistono',
    category: 'Wallets',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-deposit',
    method: 'POST',
    path: '/api/wallets/deposit',
    name: 'Deposito Wallet',
    description: 'Effettua un deposito/ricarica su un wallet',
    category: 'Wallets',
    exampleBody: { wallet_id: 1, amount: 100, description: 'Ricarica PagoPA' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-withdraw',
    method: 'POST',
    path: '/api/wallets/withdraw',
    name: 'Prelievo Wallet',
    description: 'Effettua un prelievo/addebito da un wallet',
    category: 'Wallets',
    exampleBody: { wallet_id: 1, amount: 50, description: 'Canone mensile' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-calculate-fee',
    method: 'POST',
    path: '/api/wallets/calculate-annual-fee',
    name: 'Calcola Canone Annuale',
    description: 'Calcola il canone annuale basato su tariffa mercato e mq posteggio',
    category: 'Wallets',
    exampleBody: { market_id: 1, mq: 30.4 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'wallets-delete',
    method: 'DELETE',
    path: '/api/wallets/:id',
    name: 'Elimina Wallet',
    description: 'Elimina un wallet e tutte le sue transazioni (registra evento in storico)',
    category: 'Wallets',
    exampleParams: { id: 1 },
    notes: '✅ FUNZIONANTE - Testato 14/01/2026 - v3.34.0'
  },
  // === STORICO WALLET (v3.34.0) ===
  {
    id: 'wallet-history-list',
    method: 'GET',
    path: '/api/wallet-history',
    name: 'Storico Wallet',
    description: 'Ottieni lo storico di tutti gli eventi wallet (creazione, eliminazione, trasferimento)',
    category: 'Wallets',
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.34.0'
  },
  {
    id: 'wallet-history-by-id',
    method: 'GET',
    path: '/api/wallet-history/:wallet_id',
    name: 'Storico Singolo Wallet',
    description: 'Ottieni lo storico eventi di un wallet specifico',
    category: 'Wallets',
    exampleParams: { wallet_id: 1 },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.34.0'
  },
  {
    id: 'wallet-history-create',
    method: 'POST',
    path: '/api/wallet-history',
    name: 'Registra Evento Storico',
    description: 'Registra un nuovo evento nello storico wallet',
    category: 'Wallets',
    exampleBody: { wallet_id: 1, evento: 'ELIMINAZIONE', motivo: 'CESSAZIONE', saldo_al_momento: 150.50 },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.34.0'
  },
  {
    id: 'wallet-scadenze-list',
    method: 'GET',
    path: '/api/wallet-scadenze',
    name: 'Lista Scadenze Wallet',
    description: 'Ottieni tutte le scadenze di pagamento dei wallet',
    category: 'Wallets',
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.34.0'
  },
  {
    id: 'wallet-scadenze-calcola-mora',
    method: 'POST',
    path: '/api/wallet-scadenze/calcola-mora',
    name: 'Calcola Mora Scadenza',
    description: 'Calcola mora e interessi per una scadenza specifica',
    category: 'Wallets',
    exampleBody: { scadenza_id: 1 },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.34.0'
  },
  // === CANONE UNICO (v3.35.0) ===
  {
    id: 'canone-unico-riepilogo',
    method: 'GET',
    path: '/api/canone-unico/riepilogo',
    name: 'Riepilogo Canone Unico',
    description: 'Riepilogo scadenze canone con filtri per mercato, tipo operatore, impresa',
    category: 'Canone Unico',
    exampleParams: { mercato_id: 1, tipo_operatore: 'CONCESSIONE', stato: 'NON_PAGATO' },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.35.0'
  },
  {
    id: 'canone-unico-genera-annuo',
    method: 'POST',
    path: '/api/canone-unico/genera-canone-annuo',
    name: 'Genera Canone Annuo',
    description: 'Genera le scadenze del canone annuo per tutti i posteggi attivi',
    category: 'Canone Unico',
    exampleBody: { anno: 2026, mercato_id: 1, data_scadenza: '2026-03-31' },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.35.0'
  },
  {
    id: 'canone-unico-pagamento-straordinario',
    method: 'POST',
    path: '/api/canone-unico/genera-pagamento-straordinario',
    name: 'Genera Pagamento Straordinario',
    description: 'Genera avvisi di pagamento per un mercato/fiera straordinaria',
    category: 'Canone Unico',
    exampleBody: { mercato_id: 1, descrizione: 'Fiera Natale 2026', importo: 150, data_scadenza: '2026-12-15' },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.35.0'
  },
  {
    id: 'canone-unico-calcola-mora',
    method: 'POST',
    path: '/api/canone-unico/calcola-mora',
    name: 'Calcola Mora Canone',
    description: 'Calcola mora e interessi per una scadenza canone',
    category: 'Canone Unico',
    exampleBody: { scadenza_id: 1 },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.35.0'
  },
  {
    id: 'canone-unico-blocco-concessione',
    method: 'PUT',
    path: '/api/canone-unico/concessions/:id/status',
    name: 'Blocco/Sblocco Concessione',
    description: 'Blocca o sblocca manualmente una concessione per mancato pagamento',
    category: 'Canone Unico',
    exampleParams: { id: 1 },
    exampleBody: { status: 'SOSPESA', motivo: 'Mancato pagamento canone 2026' },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.35.0'
  },
  {
    id: 'canone-unico-impostazioni-get',
    method: 'GET',
    path: '/api/canone-unico/impostazioni/:comune_id',
    name: 'Impostazioni Blocco Comune',
    description: 'Recupera impostazioni blocco automatico per un comune',
    category: 'Canone Unico',
    exampleParams: { comune_id: 1 },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.35.0'
  },
  {
    id: 'canone-unico-impostazioni-update',
    method: 'PUT',
    path: '/api/canone-unico/impostazioni/:comune_id',
    name: 'Aggiorna Impostazioni Blocco',
    description: 'Aggiorna impostazioni blocco automatico per un comune',
    category: 'Canone Unico',
    exampleParams: { comune_id: 1 },
    exampleBody: { blocco_automatico_pagamenti: true, giorni_tolleranza_blocco: 30 },
    notes: '✅ FUNZIONANTE - Aggiunto 14/01/2026 - v3.35.0'
  }
];

/**
 * CATEGORIA: TARIFFE
 * Gestione tariffe mercato
 */
export const tariffsEndpoints: EndpointConfig[] = [
  {
    id: 'tariffs-by-market',
    method: 'GET',
    path: '/api/tariffs/:marketId',
    name: 'Tariffe Mercato',
    description: 'Ottieni le tariffe configurate per un mercato',
    category: 'Tariffe',
    exampleParams: { marketId: 1 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'tariffs-create',
    method: 'POST',
    path: '/api/tariffs',
    name: 'Crea Tariffa',
    description: 'Crea una nuova tariffa per un mercato',
    category: 'Tariffe',
    exampleBody: { market_id: 1, anno: 2026, tariffa_mq: 46.80 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  }
];

/**
 * CATEGORIA: IMPRESE
 * Gestione imprese e qualificazioni
 */
export const impreseEndpoints: EndpointConfig[] = [
  {
    id: 'imprese-list',
    method: 'GET',
    path: '/api/imprese',
    name: 'Lista Imprese',
    description: 'Ottieni tutte le imprese registrate nel sistema',
    category: 'Imprese',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-get',
    method: 'GET',
    path: '/api/imprese/:id',
    name: 'Dettaglio Impresa',
    description: 'Ottieni dettagli completi di una impresa',
    category: 'Imprese',
    exampleParams: { id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-create',
    method: 'POST',
    path: '/api/imprese',
    name: 'Crea Impresa',
    description: 'Registra una nuova impresa nel sistema',
    category: 'Imprese',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-update',
    method: 'PUT',
    path: '/api/imprese/:id',
    name: 'Aggiorna Impresa',
    description: 'Aggiorna i dati di una impresa esistente',
    category: 'Imprese',
    exampleParams: { id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-qualificazioni',
    method: 'GET',
    path: '/api/imprese/:id/qualificazioni',
    name: 'Qualificazioni Impresa',
    description: 'Ottieni tutte le qualificazioni di una impresa',
    category: 'Imprese',
    exampleParams: { id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-qualificazioni-create',
    method: 'POST',
    path: '/api/imprese/:id/qualificazioni',
    name: 'Crea Qualificazione',
    description: 'Aggiunge una nuova qualificazione a una impresa',
    category: 'Imprese',
    exampleParams: { id: 2 },
    exampleBody: { tipo: 'DURC', scadenza: '2026-12-31', stato: 'VALIDO' },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-qualificazioni-update',
    method: 'PUT',
    path: '/api/imprese/:id/qualificazioni/:qualId',
    name: 'Aggiorna Qualificazione',
    description: 'Aggiorna una qualificazione esistente',
    category: 'Imprese',
    exampleParams: { id: 2, qualId: 1 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-qualificazioni-delete',
    method: 'DELETE',
    path: '/api/imprese/:id/qualificazioni/:qualId',
    name: 'Elimina Qualificazione',
    description: 'Elimina una qualificazione da una impresa',
    category: 'Imprese',
    exampleParams: { id: 2, qualId: 1 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-rating',
    method: 'GET',
    path: '/api/imprese/:id/rating',
    name: 'Rating Impresa',
    description: 'Ottieni il rating calcolato di una impresa',
    category: 'Imprese',
    exampleParams: { id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-vetrina',
    method: 'PUT',
    path: '/api/imprese/:id/vetrina',
    name: 'Aggiorna Vetrina',
    description: 'Aggiorna i dati della vetrina pubblica impresa',
    category: 'Imprese',
    exampleParams: { id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-vetrina-upload',
    method: 'POST',
    path: '/api/imprese/:id/vetrina/upload',
    name: 'Upload Immagine Vetrina',
    description: 'Carica immagine per la vetrina impresa',
    category: 'Imprese',
    exampleParams: { id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'imprese-vetrina-delete-image',
    method: 'DELETE',
    path: '/api/imprese/:id/vetrina/gallery/:index',
    name: 'Elimina Immagine Vetrina',
    description: 'Elimina una immagine dalla galleria vetrina',
    category: 'Imprese',
    exampleParams: { id: 2, index: 0 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  }
];

/**
 * CATEGORIA: QUALIFICAZIONI
 * Endpoint dedicati qualificazioni
 */
export const qualificazioniEndpoints: EndpointConfig[] = [
  {
    id: 'qualificazioni-list',
    method: 'GET',
    path: '/api/qualificazioni',
    name: 'Lista Qualificazioni',
    description: 'Ottieni tutte le qualificazioni nel sistema',
    category: 'Qualificazioni',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'qualificazioni-by-impresa',
    method: 'GET',
    path: '/api/qualificazioni/impresa/:impresa_id',
    name: 'Qualificazioni per Impresa',
    description: 'Ottieni qualificazioni filtrate per impresa',
    category: 'Qualificazioni',
    exampleParams: { impresa_id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'qualificazioni-durc',
    method: 'GET',
    path: '/api/qualificazioni/durc/:impresa_id',
    name: 'DURC Impresa',
    description: 'Ottieni stato DURC di una impresa',
    category: 'Qualificazioni',
    exampleParams: { impresa_id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'qualificazioni-durc-create',
    method: 'POST',
    path: '/api/qualificazioni/durc',
    name: 'Crea DURC',
    description: 'Registra un nuovo DURC per una impresa',
    category: 'Qualificazioni',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'qualificazioni-suap',
    method: 'GET',
    path: '/api/qualificazioni/suap/:impresa_id',
    name: 'Qualificazioni SUAP',
    description: 'Ottieni qualificazioni SUAP di una impresa',
    category: 'Qualificazioni',
    exampleParams: { impresa_id: 2 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'qualificazioni-suap-create',
    method: 'POST',
    path: '/api/qualificazioni/suap',
    name: 'Crea Qualificazione SUAP',
    description: 'Registra una nuova qualificazione SUAP',
    category: 'Qualificazioni',
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  },
  {
    id: 'qualificazioni-suap-update',
    method: 'PUT',
    path: '/api/qualificazioni/suap/:id',
    name: 'Aggiorna Qualificazione SUAP',
    description: 'Aggiorna una qualificazione SUAP esistente',
    category: 'Qualificazioni',
    exampleParams: { id: 1 },
    notes: '✅ FUNZIONANTE - Testato 04/01/2026'
  }
];

/**
 * CATEGORIA: GIS / MAPPA MERCATO
 * Dati geografici e geometrie
 */
// ✅ ENDPOINT FUNZIONANTI (2/2)
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
    notes: '✅ FUNZIONANTE - Testato 28/11/2025 - Endpoint CRITICO per MarketMapComponent. Contiene le geometrie precise dei 160 posteggi Grosseto.'
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
    path: '/api/trpc/integrations.tper.stops',
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
    path: '/api/trpc/integrations.tper.sync',
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
 * CATEGORIA: ABACUS SQL
 * Query database Neon PostgreSQL per analisi dati
 */
export const abacusSqlEndpoints: EndpointConfig[] = [
  {
    id: 'abacus-sql-query',
    method: 'POST',
    path: '/api/abacus/sql/query',
    name: 'Execute SQL Query',
    description: 'Esegui query SQL read-only (SELECT) sul database Neon PostgreSQL',
    category: 'Abacus SQL',
    exampleBody: {
      sql: 'SELECT id, name, code FROM markets WHERE id = $1',
      params: [1]
    },
    exampleResponse: {
      success: true,
      data: {
        rows: [
          {
            id: 1,
            name: 'Mercato Grosseto',
            code: 'GR001'
          }
        ],
        rowCount: 1,
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 1043 },
          { name: 'code', dataTypeID: 1043 }
        ]
      }
    },
    notes: '⚠️ Solo query SELECT permesse per sicurezza. Parametrizzate con $1, $2, etc.'
  },
  {
    id: 'abacus-sql-count',
    method: 'POST',
    path: '/api/abacus/sql/count',
    name: 'Count Rows',
    description: 'Conta righe in una tabella con condizione WHERE opzionale',
    category: 'Abacus SQL',
    exampleBody: {
      table: 'stalls',
      where: 'market_id = $1 AND is_active = $2',
      params: [1, true]
    },
    exampleResponse: {
      success: true,
      data: {
        count: 160,
        table: 'stalls',
        where: 'market_id = $1 AND is_active = $2'
      }
    },
    notes: 'Utile per statistiche rapide senza scrivere query complete.'
  },
  {
    id: 'abacus-sql-tables',
    method: 'GET',
    path: '/api/abacus/sql/tables',
    name: 'List Tables',
    description: 'Lista tutte le tabelle disponibili nel database',
    category: 'Abacus SQL',
    exampleResponse: {
      success: true,
      data: {
        tables: [
          'markets',
          'stalls',
          'vendors',
          'concessions',
          'bookings',
          'inspections',
          'violations'
        ]
      }
    },
    notes: 'Mostra tutte le 52 tabelle del database Neon.'
  },
  {
    id: 'abacus-sql-schema',
    method: 'POST',
    path: '/api/abacus/sql/schema',
    name: 'Get Table Schema',
    description: 'Ottieni lo schema (colonne, tipi, nullable) di una tabella',
    category: 'Abacus SQL',
    exampleBody: {
      table: 'markets'
    },
    exampleResponse: {
      success: true,
      data: {
        table: 'markets',
        columns: [
          {
            column_name: 'id',
            data_type: 'integer',
            is_nullable: 'NO',
            column_default: "nextval('markets_id_seq'::regclass)"
          },
          {
            column_name: 'name',
            data_type: 'character varying',
            is_nullable: 'NO',
            column_default: null
          }
        ]
      }
    },
    notes: 'Utile per esplorare la struttura del database prima di scrivere query.'
  }
];

/**
 * CATEGORIA: ABACUS GITHUB
 * Accesso repository GitHub via proxy MIHUB
 */
export const abacusGithubEndpoints: EndpointConfig[] = [
  {
    id: 'abacus-github-list',
    method: 'POST',
    path: '/api/abacus/github/list',
    name: 'List Repository Files',
    description: 'Lista file e directory in un repository GitHub',
    category: 'Abacus GitHub',
    exampleBody: {
      owner: 'Chcndr',
      repo: 'MIO-hub',
      path: 'design'
    },
    exampleResponse: {
      success: true,
      data: [
        {
          name: 'backend-rest-hetzner.md',
          path: 'design/backend-rest-hetzner.md',
          type: 'file',
          size: 15420
        }
      ]
    },
    notes: 'Proxy MIHUB per accedere a GitHub senza esporre token al frontend.'
  },
  {
    id: 'abacus-github-get',
    method: 'POST',
    path: '/api/abacus/github/get',
    name: 'Get File Content',
    description: 'Leggi il contenuto di un file da repository GitHub',
    category: 'Abacus GitHub',
    exampleBody: {
      owner: 'Chcndr',
      repo: 'MIO-hub',
      path: 'design/backend-rest-hetzner.md'
    },
    exampleResponse: {
      success: true,
      data: {
        content: '# Backend REST Hetzner\n\nDocumentazione...',
        encoding: 'utf-8',
        sha: 'abc123def456'
      }
    },
    notes: 'Restituisce contenuto decodificato in UTF-8.'
  },
  {
    id: 'abacus-github-update',
    method: 'POST',
    path: '/api/abacus/github/update',
    name: 'Create/Update File',
    description: 'Crea o aggiorna un file in repository GitHub',
    category: 'Abacus GitHub',
    exampleBody: {
      owner: 'Chcndr',
      repo: 'MIO-hub',
      path: 'design/new-doc.md',
      content: '# New Documentation\n\nContent here...',
      message: 'Add new documentation',
      sha: 'abc123def456'
    },
    exampleResponse: {
      success: true,
      data: {
        commit: {
          sha: 'def789ghi012',
          message: 'Add new documentation'
        }
      }
    },
    notes: '⚠️ Richiede SHA per aggiornamenti, omettere per creazione nuovi file.'
  }
];

/**
 * CATEGORIA: TCC WALLET-IMPRESA (v5.7.0)
 * Gestione wallet TCC collegati alle imprese con controllo qualifiche
 */
export const tccWalletImpresaEndpoints: EndpointConfig[] = [
  {
    id: 'tcc-impresa-wallet-get',
    method: 'GET',
    path: '/api/tcc/v2/impresa/:impresaId/wallet',
    name: 'Wallet Impresa',
    description: 'Recupera il wallet TCC associato all\'impresa con stato qualifiche',
    category: 'TCC Wallet-Impresa',
    exampleParams: { impresaId: 3 },
    exampleResponse: {
      success: true,
      wallet: {
        id: 15,
        impresa_id: 3,
        date: '2026-01-12',
        tcc_issued: 0,
        tcc_redeemed: 0,
        settlement_status: 'open',
        wallet_status: 'active'
      },
      impresa: {
        id: 3,
        denominazione: 'Farmacia Severi',
        partita_iva: '11111111111'
      },
      qualification: {
        status: 'qualified',
        color: 'green',
        label: 'Qualificato',
        walletEnabled: true
      }
    },
    notes: '✅ v5.7.0 - Restituisce wallet, dati impresa e stato qualifiche per semaforo'
  },
  {
    id: 'tcc-impresa-wallet-create',
    method: 'POST',
    path: '/api/tcc/v2/impresa/:impresaId/wallet/create',
    name: 'Crea Wallet Impresa',
    description: 'Crea un nuovo wallet TCC per l\'impresa',
    category: 'TCC Wallet-Impresa',
    exampleParams: { impresaId: 3 },
    exampleResponse: {
      success: true,
      walletId: 15,
      walletStatus: 'active',
      message: 'Wallet TCC creato per impresa Farmacia Severi'
    },
    notes: '✅ v5.7.0 - Crea wallet con stato basato su qualifiche (active/suspended)'
  },
  {
    id: 'tcc-impresa-qualification-status',
    method: 'GET',
    path: '/api/tcc/v2/impresa/:impresaId/qualification-status',
    name: 'Stato Qualifiche Impresa',
    description: 'Verifica lo stato delle qualifiche dell\'impresa per semaforo wallet',
    category: 'TCC Wallet-Impresa',
    exampleParams: { impresaId: 3 },
    exampleResponse: {
      success: true,
      impresaId: 3,
      impresaName: 'Farmacia Severi',
      status: 'qualified',
      color: 'green',
      label: 'Qualificato',
      walletEnabled: true,
      qualifications: [
        {
          tipo: 'DURC',
          data_scadenza: '2026-06-30',
          stato: 'valido'
        }
      ]
    },
    notes: '✅ v5.7.0 - Restituisce colore semaforo: green=qualificato, red=scaduto, gray=nessuna'
  },
  {
    id: 'tcc-impresa-wallet-status-update',
    method: 'PUT',
    path: '/api/tcc/v2/impresa/:impresaId/wallet/status',
    name: 'Aggiorna Stato Wallet',
    description: 'Aggiorna manualmente lo stato del wallet (active/suspended/blocked)',
    category: 'TCC Wallet-Impresa',
    exampleParams: { impresaId: 3 },
    exampleBody: {
      status: 'suspended',
      reason: 'Qualifiche scadute'
    },
    exampleResponse: {
      success: true,
      walletId: 15,
      newStatus: 'suspended',
      message: 'Stato wallet aggiornato a suspended'
    },
    notes: '✅ v5.7.0 - Valori ammessi: active, suspended, blocked'
  },
  {
    id: 'tcc-impresa-wallet-transactions',
    method: 'GET',
    path: '/api/tcc/v2/impresa/:impresaId/wallet/transactions',
    name: 'Transazioni Wallet Impresa',
    description: 'Recupera le transazioni del wallet dell\'impresa',
    category: 'TCC Wallet-Impresa',
    exampleParams: { impresaId: 3 },
    exampleResponse: {
      success: true,
      transactions: [],
      count: 0,
      total: 0
    },
    notes: '✅ v5.7.0 - Supporta filtro per tipo e paginazione'
  },
  {
    id: 'tcc-impresa-wallet-sync',
    method: 'POST',
    path: '/api/tcc/v2/impresa/:impresaId/wallet/sync-qualification',
    name: 'Sincronizza Qualifiche Wallet',
    description: 'Sincronizza lo stato del wallet con le qualifiche attuali',
    category: 'TCC Wallet-Impresa',
    exampleParams: { impresaId: 3 },
    exampleResponse: {
      success: true,
      walletId: 15,
      newStatus: 'active',
      qualification: {
        status: 'qualified',
        color: 'green',
        label: 'Qualificato'
      },
      message: 'Wallet sincronizzato con stato qualifiche: Qualificato'
    },
    notes: '✅ v5.7.0 - Aggiorna wallet_status in base a qualifiche correnti'
  },
  {
    id: 'tcc-wallets-all',
    method: 'GET',
    path: '/api/tcc/v2/wallets/all',
    name: 'Lista Tutti i Wallet',
    description: 'Lista tutti i wallet TCC con stato impresa e qualifiche',
    category: 'TCC Wallet-Impresa',
    exampleResponse: {
      success: true,
      wallets: [
        {
          wallet_id: 15,
          impresa_id: 3,
          impresa_name: 'Farmacia Severi',
          wallet_status: 'active',
          qualification: {
            status: 'qualified',
            color: 'green'
          }
        }
      ],
      count: 1
    },
    notes: '✅ v5.7.0 - Supporta filtro per status e hubId'
  }
];

/**
 * TUTTI GLI ENDPOINT ORGANIZZATI
 */
/**
 * CATEGORIA: FIREBASE AUTH
 * Autenticazione Firebase (Google, Apple, Email) + Legacy
 */
export const firebaseAuthEndpoints: EndpointConfig[] = [
  {
    id: 'firebase-sync',
    method: 'POST',
    path: '/api/auth/firebase/sync',
    name: 'Firebase Sync',
    description: 'Sincronizza utente Firebase con MioHub (crea/aggiorna profilo dopo login social)',
    category: 'Firebase Auth',
    requiresAuth: true,
    exampleBody: { uid: 'firebase-uid', email: 'user@example.com', displayName: 'Nome Utente', provider: 'google.com', role: 'citizen' },
    exampleResponse: { success: true, user: { uid: 'firebase-uid', email: 'user@example.com', role: 'citizen', permissions: ['view_markets', 'view_wallet'] } },
    notes: 'Richiede Bearer Token Firebase nell\'header Authorization'
  },
  {
    id: 'firebase-verify',
    method: 'POST',
    path: '/api/auth/firebase/verify',
    name: 'Firebase Verify Token',
    description: 'Verifica validità di un Firebase ID Token',
    category: 'Firebase Auth',
    requiresAuth: true,
    exampleResponse: { valid: true, uid: 'firebase-uid', email: 'user@example.com', provider: 'google.com' },
    notes: 'Utilizzato per validare sessioni esistenti'
  },
  {
    id: 'firebase-me',
    method: 'GET',
    path: '/api/auth/firebase/me',
    name: 'Firebase User Profile',
    description: 'Ottieni profilo utente Firebase corrente con ruoli e permessi MioHub',
    category: 'Firebase Auth',
    requiresAuth: true,
    exampleResponse: { success: true, user: { uid: 'firebase-uid', email: 'user@example.com', role: 'citizen', permissions: [] } },
    notes: 'Richiede sessione Firebase attiva'
  },
  {
    id: 'firebase-logout',
    method: 'POST',
    path: '/api/auth/firebase/logout',
    name: 'Firebase Logout',
    description: 'Logout utente Firebase e invalidazione sessione server-side',
    category: 'Firebase Auth',
    requiresAuth: true,
    exampleResponse: { success: true, message: 'Logout effettuato' },
    notes: 'Invalida sessione e rimuove cookie'
  },
  {
    id: 'auth-login-legacy',
    method: 'POST',
    path: '/api/auth/login',
    name: 'Login Legacy',
    description: 'Login con email/password (fallback per compatibilità)',
    category: 'Firebase Auth',
    requiresAuth: false,
    exampleBody: { email: 'user@example.com', password: '***' },
    exampleResponse: { success: true, user: { email: 'user@example.com', role: 'citizen' } },
    notes: 'Endpoint di fallback, preferire Firebase SDK'
  },
  {
    id: 'auth-register',
    method: 'POST',
    path: '/api/auth/register',
    name: 'Registrazione Utente',
    description: 'Registrazione nuovo utente con email/password',
    category: 'Firebase Auth',
    requiresAuth: false,
    exampleBody: { email: 'user@example.com', password: '***', displayName: 'Nome Utente', role: 'citizen' },
    exampleResponse: { success: true, user: { email: 'user@example.com', role: 'citizen' } },
    notes: 'Crea profilo Firebase + profilo MioHub'
  },
  {
    id: 'auth-config',
    method: 'GET',
    path: '/api/auth/config',
    name: 'Firebase Config',
    description: 'Configurazione pubblica Firebase per inizializzare il client SDK',
    category: 'Firebase Auth',
    requiresAuth: false,
    exampleResponse: { projectId: 'dmshub-auth-2975e', authDomain: 'dmshub-auth-2975e.firebaseapp.com' },
    notes: 'Endpoint pubblico, nessuna autenticazione richiesta'
  }
];

export const allRealEndpoints: EndpointConfig[] = [
  ...marketsEndpoints,
  ...stallsEndpoints,
  ...vendorsEndpoints,
  ...concessionsEndpoints,
  ...suapEndpoints,
  ...walletsEndpoints,
  ...tariffsEndpoints,
  ...tccWalletImpresaEndpoints,
  ...impreseEndpoints,
  ...qualificazioniEndpoints,
  ...gisEndpoints,
  ...abacusSqlEndpoints,
  ...abacusGithubEndpoints,
  ...firebaseAuthEndpoints
  // ...mobilityEndpoints
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
    description: 'Integrazione attiva con il sistema DMS Legacy su Heroku (Lapsy srl). Proxy API per mercati Bologna/Cervia, ambulanti, concessioni e presenze real-time.',
    baseUrl: 'https://mihub.157-90-29-66.nip.io',
    status: 'active',
    dataOwner: 'DMS Legacy (Lapsy srl)',
    notes: 'Integrazione attiva via API Proxy. I dati vengono letti dal backend Heroku e trasformati nel formato MioHub. Sync automatico ogni ora. SOLA LETTURA verso Heroku.',
    endpoints: [
      '/api/integrations/dms-legacy/markets',
      '/api/integrations/dms-legacy/vendors',
      '/api/integrations/dms-legacy/concessions',
      '/api/integrations/dms-legacy/presences/:marketId',
      '/api/integrations/dms-legacy/market-sessions/:marketId',
      '/api/integrations/dms-legacy/sync',
      '/api/integrations/dms-legacy/cron-sync'
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
    baseUrl: 'https://api.mio-hub.me',
    status: 'active',
    dataOwner: 'TPER / Comune',
    notes: 'Integrato con API GTFS (api.mio-hub.me). Dati reali TPER Bologna/Ferrara + Trenitalia + Tiemme importati nel database.',
    endpoints: [
      '/api/mobility/stops',
      '/api/mobility/lines',
      '/api/mobility/parking'
    ]
  },
  {
    id: 'mercaweb',
    name: 'MercaWeb — Abaco S.p.A.',
    description: 'Integrazione bidirezionale con MercaWeb (Abaco S.p.A.) per sincronizzazione anagrafiche mercati, ambulanti, piazzole, concessioni e presenze.',
    baseUrl: 'https://api.mio-hub.me',
    status: 'active',
    dataOwner: 'Abaco S.p.A.',
    notes: 'Integrazione attiva. Import anagrafiche via POST, export presenze via GET. Autenticazione tramite API Key (header X-MercaWeb-API-Key). Logica UPSERT basata su mercaweb_id.',
    endpoints: [
      'POST /api/integrations/mercaweb/import/ambulanti',
      'POST /api/integrations/mercaweb/import/mercati',
      'POST /api/integrations/mercaweb/import/piazzole',
      'POST /api/integrations/mercaweb/import/concessioni',
      'POST /api/integrations/mercaweb/import/spuntisti',
      'GET  /api/integrations/mercaweb/export/presenze/:marketId',
      'GET  /api/integrations/mercaweb/export/mapping/:entity',
      'GET  /api/integrations/mercaweb/health',
      'GET  /api/integrations/mercaweb/status'
    ]
  },
  {
    id: 'firebase-auth',
    name: 'Firebase Authentication',
    description: 'Sistema di autenticazione ibrido Firebase (Google, Apple, Email/Password) integrato con il backend MioHub per la gestione dei profili utente e dei ruoli.',
    baseUrl: 'https://orchestratore.mio-hub.me',
    status: 'active',
    dataOwner: 'Firebase (Google Cloud) + MioHub',
    notes: 'Progetto Firebase: dmshub-auth-2975e. Provider attivi: Google, Apple, Email/Password. Sincronizzazione automatica con profili MioHub. Fallback locale disponibile.',
    endpoints: [
      '/api/auth/firebase/sync',
      '/api/auth/firebase/verify',
      '/api/auth/firebase/me',
      '/api/auth/firebase/logout',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/config'
    ]
  },
  {
    id: 'pdnd',
    name: 'PDND — Piattaforma Digitale Nazionale Dati',
    description: 'Interoperabilità con la Piattaforma Digitale Nazionale Dati (PDND) di AgID/PagoPA per lo scambio sicuro di dati tra PA tramite e-service e voucher.',
    baseUrl: 'https://api.pdnd.pagopa.it',
    status: 'in_preparation',
    dataOwner: 'AgID / PagoPA',
    notes: 'In preparazione. Richiede accreditamento su PDND Interop, generazione keypair, registrazione e-service. Permetterà interrogazione ANPR, Registro Imprese, INPS per verifica automatica requisiti SCIA e regolarità imprese.',
    endpoints: [
      '/api/pdnd/voucher — Richiesta voucher JWT',
      '/api/pdnd/anpr/residenza — Verifica residenza (ANPR)',
      '/api/pdnd/imprese/visura — Visura camerale (Registro Imprese)',
      '/api/pdnd/inps/regolarita — Verifica regolarità contributiva (DURC)',
      '/api/pdnd/agenzia-entrate/regolarita-fiscale — Regolarità fiscale'
    ]
  }
];
