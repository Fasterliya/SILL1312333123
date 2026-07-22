(function initSpecterHuntBalance(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var TRACE_START_MONTH = 6;
  var INTERCEPT_MONTH = 14;
  var HUNT_MONTH = 18;

  function ensure(specter) {
    specter.guardianTrace = Math.max(
      0,
      Math.min(100, Number(specter.guardianTrace) || 0),
    );
    specter.lastGuardianTraceMonth = Number.isFinite(specter.lastGuardianTraceMonth)
      ? specter.lastGuardianTraceMonth : -1;
    return specter.guardianTrace;
  }

  function canIntercept(specter) {
    return ensure(specter) >= 65 && specter.monthsActive >= INTERCEPT_MONTH;
  }

  function canHunt(specter) {
    return ensure(specter) >= 100 && specter.monthsActive >= HUNT_MONTH;
  }

  function track(state, specter, guardCount) {
    var previous = ensure(specter);
    if (specter.monthsActive < TRACE_START_MONTH
      || specter.lastGuardianTraceMonth === state.totalMonths) {
      return { trace: previous, ready: canHunt(specter) };
    }
    var stageBonus = specter.stage === '掠食' ? 6 : (specter.stage === '显形' ? 3 : 0);
    var exposedBonus = specter.exposed ? 5 : 0;
    var gain = 5 + Math.min(4, guardCount) * 2 + stageBonus + exposedBonus;
    specter.guardianTrace = Math.min(100, previous + gain);
    specter.lastGuardianTraceMonth = state.totalMonths;
    if (previous < 100 && specter.guardianTrace >= 100) {
      Game.lifeDirector.addLog(
        state,
        '幽诡追查完成',
        '巡夜的魔法少女终于锁定了一只幽诡。下一次交锋可能成为正式狩猎。',
        'warning',
      );
    }
    return { trace: specter.guardianTrace, ready: canHunt(specter) };
  }

  Game.specterHuntBalance = Object.freeze({
    track: track,
    canIntercept: canIntercept,
    canHunt: canHunt,
  });
}(window));
