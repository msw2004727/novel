;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  var INTERVAL = 90000;
  var BS = 10;
  var WALK_SPEED = 0.25;
  var FIRE_INTERVAL = 2500;
  var FLAME_SPEED = 2;
  var ATTACK_RANGE = 280;

  // 面朝右（從左進場用，從右進場鏡像）
  var MAP = [
    '......SS....',
    '.....SSSS...',
    '.....SHHHH..',
    '......HHHH..',
    '......HHHHM.',
    '.......HHH..',
    '......NNN...',
    '.....SNNN...',
    '....SSBBBB..',
    '...SSBBBBB..',
    '...SSBBBBBA.',
    '..SSBBBBBBA.',
    '...BBBBBBB..',
    '..TTBBBBBB..',
    '.TTTBBBB....',
    '.TTTT.BB....',
    '.TTT.LL.LL..',
    '..TT.LL.LL..',
    '......FF.FF.',
    '............',
  ];
  var COLS = MAP[0].length;
  var ROWS = MAP.length;

  var TYPES = {
    S: { hp: 3, color: '#2a5a2a', crit: false },
    H: { hp: 8, color: '#3a6a3a', crit: true },
    M: { hp: 4, color: '#a33',    crit: false },
    N: { hp: 4, color: '#3a5530', crit: false },
    B: { hp: 5, color: '#4a6a3a', crit: false },
    A: { hp: 3, color: '#3a5a30', crit: false },
    T: { hp: 3, color: '#4a5a30', crit: false },
    L: { hp: 5, color: '#3a4a2a', crit: false },
    F: { hp: 4, color: '#2a3a20', crit: false },
  };

  function createKaiju(fromLeft) {
    var dir = fromLeft ? 1 : -1;
    var diff = G.getDifficultyBonus ? G.getDifficultyBonus() : 0;
    var blocks = [];
    var mouthR = -1, mouthC = -1;

    for (var r = 0; r < ROWS; r++) {
      blocks[r] = [];
      for (var c = 0; c < COLS; c++) {
        var ch = MAP[r][c];
        if (ch === '.') {
          blocks[r][c] = { hp: 0, type: '.', color: '', crit: false };
        } else {
          var t = TYPES[ch];
          blocks[r][c] = { hp: Math.ceil(t.hp * (1 + diff)), type: ch, color: t.color, crit: t.crit };
          if (ch === 'M') { mouthR = r; mouthC = c; }
        }
      }
    }

    var pw = COLS * BS;
    return {
      x: fromLeft ? -pw - 10 : CFG.W + 10,
      y: CFG.GROUND_Y - ROWS * BS,
      dir: dir,
      blocks: blocks,
      mouthR: mouthR,
      mouthC: mouthC,
      state: 'walking',
      fireTimer: 0,
      debris: [],
      dyingTimer: 0,
    };
  }

  function blockWorld(k, r, c) {
    var col = k.dir > 0 ? c : (COLS - 1 - c);
    return { x: k.x + col * BS, y: k.y + r * BS };
  }

  function hasHead(k) {
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++)
        if (k.blocks[r][c].crit && k.blocks[r][c].hp > 0) return true;
    return false;
  }

  function startCollapse(k) {
    k.state = 'dying';
    k.dyingTimer = 80;
    k.debris = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (k.blocks[r][c].hp <= 0) continue;
        var pos = blockWorld(k, r, c);
        k.debris.push({
          x: pos.x, y: pos.y,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3,
          color: k.blocks[r][c].color,
        });
        k.blocks[r][c].hp = 0;
      }
    }
    state.shakeMag = 8;
    G.playSound('explode');
  }

  G.checkKaijuHit = function(bx, by) {
    for (var ki = 0; ki < state.kaijus.length; ki++) {
      var k = state.kaijus[ki];
      if (k.state === 'dying') continue;

      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var blk = k.blocks[r][c];
          if (blk.hp <= 0) continue;
          var pos = blockWorld(k, r, c);
          if (bx >= pos.x && bx <= pos.x + BS && by >= pos.y && by <= pos.y + BS) {
            blk.hp--;
            if (blk.hp <= 0) {
              for (var i = 0; i < 3; i++) {
                state.particles.push({
                  x: pos.x + BS / 2, y: pos.y + BS / 2,
                  vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2,
                  life: 15 + Math.random() * 15, maxLife: 30,
                  color: blk.color, size: 2 + Math.random(),
                });
              }
              if (!hasHead(k)) startCollapse(k);
            }
            return true;
          }
        }
      }
    }
    return false;
  };

  G.plugins.kaiju = {
    name: 'kaiju',
    drawOrder: 8,

    init: function() {
      state.kaijus = [];
      state.kaijuTimer = 0;
    },

    update: function(dt) {
      var i, k, d;
      state.kaijuTimer += dt;

      if (state.kaijuTimer >= INTERVAL) {
        state.kaijuTimer = 0;
        state.kaijus.push(createKaiju(Math.random() < 0.5));
      }

      for (i = state.kaijus.length - 1; i >= 0; i--) {
        k = state.kaijus[i];

        // === 崩塌中 ===
        if (k.state === 'dying') {
          k.dyingTimer--;
          for (var di = k.debris.length - 1; di >= 0; di--) {
            d = k.debris[di];
            d.vy += 0.15;
            d.x += d.vx;
            d.y += d.vy;
            if (d.y >= CFG.GROUND_Y) {
              state.particles.push({
                x: d.x, y: CFG.GROUND_Y,
                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5,
                life: 10 + Math.random() * 10, maxLife: 20,
                color: d.color, size: 2,
              });
              k.debris.splice(di, 1);
            }
          }
          if (k.dyingTimer <= 0 && k.debris.length === 0) {
            state.kaijus.splice(i, 1);
          }
          continue;
        }

        // === 行走 ===
        var distToTurret = Math.abs((k.x + COLS * BS / 2) - state.turretX);
        if (k.state === 'walking') {
          k.x += k.dir * WALK_SPEED;
          if (distToTurret < ATTACK_RANGE) k.state = 'attacking';
          // 走出畫面
          if ((k.dir > 0 && k.x > CFG.W + 20) || (k.dir < 0 && k.x < -COLS * BS - 20)) {
            state.kaijus.splice(i, 1); continue;
          }
        }

        // === 攻擊（吐火）===
        if (k.state === 'attacking' || k.state === 'walking') {
          k.fireTimer += dt;
          if (k.fireTimer >= FIRE_INTERVAL && k.mouthR >= 0) {
            k.fireTimer = 0;
            var mpos = blockWorld(k, k.mouthR, k.mouthC);
            var fx = mpos.x + (k.dir > 0 ? BS : 0);
            var fy = mpos.y + BS / 2;
            var dirToTurret = state.turretX > fx ? 1 : -1;

            state.missiles.push({
              x: fx, y: fy,
              vx: dirToTurret * FLAME_SPEED,
              vy: (Math.random() - 0.5) * 0.3,
              alive: true, trail: [],
              type: 'flame',
            });

            // 吐火粒子
            for (var fi = 0; fi < 6; fi++) {
              state.particles.push({
                x: fx, y: fy,
                vx: dirToTurret * (1 + Math.random() * 2),
                vy: (Math.random() - 0.5) * 1.5,
                life: 8 + Math.random() * 8, maxLife: 16,
                color: ['#f80', '#f40', '#fa0'][Math.floor(Math.random() * 3)],
                size: 2 + Math.random() * 2,
              });
            }
          }
        }
      }
    },

    draw: function(ctx) {
      var i, k, r, c, blk, pos, d;

      for (i = 0; i < state.kaijus.length; i++) {
        k = state.kaijus[i];

        // 方塊
        if (k.state !== 'dying') {
          for (r = 0; r < ROWS; r++) {
            for (c = 0; c < COLS; c++) {
              blk = k.blocks[r][c];
              if (blk.hp <= 0) continue;
              pos = blockWorld(k, r, c);
              var maxHp = TYPES[blk.type] ? TYPES[blk.type].hp : 1;
              var hf = blk.hp / Math.ceil(maxHp * (1 + (G.getDifficultyBonus ? G.getDifficultyBonus() : 0)));
              hf = Math.min(1, Math.max(0.3, hf));

              ctx.fillStyle = blk.color;
              ctx.globalAlpha = 0.4 + 0.6 * hf;
              ctx.fillRect(pos.x, pos.y, BS, BS);

              ctx.globalAlpha = 0.15;
              ctx.fillStyle = '#000';
              ctx.fillRect(pos.x + BS - 1, pos.y, 1, BS);
              ctx.fillRect(pos.x, pos.y + BS - 1, BS, 1);
              ctx.globalAlpha = 1;

              // 頭部弱點紅色高亮
              if (blk.crit) {
                ctx.fillStyle = 'rgba(255,50,50,0.12)';
                ctx.fillRect(pos.x, pos.y, BS, BS);
              }

              // 嘴巴發光
              if (blk.type === 'M') {
                ctx.fillStyle = 'rgba(255,100,0,0.25)';
                ctx.fillRect(pos.x, pos.y, BS, BS);
              }
            }
          }

          // 眼睛
          for (r = 0; r < ROWS; r++) {
            for (c = 0; c < COLS; c++) {
              if (MAP[r][c] === 'H' && k.blocks[r][c].hp > 0) {
                // 找頭部最上排的第二格作為眼睛
                if (MAP[r - 1] && MAP[r - 1][c] === 'S') {
                  pos = blockWorld(k, r, c);
                  ctx.fillStyle = '#ff0';
                  ctx.fillRect(pos.x + 3, pos.y + 3, 3, 3);
                  break;
                }
              }
            }
            if (pos) break;
          }
        }

        // 崩塌碎塊
        for (var di = 0; di < k.debris.length; di++) {
          d = k.debris[di];
          ctx.fillStyle = d.color;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(Math.floor(d.x), Math.floor(d.y), BS, BS);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
})(Game);
