;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  function initStars() {
    state.starField = [];
    for (var i = 0; i < 80; i++) {
      state.starField.push({
        x: Math.random() * CFG.W,
        y: Math.random() * (CFG.GROUND_Y - 60),
        size: Math.random() < 0.3 ? 2 : 1,
        blink: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
      });
    }
  }

  G.plugins.background = {
    name: 'background',
    drawOrder: 0,

    init: function() { initStars(); },

    draw: function(ctx) {
      ctx.fillStyle = '#080810';
      ctx.fillRect(-10, -10, CFG.W + 20, CFG.H + 20);

      for (var i = 0; i < state.starField.length; i++) {
        var s = state.starField[i];
        s.blink += s.speed;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.7 * Math.abs(Math.sin(s.blink))) + ')';
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
      }

      ctx.fillStyle = '#0c0c18';
      for (var j = 0; j < 20; j++) {
        var bx = j * 45 - 10;
        var bh = 30 + Math.sin(j * 1.7) * 25 + Math.cos(j * 0.8) * 15;
        ctx.fillRect(bx, CFG.GROUND_Y - bh, 35, bh);
      }
    },
  };
})(Game);
