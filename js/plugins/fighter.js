;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  var INTERVAL_MIN = 10000;
  var INTERVAL_MAX = 15000;
  var SPEED = 4;
  var BOMB_COUNT_MIN = 1;
  var BOMB_COUNT_MAX = 2;

  var fighters = [];
  var timer = 0;
  var nextSpawn = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);

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

      // 生成戰機
      if (timer >= nextSpawn) {
        timer = 0;
        nextSpawn = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);

        var fromLeft = Math.random() < 0.5;
        var bombs = BOMB_COUNT_MIN + Math.floor(Math.random() * (BOMB_COUNT_MAX - BOMB_COUNT_MIN + 1));
        var fy = 40 + Math.random() * 80;

        fighters.push({
          x: fromLeft ? -30 : CFG.W + 30,
          y: fy,
          vx: (fromLeft ? 1 : -1) * SPEED,
          dir: fromLeft ? 1 : -1,
          bombs: bombs,
          dropped: 0,
          dropZone: 150 + Math.random() * (CFG.W - 300), // 隨機投彈位置
        });
      }

      // 更新戰機
      for (i = fighters.length - 1; i >= 0; i--) {
        f = fighters[i];
        f.x += f.vx;

        // 經過投彈區時投彈（命中率很低：大偏移）
        if (f.dropped < f.bombs) {
          var distToDrop = Math.abs(f.x - f.dropZone);
          if (distToDrop < 20) {
            f.dropped++;
            // 大幅偏移：命中率低
            var errorX = (Math.random() - 0.5) * 300;
            state.missiles.push({
              x: f.x + errorX,
              y: f.y + 10,
              vx: f.vx * 0.15,
              vy: 0.3,
              alive: true,
              trail: [],
              type: 'bomb',
            });
          }
        }

        // 引擎尾焰
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

        // 機身
        ctx.fillStyle = '#556';
        ctx.fillRect(fx - 10 * d, fy - 2, 20, 5);
        // 機頭
        ctx.fillStyle = '#667';
        ctx.fillRect(fx + 8 * d, fy - 1, 5 * d, 3);
        // 機翼
        ctx.fillStyle = '#445';
        ctx.fillRect(fx - 4 * d, fy - 7, 8, 4);
        ctx.fillRect(fx - 4 * d, fy + 3, 8, 4);
        // 尾翼
        ctx.fillStyle = '#445';
        ctx.fillRect(fx - 10 * d, fy - 5, 3, 3);
        ctx.fillRect(fx - 10 * d, fy + 2, 3, 3);
      }
    },
  };
})(Game);
