(function initNavigation(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const el = {};
  let api = null;
  let activeCharacterId = null;
  let detailMode = '';

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

  function closeModule() {
    closeDetail();
    el.moduleScreen.hidden = true;
  }

  function openDetail(title, html, mode) {
    detailMode = mode || 'generic';
    activeCharacterId = detailMode === 'character' ? activeCharacterId : null;
    el.detailTitle.textContent = title;
    el.detailContent.innerHTML = html || '';
    el.detailScreen.hidden = false;
    el.detailContent.scrollTop = 0;
  }

  function closeDetail() {
    el.detailScreen.hidden = true;
    el.detailContent.innerHTML = '';
    activeCharacterId = null;
    detailMode = '';
  }

  function findCharacter(state, id) {
    return [...state.family, ...state.contacts].find((person) => person.id === id) || null;
  }

  function detailActions(state, person) {
    if (state.family.some((item) => item.id === person.id)) {
      const disabled = person.status === '已故' ? 'disabled' : '';
      if (disabled) return `<button disabled>追忆</button>`;
      return Game.familySystem.detailActions(state, person).map(([type, label]) => (
        `<button data-detail-family="${escape(person.id)}" data-family-action="${type}">${label}</button>`
      )).join('');
    }
    return Game.social.detailActions(state, person).map(([type, label]) => (
      `<button data-detail-contact="${escape(person.id)}" data-contact-action="${type}">${label}</button>`
    )).join('');
  }

  function characterHtml(state, person) {
    const clothes = person.clothing || {};
    const labels = {
      hairColor: '发色', temperament: '气质', bodyType: '身材', hairstyle: '发型',
      'clothing.top': '身穿', 'clothing.socks': '袜子', 'clothing.shoes': '鞋',
    };
    const rows = [
      ['关系', person.relation], ['年龄', `${U.personAge(state, person)}岁`], ['性别', person.gender],
      ['性格', person.personality], ['特质', person.trait], ['状态', person.status],
      ['当前学业', person.educationName || person.school || '-'],
      ['职业', person.job || '-'], ['公司', person.company || '-'],
      ['工作城市', person.careerCity || '-'],
      ['婚姻', person.npcMarried ? `已婚 · ${person.spouseName || '伴侣'}` : '未婚'],
      ['子女', `${person.childrenCount || 0}人`],
      ['发色', person.hairColor], ['发型', person.hairstyle], ['气质', person.temperament],
      ['身材', person.bodyType], ['身穿', clothes.top || '-'], ['袜子', clothes.socks || '-'],
      ['鞋', clothes.shoes || '-'], ['好感', person.affection], ['互动次数', person.interactions],
    ];
    const editor = Object.entries(labels).map(([field, label]) => {
      const key = field.startsWith('clothing.') ? field.split('.')[1] : field;
      const value = field.startsWith('clothing.') ? clothes[key] : person[key];
      return `<button class="selector-row" data-selector-field="${field}"
        data-selector-target="${escape(person.id)}"><span>${label}</span>
        <strong>${escape(value || '-')}</strong><b aria-hidden="true">›</b></button>`;
    }).join('');
    return `${Game.portraitSystem.npcHtml(state, person)}<section class="character-hero">
      <div class="character-avatar">${escape(person.name.slice(-1))}</div>
      <div><p>${escape(person.relation)}</p><h3>${escape(person.name)}</h3>
      <span>${escape(person.personality)} · ${escape(person.trait)}</span></div></section>
      <section class="detail-facts">${rows.map(([label, value]) => (
        `<div><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`
      )).join('')}</section>
      <section class="panel npc-editor"><div class="panel-title"><h3>编辑角色外观</h3>
      <span>发型、身材与三部位穿搭</span></div><div class="profile-editor">${editor}</div></section>
      <section class="detail-actions">${detailActions(state, person)}</section>`;
  }

  function openCharacter(id) {
    const state = api.getState();
    const person = findCharacter(state, id);
    if (!person) return;
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
