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

  function fillPortraits(item, updatedAt) {
    const gallery = Array.isArray(item.portraitGallery) ? item.portraitGallery : [];
    item.portraitGallery = gallery.filter((entry) => (
      entry && typeof entry.url === 'string' && entry.url
    )).slice(0, 8);
    if (typeof item.portraitUrl === 'string' && item.portraitUrl
      && !item.portraitGallery.some((entry) => entry.url === item.portraitUrl)) {
      item.portraitGallery.unshift({
        url: item.portraitUrl,
        taskId: item.portraitTaskId || null,
        prompt: item.customPrompt || '',
        createdAt: updatedAt || new Date().toISOString(),
      });
      item.portraitGallery = item.portraitGallery.slice(0, 8);
    }
  }

  function fillPerson(item, updatedAt) {
    item.personality ||= U.random(C.personalities);
    item.trait ||= legacyTrait(item.interests);
    delete item.interests;
    item.hairColor ||= U.random(C.appearance.hairColor.slice(0, 4));
    item.temperament ||= U.random(C.appearance.temperament.slice(4));
    item.bodyType ||= U.random(C.appearance.bodyType.slice(1));
    if (item.bodyType === '丰润') item.bodyType = '丰满';
    if (item.gender === '女' && item.bodyType === '清瘦') item.bodyType = '娇小纤细';
    if (item.gender === '女' && item.bodyType === '健壮') item.bodyType = '匀称';
    item.hairstyle ||= U.random(C.appearance.hairstyle.slice(2, 9));
    item.cosplay = Game.cosplayCatalog.find(item.cosplay).name;
    item.clothing ||= U.clothing(item.outfit);
    item.clothing.top ||= item.outfit || '品质日常';
    item.clothing.socks = Game.appearanceCatalog.normalizeSocks(item.clothing.socks);
    item.clothing.shoes ||= '白色运动鞋';
    delete item.outfit;
    item.portraitUrl ??= null;
    item.portraitTaskId ??= null;
    item.customPrompt ||= '';
    fillPortraits(item, updatedAt);
    item.growthSeed ??= U.between(-4, 4);
    item.height = Number.isFinite(item.height) ? item.height : 0;
    item.weight = Number.isFinite(item.weight) ? item.weight : 0;
    item.metCity ||= '';
    item.currentCity ||= item.careerCity || '';
    item.homeCity ||= '';
    item.schoolHistory = Array.isArray(item.schoolHistory) ? item.schoolHistory.slice(-8) : [];
    item.interactions ||= 0;
    item.phoneUnlocked ??= false;
    item.school ||= '';
    item.educationName ||= item.school || '';
    item.educationStage ||= 'home';
    item.company ||= '';
    item.companyId ||= '';
    const company = C.companies.find((entry) => entry.id === item.companyId);
    if (company) item.company = company.name;
    item.departmentId ||= '';
    item.departmentName ||= '';
    item.careerCity ||= '';
    item.careerRank = Math.max(0, Number(item.careerRank) || 0);
    item.managerId = typeof item.managerId === 'string' ? item.managerId : null;
    item.reportIds = Array.isArray(item.reportIds) ? item.reportIds.slice(0, 12) : [];
    item.npcMarried ??= ['父亲', '母亲', '配偶'].includes(item.relation);
    item.npcMarriedAtAge ??= null;
    item.spouseName ||= '';
    item.spouseId = typeof item.spouseId === 'string' ? item.spouseId : null;
    item.childrenCount ??= 0;
    item.childIds = Array.isArray(item.childIds) ? item.childIds.slice(0, 3) : [];
    item.parentIds = Array.isArray(item.parentIds) ? item.parentIds.slice(0, 2) : [];
    item.lastLifeUpdateAge ??= null;
    Game.specialCharacters.apply(item);
    Game.mortality.ensurePerson(item);
    Game.genetics.ensure(item, item.gender, `legacy-${item.id || item.name}`, true);
    return item;
  }

  function fillProfile(state) {
    const profile = state.profile;
    profile.trait ||= legacyTrait(profile.interests);
    delete profile.interests;
    profile.clothing ||= U.clothing(profile.outfit);
    profile.clothing.top ||= profile.outfit || '品质日常';
    profile.clothing.socks = Game.appearanceCatalog.normalizeSocks(profile.clothing.socks);
    profile.clothing.shoes ||= '白色运动鞋';
    delete profile.outfit;
    profile.portraitUrl ??= null;
    profile.portraitTaskId ??= null;
    profile.customPrompt ||= '';
    profile.cosplay = Game.cosplayCatalog.find(profile.cosplay).name;
    profile.id ||= 'player-profile';
    if (profile.bodyType === '丰润') profile.bodyType = '丰满';
    if (state.gender === '女' && profile.bodyType === '清瘦') profile.bodyType = '娇小纤细';
    if (state.gender === '女' && profile.bodyType === '健壮') profile.bodyType = '匀称';
    fillPortraits(profile, state.updatedAt);
    Game.genetics.ensure(profile, state.gender, `legacy-player-${state.name}`, true);
  }

  function fillStocks(state) {
    Game.companyMarket.ensure(state);
  }

  function upgradeState(state) {
    state ||= U.createState();
    state.version = Number(state.version) || 1;
    state.location.country ||= C.cities.find((city) => city.city === state.location.city)?.country || '华夏';
    state.hometown ||= { ...state.location };
    state.hometown.country ||= '华夏';
    state.profile ||= U.createState().profile;
    fillProfile(state);
    delete state.stats.体魄;
    state.family = (state.family || []).map((item) => fillPerson(item, state.updatedAt));
    state.contacts = (state.contacts || []).map((item) => fillPerson(item, state.updatedAt));
    state.worldPeople = (state.worldPeople || []).map((item) => fillPerson(item, state.updatedAt));
    state.matchmaking ||= { candidates: [] };
    state.matchmaking.candidates = (state.matchmaking.candidates || [])
      .map((item) => fillPerson(item, state.updatedAt));
    state.travel ||= { activeId: null };
    state.travel.encounters = (state.travel.encounters || [])
      .map((item) => fillPerson(item, state.updatedAt));
    const activeIds = Array.isArray(state.travel.activeIds)
      ? state.travel.activeIds : [state.travel.activeId];
    state.travel.activeIds = activeIds.filter((id, index, list) => (
      typeof id === 'string' && list.indexOf(id) === index
    )).slice(0, 3);
    state.travel.activeId = state.travel.activeIds[0] || null;
    const father = state.family.find((item) => item.relation === '父亲');
    const mother = state.family.find((item) => item.relation === '母亲');
    if (father && mother) {
      const childCount = state.family.filter((item) => (
        ['哥哥', '姐姐', '弟弟', '妹妹'].includes(item.relation)
      )).length + 1;
      father.npcMarried = true;
      father.spouseName ||= mother.name;
      father.childrenCount = Math.max(father.childrenCount, childCount);
      mother.npcMarried = true;
      mother.spouseName ||= father.name;
      mother.childrenCount = Math.max(mother.childrenCount, childCount);
    }
    state.education.schoolStage ||= 'home';
    state.education.highSchoolType ??= null;
    state.education.vocationalMajor ??= null;
    state.education.path ||= state.education.university ? '大学教育' : '基础教育';
    state.education.universityType ??= null;
    state.education.universityId ??= null;
    state.education.enrolledAt = Number.isFinite(state.education.enrolledAt)
      ? state.education.enrolledAt : null;
    state.education.durationMonths = Math.max(0, Number(state.education.durationMonths) || 0);
    state.education.graduated ??= false;
    state.career.jobId ??= null;
    if (state.career.jobId === 'subscriber') state.career.jobId = 'beautyblog';
    const currentJob = C.jobs.find((item) => item.id === state.career.jobId);
    if (currentJob) {
      state.career.job = currentJob.name;
      state.career.company = currentJob.company;
    }
    state.career.company ??= null;
    state.career.performance ??= 0;
    state.career.lastPromotionMonth ??= -12;
    state.career.applications ||= [];
    state.career.management = Boolean(state.career.management);
    state.career.titleTrack ||= state.career.management ? 'management' : 'staff';
    state.career.titleRank = Math.max(0, Number(state.career.titleRank) || 0);
    state.career.lastTitleMonth ??= state.career.lastPromotionMonth ?? -12;
    state.career.lastRaiseMonth ??= state.career.lastPromotionMonth ?? -6;
    state.career.lastAutoRaiseMonth ??= -12;
    state.assets ||= { house: null, mortgage: 0, stocks: {} };
    state.assets.businesses ||= [];
    state.assets.vehicles ||= [];
    state.assets.dividends = Math.max(0, Number(state.assets.dividends) || 0);
    fillStocks(state);
    Game.socialWorld.ensure(state);
    Game.mortality.prepare(state);
    state.routine ||= {};
    state.routine.actionMonth ??= state.totalMonths;
    state.routine.fatigue = U.clamp(Number(state.routine.fatigue) || 0, 0, 100);
    state.routine.actions ||= { study: 0, sport: 0, social: 0, rest: 0 };
    delete state.routine.lastReport;
    state = Game.systemsState.ensure(state);
    Game.taxSystem?.migratePending?.(state);
    return state;
  }

  Game.stateUpgrade = Object.freeze({ upgradeState });
}(window));
