(function initSpecialCharacters(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const entries = [
    ['沈佳丽', '丰满', 168, '富裕经商家庭', 1280000],
    ['张玲玲', '娇小纤细', 158, '城市小康家庭', 480000],
    ['宋思睿', '匀称', 166, '知识分子家庭', 720000],
    ['李娜', '匀称', 172, '普通工薪家庭', 320000],
    ['孙怡然', '娇小纤细', 163, '城市小康家庭', 560000],
    ['陆以煊', '匀称', 169, '富裕经商家庭', 1480000],
    ['姚俊柔', '丰满', 167, '优渥专业家庭', 920000],
    ['盛乔', '匀称', 171, '富裕企业家庭', 1680000],
    ['叶雨婷', '娇小纤细', 162, '普通工薪家庭', 280000],
    ['张晓雨', '小胸', 160, '普通工薪家庭', 260000],
    ['周欣怡', '丰满', 165, '城市小康家庭', 620000],
    ['施欣彤', '匀称', 168, '富裕经商家庭', 1180000],
    ['朱佳妮', '丰满', 164, '优渥专业家庭', 880000],
    ['曹纯辉', '匀称', 170, '普通工薪家庭', 350000],
    ['郑芸', '小胸', 159, '普通家庭', 210000],
    ['夏朱安琪', '娇小纤细', 166, '优渥家庭', 1080000],
    ['徐安琪', '匀称', 167, '城市小康家庭', 580000],
    ['潘雨轩', '丰满', 169, '富裕经商家庭', 1380000],
  ].map(([fullName, adultBodyType, adultHeight, familyBackground, familyWealth]) => Object.freeze({
    fullName,
    gender: '女',
    adultBodyType,
    adultHeight,
    familyBackground,
    familyWealth,
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
    person.name = entry.fullName;
    person.fullName = entry.fullName;
    person.gender = entry.gender;
    person.specialCharacter = true;
    person.adultBodyType = entry.adultBodyType;
    person.adultHeight = entry.adultHeight;
    person.maxHeight = entry.adultHeight;
    person.familyBackground = entry.familyBackground;
    person.familyWealth = entry.familyWealth;
    person.bodyType = entry.adultBodyType;
    if (Game.genetics?.founder) {
      Game.genetics.founder(person, entry.gender, `special-${entry.fullName}`, true);
    }
    return true;
  }

  function assignAvailable(state, person, culture) {
    if (!person || person.gender !== '女' || !['zh-CN', '华夏', '', undefined].includes(culture)) {
      return false;
    }
    if (find(person.name)) return apply(person);
    const people = Game.people ? Game.people.all(state) : [...state.family, ...state.contacts];
    const used = new Set([state.name, ...people.map((item) => item?.name)].filter(Boolean));
    const entry = entries.find((item) => !used.has(item.fullName));
    if (!entry) return false;
    person.name = entry.fullName;
    return apply(person);
  }

  Game.specialCharacters = Object.freeze({
    entries: Object.freeze(entries),
    names,
    find,
    apply,
    assignAvailable,
  });
}(window));
