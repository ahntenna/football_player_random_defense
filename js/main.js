/*
 * 부트스트랩 · 게임 루프
 * - 고정 스텝(1/60초) 시뮬레이션 + requestAnimationFrame 렌더링 (배속은 스텝 수로 처리)
 * - 탭이 숨겨지면 rAF 가 멈추고, 복귀 시 누적 시간을 버려 순간 폭주를 막는다.
 * - 자동 품질: 평균 프레임 시간이 길어지면 렌더 품질을 단계적으로 낮춘다.
 */
(function (root) {
  'use strict';
  var F = root.FPRD, C = F.C;
  var STEP = 1 / 60, MAX_STEPS = 12;

  var app = {
    screen: 'title',
    meta: F.normalizeMeta(F.Store.loadMeta()),
    audio: new F.Audio(),
    game: null, renderer: null, titleRenderer: null, ui: null,
    _metaTimer: 0
  };

  function emit(type, a, b, c, d, e) {
    var r = app.renderer;
    switch (type) {
      case 'attack': r.onAttack(a, b, c, d, e); app.audio.kick(); return;
      case 'hit': r.onHit(a, b, c, d); return;
      case 'kill': r.onKill(a); return;
      case 'proc': r.onProc(a, b, c, d); app.audio.proc(b.tier); return;
      case 'passive': r.onPassive(a, b); return;
      case 'burst': r.onBurst(a, b, c, d); return;
      case 'zone': r.onZone(a, b, c, d); return;
      case 'bounce': r.onBounce(a, b, c); return;
    }
    if (app.ui) app.ui.onEvent(type, a, b, c, d);
    if (type === 'achievement' || type === 'unlock') app.saveMeta();
  }

  app.game = new F.Game(app.meta, emit);

  app.hasRun = function () { return !!F.Store.runInfo(); };

  app.saveMeta = function () {
    clearTimeout(app._metaTimer);
    app._metaTimer = setTimeout(function () { F.Store.saveMeta(app.meta); }, 250);
  };
  app.saveRun = function () {
    if (app.game.s && app.game.active()) F.Store.saveRun(app.game.serialize());
  };

  app.applyOptions = function () {
    var o = app.meta.options;
    app.audio.setOptions({ master: o.master, bgm: o.bgm, sfx: o.sfx, mute: o.mute });
    app.renderer.dmgNumbers = !!o.dmgNumbers;
    app.renderer.setHighlight(o.unitHighlight !== false);
    var q = o.quality === 'auto' ? (app.autoQuality || 'high') : o.quality;
    if (app.renderer.quality !== q) app.renderer.setQuality(q);
  };

  function show(screen) {
    app.screen = screen;
    document.getElementById('title').classList.toggle('hidden', screen !== 'title');
    document.getElementById('game').classList.toggle('hidden', screen !== 'game');
    if (screen === 'game') { app.renderer.resize(true); app.audio.startAmbience(); }
    else { app.titleRenderer.resize(true); app.titleRenderer.drawBackground({ noSlots: true }); app.ui.renderTitle(); }
  }

  app.startGame = function (mode, difficulty) {
    app.audio.unlock();
    if (!app.game.start(mode, difficulty)) { app.ui.toast('무한 모드는 정규 40웨이브를 클리어하면 열려요.', 'err'); return; }
    F.Store.clearRun();
    app.renderer.setGame(app.game);
    show('game');
    app.ui.setSpeed(1); app.ui.togglePause(false);
    app.ui.dirty = true;
    app.ui.toast('선수를 영입하고 킥오프를 누르세요! (영입권 ' + app.game.s.tickets + '장 지급)', 'info');
    app.saveRun();
  };

  app.continueGame = function () {
    app.audio.unlock();
    var json = F.Store.loadRun();
    if (!json || !app.game.restore(json)) { F.Store.clearRun(); app.ui.toast('저장된 경기를 불러올 수 없어요.', 'err'); app.ui.renderTitle(); return; }
    app.renderer.setGame(app.game);
    show('game');
    app.ui.setSpeed(app.game.s.speed || 1); app.ui.togglePause(true);
    app.ui.toast('경기를 불러왔어요. Space 로 재개하세요.', 'info');
  };

  app.toTitle = function (save) {
    if (save) app.saveRun();
    app.saveMeta();
    app.ui.closeModal();
    show('title');
  };

  app.endGame = function () {
    app.game.addRanking();
    F.Store.clearRun();
    F.Store.saveMeta(app.meta);
    setTimeout(function () { app.ui.open('result'); }, 700);
  };

  app.resetData = function () {
    F.Store.resetAll();
    var fresh = F.defaultMeta();
    Object.keys(app.meta).forEach(function (k) { delete app.meta[k]; });
    Object.assign(app.meta, fresh);
    app.game.fx = app.game.computeRelicEffects();
    app.applyOptions();
    app.ui.toast('모든 데이터를 초기화했어요.', 'info');
    app.ui.renderTitle();
  };

  /* ───────── 부팅 ───────── */
  function boot() {
    app.renderer = new F.Renderer(document.getElementById('bgCanvas'), document.getElementById('fxCanvas'));
    app.renderer.setGame(app.game);
    app.titleRenderer = new F.Renderer(document.getElementById('titleBg'), document.getElementById('titleFx'));
    app.ui = new F.UI(app);
    app.applyOptions();

    F.loadPhotos(F.PLAYERS.map(function (p) { return p.id; }));
    F.onPhotoLoad(function (id) { app.renderer.invalidateUnit(id); });

    var ro = root.ResizeObserver ? new ResizeObserver(function () { if (app.screen === 'game') app.renderer.resize(); else app.titleRenderer.resize(); }) : null;
    if (ro) { ro.observe(document.getElementById('field')); ro.observe(document.getElementById('title')); }
    root.addEventListener('resize', function () { if (app.screen === 'game') app.renderer.resize(); else { app.titleRenderer.resize(); app.titleRenderer.drawBackground({ noSlots: true }); } });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { app.saveRun(); F.Store.saveMeta(app.meta); }
      last = performance.now(); acc = 0;
    });
    root.addEventListener('pagehide', function () { app.saveRun(); F.Store.saveMeta(app.meta); });
    document.addEventListener('pointerdown', function () { app.audio.unlock(); }, { once: true });

    show('title');
    app.titleRenderer.resize(true); app.titleRenderer.drawBackground({ noSlots: true });
    setInterval(function () { if (app.screen === 'game') app.saveRun(); }, 5000);
    requestAnimationFrame(frame);
  }

  /* ───────── 루프 ───────── */
  var last = performance.now(), acc = 0, perfSum = 0, perfN = 0, goodTime = 0;
  function frame(now) {
    var dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    if (app.screen === 'game') {
      var g = app.game, s = g.s;
      if (s && g.active() && !s.paused) {
        acc += dt * (s.speed || 1);
        var n = 0;
        while (acc >= STEP && n < MAX_STEPS) { g.step(STEP); acc -= STEP; n++; }
        if (n >= MAX_STEPS) acc = 0;
      } else acc = 0;
      app.renderer.draw(dt);
      app.ui.tick(dt);
      autoQuality(dt);
    }
    requestAnimationFrame(frame);
  }

  function autoQuality(dt) {
    if (app.meta.options.quality !== 'auto') return;
    perfSum += dt; perfN++;
    if (perfN < 90) return;
    var avg = perfSum / perfN; perfSum = 0; perfN = 0;
    var cur = app.autoQuality || 'high', next = cur;
    if (avg > 1 / 30) next = 'low';
    else if (avg > 1 / 45) next = cur === 'high' ? 'medium' : cur;
    else if (avg < 1 / 58) { goodTime += 1.5; if (goodTime > 12) { next = cur === 'low' ? 'medium' : 'high'; goodTime = 0; } }
    if (next !== cur) { app.autoQuality = next; app.applyOptions(); }
  }

  root.FPRD_APP = app;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
