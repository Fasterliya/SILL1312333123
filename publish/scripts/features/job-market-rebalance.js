(function initJobMarketRebalance(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const VERSION = 1;

  function clearPerson(state, record) {
    const person = Game.people.find(state, record.i);
    if (!person || person.jobId !== record.j) return;
    person.job = '';
    person.jobId = '';
    person.company = '';
    person.companyId = '';
    person.departmentId = '';
    person.departmentName = '';
    person.careerCity = '';
    person.managerId = null;
    person.reportIds = [];
  }

  function run(state) {
    state.socialWorld ||= {};
    if ((state.socialWorld.jobCapacityVersion || 0) >= VERSION) return 0;
    const groups = new Map();
    Object.entries(state.socialWorld.cityArchives || {}).forEach(([homeCity, records]) => {
      (records || []).forEach((record) => {
        if (!record?.j) return;
        const city = record.d || homeCity;
        const source = Game.config.jobs.find((job) => job.id === record.j);
        const job = Game.companyCatalog.localizeJob(source, city);
        if (!job) return;
        const key = `${city}:${job.id}`;
        if (!groups.has(key)) groups.set(key, { job, records: [] });
        groups.get(key).records.push(record);
      });
    });

    let released = 0;
    groups.forEach(({ job, records }) => {
      const capacity = Game.jobMarket.demand(state, job);
      records.sort((left, right) => String(left.i).localeCompare(String(right.i)));
      records.slice().reverse().forEach((record) => {
        if (Game.jobMarket.occupied(state, job) <= capacity) return;
        clearPerson(state, record);
        record.j = '';
        released += 1;
      });
    });
    state.socialWorld.jobCapacityVersion = VERSION;
    if (released) Game.socialWorld.rebuild(state);
    return released;
  }

  Game.jobMarketRebalance = Object.freeze({ run });
}(window));
