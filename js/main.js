// ============================================================
// main.js — Game loop, rendering, input handling
// ============================================================

import {
  INTRUDER_TYPES,
  WAVES,
  DIALOGUE,
  ACT_PALETTES,
  GAME_CONSTANTS,
} from './data.js';

import {
  createGameState,
  loadBestScore,
  saveBestScore,
  getComboMultiplier,
  spawnIntruder,
  tapIntruder,
  intruderTimeout,
  useBreathAttack,
  isShielded,
  updateGame,
  addParticles,
  addFloatingText,
  hitTestIntruder,
  startWave,
} from './game.js';

const C = GAME_CONSTANTS;

// --- Sprite loading ---
const sprites = new Map();

function loadSprites() {
  const types = Object.values(INTRUDER_TYPES);
  for (const type of types) {
    if (!type.sprite) continue;
    const img = new Image();
    img.src = `js/sprites/${type.sprite}.png`;
    img.onload = () => { sprites.set(type.id, img); };
    // Fallback: se non carica, si usa l'emoji
    img.onerror = () => console.warn(`Sprite non trovata: ${type.sprite}.png`);
  }

  // Carica anche venomfang per la home
  const vf = new Image();
  vf.src = 'js/sprites/venomfang.png';
  vf.onload = () => { sprites.set('venomfang', vf); };
}

loadSprites();

// --- Canvas setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Logical resolution
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 1000;

// Scaling
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Calculate scale to fit logical resolution
  const scaleX = rect.width / LOGICAL_WIDTH;
  const scaleY = rect.height / LOGICAL_HEIGHT;
  scale = Math.min(scaleX, scaleY);

  offsetX = (rect.width - LOGICAL_WIDTH * scale) / 2;
  offsetY = (rect.height - LOGICAL_HEIGHT * scale) / 2;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Game state ---
let state = createGameState();

// --- Hole positions (3x3 grid) ---
const HOLE_GRID = {
  top: 250,
  left: 100,
  width: 600,
  height: 500,
};

function getHolePositions() {
  const positions = [];
  const rows = C.SPAWN_GRID_ROWS;
  const cols = C.SPAWN_GRID_COLS;
  const cellWidth = HOLE_GRID.width / cols;
  const cellHeight = HOLE_GRID.height / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: HOLE_GRID.left + cellWidth * (col + 0.5),
        y: HOLE_GRID.top + cellHeight * (row + 0.5),
      });
    }
  }
  return positions;
}

const HOLE_POSITIONS = getHolePositions();
const HOLE_RADIUS = 60;

// --- UI Elements ---
const uiHome = document.getElementById('uiHome');
const uiIntro = document.getElementById('uiIntro');
const uiHud = document.getElementById('uiHud');
const uiIntermission = document.getElementById('uiIntermission');
const uiVictory = document.getElementById('uiVictory');
const uiGameOver = document.getElementById('uiGameOver');

const btnStart = document.getElementById('btnStart');
const btnBreath = document.getElementById('btnBreath');
const btnRestartVictory = document.getElementById('btnRestartVictory');
const btnHomeVictory = document.getElementById('btnHomeVictory');
const btnRestartGameover = document.getElementById('btnRestartGameover');
const btnHomeGameover = document.getElementById('btnHomeGameover');

const hoardBar = document.getElementById('hoardBar');
const hoardFill = document.getElementById('hoardFill');
const scoreDisplay = document.getElementById('scoreDisplay');
const bestDisplay = document.getElementById('bestDisplay');
const bestDisplayHud = document.getElementById('bestDisplayHud');
const waveDisplay = document.getElementById('waveDisplay');
const actDisplay = document.getElementById('actDisplay');
const breathFill = document.getElementById('breathFill');
const comboDisplay = document.getElementById('comboDisplay');

const introText = document.getElementById('introText');
const intermissionTitle = document.getElementById('intermissionTitle');
const intermissionText = document.getElementById('intermissionText');
const victoryScore = document.getElementById('victoryScore');
const gameOverScore = document.getElementById('gameOverScore');
const dialogueBox = document.getElementById('dialogueBox');

// --- Event handlers ---
btnStart.addEventListener('click', () => {
  state = createGameState();
  state.phase = 'intro';
  introText.textContent = DIALOGUE.intro;
  showScreen('intro');
});

