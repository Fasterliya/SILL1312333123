(function initEducationPlanView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function renderDecision(state) {
    const model = Game.educationStudyPlan.decisionModel(state);
    if (!model) return '';
    const rows = model.rows.map((row) => `<div class="semester-plan-row">
      <div><strong>${escape(row.label)}</strong><small>${escape(row.hint)}</small></div>
      <button type="button" data-plan-adjust="-1" data-plan-key="${escape(row.key)}"
        aria-label="减少${escape(row.label)}">−</button>
      <b>${row.count}</b>
      <button type="button" data-plan-adjust="1" data-plan-key="${escape(row.key)}"
        aria-label="增加${escape(row.label)}">＋</button></div>`).join('');
    return `<div class="semester-plan-meter"><span>已分配</span>
      <strong>${model.used}/${Game.educationStudyPlan.SLOT_COUNT}格</strong></div>
      <div class="semester-plan-list">${rows}</div>
      <button class="semester-plan-confirm" data-choice="semester-plan-confirm"
        ${model.used === Game.educationStudyPlan.SLOT_COUNT ? '' : 'disabled'}>确认本学期计划</button>`;
  }

  function restoreControl(key, delta, scrollTop) {
    root.requestAnimationFrame(() => {
      const list = document.querySelector('.semester-plan-list');
      if (list) list.scrollTop = scrollTop;
      const next = Array.from(document.querySelectorAll('[data-plan-adjust]')).find((item) => (
        item.dataset.planKey === key && Number(item.dataset.planAdjust) === delta
      ));
      next?.focus({ preventScroll: true });
    });
  }

  function handleClick(event) {
    const button = event.target.closest('[data-plan-adjust]');
    if (!button) return false;
    const state = Game._getState?.();
    if (!state) return false;
    const key = button.dataset.planKey;
    const delta = Number(button.dataset.planAdjust);
    const scrollTop = button.closest('.semester-plan-list')?.scrollTop || 0;
    Game.educationStudyPlan.adjust(state, key, delta);
    Game.actions.renderDecision();
    restoreControl(key, delta, scrollTop);
    return true;
  }

  Game.educationPlanView = Object.freeze({ renderDecision, handleClick });
}(window));
