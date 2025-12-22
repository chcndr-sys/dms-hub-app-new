/**
 * API Inventory Service
 * 
 * Servizio centralizzato per l'inventario di tutti gli endpoint API disponibili
 * nel sistema DMS Hub (tRPC + Legacy REST API).
 * 
 * Utilizzato dalla sezione "Integrazioni" della Dashboard PA per mostrare
 * l'elenco completo delle API disponibili, il loro stato, e la documentazione.
 */

export interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  category: 'analytics' | 'integrations' | 'mobility' | 'logs' | 'system' | 'guardian' | 'dms' | 'carbon' | 'users' | 'sustainability' | 'businesses' | 'inspections' | 'notifications' | 'civic' | 'wallet' | 'imprese';
  status: 'active' | 'deprecated' | 'beta' | 'maintenance';
  version: string;
  requiresAuth: boolean;
  rateLimit?: string;
  documentation?: string;
  testParams?: Record<string, any>;
}

/**
 * Inventario completo degli endpoint tRPC disponibili nel sistema DMS Hub
 */
export function getAPIInventory(): APIEndpoint[] {
  return [
    // ============================================================================
    // SYSTEM & AUTH
    // ============================================================================
    {
      id: 'system.health',
      method: 'GET',
      path: '/api/system/health',
      description: 'Verifica lo stato di salute del sistema',
      category: 'system',
      status: 'active',
      version: '1.0',
      requiresAuth: false,
      documentation: 'Ritorna lo stato di salute del sistema (database, API, servizi esterni)',
    },
    {
      id: 'auth.me',
      method: 'GET',
      path: '/api/auth/me',
      description: 'Ottieni informazioni sull\'utente corrente',
      category: 'system',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i dati dell\'utente autenticato',
    },
    {
      id: 'auth.logout',
      method: 'POST',
      path: '/api/auth/logout',
      description: 'Effettua il logout dell\'utente',
      category: 'system',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Invalida la sessione corrente e rimuove il cookie di autenticazione',
    },

    // ============================================================================
    // ANALYTICS
    // ============================================================================
    {
      id: 'analytics.overview',
      method: 'GET',
      path: '/api/analytics/overview',
      description: 'Statistiche generali della piattaforma',
      category: 'analytics',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna statistiche aggregate su mercati, negozi, transazioni, check-in',
    },
    {
      id: 'analytics.markets',
      method: 'GET',
      path: '/api/analytics/markets',
      description: 'Elenco mercati con statistiche',
      category: 'analytics',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco completo dei mercati con statistiche aggregate',
    },
    {
      id: 'analytics.shops',
      method: 'GET',
      path: '/api/analytics/shops',
      description: 'Elenco negozi con statistiche',
      category: 'analytics',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco completo dei negozi con statistiche aggregate',
    },
    {
      id: 'analytics.transactions',
      method: 'GET',
      path: '/api/analytics/transactions',
      description: 'Elenco transazioni recenti',
      category: 'analytics',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna le transazioni recenti con dettagli',
    },
    {
      id: 'analytics.checkins',
      method: 'GET',
      path: '/api/analytics/checkins',
      description: 'Elenco check-in operatori',
      category: 'analytics',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i check-in degli operatori nei mercati',
    },
    {
      id: 'analytics.products',
      method: 'GET',
      path: '/api/analytics/products',
      description: 'Elenco prodotti con statistiche',
      category: 'analytics',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco dei prodotti con statistiche di vendita',
    },
    {
      id: 'analytics.productTracking',
      method: 'GET',
      path: '/api/analytics/productTracking',
      description: 'Tracciamento prodotti (blockchain)',
      category: 'analytics',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i dati di tracciamento blockchain dei prodotti',
    },

    // ============================================================================
    // CARBON CREDITS
    // ============================================================================
    {
      id: 'carbonCredits.config',
      method: 'GET',
      path: '/api/carbonCredits/config',
      description: 'Configurazione crediti di carbonio',
      category: 'carbon',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna la configurazione del sistema di crediti di carbonio',
    },
    {
      id: 'carbonCredits.fundTransactions',
      method: 'GET',
      path: '/api/carbonCredits/fundTransactions',
      description: 'Transazioni fondo crediti carbonio',
      category: 'carbon',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna le transazioni del fondo crediti di carbonio',
    },
    {
      id: 'carbonCredits.reimbursements',
      method: 'GET',
      path: '/api/carbonCredits/reimbursements',
      description: 'Rimborsi crediti carbonio',
      category: 'carbon',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i rimborsi effettuati tramite crediti di carbonio',
    },

    // ============================================================================
    // LOGS
    // ============================================================================
    {
      id: 'logs.system',
      method: 'GET',
      path: '/api/logs/system',
      description: 'Log di sistema',
      category: 'logs',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i log di sistema (API calls, database queries, errors)',
    },

    // ============================================================================
    // USERS
    // ============================================================================
    {
      id: 'users.analytics',
      method: 'GET',
      path: '/api/users/analytics',
      description: 'Statistiche utenti',
      category: 'users',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna le statistiche sugli utenti della piattaforma',
    },

    // ============================================================================
    // SUSTAINABILITY
    // ============================================================================
    {
      id: 'sustainability.metrics',
      method: 'GET',
      path: '/api/sustainability/metrics',
      description: 'Metriche di sostenibilità',
      category: 'sustainability',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna le metriche di sostenibilità ambientale',
    },

    // ============================================================================
    // BUSINESSES
    // ============================================================================
    {
      id: 'businesses.list',
      method: 'GET',
      path: '/api/businesses/list',
      description: 'Elenco attività commerciali',
      category: 'businesses',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco delle attività commerciali registrate',
    },

    // ============================================================================
    // INSPECTIONS
    // ============================================================================
    {
      id: 'inspections.list',
      method: 'GET',
      path: '/api/inspections/list',
      description: 'Elenco ispezioni e violazioni',
      category: 'inspections',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco delle ispezioni e violazioni registrate',
    },

    // ============================================================================
    // NOTIFICATIONS
    // ============================================================================
    {
      id: 'notifications.list',
      method: 'GET',
      path: '/api/notifications/list',
      description: 'Elenco notifiche',
      category: 'notifications',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco delle notifiche per l\'utente corrente',
    },

    // ============================================================================
    // CIVIC REPORTS
    // ============================================================================
    {
      id: 'civicReports.list',
      method: 'GET',
      path: '/api/civicReports/list',
      description: 'Elenco segnalazioni civiche',
      category: 'civic',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco delle segnalazioni civiche',
    },

    // ============================================================================
    // MOBILITY (TPER)
    // ============================================================================
    {
      id: 'mobility.list',
      method: 'GET',
      path: '/api/mobility/list',
      description: 'Dati mobilità TPER',
      category: 'mobility',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i dati di mobilità TPER (fermate, linee, orari)',
    },

    // ============================================================================
    // INTEGRATIONS - TPER
    // ============================================================================
    {
      id: 'integrations.tper.stops',
      method: 'GET',
      path: '/api/integrations/tper/stops',
      description: 'Lista fermate TPER Bologna',
      category: 'integrations',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco completo delle fermate TPER a Bologna',
    },
    {
      id: 'integrations.tper.sync',
      method: 'POST',
      path: '/api/integrations/tper/sync',
      description: 'Sincronizza dati TPER',
      category: 'integrations',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Sincronizza i dati TPER (fermate, linee, orari) dal portale Open Data di Bologna',
    },

    // ============================================================================
    // DMS HUB
    // ============================================================================
    {
      id: 'dmsHub.markets.list',
      method: 'GET',
      path: '/api/dmsHub/markets/list',
      description: 'Elenco mercati DMS',
      category: 'dms',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco dei mercati gestiti dal sistema DMS',
    },
    {
      id: 'dmsHub.stalls.list',
      method: 'GET',
      path: '/api/dmsHub/stalls/list',
      description: 'Elenco posteggi',
      category: 'dms',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco dei posteggi disponibili nei mercati',
    },

    // ============================================================================
    // MIO AGENT
    // ============================================================================
    {
      id: 'mioAgent.getLogs',
      method: 'GET',
      path: '/api/mioAgent/getLogs',
      description: 'Log agente MIO',
      category: 'logs',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i log dell\'agente MIO dal repository GitHub',
    },

    // ============================================================================
    // MIHUB (Multi-Agent System)
    // ============================================================================
    {
      id: 'mihub.agents.list',
      method: 'GET',
      path: '/api/mihub/agents/list',
      description: 'Elenco agenti MIHUB',
      category: 'system',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco degli agenti disponibili nel sistema MIHUB',
    },
    {
      id: 'mihub.chat.send',
      method: 'POST',
      path: '/api/mihub/chat/send',
      description: 'Invia messaggio a MIHUB',
      category: 'system',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Invia un messaggio al sistema multi-agente MIHUB',
    },

    // ============================================================================
    // GUARDIAN (API Monitoring & Debug)
    // ============================================================================
    {
      id: 'guardian.integrations',
      method: 'GET',
      path: '/api/guardian/integrations',
      description: 'Inventario API completo',
      category: 'guardian',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'inventario completo di tutte le API disponibili nel sistema',
    },
    {
      id: 'guardian.logs',
      method: 'GET',
      path: '/api/guardian/logs',
      description: 'Log Guardian centralizzati',
      category: 'guardian',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i log centralizzati del sistema Guardian (API calls, errors, security)',
    },
    {
      id: 'guardian.debug.testEndpoint',
      method: 'POST',
      path: '/api/guardian/debug/testEndpoint',
      description: 'Test endpoint API',
      category: 'guardian',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Proxy per testare endpoint API dalla Dashboard PA',
      testParams: {
        endpoint: '/api/analytics/overview',
        method: 'GET',
        params: {},
      },
    },

    // ============================================================================
    // WALLET / PAGOPA - Sistema borsellino elettronico operatori mercatali
    // ============================================================================
    {
      id: 'wallet.stats',
      method: 'GET',
      path: '/api/trpc/wallet.stats',
      description: 'Statistiche generali wallet',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna statistiche aggregate sui wallet: totale attivi, bloccati, saldo complessivo, avvisi PagoPA',
    },
    {
      id: 'wallet.list',
      method: 'GET',
      path: '/api/trpc/wallet.list',
      description: 'Lista wallet operatori',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco completo dei wallet operatori con saldo e stato',
    },
    {
      id: 'wallet.getById',
      method: 'GET',
      path: '/api/trpc/wallet.getById',
      description: 'Dettaglio wallet per ID',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i dettagli di un wallet specifico incluse le ultime transazioni',
      testParams: { walletId: 1 },
    },
    {
      id: 'wallet.getByImpresa',
      method: 'GET',
      path: '/api/trpc/wallet.getByImpresa',
      description: 'Wallet per impresa',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna il wallet associato a una specifica impresa',
      testParams: { impresaId: 1 },
    },
    {
      id: 'wallet.create',
      method: 'POST',
      path: '/api/trpc/wallet.create',
      description: 'Crea nuovo wallet',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Crea un nuovo wallet per un operatore mercatale',
    },
    {
      id: 'wallet.updateStatus',
      method: 'POST',
      path: '/api/trpc/wallet.updateStatus',
      description: 'Aggiorna stato wallet',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Modifica lo stato di un wallet (ATTIVO, BLOCCATO, SOSPESO)',
    },
    {
      id: 'wallet.transazioni',
      method: 'GET',
      path: '/api/trpc/wallet.transazioni',
      description: 'Storico transazioni wallet',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna lo storico delle transazioni di un wallet (ricariche, decurtazioni)',
      testParams: { walletId: 1 },
    },
    {
      id: 'wallet.ricarica',
      method: 'POST',
      path: '/api/trpc/wallet.ricarica',
      description: 'Ricarica wallet',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Effettua una ricarica manuale sul wallet (bonifico, contanti)',
    },
    {
      id: 'wallet.decurtazione',
      method: 'POST',
      path: '/api/trpc/wallet.decurtazione',
      description: 'Decurtazione wallet',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Effettua una decurtazione dal wallet (presenza mercato, sanzione)',
    },
    {
      id: 'wallet.generaAvvisoPagopa',
      method: 'POST',
      path: '/api/trpc/wallet.generaAvvisoPagopa',
      description: 'PAGOPA - Genera avviso di pagamento',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Genera un avviso di pagamento PagoPA tramite E-FIL Plug&Pay per ricarica wallet',
    },
    {
      id: 'wallet.pagamentoSpontaneo',
      method: 'POST',
      path: '/api/trpc/wallet.pagamentoSpontaneo',
      description: 'PAGOPA - Pagamento spontaneo',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Avvia un pagamento spontaneo PagoPA con redirect al checkout',
    },
    {
      id: 'wallet.verificaPagamento',
      method: 'GET',
      path: '/api/trpc/wallet.verificaPagamento',
      description: 'PAGOPA - Verifica pagamento',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Verifica lo stato di un pagamento PagoPA tramite IUV',
      testParams: { iuv: 'RF0123456789012345678' },
    },
    {
      id: 'wallet.generaPdfAvviso',
      method: 'GET',
      path: '/api/trpc/wallet.generaPdfAvviso',
      description: 'PAGOPA - Genera PDF avviso',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Genera il PDF dell\'avviso di pagamento PagoPA',
    },
    {
      id: 'wallet.generaPdfQuietanza',
      method: 'GET',
      path: '/api/trpc/wallet.generaPdfQuietanza',
      description: 'PAGOPA - Genera PDF quietanza',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Genera il PDF della quietanza di pagamento PagoPA',
    },
    {
      id: 'wallet.avvisiPagopa',
      method: 'GET',
      path: '/api/trpc/wallet.avvisiPagopa',
      description: 'Lista avvisi PagoPA',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna gli avvisi PagoPA associati a un wallet',
      testParams: { walletId: 1 },
    },
    {
      id: 'wallet.tariffe',
      method: 'GET',
      path: '/api/trpc/wallet.tariffe',
      description: 'Tariffe posteggio',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna le tariffe giornaliere per tipo posteggio',
    },
    {
      id: 'wallet.verificaSaldoPresenza',
      method: 'POST',
      path: '/api/trpc/wallet.verificaSaldoPresenza',
      description: 'Verifica saldo per presenza',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Verifica se il saldo wallet è sufficiente per effettuare una presenza al mercato',
    },
    {
      id: 'wallet.ricercaPagamentiGiornalieri',
      method: 'GET',
      path: '/api/trpc/wallet.ricercaPagamentiGiornalieri',
      description: 'PAGOPA - Ricerca pagamenti giornalieri',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ricerca i pagamenti PagoPA ricevuti in una data specifica per riconciliazione',
    },
    {
      id: 'wallet.reportRiconciliazione',
      method: 'GET',
      path: '/api/trpc/wallet.reportRiconciliazione',
      description: 'Report riconciliazione contabile',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Genera report di riconciliazione contabile per periodo',
    },
    {
      id: 'wallet.reportMercato',
      method: 'GET',
      path: '/api/trpc/wallet.reportMercato',
      description: 'Report wallet per mercato',
      category: 'wallet',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Genera report aggregato dei wallet per un mercato specifico',
    },

    // ============================================================================
    // IMPRESE & QUALIFICAZIONI - API per gestione imprese e qualificazioni
    // ============================================================================
    {
      id: 'imprese.list',
      method: 'GET',
      path: '/api/imprese',
      description: 'Lista imprese',
      category: 'imprese',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco completo delle imprese registrate con filtri opzionali',
    },
    {
      id: 'imprese.getById',
      method: 'GET',
      path: '/api/imprese/:id',
      description: 'Dettaglio impresa',
      category: 'imprese',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna i dettagli completi di una specifica impresa',
      testParams: { id: 1 },
    },
    {
      id: 'qualificazioni.list',
      method: 'GET',
      path: '/api/qualificazioni',
      description: 'Lista qualificazioni',
      category: 'imprese',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna l\'elenco delle qualificazioni disponibili',
    },
    {
      id: 'imprese.qualificazioni',
      method: 'GET',
      path: '/api/imprese/:id/qualificazioni',
      description: 'Qualificazioni impresa',
      category: 'imprese',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Ritorna le qualificazioni associate a una specifica impresa',
      testParams: { id: 1 },
    },
    {
      id: 'imprese.rating',
      method: 'GET',
      path: '/api/imprese/:id/rating',
      description: 'Semaforo Conformità impresa',
      category: 'imprese',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Calcola e ritorna il rating di conformità (semaforo) per una impresa',
      testParams: { id: 1 },
    },
    {
      id: 'imprese.migratePdnd',
      method: 'POST',
      path: '/api/admin/migrate-pdnd',
      description: 'Migrazione PDND',
      category: 'imprese',
      status: 'active',
      version: '1.0',
      requiresAuth: true,
      documentation: 'Avvia la migrazione dei dati imprese verso PDND (Piattaforma Digitale Nazionale Dati)',
    },
  ];
}

/**
 * Filtra gli endpoint per categoria
 */
export function getAPIsByCategory(category: APIEndpoint['category']): APIEndpoint[] {
  return getAPIInventory().filter(api => api.category === category);
}

/**
 * Cerca un endpoint per ID
 */
export function getAPIById(id: string): APIEndpoint | undefined {
  return getAPIInventory().find(api => api.id === id);
}

/**
 * Statistiche sull'inventario API
 */
export function getAPIStats() {
  const inventory = getAPIInventory();
  const byCategory = inventory.reduce((acc, api) => {
    acc[api.category] = (acc[api.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byStatus = inventory.reduce((acc, api) => {
    acc[api.status] = (acc[api.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: inventory.length,
    byCategory,
    byStatus,
    requiresAuth: inventory.filter(api => api.requiresAuth).length,
    public: inventory.filter(api => !api.requiresAuth).length,
  };
}
