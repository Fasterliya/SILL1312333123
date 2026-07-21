(function initConventionProgression(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const rebrandCost = 60000;
  const focuses = Object.freeze([
    {
      id: 'balanced', name: '综合会展', summary: '质量、安全、宣传均衡',
      prepIds: [], partnerIds: [],
    },
    {
      id: 'community', name: '同人生态', summary: '同人筹备与社团合作 +4',
      prepIds: ['program-market', 'promotion-community'],
      partnerIds: ['community-alliance', 'creator-panel'],
    },
    {
      id: 'stage', name: '舞台演出', summary: '舞台筹备与演出合作 +4',
      prepIds: ['program-stage', 'promotion-broad'],
      partnerIds: ['platform-title', 'voice-cast'],
    },
    {
      id: 'cosplay', name: 'COS 文化', summary: '主题展与 Coser 合作 +4',
      prepIds: ['venue-premium', 'safety-full'],
      partnerIds: ['featured-coser'],
    },
  ]);
  const scaleThresholds = Object.freeze({ 地区级: 0, 标准: 8, 大型: 22, 国际级: 45 });
  function ensure(item) {
    const data = item.conventionProgression && typeof item.conventionProgression === 'object'
      ? item.conventionProgression : {};
    data.focusId = focuses.some((focus) => focus.id === data.focusId) ? data.focusId : 'balanced';
    data.completedEvents = Math.max(0, Math.round(Number(data.completedEvents) || 0));
    data.partnerRelations = data.partnerRelations && typeof data.partnerRelations === 'object'
      ? data.partnerRelations : {};
    data.focusChangedAt = Number.isFinite(data.focusChangedAt) ? data.focusChangedAt : null;
    item.conventionProgression = data;
    return data;
  }
  function focus(item) {
    const data = ensure(item);
    return focuses.find((entry) => entry.id === data.focusId) || focuses[0];
  }
  function tier(item) {
    const reputation = Math.max(0, Number(item.conventionReputation) || 0);
    if (reputation >= 60) return { id: 'international', name: '国际会展品牌', next: 100 };
    if (reputation >= 35) return { id: 'national', name: '全国会展品牌', next: 60 };
    if (reputation >= 15) return { id: 'regional', name: '地区会展品牌', next: 35 };
    return { id: 'rising', name: '新锐承办团队', next: 15 };
  }
  function model(item, totalMonths) {
    const data = ensure(item);
    const currentMonth = Number.isFinite(Number(totalMonths)) ? Number(totalMonths) : 0;
    const elapsed = data.focusChangedAt === null ? 12 : currentMonth - data.focusChangedAt;
    const remaining = Math.max(0, 12 - elapsed);
    const firstChoice = data.focusChangedAt === null && data.completedEvents === 0;
    return {
      data, focus: focus(item), tier: tier(item), focuses,
      remaining, canChange: remaining === 0, changeCost: firstChoice ? 0 : rebrandCost,
    };
  }
  function activeContract(state, item) {
    return Object.keys(state.conventionCalendar?.contracts || {}).some((editionId) => {
      const event = Game.conventionCalendar.find(state, editionId);
      return event?.organizer?.companyId === item.id
        && Game.conventionCalendar.status(state, event).id !== 'ended';
    });
  }
  function setFocus(state, companyId, focusId) {
    const item = (state.companies || []).find((entry) => entry.id === companyId);
    const target = focuses.find((entry) => entry.id === focusId);
    const licensed = item?.conventionLicense || item?.businessLines?.includes('convention');
    if (!licensed || !target) return { ok: false, message: '公司没有漫展品牌调整权限' };
    const progress = model(item, state.totalMonths);
    if (progress.focus.id === target.id) return { ok: false, message: '公司已经采用这一品牌定位' };
    if (activeContract(state, item)) return { ok: false, message: '承办项目结束前不能调整品牌定位' };
    if (!progress.canChange) return { ok: false, message: `品牌定位还需${progress.remaining}个月才能调整` };
    if (state.money < progress.changeCost) {
      return { ok: false, message: `品牌重塑需要${Game.view.money(progress.changeCost)}` };
    }
    if (progress.changeCost) Game.economy.spend(state, progress.changeCost);
    progress.data.focusId = target.id;
    progress.data.focusChangedAt = state.totalMonths;
    return { ok: true, message: `${item.name}确立“${target.name}”定位` };
  }
  function partnerRelation(item, offerId) {
    return Math.max(0, Math.round(Number(ensure(item).partnerRelations[offerId]) || 0));
  }
  function partnerContext(item, offerId) {
    const relation = Math.min(3, partnerRelation(item, offerId)) * 2;
    const fit = focus(item).partnerIds.includes(offerId) ? 4 : 0;
    return relation + fit;
  }
  function preparationContext(item, optionId) {
    return focus(item).prepIds.includes(optionId) ? 4 : 0;
  }
  function bidAccess(item, event) {
    const data = ensure(item);
    const standing = (Number(item.conventionReputation) || 0) + data.completedEvents * 4;
    const threshold = scaleThresholds[event.scale] ?? 8;
    const gap = Math.max(0, threshold - standing);
    const penalty = Math.min(18, Math.ceil(gap / 5) * 3);
    return {
      threshold, standing: Math.round(standing), penalty, unlocked: gap === 0,
      label: gap ? `越级竞标 · 难度+${penalty}` : `${event.scale}资历匹配`,
    };
  }
  function audienceImpact(item, event, prep) {
    if (!item) return { score: 0, strength: '', concern: '' };
    const selected = focus(item);
    const decisions = (prep.decisions || []).map((entry) => String(entry.id));
    const partners = [...(prep.sponsors || []), ...(prep.guests || [])].map((entry) => entry.id);
    if (selected.id === 'balanced') {
      const values = [prep.quality, prep.safety, prep.promotion];
      const aligned = Math.min(...values) >= 60 && Math.max(...values) - Math.min(...values) <= 15;
      return aligned
        ? { score: 2, strength: '综合会展定位保持均衡', concern: '' }
        : { score: 0, strength: '', concern: '' };
    }
    const prepared = selected.prepIds.some((id) => decisions.some((entry) => entry.endsWith(`:${id}`)));
    const partnered = selected.partnerIds.some((id) => partners.includes(id));
    const themed = selected.id === 'cosplay' && event.kind === 'only';
    const score = (prepared ? 2 : 0) + (partnered ? 2 : 0) + (themed ? 1 : 0);
    return score >= 2
      ? { score, strength: `${selected.name}定位形成稳定辨识度`, concern: '' }
      : { score: -2, strength: '', concern: `${selected.name}定位与本届配置脱节` };
  }
  function recordSettlement(item, event, prep, result) {
    const data = ensure(item);
    data.completedEvents += 1;
    data.lastEditionId = event.id;
    data.lastAudienceScore = result.audienceScore;
    data.bestAudienceScore = Math.max(Number(data.bestAudienceScore) || 0, result.audienceScore || 0);
    [...(prep.sponsors || []), ...(prep.guests || [])].forEach((partner) => {
      data.partnerRelations[partner.id] = Math.min(9, partnerRelation(item, partner.id) + 1);
    });
  }

  Game.conventionProgression = Object.freeze({
    rebrandCost, focuses, ensure, focus, tier, model, setFocus,
    activeContract, partnerRelation, partnerContext, preparationContext,
    bidAccess, audienceImpact, recordSettlement,
  });
}(window));
