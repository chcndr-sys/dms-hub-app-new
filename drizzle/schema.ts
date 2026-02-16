import { pgTable, pgEnum, text, timestamp, varchar, integer, boolean, serial, json, index, numeric } from "drizzle-orm/pg-core";

// Enum definitions
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["success", "error", "warning", "info"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  cieId: varchar("cie_id", { length: 32 }), // ID Carta d'Identità Elettronica (per lettura NFC sul campo)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Extended users table with wallet and sustainability
export const extendedUsers = pgTable("extended_users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  walletBalance: integer("wallet_balance").default(0).notNull(), // TCC disponibili
  sustainabilityRating: integer("sustainability_rating").default(0), // 0-100
  transportPreference: varchar("transport_preference", { length: 50 }), // bike, car, bus, walk
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const markets = pgTable("markets", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  lat: varchar("lat", { length: 20 }).notNull(), // Store as string for precision
  lng: varchar("lng", { length: 20 }).notNull(),
  openingHours: text("opening_hours"), // JSON string
  active: integer("active").default(1).notNull(), // 1=true, 0=false
  mobilityProvider: varchar("mobility_provider", { length: 100 }), // e.g., 'tper-toscana', 'atm-milano'
  mobilityConfig: text("mobility_config"), // JSON config for mobility provider
  legacyMktId: integer("legacy_mkt_id"), // Map a mercato DMS Legacy (tabella mercati.mkt_id)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shops = pgTable("shops", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // bio, km0, dop, standard
  certifications: text("certifications"), // JSON array ["BIO", "KM0"]
  pendingReimbursement: integer("pending_reimbursement").default(0).notNull(),
  totalReimbursed: integer("total_reimbursed").default(0).notNull(),
  bankAccount: varchar("bank_account", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  marketIdx: index("shops_market_idx").on(table.marketId),
}));

export const transactions = pgTable("transactions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  shopId: integer("shop_id").references(() => shops.id),
  type: varchar("type", { length: 50 }).notNull(), // earn, spend, refund
  amount: integer("amount").notNull(), // TCC
  euroValue: integer("euro_value"), // Store as cents (€1.50 = 150)
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("transactions_user_idx").on(table.userId),
  shopIdx: index("transactions_shop_idx").on(table.shopId),
  createdAtIdx: index("transactions_created_idx").on(table.createdAt),
}));

export const checkins = pgTable("checkins", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  marketId: integer("market_id").references(() => markets.id),
  transport: varchar("transport", { length: 50 }), // bike, car, bus, walk
  lat: varchar("lat", { length: 20 }), // Anonimizzata (griglia 100m)
  lng: varchar("lng", { length: 20 }),
  carbonSaved: integer("carbon_saved"), // grams CO₂ (1500 = 1.5kg)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("checkins_user_idx").on(table.userId),
  marketIdx: index("checkins_market_idx").on(table.marketId),
}));

