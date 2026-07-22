(function initCareerActionResolution(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const base = Game.careerSystem;
  if (!base) return;

  const categoryAbility = Object.freeze({
    科学: '学识', 文学: '学识', 艺术: '交涉',
    社交: '交涉', 商业: '管理', 运动: '体能',
  });
  const workConfigs = Object.freeze({
    focus: ['学识', '管理', 54, 3, '专注工作'],
    network: ['交涉', '心计', 48, 5, '经营人脉'],
    train: ['学识', '管理', 44, 7, '技能培训'],
    overtime: ['体能', '管理', 68, 0, '项目加班'],
    create: ['交涉', '学识', 55, 4, '发布作品'],
    stream: ['交涉', '体能', 58, 3, '直播活动'],
    sponsor: ['管理', '交涉', 64, 2, '品牌合作'],
    convention: ['交涉', '体能', 62, 5, '漫展经营'],
  });
  const incomes = Object.freeze({ create: 350, stream: 520, sponsor: 900, convention: 680 });

  function application(state, job) {
    const primary = ['idoltrainee', 'idol-underground', 'idol', 'magicalgirl'].includes(job.id)
      ? '魅力' : (categoryAbility[job.category] || '学识');
    const matchingMajor = job.majors.includes(state.education.major) ? 10 : 0;
    const context = matchingMajor + (job.recommendedGender === state.gender ? 4 : 0);
    const config = {
      primary, secondary: '交涉', difficulty: job.need || 60, context,
      label: `${job.name}应聘`,
      chanceMultiplier: Game.jobMarket.chanceMultiplier(state, job),
      minChance: 0.03, maxChance: 0.78,
    };
    return Game.actionResolver.preview(state, config);
  }

  function work(state, type) {
    if (type === 'promotion') return base.work(state, type);
    const before = {
      performance: Number(state.career.performance) || 0,
      exp: Number(state.career.exp) || 0,
    };
    const result = base.work(state, type);
    if (!result?.ok) return result;
    const item = workConfigs[type] || workConfigs.focus;
    const resolution = Game.actionResolver.resolve(state, {
      primary: item[0], secondary: item[1], difficulty: item[2],
      context: item[3], variance: 7, label: item[4],
    });
    const performanceGain = Math.max(0, state.career.performance - before.performance);
    const expGain = Math.max(0, state.career.exp - before.exp);
    state.career.performance = Game.content.clamp(
      before.performance + Math.round(performanceGain * resolution.multiplier), 0, 100,
    );
    state.career.exp = before.exp + Math.max(1, Math.round(expGain * resolution.multiplier));
    const baseIncome = incomes[type] || 0;
    const adjustedIncome = Math.round(baseIncome * resolution.multiplier);
    state.money += adjustedIncome - baseIncome;
    if (resolution.multiplier > 1) {
      Game.characterAttributes.gain(state, item[0], (resolution.multiplier - 1) * 0.8, `行动突破:${type}`);
    }
    return {
      ...result,
      actionResolution: resolution,
      message: Game.economy.message(state, `${Game.actionResolver.summary(resolution)}`
        + `；绩效 ${state.career.performance}，经验 +${state.career.exp - before.exp}`
        + `${baseIncome ? `，行动收入 ${Game.view.money(adjustedIncome)}` : ''}`),
    };
  }

  Game.careerActionResolution = Object.freeze({ application, categoryAbility });
  Game.careerSystem = Object.freeze({ ...base, work, applicationChance: application });
}(window));
