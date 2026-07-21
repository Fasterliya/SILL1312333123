(function initConventionCompanyView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  function metric(label, value) {
    return `<div><span>${label}</span><b>${Math.round(value)}/100</b></div>`;
  }
  function effectText(option) {
    const labels = { quality: '质量', safety: '安全', promotion: '宣传' };
    return Object.entries(option.effects).map(([key, value]) => (
      `${labels[key]}${value >= 0 ? '+' : ''}${value}`
    )).join(' · ');
  }
  function prepOptions(event, company) {
    const stage = Game.conventionCompany.nextStage(event.preparation);
    if (!stage) return '<p class="convention-company-ready">筹备方案已经完成，等待举办。</p>';
    return `<div class="convention-prep-stage"><header><span>当前阶段</span><strong>${stage.name}</strong></header>
      <div>${stage.options.map((option) => (
        `<button data-convention-prep="${escape(event.id)}|${escape(company.id)}|${option.id}">
        <strong>${option.name}</strong><small>${Game.view.money(option.cost)}
        · ${effectText(option)}</small></button>`
      )).join('')}</div></div>`;
  }
  function contractCard(state, event, company) {
    const status = Game.conventionCalendar.status(state, event);
    const settlement = state.conventionCalendar?.settlements?.[event.id];
    const forecast = settlement ? null : Game.conventionCompanySettlement.preview(state, event);
    return `<article class="convention-contract">
      <header><div><span>${event.year}年${event.month}月 · ${event.city}</span>
      <strong>${escape(event.name)}</strong></div><b>${status.label}</b></header>
      <div class="convention-prep-metrics">${metric('质量', event.preparation.quality)}
      ${metric('安全', event.preparation.safety)}${metric('宣传', event.preparation.promotion)}</div>
      ${settlement?.status === 'completed' ? settlementSummary(settlement) : ''}
      ${forecast ? forecastSummary(forecast) : ''}
      ${['ongoing', 'ended'].includes(status.id) ? '' : prepOptions(event, company)}
      ${partnerPanel(state, event, company)}
      ${operationPanel(state, event, company)}
    </article>`;
  }
  function forecastSummary(item) {
    const profit = item.forecastProfit;
    return `<div class="convention-settlement ${profit >= 0 ? 'profit' : 'loss'}">
      <span>当前预估 · 事故风险 ${item.incidentChance}%</span>
      <strong>预计 ${item.attendance.toLocaleString()} 人到场</strong>
      <small>无事故收入 ${Game.view.money(item.grossRevenue)}
      · 预计利润 ${Game.view.money(profit)}</small></div>`;
  }
  function partnerMeta(type, offer) {
    const ability = `${offer.primary}+${offer.secondary} · 难度${offer.difficulty}`;
    if (type === 'sponsor') {
      return `合作收入 ${Game.view.money(offer.value)} · ${effectText(offer)} · ${ability}`;
    }
    return `费用 ${Game.view.money(offer.fee)} · 客流+${offer.draw}
      · ${effectText(offer)} · ${ability}`;
  }
  function partnerGroup(state, event, company, type, open) {
    const accepted = type === 'sponsor' ? event.preparation.sponsors : event.preparation.guests;
    const title = type === 'sponsor' ? '赞助商' : '主嘉宾';
    if (accepted.length) {
      const item = accepted[0];
      const detail = type === 'sponsor'
        ? `合作收入 ${Game.view.money(item.value)}`
        : `邀请费 ${Game.view.money(item.fee)} · 客流+${item.draw}`;
      return `<div class="convention-partner-group selected"><span>${title}</span>
        <strong>${escape(item.name)}</strong><small>${detail}</small></div>`;
    }
    if (!open) {
      return `<div class="convention-partner-group selected"><span>${title}</span>
        <strong>未确定</strong><small>本届没有达成合作</small></div>`;
    }
    const offers = Game.conventionPartners.available(state, event.id, company.id, type);
    return `<div class="convention-partner-group"><span>${title}</span><div>${offers.map((offer) => (
      `<button data-convention-partner="${escape(event.id)}|${escape(company.id)}|${type}|${offer.id}"
        ${offer.attempted ? 'disabled' : ''}><strong>${escape(offer.name)}</strong>
        <small>${offer.attempted ? '洽谈未成' : partnerMeta(type, offer)}</small></button>`
    )).join('')}</div></div>`;
  }
  function partnerPanel(state, event, company) {
    const prep = event.preparation;
    const hasPartner = prep.sponsors.length || prep.guests.length;
    const open = !Game.conventionCompany.nextStage(prep)
      && !['ongoing', 'ended'].includes(Game.conventionCalendar.status(state, event).id);
    if (!open && !hasPartner) return '';
    return `<section class="convention-partners"><h3>合作阵容</h3>
      ${partnerGroup(state, event, company, 'sponsor', open)}
      ${partnerGroup(state, event, company, 'guest', open)}</section>`;
  }
  function operationPanel(state, event, company) {
    if (Game.conventionCalendar.status(state, event).id !== 'ongoing') return '';
    if (Game.conventionCompany.nextStage(event.preparation)) {
      return `<section class="convention-operations blocked"><h3>现场运营</h3>
        <p>基础筹备未完成，现场将产生额外调度成本。</p></section>`;
    }
    const model = Game.conventionOperations.model(state, event, company.id);
    if (model.completed) {
      return `<section class="convention-operations completed"><h3>现场运营完成</h3>
        <p>三个阶段均已处理 · 平均执行 ${model.score}</p></section>`;
    }
    const phase = model.phase;
    return `<section class="convention-operations"><header><span>现场 ${model.count + 1}/3</span>
      <strong>${phase.name}</strong></header><p>${escape(phase.text)}</p>
      <div>${phase.options.map((option) => (
        `<button data-convention-operation="${escape(event.id)}|${escape(company.id)}|${option.id}">
        <strong>${option.name}</strong><small>${effectText(option)}
        · ${option.primary}+${option.secondary} · 难度${option.difficulty}</small></button>`
      )).join('')}</div></section>`;
  }
  function settlementSummary(item) {
    const profitClass = item.projectProfit >= 0 ? 'profit' : 'loss';
    const incident = item.incident ? item.incident.name : '平稳举办';
    return `<div class="convention-settlement ${profitClass}">
      <span>结算 · ${escape(incident)}</span><strong>${item.attendance.toLocaleString()}人到场</strong>
      <small>现金流 ${Game.view.money(item.payout)} · 项目利润 ${Game.view.money(item.projectProfit)}
      · 声誉 ${item.reputationDelta >= 0 ? '+' : ''}${item.reputationDelta}</small></div>`;
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
    const currentIds = new Set(contracts.map((event) => event.id));
    const history = entry.settlements.filter((settlement) => !currentIds.has(settlement.editionId));
    const tenders = entry.events.map((event) => tenderCard(state, event, item)).filter(Boolean).join('');
    return `<section class="convention-company-block"><header><div><span>${escape(item.name)}</span>
      <strong>漫展会展业务</strong><small>${escape(item.conventionBase?.country || state.location.country)}
      · 行业声誉 ${Math.round(item.conventionReputation || 0)}</small></div><b>已获资质</b></header>
      ${contracts.map((event) => contractCard(state, event, item)).join('')}
      ${history.length ? `<div class="convention-settlement-history"><h3>往届结算</h3>
      ${history.map((settlement) => settlementSummary(settlement)).join('')}</div>` : ''}
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
