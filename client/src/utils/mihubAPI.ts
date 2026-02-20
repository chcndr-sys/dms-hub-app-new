/**
 * MIHUB Backend REST API Client
 * 
 * Client per comunicare con il backend REST su Hetzner
 * Base URL: MIHUB_API_BASE_URL (mihub.157-90-29-66.nip.io)
 */

import { MIHUB_API_BASE_URL } from '@/config/api';

const MIHUB_API_URL = MIHUB_API_BASE_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Helper per chiamate API
 */
async function fetchMIHUB<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${MIHUB_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-agent-id': 'dashboard-pa',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[MIHUB API] Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Logs API
 */
export const logsAPI = {
  /**
   * Inizializza lo schema del database
   */
  initSchema: async () => {
    return fetchMIHUB<ApiResponse<any>>('/api/logs/initSchema', {
      method: 'POST',
    });
  },

  /**
   * Crea un nuovo log
   */
  createLog: async (log: {
    agent: string;
    serviceId?: string;
    endpoint: string;
    method: string;
    statusCode?: number;
    risk?: string;
    success?: boolean;
    message: string;
    meta?: any;
  }) => {
    return fetchMIHUB<ApiResponse<{ logId: string }>>('/api/logs/createLog', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  /**
   * Recupera log con filtri
   */
  getLogs: async (filters?: {
    agent?: string;
    serviceId?: string;
    limit?: number;
    from?: string;
    to?: string;
    success?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters?.agent) params.append('agent', filters.agent);
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.success !== undefined) params.append('success', filters.success.toString());

    const queryString = params.toString();
    const url = `/api/mihub/logs${queryString ? `?${queryString}` : ''}`;

    return fetchMIHUB<{
      success: boolean;
      logs: Array<{
        id: string;
        timestamp: string;
        agent: string;
        serviceId?: string;
        endpoint: string;
        method: string;
        statusCode?: number;
        risk?: string;
        success: boolean;
        message: string;
        meta?: any;
      }>;
      count: number;
      filters: any;
    }>(url);
  },

  /**
   * Statistiche log
   */
  stats: async () => {
    return fetchMIHUB<{
      success: boolean;
      stats: {
        total: number;
        successful: number;
        failed: number;
        uniqueAgents: number;
        uniqueServices: number;
        firstLog: string;
        lastLog: string;
      };
    }>('/api/logs/stats');
  },

  /**
   * Svuota tutti i log (solo dev)
   */
  clear: async () => {
    return fetchMIHUB<ApiResponse<any>>('/api/logs/clear', {
      method: 'DELETE',
    });
  },
};

/**
 * Guardian API
 */
export const guardianAPI = {
  /**
   * Testa un endpoint
   */
  testEndpoint: async (test: {
    serviceId?: string;
    method: string;
    path: string;
    body?: any;
    headers?: Record<string, string>;
  }) => {
    return fetchMIHUB<{
      success: boolean;
      request: {
        method: string;
        url: string;
        body: any;
        headers: Record<string, string>;
      };
      response: {
        statusCode: number;
        durationMs: number;
        headers: Record<string, string>;
        body: any;
      };
      errorMessage?: string;
    }>('/api/guardian/debug/testEndpoint', {
      method: 'POST',
      body: JSON.stringify(test),
    });
  },

  /**
   * Health check Guardian
   */
  health: async () => {
    return fetchMIHUB<{
      success: boolean;
      status: string;
      timestamp: string;
      database: {
        connected: boolean;
        logCount: number;
      };
      version: string;
    }>('/api/guardian/health');
  },

  /**
   * Permessi agenti
   */
  permissions: async () => {
    return fetchMIHUB<{
      success: boolean;
      permissions: any;
    }>('/api/guardian/permissions');
  },
};

/**
 * MIHUB Tasks API
 */
export const mihubAPI = {
  /**
   * Lista task
   */
  getTasks: async (filters?: {
    project?: string;
    status?: string;
    agent?: string;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.project) params.append('project', filters.project);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.agent) params.append('agent', filters.agent);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `/api/mihub/tasks${queryString ? `?${queryString}` : ''}`;

    return fetchMIHUB<{
      success: boolean;
      tasks: Array<{
        id: number;
        project: string;
        title: string;
        description: string;
        type: string;
        status: string;
        priority: string;
        assignedAgent?: string;
        createdBy: string;
        createdAt: string;
        updatedAt: string;
        completedAt?: string;
        meta?: any;
      }>;
      count: number;
      filters: any;
    }>(url);
  },

  /**
   * Crea task
   */
  createTask: async (task: {
    project: string;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    assignedAgent?: string;
    meta?: any;
  }) => {
    return fetchMIHUB<{
      success: boolean;
      taskId: number;
      createdAt: string;
      status: string;
    }>('/api/mihub/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  /**
   * Deploy Vercel
   */
  deployVercel: async (deploy: {
    project?: string;
    branch?: string;
    message?: string;
  }) => {
    return fetchMIHUB<{
      success: boolean;
      deploy: {
        id: string;
        status: string;
        url: string;
        timestamp: string;
      };
      message: string;
    }>('/api/mihub/deploy/vercel', {
      method: 'POST',
      headers: {
        'x-confirm-action': 'true',
      },
      body: JSON.stringify(deploy),
    });
  },
};

/**
 * Imprese & Qualificazioni API
 */
export const impreseAPI = {
  /**
   * Lista imprese con paginazione opzionale
   */
  getImprese: async (params?: { limit?: number; offset?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return fetchMIHUB<{
      success: boolean;
      data: Array<{
        id: number;
        ragione_sociale: string;
        partita_iva: string;
        codice_fiscale?: string;
        comune?: string;
        settore?: string;
        created_at: string;
        updated_at: string;
      }>;
      count: number;
      pagination?: { total: number; limit: number; offset: number };
    }>(`/api/imprese${qs ? `?${qs}` : ''}`);
  },

  /**
   * Dettagli singola impresa
   */
  getImpresaById: async (id: number) => {
    return fetchMIHUB<{
      success: boolean;
      data: {
        id: number;
        ragione_sociale: string;
        partita_iva: string;
        codice_fiscale?: string;
        comune?: string;
        settore?: string;
        created_at: string;
        updated_at: string;
      };
    }>(`/api/imprese/${id}`);
  },

  /**
   * Lista tutte le qualificazioni
   */
  getQualificazioni: async () => {
    return fetchMIHUB<{
      success: boolean;
      data: Array<{
        id: number;
        impresa_id: number;
        tipo: string;
        ente_rilascio?: string;
        data_rilascio?: string;
        data_scadenza?: string;
        stato: string;
        numero_documento?: string;
        note?: string;
        created_at: string;
        updated_at: string;
      }>;
      count: number;
    }>('/api/qualificazioni');
  },

  /**
   * Qualificazioni per impresa specifica
   */
  getQualificazioniByImpresa: async (impresaId: number) => {
    return fetchMIHUB<{
      success: boolean;
      data: Array<{
        id: number;
        impresa_id: number;
        tipo: string;
        ente_rilascio?: string;
        data_rilascio?: string;
        data_scadenza?: string;
        stato: string;
        numero_documento?: string;
        note?: string;
        created_at: string;
        updated_at: string;
      }>;
      count: number;
    }>(`/api/imprese/${impresaId}/qualificazioni`);
  },
};

export default {
  logs: logsAPI,
  guardian: guardianAPI,
  mihub: mihubAPI,
  imprese: impreseAPI,
};
