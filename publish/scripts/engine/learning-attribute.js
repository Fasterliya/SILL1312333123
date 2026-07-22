(function initInnateAttributes(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const VERSION = 2;
  const abilities = Object.freeze(['学识', '交涉', '管理', '心计', '体能']);
  const clamp = (value, min = 0, max = 100) => (
    Math.max(min, Math.min(max, Number(value) || 0))
  );

  function hash(value) {
    return [...String(value || 'person')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function ageOf(target, age) {
    if (Number.isFinite(age)) return Math.max(0, age);
    if (Number.isFinite(target?.abilityAge)) return Math.max(0, target.abilityAge);
    if (Number.isFinite(target?.baseAge)) return Math.max(0, target.baseAge);
    return 18;
  }

  function maturity(age) {
    const years = Math.max(0, Number(age) || 0);
    if (years < 3) return 0.28 + years * 0.04;
    if (years < 6) return 0.4 + (years - 3) * 0.05;
    if (years < 12) return 0.58 + (years - 6) * 0.04;
    if (years < 18) return 0.8 + (years - 12) * 0.03;
    return 1;
  }

  function migratedBase(target, ability, age, seed) {
    if (ability === '学识' && Number.isFinite(target.innateLearning)) {
      return clamp(target.innateLearning, 8, 42);
    }
    const old = Number(target.abilities?.[ability]);
    if (Number.isFinite(old) && old > 0) {
      return clamp(Math.round(old / Math.max(0.35, maturity(age)) / 2), 8, 42);
    }
    return 17 + hash(`${seed || target.id || target.name}:${ability}`) % 9;
  }

  function adultBase(target, ability = '学识', seed, age) {
    const name = abilities.includes(ability) ? ability : '学识';
    target.innateAbilities = target.innateAbilities && typeof target.innateAbilities === 'object'
      ? target.innateAbilities : {};
    if (!Number.isFinite(target.innateAbilities[name])) {
      target.innateAbilities[name] = migratedBase(
        target, name, ageOf(target, age), seed || ability,
      );
    }
    target.innateModelVersion = VERSION;
    if (name === '学识') {
      target.innateLearning = target.innateAbilities[name];
      target.learningModelVersion = VERSION;
    }
    return clamp(target.innateAbilities[name], 8, 42);
  }

  function current(target, ability = '学识', age, seed) {
    return clamp(Math.round(
      adultBase(target, ability, seed, age) * maturity(ageOf(target, age)),
    ));
  }

  function syncAll(target, age, seed) {
    const resolvedAge = ageOf(target, age);
    target.abilityAge = resolvedAge;
    target.abilities ||= {};
    target.abilityGrowth ||= { potential: {}, xp: {}, history: [] };
    target.abilityGrowth.potential ||= {};
    target.abilityGrowth.xp ||= {};
    abilities.forEach((ability) => {
      target.abilities[ability] = current(target, ability, resolvedAge, seed);
      target.abilityGrowth.potential[ability] = adultBase(
        target, ability, seed, resolvedAge,
      );
      target.abilityGrowth.xp[ability] = 0;
    });
    target.abilityGrowth.history = [];
    return target.abilities;
  }

  function sync(target, age, seed) {
    syncAll(target, age, seed);
    return target.abilities.学识;
  }

  function inheritAll(child, left, right, seed) {
    child.innateAbilities = {};
    abilities.forEach((ability) => {
      const average = (adultBase(left, ability) + adultBase(right, ability)) / 2;
      const mutation = hash(`${seed || child.id || child.name}:${ability}:inherit`) % 5 - 2;
      child.innateAbilities[ability] = clamp(Math.round(average + mutation), 10, 38);
    });
    child.innateModelVersion = VERSION;
    child.innateLearning = child.innateAbilities.学识;
    child.learningModelVersion = VERSION;
    return syncAll(child, Number.isFinite(child.baseAge) ? child.baseAge : 0, seed);
  }

  function inherit(child, left, right, seed) {
    inheritAll(child, left, right, seed);
    return child.abilities.学识;
  }

  function checkValue(value) {
    return clamp(Math.round(clamp(value) * 2));
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

  const api = Object.freeze({
    abilities, adultBase, current, maturity, sync, syncAll, inherit, inheritAll,
    checkValue, examRate, planSlots, syncEducation,
  });
  Game.innateAttributes = api;
  Game.learningAttribute = api;
}(window));
