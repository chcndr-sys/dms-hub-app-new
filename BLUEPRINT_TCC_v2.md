# BLUEPRINT TCC v2 - STATO IMPLEMENTAZIONE

**Data**: 11 Gennaio 2026
**Versione**: 2.0 - COMPLETATO

---

## RIEPILOGO MODIFICHE IMPLEMENTATE

### 1. DATABASE (Neon PostgreSQL)

**Nuove tabelle create:**
| Tabella | Descrizione | Stato |
|---------|-------------|-------|
| `operator_daily_wallet` | Wallet giornaliero operatore | ✅ Creata |
| `spend_qr_tokens` | Token QR per spesa cliente | ✅ Creata |
| `operator_transactions` | Storico transazioni operatore | ✅ Creata |

**Colonne aggiunte:**
- `transactions`: `operator_id`, `qr_token`
- `carbon_credits_config`: `policy_multiplier`, `ets_base_price`, `last_policy_update`, `policy_notes`, `tcc_value`

---

### 2. BACKEND API (mihub-backend-rest)

**Nuovo file:** `routes/tcc-v2.js`

**Nuovi endpoint:**
| Endpoint | Metodo | Descrizione | Stato |
|----------|--------|-------------|-------|
| `/api/tcc/v2/config` | GET | Configurazione TCC con tasso effettivo | ✅ |
| `/api/tcc/v2/operator/wallet/:id` | GET | Wallet giornaliero operatore | ✅ |
| `/api/tcc/v2/generate-spend-qr` | POST | Cliente genera QR per spendere TCC | ✅ |
| `/api/tcc/v2/operator/issue` | POST | Operatore assegna TCC al cliente | ✅ |
| `/api/tcc/v2/operator/redeem-spend` | POST | Operatore incassa TCC dal cliente | ✅ |
| `/api/tcc/v2/operator/settlement` | POST | Chiusura giornaliera operatore | ✅ |
| `/api/tcc/v2/operator/transactions/:id` | GET | Storico transazioni operatore | ✅ |
| `/api/tcc/v2/config/update` | PUT | Manopola politica (aggiorna tasso) | ✅ |

**Deploy:** Hetzner via SSH + git pull + pm2 restart

---

### 3. FRONTEND (dms-hub-app-new)

#### 3.1 WalletPage.tsx (App Pubblica)

**Modifiche:**
- ❌ **Rimosso** tab "Impresa"
- ✅ **Solo** tab "Cliente"
- 🆕 **Aggiunta** sezione "Paga con TCC":
  - Campo "Importo da pagare (EUR)"
  - Calcolo TCC necessari
  - Pulsante "Genera QR Pagamento"
  - Visualizzazione QR con scadenza

**Deploy:** Vercel automatico da GitHub

#### 3.2 HubOperatore.tsx (Dashboard PA)

**Ristrutturazione completa con 3 tab:**

| Tab | Contenuto | Stato |
|-----|-----------|-------|
| **Scanner QR** | Due modalità (Assegna/Incassa TCC), campo importo, certificazioni, calcolo TCC | ✅ |
| **Vendite** | Storico transazioni in tempo reale | ✅ |
| **Wallet** | Saldo Rilasciati, Riscattati, Differenza, Chiusura giornaliera | ✅ |

**Funzionalità:**
- Toggle "Assegna TCC" / "Incassa TCC"
- Campo "Importo Vendita (EUR)" grande e visibile
- Certificazioni (+20% cad.): BIO, KM0, Fair Trade, DOP
- Calcolo TCC automatico
- Scanner QR (manuale, camera in sviluppo)
- Statistiche giornaliere in tempo reale
- Pulsante "Chiudi Giornata e Invia al Fondo"

#### 3.3 DashboardPA.tsx - Carbon Credits

**Già esistente e funzionante:**
- Simulatore scenari TCC
- Valore Token Carbon Credit (TCC)
- Manopola Politica con slider
- Integrazione TPAS predisposta

---

## FLUSSO OPERATIVO TCC v2

### Flusso 1: ASSEGNAZIONE TCC (Operatore → Cliente)

```
1. Operatore inserisce importo vendita (EUR)
2. Seleziona certificazioni (BIO, KM0, etc.)
3. Sistema calcola TCC (base + bonus certificazioni)
4. Operatore clicca "Assegna TCC"
5. Scansiona QR del cliente
6. TCC trasferiti dal Fondo al Wallet Cliente
7. Registrato come "TCC Rilasciati" nel wallet operatore
```

### Flusso 2: INCASSO TCC (Cliente → Operatore)

```
1. Cliente apre app Wallet
2. Inserisce importo da pagare (EUR)
3. App genera QR code sicuro con token cifrato
4. Operatore seleziona "Incassa TCC"
5. Scansiona il QR del cliente
6. TCC trasferiti dal Wallet Cliente al Wallet Operatore
7. Registrato come "TCC Riscattati"
```

### Flusso 3: CHIUSURA GIORNALIERA

```
1. Operatore clicca "Chiudi Giornata e Invia al Fondo"
2. Sistema invia:
   - TCC Rilasciati → contatore "fabbisogno fondo"
   - TCC Riscattati → convertiti in EUR e accreditati
3. Fondo calcola il rimborso in Euro
```

---

## CONFIGURAZIONE ATTUALE

| Parametro | Valore |
|-----------|--------|
| Tasso base TCC | EUR 0.01 |
| Moltiplicatore politica | 1.0 |
| Prezzo base ETS | EUR 80.00/ton |
| Bonus BIO | +20% |
| Bonus KM0 | +20% |
| Bonus Fair Trade | +20% |
| Bonus DOP | +20% |

---

## URL DI ACCESSO

| Servizio | URL |
|----------|-----|
| App Pubblica (Wallet) | https://dms-hub-app-new.vercel.app/wallet |
| HUB Operatore | https://dms-hub-app-new.vercel.app/hub-operatore |
| Dashboard PA | https://dms-hub-app-new.vercel.app/dashboard-pa |
| Backend API | https://orchestratore.mio-hub.me/api/tcc/v2/ |

---

## PROSSIMI PASSI (Opzionali)

1. **Camera Scanner**: Integrare html5-qrcode per scansione reale
2. **Notifiche Push**: Avvisare cliente quando riceve TCC
3. **Report PDF**: Generare report giornaliero per operatore
4. **Integrazione POS**: Collegare con sistemi di cassa
5. **TPAS**: Attivare integrazione quando disponibile (2027+)

---

## REPOSITORY

- **Frontend**: https://github.com/Chcndr/dms-hub-app-new
- **Backend**: https://github.com/Chcndr/mihub-backend-rest

---

*Blueprint aggiornato automaticamente - Manus AI*
