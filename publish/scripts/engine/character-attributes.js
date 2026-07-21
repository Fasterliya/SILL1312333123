(function initCharacterAttributes(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {};
  const abilities = Object.freeze(['学识', '交涉', '管理', '心计', '体能']);
  const aliases = Object.freeze({ 智力: '学识', 魅力: '交涉', 力量: '体能' });
  const legacyNames = Object.freeze({ 学识: '智力', 交涉: '魅力', 体能: '力量' });
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
  function hash(value) {
    return [...String(value || 'person')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }
  function normalize(name) {
    return aliases[name] || (abilities.includes(name) ? name : '');
  }
  function congenital(target, ability) {
    const kind = Game.characterTraits.abilityKinds[ability];
    const tier = target.congenital?.[kind]?.tier || 0;
    const base = Game.characterTraits.effect(kind, tier);
    const scale = ['交涉', '管理', '心计'].includes(ability) ? 0.35 : 1;
    return {
      potential: Math.round(base.potential * scale),
      growth: 1 + (base.growth - 1) * scale,
      check: Math.round(base.check * scale),
    };
  }
  function initial(target, sourceStats, ability, seed) {
    if (ability === '学识') return Number(sourceStats?.智力) || 42 + seed % 22;
    if (ability === '交涉') return Number(sourceStats?.魅力) || 40 + (seed >>> 4) % 24;
    if (ability === '体能') return Number(sourceStats?.力量) || Math.round((sourceStats?.健康 || 65) * 0.75);
    if (ability === '管理') return 38 + (seed >>> 8) % 27;
    return 36 + (seed >>> 13) % 29;
  }
  function derivedCharm(target) {
    const beauty = Game.characterTraits.effect('beauty', target.congenital?.beauty?.tier || 0).check;
    const social = Game.structuredTraits.abilityBonus(target, '交涉');
    return clamp(Math.round((target.presentation || 50) * 0.55
      + (target.abilities?.交涉 || 50) * 0.35 + beauty + social * 0.35));
  }
  function syncLegacy(target, sourceStats) {
    if (!sourceStats || !target.abilities) return;
    sourceStats.智力 = Math.round(target.abilities.学识);
    sourceStats.力量 = Math.round(target.abilities.体能);
    sourceStats.魅力 = derivedCharm(target);
  }
  function rawValue(target, ability) {
    return clamp((target.abilities?.[ability] || 0) + congenital(target, ability).check
      + Game.structuredTraits.abilityBonus(target, ability));
  }
  function ensure(target, sourceStats, education) {
    if (!target) return null;
    Game.structuredTraits.ensure(target);
    const seed = hash(target.id || target.name);
    target.abilities = target.abilities && typeof target.abilities === 'object' ? target.abilities : {};
    const old = target.attributes && typeof target.attributes === 'object' ? target.attributes : {};
    target.abilityGrowth = target.abilityGrowth && typeof target.abilityGrowth === 'object'
      ? target.abilityGrowth : { potential: {}, xp: {}, history: [] };
    const growth = target.abilityGrowth;
    growth.potential ||= {};
    growth.xp ||= {};
    growth.history = Array.isArray(growth.history) ? growth.history.slice(-16) : [];
    target.presentation = Number.isFinite(target.presentation)
      ? clamp(target.presentation) : clamp(sourceStats?.魅力 ?? 50);
    abilities.forEach((ability, index) => {
      const legacyName = legacyNames[ability];
      const legacy = legacyName ? old.potential?.[legacyName] : undefined;
      target.abilities[ability] = clamp(target.abilities[ability] ?? initial(target, sourceStats, ability, seed));
      const natural = 52 + ((seed >>> (index * 5)) % 25) + congenital(target, ability).potential;
      growth.potential[ability] = clamp(growth.potential[ability] ?? legacy ?? natural);
      growth.xp[ability] = clamp(growth.xp[ability]
        ?? ((legacyName ? old.progress?.[legacyName] : 0) || 0) * 100, 0, 99.99);
    });
    growth.version = 2;
    target.attributes = growth;
    syncLegacy(target, sourceStats);
    target.academicAbility = rawValue(target, '学识');
    if (!Number.isFinite(target.studyHabit)) target.studyHabit = clamp(35 + (target.upbringing?.education || 0) * 0.35 + seed % 24);
    return growth;
  }
  function ensurePerson(person) {
    return ensure(person, person?.stats, { level: person?.educationLevel });
  }
  function ensurePlayer(state) {
    Game.legacyMood.ensure(state);
    const data = ensure(state.profile, state.stats, state.education);
    state.abilities = state.profile.abilities;
    state.abilityGrowth = state.profile.abilityGrowth;
    return data;
  }
  function stateMultiplier(state) {
    if (!state) return 1;
    const health = clamp(state.stats?.健康 ?? 60) / 100;
    const stress = Game.stressSystem?.ensure(state).level || 0;
    const staminaMax = Math.max(1, Number(state.stamina?.max) || 100);
    const stamina = Number.isFinite(state.stamina?.current) ? state.stamina.current : staminaMax;
    const fatigue = 1 - clamp(100 - stamina / staminaMax * 100, 0, 100) / 180;
    return clamp((0.75 + health * 0.25) * fatigue - stress * 0.06, 0.25, 1.1);
  }
  function gainFor(target, sourceStats, name, base, source, state) {
    const ability = normalize(name);
    if (!ability || base <= 0) return 0;
    const growth = ensure(target, sourceStats);
    const current = target.abilities[ability];
    const potential = growth.potential[ability];
    const diminishing = Math.max(0.05, 1 - ((current / 100) ** 1.6));
    const potentialFactor = current <= potential ? 0.75 + (potential - current) / 100 : 0.22;
    const traitFactor = congenital(target, ability).growth
      * Game.structuredTraits.growthMultiplier(target, ability);
    const earned = base * 12 * diminishing * potentialFactor * traitFactor * stateMultiplier(state);
    growth.xp[ability] += earned;
    let gained = 0;
    while (growth.xp[ability] >= 100 && target.abilities[ability] < 100) {
      growth.xp[ability] -= 100;
      target.abilities[ability] += 1;
      gained += 1;
    }
    if (gained) {
      growth.history.push({ ability, amount: gained, source, month: state?.totalMonths ?? null });
      growth.history = growth.history.slice(-16);
    }
    syncLegacy(target, sourceStats);
    return gained;
  }
  function temporaryPenalty(state, ability) {
    if (!state) return 0;
    const stress = Game.stressSystem?.ensure(state).level || 0;
    const staminaMax = Math.max(1, Number(state.stamina?.max) || 100);
    const stamina = Number.isFinite(state.stamina?.current) ? state.stamina.current : staminaMax;
    const fatigue = clamp(100 - stamina / staminaMax * 100, 0, 100);
    const health = clamp(state.stats?.健康 ?? 60);
    let penalty = stress * 3 + Math.round(fatigue / (ability === '体能' ? 10 : 20));
    if (health < 50) penalty += Math.round((50 - health) / (ability === '体能' ? 4 : 8));
    return penalty;
  }
  function playerlessValue(target, name) {
    const ability = normalize(name);
    ensure(target, target.stats);
    return rawValue(target, ability);
  }
  function playerValue(state, name) {
    const ability = normalize(name);
    ensurePlayer(state);
    return clamp(playerlessValue(state.profile, ability) - temporaryPenalty(state, ability));
  }
  function personValue(person, name) {
    return playerlessValue(person, name);
  }
  function gain(state, name, base, source) {
    return gainFor(state.profile, state.stats, name, base, source, state);
  }
  function gainPerson(person, name, base, source) {
    return gainFor(person, person.stats, name, base, source, null);
  }
  function potential(target, name) {
    return Math.round(target.abilityGrowth?.potential?.[normalize(name)] || 50);
  }
  function progress(target, name, state) {
    const ability = normalize(name);
    ensure(target, target.stats);
    return {
      current: Math.round(target.abilities[ability]),
      effective: state ? playerValue(state, ability) : personValue(target, ability),
      potential: potential(target, ability),
      xp: Math.floor(target.abilityGrowth.xp[ability] || 0),
    };
  }
  function inheritPotential(child, left, right) {
    ensurePerson(left);
    ensurePerson(right);
    ensurePerson(child);
    const seed = hash(`${child.id || child.name}:potential`);
    abilities.forEach((ability, index) => {
      const inherited = 50 + (potential(left, ability) - 50) * 0.35
        + (potential(right, ability) - 50) * 0.35;
      const mutation = ((seed >>> (index * 5)) % 13) - 6;
      child.abilityGrowth.potential[ability] = clamp(Math.round(
        inherited + mutation + congenital(child, ability).potential));
      if ((child.baseAge || 0) < 18) {
        child.abilities[ability] = clamp(16 + (child.baseAge || 0) * 1.6 + ((seed >>> index) % 7));
        child.abilityGrowth.xp[ability] = 0;
      }
    });
    syncLegacy(child, child.stats);
  }
  function adjustPresentation(target, sourceStats, amount) {
    ensure(target, sourceStats);
    target.presentation = clamp(target.presentation + amount);
    syncLegacy(target, sourceStats);
  }
  Game.characterAttributes = Object.freeze({
    abilities, normalize, ensure, ensurePerson, ensurePlayer, gain, gainPerson,
    playerValue, personValue, potential, progress, derivedCharm, inheritPotential,
    adjustPresentation, syncLegacy,
  });
}(window));
