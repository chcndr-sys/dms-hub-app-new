# INVENTARIO COMPLETO DMS HUB - Febbraio 2026

> Inventario funzionale generato dall'analisi diretta del codice sorgente.
> Ultimo aggiornamento: 15 Febbraio 2026

---

## PANORAMICA

**DMS Hub** (Digital Market System Hub) e' una piattaforma unica per la gestione digitale
dei mercati ambulanti italiani, progettata per scalare a **8.000 mercati**.

| Dato | Valore |
|------|--------|
| Pagine frontend | 33 |
| Componenti UI | 139 (+ 50 shadcn/ui base) |
| Router tRPC backend | 11+ |
| Procedure API (query + mutation) | ~140 |
| Tabelle database | 68 |
| Contexts React | 7 |
| Custom hooks | 11 |
| API client modules | 5 |

---

## SEZIONE 1: AUTENTICAZIONE E ACCESSO

### 1.1 Login Multi-Canale
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Login SPID/CIE/CNS | Attivo | Via ARPA Toscana OAuth |
| Login Google | Attivo | Firebase popup/redirect |
| Login Apple | Attivo | Firebase popup/redirect |
| Login Email/Password | Attivo | Firebase + registrazione inline |
| Callback OAuth | Attivo | `/auth/callback` con CSRF check |
| Reset password | Attivo | Email via Firebase |
| Logout | Attivo | Cancella sessione + cookie |

### 1.2 Sessione e Token
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Firebase ID Token | Attivo | Auto-refresh |
| Cookie JWT (session) | Attivo | Scadenza 1 anno |
| BRIDGE DB legacy | Attivo | Sync utente con orchestratore Manus |
| localStorage persistenza | Attivo | user, token, permissions, miohub_firebase_user |

### 1.3 RBAC (Role-Based Access Control)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| 4 tabelle RBAC | Attivo | user_roles, permissions, role_permissions, user_role_assignments |
| 6 settori ruoli | Attivo | sistema, pa, mercato, impresa, esterno, pubblico |
| Livelli (0-99) | Attivo | 0=super_admin, 99=cittadino |
| Scope permessi | Attivo | all, territory, market, own, delegated, none |
| ProtectedTab | Attivo | Wrappa ogni tab con canViewTab(tabId) |
| ProtectedQuickAccess | Attivo | Controlla sidebar |
| Deleghe temporanee | Schema OK | securityDelegations table |
| Security events tracking | Attivo | login_failed, brute_force, permission_denied |
| IP Blacklist | Attivo | Blocco IP per attacchi |
| Login attempts tracking | Attivo | Conteggio per brute-force detection |
| Compliance GDPR | Schema OK | complianceCertificates table |
| Access logs | Attivo | Audit trail accessi |

### 1.4 Impersonazione per Comune
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Impersonazione PA | Attivo | Super admin vede come PA di un comune |
| Banner giallo | Attivo | ImpersonationBanner.tsx visibile |
| Tab nascosti | Attivo | security, sistema, ai, integrations, comuni |
| Persistenza sessionStorage | Attivo | miohub_impersonation |
| Uscita impersonazione | Attivo | endImpersonation() |

---

## SEZIONE 2: GESTIONE MERCATI (DMS Core)

### 2.1 Mercati
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista mercati con statistiche | Attivo | totale/occupati/liberi posteggi |
| Dettaglio mercato con geometria | Attivo | GeoJSON, posteggi, marker, aree |
| Import da Slot Editor v3 | Attivo | Stalli, marker, aree custom |
| Import automatico | Attivo | Da Slot Editor v3 o BusHubEditor |
| Mappa interattiva Leaflet | Attivo | MarketMapComponent con GeoJSON |
| Geometria avanzata | Attivo | marketGeometry con GCP, PNG overlay |
| Custom markers | Attivo | entrance, exit, wc, info, parking |
| Custom areas | Attivo | food, clothing, handicraft con GeoJSON |

### 2.2 Posteggi (Stalli)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista posteggi per mercato | Attivo | Con coordinate e area mq |
| Aggiorna stato posteggio | Attivo | free, reserved, occupied, booked, maintenance |
| Stati real-time con coordinate | Attivo | getStatuses con lat/lng |
| Colori mappa per stato | Attivo | Verde=libero, Rosso=occupato, Ambra=riservato |
| Overlay numeri posteggio | Attivo | StallNumbersOverlay su mappa |

### 2.3 Operatori (Vendors)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista operatori | Attivo | Con dati anagrafici completi |
| Creazione operatore | Attivo | PIVA, CF, ragione sociale, ATECO |
| Aggiornamento operatore | Attivo | Tutti i campi modificabili |
| Dettagli completi | Attivo | Documenti, concessioni, presenze, violazioni |
| Rating operatore | Attivo | 0-5 stelle |
| Documenti obbligatori | Schema OK | ID, HACCP, assicurazione, certificati sanitari |

