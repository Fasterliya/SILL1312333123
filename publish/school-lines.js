(function initSchoolLines(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const C = Game.config;
  let scope = 'local';
  let api = null;

  const hash = (value) => [...String(value)].reduce((sum, char) => (
    Math.imul(sum ^ char.charCodeAt(0), 16777619) >>> 0
  ), 2166136261);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  function cityInfo(name) {
    return C.cities.find((item) => item.city === name) || { city: name, province: name, tier: 3 };
  }

  function cityResource(name) {
    const city = cityInfo(name);
    const base = { 1: 89, 2: 77, 3: 66 }[city.tier] || 62;
    return clamp(base + hash(`${city.province}-${city.city}`) % 9 - 4, 55, 96);
  }

  function resourceLabel(value) {
    if (value >= 90) return '全国领先';
    if (value >= 82) return '优秀';
    if (value >= 72) return '良好';
    if (value >= 62) return '均衡';
    return '成长中';
  }

  function examContext(state, kind) {
    const area = state.hometown?.province || state.hometown?.city || state.location.province;
    const wave = hash(`${state.year}-${area}-${kind}`) % 49 - 24;
    const difficulty = clamp(50 + wave, 28, 76);
    const label = difficulty >= 68 ? '较难' : (difficulty >= 57 ? '偏难'
      : (difficulty >= 44 ? '适中' : '偏易'));
    return { year: state.year, area, difficulty, label };
  }

  function schoolBonus(type) {
    if (/顶尖|985|省级示范/.test(type)) return 7;
    if (/211|双一流|市级重点|医科重点|财经重点/.test(type)) return 5;
    if (/一本|公立综合|理工重点/.test(type)) return 3;
    if (/职业|高职|应用/.test(type)) return -3;
    return 0;
  }

  function institutionResource(school) {
    return clamp(cityResource(school.city) + schoolBonus(school.type), 50, 99);
  }

  function highSchoolLine(state, school) {
    const context = examContext(state, 'middle');
    const source = cityResource(state.hometown.city);
    return clamp(school.min + (source - 72) * 0.42 + (50 - context.difficulty) * 0.72, 150, 675);
  }

  function universityLine(state, school) {
    const context = examContext(state, 'high');
    const source = cityResource(state.hometown.city);
    const target = institutionResource(school);
    return clamp(school.min + (source - 72) * 0.24 + (target - 74) * 0.1
      + (50 - context.difficulty) * 0.45, 220, 690);
  }

  function examProfile(state, label) {
    const kind = label === '中考' ? 'middle' : (label === '高考' ? 'high' : '');
    if (!kind) return null;
    const context = examContext(state, kind);
    const base = kind === 'middle' ? 0.06 : 0.1;
    return { ...context, penalty: base + (context.difficulty - 50) / 1000 };
  }

  function localList(state) {
    const city = state.hometown.city;
    const baseResource = cityResource(city);
    return C.highSchools.map((school) => {
      const resource = clamp(baseResource + schoolBonus(school.type), 50, 99);
      return `<article class="line-row"><div><strong>${escape(city + school.suffix)}</strong>
        <span>${escape(school.type)}${school.major ? ` · ${escape(school.major)}` : ''}</span></div>
        <div><b>${highSchoolLine(state, school)}分</b><small>${resourceLabel(resource)} · 资源${resource}</small></div></article>`;
    }).join('');
  }

  function nationalList(state) {
    return C.universities.filter((school) => school.country === '华夏')
      .map((school) => ({ school, line: universityLine(state, school) }))
      .sort((a, b) => b.line - a.line || a.school.name.localeCompare(b.school.name, 'zh-CN'))
      .map(({ school, line }) => {
        const resource = institutionResource(school);
        return `<article class="line-row"><div><strong>${escape(school.name)}</strong>
          <span>${escape(school.city)} · ${escape(school.type)} · ${escape(school.majors.join(' / '))}</span></div>
          <div><b>${line}分</b><small>${resourceLabel(resource)} · 资源${resource}</small></div></article>`;
      }).join('');
  }

  function render(state) {
    const context = examContext(state, scope === 'local' ? 'middle' : 'high');
    const resource = cityResource(state.hometown.city);
    return `<section class="school-lines"><header><div><span>升学线中心</span>
      <strong>${context.year}年 · ${escape(context.area)}卷${context.label}</strong></div>
      <b>${escape(state.hometown.city)}教育资源 ${resource} · ${resourceLabel(resource)}</b></header>
      <nav><button class="${scope === 'local' ? 'active' : ''}" data-school-line-scope="local">当地高中</button>
      <button class="${scope === 'national' ? 'active' : ''}" data-school-line-scope="national">全国高校</button></nav>
      <div class="line-legend"><span>分数线随年份与卷面难度变化</span><span>资源指数越高，竞争与培养条件通常越强</span></div>
      <div class="school-line-list">${scope === 'local' ? localList(state) : nationalList(state)}</div></section>`;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-school-line-scope]');
    if (!button || !['local', 'national'].includes(button.dataset.schoolLineScope)) return false;
    scope = button.dataset.schoolLineScope;
    api.refresh();
    return true;
  }

  function configure(options) {
    api = options;
  }

  Game.schoolLines = Object.freeze({
    configure, render, handleClick, examContext, examProfile,
    cityResource, institutionResource, highSchoolLine, universityLine, resourceLabel,
  });
}(window));