export const carbonCreditsConfig = pgTable("carbon_credits_config", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  baseValue: integer("base_value").notNull(), // Cents (€1.50 = 150)
  areaBoosts: text("area_boosts"), // JSON {"Grosseto": 0, "Follonica": -10}
  categoryBoosts: text("category_boosts"), // JSON {"BIO": 20, "KM0": 15}
  updatedBy: varchar("updated_by", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fundTransactions = pgTable("fund_transactions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // income, expense
  source: varchar("source", { length: 255 }).notNull(),
  amount: integer("amount").notNull(), // Cents
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reimbursements = pgTable("reimbursements", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  credits: integer("credits").notNull(),
  euros: integer("euros").notNull(), // Cents
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  batchId: varchar("batch_id", { length: 100 }),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const civicReports = pgTable("civic_reports", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  lat: varchar("lat", { length: 20 }),
  lng: varchar("lng", { length: 20 }),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  shopId: integer("shop_id").references(() => shops.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  certifications: text("certifications"), // JSON array
  price: integer("price"), // Cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productTracking = pgTable("product_tracking", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  productId: integer("product_id").references(() => products.id),
  tpassId: varchar("tpass_id", { length: 255 }).unique(),
  originCountry: varchar("origin_country", { length: 3 }),
  originCity: varchar("origin_city", { length: 255 }),
  transportMode: varchar("transport_mode", { length: 50 }),
  distanceKm: integer("distance_km"),
  co2Kg: integer("co2_kg"), // grams
  dppHash: varchar("dpp_hash", { length: 255 }),
  customsCleared: integer("customs_cleared").default(0).notNull(),
  ivaVerified: integer("iva_verified").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const carbonFootprint = pgTable("carbon_footprint", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  productId: integer("product_id").references(() => products.id),
  lifecycleCo2: integer("lifecycle_co2"), // grams
  transportCo2: integer("transport_co2"),
  packagingCo2: integer("packaging_co2"),
  totalCo2: integer("total_co2"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const ecocredits = pgTable("ecocredits", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tccConverted: integer("tcc_converted").notNull(),
  ecocreditAmount: integer("ecocredit_amount").notNull(), // Cents
  tpasFundId: varchar("tpas_fund_id", { length: 255 }),
  conversionRate: integer("conversion_rate").notNull(), // Cents
  convertedAt: timestamp("converted_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userEmail: varchar("user_email", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: integer("entity_id"),
  oldValue: text("old_value"), // JSON
  newValue: text("new_value"), // JSON
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  app: varchar("app", { length: 100 }).notNull(),
  level: varchar("level", { length: 50 }).notNull(), // info, warning, error
  type: varchar("type", { length: 100 }),
  message: text("message").notNull(),
  userEmail: varchar("user_email", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userAnalytics = pgTable("user_analytics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  transport: varchar("transport", { length: 50 }), // bike, car, bus, walk
  origin: varchar("origin", { length: 255 }), // City/region
  sustainabilityRating: integer("sustainability_rating"), // 0-100
  co2Saved: integer("co2_saved"), // grams
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sustainabilityMetrics = pgTable("sustainability_metrics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  date: timestamp("date").notNull(),
  populationRating: integer("population_rating").notNull(), // 0-100
  totalCo2Saved: integer("total_co2_saved").notNull(), // kg
  localPurchases: integer("local_purchases").notNull(),
  ecommercePurchases: integer("ecommerce_purchases").notNull(),
  avgCo2Local: integer("avg_co2_local").notNull(), // grams
  avgCo2Ecommerce: integer("avg_co2_ecommerce").notNull(), // grams
});

export const notifications = pgTable("notifications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // push, email, sms
  targetUsers: text("target_users"), // JSON array of user IDs
  sent: integer("sent").notNull().default(0),
  delivered: integer("delivered").notNull().default(0),
  opened: integer("opened").notNull().default(0),
  clicked: integer("clicked").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inspections = pgTable("inspections", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  businessId: integer("business_id"),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // DURC, HACCP, Sicurezza, etc.
  inspector: varchar("inspector", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(), // scheduled, completed, violation
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  violationFound: boolean("violation_found").default(false),
  fineAmount: integer("fine_amount"), // Cents
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessAnalytics = pgTable("business_analytics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  businessId: integer("business_id"),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  totalSales: integer("total_sales").notNull().default(0),
  totalCredits: integer("total_credits").notNull().default(0), // TCC issued
  totalRevenue: integer("total_revenue").notNull().default(0), // Cents
  rating: integer("rating").default(0), // 0-5 stars
  isActive: boolean("is_active").default(true),
  lastSaleAt: timestamp("last_sale_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mobilityData = pgTable("mobility_data", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id), // Link to market
  type: varchar("type", { length: 50 }).notNull(), // bus, tram, parking
  lineNumber: varchar("line_number", { length: 20 }),
  lineName: varchar("line_name", { length: 255 }),
  stopName: varchar("stop_name", { length: 255 }),
  lat: varchar("lat", { length: 20 }),
  lng: varchar("lng", { length: 20 }),
  status: varchar("status", { length: 50 }).default("active"), // active, delayed, suspended
  occupancy: integer("occupancy"), // 0-100%
  availableSpots: integer("available_spots"), // For parking
  totalSpots: integer("total_spots"), // For parking
  nextArrival: integer("next_arrival"), // Minutes
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types
export type ExtendedUser = typeof extendedUsers.$inferSelect;
export type Market = typeof markets.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type CarbonCreditsConfig = typeof carbonCreditsConfig.$inferSelect;
export type FundTransaction = typeof fundTransactions.$inferSelect;
export type Reimbursement = typeof reimbursements.$inferSelect;
export type CivicReport = typeof civicReports.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductTracking = typeof productTracking.$inferSelect;
export type CarbonFootprint = typeof carbonFootprint.$inferSelect;
export type Ecocredit = typeof ecocredits.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
export type UserAnalytics = typeof userAnalytics.$inferSelect;
export type SustainabilityMetric = typeof sustainabilityMetrics.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Inspection = typeof inspections.$inferSelect;
export type BusinessAnalytics = typeof businessAnalytics.$inferSelect;
export type MobilityData = typeof mobilityData.$inferSelect;
// ============================================
// DMS HUB - Sistema Gestione Mercati Completo
// ============================================

// Geometria mercati estesa (da Slot Editor v3)
export const marketGeometry = pgTable("market_geometry", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  containerGeojson: text("container_geojson"), // Container mercato
  centerLat: varchar("center_lat", { length: 20 }).notNull(),
  centerLng: varchar("center_lng", { length: 20 }).notNull(),
  hubAreaGeojson: text("hub_area_geojson"), // Area HUB
  marketAreaGeojson: text("market_area_geojson"), // Area mercato
  gcpData: text("gcp_data"), // Ground Control Points (JSON)
  pngUrl: text("png_url"), // URL pianta trasparente
  pngMetadata: text("png_metadata"), // Metadati PNG (JSON)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Posteggi (stalls)
export const stalls = pgTable("stalls", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  number: varchar("number", { length: 20 }).notNull(), // Numero posteggio
  lat: varchar("lat", { length: 20 }).notNull(),
  lng: varchar("lng", { length: 20 }).notNull(),
  areaMq: integer("area_mq"), // Area in metri quadrati
  status: varchar("status", { length: 50 }).default("free").notNull(), // free, reserved, occupied, booked, maintenance
  category: varchar("category", { length: 100 }), // alimentari, abbigliamento, artigianato, etc.
  notes: text("notes"),
  legacyPzId: integer("legacy_pz_id"), // Map a piazzola DMS Legacy (tabella piazzole.pz_id)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Operatori/Ambulanti (vendors)
export const vendors = pgTable("vendors", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id), // Link a utente se registrato
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  fiscalCode: varchar("fiscal_code", { length: 16 }).unique(),
  vatNumber: varchar("vat_number", { length: 20 }).unique(),
  businessName: varchar("business_name", { length: 255 }),
  businessType: varchar("business_type", { length: 100 }), // Tipo attività
  atecoCode: varchar("ateco_code", { length: 20 }), // Codice ATECO
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  bankAccount: varchar("bank_account", { length: 100 }), // IBAN
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, suspended, inactive
  rating: integer("rating").default(0), // 0-5 stars (x100 per decimali)
  totalSales: integer("total_sales").default(0).notNull(),
  legacyAmbId: integer("legacy_amb_id"), // Map a ambulante DMS Legacy (tabella amb.amb_id)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Concessioni
export const concessions = pgTable("concessions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  stallId: integer("stall_id").references(() => stalls.id),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  concessionNumber: varchar("concession_number", { length: 100 }).unique().notNull(),
  type: varchar("type", { length: 50 }).notNull(), // daily, monthly, yearly, permanent
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, expired, suspended, revoked
  fee: integer("fee"), // Cents
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"), // pending, paid, overdue
  notes: text("notes"),
  legacyConcId: integer("legacy_conc_id"), // Map a concessione DMS Legacy (tabella conc_std.conc_id)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Documenti operatori
export const vendorDocuments = pgTable("vendor_documents", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // id_card, business_license, haccp, insurance, health_cert, etc.
  documentNumber: varchar("document_number", { length: 100 }),
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 50 }).default("valid").notNull(), // valid, expired, missing, pending
  verifiedBy: varchar("verified_by", { length: 255 }), // Email verificatore
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Prenotazioni posteggi
export const bookings = pgTable("bookings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  stallId: integer("stall_id").references(() => stalls.id).notNull(),
  userId: integer("user_id").references(() => users.id), // Cittadino che prenota
  vendorId: integer("vendor_id").references(() => vendors.id), // Operatore assegnato
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, confirmed, completed, cancelled, expired
  bookingDate: timestamp("booking_date").notNull(), // Data prenotazione
  expiresAt: timestamp("expires_at").notNull(), // Scadenza prenotazione (es. +30 min)
  checkedInAt: timestamp("checked_in_at"), // Quando operatore fa check-in
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Presenze operatori (check-in/check-out)
export const vendorPresences = pgTable("vendor_presences", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  stallId: integer("stall_id").references(() => stalls.id).notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  sessionId: integer("session_id"), // FK verso market_sessions (aggiunta dopo definizione tabella)
  checkinTime: timestamp("checkin_time").notNull(),
  checkoutTime: timestamp("checkout_time"),
  duration: integer("duration"), // Minuti
  lat: varchar("lat", { length: 20 }), // GPS check-in
  lng: varchar("lng", { length: 20 }),
  // Campi interoperabilità DMS Legacy
  legacyPreId: integer("legacy_pre_id"), // Map a presenza DMS Legacy (tabella presenze.pre_id)
  rifiutata: boolean("rifiutata").default(false), // Presenza rifiutata dal sistema Legacy
  tipoPresenza: varchar("tipo_presenza", { length: 50 }), // CONCESSIONARIO, SPUNTISTA, ABUSIVO
  orarioDepositoRifiuti: timestamp("orario_deposito_rifiuti"), // Timestamp deposito spazzatura (da tablet Legacy)
  importoAddebitato: numeric("importo_addebitato", { precision: 10, scale: 2 }), // Importo calcolato (mq × tariffa)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  vendorIdx: index("presences_vendor_idx").on(table.vendorId),
  stallIdx: index("presences_stall_idx").on(table.stallId),
  checkinIdx: index("presences_checkin_idx").on(table.checkinTime),
  legacyPreIdx: index("presences_legacy_pre_idx").on(table.legacyPreId),
}));

// Sessioni giornata mercato (interop con DMS Legacy tabella "istanze")
export const marketSessions = pgTable("market_sessions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  legacyIstId: integer("legacy_ist_id"), // Map a istanza DMS Legacy (tabella istanze.ist_id)
  sessionDate: timestamp("session_date").notNull(), // Data della giornata di mercato
  status: varchar("status", { length: 50 }).default("planned").notNull(), // planned, open, closed, cancelled
  openedAt: timestamp("opened_at"), // Quando la giornata è stata aperta
  closedAt: timestamp("closed_at"), // Quando la giornata è stata chiusa
  openedBy: varchar("opened_by", { length: 255 }), // Email operatore PA che ha aperto
  closedBy: varchar("closed_by", { length: 255 }), // Email operatore PA che ha chiuso
  totalPresences: integer("total_presences").default(0), // Conteggio presenze registrate
  totalConcessionari: integer("total_concessionari").default(0), // Concessionari presenti
  totalSpuntisti: integer("total_spuntisti").default(0), // Spuntisti ammessi
  totalAbsences: integer("total_absences").default(0), // Assenze registrate
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  marketIdx: index("sessions_market_idx").on(table.marketId),
  dateIdx: index("sessions_date_idx").on(table.sessionDate),
  legacyIstIdx: index("sessions_legacy_ist_idx").on(table.legacyIstId),
}));

export type MarketSession = typeof marketSessions.$inferSelect;
export type InsertMarketSession = typeof marketSessions.$inferInsert;

// Spuntisti - Autorizzazioni spunta per operatori senza concessione fissa
// Interop con DMS Legacy tabella "spuntisti" (sp_amb_id, sp_mkt_id, sp_autorizzato)
export const spuntisti = pgTable("spuntisti", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  legacySpId: integer("legacy_sp_id"), // Map a spuntista DMS Legacy (tabella spuntisti.sp_id)
  autorizzato: boolean("autorizzato").default(true).notNull(), // Se autorizzato alla spunta
  priorita: integer("priorita"), // Posizione in graduatoria (1 = prima scelta)
  settoreMerceologico: varchar("settore_merceologico", { length: 100 }), // ALIMENTARE, NON_ALIMENTARE, etc.
  dataAutorizzazione: timestamp("data_autorizzazione"),
  dataScadenza: timestamp("data_scadenza"),
  motivoRevoca: text("motivo_revoca"), // Se autorizzazione revocata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  vendorIdx: index("spuntisti_vendor_idx").on(table.vendorId),
  marketIdx: index("spuntisti_market_idx").on(table.marketId),
  legacySpIdx: index("spuntisti_legacy_sp_idx").on(table.legacySpId),
}));

export type Spuntista = typeof spuntisti.$inferSelect;
export type InsertSpuntista = typeof spuntisti.$inferInsert;

// Controlli dettagliati (per Polizia Municipale)
export const inspectionsDetailed = pgTable("inspections_detailed", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  stallId: integer("stall_id").references(() => stalls.id),
  inspectorName: varchar("inspector_name", { length: 255 }).notNull(),
  inspectorBadge: varchar("inspector_badge", { length: 100 }),
  type: varchar("type", { length: 100 }).notNull(), // routine, complaint, random, targeted
  checklist: text("checklist"), // JSON checklist items
  photosUrls: text("photos_urls"), // JSON array URLs
  gpsLat: varchar("gps_lat", { length: 20 }),
  gpsLng: varchar("gps_lng", { length: 20 }),
  result: varchar("result", { length: 50 }).notNull(), // compliant, violation, warning
  notes: text("notes"),
  signatureUrl: text("signature_url"), // Firma digitale operatore
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Verbali/Sanzioni
export const violations = pgTable("violations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  inspectionId: integer("inspection_id").references(() => inspectionsDetailed.id),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  stallId: integer("stall_id").references(() => stalls.id),
  violationType: varchar("violation_type", { length: 100 }).notNull(), // late_checkin, missing_doc, hygiene, unauthorized, etc.
  violationCode: varchar("violation_code", { length: 50 }),
  description: text("description").notNull(),
  fineAmount: integer("fine_amount"), // Cents
  status: varchar("status", { length: 50 }).default("issued").notNull(), // issued, paid, appealed, cancelled
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  paymentReference: varchar("payment_reference", { length: 255 }),
  appealNotes: text("appeal_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pagamenti concessioni
export const concessionPayments = pgTable("concession_payments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  concessionId: integer("concession_id").references(() => concessions.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  amount: integer("amount").notNull(), // Cents
  paymentMethod: varchar("payment_method", { length: 50 }), // bank_transfer, cash, card, etc.
  paymentReference: varchar("payment_reference", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, completed, failed, refunded
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Marker personalizzati (da Slot Editor v3)
export const customMarkers = pgTable("custom_markers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }), // entrance, exit, wc, info, parking, etc.
  lat: varchar("lat", { length: 20 }).notNull(),
  lng: varchar("lng", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 100 }), // Nome icona
  color: varchar("color", { length: 20 }), // Colore marker
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Aree custom (da Slot Editor v3)
export const customAreas = pgTable("custom_areas", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }), // food, clothing, handicraft, services, etc.
  geojson: text("geojson").notNull(), // Polygon GeoJSON
  color: varchar("color", { length: 20 }), // Colore area
  opacity: integer("opacity").default(50), // 0-100
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types per le nuove tabelle
export type MarketGeometry = typeof marketGeometry.$inferSelect;
export type Stall = typeof stalls.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Concession = typeof concessions.$inferSelect;
export type VendorDocument = typeof vendorDocuments.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type VendorPresence = typeof vendorPresences.$inferSelect;
export type InspectionDetailed = typeof inspectionsDetailed.$inferSelect;
export type Violation = typeof violations.$inferSelect;
export type ConcessionPayment = typeof concessionPayments.$inferSelect;
export type CustomMarker = typeof customMarkers.$inferSelect;
export type CustomArea = typeof customAreas.$inferSelect;

// ============================================
// SISTEMA INTEGRAZIONI - API Keys, Webhook, Monitoring
// ============================================

// API Keys per autenticazione applicazioni esterne
export const apiKeys = pgTable("api_keys", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // Es: "App Cittadini - Production"
  key: varchar("key", { length: 255 }).notNull().unique(), // dms_live_xxxxx o dms_test_xxxxx
  environment: varchar("environment", { length: 50 }).default("production").notNull(), // production, development, staging
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, inactive, revoked
  permissions: text("permissions"), // JSON array ["markets.read", "stalls.write", etc.]
  rateLimit: integer("rate_limit").default(1000).notNull(), // Richieste per minuto
  lastUsedAt: timestamp("last_used_at"),
  lastUsedIp: varchar("last_used_ip", { length: 50 }),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Metriche utilizzo API per monitoraggio performance
export const apiMetrics = pgTable("api_metrics", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  apiKeyId: integer("api_key_id").references(() => apiKeys.id),
  endpoint: varchar("endpoint", { length: 255 }).notNull(), // /api/dmsHub/markets/list
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE
  statusCode: integer("status_code").notNull(), // 200, 404, 500, etc.
  responseTime: integer("response_time").notNull(), // Millisecondi
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  endpointIdx: index("metrics_endpoint_idx").on(table.endpoint),
  createdAtIdx: index("metrics_created_idx").on(table.createdAt),
}));

// Webhook configurati per notifiche real-time
export const webhooks = pgTable("webhooks", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // Es: "Notifica Nuova Prenotazione"
  url: varchar("url", { length: 500 }).notNull(), // Endpoint destinazione
  events: text("events").notNull(), // JSON array ["booking.created", "vendor.updated"]
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, inactive, pending
  secret: varchar("secret", { length: 255 }), // Per firma HMAC
  headers: text("headers"), // JSON object custom headers
  retryPolicy: text("retry_policy"), // JSON {maxRetries: 3, backoff: "exponential"}
  lastTriggeredAt: timestamp("last_triggered_at"),
  successCount: integer("success_count").default(0).notNull(),
  failureCount: integer("failure_count").default(0).notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Log esecuzioni webhook per debugging
export const webhookLogs = pgTable("webhook_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  webhookId: integer("webhook_id").references(() => webhooks.id).notNull(),
  event: varchar("event", { length: 100 }).notNull(), // booking.created
  payload: text("payload").notNull(), // JSON dati inviati
  statusCode: integer("status_code"), // Response HTTP status
  responseBody: text("response_body"),
  responseTime: integer("response_time"), // Millisecondi
  success: integer("success").default(0).notNull(), // 1=success, 0=failure
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stato connessioni esterne (ARPAE, TPER, TPAS, Heroku)
export const externalConnections = pgTable("external_connections", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // ARPAE, TPER, TPAS, Gestionale Heroku
  type: varchar("type", { length: 100 }).notNull(), // api, database, webhook, sftp
  endpoint: varchar("endpoint", { length: 500 }), // Base URL
  status: varchar("status", { length: 50 }).default("disconnected").notNull(), // connected, disconnected, pending, error
  lastCheckAt: timestamp("last_check_at"),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  healthCheckInterval: integer("health_check_interval").default(300).notNull(), // Secondi
  config: text("config"), // JSON configurazione specifica
  features: text("features"), // JSON array funzionalità
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types
export type ApiKey = typeof apiKeys.$inferSelect;
export type ApiMetric = typeof apiMetrics.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type ExternalConnection = typeof externalConnections.$inferSelect;

// MIO Agent Logs - Sistema di logging per agenti AI
export const mioAgentLogs = pgTable("mio_agent_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  agent: varchar("agent", { length: 100 }).notNull(), // Nome agente (MIO, Manus, etc.)
  action: varchar("action", { length: 255 }).notNull(), // Azione eseguita
  status: statusEnum("status").notNull(),
  message: text("message"), // Messaggio descrittivo
  details: text("details"), // JSON con dettagli aggiuntivi
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  agentIdx: index("mio_logs_agent_idx").on(table.agent),
  statusIdx: index("mio_logs_status_idx").on(table.status),
  timestampIdx: index("mio_logs_timestamp_idx").on(table.timestamp),
}));

export type MioAgentLog = typeof mioAgentLogs.$inferSelect;
export type InsertMioAgentLog = typeof mioAgentLogs.$inferInsert;

// ============================================================================
// HUB - Gestione HUB Mercati, Negozi e Servizi
// ============================================================================

// HUB Locations - Punti fisici HUB collegati ai mercati
export const hubLocations = pgTable("hub_locations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  marketId: integer("market_id").references(() => markets.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  lat: varchar("lat", { length: 20 }).notNull(),
  lng: varchar("lng", { length: 20 }).notNull(),
  areaGeojson: text("area_geojson"), // Area HUB in GeoJSON
  openingHours: text("opening_hours"), // JSON string
  active: integer("active").default(1).notNull(), // 1=true, 0=false
  description: text("description"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HUB Shops - Negozi all'interno degli HUB
export const hubShops = pgTable("hub_shops", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  hubId: integer("hub_id").references(() => hubLocations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // alimentari, artigianato, abbigliamento, etc.
  certifications: text("certifications"), // JSON array ["BIO", "KM0", "DOP"]
  ownerId: integer("owner_id").references(() => vendors.id), // Link a operatore se registrato
  businessName: varchar("business_name", { length: 255 }),
  vatNumber: varchar("vat_number", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  lat: varchar("lat", { length: 20 }),
  lng: varchar("lng", { length: 20 }),
  areaMq: integer("area_mq"), // Area in metri quadrati
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, suspended, inactive
  description: text("description"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HUB Services - Servizi offerti negli HUB
export const hubServices = pgTable("hub_services", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  hubId: integer("hub_id").references(() => hubLocations.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // parking, bike_sharing, charging_station, locker, etc.
  description: text("description"),
  capacity: integer("capacity"), // Capacità (posti auto, bici, etc.)
  available: integer("available"), // Disponibilità attuale
  price: integer("price"), // Cents (se a pagamento)
  lat: varchar("lat", { length: 20 }),
  lng: varchar("lng", { length: 20 }),
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, maintenance, inactive
  metadata: text("metadata"), // JSON con metadati specifici del servizio
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for HUB tables
export type HubLocation = typeof hubLocations.$inferSelect;
export type InsertHubLocation = typeof hubLocations.$inferInsert;

export type HubShop = typeof hubShops.$inferSelect;
export type InsertHubShop = typeof hubShops.$inferInsert;

export type HubService = typeof hubServices.$inferSelect;
export type InsertHubService = typeof hubServices.$inferInsert;

// ============================================================================
// MIHUB MULTI-AGENT SYSTEM TABLES
// ============================================================================

// 1. Agent Tasks - Task engine per coordinamento agenti
export const agentTasks = pgTable("agent_tasks", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  taskId: varchar("task_id", { length: 100 }).notNull().unique(), // UUID task
  agentAssigned: varchar("agent_assigned", { length: 100 }), // MIO, Manus, Abacus, Zapier
  taskType: varchar("task_type", { length: 100 }).notNull(), // analyze, execute, integrate, coordinate
  priority: integer("priority").default(5).notNull(), // 1-10
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, in_progress, completed, failed
  input: text("input"), // JSON con input del task
  output: text("output"), // JSON con output del task
  error: text("error"), // Messaggio errore se failed
  parentTaskId: varchar("parent_task_id", { length: 100 }), // Task padre se subtask
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Agent Projects - Registry progetti tracciati
export const agentProjects = pgTable("agent_projects", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  projectId: varchar("project_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, paused, completed, archived
  metadata: text("metadata"), // JSON con metadata progetto
  tags: text("tags"), // JSON array di tags
  createdBy: varchar("created_by", { length: 100 }), // Agent che ha creato
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Agent Brain - Memoria e decisioni agenti
export const agentBrain = pgTable("agent_brain", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  agent: varchar("agent", { length: 100 }).notNull(), // MIO, Manus, Abacus, Zapier
  memoryType: varchar("memory_type", { length: 50 }).notNull(), // decision, context, learning, history
  key: varchar("key", { length: 255 }).notNull(), // Chiave memoria
  value: text("value").notNull(), // JSON con valore
  confidence: integer("confidence").default(100), // 0-100
  expiresAt: timestamp("expires_at"), // TTL opzionale
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. System Events - Event bus centralizzato
export const systemEvents = pgTable("system_events", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  eventId: varchar("event_id", { length: 100 }).notNull().unique(),
  eventType: varchar("event_type", { length: 100 }).notNull(), // click, api_call, task_completed, agent_message
  source: varchar("source", { length: 100 }).notNull(), // frontend, backend, agent_name, external_app
  target: varchar("target", { length: 100 }), // Destinatario evento
  payload: text("payload"), // JSON con dati evento
  metadata: text("metadata"), // JSON con metadata
  processed: boolean("processed").default(false).notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Data Bag - Storage condiviso tra agenti
export const dataBag = pgTable("data_bag", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(), // JSON con valore
  valueType: varchar("value_type", { length: 50 }).default("json").notNull(), // json, string, number, boolean
  owner: varchar("owner", { length: 100 }), // Agent proprietario
  accessLevel: varchar("access_level", { length: 50 }).default("shared").notNull(), // private, shared, public
  ttl: integer("ttl"), // Time to live in secondi
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Agent Messages - Chat multi-agente con shared context
export const agentMessages = pgTable("agent_messages", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  messageId: varchar("message_id", { length: 100 }).notNull().unique(),
  conversationId: varchar("conversation_id", { length: 100 }).notNull(), // Raggruppa messaggi conversazione
  sender: varchar("sender", { length: 100 }).notNull(), // MIO, Manus, Abacus, Zapier, user
  recipients: text("recipients"), // JSON array di destinatari (tutti se null)
  messageType: varchar("message_type", { length: 50 }).default("text").notNull(), // text, task, notification, error
  content: text("content").notNull(),
  attachments: text("attachments"), // JSON array di allegati
  metadata: text("metadata"), // JSON con metadata
  readBy: text("read_by"), // JSON array di agenti che hanno letto
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Agent Context - Shared context tra agenti
export const agentContext = pgTable("agent_context", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  contextId: varchar("context_id", { length: 100 }).notNull().unique(),
  conversationId: varchar("conversation_id", { length: 100 }).notNull(), // Link a conversation
  contextType: varchar("context_type", { length: 50 }).notNull(), // global, conversation, task, project
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(), // JSON con valore
  visibility: text("visibility"), // JSON array di agenti che possono vedere (tutti se null)
  priority: integer("priority").default(5).notNull(), // 1-10 per ordinamento
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types for MIHUB tables
export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = typeof agentTasks.$inferInsert;

export type AgentProject = typeof agentProjects.$inferSelect;
export type InsertAgentProject = typeof agentProjects.$inferInsert;

export type AgentBrain = typeof agentBrain.$inferSelect;
export type InsertAgentBrain = typeof agentBrain.$inferInsert;

export type SystemEvent = typeof systemEvents.$inferSelect;
export type InsertSystemEvent = typeof systemEvents.$inferInsert;

export type DataBag = typeof dataBag.$inferSelect;
export type InsertDataBag = typeof dataBag.$inferInsert;

export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = typeof agentMessages.$inferInsert;

export type AgentContext = typeof agentContext.$inferSelect;
export type InsertAgentContext = typeof agentContext.$inferInsert;


// ============================================
// WALLET OPERATORI MERCATO - Borsellino Elettronico Prepagato
// ============================================

// Enum per tipo transazione wallet
export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", ["RICARICA", "DECURTAZIONE", "RIMBORSO", "CORREZIONE"]);

// Enum per stato wallet
export const walletStatusEnum = pgEnum("wallet_status", ["ATTIVO", "BLOCCATO", "SOSPESO"]);

// Wallet per ogni impresa/operatore
export const operatoreWallet = pgTable("operatore_wallet", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  impresaId: integer("impresa_id").notNull().references(() => vendors.id), // FK verso vendors (imprese/operatori)
  saldo: integer("saldo").default(0).notNull(), // Saldo in centesimi (€10.50 = 1050)
  saldoMinimo: integer("saldo_minimo").default(0).notNull(), // Soglia minima per blocco
  status: walletStatusEnum("status").default("ATTIVO").notNull(),
  ultimaRicarica: timestamp("ultima_ricarica"),
  ultimaDecurtazione: timestamp("ultima_decurtazione"),
  totaleRicaricato: integer("totale_ricaricato").default(0).notNull(), // Totale storico ricariche
  totaleDecurtato: integer("totale_decurtato").default(0).notNull(), // Totale storico decurtazioni
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  impresaIdx: index("wallet_impresa_idx").on(table.impresaId),
}));

// Transazioni wallet (ricariche e decurtazioni)
export const walletTransazioni = pgTable("wallet_transazioni", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => operatoreWallet.id),
  tipo: walletTransactionTypeEnum("tipo").notNull(),
  importo: integer("importo").notNull(), // In centesimi (positivo per ricariche, negativo per decurtazioni)
  saldoPrecedente: integer("saldo_precedente").notNull(), // Saldo prima della transazione
  saldoSuccessivo: integer("saldo_successivo").notNull(), // Saldo dopo la transazione
  riferimento: varchar("riferimento", { length: 255 }), // IUV PagoPA o ID presenza
  descrizione: text("descrizione"),
  dataOperazione: timestamp("data_operazione").defaultNow().notNull(),
  operatoreId: varchar("operatore_id", { length: 255 }), // Chi ha effettuato l'operazione
  // Campi PagoPA per ricariche
  iuvPagopa: varchar("iuv_pagopa", { length: 50 }),
  ricevutaTelematica: text("ricevuta_telematica"), // JSON della RT
  // Campi presenza per decurtazioni
  presenzaId: integer("presenza_id"), // FK verso tabella presenze/spunta
  posteggioId: integer("posteggio_id"), // FK verso stalls
  mercatoId: integer("mercato_id"), // FK verso markets
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  walletIdx: index("transazioni_wallet_idx").on(table.walletId),
  dataIdx: index("transazioni_data_idx").on(table.dataOperazione),
  iuvIdx: index("transazioni_iuv_idx").on(table.iuvPagopa),
}));

// Tariffe posteggio per tipo
export const tariffePosteggio = pgTable("tariffe_posteggio", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  mercatoId: integer("mercato_id").references(() => markets.id),
  tipoPosteggio: varchar("tipo_posteggio", { length: 100 }).notNull(), // ALIMENTARE, NON_ALIMENTARE, PRODUTTORE, ecc.
  tariffaGiornaliera: integer("tariffa_giornaliera").notNull(), // In centesimi
  tariffaSettimanale: integer("tariffa_settimanale"), // Opzionale
  tariffaMensile: integer("tariffa_mensile"), // Opzionale
  tariffaAnnuale: integer("tariffa_annuale"), // Opzionale
  descrizione: text("descrizione"),
  validoDal: timestamp("valido_dal").defaultNow().notNull(),
  validoAl: timestamp("valido_al"), // NULL = sempre valido
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  mercatoIdx: index("tariffe_mercato_idx").on(table.mercatoId),
}));

// Avvisi PagoPA generati
export const avvisiPagopa = pgTable("avvisi_pagopa", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => operatoreWallet.id),
  impresaId: integer("impresa_id").notNull().references(() => vendors.id), // FK verso vendors (imprese/operatori)
  iuv: varchar("iuv", { length: 50 }).notNull().unique(), // Identificativo Univoco Versamento
  importo: integer("importo").notNull(), // In centesimi
  causale: varchar("causale", { length: 255 }).notNull(),
  stato: varchar("stato", { length: 50 }).default("GENERATO").notNull(), // GENERATO, PAGATO, SCADUTO, ANNULLATO
  dataGenerazione: timestamp("data_generazione").defaultNow().notNull(),
  dataScadenza: timestamp("data_scadenza"),
  dataPagamento: timestamp("data_pagamento"),
  ricevutaTelematica: text("ricevuta_telematica"), // JSON della RT
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  iuvIdx: index("avvisi_iuv_idx").on(table.iuv),
  walletIdx: index("avvisi_wallet_idx").on(table.walletId),
  statoIdx: index("avvisi_stato_idx").on(table.stato),
}));

// Export types for Wallet tables
export type OperatoreWallet = typeof operatoreWallet.$inferSelect;
export type InsertOperatoreWallet = typeof operatoreWallet.$inferInsert;

export type WalletTransazione = typeof walletTransazioni.$inferSelect;
export type InsertWalletTransazione = typeof walletTransazioni.$inferInsert;

export type TariffaPosteggio = typeof tariffePosteggio.$inferSelect;
export type InsertTariffaPosteggio = typeof tariffePosteggio.$inferInsert;

export type AvvisoPagopa = typeof avvisiPagopa.$inferSelect;
export type InsertAvvisoPagopa = typeof avvisiPagopa.$inferInsert;


// ============================================================================
// SYNC STATUS - Sistema di sincronizzazione con gestionale esterno
// ============================================================================

// Enum per stato sincronizzazione
export const syncStatusEnum = pgEnum("sync_status", ["pending", "running", "success", "error", "partial"]);
export const syncEntityEnum = pgEnum("sync_entity", ["operatori", "presenze", "concessioni", "pagamenti", "documenti", "mercati", "posteggi"]);

// Configurazione sincronizzazione
export const syncConfig = pgTable("sync_config", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  enabled: integer("enabled").default(1).notNull(), // 1=attivo, 0=disattivo
  frequency: integer("frequency").default(300).notNull(), // Secondi tra sync (default 5 min)
  mode: varchar("mode", { length: 50 }).default("bidirectional").notNull(), // unidirectional, bidirectional
  externalUrl: varchar("external_url", { length: 500 }), // URL gestionale esterno (Heroku)
  externalApiKey: varchar("external_api_key", { length: 255 }), // API key per autenticazione
  entities: text("entities"), // JSON array entità da sincronizzare
  lastModified: timestamp("last_modified").defaultNow().notNull(),
  modifiedBy: varchar("modified_by", { length: 255 }),
});

// Job di sincronizzazione
export const syncJobs = pgTable("sync_jobs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  entity: syncEntityEnum("entity").notNull(), // Entità sincronizzata
  direction: varchar("direction", { length: 50 }).default("pull").notNull(), // pull, push, bidirectional
  status: syncStatusEnum("status").default("pending").notNull(),
  recordsProcessed: integer("records_processed").default(0).notNull(),
  recordsSuccess: integer("records_success").default(0).notNull(),
  recordsError: integer("records_error").default(0).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  details: text("details"), // JSON con dettagli aggiuntivi
  triggeredBy: varchar("triggered_by", { length: 100 }).default("system").notNull(), // system, manual, webhook
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entityIdx: index("sync_jobs_entity_idx").on(table.entity),
  statusIdx: index("sync_jobs_status_idx").on(table.status),
  createdAtIdx: index("sync_jobs_created_at_idx").on(table.createdAt),
}));

// Log dettagliato sincronizzazione
export const syncLogs = pgTable("sync_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  jobId: integer("job_id").references(() => syncJobs.id).notNull(),
  entity: syncEntityEnum("entity").notNull(),
  recordId: varchar("record_id", { length: 100 }), // ID record nel sistema esterno
  localId: integer("local_id"), // ID record locale
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, skip
  status: varchar("status", { length: 50 }).notNull(), // success, error, skipped
  changes: text("changes"), // JSON con campi modificati
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  jobIdx: index("sync_logs_job_idx").on(table.jobId),
}));

// Export types for Sync tables
export type SyncConfig = typeof syncConfig.$inferSelect;
export type InsertSyncConfig = typeof syncConfig.$inferInsert;

export type SyncJob = typeof syncJobs.$inferSelect;
export type InsertSyncJob = typeof syncJobs.$inferInsert;

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

// ============================================
// AUTORIZZAZIONI (Nuovo Modulo)
// ============================================

export const autorizzazioni = pgTable("autorizzazioni", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  numeroAutorizzazione: varchar("numero_autorizzazione", { length: 50 }).notNull(),
  enteRilascio: varchar("ente_rilascio", { length: 100 }).notNull(),
  dataRilascio: timestamp("data_rilascio").notNull(),
  dataScadenza: timestamp("data_scadenza"),
  stato: varchar("stato", { length: 20 }).default("ATTIVA"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


// ============================================
// SECURITY TAB - RBAC & ACCESS CONTROL
// ============================================

// Enum per i settori del sistema
export const sectorEnum = pgEnum("sector", [
  "sistema",    // Amministrazione sistema
  "pa",         // Pubblica Amministrazione
  "mercato",    // Gestione Mercati
  "impresa",    // Imprese e Operatori
  "esterno",    // Fornitori esterni
  "pubblico",   // Accesso pubblico
]);

// Enum per severity degli eventi
export const severityEnum = pgEnum("severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

// Enum per tipi eventi sicurezza
export const securityEventTypeEnum = pgEnum("security_event_type", [
  "login_failed",
  "login_success",
  "permission_denied",
  "suspicious_activity",
  "brute_force_attempt",
  "session_hijack",
  "api_abuse",
]);

// Enum per scope dei permessi
export const permissionScopeEnum = pgEnum("permission_scope", [
  "all",        // Accesso globale
  "territory",  // Limitato al territorio
  "market",     // Limitato al mercato
  "own",        // Solo proprie risorse
  "delegated",  // Risorse delegate
  "none",       // Nessun accesso
]);

// Enum per tipo territorio
export const territoryTypeEnum = pgEnum("territory_type", [
  "national",   // Nazionale
  "regional",   // Regionale
  "provincial", // Provinciale
  "municipal",  // Comunale
  "market",     // Singolo mercato
]);

// Enum per tipo dispositivo
export const deviceTypeEnum = pgEnum("device_type", [
  "desktop",
  "mobile",
  "tablet",
  "api",
]);

// Enum per tipo azione accesso
export const accessActionTypeEnum = pgEnum("access_action_type", [
  "login",
  "logout",
  "page_view",
  "api_call",
  "data_export",
  "data_modify",
  "admin_action",
]);

// ============================================
// TABELLA 1: user_roles (ruoli utente)
// ============================================
export const userRoles = pgTable("user_roles", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  level: integer("level").notNull().default(99), // 0 = super admin, 99 = nessun privilegio
  sector: sectorEnum("sector"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("user_roles_code_idx").on(table.code),
}));
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

// ============================================
// TABELLA 2: permissions (permessi granulari)
// ============================================
export const permissions = pgTable("permissions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  module: varchar("module", { length: 50 }).notNull(), // es: "dmsHub.markets", "security.users"
  action: varchar("action", { length: 50 }).notNull(), // es: "read", "write", "delete", "admin"
  description: text("description"),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"), // low, medium, high, critical
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  moduleActionIdx: index("permissions_module_action_idx").on(table.module, table.action),
  uniqueModuleAction: index("permissions_unique_idx").on(table.module, table.action),
}));
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

// ============================================
// TABELLA 3: role_permissions (matrice ruoli-permessi)
// ============================================
export const rolePermissions = pgTable("role_permissions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  roleId: integer("role_id").notNull().references(() => userRoles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  scopeType: permissionScopeEnum("scope_type").default("own"),
  scopeValue: text("scope_value"), // es: ID territorio, ID mercato, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  roleIdx: index("role_permissions_role_idx").on(table.roleId),
  permIdx: index("role_permissions_perm_idx").on(table.permissionId),
  uniqueRolePerm: index("role_permissions_unique_idx").on(table.roleId, table.permissionId),
}));
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// ============================================
// TABELLA 4: user_role_assignments (assegnazioni ruoli agli utenti)
// ============================================
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => userRoles.id, { onDelete: "cascade" }),
  territoryType: territoryTypeEnum("territory_type"),
  territoryId: integer("territory_id"), // ID del territorio (comune, mercato, etc.)
  assignedBy: integer("assigned_by").references(() => users.id),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_role_assignments_user_idx").on(table.userId),
  roleIdx: index("user_role_assignments_role_idx").on(table.roleId),
  activeIdx: index("user_role_assignments_active_idx").on(table.isActive),
}));
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserRoleAssignment = typeof userRoleAssignments.$inferInsert;

// ============================================
// TABELLA 5: user_sessions (sessioni utente)
// ============================================
export const userSessions = pgTable("user_sessions", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  deviceType: deviceTypeEnum("device_type"),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_sessions_user_idx").on(table.userId),
  tokenIdx: index("user_sessions_token_idx").on(table.sessionToken),
  activeIdx: index("user_sessions_active_idx").on(table.isActive),
}));
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

// ============================================
// TABELLA 6: access_logs (log accessi)
// ============================================
export const accessLogs = pgTable("access_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: integer("session_id").references(() => userSessions.id),
  actionType: accessActionTypeEnum("action_type").notNull(),
  resource: varchar("resource", { length: 255 }), // es: "/api/markets/123"
  method: varchar("method", { length: 10 }), // GET, POST, PUT, DELETE
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  statusCode: integer("status_code"),
  responseTime: integer("response_time"), // in ms
  metadata: text("metadata"), // JSON con dettagli aggiuntivi
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("access_logs_user_idx").on(table.userId),
  actionIdx: index("access_logs_action_idx").on(table.actionType),
  createdIdx: index("access_logs_created_idx").on(table.createdAt),
}));
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = typeof accessLogs.$inferInsert;

// ============================================
// TABELLA 7: security_events (eventi sicurezza)
// ============================================
export const securityEvents = pgTable("security_events", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  eventType: securityEventTypeEnum("event_type").notNull(),
  severity: severityEnum("severity").notNull(),
  userId: integer("user_id").references(() => users.id),
  ipAddress: varchar("ip_address", { length: 50 }),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON con dettagli aggiuntivi
  resolved: boolean("resolved").default(false).notNull(),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("security_events_type_idx").on(table.eventType),
  severityIdx: index("security_events_severity_idx").on(table.severity),
  resolvedIdx: index("security_events_resolved_idx").on(table.resolved),
  createdIdx: index("security_events_created_idx").on(table.createdAt),
}));
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;

// ============================================
// TABELLA 8: login_attempts (tentativi di login)
// ============================================
export const loginAttempts = pgTable("login_attempts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: varchar("email", { length: 320 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  failureReason: varchar("failure_reason", { length: 100 }), // invalid_credentials, account_locked, expired_session
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("login_attempts_email_idx").on(table.email),
  ipIdx: index("login_attempts_ip_idx").on(table.ipAddress),
  createdIdx: index("login_attempts_created_idx").on(table.createdAt),
  successIdx: index("login_attempts_success_idx").on(table.success),
}));
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

// ============================================
// TABELLA 9: ip_blacklist (IP bloccati)
// ============================================
export const ipBlacklist = pgTable("ip_blacklist", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  ipAddress: varchar("ip_address", { length: 50 }).notNull().unique(),
  reason: text("reason"),
  blockedBy: integer("blocked_by").references(() => users.id),
  blockedUntil: timestamp("blocked_until"), // NULL = permanente
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  ipIdx: index("ip_blacklist_ip_idx").on(table.ipAddress),
  activeIdx: index("ip_blacklist_active_idx").on(table.isActive),
}));
export type IPBlacklist = typeof ipBlacklist.$inferSelect;
export type InsertIPBlacklist = typeof ipBlacklist.$inferInsert;

// ============================================
// TABELLA 10: compliance_certificates (certificati GDPR)
// ============================================
export const complianceCertificates = pgTable("compliance_certificates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  certificateType: varchar("certificate_type", { length: 50 }).notNull(), // gdpr_consent, privacy_policy, terms_accepted
  version: varchar("version", { length: 20 }),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 50 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("compliance_certificates_user_idx").on(table.userId),
  typeIdx: index("compliance_certificates_type_idx").on(table.certificateType),
}));
export type ComplianceCertificate = typeof complianceCertificates.$inferSelect;
export type InsertComplianceCertificate = typeof complianceCertificates.$inferInsert;

