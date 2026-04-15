;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  var INTERVAL_MIN = 10000;
  var INTERVAL_MAX = 15000;
  var SPEED = 4;
  var HIT_RADIUS = 16;
  var HP = 3;

  var fighters = [];
  var timer = 0;
  var nextSpawn = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);

  // 子彈碰戰機（供 collision.js 呼叫）
  G.checkFighterHit = function(bx, by) {
    for (var i = 0; i < fighters.length; i++) {
      var f = fighters[i];
      if (f.dead) continue;
      var dx = bx - f.x, dy = by - f.y;
      if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
        f.hp--;
        // 命中粒子
        for (var j = 0; j < 3; j++) {
          state.particles.push({
            x: bx, y: by,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
            life: 10 + Math.random() * 8, maxLife: 18,
            color: '#888', size: 2,
          });
        }
        if (f.hp <= 0) {
          f.dead = true;
          f.fallVy = 0;
          // 爆炸粒子
          for (var k = 0; k < 15; k++) {
            var a = Math.random() * Math.PI * 2;
            var sp = 1 + Math.random() * 3;
            state.particles.push({
              x: f.x, y: f.y,
              vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
              life: 15 + Math.random() * 20, maxLife: 35,
              color: ['#fa0', '#f60', '#888'][Math.floor(Math.random() * 3)],
              size: 2 + Math.random() * 2,
            });
          }
          state.shakeMag = 3;
          G.playSound('explode');
        }
        return true;
      }
    }
    return false;
  };

  function spawnSoldiers(x) {
    var count = 1 + Math.floor(Math.random() * 3);
    var sc = G.countAliveSoldiers ? G.countAliveSoldiers() : { repair: 0, speed: 0, shotgun: 0 };
    var cap = 100 - (sc.repair + sc.speed + sc.shotgun);
    count = Math.min(count, cap);
    var types = ['repair', 'speed', 'shotgun'];
    for (var i = 0; i < count; i++) {
      state.soldiers.push({
        x: x + (Math.random() - 0.5) * 30,
        y: CFG.GROUND_Y,
        type: types[Math.floor(Math.random() * types.length)],
        state: 'walking_to',
        targetX: state.turretX,
        direction: x < state.turretX ? 1 : -1,
        repairTarget: null, repairTimer: 0,
        bridgeCol: -1, bridgeTimer: 0,
        boostTimer: 0, deadTimer: 0, walkFrame: 0,
      });
    }
  }

  G.plugins.fighter = {
    name: 'fighter',
    drawOrder: 6,

    init: function() {
      fighters = [];
      timer = 0;
      nextSpawn = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);
    },

    update: function(dt) {
      var i, f;
      timer += dt;

      if (timer >= nextSpawn) {
        timer = 0;
        nextSpawn = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);

        var fromLeft = Math.random() < 0.5;
        fighters.push({
          x: fromLeft ? -30 : CFG.W + 30,
          y: 40 + Math.random() * 80,
          vx: (fromLeft ? 1 : -1) * SPEED,
          dir: fromLeft ? 1 : -1,
          bombs: 1 + Math.floor(Math.random() * 2),
          dropped: 0,
          dropZone: 150 + Math.random() * (CFG.W - 300),
          hp: HP,
          dead: false,
          fallVy: 0,
        });
      }

      for (i = fighters.length - 1; i >= 0; i--) {
        f = fighters[i];

        if (f.dead) {
          // 墜落
          f.fallVy += 0.08;
          f.x += f.vx * 0.3;
          f.y += f.fallVy;
          // 冒煙
          if (Math.random() < 0.5) {
            state.particles.push({
              x: f.x, y: f.y,
              vx: (Math.random() - 0.5) * 1.5, vy: -Math.random() * 0.5,
              life: 10 + Math.random() * 10, maxLife: 20,
              color: '#555', size: 2 + Math.random() * 2,
            });
          }
          // 墜地
          if (f.y >= CFG.GROUND_Y - 5) {
            G.createExplosion(f.x, CFG.GROUND_Y - 5);
            spawnSoldiers(f.x);
            fighters.splice(i, 1);
          }
          continue;
        }

        f.x += f.vx;

        // 投彈
        if (f.dropped < f.bombs) {
          if (Math.abs(f.x - f.dropZone) < 20) {
            f.dropped++;
            state.missiles.push({
              x: f.x + (Math.random() - 0.5) * 300,
              y: f.y + 10,
              vx: f.vx * 0.15, vy: 0.3,
              alive: true, trail: [], type: 'bomb',
            });
          }
        }

        // 尾焰
        if (Math.random() < 0.4) {
          state.particles.push({
            x: f.x - f.dir * 12,
            y: f.y + (Math.random() - 0.5) * 3,
            vx: -f.dir * (1 + Math.random()),
            vy: (Math.random() - 0.5) * 0.5,
            life: 6 + Math.random() * 6, maxLife: 12,
            color: '#fa0', size: 1 + Math.random(),
          });
        }

        // 離開畫面
        if ((f.dir > 0 && f.x > CFG.W + 40) || (f.dir < 0 && f.x < -40)) {
          fighters.splice(i, 1);
        }
      }
    },

    draw: function(ctx) {
      for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        var fx = Math.floor(f.x), fy = Math.floor(f.y);
        var d = f.dir;
        var tilt = f.dead ? 0.3 : 0;

        ctx.save();
        ctx.translate(fx, fy);
        if (f.dead) ctx.rotate(tilt * d);

        // 機身
        ctx.fillStyle = f.dead ? '#433' : '#556';
        ctx.fillRect(-10, -2, 20, 5);
        // 機頭
        ctx.fillStyle = '#667';
        ctx.fillRect(8 * d, -1, 5 * d, 3);
        // 機翼
        ctx.fillStyle = f.dead ? '#322' : '#445';
        ctx.fillRect(-4, -8, 8, 4);
        ctx.fillRect(-4, 4, 8, 4);
        // 尾翼
        ctx.fillStyle = '#445';
        ctx.fillRect(-11 * d, -5, 3, 3);
        ctx.fillRect(-11 * d, 2, 3, 3);

        ctx.restore();
      }
    },
  };
})(Game);
