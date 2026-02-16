import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { walletRouter } from "./walletRouter";

/**
 * Helper per logging automatico di tutte le operazioni
 */
async function logAction(
  action: string,
  entityType: string,
  entityId: number | null,
  userEmail: string | null,
  oldValue: any = null,
  newValue: any = null,
  ipAddress: string | null = null
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(schema.auditLogs).values({
      userEmail: userEmail || "system",
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      ipAddress,
    });

    // Log anche in system_logs per visibilità Dashboard
    await db.insert(schema.systemLogs).values({
      app: "DMS_HUB",
      level: "info",
      type: action,
      message: `${action} - ${entityType} #${entityId || "N/A"}`,
      userEmail: userEmail || "system",
      ipAddress,
    });
  } catch (error) {
    console.error("[DMS HUB] Failed to log action:", error);
  }
}

/**
 * Converti formato Slot Editor v3 GeoJSON in formato database
 * Supporta sia il formato originale che il nuovo formato BusHubEditor
 */
function convertSlotEditorV3Format(data: any) {
  // Se è già nel formato corretto (vecchio formato), ritorna così
  if (data.stalls && data.center && !data.stalls_geojson) {
    return data;
  }

  // Altrimenti converti da GeoJSON v3 (nuovo formato BusHubEditor)
  const result: any = {
    container: data.container || [],
    stalls: [],
    customMarkers: [],
    customAreas: [],
    gcp: [],
    png: { url: "", metadata: {} },
  };

  // Usa centro fornito o calcola dal container
  if (data.center) {
    result.center = data.center;
  } else if (data.container && data.container.length > 0) {
    const lats = data.container.map((p: any) => p[0]);
    const lngs = data.container.map((p: any) => p[1]);
    result.center = {
      lat: (Math.max(...lats) + Math.min(...lats)) / 2,
      lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
    };
  } else {
    result.center = { lat: 0, lng: 0 };
  }

  // Converti posteggi da GeoJSON
  if (data.stalls_geojson?.features) {
    result.stalls = data.stalls_geojson.features.map((f: any) => {
      const props = f.properties || {};
      const geom = f.geometry;
      
      // Calcola centro del poligono per lat/lng
      let lat = 0, lng = 0;
      if (geom.type === 'Polygon' && geom.coordinates?.[0]) {
        const coords = geom.coordinates[0];
        const lats = coords.map((c: any) => c[1]);
        const lngs = coords.map((c: any) => c[0]);
        lat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length;
        lng = lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length;
      } else if (geom.type === 'Point') {
        lng = geom.coordinates[0];
        lat = geom.coordinates[1];
      }
      
      // Estrai area da dimensions (es. "4m × 8m")
      let areaMq = null;
      if (props.dimensions) {
        const match = props.dimensions.match(/([\d.]+)m.*?([\d.]+)m/);
        if (match) {
          areaMq = Math.round(parseFloat(match[1]) * parseFloat(match[2]));
        }
      }

      return {
        number: String(props.number || props.id || 0),
        lat,
        lng,
        areaMq,
        category: props.kind || props.category || null,
      };
    });
  }

  // Converti marker personalizzati
  if (data.markers_geojson?.features) {
    result.customMarkers = data.markers_geojson.features.map((f: any) => {
      const props = f.properties || {};
      const coords = f.geometry.coordinates;
      return {
        name: props.name || props.label || "Marker",
        type: props.type || "marker",
        lat: coords[1],
        lng: coords[0],
        icon: props.icon || null,
        color: props.color || null,
        description: props.description || null,
      };
    });
  }

  // Converti aree custom
  if (data.areas_geojson?.features) {
    result.customAreas = data.areas_geojson.features.map((f: any) => {
      const props = f.properties || {};
      return {
        name: props.name || props.label || "Area",
        type: props.type || "area",
        geojson: f.geometry,
        color: props.color || null,
        opacity: props.opacity || 50,
        description: props.description || null,
      };
    });
  }

  // Preserva metadati pianta
  if (data.plant_rotation || data.plant_scale) {
    result.png.metadata = {
      rotation: data.plant_rotation,
      scale: data.plant_scale,
    };
  }

  return result;
}

/**
 * DMS HUB Router
 * 
 * API centralizzate per gestione completa mercati, posteggi, operatori
 * Integrazione con Slot Editor v3, Gestionale Heroku, Piattaforma DMS, App Polizia
 */

