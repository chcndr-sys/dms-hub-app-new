/**
 * DMS Legacy Interoperability Service
 *
 * Connessione diretta al DB PostgreSQL Legacy su Heroku (AWS RDS).
 * Il Legacy usa stored functions `_crup` per tutte le operazioni CRUD.
 * Pattern: SELECT stored_function('{"key":"value"}'::json)
 *
 * Pool limitato a 3 connessioni per non sovraccaricare il DB Legacy.
 * Connessione opzionale: se DMS_LEGACY_DB_URL non è configurato, opera in modalità offline.
 */

import postgres from "postgres";

// ============================================
// Connection Management
// ============================================

let _legacyClient: ReturnType<typeof postgres> | null = null;
let _lastHealthCheck: { ok: boolean; time: Date; latency: number; error?: string } | null = null;

function getLegacyDbUrl(): string | null {
  return process.env.DMS_LEGACY_DB_URL || null;
}

export function isLegacyConfigured(): boolean {
  return !!getLegacyDbUrl();
}

function getLegacyClient(): ReturnType<typeof postgres> | null {
  if (_legacyClient) return _legacyClient;

  const url = getLegacyDbUrl();
  if (!url) return null;

  _legacyClient = postgres(url, {
    max: 3,               // Max 3 connessioni (per non sovraccaricare Legacy)
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 5, // Ricicla ogni 5 min
    ssl: { rejectUnauthorized: false }, // Heroku richiede SSL senza verifica cert
  });

  return _legacyClient;
}

export async function closeLegacyDb(): Promise<void> {
  if (_legacyClient) {
    try { await _legacyClient.end(); } catch {}
    _legacyClient = null;
  }
}

// ============================================
// Health Check
// ============================================

export async function legacyHealthCheck(): Promise<{
  connected: boolean;
  latency: number;
  tables: number;
  error?: string;
}> {
  const client = getLegacyClient();
  if (!client) {
    return { connected: false, latency: 0, tables: 0, error: "DMS_LEGACY_DB_URL non configurato" };
  }

  const start = Date.now();
  try {
    const result = await client`
      SELECT count(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const latency = Date.now() - start;
    const tables = Number(result[0]?.table_count || 0);
    _lastHealthCheck = { ok: true, time: new Date(), latency };
    return { connected: true, latency, tables };
  } catch (error: any) {
    const latency = Date.now() - start;
    _lastHealthCheck = { ok: false, time: new Date(), latency, error: error.message };
    return { connected: false, latency, tables: 0, error: error.message };
  }
}

export function getLastHealthCheck() {
  return _lastHealthCheck;
}

// ============================================
// Stored Function Calls (Scrittura → Legacy)
// ============================================

/**
 * Chiama una stored function Legacy passando un JSON.
 * Pattern: SELECT function_name($1::json)
 * Le funzioni _crup: se ID è NULL → INSERT, se valorizzato → UPDATE.
 */
async function callStoredFunction(functionName: string, payload: Record<string, any>): Promise<any> {
  const client = getLegacyClient();
  if (!client) {
    throw new Error(`Legacy DB non connesso — impossibile chiamare ${functionName}`);
  }

  const jsonPayload = JSON.stringify(payload);
  try {
    const result = await client`SELECT ${client(functionName)}(${jsonPayload}::json) as result`;
    return result[0]?.result;
  } catch (error: any) {
    // Fallback: prova con query raw per stored functions che non accettano il formato sopra
    try {
      const result = await client.unsafe(`SELECT ${functionName}('${jsonPayload.replace(/'/g, "''")}') as result`);
      return result[0]?.result;
    } catch (fallbackError: any) {
      console.error(`[DMS Legacy] Errore chiamata ${functionName}:`, fallbackError.message);
      throw new Error(`Stored function ${functionName} fallita: ${fallbackError.message}`);
    }
  }
}

// ============================================
// SYNC OUT: MioHub → Legacy (Scrittura)
// ============================================

export async function syncOutVendor(ambJson: Record<string, any>): Promise<any> {
  return callStoredFunction("amb_crup", ambJson);
}

export async function syncOutMarket(mktJson: Record<string, any>): Promise<any> {
  return callStoredFunction("mercati_crup", mktJson);
}

export async function syncOutStall(pzJson: Record<string, any>): Promise<any> {
  return callStoredFunction("piazzole_crup", pzJson);
}

export async function syncOutConcession(concJson: Record<string, any>): Promise<any> {
  return callStoredFunction("conc_std_crup", concJson);
}

export async function syncOutSpuntista(spJson: Record<string, any>): Promise<any> {
  return callStoredFunction("spuntisti_crup", spJson);
}

export async function syncOutUser(suserJson: Record<string, any>): Promise<any> {
  return callStoredFunction("suser_crup", suserJson);
}

export async function syncOutStartSession(params: { mkt_id: number }): Promise<any> {
  return callStoredFunction("istanza_start", params);
}

