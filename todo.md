# DMS Hub - App Clienti - TODO

## Fase 1: Setup Progetto e Configurazione Base PWA
- [x] Inizializzazione progetto con webdev_init_project
- [x] Installazione dipendenze (leaflet, react-leaflet, qrcode.react, axios)
- [ ] Configurazione PWA (manifest.webmanifest + service worker) - TODO NEXT
- [x] Setup routing con wouter per 5 pagine
- [x] Configurazione tema e colori DMS
- [x] Download dati demo da dms-gemello-core

## Fase 2: Implementazione MapPage con Leaflet e Dati Grosseto
- [x] Installare leaflet e react-leaflet
- [x] Creare componente MapPage
- [x] Integrare dati GeoJSON Grosseto (grosseto_complete.json)
- [x] Implementare visualizzazione marker mercati/hub/negozi
- [ ] Aggiungere filtri per categoria - TODO
- [ ] Implementare clustering marker - TODO
- [ ] Aggiungere controlli mappa (zoom, layer switcher) - TODO
- [x] Testare geolocalizzazione utente

## Fase 3: Implementazione WalletPage con QR Code e Storico
- [x] Installare qrcode.react
- [x] Creare componente WalletPage
- [x] Implementare visualizzazione saldo eco-crediti
- [x] Generare QR code personale utente
- [x] Creare storico transazioni
- [x] Aggiungere dashboard impatto ambientale (CO₂, alberi, km)
- [x] Implementare gamification (badge, livelli)
- [x] Testare funzionalità wallet

## Fase 4: Implementazione CivicPage, RoutePage e VetrinePage
- [x] **CivicPage**: Form segnalazione problemi urbani
- [ ] **CivicPage**: Upload foto (max 3) - Placeholder
- [x] **CivicPage**: Geolocalizzazione automatica
- [x] **CivicPage**: Selezione categoria problema
- [x] **RoutePage**: Pianificazione itinerari multi-stop
- [x] **RoutePage**: Algoritmo TSP per percorso ottimale (mock)
- [x] **RoutePage**: Calcolo CO₂ risparmiata
- [x] **RoutePage**: Integrazione modalità trasporto
- [x] **VetrinePage**: Catalogo negozi aderenti
- [x] **VetrinePage**: Scheda negozio con dettagli
- [x] **VetrinePage**: Griglia prodotti
- [x] **VetrinePage**: Funzione prenota prodotto

## Fase 5: Setup Backend Mock API e Integrazione
- [ ] Creare server Express mock per API
- [ ] Implementare endpoint /api/geo/shops/near
- [ ] Implementare endpoint /api/wallet/me
- [ ] Implementare endpoint /api/wallet/history
- [ ] Implementare endpoint /api/civic (POST)
- [ ] Implementare endpoint /api/route/plan
- [ ] Implementare endpoint /api/catalog/shops
- [ ] Configurare proxy Vite per API
- [ ] Testare integrazione frontend-backend

## Fase 6: Test, Ottimizzazione PWA e Deploy
- [ ] Configurare Service Worker per offline
- [ ] Testare installabilità PWA
- [ ] Ottimizzare performance (lazy loading, caching)
- [ ] Test responsive su mobile (360px-480px)
- [ ] Test accessibilità WCAG AA
- [ ] Build produzione
- [ ] Verificare funzionamento offline
- [ ] Test completo su dispositivi reali

## Fase 7: Consegna Finale con Documentazione
- [ ] Creare README.md con istruzioni
- [ ] Documentare API endpoints
- [ ] Preparare guida deploy
- [ ] Creare checkpoint finale
- [ ] Consegnare codice e documentazione


## NUOVE RICHIESTE - Ottimizzazione Mobile

### Design e Layout Mobile
- [ ] Ottimizzare header per mobile (dimensioni, spaziatura)
- [ ] Migliorare info box mappa per schermi piccoli
- [ ] Ottimizzare bottom navigation per touch (dimensioni minime 44x44px)
- [ ] Verificare leggibilità testi su mobile
- [ ] Ottimizzare card e spaziature per smartphone
- [ ] Testare su dimensioni reali iPhone/Android (375x667, 390x844, 414x896)

### Usabilità Mobile
- [ ] Aumentare dimensioni pulsanti per touch
- [ ] Migliorare contrasto colori per leggibilità outdoor
- [ ] Ottimizzare form per input mobile
- [ ] Aggiungere feedback tattile (vibrazione) per azioni
- [ ] Testare scroll e gesture su tutte le pagine

### Performance Mobile
- [ ] Ottimizzare caricamento mappa su connessioni lente
- [ ] Ridurre dimensioni immagini e asset
- [ ] Implementare lazy loading per contenuti


## TASK IMMEDIATI - Applicazione Palette DMS e Ottimizzazione Mobile

### Palette Colori DMS
- [x] Applicare sfondo scuro `#0b1220` come background principale
- [x] Usare verde `#14b8a6` per header, pulsanti primari, accenti
- [x] Usare azzurro chiaro `#e8fbff` per testi su sfondo scuro
- [x] Usare teal `#9bd6de` per accenti secondari
- [x] Rimuovere tema verde chiaro attuale, passare a dark mode

### Bottom Navigation Fissa
- [x] Aggiungere bottom navigation fissa su TUTTE le pagine
- [x] Dimensioni minime 56px altezza per touch
- [x] Icone + label per ogni sezione
- [x] Indicatore pagina attiva con colore `#14b8a6`

### Ottimizzazioni Mobile
- [x] Header più compatto (ridurre padding)
- [x] Pulsanti touch-friendly (minimo 44x44px)
- [ ] Aumentare contrasto testi per leggibilità outdoor
- [ ] Ottimizzare card con più padding/margin


### Simulatore Mobile Interattivo
- [x] Creare pagina HTML con iframe simulatore smartphone
- [x] Dimensioni reali iPhone 13 Pro (390x844px)
- [x] Navigazione completa nell'app
- [x] Deploy su server locale per test


## BUG DA RISOLVERE

### MapPage - Mappa non visibile
- [x] Fix caricamento mappa Leaflet
- [x] Verificare CSS Leaflet importato correttamente
- [x] Controllare altezza container mappa
- [x] Testare visualizzazione mappa su mobile


