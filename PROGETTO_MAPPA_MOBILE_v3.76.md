# 🗺️ PROGETTO MODIFICHE MAPPA MOBILE - v3.76.x

> **Versione:** 3.76.0  
> **Data:** 01 Febbraio 2026  
> **Stato:** IN ATTESA APPROVAZIONE

---

## Obiettivo

Ottimizzare la pagina Mappa per visualizzazione smartphone, mantenendo **INVARIATA** la versione PC/Tablet.

---

## ⚠️ REGOLA CRITICA: NON-INTERFERENZA

> **Il componente mappa è MOLTO DELICATO e ha richiesto molto tempo per essere perfezionato.**
> **NON modificare il codice esistente che funziona su PC/Tablet.**
> **Usare SOLO classi CSS responsive (`sm:hidden` / `hidden sm:block`) per differenziare le viste.**

---

## File Coinvolti

| File | Descrizione | Righe |
|------|-------------|-------|
| `client/src/pages/MappaItaliaPage.tsx` | Pagina wrapper con header | 45 |
| `client/src/components/GestioneHubMapWrapper.tsx` | Wrapper principale con tutti i controlli | 1041 |
| `client/src/components/HubMarketMapComponent.tsx` | Componente mappa Leaflet | ~800 |
| `client/src/components/MapWithTransportLayer.tsx` | Layer trasporto pubblico | ~300 |

---

## Struttura Attuale

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER INDICATORI                                                │
│ ┌─────────────────┬─────┬─────┬─────┬─────┬─────────────────┐  │
│ │ GEMELLO DIGITALE│ HUB │NEGOZI│ATTIVI│INATT│ COORDINATE GPS │  │
│ │ DEL COMMERCIO   │  79 │  6  │  6  │  0  │ 42.5 | 12.5    │  │
│ └─────────────────┴─────┴─────┴─────┴─────┴─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│ BARRA CONTROLLI                                                  │
│ ┌──────────────┬────────────┬────────────┬────────┬────────┐   │
│ │ Mercati/HUB  │ Cerca...   │Vista Italia│Regione │ Prov.  │   │
│ └──────────────┴────────────┴────────────┴────────┴────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ LISTA SCORREVOLE                                                 │
│ ┌──────┬──────┬──────┬──────┬──────┬──────┐                    │
│ │ HUB  │ HUB  │ HUB  │ HUB  │ HUB  │ ...  │ ← scroll orizzontale│
│ └──────┴──────┴──────┴──────┴──────┴──────┘                    │
├─────────────────────────────────────────────────────────────────┤
│ MAPPA                                                            │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │                    HubMarketMapComponent                    ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Modifiche Richieste (SOLO MOBILE < 640px)

### Schermata 1: Selezione Hub/Mercato

| # | Elemento | Stato Attuale | Modifica Mobile |
|---|----------|---------------|------------------|
| 1 | Container "GEMELLO DIGITALE DEL COMMERCIO" | Box con titolo + HUB: Italia | **RIMUOVERE** completamente |
| 2 | Indicatori (HUB, NEGOZI, ATTIVI, INATTIVI) | 4 box separati + coordinate | **Una riga** - 4 indicatori compatti SENZA coordinate |
| 3 | Tab "Mercati" / "HUB" | Sfondo colorato quando attivo | **Trasparenti** con bordo, MANTENERE colore quando attivo |
| 4 | Barra ricerca | Input con placeholder | **MANTENERE** invariata |
| 5 | Tab "Vista Italia" | Pulsante verde | **RIMUOVERE** (spostare in Schermata 2) |
| 6 | Tab "Regione" / "Prov." | Dropdown con sfondo | **Trasparenti** con bordo, aprono popup selezione |
| 7 | Tab "Area: NaN mq" | Indicatore area | **RIMUOVERE** su mobile |
| 8 | Lista hub/mercati | Card scorrevoli | **MANTENERE** invariata |
| 9 | Mappa | Visibile sotto lista | **NASCONDERE** (va in Schermata 2) |

### Schermata 2: Mappa Fullscreen

| # | Elemento | Descrizione |
|---|----------|-------------|
| 1 | Layout | **Fullscreen** senza container (tipo YouTube a tutto schermo) |
| 2 | Mappa | Vista Italia a tutto schermo con markers |
| 3 | Tab "Apri" / "Chiudi" | **Singolo pulsante toggle** sopra la mappa |
| 4 | Animazione | Click "Apri" → zoom animato fino a hub/mercato selezionato |
| 5 | Pulsante "Vista Italia" | Torna a vista Italia (reset zoom) |
| 6 | Freccia indietro | Torna a Schermata 1 (selezione) |

---

## Piano Implementazione

### Fase 1: Preparazione
1. Creare backup: `GestioneHubMapWrapper.tsx.backup-v3.75.2`
2. Aggiungere stato `showFullscreenMap` per toggle schermata

