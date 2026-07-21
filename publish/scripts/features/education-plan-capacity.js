(function initEducationPlanCapacity(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function intelligence(state) {
    const value = Number(state.stats?.智力);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 50;
  }

  function slots(state) {
    const value = intelligence(state);
    if (value >= 100) return 9;
    if (value >= 80) return 8;
    if (value >= 65) return 7;
    if (value >= 50) return 6;
    if (value >= 35) return 5;
    return 4;
  }

  Game.educationPlanCapacity = Object.freeze({ intelligence, slots });
}(window));