export const dmsHubRouter = router({
  // ============================================
  // MERCATI - Import da Slot Editor v3
  // ============================================
  
  markets: router({
    // Import JSON completo da Slot Editor v3
    importFromSlotEditor: adminProcedure
      .input(z.object({
        marketName: z.string(),
        city: z.string(),
        address: z.string(),
        slotEditorData: z.object({
          container: z.any(),
          center: z.object({ lat: z.number(), lng: z.number() }),
          hubArea: z.any().optional(),
          marketArea: z.any().optional(),
          gcp: z.array(z.any()),
          png: z.object({
            url: z.string(),
            metadata: z.any(),
          }),
          stalls: z.array(z.object({
            number: z.string(),
            lat: z.number(),
            lng: z.number(),
            areaMq: z.number().optional(),
            category: z.string().optional(),
          })),
          customMarkers: z.array(z.object({
            name: z.string(),
            type: z.string(),
            lat: z.number(),
            lng: z.number(),
            icon: z.string().optional(),
            color: z.string().optional(),
            description: z.string().optional(),
          })).optional(),
          customAreas: z.array(z.object({
            name: z.string(),
            type: z.string(),
            geojson: z.any(),
            color: z.string().optional(),
            opacity: z.number().optional(),
            description: z.string().optional(),
          })).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // 1. Crea o aggiorna mercato
        const [market] = await db.insert(schema.markets).values({
          name: input.marketName,
          address: input.address,
          city: input.city,
          lat: input.slotEditorData.center.lat.toString(),
          lng: input.slotEditorData.center.lng.toString(),
          active: 1,
        }).onConflictDoUpdate({
          target: schema.markets.id,
          set: {
            name: input.marketName,
            address: input.address,
            lat: input.slotEditorData.center.lat.toString(),
            lng: input.slotEditorData.center.lng.toString(),
          },
        }).returning();

        const marketId = market.id;

        // 2. Salva geometria mercato
        await db.insert(schema.marketGeometry).values({
          marketId: Number(marketId),
          containerGeojson: JSON.stringify(input.slotEditorData.container),
          centerLat: input.slotEditorData.center.lat.toString(),
          centerLng: input.slotEditorData.center.lng.toString(),
          hubAreaGeojson: input.slotEditorData.hubArea ? JSON.stringify(input.slotEditorData.hubArea) : null,
          marketAreaGeojson: input.slotEditorData.marketArea ? JSON.stringify(input.slotEditorData.marketArea) : null,
          gcpData: JSON.stringify(input.slotEditorData.gcp),
          pngUrl: input.slotEditorData.png.url,
          pngMetadata: JSON.stringify(input.slotEditorData.png.metadata),
        }).onConflictDoUpdate({
          target: schema.marketGeometry.id,
          set: {
            containerGeojson: JSON.stringify(input.slotEditorData.container),
            pngUrl: input.slotEditorData.png.url,
          },
        });

        // 3. Crea posteggi
        for (const stall of input.slotEditorData.stalls) {
          await db.insert(schema.stalls).values({
            marketId: Number(marketId),
            number: stall.number,
            lat: stall.lat.toString(),
            lng: stall.lng.toString(),
            areaMq: stall.areaMq || null,
            category: stall.category || null,
            status: "free",
          });
        }

        // 4. Crea marker personalizzati
        if (input.slotEditorData.customMarkers) {
          for (const marker of input.slotEditorData.customMarkers) {
            await db.insert(schema.customMarkers).values({
              marketId: Number(marketId),
              name: marker.name,
              type: marker.type,
              lat: marker.lat.toString(),
              lng: marker.lng.toString(),
              icon: marker.icon || null,
              color: marker.color || null,
              description: marker.description || null,
            });
          }
        }

        // 5. Crea aree custom
        if (input.slotEditorData.customAreas) {
          for (const area of input.slotEditorData.customAreas) {
            await db.insert(schema.customAreas).values({
              marketId: Number(marketId),
              name: area.name,
              type: area.type,
              geojson: JSON.stringify(area.geojson),
              color: area.color || null,
              opacity: area.opacity || 50,
              description: area.description || null,
            });
          }
        }

        // Log operazione
        await logAction(
          "IMPORT_SLOT_EDITOR",
          "market",
          Number(marketId),
          ctx.user?.uid || null,
          null,
          {
            marketName: input.marketName,
            stallsCreated: input.slotEditorData.stalls.length,
            markersCreated: input.slotEditorData.customMarkers?.length || 0,
            areasCreated: input.slotEditorData.customAreas?.length || 0,
          }
        );

        return {
          success: true,
          marketId: Number(marketId),
          stallsCreated: input.slotEditorData.stalls.length,
          markersCreated: input.slotEditorData.customMarkers?.length || 0,
          areasCreated: input.slotEditorData.customAreas?.length || 0,
        };
      }),

    // Import automatico da Slot Editor v3 / BusHubEditor
    importAuto: adminProcedure
      .input(z.object({
        slotEditorData: z.any(), // JSON grezzo da Slot Editor v3
        name: z.string().optional(), // Nome mercato (opzionale, da BusHubEditor)
        location: z.string().optional(), // Località (opzionale, da BusHubEditor)
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Converti formato Slot Editor v3 se necessario
        const convertedData = convertSlotEditorV3Format(input.slotEditorData);

        // Usa nome fornito o genera automatico dal timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const marketName = input.name || `Mercato_${timestamp}`;
        const city = input.location || "Da specificare";
        const address = input.location || "Da specificare";

        // 1. Crea mercato
        const [market] = await db.insert(schema.markets).values({
          name: marketName,
          address,
          city,
          lat: convertedData.center.lat.toString(),
          lng: convertedData.center.lng.toString(),
          active: 1,
        }).returning();

        const marketId = market.id;

        // 2. Salva geometria
        await db.insert(schema.marketGeometry).values({
          marketId: Number(marketId),
          containerGeojson: JSON.stringify(convertedData.container),
          centerLat: convertedData.center.lat.toString(),
          centerLng: convertedData.center.lng.toString(),
          gcpData: JSON.stringify(convertedData.gcp),
          pngUrl: convertedData.png.url,
          pngMetadata: JSON.stringify(convertedData.png.metadata),
        });

        // 3. Crea posteggi
        for (const stall of convertedData.stalls) {
          await db.insert(schema.stalls).values({
            marketId: Number(marketId),
            number: stall.number,
            lat: stall.lat.toString(),
            lng: stall.lng.toString(),
            areaMq: stall.areaMq || null,
            category: stall.category || null,
            status: "free",
          });
        }

        // 4. Marker personalizzati
        if (convertedData.customMarkers) {
          for (const marker of convertedData.customMarkers) {
            await db.insert(schema.customMarkers).values({
              marketId: Number(marketId),
              name: marker.name,
              type: marker.type,
              lat: marker.lat.toString(),
              lng: marker.lng.toString(),
              icon: marker.icon || null,
              color: marker.color || null,
              description: marker.description || null,
            });
          }
        }

        // 5. Aree custom
        if (convertedData.customAreas) {
          for (const area of convertedData.customAreas) {
            await db.insert(schema.customAreas).values({
              marketId: Number(marketId),
              name: area.name,
              type: area.type,
              geojson: JSON.stringify(area.geojson),
              color: area.color || null,
              opacity: area.opacity || 50,
              description: area.description || null,
            });
          }
        }

        await logAction(
          "AUTO_IMPORT_SLOT_EDITOR",
          "market",
          Number(marketId),
          null,
          null,
          {
            marketName,
            stallsCreated: convertedData.stalls.length,
            markersCreated: convertedData.customMarkers?.length || 0,
            areasCreated: convertedData.customAreas?.length || 0,
          }
        );

        return {
          success: true,
          marketId: Number(marketId),
          marketName,
          stallsCreated: convertedData.stalls.length,
          markersCreated: convertedData.customMarkers?.length || 0,
          areasCreated: convertedData.customAreas?.length || 0,
        };
      }),

    // Lista tutti i mercati
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      
      const markets = await db.select().from(schema.markets).where(eq(schema.markets.active, 1));
      
      // Per ogni mercato, conta i posteggi
      const marketsWithStats = await Promise.all(markets.map(async (market) => {
        const [stallsCount] = await db.select({ count: sql<number>`count(*)` })
          .from(schema.stalls)
          .where(eq(schema.stalls.marketId, market.id));
        
        const [occupiedCount] = await db.select({ count: sql<number>`count(*)` })
          .from(schema.stalls)
          .where(and(
            eq(schema.stalls.marketId, market.id),
            eq(schema.stalls.status, "occupied")
          ));

        return {
          ...market,
          totalStalls: Number(stallsCount.count) || 0,
          occupiedStalls: Number(occupiedCount.count) || 0,
          freeStalls: (Number(stallsCount.count) || 0) - (Number(occupiedCount.count) || 0),
        };
      }));

      return marketsWithStats;
    }),

    // Dettagli mercato con geometria
    getById: publicProcedure
      .input(z.object({ marketId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [market] = await db.select().from(schema.markets)
          .where(eq(schema.markets.id, input.marketId));
        
        if (!market) return null;

        const [geometry] = await db.select().from(schema.marketGeometry)
          .where(eq(schema.marketGeometry.marketId, input.marketId));

        const stalls = await db.select().from(schema.stalls)
          .where(eq(schema.stalls.marketId, input.marketId));

        const markers = await db.select().from(schema.customMarkers)
          .where(eq(schema.customMarkers.marketId, input.marketId));

        const areas = await db.select().from(schema.customAreas)
          .where(eq(schema.customAreas.marketId, input.marketId));

        return {
          market,
          geometry: geometry ? {
            ...geometry,
            containerGeojson: geometry.containerGeojson ? JSON.parse(geometry.containerGeojson) : null,
            hubAreaGeojson: geometry.hubAreaGeojson ? JSON.parse(geometry.hubAreaGeojson) : null,
            marketAreaGeojson: geometry.marketAreaGeojson ? JSON.parse(geometry.marketAreaGeojson) : null,
            gcpData: geometry.gcpData ? JSON.parse(geometry.gcpData) : null,
            pngMetadata: geometry.pngMetadata ? JSON.parse(geometry.pngMetadata) : null,
          } : null,
          stalls,
          markers,
          areas: areas.map(a => ({
            ...a,
            geojson: a.geojson ? JSON.parse(a.geojson) : null,
          })),
        };
      }),
  }),

  // ============================================
  // POSTEGGI - Gestione e stati
  // ============================================
  
  stalls: router({
    // Lista posteggi per mercato
    listByMarket: publicProcedure
      .input(z.object({ marketId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db.select().from(schema.stalls)
          .where(eq(schema.stalls.marketId, input.marketId));
      }),

    // Aggiorna stato posteggio
    updateStatus: protectedProcedure
      .input(z.object({
        stallId: z.number(),
        status: z.enum(["free", "reserved", "occupied", "booked", "maintenance"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Ottieni valore vecchio per log
        const [oldStall] = await db.select().from(schema.stalls)
          .where(eq(schema.stalls.id, input.stallId));

        await db.update(schema.stalls)
          .set({ status: input.status })
          .where(eq(schema.stalls.id, input.stallId));

        // Log operazione
        await logAction(
          "UPDATE_STALL_STATUS",
          "stall",
          input.stallId,
          null,
          { status: oldStall?.status },
          { status: input.status }
        );

        return { success: true };
      }),

    // Stati real-time tutti i posteggi di un mercato
    getStatuses: publicProcedure
      .input(z.object({ marketId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const stalls = await db.select({
          id: schema.stalls.id,
          number: schema.stalls.number,
          status: schema.stalls.status,
          lat: schema.stalls.lat,
          lng: schema.stalls.lng,
        }).from(schema.stalls)
          .where(eq(schema.stalls.marketId, input.marketId));

        return stalls;
      }),
  }),

  // ============================================
  // OPERATORI - Anagrafica e gestione
  // ============================================
  
  vendors: router({
    // Lista tutti gli operatori
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(schema.vendors)
        .orderBy(desc(schema.vendors.createdAt));
    }),

    // Crea nuovo operatore
    create: protectedProcedure
      .input(z.object({
        firstName: z.string(),
        lastName: z.string(),
        fiscalCode: z.string().optional(),
        vatNumber: z.string().optional(),
        businessName: z.string().optional(),
        businessType: z.string().optional(),
        atecoCode: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        bankAccount: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [result] = await db.insert(schema.vendors).values({
          ...input,
          status: "active",
        }).returning();

        const vendorId = Number(result.id);

        // Log operazione
        await logAction(
          "CREATE_VENDOR",
          "vendor",
          vendorId,
          null,
          null,
          { ...input, status: "active" }
        );

        return { success: true, vendorId };
      }),

    // Aggiorna operatore
    update: protectedProcedure
      .input(z.object({
        vendorId: z.number(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          fiscalCode: z.string().optional(),
          vatNumber: z.string().optional(),
          businessName: z.string().optional(),
          businessType: z.string().optional(),
          atecoCode: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
          address: z.string().optional(),
          bankAccount: z.string().optional(),
          status: z.enum(["active", "suspended", "inactive"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Ottieni valore vecchio per log
        const [oldVendor] = await db.select().from(schema.vendors)
          .where(eq(schema.vendors.id, input.vendorId));

        await db.update(schema.vendors)
          .set(input.data)
          .where(eq(schema.vendors.id, input.vendorId));

        // Log operazione
        await logAction(
          "UPDATE_VENDOR",
          "vendor",
          input.vendorId,
          null,
          oldVendor,
          input.data
        );

        return { success: true };
      }),

    // Dettagli operatore completi (per App Polizia)
    getFullDetails: protectedProcedure
      .input(z.object({ vendorId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [vendor] = await db.select().from(schema.vendors)
          .where(eq(schema.vendors.id, input.vendorId));

        if (!vendor) return null;

        // Documenti
        const documents = await db.select().from(schema.vendorDocuments)
          .where(eq(schema.vendorDocuments.vendorId, input.vendorId));

        // Concessioni
        const concessions = await db.select().from(schema.concessions)
          .where(eq(schema.concessions.vendorId, input.vendorId))
          .orderBy(desc(schema.concessions.createdAt));

        // Presenze ultimo mese
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const presences = await db.select().from(schema.vendorPresences)
          .where(and(
            eq(schema.vendorPresences.vendorId, input.vendorId),
            sql`${schema.vendorPresences.checkinTime} >= ${thirtyDaysAgo}`
          ))
          .orderBy(desc(schema.vendorPresences.checkinTime));

        // Verbali
        const violations = await db.select().from(schema.violations)
          .where(eq(schema.violations.vendorId, input.vendorId))
          .orderBy(desc(schema.violations.createdAt));

        return {
          vendor,
          documents,
          concessions,
          presences,
          violations,
          stats: {
            totalPresences: presences.length,
            totalViolations: violations.length,
            activeConcessions: concessions.filter(c => c.status === "active").length,
          },
        };
      }),
  }),

  // ============================================
  // PRENOTAZIONI - Sistema booking posteggi
  // ============================================
  
  bookings: router({
    // Crea prenotazione
    create: protectedProcedure
      .input(z.object({
        stallId: z.number(),
        userId: z.number().optional(),
        vendorId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Verifica che posteggio sia libero
        const [stall] = await db.select().from(schema.stalls)
          .where(eq(schema.stalls.id, input.stallId));

        if (!stall || stall.status !== "free") {
          throw new Error("Posteggio non disponibile");
        }

        // Crea prenotazione con scadenza 30 minuti
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

        const [result] = await db.insert(schema.bookings).values({
          stallId: input.stallId,
          userId: input.userId || null,
          vendorId: input.vendorId || null,
          status: "pending",
          bookingDate: now,
          expiresAt,
          notes: input.notes || null,
        }).returning();

        // Aggiorna stato posteggio
        await db.update(schema.stalls)
          .set({ status: "booked" })
          .where(eq(schema.stalls.id, input.stallId));

        const bookingId = Number(result.id);

        // Log operazione
        await logAction(
          "CREATE_BOOKING",
          "booking",
          bookingId,
          null,
          null,
          { stallId: input.stallId, userId: input.userId, vendorId: input.vendorId, expiresAt }
        );

        return {
          success: true,
          bookingId,
          expiresAt,
        };
      }),

    // Lista prenotazioni attive
    listActive: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(schema.bookings)
        .where(eq(schema.bookings.status, "pending"))
        .orderBy(desc(schema.bookings.createdAt));
    }),

    // Conferma check-in con verifica saldo wallet
    confirmCheckin: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        vendorId: z.number(),
        lat: z.string().optional(),
        lng: z.string().optional(),
        skipWalletCheck: z.boolean().optional(), // Per casi speciali (es. prima presenza gratuita)
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const now = new Date();

        // Ottieni info booking
        const [booking] = await db.select().from(schema.bookings)
          .where(eq(schema.bookings.id, input.bookingId));

        if (!booking) throw new Error("Booking not found");

        // Ottieni info posteggio per il mercato e tipo
        const [stall] = await db.select().from(schema.stalls)
          .where(eq(schema.stalls.id, booking.stallId));

        if (!stall) throw new Error("Stall not found");

        // Ottieni info vendor per l'impresa
        const [vendor] = await db.select().from(schema.vendors)
          .where(eq(schema.vendors.id, input.vendorId));

        // ============================================
        // VERIFICA SALDO WALLET (se abilitato)
        // ============================================
        if (!input.skipWalletCheck && vendor) {
          // Cerca wallet dell'impresa
          const [wallet] = await db.select().from(schema.operatoreWallet)
            .where(eq(schema.operatoreWallet.impresaId, vendor.id));

          if (wallet) {
            // Verifica stato wallet
            if (wallet.status === "BLOCCATO") {
              throw new Error("WALLET_BLOCCATO: Impossibile effettuare il check-in. Il wallet è bloccato per saldo insufficiente. Effettuare una ricarica.");
            }

            if (wallet.status === "SOSPESO") {
              throw new Error("WALLET_SOSPESO: Impossibile effettuare il check-in. Il wallet è sospeso. Contattare l'ufficio mercati.");
            }

            // Ottieni tariffa posteggio
            const tipoPosteggio = (stall as any).type || "STANDARD";
            const [tariffa] = await db.select().from(schema.tariffePosteggio)
              .where(and(
                eq(schema.tariffePosteggio.mercatoId, stall.marketId),
                eq(schema.tariffePosteggio.tipoPosteggio, tipoPosteggio)
              ));

            const importoRichiesto = tariffa?.tariffaGiornaliera || 0;

            // Verifica saldo sufficiente
            if (importoRichiesto > 0 && wallet.saldo < importoRichiesto) {
              throw new Error(
                `SALDO_INSUFFICIENTE: Saldo wallet insufficiente. ` +
                `Richiesto: €${(importoRichiesto / 100).toFixed(2)}, ` +
                `Disponibile: €${(wallet.saldo / 100).toFixed(2)}. ` +
                `Effettuare una ricarica per procedere.`
              );
            }

            // Se c'è tariffa, effettua decurtazione automatica
            if (importoRichiesto > 0) {
              const saldoPrecedente = wallet.saldo;
              const saldoSuccessivo = saldoPrecedente - importoRichiesto;

              // Inserisci transazione decurtazione
              await db.insert(schema.walletTransazioni).values({
                walletId: wallet.id,
                tipo: "DECURTAZIONE",
                importo: -importoRichiesto,
                saldoPrecedente,
                saldoSuccessivo,
                mercatoId: stall.marketId,
                posteggioId: stall.id,
                descrizione: `Presenza mercato - Posteggio ${stall.number || stall.id}`,
                operatoreId: "SYSTEM",
              });

              // Aggiorna saldo wallet
              const nuovoStatus = saldoSuccessivo <= wallet.saldoMinimo ? "BLOCCATO" : wallet.status;
              await db.update(schema.operatoreWallet)
                .set({
                  saldo: saldoSuccessivo,
                  totaleDecurtato: wallet.totaleDecurtato + importoRichiesto,
                  ultimaDecurtazione: now,
                  updatedAt: now,
                  status: nuovoStatus,
                })
                .where(eq(schema.operatoreWallet.id, wallet.id));

              console.log(
                `[Wallet] Decurtazione automatica: Wallet ${wallet.id}, ` +
                `Importo €${(importoRichiesto / 100).toFixed(2)}, ` +
                `Nuovo saldo €${(saldoSuccessivo / 100).toFixed(2)}`
              );

              // Se wallet bloccato dopo decurtazione, notifica
              if (nuovoStatus === "BLOCCATO") {
                console.log(
                  `[Wallet] ATTENZIONE: Wallet ${wallet.id} bloccato dopo decurtazione. ` +
                  `Prossima presenza richiederà ricarica.`
                );
              }
            }
          }
        }

        // ============================================
        // PROCEDI CON CHECK-IN
        // ============================================

        // Aggiorna booking
        await db.update(schema.bookings)
          .set({
            status: "confirmed",
            checkedInAt: now,
          })
          .where(eq(schema.bookings.id, input.bookingId));

        // Crea presenza
        const [presence] = await db.insert(schema.vendorPresences).values({
          vendorId: input.vendorId,
          stallId: booking.stallId,
          bookingId: input.bookingId,
          checkinTime: now,
          lat: input.lat || null,
          lng: input.lng || null,
        }).returning();

        // Aggiorna stato posteggio
        await db.update(schema.stalls)
          .set({ status: "occupied" })
          .where(eq(schema.stalls.id, booking.stallId));

        // Log operazione
        await logAction(
          "CONFIRM_CHECKIN",
          "booking",
          input.bookingId,
          null,
          { status: "pending" },
          { status: "confirmed", vendorId: input.vendorId, presenceId: presence?.id }
        );

        return { success: true, presenceId: presence?.id };
      }),

    // Cancella prenotazione
    cancel: protectedProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [booking] = await db.select().from(schema.bookings)
          .where(eq(schema.bookings.id, input.bookingId));

        if (!booking) throw new Error("Booking not found");

        // Aggiorna booking
        await db.update(schema.bookings)
          .set({ status: "cancelled" })
          .where(eq(schema.bookings.id, input.bookingId));

        // Libera posteggio
        await db.update(schema.stalls)
          .set({ status: "free" })
          .where(eq(schema.stalls.id, booking.stallId));

        // Log operazione
        await logAction(
          "CANCEL_BOOKING",
          "booking",
          input.bookingId,
          null,
          { status: booking.status },
          { status: "cancelled" }
        );

        return { success: true };
      }),
  }),

  // ============================================
  // PRESENZE - Check-in/Check-out
  // ============================================
  
  presences: router({
    // Check-out operatore
    checkout: protectedProcedure
      .input(z.object({
        presenceId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const now = new Date();

        // Ottieni presenza
        const [presence] = await db.select().from(schema.vendorPresences)
          .where(eq(schema.vendorPresences.id, input.presenceId));

        if (!presence) throw new Error("Presence not found");

        // Calcola durata in minuti
        const duration = Math.floor((now.getTime() - new Date(presence.checkinTime).getTime()) / 60000);

        // Aggiorna presenza
        await db.update(schema.vendorPresences)
          .set({
            checkoutTime: now,
            duration,
            notes: input.notes || presence.notes,
          })
          .where(eq(schema.vendorPresences.id, input.presenceId));

        // Libera posteggio
        await db.update(schema.stalls)
          .set({ status: "free" })
          .where(eq(schema.stalls.id, presence.stallId));

        // Log operazione
        await logAction(
          "CHECKOUT_VENDOR",
          "presence",
          input.presenceId,
          null,
          { checkoutTime: null },
          { checkoutTime: now, duration }
        );

        return { success: true, duration };
      }),

    // Presenze oggi per mercato
    getTodayByMarket: protectedProcedure
      .input(z.object({ marketId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const presences = await db.select({
          presence: schema.vendorPresences,
          vendor: schema.vendors,
          stall: schema.stalls,
        })
          .from(schema.vendorPresences)
          .innerJoin(schema.vendors, eq(schema.vendorPresences.vendorId, schema.vendors.id))
          .innerJoin(schema.stalls, eq(schema.vendorPresences.stallId, schema.stalls.id))
          .where(and(
            eq(schema.stalls.marketId, input.marketId),
            sql`${schema.vendorPresences.checkinTime} >= ${today}`
          ))
          .orderBy(desc(schema.vendorPresences.checkinTime));

        return presences;
      }),
  }),

  // ============================================
  // CONTROLLI E VERBALI - Per App Polizia
  // ============================================
  
  inspections: router({
    // Crea controllo
    create: adminProcedure
      .input(z.object({
        vendorId: z.number(),
        stallId: z.number().optional(),
        inspectorName: z.string(),
        inspectorBadge: z.string().optional(),
        type: z.enum(["routine", "complaint", "random", "targeted"]),
        checklist: z.any().optional(),
        photosUrls: z.array(z.string()).optional(),
        gpsLat: z.string().optional(),
        gpsLng: z.string().optional(),
        result: z.enum(["compliant", "violation", "warning"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [result] = await db.insert(schema.inspectionsDetailed).values({
          vendorId: input.vendorId,
          stallId: input.stallId || null,
          inspectorName: input.inspectorName,
          inspectorBadge: input.inspectorBadge || null,
          type: input.type,
          checklist: input.checklist ? JSON.stringify(input.checklist) : null,
          photosUrls: input.photosUrls ? JSON.stringify(input.photosUrls) : null,
          gpsLat: input.gpsLat || null,
          gpsLng: input.gpsLng || null,
          result: input.result,
          notes: input.notes || null,
        }).returning();

        const inspectionId = Number(result.id);

        // Log operazione
        await logAction(
          "CREATE_INSPECTION",
          "inspection",
          inspectionId,
          input.inspectorName,
          null,
          { vendorId: input.vendorId, result: input.result, type: input.type }
        );

        return { success: true, inspectionId };
      }),

    // Lista controlli
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(schema.inspectionsDetailed)
        .orderBy(desc(schema.inspectionsDetailed.createdAt));
    }),
  }),

  violations: router({
    // Crea verbale
    create: adminProcedure
      .input(z.object({
        inspectionId: z.number().optional(),
        vendorId: z.number(),
        stallId: z.number().optional(),
        violationType: z.string(),
        violationCode: z.string().optional(),
        description: z.string(),
        fineAmount: z.number().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [result] = await db.insert(schema.violations).values({
          inspectionId: input.inspectionId || null,
          vendorId: input.vendorId,
          stallId: input.stallId || null,
          violationType: input.violationType,
          violationCode: input.violationCode || null,
          description: input.description,
          fineAmount: input.fineAmount || null,
          status: "issued",
          dueDate: input.dueDate || null,
        }).returning();

        const violationId = Number(result.id);

        // Log operazione
        await logAction(
          "CREATE_VIOLATION",
          "violation",
          violationId,
          null,
          null,
          { vendorId: input.vendorId, violationType: input.violationType, fineAmount: input.fineAmount }
        );

        return { success: true, violationId };
      }),

    // Lista verbali
    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(schema.violations)
        .orderBy(desc(schema.violations.createdAt));
    }),
  }),

  // ============================================
  // HUB - Gestione HUB, Negozi e Servizi
  // ============================================
  
  hub: router({
    // Lista HUB locations
    locations: router({
      list: publicProcedure
        .input(z.object({ includeInactive: z.boolean().optional() }).optional())
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) return [];
          
          // Filtra solo attivi di default, a meno che non sia richiesto esplicitamente
          if (input?.includeInactive) {
            return await db.select().from(schema.hubLocations)
              .orderBy(desc(schema.hubLocations.createdAt));
          }
          
          return await db.select().from(schema.hubLocations)
            .where(eq(schema.hubLocations.active, 1))
            .orderBy(desc(schema.hubLocations.createdAt));
        }),
      
      getById: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) return null;
          const [hub] = await db.select().from(schema.hubLocations)
            .where(eq(schema.hubLocations.id, input.id));
          return hub || null;
        }),
      
      create: adminProcedure
        .input(z.object({
          marketId: z.number(),
          name: z.string(),
          address: z.string(),
          city: z.string(),
          lat: z.string(),
          lng: z.string(),
          areaGeojson: z.string().optional(),
          openingHours: z.string().optional(),
          description: z.string().optional(),
          photoUrl: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          const [hub] = await db.insert(schema.hubLocations).values({
            marketId: input.marketId,
            name: input.name,
            address: input.address,
            city: input.city,
            lat: input.lat,
            lng: input.lng,
            areaGeojson: input.areaGeojson || null,
            openingHours: input.openingHours || null,
            description: input.description || null,
            photoUrl: input.photoUrl || null,
          }).returning();
          
          await logAction("CREATE_HUB", "hub_location", hub.id, null, null, hub);
          return { success: true, hubId: hub.id };
        }),
      
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          marketId: z.number().optional(),
          name: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          areaGeojson: z.string().optional(),
          openingHours: z.string().optional(),
          description: z.string().optional(),
          photoUrl: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          // Ottieni valore vecchio per log
          const [oldHub] = await db.select().from(schema.hubLocations)
            .where(eq(schema.hubLocations.id, input.id));
          
          if (!oldHub) throw new Error("HUB location not found");
          
          // Prepara dati per update (solo campi forniti)
          const updateData: any = { updatedAt: new Date() };
          if (input.marketId !== undefined) updateData.marketId = input.marketId;
          if (input.name !== undefined) updateData.name = input.name;
          if (input.address !== undefined) updateData.address = input.address;
          if (input.city !== undefined) updateData.city = input.city;
          if (input.lat !== undefined) updateData.lat = input.lat;
          if (input.lng !== undefined) updateData.lng = input.lng;
          if (input.areaGeojson !== undefined) updateData.areaGeojson = input.areaGeojson;
          if (input.openingHours !== undefined) updateData.openingHours = input.openingHours;
          if (input.description !== undefined) updateData.description = input.description;
          if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl;
          
          await db.update(schema.hubLocations)
            .set(updateData)
            .where(eq(schema.hubLocations.id, input.id));
          
          // Log operazione
          await logAction("UPDATE_HUB", "hub_location", input.id, null, oldHub, updateData);
          
          return { success: true };
        }),
      
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          // Ottieni valore vecchio per log
          const [oldHub] = await db.select().from(schema.hubLocations)
            .where(eq(schema.hubLocations.id, input.id));
          
          if (!oldHub) throw new Error("HUB location not found");
          
          // Soft delete: imposta active = 0
          await db.update(schema.hubLocations)
            .set({ active: 0, updatedAt: new Date() })
            .where(eq(schema.hubLocations.id, input.id));
          
          // Log operazione
          await logAction("DELETE_HUB", "hub_location", input.id, null, oldHub, { active: 0 });
          
          return { success: true };
        }),
    }),
    
    // Gestione negozi HUB
    shops: router({
      list: publicProcedure
        .input(z.object({ hubId: z.number().optional() }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) return [];
          
          if (input.hubId) {
            return await db.select().from(schema.hubShops)
              .where(eq(schema.hubShops.hubId, input.hubId))
              .orderBy(desc(schema.hubShops.createdAt));
          }
          
          return await db.select().from(schema.hubShops)
            .orderBy(desc(schema.hubShops.createdAt));
        }),
      
      create: adminProcedure
        .input(z.object({
          hubId: z.number(),
          name: z.string(),
          category: z.string().optional(),
          certifications: z.string().optional(),
          ownerId: z.number().optional(),
          businessName: z.string().optional(),
          vatNumber: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          areaMq: z.number().optional(),
          description: z.string().optional(),
          photoUrl: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          const [shop] = await db.insert(schema.hubShops).values({
            hubId: input.hubId,
            name: input.name,
            category: input.category || null,
            certifications: input.certifications || null,
            ownerId: input.ownerId || null,
            businessName: input.businessName || null,
            vatNumber: input.vatNumber || null,
            phone: input.phone || null,
            email: input.email || null,
            lat: input.lat || null,
            lng: input.lng || null,
            areaMq: input.areaMq || null,
            description: input.description || null,
            photoUrl: input.photoUrl || null,
          }).returning();
          
          await logAction("CREATE_HUB_SHOP", "hub_shop", shop.id, null, null, shop);
          return { success: true, shopId: shop.id };
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          category: z.string().optional(),
          certifications: z.string().optional(),
          ownerId: z.number().optional(),
          businessName: z.string().optional(),
          vatNumber: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          areaMq: z.number().optional(),
          description: z.string().optional(),
          photoUrl: z.string().optional(),
          status: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          const [oldShop] = await db.select().from(schema.hubShops)
            .where(eq(schema.hubShops.id, input.id));
          if (!oldShop) throw new Error("Negozio HUB non trovato");

          const updateData: any = { updatedAt: new Date() };
          if (input.name !== undefined) updateData.name = input.name;
          if (input.category !== undefined) updateData.category = input.category;
          if (input.certifications !== undefined) updateData.certifications = input.certifications;
          if (input.ownerId !== undefined) updateData.ownerId = input.ownerId;
          if (input.businessName !== undefined) updateData.businessName = input.businessName;
          if (input.vatNumber !== undefined) updateData.vatNumber = input.vatNumber;
          if (input.phone !== undefined) updateData.phone = input.phone;
          if (input.email !== undefined) updateData.email = input.email;
          if (input.lat !== undefined) updateData.lat = input.lat;
          if (input.lng !== undefined) updateData.lng = input.lng;
          if (input.areaMq !== undefined) updateData.areaMq = input.areaMq;
          if (input.description !== undefined) updateData.description = input.description;
          if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl;
          if (input.status !== undefined) updateData.status = input.status;

          await db.update(schema.hubShops)
            .set(updateData)
            .where(eq(schema.hubShops.id, input.id));

          await logAction("UPDATE_HUB_SHOP", "hub_shop", input.id, null, oldShop, updateData);
          return { success: true };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          const [oldShop] = await db.select().from(schema.hubShops)
            .where(eq(schema.hubShops.id, input.id));
          if (!oldShop) throw new Error("Negozio HUB non trovato");

          await db.update(schema.hubShops)
            .set({ status: "inactive", updatedAt: new Date() })
            .where(eq(schema.hubShops.id, input.id));

          await logAction("DELETE_HUB_SHOP", "hub_shop", input.id, null, oldShop, { status: "inactive" });
          return { success: true };
        }),
    }),
    
    // Gestione servizi HUB
    services: router({
      list: publicProcedure
        .input(z.object({ hubId: z.number().optional() }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) return [];
          
          if (input.hubId) {
            return await db.select().from(schema.hubServices)
              .where(eq(schema.hubServices.hubId, input.hubId))
              .orderBy(desc(schema.hubServices.createdAt));
          }
          
          return await db.select().from(schema.hubServices)
            .orderBy(desc(schema.hubServices.createdAt));
        }),
      
      create: adminProcedure
        .input(z.object({
          hubId: z.number(),
          name: z.string(),
          type: z.string(),
          description: z.string().optional(),
          capacity: z.number().optional(),
          available: z.number().optional(),
          price: z.number().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          metadata: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");
          
          const [service] = await db.insert(schema.hubServices).values({
            hubId: input.hubId,
            name: input.name,
            type: input.type,
            description: input.description || null,
            capacity: input.capacity || null,
            available: input.available || null,
            price: input.price || null,
            lat: input.lat || null,
            lng: input.lng || null,
            metadata: input.metadata || null,
          }).returning();
          
          await logAction("CREATE_HUB_SERVICE", "hub_service", service.id, null, null, service);
          return { success: true, serviceId: service.id };
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          type: z.string().optional(),
          description: z.string().optional(),
          capacity: z.number().optional(),
          available: z.number().optional(),
          price: z.number().optional(),
          lat: z.string().optional(),
          lng: z.string().optional(),
          metadata: z.string().optional(),
          status: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          const [oldService] = await db.select().from(schema.hubServices)
            .where(eq(schema.hubServices.id, input.id));
          if (!oldService) throw new Error("Servizio HUB non trovato");

          const updateData: any = { updatedAt: new Date() };
          if (input.name !== undefined) updateData.name = input.name;
          if (input.type !== undefined) updateData.type = input.type;
          if (input.description !== undefined) updateData.description = input.description;
          if (input.capacity !== undefined) updateData.capacity = input.capacity;
          if (input.available !== undefined) updateData.available = input.available;
          if (input.price !== undefined) updateData.price = input.price;
          if (input.lat !== undefined) updateData.lat = input.lat;
          if (input.lng !== undefined) updateData.lng = input.lng;
          if (input.metadata !== undefined) updateData.metadata = input.metadata;
          if (input.status !== undefined) updateData.status = input.status;

          await db.update(schema.hubServices)
            .set(updateData)
            .where(eq(schema.hubServices.id, input.id));

          await logAction("UPDATE_HUB_SERVICE", "hub_service", input.id, null, oldService, updateData);
          return { success: true };
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new Error("Database not available");

          const [oldService] = await db.select().from(schema.hubServices)
            .where(eq(schema.hubServices.id, input.id));
          if (!oldService) throw new Error("Servizio HUB non trovato");

          await db.update(schema.hubServices)
            .set({ status: "inactive", updatedAt: new Date() })
            .where(eq(schema.hubServices.id, input.id));

          await logAction("DELETE_HUB_SERVICE", "hub_service", input.id, null, oldService, { status: "inactive" });
          return { success: true };
        }),
    }),
  }),

  // ============================================
  // CONCESSIONI - Gestione concessioni posteggi
  // ============================================
  
  concessions: router({
    // Lista concessioni
    list: publicProcedure
      .input(z.object({
        marketId: z.number().optional(),
        vendorId: z.number().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        let query = db.select().from(schema.concessions);
        
        if (input?.marketId) {
          query = query.where(eq(schema.concessions.marketId, input.marketId)) as any;
        }
        if (input?.vendorId) {
          query = query.where(eq(schema.concessions.vendorId, input.vendorId)) as any;
        }
        if (input?.status) {
          query = query.where(eq(schema.concessions.status, input.status)) as any;
        }
        
        return await query.orderBy(desc(schema.concessions.createdAt));
      }),
    
    // Dettaglio concessione
    getById: publicProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [concession] = await db.select().from(schema.concessions)
          .where(eq(schema.concessions.id, input));
        
        return concession || null;
      }),
    
    // Crea concessione (chiamato dal form SUAP)
    create: protectedProcedure
      .input(z.object({
        vendorId: z.number(),
        stallId: z.number().optional(),
        marketId: z.number(),
        concessionNumber: z.string(),
        type: z.string(), // subingresso, nuova, conversione
        startDate: z.string(),
        endDate: z.string().optional(),
        status: z.string().optional(),
        fee: z.number().optional(),
        paymentStatus: z.string().optional(),
        notes: z.string().optional(),
        // Dati aggiuntivi dal form
        sciaId: z.number().optional(),
        impresaId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [concession] = await db.insert(schema.concessions).values({
          vendorId: input.vendorId,
          stallId: input.stallId || null,
          marketId: input.marketId,
          concessionNumber: input.concessionNumber,
          type: input.type,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          status: input.status || "active",
          fee: input.fee || null,
          paymentStatus: input.paymentStatus || "pending",
          notes: input.notes || null,
        }).returning();
        
        await logAction("CREATE_CONCESSION", "concession", concession.id, null, null, concession);
        
        // Se c'è una SCIA collegata, aggiorna lo stato della pratica via API REST
        if (input.sciaId) {
          try {
            await fetch(`https://orchestratore.mio-hub.me/api/suap/pratiche/${input.sciaId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                stato: 'approvata',
                concessione_id: concession.id
              })
            });
          } catch (err) {
            console.error('Errore aggiornamento SCIA:', err);
          }
        }
        
        return { success: true, concessionId: concession.id, concession };
      }),
    
    // Aggiorna concessione
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.string().optional(),
        endDate: z.string().optional(),
        fee: z.number().optional(),
        paymentStatus: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { id, ...updateData } = input;
        
        const [oldConcession] = await db.select().from(schema.concessions)
          .where(eq(schema.concessions.id, id));
        
        const updateValues: any = { updatedAt: new Date() };
        if (updateData.status) updateValues.status = updateData.status;
        if (updateData.endDate) updateValues.endDate = new Date(updateData.endDate);
        if (updateData.fee !== undefined) updateValues.fee = updateData.fee;
        if (updateData.paymentStatus) updateValues.paymentStatus = updateData.paymentStatus;
        if (updateData.notes !== undefined) updateValues.notes = updateData.notes;
        
        const [updated] = await db.update(schema.concessions)
          .set(updateValues)
          .where(eq(schema.concessions.id, id))
          .returning();
        
        await logAction("UPDATE_CONCESSION", "concession", id, null, oldConcession, updated);
        
        return { success: true, concession: updated };
      }),
  }),

  // ============================================================================
  // GAMING & REWARDS - Sistema di Gamification per Comuni
  // ============================================================================
  gamingRewards: router({
    // GET config per comune
    getConfig: publicProcedure
      .input(z.object({
        comuneId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [config] = await db.execute(sql`
          SELECT * FROM gaming_rewards_config WHERE comune_id = ${input.comuneId}
        `);
        
        if (!config || (Array.isArray(config) && config.length === 0)) {
          // Ritorna configurazione di default se non esiste
          return {
            comuneId: input.comuneId,
            civicEnabled: true,
            civicTccDefault: 10,
            civicTccUrgent: 5,
            civicTccPhotoBonus: 5,
            mobilityEnabled: false,
            mobilityTccBus: 10,
            mobilityTccBikeKm: 3,
            mobilityTccWalkKm: 5,
            mobilityTccTrain: 15,
            mobilityRushHourBonus: 0,
            cultureEnabled: false,
            cultureTccMuseum: 100,
            cultureTccMonument: 50,
            cultureTccRoute: 300,
            cultureTccEvent: 50,
            cultureWeekendBonus: 0,
            shoppingEnabled: false,
            shoppingCashbackPercent: 1.00,
            shoppingKm0Bonus: 20,
            shoppingArtisanBonus: 15,
            shoppingMarketBonus: 10,
            challengeEnabled: false,
            challengeMaxActive: 3,
            challengeDefaultBonus: 50,
          };
        }
        
        const row = Array.isArray(config) ? config[0] : config;
        return {
          id: row.id,
          comuneId: row.comune_id,
          civicEnabled: row.civic_enabled,
          civicTccDefault: row.civic_tcc_default,
          civicTccUrgent: row.civic_tcc_urgent,
          civicTccPhotoBonus: row.civic_tcc_photo_bonus,
          mobilityEnabled: row.mobility_enabled,
          mobilityTccBus: row.mobility_tcc_bus,
          mobilityTccBikeKm: row.mobility_tcc_bike_km,
          mobilityTccWalkKm: row.mobility_tcc_walk_km,
          mobilityTccTrain: row.mobility_tcc_train,
          mobilityRushHourBonus: row.mobility_rush_hour_bonus,
          cultureEnabled: row.culture_enabled,
          cultureTccMuseum: row.culture_tcc_museum,
          cultureTccMonument: row.culture_tcc_monument,
          cultureTccRoute: row.culture_tcc_route,
          cultureTccEvent: row.culture_tcc_event,
          cultureWeekendBonus: row.culture_weekend_bonus,
          shoppingEnabled: row.shopping_enabled,
          shoppingCashbackPercent: parseFloat(row.shopping_cashback_percent) || 1.00,
          shoppingKm0Bonus: row.shopping_km0_bonus,
          shoppingArtisanBonus: row.shopping_artisan_bonus,
          shoppingMarketBonus: row.shopping_market_bonus,
          challengeEnabled: row.challenge_enabled,
          challengeMaxActive: row.challenge_max_active,
          challengeDefaultBonus: row.challenge_default_bonus,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }),

    // SAVE config per comune
    saveConfig: adminProcedure
      .input(z.object({
        comuneId: z.number(),
        civicEnabled: z.boolean().optional(),
        civicTccDefault: z.number().optional(),
        civicTccUrgent: z.number().optional(),
        civicTccPhotoBonus: z.number().optional(),
        mobilityEnabled: z.boolean().optional(),
        mobilityTccBus: z.number().optional(),
        mobilityTccBikeKm: z.number().optional(),
        mobilityTccWalkKm: z.number().optional(),
        mobilityTccTrain: z.number().optional(),
        mobilityRushHourBonus: z.number().optional(),
        cultureEnabled: z.boolean().optional(),
        cultureTccMuseum: z.number().optional(),
        cultureTccMonument: z.number().optional(),
        cultureTccRoute: z.number().optional(),
        cultureTccEvent: z.number().optional(),
        cultureWeekendBonus: z.number().optional(),
        shoppingEnabled: z.boolean().optional(),
        shoppingCashbackPercent: z.number().optional(),
        shoppingKm0Bonus: z.number().optional(),
        shoppingArtisanBonus: z.number().optional(),
        shoppingMarketBonus: z.number().optional(),
        challengeEnabled: z.boolean().optional(),
        challengeMaxActive: z.number().optional(),
        challengeDefaultBonus: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const { comuneId } = input;
        
        // Prima verifica se esiste già una configurazione per questo comune
        const [existing] = await db.execute(sql`
          SELECT id FROM gaming_rewards_config WHERE comune_id = ${comuneId}
        `);
        
        const hasExisting = Array.isArray(existing) && existing.length > 0;
        
        if (hasExisting) {
          // UPDATE esistente
          await db.execute(sql`
            UPDATE gaming_rewards_config SET
              civic_enabled = ${input.civicEnabled ?? true},
              civic_tcc_default = ${input.civicTccDefault ?? 10},
              civic_tcc_urgent = ${input.civicTccUrgent ?? 5},
              civic_tcc_photo_bonus = ${input.civicTccPhotoBonus ?? 5},
              mobility_enabled = ${input.mobilityEnabled ?? false},
              mobility_tcc_bus = ${input.mobilityTccBus ?? 10},
              mobility_tcc_bike_km = ${input.mobilityTccBikeKm ?? 3},
              mobility_tcc_walk_km = ${input.mobilityTccWalkKm ?? 5},
              culture_enabled = ${input.cultureEnabled ?? false},
              culture_tcc_museum = ${input.cultureTccMuseum ?? 100},
              culture_tcc_monument = ${input.cultureTccMonument ?? 50},
              culture_tcc_route = ${input.cultureTccRoute ?? 300},
              shopping_enabled = ${input.shoppingEnabled ?? false},
              shopping_cashback_percent = ${input.shoppingCashbackPercent ?? 1.00},
              shopping_km0_bonus = ${input.shoppingKm0Bonus ?? 20},
              shopping_market_bonus = ${input.shoppingMarketBonus ?? 10},
              updated_at = NOW()
            WHERE comune_id = ${comuneId}
          `);
        } else {
          // INSERT nuovo
          await db.execute(sql`
            INSERT INTO gaming_rewards_config (
              comune_id,
              civic_enabled, civic_tcc_default, civic_tcc_urgent, civic_tcc_photo_bonus,
              mobility_enabled, mobility_tcc_bus, mobility_tcc_bike_km, mobility_tcc_walk_km,
              culture_enabled, culture_tcc_museum, culture_tcc_monument, culture_tcc_route,
              shopping_enabled, shopping_cashback_percent, shopping_km0_bonus, shopping_market_bonus,
              created_at, updated_at
            ) VALUES (
              ${comuneId},
              ${input.civicEnabled ?? true}, ${input.civicTccDefault ?? 10}, ${input.civicTccUrgent ?? 5}, ${input.civicTccPhotoBonus ?? 5},
              ${input.mobilityEnabled ?? false}, ${input.mobilityTccBus ?? 10}, ${input.mobilityTccBikeKm ?? 3}, ${input.mobilityTccWalkKm ?? 5},
              ${input.cultureEnabled ?? false}, ${input.cultureTccMuseum ?? 100}, ${input.cultureTccMonument ?? 50}, ${input.cultureTccRoute ?? 300},
              ${input.shoppingEnabled ?? false}, ${input.shoppingCashbackPercent ?? 1.00}, ${input.shoppingKm0Bonus ?? 20}, ${input.shoppingMarketBonus ?? 10},
              NOW(), NOW()
            )
          `);
        }
        
        await logAction("UPDATE_GAMING_REWARDS_CONFIG", "gaming_rewards_config", comuneId, null, null, input);
        
        return { success: true, message: "Configurazione Gaming & Rewards salvata" };
      }),

    // GET statistiche TCC per comune (per heatmap)
    getStats: publicProcedure
      .input(z.object({
        comuneId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Statistiche aggregate per comune
        const [stats] = await db.execute(sql`
          SELECT 
            COUNT(CASE WHEN type = 'earn' THEN 1 END) as total_earn_transactions,
            COUNT(CASE WHEN type = 'spend' THEN 1 END) as total_spend_transactions,
            COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0) as total_tcc_earned,
            COALESCE(SUM(CASE WHEN type = 'spend' THEN amount ELSE 0 END), 0) as total_tcc_spent
          FROM transactions
        `);
        
        const row = Array.isArray(stats) ? stats[0] : stats;
        
        return {
          totalEarnTransactions: parseInt(row?.total_earn_transactions || '0'),
          totalSpendTransactions: parseInt(row?.total_spend_transactions || '0'),
          totalTccEarned: parseInt(row?.total_tcc_earned || '0'),
          totalTccSpent: parseInt(row?.total_tcc_spent || '0'),
          co2Saved: Math.round((parseInt(row?.total_tcc_earned || '0') * 0.1) * 10) / 10, // Stima CO2
        };
      }),

    // GET punti heatmap (negozi con TCC)
    getHeatmapPoints: publicProcedure
      .input(z.object({
        comuneId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Recupera hub_shops con coordinate e aggregazione TCC
        let query = sql`
          SELECT 
            hs.id,
            hs.name,
            hs.category,
            hs.latitude,
            hs.longitude,
            hs.address,
            hs.city,
            hl.comune_id,
            COALESCE(SUM(CASE WHEN t.type = 'earn' THEN t.amount ELSE 0 END), 0) as tcc_earned,
            COALESCE(SUM(CASE WHEN t.type = 'spend' THEN t.amount ELSE 0 END), 0) as tcc_spent,
            COUNT(t.id) as transaction_count
          FROM hub_shops hs
          LEFT JOIN hub_locations hl ON hs.hub_location_id = hl.id
          LEFT JOIN transactions t ON t.shop_id = hs.id
          WHERE hs.latitude IS NOT NULL AND hs.longitude IS NOT NULL
        `;
        
        if (input.comuneId) {
          query = sql`${query} AND hl.comune_id = ${input.comuneId}`;
        }
        
        query = sql`${query} GROUP BY hs.id, hs.name, hs.category, hs.latitude, hs.longitude, hs.address, hs.city, hl.comune_id`;
        
        const results = await db.execute(query);
        const rows = Array.isArray(results) ? results : [results];
        
        return rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          lat: parseFloat(row.latitude),
          lng: parseFloat(row.longitude),
          address: row.address,
          city: row.city,
          comuneId: row.comune_id,
          tccEarned: parseInt(row.tcc_earned || '0'),
          tccSpent: parseInt(row.tcc_spent || '0'),
          transactionCount: parseInt(row.transaction_count || '0'),
          intensity: Math.min(100, parseInt(row.tcc_earned || '0') / 10), // Intensità per heatmap
        }));
      }),
  }),
});

export type DmsHubRouter = typeof dmsHubRouter;
