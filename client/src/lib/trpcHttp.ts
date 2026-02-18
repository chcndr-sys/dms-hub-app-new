/**
 * tRPC HTTP Client — chiamate tRPC via fetch() senza dipendenza da @trpc/client.
 *
 * Usato per lo "stacco backend": i componenti migrati usano useQuery/useMutation
 * di @tanstack/react-query con queste helper function invece del client tRPC.
 *
 * Il backend usa SuperJSON transformer, quindi le risposte sono wrappate in:
 *   { result: { data: { json: ..., meta: ... } } }
 */

import { MIHUB_API_BASE_URL } from '@/config/api';

const TRPC_BASE = `${MIHUB_API_BASE_URL}/api/trpc`;

/** Unwrap SuperJSON response da tRPC */
function unwrap(body: unknown): unknown {
  const b = body as Record<string, unknown> | undefined;
  const result = b?.result as Record<string, unknown> | undefined;
  const data = result?.data as Record<string, unknown> | unknown;
  if (data && typeof data === 'object' && 'json' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).json;
  }
  return data ?? body;
}

/**
 * Chiama una query tRPC via GET.
 * @param procedure es. "dmsHub.hub.locations.list"
 * @param input parametri opzionali per la query
 */
export async function trpcQuery<T = unknown>(procedure: string, input?: unknown): Promise<T> {
  let url = `${TRPC_BASE}/${procedure}`;
  if (input !== undefined) {
    url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`tRPC ${procedure}: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return unwrap(json) as T;
}

/**
 * Chiama una mutation tRPC via POST.
 * @param procedure es. "dmsHub.hub.locations.create"
 * @param input dati della mutation
 */
export async function trpcMutate<T = unknown>(procedure: string, input?: unknown): Promise<T> {
  const res = await fetch(`${TRPC_BASE}/${procedure}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: input ?? {} }),
  });
  if (!res.ok) throw new Error(`tRPC ${procedure}: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return unwrap(json) as T;
}
