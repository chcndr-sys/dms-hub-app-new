# 🗺️ PROGETTO: Marker Segnalazioni Civiche sulla Mappa

> **Versione:** 1.0.0  
> **Data:** 30 Gennaio 2026  
> **Autore:** Manus AI  
> **Stato:** IN PROGETTAZIONE - In attesa di autorizzazione

---

## 📋 INDICE

1. [Obiettivo del Progetto](#obiettivo-del-progetto)
2. [Analisi Sistema Esistente](#analisi-sistema-esistente)
3. [Schema Architettura](#schema-architettura)
4. [Struttura Database](#struttura-database)
5. [Componenti Coinvolti](#componenti-coinvolti)
6. [Piano di Implementazione](#piano-di-implementazione)
7. [Schema Colori Marker](#schema-colori-marker)
8. [Flusso Dati](#flusso-dati)
9. [Modifiche Richieste](#modifiche-richieste)
10. [Rischi e Mitigazioni](#rischi-e-mitigazioni)
11. [Checklist Pre-Implementazione](#checklist-pre-implementazione)

---

## 🎯 OBIETTIVO DEL PROGETTO

Visualizzare le **segnalazioni civiche** come marker colorati sulla mappa nel tab **"Segnalazioni & IoT"** della Dashboard PA, permettendo agli operatori di:

1. Vedere la distribuzione geografica delle segnalazioni
2. Identificare rapidamente le categorie tramite colori
3. Distinguere lo stato (pending, in_progress, resolved)
4. Evidenziare segnalazioni urgenti con animazione

**Principio Fondamentale:** NON interferire con le altre istanze della mappa (Gestione HUB, Mappa GIS, Web App).

---

## 📊 ANALISI SISTEMA ESISTENTE

### 2.1 Tabella Database `civic_reports`

La tabella esiste già nel database PostgreSQL (Neon) con la seguente struttura:

```sql
-- Schema ATTUALE (dal file drizzle/schema.ts)
CREATE TABLE civic_reports (
  id          INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id     INTEGER REFERENCES users(id),
  type        VARCHAR(100) NOT NULL,        -- Categoria: buche, illuminazione, rifiuti, etc.
  description TEXT NOT NULL,
  lat         VARCHAR(20),                  -- Latitudine GPS
  lng         VARCHAR(20),                  -- Longitudine GPS  
  photo_url   TEXT,                         -- URL foto
  status      VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, resolved
  created_at  TIMESTAMP DEFAULT NOW()
);
```

**⚠️ NOTA IMPORTANTE:** Lo schema NON include il campo `priority`. Questo ha causato l'errore nel tentativo precedente.

### 2.2 Campi Disponibili vs Campi Usati nel Codice

| Campo | Presente in DB | Usato nel Codice Precedente | Azione |
|-------|----------------|----------------------------|--------|
| `id` | ✅ | ✅ | OK |
| `type` | ✅ | ✅ | OK |
| `description` | ✅ | ✅ | OK |
| `lat` | ✅ | ✅ | OK |
| `lng` | ✅ | ✅ | OK |
| `status` | ✅ | ✅ | OK |
| `created_at` | ✅ | ✅ | OK |
| `priority` | ❌ | ✅ (ERRORE!) | Rimuovere o rendere opzionale |
| `address` | ❌ | ✅ | Rendere opzionale |
| `comune_id` | ❌ | ❌ | Non necessario |

### 2.3 API Endpoint Esistente

L'endpoint per recuperare le segnalazioni civiche esiste già nel backend:

```
GET https://orchestratore.mio-hub.me/api/civic-reports
```

**Response attuale:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "type": "buche",
      "description": "Buca pericolosa",
      "lat": "42.7635",
      "lng": "11.1127",
      "photo_url": null,
      "status": "pending",
      "created_at": "2026-01-29T10:30:00Z"
    }
  ]
}
```

---

## 🏗️ SCHEMA ARCHITETTURA

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ARCHITETTURA MARKER SEGNALAZIONI CIVICHE                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD PA                                      │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Tab "Segnalazioni & IoT"                              │  │
│  │                                                                          │  │
│  │  ┌──────────────────────┐    ┌────────────────────────────────────────┐ │  │
│  │  │   CivicReportsPanel  │    │      GestioneHubMapWrapper             │ │  │
│  │  │                      │    │                                        │ │  │
│  │  │  - KPI Cards         │    │  ┌──────────────────────────────────┐  │ │  │
│  │  │  - Lista segnalazioni│    │  │   HubMarketMapComponent          │  │ │  │
│  │  │  - Filtri            │    │  │                                  │  │ │  │
│  │  │                      │    │  │  - Marker Mercati (rosso "M")    │  │ │  │
│  │  │  civicReportsQuery ──┼────┼──│  - Marker HUB (blu "H")          │  │ │  │
│  │  │  .data               │    │  │  - Marker Negozi (verde)         │  │ │  │
│  │  │                      │    │  │  - 🆕 Marker Civici (colorati)   │  │ │  │
│  │  └──────────────────────┘    │  │                                  │  │ │  │
│  │                              │  └──────────────────────────────────┘  │ │  │
│  │                              └────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ tRPC Query
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Hetzner)                                    │
│                                                                                │
│  GET /api/civic-reports ──────────────────────────────────────────────────────│
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ SQL Query
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE (Neon PostgreSQL)                           │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        civic_reports                                     │  │
│  │                                                                          │  │
│  │  id | user_id | type | description | lat | lng | status | created_at    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗃️ STRUTTURA DATABASE

### 4.1 Schema Attuale (NO MODIFICHE RICHIESTE)

Lo schema attuale è sufficiente per l'implementazione dei marker. **Non serve modificare il database.**

```sql
-- Campi utilizzati per i marker:
-- type        → Determina il colore del marker
-- lat, lng    → Posizione geografica
-- status      → Determina lo stile (pieno, bordo, grigio)
-- description → Mostrato nel popup
-- created_at  → Mostrato nel popup
```

### 4.2 Mapping Tipo → Colore

| Tipo (type) | Colore | Hex Code | Descrizione |
|-------------|--------|----------|-------------|
| `buche` | 🟠 Arancione | `#f97316` | Buche stradali |
| `illuminazione` | 🟡 Giallo | `#eab308` | Problemi illuminazione |
| `rifiuti` | 🟢 Verde | `#22c55e` | Rifiuti abbandonati |
| `microcriminalita` | 🔴 Rosso | `#ef4444` | Segnalazioni sicurezza |
| `abusivismo` | 🟣 Viola | `#a855f7` | Commercio abusivo |
| `altro` | ⚪ Grigio | `#6b7280` | Altre segnalazioni |

### 4.3 Mapping Status → Stile

| Status | Stile Marker | Descrizione |
|--------|--------------|-------------|
| `pending` | Cerchio pieno colorato | In attesa di presa in carico |
| `in_progress` | Cerchio con bordo bianco | In lavorazione |
| `resolved` | Cerchio grigio semi-trasparente | Risolta |

---

## 🧩 COMPONENTI COINVOLTI

### 5.1 File da Modificare

| File | Repository | Modifica |
|------|------------|----------|
| `HubMarketMapComponent.tsx` | dms-hub-app-new | Aggiungere rendering marker civici |
| `GestioneHubMapWrapper.tsx` | dms-hub-app-new | Passare prop `civicReports` |
| `DashboardPA.tsx` | dms-hub-app-new | Passare dati query alla mappa |

### 5.2 File NON da Modificare (Principio Non-Interferenza)

| File | Motivo |
|------|--------|
| `MarketMapComponent.tsx` | Usato in Gestione Mercati - NON TOCCARE |
| `MappaGISPage.tsx` | Usato in Mappa GIS - NON TOCCARE |
| `MappaItaliaPage.tsx` | Usato in Web App - NON TOCCARE |
| `drizzle/schema.ts` | Schema DB - NON TOCCARE |
| `civic-reports.js` (backend) | Endpoint API - NON TOCCARE |

### 5.3 Gerarchia Componenti

```
DashboardPA.tsx
└── Tab "Segnalazioni & IoT" (value="civic")
    ├── CivicReportsPanel.tsx (pannello sinistro)
    │   └── civicReportsQuery.data (dati segnalazioni)
    │
    └── GestioneHubMapWrapper.tsx (mappa destra)
        └── HubMarketMapComponent.tsx
            ├── Marker Mercati (esistente)
            ├── Marker HUB (esistente)
            ├── Marker Negozi (esistente)
            └── 🆕 Marker Civici (DA AGGIUNGERE)
```

---

## 📝 PIANO DI IMPLEMENTAZIONE

### Fase 1: Definire Interfaccia CivicReport (SICURA)

```typescript
// In HubMarketMapComponent.tsx
interface CivicReport {
  id: number;
  type: string;
  description: string;
  lat: string | null;
  lng: string | null;
  status: string;
  created_at: string;
  // Campi opzionali (potrebbero non esistere nel DB)
  priority?: string;
  address?: string;
  user_id?: number;
  photo_url?: string | null;
}
```

**⚠️ IMPORTANTE:** Tutti i campi non presenti nello schema DB devono essere opzionali (`?`).

### Fase 2: Aggiungere Costante Colori

```typescript
// In HubMarketMapComponent.tsx
const CIVIC_MARKER_COLORS: Record<string, string> = {
  'buche': '#f97316',        // Arancione
  'illuminazione': '#eab308', // Giallo
  'rifiuti': '#22c55e',      // Verde
  'microcriminalita': '#ef4444', // Rosso
  'abusivismo': '#a855f7',   // Viola
  'altro': '#6b7280',        // Grigio default
};
```

### Fase 3: Aggiungere Prop al Componente

```typescript
// In HubMarketMapComponentProps
interface HubMarketMapComponentProps {
  // ... props esistenti ...
  
  // 🆕 Nuova prop per segnalazioni civiche
  civicReports?: CivicReport[];
}
```

### Fase 4: Rendering Marker Civici

```typescript
// Dentro HubMarketMapComponent, dopo i marker HUB/negozi
{civicReports && civicReports.length > 0 && civicReports.map((report) => {
  // Salta se mancano coordinate
  if (!report.lat || !report.lng) return null;
  
  const lat = parseFloat(report.lat);
  const lng = parseFloat(report.lng);
  if (isNaN(lat) || isNaN(lng)) return null;
  
  // Determina colore in base al tipo
  const color = CIVIC_MARKER_COLORS[report.type] || CIVIC_MARKER_COLORS['altro'];
  
  // Determina stile in base allo status
  const isResolved = report.status === 'resolved';
  const isInProgress = report.status === 'in_progress';
  
  // Crea icona marker
  const markerIcon = L.divIcon({
    className: 'civic-marker',
    html: `<div style="
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: ${isResolved ? '#9ca3af' : color};
      opacity: ${isResolved ? 0.5 : 1};
      border: ${isInProgress ? '3px solid white' : 'none'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  
  return (
    <Marker
      key={`civic-${report.id}`}
      position={[lat, lng]}
      icon={markerIcon}
    >
      <Popup>
        <div className="text-sm">
          <div className="font-bold capitalize">{report.type}</div>
          <div className="text-gray-600">{report.description}</div>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(report.created_at).toLocaleDateString('it-IT')}
          </div>
          <div className={`text-xs mt-1 ${
            report.status === 'resolved' ? 'text-green-600' :
            report.status === 'in_progress' ? 'text-blue-600' :
            'text-orange-600'
          }`}>
            {report.status === 'resolved' ? '✓ Risolta' :
             report.status === 'in_progress' ? '⏳ In lavorazione' :
             '⏸ In attesa'}
          </div>
        </div>
      </Popup>
    </Marker>
  );
})}
```

### Fase 5: Aggiornare GestioneHubMapWrapper

```typescript
// In GestioneHubMapWrapper.tsx
interface GestioneHubMapWrapperProps {
  // ... props esistenti ...
  civicReports?: CivicReport[];
}

// Passare la prop a HubMarketMapComponent
<HubMarketMapComponent
  // ... altre props ...
  civicReports={civicReports}
/>
```

### Fase 6: Passare Dati da DashboardPA

```typescript
// In DashboardPA.tsx, nel tab "civic"
<GestioneHubMapWrapper
  // ... altre props ...
  civicReports={civicReportsQuery.data || []}
/>
```

---

## 🎨 SCHEMA COLORI MARKER

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEGENDA MARKER CIVICI                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   🟠 BUCHE (#f97316)           - Segnalazioni buche stradali                │
│                                                                              │
│   🟡 ILLUMINAZIONE (#eab308)   - Problemi illuminazione pubblica            │
│                                                                              │
│   🟢 RIFIUTI (#22c55e)         - Rifiuti abbandonati                        │
│                                                                              │
│   🔴 MICROCRIMINALITÀ (#ef4444) - Segnalazioni sicurezza                    │
│                                                                              │
│   🟣 ABUSIVISMO (#a855f7)      - Commercio abusivo                          │
│                                                                              │
│   ⚪ ALTRO (#6b7280)           - Altre segnalazioni                         │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         STILI PER STATUS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ● Cerchio pieno           - Status: pending (in attesa)                   │
│                                                                              │
│   ◉ Cerchio con bordo bianco - Status: in_progress (in lavorazione)         │
│                                                                              │
│   ○ Cerchio grigio 50%      - Status: resolved (risolta)                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUSSO DATI

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FLUSSO DATI COMPLETO                                │
└──────────────────────────────────────────────────────────────────────────────┘

1. CARICAMENTO DATI
   ┌─────────────────┐
   │  DashboardPA    │
   │                 │
   │  useQuery({     │
   │    queryKey:    │
   │    ['civic-     │
   │     reports']   │
   │  })             │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Backend API    │
   │                 │
   │  GET /api/      │
   │  civic-reports  │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  Neon Database  │
   │                 │
   │  SELECT * FROM  │
   │  civic_reports  │
   └────────┬────────┘
            │
            ▼
2. PASSAGGIO DATI
   ┌─────────────────┐
   │  DashboardPA    │
   │                 │
   │  civicReports=  │
   │  {query.data}   │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────────┐
   │ GestioneHubMapWrapper│
   │                      │
   │  civicReports={...}  │
   └────────┬─────────────┘
            │
            ▼
   ┌─────────────────────┐
   │ HubMarketMapComponent│
   │                      │
   │  civicReports.map()  │
   │  → <Marker />        │
   └──────────────────────┘

3. RENDERING
   ┌─────────────────────────────────────────┐
   │              MAPPA LEAFLET               │
   │                                          │
   │   🔴 M  ← Mercato                        │
   │                                          │
   │   🔵 H  ← HUB                            │
   │                                          │
   │   🟢 •  ← Negozio                        │
   │                                          │
   │   🟠 ● 🟡 ● 🟢 ● 🔴 ● 🟣 ●  ← Civici     │
   │                                          │
   └─────────────────────────────────────────┘
```

---

## ✏️ MODIFICHE RICHIESTE

### 9.1 HubMarketMapComponent.tsx

| Linea | Tipo | Descrizione |
|-------|------|-------------|
| ~95 | ADD | Interfaccia `CivicReport` con campi opzionali |
| ~96 | ADD | Costante `CIVIC_MARKER_COLORS` |
| ~139 | ADD | Prop `civicReports?: CivicReport[]` |
| ~227 | ADD | Destrutturazione `civicReports = []` |
| ~600+ | ADD | Rendering marker civici con `.map()` |

### 9.2 GestioneHubMapWrapper.tsx

| Linea | Tipo | Descrizione |
|-------|------|-------------|
| ~10 | ADD | Interfaccia `CivicReport` (copia da HubMarketMapComponent) |
| ~20 | ADD | Prop `civicReports?: CivicReport[]` in interface |
| ~50 | ADD | Destrutturazione `civicReports` dalle props |
| ~100 | ADD | Passaggio `civicReports={civicReports}` a HubMarketMapComponent |

### 9.3 DashboardPA.tsx

| Linea | Tipo | Descrizione |
|-------|------|-------------|
| ~1500 | EDIT | Aggiungere `civicReports={civicReportsQuery.data || []}` a GestioneHubMapWrapper |

---

## ⚠️ RISCHI E MITIGAZIONI

### 10.1 Rischi Identificati

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Campo `priority` mancante nel DB | ALTA | CRITICO | Rendere tutti i campi non-standard opzionali |
| Coordinate null/invalide | MEDIA | BASSO | Validare lat/lng prima del rendering |
| Troppi marker rallentano mappa | BASSA | MEDIO | Limitare query a 100 record |
| Interferenza con altre mappe | BASSA | CRITICO | Prop opzionale con default `[]` |

### 10.2 Strategia di Rollback

Se l'implementazione causa errori:

```bash
# Rollback immediato al tag stabile
cd /home/ubuntu/dms-hub-app-repo
git checkout v3.55.1-pre-heatmap -- client/src/components/HubMarketMapComponent.tsx
git checkout v3.55.1-pre-heatmap -- client/src/components/GestioneHubMapWrapper.tsx
git checkout v3.55.1-pre-heatmap -- client/src/pages/DashboardPA.tsx
git add -A && git commit -m "rollback: revert civic markers"
git push origin master
```

---

## ✅ CHECKLIST PRE-IMPLEMENTAZIONE

### Prima di Iniziare

- [ ] Backup creato (tag `v3.55.1-pre-heatmap` già esistente)
- [ ] Blueprint letto e compreso
- [ ] Schema database verificato (NO campo `priority`)
- [ ] Componenti target identificati
- [ ] Principio non-interferenza confermato

### Durante Implementazione

- [ ] Interfaccia con campi opzionali
- [ ] Validazione coordinate (null check)
- [ ] Prop con default `[]`
- [ ] Build locale senza errori
- [ ] Test su ambiente locale

### Dopo Implementazione

- [ ] Push su GitHub
- [ ] Verifica deploy Vercel
- [ ] Test Dashboard PA → Tab Segnalazioni
- [ ] Verifica altre mappe NON impattate
- [ ] Aggiornamento Blueprint

---

## 📌 AUTORIZZAZIONE RICHIESTA

**Prima di procedere con l'implementazione, è necessaria l'autorizzazione esplicita dell'utente.**

### Domande per l'Utente:

1. **Confermi lo schema colori proposto?**
2. **Vuoi aggiungere altri tipi di segnalazione?**
3. **Il popup deve mostrare altri dati?**
4. **Posso procedere con l'implementazione?**

---

> **Nota:** Questo documento segue il workflow critico definito nel Master Blueprint:
> - ✅ Piano dettagliato con schemi
> - ✅ Analisi sistema esistente
> - ✅ Identificazione rischi
> - ⏳ In attesa di autorizzazione utente

