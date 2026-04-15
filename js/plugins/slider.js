;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;
  var slider, track, handle;

  function updateFromClient(clientX) {
    var rect = track.getBoundingClientRect();
    var ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    handle.style.left = (ratio * 100) + '%';

    // ratio → 角度：0=左(-PI), 0.5=上(-PI/2), 1=右(0)
    var angle = -Math.PI + ratio * Math.PI;
    var origin = G.getBarrelOrigin();
    var dist = 200;
    state.mouseX = origin.x + Math.cos(angle) * dist;
    state.mouseY = origin.y + Math.sin(angle) * dist;
  }

  function syncHandle() {
    if (state.sliderDragging || !handle) return;
    var origin = G.getBarrelOrigin();
    var dx = state.mouseX - origin.x;
    var dy = state.mouseY - origin.y;
    if (dx * dx + dy * dy < 1) return;

    var angle = Math.atan2(dy, dx);
    if (angle > 0) angle = angle < Math.PI / 2 ? 0 : -Math.PI;

    // angle → ratio：-PI=0, -PI/2=0.5, 0=1
    var ratio = (angle + Math.PI) / Math.PI;
    ratio = Math.max(0, Math.min(1, ratio));
    handle.style.left = (ratio * 100) + '%';
  }

  G.plugins.slider = {
    name: 'slider',
    drawOrder: -1,

    init: function() {
      slider = document.getElementById('aim-slider');
      track = document.getElementById('aim-track');
      handle = document.getElementById('aim-handle');
      if (!slider) return;

      slider.addEventListener('touchstart', function(e) {
        e.preventDefault();
        e.stopPropagation();
        state.sliderDragging = true;
        handle.style.transition = 'none';
        updateFromClient(e.touches[0].clientX);
      }, { passive: false });

      document.addEventListener('touchmove', function(e) {
        if (!state.sliderDragging) return;
        e.preventDefault();
        updateFromClient(e.touches[0].clientX);
      }, { passive: false });

      document.addEventListener('touchend', function() {
        if (state.sliderDragging) {
          state.sliderDragging = false;
          handle.style.transition = '';
        }
      });

      slider.addEventListener('mousedown', function(e) {
        e.preventDefault();
        state.sliderDragging = true;
        handle.style.transition = 'none';
        updateFromClient(e.clientX);
      });

      document.addEventListener('mousemove', function(e) {
        if (!state.sliderDragging) return;
        updateFromClient(e.clientX);
      });

      document.addEventListener('mouseup', function() {
        if (state.sliderDragging) {
          state.sliderDragging = false;
          handle.style.transition = '';
        }
      });
    },

    update: function() {
      syncHandle();
    },
  };
})(Game);
