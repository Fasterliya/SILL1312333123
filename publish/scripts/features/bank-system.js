(function initBankSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const C = Game.config;

  const LOAN_DEFS = {
    consumer:  { name: '消费贷款', collateral: '无',        max: 50000,  rate: 0.12, term: 24 },
    business:  { name: '经营贷款', collateral: '已有产业',  max: Infinity, rate: 0.07, term: 60 },
    loanShark: { name: '高利贷',   collateral: '无',        max: 100000, rate: 0.35, term: 12 },
  };

  /* ---- helpers ---- */

  function businessTotal(state) {
    return (state.assets.businesses || []).reduce(function (sum, id) {
      var biz = C.businesses.find(function (item) { return item.id === id; });
      return sum + (biz ? biz.price : 0);
    }, 0);
  }

  function loanRate(state, baseRate) {
    var score = Math.max(0, Math.min(100,
      Number((state.finance && state.finance.creditScore) || 50)));
    if (score >= 70) return baseRate / 2;
    if (score < 50)  return baseRate * 1.5;
    return baseRate;
  }

  function calcMonthly(amount, annualRate, term) {
    var r = annualRate / 12;
    if (r === 0) return Math.ceil(amount / term);
    var factor = Math.pow(1 + r, term);
    return Math.ceil(amount * r * factor / (factor - 1));
  }

  function maxForType(state, type) {
    if (type === 'business') return Math.round(businessTotal(state) * 0.7);
    return LOAN_DEFS[type] ? LOAN_DEFS[type].max : 0;
  }

  /* ---- public ---- */

  function ensure(state) {
    if (!state.finance || typeof state.finance !== 'object') {
      state.finance = {};
    }
    state.finance.creditScore = Number.isFinite(state.finance.creditScore)
      ? U.clamp(state.finance.creditScore, 0, 100) : 50;
    state.finance.loans = Array.isArray(state.finance.loans) ? state.finance.loans : [];
  }

  function getCreditScore(state) {
    ensure(state);
    return state.finance.creditScore;
  }

  function applyLoan(state, type, amount) {
    ensure(state);
    var def = LOAN_DEFS[type];
    if (!def) return { ok: false, message: '无效的贷款类型' };

    var amt = Math.max(0, Math.round(Number(amount) || 0));
    if (amt <= 0) return { ok: false, message: '贷款金额必须大于0' };

    var score = getCreditScore(state);
    if (score < 30 && type !== 'loanShark') {
      return { ok: false, message: '信用分不足30，仅可申请高利贷' };
    }

    var maximum = maxForType(state, type);
    if (type === 'business' && maximum <= 0) {
      return { ok: false, message: '需要先拥有产业才能申请经营贷款' };
    }
    if (amt > maximum) {
      return { ok: false, message: '贷款金额不能超过 ' + Game.view.money(maximum) };
    }

    if (state.finance.loans.some(function (loan) { return loan.type === type; })) {
      return { ok: false, message: '你已有一笔' + def.name + '，请先还清再申请' };
    }

    var rate = loanRate(state, def.rate);
    var term = def.term;
    var payment = calcMonthly(amt, rate, term);

    var loan = {
      id: 'loan-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      type: type,
      amount: amt,
      rate: rate,
      remainingMonths: term,
      monthlyPayment: payment,
      takenAt: state.totalMonths,
    };

    state.finance.loans.push(loan);
    state.money += amt;

    if (Game.lifeDirector) {
      Game.lifeDirector.addLog(state, '贷款获批',
        def.name + ' ' + Game.view.money(amt) + '，月供 ' + Game.view.money(payment) + '，期限 ' + term + ' 个月', 'milestone');
    }

    return { ok: true, message: def.name + '获批 ' + Game.view.money(amt) + '，月供 ' + Game.view.money(payment) };
  }

  function repayLoan(state, loanId) {
    ensure(state);
    var idx = state.finance.loans.findIndex(function (loan) { return loan.id === loanId; });
    if (idx === -1) return { ok: false, message: '贷款不存在' };

    var loan = state.finance.loans[idx];
    if (state.money < loan.monthlyPayment) {
      return { ok: false, message: '余额不足，月供需要 ' + Game.view.money(loan.monthlyPayment) };
    }

    Game.economy.spend(state, loan.monthlyPayment);
    loan.remainingMonths -= 1;
    state.finance.creditScore = U.clamp(state.finance.creditScore + 3, 0, 100);

    if (loan.remainingMonths <= 0) {
      state.finance.loans.splice(idx, 1);
      return { ok: true, message: '贷款已全部还清！信用分 +3' };
    }

    return {
      ok: true,
      message: '已还款 ' + Game.view.money(loan.monthlyPayment)
        + '，剩余 ' + loan.remainingMonths + ' 个月，信用分 +3',
    };
  }

  function welfare(state) {
    ensure(state);
    if (U.age(state) < 18) return { ok: false, message: '未成年不符合福利申领条件' };
    if (state.career.job)  return { ok: false, message: '有工作者不符合福利申领条件' };
    if (state.money >= 1000) return { ok: false, message: '现金超过 1000 不符合福利申领条件' };

    var country = state.location.country || '华夏';
    var profile = Game.worldCulture.profile(country);
    var costFactor = profile.cost || 1;
    var minGrant = Math.round(500 * costFactor);
    var maxGrant = Math.round(1500 * costFactor);
    var grant = Math.round(minGrant + Math.random() * (maxGrant - minGrant));

    state.money += grant;
    state.cityLife.reputation = U.clamp(state.cityLife.reputation - 5, 0, 100);

    if (Game.lifeDirector) {
      Game.lifeDirector.addLog(state, '申领低保',
        '领取社会福利 ' + Game.view.money(grant) + '（城市声望 -5）', 'normal');
    }

    return { ok: true, message: '领取低保 ' + Game.view.money(grant) + '，城市声望 -5' };
  }

  function monthly(state) {
    ensure(state);

    // auto-deduct loan payments
    state.finance.loans.forEach(function (loan) {
      if (state.money >= loan.monthlyPayment) {
        Game.economy.spend(state, loan.monthlyPayment);
        loan.remainingMonths -= 1;
        state.finance.creditScore = U.clamp(state.finance.creditScore + 1, 0, 100);
      } else {
        state.finance.creditScore = U.clamp(state.finance.creditScore - 15, 0, 100);
        if (Game.lifeDirector) {
          Game.lifeDirector.addLog(state, '贷款逾期',
            '未能支付月供 ' + Game.view.money(loan.monthlyPayment) + '，信用分 -15', 'normal');
        }
      }
    });

    // remove paid-off loans
    state.finance.loans = state.finance.loans.filter(function (loan) {
      return loan.remainingMonths > 0;
    });
  }

  function render(state) {
    ensure(state);
    var score = getCreditScore(state);
    var color = score >= 70 ? '#4caf50' : (score >= 40 ? '#ff9800' : '#f44336');
    var label = score >= 70 ? '优质信用 · 利率减半'
      : (score < 30 ? '信用极差 · 仅可申请高利贷'
        : (score < 50 ? '信用较差 · 利率上浮50%' : '普通信用'));

    var scoreBar = '<section class="credit-section">'
      + '<div><span>信用评分</span><strong style="color:' + color + '">' + score + '</strong></div>'
      + '<i><b style="width:' + score + '%;background:' + color + '"></b></i>'
      + '<small>' + label + '</small></section>';

    var loansHtml = state.finance.loans.length
      ? state.finance.loans.map(function (loan) {
          var typeName = (LOAN_DEFS[loan.type] && LOAN_DEFS[loan.type].name) || loan.type;
          return '<article class="loan-row">'
            + '<div><strong>' + typeName + '</strong>'
            + '<span>本金 ' + Game.view.money(loan.amount)
            + ' · 利率 ' + (loan.rate * 100).toFixed(1) + '%'
            + ' · 剩余 ' + loan.remainingMonths + ' 个月</span></div>'
            + '<b>月供 ' + Game.view.money(loan.monthlyPayment) + '</b>'
            + '<button data-bank-action="repay" data-bank-value="' + loan.id + '">还款</button>'
            + '</article>';
        }).join('')
      : '<p class="empty-state">当前无贷款</p>';

    var bizTotal = businessTotal(state);
    var hasBiz = (state.assets.businesses || []).length > 0;

    var applyRows = Object.keys(LOAN_DEFS).map(function (type) {
      var info = LOAN_DEFS[type];
      var maxAmt = type === 'business' ? Math.round(bizTotal * 0.7) : info.max;
      var hasLoan = state.finance.loans.some(function (loan) { return loan.type === type; });
      var disabled = false;
      var btnText = '申请';
      if (hasLoan) { disabled = true; btnText = '已有贷款'; }
      else if (type === 'business' && (!hasBiz || maxAmt <= 0)) { disabled = true; btnText = '需要先拥有产业'; }

      return '<article class="loan-apply-row">'
        + '<div><strong>' + info.name + '</strong>'
        + '<span>最高 ' + Game.view.money(maxAmt)
        + ' · 基础利率 ' + (info.rate * 100).toFixed(1) + '%'
        + ' · 期限 ' + info.term + ' 个月</span>'
        + '<small>抵押：' + info.collateral + '</small></div>'
        + '<button data-bank-action="apply" data-bank-type="' + type + '"'
        + (disabled ? ' disabled' : '') + '>' + btnText + '</button>'
        + '</article>';
    }).join('');

    var age = U.age(state);
    var hasJob = Boolean(state.career.job);
    var eligible = !hasJob && state.money < 1000 && age >= 18;

    var welfareHtml = '<section class="welfare-section">'
      + '<header><span>社会福利</span></header>'
      + '<div class="welfare-status">'
      + '<span>失业且现金不足 1000 时可领取低保</span>'
      + '<strong>' + (eligible ? '符合申领条件'
        : (hasJob ? '有工作者不符合' : (age < 18 ? '未成年不符合' : '现金超过 1000'))) + '</strong>'
      + (eligible ? '<button data-bank-action="welfare">领取低保</button>' : '')
      + '</div></section>';

    return '<div class="bank-system">' + scoreBar
      + '<section class="loan-section"><header><span>贷款管理</span></header>'
      + '<h3>当前贷款</h3>' + loansHtml
      + '<h3>申请贷款</h3>' + applyRows + '</section>'
      + welfareHtml + '</div>';
  }

  Game.bankSystem = Object.freeze({
    ensure, getCreditScore, applyLoan, repayLoan, welfare, monthly, render,
  });
}(window));
