(function initMonthlySystems(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function run(state) {
    Game.educationSystem.monthly(state);
    Game.cityLife.monthly(state);
    Game.socialWorld.monthly(state);
    Game.careerSpecialties.monthly(state);
    Game.relationshipMemory.monthly(state);
    Game.parenting.monthly(state);
    Game.healthSystem.monthly(state);
    Game.lifeEvents.maybeTrigger(state);
  }

  Game.monthlySystems = Object.freeze({ run });
}(window));