## NUOVE RICHIESTE UTENTE

### Fix MapPage - Popup Filtri
- [x] Spostare popup filtri in basso per non coprire controlli zoom (+/-)
- [ ] Rendere popup filtri chiudibile/minimizzabile
- [ ] Ottimizzare posizionamento controlli mappa

### HomePage - Mappa Italia e Rete Gemello Digitale
- [x] Creare nuova HomePage come landing page
- [x] Sfondo con immagine mappa Italia
- [x] Visualizzazione rete gemello digitale (nodi mercati/hub connessi)
- [x] Pulsanti per accedere alle 5 sezioni app (Mappa, Wallet, Civic, Route, Vetrine)
- [x] Design con tema DMS dark mode

### Ricerca Intelligente Multi-Criterio
- [x] Barra di ricerca in HomePage
- [x] Ricerca per: mercato, hub, città, azienda, servizio, categoria
- [x] Filtro automatico "aperti oggi"
- [x] Ordinamento per "più vicini a te"
- [x] Lista risultati con dettagli (nome, distanza, orari, stato aperto/chiuso)
- [x] Click su risultato → navigazione a MapPage con parametri URL

### Flusso Navigazione Completo
- [x] HomePage → MapPage (navigazione con parametri lat/lng/zoom/id)
- [x] MapPage → Click marker → Popup descrizione
- [x] Popup → Pulsante "Vedi dettagli" → Modal Vetrina (scheda negozio con immagini)
- [ ] Modal Vetrina → Pulsante "Shop Route Etico" → RoutePage (percorso ottimizzato) - TODO
- [ ] Passaggio parametri tra pagine (ID negozio, coordinate, ecc.)


