(function initStockDirector(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  const round = (value) => Math.round(value * 100) / 100;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

  const VOTE_TYPES = ['dividend', 'ceo', 'merger'];
  const BOARD_LINE = Game.companyMarket?.boardLine || 0.05;

  // ── state ──

  function ensure(state) {
    state.stockDirector ||= {
      voteHistory: [],
      directorBonuses: {},
      lastVoteMonth: 0,
      predictions: {},
      acquisitionHistory: [],
    };
    const sd = state.stockDirector;
    sd.voteHistory = Array.isArray(sd.voteHistory) ? sd.voteHistory.slice(-40) : [];
    sd.directorBonuses = sd.directorBonuses && typeof sd.directorBonuses === 'object' ? sd.directorBonuses : {};
    sd.lastVoteMonth = Math.max(0, Number(sd.lastVoteMonth) || 0);
    sd.predictions = sd.predictions && typeof sd.predictions === 'object' ? sd.predictions : {};
    sd.acquisitionHistory = Array.isArray(sd.acquisitionHistory) ? sd.acquisitionHistory.slice(-20) : [];
    return sd;
  }

  function directorCompanies(state) {
    ensure(state);
    const stocks = state.assets?.stocks || {};
    return Object.values(stocks).filter((stock) => {
      const ownership = (stock.shares || 0) / (stock.totalShares || 100000);
      return ownership >= BOARD_LINE;
    });
  }

  function ownership(stock) {
    return stock ? (stock.shares || 0) / (stock.totalShares || 100000) : 0;
  }

  // ── directorBonus ──

  function directorBonus(state) {
    ensure(state);
    const sd = state.stockDirector;
    const companies = directorCompanies(state);
    const bonuses = [];

    companies.forEach((stock) => {
      const company = Game.companyCatalog.find(stock.companyId);
      if (!company) return;

      const pct = ownership(stock);
      const dividend = Number(stock.lastDividend) || 0;
      const stipend = Math.round(stock.price * stock.shares * 0.001);

      let bonus = 0;
      let tier = '';

      if (pct >= 0.20) {
        bonus = Math.round(dividend * 3 + stipend);
        tier = '大股东（≥20%）';
      } else if (pct >= 0.10) {
        bonus = Math.round(dividend * 2.5 + stipend);
        tier = '核心董事（≥10%）';
      } else if (pct >= BOARD_LINE) {
        bonus = Math.round(dividend * 2 + stipend);
        tier = '董事（≥5%）';
      }

      const entry = {
        month: state.totalMonths,
        companyId: stock.companyId,
        companyName: company.name,
        ownership: round(pct * 100),
        dividend,
        stipend,
        bonus,
        tier,
      };
      bonuses.push(entry);

      // accumulate
      sd.directorBonuses[stock.companyId] ||= { total: 0, months: 0, companyName: company.name };
      sd.directorBonuses[stock.companyId].total += bonus;
      sd.directorBonuses[stock.companyId].months += 1;
    });

    return bonuses;
  }

  // ── jobReferralBonus ──

  function jobReferralBonus(state, companyId) {
    const stock = Game.companyMarket.record(state, companyId);
    if (!stock || ownership(stock) < BOARD_LINE) return { director: false, bonus: 0 };

    const company = Game.companyCatalog.find(companyId);
    return {
      director: true,
      bonus: 20,
      message: `作为${company?.name || '该公司'}的董事，你的推荐信可提高工作申请成功率20%`,
    };
  }

  // ── insidePrediction ──

  function insidePrediction(state, companyId) {
    const stock = Game.companyMarket.record(state, companyId);
    const company = Game.companyCatalog.find(companyId);
    if (!stock || !company) return { available: false, message: '公司股票数据不可用' };
    if (ownership(stock) < BOARD_LINE) {
      return { available: false, message: `需要持有${company.name}至少5%股份才能获取内部预测` };
    }

    const outlook = stock.outlook || 0;
    const growth = stock.growth || 0;

    let direction;
    let confidence;
    let hint;

    if (outlook > 10) {
      direction = '看涨';
      confidence = '较高';
      hint = '内部数据表明公司经营势头良好，营收增长预期强劲，股价有较大概率继续上行。';
    } else if (outlook > 3) {
      direction = '温和看涨';
      confidence = '中等';
      hint = '公司基本面稳定，增长态势温和，预计股价将保持平稳或小幅上涨。';
    } else if (outlook > -3) {
      direction = '震荡';
      confidence = '较低';
      hint = '当前市场信号混杂，盈利能力平稳但无明显增长催化剂，短期内股价可能窄幅震荡。';
    } else if (outlook > -10) {
      direction = '温和看跌';
      confidence = '中等';
      hint = '近期经营压力较大，利润率承压，可能面临下季度业绩下滑的风险。';
    } else {
      direction = '看跌';
      confidence = '较高';
      hint = '公司面临结构性挑战，营收和利润前景黯淡，建议审慎评估持仓。';
    }

    // cache prediction
    ensure(state);
    state.stockDirector.predictions[companyId] = {
      month: state.totalMonths,
      direction,
      confidence,
      outlook: round(outlook),
      growth: round(growth),
      price: stock.price,
    };

    return {
      available: true,
      companyName: company.name,
      outlook: round(outlook),
      growth: round(growth),
      price: stock.price,
      direction,
      confidence,
      hint,
    };
  }

  // ── board vote resolution ──

  function resolveVote(state, choice) {
    const d = state.pendingDecision;
    if (!d || d.type !== 'boardVote') return { ok: false, message: '没有待处理的董事会投票' };

    const stock = Game.companyMarket.record(state, d.companyId);
    const company = Game.companyCatalog.find(d.companyId);
    if (!stock || !company) return { ok: false, message: '公司数据异常' };

    const sd = ensure(state);
    let result;

    switch (d.subtype) {
      case 'dividend': {
        // choice: 'raise' or 'lower'
        if (choice === 'raise') {
          stock.dividendRate = clamp(stock.dividendRate + 0.005, 0, 0.2);
          stock.price = round(stock.price * (1 + U.clamp(Math.random(), 0.02, 0.06)));
          stock.outlook = clamp(stock.outlook - 2, -25, 35);
          result = `董事会通过提高分红决议，${company.name}股价短期上涨。`;
        } else {
          stock.dividendRate = clamp(stock.dividendRate - 0.004, 0, 0.2);
          stock.outlook = clamp(stock.outlook + 3, -25, 35);
          stock.growth = clamp(stock.growth + 1.5, -12, 14);
          result = `董事会通过降低分红、保留利润用于再投资，${company.name}长期增长前景改善。`;
        }
        break;
      }

      case 'ceo': {
        // choice: 'incumbent' or 'challenger'
        if (choice === 'incumbent') {
          stock.risk = clamp(stock.risk - 0.5, 1, 10);
          stock.price = round(stock.price * (1 + U.clamp(Math.random(), 0, 0.03)));
          stock.outlook = clamp(stock.outlook + 1, -25, 35);
          result = `现任CEO留任，${company.name}管理层保持稳定，经营策略延续。`;
        } else {
          const volatility = U.clamp(Math.random(), -0.12, 0.15);
          stock.risk = clamp(stock.risk + 1, 1, 10);
          stock.price = round(stock.price * (1 + volatility));
          stock.outlook = clamp(stock.outlook + (volatility > 0 ? 5 : -4), -25, 35);
          stock.growth = clamp(stock.growth + (volatility > 0 ? 2 : -3), -12, 14);
          if (volatility > 0) {
            result = `新CEO上任后推动激进改革，${company.name}股价大幅波动，市场给出积极回应。`;
          } else {
            result = `换帅过渡期不稳定，${company.name}股价短期承压，但改革潜力待观察。`;
          }
        }
        break;
      }

      case 'merger': {
        // choice: 'support' or 'oppose'
        if (choice === 'support') {
          stock.totalShares = Math.round(stock.totalShares * 1.3);
          stock.availableShares = Math.round(stock.availableShares * 1.3);
          stock.revenue = Math.round(stock.revenue * 1.5);
          stock.baselineRevenue = Math.round(stock.baselineRevenue * 1.5);
          stock.basePrice = round(stock.basePrice * 0.85);
          stock.price = round(stock.price * (1 + U.clamp(Math.random(), -0.04, 0.08)));
          stock.outlook = clamp(stock.outlook + 4, -25, 35);
          stock.risk = clamp(stock.risk + 0.5, 1, 10);
          result = `并购通过，${company.name}股本稀释但市场扩张，营收增长50%，股价短期波动。`;
        } else {
          stock.price = round(stock.price * (1 + U.clamp(Math.random(), -0.02, 0.02)));
          stock.outlook = clamp(stock.outlook - 1, -25, 35);
          result = `并购案被否决，${company.name}保持独立运营，市场反应平淡。`;
        }
        break;
      }

      default:
        return { ok: false, message: '未知投票类型' };
    }

    const entry = {
      month: state.totalMonths,
      companyId: d.companyId,
      companyName: company.name,
      type: d.subtype,
      choice,
      result,
    };
    sd.voteHistory.push(entry);

    Game.lifeDirector.addLog(
      state,
      `董事会投票 · ${company.name}`,
      result,
      choice === 'raise' || choice === 'challenger' || choice === 'support' ? 'good' : 'normal',
    );

    return { ok: true, message: result };
  }

  function renderDecision(state) {
    const d = state.pendingDecision;
    if (!d || d.type !== 'boardVote') return null;

    const company = Game.companyCatalog.find(d.companyId);
    const stock = Game.companyMarket.record(state, d.companyId);
    if (!company || !stock) return null;

    const companyName = company.name;
    const price = stock.price;

    switch (d.subtype) {
      case 'dividend':
        return {
          title: `董事会投票 · ${companyName}`,
          text: `持股比例达到董事门槛，你受邀参与${companyName}的董事会投票。当前股价 ${Game.view.money(price)}，分红率 ${round(stock.dividendRate * 100)}%。是否支持提高分红？`,
          options: [
            { value: 'raise', label: '支持提高分红（短期提振股价，降低增长潜力）' },
            { value: 'lower', label: '支持降低分红（利润再投资，利好长期成长）' },
          ],
        };
      case 'ceo':
        return {
          title: `董事会投票 · ${companyName}`,
          text: `${companyName}的CEO任期将满，董事会需要决定是否更换管理层。现任CEO风格稳健，挑战者以激进创新闻名。`,
          options: [
            { value: 'incumbent', label: '支持现任CEO留任（稳定，风险低）' },
            { value: 'challenger', label: '支持挑战者上任（高波动，潜在高回报）' },
          ],
        };
      case 'merger':
        return {
          title: `董事会投票 · ${companyName}`,
          text: `有财团提出收购${companyName}。若通过，股份将被稀释但市场大幅扩张；若否决，公司维持现状。`,
          options: [
            { value: 'support', label: '支持并购（股份稀释，营收增长50%）' },
            { value: 'oppose', label: '反对并购（维持现状，保持股份比例）' },
          ],
        };
      default:
        return null;
    }
  }

  // ── monthly ──

  function monthly(state) {
    ensure(state);
    const sd = state.stockDirector;

    // pay director bonuses
    const bonuses = directorBonus(state);
    let totalBonus = 0;
    bonuses.forEach((entry) => {
      if (entry.bonus > 0) {
        state.money += entry.bonus;
        totalBonus += entry.bonus;
        state.assets.dividends = (state.assets.dividends || 0) + entry.bonus;
      }
    });
    if (totalBonus > 0) {
      Game.lifeDirector.addLog(
        state,
        '董事津贴与分红',
        `本月收到来自 ${bonuses.length} 家公司的董事津贴及分红，合计 ${Game.view.money(totalBonus)}。`,
        'good',
      );
    }

    // every 12 months trigger board vote
    if (state.totalMonths - sd.lastVoteMonth >= 12) {
      const companies = directorCompanies(state);
      if (companies.length > 0) {
        // pick most-owned company
        companies.sort((a, b) => ownership(b) - ownership(a));
        const stock = companies[0];
        const voteIndex = Math.floor(state.totalMonths / 12) % VOTE_TYPES.length;
        const subtype = VOTE_TYPES[voteIndex];

        sd.lastVoteMonth = state.totalMonths;
        state.pendingDecision = { type: 'boardVote', companyId: stock.companyId, subtype };
      }
    }
  }

  // ── acquireCompany ──

  function acquireCompany(state, targetCompanyId) {
    ensure(state);
    const sd = state.stockDirector;

    const target = Game.companyMarket.record(state, targetCompanyId);
    const company = Game.companyCatalog.find(targetCompanyId);
    if (!target || !company) return { ok: false, message: '目标公司不存在' };

    const marketCap = target.price * target.totalShares;
    const currentOwnership = ownership(target);
    const requiredCash = Math.round(marketCap * 1.3);

    if (currentOwnership < 0.20 && state.money < requiredCash) {
      return {
        ok: false,
        message: `收购${company.name}需要持有至少20%股份或拥有 ${Game.view.money(requiredCash)} 现金`,
      };
    }

    if (currentOwnership >= 0.20) {
      // acquisition via majority ownership — no cash cost but price hit
      target.price = round(target.price * (1 - U.clamp(Math.random(), 0.03, 0.08)));
    } else {
      state.money -= requiredCash;
    }

    // effect: revenue boost
    target.revenue = Math.round(target.revenue * 1.5);
    target.baselineRevenue = Math.round(target.baselineRevenue * 1.3);
    target.growth = clamp(target.growth + 3, -12, 14);
    target.outlook = clamp(target.outlook + 5, -25, 35);
    target.risk = clamp(target.risk + 1.5, 1, 10);

    // old directors fight back → volatility
    const volatility = U.clamp(Math.random(), -0.10, 0.12);
    target.price = round(target.price * (1 + volatility));

    const costNote = currentOwnership >= 0.20
      ? '以大股东身份主导收购'
      : `花费 ${Game.view.money(requiredCash)}`;

    sd.acquisitionHistory.push({
      month: state.totalMonths,
      companyId: targetCompanyId,
      companyName: company.name,
      method: currentOwnership >= 0.20 ? '股权收购' : '现金收购',
      cost: currentOwnership >= 0.20 ? 0 : requiredCash,
      volatility: round(volatility * 100),
    });

    Game.lifeDirector.addLog(
      state,
      `收购完成 · ${company.name}`,
      `你${costNote}收购了${company.name}，营收增长50%，市场版图扩张。原有管理层可能反击导致股价波动。`,
      'milestone',
    );

    return {
      ok: true,
      message: `成功收购${company.name}！营收增长50%，关注后续股价波动。`,
    };
  }

  // ── render ──

  function render(state) {
    ensure(state);
    const sd = state.stockDirector;
    const companies = directorCompanies(state);

    if (!companies.length) {
      return '<section class="stock-director"><h3>股东董事</h3><p class="muted">你目前未持有任何公司5%以上的股份，无法进入董事会。</p></section>';
    }

    // director status per company
    const statusHtml = companies.map((stock) => {
      const company = Game.companyCatalog.find(stock.companyId);
      const pct = ownership(stock);
      const bonusData = sd.directorBonuses[stock.companyId] || { total: 0, months: 0 };
      const prediction = sd.predictions[stock.companyId];

      let tierLabel;
      if (pct >= 0.20) tierLabel = '大股东';
      else if (pct >= 0.10) tierLabel = '核心董事';
      else tierLabel = '董事（≥5%）';

      let predHtml = '';
      if (prediction && prediction.month === state.totalMonths) {
        predHtml = `<div class="prediction-badge ${prediction.direction.includes('涨') ? 'up' : (prediction.direction.includes('跌') ? 'down' : 'flat')}">
          <span>本月预测</span><strong>${prediction.direction}</strong>
          <small>信心: ${prediction.confidence}</small>
        </div>`;
      }

      return `<div class="director-company">
        <div class="company-header">
          <strong>${company?.name || stock.companyId}</strong>
          <span class="tier-badge">${tierLabel}</span>
          <span class="ownership">${round(pct * 100)}%</span>
        </div>
        <div class="company-stats">
          <span>股价 ${Game.view.money(stock.price)}</span>
          <span>营收 ${Game.creatorEconomy?.compact(stock.revenue) || stock.revenue}</span>
          <span>持股 ${stock.shares} 股</span>
        </div>
        <div class="bonus-info">累计津贴: ${Game.view.money(bonusData.total)} (${bonusData.months}个月)</div>
        ${predHtml}
      </div>`;
    }).join('');

    // vote history
    const recentVotes = sd.voteHistory.slice(-8).reverse();
    const voteHtml = recentVotes.length > 0 ? `<div class="vote-history">
      <h4>投票记录</h4>
      ${recentVotes.map((entry) => {
        const typeLabel = { dividend: '分红决议', ceo: 'CEO人选', merger: '并购提案' }[entry.type] || entry.type;
        const choiceLabel = {
          raise: '支持提高分红', lower: '支持降低分红',
          incumbent: '支持现任', challenger: '支持换帅',
          support: '支持并购', oppose: '反对并购',
        }[entry.choice] || entry.choice;
        return `<div class="vote-entry">
          <span class="vote-month">#${entry.month}</span>
          <span>${entry.companyName} · ${typeLabel}</span>
          <span class="vote-choice">${choiceLabel}</span>
          <small>${entry.result}</small>
        </div>`;
      }).join('')}
    </div>` : '';

    // acquisition history
    const acquisitions = sd.acquisitionHistory.slice(-5).reverse();
    const acqHtml = acquisitions.length > 0 ? `<div class="acquisition-history">
      <h4>收购记录</h4>
      ${acquisitions.map((entry) => `<div class="acq-entry">
        <span>#${entry.month}</span>
        <span>${entry.companyName}</span>
        <span>${entry.method}</span>
        <small>${entry.cost > 0 ? `花费 ${Game.view.money(entry.cost)}` : '股权主导'} · 波动 ${entry.volatility}%</small>
      </div>`).join('')}
    </div>` : '';

    // bonus summary this month
    const thisMonthBonuses = directorBonus(state);
    const totalThisMonth = thisMonthBonuses.reduce((sum, entry) => sum + entry.bonus, 0);

    return `<section class="stock-director">
      <h3>股东董事</h3>
      <div class="bonus-summary">
        本月董事津贴合计：<strong>${Game.view.money(totalThisMonth)}</strong>
        <small>（含分红加成 + 董事月薪）</small>
      </div>
      <div class="director-list">${statusHtml}</div>
      ${voteHtml}
      ${acqHtml}
    </section>`;
  }

  // ── export ──

  Game.stockDirector = Object.freeze({
    directorBonus,
    jobReferralBonus,
    insidePrediction,
    monthly,
    acquireCompany,
    render,
    resolve: resolveVote,
    renderDecision,
  });
}(window));
