/*
 * 헤드리스 밸런스 시뮬레이션 (Node)
 * 사용법: node tools/sim.js [판수=5] [난이도=normal]
 * 사람의 일반적인 운영을 흉내 낸 봇이 영입 · 합성 · 조합 · 강화 · 판매를 하며 몇 웨이브까지 버티는지 측정한다.
 *  - 배치칸이 비어 있으면 영입
 *  - 칸이 꽉 차면 (등급 전력 ÷ 강화 비용)이 가장 큰 등급을 강화
 *  - 강화할 돈이 모자란데 골드가 쌓이면 노멀·레어를 팔아 다시 영입
 */
'use strict';
globalThis.FPRD = {};
require('../js/data/config.js');
require('../js/data/players.js');
require('../js/engine.js');
const F = globalThis.FPRD, C = F.C;

function bestUpgrade(g) {
  const s = g.s, weight = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const u of s.units) { const t = F.BY_ID[u.id].tier; weight[C.UPGRADE_GROUP[t]] += C.BASE_DAMAGE[t] * C.TIER_MULT[t]; }
  let best = -1, bestRatio = 0;
  for (let t = 0; t < 9; t++) {
    if (!weight[t] || s.upgrades[t] >= C.MAX_UP[t]) continue;
    const ratio = weight[t] / g.upgradeCost(t);
    if (ratio > bestRatio) { bestRatio = ratio; best = t; }
  }
  return best;
}

function bot(g) {
  const s = g.s;
  if (s.phase === 'ready' && s.intermission < 17) g.skipIntermission();
  g.mergeAll();
  for (const r of g.craftable(true)) g.craft(r.id);
  if (g.freeSlot() < 0) {
    const t = bestUpgrade(g);
    if (t >= 0 && s.gold >= g.upgradeCost(t)) g.upgrade(t);
    else if (s.gold >= 400) { g.sellThroughTier(0); if (g.freeSlot() < 0) g.sellThroughTier(1); }
  }
  let guard = 0;
  while (guard++ < 20 && g.freeSlot() >= 0 && (s.tickets > 0 || s.gold >= g.summonCost() + (s.wave > 8 ? 60 : 0))) {
    const r = g.summon(); if (!r.ok) break;
  }
}

function run(difficulty) {
  const events = {};
  const g = new F.Game(F.defaultMeta(), (type) => { events[type] = (events[type] || 0) + 1; });
  g.start('normal', difficulty);
  let tick = 0, t0 = Date.now(), maxAlive = 0;
  while (g.active() && g.s.time < 60 * 40) {
    if (tick % 20 === 0) bot(g);
    g.step(1 / 60); tick++;
    if (g.aliveCount > maxAlive) maxAlive = g.aliveCount;
  }
  const s = g.s, tiers = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const u of s.units) tiers[F.BY_ID[u.id].tier]++;
  return {
    wave: s.wave, result: s.phase === 'clear' ? 'CLEAR' : s.lossReason, kills: s.stats.kills, units: s.units.length,
    tiers: tiers.join('/'), ups: s.upgrades.join('/'), gold: Math.round(s.gold), missions: s.stats.missions,
    procs: s.stats.procs, maxAlive, simSec: Math.round(s.time), realMs: Date.now() - t0, stepUs: Math.round((Date.now() - t0) * 1000 / tick),
    hidden: s.units.filter((u) => F.BY_ID[u.id].hidden).length, crafts: s.stats.craft, mvp: g.mvp(3).map((m) => m.id + ':' + C.fmt(m.dealt)).join(' ')
  };
}

const n = +(process.argv[2] || 5), diff = process.argv[3] || 'normal';
const results = [];
for (let i = 0; i < n; i++) {
  try { const r = run(diff); results.push(r); console.log(JSON.stringify(r)); }
  catch (err) { console.error('ERROR', err && err.stack); process.exit(1); }
}
const waves = results.map((r) => r.wave).sort((a, b) => a - b);
console.log(`\n[${diff}] waves: ${waves.join(', ')} | median ${waves[Math.floor(waves.length / 2)]} | clears ${results.filter((r) => r.result === 'CLEAR').length}/${n}`);
