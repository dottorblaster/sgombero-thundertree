// ============================================================
// data.js — Roster intrusi, configurazione ondate, battute
// ============================================================

// --- Tipi di intruso ---
export const INTRUDER_TYPES = {
  avventuriero: {
    id: 'avventuriero',
    name: 'Avventuriero Qualunque',
    tapsRequired: 1,
    points: 10,
    hoardDamage: 6,
    visibleDuration: 2.0, // secondi base
    color: '#b08050',
    emoji: '🗡️',
    description: 'base',
  },
  goblin: {
    id: 'goblin',
    name: 'Goblin di Cragmaw',
    tapsRequired: 1,
    points: 15,
    hoardDamage: 4,
    visibleDuration: 1.2, // molto veloce
    color: '#50a030',
    emoji: '👺',
    description: 'veloce',
  },
  nonmorto: {
    id: 'nonmorto',
    name: 'Non-morto Vagante',
    tapsRequired: 2,
    points: 20,
    hoardDamage: 8,
    visibleDuration: 3.0, // lento
    color: '#7070a0',
    emoji: '💀',
    description: 'lento, 2 tap',
  },
  cultista: {
    id: 'cultista',
    name: 'Cultista del Drago',
    tapsRequired: 1,
    points: 30,
    hoardDamage: 0, // se non toccato se ne va senza danno
    hoardBonus: 5,  // se toccato: +5 hoard
    visibleDuration: 1.8,
    color: '#c0a020',
    emoji: '🐉',
    description: 'bonus',
  },
  cespuglio: {
    id: 'cespuglio',
    name: 'Cespuglio del 1487',
    tapsRequired: 1,
    points: 50,
    hoardDamage: 0,
    visibleDuration: 1.0, // molto raro e veloce
    color: '#206020',
    emoji: '🌿',
    description: 'easter egg',
    spawnWeight: 0.03, // probabilità molto bassa
  },

  // --- I quattro PG (mini-boss) ---
  rakuzen: {
    id: 'rakuzen',
    name: 'Rakuzen',
    subtitle: 'Monaca Mezzorca',
    tapsRequired: 3,
    points: 80,
    hoardDamage: 15, // pugno!
    visibleDuration: 2.2,
    color: '#d06030',
    emoji: '👊',
    description: 'pugno devastante',
    isBoss: true,
  },
  giggin: {
    id: 'giggin',
    name: 'Giggin',
    subtitle: 'Bardo Drow',
    tapsRequired: 2,
    points: 70,
    hoardDamage: 8,
    visibleDuration: 2.5,
    color: '#8040c0',
    emoji: '🎵',
    description: 'canto: accorcia visibleDuration degli altri',
    isBoss: true,
    songMultiplier: 0.65, // gli altri intrusi durano il 65% del normale
  },
  nour: {
    id: 'nour',
    name: 'Nour',
    subtitle: 'Negromante Drow',
    tapsRequired: 2,
    points: 70,
    hoardDamage: 8,
    visibleDuration: 2.8,
    color: '#404060',
    emoji: '☠️',
    description: 'evoca non-morti ogni ~1.5s',
    isBoss: true,
    summonInterval: 1.5,
  },
  elariel: {
    id: 'elariel',
    name: 'Elariel',
    subtitle: 'Guerriera Alto Elfo',
    tapsRequired: 3,
    points: 80,
    hoardDamage: 10,
    visibleDuration: 2.5,
    color: '#c0c0e0',
    emoji: '🛡️',
    description: 'scuda Nour',
    isBoss: true,
  },
};

