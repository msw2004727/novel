;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;

  var DAY_CYCLE = 360000; // 90s x 4 phases = 360s

  // 天空顏色關鍵幀 (t: 0-1)
  var SKY = [
    { t: 0.00, r: 8,   g: 8,   b: 20  },  // 深夜
    { t: 0.22, r: 8,   g: 8,   b: 20  },  // 夜末
    { t: 0.30, r: 80,  g: 40,  b: 35  },  // 破曉
    { t: 0.40, r: 70,  g: 110, b: 180 },  // 清晨
    { t: 0.50, r: 50,  g: 120, b: 210 },  // 正午
    { t: 0.65, r: 55,  g: 105, b: 190 },  // 午後
    { t: 0.78, r: 150, g: 60,  b: 30  },  // 日落
    { t: 0.88, r: 40,  g: 15,  b: 35  },  // 黃昏
    { t: 1.00, r: 8,   g: 8,   b: 20  },  // 入夜
  ];

  var birds = [];

  function getSky(t) {
    for (var i = 0; i < SKY.length - 1; i++) {
      var a = SKY[i], b = SKY[i + 1];
      if (t >= a.t && t <= b.t) {
        var f = (t - a.t) / (b.t - a.t);
        return {
          r: Math.floor(a.r + (b.r - a.r) * f),
          g: Math.floor(a.g + (b.g - a.g) * f),
          b: Math.floor(a.b + (b.b - a.b) * f),
        };
      }
    }
    return SKY[0];
  }

  function getStarAlpha(t) {
    if (t < 0.22) return 1;
    if (t < 0.35) return 1 - (t - 0.22) / 0.13;
    if (t > 0.85) return (t - 0.85) / 0.15;
    return 0;
  }

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

  function spawnBird() {
    var fromLeft = Math.random() < 0.5;
    birds.push({
      x: fromLeft ? -10 : CFG.W + 10,
      y: 30 + Math.random() * 120,
      vx: (fromLeft ? 1 : -1) * (0.3 + Math.random() * 0.5),
      wing: Math.random() * Math.PI * 2,
      wingSpd: 0.08 + Math.random() * 0.04,
      size: 3 + Math.random() * 3,
    });
  }

  G.plugins.background = {
    name: 'background',
    drawOrder: 0,

    init: function() {
      initStars();
      birds = [];
    },

    draw: function(ctx) {
      var t = (state.gameTime % DAY_CYCLE) / DAY_CYCLE;
      var sky = getSky(t);
      var sa = getStarAlpha(t);

      // === 天空漸層 ===
      var grad = ctx.createLinearGradient(0, 0, 0, CFG.GROUND_Y);
      grad.addColorStop(0, 'rgb(' + sky.r + ',' + sky.g + ',' + sky.b + ')');
      // 地平線略暖
      var hr = Math.min(255, sky.r + 20);
      var hg = Math.min(255, sky.g + 10);
      grad.addColorStop(1, 'rgb(' + hr + ',' + hg + ',' + sky.b + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(-10, -10, CFG.W + 20, CFG.H + 20);

      // === 星星 ===
      if (sa > 0.01) {
        for (var i = 0; i < state.starField.length; i++) {
          var s = state.starField[i];
          s.blink += s.speed;
          var a = sa * (0.3 + 0.7 * Math.abs(Math.sin(s.blink)));
          ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
          ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
        }
      }

      // === 月亮（夜間）===
      var moonVis = (t < 0.28) || (t > 0.85);
      if (moonVis) {
        var mt = t > 0.85 ? (t - 0.85) / 0.43 : (t + 0.15) / 0.43;
        var mx = 120 + mt * (CFG.W - 240);
        var my = 180 - Math.sin(mt * Math.PI) * 130;

        ctx.fillStyle = '#dde';
        ctx.beginPath(); ctx.arc(mx, my, 11, 0, Math.PI * 2); ctx.fill();
        // 陰影弧做出月牙
        ctx.fillStyle = 'rgb(' + sky.r + ',' + sky.g + ',' + sky.b + ')';
        ctx.beginPath(); ctx.arc(mx + 5, my - 2, 9, 0, Math.PI * 2); ctx.fill();
      }

      // === 太陽（白天）===
      var sunVis = t > 0.27 && t < 0.86;
      if (sunVis) {
        var st2 = (t - 0.27) / 0.59;
        var sx = 80 + st2 * (CFG.W - 160);
        var sy = 260 - Math.sin(st2 * Math.PI) * 220;

        // 光暈
        ctx.fillStyle = 'rgba(255,200,50,0.08)';
        ctx.beginPath(); ctx.arc(sx, sy, 40, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,80,0.12)';
        ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill();
        // 太陽本體
        ctx.fillStyle = '#ffe060';
        ctx.beginPath(); ctx.arc(sx, sy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff8c0';
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
      }

      // === 飛鳥（白天較多）===
      var birdChance = (t > 0.28 && t < 0.82) ? 0.003 : 0.0005;
      if (Math.random() < birdChance && birds.length < 12) spawnBird();

      for (var bi = birds.length - 1; bi >= 0; bi--) {
        var b = birds[bi];
        b.x += b.vx;
        b.wing += b.wingSpd;
        var wy = Math.sin(b.wing) * 2.5;

        // 依天色決定鳥的深淺
        var bright = (sky.r + sky.g + sky.b) / 3;
        var birdColor = bright > 80 ? 'rgba(30,30,30,0.6)' : 'rgba(180,180,180,0.3)';
        ctx.strokeStyle = birdColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x - b.size, b.y + wy);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(b.x + b.size, b.y + wy);
        ctx.stroke();

        if (b.x < -20 || b.x > CFG.W + 20) birds.splice(bi, 1);
      }

      // === 城市剪影 ===
      var silBright = Math.min(30, Math.floor((sky.r + sky.g + sky.b) / 20));
      ctx.fillStyle = 'rgb(' + silBright + ',' + silBright + ',' + Math.floor(silBright * 1.3) + ')';
      for (var j = 0; j < 20; j++) {
        var bx = j * 45 - 10;
        var bh = 30 + Math.sin(j * 1.7) * 25 + Math.cos(j * 0.8) * 15;
        ctx.fillRect(bx, CFG.GROUND_Y - bh, 35, bh);
      }

      // 建築窗戶（夜間亮燈）
      if (sa > 0.3) {
        ctx.fillStyle = 'rgba(255,220,100,' + (sa * 0.5) + ')';
        for (var j2 = 0; j2 < 20; j2++) {
          var bx2 = j2 * 45 - 10;
          var bh2 = 30 + Math.sin(j2 * 1.7) * 25 + Math.cos(j2 * 0.8) * 15;
          for (var wr = 0; wr < 3; wr++) {
            for (var wc = 0; wc < 3; wc++) {
              if (((j2 * 7 + wr * 3 + wc) % 5) < 2) {
                ctx.fillRect(bx2 + 5 + wc * 10, CFG.GROUND_Y - bh2 + 5 + wr * 10, 3, 4);
              }
            }
          }
        }
      }
    },
  };
})(Game);
