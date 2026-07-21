(function initCharacterAttributes(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Innate = Game.innateAttributes;
  const abilities = Innate.abilities;
  const aliases = Object.freeze({ 智力: '学识', 魅力: '交涉', 力量: '体能' });
  const clamp = (value, min = 0, max = 100) => (
    Math.max(min, Math.min(max, Number(value) || 0))
  );

  function normalize(name) {
    return aliases[name] || (abilities.includes(name) ? name : '');
  }

  function congenitalBonus(target, ability) {
    const kind = Game.characterTraits.abilityKinds[ability];
    const tier = target.congenital?.[kind]?.tier || 0;
    return Game.characterTraits.effect(kind, tier).check;
  }

  function modifierScale(target) {
    const age = Number.isFinite(target?.abilityAge)
      ? target.abilityAge : (Number.isFinite(target?.baseAge) ? target.baseAge : 18);
    return Innate.maturity(age);
  }

  function rawValue(target, ability) {
    const modifiers = congenitalBonus(target, ability)
      + Game.structuredTraits.abilityBonus(target, ability);
    return clamp((target.abilities?.[ability] || 0) + modifiers * modifierScale(target));
  }

  function derivedCharm(target) {
    const beauty = Game.characterTraits.effect(
      'beauty', target.congenital?.beauty?.tier || 0,
    ).check;
    const negotiation = Innate.checkValue(rawValue(target, '交涉'));
    return clamp(Math.round(
      (target.presentation || 50) * 0.55 + negotiation * 0.35 + beauty,
    ));
  }

  function syncLegacy(target, sourceStats) {
    if (!sourceStats || !target.abilities) return;
    sourceStats.智力 = Math.round(rawValue(target, '学识'));
    sourceStats.力量 = Innate.checkValue(rawValue(target, '体能'));
    sourceStats.魅力 = derivedCharm(target);
  }

  function ensure(target, sourceStats, education, age) {
    if (!target) return null;
    Game.structuredTraits.ensure(target);
    target.presentation = Number.isFinite(target.presentation)
      ? clamp(target.presentation) : clamp(sourceStats?.魅力 ?? 50);
    Innate.syncAll(target, age, target.id || target.name);
    target.abilityGrowth.version = 3;
    target.attributes = target.abilityGrowth;
    syncLegacy(target, sourceStats);
    target.academicAbility = rawValue(target, '学识');
    if (!Number.isFinite(target.studyHabit)) {
      target.studyHabit = clamp(
        35 + (target.upbringing?.education || 0) * 0.35
          + String(target.id || target.name || '').length % 24,
      );
    }
    return target.abilityGrowth;
  }

  function ensurePerson(person, age) {
    return ensure(person, person?.stats, null, age);
  }

  function ensurePlayer(state) {
    Game.legacyMood.ensure(state);
    Innate.syncEducation(state);
    const data = ensure(
      state.profile, state.stats, state.education, Game.content.age(state),
    );
    state.abilities = state.profile.abilities;
    state.abilityGrowth = state.profile.abilityGrowth;
    return data;
  }

  function temporaryPenalty(state, ability) {
    if (!state) return 0;
    const stress = Game.stressSystem?.ensure(state).level || 0;
    const staminaMax = Math.max(1, Number(state.stamina?.max) || 100);
    const stamina = Number.isFinite(state.stamina?.current)
      ? state.stamina.current : staminaMax;
    const fatigue = clamp(100 - stamina / staminaMax * 100);
    const health = clamp(state.stats?.健康 ?? 60);
    let penalty = stress * 0.8 + fatigue / (ability === '体能' ? 18 : 28);
    if (health < 50) penalty += (50 - health) / (ability === '体能' ? 12 : 20);
    return Math.round(penalty);
  }

  function playerlessValue(target, name) {
    const ability = normalize(name);
    if (!ability) return 0;
    ensure(target, target.stats);
    return rawValue(target, ability);
  }

  function playerValue(state, name) {
    const ability = normalize(name);
    if (!ability) return 0;
    ensurePlayer(state);
    return clamp(rawValue(state.profile, ability) - temporaryPenalty(state, ability));
  }

  function personValue(person, name) {
    return playerlessValue(person, name);
  }

  function gain(state, name) {
    ensurePlayer(state);
    return 0;
  }

  function gainPerson(person, name) {
    ensurePerson(person);
    return 0;
  }

  function potential(target, name) {
    return Math.round(Innate.adultBase(target, normalize(name)));
  }

  function progress(target, name, state) {
    const ability = normalize(name);
    ensure(target, target.stats, null, state ? Game.content.age(state) : undefined);
    return {
      current: Math.round(rawValue(target, ability)),
      effective: state ? playerValue(state, ability) : personValue(target, ability),
      potential: potential(target, ability),
      xp: 0,
    };
  }

  function inheritPotential(child, left, right) {
    ensurePerson(left);
    ensurePerson(right);
    Innate.inheritAll(child, left, right, child.id || child.name);
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
    adjustPresentation, syncLegacy, checkValue: Innate.checkValue,
  });
}(window));
