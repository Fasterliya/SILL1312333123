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
    return { ok: true, message: `${item.name}取得漫展会展资质` };
  }
  function eventsFor(state, item) {
    if (!licensed(item)) return [];
    const country = item.conventionBase?.country || state.location.country;
    return [state.year, state.year + 1].flatMap((year) => (
      Game.conventionCalendar.list(state, year)
    )).filter((event) => event.country === country);
  }
  function bid(state, editionId, companyId) {
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
    if (state.money < bidCost) return { ok: false, message: `投标保证金需要${Game.view.money(bidCost)}` };
    Game.economy.spend(state, bidCost);
    const context = Math.min(14, Math.round((item.investment || 0) / 50000)
      + (item.employees?.length || 0) * 2 + (item.conventionReputation || 0) / 10);
    const resolution = Game.actionResolver.resolve(state, {
      primary: '管理', secondary: '心计', difficulty: 62,
      context, variance: 7, label: `${event.name}承办投标`,
    });
    const won = resolution.score >= 55;
    data.bids[key] = {
      companyId, editionId, won, score: resolution.score,
      month: state.totalMonths,
    };
    if (!won) {
      return { ok: false, actionResolution: resolution,
        message: `投标未通过；${Game.actionResolver.summary(resolution)}` };
    }
    const assigned = Game.conventionCalendar.assignOrganizer(state, editionId, companyId);
    if (!assigned.ok) return assigned;
    item.conventionReputation += 3;
    return { ok: true, actionResolution: resolution,
      message: `${item.name}获得承办合同；${Game.actionResolver.summary(resolution)}` };
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
      context: Math.min(10, item.employees?.length || 0), variance: 6,
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
  });
}(window));
