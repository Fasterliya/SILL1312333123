(function initPlasticSurgery(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  const procedures = {
    breastaug: { name: '隆胸', cost: 35000, charm: 8, bodyType: '丰满',
      category: 'breast', recoveryMonths: 2, cooldownMonths: 4 },
    breastred: { name: '缩胸', cost: 28000, charm: 3, bodyType: '小胸',
      category: 'breastreduction', recoveryMonths: 2, cooldownMonths: 4 },
    lipo: { name: '抽脂塑形', cost: 42000, charm: 6, bodyType: '匀称', weightDelta: -5,
      category: 'liposuction', recoveryMonths: 3, cooldownMonths: 5 },
    waist: { name: '腰腹塑形', cost: 38000, charm: 6, bodyType: '娇小纤细', weightDelta: -4,
      category: 'waist', recoveryMonths: 3, cooldownMonths: 5 },
    hip: { name: '臀部塑形', cost: 46000, charm: 7, bodyType: '丰满',
      category: 'hip', recoveryMonths: 3, cooldownMonths: 5 },
    hymen: { name: '处女膜修复', cost: 8000, charm: 0, bodyType: null,
      category: 'hymen', recoveryMonths: 1, cooldownMonths: 3, hymenOnly: true },
    facial: { name: '面部整形', cost: 55000, charm: 10, faceShape: '鹅蛋脸',
      category: 'facial', recoveryMonths: 3, cooldownMonths: 6 },
    nose: { name: '鼻部塑形', cost: 26000, charm: 5, featureProportions: '立体协调',
      category: 'nose', recoveryMonths: 2, cooldownMonths: 4 },
    eyelid: { name: '双眼皮手术', cost: 16000, charm: 4, distinctiveFeature: '明亮双眼皮',
      category: 'eyelid', recoveryMonths: 1, cooldownMonths: 3 },
    jaw: { name: '下颌轮廓调整', cost: 62000, charm: 8, faceShape: '精致鹅蛋脸',
      category: 'jaw', recoveryMonths: 4, cooldownMonths: 7 },
    height: { name: '增高手术', cost: 120000, charm: 6, heightDelta: 5,
      category: 'height', recoveryMonths: 5, cooldownMonths: 9 },
    heightshort: { name: '身高缩减塑形', cost: 98000, charm: 7, heightDelta: -4, weightDelta: -2,
      bodyType: '娇小纤细', category: 'height-reduction', recoveryMonths: 5, cooldownMonths: 9 },
  };

  function list() { return Object.keys(procedures).map((k) => ({ id: k, ...procedures[k] })); }

  function get(id) { return procedures[id] || null; }

  function portraitProfile(state, targetId) {
    return targetId ? Game.people.find(state, targetId) : Game.hunterMode.identity(state).profile;
  }

  function setPortraitStage(state, stageId, targetId) {
    const option = Game.portraitAgePrompt.options.find((item) => item.id === stageId);
    if (!option) return { ok: false, message: '无效的绘画提示词阶段' };
    const profile = portraitProfile(state, targetId);
    if (!profile) return { ok: false, message: '没有找到需要调整的角色' };
    if (targetId && (profile.gender !== '女' || profile.status === '已故')) {
      return { ok: false, message: '当前角色不能调整绘画阶段' };
    }
    profile.portraitAgeStage = option.id;
    return {
      ok: true,
      message: `${targetId ? '该角色' : '当前角色'}已免费切换为${option.label}并锁定，重新生成立绘后生效`,
    };
  }

  function stageSelector(profile, years, actionPrefix, title) {
    const manual = Game.portraitAgePrompt.valid(profile.portraitAgeStage)
      ? profile.portraitAgeStage : null;
    const automatic = Game.portraitAgePrompt.automatic(years);
    const activeName = Game.portraitAgePrompt.options.find(
      (item) => item.id === (manual || automatic),
    )?.label || '默认成人风格';
    const stages = Game.portraitAgePrompt.options.map((item) => {
      const selected = manual === item.id;
      const suggested = !manual && automatic === item.id;
      return `<button class="portrait-stage-btn ${selected ? 'active' : (suggested ? 'automatic' : '')}"
        data-surgery="${actionPrefix}${item.id}" aria-pressed="${selected}">
        <strong>${item.label}</strong><small>${item.detail}</small>
        <b>${selected ? '已锁定' : (suggested ? '自动' : '免费')}</b></button>`;
    }).join('');
    return `<section class="portrait-stage-picker"><header><div><strong>${title}</strong>
      <small>当前：${manual ? '手动锁定' : '自动跟随'} · ${activeName}</small></div><b>免费</b></header>
      <div class="portrait-stage-grid">${stages}</div>
      <p>手动选择后不再随年龄自动变化；重新生成该角色立绘后生效。</p></section>`;
  }

  function renderNpcPortraitStages(state, person) {
    if (!person || person.gender !== '女' || person.status === '已故') return '';
    return stageSelector(person, U.personAge(state, person),
      `npc-portrait:${encodeURIComponent(person.id)}:`, '绘画七阶段');
  }

  function renderPlayerPortraitStages(state) {
    return stageSelector(portraitProfile(state), U.age(state), 'portrait:', '医院美容 · 绘画阶段');
  }

  function applyChanges(profile, proc) {
    if (proc.bodyType) {
      profile.bodyType = proc.bodyType;
      profile.adultBodyType = proc.bodyType;
    }
    if (proc.faceShape) {
      profile.faceShape = proc.faceShape;
      profile.cosmeticFaceShape = proc.faceShape;
    }
    if (proc.featureProportions) {
      profile.featureProportions = proc.featureProportions;
      profile.cosmeticFeatureProportions = proc.featureProportions;
    }
    if (proc.distinctiveFeature) {
      profile.distinctiveFeature = proc.distinctiveFeature;
      profile.cosmeticDistinctiveFeature = proc.distinctiveFeature;
    }
    if (proc.heightDelta) {
      const height = Number(profile.adultHeight) || Number(profile.maxHeight) || Number(profile.height) || 160;
      const currentHeight = Number(profile.height) || height;
      profile.adultHeight = Math.max(135, Math.min(210, height + proc.heightDelta));
      profile.maxHeight = profile.adultHeight;
      profile.height = Math.max(135, Math.min(profile.maxHeight, currentHeight + proc.heightDelta));
    }
    if (proc.weightDelta && Number.isFinite(Number(profile.weight))) {
      profile.weight = Math.max(35, Math.round((Number(profile.weight) + proc.weightDelta) * 10) / 10);
    }
  }

  function apply(profile, stats, proc) {
    if (proc.charm) Game.characterAttributes.adjustPresentation(profile, stats, proc.charm);
    applyChanges(profile, proc);
    if (proc.hymenOnly) profile.hymenIntact = true;
  }

  function perform(state, procedureId) {
    const action = String(procedureId);
    if (action.startsWith('portrait:')) return setPortraitStage(state, action.slice(9));
    if (action.startsWith('npc-portrait:')) {
      const [, targetId, stageId] = action.split(':');
      return setPortraitStage(state, stageId, decodeURIComponent(targetId || ''));
    }
    return Game.cosmeticCare?.startPlayer(state, procedureId)
      || { ok: false, message: '整容恢复系统尚未加载' };
  }

  function render(state) {
    return Game.cosmeticCare?.render(state) || '<p class="empty-state">整容系统加载中。</p>';
  }

  Game.plasticSurgery = Object.freeze({
    list, get, apply, perform, setPortraitStage,
    renderPlayerPortraitStages, renderNpcPortraitStages, render,
  });
}(window));
