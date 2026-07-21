(function initConventionCompanyView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  function metric(label, value) {
    return `<div><span>${label}</span><b>${Math.round(value)}/100</b></div>`;
  }
  function prepOptions(event, company) {
    const stage = Game.conventionCompany.nextStage(event.preparation);
    if (!stage) return '<p class="convention-company-ready">筹备方案已经完成，等待举办。</p>';
    return `<div class="convention-prep-stage"><header><span>当前阶段</span><strong>${stage.name}</strong></header>
      <div>${stage.options.map((option) => (
        `<button data-convention-prep="${escape(event.id)}|${escape(company.id)}|${option.id}">
        <strong>${option.name}</strong><small>${Game.view.money(option.cost)}</small></button>`
      )).join('')}</div></div>`;
  }
  function contractCard(state, event, company) {
    const status = Game.conventionCalendar.status(state, event);
    return `<article class="convention-contract">
      <header><div><span>${event.year}年${event.month}月 · ${event.city}</span>
      <strong>${escape(event.name)}</strong></div><b>${status.label}</b></header>
      <div class="convention-prep-metrics">${metric('质量', event.preparation.quality)}
      ${metric('安全', event.preparation.safety)}${metric('宣传', event.preparation.promotion)}</div>
      ${['ongoing', 'ended'].includes(status.id) ? '' : prepOptions(event, company)}
    </article>`;
  }
  function tenderCard(state, event, company) {
    const bid = state.conventionCalendar?.bids?.[`${event.id}:${company.id}`];
    if (event.organizer.type === 'player') return '';
    if (Game.conventionCalendar.status(state, event).id !== 'announced') return '';
    return `<article class="convention-tender"><div><span>${event.year}年${event.month}月 · ${event.city}</span>
      <strong>${escape(event.name)}</strong><small>${escape(event.scale)} · 当前承办候选：${escape(event.organizer.name)}</small></div>
      ${bid ? `<b>${bid.won ? '已中标' : '未中标'}</b>` : (
        `<button data-convention-bid="${escape(event.id)}|${escape(company.id)}">
        申请承办 · ${Game.view.money(Game.conventionCompany.bidCost)}</button>`
      )}</article>`;
  }
  function companyBlock(state, entry) {
    const item = entry.company;
    if (!entry.licensed) {
      return `<article class="convention-company-license"><div><span>${escape(item.name)}</span>
        <strong>开设漫展会展业务</strong><small>取得承办资质并参与本国年度漫展投标</small></div>
        <button data-convention-license="${escape(item.id)}">
        开设 · ${Game.view.money(Game.conventionCompany.licenseCost)}</button></article>`;
    }
    const contracts = entry.events.filter((event) => event.organizer.companyId === item.id);
    const tenders = entry.events.map((event) => tenderCard(state, event, item)).filter(Boolean).join('');
    return `<section class="convention-company-block"><header><div><span>${escape(item.name)}</span>
      <strong>漫展会展业务</strong><small>${escape(item.conventionBase?.country || state.location.country)}
      · 行业声誉 ${Math.round(item.conventionReputation || 0)}</small></div><b>已获资质</b></header>
      ${contracts.map((event) => contractCard(state, event, item)).join('')}
      ${tenders || (!contracts.length ? '<p class="empty-state">当前没有开放投标的年度漫展。</p>' : '')}</section>`;
  }
  function render(state) {
    const entries = Game.conventionCompany.model(state);
    if (!entries.length) return '';
    return `<section class="panel convention-company-panel">
      <div class="panel-title"><h2>漫展承办</h2><span>娱乐公司业务</span></div>
      ${entries.map((entry) => companyBlock(state, entry)).join('')}</section>`;
  }

  Game.conventionCompanyView = Object.freeze({ render });
}(window));
