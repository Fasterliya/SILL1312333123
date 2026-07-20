(function initCareerLadders(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const LADDERS = {
    科技: ['初级工程师', '高级工程师', '资深工程师', '首席工程师', '技术总监', 'CTO'],
    金融: ['分析师', '高级分析师', '副总裁', '董事', '执行董事', '合伙人'],
    文职: ['科员', '副主任科员', '主任科员', '副处长', '处长', '局长'],
    医疗: ['住院医师', '主治医师', '副主任医师', '主任医师', '科室主任', '院长'],
    教育: ['助教', '讲师', '副教授', '教授', '系主任', '校长'],
    法律: ['律师助理', '执业律师', '资深律师', '合伙人', '高级合伙人', '首席律师'],
    创意: ['初级设计师', '设计师', '高级设计师', '设计主管', '设计总监', '创意总监'],
    制造: ['技术员', '助理工程师', '工程师', '高级工程师', '总工程师', '技术副总'],
    服务: ['店员', '资深店员', '副店长', '店长', '区域经理', '运营总监'],
    传媒: ['助理编辑', '编辑', '资深编辑', '副主编', '主编', '内容总监'],
  };
  const RULES = [
    { performance: 10, exp: 0, years: 0, chance: 1, salary: 1 },
    { performance: 45, exp: 30, years: 2, chance: 0.45, salary: 1.18 },
    { performance: 55, exp: 60, years: 4, chance: 0.35, salary: 1.42 },
    { performance: 65, exp: 100, years: 6, chance: 0.25, salary: 1.75 },
    { performance: 75, exp: 150, years: 8, chance: 0.18, salary: 2.2 },
    { performance: 85, exp: 220, years: 10, chance: 0.1, salary: 3 },
  ];

  function lineFor(job) {
    if (!job) return '文职';
    const industry = job.industry || '';
    if (['科技', '游戏'].includes(industry)) return '科技';
    if (industry === '金融') return '金融';
    if (industry === '医疗') return '医疗';
    if (industry === '教育') return '教育';
    if (industry === '法律') return '法律';
    if (industry === '创意') return '创意';
    if (['工程科技', '制造', '技能服务'].includes(industry)) return '制造';
    if (['服务', '交通', '城市民生', '商贸物流'].includes(industry)) return '服务';
    if (['传媒', '文化', '文化传媒', '会展活动'].includes(industry)) return '传媒';
    if (job.category === '科学') return '科技';
    if (job.category === '艺术') return '创意';
    if (job.category === '社交') return '服务';
    if (job.category === '商业') return '金融';
    return '文职';
  }

  function educationCeiling(state) {
    const qualification = Game.careerSystem?.qualification?.(state)
      ?? (state.education?.university ? 3 : (state.education?.graduated ? 1 : 0));
    let ceiling = qualification >= 4.5 ? 5
      : qualification >= 3 ? 4 : qualification >= 2 ? 3 : qualification >= 1 ? 2 : 1;
    const score = Number(state.education?.examScore || state.education?.finalScore);
    if (score > 0 && score < 60) ceiling = Math.min(ceiling, 2);
    else if (score >= 60 && score < 75) ceiling = Math.min(ceiling, 3);
    else if (score >= 75 && score < 90) ceiling = Math.min(ceiling, 4);
    return ceiling;
  }

  function status(state) {
    const job = Game.config.jobs.find((item) => item.id === state.career.jobId);
    const special = ['pimp', 'blackmarket', 'prostitute', 'welfare',
      'idol-underground', 'idoltrainee', 'idol'];
    if (!job || job.freelance || special.includes(job.id)) return null;
    const line = lineFor(job);
    const ladder = LADDERS[line];
    const rank = U.clamp(Number(state.career.titleRank) || 0, 0, ladder.length - 1);
    const nextRank = rank + 1;
    const rule = RULES[nextRank] || null;
    if (!Number.isFinite(state.career.jobStartMonth)) {
      const accepted = (state.career.applications || []).slice().reverse().find((entry) => (
        entry.accepted && (!entry.jobId || entry.jobId === state.career.jobId)
      ));
      state.career.jobStartMonth = Number.isFinite(accepted?.month) ? accepted.month
        : Math.max(0, state.totalMonths - Math.max(6, (Number(state.career.exp) || 0) * 2));
    }
    const start = Number(state.career.jobStartMonth);
    const tenure = Math.max(0, state.totalMonths - (Number.isFinite(start) ? start : state.totalMonths));
    const ceiling = educationCeiling(state);
    const eligible = Boolean(rule) && nextRank <= ceiling
      && state.career.performance >= rule.performance
      && state.career.exp >= rule.exp
      && tenure >= rule.years * 12;
    const chance = rule ? U.clamp(
      rule.chance + Math.max(0, state.career.performance - rule.performance) / 500
        + Math.max(0, state.career.exp - rule.exp) / 2000,
      rule.chance,
      Math.min(0.9, rule.chance + 0.2),
    ) : 0;
    return {
      line, ladder, rank, nextRank, rule, tenure, ceiling, eligible, chance,
      title: ladder[rank], nextTitle: ladder[nextRank] || '',
    };
  }

  Game.careerLadders = Object.freeze({
    LADDERS,
    RULES,
    lineFor,
    educationCeiling,
    status,
  });
}(window));
