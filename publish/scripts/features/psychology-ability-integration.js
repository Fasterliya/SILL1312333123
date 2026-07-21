(function initPsychologyAbilityIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const base = Game.psychology;
  if (!base) return;

  function monthly(state) {
    base.monthly(state);
    const psychology = base.ensure(state);
    if (psychology.sexAddiction >= 30) {
      Game.structuredTraits.addExperience(state.profile, 'addiction');
    }
    if (psychology.corruption >= 80) {
      Game.structuredTraits.addExperience(state.profile, 'trauma');
    }
    Game.characterAttributes.syncLegacy(state.profile, state.stats);
  }

  Game.psychology = Object.freeze({ ...base, monthly });
}(window));
