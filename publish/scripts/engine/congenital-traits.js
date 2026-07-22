(function initCongenitalTraits(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clampTier = (value) => Math.max(0, Math.min(3, Math.round(Number(value) || 0)));

  function hash(text) {
    let value = 2166136261;
    for (const char of String(text || 'trait')) {
      value ^= char.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function seeded(seed) {
    let value = hash(seed);
    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function founderTier(rng) {
    const roll = rng();
    return roll < 0.7 ? 0 : (roll < 0.9 ? 1 : (roll < 0.98 ? 2 : 3));
  }

  function expressed(genes) {
    const average = (genes[0] + genes[1]) / 2;
    return clampTier(average + (genes[0] === genes[1] && genes[0] > 0 ? 0.35 : 0));
  }

  function entry(genes, mutations) {
    return { genes: genes.map(clampTier), tier: expressed(genes), mutations: mutations || [] };
  }

  function valid(target) {
    return Game.characterTraits.kinds.every((kind) => {
      const item = target.congenital?.[kind];
      return Array.isArray(item?.genes) && item.genes.length === 2
        && item.genes.every((gene) => Number.isInteger(gene) && gene >= 0 && gene <= 3);
    });
  }

  function finalize(target, gender) {
    target.congenital.version = 1;
    target.congenital.summary = Game.characterTraits.kinds.map((kind) => (
      Game.characterTraits.name(kind, target.congenital[kind].tier, gender)
    )).filter(Boolean);
    if (target.stats) Game.characterAttributes?.ensurePerson(target);
    return target.congenital;
  }

  function founder(target, gender, seed) {
    if (valid(target)) return finalize(target, gender);
    const rng = seeded(seed || target.id || target.name);
    target.congenital = {};
    Game.characterTraits.kinds.forEach((kind) => {
      const tier = founderTier(rng);
      const second = clampTier(tier + (rng() < 0.22 ? (rng() < 0.5 ? -1 : 1) : 0));
      target.congenital[kind] = entry([tier, second]);
    });
    return finalize(target, gender);
  }

  function ensure(target, gender, seed) {
    return valid(target) ? finalize(target, gender) : founder(target, gender, seed);
  }

  function inheritedGene(parent, kind, rng) {
    const genes = parent.congenital[kind].genes;
    return genes[Math.floor(rng() * genes.length)];
  }

  function mutate(gene, rng, mutations, kind) {
    if (rng() >= 0.025) return gene;
    const next = clampTier(gene + (rng() < 0.5 ? -1 : 1));
    if (next !== gene) mutations.push({ kind, from: gene, to: next });
    return next;
  }

  function inheritInto(target, gender, leftParent, rightParent, seed) {
    const rng = seeded(seed || `${target.id}-${target.name}`);
    ensure(leftParent, leftParent.gender || gender, `${seed}-left`);
    ensure(rightParent, rightParent.gender || gender, `${seed}-right`);
    target.congenital = {};
    Game.characterTraits.kinds.forEach((kind) => {
      const mutations = [];
      const genes = [
        mutate(inheritedGene(leftParent, kind, rng), rng, mutations, kind),
        mutate(inheritedGene(rightParent, kind, rng), rng, mutations, kind),
      ];
      target.congenital[kind] = entry(genes, mutations);
    });
    finalize(target, gender);
    Game.characterAttributes?.inheritPotential(target, leftParent, rightParent);
    return target.congenital;
  }

  function names(target, gender) {
    ensure(target, gender, target.id || target.name);
    return target.congenital.summary.slice();
  }

  function healthBonus(target) {
    const tier = target?.congenital?.strength?.tier || 0;
    return Game.characterTraits.effect('strength', tier).health || 0;
  }

  Game.congenitalTraits = Object.freeze({ founder, ensure, inheritInto, names, healthBonus });
}(window));
