(function initMonthlySystems(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function run(state) {
    Game.educationSystem.monthly(state);
    Game.cityLife.monthly(state);
    Game.propertySystem.monthly(state);
    Game.socialWorld.monthly(state);
    Game.populationSimulation.monthly(state);
    Game.npcJobMigration?.monthly(state);
    Game.careerGrowth.monthly(state);
    Game.companyMarket.monthly(state);
    Game.careerSpecialties.monthly(state);
    Game.relationshipMemory.monthly(state);
    Game.parenting.monthly(state);
    Game.householdSystem.monthly(state);
    Game.relationshipSecrets.monthly(state);
    Game.creatorCareer.monthly(state);
    Game.healthSystem.monthly(state);
    Game.npcFashion.monthly(state);
    Game.encounterSystem?.ensure(state);
    Game.brothelSystem?.ensure(state);
    Game.hookupSystem?.ensure(state);
    Game.idolSystem?.monthly(state);
    Game.npcCareerLife?.monthly(state);
    Game.familyConflict?.monthly(state);
    Game.relationshipConflict?.monthly(state);
    Game.criminalSystem?.monthly(state);
    Game.psychology?.monthly(state);
    Game.npcInitiative?.monthly(state);
    Game.taxSystem?.monthly(state);
    Game.bankSystem?.monthly(state);
    Game.companySystem?.monthly(state);
    Game.stockDirector?.monthly(state);
    Game.undergroundIdol?.monthly(state);
    Game.universityLife?.monthly(state);
    Game.lifeResumeSync?.monthly(state);
    Game.specialCareerRanks?.sync(state);
    Game.lifeEvents.maybeTrigger(state);
  }

  Game.monthlySystems = Object.freeze({ run });
}(window));
