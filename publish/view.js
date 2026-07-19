(function initView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const ids = [
    'profileName', 'profileMeta', 'ageValue', 'stageValue', 'moneyValue', 'lifeDate',
    'statGrid', 'eventList', 'familyList', 'classmatesList', 'phoneList',
    'matchmakingList', 'educationPanel', 'careerPanel', 'cityPanel', 'governmentPanel', 'travelPanel', 'journeyPanel',
    'propertyPanel', 'stockPanel', 'industryPanel', 'parentingPanel', 'healthPanel', 'legacyPanel',
    'portraitSlot', 'portraitStatus', 'generatePortraitBtn', 'profileFacts',
    'portraitPromptInput', 'profileEditor', 'traitGrid', 'geneFacts', 'decision', 'decisionTitle', 'decisionText',
    'decisionBody', 'monthBtn', 'yearBtn', 'toast', 'tabPages',
    'tabs', 'heroCanvas', 'resetBtn',
  ];
  const el = {};
  let toastTimer = 0;
  let currentCountry = '华夏';

  function init() {
    ids.forEach((id) => { el[id] = document.getElementById(id); });
    if (ids.some((id) => !el[id])) throw new Error('页面结构不完整');
    drawHero();
  }

  function money(value, country) {
    return Game.worldCulture.format(value, country || currentCountry);
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
      const lived = Number.isFinite(item.ageMonth) ? item.ageMonth : item.month;
      const years = Math.floor(lived / 12);
      return `<article class="event ${item.tone}"><time>${item.generation || 1}代 · ${years}岁${lived % 12}月</time>
        <div><strong>${item.title}</strong><p>${item.text}</p></div></article>`;
    }).join('');
  }

  function familyCards(state) {
    const summary = `<div class="detail-row family-wealth"><span>原生家庭资产</span><b>${money(state.familyWealth)}</b></div>`;
    const partner = Game.people.find(state, state.romance.partnerId);
    const stats = Game.demography.conceptionStats(state, partner);
    const birthStatus = state.romance.pendingBirth
      ? `孕期剩余 ${state.romance.pendingBirth}个月${state.romance.pendingBabies === 2 ? ' · 双胞胎' : ''}`
      : (state.romance.conceptionCooldown > 0 ? `产后恢复 ${state.romance.conceptionCooldown}个月`
        : `月受孕率 ${stats.monthlyPercent}% · 连续12月累计 ${stats.annualPercent}%`);
    const fertility = state.romance.married
      ? `<div class="detail-row"><span>自然生育</span><b>${birthStatus}</b></div>` : '';
    return summary + fertility + state.family.map((item) => {
      const actions = item.status === '已故' ? '<button disabled>追忆</button>'
        : Game.familySystem.detailActions(state, item).map(([type, label]) => (
          `<button data-detail-family="${item.id}" data-family-action="${type}">${label}</button>`
        )).join('');
      return `
      <article class="person"><button class="person-avatar" type="button"
        data-character-id="${item.id}" aria-label="查看${item.name}详情">${Game.portraitSystem.avatar(item)}</button>
        <div class="person-main"><strong>${item.name}</strong>
        <span>${item.relation} · ${U.personAge(state, item)}岁 · ${item.personality} · ${item.trait}
        ${item.job ? ` · ${item.job}` : ''}${item.gender === '女' && item.npcMarried
          ? ` · 生育力 ${Game.demography.fertility(state, item)}%` : ''}</span>
        <div class="affection"><i style="width:${item.affection}%"></i></div></div>
        <details class="interaction-menu"><summary>互动选项</summary>
        <div class="interaction-options">${actions}</div></details></article>`;
    }).join('');
  }

  function properties(state) {
    const house = state.assets.house ? state.assets.house.name : '暂无房产';
    return `<div class="detail-row"><span>当前城市</span><b>${state.location.city}</b></div>
      <div class="detail-row"><span>住房</span><b>${house}</b></div>
      <div class="detail-row"><span>月供</span><b>${money(state.assets.mortgage)}</b></div>
      <div class="house-actions" id="houseActions"></div>`;
  }

  function render(state) {
    currentCountry = state.location.country || '华夏';
    const years = U.age(state);
    el.profileName.textContent = state.name;
    el.profileMeta.textContent = `${state.gender} · ${state.location.country || '华夏'} ${state.location.city}`;
    el.ageValue.textContent = `${years}岁${(state.totalMonths - state.playerBornAt) % 12}月`;
    el.stageValue.textContent = Game.timeSystem.stageLabel(state);
    el.moneyValue.textContent = money(state.money);
    el.moneyValue.classList.toggle('debt', state.money < 0);
    el.lifeDate.textContent = `${state.year}年${state.month}月`;
    el.statGrid.innerHTML = statCards(state);
    el.eventList.innerHTML = logCards(state);
    el.familyList.innerHTML = familyCards(state);
    el.classmatesList.innerHTML = Game.social.renderSchool(state);
    el.phoneList.innerHTML = Game.social.renderPhone(state);
    el.matchmakingList.innerHTML = Game.matchmaking.render(state);
    el.parentingPanel.innerHTML = Game.parenting.render(state);
    el.educationPanel.innerHTML = Game.educationSystem.render(state);
    el.careerPanel.innerHTML = Game.careerView.renderCareer(state, money);
    el.cityPanel.innerHTML = Game.careerView.renderCities(state);
    el.governmentPanel.innerHTML = Game.civicSystem.render(state);
    el.travelPanel.innerHTML = Game.travelSystem.render(state);
    el.journeyPanel.innerHTML = Game.journeySystem.render(state);
    Game.roleBook.render(state);
    el.propertyPanel.innerHTML = properties(state);
    el.stockPanel.innerHTML = Game.marketView.render(state);
    el.industryPanel.innerHTML = Game.assetsSystem.render(state, money);
    el.healthPanel.innerHTML = Game.healthSystem.render(state);
    el.legacyPanel.innerHTML = Game.legacySystem.render(state);
    Game.drawSettings.render(state);
    Game.profile.render(state, el);
    Game.navigation.refreshDetail();
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
