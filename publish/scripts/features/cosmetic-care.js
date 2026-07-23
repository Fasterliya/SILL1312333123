(function initCosmeticCare(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function ensurePlayer(state) {
    state.health = state.health && typeof state.health === 'object' ? state.health : {};
    const health = state.health;
    health.cosmeticProcedures = Array.isArray(health.cosmeticProcedures)
      ? health.cosmeticProcedures.slice(-8) : [];
    health.cosmeticSurgery = health.cosmeticSurgery && typeof health.cosmeticSurgery === 'object'
      ? health.cosmeticSurgery : {};
    const care = health.cosmeticSurgery;
    care.pending = care.pending && typeof care.pending === 'object' ? care.pending : null;
    care.cooldownUntil = Number.isFinite(care.cooldownUntil) ? care.cooldownUntil : -1;
    return care;
  }

  function addRecord(state, pending, proc) {
    const result = {
      id: `surg-${state.totalMonths}-${Math.random().toString(36).slice(2, 6)}`,
      type: proc.category, name: proc.name, month: state.totalMonths,
      startedAt: pending.startMonth, cost: pending.cost, success: true,
      note: `${proc.name}恢复完成，外貌调整已稳定。`,
    };
    state.health.cosmeticProcedures.push(result);
    state.health.cosmeticProcedures = state.health.cosmeticProcedures.slice(-8);
    state.profile.cosmeticProcedures = Array.isArray(state.profile.cosmeticProcedures)
      ? state.profile.cosmeticProcedures : [];
    state.profile.cosmeticProcedures.push(result);
    state.profile.cosmeticProcedures = state.profile.cosmeticProcedures.slice(-8);
    return result;
  }

  function startPlayer(state, procedureId) {
    const proc = Game.plasticSurgery.get(procedureId);
    if (!proc) return { ok: false, message: '无效的手术选项' };
    if (U.age(state) < 18) return { ok: false, message: '医疗美容仅对成年角色开放' };
    if (proc.hymenOnly && state.gender !== '女') return { ok: false, message: '此手术仅限女性' };
    var profile = state.profile;
    if (proc.heightDelta > 0 && profile && profile.bodyFrame && profile.bodyFrame.indexOf('娇小') >= 0) {
      return { ok: false, message: '娇小骨架天生无法通过手术增高' };
    }
    const care = ensurePlayer(state);
    if (care.pending) return { ok: false, message: `${care.pending.name}仍在恢复中` };
    const cooldown = Math.max(0, care.cooldownUntil - state.totalMonths);
    if (cooldown > 0) return { ok: false, message: `身体仍在恢复，请等待${cooldown}个月` };
    if (state.money < proc.cost) {
      return { ok: false, message: `资金不足，手术需要 ${Game.view.money(proc.cost)}` };
    }
    Game.economy.spend(state, proc.cost);
    care.pending = {
      procedureId, name: proc.name, cost: proc.cost, startMonth: state.totalMonths,
      completeMonth: state.totalMonths + proc.recoveryMonths,
    };
    care.cooldownUntil = care.pending.completeMonth + proc.cooldownMonths;
    Game.lifeDirector.addLog(state, `${proc.name}开始`,
      `手术已完成，进入${proc.recoveryMonths}个月恢复期；效果会在恢复结束时稳定。`, 'normal');
    return {
      ok: true,
      message: `${proc.name}进入恢复期，${proc.recoveryMonths}个月后完成；手术不会失败`,
    };
  }

  function monthly(state) {
    const care = ensurePlayer(state);
    const pending = care.pending;
    if (!pending || state.totalMonths < pending.completeMonth) return;
    const proc = Game.plasticSurgery.get(pending.procedureId);
    if (!proc) {
      care.pending = null;
      return;
    }
    Game.plasticSurgery.apply(state.profile, state.stats, proc);
    const result = addRecord(state, pending, proc);
    care.pending = null;
    Game.lifeDirector.addLog(state, `${proc.name}恢复完成`, result.note, 'good');
  }

  function status(state) {
    const care = ensurePlayer(state);
    const pending = care.pending;
    const recoveryRemaining = pending ? Math.max(0, pending.completeMonth - state.totalMonths) : 0;
    const cooldownRemaining = Math.max(0, care.cooldownUntil - state.totalMonths);
    const elapsed = pending ? state.totalMonths - pending.startMonth : 0;
    const total = pending ? Math.max(1, pending.completeMonth - pending.startMonth) : 1;
    return { pending, recoveryRemaining, cooldownRemaining, progress: Math.min(100, elapsed / total * 100) };
  }

  function renderStatus(state, item) {
    if (item.pending) return `<div class="surgery-status active"><div><span>恢复进行中</span>
      <strong>${item.pending.name}</strong><small>剩余 ${item.recoveryRemaining} 个月 · 完成后效果生效</small></div>
      <b>${Math.round(item.progress)}%</b><i style="--progress:${item.progress}%"></i></div>`;
    if (item.cooldownRemaining > 0) return `<div class="surgery-status cooldown"><div><span>术后冷却</span>
      <strong>身体调整期</strong><small>还需 ${item.cooldownRemaining} 个月可预约下一项</small></div>
      <b>${item.cooldownRemaining}月</b></div>`;
    return '<div class="surgery-status ready"><div><span>当前状态</span><strong>可预约手术</strong>'
      + '<small>所有项目均为 100% 完成，效果在恢复期结束后生效</small></div><b>就绪</b></div>';
  }

  function render(state) {
    const item = status(state);
    const locked = U.age(state) < 18 || item.pending || item.cooldownRemaining > 0;
    const items = Game.plasticSurgery.list().map((proc) => {
      const disabled = locked || (proc.hymenOnly && state.gender !== '女');
      return `<button class="surgery-btn" data-surgery="${proc.id}" ${disabled ? 'disabled' : ''}>
        <strong>${proc.name}</strong><small>魅力 +${proc.charm} · 恢复 ${proc.recoveryMonths}月</small>
        <b>${Game.view.money(proc.cost)}</b><em>100%完成</em></button>`;
    }).join('');
    const history = (state.health.cosmeticProcedures || []).slice().reverse().map((entry) => (
      `<p class="surgery-record ${entry.success === false ? 'failed' : ''}">
        <small>${entry.name} · ${entry.success === false ? '历史失败' : '已完成'}</small>
        <span>${Game.view.money(entry.cost)} · ${entry.note || ''}</span></p>`
    )).join('');
    return `<details class="system-fold" open><summary>整容手术</summary>
      ${Game.plasticSurgery.renderPlayerPortraitStages(state)}
      ${renderStatus(state, item)}
      <p class="system-note">成年后可预约。手术不会失败，但必须经历恢复期与术后冷却。</p>
      <div class="surgery-grid">${items}</div>
      ${history ? `<div class="surgery-history"><h4>手术记录</h4>${history}</div>` : ''}</details>`;
  }

  Game.cosmeticCare = Object.freeze({ ensurePlayer, startPlayer, monthly, status, render });
}(window));
