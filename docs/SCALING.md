# Scaling Strategy - Da 60 a 8.000 Mercati

> Piano architetturale per scalare DMS Hub da ~60 mercati attuali a 8.000.
> Obiettivo: mantenere prestazioni sotto 200ms per ogni query.

## Stato attuale (Febbraio 2026)

| Metrica | Valore attuale |
|---------|---------------|
| Mercati | ~60 |
| Posteggi | ~900 |
| Operatori | ~150 |
| Concessioni | ~80 |
| Presenze/giorno | ~100 |
| Righe totali DB | ~370K (88% sono log) |
| Utenti | ~50 |

## Proiezione a 8.000 mercati

| Metrica | Proiezione |
|---------|-----------|
| Mercati | 8.000 |
| Posteggi | 8.000 x 15 media = **120.000** |
| Operatori | ~**40.000** |
| Concessioni | ~**100.000** |
| Presenze/giorno | 8.000 x 10 media = **80.000/giorno** |
| Presenze/anno | **~24 milioni** |
| Utenti (PA + operatori) | **~50.000** |

## Piano in 4 fasi

### Fase 1: Ottimizzazione DB (0-500 mercati)
**Costo: 0 EUR - solo ottimizzazione codice**

1. **Indici mancanti** - Aggiungere indici sulle colonne usate nei WHERE/JOIN
```sql
-- Posteggi per mercato
CREATE INDEX idx_stalls_market_id ON stalls(market_id);
CREATE INDEX idx_stalls_status ON stalls(status);

-- Concessioni per operatore e mercato
CREATE INDEX idx_concessions_vendor_id ON concessions(vendor_id);
CREATE INDEX idx_concessions_market_id ON concessions(market_id);

-- Presenze per data e mercato
CREATE INDEX idx_vendor_presences_market_date ON vendor_presences(market_id, date);
CREATE INDEX idx_vendor_presences_vendor_id ON vendor_presences(vendor_id);

-- Log per timestamp (critico per 326K+ righe)
CREATE INDEX idx_mio_agent_logs_timestamp ON mio_agent_logs(timestamp DESC);
```

2. **Paginazione** - Tutte le query di lista DEVONO avere LIMIT e OFFSET
```typescript
// SBAGLIATO
const stalls = await db.select().from(schema.stalls);

// CORRETTO
const stalls = await db.select().from(schema.stalls)
  .where(eq(schema.stalls.marketId, marketId))
  .limit(50)
  .offset(page * 50);
```

3. **Retention policy per log**
```sql
-- Mantieni solo 30 giorni di log agenti
DELETE FROM mio_agent_logs WHERE timestamp < NOW() - INTERVAL '30 days';

-- Mantieni solo 90 giorni di api_metrics
DELETE FROM api_metrics WHERE created_at < NOW() - INTERVAL '90 days';
```

4. **Query optimization** - Evitare N+1 queries
```typescript
// SBAGLIATO (N+1)
for (const market of markets) {
  const stalls = await db.select().from(schema.stalls)
    .where(eq(schema.stalls.marketId, market.id));
}

// CORRETTO (single query)
const stalls = await db.select().from(schema.stalls)
  .where(inArray(schema.stalls.marketId, marketIds));
```

### Fase 2: Architettura Multi-Tenant (500-2.000 mercati)
**Costo: ~50 EUR/mese**

1. **Neon upgrade** - Da free tier a Pro
   - Connection pooling via PgBouncer
   - Compute always-on (no cold start)
   - Auto-scaling compute
   - Branching per dev/staging

2. **Row-Level Security** per isolamento dati
```sql
-- Ogni utente vede solo i dati del suo territorio
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY markets_territory ON markets
  USING (city IN (SELECT city FROM user_territories WHERE user_id = current_setting('app.user_id')::int));
```

3. **Caching layer** con React Query
```typescript
// Frontend: cache 5 minuti per dati che cambiano poco
const { data: markets } = trpc.analytics.markets.useQuery(undefined, {
  staleTime: 5 * 60 * 1000,  // 5 minuti
  cacheTime: 10 * 60 * 1000, // 10 minuti
});
```

4. **Schema per territorio**
- Aggiungere `region_id` e `province_id` a `markets`
- Creare tabella `territories` per gerarchia nazionale
- Filtrare sempre per territorio dell'utente

### Fase 3: Performance & Monitoring (2.000-5.000 mercati)
**Costo: ~200 EUR/mese**

