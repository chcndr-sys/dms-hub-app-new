/**
 * DMS Legacy Transformer — Adattamento Bidirezionale al Formato Legacy
 *
 * Regola fondamentale: Noi ci adattiamo al formato del Legacy.
 * I dati escono dal nostro sistema gia' pronti per le tabelle Legacy.
 *
 * SYNC OUT: MioHub → Legacy (formato amb_*, mkt_*, pz_*, conc_*, suser_*, sp_*)
 * SYNC IN:  Legacy → MioHub (formato vendor_presences, market_sessions)
 */

// ============================================
// SYNC OUT: MioHub → Legacy
// ============================================

/**
 * Trasforma impresa MioHub → formato ambulante Legacy (tabella `amb`)
 * Stored function target: amb_crup(json)
 */
export function transformVendorToAmb(vendor: {
  id: number;
  legacyAmbId?: number | null;
  businessName?: string | null;
  vatNumber?: string | null;
  fiscalCode?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: string | null;
}): Record<string, any> {
  const parsed = parseAddress(vendor.address || "");

  return {
    amb_id: vendor.legacyAmbId || null, // NULL = INSERT, valorizzato = UPDATE
    amb_ragsoc: vendor.businessName || `${vendor.fiscalCode || "N/D"}`,
    amb_piva: vendor.vatNumber || null,
    amb_cfisc: vendor.fiscalCode || null,
    amb_email: vendor.email || null,
    amb_phone: vendor.phone || null,
    amb_addr_via: parsed.via,
    amb_addr_civ: parsed.civico,
    amb_addr_cap: parsed.cap,
    amb_addr_city: parsed.citta,
    amb_addr_prov: parsed.provincia,
    amb_enabled: vendor.status !== "inactive",
  };
}

/**
 * Trasforma mercato MioHub → formato mercato Legacy (tabella `mercati`)
 * Stored function target: mercati_crup(json)
 */
export function transformMarketToMkt(market: {
  id: number;
  legacyMktId?: number | null;
  name: string;
  city: string;
  address: string;
  lat: string;
  lng: string;
  active?: number;
}): Record<string, any> {
  return {
    mkt_id: market.legacyMktId || null,
    mkt_desc: market.name,
    mkt_city: market.city,
    mkt_addr: market.address,
    mkt_lat: market.lat,
    mkt_lng: market.lng,
    mkt_enabled: (market.active ?? 1) === 1,
  };
}

/**
 * Trasforma posteggio MioHub → formato piazzola Legacy (tabella `piazzole`)
 * Stored function target: piazzole_crup(json)
 */
export function transformStallToPz(stall: {
  id: number;
  legacyPzId?: number | null;
  marketId: number;
  number: string;
  lat: string;
  lng: string;
  areaMq?: number | null;
  status?: string | null;
  category?: string | null;
}, legacyMktId: number | null): Record<string, any> {
  const isAlimentare = (stall.category || "").toLowerCase().includes("alimentar");

  return {
    pz_id: stall.legacyPzId || null,
    pz_numero: stall.number,
    pz_mq: stall.areaMq || 0,
    pz_lat: stall.lat,
    pz_lng: stall.lng,
    pz_alimentare: isAlimentare,
    pz_enabled: stall.status !== "maintenance" && stall.status !== "disabled",
    mkt_id: legacyMktId || null,
  };
}

/**
 * Trasforma concessione MioHub → formato concessione Legacy (tabella `conc_std`)
 * Stored function target: conc_std_crup(json)
 */
export function transformConcessionToConc(concession: {
  id: number;
  legacyConcId?: number | null;
  vendorId: number;
  marketId: number;
  stallId?: number | null;
  startDate: Date;
  endDate?: Date | null;
  status?: string | null;
  fee?: number | null;
  type?: string | null;
}, legacyAmbId: number | null, legacyMktId: number | null, legacyPzId: number | null): Record<string, any> {
  const statusMap: Record<string, string> = {
    active: "ATTIVA",
    expired: "SCADUTA",
    suspended: "SOSPESA",
    revoked: "REVOCATA",
  };

  return {
    conc_id: concession.legacyConcId || null,
    conc_dal: concession.startDate?.toISOString().split("T")[0] || null,
    conc_al: concession.endDate?.toISOString().split("T")[0] || null,
    conc_stato: statusMap[concession.status || "active"] || "ATTIVA",
    conc_importo: concession.fee ? concession.fee / 100 : 0, // Da centesimi a euro
    conc_alimentare: false, // Da calcolare se necessario
    amb_id: legacyAmbId,
    mkt_id: legacyMktId,
    pz_id: legacyPzId,
  };
}

/**
 * Trasforma utente MioHub → formato suser Legacy (tabella `suser`)
 * Stored function target: suser_crup(json)
 * MAI trasferire: suser_password, suser_otp, suser_otp_creation
 */