// ============================================
// TABELLA 11: delegations (deleghe tra utenti)
// ============================================
export const securityDelegations = pgTable("security_delegations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  delegatorId: integer("delegator_id").notNull().references(() => users.id),
  delegateId: integer("delegate_id").notNull().references(() => users.id),
  permissionId: integer("permission_id").references(() => permissions.id),
  scopeType: permissionScopeEnum("scope_type"),
  scopeValue: text("scope_value"),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  delegatorIdx: index("security_delegations_delegator_idx").on(table.delegatorId),
  delegateIdx: index("security_delegations_delegate_idx").on(table.delegateId),
  activeIdx: index("security_delegations_active_idx").on(table.isActive),
}));
export type SecurityDelegation = typeof securityDelegations.$inferSelect;
export type InsertSecurityDelegation = typeof securityDelegations.$inferInsert;

// ============================================
// TCC SECURITY - Anti-frode e limiti transazioni
// ============================================

// Enum per tipi eventi frode TCC
export const tccFraudEventTypeEnum = pgEnum("tcc_fraud_event_type", [
  "gps_spoofing",
  "rate_exceeded",
  "duplicate_checkin",
  "invalid_qr",
  "amount_anomaly",
  "impossible_travel",
  "suspicious_pattern",
]);

// Enum per tipi azione TCC (rate limiting)
export const tccActionTypeEnum = pgEnum("tcc_action_type", [
  "checkin_culture",
  "checkin_mobility",
  "scan",
  "referral",
  "spend",
  "issue",
]);

