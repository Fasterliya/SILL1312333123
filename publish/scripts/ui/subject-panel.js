(function initSubjectPanel(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const STAGE_SUBJECTS = {
    primary: { 语文: 100, 数学: 100, 英语: 100, 科学: 100 },
    middle: { 语文: 130, 数学: 130, 英语: 130, 政治: 50, 历史: 50, 物理: 100, 化学: 100 },
    high: { 语文: 150, 数学: 150, 英语: 150 },
    vocational: { 语文: 100, 数学: 100, 英语: 100, 专业技能: 150 },
    university: { 专业核心: 100, 通识课程: 100, 外语: 100, 毕业论文: 100 },
  };

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function isStudent(state) {
    return ['primary', 'middle', 'high', 'vocational', 'university']
      .includes(state.education.schoolStage);
  }

  function getStageSubjects(state) {
    const stage = state.education.schoolStage;
    const map = { ...(STAGE_SUBJECTS[stage] || {}) };
    if (stage === 'high') {
      if (['物理', '历史'].includes(state.education.track)) map[state.education.track] = 100;
      (state.education.electives || []).forEach((subject) => {
        if (subject) map[subject] = 100;
      });
    }
    return map;
  }

  function subjectHash(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function ensureSubjects(state) {
    state.education.subjects = state.education.subjects
      && typeof state.education.subjects === 'object' ? state.education.subjects : {};
    Object.keys(getStageSubjects(state)).forEach((subject) => {
      const current = state.education.subjects[subject] || {};
      current.studyHours = Math.max(0, Math.min(200, Number(current.studyHours) || 0));
      current.examScore = Math.max(0, Number(current.examScore) || 0);
      current.aptitude = Number(current.aptitude)
        || 34 + (subjectHash(subject + state.name) % 54);
      state.education.subjects[subject] = current;
    });
  }

  function scheduleChips(state, allocation) {
    const labels = { rest: '休息', club: '社团', tutor: '补习' };
    return Object.entries(allocation || {}).filter(([, count]) => count > 0)
      .map(([key, count]) => `<span>${escape(labels[key] || key)} ×${count}</span>`).join('');
  }

  function renderSubjects(state, allocation) {
    ensureSubjects(state);
    return `<div class="subject-grid">${Object.entries(getStageSubjects(state)).map(([subject, cap]) => {
      const data = state.education.subjects[subject];
      const range = Game.subjectEducation?.predictedRange(state, subject, cap) || [0, 0];
      const slots = allocation?.[subject] || 0;
      return `<article class="subject-card ${slots ? 'plan-focus' : ''}">
        <div class="subject-copy"><div class="subject-name">${escape(subject)}
          <span class="subject-max">${cap}分</span></div>
          <small>天赋 ${data.aptitude} · 计划 ${slots}格</small></div>
        <strong class="subject-forecast">${range[0]}–${range[1]}</strong>
        <div class="progress-bar"><i style="width:${Math.min(100, data.studyHours / 2)}%"></i>
          <span>${data.studyHours}h · 上次 ${data.examScore}分</span></div></article>`;
    }).join('')}</div>`;
  }

  function renderQuick(state) {
    if (!isStudent(state)) return '';
    const plan = Game.educationStudyPlan.status(state);
    return `<div class="quick-study subject-study"><header><div><strong>本学期课表</strong>
      <small>${escape(plan.label)} · 已执行${plan.months}个月</small></div>
      <span>疲劳 ${Math.round(state.education.burnout || 0)}/100</span></header>
      <div class="semester-schedule">${scheduleChips(state, plan.allocation)
        || '<span>等待分配6个时间格</span>'}</div>
      ${renderSubjects(state, plan.allocation)}
      <button class="study-plan-edit" type="button" data-study-plan-edit
        ${plan.canAdjust ? '' : 'disabled'}>${plan.canAdjust ? '调整本学期计划' : '本学期已调整'}</button></div>`;
  }

  function render(state) {
    if (!isStudent(state)) return '';
    const plan = Game.educationStudyPlan.status(state);
    return `<section class="semester-detail"><strong>${escape(plan.label)}</strong>
      <span>${scheduleChips(state, plan.allocation) || '尚未制定课表'}</span></section>
      ${renderSubjects(state, plan.allocation)}`;
  }

  function handleClick(event) {
    if (!event.target.closest('[data-study-plan-edit]')) return false;
    const state = Game._getState?.();
    if (!state) return false;
    const result = Game.educationStudyPlan.requestAdjustment(state);
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    if (result.ok) {
      Game._refresh?.();
      Game._save?.();
    }
    return true;
  }

  Game.subjectPanel = Object.freeze({
    getStageSubjects,
    isStudent,
    ensureSubjects,
    render,
    renderQuick,
    handleClick,
  });
}(window));
