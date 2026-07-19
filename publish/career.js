(function initCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;
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
    const audience = job.recommendedGender === state.gender ? 8 : 0;
    return state.stats.智力 * 0.55 + state.stats.魅力 * 0.2 + state.education.study * 0.12
      + traitBoost(state, job.category) + majorMatch + personality + audience;
  }

  function qualification(state) {
    if (!state.education.graduated) return 0;
    if (!state.education.university) return 1;
    return state.education.universityType === '高职专科' ? 2 : 3;
  }

  function qualificationLabel(level) {
    return ['未完成全日制学业', '高中/职高', '高职专科', '本科及以上'][level] || '未知';
  }

  function requirementLabel(level) {
    return ['不限学历', '高中/职高', '高职专科', '本科及以上'][level] || '未知';
  }

  function eligible(state, job) {
    return U.age(state) >= (job.minAge || 18) && qualification(state) >= (job.education || 0);
  }

  function apply(state, jobId) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能正式求职' };
    if (state.health?.retired) return { ok: false, message: '当前已办理退休，不再参加全职招聘' };
    if (state.education.university && !state.education.graduated) return { ok: false, message: '完成大学学业后才能全职求职' };
    const job = board(state).find((item) => item.id === jobId);
    if (!job) return { ok: false, message: '当前城市没有这个岗位' };
    if (!eligible(state, job)) return { ok: false, message: `该职位要求${requirementLabel(job.education || 0)}` };
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
    state.career.salary = Math.round(job.salary * Game.cityLife.salaryFactor(state));
    state.career.level = 0;
    state.career.exp = 0;
    state.career.performance = 10;
    state.career.lastPromotionMonth = state.totalMonths - 6;
    Game.lifeDirector.addLog(state, '获得工作', `你加入${job.company}担任${job.name}。`, 'milestone');
    return { ok: true, message: `${job.company}录取了你` };
  }

  function work(state, type) {
    if (!state.career.job) return { ok: false, message: '当前没有工作' };
    if (type === 'promotion') return applyPromotion(state);
    const actions = {
      focus: [8, 5, -3, 0, '专注完成关键任务', 0, 0],
      network: [5, 3, 1, 2, '主动结识同事与合作伙伴', 0, 0],
      train: [4, 8, -1, 2, '参加培训并提升专业能力', 0, 0],
      overtime: [12, 7, -6, 0, '加班冲刺重要项目', 0, 0],
      create: [8, 7, 2, 1, '发布了一组新作品', 350, 80],
      stream: [7, 6, -1, 1, '完成了一场直播', 520, 60],
      sponsor: [10, 5, -2, 0, '完成一次品牌合作', 900, 150],
      convention: [12, 8, 4, 1, '参加城市漫展并经营个人展位', 680, 260],
    };
    const [performance, exp, mood, intelligence, label, income, cost] = actions[type] || actions.focus;
    state.money += income;
    Game.economy.spend(state, cost);
    state.career.performance = U.clamp(state.career.performance + performance, 0, 100);
    state.career.exp += exp;
    state.stats.心情 = U.clamp(state.stats.心情 + mood, 0, 100);
    state.stats.智力 = U.clamp(state.stats.智力 + intelligence, 0, 100);
    Game.careerSpecialties.afterWork(state, type);
    Game.lifeDirector.addLog(state, '职场行动', label, 'good');
    return { ok: true, message: Game.economy.message(
      state, `${label}，绩效达到 ${state.career.performance}${income ? `，收入 ¥${income}` : ''}`,
    ) };
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
    Game.economy.spend(state, city.cost);
    const currentJob = C.jobs.find((item) => item.id === state.career.jobId);
    if (state.career.job && !currentJob?.freelance) {
      Game.lifeDirector.addLog(state, '离开原岗位', `迁居让你结束了${state.career.company || ''}${state.career.job}的工作。`, 'normal');
      Object.assign(state.career, {
        job: null, jobId: null, company: null, salary: 0, exp: 0,
        performance: 0, lastPromotionMonth: -12,
      });
    }
    state.location = { province: city.province, city: city.city, country: city.country };
    Game.cityLife.onMove(state);
    Game.lifeDirector.addLog(state, '迁居新城', `你搬到${city.country}${city.city}寻找新的机会。`, 'milestone');
    return { ok: true, message: Game.economy.message(state, `已迁居${city.city}`) };
  }

  Game.careerSystem = Object.freeze({
    board, ability, qualification, qualificationLabel, requirementLabel, eligible, apply, work, move,
  });
}(window));
