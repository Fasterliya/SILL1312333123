(function initEducationPlanCapacity(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function learning(state) {
    return Math.round(Game.characterAttributes.personValue(state.profile, '学识'));
  }

  function slots(state) {
    return Game.learningAttribute.planSlots(learning(state));
  }

  Game.educationPlanCapacity = Object.freeze({ learning, slots });
}(window));
