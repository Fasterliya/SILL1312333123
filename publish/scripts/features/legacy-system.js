(function initLegacySystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function children(state) {
    return state.family.filter((person) => (
      ['儿子', '女儿'].includes(person.relation) && person.status === '健康'
    ));
  }

  function ancestor(state, cause) {
    return {
      name: state.name, gender: state.gender, birthMonth: state.playerBornAt,
      deathMonth: state.totalMonths, age: U.age(state), cause,
      job: state.career.job || (state.health.retired ? '退休生活' : '未记录'),
      money: state.money, house: state.assets.house?.name || '无房产',
      generation: state.generation, portraitUrl: state.profile.portraitUrl || null,
    };
  }

  function prepareDeath(state, cause) {
    if (state.pendingDecision || state.gameOver) return;
    const heirs = children(state);
    if (!heirs.length) {
      state.legacy.ancestors.push(ancestor(state, cause));
      state.legacy.ancestors = state.legacy.ancestors.slice(-12);
      state.legacy.ending = { cause, age: U.age(state), month: state.totalMonths };
      state.gameOver = true;
      Game.lifeDirector.addLog(state, '人生终章', `你在${U.age(state)}岁走完人生，没有留下可接续的子代。`, 'milestone');
      return;
    }
    state.pendingDecision = { type: 'succession', cause, heirs: heirs.map((item) => item.id) };
    Game.lifeDirector.addLog(state, '家庭延续', '生命走到终点，下一代将继续书写新的生活。', 'milestone');
  }

  function education(child, age) {
    const stage = child.educationStage || (age < 6 ? 'home' : (age < 18 ? 'high' : 'graduate'));
    return {
      study: Math.round(child.upbringing?.education || 20), track: null, electives: [],
      school: child.educationName || (age < 3 ? '家中' : '已毕业'), schoolStage: stage,
      highSchoolType: null, vocationalMajor: null, path: age >= 22 ? '已完成教育' : '成长教育',
      university: stage === 'university' ? child.educationName : null, universityType: null,
      major: null, graduated: age >= 22, exams: [],
    };
  }

  function career(state, child, age) {
    const source = Game.config.jobs.find((item) => item.name === child.job);
    if (age < 18 || !source || child.job?.startsWith('退休')) {
      return { job: null, jobId: null, company: null, salary: 0, level: 0, exp: 0,
        performance: 0, lastPromotionMonth: -12, applications: [] };
    }
    return { job: source.name, jobId: source.id, company: child.company || source.company,
      salary: source.salary, level: 0, exp: 12, performance: 25,
      lastPromotionMonth: state.totalMonths - 6, applications: [] };
  }

  function deceasedParent(state, record, profile) {
    const person = clone(profile);
    Object.assign(person, {
      id: `ancestor-${record.generation}-${record.deathMonth}`, name: record.name,
      relation: record.gender === '男' ? '父亲' : '母亲', gender: record.gender,
      birthMonth: record.birthMonth, status: '已故', affection: 90, job: record.job,
      memories: [{ kind: '传承', text: '将家庭人生交给了下一代', month: record.deathMonth,
        generation: record.generation }], trust: 100, conflict: 0,
    });
    return person;
  }

  function normalizeFamily(state, heir, record, oldProfile) {
    const partnerId = state.romance.partnerId;
    const family = state.family.filter((person) => person.id !== heir.id);
    family.forEach((person) => {
      if (person.id === partnerId) person.relation = person.gender === '男' ? '父亲' : '母亲';
      else if (['儿子', '女儿'].includes(person.relation)) {
        const older = person.birthMonth < heir.birthMonth;
        person.relation = person.gender === '男' ? (older ? '哥哥' : '弟弟') : (older ? '姐姐' : '妹妹');
      } else if (person.relation === '父亲') person.relation = '祖父';
      else if (person.relation === '母亲') person.relation = '祖母';
    });
    family.push(deceasedParent(state, record, oldProfile));
    return family;
  }

  function addHeirHousehold(state, heir) {
    if (!heir.npcMarried || !heir.spouseName) return;
    const spouseGender = heir.gender === '男' ? '女' : '男';
    const spouse = U.person('配偶', '', Math.max(20, U.personAge(state, heir) + U.between(-3, 3)),
      spouseGender, state.totalMonths);
    spouse.name = heir.spouseName;
    spouse.affection = 72;
    state.family.push(spouse);
    const identity = Game.familyNaming.forPlayer(state, spouse);
    for (let index = 0; index < Math.min(3, heir.childrenCount || 0); index += 1) {
      const gender = U.random(['男', '女']);
      const child = U.person(gender === '男' ? '儿子' : '女儿', identity.surname,
        Math.max(0, U.personAge(state, heir) - 24 - index * 2), gender, state.totalMonths);
      Game.familyNaming.assign(state, child, identity);
      Game.genetics.inheritInto(child, gender, state.profile, spouse, `legacy-child-${child.id}`);
      Game.systemsState.ensurePerson(state, child);
      state.family.push(child);
    }
    state.romance = { partnerId: spouse.id, married: true, pendingBirth: 0 };
  }

  function resolve(state, heirId) {
    const heir = children(state).find((item) => item.id === heirId);
    if (!heir || state.pendingDecision?.type !== 'succession') return { ok: false, message: '继承人已不可用' };
    const cause = state.pendingDecision.cause || '自然衰老';
    const record = ancestor(state, cause);
    const oldProfile = clone(state.profile);
    const inherited = Math.max(0, Math.round(state.money * 0.7));
    const age = U.personAge(state, heir);
    Game.relationshipSecrets.archivePlayer(state, `ancestor-${record.generation}-${record.deathMonth}`);
    state.legacy.ancestors.push(record);
    state.legacy.ancestors = state.legacy.ancestors.slice(-12);
    state.legacy.inheritedMoney += inherited;
    state.family = normalizeFamily(state, heir, record, oldProfile);
    state.contacts = [];
    state.matchmaking = { candidates: [] };
    state.travel = { activeId: null, encounters: [], journey: null,
      history: state.travel.history || [] };
    state.name = heir.name;
    state.surname = heir.surname || Game.familyNaming.surnameOf(heir, state.surname, heir.culture);
    state.gender = heir.gender;
    state.playerBornAt = heir.birthMonth;
    state.profile = clone(heir);
    state.profile.id = 'player-profile';
    state.profile.styleStage = -1;
    state.stats = {
      健康: U.clamp(Math.round(heir.stats?.健康 || 45 + (heir.upbringing?.health || 50) * 0.45), 0, 100),
      心情: U.clamp(Math.round(40 + heir.affection * 0.4), 0, 100),
      智力: U.clamp(Math.round(heir.stats?.智力 || 35 + (heir.upbringing?.education || 30) * 0.5), 0, 100),
      魅力: U.clamp(Math.round(heir.stats?.魅力 || 40 + (heir.upbringing?.independence || 30) * 0.35), 0, 100),
      力量: U.clamp(Math.round(heir.stats?.力量 || 45 + (heir.upbringing?.health || 30) * 0.35), 0, 100),
    };
    state.money = inherited;
    state.education = education(heir, age);
    state.career = career(state, heir, age);
    state.romance = { partnerId: null, married: false, pendingBirth: 0 };
    state.health = { diet: '均衡饮食', sleep: 7, conditions: [], insurance: '基础医保',
      retirementFund: 0, pension: 0, retired: false, careLevel: 0 };
    state.stress = { value: Math.max(0, 70 - Math.round(heir.upbringing?.care || 50)), level: 0 };
    state.parenting = { style: '均衡陪伴', educationFund: 0, focus: '学识' };
    state.eventState = { seen: {}, lastMonth: state.totalMonths - 4,
      history: state.eventState.history || [] };
    state.routine = { actionMonth: state.totalMonths, fatigue: 0,
      actions: { study: 0, sport: 0, social: 0, rest: 0 } };
    state.generation += 1;
    state.pendingDecision = null;
    state.gameOver = false;
    addHeirHousehold(state, heir);
    Game.systemsState.ensure(state);
    Game.characterAttributes.ensurePlayer(state);
    Game.stressSystem.ensure(state);
    Game.healthModel.ensure(state);
    Game.profile.updateGrowth(state);
    Game.npcLife.update(state);
    Game.lifeDirector.addLog(state, `第${state.generation}代人生`,
      `${state.name}承接家庭资产与 ${Game.view.money(inherited)} 资金，开始新的生活。`, 'milestone');
    return { ok: true, message: `已由${state.name}继续下一代人生` };
  }

  function renderDecision(state) {
    const ids = state.pendingDecision?.heirs || [];
    const heirs = children(state).filter((item) => ids.includes(item.id));
    return { title: '选择下一代角色', text: `第${state.generation}代人生已经结束。房产、产业和股票将保留，现金按70%继承。`,
      options: heirs.map((item) => ({ value: item.id,
        label: `${item.name} · ${U.personAge(state, item)}岁 · 关爱${Math.round(item.upbringing?.care || 0)} · 学业${Math.round(item.upbringing?.education || 0)}` })) };
  }

  function render(state) {
    const heirs = children(state);
    const history = state.legacy.ancestors.slice().reverse().map((item) => (
      `<article class="legacy-row"><strong>第${item.generation}代 · ${item.name}</strong>
      <span>${item.age}岁 · ${item.job} · ${item.cause}</span><small>${item.house}</small></article>`
    )).join('');
    return `<section class="legacy-summary"><span>当前第 ${state.generation} 代</span>
      <strong>家庭代际档案</strong><small>累计承接现金 ${Game.view.money(state.legacy.inheritedMoney)} · 可选择下一代 ${heirs.length} 人</small></section>
      <h3>历代家庭成员</h3>${history || '<p class="empty-state">第一代人生仍在书写中。</p>'}`;
  }

  Game.legacySystem = Object.freeze({ prepareDeath, resolve, renderDecision, render });
}(window));
