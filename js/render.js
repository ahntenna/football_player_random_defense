/*
 * 캔버스 렌더러
 * - 배경 레이어(bg): 관중석 · 조명탑 · 광고판 · 트랙 · 피치 · 배치칸 → 리사이즈 때만 다시 그림
 * - 동적 레이어(fx): 선수 · 적 · 공(투사체) · 이펙트 · 피해 숫자 → 매 프레임
 * - 스프라이트 캐시 + 고정 크기 오브젝트 풀로 GC/드로우 비용 최소화
 */
(function (root) {
  'use strict';
  var F = root.FPRD = root.FPRD || {};
  var C = F.C, GEO = F.GEO, BY_ID = F.BY_ID;
  var TAU = Math.PI * 2;

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
    g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
    g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath();
  }
  F.rr = rr;

  function seeded(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ───────── 풀 ───────── */
  function Pool(n, make) { this.items = []; for (var i = 0; i < n; i++) { var o = make(); o.on = false; this.items.push(o); } this.cursor = 0; }
  Pool.prototype.get = function () {
    var it = this.items, n = it.length;
    for (var k = 0; k < n; k++) { var i = (this.cursor + k) % n; if (!it[i].on) { this.cursor = (i + 1) % n; it[i].on = true; return it[i]; } }
    var o = it[this.cursor]; this.cursor = (this.cursor + 1) % n; o.on = true; return o; // 가장 오래된 것 재사용
  };

  function Renderer(bg, fx) {
    this.bg = bg; this.fx = fx;
    this.g = fx.getContext('2d'); this.bgG = bg.getContext('2d');
    this.game = null;
    this.W = 0; this.H = 0; this.dpr = 1; this.scale = 10; this.ox = 0; this.oy = 0;
    this.quality = 'high';
    this.dmgNumbers = true;
    this.highlight = true;    // 선수 강조 (어두운 배치칸 · 외곽 글로)
    this.time = 0;
    this.unitSprites = {}; this.enemySprites = {};
    this.selected = null; this.drag = null; this.hoverSlot = -1;
    this.mergeable = {};
    this.anim = {};           // uid -> 공격 반동 타이머
    this.newbie = {};         // uid -> 등장 연출 타이머
    this.balls = new Pool(180, function () { return { x0: 0, y0: 0, x1: 0, y1: 0, t: 0, dur: 0.2, col: '#fff', mode: '', r: 0, big: false }; });
    this.effects = new Pool(160, function () { return { type: '', x: 0, y: 0, x2: 0, y2: 0, r: 0, t: 0, dur: 0.3, col: '#fff', text: '', pts: [], w: 1 }; });
    this.numbers = new Pool(70, function () { return { x: 0, y: 0, t: 0, dur: 0.8, text: '', col: '#fff', size: 12 }; });
    this.numbersThisFrame = 0;
    this.shake = 0;
    this.ballSprite = null;
    this.crowdFlashes = [];
  }
  var R = Renderer.prototype;

  R.setGame = function (game) { this.game = game; this.selected = null; this.drag = null; this.anim = {}; this.newbie = {}; this.clearPools(); };
  R.clearPools = function () {
    [this.balls, this.effects, this.numbers].forEach(function (p) { p.items.forEach(function (o) { o.on = false; }); });
  };

  R.setQuality = function (q) {
    this.quality = q;
    this.resize(true);
  };
  R.setHighlight = function (on) {
    if (this.highlight === !!on) return;
    this.highlight = !!on;
    if (this.W) this.resize(true); // 배경 · 스프라이트 캐시를 다시 만든다
  };

  R.resize = function (force) {
    var rect = this.fx.parentNode.getBoundingClientRect();
    var w = Math.max(200, Math.floor(rect.width)), h = Math.max(160, Math.floor(rect.height));
    var dpr = Math.min(this.quality === 'low' ? 1 : 2, root.devicePixelRatio || 1);
    if (!force && w === this.cssW && h === this.cssH && dpr === this.dpr) return;
    this.cssW = w; this.cssH = h; this.dpr = dpr;
    this.W = Math.round(w * dpr); this.H = Math.round(h * dpr);
    [this.bg, this.fx].forEach(function (c) { c.width = this.W; c.height = this.H; c.style.width = w + 'px'; c.style.height = h + 'px'; }, this);
    // 좁은 화면(모바일)에서는 관중석 여백을 줄여 트랙·선수를 크게 보여준다
    var narrow = w < 560, vw = narrow ? GEO.TRACK.hw + 1.35 : GEO.WORLD.hw, vh = narrow ? GEO.TRACK.hh + 1.3 : GEO.WORLD.hh;
    this.scale = Math.min(this.W / (vw * 2), this.H / (vh * 2));
    this.ox = this.W / 2; this.oy = this.H / 2;
    this.unitSprites = {}; this.enemySprites = {};
    this.ballSprite = this.makeBall(Math.max(6, Math.round(0.34 * this.scale)));
    this.drawBackground();
  };

  R.sx = function (x) { return this.ox + x * this.scale; };
  R.sy = function (z) { return this.oy + z * this.scale; };
  R.toWorld = function (cssX, cssY) { return { x: (cssX * this.dpr - this.ox) / this.scale, z: (cssY * this.dpr - this.oy) / this.scale }; };
  R.slotAt = function (cssX, cssY) {
    var p = this.toWorld(cssX, cssY), S = GEO.SLOTS;
    for (var i = 0; i < S.length; i++) if (Math.abs(p.x - S[i].x) <= 1.25 && Math.abs(p.z - S[i].z) <= 1.1) return i;
    return -1;
  };

  /* ═════════════ 배경 ═════════════ */
  R.drawBackground = function (opts) {
    var g = this.bgG, W = this.W, H = this.H, s = this.scale, self = this, T = GEO.TRACK, P = GEO.PITCH;
    opts = opts || {};
    var X = function (x) { return self.ox + x * s; }, Y = function (z) { return self.oy + z * s; };
    var rnd = seeded(20251216);

    // 밤하늘 + 관중석 기본색
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#08101d'); sky.addColorStop(0.5, '#0c1626'); sky.addColorStop(1, '#070d18');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    // 관중석 계단(스탠드) 링
    for (var k = 7; k >= 0; k--) {
      var pad = 1.25 + k * 0.62;
      rr(g, X(-T.hw - pad), Y(-T.hh - pad), (T.hw + pad) * 2 * s, (T.hh + pad) * 2 * s, (T.r + pad) * s);
      g.fillStyle = k % 2 ? '#111c2e' : '#0e1828'; g.fill();
    }
    // 관중 (정적 점묘)
    var step = Math.max(3, Math.round(s * 0.2)), dot = Math.max(1.5, step * 0.62);
    var palette = ['#2754c9', '#e8edf5', '#d33a3a', '#f2c230', '#1d2a44', '#3fa0ff', '#ff7a45', '#c9d4e3', '#152035'];
    var inner = { hw: T.hw + 1.2, hh: T.hh + 1.2, r: T.r + 1.2 };
    for (var yy = 0; yy < H; yy += step) {
      for (var xx = 0; xx < W; xx += step) {
        var wx = (xx - this.ox) / s, wz = (yy - this.oy) / s;
        if (insideRR(wx, wz, inner)) continue;
        if (rnd() < 0.18) continue;
        g.globalAlpha = 0.35 + rnd() * 0.45;
        g.fillStyle = palette[(rnd() * palette.length) | 0];
        g.fillRect(xx + rnd() * 1.5, yy + rnd() * 1.5, dot, dot);
      }
    }
    g.globalAlpha = 1;

    // 광고판 (LED 보드)
    var boardH = 0.34 * s;
    rr(g, X(-T.hw - 1.05), Y(-T.hh - 1.05), (T.hw + 1.05) * 2 * s, (T.hh + 1.05) * 2 * s, (T.r + 1.05) * s);
    g.lineWidth = boardH; g.strokeStyle = '#0a1322'; g.stroke();
    g.lineWidth = Math.max(1, boardH * 0.12); g.strokeStyle = 'rgba(95,240,220,.35)'; g.stroke();
    g.fillStyle = 'rgba(210,255,245,.75)'; g.font = '700 ' + Math.round(boardH * 0.62) + 'px "Black Han Sans","Malgun Gothic",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    ['FOOTBALL PLAYER RANDOM DEFENSE', 'THE GUARDIAN TOP 50 · 2025', '⚽ FPRD ⚽'].forEach(function (t, i) {
      g.fillText(t, X(-6 + i * 6), Y(-T.hh - 1.05));
      g.fillText(t, X(6 - i * 6), Y(T.hh + 1.05));
    });

    // 트랙 (타탄)
    rr(g, X(-T.hw), Y(-T.hh), T.hw * 2 * s, T.hh * 2 * s, T.r * s);
    g.lineWidth = 2 * s; g.strokeStyle = '#9c3f2c'; g.stroke();
    g.lineWidth = 1.7 * s; g.strokeStyle = '#ad4a33'; g.stroke();
    [-1, -0.5, 0, 0.5, 1].forEach(function (o) {
      rr(g, X(-T.hw - o), Y(-T.hh - o), (T.hw + o) * 2 * s, (T.hh + o) * 2 * s, (T.r + o) * s);
      g.lineWidth = Math.max(1, s * (o === -1 || o === 1 ? 0.07 : 0.035));
      g.strokeStyle = o === -1 || o === 1 ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.28)'; g.stroke();
    });
    // 원정팀 입장 게이트 (시작점)
    var gx = X(-T.hw + T.r), gz = Y(-T.hh);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(gx - s * 0.05, gz - s, s * 0.1, s * 2);
    g.fillStyle = '#ff5b5b'; g.font = '800 ' + Math.round(s * 0.42) + 'px "Black Han Sans","Malgun Gothic",sans-serif';
    g.fillText('AWAY ▶', gx + s * 1.25, gz - s * 1.52);

    // 트랙 안쪽 잔디 여백
    var hl = this.highlight; // 선수 강조: 잔디를 야간 톤으로 낮춰 초상과 대비를 키운다
    rr(g, X(-T.hw + 1), Y(-T.hh + 1), (T.hw - 1) * 2 * s, (T.hh - 1) * 2 * s, (T.r - 1) * s);
    g.fillStyle = hl ? '#173f22' : '#1f5a2c'; g.fill();

    // 피치 (잔디 줄무늬)
    var px0 = X(-P.hw), py0 = Y(-P.hh), pw = P.hw * 2 * s, ph = P.hh * 2 * s, bands = 14;
    for (var b = 0; b < bands; b++) {
      g.fillStyle = hl ? (b % 2 ? '#1e5530' : '#235e35') : (b % 2 ? '#2b7a39' : '#318642');
      g.fillRect(px0 + pw * b / bands, py0, pw / bands + 1, ph);
    }
    // 조명 하이라이트
    var glow = g.createRadialGradient(X(0), Y(0), s, X(0), Y(0), s * 13);
    glow.addColorStop(0, hl ? 'rgba(255,255,230,.05)' : 'rgba(255,255,230,.10)'); glow.addColorStop(1, 'rgba(0,0,0,.22)');
    g.fillStyle = glow; g.fillRect(px0, py0, pw, ph);

    // 라인
    g.strokeStyle = 'rgba(255,255,255,.82)'; g.lineWidth = Math.max(1, s * 0.075);
    g.strokeRect(px0, py0, pw, ph);
    g.beginPath(); g.moveTo(X(0), py0); g.lineTo(X(0), py0 + ph); g.stroke();
    g.beginPath(); g.arc(X(0), Y(0), 1.64 * s, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(X(0), Y(0), s * 0.1, 0, TAU); g.fill();
    [-1, 1].forEach(function (side) {
      var gl = side * P.hw;
      g.strokeRect(Math.min(X(gl), X(gl - side * 2.95)), Y(-3.6), 2.95 * s, 7.2 * s);
      g.strokeRect(Math.min(X(gl), X(gl - side * 0.98)), Y(-1.64), 0.98 * s, 3.28 * s);
      var spot = gl - side * 1.97;
      g.beginPath(); g.arc(X(spot), Y(0), s * 0.08, 0, TAU); g.fill();
      var a0 = Math.acos((2.95 - 1.97) / 1.64);
      g.beginPath();
      if (side < 0) g.arc(X(spot), Y(0), 1.64 * s, -a0, a0); else g.arc(X(spot), Y(0), 1.64 * s, Math.PI - a0, Math.PI + a0);
      g.stroke();
      // 골대 + 그물
      var gx0 = side < 0 ? X(gl - 0.6) : X(gl), gw = 0.6 * s;
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(gx0, Y(-0.66), gw, 1.32 * s);
      g.save(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
      for (var n = 0; n <= 6; n++) { g.beginPath(); g.moveTo(gx0, Y(-0.66 + n * 0.22)); g.lineTo(gx0 + gw, Y(-0.66 + n * 0.22)); g.stroke(); }
      g.restore();
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(1.5, s * 0.1); g.strokeRect(gx0, Y(-0.66), gw, 1.32 * s);
      g.strokeStyle = 'rgba(255,255,255,.82)'; g.lineWidth = Math.max(1, s * 0.075);
    });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      g.beginPath(); g.arc(X(c[0] * P.hw), Y(c[1] * P.hh), s * 0.2, 0, TAU); g.stroke();
      g.fillStyle = '#ffd23f'; g.fillRect(X(c[0] * P.hw) - 1, Y(c[1] * P.hh) - s * 0.5, 2, s * 0.5);
    });
    // 센터 서클 엠블럼
    g.globalAlpha = 0.09; g.fillStyle = '#fff';
    g.font = '400 ' + Math.round(s * 1.05) + 'px "Black Han Sans","Malgun Gothic",sans-serif';
    g.fillText('FPRD', X(0), Y(0)); g.globalAlpha = 1;

    // 조명탑
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) {
      var lx = X(c[0] * (GEO.WORLD.hw - 0.55)), ly = Y(c[1] * (GEO.WORLD.hh - 0.45));
      var lg = g.createRadialGradient(lx, ly, 0, lx, ly, s * 9);
      lg.addColorStop(0, hl ? 'rgba(255,250,215,.13)' : 'rgba(255,250,215,.20)'); lg.addColorStop(1, 'rgba(255,250,215,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1b2436'; rr(g, lx - s * 0.55, ly - s * 0.32, s * 1.1, s * 0.64, s * 0.1); g.fill();
      g.fillStyle = '#fffbe0';
      for (var i = 0; i < 4; i++) for (var j = 0; j < 2; j++) g.fillRect(lx - s * 0.45 + i * s * 0.24, ly - s * 0.22 + j * s * 0.24, s * 0.17, s * 0.17);
    });

    // 배치칸 — 선수 강조 시 어두운 전술판 타일로 그려 초상이 잔디에 묻히지 않게 한다
    if (!opts.noSlots) {
      GEO.SLOTS.forEach(function (sl) {
        rr(g, X(sl.x - 1.08), Y(sl.z - 0.98), 2.16 * s, 1.96 * s, 0.22 * s);
        g.fillStyle = hl ? 'rgba(5,11,22,.6)' : 'rgba(255,255,255,.045)'; g.fill();
        g.lineWidth = Math.max(1, s * 0.03); g.strokeStyle = hl ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.13)'; g.stroke();
        if (hl) {
          g.beginPath(); g.arc(X(sl.x), Y(sl.z), 0.86 * s, 0, TAU);
          g.lineWidth = Math.max(1, s * 0.025); g.strokeStyle = 'rgba(255,255,255,.07)'; g.stroke();
        }
      });
    }
    // 비네트
    var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  };

  function insideRR(x, z, t) {
    var ax = Math.abs(x), az = Math.abs(z);
    if (ax > t.hw || az > t.hh) return false;
    var cx = t.hw - t.r, cz = t.hh - t.r;
    if (ax <= cx || az <= cz) return true;
    return (ax - cx) * (ax - cx) + (az - cz) * (az - cz) <= t.r * t.r;
  }

  /* ═════════════ 스프라이트 ═════════════ */
  R.makeBall = function (size) {
    var c = document.createElement('canvas'); c.width = c.height = size + 2;
    var g = c.getContext('2d'), r = size / 2, m = r + 1;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
    g.fillStyle = '#1a1a1a';
    pent(g, m, m, r * 0.38);
    for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * TAU / 5; pent(g, m + Math.cos(a) * r * 0.92, m + Math.sin(a) * r * 0.92, r * 0.28); }
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = Math.max(0.8, size * 0.06); g.beginPath(); g.arc(m, m, r - 0.4, 0, TAU); g.stroke();
    return c;
  };
  function pent(g, x, y, r) {
    g.beginPath();
    for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * TAU / 5; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath(); g.fill();
  }

  R.unitSize = function () { return Math.round((this.highlight ? 1.88 : 1.72) * this.scale); };

  R.unitSprite = function (id) {
    var sp = this.unitSprites[id]; if (sp) return sp;
    var def = BY_ID[id], size = this.unitSize(), pad = Math.ceil(size * 0.16), full = size + pad * 2, hl = this.highlight;
    var c = document.createElement('canvas'); c.width = c.height = full;
    var g = c.getContext('2d'), m = full / 2, r = size / 2, tier = C.TIERS[def.tier];
    // 그림자
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(m, m + r * 0.92, r * 0.85, r * 0.26, 0, 0, TAU); g.fill();
    // 선수 강조: 등급 색 글로 + 어두운 외곽 테두리 (스프라이트에 한 번만 그리므로 프레임 비용 없음)
    if (hl) {
      g.save();
      g.shadowColor = hexA(tier.color, def.tier >= 1 ? 0.85 : 0.55); g.shadowBlur = size * 0.2;
      g.fillStyle = '#050a14'; g.beginPath(); g.arc(m, m, r + Math.max(1.5, size * 0.045), 0, TAU); g.fill();
      g.restore();
    }
    // 등급 링
    var ring = Math.max(2, size * (hl ? 0.1 : 0.085));
    if (def.tier >= 5) {
      var gr = g.createLinearGradient(0, 0, full, full);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, tier.color); gr.addColorStop(1, F.shade(tier.color, -0.3));
      g.fillStyle = gr;
    } else g.fillStyle = tier.color;
    g.beginPath(); g.arc(m, m, r, 0, TAU); g.fill();
    g.drawImage(F.portrait(id, size - ring * 2), m - r + ring, m - r + ring);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(m, m, r - ring, 0, TAU); g.stroke();
    // 포지션 배지
    var pos = C.POSITIONS[def.pos], bw = size * 0.46, bh = size * 0.24;
    rr(g, m - bw / 2, m + r - bh * 0.7, bw, bh, bh / 2);
    g.fillStyle = 'rgba(8,14,24,.92)'; g.fill();
    g.lineWidth = Math.max(1, size * 0.03); g.strokeStyle = tier.color; g.stroke();
    g.fillStyle = pos.color; g.font = '800 ' + Math.round(bh * 0.72) + 'px "Black Han Sans","Malgun Gothic",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(def.hidden ? '★' + pos.short : pos.short, m, m + r - bh * 0.7 + bh / 2 + 0.5);
    this.unitSprites[id] = c;
    return c;
  };

  R.invalidateUnit = function (id) { delete this.unitSprites[id]; };

  var ENEMY_STYLE = {
    normal: { c1: '#d8423f', c2: '#8e1f24', icon: '' },
    swift: { c1: '#ff9f43', c2: '#b35b10', icon: '⚡' },
    regen: { c1: '#3fcf6a', c2: '#1b7a3a', icon: '✚' },
    armor: { c1: '#9aa7b3', c2: '#4d5a66', icon: '◆' },
    shield: { c1: '#4aa3ff', c2: '#1d5ba3', icon: '◎' },
    split: { c1: '#b16cff', c2: '#5d2aa6', icon: '✦' },
    child: { c1: '#c895ff', c2: '#6e3ab5', icon: '' },
    boss: { c1: '#1d1d1f', c2: '#f5bd4f', icon: '♛' }
  };
  R.enemySprite = function (key, sizeW) {
    var ck = key + sizeW, sp = this.enemySprites[ck]; if (sp) return sp;
    var st = ENEMY_STYLE[key] || ENEMY_STYLE.normal, size = Math.max(8, Math.round(sizeW * this.scale)), pad = Math.ceil(size * 0.2), full = size + pad * 2;
    var c = document.createElement('canvas'); c.width = c.height = full;
    var g = c.getContext('2d'), m = full / 2, r = size / 2;
    // 서브부테오 토큰 느낌: 받침 + 유니폼 원
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(m, m + r * 0.55, r * 1.02, r * 0.5, 0, 0, TAU); g.fill();
    g.fillStyle = st.c2; g.beginPath(); g.arc(m, m + r * 0.12, r, 0, TAU); g.fill();
    // 붉은 트랙 위에서도 구분되도록 밝은 테두리
    g.lineWidth = Math.max(1.2, r * 0.13); g.strokeStyle = key === 'boss' ? 'rgba(255,210,63,.95)' : 'rgba(255,255,255,.8)'; g.stroke();
    var gr = g.createLinearGradient(0, m - r, 0, m + r);
    gr.addColorStop(0, F.shade(st.c1, 0.25)); gr.addColorStop(1, st.c1);
    g.fillStyle = gr; g.beginPath(); g.arc(m, m, r * 0.88, 0, TAU); g.fill();
    if (key === 'boss') {
      g.strokeStyle = st.c2; g.lineWidth = Math.max(2, r * 0.14); g.beginPath(); g.arc(m, m, r * 0.8, 0, TAU); g.stroke();
      g.fillStyle = '#f5bd4f';
    } else {
      g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(m - r * 0.1, m - r * 0.85, r * 0.2, r * 1.7);
      g.fillStyle = '#fff';
    }
    if (st.icon) {
      g.font = '900 ' + Math.round(r * (key === 'boss' ? 1.1 : 0.95)) + 'px "Segoe UI Symbol","Malgun Gothic",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = Math.max(1, r * 0.12); g.strokeText(st.icon, m, m + 1); g.fillText(st.icon, m, m + 1);
    }
    this.enemySprites[ck] = c;
    return c;
  };

  /* ═════════════ 이벤트 → 연출 ═════════════ */
  R.onAttack = function (u, def, targets, mode, primary) {
    if (!targets.length) return;
    this.anim[u.uid] = 0.18;
    var sl = GEO.SLOTS[u.slot], col = C.STYLES[def.style].color, b = this.balls.get();
    b.x0 = sl.x; b.y0 = sl.z; b.x1 = primary.x; b.y1 = primary.z; b.t = 0;
    b.dur = mode === 'line' ? 0.14 : 0.2; b.col = col; b.mode = mode; b.big = def.tier >= 6;
    b.r = C.ROLES[def.role].radius;
    if (this.quality === 'low') return;
    if (mode === 'chain' && targets.length > 1) {
      var e = this.effects.get(); e.type = 'poly'; e.t = 0; e.dur = 0.28; e.col = col; e.w = def.tier >= 6 ? 2.2 : 1.4;
      e.pts.length = 0;
      for (var i = 0; i < targets.length && i < 12; i++) e.pts.push(targets[i].x, targets[i].z);
    } else if (mode === 'line' || mode === 'range') {
      var last = targets[targets.length - 1], l = this.effects.get();
      if (mode === 'range') { l.type = 'ring'; l.x = sl.x; l.y = sl.z; l.r = 5; l.t = 0; l.dur = 0.35; l.col = col; l.w = 3; return; }
      l.type = 'line'; l.x = sl.x; l.y = sl.z; l.x2 = last.x; l.y2 = last.z; l.t = 0; l.dur = 0.18; l.col = col; l.w = def.tier >= 6 ? 3 : 2;
    }
  };

  R.onProc = function (u, def, targets, primary) {
    var sl = GEO.SLOTS[u.slot], col = C.STYLES[def.style].color, sk = def.skill;
    var e = this.effects.get();
    e.type = 'ring'; e.t = 0; e.dur = 0.45; e.col = col; e.w = def.tier >= 7 ? 5 : 3;
    if (sk.shape === 'global') { e.x = 0; e.y = 0; e.r = 11; e.dur = 0.6; this.shake = Math.max(this.shake, 0.25); }
    else if (sk.shape === 'splash') { e.x = primary.x; e.y = primary.z; e.r = sk.radius; }
    else { e.x = primary.x; e.y = primary.z; e.r = 1.4; }
    if (sk.shape === 'line' || sk.shape === 'chain') {
      var l = this.effects.get();
      if (sk.shape === 'line' && targets.length) { var last = targets[targets.length - 1]; l.type = 'line'; l.x = sl.x; l.y = sl.z; l.x2 = last.x; l.y2 = last.z; l.w = 5; }
      else { l.type = 'poly'; l.pts.length = 0; for (var i = 0; i < targets.length && i < 14; i++) l.pts.push(targets[i].x, targets[i].z); l.w = 3; }
      l.t = 0; l.dur = 0.35; l.col = col;
    }
    var t = this.effects.get();
    t.type = 'text'; t.x = sl.x; t.y = sl.z - 1.05; t.t = 0; t.dur = 1.0; t.col = def.tier >= 8 ? '#ffd23f' : '#fff'; t.text = sk.name; t.w = def.tier >= 7 ? 1.25 : 1;
  };

  R.onPassive = function (u, name) {
    var sl = GEO.SLOTS[u.slot], def = BY_ID[u.id], t = this.effects.get();
    t.type = 'text'; t.x = sl.x; t.y = sl.z - 1.05; t.t = 0; t.dur = 0.9; t.col = C.TIERS[def.tier].color; t.text = name; t.w = 0.95;
  };

  R.onBurst = function (x, z, r, style) {
    if (this.quality === 'low') return;
    var e = this.effects.get(); e.type = 'ring'; e.x = x; e.y = z; e.r = r; e.t = 0; e.dur = 0.35; e.col = (C.STYLES[style] || {}).color || '#fff'; e.w = 3;
  };

  R.onZone = function (x, z, r, style) { this.onBurst(x, z, r, style); };

  R.onBounce = function (a, b, def) {
    if (this.quality === 'low') return;
    var l = this.effects.get(); l.type = 'line'; l.x = a.x; l.y = a.z; l.x2 = b.x; l.y2 = b.z; l.t = 0; l.dur = 0.16; l.col = C.STYLES[def.style].color; l.w = 1.2;
  };

  R.onHit = function (e, d, crit, def) {
    if (!this.dmgNumbers || this.quality === 'low') return;
    if (this.numbersThisFrame >= (this.quality === 'high' ? 6 : 3)) return;
    if (!crit && !e.boss && Math.random() > 0.12) return;
    this.numbersThisFrame++;
    var n = this.numbers.get();
    n.x = e.x + (Math.random() - 0.5) * 0.5; n.y = e.z - 0.5; n.t = 0; n.dur = 0.75;
    n.text = C.fmt(d) + (crit ? '!' : ''); n.col = crit ? '#ffd23f' : '#ffffff'; n.size = crit ? 1.15 : 0.9;
  };

  R.onKill = function (e) {
    if (this.quality === 'low' && !e.boss) return;
    var r = this.effects.get(); r.type = 'puff'; r.x = e.x; r.y = e.z; r.r = e.boss ? 3 : 0.7; r.t = 0; r.dur = e.boss ? 0.8 : 0.3; r.col = e.boss ? '#f5bd4f' : '#ffffff'; r.w = e.boss ? 4 : 1.5;
    if (e.boss) this.shake = 0.4;
  };

  R.onSeal = function (u) {
    var sl = GEO.SLOTS[u.slot], t = this.effects.get();
    t.type = 'text'; t.x = sl.x; t.y = sl.z - 1.05; t.t = 0; t.dur = 1.2; t.col = '#ff4d4d'; t.text = '🟥 퇴장!'; t.w = 1.1;
  };
  R.onFloat = function (x, z, text, col, scale) {
    var t = this.effects.get(); t.type = 'text'; t.x = x; t.y = z; t.t = 0; t.dur = 1.2; t.col = col || '#fff'; t.text = text; t.w = scale || 1;
  };
  R.onSpawnUnit = function (u) { this.newbie[u.uid] = 0.45; };

  /* ═════════════ 프레임 ═════════════ */
  R.draw = function (dt) {
    var g = this.g, game = this.game, s = this.scale, self = this;
    this.time += dt; this.numbersThisFrame = 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.W, this.H);
    if (!game || !game.s) return;
    var st = game.s;
    var shx = 0, shy = 0;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); var a = this.shake * s * 0.25; shx = (Math.random() - 0.5) * a; shy = (Math.random() - 0.5) * a; g.setTransform(1, 0, 0, 1, shx, shy); }

    // 선택 · 드래그 하이라이트
    if (this.drag && this.hoverSlot >= 0) {
      var hs = GEO.SLOTS[this.hoverSlot];
      rr(g, this.sx(hs.x - 1.08), this.sy(hs.z - 0.98), 2.16 * s, 1.96 * s, 0.22 * s);
      g.fillStyle = 'rgba(255,210,63,.18)'; g.fill(); g.strokeStyle = 'rgba(255,210,63,.8)'; g.lineWidth = 2; g.stroke();
    }
    var sel = this.selected !== null ? game.unitById(this.selected) : null;
    if (sel) {
      var ss = GEO.SLOTS[sel.slot], p = game.power(sel), sd = BY_ID[sel.id];
      g.beginPath(); g.arc(this.sx(ss.x), this.sy(ss.z), p.range * s, 0, TAU);
      g.fillStyle = hexA(C.STYLES[sd.style].color, 0.08); g.fill();
      g.setLineDash([6, 5]); g.lineWidth = 1.5; g.strokeStyle = hexA(C.STYLES[sd.style].color, 0.7); g.stroke(); g.setLineDash([]);
    }

    // 적
    var en = st.enemies, i, e;
    for (i = 0; i < en.length; i++) {
      e = en[i]; if (e.hp <= 0) continue;
      var key = e.boss ? 'boss' : e.child ? 'child' : e.elite ? e.kind : 'normal';
      var sz = e.boss ? 1.75 : e.child ? 0.58 : e.elite ? 0.95 : 0.78;
      var spr = this.enemySprite(key, sz), ex = this.sx(e.x), ey = this.sy(e.z);
      g.drawImage(spr, ex - spr.width / 2, ey - spr.height / 2);
      var rad = sz * s * 0.5;
      if (this.quality !== 'low') {
        if (e.stun > 0) { g.strokeStyle = '#ffe066'; g.lineWidth = 2; g.beginPath(); g.arc(ex, ey, rad + 3, this.time * 8, this.time * 8 + 4); g.stroke(); }
        else if (game.slowAmount(e) > 0.05) { g.strokeStyle = 'rgba(120,200,255,.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ex, ey, rad + 2, 0, TAU); g.stroke(); }
      }
      if (e.shield > 0) { g.strokeStyle = 'rgba(95,240,255,.9)'; g.lineWidth = 2.5; g.beginPath(); g.arc(ex, ey, rad + 4, 0, TAU); g.stroke(); }
      if (e.incident) {
        var pulse = 0.5 + 0.5 * Math.sin(this.time * 8);
        g.strokeStyle = 'rgba(255,210,63,' + (0.5 + pulse * 0.5) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(ex, ey, rad + 6 + pulse * 3, 0, TAU); g.stroke();
      }
      if (e.boss || e.elite || e.incident || e.hp < e.maxHp) {
        var bw = Math.max(18, sz * s * (e.boss ? 1.3 : 1.05)), bh = e.boss ? Math.max(4, s * 0.16) : Math.max(2.5, s * 0.09), by = ey - rad - bh - 4;
        g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(ex - bw / 2 - 1, by - 1, bw + 2, bh + 2);
        var ratio = Math.max(0, e.hp / e.maxHp);
        g.fillStyle = e.boss ? '#ff4d6d' : e.elite ? '#ffb347' : '#6be675';
        g.fillRect(ex - bw / 2, by, bw * ratio, bh);
        if (e.shield > 0) { g.fillStyle = 'rgba(95,240,255,.85)'; g.fillRect(ex - bw / 2, by, bw * Math.min(1, e.shield / e.maxHp), bh * 0.45); }
        if (e.boss) {
          g.font = '800 ' + Math.round(s * 0.42) + 'px "Black Han Sans","Malgun Gothic",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom';
          g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(e.name, ex, by - 3); g.fillStyle = '#ffd23f'; g.fillText(e.name, ex, by - 3);
        }
      }
    }

    // 선수
    var units = st.units, usz = this.unitSize();
    for (i = 0; i < units.length; i++) {
      var u = units[i], sl = GEO.SLOTS[u.slot];
      if (this.drag && this.drag.uid === u.uid && this.drag.moved) continue;
      var sp = this.unitSprite(u.id), ux = this.sx(sl.x), uy = this.sy(sl.z), k = 1;
      var an = this.anim[u.uid]; if (an > 0) { this.anim[u.uid] = an - dt; k = 1 + an * 0.45; }
      var nb = this.newbie[u.uid]; if (nb > 0) { this.newbie[u.uid] = nb - dt; k *= 1 + nb * 0.9; }
      var w = sp.width * k;
      g.drawImage(sp, ux - w / 2, uy - w / 2, w, w);
      var def = BY_ID[u.id];
      if (def.hidden) {
        g.strokeStyle = '#ffd23f'; g.lineWidth = Math.max(2, usz * 0.07);
        g.beginPath(); g.arc(ux, uy, usz / 2 + 2, this.time * 3, this.time * 3 + 2.2); g.stroke();
        g.beginPath(); g.arc(ux, uy, usz / 2 + 2, this.time * 3 + Math.PI, this.time * 3 + Math.PI + 2.2); g.stroke();
      }
      if (u.disabled > 0) {
        g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(ux, uy, usz / 2, 0, TAU); g.fill();
        g.fillStyle = '#e02424'; g.fillRect(ux - usz * 0.12, uy - usz * 0.2, usz * 0.24, usz * 0.34);
      }
      if (this.mergeable[u.id] && !u.locked) {
        g.fillStyle = '#39d98a'; g.beginPath(); g.arc(ux + usz * 0.38, uy - usz * 0.38, usz * 0.15, 0, TAU); g.fill();
        g.fillStyle = '#062'; g.font = '900 ' + Math.round(usz * 0.2) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('▲', ux + usz * 0.38, uy - usz * 0.38 + 1);
      }
      if (u.locked) {
        g.fillStyle = 'rgba(10,16,28,.9)'; g.beginPath(); g.arc(ux - usz * 0.38, uy - usz * 0.38, usz * 0.15, 0, TAU); g.fill();
        g.font = Math.round(usz * 0.17) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔒', ux - usz * 0.38, uy - usz * 0.37);
      }
      if (sel && sel.uid === u.uid) {
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([4, 3]);
        g.beginPath(); g.arc(ux, uy, usz / 2 + 5, 0, TAU); g.stroke(); g.setLineDash([]);
      }
    }
    if (this.drag && this.drag.moved) {
      var du = game.unitById(this.drag.uid);
      if (du) { var dsp = this.unitSprite(du.id); g.globalAlpha = 0.85; g.drawImage(dsp, this.drag.x * this.dpr - dsp.width / 2, this.drag.y * this.dpr - dsp.height / 2); g.globalAlpha = 1; }
    }

    // 공 (투사체)
    var bs = this.ballSprite, balls = this.balls.items;
    for (i = 0; i < balls.length; i++) {
      var b = balls[i]; if (!b.on) continue;
      b.t += dt;
      var f = Math.min(1, b.t / b.dur);
      if (f >= 1) {
        b.on = false;
        if (b.mode === 'splash' && this.quality !== 'low') { var ring = this.effects.get(); ring.type = 'ring'; ring.x = b.x1; ring.y = b.y1; ring.r = Math.max(0.8, b.r); ring.t = 0; ring.dur = 0.25; ring.col = b.col; ring.w = 2; }
        continue;
      }
      var bx = b.x0 + (b.x1 - b.x0) * f, bz = b.y0 + (b.y1 - b.y0) * f, lift = Math.sin(f * Math.PI) * (b.mode === 'line' ? 0.2 : 0.8);
      var px = this.sx(bx), py = this.sy(bz - lift), bsz = b.big ? bs.width * 1.35 : bs.width;
      g.drawImage(bs, px - bsz / 2, py - bsz / 2, bsz, bsz);
    }

    // 이펙트
    var fxs = this.effects.items;
    for (i = 0; i < fxs.length; i++) {
      var x = fxs[i]; if (!x.on) continue;
      x.t += dt;
      var q = x.t / x.dur; if (q >= 1) { x.on = false; continue; }
      var alpha = 1 - q;
      switch (x.type) {
        case 'ring':
          g.globalAlpha = alpha; g.strokeStyle = x.col; g.lineWidth = x.w;
          g.beginPath(); g.arc(this.sx(x.x), this.sy(x.y), Math.max(1, x.r * s * (0.35 + q * 0.65)), 0, TAU); g.stroke();
          break;
        case 'puff':
          g.globalAlpha = alpha * 0.9; g.strokeStyle = x.col; g.lineWidth = x.w;
          g.beginPath(); g.arc(this.sx(x.x), this.sy(x.y), Math.max(1, x.r * s * q), 0, TAU); g.stroke();
          break;
        case 'line':
          g.globalAlpha = alpha; g.strokeStyle = x.col; g.lineWidth = x.w * (1 + (1 - q));
          g.beginPath(); g.moveTo(this.sx(x.x), this.sy(x.y)); g.lineTo(this.sx(x.x2), this.sy(x.y2)); g.stroke();
          break;
        case 'poly':
          if (x.pts.length < 4) break;
          g.globalAlpha = alpha; g.strokeStyle = x.col; g.lineWidth = x.w * 1.5;
          g.beginPath(); g.moveTo(this.sx(x.pts[0]), this.sy(x.pts[1]));
          for (var j = 2; j < x.pts.length; j += 2) g.lineTo(this.sx(x.pts[j]), this.sy(x.pts[j + 1]));
          g.stroke();
          break;
        case 'text':
          g.globalAlpha = q < 0.8 ? 1 : (1 - q) / 0.2;
          var fs = Math.round(s * 0.46 * x.w);
          g.font = '800 ' + fs + 'px "Black Han Sans","Malgun Gothic",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          var ty = this.sy(x.y) - q * s * 0.8;
          g.lineWidth = Math.max(2, fs * 0.2); g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(x.text, this.sx(x.x), ty);
          g.fillStyle = x.col; g.fillText(x.text, this.sx(x.x), ty);
          break;
      }
    }
    g.globalAlpha = 1;

    // 피해 숫자
    var nums = this.numbers.items;
    if (nums.length) { g.textAlign = 'center'; g.textBaseline = 'middle'; }
    for (i = 0; i < nums.length; i++) {
      var n = nums[i]; if (!n.on) continue;
      n.t += dt; var nq = n.t / n.dur; if (nq >= 1) { n.on = false; continue; }
      var nfs = Math.round(s * 0.36 * n.size);
      g.font = '800 ' + nfs + 'px "Black Han Sans","Malgun Gothic",sans-serif';
      g.globalAlpha = nq < 0.7 ? 1 : (1 - nq) / 0.3;
      var nx = this.sx(n.x), ny = this.sy(n.y) - nq * s * 0.7;
      g.lineWidth = Math.max(2, nfs * 0.22); g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(n.text, nx, ny);
      g.fillStyle = n.col; g.fillText(n.text, nx, ny);
    }
    g.globalAlpha = 1;
    if (shx || shy) g.setTransform(1, 0, 0, 1, 0, 0);
  };

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  F.hexA = hexA;

  F.Renderer = Renderer;
})(window);
