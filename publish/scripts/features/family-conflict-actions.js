(function initFamilyConflictActions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.familyConflictCore;

  function queue(state, person, phase) {
    if (!person || state.pendingDecision) return false;
    const item = Core.profile(state, person.id);
    const clues = item.evidence.slice(-3).map((evidence) => evidence.detail).join('；')
      || '长期积累的异常已经无法忽视';
    const aftermath = phase === 'aftermath';
    state.pendingDecision = {
      type: 'familyConflict',
      partnerId: person.id,
      phase,
      title: aftermath ? `与${person.name}决定婚姻去向` : `${person.name}要求你解释`,
      text: aftermath ? '信任已经破裂，继续共同生活需要明确选择。' : `对方提到：${clues}。`,
      options: aftermath ? [
        { value: 'repair', label: '投入修复 · 花费1500并进入观察期' },
        { value: 'cooloff', label: '暂时分居 · 冷静三个月' },
        { value: 'divorce', label: '结束婚姻 · 依法分割财产' },
      ] : [
        { value: 'confess', label: '坦白事实 · 承担信任损失' },
        { value: 'deny', label: '否认指控 · 证据充分时后果更重' },
        { value: 'divorce', label: '直接提出离婚' },
      ],
    };
    item.lastDecisionMonth = state.totalMonths;
    item.stage = 'confronting';
    return true;
  }

  function confront(state, id) {
    const person = Core.partner(state, id);
    const item = person && Core.profile(state, person.id);
    if (!person || !item || (item.suspicion < 25 && !item.evidence.length)) {
      return { ok: false, message: '当前没有足够的矛盾需要对峙' };
    }
    return queue(state, person, 'confrontation')
      ? { ok: true, message: `需要回应${person.name}的质问` }
      : { ok: false, message: '请先处理当前选择' };
  }

  function reconcile(state, id) {
    const person = Core.partner(state, id);
    const item = person && Core.profile(state, person.id);
    if (!person || !item || item.stage === 'calm' || item.cooldownUntil > state.totalMonths) {
      return { ok: false, message: '当前关系尚不适合进行修复' };
    }
    Game.economy.spend(state, 1500);
    item.suspicion = Core.clamp(item.suspicion - 18);
    item.stage = 'repairing';
    item.cooldownUntil = state.totalMonths + 3;
    item.reconciledAt = state.totalMonths;
    person.affection = Core.clamp(person.affection + 6);
    person.trust = Core.clamp((person.trust || 50) + 8);
    person.conflict = Core.clamp((person.conflict || 0) - 12);
    state.stats.心情 = Core.clamp(state.stats.心情 + 4);
    Core.syncSuspicion(state);
    Game.lifeDirector.addLog(state, '修复关系', `你与${person.name}约定用三个月重建信任。`, 'good');
    return {
      ok: true,
      message: Game.economy.message(state, `与${person.name}进入关系修复期`),
    };
  }

  function coolOff(state, id) {
    const person = Core.partner(state, id);
    const item = person && Core.profile(state, person.id);
    if (!person || !item) return { ok: false, message: '伴侣关系已经失效' };
    item.stage = 'cooling';
    item.cooldownUntil = state.totalMonths + 3;
    item.suspicion = Core.clamp(item.suspicion - 8);
    person.affection = Core.clamp(person.affection - 6);
    person.conflict = Core.clamp((person.conflict || 0) - 6);
    state.stats.心情 = Core.clamp(state.stats.心情 - 4);
    Core.affectChildren(state, person.id, 3);
    Core.syncSuspicion(state);
    Game.lifeDirector.addLog(state, '婚姻冷静期', `你与${person.name}暂时分开三个月。`, 'normal');
    return { ok: true, message: `已与${person.name}进入冷静期` };
  }

  function divorce(state, id) {
    Core.ensure(state);
    const person = Core.partner(state, id);
    if (!person) return { ok: false, message: '婚姻关系已经失效' };
    const entry = Core.spouseEntries(state).find((item) => item.id === person.id) || {};
    const item = Core.profile(state, person.id);
    const years = Math.max(0, state.totalMonths - (entry.startMonth || state.totalMonths)) / 12;
    const children = state.family.filter((child) => (
      ['儿子', '女儿'].includes(child.relation)
      && (child.parentIds || []).includes(person.id)
    )).length;
    const share = U.clamp(0.22 + years * 0.012 + children * 0.04 + item.suspicion / 500, 0.22, 0.55);
    const house = state.assets?.house;
    const equity = house ? Math.max(0, (house.marketValue || 0) - (house.mortgageBalance || 0)) : 0;
    const settlement = Math.round(Math.max(0, state.money) * share + equity * share * 0.2);
    state.money -= settlement;
    Core.affectChildren(state, person.id, 10);
    Object.assign(person, {
      relation: '前配偶',
      affection: 0,
      trust: 0,
      conflict: 100,
      spouseId: null,
    });
    state.family = state.family.filter((candidate) => candidate.id !== person.id);
    if (!state.contacts.some((candidate) => candidate.id === person.id)) state.contacts.push(person);
    state.romance.partners = state.romance.partners.filter((candidate) => candidate.id !== person.id);
    item.stage = 'divorced';
    item.suspicion = 0;
    state.familyConflict.history.push({
      partnerId: person.id,
      month: state.totalMonths,
      settlement,
      children,
    });
    if (state.romance.partnerId === person.id) state.romance.partnerId = null;
    const next = state.romance.partners.find((candidate) => candidate.type === '配偶');
    state.romance.partnerId = state.romance.partnerId || next?.id || null;
    state.romance.married = Boolean(next);
    if (state.pendingDecision?.type === 'familyConflict') state.pendingDecision = null;
    Core.syncSuspicion(state);
    Game.lifeDirector.addLog(
      state,
      '婚姻破裂',
      `你与${person.name}离婚，财产结算${Game.view.money(settlement)}，${children}名子女受到影响。`,
      'milestone',
    );
    return { ok: true, message: `与${person.name}离婚，财产结算 ${Game.view.money(settlement)}` };
  }

  function resolve(state, value) {
    const decision = state.pendingDecision;
    if (decision?.type !== 'familyConflict') return null;
    const person = Core.partner(state, decision.partnerId);
    const item = person && Core.profile(state, person.id);
    if (!person || !item) return { ok: false, message: '这段婚姻关系已经发生变化' };
    if (value === 'divorce') return divorce(state, person.id);
    if (value === 'repair') return reconcile(state, person.id);
    if (value === 'cooloff') return coolOff(state, person.id);
    const strength = item.evidence.reduce((sum, evidence) => sum + evidence.weight, 0);
    if (value === 'confess') {
      item.confessions += 1;
      item.suspicion = Core.clamp(item.suspicion - 25);
      item.stage = 'ruptured';
      person.trust = Core.clamp((person.trust || 50) - 25);
      person.affection = Core.clamp(person.affection - 12);
      person.conflict = Core.clamp((person.conflict || 0) + 20);
      Core.affectChildren(state, person.id, 5);
      Game.lifeDirector.addLog(state, '婚姻坦白', `你向${person.name}承认了隐瞒。`, 'normal');
    } else if (value === 'deny') {
      const caught = strength >= 18 || item.suspicion >= 75;
      item.denials += 1;
      item.stage = caught ? 'ruptured' : 'strained';
      item.suspicion = Core.clamp(item.suspicion + (caught ? 15 : -10));
      person.trust = Core.clamp((person.trust || 50) - (caught ? 30 : 8));
      person.conflict = Core.clamp((person.conflict || 0) + (caught ? 30 : 12));
      if (caught) Core.affectChildren(state, person.id, 6);
      Game.lifeDirector.addLog(
        state,
        caught ? '谎言被揭穿' : '暂时否认',
        caught ? `${person.name}用证据击穿了你的否认。` : `${person.name}暂时停止追问。`,
        'normal',
      );
    } else {
      return { ok: false, message: '这个选择已经失效' };
    }
    Core.syncSuspicion(state);
    state.pendingDecision = null;
    if (item.stage === 'ruptured') queue(state, person, 'aftermath');
    else item.cooldownUntil = state.totalMonths + 2;
    return {
      ok: true,
      message: item.stage === 'ruptured' ? '婚姻去向仍需决定' : '对峙暂时结束',
    };
  }

  Game.familyConflictActions = Object.freeze({
    queue,
    confront,
    reconcile,
    coolOff,
    divorce,
    resolve,
  });
}(window));