// --- Configurazione ondate ---
// Ogni ondata definisce: durata, tipi disponibili, intervallo spawn, max simultanei, boss
export const WAVES = [
  // Atto I — Quiete Disturbata (1-3)
  {
    act: 1,
    wave: 1,
    duration: 25,
    spawnInterval: 2.2,
    maxActive: 2,
    pool: [
      { type: 'avventuriero', weight: 0.8 },
      { type: 'goblin', weight: 0.2 },
    ],
    durationMultiplier: 1.2, // intrusi visibili più a lungo
  },
  {
    act: 1,
    wave: 2,
    duration: 28,
    spawnInterval: 1.8,
    maxActive: 3,
    pool: [
      { type: 'avventuriero', weight: 0.6 },
      { type: 'goblin', weight: 0.35 },
      { type: 'cespuglio', weight: 0.05 },
    ],
    durationMultiplier: 1.1,
  },
  {
    act: 1,
    wave: 3,
    duration: 30,
    spawnInterval: 1.5,
    maxActive: 3,
    pool: [
      { type: 'avventuriero', weight: 0.5 },
      { type: 'goblin', weight: 0.4 },
      { type: 'cespuglio', weight: 0.1 },
    ],
    durationMultiplier: 1.0,
  },
  // Atto II — L'Avvistamento (4-7)
  {
    act: 2,
    wave: 4,
    duration: 32,
    spawnInterval: 1.6,
    maxActive: 4,
    pool: [
      { type: 'avventuriero', weight: 0.45 },
      { type: 'goblin', weight: 0.3 },
      { type: 'nonmorto', weight: 0.15 },
      { type: 'cespuglio', weight: 0.1 },
    ],
    durationMultiplier: 1.0,
    boss: 'rakuzen',
    bossCount: 1,
  },
  {
    act: 2,
    wave: 5,
    duration: 34,
    spawnInterval: 1.4,
    maxActive: 4,
    pool: [
      { type: 'avventuriero', weight: 0.35 },
      { type: 'goblin', weight: 0.25 },
      { type: 'nonmorto', weight: 0.15 },
      { type: 'cultista', weight: 0.15 },
      { type: 'cespuglio', weight: 0.1 },
    ],
    durationMultiplier: 0.95,
    boss: 'giggin',
    bossCount: 1,
  },
  {
    act: 2,
    wave: 6,
    duration: 36,
    spawnInterval: 1.3,
    maxActive: 5,
    pool: [
      { type: 'avventuriero', weight: 0.3 },
      { type: 'goblin', weight: 0.2 },
      { type: 'nonmorto', weight: 0.25 },
      { type: 'cultista', weight: 0.15 },
      { type: 'cespuglio', weight: 0.1 },
    ],
    durationMultiplier: 0.9,
    boss: 'nour',
    bossCount: 1,
  },
  {
    act: 2,
    wave: 7,
    duration: 38,
    spawnInterval: 1.2,
    maxActive: 5,
    pool: [
      { type: 'avventuriero', weight: 0.25 },
      { type: 'goblin', weight: 0.2 },
      { type: 'nonmorto', weight: 0.2 },
      { type: 'cultista', weight: 0.15 },
      { type: 'cespuglio', weight: 0.1 },
      { type: 'nour', weight: 0.1 },
    ],
    durationMultiplier: 0.85,
    boss: 'elariel',
    bossCount: 1,
  },
  // Atto III — Sono Tornati (8-9)
  {
    act: 3,
    wave: 8,
    duration: 40,
    spawnInterval: 1.0,
    maxActive: 6,
    pool: [
      { type: 'avventuriero', weight: 0.2 },
      { type: 'goblin', weight: 0.2 },
      { type: 'nonmorto', weight: 0.25 },
      { type: 'cultista', weight: 0.15 },
      { type: 'cespuglio', weight: 0.05 },
      { type: 'rakuzen', weight: 0.05 },
      { type: 'giggin', weight: 0.05 },
      { type: 'nour', weight: 0.05 },
    ],
    durationMultiplier: 0.8,
  },
  {
    act: 3,
    wave: 9,
    duration: 42,
    spawnInterval: 0.9,
    maxActive: 6,
    pool: [
      { type: 'avventuriero', weight: 0.15 },
      { type: 'goblin', weight: 0.15 },
      { type: 'nonmorto', weight: 0.25 },
      { type: 'cultista', weight: 0.15 },
      { type: 'cespuglio', weight: 0.05 },
      { type: 'rakuzen', weight: 0.08 },
      { type: 'giggin', weight: 0.07 },
      { type: 'nour', weight: 0.05 },
      { type: 'elariel', weight: 0.05 },
    ],
    durationMultiplier: 0.75,
  },
  // Ondata 10 — "Il Ritorno" (finale boss rush)
  {
    act: 3,
    wave: 10,
    duration: 50,
    spawnInterval: 0.8,
    maxActive: 7,
    pool: [
      { type: 'avventuriero', weight: 0.15 },
      { type: 'goblin', weight: 0.15 },
      { type: 'nonmorto', weight: 0.3 },
      { type: 'cultista', weight: 0.1 },
    ],
    durationMultiplier: 0.7,
    bossRush: true, // tutti e 4 i PG spawnano insieme
    bosses: ['rakuzen', 'giggin', 'nour', 'elariel'],
  },
];

