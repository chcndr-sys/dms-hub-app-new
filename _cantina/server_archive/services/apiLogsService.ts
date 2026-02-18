/**
 * API Logs Service
 * 
 * Servizio centralizzato per il logging di tutte le chiamate API nel sistema DMS Hub.
 * 
 * Utilizzato dalla sezione "Log" della Dashboard PA per monitorare:
 * - Chiamate API (endpoint, metodo, status, tempo di risposta)
 * - Errori e eccezioni
 * - Accessi negati (Guardian)
 * - Attività degli agenti (MIO, Manus, Abacus)
 */

export interface APILog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  app: 'DMS_HUB' | 'MIHUB' | 'MIO_AGENT' | 'GUARDIAN' | 'API_TEST' | 'TRPC' | 'REST';
  type: 'API_CALL' | 'DATABASE' | 'INTEGRATION' | 'SECURITY' | 'ERROR';
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  message: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

/**
 * In-memory log storage (per demo)
 * In produzione, questi log andrebbero salvati in un database o in un servizio esterno
 * come CloudWatch, Datadog, o Elasticsearch.
 */
const logs: APILog[] = [];

/**
 * Aggiunge un log al sistema
 */
export function addLog(log: Omit<APILog, 'id' | 'timestamp'>): APILog {
  const newLog: APILog = {
    id: generateLogId(),
    timestamp: new Date(),
    ...log,
  };
  
  logs.push(newLog);
  
  // Mantieni solo gli ultimi 1000 log in memoria
  if (logs.length > 1000) {
    logs.shift();
  }
  
  // Log su console per debug
  console.log(`[${newLog.level.toUpperCase()}] [${newLog.app}] ${newLog.message}`);
  
  return newLog;
}

/**
 * Ottiene i log filtrati
 */
export function getLogs(options?: {
  level?: APILog['level'];
  app?: APILog['app'];
  type?: APILog['type'];
  limit?: number;
  offset?: number;
}): APILog[] {
  let filtered = [...logs];
  
  if (options?.level) {
    filtered = filtered.filter(log => log.level === options.level);
  }
  
  if (options?.app) {
    filtered = filtered.filter(log => log.app === options.app);
  }
  
  if (options?.type) {
    filtered = filtered.filter(log => log.type === options.type);
  }
  
  // Ordina per timestamp decrescente (più recenti prima)
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  // Paginazione
  const offset = options?.offset || 0;
  const limit = options?.limit || 100;
  
  return filtered.slice(offset, offset + limit);
}

/**
 * Ottiene le statistiche sui log
 */
export function getLogStats() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  
  const recentLogs = logs.filter(log => log.timestamp >= last24h);
  const lastHourLogs = logs.filter(log => log.timestamp >= lastHour);
  
  return {
    total: logs.length,
    last24h: recentLogs.length,
    lastHour: lastHourLogs.length,
    byLevel: {
      info: logs.filter(log => log.level === 'info').length,
      warn: logs.filter(log => log.level === 'warn').length,
      error: logs.filter(log => log.level === 'error').length,
      debug: logs.filter(log => log.level === 'debug').length,
    },
    byApp: {
      DMS_HUB: logs.filter(log => log.app === 'DMS_HUB').length,
      MIHUB: logs.filter(log => log.app === 'MIHUB').length,
      MIO_AGENT: logs.filter(log => log.app === 'MIO_AGENT').length,
      GUARDIAN: logs.filter(log => log.app === 'GUARDIAN').length,
    },
    byType: {
      API_CALL: logs.filter(log => log.type === 'API_CALL').length,
      DATABASE: logs.filter(log => log.type === 'DATABASE').length,
      INTEGRATION: logs.filter(log => log.type === 'INTEGRATION').length,
      SECURITY: logs.filter(log => log.type === 'SECURITY').length,
      ERROR: logs.filter(log => log.type === 'ERROR').length,
    },
  };
}

/**
 * Pulisce i log più vecchi di N giorni
 */
export function cleanOldLogs(days: number = 7): number {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const initialLength = logs.length;
  
  // Rimuovi log più vecchi della data di cutoff
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].timestamp < cutoffDate) {
      logs.splice(i, 1);
    }
  }
  
  const removed = initialLength - logs.length;
  console.log(`[API Logs Service] Rimossi ${removed} log più vecchi di ${days} giorni`);
  
  return removed;
}

/**
 * Genera un ID univoco per il log
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Svuota tutti i log (rimuove i log di demo)
 */
export function clearAllLogs() {
  logs.length = 0;
  console.log('[API Logs Service] Tutti i log sono stati svuotati');
}

/**
 * Inizializza alcuni log di esempio per demo
 */
export function initDemoLogs() {
  const demoLogs: Omit<APILog, 'id' | 'timestamp'>[] = [
    {
      level: 'info',
      app: 'DMS_HUB',
      type: 'API_CALL',
      endpoint: '/api/analytics/overview',
      method: 'GET',
      statusCode: 200,
      responseTime: 45,
      message: 'GET /api/analytics/overview - 200 OK',
      userEmail: 'admin@dms.it',
    },
    {
      level: 'info',
      app: 'DMS_HUB',
      type: 'DATABASE',
      message: 'Query executed successfully: SELECT * FROM markets',
      userEmail: 'system',
      responseTime: 12,
    },
    {
      level: 'warn',
      app: 'GUARDIAN',
      type: 'SECURITY',
      endpoint: '/api/integrations/tper/sync',
      method: 'POST',
      message: 'Rate limit warning: 80% of quota used',
      userEmail: 'operator@dms.it',
    },
    {
      level: 'error',
      app: 'DMS_HUB',
      type: 'ERROR',
      endpoint: '/api/analytics/transactions',
      method: 'GET',
      statusCode: 500,
      message: 'Internal server error: Database connection timeout',
      userEmail: 'admin@dms.it',
      details: {
        error: 'ETIMEDOUT',
        stack: 'Error: Connection timeout...',
      },
    },
    {
      level: 'info',
      app: 'MIHUB',
      type: 'INTEGRATION',
      message: 'TPER sync completed: 1247 stops synchronized',
      userEmail: 'system',
      responseTime: 3420,
    },
    {
      level: 'info',
      app: 'MIO_AGENT',
      type: 'API_CALL',
      endpoint: '/api/mioAgent/getLogs',
      method: 'GET',
      statusCode: 200,
      responseTime: 89,
      message: 'MIO Agent logs fetched successfully',
      userEmail: 'admin@dms.it',
    },
  ];
  
  demoLogs.forEach(log => addLog(log));
  console.log(`[API Logs Service] Inizializzati ${demoLogs.length} log di demo`);
}
