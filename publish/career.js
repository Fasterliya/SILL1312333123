(function initCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function cityInfo(state) {
    return C.cities.find((item) => item.city === state.location.city)
      || { city: state.location.city, province: state.location.province, tier: 3, cost: 6000 };
  }

  function board(state) {
    const tier = cityInfo(state).tier;
    return C.jobs.filter((job) => tier <= job.tier);
  }

  function ability(state, job) {
    const majorMatch = job.majors.includes(state.education.major) ? 18 : 0;
    const traitBoost = {
      科学: ['好奇', '细心', '执着'], 文学: ['敏感', '浪漫', '幽默'],
      艺术: ['浪漫', '敏感', '好奇'], 运动: ['勇敢', '自律', '执着'],
      社交: ['随和', '幽默', '勇敢'], 商业: ['务实', '细心', '自律'],
    }[job.category]?.includes(state.profile.trait) ? 12 : 0;
    const personality = job.category === '社交' && ['外向', '乐观', '热血'].includes(state.profile.personality) ? 6 : 0;
    return state.stats.智力 * 0.55 + state.stats.魅力 * 0.2
      + state.education.study * 0.12 + traitBoost + majorMatch + personality;
  }

  function apply(state, jobId) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能正式求职' };
    if (state.education.university && !state.education.graduated) {
      return { ok: false, message: '完成大学学业后才能进入全职招聘' };
    }
    const job = board(state).find((item) => item.id === jobId);
    if (!job) return { ok: false, message: '当前城市没有这个岗位' };
    const repeated = state.career.applications.some((item) => (
      item.jobId === jobId && item.month === state.totalMonths
    ));
    if (repeated) return { ok: false, message: '本月已经投递过这个岗位' };
    const score = ability(state, job);
    const chance = U.clamp(0.18 + (score - job.need) / 105, 0.08, 0.92);
    const accepted = Math.random() < chance;
    state.career.applications.push({
      jobId, name: job.name, city: state.location.city,
      month: state.totalMonths, accepted,
    });
    state.career.applications = state.career.applications.slice(-20);
    if (!accepted) {
      Game.lifeDirector.addLog(state, '求职未录取', `${job.name}的招聘方婉拒了这次申请，你可以继续积累能力或尝试其他岗位。`, 'normal');
      return { ok: false, message: `${job.name}未通过，录取概率约 ${Math.round(chance * 100)}%` };
    }
    state.career.job = job.name;
    state.career.jobId = job.id;
    state.career.salary = Math.round(job.salary * (cityInfo(state).tier === 1 ? 1.12 : 1));
    state.career.level = 0;
    state.career.exp = 0;
    Game.lifeDirector.addLog(state, '获得工作', `你在${state.location.city}成为${job.name}，月薪 ¥${state.career.salary.toLocaleString()}。`, 'milestone');
    return { ok: true, message: `${job.name}录取了你` };
  }

  function move(state, cityName) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能独立迁居' };
    const city = C.cities.find((item) => item.city === cityName);
    if (!city || city.city === state.location.city) return { ok: false, message: '你已经在这座城市' };
    if (state.money < city.cost) return { ok: false, message: `迁居需要 ¥${city.cost.toLocaleString()}` };
    state.money -= city.cost;
    if (state.career.job && state.career.jobId !== 'freelance') {
      Game.lifeDirector.addLog(state, '离开原岗位', `迁居让你结束了${state.career.job}的工作。`, 'normal');
      state.career.job = null;
      state.career.jobId = null;
      state.career.salary = 0;
      state.career.exp = 0;
    }
    state.location = { province: city.province, city: city.city };
    Game.lifeDirector.addLog(state, '迁居新城', `你花费 ¥${city.cost.toLocaleString()}，搬到${city.city}寻找新的机会。`, 'milestone');
    return { ok: true, message: `已迁居${city.city}` };
  }

  function renderCareer(state, money) {
    const current = state.career.job
      ? `<div class="career-current"><span>当前职业</span><strong>${state.career.job}</strong><b>${money(state.career.salary)}/月 · L${state.career.level + 1}</b></div>`
      : '<p class="empty-state">当前没有工作，可以向下投递岗位。</p>';
    const jobs = board(state).map((job) => {
      const chance = Math.round(U.clamp(0.18 + (ability(state, job) - job.need) / 105, 0.08, 0.92) * 100);
      return `<article class="job-card"><div><strong>${job.name}</strong>
        <span>${job.category}倾向 · 参考录取率 ${chance}%</span></div>
        <b>¥${job.salary.toLocaleString()}</b><button data-job="${job.id}">投递</button></article>`;
    }).join('');
    return `${current}<div class="market-title">当前城市 · ${state.location.city}</div>${jobs}`;
  }

  function renderCities(state) {
    return C.cities.map((city) => (
      `<article class="city-row ${city.city === state.location.city ? 'current' : ''}">
        <div><strong>${city.city}</strong><span>${city.province} · ${city.tier === 1 ? '核心城市' : '发展城市'}</span></div>
        <b>¥${city.cost.toLocaleString()}</b>
        <button data-city="${city.city}" ${city.city === state.location.city ? 'disabled' : ''}>迁居</button></article>`
    )).join('');
  }

  Game.careerSystem = Object.freeze({ board, apply, move, renderCareer, renderCities });
}(window));
