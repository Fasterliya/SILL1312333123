(function initCreatorGrowthActions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const E = Game.creatorEconomy;

  function growthFactor(state) {
    const appeal = 0.75 + U.clamp(state.stats.魅力, 0, 100) / 100;
    return appeal * Game.creatorStyleGrowth.multiplier(state.profile, state.career.jobId);
  }

  function ready(creator, field, month, cooldown) {
    const last = Number.isFinite(creator[field]) ? creator[field] : -cooldown;
    return month - last >= cooldown;
  }

  function collaborate(state) {
    const creator = Game.creatorCareer.ensure(state);
    if (!ready(creator, 'lastCollabMonth', state.totalMonths, 2)) {
      return { ok: false, message: '跨界联动至少间隔2个月' };
    }
    creator.lastCollabMonth = state.totalMonths;
    const base = Math.sqrt(creator.followers) * 3 + creator.followers * 0.025 + 60;
    const gain = Math.max(30, Math.round(base * growthFactor(state)));
    const views = Math.max(200, Math.round(gain * 16 + creator.followers * 0.12));
    const income = E.contentIncome(views, creator.followers, creator.brandTrust, 0.55);
    creator.followers += gain;
    creator.totalViews += views;
    creator.brandTrust = U.clamp(creator.brandTrust + 3, 0, 100);
    state.money += income;
    state.career.performance = U.clamp(state.career.performance + 6, 0, 100);
    state.career.burnout = U.clamp((state.career.burnout || 0) + 5, 0, 100);
    return {
      ok: true,
      message: `跨界联动获得${E.compact(views)}播放，新增${E.compact(gain)}粉丝，收入${Game.view.money(income)}`,
    };
  }

  function chaseTrend(state) {
    const creator = Game.creatorCareer.ensure(state);
    if (!ready(creator, 'lastTrendMonth', state.totalMonths, 1)) {
      return { ok: false, message: '本月已经追过一次热点' };
    }
    creator.lastTrendMonth = state.totalMonths;
    const momentum = 0.75 + Math.random() * 0.7;
    const base = Math.sqrt(creator.followers) * 2.4 + creator.followers * 0.018 + 45;
    const gain = Math.max(20, Math.round(base * growthFactor(state) * momentum));
    const views = Math.max(150, Math.round(gain * (12 + Math.random() * 10)));
    const income = E.contentIncome(views, creator.followers, creator.brandTrust, 0.4);
    creator.followers += gain;
    creator.totalViews += views;
    creator.scandalRisk = U.clamp(creator.scandalRisk + (momentum > 1.2 ? 5 : 3), 0, 100);
    state.money += income;
    state.career.performance = U.clamp(state.career.performance + 4, 0, 100);
    state.career.burnout = U.clamp((state.career.burnout || 0) + 8, 0, 100);
    return {
      ok: true,
      message: `热点挑战获得${E.compact(views)}播放，新增${E.compact(gain)}粉丝，收入${Game.view.money(income)}`,
    };
  }

  function act(state, action) {
    if (!Game.creatorCareer.isCreator(state)) return { ok: false, message: '当前职业没有个人频道' };
    if (action === 'collab') return collaborate(state);
    if (action === 'trend') return chaseTrend(state);
    return { ok: false, message: '未知的频道行动' };
  }

  function buttons() {
    return '<button data-creator-action="collab">跨界联动</button>'
      + '<button data-creator-action="trend">热点挑战</button>';
  }

  Game.creatorGrowthActions = Object.freeze({ act, buttons });
}(window));
