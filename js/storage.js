/*
 * 로컬 저장소 (localStorage) — 프로필(메타)과 진행 중 경기 저장
 * 사생활 보호 모드 등에서 접근이 막혀도 게임은 정상 동작하도록 모든 접근을 try/catch 로 감싼다.
 */
(function (root) {
  'use strict';
  var F = root.FPRD = root.FPRD || {};
  var META_KEY = 'fprd.meta.v1', RUN_KEY = 'fprd.run.v1';

  function get(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { root.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function del(k) { try { root.localStorage.removeItem(k); } catch (e) {} }

  F.Store = {
    loadMeta: function () { var t = get(META_KEY); if (!t) return null; try { return JSON.parse(t); } catch (e) { return null; } },
    saveMeta: function (meta) { return set(META_KEY, JSON.stringify(meta)); },
    loadRun: function () { return get(RUN_KEY); },
    saveRun: function (json) { if (json) set(RUN_KEY, json); },
    clearRun: function () { del(RUN_KEY); },
    runInfo: function () {
      var t = get(RUN_KEY); if (!t) return null;
      try {
        var s = JSON.parse(t);
        if (!s || s.phase === 'over' || s.phase === 'clear') return null;
        return { wave: s.wave, mode: s.mode, difficulty: s.difficulty, units: (s.units || []).length };
      } catch (e) { return null; }
    },
    resetAll: function () { del(META_KEY); del(RUN_KEY); }
  };
})(window);