export function transformUserToSuser(user: {
  id: number;
  email?: string | null;
  name?: string | null;
  role: string;
  cieId?: string | null;
}): Record<string, any> {
  const roleMap: Record<string, string> = {
    admin: "ADMIN",
    user: "OP",
  };

  const nameParts = (user.name || "").split(" ");
  const nome = nameParts[0] || "";
  const cognome = nameParts.slice(1).join(" ") || "";

  return {
    suser_id: null, // Legacy gestisce gli ID internamente
    suser_email: user.email || null,
    suser_nome: nome,
    suser_cognome: cognome,
    suser_role: roleMap[user.role] || "OP",
    suser_enabled: true,
    suser_badge: user.cieId || null, // CIE sostituisce badge NFC
  };
}

/**
 * Trasforma spuntista MioHub → formato spuntista Legacy (tabella `spuntisti`)
 * Stored function target: spuntisti_crup(json)
 */
export function transformSpuntistaToSp(spuntista: {
  id: number;
  legacySpId?: number | null;
  vendorId: number;
  marketId: number;
  autorizzato: boolean;
  dataAutorizzazione?: Date | null;
  dataScadenza?: Date | null;
}, legacyAmbId: number | null, legacyMktId: number | null): Record<string, any> {
  return {
    sp_id: spuntista.legacySpId || null,
    sp_dal: spuntista.dataAutorizzazione?.toISOString().split("T")[0] || null,
    sp_al: spuntista.dataScadenza?.toISOString().split("T")[0] || null,
    sp_stato: spuntista.autorizzato ? "ATTIVO" : "REVOCATO",
    amb_id: legacyAmbId,
    mkt_id: legacyMktId,
  };
}

// ============================================
// SYNC IN: Legacy → MioHub
// ============================================

/**
 * Trasforma presenza Legacy → formato vendor_presences MioHub
 */
export function transformPreToPresence(pre: {
  pre_id: number;
  pre_ingresso?: string | null;
  pre_uscita?: string | null;
  pre_spazzatura?: boolean | null;
  pre_rifiutata?: boolean | null;
  pre_prezzo?: number | string | null;
  pre_tipo?: string | null;
  pre_note?: string | null;
  amb_id?: number | null;
  pz_id?: number | null;
  ist_id?: number | null;
}): {
  legacyPreId: number;
  checkinTime: Date | null;
  checkoutTime: Date | null;
  orarioDepositoRifiuti: Date | null;
  rifiutata: boolean;
  importoAddebitato: string | null;
  tipoPresenza: string | null;
  notes: string | null;
  legacyAmbId: number | null;
  legacyPzId: number | null;
  legacyIstId: number | null;
} {
  return {
    legacyPreId: pre.pre_id,
    checkinTime: pre.pre_ingresso ? new Date(pre.pre_ingresso) : null,
    checkoutTime: pre.pre_uscita ? new Date(pre.pre_uscita) : null,
    orarioDepositoRifiuti: pre.pre_spazzatura ? new Date() : null,
    rifiutata: !!pre.pre_rifiutata,
    importoAddebitato: pre.pre_prezzo != null ? String(pre.pre_prezzo) : null,
    tipoPresenza: pre.pre_tipo || null,
    notes: pre.pre_note || null,
    legacyAmbId: pre.amb_id || null,
    legacyPzId: pre.pz_id || null,
    legacyIstId: pre.ist_id || null,
  };
}

/**
 * Trasforma istanza Legacy → formato market_sessions MioHub
 */
export function transformIstToSession(ist: {
  ist_id: number;
  ist_data?: string | null;
  ist_ora_inizio?: string | null;
  ist_ora_fine?: string | null;
  ist_stato?: string | null;
  mkt_id?: number | null;
  ist_total_presenze?: number | null;
  ist_total_concessionari?: number | null;
  ist_total_spuntisti?: number | null;
}): {
  legacyIstId: number;
  sessionDate: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
  status: string;
  legacyMktId: number | null;
  totalPresences: number;
  totalConcessionari: number;
  totalSpuntisti: number;
} {
  const statusMap: Record<string, string> = {
    APERTA: "open",
    CHIUSA: "closed",
    PIANIFICATA: "planned",
    ANNULLATA: "cancelled",
  };

  return {
    legacyIstId: ist.ist_id,
    sessionDate: ist.ist_data ? new Date(ist.ist_data) : null,
    openedAt: ist.ist_ora_inizio ? new Date(ist.ist_ora_inizio) : null,
    closedAt: ist.ist_ora_fine ? new Date(ist.ist_ora_fine) : null,
    status: statusMap[ist.ist_stato || ""] || "planned",
    legacyMktId: ist.mkt_id || null,
    totalPresences: ist.ist_total_presenze || 0,
    totalConcessionari: ist.ist_total_concessionari || 0,
    totalSpuntisti: ist.ist_total_spuntisti || 0,
  };
}

/**
 * Trasforma mercato Legacy → formato markets MioHub (per EXPORT/read)
 */