### Immagine Sfondo Italia
- [x] Generare immagine mappa Italia con rete gemello digitale
- [x] Sfondo blu scuro DMS (#0b1220)
- [x] Italia in teal chiaro (#14b8a6 / #9bd6de)
- [x] Rete diffusa con nodi città italiane
- [x] Effetto luci illuminate sui nodi
- [x] Linee illuminate tra nodi con effetto glow


### Modal Vetrina Negozio Full-Screen
- [x] Implementare modal full-screen per dettagli negozio
- [x] Pulsante "Vedi dettagli" nel popup marker apre modal
- [x] Modal con header (nome negozio + X per chiudere)
- [x] Galleria immagini prodotti/vetrina
- [x] Tab navigazione interna (Prodotti, Info, Contatti)
- [x] Sezione info con orari, certificazioni, descrizione
- [x] Pulsante "Shop Route Etico" per pianificare percorso
- [x] Click X chiude modal e torna alla mappa
- [x] Animazione apertura/chiusura smooth


## NUOVE RICHIESTE UTENTE - Miglioramenti Modal e Mappa

### Tab Home nel Modal Vetrina
- [x] Aggiungere tab "Home" come prima scheda del modal
- [x] Mostrare immagine vetrina/logo negozio grande
- [x] Ordine tab: Home → Prodotti → Info → Contatti
- [x] Design responsive per immagine vetrina

### Auto-caricamento Indirizzo in RoutePage
- [x] Quando si clicca "Shop Route Etico" passare indirizzo negozio
- [x] RoutePage legge parametri URL e carica indirizzo automaticamente
- [x] Campo destinazione pre-compilato e pronto per calcolo percorso

### Barra Filtri/Ricerca Toggle Laterale
- [x] Rimuovere barra filtri/ricerca fissa in basso sulla mappa
- [x] Aggiungere pulsante toggle laterale (sotto +/- zoom)
- [ ] Click apre/chiude pannello filtri e ricerca
- [ ] Pannello slide-in da destra o sinistra
- [ ] Chiusura automatica dopo selezione filtro

### Negozi Diversificati per Categoria
- [x] Creare 13 negozi con 5 categorie diverse
- [x] Categorie: Alimentari (3), Abbigliamento (3), Artigianato (3), Libri (2), Elettronica (2), Fiori, Caffè, Farmacia, ecc.
- [x] Ogni negozio con prodotti specifici per categoria
- [x] Testare visualizzazione negozi per categoria dalla HomePage
- [ ] Verificare filtri per categoria sulla MapPage


## INTEGRAZIONE BACKEND DMS-BACKEND

- [ ] Creare file API client (src/utils/api.ts) per chiamate backend
- [ ] Configurare base URL backend (http://localhost:8000/api/v1)
- [ ] Sostituire dati mock HomePage con API GET /geo/search
- [ ] Sostituire dati mock MapPage con API GET /geo/markets/:id/shops
- [ ] Sostituire dati mock ShopModal con API GET /shop/:id
- [ ] Sostituire prodotti mock con API GET /shop/:id/products
- [ ] Implementare booking prodotti con API POST /shop/:id/book
- [ ] Gestire errori API e loading states
- [ ] Test integrazione completa con backend
- [ ] Verificare log real-time nella dashboard backend


## NUOVO - Pagina HUB OPERATORE (6 Nov 2025) 🏪

### Setup Pagina
- [x] Creare route `/hub-operatore`
- [x] Creare componente HubOperatore.tsx
- [x] Layout dashboard con sidebar
- [x] Header con info operatore

### Dashboard Statistiche
- [x] Card vendite giornaliere
- [x] Card carbon credit assegnati
- [x] Card clienti serviti
- [x] Grafico vendite settimanali (mock data)
- [x] Lista ultime transazioni

### Scanner QR Code
- [x] Componente Scanner con camera (placeholder)
- [ ] Libreria html5-qrcode - TODO: Implementare scanner reale
- [x] UI scanner fullscreen
- [x] Form assegnazione carbon credit
- [x] Calcolo automatico crediti da certificazioni (UI pronta)

### Gestione Presenze
- [x] Pulsante Check-in / Check-out
- [x] Visualizzazione orario corrente
- [x] Storico presenze settimana (mock data)
- [ ] Integrazione API backend - TODO

### Chat AI Operatori
- [x] ChatWidget disponibile (stesso dell'app clienti)
- [ ] Intent recognition specifici per operatori - TODO
- [ ] Suggerimenti contestuali per operatori - TODO

### Backend API
- [ ] POST /vendor/checkin - TODO
- [ ] POST /vendor/checkout - TODO
- [ ] GET /vendor/stats - TODO
- [ ] POST /vendor/assign-carbon - TODO
- [ ] GET /vendor/attendance - TODO


## NUOVO - Ottimizzazione ChatWidget Mobile (6 Nov 2025) 📱

### Problemi da Risolvere
- [x] ChatWidget non ottimizzato per smartphone
- [x] Dimensioni finestra chat su mobile
- [x] Layout responsive messaggi
- [x] Input field e tastiera mobile
- [x] Suggerimenti troppo piccoli
- [x] Header chat su mobile

### Fix da Implementare
- [x] Media query per schermi < 768px (max-md:)
- [x] Chat fullscreen su mobile (max-md:inset-0 w-full h-full)
- [x] Pulsante chiudi visibile (min-w-[44px] min-h-[44px])
- [x] Input field sticky bottom (già implementato)
- [x] Suggerimenti scroll orizzontale (overflow-x-auto)
- [x] Font size ottimizzato mobile (text-base md:text-sm)


## URGENTE - Fix Errore ChatWidget iPhone (6 Nov 2025) 🔴

### Problemi Rilevati
- [ ] "Console Error - Load failed" su iPhone reale
- [ ] Badge "1 error" rosso in basso
- [ ] Suggerimenti non caricano
- [ ] Possibile problema connessione backend
- [ ] Possibile problema CORS

### Verifiche da Fare
- [ ] Backend status (running/stopped)
- [ ] Backend logs per errori
- [ ] CORS headers configurazione
- [ ] API endpoint accessibilità da mobile
- [ ] Network connectivity iPhone → Backend

### Fix da Implementare
- [ ] Configurare CORS correttamente
- [ ] Aggiungere error handling migliore
- [ ] Fallback se backend non disponibile
- [ ] Retry logic per API calls
- [ ] Toast notification per errori utente


## URGENTE - ChatWidget Fullscreen Reale iPhone (6 Nov 2025) 📱

### Problema
- [x] ChatWidget NON è fullscreen su iPhone
- [x] Appare come finestra quadrata con bordi neri
- [x] Classi max-md:inset-0 non funzionano correttamente
- [x] Serve rimuovere fixed bottom-6 right-6 su mobile
- [ ] ChatWidget va SOTTO barra Safari
- [ ] Input field coperto dalla barra strumenti
- [ ] Tastiera non si apre correttamente

### Fix da Implementare
- [x] Rimuovere posizionamento fixed su mobile
- [x] Usare position fixed con top:0 left:0 right:0 bottom:0
- [x] Rimuovere border-radius su mobile
- [x] Rimuovere shadow su mobile
- [x] Usare 100dvh invece di 100vh per Safari iOS
- [x] Aggiungere padding safe-area-inset-bottom
- [ ] Gestire viewport dinamico con tastiera aperta
- [ ] Testare su iPhone reale

## NUOVO - Ottimizzazione Mobile Tutte Pagine (6 Nov 2025) 📱

### Pagine da Ottimizzare
- [ ] HomePage - Hero fullscreen, card navigazione touch-friendly
- [ ] MapPage - Mappa fullscreen, modal ottimizzata
- [ ] WalletPage - Layout carbon credits mobile
- [ ] RoutePage - Percorsi fullscreen
- [ ] CivicPage - Form segnalazioni mobile
- [ ] HubOperatore - Dashboard mobile-first

### Fix Comuni
- [ ] Rimuovere/compattare header su mobile
- [ ] Usare 100dvh per altezza viewport
- [ ] Safe-area-inset per iPhone
- [ ] Font size ottimizzato (16px minimo)
- [ ] Touch targets 44x44px minimo
- [ ] Padding responsive


## URGENTE - Fix Pulsante Cerca HomePage (7 Nov 2025) 🔍

### Problema
- [x] Pulsante "Cerca" collegato a API backend
- [x] Query SQL cerca in nome, categoria, indirizzo
- [ ] Indirizzi VUOTI nel database!
- [ ] Mancano markets e hubs nella ricerca
- [ ] Ricerca "Grosseto" non trova nulla

### Fix da Implementare
- [x] Collegare pulsante Cerca a API /api/v1/geo/search
- [x] Query SQL multi-campo (nome, categoria, indirizzo)
- [x] Aggiornare database con indirizzi completi (10/13 shops)
- [x] Ricerca "Grosseto" funzionante (10 risultati)
- [ ] Aggiungere markets alla ricerca - TODO
- [ ] Aggiungere hubs alla ricerca - TODO
- [ ] Ricerca multi-tabella (UNION shops + markets + hubs) - TODO
- [ ] Testare su iPhone


## Dashboard PA - Sezione Logs (7 Nov 2025) 📋

### Tab Logs Completa
- [ ] Aggiungere tab "Logs" nella Dashboard PA
- [ ] Implementare filtri per app (DMS, SUAP, APP Operatori, APP Clienti, WebApp PM)
- [ ] Filtri per tipo evento (check-in, vendita, segnalazione, route, ecc.)
- [ ] Filtri per livello (info, warning, error)
- [ ] Timeline eventi real-time con scroll infinito
- [ ] Statistiche errori per applicativo
- [ ] Live stream logs con WebSocket
- [ ] Export logs CSV/JSON
- [ ] Ricerca full-text nei logs
- [ ] Dettaglio evento espandibile (click su log)


## Dashboard PA - Agente AI (7 Nov 2025) 🤖

### Tab Agente AI
- [ ] Aggiungere tab "Agente AI" nella Dashboard PA
- [ ] Chat interface completa con storico conversazioni
- [ ] Intent recognition specifici per PA (analytics, report, alert)
- [ ] Query dati in linguaggio naturale ("Quanti utenti oggi a Grosseto?")
- [ ] Suggerimenti contestuali basati su dati dashboard
- [ ] Generazione report automatici da prompt
- [ ] Alert intelligenti e notifiche proattive
- [ ] Export conversazioni e report generati
- [ ] Integrazione con backend AI/LLM
- [ ] Accesso dati real-time per risposte accurate


## Dashboard PA - Sicurezza (7 Nov 2025) 🔐

### Tab Sicurezza
- [ ] Aggiungere tab "Sicurezza" nella Dashboard PA
- [ ] Audit log accessi (chi, quando, cosa, da dove)
- [ ] Gestione utenti e ruoli (PA, Operatori, Admin)
- [ ] Permessi granulari per sezione
- [ ] Alert sicurezza real-time (tentativi accesso, anomalie)
- [ ] Scan vulnerabilità automatico
- [ ] Report compliance GDPR
- [ ] Gestione sessioni attive
- [ ] 2FA (Two-Factor Authentication)
- [ ] IP whitelist/blacklist

## Dashboard PA - Debug & Sviluppo (7 Nov 2025) 🔧

### Tab Debug & Dev
- [ ] Aggiungere tab "Debug & Dev" nella Dashboard PA
- [ ] Ricerca guasti automatica (error detection)
- [ ] Riparatore codice con auto-fix
- [ ] Console logs live da tutti i sistemi
- [ ] Bug tracker integrato con priorità
- [ ] Deploy manager (staging/production)
- [ ] Rollback versioni precedenti
- [ ] Performance metrics (CPU, RAM, latency)
- [ ] Health check sistemi automatico
- [ ] Database query analyzer
- [ ] API response time monitor
- [ ] Code coverage e test results


## Dashboard PA - Gestione Carbon Credits (7 Nov 2025) 💰

### Tab Carbon Credits - Sistema Economico Completo
- [x] Aggiungere tab "Carbon Credits" nella Dashboard PA
- [x] **Fondo Liquidità**: Saldo, entrate (Regione/Comuni/TPAS), uscite, previsioni
- [x] **Impostazioni Valore**: Valore corrente 1 CC = X €, storico variazioni
- [x] **Manopola Politica**: Slider per regolare valore con simulatore impatto
- [x] **Regolazione per Area**: Valori diversi per territorio (Grosseto, Follonica, ecc.)
- [x] **Regolazione per Categoria**: Boost per BIO, KM0, DOP, certificazioni
- [x] **Sistema Rimborsi Negozi**: Pending, processati, batch payment, export CSV
- [x] **Analytics Economici**: Crediti emessi vs spesi, tasso utilizzo, ROI
- [x] **Integrazione TPAS**: Stub API, mapping ecocrediti, conversione automatica
- [ ] **Alert**: Soglia minima fondo, necessità ricarica, anomalie (Backend)
- [ ] **Audit Trail**: Storico modifiche valore, chi/quando/perché (Backend)
- [ ] **Previsioni AI**: Machine learning per ottimizzare valore e fondo (Futuro)


## Dashboard PA - Qualificazione Imprese (7 Nov 2025) 🏪

### Sistema Gestione Point Abilitati
- [x] Aggiungere tab "Qualificazione Imprese" nella Dashboard PA
- [x] **Requisiti Abilitazione**: DURC, tributi, POS/cassa, P.IVA, CCIAA (documentato)
- [x] **Formazione Obbligatoria**: Primo soccorso, antincendio, sicurezza, HACCP, GDPR (documentato)
- [x] **Score Qualificazione**: 0-100 con semaforo rosso/giallo/verde (implementato)
- [x] **Notifiche Automatiche**: Email/push 60/30/7 giorni prima scadenza (documentato)
- [x] **Instradamento Formatori**: Lista accreditati, calendario, preventivi (documentato)
- [x] **Dataset Imprese**: Upload certificati, firma digitale, validazione (documentato)
- [x] **Dashboard Imprenditore**: Checklist, score, scadenze, corsi (documentato)
- [x] **Analytics PA**: % conformi, trend formazione, score territorio (implementato)
- [x] **Demografia Imprese**: Aperture/cessazioni, sesso, età, provenienza (implementato)
- [x] **Indici Strategici**: Riqualificazione, digitalizzazione, sostenibilità (implementato)
- [x] **Sistema Bandi**: Matching AI, notifiche, pre-compilazione, tracking (documentato)
- [x] **7 Nuove Tabelle DB**: businesses, documents, requirements, courses, trainers, grants, applications (documentato)
- [ ] **Backend API**: Implementare 20+ endpoints per gestione imprese (Da fare)
- [ ] **Sistema Notifiche**: Cron job per alert automatici (Da fare)
- [ ] **Upload Documenti**: Interfaccia caricamento certificati (Da fare)


## Dashboard PA - Ottimizzazione UI (7 Nov 2025) 🎨
- [x] Ridisegnare TabsList con icone compatte invece di testo lungo
- [x] Aggiungere indicatore colore per tab attiva (ogni tab ha colore distintivo)
- [x] Assicurare tutte le 13 tab visibili senza overflow (flex-wrap)
- [x] Responsive design per mobile (icone sempre visibili, testo nascosto su small)


## Dashboard PA - Redesign Navigazione Tab (7 Nov 2025) 🎨
- [x] Trasformare TabsList in griglia pulsanti card stile "Accesso Rapido"
- [x] Cambio colore pulsante quando tab attiva (background pieno + shadow)
- [x] Layout griglia responsive (2/4/7 colonne)
- [x] Icone grandi (h-6 w-6) + label sotto


## Backend + Database Implementation (7 Nov 2025) ⚙️

### Setup Database
- [ ] Aggiungere feature web-db-user al progetto
- [ ] Creare schema database 15 tabelle con relazioni
- [ ] Aggiungere indici per performance
- [ ] Configurare Drizzle ORM

### Seed Data
- [ ] 450 imprese con score qualificazione
- [ ] 15.000+ utenti con wallet e carbon credits
- [ ] 12 mercati territorio Grosseto
- [ ] 156 negozi/ambulanti
- [ ] 24.000+ transazioni
- [ ] Certificati, formazione, bandi

### API Endpoints (40+)
- [ ] **Analytics** (10): overview, clienti, mercati, prodotti, sostenibilità, TPAS
- [ ] **Carbon Credits** (8): fondo, valore, regolazione, rimborsi, analytics
- [ ] **Qualificazione Imprese** (12): score, scadenze, formazione, bandi, demografia
- [ ] **Real-time** (5): logs, status, eventi, metriche
- [ ] **TPAS** (5): stub per integrazione futura

### Integrazione Dashboard PA
- [ ] Sostituire mock data con API calls
- [ ] Implementare loading states
- [ ] Error handling e retry logic
- [ ] Real-time updates con polling/WebSocket


## Dashboard PA - 5 Nuove Sezioni (7 Nov 2025) 🆕

### Tab Segnalazioni Civiche + IoT 📡 (Emilia-Romagna)
- [x] Aggiungere tab "Segnalazioni & IoT"
- [ ] **Sezione Segnalazioni Civiche**: Lista civic_reports da database
- [ ] Filtri per tipo (commercianti, clienti, tipo problema)
- [ ] Workflow gestione (pending → assigned → in_progress → resolved)
- [ ] Dettaglio segnalazione con foto e mappa
- [ ] Assegnazione a operatore/ufficio competente
- [ ] **Sezione Sensori IoT**: Qualità aria ARPAE Emilia-Romagna (API)
- [ ] Meteo real-time OpenWeatherMap (API gratuita)
- [ ] Dashboard sensori con grafici trend
- [ ] Alert anomalie ambientali
- [ ] Mappa sensori urbani Bologna e hub regionali

### Tab Utenti Imprese 🏪
- [x] Aggiungere tab "Utenti Imprese"
- [ ] Lista imprese registrate con filtri
- [ ] Statistiche utilizzo per impresa
- [ ] Dettaglio account business (vendite, crediti, rating)
- [ ] Gestione abbonamenti/piani
- [ ] Analytics comportamento imprese
- [ ] Export report imprese

### Tab Controlli/Sanzioni ⚖️
- [x] Aggiungere tab "Controlli/Sanzioni"
- [ ] Calendario ispezioni programmate
- [ ] Lista verifiche conformità (DURC, HACCP, sicurezza)
- [ ] Registro sanzioni emesse
- [ ] Workflow controllo (pianifica → esegui → report)
- [ ] Dashboard conformità per settore
- [ ] Alert scadenze controlli

### Tab Notifiche 🔔
- [x] Aggiungere tab "Notifiche"
- [ ] Centro notifiche unificato (push, email, SMS)
- [ ] Crea nuova notifica con targeting
- [ ] Template notifiche predefiniti
- [ ] Storico notifiche inviate
- [ ] Analytics aperture/click
- [ ] Scheduling notifiche future

### Tab Centro Mobilità 🚗 (Emilia-Romagna)
- [x] Aggiungere tab "Centro Mobilità"
- [ ] **Trasporti Pubblici**: Integrazione GTFS TPER (Trasporto Passeggeri Emilia-Romagna)
- [ ] Fermate bus/tram Bologna con prossime corse real-time
- [ ] Mappa linee urbane Bologna (tram + bus)
- [ ] Orari e percorsi TPER
- [ ] **Traffico**: Mappa traffico real-time (OpenStreetMap)
- [ ] Stato parcheggi Bologna
- [ ] Alert eventi traffico
- [ ] Statistiche flussi mobilità regionale
- [ ] Integrazione ZTL Bologna e varchi


## Dashboard PA - 3 Tab Finali (7 Nov 2025) 🎯
- [x] Aggiungere tab "Report" (placeholder)
- [x] Aggiungere tab "Integrazioni" (placeholder)
- [x] Aggiungere tab "Impostazioni" (placeholder)
- [x] Completare barra navigazione a 21 tab totali


## Collegamento Database Completo (7 Nov 2025) 🔗

### Estensione Schema Database
- [ ] Aggiungere tabelle: user_analytics, sustainability_metrics, notifications, inspections, business_analytics
- [ ] Eseguire db:push per aggiornare schema

### Seed Data Completi
- [ ] Seed user_analytics (trasporti, provenienza, rating)
- [ ] Seed sustainability_metrics (CO₂, rating popolazione)
- [ ] Seed notifications (push, email, SMS)
- [ ] Seed inspections (controlli, sanzioni, multe)
- [ ] Seed business_analytics (vendite, crediti per impresa)

### API Endpoints (30+)
- [ ] analytics.users - Analytics clienti
- [ ] analytics.sustainability - Metriche sostenibilità
- [ ] analytics.tpas - E-commerce vs fisico
- [ ] businesses.list - Lista imprese
- [ ] businesses.analytics - Analytics per impresa
- [ ] inspections.list - Controlli programmati
- [ ] inspections.violations - Sanzioni
- [ ] notifications.list - Notifiche inviate
- [ ] notifications.stats - Open/click rate
- [ ] civicReports.list - Segnalazioni civiche
- [ ] iotSensors.airQuality - Dati ARPAE (stub)
- [ ] mobility.tper - Dati TPER (stub)

### Collegamento Dashboard PA
- [ ] Tab Clienti → API reali
- [ ] Tab Prodotti → API reali
- [ ] Tab Sostenibilità → API reali
- [ ] Tab TPAS → API reali
- [ ] Tab Carbon Credits → API reali (già fatto parzialmente)
- [ ] Tab Qualificazione → API reali
- [ ] Tab Segnalazioni & IoT → API reali
- [ ] Tab Utenti Imprese → API reali
- [ ] Tab Controlli/Sanzioni → API reali
- [ ] Tab Notifiche → API reali
- [ ] Tab Real-time → API reali (già fatto parzialmente)


## Fix Agente AI Dashboard PA (7 Nov 2025) 🤖
- [x] Implementare stato chat (useState per messaggi)
- [x] Fix pulsante "Invia" con onClick handler
- [x] Aggiungere logica invio messaggio
- [x] Implementare risposta simulata AI
- [ ] Scroll automatico a nuovo messaggio (Da implementare)
- [x] Testare funzionamento completo


## Fix Carbon Credits - Manopola Politica (7 Nov 2025) 💰
- [x] Implementare stato slider (useState per valore TCC)
- [x] Fix pulsante "Applica Modifiche" con onClick handler
- [x] Slider range da 0€ a 5€ (step 0.10€)
- [x] Formato valuta italiana con virgola (1,50€)
- [x] Mostrare preview impatto prima di applicare (simulatore)
- [x] Testare funzionamento completo


## Simulatore Completo Carbon Credits (7 Nov 2025) 🎮
- [x] Ricalcolo automatico Regolazione Area quando cambia slider
- [x] Ricalcolo automatico Regolazione Categoria quando cambia slider
- [x] Campi editabili boost % per ogni area (input number)
- [x] Campi editabili boost % per ogni categoria (input number)
- [x] Campo editabile Saldo Fondo (input number)
- [x] Campo editabile Burn Rate (input number)
- [x] Ricalcolo real-time mesi rimanenti (automatico)
- [x] Ricalcolo real-time incremento spesa (nel simulatore)
- [x] Testare simulazioni complete


## Parametri TCC Emessi/Spesi Editabili (7 Nov 2025) 📊
- [x] Aggiungere campo editabile TCC Emessi
- [x] Aggiungere campo editabile TCC Spesi
- [x] Calcolo automatico Velocity (% utilizzo)
- [x] Calcolo automatico impatto su fondo (rimborsi necessari)
- [x] Sezione "Impatto Fondo Liquidità" con copertura %
- [ ] Prospetti finanziari con scenari what-if
- [ ] Testare simulazioni complete


## Calcoli CO₂ e Alberi Dinamici (7 Nov 2025) 🌳
- [x] Calcolo dinamico kg CO₂ risparmiati basato su TCC spesi
- [x] Calcolo equivalenza alberi piantati (1 albero = ~22 kg CO₂/anno)
- [x] Collegamento a parametri editabili simulatore
- [x] Aggiornamento real-time valori nella sezione ROI Sostenibilità
- [x] Formula: CO₂ = TCC_Spesi × 0.06 kg (fattore conversione)
- [x] Formula: Alberi = CO₂ / 22
- [x] Visualizzazione formule sotto i valori per trasparenza
- [ ] Testare con valori diversi TCC Spesi


## Espansione Backend API - Dashboard PA (7 Nov 2025) 🔌
- [x] Analizzare tab con mock data (Segnalazioni IoT, Utenti Imprese, Controlli, Notifiche, Mobilità)
- [x] Verificare tabelle database esistenti e identificare mancanti
- [x] Analizzare metadati TPER Bologna (formato GTFS)
- [x] Creare tabella mobility_data con struttura GTFS-like
- [x] Creare endpoint tRPC mobility.list
- [x] Aggiornare seed.ts con 20 mobility data (12 bus + 5 tram + 3 parking)
- [ ] Collegare hook useDashboardData() a nuovi endpoint (fase successiva)
- [ ] Sostituire mockData con dati reali nel frontend (fase successiva)
- [ ] Testare tutte le sezioni con dati backend (fase successiva)
- [x] Checkpoint intermedio con struttura backend pronta


## Potenziamento Centro Mobilità + Route (7 Nov 2025) 🗺️
- [x] Collegare endpoint mobility.list a Dashboard PA Centro Mobilità
- [x] Creare componente MobilityMap riutilizzabile (Google Maps)
- [x] Visualizzare fermate bus/tram/parcheggi su mappa
- [x] Marker cliccabili con info fermata (linee, prossimo arrivo)
- [x] Calcoli dinamici statistiche (linee attive, bus servizio, fermate)
- [x] Lista prossime corse con dati reali API
- [ ] Grafici trend passeggeri (Chart.js o Recharts)
- [ ] Grafico utilizzo linee per fascia oraria
- [ ] Stato traffico real-time simulato (3 strade principali)
- [ ] Filtri tipo trasporto (bus/tram/parking)
- [ ] Integrare mappa in pagina Route per pianificazione percorsi
- [ ] Google Directions API per calcolo percorsi multi-modal
- [ ] Punteggio sostenibilità percorso (CO₂ risparmiata)
- [ ] Carbon credits guadagnabili per scelte green
- [ ] Testare su mobile e desktop
- [ ] Checkpoint completo Centro Mobilità + Route


## Script Import GTFS Universale (7 Nov 2025) 🌍
- [x] Creare script Node.js `scripts/import-gtfs.mjs` per download GTFS ZIP
- [x] Implementare parser CSV per stops.txt (fermate)
- [x] Implementare parser CSV per routes.txt (linee)
- [x] Mapping route_type GTFS → nostro type (bus/tram/metro/etc)
- [x] Logica insert batch nel database mobility_data
- [x] Gestione città multiple senza conflitti (ON CONFLICT DO NOTHING)
- [x] Trovare URL GTFS Grosseto (Regione Toscana)
- [x] Documentazione completa uso script (README_GTFS_IMPORT.md)
- [x] Lista dataset GTFS Italia disponibili
- [ ] Fix credenziali DB per script standalone (usa webdev_execute_sql invece)
- [x] Checkpoint finale con infrastruttura GTFS pronta


## Fix Navigazione Route (7 Nov 2025) 🗺️
- [ ] Visualizzare percorso su mappa con Google Directions Renderer
- [ ] Polyline percorso con colore basato su sostenibilità
- [ ] Marker partenza/arrivo personalizzati
- [ ] Navigazione turn-by-turn con istruzioni passo-passo
- [ ] Tracking posizione utente real-time (geolocation API)
- [ ] Marker posizione corrente che si muove
- [ ] Ricalcolo automatico percorso se utente devia
- [ ] Istruzioni vocali navigazione (optional)
- [ ] Testare flusso: Mappa → Negozio → Come Arrivare → Pianifica → Naviga
- [ ] Checkpoint con navigazione completa funzionante


## Fix Route Navigazione da Vetrina Negozio (7 Nov 2025) 🧭
- [ ] Auto-rilevare posizione utente con Geolocation API per campo partenza
- [ ] Pulsante "Usa Posizione Corrente" per partenza
- [ ] Gestire showDirections prop in MobilityMap
- [ ] Usare Google Directions API per calcolo percorso reale
- [ ] DirectionsRenderer per disegnare polyline su mappa
- [ ] Marker partenza (posizione utente) e arrivo (negozio)
- [ ] Quando clicchi "Avvia Navigazione" → mostrare istruzioni turn-by-turn
- [ ] Tracking posizione utente real-time durante navigazione
- [ ] Lista istruzioni passo-passo (es: "Svolta a destra in Via Roma")
- [ ] Badge "Navigazione Attiva" con prossima svolta
- [ ] Testare flusso: Mappa → Negozio → Come Arrivare → Pianifica → Naviga
- [ ] Checkpoint con navigazione completa


## FASE 1: Core Features Dashboard Admin (9 Nov 2025) 🔴

### Collegamento Dati Reali
- [x] Tab Overview - Sostituire mock con query database reali (KPI, grafici, tabelle)
- [ ] Tab Utenti - Collegare tabella users reale con CRUD completo
- [ ] Tab Mercati - Collegare tabella marketGeometry reale con statistiche
- [ ] Tab Log Sistema - Collegare tabelle system_logs e audit_logs reali

### Sistema Carbon Credits Completo
- [ ] Wallet management avanzato con saldo e transazioni
- [ ] Trasferimenti TCC tra utenti (peer-to-peer)
- [ ] Regole automatiche distribuzione TCC (per acquisti, check-in, ecc.)
- [ ] Report fiscali TCC scaricabili (PDF/CSV)
- [ ] Collegamento database reale carbon_credits

### Tab Controlli Polizia (Nuovo)
- [ ] Implementare UI lista controlli con tabella filtri
- [ ] Collegare tabella inspections_detailed
- [ ] Sistema verbali con tabella violations
- [ ] Statistiche infrazioni per operatore/mercato
- [ ] Export report controlli (PDF/Excel)
- [ ] Calendario controlli programmati

### Tab Sicurezza (Nuovo)
- [ ] Gestione ruoli e permessi (Admin, PA, Operatore, Cittadino)
- [ ] Audit trail accessi con log dettagliati
- [ ] 2FA management per utenti sensibili
- [ ] Sessioni attive con possibilità revoca
- [ ] IP whitelist/blacklist per sicurezza
- [ ] Log tentativi accesso falliti
- [ ] Compliance GDPR con export dati utente

### Test e Checkpoint
- [ ] Test import JSON da Slot Editor v3 → Gestione Mercati
- [ ] Test collegamento dati reali in tutti i tab modificati
- [ ] Verificare logging automatico funzionante
- [ ] Checkpoint FASE 1 completata


## Integrazione Mappa GIS e Sistema AI-Friendly (9 Nov 2025) 🗺️🤖

### Mappa GIS in Tutte le Sezioni
- [x] Analizzare tutti i 22 tab Dashboard PA per identificare dove serve mappa
- [x] Tab Gestione Mercati - Mappa interattiva posteggi con stati colorati
- [ ] Tab Mobilità - Mappa fermate bus/tram con layer trasporti
- [ ] Tab Controlli - Mappa controlli Polizia con marker posizioni
- [ ] Tab Segnalazioni Civiche - Mappa segnalazioni con cluster
- [ ] Tab Sostenibilità - Mappa impatto ambientale per zona
- [ ] Tab Real-time - Mappa attività live con heatmap

### Sistema Logging Universale
- [ ] Verificare che TUTTE le API DMS HUB loggino in system_logs
- [ ] Aggiungere logging a operazioni mancanti (CRUD utenti, prodotti, ecc.)
- [ ] Implementare log strutturati con livelli (info, warning, error, critical)
- [ ] Dashboard Log - Filtri avanzati per app, tipo evento, livello, timestamp
- [ ] Alert automatici per errori critici
- [ ] Export log CSV/JSON per analisi esterna

### Architettura AI-Friendly
- [ ] Endpoint API `/api/system/health` per status completo sistema
- [ ] Endpoint API `/api/system/test` per test automatici
- [ ] Endpoint API `/api/system/repair` per auto-riparazione errori
- [ ] Documentazione API completa per AI Agent
- [ ] Schema database accessibile via API per AI
- [ ] Log strutturati machine-readable per AI
- [ ] Agente AI può vedere, testare, riparare tutto autonomamente


## Bug Fix Slot Editor v3 (9 Nov 2025) 🐛
- [x] Analizzare codice cancellazione posteggi
- [x] Correggere funzione per salvare nel BUS localStorage
- [x] Aggiungere pulsante navigazione al BUS HUB
- [ ] Aggiungere pulsante "Esporta per Dashboard Admin"
- [ ] Testare persistenza dopo reload pagina
- [ ] Deploy fix su GitHub Pages


## FIX URGENTE - Mappa GIS Dashboard Admin (9 Nov 2025)

### Gestione Mercati - Tab Posteggi
- [ ] Mostrare mappa GIS direttamente nella tab "Posteggi" senza selezione mercato
- [ ] Aggiungere dropdown per scegliere mercato da visualizzare
- [ ] Mostrare tutti i posteggi di tutti i mercati sulla mappa (con colori diversi per mercato)
- [ ] Fix: attualmente richiede selezione mercato dalla tab "Mercati" prima di vedere mappa

### Integrazione Mappa GIS nelle 9 Sezioni Dashboard
- [ ] Tab "Mercati" - Mappa Italia con tutti i mercati
- [ ] Tab "Mobilità" - Fermate trasporti real-time
- [ ] Tab "Controlli/Sanzioni" - Posizioni controlli Polizia
- [ ] Tab "Segnalazioni & IoT" - Cluster segnalazioni civiche
- [ ] Tab "Real-time" - Attività live sulla mappa
- [ ] Tab "Sostenibilità" - Heatmap CO₂ risparmiata
- [ ] Tab "Prodotti" - Posizioni negozi sulla mappa
- [ ] Tab "Clienti" - Distribuzione geografica utenti


## IMPORT PIANTA DEFINITIVA + API AUTOMATICA (10 Nov 2025)
- [ ] Estrarre JSON dal PDF della pianta con 160 posteggi
- [ ] Testare import manuale della pianta definitiva
- [ ] Verificare che i 160 posteggi siano nel database
- [ ] Implementare endpoint API `/api/dmsHub/markets/importFromSlotEditorAuto`
- [ ] Modificare Slot Editor v3 per inviare JSON via fetch API
- [ ] Gestire autenticazione e CORS
- [ ] Testare invio automatico
- [ ] Salvare checkpoint finale


## TEST API REALI - INTEGRAZIONI (10 Nov 2025)
- [ ] Modificare handleTestEndpoint per fare chiamate TRPC reali
- [ ] Aggiungere form per input parametri endpoint
- [ ] Testare endpoint importAuto con JSON esempio
- [ ] Mostrare risposta reale nel playground


## ✅ TEST API REALI - INTEGRAZIONI (10 Nov 2025) - COMPLETATO
- [x] Modificare handleTestEndpoint per fare chiamate TRPC reali
- [x] Aggiungere form per input parametri endpoint  
- [x] Pulsante "Carica Esempio" con JSON di test importAuto
- [x] Testare endpoint importAuto con JSON esempio
- [x] Mostrare risposta reale nel playground
- [x] Loading state con spinner
- [x] Gestione errori completa
- [x] Misurazione tempo esecuzione
- [x] Supporto tutti 25+ endpoint DMS Hub


## ✅ IMPLEMENTAZIONE INTEGRAZIONI REALI - DASHBOARD NAZIONALE (10 Nov 2025) - COMPLETATO
### Scala Target: 8.000 mercati, 400.000 posteggi, 160.000 imprese

- [x] Statistiche API Reali da database (richieste, tempo medio, success rate, errori)
- [x] API Keys Manager con CRUD completo (create, read, update, delete, regenerate)
- [x] Webhook Manager funzionante (registrazione, trigger, test, log)
- [x] Health Check connessioni esterne (ARPAE, TPER, Centro Mobilità, Centro Mobilità Nazionale, TPAS, Heroku)
- [x] Connessioni esterne configurate (6 totali: 3 connected, 2 disconnected, 1 pending)
- [x] Database schema completo (api_keys, api_metrics, webhooks, webhook_logs, external_connections)
- [x] Router TRPC integrationsRouter con tutti gli endpoint
- [x] Componente Integrazioni.tsx aggiornato con dati reali
- [x] Script seed per popolare connessioni predefinite
- [x] Dialog creazione nuova API Key
- [x] Test webhook con misurazione tempo
- [x] Health check singolo e multiplo


## DOCUMENTAZIONE DASHBOARD PA (10 Nov 2025)
- [x] Leggere componente Documentazione.tsx attuale
- [x] Aggiungere sezione "Relazione Progetto" 
- [x] Implementare rendering markdown STATO_PROGETTO_AGGIORNATO.md
- [x] Aggiungere pulsante visualizza documenti
- [x] Copiare documenti in client/public
- [x] Aggiungere tab Documentazione (TAB 23)
- [x] Testare visualizzazione completa
- [x] Salvare checkpoint


## IMPORT AUTOMATICO SLOT EDITOR V3 (10 Nov 2025) - COMPLETATO
- [x] Implementare endpoint dmsHub.markets.importAuto (GIÀ FATTO)
- [x] Validazione JSON schema completo (GIÀ FATTO)
- [x] Import database (mercato, geometria, posteggi, marker, aree) (GIÀ FATTO)
- [x] Modificare Slot Editor v3 per aggiungere pulsante "Invia a Dashboard Admin" (GIÀ FATTO)
- [x] FIX ERRORE: Creare endpoint REST /api/import-from-slot-editor
- [x] Testare endpoint con curl - FUNZIONA!
- [x] Aggiornare Slot Editor v3 per usare endpoint REST
- [x] Push modifiche su GitHub
- [ ] Testare import 160 posteggi Grosseto dopo deploy GitHub Pages
- [ ] Salvare checkpoint e pubblicare


## RIAGGIUNGERE CONSOLE LOG SLOT EDITOR V3 (10 Nov 2025) - COMPLETATO
- [x] Implementare HTML pannello Console Log in basso a destra
- [x] Aggiungere CSS per styling pannello
- [x] Implementare JavaScript DMSConsole object
- [x] Riattivare tutti DMSConsole.log() commentati (33 log)
- [x] Aggiungere log per operazione import Dashboard Admin
- [x] Committare e pushare su GitHub (commit 4c762b4)
- [ ] Verificare deploy GitHub Pages
- [ ] Testare import con Console Log visibile


## BUG URGENTE - Mappa GIS Gestione Mercati (11 Nov 2025)

- [ ] Fix: Mappa GIS non più visibile nella tab "Gestione Mercati" → "Posteggi"
- [ ] Verificare se componente GISMap è stato rimosso o modificato
- [ ] Ripristinare visualizzazione mappa full-height (calc(100vh - 400px))
- [ ] Testare visualizzazione posteggi sulla mappa con marker colorati
- [ ] Verificare dropdown selezione mercato funzionante


## BUG URGENTE - Mappa GIS Overview non si carica (11 Nov 2025)

- [x] Fix: Mappa "Mappa Mercati Attivi" nella tab Overview non si carica
- [x] Mostra solo placeholder con icona e testo "Mappa interattiva mercati"
- [x] Verificare componente GISMap in Overview
- [x] Sostituito placeholder con GISMap reale
- [x] Testare visualizzazione mappa in Overview dopo reload


## 2 Gennaio 2026 - Miglioramenti Modal Concessioni

- [x] Aggiungere campo Mercato nel modal "Nuova Concessione" con preselzione del mercato corrente
- [ ] Permettere cambio mercato tramite dropdown (non implementato - mercato è in sola visualizzazione)
- [x] Filtrare posteggi per mostrare solo quelli liberi (non già assegnati a concessioni attive)
- [ ] Caricare posteggi dinamicamente quando si cambia mercato (non necessario - mercato fisso)


## Bug Fix - Date Picker nei Modal (02/01/2026)

- [x] Fix date picker che si chiude immediatamente nei modal Qualifiche
- [x] Fix date picker che si chiude immediatamente nei modal Concessioni
- [x] Fix date picker in modal Imprese (data nascita, data iscrizione RI)
- [x] Aggiunto stopPropagation e z-index alto a tutti gli input date


## Bug Fix - Verifica SCIA e Semafori (02/01/2026)

- [x] Aggiungere filtro per mostrare solo ultima verifica o storico completo
- [x] Toggle per passare da "Ultima Verifica" a "Storico Completo"
- [x] Semaforo rosso per qualifiche scadute nella scheda qualifiche


## Bug Fix - Batch 02/01/2026 (sera)

- [ ] Date picker si chiude ancora - verificare fix
- [ ] Toggle storico confuso - cambiare testo in "Visualizzando: X"
- [ ] Semaforo qualifiche non cambia colore (rimane verde anche se scaduto)
- [ ] Form SCIA: mercato/posteggio prende dati subentrante invece del cedente