### 2.4 Concessioni
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista concessioni con filtri | Attivo | Per mercato, operatore, stato |
| Dettaglio concessione | Attivo | Con numero concessione univoco |
| Creazione concessione | Attivo | Aggiorna SCIA via REST |
| Aggiornamento stato | Attivo | active, expired, suspended, revoked |
| Tipi concessione | Attivo | daily, monthly, yearly, permanent |
| Stato pagamento | Attivo | pending, paid, overdue |
| Pagamenti concessioni | Schema OK | concessionPayments table |

### 2.5 Prenotazioni
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Crea prenotazione | Attivo | Con scadenza 30 minuti |
| Lista prenotazioni attive | Attivo | Solo pending |
| Conferma check-in | Attivo | Verifica saldo wallet + decurtazione automatica |
| Cancella prenotazione | Attivo | Libera posteggio |

### 2.6 Presenze
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Check-out operatore | Attivo | Calcolo durata automatico |
| Presenze odierne per mercato | Attivo | Join vendor/stall |
| GPS check-in | Schema OK | Coordinate lat/lng registrate |
| Graduatoria presenze | Attivo | PresenzeGraduatoriaPanel |

### 2.7 Controlli e Sanzioni
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Crea controllo | Attivo | Con foto, GPS, checklist JSON |
| Lista controlli | Attivo | Per mercato/operatore |
| Crea verbale | Attivo | Con multa e data scadenza |
| Lista verbali | Attivo | Con stati: issued, paid, appealed, cancelled |
| Nuovo verbale PM | Attivo | Form conforme L. 689/81 e D.Lgs. 114/98 |
| Tipi violazione | Attivo | late_checkin, missing_doc, hygiene, unauthorized |

---

## SEZIONE 3: WALLET E PAGAMENTI

### 3.1 Wallet Operatori (Borsellino Elettronico)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Statistiche dashboard | Attivo | Wallet attivi/bloccati, saldo totale, avvisi PagoPA |
| Lista wallet con dati impresa | Attivo | Filtrabili |
| Dettaglio wallet | Attivo | Ultime 20 transazioni, 10 avvisi PagoPA |
| Wallet per impresa | Attivo | Lookup per impresaId |
| Crea wallet | Attivo | Per impresa |
| Aggiorna stato | Attivo | ATTIVO, BLOCCATO, SOSPESO |
| Blocco automatico saldo basso | Attivo | Sotto soglia minima |
| Auto-sblocco ricarica | Attivo | Al superamento soglia |

### 3.2 Transazioni Wallet
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista transazioni | Attivo | Ordinate per data |
| Ricarica manuale | Attivo | O via callback PagoPA |
| Decurtazione per presenza | Attivo | Verifica saldo + blocco automatico |
| Verifica saldo pre-presenza | Attivo | Controlla tariffa vs saldo |
| Tipi transazione | Attivo | RICARICA, DECURTAZIONE, RIMBORSO, CORREZIONE |

### 3.3 Integrazione PagoPA / E-FIL
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Genera avviso PagoPA | Attivo | Via E-FIL con IUV |
| Avvia pagamento immediato | Attivo | Redirect checkout |
| Verifica stato pagamento | Attivo | Accredita se pagato |
| Genera PDF avviso | Attivo | Scaricabile |
| Genera PDF quietanza | Attivo | Post-pagamento |
| Lista avvisi per wallet | Attivo | GENERATO, PAGATO, SCADUTO, ANNULLATO |
| Riconciliazione giornaliera | Attivo | Ricerca pagamenti via E-FIL |

### 3.4 Tariffe
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista tariffe per mercato | Attivo | Filtrabile |
| Crea/aggiorna tariffa | Attivo | INSERT/UPDATE |
| Tipi posteggio | Attivo | ALIMENTARE, NON_ALIMENTARE, PRODUTTORE |
| Periodi | Attivo | Giornaliera, settimanale, mensile, annuale |

### 3.5 Report Movimenti
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Report periodo | Attivo | Totali ricariche/decurtazioni |

### 3.6 Wallet Cittadini (TCC)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Saldo TCC | Attivo | WalletPage con balance |
| QR code dinamico | Attivo | Per pagamenti P2P |
| Scanner QR | Attivo | Html5Qrcode integrato |
| POI vicini | Attivo | Banner/popup/lista |
| Storico transazioni | Attivo | earn, spend, refund |

---

## SEZIONE 4: HUB URBANI

### 4.1 Locations HUB
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista hub locations | Attivo | Attivi/inattivi |
| Dettaglio singola location | Attivo | Con area GeoJSON |
| Crea hub location | Attivo | Collegato a mercato |
| Aggiorna hub location | Attivo | Tutti i campi |
| Soft delete | Attivo | Disattivazione |
| Mappa HUB interattiva | Attivo | HubMapComponent |