// Tabella rate limiting per utente TCC
export const tccRateLimits = pgTable("tcc_rate_limits", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  actionType: tccActionTypeEnum("action_type").notNull(),
  count: integer("count").default(0).notNull(),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userActionIdx: index("tcc_rate_limits_user_action_idx").on(table.userId, table.actionType),
  windowIdx: index("tcc_rate_limits_window_idx").on(table.windowStart),
}));

// Log eventi sospetti TCC
export const tccFraudEvents = pgTable("tcc_fraud_events", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").references(() => users.id),
  eventType: tccFraudEventTypeEnum("event_type").notNull(),
  severity: severityEnum("severity").notNull(),
  details: text("details"), // JSON con coordinate, importo, endpoint, etc.
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("tcc_fraud_events_user_idx").on(table.userId),
  typeIdx: index("tcc_fraud_events_type_idx").on(table.eventType),
  severityIdx: index("tcc_fraud_events_severity_idx").on(table.severity),
  resolvedIdx: index("tcc_fraud_events_resolved_idx").on(table.resolved),
  createdIdx: index("tcc_fraud_events_created_idx").on(table.createdAt),
}));

// Chiavi di idempotenza per prevenire transazioni duplicate
export const tccIdempotencyKeys = pgTable("tcc_idempotency_keys", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  requestHash: varchar("request_hash", { length: 64 }),
  responseData: text("response_data"), // JSON della risposta cached
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  keyIdx: index("tcc_idempotency_key_idx").on(table.idempotencyKey),
  userIdx: index("tcc_idempotency_user_idx").on(table.userId),
  expiresIdx: index("tcc_idempotency_expires_idx").on(table.expiresAt),
}));

