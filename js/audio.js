/*
 * WebAudio 합성 사운드 (외부 파일 없음)
 * - 심판 휘슬, 킥, 영입 차임, 합성, 보스 호른, 관중 함성, 관중 앰비언스(BGM)
 * - 잦은 효과음은 초당 횟수를 제한해 오디오 노드 폭주를 막는다.
 */
(function (root) {
  'use strict';
  var F = root.FPRD = root.FPRD || {};

  function Audio() {
    this.ctx = null; this.master = null; this.sfxBus = null; this.bgmBus = null;
    this.opts = { master: 0.7, bgm: 0.35, sfx: 0.6, mute: false };
    this.noiseBuf = null; this.amb = null; this.last = {};
  }
  var A = Audio.prototype;

  A.unlock = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return;
    var c = this.ctx = new AC();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.bgmBus = c.createGain(); this.bgmBus.connect(this.master);
    var len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // 브라운 노이즈
    this.noiseBuf = buf;
    this.apply();
  };

  A.setOptions = function (o) { Object.assign(this.opts, o); this.apply(); };
  A.apply = function () {
    if (!this.ctx) return;
    var o = this.opts, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(o.mute ? 0 : o.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(o.sfx, t, 0.05);
    this.bgmBus.gain.setTargetAtTime(o.bgm, t, 0.2);
  };

  A.ok = function (key, gap) {
    if (!this.ctx || this.opts.mute) return false;
    var now = this.ctx.currentTime;
    if (key && this.last[key] && now - this.last[key] < gap) return false;
    if (key) this.last[key] = now;
    return true;
  };

  A.tone = function (freq, dur, type, vol, when, slideTo) {
    var c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  };

  A.noise = function (dur, freq, q, vol, when, bus) {
    var c = this.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + Math.min(0.2, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  };

  A.kick = function () {
    if (!this.ok('kick', 0.07)) return;
    this.tone(150, 0.09, 'sine', 0.22, 0, 60);
    this.noise(0.05, 2400, 1.2, 0.08);
  };
  A.whistle = function () {
    if (!this.ok('whistle', 0.5)) return;
    var c = this.ctx, t = c.currentTime;
    [0, 0.32].forEach(function (d, i) {
      var o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 120;
      lfo.connect(lg); lg.connect(o.frequency);
      var len = i ? 0.55 : 0.22;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.12, t + d + 0.02);
      g.gain.setValueAtTime(0.12, t + d + len - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
      o.connect(g); g.connect(this.sfxBus); o.start(t + d); lfo.start(t + d); o.stop(t + d + len + 0.02); lfo.stop(t + d + len + 0.02);
    }, this);
  };
  A.summon = function (tier) {
    if (!this.ok('summon' + (tier >= 4 ? 'hi' : ''), 0.06)) return;
    var base = [523, 587, 659, 784, 880, 988, 1175, 1319, 1568][Math.min(8, tier)];
    this.tone(base, 0.18, 'triangle', 0.14);
    if (tier >= 3) this.tone(base * 1.5, 0.28, 'triangle', 0.12, 0.08);
    if (tier >= 4) { this.tone(base * 2, 0.4, 'sine', 0.12, 0.16); this.cheer(0.6); }
    if (tier >= 6) { this.tone(base * 2.5, 0.6, 'sine', 0.1, 0.26); this.tone(base * 3, 0.8, 'sine', 0.08, 0.36); }
  };
  A.merge = function () { if (!this.ok('merge', 0.1)) return; this.tone(330, 0.25, 'sawtooth', 0.06, 0, 990); this.tone(660, 0.3, 'triangle', 0.1, 0.12); };
  A.coin = function () { if (!this.ok('coin', 0.08)) return; this.tone(988, 0.08, 'square', 0.05); this.tone(1319, 0.14, 'square', 0.05, 0.07); };
  A.proc = function (tier) { if (!this.ok('proc', 0.12)) return; this.tone(tier >= 7 ? 440 : 660, 0.22, 'triangle', 0.09, 0, tier >= 7 ? 1760 : 1320); };
  A.boss = function () {
    if (!this.ok('boss', 1)) return;
    [0, 0.35, 0.7].forEach(function (d) { this.tone(110, 0.3, 'sawtooth', 0.12, d, 98); this.tone(165, 0.3, 'sawtooth', 0.08, d, 147); }, this);
  };
  A.cheer = function (vol) {
    if (!this.ok('cheer', 0.8)) return;
    this.noise(1.8, 900, 0.6, (vol || 1) * 0.35);
    this.noise(1.4, 1800, 0.8, (vol || 1) * 0.18, 0.1);
  };
  A.ui = function () { if (!this.ok('ui', 0.04)) return; this.tone(880, 0.05, 'triangle', 0.06); };
  A.error = function () { if (!this.ok('err', 0.2)) return; this.tone(180, 0.18, 'square', 0.07, 0, 120); };
  A.lose = function () { if (!this.ok('lose', 1)) return; [0, 0.25, 0.5].forEach(function (d, i) { this.tone([392, 330, 262][i], 0.35, 'triangle', 0.12, d); }, this); };
  A.win = function () { if (!this.ok('win', 1)) return; [0, 0.15, 0.3, 0.5].forEach(function (d, i) { this.tone([523, 659, 784, 1047][i], 0.4, 'triangle', 0.13, d); }, this); this.cheer(1); };

  // 관중 앰비언스 (BGM 대용)
  A.startAmbience = function () {
    if (!this.ctx || this.amb) return;
    var c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.5;
    g.gain.value = 0.22; lfo.frequency.value = 0.09; lg.gain.value = 0.08; lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(this.bgmBus); s.start(); lfo.start();
    this.amb = { s: s, lfo: lfo };
  };
  A.stopAmbience = function () { if (this.amb) { try { this.amb.s.stop(); this.amb.lfo.stop(); } catch (e) {} this.amb = null; } };

  F.Audio = Audio;
})(window);
