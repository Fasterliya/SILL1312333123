(function initFamilyConflictCore(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const clamp = (value) => U.clamp(Number(value) || 0, 0, 100);

  function spouseEntries(state) {
    const romance = state.romance || (state.romance = {});
    const partners = Array.isArray(romance.partners) ? romance.partners : [];
    const entries = partners.filter((item) => (
      item?.id && (item.type === '配偶' || (romance.married && item.id === romance.partnerId))
    ));
    if (romance.married && romance.partnerId && !entries.some((item) => item.id === romance.partnerId)) {
      entries.unshift({ id: romance.partnerId, type: '配偶', startMonth: state.totalMonths });
    }
    return entries.filter((item, index) => (
      entries.findIndex((candidate) => candidate.id === item.id) === index
    ));
  }

  function syncSuspicion(state) {
    const values = spouseEntries(state).map((entry) => (
      state.familyConflict?.partners?.[entry.id]?.suspicion || 0
    ));
    state.romance.suspicion = clamp(values.length ? Math.max(...values) : 0);
  }

  function ensure(state) {
    const romance = state.romance || (state.romance = {});
    romance.partners = Array.isArray(romance.partners) ? romance.partners : [];
    romance.affairCount = Math.max(0, Number(romance.affairCount) || 0);
    const data = state.familyConflict && typeof state.familyConflict === 'object'
      ? state.familyConflict : {};
    state.familyConflict = data;
    data.partners = data.partners && typeof data.partners === 'object' ? data.partners : {};
    data.history = Array.isArray(data.history) ? data.history.slice(-40) : [];
    spouseEntries(state).forEach((entry, index) => {
      const current = data.partners[entry.id] || {};
      current.suspicion = clamp(Number.isFinite(current.suspicion)
        ? current.suspicion : (index ? 0 : Number(romance.suspicion) || 0));
      current.evidence = Array.isArray(current.evidence) ? current.evidence.slice(-20) : [];
      current.stage = current.stage || 'calm';
      current.cooldownUntil = Number.isFinite(current.cooldownUntil) ? current.cooldownUntil : -1;
      current.lastDecisionMonth = Number.isFinite(current.lastDecisionMonth)
        ? current.lastDecisionMonth : -12;
      current.reconciledAt = Number.isFinite(current.reconciledAt) ? current.reconciledAt : -99;
      current.denials = Math.max(0, Number(current.denials) || 0);
      current.confessions = Math.max(0, Number(current.confessions) || 0);
      data.partners[entry.id] = current;
    });
    syncSuspicion(state);
    return data;
  }

  function profile(state, id) {
    return ensure(state).partners[id] || null;
  }

  function partner(state, id) {
    ensure(state);
    const entry = id ? { id } : spouseEntries(state).sort((left, right) => (
      (state.familyConflict.partners[right.id]?.suspicion || 0)
      - (state.familyConflict.partners[left.id]?.suspicion || 0)
    ))[0];
    return entry ? Game.people.find(state, entry.id) : null;
  }

  function recordEvidence(state, input) {
    ensure(state);
    const ids = input.partnerIds || spouseEntries(state).map((entry) => entry.id);
    let added = 0;
    ids.forEach((id) => {
      const item = profile(state, id);
      if (!item || item.evidence.some((evidence) => (
        input.sourceId && evidence.sourceId === input.sourceId
      ))) return;
      const weight = Math.max(1, Number(input.weight) || 5);
      item.evidence.push({
        id: `evidence-${state.totalMonths}-${Math.random().toString(36).slice(2, 7)}`,
        sourceId: input.sourceId || '',
        month: state.totalMonths,
        weight,
        kind: input.kind || '异常线索',
        detail: input.detail || '难以解释的异常引起怀疑',
        confirmed: Boolean(input.confirmed),
      });
      item.evidence = item.evidence.slice(-20);
      const relapse = state.totalMonths - item.reconciledAt <= 6 ? 1.4 : 1;
      item.suspicion = clamp(item.suspicion + Math.round(weight * relapse));
      added += 1;
    });
    syncSuspicion(state);
    if (added && input.log !== false) {
      Game.lifeDirector.addLog(
        state,
        input.title || '家庭疑云',
        input.detail || '伴侣察觉到新的异常线索。',
        'normal',
      );
    }
    return added;
  }

  function addSuspicion(state, amount, reason) {
    if (!spouseEntries(state).length) return 0;
    return recordEvidence(state, {
      sourceId: `suspicion-${state.totalMonths}-${reason}`,
      kind: '行为疑点',
      detail: reason,
      weight: amount,
      log: amount >= 8,
    });
  }

  function affectChildren(state, partnerId, severity) {
    state.family.filter((child) => (
      ['儿子', '女儿'].includes(child.relation)
      && child.status === '健康'
      && (!partnerId || (child.parentIds || []).includes(partnerId))
    )).forEach((child) => {
      child.trust = clamp((child.trust || 50) - severity);
      child.affection = clamp((child.affection || 50) - Math.ceil(severity / 2));
      child.conflict = clamp((child.conflict || 0) + severity);
      if (child.upbringing) {
        child.upbringing.care = clamp(child.upbringing.care - Math.ceil(severity / 2));
      }
    });
  }

  Game.familyConflictCore = Object.freeze({
    clamp,
    spouseEntries,
    syncSuspicion,
    ensure,
    profile,
    partner,
    recordEvidence,
    addSuspicion,
    affectChildren,
  });
}(window));