document.getElementById('btnIntroContinue').addEventListener('click', () => {
  state.currentWave = 0;
  state.currentAct = 1;
  state.phase = 'intermission';
  state.intermissionType = 'act';
  state.intermissionTimer = 5.0;
  showScreen('intermission');
  intermissionTitle.textContent = 'Atto I';
  intermissionText.textContent = DIALOGUE.actInterludes[1];
});

btnBreath.addEventListener('click', () => {
  if (state.breathCharge >= C.BREATH_CHARGE_REQUIRED) {
    const points = useBreathAttack(state);
    if (points > 0) {
      addFloatingText(state, LOGICAL_WIDTH / 2, 300, `+${points}`, '#50ff50');
      // Big particle burst
      for (const intruder of state.intruders) {
        if (!intruder.active) continue;
        const pos = HOLE_POSITIONS[intruder.holeIndex];
        addParticles(state, pos.x, pos.y, 15, state.palette?.particleColor || '#50c040');
      }
      showInGameDialogue(DIALOGUE.breathUsed, 2);
    }
  }
});

btnRestartVictory.addEventListener('click', () => {
  state = createGameState();
  state.phase = 'intro';
  introText.textContent = DIALOGUE.intro;
  showScreen('intro');
});

btnHomeVictory.addEventListener('click', () => {
  state = createGameState();
  showScreen('home');
});

btnRestartGameover.addEventListener('click', () => {
  state = createGameState();
  state.phase = 'intro';
  introText.textContent = DIALOGUE.intro;
  showScreen('intro');
});

btnHomeGameover.addEventListener('click', () => {
  state = createGameState();
  showScreen('home');
});

// --- Pointer input ---
let pointerDown = false;

function handlePointer(e) {
  if (state.phase !== 'playing') return;

  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;

  const hit = hitTestIntruder(state, x, y, HOLE_POSITIONS, HOLE_RADIUS);

  if (hit) {
    if (hit.shielded) {
      // Feedback scudo
      const pos = HOLE_POSITIONS[hit.intruder.holeIndex];
      addFloatingText(state, pos.x, pos.y - 40, 'SCUDATO!', '#c0c0e0');
      addParticles(state, pos.x, pos.y, 5, '#c0c0e0');
      return;
    }

    const result = tapIntruder(state, hit.intruder);
    const pos = HOLE_POSITIONS[hit.intruder.holeIndex];

    // Particelle e feedback
    addParticles(state, pos.x, pos.y, 8, state.palette?.particleColor || '#50c040');

    if (result) {
      // Sgomberato!
      const mult = getComboMultiplier(state.combo - 1);
      addFloatingText(state, pos.x, pos.y - 40, `+${result.points}`, '#ffd700');

      // Dialogue speciali
      if (result.typeId === 'cultista') {
        showInGameDialogue(DIALOGUE.cultistaHit, 2.5);
      } else if (result.typeId === 'cespuglio') {
        showInGameDialogue(DIALOGUE.cespuglioHit, 3);
      } else if (INTRUDER_TYPES[result.typeId]?.isBoss) {
        const defeatText = DIALOGUE.bossDefeat[result.typeId];
        if (defeatText) {
          showInGameDialogue(defeatText, 2.5);
        }
      }
    } else {
      // Colpito ma non ancora sgomberato
      addFloatingText(state, pos.x, pos.y - 40, `${hit.intruder.tapsRemaining}×`, '#ffffff');
    }
  }
}

canvas.addEventListener('pointerdown', handlePointer);

// --- Screen management ---
function showScreen(screen) {
  uiHome.style.display = screen === 'home' ? 'flex' : 'none';
  uiIntro.style.display = screen === 'intro' ? 'flex' : 'none';
  uiHud.style.display = screen === 'playing' ? 'block' : 'none';
  uiIntermission.style.display = screen === 'intermission' ? 'flex' : 'none';
  uiVictory.style.display = screen === 'victory' ? 'flex' : 'none';
  uiGameOver.style.display = screen === 'gameover' ? 'flex' : 'none';

  if (screen === 'home') {
    bestDisplay.textContent = state.bestScore.toLocaleString('it-IT');
  }
}

