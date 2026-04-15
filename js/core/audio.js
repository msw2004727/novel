;(function(G) {
  'use strict';
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var audioCtx = null;

  G.initAudio = function() {
    if (!audioCtx) audioCtx = new AudioCtx();
  };

  G.playSound = function(type) {
    if (!audioCtx) return;

    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    var t = audioCtx.currentTime;

    switch (type) {
      case 'shoot':
        o.type = 'square';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(200, t + 0.05);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.start(t); o.stop(t + 0.06);
        break;
      case 'explode':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.3);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t); o.stop(t + 0.3);
        break;
      case 'hit':
        o.type = 'triangle';
        o.frequency.setValueAtTime(400, t);
        o.frequency.exponentialRampToValueAtTime(80, t + 0.15);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
        break;
      case 'turret_hit':
        o.type = 'square';
        o.frequency.setValueAtTime(300, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.15);
        break;
    }
  };
})(Game);
