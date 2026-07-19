(function initRoleBook(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let filter = 'city';
  let getState = () => null;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function isClassmate(person) {
    return person.relation === '同学' || person.relation === '校友'
      || Boolean(person.schoolHistory?.length);
  }

  function peopleFor(state) {
    const all = Game.people.all(state).filter((person) => person.id !== 'player-profile');
    if (filter === 'city') return Game.socialWorld.cityPeople(state, state.location.city);
    if (filter === 'school') return all.filter(isClassmate);
    if (filter === 'work') return all.filter((person) => (
      state.career.company && person.company === state.career.company
    ));
    if (filter === 'contact') return all.filter((person) => person.phoneUnlocked);
    return all;
  }

  function card(state, person) {
    const local = person.currentCity === state.location.city;
    const reachable = person.phoneUnlocked || person.school === state.education.school
      || Game.people.isExternal(state, person) || state.family.some((item) => item.id === person.id);
    const place = person.currentCity || person.careerCity || person.homeCity || '去向未明';
    const status = reachable ? '可联系' : (local ? '同城，可尝试重逢' : '未留联系方式');
    return `<article class="directory-person">
      <button class="person-avatar" type="button" data-character-id="${escape(person.id)}"
        aria-label="查看${escape(person.name)}详情">${Game.portraitSystem.avatar(person)}</button>
      <div><strong>${escape(person.name)}</strong><span>${escape(person.relation)} · ${escape(place)}</span>
      <small>${escape(person.job || person.educationName || person.school || '当地生活')} · ${status}</small></div>
      <button class="directory-open" type="button" data-character-id="${escape(person.id)}">查看</button>
    </article>`;
  }

  function render(state) {
    const host = document.getElementById('roleBookPanel');
    if (!host) return;
    const filters = [
      ['city', '当前城市'], ['school', '同窗校友'], ['work', '同事'],
      ['contact', '可联系'], ['all', '全部人物'],
    ];
    const source = peopleFor(state);
    const people = filter === 'city' ? source : source.slice(0, 100);
    host.innerHTML = `<section class="list-guide"><strong>${escape(state.location.city)}人物网络</strong>
      <span>本地居民完整模拟 ${source.length} 人；异地城市使用轻量档案推进。同窗迁居后仍会保留。</span></section>
      <nav class="filter-chips">${filters.map(([id, label]) => (
        `<button class="${filter === id ? 'active' : ''}" data-role-filter="${id}">${label}</button>`
      )).join('')}</nav><div class="directory-list">${people.length
      ? people.map((person) => card(state, person)).join('')
      : '<p class="empty-state">当前分类还没有人物。</p>'}</div>`;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-role-filter]');
    if (!button) return false;
    filter = button.dataset.roleFilter;
    render(getState());
    return true;
  }

  function configure(options) { getState = options.getState; }

  Game.roleBook = Object.freeze({ configure, render, handleClick });
}(window));
