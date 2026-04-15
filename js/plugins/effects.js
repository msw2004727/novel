;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  G.createExplosion = function(x, y) {
    state.explosions.push({ x: x, y: y, radius: CFG.EXPLOSION_RADIUS, life: 20, maxLife: 20 });

    var colors = ['#f80', '#f40', '#fa0', '#ff0'];
    for (var i = 0; i < 24; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1 + Math.random() * 4;
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
        life: 20 + Math.random() * 30, maxLife: 50,
        color: colors[Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 3,
      });
    }

    state.shakeMag = 6;
    G.destroyTerrain(x, y, CFG.EXPLOSION_RADIUS);
    G.destroyTurretBlocks(x, y, CFG.EXPLOSION_RADIUS);
    if (G.damageSoldiersInRadius) G.damageSoldiersInRadius(x, y, CFG.EXPLOSION_RADIUS);
    G.playSound('explode');
  };

  G.plugins.effects = {
    name: 'effects',
    drawOrder: 40,

    update: function(dt) {
      // 粒子
      for (var i = state.particles.length - 1; i >= 0; i--) {
        var p = state.particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.08; p.vx *= 0.98;
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      // 爆炸
      for (var j = state.explosions.length - 1; j >= 0; j--) {
        state.explosions[j].life--;
        if (state.explosions[j].life <= 0) state.explosions.splice(j, 1);
      }

      // 震動衰減
      if (state.shakeMag > 0) {
        state.shakeX = (Math.random() - 0.5) * state.shakeMag;
        state.shakeY = (Math.random() - 0.5) * state.shakeMag;
        state.shakeMag *= 0.85;
        if (state.shakeMag < 0.5) {
          state.shakeMag = 0; state.shakeX = 0; state.shakeY = 0;
        }
      }
    },

    draw: function(ctx) {
      // 爆炸光效
      for (var i = 0; i < state.explosions.length; i++) {
        var e = state.explosions[i];
        var t = 1 - e.life / e.maxLife;
        var r = e.radius * (0.3 + t * 0.7);
        var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        g.addColorStop(0, 'rgba(255,200,50,' + (0.6 * (1 - t)) + ')');
        g.addColorStop(0.4, 'rgba(255,100,20,' + (0.4 * (1 - t)) + ')');
        g.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();

        if (t < 0.3) {
          ctx.fillStyle = 'rgba(255,255,200,' + (0.8 * (1 - t / 0.3)) + ')';
          ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.3, 0, Math.PI * 2); ctx.fill();
        }
      }

      // 粒子
      for (var j = 0; j < state.particles.length; j++) {
        var p = state.particles[j];
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },
  };
})(Game);
