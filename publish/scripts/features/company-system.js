(function initCompanySystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- industry definitions ---- */
  const INDUSTRIES = {
    餐饮: {
      name: '餐饮', icon: '',
      desc: '门槛低，现金流稳定，但竞争激烈。适合初次创业。',
      risk: '低', reward: '中低',
      monthlyRate: 0.05, minInvestment: 50000,
      adjectives: ['樱花', '和风', '美味', '鲜香', '炉端', '百味', '匠心', '御膳'],
    },
    科技: {
      name: '科技', icon: '',
      desc: '高增长潜力，研发投入大，周期性强。适合长线布局。',
      risk: '高', reward: '高',
      monthlyRate: 0.04, minInvestment: 200000,
      adjectives: ['星光', '未来', '数字', '创智', '天工', '量子', '星辰', '睿思'],
    },
    零售: {
      name: '零售', icon: '',
      desc: '跟随经济周期，稳定但利润薄。需要规模效应。',
      risk: '低', reward: '低',
      monthlyRate: 0.035, minInvestment: 80000,
      adjectives: ['百汇', '万客', '便利', '乐购', '丰盈', '千选', '惠享', '悦色'],
    },
    娱乐: {
      name: '娱乐', icon: '',
      desc: '与文化产业联动，爆款潜力巨大但不确定性高。',
      risk: '中高', reward: '高',
      monthlyRate: 0.045, minInvestment: 150000,
      adjectives: ['星梦', '极光', '幻彩', '璀璨', '华彩', '银河', '魔幻', '非凡'],
    },
    制造: {
      name: '制造', icon: '',
      desc: '最稳定的行业，受原材料价格影响，回报周期较长。',
      risk: '低', reward: '中',
      monthlyRate: 0.03, minInvestment: 300000,
      adjectives: ['精工', '匠心', '鼎力', '铸新', '坚石', '宏业', '瑞丰', '恒远'],
    },
    金融: {
      name: '金融', icon: '',
      desc: '高利润但强监管，周期波动大，需要雄厚资本。',
      risk: '高', reward: '极高',
      monthlyRate: 0.06, minInvestment: 500000,
      adjectives: ['瑞银', '汇通', '金石', '鼎信', '融达', '信恒', '泰和', '盛元'],
    },
    成人: {
      name: '成人', icon: '',
      desc: '灰色地带产业，暴利但法律风险高。反周期特性明显。',
      risk: '极高', reward: '极高',
      monthlyRate: 0.07, minInvestment: 30000,
      adjectives: ['夜色', '玫瑰', '蜜语', '暗香', '温柔', '绮梦', '月影', '迷情'],
    },
  };

  /* ---- legal type definitions ---- */
  const LEGAL_TYPES = {
    'solo-proprietor': {
      name: '个人独资', desc: '无限责任：公司债务需个人资产偿还。税率低（5%），决策自主。',
      liability: '无限', taxRate: 0.05, label: '个人独资 (风险自担·低税率)',
    },
    LLC: {
      name: '有限责任公司', desc: '有限责任：公司债务仅以出资额为限。标准税率（15%），正规可靠。',
      liability: '有限', taxRate: 0.15, label: '有限责任公司 (风险隔离·标准税率)',
    },
    partnership: {
      name: '合伙', desc: '与NPC合伙人共同经营，分担风险与收益。税率适中（10%），需要协调决策。',
      liability: '混合', taxRate: 0.10, label: '合伙经营 (风险共担·收益分享)',
    },
  };

  /* ---- strategy definitions ---- */
  const STRATEGIES = {
    conservative: {
      name: '保守稳健', desc: '稳扎稳打，控制成本，追求长期稳定回报。收入波动小，成长较慢。',
      multiplier: 0.7, volatility: 0.05, label: '保守稳健 (低风险·低波动)',
    },
    aggressive: {
      name: '激进扩张', desc: '大胆投资，快速扩张，追求高速增长。收入波动大，可能大赚也可能大亏。',
      multiplier: 1.5, volatility: 0.25, label: '激进扩张 (高风险·高回报)',
    },
    boutique: {
      name: '差异化精品', desc: '专注品质和口碑，做小众精品市场。收入稳定增长，品牌溢价高。',
      multiplier: 1.0, volatility: 0.10, label: '差异化精品 (中风险·品牌溢价)',
    },
  };

  /* ---- employee role definitions ---- */
  const EMPLOYEE_ROLES = [
    { id: 'staff', name: '普通员工', salary: 3000, desc: '基础劳动力，维持日常运营' },
    { id: 'tech', name: '技术骨干', salary: 8000, desc: '核心技术岗位，提升产品质量' },
    { id: 'sales', name: '销售精英', salary: 6000, desc: '拓展客户渠道，提升营收' },
    { id: 'manager', name: '管理人才', salary: 10000, desc: '提升运营效率，降低风险' },
  ];

  /* ---- market cycle helpers ---- */
  function getEconomyHealth(state) {
    const cycle = (state.totalMonths % 120) / 120;
    const sin = Math.sin(cycle * Math.PI * 2);
    return 0.5 + sin * 0.3;
  }

  function getMarketCycleMod(industry, state) {
    const month = state.totalMonths;
    const rng = U.between(92, 108) / 100;
    switch (industry) {
      case '科技': {
        const techCycle = month % 96; // 8yr: 5yr boom, 3yr bust
        if (techCycle < 60) return 0.7 + (techCycle / 60) * 0.7; // boom: 0.7→1.4
        return 1.3 - ((techCycle - 60) / 36) * 0.6; // bust: 1.3→0.7
      }
      case '餐饮': {
        const seasonMonth = month % 12;
        if (seasonMonth >= 5 && seasonMonth <= 7) return 1.2 * rng;  // summer peak
        if (seasonMonth >= 10 || seasonMonth <= 1) return 0.9 * rng;  // winter dip
        return 1.0 * rng;
      }
      case '成人': {
        const health = getEconomyHealth(state);
        return health < 0.45 ? 1.25 * rng : 0.85 * rng; // counter-cyclical
      }
      case '金融': {
        const finCycle = Math.floor(month / 18) % 2;
        return finCycle === 0 ? 1.15 * rng : 0.75 * rng; // bull/bear alternating
      }
      case '零售':
        return (0.8 + getEconomyHealth(state) * 0.4) * rng; // follows economy
      case '制造':
        return rng; // most stable
      case '娱乐': {
        const idolActive = state.idol?.active;
        const idolFans = state.idol?.fans || 0;
        const idolBonus = idolActive ? 0.75 + Math.min(idolFans / 500000, 0.3) : 0.6;
        return idolBonus * rng;
      }
      default:
        return rng;
    }
  }

  /* ---- event definitions ---- */
  const RANDOM_EVENTS = [
    { id: 'complaint', title: '客户投诉', desc: '一位重要客户对服务质量不满，要求赔偿。', effect: (c) => { c.monthlyIncome -= Math.round(c.monthlyIncome * 0.08); }, severity: 'negative' },
    { id: 'supplier_hike', title: '供应商涨价', desc: '原材料供应商突然提价15%，成本大幅上升。', effect: (c) => { c.monthlyIncome -= Math.round(c.monthlyIncome * 0.10); }, severity: 'negative' },
    { id: 'employee_quit', title: '员工离职', desc: '一名骨干员工提出辞职，需要紧急招聘。', effect: (c) => { if (c.employees.length > 0) c.employees.splice(U.between(0, c.employees.length - 1), 1); }, severity: 'negative' },
    { id: 'competitor_undercut', title: '竞争对手压价', desc: '竞争对手发起价格战，本季度利润受损。', effect: (c) => { c.monthlyIncome -= Math.round(c.monthlyIncome * 0.12); }, severity: 'negative' },
    { id: 'good_review', title: '口碑爆发', desc: '一位知名博主推荐了你的公司，客流量激增。', effect: (c) => { c.monthlyIncome += Math.round(c.monthlyIncome * 0.15); }, severity: 'positive' },
    { id: 'big_order', title: '大额订单', desc: '接到一笔意外的大额订单，本月收入大幅增长。', effect: (c) => { c.monthlyIncome += Math.round(c.monthlyIncome * 0.20); }, severity: 'positive' },
    { id: 'tax_break', title: '税收优惠', desc: '政府出台了行业扶持政策，获得税收减免。', effect: (c) => { c.monthlyIncome += Math.round(c.monthlyIncome * 0.05); }, severity: 'positive' },
    { id: 'employee_award', title: '员工获奖', desc: '你的员工在行业大赛中获奖，公司声誉提升。', effect: (c) => { c.monthlyIncome += Math.round(c.monthlyIncome * 0.08); }, severity: 'positive' },
  ];

  /* ---- utility ---- */
  function uid() {
    return 'comp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function autoName(industry, state) {
    const ind = INDUSTRIES[industry];
    const adj = U.random(ind.adjectives);
    const city = (state.location?.city || '东京').replace(/[市町村都道府県]$/, '');
    return city + adj + industry;
  }

  /* ---- state initialization ---- */
  function ensure(state) {
    state.companies = Array.isArray(state.companies) ? state.companies : [];
    state.companyCreationStage = state.companyCreationStage && typeof state.companyCreationStage === 'object'
      ? state.companyCreationStage : { active: false, stage: 0, industry: '', type: '', name: '', investment: 0, strategy: '' };
    state.creditScore = Number.isFinite(state.creditScore) ? state.creditScore : 50;
    state.criminalRecord = Number.isFinite(state.criminalRecord) ? state.criminalRecord : 0;
    return state.companies;
  }

  /* ---- creation wizard ---- */
  function startCreation(state) {
    if (U.age(state) < 18) return { ok: false, message: '成年后才能创办公司' };
    ensure(state);
    if (state.companyCreationStage.active) return { ok: false, message: '你已经在创建公司中了' };
    state.companyCreationStage = { active: true, stage: 0, industry: '', type: '', name: '', investment: 0, strategy: '' };
    return { ok: true, message: '开始创建公司' };
  }

  function advanceCreation(state, choice) {
    const cs = state.companyCreationStage;
    if (!cs.active) return { ok: false, message: '没有进行中的公司创建' };

    if (cs.stage === 0) {
      /* Pick industry */
      if (!INDUSTRIES[choice]) return { ok: false, message: '请选择一个有效的行业' };
      cs.industry = choice;
      cs.investment = INDUSTRIES[choice].minInvestment;
      cs.name = autoName(choice, state);
      cs.stage = 1;
      return { ok: true, message: `选择了${choice}行业` };
    }

    if (cs.stage === 1) {
      /* Pick legal type */
      if (!LEGAL_TYPES[choice]) return { ok: false, message: '请选择有效的公司类型' };
      cs.type = choice;
      cs.stage = 2;
      return { ok: true, message: `选择了${LEGAL_TYPES[choice].name}` };
    }

    if (cs.stage === 2) {
      /* Name + investment - choice is investment amount as string number */
      const amount = Math.round(Number(choice));
      const minInv = INDUSTRIES[cs.industry].minInvestment;
      if (!Number.isFinite(amount) || amount < minInv) {
        return { ok: false, message: `投资金额至少 ${Game.view.money(minInv)}` };
      }
      if (amount > state.money) return { ok: false, message: '资金不足' };
      cs.investment = amount;
      cs.stage = 3;
      return { ok: true, message: `设定投资 ${Game.view.money(amount)}` };
    }

    if (cs.stage === 3) {
      /* Pick strategy */
      if (!STRATEGIES[choice]) return { ok: false, message: '请选择有效的经营策略' };
      cs.strategy = choice;
      /* Finalize */
      return finalizeCreation(state);
    }

    return { ok: false, message: '创建流程异常' };
  }

  function setNameCreation(state, newName) {
    const cs = state.companyCreationStage;
    if (!cs.active || cs.stage !== 2) return { ok: false, message: '当前不能修改名称' };
    const trimmed = String(newName || '').trim();
    if (trimmed.length < 2 || trimmed.length > 20) return { ok: false, message: '公司名称需2-20个字' };
    cs.name = trimmed;
    return { ok: true, message: `公司名称已改为 ${trimmed}` };
  }

  function finalizeCreation(state) {
    const cs = state.companyCreationStage;
    const ind = INDUSTRIES[cs.industry];
    const type = LEGAL_TYPES[cs.type];
    const strat = STRATEGIES[cs.strategy];

    if (state.money < cs.investment) {
      cs.active = false;
      return { ok: false, message: '资金不足，创建失败' };
    }

    Game.economy.spend(state, cs.investment);

    const company = {
      id: uid(),
      name: cs.name,
      industry: cs.industry,
      type: cs.type,
      typeName: type.name,
      investment: cs.investment,
      strategy: cs.strategy,
      strategyName: strat.name,
      foundedMonth: state.totalMonths,
      monthlyIncome: Math.round(cs.investment * ind.monthlyRate * strat.multiplier),
      employees: [],
      events: [],
    };

    state.companies.push(company);
    state.creditScore = U.clamp(state.creditScore + 3, 0, 100);

    cs.active = false;
    Game.lifeDirector.addLog(state, '创办公司',
      `你投资${Game.view.money(cs.investment)}创办了${type.name}「${cs.name}」（${cs.industry}行业），采用${strat.name}策略。`, 'milestone');

    return { ok: true, message: `公司「${cs.name}」正式成立！`, company };
  }

  /* ---- monthly processing ---- */
  function monthly(state) {
    ensure(state);
    if (!state.companies.length) return;

    state.companies.forEach((company) => {
      const ind = INDUSTRIES[company.industry];
      const strat = STRATEGIES[company.strategy];
      const ageMonths = state.totalMonths - company.foundedMonth;

      /* Base income calculation */
      const ageBonus = 1 + Math.min(ageMonths / 120, 0.3); // up to 30% bonus over 10 years
      const cycleMod = getMarketCycleMod(company.industry, state);
      const volatility = strat.volatility;
      const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;

      let income = company.investment * ind.monthlyRate * strat.multiplier * cycleMod * ageBonus * randomFactor;

      /* Employee contributions */
      const managerCount = company.employees.filter((e) => e.role === 'manager').length;
      const techCount = company.employees.filter((e) => e.role === 'tech').length;
      const salesCount = company.employees.filter((e) => e.role === 'sales').length;
      const efficiencyBonus = 1 + managerCount * 0.03; // each manager +3% efficiency
      const qualityBonus = 1 + techCount * 0.02; // each tech +2% quality
      const salesBonus = 1 + salesCount * 0.04; // each sales +4% revenue
      income *= efficiencyBonus * qualityBonus * salesBonus;

      income = Math.round(Math.max(0, income));

      /* Employee salary costs */
      const salaryCost = company.employees.reduce((sum, emp) => sum + emp.salary, 0);

      /* Tax */
      const type = LEGAL_TYPES[company.type];
      const tax = Math.round(income * type.taxRate);

      /* Net income */
      company.monthlyIncome = Math.round(income - salaryCost - tax);

      /* Random events (15% chance) */
      if (Math.random() < 0.15) {
        const eventPool = RANDOM_EVENTS.filter((e) => true);
        const event = U.random(eventPool);
        event.effect(company);
        company.events.push({
          id: event.id, title: event.title, desc: event.desc,
          severity: event.severity, month: state.totalMonths,
        });
        company.events = company.events.slice(-20);
        Game.lifeDirector.addLog(state, `公司·${event.title}`,
          `「${company.name}」${event.desc}`, event.severity === 'positive' ? 'good' : 'normal');
      }

      /* Update player money with monthly profit */
      if (company.monthlyIncome > 0) {
        state.money += company.monthlyIncome;
        state.creditScore = U.clamp(state.creditScore + 1, 0, 100);
      } else if (company.monthlyIncome < 0) {
        /* Loss - unlimited liability for solo-proprietor */
        if (company.type === 'solo-proprietor') {
          state.money += company.monthlyIncome; // deducts from personal money
        }
        state.creditScore = U.clamp(state.creditScore - 1, 0, 100);
      }

      /* Partnership: shared profit with NPC partner */
      if (company.type === 'partnership' && company.monthlyIncome > 0) {
        const partnerShare = Math.round(company.monthlyIncome * 0.4);
        state.money -= partnerShare; // already added above, subtract partner's share
        company.monthlyIncome -= partnerShare;
      }
    });
  }

  /* ---- employee management ---- */
  function hireEmployee(state, companyId) {
    ensure(state);
    const company = state.companies.find((c) => c.id === companyId);
    if (!company) return { ok: false, message: '公司不存在' };

    const maxEmployees = 3 + Math.floor(company.investment / 100000);
    if (company.employees.length >= maxEmployees) {
      return { ok: false, message: `员工已满（上限${maxEmployees}人），增加投资可扩充团队` };
    }

    /* Recruit from city population */
    const cityPeople = Game.socialWorld?.cityPeople
      ? Game.socialWorld.cityPeople(state, state.location.city)
      : [];
    const candidates = cityPeople.filter((p) =>
      p.status === '健康' && U.personAge(state, p) >= 18 && U.personAge(state, p) <= 60
      && !company.employees.some((e) => e.personId === p.id)
    );

    const roleList = EMPLOYEE_ROLES.filter((r) => {
      if (r.id === 'manager' && company.employees.filter((e) => e.role === 'manager').length >= 2) return false;
      return true;
    });
    const role = U.random(roleList);

    let employee;
    if (candidates.length > 0) {
      const person = U.random(candidates);
      employee = {
        id: 'emp_' + uid(),
        personId: person.id,
        name: person.name,
        role: role.id,
        roleName: role.name,
        salary: role.salary,
        hiredMonth: state.totalMonths,
      };
    } else {
      /* Generate generic employee */
      employee = {
        id: 'emp_' + uid(),
        personId: null,
        name: autoEmployeeName(state),
        role: role.id,
        roleName: role.name,
        salary: role.salary,
        hiredMonth: state.totalMonths,
      };
    }

    company.employees.push(employee);
    Game.lifeDirector.addLog(state, '公司·招聘',
      `「${company.name}」雇佣了${employee.name}担任${role.name}，月薪${Game.view.money(role.salary)}。`, 'good');
    return { ok: true, message: `雇佣了${employee.name}（${role.name}）` };
  }

  function fireEmployee(state, companyId, employeeId) {
    ensure(state);
    const company = state.companies.find((c) => c.id === companyId);
    if (!company) return { ok: false, message: '公司不存在' };
    const idx = company.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) return { ok: false, message: '员工不存在' };
    const emp = company.employees[idx];
    company.employees.splice(idx, 1);
    Game.lifeDirector.addLog(state, '公司·解雇',
      `「${company.name}」解雇了${emp.name}（${emp.roleName}）。`, 'normal');
    return { ok: true, message: `已解雇${emp.name}` };
  }

  function autoEmployeeName(state) {
    const surnames = ['山田', '田中', '佐藤', '铃木', '高桥', '渡边', '伊藤', '中村', '小林', '加藤'];
    const givenNames = ['太郎', '健一', '直人', '翔太', '美咲', '优子', '惠美', '晴子', '浩二', '诚'];
    return U.random(surnames) + U.random(givenNames);
  }

  /* ---- company actions ---- */
  function investMore(state, companyId, amount) {
    ensure(state);
    const company = state.companies.find((c) => c.id === companyId);
    if (!company) return { ok: false, message: '公司不存在' };
    const val = Math.round(Number(amount));
    if (!Number.isFinite(val) || val < 10000) return { ok: false, message: '追加投资至少 10,000' };
    if (state.money < val) return { ok: false, message: '资金不足' };
    Game.economy.spend(state, val);
    company.investment += val;
    Game.lifeDirector.addLog(state, '公司·增资',
      `你向「${company.name}」追加投资${Game.view.money(val)}，总投资达${Game.view.money(company.investment)}。`, 'good');
    return { ok: true, message: `向「${company.name}」追加${Game.view.money(val)}投资` };
  }

  function sellCompany(state, companyId) {
    ensure(state);
    const idx = state.companies.findIndex((c) => c.id === companyId);
    if (idx === -1) return { ok: false, message: '公司不存在' };
    const company = state.companies[idx];

    /* Dynamic valuation */
    const ageMonths = state.totalMonths - company.foundedMonth;
    const ageMultiplier = 12 + Math.min(ageMonths / 12, 12); // 12-24 based on age (up to 12 years)
    const industryMultiplier = company.industry === '科技' ? 1.4
      : company.industry === '金融' ? 1.3
        : company.industry === '成人' ? 1.1 : 1.0;
    const cycleMod = getMarketCycleMod(company.industry, state);
    const marketMultiplier = 0.8 + cycleMod * 0.4;
    const valuation = Math.round(company.monthlyIncome * ageMultiplier * industryMultiplier * marketMultiplier);
    const finalPrice = Math.max(valuation, Math.round(company.investment * 0.5));

    state.money += finalPrice;
    state.creditScore = U.clamp(state.creditScore + 5, 0, 100);
    state.companies.splice(idx, 1);

    Game.lifeDirector.addLog(state, '公司·出售',
      `你以${Game.view.money(finalPrice)}出售了「${company.name}」（${company.industry}行业），经营了${Math.floor(ageMonths / 12)}年${ageMonths % 12}个月。`, 'milestone');
    return { ok: true, message: `「${company.name}」以${Game.view.money(finalPrice)}出售`, price: finalPrice };
  }

  function ipoCompany(state, companyId) {
    ensure(state);
    const company = state.companies.find((c) => c.id === companyId);
    if (!company) return { ok: false, message: '公司不存在' };

    /* Requirements check */
    const ageMonths = state.totalMonths - company.foundedMonth;
    if (ageMonths < 60) return { ok: false, message: `运营不足5年（当前${Math.floor(ageMonths / 12)}年${ageMonths % 12}个月）` };
    if (company.monthlyIncome < 5000) return { ok: false, message: `月收入不足5,000（当前${Game.view.money(company.monthlyIncome)}）` };
    if (state.creditScore < 60) return { ok: false, message: `信用评分不足60（当前${Math.round(state.creditScore)}）` };
    if (state.criminalRecord >= 20) return { ok: false, message: `犯罪记录过高（当前${state.criminalRecord}），无法通过审查` };

    /* Convert to tradeable stock */
    const ipoPrice = Math.round(company.monthlyIncome * 18);
    const totalShares = 100000;
    const retainedShares = Math.round(totalShares * 0.3); // player keeps 30%
    const publicShares = totalShares - retainedShares;

    /* Register in company market */
    const stockEntry = {
      companyId: company.id,
      price: ipoPrice,
      previous: ipoPrice,
      shares: retainedShares,
      basePrice: ipoPrice,
      baselineRevenue: company.monthlyIncome * 12,
      outlook: 0,
      totalShares: totalShares,
      availableShares: publicShares,
      revenue: company.monthlyIncome * 12,
      profit: Math.round(company.monthlyIncome * 12 * 0.15),
      growth: 0,
      risk: company.industry === '科技' || company.industry === '金融' ? 7 : 4,
      dividendRate: 0.012,
      history: Array.from({ length: 12 }, (_, i) => Math.round(ipoPrice * (0.85 + i * 0.015))),
      boardIds: [],
      lastDividend: 0,
    };

    if (!Game.config.companies) Game.config.companies = [];
    Game.config.companies.push({
      id: company.id,
      name: company.name,
      industry: company.industry,
      ticker: company.name.slice(0, 4).toUpperCase(),
    });

    state.assets.stocks = state.assets.stocks || {};
    state.assets.stocks[company.id] = stockEntry;

    /* Remove from personal companies and add IPO proceeds */
    state.companies = state.companies.filter((c) => c.id !== companyId);
    const ipoProceeds = Math.round(publicShares * ipoPrice * 0.85); // 15% underwriting fees
    state.money += ipoProceeds;
    state.creditScore = U.clamp(state.creditScore + 10, 0, 100);

    Game.lifeDirector.addLog(state, '公司·上市',
      `「${company.name}」成功IPO上市！发行价${Game.view.money(ipoPrice)}/股，你保留30%股份，融资${Game.view.money(ipoProceeds)}。`, 'milestone');
    return { ok: true, message: `「${company.name}」成功上市，融资${Game.view.money(ipoProceeds)}！`, ipoPrice, retainedShares };
  }

  function closeCompany(state, companyId) {
    ensure(state);
    const idx = state.companies.findIndex((c) => c.id === companyId);
    if (idx === -1) return { ok: false, message: '公司不存在' };
    const company = state.companies[idx];

    /* Recover 60% of investment */
    const recovered = Math.round(company.investment * 0.6);
    state.money += recovered;
    state.creditScore = U.clamp(state.creditScore - 5, 0, 100);
    state.companies.splice(idx, 1);

    const ageMonths = state.totalMonths - company.foundedMonth;
    Game.lifeDirector.addLog(state, '公司·关闭',
      `你关闭了「${company.name}」，回收${Game.view.money(recovered)}（投资额的60%）。`, 'normal');
    return { ok: true, message: `「${company.name}」已关闭，回收${Game.view.money(recovered)}`, recovered };
  }

  /* ---- rendering ---- */
  function renderCreationStage(state) {
    const cs = state.companyCreationStage;
    if (!cs || !cs.active) return '';

    if (cs.stage === 0) {
      /* Industry selection */
      const options = Object.entries(INDUSTRIES).map(([id, ind]) =>
        `<button data-company-create="${id}">
          <strong>${ind.name}</strong>
          <small>风险: ${ind.risk} · 回报: ${ind.reward} · 最低 ${Game.view.money(ind.minInvestment)}</small>
          <span>${ind.desc}</span>
        </button>`
      ).join('');

      return `<section class="panel">
        <div class="panel-title"><h2>创办公司</h2><span>选择行业</span></div>
        <p class="hint">选择一个行业起步。不同行业的风险和回报差异很大。</p>
        <div class="journey-options">${options}</div>
      </section>`;
    }

    if (cs.stage === 1) {
      /* Legal type selection */
      const options = Object.entries(LEGAL_TYPES).map(([id, type]) =>
        `<button data-company-create="${id}">
          <strong>${type.name}</strong>
          <small>责任: ${type.liability} · 税率: ${Math.round(type.taxRate * 100)}%</small>
          <span>${type.desc}</span>
        </button>`
      ).join('');

      return `<section class="panel">
        <div class="panel-title"><h2>创办公司</h2><span>选择类型 · ${cs.industry}</span></div>
        <p class="hint">选择公司法律类型，影响责任承担和税务成本。</p>
        <div class="journey-options">${options}</div>
        <button class="wide-action" data-company-create="back">返回修改行业</button>
      </section>`;
    }

    if (cs.stage === 2) {
      /* Name + investment */
      const ind = INDUSTRIES[cs.industry];
      return `<section class="panel">
        <div class="panel-title"><h2>创办公司</h2><span>命名与投资 · ${cs.industry}</span></div>
        <div class="form-row">
          <label>公司名称</label>
          <input type="text" id="company-name-input" value="${cs.name || ''}" maxlength="20" placeholder="输入公司名称">
          <button class="compact" data-company-setname>确认名称</button>
        </div>
        <p class="hint">最低投资: ${Game.view.money(ind.minInvestment)} · 当前资金: ${Game.view.money(state.money)}</p>
        <div class="investment-options">
          ${[1, 1.5, 2, 3, 5, 10].map((mult) => {
            const amount = Math.round(ind.minInvestment * mult);
            const canAfford = state.money >= amount;
            return `<button data-company-create="${amount}" ${canAfford ? '' : 'disabled'}>
              <strong>${Game.view.money(amount)}</strong>
              <small>${mult === 1 ? '最低投资' : mult + '倍投资'}</small>
            </button>`;
          }).join('')}
          <div class="custom-invest">
            <input type="number" id="custom-invest-input" min="${ind.minInvestment}" placeholder="自定义金额">
            <button data-company-invest-custom>确认自定义</button>
          </div>
        </div>
        <button class="wide-action" data-company-create="back">返回修改类型</button>
      </section>`;
    }

    if (cs.stage === 3) {
      /* Strategy selection */
      const options = Object.entries(STRATEGIES).map(([id, strat]) =>
        `<button data-company-create="${id}">
          <strong>${strat.name}</strong>
          <small>收入倍率: ${strat.multiplier}x · 波动: ${Math.round(strat.volatility * 100)}%</small>
          <span>${strat.desc}</span>
        </button>`
      ).join('');

      return `<section class="panel">
        <div class="panel-title"><h2>创办公司</h2><span>选择策略</span></div>
        <p class="hint">公司「${cs.name}」· ${cs.industry} · ${LEGAL_TYPES[cs.type].name} · 投资 ${Game.view.money(cs.investment)}</p>
        <div class="journey-options">${options}</div>
        <button class="wide-action" data-company-create="back">返回修改投资</button>
      </section>`;
    }

    return '';
  }

  function render(state) {
    ensure(state);
    const companies = state.companies;

    if (companies.length === 0) {
      return `<section class="panel">
        <div class="panel-title"><h2>我的公司</h2><span>商业帝国</span></div>
        <p class="empty-state">你还没有创办任何公司。创办公司可以创造稳定收入，甚至上市融资。</p>
        <button class="wide-action" data-company-start>创办公司</button>
      </section>`;
    }

    const list = companies.map((company) => {
      const ageMonths = state.totalMonths - company.foundedMonth;
      const ageStr = ageMonths >= 12
        ? `${Math.floor(ageMonths / 12)}年${ageMonths % 12 > 0 ? (ageMonths % 12) + '个月' : ''}`
        : `${ageMonths}个月`;
      const incomeColor = company.monthlyIncome >= 0 ? 'income-positive' : 'income-negative';

      return `<article class="company-card" data-company-id="${company.id}">
        <header>
          <strong>${company.name}</strong>
          <span class="company-badge">${company.industry}</span>
        </header>
        <div class="company-stats">
          <div><label>月收入</label><b class="${incomeColor}">${Game.view.money(company.monthlyIncome)}</b></div>
          <div><label>员工</label><b>${company.employees.length}人</b></div>
          <div><label>经营</label><b>${ageStr}</b></div>
          <div><label>类型</label><b>${LEGAL_TYPES[company.type]?.name || company.type}</b></div>
          <div><label>策略</label><b>${STRATEGIES[company.strategy]?.name || company.strategy}</b></div>
          <div><label>总投资</label><b>${Game.view.money(company.investment)}</b></div>
        </div>
        <div class="company-actions">
          <button data-company-hire="${company.id}" class="compact">招聘员工</button>
          <button data-company-invest="${company.id}" class="compact">追加投资</button>
          <button data-company-sell="${company.id}" class="compact">出售</button>
          <button data-company-ipo="${company.id}" class="compact accent">上市</button>
          <button data-company-close="${company.id}" class="compact danger">关闭</button>
        </div>
        ${renderEmployeeList(company)}
        ${renderEventHistory(company)}
      </article>`;
    }).join('');

    return `<section class="panel">
      <div class="panel-title"><h2>我的公司</h2><span>商业帝国 · ${companies.length}家</span></div>
      ${list}
      <button class="wide-action" data-company-start>创办新公司</button>
    </section>`;
  }

  function renderEmployeeList(company) {
    if (!company.employees.length) return '<p class="empty-state small">暂无员工，点击"招聘员工"扩充团队</p>';
    const rows = company.employees.map((emp) =>
      `<div class="employee-row">
        <span>${emp.name}</span>
        <small>${emp.roleName} · ${Game.view.money(emp.salary)}/月</small>
        <button data-company-fire="${company.id}|${emp.id}" class="compact danger" title="解雇">✕</button>
      </div>`
    ).join('');
    return `<div class="employee-list"><h4>员工 (${company.employees.length}人)</h4>${rows}</div>`;
  }

  function renderEventHistory(company) {
    if (!company.events.length) return '';
    const rows = company.events.slice(-5).reverse().map((evt) =>
      `<div class="event-row ${evt.severity}">
        <span>${evt.title}</span><small>${evt.desc}</small>
      </div>`
    ).join('');
    return `<div class="event-history"><h4>近期事件</h4>${rows}</div>`;
  }

  /* ---- click handling ---- */
  function handleClick(event) {
    const state = Game._getState ? Game._getState() : null;
    if (!state) return false;

    /* Start creation */
    const startBtn = event.target.closest('[data-company-start]');
    if (startBtn) {
      const result = startCreation(state);
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return true;
    }

    /* Creation wizard choice */
    const createBtn = event.target.closest('[data-company-create]');
    if (createBtn && state.companyCreationStage?.active) {
      const choice = createBtn.dataset.companyCreate;
      if (choice === 'back') {
        /* Go back a stage */
        if (state.companyCreationStage.stage > 0) {
          state.companyCreationStage.stage -= 1;
        } else {
          state.companyCreationStage.active = false;
        }
        Game._refresh();
        return true;
      }
      const result = advanceCreation(state, choice);
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return true;
    }

    /* Set company name */
    const setNameBtn = event.target.closest('[data-company-setname]');
    if (setNameBtn) {
      const input = document.getElementById('company-name-input');
      if (input && state.companyCreationStage?.active) {
        const result = setNameCreation(state, input.value);
        Game._refresh();
        Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      }
      return true;
    }

    /* Custom investment */
    const customInvestBtn = event.target.closest('[data-company-invest-custom]');
    if (customInvestBtn) {
      const input = document.getElementById('custom-invest-input');
      if (input && state.companyCreationStage?.active) {
        const result = advanceCreation(state, input.value);
        Game._refresh();
        Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      }
      return true;
    }

    /* Hire employee */
    const hireBtn = event.target.closest('[data-company-hire]');
    if (hireBtn) {
      const companyId = hireBtn.dataset.companyHire;
      const result = hireEmployee(state, companyId);
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return true;
    }

    /* Fire employee */
    const fireBtn = event.target.closest('[data-company-fire]');
    if (fireBtn) {
      const [companyId, employeeId] = fireBtn.dataset.companyFire.split('|');
      const result = fireEmployee(state, companyId, employeeId);
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return true;
    }

    /* Invest more */
    const investBtn = event.target.closest('[data-company-invest]');
    if (investBtn) {
      const companyId = investBtn.dataset.companyInvest;
      const amount = prompt('输入追加投资金额（最低10,000）:', '50000');
      if (amount !== null) {
        const result = investMore(state, companyId, Number(amount));
        Game._refresh();
        Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      }
      return true;
    }

    /* Sell company */
    const sellBtn = event.target.closest('[data-company-sell]');
    if (sellBtn) {
      const companyId = sellBtn.dataset.companySell;
      const company = state.companies.find((c) => c.id === companyId);
      if (company && confirm(`确定出售「${company.name}」吗？估值将在交易时确定。`)) {
        const result = sellCompany(state, companyId);
        Game._refresh();
        Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      }
      return true;
    }

    /* IPO */
    const ipoBtn = event.target.closest('[data-company-ipo]');
    if (ipoBtn) {
      const companyId = ipoBtn.dataset.companyIpo;
      const company = state.companies.find((c) => c.id === companyId);
      if (company && confirm(`确定让「${company.name}」上市吗？需要满足运营5年、月收入≥5,000、信用≥60、无重大犯罪记录等条件。`)) {
        const result = ipoCompany(state, companyId);
        Game._refresh();
        Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      }
      return true;
    }

    /* Close company */
    const closeBtn = event.target.closest('[data-company-close]');
    if (closeBtn) {
      const companyId = closeBtn.dataset.companyClose;
      const company = state.companies.find((c) => c.id === companyId);
      if (company && confirm(`确定关闭「${company.name}」吗？只能回收投资额的60%（约${Game.view.money(Math.round(company.investment * 0.6))}）。`)) {
        const result = closeCompany(state, companyId);
        Game._refresh();
        Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      }
      return true;
    }

    return false;
  }

  /* ---- export ---- */
  Game.companySystem = Object.freeze({
    ensure,
    startCreation,
    advanceCreation,
    setNameCreation,
    monthly,
    hireEmployee,
    fireEmployee,
    investMore,
    sellCompany,
    ipoCompany,
    closeCompany,
    render,
    renderCreationStage,
    handleClick,
  });
}(window));
