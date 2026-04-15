;(function(G) {
  'use strict';
  var state = G.state;
  var engine = new G.GameEngine();
  var LS_NAME = 'barrel_defender_name';
  var LS_SCORES = 'barrel_defender_scores';

  engine.registerAll([
    G.plugins.background,
    G.plugins.terrain,
    G.plugins.turret,
    G.plugins.bullet,
    G.plugins.missile,
    G.plugins.wave,
    G.plugins.collision,
    G.plugins.effects,
    G.plugins.hud,
    G.plugins.airdrop,
    G.plugins.airship,
    G.plugins.slider,
  ]);

  // 預填暱稱
  var nameInput = document.getElementById('player-name');
  nameInput.value = localStorage.getItem(LS_NAME) || '';

  // 開始遊戲
  window.startGame = function() {
    var name = nameInput.value.trim();
    if (!name) { nameInput.focus(); nameInput.style.borderColor = '#f00'; return; }
    nameInput.style.borderColor = '';
    localStorage.setItem(LS_NAME, name);

    G.initAudio();
    G.resetState();
    state.lastTime = performance.now();
    engine.init();
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'none';
  };

  // 儲存分數（collision.js gameOver 呼叫）
  G.saveScore = function() {
    var name = localStorage.getItem(LS_NAME) || 'Player';
    var time = Math.floor(state.gameTime / 1000);
    var scores = JSON.parse(localStorage.getItem(LS_SCORES) || '[]');
    scores.push({ name: name, time: time, wave: state.wave, kills: state.kills });
    scores.sort(function(a, b) { return b.time - a.time; });
    scores = scores.slice(0, 10);
    localStorage.setItem(LS_SCORES, JSON.stringify(scores));
  };

  // 排行榜
  window.showLeaderboard = function() {
    var scores = JSON.parse(localStorage.getItem(LS_SCORES) || '[]');
    var html = '<table><tr><th>#</th><th>名稱</th><th>存活</th><th>波次</th><th>擊落</th></tr>';
    for (var i = 0; i < scores.length; i++) {
      var s = scores[i];
      html += '<tr><td>' + (i + 1) + '</td><td>' + s.name + '</td><td>' + s.time + 's</td><td>' + s.wave + '</td><td>' + s.kills + '</td></tr>';
    }
    if (!scores.length) html += '<tr><td colspan="5" style="text-align:center;color:#555">尚無紀錄</td></tr>';
    html += '</table>';
    document.getElementById('lb-content').innerHTML = html;
    document.getElementById('leaderboard-screen').style.display = 'flex';
  };

  window.hideLeaderboard = function() {
    document.getElementById('leaderboard-screen').style.display = 'none';
  };

  // 暫停
  window.togglePause = function() {
    if (state.gameState === 'playing') {
      state.gameState = 'paused';
      document.getElementById('pause-btn').textContent = '繼續';
    } else if (state.gameState === 'paused') {
      state.gameState = 'playing';
      state.lastTime = performance.now();
      document.getElementById('pause-btn').textContent = '暫停';
    }
  };

  G.initCanvas();
  G.initInput();
  engine.init();
  engine.start();
})(Game);
