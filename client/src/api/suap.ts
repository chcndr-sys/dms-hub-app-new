/**
 * SUAP API Client
 * Gestione pratiche amministrative e integrazione PDND
 */

import { addComuneIdToUrl, getImpersonationParams } from '@/hooks/useImpersonation';

const baseUrl = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

export interface SuapPratica {
  id: number;
  ente_id: string;
  cui: string;
  tipo_pratica: string;
  stato: 'RECEIVED' | 'PRECHECK' | 'EVALUATED' | 'APPROVED' | 'REJECTED' | 'INTEGRATION_NEEDED';
  richiedente_cf: string;
  richiedente_nome: string;
  data_presentazione: string;
  score?: number;
  esito_automatico?: string;
  created_at: string;
  updated_at: string;
}

export interface SuapEvento {
  id: number;
  pratica_id: number;
  tipo_evento: string;
  descrizione: string;
  created_at: string;
  payload_raw?: any;
}

export interface SuapCheck {
  id: number;
  pratica_id: number;
  check_code: string;
  tipo_check?: string;  // alias per check_code
  esito: boolean | string;  // può essere boolean o 'PASS'/'FAIL'
  fonte: string;
  data_check?: string;  // timestamp del controllo
  created_at: string;
  dettaglio?: any;
}

export interface SuapStats {
  total: number;
  in_lavorazione: number;
  approvate: number;
  rigettate: number;
}

export interface SuapFilters {
  stato?: string;
  search?: string;
  comune_nome?: string;
  comune_id?: string;
}

/**
 * Recupera le statistiche generali per la dashboard SUAP
 * Filtrate per comune_id se in modalità impersonazione
 */
export async function getSuapStats(enteId: string): Promise<SuapStats> {
  // Aggiungi comune_id se in modalità impersonazione
  const url = addComuneIdToUrl(`${baseUrl}/api/suap/stats?ente_id=${enteId}`);
  
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!res.ok) throw new Error('Failed to fetch SUAP stats');
  const json = await res.json();
  return json.data;
}

/**
 * Recupera la lista delle pratiche con filtri opzionali
 * Filtrate per comune_id se in modalità impersonazione
 */
export async function getSuapPratiche(enteId: string, filters: SuapFilters = {}): Promise<SuapPratica[]> {
  const params = new URLSearchParams();
  params.append('ente_id', enteId);
  if (filters.stato) params.append('stato', filters.stato);
  if (filters.search) params.append('search', filters.search);
  if (filters.comune_nome) params.append('comune_nome', filters.comune_nome);
  
  // Aggiungi comune_id se in modalità impersonazione
  const url = addComuneIdToUrl(`${baseUrl}/api/suap/pratiche?${params.toString()}`);

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) throw new Error('Failed to fetch SUAP pratiche');
  const json = await res.json();
  return json.data;
}

/**
 * Recupera il dettaglio di una singola pratica inclusi eventi e check
 */
export async function getSuapPraticaById(id: string, enteId: string): Promise<SuapPratica & { timeline: SuapEvento[], checks: SuapCheck[] }> {
  const res = await fetch(`${baseUrl}/api/suap/pratiche/${id}?ente_id=${enteId}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) throw new Error('Failed to fetch SUAP pratica detail');
  const json = await res.json();
  return json.data;
}

/**
 * Crea una nuova pratica (simulazione ingestione)
 * Passa ente_id nel body per evitare problemi CORS con header custom
 */
export async function createSuapPratica(enteId: string, data: Partial<SuapPratica>): Promise<SuapPratica> {
  const res = await fetch(`${baseUrl}/api/suap/pratiche`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...data,
      ente_id: enteId
    })
  });

  if (!res.ok) throw new Error('Failed to create SUAP pratica');
  const json = await res.json();
  return json.data;
}

/**
 * Esegue la valutazione automatica di una pratica
 */
export async function evaluateSuapPratica(id: string, enteId: string): Promise<any> {
  const res = await fetch(`${baseUrl}/api/suap/pratiche/${id}/valuta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ente_id: enteId })
  });

  if (!res.ok) throw new Error('Failed to evaluate SUAP pratica');
  const json = await res.json();
  return json.data;
}
