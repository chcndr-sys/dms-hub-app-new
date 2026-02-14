# Database - Schema, Convenzioni e Regole

> Source of truth per lo schema: `drizzle/schema.ts`
> Provider: Neon PostgreSQL (serverless, EU region)
> ORM: Drizzle 0.44 con driver postgres-js

## Connessione

```typescript
// server/db.ts
import postgres from "postgres";       // Driver: postgres-js (NON pg)
import { drizzle } from "drizzle-orm/postgres-js";

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
```

**Neon serverless**: Il compute si spegne dopo 5 minuti di inattivita'.
Il cold start richiede 2-3 secondi. Gestisci i timeout nelle query.

## Convenzioni

### Naming
- **Tabelle**: `snake_case` (es. `market_geometry`, `wallet_transazioni`)
- **Colonne nel DB**: `snake_case` (es. `created_at`, `market_id`)
- **Colonne nel codice TS**: `camelCase` (Drizzle mappa automaticamente)
- **Enum**: `pgEnum` con valori lowercase (es. `["user", "admin"]`)
- **Foreign keys**: `nome_tabella_id` (es. `market_id`, `user_id`)

### Tipi standard
- **ID**: `integer().generatedAlwaysAsIdentity().primaryKey()` (auto-increment)
- **Timestamp**: `timestamp().defaultNow().notNull()` per `created_at`
- **Booleani**: `integer` (0/1) per compatibilita' (es. `active`)
- **JSON**: `text` con parse manuale (es. `details`, `opening_hours`)
- **Coordinate**: `varchar(20)` per lat/lng (precisione)
- **Soldi**: `integer` in centesimi (es. 150 = 1.50 EUR)

### Pattern per nuove tabelle
```typescript
// In drizzle/schema.ts
export const myNewTable = pgTable("my_new_table", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  // ... colonne
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Poi esegui: `pnpm db:push`

### Pattern per query
```typescript
// In server/db.ts o nel router
export async function getMyData() {
  const db = await getDb();
  if (!db) return [];  // Graceful degradation
  return await db.select().from(schema.myNewTable);
}
```

## Tabelle per Dominio

### Autenticazione & Utenti (10 tabelle)
| Tabella | Righe* | Scopo |
|---------|--------|-------|
| `users` | ~50 | Utenti core (openId, email, role) |
| `extended_users` | ~10 | Profilo esteso (wallet, rating) |
| `user_roles` | ~6 | Definizioni ruoli (system, pa, mercato...) |
| `permissions` | ~30 | Permessi granulari (modulo.azione) |
| `role_permissions` | ~50 | Matrice RBAC ruolo-permesso |
| `user_role_assignments` | ~10 | Assegnazione ruoli a utenti |
| `user_sessions` | ~20 | Sessioni attive |
| `login_attempts` | ~100 | Tentativi login |
| `access_logs` | ~500 | Audit accessi |
| `security_events` | ~50 | Eventi sicurezza |

### Mercati & Operazioni (15 tabelle)
| Tabella | Righe* | Scopo |
|---------|--------|-------|
| `markets` | ~60 | Mercati (nome, indirizzo, coordinate) |
| `market_geometry` | ~12 | Geometria GeoJSON per mappa |
| `stalls` | ~900 | Posteggi (numero, area, stato, categoria) |
| `vendors` | ~150 | Operatori ambulanti |
| `concessions` | ~80 | Concessioni (giornaliera/mensile/annuale) |
| `vendor_documents` | ~200 | Documenti operatori |
| `vendor_presences` | ~1000 | Check-in/check-out giornalieri |
| `bookings` | 0 | Prenotazioni posteggio (predisposta) |
| `inspections_detailed` | ~30 | Ispezioni polizia municipale |
| `violations` | ~20 | Sanzioni e verbali |
| `concession_payments` | ~50 | Pagamenti concessioni |
| `custom_markers` | ~30 | POI sulla mappa (ingressi, servizi) |
| `custom_areas` | ~10 | Zone mercato per categoria |
| `autorizzazioni` | ~40 | Licenze commerciali |
| `comuni` | ~50 | Anagrafica comuni |

### Wallet & Pagamenti (6 tabelle)
| Tabella | Righe* | Scopo |
|---------|--------|-------|
| `operatore_wallet` | ~80 | Borsellini operatori (saldo, stato) |
| `wallet_transazioni` | ~500 | Transazioni wallet |
| `wallet_history` | ~500 | Storico transazioni |
| `tariffe_posteggio` | ~20 | Tariffe per tipo posteggio |
| `avvisi_pagopa` | ~30 | Avvisi di pagamento PagoPA |
| `wallet_balance_snapshots` | 0 | Snapshot saldi (predisposta) |

### Hub Locations (3 tabelle)
| Tabella | Righe* | Scopo |
|---------|--------|-------|
| `hub_locations` | ~20 | Hub fisici collegati ai mercati |
| `hub_shops` | ~50 | Negozi dentro gli hub |
| `hub_services` | ~30 | Servizi hub (parcheggio, bike, ricarica) |

### Multi-Agent System (6 tabelle)
| Tabella | Righe* | Scopo |
|---------|--------|-------|
| `agent_tasks` | ~100 | Task engine per agenti AI |
| `agent_projects` | ~10 | Progetti registrati |
| `agent_brain` | ~50 | Memoria agenti (decisioni, learning) |
| `agent_messages` | ~200 | Chat tra agenti |
| `agent_context` | ~50 | Contesto condiviso |
| `data_bag` | ~20 | Storage key-value con TTL |

### Monitoring & Analytics (8 tabelle)
| Tabella | Righe* | Scopo |
|---------|--------|-------|
| `mio_agent_logs` | ~326K | Log azioni agenti AI (PIU' GRANDE) |
| `api_metrics` | ~5K | Metriche performance API |
| `system_logs` | ~2K | Log di sistema applicativo |
| `audit_logs` | ~500 | Audit trail compliance |
| `api_keys` | ~10 | Chiavi API generate |
| `webhooks` | ~5 | Configurazioni webhook |
| `webhook_logs` | ~50 | Log esecuzione webhook |
| `external_connections` | ~5 | Stato servizi esterni |

*Valori approssimativi a Febbraio 2026

## Tabella critica: mio_agent_logs

Questa tabella contiene **326.000+ righe** (88% di tutti i dati del DB).

**Azioni raccomandate**:
1. Implementare retention policy (max 30 giorni)
2. Archiviare log vecchi su S3
3. Aggiungere indice su `timestamp` se non presente
4. Considerare partitioning per data

**Query per pulizia**:
```sql
-- Conta log per eta'
SELECT
  DATE_TRUNC('month', timestamp) as mese,
  COUNT(*) as conteggio
