(function initTimeSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;

  function ageMonths(state) {
    return Math.max(0, state.totalMonths - Game.hunterMode.identity(state).birthMonth);
  }

  function syncCalendar(state) {
    const offset = C.startMonth - 1 + state.totalMonths;
    state.year = C.startYear + Math.floor(offset / 12);
    state.month = offset % 12 + 1;
  }

  function educationElapsed(state) {
    if (!Number.isFinite(state.education.enrolledAt)) return 0;
    return Math.max(0, state.totalMonths - state.education.enrolledAt);
  }

  function stageLabel(state) {
    if (state.health?.retired) return '退休生活';
    if (['highSchool', 'track', 'volunteer', 'vocationalExit'].includes(state.pendingDecision?.type)) {
      return '升学选择';
    }
    const labels = {
      primary: '小学', middle: '初中', high: '高中', vocational: '职业高中',
      university: '大学', workforce: '职业起步', graduate: '职场人生',
    };
    return labels[state.education.schoolStage] || Game.content.stage(Game.content.age(state)).name;
  }

  Game.timeSystem = Object.freeze({ ageMonths, syncCalendar, educationElapsed, stageLabel, dayOfMonth: function(s) { return s.day || 1; }, daysRemaining: function(s) { return 30 - (s.day || 1); } });
}(window));
