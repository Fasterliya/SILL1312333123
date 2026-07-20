(function initTravelInteractions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let handling = false;

  function notify(result, successTone) {
    const resolved = result && typeof result.ok === 'boolean'
      ? result : { ok: false, message: '旅途操作未能完成' };
    Game._refresh?.();
    Promise.resolve(Game._save?.()).catch((err) => {
      console.error('旅途存档失败:', err?.message, err?.stack);
    });
    Game.view?.showToast?.(resolved.message || '旅途状态已更新',
      resolved.ok ? (resolved.finished ? 'good' : (successTone || 'normal')) : 'warning');
  }

  function run(button, action, tone) {
    if (handling || button.disabled) return true;
    handling = true;
    button.disabled = true;
    try {
      notify(action(), tone);
    } catch (err) {
      console.error('旅途交互失败:', err?.message, err?.stack);
      notify({ ok: false, message: '旅途操作出错，请刷新后重试' });
    } finally {
      handling = false;
    }
    return true;
  }

  function handleClick(event) {
    const target = event?.target;
    if (!target || typeof target.closest !== 'function') return false;
    const filterBtn = target.closest('[data-travel-filter]');
    if (filterBtn) {
      Game.travelSystem?.setFilter(filterBtn.dataset.travelFilter);
      Game._refresh?.();
      return true;
    }
    const choiceBtn = target.closest('[data-travel-choice]');
    if (choiceBtn) {
      const state = Game._getState?.();
      if (!state?.travel?.activeStage) return true;
      return run(choiceBtn, () => Game.travelSystem.chooseStage(
        state, choiceBtn.dataset.travelChoice));
    }
    const startBtn = target.closest('[data-travel-start]');
    if (startBtn) {
      const state = Game._getState?.();
      if (!state) return true;
      return run(startBtn, () => Game.travelSystem.roam(
        state, startBtn.dataset.travelStart), 'good');
    }
    return false;
  }

  Game.travelInteractions = Object.freeze({ handleClick });
}(window));
