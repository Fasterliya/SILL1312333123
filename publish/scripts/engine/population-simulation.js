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
        const job = Game.cityPopulation.jobFor(city, index + state.year, years);
        if (job && Game.jobMarket.vacancies(state, job) > 0) record.j = job.id;
      }
    });
  }

  function pairResidents(state, records) {
    const singles = records.filter((record) => {
      const years = age(state, record);
      return !record.m && years >= 20 && years <= (record.g === '女' ? 45 : 55);
    });
    const men = singles.filter((record) => record.g === '男');
    const women = singles.filter((record) => record.g === '女').sort(() => Math.random() - 0.5);
    let paired = 0;
    women.some((woman) => {
      const ranked = men.filter((man) => !man.m).map((man) => ({
        man, result: Game.demography.residentPairScore(state, woman, man),
      })).sort((a, b) => b.result.score - a.result.score);
      const selected = ranked[0];
      if (!selected || selected.result.score < selected.result.standard || Math.random() > 0.62) return false;
      woman.m = selected.man.i;
      selected.man.m = woman.i;
      woman.w = state.totalMonths;
      selected.man.w = state.totalMonths;
      paired += 1;
      return paired >= 3;
    });
    if (paired > 0) {
      records.forEach((record) => {
        if (record.g === '女' && record.f == null) record.f = Game.demography.baseFertility(record.i);
      });
    }
  }

  function growFamilies(state, records) {
    const byId = new Map(records.map((record) => [record.i, record]));
    records.forEach((record) => {
      const spouse = byId.get(record.m);
      if (age(state, record) >= 40 && record.k < 1) {
        record.k = 1;
        if (spouse) spouse.k = Math.max(1, spouse.k || 0);
      }
      if (!spouse || record.i > spouse.i || record.k >= 3) return;
      const woman = record.g === '女' ? record : spouse;
      const womanAge = age(state, woman);
      if (womanAge < 20) return;
      const yearsMarried = (state.totalMonths - (record.w || state.totalMonths)) / 12;
      const chance = Game.demography.fertilityAt(woman.f
        ?? Game.demography.baseFertility(woman.i), womanAge, record.k);
      if (yearsMarried >= 1 && Math.random() * 100 < chance) {
        record.k = Math.min(3, record.k + Game.demography.twinCountAt(womanAge, record.k));
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
