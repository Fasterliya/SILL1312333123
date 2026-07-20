(function initTaskCenter(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function ensure(state) {
    state.taskCenter = state.taskCenter && typeof state.taskCenter === 'object'
      ? state.taskCenter : {};
    state.taskCenter.items = Array.isArray(state.taskCenter.items)
      ? state.taskCenter.items.slice(-30) : [];
    state.taskCenter.open = Boolean(state.taskCenter.open);
    state.taskCenter.decisionOpen = Boolean(state.taskCenter.decisionOpen);
    return state.taskCenter;
  }

  function add(state, input) {
    const center = ensure(state);
    const key = input.key || `${input.type || 'notice'}-${state.totalMonths}-${input.title}`;
    if (center.items.some((item) => item.key === key)) return false;
    center.items.push({
      key,
      type: input.type || 'notice',
      title: input.title || '待处理事件',
      text: input.text || '',
      month: Number.isFinite(input.month) ? input.month : state.totalMonths,
    });
    center.items = center.items.slice(-30);
    return true;
  }

  function decisionTitle(state) {
    const decision = state.pendingDecision;
    if (!decision) return '';
    const system = Game.systemDecisions?.content(state);
    if (system?.title) return system.title;
    if (decision.type === 'lifeEvent') return Game.lifeEvents?.render(state)?.title || '人生事件';
    if (decision.type === 'succession') return '选择下一代角色';
    const labels = {
      highSchool: '中考志愿填报',
      track: '高中选科',
      volunteer: '高考志愿填报',
      vocationalExit: '职高毕业去向',
      idolTransition: '偶像毕业转型',
      internship: '大学实习选择',
    };
    return decision.title || labels[decision.type] || '关键人生选择';
  }

  function dynamicItems(state) {
    const result = [];
    if (state.pendingDecision) {
      result.push({
        key: 'pending-decision',
        type: 'decision',
        title: decisionTitle(state),
        text: state.pendingDecision.text || '需要完成选择后才能继续推进。',
        month: state.totalMonths,
      });
    }
    const npcQueue = Game.npcInitiativeCore?.ensure(state).queue || [];
    npcQueue.forEach((event) => {
      result.push({
        key: event.id,
        type: 'npc',
        title: event.title || 'NPC主动事件',
        text: event.text || '有人正在等待你的回应。',
        month: Number.isFinite(event.month) ? event.month : state.totalMonths,
      });
    });
    const underground = state.undergroundIdol?._pendingDecision;
    if (underground) {
      result.push({
        key: 'underground-decision',
        type: 'underground',
        title: underground.title || '地下偶像邀约',
        text: underground.intro || '职业面板中有一项邀约等待处理。',
        month: underground.month || state.totalMonths,
      });
    }
    const exam = state.examState;
    if (exam?.active) {
      const remaining = Math.max(0, (exam.revealedDay || 0)
        - ((state.totalMonths || 0) * 30 + (state.day || 1)));
      result.push({
        key: 'exam-result-wait',
        type: 'wait',
        title: `${exam.type || '考试'}成绩待公布`,
        text: `预计${remaining || 1}天后公布完整成绩，时间推进后会自动揭晓。`,
        month: state.totalMonths,
      });
    }
    return result;
  }

  function items(state) {
    return [...dynamicItems(state), ...ensure(state).items];
  }

  function renderSheet(state, all) {
    if (!ensure(state).open) return '';
    const rows = all.map((item) => (
      `<article class="task-center-row">
        <div><small>${item.month === state.totalMonths ? '本月' : `第${item.month}月`}</small>
          <strong>${escape(item.title)}</strong><p>${escape(item.text)}</p></div>
        <button type="button" data-task-action="${escape(item.type)}"
          data-task-key="${escape(item.key)}">${item.type === 'notice' ? '确认' : (item.type === 'wait' ? '查看' : '处理')}</button>
      </article>`
    )).join('');
    return `<div class="task-center-overlay" data-task-close></div>
      <section class="task-center-sheet" role="dialog" aria-modal="true"
        aria-labelledby="taskCenterTitle">
        <span class="sheet-handle" aria-hidden="true"></span>
        <header><div><small>事件与选择</small><h2 id="taskCenterTitle">待办事项</h2></div>
          <b>${all.length}项</b></header>
        <div class="task-center-list">${rows || '<p class="empty-state">暂无待办事项。</p>'}</div>
        <button class="task-center-close" type="button" data-task-close>关闭</button>
      </section>`;
  }

  function render(state) {
    const all = items(state);
    return `<button class="task-center-btn" type="button" data-task-open
      aria-label="打开待办事项，${all.length}项">
      <span aria-hidden="true">✉</span>${all.length
        ? `<b>${all.length > 99 ? '99+' : all.length}</b>` : ''}
    </button>${renderSheet(state, all)}`;
  }

  function refresh(state) {
    const host = document.getElementById('npcEventContainer');
    if (host) host.innerHTML = Game.npcInitiativeView.render(state);
  }

  function handleClick(event) {
    const state = Game._getState?.();
    if (!state) return false;
    if (event.target.closest('[data-task-open]')) {
      ensure(state).open = true;
      refresh(state);
      return true;
    }
    if (event.target.closest('[data-task-close]')) {
      ensure(state).open = false;
      refresh(state);
      return true;
    }
    if (event.target.closest('[data-decision-later]')) {
      ensure(state).decisionOpen = false;
      Game.actions.renderDecision();
      return true;
    }
    const button = event.target.closest('[data-task-action]');
    if (!button) return false;
    const type = button.dataset.taskAction;
    if (type === 'notice') {
      ensure(state).items = state.taskCenter.items.filter(
        (item) => item.key !== button.dataset.taskKey,
      );
    } else if (type === 'wait') {
      state.taskCenter.open = false;
      Game.view.showToast('继续推进时间，成绩公布后会自动生成升学待办', 'good');
    } else if (type === 'npc') {
      const queue = Game.npcInitiativeCore.ensure(state).queue;
      const index = queue.findIndex((item) => item.id === button.dataset.taskKey);
      if (index > 0) queue.unshift(queue.splice(index, 1)[0]);
      state.taskCenter.open = false;
      Game.npcInitiative.openSheet(state);
      return true;
    } else if (type === 'underground') {
      state._ugTab = 'career';
      state.taskCenter.open = false;
      Game.view.showToast('地下偶像邀约已定位到职业面板', 'good');
    } else if (type === 'decision') {
      state.taskCenter.open = false;
      Game.actions.renderDecision(true);
    }
    refresh(state);
    Game._save?.();
    return true;
  }

  Game.taskCenter = Object.freeze({
    ensure,
    add,
    items,
    render,
    handleClick,
  });
}(window));