### 4.2 Negozi HUB
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista negozi per hub | Attivo | Filtrabile |
| Crea negozio | Attivo | Con proprietario, PIVA, categoria |
| Gestione negozi | Attivo | GestioneHubNegozi panel |
| Form nuovo negozio | Attivo | NuovoNegozioForm inline |
| ShopModal | Attivo | Modifica/creazione negozio |

### 4.3 Servizi HUB
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista servizi per hub | Attivo | Filtrabile |
| Crea servizio | Attivo | parking, bike_sharing, charging_station, locker |
| Capacita' e disponibilita' | Schema OK | capacity, available, price |

---

## SEZIONE 5: SUAP (Sportello Unico Attivita' Produttive)

### 5.1 Pratiche SUAP
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Dashboard SUAP | Attivo | Statistiche pratiche/autorizzazioni/domande |
| Lista pratiche | Attivo | Filtri per tipo, stato, data |
| Dettaglio pratica | Attivo | Timeline cronologica, documenti, note |
| Creazione pratica | Attivo | SCIA, Concessione |
| Valutazione automatica | Attivo | Score + esito |
| Form SCIA | Attivo | SciaForm.tsx |
| Form Concessione SUAP | Attivo | ConcessioneForm.tsx |
| Form Autorizzazione | Attivo | AutorizzazioneForm.tsx |
| Domanda Spunta | Attivo | Form + dettaglio (posteggio occasionale) |
| Lista autorizzazioni | Attivo | ListaAutorizzazioniSuap.tsx |
| Gestione notifiche SUAP | Attivo | NotificationManager.tsx |

### 5.2 Stati Pratica
- RECEIVED → PRECHECK → EVALUATED → APPROVED / REJECTED / INTEGRATION_NEEDED

---

## SEZIONE 6: MAPPE E VISUALIZZAZIONE GIS

### 6.1 Componenti Mappa
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Mappa mercati Leaflet | Attivo | MarketMapComponent con GeoJSON |
| Mappa GIS semplificata | Attivo | GISMap.tsx |
| Mappa HUB urbani | Attivo | HubMapComponent.tsx |
| Mappa HUB + Mercati integrata | Attivo | HubMarketMapComponent.tsx |
| Mappa mobilita' | Attivo | MobilityMap con layer trasporto |
| Mappa Italia pubblica | Attivo | MappaItaliaPage con toggle Mercati/HUB |
| Mappa base | Attivo | Map.tsx wrapper Leaflet |
| Modal con mappa | Attivo | MapModal.tsx |

### 6.2 Layer e Overlay
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Overlay numeri posteggi | Attivo | StallNumbersOverlay.tsx |
| Layer percorso | Attivo | RouteLayer.tsx |
| Layer segnalazioni civiche | Attivo | CivicReportsLayer GeoJSON |
| Heatmap segnalazioni | Attivo | CivicReportsHeatmap.tsx |
| Layer fermate trasporto | Attivo | TransportStopsLayer.tsx |
| Layer heatmap generico | Attivo | HeatmapLayer.tsx |
| Toggle layer trasporto | Attivo | TransportLayerToggle.tsx |

### 6.3 Animazione Mappa
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| flyTo animato | Attivo | Durata dinamica (1.5-6s) |
| Zoom ottimale per bounds | Attivo | Arrotondato a quarti |
| Pausa polling durante animazione | Attivo | Via AnimationContext |

---

## SEZIONE 7: GAMIFICATION E SOSTENIBILITA'

### 7.1 Token Carbon Credit (TCC)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Config gamification per comune | Attivo | TCC, civiche, mobilita', cultura, shopping |
| Salva/aggiorna config | Attivo | INSERT/UPDATE per comune |
| Statistiche TCC aggregate | Attivo | Per comune |
| Heatmap negozi TCC | Attivo | earned/spent per negozio |
| GamingRewardsPanel | Attivo | Gestione completa |

### 7.2 Segnalazioni Civiche con Reward
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Segnalazione georeferenziata | Attivo | 7 categorie |
| Upload foto multiple | Attivo | CivicPage.tsx |
| Geolocalizzazione GPS | Attivo | navigator.geolocation |
| Reward TCC per segnalazione | Attivo | Verificata |
| Heatmap segnalazioni PA | Attivo | CivicReportsPanel |

### 7.3 Mobilita' Sostenibile
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Percorsi eco-sostenibili | Attivo | RoutePage con walk/cycling/driving |
| Calcolo CO2 risparmiata | Attivo | Per tipo trasporto |
| Check-in mobilita' | Attivo | checkins table con carbonSaved |
| POI vicini con GPS | Attivo | useNearbyPOIs hook (raggio 50m) |
| Check-in automatico POI | Attivo | Cultura + mobilita' |

