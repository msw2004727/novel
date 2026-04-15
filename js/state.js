;(function(G) {
  'use strict';
  var CFG = G.CFG;

  G.state = {
    gameState: 'menu',
    ctx: null,
    scaleX: 1,
    scaleY: 1,
    mouseX: CFG.W / 2,
    mouseY: 0,
    turretAngle: -Math.PI / 2,
    bullets: [],
    missiles: [],
    particles: [],
    explosions: [],
    terrain: [],
    turretBlocks: [],
    turretX: CFG.W / 2,
    turretBaseY: CFG.GROUND_Y,
    turretTilt: 0,
    turretSinkY: 0,
    kills: 0,
    gameTime: 0,
    lastFireTime: 0,
    lastMissileTime: 0,
    lastTime: 0,
    wave: 1,
    waveTimer: 0,
    shakeX: 0,
    shakeY: 0,
    shakeMag: 0,
    starField: [],
    sliderDragging: false,
    airdrops: [],
    soldiers: [],
    lastAirdropTime: 0,
    nextAirdropInterval: 20000,
    barrelHP: 5,
    airships: [],
    airshipTimer: 0,
    groundSoldierTimer: 0,
    kaijus: [],
    kaijuTimer: 0,
  };

  G.resetState = function() {
    var s = G.state;
    s.gameState = 'playing';
    s.mouseX = CFG.W / 2;
    s.mouseY = 0;
    s.sliderDragging = false;
    s.turretAngle = -Math.PI / 2;
    s.bullets = [];
    s.missiles = [];
    s.particles = [];
    s.explosions = [];
    s.terrain = [];
    s.turretBlocks = [];
    s.turretX = CFG.W / 2;
    s.turretBaseY = CFG.GROUND_Y;
    s.turretTilt = 0;
    s.turretSinkY = 0;
    s.kills = 0;
    s.gameTime = 0;
    s.lastFireTime = 0;
    s.lastMissileTime = 0;
    s.lastTime = 0;
    s.wave = 1;
    s.waveTimer = 0;
    s.shakeX = 0;
    s.shakeY = 0;
    s.shakeMag = 0;
    s.airdrops = [];
    s.soldiers = [];
    s.lastAirdropTime = 0;
    s.nextAirdropInterval = 20000;
    s.barrelHP = CFG.BARREL_MAX_HP;
    s.airships = [];
    s.airshipTimer = 0;
    s.groundSoldierTimer = 0;
    s.kaijus = [];
    s.kaijuTimer = 0;
  };
})(Game);
