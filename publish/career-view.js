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
    return Math.round(U.clamp(0.18 + (Game.careerSystem.ability(state, job) - job.need) / 105, 0.08, 0.92) * 100);
  }

  function workActions(state) {
    const job = C.jobs.find((item) => item.id === state.career.jobId);
    const actions = job?.freelance
      ? [['create', '发布作品'], ['stream', '直播'], ['sponsor', '商务合作'], ['convention', '参加漫展'], ['promotion', '扩大事业']]
      : [['focus', '专注工作'], ['network', '经营人脉'], ['train', '技能培训'], ['overtime', '项目加班'], ['promotion', '申请晋升']];
    return `<div class="work-actions">${actions.map(([id, label]) => (
      `<button data-work-action="${id}">${label}</button>`)).join('')}</div>`;
  }

  function currentJob(state, money) {
    if (!state.career.job) return '<p class="empty-state">当前没有工作。先筛选方向，再打开职位详情确认应聘。</p>';
    return `<section class="career-current"><span>${state.career.company || '当前单位'}</span>
      <strong>${state.career.job} · L${state.career.level + 1}</strong><b>${money(state.career.salary)}/月</b>
      <small>绩效 ${state.career.performance} · 经验 ${state.career.exp}</small></section>${workActions(state)}
      ${Game.careerSpecialties.render(state)}`;
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
      <span>先按行业或资格筛选，再点击职位查看职责、门槛与录取率。</span></section>`;
    const cards = jobs.length ? jobs.map((job) => {
      const locked = !Game.careerSystem.eligible(state, job);
      return `<article class="job-card ${locked ? 'locked' : ''}">
        <div><strong>${job.name}</strong><span>${job.company} · ${job.industry}</span>
        <small>${Game.careerSystem.requirementLabel(job.education || 0)} · 录取率${chance(state, job)}%</small></div>
        <b>¥${job.salary.toLocaleString()}</b>
        <button data-job-detail="${job.id}">${locked ? '门槛' : '查看'}</button></article>`;
    }).join('') : '<p class="empty-state">当前筛选没有职位。</p>';
    return `${currentJob(state, money)}${guide}${chips(filters, jobFilter, 'data-job-filter')}
      <div class="market-title">${state.location.city} · ${jobs.length}个职位</div><div class="job-list">${cards}</div>`;
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
    const allowed = Game.careerSystem.eligible(state, job);
    const facts = [
      ['公司/主体', job.company], ['工作方式', job.freelance ? '自由职业' : '单位岗位'],
      ['所在城市', state.location.city], ['参考月收入', `¥${job.salary.toLocaleString()}`],
      ['学历要求', Game.careerSystem.requirementLabel(job.education || 0)],
      ['当前资格', Game.careerSystem.qualificationLabel(Game.careerSystem.qualification(state))],
      ['参考录取率', `${chance(state, job)}%`], ['主要职责', duties(job)],
    ];
    const note = job.adultOnly
      ? '<p class="job-note">仅限18岁以上角色，内容限定为非露骨、合法合规的成年写真创作。</p>' : '';
    Game.navigation.openDetail(job.name, `<section class="job-detail-head"><p>${job.industry}</p>
      <h3>${job.name}</h3><span>${job.company}</span></section>
      <section class="detail-facts">${facts.map(([label, value]) => (
        `<div><span>${label}</span><strong>${value}</strong></div>`)).join('')}</section>${note}
      <section class="job-apply-bar"><button data-job-apply="${job.id}" ${allowed ? '' : 'disabled'}>
      ${allowed ? '确认应聘' : '当前资格不足'}</button></section>`, 'job');
  }

  function renderCities(state) {
    const filters = ['全部', ...new Set(C.cities.map((city) => city.country)), '核心城市', '低成本'];
    const cities = C.cities.filter((city) => cityFilter === '全部' || city.country === cityFilter
      || (cityFilter === '核心城市' && city.tier === 1) || (cityFilter === '低成本' && city.cost <= 9000));
    return Game.cityLife.render(state) + chips(filters, cityFilter, 'data-city-filter') + cities.map((city) => (
      `<article class="city-row ${city.city === state.location.city ? 'current' : ''}">
        <div><strong>${city.city}</strong><span>${city.country} · ${city.province} · ${city.tier === 1 ? '核心城市' : '发展城市'}
        · ${Game.worldCulture.format(city.cost, city.country)}</span></div>
        <b>¥${city.cost.toLocaleString()}</b>
        <button data-city="${city.city}" ${city.city === state.location.city ? 'disabled' : ''}>迁居</button></article>`
    )).join('');
  }

  function setJobFilter(value) { jobFilter = value; }
  function setCityFilter(value) { cityFilter = value; }

  Game.careerView = Object.freeze({ renderCareer, renderCities, openJob, setJobFilter, setCityFilter });
}(window));
