/*
 * 선수 로스터
 * - 출처: The Guardian "The 100 best male footballers in the world 2025" 1~50위
 *   (메시 34위 → 히든 선수이므로 제외. 51위 호날두도 히든이므로 건너뛰고 52위 찰하놀루를 50인에 편입)
 * - 등급: 가디언 순위 기반 (1~2위 태초 / 3~5위 초월 / 6~10위 신화 / 11~18위 전설 / 19~26위 에픽 /
 *         27~35위 유니크 / 36~43위 레어 / 44~52위 노멀)
 * - 히든: 리오넬 메시, 크리스티아누 호날두, 펠레, 디에고 마라도나, 프란츠 베켄바우어
 * - 포지션 → 기본 공격 역할(role), 선수 특징 → 플레이 스타일(style) · 패시브(passive) · 확률 스킬(skill)
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
    SAN: { name: '산투스 (레전드)', short: 'SAN', c1: '#f4f4f4', c2: '#111111' },
    NAPL: { name: 'SSC 나폴리 (레전드)', short: 'NAP', c1: '#12a0d7', c2: '#f4f4f4' },
    BAYL: { name: '바이에른 뮌헨 (레전드)', short: 'FCB', c1: '#dc052d', c2: '#f4f4f4' }
  };

  // 확률 스킬 축약 생성기: (이름, 확률%, 형태, 배율, 최대 대상, 반경, 효과, 수치)
  function sk(name, chance, shape, mult, count, radius, fx, v) {
    return { name: name, chance: chance / 100, shape: shape, mult: mult, count: count, radius: radius, fx: fx || 'none', v: v || 0 };
  }

  // [id, 한글명, 영문명, 가디언 순위, 나이, 클럽, 국적, 포지션, 등급, 스타일, 역할, 별명, 특징]
  var P = [];
  function add(o) { P.push(o); }

  /* ═════════ 태초 (Primordial) · 1~2위 ═════════ */
  add({ id: 'dembele', name: '우스만 뎀벨레', en: 'Ousmane Dembélé', rank: 1, age: 28, club: 'PSG', nation: '프랑스', pos: 'FW', tier: 7,
    style: 'dribble', role: 'dribbler', nick: '발롱도르 양발잡이',
    trait: '어느 쪽이 주발인지 본인도 헷갈리는 완벽한 양발잡이. 9번으로 변신해 35골과 함께 발롱도르를 차지했다.',
    passive: { key: 'twoFooted', name: '양발잡이', every: 6, mult: 3, desc: '모든 기본 공격이 두 번 적중한다. 여섯 번째 공격마다 사거리 안의 모든 적에게 3배 피해.' },
    skill: sk('발롱도르 쇼타임', 14, 'splash', 5.5, 16, 4.6, 'stun', 1.6) });
  add({ id: 'yamal', name: '라민 야말', en: 'Lamine Yamal', rank: 2, age: 18, club: 'BAR', nation: '스페인', pos: 'WG', tier: 7,
    style: 'dribble', role: 'playmaker', nick: '바깥발의 마법사',
    trait: '10대에 이미 세계 정상에 선 원더키드. 오른쪽 측면에서 안으로 파고들며 바깥발 감아차기로 골문을 연다.',
    passive: { key: 'curl', name: '트리벨라', chain: 8, per: 0.03, max: 0.9, desc: '기본 공격이 최대 8명에게 연쇄(피해 감소 없음). 배치 후 웨이브가 지날 때마다 공격력 +3% (최대 +90%).' },
    skill: sk('바깥발 감아차기', 15, 'line', 6, 12, 1.4, 'weaken', 0.4) });

  /* ═════════ 초월 (Transcendent) · 3~5위 ═════════ */
  add({ id: 'vitinha', name: '비티냐', en: 'Vitinha', rank: 3, age: 25, club: 'PSG', nation: '포르투갈', pos: 'MF', tier: 6,
    style: 'pass', role: 'playmaker', nick: '메트로놈',
    trait: 'PSG 중원의 심장. 경기의 템포를 완벽히 조율하는 패스와 탈압박으로 유럽 정상을 이끌었다.',
    passive: { key: 'metronome', name: '메트로놈', rate: 0.15, dmg: 0.10, desc: '경기장에 있는 동안 모든 아군 공격속도 +15%, 공격력 +10% (중첩 불가).' },
    skill: sk('템포 장악', 16, 'chain', 4.2, 12, 4.0, 'rally', 0.4) });
  add({ id: 'mbappe', name: '킬리안 음바페', en: 'Kylian Mbappé', rank: 4, age: 27, club: 'RMA', nation: '프랑스', pos: 'FW', tier: 6,
    style: 'pace', role: 'dribbler', nick: '폭주 기관차',
    trait: '세계에서 가장 빠른 공격수 중 한 명. 월드컵 결승 해트트릭의 주인공이자 레알 마드리드의 골잡이.',
    passive: { key: 'sprint', name: '폭주 기관차', every: 3, mult: 5, count: 10, desc: '세 번째 공격마다 직선으로 질주하며 최대 10명에게 5배 관통 피해.' },
    skill: sk('월드컵 결승 해트트릭', 12, 'splash', 5, 14, 4.2, 'stun', 1.5) });
  add({ id: 'kane', name: '해리 케인', en: 'Harry Kane', rank: 5, age: 32, club: 'BAY', nation: '잉글랜드', pos: 'FW', tier: 6,
    style: 'finish', role: 'finisher', nick: '완성형 9번',
    trait: '득점과 연계를 모두 갖춘 완성형 스트라이커. 페널티킥 성공률이 극도로 높은 바이에른의 골 기계.',
    passive: { key: 'assist', name: '어시스트 마스터', every: 5, dmg: 0.2, dur: 4, desc: '가장 강한 적을 우선 공격한다. 다섯 번째 공격마다 모든 아군 공격력 4초간 +20%.' },
    skill: sk('페널티 킥', 14, 'single', 8, 1, 0, 'execute', 0.2) });

  /* ═════════ 신화 (Mythic) · 6~10위 ═════════ */
  add({ id: 'haaland', name: '엘링 홀란', en: 'Erling Haaland', rank: 6, age: 25, club: 'MCI', nation: '노르웨이', pos: 'FW', tier: 5,
    style: 'finish', role: 'finisher', nick: '사이보그 피니셔',
    trait: '압도적인 피지컬과 결정력의 골 괴물. 박스 안에서 기회를 놓치는 법이 없다.',
    passive: { key: 'execute', name: '사이보그 피니셔', hp: 0.2, boss: 0.4, desc: '체력 20% 이하 일반 적은 즉시 처치. 보스에게 +40% 피해.' },
    skill: sk('괴물의 슈팅', 14, 'line', 5.5, 8, 1.1, 'stun', 1.2) });
  add({ id: 'hakimi', name: '아슈라프 하키미', en: 'Achraf Hakimi', rank: 7, age: 27, club: 'PSG', nation: '모로코', pos: 'DF', tier: 5,
    style: 'pace', role: 'wingback', nick: '측면의 폭주족',
    trait: '윙어 같은 공격력을 지닌 세계 최고의 라이트백. 끝없는 오버래핑으로 측면을 지배한다.',
    passive: { key: 'fullPierce', name: '오버래핑 질주', extra: 5, desc: '기본 공격 관통 대상 +5명, 관통 피해 감소 없음.' },
    skill: sk('측면 폭주', 14, 'line', 4.6, 12, 1.2, 'slow', 3) });
  add({ id: 'raphinha', name: '하피냐', en: 'Raphinha', rank: 8, age: 29, club: 'BAR', nation: '브라질', pos: 'WG', tier: 5,
    style: 'setpiece', role: 'longshot', nick: '왼발 폭격기',
    trait: '바르셀로나 공격의 해결사. 강력한 왼발 킥과 세트피스로 공격 포인트를 쏟아낸다.',
    passive: { key: 'freekick', name: '왼발 프리킥', every: 4, mult: 4, radius: 3, desc: '네 번째 공격마다 적이 가장 밀집한 곳에 폭발(4배, 반경 3칸).' },
    skill: sk('감아차기 폭격', 13, 'splash', 4.5, 10, 3.2, 'weaken', 0.35) });
  add({ id: 'salah', name: '모하메드 살라', en: 'Mohamed Salah', rank: 9, age: 33, club: 'LIV', nation: '이집트', pos: 'WG', tier: 5,
    style: 'finish', role: 'dribbler', nick: '이집트 왕',
    trait: '오른쪽에서 안으로 파고드는 왼발 감아차기의 대명사. 리버풀 역사상 손꼽히는 득점 기계.',
    passive: { key: 'critKing', name: '이집트 왕', crit: 0.2, haste: 0.3, dur: 3, desc: '치명타 확률 +20%p. 치명타 시 3초간 공격속도 +30%.' },
    skill: sk('왼발 감아차기', 15, 'chain', 4, 7, 3.4, 'weaken', 0.3) });
  add({ id: 'pedri', name: '페드리', en: 'Pedri', rank: 10, age: 23, club: 'BAR', nation: '스페인', pos: 'MF', tier: 5,
    style: 'pass', role: 'playmaker', nick: '티키타카의 후계자',
    trait: '이니에스타의 후계자로 불리는 바르셀로나의 두뇌. 좁은 공간에서도 공을 잃지 않는다.',
    passive: { key: 'teamRate', name: '티키타카', v: 0.12, desc: '경기장에 있는 동안 모든 아군 공격속도 +12% (중첩 불가).' },
    skill: sk('티키타카', 16, 'chain', 3.6, 10, 3.8, 'rally', 0.35) });

  /* ═════════ 전설 (Legendary) · 11~18위 ═════════ */
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
    trait: '196cm의 거구로 골문을 막는 이탈리아 수문장. 승부차기에서 수많은 선방을 만들어냈다.',
    passive: { key: 'keeperWall', name: 'PK 선방', globalSlow: 0.08, every: 20, stun: 1.2, desc: '경기장의 모든 적 이동속도 −8% (중첩 불가). 스무 번째 공격마다 사거리 안의 모든 적 1.2초 기절.' },
    skill: sk('승부차기 영웅', 12, 'splash', 2.6, 12, 4.0, 'stun', 1.6) });
  add({ id: 'kvaratskhelia', name: '흐비차 크바라츠헬리아', en: 'Khvicha Kvaratskhelia', rank: 14, age: 24, club: 'PSG', nation: '조지아', pos: 'WG', tier: 4,
    style: 'dribble', role: 'playmaker', nick: '크바라도나',
    trait: '나폴리 팬들이 마라도나에 빗대 "크바라도나"라 부른 드리블러. 수비 여럿을 한 번에 벗겨낸다.',
    passive: { key: 'fullChain', name: '크바라도나', extra: 3, desc: '기본 공격 연쇄 대상 +3명, 연쇄 피해 감소 없음.' },
    skill: sk('크바라도나 드리블', 15, 'chain', 3.2, 9, 3.6, 'weaken', 0.3) });
  add({ id: 'rice', name: '데클런 라이스', en: 'Declan Rice', rank: 15, age: 26, club: 'ARS', nation: '잉글랜드', pos: 'MF', tier: 4,
    style: 'setpiece', role: 'holding', nick: '진공청소기',
    trait: '중원의 모든 공을 쓸어 담는 아스널의 엔진. 레알 마드리드전 직접 프리킥 두 골로 세계를 놀라게 했다.',
    passive: { key: 'armorBreak', name: '진공청소기', v: 0.2, desc: '경기장에 있는 동안 모든 적 방어력 −20% (중첩 불가, 가장 강한 효과만 적용).' },
    skill: sk('직접 프리킥', 13, 'splash', 4, 8, 3.0, 'stun', 1) });
  add({ id: 'doue', name: '데지레 두에', en: 'Désiré Doué', rank: 16, age: 20, club: 'PSG', nation: '프랑스', pos: 'WG', tier: 4,
    style: 'dribble', role: 'dribbler', nick: '원더키드',
    trait: '챔피언스리그 결승에서 멀티골을 터뜨린 20세 신성. 경기를 치를수록 성장한다.',
    passive: { key: 'growth', name: '원더키드', per: 0.04, max: 1.2, desc: '배치 후 웨이브가 지날 때마다 공격력 +4% (최대 +120%).' },
    skill: sk('UCL 결승 멀티골', 14, 'chain', 3.4, 7, 3.2, 'haste', 0.5) });
  add({ id: 'joao_neves', name: '주앙 네베스', en: 'João Neves', rank: 17, age: 21, club: 'PSG', nation: '포르투갈', pos: 'MF', tier: 4,
    style: 'press', role: 'holding', nick: '무한 압박',
    trait: '작은 체구로 경기장 전체를 누비는 압박 기계. 볼을 뺏는 순간 곧바로 역습을 시작한다.',
    passive: { key: 'pressPlus', name: '무한 압박', max: 12, per: 0.18, desc: '압박 중첩 최대 12, 중첩당 피해 +18%.' },
    skill: sk('볼 탈취 역습', 15, 'splash', 3, 8, 2.8, 'weaken', 0.35) });
  add({ id: 'bellingham', name: '주드 벨링엄', en: 'Jude Bellingham', rank: 18, age: 22, club: 'RMA', nation: '잉글랜드', pos: 'MF', tier: 4,
    style: 'bigGame', role: 'poacher', nick: '빅게임 플레이어',
    trait: '큰 경기일수록 빛나는 레알 마드리드의 슈퍼스타. 유로 2024 추가시간 바이시클킥 동점골의 주인공.',
    passive: { key: 'bossHunter', name: '헤이 주드', dmg: 0.8, rate: 0.25, desc: '보스에게 +80% 피해. 보스가 있는 동안 공격속도 +25%.' },
    skill: sk('추가시간 바이시클킥', 13, 'splash', 4.2, 8, 2.8, 'stun', 1.2) });

  /* ═════════ 에픽 (Epic) · 19~26위 ═════════ */
  add({ id: 'mctominay', name: '스콧 맥토미니', en: 'Scott McTominay', rank: 19, age: 29, club: 'NAP', nation: '스코틀랜드', pos: 'MF', tier: 3,
    style: 'engine', role: 'poacher', nick: '나폴리의 스코틀랜드인',
    trait: '박스 침투 타이밍이 탁월한 득점형 미드필더. 나폴리 우승과 함께 세리에A MVP에 올랐다.',
    skill: sk('늦은 침투', 14, 'splash', 3.2, 7, 2.6, 'weaken', 0.3) });
  add({ id: 'lautaro', name: '라우타로 마르티네스', en: 'Lautaro Martínez', rank: 20, age: 28, club: 'INT', nation: '아르헨티나', pos: 'FW', tier: 3,
    style: 'press', role: 'finisher', nick: '엘 토로',
    trait: '"황소"라는 별명처럼 저돌적인 인테르의 주장. 쉼 없는 전방 압박과 골 결정력을 겸비했다.',
    skill: sk('엘 토로 돌진', 13, 'line', 3.6, 8, 1.0, 'stun', 1) });
  add({ id: 'olise', name: '마이클 올리세', en: 'Michael Olise', rank: 21, age: 24, club: 'BAY', nation: '프랑스', pos: 'WG', tier: 3,
    style: 'pass', role: 'wingback', nick: '왼발 크리에이터',
    trait: '정교한 왼발 크로스와 창의성으로 기회를 만드는 바이에른의 윙어.',
    skill: sk('왼발 크로스', 15, 'line', 3.2, 8, 1.0, 'rally', 0.3) });
  add({ id: 'vinicius', name: '비니시우스 주니오르', en: 'Vinícius Júnior', rank: 22, age: 25, club: 'RMA', nation: '브라질', pos: 'WG', tier: 3,
    style: 'dribble', role: 'dribbler', nick: '삼바 드리블러',
    trait: '폭발적인 순간 속도와 삼바 리듬의 드리블로 수비를 무너뜨리는 레알 마드리드의 윙어.',
    skill: sk('삼바 드리블', 16, 'chain', 3, 7, 3.2, 'haste', 0.5) });
  add({ id: 'van_dijk', name: '버질 반다이크', en: 'Virgil van Dijk', rank: 23, age: 34, club: 'LIV', nation: '네덜란드', pos: 'DF', tier: 3,
    style: 'captain', role: 'defender', nick: '철벽 캡틴',
    trait: '압도적인 신체와 침착함으로 수비를 지휘하는 리버풀의 주장. 드리블 돌파를 거의 허용하지 않는다.',
    skill: sk('철벽 수비', 14, 'splash', 2.6, 9, 3.0, 'knock', 2.5) });
  add({ id: 'lewandowski', name: '로베르트 레반도프스키', en: 'Robert Lewandowski', rank: 24, age: 37, club: 'BAR', nation: '폴란드', pos: 'FW', tier: 3,
    style: 'finish', role: 'finisher', nick: '골 머신',
    trait: '9분 5골의 전설을 쓴 통산 600골 이상의 골 머신. 30대 후반에도 결정력은 여전하다.',
    skill: sk('9분 5골', 15, 'single', 5.5, 1, 0, 'execute', 0.12) });
  add({ id: 'julian_alvarez', name: '훌리안 알바레스', en: 'Julián Álvarez', rank: 25, age: 25, club: 'ATM', nation: '아르헨티나', pos: 'FW', tier: 3,
    style: 'press', role: 'poacher', nick: '라 아라냐 (거미)',
    trait: '거미처럼 끈질긴 전방 압박의 달인. 월드컵 우승 멤버이자 아틀레티코의 골잡이.',
    skill: sk('거미줄 압박', 15, 'splash', 2.6, 8, 2.8, 'slow', 3) });
  add({ id: 'saka', name: '부카요 사카', en: 'Bukayo Saka', rank: 26, age: 24, club: 'ARS', nation: '잉글랜드', pos: 'WG', tier: 3,
    style: 'pace', role: 'dribbler', nick: '스타보이',
    trait: '아스널 유스가 배출한 스타보이. 오른쪽에서 컷인 후 왼발 슈팅이 일품이다.',
    skill: sk('컷인 슈팅', 15, 'chain', 3, 6, 3.0, 'weaken', 0.3) });

  /* ═════════ 유니크 (Unique) · 27~35위 (34위 메시 제외) ═════════ */
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
  add({ id: 'caicedo', name: '모이세스 카이세도', en: 'Moisés Caicedo', rank: 32, age: 24, club: 'CHE', nation: '에콰도르', pos: 'MF', tier: 2,
    style: 'tackle', role: 'defender', nick: '볼 위너',
    trait: '태클과 가로채기로 공을 따내는 첼시의 볼 위닝 미드필더.',
    skill: sk('볼 탈취', 15, 'splash', 2.4, 6, 2.4, 'weaken', 0.3) });
  add({ id: 'saliba', name: '윌리엄 살리바', en: 'William Saliba', rank: 33, age: 24, club: 'ARS', nation: '프랑스', pos: 'DF', tier: 2,
    style: 'tackle', role: 'defender', nick: '침착함의 대명사',
    trait: '스피드와 침착함을 겸비한 아스널의 센터백. 1대1 수비에서 좀처럼 뚫리지 않는다.',
    skill: sk('커버 플레이', 13, 'splash', 2.2, 7, 2.8, 'slow', 3.5) });
  add({ id: 'mac_allister', name: '알렉시스 맥앨리스터', en: 'Alexis Mac Allister', rank: 35, age: 26, club: 'LIV', nation: '아르헨티나', pos: 'MF', tier: 2,
    style: 'pass', role: 'playmaker', nick: '중원의 조율사',
    trait: '월드컵 우승 멤버. 리버풀 중원에서 경기의 흐름을 조율한다.',
    skill: sk('템포 조율', 15, 'chain', 2.4, 7, 3.4, 'rally', 0.3) });

  /* ═════════ 레어 (Rare) · 36~43위 ═════════ */
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
  add({ id: 'marquinhos', name: '마르키뉴스', en: 'Marquinhos', rank: 42, age: 31, club: 'PSG', nation: '브라질', pos: 'DF', tier: 1,
    style: 'captain', role: 'defender', nick: 'PSG의 캡틴',
    trait: '10년 넘게 PSG 수비를 이끈 주장. 마침내 챔피언스리그 트로피를 들어 올렸다.',
    skill: sk('캡틴의 호령', 13, 'splash', 2, 6, 2.4, 'rally', 0.3) });
  add({ id: 'musiala', name: '자말 무시알라', en: 'Jamal Musiala', rank: 43, age: 22, club: 'BAY', nation: '독일', pos: 'MF', tier: 1,
    style: 'dribble', role: 'dribbler', nick: '밤비',
    trait: '좁은 공간을 춤추듯 빠져나가는 드리블 천재. 바이에른과 독일 대표팀의 미래.',
    skill: sk('밤비 드리블', 16, 'chain', 2.4, 6, 2.8, 'slow', 2.5) });

  /* ═════════ 노멀 (Normal) · 44~50위 + 52위 ═════════ */
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

  /* ═════════ 히든 (Hidden) ═════════ */
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
  add({ id: 'beckenbauer', name: '프란츠 베켄바우어', en: 'Franz Beckenbauer', rank: null, age: null, club: 'BAYL', nation: '독일', pos: 'DF', tier: 8, hidden: true, legend: '1945–2024',
    style: 'captain', role: 'defender', nick: '카이저',
    trait: '"리베로"를 완성한 황제. 선수와 감독으로 모두 월드컵을 들어 올린 바이에른 뮌헨의 전설.',
    passive: { key: 'kaiser', name: '카이저 리베로', armor: 0.35, slow: 0.12, dmg: 0.15, desc: '모든 적 방어력 −35%, 이동속도 −12%, 모든 아군 공격력 +15% (중첩 불가).' },
    skill: sk('리베로 전진', 13, 'global', 4, 40, 0, 'knock', 3) });

  F.PLAYERS = P;
  F.BY_ID = {};
  P.forEach(function (p) { F.BY_ID[p.id] = p; });

  /* ───────── 조합 (레시피) ─────────
     원작 구조를 따른다: 신화 = 전설 3 / 초월 = 신화 2 + 전설 1 / 태초 = 초월 2 + 신화 2
     전설은 조합이 없고 영입 · 에픽 합성 · 지정 영입으로만 얻는다.
     재료는 소속팀 · 대표팀 · 라이벌 인연으로 구성했다. 히든은 비밀 조합(태초·초월 + 인연 있는 선수들). */
  function r(id, materials, relation, secret) {
    return { id: id, materials: materials.map(function (m) { return { id: m, count: 1 }; }), relation: relation, secret: !!secret };
  }
  F.RECIPES = [
    // 신화 = 전설 3
    r('haaland', ['donnarumma', 'palmer', 'rice'], '맨시티 동료 수문장, 시티 유스 출신 파머, 프리미어리그의 엔진 라이스.'),
    r('hakimi', ['nuno_mendes', 'joao_neves', 'doue'], '유럽 챔피언 PSG의 동료들이 측면의 폭주족을 완성한다.'),
    r('raphinha', ['kvaratskhelia', 'doue', 'bellingham'], '챔피언스리그를 수놓은 공격 자원들이 왼발 폭격기를 부른다.'),
    r('salah', ['rice', 'palmer', 'kvaratskhelia'], '프리미어리그의 라이벌들과 측면의 마법사가 이집트 왕을 받든다.'),
    r('pedri', ['joao_neves', 'bellingham', 'nuno_mendes'], '2000년대생 황금 세대 미드필더들의 티키타카.'),
    // 초월 = 신화 2 + 전설 1
    r('vitinha', ['hakimi', 'pedri', 'joao_neves'], 'PSG 동료 하키미와 중원 파트너 네베스, 스페인 중원의 라이벌 페드리.'),
    r('mbappe', ['hakimi', 'haaland', 'bellingham'], '절친 하키미, 세대 라이벌 홀란, 레알 마드리드 동료 벨링엄.'),
    r('kane', ['haaland', 'salah', 'rice'], '프리미어리그 득점왕 경쟁자들과 삼사자 군단 동료 라이스.'),
    // 태초 = 초월 2 + 신화 2
    r('dembele', ['vitinha', 'mbappe', 'hakimi', 'raphinha'], 'PSG 동료, 레블뢰 동료, 바르셀로나 시절 동료가 발롱도르를 만든다.'),
    r('yamal', ['mbappe', 'kane', 'pedri', 'raphinha'], '유로 2024에서 꺾은 프랑스·잉글랜드의 에이스와 바르사 동료들.'),
    // 히든 (비밀 조합)
    r('messi', ['yamal', 'lautaro', 'julian_alvarez', 'mac_allister'], '라 마시아의 후계자와 2022 월드컵 우승 동료들이 GOAT를 부른다.', true),
    r('ronaldo', ['mbappe', 'vitinha', 'bellingham', 'nuno_mendes'], '레알 마드리드의 후예들과 포르투갈 대표팀이 CR7을 부른다.', true),
    r('pele', ['mbappe', 'raphinha', 'vinicius', 'marquinhos', 'alisson'], '10대 월드컵 우승자의 계보와 셀레상의 후예들이 축구 황제를 부른다.', true),
    r('maradona', ['pedri', 'kvaratskhelia', 'mctominay', 'osimhen', 'enzo'], '바르사의 10번, 나폴리의 세 사람, 아르헨티나 후배가 신의 손을 부른다.', true),
    r('beckenbauer', ['kane', 'olise', 'wirtz', 'musiala', 'kimmich'], '바이에른 뮌헨과 독일 대표팀의 후예들이 카이저의 귀환을 준비한다.', true)
  ];
  F.RECIPE_BY_ID = {};
  F.RECIPES.forEach(function (x) { F.RECIPE_BY_ID[x.id] = x; });
  // 히든 비밀 조합은 힌트를 제공하지 않는다. 재료가 경기장에 모이면 '조합 가능'에 나타나며, 그때 발견 처리된다.
})(typeof window !== 'undefined' ? window : globalThis);