function showInGameDialogue(text, duration = 3) {
  dialogueBox.textContent = text;
  dialogueBox.style.opacity = '1';
  setTimeout(() => {
    dialogueBox.style.opacity = '0';
  }, duration * 1000);
}

// --- Rendering ---
function render() {
  ctx.save();

  // Clear
  ctx.fillStyle = state.palette?.bg || '#1a1a12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply scaling
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Shake
  if (state.shakeTimer > 0) {
    const shakeX = (Math.random() - 0.5) * state.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * state.shakeIntensity;
    ctx.translate(shakeX, shakeY);
  }

  if (state.phase === 'playing' || state.phase === 'intermission') {
    renderGameField();
    renderHoles();
    renderIntruders();
    renderParticles();
    renderFloatingTexts();
  }

  ctx.restore();
}

function renderGameField() {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  const colors = state.palette?.bgGradient || ['#1a1a12', '#2a2820'];
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Hoard (torre in alto)
  const hoardX = LOGICAL_WIDTH / 2;
  const hoardY = 120;

  // Glow
  const glowSize = 80 + Math.sin(Date.now() / 500) * 10;
  const glowGradient = ctx.createRadialGradient(hoardX, hoardY, 0, hoardX, hoardY, glowSize);
  glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
  glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(hoardX - glowSize, hoardY - glowSize, glowSize * 2, glowSize * 2);

  // Torre
  ctx.fillStyle = state.palette?.gold || '#c0a040';
  ctx.fillRect(hoardX - 40, hoardY - 50, 80, 100);
  ctx.fillStyle = state.palette?.accent || '#4a7a30';
  ctx.beginPath();
  ctx.moveTo(hoardX - 50, hoardY - 50);
  ctx.lineTo(hoardX, hoardY - 90);
  ctx.lineTo(hoardX + 50, hoardY - 50);
  ctx.closePath();
  ctx.fill();

  // Tesoro
  ctx.font = '40px serif';
  ctx.textAlign = 'center';
  ctx.fillText('💰', hoardX, hoardY + 20);
}

