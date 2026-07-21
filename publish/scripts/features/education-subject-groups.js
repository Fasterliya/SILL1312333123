(function initEducationSubjectGroups(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const DEFINITIONS = Object.freeze({
    primary: {
      语言: ['语文', '英语'],
      数学: ['数学'],
      自然科学: ['科学'],
    },
    middle: {
      语言: ['语文', '英语'],
      数学: ['数学'],
      自然科学: ['物理', '化学'],
      人文社科: ['政治', '历史'],
    },
    high: {
      语言: ['语文', '英语'],
      数学: ['数学'],
      自然科学: ['物理', '化学', '生物', '地理'],
      人文社科: ['历史', '政治'],
    },
    vocational: {
      语言: ['语文', '英语'],
      数学: ['数学'],
      专业技能: ['专业技能'],
    },
    university: {
      专业学习: ['专业核心', '毕业论文'],
      通识课程: ['通识课程'],
      语言: ['外语'],
    },
  });

  function subjects(state) {
    return Object.keys(Game.subjectPanel.getStageSubjects(state));
  }

  function groups(state) {
    const available = new Set(subjects(state));
    const source = DEFINITIONS[state.education.schoolStage] || {};
    return Object.fromEntries(Object.entries(source).map(([group, members]) => (
      [group, members.filter((subject) => available.has(subject))]
    )).filter(([, members]) => members.length));
  }

  function keys(state) {
    return Object.keys(groups(state));
  }

  function groupFor(state, subject) {
    return Object.entries(groups(state)).find(([, members]) => members.includes(subject))?.[0] || subject;
  }

  function allocationFor(state, allocation, subject) {
    return Number(allocation?.[groupFor(state, subject)]) || 0;
  }

  function progress(state, group) {
    const members = groups(state)[group] || [];
    if (!members.length) return 0;
    return members.reduce((sum, subject) => (
      sum + (Number(state.education.subjects?.[subject]?.studyHours) || 0)
    ), 0) / members.length;
  }

  function hint(state, group) {
    const members = groups(state)[group] || [];
    return members.length > 1 ? `同时作用：${members.join('、')}` : `专项作用：${members[0] || group}`;
  }

  Game.educationSubjectGroups = Object.freeze({
    subjects, groups, keys, groupFor, allocationFor, progress, hint,
  });
}(window));
