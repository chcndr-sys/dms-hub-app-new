# Changelog - Allargamento Pagine Pubbliche

## Data: 4 Gennaio 2026

### Modifiche Effettuate

Tutte le pagine pubbliche del DMS Hub sono state allarghe per utilizzare l'intera larghezza dello schermo, migliorando l'esperienza utente e il design visivo.

#### Pagine Modificate:

1. **VetrinePage.tsx** (Vetrine)
   - Header: `max-w-7xl mx-auto` → `w-full px-4 md:px-8`
   - Contenuto: `max-w-7xl mx-auto` → `w-full px-4 md:px-8`
   - Effetto: Pagina lista e dettaglio negozi ora usano tutta la larghezza

2. **HomePage.tsx** (Home principale)
   - Header: `container` → `w-full px-4 md:px-8`
   - Effetto: Landing page più impattante con spazio pieno

3. **MapPage.tsx** (Mappa Mercato)
   - Header: `container max-w-2xl` → `w-full px-4 md:px-8`
   - Effetto: Mappa con header allargato

#### Pagine già allarghe (verificate):
- RoutePage (Shopping Route Etico) - ✅ Già w-full px-4 md:px-8
- WalletPage (Wallet Carbon Credit) - ✅ Già w-full px-4 md:px-8
- CivicPage (Sensore Civico) - ✅ Già w-full px-4 md:px-8

### Benefici

- ✅ Migliore utilizzo dello spazio disponibile su schermi grandi
- ✅ Design coerente su tutte le pagine pubbliche
- ✅ Responsive design mantenuto (padding adattivo)
- ✅ Esperienza utente migliorata su desktop e tablet
- ✅ Compatibilità mobile preservata

### Commit

- `5d40a1f` - feat: Allargare HomePage e MapPage
- `91130c3` - feat: Allargare tutte le pagine pubbliche

### Note

- Dashboard PA NON è stata modificata (rimane con max-w-7xl per uso interno)
- Tutte le modifiche mantengono la responsività mobile
- Padding responsive: 4 unità su mobile, 8 unità su desktop
