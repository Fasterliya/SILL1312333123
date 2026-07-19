(function initCompanyMarket(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const TOTAL_SHARES = 100000;
  const HOLDING_CAP = 0.1;
  const BOARD_LINE = 0.05;

  const round = (value) => Math.round(value * 100) / 100;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  function initial(company, index) {
    const base = 12 + (index % 9) * 5 + (company.industry === '科技' ? 16 : 0);
    const history = Array.from({ length: 12 }, (_, offset) => (
      round(base * (0.88 + offset * 0.012 + ((index + offset) % 3) * 0.015))
    ));
    return {
      companyId: company.id, price: history.at(-1), previous: history.at(-2), shares: 0,
      basePrice: base, baselineRevenue: 8000000 + (index % 11) * 2400000, outlook: 0,
      totalShares: TOTAL_SHARES, availableShares: 18000 + (index % 8) * 1700,
      revenue: 8000000 + (index % 11) * 2400000, profit: 900000 + (index % 7) * 280000,
      growth: (index % 9) - 3, risk: 3 + (index % 6), dividendRate: 0.012 + (index % 4) * 0.004,
      history, boardIds: [], lastDividend: 0,
    };
  }

  function validRecord(value) {
    return value && typeof value.companyId === 'string' && Number.isFinite(value.price)
      && Number.isFinite(value.shares) && Array.isArray(value.history);
  }

  function normalize(source, company, index) {
    const fallback = initial(company, index);
    const record = validRecord(source) ? source : fallback;
    record.companyId = company.id;
    record.totalShares = TOTAL_SHARES;
    record.basePrice = round(clamp(finite(record.basePrice, fallback.basePrice), 1.5, 500));
    record.baselineRevenue = Math.max(500000, Math.round(finite(
      record.baselineRevenue, fallback.baselineRevenue,
    )));
    record.outlook = round(clamp(finite(record.outlook, 0), -25, 35));
    record.price = round(clamp(finite(record.price, fallback.price),
      record.basePrice * 0.45, record.basePrice * 1.8));
    record.previous = round(clamp(finite(record.previous, record.price),
      record.basePrice * 0.45, record.basePrice * 1.8));
    record.shares = clamp(Math.floor(finite(record.shares, 0)), 0, TOTAL_SHARES * HOLDING_CAP);
    record.availableShares = clamp(
      Math.floor(finite(record.availableShares, fallback.availableShares)),
      0,
      TOTAL_SHARES - record.shares,
    );
    record.revenue = Math.round(clamp(finite(record.revenue, fallback.revenue),
      record.baselineRevenue * 0.45, record.baselineRevenue * 1.8));
    record.profit = Math.round(clamp(finite(record.profit, fallback.profit),
      -record.revenue * 0.08, record.revenue * 0.24));
    record.growth = round(clamp(finite(record.growth, fallback.growth), -12, 14));
    record.risk = round(clamp(finite(record.risk, fallback.risk), 1, 10));
    record.dividendRate = clamp(finite(record.dividendRate, fallback.dividendRate), 0, 0.2);
    record.history = record.history.map(Number).filter(Number.isFinite).map((value) => (
      round(clamp(value, record.basePrice * 0.4, record.basePrice * 1.8))
    )).slice(-24);
    if (!record.history.length) record.history = [record.price];
    record.boardIds = Array.isArray(record.boardIds)
      ? [...new Set(record.boardIds.filter((id) => typeof id === 'string'))].slice(0, 5) : [];
    record.lastDividend = Math.max(0, Math.round(finite(record.lastDividend, 0)));
    return record;
  }

  function ensure(state) {
    state.assets ||= {};
    const previous = state.assets.stocks && typeof state.assets.stocks === 'object' ? state.assets.stocks : {};
    const ids = new Set(Game.config.companies.map((company) => company.id));
    const legacyValue = Object.entries(previous).filter(([id, stock]) => !ids.has(id) && stock)
      .reduce((sum, [, stock]) => sum + (Number(stock.price) || 0) * (Number(stock.shares) || 0), 0);
    state.money = finite(state.money, 0);
    if (legacyValue > 0) state.money += Math.round(legacyValue);
    const next = {};
    Game.config.companies.forEach((company, index) => {
      next[company.id] = normalize(previous[company.id], company, index);
    });
    state.assets.stocks = next;
    state.assets.dividends = Math.max(0, Number(state.assets.dividends) || 0);
    return next;
  }

  function record(state, companyId) {
    ensure(state);
    return state.assets.stocks[companyId] || null;
  }

  function ownership(stock) {
    return stock ? stock.shares / stock.totalShares : 0;
  }

  function isDirector(stock) {
    return ownership(stock) >= BOARD_LINE;
  }

  function trade(state, companyId, mode, lot) {
    const stock = record(state, companyId);
    const company = Game.companyCatalog.find(companyId);
    if (!stock || !company) return { ok: false, message: '公司股票不存在' };
    const amount = [100, 500, 1000].includes(lot) ? lot : 100;
    const value = Math.round(stock.price * amount);
    if (mode === 'buy') {
      if (stock.availableShares < amount) return { ok: false, message: '当前卖盘不足，需要等待其他股东抛售' };
      if (stock.shares + amount > stock.totalShares * HOLDING_CAP) return { ok: false, message: '单个玩家最多持有公司10%股份' };
      if (state.money < value) return { ok: false, message: `买入需要 ${Game.view.money(value)}` };
      state.money -= value;
      stock.shares += amount;
      stock.availableShares -= amount;
    } else {
      if (stock.shares < amount) return { ok: false, message: '持仓不足' };
      state.money += value;
      stock.shares -= amount;
      stock.availableShares = Math.min(stock.totalShares, stock.availableShares + amount);
    }
    const percent = (ownership(stock) * 100).toFixed(2);
    return { ok: true, message: `${mode === 'buy' ? '买入' : '卖出'}${company.name} ${amount}股，持股${percent}%` };
  }

  function updateRecord(stock) {
    stock.previous = stock.price;
    const operating = (Math.random() - 0.5) * stock.risk * 1.4;
    stock.growth = round(clamp(stock.growth * 0.62 + operating, -12, 14));
    stock.outlook = round(clamp(stock.outlook * 0.94 + stock.growth * 0.12
      + (Math.random() - 0.5) * 1.5, -25, 35));
    const targetRevenue = stock.baselineRevenue * (1 + stock.outlook / 100 * 0.6);
    const revenueMove = clamp((targetRevenue - stock.revenue) / stock.baselineRevenue * 0.035
      + stock.growth / 2400, -0.012, 0.012);
    stock.revenue = Math.max(500000, Math.round(stock.revenue * (1 + revenueMove)));
    const targetMargin = 0.08 + (10 - stock.risk) * 0.008;
    const currentMargin = stock.profit / Math.max(1, stock.revenue);
    const margin = clamp(currentMargin * 0.78 + targetMargin * 0.22
      + (Math.random() - 0.5) * 0.018, -0.08, 0.24);
    stock.profit = Math.round(stock.revenue * margin);
    const fairPrice = stock.basePrice * (1 + stock.outlook / 100);
    const reversion = clamp((fairPrice - stock.price) / Math.max(1, stock.price) * 0.14, -0.045, 0.045);
    const sentiment = stock.growth / 1400 + (margin - targetMargin) / 14
      + (Math.random() - 0.5) * 0.055;
    const priceMove = clamp(reversion + sentiment, -0.065, 0.065);
    stock.price = round(clamp(stock.price * (1 + priceMove),
      stock.basePrice * 0.4, stock.basePrice * 1.75));
    const flow = Math.round((Math.random() - 0.48) * stock.totalShares * 0.008);
    stock.availableShares = clamp(stock.availableShares + flow, 0, stock.totalShares - stock.shares);
    stock.history.push(stock.price);
    stock.history = stock.history.slice(-24);
  }

  function monthly(state) {
    ensure(state);
    let dividend = 0;
    Object.values(state.assets.stocks).forEach((stock) => {
      updateRecord(stock);
      stock.lastDividend = 0;
      if (state.totalMonths % 3 === 0 && stock.profit > 0 && stock.shares > 0) {
        stock.lastDividend = Math.round(stock.shares * stock.price * stock.dividendRate / 4);
        dividend += stock.lastDividend;
      }
    });
    if (dividend > 0) {
      state.money += dividend;
      state.assets.dividends += dividend;
      Game.lifeDirector.addLog(state, '季度股份分红', `你的公司持股带来 ${Game.view.money(dividend)} 分红。`, 'good');
    }
  }

  function portfolio(state) {
    ensure(state);
    return Object.values(state.assets.stocks).reduce((sum, stock) => sum + stock.price * stock.shares, 0);
  }

  Game.companyMarket = Object.freeze({
    ensure, record, trade, monthly, portfolio, ownership, isDirector,
    totalShares: TOTAL_SHARES, holdingCap: HOLDING_CAP, boardLine: BOARD_LINE,
  });
}(window));
