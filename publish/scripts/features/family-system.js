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
      const result = Game.socialRomance.act(state, person, action);
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
    var age = U.personAge(state, person);
    var actions = [['chat', '聊天'], ['dine', '聚餐'], ['gift', '送礼'], ['outing', '出游'], ['support', '支持']];
    if (['儿子', '女儿'].includes(person.relation) && age < 18) {
      actions.push.apply(actions, Game.parenting.detailActions(person));
    }
    if (['儿子', '女儿'].includes(person.relation) && age >= 18) {
      actions.push(['support', '经济支援'], ['chat', '关心近况']);
    }
    if (['养子', '养女'].includes(person.relation)) {
      if (age < 18) actions.push.apply(actions, Game.parenting.detailActions(person));
      else actions.push(['chat', '关心近况']);
    }
    if (Game.relationshipCore.hasPartner(state, person.id)) {
      actions.push(['date', '约会'], ['propose', '求婚']);
    } else if (person.relation === '朋友') {
      actions.push(['confess', '告白']);
    }
    return actions;
  }

  function configure(options) { api = options; }

  Game.familySystem = Object.freeze({ configure, interact, detailActions });
}(window));
