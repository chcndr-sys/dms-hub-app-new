/**
 * Wallet Router - API per gestione borsellino elettronico operatori mercatali
 * 
 * Funzionalità:
 * - Gestione wallet operatori (CRUD, ricariche, decurtazioni)
 * - Integrazione E-FIL PagoPA per ricariche
 * - Blocco automatico presenze per saldo insufficiente
 * - Riconciliazione contabile
 * - Generazione avvisi e quietanze PDF
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { eq, desc, and, gte, lte, sql, sum, count } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import * as efilService from "./services/efilPagopaService";

// ============================================
// SCHEMA VALIDAZIONE INPUT
// ============================================

const walletIdSchema = z.object({
  walletId: z.number(),
});

const impresaIdSchema = z.object({
  impresaId: z.number(),
});

const ricaricaWalletSchema = z.object({
  walletId: z.number(),
  importoCents: z.number().min(100), // Minimo €1
  metodo: z.enum(["PAGOPA", "BONIFICO", "CONTANTI", "ALTRO"]),
  riferimento: z.string().optional(),
  note: z.string().optional(),
});

const decurtazioneWalletSchema = z.object({
  walletId: z.number(),
  importoCents: z.number().min(1),
  presenzaId: z.number().optional(),
  posteggioId: z.number().optional(),
  mercatoId: z.number().optional(),
  descrizione: z.string(),
});

const generaAvvisoPagopaSchema = z.object({
  walletId: z.number(),
  importoCents: z.number().min(100),
  scadenzaGiorni: z.number().default(30),
});

const verificaPagamentoSchema = z.object({
  iuv: z.string(),
});

const ricercaPagamentiSchema = z.object({
  dataInizio: z.string(),
  dataFine: z.string().optional(),
});

const createWalletSchema = z.object({
  impresaId: z.number(),
  saldoMinimo: z.number().default(0),
});

const updateWalletStatusSchema = z.object({
  walletId: z.number(),
  status: z.enum(["ATTIVO", "BLOCCATO", "SOSPESO"]),
  motivo: z.string().optional(),
});

// ============================================
// ROUTER WALLET
// ============================================

export const walletRouter = router({
  // ============================================
  // STATISTICHE DASHBOARD
  // ============================================
  
  /**
   * Ottieni statistiche generali wallet
   */
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    // Wallet attivi
    const [walletAttivi] = await db
      .select({ count: count() })
      .from(schema.operatoreWallet)
      .where(eq(schema.operatoreWallet.status, "ATTIVO"));

    // Wallet bloccati
    const [walletBloccati] = await db
      .select({ count: count() })
      .from(schema.operatoreWallet)
      .where(eq(schema.operatoreWallet.status, "BLOCCATO"));

    // Saldo totale
    const [saldoTotale] = await db
      .select({ total: sum(schema.operatoreWallet.saldo) })
      .from(schema.operatoreWallet);

    // Wallet con saldo basso (< €50)
    const [saldoBasso] = await db
      .select({ count: count() })
      .from(schema.operatoreWallet)
      .where(
        and(
          eq(schema.operatoreWallet.status, "ATTIVO"),
          lte(schema.operatoreWallet.saldo, 5000) // €50 in centesimi
        )
      );

    // Transazioni oggi
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const [transazioniOggi] = await db
      .select({ count: count() })
      .from(schema.walletTransazioni)
      .where(gte(schema.walletTransazioni.dataOperazione, oggi));

    // Avvisi PagoPA in attesa
    const [avvisiInAttesa] = await db
      .select({ count: count() })
      .from(schema.avvisiPagopa)
      .where(eq(schema.avvisiPagopa.stato, "GENERATO"));

    return {
      walletAttivi: walletAttivi?.count || 0,
      walletBloccati: walletBloccati?.count || 0,
      saldoTotaleCents: Number(saldoTotale?.total) || 0,
      walletSaldoBasso: saldoBasso?.count || 0,
      transazioniOggi: transazioniOggi?.count || 0,
      avvisiInAttesa: avvisiInAttesa?.count || 0,
    };
  }),

  // ============================================
  // LISTA E DETTAGLIO WALLET
  // ============================================

  /**
   * Lista tutti i wallet con dati impresa
   */
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const wallets = await db
      .select()
      .from(schema.operatoreWallet)
      .orderBy(desc(schema.operatoreWallet.updatedAt));

    // Per ogni wallet, recupera i dati reali dell'impresa da vendors
    const results = await Promise.all(
      wallets.map(async (w) => {
        const [vendor] = await db
          .select()
          .from(schema.vendors)
          .where(eq(schema.vendors.id, w.impresaId))
          .limit(1);
        return {
          ...w,
          impresa: vendor
            ? {
                id: vendor.id,
                ragioneSociale: vendor.businessName || `${vendor.firstName} ${vendor.lastName}`,
                partitaIva: vendor.vatNumber || "",
              }
            : {
                id: w.impresaId,
                ragioneSociale: `Impresa ${w.impresaId}`,
                partitaIva: "",
              },
        };
      })
    );
    return results;
  }),

  /**
   * Dettaglio singolo wallet
   */
  getById: protectedProcedure.input(walletIdSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const [wallet] = await db
      .select()
      .from(schema.operatoreWallet)
      .where(eq(schema.operatoreWallet.id, input.walletId));

    if (!wallet) return null;

    // Ultime transazioni
    const transazioni = await db
      .select()
      .from(schema.walletTransazioni)
      .where(eq(schema.walletTransazioni.walletId, input.walletId))
      .orderBy(desc(schema.walletTransazioni.dataOperazione))
      .limit(20);

    // Avvisi PagoPA
    const avvisi = await db
      .select()
      .from(schema.avvisiPagopa)
      .where(eq(schema.avvisiPagopa.walletId, input.walletId))
      .orderBy(desc(schema.avvisiPagopa.dataGenerazione))
      .limit(10);

    return {
      ...wallet,
      transazioni,
      avvisi,
      impresa: {
        id: wallet.impresaId,
        ragioneSociale: `Impresa ${wallet.impresaId}`,
        partitaIva: `IT${wallet.impresaId.toString().padStart(11, "0")}`,
      },
    };
  }),

  /**
   * Ottieni wallet per impresa
   */
  getByImpresa: protectedProcedure.input(impresaIdSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const [wallet] = await db
      .select()
      .from(schema.operatoreWallet)
      .where(eq(schema.operatoreWallet.impresaId, input.impresaId));

    return wallet || null;
  }),

  // ============================================
  // CREAZIONE E GESTIONE WALLET
  // ============================================

  /**
   * Crea nuovo wallet per impresa
   */
  create: adminProcedure.input(createWalletSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database non disponibile");

    // Verifica se esiste già un wallet per questa impresa
    const [existing] = await db
      .select()
      .from(schema.operatoreWallet)
      .where(eq(schema.operatoreWallet.impresaId, input.impresaId));

    if (existing) {
      throw new Error("Esiste già un wallet per questa impresa");
    }

    const [newWallet] = await db
      .insert(schema.operatoreWallet)
      .values({
        impresaId: input.impresaId,
        saldo: 0,
        saldoMinimo: input.saldoMinimo,
        status: "ATTIVO",
        totaleRicaricato: 0,
        totaleDecurtato: 0,
      })
      .returning();

    return newWallet;
  }),

  /**
   * Aggiorna stato wallet (blocca/sblocca)
   */
  updateStatus: adminProcedure
    .input(updateWalletStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      // Ottieni stato precedente per audit
      const [current] = await db
        .select()
        .from(schema.operatoreWallet)
        .where(eq(schema.operatoreWallet.id, input.walletId));

      const [updated] = await db
        .update(schema.operatoreWallet)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(schema.operatoreWallet.id, input.walletId))
        .returning();

      // Log strutturato in audit_logs
      await db.insert(schema.auditLogs).values({
        userEmail: ctx.user?.email || "admin",
        action: "WALLET_STATUS_CHANGED",
        entityType: "operatore_wallet",
        entityId: input.walletId,
        oldValue: JSON.stringify({ status: current?.status }),
        newValue: JSON.stringify({ status: input.status, motivo: input.motivo }),
      });

      return updated;
    }),

  // ============================================
  // TRANSAZIONI WALLET
  // ============================================

  /**
   * Lista transazioni wallet
   */
  transazioni: protectedProcedure.input(walletIdSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(schema.walletTransazioni)
      .where(eq(schema.walletTransazioni.walletId, input.walletId))
      .orderBy(desc(schema.walletTransazioni.dataOperazione));
  }),

  /**
   * Effettua ricarica wallet (manuale o da callback PagoPA)
   */
  ricarica: protectedProcedure.input(ricaricaWalletSchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database non disponibile");

    // Ottieni wallet corrente
    const [wallet] = await db
      .select()
      .from(schema.operatoreWallet)
      .where(eq(schema.operatoreWallet.id, input.walletId));

    if (!wallet) throw new Error("Wallet non trovato");

    // Verifica che il wallet non sia sospeso
    if (wallet.status === "SOSPESO") {
      throw new Error("Wallet sospeso - operazione non consentita");
    }

    const saldoPrecedente = wallet.saldo;
    const saldoSuccessivo = saldoPrecedente + input.importoCents;

    // Inserisci transazione
    const [transazione] = await db
      .insert(schema.walletTransazioni)
      .values({
        walletId: input.walletId,
        tipo: "RICARICA",
        importo: input.importoCents,
        saldoPrecedente,
        saldoSuccessivo,
        riferimento: input.riferimento,
        descrizione: input.note || `Ricarica ${input.metodo}`,
        operatoreId: ctx.user?.email || "SYSTEM",
      })
      .returning();

    // Aggiorna saldo wallet
    await db
      .update(schema.operatoreWallet)
      .set({
        saldo: saldoSuccessivo,
        totaleRicaricato: wallet.totaleRicaricato + input.importoCents,
        ultimaRicarica: new Date(),
        updatedAt: new Date(),
        // Se era bloccato e ora ha saldo sufficiente, riattiva
        status:
          wallet.status === "BLOCCATO" && saldoSuccessivo > wallet.saldoMinimo
            ? "ATTIVO"
            : wallet.status,
      })
      .where(eq(schema.operatoreWallet.id, input.walletId));

    return transazione;
  }),

  /**
   * Effettua decurtazione wallet (per presenza mercato)
   */
  decurtazione: protectedProcedure
    .input(decurtazioneWalletSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      // Ottieni wallet corrente
      const [wallet] = await db
        .select()
        .from(schema.operatoreWallet)
        .where(eq(schema.operatoreWallet.id, input.walletId));

      if (!wallet) throw new Error("Wallet non trovato");
      if (wallet.status === "BLOCCATO") throw new Error("Wallet bloccato");
      if (wallet.status === "SOSPESO") throw new Error("Wallet sospeso - operazione non consentita");

      const saldoPrecedente = wallet.saldo;
      const saldoSuccessivo = saldoPrecedente - input.importoCents;

      // Verifica saldo sufficiente
      if (saldoSuccessivo < 0) {
        throw new Error("Saldo insufficiente");
      }

      // Inserisci transazione
      const [transazione] = await db
        .insert(schema.walletTransazioni)
        .values({
          walletId: input.walletId,
          tipo: "DECURTAZIONE",
          importo: -input.importoCents, // Negativo per decurtazione
          saldoPrecedente,
          saldoSuccessivo,
          presenzaId: input.presenzaId,
          posteggioId: input.posteggioId,
          mercatoId: input.mercatoId,
          descrizione: input.descrizione,
          operatoreId: ctx.user?.email || "SYSTEM",
        })
        .returning();

      // Aggiorna saldo wallet
      const nuovoStatus =
        saldoSuccessivo <= wallet.saldoMinimo ? "BLOCCATO" : wallet.status;

      await db
        .update(schema.operatoreWallet)
        .set({
          saldo: saldoSuccessivo,
          totaleDecurtato: wallet.totaleDecurtato + input.importoCents,
          ultimaDecurtazione: new Date(),
          updatedAt: new Date(),
          status: nuovoStatus,
        })
        .where(eq(schema.operatoreWallet.id, input.walletId));

      // Se wallet bloccato, log strutturato in audit_logs
      if (nuovoStatus === "BLOCCATO") {
        await db.insert(schema.auditLogs).values({
          userEmail: ctx.user?.email || "SYSTEM",
          action: "WALLET_AUTO_BLOCKED",
          entityType: "operatore_wallet",
          entityId: input.walletId,
          newValue: JSON.stringify({
            saldoSuccessivo,
            saldoMinimo: wallet.saldoMinimo,
            importoDecurtazione: input.importoCents,
          }),
        });
      }

      return transazione;
    }),

  // ============================================
  // INTEGRAZIONE PAGOPA / E-FIL
  // ============================================

  /**
   * Genera avviso PagoPA per ricarica wallet
   */
  generaAvvisoPagopa: protectedProcedure
    .input(generaAvvisoPagopaSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      // Ottieni wallet e dati impresa
      const [wallet] = await db
        .select()
        .from(schema.operatoreWallet)
        .where(eq(schema.operatoreWallet.id, input.walletId));

      if (!wallet) throw new Error("Wallet non trovato");

      // Recupera dati reali impresa da tabella vendors
      const [vendor] = await db
        .select()
        .from(schema.vendors)
        .where(eq(schema.vendors.id, wallet.impresaId))
        .limit(1);

      const impresaData = vendor
        ? {
            id: vendor.id,
            ragioneSociale: vendor.businessName || `${vendor.firstName} ${vendor.lastName}`,
            partitaIva: vendor.vatNumber || "",
            email: vendor.email || "",
          }
        : {
            id: wallet.impresaId,
            ragioneSociale: `Impresa ${wallet.impresaId}`,
            partitaIva: "",
            email: "",
          };

      // Genera avviso tramite E-FIL
      const result = await efilService.generaAvvisoRicaricaWallet({
        impresaId: wallet.impresaId,
        ragioneSociale: impresaData.ragioneSociale,
        partitaIva: impresaData.partitaIva,
        email: impresaData.email,
        importoCents: input.importoCents,
        scadenzaGiorni: input.scadenzaGiorni,
      });

      if (!result.success || !result.iuv) {
        throw new Error(result.error || "Errore generazione avviso PagoPA");
      }

      // Calcola data scadenza
      const dataScadenza = new Date();
      dataScadenza.setDate(dataScadenza.getDate() + input.scadenzaGiorni);

      // Salva avviso nel database
      const [avviso] = await db
        .insert(schema.avvisiPagopa)
        .values({
          walletId: input.walletId,
          impresaId: wallet.impresaId,
          iuv: result.iuv,
          importo: input.importoCents,
          causale: `Ricarica Wallet Operatore Mercatale - ${impresaData.ragioneSociale}`,
          stato: "GENERATO",
          dataScadenza,
        })
        .returning();

      return {
        success: true,
        avviso,
        iuv: result.iuv,
        codiceAvviso: result.codiceAvviso,
      };
    }),

  /**
   * Avvia pagamento immediato PagoPA (redirect a checkout)
   */
  avviaPagamentoPagopa: protectedProcedure
    .input(generaAvvisoPagopaSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      // Ottieni wallet e dati impresa
      const [wallet] = await db
        .select()
        .from(schema.operatoreWallet)
        .where(eq(schema.operatoreWallet.id, input.walletId));

      if (!wallet) throw new Error("Wallet non trovato");

      const impresaData = {
        id: wallet.impresaId,
        ragioneSociale: `Impresa ${wallet.impresaId}`,
        partitaIva: `IT${wallet.impresaId.toString().padStart(11, "0")}`,
        email: `impresa${wallet.impresaId}@example.com`,
      };

      // Avvia pagamento tramite E-FIL
      const result = await efilService.avviaPagamento({
        idGestionale: `WALLET-${wallet.impresaId}-${Date.now()}`,
        amountCents: input.importoCents,
        currency: "EUR",
        causale: `Ricarica Wallet Operatore Mercatale - ${impresaData.ragioneSociale}`,
        debtor: {
          vatNumber: impresaData.partitaIva,
          fullName: impresaData.ragioneSociale,
          email: impresaData.email,
        },
        returnUrl: `${process.env.DMS_BACKOFFICE_BASEURL || "https://miohub.app"}/payments/return`,
        callbackUrl: `${process.env.DMS_BACKOFFICE_BASEURL || "https://miohub.app"}/api/wallet/callback`,
        metadata: {
          walletId: input.walletId.toString(),
          impresaId: wallet.impresaId.toString(),
        },
      });

      if (result.esito !== "OK" || !result.iuv) {
        throw new Error(result.message || "Errore avvio pagamento PagoPA");
      }

      // Salva avviso nel database
      const dataScadenza = new Date();
      dataScadenza.setDate(dataScadenza.getDate() + 1); // Scadenza 1 giorno per pagamento immediato

      await db.insert(schema.avvisiPagopa).values({
        walletId: input.walletId,
        impresaId: wallet.impresaId,
        iuv: result.iuv,
        importo: input.importoCents,
        causale: `Ricarica Wallet - ${impresaData.ragioneSociale}`,
        stato: "GENERATO",
        dataScadenza,
      });

      return {
        success: true,
        iuv: result.iuv,
        transactionId: result.transactionId,
        redirectUrl: result.redirectUrl,
      };
    }),

  /**
   * Verifica stato pagamento PagoPA
   */
  verificaPagamento: protectedProcedure
    .input(verificaPagamentoSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      // Verifica stato tramite E-FIL
      const result = await efilService.statoPerIuv({ iuv: input.iuv });

      // Aggiorna stato avviso nel database se pagato
      if (result.stato === "PAGATA") {
        const [avviso] = await db
          .select()
          .from(schema.avvisiPagopa)
          .where(eq(schema.avvisiPagopa.iuv, input.iuv));

        if (avviso && avviso.stato !== "PAGATO") {
          // Aggiorna avviso
          await db
            .update(schema.avvisiPagopa)
            .set({
              stato: "PAGATO",
              dataPagamento: result.paidAtISO
                ? new Date(result.paidAtISO)
                : new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.avvisiPagopa.iuv, input.iuv));

          // Accredita wallet
          const [wallet] = await db
            .select()
            .from(schema.operatoreWallet)
            .where(eq(schema.operatoreWallet.id, avviso.walletId));

          if (wallet) {
            const saldoPrecedente = wallet.saldo;
            const saldoSuccessivo = saldoPrecedente + avviso.importo;

            // Inserisci transazione ricarica
            await db.insert(schema.walletTransazioni).values({
              walletId: avviso.walletId,
              tipo: "RICARICA",
              importo: avviso.importo,
              saldoPrecedente,
              saldoSuccessivo,
              iuvPagopa: input.iuv,
              descrizione: `Ricarica PagoPA - IUV: ${input.iuv}`,
              operatoreId: "PAGOPA",
            });

            // Aggiorna saldo
            await db
              .update(schema.operatoreWallet)
              .set({
                saldo: saldoSuccessivo,
                totaleRicaricato: wallet.totaleRicaricato + avviso.importo,
                ultimaRicarica: new Date(),
                updatedAt: new Date(),
                status:
                  wallet.status === "BLOCCATO" &&
                  saldoSuccessivo > wallet.saldoMinimo
                    ? "ATTIVO"
                    : wallet.status,
              })
              .where(eq(schema.operatoreWallet.id, avviso.walletId));

            // Log strutturato ricarica PagoPA
            await db.insert(schema.auditLogs).values({
              userEmail: "PAGOPA",
              action: "WALLET_PAGOPA_RECHARGE",
              entityType: "operatore_wallet",
              entityId: avviso.walletId,
              newValue: JSON.stringify({
                importoCents: avviso.importo,
                iuv: input.iuv,
                saldoPrecedente,
                saldoSuccessivo,
              }),
            });
          }
        }
      }

      return result;
    }),

  /**
   * Genera PDF avviso PagoPA
   */
  generaPdfAvviso: protectedProcedure
    .input(verificaPagamentoSchema)
    .query(async ({ input }) => {
      const result = await efilService.generaPdf({
        iuv: input.iuv,
        type: "AVVISO",
      });

      return result;
    }),

  /**
   * Genera PDF quietanza pagamento
   */
  generaPdfQuietanza: protectedProcedure
    .input(verificaPagamentoSchema)
    .query(async ({ input }) => {
      const result = await efilService.generaPdf({
        iuv: input.iuv,
        type: "QUIETANZA",
      });

      return result;
    }),

  /**
   * Lista avvisi PagoPA
   */
  avvisiPagopa: protectedProcedure.input(walletIdSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(schema.avvisiPagopa)
      .where(eq(schema.avvisiPagopa.walletId, input.walletId))
      .orderBy(desc(schema.avvisiPagopa.dataGenerazione));
  }),

  // ============================================
  // TARIFFE E CONFIGURAZIONE
  // ============================================

  /**
   * Lista tariffe posteggio per mercato
   */
  tariffe: protectedProcedure
    .input(z.object({ mercatoId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input.mercatoId) {
        return await db
          .select()
          .from(schema.tariffePosteggio)
          .where(eq(schema.tariffePosteggio.mercatoId, input.mercatoId));
      }

      return await db.select().from(schema.tariffePosteggio);
    }),

  /**
   * Crea/aggiorna tariffa posteggio
   */
  upsertTariffa: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        mercatoId: z.number(),
        tipoPosteggio: z.string(),
        tariffaGiornaliera: z.number(),
        tariffaSettimanale: z.number().optional(),
        tariffaMensile: z.number().optional(),
        tariffaAnnuale: z.number().optional(),
        descrizione: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database non disponibile");

      if (input.id) {
        // Update
        const [updated] = await db
          .update(schema.tariffePosteggio)
          .set({
            mercatoId: input.mercatoId,
            tipoPosteggio: input.tipoPosteggio,
            tariffaGiornaliera: input.tariffaGiornaliera,
            tariffaSettimanale: input.tariffaSettimanale,
            tariffaMensile: input.tariffaMensile,
            tariffaAnnuale: input.tariffaAnnuale,
            descrizione: input.descrizione,
            updatedAt: new Date(),
          })
          .where(eq(schema.tariffePosteggio.id, input.id))
          .returning();
        return updated;
      } else {
        // Insert
        const [created] = await db
          .insert(schema.tariffePosteggio)
          .values({
            mercatoId: input.mercatoId,
            tipoPosteggio: input.tipoPosteggio,
            tariffaGiornaliera: input.tariffaGiornaliera,
            tariffaSettimanale: input.tariffaSettimanale,
            tariffaMensile: input.tariffaMensile,
            tariffaAnnuale: input.tariffaAnnuale,
            descrizione: input.descrizione,
          })
          .returning();
        return created;
      }
    }),

  // ============================================
  // RICONCILIAZIONE E REPORT
  // ============================================

  /**
   * Ricerca pagamenti giornalieri per riconciliazione
   */
  ricercaPagamentiGiornalieri: adminProcedure
    .input(ricercaPagamentiSchema)
    .query(async ({ input }) => {
      const result = await efilService.ricercaPagamentiGiornalieri({
        dateISO: input.dataInizio,
      });

      return result;
    }),

  /**
   * Report movimenti wallet per periodo
   */
  reportMovimenti: protectedProcedure
    .input(
      z.object({
        walletId: z.number().optional(),
        dataInizio: z.string(),
        dataFine: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { transazioni: [], totali: null };

      const dataInizio = new Date(input.dataInizio);
      const dataFine = new Date(input.dataFine);
      dataFine.setHours(23, 59, 59, 999);

      const conditions = [
        gte(schema.walletTransazioni.dataOperazione, dataInizio),
        lte(schema.walletTransazioni.dataOperazione, dataFine)
      ];

      if (input.walletId) {
        conditions.push(eq(schema.walletTransazioni.walletId, input.walletId));
      }

      const transazioni = await db
        .select()
        .from(schema.walletTransazioni)
        .where(and(...conditions))
        .orderBy(
        desc(schema.walletTransazioni.dataOperazione)
      );

      // Calcola totali
      const totali = transazioni.reduce(
        (acc, t) => {
          if (t.tipo === "RICARICA") {
            acc.totaleRicariche += t.importo;
            acc.numeroRicariche++;
          } else if (t.tipo === "DECURTAZIONE") {
            acc.totaleDecurtazioni += Math.abs(t.importo);
            acc.numeroDecurtazioni++;
          }
          return acc;
        },
        {
          totaleRicariche: 0,
          totaleDecurtazioni: 0,
          numeroRicariche: 0,
          numeroDecurtazioni: 0,
        }
      );

      return { transazioni, totali };
    }),

  // ============================================
  // VERIFICA SALDO PER PRESENZA
  // ============================================

  /**
   * Verifica se operatore può fare presenza (saldo sufficiente)
   */
  verificaSaldoPresenza: protectedProcedure
    .input(
      z.object({
        impresaId: z.number(),
        mercatoId: z.number(),
        tipoPosteggio: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { canAttend: false, reason: "Database non disponibile" };

      // Ottieni wallet impresa
      const [wallet] = await db
        .select()
        .from(schema.operatoreWallet)
        .where(eq(schema.operatoreWallet.impresaId, input.impresaId));

      if (!wallet) {
        return { canAttend: false, reason: "Wallet non trovato" };
      }

      if (wallet.status === "BLOCCATO") {
        return { canAttend: false, reason: "Wallet bloccato" };
      }

      if (wallet.status === "SOSPESO") {
        return { canAttend: false, reason: "Wallet sospeso" };
      }

      // Ottieni tariffa posteggio
      const [tariffa] = await db
        .select()
        .from(schema.tariffePosteggio)
        .where(
          and(
            eq(schema.tariffePosteggio.mercatoId, input.mercatoId),
            eq(schema.tariffePosteggio.tipoPosteggio, input.tipoPosteggio)
          )
        );

      const importoRichiesto = tariffa?.tariffaGiornaliera || 0;

      if (wallet.saldo < importoRichiesto) {
        return {
          canAttend: false,
          reason: `Saldo insufficiente. Richiesto: €${(importoRichiesto / 100).toFixed(2)}, Disponibile: €${(wallet.saldo / 100).toFixed(2)}`,
          saldoAttuale: wallet.saldo,
          importoRichiesto,
        };
      }

      return {
        canAttend: true,
        saldoAttuale: wallet.saldo,
        importoRichiesto,
        saldoResiduo: wallet.saldo - importoRichiesto,
      };
    }),
});

export type WalletRouter = typeof walletRouter;
