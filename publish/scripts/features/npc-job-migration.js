(function initNpcJobMigration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const MAX_MOVES = 3;

  function basicEligible(state, person, job) {
    const age = Game.content.personAge(state, person);
    return !job.freelance
      && age >= (job.minAge || 18)
      && (!job.adultOnly || age >= 18)
      && (job.education || 0) <= (person.educationLevel || 0)
      && (!job.recommendedGender || job.recommendedGender === person.gender);
  }

  function localSaturated(state, person) {
    const city = person.currentCity || person.homeCity || state.location.city;
    const jobs = Game.companyCatalog.jobsInCity(city).filter((job) => basicEligible(state, person, job));
    return jobs.length > 0 && jobs.every((job) => Game.jobMarket.vacancies(state, job) <= 0);
  }

  function targetOptions(state, person) {
    const current = person.currentCity || person.homeCity || state.location.city;
    const currentCountry = Game.config.cities.find((item) => item.city === current)?.country;
    return Game.config.cities.filter((city) => city.city !== current).flatMap((city) => (
      Game.companyCatalog.jobsInCity(city.city)
        .filter((job) => basicEligible(state, person, job)
          && Game.jobMarket.canNpcEnter(state, person, job))
        .map((job) => {
          const market = Game.jobMarket.summary(state, job);
          const vacancyRatio = market.vacancies / Math.max(1, market.demand);
          const score = vacancyRatio * 100 + job.salary / 1800
            + (city.country === currentCountry ? 8 : 0) - city.cost / 12000;
          return { city, job, score };
        })
    )).sort((left, right) => right.score - left.score);
  }

  function archiveRecord(state, person) {
    const archives = state.socialWorld?.cityArchives || {};
    const home = person.homeCity;
    return (archives[home] || []).find((record) => (
      record.i === (person.residentKey || person.id)
    )) || null;
  }

  function move(state, person, option) {
    const from = person.currentCity || person.homeCity || state.location.city;
    const { city, job } = option;
    person.job = job.name;
    person.jobId = job.id;
    person.company = job.company;
    person.companyId = job.companyId || '';
    person.departmentId = Game.workplace.departmentId(job);
    person.departmentName = Game.workplace.departmentName(job);
    person.careerCity = city.city;
    person.currentCity = city.city;
    person.populationResident = false;
    person.jobSearchMonths = 0;
    person.lastJobMigrationMonth = state.totalMonths;
    const record = archiveRecord(state, person);
    if (record) {
      record.d = city.city;
      record.j = job.id;
    }
    Game.lifeResume?.recordEvent?.(
      state, person, '迁居就业', `从${from}迁往${city.city}，进入${job.company}担任${job.name}`,
    );
    if (person.phoneUnlocked || (person.affection || 0) >= 50) {
      Game.lifeDirector?.addLog(state, '熟人迁居',
        `${person.name}因本地岗位饱和迁往${city.city}，加入${job.company}。`, 'normal');
    }
    return true;
  }

  function monthly(state) {
    let moved = 0;
    const candidates = Game.people.all(state).filter((person) => {
      if (person.status !== '健康' || person.job || person.lastJobMigrationMonth === state.totalMonths) return false;
      const age = Game.content.personAge(state, person);
      return age >= 18 && age <= 60
        && ['workforce', 'graduate'].includes(person.educationStage);
    });
    candidates.forEach((person) => {
      if (moved >= MAX_MOVES) return;
      person.jobSearchMonths = (Number(person.jobSearchMonths) || 0) + 1;
      if (person.jobSearchMonths < 2 || !localSaturated(state, person)) return;
      const option = targetOptions(state, person)[0];
      if (!option || Math.random() > 0.45) return;
      if (move(state, person, option)) moved += 1;
    });
    if (moved) Game.socialWorld.rebuild(state);
    return moved;
  }

  Game.npcJobMigration = Object.freeze({ monthly, localSaturated, targetOptions, move });
}(window));
