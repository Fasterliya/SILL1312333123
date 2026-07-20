(function initView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const ids = [
    'profileName', 'profileMeta', 'ageValue', 'stageValue', 'moneyValue', 'lifeDate',
    'statGrid', 'eventList', 'familyList', 'classmatesList', 'phoneList',
    'quickStudyPanel',
    'matchmakingList', 'educationPanel', 'careerPanel', 'cityPanel', 'governmentPanel', 'travelPanel', 'journeyPanel',
    'propertyPanel', 'stockPanel', 'industryPanel', 'parentingPanel', 'healthPanel', 'legacyPanel',
    'statusPanel', 'financePanel', 'npcEventContainer',
    'hunterModePanel', 'possessedList',
    'portraitSlot', 'portraitStatus', 'generatePortraitBtn', 'profileFacts',
    'portraitPromptInput', 'profileEditor', 'traitGrid', 'geneFacts', 'decision', 'decisionTitle', 'decisionText',
    'decisionBody', 'examJumpBtn', 'timeBar', 'staminaRing', 'toast', 'tabPages',
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
    const activeSkin = Game.hunterMode.active(state);
    const household = activeSkin ? '' : Game.householdSystem.render(state);
    const members = activeSkin ? Game.hunterMode.socialPeople(state, activeSkin).map((link) => ({
      ...link.person, relation: link.kind,
    })) : state.family;
    const summary = activeSkin
      ? `<div class="detail-row family-wealth"><span>继承社会关系</span><b>${members.length}人</b></div>`
      : `<div class="detail-row family-wealth"><span>原生家庭资产</span><b>${money(state.familyWealth)}</b></div>`;
    const partner = Game.people.find(state, state.romance.partnerId);
    const stats = Game.demography.conceptionStats(state, partner);
    const birthStatus = state.romance.pendingBirth
      ? `孕期剩余 ${state.romance.pendingBirth}个月${state.romance.pendingBabies === 2 ? ' · 双胞胎' : ''}`
      : (state.romance.conceptionCooldown > 0 ? `产后恢复 ${state.romance.conceptionCooldown}个月`
        : `月受孕率 ${stats.monthlyPercent}% · 连续12月累计 ${stats.annualPercent}%`);
    const fertility = !activeSkin && state.romance.married
      ? `<div class="detail-row"><span>自然生育</span><b>${birthStatus}</b></div>` : '';
    return household + summary + fertility + members.map((item) => {
      const actions = activeSkin ? `<button data-character-id="${item.id}">查看档案</button>`
        : (item.status === '已故' ? '<button disabled>追忆</button>'
        : Game.familySystem.detailActions(state, item).map(([type, label]) => (
          `<button data-detail-family="${item.id}" data-family-action="${type}">${label}</button>`
        )).join(''));
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

  function render(state) {
    currentCountry = state.location.country || '华夏';
    const years = U.age(state);
    const identity = Game.hunterMode.identity(state);
    el.profileName.textContent = identity.name;
    el.profileMeta.textContent = identity.skin ? `夺舍身份 · ${identity.gender} · ${identity.profile.personality}`
      : `${state.gender} · ${state.location.country || '华夏'} ${state.location.city}`;
    el.ageValue.textContent = `${years}岁${Game.timeSystem.ageMonths(state) % 12}月`;
    el.stageValue.textContent = Game.timeSystem.stageLabel(state);
    el.moneyValue.textContent = money(state.money);
    el.moneyValue.classList.toggle('debt', state.money < 0);
    el.lifeDate.textContent = `${state.year}年${state.month}月`;
    el.statGrid.innerHTML = statCards(state);
    const quickStudy = Game.educationSystem.renderQuick(state);
    el.quickStudyPanel.innerHTML = quickStudy;
    el.quickStudyPanel.hidden = !quickStudy;
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
    Game.hunterMode.render(state);
    el.propertyPanel.innerHTML = Game.propertySystem.render(state);
    el.stockPanel.innerHTML = Game.marketView.render(state);
    el.industryPanel.innerHTML = Game.assetsSystem.render(state, money);
    el.healthPanel.innerHTML = Game.healthSystem.render(state);
    el.statusPanel.innerHTML = Game.systemHub.renderStatus(state);
    el.financePanel.innerHTML = Game.systemHub.renderFinance(state);
    Game.npcInitiative.setStateRef(state);
    Game.taskCenter?.updateTrigger(state);
    el.npcEventContainer.innerHTML = Game.npcInitiative.renderEventBadge(state);
    el.legacyPanel.innerHTML = Game.legacySystem.render(state);
    Game.drawSettings.render(state);
    Game.profile.render(state, el);
    Game.navigation.refreshDetail();
    Game.educationFastForward.updateButton(state, el.examJumpBtn);
    renderTimeBar(state);
    if (state.stamina && el.staminaRing) {
      var pct = state.stamina.current / state.stamina.max * 100;
      var offset = 251 * (1 - pct/100);
      var fg = el.staminaRing.querySelector('.stamina-fg');
      if (fg) fg.setAttribute('stroke-dashoffset', offset);
      var span = el.staminaRing.querySelector('span');
      if (span) span.textContent = state.stamina.current + '/' + state.stamina.max;
      el.staminaRing.style.display = 'block';
    }
  }

  function renderTimeBar(state) {
    var s = state.timeSpeed || 0;
    var d = state.day || 1;
    var speeds = [[0,'⏸'],[1,'▶'],[5,'▶▶'],[10,'▶▶▶']];
    el.timeBar.innerHTML = '<span class="time-date">' + state.year + '年' + state.month + '月' + d + '日</span>'
      + '<div class="time-progress"><i class="bar-track"><b style="width:' + (d*100/30) + '%"></b></i>'
      + '<small>本月剩余 ' + (30-d) + ' 天</small></div>'
      + '<div class="time-controls">' + speeds.map(function(sp) {
        return '<button data-time-speed="' + sp[0] + '" class="' + (s===sp[0]?'active':'') + '">' + sp[1] + '</button>';
      }).join('') + '</div>';
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
