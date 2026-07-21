(function initLearningAttribute(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const VERSION = 1;
  const clamp = (value, min = 0, max = 60) => Math.max(min, Math.min(max, Number(value) || 0));

  function hash(value) {
    return [...String(value || 'person')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function ageOf(target, age) {
    if (Number.isFinite(age)) return Math.max(0, age);
    if (Number.isFinite(target?.baseAge)) return Math.max(0, target.baseAge);
    return 18;
  }

  function adultBase(target, seed) {
    if (target.learningModelVersion === VERSION && Number.isFinite(target.innateLearning)) {
      return clamp(target.innateLearning, 8, 36);
    }
    target.innateLearning = 17 + hash(`${seed || target.id || target.name}:learning`) % 9;
    target.learningModelVersion = VERSION;
    return target.innateLearning;
  }

  function maturity(age) {
    const years = Math.max(0, Number(age) || 0);
    if (years < 3) return 0.28 + years * 0.04;
    if (years < 6) return 0.4 + (years - 3) * 0.05;
    if (years < 12) return 0.58 + (years - 6) * 0.04;
    if (years < 18) return 0.8 + (years - 12) * 0.03;
    return 1;
  }

  function current(target, age, seed) {
    return clamp(Math.round(adultBase(target, seed) * maturity(ageOf(target, age))));
  }

  function sync(target, age, seed) {
    const keepCurrent = !Number.isFinite(age) && target.learningModelVersion === VERSION
      && Number.isFinite(target.abilities?.学识);
    target.abilities ||= {};
    target.abilityGrowth ||= { potential: {}, xp: {}, history: [] };
    target.abilityGrowth.potential ||= {};
    target.abilityGrowth.xp ||= {};
    target.abilities.学识 = keepCurrent ? clamp(target.abilities.学识) : current(target, age, seed);
    target.abilityGrowth.potential.学识 = adultBase(target, seed);
    target.abilityGrowth.xp.学识 = 0;
    return target.abilities.学识;
  }

  function inherit(child, left, right, seed) {
    const average = (adultBase(left) + adultBase(right)) / 2;
    const mutation = hash(`${seed || child.id || child.name}:learning-inherit`) % 5 - 2;
    child.innateLearning = clamp(Math.round(average + mutation), 10, 34);
    child.learningModelVersion = VERSION;
    return sync(child, Number.isFinite(child.baseAge) ? child.baseAge : 0, seed);
  }

  function checkValue(value) {
    return Math.max(0, Math.min(100, Math.round(clamp(value) * 2)));
  }

  function examRate(value) {
    return Math.max(0.02, Math.min(0.16, 0.07 + (clamp(value) - 20) * 0.004));
  }

  function planSlots(value) {
    const learning = clamp(value);
    if (learning >= 30) return 9;
    if (learning >= 25) return 8;
    if (learning >= 20) return 7;
    if (learning >= 15) return 6;
    if (learning >= 10) return 5;
    return 4;
  }

  function syncEducation(state) {
    const education = state?.education || {};
    let level = 0;
    if (education.graduated && education.university) {
      level = education.universityType === '高职专科'
        ? 2 : (Number(education.examScore) >= 85 ? 4 : 3);
    } else if (['graduate', 'workforce'].includes(education.schoolStage)
      && (education.highSchoolType || education.vocationalMajor)) level = 1;
    const currentTrait = Game.structuredTraits.ensure(state.profile).education;
    if (level > (Number(currentTrait.level) || 0)) {
      Game.structuredTraits.setEducation(state.profile, '学识', level);
    }
  }

  Game.learningAttribute = Object.freeze({
    adultBase, current, sync, inherit, checkValue, examRate, planSlots, syncEducation,
  });
}(window));
