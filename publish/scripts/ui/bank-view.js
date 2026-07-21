(function initBankView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const core = Game.bankSystem;

  function loanRows(state) {
    const defs = core.definitions;
    return state.finance.loans.length ? state.finance.loans.map((loan) => {
      const typeName = defs[loan.type]?.name || loan.type;
      return `<article class="loan-row"><div><strong>${typeName}</strong>
        <span>本金 ${Game.view.money(loan.amount)} · 利率 ${(loan.rate * 100).toFixed(1)}%
        · 剩余 ${loan.remainingMonths} 个月</span></div>
        <b>月供 ${Game.view.money(loan.monthlyPayment)}</b>
        <button data-bank-action="repay" data-bank-value="${loan.id}">还款</button></article>`;
    }).join('') : '<p class="empty-state">当前无贷款</p>';
  }

  function applications(state) {
    return Object.entries(core.definitions).map(([type, info]) => {
      const maximum = core.maxForType(state, type);
      const hasLoan = state.finance.loans.some((loan) => loan.type === type);
      const unavailable = type === 'business' && maximum <= 0;
      const disabled = hasLoan || unavailable;
      const label = hasLoan ? '已有贷款' : (unavailable ? '需要先拥有公司' : '申请');
      return `<article class="loan-apply-row"><div><strong>${info.name}</strong>
        <span>最高 ${Game.view.money(maximum)} · 基础利率 ${(info.rate * 100).toFixed(1)}%
        · 期限 ${info.term} 个月</span><small>抵押：${info.collateral}</small></div>
        <button data-bank-action="apply" data-bank-type="${type}" ${disabled ? 'disabled' : ''}>${label}</button>
      </article>`;
    }).join('');
  }

  function render(state) {
    core.ensure(state);
    const score = core.getCreditScore(state);
    const color = score >= 70 ? '#4caf50' : (score >= 40 ? '#ff9800' : '#f44336');
    const label = score >= 70 ? '优质信用 · 利率减半'
      : (score < 30 ? '信用极差 · 仅可申请高利贷'
        : (score < 50 ? '信用较差 · 利率上浮50%' : '普通信用'));
    const age = Game.content.age(state);
    const hasJob = Boolean(state.career.job);
    const eligible = !hasJob && state.money < 1000 && age >= 18;
    return `<div class="bank-system"><section class="credit-section">
      <div><span>信用评分</span><strong style="color:${color}">${score}</strong></div>
      <i><b style="width:${score}%;background:${color}"></b></i><small>${label}</small></section>
      <section class="loan-section"><header><span>贷款管理</span></header>
      <h3>当前贷款</h3>${loanRows(state)}<h3>申请贷款</h3>${applications(state)}</section>
      <section class="welfare-section"><header><span>社会福利</span></header>
      <div class="welfare-status"><span>失业且现金不足 1000 时可领取低保</span>
      <strong>${eligible ? '符合申领条件'
        : (hasJob ? '有工作者不符合' : (age < 18 ? '未成年不符合' : '现金超过 1000'))}</strong>
      ${eligible ? '<button data-bank-action="welfare">领取低保</button>' : ''}</div></section></div>`;
  }

  Game.bankSystem = Object.freeze({ ...core, render });
}(window));
