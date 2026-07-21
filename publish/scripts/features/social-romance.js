(function initSocialRomance(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Relations = Game.relationshipCore;

  function confess(state, person) {
    if (U.age(state) < 16) return { ok: false, message: '16岁后才能认真表达感情' };
    if (Relations.hasPartner(state, person.id)) {
      return { ok: false, message: '你们已经是伴侣关系' };
    }
    if (person.affection < 62) return { ok: false, message: '关系还没有亲密到适合告白' };
    const partnerCount = Relations.ensure(state).partners.length;
    const openness = ['开放', '洒脱', '自由'].includes(person.personality) ? 0.1 : 0;
    const negotiation = Game.characterAttributes.playerValue(state, '交涉');
    const charm = Game.characterAttributes.derivedCharm(state.profile);
    const compatibility = Game.structuredTraits.compatibility(state.profile, person);
    const chance = U.clamp(
      0.22 + (person.affection - 60) / 60 + negotiation / 500 + charm / 700
        + compatibility / 100 + openness - partnerCount * 0.06,
      0.2,
      0.9,
    );
    if (Math.random() >= chance) {
      person.affection = Math.max(0, person.affection - 4);
      return { ok: false, message: `${person.name}暂时没有接受告白` };
    }
    Game.people.addContact(state, person);
    person.relation = '恋人';
    Relations.addPartner(state, person.id, '恋人');
    Game.relationshipMemory.record(state, person, '关系', '确认了恋爱关系', 12, -4);
    Game.characterAttributes.gain(state, '交涉', 1.2, '成功告白');
    Game.lifeDirector.addLog(
      state,
      '恋爱开始',
      `你与${person.name}确认了恋爱关系，目前共有${state.romance.partners.length}位伴侣。`,
      'milestone',
    );
    return { ok: true, message: `${person.name}接受了你的告白` };
  }

  function date(state, person) {
    if (!Relations.hasPartner(state, person.id) && person.relation !== '相亲对象') {
      return { ok: false, message: '需要先建立恋爱关系' };
    }
    Game.economy.spend(state, 220);
    person.affection = U.clamp(person.affection + U.between(6, 10), 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
    if (Relations.hasPartner(state, person.id)) Relations.noteDate(state, person.id);
    Game.relationshipMemory.record(state, person, '约会', '共同度过了一次约会', 7, -2);
    return {
      ok: true,
      message: Game.economy.message(state, `约会很愉快，好感达到 ${person.affection}`),
    };
  }

  function propose(state, person) {
    if (!Relations.hasPartner(state, person.id)) {
      return { ok: false, message: '需要先建立恋爱关系' };
    }
    const legalAge = state.gender === '男' ? 22 : 20;
    if (U.age(state) < legalAge) return { ok: false, message: `${legalAge}岁后才能登记结婚` };
    if (person.affection < 82) return { ok: false, message: '好感达到82后更适合求婚' };
    const decision = Game.demography.proposalDecision(state, person);
    if (!decision.accepted) {
      return {
        ok: false,
        message: person.gender === '女'
          ? `${person.name}没有接受求婚 · 择偶评估 ${decision.score}/${decision.threshold}`
          : `${person.name}希望再考虑一段时间`,
      };
    }
    Game.economy.spend(state, 20000);
    person.relation = '配偶';
    Relations.addPartner(state, person.id, '配偶');
    Object.assign(person, {
      npcMarried: true,
      npcMarriedAtAge: U.personAge(state, person),
      spouseId: state.profile.id,
      spouseName: state.name,
    });
    state.contacts = state.contacts.filter((item) => item.id !== person.id);
    if (!state.family.some((item) => item.id === person.id)) state.family.push(person);
    Relations.addJealousy(state, person.id, 12);
    Game.relationshipMemory.record(state, person, '家庭', '共同组建了家庭', 16, -8);
    Game.lifeDirector.addLog(state, '步入婚姻', `你与${person.name}组成了家庭。`, 'milestone');
    return { ok: true, message: Game.economy.message(state, '求婚成功，你们结婚了') };
  }

  function act(state, person, type) {
    if (type === 'confess') return confess(state, person);
    if (type === 'date') return date(state, person);
    if (type === 'propose') return propose(state, person);
    return null;
  }

  Game.socialRomance = Object.freeze({ confess, date, propose, act });
}(window));
