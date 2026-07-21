(function initCompanyDirectoryView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function jobsFor(state, companyId) {
    return Game.careerSystem.board(state).filter((job) => job.companyId === companyId);
  }

  function totals(state, jobs) {
    return jobs.reduce((result, job) => {
      const market = Game.jobMarket.summary(state, job);
      result.demand += market.demand;
      result.occupied += market.occupied;
      result.vacancies += market.vacancies;
      return result;
    }, { demand: 0, occupied: 0, vacancies: 0 });
  }

  function render(state) {
    const companies = Game.companyCatalog.inCity(state.location.city);
    return `<details class="company-directory"><summary>
      <span>本地特色公司</span><small>${companies.length}家公司 · 查询岗位与在职角色</small>
    </summary><div class="company-directory-list">${companies.map((company) => {
      const jobs = jobsFor(state, company.id);
      const count = totals(state, jobs);
      const rate = count.demand ? Math.round(count.occupied / count.demand * 100) : 0;
      return `<button type="button" class="company-directory-row" data-company-directory="${escape(company.id)}">
        <div><strong>${escape(company.name)}</strong><span>${escape(company.specialty)}</span>
          <i><b style="width:${Math.min(100, rate)}%"></b></i></div>
        <small>在岗 ${count.occupied}/${count.demand}<br>${count.vacancies ? `空缺 ${count.vacancies}` : '已饱和'}</small>
        <b aria-hidden="true">›</b></button>`;
    }).join('')}</div></details>`;
  }

  function workerRows(state, job) {
    const rows = Game.jobMarket.workers(state, job).map((person) => (
      `<button type="button" class="company-worker" data-character-id="${escape(person.id)}">
        <span>${escape(person.name)}</span>
        <small>${Game.content.personAge(state, person)}岁 · ${escape(person.departmentName || job.name)}</small>
        <b>档案</b></button>`
    ));
    if (state.career.jobId === job.id && state.career.company === job.company) {
      rows.unshift(`<div class="company-worker player-worker">
        <span>${escape(state.name)}（你）</span><small>${escape(job.name)} · 当前在职</small><b>本人</b></div>`);
    }
    return rows.length ? rows.join('') : '<p class="empty-state small">当前没有已登记的在职角色。</p>';
  }

  function position(state, job) {
    const market = Game.jobMarket.summary(state, job);
    const rate = market.demand ? Math.round(market.occupied / market.demand * 100) : 0;
    return `<section class="company-position">
      <header><div><strong>${escape(job.name)}</strong>
        <span>${Game.careerSystem.requirementLabel(job.education || 0)} · ${Game.view.money(job.salary)}/月</span></div>
        <b class="${market.vacancies ? '' : 'full'}">${market.occupied}/${market.demand}</b></header>
      <div class="position-capacity"><i><b style="width:${Math.min(100, rate)}%"></b></i>
        <span>${market.vacancies ? `剩余${market.vacancies}人 · ${market.competition}` : '岗位已饱和'}</span></div>
      <div class="company-workers">${workerRows(state, job)}</div>
    </section>`;
  }

  function open(state, companyId) {
    const company = Game.companyCatalog.find(companyId);
    if (!company || company.city !== state.location.city) return false;
    const jobs = jobsFor(state, companyId);
    const count = totals(state, jobs);
    Game.navigation.openDetail(company.name, `<section class="company-query-head">
      <span>${escape(company.city)} · ${escape(company.industry)}</span><h3>${escape(company.name)}</h3>
      <p>${escape(company.specialty)}</p>
      <div><strong>${count.occupied}/${count.demand}</strong><small>总在岗 / 总需求</small>
      <strong>${count.vacancies}</strong><small>当前空缺</small></div></section>
      <div class="company-position-list">${jobs.map((job) => position(state, job)).join('')
        || '<p class="empty-state">当前没有公开岗位。</p>'}</div>`, 'company');
    return true;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-company-directory]');
    if (!button) return false;
    const state = Game._getState?.();
    return state ? open(state, button.dataset.companyDirectory) : false;
  }

  Game.companyDirectoryView = Object.freeze({ render, open, handleClick });
}(window));
