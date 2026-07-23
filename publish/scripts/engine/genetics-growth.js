(function initGeneticsGrowth(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function bodyType(gender, age, frame, development) {
    if (age < 7) return '幼小';
    const mature = age >= (development === '早发育' ? 11 : (development === '晚发育' ? 14 : 12));
    if (!mature) return gender === '女' ? '娇小纤细' : '匀称';
    if (frame.includes('娇小')) return '娇小纤细';
    if (frame.includes('纤细')) return gender === '女' ? '小胸' : '清瘦';
    if (frame.includes('结实')) return gender === '女' ? '匀称' : '健壮';
    if (frame.includes('丰润')) return gender === '女' ? '丰满' : '匀称';
    return '匀称';
  }

  function hairstyle(gender, age, tendency) {
    if (age < 3) return '胎毛短发';
    if (age < 7) return '儿童短发';
    const female = {
      直顺: '齐肩直发', 自然层次: '自然层次发', 轻微卷曲: '柔顺空气刘海长发',
      明显卷曲: '蓬松羊毛卷', 浓密蓬松: '高马尾', 柔顺自然: '齐肩直发',
      蓬松层次: '层次碎发',
    };
    const male = {
      直顺: '清爽侧分短发', 自然层次: '自然层次发', 轻微卷曲: '蓬松层次短发',
      明显卷曲: '自然卷发', 浓密蓬松: '层次碎发', 柔顺自然: '清爽短发',
      蓬松层次: '日式短碎发',
    };
    return (gender === '女' ? female : male)[tendency] || (gender === '女' ? '齐肩直发' : '清爽短发');
  }

  function applyAppearance(target, gender, age, state) {
    Game.genetics.ensure(target, gender, `${target.id || target.name}-appearance`, true);
    var genes = target.genetics.expressed;
    target.eyeColor = genes.eyeColor;
    target.faceShape = target.cosmeticFaceShape || genes.faceShape;
    target.featureProportions = target.cosmeticFeatureProportions || genes.featureProportions;
    target.hairStyleTendency = genes.hairStyleTendency;
    target.bodyFrame = genes.bodyFrame;
    target.developmentTendency = genes.developmentTendency;
    target.molePosition = genes.molePosition;
    target.freckles = genes.freckles;
    target.distinctiveFeature = target.cosmeticDistinctiveFeature || genes.distinctiveFeature;
    target.maxHeight = Number(target.adultHeight) || genes.maxHeight;
    if (genes.bodyFrame && genes.bodyFrame.indexOf('娇小') >= 0) {
      target.maxHeight = Math.min(target.maxHeight, 155);
    }
    target.temperament = age < 3 ? '懵懂' : (age < 7 ? '童真' : genes.temperament);
    target.bodyType = target.adultBodyType && age >= 18
      ? target.adultBodyType : bodyType(gender, age, genes.bodyFrame, genes.developmentTendency);
    target.hairstyle = hairstyle(gender, age, genes.hairStyleTendency);
    target.hairColor = age >= 72 ? '银灰' : (age >= 60 ? '黑灰' : genes.hairColor);
    if (state) Game.portraitStageRules?.apply(target, state);
  }

  function progress(age, development) {
    var ranges = {
      早发育: [10.5, 16.5], 晚发育: [13, 19.5], 渐进发育: [11, 19.5], 均衡发育: [12, 18],
    };
    var pair = ranges[development] || ranges.均衡发育;
    return Math.max(0, Math.min(1, (age - pair[0]) / (pair[1] - pair[0])));
  }

  function updateGrowth(target, gender, age, syncAppearance) {
    if (syncAppearance !== false) applyAppearance(target, gender, age);
    else {
      Game.genetics.ensure(target, gender, `${target.id || target.name}-growth`, true);
      target.maxHeight = Number(target.adultHeight) || target.genetics.expressed.maxHeight;
      var genes = target.genetics.expressed;
      if (genes && genes.bodyFrame && genes.bodyFrame.indexOf('娇小') >= 0) {
        target.maxHeight = Math.min(target.maxHeight, 155);
      }
    }
    var height;
    if (age < 1) height = 50 + age * 25;
    else if (age < 3) height = 75 + (age - 1) * 10;
    else if (age < 6) height = 95 + (age - 3) * 7;
    else if (age < 12) height = 116 + (age - 6) * 5.7;
    else height = 150 + (target.maxHeight - 150) * progress(age, target.developmentTendency);
    var bodyOffset = {
      幼小: -1.5, 小胸: -0.8, 丰满: 2.6, 匀称: 0,
      娇小纤细: -1.2, 清瘦: -1.2, 健壮: 1.8,
    }[target.bodyType] || 0;
    var weight = age < 2 ? 3.4 + age * 6
      : (14.8 + Math.min(7, age * 0.35) + bodyOffset) * (height / 100) ** 2;
    target.height = Math.round(height * 10) / 10;
    target.weight = Math.max(3.2, Math.round(weight * 10) / 10);
  }

  Game.geneticsGrowth = Object.freeze({ applyAppearance, updateGrowth });
}(window));