// Limiti giornalieri per utente TCC
export const tccDailyLimits = pgTable("tcc_daily_limits", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  checkinCount: integer("checkin_count").default(0).notNull(),
  tccEarned: integer("tcc_earned").default(0).notNull(),
  tccSpent: integer("tcc_spent").default(0).notNull(),
  transactionCount: integer("transaction_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userDateIdx: index("tcc_daily_limits_user_date_idx").on(table.userId, table.date),
}));

// QR code firmati con scadenza
export const tccQrTokens = pgTable("tcc_qr_tokens", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  qrType: varchar("qr_type", { length: 20 }).notNull(), // receive, spend
  tokenHash: varchar("token_hash", { length: 128 }).notNull(), // HMAC-SHA256
  payload: text("payload").notNull(), // JSON payload
  amount: integer("amount"), // Per spend QR, in TCC
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  usedByOperatorId: integer("used_by_operator_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("tcc_qr_tokens_token_idx").on(table.tokenHash),
  userIdx: index("tcc_qr_tokens_user_idx").on(table.userId),
  expiresIdx: index("tcc_qr_tokens_expires_idx").on(table.expiresAt),
  usedIdx: index("tcc_qr_tokens_used_idx").on(table.used),
}));

// Configurazione limiti e rewards per comune
export const tccRewardsConfig = pgTable("tcc_rewards_config", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  comuneId: integer("comune_id"),
  // Limiti anti-frode
  maxDailyTccPerUser: integer("max_daily_tcc_per_user").default(500).notNull(),
  maxDailyCheckins: integer("max_daily_checkins").default(10).notNull(),
  maxMonthlyTcc: integer("max_monthly_tcc").default(5000).notNull(),
  maxSingleTransaction: integer("max_single_transaction").default(200).notNull(),
  qrExpirySeconds: integer("qr_expiry_seconds").default(300).notNull(), // 5 min
  gpsRadiusMeters: integer("gps_radius_meters").default(100).notNull(),
  cooldownMinutes: integer("cooldown_minutes").default(30).notNull(),
  maxDailyReferrals: integer("max_daily_referrals").default(3).notNull(),
  highValueThresholdEur: integer("high_value_threshold_eur").default(5000).notNull(), // cents
  // Rewards TCC
  civicEnabled: boolean("civic_enabled").default(true).notNull(),
  civicTccDefault: integer("civic_tcc_default").default(5).notNull(),
  civicTccUrgent: integer("civic_tcc_urgent").default(10).notNull(),
  civicTccPhotoBonus: integer("civic_tcc_photo_bonus").default(3).notNull(),
  mobilityEnabled: boolean("mobility_enabled").default(true).notNull(),
  mobilityTccBus: integer("mobility_tcc_bus").default(3).notNull(),
  mobilityTccBikeKm: integer("mobility_tcc_bike_km").default(5).notNull(),
  mobilityTccWalkKm: integer("mobility_tcc_walk_km").default(8).notNull(),
  cultureEnabled: boolean("culture_enabled").default(true).notNull(),
  cultureTccMuseum: integer("culture_tcc_museum").default(10).notNull(),
  cultureTccMonument: integer("culture_tcc_monument").default(5).notNull(),
  cultureTccRoute: integer("culture_tcc_route").default(15).notNull(),
  shoppingEnabled: boolean("shopping_enabled").default(true).notNull(),
  shoppingCashbackPercent: integer("shopping_cashback_percent").default(5).notNull(),
  shoppingKm0Bonus: integer("shopping_km0_bonus").default(20).notNull(),
  shoppingMarketBonus: integer("shopping_market_bonus").default(10).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  comuneIdx: index("tcc_rewards_config_comune_idx").on(table.comuneId),
}));

