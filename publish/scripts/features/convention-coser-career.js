(function initConventionCoserCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const professionalRoles = new Set(['coser', 'contestant']);

  function active(state, ts) {
    return state.career?.jobId === 'coser' && professionalRoles.has(ts?.role);
  }

  function ensure(ts) {
    ts.coserCareer = ts.coserCareer && typeof ts.coserCareer === 'object'
      ? ts.coserCareer : {};
    ts.coserCareer.actions = Math.max(0, Number(ts.coserCareer.actions) || 0);
    ts.coserCareer.exposure = Math.max(0, Number(ts.coserCareer.exposure) || 0);
    ts.coserCareer.collaborations = Math.max(0, Number(ts.coserCareer.collaborations) || 0);
    return ts.coserCareer;
  }

  function choice(id, label, hint, next, effect) {
    return { id, label, hint, next, effect };
  }

  function options(state, ts) {
    if (!active(state, ts)) return [];
    if (ts.node === 'entrance') {
      return [choice('career-stage-checkin', '使用职业证件进入后台',
        '完成职业签到，直接进入舞台工作区并积累项目曝光。', 'stage',
        { score: 7, careerAction: 'checkin', careerExposure: 2, requires: { cosplay: true },
          result: '主办方核验了你的职业资料，并为你发放后台通行证。' })];
    }
    if (ts.node === 'stage') {
      return [choice('career-stage-showcase', '参加职业 Coser 舞台展示',
        '以当前造型完成正式展示，表现会计入职业项目结算。', 'stage-finale',
        { mood: 5, charm: 3, reputation: 5, score: 9, careerAction: 'showcase',
          careerExposure: 5, requires: { cosplay: true },
          result: '你按照舞台流程完成走位、定点与角色演绎。' })];
    }
    if (ts.node === 'coser-interact') {
      return [choice('career-coser-collab', '洽谈联动约拍',
        '把现场交流转为职业合作，提升项目曝光和合作积累。', 'coser-finale',
        { charm: 2, affection: 12, score: 7, careerAction: 'collab',
          careerExposure: 3, careerCollaboration: 1, requires: { cosplay: true },
          result: '你们确认了角色方向、拍摄主题和后续联络方式。' })];
    }
    if (ts.node === 'stage-finale') {
      return [choice('career-stage-portfolio', '发布舞台返图与幕后记录',
        '以职业项目收尾，返图表现将转化为粉丝、播放与收入。', '',
        { score: 7, careerAction: 'portfolio', careerExposure: 4, finish: true,
          requires: { cosplay: true },
          result: '你整理并发布了舞台返图和幕后花絮。' })];
    }
    if (ts.node === 'coser-finale') {
      return [choice('career-coser-deal', '确认联动企划并交换工作联系方式',
        '建立长期合作关系，并把本次交流计入职业履历。', '',
        { score: 8, affection: 8, contact: true, finish: true,
          careerAction: 'deal', careerExposure: 3, careerCollaboration: 1,
          requires: { cosplay: true },
          result: '你们交换了工作联系方式，并确定了联动企划。' })];
    }
    return [];
  }

  function contextBonus(state, ts, tag) {
    if (!active(state, ts) || !['stage', 'social'].includes(tag)) return 0;
    const rank = Game.specialCareerRanks?.profile(state)?.level || 0;
    const performance = Math.floor((Number(state.career.performance) || 0) / 30);
    return U.clamp(2 + rank * 2 + performance + (tag === 'social' ? 1 : 0), 0, 12);
  }

  function applyChoice(state, ts, effect) {
    if (!active(state, ts) || !effect?.careerAction) return;
    const project = ensure(ts);
    project.actions += 1;
    project.exposure += Math.max(0, Number(effect.careerExposure) || 0);
    project.collaborations += Math.max(0, Number(effect.careerCollaboration) || 0);
  }

  function settle(state, ts) {
    if (!active(state, ts) || !Game.creatorCareer?.ensure) return null;
    const project = ensure(ts);
    if (project.settled) return project.result || null;
    project.settled = true;
    const creator = Game.creatorCareer.ensure(state);
    const scale = { '国际级': 1.45, '大型': 1.25, '标准': 1, '地区级': 0.85 }[ts.eventScale] || 1;
    const quality = U.clamp(ts.score + project.exposure * 2 + project.collaborations * 3, 0, 60);
    const charm = Game.characterAttributes.derivedCharm(state.profile);
    const reach = Math.round((350 + quality * 70 + Math.sqrt(creator.followers) * 18) * scale);
    const followers = Math.max(25, Math.round(
      Math.sqrt(reach) * (1.15 + charm / 130) + project.exposure * 8,
    ));
    const views = Math.max(300, Math.round(reach * (1.1 + project.actions * 0.18)));
    const income = Math.round(
      (600 + quality * 55 + project.actions * 180
        + Game.creatorEconomy.audienceValue(creator.followers) * 0.2) * scale,
    );
    creator.followers += followers;
    creator.totalViews += views;
    creator.brandTrust = U.clamp(creator.brandTrust + 2 + project.collaborations * 2, 0, 100);
    state.money += income;
    state.career.performance = U.clamp(
      state.career.performance + Math.min(16, 5 + project.actions * 3), 0, 100,
    );
    state.career.exp = (Number(state.career.exp) || 0) + 4 + project.actions * 2;
    state.career.burnout = U.clamp((state.career.burnout || 0) + 4 + project.actions * 2, 0, 100);
    project.result = { followers, views, income };
    Game.careerHistory?.add(state, {
      key: `coser-convention-${ts.editionId}`,
      kind: 'project',
      title: `${ts.placeName}职业项目`,
      detail: `完成${project.actions}项职业行动，新增${followers}粉丝，收入${Game.view.money(income)}`,
    });
    Game.specialCareerRanks?.sync(state);
    Game.lifeDirector.addLog(
      state, 'Coser职业项目',
      `${ts.placeName}带来${followers}名粉丝、${views}次播放和${Game.view.money(income)}收入。`,
      'milestone',
    );
    return project.result;
  }

  function model(state, ts) {
    if (!active(state, ts)) return null;
    const creator = Game.creatorCareer.ensure(state);
    const project = ensure(ts);
    const rank = Game.specialCareerRanks?.profile(state);
    return {
      title: rank?.title || '职业Coser',
      followers: creator.followers,
      performance: state.career.performance,
      actions: project.actions,
      bonus: contextBonus(state, ts, /stage/.test(ts.node) ? 'stage' : 'social'),
    };
  }

  Game.conventionCoserCareer = Object.freeze({
    active, options, contextBonus, applyChoice, settle, model,
  });
}(window));
