;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;
  var COLS = G.TERRAIN_COLS;
  var ROWS = G.TERRAIN_ROWS;

  function getWorldY(r) {
    return CFG.GROUND_Y + r * CFG.TILE_SIZE;
  }

  G.destroyTerrain = function(wx, wy, radius) {
    var terrain = state.terrain;
    if (!terrain.length) return;

    var r2 = radius * radius;
    for (var r = 0; r < ROWS; r++) {
      if (!terrain[r]) continue;
      for (var c = 0; c < COLS; c++) {
        if (terrain[r][c] <= 0) continue;

        var tx = c * CFG.TILE_SIZE + CFG.TILE_SIZE / 2;
        var ty = getWorldY(r) + CFG.TILE_SIZE / 2;
        var dx = tx - wx, dy = ty - wy;
        var d2 = dx * dx + dy * dy;

        if (d2 < r2) {
          var dmg = d2 < r2 * 0.3 ? 3 : d2 < r2 * 0.7 ? 2 : 1;
          terrain[r][c] = Math.max(0, terrain[r][c] - dmg);

          if (terrain[r][c] <= 0) {
            var colors = ['#5a3a1a', '#7a5a2a', '#4a2a0a'];
            for (var i = 0; i < 3; i++) {
              state.particles.push({
                x: tx, y: ty,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3 - 1,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                color: colors[Math.floor(Math.random() * 3)],
                size: 2 + Math.random() * 2,
              });
            }
          }
        }
      }
    }
  };

  G.checkTerrainHit = function(x, y) {
    var col = Math.floor(x / CFG.TILE_SIZE);
    if (col < 0 || col >= COLS || !state.terrain.length) return false;

    for (var r = 0; r < ROWS; r++) {
      if (!state.terrain[r]) continue;
      if (state.terrain[r][col] > 0 && y >= getWorldY(r)) return true;
    }
    return false;
  };

  G.plugins.terrain = {
    name: 'terrain',
    drawOrder: 10,

    init: function() {
      state.terrain = [];
      for (var r = 0; r < ROWS; r++) {
        state.terrain[r] = [];
        for (var c = 0; c < COLS; c++) {
          state.terrain[r][c] = 3;
        }
      }
    },

    draw: function(ctx) {
      var terrain = state.terrain;
      for (var r = 0; r < ROWS; r++) {
        if (!terrain[r]) continue;
        for (var c = 0; c < COLS; c++) {
          var hp = terrain[r][c];
          if (hp <= 0) continue;

          var tx = c * CFG.TILE_SIZE;
          var ty = getWorldY(r);

          if (r === 0) {
            ctx.fillStyle = ['#1a3a1a', '#2a4a1a', '#1a4a2a'][hp - 1] || '#1a3a1a';
          } else {
            var d = r / ROWS, br = hp / 3;
            ctx.fillStyle = 'rgb(' + Math.floor((40 + d * 30) * br) + ',' + Math.floor((25 + d * 15) * br) + ',' + Math.floor(10 * br) + ')';
          }

          ctx.fillRect(tx, ty, CFG.TILE_SIZE, CFG.TILE_SIZE);
          ctx.fillStyle = 'rgba(0,0,0,.15)';
          ctx.fillRect(tx + CFG.TILE_SIZE - 1, ty, 1, CFG.TILE_SIZE);
          ctx.fillRect(tx, ty + CFG.TILE_SIZE - 1, CFG.TILE_SIZE, 1);
        }
      }
    },
  };
})(Game);
