// ── Shankions League Constants ──

const PITCH = {
    COLOR: '#2e7d32',
    LINE_COLOR: 'rgba(255,255,255,0.5)',
    // Pitch dimensions relative to canvas (padded)
    PAD_X: 0.05,
    PAD_Y: 0.08,
};

const PLAYER_RADIUS = 12;
const BALL_RADIUS = 6;

const TEAM = {
    HOME: 0,
    AWAY: 1,
};

const COLORS = {
    HOME: '#4fc3f7',
    HOME_DARK: '#0288d1',
    AWAY: '#ef5350',
    AWAY_DARK: '#c62828',
    BALL: '#fff',
    SELECTED: '#ffeb3b',
    RIFLE_GLOW: '#ff9800',
    SHANK_GLOW: '#ab47bc',
    THREAT: '#ff1744',
};

const POSITIONS = {
    // Normalized positions (0-1) relative to pitch
    HOME: [
        { x: 0.06, y: 0.5, role: 'GK', name: 'Keeper' },
        { x: 0.22, y: 0.2, role: 'DEF', name: 'Brick' },
        { x: 0.22, y: 0.8, role: 'DEF', name: 'Slab' },
        { x: 0.45, y: 0.35, role: 'MID', name: 'Viper' },
        { x: 0.45, y: 0.65, role: 'MID', name: 'Razor' },
        { x: 0.70, y: 0.5, role: 'FWD', name: 'Butcher' },
    ],
    AWAY: [
        { x: 0.94, y: 0.5, role: 'GK', name: 'Wall' },
        { x: 0.78, y: 0.2, role: 'DEF', name: 'Skull' },
        { x: 0.78, y: 0.8, role: 'DEF', name: 'Thorn' },
        { x: 0.55, y: 0.35, role: 'MID', name: 'Fang' },
        { x: 0.55, y: 0.65, role: 'MID', name: 'Blade' },
        { x: 0.30, y: 0.5, role: 'FWD', name: 'Grim' },
    ],
};

const WEAPON_TYPE = {
    NONE: 'none',
    FIST: 'fist',
    SHANK: 'shank',
    RIFLE: 'rifle',
    SIDEARM: 'sidearm',
};

const WEAPON_STATS = {
    [WEAPON_TYPE.FIST]:    { damage: 10, range: 30,  cooldown: 500,  speed: 0, name: 'Fists' },
    [WEAPON_TYPE.SHANK]:   { damage: 35, range: 35,  cooldown: 700,  speed: 0, name: 'Shank' },
    [WEAPON_TYPE.SIDEARM]: { damage: 25, range: 180, cooldown: 800,  speed: 12, name: 'Sidearm' },
    [WEAPON_TYPE.RIFLE]:   { damage: 70, range: 400, cooldown: 1500, speed: 18, name: 'Rifle' },
};

const GAME_STATE = {
    TITLE: 'title',
    PLAYING: 'playing',
    COMBAT: 'combat',
    HALFTIME: 'halftime',
    MATCH_END: 'match_end',
    SHOP: 'shop',
    GOAL_SCORED: 'goal_scored',
    KICKOFF: 'kickoff',
};

const MATCH = {
    HALF_DURATION: 90, // seconds per half (game time, runs faster)
    TIME_SCALE: 3,     // game seconds per real second
    GOAL_PAUSE: 2000,  // ms to show goal celebration
    KICKOFF_PAUSE: 1500,
};

const ECONOMY = {
    WIN_BONUS: 500,
    DRAW_BONUS: 200,
    LOSS_BONUS: 100,
    GOAL_BONUS: 150,
    KILL_BONUS: 100,
    STARTING_CASH: 300,
};

const PLAYER_STATS = {
    SPEED: 2.5,
    SPRINT_MULT: 1.6,
    HP: 100,
    PASS_POWER: 8,
    SHOOT_POWER: 12,
    THROUGH_BALL_POWER: 10,
};

const BALL_PHYSICS = {
    FRICTION: 0.985,
    BOUNCE: 0.7,
    CONTROL_DIST: 20,
    AUTO_RECEIVE_DIST: 18,
};

const AI_PARAMS = {
    REACTION_TIME: 300,    // ms base reaction
    PASS_ACCURACY: 0.85,
    SHOOT_RANGE: 0.3,      // normalized pitch distance
    AGGRESSION: 0.3,       // chance to engage combat
    THREAT_AWARENESS: 0.5, // how often AI checks threats
};