### 7.4 Tracciamento Prodotti
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| TPASS identifier | Schema OK | productTracking table |
| Origine e trasporto | Schema OK | paese, citta', distanza km |
| CO2 per prodotto | Schema OK | carbonFootprint table |
| Digital Product Passport | Schema OK | dppHash |
| Dogana e IVA | Schema OK | customsCleared, ivaVerified |

---

## SEZIONE 8: TRASPORTO PUBBLICO (TPER Bologna)

### 8.1 Integrazione GTFS
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista fermate TPER | Attivo | Bus + treni |
| Sincronizzazione batch | Attivo | tper.sync mutation |
| Fermate vicine a punto | Attivo | loadStopsNearPoint con raggio |
| Linee per fermata | Attivo | getRoutesForStop |
| Toggle bus/treni | Attivo | TransportContext |
| NearbyStopsPanel | Attivo | Panel fermate vicine |

---

## SEZIONE 9: MULTI-AGENTE (MIO HUB)

### 9.1 Orchestrazione Agenti
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Chat MIO principale | Attivo | conversationId 'mio-main' |
| Invio a orchestratore Hetzner | Attivo | callOrchestrator() |
| Agenti supportati | Attivo | MIO, Manus, Abacus, Zapier, GPT Dev, Gemini |
| Mode auto/direct | Attivo | Routing automatico o manuale |
| Polling post-invio | Attivo | 5s per risposte aggiuntive |
| Deduplicazione messaggi | Attivo | Per role+contenuto |

### 9.2 Task Engine
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Crea task per agente | Attivo | Con tipo, priorita', input |
| Lista task con filtri | Attivo | Per agente/status |
| Aggiorna status task | Attivo | pending → in_progress → completed/failed |
| Subtask | Schema OK | parentTaskId |

### 9.3 Messaggistica Multi-Agente
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Invio messaggio tra agenti | Attivo | sender → recipients |
| Recupera messaggi conversazione | Attivo | Con conversationId |
| Mark as read | Attivo | Per agente |
| WebSocket real-time | Attivo | Fallback a polling |

### 9.4 Data Bag (Storage Condiviso)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Salva valore con TTL | Attivo | Key-value + scadenza |
| Recupera valore | Attivo | Con controllo TTL |
| Access level | Attivo | private, shared, public |

### 9.5 Agent Brain (Memoria)
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Salva memoria agente | Attivo | decision, context, learning, history |
| Recupera per tipo/chiave | Attivo | Con confidence 0-100 |

### 9.6 Concilio AI
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Council Page | Attivo | iframe council.mio-hub.me |
| Decisioni ponderate multi-LLM | Attivo | Interfaccia dedicata |

---

## SEZIONE 10: INTEGRAZIONI ESTERNE

### 10.1 API Keys
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista API keys | Attivo | Con ambiente e permessi |
| Crea API key | Attivo | Prefisso dms_live_ o dms_test_ |
| Rigenera key | Attivo | Nuova key stesso nome |
| Elimina/Revoca | Attivo | Soft delete |
| Rate limiting | Schema OK | rateLimit per key |
| API Token cifrati | Attivo | AES-256-GCM backend |

### 10.2 Webhooks
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista webhooks | Attivo | Con URL, eventi, secret |
| Crea webhook | Attivo | Custom headers, HMAC secret |
| Test manuale | Attivo | Con log esecuzione |
| Log webhook | Attivo | Ultime 50 entry |
| Retry policy | Schema OK | JSON configurabile |

### 10.3 Connessioni Esterne
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Lista connessioni | Attivo | ARPAE, TPER, TPAS, Heroku |
| Aggiorna config | Attivo | Status + health check |
| Tipi | Attivo | api, database, webhook, sftp |

### 10.4 Statistiche API
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Stats giornaliere | Attivo | Requests, response time, success rate |
| Top endpoint | Attivo | Per requests e response time |
| Metriche per endpoint | Schema OK | apiMetrics table |

---

## SEZIONE 11: MONITORING E GUARDIAN

### 11.1 Guardian System
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Inventario API completo | Attivo | Con statistiche da Hetzner |
| Log centralizzati | Attivo | Filtri level/app/type |
| Test endpoint proxy | Attivo | Debug con logging |
| Statistiche sistema | Attivo | API + logs aggregati |
| Demo logs init | Attivo | Per test/demo |

### 11.2 Pagine Guardian
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| /guardian/endpoints | Attivo | Registry API con risk level |
| /guardian/logs | Attivo | Log operazioni agenti AI |
| /guardian/debug | Attivo | Solo denied + error |

### 11.3 Health Dashboard
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| System health check | Attivo | health query |
| Notify owner | Attivo | Solo admin |
| API status polling | Attivo | ogni 30s |
| PM2 status check | Attivo | Backend Hetzner |

---

## SEZIONE 12: SINCRONIZZAZIONE DATI

