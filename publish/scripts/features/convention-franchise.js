(function initConventionFranchise(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const names = Object.freeze({
    华夏: '华夏次元文化祭',
    日本: '日本创作文化祭',
    韩国: '韩国次元庆典',
    新加坡: '狮城流行文化节',
    法国: '法兰西幻想文化节',
    英国: '英伦流行文化展',
    美国: '全美流行文化博览会',
  });
  const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  function ensure(state, country) {
    const calendar = Game.conventionCalendar.ensure(state);
    calendar.franchises = calendar.franchises && typeof calendar.franchises === 'object'
      ? calendar.franchises : {};
    if (!calendar.franchises[country]) {
      calendar.franchises[country] = {
        version: 1, country, name: names[country] || `${country}年度次元文化祭`,
        foundedYear: Math.max(1, (Number(state.year) || 1) - 4),
        fanbase: 30, prestige: 50, settledEditions: 0,
        incumbentCompanyId: '', organizerStreak: 0, history: [],
      };
    }
    const data = calendar.franchises[country];
    const currentYear = Math.max(1, Math.round(Number(state.year) || 1));
    data.name = typeof data.name === 'string' && data.name ? data.name : (names[country] || `${country}年度次元文化祭`);
    data.foundedYear = Number.isFinite(Number(data.foundedYear))
      ? Math.max(1, Math.round(Number(data.foundedYear))) : Math.max(1, currentYear - 4);
    data.fanbase = clamp(data.fanbase);
    data.prestige = clamp(data.prestige);
    data.settledEditions = Math.max(0, Math.round(Number(data.settledEditions) || 0));
    data.organizerStreak = Math.max(0, Math.round(Number(data.organizerStreak) || 0));
    data.incumbentCompanyId = typeof data.incumbentCompanyId === 'string' ? data.incumbentCompanyId : '';
    data.history = Array.isArray(data.history) ? data.history : [];
    return data;
  }
  function decorate(state, event) {
    const data = ensure(state, event.country);
    const editionNumber = Math.max(1, event.year - data.foundedYear + 1);
    event.brandName = data.name;
    event.editionNumber = editionNumber;
    event.name = `${data.name} · ${event.themeName}`;
    event.franchise = {
      fanbase: data.fanbase, prestige: data.prestige,
      settledEditions: data.settledEditions, incumbentCompanyId: data.incumbentCompanyId || '',
      organizerStreak: data.organizerStreak, editionNumber,
    };
    return event;
  }
  function attendanceFactor(state, event) {
    return 0.9 + ensure(state, event.country).fanbase / 300;
  }
  function bidContext(state, item, event) {
    const data = ensure(state, event.country);
    if (data.incumbentCompanyId !== item.id) return 0;
    const streak = Math.min(3, data.organizerStreak) * 2;
    return streak + (Number(data.lastAudienceScore) >= 72 ? 2 : 0);
  }
  function bidLabel(state, item, event) {
    const bonus = bidContext(state, item, event);
    return bonus ? `卫冕承办加成+${bonus}` : '';
  }
  function fanDelta(score) {
    if (score >= 85) return 10;
    if (score >= 72) return 6;
    if (score >= 60) return 2;
    if (score >= 45) return -3;
    return -8;
  }
  function recordSettlement(state, event, result) {
    const data = ensure(state, event.country);
    if (data.lastSettlementId === event.id) return data;
    const sameOrganizer = data.incumbentCompanyId === result.companyId
      && Number(data.lastSettlementYear) === event.year - 1;
    data.organizerStreak = sameOrganizer ? data.organizerStreak + 1 : 1;
    data.incumbentCompanyId = result.companyId;
    data.lastSettlementYear = event.year;
    data.lastSettlementId = event.id;
    data.lastAudienceScore = result.audienceScore;
    data.fanbase = clamp(data.fanbase + fanDelta(result.audienceScore));
    data.prestige = clamp(data.prestige * 0.65 + result.audienceScore * 0.35);
    data.settledEditions += 1;
    data.history.unshift({
      editionId: event.id, year: event.year, companyId: result.companyId,
      audienceScore: result.audienceScore, attendance: result.attendance,
    });
    data.history = data.history.slice(0, 12);
    return data;
  }

  Game.conventionFranchise = Object.freeze({
    ensure, decorate, attendanceFactor, bidContext, bidLabel, recordSettlement,
  });
}(window));
