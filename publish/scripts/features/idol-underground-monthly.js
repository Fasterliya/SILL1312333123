(function initUndergroundIdolMonthly(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.undergroundIdolCore;

  function monthly(state) {
    const underground = Core.ensure(state);
    if (!underground.active || underground.fellTo) return;
    Game.characterAttributes.gain(state, '交涉', 0.35, '地下偶像活动');
    if (state.totalMonths > underground.lastShowMonth) {
      const result = Game.undergroundIdolShows.monthlyShow(state);
      if (!result.ok) {
        underground.fans = Math.max(0, Math.round(underground.fans * 0.95));
        underground.consecutivePoor += 0.5;
      }
    }
    if (underground.fans > 100) {
      const decayRate = underground.producerAbuse > 3 ? 0.03 : 0.01;
      underground.fans = Math.max(
        0,
        underground.fans - Math.round(underground.fans * decayRate),
      );
    }
    if (!underground._pendingDecision
        && state.totalMonths - underground.lastProducerMonth >= 3
        && Math.random() < 0.2) {
      Game.undergroundIdolDecisions.castingCouch(state);
    }
    Game.undergroundIdolFall.fallCheck(state);
    Core.groupMonthly(state);
    const age = U.age(state);
    if (age >= 26) {
      const retention = underground.careerExtended && age < 30 ? 0.97 : 0.92;
      underground.fans = Math.max(0, Math.round(underground.fans * retention));
    }
    if (state.career?.salary > 0) state.money += state.career.salary;
  }

  Game.undergroundIdolMonthly = Object.freeze({ monthly });
}(window));
