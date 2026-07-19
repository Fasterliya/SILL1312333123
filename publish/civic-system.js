(function initCivicSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function place(city) {
    return { city: city.city, province: city.province, country: city.country || '华夏' };
  }

  function ensure(state) {
    state.civic ||= {};
    state.civic.household ||= { ...(state.hometown || state.location) };
    state.civic.household.country ||= '华夏';
    state.civic.identityCulture ||= state.civic.household.country;
    state.civic.birthName ||= state.name;
    state.civic.nameHistory = Array.isArray(state.civic.nameHistory)
      ? state.civic.nameHistory.slice(-12) : [];
  }

  function transferCost(state, city) {
    const international = city.country !== state.civic.household.country;
    return international ? 18000 + city.tier * 2500 : 2500 + city.tier * 1000;
  }

  function transfer(state, cityName) {
    ensure(state);
    if (U.age(state) < 18) return { ok: false, message: '18岁后才能独立办理户口迁移' };
    const city = C.cities.find((item) => item.city === cityName);
    if (!city) return { ok: false, message: '未找到目标行政地区' };
    if (city.city === state.civic.household.city) return { ok: false, message: '户口已经登记在这里' };
    const cost = transferCost(state, city);
    Game.economy.spend(state, cost);
    const previous = state.civic.household;
    state.civic.household = place(city);
    Game.lifeDirector.addLog(state, '户口迁移',
      `你将户口从${previous.country}${previous.city}迁至${city.country}${city.city}。`, 'milestone');
    return { ok: true, message: Game.economy.message(state, `户口已迁至${city.country}${city.city}`) };
  }

  function surnameOptions(state) {
    ensure(state);
    const locale = Game.worldCulture.profile(state.civic.household.country).locale;
    const source = Game.nameSystem.surnames(locale);
    const offset = Math.abs([...`${state.name}${state.civic.household.city}`]
      .reduce((sum, char) => sum + char.charCodeAt(0), 0)) % source.length;
    return Array.from({ length: Math.min(6, source.length) }, (_, index) => source[(offset + index) % source.length]);
  }

  function changeSurname(state, nextSurname) {
    ensure(state);
    if (U.age(state) < 18) return { ok: false, message: '18岁后才能办理姓名变更' };
    const country = state.civic.household.country;
    const locale = Game.worldCulture.profile(country).locale;
    if (!Game.nameSystem.surnames(locale).includes(nextSurname)) {
      return { ok: false, message: '该姓氏不属于当前户口地的登记名录' };
    }
    if (state.surname === nextSurname && state.civic.identityCulture === country) {
      return { ok: false, message: '当前已经使用这个文化姓氏' };
    }
    const cost = country === '华夏' ? 1200 : 6500;
    Game.economy.spend(state, cost);
    const previousName = state.name;
    state.surname = nextSurname;
    state.name = Game.nameSystem.makeName(nextSurname, state.gender, locale);
    state.civic.identityCulture = country;
    const partner = Game.people.find(state, state.romance?.partnerId);
    if (partner) partner.spouseName = state.name;
    state.civic.nameHistory.push({
      from: previousName, to: state.name, country, month: state.totalMonths,
    });
    state.civic.nameHistory = state.civic.nameHistory.slice(-12);
    Game.lifeDirector.addLog(state, '姓名登记',
      `你依照${country}文化将登记姓名由${previousName}改为${state.name}。`, 'milestone');
    return { ok: true, message: Game.economy.message(state, `新姓名已登记为${state.name}`) };
  }

  function cityRows(state) {
    return C.cities.map((city) => {
      const current = city.city === state.civic.household.city;
      const cost = transferCost(state, city);
      return `<article class="city-row ${current ? 'current' : ''}">
        <div><strong>${city.city}</strong><span>${city.country} · ${city.province}
        · 办理费 ${Game.worldCulture.format(cost, city.country)}</span></div>
        <b>¥${cost.toLocaleString()}</b>
        <button data-civic-transfer="${city.city}" ${current ? 'disabled' : ''}>迁户口</button></article>`;
    }).join('');
  }

  function render(state) {
    ensure(state);
    const household = state.civic.household;
    const adult = U.age(state) >= 18;
    const history = state.civic.nameHistory.at(-1);
    const surnames = surnameOptions(state).map((surname) => (
      `<button data-civic-surname="${surname}" ${adult ? '' : 'disabled'}>${surname}</button>`
    )).join('');
    return `<section class="list-guide"><strong>${state.location.country}${state.location.city}市政府</strong>
      <span>居住地与户口地分别记录。迁居不会自动迁户口，改姓按户口地姓名文化登记。</span></section>
      <div class="civic-summary">
        <div><span>当前居住</span><strong>${state.location.country} · ${state.location.city}</strong></div>
        <div><span>户口所在地</span><strong>${household.country} · ${household.city}</strong></div>
        <div><span>登记姓名</span><strong>${state.name}</strong></div>
        <div><span>姓名文化</span><strong>${state.civic.identityCulture}</strong></div>
      </div>
      ${history ? `<p class="civic-history">最近变更：${history.from} → ${history.to}</p>` : ''}
      <details class="record-section" open><summary><span>迁移户口</span>
        <small>${adult ? '国内与国际地区' : '18岁后开放'}</small></summary>
        <div class="civic-city-list">${adult ? cityRows(state) : '<p class="empty-state">成年后可独立办理。</p>'}</div>
      </details>
      <details class="record-section"><summary><span>采用当地姓氏</span>
        <small>${household.country}姓名文化</small></summary>
        <div class="surname-grid">${surnames}</div>
        <p class="civic-note">改姓会按当地姓名顺序重新登记全名，并保留历史姓名记录。</p>
      </details>`;
  }

  Game.civicSystem = Object.freeze({ ensure, transfer, changeSurname, render });
}(window));
