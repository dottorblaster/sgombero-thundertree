# AGENTS.md — Linee guida per AI agent

Questo file documenta le convenzioni, l'architettura e i pattern del progetto **Sgombero a Thundertree** per consentire a AI agent (Claude, etc.) di lavorare sul codice in modo efficiente e coerente.

---

## Panoramica

Gioco arcade reflex in stile whack-a-mole, ambientato nella campagna D&D del committente. Sei Venomfang, un giovane drago verde che difende il proprio tesoro dagli avventurieri. Static site, vaniglia JS, mobile-first.

## Stack

| Layer | Tecnologia | Note |
|---|---|---|
| HTML | Vanilla HTML5 | `index.html` unico entry point |
| CSS | Vanilla CSS3 + Google Fonts | Tema grimorio, mobile-first |
| JS | ES Modules nativi | Separazione logica/rendering/dati |
| Build | Nessuno | Statico, deploy drag-and-drop |
| Canvas | `<canvas>` + `requestAnimationFrame` | Game loop e rendering |
| DOM | Overlay per schermate/HUD | Mix canvas + DOM |

## Architettura moduli

```
index.html              ← Entry point
styles.css              ← Stili globali
js/
├── data.js             ← Dati puri: roster, ondate, testi, costanti
├── game.js             ← Stato e logica pura (nessun DOM, nessun rendering)
└── main.js             ← Game loop, rendering canvas, input, DOM UI
```

### Regole di separazione

- **`data.js`** — Solo dati/oggetti esportati. Zero funzioni con side effect. Zero import da altri moduli interni.
- **`game.js`** — Solo funzioni pure/logica di gioco. Non tocca il DOM, non fa rendering, non carica `data.js` se non via import. Lo stato è un oggetto semplice passato come argomento.
- **`main.js`** — Orchestrazione: canvas, input, DOM, game loop. Importa da `data.js` e `game.js`, non viceversa.

## Convenzioni di codice

### JavaScript

- **ES modules** con `import`/`export` nativi. Nessun bundler, nessun `require`.
- **Stato come oggetto singolo** (`state`) passato alle funzioni di `game.js`. Mutato direttamente (nessuna immutabilità forzata).
- **Naming**: camelCase per variabili/funzioni, PascalCase per costanti-esportate (es. `INTRUDER_TYPES`), MAIUSCOLO per costanti interne (es. `C`, `LOGICAL_WIDTH`).
- **Commenti**: separatori `// ---` per sezioni, commenti inline per logica non ovvia. Tutti i commenti in italiano.
- **Funzioni**: pure dove possibile, con side effect documentati.
- **Niente classi** — tutto è funzioni + oggetti semplici.
- **Import/export**: ogni file esporta ciò che serve; `main.js` importa tutto ciò di cui ha bisogno.

### CSS

- **Tema CSS custom properties** (`:root` con `--bg-primary`, `--accent-gold`, etc.)
- **Mobile-first**: breakpoint primario a `600px`, landscape a `500px`
- **Class naming**: kebab-case (es. `.home-title`, `.hoard-bar`, `.btn-breath`)
- **Commenti**: separatori `/* --- */` per sezioni
- **Font**: `Cinzel Decorative` (display), `EB Garamond` (testo) via Google Fonts
- **Z-index stratificato**: canvas (default) → `.ui-screen` (10) → `#uiHud` (10) → `#uiDialogue` (20)

### HTML

- **ID naming**: prefisso `ui` per schermate (es. `uiHome`, `uiHud`, `uiVictory`), prefisso `btn` per bottoni (es. `btnStart`, `btnBreath`), suffisso descrittivo per bottoni duplicati (es. `btnRestartVictory`, `btnRestartGameover`).
- **Schermate**: ogni schermata modale ha `class="ui-screen"` e ID univoco. L'eccezione è `#uiHud` che non ha la classe `.ui-screen` per evitare di ereditare background e fullscreen.
- **I bottoni nelle schermate di fine partita** hanno ID distinti (`btnRestartVictory` vs `btnRestartGameover`) perché coesistono nello stesso DOM.

