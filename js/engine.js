/*
 * 게임 엔진 (DOM/Canvas 비의존 순수 로직)
 * - 고정 스텝(step)으로 진행, 이벤트는 emit(type, a, b, c, d) 로 렌더러/UI/오디오에 전달
 * - 브라우저와 Node(tools/sim.js) 모두에서 동작
 */
(function (root) {
  'use strict';
  var F = root.FPRD = root.FPRD || {};
  var C = F.C, BY_ID = F.BY_ID, PLAYERS = F.PLAYERS;

  /* ═════════════ 경기장 지오메트리 ═════════════
     적은 피치를 둘러싼 트랙(둥근 사각형)을 시계 방향으로 끝없이 돈다. */
  var TRACK = { hw: 11, hh: 8, r: 3.2 };
  var PITCH = { hw: 9.4, hh: 6.1 };
  var WORLD = { hw: 13.6, hh: 10.4 };

  function buildPolyline() {
    var pts = [], hw = TRACK.hw, hh = TRACK.hh, r = TRACK.r, seg = 12;
    function arc(cx, cz, a0, a1) {
      for (var i = 0; i <= seg; i++) {
        var a = a0 + (a1 - a0) * i / seg;
        pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
      }
    }
    pts.push([-hw + r, -hh]);
    arc(hw - r, -hh + r, -Math.PI / 2, 0);
    arc(hw - r, hh - r, 0, Math.PI / 2);
    arc(-hw + r, hh - r, Math.PI / 2, Math.PI);
    arc(-hw + r, -hh + r, Math.PI, Math.PI * 1.5);
    return pts;
  }
  var POLY = buildPolyline();
  var PATH_LENGTH = 0;
  var SEG_LEN = [];
  for (var pi = 1; pi < POLY.length; pi++) {
    var sl = Math.hypot(POLY[pi][0] - POLY[pi - 1][0], POLY[pi][1] - POLY[pi - 1][1]);
    SEG_LEN.push(sl); PATH_LENGTH += sl;
  }
  // 거리 → 좌표 룩업 테이블 (O(1) 위치 계산)
  var LUT_STEP = 0.05, LUT_N = Math.ceil(PATH_LENGTH / LUT_STEP) + 2;
  var LUT_X = new Float32Array(LUT_N), LUT_Z = new Float32Array(LUT_N);
  (function () {
    var seg = 0, acc = 0;
    for (var i = 0; i < LUT_N; i++) {
      var d = Math.min(i * LUT_STEP, PATH_LENGTH);
      while (seg < SEG_LEN.length - 1 && acc + SEG_LEN[seg] < d) { acc += SEG_LEN[seg]; seg++; }
      var t = SEG_LEN[seg] ? Math.min(1, (d - acc) / SEG_LEN[seg]) : 0;
      LUT_X[i] = POLY[seg][0] + (POLY[seg + 1][0] - POLY[seg][0]) * t;
      LUT_Z[i] = POLY[seg][1] + (POLY[seg + 1][1] - POLY[seg][1]) * t;
    }
  })();
  function setPosition(e) {
    var d = e.dist % PATH_LENGTH; if (d < 0) d += PATH_LENGTH;
    var f = d / LUT_STEP, i = f | 0, t = f - i;
    e.x = LUT_X[i] + (LUT_X[i + 1] - LUT_X[i]) * t;
    e.z = LUT_Z[i] + (LUT_Z[i + 1] - LUT_Z[i]) * t;
  }

  var COLS = [-8.75, -6.25, -3.75, -1.25, 1.25, 3.75, 6.25, 8.75];
  var ROWS = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5];
  var SLOTS = [];
  for (var si = 0; si < C.SLOT_COUNT; si++) SLOTS.push({ x: COLS[si % 8], z: ROWS[Math.floor(si / 8)] });
  // 영입한 선수는 화면 기준 맨 윗줄 · 맨 왼쪽 칸부터 차례로 채운다.
  // 가로 화면: 윗줄(z 작은 쪽)부터 왼쪽(x 작은 쪽)으로 = 칸 번호 순서
  var SLOT_ORDER = SLOTS.map(function (s, i) { return i; });
  // 세로(90° 회전) 화면: 가로 화면을 시계 방향으로 돌린 것이므로 같은 칸 번호 순서가
  // 화면의 맨 오른쪽 위 칸에서 시작해 아래로 내려가고, 한 열이 차면 왼쪽 열로 넘어간다 (PC 와 같은 순서).
  var SLOT_ORDER_ROT = SLOT_ORDER;

  F.GEO = { TRACK: TRACK, PITCH: PITCH, WORLD: WORLD, POLY: POLY, PATH_LENGTH: PATH_LENGTH, SLOTS: SLOTS, SLOT_ORDER: SLOT_ORDER, SLOT_ORDER_ROT: SLOT_ORDER_ROT, setPosition: setPosition };

  var TIER_POOLS = [];
  for (var ti = 0; ti <= 8; ti++) TIER_POOLS.push(PLAYERS.filter(function (p) { return !p.hidden && p.tier === ti; }));
  var ELITE_KEYS = ['swift', 'regen', 'armor', 'shield', 'split'];
  var TIER_STAT = ['', '', '', '', 'legend', 'myth', 'transcendent', 'primordial', 'hidden'];
  var PROC_OPT = { proc: true }, IGNORE_OPT = { ignoreArmor: true }, EXEC_OPT = { ignoreArmor: true, proc: true };
  var ZERO_AURA = { rate: 0, dmg: 0 };

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rnd(arr.length)]; }

  /* ═════════════ 메타(영구 프로필) ═════════════ */
  F.defaultMeta = function () {
    return {
      version: 1, unlocked: [], discovered: [], achievements: [], stats: {},
      records: { wave: 0, kills: 0, score: 0, dps: 0 }, ranking: [], infinite: false,
      relics: {}, relicCurrency: 0, relicPity: 0, relicSummons: 0,
      options: { master: 0.7, bgm: 0.35, sfx: 0.6, quality: 'auto', dmgNumbers: true, mute: false, unitHighlight: true }
    };
  };
  F.normalizeMeta = function (m) {
    var d = F.defaultMeta();
    if (!m || typeof m !== 'object') return d;
    Object.keys(d).forEach(function (k) { if (m[k] === undefined || m[k] === null) m[k] = d[k]; });
    m.options = Object.assign(d.options, m.options || {});
    m.records = Object.assign(d.records, m.records || {});
    ['unlocked', 'discovered', 'achievements', 'ranking'].forEach(function (k) { if (!Array.isArray(m[k])) m[k] = []; });
    m.unlocked = m.unlocked.filter(function (id) { return BY_ID[id]; });
    if (typeof m.relics !== 'object') m.relics = {};
    Object.keys(m.relics).forEach(function (id) {
      if (!C.RELIC_BY_ID[id]) { delete m.relics[id]; return; }
      var v = m.relics[id];
      m.relics[id] = { level: Math.max(1, Math.min(C.RELIC_MAX_LEVEL, v.level | 0 || 1)), shards: Math.max(0, v.shards | 0) };
    });
    m.relicCurrency = Math.max(0, Math.floor(Number(m.relicCurrency) || 0));
    return m;
  };

  /* ═════════════ Game ═════════════ */
  function Game(meta, emit) {
    this.meta = F.normalizeMeta(meta);
    this.emit = emit || function () {};
    this.s = null;
    this.fx = this.computeRelicEffects();
    this.team = null;
    this.aura = {};
    this.wd = null;
    this.aliveCount = 0;
    this.bossAlive = false;
    this._src = null;
    this._missionClock = 0;
  }
  var G = Game.prototype;

  G.computeRelicEffects = function () {
    var out = C.EMPTY_RELIC_EFFECTS(), rel = this.meta.relics || {};
    Object.keys(rel).forEach(function (id) {
      var relic = C.RELIC_BY_ID[id]; if (!relic) return;
      Object.keys(relic.effects).forEach(function (k) { out[k] += relic.effects[k] * C.relicGrowth(rel[id].level, k); });
    });
    return out;
  };

  G.active = function () { var s = this.s; return !!s && s.phase !== 'over' && s.phase !== 'clear'; };

  G.start = function (mode, difficulty) {
    mode = mode === 'infinite' ? 'infinite' : 'normal';
    if (mode === 'infinite' && !this.meta.infinite) return false;
    this.fx = this.computeRelicEffects();
    this.s = {
      v: 1, mode: mode, difficulty: C.DIFFICULTIES[difficulty] ? difficulty : 'normal',
      wave: 0, phase: 'ready', time: 0, waveTime: 0, spawned: 0, spawnClock: 0, intermission: C.FIRST_INTERMISSION,
      gold: C.START_GOLD + Math.round(this.fx.startGold), tickets: C.START_TICKETS, autoSellTier: null,
      upgrades: [0, 0, 0, 0, 0, 0, 0, 0, 0], units: [], enemies: [], nextId: 1, speed: 1, paused: false,
      stats: { kills: 0, damage: 0, crit: 0, summon: 0, merge: 0, upgrade: 0, bosses: 0, missions: 0, spent: 0, sell: 0, move: 0, craft: 0, procs: 0, incidents: 0 },
      streak: 0, bestStreak: 0, mission: null, incident: null, incidentAt: Infinity, incidentStarted: false,
      eventIdx: -1, bossSpawned: false, bossDeadline: null, assistUntil: 0, assistDmg: 0,
      dps: 0, peakDps: 0, damageWindow: 0, windowTime: 0, score: 0, relicWaves: [], tokensEarned: 0, lossReason: null
    };
    this.wd = C.waveData(1, this.s.difficulty);
    this.refreshTeam();
    this.emit('start');
    return true;
  };

  G.event = function () { var s = this.s; return s && s.eventIdx >= 0 ? C.EVENTS[s.eventIdx] : null; };

  /* ───────── 슬롯 ───────── */
  G.freeSlot = function () {
    var used = {}, units = this.s.units, order = this.slotOrder || SLOT_ORDER;
    for (var i = 0; i < units.length; i++) used[units[i].slot] = 1;
    for (var k = 0; k < order.length; k++) if (!used[order[k]]) return order[k];
    return -1;
  };
  // 화면이 회전된 경우(세로 모바일) 렌더러가 회전 순서로 바꿔 준다
  G.setSlotOrder = function (rotated) { this.slotOrder = rotated ? F.GEO.SLOT_ORDER_ROT : SLOT_ORDER; };
  G.unitAt = function (slot) { var u = this.s.units; for (var i = 0; i < u.length; i++) if (u[i].slot === slot) return u[i]; return null; };
  G.unitById = function (uid) { var u = this.s.units; for (var i = 0; i < u.length; i++) if (u[i].uid === uid) return u[i]; return null; };

  G.addUnit = function (id, slot) {
    var s = this.s;
    if (slot === undefined || slot < 0) slot = this.freeSlot();
    if (slot < 0 || !BY_ID[id]) return null;
    var u = { uid: s.nextId++, id: id, slot: slot, cool: Math.random() * 0.4, hits: 0, disabled: 0, target: 0, stacks: 0, locked: false, born: s.wave, dealt: 0, bd: 0, bdUntil: 0, br: 0, brUntil: 0 };
    s.units.push(u);
    if (this.meta.unlocked.indexOf(id) < 0) { this.meta.unlocked.push(id); this.emit('unlock', BY_ID[id]); }
    this.refreshTeam();
    return u;
  };
  G.removeUnits = function (uidSet) {
    this.s.units = this.s.units.filter(function (u) { return !uidSet[u.uid]; });
    this.refreshTeam();
  };

  /* ───────── 팀 효과 캐시 (배치가 바뀔 때만 계산) ───────── */
  G.refreshTeam = function () {
    var s = this.s, t = { dmg: 0, rate: 0, crit: 0, globalSlow: 0, armorBreak: 0, killGold: 0, distinct: 0, ids: {} };
    if (!s) { this.team = t; return; }
    var units = s.units, ids = t.ids;
    for (var i = 0; i < units.length; i++) ids[units[i].id] = (ids[units[i].id] || 0) + 1;
    Object.keys(ids).forEach(function (id) {
      t.distinct++;
      var p = BY_ID[id].passive; if (!p) return;
      switch (p.key) {
        case 'metronome': t.rate += p.rate; t.dmg += p.dmg; break;
        case 'teamRate': t.rate += p.v; break;
        case 'goat': t.dmg += p.dmg; t.rate += p.rate; break;
        case 'king': t.crit += p.crit; t.killGold += p.gold; break;
        case 'kaiser': t.dmg += p.dmg; t.globalSlow += p.slow; t.armorBreak = Math.max(t.armorBreak, p.armor); break;
        case 'keeperWall': t.globalSlow += p.globalSlow; break;
        case 'armorBreak': t.armorBreak = Math.max(t.armorBreak, p.v); break;
      }
    });
    // 주변 오라: 패스(공속), 리더십(공격력)
    var aura = {};
    for (var a = 0; a < units.length; a++) {
      var ua = units[a], sa = SLOTS[ua.slot], np = 0, nc = 0;
      for (var b = 0; b < units.length; b++) {
        if (a === b) continue;
        var ub = units[b], st = BY_ID[ub.id].style;
        if (st !== 'pass' && st !== 'captain') continue;
        var sb = SLOTS[ub.slot];
        if (Math.hypot(sa.x - sb.x, sa.z - sb.z) <= 2.8) { if (st === 'pass') np++; else nc++; }
      }
      if (np || nc) aura[ua.uid] = { rate: Math.min(3, np) * 0.1, dmg: Math.min(3, nc) * 0.08 };
    }
    this.aura = aura;
    this.team = t;
  };

  /* ───────── 전투 수치 ───────── */
  G.power = function (u) {
    var s = this.s, def = BY_ID[u.id], role = C.ROLES[def.role], tier = def.tier, up = s.upgrades[tier], fx = this.fx, t = this.team;
    var a = this.aura[u.uid] || ZERO_AURA, ev = this.event() || {}, p = def.passive, pk = p && p.key;
    var emergency = this.aliveCount >= 90, waveStart = s.phase === 'wave' && s.waveTime < 15;
    var relicDamage = fx.damage + Math.min(20, t.distinct) * fx.diversityDamagePerUnit + (emergency ? fx.emergencyDamage : 0) + (waveStart ? fx.waveStartDamage : 0);
    var relicRate = fx.rate + (emergency ? fx.emergencyRate : 0) + (waveStart ? fx.waveStartRate : 0);
    var relicRange = fx.range + (this.bossAlive ? fx.bossRange : 0);
    var buffD = u.bdUntil > s.time ? u.bd : 0, buffR = u.brUntil > s.time ? u.br : 0;
    var dmg = C.BASE_DAMAGE[tier] * C.TIER_MULT[tier] * role.power * (1 + relicDamage) * Math.pow(1.23, up) *
      (1 + t.dmg) * (1 + a.dmg) * (ev.damage || 1) * (1 + buffD) * (s.assistUntil > s.time ? 1 + s.assistDmg : 1);
    if (def.style === 'engine') dmg *= 1 + s.wave * 0.025;
    if (pk === 'growth' || pk === 'curl') dmg *= 1 + Math.min(p.max, Math.max(0, s.wave - u.born) * p.per);
    if (pk === 'siuuu') dmg *= 1 + Math.min(p.max, u.hits * p.per);
    if (tier >= 4) dmg *= 1 + Math.min(u.hits, 60) * 0.006;
    var rate = role.rate * (1 + relicRate) * (1 + up * 0.035) * (1 + t.rate) * (1 + a.rate) * (ev.rate || 1) * (1 + buffR);
    if (pk === 'bossHunter' && this.bossAlive) rate *= 1 + p.rate;
    var range = role.range * (1 + relicRange) * (1 + up * 0.015) * (ev.range || 1);
    var crit = 0.08 + (def.style === 'finish' ? 0.15 : 0) + fx.crit + up * 0.009 + (ev.crit || 0) + t.crit + (pk === 'critKing' ? p.crit : 0);
    return { damage: dmg, rate: rate, range: range, crit: crit };
  };

  G.slowAmount = function (e) {
    var amt = (e.slowUntil > this.s.time ? e.slowAmt : 0) + this.team.globalSlow;
    return Math.min(e.boss ? 0.3 : 0.75, amt);
  };
  G.applySlow = function (e, amt, dur) {
    var now = this.s.time;
    if (e.slowUntil <= now || amt >= e.slowAmt) { e.slowAmt = amt; e.slowUntil = Math.max(e.slowUntil, now + dur); }
  };
  G.applyStun = function (e, dur) { e.stun = Math.max(e.stun, dur * (e.boss ? 0.25 : 1)); };
  G.applyWeaken = function (e, amt, dur) {
    var now = this.s.time;
    if (e.weakUntil <= now || amt >= e.weak) { e.weak = amt; e.weakUntil = now + dur; }
  };
  G.effectiveArmor = function (e) {
    var br = Math.max(this.team.armorBreak, e.shredUntil > this.s.time ? e.shred : 0);
    return Math.max(0, e.armor * (1 - br) * (1 - this.fx.enemyArmorBreak));
  };

  /* ───────── 타깃 선택 ───────── */
  G.select = function (mode, src, primary, range, radius, count) {
    var en = this.s.enemies, out = [], i, e, dx, dz;
    if (mode === 'single') { if (primary.hp > 0) out.push(primary); return out; }
    if (mode === 'splash') {
      var r2 = radius * radius;
      for (i = 0; i < en.length; i++) {
        e = en[i]; if (e.hp <= 0) continue;
        dx = e.x - primary.x; dz = e.z - primary.z;
        var d2 = dx * dx + dz * dz; if (d2 > r2) continue;
        e._k = d2; out.push(e);
      }
      if (out.length > count) { out.sort(function (a, b) { return a._k - b._k; }); out.length = count; }
      return out;
    }
    if (mode === 'chain') {
      var cur = primary, rr = radius * radius;
      if (primary.hp > 0) out.push(primary);
      while (out.length < count) {
        var best = null, bd = rr;
        for (i = 0; i < en.length; i++) {
          e = en[i]; if (e.hp <= 0 || e === cur || out.indexOf(e) >= 0) continue;
          dx = e.x - cur.x; dz = e.z - cur.z; var dd = dx * dx + dz * dz;
          if (dd <= bd) { bd = dd; best = e; }
        }
        if (!best) break;
        out.push(best); cur = best;
      }
      return out;
    }
    if (mode === 'line') {
      var lx = primary.x - src.x, lz = primary.z - src.z, len = Math.hypot(lx, lz) || 1;
      lx /= len; lz /= len;
      var maxT = Math.max(range * 1.3, len + 1.5), w = radius + 0.35;
      for (i = 0; i < en.length; i++) {
        e = en[i]; if (e.hp <= 0) continue;
        dx = e.x - src.x; dz = e.z - src.z;
        var tt = dx * lx + dz * lz; if (tt < 0 || tt > maxT) continue;
        if (Math.abs(dx * lz - dz * lx) > w) continue;
        e._k = tt; out.push(e);
      }
      out.sort(function (a, b) { return a._k - b._k; });
      if (out.length > count) out.length = count;
      return out;
    }
    if (mode === 'range') { // 사거리 내 전체
      var R2 = range * range;
      for (i = 0; i < en.length && out.length < count; i++) {
        e = en[i]; if (e.hp <= 0) continue;
        dx = e.x - src.x; dz = e.z - src.z;
        if (dx * dx + dz * dz <= R2) out.push(e);
      }
      return out;
    }
    // global
    for (i = 0; i < en.length; i++) if (en[i].hp > 0) out.push(en[i]);
    if (out.length > count) { out.sort(function (a, b) { return b.dist - a.dist; }); out.length = count; }
    return out;
  };

  /* ───────── 피해 처리 ───────── */
  G.hit = function (e, amount, def, crit, o) {
    if (e.hp <= 0 || !(amount > 0)) return 0;
    var s = this.s, fx = this.fx, mult = 1, p = def.passive, pk = p && p.key;
    if (def.style === 'bigGame' && (e.boss || e.elite)) mult *= 1.65;
    if (def.style === 'setpiece' && e.boss) mult *= 1.25;
    if (e.boss) {
      mult *= 1 + fx.bossDamage;
      if (pk === 'bossHunter') mult *= 1 + p.dmg;
      else if (pk === 'execute' || pk === 'siuuu') mult *= 1 + p.boss;
    }
    if (pk === 'slowBonus' && this.slowAmount(e) > 0) mult *= 1 + p.bonus;
    if (o && o.proc) mult *= 1 + fx.procDamage;
    if (e.weakUntil > s.time) mult *= 1 + e.weak;
    var armor = o && o.ignoreArmor ? 0 : this.effectiveArmor(e);
    var d = amount * mult * (1 - Math.min(0.8, armor));
    if (e.shield > 0) { var sh = Math.min(e.shield, d); e.shield -= sh; d -= sh; }
    var real = Math.min(d, e.hp); // 통계에는 초과 피해(오버킬)를 넣지 않는다
    e.hp -= d;
    s.stats.damage += real; s.damageWindow += real;
    if (this._src) this._src.dealt += real;
    if (crit) s.stats.crit++;
    this.emit('hit', e, d, crit, def);
    if (e.hp <= 0) this.kill(e, def);
    return d;
  };

  G.kill = function (e, def) {
    var s = this.s, ev = this.event() || {};
    s.stats.kills++;
    s.stats['style_' + def.style] = (s.stats['style_' + def.style] || 0) + 1;
    s.stats['pos_' + def.pos] = (s.stats['pos_' + def.pos] || 0) + 1;
    s.score += Math.round(e.maxHp / 10) + 10;
    var w = e.wave || s.wave;
    var g = (e.boss ? 90 + w * 4.5 : 4 + w * 0.27) * (ev.gold || 1) * (1 + this.team.killGold) * (e.child ? 0.5 : 1);
    this.goldGain(g, 'kill');
    if (e.boss) { s.stats.bosses++; s.tickets++; this.stat('bosses'); this.emit('bosskill', e); }
    if (e.kind === 'split' && !e.child) {
      for (var k = -1; k <= 1; k += 2) {
        var c = this.makeEnemy(false, true);
        c.maxHp = c.hp = e.maxHp * 0.3; c.dist = Math.max(0, e.dist + k * 0.35); c.speed = e.speed * 1.1; c.armor = e.armor * 0.5;
        setPosition(c); s.enemies.push(c);
      }
      this.checkCrowd();
    }
    if (e.incident && s.incident && s.incident.type === 'hunt' && !s.incident.done && !s.incident.failed) this.finishIncident(true);
    this.emit('kill', e, def);
  };

  G.goldGain = function (amount, kind) { var v = Math.round(amount); this.s.gold += v; return v; };

  /* ───────── 공격 ───────── */
  G.attack = function (u, p) {
    var s = this.s, def = BY_ID[u.id], role = C.ROLES[def.role], slot = SLOTS[u.slot], pas = def.passive, pk = pas && pas.key;
    var en = s.enemies, r2 = p.range * p.range, strong = role.priority === 'strong' || pk === 'assist';
    var best = null, bestScore = -Infinity, i, e, dx, dz;
    for (i = 0; i < en.length; i++) {
      e = en[i]; if (e.hp <= 0) continue;
      dx = e.x - slot.x; dz = e.z - slot.z;
      if (dx * dx + dz * dz > r2) continue;
      var sc = strong ? (e.boss ? 1e15 : 0) + e.maxHp + e.dist * 1e-6 : e.dist + (e.incident ? 1e4 : 0);
      if (sc > bestScore) { bestScore = sc; best = e; }
    }
    if (!best) return false;
    this._src = u;
    u.hits++;
    var forced = pk === 'penalty' && u.hits % pas.every === 0;
    var crit = forced || Math.random() < Math.min(0.95, p.crit);
    var dmg = p.damage * (crit ? (def.style === 'finish' ? 2.2 : 1.8) * (1 + this.fx.critDamage) : 1);
    if (forced) { dmg *= pas.mult; this.emit('passive', u, pas.name); }
    if (def.style === 'power' && u.hits % 6 === 0) dmg *= 3;
    if (def.style === 'press') {
      u.stacks = u.target === best.uid ? u.stacks + 1 : 1;
      var pmax = pk === 'pressPlus' ? pas.max : 8, pper = pk === 'pressPlus' ? pas.per : 0.15;
      dmg *= 1 + Math.min(pmax, u.stacks) * pper;
      if (u.stacks % 8 === 0) dmg *= 3;
    }
    u.target = best.uid;
    var opt = null;
    if (pk === 'handOfGod' && Math.random() < pas.chance) { opt = IGNORE_OPT; dmg *= pas.mult; this.emit('passive', u, pas.name); }

    var mode = role.mode, radius = role.radius, count = role.targets, full = false;
    if (pk === 'fullChain' || pk === 'fullPierce') { count += pas.extra; full = true; }
    if (pk === 'curl' || pk === 'goat') { mode = 'chain'; count = pas.chain; radius = Math.max(radius, 2.8); full = true; }
    var targets;
    if (pk === 'twoFooted' && u.hits % pas.every === 0) {
      targets = this.select('range', slot, best, p.range, 0, 30); dmg *= pas.mult; full = true; mode = 'range'; this.emit('passive', u, pas.name);
    } else if (pk === 'sprint' && u.hits % pas.every === 0) {
      targets = this.select('line', slot, best, p.range, 1.1, pas.count); dmg *= pas.mult; full = true; mode = 'line'; this.emit('passive', u, pas.name);
    } else {
      targets = this.select(mode, slot, best, p.range, radius, count);
    }
    var hitsPer = pk === 'twoFooted' ? 2 : 1;
    if (def.style === 'pace' && u.hits % 4 === 0) hitsPer *= 2;
    if (pk === 'execute' && !best.boss && best.hp <= best.maxHp * pas.hp) {
      this.hit(best, best.hp + best.shield + 1, def, true, IGNORE_OPT);
    }
    for (i = 0; i < targets.length; i++) {
      var t = targets[i], d = dmg * (t === best || full ? 1 : 0.6);
      for (var h = 0; h < hitsPer; h++) this.hit(t, d, def, crit, opt);
      this.styleOnHit(u, def, t, dmg);
    }
    if (def.style === 'dribble') this.dribbleBounce(u, def, best, targets, dmg * 0.6);
    if (pk === 'freekick' && u.hits % pas.every === 0) this.freekick(u, def, p, dmg * pas.mult, pas.radius);
    if (pk === 'keeperWall' && u.hits % pas.every === 0) {
      var st = this.select('range', slot, best, p.range, 0, 60);
      for (i = 0; i < st.length; i++) this.applyStun(st[i], pas.stun);
      this.emit('passive', u, pas.name); this.emit('zone', slot.x, slot.z, p.range, def.style);
    }
    if (pk === 'assist' && u.hits % pas.every === 0) { s.assistUntil = s.time + pas.dur; s.assistDmg = pas.dmg; this.emit('passive', u, pas.name); }
    if (pk === 'critKing' && crit) { u.br = Math.max(u.brUntil > s.time ? u.br : 0, pas.haste); u.brUntil = s.time + pas.dur; }
    this.emit('attack', u, def, targets, mode, best);
    var chance = Math.min(0.75, def.skill.chance + this.fx.procChance);
    if (Math.random() < chance) this.triggerProc(u, def, best, p);
    this._src = null;
    return true;
  };

  G.styleOnHit = function (u, def, t, dmg) {
    if (t.hp <= 0 && def.style !== 'setpiece') return;
    switch (def.style) {
      case 'tackle': this.applySlow(t, 0.3, 2.4); t.shred = Math.max(t.shredUntil > this.s.time ? t.shred : 0, 0.15); t.shredUntil = this.s.time + 2.4; break;
      case 'save': this.applyWeaken(t, 0.12, 3); this.applySlow(t, 0.25, 3); break;
      case 'aerial': if (u.hits % 5 === 0) this.applyStun(t, 0.7); break;
      case 'setpiece':
        t.marks = (t.marks || 0) + 1;
        if (t.marks % 3 === 0) {
          var near = this.select('splash', null, t, 0, 2, 6);
          for (var i = 0; i < near.length; i++) this.hit(near[i], dmg * 2.5 * (near[i] === t ? 1 : 0.6), def, false, null);
          this.emit('burst', t.x, t.z, 2, def.style);
        }
        break;
    }
    var pk = def.passive && def.passive.key;
    if (pk === 'slowBonus' && t.hp > 0) this.applySlow(t, def.passive.slow, def.passive.dur);
  };

  G.dribbleBounce = function (u, def, best, targets, dmg) {
    var en = this.s.enemies, got = 0;
    for (var n = 0; n < 2; n++) {
      var pickE = null, bd = 2.5 * 2.5;
      for (var i = 0; i < en.length; i++) {
        var e = en[i]; if (e.hp <= 0 || targets.indexOf(e) >= 0 || e._b === u.hits * 1000 + u.uid) continue;
        var dx = e.x - best.x, dz = e.z - best.z, dd = dx * dx + dz * dz;
        if (dd < bd) { bd = dd; pickE = e; }
      }
      if (!pickE) break;
      pickE._b = u.hits * 1000 + u.uid;
      this.hit(pickE, dmg, def, false, null); got++;
      this.emit('bounce', best, pickE, def);
    }
    return got;
  };

  G.freekick = function (u, def, p, dmg, radius) {
    var slot = SLOTS[u.slot], cand = this.select('range', slot, null, p.range, 0, 80), bestE = null, bestN = -1, r2 = radius * radius;
    for (var i = 0; i < cand.length; i++) {
      var n = 0;
      for (var j = 0; j < cand.length; j++) {
        var dx = cand[i].x - cand[j].x, dz = cand[i].z - cand[j].z;
        if (dx * dx + dz * dz <= r2) n++;
      }
      if (n > bestN) { bestN = n; bestE = cand[i]; }
    }
    if (!bestE) return;
    var ts = this.select('splash', slot, bestE, 0, radius, 14);
    for (var k = 0; k < ts.length; k++) this.hit(ts[k], dmg, def, false, null);
    this.emit('passive', u, def.passive.name);
    this.emit('burst', bestE.x, bestE.z, radius, def.style);
  };

  G.triggerProc = function (u, def, primary, p) {
    var s = this.s, sk = def.skill, slot = SLOTS[u.slot], i;
    var targets = this.select(sk.shape === 'global' ? 'global' : sk.shape, slot, primary, p.range * 1.1, sk.radius, sk.count);
    var dmg = p.damage * sk.mult;
    if (sk.fx === 'haste') { u.br = Math.max(u.brUntil > s.time ? u.br : 0, sk.v); u.brUntil = s.time + 4; }
    if (sk.fx === 'rally') {
      for (i = 0; i < s.units.length; i++) {
        var a = s.units[i], sa = SLOTS[a.slot];
        if (Math.hypot(sa.x - slot.x, sa.z - slot.z) <= p.range) { a.bd = Math.max(a.bdUntil > s.time ? a.bd : 0, sk.v); a.bdUntil = s.time + 4; }
      }
    }
    if (sk.fx === 'gold') s.gold += sk.v;
    for (i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (sk.fx === 'execute' && !t.boss && t.hp <= t.maxHp * sk.v) { this.hit(t, t.hp + t.shield + 1, def, true, EXEC_OPT); continue; }
      this.hit(t, dmg * (sk.fx === 'execute' && t.boss ? 1.5 : 1), def, false, PROC_OPT);
      if (t.hp <= 0) continue;
      switch (sk.fx) {
        case 'stun': this.applyStun(t, sk.v); break;
        case 'slow': this.applySlow(t, 0.4, sk.v); break;
        case 'weaken': this.applyWeaken(t, sk.v, 4); break;
        case 'burn': t.burnDps = Math.max(t.burnUntil > s.time ? t.burnDps : 0, p.damage * sk.v); t.burnUntil = s.time + 4; t.burnSrc = def.id; t.burnUid = u.uid; break;
        case 'knock': t.dist = Math.max(0, t.dist - sk.v * (t.boss ? 0.25 : 1)); setPosition(t); break;
      }
    }
    s.stats.procs++;
    this.emit('proc', u, def, targets, primary);
  };

  /* ───────── 적 ───────── */
  G.makeEnemy = function (boss, child) {
    var s = this.s, w = this.wd, fx = this.fx;
    var elite = !boss && !child && s.wave > 3 && Math.random() < Math.min(0.45, 0.12 + s.wave * 0.004);
    var hpScale = Math.max(0.7, 1 - fx.enemyHpDown), speedScale = Math.max(0.75, 1 - fx.enemySlow);
    var kind = boss ? w.bossType.effect : elite ? ELITE_KEYS[s.nextId % 5] : 'normal';
    var hp = w.hp * hpScale * (boss ? w.bossMultiplier : elite ? 3.2 : 1);
    var speed = w.speed * speedScale * (boss ? 0.7 : elite ? 1.15 : 1) * (kind === 'swift' ? 1.25 : 1);
    var e = {
      uid: s.nextId++, wave: s.wave, name: boss ? w.bossType.name : null, dist: 0, x: 0, z: 0,
      hp: hp, maxHp: hp, speed: speed, armor: w.armor + (elite ? 0.12 : 0) + (kind === 'armor' && !boss ? 0.15 : 0),
      boss: !!boss, elite: elite, kind: kind, child: !!child, incident: false,
      slowAmt: 0, slowUntil: 0, stun: 0, weak: 0, weakUntil: 0, shred: 0, shredUntil: 0,
      burnDps: 0, burnUntil: 0, burnSrc: null, burnUid: 0, marks: 0, timer: 0, phase: 1,
      shield: kind === 'shield' && !boss ? hp * 0.3 : 0, _k: 0, _b: 0
    };
    setPosition(e);
    return e;
  };

  G.spawn = function (boss) {
    var s = this.s, e = this.makeEnemy(boss, false);
    s.enemies.push(e);
    if (boss) { s.bossDeadline = s.time + C.BOSS_TIME_LIMIT; this.emit('boss', e); }
    this.checkCrowd();
    return e;
  };

  G.countAlive = function () {
    var en = this.s.enemies, n = 0, boss = false;
    for (var i = 0; i < en.length; i++) if (en[i].hp > 0) { n++; if (en[i].boss) boss = true; }
    this.aliveCount = n; this.bossAlive = boss;
    return n;
  };

  G.checkCrowd = function () {
    var s = this.s; if (!this.active()) return false;
    var n = this.countAlive();
    if (s.mission) s.mission.peak = Math.max(s.mission.peak || 0, n);
    if (n <= C.ENEMY_LIMIT) return false;
    this.gameOver('overcrowding');
    return true;
  };

  G.waveEnemyCount = function () {
    var s = this.s, ev = this.event() || {};
    if (s.mode === 'infinite') return Math.min(70, Math.round(Math.round(15 + s.wave * 1.35) * (ev.count || 1)));
    return Math.round(this.wd.count * (ev.count || 1));
  };

  G.nextWave = function () {
    var s = this.s; if (!s || s.phase !== 'ready') return;
    s.wave++;
    s.phase = 'wave'; s.waveTime = 0; s.spawned = 0; s.spawnClock = 0; s.bossSpawned = false; s.bossDeadline = null;
    this.wd = C.waveData(s.wave, s.difficulty);
    s.eventIdx = s.wave % 3 === 0 ? rnd(C.EVENTS.length) : -1;
    var def = C.MISSIONS[(s.wave * 7 + Math.floor(s.wave / 3)) % C.MISSIONS.length];
    if (s.wave < 20 && def.type === 'legendCount') def = C.MISSIONS[14];
    if (s.wave < 12 && def.type === 'craft') def = C.MISSIONS[3];
    var target = def.target;
    if (def.type === 'kill') target = Math.min(target, Math.floor(this.waveEnemyCount() * 0.8));
    if (def.type === 'damage') target = Math.round(this.wd.hp * 5);
    var base = JSON.parse(JSON.stringify(s.stats));
    s.mission = { id: def.id, name: def.name, type: def.type, hint: def.hint, reward: def.reward, target: target, base: base, peak: this.countAlive(), progress: 0, done: false, failed: false };
    s.incident = null; s.incidentStarted = false;
    s.incidentAt = s.wave >= 2 ? 7 + rnd(4) : Infinity;
    this.emit('wave', s.wave, this.wd.boss, this.event());
  };

  G.skipIntermission = function () { var s = this.s; if (s && s.phase === 'ready') { s.intermission = 0; this.nextWave(); } };

  /* ───────── 긴급 임무 ───────── */
  G.missionProgress = function () {
    var s = this.s, m = s.mission; if (!m || m.done || m.failed) return;
    var b = m.base, st = s.stats, v = 0, units = s.units, i, set, key;
    var d = function (k) { return (st[k] || 0) - (b[k] || 0); };
    switch (m.type) {
      case 'kill': v = d('kills'); break;
      case 'safe': v = (m.peak || 0) <= 60 ? 1 : 0; break;
      case 'summon': v = d('summon'); break;
      case 'merge': v = d('merge'); break;
      case 'upgrade': v = d('upgrade'); break;
      case 'crit': v = d('crit'); break;
      case 'save': v = s.gold; break;
      case 'damage': v = d('damage'); break;
      case 'attackKills': v = d('pos_FW') + d('pos_WG'); break;
      case 'defKills': v = d('pos_DF') + d('pos_GK'); break;
      case 'midKills': v = d('pos_MF'); break;
      case 'style_dribble': case 'style_power': case 'style_pass': case 'style_finish': v = d(m.type); break;
      case 'noSummon': v = st.summon === b.summon ? 1 : 0; break;
      case 'noMerge': v = st.merge === b.merge ? 1 : 0; break;
      case 'noSpend': v = st.spent === b.spent ? 1 : 0; break;
      case 'unitCount': v = units.length; break;
      case 'rareCount': case 'uniqueCount': case 'epicCount': case 'legendCount':
        var min = { rareCount: 1, uniqueCount: 2, epicCount: 3, legendCount: 4 }[m.type];
        for (i = 0; i < units.length; i++) if (BY_ID[units[i].id].tier >= min) v++;
        break;
      case 'upgradeLevel': v = Math.max.apply(null, s.upgrades); break;
      case 'upgradeBreadth': v = s.upgrades.filter(function (x) { return x > 0; }).length; break;
      case 'nations': set = {}; for (i = 0; i < units.length; i++) set[BY_ID[units[i].id].nation] = 1; v = Object.keys(set).length; break;
      case 'styleCount': set = {}; for (i = 0; i < units.length; i++) set[BY_ID[units[i].id].style] = 1; v = Object.keys(set).length; break;
      case 'oneClub':
        set = {};
        for (i = 0; i < units.length; i++) { key = BY_ID[units[i].id].club; set[key] = set[key] || {}; set[key][units[i].id] = 1; }
        Object.keys(set).forEach(function (k) { v = Math.max(v, Object.keys(set[k]).length); });
        break;
      case 'distinct': set = {}; for (i = 0; i < units.length; i++) set[units[i].id] = 1; v = Object.keys(set).length; break;
      case 'move': case 'sell': case 'craft': v = d(m.type); break;
      case 'duplicates':
        set = {}; for (i = 0; i < units.length; i++) set[units[i].id] = (set[units[i].id] || 0) + 1;
        Object.keys(set).forEach(function (k) { if (set[k] >= 2) v++; });
        break;
      case 'fwCount': for (i = 0; i < units.length; i++) { key = BY_ID[units[i].id].pos; if (key === 'FW' || key === 'WG') v++; } break;
      case 'dfCount': for (i = 0; i < units.length; i++) { key = BY_ID[units[i].id].pos; if (key === 'DF' || key === 'GK') v++; } break;
      case 'critDamage': v = (m.peak || 0) <= 60 ? d('crit') : 0; break;
      case 'summonKill': v = d('kills') >= 10 ? d('summon') : 0; break;
      case 'mergeKill': v = d('kills') >= 10 ? d('merge') : 0; break;
      case 'prepared': v = s.gold >= 100 && st.upgrade > b.upgrade ? 1 : 0; break;
    }
    m.progress = v;
    if (v >= m.target && C.END_CHECK_MISSIONS.indexOf(m.type) < 0) this.finishMission(true);
  };

  G.finishMission = function (success) {
    var s = this.s, m = s.mission; if (!m || m.done || m.failed) return;
    m.done = success; m.failed = !success;
    if (success) {
      s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); s.stats.missions++;
      this.stat('missions');
      this.goldGain(m.reward, 'mission');
      var t = 0;
      if (s.streak % 3 === 0) t += 1;
      if (s.streak % 5 === 0) t += 1;
      if (s.streak % 7 === 0) t += 4;
      s.tickets += t;
      this.emit('mission', true, m, t);
    } else {
      s.streak = 0;
      this.emit('mission', false, m, 0);
    }
  };

  /* ───────── 돌발 상황 ───────── */
  G.startIncident = function () {
    var s = this.s; if (!s || s.phase !== 'wave' || s.incidentStarted) return;
    s.incidentStarted = true;
    var pool = [{ type: 'hunt', name: '역습 저지', hint: '금빛 표식의 역습 공격수를 제한 시간 안에 처치하세요!', target: 1 }];
    var slots = C.SLOT_COUNT - s.units.length;
    if (slots >= 2 && (s.tickets >= 2 || s.gold >= Math.max(0, 2 - s.tickets) * this.summonCost())) pool.push({ type: 'rally', name: '긴급 수혈', hint: '제한 시간 안에 선수 2명을 영입하세요!', target: 2 });
    var def = pick(pool);
    s.incident = { type: def.type, name: def.name, hint: def.hint, target: def.target, base: { summon: s.stats.summon }, remaining: s.wave >= 10 ? 18 : 24, reward: 90 + s.wave * 6, progress: 0, done: false, failed: false, targetUid: 0 };
    if (def.type === 'hunt') {
      var e = this.spawn(false); if (!this.active()) return;
      e.incident = true; e.elite = true; e.kind = 'swift'; e.hp = e.maxHp = this.wd.hp * 2; e.speed = this.wd.speed * 1.35; e.dist = 4; e.shield = 0;
      setPosition(e); s.incident.targetUid = e.uid;
    }
    this.emit('incident', s.incident);
  };
  G.updateIncident = function (dt) {
    var s = this.s, m = s.incident; if (!m || m.done || m.failed) return;
    m.remaining = Math.max(0, m.remaining - dt);
    if (m.type === 'rally') m.progress = s.stats.summon - m.base.summon;
    if (m.progress >= m.target) { this.finishIncident(true); return; }
    var alive = false;
    if (m.type === 'hunt') for (var i = 0; i < s.enemies.length; i++) if (s.enemies[i].uid === m.targetUid && s.enemies[i].hp > 0) { alive = true; break; }
    if (m.remaining <= 0 || (m.type === 'hunt' && !alive)) this.finishIncident(false);
  };
  G.finishIncident = function (success) {
    var s = this.s, m = s.incident; if (!m || m.done || m.failed) return;
    m.done = success; m.failed = !success;
    if (success) { m.progress = m.target; s.gold += m.reward; s.stats.incidents++; }
    this.emit('incidentend', success, success ? m.reward : 0);
  };

  /* ───────── 메인 스텝 ───────── */
  G.step = function (dt) {
    var s = this.s; if (!s || s.paused || !this.active()) return;
    s.time += dt; s.windowTime += dt;
    if (s.windowTime >= 1) { s.dps = s.damageWindow / s.windowTime; s.peakDps = Math.max(s.peakDps, s.dps); s.damageWindow = 0; s.windowTime = 0; }
    if (s.phase === 'ready') { s.intermission -= dt; if (s.intermission <= 0) this.nextWave(); return; }
    var w = this.wd, ev = this.event() || {}, i;
    s.waveTime += dt; s.spawnClock += dt;
    if (!s.incidentStarted && s.waveTime >= s.incidentAt) this.startIncident();
    if (!this.active()) return;
    var count = this.waveEnemyCount();
    while (s.spawned < count && s.phase === 'wave') {
      var gap = (s.spawned % 8 < 4 ? 0.7 : 1.3) * w.spawnWindow / count;
      if (s.spawnClock <= gap) break;
      s.spawnClock -= gap; s.spawned++; this.spawn(false);
      if (!this.active()) return;
    }
    if (w.boss && s.spawned >= count && !s.bossSpawned) { s.bossSpawned = true; this.spawn(true); if (!this.active()) return; }
    this.countAlive();

    // 선수 공격
    var units = s.units;
    for (i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.disabled > 0) u.disabled = Math.max(0, u.disabled - dt);
      u.cool -= dt;
      if (u.cool <= 0 && u.disabled <= 0) {
        var p = this.power(u);
        if (this.attack(u, p)) u.cool += 1 / p.rate;
        else if (u.cool < -0.1) u.cool = 0;
      }
    }

    // 적 이동 · 상태
    var en = s.enemies, gSpeed = ev.speed || 1;
    for (i = 0; i < en.length; i++) {
      var e = en[i]; if (e.hp <= 0) continue;
      e.timer += dt;
      if (e.burnUntil > s.time && e.burnDps > 0) {
        this._src = e.burnUid ? this.unitById(e.burnUid) : null;
        this.hit(e, e.burnDps * dt, BY_ID[e.burnSrc] || BY_ID.enzo, false, PROC_OPT);
        this._src = null;
        if (e.hp <= 0) continue;
      }
      if (e.kind === 'regen') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.015 * dt);
      if (e.boss) this.bossTick(e, dt);
      if (!this.active()) return;
      var moveDt = Math.max(0, dt - e.stun);
      e.stun = Math.max(0, e.stun - dt);
      e.dist += e.speed * (1 - this.slowAmount(e)) * gSpeed * (e.boss && e.phase === 3 ? 1.25 : 1) * moveDt;
      setPosition(e);
    }
    // 죽은 적 제거 (제자리 압축)
    var k = 0, bossLiving = null;
    for (i = 0; i < en.length; i++) if (en[i].hp > 0) { en[k++] = en[i]; if (en[i].boss) bossLiving = en[i]; }
    en.length = k;
    if (!bossLiving) s.bossDeadline = null;
    else if (s.bossDeadline !== null && s.time >= s.bossDeadline) { this.gameOver('boss_timeout', bossLiving.name); return; }

    this.updateIncident(dt);
    this._missionClock += dt;
    if (this._missionClock >= 0.2) { this._missionClock = 0; this.missionProgress(); }
    if (s.mission && !s.mission.done && !s.mission.failed && s.waveTime >= w.duration) { this.missionProgress(); this.finishMission(s.mission.progress >= s.mission.target); }
    if (this.checkCrowd()) return;

    if (s.spawned >= count && s.waveTime >= w.duration && !bossLiving && (s.wave !== C.NORMAL_WAVES || s.mode !== 'normal' || en.length === 0)) this.endWave(ev);
  };

  G.bossTick = function (e, dt) {
    var s = this.s, ratio = e.hp / e.maxHp, phase = ratio < 0.33 ? 3 : ratio < 0.66 ? 2 : 1;
    if (phase !== e.phase) {
      e.phase = phase; this.emit('bossphase', e, phase);
      if (e.kind === 'final') e.shield += e.maxHp * 0.06;
    }
    if (Math.floor(e.timer / 9) > Math.floor((e.timer - dt) / 9)) {
      if ((e.kind === 'seal' || e.kind === 'final') && s.units.length) {
        var u = pick(s.units); u.disabled = 3; this.emit('seal', u, e);
      }
      if (e.kind === 'warp' || e.kind === 'final') { e.dist += 2.5; setPosition(e); this.emit('warp', e); }
      if (e.kind === 'armor') { e.armor = Math.min(0.75, e.armor + 0.02); this.emit('bossskill', e, '방어력 상승'); }
      if (e.kind === 'shield') { e.shield += e.maxHp * 0.08; this.emit('bossskill', e, 'VAR 보호막'); }
      if (e.kind === 'final' && e.phase === 1) this.spawn(false);
    }
  };

  G.endWave = function (ev) {
    var s = this.s, m = s.mission;
    this.missionProgress();
    if (m && !m.done && !m.failed) this.finishMission(m.progress >= m.target);
    if (s.incident && !s.incident.done && !s.incident.failed) this.finishIncident(false);
    var tokens = 0;
    if (s.relicWaves.indexOf(s.wave) < 0) {
      s.relicWaves.push(s.wave);
      tokens = C.relicStageReward(s.wave, s.difficulty);
      this.meta.relicCurrency += tokens; s.tokensEarned += tokens;
    }
    var gold = this.goldGain(this.wd.reward * (ev.reward || 1) * (1 + this.fx.waveGold), 'wave');
    var interest = Math.floor(s.gold * this.fx.interest);
    if (interest > 0) s.gold += interest;
    s.tickets += 1;
    s.bossSpawned = false; s.bossDeadline = null;
    if (s.wave === C.NORMAL_WAVES && s.mode === 'normal') {
      s.phase = 'clear'; this.meta.infinite = true; this.stat('clears'); this.record();
      this.emit('clear');
      return;
    }
    s.phase = 'ready'; s.intermission = 0;
    this.record();
    this.emit('waveend', s.wave, gold, tokens, interest);
    this.nextWave();
  };

  G.gameOver = function (reason, extra) {
    var s = this.s; if (!this.active()) return;
    s.phase = 'over'; s.lossReason = reason;
    this.record();
    this.emit('over', reason, extra);
  };

  /* ───────── 영입(소환) ───────── */
  G.summonCost = function () { return Math.max(35, Math.round((C.SUMMON_COST - this.fx.summonDiscount) * 10) / 10); };
  // 영입 등급 가중치 (트로피 보정 포함). 히든은 영입 대상이 아니며 비밀 조합으로만 얻는다.
  G.summonWeights = function () {
    var fx = this.fx, w = C.SUMMON_WEIGHTS.map(function (x, i) {
      if (i === 4) return x * (1 + fx.highTierLuck);
      if (i === 5) return x * (1 + fx.highTierLuck + fx.mythLuck);
      if (i === 6) return x * (1 + fx.transLuck);
      return x;
    });
    var sum = w.reduce(function (a, b) { return a + b; }, 0);
    return w.map(function (x) { return x / sum; });
  };
  G.summonOdds = function () { return this.summonWeights().map(function (w) { return w * 100; }); };

  G.summon = function () {
    var s = this.s;
    if (!this.active()) return { error: '경기를 먼저 시작하세요.' };
    if (this.freeSlot() < 0) return { error: '배치칸이 가득 찼어요. 필요 없는 등급을 판매하세요.' };
    var cost = this.summonCost(), ticket = s.tickets > 0;
    if (!ticket && s.gold < cost) return { error: '골드가 부족해요.' };
    if (ticket) s.tickets--; else { s.gold -= cost; s.stats.spent += cost; }
    var roll = Math.random(), w = this.summonWeights(), tier = 0;
    for (var i = 0; i < w.length; i++) { roll -= w[i]; if (roll < 0) { tier = i; break; } }
    var hero = pick(TIER_POOLS[tier]);
    tier = hero.tier;
    if (!ticket && Math.random() < this.fx.refundChance) { s.gold += cost; this.emit('refund', cost); }
    s.stats.summon++;
    this.stat('summons');
    if (tier >= 4) this.stat(TIER_STAT[tier]);
    var u = this.addUnit(hero.id);
    this.emit('draw', u, hero, false);
    var sold = false, soldGold = 0;
    if (s.autoSellTier !== null && tier <= s.autoSellTier) {
      var r = this.sell(u.uid, true);
      if (r.ok) { sold = true; soldGold = r.gold; }
    }
    this.emit('change');
    return { ok: true, id: hero.id, tier: tier, autoSold: sold, autoSaleGold: soldGold, u: u };
  };

  G.summonMany = function (n) {
    var results = [], err = null;
    for (var i = 0; i < n; i++) {
      var r = this.summon();
      if (!r.ok) { err = r.error; break; }
      results.push(r);
    }
    return results.length ? { ok: true, results: results, stopped: err } : { error: err || '영입할 수 없어요.' };
  };

  G.designatedSummon = function (id) {
    var s = this.s, hero = BY_ID[id];
    if (!this.active()) return { error: '진행 중인 경기에서만 지정 영입할 수 있어요.' };
    if (!hero || hero.tier !== 4 || hero.hidden) return { error: '전설 등급 선수만 지정 영입할 수 있어요.' };
    if (this.freeSlot() < 0) return { error: '배치칸이 가득 찼어요.' };
    if (s.gold < C.DESIGNATED_SUMMON_COST) return { error: '골드가 부족해요.' };
    s.gold -= C.DESIGNATED_SUMMON_COST; s.stats.spent += C.DESIGNATED_SUMMON_COST; s.stats.summon++;
    this.stat('summons'); this.stat('legend');
    var u = this.addUnit(hero.id);
    this.emit('draw', u, hero, false, true);
    this.emit('change');
    return { ok: true, u: u, id: id, tier: 4 };
  };

  /* ───────── 합성 ───────── */
  G.mergeCandidates = function () {
    if (!this.active()) return [];
    var groups = {}, units = this.s.units;
    for (var i = 0; i < units.length; i++) {
      var u = units[i]; if (u.locked || BY_ID[u.id].tier > C.MERGE_MAX_TIER) continue;
      (groups[u.id] = groups[u.id] || []).push(u);
    }
    return Object.keys(groups).filter(function (id) { return groups[id].length >= 3; }).map(function (id) { return { id: id, tier: BY_ID[id].tier, units: groups[id] }; })
      .sort(function (a, b) { return a.tier - b.tier; });
  };
  G.merge = function (uids) {
    var s = this.s; if (!this.active()) return { error: '진행 중인 경기에서만 합성할 수 있어요.' };
    var self = this, units = uids.map(function (id) { return self.unitById(id); });
    if (units.length !== 3 || units.some(function (u) { return !u || u.locked; })) return { error: '같은 선수 3명이 필요해요.' };
    var id = units[0].id, tier = BY_ID[id].tier;
    if (tier > C.MERGE_MAX_TIER || units.some(function (u) { return u.id !== id; })) return { error: '에픽 이하의 같은 선수 3명만 합성할 수 있어요.' };
    var slot = units[0].slot, gone = {};
    uids.forEach(function (x) { gone[x] = 1; });
    this.removeUnits(gone);
    var hero = pick(TIER_POOLS[tier + 1]);
    var u = this.addUnit(hero.id, slot);
    s.stats.merge++; this.stat('merges');
    if (hero.tier >= 4) this.stat(TIER_STAT[hero.tier]);
    this.emit('merge', u, hero, id);
    this.emit('change');
    return { ok: true, u: u, hero: hero };
  };
  G.mergeUnit = function (uid) {
    var u = this.unitById(uid); if (!u) return { error: '선수를 찾을 수 없어요.' };
    var same = this.s.units.filter(function (x) { return x.id === u.id && !x.locked; });
    if (same.length < 3) return { error: '같은 선수 3명이 필요해요.' };
    var chosen = [u].concat(same.filter(function (x) { return x !== u; }).slice(0, 2));
    return this.merge(chosen.map(function (x) { return x.uid; }));
  };
  G.mergeAll = function () {
    if (!this.active()) return { error: '진행 중인 경기에서만 합성할 수 있어요.' };
    var count = 0, results = [];
    for (var c = this.mergeCandidates()[0]; c; c = this.mergeCandidates()[0]) {
      var r = this.merge(c.units.slice(0, 3).map(function (u) { return u.uid; }));
      if (!r.ok) break;
      count++; results.push(r.hero.id);
    }
    return count ? { ok: true, count: count, results: results } : { error: '합성 가능한 같은 선수 3명이 없어요.' };
  };

  /* ───────── 강화 ───────── */
  G.upgradeCost = function (tier) { return Math.round((75 + tier * 90) * Math.pow(1 + C.UPGRADE_GROWTH, this.s.upgrades[tier])); };
  G.upgrade = function (tier) {
    var s = this.s; if (!this.active()) return { error: '경기 중에만 강화할 수 있어요.' };
    if (s.upgrades[tier] >= C.MAX_UP[tier]) return { error: '최대 강화 단계예요.' };
    var cost = this.upgradeCost(tier);
    if (s.gold < cost) return { error: '골드가 부족해요.' };
    s.gold -= cost; s.stats.spent += cost; s.upgrades[tier]++; s.stats.upgrade++;
    this.emit('upgrade', tier, s.upgrades[tier]);
    this.emit('change');
    return { ok: true };
  };

  /* ───────── 조합 ───────── */
  G.recipeStatus = function (id) {
    var recipe = F.RECIPE_BY_ID[id], s = this.s;
    if (!recipe || !s) return { ok: false, reasons: ['조합식을 찾을 수 없어요.'], materials: [] };
    var reasons = [];
    var materials = recipe.materials.map(function (m) {
      var units = s.units.filter(function (u) { return u.id === m.id && !u.locked; });
      if (units.length < m.count) reasons.push(BY_ID[m.id].name + ' ' + (m.count - units.length) + '명 부족');
      return { id: m.id, count: m.count, owned: units.length, chosen: units.slice(0, m.count) };
    });
    if (!this.active()) reasons.push('진행 중인 경기에서만 조합할 수 있어요.');
    return { ok: reasons.length === 0, reasons: reasons, materials: materials, recipe: recipe };
  };
  G.craftable = function (includeSecret) {
    if (!this.active()) return [];
    var counts = {}, units = this.s.units;
    for (var i = 0; i < units.length; i++) if (!units[i].locked) counts[units[i].id] = (counts[units[i].id] || 0) + 1;
    return F.RECIPES.filter(function (r) {
      if (r.secret && !includeSecret) return false;
      return r.materials.every(function (m) { return (counts[m.id] || 0) >= m.count; });
    });
  };
  G.craft = function (id) {
    var st = this.recipeStatus(id); if (!st.ok) return { error: st.reasons.join(' · ') };
    var s = this.s, gone = {}, first = st.materials[0].chosen[0];
    st.materials.forEach(function (m) { m.chosen.forEach(function (u) { gone[u.uid] = 1; }); });
    var slot = first.slot;
    this.removeUnits(gone);
    var u = this.addUnit(id, slot);
    if (!u) return { error: '결과 선수를 배치할 수 없어요.' };
    s.stats.craft++;
    var hero = BY_ID[id];
    if (hero.tier >= 4) this.stat(TIER_STAT[hero.tier]);
    if (st.recipe.secret && this.meta.discovered.indexOf(id) < 0) this.meta.discovered.push(id);
    this.emit('craft', u, hero, st.recipe);
    this.emit('change');
    return { ok: true, u: u, hero: hero };
  };

  /* ───────── 이동 · 잠금 · 판매 ───────── */
  G.move = function (uid, slot) {
    var s = this.s, u = this.unitById(uid); if (!u || slot < 0 || slot >= C.SLOT_COUNT || u.slot === slot) return false;
    var other = this.unitAt(slot); if (other) other.slot = u.slot;
    u.slot = slot; s.stats.move++;
    this.refreshTeam();
    this.emit('change');
    return true;
  };
  G.toggleLock = function (uid) { var u = this.unitById(uid); if (!u) return { error: '선수를 찾을 수 없어요.' }; u.locked = !u.locked; this.emit('change'); return { ok: true, locked: u.locked }; };
  G.sellValue = function (u) { return Math.round(C.SELL_VALUES[BY_ID[u.id].tier] * (1 + this.fx.sellBonus)); };
  G.sell = function (uid, silent) {
    var s = this.s; if (!this.active()) return { error: '진행 중인 경기에서만 판매할 수 있어요.' };
    var u = this.unitById(uid); if (!u) return { error: '이미 판매된 선수예요.' };
    if (u.locked) return { error: '잠긴 선수는 판매할 수 없어요.' };
    var gold = this.sellValue(u), gone = {}; gone[uid] = 1;
    s.gold += gold; this.removeUnits(gone); s.stats.sell++;
    this.emit('sell', u, gold, silent);
    if (!silent) this.emit('change');
    return { ok: true, gold: gold, id: u.id };
  };
  G.sellThroughTier = function (maxTier) {
    var s = this.s; if (!this.active()) return { error: '진행 중인 경기에서만 판매할 수 있어요.' };
    var self = this, units = s.units.filter(function (u) { var h = BY_ID[u.id]; return !u.locked && !h.hidden && h.tier <= maxTier; });
    if (!units.length) return { error: '판매할 선수가 없어요.' };
    var gone = {}, gold = 0;
    units.forEach(function (u) { gone[u.uid] = 1; gold += self.sellValue(u); });
    s.gold += gold; this.removeUnits(gone); s.stats.sell += units.length;
    this.emit('sellmany', units.length, gold);
    this.emit('change');
    return { ok: true, count: units.length, gold: gold };
  };
  G.setAutoSellTier = function (t) { if (!this.s) return; this.s.autoSellTier = t === null || t === undefined ? null : Math.max(0, Math.min(4, t | 0)); this.emit('change'); };

  /* ───────── 기록 · 업적 ───────── */
  G.stat = function (key, n) {
    var st = this.meta.stats; st[key] = (st[key] || 0) + (n || 1);
    var meta = this.meta, self = this;
    C.ACHIEVEMENTS.forEach(function (a) {
      if (a.key === key && meta.achievements.indexOf(a.id) < 0 && (st[a.key] || 0) >= a.target) {
        meta.achievements.push(a.id); self.emit('achievement', a);
      }
    });
  };
  G.record = function () {
    var s = this.s, r = this.meta.records;
    r.wave = Math.max(r.wave, s.wave); r.kills = Math.max(r.kills, s.stats.kills);
    r.score = Math.max(r.score, s.score); r.dps = Math.max(r.dps, s.peakDps);
  };
  G.mvp = function (n) {
    var sum = {};
    this.s.units.forEach(function (u) { sum[u.id] = (sum[u.id] || 0) + (u.dealt || 0); });
    return Object.keys(sum).map(function (id) { return { id: id, dealt: sum[id] }; })
      .sort(function (a, b) { return b.dealt - a.dealt; }).slice(0, n || 5);
  };
  G.addRanking = function () {
    var s = this.s; if (!s || s.ranked) return null;
    s.ranked = true;
    var entry = {
      score: s.score, wave: s.wave, kills: s.stats.kills, dps: Math.round(s.peakDps), mode: s.mode, difficulty: s.difficulty,
      result: s.phase === 'clear' ? 'clear' : 'over', time: Math.round(s.time), date: Date.now(),
      squad: this.mvp(3).map(function (x) { return x.id; })
    };
    var list = this.meta.ranking; list.push(entry);
    list.sort(function (a, b) { return b.score - a.score; });
    if (list.length > 50) list.length = 50;
    return entry;
  };

  /* ───────── 트로피 캐비닛 (유물) ───────── */
  G.summonRelics = function (count) {
    var meta = this.meta; if (count !== 1 && count !== 10) return { error: '1회 또는 10회만 뽑을 수 있어요.' };
    var cost = count === 10 ? C.RELIC_TEN_COST : C.RELIC_SUMMON_COST;
    if (meta.relicCurrency < cost) return { error: '트로피 토큰이 부족해요.' };
    meta.relicCurrency -= cost;
    var results = [];
    for (var i = 0; i < count; i++) {
      var relic = C.rollRelic(Math.random, meta.relicPity), owned = meta.relics[relic.id], rar = C.RELIC_RARITIES[relic.rarity];
      meta.relicPity = relic.rarity >= 4 ? 0 : meta.relicPity + 1;
      meta.relicSummons++;
      if (!owned) { meta.relics[relic.id] = { level: 1, shards: 0 }; results.push({ id: relic.id, isNew: true, rarity: relic.rarity }); }
      else if (owned.level >= C.RELIC_MAX_LEVEL) { meta.relicCurrency += rar.duplicate; results.push({ id: relic.id, refund: rar.duplicate, rarity: relic.rarity }); }
      else { owned.shards += rar.shards; results.push({ id: relic.id, shards: rar.shards, rarity: relic.rarity }); }
    }
    if (!this.active()) this.fx = this.computeRelicEffects(); // 트로피 효과는 다음 경기부터 적용
    this.emit('relicdraw', results);
    return { ok: true, results: results };
  };
  G.upgradeRelic = function (id) {
    var meta = this.meta, relic = C.RELIC_BY_ID[id], owned = meta.relics[id];
    if (!relic || !owned) return { error: '먼저 트로피를 획득하세요.' };
    if (owned.level >= C.RELIC_MAX_LEVEL) return { error: '이미 최대 레벨이에요.' };
    var need = C.RELIC_UPGRADE_SHARDS[owned.level];
    if (owned.shards < need) return { error: '조각이 ' + (need - owned.shards) + '개 부족해요.' };
    owned.shards -= need; owned.level++;
    if (owned.level >= C.RELIC_MAX_LEVEL && owned.shards) {
      var rar = C.RELIC_RARITIES[relic.rarity];
      meta.relicCurrency += Math.max(1, Math.ceil(owned.shards * rar.duplicate / rar.shards)); owned.shards = 0;
    }
    if (!this.active()) this.fx = this.computeRelicEffects();
    return { ok: true, level: owned.level };
  };

  /* ───────── 저장 · 불러오기 ───────── */
  G.serialize = function () { return this.s ? JSON.stringify(this.s) : null; };
  G.restore = function (json) {
    try {
      var s = typeof json === 'string' ? JSON.parse(json) : json;
      if (!s || s.v !== 1 || !Array.isArray(s.units)) return false;
      if (s.phase === 'over' || s.phase === 'clear') return false;
      s.units = s.units.filter(function (u) { return BY_ID[u.id] && u.slot >= 0 && u.slot < C.SLOT_COUNT; });
      var seen = {};
      s.units = s.units.filter(function (u) { if (seen[u.slot]) return false; seen[u.slot] = 1; return true; });
      s.enemies = (s.enemies || []).filter(function (e) { return e.hp > 0; });
      s.enemies.forEach(function (e) { setPosition(e); });
      if (!Array.isArray(s.upgrades) || s.upgrades.length < 9) s.upgrades = (s.upgrades || []).concat([0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(0, 9);
      s.paused = false;
      this.s = null;
      this.fx = this.computeRelicEffects();
      this.s = s;
      this.wd = C.waveData(Math.max(1, s.wave), s.difficulty);
      this.refreshTeam();
      this.countAlive();
      this.emit('start', true);
      return true;
    } catch (err) { return false; }
  };

  F.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
