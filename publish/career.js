(function initCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;
  let jobFilter = '全部';
  let cityFilter = '全部';

  function cityInfo(state) {
    return C.cities.find((item) => item.city === state.location.city)
      || { city: state.location.city, province: state.location.province, country: '华夏', tier: 3, cost: 6000 };
  }

  function board(state) {
    const city = cityInfo(state);
    return C.jobs.filter((job) => city.tier <= job.tier
      && (!job.cities?.length || job.cities.includes(city.city)));
  }

  function traitBoost(state, category) {
    const traits = {
      科学: ['好奇', '细心', '执着'], 文学: ['敏感', '浪漫', '幽默'],
      艺术: ['浪漫', '敏感', '好奇'], 运动: ['勇敢', '自律', '执着'],
      社交: ['随和', '幽默', '勇敢'], 商业: ['务实', '细心', '自律'],
    };
    return traits[category]?.includes(state.profile.trait) ? 12 : 0;
  }

  function ability(state, job) {
    const majorMatch = job.majors.includes(state.education.major) ? 18 : 0;
    const personality = job.category === '社交' && ['外向', '乐观', '热血'].includes(state.profile.personality) ? 6 : 0;
    return state.stats.智力 * 0.55 + state.stats.魅力 * 0.2 + state.education.study * 0.12
      + traitBoost(state, job.category) + majorMatch + personality;
  }

  function apply(state, jobId) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能正式求职' };
    if (state.education.university && !state.education.graduated) return { ok: false, message: '完成大学学业后才能全职求职' };
    const job = board(state).find((item) => item.id === jobId);
    if (!job) return { ok: false, message: '当前城市没有这个岗位' };
    const repeated = state.career.applications.some((item) => item.jobId === jobId && item.month === state.totalMonths);
    if (repeated) return { ok: false, message: '本月已经投递过这个岗位' };
    const chance = U.clamp(0.18 + (ability(state, job) - job.need) / 105, 0.08, 0.92);
    const accepted = Math.random() < chance;
    state.career.applications.push({
      jobId, name: job.name, company: job.company, city: state.location.city,
      month: state.totalMonths, accepted,
    });
    state.career.applications = state.career.applications.slice(-30);
    if (!accepted) {
      Game.lifeDirector.addLog(state, '求职未录取', `${job.company}婉拒了${job.name}申请。`, 'normal');
      return { ok: false, message: `${job.company}未录取，参考概率 ${Math.round(chance * 100)}%` };
    }
    state.career.job = job.name;
    state.career.jobId = job.id;
    state.career.company = job.company;
    state.career.salary = Math.round(job.salary * (cityInfo(state).tier === 1 ? 1.12 : 1));
    state.career.level = 0;
    state.career.exp = 0;
    state.career.performance = 10;
    state.career.lastWorkMonth = -1;
    state.career.lastPromotionMonth = state.totalMonths - 6;
    Game.lifeDirector.addLog(state, '获得工作', `你加入${job.company}担任${job.name}。`, 'milestone');
    return { ok: true, message: `${job.company}录取了你` };
  }

  function work(state, type) {
    if (!state.career.job) return { ok: false, message: '当前没有工作' };
    if (type === 'promotion') return applyPromotion(state);
    if (state.career.lastWorkMonth === state.totalMonths) return { ok: false, message: '本月已经完成过工作行动' };
    const actions = {
      focus: [8, 5, -3, 0, '专注完成关键任务'],
      network: [5, 3, 1, 2, '主动结识同事与合作伙伴'],
      train: [4, 8, -1, 2, '参加培训并提升专业能力'],
      overtime: [12, 7, -6, 0, '加班冲刺重要项目'],
    };
    const [performance, exp, mood, intelligence, label] = actions[type] || actions.focus;
    state.career.lastWorkMonth = state.totalMonths;
    state.career.performance = U.clamp(state.career.performance + performance, 0, 100);
    state.career.exp += exp;
    state.stats.心情 = U.clamp(state.stats.心情 + mood, 0, 100);
    state.stats.智力 = U.clamp(state.stats.智力 + intelligence, 0, 100);
    Game.lifeDirector.addLog(state, '职场行动', label, 'good');
    return { ok: true, message: `${label}，绩效达到 ${state.career.performance}` };
  }

  function applyPromotion(state) {
    if (state.totalMonths - state.career.lastPromotionMonth < 6) return { ok: false, message: '距离上次晋升申请不足6个月' };
    if (state.career.performance < 35) return { ok: false, message: '绩效达到35后才能申请晋升' };
    state.career.lastPromotionMonth = state.totalMonths;
    const chance = U.clamp(0.25 + state.career.performance / 130 + state.career.exp / 500, 0.25, 0.9);
    if (Math.random() >= chance) {
      state.career.performance = Math.max(0, state.career.performance - 8);
      return { ok: false, message: `晋升申请未通过，参考概率 ${Math.round(chance * 100)}%` };
    }
    state.career.level += 1;
    state.career.salary = Math.round(state.career.salary * 1.18);
    state.career.performance = Math.max(10, state.career.performance - 28);
    Game.lifeDirector.addLog(state, '申请晋升成功', `你升至L${state.career.level + 1}，月薪提高。`, 'milestone');
    return { ok: true, message: `晋升成功，月薪 ¥${state.career.salary.toLocaleString()}` };
  }

  function move(state, cityName) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能独立迁居' };
    const city = C.cities.find((item) => item.city === cityName);
    if (!city || city.city === state.location.city) return { ok: false, message: '你已经在这座城市' };
    if (state.money < city.cost) return { ok: false, message: `迁居需要 ¥${city.cost.toLocaleString()}` };
    state.money -= city.cost;
    if (state.career.job && state.career.jobId !== 'freelance') {
      Game.lifeDirector.addLog(state, '离开原岗位', `迁居让你结束了${state.career.company || ''}${state.career.job}的工作。`, 'normal');
      Object.assign(state.career, {
        job: null, jobId: null, company: null, salary: 0, exp: 0,
        performance: 0, lastWorkMonth: -1, lastPromotionMonth: -12,
      });
    }
    state.location = { province: city.province, city: city.city, country: city.country };
    Game.lifeDirector.addLog(state, '迁居新城', `你搬到${city.country}${city.city}寻找新的机会。`, 'milestone');
    return { ok: true, message: `已迁居${city.city}` };
  }

  function filterChips(values, selected, attr) {
    return `<nav class="filter-chips">${values.map((value) => (
      `<button class="${selected === value ? 'active' : ''}" ${attr}="${value}">${value}</button>`
    )).join('')}</nav>`;
  }

  function renderCareer(state, money) {
    const current = state.career.job ? `<section class="career-current"><span>${state.career.company || '当前单位'}</span>
      <strong>${state.career.job} · L${state.career.level + 1}</strong><b>${money(state.career.salary)}/月</b>
      <small>绩效 ${state.career.performance} · 经验 ${state.career.exp}</small></section>
      <div class="work-actions">${[['focus', '专注工作'], ['network', '经营人脉'], ['train', '技能培训'],
        ['overtime', '项目加班'], ['promotion', '申请晋升']].map(([id, label]) => (
        `<button data-work-action="${id}">${label}</button>`)).join('')}</div>`
      : '<p class="empty-state">当前没有工作，可以筛选公司并投递职位。</p>';
    const filters = ['全部', '适配', ...new Set(board(state).map((job) => job.industry))];
    if (!filters.includes(jobFilter)) jobFilter = '全部';
    const jobs = board(state).filter((job) => jobFilter === '全部' || job.industry === jobFilter
      || (jobFilter === '适配' && (job.majors.includes(state.education.major) || traitBoost(state, job.category))));
    return `${current}${filterChips(filters, jobFilter, 'data-job-filter')}<div class="market-title">${state.location.city} · ${jobs.length}个职位</div>`
      + (jobs.length ? jobs.map((job) => {
        const chance = Math.round(U.clamp(0.18 + (ability(state, job) - job.need) / 105, 0.08, 0.92) * 100);
        return `<article class="job-card"><div><strong>${job.name}</strong>
          <span>${job.company} · ${job.industry} · 录取率${chance}%</span></div>
          <b>¥${job.salary.toLocaleString()}</b><button data-job="${job.id}">投递</button></article>`;
      }).join('') : '<p class="empty-state">当前筛选没有可投递职位。</p>');
  }

  function renderCities(state) {
    const filters = ['全部', '华夏', '日本', '核心城市', '低成本'];
    const cities = C.cities.filter((city) => cityFilter === '全部' || city.country === cityFilter
      || (cityFilter === '核心城市' && city.tier === 1) || (cityFilter === '低成本' && city.cost <= 9000));
    return filterChips(filters, cityFilter, 'data-city-filter') + cities.map((city) => (
      `<article class="city-row ${city.city === state.location.city ? 'current' : ''}">
        <div><strong>${city.city}</strong><span>${city.country} · ${city.province} · ${city.tier === 1 ? '核心城市' : '发展城市'}</span></div>
        <b>¥${city.cost.toLocaleString()}</b>
        <button data-city="${city.city}" ${city.city === state.location.city ? 'disabled' : ''}>迁居</button></article>`
    )).join('');
  }

  function setJobFilter(value) { jobFilter = value; }
  function setCityFilter(value) { cityFilter = value; }

  Game.careerSystem = Object.freeze({
    board, apply, work, move, renderCareer, renderCities, setJobFilter, setCityFilter,
  });
}(window));
