(function initTravelInteractions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function notify(result, successTone) {
    Game._refresh();
    Game._save?.();
    if (result.ok) Game.view.showToast(result.message, result.finished ? 'good' : (successTone || 'normal'));
    else Game.view.showToast(result.message, 'warning');
  }

  function handleClick(event) {
    const filterBtn = event.target.closest('[data-travel-filter]');
    if (filterBtn) {
      Game.travelSystem.setFilter(filterBtn.dataset.travelFilter);
      Game._refresh();
      return true;
    }
    const startBtn = event.target.closest('[data-travel-start]');
    if (startBtn) {
      const state = Game._getState?.();
      if (state) notify(Game.travelSystem.roam(state, startBtn.dataset.travelStart), 'good');
      return true;
    }
    const choiceBtn = event.target.closest('[data-travel-choice]');
    if (choiceBtn) {
      const state = Game._getState?.();
      if (state?.travel.activeStage) {
        notify(Game.travelSystem.chooseStage(state, choiceBtn.dataset.travelChoice));
      }
      return true;
    }
    return false;
  }

  Game.travelInteractions = Object.freeze({ handleClick });
}(window));
