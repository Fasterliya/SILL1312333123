(function initAdmissions(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  let filters = { country: '全部', city: '全部', type: '全部', major: '全部', status: '可填报' };
  let activeScore = null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function reset(score) {
    if (activeScore === score) return;
    activeScore = score;
    filters = { country: '全部', city: '全部', type: '全部', major: '全部', status: '可填报' };
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function optionList(values, selected) {
    return values.map((value) => (
      `<option value="${escape(value)}" ${selected === value ? 'selected' : ''}>${escape(value)}</option>`
    )).join('');
  }

  function filterOptions() {
    const countrySchools = filters.country === '全部' ? C.universities
      : C.universities.filter((school) => school.country === filters.country);
    const cities = ['全部', ...unique(countrySchools.map((school) => school.city))];
    if (!cities.includes(filters.city)) filters.city = '全部';
    const scoped = countrySchools.filter((school) => filters.city === '全部' || school.city === filters.city);
    const types = ['全部', ...unique(scoped.map((school) => school.type))];
    const majors = ['全部', ...unique(scoped.flatMap((school) => school.majors))];
    if (!types.includes(filters.type)) filters.type = '全部';
    if (!majors.includes(filters.major)) filters.major = '全部';
    return { cities, types, majors };
  }

  function selectors(schools, available) {
    const countries = ['全部', ...unique(C.universities.map((school) => school.country))];
    return `<div class="admission-selectors">
      <label><span>国家/地区</span><select data-admission-filter="country">
      ${optionList(countries, filters.country)}</select></label>
      <label><span>城市</span><select data-admission-filter="city">
      ${optionList(available.cities, filters.city)}</select></label>
      <label><span>院校类型</span><select data-admission-filter="type">
      ${optionList(available.types, filters.type)}</select></label>
      <label><span>专业方向</span><select data-admission-filter="major">
      ${optionList(available.majors, filters.major)}</select></label>
      <label><span>显示范围</span><select data-admission-filter="status">
      ${optionList(['可填报', '全部院校'], filters.status)}</select></label>
      <div><span>筛选结果</span><strong>${schools.length} 所</strong></div></div>`;
  }

  function filtered(state, score) {
    return C.universities.filter((school) => (
      (filters.country === '全部' || school.country === filters.country)
      && (filters.city === '全部' || school.city === filters.city)
      && (filters.type === '全部' || school.type === filters.type)
      && (filters.major === '全部' || school.majors.includes(filters.major))
      && (filters.status === '全部院校' || score >= Game.schoolLines.universityLine(state, school))
    )).sort((a, b) => Game.schoolLines.universityLine(state, b)
      - Game.schoolLines.universityLine(state, a) || a.name.localeCompare(b.name, 'zh-CN'));
  }

  function token(school, major) {
    return `university|${school.id}|${encodeURIComponent(major)}`;
  }

  function card(state, school, score) {
    const line = Game.schoolLines.universityLine(state, school);
    const resource = Game.schoolLines.institutionResource(school);
    const eligible = score >= line;
    const gap = eligible ? `高于投档线 ${score - line} 分` : `还差 ${line - score} 分`;
    return `<details class="admission-card ${eligible ? '' : 'locked'}">
      <summary><div><strong>${escape(school.name)}</strong>
      <span>${escape(school.country)} · ${escape(school.city)} · ${escape(school.type)}</span></div>
      <b>${line}分</b></summary>
      <div class="admission-detail"><p>${gap} · 教育资源${resource}（${Game.schoolLines.resourceLabel(resource)}） · 学制${school.durationMonths / 12}年</p>
      <div class="major-options">${school.majors.map((major) => (
        `<button data-choice="${escape(token(school, major))}" ${eligible ? '' : 'disabled'}>
        <strong>${escape(major)}</strong><small>${eligible ? '选择该专业并确认入学' : '分数未达到投档线'}</small></button>`
      )).join('')}</div></div></details>`;
  }

  function render(state, score) {
    reset(score);
    const available = filterOptions();
    const schools = filtered(state, score);
    const paper = Game.schoolLines.examContext(state, 'high');
    const guide = `<section class="admission-guide"><strong>高考 ${score} 分 · ${paper.area}卷${paper.label}</strong>
      <span>${paper.year}年动态投档线已结合卷面难度、生源地竞争和学校教育资源。海外录取后会迁居当地学习。</span></section>`;
    const cards = schools.length ? schools.map((school) => card(state, school, score)).join('')
      : '<p class="empty-state">当前筛选没有符合条件的院校，请调整筛选范围。</p>';
    return `${guide}${selectors(schools, available)}<div class="admission-list">${cards}</div>
      <button class="admission-workforce" data-choice="workforce">不升大学 · 直接进入职业社会</button>`;
  }

  function handleChange(event) {
    const field = event.target.closest('[data-admission-filter]');
    if (!field || !(field.dataset.admissionFilter in filters)) return false;
    filters[field.dataset.admissionFilter] = field.value;
    return true;
  }

  function resolve(value) {
    const [kind, id, encodedMajor] = String(value || '').split('|');
    if (kind !== 'university') return null;
    const school = Game.universityCatalog.find(id);
    const major = decodeURIComponent(encodedMajor || '');
    return school?.majors.includes(major) ? { school, major } : null;
  }

  function enroll(state, value, bypassScore) {
    const selected = resolve(value);
    if (!selected) return { ok: false, message: '院校或专业选择已经失效' };
    const { school, major } = selected;
    if (!bypassScore && (state.pendingDecision?.score || 0) < Game.schoolLines.universityLine(state, school)) {
      return { ok: false, message: '高考分数未达到该校投档线' };
    }
    Object.assign(state.education, {
      university: school.name, universityId: school.id, universityType: school.type,
      major, graduated: false, enrolledAt: state.totalMonths,
      durationMonths: school.durationMonths, path: school.international ? `${school.country}留学` : '大学教育',
    });
    Game.social.enterSchool(state, school.name, 'university', 32);
    const city = C.cities.find((item) => item.city === school.city);
    if (city) state.location = { province: city.province, city: city.city, country: city.country };
    Game.cityLife.onMove(state);
    Game.lifeDirector.addLog(state, '大学录取',
      `你被${school.country}${school.name}${major}专业录取，前往${school.city}学习。`, 'milestone');
    return { ok: true, message: `已录取：${school.name} · ${major}` };
  }

  function vocationalToken() {
    const school = [...C.universities].sort((a, b) => a.min - b.min)[0];
    return token(school, school.majors[0]);
  }

  Game.admissions = Object.freeze({ render, handleChange, resolve, enroll, vocationalToken });
}(window));
