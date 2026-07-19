(function initSpecialCharacters(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const entries = [
    ['沈佳丽', '丰满', 168, '富裕经商家庭', 1280000, '上海', 6],
    ['张玲玲', '娇小纤细', 158, '城市小康家庭', 480000, '杭州', 2],
    ['宋思睿', '匀称', 166, '知识分子家庭', 720000, '北京', 4],
    ['李娜', '匀称', 172, '普通工薪家庭', 320000, '深圳', 8],
    ['孙怡然', '娇小纤细', 163, '城市小康家庭', 560000, '成都', 3],
    ['陆以煊', '匀称', 169, '富裕经商家庭', 1480000, '南京', 5],
    ['姚俊柔', '丰满', 167, '优渥专业家庭', 920000, '武汉', 7],
    ['盛乔', '匀称', 171, '富裕企业家庭', 1680000, '杭州', 9],
    ['叶雨婷', '娇小纤细', 162, '普通工薪家庭', 280000, '西安', 2],
    ['张晓雨', '小胸', 160, '普通工薪家庭', 260000, '长沙', 6],
    ['周欣怡', '丰满', 165, '城市小康家庭', 620000, '青岛', 4],
    ['施欣彤', '匀称', 168, '富裕经商家庭', 1180000, '厦门', 8],
    ['朱佳妮', '丰满', 164, '优渥专业家庭', 880000, '昆明', 5],
    ['曹纯辉', '匀称', 170, '普通工薪家庭', 350000, '沈阳', 7],
    ['郑芸', '小胸', 159, '普通家庭', 210000, '郑州', 3],
    ['夏朱安琪', '娇小纤细', 166, '优渥家庭', 1080000, '哈尔滨', 10],
    ['徐安琪', '匀称', 167, '城市小康家庭', 580000, '北京', 6],
    ['潘雨轩', '丰满', 169, '富裕经商家庭', 1380000, '深圳', 9],
  ].map(([fullName, adultBodyType, adultHeight, familyBackground, familyWealth, homeCity, startAge]) => Object.freeze({
    fullName,
    gender: '女',
    adultBodyType,
    adultHeight,
    familyBackground,
    familyWealth,
    homeCity,
    startAge,
    ...(fullName === '张玲玲' ? {
      personality: '浪漫',
      trait: '好奇',
      namePreference: '媚日二次元',
      culturePreference: '媚日二次元',
      japaneseFashion: true,
      japaneseSurnameOnly: true,
      japaneseRenameChance: 55,
      favoriteSeries: '东方Project',
    } : {}),
  }));
  const byName = new Map(entries.map((entry) => [entry.fullName, entry]));

  function names() {
    return entries.map((entry) => entry.fullName);
  }

  function find(fullName) {
    return byName.get(String(fullName || '')) || null;
  }

  function apply(person) {
    const entry = find(person?.fullName || person?.name);
    if (!entry || !person) return false;
    const matchedName = person.fullName || person.name;
    if (!person.name || person.name === matchedName) person.name = entry.fullName;
    person.fullName = entry.fullName;
    person.birthName ||= entry.fullName;
    person.gender = entry.gender;
    person.specialCharacter = true;
    person.specialHomeCity = entry.homeCity;
    person.adultBodyType = entry.adultBodyType;
    person.adultHeight = entry.adultHeight;
    person.maxHeight = entry.adultHeight;
    person.familyBackground = entry.familyBackground;
    person.familyWealth = entry.familyWealth;
    person.bodyType = entry.adultBodyType;
    if (entry.personality) person.personality = entry.personality;
    if (entry.trait) person.trait = entry.trait;
    if (entry.namePreference) person.namePreference = entry.namePreference;
    if (entry.culturePreference) person.culturePreference = entry.culturePreference;
    if (entry.japaneseFashion) {
      person.japaneseFashion = true;
      person.japaneseSurnameOnly = true;
      person.japaneseRenameChance = entry.japaneseRenameChance;
      person.fashion = person.fashion && typeof person.fashion === 'object' ? person.fashion : {};
      person.fashion.cosplayInterest = Math.max(92, Number(person.fashion.cosplayInterest) || 0);
      person.fashion.favoriteSeries = entry.favoriteSeries;
    }
    if (Game.genetics?.founder) {
      Game.genetics.founder(person, entry.gender, `special-${entry.fullName}`, true);
    }
    return true;
  }

  function assignAvailable() {
    return false;
  }

  Game.specialCharacters = Object.freeze({
    entries: Object.freeze(entries),
    names,
    find,
    apply,
    assignAvailable,
  });
}(window));