### 12.1 Sync System
| Funzione | Stato | Dettaglio |
|----------|-------|-----------|
| Config sincronizzazione | Schema OK | Frequenza, mode, entities |
| Job di sync | Schema OK | pull/push/bidirectional |
| Log sync record-by-record | Schema OK | Audit trail dettagliato |
| Entita' sincronizzabili | Schema OK | operatori, presenze, concessioni, pagamenti, documenti, mercati, posteggi |
| Trigger types | Schema OK | system, manual, webhook |

---

## SEZIONE 13: DASHBOARD PA (14 Tab)

### Tab con RBAC Protection
| Tab ID | Nome | Funzionalita' Principale |
|--------|------|--------------------------|
| dashboard | Overview | Analytics: mercati, posteggi, operatori, concessioni, metriche |
| mercati | Mercati | GestioneMercati con mappa interattiva, import, posteggi |
| imprese | Imprese | Lista imprese, qualificazioni, operatori |
| commercio | Commercio | Negozi, prodotti, tracciamento, certificazioni |
| wallet | Wallet | WalletPanel: bilancio, transazioni, ricariche, PagoPA |
| hub | Hub | GestioneHubPanel: locations, negozi, servizi, mappa |
| controlli | Controlli | ControlliSanzioniPanel: ispezioni, verbali, sanzioni |
| comuni | Comuni | ComuniPanel: gestione comuni + impersonazione (solo super-admin) |
| security | Sicurezza | SecurityTab: RBAC, ruoli, permessi, utenti |
| sistema | Sistema | GuardianLogsSection + LogsDebugReal |
| ai | MIO Agent | Chat multi-agente |
| integrations | Integrazioni | API keys, webhooks, connessioni |
| reports | Report | NativeReportComponent + LegacyReportCards |
| workspace | Workspace | SharedWorkspace multi-user |

---

## SEZIONE 14: PAGINE PER RUOLO UTENTE

### Cittadino (level 99)
| Pagina | Rotta | Funzionalita' |
|--------|-------|----------------|
| Home | `/` | Ricerca universale, accesso rapido |
| Mappa | `/mappa` | Mercati e posteggi su Leaflet |
| Mappa Italia | `/mappa-italia` | Gemello Digitale nazionale |
| Segnalazioni | `/civic` | 7 categorie + GPS + foto + TCC reward |
| Percorsi | `/route` | Eco-sostenibili con CO2 e crediti |
| Vetrine | `/vetrine` | Catalogo negozi con rating |
| Wallet | `/wallet` | Saldo TCC, QR, scanner, POI |
| Presentazione | `/presentazione` | 24 slide informative |

### Operatore/Impresa (level 30-50)
| Pagina | Rotta | Funzionalita' |
|--------|-------|----------------|
| Dashboard Impresa | `/dashboard-impresa` | Dati, concessioni, qualificazioni |
| Wallet Impresa | `/app/impresa/wallet` | Saldi per mercato, ricarica PagoPA |
| Presenze | `/app/impresa/presenze` | Check-in via app DMS |
| Anagrafica | `/app/impresa/anagrafica` | 6 sotto-sezioni (dati, concessioni, qualifiche, autorizzazioni, domande, collaboratori) |
| Notifiche | `/app/impresa/notifiche` | Inbox, lette, archiviate |
| Hub Operatore | `/hub-operatore` | Dashboard operatore HUB |
| SUAP | `/suap` | Pratiche, autorizzazioni, SCIA |

### PA / Sindaco (level 10)
| Pagina | Rotta | Funzionalita' |
|--------|-------|----------------|
| Dashboard PA | `/dashboard-pa` | 14 tab protetti da RBAC |
| Guardian Endpoints | `/guardian/endpoints` | Registry API |
| Guardian Logs | `/guardian/logs` | Log operazioni |
| Guardian Debug | `/guardian/debug` | Debug errori |
| API Tokens | `/settings/api-tokens` | Gestione token cifrati |
| Council | `/council` | Concilio AI multi-LLM |
| Verbali PM | `/pm/nuovo-verbale` | Contestazioni L. 689/81 |

### Super Admin (level 0)
- Tutte le pagine sopra + Impersonazione per Comune
- Tab aggiuntivi: comuni, security, sistema, ai, integrations

---

## SEZIONE 15: DATABASE - 68 TABELLE

