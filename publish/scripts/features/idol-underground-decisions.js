(function initUndergroundIdolDecisions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.undergroundIdolCore;
  const SOURCES = Object.freeze({
    producer: {
      title: '制作人的暗示',
      intro: '制作人暗示，服从安排才能换到更多资源和演出机会。',
      acceptText: '你接受了制作人的条件，换来一批新的演出资源。',
      rejectText: '你拒绝了制作人，事务所随即削减了你的资源。',
    },
    patron: {
      title: '金主的邀约',
      intro: '长期来看演出的金主提出私下合作，并承诺提供赞助。',
      acceptText: '你接受了邀约，金主支付了一笔赞助费。',
      rejectText: '你拒绝了邀约，金主不再为你的演出提供支持。',
    },
    broker: {
      title: '经纪人的牵线',
      intro: '经纪人提出一场私下见面，声称这能扩展业内人脉。',
      acceptText: '你参加了见面，获得了新的行业资源。',
      rejectText: '你拒绝了见面，经纪人对你的发展不再积极。',
    },
  });

  function castingCouch(state) {
    if (!Core.isUndergroundIdol(state)) {
      return { ok: false, message: '只有地下偶像才会面对业内的暗面' };
    }
    const underground = Core.ensure(state);
    if (state.totalMonths - underground.lastProducerMonth < 3) {
      return { ok: false, message: '上次邀约刚结束，暂时没有新消息' };
    }
    const chance = U.clamp(0.25 + underground.producerAbuse * 0.05, 0.15, 0.75);
    if (Math.random() > chance) {
      underground.lastProducerMonth = state.totalMonths;
      return { ok: false, message: '这个月没有人来找你，处境暂时平静' };
    }
    const type = U.random(Object.keys(SOURCES));
    const source = SOURCES[type];
    underground._pendingDecision = {
      type,
      title: source.title,
      intro: source.intro,
      income: Math.round(10000 + underground.fans * 0.03 + U.between(2000, 8000)),
      fanBoost: Math.round(underground.fans * 0.06 + U.between(50, 200)),
      month: state.totalMonths,
    };
    underground.lastProducerMonth = state.totalMonths;
    Game.lifeDirector.addLog(
      state,
      source.title,
      `${source.intro} 你需要做出选择。`,
      'normal',
    );
    return {
      ok: true,
      message: `${source.title}，你需要做出选择`,
      pendingDecision: true,
      decision: underground._pendingDecision,
    };
  }

  function player(state) {
    return {
      ...state.profile,
      id: 'player-profile',
      name: state.name,
      gender: state.gender,
      culture: state.location.country,
    };
  }

  function createSponsor(state, relation, minAge, maxAge) {
    const person = U.person(
      relation,
      U.random(Game.nameSystem.surnames()),
      U.between(minAge, maxAge),
      '男',
      state.totalMonths,
    );
    person.metCity = state.location.city;
    person.currentCity = state.location.city;
    if (relation === '金主') person.wealth = U.between(1000000, 8000000);
    if (!state.worldPeople.some((candidate) => candidate.id === person.id)) {
      state.worldPeople.push(person);
    }
    return person;
  }

  function possiblePregnancy(state, kind, chance) {
    if (Math.random() >= chance) return;
    const sponsor = createSponsor(
      state,
      kind === '强迫关系' ? '制作人' : '金主',
      38,
      kind === '强迫关系' ? 55 : 58,
    );
    const record = Game.relationshipSecrets.addHookRecord(state, sponsor, kind);
    Game.relationshipSecrets.schedulePregnancy(state, player(state), sponsor, record);
  }

  function accept(state, underground, decision, source) {
    underground.fans += decision.fanBoost;
    state.money += decision.income;
    state.stats.心情 = U.clamp(state.stats.心情 - 5, 0, 100);
    underground.producerAbuse += 1;
    underground.careerExtended = true;
    underground.lastIncomeMonth = Math.max(
      underground.lastIncomeMonth || 0,
      decision.income,
    );
    possiblePregnancy(state, '地下偶像潜规则', 0.35);
    Game.lifeDirector.addLog(
      state,
      `${source.title}·接受`,
      `${source.acceptText} 获得${Game.view.money(decision.income)}，新增${decision.fanBoost}粉丝。`,
      'normal',
    );
    return {
      ok: true,
      message: `你接受了邀约，获得${Game.view.money(decision.income)}，粉丝+${decision.fanBoost}`,
    };
  }

  function reject(state, underground, decision, source) {
    const fanPenalty = Math.round(underground.fans * 0.04);
    underground.fans = Math.max(0, underground.fans - fanPenalty);
    underground.fallBufferMonths = Math.max(0, underground.fallBufferMonths + 1);
    const aggressive = decision.type === 'producer'
      && underground.producerAbuse >= 2
      && Math.random() < 0.45;
    if (aggressive) {
      state.stats.健康 = U.clamp(state.stats.健康 - U.between(10, 25), 0, 100);
      state.stats.心情 = U.clamp(state.stats.心情 - U.between(15, 35), 0, 100);
      underground.producerAbuse += 1;
      underground.corruptionFromForced += 1;
      possiblePregnancy(state, '强迫关系', 0.4);
      Game.lifeDirector.addLog(
        state,
        '制作人的暴行',
        '拒绝后，制作人实施了强迫伤害，你的健康和心情严重下降。',
        'normal',
      );
    }
    Game.lifeDirector.addLog(
      state,
      `${source.title}·拒绝`,
      `${source.rejectText}${aggressive ? ' 制作人随后实施了报复。' : ''}`,
      'normal',
    );
    return {
      ok: true,
      message: `你拒绝了邀约，资源减少。${aggressive ? '制作人实施了报复。' : ''}`,
    };
  }

  function resolveDecision(state, accepted) {
    const underground = Core.ensure(state);
    const decision = underground._pendingDecision;
    if (!decision) return { ok: false, message: '没有待处理的邀约' };
    const source = SOURCES[decision.type];
    underground._pendingDecision = null;
    return accepted
      ? accept(state, underground, decision, source)
      : reject(state, underground, decision, source);
  }

  Game.undergroundIdolDecisions = Object.freeze({
    castingCouch,
    resolveDecision,
  });
}(window));