// Export types per tabelle TCC Security
export type TccRateLimit = typeof tccRateLimits.$inferSelect;
export type InsertTccRateLimit = typeof tccRateLimits.$inferInsert;

export type TccFraudEvent = typeof tccFraudEvents.$inferSelect;
export type InsertTccFraudEvent = typeof tccFraudEvents.$inferInsert;

export type TccIdempotencyKey = typeof tccIdempotencyKeys.$inferSelect;
export type InsertTccIdempotencyKey = typeof tccIdempotencyKeys.$inferInsert;

export type TccDailyLimit = typeof tccDailyLimits.$inferSelect;
export type InsertTccDailyLimit = typeof tccDailyLimits.$inferInsert;

export type TccQrToken = typeof tccQrTokens.$inferSelect;
export type InsertTccQrToken = typeof tccQrTokens.$inferInsert;

export type TccRewardsConfig = typeof tccRewardsConfig.$inferSelect;
export type InsertTccRewardsConfig = typeof tccRewardsConfig.$inferInsert;

// ============================================================================
// PIATTAFORME PA - PDND, App IO, ANPR, SSO
// ============================================================================

// Enum per stato e-Service PDND
export const eserviceStatusEnum = pgEnum("eservice_status", [
  "draft", "published", "suspended", "deprecated",
]);

