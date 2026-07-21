(function initLegacyMood(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const prepared = new WeakSet();
  const clamp = (value) => Math.max(0, Math.min(399, Math.round(Number(value) || 0)));

  function apply(state, amount, source) {
    const delta = Math.round(Number(amount) || 0);
    if (!delta) return;
    if (Game.stressSystem) {
      if (delta > 0) Game.stressSystem.reduce(state, delta, source || '积极体验');
      else Game.stressSystem.add(state, Math.abs(delta), source || '负面体验');
      return;
    }
    state.stress ||= { value: 0, level: 0 };
    state.stress.value = clamp(state.stress.value - delta);
  }

  function ensure(state) {
    const stats = state.stats ||= {};
    if (prepared.has(stats)) return stats;
    delete stats.心情;
    Object.defineProperty(stats, '心情', {
      configurable: true,
      enumerable: false,
      get: () => 50,
      set: (value) => apply(state, Number(value) - 50, '旧心情效果折算'),
    });
    prepared.add(stats);
    return stats;
  }

  function cleanText(value) {
    return String(value ?? '')
      .replace(/心情严重下降/g, '压力大幅增加')
      .replace(/心情下降/g, '压力增加')
      .replace(/心情(?:提升|提高)/g, '压力缓解')
      .replace(/心情/g, '压力状态');
  }

  Game.legacyMood = Object.freeze({ ensure, apply, cleanText });
}(window));
