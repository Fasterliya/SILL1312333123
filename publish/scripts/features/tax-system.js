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
    if (state.gameOver || U.age(state) < 18) return null;

    const result = calculateTax(state);
    if (result.income <= 0 && result.tax <= 0) {
      state.tax.lastFilingYear = state.year;
      state.tax._dividendBaseline = state.assets?.dividends || 0;
      state.tax.charityDonations = 0;
      state.tax.declaredIncome = 0;
      return { ok: true, paid: 0, unpaid: 0 };
    }

    const payment = payTax(state, result.tax);
    state.tax.lastFilingYear = state.year;
    state.tax._dividendBaseline = state.assets?.dividends || 0;
    state.tax.charityDonations = 0;
    state.tax.declaredIncome = result.income;
    Game.lifeDirector?.addLog(state, '年度税务自动结算',
      `${result.country}按${Math.round(result.rate * 100)}%税率计税，应缴${Game.view.money(result.tax)}，`
      + `已扣${Game.view.money(payment.paid)}${payment.unpaid ? `，欠税${Game.view.money(payment.unpaid)}` : '。'}`,
      payment.unpaid ? 'normal' : 'good');
    return { ok: true, ...payment, tax: result.tax, income: result.income };
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

  function migratePending(state) {
    if (state.pendingDecision?.type !== 'taxFiling') return false;
    const decision = state.pendingDecision;
    ensure(state);
    const result = {
      income: Math.max(0, Math.round(Number(decision.income) || 0)),
      tax: Math.max(0, Math.round(Number(decision.tax) || 0)),
      rate: TAX_RATES[decision.country] || 0.20,
      country: decision.country || state.location.country,
    };
    state.pendingDecision = null;
    const payment = payTax(state, result.tax);
    state.tax.lastFilingYear = state.year;
    state.tax._dividendBaseline = state.assets?.dividends || 0;
    state.tax.charityDonations = 0;
    state.tax.declaredIncome = result.income;
    Game.lifeDirector?.addLog(state, '税务规则更新',
      `旧存档中的待申报税款已按正常方式自动结算，扣除${Game.view.money(payment.paid)}。`,
      payment.unpaid ? 'normal' : 'good');
    return true;
  }

  /* ---- monthly tick ---- */

  function monthly(state) {
    ensure(state);

    if (state.month === 1 && state.year > state.tax.lastFilingYear) {
      annualFiling(state);
    }

    /* auto-pay back taxes when possible */
    if (state.tax.backTaxes > 0 && state.money >= state.tax.backTaxes) {
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
    migratePending,
  });
}(window));
