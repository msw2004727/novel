;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  G.getTurretBlockWorld = function(r, c) {
    var tw = CFG.TB_COLS * CFG.TB_SIZE;
    var th = CFG.TB_ROWS * CFG.TB_SIZE;
    return {
      x: state.turretX - tw / 2 + c * CFG.TB_SIZE,
      y: state.turretBaseY - th + r * CFG.TB_SIZE,
    };
  };

  G.isBarrelAlive = function() {
    return state.barrelHP > 0;
  };

  G.getBarrelOrigin = function() {
    var mid = Math.floor(CFG.TB_COLS / 2);
    var bpos = G.getTurretBlockWorld(0, mid);
    return { x: bpos.x, y: bpos.y + CFG.TB_SIZE / 2 };
  };

  function setBlock(r, c, hp, type, color) {
    if (r >= 0 && r < CFG.TB_ROWS && c >= 0 && c < CFG.TB_COLS) {
      state.turretBlocks[r][c] = { hp: hp, type: type, color: color };
    }
  }

  function applyGravity() {
    var tb = state.turretBlocks;
    for (var r = CFG.TB_ROWS - 2; r >= 0; r--) {
      for (var c = 0; c < CFG.TB_COLS; c++) {
        var b = tb[r][c];
        if (b.hp <= 0) continue;

        var hasSupport = false;
        if (r + 1 < CFG.TB_ROWS && tb[r + 1][c].hp > 0) hasSupport = true;
        if (!hasSupport && r + 1 < CFG.TB_ROWS) {
          if (c > 0 && tb[r + 1][c - 1].hp > 0) hasSupport = true;
          if (c < CFG.TB_COLS - 1 && tb[r + 1][c + 1].hp > 0) hasSupport = true;
        }
        // 最底排：檢查地形是否還在下方支撐
        if (r === CFG.TB_ROWS - 1) {
          hasSupport = false;
          var tw = CFG.TB_COLS * CFG.TB_SIZE;
          var worldX = state.turretX - tw / 2 + c * CFG.TB_SIZE + CFG.TB_SIZE / 2;
          var terrainCol = Math.floor(worldX / CFG.TILE_SIZE);
          if (terrainCol >= 0 && terrainCol < G.TERRAIN_COLS &&
              state.terrain[0] && state.terrain[0][terrainCol] > 0) {
            hasSupport = true;
          }
        }

        if (!hasSupport) {
          b.hp = 0;
          var pos = G.getTurretBlockWorld(r, c);
          for (var i = 0; i < 3; i++) {
            state.particles.push({
              x: pos.x + CFG.TB_SIZE / 2, y: pos.y + CFG.TB_SIZE / 2,
              vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2 + 1,
              life: 20 + Math.random() * 15, maxLife: 35,
              color: '#5a5a4a', size: 2 + Math.random() * 2,
            });
          }
        }
      }
    }
  }

  G.destroyTurretBlocks = function(wx, wy, radius) {
    var r2 = radius * radius;
    var destroyed = false;

    for (var r = 0; r < CFG.TB_ROWS; r++) {
      if (!state.turretBlocks[r]) continue;
      for (var c = 0; c < CFG.TB_COLS; c++) {
        var b = state.turretBlocks[r][c];
        if (b.hp <= 0) continue;

        var pos = G.getTurretBlockWorld(r, c);
        var bx = pos.x + CFG.TB_SIZE / 2;
        var by = pos.y + CFG.TB_SIZE / 2;
        var dx = bx - wx, dy = by - wy;
        var d2 = dx * dx + dy * dy;

        if (d2 < r2) {
          var dmg = d2 < r2 * 0.3 ? 3 : d2 < r2 * 0.6 ? 2 : 1;
          b.hp = Math.max(0, b.hp - dmg);

          if (b.hp <= 0) {
            destroyed = true;
            var col = b.type === 'track' ? '#333' : b.type === 'dome' ? '#6a7a5a' : '#4a5a3a';
            for (var i = 0; i < 4; i++) {
              state.particles.push({
                x: bx, y: by,
                vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1,
                life: 25 + Math.random() * 20, maxLife: 45,
                color: col, size: 2 + Math.random() * 3,
              });
            }
          }
        }
      }
    }

    // 砲管受損：每次爆炸波及砲管方塊扣 1 HP
    var barrelHit = false;
    for (var r2b = 0; r2b < CFG.TB_ROWS; r2b++) {
      if (!state.turretBlocks[r2b]) continue;
      for (var c2b = 0; c2b < CFG.TB_COLS; c2b++) {
        var blk = state.turretBlocks[r2b][c2b];
        if (blk.type !== 'barrel') continue;
        var bp = G.getTurretBlockWorld(r2b, c2b);
        var bdx = bp.x + CFG.TB_SIZE / 2 - wx;
        var bdy = bp.y + CFG.TB_SIZE / 2 - wy;
        if (bdx * bdx + bdy * bdy < r2) { barrelHit = true; break; }
      }
      if (barrelHit) break;
    }
    if (barrelHit && state.barrelHP > 0) state.barrelHP--;

    if (destroyed) G.playSound('turret_hit');
    applyGravity();
  };

  G.checkTurretHit = function(mx, my) {
    for (var r = 0; r < CFG.TB_ROWS; r++) {
      if (!state.turretBlocks[r]) continue;
      for (var c = 0; c < CFG.TB_COLS; c++) {
        if (state.turretBlocks[r][c].hp <= 0) continue;
        var pos = G.getTurretBlockWorld(r, c);
        if (mx >= pos.x && mx <= pos.x + CFG.TB_SIZE &&
            my >= pos.y && my <= pos.y + CFG.TB_SIZE) {
          return true;
        }
      }
    }
    return false;
  };

  G.countAliveBlocks = function() {
    var alive = 0, total = 0;
    for (var r = 0; r < CFG.TB_ROWS; r++) {
      if (!state.turretBlocks[r]) continue;
      for (var c = 0; c < CFG.TB_COLS; c++) {
        if (state.turretBlocks[r][c].type !== 'empty') {
          total++;
          if (state.turretBlocks[r][c].hp > 0) alive++;
        }
      }
    }
    return { alive: alive, total: total };
  };

  G.plugins.turret = {
    name: 'turret',
    drawOrder: 20,

    init: function() {
      var C = CFG.TB_COLS, R = CFG.TB_ROWS;
      state.turretBlocks = [];

      for (var r = 0; r < R; r++) {
        state.turretBlocks[r] = [];
        for (var c = 0; c < C; c++) {
          state.turretBlocks[r][c] = { hp: 0, type: 'empty', color: '' };
        }
      }

      for (var c = 0; c < C; c++) setBlock(5, c, 3, 'track', '#2a2a2a');
      for (var c = 0; c < C; c++) setBlock(4, c, 3, 'armor', '#3a4a3a');
      for (var c = 1; c < C - 1; c++) setBlock(3, c, 3, 'armor', '#4a5a4a');
      for (var c = 2; c < C - 2; c++) setBlock(2, c, 3, 'armor', '#4a5a3a');
      for (var c = 3; c < C - 3; c++) setBlock(1, c, 3, 'dome', '#5a6a4a');
      var mid = Math.floor(C / 2);
      setBlock(0, mid - 1, 3, 'barrel', '#6a7a5a');
      setBlock(0, mid, 3, 'barrel', '#6a7a5a');
    },

    draw: function(ctx, now) {
      var tb = state.turretBlocks;

      for (var r = 0; r < CFG.TB_ROWS; r++) {
        if (!tb[r]) continue;
        for (var c = 0; c < CFG.TB_COLS; c++) {
          var b = tb[r][c];
          if (b.hp <= 0) continue;

          var pos = G.getTurretBlockWorld(r, c);
          var S = CFG.TB_SIZE;
          var hpF = b.hp / 3;
          var bR, bG, bB;

          if (b.type === 'track')       { bR = 42; bG = 42;  bB = 42; }
          else if (b.type === 'dome')   { bR = 90; bG = 106; bB = 74; }
          else if (b.type === 'barrel') { bR = 106; bG = 122; bB = 90; }
          else                          { bR = 74; bG = 90;  bB = 74; }

          ctx.fillStyle = 'rgb(' + Math.floor(bR * hpF) + ',' + Math.floor(bG * hpF) + ',' + Math.floor(bB * hpF) + ')';
          ctx.fillRect(pos.x, pos.y, S, S);

          ctx.fillStyle = 'rgba(0,0,0,.2)';
          ctx.fillRect(pos.x + S - 1, pos.y, 1, S);
          ctx.fillRect(pos.x, pos.y + S - 1, S, 1);

          if (b.hp === 3) {
            ctx.fillStyle = 'rgba(255,255,255,.08)';
            ctx.fillRect(pos.x, pos.y, S, 1);
            ctx.fillRect(pos.x, pos.y, 1, S);
          }
        }
      }

      // 狀態指示燈
      var mid = Math.floor(CFG.TB_COLS / 2);
      if (tb[1] && tb[1][mid] && tb[1][mid].hp > 0) {
        var lpos = G.getTurretBlockWorld(1, mid);
        var alive = G.isBarrelAlive();
        ctx.fillStyle = alive ? '#0f0' : '#f00';
        ctx.shadowColor = alive ? '#0f0' : '#f00';
        ctx.shadowBlur = 4;
        ctx.fillRect(lpos.x + 2, lpos.y + 2, 3, 3);
        ctx.shadowBlur = 0;
      }

      // 砲管
      if (G.isBarrelAlive()) {
        var origin = G.getBarrelOrigin();
        var barrelLen = 38;
        var angle = state.turretAngle;
        var bx = origin.x + Math.cos(angle) * barrelLen;
        var by = origin.y + Math.sin(angle) * barrelLen;

        ctx.strokeStyle = '#1a2a1a'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(origin.x, origin.y + 1); ctx.lineTo(bx, by + 1); ctx.stroke();
        ctx.strokeStyle = '#5a6a4a'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(bx, by); ctx.stroke();
        ctx.strokeStyle = '#7a8a6a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(origin.x, origin.y - 1); ctx.lineTo(bx, by - 1); ctx.stroke();

        var mx = origin.x + Math.cos(angle) * (barrelLen + 3);
        var my = origin.y + Math.sin(angle) * (barrelLen + 3);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);
        ctx.fillStyle = '#3a4a3a';
        ctx.fillRect(-3, -6, 6, 12);
        ctx.restore();
      }
    },
  };
})(Game);
