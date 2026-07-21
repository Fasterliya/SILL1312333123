(function initFinanceEnterpriseView(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  let activeTab = 'overview';

  const TABS = [
    ['overview', '总览'],
    ['credit', '信贷'],
    ['enterprise', '企业'],
    ['capital', '资本'],
  ];

  function sums(state) {
    Game.bankSystem?.ensure(state);
    Game.companySystem?.ensure(state);
    Game.taxSystem?.ensure(state);
    const companies = state.companies || [];
    const loans = state.finance?.loans || [];
    const stocks = Object.values(state.assets?.stocks || {});
    return {
      companies,
      loans,
      companyProfit: companies.reduce((sum, item) => sum + (Number(item.monthlyIncome) || 0), 0),
      investment: companies.reduce((sum, item) => sum + (Number(item.investment) || 0), 0),
      employees: companies.reduce((sum, item) => sum + (item.employees?.length || 0), 0),
      monthlyDebt: loans.reduce((sum, item) => sum + (Number(item.monthlyPayment) || 0), 0),
      backTaxes: Number(state.tax?.backTaxes) || 0,
      portfolio: Game.companyMarket?.portfolio(state) || 0,
      boardSeats: stocks.filter((item) => {
        const shares = Number(item.shares) || 0;
        return shares / (Number(item.totalShares) || 100000) >= 0.05;
      }).length,
    };
  }

  function metric(label, value, tone, note) {
    return `<div class="finance-metric ${tone || ''}">
      <span>${label}</span><strong>${value}</strong><small>${note || ''}</small>
    </div>`;
  }

  function header(state, data) {
    const credit = Game.bankSystem?.getCreditScore(state) || 50;
    const tabs = TABS.map(([id, label]) => {
      const count = id === 'credit' && data.loans.length ? `<b>${data.loans.length}</b>`
        : (id === 'enterprise' && data.companies.length ? `<b>${data.companies.length}</b>`
          : (id === 'capital' && data.boardSeats ? `<b>${data.boardSeats}</b>` : ''));
      return `<button type="button" role="tab" aria-selected="${activeTab === id}"
        class="${activeTab === id ? 'active' : ''}" data-finance-tab="${id}">${label}${count}</button>`;
    }).join('');

    return `<header class="finance-header">
      <div><span>财务控制台</span><h2>金融与企业</h2></div>
      <p>${state.location?.city || ''} · ${state.year}年${state.month}月</p>
    </header>
    <section class="finance-metrics" aria-label="财务摘要">
      ${metric('可用现金', Game.view.money(state.money), state.money < 0 ? 'negative' : 'cash', '即时可支配')}
      ${metric('信贷评分', Math.round(credit), credit < 40 ? 'negative' : (credit >= 70 ? 'positive' : ''), credit >= 70 ? '优质利率' : '影响贷款成本')}
      ${metric('每月债务', Game.view.money(data.monthlyDebt), data.monthlyDebt > 0 ? 'warning' : '', `${data.loans.length}笔贷款`)}
      ${metric('企业利润', Game.view.money(data.companyProfit), data.companyProfit < 0 ? 'negative' : 'positive', `${data.companies.length}家公司`)}
      ${metric('股票资产', Game.view.money(data.portfolio), '', `${data.boardSeats}个董事席位`)}
      ${metric('拖欠税款', Game.view.money(data.backTaxes), data.backTaxes > 0 ? 'negative' : 'positive', data.backTaxes > 0 ? '将触发自动追缴' : '年度自动扣缴')}
    </section>
    <nav class="finance-tabs" role="tablist" aria-label="金融与企业分类">${tabs}</nav>`;
  }

  function health(state, data) {
    const positiveIncome = Math.max(0, Number(state.career?.salary) || 0)
      + Math.max(0, data.companyProfit)
      + Math.max(0, Game.assetsSystem?.monthlyIncome(state) || 0);
    const burden = positiveIncome > 0 ? data.monthlyDebt / positiveIncome : (data.monthlyDebt ? 1 : 0);
    if (data.backTaxes > 0 || state.money < 0 || burden >= 0.6) {
      return ['高风险', 'negative', '欠税、负现金或月供压力正在侵蚀财务安全。'];
    }
    if (burden >= 0.3 || data.companyProfit < 0) {
      return ['需关注', 'warning', '现金流仍可运转，但债务或企业亏损需要处理。'];
    }
    return ['稳健', 'positive', data.companies.length ? '现金流和经营组合处于可控状态。' : '负债可控，可开始积累经营性资产。'];
  }

  function overview(state, data) {
    const status = health(state, data);
    return `<section class="finance-overview">
      <div class="finance-health ${status[1]}">
        <div><span>财务健康</span><strong>${status[0]}</strong></div><p>${status[2]}</p>
      </div>
      <div class="finance-ledger">
        <div><span>企业总投资</span><strong>${Game.view.money(data.investment)}</strong></div>
        <div><span>团队规模</span><strong>${data.employees}人</strong></div>
        <div><span>商业信用</span><strong>${Math.round(Number(state.creditScore) || 50)}</strong></div>
        <div><span>累计分红</span><strong>${Game.view.money(state.assets?.dividends || 0)}</strong></div>
      </div>
      <section class="finance-focus">
        <header><h3>本月重点</h3><span>按风险排序</span></header>
        ${data.backTaxes > 0
          ? `<p class="risk"><strong>优先处理欠税</strong><span>当前拖欠 ${Game.view.money(data.backTaxes)}，过高时会强制清算资产。</span></p>`
          : data.monthlyDebt > Math.max(1, state.money)
            ? `<p class="risk"><strong>准备月供现金</strong><span>本月债务高于当前现金，逾期会显著降低信用。</span></p>`
            : data.companyProfit < 0
              ? `<p class="risk"><strong>检查亏损企业</strong><span>企业合计每月亏损 ${Game.view.money(Math.abs(data.companyProfit))}。</span></p>`
              : `<p><strong>经营状态正常</strong><span>没有紧急财务风险，可继续投资或建立新的收入来源。</span></p>`}
      </section>
      <div class="finance-shortcuts">
        <button type="button" data-finance-tab="credit"><span>信贷管理</span><small>贷款、信用与福利</small></button>
        <button type="button" data-finance-tab="enterprise"><span>企业经营</span><small>创业、员工与上市</small></button>
        <button type="button" data-open-module="stockSubpage" data-module-title="股票市场"><span>股票市场</span><small>交易与持仓管理</small></button>
        <button type="button" data-finance-tab="capital"><span>董事会</span><small>席位、津贴与记录</small></button>
      </div>
    </section>`;
  }

  function panel(state, data) {
    if (activeTab === 'credit') return `<div class="finance-section-head"><h3>信贷与福利</h3><span>月供会在每月结算时自动扣除</span></div>${Game.bankSystem?.render(state) || ''}`;
    if (activeTab === 'enterprise') {
      const content = state.companyCreationStage?.active
        ? Game.companySystem?.renderCreationStage(state)
        : Game.companySystem?.render(state);
      return `<div class="finance-section-head"><h3>企业经营</h3><span>${data.companies.length}家公司 · ${data.employees}名员工</span></div>${content || ''}`;
    }
    if (activeTab === 'capital') {
      return `<div class="finance-section-head"><h3>资本与董事会</h3><span>持股达到5%可获得董事席位</span></div>
        <button class="finance-market-link" type="button" data-open-module="stockSubpage" data-module-title="股票市场">
          <span>打开股票市场</span><small>查看行情、持仓并调整股份</small><b>›</b>
        </button>${Game.stockDirector?.render(state) || ''}`;
    }
    return overview(state, data);
  }

  function render(state) {
    const data = sums(state);
    return `<div class="finance-console">${header(state, data)}
      <div class="finance-tab-panel" role="tabpanel">${panel(state, data)}</div></div>`;
  }

  function handleClick(event) {
    const button = event.target.closest('[data-finance-tab]');
    if (!button) return false;
    activeTab = TABS.some(([id]) => id === button.dataset.financeTab)
      ? button.dataset.financeTab : 'overview';
    Game._refresh?.();
    return true;
  }

  Game.financeEnterpriseView = Object.freeze({ render, handleClick });
}(window));