function renderHoles() {
  for (let i = 0; i < HOLE_POSITIONS.length; i++) {
    const pos = HOLE_POSITIONS[i];

    // Buco
    ctx.fillStyle = state.palette?.holeColor || '#2a2818';
    ctx.strokeStyle = state.palette?.holeBorder || '#3a3828';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, HOLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bordo interno
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, HOLE_RADIUS * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function renderIntruders() {
  for (const intruder of state.intruders) {
    if (!intruder.active && intruder.scale <= 0) continue;

    const pos = HOLE_POSITIONS[intruder.holeIndex];
    if (!pos) continue;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(intruder.scale, intruder.scale);

    // Hit flash
    if (intruder.hitFlash > 0) {
      ctx.globalAlpha = 0.5 + intruder.hitFlash * 2;
    }

    // Scudo (Elariel protegge Nour)
    if (isShielded(state, intruder)) {
      ctx.strokeStyle = '#c0c0e0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, HOLE_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Glow scudo
      const shieldGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, HOLE_RADIUS * 0.7);
      shieldGlow.addColorStop(0, 'rgba(192, 192, 224, 0.2)');
      shieldGlow.addColorStop(1, 'rgba(192, 192, 224, 0)');
      ctx.fillStyle = shieldGlow;
      ctx.fillRect(-HOLE_RADIUS, -HOLE_RADIUS, HOLE_RADIUS * 2, HOLE_RADIUS * 2);
    }

    // Sprite o fallback emoji
    const sprite = sprites.get(intruder.typeId);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const size = HOLE_RADIUS * 1.4;
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    } else {
      // Fallback: corpo colorato + emoji
      const color = intruder.typeDef.color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, HOLE_RADIUS * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '50px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(intruder.typeDef.emoji, 0, 0);
    }

    // Boss indicator
    if (intruder.typeDef.isBoss) {
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(intruder.typeDef.name, 0, -HOLE_RADIUS * 0.8);
    }

    // Timer ring
    if (intruder.active) {
      const progress = intruder.timer / intruder.maxTimer;
      ctx.strokeStyle = progress > 0.3 ? '#50c040' : '#c04020';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, HOLE_RADIUS * 0.65, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
    }

    // Tap indicator
    if (intruder.tapsRemaining > 1) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${intruder.tapsRemaining}×`, 0, HOLE_RADIUS * 0.8);
    }

    ctx.restore();
  }
}

function renderParticles() {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderFloatingTexts() {
  for (const ft of state.floatingTexts) {
    ctx.globalAlpha = ft.alpha;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}

// --- HUD Update ---
function updateHUD() {
  if (state.phase !== 'playing') return;

  // Palette
  state.palette = ACT_PALETTES[state.currentAct] || ACT_PALETTES[1];

  // Hoard bar
  const hoardPercent = (state.hoard / C.HOARD_MAX) * 100;
  hoardFill.style.width = `${hoardPercent}%`;

  if (hoardPercent <= C.HOARD_LOW_THRESHOLD) {
    hoardFill.classList.add('low');
  } else {
    hoardFill.classList.remove('low');
  }

  // Score
  scoreDisplay.textContent = state.score.toLocaleString('it-IT');
  bestDisplayHud.textContent = state.bestScore.toLocaleString('it-IT');

  // Wave/Act
  const waveConfig = WAVES[state.currentWave];
  waveDisplay.textContent = `Ondata ${waveConfig.wave}`;
  actDisplay.textContent = `Atto ${state.currentAct}`;

  // Combo
  const mult = getComboMultiplier(state.combo);
  if (state.combo > 0) {
    comboDisplay.textContent = `×${mult.toFixed(1)}`;
    comboDisplay.style.opacity = '1';
  } else {
    comboDisplay.style.opacity = '0';
  }

  // Breath
  const breathPercent = (state.breathCharge / C.BREATH_CHARGE_REQUIRED) * 100;
  breathFill.style.width = `${breathPercent}%`;

  if (state.breathCharge >= C.BREATH_CHARGE_REQUIRED) {
    btnBreath.classList.add('ready');
    btnBreath.disabled = false;
  } else {
    btnBreath.classList.remove('ready');
    btnBreath.disabled = true;
  }
}

// --- Game loop ---
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // cap delta time
  lastTime = timestamp;

  // Update
  if (state.phase === 'playing') {
    updateGame(state, dt);
  } else if (state.phase === 'intermission') {
    updateGame(state, dt);
  }

  // Check phase transitions — sincronizza UI con state.phase
  if (state.phase === 'playing' && uiHud.style.display !== 'block') {
    showScreen('playing');
  } else if (state.phase === 'intermission' && uiIntermission.style.display !== 'flex') {
    // Imposta testo interludio
    const waveConfig = WAVES[state.currentWave];
    if (state.intermissionType === 'act') {
      intermissionTitle.textContent = `Atto ${state.currentAct}`;
      intermissionText.textContent = DIALOGUE.actInterludes[state.currentAct] || '';
    } else {
      intermissionTitle.textContent = `Ondata ${waveConfig.wave}`;
      intermissionText.textContent = '';
    }
    showScreen('intermission');
  } else if (state.phase === 'victory' && uiVictory.style.display !== 'flex') {
    victoryScore.textContent = state.score.toLocaleString('it-IT');
    showScreen('victory');
  } else if (state.phase === 'gameover' && uiGameOver.style.display !== 'flex') {
    gameOverScore.textContent = state.score.toLocaleString('it-IT');
    showScreen('gameover');
  }

  // Render
  render();
  updateHUD();

  requestAnimationFrame(gameLoop);
}

// --- Boss debut check ---
function checkBossDebut() {
  if (state.phase !== 'playing') return;

  const waveConfig = WAVES[state.currentWave];
  if (waveConfig.boss && state.bossesSpawned[waveConfig.boss]) {
    if (!state.bossesDebutShown[waveConfig.boss + '_displayed']) {
      state.bossesDebutShown[waveConfig.boss + '_displayed'] = true;
      const debutText = DIALOGUE.bossDebut[waveConfig.boss];
      if (debutText) {
        showInGameDialogue(debutText, 4);
      }
    }
  }
}

setInterval(checkBossDebut, 500);

// --- Init ---
showScreen('home');
requestAnimationFrame(gameLoop);
