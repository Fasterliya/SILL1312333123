(function initNpcInitiativeSocialEffects(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.npcInitiativeCore;

  function remember(state, person, kind, text, affection, conflict) {
    Game.relationshipMemory?.record(
      state,
      person,
      kind,
      text,
      affection,
      conflict,
    );
  }

  function exLover(state, event, action) {
    if (action !== 'reconnect') return { ok: true, message: '你忽略了这条消息' };
    const person = Core.findPerson(state, event.data.personId);
    if (!person) return { ok: false, message: '联系人已经不可用' };
    person.affection = Core.clamp((person.affection || 50) + 8);
    person.trust = Core.clamp((person.trust || 40) + 5);
    person.lastInteractionMonth = state.totalMonths;
    if (person.relation === '前恋人') person.relation = '朋友';
    remember(state, person, '重新联系', `恢复了与${person.name}的联系`, 4, -3);
    return { ok: true, message: `你与${person.name}恢复了联系` };
  }

  function sponsor(state, event, action) {
    if (action !== 'accept') return { ok: true, message: '你拒绝了邀约' };
    const amount = event.data.amount || 3000;
    state.money += amount;
    Game.relationshipSecrets?.addPlayerSecret(
      state,
      '私密邀约',
      `接受匿名邀约并获得${amount.toLocaleString()}元`,
    );
    Game.lifeDirector.addLog(
      state,
      '私密邀约',
      `你接受了一次私密会面，获得${amount.toLocaleString()}元。`,
      'normal',
    );
    return { ok: true, message: `你接受了邀约，获得${amount.toLocaleString()}元` };
  }

  function regular(state, event, action) {
    if (action !== 'accept') return { ok: true, message: '你婉拒了对方的好意' };
    const person = Core.findPerson(state, event.data.personId);
    if (!person) return { ok: false, message: '对方已经无法联系' };
    person.affection = Core.clamp((person.affection || 50) + 12);
    person.trust = Core.clamp((person.trust || 40) + 8);
    person.lastInteractionMonth = state.totalMonths;
    state.stats.心情 = Core.clamp((state.stats.心情 || 50) + 8);
    remember(state, person, '私下约会', `与${person.name}共度了一个夜晚`, 6, -2);
    return { ok: true, message: `你与${person.name}度过了愉快的夜晚` };
  }

  function restoreClassmates(state, ids) {
    let restored = 0;
    (ids || []).forEach((id) => {
      const person = Core.findPerson(state, id);
      if (!person || state.contacts.some((contact) => contact.id === person.id)) return;
      person.phoneUnlocked = true;
      person.affection = Core.clamp((person.affection || 50) + U.between(5, 15));
      person.lastInteractionMonth = state.totalMonths;
      state.contacts.push(person);
      restored += 1;
    });
    return restored;
  }

  function reunion(state, event, action) {
    if (action !== 'attend') return { ok: true, message: '你婉拒了聚会邀请' };
    const cost = U.between(300, 800);
    state.money -= cost;
    const restored = restoreClassmates(state, event.data.archives);
    state.stats.心情 = Core.clamp((state.stats.心情 || 50) + 5);
    Game.lifeDirector.addLog(
      state,
      '同学聚会',
      `你参加了${event.data.city || '本地'}的聚会，花费${cost}元，重联${restored}位同学。`,
      'normal',
    );
    return { ok: true, message: `聚会结束，恢复了${restored}位同学的联系` };
  }

  function resolve(state, event, action) {
    if (event.type === 'ex_lover_contact') return exLover(state, event, action);
    if (event.type === 'sponsor_pm') return sponsor(state, event, action);
    if (event.type === 'prostitute_regular') return regular(state, event, action);
    if (event.type === 'class_reunion') return reunion(state, event, action);
    return null;
  }

  Game.npcInitiativeSocialEffects = Object.freeze({ resolve });
}(window));
