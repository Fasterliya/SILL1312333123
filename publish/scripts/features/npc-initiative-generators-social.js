(function initNpcInitiativeSocialGenerators(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.npcInitiativeCore;

  function exLover(state) {
    if (Core.playerAge(state) < 18) return null;
    const candidates = Core.allContacts(state).filter((person) => (
      ['前恋人', '前配偶'].includes(person.relation) && (person.affection || 0) > 40
    ));
    const person = U.random(candidates);
    if (!person) return null;
    return {
      type: 'ex_lover_contact',
      title: person.relation === '前配偶' ? '前配偶联系' : '前任联系',
      text: `${person.name}发来消息：好久不见，最近还好吗？`,
      data: { personId: person.id, personName: person.name },
      options: [
        { label: '回复聊聊', action: 'reconnect' },
        { label: '忽略消息', action: 'ignore' },
      ],
    };
  }

  function sponsor(state) {
    if (state.career.jobId !== 'welfare') return null;
    const followers = state.creator?.followers || 0;
    if (followers < 3000) return null;
    const multiplier = followers >= 20000 ? 2.5 : (followers >= 5000 ? 1.6 : 0.9);
    const amount = Math.round(
      (800 + Math.sqrt(followers) * 14 + followers * 0.03) * multiplier,
    );
    return {
      type: 'sponsor_pm',
      title: '私密邀约',
      text: `一位潜在金主提出私下见面，报酬${amount.toLocaleString()}元。`,
      data: { amount },
      options: [
        { label: '接受邀约', action: 'accept' },
        { label: '拒绝邀约', action: 'decline' },
      ],
    };
  }

  function regular(state) {
    const visits = Core.ensure(state)._brothelVisits;
    const person = Core.findPerson(
      state,
      U.random(Object.keys(visits).filter((id) => visits[id] >= 3)),
    );
    if (!person) return null;
    return {
      type: 'prostitute_regular',
      title: '熟悉的来信',
      text: `${person.name}发来消息：今晚我休息，只是想见你。`,
      data: { personId: person.id, personName: person.name },
      options: [
        { label: '赴约', action: 'accept' },
        { label: '婉拒', action: 'decline' },
      ],
    };
  }

  function reunion(state) {
    if (Core.playerAge(state) < 22) return null;
    const city = state.location.city;
    const archives = state.socialWorld?.cityArchives?.[city];
    if (!Array.isArray(archives) || archives.length < 4) return null;
    const contactIds = new Set(state.contacts.map((person) => person.id));
    const classmates = archives.filter((person) => (
      person?.status === '健康' && !contactIds.has(person.id)
    ));
    const organizer = U.random(classmates);
    if (!organizer || classmates.length < 4) return null;
    return {
      type: 'class_reunion',
      title: '同学聚会',
      text: `${organizer.name}邀请你参加${city}的同学聚会。`,
      data: { city, archives: classmates.slice(0, 8).map((person) => person.id) },
      options: [
        { label: '参加聚会', action: 'attend' },
        { label: '婉拒邀请', action: 'decline' },
      ],
    };
  }

  Game.npcInitiativeSocialGenerators = Object.freeze({
    list: [exLover, sponsor, regular, reunion],
  });
}(window));