## Pattern: Stato di gioco (`game.js`)

Lo stato è creato da `createGameState()` e contiene TUTTO ciò che serve per rappresentare la partita corrente:

```js
{
  phase, hoard, score, bestScore, combo, breathCharge,
  currentWave, currentAct, waveTimer, spawnTimer,
  intruders: [{ id, typeId, typeDef, holeIndex, tapsRemaining, timer, maxTimer, active, scale, hitFlash, emerging, emergingTimer }],
  particles: [{ x, y, vx, vy, life, maxLife, size, color }],
  floatingTexts: [{ x, y, text, color, alpha, duration }],
  bossesSpawned: {}, bossesDebutShown: {}, nourSummonTimers: {},
  dialogue, dialogueTimer, hoardLowWarned, waveStarted,
  intermissionTimer, intermissionType, shakeTimer, shakeIntensity,
  palette, breathReadyFlash, cespuglioFound,
}
```

**Phases** (macchina a stati):
```
home → intro → intermission → playing → (intermission → playing ⋯) → victory | gameover
```

### Regole della macchina a stati

- `home` — schermata iniziale
- `intro` — monologo iniziale di Venomfang
- `intermission` — pausa tra ondate/atti; `intermissionTimer` decrementa, poi → `playing`
- `playing` — ondata attiva; si gioca finché timer ondata scade (→ `intermission`) o hoard = 0 (→ `gameover`)
- `victory` / `gameover` — schermate finali

Le transizioni di fase sono gestite:
1. **Logica** in `game.js` (`advanceWave`, `startWave`, `intruderTimeout`, etc.)
2. **UI** in `main.js` (game loop controlla `state.phase` e chiama `showScreen()`)

## Pattern: Game loop (`main.js`)

```js
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  // 1. Update (logica)
  if (state.phase === 'playing' || state.phase === 'intermission')
    updateGame(state, dt);
  // 2. Transizioni UI
  // 3. Render (canvas)
  render();
  // 4. HUD update (DOM)
  updateHUD();
  requestAnimationFrame(gameLoop);
}
```

- **Delta time** con cap a 100ms per evitare salti in caso di tab in background
- **Resize canvas** mantenendo aspect ratio (800×1000 logici)
- **Input**: singolo `handlePointer` via `pointerdown` sul canvas, coordinate trasformate in spazio logico

## Pattern: Intrusi

Definiti in `INTRUDER_TYPES` in `data.js`. Ogni tipo ha:

```js
id, name, subtitle?, tapsRequired, points, hoardDamage,
visibleDuration (secondi), color, emoji, description, isBoss?,
hoardBonus? (per cultista), spawnWeight? (per cespuglio),
songMultiplier? (per Giggin), summonInterval? (per Nour)
```

**Aggiungere un nuovo intruso:**
1. Aggiungere entry in `INTRUDER_TYPES` in `data.js`
2. Se deve apparire in ondate, aggiungerlo al `pool` delle ondate desiderate in `WAVES`
3. Se è un boss con meccanica speciale, implementare la logica in `game.js`
4. Aggiungere battute in `DIALOGUE` (debutto e sgombero)
5. Se necessario, aggiungere logica di rendering in `main.js`

## Pattern: Ondate

Definite in `WAVES` array in `data.js`. Ogni ondata:

```js
{ act, wave, duration, spawnInterval, maxActive, pool: [{ type, weight }],
  durationMultiplier, boss?, bossCount?, bossRush?, bosses? }
```

**Aggiungere/modificare ondate:**
- Aggiungere/rimuovere elementi in `WAVES`. L'ultima ondata (indice 9) è il boss rush finale.
- Modificare `pool` per bilanciare i tipi di intrusi.
- `durationMultiplier` scala `visibleDuration` di tutti gli intrusi nell'ondata (difficoltà).

## Pattern: Palette per atto

