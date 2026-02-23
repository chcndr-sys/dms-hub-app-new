/**
 * REST HTTP Client — sostituisce il vecchio client tRPC.
 *
 * Converte le procedure tRPC in chiamate REST dirette al backend Hetzner.
 * I componenti continuano a usare trpcQuery/trpcMutate ma le chiamate
 * vengono tradotte in endpoint REST.
 *
 * Mapping: procedure tRPC → endpoint REST
 *   "dmsHub.markets.list"          → GET /api/markets
 *   "dmsHub.stalls.listByMarket"   → GET /api/stalls?marketId=X
 *   "wallet.stats"                 → GET /api/wallet/stats
 *   "guardian.logs"                → GET /api/guardian/logs
 *   "integrations.apiStats.today"  → GET /api/dashboard/integrations/endpoint-count
 *   etc.
 */

import { MIHUB_API_BASE_URL } from '@/config/api';

const REST_BASE = `${MIHUB_API_BASE_URL}/api`;

/**
 * Mappa procedure tRPC → path REST.
 * Le procedure non mappate vengono convertite automaticamente:
 *   "dmsHub.xxx.yyy" → "/api/xxx/yyy"
 *   "wallet.xxx"     → "/api/wallet/xxx"
 *   "guardian.xxx"    → "/api/guardian/xxx"
 */
const PROCEDURE_MAP: Record<string, string> = {
  // Integrations
  'integrations.apiStats.today': '/api/dashboard/integrations/endpoint-count',
  'integrations.connections.list': '/api/integrations/connections',
  'integrations.connections.healthCheck': '/api/integrations/connections/health-check',
  'integrations.connections.healthCheckAll': '/api/integrations/connections/health-check-all',
  'integrations.apiKeys.list': '/api/integrations/api-keys',
  'integrations.apiKeys.create': '/api/integrations/api-keys',
  'integrations.apiKeys.delete': '/api/integrations/api-keys/delete',
  'integrations.apiKeys.regenerate': '/api/integrations/api-keys/regenerate',
  'integrations.webhooks.list': '/api/integrations/webhooks',
  'integrations.webhooks.create': '/api/integrations/webhooks',
  'integrations.webhooks.test': '/api/integrations/webhooks/test',
  'integrations.webhooks.delete': '/api/integrations/webhooks/delete',
  'integrations.sync.status': '/api/integrations/sync/status',
  'integrations.sync.jobs': '/api/integrations/sync/jobs',
  'integrations.sync.getConfig': '/api/integrations/sync/config',
  'integrations.sync.trigger': '/api/integrations/sync/trigger',
  'integrations.sync.updateConfig': '/api/integrations/sync/config',
  // Guardian
  'guardian.integrations': '/api/guardian/integrations',
  'guardian.logs': '/api/guardian/logs',
  'guardian.stats': '/api/guardian/stats',
  'guardian.testEndpoint': '/api/guardian/test-endpoint',
  'guardian.logApiCall': '/api/guardian/log',
};

/**
 * Converte una procedure tRPC in un path REST.
 */
function toRestPath(procedure: string): string {
  // Se esiste un mapping esplicito, usalo
  if (PROCEDURE_MAP[procedure]) {
    return PROCEDURE_MAP[procedure];
  }

  // Auto-convert: "dmsHub.xxx.yyy" → "/api/xxx/yyy"
  if (procedure.startsWith('dmsHub.')) {
    const parts = procedure.replace('dmsHub.', '').split('.');
    return `/api/${parts.join('/')}`;
  }

  // Auto-convert: "wallet.xxx" → "/api/wallet/xxx"
  // Auto-convert: "logs.xxx" → "/api/logs/xxx"
  const parts = procedure.split('.');
  return `/api/${parts.join('/')}`;
}

/**
 * Chiama una query REST via GET.
 * @param procedure es. "dmsHub.hub.locations.list"
 * @param input parametri opzionali (aggiunti come query string)
 */
export async function trpcQuery<T = unknown>(procedure: string, input?: unknown): Promise<T> {
  const path = toRestPath(procedure);
  let url = `${MIHUB_API_BASE_URL}${path}`;
  if (input !== undefined && input !== null) {
    const params = new URLSearchParams();
    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
    }
    const qs = params.toString();
    if (qs) {
      url += `${url.includes('?') ? '&' : '?'}${qs}`;
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`REST ${procedure}: ${res.status} ${res.statusText}`);
  const json = await res.json();
  // Il backend REST restituisce { success: true, data: ... } oppure dati diretti
  return (json?.data ?? json) as T;
}

/**
 * Chiama una mutation REST via POST.
 * @param procedure es. "dmsHub.hub.locations.create"
 * @param input dati della mutation (inviati come JSON body)
 */
export async function trpcMutate<T = unknown>(procedure: string, input?: unknown): Promise<T> {
  const path = toRestPath(procedure);
  const res = await fetch(`${MIHUB_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  });
  if (!res.ok) throw new Error(`REST ${procedure}: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return (json?.data ?? json) as T;
}
