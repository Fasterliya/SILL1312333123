(function initEducationFastForward(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const MIDDLE_EXAM_EVE = 15 * 12 - 1;
  const HIGH_EXAM_EVE = 18 * 12 - 1;

  function nextTarget(state) {
    const ageMonths = Game.timeSystem.ageMonths(state);
    const stage = state.education.schoolStage;
    if (ageMonths >= 18 * 12) return null;
    if (['primary', 'middle'].includes(stage) && ageMonths < MIDDLE_EXAM_EVE) {
      return {
        totalMonth: state.totalMonths + MIDDLE_EXAM_EVE - ageMonths,
        label: '中考前1个月',
      };
    }
    if (['high', 'vocational'].includes(stage) && ageMonths < HIGH_EXAM_EVE) {
      return {
        totalMonth: state.totalMonths + HIGH_EXAM_EVE - ageMonths,
        label: stage === 'vocational' ? '毕业选择前1个月' : '高考前1个月',
      };
    }
    return null;
  }

  function begin(state) {
    const target = nextTarget(state);
    if (!target || state.pendingDecision || state.gameOver) return 0;
    state.education.fastForwardTarget = target.totalMonth;
    return Math.max(0, target.totalMonth - state.totalMonths);
  }

  function remaining(state) {
    const target = Number(state.education.fastForwardTarget);
    if (!Number.isFinite(target) || state.pendingDecision || state.gameOver) return 0;
    return Math.max(0, target - state.totalMonths);
  }

  function complete(state) {
    const target = Number(state.education.fastForwardTarget);
    if (Number.isFinite(target) && state.totalMonths >= target) {
      delete state.education.fastForwardTarget;
    }
  }

  function active(state) {
    return Number.isFinite(Number(state.education.fastForwardTarget))
      && state.totalMonths < Number(state.education.fastForwardTarget);
  }

  async function run(state, onProgress) {
    let advanced = 0;
    while (remaining(state) > 0 && !state.pendingDecision && !state.gameOver) {
      const result = Game.lifeDirector.advance(state, Math.min(12, remaining(state)));
      advanced += result.advanced;
      complete(state);
      onProgress?.();
      if (result.interrupted) break;
      await new Promise((resolve) => root.setTimeout(resolve, 0));
    }
    return advanced;
  }

  function updateButton(state, button) {
    const target = nextTarget(state);
    button.hidden = !target || Game.content.age(state) >= 18;
    if (!target) return;
    button.disabled = Boolean(state.pendingDecision || state.gameOver);
    button.querySelector('span').textContent = state.education.focus || '均衡基础';
    button.querySelector('strong').textContent = `推进至${target.label}`;
  }

  Game.educationFastForward = Object.freeze({
    begin, remaining, complete, active, run, updateButton,
  });
}(window));
