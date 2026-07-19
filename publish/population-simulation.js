(function initPopulationSimulation(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function age(state, record) {
    return Math.max(0, Math.floor((state.totalMonths - record.b) / 12));
  }

  function assignCareers(state, city, records) {
    records.forEach((record, index) => {
      const years = age(state, record);
      if (!record.j && years >= 22 && years <= 60 && Math.random() < 0.48) {
        record.j = Game.cityPopulation.jobFor(city, index + state.year, years)?.id || '';
      }
    });
  }

  function pairResidents(state, records) {
    const singles = records.filter((record) => {
      const years = age(state, record);
      return !record.m && years >= 23 && years <= 48;
    });
    const men = singles.filter((record) => record.g === '男').sort(() => Math.random() - 0.5);
    const women = singles.filter((record) => record.g === '女').sort(() => Math.random() - 0.5);
    const count = Math.min(3, men.length, women.length);
    for (let index = 0; index < count; index += 1) {
      if (Math.random() > 0.52) continue;
      const first = men[index];
      const second = women[index];
      first.m = second.i;
      second.m = first.i;
      first.w = state.totalMonths;
      second.w = state.totalMonths;
    }
  }

  function growFamilies(state, records) {
    const byId = new Map(records.map((record) => [record.i, record]));
    records.forEach((record) => {
      const spouse = byId.get(record.m);
      if (!spouse || record.i > spouse.i || record.k >= 3) return;
      const firstAge = age(state, record);
      const secondAge = age(state, spouse);
      if (firstAge < 25 || secondAge < 25 || firstAge > 45 || secondAge > 45) return;
      const yearsMarried = (state.totalMonths - (record.w || state.totalMonths)) / 12;
      if (yearsMarried >= 1 && Math.random() < 0.18) {
        record.k += 1;
        spouse.k = record.k;
      }
    });
  }

  function monthly(state) {
    const archives = Game.cityPopulation.ensure(state);
    if (state.month !== 1) return;
    Object.entries(archives).forEach(([city, records]) => {
      assignCareers(state, city, records);
      pairResidents(state, records);
      growFamilies(state, records);
    });
    Game.cityPopulation.refreshActive(state);
  }

  Game.populationSimulation = Object.freeze({ monthly });
}(window));
