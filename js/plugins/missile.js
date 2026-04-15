;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  G.plugins.missile = {
    name: 'missile',
    drawOrder: 35,

    update: function(dt) {
      var now = performance.now();

      // 生成（難度隨小兵數動態調整）
      var diff = G.getDifficultyBonus ? G.getDifficultyBonus() : 0;
      var rate = Math.max(CFG.MISSILE_SPAWN_RATE_MIN, CFG.MISSILE_SPAWN_RATE_INIT - (state.wave - 1) * 100);
      rate = rate / (1 + diff);  // 小兵越多，間隔越短
      if (state.airships && state.airships.length > 0) rate *= 2;
      if (now - state.lastMissileTime >= rate) {
        state.lastMissileTime = now;

        var count = state.wave >= 4 ? (state.wave >= 7 ? 3 : 2) : 1;
        count = Math.ceil(count * (1 + diff));  // 小兵越多，每波越多
        for (var i = 0; i < count; i++) {
          // 隨機方位生成：左、右、上方三個方向
          var dir = Math.random();
          var sx, sy;
          if (dir < 0.4) {
            // 左側
            sx = -10;
            sy = 20 + Math.random() * 150;
          } else if (dir < 0.8) {
            // 右側
            sx = CFG.W + 10;
            sy = 20 + Math.random() * 150;
          } else {
            // 上方
            sx = 50 + Math.random() * (CFG.W - 100);
            sy = -10;
          }

          // 目標：砲台中心，加入 20% 誤差
          var errorRange = CFG.W * 0.2;
          var targetX = CFG.W / 2 + (Math.random() - 0.5) * errorRange;
          var targetY = CFG.GROUND_Y + (Math.random() - 0.5) * 40;
          // 飛行時間依距離自動調整，避免拋物線向上
          var dx = targetX - sx, dy = targetY - sy;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var flightTime = (dist * 0.6 + 60) / (1 + diff);
          var vx = dx / flightTime;
          var vy = (dy - 0.5 * CFG.MISSILE_GRAVITY * flightTime * flightTime) / flightTime;
          // 確保初始方向朝下或平飛，不允許向上拋射
          if (vy < 0) vy = 0.2 + Math.random() * 0.3;

          state.missiles.push({ x: sx, y: sy, vx: vx, vy: vy, alive: true, trail: [] });
        }
      }

      // 更新（拋物線）
      for (var i = state.missiles.length - 1; i >= 0; i--) {
        var m = state.missiles[i];
        if (!m.alive) { state.missiles.splice(i, 1); continue; }

        if (m.type !== 'flame') m.vy += CFG.MISSILE_GRAVITY;
        m.x += m.vx;
        m.y += m.vy;

        m.trail.push({ x: m.x, y: m.y, life: 18 });
        if (m.trail.length > 18) m.trail.shift();
        for (var j = 0; j < m.trail.length; j++) m.trail[j].life--;
        for (var k = m.trail.length - 1; k >= 0; k--) {
          if (m.trail[k].life <= 0) m.trail.splice(k, 1);
        }
      }
    },

    draw: function(ctx) {
      var i, j, m, t, a;

      // 尾跡
      for (i = 0; i < state.missiles.length; i++) {
        m = state.missiles[i];
        if (!m.alive) continue;
        for (j = 0; j < m.trail.length; j++) {
          t = m.trail[j];
          var ta = (t.life / 18) * 0.5;
          if (m.type === 'flame') {
            ctx.fillStyle = 'rgba(255,120,20,' + ta + ')';
          } else if (m.type === 'bomb') {
            ctx.fillStyle = 'rgba(100,100,100,' + ta + ')';
          } else {
            ctx.fillStyle = 'rgba(255,80,20,' + ta + ')';
          }
          ctx.fillRect(Math.floor(t.x) - 1, Math.floor(t.y) - 1, 3, 3);
        }
      }

      // 本體
      for (i = 0; i < state.missiles.length; i++) {
        m = state.missiles[i];
        if (!m.alive) continue;

        if (m.type === 'flame') {
          // 火焰球
          var flx = Math.floor(m.x), fly = Math.floor(m.y);
          ctx.fillStyle = 'rgba(255,150,30,0.35)';
          ctx.beginPath(); ctx.arc(flx, fly, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fa0';
          ctx.beginPath(); ctx.arc(flx, fly, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff6';
          ctx.beginPath(); ctx.arc(flx, fly, 2, 0, Math.PI * 2); ctx.fill();
        } else if (m.type === 'bomb') {
          // 炸彈
          var bx = Math.floor(m.x), by = Math.floor(m.y);
          ctx.fillStyle = '#333';
          ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#c33';
          ctx.fillRect(bx - 1, by - 6, 2, 3);
          ctx.fillStyle = '#fa0';
          ctx.fillRect(bx - 1, by - 7, 2, 1);
        } else {
          // 導彈
          a = Math.atan2(m.vy, m.vx);
          ctx.save();
          ctx.translate(Math.floor(m.x), Math.floor(m.y));
          ctx.rotate(a);
          ctx.fillStyle = '#c33'; ctx.fillRect(-7, -3, 14, 6);
          ctx.fillStyle = '#f66'; ctx.fillRect(6, -2, 4, 4);
          ctx.fillStyle = '#933'; ctx.fillRect(-7, -5, 3, 2); ctx.fillRect(-7, 3, 3, 2);
          ctx.fillStyle = '#fa0'; ctx.fillRect(-9, -2, 2, 4);
          ctx.restore();
        }
      }
    },
  };
})(Game);
