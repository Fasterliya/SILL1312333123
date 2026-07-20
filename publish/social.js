(function initSocial(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  let classFilter = '全部';
  function archiveSchool(state) {
    const school = state.education.school;
    if (!school || ['家中', '已毕业'].includes(school)) return;
    Game.socialWorld.archiveClassmates(state, state.contacts.filter((item) => item.school === school), school);
  }
  function createClassmates(state, school, count) {
    const existing = state.contacts.filter((item) => item.school === school);
    const target = Math.max(30, count || 32);
    for (let index = existing.length; index < target; index += 1) {
      const person = U.person('同学', U.random(Game.nameSystem.surnames()), U.between(-1, 1), null, state.playerBornAt);
      const culture = Game.worldCulture.populationCulture(state.location.country);
      Game.worldCulture.applyPerson(person, culture); U.setUniqueName(state, person, Game.worldCulture.profile(culture).locale);
      person.school = school;
      person.educationName = school;
      person.educationStage = state.education.schoolStage;
      if (state.education.schoolStage === 'university') {
        person.educationLevel = state.education.universityType === '高职专科' ? 2 : 3;
      } else if (['high', 'vocational'].includes(state.education.schoolStage)) {
        person.educationLevel = 1;
      }
      person.affection = U.between(28, 62);
      person.clothing.top = '简洁校服';
      Game.educationSystem.ensurePerson(person);
      Game.npcLife.syncGrowth(state, person);
      state.contacts.push(person);
    }
  }
  function enterSchool(state, school, stage, count) {
    const oldSchool = state.education.school;
    if (oldSchool !== school) archiveSchool(state);
    state.education.school = school;
    state.education.schoolStage = stage;
    createClassmates(state, school, count);
  }
  function currentClassmates(state) {
    return state.contacts.filter((item) => item.school === state.education.school && item.status === '健康');
  }
  function phoneContacts(state) {
    return state.contacts.filter((item) => item.phoneUnlocked && item.status === '健康');
  }
  function spend(state, amount) {
    Game.economy.spend(state, amount);
  }
  function romance(state, person, type) {
    const age = U.age(state);
    if (type === 'confess') {
      if (age < 16) return { ok: false, message: '16岁后才能认真表达感情' };
      if (state.romance.partnerId) return { ok: false, message: '你已经有稳定交往对象' };
      if (person.affection < 62) return { ok: false, message: '关系还没有亲密到适合告白' };
      const accepted = Math.random() < U.clamp(0.35 + (person.affection - 60) / 60, 0.35, 0.9);
      if (!accepted) {
        person.affection = Math.max(0, person.affection - 4);
        return { ok: false, message: `${person.name}暂时没有接受告白` };
      }
      Game.people.addContact(state, person);
      state.romance.partnerId = person.id;
      person.relation = '恋人';
      Game.relationshipMemory.record(state, person, '关系', '确认了恋爱关系', 12, -4);
      Game.lifeDirector.addLog(state, '恋爱开始', `你与${person.name}确认了恋爱关系。`, 'milestone');
      return { ok: true, message: `${person.name}接受了你的告白` };
    }
    if (type === 'date') {
      if (state.romance.partnerId && state.romance.partnerId !== person.id) {
        return { ok: false, message: '你已有稳定交往对象' };
      }
      spend(state, 220);
      person.affection = U.clamp(person.affection + U.between(6, 10), 0, 100);
      state.stats.心情 = U.clamp(state.stats.心情 + 5, 0, 100);
      Game.relationshipMemory.record(state, person, '约会', '共同度过了一次约会', 7, -2);
      return { ok: true, message: Game.economy.message(state, `约会很愉快，好感达到 ${person.affection}`) };
    }
    if (type !== 'propose') return null;
    if (state.romance.partnerId !== person.id) return { ok: false, message: '需要先建立恋爱关系' };
    const legalAge = state.gender === '男' ? 22 : 20;
    if (age < legalAge) return { ok: false, message: `${legalAge}岁后才能登记结婚` };
    if (person.affection < 82) return { ok: false, message: '好感达到82后更适合求婚' };
    const decision = Game.demography.proposalDecision(state, person);
    if (!decision.accepted) return { ok: false, message: person.gender === '女'
      ? `${person.name}没有接受求婚 · 择偶评估 ${decision.score}/${decision.threshold}`
      : `${person.name}希望再考虑一段时间` };
    spend(state, 20000);
    state.romance.married = true;
    person.relation = '配偶';
    Object.assign(person, {
      npcMarried: true, npcMarriedAtAge: U.personAge(state, person),
      spouseId: state.profile.id, spouseName: state.name,
    });
    state.contacts = state.contacts.filter((item) => item.id !== person.id);
    if (!state.family.some((item) => item.id === person.id)) state.family.push(person);
    Game.relationshipMemory.record(state, person, '家庭', '共同组建了家庭', 16, -8);
    Game.lifeDirector.addLog(state, '步入婚姻', `你与${person.name}组成了家庭。`, 'milestone');
    return { ok: true, message: Game.economy.message(state, '求婚成功，你们结婚了') };
  }

  function interact(state, id, type) {
    const person = Game.people.find(state, id);
    if (!person || person.status !== '健康') return { ok: false, message: '无法联系这位角色' };
    if (type === 'reconnect') return Game.socialWorld.reconnect(state, person);
    if (!Game.socialWorld.reachable(state, person)) return { ok: false, message: '毕业前没有留下联系方式' };
    const romantic = romance(state, person, type);
    if (romantic) {
      person.interactions += 1;
      return romantic;
    }
    const actions = {
      chat: [0, U.between(3, 6), 2, '你们分享了最近的生活。'],
      study: [0, U.between(3, 5), 0, '你们一起讨论课程，学习积累增加。'],
      hangout: [80, U.between(5, 8), 4, '你们结伴度过了轻松的课余时间。'],
      phone: [0, U.between(2, 5), 2, '一通电话让关系没有中断。'],
      meal: [120, U.between(5, 8), 4, '你们一起吃饭，聊了许多近况。'],
      gift: [300, U.between(7, 11), 3, '你认真挑选了一份礼物。'],
      movie: [160, U.between(5, 9), 5, '你们看了一场印象深刻的电影。'],
      walk: [0, U.between(3, 7), 3, '你们边走边聊，关系更加自然。'],
      exchange: [0, 3, 2, '你提出交换联系方式。'],
    };
    const action = actions[type] || actions.chat;
    spend(state, action[0]);
    if (type === 'exchange' && person.affection < 42) return { ok: false, message: '再熟悉一些后更容易交换联系方式' };
    person.interactions += 1;
    person.affection = U.clamp(person.affection + action[1], 0, 100);
    state.stats.心情 = U.clamp(state.stats.心情 + action[2], 0, 100);
    if (type === 'study') Game.educationSystem.addPreparation(state, 4);
    if (type === 'exchange') {
      Game.people.addContact(state, person);
    } else if (person.affection >= 75 && person.relation === '同学') person.relation = '好友';
    Game.lifeDirector.addLog(state, `与${person.name}互动`, action[3], 'good');
    Game.relationshipMemory.record(state, person, '日常互动', action[3], Math.max(2, action[1] - 2), -1);
    return { ok: true, message: Game.economy.message(state, `${person.name}的好感提升到 ${person.affection}`) };
  }

  function card(person, actions) {
    const buttons = actions.map(([type, label]) => (
      `<button data-contact="${person.id}" data-contact-action="${type}">${label}</button>`
    )).join('');
    return `<article class="contact-card"><button class="person-avatar" type="button"
      data-character-id="${person.id}" aria-label="查看${person.name}详情">${Game.portraitSystem.avatar(person)}</button>
      <div class="contact-main"><strong>${person.name}</strong>
      <span>${person.relation} · ${person.gender} · ${person.personality} · ${person.trait}
      · 好感 ${person.affection}${person.gender === '女' ? ` · 择偶标准 ${person.marriageStandard}` : ''}</span>
      <small>${[person.school || person.metCity, person.educationName !== person.school
        ? person.educationName : '', person.job].filter(Boolean).join(' · ') || '生活圈'}</small></div>
      <details class="interaction-menu"><summary>互动选项</summary><div class="interaction-options">${buttons}</div></details></article>`;
  }

  function filteredClassmates(state) {
    const contacts = currentClassmates(state);
    if (classFilter === '好友') return contacts.filter((item) => ['好友', '恋人'].includes(item.relation));
    if (classFilter === '高好感') return contacts.filter((item) => item.affection >= 65);
    if (classFilter === '内向') return contacts.filter((item) => ['内向', '慢热'].includes(item.personality));
    if (classFilter === '外向') return contacts.filter((item) => ['外向', '乐观', '热血'].includes(item.personality));
    return contacts;
  }

  function filterBar(total) {
    const filters = ['全部', '好友', '高好感', '内向', '外向'];
    return `<section class="list-guide"><strong>班级共 ${total} 人</strong><span>先筛选，再点击头像查看完整资料与更多互动。</span></section>
      <nav class="filter-chips">${filters.map((name) => (
        `<button class="${classFilter === name ? 'active' : ''}" data-class-filter="${name}">${name}</button>`
      )).join('')}</nav>`;
  }

  function renderSchool(state) {
    const all = currentClassmates(state);
    if (U.age(state) < 6 || !all.length) return '<p class="empty-state">当前阶段还没有固定同窗。</p>';
    const contacts = filteredClassmates(state);
    return filterBar(all.length) + (contacts.length ? contacts.map((item) => (
      card(item, [['chat', '聊天'], ['study', '共学'], ...(item.phoneUnlocked ? [] : [['exchange', '加联系人']])])
    )).join('') : '<p class="empty-state">当前筛选没有符合条件的同学。</p>');
  }

  function renderPhone(state) {
    const contacts = phoneContacts(state);
    if (!contacts.length) return '<p class="empty-state">互动并交换联系方式后，联系人会保留在这里。</p>';
    return contacts.map((item) => card(item, [['phone', '联系'], ['meal', '约饭']])).join('');
  }
  function detailActions(state, person) {
    if (!Game.socialWorld.reachable(state, person)) return person.currentCity === state.location.city
      ? [['reconnect', '尝试重逢']] : [];
    const actions = [['chat', '聊天'], ['meal', '约饭'], ['gift', '送礼'], ['walk', '散步']];
    if (person.school === state.education.school) actions.splice(1, 0, ['study', '共学']);
    if (!person.phoneUnlocked) actions.push(['exchange', '交换联系方式']);
    if (state.romance.partnerId === person.id) actions.push(['date', '约会'], ['propose', '求婚']);
    else if (!state.romance.partnerId && U.age(state) >= 16 && person.affection >= 62) actions.push(['confess', '告白']);
    else if (person.relation === '相亲对象') actions.push(['date', '约会']);
    if (Game.relationshipSecrets.available(state, person)) actions.push(['secret-date', '隐秘约会']);
    return actions;
  }
  function setClassFilter(value) {
    if (['全部', '好友', '高好感', '内向', '外向'].includes(value)) classFilter = value;
  }
  Game.social = Object.freeze({
    archiveSchool, enterSchool, createClassmates, currentClassmates, phoneContacts,
    interact, renderSchool, renderPhone, detailActions, setClassFilter, card,
  });
}(window));
