(function initStateUpgrade(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const U = Game.content;

  function legacyTrait(interests) {
    if (!interests || typeof interests !== 'object') return U.random(C.traits);
    const strongest = Object.entries(interests).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      科学: '好奇', 文学: '敏感', 艺术: '浪漫',
      运动: '勇敢', 社交: '随和', 商业: '务实',
    }[strongest] || U.random(C.traits);
  }

  function fillPerson(item) {
    item.personality ||= U.random(C.personalities);
    item.trait ||= legacyTrait(item.interests);
    delete item.interests;
    item.hairColor ||= U.random(C.appearance.hairColor.slice(0, 4));
    item.temperament ||= U.random(C.appearance.temperament.slice(4));
    item.bodyType ||= U.random(C.appearance.bodyType.slice(1));
    item.hairstyle ||= U.random(C.appearance.hairstyle.slice(2, 9));
    item.clothing ||= U.clothing(item.outfit);
    item.clothing.top ||= item.outfit || '品质日常';
    item.clothing.socks ||= '短棉袜';
    item.clothing.shoes ||= '白色运动鞋';
    delete item.outfit;
    item.portraitUrl ??= null;
    item.portraitTaskId ??= null;
    item.customPrompt ||= '';
    item.metCity ||= '';
    item.interactions ||= 0;
    item.lastInteractionMonth ??= -1;
    item.phoneUnlocked ??= false;
    item.school ||= '';
    return item;
  }

  function fillProfile(state) {
    const profile = state.profile;
    profile.trait ||= legacyTrait(profile.interests);
    delete profile.interests;
    profile.clothing ||= U.clothing(profile.outfit);
    profile.clothing.top ||= profile.outfit || '品质日常';
    profile.clothing.socks ||= '短棉袜';
    profile.clothing.shoes ||= '白色运动鞋';
    delete profile.outfit;
    profile.portraitUrl ??= null;
    profile.portraitTaskId ??= null;
    profile.customPrompt ||= '';
  }

  function fillStocks(state) {
    state.assets.stocks ||= {};
    Object.entries(C.stocks).forEach(([name, price]) => {
      state.assets.stocks[name] ||= { price, previous: price, shares: 0 };
    });
  }

  function upgradeState(state) {
    if (!state) return U.createState();
    state.version = 4;
    state.location.country ||= C.cities.find((city) => city.city === state.location.city)?.country || '华夏';
    state.hometown ||= { ...state.location };
    state.hometown.country ||= '华夏';
    state.profile ||= U.createState().profile;
    fillProfile(state);
    delete state.stats.体魄;
    state.family = (state.family || []).map(fillPerson);
    state.contacts = (state.contacts || []).map(fillPerson);
    state.education.schoolStage ||= 'home';
    state.education.universityType ??= null;
    state.education.graduated ??= false;
    state.career.jobId ??= null;
    state.career.company ??= null;
    state.career.performance ??= 0;
    state.career.lastWorkMonth ??= -1;
    state.career.lastPromotionMonth ??= -12;
    state.career.applications ||= [];
    state.assets ||= { house: null, mortgage: 0, stocks: {} };
    state.assets.businesses ||= [];
    state.assets.vehicles ||= [];
    fillStocks(state);
    state.travel ||= { activeId: null, lastMonth: -1 };
    return state;
  }

  Game.stateUpgrade = Object.freeze({ upgradeState });
}(window));
