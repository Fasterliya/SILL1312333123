(function initNavigation(root) {
  'use strict';
  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const el = {};
  let api = null;
  let activeCharacterId = null;
  let detailMode = '';
  let characterHistory = [];
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }
  function init() {
    ['moduleScreen', 'moduleTitle', 'moduleContent', 'moduleBackBtn',
      'detailScreen', 'detailTitle', 'detailContent', 'detailBackBtn'].forEach((id) => {
      el[id] = document.getElementById(id);
    });
    if (Object.values(el).some((item) => !item)) throw new Error('全屏子菜单结构不完整');
    el.moduleBackBtn.addEventListener('click', closeModule);
    el.detailBackBtn.addEventListener('click', closeDetail);
  }
  function openModule(id, title) {
    const target = document.getElementById(id);
    if (!target?.classList.contains('module-view')) return;
    el.moduleContent.querySelectorAll('.module-view').forEach((item) => {
      item.classList.toggle('active', item === target);
    });
    el.moduleTitle.textContent = title || '子菜单';
    el.moduleScreen.hidden = false;
    el.moduleContent.scrollTop = 0;
  }
  function clearDetail() {
    el.detailScreen.hidden = true;
    el.detailContent.innerHTML = '';
    activeCharacterId = null;
    detailMode = '';
    characterHistory = [];
  }
  function closeModule() {
    clearDetail();
    el.moduleScreen.hidden = true;
  }
  function openDetail(title, html, mode) {
    detailMode = mode || 'generic';
    activeCharacterId = detailMode === 'character' ? activeCharacterId : null;
    if (detailMode !== 'character') characterHistory = [];
    el.detailTitle.textContent = title;
    el.detailContent.innerHTML = html || '';
    el.detailScreen.hidden = false;
    el.detailContent.scrollTop = 0;
  }
  function closeDetail() {
    if (detailMode === 'character' && characterHistory.length) {
      const previousId = characterHistory.pop();
      activeCharacterId = previousId;
      const previous = findCharacter(api.getState(), previousId);
      if (previous) {
        el.detailContent.innerHTML = characterHtml(api.getState(), previous);
        el.detailContent.scrollTop = 0;
        return;
      }
    }
    clearDetail();
  }
  function findCharacter(state, id) {
    return Game.people.find(state, id);
  }
  function detailActions(state, person) {
    if (person.status === '已故') return '<button disabled>追忆</button>';
    if (person.skinCaptured) return '<button disabled>人生已夺取</button>';
    const hunter = Game.hunterMode.detailAction(state, person);
    if (state.family.some((item) => item.id === person.id)) {
      return hunter + Game.familySystem.detailActions(state, person).map(([type, label]) => (
        `<button data-detail-family="${escape(person.id)}" data-family-action="${type}">${label}</button>`
      )).join('');
    }
    return hunter + Game.social.detailActions(state, person).map(([type, label]) => (
      `<button data-detail-contact="${escape(person.id)}" data-contact-action="${type}">${label}</button>`
    )).join('');
  }
  function characterHtml(state, person) {
    if (Game.lifeResume) Game.lifeResume.backfillResume(state, person);
    Game.characterAttributes.ensurePerson(person, U.personAge(state, person));
    const resumeCount = person.lifeResume?.length || 0;
    const effective = (field) => Game.cosplayCatalog.effectiveValue(person, field);
    const labels = {
      cosplay: 'COS服', hairColor: '发色', temperament: '气质', bodyType: '身材', hairstyle: '发型',
      'clothing.top': '身穿', 'clothing.socks': '袜子', 'clothing.shoes': '鞋',
    };
    const genderLabel = person.specterPossessed && person.gender === '女'
      && person.specterOriginalGender === '男' ? '女（前男性）' : person.gender;
    const identity = [
      ['关系', person.relation], ['年龄', `${U.personAge(state, person)}岁`], ['性别', genderLabel],
      ['曾用名', [...new Set([person.birthName, ...(person.nameHistory || []).map((item) => item.from)]
        .filter((name) => name && name !== person.name))].join('、') || '无'],
      ['文化偏好', person.culturePreference || '无特别倾向'],
      ['身高', `${Number(person.height || 0).toFixed(1)} cm`],
      ['体重', `${Number(person.weight || 0).toFixed(1)} kg`],
      ['成长身高', `${Number(person.maxHeight || 0).toFixed(1)} cm`],
      ['性格', person.personality], ['特质', person.trait], ['状态', person.status],
      ...(person.cradleTaskId ? [
        ['身体改造', `${person.cradleBodyProgress}% · ${Game.cradleNetworkCharacters.bodyStage(person.cradleBodyProgress)}`],
        ['意识改造', `${person.cradleMindProgress}% · ${Game.cradleNetworkCharacters.mindStage(person.cradleMindProgress)}`],
      ] : []),
    ];
    const attributes = [
      ['健康状态', Game.healthModel.npcStatus(state, person)],
      ...Game.abilityView.abilityRows(person),
      ...Game.abilityView.traitRows(person),
    ];
    const life = [
      ['当前学业', person.educationName || person.school || '-'],
      ['职业', person.job || '-'], ['公司', person.company || '-'],
      ['工作城市', person.careerCity || '-'],
      ...(person.specialCharacter ? [
        ['家境', person.familyBackground],
        ['家庭资产', Game.worldCulture.format(person.familyWealth, person.culture || '华夏')],
      ] : []),
      ['婚姻', person.npcMarried ? `已婚 · ${person.spouseName || '伴侣'}` : '未婚'],
      ...(person.gender === '女' ? [[person.npcMarried ? '生育力' : '择偶标准',
        person.npcMarried ? `${Game.demography.fertility(state, person)}%` : `${person.marriageStandard}/100`]] : []),
      ['子女', `${person.childrenCount || 0}人`],
      ['好感', person.affection], ['互动次数', person.interactions],
    ];
    const looks = [
      ['COS服', person.cosplay || '无'],
      ['发色', effective('hairColor')], ['发型', effective('hairstyle')], ['气质', person.temperament],
      ['瞳色', person.eyeColor], ['脸型', person.faceShape], ['五官比例', person.featureProportions],
      ['身材', person.bodyType], ['身穿', effective('clothing.top')], ['袜子', effective('clothing.socks')],
      ['鞋', effective('clothing.shoes')],
    ];
    const creatorStyle = Game.npcCreatorStyle?.statusRows(state, person) || [];
    const inherited = [
      ['DNA编码', person.genetics?.code || '-'], ['遗传骨架', person.bodyFrame],
      ['发育倾向', person.developmentTendency], ['痣', person.molePosition],
      ['雀斑', person.freckles], ['个人特征', person.distinctiveFeature],
      ['先天特质', Game.congenitalTraits.names(person, person.gender).join(' · ') || '无显著先天特质'],
      ['基因变异', person.genetics?.mutations?.length ? `${person.genetics.mutations.length}项` : '未检测到'],
    ];
    const editor = Object.entries(labels).map(([field, label]) => {
      const covered = Game.cosplayCatalog.overrides(person, field);
      const disabled = covered || person.status === '已故';
      return `<button class="selector-row" data-selector-field="${field}" ${disabled ? 'disabled' : ''}
        data-selector-target="${escape(person.id)}"><span>${label}</span>
        <strong>${escape(effective(field) || '-')}</strong><b aria-hidden="true">${covered ? '覆' : '›'}</b></button>`;
    }).join('');
    const section = (title, hint, rows, open) => `<details class="record-section" ${open ? 'open' : ''}>
      <summary><span>${title}</span><small>${hint}</small></summary><div class="record-grid">${rows.map(([label, value]) => (
        `<div><span>${escape(label)}</span><strong>${escape(value || '-')}</strong></div>`
      )).join('')}</div></details>`;
    return `${Game.portraitSystem.npcHtml(state, person)}<section class="character-hero ${person.status === '已故' ? 'deceased' : ''}">
      <div class="character-avatar">${person.status === '已故' ? '故' : escape(person.name.slice(-1))}</div>
      <div><p>${escape(person.relation)}</p><h3>${escape(person.name)}</h3>
      <span>${escape(person.personality)} · ${escape(person.trait)}</span></div></section>
      <div class="record-stack">${section('基本档案', '身份与成长', identity, true)}
      ${section('角色属性', '健康状态与固有属性', attributes, true)}
      ${section('外貌表现', '当前实际外观', looks, false)}
      ${creatorStyle.length ? section('职业造型计划', '主动换装、恢复与冷却', creatorStyle, true) : ''}
      ${section('遗传信息', 'DNA 与成长倾向', inherited, false)}
      ${section('人生状态', '学业、职业与家庭', life, false)}
      <details class="record-section resume-section" open><summary><span>人生履历</span>
      <small>${resumeCount}项记录</small></summary>
      ${Game.lifeResume ? Game.lifeResume.renderResume(person) : ''}</details>
      ${Game.familyLinks.render(state, person)}
      ${Game.workplace.personSection(state, person)}
      ${Game.relationshipSecretsView.render(state, person)}</div>
      <details class="record-section npc-editor"><summary><span>编辑角色外观</span>
      <small>COS 与独立穿搭</small></summary><div class="profile-editor">${editor}
      ${Game.plasticSurgery.renderNpcPortraitStages(state, person)}</div></details>
      <details class="interaction-menu detail-interactions"><summary>互动选项</summary>
      <div class="interaction-options">${detailActions(state, person)}</div></details>`;
  }
  function openCharacter(id) {
    const state = api.getState();
    const person = findCharacter(state, id);
    if (!person) return;
    if (detailMode === 'character' && !el.detailScreen.hidden && activeCharacterId !== id) {
      characterHistory.push(activeCharacterId);
    } else if (detailMode !== 'character' || el.detailScreen.hidden) characterHistory = [];
    if (Game.familyLinks.materialize(state, person)) api.save();
    activeCharacterId = id;
    openDetail('角色详情', characterHtml(state, person), 'character');
    activeCharacterId = id;
  }
  function refreshDetail() {
    if (detailMode !== 'character' || !activeCharacterId || el.detailScreen.hidden) return;
    const person = findCharacter(api.getState(), activeCharacterId);
    if (!person) return closeDetail();
    el.detailContent.innerHTML = characterHtml(api.getState(), person);
  }
  function configure(options) { api = options; }
  Game.navigation = Object.freeze({
    configure, init, openModule, closeModule, openDetail, closeDetail,
    openCharacter, refreshDetail,
  });
}(window));
