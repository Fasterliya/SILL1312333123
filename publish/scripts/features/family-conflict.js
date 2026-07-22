(function initFamilyConflict(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.familyConflictCore;
  const Actions = Game.familyConflictActions;

  function monthlyPartner(state, entry) {
    const person = Game.people.find(state, entry.id);
    const item = Core.profile(state, entry.id);
    if (!person || person.status !== '健康') return;
    const lastDate = state.romance.lastDateMonth ?? state.totalMonths;
    if (state.totalMonths - lastDate >= 3 && state.totalMonths % 3 === 0) {
      item.suspicion = Core.clamp(item.suspicion + 2);
    }
    if (item.stage === 'cooling' && item.cooldownUntil > state.totalMonths
        && state.totalMonths % 2 === 0) {
      person.affection = Core.clamp(person.affection - 1);
      Core.affectChildren(state, person.id, 1);
    }
    if (item.cooldownUntil === state.totalMonths && item.stage === 'cooling') {
      item.stage = 'strained';
    }
    if (item.stage === 'repairing' && state.totalMonths - item.reconciledAt >= 6) {
      item.stage = 'calm';
      item.suspicion = Core.clamp(item.suspicion - 10);
      person.trust = Core.clamp((person.trust || 50) + 4);
    }
    const hasRecentEvidence = item.evidence.some((evidence) => (
      state.totalMonths - evidence.month < 4
    ));
    if (item.suspicion > 0 && state.totalMonths % 4 === 0 && !hasRecentEvidence) {
      item.suspicion = Core.clamp(item.suspicion - 2);
    }
  }

  function checkJobExposure(state, entries) {
    if (!['妓女', '福利姬'].includes(state.career.job)) return;
    entries.forEach((entry) => {
      const person = Game.people.find(state, entry.id);
      if (person?.currentCity !== state.location.city || Math.random() >= 0.06) return;
      Core.recordEvidence(state, {
        partnerIds: [entry.id],
        sourceId: `job-${entry.id}-${state.totalMonths}`,
        kind: '职业暴露',
        detail: `${person.name}听到了关于你真实工作的传闻。`,
        weight: 15,
      });
    });
  }

  function queueMostSuspicious(state, entries) {
    if (state.pendingDecision) return;
    const target = entries.map((entry) => ({ entry, item: Core.profile(state, entry.id) }))
      .filter(({ item }) => (
        item.suspicion >= 45 && state.totalMonths - item.lastDecisionMonth >= 4
      ))
      .sort((left, right) => right.item.suspicion - left.item.suspicion)[0];
    if (target) Actions.queue(state, Game.people.find(state, target.entry.id), 'confrontation');
  }

  function monthly(state) {
    const data = Core.ensure(state);
    if (data.lastMonthly === state.totalMonths) return;
    data.lastMonthly = state.totalMonths;
    const entries = Core.spouseEntries(state);
    entries.forEach((entry) => monthlyPartner(state, entry));
    checkJobExposure(state, entries);
    queueMostSuspicious(state, entries);
    const home = Game.householdSystem?.ensure(state);
    if (home?.conflict >= 60 && state.totalMonths % 3 === 0) {
      Core.affectChildren(state, null, 1);
    }
    Core.syncSuspicion(state);
  }

  function stageLabel(stage) {
    return {
      calm: '平稳',
      confronting: '对峙',
      strained: '紧张',
      ruptured: '破裂',
      cooling: '分居',
      repairing: '修复中',
      divorced: '已离婚',
    }[stage] || stage;
  }

  function renderRow(state, entry) {
    const person = Game.people.find(state, entry.id);
    const item = Core.profile(state, entry.id);
    if (!person) return '';
    const suspicion = Math.round(item.suspicion);
    const level = suspicion < 20 ? '平静'
      : (suspicion < 50 ? '微妙' : (suspicion < 75 ? '紧张' : '危险'));
    const disabled = state.pendingDecision ? ' disabled' : '';
    return `<article class="partner-row">
      <div><strong>${person.name}</strong>
        <small>${level} · 证据${item.evidence.length}条 · ${stageLabel(item.stage)}</small></div>
      <div><span>怀疑 ${suspicion}</span><small>信任${Math.round(person.trust || 0)}</small></div>
      <div class="partner-actions">
        <button data-conflict-action="confront" data-partner-id="${person.id}"${disabled}>对峙</button>
        <button data-conflict-action="reconcile" data-partner-id="${person.id}"${disabled}>修复</button>
        <button data-conflict-action="divorce" data-partner-id="${person.id}"
          class="danger-btn"${disabled}>离婚</button>
      </div>
    </article>`;
  }

  function render(state) {
    Core.ensure(state);
    const entries = Core.spouseEntries(state);
    if (!entries.length) return '';
    var maxSuspicion = Math.max.apply(null, entries.map(function (e) {
      return Math.round(Core.profile(state, e.id).suspicion);
    }));
    var alertColor = maxSuspicion >= 75 ? 'var(--ui-red, #a8453a)' : (maxSuspicion >= 45 ? 'var(--ui-gold, #b88a35)' : 'var(--ui-green, #315f58)');
    return `<div style="margin-top:8px;padding:10px;border:1px solid var(--ui-line);border-radius:6px;border-left:4px solid ${alertColor};background:var(--ui-paper)">
      <p style="font-size:10px;font-weight:700;margin:0 0 6px;color:var(--ui-ink)">婚姻关系 · ${entries.length}位配偶</p>
      <div class="partner-list">${entries.map((entry) => renderRow(state, entry)).join('')}</div>
      <p style="font-size:9px;color:var(--ui-muted);margin:4px 0 0">出轨${state.romance.affairCount}次 · 线索按配偶分别累积；坦白、否认、冷静与复合会留下长期后果。</p>
    </div>`;
  }

  function finish(result) {
    Game._refresh?.();
    Game._save?.();
    if (result) Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
  }

  function handleClick(event) {
    const button = event.target.closest('[data-conflict-action]');
    const state = button && Game._getState?.();
    if (!button || !state) return false;
    const action = button.dataset.conflictAction;
    let result = null;
    if (action === 'confront') result = Actions.confront(state, button.dataset.partnerId);
    if (action === 'reconcile') result = Actions.reconcile(state, button.dataset.partnerId);
    if (action === 'divorce') {
      result = root.confirm('确定离婚吗？财产将按婚龄、责任和子女情况结算。')
        ? Actions.divorce(state, button.dataset.partnerId)
        : { ok: false, message: '取消了离婚' };
    }
    finish(result);
    return true;
  }

  function renderDecision(state) {
    const decision = state.pendingDecision;
    if (decision?.type !== 'familyConflict') return null;
    return {
      title: decision.title || '家庭冲突',
      text: decision.text || '需要决定如何处理当前矛盾。',
      options: decision.options || [],
    };
  }

  Game.familyConflict = Object.freeze({
    ensure: Core.ensure,
    addSuspicion: Core.addSuspicion,
    recordEvidence: Core.recordEvidence,
    confront: Actions.confront,
    divorce: Actions.divorce,
    reconcile: Actions.reconcile,
    monthly,
    render,
    handleClick,
    renderDecision,
    resolve: Actions.resolve,
    resolveDecision: Actions.resolve,
  });
}(window));
