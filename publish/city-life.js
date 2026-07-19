(function initCityLife(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const signatures = {
    北京: ['公共资源密集', '教育科研机会多'], 上海: ['商业节奏快', '国际化行业集中'],
    深圳: ['科技创业活跃', '职业流动快'], 杭州: ['数字经济活跃', '生活与创意并重'],
    成都: ['生活节奏舒缓', '文创与服务业活跃'], 西安: ['高校与制造并重', '文化积淀深'],
    青岛: ['滨海生活', '制造与旅游并重'], 昆明: ['气候温和', '生活成本较低'],
    东京: ['行业分工细致', '通勤与生活成本高'], 大阪: ['商业务实', '城市社交直接'],
    京都: ['传统文化浓厚', '旅游与文化岗位集中'], 札幌: ['冬季漫长', '生活节奏舒缓'],
  };

  function info(state) {
    return Game.config.cities.find((item) => item.city === state.location.city)
      || { city: state.location.city, country: state.location.country || '华夏', tier: 3, cost: 7000 };
  }

  function traits(city) {
    return signatures[city.city] || (city.tier === 1
      ? ['机会密集', '住房与通勤成本较高'] : (city.tier === 2
        ? ['产业与生活较均衡', '区域机会稳定'] : ['生活成本较低', '熟人社会更明显']));
  }

  function monthlyCost(state) {
    if (U.age(state) < 18) return 0;
    const city = info(state);
    const base = city.tier === 1 ? 2800 : (city.tier === 2 ? 1900 : 1250);
    const country = Game.worldCulture.profile(city.country).cost;
    return Math.round(base * country * (state.assets.house ? 0.72 : 1));
  }

  function salaryFactor(state) {
    const city = info(state);
    return city.tier === 1 ? 1.14 : (city.tier === 2 ? 1.05 : 0.96);
  }

  function onMove(state) {
    state.cityLife.lastCity = state.location.city;
    state.cityLife.residenceMonths = 0;
    state.cityLife.familiarity[state.location.city] ||= 0;
    state.cityLife.reputation = Math.round(state.cityLife.reputation * 0.65);
  }

  function monthly(state) {
    if (state.cityLife.lastCity !== state.location.city) onMove(state);
    state.cityLife.residenceMonths += 1;
    const city = state.location.city;
    state.cityLife.familiarity[city] = U.clamp((state.cityLife.familiarity[city] || 0) + 0.6, 0, 100);
    const cost = monthlyCost(state);
    state.money -= cost;
    if (state.cityLife.familiarity[city] >= 60 && state.totalMonths % 12 === 0) {
      state.cityLife.reputation = U.clamp(state.cityLife.reputation + 2, 0, 100);
    }
    if (state.month === 1) {
      const current = info(state);
      if (current.tier === 1 && state.career.job) state.career.performance = U.clamp(state.career.performance + 1, 0, 100);
      if (current.tier === 1) state.stats.心情 = U.clamp(state.stats.心情 - 1, 0, 100);
      if (current.tier === 3) state.stats.健康 = U.clamp(state.stats.健康 + 1, 0, 100);
      if (current.country !== '华夏') state.stats.魅力 = U.clamp(state.stats.魅力 + 1, 0, 100);
    }
  }

  function render(state) {
    const city = info(state);
    const familiarity = Math.round(state.cityLife.familiarity[city.city] || 0);
    const local = Game.worldCulture.format(monthlyCost(state), city.country);
    const etiquette = Game.worldCulture.profile(city.country).etiquette;
    return `<section class="city-profile"><div><span>${city.country || '华夏'} · ${city.province}</span>
      <strong>${city.city}</strong><small>${traits(city).join(' · ')} · ${etiquette}</small></div>
      <dl><div><dt>月生活费</dt><dd>¥${monthlyCost(state).toLocaleString()}</dd></div>
      <div><dt>当地货币</dt><dd>${local}</dd></div>
      <div><dt>城市熟悉</dt><dd>${familiarity}</dd></div><div><dt>城市声望</dt>
      <dd>${Math.round(state.cityLife.reputation)}</dd></div></dl></section>`;
  }

  Game.cityLife = Object.freeze({ info, monthlyCost, salaryFactor, onMove, monthly, render });
}(window));
