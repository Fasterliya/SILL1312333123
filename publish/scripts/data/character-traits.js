(function initCharacterTraits(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const tiers = {
    intelligence: [
      null,
      { names: { any: '机敏' }, start: 0, potential: 8, growth: 1.08, check: 2 },
      { names: { any: '聪慧' }, start: 1, potential: 15, growth: 1.16, check: 4 },
      { names: { any: '天才' }, start: 2, potential: 24, growth: 1.25, check: 7 },
    ],
    beauty: [
      null,
      { names: { any: '眉清目秀' }, start: 0, potential: 7, growth: 1.05, check: 3 },
      { names: { 男: '玉树临风', 女: '螓首蛾眉' }, start: 1, potential: 13, growth: 1.1, check: 6 },
      { names: { 男: '风华绝代', 女: '倾国倾城' }, start: 2, potential: 20, growth: 1.16, check: 10 },
    ],
    strength: [
      null,
      { names: { any: '强健' }, start: 0, potential: 8, growth: 1.08, check: 2, health: 3 },
      { names: { any: '孔武有力' }, start: 1, potential: 15, growth: 1.15, check: 5, health: 7 },
      { names: { any: '力能扛鼎' }, start: 2, potential: 22, growth: 1.22, check: 8, health: 12 },
    ],
  };
  const statKinds = Object.freeze({ 智力: 'intelligence', 魅力: 'beauty', 力量: 'strength' });
  const abilityKinds = Object.freeze({
    学识: 'intelligence', 交涉: 'beauty', 管理: 'intelligence',
    心计: 'intelligence', 体能: 'strength',
  });

  function get(kind, tier) {
    return tiers[kind]?.[Math.max(0, Math.min(3, Number(tier) || 0))] || null;
  }

  function name(kind, tier, gender) {
    const item = get(kind, tier);
    return item ? (item.names[gender] || item.names.any) : '';
  }

  function effect(kind, tier) {
    return get(kind, tier) || { start: 0, potential: 0, growth: 1, check: 0, health: 0 };
  }

  Game.characterTraits = Object.freeze({
    kinds: Object.freeze(['intelligence', 'beauty', 'strength']),
    labels: Object.freeze({ intelligence: '聪慧', beauty: '美貌', strength: '力量' }),
    statKinds, abilityKinds, get, name, effect,
  });
}(window));
