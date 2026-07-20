(function initUndergroundIdol(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.undergroundIdolCore;
  const Shows = Game.undergroundIdolShows;
  const Decisions = Game.undergroundIdolDecisions;
  const Fall = Game.undergroundIdolFall;
  const Career = Game.undergroundIdolCareer;

  function actionResult(state, button) {
    const action = button.dataset.ugAction;
    if (action === 'train') return Shows.train(state, button.dataset.ugSkill);
    if (action === 'monthlyShow') return Shows.monthlyShow(state);
    if (action === 'specialShow') return Shows.specialShow(state);
    if (action === 'castingCouch') return Decisions.castingCouch(state);
    if (action === 'acceptDecision') return Decisions.resolveDecision(state, true);
    if (action === 'rejectDecision') return Decisions.resolveDecision(state, false);
    if (action === 'tryPromotion') return Career.tryPromotion(state);
    return null;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-ug-action], [data-ug-tab]');
    if (!button) return false;
    const state = Game._getState?.();
    if (!state) return false;
    if (button.dataset.ugTab) {
      state._ugTab = button.dataset.ugTab;
      Game._refresh();
      return true;
    }
    const result = actionResult(state, button);
    if (result) {
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    return true;
  }

  Game.undergroundIdol = Object.freeze({
    ensure: Core.ensure,
    initializeEntry: Core.initializeEntry,
    isUndergroundIdol: Core.isUndergroundIdol,
    updateStage: Core.updateStage,
    groupMonthly: Core.groupMonthly,
    train: Shows.train,
    monthlyShow: Shows.monthlyShow,
    specialShow: Shows.specialShow,
    castingCouch: Decisions.castingCouch,
    resolveDecision: Decisions.resolveDecision,
    fallCheck: Fall.fallCheck,
    tryPromotion: Career.tryPromotion,
    monthly: Game.undergroundIdolMonthly.monthly,
    render: Game.undergroundIdolView.render,
    handleClick,
  });
}(window));
