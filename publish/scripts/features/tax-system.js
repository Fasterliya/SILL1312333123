(function initTaxSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  const TAX_RATES = {
    新加坡: 0.08, 日本: 0.15, 华夏: 0.20, 韩国: 0.25, 美国: 0.30, 法国: 0.35,
  };

  /* ---- state ---- */

  function ensure(state) {
    state.tax = state.tax && typeof state.tax === 'object' ? state.tax : {
      lastFilingYear: -1,
      declaredIncome: 0,
      backTaxes: 0,
      charityDonations: 0,
    };
    state.tax.backTaxes = Math.max(0, Math.round(Number(state.tax.backTaxes) || 0));
    state.tax.charityDonations = Math.max(0, Math.round(Number(state.tax.charityDonations) || 0));
    state.tax.lastFilingYear = Number.isFinite(state.tax.lastFilingYear) ? state.tax.lastFilingYear : -1;
    state.tax._dividendBaseline = Number.isFinite(state.tax._dividendBaseline)
      ? state.tax._dividendBaseline : (state.assets?.dividends || 0);
    return state.tax;
  }

  /* ---- income calculation ---- */

  function calculateTax(state) {
    ensure(state);
    const country = state.location.country;
    const rate = TAX_RATES[country] || 0.20;

    /* career salary */
    const salaryIncome = (state.career.salary || 0) * 12;

    /* business income (monthly x 12) */
    const businessMonthly = Game.assetsSystem ? Game.assetsSystem.monthlyIncome(state) : 0;
    const businessIncome = businessMonthly * 12;

    /* stock dividends (yearly delta) */
    const currentDividends = state.assets?.dividends || 0;
    const dividendIncome = Math.max(0, currentDividends - (state.tax._dividendBaseline || 0));

    /* hookup / brothel income (tracked on state if exists) */
    const encounterIncome = Math.max(0, Math.round(
      Number(state.encounterEarnings) || Number(state.encounterIncome) || 0,
    ));

    const totalIncome = salaryIncome + businessIncome + dividendIncome + encounterIncome;

    /* gross tax */
    const grossTax = Math.round(totalIncome * rate);

    /* charity deduction: donations * 0.3, capped at 30% of tax */
    const maxDeduction = Math.round(grossTax * 0.3);
    const charityDeduction = Math.min(
      Math.round((state.tax.charityDonations || 0) * 0.3), maxDeduction,
    );

    const tax = Math.max(0, grossTax - charityDeduction);

    return { income: totalIncome, rate, tax, country };
  }

  /* ---- annual filing ---- */

  function annualFiling(state) {
    ensure(state);
    if (state.pendingDecision || state.gameOver) return;
    if (U.age(state) < 18) return;

    const result = calculateTax(state);
    if (result.income <= 0 && result.tax <= 0) {
      /* nothing to file — mark year as done */
      state.tax.lastFilingYear = state.year;
      state.tax._dividendBaseline = state.assets?.dividends || 0;
      state.tax.charityDonations = 0;
      return;
    }

    state.pendingDecision = {
      type: 'taxFiling',
      income: result.income,
      tax: result.tax,
      country: result.country,
    };
  }

  /* ---- pay / donate ---- */

  function payTax(state, amount) {
    const due = Math.max(0, Math.round(amount));
    if (state.money >= due) {
      Game.economy.spend(state, due);
      return { ok: true, paid: due };
    }
    /* partial payment */
    const available = Math.max(0, Math.round(state.money));
    Game.economy.spend(state, available);
    state.tax.backTaxes += (due - available);
    Game.lifeDirector.addLog(state, '税务欠款',
      `账户余额不足，拖欠税款${Game.view.money(due - available)}。`, 'normal');
    return { ok: false, paid: available, unpaid: due - available };
  }

  function donate(state, amount) {
    const cost = Math.max(0, Math.round(amount));
    if (state.money < cost) return { ok: false, message: `捐款需要 ${Game.view.money(cost)}` };
    Game.economy.spend(state, cost);
    ensure(state);
    state.tax.charityDonations += cost;
    Game.lifeDirector.addLog(state, '慈善捐赠',
      `你捐出${Game.view.money(cost)}用于慈善事业，可用于税务减免。`, 'good');
    return { ok: true, message: `已捐赠${Game.view.money(cost)}` };
  }

  /* ---- resolution (wired into actions.js decide) ---- */

  function resolve(state, value) {
    ensure(state);
    const d = state.pendingDecision;
    if (!d || d.type !== 'taxFiling') return { ok: false, message: '无效的税务决策' };

    const country = d.country;
    const fullTax = d.tax;

    if (value === 'honest') {
      payTax(state, fullTax);
      state.tax.lastFilingYear = state.year;
      state.tax._dividendBaseline = state.assets?.dividends || 0;
      state.tax.charityDonations = 0;
      Game.lifeDirector.addLog(state, '税务申报',
        `${country}税务局年度申报完成，实缴税款${Game.view.money(fullTax)}。`, 'good');
      return { ok: true, message: `如实申报，已缴纳${Game.view.money(fullTax)}` };
    }

    if (value === 'evade') {
      const halfTax = Math.round(fullTax * 0.5);
      payTax(state, halfTax);
      state.tax.lastFilingYear = state.year;
      state.tax._dividendBaseline = state.assets?.dividends || 0;
      state.tax.charityDonations = 0;

      if (Math.random() < 0.25) {
        /* audit — pay remaining + penalty */
        const remaining = fullTax - halfTax;
        const penalty = Math.round(fullTax * 0.5);
        state.tax.backTaxes += (remaining + penalty);
        state.stats.信用 = U.clamp((state.stats.信用 || 50) - 20, 0, 100);
        Game.lifeDirector.addLog(state, '税务稽查',
          `虚报收入被税务机关查实！追缴税款${Game.view.money(remaining)}、罚款${Game.view.money(penalty)}，信用大幅降低。`, 'danger');
        return { ok: true, message: '税务稽查！虚报被查实，面临巨额补缴与罚款' };
      }

      Game.lifeDirector.addLog(state, '税务申报',
        `你虚报收入仅缴纳${Game.view.money(halfTax)}，暂时瞒过了税务机关。`, 'normal');
      return { ok: true, message: `虚报完成，实缴${Game.view.money(halfTax)}（25%稽查风险）` };
    }

    if (value === 'accountant') {
      const accountantFee = Math.round(fullTax * 0.1);
      const reducedTax = Math.round(fullTax * 0.85);
      Game.economy.spend(state, accountantFee);
      payTax(state, reducedTax);
      state.tax.lastFilingYear = state.year;
      state.tax._dividendBaseline = state.assets?.dividends || 0;
      state.tax.charityDonations = 0;
      Game.lifeDirector.addLog(state, '税务申报',
        `会计师收费${Game.view.money(accountantFee)}，合法节税后实缴${Game.view.money(reducedTax)}。`, 'good');
      return { ok: true, message: `会计师节税，实缴${Game.view.money(reducedTax)}（含会计师费${Game.view.money(accountantFee)}）` };
    }

    return { ok: false, message: '未知的申报方式' };
  }

  /* ---- render (wired into actions.js renderDecision) ---- */

  function renderDecision(state) {
    const d = state.pendingDecision;
    if (!d || d.type !== 'taxFiling') return null;

    const ratePct = Math.round((TAX_RATES[d.country] || 0.20) * 100);

    return {
      title: `${d.country}税务局·年度税务申报`,
      text: `你去年的总收入为${Game.view.money(d.income)}，应缴税款${Game.view.money(d.tax)}（税率${ratePct}%）。`,
      options: [
        { value: 'honest', label: `如实申报 · ${Game.view.money(d.tax)}` },
        { value: 'evade', label: `虚报收入 · ${Game.view.money(Math.round(d.tax * 0.5))}（25%稽查风险）` },
        { value: 'accountant', label: `请会计师 · ${Game.view.money(Math.round(d.tax * 0.1))} 费用（合法节税15%）` },
      ],
    };
  }

  /* ---- monthly tick ---- */

  function monthly(state) {
    ensure(state);

    /* January: trigger annual filing */
    if (state.month === 1 && state.year > state.tax.lastFilingYear
      && !state.pendingDecision) {
      annualFiling(state);
    }

    /* auto-pay back taxes when possible */
    if (state.tax.backTaxes > 0 && state.money > state.tax.backTaxes) {
      const paid = state.tax.backTaxes;
      Game.economy.spend(state, paid);
      state.tax.backTaxes = 0;
      Game.lifeDirector.addLog(state, '补缴税款',
        `拖欠税款${Game.view.money(paid)}已自动缴清。`, 'good');
    }

    /* force liquidation if backTaxes exceed 3 months of income */
    if (state.tax.backTaxes > 0) {
      const monthlyIncome = (state.career.salary || 0)
        + (Game.assetsSystem ? Game.assetsSystem.monthlyIncome(state) : 0);
      if (state.tax.backTaxes > monthlyIncome * 3) {
        /* liquidate stocks */
        const stocks = state.assets?.stocks;
        if (stocks && Game.companyMarket) {
          Object.keys(stocks).forEach((name) => {
            const stock = stocks[name];
            if (stock && stock.shares > 0) {
              const proceeds = stock.price * stock.shares;
              state.money += proceeds;
              stock.shares = 0;
            }
          });
        }
        Game.lifeDirector.addLog(state, '强制资产清算',
          `拖欠税款${Game.view.money(state.tax.backTaxes)}超过三个月收入，名下资产被强制拍卖抵税。`, 'danger');
        /* re-check after liquidation */
        if (state.money >= state.tax.backTaxes) {
          state.money -= state.tax.backTaxes;
          state.tax.backTaxes = 0;
        } else {
          state.tax.backTaxes -= Math.max(0, Math.round(state.money));
          state.money = 0;
        }
      }
    }
  }

  Game.taxSystem = Object.freeze({
    ensure, calculateTax, annualFiling, payTax, donate, monthly,
    resolve, renderDecision,
  });
}(window));