// Enum per provider SSO
export const ssoProviderEnum = pgEnum("sso_provider", [
  "spid", "cie", "cns", "eidas",
]);

// Enum per livello SPID
export const spidLevelEnum = pgEnum("spid_level", [
  "L1", "L2", "L3",
]);

// ---- PDND e-Service ----
export const pdndEservices = pgTable("pdnd_eservices", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceId: varchar("service_id", { length: 100 }).notNull().unique(), // dms-mercati, dms-concessioni, etc.
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 20 }).default("1.0.0").notNull(),
  technology: varchar("technology", { length: 20 }).default("REST").notNull(),
  status: eserviceStatusEnum("status").default("draft").notNull(),
  pdndDescriptorId: varchar("pdnd_descriptor_id", { length: 255 }), // ID su PDND dopo pubblicazione
  pdndAgreementId: varchar("pdnd_agreement_id", { length: 255 }), // Agreement ID
  endpointUrl: varchar("endpoint_url", { length: 500 }),
  audienceUrl: varchar("audience_url", { length: 500 }),
  vouchersIssued: integer("vouchers_issued").default(0).notNull(),
  lastPublishedAt: timestamp("last_published_at"),
  publishedBy: varchar("published_by", { length: 255 }),
  config: text("config"), // JSON con configurazione avanzata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  serviceIdx: index("pdnd_eservices_service_idx").on(table.serviceId),
  statusIdx: index("pdnd_eservices_status_idx").on(table.status),
}));

