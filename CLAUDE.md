# 砲管守護者 - Barrel Defender

HTML5 Canvas 砲台防禦遊戲。玩家控制砲台攔截拋物線導彈，砲台由方塊組成，可被炸毀崩塌，砲管全毀則 Game Over。

## 架構

採用 IIFE + 全域命名空間 `Game` 的插件式架構，支援 `file://` 直接開啟。

```
index.html                  → 入口（僅 HTML 結構 + script 標籤）
barrel_defender.html        → 原始單檔版（備份）
css/style.css               → 所有樣式
js/
  config.js                 → 遊戲常數 (Game.CFG)
  state.js                  → 全域可變狀態 (Game.state)
  main.js                   → 註冊插件、啟動引擎、startGame()
  core/
    engine.js               → 插件引擎：生命週期 init/update/draw
    canvas.js               → Canvas 初始化與自適應縮放
    input.js                → 滑鼠/觸控輸入
    audio.js                → Web Audio 音效
  plugins/
    background.js           → drawOrder:0  星空、城市剪影
    terrain.js              → drawOrder:10 地形格狀系統
    turret.js               → drawOrder:20 砲台方塊 + 砲管 + 重力崩塌
    bullet.js               → drawOrder:30 子彈發射與飛行
    missile.js              → drawOrder:35 導彈生成與拋物線
    effects.js              → drawOrder:40 粒子、爆炸、螢幕震動
    collision.js            → 無繪製      碰撞偵測 + Game Over 判定
    wave.js                 → 無繪製      波次計時與遞增
    hud.js                  → drawOrder:50 準心、HUD 數值、警告
```

## 插件介面

```js
;(function(G) {
  'use strict';
  G.plugins.myPlugin = {
    name: 'myPlugin',
    drawOrder: 0,                    // 繪製層序
    init: function() {},             // 遊戲開始/重置
    update: function(dt) {},         // 每幀邏輯（僅 playing 狀態）
    draw: function(ctx, now) {},     // 每幀繪製（依 drawOrder 排序）
  };
})(Game);
```

- 公開 API 掛 `Game.*`（如 `Game.playSound`、`Game.createExplosion`）
- 私有邏輯留在 IIFE 閉包內
- `main.js` 的 `registerAll` 順序決定 update 執行順序

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
| `Game.playSound(type)` | audio.js | 播放音效 (shoot/explode/hit/turret_hit) |
| `Game.isBarrelAlive()` | turret.js | 砲管是否存活 |
| `Game.getBarrelOrigin()` | turret.js | 砲管原點座標 |
| `Game.destroyTerrain(x,y,r)` | terrain.js | 爆炸破壞地形 |
| `Game.destroyTurretBlocks(x,y,r)` | turret.js | 爆炸破壞砲台 |
| `Game.createExplosion(x,y)` | effects.js | 建立爆炸（含粒子+破壞） |
| `Game.checkTerrainHit(x,y)` | terrain.js | 檢查地形碰撞 |
| `Game.checkTurretHit(x,y)` | turret.js | 檢查砲台碰撞 |
| `Game.countAliveBlocks()` | turret.js | 回傳 {alive, total} |

## 規範

- 唯一全域變數：`Game` 和 `window.startGame`
- 常數全大寫底線、函式 camelCase、檔案小寫英文、CSS kebab-case
- 修改前先讀檔，不加非必要功能，不改未動的程式碼
- 實體陣列（bullets/missiles/particles/explosions）一律存 `Game.state`
- 繪製函式接收 `ctx`，更新函式接收 `dt`（毫秒差值）
