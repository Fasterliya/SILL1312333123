(function initAppearance(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const catalog = Game.appearanceCatalog;
  const filters = ['适龄', '全部', '校园', '休闲', '运动', '正式', '文艺', '保暖', '和风', '传统', '短发', '长发', '旅行'];
  const labels = {
    cosplay: 'COS服', hairColor: '发色', temperament: '气质', bodyType: '身材', hairstyle: '发型',
    'clothing.top': '身穿', 'clothing.socks': '袜子', 'clothing.shoes': '鞋',
  };
  let api = null;
  let activeField = '';
  let activeFilter = '适龄';
  let activeTargetId = '';

  function keyFor(field) {
    return field.startsWith('clothing.') ? field.split('.')[1] : field;
  }

  function optionsFor(key) {
    return key === 'cosplay' ? Game.cosplayCatalog.items : catalog[key];
  }

  function currentValue(profile, field) {
    return field.startsWith('clothing.') ? profile.clothing[keyFor(field)] : profile[field];
  }

  function recommended(item, profile, years) {
    const ageMatch = years >= item.minAge && years <= item.maxAge;
    const personMatch = item.personalities.includes(profile.personality)
      || item.personalities.includes(profile.trait);
    return ageMatch && (personMatch || item.temperaments.includes(profile.temperament));
  }

  function visible(item, years) {
    if (activeFilter === '全部') return true;
    if (activeFilter === '适龄') return years >= item.minAge && years <= item.maxAge;
    return item.tags.includes(activeFilter) && years >= item.minAge && years <= item.maxAge;
  }

  function bodyMatches(item, profile) {
    if (activeField !== 'bodyType') return true;
    const female = ['幼小', '小胸', '丰满', '匀称', '娇小纤细'];
    const male = ['幼小', '清瘦', '匀称', '健壮'];
    return (profile.gender === '女' ? female : male).includes(item.name);
  }

  function render() {
    const state = api.getState();
    const profile = activeTargetId
      ? Game.people.find(state, activeTargetId)
      : state.profile;
    if (!profile) return Game.navigation.closeDetail();
    const years = activeTargetId ? Game.content.personAge(state, profile) : Game.content.age(state);
    const key = keyFor(activeField);
    const selected = currentValue(profile, activeField);
    const items = (optionsFor(key) || []).filter((entry) => visible(entry, years) && bodyMatches(entry, {
      ...profile,
      gender: activeTargetId ? profile.gender : state.gender,
    }))
      .sort((a, b) => Number(recommended(b, profile, years)) - Number(recommended(a, profile, years)));
    const availableFilters = activeField === 'cosplay' ? ['全部', '东方Project', '星穹铁道', '鸣潮'] : filters;
    const chips = availableFilters.map((filter) => (
      `<button class="${filter === activeFilter ? 'active' : ''}" data-style-filter="${filter}">${filter}</button>`
    )).join('');
    const list = items.length ? items.map((entry) => {
      const isRecommended = recommended(entry, profile, years);
      const age = entry.maxAge >= 120 ? `${entry.minAge}岁起` : `${entry.minAge}-${entry.maxAge}岁`;
      return `<button class="style-option ${entry.name === selected ? 'selected' : ''}"
        data-style-value="${entry.name}"><span><strong>${entry.name}</strong>
        <small>${entry.tags.join(' · ')} · ${age}</small></span>
        ${isRecommended ? '<b>推荐</b>' : ''}<i>${entry.name === selected ? '已选' : '选择'}</i></button>`;
    }).join('') : '<p class="empty-state">当前筛选下没有适龄选项。</p>';
    Game.navigation.openDetail(`选择${labels[activeField]}`, `
      <section class="selector-guide"><strong>${activeField === 'cosplay' ? 'COS模式会覆盖绘图造型提示' : `${profile.personality}性格 · ${profile.trait}特质`}</strong>
      <span>${activeField === 'cosplay' ? '选择无可恢复角色原本的发型与三部位服装提示。' : '推荐项会结合年龄、性格、特质与气质排序。'}</span></section>
      <nav class="filter-chips" aria-label="造型筛选">${chips}</nav>
      <section class="style-options">${list}</section>`, 'selector');
  }

  function open(field, targetId) {
    if (!labels[field] || !optionsFor(keyFor(field))) return;
    const state = api.getState();
    const profile = targetId
      ? Game.people.find(state, targetId)
      : state.profile;
    if (!profile || Game.cosplayCatalog.overrides(profile, field)) {
      Game.view.showToast('当前造型由COS服覆盖，取消COS后可以编辑', 'warning');
      return;
    }
    activeField = field;
    activeTargetId = targetId || '';
    activeFilter = field === 'cosplay' ? '全部' : '适龄';
    render();
  }

  function handleClick(event) {
    const filter = event.target.closest('[data-style-filter]');
    if (filter && activeField) {
      activeFilter = filter.dataset.styleFilter;
      render();
      return true;
    }
    const option = event.target.closest('[data-style-value]');
    if (!option || !activeField) return false;
    const label = labels[activeField];
    const targetId = activeTargetId;
    if (Game.profile.editTarget(activeField, option.dataset.styleValue, targetId)) {
      if (targetId) Game.navigation.openCharacter(targetId);
      else Game.navigation.closeDetail();
      Game.view.showToast(`${label}已更换`, 'good');
    }
    activeField = '';
    activeTargetId = '';
    return true;
  }

  function configure(options) { api = options; }

  Game.appearance = Object.freeze({ configure, open, handleClick });
}(window));
