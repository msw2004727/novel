;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;
  var els = {};
  var last = {};
  var hpCells = [];

  G.plugins.hud = {
    name: 'hud',
    drawOrder: 50,

    init: function() {
      els.hp = document.getElementById('hp');
      els.kills = document.getElementById('kills');
      els.time = document.getElementById('time');
      els.wave = document.getElementById('wave');
      els.soldiers = document.getElementById('soldier-info');
      hpCells = document.querySelectorAll('.hp-cell');
      last = {};
    },

    update: function(dt) {
      var info = G.countAliveBlocks();
      var hp = info.alive + '/' + info.total;
      var k = '' + state.kills;
      var t = '' + Math.floor(state.gameTime / 1000);
      var w = '' + state.wave;

      if (last.hp !== hp)    { els.hp.textContent = hp;    last.hp = hp; }
      if (last.kills !== k)  { els.kills.textContent = k;  last.kills = k; }
      if (last.time !== t)   { els.time.textContent = t;   last.time = t; }
      if (last.wave !== w)   { els.wave.textContent = w;   last.wave = w; }

      // 砲管 HP 五格
      var bhp = state.barrelHP;
      if (last.bhp !== bhp) {
        last.bhp = bhp;
        for (var i = 0; i < hpCells.length; i++) {
          if (i < bhp) {
            hpCells[i].className = bhp <= 1 ? 'hp-cell crit' : bhp <= 2 ? 'hp-cell warn' : 'hp-cell';
          } else {
            hpCells[i].className = 'hp-cell empty';
          }
        }
      }

      // 小兵數量（卡片顯示/隱藏）
      if (G.countAliveSoldiers) {
        var sc = G.countAliveSoldiers();
        var total = sc.repair + sc.speed + sc.shotgun;
        var card = document.getElementById('soldier-card');
        if (total > 0) {
          card.style.display = '';
          var st = '';
          if (sc.repair) st += '<span style="color:#5a5">修' + sc.repair + '</span> ';
          if (sc.speed)  st += '<span style="color:#5af">速' + sc.speed + '</span> ';
          if (sc.shotgun) st += '<span style="color:#fa5">彈' + sc.shotgun + '</span>';
          if (last.sol !== st) { els.soldiers.innerHTML = st; last.sol = st; }
        } else {
          card.style.display = 'none';
        }
      }
    },

    draw: function(ctx) {
      if (state.gameState !== 'playing') return;

      // 準心
      if (G.isBarrelAlive()) {
        ctx.strokeStyle = 'rgba(0,255,0,.6)';
        ctx.lineWidth = 1;
        var cx = Math.floor(state.mouseX);
        var cy = Math.floor(state.mouseY);

        ctx.beginPath();
        ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy);
        ctx.moveTo(cx + 4, cy);  ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
        ctx.moveTo(cx, cy + 4);  ctx.lineTo(cx, cy + 10);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0,255,0,.8)';
        ctx.fillRect(cx, cy, 1, 1);
      }

      // 砲管摧毀警告
      if (!G.isBarrelAlive()) {
        ctx.fillStyle = 'rgba(255,0,0,.15)';
        ctx.fillRect(0, 0, CFG.W, CFG.H);
        ctx.fillStyle = '#f44';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('砲管被摧毀！', CFG.W / 2, 80);
      }
    },
  };
})(Game);
