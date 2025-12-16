> # Blueprint Progetto: dms-hub-app-new

**Autore:** Manus AI
**Data:** 16 Dicembre 2025

---

## 1. Architettura Generale

L'applicazione segue un'architettura full-stack moderna basata su:

- **Frontend:** React (con Vite) e TypeScript
- **UI Framework:** shadcn/ui e Tailwind CSS
- **Backend:** tRPC per API type-safe
- **Database:** Non specificato (presumibilmente SQL)
- **Deployment:** Vercel

## 2. Componenti Chiave

- **`DashboardPA.tsx`**: Componente principale che funge da cruscotto per l'amministrazione pubblica. Gestisce lo stato globale dell'interfaccia, inclusa la navigazione tra i vari tab e il caricamento dei dati principali.
- **`MarketMapComponent.tsx`**: Componente riutilizzabile per la visualizzazione di mappe GIS interattive basate su Leaflet. Accetta dati GeoJSON e un elenco di posteggi per il rendering.
- **`Tabs` (shadcn/ui)**: Utilizzato per organizzare i contenuti in sezioni navigabili.

## 3. Funzionalità Implementate

### Tab "Mappa GIS"

- **Visualizzazione Mappa:** Mappa interattiva del mercato di Grosseto con posteggi colorati in base allo stato.
- **Statistiche:** Card riassuntive con il conteggio dei posteggi totali, liberi, occupati e riservati.
- **Filtri e Ricerca:** Interfaccia predisposta per filtri e ricerca (logica non ancora implementata).
- **Legenda:** Spiegazione chiara dei colori utilizzati sulla mappa.

### Tab "Gestione HUB"

- **Placeholder:** Tab creato con un segnaposto, pronto per future implementazioni.

---

## 4. Flusso Dati

1.  `DashboardPA` carica i dati `gisMapData` e `gisStalls` al mount del componente.
2.  Questi dati vengono passati come props a `MarketMapComponent` sia nel tab "Overview" che nel nuovo tab "Mappa GIS".
3.  Lo stato `activeTab` gestisce quale `TabsContent` è visibile, garantendo che la mappa venga renderizzata solo quando il tab corrispondente è attivo.

---

## 5. Note Tecniche e Sfide

- **Gestione dei Tab:** La sfida principale è stata la corretta integrazione di `TabsContent` custom all'interno della struttura del componente `<Tabs>` di shadcn/ui, che richiede una gerarchia specifica. Il problema è stato risolto assicurando che tutti i `TabsContent` fossero figli diretti di `<Tabs>` e utilizzando la prop `onValueChange` per sincronizzare lo stato.
- **Errori di Build:** La risoluzione di errori di build su Vercel ha richiesto l'invalidamento della cache tramite un commit forzato.
- **Import Mancanti:** Un errore di runtime (`Search is not defined`) è stato causato dalla mancanza di un import di icone da `lucide-react`, evidenziando l'importanza di un controllo attento delle dipendenze.
