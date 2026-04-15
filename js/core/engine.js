;(function(G) {
  'use strict';
  var state = G.state;

  function GameEngine() {
    this._updateOrder = [];  // 保持註冊順序
    this._drawOrder = [];    // 按 drawOrder 排序
    this._drawSorted = false;
  }

  GameEngine.prototype.register = function(plugin) {
    this._updateOrder.push(plugin);
    this._drawOrder.push(plugin);
    this._drawSorted = false;
  };

  GameEngine.prototype.registerAll = function(list) {
    for (var i = 0; i < list.length; i++) this.register(list[i]);
  };

  GameEngine.prototype.init = function() {
    for (var i = 0; i < this._updateOrder.length; i++) {
      if (this._updateOrder[i].init) this._updateOrder[i].init();
    }
  };

  // update 按註冊順序執行
  GameEngine.prototype.update = function(dt) {
    for (var i = 0; i < this._updateOrder.length; i++) {
      if (this._updateOrder[i].update) this._updateOrder[i].update(dt);
    }
  };

  // draw 按 drawOrder 排序執行
  GameEngine.prototype.draw = function(ctx, now) {
    if (!this._drawSorted) {
      this._drawOrder.sort(function(a, b) {
        return (a.drawOrder || 0) - (b.drawOrder || 0);
      });
      this._drawSorted = true;
    }
    for (var i = 0; i < this._drawOrder.length; i++) {
      if (this._drawOrder[i].draw) this._drawOrder[i].draw(ctx, now);
    }
  };

  GameEngine.prototype.start = function() {
    var self = this;
    function loop(now) {
      if (state.gameState === 'playing') {
        var dt = now - state.lastTime;
        state.lastTime = now;
        // 夾限 dt 防止首幀暴衝與切頁回來的大跳躍
        if (dt > 50) dt = 50;
        state.gameTime += dt;
        self.update(dt);
      }
      var ctx = state.ctx;
      ctx.save();
      ctx.translate(state.shakeX, state.shakeY);
      self.draw(ctx, now);
      ctx.restore();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };

  G.GameEngine = GameEngine;
})(Game);
