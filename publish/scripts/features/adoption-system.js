(function initAdoptionSystem(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  var ADOPTION_COST = 15000;

  function ensure(state) {
    state.adoption = state.adoption && typeof state.adoption === 'object' ? state.adoption : {
      orphans: [],
      lastRefreshMonth: -12,
      adoptedCount: 0,
    };
    state.adoption.orphans = Array.isArray(state.adoption.orphans) ? state.adoption.orphans : [];
    state.adoption.lastRefreshMonth = Number.isFinite(state.adoption.lastRefreshMonth) ? state.adoption.lastRefreshMonth : -12;
    state.adoption.adoptedCount = Math.max(0, Number(state.adoption.adoptedCount) || 0);
    if (state.totalMonths - state.adoption.lastRefreshMonth >= 6) {
      refreshOrphans(state);
    }
    return state.adoption;
  }

  function refreshOrphans(state) {
    var count = U.between(3, 6);
    var orphans = [];
    for (var i = 0; i < count; i++) {
      var gender = U.random(['男', '女']);
      var age = U.between(6, 12);
      var nameSeed = U.random(Game.nameSystem.surnames());
      var givenName = Game.nameSystem.makeName(nameSeed, gender, 'zh-CN');
      var personality = U.random(Game.config.personalities);
      var trait = U.random(Game.config.traits);
      orphans.push({
        id: 'orphan-' + state.totalMonths + '-' + i,
        name: givenName,
        gender: gender,
        age: age,
        personality: personality,
        trait: trait,
        hairColor: U.random(Game.config.appearance.hairColor.slice(0, 4)),
        temperament: U.random(Game.config.appearance.temperament.slice(4)),
        bodyType: gender === '女' ? U.random(['匀称', '娇小纤细', '清瘦']) : U.random(['匀称', '清瘦', '健壮']),
        stats: {
          健康: U.between(55, 85),
          智力: U.between(35, 75),
          魅力: U.between(30, 70),
        },
      });
    }
    state.adoption.orphans = orphans;
    state.adoption.lastRefreshMonth = state.totalMonths;
  }

  function canAdopt(state) {
    return U.age(state) >= 25 && state.adoption && state.adoption.orphans && state.adoption.orphans.length > 0;
  }

  function adopt(state, orphanIndex) {
    var adoption = ensure(state);
    if (U.age(state) < 25) return { ok: false, message: '需要年满25岁才能收养' };
    var orphans = adoption.orphans;
    if (orphanIndex < 0 || orphanIndex >= orphans.length) return { ok: false, message: '这孩子已经不在福利院了' };
    if (state.money < ADOPTION_COST) return { ok: false, message: '收养需要' + Game.view.money(ADOPTION_COST) + '办理手续' };
    var orphanData = orphans[orphanIndex];

    var child = {
      id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      name: orphanData.name,
      relation: orphanData.gender === '男' ? '养子' : '养女',
      gender: orphanData.gender,
      baseAge: orphanData.age,
      birthMonth: state.totalMonths - orphanData.age * 12,
      bornAt: state.totalMonths - orphanData.age * 12,
      growthSeed: U.between(-4, 4),
      height: 0,
      weight: 0,
      affection: U.between(38, 58),
      personality: orphanData.personality,
      trait: orphanData.trait,
      hairColor: orphanData.hairColor,
      temperament: orphanData.temperament,
      bodyType: orphanData.bodyType,
      hairstyle: U.random(Game.config.appearance.hairstyle.slice(2, 7)),
      cosplay: '无',
      clothing: {
        top: U.random(Game.config.appearance.top.slice(3, 8)),
        socks: U.random(Game.config.appearance.socks.slice(1, 4)),
        shoes: U.random(Game.config.appearance.shoes.slice(1, 5)),
      },
      portraitUrl: null,
      portraitTaskId: null,
      portraitGallery: [],
      customPrompt: '',
      portraitAgeStage: null,
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
    };
    child.statSourceId = child.id;
    child.stats = orphanData.stats;

    state.family.push(child);
    state.money -= ADOPTION_COST;
    adoption.orphans.splice(orphanIndex, 1);
    adoption.adoptedCount += 1;

    if (Game.familyEvents) Game.familyEvents.onAdoption(state, child);
    if (Game.lifeDirector) {
      Game.lifeDirector.addLog(state, '收养', '你正式收养了' + child.name + '。' + (child.gender === '男' ? '他' : '她') + '现在是你的' + child.relation + '。', 'milestone');
    }

    return { ok: true, message: '你收养了' + child.name + '。从现在起' + (child.gender === '男' ? '他' : '她') + '是你的家人。' };
  }

  function render(state) {
    ensure(state);
    if (!canAdopt(state)) {
      var age = U.age(state);
      if (age < 25) return '<p class="empty-state">需年满25岁才能办理收养手续（当前' + age + '岁）</p>';
      return '<p class="empty-state">福利院暂无可收养的孩童。每6个月会更新一批。</p>';
    }

    var orphans = state.adoption.orphans;
    var cards = orphans.map(function (o, i) {
      return '<article style="padding:10px;border:1px solid var(--ui-line);border-radius:6px;background:var(--ui-paper);margin-bottom:8px">'
        + '<div style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:start">'
        + '<div style="width:44px;height:44px;border-radius:50%;background:var(--ui-soft,#f4f1e8);display:flex;align-items:center;justify-content:center;font-size:18px">' + (o.gender === '男' ? '👦' : '👧') + '</div>'
        + '<div>'
        + '<p style="font-size:13px;font-weight:700;margin:0;color:var(--ui-ink)">' + o.name + '</p>'
        + '<p style="font-size:9px;color:var(--ui-muted);margin:2px 0">' + o.gender + ' · ' + o.age + '岁 · ' + o.personality + ' · ' + o.trait + '</p>'
        + '<p style="font-size:9px;color:var(--ui-muted);margin:0">健康' + o.stats['健康'] + ' · 智力' + o.stats['智力'] + ' · 魅力' + o.stats['魅力'] + '</p>'
        + '<button type="button" data-adoption-adopt="' + i + '" style="margin-top:6px;min-height:36px;padding:6px 10px;border:none;border-radius:5px;background:var(--ui-green, #315f58);color:#fff;font-size:10px;font-weight:750;width:100%">收养 · ' + Game.view.money(ADOPTION_COST) + '</button>'
        + '</div></div></article>';
    }).join('');

    return '<div style="margin-top:4px"><p style="font-size:9px;color:var(--ui-muted);margin:0 0 8px">收养费用 ¥' + ADOPTION_COST.toLocaleString() + ' · 每6月更新 · 已收养' + state.adoption.adoptedCount + '次 · 当前' + orphans.length + '名孩童等待</p>'
      + cards + '</div>';
  }

  function renderOrphanage(state) {
    var el = document.getElementById('orphanageList');
    if (!el) return;
    var html = render(state);
    el.innerHTML = html;
  }

  function handleClick(event) {
    var state = Game._getState ? Game._getState() : null;
    if (!state) return false;

    var adoptBtn = event.target.closest('[data-adoption-adopt]');
    if (adoptBtn) {
      var index = Number(adoptBtn.dataset.adoptionAdopt);
      var result = adopt(state, index);
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      if (Game._refresh) Game._refresh();
      if (Game._save) Game._save();
      return true;
    }
    return false;
  }

  Game.adoptionSystem = Object.freeze({
    ensure: ensure,
    adopt: adopt,
    canAdopt: canAdopt,
    render: render,
    renderOrphanage: renderOrphanage,
    handleClick: handleClick,
  });
}(window));
