(function initSocialWorld(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const POOL_SIZE = 12;

  function cityFromText(state, value) {
    const text = String(value || '');
    return Game.config.cities.find((item) => text.includes(item.city))?.city
      || state.hometown?.city || state.location.city;
  }

  function rebuild(state) {
    const pools = {};
    Game.people.all(state).forEach((person) => {
      if (!person.currentCity || person.status === '已故') return;
      pools[person.currentCity] ||= [];
      if (!pools[person.currentCity].includes(person.id)) pools[person.currentCity].push(person.id);
    });
    state.socialWorld.cityPools = pools;
  }

  function ensure(state) {
    state.worldPeople = Array.isArray(state.worldPeople) ? state.worldPeople : [];
    state.socialWorld = state.socialWorld && typeof state.socialWorld === 'object'
      ? state.socialWorld : { cityPools: {}, version: 1 };
    state.socialWorld.cityPools ||= {};
    Game.people.all(state).forEach((person) => {
      person.homeCity ||= cityFromText(state, person.metCity);
      person.currentCity ||= person.careerCity || person.homeCity;
      person.schoolHistory = Array.isArray(person.schoolHistory) ? person.schoolHistory.slice(-8) : [];
    });
    rebuild(state);
    return state.socialWorld;
  }

  function movePerson(state, person, city) {
    if (!person || !city) return;
    person.currentCity = city;
    rebuild(state);
  }

  function createLocal(state, city) {
    const playerAge = U.age(state);
    const age = U.between(Math.max(0, playerAge - 8), Math.min(72, playerAge + 18));
    const person = U.person('当地角色', U.random(Game.nameSystem.surnames()), age, null, state.totalMonths);
    person.affection = U.between(18, 38);
    person.metCity = city;
    person.homeCity = city;
    person.currentCity = city;
    Game.worldCulture.applyPerson(person, state.location.country);
    U.setUniqueName(state, person, Game.worldCulture.profile(state.location.country).locale);
    Game.npcLife.updateGrowth(person, age);
    state.worldPeople.push(person);
    return person;
  }

  function ensureCityPool(state, city) {
    ensure(state);
    let locals = Game.people.all(state).filter((person) => (
      person.currentCity === city && person.status === '健康'
    ));
    while (locals.length < POOL_SIZE) locals.push(createLocal(state, city));
    rebuild(state);
    return locals;
  }

  function cityPeople(state, city) {
    return ensureCityPool(state, city).sort((a, b) => (
      Number(b.phoneUnlocked) - Number(a.phoneUnlocked) || b.affection - a.affection
    ));
  }

  function reachable(state, person) {
    return person.school === state.education.school || person.phoneUnlocked
      || Game.people.isExternal(state, person) || person.relation === '恋人'
      || (person.companyId && person.companyId === state.workplace?.companyId);
  }

  function reconnect(state, person) {
    if (person.currentCity !== state.location.city) return { ok: false, message: '对方目前不在这座城市' };
    const success = Math.random() < U.clamp(0.35 + person.affection / 160, 0.35, 0.82);
    if (!success) return { ok: false, message: '这次没有碰面，再熟悉城市后可以重试' };
    person.phoneUnlocked = true;
    person.affection = U.clamp(person.affection + 3, 0, 100);
    Game.relationshipMemory.record(state, person, '重逢', `在${state.location.city}重新取得联系`, 5, -2);
    return { ok: true, message: `你在${state.location.city}与${person.name}重新取得联系` };
  }

  function archiveClassmates(state, classmates, school) {
    ensure(state);
    const stage = state.education.schoolStage;
    const stayChance = { primary: 0.82, middle: 0.58, high: 0.34, vocational: 0.42, university: 0.2 }[stage] || 0.6;
    classmates.forEach((person) => {
      if (!person.schoolHistory.some((item) => item.school === school)) {
        person.schoolHistory.push({ school, city: state.location.city, endedAt: state.totalMonths });
      }
      person.relation = person.relation === '同学' ? '校友' : person.relation;
      const destination = Math.random() < stayChance
        ? state.location.city : U.random(Game.config.cities).city;
      movePerson(state, person, destination);
    });
  }

  function monthly(state) {
    ensure(state);
    if (state.month !== 1) return;
    Game.people.all(state).forEach((person) => {
      if (person.careerCity && person.currentCity !== person.careerCity) {
        person.currentCity = person.careerCity;
      } else if (person.educationStage === 'university') {
        const school = Game.config.universities.find((item) => item.name === person.educationName);
        if (school) person.currentCity = school.city;
      }
    });
    rebuild(state);
  }

  Game.socialWorld = Object.freeze({
    ensure, rebuild, movePerson, cityPeople, ensureCityPool, reachable, reconnect,
    archiveClassmates, monthly,
  });
}(window));
