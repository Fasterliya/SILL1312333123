(function initTimeLoop(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const SPEED_MS = { 0: 0, 1: 1000, 5: 200, 10: 100, 30: 33, 90: 11 };
  let api = null;
  let timer = null;
  let renderTicks = 0;

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
      if (current.education.fastForwardTarget
        && current.totalMonths >= current.education.fastForwardTarget) {
        Game.educationFastForward.complete(current);
      }
    }
    if (Game.examSystem?.checkReveal(current)) shouldSave = true;
    if (current.pendingDecision || current.gameOver) {
      current.timeSpeed = 0;
      startTimer();
      shouldSave = true;
    }
    const renderStride = current.timeSpeed >= 90 ? 3 : (current.timeSpeed >= 30 ? 2 : 1);
    renderTicks += 1;
    if (shouldSave || current.pendingDecision || renderTicks % renderStride === 0) api.refresh();
    if (shouldSave) api.save();
  }

  function startTimer() {
    if (timer) root.clearInterval(timer);
    timer = null;
    renderTicks = 0;
    const current = state();
    if (!current || current.gameOver || current.pendingDecision || !current.timeSpeed) return;
    timer = root.setInterval(tickDay, SPEED_MS[current.timeSpeed] || SPEED_MS[1]);
  }

  function setSpeed(speed) {
    const current = state();
    if (!current || current.gameOver) return;
    current.timeSpeed = current.pendingDecision ? 0 : Number(speed) || 0;
    startTimer();
    api.refresh();
  }

  function start() {
    startTimer();
  }

  function resumeEducation() {
    if (Game.educationFastForward.active(state())) setSpeed(10);
  }

  function startEducationFastForward() {
    const current = state();
    if (!current || current.pendingDecision || current.gameOver) return;
    if (!Game.educationFastForward.active(current)) {
      const months = Game.educationFastForward.begin(current);
      if (!months) return Game.view.showToast('当前没有可推进的升学节点', 'warning');
      Game.view.showToast('已开启自动学习推进', 'good');
      api.save();
    }
    setSpeed(10);
  }

  function configure(options) {
    api = options;
  }

  Game.timeLoop = Object.freeze({
    configure,
    start,
    setSpeed,
    resumeEducation,
    startEducationFastForward,
  });
}(window));
