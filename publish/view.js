(function initView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const ids = [
    'profileName', 'profileMeta', 'ageValue', 'stageValue', 'moneyValue', 'lifeDate',
    'statGrid', 'eventList', 'familyList', 'classmatesList', 'phoneList',
    'matchmakingList', 'educationPanel', 'careerPanel', 'cityPanel', 'travelPanel',
    'propertyPanel', 'stockPanel', 'industryPanel',
    'portraitSlot', 'portraitStatus', 'generatePortraitBtn', 'profileFacts',
    'portraitPromptInput', 'profileEditor', 'traitGrid', 'decision', 'decisionTitle', 'decisionText',
    'decisionBody', 'monthBtn', 'yearBtn', 'actionStrip', 'toast', 'tabPages',
    'tabs', 'heroCanvas', 'resetBtn', 'childPlanBtn',
  ];
  const el = {};
  let toastTimer = 0;

  function init() {
    ids.forEach((id) => { el[id] = document.getElementById(id); });
    if (ids.some((id) => !el[id])) throw new Error('页面结构不完整');
    drawHero();
  }

  function money(value) {
    const abs = Math.abs(value);
    if (abs >= 10000) return `${value < 0 ? '-' : ''}¥${(abs / 10000).toFixed(1)}万`;
    return `${value < 0 ? '-' : ''}¥${abs.toLocaleString()}`;
  }

  function drawHero() {
    const canvas = el.heroCanvas;
    const ratio = root.devicePixelRatio || 1;
    const width = canvas.clientWidth || 420;
    const height = canvas.clientHeight || 150;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#f5d28c';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#cf3f32';
    ctx.beginPath();
    ctx.arc(width * 0.78, 36, 24, 0, Math.PI * 2);
    ctx.fill();
    const buildings = [
      [0.04, 0.5, 0.14, 0.5, '#315f58'], [0.19, 0.38, 0.12, 0.62, '#faf4df'],
      [0.33, 0.58, 0.12, 0.42, '#ce6d3c'], [0.48, 0.3, 0.15, 0.7, '#28505c'],
      [0.65, 0.53, 0.12, 0.47, '#f8eee0'], [0.79, 0.42, 0.17, 0.58, '#3f796a'],
    ];
    buildings.forEach(([x, y, w, h, color], index) => {
      ctx.fillStyle = color;
      ctx.fillRect(width * x, height * y, width * w, height * h);
      ctx.fillStyle = index % 2 ? '#c34232' : '#f1ba55';
      for (let row = 0; row < 3; row += 1) {
        ctx.fillRect(width * (x + 0.025), height * (y + 0.08 + row * 0.13), 8, 8);
      }
    });
    ctx.strokeStyle = '#202c2c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, height - 15);
    ctx.bezierCurveTo(width * 0.25, height - 60, width * 0.55, height - 5, width, height - 45);
    ctx.stroke();
  }

  function statCards(state) {
    return Object.entries(state.stats).map(([name, value]) => `
      <div class="stat-item"><span>${name}</span><strong>${value}</strong>
        <i><b style="width:${value}%"></b></i></div>`).join('');
  }

  function logCards(state) {
    return state.logs.map((item) => {
      const years = Math.floor(item.month / 12);
      return `<article class="event ${item.tone}"><time>${years}岁${item.month % 12}月</time>
        <div><strong>${item.title}</strong><p>${item.text}</p></div></article>`;
    }).join('');
  }

  function relationAction(item, state) {
    if (['儿子', '女儿'].includes(item.relation)) return '陪伴';
    if (state.romance.partnerId === item.id && state.romance.married) return '相伴';
    if (state.romance.partnerId === item.id) return item.affection >= 80 ? '求婚' : '约会';
    if (item.relation === '朋友' && item.affection >= 68 && !state.romance.partnerId) return '告白';
    return '互动';
  }

  function familyCards(state) {
    const summary = `<div class="detail-row family-wealth"><span>原生家庭资产</span><b>${money(state.familyWealth)}</b></div>`;
    return summary + state.family.map((item) => {
      const label = relationAction(item, state);
      const type = { 告白: 'confess', 求婚: 'propose', 约会: 'date' }[label] || 'chat';
      return `
      <article class="person"><button class="person-avatar" type="button"
        data-character-id="${item.id}" aria-label="查看${item.name}详情">${Game.portraitSystem.avatar(item)}</button>
        <div class="person-main"><strong>${item.name}</strong>
        <span>${item.relation} · ${U.personAge(state, item)}岁 · ${item.personality} · ${item.trait}${item.job ? ` · ${item.job}` : ''}</span>
        <div class="affection"><i style="width:${item.affection}%"></i></div></div>
        <button data-person="${item.id}" data-person-action="${type}" ${item.status === '已故' ? 'disabled' : ''}>${item.status === '已故' ? '追忆' : label}</button></article>`;
    }).join('');
  }

  function education(state) {
    const latest = state.education.exams[0];
    const scores = latest ? Object.entries(latest.scores).map(([name, score]) => (
      `<span>${name}<b>${score}</b></span>`
    )).join('') : '<p class="empty-state">还没有考试记录。</p>';
    const track = state.education.track
      ? `${state.education.track} + ${state.education.electives.join('、')}` : '尚未选科';
    return `<div class="detail-row"><span>当前阶段</span><b>${U.gradeLabel(state)}</b></div>
      <div class="detail-row"><span>学校</span><b>${state.education.school}</b></div>
      <div class="detail-row"><span>学校类型</span><b>${state.education.universityType || '-'}</b></div>
      <div class="detail-row"><span>专业/选科</span><b>${state.education.major || track}</b></div>
      <div class="detail-row"><span>学习积累</span><b>${state.education.study}</b></div>
      <h3>${latest ? `${latest.label} · ${latest.total}分` : '考试成绩'}</h3>
      <div class="score-grid">${scores}</div>`;
  }

  function properties(state) {
    const house = state.assets.house ? state.assets.house.name : '暂无房产';
    return `<div class="detail-row"><span>当前城市</span><b>${state.location.city}</b></div>
      <div class="detail-row"><span>住房</span><b>${house}</b></div>
      <div class="detail-row"><span>月供</span><b>${money(state.assets.mortgage)}</b></div>
      <div class="house-actions" id="houseActions"></div>`;
  }

  function stocks(state) {
    return Object.entries(state.assets.stocks).map(([name, item]) => {
      const delta = item.price - item.previous;
      return `<article class="stock"><div><strong>${name}</strong><span>${item.shares}股</span></div>
        <b class="${delta >= 0 ? 'up' : 'down'}">¥${item.price.toFixed(2)}</b>
        <button data-stock="${name}" data-trade="buy">买100</button>
        <button data-stock="${name}" data-trade="sell">卖100</button></article>`;
    }).join('');
  }

  function render(state) {
    const years = U.age(state);
    el.profileName.textContent = state.name;
    el.profileMeta.textContent = `${state.gender} · ${state.location.country || '华夏'} ${state.location.city}`;
    el.ageValue.textContent = `${years}岁${state.totalMonths % 12}月`;
    el.stageValue.textContent = U.stage(years).name;
    el.moneyValue.textContent = money(state.money);
    el.lifeDate.textContent = `${state.year}年${state.month}月`;
    el.statGrid.innerHTML = statCards(state);
    el.eventList.innerHTML = logCards(state);
    el.familyList.innerHTML = familyCards(state);
    el.classmatesList.innerHTML = Game.social.renderSchool(state);
    el.phoneList.innerHTML = Game.social.renderPhone(state);
    el.matchmakingList.innerHTML = Game.matchmaking.render(state);
    el.educationPanel.innerHTML = education(state);
    el.careerPanel.innerHTML = Game.careerSystem.renderCareer(state, money);
    el.cityPanel.innerHTML = Game.careerSystem.renderCities(state);
    el.travelPanel.innerHTML = Game.travelSystem.render(state);
    el.propertyPanel.innerHTML = properties(state);
    el.stockPanel.innerHTML = stocks(state);
    el.industryPanel.innerHTML = Game.assetsSystem.render(state, money);
    Game.profile.render(state, el);
    Game.navigation.refreshDetail();
    const partner = [...state.family, ...state.contacts].find((item) => item.id === state.romance.partnerId);
    el.childPlanBtn.disabled = !state.romance.married || partner?.status !== '健康' || Boolean(state.romance.pendingBirth);
    el.childPlanBtn.textContent = state.romance.pendingBirth ? `期待新生命 · ${state.romance.pendingBirth}个月` : '计划孩子';
    el.monthBtn.disabled = Boolean(state.pendingDecision || state.gameOver);
    el.yearBtn.disabled = Boolean(state.pendingDecision || state.gameOver);
  }

  function showToast(message, tone) {
    root.clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.dataset.tone = tone || 'normal';
    el.toast.hidden = false;
    toastTimer = root.setTimeout(() => { el.toast.hidden = true; }, 2400);
  }

  Game.view = Object.freeze({ el, init, render, showToast, money, drawHero });
}(window));
