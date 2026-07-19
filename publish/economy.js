(function initEconomy(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function spend(state, amount) {
    const cost = Math.max(0, Math.round(Number(amount) || 0));
    state.money -= cost;
    return cost;
  }

  function debtText(state) {
    return state.money < 0
      ? `，当前负债 ${Game.worldCulture.format(Math.abs(state.money), state.location.country)}` : '';
  }

  function message(state, text) {
    return `${text}${debtText(state)}`;
  }

  Game.economy = Object.freeze({ spend, debtText, message });
}(window));