1. **Read replicas** - Neon supporta read replicas per query analytics
   - Scrive su primary
   - Legge da replica per dashboard/report
   - Zero config change nel codice

2. **Background jobs** per operazioni pesanti
```typescript
// Presenze giornaliere: batch processing
// Invece di 80.000 insert singoli, batch da 1.000
const BATCH_SIZE = 1000;
for (let i = 0; i < presences.length; i += BATCH_SIZE) {
  const batch = presences.slice(i, i + BATCH_SIZE);
  await db.insert(schema.vendorPresences).values(batch);
}
```

3. **Partitioning** per tabelle grandi
```sql
-- Partiziona vendor_presences per mese
CREATE TABLE vendor_presences (
  -- ... colonne ...
) PARTITION BY RANGE (date);

CREATE TABLE vendor_presences_2026_01 PARTITION OF vendor_presences
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

4. **CDN per assets statici** - Vercel gia' lo fa per il frontend
   - Aggiungere S3 + CloudFront per documenti operatori
   - Foto ispezioni su S3
   - PDF PagoPA su S3

### Fase 4: Enterprise Scale (5.000-8.000 mercati)
**Costo: ~500 EUR/mese**

1. **Backend horizontal scaling**
   - Containerizzare con Docker
   - Deploy su Hetzner Cloud (2-4 istanze)
   - Load balancer davanti alle istanze
   - Session affinity per cookie JWT

2. **Database sharding** (se necessario)
   - Shard per regione (20 regioni italiane)
   - Ogni regione ha il suo branch Neon
   - Router che indirizza al branch corretto

3. **Event-driven architecture**
   - BullMQ per code di lavoro
   - Redis per cache condivisa
   - WebSocket per real-time updates (presenze)

4. **Monitoring avanzato**
   - Grafana + Prometheus per metriche
   - Alerting su latenza >500ms
   - Dashboard per ogni regione

## Metriche target per fase

| Metrica | Fase 1 | Fase 2 | Fase 3 | Fase 4 |
|---------|--------|--------|--------|--------|
| Mercati | 500 | 2.000 | 5.000 | 8.000 |
| Latenza media | <200ms | <200ms | <150ms | <100ms |
| Uptime | 99% | 99.5% | 99.9% | 99.9% |
| Cold start | 3s | 0s | 0s | 0s |
| Costo/mese | 0 | ~50 EUR | ~200 EUR | ~500 EUR |

## Regole per codice scalabile (da applicare subito)

### 1. Sempre paginare
```typescript
// OGNI query di lista deve accettare limit/offset
.input(z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  marketId: z.number().optional(),
}))
```

### 2. Sempre filtrare per territorio
```typescript
// OGNI query deve filtrare per il contesto dell'utente
const markets = await db.select().from(schema.markets)
  .where(and(
    eq(schema.markets.active, 1),
    userTerritory ? eq(schema.markets.city, userTerritory) : undefined,
  ))
  .limit(input.limit)
  .offset(input.offset);
```

### 3. Mai caricare relazioni nested in loop
```typescript
// Usa JOIN o query batch
const data = await db.select({
  market: schema.markets,
  stallCount: count(schema.stalls.id),
}).from(schema.markets)
  .leftJoin(schema.stalls, eq(schema.stalls.marketId, schema.markets.id))
  .groupBy(schema.markets.id);
```

### 4. Usare conteggi approssimativi per grandi volumi
```sql
-- SBAGLIATO per tabelle >1M righe
SELECT COUNT(*) FROM vendor_presences;

-- CORRETTO
SELECT reltuples::bigint FROM pg_class WHERE relname = 'vendor_presences';
```

### 5. Indici compositi per query frequenti
```sql
-- Query piu' frequente: "presenze di un mercato oggi"
CREATE INDEX idx_presences_market_date
ON vendor_presences(market_id, date DESC);
```

## Checklist pre-scaling

- [ ] Tutti i SELECT hanno LIMIT
- [ ] Indici sulle colonne usate in WHERE/JOIN/ORDER BY
- [ ] Retention policy attiva per log (30 giorni)
- [ ] React Query con staleTime appropriato
- [ ] Nessun N+1 query
- [ ] Batch insert per operazioni bulk
- [ ] Monitoring attivo (Guardian + api_metrics)
- [ ] Load test eseguito con k6 o artillery
