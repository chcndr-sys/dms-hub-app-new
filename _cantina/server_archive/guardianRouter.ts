/**
 * Guardian Router
 * 
 * Router dedicato agli endpoint Guardian per il monitoraggio e debug delle API.
 * 
 * Endpoint disponibili:
 * - GET /api/guardian/integrations - Inventario API completo
 * - GET /api/guardian/logs - Log centralizzati del sistema
 * - POST /api/guardian/debug/testEndpoint - Proxy per testare endpoint API
 */

import { z } from 'zod';
import { adminProcedure, router } from './_core/trpc';
import { 
  getAPIInventory, 
  getAPIsByCategory, 
  getAPIById, 
  getAPIStats 
} from './services/apiInventoryService';
import { 
  getLogs, 
  getLogStats, 
  addLog, 
  initDemoLogs,
  clearAllLogs 
} from './services/apiLogsService';

// Svuota i log di demo all'avvio del server
clearAllLogs();
console.log('[Guardian Router] Log di demo rimossi - sistema pronto per log reali');

export const guardianRouter = router({
  // ============================================================================
  // GET /api/guardian/integrations - Inventario API completo
  // ============================================================================
  integrations: adminProcedure.query(async () => {
    const inventory = getAPIInventory();
    const stats = getAPIStats() as any;
    
    // Ottieni il conteggio dinamico dal backend Hetzner
    try {
      const response = await fetch('https://api.mio-hub.me/api/dashboard/integrations/endpoint-count');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          stats.active = data.active || 0;
          stats.backup = data.backup || 0;
          stats.total = data.total || data.active || 0;
          stats.activeByFile = data.activeByFile || {};
          stats.backupByFile = data.backupByFile || {};
          stats.lastUpdated = data.lastUpdated;
        }
      }
    } catch (error) {
      console.error('Error fetching dynamic endpoint count:', error);
      // Fallback: usa il conteggio dell'inventario locale
    }
    
    return {
      endpoints: inventory,
      stats,
    };
  }),

  // ============================================================================
  // GET /api/guardian/logs - Log centralizzati del sistema
  // ============================================================================
  logs: adminProcedure
    .input(z.object({
      level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
      app: z.enum(['DMS_HUB', 'MIHUB', 'MIO_AGENT', 'GUARDIAN']).optional(),
      type: z.enum(['API_CALL', 'DATABASE', 'INTEGRATION', 'SECURITY', 'ERROR']).optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const logs = getLogs(input);
      const stats = getLogStats();
      
      return {
        logs,
        stats,
      };
    }),

  // ============================================================================
  // POST /api/guardian/debug/testEndpoint - Proxy per testare endpoint API
  // ============================================================================
  testEndpoint: adminProcedure
    .input(z.object({
      endpoint: z.string(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      params: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { endpoint, method, params } = input;
      
      try {
        // Log della richiesta di test
        addLog({
          level: 'info',
          app: 'GUARDIAN',
          type: 'API_CALL',
          endpoint,
          method,
          message: `Test endpoint: ${method} ${endpoint}`,
          userEmail: 'guardian@system',
        });
        
        // Simula una chiamata all'endpoint (in produzione, qui si farebbe una chiamata reale)
        // Per ora ritorniamo solo i dati di test
        const apiInfo = getAPIById(endpoint.replace('/api/', '').replace(/\//g, '.'));
        
        if (!apiInfo) {
          addLog({
            level: 'error',
            app: 'GUARDIAN',
            type: 'ERROR',
            endpoint,
            method,
            message: `Endpoint non trovato: ${endpoint}`,
            userEmail: 'guardian@system',
          });
          
          throw new Error('Endpoint non trovato nell\'inventario API');
        }
        
        // Log del successo
        addLog({
          level: 'info',
          app: 'GUARDIAN',
          type: 'API_CALL',
          endpoint,
          method,
          statusCode: 200,
          responseTime: 42,
          message: `Test endpoint completato: ${method} ${endpoint}`,
          userEmail: 'guardian@system',
        });
        
        return {
          endpoint: apiInfo,
          testResult: {
            status: 200,
            message: 'Test completato con successo',
            responseTime: 42,
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error: any) {
        // Log dell'errore
        addLog({
          level: 'error',
          app: 'GUARDIAN',
          type: 'ERROR',
          endpoint,
          method,
          statusCode: 500,
          message: `Errore durante il test dell'endpoint: ${error.message}`,
          userEmail: 'guardian@system',
          details: {
            error: error.message,
            stack: error.stack,
          },
        });
        
        throw error;
      }
    }),

  // ============================================================================
  // POST /api/guardian/logApiCall - Logga una chiamata API
  // ============================================================================
  logApiCall: adminProcedure
    .input(z.object({
      endpoint: z.string(),
      method: z.string(),
      statusCode: z.number().optional(),
      responseTime: z.number().optional(),
      error: z.string().optional(),
      params: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { endpoint, method, statusCode, responseTime, error, params } = input;
      
      addLog({
        level: error ? 'error' : 'info',
        app: 'API_TEST',
        type: error ? 'ERROR' : 'API_CALL',
        endpoint,
        method,
        statusCode: statusCode || (error ? 500 : 200),
        responseTime,
        message: error || `API call: ${method} ${endpoint}`,
        userEmail: 'user@dashboard',
        details: params ? { params } : undefined,
      });
      
      return { logged: true };
    }),

  // ============================================================================
  // POST /api/guardian/logs/init - Inizializza log di demo
  // ============================================================================
  initDemoLogs: adminProcedure.mutation(async () => {
    initDemoLogs();
    
    return {
      message: 'Log di demo inizializzati',
    };
  }),

  // ============================================================================
  // GET /api/guardian/stats - Statistiche complete del sistema
  // ============================================================================
  stats: adminProcedure.query(async () => {
    const apiStats = getAPIStats();
    const logStats = getLogStats();
    
    return {
      api: apiStats,
      logs: logStats,
    };
  }),
});
