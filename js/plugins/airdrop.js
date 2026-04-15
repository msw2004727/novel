;(function(G) {
  'use strict';
  var CFG = G.CFG;
  var state = G.state;
  var TCOLS = G.TERRAIN_COLS;

  var DROP_INTERVAL_MIN = 15000;
  var DROP_INTERVAL_MAX = 30000;
  var DROP_SPEED = 0.4;
  var CARGO_FALL_SPEED = 3;
  var SOLDIER_SPEED = 0.6;
  var REPAIR_TIME = 1200;
  var BRIDGE_TIME = 800;


  // 三種兵種外觀
  var TYPE_COLORS = {
    repair:  { hat: '#ff0', body: '#5a5', label: '修' },
    speed:   { hat: '#0ff', body: '#55a', label: '速' },
    shotgun: { hat: '#fa0', body: '#a55', label: '彈' },
  };

  function findRepairTarget() {
    for (var hp = 0; hp <= 2; hp++) {
      for (var r = CFG.TB_ROWS - 1; r >= 0; r--) {
        if (!state.turretBlocks[r]) continue;
        for (var c = 0; c < CFG.TB_COLS; c++) {
          var b = state.turretBlocks[r][c];
          if (b.type !== 'empty' && b.hp === hp) return { r: r, c: c };
        }
      }
    }
    return null;
  }

  // 前方地面是否有凹陷
  function hasGapAhead(x, dir) {
    var col = Math.floor((x + dir * (CFG.TILE_SIZE * 0.6)) / CFG.TILE_SIZE);
    if (col < 0 || col >= TCOLS) return -1;
    if (state.terrain[0] && state.terrain[0][col] <= 0) return col;
    return -1;
  }

  function killSoldier(s) {
    s.state = 'dead';
    s.deadTimer = 40;
    var colors = ['#f00', '#c00', '#900', '#f44'];
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1 + Math.random() * 3;
      state.particles.push({
        x: s.x, y: s.y - 6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        life: 25 + Math.random() * 20, maxLife: 45,
        color: colors[Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 2,
      });
    }
  }

  G.damageSoldiersInRadius = function(wx, wy, radius) {
    var r2 = radius * radius;
    for (var i = 0; i < state.soldiers.length; i++) {
      var s = state.soldiers[i];
      if (s.state === 'dead') continue;
      var dx = s.x - wx, dy = s.y - wy;
      if (dx * dx + dy * dy < r2) killSoldier(s);
    }
  };

  // 計算正在增益中的小兵數
  G.countBoostingSoldiers = function(type) {
    var count = 0;
    for (var i = 0; i < state.soldiers.length; i++) {
      var s = state.soldiers[i];
      if (s.type === type && s.state === 'boosting') count++;
    }
    return count;
  };

  // 計算各兵種存活數（非 dead / walking_away）
  G.countAliveSoldiers = function() {
    var r = 0, sp = 0, sh = 0;
    for (var i = 0; i < state.soldiers.length; i++) {
      var s = state.soldiers[i];
      if (s.state === 'dead') continue;
      if (s.type === 'repair') r++;
      else if (s.type === 'speed') sp++;
      else if (s.type === 'shotgun') sh++;
    }
    return { repair: r, speed: sp, shotgun: sh };
  };

  // 小兵總數上限
  var SOLDIER_CAP = 100;

  function totalSoldierCount() {
    var sc = G.countAliveSoldiers();
    return sc.repair + sc.speed + sc.shotgun;
  }

  // 難度加成：每 10 個小兵 +10%（小兵死亡會降回）
  G.getDifficultyBonus = function() {
    return Math.floor(totalSoldierCount() / 10) * 0.1;
  };

  function nextInterval() {
    return DROP_INTERVAL_MIN + Math.random() * (DROP_INTERVAL_MAX - DROP_INTERVAL_MIN);
  }

  function pickType() {
    var r = Math.random();
    if (r < 0.4) return 'repair';
    if (r < 0.7) return 'speed';
    return 'shotgun';
  }

  G.plugins.airdrop = {
    name: 'airdrop',
    drawOrder: 25,

    init: function() {
      state.airdrops = [];
      state.soldiers = [];
      state.lastAirdropTime = 0;
      state.nextAirdropInterval = nextInterval();
    },

    update: function(dt) {
      var now = performance.now();
      var i, j, s, ad, pos, tb, col;

      // === 地面增援（受上限控制）===
      state.groundSoldierTimer += dt;
      if (state.groundSoldierTimer >= 25000 && totalSoldierCount() < SOLDIER_CAP) {
        state.groundSoldierTimer = Math.random() * -5000;
        var gCount = Math.min(1 + Math.floor(Math.random() * 2), SOLDIER_CAP - totalSoldierCount());
        for (var gi = 0; gi < gCount; gi++) {
          var gLeft = Math.random() < 0.5;
          state.soldiers.push({
            x: gLeft ? -10 : CFG.W + 10,
            y: CFG.GROUND_Y,
            type: pickType(),
            state: 'walking_to',
            targetX: state.turretX,
            direction: gLeft ? 1 : -1,
            repairTarget: null, repairTimer: 0,
            bridgeCol: -1, bridgeTimer: 0,
            boostTimer: 0, deadTimer: 0, walkFrame: 0,
          });
        }
      }

      // === 空投生成 ===
      if (now - state.lastAirdropTime >= state.nextAirdropInterval && totalSoldierCount() < SOLDIER_CAP) {
        state.lastAirdropTime = now;
        state.nextAirdropInterval = nextInterval();
        state.airdrops.push({
          x: 60 + Math.random() * (CFG.W - 120),
          y: -30, vy: DROP_SPEED,
          alive: true, falling: false,
          swayPhase: Math.random() * Math.PI * 2,
          type: pickType(),
        });
      }

      // === 更新空投 ===
      for (i = state.airdrops.length - 1; i >= 0; i--) {
        ad = state.airdrops[i];
        if (ad.falling) { ad.vy = CARGO_FALL_SPEED; }
        else { ad.swayPhase += 0.03; ad.x += Math.sin(ad.swayPhase) * 0.3; }
        ad.y += ad.vy;

        if (ad.y >= CFG.GROUND_Y - 8) {
          if (totalSoldierCount() < SOLDIER_CAP) state.soldiers.push({
            x: ad.x, y: CFG.GROUND_Y,
            type: ad.type,
            state: 'walking_to',
            targetX: state.turretX,
            direction: ad.x < state.turretX ? 1 : -1,
            repairTarget: null, repairTimer: 0,
            bridgeCol: -1, bridgeTimer: 0,
            boostTimer: 0,
            deadTimer: 0, walkFrame: 0,
          });
          for (j = 0; j < 6; j++) {
            state.particles.push({
              x: ad.x, y: CFG.GROUND_Y,
              vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2 - 0.5,
              life: 15 + Math.random() * 10, maxLife: 25,
              color: TYPE_COLORS[ad.type].body, size: 2,
            });
          }
          state.airdrops.splice(i, 1); continue;
        }
        if (ad.y > CFG.H + 40) state.airdrops.splice(i, 1);
      }

      // === 更新士兵 ===
      for (i = state.soldiers.length - 1; i >= 0; i--) {
        s = state.soldiers[i];
        s.walkFrame += dt * 0.005;

        if (s.state === 'dead') {
          s.deadTimer--;
          if (s.deadTimer <= 0) state.soldiers.splice(i, 1);
          continue;
        }

        // --- 走向砲台 ---
        if (s.state === 'walking_to') {
          var dx = s.targetX - s.x;
          s.direction = dx > 0 ? 1 : -1;

          if (Math.abs(dx) > 5) {
            // 偵測前方地面凹陷
            col = hasGapAhead(s.x, s.direction);
            if (col >= 0) {
              s.state = 'bridging';
              s.bridgeCol = col;
              s.bridgeTimer = 0;
            } else {
              s.x += s.direction * SOLDIER_SPEED;
            }
          } else {
            // 到達砲台
            if (s.type === 'repair') {
              s.repairTarget = findRepairTarget();
              if (s.repairTarget) { s.state = 'repairing'; s.repairTimer = 0; }
              else { s.state = 'idle'; }
            } else {
              s.state = 'boosting';
            }
          }
        }

        // --- 搭橋 ---
        else if (s.state === 'bridging') {
          s.bridgeTimer += dt;

          // 搭橋粒子
          if (Math.random() < 0.12) {
            var bx = s.bridgeCol * CFG.TILE_SIZE + CFG.TILE_SIZE / 2;
            var by = CFG.GROUND_Y + CFG.TILE_SIZE / 2;
            state.particles.push({
              x: bx + (Math.random() - 0.5) * 8, y: by,
              vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2 - 0.5,
              life: 10 + Math.random() * 8, maxLife: 18,
              color: '#a85', size: 1 + Math.random(),
            });
          }

          if (s.bridgeTimer >= BRIDGE_TIME) {
            // 修復地面表層
            if (state.terrain[0]) state.terrain[0][s.bridgeCol] = 3;

            var fx = s.bridgeCol * CFG.TILE_SIZE + CFG.TILE_SIZE / 2;
            var fy = CFG.GROUND_Y + CFG.TILE_SIZE / 2;
            for (j = 0; j < 3; j++) {
              state.particles.push({
                x: fx, y: fy,
                vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5,
                life: 8 + Math.random() * 6, maxLife: 14,
                color: '#4a4', size: 2,
              });
            }

            // 踏上修好的格子，檢查下一格
            s.x = (s.bridgeCol + 0.5) * CFG.TILE_SIZE;
            var nextCol = s.bridgeCol + s.direction;
            if (nextCol >= 0 && nextCol < TCOLS && state.terrain[0] && state.terrain[0][nextCol] <= 0) {
              s.bridgeCol = nextCol;
              s.bridgeTimer = 0;
            } else {
              s.state = 'walking_to';
            }
          }
        }

        // --- 修復砲台（修理兵）---
        else if (s.state === 'repairing') {
          s.repairTimer += dt;

          if (Math.random() < 0.1) {
            pos = G.getTurretBlockWorld(s.repairTarget.r, s.repairTarget.c);
            state.particles.push({
              x: pos.x + CFG.TB_SIZE / 2 + (Math.random() - 0.5) * 8,
              y: pos.y + CFG.TB_SIZE / 2 + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5,
              life: 8 + Math.random() * 8, maxLife: 16,
              color: '#ff0', size: 1 + Math.random(),
            });
          }

          if (s.repairTimer >= REPAIR_TIME) {
            tb = state.turretBlocks[s.repairTarget.r][s.repairTarget.c];
            tb.hp = 3;

            pos = G.getTurretBlockWorld(s.repairTarget.r, s.repairTarget.c);
            for (j = 0; j < 4; j++) {
              state.particles.push({
                x: pos.x + CFG.TB_SIZE / 2, y: pos.y + CFG.TB_SIZE / 2,
                vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                life: 10 + Math.random() * 10, maxLife: 20,
                color: '#0f0', size: 2,
              });
            }

            s.repairTarget = findRepairTarget();
            if (s.repairTarget) { s.repairTimer = 0; }
            else { s.state = 'idle'; }
          }
        }

        // --- 待命（修理完或無事可做）---
        else if (s.state === 'idle') {
          // 修理兵：持續偵測是否有新損壞
          if (s.type === 'repair') {
            s.repairTarget = findRepairTarget();
            if (s.repairTarget) { s.state = 'repairing'; s.repairTimer = 0; }
          }
        }

        // --- 增益駐留（加速兵 / 散彈兵）---
        else if (s.state === 'boosting') {
          // 增益粒子
          if (Math.random() < 0.04) {
            var pc = s.type === 'speed' ? '#0cf' : '#fa0';
            state.particles.push({
              x: s.x + (Math.random() - 0.5) * 10, y: s.y - 8,
              vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 1.2 - 0.3,
              life: 12 + Math.random() * 8, maxLife: 20,
              color: pc, size: 1 + Math.random(),
            });
          }
        }

        // --- 離場 ---
        else if (s.state === 'walking_away') {
          s.x += s.direction * SOLDIER_SPEED;
          if (s.x < -30 || s.x > CFG.W + 30) state.soldiers.splice(i, 1);
        }
      }
    },

    draw: function(ctx) {
      var i, ad, s, ax, ay, sx, sy, tc;

      // === 空投 ===
      for (i = 0; i < state.airdrops.length; i++) {
        ad = state.airdrops[i];
        ax = Math.floor(ad.x); ay = Math.floor(ad.y);
        tc = TYPE_COLORS[ad.type];

        if (!ad.falling) {
          ctx.fillStyle = '#eee';
          ctx.beginPath(); ctx.arc(ax, ay - 20, 16, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#c44';
          ctx.beginPath(); ctx.arc(ax, ay - 20, 16, Math.PI, Math.PI + 0.8); ctx.lineTo(ax, ay - 20); ctx.fill();
          ctx.beginPath(); ctx.arc(ax, ay - 20, 16, -0.8, 0); ctx.lineTo(ax, ay - 20); ctx.fill();
          ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax - 14, ay - 18); ctx.lineTo(ax - 4, ay);
          ctx.moveTo(ax + 14, ay - 18); ctx.lineTo(ax + 4, ay);
          ctx.moveTo(ax, ay - 20); ctx.lineTo(ax, ay);
          ctx.stroke();
        }

        // 貨箱（用兵種色）
        ctx.fillStyle = tc.body;
        ctx.fillRect(ax - 5, ay - 2, 10, 8);
        ctx.fillStyle = tc.hat;
        ctx.fillRect(ax - 1, ay, 2, 4);
        ctx.fillRect(ax - 3, ay + 1, 6, 2);
      }

      // === 士兵 ===
      for (i = 0; i < state.soldiers.length; i++) {
        s = state.soldiers[i];
        sx = Math.floor(s.x); sy = Math.floor(s.y);
        tc = TYPE_COLORS[s.type];

        if (s.state === 'dead') {
          ctx.globalAlpha = s.deadTimer / 40;
          ctx.fillStyle = '#800';
          ctx.fillRect(sx - 5, sy - 3, 10, 4);
          ctx.fillStyle = '#a00';
          ctx.fillRect(sx - 3, sy - 2, 6, 2);
          ctx.globalAlpha = 1;
          continue;
        }

        var walking = s.state === 'walking_to' || s.state === 'walking_away';
        var legOff = walking ? Math.floor(Math.sin(s.walkFrame * 4) * 2) : 0;

        if (s.state === 'bridging') {
          // 蹲下搭橋姿態
          var bob = Math.sin(s.walkFrame * 8) * 1;
          ctx.fillStyle = tc.hat;
          ctx.fillRect(sx - 4, sy - 11 + bob, 8, 3);
          ctx.fillStyle = '#da8';
          ctx.fillRect(sx - 3, sy - 8 + bob, 6, 3);
          ctx.fillStyle = tc.body;
          ctx.fillRect(sx - 4, sy - 5, 8, 3);
          ctx.fillStyle = '#333';
          ctx.fillRect(sx - 3, sy - 2, 2, 3);
          ctx.fillRect(sx + 1, sy - 2, 2, 3);
          // 鋤頭
          ctx.fillStyle = '#a85';
          ctx.fillRect(sx + 3 * s.direction, sy - 4 + bob, 2, 4);
          ctx.fillRect(sx + 2 * s.direction, sy - 5 + bob, 4, 1);
          continue;
        }

        // 通用站姿
        ctx.fillStyle = tc.hat;
        ctx.fillRect(sx - 4, sy - 14, 8, 3);
        ctx.fillStyle = '#da8';
        ctx.fillRect(sx - 3, sy - 11, 6, 4);
        ctx.fillStyle = tc.body;
        ctx.fillRect(sx - 4, sy - 7, 8, 5);
        ctx.fillStyle = '#333';
        ctx.fillRect(sx - 3, sy - 2, 2, 3 + legOff);
        ctx.fillRect(sx + 1, sy - 2, 2, 3 - legOff);

        // 兵種特殊配件
        if (s.state === 'repairing') {
          var rb = Math.sin(s.walkFrame * 6) * 2;
          ctx.fillStyle = '#aaa';
          ctx.fillRect(sx + 4 * s.direction, sy - 9 + rb, 3, 1);
          ctx.fillRect(sx + 5 * s.direction, sy - 10 + rb, 1, 3);
        }
        else if (s.state === 'boosting' && s.type === 'speed') {
          // 閃電符號
          ctx.fillStyle = '#0ff';
          ctx.fillRect(sx - 1, sy - 17, 2, 3);
          ctx.fillRect(sx - 2, sy - 15, 2, 1);
          ctx.fillRect(sx, sy - 14, 2, 2);
        }
        else if (s.state === 'boosting' && s.type === 'shotgun') {
          // 彈藥帶
          ctx.fillStyle = '#fa0';
          ctx.fillRect(sx - 5, sy - 6, 10, 1);
          ctx.fillStyle = '#c80';
          for (var b = -4; b <= 3; b += 2) {
            ctx.fillRect(sx + b, sy - 7, 1, 2);
          }
        }
      }
    },
  };
})(Game);