FROM mio_agent_logs
GROUP BY mese
ORDER BY mese DESC;

-- Elimina log piu' vecchi di 30 giorni (con cautela!)
DELETE FROM mio_agent_logs
WHERE timestamp < NOW() - INTERVAL '30 days';
```

## Regole operative

### DA FARE
- Aggiungi tabelle in `drizzle/schema.ts` e usa `pnpm db:push`
- Usa `getDb()` con check `null` in ogni funzione
- Usa tipi Drizzle (`select()`, `insert()`, `where()`)
- Aggiungi `createdAt` e `updatedAt` a ogni nuova tabella
- Usa transazioni per operazioni multi-tabella

### DA NON FARE
- MAI raw SQL in produzione (tranne migrazioni)
- MAI `DROP TABLE` senza backup
- MAI modificare colonne che contengono dati
- MAI `DELETE` massivi senza `WHERE` e `LIMIT`
- MAI aggiungere colonne `NOT NULL` senza default su tabelle con dati
- MAI usare `pg` (node-postgres) - il driver e' `postgres` (postgres-js)
- MAI creare tabelle duplicate (es. `users_backup`, `users_v2`)
- MAI salvare password in chiaro - sempre hash
- MAI salvare JSON complessi in `text` se puoi usare colonne tipizzate

## Migrazioni

### Drizzle migrations (standard)
```bash
pnpm db:push  # Genera + applica in un colpo
```

### Migrazioni SQL manuali (per casi speciali)
Metti in `migrations/` con naming `NNN_descrizione.sql`:
```
migrations/
├── 023_create_wallet_history.sql
├── 024_create_wallet_balance_snapshots.sql
└── ...
```

## Backup e Recovery

### Neon Point-in-Time Recovery
Neon supporta PITR nativamente. Per restore:
1. Vai su Neon Console > Branch > Point-in-time recovery
2. Seleziona il timestamp desiderato
3. Crea un nuovo branch dal punto di recovery

### Tabelle di backup esistenti
Queste tabelle sono backup manuali e possono essere rimosse se il DB e' stabile:
- `*_backup_2025*`
- `*_backup_2026*`
