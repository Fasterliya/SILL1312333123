(function initNpcCulturalStyle(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const preference = '崇洋媚外';
  const kimonoNames = new Set([
    '白绯巫女服', '夏日花火浴衣', '樱纹小纹和服', '成人式振袖',
    '毕业袴套装', '和风羽织外套', '町娘和服',
  ]);

  function hash(value) {
    return [...String(value || '')].reduce((sum, char) => (
      Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
    ), 2166136261);
  }

  function japaneseStyle(person, age) {
    const tops = Game.appearanceCatalog.top.filter((item) => (
      kimonoNames.has(item.name) && age >= item.minAge && age <= item.maxAge
    ));
    const hairs = Game.appearanceCatalog.hairstyle.filter((item) => item.tags.includes('和风'));
    const socks = Game.appearanceCatalog.socks.filter((item) => item.tags.includes('和风'));
    const shoes = Game.appearanceCatalog.shoes.filter((item) => item.tags.includes('和风'));
    if (tops.length) person.clothing.top = Game.content.random(tops).name;
    if (hairs.length) person.hairstyle = Game.content.random(hairs).name;
    if (socks.length) person.clothing.socks = Game.content.random(socks).name;
    if (shoes.length) person.clothing.shoes = Game.content.random(shoes).name;
  }

  function rename(state, person) {
    if (person.nameCulture === '日本') return;
    const previous = person.name;
    person.birthName ||= previous;
    person.nameHistory = Array.isArray(person.nameHistory) ? person.nameHistory : [];
    Game.content.setUniqueName(state, person, 'ja-JP');
    person.nameCulture = '日本';
    person.surname = Game.familyNaming.surnameOf(person, '', '日本');
    person.nameHistory.push({
      from: previous, to: person.name, country: '日本',
      month: state.totalMonths, reason: '主动采用日本姓名',
    });
    person.nameHistory = person.nameHistory.slice(-8);
    const spouse = Game.people.find(state, person.spouseId);
    if (spouse) spouse.spouseName = person.name;
  }

  function update(state, person, age) {
    const culture = person.culture || state.hometown?.country || '华夏';
    if (person.gender !== '女' || culture !== '华夏' || age < 18) return;
    if (person.namePreference !== preference && hash(person.id || person.name) % 100 >= 8) return;
    person.namePreference = preference;
    person.culturePreference = '日本文化';
    rename(state, person);
    const cycle = Math.floor(state.totalMonths / 36);
    if (person.culturalStyleCycle === cycle) return;
    person.culturalStyleCycle = cycle;
    japaneseStyle(person, age);
  }

  Game.npcCulturalStyle = Object.freeze({ update });
}(window));
