(function initEducationCharacterIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const base = Game.educationSystem;
  if (!base) return;

  function resolutionConfig(state, type) {
    const configs = {
      foundation: ['管理', 45, 5, '巩固基础'],
      weakness: ['管理', 58, 3, '专项补弱'],
      mock: ['心计', 62, 2, '模拟考试'],
      tutor: ['交涉', 48, 9, '课外辅导'],
      balance: ['管理', 35, 8, '调整节奏'],
    };
    const [secondary, difficulty, context, label] = configs[type] || configs.foundation;
    return { primary: '学识', secondary, difficulty, context, variance: 6, label };
  }

  function act(state, type) {
    const item = base.ensure(state);
    const before = Number(item.preparation) || 0;
    const result = base.act(state, type);
    if (!result?.ok) return result;
    const resolution = Game.actionResolver.resolve(state, resolutionConfig(state, type));
    const rawGain = Math.max(0, item.preparation - before);
    item.preparation = Game.content.clamp(before + rawGain * resolution.multiplier, 0, 100);
    item.study = Math.round(item.preparation);
    if (type === 'balance') Game.stressSystem.reduce(state, 7, '调整学习节奏');
    else Game.stressSystem.add(state, Math.max(1, Math.round((state.education.pressure || 0) / 30)), '学习安排');
    return {
      ...result,
      actionResolution: resolution,
      message: `${result.message}；${Game.actionResolver.summary(resolution)}`,
    };
  }

  function exam(state, label, subjects) {
    const old = state.stats.智力;
    state.stats.智力 = Game.characterAttributes.personValue(state.profile, '学识');
    try {
      const result = base.exam(state, label, subjects);
      Game.stressSystem.add(state, result.total / result.maximum >= 0.78 ? -5 : 5, '考试结果');
      return result;
    } finally {
      state.stats.智力 = old;
    }
  }

  function ensurePerson(person, age) {
    base.ensurePerson(person);
    Game.characterAttributes.ensurePerson(person, age);
    person.academicAbility = Game.characterAttributes.personValue(person, '学识');
    if (!person.abilityEducationVersion) {
      const upbringing = person.upbringing?.education || 0;
      const discipline = Game.structuredTraits.growthMultiplier(person, '学识');
      person.studyHabit = Game.content.clamp(person.studyHabit * 0.65
        + upbringing * 0.25 + (discipline - 1) * 50, 0, 100);
      person.abilityEducationVersion = 1;
    }
    return person;
  }

  function monthly(state) {
    base.monthly(state);
  }

  function readiness(state) {
    return Game.content.clamp(base.readiness(state) + Game.stressSystem.effects(state).learning, 0, 100);
  }

  Game.educationSystem = Object.freeze({ ...base, act, exam, monthly, readiness, ensurePerson });
}(window));
