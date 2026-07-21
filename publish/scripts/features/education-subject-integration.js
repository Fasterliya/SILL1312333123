(function initEducationSubjectIntegration(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const legacy = Game.educationSystem;

  function subjectReadiness(state, subject) {
    Game.subjectPanel.ensureSubjects(state);
    const data = state.education.subjects[subject] || {};
    const hours = U.clamp(Number(data.studyHours) || 0, 0, 200);
    const aptitude = U.clamp(Number(data.aptitude) || 0, 0, 100);
    const burnout = U.clamp(Number(state.education.burnout) || 0, 0, 100);
    return U.clamp(Math.sqrt(hours / 200) * 60 + aptitude * 0.2
      + Game.characterAttributes.playerValue(state, '学识') * 0.1 - burnout * 0.15, 0, 100);
  }

  function readiness(state) {
    const subjects = Object.keys(Game.subjectPanel.getStageSubjects(state));
    if (!subjects.length) return legacy.readiness(state);
    const total = subjects.reduce((sum, subject) => sum + subjectReadiness(state, subject), 0);
    return U.clamp(total / subjects.length, 0, 100);
  }

  function aptitude(state, subject) {
    return Game.subjectPanel.aptitude(state, subject);
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
    const stageDifficulty = {
      primary: 0.02, middle: 0.05, high: 0.08, vocational: 0.07, university: 0.07,
    }[state.education.schoolStage] || 0.05;
    const difficulty = paper?.penalty ?? stageDifficulty;
    const debuff = U.clamp(Number(state.education._examDebuff) || 0, 0, 0.3);
    const scores = {};
    Object.entries(subjects).forEach(([subject, cap]) => {
      const data = state.education.subjects[subject] || { studyHours: 0, aptitude: 40 };
      const knowledge = Math.sqrt(U.clamp(Number(data.studyHours) || 0, 0, 200) / 200);
      const aptitude = U.clamp(Number(data.aptitude) || 40, 0, 100) / 100;
      const condition = (state.stats.健康 || 0) / 100 * 0.03
        + (state.stats.心情 || 0) / 100 * 0.025
        + U.clamp((state.health.sleep || 7) / 8, 0.5, 1.1) * 0.025;
      const school = Game.schoolLines.cityResource(state.location.city) / 100;
      const technique = U.clamp(Number(state.education.examTechnique) || 20, 0, 100) / 100;
      const random = (U.between(-10, 10) + U.between(-8, 8)) / 200;
      const rate = U.clamp(0.18 + knowledge * 0.38 + aptitude * 0.14
        + Game.characterAttributes.playerValue(state, '学识') / 100 * 0.08 + condition + school * 0.05
        + technique * 0.04 - debuff - difficulty + random, 0.15, 0.95);
      scores[subject] = U.clamp(Math.round(cap * rate), 0, cap);
    });
    const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const maximum = Object.values(subjects).reduce((sum, value) => sum + value, 0);
    state.education._examDebuff = 0;
    return {
      label, age: U.age(state), scores, total, maximum,
      paperDifficulty: paper?.label || null,
      paperDifficultyIndex: paper?.difficulty || null,
      subjectCaps: { ...subjects }, readiness: Math.round(readiness(state)),
      date: `${state.year}.${state.month}`,
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
      state.education.subjects[subject].examCap = result.subjectCaps?.[subject]
        || Game.subjectPanel.getStageSubjects(state)[subject] || 100;
      state.education.subjects[subject].studyHours = Math.round(
        (state.education.subjects[subject].studyHours || 0) * 0.62,
      );
    });
    item.exams.unshift(result);
    item.exams = item.exams.slice(0, 12);
    state.education.examScore = result.maximum
      ? Math.round(result.total / result.maximum * 100) : 0;
    state.education.burnout = U.clamp((state.education.burnout || 0) - 8, 0, 100);
  }

  function addPreparation(state, amount) {
    Game.subjectPanel.ensureSubjects(state);
    const subjects = Object.keys(Game.subjectPanel.getStageSubjects(state));
    subjects.forEach((subject) => {
      state.education.subjects[subject].studyHours = Math.min(200,
        state.education.subjects[subject].studyHours + Math.max(1, Math.round(amount * 0.6)));
    });
    syncLegacy(state);
  }

  function act(state, type) {
    const result = legacy.act(state, type);
    if (!result?.ok || type === 'dropout') return result;
    const gains = { foundation: 6, weakness: 8, mock: 5, tutor: 10, balance: 3 };
    const multiplier = result.actionResolution?.multiplier || 1;
    addPreparation(state, (gains[type] || 4) * multiplier);
    return {
      ...result,
      message: result.message.replace(/备考度达到 \d+/, `备考度达到 ${Math.round(readiness(state))}`),
    };
  }

  function monthly(state) {
    legacy.monthly(state);
    if (!Game.subjectPanel.isStudent(state)) return;
    Game.educationStudyPlan.ensureSemester(state);
    Game.educationStudyPlan.applyMonth(state);
    const recovery = state.health.sleep >= 8 ? 3 : 1;
    state.education.burnout = U.clamp((state.education.burnout || 0) - recovery, 0, 100);
    syncLegacy(state);
    Game.educationExamPrep.maybeTrigger(state);
  }

  function predictedRange(state, subject, cap) {
    Game.subjectPanel.ensureSubjects(state);
    const data = state.education.subjects[subject] || {};
    const knowledge = Math.sqrt(U.clamp(Number(data.studyHours) || 0, 0, 200) / 200);
    const aptitude = U.clamp(Number(data.aptitude) || 40, 0, 100) / 100;
    const school = Game.schoolLines.cityResource(state.location.city) / 100;
    const base = U.clamp(0.18 + knowledge * 0.38 + aptitude * 0.14
      + Game.characterAttributes.playerValue(state, '学识') / 100 * 0.08 + school * 0.05 - 0.05, 0.15, 0.9);
    return [Math.round(cap * U.clamp(base - 0.07, 0.15, 0.95)),
      Math.round(cap * U.clamp(base + 0.07, 0.15, 0.95))];
  }

  function render(state) {
    if (!Game.subjectPanel.isStudent(state)) return legacy.render(state);
    const item = syncLegacy(state);
    const latest = item.exams[0];
    const scores = latest ? Object.entries(latest.scores).map(([name, score]) => (
      `<span>${name}<b>${score}/${latest.subjectCaps?.[name]
        || Game.subjectPanel.getStageSubjects(state)[name] || 100}</b></span>`
    )).join('') : '<p class="empty-state">成绩公布后会显示各科分数。</p>';
    return `<section class="study-summary"><div><span>${Game.content.gradeLabel(state)}</span>
      <strong>${state.education.school}</strong><small>${state.education.path || '全日制学习'}</small></div>
      <dl><div><dt>科目掌握度</dt><dd>${Math.round(readiness(state))}</dd></div>
      <div><dt>学习疲劳</dt><dd>${Math.round(state.education.burnout || 0)}</dd></div>
      <div><dt>睡眠时长</dt><dd>${state.health.sleep || 0}小时</dd></div>
      <div><dt>得分率</dt><dd>${state.education.examScore ? `${state.education.examScore}%` : '待公布'}</dd></div></dl></section>
      <h3>${latest ? `${latest.label} · ${latest.total}/${latest.maximum}` : '考试成绩'}</h3>
      <div class="score-grid">${scores}</div>${Game.schoolLines.render(state)}
      <div class="study-actions"><button data-education-action="dropout" class="danger">辍学</button></div>`;
  }

  Game.educationSystem = Object.freeze({
    ...legacy,
    aptitude,
    readiness,
    addPreparation,
    act,
    exam,
    monthly,
    render,
    renderQuick: (state) => Game.subjectPanel.renderQuick(state),
  });
  Game.subjectEducation = Object.freeze({ subjectReadiness, applyResult, predictedRange });
}(window));
