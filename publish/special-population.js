(function initSpecialPopulation(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const VERSION = 1;

  function residentId(index) {
    return `special-resident-${String(index + 1).padStart(2, '0')}`;
  }

  function createRecord(state, entry, index) {
    const id = residentId(index);
    return {
      i: id,
      n: entry.fullName,
      g: entry.gender,
      b: (Number(state.playerBornAt) || 0) - entry.startAge * 12 - (index % 12),
      c: '华夏',
      p: entry.personality || Game.config.personalities[index % Game.config.personalities.length],
      t: entry.trait || Game.config.traits[(index * 3) % Game.config.traits.length],
      a: 38 + (index * 7) % 35,
      j: '',
      m: null,
      w: null,
      k: 0,
      f: Game.demography.baseFertility(id),
      x: null,
      o: entry.fullName,
      l: Game.mortality.lifeMonths(id),
      q: 0,
      s: entry.fullName,
    };
  }

  function trim(records, protectedIds, limit) {
    while (records.length > limit) {
      let removable = -1;
      for (let index = records.length - 1; index >= 0; index -= 1) {
        const record = records[index];
        const linked = records.some((item) => item.m === record.i);
        if (!record.s && !protectedIds.has(record.i) && !linked) {
          removable = index;
          break;
        }
      }
      if (removable < 0) break;
      records.splice(removable, 1);
    }
  }

  function seed(state) {
    const world = state.socialWorld;
    if (!world?.cityArchives || Number(world.specialPopulationVersion) >= VERSION) return;
    const protectedIds = new Set(Game.people.all(state).map((person) => person.id));
    const archived = Object.values(world.cityArchives).flat();
    const existingPeople = Game.people.all(state);
    Game.specialCharacters.entries.forEach((entry, index) => {
      const legacy = existingPeople.find((person) => (
        person.specialCharacter && (person.fullName === entry.fullName || person.birthName === entry.fullName)
      ));
      if (legacy) {
        Game.specialCharacters.apply(legacy);
        return;
      }
      if (archived.some((record) => record.s === entry.fullName || record.i === residentId(index))) return;
      const records = world.cityArchives[entry.homeCity];
      if (!Array.isArray(records)) return;
      records.unshift(createRecord(state, entry, index));
      trim(records, protectedIds, Game.cityPopulation.populationSize);
    });
    world.specialPopulationVersion = VERSION;
  }

  Game.specialPopulation = Object.freeze({ seed });
}(window));