### Fase 2: Modifiche CSS Responsive

```tsx
// Pattern da usare:
<div className="hidden sm:flex">  {/* Visibile solo su PC/Tablet */}
<div className="sm:hidden">       {/* Visibile solo su Mobile */}
```

### Fase 3: Schermata 1 Mobile

```tsx
{/* MOBILE: Header compatto con indicatori su una riga */}
{isMobile && (
  <div className="sm:hidden flex items-center gap-2 p-2 overflow-x-auto">
    <StatIndicator label="HUB" value={stats.mercati} color="purple" compact />
    <StatIndicator label="Negozi" value={stats.totali} color="white" compact />
    <StatIndicator label="Attivi" value={stats.occupati} color="green" compact />
    <StatIndicator label="Inattivi" value={stats.liberi} color="white" compact />
  </div>
)}

{/* PC/TABLET: Header originale invariato */}
<div className="hidden sm:flex ...">
  {/* Codice esistente INVARIATO */}
</div>
```

### Fase 4: Schermata 2 Mobile (Mappa Fullscreen)

```tsx
{/* MOBILE: Mappa fullscreen con toggle */}
{isMobile && showFullscreenMap && (
  <div className="fixed inset-0 z-50 bg-[#0b1220]">
    {/* Header con pulsanti */}
    <div className="absolute top-0 left-0 right-0 z-10 p-2 flex justify-between">
      <button onClick={() => setShowFullscreenMap(false)}>
        <ArrowLeft /> Indietro
      </button>
      <button onClick={handleToggleAnimation}>
        {isAnimating ? 'Chiudi' : 'Apri'}
      </button>
      <button onClick={handleResetToItaly}>
        Vista Italia
      </button>
    </div>
    
    {/* Mappa fullscreen */}
    <div className="h-full w-full">
      <HubMarketMapComponent ... />
    </div>
  </div>
)}
```

### Fase 5: Pulsante "Apri Mappa" in Schermata 1

```tsx
{/* MOBILE: Pulsante per aprire mappa fullscreen */}
{isMobile && !showFullscreenMap && selectedItem && (
  <button 
    onClick={() => setShowFullscreenMap(true)}
    className="w-full py-3 bg-[#14b8a6] text-white rounded-lg"
  >
    <Map className="h-5 w-5 mr-2" />
    Apri Mappa
  </button>
)}
```

---

## Stile Tab Trasparenti (Come Home)

```tsx
// Stile base trasparente
const tabBaseStyle = "bg-transparent border border-border/40 backdrop-blur-sm";

// Stile attivo (mantiene colore)
const tabActiveStyle = mode === 'mercato' 
  ? 'bg-[#ef4444] text-white border-[#ef4444]' 
  : 'bg-[#9C27B0] text-white border-[#9C27B0]';
```

---

## Checklist Implementazione

- [ ] Backup file originale
- [ ] Aggiungere stato `showFullscreenMap`
- [ ] Creare versione mobile header indicatori (una riga)
- [ ] Nascondere container "GEMELLO DIGITALE" su mobile
- [ ] Nascondere coordinate GPS su mobile
- [ ] Nascondere "Vista Italia" e "Area mq" su mobile (Schermata 1)
- [ ] Rendere tab Mercati/HUB trasparenti su mobile
- [ ] Rendere tab Regione/Prov trasparenti su mobile
- [ ] Creare Schermata 2 fullscreen con mappa
- [ ] Implementare toggle Apri/Chiudi animazione
- [ ] Implementare pulsante "Vista Italia" in Schermata 2
- [ ] Implementare freccia indietro in Schermata 2
- [ ] Test su viewport mobile (< 640px)
- [ ] Test su viewport PC/Tablet (>= 640px) - DEVE essere IDENTICO
- [ ] Push su GitHub e deploy Vercel

---

## Stima Tempi

| Fase | Attività | Tempo Stimato |
|------|----------|---------------|
| 1 | Backup e preparazione | 5 min |
| 2 | Modifiche header mobile | 20 min |
| 3 | Schermata 1 mobile | 30 min |
| 4 | Schermata 2 fullscreen | 45 min |
| 5 | Stile tab trasparenti | 15 min |
| 6 | Test e debug | 30 min |
| 7 | Deploy e verifica | 10 min |
| **TOTALE** | | **~2.5 ore** |

---

## Note Critiche

1. **NON modificare** il codice che funziona su PC/Tablet
2. **Usare SOLO** classi CSS responsive per differenziare
3. **Il componente HubMarketMapComponent** non deve essere toccato
4. **Testare SEMPRE** entrambe le viste prima del deploy
5. **In caso di dubbio**, chiedere conferma prima di procedere

---

*Progetto documentato da Manus AI - 01 Febbraio 2026*