```js
ACT_PALETTES = {
  1: { bg, bgGradient, accent, gold, text, hudBg, holeColor, holeBorder, particleColor },
  2: { ... },
  3: { ... },
}
```

Cambiata automaticamente in base a `state.currentAct`. La palette attuale è in `state.palette`.

**Aggiungere un atto/palette:**
1. Aggiungere entry in `ACT_PALETTES` in `data.js`
2. Assicurarsi che `WAVES` abbia ondate con `act: N`
3. Aggiungere interludio in `DIALOGUE.actInterludes[N]`

## Pattern: Dialoghi e testi

Tutte le battute di Venomfang sono in `DIALOGUE` in `data.js` e vanno usate **verbatim** (nessuna modifica, nessuna parafrasi).

Il dialogo in-game appare in due modi:
1. **`showInGameDialogue(text, duration)`** in `main.js` — box in fondo allo schermo, si nasconde dopo `duration` secondi
2. **`state.dialogue`** gestito in `game.js` — per messaggi legati allo stato (hoard basso, soffio pronto)

Per i debutti dei boss, `checkBossDebut()` in `main.js` monitora `state.bossesSpawned`.

## Pattern: Input

L'unico gestore di input è `handlePointer` su `canvas` (evento `pointerdown`):
- Coordinate trasformate in spazio logico: `(e.clientX - rect.left - offsetX) / scale`
- Hit test su intrusi attivi con `hitTestIntruder()`
- Aree generose (`HOLE_RADIUS * 0.85`) per touch
- Se Nour è scudata da Elariel, il tap mostra "SCUDATO!" invece di danneggiare
- Toccare il vuoto non penalizza mai

## Pattern: Particelle e floating text

- **Particelle**: array in stato, aggiornate in `updateGame()`, renderizzate in `renderParticles()` come cerchi con gravità e fade. Aggiunte con `addParticles(state, x, y, count, color)`.
- **Floating text**: array in stato, aggiornate in `updateGame()` (salita + fade), renderizzate in `renderFloatingTexts()`. Aggiunte con `addFloatingText(state, x, y, text, color)`.

## Deploy

Il progetto è uno static site. Per Netlify:
- Drag-and-drop della cartella root, oppure
- Git connesso → publish directory: `.`

Vedi `README.md` per dettagli.

## Bilanciamento note

| Parametro | Valore | Dove |
|---|---|---|
| Hoard iniziale | 100 | `GAME_CONSTANTS.HOARD_MAX` |
| Carica soffio | 25 sgomberi | `GAME_CONSTANTS.BREATH_CHARGE_REQUIRED` |
| Combo cap | ×5 | `GAME_CONSTANTS.COMBO_MULTIPLIER_CAP` |
| Step combo | +0.1 per colpo | `GAME_CONSTANTS.COMBO_MULTIPLIER_STEP` |
| Griglia spawn | 3×3 | `SPAWN_GRID_ROWS/COLS` |
| Risoluzione canvas | 800×1000 logici | `main.js` |
| Raggio buco | 60px logici | `HOLE_RADIUS` |

## Troubleshooting comune

**Problema**: schermo nero, non si vede il canvas
→ Verificare che `#uiHud` NON abbia `class="ui-screen"` nell'HTML (ha stili propri)

**Problema**: backdrop scuro che copre tutto in game
→ Controllare che `#uiHud` sia trasparente: `position: absolute; width: 100%; height: auto` senza background

**Problema**: ID duplicati in console
→ I bottoni di victory e gameover hanno ID distinti (`btnRestartVictory` vs `btnRestartGameover`)

**Problema**: gli intrusi non spariscono dopo essere stati colpiti
→ Verificare in `updateGame()` che gli intrusi inattivi abbiano `scale -= dt * 2` per l'animazione di uscita

**Problema**: il gioco non parte (loop fermo)
→ Verificare che `requestAnimationFrame(gameLoop)` sia chiamato dopo `showScreen('home')`
