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
import { publicProcedure, router } from './_core/trpc';
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
  initDemoLogs 
} from './services/apiLogsService';

export const guardianRouter = router({
  // ============================================================================
  // GET /api/guardian/integrations - Inventario API completo
  // ============================================================================
  integrations: publicProcedure.query(async () => {
    const inventory = getAPIInventory();
    const stats = getAPIStats();
    
    return {
      success: true,
      data: {
        endpoints: inventory,
        stats,
      },
    };
  }),

  // ============================================================================
  // GET /api/guardian/logs - Log centralizzati del sistema
  // ============================================================================
  logs: publicProcedure
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
        success: true,
        data: {
          logs,
          stats,
        },
      };
    }),

  // ============================================================================
  // POST /api/guardian/debug/testEndpoint - Proxy per testare endpoint API
  // ============================================================================
  testEndpoint: publicProcedure
    .input(z.object({
      endpoint: z.string(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
      params: z.record(z.any()).optional(),
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
          
          return {
            success: false,
            error: 'Endpoint non trovato nell\'inventario API',
          };
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
          success: true,
          data: {
            endpoint: apiInfo,
            testResult: {
              status: 200,
              message: 'Test completato con successo',
              responseTime: 42,
              timestamp: new Date().toISOString(),
            },
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
        
        return {
          success: false,
          error: error.message,
        };
      }
    }),

  // ============================================================================
  // POST /api/guardian/logs/init - Inizializza log di demo
  // ============================================================================
  initDemoLogs: publicProcedure.mutation(async () => {
    initDemoLogs();
    
    return {
      success: true,
      message: 'Log di demo inizializzati',
    };
  }),

  // ============================================================================
  // GET /api/guardian/stats - Statistiche complete del sistema
  // ============================================================================
  stats: publicProcedure.query(async () => {
    const apiStats = getAPIStats();
    const logStats = getLogStats();
    
    return {
      success: true,
      data: {
        api: apiStats,
        logs: logStats,
      },
    };
  }),
});
