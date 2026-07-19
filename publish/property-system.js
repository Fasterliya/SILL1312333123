(function initPropertySystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;
  const RATE = 0.042 / 12;
  const TERM = 240;

  const money = (value) => Game.view.money(value);
  const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  function paymentFor(principal) {
    if (principal <= 0) return 0;
    return Math.ceil(principal * RATE * ((1 + RATE) ** TERM) / (((1 + RATE) ** TERM) - 1));
  }

  function ensure(state) {
    state.assets ||= {};
    const house = state.assets.house;
    if (!house) {
      state.assets.house = null;
      state.assets.mortgage = 0;
      return null;
    }
    const catalog = C.houses.find((item) => item.name === house.name) || house;
    house.price = Math.max(1, finite(house.price, catalog.price || 1));
    house.purchasePrice = Math.max(1, finite(house.purchasePrice, house.price));
    house.marketValue = Math.max(1, finite(house.marketValue, house.purchasePrice));
    house.mortgageBalance = Math.max(0, finite(
      house.mortgageBalance, state.assets.mortgage > 0 ? house.purchasePrice * 0.7 : 0,
    ));
    house.monthlyPayment = Math.max(0, Math.round(finite(
      house.monthlyPayment, paymentFor(house.mortgageBalance),
    )));
    house.boughtAt = Number.isFinite(house.boughtAt) ? house.boughtAt : state.totalMonths;
    house.city ||= state.location.city;
    house.country ||= state.location.country || '华夏';
    house.monthsPaid = Math.max(0, Math.floor(finite(house.monthsPaid, 0)));
    state.assets.mortgage = house.mortgageBalance > 0 ? house.monthlyPayment : 0;
    return house;
  }

  function buy(state, index) {
    ensure(state);
    const template = C.houses[index];
    if (U.age(state) < 18) return { ok: false, message: '成年后才能购买不动产' };
    if (!template || state.assets.house) return { ok: false, message: '需要先出售当前房产' };
    const down = Math.round(template.price * 0.3);
    const fee = Math.round(template.price * 0.02);
    if (state.money < down + fee) {
      return { ok: false, message: `首付与税费需要 ${money(down + fee)}` };
    }
    const principal = template.price - down;
    state.money -= down + fee;
    state.assets.house = {
      ...template,
      purchasePrice: template.price,
      marketValue: template.price,
      mortgageBalance: principal,
      monthlyPayment: paymentFor(principal),
      boughtAt: state.totalMonths,
      monthsPaid: 0,
      city: state.location.city,
      country: state.location.country || '华夏',
    };
    ensure(state);
    state.stats.心情 = U.clamp(state.stats.心情 + template.comfort, 0, 100);
    Game.lifeDirector.addLog(state, '购入不动产',
      `你在${state.location.city}购入${template.name}，支付首付与交易税费。`, 'milestone');
    return { ok: true, message: `已购入${template.name}，月供 ${money(state.assets.mortgage)}` };
  }

  function sell(state) {
    const house = ensure(state);
    if (!house) return { ok: false, message: '当前没有可出售的房产' };
    const fee = Math.round(house.marketValue * 0.03);
    const proceeds = Math.round(house.marketValue - fee - house.mortgageBalance);
    if (state.money + proceeds < 0) return { ok: false, message: '当前现金不足以补足贷款与出售费用' };
    state.money += proceeds;
    Game.lifeDirector.addLog(state, '出售不动产',
      `你以${money(house.marketValue)}出售${house.name}，结清贷款与交易费用。`, 'milestone');
    state.assets.house = null;
    state.assets.mortgage = 0;
    return { ok: true, message: `房产已出售，净结算 ${money(proceeds)}` };
  }

  function repay(state, mode) {
    const house = ensure(state);
    if (!house || house.mortgageBalance <= 0) return { ok: false, message: '当前没有未结清房贷' };
    const amount = mode === 'all' ? house.mortgageBalance : Math.min(10000, house.mortgageBalance);
    if (state.money < amount) return { ok: false, message: `提前还贷需要 ${money(amount)}` };
    state.money -= amount;
    house.mortgageBalance -= amount;
    if (house.mortgageBalance <= 0) {
      house.mortgageBalance = 0;
      house.monthlyPayment = 0;
    }
    ensure(state);
    return { ok: true, message: `已提前偿还 ${money(amount)}` };
  }

  function marketChange(state, house) {
    const city = Game.config.cities.find((item) => item.city === house.city);
    const trend = city?.tier === 1 ? 0.035 : (city?.tier === 2 ? 0.026 : 0.018);
    const change = U.clamp(trend + (Math.random() - 0.5) * 0.045, -0.018, 0.058);
    house.marketValue = Math.round(U.clamp(
      house.marketValue * (1 + change), house.purchasePrice * 0.72, house.purchasePrice * 1.8,
    ));
  }

  function monthly(state) {
    const house = ensure(state);
    if (!house) return;
    if (house.mortgageBalance > 0) {
      const interest = Math.round(house.mortgageBalance * RATE);
      const due = Math.min(house.monthlyPayment, house.mortgageBalance + interest);
      const principal = Math.max(0, due - interest);
      state.money -= due;
      house.mortgageBalance = Math.max(0, house.mortgageBalance - principal);
      house.monthsPaid += 1;
      if (!house.mortgageBalance) house.monthlyPayment = 0;
    }
    if (state.month === 1) marketChange(state, house);
    ensure(state);
  }

  function render(state) {
    const house = ensure(state);
    if (house) {
      const equity = Math.round(house.marketValue - house.mortgageBalance);
      return `<section class="property-summary"><div><span>${house.country} · ${house.city}</span>
        <strong>${house.name}</strong><small>持有${Math.max(0, state.totalMonths - house.boughtAt)}个月</small></div>
        <dl><div><dt>当前市值</dt><dd>${money(house.marketValue)}</dd></div>
        <div><dt>剩余贷款</dt><dd>${money(house.mortgageBalance)}</dd></div>
        <div><dt>房产净值</dt><dd>${money(equity)}</dd></div>
        <div><dt>当前月供</dt><dd>${money(state.assets.mortgage)}</dd></div></dl></section>
        <div class="property-actions"><button data-property-repay="part">提前还款1万</button>
        <button data-property-repay="all">结清贷款</button>
        <button class="sell" data-property-sell>出售房产</button></div>`;
    }
    const list = C.houses.map((item, index) => {
      const cash = Math.round(item.price * 0.32);
      return `<article class="property-row"><div><strong>${item.name}</strong>
        <span>总价 ${money(item.price)} · 舒适 +${item.comfort}</span>
        <small>首付与税费 ${money(cash)}</small></div>
        <button data-property-buy="${index}">购买</button></article>`;
    }).join('');
    return `<p class="property-empty">当前没有不动产，可使用30%首付贷款购入。</p>${list}`;
  }

  Game.propertySystem = Object.freeze({ ensure, buy, sell, repay, monthly, render });
}(window));
