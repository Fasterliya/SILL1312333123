(function initNpcFashion(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const series = ['东方Project', '原神', '蔚蓝档案', '星穹铁道', '鸣潮'];

  function hash(value) {
    let result = 2166136261;
    String(value || '').split('').forEach((char) => {
      result ^= char.charCodeAt(0);
      result = Math.imul(result, 16777619);
    });
    return result >>> 0;
  }

  function ensurePerson(state, person) {
    const source = `${person.id}:${person.personality}:${person.trait}`;
    const favored = ['外向', '热血', '浪漫', '好奇', '乐观', '随和'];
    const base = favored.includes(person.personality) || favored.includes(person.trait) ? 48 : 20;
    person.fashion = person.fashion && typeof person.fashion === 'object' ? person.fashion : {};
    person.fashion.cosplayInterest = Math.max(0, Math.min(100,
      Number(person.fashion.cosplayInterest) || base + (hash(source) % 38)));
    person.fashion.favoriteSeries ||= series[hash(`${source}:series`) % series.length];
    person.fashion.temporaryCosplay ||= null;
    person.fashion.temporaryCosplayUntil = Number.isFinite(person.fashion.temporaryCosplayUntil)
      ? person.fashion.temporaryCosplayUntil : null;
    person.fashion.lastStyleChangeMonth = Number.isFinite(person.fashion.lastStyleChangeMonth)
      ? person.fashion.lastStyleChangeMonth : state.totalMonths;
    person.fashion.nextStyleChangeMonth = Number.isFinite(person.fashion.nextStyleChangeMonth)
      ? person.fashion.nextStyleChangeMonth : state.totalMonths + 24 + (hash(`${source}:style`) % 37);
    person.fashion.history = Array.isArray(person.fashion.history)
      ? person.fashion.history.slice(-6) : [];
    return person.fashion;
  }

  function cosplayChoice(person, age) {
    const items = Game.cosplayCatalog.items.filter((item) => (
      item.name !== '无' && item.series === person.fashion.favoriteSeries
      && age >= item.minAge && age <= item.maxAge
    ));
    return items.length ? U.random(items) : null;
  }

  function wearTemporary(state, person, convention) {
    const age = U.personAge(state, person);
    if (person.gender !== '女' || age < 18 || person.status !== '健康') return false;
    ensurePerson(state, person);
    if (person.cosplay !== '无' || person.fashion.temporaryCosplay) return false;
    const chance = convention
      ? person.fashion.cosplayInterest / 145
      : person.fashion.cosplayInterest / 15000;
    if (Math.random() >= chance) return false;
    const choice = cosplayChoice(person, age);
    if (!choice) return false;
    person.cosplay = choice.name;
    person.fashion.temporaryCosplay = choice.name;
    person.fashion.temporaryCosplayUntil = state.totalMonths + U.between(1, convention ? 2 : 3);
    return true;
  }

  function removeTemporary(state, person) {
    const fashion = ensurePerson(state, person);
    if (!fashion.temporaryCosplay || state.totalMonths < fashion.temporaryCosplayUntil) return;
    if (person.cosplay === fashion.temporaryCosplay) person.cosplay = '无';
    fashion.temporaryCosplay = null;
    fashion.temporaryCosplayUntil = null;
  }

  function preferredTags(person) {
    if (person.japaneseFashion) return ['和风', '校园'];
    if (['理性', '自律', '务实'].includes(person.personality)) return ['正式', '休闲'];
    if (['浪漫', '敏感', '文雅'].includes(person.personality)) return ['文艺', '和风'];
    if (['外向', '热血', '乐观'].includes(person.personality)) return ['运动', '休闲'];
    return ['休闲', '校园'];
  }

  function pickCatalog(entries, age, tags) {
    const suitable = entries.filter((item) => (
      age >= item.minAge && age <= item.maxAge && item.tags.some((tag) => tags.includes(tag))
    ));
    const fallback = entries.filter((item) => age >= item.minAge && age <= item.maxAge);
    return U.random(suitable.length ? suitable : fallback)?.name;
  }

  function changeAdultStyle(state, person) {
    const age = U.personAge(state, person);
    const fashion = ensurePerson(state, person);
    if (person.gender !== '女' || age < 18 || state.totalMonths < fashion.nextStyleChangeMonth) return;
    const tags = preferredTags(person);
    person.clothing.top = pickCatalog(Game.appearanceCatalog.top, age, tags) || person.clothing.top;
    person.clothing.socks = pickCatalog(Game.appearanceCatalog.socks, age, tags) || person.clothing.socks;
    person.clothing.shoes = pickCatalog(Game.appearanceCatalog.shoes, age, tags) || person.clothing.shoes;
    fashion.lastStyleChangeMonth = state.totalMonths;
    fashion.nextStyleChangeMonth = state.totalMonths + U.between(24, 60);
    fashion.history.push({
      month: state.totalMonths,
      top: person.clothing.top,
      socks: person.clothing.socks,
      shoes: person.clothing.shoes,
    });
    fashion.history = fashion.history.slice(-6);
  }

  function prepareConvention(state, residents) {
    let dressed = 0;
    residents.slice().sort(() => Math.random() - 0.5).forEach((person) => {
      if (dressed >= 8) return;
      ensurePerson(state, person);
      if (wearTemporary(state, person, true)) dressed += 1;
    });
  }

  function monthly(state) {
    Game.people.all(state).forEach((person) => {
      if (person.status !== '健康') return;
      ensurePerson(state, person);
      removeTemporary(state, person);
      changeAdultStyle(state, person);
      wearTemporary(state, person, false);
    });
  }

  Game.npcFashion = Object.freeze({
    ensurePerson, prepareConvention, monthly,
  });
}(window));
