(function initTravel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const neighborhoods = [
    ['商业街', 120, 3, '店铺与行人很多，容易遇到开朗的角色。'],
    ['城市公园', 40, 4, '节奏舒缓，适合散步和自然交谈。'],
    ['书店街', 80, 3, '常遇到安静、好奇或文艺的角色。'],
    ['车站广场', 60, 2, '来自不同地方的人在这里短暂停留。'],
    ['夜间食街', 160, 4, '成年后可以在热闹的夜晚结识新朋友。'],
    ['城市漫展', 260, 6, '观看舞台、逛同人摊位，并结识Coser与创作者。'],
    ['创作者市集', 180, 5, '插画、手作、写真与穿搭创作者在这里交流。'],
  ].map(([name, cost, mood, description]) => ({
    name, cost, mood, description, kind: 'neighborhood',
  }));

  function places(state) {
    const landmarks = Game.cityAttractions?.forCity(state.location.city) || [];
    return [...landmarks, ...neighborhoods];
  }

  function activePeople(state) {
    const ids = state.travel.activeIds?.length
      ? state.travel.activeIds : [state.travel.activeId].filter(Boolean);
    return ids.map((id) => Game.people.find(state, id)).filter(Boolean);
  }

  function shuffled(list) {
    return list.map((item) => ({ item, order: Math.random() }))
      .sort((a, b) => a.order - b.order).map((entry) => entry.item);
  }

  function encounterResidents(state, place) {
    const residents = Game.socialWorld.cityPeople(state, state.location.city)
      .filter((person) => person.status === '健康');
    if (place.name === '城市漫展') Game.npcFashion.prepareConvention(state, residents);
    const cosers = place.name === '城市漫展'
      ? shuffled(residents.filter((person) => person.cosplay && person.cosplay !== '无')) : [];
    const unknown = shuffled(residents.filter((person) => (
      !cosers.includes(person) && !person.phoneUnlocked && person.interactions < 1
    )));
    const known = shuffled(residents.filter((person) => !cosers.includes(person) && !unknown.includes(person)));
    return [...cosers, ...unknown, ...known].slice(0, 3);
  }

  function unavailable(state, place) {
    if (place.name === '夜间食街' && U.age(state) < 18) return '成年后才能前往夜间食街';
    if (['城市漫展', '创作者市集'].includes(place.name) && U.age(state) < 12) {
      return '12岁后可以独立参加创作者活动';
    }
    return '';
  }

  function roam(state, placeName) {
    const place = places(state).find((entry) => entry.name === placeName);
    if (!place) return { ok: false, message: '没有这个城市目的地' };
    const blocked = unavailable(state, place);
    if (blocked) return { ok: false, message: blocked };
    const discount = state.assets.vehicles.length ? 0.5 : 1;
    const cost = Math.round(place.cost * discount);
    Game.economy.spend(state, cost);
    state.travel.encounters = [];
    const people = encounterResidents(state, place);
    if (!people.length) return { ok: false, message: '当前城市暂时没有可遇见的居民' };
    state.travel.activeIds = people.map((person) => person.id);
    state.travel.activeId = state.travel.activeIds[0];
    state.stats.心情 = U.clamp(state.stats.心情 + place.mood, 0, 100);
    const familiarity = state.cityLife.familiarity;
    familiarity[state.location.city] = U.clamp((familiarity[state.location.city] || 0)
      + (place.kind === 'landmark' ? 4 : 2), 0, 100);
    state.travel.localHistory.unshift({
      city: state.location.city, place: place.name, kind: place.kind, month: state.totalMonths,
    });
    state.travel.localHistory = state.travel.localHistory.slice(0, 20);
    people.forEach((person) => {
      person.metCity ||= `${state.location.city}${place.name}`;
    });
    const names = people.map((person) => person.name).join('、');
    const title = place.kind === 'landmark' ? '城市景观旅途' : '街头相遇';
    Game.lifeDirector.addLog(state, title, `你在${place.name}游览并遇见了${names}。`, 'good');
    return { ok: true, message: Game.economy.message(
      state, `游览${place.name}，心情 +${place.mood}，遇见${people.length}位本地角色`,
    ) };
  }

  function choice(state, place) {
    const cost = Math.round(place.cost * (state.assets.vehicles.length ? 0.5 : 1));
    return `<button class="travel-choice" data-roam-area="${place.name}"><span>
      <strong>${place.name}</strong><small>${place.description}</small></span>
      <b>${Game.worldCulture.format(cost, state.location.country)}</b></button>`;
  }

  function section(title, hint, entries, open) {
    return `<details class="record-section" ${open ? 'open' : ''}><summary><span>${title}</span>
      <small>${hint}</small></summary><div class="travel-grid">${entries}</div></details>`;
  }

  function render(state) {
    const people = activePeople(state);
    const landmarks = Game.cityAttractions?.forCity(state.location.city) || [];
    const vehicle = state.assets.vehicles.length ? '座驾已生效，交通费减半' : '购买座驾可让交通费减半';
    const recent = state.travel.localHistory[0];
    const encounter = people.length ? people.map((person) => (
      Game.social.card(person, [
        ['chat', '交谈'], ['meal', '请客'], ...(person.phoneUnlocked ? [] : [['exchange', '留联系方式']]),
      ])
    )).join('') : '<p class="empty-state">选择一个目的地，会从当前城市的真实居民中遇见角色。</p>';
    return `<section class="list-guide"><strong>${state.location.country} · ${state.location.city}</strong>
      <span>${vehicle}。${recent ? `最近游览：${recent.city}${recent.place}。` : '从城市景观开始认识当地。'}</span></section>
      ${section('城市景观与景区', `${landmarks.length}处当地目的地 · 默认展开`,
    landmarks.map((place) => choice(state, place)).join('') || '<p class="empty-state">当地景观资料整理中。</p>', true)}
      ${section('日常街区', `${neighborhoods.length}种日常与创作者活动`,
    neighborhoods.map((place) => choice(state, place)).join(''), false)}
      ${section('本次相遇', people.length ? `${people.length}位本地角色` : '游览后出现',
    encounter, people.length > 0)}`;
  }

  Game.travelSystem = Object.freeze({ roam, render });
}(window));