// --- Battute di Venomfang (verbatim) ---
export const DIALOGUE = {
  title: 'Sgombero a Thundertree',
  subtitle: 'Il diario di Venomfang, alla voce Seccature.',

  intro: 'Diario di Venomfang. Ore 03:00. Qualcuno armeggia di nuovo tra le mie rovine. Non ho chiuso occhio — non ne ho uno da chiudere, tecnicamente, ma il principio resta.',

  actInterludes: {
    1: 'Avventurieri. Sempre avventurieri. Conto il tesoro e attendo che si stanchino. Non si stancano mai.',
    2: 'Si sono fatti sotto. Distinguo una mezzorca, due drow e un alto elfo con l\'aria di chi morirebbe per qualcun altro. Gruppo molto tematico. Preparo la frase a effetto.',
    3: 'Sono tornati. Tutti. Avevo lucidato le scaglie per l\'occasione. Stavolta, però, restano.',
  },

  bossDebut: {
    rakuzen: 'La mezzorca attacca a mani nude. A mani nude. Apprezzo l\'ottimismo. Lo aggiungo alla lista, sotto "Coraggio mal riposto".',
    giggin: 'Il bardo intona una ballata sul malvagio drago di Thundertree. Sgomberalo prima della rima: "Venomfang / arrembòmbang" non esiste in alcuna lingua mortale.',
    nour: 'La negromante rianima cadaveri vicino alla mia camera. Il puzzo. Fermala, o avremo ospiti tutta la notte.',
    elariel: 'L\'alto elfo si frappone per proteggere la negromante. Toccante. Anche se difende qualcuno che può rialzarsi dalla morte. Prima la guardia, poi l\'idrante.',
  },

  bossDefeat: {
    rakuzen: 'I pugni non si parano col viso. Eppure insiste.',
    giggin: 'Quattordici volte ha detto il mio nome. Dalla quinta avevo smesso di ascoltare.',
    nour: 'Niente non-morti dopo le 22. È una questione di odore.',
    elariel: 'Devozione encomiabile. Tempismo discutibile.',
  },

  cultistaHit: 'Anche oggi i fedeli portano il tributo. Li sgombero con un buffetto. Loro lo chiamano contatto divino. Io lo chiamo lunedì.',

  cespuglioHit: 'Sei tu. Ti riconoscerei tra mille arbusti. Ti perdono, cespuglio. Sto invecchiando.',

  breathReady: 'Il veleno è carico. Uno sbuffo e tornano tutti maleducati in coda.',
  breathUsed: 'Sgombero generale. Lucidatevi altrove.',

  hoardLow: 'Mi stanno svuotando l\'hoard. Comincio a prenderla sul personale.',

  victory: 'Respinti tutti. Scaglie lucide, lista aggiornata, tesoro intatto. La monaca ha imparato a parare il fuoco? No. Ma ci ha provato. Apprezzo lo sforzo. Ora sciò.',

  gameOver: 'Mi hanno svuotato l\'hoard. Conto le monete rimaste: zero. Un numero tondo, almeno. Riprovo appena recupero la dignità.',
};

// --- Palette per atto ---
export const ACT_PALETTES = {
  1: {
    bg: '#1a1a12',
    bgGradient: ['#1a1a12', '#2a2820'],
    accent: '#4a7a30',    // verde veleno
    gold: '#c0a040',
    text: '#e8dcc8',
    hudBg: 'rgba(20, 20, 15, 0.85)',
    holeColor: '#2a2818',
    holeBorder: '#3a3828',
    particleColor: '#50c040',
  },
  2: {
    bg: '#18121a',
    bgGradient: ['#18121a', '#28202a'],
    accent: '#6a40a0',    // viola cupo
    gold: '#d0a030',
    text: '#e0d8e8',
    hudBg: 'rgba(18, 12, 20, 0.85)',
    holeColor: '#28202a',
    holeBorder: '#38303a',
    particleColor: '#7050c0',
  },
  3: {
    bg: '#1a1008',
    bgGradient: ['#1a1008', '#2a1810'],
    accent: '#c04020',    // rosso dorato
    gold: '#e0b020',
    text: '#f0e0c0',
    hudBg: 'rgba(20, 10, 8, 0.88)',
    holeColor: '#2a1810',
    holeBorder: '#3a2818',
    particleColor: '#e06030',
  },
};

// --- Costanti di gioco ---
export const GAME_CONSTANTS = {
  HOARD_MAX: 100,
  BREATH_CHARGE_REQUIRED: 25,
  COMBO_MULTIPLIER_CAP: 5.0,
  COMBO_MULTIPLIER_STEP: 0.1,
  HOARD_LOW_THRESHOLD: 25,
  SPAWN_GRID_ROWS: 3,
  SPAWN_GRID_COLS: 3,
  LOCALSTORAGE_KEY: 'sgombero-thundertree-best',
};
