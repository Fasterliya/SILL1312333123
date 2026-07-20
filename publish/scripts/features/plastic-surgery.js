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
    hymen: { name: '处女膜修复', cost: 8000, success: 0.95, charm: 0, bodyType: null,
      category: 'hymen', failCharm: 0, failHealth: 0, hymenOnly: true },
    facial: { name: '面部整形', cost: 55000, success: 0.75, charm: 10, bodyType: null,
      category: 'facial', failCharm: -8, failHealth: -6 },
  };

  function list() { return Object.keys(procedures).map((k) => ({ id: k, ...procedures[k] })); }

  function get(id) { return procedures[id] || null; }

  function perform(state, procedureId) {
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
      if (proc.bodyType) {
        const personTarget = (proc.category === 'breast' || proc.category === 'breastreduction'
          || proc.category === 'liposuction') ? state.profile : null;
        if (personTarget) personTarget.bodyType = proc.bodyType;
      }
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
    const items = list().map((proc) => {
      const disabled = proc.hymenOnly && state.gender !== '女';
      return `<button class="surgery-btn" data-surgery="${proc.id}" ${disabled ? 'disabled' : ''}>
        <strong>${proc.name}</strong><small>成功率 ${Math.round(proc.success * 100)}%</small>
        <b>≈${Game.view.money(proc.cost)}</b></button>`;
    }).join('');

    const history = (state.health.cosmeticProcedures || []).map((item) => (
      `<p class="surgery-record ${item.success ? '' : 'failed'}">
        <small>${item.name} · ${item.success ? '成功' : '失败'}</small>
        <span>${Game.view.money(item.cost)} · ${item.note || ''}</span></p>`
    )).join('');

    return `<details class="system-fold" open>
      <summary>整容手术 · 5项可选</summary>
      <p class="system-note">手术影响外貌和魅力，失败时有并发症。整容结果会遗传影响子女外观。</p>
      <div class="surgery-grid">${items}</div>
      ${history ? `<div class="surgery-history"><h4>手术记录</h4>${history}</div>` : ''}
    </details>`;
  }

  Game.plasticSurgery = Object.freeze({ list, get, perform, render });
}(window));
