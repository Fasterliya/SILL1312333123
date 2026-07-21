(function initEducationStudyPlan(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const plans = Object.freeze({
    balanced: '均衡',
    weakness: '补弱',
    strength: '强项',
  });

  function ensure(state) {
    const education = state.education;
    if (!plans[education.studyPlan]) education.studyPlan = 'balanced';
    if (!education.lastAutoStudy || typeof education.lastAutoStudy !== 'object') {
      education.lastAutoStudy = null;
    }
    return education.studyPlan;
  }

  function score(data) {
    const hours = U.clamp(Number(data.studyHours) || 0, 0, 240);
    const aptitude = U.clamp(Number(data.aptitude) || 0, 0, 100);
    return hours / 240 * 70 + aptitude * 0.3;
  }

  function targets(state) {
    const plan = ensure(state);
    Game.subjectPanel.ensureSubjects(state);
    const subjects = Object.keys(Game.subjectPanel.getStageSubjects(state));
    if (plan === 'balanced') return subjects;
    const ranked = subjects.slice().sort((left, right) => {
      const leftData = state.education.subjects[left] || {};
      const rightData = state.education.subjects[right] || {};
      if (plan === 'strength') {
        return (Number(rightData.aptitude) || 0) - (Number(leftData.aptitude) || 0);
      }
      return score(leftData) - score(rightData);
    });
    return ranked.slice(0, Math.min(2, ranked.length));
  }

  function set(state, plan) {
    if (!plans[plan]) return { ok: false, message: '没有这个学习策略' };
    state.education.studyPlan = plan;
    return { ok: true, message: `学习策略已设为${plans[plan]}，之后每月自动执行` };
  }

  function applyMonthly(state) {
    if (!Game.subjectPanel.isStudent(state)) return null;
    const plan = ensure(state);
    Game.subjectPanel.ensureSubjects(state);
    const focus = new Set(targets(state));
    let total = 0;
    Object.keys(Game.subjectPanel.getStageSubjects(state)).forEach((subject) => {
      const data = state.education.subjects[subject];
      const aptitude = U.clamp(Number(data.aptitude) || 0, 0, 100);
      const base = 5 + Math.round(aptitude / 28);
      const bonus = focus.has(subject) ? (plan === 'balanced' ? 1 : 4) : 0;
      const gain = Math.max(3, base + bonus);
      const previous = U.clamp(Number(data.studyHours) || 0, 0, 240);
      data.studyHours = Math.min(240, previous + gain);
      total += data.studyHours - previous;
    });
    state.education.lastAutoStudy = {
      month: state.totalMonths,
      plan,
      total,
    };
    return state.education.lastAutoStudy;
  }

  function status(state) {
    const plan = ensure(state);
    const record = state.education.lastAutoStudy;
    return {
      plan,
      label: plans[plan],
      text: record?.month === state.totalMonths
        ? `本月自动 +${record.total}h`
        : '下月自动执行',
    };
  }

  Game.educationStudyPlan = Object.freeze({
    plans,
    ensure,
    targets,
    set,
    applyMonthly,
    status,
  });
}(window));
