(function initEducationSubjectIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const legacy = Game.educationSystem;

  function subjectReadiness(state, subject) {
    Game.subjectPanel.ensureSubjects(state);
    const data = state.education.subjects[subject] || {};
    const hours = U.clamp(Number(data.studyHours) || 0, 0, 240);
    const aptitude = U.clamp(Number(data.aptitude) || 0, 0, 100);
    const burnout = U.clamp(Number(state.education.burnout) || 0, 0, 100);
    return U.clamp(aptitude * 0.35 + hours / 240 * 55
      + (state.stats.智力 || 0) * 0.1 - burnout * 0.18, 0, 100);
  }

  function readiness(state) {
    const subjects = Object.keys(Game.subjectPanel.getStageSubjects(state));
    if (!subjects.length) return legacy.readiness(state);
    const total = subjects.reduce((sum, subject) => sum + subjectReadiness(state, subject), 0);
    return U.clamp(total / subjects.length, 0, 100);
  }

  function syncLegacy(state) {
    const item = legacy.ensure(state);
    const value = readiness(state);
    item.preparation = value;
    item.study = Math.round(value);
    return item;
  }

  function exam(state, label, subjects) {
    Game.subjectPanel.ensureSubjects(state);
    const paper = Game.schoolLines.examProfile(state, label);
    const difficulty = paper?.penalty ?? 0.06;
    const debuff = U.clamp(Number(state.education._examDebuff) || 0, 0, 0.3);
    const burnout = U.clamp(Number(state.education.burnout) || 0, 0, 100);
    const scores = {};
    Object.entries(subjects).forEach(([subject, cap]) => {
      const data = state.education.subjects[subject] || { studyHours: 0, aptitude: 40 };
      const hours = U.clamp(Number(data.studyHours) || 0, 0, 240) / 240;
      const aptitude = U.clamp(Number(data.aptitude) || 40, 0, 100) / 100;
      const condition = (state.stats.健康 || 0) / 100 * 0.05
        + (state.stats.心情 || 0) / 100 * 0.04
        + U.clamp((state.health.sleep || 7) / 8, 0.5, 1.1) * 0.04;
      const random = (U.between(-6, 6) + U.between(-6, 6)) / 200;
      const rate = U.clamp(0.2 + hours * 0.36 + aptitude * 0.22
        + (state.stats.智力 || 0) / 100 * 0.12 + condition
        - burnout / 100 * 0.1 - debuff - difficulty + random, 0.18, 0.96);
      scores[subject] = Math.round(cap * rate);
    });
    const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const maximum = Object.values(subjects).reduce((sum, value) => sum + value, 0);
    state.education._examDebuff = 0;
    return {
      label, age: U.age(state), scores, total, maximum,
      paperDifficulty: paper?.label || null,
      paperDifficultyIndex: paper?.difficulty || null,
      readiness: Math.round(readiness(state)), date: `${state.year}.${state.month}`,
    };
  }

  function applyResult(state, result) {
    const item = legacy.ensure(state);
    Game.subjectPanel.ensureSubjects(state);
    Object.entries(result.scores || {}).forEach(([subject, score]) => {
      if (!state.education.subjects[subject]) {
        state.education.subjects[subject] = { studyHours: 0, aptitude: 40, examScore: 0 };
      }
      state.education.subjects[subject].examScore = score;
      state.education.subjects[subject].studyHours = Math.round(
        (state.education.subjects[subject].studyHours || 0) * 0.88,
      );
    });
    item.exams.unshift(result);
    item.exams = item.exams.slice(0, 12);
    state.education.examScore = result.maximum
      ? Math.round(result.total / result.maximum * 100) : 0;
    state.education.burnout = U.clamp((state.education.burnout || 0) - 12, 0, 100);
  }

  function addPreparation(state, amount) {
    Game.subjectPanel.ensureSubjects(state);
    const subjects = Object.keys(Game.subjectPanel.getStageSubjects(state));
    subjects.forEach((subject) => {
      state.education.subjects[subject].studyHours += Math.max(1, Math.round(amount * 1.5));
    });
    syncLegacy(state);
  }

  function monthly(state) {
    legacy.monthly(state);
    if (!Game.subjectPanel.isStudent(state)) return;
    const recovery = state.health.sleep >= 8 ? 7 : 4;
    state.education.burnout = U.clamp((state.education.burnout || 0) - recovery, 0, 100);
    syncLegacy(state);
  }

  function render(state) {
    if (!Game.subjectPanel.isStudent(state)) return legacy.render(state);
    const item = syncLegacy(state);
    const latest = item.exams[0];
    const scores = latest ? Object.entries(latest.scores).map(([name, score]) => (
      `<span>${name}<b>${score}</b></span>`
    )).join('') : '<p class="empty-state">成绩公布后会显示各科分数。</p>';
    return `<section class="study-summary"><div><span>${Game.content.gradeLabel(state)}</span>
      <strong>${state.education.school}</strong><small>${state.education.path || '全日制学习'}</small></div>
      <dl><div><dt>科目掌握度</dt><dd>${Math.round(readiness(state))}</dd></div>
      <div><dt>学习疲劳</dt><dd>${Math.round(state.education.burnout || 0)}</dd></div>
      <div><dt>睡眠时长</dt><dd>${state.health.sleep || 0}小时</dd></div>
      <div><dt>综合成绩</dt><dd>${state.education.examScore || '待公布'}</dd></div></dl></section>
      <h3>${latest ? `${latest.label} · ${latest.total}/${latest.maximum}` : '考试成绩'}</h3>
      <div class="score-grid">${scores}</div>${Game.schoolLines.render(state)}
      <div class="study-actions"><button data-education-action="dropout" class="danger">辍学</button></div>`;
  }

  Game.educationSystem = Object.freeze({
    ...legacy,
    readiness,
    addPreparation,
    exam,
    monthly,
    render,
    renderQuick: (state) => Game.subjectPanel.renderQuick(state),
  });
  Game.subjectEducation = Object.freeze({ subjectReadiness, applyResult });
}(window));
