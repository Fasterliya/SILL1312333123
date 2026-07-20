(function initFamilySystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  let api = null;

  function finish(message, tone) {
    Game.view.showToast(message, tone || 'good');
    api.refresh();
    api.save();
  }

  function romantic(state, person, type) {
    if (type === 'confess') {
      if (state.romance.partnerId) return { ok: false, message: '你已经有稳定交往对象' };
      if (person.affection < 68) return { ok: false, message: '好感达到68后更适合告白' };
      state.romance.partnerId = person.id;
      person.relation = '恋人';
      Game.relationshipPanel?.addPartner(state, person.id, '恋人');
      Game.relationshipMemory.record(state, person, '关系', '确认了恋爱关系', 12, -4);
      Game.lifeDirector.addLog(state, '恋爱开始', `你与${person.name}确认了恋爱关系。`, 'milestone');
      return { ok: true, message: '告白成功，你们开始交往' };
    }
    if (type === 'date') {
      Game.economy.spend(state, 220);
      person.affection = U.clamp(person.affection + U.between(6, 10), 0, 100);
      state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
      Game.relationshipMemory.record(state, person, '约会', '共同度过了一次约会', 7, -2);
      return { ok: true, message: Game.economy.message(state, `约会很愉快，好感达到 ${person.affection}`) };
    }
    if (type !== 'propose') return { ok: false, message: '当前不能进行这项互动' };
    const legalAge = state.gender === '男' ? 22 : 20;
    if (U.age(state) < legalAge) return { ok: false, message: `${legalAge}岁后才能登记结婚` };
    if (person.affection < 82) return { ok: false, message: '好感达到82后更适合求婚' };
    const decision = Game.demography.proposalDecision(state, person);
    if (!decision.accepted) return { ok: false, message: person.gender === '女'
      ? `${person.name}没有接受求婚 · 择偶评估 ${decision.score}/${decision.threshold}`
      : `${person.name}希望再考虑一段时间` };
    Game.economy.spend(state, 20000);
    state.romance.married = true;
    person.relation = '配偶';
    Game.relationshipPanel?.removePartner(state, person.id);
    Game.relationshipPanel?.addPartner(state, person.id, '配偶');
    Object.assign(person, {
      npcMarried: true, npcMarriedAtAge: U.personAge(state, person),
      spouseId: state.profile.id, spouseName: state.name,
    });
    Game.relationshipMemory.record(state, person, '家庭', '共同组建了家庭', 16, -8);
    Game.lifeDirector.addLog(state, '步入婚姻', `你与${person.name}组成了家庭。`, 'milestone');
    return { ok: true, message: Game.economy.message(state, '求婚成功，你们结婚了') };
  }

  function interact(id, type) {
    const state = api.getState();
    const person = state.family.find((item) => item.id === id);
    if (!person || person.status === '已故') return;
    const action = type || 'chat';
    if (action.startsWith('parent-')) {
      const result = Game.parenting.act(state, person.id, action.slice(7));
      return finish(result.message, result.ok ? 'good' : 'warning');
    }
    if (['confess', 'date', 'propose'].includes(action)) {
      person.interactions += 1;
      const result = romantic(state, person, action);
      return finish(result.message, result.ok ? 'good' : 'warning');
    }
    const options = {
      chat: [0, 4, 2, '你们分享了近况。'],
      dine: [180, 7, 5, '一家人坐下来吃了顿饭。'],
      gift: [400, 10, 3, '你送出了一份认真挑选的礼物。'],
      outing: [600, 9, 8, '你们一起外出游玩，留下新的回忆。'],
      support: [1000, 12, 2, '你在重要时刻给予了实际支持。'],
    };
    const [cost, gain, mood, text] = options[action] || options.chat;
    Game.economy.spend(state, cost);
    person.interactions += 1;
    person.affection = U.clamp(person.affection + U.between(gain - 2, gain + 2), 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + mood, 0, 100);
    Game.relationshipMemory.record(state, person, '家庭互动', text, Math.max(2, gain - 2), -1);
    Game.lifeDirector.addLog(state, `与${person.name}相处`, text, 'good');
    finish(Game.economy.message(state, `${person.name}的好感达到 ${person.affection}`));
  }

  function detailActions(state, person) {
    const actions = [['chat', '聊天'], ['dine', '聚餐'], ['gift', '送礼'], ['outing', '出游'], ['support', '支持']];
    if (['儿子', '女儿'].includes(person.relation)) actions.push(...Game.parenting.detailActions(person));
    if (state.romance.partnerId === person.id && !state.romance.married) actions.push(['date', '约会'], ['propose', '求婚']);
    else if (person.relation === '朋友' && !state.romance.partnerId) actions.push(['confess', '告白']);
    return actions;
  }

  function configure(options) { api = options; }

  Game.familySystem = Object.freeze({ configure, interact, detailActions });
}(window));
