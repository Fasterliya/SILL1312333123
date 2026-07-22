(function initDemography(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function hash(value) {
    let result = 2166136261;
    String(value || '').split('').forEach((char) => {
      result ^= char.charCodeAt(0);
      result = Math.imul(result, 16777619);
    });
    return result >>> 0;
  }
  function ensureWoman(person) {
    if (!person || person.gender !== '女') return person;
    const seed = hash(person.id || person.name);
    if (!Number.isFinite(person.fertilityBase)) person.fertilityBase = 18 + (seed % 11);
    if (!Number.isFinite(person.marriageStandard)) person.marriageStandard = 58 + ((seed >>> 5) % 17);
    if (!Number.isFinite(person.preferredAgeGap)) person.preferredAgeGap = 2 + ((seed >>> 10) % 7);
    return person;
  }
  function baseFertility(id) {
    return 18 + (hash(id) % 11);
  }
  function ensureState(state) {
    if (state.gender === '女') {
      ensureWoman(Object.assign(state.profile, {
        id: state.profile.id || 'player-profile', gender: '女', name: state.name,
      }));
      if (!Number.isFinite(state.profile.birthsGiven)) state.profile.birthsGiven = playerChildren(state);
    }
    Game.people.all(state).forEach((person) => {
      ensureWoman(person);
      if (person.gender === '女' && !Number.isFinite(person.birthsGiven)) {
        person.birthsGiven = Math.max(0, Number(person.childrenCount) || 0);
      }
    });
    state.romance ||= { partnerId: null, married: false, pendingBirth: 0 };
    state.romance.pendingBabies = [1, 2].includes(state.romance.pendingBabies)
      ? state.romance.pendingBabies : 1;
    state.romance.pendingBirthMotherId ||= null;
    state.romance.conceptionCooldown = Math.max(0, Number(state.romance.conceptionCooldown) || 0);
  }
  function playerChildren(state) {
    return state.family.filter((person) => ['儿子', '女儿'].includes(person.relation)).length;
  }
  function womanAge(state, woman) {
    if (woman?.specterPossessed && woman.gender === '女'
      && Number.isFinite(woman.specterPossessedAtAge)) {
      const elapsed = Math.max(0, state.totalMonths
        - (Number(woman.specterPossessedAtMonth) || state.totalMonths));
      return woman.specterPossessedAtAge + Math.floor(elapsed / 12);
    }
    return woman === state.profile ? Game.content.age(state) : Game.content.personAge(state, woman);
  }
  function childCount(state, woman) {
    if (Number.isFinite(woman.birthsGiven)) return Math.max(0, woman.birthsGiven);
    return woman === state.profile ? playerChildren(state) : Math.max(0, Number(woman.childrenCount) || 0);
  }
  function fertility(state, woman) {
    ensureWoman(woman);
    if (!woman || woman.gender !== '女') return 0;
    if (womanAge(state, woman) < 18) return 0;
    return clamp(Math.round(woman.fertilityBase - childCount(state, woman) * 4), 0, 100);
  }
  function fertilityAt(base, age, children) {
    if (age < 18) return 0;
    return clamp(Math.round((Number.isFinite(base) ? base : 23)
      - Math.max(0, Number(children) || 0) * 4), 0, 100);
  }
  function coupleWomen(state, partner) {
    const women = [];
    if (state.gender === '女') women.push(state.profile);
    if (partner?.gender === '女') women.push(partner);
    return women.sort((a, b) => fertility(state, b) - fertility(state, a));
  }
  function fertilityContext(state, partner) {
    const woman = coupleWomen(state, partner)[0] || null;
    return { woman, value: woman ? fertility(state, woman) : 0 };
  }
  function conceptionStats(state, partner) {
    const context = fertilityContext(state, partner);
    const monthly = context.value / 1000;
    return { ...context, monthly, monthlyPercent: Number((monthly * 100).toFixed(1)),
      annualPercent: Number(((1 - ((1 - monthly) ** 12)) * 100).toFixed(1)) };
  }
  function proposalScore(state, woman, partner) {
    ensureWoman(woman);
    const womanAgeValue = woman === state.profile ? Game.content.age(state) : Game.content.personAge(state, woman);
    const partnerAge = partner?.player ? Game.content.age(state) : Game.content.personAge(state, partner);
    const affection = woman === state.profile ? 100 : Number(woman.affection) || 50;
    const ageGap = Math.abs(womanAgeValue - partnerAge);
    const stable = partner?.player ? Boolean(state.career.job || state.education.university)
      : Boolean(partner?.job || partner?.educationName);
    const womanCulture = woman.culture || state.civic?.identityCulture || state.location.country;
    const partnerCulture = partner?.culture || state.civic?.identityCulture || state.location.country;
    const culture = womanCulture === partnerCulture ? 7 : ((hash(woman.id) >>> 15) % 2 ? 1 : -5);
    const score = Math.round(affection * 0.62 + (stable ? 10 : 3)
      + culture + Math.max(-18, 10 - Math.max(0, ageGap - woman.preferredAgeGap) * 3));
    return { score: clamp(score, 0, 100), threshold: woman.marriageStandard, ageGap };
  }
  function proposalDecision(state, person) {
    const player = { player: true, gender: state.gender, culture: state.civic?.identityCulture || state.location.country };
    if (person.gender !== '女') {
      const chance = clamp(0.58 + (person.affection - 80) / 45, 0.58, 0.96);
      return { accepted: Math.random() < chance, chance: Math.round(chance * 100), score: person.affection };
    }
    const result = proposalScore(state, person, player);
    const chance = clamp(0.18 + (result.score - result.threshold) / 55, 0.08, 0.92);
    return { ...result, accepted: result.score >= result.threshold && Math.random() < chance,
      chance: Math.round(chance * 100) };
  }
  function residentPairScore(state, woman, man) {
    const womanAgeValue = Math.max(0, Math.floor((state.totalMonths - woman.b) / 12));
    const manAge = Math.max(0, Math.floor((state.totalMonths - man.b) / 12));
    const standard = 58 + ((hash(woman.i) >>> 5) % 17);
    const preferredGap = 2 + ((hash(woman.i) >>> 10) % 7);
    const culture = woman.c === man.c ? 9 : (((hash(woman.i) >>> 15) % 2) ? 1 : -6);
    const score = 50 + (man.j ? 12 : 2) + culture
      + Math.max(-20, 12 - Math.max(0, Math.abs(womanAgeValue - manAge) - preferredGap) * 3);
    return { score, standard };
  }
  function npcMarriageChance(state, person, age) {
    const base = Math.min(0.24, 0.045 + Math.max(0, age - 23) * 0.009);
    if (person.gender !== '女') return base * 0.75;
    ensureWoman(person);
    const readiness = clamp((age - 20) / 12, 0.25, 1);
    return base * readiness * clamp((82 - person.marriageStandard) / 20, 0.45, 1.15);
  }
  function twinCount(state, woman) {
    const age = womanAge(state, woman);
    const chance = clamp(0.025 + Math.max(0, age - 30) * 0.003 + childCount(state, woman) * 0.006, 0.02, 0.08);
    return Math.random() < chance ? 2 : 1;
  }
  function twinCountAt(age, children) {
    const chance = clamp(0.025 + Math.max(0, age - 30) * 0.003
      + Math.max(0, children) * 0.006, 0.02, 0.08);
    return Math.random() < chance ? 2 : 1;
  }
  function rollMonthlyConception(state) {
    if (!state.romance.married || state.romance.pendingBirth > 0) return null;
    if (state.romance.conceptionCooldown > 0) {
      state.romance.conceptionCooldown -= 1;
      return null;
    }
    const partner = Game.people.find(state, state.romance.partnerId);
    if (!partner || partner.status !== '健康') return null;
    const stats = conceptionStats(state, partner);
    if (!stats.woman || stats.monthly <= 0 || Math.random() >= stats.monthly) return null;
    const babies = twinCount(state, stats.woman);
    state.romance.pendingBirth = 9;
    state.romance.pendingBabies = babies;
    state.romance.pendingBirthMotherId = stats.woman === state.profile ? state.profile.id : stats.woman.id;
    return { babies, fertility: stats.value, monthlyPercent: stats.monthlyPercent };
  }

  function deliver(state) {
    const U = Game.content;
    const babies = state.romance.pendingBabies === 2 ? 2 : 1;
    const partner = Game.people.find(state, state.romance.partnerId);
    const mother = state.romance.pendingBirthMotherId === state.profile.id ? state.profile
      : Game.people.find(state, state.romance.pendingBirthMotherId);
    const previousBirths = mother ? childCount(state, mother) : 0;
    const children = [];
    const identity = Game.familyNaming.forPlayer(state, partner);
    for (let index = 0; index < babies; index += 1) {
      const relation = U.random(['儿子', '女儿']);
      const child = U.person(relation, identity.surname, 0, relation === '儿子' ? '男' : '女', state.totalMonths);
      Game.familyNaming.assign(state, child, identity);
      Object.assign(child, {
        bornAt: state.totalMonths, birthMonth: state.totalMonths, affection: 80,
        metCity: state.location.city, currentCity: state.location.city, homeCity: state.location.city,
        temperament: '懵懂', bodyType: '幼小', hairstyle: '胎毛短发',
        clothing: { top: '婴儿连体衣', socks: '婴儿袜', shoes: '婴儿软底鞋' },
        parentIds: [state.profile.id, partner?.id].filter(Boolean),
      });
      if (partner) Game.genetics.inheritInto(child, child.gender, state.profile, partner, `child-${child.id}`);
      Game.geneticsGrowth.applyAppearance(child, child.gender, 0);
      Game.npcLife.syncGrowth(state, child);
      state.family.push(child);
      children.push(child);
    }
    if (partner) {
      partner.childrenCount = Math.max(0, Number(partner.childrenCount) || 0) + babies;
      partner.childIds = [...new Set([...(partner.childIds || []), ...children.map((child) => child.id)])].slice(0, 3);
    }
    if (mother) mother.birthsGiven = previousBirths + babies;
    state.romance.pendingBabies = 1;
    state.romance.pendingBirthMotherId = null;
    state.romance.conceptionCooldown = 3;
    const names = children.map((child) => child.name).join('、');
    Game.lifeDirector.addLog(state, babies === 2 ? '双胞胎降临' : '新生命降临',
      `${names}出生了，你成为了${state.gender === '男' ? '父亲' : '母亲'}。`, 'milestone');
  }
  Game.demography = Object.freeze({
    ensureWoman, ensureState, baseFertility, fertility, fertilityAt, fertilityContext, conceptionStats,
    proposalDecision, proposalScore, residentPairScore, npcMarriageChance,
    twinCount, twinCountAt, rollMonthlyConception, deliver,
  });
}(window));
