;(function(G) {
  'use strict';
  var state = G.state;
  var engine = new G.GameEngine();
  var LS_NAME = 'barrel_defender_name';
  var LS_SCORES = 'barrel_defender_scores';

  // === jsonbin.io 全域排行榜 ===
  var BIN_ID = '';  // 填入 Bin ID 即啟用雲端排行榜
  var BIN_KEY = '$2a$10$WsneQUpBgEHrv6mb/Qoj4.CDbyyCNvdcV23VIg35yTEDVtNAD5ZPS';
  var BIN_URL = BIN_ID ? 'https://api.jsonbin.io/v3/b/' + BIN_ID : '';

  function cloudGet(cb) {
    if (!BIN_URL) return cb(null);
    fetch(BIN_URL + '/latest', { headers: { 'X-Access-Key': BIN_KEY } })
      .then(function(r) { return r.json(); })
      .then(function(d) { cb(d.record && d.record.scores ? d.record.scores : []); })
      .catch(function() { cb(null); });
  }

  function cloudPut(scores) {
    if (!BIN_URL) return;
    fetch(BIN_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Access-Key': BIN_KEY },
      body: JSON.stringify({ scores: scores }),
    }).catch(function() {});
  }

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

  var nameInput = document.getElementById('player-name');
  nameInput.value = localStorage.getItem(LS_NAME) || '';

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

  // 儲存分數：雲端 + 本地雙寫
  G.saveScore = function() {
    var name = localStorage.getItem(LS_NAME) || 'Player';
    var time = Math.floor(state.gameTime / 1000);
    var entry = { name: name, time: time, wave: state.wave, kills: state.kills };

    // 本地
    var local = JSON.parse(localStorage.getItem(LS_SCORES) || '[]');
    local.push(entry);
    local.sort(function(a, b) { return b.time - a.time; });
    local = local.slice(0, 10);
    localStorage.setItem(LS_SCORES, JSON.stringify(local));

    // 雲端
    cloudGet(function(remote) {
      if (!remote) return;
      remote.push(entry);
      remote.sort(function(a, b) { return b.time - a.time; });
      remote = remote.slice(0, 10);
      cloudPut(remote);
    });
  };

  // 排行榜：優先顯示雲端，失敗回退本地
  window.showLeaderboard = function() {
    var el = document.getElementById('lb-content');
    el.innerHTML = '<p style="color:#555;text-align:center">載入中...</p>';
    document.getElementById('leaderboard-screen').style.display = 'flex';

    cloudGet(function(remote) {
      var scores = remote || JSON.parse(localStorage.getItem(LS_SCORES) || '[]');
      var src = remote ? '雲端' : '本機';
      var html = '<table><tr><th>#</th><th>名稱</th><th>存活</th><th>波次</th><th>擊落</th></tr>';
      for (var i = 0; i < scores.length; i++) {
        var s = scores[i];
        html += '<tr><td>' + (i + 1) + '</td><td>' + s.name + '</td><td>' + s.time + 's</td><td>' + s.wave + '</td><td>' + s.kills + '</td></tr>';
      }
      if (!scores.length) html += '<tr><td colspan="5" style="text-align:center;color:#555">尚無紀錄</td></tr>';
      html += '</table>';
      html += '<p style="color:#444;font-size:10px;text-align:center;margin-top:6px">資料來源：' + src + '</p>';
      el.innerHTML = html;
    });
  };

  window.hideLeaderboard = function() {
    document.getElementById('leaderboard-screen').style.display = 'none';
  };

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
