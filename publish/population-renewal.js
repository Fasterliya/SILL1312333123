(function initPopulationRenewal(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function cityInfo(name) {
    return Game.config.cities.find((item) => item.city === name) || {
      city: name, country: '华夏', tier: 3,
    };
  }

  function replaceResident(state, residentId, cityName) {
    const archives = Game.cityPopulation.ensure(state);
    let city = cityName;
    let records = archives[city] || [];
    let index = records.findIndex((record) => record.i === residentId);
    if (index < 0) {
      const match = Object.entries(archives).find(([, entries]) => (
        entries.some((record) => record.i === residentId)
      ));
      if (!match) return null;
      [city, records] = match;
      index = records.findIndex((record) => record.i === residentId);
    }
    const previous = records[index];
    records.forEach((record) => {
      if (record.m === previous.i) {
        record.m = null;
        record.w = null;
      }
    });
    const cityIndex = Math.max(0, Game.config.cities.findIndex((item) => item.city === city));
    const generation = Math.max(0, Number(previous.q) || 0) + 1;
    const seed = index + generation * Game.cityPopulation.populationSize;
    const next = Game.cityPopulation.createRecord(state, cityInfo(city), seed, cityIndex);
    const years = (index * 5 + generation * 7 + state.year) % 21;
    next.i = `resident-${cityIndex}-${index}-g${generation}-${state.totalMonths}`;
    next.b = state.totalMonths - years * 12 - ((index + generation) % 12);
    next.j = Game.cityPopulation.jobFor(city, seed, years)?.id || '';
    next.l = Game.mortality.lifeMonths(next.i);
    next.q = generation;
    records[index] = next;
    return next;
  }

  Game.populationRenewal = Object.freeze({ replaceResident });
}(window));
