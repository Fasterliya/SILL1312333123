(function initRelationshipCore(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function ensure(state) {
    state.romance = state.romance && typeof state.romance === 'object' ? state.romance : {};
    const romance = state.romance;
    romance.partners = Array.isArray(romance.partners) ? romance.partners : [];
    if (romance.partnerId && !romance.partners.some((entry) => entry.id === romance.partnerId)) {
      romance.partners.push({
        id: romance.partnerId,
        type: romance.married ? '配偶' : '恋人',
        jealousy: 0,
        startMonth: state.totalMonths,
      });
    }
    romance.partners.forEach((entry) => {
      entry.type = entry.type || '恋人';
      entry.jealousy = U.clamp(Number(entry.jealousy) || 0, 0, 100);
      entry.startMonth = Number.isFinite(entry.startMonth) ? entry.startMonth : state.totalMonths;
      entry.lastConflictMonth = Number.isFinite(entry.lastConflictMonth)
        ? entry.lastConflictMonth : -12;
      entry.exposures = Math.max(0, Number(entry.exposures) || 0);
    });
    syncLegacy(state);
    return romance;
  }

  function syncLegacy(state) {
    const romance = state.romance;
    if (!romance.partners.length) {
      romance.partnerId = null;
      romance.married = false;
      return;
    }
    if (!romance.partners.some((entry) => entry.id === romance.partnerId)) {
      romance.partnerId = romance.partners[0].id;
    }
    romance.married = romance.partners.some((entry) => entry.type === '配偶');
  }

  function entry(state, personId) {
    return ensure(state).partners.find((item) => item.id === personId) || null;
  }

  function hasPartner(state, personId) {
    return Boolean(entry(state, personId));
  }

  function addJealousy(state, exceptId, amount) {
    ensure(state).partners.forEach((item) => {
      if (item.id !== exceptId) {
        item.jealousy = U.clamp(item.jealousy + amount, 0, 100);
      }
    });
  }

  function addPartner(state, personId, type) {
    const romance = ensure(state);
    const existing = entry(state, personId);
    if (existing) {
      existing.type = type || existing.type;
      syncLegacy(state);
      return false;
    }
    addJealousy(state, personId, 15);
    romance.partners.push({
      id: personId,
      type: type || '恋人',
      jealousy: Math.max(0, (romance.partners.length - 1) * 4),
      startMonth: state.totalMonths,
      lastConflictMonth: -12,
      exposures: 0,
    });
    if (!romance.partnerId) romance.partnerId = personId;
    syncLegacy(state);
    return true;
  }

  function removePartner(state, personId) {
    const romance = ensure(state);
    romance.partners = romance.partners.filter((item) => item.id !== personId);
    syncLegacy(state);
  }

  function endRelationship(state, personId, reason) {
    const person = Game.people.find(state, personId);
    const current = entry(state, personId);
    if (!current || !person) return { ok: false, message: '这段关系已经结束' };
    removePartner(state, personId);
    person.relation = current.type === '配偶' ? '前配偶' : '前恋人';
    person.affection = U.clamp((person.affection || 50) - 18, 0, 100);
    person.trust = U.clamp((person.trust || 50) - 22, 0, 100);
    person.conflict = U.clamp((person.conflict || 0) + 25, 0, 100);
    person.npcMarried = false;
    person.spouseId = null;
    if (current.type === '配偶') {
      state.family = state.family.filter((member) => member.id !== personId);
      if (!state.contacts.some((contact) => contact.id === personId)) state.contacts.push(person);
    }
    Game.relationshipMemory?.record(
      state,
      person,
      '分手',
      reason || '结束了伴侣关系',
      -15,
      25,
    );
    Game.lifeDirector.addLog(
      state,
      '关系结束',
      `你与${person.name}结束了${current.type === '配偶' ? '婚姻' : '恋爱'}关系。`,
      'milestone',
    );
    return { ok: true, message: `与${person.name}的关系已结束` };
  }

  function noteDate(state, personId) {
    const romance = ensure(state);
    romance.lastDateMonth = state.totalMonths;
    romance.lastDatePartnerId = personId;
    addJealousy(state, personId, 4);
    const current = entry(state, personId);
    if (current) current.jealousy = U.clamp(current.jealousy - 8, 0, 100);
  }

  Game.relationshipCore = Object.freeze({
    ensure,
    entry,
    hasPartner,
    addPartner,
    removePartner,
    addJealousy,
    endRelationship,
    noteDate,
    syncLegacy,
  });
}(window));
