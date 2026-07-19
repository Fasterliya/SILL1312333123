(function initCityPopulation(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const POPULATION_SIZE = 100;
  function cityInfo(name) {
    return Game.config.cities.find((item) => item.city === name) || {
      city: name, country: '华夏', tier: 3,
    };
  }
  function cultureFor(city, index) {
    const visitors = ['日本', '韩国', '新加坡', '法国', '英国', '美国'];
    if (city.country === '华夏') return index < 94 ? '华夏' : visitors[index % visitors.length];
    if (index < 88) return city.country;
    if (index < 96) return '华夏';
    return visitors.filter((item) => item !== city.country)[index % 5];
  }
  function residentName(culture, gender, index, cityIndex) {
    const locale = Game.worldCulture.profile(culture).locale;
    const data = Game.nameSystem.cultures[locale] || Game.nameSystem.cultures['zh-CN'];
    const names = gender === '男' ? data.male : data.female;
    const rank = Math.floor(index / 2) + cityIndex * 3;
    const family = data.surnames[rank % data.surnames.length];
    const given = names[Math.floor(rank / data.surnames.length) % names.length];
    return ['en-US', 'en-GB', 'fr-FR'].includes(locale) ? `${given}·${family}` : family + given;
  }
  function normalizeRecord(record) {
    record.n = Game.nameSystem.normalizeName(record.n, record.g, record.c);
    if (record.o) record.o = Game.nameSystem.normalizeName(record.o, record.g, record.c);
    return record;
  }
  function jobFor(cityName, index, age) {
    if (age < 22 || age > 64) return null;
    const local = Game.config.jobs.filter((job) => !job.freelance && job.cities?.includes(cityName));
    const general = Game.config.jobs.filter((job) => !job.freelance && !job.cities?.length);
    const source = local.length && index % 4 !== 0 ? local : general;
    return source.length ? source[(index * 7) % source.length] : null;
  }
  function createRecord(state, city, index, cityIndex) {
    const gender = index % 2 ? '女' : '男';
    const age = 2 + ((index * 7 + cityIndex * 5) % 67);
    const culture = cultureFor(city, index);
    const job = jobFor(city.city, index, age);
    // Short keys keep all 2,800 off-city residents compact in save data.
    return {
      i: `resident-${cityIndex}-${index}`,
      n: residentName(culture, gender, index, cityIndex),
      g: gender,
      b: state.totalMonths - age * 12 - (index % 12),
      c: culture,
      p: Game.config.personalities[(index + cityIndex) % Game.config.personalities.length],
      t: Game.config.traits[(index * 3 + cityIndex) % Game.config.traits.length],
      a: 18 + ((index * 11 + cityIndex) % 24),
      j: job?.id || '',
      m: null,
      w: null,
      k: 0,
      f: gender === '女' ? Game.demography.baseFertility(`resident-${cityIndex}-${index}`) : null,
      x: null, o: null,
    };
  }
  function compactRecord(record) {
    if (record?.i) return record;
    if (!record || typeof record !== 'object') return null;
    return {
      i: record.id, n: record.name, g: record.gender, b: record.birthMonth,
      c: record.culture, p: record.personality, t: record.trait,
      a: record.affection, j: record.jobId || '', m: record.marriedTo || null,
      w: record.marriedAtMonth || null, k: record.childrenCount || 0,
      f: record.gender === '女' ? record.fertilityBase : null,
      x: record.namePreference || null, o: record.birthName || null,
    };
  }
  function ensure(state) {
    state.socialWorld ||= {};
    state.socialWorld.cityArchives ||= {};
    Game.config.cities.forEach((city, cityIndex) => {
      const records = Array.isArray(state.socialWorld.cityArchives[city.city])
        ? state.socialWorld.cityArchives[city.city].slice(0, POPULATION_SIZE)
          .map(compactRecord).filter(Boolean).map(normalizeRecord) : [];
      for (let index = records.length; index < POPULATION_SIZE; index += 1) {
        records.push(createRecord(state, city, index, cityIndex));
      }
      state.socialWorld.cityArchives[city.city] = records;
    });
    state.socialWorld.populationVersion = 1;
    return state.socialWorld.cityArchives;
  }
  function applyCareer(person, record, cityName) {
    const age = Math.floor((person.populationMonth - record.b) / 12);
    const job = Game.config.jobs.find((item) => item.id === record.j);
    if (!job) {
      if (age >= 65) person.job = '退休居民';
      return;
    }
    person.job = job.name; person.jobId = job.id;
    person.company = job.company;
    person.companyId = job.companyId;
    person.departmentId = Game.workplace.departmentId(job);
    person.departmentName = Game.workplace.departmentName(job);
    person.careerCity = cityName;
    person.careerRank = age >= 48 ? 3 : (age >= 36 ? 2 : (age >= 28 ? 1 : 0));
    person.educationStage = 'graduate';
    person.educationLevel = Math.max(person.educationLevel || 0, job.education || 0);
    person.educationName ||= `${cityName}城市学院毕业`;
  }
  function materialize(state, record, records, cityName) {
    const age = Math.max(0, Math.floor((state.totalMonths - record.b) / 12));
    const person = U.person('当地角色', '', age, record.g, state.totalMonths);
    Object.assign(person, {
      id: record.i, name: record.n, birthMonth: record.b, baseAge: age,
      metCity: cityName, homeCity: cityName, currentCity: cityName,
      culture: record.c, personality: record.p, trait: record.t,
      affection: record.a, populationResident: true, residentKey: record.i,
      populationMonth: state.totalMonths, npcMarried: Boolean(record.m),
      spouseId: record.m, childrenCount: record.k,
      fertilityBase: record.f ?? (record.g === '女' ? Game.demography.baseFertility(record.i) : null),
      birthName: record.o || record.n, namePreference: record.x || '',
      culturePreference: record.x ? '日本文化' : '', nameCulture: record.x ? '日本' : '',
      nameHistory: record.o && record.o !== record.n
        ? [{ from: record.o, to: record.n, country: '日本', reason: '主动采用日本姓名' }] : [],
    });
    person.spouseName = records.find((item) => item.i === record.m)?.n || '';
    Game.worldCulture.applyPerson(person, record.c);
    person.name = record.n;
    applyCareer(person, record, cityName);
    Game.npcLife.updatePerson(state, person);
    Game.systemsState.ensurePerson(state, person);
    return person;
  }
  function syncRecord(state, person) {
    const records = state.socialWorld.cityArchives[person.homeCity] || [];
    const record = records.find((item) => item.i === person.residentKey);
    if (!record) return;
    record.a = person.affection;
    record.j = Game.config.jobs.find((job) => job.id === person.jobId
      || (job.name === person.job && job.companyId === person.companyId))?.id || record.j;
    record.m = person.spouseId || record.m;
    record.k = Math.max(record.k || 0, person.childrenCount || 0);
    if (person.gender === '女') record.f = person.fertilityBase;
    record.n = person.name; record.x = person.namePreference || null; record.o = person.birthName || null;
  }
  function compact(state, activeCity) {
    state.worldPeople.forEach((person) => {
      if (person.populationResident) syncRecord(state, person);
    });
    state.worldPeople = state.worldPeople.filter((person) => (
      !person.populationResident || person.currentCity === activeCity || person.phoneUnlocked
      || person.interactions > 0 || person.portraitUrl || person.familyMaterialized
    ));
  }
  function linkWorkplaces(state, city) {
    const groups = {};
    state.worldPeople.filter((person) => (
      person.populationResident && person.currentCity === city && person.companyId
    )).forEach((person) => {
      const key = `${person.companyId}:${person.departmentId}`;
      (groups[key] ||= []).push(person);
      person.reportIds = [];
    });
    Object.values(groups).forEach((people) => {
      people.sort((a, b) => b.careerRank - a.careerRank || b.baseAge - a.baseAge);
      const leader = people[0];
      leader.managerId = null;
      leader.reportIds = people.slice(1, 13).map((person) => person.id);
      people.slice(1).forEach((person) => { person.managerId = leader.id; });
    });
  }
  function activate(state, cityName) {
    const archives = ensure(state);
    const records = archives[cityName] || [];
    compact(state, cityName);
    const known = new Set(Game.people.all(state).map((person) => person.id));
    records.forEach((record) => {
      if (!known.has(record.i)) state.worldPeople.push(materialize(state, record, records, cityName));
    });
    state.socialWorld.activeCity = cityName;
    linkWorkplaces(state, cityName);
    return records;
  }
  function refreshActive(state) {
    const records = ensure(state)[state.location.city] || [];
    const byId = new Map(records.map((record) => [record.i, record]));
    state.worldPeople.filter((person) => person.populationResident
      && person.currentCity === state.location.city).forEach((person) => {
      const record = byId.get(person.residentKey);
      if (!record) return;
      person.populationMonth = state.totalMonths;
      person.npcMarried = Boolean(record.m);
      person.spouseId = record.m;
      person.spouseName = byId.get(record.m)?.n || '';
      person.childrenCount = record.k || 0;
      applyCareer(person, record, state.location.city);
    });
    linkWorkplaces(state, state.location.city);
  }
  Game.cityPopulation = Object.freeze({
    ensure, activate, refreshActive, syncRecord, jobFor, populationSize: POPULATION_SIZE,
  });
}(window));
