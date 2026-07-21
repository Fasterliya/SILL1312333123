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
      <small>第${item.editionNumber}届 · ${escape(item.city)} · ${escape(item.scale)}</small>
      <em>${escape(item.organizer.name)}</em></span>
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
      <div><span>${next.year}年度 · 第${next.editionNumber}届</span><strong>${escape(next.name)}</strong>
      <small>${escape(next.country)} · ${escape(next.city)} · ${next.month}月 · ${status.label}
      · 品牌声望 ${next.franchise.prestige}</small></div>
      <button data-convention-calendar><span>查看</span><strong>年度日历</strong></button>
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
      <small>华夏与日本每月均有活动，部分月份同月两场</small></div>
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
  function lineup(item) {
    const partners = [...item.preparation.sponsors, ...item.preparation.guests]
      .map((entry) => entry.name);
    const operations = item.preparation.operations.decisions.map((decision) => (
      Game.conventionCatalog.operationPhases.flatMap((phase) => phase.options)
        .find((option) => option.id === decision.optionId)?.name
    )).filter(Boolean);
    const entries = [...partners, ...operations];
    if (!entries.length) return '';
    return `<section class="convention-zones"><h3>合作与现场安排</h3>
      <div>${entries.map((entry) => `<span>${escape(entry)}</span>`).join('')}</div></section>`;
  }
  function attendanceReview(attendance) {
    const review = attendance?.feedback;
    if (!review) return '';
    const highlights = Array.isArray(review.highlights) && review.highlights.length
      ? review.highlights : ['完成本届漫展路线'];
    return `<section class="convention-zones"><h3>我的本届体验 · ${escape(review.score)}/100 · ${escape(review.label)}</h3>
      <div>${highlights.map((entry) => `<span>${escape(entry)}</span>`).join('')}</div></section>`;
  }
  function detail(state, item) {
    const status = Game.conventionCalendar.status(state, item);
    const registration = state.conventionCalendar?.registrations?.[item.id];
    const attendance = state.conventionCalendar?.attendance?.[item.id];
    const canRegister = ['registration', 'ongoing'].includes(status.id);
    let action = `<button disabled>${status.label}</button>`;
    if (attendance?.completed) action = '<button disabled>本届已参加</button>';
    else if (status.id === 'ongoing' && Game.content.age(state) < 12) {
      action = '<button disabled>12岁后可独立参加</button>';
    } else if (status.id === 'ongoing') {
      action = `<button data-convention-attend="${escape(item.id)}">购票前往 · ${Game.view.money(item.ticketPrice)}</button>`;
    } else if (canRegister) {
      action = `<button data-convention-register="${escape(item.id)}">${registration ? '更新报名' : '确认报名'}</button>`;
    }
    return `<section class="convention-detail-head"><span>${item.year} · ${item.country} · ${item.month}月</span>
      <strong>${escape(item.name)}</strong><small>${escape(item.themeName)} · ${escape(item.scale)} · ${status.label}</small></section>
      <dl class="convention-detail-grid"><div><dt>举办城市</dt><dd>${escape(item.city)}</dd></div>
      <div><dt>承办公司</dt><dd>${escape(item.organizer.name)}</dd></div>
      <div><dt>门票与往返</dt><dd>${Game.view.money(item.ticketPrice)}</dd></div>
      <div><dt>筹备质量</dt><dd>${item.preparation.quality}/100</dd></div>
      <div><dt>安全准备</dt><dd>${item.preparation.safety}/100</dd></div>
      <div><dt>宣传热度</dt><dd>${item.preparation.promotion}/100</dd></div></dl>
      <dl class="convention-detail-grid"><div><dt>品牌声望</dt><dd>${item.franchise.prestige}/100</dd></div>
      <div><dt>粉丝基础</dt><dd>${item.franchise.fanbase}/100</dd></div></dl>
      <section class="convention-zones"><h3>开放展区</h3><div>${item.zones.map((zone) => (
        `<span>${escape(zone)}</span>`)).join('')}</div></section>
      ${lineup(item)}
      ${attendanceReview(attendance)}
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
