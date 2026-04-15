;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;
  var canvas = document.getElementById('game');

  var SLIDER_HEIGHT = 64;

  function resizeCanvas() {
    var aspect = CFG.W / CFG.H;
    var w = window.innerWidth, h = window.innerHeight - SLIDER_HEIGHT;
    if (w / h > aspect) w = h * aspect; else h = w / aspect;

    canvas.width = CFG.W;
    canvas.height = CFG.H;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    state.scaleX = CFG.W / w;
    state.scaleY = CFG.H / h;

    var slider = document.getElementById('aim-slider');
    if (slider) slider.style.width = Math.floor(w * 0.75) + 'px';
  }

  G.initCanvas = function() {
    state.ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  };

  G.getCanvasPos = function(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * state.scaleX,
      y: (e.clientY - r.top) * state.scaleY,
    };
  };
})(Game);
