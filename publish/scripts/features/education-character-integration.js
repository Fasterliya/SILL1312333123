(function initEducationCharacterIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const base = Game.educationSystem;
  if (!base) return;

  function act(state, type) {
    const result = base.act(state, type);
    if (!result?.ok) return result;
    const gains = { foundation: 1, weakness: 1.2, mock: 0.6, tutor: 1.5, balance: 0.2 };
    Game.characterAttributes.gain(state, '学识', gains[type] || 0.5, `学习安排:${type}`);
    if (type === 'balance') Game.stressSystem.reduce(state, 7, '调整学习节奏');
    else Game.stressSystem.add(state, Math.max(1, Math.round((state.education.pressure || 0) / 30)), '学习安排');
    return result;
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

  function ensurePerson(person) {
    base.ensurePerson(person);
    Game.characterAttributes.ensurePerson(person);
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
    if (!['home', 'graduate', 'workforce'].includes(state.education.schoolStage)) {
      Game.characterAttributes.gain(state, '学识', 0.22, '持续教育');
    }
  }

  function readiness(state) {
    return Game.content.clamp(base.readiness(state) + Game.stressSystem.effects(state).learning, 0, 100);
  }

  Game.educationSystem = Object.freeze({ ...base, act, exam, monthly, readiness, ensurePerson });
}(window));
