(function initConventionCompanySettlement(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const attendanceBase = Object.freeze({
    国际级: 14000, 大型: 9000, 标准: 5500, 地区级: 3000,
  });
  const contractBase = Object.freeze({
    国际级: 400000, 大型: 280000, 标准: 190000, 地区级: 140000,
  });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  function hash(value) {
    return [...String(value)].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }
  function stageCount(prep) {
    const stages = new Set((prep.decisions || []).map((entry) => String(entry.id).split(':')[0]));
    return Game.conventionCatalog.prepStages.filter((stage) => stages.has(stage.id)).length;
  }
  function incidentFor(event, prep, completed, operationMissing) {
    const crowding = Math.max(0, prep.promotion - prep.safety);
    const chance = clamp(8 + crowding * 0.7 + (4 - completed) * 9
      + operationMissing * 7 + Math.max(0, 50 - prep.safety) * 0.35, 3, 75);
    const roll = hash(
      `${event.id}:${prep.quality}:${prep.safety}:${prep.promotion}:${operationMissing}`,
    ) % 100;
    if (roll >= chance) return { chance: Math.round(chance), roll, incident: null };
    const major = prep.safety < 35 || roll < chance * 0.22;
    return {
      chance: Math.round(chance), roll,
      incident: {
        id: major ? 'major-crowd-incident' : 'minor-site-incident',
        name: major ? '严重现场事故' : '轻微现场事故',
        rate: major ? 0.22 : 0.08,
      },
    };
  }
  function preview(state, event) {
    const prep = Game.conventionCalendar.preparation(state, event);
    const completed = stageCount(prep);
    const completion = completed / Game.conventionCatalog.prepStages.length;
    const operationCount = prep.operations.decisions.length;
    const onsite = ['ongoing', 'ended'].includes(Game.conventionCalendar.status(state, event).id);
    const operationMissing = onsite
      ? Math.max(0, Game.conventionCatalog.operationPhases.length - operationCount) : 0;
    const operationScore = operationCount
      ? Math.round(prep.operations.score / operationCount) : 0;
    const appeal = 0.55 + prep.quality / 200 + prep.promotion / 250;
    const themeFactor = event.kind === 'only' ? 0.78 : 1;
    const franchiseFactor = Game.conventionFranchise?.attendanceFactor(state, event) || 1;
    const guestDraw = prep.guests.reduce((sum, item) => sum + (Number(item.draw) || 0), 0);
    const attendance = Math.max(300, Math.round(
      (attendanceBase[event.scale] || 4000) * appeal * (0.65 + completion * 0.35)
      * themeFactor * franchiseFactor,
    ) + guestDraw);
    const ticketRevenue = Math.round(attendance * event.ticketPrice * 0.08);
    const boothRevenue = Math.round(attendance * (event.kind === 'only' ? 16 : 12));
    const sponsorBoost = prep.sponsors.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const sponsorRevenue = Math.round(attendance * (2 + prep.promotion * 0.06) + sponsorBoost);
    const contractRevenue = Math.round(
      (contractBase[event.scale] || 160000) * (0.7 + completion * 0.3),
    );
    const grossRevenue = contractRevenue + ticketRevenue + boothRevenue + sponsorRevenue;
    const risk = incidentFor(event, prep, completed, operationMissing);
    const audience = Game.conventionAudienceFeedback?.evaluate(state, event, {
      operationCount, operationScore, incident: risk.incident,
    });
    const incidentCost = risk.incident ? Math.round(grossRevenue * risk.incident.rate) : 0;
    const emergencyCost = (Game.conventionCatalog.prepStages.length - completed) * 60000;
    const operationCost = operationMissing * 40000;
    const forecastProfit = grossRevenue - emergencyCost - operationCost
      - prep.budget - Game.conventionCompany.bidCost;
    const payout = grossRevenue - incidentCost - emergencyCost - operationCost;
    const projectProfit = payout - prep.budget - Game.conventionCompany.bidCost;
    let reputationDelta = risk.incident ? (risk.incident.rate > 0.1 ? -8 : -3)
      : (prep.quality >= 80 ? 8 : (prep.quality >= 65 ? 5 : 2));
    reputationDelta -= (4 - completed) * 2;
    reputationDelta -= operationMissing * 2;
    if (operationCount === 3 && operationScore >= 70) reputationDelta += 2;
    reputationDelta += audience?.reputationDelta || 0;
    if (projectProfit < 0) reputationDelta -= 1;
    return {
      editionId: event.id, eventName: event.name, companyId: event.organizer.companyId,
      year: event.year, month: event.month, attendance, completedStages: completed,
      contractRevenue, ticketRevenue, boothRevenue, sponsorRevenue, grossRevenue, incidentCost,
      emergencyCost, operationCost, operationCount, operationScore,
      payout, prepBudget: prep.budget, forecastProfit, projectProfit, reputationDelta,
      quality: prep.quality, safety: prep.safety, promotion: prep.promotion,
      incidentChance: risk.chance, incident: risk.incident,
      franchiseFactor, franchiseFanbase: event.franchise?.fanbase,
      audienceScore: audience?.score, audienceLabel: audience?.label,
      audienceStrengths: audience?.strengths || [], audienceConcerns: audience?.concerns || [],
      audienceSampleUsed: Boolean(audience?.sampleUsed),
    };
  }
  function settle(state, event) {
    const data = Game.conventionCalendar.ensure(state);
    if (data.settlements[event.id]) return data.settlements[event.id];
    const item = (state.companies || []).find((entry) => entry.id === event.organizer.companyId);
    if (!item) {
      data.settlements[event.id] = {
        editionId: event.id, companyId: event.organizer.companyId,
        eventName: event.name, status: 'transferred', payout: 0, settledAt: state.totalMonths,
      };
      return data.settlements[event.id];
    }
    const result = { ...preview(state, event), status: 'completed', settledAt: state.totalMonths };
    data.settlements[event.id] = result;
    state.money += result.payout;
    item.conventionReputation = clamp(
      (item.conventionReputation || 0) + result.reputationDelta, 0, 100,
    );
    item.conventionAudienceScore = Number.isFinite(item.conventionAudienceScore)
      ? Math.round(item.conventionAudienceScore * 0.65 + result.audienceScore * 0.35)
      : result.audienceScore;
    Game.conventionProgression?.recordSettlement(
      item, event, Game.conventionCalendar.preparation(state, event), result,
    );
    const franchise = Game.conventionFranchise?.recordSettlement(state, event, result);
    result.franchiseFanbase = franchise?.fanbase;
    result.franchisePrestige = franchise?.prestige;
    result.organizerStreak = franchise?.organizerStreak;
    item.events = Array.isArray(item.events) ? item.events : [];
    const incident = result.incident ? `，${result.incident.name}造成损失` : '，现场秩序稳定';
    item.events.push({
      id: `convention-${event.id}`, title: '漫展项目结算',
      desc: `${event.name}接待${result.attendance}人，观众评价${result.audienceScore}，`
        + `项目利润${Game.view.money(result.projectProfit)}${incident}`,
      severity: result.reputationDelta >= 0 ? 'positive' : 'negative', month: state.totalMonths,
    });
    item.events = item.events.slice(-20);
    Game.characterAttributes.gain(state, '管理', 0.8, '漫展项目结算');
    Game.lifeDirector.addLog(state, '漫展承办结算',
      `${item.name}完成${event.name}，结算现金流${Game.view.money(result.payout)}，`
      + `项目利润${Game.view.money(result.projectProfit)}，观众评价${result.audienceLabel}${incident}。`,
      result.reputationDelta >= 0 ? 'good' : 'normal');
    return result;
  }
  function monthly(state) {
    const data = Game.conventionCalendar.ensure(state);
    const results = [];
    Object.keys(data.contracts).forEach((editionId) => {
      if (data.settlements[editionId]) return;
      const event = Game.conventionCalendar.find(state, editionId);
      if (event && Game.conventionCalendar.status(state, event).id === 'ended') {
        results.push(settle(state, event));
      }
    });
    return results;
  }
  function recent(state, companyId) {
    return Object.values(Game.conventionCalendar.ensure(state).settlements)
      .filter((entry) => entry.companyId === companyId && entry.status === 'completed')
      .sort((left, right) => right.settledAt - left.settledAt).slice(0, 4);
  }

  Game.conventionCompanySettlement = Object.freeze({
    preview, settle, monthly, recent, stageCount,
  });
}(window));
