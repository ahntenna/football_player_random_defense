/*
 * 선수 로스터 (CLAUDE.md 기준)
 * - 히든(4): 리오넬 메시, 크리스티아누 호날두, 펠레, 디에고 마라도나 — 비밀 조합으로만 획득
 * - 태초(11): 베켄바우어, 레프 야신, 요한 크루이프, 알프레도 디 스테파노, 조지 베스트, 게르트 뮐러,
 *            페렌츠 푸스카스, 미셸 플라티니, 바비 찰튼, 가린샤, 에우제비우 — 조합으로만 획득
 * - 초월(7): 지네딘 지단, 마르코 반 바스텐, 호나우두, 안드레스 이니에스타, 로타어 마테우스, 사비 에르난데스, 티에리 앙리
 * - 신화 이하(50): The Guardian "The 100 best male footballers in the world 2025" 1~50위
 *   (34위 메시는 히든이므로 제외. 51위 호날두도 히든이므로 건너뛰고 52위 찰하놀루를 편입)
 *   가디언 순위순으로 신화 6 / 전설 8 / 에픽 8 / 유니크 9 / 레어 9 / 노멀 10
 * - 포지션 → 기본 공격 역할(role), 선수 특징 → 플레이 스타일(style) · 패시브(passive, 전설 이상) · 확률 스킬(skill)
 */
