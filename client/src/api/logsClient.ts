// Logs & Guardian API Client
// Collegamento al backend mihub-backend-rest

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

// ============================================================================
// TYPES
// ============================================================================

export interface Log {
  id: string;
  timestamp: string;
  agent: string;
  serviceId?: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  risk?: string;
  success: boolean;
  message?: string;
  meta?: any;
}

export interface LogsResponse {
  success: boolean;
  logs: Log[];
  count: number;
  filters?: any;
}

export interface LogsStats {
  total: number;
  successful: number;
  failed: number;
  uniqueAgents: number;
  uniqueServices: number;
  firstLog?: string;
  lastLog?: string;
}

export interface LogsStatsResponse {
  success: boolean;
  stats: LogsStats;
}

export interface GuardianHealthResponse {
  success: boolean;
  status: string;
  timestamp: string;
  services: {
    database: string;
    redis?: string;
    api: string;
  };
}

export interface DebugTestRequest {
  serviceId?: string;
  method?: string;
  path: string;
  body?: any;
  headers?: Record<string, string>;
}

export interface DebugTestResponse {
  success: boolean;
  statusCode: number;
  durationMs: number;
  responseBody: any;
  errorMessage?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * GET /api/logs/getLogs
 * Recupera logs con filtri opzionali
 */
export async function getLogs(filters?: {
  agent?: string;
  serviceId?: string;
  limit?: number;
  from?: string;
  to?: string;
  success?: boolean;
}): Promise<LogsResponse> {
  const params = new URLSearchParams();
  
  if (filters?.agent) params.append('agent', filters.agent);
  if (filters?.serviceId) params.append('serviceId', filters.serviceId);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.from) params.append('from', filters.from);
  if (filters?.to) params.append('to', filters.to);
  if (filters?.success !== undefined) params.append('success', filters.success.toString());

  const url = `${API_BASE_URL}/api/logs/getLogs?${params.toString()}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/logs/stats
 * Statistiche aggregate sui log
 */
export async function getLogsStats(): Promise<LogsStatsResponse> {
  const url = `${API_BASE_URL}/api/logs/stats`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch logs stats: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * GET /api/guardian/health
 * Health check Guardian
 */
export async function getGuardianHealth(): Promise<GuardianHealthResponse> {
  const url = `${API_BASE_URL}/api/guardian/health`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Guardian health: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * POST /api/guardian/debug/testEndpoint
 * Testa un endpoint API
 */
export async function testEndpoint(request: DebugTestRequest): Promise<DebugTestResponse> {
  const url = `${API_BASE_URL}/api/guardian/debug/testEndpoint`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to test endpoint: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * POST /api/logs/initSchema
 * Inizializza schema tabella logs (solo per setup iniziale)
 */
export async function initLogsSchema(): Promise<{ success: boolean; message: string }> {
  const url = `${API_BASE_URL}/api/logs/initSchema`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to init logs schema: ${response.statusText}`);
  }
  
  return response.json();
}
