(function initStressSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const clamp = (value) => Math.max(0, Math.min(399, Math.round(Number(value) || 0)));
  const levelOf = (value) => Math.min(3, Math.floor(clamp(value) / 100));
  const labels = ['平稳', '紧张', '高压', '崩溃边缘'];

  function ensure(state) {
    state.stress = state.stress && typeof state.stress === 'object' ? state.stress : {};
    const item = state.stress;
    item.value = clamp(item.value);
    item.level = levelOf(item.value);
    item.crossings = item.crossings && typeof item.crossings === 'object' ? item.crossings : {};
    item.history = Array.isArray(item.history) ? item.history.slice(-12) : [];
    return item;
  }

  function trigger(state, oldLevel, newLevel) {
    if (newLevel <= oldLevel) return;
    for (let level = oldLevel + 1; level <= newLevel; level += 1) {
      ensure(state).crossings[level] = state.totalMonths;
      Game.lifeDirector.addLog(state, `压力等级 ${level}`,
        `长期负担累积，你进入“${labels[level]}”状态。`, level >= 2 ? 'normal' : 'milestone');
    }
    if (!state.pendingDecision) state.pendingDecision = { type: 'stress', level: newLevel };
  }

  function add(state, amount, source) {
    const item = ensure(state);
    const before = item.level;
    const factor = Game.structuredTraits?.stressFactor(state.profile, amount < 0) || 1;
    const adjusted = Math.round(amount * factor);
    item.value = clamp(item.value + adjusted);
    item.level = levelOf(item.value);
    if (adjusted) {
      item.history.push({ month: state.totalMonths, amount: adjusted, source: source || '生活压力' });
      item.history = item.history.slice(-12);
    }
    trigger(state, before, item.level);
    return item.value;
  }

  function reduce(state, amount, source) {
    return add(state, -Math.abs(amount), source || '压力缓解');
  }

  function monthly(state) {
    const item = ensure(state);
    const burnout = Number(state.career?.burnout) || 0;
    const school = Number(state.education?.pressure) || 0;
    const fatigue = Number(state.routine?.fatigue) || 0;
    const sleep = Number(state.health?.sleep) || 7;
    let delta = Math.max(0, Math.ceil((burnout - 45) / 20))
      + Math.max(0, Math.ceil((school - 55) / 25))
      + Math.max(0, Math.ceil((fatigue - 65) / 20));
    if (sleep < 6) delta += 3;
    else if (sleep < 7) delta += 1;
    if (sleep >= 8) delta -= 1;
    if (delta) add(state, delta, '月度生活负担');
  }

  function effects(state) {
    const level = ensure(state).level;
    return {
      health: [0, -2, -5, -10][level],
      learning: [0, -2, -6, -12][level],
      social: [0, -1, -4, -8][level],
    };
  }

  function renderDecision(state) {
    const level = ensure(state).level;
    return {
      title: `压力突破 · 等级 ${level}`,
      text: '你已经无法继续忽视精神负担。选择一种应对方式，会影响工作、金钱或压力。',
      options: [
        { value: 'rest', label: '暂停事务休整 · 压力-35，绩效-6' },
        { value: 'talk', label: '向亲友倾诉 · 压力-30' },
        { value: 'therapy', label: '寻求专业帮助 · 花费2000，压力-55' },
      ],
    };
  }

  function resolve(state, value) {
    if (value === 'therapy') {
      if (state.money < 2000) return { ok: false, message: '专业帮助需要2000元' };
      Game.economy.spend(state, 2000);
      reduce(state, 55, '专业帮助');
    } else if (value === 'talk') {
      reduce(state, 30, '向亲友倾诉');
    } else if (value === 'rest') {
      reduce(state, 35, '暂停事务休整');
      state.career.performance = Math.max(0, (state.career.performance || 0) - 6);
    } else return { ok: false, message: '这项压力应对方式已经失效' };
    return { ok: true, message: `压力降至 ${ensure(state).value}/399` };
  }

  function render(state) {
    const item = ensure(state);
    const effect = effects(state);
    var levelsHtml = labels.map(function (l, i) {
      return '<span class="' + (i <= item.level ? 'active' : '') + '">' + l + '</span>';
    }).join('');
    return `<section class="panel stress-panel"><div class="panel-title"><h2>压力</h2>
      <span>${labels[item.level]}</span></div>
      <div class="stress-levels">${levelsHtml}</div>
      <div class="stress-meter"><i style="width:${item.value / 3.99}%"></i></div>
      <p class="system-note">${item.value}/399 · 健康 <em>${effect.health}</em>
      · 学习 <em>${effect.learning}</em> · 社交 <em>${effect.social}</em>
      ${item.level >= 3 ? ' <em>· 崩坏风险</em>' : ''}</p></section>`;
  }

  Game.stressSystem = Object.freeze({
    ensure, add, reduce, monthly, effects, render, renderDecision, resolve, levelOf,
  });
}(window));
