(function initConventionPartners(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const limits = Object.freeze({ sponsor: 1, guest: 1 });
  function company(state, id) {
    return (state.companies || []).find((item) => item.id === id) || null;
  }
  function catalog(type) {
    return type === 'sponsor'
      ? Game.conventionCatalog.sponsorOffers : Game.conventionCatalog.guestOffers;
  }
  function label(event, offer) {
    if (!offer.themed) return offer.name;
    return event.series ? `${event.series}人气 Coser 嘉宾` : offer.name;
  }
  function available(state, editionId, companyId, type) {
    const item = company(state, companyId);
    const event = Game.conventionCalendar.find(state, editionId);
    if (!item || !event || event.organizer.companyId !== companyId) return [];
    const prep = Game.conventionCalendar.preparation(state, event);
    const accepted = type === 'sponsor' ? prep.sponsors : prep.guests;
    const attempts = prep.partnerAttempts[type] || [];
    return catalog(type).map((offer) => ({
      ...offer, name: label(event, offer),
      attempted: attempts.includes(offer.id),
      selected: accepted.some((entry) => entry.id === offer.id),
      categoryFull: accepted.length >= limits[type],
    }));
  }
  function applyEffects(state, event, prep, offer, decision) {
    const patch = { budget: prep.budget };
    Object.entries(offer.effects).forEach(([key, value]) => {
      patch[key] = prep[key] + value;
    });
    return Game.conventionCalendar.updatePreparation(state, event.id, patch, decision);
  }
  function validate(state, event, item, prep, type, offer) {
    if (!item || !event || event.organizer.companyId !== item.id) return '公司没有该漫展的合作洽谈权限';
    if (Game.conventionCompany.nextStage(prep)) return '请先完成四项基础筹备';
    if (['ongoing', 'ended'].includes(Game.conventionCalendar.status(state, event).id)) {
      return '合作洽谈期已经结束';
    }
    const accepted = type === 'sponsor' ? prep.sponsors : prep.guests;
    if (accepted.length >= limits[type]) return type === 'sponsor' ? '本届赞助名额已经确定' : '本届主嘉宾已经确定';
    if (prep.partnerAttempts[type].includes(offer.id)) return '该合作对象已经给出答复';
    if (type === 'guest' && state.money < offer.fee) return `邀请费用需要${Game.view.money(offer.fee)}`;
    return '';
  }
  function negotiate(state, editionId, companyId, type, offerId) {
    if (!['sponsor', 'guest'].includes(type)) return { ok: false, message: '合作类型无效' };
    const item = company(state, companyId);
    const event = Game.conventionCalendar.find(state, editionId);
    const prep = event ? Game.conventionCalendar.preparation(state, event) : null;
    const offer = catalog(type).find((entry) => entry.id === offerId);
    if (!prep || !offer) return { ok: false, message: '合作对象不存在' };
    const failure = validate(state, event, item, prep, type, offer);
    if (failure) return { ok: false, message: failure };
    prep.partnerAttempts[type].push(offer.id);
    const context = Math.min(16, Math.round((item.conventionReputation || 0) / 8)
      + (event.kind === 'only' && offer.themed ? 4 : 0));
    const resolution = Game.actionResolver.resolve(state, {
      primary: offer.primary, secondary: offer.secondary,
      difficulty: offer.difficulty, context, variance: 7,
      label: `${label(event, offer)}洽谈`,
    });
    const success = resolution.score >= 48;
    if (!success) {
      Game.characterAttributes.gain(state, offer.primary, 0.2, `漫展合作洽谈:${type}`);
      return { ok: false, actionResolution: resolution,
        message: `合作未能达成；${Game.actionResolver.summary(resolution)}` };
    }
    if (type === 'guest') {
      Game.economy.spend(state, offer.fee);
      prep.budget += offer.fee;
    }
    const accepted = {
      id: offer.id, name: label(event, offer), acceptedAt: state.totalMonths,
      value: offer.value || 0, draw: offer.draw || 0, fee: offer.fee || 0,
    };
    (type === 'sponsor' ? prep.sponsors : prep.guests).push(accepted);
    applyEffects(state, event, prep, offer, `partner:${type}:${offer.id}`);
    Game.characterAttributes.gain(state, offer.primary, 0.5, `漫展合作洽谈:${type}`);
    return { ok: true, actionResolution: resolution,
      message: `${accepted.name}确认合作；${Game.actionResolver.summary(resolution)}` };
  }

  Game.conventionPartners = Object.freeze({
    limits, available, negotiate, label,
  });
}(window));
