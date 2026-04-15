;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;
  var TCOLS = G.TERRAIN_COLS;
  var TROWS = G.TERRAIN_ROWS;

  var SPAWN_INTERVAL = 10000;
  var SPEED = 0.5;
  var FILL_TIME = 600;

  var fillers = [];
  var timer = 0;

  // 從砲台中心向外找最近的受損地形格
  function findNearestHole(x) {
    var centerCol = Math.floor(state.turretX / CFG.TILE_SIZE);
    var best = -1, bestDist = 99999;

    for (var c = 0; c < TCOLS; c++) {
      for (var r = 0; r < TROWS; r++) {
        if (!state.terrain[r]) continue;
        if (state.terrain[r][c] <= 0) {
          var dist = Math.abs(c - centerCol) + r; // 優先表層、靠近中心
          if (dist < bestDist) {
            bestDist = dist;
            best = c;
          }
          break; // 每列只看最上面的洞
        }
      }
    }
    return best;
  }

  function hasAnyHole() {
    for (var c = 0; c < TCOLS; c++) {
      for (var r = 0; r < TROWS; r++) {
        if (state.terrain[r] && state.terrain[r][c] <= 0) return true;
      }
    }
    return false;
  }

  G.plugins.filler = {
    name: 'filler',
    drawOrder: 22,

    init: function() {
      fillers = [];
      timer = 0;
    },

    update: function(dt) {
      var i, f;
      timer += dt;

      // 每 10 秒生成一位（只在有洞時）
      if (timer >= SPAWN_INTERVAL && hasAnyHole()) {
        timer = 0;
        var fromLeft = Math.random() < 0.5;
        fillers.push({
          x: fromLeft ? -10 : CFG.W + 10,
          y: CFG.GROUND_Y,
          dir: fromLeft ? 1 : -1,
          state: 'walking', // walking | filling | leaving | dead
          targetCol: -1,
          fillTimer: 0,
          fillR: 0,
          walkFrame: 0,
          deadTimer: 0,
        });
      }

      for (i = fillers.length - 1; i >= 0; i--) {
        f = fillers[i];
        f.walkFrame += dt * 0.005;

        // 死亡
        if (f.state === 'dead') {
          f.deadTimer--;
          if (f.deadTimer <= 0) fillers.splice(i, 1);
          continue;
        }

        // 走向目標
        if (f.state === 'walking') {
          var col = findNearestHole(f.x);
          if (col < 0) {
            f.state = 'leaving';
            f.dir = f.x < CFG.W / 2 ? -1 : 1;
            continue;
          }

          var targetX = col * CFG.TILE_SIZE + CFG.TILE_SIZE / 2;
          var dx = targetX - f.x;
          f.dir = dx > 0 ? 1 : -1;

          if (Math.abs(dx) > 4) {
            f.x += f.dir * SPEED;
          } else {
            f.targetCol = col;
            f.state = 'filling';
            f.fillTimer = 0;
            // 找這列最上面的洞
            f.fillR = -1;
            for (var r = 0; r < TROWS; r++) {
              if (state.terrain[r] && state.terrain[r][col] <= 0) {
                f.fillR = r; break;
              }
            }
            if (f.fillR < 0) { f.state = 'walking'; }
          }
        }

        // 填補中
        else if (f.state === 'filling') {
          f.fillTimer += dt;

          // 填補粒子（土色）
          if (Math.random() < 0.15) {
            var fx = f.targetCol * CFG.TILE_SIZE + CFG.TILE_SIZE / 2;
            var fy = CFG.GROUND_Y + f.fillR * CFG.TILE_SIZE + CFG.TILE_SIZE / 2;
            state.particles.push({
              x: fx + (Math.random() - 0.5) * 6, y: fy,
              vx: (Math.random() - 0.5) * 1.5, vy: -Math.random() * 1.5,
              life: 8 + Math.random() * 6, maxLife: 14,
              color: '#7a5a2a', size: 1 + Math.random(),
            });
          }

          if (f.fillTimer >= FILL_TIME) {
            // 填補一格
            if (f.fillR >= 0 && f.fillR < TROWS && state.terrain[f.fillR]) {
              state.terrain[f.fillR][f.targetCol] = 3;
            }

            // 同列還有洞嗎？
            var nextR = -1;
            for (var r2 = 0; r2 < TROWS; r2++) {
              if (state.terrain[r2] && state.terrain[r2][f.targetCol] <= 0) {
                nextR = r2; break;
              }
            }

            if (nextR >= 0) {
              f.fillR = nextR;
              f.fillTimer = 0;
            } else {
              // 這列填完了，找下一個洞
              f.state = 'walking';
            }
          }
        }

        // 離開
        else if (f.state === 'leaving') {
          f.x += f.dir * SPEED;
          if (f.x < -20 || f.x > CFG.W + 20) {
            fillers.splice(i, 1);
          }
        }
      }
    },

    draw: function(ctx) {
      for (var i = 0; i < fillers.length; i++) {
        var f = fillers[i];
        var sx = Math.floor(f.x), sy = Math.floor(f.y);

        if (f.state === 'dead') {
          ctx.globalAlpha = f.deadTimer / 30;
          ctx.fillStyle = '#800';
          ctx.fillRect(sx - 4, sy - 3, 8, 4);
          ctx.globalAlpha = 1;
          continue;
        }

        var walking = f.state === 'walking' || f.state === 'leaving';
        var legOff = walking ? Math.floor(Math.sin(f.walkFrame * 4) * 2) : 0;

        if (f.state === 'filling') {
          // 蹲姿
          var bob = Math.sin(f.walkFrame * 8) * 1;
          ctx.fillStyle = '#a80'; // 橘色安全帽
          ctx.fillRect(sx - 4, sy - 11 + bob, 8, 3);
          ctx.fillStyle = '#da8';
          ctx.fillRect(sx - 3, sy - 8 + bob, 6, 3);
          ctx.fillStyle = '#886'; // 卡其色工服
          ctx.fillRect(sx - 4, sy - 5, 8, 3);
          ctx.fillStyle = '#333';
          ctx.fillRect(sx - 3, sy - 2, 2, 3);
          ctx.fillRect(sx + 1, sy - 2, 2, 3);
          // 鏟子
          ctx.fillStyle = '#987';
          ctx.fillRect(sx + 3 * f.dir, sy - 4 + bob, 2, 4);
          ctx.fillRect(sx + 2 * f.dir, sy - 1 + bob, 4, 2);
          continue;
        }

        // 站姿
        ctx.fillStyle = '#a80';
        ctx.fillRect(sx - 4, sy - 14, 8, 3);
        ctx.fillStyle = '#da8';
        ctx.fillRect(sx - 3, sy - 11, 6, 4);
        ctx.fillStyle = '#886';
        ctx.fillRect(sx - 4, sy - 7, 8, 5);
        ctx.fillStyle = '#333';
        ctx.fillRect(sx - 3, sy - 2, 2, 3 + legOff);
        ctx.fillRect(sx + 1, sy - 2, 2, 3 - legOff);
      }
    },
  };

  // 爆炸波及填補兵
  var origDmg = G.damageSoldiersInRadius;
  G.damageSoldiersInRadius = function(wx, wy, radius) {
    if (origDmg) origDmg(wx, wy, radius);
    var r2 = radius * radius;
    for (var i = 0; i < fillers.length; i++) {
      var f = fillers[i];
      if (f.state === 'dead') continue;
      var dx = f.x - wx, dy = f.y - wy;
      if (dx * dx + dy * dy < r2) {
        f.state = 'dead';
        f.deadTimer = 30;
        var colors = ['#f00', '#c00', '#900'];
        for (var j = 0; j < 8; j++) {
          var a = Math.random() * Math.PI * 2;
          var sp = 1 + Math.random() * 2;
          state.particles.push({
            x: f.x, y: f.y - 6,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
            life: 20 + Math.random() * 15, maxLife: 35,
            color: colors[Math.floor(Math.random() * 3)],
            size: 2 + Math.random(),
          });
        }
      }
    }
  };
})(Game);
