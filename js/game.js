// ============================================================
// game.js — Stato e logica di gioco
// ============================================================

import { INTRUDER_TYPES, WAVES, DIALOGUE, GAME_CONSTANTS } from './data.js';

const C = GAME_CONSTANTS;

// --- Creazione stato iniziale ---
export function createGameState() {
  return {
    phase: 'home',       // home | intro | playing | intermission | victory | gameover
    hoard: C.HOARD_MAX,
    score: 0,
    bestScore: loadBestScore(),
    combo: 0,
    breathCharge: 0,
    currentWave: 0,      // indice in WAVES (0-based)
    currentAct: 1,
    waveTimer: 0,        // tempo rimanente nell'ondata
    spawnTimer: 0,       // countdown al prossimo spawn
    intruders: [],       // intrusi attivi sul campo
    particles: [],       // particelle visive
    floatingTexts: [],   // numeri/testi fluttuanti
    bossesSpawned: {},   // traccia quali boss sono stati spawnati nell'ondata corrente
    bossesDebutShown: {}, // traccia quali debut sono stati mostrati (globale)
    nourSummonTimers: {}, // timer evocazione per ogni Nour attivo
    dialogue: null,      // battuta da mostrare (testo + durata)
    dialogueTimer: 0,
    hoardLowWarned: false,
    waveStarted: false,
    intermissionTimer: 0,
    intermissionType: null, // 'act' | 'wave' | 'intro'
    shakeTimer: 0,
    shakeIntensity: 0,
    palette: null,       // palette corrente (set in base all'atto)
    breathReadyFlash: 0,
    cespuglioFound: false, // easter egg trovato
  };
}

