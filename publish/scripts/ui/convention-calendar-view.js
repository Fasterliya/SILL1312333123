(function initConventionCalendarView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let calendarOpen = false;
  let filter = 'all';
  let yearOffset = 0;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  function filtered(state, items) {
    if (filter === 'country') return items.filter((item) => item.country === state.location.country);
    if (filter === 'only') return items.filter((item) => item.kind === 'only');
    if (filter === 'upcoming') return items.filter((item) => (
      ['registration', 'ongoing', 'announced'].includes(Game.conventionCalendar.status(state, item).id)
    ));
    return items;
  }
  function statusClass(id) {
    return ['ongoing', 'registration'].includes(id) ? id : '';
  }
  function row(state, item) {
    const status = Game.conventionCalendar.status(state, item);
    const attended = state.conventionCalendar?.attendance?.[item.id]?.completed;
    return `<button class="convention-calendar-row" data-convention-detail="${escape(item.id)}">
      <span class="convention-date"><b>${item.month}月</b><small>${escape(item.country)}</small></span>
      <span class="convention-main"><strong>${escape(item.name)}</strong>
      <small>${escape(item.city)} · ${escape(item.scale)} · ${escape(item.organizer.name)}</small></span>
      <span class="convention-status ${statusClass(status.id)}">${attended ? '已参加' : status.label}</span>
    </button>`;
  }
  function summary(state) {
    const items = Game.conventionCalendar.list(state);
    const current = items.find((item) => (
      item.country === state.location.country
      && Game.conventionCalendar.status(state, item).id === 'ongoing'
    ));
    const next = current || items.find((item) => (
      item.country === state.location.country && item.month >= state.month
    )) || items.find((item) => item.month >= state.month) || Game.conventionCalendar.list(state, state.year + 1)[0];
    const status = Game.conventionCalendar.status(state, next);
    return `<section class="convention-calendar-summary">
      <div><span>${next.year}年度漫展</span><strong>${escape(next.name)}</strong>
      <small>${escape(next.country)} · ${escape(next.city)} · ${next.month}月 · ${status.label}</small></div>
      <button data-convention-calendar>年度日历</button>
    </section>`;
  }
  function calendar(state) {
    const year = state.year + yearOffset;
    const items = filtered(state, Game.conventionCalendar.list(state, year));
    const filters = [
      ['all', '全部'], ['country', '当前国家'], ['upcoming', '未结束'], ['only', 'Only展'],
    ].map(([id, label]) => (
      `<button class="${filter === id ? 'active' : ''}" data-convention-filter="${id}">${label}</button>`
    )).join('');
    return `<section class="convention-calendar-head">
      <button data-convention-back aria-label="返回街区">‹</button>
      <div><span>全球年度排期</span><strong>${year}年漫展日历</strong>
      <small>每个国家每年固定举办一届</small></div>
      <nav><button data-convention-year="-1">上年</button>
      <button data-convention-year="0">今年</button><button data-convention-year="1">下年</button></nav>
    </section><nav class="filter-chips">${filters}</nav>
    <div class="convention-calendar-list">${items.map((item) => row(state, item)).join('')
      || '<p class="empty-state">当前筛选没有漫展。</p>'}</div>`;
  }
  function wrap(state, streetHtml) {
    Game.conventionCalendar.ensure(state);
    return calendarOpen ? calendar(state) : `${summary(state)}${streetHtml}`;
  }
  function optionList(items, selected) {
    return items.map((item) => (
      `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${escape(item.name)}</option>`
    )).join('');
  }
  function detail(state, item) {
    const status = Game.conventionCalendar.status(state, item);
    const registration = state.conventionCalendar?.registrations?.[item.id];
    const attendance = state.conventionCalendar?.attendance?.[item.id];
    const locationReady = item.city === state.location.city;
    const canRegister = ['registration', 'ongoing'].includes(status.id);
    let action = `<button disabled>${status.label}</button>`;
    if (attendance?.completed) action = '<button disabled>本届已参加</button>';
    else if (status.id === 'ongoing' && Game.content.age(state) < 12) {
      action = '<button disabled>12岁后可独立参加</button>';
    } else if (status.id === 'ongoing' && locationReady) {
      action = `<button data-convention-attend="${escape(item.id)}">购票入场 · ${Game.view.money(item.ticketPrice)}</button>`;
    } else if (status.id === 'ongoing') action = `<button disabled>需先前往${escape(item.city)}</button>`;
    else if (canRegister) {
      action = `<button data-convention-register="${escape(item.id)}">${registration ? '更新报名' : '确认报名'}</button>`;
    }
    return `<section class="convention-detail-head"><span>${item.year} · ${item.country} · ${item.month}月</span>
      <strong>${escape(item.name)}</strong><small>${escape(item.themeName)} · ${escape(item.scale)} · ${status.label}</small></section>
      <dl class="convention-detail-grid"><div><dt>举办城市</dt><dd>${escape(item.city)}</dd></div>
      <div><dt>承办公司</dt><dd>${escape(item.organizer.name)}</dd></div>
      <div><dt>门票</dt><dd>${Game.view.money(item.ticketPrice)}</dd></div>
      <div><dt>筹备质量</dt><dd>${item.preparation.quality}/100</dd></div>
      <div><dt>安全准备</dt><dd>${item.preparation.safety}/100</dd></div>
      <div><dt>宣传热度</dt><dd>${item.preparation.promotion}/100</dd></div></dl>
      <section class="convention-zones"><h3>开放展区</h3><div>${item.zones.map((zone) => (
        `<span>${escape(zone)}</span>`)).join('')}</div></section>
      <div class="convention-registration"><label>参展身份<select data-convention-role>
      ${optionList(Game.conventionCatalog.roles, registration?.role || 'visitor')}</select></label>
      <label>参展目的<select data-convention-intent>
      ${optionList(Game.conventionCatalog.intents, registration?.intent || 'social')}</select></label></div>
      <div class="detail-actions">${action}</div>`;
  }
  function setOpen(value) { calendarOpen = Boolean(value); }
  function setFilter(value) {
    if (['all', 'country', 'upcoming', 'only'].includes(value)) filter = value;
  }
  function changeYear(value) {
    yearOffset = Math.max(-1, Math.min(1, Number(value) || 0));
  }

  Game.conventionCalendarView = Object.freeze({
    wrap, detail, setOpen, setFilter, changeYear,
  });
}(window));