// ---- PDND Voucher Log ----
export const pdndVouchers = pgTable("pdnd_vouchers", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  eserviceId: integer("eservice_id").references(() => pdndEservices.id),
  purposeId: varchar("purpose_id", { length: 255 }).notNull(),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  clientAssertion: text("client_assertion"), // JWT generato
  accessToken: text("access_token"), // Token ricevuto
  tokenExpiresAt: timestamp("token_expires_at"),
  scope: varchar("scope", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, expired, revoked
  requestIp: varchar("request_ip", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  eserviceIdx: index("pdnd_vouchers_eservice_idx").on(table.eserviceId),
  createdIdx: index("pdnd_vouchers_created_idx").on(table.createdAt),
}));

// ---- App IO Messaggi Inviati ----
export const appIoMessages = pgTable("app_io_messages", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  fiscalCode: varchar("fiscal_code", { length: 16 }).notNull(),
  templateId: varchar("template_id", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content").notNull(),
  params: text("params"), // JSON parametri template
  messageId: varchar("message_id", { length: 255 }), // ID restituito da App IO
  status: varchar("status", { length: 50 }).default("sent").notNull(), // sent, delivered, read, failed
  errorMessage: text("error_message"),
  sentBy: varchar("sent_by", { length: 255 }), // Email operatore
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fiscalCodeIdx: index("app_io_messages_fc_idx").on(table.fiscalCode),
  templateIdx: index("app_io_messages_template_idx").on(table.templateId),
  statusIdx: index("app_io_messages_status_idx").on(table.status),
  createdIdx: index("app_io_messages_created_idx").on(table.createdAt),
}));

// ---- App IO Configurazione Servizio ----
export const appIoServiceConfig = pgTable("app_io_service_config", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  serviceId: varchar("service_id", { length: 255 }).notNull().unique(), // ID servizio su App IO
  serviceName: varchar("service_name", { length: 255 }).notNull(),
  departmentName: varchar("department_name", { length: 255 }),
  organizationName: varchar("organization_name", { length: 255 }),
  organizationFiscalCode: varchar("organization_fiscal_code", { length: 16 }),
  isVisible: boolean("is_visible").default(true).notNull(),
  maxAllowedPaymentAmount: integer("max_allowed_payment_amount"), // centesimi
  environment: varchar("environment", { length: 50 }).default("test").notNull(), // test, production
  subscriptionKey: varchar("subscription_key", { length: 255 }), // Ocp-Apim-Subscription-Key
  primaryKeyHash: varchar("primary_key_hash", { length: 64 }), // Hash per sicurezza
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---- ANPR Verifiche ----
export const anprVerifications = pgTable("anpr_verifications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  fiscalCode: varchar("fiscal_code", { length: 16 }).notNull(),
  verificationType: varchar("verification_type", { length: 50 }).notNull(), // cf_existence, residenza, stato_famiglia
  requestedBy: varchar("requested_by", { length: 255 }).notNull(), // Email operatore
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending, success, error, not_found
  responseData: text("response_data"), // JSON risposta ANPR
  errorMessage: text("error_message"),
  pdndVoucherId: integer("pdnd_voucher_id").references(() => pdndVouchers.id), // Voucher PDND usato
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fiscalCodeIdx: index("anpr_verif_fc_idx").on(table.fiscalCode),
  typeIdx: index("anpr_verif_type_idx").on(table.verificationType),
  createdIdx: index("anpr_verif_created_idx").on(table.createdAt),
}));

// ---- SSO Configurazioni Provider ----
export const ssoConfigurations = pgTable("sso_configurations", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  provider: ssoProviderEnum("provider").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  entityId: varchar("entity_id", { length: 500 }).notNull(), // Entity ID del Service Provider
  metadataUrl: varchar("metadata_url", { length: 500 }), // URL metadata IdP
  ssoUrl: varchar("sso_url", { length: 500 }), // URL endpoint SSO
  sloUrl: varchar("slo_url", { length: 500 }), // URL endpoint Single Logout
  certificateHash: varchar("certificate_hash", { length: 64 }), // SHA256 del certificato
  spidLevel: spidLevelEnum("spid_level").default("L2"), // Solo per SPID
  attributeMapping: text("attribute_mapping"), // JSON mapping attributi
  isActive: boolean("is_active").default(false).notNull(),
  environment: varchar("environment", { length: 50 }).default("test").notNull(), // test, production
  lastTestAt: timestamp("last_test_at"),
  lastTestResult: varchar("last_test_result", { length: 50 }), // success, error
  config: text("config"), // JSON configurazione aggiuntiva
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  providerIdx: index("sso_config_provider_idx").on(table.provider),
  activeIdx: index("sso_config_active_idx").on(table.isActive),
}));

// ---- SSO Login Log ----
export const ssoLoginLogs = pgTable("sso_login_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  configurationId: integer("configuration_id").references(() => ssoConfigurations.id),
  provider: ssoProviderEnum("provider").notNull(),
  fiscalCode: varchar("fiscal_code", { length: 16 }),
  spidLevel: spidLevelEnum("spid_level"),
  sessionId: varchar("session_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  providerIdx: index("sso_login_provider_idx").on(table.provider),
  successIdx: index("sso_login_success_idx").on(table.success),
  createdIdx: index("sso_login_created_idx").on(table.createdAt),
}));

// ---- Audit Trail Piattaforme PA ----
export const platformAuditTrail = pgTable("platform_audit_trail", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull(), // pdnd, appio, anpr, sso
  action: varchar("action", { length: 100 }).notNull(), // publish_eservice, send_notification, verify_cf, login_sso, etc.
  entityType: varchar("entity_type", { length: 100 }), // eservice, message, verification, login
  entityId: varchar("entity_id", { length: 255 }), // ID entità coinvolta
  userEmail: varchar("user_email", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull(), // success, error, warning
  requestData: text("request_data"), // JSON richiesta
  responseData: text("response_data"), // JSON risposta
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address", { length: 50 }),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  platformIdx: index("audit_trail_platform_idx").on(table.platform),
  actionIdx: index("audit_trail_action_idx").on(table.action),
  userIdx: index("audit_trail_user_idx").on(table.userEmail),
  createdIdx: index("audit_trail_created_idx").on(table.createdAt),
}));

// Export types per Piattaforme PA
export type PdndEservice = typeof pdndEservices.$inferSelect;
export type InsertPdndEservice = typeof pdndEservices.$inferInsert;

export type PdndVoucher = typeof pdndVouchers.$inferSelect;
export type InsertPdndVoucher = typeof pdndVouchers.$inferInsert;

export type AppIoMessage = typeof appIoMessages.$inferSelect;
export type InsertAppIoMessage = typeof appIoMessages.$inferInsert;

export type AppIoServiceConfig = typeof appIoServiceConfig.$inferSelect;
export type InsertAppIoServiceConfig = typeof appIoServiceConfig.$inferInsert;

export type AnprVerification = typeof anprVerifications.$inferSelect;
export type InsertAnprVerification = typeof anprVerifications.$inferInsert;

export type SsoConfiguration = typeof ssoConfigurations.$inferSelect;
export type InsertSsoConfiguration = typeof ssoConfigurations.$inferInsert;

export type SsoLoginLog = typeof ssoLoginLogs.$inferSelect;
export type InsertSsoLoginLog = typeof ssoLoginLogs.$inferInsert;

export type PlatformAuditTrail = typeof platformAuditTrail.$inferSelect;
export type InsertPlatformAuditTrail = typeof platformAuditTrail.$inferInsert;

