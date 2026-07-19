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
      Game.lifeDirector.addLog(state, '恋爱开始', `你与${person.name}确认了恋爱关系。`, 'milestone');
      return { ok: true, message: '告白成功，你们开始交往' };
    }
    if (type === 'date') {
      if (state.money < 220) return { ok: false, message: '约会至少需要 ¥220' };
      state.money -= 220;
      person.affection = U.clamp(person.affection + U.between(6, 10), 0, 100);
      state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
      return { ok: true, message: `约会很愉快，好感达到 ${person.affection}` };
    }
    if (type !== 'propose') return { ok: false, message: '当前不能进行这项互动' };
    const legalAge = state.gender === '男' ? 22 : 20;
    if (U.age(state) < legalAge) return { ok: false, message: `${legalAge}岁后才能登记结婚` };
    if (person.affection < 82) return { ok: false, message: '好感达到82后更适合求婚' };
    if (state.money < 20000) return { ok: false, message: '准备婚礼至少需要 ¥20,000' };
    state.money -= 20000;
    state.romance.married = true;
    person.relation = '配偶';
    Game.lifeDirector.addLog(state, '步入婚姻', `你与${person.name}组成了家庭。`, 'milestone');
    return { ok: true, message: '求婚成功，你们结婚了' };
  }

  function interact(id, type) {
    const state = api.getState();
    const person = state.family.find((item) => item.id === id);
    if (!person || person.status === '已故') return;
    if (person.lastInteractionMonth === state.totalMonths) {
      return Game.view.showToast('本月已经和这位角色互动过', 'warning');
    }
    const action = type || 'chat';
    if (['confess', 'date', 'propose'].includes(action)) {
      person.lastInteractionMonth = state.totalMonths;
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
    if (state.money < cost) return Game.view.showToast(`这次互动需要 ¥${cost}`, 'warning');
    state.money -= cost;
    person.lastInteractionMonth = state.totalMonths;
    person.interactions += 1;
    person.affection = U.clamp(person.affection + U.between(gain - 2, gain + 2), 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + mood, 0, 100);
    Game.lifeDirector.addLog(state, `与${person.name}相处`, text, 'good');
    finish(`${person.name}的好感达到 ${person.affection}`);
  }

  function planChild() {
    const state = api.getState();
    if (!state.romance.married) return Game.view.showToast('结婚后才能共同计划孩子', 'warning');
    const partner = [...state.family, ...state.contacts].find((item) => item.id === state.romance.partnerId);
    if (!partner || partner.status !== '健康') return Game.view.showToast('当前家庭状态无法计划孩子', 'warning');
    if (state.romance.pendingBirth) return Game.view.showToast('新生命已经在期待中', 'warning');
    if (state.money < 8000) return Game.view.showToast('养育准备金至少需要 ¥8,000', 'warning');
    state.money -= 8000;
    state.romance.pendingBirth = 9;
    Game.lifeDirector.addLog(state, '家庭计划', '你们开始期待一个新生命。', 'milestone');
    finish('家庭计划已经开始');
  }

  function detailActions(state, person) {
    const actions = [['chat', '聊天'], ['dine', '聚餐'], ['gift', '送礼'], ['outing', '出游'], ['support', '支持']];
    if (state.romance.partnerId === person.id && !state.romance.married) actions.push(['date', '约会'], ['propose', '求婚']);
    else if (person.relation === '朋友' && !state.romance.partnerId) actions.push(['confess', '告白']);
    return actions;
  }

  function configure(options) { api = options; }

  Game.familySystem = Object.freeze({ configure, interact, planChild, detailActions });
}(window));
