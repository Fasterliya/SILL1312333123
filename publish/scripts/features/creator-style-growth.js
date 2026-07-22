(function initCreatorStyleGrowth(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const jobAliases = Object.freeze({
    vtuber: 'vtuber',
    fashionblog: 'fashionblog',
    portraitblog: 'portraitblog',
    welfare: 'welfare',
    coser: 'coser',
    虚拟主播: 'vtuber',
    美妆博主: 'fashionblog',
    穿搭博主: 'fashionblog',
    时尚博主: 'fashionblog',
    写真博主: 'portraitblog',
    福利姬: 'welfare',
    职业Coser: 'coser',
    业余Coser: 'coser',
    受邀嘉宾Coser: 'coser',
  });
  const tuning = Object.freeze({
    vtuber: { cute: 1.15, sexy: 0.55, fashion: 0.75, cosplay: 1.35 },
    fashionblog: { cute: 0.88, sexy: 0.75, fashion: 1.25, cosplay: 0.75 },
    portraitblog: { cute: 0.95, sexy: 1.15, fashion: 0.95, cosplay: 1 },
    welfare: { cute: 1, sexy: 1.4, fashion: 0.7, cosplay: 0.9 },
    coser: { cute: 1.25, sexy: 0.65, fashion: 0.9, cosplay: 1.45 },
  });

  function value(profile, field) {
    if (Game.cosplayCatalog?.effectiveValue) {
      return String(Game.cosplayCatalog.effectiveValue(profile, field) || '');
    }
    return String((field.startsWith('clothing.')
      ? profile?.clothing?.[field.split('.')[1]] : profile?.[field]) || '');
  }

  function details(profile, rawJobId) {
    const jobId = jobAliases[rawJobId] || '';
    if (!tuning[jobId]) return {
      multiplier: 1, cute: 0, sexy: 0, fashion: 0, cosplay: 0, combo: 0, careerBonus: 0,
    };
    const top = value(profile, 'clothing.top');
    const socks = value(profile, 'clothing.socks');
    const hair = value(profile, 'hairstyle');
    const cosplay = Game.cosplayCatalog?.find?.(profile?.cosplay);
    const subjectStyle = cosplay?.prompt?.match(/主体服装与发型：([^。]+)/)?.[1] || '';
    const cosText = cosplay?.name !== '无' ? `${cosplay.name} ${subjectStyle}` : '';
    const fullStyle = `${top} ${socks} ${hair} ${cosText}`;
    let cute = 0;
    let sexy = 0;
    let fashion = 0;
    let cosplayBonus = cosText ? 0.07 : 0;
    let combo = 0;

    if (/水手服迷你裙/.test(top)) { cute += 0.1; sexy += 0.08; fashion += 0.03; }
    else if (/水手服|制服百褶裙|学院西装短裙|背带裙/.test(top)) { cute += 0.09; fashion += 0.05; }
    else if (/校服|学院|针织开衫连衣裙|洋装|巫女服|和服|浴衣/.test(fullStyle)) {
      cute += 0.05;
      fashion += 0.04;
    }
    if (/短装|短裙|紧身|露肩|吊带|泳装|女仆装|轻盈裙装/.test(fullStyle)) sexy += 0.07;
    if (/礼服|旗袍|小香|不对称|潮流|街头|机能|复古/.test(fullStyle)) fashion += 0.05;

    if (/白色连裤袜/.test(socks)) { cute += 0.09; fashion += 0.03; }
    else if (/黑色连裤袜/.test(socks)) { sexy += 0.1; fashion += 0.04; }
    else if (/过膝袜/.test(fullStyle)) { cute += 0.07; sexy += 0.04; }
    else if (/蕾丝边袜/.test(socks)) { cute += 0.06; sexy += 0.03; }
    else if (/条纹袜|格纹袜/.test(socks)) fashion += 0.05;
    else if (/中筒袜|长袜/.test(socks)) cute += 0.04;

    if (/双马尾/.test(fullStyle)) cute += 0.11;
    else if (/高马尾|高束马尾/.test(fullStyle)) { cute += 0.03; fashion += 0.04; }
    else if (/姬发|公主切|编发|鱼骨辫/.test(fullStyle)) { cute += 0.04; fashion += 0.04; }

    if (/水手服/.test(top) && /连裤袜|过膝袜|中筒袜/.test(socks)) combo += 0.05;
    if (/水手服|制服|学院/.test(fullStyle) && /双马尾/.test(fullStyle)) combo += 0.05;
    if (/短装|短裙|紧身/.test(fullStyle) && /黑色连裤袜|过膝袜/.test(fullStyle)) combo += 0.04;
    if (cosText && /制服|学院|女仆|巫女|洋装/.test(cosText)) cosplayBonus += 0.03;

    const weights = tuning[jobId];
    const careerBonus = Game.npcFemboyCareer?.styleBonus(profile, jobId) || 0;
    const bonus = cute * weights.cute + sexy * weights.sexy
      + fashion * weights.fashion + cosplayBonus * weights.cosplay + combo + careerBonus;
    return {
      multiplier: Math.min(2, Math.max(1, 1 + bonus)),
      cute, sexy, fashion, cosplay: cosplayBonus, combo, careerBonus,
    };
  }

  function multiplier(profile, jobId) {
    return details(profile, jobId).multiplier;
  }

  Game.creatorStyleGrowth = Object.freeze({ details, multiplier });
}(window));
