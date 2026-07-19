(function initTravel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const areas = [
    ['商业街', 120, '店铺与行人很多，容易遇到开朗的角色。'],
    ['城市公园', 40, '节奏舒缓，适合散步和自然交谈。'],
    ['书店街', 80, '常遇到安静、好奇或文艺的角色。'],
    ['车站广场', 60, '来自不同地方的人在这里短暂停留。'],
    ['夜间食街', 160, '成年后可以在热闹的夜晚结识新朋友。'],
    ['城市漫展', 260, '观看舞台、逛同人摊位，并结识Coser与创作者。'],
    ['创作者市集', 180, '插画、手作、写真与穿搭创作者在这里交流。'],
  ];

  function activePerson(state) {
    return Game.people.find(state, state.travel.activeId);
  }

  function roam(state, areaName) {
    const area = areas.find((entry) => entry[0] === areaName);
    if (!area) return { ok: false, message: '没有这个街区' };
    if (areaName === '夜间食街' && U.age(state) < 18) return { ok: false, message: '成年后才能前往夜间食街' };
    if (['城市漫展', '创作者市集'].includes(areaName) && U.age(state) < 12) {
      return { ok: false, message: '12岁后可以独立参加创作者活动' };
    }
    const discount = state.assets.vehicles.length ? 0.5 : 1;
    const cost = Math.round(area[1] * discount);
    if (state.money < cost) return { ok: false, message: `这次出行需要 ¥${cost}` };
    state.money -= cost;
    const person = U.person('路人', U.random(Game.nameSystem.surnames()), U.between(-5, 8), null, state.playerBornAt);
    person.affection = U.between(25, 42);
    person.metCity = `${state.location.city}${areaName}`;
    Game.worldCulture.applyPerson(person, state.location.country);
    U.setUniqueName(state, person, Game.worldCulture.profile(state.location.country).locale);
    if (areaName === '城市漫展') {
      person.job = U.random(['职业Coser', '虚拟主播', '动画原画师', '漫展活动执行']);
      person.clothing.top = U.random(['舞台演出礼服', '毕业袴套装', '复古灯笼袖长裙']);
    } else if (areaName === '创作者市集') {
      person.job = U.random(['写真博主', '穿搭博主', '自由插画师', '商业摄影师']);
    }
    Game.npcLife.syncGrowth(state, person);
    state.travel.encounters = state.travel.encounters.filter((item) => item.id !== state.travel.activeId);
    state.travel.encounters.push(person);
    state.travel.activeId = person.id;
    state.stats.心情 = U.clamp(state.stats.心情 + 3, 0, 100);
    Game.lifeDirector.addLog(state, '街头相遇', `你在${areaName}遇见了${person.name}。`, 'good');
    return { ok: true, message: `你在${areaName}遇见了${person.name}` };
  }

  function render(state) {
    const person = activePerson(state);
    const vehicle = state.assets.vehicles.length ? '拥有座驾，街区交通费减半' : '购买座驾可让街区交通费减半';
    const buttons = areas.map(([name, cost, description]) => (
      `<button class="travel-choice" data-roam-area="${name}"><span><strong>${name}</strong>
      <small>${description}</small></span><b>¥${state.assets.vehicles.length ? Math.round(cost / 2) : cost}</b></button>`
    )).join('');
    const encounter = person ? `<h3>最近相遇</h3>${Game.social.card(person, [
      ['chat', '交谈'], ['meal', '请客'], ...(person.phoneUnlocked ? [] : [['exchange', '留联系方式']]),
    ])}` : '<p class="empty-state">选择一个街区，可能遇到新的具体角色。</p>';
    return `<section class="list-guide"><strong>${state.location.country} · ${state.location.city}</strong>
      <span>${vehicle}。街区与创作者活动可以自由探索。</span></section>
      <div class="travel-grid">${buttons}</div>${encounter}`;
  }

  Game.travelSystem = Object.freeze({ roam, render });
}(window));
