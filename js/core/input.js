;(function(G) {
  'use strict';
  var state = G.state;

  G.initInput = function() {
    var canvas = document.getElementById('game');

    // 全域手勢鎖定（Safari/Chrome/LINE 瀏覽器雙指縮放、下拉刷新）
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('mousemove', function(e) {
      if (state.sliderDragging) return;
      var p = G.getCanvasPos(e);
      state.mouseX = p.x;
      state.mouseY = p.y;
    });

    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      if (state.sliderDragging) return;
      var p = G.getCanvasPos(e.touches[0]);
      state.mouseX = p.x;
      state.mouseY = p.y;
    }, { passive: false });

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (state.sliderDragging) return;
      var p = G.getCanvasPos(e.touches[0]);
      state.mouseX = p.x;
      state.mouseY = p.y;
    }, { passive: false });
  };
})(Game);
