# API - Registro Endpoint e Convenzioni

> Tutti gli endpoint passano per tRPC su `/api/trpc/{router.procedure}`
> Transformer: superjson (gestisce Date, BigInt, etc.)
> Auth: Cookie JWT (`session`)

## Formato URL

```
# Query (GET)
GET /api/trpc/analytics.overview

# Mutation (POST)
POST /api/trpc/dmsHub.markets.create
Content-Type: application/json
Body: { "json": { "name": "Mercato Centrale", "city": "Bologna" } }

# Batch (multiple queries in una request)
GET /api/trpc/analytics.overview,analytics.markets,analytics.shops
```

## Livelli di accesso

| Tipo | Chi puo' usarli | Come definirli |
|------|-----------------|----------------|
| `publicProcedure` | Chiunque | Default, nessun middleware |
| `protectedProcedure` | Utenti autenticati | Richiede `ctx.user` non null |
| `adminProcedure` | Solo admin | Richiede `ctx.user.role === 'admin'` |

## Endpoint per Router

### auth.*
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `auth.me` | query | public | Ritorna l'utente corrente (o null) |
| `auth.logout` | mutation | public | Cancella il cookie di sessione |

### analytics.*
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `analytics.overview` | query | public | Statistiche globali (utenti, mercati, transazioni) |
| `analytics.markets` | query | public | Lista mercati attivi |
| `analytics.shops` | query | public | Lista negozi |
| `analytics.transactions` | query | public | Ultime 100 transazioni |
| `analytics.checkins` | query | public | Ultimi 100 check-in |
| `analytics.products` | query | public | Lista prodotti |
| `analytics.productTracking` | query | public | Tracciamento prodotti |

### dmsHub.* (Gestione Mercati)
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `dmsHub.markets.list` | query | public | Lista tutti i mercati |
| `dmsHub.markets.create` | mutation | protected | Crea nuovo mercato |
| `dmsHub.markets.update` | mutation | protected | Aggiorna mercato |
| `dmsHub.markets.importAuto` | mutation | protected | Import da Slot Editor v3 |
| `dmsHub.stalls.list` | query | public | Lista posteggi di un mercato |
| `dmsHub.stalls.create` | mutation | protected | Crea nuovo posteggio |
| `dmsHub.stalls.updateStatus` | mutation | protected | Cambia stato posteggio |
| `dmsHub.vendors.list` | query | public | Lista operatori |
| `dmsHub.vendors.register` | mutation | protected | Registra operatore |
| `dmsHub.vendors.updateDocuments` | mutation | protected | Aggiorna documenti |
| `dmsHub.concessions.list` | query | public | Lista concessioni |
| `dmsHub.concessions.create` | mutation | protected | Nuova concessione |
| `dmsHub.concessions.renew` | mutation | protected | Rinnova concessione |
| `dmsHub.presences.checkin` | mutation | protected | Registra presenza |
| `dmsHub.presences.checkout` | mutation | protected | Registra uscita |
| `dmsHub.inspections.create` | mutation | protected | Nuova ispezione |
| `dmsHub.violations.create` | mutation | protected | Registra violazione |

### wallet.* (Borsellino Elettronico)
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `wallet.stats` | query | public | Statistiche wallet globali |
| `wallet.list` | query | public | Lista wallet attivi |
| `wallet.getById` | query | public | Dettaglio wallet per ID |
| `wallet.create` | mutation | protected | Crea wallet operatore |
| `wallet.ricarica` | mutation | protected | Ricarica manuale wallet |
| `wallet.ricaricaPagoPA` | mutation | protected | Ricarica via PagoPA |
| `wallet.decurtazione` | mutation | protected | Addebita tariffa posteggio |
| `wallet.generaAvviso` | mutation | protected | Genera avviso PagoPA |
| `wallet.verificaPagamento` | query | public | Verifica stato pagamento |
| `wallet.reconciliation` | query | admin | Riconciliazione contabile |

### integrations.* (API Keys & Monitoring)
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `integrations.apiKeys.list` | query | admin | Lista API keys |
| `integrations.apiKeys.create` | mutation | admin | Genera nuova API key |
| `integrations.apiKeys.regenerate` | mutation | admin | Ruota API key |
| `integrations.apiKeys.delete` | mutation | admin | Revoca API key |
| `integrations.apiStats.daily` | query | admin | Statistiche giornaliere |
| `integrations.apiStats.byEndpoint` | query | admin | Stats per endpoint |
| `integrations.webhooks.list` | query | admin | Lista webhook |
| `integrations.webhooks.create` | mutation | admin | Configura webhook |
| `integrations.webhooks.test` | mutation | admin | Testa webhook |
| `integrations.health` | query | public | Health check servizi esterni |

