// 遊戲常數設定 — 所有模組的根依賴
var Game = window.Game || {};

Game.CFG = {
  W: 800,
  H: 600,

  TURRET_FIRE_RATE: 300,
  BULLET_SPEED: 11,
  BULLET_SIZE: 4,

  MISSILE_SPAWN_RATE_INIT: 1600,
  MISSILE_SPAWN_RATE_MIN: 300,
  MISSILE_GRAVITY: 0.025,

  GROUND_Y: 410,
  GROUND_DEPTH: 150,
  TILE_SIZE: 8,
  EXPLOSION_RADIUS: 32,

  WAVE_DURATION: 20000,

  TB_SIZE: 8,
  TB_COLS: 10,
  TB_ROWS: 6,

  BARREL_MAX_HP: 5,
};

Game.TERRAIN_COLS = Math.ceil(Game.CFG.W / Game.CFG.TILE_SIZE);
Game.TERRAIN_ROWS = Math.ceil(Game.CFG.GROUND_DEPTH / Game.CFG.TILE_SIZE);

// 插件容器
Game.plugins = {};

window.Game = Game;
