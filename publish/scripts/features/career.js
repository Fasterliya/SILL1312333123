(function initCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;
  function board(state) {
    return Game.companyCatalog.jobsInCity(state.location.city);
  }

  function traitBoost(state, category) {
    const traits = {
      科学: ['好奇', '细心', '执着'], 文学: ['敏感', '浪漫', '幽默'],
      艺术: ['浪漫', '敏感', '好奇'], 运动: ['勇敢', '自律', '执着'],
      社交: ['随和', '幽默', '勇敢'], 商业: ['务实', '细心', '自律'],
    };
    return traits[category]?.includes(state.profile.trait) ? 12 : 0;
  }

  function universityPrestige(state) {
    if (!state.education.university) return 0.5;
    var school = C.universities.find(function(u) { return u.id === state.education.universityId || u.name === state.education.university; });
    var resource = school ? Game.schoolLines.institutionResource(school) : 60;
    var base = 0.3 + (resource - 50) / 49 * 1.7;
    return Math.max(0.3, Math.min(2.0, base));
  }

  function ability(state, job) {
    const categoryAbility = {
      科学: '学识', 文学: '学识', 艺术: '交涉', 社交: '交涉', 商业: '管理', 运动: '体能',
    }[job.category] || '学识';
    const professional = Game.characterAttributes.playerValue(state, categoryAbility);
    const negotiation = Game.characterAttributes.playerValue(state, '交涉');
    const charm = Game.characterAttributes.derivedCharm(state.profile);
    if (['idoltrainee', 'idol-underground', 'idol'].includes(job.id)) {
      return charm * 0.45 + negotiation * 0.25
        + Game.characterAttributes.playerValue(state, '体能') * 0.2
        + traitBoost(state, '艺术') + (state.education.study || 0) * 0.04;
    }
    var isMatch = job.majors.includes(state.education.major);
    var majorRelevance = isMatch ? 35 + Math.floor((state.education.study || 0) / 100 * 37) : (state.education.university ? -15 : 0);
    var personality = job.category === '社交' && ['外向','乐观','热血'].includes(state.profile.personality) ? 6 : 0;
    var audience = job.recommendedGender === state.gender ? 8 : 0;
    return professional * 0.55 + negotiation * 0.2 + state.education.study * 0.12
      + traitBoost(state, job.category) + majorRelevance + personality + audience;
  }

  function qualification(state) {
    if (!state.education.graduated) return 0;
    if (!state.education.university) return 1;
    var prestige = universityPrestige(state);
    if (state.education.universityType === '高职专科') return Math.max(0.5, Math.round(2 * prestige * 10) / 10);
    var base = prestige >= 1.4 ? 4 : 3;
    return Math.max(1, Math.round(base * prestige * 10) / 10);
  }

  function qualificationLabel(level) {
    if (level >= 4.5) return '顶尖大学';
    if (level >= 3.0) return '本科及以上';
    if (level >= 2.0) return '高职专科';
    if (level >= 1.0) return '高中/职高';
    return '未完成全日制学业';
  }

  function requirementLabel(level) {
    if (level >= 4.5) return '顶尖大学';
    if (level >= 3.0) return '本科及以上';
    if (level >= 2.0) return '高职专科';
    return '不限学历';
  }

  function eligible(state, job) {
    return U.age(state) >= (job.minAge || 18) && qualification(state) >= (job.education || 0);
  }

  function apply(state, jobId) {
    const job = board(state).find((item) => item.id === jobId);
    if (!job) return { ok: false, message: '当前城市没有这个岗位' };
    if (U.age(state) < (job.minAge || 18)) {
      return { ok: false, message: `${job.minAge || 18}岁后才能申请这个岗位` };
    }
    if (state.health?.retired) return { ok: false, message: '当前已办理退休，不再参加全职招聘' };
    if (state.education.university && !state.education.graduated) return { ok: false, message: '完成大学学业后才能全职求职' };
    if (!eligible(state, job)) return { ok: false, message: `该职位要求${requirementLabel(job.education || 0)}` };
    const market = Game.jobMarket.summary(state, job);
    if (!market.vacancies) {
      return { ok: false, message: `${job.company}的${job.name}岗位已经饱和` };
    }
    const assessment = Game.careerActionResolution.application(state, job);
    const chance = assessment.chance;
    const accepted = Math.random() < chance;
    const employer = job.company || `${state.location.city}${job.industry || '城市'}企业`;
    state.career.applications.push({
      jobId, name: job.name, company: employer, city: state.location.city,
      month: state.totalMonths, accepted,
    });
    state.career.applications = state.career.applications.slice(-30);
    if (!accepted) {
      Game.lifeDirector.addLog(state, '求职未录取', `${employer}婉拒了${job.name}申请。`, 'normal');
      return { ok: false, message: `${employer}未录取，${Game.actionResolver.summary(assessment)}`
        + `，参考概率 ${Math.round(chance * 100)}%` };
    }
    if (state.career.job && state.career.jobId !== job.id) {
      Game.careerHistory?.add(state, {
        kind: 'leave', title: `离开${state.career.company || '原单位'}`, detail: `结束${state.career.job}工作`,
      });
    }
    state.career.job = job.name;
    state.career.jobId = job.id;
    state.career.company = employer;
    const internshipBonus = state.career._internshipBonus && !state.career._internshipBonusUsed;
    state.career.salary = Math.round(job.salary * Game.cityLife.salaryFactor(state) * (internshipBonus ? 1.3 : 1));
    state.career.level = 0;
    state.career.exp = internshipBonus ? 24 : 0;
    state.career.performance = 10;
    state.career.lastPromotionMonth = state.totalMonths - 6;
    state.career.management = false;
    state.career.titleTrack = 'staff';
    state.career.titleRank = 0;
    state.career.lastTitleMonth = state.totalMonths - 12;
    state.career.lastRaiseMonth = state.totalMonths - 6;
    state.career.lastAutoRaiseMonth = state.totalMonths;
    state.career.jobStartMonth = state.totalMonths;
    if (job.id === 'coser') Game.structuredTraits.addExperience(state.profile, 'coser');
    if (internshipBonus) state.career._internshipBonusUsed = true;
    const employerJob = { ...job, company: employer, companyId: job.companyId || `local-${state.location.city}-${job.id}` };
    if (job.freelance) Game.workplace.leave(state);
    else Game.workplace.join(state, employerJob);
    Game.creatorCareer.onJobChange(state);
    Game.idolSystem?.onJobChange(state);
    if (job.id === 'idol-underground') {
      const underground = Game.undergroundIdol.ensure(state);
      underground.active = true;
      underground.stage = underground.stage || 'trainee';
      underground.agencyName ||= employer;
    }
    Game.lifeDirector.addLog(state, '获得工作', `你加入${employer}担任${job.name}。`, 'milestone');
    Game.careerHistory?.add(state, { kind: 'hire', title: `加入${employer}`,
      detail: `担任${job.name}`, company: employer, salary: state.career.salary });
    return { ok: true, message: `${employer}录取了你，${Game.actionResolver.summary(assessment)}` };
  }

  function work(state, type) {
    if (!state.career.job) return { ok: false, message: '当前没有工作' };
    if (type === 'promotion') return Game.careerGrowth.requestRaise(state);
    if (Game.staminaSystem) { var st = Game.staminaSystem.spend(state, 15); if (!st.ok) return st; }
    const actions = {
      focus: [8, 5, 0, '专注完成关键任务', 0, 0],
      network: [5, 3, 2, '主动结识同事与合作伙伴', 0, 0],
      train: [4, 8, 2, '参加培训并提升专业能力', 0, 0],
      overtime: [12, 7, 0, '加班冲刺重要项目', 0, 0],
      create: [8, 7, 1, '发布了一组新作品', 350, 80],
      stream: [7, 6, 1, '完成了一场直播', 520, 60],
      sponsor: [10, 5, 0, '完成一次品牌合作', 900, 150],
      convention: [12, 8, 1, '参加城市漫展并经营个人展位', 680, 260],
    };
    const [performance, exp, intelligence, label, income, cost] = actions[type] || actions.focus;
    state.money += income;
    Game.economy.spend(state, cost);
    state.career.performance = U.clamp(state.career.performance + performance, 0, 100);
    state.career.exp += exp;
    const growthAbility = type === 'network' ? '交涉'
      : (state.career.management ? '管理' : '学识');
    Game.characterAttributes.gain(state, growthAbility, intelligence, `职场行动:${type}`);
    Game.careerSpecialties.afterWork(state, type);
    Game.lifeDirector.addLog(state, '职场行动', label, 'good');
    return { ok: true, message: Game.economy.message(
      state, `${label}，绩效达到 ${state.career.performance}${income ? `，收入 ${Game.view.money(income)}` : ''}`,
    ) };
  }

  function move(state, cityName) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能独立迁居' };
    const city = C.cities.find((item) => item.city === cityName);
    if (!city || city.city === state.location.city) return { ok: false, message: '你已经在这座城市' };
    Game.economy.spend(state, city.cost);
    const currentJob = C.jobs.find((item) => item.id === state.career.jobId);
    if (state.career.job && !currentJob?.freelance) {
      Game.lifeDirector.addLog(state, '离开原岗位', `迁居让你结束了${state.career.company || ''}${state.career.job}的工作。`, 'normal');
      Game.careerHistory?.add(state, { kind: 'leave',
        title: `离开${state.career.company || '原单位'}`, detail: `结束${state.career.job}工作` });
      Object.assign(state.career, {
        job: null, jobId: null, company: null, salary: 0, exp: 0,
        performance: 0, lastPromotionMonth: -12, management: false, titleTrack: 'staff', titleRank: 0,
      });
      Game.workplace.leave(state);
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
