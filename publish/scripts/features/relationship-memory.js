(function initRelationshipMemory(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value) => Math.max(0, Math.min(100, value));

  function ensure(state, person) {
    return Game.systemsState.ensurePerson(state, person);
  }

  function record(state, person, kind, text, trustDelta, conflictDelta) {
    ensure(state, person);
    person.trust = clamp(person.trust + (trustDelta || 0));
    person.conflict = clamp(person.conflict + (conflictDelta || 0));
    person.lastInteractionMonth = state.totalMonths;
    person.memories.unshift({
      kind, text, month: state.totalMonths, generation: state.generation,
    });
    person.memories = person.memories.slice(0, 12);
  }

  function monthly(state) {
    Game.people.all(state).forEach((person) => {
      ensure(state, person);
      if (person.status !== '健康') return;
      const quietMonths = state.totalMonths - person.lastInteractionMonth;
      if (quietMonths > 12 && state.totalMonths % 6 === 0) {
        person.affection = clamp(person.affection - (person.relation === '好友' ? 1 : 2));
      }
      if (person.conflict >= 60 && state.totalMonths % 4 === 0) {
        person.affection = clamp(person.affection - 2);
      } else if (person.trust >= 80 && quietMonths < 6 && state.totalMonths % 6 === 0) {
        person.affection = clamp(person.affection + 1);
      }
    });
  }

  Game.relationshipMemory = Object.freeze({ ensure, record, monthly });
}(window));