### Per Area Funzionale
| Area | Tabelle | Principali |
|------|---------|------------|
| Auth/Utenti | 2 | users, extendedUsers |
| System/Logging | 3 | systemLogs, auditLogs, mioAgentLogs |
| Mercati/Geometrie | 4 | markets, marketGeometry, customMarkers, customAreas |
| Posteggi/Operatori | 4 | stalls, vendors, concessions, vendorDocuments |
| Prenotazioni/Presenze | 2 | bookings, vendorPresences |
| Controlli/Sanzioni | 3 | inspectionsDetailed, violations, inspections (legacy) |
| Commercio/Prodotti | 4 | shops, products, productTracking, carbonFootprint |
| Transazioni TCC | 6 | transactions, checkins, ecocredits, carbonCreditsConfig, fundTransactions, reimbursements |
| Wallet Operatori | 4 | operatoreWallet, walletTransazioni, tariffePosteggio, avvisiPagopa |
| Sostenibilita'/Mobilita' | 3 | userAnalytics, sustainabilityMetrics, mobilityData |
| Notifiche/Segnalazioni | 2 | notifications, civicReports |
| HUB | 3 | hubLocations, hubShops, hubServices |
| Multi-Agente | 7 | agentTasks, agentProjects, agentBrain, systemEvents, dataBag, agentMessages, agentContext |
| Integrazioni | 5 | apiKeys, apiMetrics, webhooks, webhookLogs, externalConnections |
| Sincronizzazione | 3 | syncConfig, syncJobs, syncLogs |
| Security/RBAC | 10 | userRoles, permissions, rolePermissions, userRoleAssignments, userSessions, accessLogs, securityEvents, loginAttempts, ipBlacklist, complianceCertificates |
| Pagamenti | 1 | concessionPayments |
| Autorizzazioni | 1 | autorizzazioni |
| Deleghe | 1 | securityDelegations |
| Analytics | 1 | businessAnalytics |

---

## SEZIONE 16: ARCHITETTURA BACKEND - PROCEDURE tRPC

### Riepilogo per Router
| Router | Procedure | Principali |
|--------|-----------|------------|
| system | 2 | health, notifyOwner |
| auth | 2 | me, logout |
| analytics | 7 | overview, markets, shops, transactions, checkins, products, productTracking |
| dmsHub | ~70 | markets(4), stalls(3), vendors(4), bookings(4), presences(2), inspections(2), violations(2), hub.locations(5), hub.shops(2), hub.services(2), concessions(4), gamingRewards(4) |
| wallet | ~20 | stats, list, getById, create, ricarica, decurtazione, PagoPA(6), tariffe(2), report, verificaSaldo |
| integrations | ~15 | apiKeys(5), apiStats(2), webhooks(5), connections(2) |
| mihub | ~12 | tasks(3), messages(3), dataBag(3), brain(2) |
| guardian | ~7 | integrations, logs, testEndpoint, logApiCall, initDemoLogs, stats |
| mioAgent | 5 | testDatabase, initSchema, getLogs, createLog, getLogById |
| tper | 2 | stops, sync |
| carbonCredits | 3 | config, fundTransactions, reimbursements |
| logs | 1 | system |
| users | 1 | analytics |
| sustainability | 1 | metrics |
| businesses | 1 | list |
| inspections | 1 | list |
| notifications | 1 | list |
| civicReports | 1 | list |
| mobility | 1 | list |

### Endpoint REST Separati (Non tRPC)
| Endpoint | Metodo | Funzione |
|----------|--------|----------|
| /api/auth/firebase/sync | POST | Sync utente Firebase → DB |
| /api/auth/firebase/verify | POST | Verifica token Firebase |
| /api/auth/firebase/me | GET | Info utente corrente |
| /api/auth/firebase/logout | POST | Logout + revoca token |
| /api/auth/login | POST | Legacy (deprecato) |
| /api/auth/register | POST | Registrazione Firebase Admin |
| /api/auth/config | GET | Config auth pubblica |

---

## SEZIONE 17: STATE MANAGEMENT FRONTEND

### 7 React Contexts
| Context | Scopo | Hook |
|---------|-------|------|
| FirebaseAuthContext | Auth globale + BRIDGE DB | useFirebaseAuth() |
| PermissionsContext | RBAC tab/quick access | usePermissions() |
| MioContext | Chat MIO + orchestrazione | useMio() |
| TransportContext | GTFS bus/treni | useTransport() |
| ThemeContext | Dark/Light mode | useTheme() |
| AnimationContext | Pausa polling durante mappa | useAnimation() |
| CivicReportsContext | Lista ↔ mappa segnalazioni | useCivicReports() |

### 11 Custom Hooks
| Hook | Scopo |
|------|-------|
| useAgentLogs | Messaggi da DB + WebSocket + polling |
| useComposition | Input IME (lingue asiatiche) |
| useConversationPersistence | Persistenza conversationId localStorage |
| useImpersonation | Impersonificazione comuni PA |
| useInternalTraces | Polling log agenti da Neon |
| useMapAnimation | Animazione mappa Leaflet |
| useMobile | Rilevamento viewport < 768px |
| useNearbyPOIs | GPS + check-in TCC automatico |
| useOrchestrator | Invio multi-agente via tRPC |
| usePersistFn | useCallback ottimizzato |
| useSystemStatus | Health check backend + PM2 |

### 5 API Client Modules
| Modulo | Scopo |
|--------|-------|
| orchestratorClient | Client REST Hetzner multi-agente |
| authClient | ARPA Toscana OAuth SPID/CIE/CNS |
| securityClient | RBAC + security events |
| logsClient | Guardian logs + health |
| suap | Pratiche SUAP + PDND |

