(function initEducationSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const focuses = {
    均衡基础: [],
    语言人文: ['语文', '英语', '政治', '历史', '地理'],
    数理科学: ['数学', '科学', '物理', '化学', '生物'],
    应试冲刺: ['语文', '数学', '英语', '专业技能'],
  };
  const actions = {
    foundation: [0, 8, 3, 1, 3, '系统复习'],
    weakness: [0, 10, 1, 3, 5, '补强薄弱科目'],
    mock: [120, 7, 0, 8, 8, '完成模拟考试'],
    tutor: [600, 13, 2, 5, 5, '参加专项辅导'],
    balance: [0, 4, 2, 1, -10, '调整学习节奏'],
  };

  const clamp = (value) => U.clamp(Number(value) || 0, 0, 100);
  const hash = (value) => [...String(value)].reduce((sum, char) => (
    Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
  ), 2166136261);

  function ensure(state) {
    const item = state.education;
    item.preparation = clamp(item.preparation ?? item.study);
    item.discipline = clamp(item.discipline ?? 48);
    item.examTechnique = clamp(item.examTechnique ?? 20);
    item.pressure = clamp(item.pressure);
    item.focus = focuses[item.focus] ? item.focus : '均衡基础';
    item.lastStudyMonth = Number.isFinite(item.lastStudyMonth) ? item.lastStudyMonth : -1;
    item.aptitudes = item.aptitudes && typeof item.aptitudes === 'object' ? item.aptitudes : {};
    item.study = Math.round(item.preparation);
    return item;
  }

  function ensurePerson(person) {
    const seed = hash(person.id || person.name);
    person.academicAbility = clamp(person.academicAbility ?? (28 + seed % 61));
    person.studyHabit = clamp(person.studyHabit ?? (24 + (seed >>> 7) % 68));
    person.academicScore = Math.max(0, Number(person.academicScore) || 0);
    if (!Number.isFinite(person.educationLevel)) {
      if (person.educationStage === 'university') {
        person.educationLevel = /职业|高职|技术学院/.test(person.educationName || '') ? 2 : 3;
      } else person.educationLevel = ['high', 'vocational'].includes(person.educationStage) ? 1 : 0;
    }
    person.educationLevel = Math.max(0, Math.min(3, Number(person.educationLevel) || 0));
    return person;
  }

  function enrolled(state) {
    return !['home', 'graduate', 'workforce'].includes(state.education.schoolStage);
  }

  function aptitude(state, subject) {
    const item = ensure(state);
    if (!Number.isFinite(item.aptitudes[subject])) {
      item.aptitudes[subject] = 34 + hash(`${state.name}-${subject}`) % 53;
    }
    let value = item.aptitudes[subject];
    if (focuses[item.focus].includes(subject)) value += item.focus === '应试冲刺' ? 5 : 8;
    if ([item.track, ...(item.electives || [])].includes(subject)) value += 6;
    return clamp(value);
  }

  function readiness(state) {
    const item = ensure(state);
    return clamp(item.preparation * 0.55 + item.discipline * 0.25
      + item.examTechnique * 0.2 - item.pressure * 0.18);
  }

  function addPreparation(state, amount) {
    const item = ensure(state);
    item.preparation = clamp(item.preparation + amount);
    item.study = Math.round(item.preparation);
  }

  function setFocus(state, value) {
    if (!focuses[value]) return { ok: false, message: '没有这个学习方向' };
    ensure(state).focus = value;
    return { ok: true, message: `学习方向调整为${value}` };
  }

  function act(state, type) {
    const item = ensure(state);
    const action = actions[type];
    if (!enrolled(state) || !action) return { ok: false, message: '当前阶段没有全日制学习安排' };
    if (item.lastStudyMonth === state.totalMonths) return { ok: false, message: '本月已经完成学习安排' };
    Game.economy.spend(state, action[0]);
    item.preparation = clamp(item.preparation + action[1]);
    item.discipline = clamp(item.discipline + action[2]);
    item.examTechnique = clamp(item.examTechnique + action[3]);
    item.pressure = clamp(item.pressure + action[4]);
    item.lastStudyMonth = state.totalMonths;
    item.study = Math.round(item.preparation);
    if (type === 'balance') state.stats.心情 = clamp(state.stats.心情 + 3);
    Game.lifeDirector.addLog(state, '学习安排', action[5], 'good');
    return { ok: true, message: Game.economy.message(
      state, `${action[5]}，备考度达到 ${Math.round(item.preparation)}`,
    ) };
  }

  function schoolQuality(state) {
    const university = Game.config.universities.find((school) => (
      school.id === state.education.universityId || school.name === state.education.university
    ));
    if (state.education.schoolStage === 'university' && university) {
      return Game.schoolLines.institutionResource(university);
    }
    const stageQuality = state.education.schoolStage === 'primary' ? 58
      : (state.education.schoolStage === 'middle' ? 62
        : (state.education.schoolStage === 'vocational' ? 56 : ({
          省级示范: 78, 市级重点: 70, 公办普通: 61, 综合高中: 54,
        }[state.education.highSchoolType] || 60)));
    const cityQuality = Game.schoolLines.cityResource(state.location.city);
    return Math.round(stageQuality * 0.72 + cityQuality * 0.28);
  }

  function exam(state, label, subjects) {
    const item = ensure(state);
    const scores = {};
    const paper = Game.schoolLines.examProfile(state, label);
    const difficulty = paper?.penalty ?? (state.education.schoolStage === 'primary' ? 0.03
      : (state.education.schoolStage === 'middle' ? 0.06 : 0.1));
    Object.entries(subjects).forEach(([subject, cap]) => {
      const condition = state.stats.健康 / 100 * 0.05 + state.stats.心情 / 100 * 0.04
        + U.clamp(state.health.sleep / 8, 0.55, 1.1) * 0.03;
      const random = (U.between(-7, 7) + U.between(-7, 7)) / 200;
      const rate = U.clamp(0.16 + state.stats.智力 / 100 * 0.16
        + item.preparation / 100 * 0.2 + item.discipline / 100 * 0.09
        + item.examTechnique / 100 * 0.08 + condition + schoolQuality(state) / 100 * 0.08
        + aptitude(state, subject) / 100 * 0.11 - item.pressure / 100 * 0.08
        - difficulty + random, 0.22, 0.93);
      scores[subject] = Math.round(cap * rate);
    });
    const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const maximum = Object.values(subjects).reduce((sum, value) => sum + value, 0);
    const record = { label, age: U.age(state), scores, total, maximum,
      paperDifficulty: paper?.label || null, paperDifficultyIndex: paper?.difficulty || null,
      readiness: Math.round(readiness(state)), date: `${state.year}.${state.month}` };
    item.exams.unshift(record);
    item.exams = item.exams.slice(0, 12);
    item.preparation = clamp(item.preparation - 16);
    item.pressure = clamp(item.pressure - 10);
    item.study = Math.round(item.preparation);
    const strong = total / maximum >= 0.78;
    state.stats.心情 = clamp(state.stats.心情 + (strong ? 4 : -3));
    const paperText = paper ? `，${paper.area}卷${paper.label}` : '';
    Game.lifeDirector.addLog(state, label, `总分 ${total}/${maximum}${paperText}，考前准备度 ${record.readiness}。`,
      strong ? 'good' : 'normal');
    return record;
  }

  function monthly(state) {
    if (!enrolled(state)) return;
    const item = ensure(state);
    const resourceGain = state.education.schoolStage === 'university'
      ? Math.max(0, (schoolQuality(state) - 70) / 35) : 0;
    item.preparation = clamp(item.preparation + 1 + item.discipline / 80 + resourceGain);
    const strain = item.focus === '应试冲刺' ? 2 : 0;
    item.pressure = clamp(item.pressure + strain - (state.health.sleep >= 8 ? 1 : 0));
    item.study = Math.round(item.preparation);
  }

  function render(state) {
    const item = ensure(state);
    const latest = item.exams[0];
    const scores = latest ? Object.entries(latest.scores).map(([name, score]) => (
      `<span>${name}<b>${score}</b></span>`)).join('') : '<p class="empty-state">还没有考试记录。</p>';
    const used = item.lastStudyMonth === state.totalMonths;
    return `<section class="study-summary"><div><span>${Game.content.gradeLabel(state)}</span>
      <strong>${state.education.school}</strong><small>${state.education.path || '基础教育'}</small></div>
      <dl><div><dt>备考度</dt><dd>${Math.round(item.preparation)}</dd></div>
      <div><dt>学习纪律</dt><dd>${Math.round(item.discipline)}</dd></div>
      <div><dt>应试能力</dt><dd>${Math.round(item.examTechnique)}</dd></div>
      <div><dt>学习压力</dt><dd>${Math.round(item.pressure)}</dd></div></dl></section>
      <h3>学习方向</h3><div class="study-focus">${Object.keys(focuses).map((name) => (
        `<button class="${item.focus === name ? 'active' : ''}" data-study-focus="${name}">${name}</button>`)).join('')}</div>
      <h3>本月学习安排</h3><div class="study-actions">${Object.entries(actions).map(([id, action]) => (
        `<button data-education-action="${id}" ${used || !enrolled(state) ? 'disabled' : ''}>
        <strong>${action[5]}</strong><small>${action[0] ? Game.view.money(action[0]) : '自主安排'}</small></button>`)).join('')}</div>
      <h3>${latest ? `${latest.label} · ${latest.total}/${latest.maximum || '-'}` : '考试成绩'}</h3>
      <div class="score-grid">${scores}</div>${Game.schoolLines.render(state)}`;
  }

  Game.educationSystem = Object.freeze({
    ensure, ensurePerson, readiness, addPreparation, setFocus, act, exam, monthly, render,
  });
}(window));
