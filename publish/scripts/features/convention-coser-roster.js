(function initConventionCoserRoster(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function hash(value) {
    return [...String(value || '')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function careerAge(person) {
    const seed = hash(`${person.id}:convention-coser-age`);
    const roll = seed % 100;
    if (roll < 48) return 18 + ((seed >>> 5) % 6);
    if (roll < 84) return 24 + ((seed >>> 8) % 6);
    return 30 + ((seed >>> 11) % 9);
  }

  function normalizeAge(state, person) {
    if (person.conventionProfileVersion === 1) return;
    const age = U.personAge(state, person);
    if (person.relation === '漫展相识' && (age < 18 || age > 38)) {
      const nextAge = careerAge(person);
      person.birthMonth = state.totalMonths - nextAge * 12 - (hash(person.id) % 12);
      person.baseAge = nextAge;
      Game.npcLife.syncGrowth(state, person);
    }
    person.conventionProfileVersion = 1;
  }

  function prepare(state, person, costume) {
    if (!person) return;
    normalizeAge(state, person);
    const selected = costume || Game.cosplayCatalog.find(person.cosplay);
    Game.npcFemboyCareer?.considerConvention(state, person, selected);
    Game.npcCreatorStyle?.monthlyPerson(state, person);
  }

  function normalize(state, travel) {
    (travel?.coserIds || []).forEach((id) => {
      const person = Game.people.find(state, id);
      if (person) prepare(state, person);
    });
  }

  Game.conventionCoserRoster = Object.freeze({ prepare, normalize, careerAge });
}(window));