---

## SEZIONE 18: COSA MANCA PER SCALARE A 8.000 MERCATI

### Priorita' Alta
| Area | Cosa Manca | Note |
|------|-----------|------|
| Sync System | Attivazione sincronizzazione bidirezionale | Schema pronto, logica da completare |
| Onboarding comuni | Flusso self-service per nuovi comuni | Oggi manuale via super-admin |
| Test automatizzati | Suite completa per tutte le funzioni | Solo type check oggi |
| Documentazione API | OpenAPI/Swagger per integratori | Guardian ha inventario parziale |
| Multi-tenancy | Isolamento dati per comune | Oggi filtro lato query |
| Performance | Paginazione server-side su tutte le liste | Alcune liste caricano tutto |

### Priorita' Media
| Area | Cosa Manca | Note |
|------|-----------|------|
| Notifiche push | Firebase Cloud Messaging | Solo notifiche in-app oggi |
| Export dati | CSV/PDF per report | Parzialmente implementato |
| Batch operations | Operazioni massive (es. rinnovo concessioni) | Una alla volta oggi |
| Offline mode | Service Worker per operatori senza rete | Non implementato |
| Audit trail UI | Dashboard per audit logs | Dati raccolti ma senza UI dedicata |
| Caching | Redis/in-memory per query frequenti | Solo React Query cache |

### Priorita' Bassa (Nice to have)
| Area | Cosa Manca | Note |
|------|-----------|------|
| i18n | Multilingua | Solo italiano oggi |
| PWA | Installazione come app nativa | Parzialmente configurato |
| Dark/Light per sezione | Tema personalizzabile per area | Solo toggle globale |
| Dashboard personalizzabili | Widget drag-and-drop | Layout fisso oggi |

---

## NOTE TECNICHE

### Stack Completo
- **Frontend**: React 19 + Vite 7 + Wouter + Tailwind 4 + shadcn/ui
- **Backend**: Express 4 + tRPC 11 + Drizzle ORM 0.44
- **Database**: PostgreSQL su Neon (serverless, 68 tabelle)
- **Auth**: Firebase + OAuth SPID/CIE/CNS
- **Mappe**: Leaflet + react-leaflet + GeoJSON
- **AI**: Multi-agente MIO/Manus/Abacus/Zapier/GPT Dev/Gemini
- **Pagamenti**: PagoPA via E-FIL
- **Trasporto**: GTFS TPER Bologna
- **Deploy**: Vercel (frontend) + Hetzner VPS con PM2 (backend)
- **Runtime**: Node.js 18+ / pnpm 10.4+

---

## APPENDICE A: RELAZIONE DIMENSIONALE E SPECIFICHE TECNICHE

### A.1 Dimensioni Codebase

| Metrica | Valore | Note |
|---------|--------|------|
| **Codice sorgente attivo** (TS + TSX) | **113.922** | client/src + server + drizzle + shared |
| Codice totale (incl. scripts, legacy, api/) | **118.793** | + scripts, _cantina, api/, src/ legacy |
| Documentazione (.md) | **9.920** | docs/, report, progetti, blueprint |
| Presentazioni e slide (HTML/JS) | **43.091** | audit_presentation/ + tech_slides/ |
| File di configurazione (JSON, YAML, etc.) | **~39.000** | package.json, tsconfig, drizzle, etc. |
| Migrazioni SQL | **373** | 7 file in migrations/ |
| **TOTALE PROGETTO** | **~218.000** | Tutto (escl. node_modules e .git) |
| | | |
| File TypeScript (.ts) | 73 | Solo sorgente attivo |
| File React (.tsx) | 183 | Solo sorgente attivo |
| File CSS | 1 | |
| File totali sorgente attivo | **256** | |
| Dimensione progetto (senza node_modules) | 71 MB | |
| Dimensione node_modules | 781 MB | |

### A.2 Distribuzione Codice per Area

| Area | Righe | % del totale | File |
|------|-------|-------------|------|
| Componenti UI (`components/`) | 68.201 | 59.9% | 139 |
| Pagine (`pages/`) | 24.524 | 21.5% | 34 |
| Server backend (`server/`) | 11.277 | 9.9% | 35 |
| Schema DB (`drizzle/`) | 1.953 | 1.7% | - |
| Hooks (`hooks/`) | 1.611 | 1.4% | 11 |
| Contexts (`contexts/`) | 1.589 | 1.4% | 7 |
| API clients (`api/`) | 1.394 | 1.2% | 5 |
| Utilities (`lib/`) | 742 | 0.7% | - |
| Shared (`shared/`) | 31 | 0.0% | - |

### A.3 Complessita' del Codice

