(function initEducationExamPrep(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  function nextExam(state) {
    if (state.month === 12) return '期末考试';
    if (state.month === 5) return '期中考试';
    return '';
  }

  function maybeTrigger(state) {
    const label = nextExam(state);
    if (!label || state.pendingDecision || !Game.subjectPanel.isStudent(state)) return false;
    const key = `${state.education.schoolStage}:${state.year}-${state.month}`;
    if (state.education.lastExamPrepKey === key) return false;
    state.education.lastExamPrepKey = key;
    state.pendingDecision = { type: 'examPrep', key, label };
    state.timeSpeed = 0;
    return true;
  }

  function weakest(state) {
    Game.subjectPanel.ensureSubjects(state);
    return Object.keys(Game.subjectPanel.getStageSubjects(state)).sort((left, right) => {
      const a = state.education.subjects[left] || {};
      const b = state.education.subjects[right] || {};
      return (a.studyHours || 0) + (a.aptitude || 0) * 0.4
        - (b.studyHours || 0) - (b.aptitude || 0) * 0.4;
    }).slice(0, 2);
  }

  function renderDecision(state) {
    const decision = state.pendingDecision;
    if (decision?.type !== 'examPrep') return null;
    return {
      title: `${decision.label}前最后准备`,
      text: '只剩一个月，选择会直接改变本次考试的状态与风险。',
      options: [
        { value: 'mock', label: '完整模拟考 · 应试能力提高，疲劳明显增加' },
        { value: 'weakness', label: '弱科冲刺 · 最弱两科增加学习积累' },
        { value: 'rest', label: '调整作息 · 降低疲劳并改善心情' },
      ],
    };
  }

  function resolve(state, value) {
    if (state.pendingDecision?.type !== 'examPrep') return { ok: false, message: '考前安排已经失效' };
    if (value === 'mock') {
      state.education.examTechnique = U.clamp((state.education.examTechnique || 20) + 8, 0, 100);
      state.education.burnout = U.clamp((state.education.burnout || 0) + 9, 0, 100);
    } else if (value === 'weakness') {
      weakest(state).forEach((subject) => {
        const data = state.education.subjects[subject];
        data.studyHours = Math.min(200, (data.studyHours || 0) + 15);
      });
      state.education.burnout = U.clamp((state.education.burnout || 0) + 6, 0, 100);
    } else if (value === 'rest') {
      state.education.burnout = U.clamp((state.education.burnout || 0) - 18, 0, 100);
      state.stats.心情 = U.clamp((state.stats.心情 || 0) + 4, 0, 100);
      state.health.sleep = U.clamp((state.health.sleep || 7) + 1, 4, 10);
    } else return { ok: false, message: '没有这个考前安排' };
    Game.lifeDirector.addLog(state, '考前安排', {
      mock: '你完成了一次完整模拟考。',
      weakness: '你集中补强了当前最弱的科目。',
      rest: '你降低强度，把状态调整到考试日。',
    }[value], 'good');
    return { ok: true, message: '考前安排已确定' };
  }

  Game.educationExamPrep = Object.freeze({ maybeTrigger, renderDecision, resolve });
}(window));