(function (root) {
  'use strict';
  var F = root.FPRD = root.FPRD || {};

  F.CLUBS = {
    PSG: { name: '파리 생제르맹', short: 'PSG', c1: '#0f2a5c', c2: '#e30613' },
    BAR: { name: 'FC 바르셀로나', short: 'BAR', c1: '#a50044', c2: '#004d98' },
    RMA: { name: '레알 마드리드', short: 'RMA', c1: '#f4f4f4', c2: '#febe10' },
    BAY: { name: '바이에른 뮌헨', short: 'FCB', c1: '#dc052d', c2: '#0066b2' },
    MCI: { name: '맨체스터 시티', short: 'MCI', c1: '#6cabdd', c2: '#1c2c5b' },
    LIV: { name: '리버풀', short: 'LIV', c1: '#c8102e', c2: '#f6eb61' },
    CHE: { name: '첼시', short: 'CHE', c1: '#034694', c2: '#dba111' },
    ARS: { name: '아스널', short: 'ARS', c1: '#ef0107', c2: '#f4f4f4' },
    NAP: { name: 'SSC 나폴리', short: 'NAP', c1: '#12a0d7', c2: '#f4f4f4' },
    INT: { name: '인테르', short: 'INT', c1: '#0068a8', c2: '#111111' },
    ATM: { name: '아틀레티코 마드리드', short: 'ATM', c1: '#cb3524', c2: '#272e61' },
    BVB: { name: '보루시아 도르트문트', short: 'BVB', c1: '#fde100', c2: '#111111' },
    GAL: { name: '갈라타사라이', short: 'GS', c1: '#a90432', c2: '#fdb912' },
    MIA: { name: '인터 마이애미', short: 'MIA', c1: '#f7b5cd', c2: '#231f20' },
    NAS: { name: '알나스르', short: 'NSR', c1: '#fcd116', c2: '#003da5' },
    // 레전드 소속 (대표 클럽)
    SAN: { name: '산투스 (레전드)', short: 'SAN', c1: '#f4f4f4', c2: '#111111' },
    NAPL: { name: 'SSC 나폴리 (레전드)', short: 'NAP', c1: '#12a0d7', c2: '#f4f4f4' },
    BAYL: { name: '바이에른 뮌헨 (레전드)', short: 'FCB', c1: '#dc052d', c2: '#f4f4f4' },
    RMAL: { name: '레알 마드리드 (레전드)', short: 'RMA', c1: '#f4f4f4', c2: '#febe10' },
    MILL: { name: 'AC 밀란 (레전드)', short: 'MIL', c1: '#fb090b', c2: '#111111' },
    BARL: { name: 'FC 바르셀로나 (레전드)', short: 'BAR', c1: '#a50044', c2: '#004d98' },
    ARSL: { name: '아스널 (레전드)', short: 'ARS', c1: '#ef0107', c2: '#f4f4f4' },
    MUNL: { name: '맨체스터 유나이티드 (레전드)', short: 'MUN', c1: '#da291c', c2: '#fbe122' },
    JUVL: { name: '유벤투스 (레전드)', short: 'JUV', c1: '#111111', c2: '#f4f4f4' },
    DIN: { name: '디나모 모스크바 (레전드)', short: 'DIN', c1: '#1f5fbf', c2: '#f4f4f4' },
    BOT: { name: '보타포구 (레전드)', short: 'BOT', c1: '#111111', c2: '#f4f4f4' },
    BEN: { name: '벤피카 (레전드)', short: 'BEN', c1: '#e30613', c2: '#f4f4f4' }
  };

  // 확률 스킬 축약 생성기: (이름, 확률%, 형태, 배율, 최대 대상, 반경, 효과, 수치)
  function sk(name, chance, shape, mult, count, radius, fx, v) {
    return { name: name, chance: chance / 100, shape: shape, mult: mult, count: count, radius: radius, fx: fx || 'none', v: v || 0 };
  }

  var P = [];
  function add(o) { P.push(o); }

  /* ═════════ 태초 (Primordial) · 역대 레전드 11인 — 조합으로만 획득 ═════════ */
  add({ id: 'beckenbauer', name: '프란츠 베켄바우어', en: 'Franz Beckenbauer', rank: null, age: null, club: 'BAYL', nation: '독일', pos: 'DF', tier: 7, legend: '1945–2024',
    style: 'captain', role: 'defender', nick: '카이저',
    trait: '"리베로"를 완성한 황제. 선수(1974)와 감독(1990)으로 모두 월드컵을 들어 올린 바이에른 뮌헨의 전설.',
    passive: { key: 'kaiser', name: '카이저 리베로', armor: 0.35, slow: 0.12, dmg: 0.15, desc: '모든 적 방어력 −35%, 이동속도 −12%, 모든 아군 공격력 +15% (중첩 불가).' },
    skill: sk('리베로 전진', 13, 'global', 4, 40, 0, 'knock', 3) });
  add({ id: 'yashin', name: '레프 야신', en: 'Lev Yashin', rank: null, age: null, club: 'DIN', nation: '소련', pos: 'GK', tier: 7, legend: '1929–1990',
    style: 'save', role: 'keeper', nick: '흑거미',
    trait: '골키퍼로는 유일한 발롱도르 수상자(1963). 검은 유니폼과 150번이 넘는 페널티 선방으로 전설이 되었다.',
    passive: { key: 'keeperWall', name: '흑거미', globalSlow: 0.12, every: 12, stun: 1.6, desc: '경기장의 모든 적 이동속도 −12% (중첩 불가). 열두 번째 공격마다 사거리 안의 모든 적 1.6초 기절.' },
    skill: sk('페널티 선방', 12, 'splash', 3.6, 16, 5, 'stun', 2) });
  add({ id: 'cruyff', name: '요한 크루이프', en: 'Johan Cruyff', rank: null, age: null, club: 'BARL', nation: '네덜란드', pos: 'FW', tier: 7, legend: '1947–2016',
    style: 'pass', role: 'playmaker', nick: '토털 풋볼의 아버지',
    trait: '토털 풋볼의 상징이자 크루이프 턴의 창시자. 발롱도르 3회, 감독으로 바르셀로나의 철학과 라 마시아를 세웠다.',
    passive: { key: 'goat', name: '토털 풋볼', dmg: 0.12, rate: 0.1, chain: 7, desc: '모든 아군 공격력 +12%, 공격속도 +10% (중첩 불가). 기본 공격이 최대 7명에게 연쇄(피해 감소 없음).' },
    skill: sk('크루이프 턴', 15, 'chain', 5.5, 14, 4.2, 'stun', 1.4) });
  add({ id: 'di_stefano', name: '알프레도 디 스테파노', en: 'Alfredo Di Stéfano', rank: null, age: null, club: 'RMAL', nation: '아르헨티나·스페인', pos: 'FW', tier: 7, legend: '1926–2014',
    style: 'bigGame', role: 'finisher', nick: '금발의 화살',
    trait: '레알 마드리드 유러피언컵 5연패(1956–60)의 중심. 공격과 수비를 가리지 않은 완전한 축구 선수.',
    passive: { key: 'bossHunter', name: '유러피언컵 5연패', dmg: 1.0, rate: 0.3, desc: '보스에게 +100% 피해. 보스가 있는 동안 공격속도 +30%.' },
    skill: sk('금발의 화살', 14, 'line', 6.5, 12, 1.3, 'weaken', 0.45) });
  add({ id: 'best', name: '조지 베스트', en: 'George Best', rank: null, age: null, club: 'MUNL', nation: '북아일랜드', pos: 'WG', tier: 7, legend: '1946–2005',
    style: 'dribble', role: 'playmaker', nick: '다섯 번째 비틀스',
    trait: '화려한 드리블로 맨체스터 유나이티드에 첫 유러피언컵(1968)을 안긴 천재 윙어. 같은 해 발롱도르 수상.',
    passive: { key: 'fullChain', name: '엘 비틀', extra: 5, desc: '기본 공격 연쇄 대상 +5명, 연쇄 피해 감소 없음.' },
    skill: sk('다섯 명 제치기', 15, 'chain', 6, 10, 3.6, 'haste', 0.6) });
  add({ id: 'muller', name: '게르트 뮐러', en: 'Gerd Müller', rank: null, age: null, club: 'BAYL', nation: '독일', pos: 'FW', tier: 7, legend: '1945–2021',
    style: 'finish', role: 'poacher', nick: '데어 봄버',
    trait: 'A매치 62경기 68골, 분데스리가 365골의 폭격기. 박스 안 어디서든 골을 만들어낸 1974 월드컵 결승골의 주인공.',
    passive: { key: 'execute', name: '데어 봄버', hp: 0.25, boss: 0.5, desc: '체력 25% 이하 일반 적은 즉시 처치. 보스에게 +50% 피해.' },
    skill: sk('박스 안 폭격', 14, 'splash', 5.5, 12, 3.2, 'stun', 1.4) });
  add({ id: 'puskas', name: '페렌츠 푸스카스', en: 'Ferenc Puskás', rank: null, age: null, club: 'RMAL', nation: '헝가리', pos: 'FW', tier: 7, legend: '1927–2006',
    style: 'power', role: 'longshot', nick: '질주하는 소령',
    trait: '헝가리 A매치 85경기 84골의 왼발 대포. 올해의 골에는 그의 이름을 딴 "푸스카스상"이 주어진다.',
    passive: { key: 'siuuu', name: '84골의 왼발', per: 0.015, max: 1.2, boss: 0.4, desc: '공격할수록 공격력 +1.5% (최대 +120%). 보스에게 +40% 피해.' },
    skill: sk('푸스카스상 원더골', 13, 'splash', 6, 14, 4.2, 'weaken', 0.4) });
  add({ id: 'platini', name: '미셸 플라티니', en: 'Michel Platini', rank: null, age: null, club: 'JUVL', nation: '프랑스', pos: 'MF', tier: 7, legend: '1955–',
    style: 'setpiece', role: 'longshot', nick: '르 루아',
    trait: '3년 연속 발롱도르(1983–85)를 차지한 프랑스의 10번. 예술적인 프리킥으로 유벤투스와 유로 84 우승을 이끌었다.',
    passive: { key: 'freekick', name: '프리킥의 예술', every: 3, mult: 4.5, radius: 3.4, desc: '세 번째 공격마다 적이 가장 밀집한 곳에 프리킥 폭발(4.5배, 반경 3.4칸).' },
    skill: sk('3년 연속 발롱도르', 13, 'splash', 5.5, 14, 4.2, 'stun', 1.4) });
  add({ id: 'charlton', name: '바비 찰튼', en: 'Bobby Charlton', rank: null, age: null, club: 'MUNL', nation: '잉글랜드', pos: 'MF', tier: 7, legend: '1937–2023',
    style: 'power', role: 'finisher', nick: '서 바비',
    trait: '뮌헨 항공 참사를 이겨낸 1966 월드컵 우승의 영웅. 먼 거리에서도 골문을 꿰뚫는 캐넌 슈팅의 발롱도르 수상자.',
    passive: { key: 'assist', name: '1966 월드컵의 영웅', every: 5, dmg: 0.25, dur: 4, desc: '가장 강한 적을 우선 공격한다. 다섯 번째 공격마다 모든 아군 공격력 4초간 +25%.' },
    skill: sk('캐넌 슈팅', 14, 'line', 6, 10, 1.2, 'stun', 1.2) });
  add({ id: 'garrincha', name: '가린샤', en: 'Garrincha', rank: null, age: null, club: 'BOT', nation: '브라질', pos: 'WG', tier: 7, legend: '1933–1983',
    style: 'dribble', role: 'dribbler', nick: '작은 새',
    trait: '휘어진 다리로 수비수를 농락한 드리블의 마술사. 1962 월드컵에서 부상당한 펠레 대신 브라질을 우승으로 이끌었다.',
    passive: { key: 'slowBonus', name: '작은 새', slow: 0.3, dur: 3, bonus: 0.45, desc: '적중한 적 3초간 30% 감속. 감속된 적에게 +45% 피해.' },
    skill: sk('1962 월드컵의 기적', 15, 'chain', 6, 10, 3.6, 'slow', 3) });
  add({ id: 'eusebio', name: '에우제비우', en: 'Eusébio', rank: null, age: null, club: 'BEN', nation: '포르투갈', pos: 'FW', tier: 7, legend: '1942–2014',
    style: 'power', role: 'finisher', nick: '흑표범',
    trait: '벤피카와 포르투갈의 전설. 1966 월드컵 득점왕이자 1965 발롱도르 수상자, 폭발적인 스피드와 강력한 슈팅의 흑표범.',
    passive: { key: 'sprint', name: '흑표범 질주', every: 3, mult: 5.5, count: 12, desc: '세 번째 공격마다 직선으로 질주하며 최대 12명에게 5.5배 관통 피해.' },
    skill: sk('1966 득점왕', 13, 'splash', 5.5, 14, 4, 'stun', 1.4) });

  /* ═════════ 초월 (Transcendent) · 역대 레전드 7인 ═════════ */
  add({ id: 'zidane', name: '지네딘 지단', en: 'Zinedine Zidane', rank: null, age: null, club: 'RMAL', nation: '프랑스', pos: 'MF', tier: 6, legend: '1972–',
    style: 'pass', role: 'playmaker', nick: '지주',
    trait: '우아한 볼 터치와 마르세유 룰렛. 1998 월드컵 결승 2골, 2002 챔피언스리그 결승 왼발 발리의 주인공이자 발롱도르 수상자.',
    passive: { key: 'freekick', name: '글래스고 발리', every: 4, mult: 4.5, radius: 3.2, desc: '네 번째 공격마다 적이 가장 밀집한 곳에 발리슛 폭발(4.5배, 반경 3.2칸).' },
    skill: sk('마르세유 룰렛', 15, 'chain', 4.6, 12, 4, 'weaken', 0.35) });
  add({ id: 'van_basten', name: '마르코 반 바스텐', en: 'Marco van Basten', rank: null, age: null, club: 'MILL', nation: '네덜란드', pos: 'FW', tier: 6, legend: '1964–',
    style: 'finish', role: 'finisher', nick: '위트레흐트의 백조',
    trait: '발롱도르 3회에 빛나는 우아한 골잡이. 유로 1988 결승에서 불가능한 각도의 발리슛을 꽂아 넣었다.',
    passive: { key: 'penalty', name: '유로 88 발리', every: 4, mult: 3, desc: '네 번째 공격마다 확정 치명타 + 3배 피해.' },
    skill: sk('백조의 발리', 14, 'line', 6, 10, 1.2, 'stun', 1.3) });
  add({ id: 'ronaldo_nazario', name: '호나우두', en: 'Ronaldo Nazário', rank: null, age: null, club: 'RMAL', nation: '브라질', pos: 'FW', tier: 6, legend: '1976–',
    style: 'pace', role: 'dribbler', nick: '페노메노',
    trait: '폭발적인 스피드와 엘라스티코로 수비를 무너뜨린 괴물 공격수. 2002 월드컵 우승·득점왕, 발롱도르 2회.',
    passive: { key: 'twoFooted', name: '엘라스티코', every: 5, mult: 3, desc: '모든 기본 공격이 두 번 적중한다. 다섯 번째 공격마다 사거리 안의 모든 적에게 3배 피해.' },
    skill: sk('페노메노 돌파', 14, 'line', 5.5, 12, 1.3, 'stun', 1.4) });
  add({ id: 'iniesta', name: '안드레스 이니에스타', en: 'Andrés Iniesta', rank: null, age: null, club: 'BARL', nation: '스페인', pos: 'MF', tier: 6, legend: '1984–',
    style: 'dribble', role: 'playmaker', nick: '돈 안드레스',
    trait: '라 크로케타로 압박을 벗겨내는 중원의 마법사. 2010 월드컵 결승 연장 결승골의 주인공.',
    passive: { key: 'fullChain', name: '라 크로케타', extra: 4, desc: '기본 공격 연쇄 대상 +4명, 연쇄 피해 감소 없음.' },
    skill: sk('2010 월드컵 결승골', 13, 'splash', 5, 12, 4, 'stun', 1.5) });
  add({ id: 'matthaus', name: '로타어 마테우스', en: 'Lothar Matthäus', rank: null, age: null, club: 'BAYL', nation: '독일', pos: 'MF', tier: 6, legend: '1961–',
    style: 'engine', role: 'holding', nick: '철인',
    trait: '독일 A매치 150경기의 철인. 1990 월드컵 우승 주장이자 발롱도르 수상자, 공수 모두 완벽한 박스 투 박스.',
    passive: { key: 'growth', name: '철인', per: 0.05, max: 1.5, desc: '배치 후 웨이브가 지날 때마다 공격력 +5% (최대 +150%).' },
    skill: sk('캡틴의 중거리포', 14, 'splash', 4.6, 10, 3.4, 'rally', 0.35) });
  add({ id: 'xavi', name: '사비 에르난데스', en: 'Xavi Hernández', rank: null, age: null, club: 'BARL', nation: '스페인', pos: 'MF', tier: 6, legend: '1980–',
    style: 'pass', role: 'playmaker', nick: '티키타카의 설계자',
    trait: '바르셀로나와 스페인 황금기(유로 2008 · 2010 월드컵 · 유로 2012)의 지휘자. 정확한 패스로 경기의 흐름을 지배했다.',
    passive: { key: 'metronome', name: '패스의 신', rate: 0.15, dmg: 0.10, desc: '경기장에 있는 동안 모든 아군 공격속도 +15%, 공격력 +10% (중첩 불가).' },
    skill: sk('티키타카 설계', 16, 'chain', 4.2, 12, 4, 'rally', 0.4) });
  add({ id: 'henry', name: '티에리 앙리', en: 'Thierry Henry', rank: null, age: null, club: 'ARSL', nation: '프랑스', pos: 'FW', tier: 6, legend: '1977–',
    style: 'pace', role: 'finisher', nick: '킹 앙리',
    trait: '아스널 무패 우승(2003–04)의 주역이자 프리미어리그 득점왕 4회. 빠른 스피드와 침착한 인사이드 감아차기의 대명사.',
    passive: { key: 'critKing', name: '바바붐', crit: 0.22, haste: 0.35, dur: 3, desc: '치명타 확률 +22%p. 치명타 시 3초간 공격속도 +35%.' },
    skill: sk('인사이드 감아차기', 14, 'line', 5.5, 10, 1.2, 'weaken', 0.4) });

  /* ═════════ 신화 (Mythic) · 가디언 1~6위 ═════════ */
  add({ id: 'dembele', name: '우스만 뎀벨레', en: 'Ousmane Dembélé', rank: 1, age: 28, club: 'PSG', nation: '프랑스', pos: 'FW', tier: 5,
    style: 'dribble', role: 'dribbler', nick: '발롱도르 양발잡이',
    trait: '어느 쪽이 주발인지 본인도 헷갈리는 완벽한 양발잡이. 9번으로 변신해 35골과 함께 발롱도르를 차지했다.',
    passive: { key: 'twoFooted', name: '양발잡이', every: 6, mult: 3, desc: '모든 기본 공격이 두 번 적중한다. 여섯 번째 공격마다 사거리 안의 모든 적에게 3배 피해.' },
    skill: sk('발롱도르 쇼타임', 14, 'splash', 5.5, 16, 4.6, 'stun', 1.6) });
  add({ id: 'yamal', name: '라민 야말', en: 'Lamine Yamal', rank: 2, age: 18, club: 'BAR', nation: '스페인', pos: 'WG', tier: 5,
    style: 'dribble', role: 'playmaker', nick: '바깥발의 마법사',
    trait: '10대에 이미 세계 정상에 선 원더키드. 오른쪽 측면에서 안으로 파고들며 바깥발 감아차기로 골문을 연다.',
    passive: { key: 'curl', name: '트리벨라', chain: 8, per: 0.03, max: 0.9, desc: '기본 공격이 최대 8명에게 연쇄(피해 감소 없음). 배치 후 웨이브가 지날 때마다 공격력 +3% (최대 +90%).' },
    skill: sk('바깥발 감아차기', 15, 'line', 6, 12, 1.4, 'weaken', 0.4) });
  add({ id: 'vitinha', name: '비티냐', en: 'Vitinha', rank: 3, age: 25, club: 'PSG', nation: '포르투갈', pos: 'MF', tier: 5,
    style: 'pass', role: 'playmaker', nick: '메트로놈',
    trait: 'PSG 중원의 심장. 경기의 템포를 완벽히 조율하는 패스와 탈압박으로 유럽 정상을 이끌었다.',
    passive: { key: 'metronome', name: '메트로놈', rate: 0.15, dmg: 0.10, desc: '경기장에 있는 동안 모든 아군 공격속도 +15%, 공격력 +10% (중첩 불가).' },
    skill: sk('템포 장악', 16, 'chain', 4.2, 12, 4.0, 'rally', 0.4) });
  add({ id: 'mbappe', name: '킬리안 음바페', en: 'Kylian Mbappé', rank: 4, age: 27, club: 'RMA', nation: '프랑스', pos: 'FW', tier: 5,
    style: 'pace', role: 'dribbler', nick: '폭주 기관차',
    trait: '세계에서 가장 빠른 공격수 중 한 명. 월드컵 결승 해트트릭의 주인공이자 레알 마드리드의 골잡이.',
    passive: { key: 'sprint', name: '폭주 기관차', every: 3, mult: 5, count: 10, desc: '세 번째 공격마다 직선으로 질주하며 최대 10명에게 5배 관통 피해.' },
    skill: sk('월드컵 결승 해트트릭', 12, 'splash', 5, 14, 4.2, 'stun', 1.5) });
  add({ id: 'kane', name: '해리 케인', en: 'Harry Kane', rank: 5, age: 32, club: 'BAY', nation: '잉글랜드', pos: 'FW', tier: 5,
    style: 'finish', role: 'finisher', nick: '완성형 9번',
    trait: '득점과 연계를 모두 갖춘 완성형 스트라이커. 페널티킥 성공률이 극도로 높은 바이에른의 골 기계.',
    passive: { key: 'assist', name: '어시스트 마스터', every: 5, dmg: 0.2, dur: 4, desc: '가장 강한 적을 우선 공격한다. 다섯 번째 공격마다 모든 아군 공격력 4초간 +20%.' },
    skill: sk('페널티 킥', 14, 'single', 8, 1, 0, 'execute', 0.2) });
  add({ id: 'haaland', name: '엘링 홀란', en: 'Erling Haaland', rank: 6, age: 25, club: 'MCI', nation: '노르웨이', pos: 'FW', tier: 5,
    style: 'finish', role: 'finisher', nick: '사이보그 피니셔',
    trait: '압도적인 피지컬과 결정력의 골 괴물. 박스 안에서 기회를 놓치는 법이 없다.',
    passive: { key: 'execute', name: '사이보그 피니셔', hp: 0.2, boss: 0.4, desc: '체력 20% 이하 일반 적은 즉시 처치. 보스에게 +40% 피해.' },
    skill: sk('괴물의 슈팅', 14, 'line', 5.5, 8, 1.1, 'stun', 1.2) });

  /* ═════════ 전설 (Legendary) · 가디언 7~14위 ═════════ */
  add({ id: 'hakimi', name: '아슈라프 하키미', en: 'Achraf Hakimi', rank: 7, age: 27, club: 'PSG', nation: '모로코', pos: 'DF', tier: 4,
    style: 'pace', role: 'wingback', nick: '측면의 폭주족',
    trait: '윙어 같은 공격력을 지닌 세계 최고의 라이트백. 끝없는 오버래핑으로 측면을 지배한다.',
    passive: { key: 'fullPierce', name: '오버래핑 질주', extra: 5, desc: '기본 공격 관통 대상 +5명, 관통 피해 감소 없음.' },
    skill: sk('측면 폭주', 14, 'line', 4.6, 12, 1.2, 'slow', 3) });
  add({ id: 'raphinha', name: '하피냐', en: 'Raphinha', rank: 8, age: 29, club: 'BAR', nation: '브라질', pos: 'WG', tier: 4,
    style: 'setpiece', role: 'longshot', nick: '왼발 폭격기',
    trait: '바르셀로나 공격의 해결사. 강력한 왼발 킥과 세트피스로 공격 포인트를 쏟아낸다.',
    passive: { key: 'freekick', name: '왼발 프리킥', every: 4, mult: 4, radius: 3, desc: '네 번째 공격마다 적이 가장 밀집한 곳에 폭발(4배, 반경 3칸).' },
    skill: sk('감아차기 폭격', 13, 'splash', 4.5, 10, 3.2, 'weaken', 0.35) });
  add({ id: 'salah', name: '모하메드 살라', en: 'Mohamed Salah', rank: 9, age: 33, club: 'LIV', nation: '이집트', pos: 'WG', tier: 4,
    style: 'finish', role: 'dribbler', nick: '이집트 왕',
    trait: '오른쪽에서 안으로 파고드는 왼발 감아차기의 대명사. 리버풀 역사상 손꼽히는 득점 기계.',
    passive: { key: 'critKing', name: '이집트 왕', crit: 0.2, haste: 0.3, dur: 3, desc: '치명타 확률 +20%p. 치명타 시 3초간 공격속도 +30%.' },
    skill: sk('왼발 감아차기', 15, 'chain', 4, 7, 3.4, 'weaken', 0.3) });
  add({ id: 'pedri', name: '페드리', en: 'Pedri', rank: 10, age: 23, club: 'BAR', nation: '스페인', pos: 'MF', tier: 4,
    style: 'pass', role: 'playmaker', nick: '이니에스타의 후계자',
    trait: '이니에스타의 후계자로 불리는 바르셀로나의 두뇌. 좁은 공간에서도 공을 잃지 않는다.',
    passive: { key: 'teamRate', name: '티키타카', v: 0.12, desc: '경기장에 있는 동안 모든 아군 공격속도 +12% (중첩 불가).' },
    skill: sk('티키타카', 16, 'chain', 3.6, 10, 3.8, 'rally', 0.35) });
  add({ id: 'nuno_mendes', name: '누누 멘드스', en: 'Nuno Mendes', rank: 11, age: 23, club: 'PSG', nation: '포르투갈', pos: 'DF', tier: 4,
    style: 'pace', role: 'wingback', nick: '왼쪽 고속도로',
    trait: '폭발적인 스피드로 왼쪽 측면을 오르내리는 레프트백. 수비와 공격 모두에서 상대를 압도한다.',
    passive: { key: 'slowBonus', name: '왼쪽 고속도로', slow: 0.25, dur: 2.5, bonus: 0.3, desc: '적중한 적 2.5초간 25% 감속. 감속된 적에게 +30% 피해.' },
    skill: sk('풀백 질주', 14, 'line', 3.8, 10, 1.1, 'slow', 3) });
  add({ id: 'palmer', name: '콜 파머', en: 'Cole Palmer', rank: 12, age: 23, club: 'CHE', nation: '잉글랜드', pos: 'MF', tier: 4,
    style: 'finish', role: 'finisher', nick: '콜드 팔머',
    trait: '얼음처럼 차가운 침착함의 첼시 에이스. 페널티킥에서 거의 실수하지 않는다.',
    passive: { key: 'penalty', name: '콜드 팔머', every: 5, mult: 2.5, desc: '다섯 번째 공격마다 확정 치명타 + 2.5배 피해 (PK).' },
    skill: sk('파넨카', 13, 'single', 6, 1, 0, 'execute', 0.15) });
  add({ id: 'donnarumma', name: '잔루이지 돈나룸마', en: 'Gianluigi Donnarumma', rank: 13, age: 26, club: 'MCI', nation: '이탈리아', pos: 'GK', tier: 4,
    style: 'save', role: 'keeper', nick: '승부차기의 벽',
    trait: '196cm의 거구로 골문을 막는 이탈리아 수문장. 유로 2020 결승 승부차기 선방으로 우승을 이끈 야신상 수상자.',
    passive: { key: 'keeperWall', name: 'PK 선방', globalSlow: 0.08, every: 20, stun: 1.2, desc: '경기장의 모든 적 이동속도 −8% (중첩 불가). 스무 번째 공격마다 사거리 안의 모든 적 1.2초 기절.' },
    skill: sk('승부차기 영웅', 12, 'splash', 2.6, 12, 4.0, 'stun', 1.6) });
  add({ id: 'kvaratskhelia', name: '흐비차 크바라츠헬리아', en: 'Khvicha Kvaratskhelia', rank: 14, age: 24, club: 'PSG', nation: '조지아', pos: 'WG', tier: 4,
    style: 'dribble', role: 'playmaker', nick: '크바라도나',
    trait: '나폴리 팬들이 마라도나에 빗대 "크바라도나"라 부른 드리블러. 수비 여럿을 한 번에 벗겨낸다.',
    passive: { key: 'fullChain', name: '크바라도나', extra: 3, desc: '기본 공격 연쇄 대상 +3명, 연쇄 피해 감소 없음.' },
    skill: sk('크바라도나 드리블', 15, 'chain', 3.2, 9, 3.6, 'weaken', 0.3) });

  /* ═════════ 에픽 (Epic) · 가디언 15~22위 ═════════ */
  add({ id: 'rice', name: '데클런 라이스', en: 'Declan Rice', rank: 15, age: 26, club: 'ARS', nation: '잉글랜드', pos: 'MF', tier: 3,
    style: 'setpiece', role: 'holding', nick: '진공청소기',
    trait: '중원의 모든 공을 쓸어 담는 아스널의 엔진. 레알 마드리드전 직접 프리킥 두 골로 세계를 놀라게 했다.',
    skill: sk('직접 프리킥', 13, 'splash', 3.4, 8, 3.0, 'stun', 1) });
  add({ id: 'doue', name: '데지레 두에', en: 'Désiré Doué', rank: 16, age: 20, club: 'PSG', nation: '프랑스', pos: 'WG', tier: 3,
    style: 'engine', role: 'dribbler', nick: '원더키드',
    trait: '챔피언스리그 결승에서 멀티골을 터뜨린 20세 신성. 경기를 치를수록 성장한다.',
    skill: sk('UCL 결승 멀티골', 14, 'chain', 3.2, 7, 3.2, 'haste', 0.5) });
  add({ id: 'joao_neves', name: '주앙 네베스', en: 'João Neves', rank: 17, age: 21, club: 'PSG', nation: '포르투갈', pos: 'MF', tier: 3,
    style: 'press', role: 'holding', nick: '무한 압박',
    trait: '벤피카 유스 출신. 작은 체구로 경기장 전체를 누비는 압박 기계로, 볼을 뺏는 순간 곧바로 역습을 시작한다.',
    skill: sk('볼 탈취 역습', 15, 'splash', 3, 8, 2.8, 'weaken', 0.35) });
  add({ id: 'bellingham', name: '주드 벨링엄', en: 'Jude Bellingham', rank: 18, age: 22, club: 'RMA', nation: '잉글랜드', pos: 'MF', tier: 3,
    style: 'bigGame', role: 'poacher', nick: '빅게임 플레이어',
    trait: '큰 경기일수록 빛나는 레알 마드리드의 슈퍼스타. 유로 2024 추가시간 바이시클킥 동점골의 주인공.',
    skill: sk('추가시간 바이시클킥', 13, 'splash', 3.6, 8, 2.8, 'stun', 1.2) });
  add({ id: 'mctominay', name: '스콧 맥토미니', en: 'Scott McTominay', rank: 19, age: 29, club: 'NAP', nation: '스코틀랜드', pos: 'MF', tier: 3,
    style: 'engine', role: 'poacher', nick: '나폴리의 스코틀랜드인',
    trait: '박스 침투 타이밍이 탁월한 득점형 미드필더. 나폴리 우승과 함께 세리에A MVP에 올랐다.',
    skill: sk('늦은 침투', 14, 'splash', 3.2, 7, 2.6, 'weaken', 0.3) });
  add({ id: 'lautaro', name: '라우타로 마르티네스', en: 'Lautaro Martínez', rank: 20, age: 28, club: 'INT', nation: '아르헨티나', pos: 'FW', tier: 3,
    style: 'press', role: 'finisher', nick: '엘 토로',
    trait: '"황소"라는 별명처럼 저돌적인 인테르의 주장. 쉼 없는 전방 압박과 골 결정력을 겸비한 월드컵 우승 멤버.',
    skill: sk('엘 토로 돌진', 13, 'line', 3.6, 8, 1.0, 'stun', 1) });
  add({ id: 'olise', name: '마이클 올리세', en: 'Michael Olise', rank: 21, age: 24, club: 'BAY', nation: '프랑스', pos: 'WG', tier: 3,
    style: 'pass', role: 'wingback', nick: '왼발 크리에이터',
    trait: '정교한 왼발 크로스와 창의성으로 기회를 만드는 바이에른의 윙어.',
    skill: sk('왼발 크로스', 15, 'line', 3.2, 8, 1.0, 'rally', 0.3) });
  add({ id: 'vinicius', name: '비니시우스 주니오르', en: 'Vinícius Júnior', rank: 22, age: 25, club: 'RMA', nation: '브라질', pos: 'WG', tier: 3,
    style: 'dribble', role: 'dribbler', nick: '삼바 드리블러',
    trait: '폭발적인 순간 속도와 삼바 리듬의 드리블로 수비를 무너뜨리는 레알 마드리드의 윙어.',
    skill: sk('삼바 드리블', 16, 'chain', 3, 7, 3.2, 'haste', 0.5) });

  /* ═════════ 유니크 (Unique) · 가디언 23~31위 ═════════ */
  add({ id: 'van_dijk', name: '버질 반다이크', en: 'Virgil van Dijk', rank: 23, age: 34, club: 'LIV', nation: '네덜란드', pos: 'DF', tier: 2,
    style: 'captain', role: 'defender', nick: '철벽 캡틴',
    trait: '압도적인 신체와 침착함으로 수비를 지휘하는 리버풀의 주장. 드리블 돌파를 거의 허용하지 않는다.',
    skill: sk('철벽 수비', 14, 'splash', 2.6, 9, 3.0, 'knock', 2.5) });
  add({ id: 'lewandowski', name: '로베르트 레반도프스키', en: 'Robert Lewandowski', rank: 24, age: 37, club: 'BAR', nation: '폴란드', pos: 'FW', tier: 2,
    style: 'finish', role: 'finisher', nick: '골 머신',
    trait: '9분 5골의 전설을 쓴 통산 600골 이상의 골 머신. 게르트 뮐러의 분데스리가 한 시즌 최다 골(40골) 기록을 넘어섰다.',
    skill: sk('9분 5골', 15, 'single', 5.5, 1, 0, 'execute', 0.12) });
  add({ id: 'julian_alvarez', name: '훌리안 알바레스', en: 'Julián Álvarez', rank: 25, age: 25, club: 'ATM', nation: '아르헨티나', pos: 'FW', tier: 2,
    style: 'press', role: 'poacher', nick: '라 아라냐 (거미)',
    trait: '거미처럼 끈질긴 전방 압박의 달인. 월드컵 우승 멤버이자 아틀레티코의 골잡이.',
    skill: sk('거미줄 압박', 15, 'splash', 2.6, 8, 2.8, 'slow', 3) });
  add({ id: 'saka', name: '부카요 사카', en: 'Bukayo Saka', rank: 26, age: 24, club: 'ARS', nation: '잉글랜드', pos: 'WG', tier: 2,
    style: 'pace', role: 'dribbler', nick: '스타보이',
    trait: '아스널 유스가 배출한 스타보이. 오른쪽에서 컷인 후 왼발 슈팅이 일품이다.',
    skill: sk('컷인 슈팅', 15, 'chain', 3, 6, 3.0, 'weaken', 0.3) });
  add({ id: 'fabian_ruiz', name: '파비안 루이스', en: 'Fabián Ruiz', rank: 27, age: 29, club: 'PSG', nation: '스페인', pos: 'MF', tier: 2,
    style: 'power', role: 'longshot', nick: '왼발 중거리',
    trait: '부드러운 왼발로 중거리포를 꽂아 넣는 스페인 미드필더. 유로 2024 우승의 주역.',
    skill: sk('왼발 캐넌', 13, 'splash', 3, 7, 2.6, 'weaken', 0.25) });
  add({ id: 'gyokeres', name: '빅토르 요케레스', en: 'Viktor Gyökeres', rank: 28, age: 27, club: 'ARS', nation: '스웨덴', pos: 'FW', tier: 2,
    style: 'press', role: 'poacher', nick: '가면 세리머니',
    trait: '힘으로 수비를 밀어내는 탱크형 스트라이커. 골을 넣으면 손으로 가면을 만드는 세리머니가 유명하다.',
    skill: sk('탱크 돌파', 14, 'line', 3.4, 8, 1.1, 'stun', 0.8) });
  add({ id: 'gabriel', name: '가브리엘 마갈량이스', en: 'Gabriel Magalhães', rank: 29, age: 28, club: 'ARS', nation: '브라질', pos: 'DF', tier: 2,
    style: 'aerial', role: 'defender', nick: '세트피스 헤더',
    trait: '세트피스에서 머리로 골을 만드는 아스널의 센터백. 공중볼 경합에서 좀처럼 지지 않는다.',
    skill: sk('코너킥 헤더', 14, 'splash', 2.8, 7, 2.6, 'stun', 1.1) });
  add({ id: 'courtois', name: '티보 쿠르투아', en: 'Thibaut Courtois', rank: 30, age: 33, club: 'RMA', nation: '벨기에', pos: 'GK', tier: 2,
    style: 'save', role: 'keeper', nick: '거미손',
    trait: '2m 장신의 레알 마드리드 수문장. 챔피언스리그 결승 MVP에 오른 선방 능력.',
    skill: sk('UCL 결승 선방쇼', 12, 'splash', 2, 10, 3.6, 'stun', 1.4) });
  add({ id: 'luis_diaz', name: '루이스 디아스', en: 'Luis Díaz', rank: 31, age: 28, club: 'BAY', nation: '콜롬비아', pos: 'WG', tier: 2,
    style: 'dribble', role: 'dribbler', nick: '루초',
    trait: '지칠 줄 모르는 활동량과 과감한 드리블의 콜롬비아 윙어.',
    skill: sk('루초 드리블', 16, 'chain', 2.6, 6, 3.0, 'haste', 0.4) });

  /* ═════════ 레어 (Rare) · 가디언 32~41위 (34위 메시 제외) ═════════ */
  add({ id: 'caicedo', name: '모이세스 카이세도', en: 'Moisés Caicedo', rank: 32, age: 24, club: 'CHE', nation: '에콰도르', pos: 'MF', tier: 1,
    style: 'tackle', role: 'defender', nick: '볼 위너',
    trait: '태클과 가로채기로 공을 따내는 첼시의 볼 위닝 미드필더.',
    skill: sk('볼 탈취', 15, 'splash', 2.4, 6, 2.4, 'weaken', 0.3) });
  add({ id: 'saliba', name: '윌리엄 살리바', en: 'William Saliba', rank: 33, age: 24, club: 'ARS', nation: '프랑스', pos: 'DF', tier: 1,
    style: 'tackle', role: 'defender', nick: '침착함의 대명사',
    trait: '스피드와 침착함을 겸비한 아스널의 센터백. 1대1 수비에서 좀처럼 뚫리지 않는다.',
    skill: sk('커버 플레이', 13, 'splash', 2.2, 7, 2.8, 'slow', 3.5) });
  add({ id: 'mac_allister', name: '알렉시스 맥앨리스터', en: 'Alexis Mac Allister', rank: 35, age: 26, club: 'LIV', nation: '아르헨티나', pos: 'MF', tier: 1,
    style: 'pass', role: 'playmaker', nick: '중원의 조율사',
    trait: '월드컵 우승 멤버. 리버풀 중원에서 경기의 흐름을 조율한다.',
    skill: sk('템포 조율', 15, 'chain', 2.4, 7, 3.4, 'rally', 0.3) });
  add({ id: 'wirtz', name: '플로리안 비르츠', en: 'Florian Wirtz', rank: 36, age: 22, club: 'LIV', nation: '독일', pos: 'MF', tier: 1,
    style: 'pass', role: 'playmaker', nick: '창의적인 10번',
    trait: '좁은 공간을 여는 패스와 턴 동작이 일품인 독일의 공격형 미드필더.',
    skill: sk('스루 패스', 15, 'chain', 2.2, 7, 3.4, 'weaken', 0.2) });
  add({ id: 'valverde', name: '페데리코 발베르데', en: 'Federico Valverde', rank: 37, age: 27, club: 'RMA', nation: '우루과이', pos: 'MF', tier: 1,
    style: 'engine', role: 'holding', nick: '엘 파하리토',
    trait: '지치지 않는 엔진을 가진 레알 마드리드의 박스 투 박스 미드필더. 강력한 중거리슛도 갖췄다.',
    skill: sk('박스 투 박스', 14, 'line', 2.8, 6, 1.0, 'haste', 0.4) });
  add({ id: 'szoboszlai', name: '도미니크 소보슬러이', en: 'Dominik Szoboszlai', rank: 38, age: 25, club: 'LIV', nation: '헝가리', pos: 'MF', tier: 1,
    style: 'power', role: 'longshot', nick: '헝가리의 대포',
    trait: '헝가리 대표팀 주장. 대포알 같은 중거리슛과 프리킥이 무기다.',
    skill: sk('대포알 슈팅', 13, 'splash', 3, 7, 2.6, 'stun', 0.6) });
  add({ id: 'guirassy', name: '세루 기라시', en: 'Serhou Guirassy', rank: 39, age: 29, club: 'BVB', nation: '기니', pos: 'FW', tier: 1,
    style: 'finish', role: 'poacher', nick: '박스 킬러',
    trait: '박스 안에서의 골 감각이 탁월한 도르트문트의 스트라이커.',
    skill: sk('박스 안 침투', 14, 'splash', 2.6, 6, 2.4, 'weaken', 0.25) });
  add({ id: 'dumfries', name: '덴절 뒴프리스', en: 'Denzel Dumfries', rank: 40, age: 29, club: 'INT', nation: '네덜란드', pos: 'DF', tier: 1,
    style: 'pace', role: 'wingback', nick: '오버래핑 윙백',
    trait: '공격 가담이 뛰어난 인테르의 윙백. 챔피언스리그 4강에서 맹활약했다.',
    skill: sk('오버래핑', 14, 'line', 3, 7, 0.9, 'slow', 3) });
  add({ id: 'gravenberch', name: '라이언 흐라벤베르흐', en: 'Ryan Gravenberch', rank: 41, age: 23, club: 'LIV', nation: '네덜란드', pos: 'MF', tier: 1,
    style: 'pass', role: 'holding', nick: '우아한 탈압박',
    trait: '긴 다리와 부드러운 볼 운반으로 압박을 벗겨내는 리버풀의 수비형 미드필더.',
    skill: sk('탈압박', 15, 'single', 3.5, 1, 0, 'haste', 0.5) });

  /* ═════════ 노멀 (Normal) · 가디언 42~50위 + 52위 ═════════ */
  add({ id: 'marquinhos', name: '마르키뉴스', en: 'Marquinhos', rank: 42, age: 31, club: 'PSG', nation: '브라질', pos: 'DF', tier: 0,
    style: 'captain', role: 'defender', nick: 'PSG의 캡틴',
    trait: '10년 넘게 PSG 수비를 이끈 주장. 마침내 챔피언스리그 트로피를 들어 올렸다.',
    skill: sk('캡틴의 호령', 13, 'splash', 2, 6, 2.4, 'rally', 0.3) });
  add({ id: 'musiala', name: '자말 무시알라', en: 'Jamal Musiala', rank: 43, age: 22, club: 'BAY', nation: '독일', pos: 'MF', tier: 0,
    style: 'dribble', role: 'dribbler', nick: '밤비',
    trait: '좁은 공간을 춤추듯 빠져나가는 드리블 천재. 바이에른과 독일 대표팀의 미래.',
    skill: sk('밤비 드리블', 16, 'chain', 2.4, 6, 2.8, 'slow', 2.5) });
  add({ id: 'pacho', name: '윌리안 파초', en: 'Willian Pacho', rank: 44, age: 24, club: 'PSG', nation: '에콰도르', pos: 'DF', tier: 0,
    style: 'tackle', role: 'defender', nick: '대인 마크',
    trait: '강인한 대인 방어로 PSG 수비의 한 축을 맡은 에콰도르 센터백.',
    skill: sk('대인 마크', 14, 'single', 3, 1, 0, 'weaken', 0.3) });
  add({ id: 'odegaard', name: '마르틴 외데고르', en: 'Martin Ødegaard', rank: 45, age: 27, club: 'ARS', nation: '노르웨이', pos: 'MF', tier: 0,
    style: 'pass', role: 'playmaker', nick: '아스널의 캡틴',
    trait: '아스널의 주장이자 창의적인 패스 마스터. 정교한 왼발로 찬스를 만든다.',
    skill: sk('킬러 패스', 15, 'chain', 2, 6, 3.2, 'rally', 0.2) });
  add({ id: 'osimhen', name: '빅터 오시멘', en: 'Victor Osimhen', rank: 46, age: 26, club: 'GAL', nation: '나이지리아', pos: 'FW', tier: 0,
    style: 'aerial', role: 'poacher', nick: '마스크맨',
    trait: '폭발적인 점프력으로 공중볼을 지배하는 나이지리아의 스트라이커. 트레이드마크는 안면 마스크.',
    skill: sk('파워 헤더', 13, 'splash', 2.4, 7, 2.8, 'stun', 1) });
  add({ id: 'enzo', name: '엔소 페르난데스', en: 'Enzo Fernández', rank: 47, age: 24, club: 'CHE', nation: '아르헨티나', pos: 'MF', tier: 0,
    style: 'power', role: 'holding', nick: '월드컵 영플레이어',
    trait: '2022 월드컵 영플레이어 출신. 강력한 중거리슛을 가진 첼시의 미드필더.',
    skill: sk('중거리 캐넌', 14, 'splash', 2.6, 6, 2.6, 'none', 0) });
  add({ id: 'isak', name: '알렉산데르 이사크', en: 'Alexander Isak', rank: 48, age: 26, club: 'LIV', nation: '스웨덴', pos: 'FW', tier: 0,
    style: 'finish', role: 'finisher', nick: '우아한 피니셔',
    trait: '긴 다리로 부드럽게 수비를 벗겨내고 침착하게 마무리하는 스웨덴 스트라이커.',
    skill: sk('침착한 마무리', 12, 'single', 4.5, 1, 0, 'execute', 0.1) });
  add({ id: 'alisson', name: '알리송', en: 'Alisson Becker', rank: 49, age: 33, club: 'LIV', nation: '브라질', pos: 'GK', tier: 0,
    style: 'save', role: 'keeper', nick: '스위퍼 키퍼',
    trait: '선방과 빌드업을 겸비한 리버풀의 수문장. 골키퍼인데도 헤더 골을 넣은 적이 있다.',
    skill: sk('슈퍼 세이브', 12, 'splash', 1.6, 8, 3.2, 'stun', 1.2) });
  add({ id: 'kimmich', name: '요주아 키미히', en: 'Joshua Kimmich', rank: 50, age: 30, club: 'BAY', nation: '독일', pos: 'MF', tier: 0,
    style: 'captain', role: 'holding', nick: '만능 전술가',
    trait: '풀백과 미드필더를 오가는 바이에른의 만능 선수. 전술 이해도가 매우 높다.',
    skill: sk('전술 지시', 14, 'chain', 1.8, 5, 3.0, 'rally', 0.25) });
  add({ id: 'calhanoglu', name: '하칸 찰하놀루', en: 'Hakan Çalhanoğlu', rank: 52, age: 31, club: 'INT', nation: '튀르키예', pos: 'MF', tier: 0,
    style: 'setpiece', role: 'longshot', nick: '데드볼 스페셜리스트',
    trait: '정확한 킥으로 프리킥과 페널티킥을 전담하는 인테르의 레지스타.',
    skill: sk('무회전 프리킥', 13, 'splash', 2.8, 6, 2.4, 'weaken', 0.2) });

  /* ═════════ 히든 (Hidden) · 비밀 조합으로만 획득 ═════════ */
  add({ id: 'messi', name: '리오넬 메시', en: 'Lionel Messi', rank: 34, age: 38, club: 'MIA', nation: '아르헨티나', pos: 'FW', tier: 8, hidden: true,
    style: 'dribble', role: 'playmaker', nick: 'GOAT',
    trait: '발롱도르 8회 수상, 2022 월드컵 우승. 드리블·패스·골 모든 것이 역대 최고 수준인 축구의 신.',
    passive: { key: 'goat', name: 'GOAT', dmg: 0.2, rate: 0.1, chain: 8, desc: '모든 아군 공격력 +20%, 공격속도 +10% (중첩 불가). 기본 공격이 최대 8명에게 연쇄(피해 감소 없음).' },
    skill: sk('월드컵 매직', 14, 'global', 5, 40, 0, 'stun', 1.5) });
  add({ id: 'ronaldo', name: '크리스티아누 호날두', en: 'Cristiano Ronaldo', rank: 51, age: 40, club: 'NAS', nation: '포르투갈', pos: 'FW', tier: 8, hidden: true,
    style: 'finish', role: 'finisher', nick: 'CR7',
    trait: '공식 경기 900골을 넘긴 역대 최다 득점자. 챔피언스리그 5회 우승, 헤더·프리킥·양발 모두 완벽한 골잡이.',
    passive: { key: 'siuuu', name: 'SIUUU', per: 0.02, max: 1.5, boss: 0.6, desc: '공격할수록 공격력 +2% (최대 +150%). 보스에게 +60% 피해.' },
    skill: sk('무회전 프리킥', 14, 'splash', 8, 14, 4.5, 'stun', 1.4) });
  add({ id: 'pele', name: '펠레', en: 'Pelé', rank: null, age: null, club: 'SAN', nation: '브라질', pos: 'FW', tier: 8, hidden: true, legend: '1940–2022',
    style: 'finish', role: 'poacher', nick: '축구 황제 (O Rei)',
    trait: '월드컵 3회 우승에 빛나는 유일한 선수. 1,000골 이상을 기록한 "축구 황제".',
    passive: { key: 'king', name: '축구 황제', gold: 0.5, crit: 0.1, desc: '처치 골드 +50%. 모든 아군 치명타 확률 +10%p (중첩 불가).' },
    skill: sk('바이시클 킥', 14, 'splash', 7, 16, 4.8, 'stun', 1.8) });
  add({ id: 'maradona', name: '디에고 마라도나', en: 'Diego Maradona', rank: null, age: null, club: 'NAPL', nation: '아르헨티나', pos: 'MF', tier: 8, hidden: true, legend: '1960–2020',
    style: 'dribble', role: 'dribbler', nick: '신의 손',
    trait: '1986 월드컵 잉글랜드전에서 "신의 손"과 5명을 제친 "세기의 골"을 연달아 넣은 전설. 나폴리의 영원한 10번.',
    passive: { key: 'handOfGod', name: '신의 손', chance: 0.15, mult: 3, desc: '공격 시 15% 확률로 적의 방어를 완전히 무시하고 3배 피해.' },
    skill: sk('세기의 골', 14, 'line', 10, 6, 1.6, 'stun', 1.5) });

  /* 경기장 이름표용 대표 이름: 기본은 성(마지막 단어), 이름으로 더 알려진 선수 · 두 단어 성만 예외 지정.
     칸에 전체 이름이 들어가면 전체 이름, 넘치면 대표 이름을 쓴다 (render.js) */
  var SHORT_NAMES = {
    vinicius: '비니시우스', enzo: '엔소', gabriel: '가브리엘', lautaro: '라우타로',
    fabian_ruiz: '파비안', kvaratskhelia: '흐비차',
    van_basten: '반 바스텐', xavi: '사비', di_stefano: '디 스테파노'
  };
  P.forEach(function (p) {
    var words = p.name.split(' ');
    p.short = SHORT_NAMES[p.id] || words[words.length - 1];
  });

  F.PLAYERS = P;
  F.BY_ID = {};
  P.forEach(function (p) { F.BY_ID[p.id] = p; });

  /* ───────── 조합 (레시피) ─────────
     원작 구조를 따른다: 신화 = 전설 3 / 초월 = 신화 2 + 전설 1 / 태초 = 초월 2 + 신화 2 (+ 인연 있는 선수)
     전설은 조합이 없고 영입 · 에픽 합성 · 지정 영입으로 얻는다. 태초는 조합으로만 얻는다.
     재료는 소속팀 · 대표팀 · 라이벌 · 기록 인연으로 구성했다. 히든은 비밀 조합(태초 + 초월 + 인연 있는 선수들). */
  function r(id, materials, relation, secret) {
    return { id: id, materials: materials.map(function (m) { return { id: m, count: 1 }; }), relation: relation, secret: !!secret };
  }
  F.RECIPES = [
    // 신화 = 전설 3
    r('dembele', ['hakimi', 'kvaratskhelia', 'nuno_mendes'], '유럽 챔피언 PSG의 동료 하키미 · 크바라츠헬리아 · 누누 멘드스가 발롱도르 수상자를 완성한다.'),
    r('yamal', ['pedri', 'raphinha', 'palmer'], '바르사 동료 페드리 · 하피냐, 그리고 유로 2024 결승에서 맞붙은 콜 파머.'),
    r('vitinha', ['nuno_mendes', 'hakimi', 'pedri'], 'PSG 동료 누누 멘드스 · 하키미와 스페인 중원의 라이벌 페드리.'),
    r('mbappe', ['hakimi', 'donnarumma', 'nuno_mendes'], '파리 생제르맹 시절의 동료들 — 절친 하키미, 돈나룸마, 누누 멘드스.'),
    r('kane', ['palmer', 'donnarumma', 'raphinha'], '삼사자 군단 동료 파머, 유로 2020 결승 승부차기의 벽 돈나룸마, 2024 챔피언스리그에서 해트트릭을 맞은 하피냐.'),
    r('haaland', ['donnarumma', 'salah', 'palmer'], '맨시티 동료 돈나룸마, 프리미어리그 득점왕 경쟁자 살라, 시티 유스 출신 파머.'),
    // 초월 = 신화 2 + 전설 1
    r('zidane', ['mbappe', 'dembele', 'hakimi'], '레블뢰의 후예 음바페 · 뎀벨레, 지단 감독 시절 레알 마드리드 1군에 데뷔한 하키미.'),
    r('van_basten', ['haaland', 'kane', 'donnarumma'], '정통 9번의 계보를 잇는 홀란 · 케인, AC 밀란의 수문장 출신 돈나룸마.'),
    r('ronaldo_nazario', ['mbappe', 'haaland', 'raphinha'], '페노메노와 비교되는 폭발적인 공격수 음바페 · 홀란, 셀레상의 후배 하피냐.'),
    r('iniesta', ['yamal', 'vitinha', 'pedri'], '라 마시아의 후예 야말, 중원의 지휘자 비티냐, 후계자 페드리.'),
    r('matthaus', ['kane', 'vitinha', 'hakimi'], '바이에른의 9번 케인, 박스 투 박스 비티냐, 인테르 출신 하키미.'),
    r('xavi', ['dembele', 'yamal', 'raphinha'], '사비 감독 시절 바르셀로나 공격진 뎀벨레 · 야말 · 하피냐.'),
    r('henry', ['kane', 'haaland', 'salah'], '프리미어리그 득점왕의 계보를 잇는 케인 · 홀란 · 살라.'),
    // 태초 = 초월 2 + 신화 2 (+ 인연 있는 선수)
    r('beckenbauer', ['matthaus', 'zidane', 'kane', 'mbappe'], '1990 월드컵 우승 주장 마테우스(감독 베켄바우어), 월드컵 우승자 지단 · 음바페, 바이에른의 케인.'),
    r('yashin', ['van_basten', 'matthaus', 'dembele', 'donnarumma'], '발롱도르 수상자 반 바스텐 · 마테우스 · 뎀벨레, 그리고 야신상 수상자 돈나룸마.'),
    r('cruyff', ['xavi', 'iniesta', 'yamal', 'vitinha'], '라 마시아와 토털 풋볼의 계승자들 — 사비 · 이니에스타 · 야말 · 비티냐.'),
    r('di_stefano', ['zidane', 'ronaldo_nazario', 'mbappe', 'bellingham'], '레알 마드리드의 계보 — 지단 · 호나우두 · 음바페 · 벨링엄.'),
    r('best', ['henry', 'ronaldo_nazario', 'dembele', 'yamal'], '시대를 대표한 드리블러와 윙어들 — 앙리 · 호나우두 · 뎀벨레 · 야말.'),
    r('muller', ['van_basten', 'ronaldo_nazario', 'kane', 'haaland', 'lewandowski'], '골잡이의 계보, 그리고 뮐러의 한 시즌 최다 골 기록을 넘어선 레반도프스키.'),
    r('puskas', ['zidane', 'van_basten', 'mbappe', 'szoboszlai'], '명품 발리슛의 주인공 지단 · 반 바스텐, 레알 후배 음바페, 헝가리 주장 소보슬러이.'),
    r('platini', ['zidane', 'henry', 'mbappe', 'dembele'], '레블뢰 에이스의 계보 — 지단 · 앙리 · 음바페 · 뎀벨레.'),
    r('charlton', ['henry', 'matthaus', 'kane', 'palmer', 'rice'], '삼사자 군단의 후예 케인 · 파머 · 라이스, 프리미어리그의 전설 앙리, 1966 결승 상대 독일의 주장 마테우스.'),
    r('garrincha', ['ronaldo_nazario', 'iniesta', 'yamal', 'raphinha', 'vinicius'], '셀레상의 후예 호나우두 · 하피냐 · 비니시우스와 드리블의 마법사 이니에스타 · 야말.'),
    r('eusebio', ['ronaldo_nazario', 'henry', 'vitinha', 'nuno_mendes', 'joao_neves'], '포르투갈의 후예 비티냐 · 누누 멘드스 · 주앙 네베스(벤피카 유스)와 골잡이 호나우두 · 앙리.'),
    // 히든 (비밀 조합)
    r('messi', ['cruyff', 'iniesta', 'lautaro', 'julian_alvarez'], '바르사의 아버지 크루이프, 황금기의 동료 이니에스타, 2022 월드컵 우승 동료들이 GOAT를 부른다.', true),
    r('ronaldo', ['eusebio', 'zidane', 'vitinha', 'nuno_mendes'], '포르투갈의 전설 에우제비우, 레알 마드리드 감독 지단, 포르투갈 대표팀 동료들이 CR7을 부른다.', true),
    r('pele', ['garrincha', 'ronaldo_nazario', 'raphinha', 'vinicius'], '월드컵을 함께 들어 올린 가린샤와 셀레상의 후예들이 축구 황제를 부른다.', true),
    r('maradona', ['di_stefano', 'henry', 'kvaratskhelia', 'mctominay'], '아르헨티나 출신 레전드 디 스테파노, 또 하나의 "손" 사건의 앙리, "크바라도나"와 나폴리의 맥토미니가 신의 손을 부른다.', true)
  ];
  F.RECIPE_BY_ID = {};
  F.RECIPES.forEach(function (x) { F.RECIPE_BY_ID[x.id] = x; });
  // 히든 비밀 조합은 힌트를 제공하지 않는다. 재료가 경기장에 모이면 '조합 가능'에 나타나며, 그때 발견 처리된다.
})(typeof window !== 'undefined' ? window : globalThis);
