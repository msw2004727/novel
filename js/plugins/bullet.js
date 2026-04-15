;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  G.plugins.bullet = {
    name: 'bullet',
    drawOrder: 30,

    update: function(dt) {
      var now = performance.now();
      var origin = G.getBarrelOrigin();

      // 每幀平滑插值砲管角度
      if (G.isBarrelAlive()) {
        var dx = state.mouseX - origin.x;
        var dy = state.mouseY - origin.y;
        if (dx * dx + dy * dy >= 1) {
          var targetAngle = Math.atan2(dy, dx);
          if (targetAngle > 0) {
            targetAngle = targetAngle < Math.PI / 2 ? 0 : -Math.PI;
          }
          var diff = targetAngle - state.turretAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          var t = 1 - Math.exp(-15 * dt / 1000);
          state.turretAngle += diff * t;
        }
      }

      // 加速兵增益：降低射擊間隔
      var speedCount = G.countBoostingSoldiers ? G.countBoostingSoldiers('speed') : 0;
      var fireRate = CFG.TURRET_FIRE_RATE / (1 + speedCount * 0.3);

      // 發射
      if (now - state.lastFireTime >= fireRate && G.isBarrelAlive()) {
        state.lastFireTime = now;

        var angle = state.turretAngle;
        var mDist = 40;
        var mx = origin.x + Math.cos(angle) * mDist;
        var my = origin.y + Math.sin(angle) * mDist;

        // 散彈兵增益：額外子彈
        var shotgunCount = G.countBoostingSoldiers ? G.countBoostingSoldiers('shotgun') : 0;
        var totalBullets = 1 + shotgunCount * 2;
        var spreadStep = 0.07;

        for (var b = 0; b < totalBullets; b++) {
          var offset = (b - Math.floor(totalBullets / 2)) * spreadStep;
          var ba = angle + offset;
          state.bullets.push({
            x: mx, y: my,
            vx: Math.cos(ba) * CFG.BULLET_SPEED,
            vy: Math.sin(ba) * CFG.BULLET_SPEED,
            life: 80,
          });
        }

        // 砲口火焰
        for (var i = 0; i < 5; i++) {
          var sp = (Math.random() - 0.5) * 0.4;
          state.particles.push({
            x: mx, y: my,
            vx: Math.cos(angle + sp) * (3 + Math.random() * 3),
            vy: Math.sin(angle + sp) * (3 + Math.random() * 3),
            life: 5 + Math.random() * 4, maxLife: 9,
            color: i < 3 ? '#ff0' : '#fa0', size: 2,
          });
        }

        G.playSound('shoot');
      }

      // 移動子彈
      for (var i = state.bullets.length - 1; i >= 0; i--) {
        var bl = state.bullets[i];
        bl.x += bl.vx; bl.y += bl.vy; bl.life--;
        if (bl.life <= 0 || bl.x < -20 || bl.x > CFG.W + 20 || bl.y < -20 || bl.y > CFG.H + 20) {
          state.bullets.splice(i, 1);
        }
      }
    },

    draw: function(ctx) {
      ctx.shadowColor = '#ff0'; ctx.shadowBlur = 5;
      for (var i = 0; i < state.bullets.length; i++) {
        var b = state.bullets[i];
        ctx.fillStyle = '#ff0';
        ctx.fillRect(Math.floor(b.x) - 2, Math.floor(b.y) - 2, CFG.BULLET_SIZE, CFG.BULLET_SIZE);
      }
      ctx.shadowBlur = 0;
    },
  };
})(Game);