// --- LocalStorage ---
export function loadBestScore() {
  try {
    const val = localStorage.getItem(C.LOCALSTORAGE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    localStorage.setItem(C.LOCALSTORAGE_KEY, String(score));
  } catch { /* ignore */ }
}

// --- Moltiplicatore combo ---
export function getComboMultiplier(combo) {
  return Math.min(1 + combo * C.COMBO_MULTIPLIER_STEP, C.COMBO_MULTIPLIER_CAP);
}

// --- Spawn intruso ---
let nextIntruderId = 1;

export function spawnIntruder(state, typeId, holeIndex) {
  const typeDef = INTRUDER_TYPES[typeId];
  if (!typeDef) return null;

  const waveConfig = WAVES[state.currentWave];
  const durationMult = waveConfig ? waveConfig.durationMultiplier : 1.0;

  // Se Giggin è attivo, accorcia la durata degli altri
  const gigginActive = state.intruders.some(i => i.typeId === 'giggin' && i.active);
  const songMult = (gigginActive && typeId !== 'giggin' && typeId !== 'cultista')
    ? (INTRUDER_TYPES.giggin.songMultiplier || 0.65)
    : 1.0;

  const visibleDuration = typeDef.visibleDuration * durationMult * songMult;

  const intruder = {
    id: nextIntruderId++,
    typeId,
    typeDef,
    holeIndex,
    tapsRemaining: typeDef.tapsRequired,
    timer: visibleDuration,
    maxTimer: visibleDuration,
    active: true,
    scale: 0,        // animazione entrata
    scaleTarget: 1,
    hitFlash: 0,     // flash quando colpito
    emerging: true,  // sta emergendo dal buco
    emergingTimer: 0.3, // tempo animazione emersione
  };

  state.intruders.push(intruder);
  return intruder;
}

// --- Scelta tipo dal pool ---
export function pickFromPool(pool) {
  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return pool[pool.length - 1].type;
}

// --- Trova buco libero ---
export function findFreeHole(state) {
  const occupied = new Set(state.intruders.filter(i => i.active).map(i => i.holeIndex));
  const free = [];
  for (let i = 0; i < C.SPAWN_GRID_ROWS * C.SPAWN_GRID_COLS; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return -1;
  return free[Math.floor(Math.random() * free.length)];
}

// --- Tap su intruso ---
export function tapIntruder(state, intruder) {
  if (!intruder.active) return;

  intruder.tapsRemaining--;
  intruder.hitFlash = 0.2;
  intruder.scale = 0.8; // punch effect

  if (intruder.tapsRemaining <= 0) {
    // Sgomberato!
    const mult = getComboMultiplier(state.combo);
    const points = Math.round(intruder.typeDef.points * mult);
    state.score += points;
    state.combo++;
    state.breathCharge = Math.min(state.breathCharge + 1, C.BREATH_CHARGE_REQUIRED);

    // Cultista: bonus hoard
    if (intruder.typeId === 'cultista' && intruder.typeDef.hoardBonus) {
      state.hoard = Math.min(state.hoard + intruder.typeDef.hoardBonus, C.HOARD_MAX);
    }

    // Cespuglio: easter egg
    if (intruder.typeId === 'cespuglio') {
      state.cespuglioFound = true;
    }

    // Deboss: rimuovi timer di Nour
    if (intruder.typeId === 'nour') {
      delete state.nourSummonTimers[intruder.id];
    }

    intruder.active = false;

    // Floating text
    return { points, typeId: intruder.typeId };
  }

  return null; // non ancora sgomberato
}

// --- Timeout intruso (raggiunge l'hoard) ---
export function intruderTimeout(state, intruder) {
  if (!intruder.active) return;

  intruder.active = false;
  const damage = intruder.typeDef.hoardDamage || 0;

  if (damage > 0) {
    state.hoard = Math.max(0, state.hoard - damage);
    state.combo = 0; // combo si azzera solo su timeout con danno

    // Shake per PG
    if (intruder.typeDef.isBoss) {
      state.shakeTimer = 0.4;
      state.shakeIntensity = 8;
    } else {
      state.shakeTimer = 0.15;
      state.shakeIntensity = 3;
    }
  }
  // Cultista e cespuglio: se non toccati, se ne vanno senza danno e senza azzerare combo

  if (state.hoard <= 0) {
    state.phase = 'gameover';
  }

  return damage;
}

// --- Soffio Velenoso ---
export function useBreathAttack(state) {
  if (state.breathCharge < C.BREATH_CHARGE_REQUIRED) return 0;

  state.breathCharge = 0;
  let totalPoints = 0;
  const mult = getComboMultiplier(state.combo);

  const active = state.intruders.filter(i => i.active);
  for (const intruder of active) {
    const points = Math.round(intruder.typeDef.points * mult);
    totalPoints += points;
    state.combo++;
    intruder.active = false;

    // Rimuovi Nour timers
    if (intruder.typeId === 'nour') {
      delete state.nourSummonTimers[intruder.id];
    }

    // Bonus cultista
    if (intruder.typeId === 'cultista' && intruder.typeDef.hoardBonus) {
      state.hoard = Math.min(state.hoard + intruder.typeDef.hoardBonus, C.HOARD_MAX);
    }
  }

  state.score += totalPoints;
  return totalPoints;
}

// --- Elariel scuda Nour ---
export function isShielded(state, intruder) {
  if (intruder.typeId !== 'nour') return false;
  // Nour è scudata se Elariel è presente e attiva
  return state.intruders.some(i => i.typeId === 'elariel' && i.active);
}

// --- Nour evoca non-morti ---
export function processNourSummons(state, dt) {
  const nourIntruders = state.intruders.filter(i => i.typeId === 'nour' && i.active);

  for (const nour of nourIntruders) {
    if (!state.nourSummonTimers[nour.id]) {
      state.nourSummonTimers[nour.id] = INTRUDER_TYPES.nour.summonInterval;
    }

    state.nourSummonTimers[nour.id] -= dt;
    if (state.nourSummonTimers[nour.id] <= 0) {
      state.nourSummonTimers[nour.id] = INTRUDER_TYPES.nour.summonInterval;
      // Evoca un non-morto
      const hole = findFreeHole(state);
      if (hole >= 0) {
        spawnIntruder(state, 'nonmorto', hole);
      }
    }
  }
}

// --- Avanzamento ondata ---
export function advanceWave(state) {
  state.currentWave++;
  if (state.currentWave >= WAVES.length) {
    // Vittoria!
    if (state.hoard > 0) {
      state.phase = 'victory';
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        saveBestScore(state.score);
      }
    }
    return;
  }

  const waveConfig = WAVES[state.currentWave];
  const newAct = waveConfig.act;

  // Reset boss tracker
  state.bossesSpawned = {};
  state.nourSummonTimers = {};
  state.hoardLowWarned = false;

  // Intermission
  state.phase = 'intermission';
  state.intermissionTimer = 3.5;

  if (newAct !== state.currentAct) {
    state.currentAct = newAct;
    state.intermissionType = 'act';
    state.intermissionTimer = 5.0;
  } else {
    state.intermissionType = 'wave';
  }
}

// --- Start ondata ---
export function startWave(state) {
  const waveConfig = WAVES[state.currentWave];
  state.phase = 'playing';
  state.waveTimer = waveConfig.duration;
  state.spawnTimer = 1.0; // primo spawn dopo 1s
  state.intruders = [];
  state.bossesSpawned = {};
  state.nourSummonTimers = {};
  state.waveStarted = true;
  state.hoardLowWarned = false;
}

// --- Update principale ---
export function updateGame(state, dt) {
  // Aggiorna dialogo
  if (state.dialogueTimer > 0) {
    state.dialogueTimer -= dt;
    if (state.dialogueTimer <= 0) {
      state.dialogue = null;
    }
  }

  // Shake
  if (state.shakeTimer > 0) {
    state.shakeTimer -= dt;
  }

  // Breath ready flash
  if (state.breathCharge >= C.BREATH_CHARGE_REQUIRED) {
    state.breathReadyFlash += dt * 3;
  } else {
    state.breathReadyFlash = 0;
  }

  // Hoard low warning
  if (state.hoard <= C.HOARD_LOW_THRESHOLD && !state.hoardLowWarned) {
    state.hoardLowWarned = true;
    showDialogue(state, 'hoardLow', 3);
  }

  if (state.phase === 'intermission') {
    state.intermissionTimer -= dt;
    if (state.intermissionTimer <= 0) {
      startWave(state);
    }
    return;
  }

  if (state.phase !== 'playing') return;

  const waveConfig = WAVES[state.currentWave];

  // Timer ondata
  state.waveTimer -= dt;
  if (state.waveTimer <= 0) {
    // Ondata finita — aspetta che tutti gli intrusi spariscano
    const anyActive = state.intruders.some(i => i.active);
    if (!anyActive) {
      advanceWave(state);
      return;
    }
  }

  // Spawn nuovi intrusi
  if (state.waveTimer > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const activeCount = state.intruders.filter(i => i.active).length;
      if (activeCount < waveConfig.maxActive) {
        trySpawnIntruder(state, waveConfig);
      }
      state.spawnTimer = waveConfig.spawnInterval * (0.8 + Math.random() * 0.4);
    }
  }

  // Boss rush (ondata 10): spawn iniziale dei 4 PG
  if (waveConfig.bossRush && !state.waveStarted) {
    state.waveStarted = true;
  }

  // Process Nour summons
  processNourSummons(state, dt);

  // Aggiorna intrusi
  for (const intruder of state.intruders) {
    if (!intruder.active) {
      // Animazione uscita per intrusi sgomberati
      if (intruder.scale > 0) {
        intruder.scale -= dt * 2; // sparisce in ~0.5s
        if (intruder.scale < 0) intruder.scale = 0;
      }
      continue;
    }

    // Animazione emersione
    if (intruder.emerging) {
      intruder.emergingTimer -= dt;
      intruder.scale = 1 - (intruder.emergingTimer / 0.3);
      if (intruder.emergingTimer <= 0) {
        intruder.emerging = false;
        intruder.scale = 1;
      }
    }

    // Hit flash
    if (intruder.hitFlash > 0) {
      intruder.hitFlash -= dt;
    }

    // Scale recovery
    if (!intruder.emerging && intruder.scale < 1) {
      intruder.scale = Math.min(1, intruder.scale + dt * 4);
    }

    // Timer
    intruder.timer -= dt;
    if (intruder.timer <= 0) {
      const damage = intruderTimeout(state, intruder);
    }
  }

  // Pulizia intrusi inattivi
  state.intruders = state.intruders.filter(i => i.active || i.scale > 0);

  // Aggiorna particelle
  updateParticles(state, dt);

  // Aggiorna floating texts
  state.floatingTexts = state.floatingTexts.filter(ft => {
    ft.y -= 40 * dt;
    ft.alpha -= dt / ft.duration;
    return ft.alpha > 0;
  });
}

