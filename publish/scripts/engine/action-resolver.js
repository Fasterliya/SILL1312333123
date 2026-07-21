(function initActionResolver(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
  const tiers = Object.freeze([
    { min: 80, id: 'excellent', label: '优秀', multiplier: 1.4 },
    { min: 60, id: 'success', label: '成功', multiplier: 1.15 },
    { min: 40, id: 'partial', label: '勉强完成', multiplier: 0.88 },
    { min: 0, id: 'failed', label: '受挫', multiplier: 0.62 },
  ]);

  function abilityValue(state, name) {
    if (name === '魅力') return Game.characterAttributes.derivedCharm(state.profile);
    return Game.characterAttributes.playerValue(state, name);
  }
  function checkValue(name, value) {
    if (name === '魅力') return value;
    return Game.characterAttributes.normalize(name)
      ? Game.characterAttributes.checkValue(value) : value;
  }

  function tierFor(score) {
    return tiers.find((item) => score >= item.min) || tiers[tiers.length - 1];
  }

  function probability(score, config) {
    const raw = 1 / (1 + Math.exp(-(score - 52) / 11));
    const multiplier = Number(config.chanceMultiplier) || 1;
    return clamp(raw * multiplier, config.minChance ?? 0.04, config.maxChance ?? 0.94);
  }

  function calculate(state, config, randomModifier) {
    const primaryName = config.primary || '学识';
    const secondaryName = config.secondary || primaryName;
    const primary = abilityValue(state, primaryName);
    const secondary = abilityValue(state, secondaryName);
    const context = Number(config.context) || 0;
    const difficulty = clamp(config.difficulty ?? 50, 0, 120);
    const primaryModifier = checkValue(primaryName, primary) * 0.58;
    const secondaryModifier = checkValue(secondaryName, secondary) * 0.22;
    const difficultyModifier = difficulty * -0.38;
    const score = clamp(Math.round((22 + primaryModifier + secondaryModifier + context
      + difficultyModifier + randomModifier) * 10) / 10);
    const tier = tierFor(score);
    const result = {
      label: config.label || '行动',
      score,
      tier: tier.id,
      tierLabel: tier.label,
      success: score >= 40,
      multiplier: tier.multiplier,
      chance: probability(score, config),
      breakdown: {
        primary: { name: primaryName, value: Math.round(primary), modifier: Math.round(primaryModifier) },
        secondary: { name: secondaryName, value: Math.round(secondary), modifier: Math.round(secondaryModifier) },
        context: Math.round(context),
        difficulty: Math.round(difficultyModifier),
        random: Math.round(randomModifier),
      },
    };
    return result;
  }

  function preview(state, config = {}) {
    return calculate(state, config, 0);
  }

  function resolve(state, config = {}) {
    const variance = clamp(config.variance ?? 7, 0, 30);
    const random = variance ? (Math.random() * 2 - 1) * variance : 0;
    return calculate(state, config, random);
  }

  function chance(state, config = {}) {
    return preview(state, config).chance;
  }

  function summary(result) {
    const detail = result.breakdown;
    const context = detail.context ? `，情境${detail.context > 0 ? '+' : ''}${detail.context}` : '';
    return `${result.label}${result.tierLabel}（${Math.round(result.score)}）`
      + `：${detail.primary.name}${detail.primary.value}`
      + `、${detail.secondary.name}${detail.secondary.value}${context}`;
  }

  Game.actionResolver = Object.freeze({ preview, resolve, chance, summary, tiers });
}(window));
