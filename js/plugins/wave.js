;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  G.plugins.wave = {
    name: 'wave',
    drawOrder: -1,

    update: function(dt) {
      state.waveTimer += dt;
      if (state.waveTimer > CFG.WAVE_DURATION) {
        state.waveTimer = 0;
        state.wave++;
      }
    },
  };
})(Game);
