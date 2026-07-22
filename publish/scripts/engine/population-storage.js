(function initPopulationStorage(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function keepFull(person, state) {
    return !person.populationResident || person.phoneUnlocked || person.interactions > 0
      || person.portraitUrl || person.portraitGallery?.length || person.familyMaterialized
      || (state.travel?.activeIds || []).includes(person.id)
      || person.fashion?.temporaryCosplay
      || person.specterPossessed || person.specterPrey || person.specterPurifiedAtMonth
      || person.secretParentage || state.relationshipSecrets?.records?.some((record) => (
        record.participants?.includes(person.id)
      ));
  }

  function compact(state) {
    if (!Array.isArray(state?.worldPeople)) return state;
    state.worldPeople.filter((person) => person.populationResident).forEach((person) => {
      Game.cityPopulation?.syncRecord(state, person);
    });
    state.worldPeople = state.worldPeople.filter((person) => keepFull(person, state));
    if (state.socialWorld) state.socialWorld.activeCity = '';
    return state;
  }

  Game.populationStorage = Object.freeze({ compact });
}(window));
