(function initGenetics(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const catalog = () => Game.geneticsCatalog;
  const keys = () => Object.keys(catalog().loci);

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }
  function seeded(seed) {
    let value = hash(String(seed || 'life'));
    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }
  function weighted(definition, rng) {
    const total = definition.values.reduce((sum, item) => sum + item.weight, 0);
    let cursor = rng() * total;
    return definition.values.find((item) => {
      cursor -= item.weight;
      return cursor <= 0;
    }) || definition.values[0];
  }
  const allele = (entry) => ({ value: entry.value, dominance: entry.dominance });
  const pick = (pair, rng) => pair[Math.floor(rng() * pair.length)] || pair[0];

  function bodyFrame(value) {
    if (String(value).includes('娇小')) return '娇小骨架';
    if (['清瘦', '小胸'].includes(value)) return '纤细骨架';
    if (value === '健壮') return '结实骨架';
    if (value === '丰满') return '丰润骨架';
    return '匀称骨架';
  }
  function hairTendency(value) {
    if (String(value).includes('卷')) return '轻微卷曲';
    if (String(value).includes('层次') || String(value).includes('碎')) return '自然层次';
    return '直顺';
  }
  function existing(target, key) {
    if (key === 'bodyFrame') return target.bodyFrame || bodyFrame(target.bodyType);
    if (key === 'hairStyleTendency') return target.hairStyleTendency || hairTendency(target.hairstyle);
    return target[key];
  }
  function expression(loci, maxHeight, code) {
    const rng = seeded(code);
    const expressed = {};
    keys().forEach((key) => {
      const definition = catalog().loci[key];
      const [left, right] = loci[key];
      if (left.value === right.value) expressed[key] = left.value;
      else if (left.dominance !== right.dominance) {
        const stronger = left.dominance > right.dominance ? left : right;
        const weaker = stronger === left ? right : left;
        expressed[key] = rng() < 0.78 ? stronger.value : weaker.value;
      } else if (definition.mode === 'blend' && definition.blends?.length) {
        expressed[key] = definition.blends[Math.floor(rng() * definition.blends.length)];
      } else expressed[key] = rng() < 0.5 ? left.value : right.value;
    });
    expressed.maxHeight = Math.round(((maxHeight[0] + maxHeight[1]) / 2) * 10) / 10;
    return expressed;
  }
  function codeFor(loci, maxHeight) {
    const raw = keys().map((key) => loci[key].map((item) => item.value).join('/')).join('|');
    return `DNA-${hash(`${raw}|${maxHeight.join('/')}`).toString(36).toUpperCase()}`;
  }
  function apply(target, expressed, preserve) {
    const fields = ['hairColor', 'hairStyleTendency', 'eyeColor', 'faceShape', 'featureProportions',
      'bodyFrame', 'temperament', 'developmentTendency', 'molePosition', 'freckles', 'distinctiveFeature', 'maxHeight'];
    fields.forEach((field) => {
      if (!preserve || target[field] === undefined || target[field] === null || target[field] === '') {
        target[field] = expressed[field];
      }
    });
  }
  function founder(target, gender, seed, preserve) {
    const rng = seeded(seed || `${target.name}-${target.id}`);
    const loci = {};
    keys().forEach((key) => {
      const definition = catalog().loci[key];
      const current = existing(target, key);
      const matched = definition.values.find((item) => item.value === current);
      loci[key] = [allele(matched || weighted(definition, rng)), allele(weighted(definition, rng))];
    });
    if (gender === '女' && rng() < 0.32) {
      const petite = catalog().loci.bodyFrame.values.find((item) => item.value === '娇小骨架');
      loci.bodyFrame = [allele(petite), allele(petite)];
    }
    const base = gender === '男' ? 175 : 164;
    const currentHeight = Number(target.maxHeight) || base + (Number(target.growthSeed) || 0);
    const maxHeight = [currentHeight + Math.round((rng() - 0.5) * 5), currentHeight + Math.round((rng() - 0.5) * 5)];
    const code = codeFor(loci, maxHeight);
    const genetics = { version: 1, code, loci, maxHeight, mutations: [], expressed: expression(loci, maxHeight, code) };
    if (preserve) {
      keys().forEach((key) => {
        const current = existing(target, key);
        if (catalog().loci[key].values.some((item) => item.value === current)) genetics.expressed[key] = current;
      });
      genetics.expressed.maxHeight = currentHeight;
    }
    target.genetics = genetics;
    apply(target, genetics.expressed, preserve);
    Game.congenitalTraits?.founder(target, gender, `${seed}-congenital`);
    return genetics;
  }

  function mutate(input, definition, rng, mutations, key) {
    const original = { ...input };
    if (rng() >= catalog().mutationRate) return original;
    const choices = definition.values.filter((item) => item.value !== original.value);
    const changed = allele(choices[Math.floor(rng() * choices.length)] || definition.values[0]);
    mutations.push({ trait: key, from: original.value, to: changed.value });
    return changed;
  }

  function inheritInto(target, gender, leftParent, rightParent, seed) {
    const rng = seeded(seed || `${target.id}-${Date.now()}-${Math.random()}`);
    ensure(leftParent, leftParent.gender || gender, `${seed}-left`, true);
    ensure(rightParent, rightParent.gender || gender, `${seed}-right`, true);
    const loci = {};
    const mutations = [];
    keys().forEach((key) => {
      const definition = catalog().loci[key];
      loci[key] = [
        mutate(pick(leftParent.genetics.loci[key], rng), definition, rng, mutations, key),
        mutate(pick(rightParent.genetics.loci[key], rng), definition, rng, mutations, key),
      ];
    });
    const inheritedHeight = [
      Number(pick(leftParent.genetics.maxHeight, rng)),
      Number(pick(rightParent.genetics.maxHeight, rng)),
    ];
    const sexOffset = gender === '男' ? 6.5 : -6.5;
    const maxHeight = inheritedHeight.map((value) => value + sexOffset);
    if (rng() < 0.04) {
      const index = rng() < 0.5 ? 0 : 1;
      const before = maxHeight[index];
      maxHeight[index] += Math.round((rng() - 0.5) * 8);
      mutations.push({ trait: 'maxHeight', from: before, to: maxHeight[index] });
    }
    const code = codeFor(loci, maxHeight);
    target.genetics = { version: 1, code, loci, maxHeight, mutations, expressed: expression(loci, maxHeight, code) };
    apply(target, target.genetics.expressed, false);
    cosmeticInheritance(target, leftParent);
    cosmeticInheritance(target, rightParent);
    Game.congenitalTraits?.inheritInto(target, gender, leftParent, rightParent, `${seed}-congenital`);
    return target;
  }

  function ensure(target, gender, seed, preserve) {
    const valid = target.genetics?.loci && keys().every((key) => (
      Array.isArray(target.genetics.loci[key])
      && target.genetics.loci[key].length === 2
      && target.genetics.loci[key].every((item) => (
        typeof item?.value === 'string' && Number.isFinite(item?.dominance)
      ))
    )) && Array.isArray(target.genetics.maxHeight)
      && target.genetics.maxHeight.length === 2
      && target.genetics.maxHeight.every(Number.isFinite);
    if (!valid) return founder(target, gender, seed, preserve);
    target.genetics.code ||= codeFor(target.genetics.loci, target.genetics.maxHeight);
    target.genetics.mutations ||= [];
    target.genetics.expressed = {
      ...expression(target.genetics.loci, target.genetics.maxHeight, target.genetics.code),
      ...(target.genetics.expressed || {}),
    };
    apply(target, target.genetics.expressed, preserve);
    Game.congenitalTraits?.ensure(target, gender, `${seed}-congenital`);
    return target.genetics;
  }

  function cosmeticInheritance(child, mother) {
    if (!mother || mother.gender !== '女') return;
    const procedures = mother.cosmeticProcedures || [];
    if (!procedures.length) return;
    const U = Game.content;
    child.genetics ||= {};
    child.genetics.loci ||= {};
    procedures.forEach((proc) => {
      if (proc.type === 'breast' || proc.type === 'breastreduction') {
        child.genetics.loci.BRST = (child.genetics.loci.BRST || 50) + U.between(-3, 3);
      } else if (proc.type === 'liposuction') {
        child.genetics.loci.BFRM = (child.genetics.loci.BFRM || 50) + U.between(-2, 4);
      } else if (proc.type === 'facial') {
        child.genetics.loci.FACE = (child.genetics.loci.FACE || 50) + U.between(-5, 5);
      }
    });
  }

  Game.genetics = Object.freeze({ founder, ensure, inheritInto, cosmeticInheritance });
}(window));
