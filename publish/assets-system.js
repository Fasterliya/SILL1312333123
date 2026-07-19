(function initAssetsSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function buyBusiness(state, id) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能经营产业' };
    const item = C.businesses.find((entry) => entry.id === id);
    if (!item || state.assets.businesses.includes(id)) return { ok: false, message: '已经拥有这项产业' };
    if (state.money < item.price) return { ok: false, message: `购买需要 ${Game.view.money(item.price)}` };
    state.money -= item.price;
    state.assets.businesses.push(id);
    Game.lifeDirector.addLog(state, '购入产业', `你成为${item.name}的经营者。`, 'milestone');
    return { ok: true, message: `${item.name}每月预计收入 ${Game.view.money(item.income)}` };
  }

  function buyVehicle(state, id) {
    if (U.age(state) < 16) return { ok: false, message: '16岁后才能购买个人交通工具' };
    const item = C.vehicles.find((entry) => entry.id === id);
    if (!item || state.assets.vehicles.includes(id)) return { ok: false, message: '已经拥有这项座驾' };
    if (state.money < item.price) return { ok: false, message: `购买需要 ${Game.view.money(item.price)}` };
    state.money -= item.price;
    state.assets.vehicles.push(id);
    state.stats.心情 = U.clamp(state.stats.心情 + item.mood, 0, 100);
    return { ok: true, message: `已购入${item.name}` };
  }

  function monthlyIncome(state) {
    return state.assets.businesses.reduce((sum, id) => (
      sum + (C.businesses.find((item) => item.id === id)?.income || 0)
    ), 0);
  }

  function render(state, money) {
    const income = monthlyIncome(state);
    const businesses = C.businesses.map((item) => {
      const owned = state.assets.businesses.includes(item.id);
      return `<article class="asset-row"><div><strong>${item.name}</strong>
        <span>每月收入 ${money(item.income)}</span></div><b>${money(item.price)}</b>
        <button data-business="${item.id}" ${owned ? 'disabled' : ''}>${owned ? '已拥有' : '购入'}</button></article>`;
    }).join('');
    const vehicles = C.vehicles.map((item) => {
      const owned = state.assets.vehicles.includes(item.id);
      return `<article class="asset-row"><div><strong>${item.name}</strong>
        <span>心情 +${item.mood} · 街区交通优惠</span></div><b>${money(item.price)}</b>
        <button data-vehicle="${item.id}" ${owned ? 'disabled' : ''}>${owned ? '已拥有' : '购买'}</button></article>`;
    }).join('');
    return `<section class="asset-summary"><span>产业月收入</span><strong>${money(income)}</strong>
      <small>${state.assets.businesses.length}项产业 · ${state.assets.vehicles.length}项座驾</small></section>
      <h3>经营产业</h3>${businesses}<h3>个人座驾</h3>${vehicles}`;
  }

  Game.assetsSystem = Object.freeze({ buyBusiness, buyVehicle, monthlyIncome, render });
}(window));
