(function initConventionCompany(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const licenseCost = 120000;
  const bidCost = 20000;
  function company(state, id) {
    return (state.companies || []).find((item) => item.id === id) || null;
  }
  function licensed(item) {
    return Boolean(item?.conventionLicense || item?.businessLines?.includes('convention'));
  }
  function qualify(state, companyId) {
    const item = company(state, companyId);
    if (!item || item.industry !== '娱乐') return { ok: false, message: '只有娱乐公司可以开设漫展业务' };
    if (licensed(item)) return { ok: false, message: '公司已经取得漫展会展资质' };
    if (state.money < licenseCost) return { ok: false, message: `开设会展业务需要${Game.view.money(licenseCost)}` };
    Game.economy.spend(state, licenseCost);
    item.conventionLicense = true;
    item.businessLines = [...new Set([...(item.businessLines || []), 'convention'])];
    item.conventionBase = { ...state.location };
    item.conventionReputation = Math.max(0, Number(item.conventionReputation) || 0);
    Game.conventionProgression?.ensure(item);
    return { ok: true, message: `${item.name}取得漫展会展资质` };
  }
  function eventsFor(state, item) {
    if (!licensed(item)) return [];
    const country = item.conventionBase?.country || state.location.country;
    return [state.year, state.year + 1].flatMap((year) => (
      Game.conventionCalendar.list(state, year)
    )).filter((event) => event.country === country);
  }
  function bid(state, editionId, companyId, strategy) {
    const item = company(state, companyId);
    const event = Game.conventionCalendar.find(state, editionId);
    if (!item || !event || !licensed(item)) return { ok: false, message: '公司没有该漫展的投标资格' };
    if ((item.conventionBase?.country || state.location.country) !== event.country) {
      return { ok: false, message: '当前业务基地不能承办这个国家的漫展' };
    }
    if (event.year < state.year || event.year > state.year + 1) {
      return { ok: false, message: '当前只开放本年度与下一年度漫展投标' };
    }
    if (Game.conventionCalendar.status(state, event).id !== 'announced') {
      return { ok: false, message: '本届承办公司已经锁定' };
    }
    const data = Game.conventionCalendar.ensure(state);
    const key = `${editionId}:${companyId}`;
    if (data.contracts[editionId]) return { ok: false, message: '本届承办合同已经确定' };
    if (data.bids[key]) return { ok: false, message: '本届投标结果已经确定' };
    const bidStrategy = strategy || 'balanced';
    const strategyCost = { conservative: 12000, balanced: 20000, aggressive: 35000 };
    const strategyBonus = { conservative: -8, balanced: 0, aggressive: 10 };
    const strategyRisk = { conservative: '低报价→高利润但低中标率', balanced: '标准方案', aggressive: '激进报价→高投入博高中标率' };
    var actualCost = strategyCost[bidStrategy] || bidCost;
    if (state.money < actualCost) return { ok: false, message: `投标保证金需要${Game.view.money(actualCost)}` };
    Game.economy.spend(state, actualCost);
    var competitors = allCompetitors(state, event, item);
    var competitivePressure = Math.min(24, competitors.length * 4);
    var franchise = Game.conventionFranchise?.bidContext(state, item, event) || 0;
    var streakBonus = (item._conventionStreak || 0) >= 2 ? 6 : (item._conventionStreak || 0) >= 1 ? 3 : 0;
    const access = Game.conventionProgression?.bidAccess(item, event) || { penalty: 0 };
    var context = Math.min(22, Math.round((item.investment || 0) / 50000)
      + (item.employees?.length || 0) * 2 + (item.conventionReputation || 0) / 10
      + franchise + strategyBonus[bidStrategy] + streakBonus);
    const resolution = Game.actionResolver.resolve(state, {
      primary: '管理', secondary: '心计',
      difficulty: 62 + access.penalty + competitivePressure,
      context, variance: 7, label: `${event.name}承办投标(${bidStrategy})`,
    });
    var baseThreshold = 55 + competitivePressure * 0.6;
    const won = resolution.score >= baseThreshold;
    data.bids[key] = {
      companyId, editionId, won, score: resolution.score,
      strategy: bidStrategy, competitors: competitors.length,
      month: state.totalMonths,
    };
    if (!won) {
      item._conventionStreak = 0;
      if (competitors.length > 0) {
        item._competitiveIntel = (item._competitiveIntel || 0) + 1;
      }
      return { ok: false, actionResolution: resolution,
        message: `投标未通过(${competitors.length}家竞争)；${Game.actionResolver.summary(resolution)}` };
    }
    item._conventionStreak = (item._conventionStreak || 0) + 1;
    const assigned = Game.conventionCalendar.assignOrganizer(state, editionId, companyId);
    if (!assigned.ok) return assigned;
    item.conventionReputation += 3;
    var streakMsg = item._conventionStreak >= 3
      ? `连续${item._conventionStreak}届中标，品牌垄断效应显现！` : '';
    return { ok: true, actionResolution: resolution,
      message: `${item.name}获得承办合同${streakMsg ? '；' + streakMsg : ''}；${Game.actionResolver.summary(resolution)}` };
  }

  function allCompetitors(state, event, self) {
    return (state.companies || []).filter(function (item) {
      return item.industry === '娱乐' && item.id !== self.id
        && licensed(item)
        && (item.conventionBase?.country || state.location.country) === event.country
        && item.conventionReputation >= 20;
    });
  }

  function bidModel(state, event, item) {
    if (!event || !item) return null;
    var competitors = allCompetitors(state, event, item);
    var strategies = [
      { id: 'conservative', name: '保守', cost: 12000, hint: '低投入，利润率最高但中标率较低' },
      { id: 'balanced', name: '均衡', cost: 20000, hint: '标准方案，性价比最优' },
      { id: 'aggressive', name: '激进', cost: 35000, hint: '高投入博取高中标率，但利润率最低' },
    ];
    return {
      eventName: event.name, eventScale: event.scale || '标准',
      competitors: competitors.length,
      competitorNames: competitors.slice(0, 3).map(function (c) { return c.name; }),
      strategies: strategies,
      canAfford: strategies.map(function (s) { return state.money >= s.cost; }),
      streak: item._conventionStreak || 0,
      franchiseName: Game.conventionFranchise?.bidLabel(state, item, event) || '',
    };
  }
  function stageDone(prep, stageId) {
    return prep.decisions.some((entry) => String(entry.id).startsWith(`${stageId}:`));
  }
  function nextStage(prep) {
    return Game.conventionCatalog.prepStages.find((stage) => !stageDone(prep, stage.id)) || null;
  }
  function prepare(state, editionId, companyId, optionId) {
    const item = company(state, companyId);
    const event = Game.conventionCalendar.find(state, editionId);
    if (!item || !event || event.organizer.companyId !== companyId) {
      return { ok: false, message: '公司没有这届漫展的筹备权限' };
    }
    if (['ongoing', 'ended'].includes(Game.conventionCalendar.status(state, event).id)) {
      return { ok: false, message: '漫展筹备期已经结束' };
    }
    const stage = Game.conventionCatalog.prepStages.find((entry) => (
      entry.options.some((option) => option.id === optionId)
    ));
    const option = stage?.options.find((entry) => entry.id === optionId);
    const prep = Game.conventionCalendar.preparation(state, event);
    const currentStage = nextStage(prep);
    if (!option || stageDone(prep, stage.id)) return { ok: false, message: '该筹备阶段已经完成' };
    if (currentStage?.id !== stage.id) return { ok: false, message: `请先完成${currentStage?.name || '当前筹备阶段'}` };
    if (state.money < option.cost) return { ok: false, message: `筹备资金需要${Game.view.money(option.cost)}` };
    Game.economy.spend(state, option.cost);
    const resolution = Game.actionResolver.resolve(state, {
      primary: stage.ability, secondary: '管理', difficulty: 55,
      context: Math.min(14, (item.employees?.length || 0)
        + (Game.conventionProgression?.preparationContext(item, option.id) || 0)), variance: 6,
      label: `${event.name}${stage.name}`,
    });
    const patch = { budget: prep.budget + option.cost };
    Object.entries(option.effects).forEach(([key, value]) => {
      patch[key] = prep[key] + Math.round(value * resolution.multiplier);
    });
    Game.conventionCalendar.updatePreparation(
      state, editionId, patch, `${stage.id}:${option.id}`,
    );
    prep.stage = nextStage(prep)?.id || 'ready';
    item.conventionReputation = Math.min(100, (item.conventionReputation || 0) + 1);
    Game.characterAttributes.gain(state, stage.ability, 0.45, `漫展筹备:${stage.id}`);
    return { ok: true, actionResolution: resolution,
      message: `${option.name}完成；${Game.actionResolver.summary(resolution)}` };
  }
  function model(state) {
    const companies = (state.companies || []).filter((item) => item.industry === '娱乐');
    return companies.map((item) => ({
      company: item,
      licensed: licensed(item),
      events: eventsFor(state, item),
      settlements: Game.conventionCompanySettlement?.recent(state, item.id) || [],
    }));
  }

  Game.conventionCompany = Object.freeze({
    licenseCost, bidCost, qualify, bid, prepare, model, nextStage, stageDone,
    bidModel, allCompetitors,
  });
}(window));