// --- Spawn logico ---
function trySpawnIntruder(state, waveConfig) {
  // Boss rush: spawn iniziale
  if (waveConfig.bossRush && waveConfig.bosses) {
    for (const bossId of waveConfig.bosses) {
      if (!state.bossesSpawned[bossId]) {
        const hole = findFreeHole(state);
        if (hole >= 0) {
          spawnIntruder(state, bossId, hole);
          state.bossesSpawned[bossId] = true;
        }
      }
    }
    return;
  }

  // Boss pianificato per l'ondata
  if (waveConfig.boss && !state.bossesSpawned[waveConfig.boss]) {
    // Spawn del boss a metà ondata circa
    const elapsed = waveConfig.duration - state.waveTimer;
    if (elapsed > waveConfig.duration * 0.3 && elapsed < waveConfig.duration * 0.6) {
      const hole = findFreeHole(state);
      if (hole >= 0) {
        spawnIntruder(state, waveConfig.boss, hole);
        state.bossesSpawned[waveConfig.boss] = true;

        // Mostra debut dialogue se prima volta
        if (!state.bossesDebutShown[waveConfig.boss]) {
          state.bossesDebutShown[waveConfig.boss] = true;
          // Il debut sarà mostrato dalla UI
        }
        return;
      }
    }
  }

  // Spawn normale dal pool
  const typeId = pickFromPool(waveConfig.pool);
  const hole = findFreeHole(state);
  if (hole >= 0) {
    spawnIntruder(state, typeId, hole);
  }
}

