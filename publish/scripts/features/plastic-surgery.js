(function initPlasticSurgery(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  const procedures = {
    breastaug: { name: '隆胸', cost: 35000, success: 0.82, charm: 8, bodyType: '丰满',
      category: 'breast', failCharm: -4, failHealth: -5 },
    breastred: { name: '缩胸', cost: 28000, success: 0.88, charm: 3, bodyType: '小胸',
      category: 'breastreduction', failCharm: -2, failHealth: -3 },
    lipo: { name: '抽脂塑形', cost: 42000, success: 0.78, charm: 6, bodyType: '匀称',
      category: 'liposuction', failCharm: -3, failHealth: -4 },
    waist: { name: '腰腹塑形', cost: 38000, success: 0.84, charm: 6, bodyType: '娇小纤细',
      category: 'waist', failCharm: -3, failHealth: -4 },
    hip: { name: '臀部塑形', cost: 46000, success: 0.8, charm: 7, bodyType: '丰满',
      category: 'hip', failCharm: -4, failHealth: -5 },
    hymen: { name: '处女膜修复', cost: 8000, success: 0.95, charm: 0, bodyType: null,
      category: 'hymen', failCharm: 0, failHealth: 0, hymenOnly: true },
    facial: { name: '面部整形', cost: 55000, success: 0.75, charm: 10, faceShape: '鹅蛋脸',
      category: 'facial', failCharm: -8, failHealth: -6 },
    nose: { name: '鼻部塑形', cost: 26000, success: 0.88, charm: 5, featureProportions: '立体协调',
      category: 'nose', failCharm: -3, failHealth: -3 },
    eyelid: { name: '双眼皮手术', cost: 16000, success: 0.92, charm: 4, distinctiveFeature: '明亮双眼皮',
      category: 'eyelid', failCharm: -2, failHealth: -2 },
    jaw: { name: '下颌轮廓调整', cost: 62000, success: 0.72, charm: 8, faceShape: '精致鹅蛋脸',
      category: 'jaw', failCharm: -9, failHealth: -7 },
    height: { name: '增高手术', cost: 120000, success: 0.68, charm: 6, heightDelta: 5,
      category: 'height', failCharm: -8, failHealth: -10 },
  };

  function list() { return Object.keys(procedures).map((k) => ({ id: k, ...procedures[k] })); }

  function get(id) { return procedures[id] || null; }

  function portraitProfile(state) {
    return Game.hunterMode.identity(state).profile;
  }

  function setPortraitStage(state, stageId) {
    const option = Game.portraitAgePrompt.options.find((item) => item.id === stageId);
    if (!option) return { ok: false, message: '无效的绘画提示词阶段' };
    portraitProfile(state).portraitAgeStage = option.id;
    return {
      ok: true,
      message: `已免费切换为${option.label}并手动锁定，重新生成立绘后生效`,
    };
  }

  function applyChanges(state, proc) {
    const profile = state.profile;
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
      profile.adultHeight = Math.min(210, height + proc.heightDelta);
      profile.maxHeight = profile.adultHeight;
      profile.height = Math.min(profile.maxHeight, currentHeight + proc.heightDelta);
    }
  }

  function perform(state, procedureId) {
    if (String(procedureId).startsWith('portrait:')) {
      return setPortraitStage(state, String(procedureId).slice(9));
    }
    const proc = procedures[procedureId];
    if (!proc) return { ok: false, message: '无效的手术选项' };
    if (proc.hymenOnly && state.gender !== '女') return { ok: false, message: '此手术仅限女性' };

    const cost = U.between(Math.round(proc.cost * 0.85), Math.round(proc.cost * 1.2));
    if (state.money < cost) return { ok: false, message: `资金不足，手术需要 ${Game.view.money(cost)}` };
    Game.economy.spend(state, cost);
    state.money = Math.max(0, state.money);

    const roll = Math.random();
    const success = roll < proc.success;

    const result = {
      id: `surg-${state.totalMonths}-${Math.random().toString(36).slice(2,6)}`,
      type: proc.category,
      name: proc.name,
      month: state.totalMonths,
      cost,
      success,
    };

    if (success) {
      if (proc.charm) state.stats.魅力 = U.clamp(state.stats.魅力 + proc.charm, 0, 100);
      applyChanges(state, proc);
      if (proc.hymenOnly) state.profile.hymenIntact = true;
      result.note = `手术成功，${proc.name}完成。`;
    } else {
      if (proc.failCharm) state.stats.魅力 = U.clamp(state.stats.魅力 + proc.failCharm, 0, 100);
      if (proc.failHealth) state.stats.健康 = U.clamp(state.stats.健康 + proc.failHealth, 0, 100);
      result.note = `手术失败，${proc.name}出现了并发症。`;
    }

    state.health.cosmeticProcedures.push(result);
    state.health.cosmeticProcedures = state.health.cosmeticProcedures.slice(-8);
    state.profile.cosmeticProcedures = Array.isArray(state.profile.cosmeticProcedures)
      ? state.profile.cosmeticProcedures : [];
    state.profile.cosmeticProcedures.push(result);
    state.profile.cosmeticProcedures = state.profile.cosmeticProcedures.slice(-8);

    const tone = success ? 'good' : 'normal';
    Game.lifeDirector.addLog(state, proc.name + (success ? '完成' : '失败'), result.note, tone);
    return { ok: true, success, message: result.note + ` 花费 ${Game.view.money(cost)}` };
  }

  function render(state) {
    const profile = portraitProfile(state);
    const manual = Game.portraitAgePrompt.valid(profile.portraitAgeStage)
      ? profile.portraitAgeStage : null;
    const automatic = Game.portraitAgePrompt.automatic(U.age(state));
    const activeName = Game.portraitAgePrompt.options.find(
      (item) => item.id === (manual || automatic),
    )?.label || '默认成人风格';
    const stages = Game.portraitAgePrompt.options.map((item) => {
      const selected = manual === item.id;
      const suggested = !manual && automatic === item.id;
      return `<button class="portrait-stage-btn ${selected ? 'active' : (suggested ? 'automatic' : '')}"
        data-surgery="portrait:${item.id}" aria-pressed="${selected}">
        <strong>${item.label}</strong><small>${item.detail}</small>
        <b>${selected ? '已锁定' : (suggested ? '自动' : '免费')}</b></button>`;
    }).join('');
    const items = list().map((proc) => {
      const disabled = proc.hymenOnly && state.gender !== '女';
      return `<button class="surgery-btn" data-surgery="${proc.id}" ${disabled ? 'disabled' : ''}>
        <strong>${proc.name}</strong><small>成功率 ${Math.round(proc.success * 100)}% · 魅力+${proc.charm}</small>
        <b>≈${Game.view.money(proc.cost)}</b></button>`;
    }).join('');

    const history = (state.health.cosmeticProcedures || []).map((item) => (
      `<p class="surgery-record ${item.success ? '' : 'failed'}">
        <small>${item.name} · ${item.success ? '成功' : '失败'}</small>
        <span>${Game.view.money(item.cost)} · ${item.note || ''}</span></p>`
    )).join('');

    return `<details class="system-fold" open>
      <summary>整容手术 · ${list().length}项可选</summary>
      <section class="portrait-stage-picker"><header><div><strong>医院美容 · 绘画阶段</strong>
        <small>当前：${manual ? '手动锁定' : '自动跟随'} · ${activeName}</small></div><b>免费</b></header>
        <div class="portrait-stage-grid">${stages}</div>
        <p>手动选择后不再随年龄自动变化；只影响之后重新生成的角色立绘。</p></section>
      <p class="system-note">共${list().length}项改造。手术会改变身体并提高魅力，失败时可能出现并发症。</p>
      <div class="surgery-grid">${items}</div>
      ${history ? `<div class="surgery-history"><h4>手术记录</h4>${history}</div>` : ''}
    </details>`;
  }

  Game.plasticSurgery = Object.freeze({ list, get, perform, setPortraitStage, render });
}(window));
