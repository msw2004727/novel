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

  // 面朝右的恐龍（密實填充，從左進場用，從右則鏡像）
  // H=頭(弱點) M=嘴 E=眼 N=頸 S=背棘 B=身 A=手 T=尾 L=腿 F=腳
  var MAP = [
    '........SSS.',
    '.......SSSS.',
    '......SBBBS.',
    '.....EHHHHM.',
    '.....HHHHHM.',
    '......HHHH..',
    '......NNNN..',
    '.....SNNNN..',
    '....SSBBBB..',
    '....SBBBBB..',
    '...SSBBBBB..',
    '...SBBBBBBA.',
    '..SSBBBBBB..',
    '..TBBBBBBB..',
    '.TTTBBBBB...',
    '.TTTTBBBB...',
    'TTTTTLL.LL..',
    '.TTTTLL.LL..',
    '.TTT.FF.FF..',
    '..T.........',
  ];
  var COLS = MAP[0].length;
  var ROWS = MAP.length;

  var TYPES = {
    S: { hp: 3, color: '#2a5a2a' },
    H: { hp: 8, color: '#3a6a3a', crit: true },
    E: { hp: 6, color: '#aa3',    crit: true },
    M: { hp: 4, color: '#a33' },
    N: { hp: 4, color: '#3a5530' },
    B: { hp: 5, color: '#4a6a3a' },
    A: { hp: 3, color: '#3a5a30' },
    T: { hp: 3, color: '#4a5a30' },
    L: { hp: 5, color: '#3a4a2a' },
    F: { hp: 4, color: '#2a3a20' },
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
          blocks[r][c] = {
            hp: Math.ceil(t.hp * (1 + diff)),
            type: ch, color: t.color,
            crit: !!t.crit,
          };
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
      walkPhase: 0,
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

        // 走路動畫相位
        k.walkPhase += dt * 0.004;

        var distToTurret = Math.abs((k.x + COLS * BS / 2) - state.turretX);
        if (k.state === 'walking') {
          k.x += k.dir * WALK_SPEED;
          if (distToTurret < ATTACK_RANGE) k.state = 'attacking';
          if ((k.dir > 0 && k.x > CFG.W + 20) || (k.dir < 0 && k.x < -COLS * BS - 20)) {
            state.kaijus.splice(i, 1); continue;
          }
        }

        // 吐火
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
              alive: true, trail: [], type: 'flame',
            });

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
      for (var i = 0; i < state.kaijus.length; i++) {
        var k = state.kaijus[i];

        if (k.state !== 'dying') {
          // 走路搖擺：身體上下 + 腿交替偏移
          var bobY = Math.sin(k.walkPhase * 2) * 2;
          var legCycle = Math.sin(k.walkPhase * 4);
          var isWalking = k.state === 'walking';

          for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
              var blk = k.blocks[r][c];
              if (blk.hp <= 0) continue;
              var pos = blockWorld(k, r, c);
              var drawX = pos.x;
              var drawY = pos.y;

              // 走路動畫偏移
              if (isWalking) {
                var ch = MAP[r][c];
                if (ch === 'L' || ch === 'F') {
                  // 腿部：左右腿交替上下
                  var isLeftLeg = c < COLS / 2;
                  drawY += (isLeftLeg ? legCycle : -legCycle) * 2;
                } else {
                  // 身體搖擺
                  drawY += bobY;
                }
              }

              // 繪製方塊
              ctx.fillStyle = blk.color;
              ctx.globalAlpha = blk.hp > 0 ? 0.5 + 0.5 * Math.min(1, blk.hp / 5) : 0;
              ctx.fillRect(drawX, drawY, BS, BS);

              // 格線
              ctx.globalAlpha = 0.12;
              ctx.fillStyle = '#000';
              ctx.fillRect(drawX + BS - 1, drawY, 1, BS);
              ctx.fillRect(drawX, drawY + BS - 1, BS, 1);
              ctx.globalAlpha = 1;

              // 頭部紅色脈動
              if (blk.crit) {
                var pulse = 0.08 + Math.sin(k.walkPhase * 3) * 0.04;
                ctx.fillStyle = 'rgba(255,50,50,' + pulse + ')';
                ctx.fillRect(drawX, drawY, BS, BS);
              }

              // 眼睛
              if (blk.type === 'E') {
                ctx.fillStyle = '#ff0';
                ctx.fillRect(drawX + 2, drawY + 2, 4, 4);
                ctx.fillStyle = '#f00';
                ctx.fillRect(drawX + 4, drawY + 3, 2, 2);
              }

              // 嘴巴發光
              if (blk.type === 'M') {
                var mGlow = 0.15 + Math.sin(k.fireTimer / FIRE_INTERVAL * Math.PI * 2) * 0.1;
                ctx.fillStyle = 'rgba(255,100,0,' + mGlow + ')';
                ctx.fillRect(drawX, drawY, BS, BS);
              }
            }
          }
        }

        // 崩塌碎塊
        for (var di = 0; di < k.debris.length; di++) {
          var d = k.debris[di];
          ctx.fillStyle = d.color;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(Math.floor(d.x), Math.floor(d.y), BS, BS);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
})(Game);
