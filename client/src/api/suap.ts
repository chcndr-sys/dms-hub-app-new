/**
 * SUAP API Client
 * Gestione pratiche amministrative e integrazione PDND
 */

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
  esito: boolean;
  fonte: string;
  created_at: string;
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
}

/**
 * Recupera le statistiche generali per la dashboard SUAP
 */
export async function getSuapStats(enteId: string): Promise<SuapStats> {
  const res = await fetch(`${baseUrl}/api/suap/stats?ente_id=${enteId}`, {
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
 */
export async function getSuapPratiche(enteId: string, filters: SuapFilters = {}): Promise<SuapPratica[]> {
  const params = new URLSearchParams();
  params.append('ente_id', enteId);
  if (filters.stato) params.append('stato', filters.stato);
  if (filters.search) params.append('search', filters.search);

  const res = await fetch(`${baseUrl}/api/suap/pratiche?${params.toString()}`, {
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
