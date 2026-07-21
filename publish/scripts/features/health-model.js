(function initHealthModel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
  const hasMonth = (value) => Number.isFinite(value);

  function agePenalty(age) {
    if (age <= 40) return 0;
    if (age <= 55) return (age - 40) * 0.35;
    if (age <= 70) return 5.25 + (age - 55) * 0.7;
    return 15.75 + (age - 70) * 1.2;
  }

  function diseaseRetention(state) {
    return (state.health.diseases || []).filter((item) => !hasMonth(item.healedAt))
      .reduce((retention, disease) => {
        const def = Game.healthData.get(disease.id);
        if (!def) return retention;
        const managed = hasMonth(disease.treatedAt);
        const penalty = def.healthPenalty * (managed ? 0.25 : 1);
        return retention * (1 - clamp(penalty, 0, 0.8));
      }, 1);
  }

  function injuryPenalty(state) {
    return (state.health.injuries || []).filter((item) => !hasMonth(item.healedAt))
      .reduce((sum, item) => sum + clamp(item.severity || 0, 0, 20), 0);
  }

  function modifiers(state) {
    const age = Game.content.age(state);
    const diet = { 均衡饮食: 3, 高蛋白: 2, 清淡饮食: 2, 放纵饮食: -4 }[state.health.diet] || 0;
    const lifestyle = clamp(state.health.lifestyleScore, -10, 10);
    const strength = Game.congenitalTraits.healthBonus(state.profile);
    const medical = Math.round(clamp(state.health.careLevel) / 20);
    const sleep = state.health.sleep >= 8 ? 3 : (state.health.sleep >= 7 ? 0 : -(7 - state.health.sleep) * 3);
    const stress = Game.stressSystem.effects(state).health;
    return {
      strength, lifestyle: diet + lifestyle, medical,
      age: -Math.round(agePenalty(age)), injury: -Math.round(injuryPenalty(state)),
      sleep: Math.round(sleep), stress,
    };
  }

  function calculate(state) {
    const item = ensure(state);
    const mods = modifiers(state);
    const beforeDisease = item.baseVitality + Object.values(mods).reduce((sum, value) => sum + value, 0);
    const retention = diseaseRetention(state);
    return {
      ceiling: clamp(Math.round(beforeDisease * retention), 1, 100),
      retention, modifiers: mods,
    };
  }

  function ensure(state) {
    state.health = state.health && typeof state.health === 'object' ? state.health : {};
    const item = state.health;
    item.injuries = Array.isArray(item.injuries) ? item.injuries : [];
    item.lifestyleScore = clamp(item.lifestyleScore, -10, 10);
    const current = clamp(state.stats?.健康 || item.current || 75, 1, 100);
    if (!Number.isFinite(item.baseVitality)) {
      const strength = Game.congenitalTraits.healthBonus(state.profile);
      item.baseVitality = clamp(Math.round(current + agePenalty(Game.content.age(state)) - strength), 45, 100);
    }
    item.current = current;
    item.ceiling = Number.isFinite(item.ceiling) ? clamp(item.ceiling, 1, 100) : current;
    return item;
  }

  function updateLifestyle(state) {
    const item = ensure(state);
    let delta = state.health.sleep >= 8 ? 0.25 : (state.health.sleep < 6 ? -0.5 : 0);
    if (state.health.diet === '均衡饮食') delta += 0.2;
    item.lifestyleScore = clamp(item.lifestyleScore + delta, -10, 10);
  }

  function monthly(state) {
    const item = ensure(state);
    updateLifestyle(state);
    const result = calculate(state);
    const externalCurrent = clamp(state.stats.健康, 1, 100);
    item.current = externalCurrent;
    item.ceiling = result.ceiling;
    item.retention = result.retention;
    item.modifiers = result.modifiers;
    if (item.current > item.ceiling) {
      item.current -= Math.max(1, Math.ceil((item.current - item.ceiling) * 0.3));
    } else if (item.current < item.ceiling) {
      const recovery = 1 + Math.max(0, Math.round(item.careLevel / 35));
      item.current += Math.min(recovery, item.ceiling - item.current);
    }
    item.current = clamp(Math.round(item.current), 1, 100);
    state.stats.健康 = item.current;
    return item;
  }

  function sync(state) {
    const item = ensure(state);
    const result = calculate(state);
    item.ceiling = result.ceiling;
    item.retention = result.retention;
    item.modifiers = result.modifiers;
    state.stats.健康 = clamp(state.stats.健康, 1, 100);
    item.current = state.stats.健康;
    return item;
  }

  function deathCause(state) {
    const item = ensure(state);
    const untreatedFatal = (state.health.diseases || []).some((disease) => {
      const def = Game.healthData.get(disease.id);
      return def?.fatal && !hasMonth(disease.healedAt) && !hasMonth(disease.treatedAt);
    });
    if (untreatedFatal && item.current <= 15 && Math.random() < 0.2) return '致命疾病';
    const age = Game.content.age(state);
    const ageRisk = age < 65 ? 0 : Math.min(0.22, (age - 64) * 0.0015);
    if (item.current <= 5 && Math.random() < 0.15) return '健康恶化';
    const frailty = age >= 50 && item.current < 35 ? (35 - item.current) / 180 : 0;
    return Math.random() < ageRisk + frailty ? '自然衰老' : '';
  }

  function status(value) {
    if (value >= 85) return '精力充沛';
    if (value >= 65) return '状态良好';
    if (value >= 45) return '略显虚弱';
    if (value >= 25) return '健康不佳';
    return '病危';
  }

  function npcStatus(state, person) {
    const age = Game.content.personAge(state, person);
    Game.characterAttributes.ensurePerson(person, age);
    const estimate = clamp((person.stats?.健康 || 65)
      + Game.congenitalTraits.healthBonus(person) - agePenalty(age), 1, 100);
    return status(estimate);
  }

  Game.healthModel = Object.freeze({
    ensure, calculate, monthly, sync, status, npcStatus, deathCause, diseaseRetention,
  });
}(window));
