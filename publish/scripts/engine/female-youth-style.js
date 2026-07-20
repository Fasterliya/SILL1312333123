(function initFemaleYouthStyle(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const hairstyles = [
    '双马尾', '层次长发', '层次碎发', '自然卷发', '钻头卷发', '姬发式',
    '齐肩长发', '腰长发', '高马尾', '单马尾', '自然层次发',
  ];
  const stages = [
    {
      id: 'girl-6-7',
      minAge: 6,
      maxAge: 8,
      tops: ['幼稚园制服'],
      socks: ['白色连裤袜'],
      shoes: ['玛丽珍鞋'],
    },
    {
      id: 'girl-8-11',
      minAge: 8,
      maxAge: 12,
      tops: ['水手服迷你裙'],
      socks: ['白色连裤袜'],
      shoes: ['玛丽珍鞋'],
    },
    {
      id: 'girl-12-14',
      minAge: 12,
      maxAge: 15,
      tops: ['水手服过膝裙'],
      socks: ['白色连裤袜'],
      shoes: ['乐福鞋'],
    },
    {
      id: 'girl-15-17',
      minAge: 15,
      maxAge: 18,
      tops: ['JK制服格子裙', '针织开衫制服格子裙'],
      socks: ['黑色过膝袜', '白色过膝袜'],
      shoes: ['乐福鞋'],
    },
  ];

  const random = (items) => items[Math.floor(Math.random() * items.length)];
  const forAge = (age) => stages.find((stage) => age >= stage.minAge && age < stage.maxAge) || null;

  function clear(target) {
    delete target.femaleYouthStyleStage;
    delete target.femaleYouthStyleChoice;
  }

  function apply(target, gender, age) {
    if (!target || gender !== '女') return false;
    const stage = forAge(Number(age));
    if (!stage) {
      clear(target);
      return false;
    }
    if (target.femaleYouthStyleStage !== stage.id || !target.femaleYouthStyleChoice) {
      target.femaleYouthStyleStage = stage.id;
      target.femaleYouthStyleChoice = {
        top: random(stage.tops),
        socks: random(stage.socks),
        shoes: random(stage.shoes),
        hairstyle: random(hairstyles),
      };
    }
    const choice = target.femaleYouthStyleChoice;
    target.clothing = target.clothing || {};
    target.clothing.top = choice.top;
    target.clothing.socks = choice.socks;
    target.clothing.shoes = choice.shoes;
    target.hairstyle = choice.hairstyle;
    return true;
  }

  Game.femaleYouthStyle = Object.freeze({ apply, forAge });
}(window));
