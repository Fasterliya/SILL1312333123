(function initCareerHistory(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function ensure(state, backfill = true) {
    state.career.history = Array.isArray(state.career.history)
      ? state.career.history.slice(-60) : [];
    if (backfill && !state.career.history.length && state.career.job) {
      state.career.history.push({
        key: `backfill-hire-${state.career.jobId || state.career.job}`,
        kind: 'hire',
        title: `加入${state.career.company || '当前单位'}`,
        detail: `担任${state.career.job}`,
        company: state.career.company || '',
        salary: Number(state.career.salary) || 0,
        month: Number(state.career.jobStartMonth) || state.totalMonths,
      });
    }
    return state.career.history;
  }

  function add(state, input) {
    const history = ensure(state, false);
    const entry = {
      key: input.key || `${input.kind}-${state.totalMonths}-${input.title}`,
      kind: input.kind || 'career',
      title: input.title || '职业变化',
      detail: input.detail || '',
      company: input.company || state.career.company || '',
      salary: Number(input.salary) || 0,
      month: state.totalMonths,
      year: state.year,
      calendarMonth: state.month,
    };
    if (history.some((item) => item.key === entry.key)) return false;
    history.push(entry);
    state.career.history = history.slice(-60);
    return true;
  }

  function formatDate(entry) {
    if (Number.isFinite(entry.year) && Number.isFinite(entry.calendarMonth)) {
      return `${entry.year}年${entry.calendarMonth}月`;
    }
    return `第${entry.month}月`;
  }

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function render(state) {
    const history = ensure(state).slice().reverse();
    if (!history.length) {
      return '<section class="career-history"><p class="empty-state">尚无入职、晋升或离职记录。</p></section>';
    }
    return `<section class="career-history">${history.map((entry) => (
      `<article class="history-entry"><div><strong>${escape(entry.title)}</strong>
        <span>${escape(entry.company || entry.detail)}</span></div>
        <small>${formatDate(entry)}${entry.salary ? ` · ${Game.view.money(entry.salary)}/月` : ''}</small>
      </article>`
    )).join('')}</section>`;
  }

  Game.careerHistory = Object.freeze({ ensure, add, render });
}(window));
