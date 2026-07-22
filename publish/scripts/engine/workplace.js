(function initWorkplace(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const departments = {
    科学: '研发与技术部', 文学: '研究与内容部', 艺术: '创意设计部',
    运动: '训练与赛事部', 社交: '客户与项目部', 商业: '运营管理部',
  };

  function departmentName(job) {
    return departments[job?.category] || `${job?.industry || '综合'}事业部`;
  }

  function departmentId(job) {
    return `${job?.companyId || job?.company || 'company'}-${job?.category || 'general'}`;
  }

  function addWorld(state, person) {
    if (!state.worldPeople.some((item) => item.id === person.id)) state.worldPeople.push(person);
    Game.systemsState.ensurePerson(state, person);
    return person;
  }

  function assign(state, person, job, rank, relation) {
    person.relation = relation || person.relation;
    person.job = rank >= 2 ? `${departmentName(job)}主管` : job.name;
    person.company = job.company;
    person.companyId = job.companyId || job.company;
    person.departmentId = departmentId(job);
    person.departmentName = departmentName(job);
    person.careerCity = state.location.city;
    person.currentCity = state.location.city;
    person.careerRank = rank;
    person.phoneUnlocked = true;
    return person;
  }

  function makeWorker(state, job, rank, relation) {
    const age = Math.max(20, U.age(state) + U.between(rank >= 2 ? 3 : -4, rank >= 2 ? 16 : 8));
    const person = U.person(relation, U.random(Game.nameSystem.surnames()), age, null, state.totalMonths);
    const culture = Game.worldCulture.populationCulture(state.location.country);
    Game.worldCulture.applyPerson(person, culture);
    U.setUniqueName(state, person, Game.worldCulture.profile(culture).locale);
    assign(state, person, job, rank, relation);
    Game.npcLife.syncGrowth(state, person);
    return addWorld(state, person);
  }

  function alumniCandidate(state) {
    return Game.people.all(state).find((person) => (
      person.status === '健康' && person.currentCity === state.location.city
      && (person.relation === '校友' || person.schoolHistory?.length)
      && U.personAge(state, person) >= 20 && !person.companyId
    )) || null;
  }

  function join(state, job) {
    leave(state);
    const roster = [];
    let leader = Math.random() < 0.45 ? alumniCandidate(state) : null;
    if (leader) assign(state, leader, job, Math.max(2, state.career.level + 1), leader.relation);
    else leader = makeWorker(state, job, Math.max(2, state.career.level + 1), '直属领导');
    roster.push(leader);
    for (let index = 0; index < 6; index += 1) {
      roster.push(makeWorker(state, job, Math.max(0, state.career.level + U.between(-1, 1)), '同事'));
    }
    leader.reportIds = roster.slice(1).map((person) => person.id);
    roster.slice(1).forEach((person) => { person.managerId = leader.id; });
    state.workplace = {
      companyId: job.companyId || job.company,
      departmentId: departmentId(job),
      leaderId: leader.id,
      rosterIds: roster.map((person) => person.id),
      reportIds: [],
    };
    Game.socialWorld.rebuild(state);
  }

  function leave(state) {
    const workplace = state.workplace;
    if (workplace?.rosterIds?.length) {
      const leader = Game.people.find(state, workplace.leaderId);
      const reports = workplace.rosterIds.filter((id) => id !== workplace.leaderId);
      workplace.rosterIds.forEach((id) => {
        const person = Game.people.find(state, id);
        if (person?.managerId === 'player-profile') person.managerId = workplace.leaderId;
      });
      if (leader) leader.reportIds = reports;
    }
    state.workplace = { companyId: null, departmentId: null, leaderId: null, rosterIds: [], reportIds: [] };
  }

  function roster(state) {
    return (state.workplace?.rosterIds || []).map((id) => Game.people.find(state, id)).filter(Boolean);
  }

  function assignReports(state) {
    const people = roster(state).filter((person) => person.id !== state.workplace.leaderId);
    const count = Math.min(4, Math.max(2, state.career.level));
    const reports = people.slice(0, count);
    reports.forEach((person) => { person.managerId = 'player-profile'; });
    state.workplace.reportIds = reports.map((person) => person.id);
    const leader = Game.people.find(state, state.workplace.leaderId);
    if (leader) leader.reportIds = (leader.reportIds || []).filter((id) => !state.workplace.reportIds.includes(id));
  }

  function act(state, action) {
    if (!state.career.job) return { ok: false, message: '当前没有工作' };
    if (action === 'promote-industry') return Game.careerGrowth.requestTitle(state, 'industry');
    if (action === 'lead') return Game.careerGrowth.requestTitle(state, 'management');
    if (action === 'promote-management') return Game.careerGrowth.requestTitle(state, 'management');
    if (action === 'promote-professional') return Game.careerGrowth.requestTitle(state, 'professional');
    return { ok: false, message: '没有这个职场行动' };
  }

  function onTitlePromotion(state) {
    if (state.career.management) assignReports(state);
  }

  function personLink(person, label) {
    return `<button class="relation-link" type="button" data-character-id="${person.id}">
      <span class="relation-avatar">${Game.portraitSystem.avatar(person)}</span>
      <span class="relation-kind">${label}</span><strong>${person.name}</strong>
      <small>${person.job || person.departmentName}</small></button>`;
  }

  function render(state) {
    if (!state.career.job || !state.workplace?.companyId) return '';
    const people = roster(state);
    const leader = Game.people.find(state, state.workplace.leaderId);
    const peers = people.filter((person) => person.id !== leader?.id).slice(0, 6);
    const track = state.career.titleTrack;
    const options = Game.careerLadders
      ? [['promote-industry', '申请职级晋升']]
      : (track === 'staff'
        ? [['promote-management', '申请管理提拔'], ['promote-professional', '申请专业晋级']]
        : [[`promote-${track}`, `申请${track === 'management' ? '管理提拔' : '专业晋级'}`]]);
    const management = `<div class="system-actions">${options.map(([id, label]) => (
      `<button data-workplace-action="${id}">${label}</button>`
    )).join('')}</div><p class="system-note">${Game.careerGrowth.titleName(state)}
      ${state.career.management ? ` · 直属下属 ${state.workplace.reportIds.length} 人` : ''}</p>`;
    return `<details class="system-fold" open><summary>${departmentName(
      Game.config.jobs.find((job) => job.id === state.career.jobId),
    )} · ${people.length}人</summary><div class="relation-links">
      ${leader ? personLink(leader, '领导') : ''}${peers.map((person) => personLink(person, '同事')).join('')}
      </div>${management}</details>`;
  }

  function personSection(state, person) {
    if (!person.companyId) return '';
    const manager = person.managerId === 'player-profile' ? null : Game.people.find(state, person.managerId);
    const reports = (person.reportIds || []).map((id) => Game.people.find(state, id)).filter(Boolean);
    const rows = `${person.managerId === 'player-profile'
      ? '<div class="workplace-player-link"><span>直属领导</span><strong>你</strong></div>'
      : (manager ? personLink(manager, '直属领导') : '')}${reports.map((item) => personLink(item, '下属')).join('')}`;
    return `<details class="record-section"><summary><span>公司关系</span>
      <small>${person.company} · ${person.departmentName || '部门'}</small></summary>
      <div class="relation-links">${rows || '<p class="empty-state">暂无上下级关系记录。</p>'}</div></details>`;
  }

  Game.workplace = Object.freeze({
    departmentId, departmentName, join, leave, act, onTitlePromotion, render, personSection,
  });
}(window));
