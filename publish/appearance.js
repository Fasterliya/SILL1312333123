(function initAppearance(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const catalog = Game.appearanceCatalog;
  const filters = ['适龄', '全部', '校园', '休闲', '运动', '正式', '文艺', '保暖', '和风', '传统', '短发', '长发', '旅行'];
  const labels = {
    hairColor: '发色', temperament: '气质', bodyType: '身材', hairstyle: '发型',
    'clothing.top': '身穿', 'clothing.socks': '袜子', 'clothing.shoes': '鞋',
  };
  let api = null;
  let activeField = '';
  let activeFilter = '适龄';

  function keyFor(field) {
    return field.startsWith('clothing.') ? field.split('.')[1] : field;
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

  function render() {
    const state = api.getState();
    const profile = state.profile;
    const years = Game.content.age(state);
    const key = keyFor(activeField);
    const selected = currentValue(profile, activeField);
    const items = (catalog[key] || []).filter((entry) => visible(entry, years))
      .sort((a, b) => Number(recommended(b, profile, years)) - Number(recommended(a, profile, years)));
    const chips = filters.map((filter) => (
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
      <section class="selector-guide"><strong>${profile.personality}性格 · ${profile.trait}特质</strong>
      <span>推荐项会结合年龄、性格、特质与气质排序。</span></section>
      <nav class="filter-chips" aria-label="造型筛选">${chips}</nav>
      <section class="style-options">${list}</section>`, 'selector');
  }

  function open(field) {
    if (!labels[field] || !catalog[keyFor(field)]) return;
    activeField = field;
    activeFilter = '适龄';
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
    if (Game.profile.edit(activeField, option.dataset.styleValue)) {
      Game.navigation.closeDetail();
      Game.view.showToast(`${label}已更换`, 'good');
    }
    activeField = '';
    return true;
  }

  function configure(options) { api = options; }

  Game.appearance = Object.freeze({ configure, open, handleClick });
}(window));
