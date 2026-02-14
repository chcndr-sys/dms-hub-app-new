# Operations - Deploy, Monitoring e Troubleshooting

> Runbook operativo per il sistema DMS Hub.
> Tutti gli interventi su produzione devono essere documentati qui.

## Infrastruttura

### Frontend (Vercel)
- **URL**: `dms-hub-app-new.vercel.app`
- **Deploy**: Automatico su push a `master`
- **Tempo deploy**: ~2 minuti
- **CDN**: Vercel Edge Network (globale)
- **Cache**: Assets con hash = 1 anno immutable; index.html = no-cache

### Backend (Hetzner VPS)
- **Server**: `157.90.29.66`
- **URL**: `mihub.157-90-29-66.nip.io` (tRPC) / `orchestratore.mio-hub.me` (legacy)
- **Process Manager**: PM2
- **Deploy**: GitHub webhook → PM2 restart
- **OS**: Linux
- **Node**: 18+

### Database (Neon)
- **Host**: `ep-bold-silence-adftsojg.eu-central-1.aws.neon.tech`
- **Regione**: EU Central (Frankfurt)
- **Tipo**: Serverless PostgreSQL
- **Auto-suspend**: Dopo 5 minuti di inattivita'
- **Cold start**: 2-3 secondi

## Comandi PM2 (Hetzner)

```bash
# SSH al server
ssh root@157.90.29.66

# Stato processi
pm2 status

# Log in tempo reale
pm2 logs --lines 50

# Restart applicazione
pm2 restart all

# Reload senza downtime
pm2 reload all

# Monitoraggio risorse
pm2 monit
```

## Monitoring

### Guardian Dashboard (built-in)
Il sistema ha un monitoring integrato accessibile da:
- Frontend: `/guardian/endpoints`, `/guardian/logs`, `/guardian/debug`
- API: `guardian.integrations`, `guardian.logs`, `guardian.debug`

Traccia automaticamente:
- Tutti gli endpoint chiamati
- Response time per endpoint
- Status code (successi/errori)
- Errori con stack trace

### Metriche nel DB
- `api_metrics` - Performance API (endpoint, tempo, status)
- `system_logs` - Log applicativi (app, level, message)
- `mio_agent_logs` - Log agenti AI (326K+ righe)

### Health Check manuale

```bash
# 1. Verifica backend
curl -s https://mihub.157-90-29-66.nip.io/api/trpc/system.health | jq

# 2. Verifica tRPC
curl -s https://mihub.157-90-29-66.nip.io/api/trpc/auth.me | jq

# 3. Verifica frontend
curl -sI https://dms-hub-app-new.vercel.app | head -5

# 4. Verifica DB (via tRPC)
curl -s https://mihub.157-90-29-66.nip.io/api/trpc/mioAgent.testDatabase | jq
```

## Troubleshooting

### Problema: "Connection terminated due to connection timeout"
**Causa**: Neon cold start. Il compute si e' spento e la riconnessione fallisce.
**Soluzione**:
1. Il sistema ritenta automaticamente (lazy connection in `getDb()`)
2. Se persiste, verifica su Neon Console che il compute sia attivo
3. Verifica `DATABASE_URL` in `.env` sul server

### Problema: PM2 in restart loop
**Causa**: Errore fatale nel codice backend.
**Diagnosi**:
```bash
pm2 logs --lines 100 --err
```
**Soluzioni comuni**:
- Sintassi TypeScript rotta → fix e redeploy
- `DATABASE_URL` mancante → verifica `.env`
- Porta 3000 occupata → il server trova automaticamente la prossima disponibile
- Memoria esaurita → `pm2 restart --max-memory-restart 500M`

### Problema: Frontend non si aggiorna
**Causa**: Cache del browser o CDN.
**Soluzione**:
1. Hard refresh: Ctrl+Shift+R
2. Assets con hash cambiano automaticamente al rebuild
3. `index.html` ha `Cache-Control: no-cache`

### Problema: tRPC "UNAUTHORIZED" (401)
**Causa**: Cookie di sessione scaduto o assente.
**Soluzione**:
1. Verifica che il frontend invii `credentials: 'include'`
2. Verifica che il backend setti il cookie correttamente
3. Controlla `SameSite` del cookie (deve essere compatibile con il dominio)

### Problema: Firebase auth fallisce
**Causa**: Variabili VITE_FIREBASE_* non configurate.
**Verifica**:
```bash
# Sul server
grep VITE_FIREBASE .env
```
**Variabili richieste**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

### Problema: PagoPA non funziona
**Causa**: Credenziali E-FIL scadute o servizio SOAP down.
**Diagnosi**:
1. Controlla log: `pm2 logs | grep EFIL`
2. Verifica credenziali in `.env`: `EFIL_USERNAME`, `EFIL_PASSWORD`
3. Testa endpoint SOAP: `curl https://test.plugnpay.efil.it/plugnpay`

### Problema: TPER sync fallisce
**Causa**: API Bologna Open Data down o formato dati cambiato.
**Diagnosi**:
```bash
# Testa manualmente
curl -s "https://srm.opendata.bologna.it/api/..." | head -20
```
**Soluzione**: Il sync TPER e' non-critico, i dati cached nel DB restano validi.

## Deploy manuale

### Frontend (Vercel)
```bash
# Il deploy e' automatico, ma per forzare:
git push origin master
# Verifica su https://vercel.com/dashboard
```

### Backend (Hetzner)
```bash
# SSH al server
ssh root@157.90.29.66

# Pull ultimo codice
cd /root/mihub-backend-rest
git pull origin master

# Install dipendenze
pnpm install

# Build
pnpm build

# Restart
pm2 restart all
```

### Database (Migrazioni)
```bash
# Dal tuo locale (con DATABASE_URL configurata)
pnpm db:push

# Oppure dal server Hetzner
cd /path/to/project && pnpm db:push
```

## Backup

### Database (Neon)
- Neon fa backup automatici con Point-in-Time Recovery
- Per restore: Neon Console > Branch > PITR > seleziona timestamp
- Per export manuale: `pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql`

### Codice
- GitHub e' il backup primario del codice
- Vercel mantiene snapshot di ogni deploy
- PM2 mantiene lo stato dei processi

## Manutenzione periodica

### Giornaliera (automatica)
- Logging API metriche in `api_metrics`
- Logging sistema in `system_logs`
- Guardian monitoring attivo

### Settimanale
- Controllare `pm2 status` per restart count
- Verificare spazio su disco Hetzner: `df -h`
- Controllare metriche Neon su console

### Mensile
- Review `mio_agent_logs` - considerare pulizia log >30 giorni
- Verificare scadenza credenziali (Firebase, E-FIL, API keys)
- Aggiornare dipendenze: `pnpm update`
- Verificare certificati SSL

## Contatti

| Risorsa | Accesso |
|---------|---------|
| Neon Console | console.neon.tech |
| Vercel Dashboard | vercel.com/dashboard |
| Firebase Console | console.firebase.google.com |
| Hetzner Console | console.hetzner.cloud |
| GitHub Repo | github.com/[org]/dms-hub-app-new |