| Indicatore | Conteggio |
|------------|-----------|
| Export functions/constants | 517 |
| React components esportati | 126 |
| Type/Interface definitions | 587 |
| Procedure tRPC (query + mutation) | 119 |
| useQuery/useMutation hooks | 47 |
| useState calls | 562 |
| useEffect calls | 250 |
| Try-catch blocks | 550 |
| Conditional renders (JSX &&) | 1.021 |
| Ternary operators | 2.225 |

### A.4 Media per File

| Metrica | Valore |
|---------|--------|
| Media righe per pagina | 721 |
| Media righe per componente (escl. UI base) | 717 |
| Media righe per file server | 322 |

### A.5 Top 10 File piu' Grandi (Complessita' Concentrata)

| # | File | Righe | Area Funzionale |
|---|------|-------|-----------------|
| 1 | DashboardPA.tsx | 7.154 | Dashboard principale PA (14 tab) |
| 2 | GestioneMercati.tsx | 4.154 | Gestione mercati + mappa |
| 3 | ControlliSanzioniPanel.tsx | 3.365 | Controlli e sanzioni |
| 4 | WalletPanel.tsx | 2.982 | Wallet + PagoPA |
| 5 | MarketCompaniesTab.tsx | 2.945 | Operatori in mercato |
| 6 | Integrazioni.tsx | 2.749 | API keys, webhooks |
| 7 | GamingRewardsPanel.tsx | 2.655 | TCC e gamification |
| 8 | ComuniPanel.tsx | 2.617 | Gestione comuni |
| 9 | MappaItaliaComponent.tsx | 2.504 | Mappa Italia |
| 10 | SuapPanel.tsx | 2.367 | SUAP pratiche |

### A.6 Dipendenze

| Tipo | Conteggio |
|------|-----------|
| Dipendenze produzione | 83 |
| Dipendenze sviluppo | 24 |
| **Totale dipendenze** | **107** |

**Principali per area:**
- **UI**: React 19, Tailwind 4, shadcn/ui (53 componenti), Lucide (110 icone)
- **Mappe**: Leaflet, react-leaflet, GeoJSON
- **Backend**: Express 4, tRPC 11, Drizzle ORM 0.44
- **Database**: postgres (postgres-js), Neon serverless
- **Auth**: Firebase, OAuth
- **Pagamenti**: Integrazione PagoPA/E-FIL

### A.7 Database

| Metrica | Valore |
|---------|--------|
| Tabelle | 69 |
| Enum PostgreSQL | 13 |
| Indici | 56 |
| Migrazioni SQL | 7 |
| Righe schema.ts | 1.953 |

### A.8 Rotte e API

| Metrica | Valore |
|---------|--------|
| Rotte frontend (Wouter) | 36 |
| Router tRPC registrati | 30 |
| Procedure tRPC totali | ~140 |
| Endpoint REST separati | 7 |
| shadcn/ui componenti base | 53 |

### A.9 Git Repository

| Metrica | Valore |
|---------|--------|
| Commit totali | 62 |
| Contributori | 5 |
| Contributore principale | chcndr-sys (26 commit) |
| AI contributors | Manus AI (11), Claude (10), Manus System (7) |

### A.10 Infrastruttura di Deploy

| Componente | Servizio | Localita' |
|------------|----------|-----------|
| Frontend | Vercel (auto-deploy) | Edge global |
| Backend tRPC | Hetzner VPS 157.90.29.66 | Germania |
| Database | Neon PostgreSQL serverless | EU |
| Auth | Firebase | Google Cloud |
| Orchestratore | Hetzner (PM2) | Germania |
| GTFS API | api.mio-hub.me | Hetzner |

### A.11 Riepilogo Architettonico

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                       │
│  React 19 + Vite 7 + Wouter + Tailwind 4 + shadcn/ui     │
│  113.922 LOC | 256 files | 36 routes | 126 components    │
├──────────────────────────────────────────────────────────┤
│                         │                                  │
│                    tRPC Client                             │
│                  (SuperJSON transformer)                   │
│                         │                                  │
├──────────────────────────────────────────────────────────┤
│                   BACKEND (Hetzner)                        │
│  Express 4 + tRPC 11 + Drizzle ORM                        │
│  11.277 LOC | 35 files | 140 procedures | 30 routers     │
├──────────────────────────────────────────────────────────┤
│                         │                                  │
│                    Drizzle ORM                             │
│                    (postgres-js)                           │
│                         │                                  │
├──────────────────────────────────────────────────────────┤
│                   DATABASE (Neon)                          │
│  PostgreSQL serverless                                     │
│  69 tabelle | 13 enum | 56 indici | 17 aree funzionali  │
└──────────────────────────────────────────────────────────┘

Servizi Esterni:
├─ Firebase Auth (SPID/CIE/CNS + Google + Apple + Email)
├─ PagoPA/E-FIL (Pagamenti pubblici)
├─ TPER GTFS (Trasporto Bologna)
├─ Orchestratore Multi-Agente (MIO/Manus/Abacus/Zapier)
└─ ARPA Toscana OAuth
```
