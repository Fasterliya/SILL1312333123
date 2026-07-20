(function initEconomicCareerPanels(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const State = Game.economicCareerState;

  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function supports(state) {
    return ['prostitute', 'welfare', 'blackmarket'].includes(state.career.jobId);
  }

  function appointments(state) {
    const data = State.ensure(state).sexWork;
    const rows = State.refreshAppointments(state).map((item) => (
      `<article class="appointment-row"><div><strong>${escape(item.name)}</strong>
        <span>${escape(item.service)}</span></div><b>${Game.view.money(item.price)}</b>
        <button data-economic-action="accept" data-appointment-id="${escape(item.id)}">接待</button>
      </article>`
    )).join('');
    return `<section class="career-panel"><div class="panel-title"><h2>本月预约</h2>
      <span>已完成${data.completed}次</span></div>
      <div class="appointment-list">${rows || '<p class="empty-state">本月没有预约。</p>'}</div>
      <div class="system-actions">
        <button data-economic-action="street">主动揽客</button>
        <button data-economic-action="reject">拒绝首个预约</button>
        <button data-economic-action="venue">升级场地 · ${Game.view.money(data.venueLevel * 5000)}</button>
      </div></section>`;
  }

  function patrons(state) {
    const data = State.ensure(state).sexWork;
    const rows = data.patrons.map((patron) => (
      `<article class="vip-row"><div><strong>${escape(patron.name)}</strong>
        <span>关系${patron.loyalty} · 累计${patron.deals}次</span></div>
        <button data-economic-action="private" data-patron-id="${escape(patron.id)}">私下交易</button>
      </article>`
    )).join('');
    return `<section class="career-panel"><div class="panel-title"><h2>金主与常客</h2>
      <span>${data.patrons.length}人</span></div>
      <div class="partner-list">${rows || '<p class="empty-state">尚未建立稳定金主关系。</p>'}</div>
      <div class="system-actions"><button data-economic-action="patron">寻找新金主</button></div>
    </section>`;
  }

  function health(state) {
    const data = State.ensure(state).sexWork;
    const last = Number.isFinite(state.health?.lastCheckupMonth)
      ? `${state.totalMonths - state.health.lastCheckupMonth}个月前` : '从未';
    return `<section class="career-panel"><div class="work-metrics">
      <div><span>职业倦怠</span><strong>${state.career.burnout || 0}/100</strong></div>
      <div><span>健康</span><strong>${Math.round(state.stats.健康)}</strong></div>
      <div><span>上次体检</span><strong>${last}</strong></div>
      <div><span>场地等级</span><strong>${data.venueLevel}</strong></div>
    </div><div class="system-actions">
      <button data-economic-action="checkup">预约体检 · ${Game.view.money(800)}</button>
      <button data-economic-action="rest">休息调整</button>
    </div></section>`;
  }

  function sexWork(state) {
    return `<div class="career-special-stack">${appointments(state)}${patrons(state)}${health(state)}</div>`;
  }

  function market(state) {
    const market = State.ensure(state).blackMarket;
    const rows = State.ITEMS.map((item) => {
      const stock = market.stock[item.id] || 0;
      return `<article class="black-market-item"><div><strong>${item.name}</strong>
        <span>风险${item.risk}</span></div><div class="bm-prices">
        <span>进${Game.view.money(item.buy)}</span><span>售${Game.view.money(item.sell)}</span>
        </div><div class="bm-stock">库存 <b>${stock}</b></div>
        <button data-economic-market="buy" data-item-id="${item.id}">进货</button>
        <button data-economic-market="sell" data-item-id="${item.id}"${stock ? '' : ' disabled'}>出售</button>
        <button data-economic-market="use" data-item-id="${item.id}"${stock ? '' : ' disabled'}>使用</button>
      </article>`;
    }).join('');
    return `<section class="career-panel black-market"><div class="panel-title">
      <h2>黑市仓库</h2><span>犯罪记录${state.criminal?.record || 0}</span></div>
      <div class="black-market-items">${rows}</div>
      <div class="system-actions"><button data-economic-market="sell-all">批量出售库存</button></div>
    </section>`;
  }

  function routePanel(state) {
    if (state.career.jobId === 'blackmarket') return market(state);
    return sexWork(state);
  }

  Game.economicCareerPanels = Object.freeze({ supports, routePanel });
}(window));
