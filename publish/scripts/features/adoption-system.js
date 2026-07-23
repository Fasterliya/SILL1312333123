(function initAdoptionSystem(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;
  var ADOPTION_COST = 15000;

  function score(value, fallback) {
    var numeric = Number(value);
    return Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : fallback));
  }

  function normalizeOrphan(state, orphan, index) {
    var age = Math.max(6, Math.min(12, Math.round(Number(orphan.age) || 8)));
    orphan.id = orphan.id || 'orphan-' + state.totalMonths + '-' + index;
    orphan.name = orphan.name || '待登记';
    orphan.gender = orphan.gender === '男' ? '男' : '女';
    orphan.age = age;
    orphan.relation = '待收养';
    orphan.baseAge = age;
    orphan.birthMonth = state.totalMonths - age * 12;
    orphan.bornAt = orphan.birthMonth;
    orphan.currentCity = state.location.city;
    orphan.homeCity = state.location.city;
    orphan.status = '健康';
    orphan.cosplay = orphan.cosplay || '无';
    orphan.clothing = orphan.clothing || {
      top: U.random(Game.config.appearance.top.slice(3, 8)),
      socks: U.random(Game.config.appearance.socks.slice(1, 4)),
      shoes: U.random(Game.config.appearance.shoes.slice(1, 5)),
    };
    orphan.portraitUrl = orphan.portraitUrl || null;
    orphan.portraitTaskId = orphan.portraitTaskId || null;
    orphan.portraitGallery = Array.isArray(orphan.portraitGallery) ? orphan.portraitGallery : [];
    orphan.customPrompt = orphan.customPrompt || '';
    orphan.portraitAgeStage = orphan.portraitAgeStage || null;
    if (!orphan.genetics || !Number.isFinite(orphan.height)) {
      Game.geneticsGrowth.updateGrowth(orphan, orphan.gender, age, true);
    }
    orphan.stats = orphan.stats && typeof orphan.stats === 'object' ? orphan.stats : {};
    orphan.stats.健康 = score(orphan.stats.健康, U.between(55, 85));
    orphan.stats.智力 = score(orphan.stats.智力, U.between(35, 75));
    orphan.stats.魅力 = score(orphan.stats.魅力, U.between(30, 70));
    return orphan;
  }

  function ensure(state) {
    state.adoption = state.adoption && typeof state.adoption === 'object' ? state.adoption : {
      orphans: [], lastRefreshMonth: -12, adoptedCount: 0,
    };
    var adoption = state.adoption;
    adoption.orphans = Array.isArray(adoption.orphans) ? adoption.orphans : [];
    adoption.lastRefreshMonth = Number.isFinite(adoption.lastRefreshMonth) ? adoption.lastRefreshMonth : -12;
    adoption.adoptedCount = Math.max(0, Number(adoption.adoptedCount) || 0);
    adoption.orphans = adoption.orphans.map(function (orphan, index) {
      return normalizeOrphan(state, orphan, index);
    });
    if (state.totalMonths - adoption.lastRefreshMonth >= 6) refreshOrphans(state);
    return adoption;
  }

  function refreshOrphans(state) {
    var existing = Array.isArray(state.adoption?.orphans) ? state.adoption.orphans : [];
    var orphans = existing.filter(function (orphan) {
      var status = Game.portraitSystem?.status?.('orphan:' + orphan.id);
      return Boolean(orphan.portraitUrl || status?.drawing);
    });
    var count = Math.max(orphans.length, U.between(3, 6));
    for (var i = orphans.length; i < count; i += 1) {
      var gender = U.random(['男', '女']);
      var surname = U.random(Game.nameSystem.surnames());
      var orphan = {
        id: 'orphan-' + state.totalMonths + '-' + i,
        name: Game.nameSystem.makeName(surname, gender, 'zh-CN'),
        gender: gender,
        age: U.between(6, 12),
        personality: U.random(Game.config.personalities),
        trait: U.random(Game.config.traits),
        hairColor: U.random(Game.config.appearance.hairColor.slice(0, 4)),
        temperament: U.random(Game.config.appearance.temperament.slice(4)),
        bodyType: gender === '女' ? U.random(['匀称', '娇小纤细', '清瘦']) : U.random(['匀称', '清瘦', '健壮']),
        stats: { 健康: U.between(55, 85), 智力: U.between(35, 75), 魅力: U.between(30, 70) },
      };
      orphans.push(normalizeOrphan(state, orphan, i));
    }
    state.adoption.orphans = orphans;
    state.adoption.lastRefreshMonth = state.totalMonths;
  }

  function canAdopt(state) {
    return U.age(state) >= 25 && ensure(state).orphans.length > 0;
  }

  function findOrphan(state, id) {
    return ensure(state).orphans.find(function (orphan) { return orphan.id === id; }) || null;
  }

  function childFrom(state, orphan) {
    return {
      id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      name: orphan.name,
      relation: orphan.gender === '男' ? '养子' : '养女',
      gender: orphan.gender,
      baseAge: orphan.age,
      birthMonth: state.totalMonths - orphan.age * 12,
      bornAt: state.totalMonths - orphan.age * 12,
      growthSeed: U.between(-4, 4),
      height: orphan.height || 0,
      weight: orphan.weight || 0,
      maxHeight: orphan.maxHeight,
      affection: U.between(38, 58),
      personality: orphan.personality,
      trait: orphan.trait,
      hairColor: orphan.hairColor,
      temperament: orphan.temperament,
      bodyType: orphan.bodyType,
      hairstyle: orphan.hairstyle,
      eyeColor: orphan.eyeColor,
      faceShape: orphan.faceShape,
      featureProportions: orphan.featureProportions,
      bodyFrame: orphan.bodyFrame,
      developmentTendency: orphan.developmentTendency,
      genetics: orphan.genetics,
      molePosition: orphan.molePosition,
      freckles: orphan.freckles,
      distinctiveFeature: orphan.distinctiveFeature,
      cosplay: orphan.cosplay || '无',
      clothing: { ...orphan.clothing },
      portraitUrl: orphan.portraitUrl || null,
      portraitTaskId: orphan.portraitTaskId || null,
      portraitGallery: [...(orphan.portraitGallery || [])],
      customPrompt: orphan.customPrompt || '',
      portraitAgeStage: orphan.portraitAgeStage || null,
      metCity: state.location.city,
      currentCity: state.location.city,
      homeCity: state.location.city,
      interactions: 0,
      phoneUnlocked: false,
      school: '',
      schoolHistory: [],
      educationName: '',
      educationStage: 'home',
      job: '',
      company: '',
      companyId: '',
      npcMarried: false,
      spouseName: '',
      spouseId: null,
      childrenCount: 0,
      childIds: [],
      parentIds: ['player-profile'],
      lastLifeUpdateAge: null,
      status: '健康',
      upbringing: { care: 30, education: 20, independence: 25, health: 55 },
      adopted: true,
      stats: { ...orphan.stats },
    };
  }

  function adopt(state, orphanIndex) {
    var adoption = ensure(state);
    if (U.age(state) < 25) return { ok: false, message: '需要年满25岁才能收养' };
    if (orphanIndex < 0 || orphanIndex >= adoption.orphans.length) {
      return { ok: false, message: '这孩子已经不在福利院了' };
    }
    if (state.money < ADOPTION_COST) {
      return { ok: false, message: '收养需要' + Game.view.money(ADOPTION_COST) + '办理手续' };
    }
    var child = childFrom(state, adoption.orphans[orphanIndex]);
    child.statSourceId = child.id;
    state.family.push(child);
    state.money -= ADOPTION_COST;
    adoption.orphans.splice(orphanIndex, 1);
    adoption.adoptedCount += 1;
    if (Game.familyEvents) Game.familyEvents.onAdoption(state, child);
    if (Game.lifeDirector) {
      Game.lifeDirector.addLog(state, '收养', '你正式收养了' + child.name + '。'
        + (child.gender === '男' ? '他' : '她') + '现在是你的' + child.relation + '。', 'milestone');
    }
    return { ok: true, message: '你收养了' + child.name + '。从现在起'
      + (child.gender === '男' ? '他' : '她') + '是你的家人。' };
  }

  Game.adoptionSystem = Object.freeze({
    cost: ADOPTION_COST, ensure, refreshOrphans, canAdopt, findOrphan, adopt,
  });
}(window));
