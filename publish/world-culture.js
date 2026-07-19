(function initWorldCulture(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const profiles = {
    华夏: { locale: 'zh-CN', code: 'CNY', symbol: '¥', rate: 1, cost: 1,
      etiquette: '重视熟人关系、礼貌称呼与共同用餐' },
    日本: { locale: 'ja-JP', code: 'JPY', symbol: '¥', rate: 0.048, cost: 1.18,
      etiquette: '重视守时、公共秩序、礼貌距离与场合用语' },
    韩国: { locale: 'ko-KR', code: 'KRW', symbol: '₩', rate: 0.0052, cost: 1.08,
      etiquette: '重视年龄称谓、集体活动、礼节与聚餐氛围' },
    新加坡: { locale: 'en-US', code: 'SGD', symbol: 'S$', rate: 5.3, cost: 1.28,
      etiquette: '多语言环境，重视规则、效率与跨文化表达' },
    法国: { locale: 'fr-FR', code: 'EUR', symbol: '€', rate: 7.8, cost: 1.42,
      etiquette: '重视问候、个人边界、餐桌节奏与文化表达' },
    英国: { locale: 'en-GB', code: 'GBP', symbol: '£', rate: 9.2, cost: 1.5,
      etiquette: '重视排队、克制表达、准时与私人空间' },
    美国: { locale: 'en-US', code: 'USD', symbol: '$', rate: 7.2, cost: 1.45,
      etiquette: '表达直接，重视个人选择、预约与清晰沟通' },
  };

  function profile(country) {
    return profiles[country] || profiles.华夏;
  }

  function localAmount(cny, country) {
    const value = Number(cny);
    return Number.isFinite(value) ? Math.round(value / profile(country).rate) : 0;
  }

  function format(cny, country) {
    const item = profile(country);
    const amount = localAmount(cny, country);
    return `${amount < 0 ? '-' : ''}${item.symbol}${Math.abs(amount).toLocaleString(item.locale)} ${item.code}`;
  }

  function applyPerson(person, country) {
    const item = profile(country);
    person.culture = country;
    if (country !== '华夏') person.name = Game.nameSystem.makeName('', person.gender, item.locale);
    if (country === '日本') {
      const tops = Game.appearanceCatalog.top.filter((entry) => entry.tags.includes('和风'));
      const hairs = Game.appearanceCatalog.hairstyle.filter((entry) => entry.tags.includes('和风'));
      if (tops.length) person.clothing.top = Game.content.random(tops).name;
      if (hairs.length) person.hairstyle = Game.content.random(hairs).name;
    } else if (country === '韩国') {
      person.clothing.top = Game.content.random(['学院西装短裙套装', '都市衬衫裙', '城市轻奢旅行装']);
    } else if (['法国', '英国'].includes(country)) {
      person.clothing.top = Game.content.random(['针织开衫连衣裙', '长款大衣正装', '都市西装连衣裙']);
    } else if (['美国', '新加坡'].includes(country)) {
      const tops = person.gender === '女'
        ? ['城市轻奢旅行装', '海滨度假长裙', '都市衬衫裙', '牛仔外套直筒裤']
        : ['牛仔外套直筒裤', '城市轻奢旅行装', '简约T恤阔腿裤'];
      person.clothing.top = Game.content.random(tops);
    }
    return person;
  }

  Game.worldCulture = Object.freeze({ profiles, profile, localAmount, format, applyPerson });
}(window));
