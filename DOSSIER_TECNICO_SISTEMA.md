# DOSSIER TECNICO DI SISTEMA - DMS HUB
## Digital Market System Hub - Piattaforma Gestione Mercati Ambulanti

> Documento tecnico per valutazione, vendita, certificazione e conformita' normativa.
> Generato: 15 Febbraio 2026 | Versione: 1.0

---

## INDICE

1. [Executive Summary](#1-executive-summary)
2. [Scheda Identificativa del Prodotto](#2-scheda-identificativa)
3. [Architettura di Sistema](#3-architettura)
4. [Inventario Funzionale](#4-inventario-funzionale)
5. [Stato Integrazioni PA](#5-integrazioni-pa)
6. [Analisi Sicurezza e Maturita'](#6-sicurezza)
7. [Conformita' Normativa - Gap Analysis](#7-conformita)
8. [Valutazione Economica](#8-valutazione)
9. [Roadmap di Conformita'](#9-roadmap)
10. [Documentazione di Corredo Necessaria](#10-documenti-necessari)

---

## 1. EXECUTIVE SUMMARY

**DMS Hub** e' una piattaforma web unica per la gestione digitale dei mercati ambulanti italiani.
Il sistema gestisce l'intero ciclo di vita: mercati, posteggi, operatori, concessioni, pagamenti,
controlli, segnalazioni civiche, mobilita' sostenibile e gamification.

### Numeri Chiave

| Metrica | Valore |
|---------|--------|
| Codice sorgente attivo | 113.922 righe |
| Progetto totale (incl. docs, config, presentazioni) | ~218.000 righe |
| Pagine frontend | 33 |
| Componenti UI | 139 + 50 shadcn/ui base |
| Procedure API (tRPC) | ~140 |
| Tabelle database | 69 |
| Integrazioni esterne | 7 (Firebase, PagoPA/E-FIL, TPER, OAuth, Orchestratore, Council, Slot Editor) |
| Ruoli utente gestiti | 4 livelli (Super Admin, PA, Operatore, Cittadino) |
| Target di scala | 8.000 mercati |

### Proposta di Valore

- **Unica app** per tutti i ruoli (PA, operatori, cittadini)
- **RBAC completo** con impersonazione per comune
- **PagoPA integrato** per incassi pubblici
- **Gamification** con Token Carbon Credit (TCC)
- **Multi-agente AI** per assistenza e automazione
- **Gemello digitale** con mappe GIS interattive

---

## 2. SCHEDA IDENTIFICATIVA DEL PRODOTTO

| Campo | Valore |
|-------|--------|
| **Nome prodotto** | DMS Hub (Digital Market System Hub) |
| **Tipo** | SaaS / Piattaforma Web Multi-Tenant |
| **Dominio** | PA locale - Commercio su Aree Pubbliche |
| **Normativa di riferimento** | D.Lgs. 114/98, L. 689/81, CAD (D.Lgs. 82/2005) |
| **Utenti target** | Comuni italiani, operatori ambulanti, cittadini |
| **Mercato indirizzabile** | ~8.000 mercati ambulanti in Italia |
| **Modello di licensing** | SaaS per comune (proposta) |
| **URL produzione** | dms-hub-app-new.vercel.app |
| **Repository** | GitHub (privato) |
| **Inizio sviluppo** | 2024 |
| **Stato** | Produzione limitata (pilota Grosseto) |

---

## 3. ARCHITETTURA DI SISTEMA

### 3.1 Stack Tecnologico

| Layer | Tecnologia | Versione | Licenza |
|-------|-----------|----------|---------|
| **Frontend** | React | 19 | MIT |
| **Build** | Vite | 7 | MIT |
| **Router** | Wouter | 3.7 | MIT |
| **Styling** | Tailwind CSS | 4 | MIT |
| **UI Kit** | shadcn/ui | - | MIT |
| **Icone** | Lucide React | - | ISC |
| **Mappe** | Leaflet + react-leaflet | - | BSD-2 |
| **Backend** | Express | 4 | MIT |
| **API** | tRPC | 11 | MIT |
| **ORM** | Drizzle | 0.44 | Apache-2.0 |
| **Database** | PostgreSQL (Neon) | 15+ | PostgreSQL |
| **Auth** | Firebase Auth | - | Proprietaria Google |
| **Runtime** | Node.js | 18+ | MIT |
| **Package Manager** | pnpm | 10.4+ | MIT |

**Tutte le dipendenze core sono open source (MIT/Apache/BSD).**

### 3.2 Diagramma Architetturale

```
                           ┌─────────────────────────┐
                           │      UTENTE FINALE       │
                           │  (Browser / Mobile PWA)  │
                           └────────────┬────────────┘
                                        │ HTTPS
                    ┌───────────────────┼───────────────────┐
                    │                   │                    │
          ┌─────────┴─────────┐  ┌──────┴──────┐  ┌────────┴────────┐
          │   VERCEL (CDN)    │  │  FIREBASE   │  │  HETZNER VPS    │
          │   Frontend React  │  │  Auth       │  │  Backend tRPC   │
          │   SSR + Edge      │  │  Google     │  │  Express + PM2  │
          │   ~114K LOC       │  │  Apple      │  │  ~11K LOC       │
          └─────────┬─────────┘  │  Email/Pwd  │  └────────┬────────┘
                    │            │  (SPID*)    │           │
                    │            └──────┬──────┘           │
                    │                   │                   │
                    │            JWT Session Cookie         │
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │ tRPC (SuperJSON)
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                    │
          ┌─────────┴─────────┐  ┌──────┴──────┐  ┌────────┴────────┐
          │   NEON DB (EU)    │  │  E-FIL      │  │  ORCHESTRATORE  │
          │   PostgreSQL      │  │  PagoPA     │  │  Multi-Agente   │
          │   Serverless      │  │  SOAP API   │  │  MIO/Manus/GPT  │
          │   69 tabelle      │  │  (Mock OK)  │  │  REST API       │
          └───────────────────┘  └─────────────┘  └─────────────────┘

* SPID via intermediario OAuth, NON integrazione diretta AgID
```

### 3.3 Infrastruttura di Deploy

| Componente | Provider | Localita' | SLA | Costo stimato |
|------------|----------|-----------|-----|---------------|
| Frontend | Vercel | Edge globale | 99.99% | Free tier / Pro |
| Backend | Hetzner VPS | Germania (EU) | 99.9% | ~20 EUR/mese |
| Database | Neon PostgreSQL | EU | 99.95% | Free tier / Pro |
| Auth | Firebase | Google Cloud | 99.95% | Free tier |
| DNS | nip.io | Globale | Best effort | Gratuito |

**Costo infrastruttura attuale**: ~20-50 EUR/mese (configurazione pilota)

---

## 4. INVENTARIO FUNZIONALE

### 4.1 Moduli del Sistema

| # | Modulo | Stato | Complessita' | LOC |
|---|--------|-------|-------------|-----|
| 1 | Autenticazione (Firebase + OAuth) | Produzione | Alta | ~2.500 |
| 2 | RBAC e Sicurezza (11 tabelle) | Produzione | Molto Alta | ~3.000 |
| 3 | Gestione Mercati + Mappa GIS | Produzione | Molto Alta | ~12.000 |
| 4 | Posteggi e Stati Real-Time | Produzione | Media | ~3.000 |
| 5 | Operatori/Imprese (CRUD + Docs) | Produzione | Alta | ~5.000 |
| 6 | Concessioni (Ciclo di vita) | Produzione | Alta | ~4.000 |
| 7 | Prenotazioni (30min scadenza) | Produzione | Media | ~1.500 |
| 8 | Presenze (Check-in/out GPS) | Produzione | Media | ~2.000 |
| 9 | Wallet Operatori (Borsellino) | Produzione | Molto Alta | ~4.000 |
| 10 | PagoPA / E-FIL (5 web service SOAP) | Mock attivo | Molto Alta | ~1.500 |
| 11 | Controlli e Sanzioni | Produzione | Alta | ~3.500 |
| 12 | SUAP (Pratiche + SCIA) | Parziale | Alta | ~4.000 |
| 13 | HUB Urbani (Locations + Negozi) | Produzione | Media | ~3.000 |
| 14 | Gamification TCC | Produzione | Alta | ~3.000 |
| 15 | Segnalazioni Civiche | Produzione | Media | ~2.500 |
| 16 | Mobilita' Sostenibile | Produzione | Media | ~2.000 |
| 17 | Mappe GIS (8 componenti) | Produzione | Alta | ~6.000 |
| 18 | Multi-Agente AI (MIO) | Produzione | Molto Alta | ~5.000 |
| 19 | Monitoring (Guardian) | Produzione | Media | ~3.000 |
| 20 | Integrazioni (API Keys, Webhooks) | Produzione | Alta | ~3.000 |
| 21 | Dashboard PA (14 tab) | Produzione | Molto Alta | ~7.200 |
| 22 | Interfacce Operatore | Produzione | Alta | ~5.000 |
| 23 | Interfacce Cittadino | Produzione | Media | ~4.000 |
| 24 | Trasporto TPER Bologna | Produzione | Media | ~1.500 |

### 4.2 Copertura Funzionale per Dominio PA

| Dominio | Copertura | Note |
|---------|-----------|------|
| Commercio su aree pubbliche | 90% | Core del sistema |
| Gestione concessioni | 85% | Manca rinnovo batch |
| Incassi e pagamenti PA | 70% | PagoPA in mock, serve produzione |
| Controllo territorio | 80% | Verbali conformi L. 689/81 |
| Sportello unico (SUAP) | 60% | Frontend OK, backend via orchestratore esterno |
| Segnalazioni civiche | 85% | Completo con gamification |
| Mobilita' sostenibile | 75% | Percorsi + CO2, manca integrazione MaaS |
| Gestione documentale | 40% | Solo schema, manca upload/storage |

---

## 5. STATO INTEGRAZIONI PA

Questa sezione e' critica per la conformita'. Descrive lo stato reale di ogni integrazione
con i sistemi della Pubblica Amministrazione.

### 5.1 PagoPA (Pagamenti Pubblici)

| Aspetto | Stato | Dettaglio |
|---------|-------|-----------|
| **Intermediario** | E-FIL Plug&Pay | SOAP Web Services |
| **WSPayment** | Implementato | Pagamento spontaneo + redirect checkout |
| **WSFeed** | Implementato | Creazione posizioni debitorie |
| **WSDeliver** | Implementato | Verifica stato + riconciliazione giornaliera |
| **WSGeneratorPdf** | Implementato | Generazione PDF avvisi e quietanze |
| **WSPaymentNotify** | Implementato | Notifiche out-of-node |
| **Generazione IUV** | Implementato | Algoritmo custom (YYYYMMDDHHMMSS+5random) |
| **Mock mode** | Attivo | Simulazione completa senza credenziali |
| **Credenziali produzione** | DA ATTIVARE | Richiedere ad E-FIL |
| **Webhook callback** | DA IMPLEMENTARE | Handler per conferma asincrona pagamento |

**File principali:**
- `server/services/efilPagopaService.ts` (628 righe)
- `server/walletRouter.ts` (909 righe)

**Variabili d'ambiente richieste:**
```
EFIL_BASE_URL, EFIL_USERNAME, EFIL_PASSWORD, EFIL_APPLICATION_CODE,
EFIL_ID_GESTIONALE, DMS_PAGOPA_RETURN_URL, DMS_PAGOPA_CALLBACK_URL
```

**Per andare in produzione serve:**
1. Contratto con E-FIL (o altro intermediario PagoPA certificato)
2. Codice IPA dell'ente (Indice PA)
3. Credenziali ambiente di produzione
4. Implementare webhook handler per RT asincrona
5. Test end-to-end con pagamento reale

### 5.2 SPID / CIE / CNS (Identita' Digitale)

| Aspetto | Stato | Dettaglio |
|---------|-------|-----------|
| **SPID** | Via intermediario | OAuth Manus, NON integrazione diretta |
| **CIE** | Non implementato | Nessun supporto Carta d'Identita' Elettronica |
| **CNS** | Non implementato | Nessun supporto Carta Nazionale Servizi |
| **eIDAS** | Non implementato | Nessun Level of Assurance mapping |
| **Firebase Google** | Attivo | OAuth2 completo |
| **Firebase Apple** | Attivo | OAuth2 completo |
| **Firebase Email/Pwd** | Attivo | Con registrazione inline |

**Cosa serve per conformita' SPID diretta:**
1. Registrazione come Service Provider su registro AgID
2. Certificato X.509 per firma SAML
3. Integrazione con Identity Provider (IDP) SPID
4. Implementazione protocollo SAML 2.0 (o OIDC per SPID v2)
5. Metadata XML conforme alle specifiche tecniche AgID
6. Test con ambiente di validazione AgID
7. Superamento collaudo AgID

**Alternative piu' rapide:**
- **SPID as a Service**: Lepida, TeamSystem, Namirial (intermediari certificati)
- **CIE id**: SDK Ministero dell'Interno
- **SPID/CIE button**: Componente standard AgID

### 5.3 PDND (Piattaforma Digitale Nazionale Dati)

| Aspetto | Stato | Dettaglio |
|---------|-------|-----------|
| **Integrazione** | Non implementata | Nessun codice PDND nel sistema |
| **e-Service** | Non registrato | Nessun servizio esposto |
| **Voucher** | Non implementato | Nessuna gestione token PDND |
| **Interoperabilita'** | Non implementata | Nessun flusso dati con altri enti |

**Cosa serve:**
1. Adesione alla PDND come erogatore/fruitore
2. Pubblicazione degli e-Service (API mercati, concessioni, etc.)
3. Implementazione OAuth 2.0 con voucher PDND
4. Definizione degli accordi di fruizione
5. Rispetto delle Linee Guida Interoperabilita' AgID

**Priorita': ALTA** - Obbligatoria per PA dal CAD Art. 50-ter

### 5.4 ANPR (Anagrafe Nazionale)

| Aspetto | Stato | Dettaglio |
|---------|-------|-----------|
| **Integrazione** | Non implementata | Nessun codice ANPR |
| **Verifica CF** | Non implementata | Solo validazione formato |
| **Residenza** | Non implementata | Nessun lookup |

**Cosa serve:**
1. Accesso ANPR via PDND (obbligatorio dal 2024)
2. Implementazione API consultazione base
3. Verifica codice fiscale operatori
4. Verifica residenza per concessioni

### 5.5 AppIO (App dei Servizi Pubblici)

| Aspetto | Stato | Dettaglio |
|---------|-------|-----------|
| **Notifiche** | Non implementata | Nessuna integrazione |
| **Messaggi** | Non implementata | Nessun invio |
| **Pagamenti** | Non implementata | Solo PagoPA diretto |

**Cosa serve:**
1. Registrazione servizio su backend AppIO
2. API key per invio messaggi
3. Template messaggi per: scadenza concessione, avviso pagamento, verbale

### 5.6 SUAP (Sportello Unico)

| Aspetto | Stato | Dettaglio |
|---------|-------|-----------|
| **Frontend** | Implementato | 3 pagine + 4 componenti |
| **Backend** | Via orchestratore esterno | REST a orchestratore.mio-hub.me |
| **Database locale** | Non implementato | Dati su sistema esterno |
| **Standard SUAP** | Parziale | Flusso SCIA base implementato |

---

## 6. ANALISI SICUREZZA E MATURITA'

### 6.1 Matrice di Sicurezza

| Area | Punteggio | Stato | Note |
|------|-----------|-------|------|
| Autenticazione | 8/10 | Buono | JWT + Firebase, manca MFA |
| Autorizzazione (RBAC) | 7/10 | Buono | Completo ma doppio sistema (legacy + nuovo) |
| Validazione input | 8/10 | Buono | Zod su tutte le procedure tRPC |
| Protezione SQL injection | 9/10 | Ottimo | Drizzle ORM, zero raw SQL |
| Protezione XSS | 7/10 | Discreto | React escape, manca CSP header |
| Logging e audit | 8/10 | Buono | 6 tabelle audit, logging automatico |
| Rate limiting | 1/10 | Critico | Schema presente, middleware ASSENTE |
| Security headers | 0/10 | Critico | Nessun header di sicurezza configurato |
| CORS | 5/10 | Parziale | Non esplicitamente configurato |
| Crittografia dati | 4/10 | Insufficiente | Solo HTTPS, nessuna cifratura a riposo per PII |
| Gestione segreti | 8/10 | Buono | .env, nessun segreto nel codice |
| Backup e DR | 3/10 | Insufficiente | Solo backup Neon automatico |
| **MEDIA** | **5.7/10** | **Sufficiente** | **Miglioramenti critici necessari** |

### 6.2 Vulnerabilita' Identificate

#### CRITICHE (da risolvere prima della vendita)

| # | Vulnerabilita' | Rischio | Soluzione |
|---|---------------|---------|-----------|
| C1 | Nessun rate limiting | DoS, brute force | Installare `express-rate-limit` |
| C2 | Nessun security header | XSS, clickjacking, MIME sniffing | Installare `helmet` |
| C3 | Sessione 1 anno senza refresh | Session hijacking | Ridurre a 7-30gg + refresh token |
| C4 | Email super-admin hardcoded | Rigidita' | Spostare in variabile d'ambiente |

#### ALTE (da risolvere entro 3 mesi)

| # | Vulnerabilita' | Rischio | Soluzione |
|---|---------------|---------|-----------|
| A1 | Nessun MFA/2FA | Account takeover | Abilitare MFA Firebase |
| A2 | PII non cifrate nel DB | Data breach | Cifratura AES-256 su CF, PIVA |
| A3 | Nessuna policy di retention log | GDPR non compliance | Definire TTL e cleanup automatico |
| A4 | Nessun WAF | Attacchi web | Cloudflare o ModSecurity |

#### MEDIE (da pianificare)

| # | Vulnerabilita' | Rischio | Soluzione |
|---|---------------|---------|-----------|
| M1 | Doppio sistema permessi | Inconsistenza | Migrare a unico sistema tRPC |
| M2 | Nessun penetration test | Vulnerabilita' ignote | Commissionare pen test |
| M3 | Cookie domain non configurato | Multi-tenant issues | Configurare per sottodomini |
| M4 | Nessuna session invalidation list | Logout inefficace | Blacklist token o Redis |

### 6.3 Livello di Maturita' Software (CMMI-like)

| Area | Livello | Descrizione |
|------|---------|-------------|
| Gestione requisiti | 2 - Gestito | Requisiti tracciati in docs, non in tool dedicato |
| Sviluppo | 3 - Definito | Stack definito, pattern consistenti, CLAUDE.md |
| Testing | 1 - Iniziale | Solo type-check, nessun test automatizzato |
| Deploy | 2 - Gestito | Vercel auto-deploy, PM2 manuale |
| Monitoring | 3 - Definito | Guardian + audit logs + health check |
| Sicurezza | 2 - Gestito | Auth solida, mancano hardening e compliance |
| Documentazione | 3 - Definito | CLAUDE.md, INVENTARIO, docs/ completi |

---

## 7. CONFORMITA' NORMATIVA - GAP ANALYSIS

### 7.1 Linee Guida AgID

#### CAD (Codice Amministrazione Digitale - D.Lgs. 82/2005)

| Requisito | Articolo | Stato | Gap |
|-----------|----------|-------|-----|
| Identita' digitale SPID | Art. 64 | Parziale | Serve integrazione diretta SPID |
| CIE come credenziale | Art. 64 | Mancante | Serve integrazione CIE |
| Domicilio digitale | Art. 3-bis | Mancante | Nessuna gestione PEC/domicilio |
| Pagamenti elettronici PagoPA | Art. 5 | Parziale | Implementato ma in mock |
| Interoperabilita' PDND | Art. 50-ter | Mancante | Nessuna integrazione |
| Accessibilita' (WCAG 2.1 AA) | Art. 53 | Mancante | Solo componenti base shadcn/ui |
| Open data | Art. 52 | Mancante | Nessun dataset pubblicato |
| Conservazione digitale | Art. 44 | Mancante | Nessun sistema di conservazione |
| Sicurezza informatica | Art. 51 | Parziale | Auth OK, mancano hardening e audit formale |

#### Linee Guida Design (design.italia.it)

| Requisito | Stato | Gap |
|-----------|-------|-----|
| UI Kit Italia | Non usato | Usa shadcn/ui (non conforme) |
| Bootstrap Italia | Non usato | Usa Tailwind CSS |
| Font Titillium Web | Non usato | Font di sistema |
| Header istituzionale | Non presente | Manca header PA standard |
| Footer istituzionale | Non presente | Manca footer con dati ente |
| Dichiarazione accessibilita' | Assente | Da pubblicare su form AgID |

### 7.2 Regolamenti Europei

#### GDPR (Reg. UE 2016/679)

| Requisito | Stato | Gap |
|-----------|-------|-----|
| Informativa privacy | Assente | Nessuna pagina privacy |
| Cookie banner | Assente | Nessun banner consenso |
| Registro trattamenti | Assente | Non documentato |
| DPIA (Valutazione impatto) | Assente | Non effettuata |
| DPO (Data Protection Officer) | N/A | Da nominare se richiesto |
| Diritto all'oblio | Schema OK | Manca implementazione cancellazione |
| Portabilita' dati | Assente | Nessun export dati utente |
| Consenso esplicito | Schema OK | complianceCertificates esiste, manca UI |
| Cifratura dati sensibili | Assente | PII in chiaro nel DB |
| Data breach notification | Assente | Nessuna procedura |
| Privacy by design | Parziale | Geolocalizzazione anonimizzata (griglia 100m) |

#### eIDAS (Reg. UE 910/2014)

| Requisito | Stato | Gap |
|-----------|-------|-----|
| Livelli di garanzia (LoA) | Non mappati | Nessun LoA su sessioni |
| Firma elettronica | Non implementata | Serve per concessioni e verbali |
| Sigillo elettronico | Non implementato | Per documenti PA |
| Marca temporale | Non implementata | Per atti amministrativi |

#### NIS2 (Direttiva UE 2022/2555) - Se applicabile

| Requisito | Stato | Gap |
|-----------|-------|-----|
| Gestione rischi cyber | Parziale | Manca risk assessment formale |
| Incident reporting | Assente | Nessuna procedura CSIRT |
| Supply chain security | Parziale | Dipendenze open source, manca SBOM |
| Business continuity | Assente | Nessun piano DR/BC |

#### Accessibility (EN 301 549 / WCAG 2.1 AA)

| Requisito | Stato | Gap |
|-----------|-------|-----|
| Percepibilita' | Parziale | Contrasto OK (dark theme), mancano alt text |
| Operabilita' | Insufficiente | Nessuna navigazione tastiera testata |
| Comprensibilita' | Parziale | UI in italiano, mancano label ARIA |
| Robustezza | Parziale | HTML semantico via shadcn/ui |
| Dichiarazione di accessibilita' | Assente | Obbligatoria per PA |

### 7.3 Qualificazione Cloud ACN/AgID

Per essere utilizzato dalla PA, il servizio cloud deve essere qualificato ACN
(ex catalogo AgID, ora Agenzia per la Cybersicurezza Nazionale).

| Requisito | Stato | Gap |
|-----------|-------|-----|
| Qualificazione SaaS ACN | Non richiesta | Da avviare per vendita a PA |
| Data residency EU | OK | Neon EU, Hetzner Germania |
| ISO 27001 | Assente | Certificazione necessaria |
| ISO 9001 | Assente | Certificazione necessaria |
| Pen test report | Assente | Da commissionare |
| Piano di continuita' | Assente | Da redigere |
| SLA documentati | Assenti | Da definire |
| Contratto SaaS PA | Assente | Da redigere con clausole AgID |

---

## 8. VALUTAZIONE ECONOMICA

### 8.1 Stima del Valore di Sviluppo

La valutazione si basa sul metodo **COCOMO II** semplificato e sul costo di mercato
per sviluppo equivalente.

#### Metodo 1: Costo di Ricostruzione (Build Cost)

| Parametro | Valore |
|-----------|--------|
| LOC attive | 113.922 |
| Produttivita' media (LOC/mese per sviluppatore senior) | 1.500 |
| Mesi-uomo stimati | ~76 |
| Costo medio sviluppatore senior Italia (RAL + overhead) | 5.000 EUR/mese |
| **Costo di ricostruzione stimato** | **~380.000 EUR** |

#### Metodo 2: Costo di Mercato per Feature

| Modulo | Costo mercato stimato |
|--------|----------------------|
| Auth + RBAC completo | 25.000 - 40.000 EUR |
| Gestione mercati + GIS | 40.000 - 60.000 EUR |
| Wallet + PagoPA | 30.000 - 50.000 EUR |
| SUAP + Concessioni | 25.000 - 40.000 EUR |
| Controlli e sanzioni | 15.000 - 25.000 EUR |
| Gamification TCC | 20.000 - 30.000 EUR |
| Multi-agente AI | 25.000 - 40.000 EUR |
| Dashboard PA (14 tab) | 30.000 - 45.000 EUR |
| Interfacce operatore | 20.000 - 30.000 EUR |
| Interfacce cittadino | 15.000 - 25.000 EUR |
| Mappe GIS (8 comp.) | 20.000 - 30.000 EUR |
| Integrazioni + Monitoring | 15.000 - 25.000 EUR |
| **Totale feature** | **280.000 - 440.000 EUR** |

#### Metodo 3: Valore Commerciale (Revenue Potential)

| Scenario | Comuni | Canone annuo | Revenue annua |
|----------|--------|-------------|---------------|
| Conservativo | 50 comuni | 3.000 EUR | 150.000 EUR |
| Base | 200 comuni | 3.000 EUR | 600.000 EUR |
| Ottimistico | 500 comuni | 5.000 EUR | 2.500.000 EUR |
| Full scale (8.000) | 2.000 comuni | 5.000 EUR | 10.000.000 EUR |

**Multiplo SaaS tipico: 5-8x revenue annua**

| Scenario | Valutazione (5x) | Valutazione (8x) |
|----------|-------------------|-------------------|
| Conservativo | 750.000 EUR | 1.200.000 EUR |
| Base | 3.000.000 EUR | 4.800.000 EUR |
| Ottimistico | 12.500.000 EUR | 20.000.000 EUR |

### 8.2 Fattori che Aumentano il Valore

| Fattore | Impatto |
|---------|---------|
| Dominio verticale unico (mercati ambulanti Italia) | Alto - poca concorrenza |
| PagoPA gia' integrato (anche se mock) | Alto - barriera all'ingresso |
| Multi-tenant pronto per scale | Alto |
| 69 tabelle DB con relazioni | Alto - modello dati maturo |
| Multi-agente AI integrato | Medio-Alto - differenziante |
| Gamification/TCC | Medio - innovativo |
| Stack moderno (React 19, tRPC 11) | Medio - facile da mantenere |

### 8.3 Fattori che Riducono il Valore

| Fattore | Impatto |
|---------|---------|
| Nessun test automatizzato | Alto negativo |
| SPID non direttamente integrato | Alto negativo (bloccante per PA) |
| PDND non implementata | Alto negativo (obbligatoria) |
| Security headers assenti | Medio negativo |
| Accessibilita' non conforme | Medio negativo (obbligatoria per PA) |
| Qualificazione ACN assente | Alto negativo (bloccante per vendita a PA) |
| Un solo deploy pilota (Grosseto) | Medio negativo |
| Documentazione API incompleta | Medio negativo |

### 8.4 Sintesi Valutazione

| Tipo | Range |
|------|-------|
| **Valore asset (codebase)** | 280.000 - 440.000 EUR |
| **Investimento per conformita'** | 80.000 - 150.000 EUR (stima) |
| **Valore commerciale potenziale** (con conformita') | 750.000 - 5.000.000 EUR |

---

## 9. ROADMAP DI CONFORMITA'

### Fase 1: Sicurezza Base (1-2 mesi)

| # | Azione | Effort | Priorita' |
|---|--------|--------|-----------|
| 1.1 | Installare `helmet` per security headers | 2 ore | Critica |
| 1.2 | Installare `express-rate-limit` | 4 ore | Critica |
| 1.3 | Ridurre sessione a 30gg + refresh token | 1 giorno | Critica |
| 1.4 | Configurare CORS esplicito | 2 ore | Alta |
| 1.5 | Rimuovere email hardcoded, spostare in env | 1 ora | Alta |
| 1.6 | Cifratura AES-256 per CF e PIVA nel DB | 2 giorni | Alta |
| 1.7 | Abilitare MFA Firebase | 1 giorno | Alta |

### Fase 2: Conformita' AgID Base (2-4 mesi)

| # | Azione | Effort | Priorita' |
|---|--------|--------|-----------|
| 2.1 | Integrazione SPID diretta (o via intermediario certificato) | 2-4 settimane | Bloccante |
| 2.2 | Integrazione CIE id | 1-2 settimane | Alta |
| 2.3 | Attivazione PagoPA produzione (credenziali E-FIL) | 1-2 settimane | Bloccante |
| 2.4 | Implementare webhook PagoPA per RT asincrona | 3 giorni | Alta |
| 2.5 | Pagina informativa privacy + cookie banner | 1 settimana | Alta |
| 2.6 | Dichiarazione di accessibilita' AgID | 2 giorni | Alta |
| 2.7 | DPIA (Valutazione d'impatto privacy) | 1 settimana | Alta |

### Fase 3: Interoperabilita' e Compliance (4-6 mesi)

| # | Azione | Effort | Priorita' |
|---|--------|--------|-----------|
| 3.1 | Adesione PDND e pubblicazione e-Service | 4-6 settimane | Bloccante |
| 3.2 | Integrazione ANPR via PDND | 2-3 settimane | Alta |
| 3.3 | Integrazione AppIO per notifiche | 2-3 settimane | Media |
| 3.4 | Audit WCAG 2.1 AA + remediation | 4-6 settimane | Alta |
| 3.5 | Adeguamento UI Kit Italia (header/footer PA) | 2-3 settimane | Media |
| 3.6 | Implementazione diritto all'oblio + export dati | 1-2 settimane | Alta |
| 3.7 | Test suite automatizzata (minimo 60% coverage) | 4-6 settimane | Alta |

### Fase 4: Certificazione e Go-to-Market (6-12 mesi)

| # | Azione | Effort | Priorita' |
|---|--------|--------|-----------|
| 4.1 | Penetration test da terza parte | 2-3 settimane (esterno) | Bloccante |
| 4.2 | Qualificazione SaaS ACN | 2-4 mesi (processo) | Bloccante |
| 4.3 | Documentazione SLA | 1 settimana | Alta |
| 4.4 | Piano di continuita' operativa | 1-2 settimane | Alta |
| 4.5 | Piano di disaster recovery | 1-2 settimane | Alta |
| 4.6 | Registro dei trattamenti GDPR | 1 settimana | Alta |
| 4.7 | Contratto SaaS tipo per PA (con clausole AgID) | Legale (esterno) | Bloccante |
| 4.8 | Documentazione API OpenAPI/Swagger | 2-3 settimane | Media |
| 4.9 | SBOM (Software Bill of Materials) | 2 giorni | Media |
| 4.10 | ISO 27001 (opzionale ma fortemente raccomandata) | 3-6 mesi (esterno) | Alta |

---

## 10. DOCUMENTAZIONE DI CORREDO NECESSARIA

Per vendere o certificare il sistema, servono questi documenti.
Quelli con [X] esistono gia', quelli con [ ] vanno creati.

### 10.1 Documentazione Tecnica

| # | Documento | Stato | Note |
|---|-----------|-------|------|
| 1 | [X] Architettura di sistema | `docs/ARCHITECTURE.md` |
| 2 | [X] Schema database completo | `docs/DATABASE.md` + `drizzle/schema.ts` |
| 3 | [X] Inventario funzionale | `INVENTARIO_SISTEMA.md` |
| 4 | [X] Guida operativa agenti | `CLAUDE.md` |
| 5 | [X] Piano di scaling | `docs/SCALING.md` |
| 6 | [X] Guida operazioni | `docs/OPERATIONS.md` |
| 7 | [ ] Documentazione API (OpenAPI/Swagger) | Da generare |
| 8 | [ ] Diagrammi UML (sequenza, componenti, deploy) | Da creare |
| 9 | [ ] Manuale utente PA | Da scrivere |
| 10 | [ ] Manuale utente operatore | Da scrivere |
| 11 | [ ] Guida di installazione/deploy | Da scrivere |
| 12 | [ ] SBOM (Software Bill of Materials) | Da generare |

### 10.2 Documentazione di Sicurezza

| # | Documento | Stato | Note |
|---|-----------|-------|------|
| 1 | [ ] Risk Assessment | Da redigere |
| 2 | [ ] Penetration Test Report | Da commissionare |
| 3 | [ ] Vulnerability Assessment | Da commissionare |
| 4 | [ ] Piano di Incident Response | Da scrivere |
| 5 | [ ] Policy di gestione accessi | Da scrivere |
| 6 | [ ] Piano di Disaster Recovery | Da scrivere |
| 7 | [ ] Piano di Business Continuity | Da scrivere |

### 10.3 Documentazione Legale/Compliance

| # | Documento | Stato | Note |
|---|-----------|-------|------|
| 1 | [ ] Informativa Privacy (Art. 13 GDPR) | Da scrivere |
| 2 | [ ] Cookie Policy | Da scrivere |
| 3 | [ ] Registro dei Trattamenti (Art. 30 GDPR) | Da redigere |
| 4 | [ ] DPIA (Data Protection Impact Assessment) | Da effettuare |
| 5 | [ ] Termini di Servizio | Da scrivere |
| 6 | [ ] Contratto SaaS per PA | Da redigere (legale) |
| 7 | [ ] Nomina DPO (se necessaria) | Da valutare |
| 8 | [ ] Dichiarazione di Accessibilita' | Da compilare su form AgID |
| 9 | [ ] Attestazione conformita' SPID | Post-collaudo AgID |
| 10 | [ ] Attestazione conformita' PagoPA | Post-attivazione produzione |

### 10.4 Documentazione Commerciale

| # | Documento | Stato | Note |
|---|-----------|-------|------|
| 1 | [X] Presentazione sistema | `audit_presentation/` + `tech_slides/` |
| 2 | [ ] Scheda prodotto (2 pagine) | Da creare |
| 3 | [ ] Case study Grosseto | Da scrivere |
| 4 | [ ] Listino prezzi / Piano SaaS | Da definire |
| 5 | [ ] Confronto competitor | Da analizzare |
| 6 | [ ] ROI analysis per comune tipo | Da calcolare |

---

## APPENDICE A: CHECKLIST RAPIDA PER ACQUIRENTE

Se qualcuno vuole valutare l'acquisto del sistema, ecco cosa verificare:

### Il sistema e' funzionante?
- [X] Frontend accessibile e navigabile
- [X] Backend che risponde (health check)
- [X] Database con schema completo (69 tabelle)
- [X] Login funzionante (Firebase)
- [X] CRUD su mercati, posteggi, operatori
- [X] Wallet e transazioni
- [X] Mappe GIS funzionanti
- [ ] PagoPA in produzione (solo mock)
- [ ] SPID diretto (solo OAuth intermediario)

### Il codice e' di qualita'?
- [X] TypeScript strict (no `any`)
- [X] ORM (Drizzle) - niente SQL injection
- [X] Validazione input (Zod su tutte le API)
- [X] Pattern consistenti (tRPC, React Query)
- [X] Documentazione codebase (CLAUDE.md, INVENTARIO)
- [ ] Test automatizzati (ASSENTI)
- [ ] Code review documentate (processo informale)

### Il sistema e' sicuro?
- [X] Autenticazione robusta (Firebase + JWT)
- [X] RBAC completo (11 tabelle sicurezza)
- [X] Audit logging automatico
- [X] Segreti non nel codice
- [ ] Rate limiting (ASSENTE)
- [ ] Security headers (ASSENTI)
- [ ] Pen test (MAI EFFETTUATO)
- [ ] Cifratura PII (ASSENTE)

### Il sistema puo' scalare?
- [X] Architettura multi-tenant ready
- [X] Database serverless (Neon)
- [X] Frontend su CDN (Vercel)
- [X] Schema DB progettato per 8.000 mercati
- [ ] Load testing effettuato (MAI)
- [ ] Caching layer (ASSENTE)
- [ ] Paginazione server-side (PARZIALE)

### Il sistema e' conforme per la PA?
- [ ] SPID/CIE integrato direttamente (NO)
- [ ] PagoPA in produzione (NO, solo mock)
- [ ] PDND integrata (NO)
- [ ] Accessibilita' WCAG 2.1 AA (NO)
- [ ] Qualificazione ACN (NO)
- [ ] Privacy policy e GDPR completo (NO)

---

## APPENDICE B: COMPETITOR E POSIZIONAMENTO

### Mercato di riferimento

Il mercato della gestione digitale dei mercati ambulanti in Italia e' ancora **poco digitalizzato**.
La maggior parte dei comuni gestisce ancora con Excel, carta o software desktop obsoleti.

### Competitor noti

| Competitor | Tipo | Copertura | Differenza |
|-----------|------|-----------|------------|
| Gestione Mercati (vari SW desktop) | Desktop locale | Solo concessioni | DMS Hub e' web + mobile + GIS |
| SUAP comunali (custom) | Web PA | Solo pratiche | DMS Hub copre intero ciclo |
| PagoPA (portale pagamenti) | Infrastruttura | Solo pagamenti | DMS Hub integra pagamento nel flusso |
| Nessun competitor diretto SaaS | - | - | **DMS Hub e' unico nel posizionamento** |

### Vantaggi competitivi unici

1. **Unica piattaforma end-to-end** per mercati ambulanti
2. **Multi-tenant SaaS** (un'app per tutti i comuni)
3. **PagoPA nativo** nel flusso operativo
4. **Gamification** con crediti carbonio (innovazione)
5. **Multi-agente AI** per supporto decisionale
6. **Mappe GIS** con gemello digitale del mercato
7. **RBAC granulare** con impersonazione per comune

---

*Documento generato il 15 Febbraio 2026*
*Per aggiornamenti: eseguire nuova analisi del codice sorgente*