### mihub.* (Multi-Agent System)
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `mihub.tasks.create` | mutation | protected | Crea task per agente |
| `mihub.tasks.list` | query | public | Lista task (filter: agente/status) |
| `mihub.tasks.update` | mutation | protected | Aggiorna stato task |
| `mihub.projects.list` | query | public | Lista progetti |
| `mihub.messages.send` | mutation | protected | Invia messaggio ad agente |
| `mihub.messages.list` | query | public | Lista messaggi conversazione |
| `mihub.brain.save` | mutation | protected | Salva memoria agente |
| `mihub.brain.query` | query | public | Query memoria agente |
| `mihub.context.set` | mutation | protected | Imposta contesto condiviso |

### mioAgent.*
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `mioAgent.getLogs` | query | public | Lista log agenti AI |
| `mioAgent.createLog` | mutation | public | Inserisci log |
| `mioAgent.getLogById` | query | public | Log per ID |
| `mioAgent.testDatabase` | query | public | Test connessione DB |
| `mioAgent.initSchema` | mutation | public | Crea tabella log se assente |

### guardian.*
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `guardian.integrations` | query | public | Inventario completo API |
| `guardian.logs` | query | public | Log real-time centralizzati |
| `guardian.debug` | query | public | Proxy test endpoint |

### tper.*
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `tper.stops` | query | public | Lista fermate TPER Bologna |
| `tper.sync` | mutation | public | Sincronizza dati TPER nel DB |

### Routers minori
| Endpoint | Tipo | Auth | Descrizione |
|----------|------|------|-------------|
| `carbonCredits.config` | query | public | Config crediti carbonio |
| `carbonCredits.fundTransactions` | query | public | Transazioni fondo |
| `carbonCredits.reimbursements` | query | public | Rimborsi negozi |
| `logs.system` | query | public | Log di sistema |
| `users.analytics` | query | public | Analytics utenti |
| `sustainability.metrics` | query | public | Metriche sostenibilita' |
| `businesses.list` | query | public | Analytics business |
| `inspections.list` | query | public | Lista ispezioni |
| `notifications.list` | query | public | Lista notifiche |
| `civicReports.list` | query | public | Segnalazioni civiche |
| `mobility.list` | query | public | Dati mobilita' |

## Convenzioni per nuovi endpoint

### Naming
```typescript
// Pattern: router.entita.azione
dmsHub.markets.list        // GET lista
dmsHub.markets.getById     // GET singolo
dmsHub.markets.create      // POST crea
dmsHub.markets.update      // POST aggiorna
dmsHub.markets.delete      // POST elimina
```

### Input validation
```typescript
// Usa SEMPRE Zod per validazione input
import { z } from "zod";

export const myProcedure = protectedProcedure
  .input(z.object({
    marketId: z.number(),
    name: z.string().min(1).max(255),
    active: z.boolean().optional().default(true),
  }))
  .mutation(async ({ input, ctx }) => {
    // input e' tipizzato e validato
  });
```

### Response format
```typescript
// Successo
return { success: true, data: risultato };

// Errore
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Mercato non trovato",
});

// Lista
return risultati;  // Array diretto
```

### Error codes tRPC standard
| Code | HTTP | Quando usarlo |
|------|------|--------------|
| `BAD_REQUEST` | 400 | Input non valido |
| `UNAUTHORIZED` | 401 | Non autenticato |
| `FORBIDDEN` | 403 | Non autorizzato (RBAC) |
| `NOT_FOUND` | 404 | Risorsa non trovata |
| `CONFLICT` | 409 | Duplicato o conflitto |
| `INTERNAL_SERVER_ERROR` | 500 | Errore interno |

## Endpoint REST legacy

Questi endpoint NON passano per tRPC (sono Express diretti):

| Path | Metodo | Scopo |
|------|--------|-------|
| `/api/oauth/callback` | GET | OAuth callback handler |
| `/api/auth/firebase/verify` | POST | Verifica token Firebase |
| `/api/auth/firebase/sync` | POST | Sync utente Firebase |
| `/api/import-from-slot-editor` | POST | Import GeoJSON Slot Editor |

**Regola**: NON aggiungere altri endpoint REST. Usa sempre tRPC.
