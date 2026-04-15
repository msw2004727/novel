;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  var INTERVAL = 60000;
  var SPEED = 0.3;
  var BS = 4;          // block size
  var BOMB_INTERVAL = 900;

  // 飛艇方塊配置圖
  // B=氣囊 H=骨架 G=吊艙 C=駕駛艙(要害) P=螺旋槳(要害) F=燃料艙(要害)
  var MAP = [
    '......BBBBBBBB......',
    '....BBBBBBBBBBBB....',
    '..BBBBBBBBBBBBBBBB..',
    '..BBBBBBBBBBBBBBBB..',
    '....BBBBBBBBBBBB....',
    '......HHHHHHHH......',
    'P....CGGFGGGGGG...PP',
    '.....GGGGGGGGGG.....',
  ];
  var COLS = MAP[0].length;
  var ROWS = MAP.length;

  var TYPES = {
    B: { hp: 1, color: '#99a', crit: false },
    H: { hp: 2, color: '#556', crit: false },
    G: { hp: 2, color: '#654', crit: false },
    C: { hp: 6, color: '#48c', crit: true },
    P: { hp: 4, color: '#aaa', crit: true },
    F: { hp: 4, color: '#ca4', crit: true },
  };

  function createShip(fromLeft) {
    var dir = fromLeft ? 1 : -1;
    var scale = 1 + Math.floor(Math.random() * 5);
    var bs = BS * scale;
    var diff = G.getDifficultyBonus ? G.getDifficultyBonus() : 0;

    var blocks = [];
    for (var r = 0; r < ROWS; r++) {
      blocks[r] = [];
      for (var c = 0; c < COLS; c++) {
        var ch = MAP[r][c];
        if (ch === '.') {
          blocks[r][c] = { hp: 0, type: '.', color: '', crit: false };
        } else {
          var t = TYPES[ch];
          // HP 隨小兵數等比提升
          blocks[r][c] = { hp: Math.ceil(t.hp * (1 + (scale - 1) * 0.5) * (1 + diff)), type: ch, color: t.color, crit: t.crit };
        }
      }
    }

    var pw = COLS * bs;
    return {
      x: fromLeft ? -pw - 10 : CFG.W + 10,
      y: 30 + Math.random() * Math.max(10, 60 - scale * 8),
      vx: dir * SPEED / (1 + (scale - 1) * 0.12),
      dir: dir,
      scale: scale,
      bs: bs,
      alive: true,
      falling: false,
      fallVy: 0,
      blocks: blocks,
      bombTimer: 0,
      bombsDropped: 0,
      // 炸彈數隨小兵數等比提升
      totalBombs: Math.ceil((5 + Math.floor(Math.random() * 11) + (scale - 1) * 3) * (1 + diff)),
      propPhase: 0,
    };
  }

  function blockWorld(ship, r, c) {
    var col = ship.dir > 0 ? c : (COLS - 1 - c);
    return { x: ship.x + col * ship.bs, y: ship.y + r * ship.bs };
  }

  function hasCritical(ship) {
    for (var r = 0; r < ROWS; r++)
      for (var c = 0; c < COLS; c++)
        if (ship.blocks[r][c].crit && ship.blocks[r][c].hp > 0) return true;
    return false;
  }

  function crashShip(ship) {
    var cx = ship.x + COLS * ship.bs / 2;
    G.createExplosion(cx, CFG.GROUND_Y - 10);
    state.shakeMag = 10;

    // 殘骸粒��
    for (var i = 0; i < 30; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1 + Math.random() * 5;
      state.particles.push({
        x: cx + (Math.random() - 0.5) * 60, y: CFG.GROUND_Y - 10,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        life: 30 + Math.random() * 30, maxLife: 60,
        color: ['#999', '#666', '#c44', '#fa0'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 3,
      });
    }

    // 生成 3~10 隨機小兵（受上限控制）
    var sc = G.countAliveSoldiers ? G.countAliveSoldiers() : { repair: 0, speed: 0, shotgun: 0 };
    var curTotal = sc.repair + sc.speed + sc.shotgun;
    var maxNew = Math.max(0, 100 - curTotal);
    var count = Math.min(3 + Math.floor(Math.random() * 8), maxNew);
    var types = ['repair', 'speed', 'shotgun'];
    for (var j = 0; j < count; j++) {
      state.soldiers.push({
        x: cx + (Math.random() - 0.5) * 50,
        y: CFG.GROUND_Y,
        type: types[Math.floor(Math.random() * types.length)],
        state: 'walking_to',
        targetX: state.turretX,
        direction: cx < state.turretX ? 1 : -1,
        repairTarget: null, repairTimer: 0,
        bridgeCol: -1, bridgeTimer: 0,
        boostTimer: 0, deadTimer: 0, walkFrame: 0,
      });
    }
  }

  // 子彈碰飛艇（供 collision.js 呼叫）
  G.checkAirshipHit = function(bx, by) {
    for (var si = 0; si < state.airships.length; si++) {
      var ship = state.airships[si];
      if (!ship.alive) continue;

      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var blk = ship.blocks[r][c];
          if (blk.hp <= 0) continue;

          var pos = blockWorld(ship, r, c);
          if (bx >= pos.x && bx <= pos.x + ship.bs && by >= pos.y && by <= pos.y + ship.bs) {
            blk.hp--;

            if (blk.hp <= 0) {
              for (var i = 0; i < 3; i++) {
                state.particles.push({
                  x: pos.x + ship.bs / 2, y: pos.y + ship.bs / 2,
                  vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2 + 0.5,
                  life: 15 + Math.random() * 15, maxLife: 30,
                  color: blk.color, size: 2 + Math.random(),
                });
              }
              if (!hasCritical(ship)) {
                ship.falling = true;
                ship.vx *= 0.3;
              }
            }
            return true;
          }
        }
      }
    }
    return false;
  };

  G.plugins.airship = {
    name: 'airship',
    drawOrder: 5,

    init: function() {
      state.airships = [];
      state.airshipTimer = 0;
    },

    update: function(dt) {
      var i, ship;
      state.airshipTimer += dt;

      // 每 60 秒生成
      if (state.airshipTimer >= INTERVAL) {
        state.airshipTimer = 0;
        state.airships.push(createShip(Math.random() < 0.5));
      }

      for (i = state.airships.length - 1; i >= 0; i--) {
        ship = state.airships[i];
        ship.propPhase += dt * 0.02;

        // ��動
        ship.x += ship.vx;

        if (ship.falling) {
          ship.fallVy += 0.03;
          ship.y += ship.fallVy;

          // 煙霧
          if (Math.random() < 0.3) {
            state.particles.push({
              x: ship.x + COLS * ship.bs / 2 + (Math.random() - 0.5) * 30 * ship.scale,
              y: ship.y + ROWS * ship.bs,
              vx: (Math.random() - 0.5) * 1, vy: Math.random() * 0.5 + 0.3,
              life: 20 + Math.random() * 20, maxLife: 40,
              color: '#555', size: 3 + Math.random() * 3,
            });
          }

          // 墜地
          if (ship.y + ROWS * ship.bs >= CFG.GROUND_Y) {
            crashShip(ship);
            state.airships.splice(i, 1);
            continue;
          }
        } else {
          // 投彈
          ship.bombTimer += dt;
          // 只在畫���內投彈
          var shipCenterX = ship.x + COLS * ship.bs / 2;
          if (ship.bombsDropped < ship.totalBombs &&
              ship.bombTimer >= BOMB_INTERVAL &&
              shipCenterX > 30 && shipCenterX < CFG.W - 30) {
            ship.bombTimer = 0;
            ship.bombsDropped++;

            // 從吊艙底部投彈
            var bombCol = 6 + Math.floor(Math.random() * 8);
            var pos = blockWorld(ship, ROWS - 1, bombCol);
            state.missiles.push({
              x: pos.x + ship.bs / 2,
              y: pos.y + ship.bs,
              vx: ship.vx * 0.5,
              vy: 0.5,
              alive: true,
              trail: [],
              type: 'bomb',
            });
          }
        }

        // 離開畫面
        var pw = COLS * ship.bs;
        if ((ship.dir > 0 && ship.x > CFG.W + pw + 20) ||
            (ship.dir < 0 && ship.x < -pw - 20)) {
          state.airships.splice(i, 1);
        }
      }
    },

    draw: function(ctx) {
      for (var si = 0; si < state.airships.length; si++) {
        var ship = state.airships[si];

        // 繪製方塊
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var blk = ship.blocks[r][c];
            if (blk.hp <= 0) continue;

            var pos = blockWorld(ship, r, c);
            var hpF = blk.hp / (TYPES[blk.type] ? TYPES[blk.type].hp : 1);

            // 基色隨 HP 變暗
            ctx.fillStyle = blk.color;
            ctx.globalAlpha = 0.4 + 0.6 * hpF;
            ctx.fillRect(pos.x, pos.y, ship.bs, ship.bs);

            // 格線
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = '#000';
            ctx.fillRect(pos.x + ship.bs - 1, pos.y, 1, ship.bs);
            ctx.fillRect(pos.x, pos.y + ship.bs - 1, ship.bs, 1);
            ctx.globalAlpha = 1;
          }
        }

        // 螺旋槳動畫（P 方塊位置，旋轉葉片）
        if (!ship.falling) {
          for (var pc = 0; pc < COLS; pc++) {
            for (var pr = 0; pr < ROWS; pr++) {
              if (MAP[pr][pc] !== 'P' || ship.blocks[pr][pc].hp <= 0) continue;
              var pp = blockWorld(ship, pr, pc);
              var pLen = (3 + Math.sin(ship.propPhase) * 3) * ship.scale;
              ctx.fillStyle = '#ccc';
              ctx.fillRect(pp.x + ship.bs / 2 - 1, pp.y - pLen, 2 * ship.scale, pLen * 2 + ship.bs);
              // 旋轉效果
              var pLen2 = (3 + Math.cos(ship.propPhase) * 3) * ship.scale;
              ctx.globalAlpha = 0.5;
              ctx.fillRect(pp.x - pLen2 + ship.bs / 2, pp.y + ship.bs / 2 - 1, pLen2 * 2, 2 * ship.scale);
              ctx.globalAlpha = 1;
            }
          }
        }

        // 駕駛艙高亮
        for (var c2 = 0; c2 < COLS; c2++) {
          if (MAP[6][c2] === 'C') {
            var blkC = ship.blocks[6][c2];
            if (blkC.hp > 0) {
              var cp = blockWorld(ship, 6, c2);
              ctx.fillStyle = 'rgba(100,200,255,0.3)';
              ctx.fillRect(cp.x + 1, cp.y + 1, ship.bs - 2, ship.bs - 2);
            }
            break;
          }
        }
      }
    },
  };
})(Game);
