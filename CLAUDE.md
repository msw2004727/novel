# 防空保衛戰 - Air Defense

HTML5 Canvas 塔防遊戲。玩家控制砲台攔截導彈、飛艇炸彈、怪獸火焰。砲管 HP 歸零或砲台方塊全毀則 Game Over。

## 架構

IIFE + 全域命名空間 `Game` 插件式架構，支援 `file://` 直接開啟。

```
index.html                  → 入口 HTML + script 標籤
barrel_defender.html        → 原始單檔版（備份）
css/style.css               → 所有樣式
js/
  config.js                 → 遊戲常數 (Game.CFG)
  state.js                  → 全域可變狀態 (Game.state)
  main.js                   → 插件註冊、暱稱、排行榜、暫停
  core/
    engine.js               → 插件引擎（update 按註冊序，draw 按 drawOrder）
    canvas.js               → Canvas 初始化與縮放
    input.js                → 滑鼠/觸控/手勢鎖定
    audio.js                → Web Audio 音效
  plugins/
    background.js           → drawOrder:0  日夜循環、星空、月亮/太陽、飛鳥、城市
    airship.js              → drawOrder:5  飛艇系統（方塊組裝、投彈、擊落）
    kaiju.js                → drawOrder:8  怪獸系統（方塊恐龍、吐火、頭部弱點）
    terrain.js              → drawOrder:10 地形破壞系統
    turret.js               → drawOrder:20 砲台方塊 + 砲管 HP + 重力崩塌
    airdrop.js              → drawOrder:25 空投/地面增援、三兵種、搭橋、難度系統
    bullet.js               → drawOrder:30 子彈（含加速/散彈增益）
    missile.js              → drawOrder:35 導彈/炸彈/火焰
    effects.js              → drawOrder:40 粒子、爆炸、螢幕震動
    collision.js            → 無繪製      所有碰撞偵測 + Game Over
    wave.js                 → 無繪製      波次計時
    hud.js                  → drawOrder:50 HUD 卡片、砲管 HP 條、準心
    slider.js               → 無繪製      觸控瞄準拖曳條
```

## 插件介面

```js
;(function(G) {
  'use strict';
  G.plugins.myPlugin = {
    name: 'myPlugin',
    drawOrder: 0,
    init: function() {},
    update: function(dt) {},
    draw: function(ctx, now) {},
  };
})(Game);
```

## 新增插件步驟

1. `js/plugins/` 建檔，IIFE 掛到 `Game.plugins.xxx`
2. `index.html` 加 `<script>` 標籤（注意依賴順序）
3. `main.js` 的 `registerAll` 陣列加入
4. 新狀態加到 `state.js` 並在 `resetState()` 重置

## 關鍵 API

| API | 來源 | 用途 |
|-----|------|------|
| `Game.CFG` | config.js | 所有遊戲常數 |
| `Game.state` | state.js | 全部可變狀態 |
| `Game.resetState()` | state.js | 重置狀態 |
| `Game.playSound(type)` | audio.js | 播放音效 |
| `Game.isBarrelAlive()` | turret.js | 砲管 HP > 0 |
| `Game.createExplosion(x,y)` | effects.js | 爆炸 + 破壞 |
| `Game.checkAirshipHit(x,y)` | airship.js | 子彈碰飛艇 |
| `Game.checkKaijuHit(x,y)` | kaiju.js | 子彈碰怪獸 |
| `Game.getDifficultyBonus()` | airdrop.js | 小兵數量難度加成 |
| `Game.countBoostingSoldiers(type)` | airdrop.js | 增益中兵種數 |
| `Game.countAliveSoldiers()` | airdrop.js | 各兵種存活數 |
| `Game.saveScore()` | main.js | 儲存分數到 localStorage + jsonbin |

## 遊戲系統

### 動態難度
- 每 10 個存活小兵 = 導彈/飛艇/怪獸 +10% 強度
- 小兵死亡即時降低難度
- 小兵上限 100

### 導彈類型 (state.missiles)
- 無 type：一般拋物線導彈（受重力）
- `type:'bomb'`：飛艇投下的炸彈（受重力，灰色煙軌）
- `type:'flame'`：怪獸火焰（不受重力，橘色火軌）

### 排行榜
- localStorage 本地 + jsonbin.io 雲端雙寫
- 顯示時優先雲端，失敗回退本地

## 規範

- 全域變數：`Game`、`window.startGame`、`window.togglePause`、`window.showLeaderboard`
- 常數全大寫底線、函式 camelCase、檔案小寫英文
- 手勢鎖定：縮放/長按/選取/右鍵全鎖（Safari/Chrome/LINE）
- 實體陣列一律存 `Game.state`
- 繪製接收 `ctx`，更新接收 `dt`（毫秒差值，已夾限 50ms）
