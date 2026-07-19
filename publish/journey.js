(function initJourneySystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const routes = [
    { id: 'tokyo', city: '东京', country: '日本', cost: 12000, activity: '祭典与街区文化体验' },
    { id: 'seoul', city: '首尔', country: '韩国', cost: 11000, activity: '传统街区与流行文化体验' },
    { id: 'singapore', city: '新加坡', country: '新加坡', cost: 13000, activity: '多语言社区与城市花园体验' },
    { id: 'paris', city: '巴黎', country: '法国', cost: 18000, activity: '博物馆、咖啡馆与艺术街区体验' },
    { id: 'london', city: '伦敦', country: '英国', cost: 19000, activity: '历史街区、剧场与公共文化体验' },
    { id: 'newyork', city: '纽约', country: '美国', cost: 20000, activity: '多元社区、展演与职业交流体验' },
  ];

  function route(state) {
    return routes.find((item) => item.id === state.travel.journey?.routeId) || null;
  }

  function stageData(item, stage) {
    const culture = Game.worldCulture.profile(item.country);
    return [
      { title: '行前准备', text: `${item.country}使用${culture.code}，${culture.etiquette}。`,
        options: [['study', '学习礼仪与常用表达', { mood: 1, charm: 2, score: 3 }],
          ['light', '轻装出发保留预算', { mood: 3, score: 1 }]] },
      { title: `抵达${item.city}`, text: '陌生的交通、语言和生活节奏构成第一轮适应。',
        options: [['observe', '观察当地人的行动方式', { intelligence: 2, score: 3 }],
          ['guide', '参加小型城市导览', { money: -500, mood: 3, score: 2 }]] },
      { title: '深入文化现场', text: item.activity,
        options: [['culture', '认真参与并尊重当地规则', { charm: 3, reputation: 3, score: 4, meet: true }],
          ['photo', '记录城市细节与个人感受', { mood: 4, intelligence: 1, score: 2, meet: true }]] },
      { title: '旅途社交', text: '你与刚认识的人需要跨越表达习惯与文化距离。',
        options: [['listen', '多倾听并确认彼此理解', { charm: 2, affection: 8, score: 4 }],
          ['share', '主动分享自己的家乡文化', { mood: 3, affection: 6, score: 3 }]] },
      { title: '返程之前', text: '短暂旅途即将结束，关系是否延续取决于之后的主动互动。',
        options: [['farewell', '认真道别并保留再次见面的可能', { mood: 3, affection: 5, score: 3 }],
          ['souvenir', '购买小礼物表达谢意', { money: -400, affection: 8, score: 4 }]] },
    ][stage];
  }

  function start(state, routeId) {
    if (U.age(state) < 16) return { ok: false, message: '16岁后可以参加国际旅途' };
    if (state.travel.journey) return { ok: false, message: '当前已有一段旅途正在进行' };
    const item = routes.find((entry) => entry.id === routeId);
    if (!item) return { ok: false, message: '没有这条国际路线' };
    Game.economy.spend(state, item.cost);
    state.travel.journey = { routeId, stage: 0, score: 0, startedAt: state.totalMonths, encounterId: null };
    Game.lifeDirector.addLog(state, '国际旅途启程',
      `你前往${item.country}${item.city}，支付了 ${Game.view.money(item.cost)}。`, 'milestone');
    return { ok: true, message: Game.economy.message(state, `已启程前往${item.city}`) };
  }

  function encounter(state, item) {
    const person = U.person('旅途相识', '', U.between(-6, 9), null, state.playerBornAt);
    Game.worldCulture.applyPerson(person, item.country);
    U.setUniqueName(state, person, Game.worldCulture.profile(item.country).locale);
    person.affection = U.between(32, 46);
    person.phoneUnlocked = false;
    person.metCity = `${item.country} · ${item.city}`;
    Game.npcLife.syncGrowth(state, person);
    state.travel.encounters.push(person);
    state.travel.journey.encounterId = person.id;
    return person;
  }

  function choose(state, choiceId) {
    const item = route(state);
    const journey = state.travel.journey;
    const stage = item && stageData(item, journey?.stage);
    const choice = stage?.options.find((entry) => entry[0] === choiceId);
    if (!item || !choice) return { ok: false, message: '当前旅途选择已经失效' };
    const effect = choice[2];
    state.money += effect.money || 0;
    state.stats.心情 = U.clamp(state.stats.心情 + (effect.mood || 0), 0, 100);
    state.stats.魅力 = U.clamp(state.stats.魅力 + (effect.charm || 0), 0, 100);
    state.stats.智力 = U.clamp(state.stats.智力 + (effect.intelligence || 0), 0, 100);
    state.cityLife.reputation = U.clamp(state.cityLife.reputation + (effect.reputation || 0), 0, 100);
    journey.score += effect.score || 0;
    const person = Game.people.find(state, journey.encounterId) || (effect.meet ? encounter(state, item) : null);
    if (person && effect.affection) person.affection = U.clamp(person.affection + effect.affection, 0, 100);
    journey.stage += 1;
    if (journey.stage >= 5) {
      state.travel.history.unshift({ routeId: item.id, city: item.city, country: item.country,
        score: journey.score, month: state.totalMonths });
      state.travel.history = state.travel.history.slice(0, 20);
      state.travel.journey = null;
      Game.lifeDirector.addLog(state, '国际旅途归来', `你结束${item.city}之旅，文化体验评分 ${journey.score}。`, 'milestone');
      return { ok: true, message: `${item.city}旅途完成，评分 ${journey.score}` };
    }
    return { ok: true, message: `${stage.title}：${choice[1]}` };
  }

  function renderEncounters(state) {
    const people = state.travel.encounters.slice(-4).reverse();
    if (!people.length) return '<p class="empty-state">深入旅途后可能结识当地角色。</p>';
    return people.map((person) => Game.social.card(person, [
      ['chat', '交谈'], ['meal', '共同用餐'], ['exchange', '加联系人'],
    ])).join('');
  }

  function render(state) {
    const current = route(state);
    if (current) {
      const stage = stageData(current, state.travel.journey.stage);
      return `<section class="journey-current"><span>${current.country} · ${current.city}</span>
        <strong>${stage.title}</strong><small>${stage.text}</small>
        <div class="journey-progress"><i style="width:${state.travel.journey.stage * 20}%"></i></div></section>
        <div class="journey-options">${stage.options.map(([id, label]) => (
          `<button data-journey-choice="${id}">${label}</button>`)).join('')}</div>
        <h3>旅途相识</h3>${renderEncounters(state)}`;
    }
    const cards = routes.map((item) => (
      `<button class="travel-choice" data-journey-start="${item.id}"><span><strong>${item.country} · ${item.city}</strong>
      <small>${Game.worldCulture.profile(item.country).etiquette}</small></span>
      <b>${Game.view.money(item.cost)}<br>${Game.worldCulture.format(item.cost, item.country)}</b></button>`
    )).join('');
    return `<section class="list-guide"><strong>国际多阶段旅途</strong>
      <span>汇率为游戏内固定参考值。每段旅途包含行前、抵达、文化、社交与返程选择。</span></section>
      <div class="travel-grid">${cards}</div><h3>尚未添加的旅途关系</h3>${renderEncounters(state)}`;
  }

  Game.journeySystem = Object.freeze({ routes, start, choose, render });
}(window));
