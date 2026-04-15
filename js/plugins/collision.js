;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  function gameOver() {
    state.gameState = 'gameover';
    if (G.saveScore) G.saveScore();
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('final-stats').textContent =
      '擊落 ' + state.kills + ' 枚導彈 | 存活 ' + Math.floor(state.gameTime / 1000) + ' 秒 | 抵達波次 ' + state.wave;
  }

  G.plugins.collision = {
    name: 'collision',
    drawOrder: -1,

    update: function(dt) {
      var bi, mi, b, m, dx, dy, a, sp, i;

      // 子彈 vs 導彈
      for (bi = state.bullets.length - 1; bi >= 0; bi--) {
        b = state.bullets[bi];
        for (mi = state.missiles.length - 1; mi >= 0; mi--) {
          m = state.missiles[mi];
          if (!m.alive) continue;

          dx = b.x - m.x; dy = b.y - m.y;
          if (dx * dx + dy * dy < 11 * 11) {
            m.alive = false; b.life = 0; state.kills++;

            state.explosions.push({ x: m.x, y: m.y, radius: 20, life: 15, maxLife: 15 });

            var colors = ['#f80', '#fa0', '#ff0'];
            for (i = 0; i < 12; i++) {
              a = Math.random() * Math.PI * 2;
              sp = 1 + Math.random() * 3;
              state.particles.push({
                x: m.x, y: m.y,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
                life: 15 + Math.random() * 20, maxLife: 35,
                color: colors[Math.floor(Math.random() * 3)],
                size: 2 + Math.random() * 2,
              });
            }

            state.shakeMag = 3;
            G.playSound('hit');
            break;
          }
        }
      }

      // 子彈 vs 空投降落傘
      for (bi = state.bullets.length - 1; bi >= 0; bi--) {
        b = state.bullets[bi];
        if (b.life <= 0) continue;
        for (var ai = state.airdrops.length - 1; ai >= 0; ai--) {
          var ad = state.airdrops[ai];
          if (!ad.alive || ad.falling) continue;
          dx = b.x - ad.x; dy = b.y - ad.y;
          if (dx * dx + dy * dy < 20 * 20) {
            b.life = 0;
            ad.falling = true;
            for (i = 0; i < 8; i++) {
              a = Math.random() * Math.PI * 2;
              sp = 1 + Math.random() * 2;
              state.particles.push({
                x: ad.x, y: ad.y - 15,
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
                life: 20 + Math.random() * 15, maxLife: 35,
                color: '#fff', size: 2,
              });
            }
            G.playSound('hit');
            break;
          }
        }
      }

      // 子彈 vs 飛艇 / 怪獸
      for (bi = state.bullets.length - 1; bi >= 0; bi--) {
        b = state.bullets[bi];
        if (b.life <= 0) continue;
        if (G.checkAirshipHit && G.checkAirshipHit(b.x, b.y)) {
          b.life = 0; state.kills++; G.playSound('hit');
        } else if (b.life > 0 && G.checkKaijuHit && G.checkKaijuHit(b.x, b.y)) {
          b.life = 0; state.kills++; G.playSound('hit');
        } else if (b.life > 0 && G.checkFighterHit && G.checkFighterHit(b.x, b.y)) {
          b.life = 0; state.kills++; G.playSound('hit');
        }
      }

      // 導彈 vs 飛艇（空中導彈有機率撞到飛艇）
      for (i = state.missiles.length - 1; i >= 0; i--) {
        m = state.missiles[i];
        if (!m.alive || m.type === 'bomb') continue;
        if (G.checkAirshipHit && G.checkAirshipHit(m.x, m.y)) {
          m.alive = false;
          state.explosions.push({ x: m.x, y: m.y, radius: 18, life: 12, maxLife: 12 });
          state.shakeMag = 2;
          G.playSound('explode');
        }
      }

      // 導彈/炸彈 vs 地面/砲台
      for (i = state.missiles.length - 1; i >= 0; i--) {
        m = state.missiles[i];
        if (!m.alive) continue;

        if (G.checkTurretHit(m.x, m.y)) {
          m.alive = false;
          G.createExplosion(m.x, m.y);
          if (!G.isBarrelAlive() || G.countAliveBlocks().alive <= 0) gameOver();
          continue;
        }

        if (G.checkTerrainHit(m.x, m.y)) {
          m.alive = false;
          G.createExplosion(m.x, m.y);
          if (!G.isBarrelAlive() || G.countAliveBlocks().alive <= 0) gameOver();
          continue;
        }

        if (m.y > CFG.H + 40) m.alive = false;
      }
    },
  };
})(Game);
