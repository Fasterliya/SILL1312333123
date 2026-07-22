(function initCareerOfficePanel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const legacy = Game.careerPanels;
  const U = Game.content;

  function tabBar() {
    return `<nav class="filter-chips">${['工作', '晋升', '同事', '职业规划'].map((tab, index) => (
      `<button class="${index ? '' : 'active'}" data-career-tab="${tab}">${tab}</button>`
    )).join('')}</nav>`;
  }

  function metric(label, value) {
    return `<div><span>${label}</span><strong>${value}</strong></div>`;
  }

  function workTab(state, money) {
    const job = Game.config.jobs.find((item) => item.id === state.career.jobId);
    const freelance = Boolean(job?.freelance);
    const actions = freelance
      ? [['create', '发布作品'], ['stream', '直播'], ['sponsor', '商务合作'], ['convention', '参加漫展']]
      : [['focus', '专注工作'], ['network', '经营人脉'], ['train', '技能培训'], ['overtime', '项目加班']];
    const performance = Number(state.career.performance) || 0;
    return `<section class="work-dashboard"><div class="work-metrics">
      ${metric('当前月薪', money(state.career.salary || 0))}
      ${metric('当前绩效', `${performance} / 100`)}
      ${metric('累计经验', String(state.career.exp || 0))}
      ${metric('当前职级', Game.careerGrowth?.titleName(state) || state.career.job)}
      </div><div class="progress-bar"><i style="width:${U.clamp(performance, 0, 100)}%"></i>
      <span>${performance}%</span></div><div class="work-actions">${actions.map(([id, label]) => (
        `<button data-work-action="${id}">${label}</button>`
      )).join('')}</div></section>`;
  }

  function promotionTab(state) {
    const info = Game.careerLadders.status(state);
    if (!info) {
      return '<section class="promotion-ladder"><p class="empty-state">当前职业暂无办公室晋升阶梯。</p></section>';
    }
    const rule = info.rule;
    const ladder = info.ladder.map((title, index) => {
      const className = index < info.rank ? 'done' : index === info.rank ? 'current' : 'future';
      return `<li class="ladder-step ${className}"><span class="ladder-dot"></span>
        <strong>${title}</strong>${index === info.rank ? '<small>当前</small>' : ''}</li>`;
    }).join('');
    if (!rule) {
      return `<section class="promotion-ladder"><div class="promotion-current">
        <strong>${info.title}</strong><small>${info.line}线 · 已达最高职级</small>
        </div><ol class="ladder-list">${ladder}</ol></section>`;
    }
    const perfOk = state.career.performance >= rule.performance;
    const expOk = state.career.exp >= rule.exp;
    const tenureOk = info.tenure >= rule.years * 12;
    const educationOk = info.nextRank <= info.ceiling;
    const mark = (ok) => ok ? '✓' : '✗';
    return `<section class="promotion-ladder"><div class="promotion-current">
      <strong>${info.title}</strong><small>${info.line}线 · 学历最高可到L${info.ceiling}</small></div>
      <div class="promotion-next"><span>下一级：${info.nextTitle}</span>
      <div class="promotion-conditions">
        <span>绩效 <b>${rule.performance}</b> ${mark(perfOk)}</span>
        <span>经验 <b>${rule.exp}</b> ${mark(expOk)}</span>
        <span>年资 <b>${rule.years}年</b> ${mark(tenureOk)}</span>
        <span>学历天花板 ${mark(educationOk)}</span>
      </div><span class="promotion-prob">评审通过率 <b>${Math.round(info.chance * 100)}%</b></span>
      </div><ol class="ladder-list">${ladder}</ol><div class="system-actions">
      <button data-workplace-action="promote-industry"${info.eligible ? '' : ' disabled'}>申请职级晋升</button>
      </div></section>`;
  }

  function personRow(person, role) {
    if (!person) return '';
    const avatar = Game.portraitSystem?.avatar(person) || '';
    return `<button class="relation-link" type="button" data-character-id="${person.id}">
      <span class="relation-avatar">${avatar}</span><span class="relation-kind">${role}</span>
      <strong>${person.name}</strong><small>${person.job || person.departmentName || '同事'}</small>
    </button>`;
  }

  function colleaguesTab(state) {
    const workplace = state.workplace;
    if (!workplace?.companyId) {
      return '<section class="org-chart"><p class="empty-state">当前没有单位同事信息。</p></section>';
    }
    const leader = Game.people?.find(state, workplace.leaderId);
    const roster = (workplace.rosterIds || []).map((id) => Game.people?.find(state, id)).filter(Boolean);
    const reports = roster.filter((person) => person.managerId === 'player-profile');
    const peers = roster.filter((person) => person.id !== leader?.id
      && person.managerId !== 'player-profile').slice(0, 6);
    return `<section class="org-chart"><h4>组织架构</h4>
      <div class="org-section"><h5>直属领导</h5><div class="relation-links">
        ${personRow(leader, '领导') || '<p class="empty-state">暂无领导信息</p>'}</div></div>
      <div class="org-section"><h5>直属下属</h5><div class="relation-links">
        ${reports.map((person) => personRow(person, '下属')).join('')
          || '<p class="empty-state">晋升管理岗位后可带领下属。</p>'}</div></div>
      <div class="org-section"><h5>平级同事</h5><div class="relation-links">
        ${peers.map((person) => personRow(person, '同事')).join('')
          || '<p class="empty-state">暂无同事信息。</p>'}</div></div></section>`;
  }

  function officePanel(state, money) {
    return `<div class="career-panel">${tabBar()}
      <div class="career-panel-tab" data-panel-tab="工作">${workTab(state, money)}</div>
      <div class="career-panel-tab" data-panel-tab="晋升" style="display:none">${promotionTab(state)}</div>
      <div class="career-panel-tab" data-panel-tab="同事" style="display:none">${colleaguesTab(state)}</div>
      <div class="career-panel-tab" data-panel-tab="职业规划" style="display:none">
        ${Game.careerHistory.render(state)}</div></div>`;
  }

  function usesLegacyPanel(state) {
    if (state.companyCreationStage?.active) return true;
    const jobId = state.career.jobId || '';
    if (['pimp', 'blackmarket', 'prostitute', 'welfare', 'idol-underground', 'magicalgirl'].includes(jobId)) return true;
    if (Game.idolSystem?.isIdolJob?.(jobId)) return true;
    return Boolean(Game.creatorCareer?.isCreator?.(state));
  }

  function routePanel(state, money) {
    if (state.career.jobId === 'pimp') {
      return `<div class="career-special-stack">${Game.specialCareerRanks.render(state)}
        ${legacy.routePanel(state, money)}</div>`;
    }
    return !state.career.jobId || usesLegacyPanel(state)
      ? legacy.routePanel(state, money) : officePanel(state, money);
  }

  Game.careerPanels = Object.freeze({
    ...legacy,
    officePanel,
    routePanel,
  });
}(window));
