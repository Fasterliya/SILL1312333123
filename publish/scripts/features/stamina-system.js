(function initStaminaSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- state ---- */

  function ensure(state) {
    state.stamina = state.stamina && typeof state.stamina === 'object' ? state.stamina : {
      current: 100,
      max: 100,
    };
    state.stamina.current = Number.isFinite(state.stamina.current) ? state.stamina.current : 100;
    state.stamina.max = Number.isFinite(state.stamina.max) ? state.stamina.max : 100;
    return state.stamina;
  }

  /* ---- actions ---- */

  function spend(state, amount) {
    ensure(state);
    const cost = Math.max(0, Math.round(amount));
    const { current, max } = state.stamina;
    if (current < cost) {
      return { ok: false, message: '体力不足(' + current + '/' + max + ')，等待下月回复' };
    }
    state.stamina.current = Math.max(0, current - cost);
    return { ok: true, message: '消耗体力' + cost, remaining: state.stamina.current };
  }

  function canAct(state, amount) {
    ensure(state);
    return state.stamina.current >= amount;
  }

  /* ---- render ---- */

  function render(state) {
    ensure(state);
    const { current, max } = state.stamina;
    const percent = Math.round((current / max) * 100);
    return { current, max, percent };
  }

  /* ---- events ---- */

  function handleClick(event) {
    return false;
  }

  Game.staminaSystem = Object.freeze({ ensure, spend, canAct, render, handleClick });
}(window));
