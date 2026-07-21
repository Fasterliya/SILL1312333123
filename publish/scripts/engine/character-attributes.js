(function initCharacterAttributes(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const stats = ['智力', '魅力', '力量'];
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));

  function hash(value) {
    return [...String(value || 'person')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function traitEffect(target, stat) {
    const kind = Game.characterTraits.statKinds[stat];
    const tier = target.congenital?.[kind]?.tier || 0;
    return Game.characterTraits.effect(kind, tier);
  }

  function educationBonus(target, stat, education) {
    if (stat !== '智力') return stat === '魅力' ? Math.round((target.upbringing?.independence || 0) / 25) : 0;
    const upbringing = Number(target.upbringing?.education) || 0;
    const discipline = Number(education?.discipline) || 0;
    const level = Number(target.educationLevel) || 0;
    return Math.round(upbringing / 18 + discipline / 25 + level * 2);
  }

  function ensure(target, sourceStats, education) {
    if (!target || !sourceStats) return null;
    const seed = hash(target.id || target.name);
    sourceStats.力量 = Number.isFinite(sourceStats.力量) ? sourceStats.力量 : 38 + (seed >>> 9) % 43;
    target.attributes = target.attributes && typeof target.attributes === 'object' ? target.attributes : {};
    const data = target.attributes;
    data.potential = data.potential && typeof data.potential === 'object' ? data.potential : {};
    data.progress = data.progress && typeof data.progress === 'object' ? data.progress : {};
    data.history = Array.isArray(data.history) ? data.history.slice(-12) : [];
    stats.forEach((stat, index) => {
      const effect = traitEffect(target, stat);
      if (!data.version) sourceStats[stat] = clamp(Math.round((sourceStats[stat] || 45) + effect.start));
      const natural = 66 + ((seed >>> (index * 5)) % 18);
      const desired = natural + effect.potential + educationBonus(target, stat, education);
      const floor = data.version ? sourceStats[stat] : sourceStats[stat] + 5;
      data.potential[stat] = clamp(Math.max(data.potential[stat] || 0, floor, desired));
      data.progress[stat] = clamp(data.progress[stat], 0, 0.99);
      sourceStats[stat] = clamp(sourceStats[stat]);
    });
    data.version = 1;
    if (!Number.isFinite(target.academicAbility)) {
      target.academicAbility = clamp(sourceStats.智力 + traitEffect(target, '智力').check);
    }
    if (!Number.isFinite(target.studyHabit)) {
      target.studyHabit = clamp(35 + (target.upbringing?.education || 0) * 0.35 + seed % 24);
    }
    return data;
  }

  function ensurePerson(person) {
    return ensure(person, person?.stats, {
      discipline: person?.studyHabit, level: person?.educationLevel,
    });
  }

  function ensurePlayer(state) {
    return ensure(state.profile, state.stats, state.education);
  }

  function gainFor(target, sourceStats, stat, base, source, education) {
    if (!stats.includes(stat) || base <= 0) return 0;
    const data = ensure(target, sourceStats, education);
    const current = sourceStats[stat];
    const potential = data.potential[stat];
    const room = Math.max(0, potential - current);
    const diminishing = room <= 0 ? 0.08 : clamp(0.15 + room / 38, 0.15, 1);
    const earned = base * diminishing * traitEffect(target, stat).growth;
    data.progress[stat] += earned;
    const whole = Math.floor(data.progress[stat]);
    if (whole > 0) {
      sourceStats[stat] = clamp(Math.min(potential, current + whole));
      data.progress[stat] -= whole;
      data.history.push({ stat, amount: sourceStats[stat] - current, source, at: Date.now() });
      data.history = data.history.slice(-12);
    }
    return sourceStats[stat] - current;
  }

  function gain(state, stat, base, source) {
    return gainFor(state.profile, state.stats, stat, base, source, state.education);
  }

  function gainPerson(person, stat, base, source) {
    return gainFor(person, person.stats, stat, base, source, {
      discipline: person.studyHabit, level: person.educationLevel,
    });
  }

  function effective(target, sourceStats, stat) {
    ensure(target, sourceStats);
    return clamp(sourceStats[stat] + traitEffect(target, stat).check);
  }

  function playerValue(state, stat) {
    const value = effective(state.profile, state.stats, stat);
    const stress = Game.stressSystem?.effects(state) || {};
    const penalty = stat === '智力' ? stress.learning : (stat === '魅力' ? stress.social : stress.health / 2);
    return clamp(value + (penalty || 0));
  }

  function personValue(person, stat) {
    return effective(person, person.stats, stat);
  }

  function potential(target, stat) {
    return Math.round(target.attributes?.potential?.[stat] || target.stats?.[stat] || 0);
  }

  Game.characterAttributes = Object.freeze({
    ensure, ensurePerson, ensurePlayer, gain, gainPerson, playerValue, personValue, potential,
  });
}(window));
