(function initTravel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  const neighborhoods = [
    ['商业街', 120, 3, '店铺与行人很多，容易遇到开朗的角色。', 'daily'],
    ['城市公园', 40, 4, '节奏舒缓，适合散步和自然交谈。', 'daily'],
    ['书店街', 80, 3, '常遇到安静、好奇或文艺的角色。', 'daily'],
    ['车站广场', 60, 2, '来自不同地方的人在这里短暂停留。', 'social'],
    ['夜间食街', 160, 4, '成年后可以在热闹的夜晚结识新朋友。', 'night'],
    ['城市漫展', 260, 6, '观看舞台、逛同人摊位，并结识Coser与创作者。', 'creative'],
    ['创作者市集', 180, 5, '插画、手作、写真与穿搭创作者在这里交流。', 'creative'],
    ['红灯区', 680, 10, '成年人的深夜娱乐，消费高昂但能彻底放松身心。', 'night'],
  ].map(([name, cost, mood, description, category]) => ({
    name, cost, mood, description, kind: 'neighborhood', category,
  }));

  let activeFilter = '全部';
  const filterLabels = ['全部', 'daily:日常休闲', 'social:社交邂逅', 'creative:创作活动', 'night:深夜'];

  function places(state) {
    const landmarks = Game.cityAttractions?.forCity(state.location.city) || [];
    return [...landmarks, ...neighborhoods];
  }

  function activePeople(state) {
    const ids = state.travel.activeIds?.length
      ? state.travel.activeIds : [state.travel.activeId].filter(Boolean);
    return ids.map((id) => Game.people.find(state, id)).filter(Boolean);
  }

  function unavailable(state, place) {
    if (place.name === '夜间食街' && U.age(state) < 18) return '成年后才能前往夜间食街';
    if (place.name === '红灯区' && U.age(state) < 18) return '成年后才能前往红灯区';
    if (['城市漫展', '创作者市集'].includes(place.name) && U.age(state) < 12) {
      return '12岁后可以独立参加创作者活动';
    }
    return '';
  }

  /* ---- multi-stage travel ---- */
  function startTravel(state, placeName) {
    const place = places(state).find((e) => e.name === placeName);
    if (!place) return { ok: false, message: '没有这个城市目的地' };
    const blocked = unavailable(state, place);
    if (blocked) return { ok: false, message: blocked };

    if (Game.staminaSystem) {
      var staminaCost = placeName === '红灯区' ? 35 : 20;
      var st = Game.staminaSystem.spend(state, staminaCost);
      if (!st.ok) return st;
    }

    const discount = state.assets.vehicles.length ? 0.5 : 1;
    const cost = Math.round(place.cost * discount);
    Game.economy.spend(state, cost);

    if (placeName === '红灯区') {
      const result = Game.brothelSystem.start(state);
      if (result.ok) {
        state.travel.localHistory.unshift({
          city: state.location.city, place: place.name, month: state.totalMonths,
        });
        state.travel.localHistory = state.travel.localHistory.slice(0, 20);
      }
      return result;
    }

    state.travel.encounters = [];
    state.travel.activeStage = { placeName, stage: 0, score: 0, partnerId: null };
    Game.lifeDirector.addLog(state, '街区旅途',
      `你开始了${placeName}的探索之旅。`, 'good');
    return { ok: true, message: `开始探索${placeName}` };
  }

  function chooseStage(state, choiceId) {
    const ts = state.travel.activeStage;
    if (!ts) return { ok: false, message: '当前没有进行中的旅途' };
    const stage = Game.travelStages.stageData(ts.placeName, ts.stage);
    const choice = stage?.options.find((e) => e[0] === choiceId);
    if (!stage || !choice) return { ok: false, message: '选项已失效' };

    const effect = choice[2];
    if (effect.cost) Game.economy.spend(state, effect.cost);
    state.stats.心情 = U.clamp(state.stats.心情 + (effect.mood || 0), 0, 100);
    state.stats.魅力 = U.clamp(state.stats.魅力 + (effect.charm || 0), 0, 100);
    state.stats.智力 = U.clamp(state.stats.智力 + (effect.intelligence || 0), 0, 100);
    state.stats.健康 = U.clamp(state.stats.健康 + (effect.health || effect.健康 || 0), 0, 100);
    state.cityLife.reputation = U.clamp(state.cityLife.reputation + (effect.reputation || 0), 0, 100);
    ts.score += effect.score || 0;

    if (effect.meet) {
      const person = U.person('旅途相识', '', U.between(-6, 9), null, state.playerBornAt);
      Game.worldCulture.applyPerson(person, state.location.country);
      U.setUniqueName(state, person, Game.worldCulture.profile(state.location.country).locale);
      person.affection = U.between(32, 50);
      person.phoneUnlocked = false;
      person.metCity = `${state.location.city}${ts.placeName}`;
      Game.npcLife.syncGrowth(state, person);
      state.travel.encounters.push(person);
      ts.partnerId = person.id;
      Game.lifeDirector.addLog(state, '旅途相识',
        `你在${ts.placeName}认识了${person.name}。`, 'good');
    }
    if (effect.affection && ts.partnerId) {
      const partner = Game.people.find(state, ts.partnerId);
      if (partner) partner.affection = U.clamp(partner.affection + effect.affection, 0, 100);
    }

    ts.stage += 1;
    const totalStages = Game.travelStages.forPlace(ts.placeName).length;
    if (ts.stage >= totalStages) {
      const familiarity = state.cityLife.familiarity;
      familiarity[state.location.city] = U.clamp((familiarity[state.location.city] || 0) + 2, 0, 100);
      state.travel.localHistory.unshift({
        city: state.location.city, place: ts.placeName, month: state.totalMonths,
      });
      state.travel.localHistory = state.travel.localHistory.slice(0, 20);
      state.stats.心情 = U.clamp(state.stats.心情 + U.between(4, 8), 0, 100);
      state.travel.activeStage = null;
      Game.lifeDirector.addLog(state, '旅途归来',
        `你结束了${ts.placeName}的旅途，评分 ${ts.score}。`, 'milestone');
      return { ok: true, message: `${ts.placeName}旅途完成，评分 ${ts.score}`, finished: true };
    }
    return { ok: true, message: `${stage.title}：${choice[1]}` };
  }

  /* ---- render ---- */
  function renderEncounters(state) {
    const people = state.travel.encounters.slice(-6).reverse();
    if (!people.length) return '<p class="empty-state">探索街区后可能结识当地角色，点击头像查看详情。</p>';
    return people.map((person) => Game.social.card(person, [
      ['chat', '交谈'], ['meal', '请客'], ['exchange', '留联系方式'],
    ])).join('');
  }

  function placeCard(place, state) {
    const discount = state.assets.vehicles.length ? 0.5 : 1;
    const cost = Math.round(place.cost * discount);
    const blocked = unavailable(state, place);
    return `<button class="travel-choice" data-travel-start="${place.name}" ${blocked ? 'disabled' : ''}>
      <span><strong>${place.name}</strong><small>${place.description}${blocked ? ' · ' + blocked : ''}</small></span>
      <b>${Game.view.money(cost)}<br><span class="travel-category">${place.kind === 'landmark' ? '城市景观' : place.category}</span></b>
    </button>`;
  }

  function render(state) {
    /* multi-stage active */
    if (state.travel.activeStage) {
      const ts = state.travel.activeStage;
      const stage = Game.travelStages.stageData(ts.placeName, ts.stage);
      if (!stage) return '';
      const total = Game.travelStages.forPlace(ts.placeName).length;
      return `<section class="journey-current"><span>${ts.placeName}</span>
        <strong>${stage.title}</strong><small>${stage.text}</small>
        <div class="journey-progress"><i style="width:${ts.stage * 100 / total}%"></i></div></section>
        <div class="journey-options">${stage.options.map(([id, label, eff]) => (
          `<button data-travel-choice="${id}">${label}${eff.cost ? ` · ${Game.view.money(eff.cost)}` : ''}</button>`)).join('')}</div>
        <h3>旅途相识</h3>${renderEncounters(state)}`;
    }

    /* brothel/hookup sub-systems */
    if (state.brothelStage?.active) return Game.brothelSystem.render(state);
    if (state.hookupStage?.active) return Game.hookupSystem.render(state);

    /* filter + place list */
    const vehicle = state.assets.vehicles.length ? '座驾已生效，交通费减半' : '购买座驾可让交通费减半';
    const recent = state.travel.localHistory[0];
    const allPlaces = places(state);
    const filtered = activeFilter === '全部'
      ? allPlaces
      : allPlaces.filter((p) => p.category === activeFilter || p.kind === activeFilter);

    const filters = filterLabels.map((item) => {
      const [value, label] = item.includes(':') ? item.split(':') : [item, item];
      return `<button class="${activeFilter === value ? 'active' : ''}" data-travel-filter="${value}">${label}</button>`;
    }).join('');

    const cards = filtered.map((place) => placeCard(place, state)).join('');

    return `<section class="list-guide"><strong>${state.location.country} · ${state.location.city}</strong>
      <span>${vehicle}。${recent ? `最近游览：${recent.place || recent.city}${recent.place ? '' : ''}。` : '选择一个目的地开始探索。'}</span></section>
      <nav class="filter-chips">${filters}</nav>
      <div class="travel-grid">${cards || '<p class="empty-state">当前筛选没有匹配的目的地。</p>'}</div>
      <h3>旅途相识 · ${state.travel.encounters.length}位角色</h3>${renderEncounters(state)}`;
  }

  function roam(state, placeName) {
    /* Keep backward compat for data-roam-area clicks */
    return startTravel(state, placeName);
  }

  function setFilter(value) {
    const valid = filterLabels.map((f) => f.includes(':') ? f.split(':')[0] : f);
    if (valid.includes(value)) activeFilter = value;
  }

  Game.travelSystem = Object.freeze({ roam: startTravel, chooseStage, render, setFilter });
}(window));
