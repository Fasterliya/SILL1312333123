(function initCareerView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;
  let jobFilter = '全部';
  let cityFilter = '全部';

  function chips(values, selected, attr) {
    return `<nav class="filter-chips">${values.map((value) => (
      `<button class="${selected === value ? 'active' : ''}" ${attr}="${value}">${value}</button>`
    )).join('')}</nav>`;
  }

  function chance(state, job) {
    if (!Game.jobMarket.vacancies(state, job)) return 0;
    return Math.round(Game.careerSystem.applicationChance(state, job).chance * 100);
  }

  function workActions(state) {
    const job = C.jobs.find((item) => item.id === state.career.jobId);
    const actions = job?.freelance
      ? [['create', '发布作品'], ['stream', '直播'], ['sponsor', '商务合作'], ['convention', '参加漫展'], ['promotion', '扩大事业']]
      : [['focus', '专注工作'], ['network', '经营人脉'], ['train', '技能培训'], ['overtime', '项目加班'], ['promotion', '申请加薪']];
    return `<div class="work-actions">${actions.map(([id, label]) => (
      `<button data-work-action="${id}">${label}</button>`)).join('')}</div>`;
  }

  function currentJob(state, money) {
    if (!state.career.job) return '<p class="empty-state">当前没有工作。先筛选方向，再打开职位详情确认应聘。</p>';

    if (Game.economicCareerPanels?.supports(state)) {
      return Game.economicCareerPanels.routePanel(state, money);
    }
    /* welfare姬 — standalone */
    if (state.career.jobId === 'welfare' && Game.welfareCareer) {
      var wHtml = Game.welfareCareer.render(state);
      if (wHtml) return '<section class="career-panel">' + wHtml + '</section>';
    }
    /* vtuber — standalone */
    if (state.career.jobId === 'vtuber') {
      if (!Game.vtuberCareer) return '<section class="career-panel"><p class="empty-state">虚拟主播系统未加载。</p></section>';
      try {
        var vHtml = Game.vtuberCareer.render(state);
        if (vHtml) return '<section class="career-panel">' + vHtml + '</section>';
        return '<section class="career-panel"><p class="empty-state">vtuber render返回空。</p></section>';
      } catch (e) {
        return '<section class="career-panel"><p class="empty-state">vtuber错误: ' + (e.message||'') + '</p></section>';
      }
    }
    /* coser — standalone */
    if (state.career.jobId === 'coser') {
      if (!Game.coserCareer) return '<section class="career-panel"><p class="empty-state">Coser系统未加载。</p></section>';
      try {
        var cHtml = Game.coserCareer.render(state);
        if (cHtml) return '<section class="career-panel">' + cHtml + '</section>';
        return '<section class="career-panel"><p class="empty-state">coser render返回空。</p></section>';
      } catch (e) {
        return '<section class="career-panel"><p class="empty-state">coser错误: ' + (e.message||'') + '</p></section>';
      }
    }
    /* Route to career panels */
    if (Game.careerPanels) return Game.careerPanels.routePanel(state, money);

    // Fallback: original logic
    const creator = Game.creatorCareer.isCreator(state);
    const idol = Game.idolSystem?.isIdolJob(state.career.jobId);
    const specialJob = creator || idol;
    const title = specialJob ? state.career.job
      : `${Game.careerGrowth.titleName(state)} · 薪级P${state.career.level + 1}`;
    const detail = idol ? '偶像生涯随粉丝、训练与考评变化'
      : (creator ? '频道收入随播放、粉丝与合作变化'
      : `绩效 ${state.career.performance} · 经验 ${state.career.exp} · ${state.career.titleTrack === 'staff' ? '待选择晋升方向' : '已进入晋升序列'}`);
    const base = `<section class="career-current"><span>${state.career.company || '当前单位'}</span>
      <strong>${title}</strong><b>${money(state.career.salary)}/月</b><small>${detail}</small></section>`;
    if (idol) return base + (Game.idolSystem.render(state) || '');
    if (creator) return base + Game.creatorCareer.render(state);
    return `${base}${workActions(state)}${Game.workplace.render(state)}${Game.careerSpecialties.render(state)}`;
  }

  function companyDirectory(state) {
    if (Game.companyDirectoryView) return Game.companyDirectoryView.render(state);
    const jobs = Game.careerSystem.board(state);
    const counts = jobs.reduce((items, job) => items.set(
      job.companyId, (items.get(job.companyId) || 0) + 1,
    ), new Map());
    const companies = Game.companyCatalog.inCity(state.location.city);
    return `<details class="company-directory"><summary>本地特色公司 · ${companies.length}家</summary>
      <div>${companies.map((company) => (
        `<article><strong>${company.name}</strong><span>${company.specialty} ·
        ${counts.get(company.id) || company.positions.length}个职位</span></article>`
      )).join('')}</div></details>`;
  }

  function renderCareer(state, money) {
    const available = Game.careerSystem.board(state);
    const filters = ['全部', '可应聘', '适配', ...new Set(available.map((job) => job.industry))];
    if (!filters.includes(jobFilter)) jobFilter = '全部';
    const jobs = available.filter((job) => jobFilter === '全部'
      || (jobFilter === '可应聘' && Game.careerSystem.eligible(state, job))
      || (jobFilter === '适配' && (job.majors.includes(state.education.major) || job.recommendedGender === state.gender))
      || job.industry === jobFilter);
    const level = Game.careerSystem.qualification(state);
    const guide = `<section class="list-guide career-guide"><strong>当前资格：${Game.careerSystem.qualificationLabel(level)}</strong>
      <span>学历只决定能否投递；岗位空缺、能力与竞争强度共同决定录取。</span></section>`;
    const cards = jobs.length ? jobs.map((job) => {
      const locked = !Game.careerSystem.eligible(state, job);
      const market = Game.jobMarket.summary(state, job);
      return `<article class="job-card ${locked ? 'locked' : ''}">
        <div><strong>${job.name}</strong><span>${job.company} · ${job.industry}</span>
        <small>${Game.careerSystem.requirementLabel(job.education || 0)} · 空缺${market.vacancies}/${market.demand}
        · ${market.competition} · 录取率${chance(state, job)}%</small></div>
        <b>${money(job.salary)}</b>
        <button data-job-detail="${job.id}">${locked ? '门槛' : '查看'}</button></article>`;
    }).join('') : '<p class="empty-state">当前筛选没有职位。</p>';
    const companies = Game.companyCatalog.inCity(state.location.city).length;
    return `${currentJob(state, money)}${companyDirectory(state)}${guide}${chips(filters, jobFilter, 'data-job-filter')}
      <div class="market-title">${state.location.city} · ${companies}家公司 · ${jobs.length}个职位</div>
      <div class="job-list">${cards}</div>`;
  }

  function duties(job) {
    if (job.industry === '内容创作') return '策划选题、制作合法合规内容、维护社群并承接合作';
    if (job.industry === '技能服务') return '完成实操任务、维护设备或客户服务，并持续提升技能等级';
    if (job.industry === '会展活动') return '协调摊位、舞台、嘉宾与观众动线，保障活动落地';
    return `承担${job.category}方向的日常项目、协作与绩效目标`;
  }

  function openJob(state, id) {
    const job = Game.careerSystem.board(state).find((item) => item.id === id);
    if (!job) return;
    const company = Game.companyCatalog.find(job.companyId);
    const allowed = Game.careerSystem.eligible(state, job);
    const market = Game.jobMarket.summary(state, job);
    const facts = [
      ['公司/主体', job.company], ['母公司/集团', company?.parent || job.parentCompany || '独立单位'],
      ['工作方式', job.freelance ? '自由职业' : '单位岗位'],
      ['所在城市', state.location.city], ['参考月收入', Game.view.money(job.salary)],
      ['学历要求', Game.careerSystem.requirementLabel(job.education || 0)],
      ['当前资格', Game.careerSystem.qualificationLabel(Game.careerSystem.qualification(state))],
      ['岗位需求', `${market.demand}人`], ['当前在岗', `${market.occupied}人`],
      ['剩余空缺', `${market.vacancies}人 · ${market.competition}`],
      ['参考录取率', `${chance(state, job)}%`], ['主要职责', duties(job)],
    ];
    Game.navigation.openDetail(job.name, `<section class="job-detail-head"><p>${job.industry}</p>
      <h3>${job.name}</h3><span>${job.company}</span></section>
      <section class="detail-facts">${facts.map(([label, value]) => (
        `<div><span>${label}</span><strong>${value}</strong></div>`)).join('')}</section>
      <section class="job-apply-bar"><button data-job-apply="${job.id}" ${allowed && market.vacancies ? '' : 'disabled'}>
      ${!allowed ? '当前资格不足' : (market.vacancies ? '确认应聘' : '岗位已饱和')}</button></section>`, 'job');
  }

  function renderCities(state) {
    const filters = ['全部', ...new Set(C.cities.map((city) => city.country)), '核心城市', '低成本'];
    const cities = C.cities.filter((city) => cityFilter === '全部' || city.country === cityFilter
      || (cityFilter === '核心城市' && city.tier === 1) || (cityFilter === '低成本' && city.cost <= 9000));
    return Game.cityLife.render(state) + chips(filters, cityFilter, 'data-city-filter') + cities.map((city) => (
      `<article class="city-row ${city.city === state.location.city ? 'current' : ''}">
        <div><strong>${city.city}</strong><span>${city.country} · ${city.province} · ${city.tier === 1 ? '核心城市' : '发展城市'}
        · ${Game.worldCulture.format(city.cost, city.country)}</span></div>
        <b>${Game.view.money(city.cost)}</b>
        <button data-city="${city.city}" ${city.city === state.location.city ? 'disabled' : ''}>迁居</button></article>`
    )).join('');
  }

  function setJobFilter(value) { jobFilter = value; }
  function setCityFilter(value) { cityFilter = value; }

  Game.careerView = Object.freeze({ renderCareer, renderCities, openJob, setJobFilter, setCityFilter });
}(window));