// --- Mostra dialogo ---
export function showDialogue(state, key, duration = 3) {
  let text;
  if (key === 'hoardLow') text = DIALOGUE.hoardLow;
  else if (key === 'breathReady') text = DIALOGUE.breathReady;
  else if (key === 'breathUsed') text = DIALOGUE.breathUsed;
  else if (key === 'cultistaHit') text = DIALOGUE.cultistaHit;
  else if (key === 'cespuglioHit') text = DIALOGUE.cespuglioHit;
  else text = key; // testo diretto

  state.dialogue = text;
  state.dialogueTimer = duration;
}

// --- Particelle ---
export function addParticles(state, x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 80;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.4 + Math.random() * 0.4,
      size: 2 + Math.random() * 4,
      color: color || '#50c040',
    });
  }
}

export function addFloatingText(state, x, y, text, color = '#ffd700') {
  state.floatingTexts.push({
    x, y,
    text,
    color,
    alpha: 1,
    duration: 1.0,
  });
}

function updateParticles(state, dt) {
  state.particles = state.particles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 100 * dt; // gravità
    p.life -= dt;
    return p.life > 0;
  });
}

// --- Hit test ---
export function hitTestIntruder(state, x, y, holePositions, holeRadius) {
  // Controlla dal più recente al più vecchio (z-order)
  for (let i = state.intruders.length - 1; i >= 0; i--) {
    const intruder = state.intruders[i];
    if (!intruder.active) continue;

    const pos = holePositions[intruder.holeIndex];
    if (!pos) continue;

    const dx = x - pos.x;
    const dy = y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Area generosa per mobile
    const hitRadius = holeRadius * 0.85;
    if (dist < hitRadius) {
      // Check scudo Elariel
      if (isShielded(state, intruder)) {
        // Non toccabile, mostra feedback
        return { intruder, shielded: true };
      }
      return { intruder, shielded: false };
    }
  }
  return null;
}