export function transformMktToMarket(mkt: {
  mkt_id: number;
  mkt_desc?: string | null;
  mkt_city?: string | null;
  mkt_addr?: string | null;
  mkt_lat?: string | null;
  mkt_lng?: string | null;
  mkt_enabled?: boolean | null;
}): Record<string, any> {
  return {
    legacyMktId: mkt.mkt_id,
    name: mkt.mkt_desc || "N/D",
    city: mkt.mkt_city || "",
    address: mkt.mkt_addr || "",
    lat: mkt.mkt_lat || "0",
    lng: mkt.mkt_lng || "0",
    active: mkt.mkt_enabled !== false ? 1 : 0,
  };
}

/**
 * Trasforma ambulante Legacy → formato vendors MioHub (per EXPORT/read)
 */
export function transformAmbToVendor(amb: {
  amb_id: number;
  amb_ragsoc?: string | null;
  amb_piva?: string | null;
  amb_cfisc?: string | null;
  amb_email?: string | null;
  amb_phone?: string | null;
  amb_addr_via?: string | null;
  amb_addr_civ?: string | null;
  amb_addr_cap?: string | null;
  amb_addr_city?: string | null;
  amb_addr_prov?: string | null;
  amb_enabled?: boolean | null;
}): Record<string, any> {
  const fullAddress = [
    amb.amb_addr_via,
    amb.amb_addr_civ,
    amb.amb_addr_cap,
    amb.amb_addr_city,
    amb.amb_addr_prov ? `(${amb.amb_addr_prov})` : null,
  ].filter(Boolean).join(" ");

  return {
    legacyAmbId: amb.amb_id,
    businessName: amb.amb_ragsoc || null,
    vatNumber: amb.amb_piva || null,
    fiscalCode: amb.amb_cfisc || null,
    email: amb.amb_email || null,
    phone: amb.amb_phone || null,
    address: fullAddress || null,
    status: amb.amb_enabled !== false ? "active" : "inactive",
  };
}

/**
 * Trasforma concessione Legacy → formato concessions MioHub (per EXPORT/read)
 */
export function transformConcToConcession(conc: {
  conc_id: number;
  conc_dal?: string | null;
  conc_al?: string | null;
  conc_stato?: string | null;
  conc_importo?: number | null;
  amb_id?: number | null;
  mkt_id?: number | null;
  pz_id?: number | null;
}): Record<string, any> {
  const statusMap: Record<string, string> = {
    ATTIVA: "active",
    SCADUTA: "expired",
    SOSPESA: "suspended",
    REVOCATA: "revoked",
  };

  return {
    legacyConcId: conc.conc_id,
    startDate: conc.conc_dal || null,
    endDate: conc.conc_al || null,
    status: statusMap[conc.conc_stato || ""] || "active",
    fee: conc.conc_importo ? Math.round(conc.conc_importo * 100) : null, // Euro → centesimi
    legacyAmbId: conc.amb_id || null,
    legacyMktId: conc.mkt_id || null,
    legacyPzId: conc.pz_id || null,
  };
}

// ============================================
// Utility: Resolve ID mapping
// ============================================

/**
 * Risolve vendor_id MioHub da legacy_amb_id
 */
export async function resolveVendorId(
  db: any,
  legacyAmbId: number,
): Promise<number | null> {
  const { vendors } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.legacyAmbId, legacyAmbId)).limit(1);
  return result[0]?.id || null;
}

/**
 * Risolve stall_id MioHub da legacy_pz_id
 */
export async function resolveStallId(
  db: any,
  legacyPzId: number,
): Promise<number | null> {
  const { stalls } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db.select({ id: stalls.id }).from(stalls).where(eq(stalls.legacyPzId, legacyPzId)).limit(1);
  return result[0]?.id || null;
}

/**
 * Risolve market_id MioHub da legacy_mkt_id
 */
export async function resolveMarketId(
  db: any,
  legacyMktId: number,
): Promise<number | null> {
  const { markets } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db.select({ id: markets.id }).from(markets).where(eq(markets.legacyMktId, legacyMktId)).limit(1);
  return result[0]?.id || null;
}

/**
 * Risolve session_id MioHub da legacy_ist_id
 */
export async function resolveSessionId(
  db: any,
  legacyIstId: number,
): Promise<number | null> {
  const { marketSessions } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db.select({ id: marketSessions.id }).from(marketSessions).where(eq(marketSessions.legacyIstId, legacyIstId)).limit(1);
  return result[0]?.id || null;
}

// ============================================
// Utility: Parse indirizzo italiano
// ============================================

function parseAddress(address: string): {
  via: string | null;
  civico: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
} {
  if (!address) return { via: null, civico: null, cap: null, citta: null, provincia: null };

  // Prova a parsare "Via Roma 15, 50100 Firenze (FI)"
  const match = address.match(
    /^(.+?)\s+(\d+[A-Za-z]?)?\s*,?\s*(\d{5})?\s*(.+?)?\s*\(([A-Z]{2})\)?$/
  );

  if (match) {
    return {
      via: match[1]?.trim() || null,
      civico: match[2]?.trim() || null,
      cap: match[3]?.trim() || null,
      citta: match[4]?.trim() || null,
      provincia: match[5]?.trim() || null,
    };
  }

  // Fallback: metti tutto in "via"
  return { via: address, civico: null, cap: null, citta: null, provincia: null };
}
