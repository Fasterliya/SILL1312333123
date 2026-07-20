(function initRelationshipConflict(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Relations = Game.relationshipCore;

  function end(state, personId, reason) {
    const current = Relations.entry(state, personId);
    if (current?.type === '配偶' && Game.familyConflict) {
      return Game.familyConflict.divorce(state, personId);
    }
    return Relations.endRelationship(state, personId, reason);
  }

  function queue(state, personId, manual) {
    if (state.pendingDecision) return false;
    const person = Game.people.find(state, personId);
    const current = Relations.entry(state, personId);
    if (!person || !current) return false;
    state.pendingDecision = {
      type: 'relationshipConflict',
      partnerId: personId,
      title: manual ? `与${person.name}谈谈关系` : `${person.name}要求说明关系边界`,
      text: manual
        ? `当前嫉妒值${Math.round(current.jealousy)}，现在可以明确彼此期待。`
        : `${person.name}已经无法忽视其他伴侣的存在。`,
      options: [
        { value: 'communicate', label: '坦诚沟通 · 尝试降低嫉妒' },
        { value: 'open', label: '公开多角关系 · 寻求明确同意' },
        { value: 'deceive', label: '继续隐瞒 · 被识破会遭曝光' },
        { value: 'breakup', label: '结束这段关系' },
      ],
    };
    current.lastConflictMonth = state.totalMonths;
    return true;
  }

  function expose(state, person, current, reason) {
    current.exposures += 1;
    current.lastExposureMonth = state.totalMonths;
    current.jealousy = U.clamp(current.jealousy + 10, 0, 100);
    person.conflict = Math.max(75, U.clamp((person.conflict || 0) + 30, 0, 100));
    person.trust = U.clamp((person.trust || 50) - 18, 0, 100);
    state.cityLife = state.cityLife || {};
    state.cityLife.reputation = Math.max(0, (state.cityLife.reputation || 0) - 6);
    if (state.creator) {
      state.creator.scandalRisk = U.clamp((state.creator.scandalRisk || 0) + 12, 0, 100);
    }
    Game.relationshipMemory?.record(
      state,
      person,
      '背叛',
      reason || '将多角关系公开给熟人圈',
      -12,
      35,
    );
    Game.familyConflict?.recordEvidence(state, {
      partnerIds: [person.id],
      sourceId: `poly-exposure-${person.id}-${state.totalMonths}`,
      kind: '关系曝光',
      detail: `${person.name}公开了你的多角关系。`,
      weight: 18,
    });
    Game.lifeDirector.addLog(
      state,
      '关系曝光',
      `${person.name}把关系矛盾公开，城市声望和私人关系同时受损。`,
      'warning',
    );
  }

  function communicate(state, person, current) {
    const chance = U.clamp(
      0.45 + (person.affection || 0) / 250 + state.stats.魅力 / 300,
      0.45,
      0.9,
    );
    if (Math.random() < chance) {
      current.jealousy = U.clamp(current.jealousy - 22, 0, 100);
      person.trust = U.clamp((person.trust || 50) + 6, 0, 100);
      return { ok: true, message: `沟通有效，${person.name}的嫉妒下降` };
    }
    current.jealousy = U.clamp(current.jealousy + 8, 0, 100);
    person.conflict = U.clamp((person.conflict || 0) + 8, 0, 100);
    return { ok: true, message: '沟通没有说服对方，关系更加紧张' };
  }

  function disclose(state, person, current) {
    const openPersonality = ['开放', '洒脱', '自由', '乐观'].includes(person.personality);
    const chance = U.clamp(
      0.22 + (person.trust || 0) / 220 + (openPersonality ? 0.2 : 0) - current.jealousy / 300,
      0.08,
      0.85,
    );
    if (Math.random() < chance) {
      current.acceptsPoly = true;
      current.jealousy = U.clamp(current.jealousy - 35, 0, 100);
      person.trust = U.clamp((person.trust || 50) + 8, 0, 100);
      return { ok: true, message: `${person.name}同意在明确边界下维持多角关系` };
    }
    person.conflict = U.clamp((person.conflict || 0) + 28, 0, 100);
    current.jealousy = U.clamp(current.jealousy + 20, 0, 100);
    if (current.jealousy >= 90) return end(state, person.id, '无法接受多角关系而分手');
    return { ok: true, message: `${person.name}无法接受公开的多角关系` };
  }

  function deceive(state, person, current) {
    const success = Math.random() < U.clamp(0.55 + state.stats.魅力 / 400, 0.55, 0.78);
    if (success) {
      current.jealousy = U.clamp(current.jealousy - 10, 0, 100);
      return { ok: true, message: '隐瞒暂时奏效，但风险仍在累积' };
    }
    expose(state, person, current, '隐瞒被识破后公开了关系');
    return { ok: true, message: '隐瞒被识破，对方公开了关系并开始报复' };
  }

  function resolve(state, value) {
    const decision = state.pendingDecision;
    if (decision?.type !== 'relationshipConflict') return null;
    const person = Game.people.find(state, decision.partnerId);
    const current = Relations.entry(state, decision.partnerId);
    if (!person || !current) return { ok: false, message: '这段关系已经发生变化' };
    if (value === 'communicate') return communicate(state, person, current);
    if (value === 'open') return disclose(state, person, current);
    if (value === 'deceive') return deceive(state, person, current);
    if (value === 'breakup') return end(state, person.id, '在关系对峙后选择分手');
    return { ok: false, message: '选择已经失效' };
  }

  function renderDecision(state) {
    const decision = state.pendingDecision;
    if (decision?.type !== 'relationshipConflict') return null;
    return {
      title: decision.title,
      text: decision.text,
      options: decision.options,
    };
  }

  function monthly(state) {
    const romance = Relations.ensure(state);
    if (romance._relationshipMonthly === state.totalMonths) return;
    romance._relationshipMonthly = state.totalMonths;
    const pressure = Math.max(0, romance.partners.length - 1);
    romance.partners.forEach((current) => {
      const person = Game.people.find(state, current.id);
      if (!person) return;
      current.jealousy = U.clamp(
        current.jealousy + (current.acceptsPoly ? -2 : pressure * 2),
        0,
        100,
      );
      if (current.jealousy >= 88
          && state.totalMonths - (current.lastExposureMonth ?? -12) >= 6
          && Math.random() < 0.25) {
        expose(state, person, current, '长期嫉妒导致关系被公开');
      }
    });
    if (state.pendingDecision) return;
    const target = romance.partners
      .filter((current) => (
        current.jealousy >= 65
        && state.totalMonths - current.lastConflictMonth >= 4
      ))
      .sort((left, right) => right.jealousy - left.jealousy)[0];
    if (target) queue(state, target.id, false);
  }

  Game.relationshipConflict = Object.freeze({
    queue,
    expose,
    end,
    resolve,
    renderDecision,
    monthly,
  });
}(window));
