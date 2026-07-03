(function (root) {
  'use strict';
  var YL = root.YL = root.YL || {};

  function AudioBus(platform) {
    this.platform = platform;
    this.enabled = true;
    this.ctx = null;
  }
  AudioBus.prototype.unlock = function () {
    if (this.platform !== 'web' || this.ctx) return;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (AC) this.ctx = new AC();
  };
  AudioBus.prototype.tone = function (type) {
    if (!this.enabled || !this.ctx) return;
    var t = this.ctx.currentTime;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    var f = type === 'hit' ? 180 : type === 'bell' ? 520 : type === 'win' ? 720 : type === 'hurt' ? 95 : 300;
    o.type = type === 'bell' ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(f, t);
    if (type === 'shoot') o.frequency.exponentialRampToValueAtTime(190, t + 0.08);
    if (type === 'win') o.frequency.exponentialRampToValueAtTime(1050, t + 0.22);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(type === 'bell' ? 0.08 : 0.045, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (type === 'bell' ? 0.5 : 0.16));
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.55);
  };
  YL.AudioBus = AudioBus;
}(typeof globalThis !== 'undefined' ? globalThis : this));