export async function syncOutCloseSession(params: { ist_id: number }): Promise<any> {
  return callStoredFunction("istanza_cleanup", params);
}

// ============================================
// EXPORT / SYNC IN: Legacy → MioHub (Lettura)
// ============================================

async function queryLegacy(query: string): Promise<any[]> {
  const client = getLegacyClient();
  if (!client) {
    throw new Error("Legacy DB non connesso");
  }
  return client.unsafe(query);
}

export async function readLegacyMarkets(): Promise<any[]> {
  return queryLegacy(`
    SELECT mkt_id, mkt_desc, mkt_city, mkt_addr, mkt_lat, mkt_lng,
           mkt_prezzo, mkt_dal, mkt_al, mkt_enabled
    FROM mercati
    ORDER BY mkt_id
  `);
}

export async function readLegacyVendors(): Promise<any[]> {
  return queryLegacy(`
    SELECT amb_id, amb_ragsoc, amb_piva, amb_cfisc, amb_email, amb_phone,
           amb_addr_via, amb_addr_civ, amb_addr_cap, amb_addr_city, amb_addr_prov,
           amb_saldo_bors, amb_punti_grad_dfl, amb_fido, amb_enabled
    FROM amb
    ORDER BY amb_id
  `);
}

export async function readLegacyConcessions(): Promise<any[]> {
  return queryLegacy(`
    SELECT conc_id, conc_dal, conc_al, conc_stato, conc_importo,
           conc_alimentare, amb_id, mkt_id, pz_id
    FROM conc_std
    ORDER BY conc_id
  `);
}

export async function readLegacyStalls(marketId?: number): Promise<any[]> {
  const where = marketId ? `WHERE mkt_id = ${Number(marketId)}` : "";
  return queryLegacy(`
    SELECT pz_id, pz_numero, pz_mq, pz_lat, pz_lng, pz_height, pz_width,
           pz_alimentare, pz_enabled, mkt_id
    FROM piazzole ${where}
    ORDER BY pz_id
  `);
}

export async function readLegacyPresences(marketId: number): Promise<any[]> {
  return queryLegacy(`
    SELECT p.pre_id, p.pre_ingresso, p.pre_uscita, p.pre_spazzatura,
           p.pre_rifiutata, p.pre_prezzo, p.pre_tipo, p.pre_note,
           p.amb_id, p.pz_id, p.ist_id, p.suser_id
    FROM presenze p
    JOIN istanze i ON p.ist_id = i.ist_id
    WHERE i.mkt_id = ${Number(marketId)}
    ORDER BY p.pre_ingresso DESC
    LIMIT 1000
  `);
}

export async function readLegacySessions(marketId: number): Promise<any[]> {
  return queryLegacy(`
    SELECT ist_id, ist_data, ist_ora_inizio, ist_ora_fine, ist_stato, mkt_id,
           ist_total_presenze, ist_total_concessionari, ist_total_spuntisti
    FROM istanze
    WHERE mkt_id = ${Number(marketId)}
    ORDER BY ist_data DESC
    LIMIT 100
  `);
}

export async function readLegacySpuntisti(): Promise<any[]> {
  return queryLegacy(`
    SELECT sp_id, sp_dal, sp_al, sp_stato, sp_importo, amb_id, mkt_id
    FROM spuntisti
    ORDER BY sp_id
  `);
}

export async function readLegacyDocuments(): Promise<any[]> {
  return queryLegacy(`
    SELECT doc_id, doc_tipo, doc_numero, doc_scadenza, doc_stato, amb_id
    FROM documenti
    ORDER BY doc_id
  `);
}

export async function readLegacyStats(): Promise<{
  mercati: number;
  ambulanti: number;
  concessioni: number;
  piazzole: number;
  presenze: number;
  utenti: number;
}> {
  const client = getLegacyClient();
  if (!client) throw new Error("Legacy DB non connesso");

  const [result] = await client`
    SELECT
      (SELECT count(*) FROM mercati) as mercati,
      (SELECT count(*) FROM amb) as ambulanti,
      (SELECT count(*) FROM conc_std) as concessioni,
      (SELECT count(*) FROM piazzole) as piazzole,
      (SELECT count(*) FROM presenze) as presenze,
      (SELECT count(*) FROM suser) as utenti
  `;
  return {
    mercati: Number(result.mercati || 0),
    ambulanti: Number(result.ambulanti || 0),
    concessioni: Number(result.concessioni || 0),
    piazzole: Number(result.piazzole || 0),
    presenze: Number(result.presenze || 0),
    utenti: Number(result.utenti || 0),
  };
}

export async function readLegacyUsers(): Promise<any[]> {
  return queryLegacy(`
    SELECT suser_id, suser_email, suser_nome, suser_cognome, suser_phone,
           suser_role, suser_enabled, suser_badge
    FROM suser
    ORDER BY suser_id
  `);
}
