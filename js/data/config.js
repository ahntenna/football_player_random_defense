/*
 * 게임 상수 · 밸런스 · 웨이브 · 미션 · 이벤트 · 보스 · 유물(트로피) 정의
 * 브라우저(<script>)와 Node(시뮬레이션 테스트) 양쪽에서 동작하도록 전역 네임스페이스 FPRD 를 사용한다.
 */
(function (root) {
  'use strict';
  var F = root.FPRD = root.FPRD || {};
  var C = F.C = {};

  /* 게임 버전 — 타이틀 화면에 표시한다. 게임을 수정할 때마다 올린다. */
  F.VERSION = '1.9.2';

  /* ───────── 등급 ───────── */
  C.TIERS = [
    { key: 'normal', name: '노멀', color: '#b9c6cf' },
    { key: 'rare', name: '레어', color: '#6fd39a' },
    { key: 'unique', name: '유니크', color: '#5aabf0' },
    { key: 'epic', name: '에픽', color: '#b48aff' },
    { key: 'legend', name: '전설', color: '#f5bd4f' },
    { key: 'myth', name: '신화', color: '#ff6f8a' },
    { key: 'trans', name: '초월', color: '#5ff0dc' },
    { key: 'prime', name: '태초', color: '#fff3b8' },
    // 히든: 전설(금색)과 헷갈리지 않도록 무지개(프리즘)로 표현. color 는 단색이 필요한 곳의 대표색(마젠타)
    { key: 'hidden', name: '히든', color: '#ff5de8', rainbow: true }
  ];
  C.RAINBOW = ['#ff5f6d', '#ffc36b', '#8dff7a', '#5ed8ff', '#9d7bff', '#ff5de8'];
  C.RAINBOW_CSS = 'linear-gradient(90deg, #ff5f6d, #ffc36b, #8dff7a, #5ed8ff, #9d7bff, #ff5de8)';
  C.HIDDEN_TIER = 8;
  C.SUMMON_WEIGHTS = [49900, 28000, 14000, 6000, 1570, 430, 100, 0];
  C.SUMMON_COST = 45;
  // 히든 선수는 영입(소환) 대상이 아니다 — 비밀 조합으로만 얻는다.
  C.DESIGNATED_SUMMON_COST = 3000;
  C.SELL_VALUES = [15, 20, 25, 30, 35, 38, 40, 42, 50];
  C.MAX_UP = [30, 30, 30, 30, 30, 20, 20, 20, 20];
  C.UPGRADE_GROWTH = 0.45;
  // 히든은 태초의 약 2.1배 (v1.9.1 이전 330000 = 약 1.16배)
  C.BASE_DAMAGE = [17, 62, 225, 815, 4400, 17500, 67000, 285000, 600000];
  // 등급 강화 묶음: 히든(8)은 태초(7)와 같은 강화 단계를 쓴다
  C.UPGRADE_GROUP = [0, 1, 2, 3, 4, 5, 6, 7, 7];
  C.TIER_MULT = [1.5, 1.5, 1.5, 1.5, 1.584, 1.445, 1.275, 1.275, 1.275];
  C.MERGE_MAX_TIER = 3;           // 에픽까지 3합성 가능
  C.START_GOLD = 330;
  C.START_TICKETS = 3;
  C.ENEMY_LIMIT = 150;
  C.BOSS_TIME_LIMIT = 120;
  C.FIRST_INTERMISSION = 20;
  C.NORMAL_WAVES = 40;
  C.SLOT_COUNT = 48;

  /* ───────── 기본 공격 역할 (포지션 기반) ─────────
     mode: single | splash | chain | line */
  C.ROLES = {
    finisher: { name: '피니셔', desc: '장거리 단일 강슛 · 강한 적 우선', mode: 'single', range: 7.6, radius: 0, targets: 1, rate: 0.78, power: 1.5, priority: 'strong' },
    poacher: { name: '박스 스트라이커', desc: '근거리 폭발 슈팅', mode: 'splash', range: 3.9, radius: 2.6, targets: 8, rate: 0.8, power: 1.06 },
    longshot: { name: '중거리 슈터', desc: '장거리 광역 슈팅', mode: 'splash', range: 7.1, radius: 2.2, targets: 6, rate: 0.54, power: 1.08 },
    dribbler: { name: '드리블러', desc: '근거리 단일 속공', mode: 'single', range: 4.6, radius: 0, targets: 1, rate: 1.5, power: 0.84 },
    playmaker: { name: '플레이메이커', desc: '연쇄 패스 공격', mode: 'chain', range: 5.8, radius: 2.6, targets: 4, rate: 0.92, power: 0.84 },
    holding: { name: '중원 사령관', desc: '중거리 지원 사격', mode: 'single', range: 6.2, radius: 0, targets: 1, rate: 1.05, power: 0.9 },
    defender: { name: '수비수', desc: '광역 태클 · 제어', mode: 'splash', range: 4.9, radius: 2.0, targets: 5, rate: 0.8, power: 0.8 },
    wingback: { name: '윙백', desc: '직선 관통 크로스', mode: 'line', range: 6.7, radius: 0.7, targets: 5, rate: 0.85, power: 1.0 },
    keeper: { name: '골키퍼', desc: '넓은 범위 선방 · 제어', mode: 'splash', range: 5.6, radius: 2.6, targets: 7, rate: 0.62, power: 0.76 }
  };

  /* ───────── 플레이 스타일 (원작의 '학파'에 해당) ───────── */
  C.STYLES = {
    finish: { name: '결정력', icon: '🎯', color: '#ff8a65', desc: '치명타 확률 +15%p · 치명타 피해 2.2배' },
    dribble: { name: '드리블', icon: '🌀', color: '#7de0ec', desc: '공격이 주변 적 2명에게 추가로 튕긴다 (60% 피해)' },
    pace: { name: '스피드', icon: '⚡', color: '#ffe066', desc: '네 번째 공격마다 두 번 적중' },
    pass: { name: '패스', icon: '🔁', color: '#c6a1ed', desc: '주변 아군(2.8칸) 공격속도 +10% · 최대 3중첩' },
    power: { name: '강슛', icon: '💥', color: '#fb9868', desc: '여섯 번째 공격은 3배 피해' },
    aerial: { name: '제공권', icon: '🦅', color: '#89abe9', desc: '다섯 번째 공격마다 적중 대상 0.7초 기절' },
    tackle: { name: '태클', icon: '🦵', color: '#92d5ad', desc: '적중한 적 2.4초간 30% 감속 · 방어력 15% 감소' },
    press: { name: '압박', icon: '🔥', color: '#ef7f90', desc: '같은 적 연속 공격 시 피해 +15% (최대 8중첩) · 8중첩마다 3배' },
    engine: { name: '체력', icon: '🫀', color: '#a6cb7c', desc: '웨이브가 지날수록 공격력 +2.5%/웨이브' },
    captain: { name: '리더십', icon: '©', color: '#efcd83', desc: '주변 아군(2.8칸) 공격력 +8% · 최대 3중첩' },
    bigGame: { name: '빅게임', icon: '🏆', color: '#e2978c', desc: '보스 · 정예에게 65% 추가 피해' },
    save: { name: '선방', icon: '🧤', color: '#80b8e8', desc: '적중한 적 3초간 받는 피해 +12% · 25% 감속' },
    setpiece: { name: '세트피스', icon: '🚩', color: '#f1dfa0', desc: '표식 3중첩마다 주변 폭발 (2.5배) · 보스 +25%' }
  };

  C.POSITIONS = {
    FW: { name: '공격수', short: 'FW', color: '#ff7a6b' },
    WG: { name: '윙어', short: 'WG', color: '#ffb35c' },
    MF: { name: '미드필더', short: 'MF', color: '#6fd39a' },
    DF: { name: '수비수', short: 'DF', color: '#5aabf0' },
    GK: { name: '골키퍼', short: 'GK', color: '#f5d24f' }
  };

  /* ───────── 확률 발동 스킬 부가 효과 ───────── */
  C.PROC_FX = {
    none: function () { return ''; },
    weaken: function (v) { return '4초간 받는 피해 +' + Math.round(v * 100) + '%'; },
    stun: function (v) { return v + '초 기절 (보스 25%)'; },
    slow: function (v) { return v + '초간 40% 감속'; },
    burn: function (v) { return '4초간 매초 공격력 ' + Math.round(v * 100) + '% 지속 피해'; },
    execute: function (v) { return '체력 ' + Math.round(v * 100) + '% 이하 일반 적 즉시 처치 (보스 +50% 피해)'; },
    knock: function (v) { return '적을 ' + v + '칸 뒤로 밀어냄 (보스 25%)'; },
    haste: function (v) { return '자신의 공격속도 4초간 +' + Math.round(v * 100) + '%'; },
    rally: function (v) { return '사거리 내 아군 공격력 4초간 +' + Math.round(v * 100) + '%'; },
    gold: function (v) { return v + '골드 획득'; }
  };
  C.SHAPE_TEXT = {
    single: function (s) { return '대상 1명에게'; },
    splash: function (s) { return '대상 주변 반경 ' + s.radius + '칸 적 최대 ' + s.count + '명에게'; },
    chain: function (s) { return '적 최대 ' + s.count + '명에게 연쇄로'; },
    line: function (s) { return '직선상의 적 최대 ' + s.count + '명을 관통해'; },
    global: function (s) { return '경기장 전체 적 최대 ' + s.count + '명에게'; }
  };

  /* ───────── 난이도 ───────── */
  C.DIFFICULTIES = {
    easy: { name: '아마추어', sub: '쉬움', hp: 0.65, boss: 0.85, speed: 0.94, token: 0.85 },
    normal: { name: '프로', sub: '보통', hp: 1, boss: 1, speed: 1, token: 1 },
    hard: { name: '월드클래스', sub: '어려움', hp: 2.2, boss: 1.15, speed: 1.04, token: 1.35 },
    nightmare: { name: '레전드', sub: '지옥', hp: 3.8, boss: 1.3, speed: 1.08, token: 1.7 }
  };

  /* ───────── 보스 ───────── */
  C.BOSSES = [
    { name: '철벽 센터백', effect: 'armor', desc: '9초마다 방어력이 오른다' },
    { name: '레드카드 심판', effect: 'seal', desc: '9초마다 무작위 선수 1명을 3초간 퇴장(공격 불가)' },
    { name: 'VAR 판독실', effect: 'shield', desc: '9초마다 최대 체력 8%의 보호막' },
    { name: '역습의 제왕', effect: 'warp', desc: '9초마다 트랙을 따라 순간 질주' },
    { name: '월드 올스타 FC', effect: 'final', desc: '퇴장 · 질주 · 보호막 · 증원을 모두 사용' }
  ];

  C.ELITE_KINDS = {
    swift: { name: '스피드 윙어', color: '#ff9f43' },
    regen: { name: '피지오 동행', color: '#4cd964' },
    armor: { name: '철갑 수비수', color: '#9aa7b3' },
    shield: { name: '골키퍼 장갑', color: '#4aa3ff' },
    split: { name: '분신 공격수', color: '#b16cff' }
  };

  /* ───────── 이벤트 (3웨이브마다) ───────── */
  C.EVENTS = [
    { name: '만원 관중', desc: '처치 골드 +40%', gold: 1.4 },
    { name: '더비 매치', desc: '아군 공격속도 +25% · 적 이동 +12%', rate: 1.25, speed: 1.12 },
    { name: '폭우 경기', desc: '적 이동속도 −25%', speed: 0.75 },
    { name: '홈 어드밴티지', desc: '전체 공격력 +25%', damage: 1.25 },
    { name: '원정 대군', desc: '적 수 +30% · 웨이브 보상 +50%', count: 1.3, reward: 1.5 },
    { name: '스폰서 보너스', desc: '웨이브 보상 +80%', reward: 1.8 },
    { name: '야간 경기', desc: '사거리 −15% · 치명타 +20%p', range: 0.85, crit: 0.2 },
    { name: '결승전', desc: '전체 공격력 +10%', damage: 1.1 }
  ];

  /* ───────── 웨이브 ───────── */
  /* 원작의 체력 곡선(230 → 35만)은 50인 로스터에서 상위 등급 조합이 더 쉽게 모이기 때문에
     헤드리스 봇 시뮬레이션(tools/sim.js)으로 후반을 가파르게 재보정했다.
     히든을 영입에서 제외(비밀 조합으로만 획득)하고, 초월·태초를 역대 레전드(7·11인)로 바꾼 로스터에 맞춰 30~40웨이브 기준점을 다시 낮췄다.
     v1.8.0: 난이도 하향 — 영입 확률은 그대로 두고 전 구간 체력만 약 35% 낮췄다 (이전 260 → 600만). */
  C.HP_ANCHORS = [[1, 170], [5, 590], [10, 2600], [15, 9100], [20, 36000], [25, 130000], [30, 420000], [35, 1300000], [40, 3900000]];
  C.HP_GROWTH_AFTER_40 = 1.22;
  C.waveData = function (n, difficulty) {
    var d = C.DIFFICULTIES[difficulty] || C.DIFFICULTIES.normal;
    var anchors = C.HP_ANCHORS, last = anchors[anchors.length - 1];
    n = Math.max(1, n);
    var hp = last[1] * Math.pow(C.HP_GROWTH_AFTER_40, Math.max(0, n - last[0]));
    for (var i = 1; i < anchors.length; i++) {
      if (n <= anchors[i][0] && n >= anchors[i - 1][0]) {
        var a = anchors[i - 1], b = anchors[i];
        hp = a[1] * Math.pow(b[1] / a[1], (n - a[0]) / (b[0] - a[0]));
        break;
      }
    }
    return {
      duration: 30,
      spawnWindow: 26,
      count: Math.round((15 + n * 1.35) * (n > 50 ? 1.3 : 1)),
      hp: Math.round(hp * d.hp),
      bossMultiplier: 16 * d.boss,
      speed: (1.02 + Math.min(n * 0.014, 1.0)) * d.speed,
      armor: Math.min(0.65, n * 0.008),
      boss: n % 5 === 0,
      bossType: C.BOSSES[Math.min(4, Math.floor((n - 1) / 8))],
      reward: 55 + n * 8
    };
  };

  /* ───────── 긴급 임무 (웨이브마다 1개) ─────────
     [이름, 타입, 목표, 설명] */
  var missionCatalog = [
    ['전방 압박', 'kill', 18, '적 처치'],
    ['클린시트', 'safe', 1, '라운드 내 적 60명 이하 유지'],
    ['스카우트 파견', 'summon', 3, '선수 영입 횟수'],
    ['유스 승격', 'merge', 1, '동일 선수 합성'],
    ['전술 훈련', 'upgrade', 1, '등급 강화'],
    ['유효 슈팅', 'crit', 8, '치명타 적중'],
    ['추가 영입', 'summon', 3, '선수 영입 횟수'],
    ['재정 건전성', 'save', 150, '보유 골드'],
    ['공격 전개', 'attackKills', 10, '공격수·윙어 처치'],
    ['점유율 축구', 'damage', 4000, '총 누적 피해'],
    ['영입 동결', 'noSummon', 1, '추가 영입 없이 생존'],
    ['로테이션 휴식', 'noMerge', 1, '합성 없이 생존'],
    ['긴축 재정', 'noSpend', 1, '골드 소비 없이 생존'],
    ['풀 스쿼드', 'unitCount', 12, '배치 선수 수'],
    ['주전 경쟁', 'rareCount', 3, '레어 이상 선수'],
    ['베스트 일레븐', 'uniqueCount', 2, '유니크 이상 선수'],
    ['에이스의 품격', 'epicCount', 1, '에픽 이상 선수'],
    ['레전드의 발자취', 'legendCount', 1, '전설 이상 선수'],
    ['집중 훈련', 'upgradeLevel', 3, '한 등급 강화 수치'],
    ['균형 잡힌 훈련', 'upgradeBreadth', 3, '강화된 등급 수'],
    ['드리블 돌파', 'style_dribble', 5, '드리블 스타일 처치'],
    ['캐넌 슈터', 'style_power', 5, '강슛 스타일 처치'],
    ['패스 마스터', 'style_pass', 4, '패스 스타일 처치'],
    ['결정적 한 방', 'style_finish', 5, '결정력 스타일 처치'],
    ['철벽 수비', 'defKills', 4, '수비수·골키퍼 처치'],
    ['중원 장악', 'midKills', 4, '미드필더 처치'],
    ['다국적 군단', 'nations', 6, '배치 선수 국적 수'],
    ['원클럽맨', 'oneClub', 3, '같은 클럽의 서로 다른 선수'],
    ['선수 수집가', 'distinct', 10, '서로 다른 배치 선수'],
    ['포메이션 변경', 'move', 2, '선수 이동 횟수'],
    ['이적료 수입', 'sell', 1, '선수 판매 횟수'],
    ['케미스트리', 'craft', 1, '조합 횟수'],
    ['더블 스쿼드', 'duplicates', 2, '동일 선수 2명 이상인 종류'],
    ['투톱 전술', 'fwCount', 3, '공격수·윙어 배치 수'],
    ['포백 라인', 'dfCount', 3, '수비수·골키퍼 배치 수'],
    ['전술 다양성', 'styleCount', 5, '배치 스타일 종류'],
    ['결정적 선방', 'critDamage', 3, '치명타 3회 · 적 60명 이하'],
    ['쉼 없는 영입', 'summonKill', 3, '영입 3회와 처치 10회'],
    ['합성 후 진격', 'mergeKill', 1, '합성 1회와 처치 10회'],
    ['완벽한 준비', 'prepared', 1, '강화 1회와 골드 100 보유']
  ];
  C.MISSIONS = missionCatalog.map(function (m, i) {
    return { id: i, name: m[0], type: m[1], target: m[2], hint: m[3], reward: 72 + Math.floor(i / 10) * 22 };
  });
  C.END_CHECK_MISSIONS = ['safe', 'save', 'noSummon', 'noMerge', 'noSpend', 'critDamage'];

  /* ───────── 커리어 업적 ───────── */
  C.ACHIEVEMENTS = [
    { id: 'boss', name: '첫 승리', desc: '보스 1회 처치', key: 'bosses', target: 1 },
    { id: 'summons', name: '스카우트', desc: '선수 30회 영입', key: 'summons', target: 30 },
    { id: 'legend', name: '레전드 영입', desc: '전설 등급 획득', key: 'legend', target: 1 },
    { id: 'myth', name: '신화의 시작', desc: '신화 등급 획득', key: 'myth', target: 1 },
    { id: 'trans', name: '초월자', desc: '초월 등급 획득', key: 'transcendent', target: 1 },
    { id: 'prime', name: '발롱도르', desc: '태초 등급 획득', key: 'primordial', target: 1 },
    { id: 'hidden', name: 'GOAT 강림', desc: '히든 선수 획득', key: 'hidden', target: 1 },
    { id: 'mission', name: '완벽한 작전', desc: '긴급 임무 20회 성공', key: 'missions', target: 20 },
    { id: 'clear', name: '챔피언', desc: '정규 40웨이브 클리어 · 무한 모드 해금', key: 'clears', target: 1 }
  ];

  /* ───────── 트로피 캐비닛 (원작의 유물) ───────── */
  C.RELIC_RARITIES = [
    { id: 'common', name: '일반', color: '#aebbc2', weight: 4940, duplicate: 8, shards: 5 },
    { id: 'rare', name: '희귀', color: '#69c49a', weight: 2800, duplicate: 12, shards: 8 },
    { id: 'epic', name: '영웅', color: '#9b84e8', weight: 1400, duplicate: 18, shards: 12 },
    { id: 'legendary', name: '전설', color: '#efb85f', weight: 600, duplicate: 30, shards: 20 },
    { id: 'mythic', name: '신화', color: '#f27791', weight: 200, duplicate: 50, shards: 30 },
    { id: 'transcendent', name: '초월', color: '#72eadb', weight: 50, duplicate: 70, shards: 40 },
    { id: 'primordial', name: '태초', color: '#fff0b6', weight: 10, duplicate: 100, shards: 50 }
  ];
  C.RELIC_SUMMON_COST = 100;
  C.RELIC_TEN_COST = 900;
  C.RELIC_MAX_LEVEL = 15;
  C.RELIC_PITY = 39; // 신화 이상이 안 나온 채로 38회를 뽑으면 39회째는 신화 이상 확정
  C.RELIC_UPGRADE_SHARDS = [0, 5, 10, 20, 30, 45, 65, 90, 120, 155, 195, 240, 290, 340, 395];

  // [id, 이름, 아이콘, 희귀도, 라벨, 최대 효과]
  var relicRows = [
    ['sponsor_contract', '스폰서 계약서', '📜', 0, '시작 골드', { startGold: 80 }],
    ['transfer_seal', '이적 시장 인장', '💱', 0, '선수 판매 가격', { sellBonus: 0.10 }],
    ['broadcast_rights', '중계권 장부', '📺', 0, '웨이브 클리어 골드', { waveGold: 0.15 }],
    ['steel_studs', '강철 스터드', '🔩', 0, '전체 공격력', { damage: 0.03 }],
    ['coin_toss', '킥오프 동전', '🪙', 0, '영입 비용 환급 확률', { refundChance: 0.08 }],
    ['youth_academy', '유스 아카데미', '🏫', 0, '영입 비용', { summonDiscount: 8 }],
    ['stopwatch', '코치의 스톱워치', '⏱️', 1, '전체 공격속도', { rate: 0.22 }],
    ['binoculars', '전술 쌍안경', '🔭', 1, '전체 사거리', { range: 0.08 }],
    ['home_kit', '홈 유니폼', '👕', 1, '전체 공격력', { damage: 0.04 }],
    ['bronze_medal', '동메달', '🥉', 1, '전체 공격력', { damage: 0.04 }],
    ['tactics_board', '전술 보드', '📋', 1, '전체 치명타 확률', { crit: 0.05 }],
    ['captain_band', '주장 완장', '🎖️', 2, '전체 공격력', { damage: 0.065 }],
    ['giant_scarf', '거인 사냥 머플러', '🧣', 2, '보스 추가 피해', { bossDamage: 0.22 }],
    ['wet_pitch', '물 뿌린 잔디', '💧', 2, '적 이동속도 감소', { enemySlow: 0.08 }],
    ['hostile_crowd', '원정 텃세', '📣', 2, '적 최대 체력 감소', { enemyHpDown: 0.05 }],
    ['lucky_coin', '행운의 동전', '🍀', 2, '전설·신화 영입 가중치', { highTierLuck: 0.20 }],
    ['ucl_medal', '챔피언스리그 메달', '🥇', 3, '전체 공격력', { damage: 0.065 }],
    ['golden_boot', '골든 부트', '👟', 3, '전체 공격력', { damage: 0.065 }],
    ['offside_trap', '오프사이드 트랩', '🚩', 3, '모든 적 방어력', { enemyArmorBreak: 0.20 / 1.3 }],
    // 히든이 영입 대상에서 빠지면서 '히든 영입 확률' → '초월 영입 가중치'로 변경 (보유 레벨은 그대로 유지)
    ['legend_invite', '레전드 매치 초대장', '🃏', 3, '초월 영입 가중치', { transLuck: 0.25 }],
    ['magic_boots', '마법의 축구화', '🪄', 3, '확률 스킬 발동률', { procChance: 0.02 }],
    ['owner_cheque', '구단주의 수표', '💵', 4, '시작 골드', { startGold: 220 }],
    ['endless_lungs', '무한 체력 심장', '❤️‍🔥', 4, '공격·속도·사거리', { damage: 0.15, rate: 0.12, range: 0.05 }],
    ['home_turf', '홈 구장 잔디', '🏟️', 4, '적 체력·속도와 보스 피해', { enemyHpDown: 0.05, enemySlow: 0.05, bossDamage: 0.10 }],
    ['super_agent', '슈퍼 에이전트', '🕴️', 4, '환급 확률과 판매 가격', { refundChance: 0.12, sellBonus: 0.20 }],
    ['scouting_report', '스카우팅 리포트', '🗂️', 4, '신화 영입 가중치', { mythLuck: 0.25 }],
    ['club_savings', '구단 적금 통장', '🏦', 4, '웨이브 종료 복리 이자', { interest: 0.06 }],
    ['crowd_roar', '관중의 함성', '🔊', 5, '발동형 스킬 피해', { procDamage: 0.26 / 1.3 }],
    ['golden_ball', '골든볼', '🟡', 5, '치명타 최종 피해', { critDamage: 0.30 / 1.3 }],
    ['stoppage_time', '추가시간의 기적', '⏰', 5, '적 90명 이상 전투 증폭', { emergencyDamage: 0.20 / 1.3, emergencyRate: 0.16 / 1.3 }],
    ['big_ear', '빅 이어', '🏆', 5, '보스전 피해와 사거리', { bossDamage: 0.23 / 1.3, bossRange: 0.09 / 1.3 }],
    ['world_cup', '월드컵 트로피', '🌍', 6, '선수 다양성 공격력', { diversityDamagePerUnit: 0.01 / 1.3 }],
    ['kickoff_whistle', '킥오프 휘슬', '📯', 6, '웨이브 시작 전투 증폭', { waveStartDamage: 0.16 / 1.3, waveStartRate: 0.24 / 1.3 }],
    ['ballon_dor', '발롱도르', '⚽', 6, '공격·스킬·사거리', { damage: 0.15 / 1.3, procDamage: 0.15 / 1.3, range: 0.08 / 1.3 }]
  ];
  C.RELICS = relicRows.map(function (r) {
    return { id: r[0], name: r[1], icon: r[2], rarity: r[3], label: r[4], effects: r[5] };
  });
  C.RELIC_BY_ID = {};
  C.RELICS.forEach(function (r) { C.RELIC_BY_ID[r.id] = r; });

  C.EMPTY_RELIC_EFFECTS = function () {
    return {
      startGold: 0, summonDiscount: 0, sellBonus: 0, waveGold: 0, refundChance: 0, rate: 0, range: 0, crit: 0,
      damage: 0, bossDamage: 0, enemySlow: 0, enemyHpDown: 0, enemyArmorBreak: 0, highTierLuck: 0, mythLuck: 0,
      transLuck: 0, procChance: 0, interest: 0, procDamage: 0, critDamage: 0, emergencyDamage: 0,
      emergencyRate: 0, bossRange: 0, diversityDamagePerUnit: 0, waveStartDamage: 0, waveStartRate: 0
    };
  };

  C.relicGrowth = function (level, effect) {
    var v = Math.max(1, Math.min(C.RELIC_MAX_LEVEL, Math.floor(Number(level) || 1)));
    if (effect === 'summonDiscount') return 0.1875 + (v - 1) * (1.0625 / (C.RELIC_MAX_LEVEL - 1));
    if (effect === 'refundChance') return v <= 9 ? 0.2 + (v - 1) * (0.835 / 8) : 1.035 + (v - 9) * (0.065 / 6);
    return v <= 10 ? 0.25 + (v - 1) * 0.1 : 1.15 + (v - 10) * 0.03;
  };

  // 아주 작은 값(히든 확률 보너스 등)도 0으로 보이지 않게 자릿수를 늘린다
  var pct = function (n) { var p = n * 100; return Number(p.toFixed(Math.abs(p) < 0.1 ? 4 : 2)).toString(); };
  C.relicEffectText = function (relic, level) {
    var e = {};
    Object.keys(relic.effects).forEach(function (k) { e[k] = relic.effects[k] * C.relicGrowth(level, k); });
    switch (relic.id) {
      case 'endless_lungs': return '공격력 +' + pct(e.damage) + '% · 공격속도 +' + pct(e.rate) + '% · 사거리 +' + pct(e.range) + '%';
      case 'home_turf': return '적 체력 −' + pct(e.enemyHpDown) + '% · 이동속도 −' + pct(e.enemySlow) + '% · 보스 피해 +' + pct(e.bossDamage) + '%';
      case 'super_agent': return '영입 환급 +' + pct(e.refundChance) + '% · 판매 가격 +' + pct(e.sellBonus) + '%';
      case 'club_savings': return '웨이브 종료 시 보유 골드의 ' + pct(e.interest) + '% 이자';
      case 'crowd_roar': return '발동형 스킬 피해 +' + pct(e.procDamage) + '%';
      case 'golden_ball': return '치명타 최종 피해 +' + pct(e.critDamage) + '%';
      case 'stoppage_time': return '적 90명 이상 시 공격력 +' + pct(e.emergencyDamage) + '% · 공격속도 +' + pct(e.emergencyRate) + '%';
      case 'big_ear': return '보스 피해 +' + pct(e.bossDamage) + '% · 보스전 사거리 +' + pct(e.bossRange) + '%';
      case 'world_cup': return '서로 다른 선수 1명당 공격력 +' + pct(e.diversityDamagePerUnit) + '% · 최대 +' + pct(e.diversityDamagePerUnit * 20) + '%';
      case 'kickoff_whistle': return '웨이브 시작 15초간 공격력 +' + pct(e.waveStartDamage) + '% · 공격속도 +' + pct(e.waveStartRate) + '%';
      case 'ballon_dor': return '공격력 +' + pct(e.damage) + '% · 발동형 스킬 피해 +' + pct(e.procDamage) + '% · 사거리 +' + pct(e.range) + '%';
    }
    var k = Object.keys(e)[0], v = e[k];
    if (k === 'startGold') return relic.label + ' +' + Math.round(v);
    if (k === 'summonDiscount') return relic.label + ' −' + Number(v.toFixed(1)) + ' 골드';
    if (k === 'procChance' || k === 'crit') return relic.label + ' +' + pct(v) + '%p';
    return relic.label + ' ' + (['enemySlow', 'enemyHpDown', 'enemyArmorBreak'].indexOf(k) >= 0 ? '−' : '+') + pct(v) + '%';
  };

  C.RELIC_TOKEN_BONUS = 1.3; // v1.9.0: 웨이브 클리어 토큰 획득량 +30%
  C.relicStageReward = function (wave, difficulty) {
    var mult = (C.DIFFICULTIES[difficulty] || C.DIFFICULTIES.normal).token * C.RELIC_TOKEN_BONUS;
    return Math.max(1, Math.round((15 + Math.floor(Math.max(1, wave) / 3) + (wave % 5 === 0 ? 5 : 0)) * mult));
  };

  C.rollRelic = function (random, pity) {
    var weights = C.RELIC_RARITIES.map(function (r) { return r.weight; });
    if (pity >= C.RELIC_PITY - 1) weights = weights.map(function (w, i) { return i >= 4 ? w : 0; }); // 천장: 신화 이상만 남긴다 (신화·초월·태초 비율은 그대로)
    var total = weights.reduce(function (a, b) { return a + b; }, 0), roll = random() * total, rarity = 0;
    for (var i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll < 0) { rarity = i; break; } }
    var pool = C.RELICS.filter(function (r) { return r.rarity === rarity; });
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  };

  /* ───────── 숫자 포맷 ───────── */
  C.fmt = function (n) {
    n = Number(n) || 0;
    var a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(a >= 1e13 ? 0 : 1) + 'T';
    if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1) + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e4) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'K';
    return Math.round(n).toLocaleString('ko-KR');
  };
})(typeof window !== 'undefined' ? window : globalThis);
