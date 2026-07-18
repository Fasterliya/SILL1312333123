(function initSocial(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function archiveSchool(state) {
    state.contacts.forEach((person) => {
      if (person.school === state.education.school && person.interactions > 0) {
        person.phoneUnlocked = true;
      }
    });
  }

  function createClassmates(state, school, count) {
    const existing = state.contacts.filter((item) => item.school === school);
    if (existing.length) return;
    for (let index = 0; index < count; index += 1) {
      const person = U.person('同学', U.random(C.surnames), U.between(-1, 1));
      person.school = school;
      person.affection = U.between(38, 58);
      state.contacts.push(person);
    }
  }

  function enterSchool(state, school, stage, count) {
    if (state.education.school !== school) archiveSchool(state);
    state.education.school = school;
    state.education.schoolStage = stage;
    createClassmates(state, school, count || 4);
  }

  function currentClassmates(state) {
    return state.contacts.filter((item) => item.school === state.education.school && item.status === '健康');
  }

  function phoneContacts(state) {
    return state.contacts.filter((item) => (
      item.school !== state.education.school && item.phoneUnlocked && item.status === '健康'
    ));
  }

  function interact(state, id, type) {
    const person = state.contacts.find((item) => item.id === id);
    if (!person || person.status !== '健康') return { ok: false, message: '无法联系这位角色' };
    const inSchool = person.school === state.education.school;
    if (!inSchool && !person.phoneUnlocked) return { ok: false, message: '毕业前没有留下联系方式' };
    if (person.lastInteractionMonth === state.totalMonths) {
      return { ok: false, message: '本月已经和这位同学互动过' };
    }
    person.lastInteractionMonth = state.totalMonths;
    person.interactions += 1;
    const gains = {
      chat: [U.between(4, 7), '你们聊了最近的生活，关系更熟悉了。'],
      study: [U.between(3, 5), '你们一起讨论课程，彼此补上了知识盲点。'],
      hangout: [U.between(6, 9), '你们一起消磨了愉快的课余时间。'],
      phone: [U.between(3, 6), '一通电话让离校后的关系没有中断。'],
    };
    const [gain, text] = gains[type] || gains.chat;
    person.affection = U.clamp(person.affection + gain, 0, 100);
    if (type === 'study') {
      state.education.study += 4;
      state.profile.interests.科学 = U.clamp(state.profile.interests.科学 + 2, 0, 100);
    } else {
      state.stats.心情 = U.clamp(state.stats.心情 + 2, 0, 100);
      state.profile.interests.社交 = U.clamp(state.profile.interests.社交 + 2, 0, 100);
    }
    if (person.affection >= 75 && person.relation === '同学') person.relation = '好友';
    Game.lifeDirector.addLog(state, `与${person.name}互动`, text, 'good');
    return { ok: true, message: `${person.name}的好感提升到 ${person.affection}` };
  }

  function card(person, actions) {
    const buttons = actions.map(([type, label]) => (
      `<button data-contact="${person.id}" data-contact-action="${type}">${label}</button>`
    )).join('');
    return `<article class="contact-card"><div class="person-avatar">${person.name.slice(-1)}</div>
      <div class="contact-main"><strong>${person.name}</strong>
      <span>${person.relation} · ${person.personality} · 好感 ${person.affection}</span>
      <small>${person.school}</small></div><div class="contact-actions">${buttons}</div></article>`;
  }

  function renderSchool(state) {
    const contacts = currentClassmates(state);
    if (U.age(state) < 6 || !contacts.length) return '<p class="empty-state">当前阶段还没有固定同窗。</p>';
    return contacts.map((item) => card(item, [['chat', '聊天'], ['study', '共学'], ['hangout', '结伴']])).join('');
  }

  function renderPhone(state) {
    const contacts = phoneContacts(state);
    if (!contacts.length) return '<p class="empty-state">与同学产生互动并毕业后，联系方式会保留在这里。</p>';
    return contacts.map((item) => card(item, [['phone', '联系']])).join('');
  }

  Game.social = Object.freeze({
    archiveSchool, enterSchool, currentClassmates, phoneContacts,
    interact, renderSchool, renderPhone,
  });
}(window));
