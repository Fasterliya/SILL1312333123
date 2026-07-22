(function initSchoolLines(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  const japanHighSchools = [
    { suffix: '青叶公立高等学校', min: 565, type: '公立重点', program: 'academic' },
    { suffix: '樱丘私立高等学校', min: 510, type: '私立名门', program: 'academic' },
    { suffix: '中央综合高等学校', min: 435, type: '综合高中', program: 'academic' },
    { suffix: '未来产业高等专门学校', min: 330, type: '高等专门', program: 'vocational', major: '智能制造' },
    { suffix: '城市商业高等学校', min: 245, type: '职业高中', program: 'vocational', major: '现代服务' },
  ];
  let scope = 'local', targetId = '', api = null;

  const hash = (value) => [...String(value)].reduce((sum, char) => (
    Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
  ), 2166136261);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  function cityInfo(name) {
    return C.cities.find((item) => item.city === name)
      || { city: name, province: name, country: '华夏', tier: 3 };
  }

  function cityResource(name) {
    const city = cityInfo(name);
    const base = { 1: 89, 2: 77, 3: 66 }[city.tier] || 62;
    return clamp(base + hash(`${city.country}-${city.province}-${city.city}`) % 9 - 4, 55, 96);
  }

  function resourceLabel(value) {
    if (value >= 90) return '全国领先';
    if (value >= 82) return '优秀';
    if (value >= 72) return '良好';
    if (value >= 62) return '均衡';
    return '成长中';
  }

  function examContext(state, kind) {
    const place = state.location;
    const area = place.country === '华夏' ? place.province : `${place.country}${place.province}`;
    const wave = hash(`${state.year}-${place.city}-${kind}`) % 49 - 24;
    const difficulty = clamp(50 + wave, 28, 76);
    const label = difficulty >= 68 ? '较难' : (difficulty >= 57 ? '偏难'
      : (difficulty >= 44 ? '适中' : '偏易'));
    return { year: state.year, area, difficulty, label };
  }

  function schoolBonus(type) {
    if (/顶尖|985|省级示范|公立重点|私立名门/.test(type)) return 7;
    if (/211|双一流|市级重点|医科重点|财经重点/.test(type)) return 5;
    if (/一本|公立综合|理工重点/.test(type)) return 3;
    if (/职业|高职|应用|高等专门/.test(type)) return -3;
    return 0;
  }

  function institutionResource(school) {
    const score = cityResource(school.city) + schoolBonus(school.type);
    return school.country === '华夏' ? clamp(score, 50, 92) : clamp(score + 8, 94, 99);
  }

  function localHighSchools(state) {
    return state.location.country === '日本' ? japanHighSchools : C.highSchools;
  }

  const schoolName = (state, school) => `${state.location.city}${school.suffix}`;

  function highSchoolLine(state, school) {
    const context = examContext(state, 'middle');
    const source = cityResource(state.location.city);
    return clamp(school.min + (source - 72) * 0.42 + (50 - context.difficulty) * 0.72, 150, 675);
  }

  function universityLine(state, school) {
    const context = examContext(state, 'high');
    const source = cityResource(state.location.city);
    const target = institutionResource(school);
    return clamp(school.min + (source - 72) * 0.24 + (target - 74) * 0.1
      + (50 - context.difficulty) * 0.45, 220, 690);
  }

  function examProfile(state, label) {
    const kind = label === '中考' ? 'middle' : (label === '高考' ? 'high' : '');
    if (!kind) return null;
    const context = examContext(state, kind);
    return { ...context, penalty: (kind === 'middle' ? 0.06 : 0.1)
      + (context.difficulty - 50) / 1000 };
  }

  function targets(state) {
    const children = state.family.filter((person) => ['儿子', '女儿'].includes(person.relation)
      && person.status === '健康');
    return children.length ? children : [state.profile];
  }

  function selectedTarget(state) {
    const list = targets(state);
    const selected = list.find((person) => (person.id || 'player') === targetId) || list[0];
    targetId = selected.id || 'player';
    return selected;
  }

  const targetAge = (state, target) => target === state.profile
    ? Game.content.age(state) : Game.content.personAge(state, target);

  function predictedScore(state, target) {
    if (target === state.profile) {
      const latest = state.education.exams.find((item) => ['中考', '高考'].includes(item.label));
      if (latest?.maximum) return clamp(latest.total / latest.maximum * 750, 0, 750);
      return clamp(220 + Game.educationSystem.readiness(state) * 5.2, 0, 750);
    }
    Game.educationSystem.ensurePerson(target);
    const upbringing = target.upbringing?.education || 20;
    const base = target.academicScore || Game.learningAttribute.checkValue(target.academicAbility) * 0.82 + target.studyHabit * 0.18;
    const rating = base * 0.78 + target.studyHabit * 0.06 + upbringing * 0.16;
    return clamp(220 + rating * 5.2, 0, 750);
  }

  function status(score, line) {
    const gap = score - line;
    if (gap >= 35) return ['保底', 'safe'];
    if (gap >= 0) return ['稳妥', 'ready'];
    if (gap >= -30) return ['冲刺', 'reach'];
    return [`差${Math.abs(gap)}分`, 'locked'];
  }

  function lineRow(name, meta, line, score, resource) {
    const result = status(score, line);
    return `<article class="line-row ${result[1]}"><div><strong>${escape(name)}</strong>
      <span>${escape(meta)}</span></div><div><b>${line}分</b>
      <small>${result[0]} · ${resourceLabel(resource)} ${resource}</small></div></article>`;
  }

  function highSchoolList(state, score) {
    const base = cityResource(state.location.city);
    return localHighSchools(state).map((school) => lineRow(schoolName(state, school),
      `${school.type}${school.major ? ` · ${school.major}` : ''}`, highSchoolLine(state, school), score,
      clamp(base + schoolBonus(school.type), 50, 99))).join('');
  }

  function universityList(state, score, country, localOnly) {
    const international = country === 'international';
    return C.universities.filter((school) => (international ? school.country !== '华夏' : school.country === country)
      && (!localOnly || school.city === state.location.city))
      .map((school) => ({ school, line: universityLine(state, school) }))
      .sort((a, b) => b.line - a.line || a.school.name.localeCompare(b.school.name, 'zh-CN'))
      .map(({ school, line }) => lineRow(school.name,
        `${school.country} · ${school.city} · ${school.type} · ${school.majors.join(' / ')}`, line, score,
        institutionResource(school))).join('');
  }

  function render(state) {
    const target = selectedTarget(state);
    const age = targetAge(state, target);
    const score = predictedScore(state, target);
    const country = scope === 'china' ? '华夏' : (scope === 'international' ? 'international' : state.location.country);
    const localUniversities = age >= 15;
    const list = scope === 'local'
      ? (localUniversities ? universityList(state, score, country, true) : highSchoolList(state, score))
      : universityList(state, score, country, false);
    const context = examContext(state, localUniversities || scope !== 'local' ? 'high' : 'middle');
    const targetButtons = targets(state).map((person) => {
      const id = person.id || 'player';
      const name = person === state.profile ? `${state.name}（本人）` : `${person.name}（${person.relation}）`;
      return `<button class="${id === targetId ? 'active' : ''}" data-school-line-target="${escape(id)}">${escape(name)}</button>`;
    }).join('');
    return `<section class="school-lines"><header><div><span>当前考试城市</span>
      <strong>${escape(state.location.country)} · ${escape(state.location.city)} · ${context.area}卷${context.label}</strong></div>
      <b>${escape(target.name || state.name)} ${age}岁 · 预测${score}分</b></header>
      <div class="line-targets">${targetButtons}</div><nav>
      <button class="${scope === 'local' ? 'active' : ''}" data-school-line-scope="local">当地学校</button>
      <button class="${scope === 'china' ? 'active' : ''}" data-school-line-scope="china">中国高校</button>
      <button class="${scope === 'international' ? 'active' : ''}" data-school-line-scope="international">国际高校</button></nav>
      <div class="line-legend"><span>依据孩子能力、学习习惯与家庭教育投入预测</span>
      <span>分数线随当前城市、年份、卷面难度和学校资源变化</span></div>
      <div class="school-line-list">${list || '<p class="line-empty">当前范围暂无对应学校。</p>'}</div></section>`;
  }

  function handleClick(event) {
    const scopeButton = event.target.closest('[data-school-line-scope]');
    const targetButton = event.target.closest('[data-school-line-target]');
    if (!scopeButton && !targetButton) return false;
    if (scopeButton && ['local', 'china', 'international'].includes(scopeButton.dataset.schoolLineScope)) {
      scope = scopeButton.dataset.schoolLineScope;
    }
    if (targetButton) targetId = targetButton.dataset.schoolLineTarget;
    api.refresh();
    return true;
  }

  function configure(options) { api = options; }

  Game.schoolLines = Object.freeze({
    configure, render, handleClick, examContext, examProfile, cityResource,
    institutionResource, localHighSchools, schoolName, highSchoolLine, universityLine, resourceLabel,
  });
}(window));
