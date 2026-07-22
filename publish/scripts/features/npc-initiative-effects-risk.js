(function initNpcInitiativeRiskEffects(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.npcInitiativeCore;

  function cityReputation(state, delta) {
    state.cityLife = state.cityLife && typeof state.cityLife === 'object'
      ? state.cityLife : {};
    state.cityLife.reputation = Math.max(0, (state.cityLife.reputation || 0) + delta);
  }

  function revenge(state, event, action) {
    const person = Core.findPerson(state, event.data.personId);
    if (action === 'talk' && person) {
      person.conflict = Core.clamp(person.conflict - U.between(15, 30));
      person.trust = Core.clamp((person.trust || 20) + U.between(5, 15));
      Game.relationshipMemory?.record(
        state,
        person,
        '和解尝试',
        `尝试与${person.name}化解矛盾`,
        2,
        -10,
      );
      return { ok: true, message: `你与${person.name}对话，矛盾有所缓解` };
    }
    const serious = Math.random() < 0.4;
    if (serious && ['report', 'rumor'].includes(event.data.revengeType)) {
      cityReputation(state, -U.between(4, 12));
      Game.lifeDirector.addLog(
        state,
        '报复升级',
        `${event.data.personName || '对方'}的报复令你的城市声望下降。`,
        'normal',
      );
    }
    return { ok: true, message: '你没有理会，事件可能留下后续影响' };
  }

  function seduction(state, event, action) {
    if (action !== 'accept') return { ok: true, message: '你拒绝了暧昧邀约' };
    const person = Core.findPerson(state, event.data.personId);
    if (!person) return { ok: false, message: '对方已经无法联系' };
    person.affection = Core.clamp((person.affection || 50) + 10);
    person.hookupHistory = Array.isArray(person.hookupHistory) ? person.hookupHistory : [];
    person.hookupHistory.push({
      partnerId: 'player-profile',
      month: state.totalMonths,
      kind: 'seduction',
    });
    state.psychology = state.psychology || {};
    state.psychology.sexAddiction = Core.clamp((state.psychology.sexAddiction || 0) + 5);
    state.stats.心情 = Core.clamp((state.stats.心情 || 50) + 8);
    Game.relationshipMemory?.record(
      state,
      person,
      '酒店约会',
      `接受了${person.name}的主动邀约`,
      5,
      -1,
    );
    return { ok: true, message: `你接受了${person.name}的邀约` };
  }

  function schedulePregnancy(state, event) {
    const secrets = Game.relationshipSecretsCore;
    if (!secrets) return;
    const data = secrets.ensure(state);
    if (data.pregnancies.some((item) => item.motherId === event.data.personId)) return;
    const record = secrets.addRecord(state, {
      kind: '未公开怀孕',
      participants: ['player-profile', event.data.personId],
      known: true,
      note: `${event.data.personName}告知玩家怀孕`,
    });
    data.pregnancies.push({
      due: state.totalMonths + 9,
      motherId: event.data.personId,
      fatherId: 'player-profile',
      recordId: record.id,
    });
    Core.ensure(state)._lastPregnancyMonth = state.totalMonths;
  }

  function addSupport(state, event) {
    const events = Core.ensure(state);
    if (events.supportAgreements.some((item) => item.personId === event.data.personId)) return;
    events.supportAgreements.push({
      personId: event.data.personId,
      amount: event.data.supportAmount || 5000,
      startedAt: state.totalMonths,
      active: true,
    });
  }

  function pregnancy(state, event, action) {
    const person = Core.findPerson(state, event.data.personId);
    if (action === 'acknowledge') {
      schedulePregnancy(state, event);
      addSupport(state, event);
      state.money -= event.data.supportAmount || 5000;
      if (person) {
        person.trust = Core.clamp((person.trust || 30) + 15);
        person.affection = Core.clamp((person.affection || 50) + 5);
      }
      Game.lifeDirector.addLog(
        state,
        '承担责任',
        `你承认孩子并开始每月支付${(event.data.supportAmount || 5000).toLocaleString()}元抚养费。`,
        'milestone',
      );
      return { ok: true, message: '你承认孩子并建立了长期抚养安排' };
    }
    if (action === 'test') {
      const confirmed = Math.random() < 0.85;
      if (confirmed) {
        schedulePregnancy(state, event);
        addSupport(state, event);
      }
      if (person) person.trust = Core.clamp((person.trust || 30) + (confirmed ? 3 : -8));
      return {
        ok: true,
        message: confirmed ? '鉴定确认亲子关系，已建立抚养安排' : '鉴定未确认亲子关系',
      };
    }
    schedulePregnancy(state, event);
    if (person) {
      person.conflict = Core.clamp((person.conflict || 0) + 50);
      person.affection = Core.clamp((person.affection || 50) - 30);
      person.trust = Core.clamp((person.trust || 30) - 25);
    }
    cityReputation(state, -U.between(5, 15));
    return { ok: true, message: '你否认并回避责任，关系与声望受到损害' };
  }

  function rumor(state, event, action) {
    const baseLoss = event.data.reputationLoss || 8;
    const loss = action === 'clarify' ? Math.round(baseLoss * 0.4) : baseLoss;
    cityReputation(state, -loss);
    Game.lifeDirector.addLog(
      state,
      action === 'clarify' ? '公开澄清' : '流言蔓延',
      `城市声望下降${loss}点。`,
      'normal',
    );
    return {
      ok: true,
      message: action === 'clarify' ? '澄清降低了声望损失' : '流言造成了完整声望损失',
    };
  }

  Game.npcInitiativeRiskEffects = Object.freeze({
    revenge,
    seduction,
    pregnancy,
    rumor,
  });
}(window));
