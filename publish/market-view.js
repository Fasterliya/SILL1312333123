(function initMarketView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let filter = 'all';
  let api = null;

  const money = (value) => `¥${Math.round(value).toLocaleString()}`;
  const percent = (value) => `${(value * 100).toFixed(2)}%`;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function records(state) {
    Game.companyMarket.ensure(state);
    return Game.config.companies.map((company) => ({
      company, stock: state.assets.stocks[company.id],
    })).filter(({ company, stock }) => (
      filter === 'all'
      || (filter === 'holding' && stock.shares > 0)
      || (filter === 'board' && Game.companyMarket.isDirector(stock))
      || (filter === 'city' && company.city === state.location.city)
      || company.industry === filter
    ));
  }

  function card(company, stock) {
    const delta = stock.price - stock.previous;
    return `<article class="market-card">
      <button class="market-main" type="button" data-company-stock="${company.id}">
        <span>${escape(company.city)} · ${escape(company.industry)}</span><strong>${escape(company.name)}</strong>
        <small>营收 ${money(stock.revenue)} · 利润 ${money(stock.profit)} · 流通 ${stock.availableShares.toLocaleString()}股</small>
      </button><div class="market-quote"><strong class="${delta >= 0 ? 'up' : 'down'}">¥${stock.price.toFixed(2)}</strong>
      <span>${delta >= 0 ? '+' : ''}${delta.toFixed(2)}</span><small>持股 ${percent(Game.companyMarket.ownership(stock))}</small></div>
      <div class="market-actions"><button data-stock-company="${company.id}" data-trade="buy" data-lot="100">买100</button>
      <button data-stock-company="${company.id}" data-trade="sell" data-lot="100">卖100</button></div></article>`;
  }

  function render(state) {
    const list = records(state);
    const industries = [...new Set(Game.config.companies.map((company) => company.industry))];
    const filters = [
      ['all', '全部'], ['city', '本地公司'], ['holding', '我的持仓'], ['board', '董事席位'],
      ...industries.map((item) => [item, item]),
    ];
    const boardSeats = Object.values(state.assets.stocks).filter(Game.companyMarket.isDirector).length;
    return `<section class="market-summary"><div><span>股票资产</span>
      <strong>${money(Game.companyMarket.portfolio(state))}</strong></div><div><span>累计分红</span>
      <strong>${money(state.assets.dividends)}</strong></div><small>上市公司 ${Game.config.companies.length} 家
      · 当前筛选 ${list.length} 家 · 董事席位 ${boardSeats} · 单家公司持股上限10%</small></section>
      <nav class="filter-chips market-filters">${filters.map(([id, label]) => (
        `<button class="${filter === id ? 'active' : ''}" data-market-filter="${escape(id)}">${escape(label)}</button>`
      )).join('')}</nav><div class="market-list">${list.length
      ? list.map(({ company, stock }) => card(company, stock)).join('')
      : '<p class="empty-state">当前筛选没有公司。</p>'}</div>`;
  }

  function chart(stock) {
    const values = stock.history.length ? stock.history : [stock.price];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(0.01, max - min);
    const points = values.map((value, index) => {
      const x = values.length === 1 ? 150 : index / (values.length - 1) * 300;
      const y = 100 - (value - min) / range * 88;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg class="stock-chart" viewBox="0 0 300 112" role="img" aria-label="最近${values.length}个月股价折线图">
      <line x1="0" y1="100" x2="300" y2="100"></line><polyline points="${points}"></polyline></svg>`;
  }

  function openDetail(state, companyId) {
    const company = Game.companyCatalog.find(companyId);
    const stock = Game.companyMarket.record(state, companyId);
    if (!company || !stock) return;
    const board = Game.boardSystem.render(state, companyId);
    api?.save();
    const facts = [
      ['当前股价', `¥${stock.price.toFixed(2)}`], ['本月变动', `${(stock.price - stock.previous).toFixed(2)}`],
      ['月营收', money(stock.revenue)], ['月利润', money(stock.profit)],
      ['经营增长', `${stock.growth.toFixed(1)}%`], ['经营风险', `${stock.risk}/10`],
      ['市场卖盘', `${stock.availableShares.toLocaleString()}股`], ['总股本', `${stock.totalShares.toLocaleString()}股`],
      ['我的持仓', `${stock.shares.toLocaleString()}股`], ['持股比例', percent(Game.companyMarket.ownership(stock))],
      ['季度分红', money(stock.lastDividend)], ['董事门槛', '持股5%'],
    ];
    const trade = [100, 500, 1000].map((lot) => (
      `<button data-stock-company="${companyId}" data-trade="buy" data-lot="${lot}">买入${lot}</button>`
    )).join('') + [100, 500, 1000].map((lot) => (
      `<button data-stock-company="${companyId}" data-trade="sell" data-lot="${lot}">卖出${lot}</button>`
    )).join('');
    Game.navigation.openDetail(company.name, `<section class="company-stock-head"><span>${company.city} · ${company.industry}</span>
      <h3>${company.name}</h3><strong>¥${stock.price.toFixed(2)}</strong></section>${chart(stock)}
      <section class="detail-facts">${facts.map(([label, value]) => (
        `<div><span>${label}</span><strong>${value}</strong></div>`)).join('')}</section>
      <div class="stock-trade-grid">${trade}</div>${board}`, 'stock');
  }

  function setFilter(value) { filter = value; }
  function configure(options) { api = options; }

  Game.marketView = Object.freeze({ configure, render, openDetail, setFilter });
}(window));
