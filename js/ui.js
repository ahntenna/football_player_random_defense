/*
 * UI 컨트롤러 — HUD · 패널 · 액션바 · 입력(드래그/단축키) · 모달 · 알림
 * 렌더링 부하를 줄이기 위해 DOM 은 더티 플래그 + 스로틀링(최대 10Hz)으로만 갱신한다.
 */
(function (root) {
  'use strict';
  var F = root.FPRD, C = F.C, BY_ID = F.BY_ID, GEO = F.GEO;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(n) { n = Math.max(0, Math.floor(n)); return n < 10 ? '0' + n : '' + n; }
  function mmss(t) { t = Math.max(0, Math.floor(t)); return pad2(t / 60) + ':' + pad2(t % 60); }
  function setText(node, v) { v = String(v); if (node && node._v !== v) { node._v = v; node.textContent = v; } }
  function setHTML(node, v) { if (node && node._h !== v) { node._h = v; node.innerHTML = v; return true; } return false; }
  function toggle(node, cls, on) { if (node && node.classList.contains(cls) !== !!on) node.classList.toggle(cls, !!on); }
  var fmt = C.fmt;

  // 히든은 무지개(프리즘)로 표시해 전설(금색)과 구분한다
  function tierTag(t) { var T = C.TIERS[t]; return '<span class="tier-tag' + (T.rainbow ? ' rb-bg' : '') + '" style="background:' + (T.rainbow ? C.RAINBOW_CSS : T.color) + '">' + T.name + '</span>'; }
  function tierText(t) { var T = C.TIERS[t]; return T.rainbow ? '<span class="rb-text">' + T.name + '</span>' : '<span style="color:' + T.color + '">' + T.name + '</span>'; }
  function styleChip(k) { var S = C.STYLES[k]; return '<span class="chip" style="border-color:' + S.color + '66;color:' + S.color + '">' + S.icon + ' ' + S.name + '</span>'; }
  function posChip(p) { var P = C.POSITIONS[p]; return '<span class="chip" style="color:' + P.color + '">' + P.short + ' · ' + P.name + '</span>'; }
  function pc(id, size, extra) {
    var T = C.TIERS[BY_ID[id].tier];
    var ring = T.rainbow ? '0 0 0 2px #ff5de8,0 0 0 4px rgba(94,216,255,.7),0 0 10px 3px rgba(141,255,122,.35)' : '0 0 0 2px ' + T.color;
    return '<canvas data-pid="' + id + '" data-size="' + size + '" style="box-shadow:' + ring + (extra || '') + '"></canvas>';
  }
  function skillText(sk) {
    var fx = sk.fx !== 'none' ? ' · ' + C.PROC_FX[sk.fx](sk.v) : '';
    return '공격 시 ' + Math.round(sk.chance * 100) + '% 확률 · ' + C.SHAPE_TEXT[sk.shape](sk) + ' 공격력 ' + Math.round(sk.mult * 100) + '% 피해' + fx;
  }
  function baseStats(def) {
    var role = C.ROLES[def.role], t = def.tier;
    return { damage: C.BASE_DAMAGE[t] * C.TIER_MULT[t] * role.power, rate: role.rate, range: role.range, crit: 0.08 + (def.style === 'finish' ? 0.15 : 0) + (def.passive && def.passive.key === 'critKing' ? def.passive.crit : 0) };
  }
  F.skillText = skillText;

  /* 캔버스 초상 채우기 (innerHTML 로 만든 <canvas data-pid>) */
  function hydrate(rootEl) {
    var list = rootEl.querySelectorAll('canvas[data-pid]'), dpr = Math.min(2, root.devicePixelRatio || 1);
    for (var i = 0; i < list.length; i++) paintPortrait(list[i], dpr);
  }
  function paintPortrait(c, dpr) {
    var size = +c.dataset.size, px = Math.round(size * (dpr || Math.min(2, root.devicePixelRatio || 1)));
    if (c.width !== px) { c.width = c.height = px; c.style.width = c.style.height = size + 'px'; }
    var g = c.getContext('2d'); g.clearRect(0, 0, px, px); g.drawImage(F.portrait(c.dataset.pid, px), 0, 0);
  }
  F.hydratePortraits = hydrate;

  /* ═════════════ UI ═════════════ */
  function UI(app) {
    this.app = app;
    this.dirty = true; this.hudClock = 0; this.panelClock = 0; this.profileClock = 0;
    this.selected = null; this.mode = 'normal';
    this.modalName = null; this.modalState = {};
    this.revealTimer = 0; this.bannerTimer = 0;
    this.pointer = null;
    this.els = {};
    ['hudWave', 'hudWaveMax', 'hudMode', 'hudEnemies', 'hudEnemyBar', 'hudRemain', 'hudTime', 'hudTimeLbl', 'hudBoss', 'hudBossTime',
      'waveCard', 'eventCard', 'squadCard', 'statCard', 'logCard', 'field', 'unitSheet', 'mTabLeftTxt', 'mTabRightTxt', 'mTabRight', 'missionCard', 'incidentCard', 'quickCraft', 'profileCard',
      'gold', 'tickets', 'summonCostLbl', 'mergeLbl', 'craftLbl', 'sellLbl', 'actSummon', 'actSummon10', 'actDesignated', 'actMerge', 'actCraft',
      'kickoff', 'kickoffTime', 'toasts', 'banner', 'reveal', 'pausedMask', 'btnPause', 'modal', 'modalTitle', 'modalBody'
    ].forEach(function (k) { this.els[k] = $(k); }, this);
    this.bindTitle(); this.bindGame(); this.bindModal(); this.bindKeys();
    var self = this;
    F.onPhotoLoad(function (id) {
      var list = document.querySelectorAll('canvas[data-pid="' + id + '"]');
      for (var i = 0; i < list.length; i++) paintPortrait(list[i]);
    });
  }
  var U = UI.prototype;
  U.game = function () { return this.app.game; };

  /* ───────── 타이틀 ───────── */
  U.bindTitle = function () {
    var self = this;
    $('modeSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      self.mode = b.dataset.mode;
      Array.prototype.forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
      self.app.audio.ui();
    });
    $('btnStart').addEventListener('click', function () {
      if (self.app.hasRun()) {
        self.confirm('새 경기 시작', '저장된 경기가 있어요. 새 경기를 시작하면 저장된 경기는 사라집니다.', '새 경기 시작', function () { self.app.startGame(self.mode, $('difficulty').value); });
      } else self.app.startGame(self.mode, $('difficulty').value);
    });
    $('btnContinue').addEventListener('click', function () { self.app.continueGame(); });
    document.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { self.app.audio.unlock(); self.app.audio.ui(); self.open(b.dataset.open); });
    });
  };

  U.renderTitle = function () {
    var meta = this.app.meta, info = F.Store.runInfo();
    toggle($('btnContinue'), 'hidden', !info);
    if (info) setText($('continueInfo'), (info.wave ? 'WAVE ' + info.wave : '킥오프 전') + ' · ' + (C.DIFFICULTIES[info.difficulty] || {}).name + (info.mode === 'infinite' ? ' · 무한' : '') + ' · ' + info.units + '명');
    var inf = $('modeInfinite');
    inf.disabled = !meta.infinite; inf.textContent = meta.infinite ? '무한 모드' : '무한 모드 🔒';
    if (!meta.infinite && this.mode === 'infinite') { this.mode = 'normal'; $('modeSeg').children[0].classList.add('on'); inf.classList.remove('on'); }
    var r = meta.records, got = meta.unlocked.length;
    setText($('gameVersion'), 'v' + F.VERSION);
    $('titleMeta').innerHTML = '<span>최고 웨이브 <b>' + r.wave + '</b></span><span>최고 점수 <b>' + fmt(r.score) + '</b></span><span>도감 <b>' + got + ' / ' + F.PLAYERS.length + '</b></span><span>트로피 토큰 <b>' + fmt(meta.relicCurrency) + '</b></span>' + (meta.infinite ? '' : '<span>정규 40웨이브 클리어 시 무한 모드 해금</span>');
    this.renderCollage();
  };

  U.renderCollage = function () {
    var box = $('titleCollage');
    var items = [
      // 히든 4인(무지개 링) + 태초 레전드 2인
      ['messi', 50, 44, 34], ['ronaldo', 20, 20, 21], ['pele', 80, 20, 21], ['maradona', 20, 72, 21], ['beckenbauer', 80, 72, 21],
      ['cruyff', 50, 88, 13], ['di_stefano', 50, 5, 13]
    ];
    var html = '<div class="collage">';
    items.forEach(function (it) {
      var def = BY_ID[it[0]], size = it[3], T = C.TIERS[def.tier];
      // 히든은 회전하는 무지개 링(.rb), 나머지는 등급 색 링
      html += '<div class="cring' + (T.rainbow ? ' rb' : '') + '" style="left:' + (it[1] - size / 2) + '%;top:' + (it[2] - size / 2) + '%;width:' + size + '%;height:' + size + '%;' + (T.rainbow ? '' : 'background:' + T.color) + '">' +
        '<canvas data-pid="' + it[0] + '" data-size="' + Math.round(size * 5.2) + '"></canvas></div>';
      html += '<div class="cap' + (T.rainbow ? ' rb-text' : '') + '" style="left:' + it[1] + '%;top:' + (it[2] + size / 2 + 1) + '%;' + (T.rainbow ? '' : 'color:' + T.color) + '">' + esc(def.name) + '</div>';
    });
    html += '</div>';
    box.innerHTML = html;
    var list = box.querySelectorAll('canvas');
    for (var i = 0; i < list.length; i++) { paintPortrait(list[i]); list[i].style.width = list[i].style.height = '100%'; }
  };

  /* ───────── 게임 화면 바인딩 ───────── */
  U.bindGame = function () {
    var self = this;
    document.querySelectorAll('.speed [data-speed]').forEach(function (b) {
      b.addEventListener('click', function () { self.setSpeed(+b.dataset.speed); });
    });
    $('btnPause').addEventListener('click', function () { self.togglePause(); });
    $('btnMenu').addEventListener('click', function () { self.open('menu'); });
    $('btnKickoff').addEventListener('click', function () { var g = self.game(); if (g.s) g.skipIntermission(); self.app.audio.ui(); });
    this.bindHoldSummon($('actSummon'), 1);
    this.bindHoldSummon($('actSummon10'), 10);
    $('actDesignated').addEventListener('click', function () { self.open('designated'); });
    $('actSell').addEventListener('click', function () { self.open('sell'); });
    $('actMerge').addEventListener('click', function () { self.doMergeAll(); });
    $('actUpgrade').addEventListener('click', function () { self.open('upgrade'); });
    $('actCraft').addEventListener('click', function () { self.open('craft'); });
    $('reveal').addEventListener('click', function () { this.classList.add('hidden'); });
    $('quickCraft').addEventListener('click', function (e) {
      var b = e.target.closest('[data-craft]'); if (!b) return;
      self.doCraft(b.dataset.craft);
    });
    ['profileCard', 'unitSheet'].forEach(function (id) {
      $(id).addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        self.handleAct(b.dataset.act, b.dataset);
      });
    });
    // 모바일: 배속 순환 버튼 · 정보 서랍
    $('btnSpeedCycle').addEventListener('click', function () { var g = self.game(); if (g.s) self.setSpeed(g.s.speed >= 3 ? 1 : g.s.speed + 1); });
    document.querySelectorAll('[data-drawer]').forEach(function (b) {
      b.addEventListener('click', function () { self.toggleDrawer(self.drawer === b.dataset.drawer ? null : b.dataset.drawer); self.app.audio.ui(); });
    });
    document.querySelectorAll('[data-close-drawer]').forEach(function (b) {
      b.addEventListener('click', function () { self.toggleDrawer(null); });
    });
    var mq = root.matchMedia ? root.matchMedia('(max-width: 960px)') : null;
    this.mq = mq;
    if (mq) {
      var onMq = function () { self.toggleDrawer(null); self.renderProfile(true); };
      if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    }
    this.bindField();
  };
  U.isMobile = function () { return !!(this.mq && this.mq.matches); };
  U.toggleDrawer = function (which) {
    this.drawer = which;
    var game = $('game');
    toggle(game, 'drawer-left', which === 'left');
    toggle(game, 'drawer-right', which === 'right');
    toggle($('mTabLeft'), 'on', which === 'left');
    toggle($('mTabRight'), 'on', which === 'right');
    if (which) { this.dirty = true; this.logDirty = true; }
  };

  U.bindField = function () {
    var self = this, cv = $('fxCanvas');
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener('pointerdown', function (e) {
      var g = self.game(); if (!g.s) return;
      self.app.audio.unlock();
      if (self.drawer) { self.toggleDrawer(null); self.pointer = null; return; } // 서랍이 열려 있으면 경기장 탭으로 닫기
      var p = pos(e), slot = self.app.renderer.slotAt(p.x, p.y), u = slot >= 0 ? g.unitAt(slot) : null;
      self.pointer = { x: p.x, y: p.y, slot: slot, uid: u ? u.uid : null, id: e.pointerId, touch: e.pointerType === 'touch' };
      if (u) try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    cv.addEventListener('pointermove', function (e) {
      var pt = self.pointer; if (!pt || pt.uid === null) return;
      var p = pos(e), r = self.app.renderer;
      // 손가락 떨림을 드래그로 오인하지 않도록 터치는 판정 거리를 조금 더 크게
      if (!r.drag && Math.hypot(p.x - pt.x, p.y - pt.y) > (pt.touch ? 10 : 6)) r.drag = { uid: pt.uid, x: p.x, y: p.y, moved: true };
      if (r.drag) { r.drag.x = p.x; r.drag.y = p.y; r.hoverSlot = r.slotAt(p.x, p.y); }
    });
    function end(e) {
      var pt = self.pointer, r = self.app.renderer, g = self.game(); self.pointer = null;
      if (!pt || !g.s) return;
      if (r.drag) {
        // 드래그 이동은 선수를 선택하지 않는다 (정보 화면은 일반 클릭/탭에서만 열린다).
        // 이미 정보 화면이 떠 있던 선수를 옮겼다면 새 위치에 맞춰 카드 위치만 다시 잡는다.
        var target = r.hoverSlot; r.drag = null; r.hoverSlot = -1;
        if (target >= 0 && g.move(pt.uid, target)) {
          self.app.audio.ui();
          if (self.selected === pt.uid) self.renderProfile(true);
        }
        return;
      }
      if (e.type === 'pointercancel') return;
      if (pt.uid !== null) { self.select(self.selected === pt.uid ? null : pt.uid); self.app.audio.ui(); }
      else self.select(null);
    }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  /* ───────── 입력 시퀀스 ─────────
     최근에 누른 글자 키를 모아 해시로만 비교한다 (원문은 코드에 두지 않는다).
     시퀀스를 입력하는 도중에는 같은 글자의 단축키가 실행되지 않도록 키를 삼킨다. */
  var SEQ = [[14, 0x20ba9926], [14, 0x2fc7e2fe], [17, 0xad7d5797]], SEQ_MAX = 17, SEQ_GAP = 2500, SEQ_PART = {};
  [0x18d8c4f7, 0x1a151035, 0x2e3e1ab3, 0x3423b83c, 0x3d569dc0, 0x3e15ae98, 0x3ff39a8b, 0x43cba7be, 0x44f39b57, 0x46d9d9bd,
    0x49c08e8a, 0x524674ab, 0x54a36280, 0x54f52398, 0x55844ccb, 0x594b321, 0x5e63dcc3, 0x5fad51ed, 0x60f80c32, 0x62742b6,
    0x6874e421, 0x6e9f7c6d, 0x74837500, 0x77c1722f, 0x77e33c26, 0x7fbc7fa8, 0x8252a320, 0x8ce3ade1, 0x93868776, 0x97f3f7f,
    0x9934fe56, 0xb10a9987, 0xb708fd6e, 0xbb20174c, 0xc1e4956a, 0xc459d06, 0xd46fb091, 0xe3b5b630, 0xee8a1c7d
  ].forEach(function (v) { SEQ_PART[v] = 1; });
  function seqHash(t) {
    var h = (0x811c9dc5 ^ (t.length * 0x9e3779b1)) >>> 0;
    for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i) + i * 131; h = Math.imul(h, 0x01000193); h ^= h >>> 13; }
    return h >>> 0;
  }
  // 이 키를 시퀀스가 가져갔으면 true (호출한 쪽은 단축키를 실행하지 않는다)
  U.seqKey = function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return false;
    var code = e.code || '', now = performance.now(), i;
    if (/^(Shift|Control|Alt|Meta|CapsLock)/.test(code)) return false;
    if (now - (this._seqAt || 0) > SEQ_GAP) { this._seq = ''; this._seqLive = false; }
    if (code === 'Space') { if (this._seqLive) { this._seqAt = now; return true; } return false; }
    if (!/^Key[A-Z]$/.test(code)) { this._seq = ''; this._seqLive = false; return false; }
    if (e.repeat) return !!this._seqLive;
    var s = this._seq = ((this._seq || '') + code.charAt(3).toLowerCase()).slice(-SEQ_MAX), n = s.length, live = false;
    this._seqAt = now;
    for (i = 0; i < SEQ.length; i++) {
      if (n >= SEQ[i][0] && seqHash(s.slice(-SEQ[i][0])) === SEQ[i][1]) { this._seq = ''; this._seqLive = false; this.seqRun(i); return true; }
    }
    for (i = 2; i <= n && !live; i++) live = SEQ_PART[seqHash(s.slice(-i))] === 1;
    this._seqLive = live;
    return live;
  };
  U.seqRun = function (k) {
    var app = this.app, g = this.game(), meta = app.meta, au = app.audio, n = 0;
    if (k === 0) {
      if (app.screen !== 'title') return;
      n = 0x2328;
      meta.relicCurrency += n; app.saveMeta(); this.renderTitle();
      if (this.modalName === 'relics') this.open('relics');
      au.unlock(); au.coin(); this.toast('🏆 트로피 토큰 +' + fmt(n), 'ok');
      return;
    }
    if (app.screen !== 'game' || !g.s) return;
    if (k === 1) {
      F.RECIPES.forEach(function (r) { if (r.secret && meta.discovered.indexOf(r.id) < 0) { meta.discovered.push(r.id); n++; } });
      app.saveMeta(); this.dirty = true;
      if (this.modalName === 'craft') this.open('craft', this.modalState, true);
      au.ui(); this.toast(n ? '✨ 비밀 조합 ' + n + '종 공개 · 조합하기의 히든 탭에서 확인' : '✨ 비밀 조합은 이미 모두 공개되어 있습니다', 'ok');
    } else if (k === 2) {
      if (!g.active()) return;
      var self = this, last = null, total = 0;
      F.PLAYERS.forEach(function (p) {
        if (!p.hidden) return;
        total++;
        var slot = g.freeSlot(), u = slot >= 0 ? g.addUnit(p.id, slot) : null;
        if (u) { n++; last = p; app.renderer.onSpawnUnit(u); self.log('히든 영입 · ' + p.name, 'ok'); }
      });
      if (!n) { au.error(); this.toast('빈 배치칸이 없습니다', 'err'); return; }
      this.dirty = true; app.saveMeta(); app.saveRun();
      au.summon(last.tier); this.showReveal(last, '✨ 히든 ' + n + '명 합류!' + (n < total ? ' (빈칸 부족)' : ''));
    }
  };

  U.bindKeys = function () {
    var self = this;
    document.addEventListener('keydown', function (e) {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (self.seqKey(e)) { e.preventDefault(); return; }
      if (e.target && /select/i.test(e.target.tagName)) return;
      if (e.key === 'Escape') {
        if (self.modalName) { self.closeModal(); return; }
        if (self.app.screen === 'game') { if (self.selected !== null) self.select(null); else self.open('menu'); }
        return;
      }
      if (self.app.screen !== 'game' || self.modalName) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return; // 브라우저 단축키(Ctrl+R 등)는 건드리지 않는다
      // 글자 키는 물리 키(e.code) 기준 — 한글 입력 상태(ㅂ, ㅈ …)에서도 같은 단축키가 동작한다
      var k = /^Key[A-Z]$/.test(e.code || '') ? e.code.charAt(3).toLowerCase() : e.key.toLowerCase(), g = self.game();
      if (k === ' ') { e.preventDefault(); self.togglePause(); }
      else if (k === 'q') self.doSummon(1);
      else if (k === 'w' && e.shiftKey) { // 지정 영입
        if (!g.active()) return;
        if (g.s.gold < C.DESIGNATED_SUMMON_COST) { self.toast('지정 영입에는 ' + fmt(C.DESIGNATED_SUMMON_COST) + ' 골드가 필요합니다', 'err'); self.app.audio.error(); }
        else self.open('designated');
      }
      else if (k === 'w') self.doSummon(10);
      else if (k === 'e') self.doMergeAll();
      else if (k === 'r') self.open('craft');
      else if (k === 'f' || k === 'u') self.open('upgrade');
      else if (k === 's') self.open('sell'); // 등급 판매 (선택 선수 판매는 Delete)
      else if (k === '1' || k === '2' || k === '3') self.setSpeed(+k);
      else if (k === 'delete' && self.selected !== null) self.handleAct('unit-sell', {});
      else if (k === 'l' && self.selected !== null) self.handleAct('unit-lock', {});
      else if (k === 'm' && self.selected !== null) self.handleAct('unit-merge', {});
    });
  };

  U.setSpeed = function (v) {
    var g = this.game(); if (!g.s) return;
    g.s.speed = v;
    document.querySelectorAll('.speed [data-speed]').forEach(function (b) { b.classList.toggle('on', +b.dataset.speed === v); });
    $('btnSpeedCycle').textContent = v + '×';
    this.app.audio.ui();
  };
  U.togglePause = function (force) {
    var g = this.game(); if (!g.s || !g.active()) return;
    g.s.paused = force === undefined ? !g.s.paused : force;
    toggle(this.els.pausedMask, 'hidden', !g.s.paused);
    this.els.btnPause.textContent = g.s.paused ? '▶' : '❚❚';
    if (g.s.paused) this.app.saveRun();
  };

  U.select = function (uid) {
    this.selected = uid;
    this.app.renderer.selected = uid;
    this.renderProfile(true);
  };

  /* ───────── 행동 ───────── */
  // 성공하면 true (길게 누르기 반복 영입이 실패 시 멈추는 데 사용)
  U.doSummon = function (n) {
    var g = this.game(); if (!g.s) return false;
    this.app.audio.unlock();
    var r = n === 1 ? g.summon() : this.runBatch(function () { return g.summonMany(n); });
    if (r.error) { this.toast(r.error, 'err'); this.app.audio.error(); return false; }
    if (n > 1) {
      var sold = r.results.filter(function (x) { return x.autoSold; }).length, best = r.results.reduce(function (a, b) { return b.tier > a.tier ? b : a; });
      this.toast('영입 ' + r.results.length + '회 · 최고 ' + C.TIERS[best.tier].name + ' ' + BY_ID[best.id].name + (sold ? ' · 자동 판매 ' + sold : '') + (r.stopped ? ' (' + r.stopped + ')' : ''), 'ok');
    } else if (r.autoSold) this.log(BY_ID[r.id].name + ' 자동 판매 +' + r.autoSaleGold, 'info');
    return true;
  };

  /* 영입 버튼(1회 · 10회): 누르는 순간 n회 영입, 계속 누르고 있으면 2초마다 n회씩 반복 영입.
     손을 떼거나 버튼 밖으로 벗어나면 멈추고, 골드 · 빈칸이 부족해 실패하면 자동으로 멈춘다. */
  var HOLD_SUMMON_MS = 2000;
  U.bindHoldSummon = function (btn, n) {
    var self = this, timer = null, pressed = false, upAt = 0;
    function stopTimer() {
      if (timer) { clearInterval(timer); timer = null; }
      btn.classList.remove('holding');
    }
    function release() { if (timer || pressed) upAt = performance.now(); stopTimer(); }
    btn.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || btn.disabled) return;
      stopTimer(); pressed = true; upAt = 0;
      if (!self.doSummon(n)) return;
      btn.classList.add('holding');
      timer = setInterval(function () { if (btn.disabled || !self.doSummon(n)) stopTimer(); }, HOLD_SUMMON_MS);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { btn.addEventListener(ev, release); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); }); // 모바일 길게 누르기 메뉴 방지
    // 포인터로 누른 뒤 따라오는 click 은 이미 처리했으므로 무시한다 (손을 뗀 지 1초 이내).
    // 키보드(Enter · Space) 처럼 포인터 없이 발생한 click 만 여기서 영입한다.
    btn.addEventListener('click', function () {
      if (pressed && performance.now() - upAt < 1000) { pressed = false; return; }
      pressed = false; self.doSummon(n);
    });
  };
  U.doMergeAll = function () {
    var g = this.game(); if (!g.s) return;
    var r = this.runBatch(function () { return g.mergeAll(); });
    if (r.error) { this.toast(r.error, 'err'); this.app.audio.error(); return; }
    var names = {};
    r.results.forEach(function (id) { var t = BY_ID[id].tier; names[t] = (names[t] || 0) + 1; });
    this.toast('합성 ' + r.count + '회 · ' + Object.keys(names).sort(function (a, b) { return b - a; }).map(function (t) { return C.TIERS[t].name + ' ' + names[t]; }).join(' · '), 'ok');
  };
  U.doCraft = function (id) {
    var g = this.game(), r = g.craft(id);
    if (r.error) { this.toast(r.error, 'err'); this.app.audio.error(); return false; }
    return true;
  };

  U.handleAct = function (act, d) {
    var g = this.game(), self = this, u, r;
    switch (act) {
      case 'unit-sell':
        u = g.s && g.unitById(this.selected); if (!u) return;
        var def = BY_ID[u.id];
        var doSell = function () { r = g.sell(u.uid); if (r.error) { self.toast(r.error, 'err'); return; } self.toast(def.name + ' 판매 +' + r.gold + ' 골드', 'info'); self.select(null); };
        if (def.tier >= 4) this.confirm('선수 판매', C.TIERS[def.tier].name + ' 등급 ' + def.name + ' 선수를 ' + g.sellValue(u) + ' 골드에 판매할까요?', '판매', doSell, true); else doSell();
        break;
      case 'unit-lock':
        u = g.s && g.unitById(this.selected); if (!u) return;
        r = g.toggleLock(u.uid); this.toast(r.locked ? '잠금: 판매·합성·조합에서 제외돼요' : '잠금 해제', 'info'); this.renderProfile(true);
        break;
      case 'unit-merge':
        u = g.s && g.unitById(this.selected); if (!u) return;
        r = g.mergeUnit(u.uid); if (r.error) { this.toast(r.error, 'err'); this.app.audio.error(); return; }
        this.select(r.u.uid);
        break;
      case 'unit-detail':
        u = g.s && g.unitById(this.selected); if (!u) return;
        this.open('player', { id: u.id, uid: u.uid });
        break;
      case 'unit-close':
        this.select(null);
        break;
    }
  };

  /* ═════════════ 매 프레임 (스로틀) ═════════════ */
  U.tick = function (dt) {
    if (this.app.screen !== 'game') return;
    var g = this.game(); if (!g.s) return;
    this.hudClock += dt; this.panelClock += dt; this.profileClock += dt;
    if (this.bannerTimer > 0) { this.bannerTimer -= dt; if (this.bannerTimer <= 0) this.els.banner.classList.remove('show'); }
    if (this.revealTimer > 0) { this.revealTimer -= dt; if (this.revealTimer <= 0) this.els.reveal.classList.add('hidden'); }
    if (this.hudClock >= 0.1) { this.hudClock = 0; this.renderHUD(); this.renderActions(); }
    if (this.panelClock >= 0.25) {
      this.panelClock = 0;
      this.renderMission(); this.renderStats();
      if (this.isMobile()) this.renderStrip();
      if (this.logDirty) { this.logDirty = false; this.renderLog(); }
      if (this.dirty) { this.dirty = false; this.renderLeft(); this.renderQuick(); this.renderProfile(true); this.updateMergeable(); if (this.modalName && this.modalLive) this.refreshModal(); }
    }
    if (this.profileClock >= 1) { this.profileClock = 0; if (this.selected !== null) this.renderProfile(false); }
  };

  U.renderHUD = function () {
    var g = this.game(), s = g.s, e = this.els;
    setText(e.hudWave, pad2(s.wave));
    setText(e.hudWaveMax, s.mode === 'infinite' ? '/ ∞' : '/ ' + C.NORMAL_WAVES);
    setText(e.hudMode, (s.mode === 'infinite' ? '무한' : '정규') + ' · ' + C.DIFFICULTIES[s.difficulty].name);
    var alive = g.aliveCount;
    setText(e.hudEnemies, alive);
    e.hudEnemyBar.style.width = Math.min(100, alive / C.ENEMY_LIMIT * 100) + '%';
    toggle(e.hudEnemyBar.parentNode, 'warn', alive >= 110);
    var count = s.phase === 'wave' ? g.waveEnemyCount() : 0;
    setText(e.hudRemain, Math.max(0, count - s.spawned));
    if (s.phase === 'ready') { setText(e.hudTimeLbl, '킥오프까지'); setText(e.hudTime, mmss(s.intermission)); }
    else { setText(e.hudTimeLbl, '웨이브 남은 시간'); setText(e.hudTime, mmss(Math.max(0, g.wd.duration - s.waveTime))); }
    var boss = s.bossDeadline !== null && s.bossDeadline !== undefined;
    toggle(e.hudBoss, 'hidden', !boss);
    if (boss) setText(e.hudBossTime, Math.max(0, Math.ceil(s.bossDeadline - s.time)) + '초');
    var ready = s.phase === 'ready';
    toggle(e.kickoff, 'hidden', !ready);
    toggle(e.field, 'ko', ready); // 킥오프 버튼이 보이는 동안 알림을 그 위로 올린다
    if (ready) setText(e.kickoffTime, Math.ceil(s.intermission));
  };

  U.renderActions = function () {
    var g = this.game(), s = g.s, e = this.els, active = g.active();
    setText(e.gold, fmt(s.gold));
    setText(e.tickets, s.tickets);
    var cost = g.summonCost(), free = g.freeSlot() >= 0;
    setText(e.summonCostLbl, s.tickets > 0 ? '영입권 사용 (' + s.tickets + ')' : cost + ' 골드');
    e.actSummon.disabled = !active || !free || (s.tickets <= 0 && s.gold < cost);
    e.actSummon10.disabled = e.actSummon.disabled;
    e.actDesignated.disabled = !active || s.gold < C.DESIGNATED_SUMMON_COST;
    setText(e.sellLbl, s.autoSellTier === null ? '자동 판매 끔' : '자동: ' + C.TIERS[s.autoSellTier].name + ' 이하');
  };

  U.updateMergeable = function () {
    var g = this.game(), m = {}, n = 0;
    g.mergeCandidates().forEach(function (c) { m[c.id] = true; n++; });
    this.app.renderer.mergeable = m;
    var mergeLbl = this.els.mergeLbl;
    setHTML(mergeLbl, n ? '<span class="badge">' + n + '</span> 종류 가능' : '가능 없음');
    var craft = g.craftable(true).length;
    setHTML(this.els.craftLbl, craft ? '<span class="badge">' + craft + '</span> 조합 가능' : '조합식 보기');
  };

  U.renderLeft = function () {
    var g = this.game(), s = g.s, next = C.waveData(s.wave + 1, s.difficulty), cur = g.wd, ev = g.event();
    var h = '<div class="eyebrow">' + (s.phase === 'ready' ? 'NEXT WAVE' : 'CURRENT WAVE') + '</div>';
    h += '<h3>WAVE ' + Math.max(1, s.phase === 'ready' ? s.wave + 1 : s.wave) + (cur.boss && s.phase !== 'ready' ? ' · <span style="color:var(--red)">BOSS</span>' : '') + '</h3>';
    var w = s.phase === 'ready' ? C.waveData(s.wave + 1, s.difficulty) : cur;
    h += '<div class="kv"><span>적 체력</span><b>' + fmt(w.hp) + '</b></div>';
    h += '<div class="kv"><span>방어력</span><b>' + Math.round(w.armor * 100) + '%</b></div>';
    h += '<div class="kv"><span>적 수</span><b>' + (s.phase === 'ready' ? w.count : g.waveEnemyCount()) + '명</b></div>';
    h += '<div class="kv"><span>웨이브 보상</span><b>' + w.reward + ' 골드</b></div>';
    var nb = next.boss ? next : null;
    if (w.boss) h += '<div class="box"><div class="h" style="color:var(--red)">♛ ' + esc(w.bossType.name) + '</div><div class="hint">' + esc(w.bossType.desc) + ' · 체력 ' + fmt(w.hp * w.bossMultiplier) + ' · 제한 ' + C.BOSS_TIME_LIMIT + '초</div></div>';
    else if (nb && s.phase !== 'ready') h += '<div class="hint" style="margin-top:6px">다음 웨이브 보스: <b style="color:var(--red)">' + esc(nb.bossType.name) + '</b></div>';
    setHTML(this.els.waveCard, h);

    toggle(this.els.eventCard, 'hidden', !ev);
    if (ev) setHTML(this.els.eventCard, '<div class="eyebrow">MATCH EVENT</div><h3>' + esc(ev.name) + '</h3><div class="hint">' + esc(ev.desc) + '</div>');

    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    s.units.forEach(function (u) { counts[BY_ID[u.id].tier]++; });
    var sq = '<div class="card-h">스쿼드 <small>배치 ' + s.units.length + ' / ' + C.SLOT_COUNT + '</small></div><div class="squad-grid">';
    for (var t = 0; t < 9; t++) {
      if (!counts[t] && t >= 5) continue;
      sq += '<div style="border-color:' + C.TIERS[t].color + '44">' + tierText(t) + '<b>' + counts[t] + '</b></div>';
    }
    sq += '</div>';
    var ups = s.upgrades.map(function (lv, t) { return lv ? '<span class="chip">' + tierText(t) + ' +' + lv + '</span>' : ''; }).join('');
    if (ups) sq += '<div class="chips" style="margin-top:8px">' + ups + '</div>';
    var tm = g.team;
    var teamFx = [];
    if (tm.dmg) teamFx.push('팀 공격력 +' + Math.round(tm.dmg * 100) + '%');
    if (tm.rate) teamFx.push('팀 공속 +' + Math.round(tm.rate * 100) + '%');
    if (tm.armorBreak) teamFx.push('적 방어 −' + Math.round(tm.armorBreak * 100) + '%');
    if (tm.globalSlow) teamFx.push('적 이속 −' + Math.round(tm.globalSlow * 100) + '%');
    if (tm.crit) teamFx.push('치명 +' + Math.round(tm.crit * 100) + '%p');
    if (teamFx.length) sq += '<div class="hint" style="margin-top:8px">팀 효과 · ' + teamFx.join(' · ') + '</div>';
    setHTML(this.els.squadCard, sq);
  };

  U.renderStats = function () {
    var g = this.game(), s = g.s, rec = this.app.meta.records;
    var h = '<div class="card-h">경기 기록</div>' +
      '<div class="kv"><span>DPS</span><b>' + fmt(s.dps) + '</b></div>' +
      '<div class="kv"><span>최고 DPS</span><b>' + fmt(s.peakDps) + '</b></div>' +
      '<div class="kv"><span>처치</span><b>' + fmt(s.stats.kills) + '</b></div>' +
      '<div class="kv"><span>점수</span><b>' + fmt(s.score) + '</b></div>' +
      '<div class="kv"><span>경기 시간</span><b>' + mmss(s.time) + '</b></div>' +
      '<div class="kv"><span>획득 토큰</span><b>🏆 ' + s.tokensEarned + '</b></div>' +
      '<div class="kv"><span>최고 기록</span><b>W' + rec.wave + ' · ' + fmt(rec.score) + '</b></div>';
    setHTML(this.els.statCard, h);
  };

  U.renderMission = function () {
    var s = this.game().s, m = s.mission, e = this.els;
    var h = '<div class="card-h">긴급 임무 <small>' + s.streak + ' 연승' + (s.streak ? ' 🔥' : '') + '</small></div>';
    if (!m) h += '<div class="empty">킥오프 후 임무가 주어집니다.<br>연승 3·5·7회마다 영입권 보너스!</div>';
    else {
      var state = m.done ? '<span class="mission-state ok">성공 +' + m.reward + 'G</span>' : m.failed ? '<span class="mission-state fail">실패</span>' : '<span class="mission-state run">진행 중</span>';
      var ratio = Math.min(1, m.target ? m.progress / m.target : 0);
      h += '<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">' + esc(m.name) + '</h3>' + state + '</div>';
      h += '<div class="hint">' + esc(m.hint) + ' · 보상 ' + m.reward + ' 골드</div>';
      h += '<div class="progress"><i style="width:' + (ratio * 100).toFixed(1) + '%"></i></div>';
      h += '<div class="kv"><span>' + (C.END_CHECK_MISSIONS.indexOf(m.type) >= 0 ? '웨이브 종료 시 판정' : '달성 시 즉시 성공') + '</span><b>' + fmt(m.progress) + ' / ' + fmt(m.target) + '</b></div>';
    }
    setHTML(e.missionCard, h);
    var inc = s.incident, show = inc && !inc.done && !inc.failed;
    toggle(e.incidentCard, 'hidden', !show);
    if (show) {
      setHTML(e.incidentCard, '<div class="card-h" style="color:#ffb3bb">⚠ 돌발 상황 <small>' + Math.ceil(inc.remaining) + '초</small></div><h3 style="margin:0">' + esc(inc.name) + '</h3><div class="hint">' + esc(inc.hint) + '</div><div class="progress"><i style="width:' + (inc.progress / inc.target * 100) + '%;background:var(--red)"></i></div><div class="kv"><span>보상</span><b>' + inc.reward + ' 골드</b></div>');
    }
  };

  // 모바일 정보 띠: 서랍을 열지 않아도 임무 · 돌발 상황 · 조합 가능 · 웨이브 요약이 보인다
  U.renderStrip = function () {
    var g = this.game(), s = g.s, m = s.mission, inc = s.incident, e = this.els, txt;
    var incOn = inc && !inc.done && !inc.failed;
    if (incOn) txt = '⚠ ' + inc.name + ' ' + Math.ceil(inc.remaining) + '초';
    else if (m) txt = m.name + ' ' + fmt(Math.min(m.progress, m.target)) + '/' + fmt(m.target) + (m.done ? ' ✔' : m.failed ? ' ✖' : '');
    else txt = '킥오프 후 임무 시작';
    var craft = g.craftable(true).length;
    if (craft) txt = '🧪 조합 ' + craft + ' · ' + txt;
    setText(e.mTabRightTxt, txt);
    toggle(e.mTabRight, 'alert', !!incOn);
    var count = s.phase === 'wave' ? g.waveEnemyCount() : 0;
    setText(e.mTabLeftTxt, 'W' + Math.max(1, s.wave) + (g.wd.boss && s.phase === 'wave' ? ' 보스' : '') + ' · 남은 적 ' + Math.max(0, count - s.spawned) + ' · ' + s.units.length + '/48');
  };

  U.renderQuick = function () {
    var g = this.game(), list = g.craftable(true), meta = this.app.meta;
    if (!list.length) { setHTML(this.els.quickCraft, '<div class="empty">재료가 모이면 여기에 표시됩니다.<br><small>조합하기에서 전체 조합식을 확인하세요.</small></div>'); return; }
    var h = '';
    list.forEach(function (r) {
      var def = BY_ID[r.id], secret = r.secret;
      h += '<button type="button" data-craft="' + r.id + '" class="' + (secret ? 'secret' : '') + '">' + pc(r.id, 34) + '<span><div class="nm">' + (secret && meta.discovered.indexOf(r.id) < 0 ? '✨ 비밀 조합 발견! ' : '') + esc(def.name) + ' ' + tierTag(def.tier) + '</div><div class="sub">' + r.materials.map(function (m) { return esc(BY_ID[m.id].name); }).join(' + ') + '</div></span></button>';
    });
    if (setHTML(this.els.quickCraft, h)) hydrate(this.els.quickCraft);
  };

  U.renderProfile = function (force) {
    var g = this.game(), el = this.els.profileCard;
    var u = this.selected !== null && g.s ? g.unitById(this.selected) : null;
    if (!u && this.selected !== null) { this.selected = null; this.app.renderer.selected = null; }
    var mobile = this.isMobile();
    this.renderSheet(mobile ? u : null, force);
    if (!u || mobile) { el._uid = null; setHTML(el, '<div class="card-h">선수 정보</div><div class="empty">경기장의 선수를 클릭하세요.<br>드래그로 위치를 바꿀 수 있어요.</div>'); return; }
    var def = BY_ID[u.id], p = g.power(u), same = g.s.units.filter(function (x) { return x.id === u.id && !x.locked; }).length;
    var canMerge = def.tier <= C.MERGE_MAX_TIER && same >= 3;
    if (!force && el._uid === u.uid) {
      var st = el.querySelector('[data-live]');
      if (st) st.innerHTML = this.liveStats(u, p);
      return;
    }
    el._uid = u.uid;
    var h = '<div class="ph">' + pc(u.id, 58) + '<div><div class="nm">' + esc(def.name) + '</div><div class="chips" style="margin-top:4px">' + tierTag(def.tier) + styleChip(def.style) + '</div><div class="hint" style="margin-top:3px">' + esc(C.POSITIONS[def.pos].name) + ' · ' + esc(F.CLUBS[def.club].name) + '</div></div></div>';
    h += '<div data-live>' + this.liveStats(u, p) + '</div>';
    if (def.passive) h += '<div class="skill"><b>◆ ' + esc(def.passive.name) + '</b> · ' + esc(def.passive.desc) + '</div>';
    h += '<div class="skill"><b>★ ' + esc(def.skill.name) + '</b> · ' + esc(skillText(def.skill)) + '</div>';
    h += '<div class="btns">' +
      '<button type="button" class="btn small" data-act="unit-sell"' + (u.locked ? ' disabled' : '') + '>판매 +' + g.sellValue(u) + '</button>' +
      '<button type="button" class="btn small" data-act="unit-lock">' + (u.locked ? '잠금 해제' : '🔒 잠금') + '</button>' +
      '<button type="button" class="btn small" data-act="unit-merge"' + (canMerge && !u.locked ? '' : ' disabled') + '>합성 (' + Math.min(same, 3) + '/3)</button>' +
      '<button type="button" class="btn small" data-act="unit-detail">상세 정보</button></div>';
    setHTML(el, h); hydrate(el);
  };
  /* 모바일 선수 정보 카드 — 경기장 위에 겹쳐 띄워 스크롤 없이 보여준다.
     선수가 화면 아래쪽에 있으면 카드를 위에, 위쪽에 있으면 아래에 둬서 선수를 가리지 않는다. */
  U.renderSheet = function (u, force) {
    var el = this.els.unitSheet, field = this.els.field, g = this.game();
    if (!u) {
      if (el._uid !== null) { el._uid = null; toggle(el, 'hidden', true); field.classList.remove('sheet-top', 'sheet-bottom'); }
      return;
    }
    var def = BY_ID[u.id], p = g.power(u);
    if (force || el._uid !== u.uid) {
      el._uid = u.uid;
      var same = g.s.units.filter(function (x) { return x.id === u.id && !x.locked; }).length;
      var canMerge = def.tier <= C.MERGE_MAX_TIER && same >= 3;
      var h = '<div class="us-h">' + pc(u.id, 44) + '<div class="us-t"><div class="nm">' + esc(def.name) + '</div><div class="chips">' + tierTag(def.tier) + styleChip(def.style) + '<span class="chip" style="color:' + C.POSITIONS[def.pos].color + '">' + def.pos + '</span></div></div>' +
        '<button type="button" class="x" data-act="unit-close" aria-label="닫기">✕</button></div>';
      h += '<div class="us-stats" data-live>' + this.sheetStats(u, p) + '</div>';
      h += '<div class="us-skill">' + (def.passive ? '<b>◆ ' + esc(def.passive.name) + '</b> ' + esc(def.passive.desc) + ' ' : '') + '<b>★ ' + esc(def.skill.name) + '</b> ' + esc(skillText(def.skill)) + '</div>';
      h += '<div class="us-btns">' +
        '<button type="button" class="btn" data-act="unit-sell"' + (u.locked ? ' disabled' : '') + '>판매 +' + g.sellValue(u) + '</button>' +
        '<button type="button" class="btn" data-act="unit-lock">' + (u.locked ? '잠금 해제' : '🔒 잠금') + '</button>' +
        '<button type="button" class="btn" data-act="unit-merge"' + (canMerge && !u.locked ? '' : ' disabled') + '>합성 ' + Math.min(same, 3) + '/3</button>' +
        '<button type="button" class="btn" data-act="unit-detail">자세히</button></div>';
      el.innerHTML = h; hydrate(el);
      toggle(el, 'hidden', false);
    } else {
      var live = el.querySelector('[data-live]'); if (live) live.innerHTML = this.sheetStats(u, p);
    }
    var sc = this.app.renderer.slotScreen(u.slot), top = sc.y > sc.h * 0.5;
    toggle(el, 'top', top);
    toggle(field, 'sheet-top', top); toggle(field, 'sheet-bottom', !top);
    field.style.setProperty('--sheet-h', el.offsetHeight + 'px');
  };
  U.sheetStats = function (u, p) {
    var cell = function (k, v) { return '<div><small>' + k + '</small><b>' + v + '</b></div>'; };
    return cell('공격력', fmt(p.damage)) + cell('공격속도', p.rate.toFixed(2) + '/s') + cell('사거리', p.range.toFixed(1)) +
      cell('치명타', Math.round(Math.min(0.95, p.crit) * 100) + '%') + cell('누적 피해', fmt(u.dealt)) + cell('공격', esc(C.ROLES[BY_ID[u.id].role].name));
  };
  U.liveStats = function (u, p) {
    return '<div class="kv"><span>공격력</span><b>' + fmt(p.damage) + '</b></div>' +
      '<div class="kv"><span>공격속도 · 사거리</span><b>' + p.rate.toFixed(2) + '/초 · ' + p.range.toFixed(1) + '</b></div>' +
      '<div class="kv"><span>치명타 · 누적 피해</span><b>' + Math.round(Math.min(0.95, p.crit) * 100) + '% · ' + fmt(u.dealt) + '</b></div>' +
      '<div class="kv"><span>공격 방식</span><b>' + esc(C.ROLES[BY_ID[u.id].role].name) + '</b></div>';
  };

  /* ═════════════ 알림 ═════════════
     - toast: 중요한 알림만 경기장 하단에 표시. 같은 문구는 새로 쌓지 않고 ×n 으로 합치며 동시에 최대 3개(모바일 2개)
     - log: 좌측 「경기 로그」에 모든 소식을 기록 (덜 중요한 소식은 로그로만 보낸다)
     - batch: 10회 영입 · 일괄 합성 중에는 개별 연출 대신 가장 높은 등급 연출 1개 + 요약 알림 1개 */
  var TOAST_MS = 2400;
  U.toast = function (msg, kind) {
    var inGame = this.app.screen === 'game';
    if (inGame) this.log(msg, kind);
    var box = inGame ? this.els.toasts : $('globalToasts'), list = box.children;
    for (var i = 0; i < list.length; i++) {
      var ex = list[i];
      if (ex._msg === msg && !ex.classList.contains('out')) {
        ex._n++; ex.textContent = msg + '  ×' + ex._n;
        box.appendChild(ex); armToast(ex);
        return;
      }
    }
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || ''); t.textContent = msg; t._msg = msg; t._n = 1;
    box.appendChild(t); armToast(t);
    var max = root.innerWidth < 560 ? 2 : 3;
    while (box.children.length > max) box.removeChild(box.firstChild);
  };
  function armToast(t) {
    clearTimeout(t._timer); clearTimeout(t._timer2);
    t.classList.remove('out');
    t._timer = setTimeout(function () {
      t.classList.add('out');
      t._timer2 = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, TOAST_MS);
  }
  U.log = function (msg, kind) {
    var g = this.game(); if (!g.s) return;
    var logs = this.logs = this.logs || [], last = logs[logs.length - 1];
    if (last && last.msg === msg && last.w === g.s.wave) last.n++;
    else logs.push({ w: g.s.wave, msg: msg, kind: kind || '', n: 1 });
    if (logs.length > 40) logs.splice(0, logs.length - 40);
    this.logDirty = true;
  };
  U.renderLog = function () {
    var logs = this.logs || [];
    var h = '<div class="card-h">경기 로그 <small>최근 소식</small></div>';
    if (!logs.length) h += '<div class="empty">경기 소식이 여기에 기록됩니다.</div>';
    else h += '<div class="log">' + logs.slice(-8).reverse().map(function (l) {
      return '<div class="log-row ' + l.kind + '"><b>W' + l.w + '</b><span>' + esc(l.msg) + (l.n > 1 ? ' ×' + l.n : '') + '</span></div>';
    }).join('') + '</div>';
    setHTML(this.els.logCard, h);
  };
  U.runBatch = function (fn) {
    this.batch = { best: null };
    try { return fn(); }
    finally { var b = this.batch; this.batch = null; if (b.best) this.reveal(b.best.def, b.best.label); }
  };
  // 고등급 연출: 일괄 동작 중에는 가장 높은 등급 하나만 모아 두었다가 끝나면 보여준다
  U.showReveal = function (def, label) {
    if (!this.batch) { this.reveal(def, label); return; }
    var score = def.hidden ? 100 : def.tier, best = this.batch.best;
    if (!best || score > best.score) this.batch.best = { def: def, label: label, score: score };
  };
  U.banner = function (title, sub, cls) {
    var b = this.els.banner;
    b.className = 'banner ' + (cls || '');
    b.innerHTML = '<div class="t">' + esc(title) + '</div>' + (sub ? '<div class="s">' + esc(sub) + '</div>' : '');
    void b.offsetWidth; b.classList.add('show');
    this.bannerTimer = 1.9;
  };
  U.reveal = function (def, label) {
    var r = this.els.reveal, col = C.TIERS[def.tier].color;
    r.className = 'reveal' + (def.hidden ? ' hidden-tier' : '');
    r.style.borderColor = def.hidden ? '' : col;
    r.innerHTML = pc(def.id, 64) + '<div><div class="rt' + (def.hidden ? ' rb-text' : '') + '" style="' + (def.hidden ? '' : 'color:' + col) + '">' + esc(label) + '</div><div class="rn">' + esc(def.name) + '</div><div class="rs">' + esc(def.nick) + ' · ' + esc(F.CLUBS[def.club].name) + '</div></div>';
    hydrate(r);
    this.revealTimer = def.hidden ? 3.2 : 2.2;
  };

  /* 엔진 이벤트 */
  U.onEvent = function (type, a, b, c, d) {
    var g = this.game(), au = this.app.audio, def;
    switch (type) {
      case 'start': this.dirty = true; this.autoPaused = false; this.logs = []; this.logDirty = true; this.els.toasts.innerHTML = ''; this.toggleDrawer(null); this.select(null); break;
      case 'change': this.dirty = true; break;
      case 'wave':
        this.dirty = true;
        au.whistle();
        this.banner('WAVE ' + a, b ? '보스 웨이브 · ' + g.wd.bossType.name : c ? '이벤트 · ' + c.name + ' — ' + c.desc : '킥오프!', b ? 'boss' : '');
        break;
      case 'waveend':
        this.dirty = true;
        this.log('웨이브 ' + a + ' 종료 · +' + b + ' 골드 · 🏆 +' + c + (d ? ' · 이자 +' + d : ''), 'ok');
        this.app.saveRun(); this.app.saveMeta();
        break;
      case 'boss': au.boss(); this.banner('BOSS · ' + a.name, g.wd.bossType.desc + ' · 제한 ' + C.BOSS_TIME_LIMIT + '초', 'boss'); this.log('보스 등장 · ' + a.name, 'err'); break;
      case 'bosskill': au.cheer(1); this.toast('보스 ' + a.name + ' 격파! 영입권 +1', 'ok'); break;
      case 'bossphase':
        if (b === 3) this.toast(a.name + ' 광폭화!', 'err');
        else if (b > 1) this.log(a.name + ' 페이즈 ' + b, 'err');
        break;
      case 'seal': this.app.renderer.onSeal(a); this.log('🟥 ' + BY_ID[a.id].name + ' 3초 퇴장', 'err'); break;
      case 'warp': this.app.renderer.onFloat(a.x, a.z - 1.2, '역습 질주!', '#ff9f43'); break;
      case 'bossskill': this.app.renderer.onFloat(a.x, a.z - 1.2, b, '#5ff0ff'); break;
      case 'mission':
        this.dirty = true;
        if (a) { au.coin(); this.toast('임무 성공 · ' + b.name + ' +' + b.reward + ' 골드' + (c ? ' · 영입권 +' + c : ''), 'ok'); }
        else this.toast('임무 실패 · ' + b.name, 'err');
        break;
      case 'incident': au.error(); this.toast('⚠ 돌발 상황 · ' + a.name, 'err'); break;
      case 'incidentend': if (a) { au.coin(); this.toast('돌발 상황 해결! +' + b + ' 골드', 'ok'); } else this.toast('돌발 상황 실패', 'err'); break;
      case 'draw':
        this.app.renderer.onSpawnUnit(a); au.summon(b.tier);
        if (d) this.showReveal(b, '지정 영입 · 전설');
        else if (b.tier >= 4) this.showReveal(b, C.TIERS[b.tier].name + ' 영입!');
        if (b.tier >= 4) this.log(C.TIERS[b.tier].name + ' 영입 · ' + b.name, 'ok');
        break;
      case 'merge':
        this.app.renderer.onSpawnUnit(a); au.merge();
        if (b.tier >= 4) this.showReveal(b, '합성 성공 · ' + C.TIERS[b.tier].name + '!');
        this.log('합성 · ' + BY_ID[c].name + ' ×3 → ' + b.name + ' (' + C.TIERS[b.tier].name + ')', 'ok');
        break;
      case 'craft':
        this.app.renderer.onSpawnUnit(a); au.summon(b.tier); au.merge();
        this.showReveal(b, c.secret ? '✨ 비밀 조합 · 레전드 강림!' : '조합 성공 · ' + C.TIERS[b.tier].name);
        this.log('조합 · ' + b.name + ' (' + C.TIERS[b.tier].name + ')', 'ok');
        this.app.saveMeta();
        break;
      case 'sell': if (!c) au.coin(); if (this.selected === a.uid) this.select(null); break;
      case 'sellmany': au.coin(); this.toast(a + '명 판매 · +' + b + ' 골드', 'info'); if (this.selected !== null && !g.unitById(this.selected)) this.select(null); break;
      case 'upgrade': au.ui(); this.log(C.TIERS[a].name + ' 등급 강화 Lv.' + b, 'info'); break;
      case 'refund': this.log('🪙 영입 비용 환급 +' + a, 'info'); break;
      case 'achievement': this.toast('🏅 업적 달성 · ' + a.name + ' — ' + a.desc, 'ok'); break;
      case 'unlock': this.log('📖 도감 등록 · ' + a.name, 'info'); break;
      case 'over': au.lose(); this.app.endGame(); break;
      case 'clear': au.win(); this.app.endGame(); break;
    }
  };

  /* ═════════════ 모달 ═════════════ */
  U.bindModal = function () {
    var self = this, modal = this.els.modal;
    $('modalClose').addEventListener('click', function () { self.closeModal(); });
    modal.addEventListener('click', function (e) { if (e.target === modal && !self.modalLocked) self.closeModal(); });
    this.els.modalBody.addEventListener('click', function (e) {
      var t = e.target.closest('[data-m]'); if (!t) return;
      self.modalAction(t.dataset.m, t.dataset, t);
    });
    this.els.modalBody.addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset.set) return;
      self.settingChange(t.dataset.set, t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value);
    });
  };

  /* opts.pause: 창이 열려 있는 동안 경기를 일시정지하고, 닫으면 재개한다.
     (모바일에서는 창이 경기장을 가려 대응하기 어려우므로 판매 · 조합 · 메뉴에 사용. PC 도 동일)
     창을 열기 전에 이미 직접 일시정지해 둔 경우에는 닫아도 계속 정지 상태로 둔다. */
  U.showModal = function (name, title, html, opts) {
    opts = opts || {};
    if (opts.pause) {
      var g = this.game();
      if (g.s && g.active() && !g.s.paused) { this.togglePause(true); this.autoPaused = true; }
    }
    this.modalName = name; this.modalLive = !!opts.live; this.modalLocked = !!opts.locked;
    setText(this.els.modalTitle, title);
    this.els.modalBody.innerHTML = html;
    this.els.modal.querySelector('.modal-box').classList.toggle('narrow', !!opts.narrow);
    toggle(this.els.modal, 'hidden', false);
    toggle($('modalClose'), 'hidden', !!opts.locked);
    hydrate(this.els.modalBody);
    if (!opts.keepScroll) this.els.modalBody.scrollTop = 0;
  };
  U.closeModal = function () {
    if (this.autoPaused) { this.autoPaused = false; this.togglePause(false); }
    this.modalName = null; this.modalLive = false; this.modalLocked = false;
    toggle(this.els.modal, 'hidden', true);
    this.els.modalBody.innerHTML = '';
  };
  U.refreshModal = function () {
    if (!this.modalName) return;
    var top = this.els.modalBody.scrollTop;
    this.open(this.modalName, this.modalState, true);
    this.els.modalBody.scrollTop = top;
  };

  U.confirm = function (title, text, okLabel, onOk, pause) {
    this._confirmOk = onOk;
    this.showModal('confirm', title, '<p>' + esc(text) + '</p><div class="btn-row"><button type="button" class="btn" data-m="confirm-no">취소</button><button type="button" class="btn primary" data-m="confirm-yes">' + esc(okLabel) + '</button></div>', { narrow: true, pause: !!pause });
  };

  U.open = function (name, state, refresh) {
    state = state || {};
    this.modalState = state;
    var fn = this['modal_' + name];
    if (!fn) return;
    fn.call(this, state, !!refresh);
  };

  /* 선수 도감 */
  U.modal_codex = function (st) {
    var meta = this.app.meta, tab = st.tab === undefined ? 'all' : st.tab;
    var h = '<div class="tabs"><button type="button" data-m="codex-tab" data-tab="all" class="' + (tab === 'all' ? 'on' : '') + '">전체 ' + meta.unlocked.length + '/' + F.PLAYERS.length + '</button>';
    for (var t = 8; t >= 0; t--) h += '<button type="button" data-m="codex-tab" data-tab="' + t + '" class="' + (String(tab) === String(t) ? 'on' : '') + '">' + tierText(t) + '</button>';
    h += '</div><div class="grid-cards">';
    F.PLAYERS.filter(function (p) { return tab === 'all' || String(p.tier) === String(tab); })
      .sort(function (a, b) { return b.tier - a.tier || (a.rank || 99) - (b.rank || 99); })
      .forEach(function (p) {
        var got = meta.unlocked.indexOf(p.id) >= 0;
        h += '<div class="pc ' + (got ? '' : 'locked') + '" data-m="player" data-id="' + p.id + '">' + pc(p.id, 64) + (got ? '' : '<span class="q">?</span>') +
          '<div class="nm">' + esc(p.name) + '</div><div class="sub">' + tierTag(p.tier) + ' ' + C.POSITIONS[p.pos].short + (p.rank ? ' · ' + p.rank + '위' : ' · 레전드') + '</div></div>';
      });
    h += '</div><p class="hint" style="margin-top:12px">신화 이하는 The Guardian 2025 순위 기반입니다 (메시 34위·호날두 51위는 히든으로 분리, 52위 찰하놀루 편입). 초월 7인 · 태초 11인은 역대 레전드입니다. 한 번이라도 획득하면 사진이 공개됩니다.</p>';
    this.showModal('codex', '📖 선수 도감', h);
  };

  U.modal_player = function (st) {
    var def = BY_ID[st.id], meta = this.app.meta, g = this.game(), got = meta.unlocked.indexOf(def.id) >= 0;
    var bs = baseStats(def), role = C.ROLES[def.role], style = C.STYLES[def.style], cr = (F.PHOTO_CREDITS || {})[def.id];
    var live = st.uid && g.s ? g.unitById(st.uid) : null, p = live ? g.power(live) : null;
    var h = '<div class="detail"><div class="big-portrait">' + pc(def.id, 200, ',0 16px 40px rgba(0,0,0,.5)') + '</div><div>';
    h += '<div class="chips">' + tierTag(def.tier) + styleChip(def.style) + posChip(def.pos) + (def.hidden ? '<span class="chip rb-chip"><span class="rb-text">★ 히든 레전드</span></span>' : '') + '</div>';
    h += '<h3 style="margin-top:6px">' + esc(def.name) + '</h3><div class="en">' + esc(def.en) + ' · "' + esc(def.nick) + '"</div>';
    h += '<div class="kv"><span>소속 · 국적</span><b>' + esc(F.CLUBS[def.club].name) + ' · ' + esc(def.nation) + '</b></div>';
    // 레전드: '1945–2024'(생몰) 또는 '1972–'(생존). 현역: 나이 · 가디언 순위
    var legendAlive = def.legend && /–$/.test(def.legend);
    h += '<div class="kv"><span>' + (def.legend ? (legendAlive ? '출생' : '생몰') : '나이') + ' · 가디언 순위</span><b>' + (def.legend ? esc(legendAlive ? def.legend.replace('–', '년생') : def.legend) : def.age + '세') + ' · ' + (def.rank ? def.rank + '위' : '역대 레전드') + '</b></div>';
    h += '<p class="desc" style="color:#cfd9e6">' + esc(def.trait) + '</p>';
    h += '<div class="stat-grid"><div><small>' + (p ? '현재 공격력' : '기본 공격력') + '</small><b>' + fmt(p ? p.damage : bs.damage) + '</b></div><div><small>공격속도</small><b>' + (p ? p.rate : bs.rate).toFixed(2) + '/초</b></div><div><small>사거리</small><b>' + (p ? p.range : bs.range).toFixed(1) + '</b></div><div><small>치명타</small><b>' + Math.round(Math.min(0.95, p ? p.crit : bs.crit) * 100) + '%</b></div></div>';
    h += '<div class="box"><div class="h">⚽ 기본 공격 · ' + esc(role.name) + '</div>' + esc(role.desc) + (role.mode !== 'single' ? ' (최대 ' + role.targets + '명)' : '') + '</div>';
    h += '<div class="box"><div class="h" style="color:' + style.color + '">' + style.icon + ' 플레이 스타일 · ' + esc(style.name) + '</div>' + esc(style.desc) + '</div>';
    if (def.passive) h += '<div class="box"><div class="h" style="color:var(--gold)">◆ 패시브 · ' + esc(def.passive.name) + '</div>' + esc(def.passive.desc) + '</div>';
    h += '<div class="box"><div class="h" style="color:var(--gold)">★ 확률 스킬 · ' + esc(def.skill.name) + '</div>' + esc(skillText(def.skill)) + '</div>';
    var recipe = F.RECIPE_BY_ID[def.id];
    if (recipe) {
      var known = !recipe.secret || meta.discovered.indexOf(def.id) >= 0;
      h += '<div class="box"><div class="h">🧪 ' + (recipe.secret ? '비밀 조합' : '조합법') + '</div>';
      h += known ? recipe.materials.map(function (m) { return '<span class="mat have">' + pc(m.id, 22) + esc(BY_ID[m.id].name) + '</span>'; }).join('') + '<div class="hint" style="margin-top:4px">' + esc(recipe.relation) + '</div>'
        : '<div class="hint">재료 비공개 · 아직 발견하지 못한 조합입니다.</div>';
      h += '</div>';
    }
    if (def.hidden) h += '<div class="box"><div class="h">획득 방법</div>영입으로는 등장하지 않으며, 비밀 조합으로만 획득할 수 있습니다.</div>';
    else {
      var ways = [];
      var sw = C.SUMMON_WEIGHTS[def.tier];
      if (sw > 0) ways.push('영입 (' + C.TIERS[def.tier].name + ' ' + Number((sw / 1000).toFixed(2)) + '% · 같은 등급 ' + F.PLAYERS.filter(function (x) { return !x.hidden && x.tier === def.tier; }).length + '명 중 1명)');
      if (def.tier >= 1 && def.tier <= C.MERGE_MAX_TIER + 1) ways.push(C.TIERS[def.tier - 1].name + ' 같은 선수 3명 합성');
      if (def.tier === 4) ways.push('지정 영입 (' + fmt(C.DESIGNATED_SUMMON_COST) + '골드)');
      if (recipe) ways.push('조합');
      h += '<div class="box"><div class="h">획득 방법</div>' + ways.join(' · ') + '</div>';
    }
    var uses = F.RECIPES.filter(function (r) { return r.materials.some(function (m) { return m.id === def.id; }) && (!r.secret || meta.discovered.indexOf(r.id) >= 0); });
    if (uses.length) h += '<div class="box"><div class="h">재료로 쓰이는 조합</div>' + uses.map(function (r) { return '<span class="mat have">' + pc(r.id, 22) + esc(BY_ID[r.id].name) + '</span>'; }).join('') + '</div>';
    if (cr) h += '<div class="credit">사진: ' + esc(cr.author) + ' · ' + esc(cr.license) + ' · <a href="' + esc(cr.source) + '" target="_blank" rel="noopener">Wikimedia Commons</a>' + (got ? '' : ' · (미획득 선수는 도감에서 어둡게 표시)') + '</div>';
    h += '</div></div><div class="btn-row">' + (st.uid ? '' : '<button type="button" class="btn" data-m="codex-back">← 도감으로</button>') + '</div>';
    this.showModal('player', def.name, h);
  };

  /* 트로피 캐비닛 (유물) */
  U.modal_relics = function (st) {
    var meta = this.app.meta, g = this.game(), fx = g.computeRelicEffects();
    var owned = Object.keys(meta.relics).length;
    var h = '<div class="row" style="flex-wrap:wrap"><div class="grow"><div class="t">🏆 트로피 토큰 ' + fmt(meta.relicCurrency) + '</div><div class="s">웨이브를 클리어할 때마다 획득 · 보유한 트로피 효과는 다음 경기부터 자동 적용 · 수집 ' + owned + ' / ' + C.RELICS.length + '</div></div>' +
      '<button type="button" class="btn" data-m="relic-draw" data-n="1"' + (meta.relicCurrency < C.RELIC_SUMMON_COST ? ' disabled' : '') + '>1회 뽑기 · ' + C.RELIC_SUMMON_COST + '</button>' +
      '<button type="button" class="btn primary" data-m="relic-draw" data-n="10"' + (meta.relicCurrency < C.RELIC_TEN_COST ? ' disabled' : '') + '>10회 뽑기 · ' + C.RELIC_TEN_COST + '</button></div>';
    var total = C.RELIC_RARITIES.reduce(function (a, r) { return a + r.weight; }, 0);
    h += '<div class="odds" style="margin:10px 0">' + C.RELIC_RARITIES.map(function (r) { return '<span class="chip" style="color:' + r.color + '">' + r.name + ' ' + (r.weight / total * 100).toFixed(1) + '% · 중복 +' + r.shards + '조각</span>'; }).join('') + '<span class="chip">신화 이상 천장 ' + meta.relicPity + ' / ' + C.RELIC_PITY + '</span></div>';
    if (st.results && st.results.length) {
      h += '<div class="box"><div class="h">뽑기 결과</div><div class="chips">' + st.results.map(function (r) {
        var rel = C.RELIC_BY_ID[r.id], col = C.RELIC_RARITIES[rel.rarity].color;
        return '<span class="chip" style="border-color:' + col + ';color:' + col + '">' + rel.icon + ' ' + esc(rel.name) + (r.isNew ? ' NEW' : r.shards ? ' +' + r.shards + '조각' : ' +' + r.refund + '토큰') + '</span>';
      }).join('') + '</div></div>';
    }
    h += '<div class="relic-grid" style="margin-top:10px">';
    C.RELICS.slice().sort(function (a, b) { return b.rarity - a.rarity; }).forEach(function (rel) {
      var o = meta.relics[rel.id], col = C.RELIC_RARITIES[rel.rarity].color, lv = o ? o.level : 1;
      var need = o && o.level < C.RELIC_MAX_LEVEL ? C.RELIC_UPGRADE_SHARDS[o.level] : 0;
      h += '<div class="relic ' + (o ? '' : 'off') + '" style="border-color:' + col + '55"><div class="lv" style="color:' + col + '">' + (o ? 'Lv.' + o.level : '미보유') + '</div><div class="ic">' + rel.icon + '</div><div class="nm" style="color:' + col + '">' + esc(rel.name) + '</div><div class="ef">' + esc(C.relicEffectText(rel, lv)) + '</div>';
      if (o && o.level < C.RELIC_MAX_LEVEL) h += '<div class="progress"><i style="width:' + Math.min(100, o.shards / need * 100) + '%;background:' + col + '"></i></div><button type="button" class="btn small" style="width:100%" data-m="relic-up" data-id="' + rel.id + '"' + (o.shards >= need ? '' : ' disabled') + '>강화 ' + o.shards + '/' + need + '</button>';
      else if (o) h += '<div class="hint">최대 레벨</div>';
      h += '</div>';
    });
    h += '</div>';
    var parts = [];
    if (fx.damage) parts.push('공격력 +' + (fx.damage * 100).toFixed(1) + '%');
    if (fx.rate) parts.push('공속 +' + (fx.rate * 100).toFixed(1) + '%');
    if (fx.startGold) parts.push('시작 골드 +' + Math.round(fx.startGold));
    if (fx.crit) parts.push('치명 +' + (fx.crit * 100).toFixed(1) + '%p');
    h += '<p class="hint" style="margin-top:10px">현재 적용 요약: ' + (parts.join(' · ') || '없음') + '</p>';
    this.showModal('relics', '🏆 트로피 캐비닛', h, { keepScroll: !!st.keep });
  };

  /* 기록실 */
  U.modal_records = function (st) {
    var meta = this.app.meta, r = meta.records, filter = st.filter || 'all', ms = meta.stats;
    var h = '<div class="stat-grid"><div><small>최고 웨이브</small><b>' + r.wave + '</b></div><div><small>최고 점수</small><b>' + fmt(r.score) + '</b></div><div><small>최다 처치</small><b>' + fmt(r.kills) + '</b></div><div><small>최고 DPS</small><b>' + fmt(r.dps) + '</b></div></div>';
    h += '<div class="box"><div class="h">🏅 커리어 업적</div><div class="chips">' + C.ACHIEVEMENTS.map(function (a) {
      var done = meta.achievements.indexOf(a.id) >= 0;
      return '<span class="chip" style="' + (done ? 'color:var(--gold);border-color:var(--gold)' : 'opacity:.55') + '" title="' + esc(a.desc) + '">' + (done ? '✔ ' : '○ ') + esc(a.name) + ' · ' + esc(a.desc) + '</span>';
    }).join('') + '</div></div>';
    h += '<div class="box"><div class="h">누적 통계</div><div class="chips"><span class="chip">영입 ' + fmt(ms.summons || 0) + '</span><span class="chip">합성 ' + fmt(ms.merges || 0) + '</span><span class="chip">보스 처치 ' + fmt(ms.bosses || 0) + '</span><span class="chip">임무 성공 ' + fmt(ms.missions || 0) + '</span><span class="chip">전설 ' + (ms.legend || 0) + '</span><span class="chip">신화 ' + (ms.myth || 0) + '</span><span class="chip">초월 ' + (ms.transcendent || 0) + '</span><span class="chip">태초 ' + (ms.primordial || 0) + '</span><span class="chip">히든 ' + (ms.hidden || 0) + '</span><span class="chip">우승 ' + (ms.clears || 0) + '</span></div></div>';
    h += '<div class="tabs" style="margin-top:12px"><button type="button" data-m="rank-filter" data-f="all" class="' + (filter === 'all' ? 'on' : '') + '">전체</button>';
    Object.keys(C.DIFFICULTIES).forEach(function (k) { h += '<button type="button" data-m="rank-filter" data-f="' + k + '" class="' + (filter === k ? 'on' : '') + '">' + C.DIFFICULTIES[k].name + '</button>'; });
    h += '</div>';
    var list = meta.ranking.filter(function (x) { return filter === 'all' || x.difficulty === filter; }).slice(0, 20);
    if (!list.length) h += '<div class="empty">아직 기록이 없어요. 첫 경기를 시작해 보세요!</div>';
    else {
      h += '<div style="overflow-x:auto"><table class="table"><tr><th>#</th><th>점수</th><th>웨이브</th><th>결과</th><th>난이도</th><th>처치</th><th>주력 선수</th><th>날짜</th></tr>';
      list.forEach(function (x, i) {
        var d = new Date(x.date);
        h += '<tr><td>' + (i + 1) + '</td><td><b>' + fmt(x.score) + '</b></td><td>' + x.wave + (x.mode === 'infinite' ? ' ∞' : '') + '</td><td>' + (x.result === 'clear' ? '🏆 우승' : '패배') + '</td><td>' + C.DIFFICULTIES[x.difficulty].name + '</td><td>' + fmt(x.kills) + '</td><td>' + (x.squad || []).map(function (id) { return BY_ID[id] ? pc(id, 22) : ''; }).join(' ') + '</td><td>' + (d.getMonth() + 1) + '/' + d.getDate() + '</td></tr>';
      });
      h += '</table></div>';
    }
    this.showModal('records', '📊 기록실', h);
  };

  /* 설정 */
  U.modal_settings = function () {
    var o = this.app.meta.options;
    var slider = function (key, label) { return '<div class="set-row"><label>' + label + '</label><input type="range" min="0" max="1" step="0.05" value="' + o[key] + '" data-set="' + key + '"></div>'; };
    var h = slider('master', '전체 음량') + slider('bgm', '관중 함성 (배경음)') + slider('sfx', '효과음');
    h += '<div class="set-row"><label>음소거</label><input type="checkbox" data-set="mute"' + (o.mute ? ' checked' : '') + '></div>';
    h += '<div class="set-row"><label>그래픽 품질 <small>자동: 프레임이 떨어지면 효과를 줄입니다</small></label><select data-set="quality">' +
      [['auto', '자동'], ['high', '높음'], ['medium', '보통'], ['low', '낮음 (저사양)']].map(function (q) { return '<option value="' + q[0] + '"' + (o.quality === q[0] ? ' selected' : '') + '>' + q[1] + '</option>'; }).join('') + '</select></div>';
    h += '<div class="set-row"><label>선수 강조 <small>잔디를 어둡게 하고 배치칸·선수 테두리를 강조해 선수가 잘 보이게 합니다</small></label><input type="checkbox" data-set="unitHighlight"' + (o.unitHighlight !== false ? ' checked' : '') + '></div>';
    h += '<div class="set-row"><label>피해 숫자 표시</label><input type="checkbox" data-set="dmgNumbers"' + (o.dmgNumbers ? ' checked' : '') + '></div>';
    h += '<div class="set-row"><label>데이터 초기화 <small>도감·기록·트로피·저장 경기 모두 삭제</small></label><button type="button" class="btn danger small" data-m="reset-data">초기화</button></div>';
    this.showModal('settings', '⚙️ 설정', h, { narrow: true });
  };
  U.settingChange = function (key, v) {
    var o = this.app.meta.options; o[key] = v;
    this.app.applyOptions(); this.app.saveMeta();
  };

  /* 게임 방법 */
  U.modal_help = function () {
    var h = '<div class="help">' +
      '<h4>목표</h4><p>원정 군단이 경기장 트랙을 끝없이 돕니다. <b>경기장에 적이 150명을 넘으면 패배</b>, 5웨이브마다 등장하는 <b>보스를 120초 안에 쓰러뜨리지 못해도 패배</b>입니다. 정규 모드는 40웨이브를 버티면 우승하고 무한 모드가 열립니다.</p>' +
      '<h4>영입 (소환)</h4><p>45골드(또는 영입권)로 무작위 선수를 영입합니다. 확률 — 노멀 49.9% · 레어 28% · 유니크 14% · 에픽 6% · 전설 1.57% · 신화 0.43% · 초월 0.1%. 초월(지단 · 반 바스텐 등 레전드 7인)은 영입 · 조합으로, 태초(베켄바우어 · 크루이프 등 레전드 11인)는 조합으로만, <b>히든 레전드 4인(메시 · 호날두 · 펠레 · 마라도나)은 비밀 조합으로만</b> 얻습니다. 영입 버튼을 길게 누르고 있으면 2초마다 자동으로 영입합니다. 3,000골드로 원하는 전설 선수를 지정 영입할 수도 있습니다.</p>' +
      '<h4>합성 · 조합</h4><p><b>같은 선수 3명</b>(에픽 이하)을 합성하면 한 단계 위 등급의 무작위 선수가 됩니다. <b>조합</b>은 소속팀·대표팀 인연이 있는 특정 선수들을 모아 원하는 상위 선수를 확정으로 만듭니다. 히든 레전드 4인은 <b>비밀 조합</b>으로만 얻을 수 있고 재료는 공개되지 않아요. 알맞은 선수들이 경기장에 모이면 「조합 가능」에 나타납니다.</p>' +
      '<h4>배치</h4><p>영입한 선수는 화면 맨 윗줄 · 맨 왼쪽 칸부터 차례로 배치됩니다. 드래그로 위치를 바꾸세요(일시정지 중에도 가능). 사거리가 짧은 드리블러·수비수는 트랙 옆에, 사거리가 긴 피니셔·중거리 슈터는 안쪽에 두는 것이 좋습니다. 패스 스타일은 주변 아군 공격속도를, 리더십 스타일은 주변 아군 공격력을 올려 줍니다.</p>' +
      '<h4>선수 능력</h4><ul><li><b>기본 공격</b>: 포지션에 따른 공격 방식(피니셔·드리블러·플레이메이커·윙백·골키퍼 등)</li><li><b>플레이 스타일</b>: 결정력·드리블·스피드·패스·강슛·제공권·태클·압박·체력·리더십·빅게임·선방·세트피스</li><li><b>확률 스킬</b>: 공격할 때마다 확률로 발동하는 선수 고유 기술</li><li><b>패시브</b>: 전설 이상 선수의 고유 능력 (예: 뎀벨레의 양발 공격, 메시의 팀 전체 버프)</li></ul>' +
      '<h4>경제</h4><p>적 처치·웨이브 보상·긴급 임무로 골드를 얻습니다. <b>등급 강화</b>는 해당 등급 선수 전체의 공격력(단계당 ×1.23)·공속·사거리·치명을 올립니다. 필요 없는 등급은 일괄 판매하거나 자동 판매를 켜세요.</p>' +
      '<h4>트로피 캐비닛</h4><p>웨이브를 클리어할 때마다 트로피 토큰을 얻고, 캐비닛에서 트로피를 뽑아 영구 능력치를 올릴 수 있습니다.</p>' +
      '<h4>단축키</h4><p>Q 영입 · W 10회 영입 · Shift+W 지정 영입 · S 등급 판매 · E 합성 · F 등급 강화 · R 조합 · 1/2/3 배속 · Space 일시정지 · Esc 메뉴<br>선택한 선수: Delete 판매 · L 잠금 · M 합성</p></div>';
    this.showModal('help', '❓ 게임 방법', h);
  };

  /* 사진 출처 */
  U.modal_credits = function () {
    var cr = F.PHOTO_CREDITS || {};
    var h = '<p class="hint">선수 명단: <a href="https://www.theguardian.com/football/ng-interactive/2025/dec/16/the-100-best-male-footballers-in-the-world-2025" target="_blank" rel="noopener">The Guardian — The 100 best male footballers in the world 2025</a> (1~50위, 메시 제외 · 52위 찰하놀루 편입 → 신화 이하 등급). 초월 · 태초 · 히든은 역대 레전드. 게임 방식 모티브: 랜덤 과학 인물 디펜스.</p>';
    h += '<p class="hint">선수 사진은 모두 위키미디어 공용(Wikimedia Commons)의 자유 라이선스 이미지이며, 각 저작자와 라이선스는 아래와 같습니다. 원형으로 잘라 사용했습니다.</p>';
    h += '<div style="overflow-x:auto"><table class="table"><tr><th></th><th>선수</th><th>저작자</th><th>라이선스</th><th>원본</th></tr>';
    F.PLAYERS.forEach(function (p) {
      var c = cr[p.id]; if (!c) return;
      h += '<tr><td>' + pc(p.id, 24) + '</td><td>' + esc(p.name) + '</td><td style="white-space:normal;max-width:260px">' + esc(c.author) + '</td><td>' + esc(c.license) + '</td><td><a href="' + esc(c.source) + '" target="_blank" rel="noopener">보기</a></td></tr>';
    });
    h += '</table></div>';
    this.showModal('credits', '📷 사진 출처 · 라이선스', h);
  };

  /* 인게임: 판매 */
  U.modal_sell = function () {
    var g = this.game(), s = g.s; if (!s) return;
    var h = '<div class="card-h">등급 이하 일괄 판매 <small>잠긴 선수 · 히든 선수는 제외</small></div><div class="list">';
    for (var t = 0; t <= 4; t++) {
      var units = s.units.filter(function (u) { var d = BY_ID[u.id]; return !u.locked && !d.hidden && d.tier <= t; });
      var gold = units.reduce(function (a, u) { return a + g.sellValue(u); }, 0);
      h += '<div class="row"><div class="grow"><div class="t">' + tierTag(t) + ' ' + C.TIERS[t].name + ' 이하 판매</div><div class="s">' + units.length + '명 · +' + fmt(gold) + ' 골드</div></div><button type="button" class="btn small" data-m="sell-tier" data-t="' + t + '"' + (units.length ? '' : ' disabled') + '>판매</button></div>';
    }
    h += '</div><div class="card-h" style="margin-top:14px">자동 판매 <small>영입 즉시 해당 등급 이하 판매</small></div><div class="tabs">';
    h += '<button type="button" data-m="auto-sell" data-t="-1" class="' + (s.autoSellTier === null ? 'on' : '') + '">끄기</button>';
    for (var k = 0; k <= 4; k++) h += '<button type="button" data-m="auto-sell" data-t="' + k + '" class="' + (s.autoSellTier === k ? 'on' : '') + '">' + C.TIERS[k].name + ' 이하</button>';
    h += '</div><p class="hint">판매 가격: ' + C.SELL_VALUES.slice(0, 9).map(function (v, i) { return C.TIERS[i].name + ' ' + Math.round(v * (1 + g.fx.sellBonus)); }).join(' · ') + '</p>';
    this.showModal('sell', '등급 판매', h, { narrow: true, live: true, pause: true });
  };

  /* 인게임: 강화 */
  U.modal_upgrade = function () {
    var g = this.game(), s = g.s; if (!s) return;
    var h = '<p class="hint">단계마다 해당 등급 선수 전체 공격력 ×1.23 · 공속 +3.5% · 사거리 +1.5% · 치명 +0.9%p</p><div class="list">';
    for (var t = 0; t <= 8; t++) {
      var lv = s.upgrades[t], max = C.MAX_UP[t], cost = g.upgradeCost(t), n = s.units.filter(function (u) { return BY_ID[u.id].tier === t; }).length;
      h += '<div class="row"><div class="grow"><div class="t">' + tierTag(t) + ' Lv.' + lv + ' <small>/ ' + max + '</small></div><div class="s">배치 ' + n + '명 · 공격력 ×' + Math.pow(1.23, lv).toFixed(2) + '</div></div>' +
        '<button type="button" class="btn small ' + (s.gold >= cost && lv < max ? 'primary' : '') + '" data-m="upgrade" data-t="' + t + '"' + (lv >= max || s.gold < cost ? ' disabled' : '') + '>' + (lv >= max ? '최대' : '강화 · ' + fmt(cost)) + '</button></div>';
    }
    h += '</div>';
    this.showModal('upgrade', '등급 강화', h, { narrow: true, live: true, keepScroll: true });
  };

  /* 인게임/도감: 조합 */
  U.modal_craft = function (st) {
    var g = this.game(), meta = this.app.meta, tab = st.tab === undefined ? 5 : +st.tab;
    var h = '<p class="hint" style="margin-top:0">신화 = 전설 3 · 초월 = 신화 2 + 전설 1 · 태초 = 초월 2 + 신화 2 · 히든 = 비밀 조합 (전설은 영입 · 합성 · 지정 영입으로 획득)</p><div class="tabs">';
    [5, 6, 7, 8].forEach(function (t) { h += '<button type="button" data-m="craft-tab" data-tab="' + t + '" class="' + (tab === t ? 'on' : '') + '">' + tierText(t) + (t === 8 ? ' (비밀)' : '') + '</button>'; });
    h += '</div><div class="list">';
    F.RECIPES.filter(function (r) { return BY_ID[r.id].tier === tab; }).forEach(function (r) {
      var def = BY_ID[r.id], stt = g.recipeStatus(r.id), known = !r.secret || meta.discovered.indexOf(r.id) >= 0, ready = stt.ok;
      var dim = r.secret && meta.unlocked.indexOf(r.id) < 0 ? ';filter:grayscale(1) brightness(.35)' : '';
      h += '<div class="row"><div>' + pc(r.id, 46, dim) + '</div><div class="grow"><div class="t">' + esc(def.name) + ' ' + tierTag(def.tier) + '</div>';
      if (known || ready) {
        h += '<div>' + stt.materials.map(function (m) { return '<span class="mat ' + (m.owned >= m.count ? 'have' : '') + '">' + pc(m.id, 20) + esc(BY_ID[m.id].name) + ' ' + Math.min(m.owned, m.count) + '/' + m.count + '</span>'; }).join('') + '</div>';
        h += '<div class="s">' + esc(r.relation) + '</div>';
      } else h += '<div class="s">재료 비공개 · 아직 발견하지 못한 비밀 조합입니다.</div>';
      h += '</div><button type="button" class="btn small ' + (ready ? 'primary' : '') + '" data-m="craft" data-id="' + r.id + '"' + (ready ? '' : ' disabled') + '>조합</button></div>';
    });
    h += '</div><p class="hint" style="margin-top:10px">재료는 경기장에 배치된 잠기지 않은 선수에서 소모됩니다. 결과 선수는 첫 번째 재료 자리에 배치됩니다.</p>';
    this.showModal('craft', '🧪 조합하기', h, { live: true, keepScroll: true, pause: true });
  };

  /* 인게임: 지정 영입 */
  U.modal_designated = function () {
    var g = this.game(), s = g.s; if (!s) return;
    var h = '<p class="hint">' + fmt(C.DESIGNATED_SUMMON_COST) + ' 골드로 원하는 전설 선수를 확정 영입합니다. 보유 골드 ' + fmt(s.gold) + '</p><div class="grid-cards">';
    F.PLAYERS.filter(function (p) { return p.tier === 4 && !p.hidden; }).forEach(function (p) {
      var n = s.units.filter(function (u) { return u.id === p.id; }).length;
      h += '<div class="pc" data-m="designate" data-id="' + p.id + '">' + pc(p.id, 60) + '<div class="nm">' + esc(p.name) + '</div><div class="sub">' + C.STYLES[p.style].icon + ' ' + esc(p.passive.name) + (n ? ' · 보유 ' + n : '') + '</div></div>';
    });
    h += '</div>';
    this.showModal('designated', '지정 영입 · 전설', h, { live: true, keepScroll: true });
  };

  /* 인게임 메뉴 */
  U.modal_menu = function () {
    var g = this.game(); if (!g.s) return;
    var h = '<div class="list">' +
      '<button type="button" class="btn big primary" data-m="menu-resume">▶ 계속하기</button>' +
      '<button type="button" class="btn" data-m="menu-open" data-name="codex">📖 선수 도감</button>' +
      '<button type="button" class="btn" data-m="menu-open" data-name="help">❓ 게임 방법</button>' +
      '<button type="button" class="btn" data-m="menu-open" data-name="settings">⚙️ 설정</button>' +
      '<button type="button" class="btn" data-m="menu-title">💾 저장 후 타이틀로</button>' +
      '<button type="button" class="btn danger" data-m="menu-forfeit">🏳️ 경기 포기</button></div>';
    this.showModal('menu', '일시정지 메뉴', h, { narrow: true, pause: true });
  };

  /* 결과 */
  U.modal_result = function () {
    var g = this.game(), s = g.s, win = s.phase === 'clear';
    var reason = { overcrowding: '원정 군단이 경기장을 점령했습니다 (적 150명 초과)', boss_timeout: '보스를 제한 시간 안에 쓰러뜨리지 못했습니다', forfeit: '경기를 포기했습니다' }[s.lossReason] || '';
    var h = '<div class="result-head ' + (win ? 'win' : 'lose') + '"><div class="big">' + (win ? '🏆 우승!' : '경기 종료') + '</div><div class="hint">' + (win ? '정규 40웨이브를 모두 막아냈습니다! 무한 모드가 열렸어요.' : esc(reason)) + '</div></div>';
    h += '<div class="stat-grid"><div><small>도달 웨이브</small><b>' + s.wave + '</b></div><div><small>점수</small><b>' + fmt(s.score) + '</b></div><div><small>처치</small><b>' + fmt(s.stats.kills) + '</b></div><div><small>최고 DPS</small><b>' + fmt(s.peakDps) + '</b></div>' +
      '<div><small>경기 시간</small><b>' + mmss(s.time) + '</b></div><div><small>트로피 토큰</small><b>+' + s.tokensEarned + '</b></div><div><small>임무 성공</small><b>' + s.stats.missions + '</b></div><div><small>최고 연승</small><b>' + s.bestStreak + '</b></div></div>';
    var mvp = g.mvp(5);
    if (mvp.length) {
      h += '<div class="card-h" style="margin-top:6px">MVP</div><div class="list">';
      mvp.forEach(function (m, i) { var d = BY_ID[m.id]; h += '<div class="row"><b style="width:18px">' + (i + 1) + '</b>' + pc(m.id, 36) + '<div class="grow"><div class="t">' + esc(d.name) + ' ' + tierTag(d.tier) + '</div><div class="s">누적 피해 ' + fmt(m.dealt) + '</div></div></div>'; });
      h += '</div>';
    }
    h += '<div class="btn-row"><button type="button" class="btn" data-m="result-title">타이틀로</button><button type="button" class="btn primary" data-m="result-retry">다시 하기</button><button type="button" class="btn" data-m="menu-open" data-name="relics">🏆 트로피 캐비닛</button></div>';
    this.showModal('result', win ? '우승' : '경기 결과', h, { narrow: true, locked: true });
  };

  U.modalAction = function (act, d) {
    var g = this.game(), self = this, r, au = this.app.audio;
    au.ui();
    switch (act) {
      case 'confirm-no': this.closeModal(); break;
      case 'confirm-yes': var fn = this._confirmOk; this._confirmOk = null; this.closeModal(); if (fn) fn(); break;
      case 'codex-tab': this.open('codex', { tab: d.tab }); break;
      case 'player': this.open('player', { id: d.id, backTab: this.modalState.tab }); break;
      case 'codex-back': this.open('codex', { tab: this.modalState.backTab }); break;
      case 'relic-draw':
        r = g.summonRelics(+d.n);
        if (r.error) { this.toast(r.error, 'err'); break; }
        if (r.results.some(function (x) { return x.rarity >= 4; })) au.cheer(1); else au.coin();
        this.app.saveMeta(); this.open('relics', { results: r.results, keep: true });
        break;
      case 'relic-up':
        r = g.upgradeRelic(d.id);
        if (r.error) { this.toast(r.error, 'err'); break; }
        au.merge(); this.app.saveMeta(); this.open('relics', { results: this.modalState.results, keep: true });
        break;
      case 'rank-filter': this.open('records', { filter: d.f }); break;
      case 'reset-data':
        this.confirm('데이터 초기화', '도감·기록·트로피·저장된 경기가 모두 삭제됩니다. 되돌릴 수 없어요.', '모두 삭제', function () { self.app.resetData(); });
        break;
      case 'sell-tier':
        r = g.sellThroughTier(+d.t); if (r.error) this.toast(r.error, 'err');
        this.refreshModal();
        break;
      case 'auto-sell':
        g.setAutoSellTier(+d.t < 0 ? null : +d.t);
        this.toast(+d.t < 0 ? '자동 판매를 껐어요' : '자동 판매: ' + C.TIERS[+d.t].name + ' 이하', 'info');
        this.refreshModal();
        break;
      case 'upgrade':
        r = g.upgrade(+d.t); if (r.error) { this.toast(r.error, 'err'); au.error(); }
        this.refreshModal();
        break;
      case 'craft-tab': this.open('craft', { tab: d.tab }); break;
      case 'craft':
        if (this.doCraft(d.id)) this.closeModal(); else this.refreshModal();
        break;
      case 'designate':
        var def = BY_ID[d.id];
        this.confirm('지정 영입', def.name + ' 선수를 ' + fmt(C.DESIGNATED_SUMMON_COST) + ' 골드에 영입할까요?', '영입', function () {
          var res = g.designatedSummon(d.id); if (res.error) self.toast(res.error, 'err');
        });
        break;
      case 'menu-resume': this.closeModal(); break;
      case 'menu-open': this.open(d.name); break; // 메뉴에서 연 창을 닫을 때 재개된다
      case 'menu-title': this.autoPaused = false; this.closeModal(); this.app.toTitle(true); break; // 일시정지 상태로 저장
      case 'menu-forfeit':
        this.confirm('경기 포기', '경기를 포기하면 지금까지의 기록으로 결과가 정산됩니다.', '포기', function () { g.s.paused = false; toggle(self.els.pausedMask, 'hidden', true); self.els.btnPause.textContent = '❚❚'; g.gameOver('forfeit'); });
        break;
      case 'result-retry': var s = g.s, mode = s.mode, diff = s.difficulty; this.closeModal(); this.app.startGame(mode, diff); break;
      case 'result-title': this.closeModal(); this.app.toTitle(false); break;
    }
  };

  F.UI = UI;
})(window);
