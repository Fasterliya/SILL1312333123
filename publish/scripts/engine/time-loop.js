(function initTimeLoop(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const SPEED_MS = { 0: 0, 1: 1000, 5: 200, 10: 100, 30: 33, 90: 11 };
  let api = null;
  let timer = null;

  function state() {
    return api?.getState?.() || null;
  }

  function tickDay() {
    const current = state();
    if (!current || current.gameOver || !current.timeSpeed) return;
    if (current.pendingDecision) {
      setSpeed(0);
      return;
    }
    let shouldSave = false;
    current.day += 1;
    if (current.day > 30) {
      current.day = 1;
      Game.lifeDirector.advance(current, 1);
      current.stamina.current = current.stamina.max;
      shouldSave = true;
      Game.examSystem?.checkReveal(current);
    }
    if (current.pendingDecision || current.gameOver) {
      current.timeSpeed = 0;
      startTimer();
      shouldSave = true;
    }
    if (shouldSave) {
      api.refresh();
      api.save();
    } else {
      api.refreshTime?.();
    }
  }

  function startTimer() {
    if (timer) root.clearInterval(timer);
    timer = null;
    const current = state();
    if (!current || current.gameOver || current.pendingDecision || !current.timeSpeed) return;
    timer = root.setInterval(tickDay, SPEED_MS[current.timeSpeed] || SPEED_MS[1]);
  }

  function setSpeed(speed) {
    const current = state();
    if (!current || current.gameOver) return;
    current.timeSpeed = current.pendingDecision ? 0 : Number(speed) || 0;
    startTimer();
    (api.refreshTime || api.refresh)();
  }

  function start() {
    startTimer();
  }

  function configure(options) {
    api = options;
  }

  Game.timeLoop = Object.freeze({
    configure,
    start,
    setSpeed,
  });
}(window));
