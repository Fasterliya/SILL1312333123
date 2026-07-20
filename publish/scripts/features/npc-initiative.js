(function initNpcInitiative(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.npcInitiativeCore;
  const View = Game.npcInitiativeView;

  function generators() {
    return [
      ...Game.npcInitiativeSocialGenerators.list,
      ...Game.npcInitiativeRiskGenerators.list,
    ];
  }

  function paySupport(state) {
    Core.ensure(state).supportAgreements.forEach((agreement) => {
      if (!agreement.active || agreement.lastPaidMonth === state.totalMonths) return;
      state.money -= agreement.amount;
      agreement.lastPaidMonth = state.totalMonths;
    });
  }

  function monthly(state) {
    const events = Core.ensure(state);
    paySupport(state);
    if (events.frequency === 'off'
        || state.pendingDecision
        || state.gameOver
        || events._lastGeneratedMonth === state.totalMonths) return;
    events._lastGeneratedMonth = state.totalMonths;
    const count = Core.eventCount(state);
    if (!count) return;
    const candidates = generators().map((generate) => {
      try {
        return generate(state);
      } catch (error) {
        console.error('NPC事件生成失败:', error.message, error.stack);
        return null;
      }
    }).filter(Boolean);
    candidates.sort(() => Math.random() - 0.5)
      .slice(0, Math.min(count, candidates.length))
      .forEach((event) => Core.enqueue(state, event));
  }

  function riskEffect(state, event, action) {
    const effects = Game.npcInitiativeRiskEffects;
    if (event.type === 'revenge') return effects.revenge(state, event, action);
    if (event.type === 'corrupted_seduction') return effects.seduction(state, event, action);
    if (event.type === 'pregnancy_notice') return effects.pregnancy(state, event, action);
    if (event.type === 'rumor_spread') return effects.rumor(state, event, action);
    return null;
  }

  function resolveEvent(state, eventId, optionIndex) {
    const queue = Core.ensure(state).queue;
    const event = queue.find((item) => item.id === eventId);
    const option = event?.options?.[Number(optionIndex)];
    if (!event) return { ok: false, message: '事件已失效' };
    if (!option) return { ok: false, message: '选项无效' };
    const result = Game.npcInitiativeSocialEffects.resolve(state, event, option.action)
      || riskEffect(state, event, option.action)
      || Game.npcInitiativeTraumaEffects.resolve(state, event, option.action)
      || { ok: false, message: '事件处理器不可用' };
    if (result.ok) Core.takeEvent(state, eventId);
    return result;
  }

  function openSheet(state) {
    const current = state || Game._getState?.();
    if (!current || !Core.ensure(current).queue.length) return false;
    current.npcEvents.active = true;
    View.refresh(current);
    return true;
  }

  function closeSheet(state) {
    Core.ensure(state).active = false;
    View.refresh(state);
  }

  function finish(state, result) {
    if (!Core.ensure(state).queue.length) state.npcEvents.active = false;
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    Game._refresh?.();
    Game._save?.();
  }

  function handleClick(event) {
    const state = Game._getState?.();
    if (!state) return false;
    if (event.target.closest('[data-npc-event-open]')) {
      openSheet(state);
      return true;
    }
    if (event.target.closest('[data-npc-event-close]')) {
      closeSheet(state);
      return true;
    }
    const option = event.target.closest('[data-npc-event-option]');
    if (!option) return false;
    const result = resolveEvent(
      state,
      option.dataset.npcEventId,
      Number(option.dataset.npcEventOption),
    );
    finish(state, result);
    return true;
  }

  function getNextEvent(state) {
    const event = Core.ensure(state).queue[0];
    return event ? Core.takeEvent(state, event.id) : null;
  }

  function render(state) {
    return View.render(state);
  }

  function handleSheetOption(eventId, optionIndex) {
    const state = Game._getState?.();
    if (!state) return;
    finish(state, resolveEvent(state, eventId, optionIndex));
  }

  Game.npcInitiative = Object.freeze({
    ensure: Core.ensure,
    monthly,
    getNextEvent,
    peekEvent: (state) => Core.ensure(state).queue[0] || null,
    render,
    renderEventBadge: render,
    renderEventSheet: render,
    changeFrequency: Core.changeFrequency,
    resolveEvent,
    handleClick,
    handleSheetOption,
    openSheet,
    insertEventSheet: openSheet,
    refreshBadge: View.refresh,
    recordBrothelVisit: Core.recordBrothelVisit,
    setStateRef() {},
    getRef: () => Game._getState?.() || null,
  });
}(window));
