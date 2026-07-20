(function initHealthSafety(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const fatalIds = new Set(['heart']);
  const hasMonth = (value) => Number.isFinite(value);

  function hasUntreatedFatal(state) {
    return (state.health?.diseases || []).some((disease) => (
      fatalIds.has(disease.id) && !hasMonth(disease.healedAt) && !hasMonth(disease.treatedAt)
    ));
  }

  function removeErroneousLog(state) {
    const latest = state.logs?.[0];
    if (latest?.month !== state.totalMonths) return;
    if (['人生终章', '家庭延续'].includes(latest.title)) state.logs.shift();
  }

  function repair(state) {
    if (!state?.stats || state.stats.健康 > 0 || hasUntreatedFatal(state)) return false;
    state.stats.健康 = 1;
    if (state.pendingDecision?.type === 'succession'
      && state.pendingDecision.cause === '致命疾病') {
      state.pendingDecision = null;
      removeErroneousLog(state);
    }
    if (state.gameOver && state.legacy?.ending?.cause === '致命疾病') {
      state.gameOver = false;
      state.legacy.ending = null;
      const latest = state.legacy.ancestors?.at(-1);
      if (latest?.generation === state.generation && latest.deathMonth === state.totalMonths
        && latest.cause === '致命疾病') state.legacy.ancestors.pop();
      removeErroneousLog(state);
    }
    return true;
  }

  Game.healthSafety = Object.freeze({ hasUntreatedFatal, repair });
}(window));
