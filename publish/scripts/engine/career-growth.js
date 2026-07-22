(function initCareerGrowth(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const titles = {
    management: ['职员', '主管', '经理', '总监', '副总裁', '总经理'],
    professional: ['职员', '高级专员', '资深专家', '首席专家', '首席顾问', '专业合伙人'],
  };

  function titleName(state) {
    if (!state.career.job) return '待业';
    const industry = Game.careerLadders?.status(state);
    if (industry) return `${industry.title} · ${state.career.job}`;
    const track = state.career.titleTrack;
    if (!titles[track]) return state.career.job;
    return `${titles[track][state.career.titleRank] || titles[track].at(-1)} · ${state.career.job}`;
  }

  function nextTitle(state, track) {
    const rank = state.career.titleTrack === track ? state.career.titleRank + 1 : 1;
    return titles[track]?.[rank] || '';
  }

  function requestRaise(state) {
    if (state.totalMonths - state.career.lastRaiseMonth < 6) return { ok: false, message: '距离上次调薪申请不足6个月' };
    if (state.career.performance < 35) return { ok: false, message: '绩效达到35后才能申请加薪' };
    state.career.lastRaiseMonth = state.totalMonths;
    const chance = U.clamp(0.28 + state.career.performance / 145 + state.career.exp / 600, 0.28, 0.9);
    if (Math.random() >= chance) {
      state.career.performance = Math.max(0, state.career.performance - 5);
      return { ok: false, message: `调薪申请未通过，参考概率 ${Math.round(chance * 100)}%` };
    }
    const rate = 1.06 + Math.min(0.06, state.career.performance / 1000);
    state.career.level += 1;
    state.career.salary = Math.round(state.career.salary * rate);
    state.career.performance = Math.max(10, state.career.performance - 16);
    Game.lifeDirector.addLog(state, '主动加薪成功', `你的薪级提升到P${state.career.level + 1}。`, 'milestone');
    return { ok: true, message: `加薪成功，月薪 ${Game.view.money(state.career.salary)}` };
  }

  function requestTitle(state, track) {
    const industry = Game.careerLadders?.status(state);
    if (industry) return requestIndustryTitle(state, industry);
    if (!titles[track]) return { ok: false, message: '没有这个晋升方向' };
    if (state.career.titleTrack !== 'staff' && state.career.titleTrack !== track) {
      return { ok: false, message: '进入晋升序列后不能直接跨线申请' };
    }
    const next = nextTitle(state, track);
    if (!next) return { ok: false, message: '当前方向已经达到最高职级' };
    if (state.totalMonths - state.career.lastTitleMonth < 12) return { ok: false, message: '距离上次职级评审不足12个月' };
    const targetRank = state.career.titleTrack === track ? state.career.titleRank + 1 : 1;
    const requiredPerformance = 48 + targetRank * 7;
    const requiredExp = 12 + targetRank * 12;
    if (state.career.performance < requiredPerformance || state.career.exp < requiredExp) {
      return { ok: false, message: `${next}要求绩效${requiredPerformance}、经验${requiredExp}` };
    }
    state.career.lastTitleMonth = state.totalMonths;
    const chance = U.clamp(0.28 + state.career.performance / 170 + state.career.exp / 800, 0.3, 0.88);
    if (Math.random() >= chance) return { ok: false, message: `${next}评审未通过，参考概率 ${Math.round(chance * 100)}%` };
    state.career.titleTrack = track;
    state.career.titleRank = targetRank;
    state.career.management = track === 'management';
    state.career.salary = Math.round(state.career.salary * (track === 'management' ? 1.16 : 1.13));
    state.career.performance = Math.max(12, state.career.performance - 22);
    Game.workplace.onTitlePromotion(state);
    Game.lifeDirector.addLog(state, '职级提拔', `你被提拔为${next}，进入${track === 'management' ? '管理' : '专业'}晋升线。`, 'milestone');
    return { ok: true, message: `提拔成功：${next}，月薪 ${Game.view.money(state.career.salary)}` };
  }

  function requestIndustryTitle(state, info) {
    if (!info.rule) return { ok: false, message: '当前行业已经达到最高职级' };
    if (info.nextRank > info.ceiling) {
      return { ok: false, message: `${info.nextTitle}受学历或毕业成绩限制，当前最高可到L${info.ceiling}` };
    }
    if (state.totalMonths - state.career.lastTitleMonth < 12) {
      return { ok: false, message: '距离上次职级评审不足12个月' };
    }
    if (!info.eligible) {
      return { ok: false, message: `${info.nextTitle}要求绩效${info.rule.performance}、经验${info.rule.exp}、年资${info.rule.years}年` };
    }
    state.career.lastTitleMonth = state.totalMonths;
    if (Math.random() >= info.chance) {
      return { ok: false, message: `${info.nextTitle}评审未通过，参考概率 ${Math.round(info.chance * 100)}%` };
    }
    const currentSalaryRate = Game.careerLadders.RULES[info.rank].salary;
    state.career.titleTrack = 'industry';
    state.career.titleRank = info.nextRank;
    state.career.management = info.nextRank >= 3;
    state.career.salary = Math.round(state.career.salary * info.rule.salary / currentSalaryRate);
    state.career.performance = Math.max(12, state.career.performance - 18);
    Game.workplace.onTitlePromotion(state);
    Game.careerHistory?.add(state, {
      kind: 'promotion', title: `晋升为${info.nextTitle}`,
      detail: `${info.line}行业职级提升`, salary: state.career.salary,
    });
    Game.lifeDirector.addLog(state, '职级提拔', `你被提拔为${info.nextTitle}。`, 'milestone');
    return { ok: true, message: `提拔成功：${info.nextTitle}，月薪 ${Game.view.money(state.career.salary)}` };
  }

  function monthly(state) {
    if (!state.career.job || state.health?.retired) return;
    if (state.totalMonths - state.career.lastAutoRaiseMonth < 12 || state.career.performance < 72) return;
    state.career.lastAutoRaiseMonth = state.totalMonths;
    if (Math.random() >= 0.22) return;
    const rate = 1.05 + Math.min(0.04, state.career.performance / 2000);
    state.career.salary = Math.round(state.career.salary * rate);
    state.career.level += 1;
    Game.lifeDirector.addLog(state, '部门主动加薪', `部门年度评估认可你的表现，薪级升至P${state.career.level + 1}。`, 'good');
  }

  Game.careerGrowth = Object.freeze({ titleName, nextTitle, requestRaise, requestTitle, monthly });
}(window));
