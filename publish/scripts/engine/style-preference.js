(function initStylePreference(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};

  var POOLS = ['school', 'cute', 'wafuu', 'formal'];

  var SUB_POOLS = {
    school: ['sailor', 'jk', 'blazer'],
    cute: ['girly', 'soft', 'artsy', 'lolita'],
    wafuu: ['miko', 'furisode', 'taisho', 'casual'],
    formal: ['office', 'minimal'],
  };

  var HAIR_BY_SUB = {
    'sailor': [['双马尾', 40], ['姬发式', 30], ['高马尾', 20], ['单马尾', 10]],
    'jk': [['齐肩长发', 30], ['自然层次发', 25], ['姬发式', 20], ['双马尾', 15], ['高马尾', 10]],
    'blazer': [['齐肩长发', 35], ['层次碎发', 25], ['自然层次发', 20], ['姬发式', 10], ['简约短发', 10]],
    'girly': [['双马尾', 35], ['空气刘海长发', 25], ['羊毛卷', 15], ['法式卷发', 15], ['鱼骨辫', 10]],
    'soft': [['锁骨发', 30], ['空气刘海长发', 25], ['自然层次发', 20], ['波波头', 15], ['侧编发', 10]],
    'artsy': [['侧编发', 25], ['鱼骨辫', 20], ['法式卷发', 20], ['羊毛卷', 20], ['锁骨发', 15]],
    'lolita': [['波浪卷双马尾', 35], ['姬发式刘海卷', 25], ['羊毛卷', 20], ['空气刘海长发', 20]],
    'miko': [['巫女垂顺长发', 60], ['传统和风盘发', 25], ['水引编发', 15]],
    'furisode': [['花簪横兵库', 40], ['岛田髷', 30], ['传统和风盘发', 20], ['武家高束发', 10]],
    'taisho': [['夜会卷', 40], ['公主切长发', 25], ['日式姬发式', 20], ['水引编发', 15]],
    'casual': [['日式低双马尾', 35], ['公主切长发', 30], ['日式短碎发', 20], ['樱花发簪盘发', 15]],
    'office': [['利落短发', 40], ['简约短发', 30], ['齐肩直发', 20], ['自然层次发', 10]],
    'minimal': [['简约短发', 50], ['利落短发', 30], ['齐肩直发', 20]],
  };

  var SOCKS_BY_SUB = {
    'sailor': [['白色连裤袜', 60], ['白色过膝袜', 40]],
    'jk': [['黑色过膝袜', 45], ['白色过膝袜', 35], ['白色连裤袜', 20]],
    'blazer': [['白色中筒袜', 50], ['黑色中筒袜', 30], ['白色连裤袜', 20]],
    'girly': [['蝴蝶结蕾丝短袜', 40], ['白色蕾丝边袜', 30], ['樱粉中筒袜', 30]],
    'soft': [['荷叶边短袜', 40], ['船袜', 35], ['白色中筒袜', 25]],
    'artsy': [['白色连裤袜', 40], ['白色中筒袜', 30], ['船袜', 30]],
    'lolita': [['白色蕾丝边袜', 40], ['蝴蝶结蕾丝短袜', 35], ['白色连裤袜', 25]],
    'miko': [['白色二趾足袋袜', 80], ['黑色蕾丝足袋袜', 20]],
    'furisode': [['白色二趾足袋袜', 70], ['黑色蕾丝足袋袜', 30]],
    'taisho': [['白色二趾足袋袜', 50], ['白色中筒袜', 50]],
    'office': [['黑色商务袜', 60], ['船袜', 40]],
    'minimal': [['船袜', 60], ['黑色商务袜', 40]],
  };

  var SHOES_BY_SUB = {
    'sailor': [['乐福鞋', 70], ['玛丽珍鞋', 30]],
    'jk': [['乐福鞋', 80], ['玛丽珍鞋', 20]],
    'blazer': [['便士乐福鞋', 60], ['玛丽珍鞋', 40]],
    'girly': [['玛丽珍鞋', 60], ['白色运动鞋', 40]],
    'soft': [['帆布鞋', 50], ['白色运动鞋', 50]],
    'artsy': [['帆布鞋', 50], ['舒适布鞋', 50]],
    'lolita': [['玛丽珍鞋', 60], ['系带牛津鞋', 40]],
    'miko': [['高木屐', 60], ['高底草履', 40]],
    'furisode': [['高下駄', 50], ['高木屐', 50]],
    'taisho': [['駒下駄', 60], ['系带牛津鞋', 40]],
    'office': [['系带牛津鞋', 50], ['便士乐福鞋', 50]],
    'minimal': [['便士乐福鞋', 70], ['舒适布鞋', 30]],
  };

  function weightedPick(pool) {
    var total = pool.reduce(function (s, p) { return s + p[1]; }, 0);
    var roll = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < pool.length; i++) {
      acc += pool[i][1];
      if (roll <= acc) return pool[i][0];
    }
    return pool[pool.length - 1][0];
  }

  function assign(person, state) {
    if (person._styleLocked) return;
    var age = Game.content.personAge(state, person);
    var isJapanese = (person.culture || state.location?.country) === '日本';

    var pool;
    if (isJapanese) {
      var jRoll = Math.random() * 100;
      if (jRoll < 50) pool = 'wafuu';
      else if (jRoll < 80) pool = 'school';
      else if (jRoll < 95) pool = 'cute';
      else pool = 'formal';
    } else {
      var roll = Math.random() * 100;
      if (age <= 14) { pool = 'school'; }
      else if (age <= 24) {
        if (roll < 55) pool = 'school';
        else if (roll < 90) pool = 'cute';
        else if (roll < 95) pool = 'formal';
        else pool = 'wafuu';
      } else if (age <= 60) {
        if (roll < 55) pool = 'school';
        else if (roll < 85) pool = 'cute';
        else if (roll < 95) pool = 'formal';
        else pool = 'wafuu';
      } else {
        if (roll < 25) pool = 'school';
        else if (roll < 70) pool = 'cute';
        else if (roll < 95) pool = 'formal';
        else pool = 'wafuu';
      }
    }

    applyPersonalityMods(person, pool);
  }

  function applyPersonalityMods(person, pool) {
    var p = person.personality || '';
    var mods = {
      '浪漫': ['cute', 20], '敏感': ['cute', 20],
      '理性': ['school', 30], '自律': ['school', 30],
      '热血': ['school', 20], '外向': ['school', 20],
      '内向': ['cute', 25],
      '清冷': ['formal', 30],
      '病弱': ['cute', 20],
    };
    var m = mods[p];
    if (m && m[0] !== pool && Math.random() * 100 < m[1]) pool = m[0];
    person._stylePool = pool;

    var subList = SUB_POOLS[pool] || SUB_POOLS.school;
    if (Math.random() < 0.30) {
      var extremeIdx = Math.floor(Math.random() * (subList.length > 4 ? 4 : subList.length));
      person._styleSub = subList[Math.floor(Math.random() * Math.min(3, subList.length))];
    } else {
      person._styleSub = subList[Math.floor(Math.random() * subList.length)];
    }
  }

  function override(person, pool, sub) {
    if (pool && POOLS.indexOf(pool) >= 0) person._stylePool = pool;
    if (sub) person._styleSub = sub;
  }

  function pickOutfit(person, state) {
    if (!person._stylePool) assign(person, state);
    var sub = person._styleSub || 'sailor';
    var hairPool = HAIR_BY_SUB[sub] || HAIR_BY_SUB.sailor;
    var socksPool = SOCKS_BY_SUB[sub] || SOCKS_BY_SUB.sailor;
    var shoesPool = SHOES_BY_SUB[sub] || SHOES_BY_SUB.sailor;

    var hairName = weightedPick(hairPool);
    var socksName = weightedPick(socksPool);
    var shoesName = weightedPick(shoesPool);

    var catalog = Game.appearanceCatalog;
    var hairItem = catalog.find ? catalog.find(hairName) : null;
    var socksItem = catalog.find ? catalog.find(socksName) : null;
    var shoesItem = catalog.find ? catalog.find(shoesName) : null;

    var age = Game.content.personAge(state, person);
    var poolTag = person._stylePool;

    var topName = pickTop(person, state, poolTag, sub);
    var topItem = catalog.find ? catalog.find(topName) : null;

    return {
      hair: hairItem ? hairItem.name : (hairName || '齐肩直发'),
      top: topItem ? topItem.name : (topName || '品质日常'),
      socks: socksItem ? socksItem.name : (socksName || '白色连裤袜'),
      shoes: shoesItem ? shoesItem.name : (shoesName || '乐福鞋'),
    };
  }

  function pickTop(person, state, poolTag, sub) {
    var catalog = Game.appearanceCatalog;
    var age = Game.content.personAge(state, person);
    var tops = catalog.top || [];

    var tagFilter = poolTag === 'cute' ? ['可爱'] :
      poolTag === 'school' ? ['校园'] :
      poolTag === 'wafuu' ? ['和风'] : ['正式'];

    if (poolTag === 'wafuu' && sub === 'miko') {
      tagFilter = ['和风'];
    }
    if (poolTag === 'school' && sub === 'sailor') {
      var sailorItems = tops.filter(function (t) {
        return t.name.indexOf('水手服') >= 0 || t.name.indexOf('迷你裙') >= 0;
      });
      if (sailorItems.length) return sailorItems[Math.floor(Math.random() * sailorItems.length)].name;
    }

    var eligible = tops.filter(function (t) {
      return t.tags && tagFilter.some(function (tag) { return t.tags.indexOf(tag) >= 0; })
        && age >= t.minAge && age <= t.maxAge;
    });
    if (!eligible.length) eligible = tops.filter(function (t) { return age >= t.minAge && age <= t.maxAge; });
    if (!eligible.length) return '品质日常';
    return eligible[Math.floor(Math.random() * eligible.length)].name;
  }

  function getHairPool(sub) { return HAIR_BY_SUB[sub] || HAIR_BY_SUB.sailor; }
  function getSocksPool(sub) { return SOCKS_BY_SUB[sub] || SOCKS_BY_SUB.sailor; }
  function getShoesPool(sub) { return SHOES_BY_SUB[sub] || SHOES_BY_SUB.sailor; }

  function assignPlayer(state) {
    var profile = state.profile;
    if (profile._styleLocked) return;
    if (!profile._stylePool) {
      var roll = Math.random();
      if (roll < 0.55) profile._stylePool = 'school';
      else if (roll < 0.85) profile._stylePool = 'cute';
      else if (roll < 0.95) profile._stylePool = 'wafuu';
      else profile._stylePool = 'formal';
      var sl = SUB_POOLS[profile._stylePool] || SUB_POOLS.school;
      profile._styleSub = sl[Math.floor(Math.random() * Math.min(3, sl.length))];
    }
  }

  Game.stylePreference = Object.freeze({
    POOLS: POOLS, SUB_POOLS: SUB_POOLS,
    assign: assign, override: override, pickOutfit: pickOutfit,
    assignPlayer: assignPlayer,
    getHairPool: getHairPool, getSocksPool: getSocksPool, getShoesPool: getShoesPool,
    weightedPick: weightedPick,
  });
}(window));
