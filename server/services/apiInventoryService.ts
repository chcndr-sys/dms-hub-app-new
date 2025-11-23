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
  category: 'analytics' | 'integrations' | 'mobility' | 'logs' | 'system' | 'guardian' | 'dms' | 'carbon' | 'users' | 'sustainability' | 'businesses' | 'inspections' | 'notifications' | 'civic';
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
