(function initCareerPanels(root) {
  'use strict';

  var Game = root.LifeGame = root.LifeGame || {};
  var U = Game.content;

  /* ---- shared helpers ---- */

  function tabBar(tabs, active, attr) {
    return '<nav class="filter-chips">' + tabs.map(function (tab) {
      return '<button class="' + (active === tab ? 'active' : '') + '" ' + attr + '="' + tab + '">' + tab + '</button>';
    }).join('') + '</nav>';
  }

  function labelValue(label, value) {
    return '<div><span>' + label + '</span><strong>' + value + '</strong></div>';
  }

  function progressBar(current, max) {
    var pct = U.clamp(Math.round((current / max) * 100), 0, 100);
    return '<div class="progress-bar"><i style="width:' + pct + '%"></i><span>' + pct + '%</span></div>';
  }

  /* ---- black market items ---- */

  var BLACK_MARKET_ITEMS = [
    { id: 'aphrodisiac', name: '春药', buyPrice: 200, sellPrice: 800, risk: 'low' },
    { id: 'drug', name: '迷药', buyPrice: 500, sellPrice: 2000, risk: 'high' },
    { id: 'toy', name: '成人玩具', buyPrice: 150, sellPrice: 600, risk: 'veryLow' },
    { id: 'fakeId', name: '假身份证', buyPrice: 3000, sellPrice: 8000, risk: 'medium' },
    { id: 'smKit', name: 'SM道具', buyPrice: 800, sellPrice: 3000, risk: 'low' },
    { id: 'spyCam', name: '偷拍设备', buyPrice: 2000, sellPrice: 6000, risk: 'medium' },
  ];

  var RISK_LABELS = { veryLow: '极低', low: '低', medium: '中', high: '高' };

  /* ---- promotion ladders by industry ---- */

  var PROMOTION_LADDERS = {
    科技: ['初级工程师', '高级工程师', '资深工程师', '首席工程师', '技术总监', 'CTO'],
    金融: ['分析师', '高级分析师', 'VP', '董事', 'MD', '合伙人'],
    文职: ['科员', '副主任科员', '主任科员', '副处长', '处长', '局长'],
    医疗: ['住院医师', '主治医师', '副主任医师', '主任医师', '科室主任', '院长'],
    教育: ['助教', '讲师', '副教授', '教授', '系主任', '校长'],
  };

  function findLadder(job) {
    if (!job) return null;
    var industry = job.industry || '';
    if (PROMOTION_LADDERS[industry]) return PROMOTION_LADDERS[industry];
    /* Guess by category */
    if (job.category === '科学') return PROMOTION_LADDERS['科技'];
    if (job.category === '商业' || industry === '金融') return PROMOTION_LADDERS['金融'];
    return null;
  }

  function currentRankIndex(state, ladder) {
    var job = Game.config.jobs.find(function (item) { return item.id === state.career.jobId; });
    var name = (job && job.name) || state.career.job || '';
    for (var i = 0; i < ladder.length; i += 1) {
      if (name.indexOf(ladder[i]) !== -1 || (job && job.id && ladder[i].indexOf(name) !== -1)) return i;
    }
    return Math.min(state.career.titleRank, ladder.length - 1);
  }

  /* ================================================================
     officePanel(state, money)
     ================================================================ */

  function officeWorkTab(state, money) {
    var salary = state.career.salary || 0;
    var perf = state.career.performance || 0;
    var goal = 72;
    var trend = state.career.exp || 0;
    var isFreelance = false;
    var job = Game.config.jobs.find(function (item) { return item.id === state.career.jobId; });
    if (job && job.freelance) isFreelance = true;

    var actions = isFreelance
      ? [['create', '发布作品'], ['stream', '直播'], ['sponsor', '商务合作'], ['convention', '参加漫展'], ['promotion', '扩大事业']]
      : [['focus', '专注工作'], ['network', '经营人脉'], ['train', '技能培训'], ['overtime', '项目加班'], ['project', '项目攻坚']];

    return '<section class="work-dashboard">'
      + '<div class="work-metrics">'
      + labelValue('当前月薪', money(salary))
      + labelValue('当前绩效', perf + ' / ' + goal)
      + labelValue('累计经验', String(trend))
      + labelValue('绩效趋势', perf >= 65 ? '上升' : (perf >= 35 ? '平稳' : '下降'))
      + '</div>'
      + progressBar(perf, goal)
      + '<div class="work-actions">'
      + actions.map(function (pair) {
          return '<button data-work-action="' + pair[0] + '">' + pair[1] + '</button>';
        }).join('')
      + '</div>'
      + '</section>';
  }

  function officePromotionTab(state) {
    var job = Game.config.jobs.find(function (item) { return item.id === state.career.jobId; });
    var ladder = findLadder(job);
    if (!ladder) return '<section class="promotion-ladder"><p class="empty-state">当前职业暂无标准晋升阶梯。</p></section>';

    var idx = currentRankIndex(state, ladder);
    var nextIdx = idx + 1;
    var currentTitle = ladder[idx] || '当前职位';
    var nextTitle = ladder[nextIdx] || '已达顶级';
    var trackTitle = Game.careerGrowth ? Game.careerGrowth.titleName(state) : currentTitle;

    var requiredPerf = 48 + nextIdx * 7;
    var requiredExp = 12 + nextIdx * 12;
    var canPromote = state.career.performance >= requiredPerf && state.career.exp >= requiredExp;
    var probability = nextIdx < ladder.length
      ? Math.round(U.clamp(0.28 + state.career.performance / 170 + state.career.exp / 800, 0.3, 0.88) * 100)
      : 0;

    var ladderHtml = ladder.map(function (title, i) {
      var cls = i < idx ? 'done' : (i === idx ? 'current' : 'future');
      return '<li class="ladder-step ' + cls + '">'
        + '<span class="ladder-dot"></span>'
        + '<strong>' + title + '</strong>'
        + (i === idx ? '<small>当前</small>' : (i < idx ? '<small>已达成</small>' : ''))
        + '</li>';
    }).join('');

    return '<section class="promotion-ladder">'
      + '<div class="promotion-current">'
      + '<strong>' + trackTitle + '</strong>'
      + '<small>当前职阶 · 薪资P' + (state.career.level + 1) + '</small>'
      + '</div>'
      + '<div class="promotion-next">'
      + '<span>下一级：' + nextTitle + '</span>'
      + '<div class="promotion-conditions">'
      + '<span>绩效要求 <b>' + requiredPerf + '</b> ' + (canPromote ? '✓' : '✗') + '</span>'
      + '<span>经验要求 <b>' + requiredExp + '</b> ' + (canPromote ? '✓' : '✗') + '</span>'
      + '<span>从业年限 <b>' + nextIdx + '+年</b></span>'
      + '</div>'
      + '<span class="promotion-prob">晋升成功率 <b>' + probability + '%</b></span>'
      + '</div>'
      + '<ol class="ladder-list">' + ladderHtml + '</ol>'
      + '<div class="system-actions">'
      + (state.career.titleTrack === 'staff'
        ? '<button data-workplace-action="promote-management">申请管理提拔</button><button data-workplace-action="promote-professional">申请专业晋级</button>'
        : '<button data-workplace-action="promote-' + state.career.titleTrack + '">申请职级晋升</button>')
      + '</div>'
      + '</section>';
  }

  function officeColleaguesTab(state) {
    if (!state.workplace || !state.workplace.companyId) {
      return '<section class="org-chart"><p class="empty-state">当前没有入职单位，暂无同事信息。</p></section>';
    }
    var leader = Game.people ? Game.people.find(state, state.workplace.leaderId) : null;
    var roster = (state.workplace.rosterIds || []).map(function (id) {
      return Game.people ? Game.people.find(state, id) : null;
    }).filter(Boolean);

    var subordinates = roster.filter(function (p) {
      return p && p.managerId === 'player-profile';
    }).slice(0, 4);
    var peers = roster.filter(function (p) {
      return p && p.id !== (leader && leader.id) && p.managerId !== 'player-profile';
    }).slice(0, 5);

    function personRow(person, role) {
      if (!person) return '';
      var jobTitle = person.job || person.departmentName || '同事';
      return '<button class="relation-link" type="button" data-character-id="' + person.id + '">'
        + '<span class="relation-avatar">' + (Game.portraitSystem ? Game.portraitSystem.avatar(person) : '') + '</span>'
        + '<span class="relation-kind">' + role + '</span>'
        + '<strong>' + person.name + '</strong>'
        + '<small>' + jobTitle + '</small>'
        + '</button>';
    }

    var yourEntry = '<button class="relation-link current" type="button">'
      + '<span class="relation-avatar">👤</span>'
      + '<span class="relation-kind">你</span>'
      + '<strong>' + state.name + '</strong>'
      + '<small>' + (state.career.job || '员工') + '</small>'
      + '</button>';

    return '<section class="org-chart">'
      + '<h4>组织架构</h4>'
      + '<div class="org-section">'
      + '<h5>直属领导</h5>'
      + '<div class="relation-links">' + (leader ? personRow(leader, '领导') : '<p class="empty-state">暂无领导信息</p>') + '</div>'
      + '</div>'
      + '<div class="org-section">'
      + '<h5>你的位置</h5>'
      + '<div class="relation-links">' + yourEntry + '</div>'
      + '</div>'
      + '<div class="org-section">'
      + '<h5>下属 (' + subordinates.length + '人)</h5>'
      + '<div class="relation-links">'
      + (subordinates.length ? subordinates.map(function (p) { return personRow(p, '下属'); }).join('') : '<p class="empty-state">暂无下属</p>')
      + '</div>'
      + '</div>'
      + '<div class="org-section">'
      + '<h5>平级同事</h5>'
      + '<div class="relation-links">'
      + (peers.length ? peers.map(function (p) { return personRow(p, '同事'); }).join('') : '<p class="empty-state">暂无同事信息</p>')
      + '</div>'
      + '</div>'
      + '</section>';
  }

  function officeCareerPlanTab(state) {
    var history = (state.career.applications || []).slice().reverse();
    if (!history.length) {
      return '<section class="career-history"><p class="empty-state">暂无职业历史记录。</p></section>';
    }
    return '<section class="career-history">' + history.map(function (entry, i) {
      var acceptedLabel = entry.accepted ? '已录取' : '未录取';
      return '<article class="history-entry">'
        + '<div><strong>' + entry.name + '</strong><span>' + entry.company + '</span></div>'
        + '<small>' + entry.city + ' · ' + acceptedLabel + '</small>'
        + '</article>';
    }).join('') + '</section>';
  }

  function officePanel(state, money) {
    return '<div class="career-panel">'
      + tabBar(['工作', '晋升', '同事', '职业规划'], '工作', 'data-career-tab')
      + '<div class="career-panel-tab" data-panel-tab="工作">' + officeWorkTab(state, money) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="晋升" style="display:none">' + officePromotionTab(state) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="同事" style="display:none">' + officeColleaguesTab(state) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="职业规划" style="display:none">' + officeCareerPlanTab(state) + '</div>'
      + '</div>';
  }

  /* ================================================================
     sexWorkPanel(state) — 妓女/福利姬
     ================================================================ */

  function sexWorkAppointmentsTab(state) {
    var working = state.health && !state.health.resting;
    var brothel = state.brothelStage && state.brothelStage.active;
    var statusLabel = brothel ? '在岗接待中' : (working ? '在岗' : '休息');

    /* Generate some appointment clients from city NPC pool */
    var cityWomen = state.worldPeople
      ? state.worldPeople.filter(function (p) { return p.currentCity === state.location.city && p.gender === '女'; })
      : [];
    var clients = cityWomen.slice(0, 5).map(function (p, i) {
      var serviceTypes = ['快餐', '包夜', '全套', '口活', '胸推', '按摩陪聊'];
      var price = 300 + i * 150 + Math.floor(Math.random() * 400);
      return {
        name: p.name,
        service: serviceTypes[i % serviceTypes.length],
        price: price,
        time: '今晚',
      };
    });
    if (!clients.length) {
      clients = [
        { name: '王先生', service: '快餐', price: 400, time: '今晚' },
        { name: '李老板', service: '包夜', price: 1200, time: '明晚' },
        { name: '张总', service: '全套', price: 800, time: '预约中' },
      ];
    }

    return '<section class="sex-work-appointments">'
      + '<div class="sex-status">'
      + '<span>当前状态</span><strong>' + statusLabel + '</strong>'
      + '</div>'
      + '<div class="appointment-list">'
      + '<h5>预约列表</h5>'
      + clients.map(function (c) {
          return '<article class="appointment-row">'
            + '<div><strong>' + c.name + '</strong><span>' + c.service + '</span></div>'
            + '<b>' + (Game.view ? Game.view.money(c.price) : (c.price + '元')) + '</b>'
            + '<small>' + c.time + '</small>'
            + '</article>';
        }).join('')
      + '</div>'
      + '<div class="system-actions">'
      + '<button data-sex-work="street">街头拉客</button>'
      + '<button data-sex-work="accept">接受预约</button>'
      + '<button data-sex-work="reject">拒绝客户</button>'
      + '<button data-sex-work="changeVenue">换会所</button>'
      + '</div>'
      + '</section>';
  }

  function sexWorkClienteleTab(state) {
    /* VIP regulars */
    var regulars = state.worldPeople
      ? state.worldPeople.filter(function (p) {
          return p.wealth > 500000 && p.gender === '男' && U.personAge(state, p) >= 25;
        }).slice(0, 4).map(function (p) {
          return {
            name: p.name,
            wealth: p.wealth || 500000,
            visits: Math.floor(Math.random() * 10) + 1,
            special: Math.random() < 0.3,
          };
        })
      : [
          { name: '陈总', wealth: 2000000, visits: 12, special: true },
          { name: '赵局', wealth: 800000, visits: 5, special: false },
          { name: '周老板', wealth: 5000000, visits: 3, special: true },
        ];

    return '<section class="vip-clients">'
      + '<h5>金主/VIP常客</h5>'
      + regulars.map(function (r) {
          var wealthLabel = r.wealth >= 5000000 ? '富豪' : (r.wealth >= 1000000 ? '富裕' : '殷实');
          return '<article class="vip-row' + (r.special ? ' special' : '') + '">'
            + '<div><strong>' + r.name + '</strong>' + (r.special ? '<mark>特殊客户</mark>' : '') + '</div>'
            + '<span>资产' + wealthLabel + ' · 消费' + r.visits + '次</span>'
            + '</article>';
        }).join('')
      + '<div class="system-actions">'
      + '<button data-sex-work="findPatron">寻找新金主</button>'
      + '<button data-sex-work="privateDeal">私下交易</button>'
      + '</div>'
      + '</section>';
  }

  function sexWorkHealthTab(state) {
    var health = state.health || {};
    var stdStatus = health.std || '无';
    var riskLevel = (state.career.burnout || 0) > 60 ? '高风险' : ((state.career.burnout || 0) > 30 ? '中风险' : '低风险');
    var lastCheckup = health.lastCheckupMonth
      ? '第' + (state.totalMonths - health.lastCheckupMonth) + '个月前'
      : '从未';

    return '<section class="sex-health">'
      + '<div class="health-metrics">'
      + labelValue('健康风险', riskLevel)
      + labelValue('性病状态', stdStatus === '无' ? '无异常' : stdStatus)
      + labelValue('上次体检', lastCheckup)
      + labelValue('职业倦怠', String(state.career.burnout || 0) + '/100')
      + '</div>'
      + '<p class="system-note">建议每6个月进行一次体检以保障健康。</p>'
      + '<div class="system-actions">'
      + '<button data-sex-work="checkup">预约体检</button>'
      + '<button data-sex-work="rest">休息调整</button>'
      + '</div>'
      + '</section>';
  }

  function sexWorkCareerPlanTab(state) {
    var history = (state.career.applications || []).slice().reverse();
    if (!history.length) {
      return '<section class="career-history"><p class="empty-state">暂无职业历史记录。</p></section>';
    }
    return '<section class="career-history">' + history.map(function (entry) {
      var acceptedLabel = entry.accepted ? '已录取' : '未录取';
      return '<article class="history-entry">'
        + '<div><strong>' + entry.name + '</strong><span>' + entry.company + '</span></div>'
        + '<small>' + entry.city + ' · ' + acceptedLabel + '</small>'
        + '</article>';
    }).join('') + '</section>';
  }

  function sexWorkPanel(state) {
    return '<div class="career-panel">'
      + tabBar(['接客', '金主', '健康', '职业规划'], '接客', 'data-career-tab')
      + '<div class="career-panel-tab" data-panel-tab="接客">' + sexWorkAppointmentsTab(state) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="金主" style="display:none">' + sexWorkClienteleTab(state) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="健康" style="display:none">' + sexWorkHealthTab(state) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="职业规划" style="display:none">' + sexWorkCareerPlanTab(state) + '</div>'
      + '</div>';
  }

  /* ================================================================
     pimpPanel(state) — 皮条客
     ================================================================ */

  function pimpBusinessTab(state) {
    /* Generate or retrieve prostitute list */
    var girls = state.brothel && state.brothel.girls
      ? state.brothel.girls
      : [];
    if (!girls.length) {
      /* Generate some sample data from city NPCs */
      var cityFemales = state.worldPeople
        ? state.worldPeople.filter(function (p) {
            return p.currentCity === state.location.city && p.gender === '女' && U.personAge(state, p) >= 18 && U.personAge(state, p) <= 40;
          }).slice(0, 6)
        : [];
      girls = cityFemales.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          age: U.personAge(state, p),
          health: U.clamp(p.stats ? (p.stats.健康 || 70) : Math.floor(50 + Math.random() * 40), 0, 100),
          loyalty: U.clamp(Number(p.affection) || 40, 0, 100),
          monthlyIncome: 2000 + Math.floor(Math.random() * 6000),
          status: Math.random() < 0.7 ? '接客中' : '休息',
        };
      });
      if (!girls.length) {
        girls = [
          { id: 'g1', name: '小莉', age: 22, health: 85, loyalty: 60, monthlyIncome: 5000, status: '接客中' },
          { id: 'g2', name: '阿美', age: 25, health: 70, loyalty: 45, monthlyIncome: 8000, status: '接客中' },
          { id: 'g3', name: '小芳', age: 20, health: 90, loyalty: 75, monthlyIncome: 3500, status: '休息' },
        ];
      }
    }

    var traffic = Math.floor(30 + Math.random() * 70);
    var policeRisk = state.brothel ? (state.brothel.policeRisk || 0) : 15;

    return '<section class="pimp-business">'
      + '<div class="girls-roster">'
      + '<h5>旗下小姐 (' + girls.length + '人)</h5>'
      + girls.map(function (g) {
          return '<article class="girl-row">'
            + '<div><strong>' + g.name + '</strong><span>' + g.age + '岁 · ' + g.status + '</span></div>'
            + '<div class="girl-stats">'
            + '<span>健康' + g.health + '</span>'
            + '<span>忠诚' + g.loyalty + '</span>'
            + '<span>月收' + (Game.view ? Game.view.money(g.monthlyIncome) : g.monthlyIncome + '元') + '</span>'
            + '</div>'
            + '</article>';
        }).join('')
      + '</div>'
      + '<div class="business-metrics">'
      + labelValue('客流量趋势', traffic >= 60 ? '上升 ↑' : (traffic >= 40 ? '平稳 →' : '下滑 ↓'))
      + labelValue('警方风险', String(policeRisk) + '/100 ' + (policeRisk > 50 ? '⚠高' : (policeRisk > 20 ? '注意' : '安全')))
      + '</div>'
      + '<div class="system-actions">'
      + '<button data-pimp-action="security">提升安保 (-5000)</button>'
      + '<button data-pimp-action="expand">扩大会所 (-20000)</button>'
      + '</div>'
      + '</section>';
  }

  function pimpRecruitTab(state) {
    var candidates = state.worldPeople
      ? state.worldPeople.filter(function (p) {
          return p.currentCity === state.location.city && p.gender === '女'
            && U.personAge(state, p) >= 18 && U.personAge(state, p) <= 35
            && p.status === '健康' && !p.sexWork;
        }).slice(0, 8)
      : [];

    return '<section class="pimp-recruit">'
      + '<h5>可招募女性NPC (' + candidates.length + '人)</h5>'
      + (candidates.length
        ? candidates.map(function (c) {
            var age = U.personAge(state, c);
            var charm = c.stats ? (c.stats.魅力 || 50) : 50;
            var salary = 1500 + Math.floor(charm * 30);
            return '<article class="recruit-row">'
              + '<div><strong>' + c.name + '</strong><span>' + age + '岁 · 魅力' + Math.round(charm) + '</span></div>'
              + '<b>底薪' + (Game.view ? Game.view.money(salary) : salary + '元') + ' + 提成50%</b>'
              + '<button data-pimp-action="recruit" data-recruit-id="' + c.id + '" data-recruit-salary="' + salary + '">招募</button>'
              + '</article>';
          }).join('')
        : '<p class="empty-state">当前城市暂无合适的招募对象。</p>')
      + '</section>';
  }

  function pimpFinanceTab(state) {
    var girls = state.brothel && state.brothel.girls ? state.brothel.girls : [];
    var totalRevenue = girls.reduce(function (sum, g) { return sum + (g.monthlyIncome || 0); }, 0);
    if (!totalRevenue) totalRevenue = 25000 + Math.floor(Math.random() * 30000);
    var salaries = girls.reduce(function (sum, g) { return sum + Math.round((g.monthlyIncome || 0) * 0.4); }, 0);
    if (!salaries) salaries = Math.round(totalRevenue * 0.35);
    var rent = 8000;
    var misc = Math.round(totalRevenue * 0.08);
    var netProfit = totalRevenue - salaries - rent - misc;

    return '<section class="pimp-finance">'
      + '<div class="finance-metrics">'
      + labelValue('总收入', Game.view ? Game.view.money(totalRevenue) : totalRevenue + '元')
      + labelValue('小姐薪资', Game.view ? Game.view.money(salaries) : salaries + '元')
      + labelValue('场租/安保', Game.view ? Game.view.money(rent) : rent + '元')
      + labelValue('杂项支出', Game.view ? Game.view.money(misc) : misc + '元')
      + '</div>'
      + '<div class="finance-net">'
      + '<strong>净利润</strong><b>' + (Game.view ? Game.view.money(netProfit) : netProfit + '元') + '</b>'
      + '</div>'
      + '</section>';
  }

  function pimpPanel(state) {
    return '<div class="career-panel">'
      + tabBar(['妓院经营', '招募', '财务'], '妓院经营', 'data-career-tab')
      + '<div class="career-panel-tab" data-panel-tab="妓院经营">' + pimpBusinessTab(state) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="招募" style="display:none">' + pimpRecruitTab(state) + '</div>'
      + '<div class="career-panel-tab" data-panel-tab="财务" style="display:none">' + pimpFinanceTab(state) + '</div>'
      + '</div>';
  }

  /* ================================================================
     blackMarketPanel(state) — 黑市商人
     ================================================================ */

  function blackMarketPanel(state) {
    /* Retrieve or init stock */
    var stock = state.blackMarket && state.blackMarket.stock
      ? state.blackMarket.stock
      : {};
    var items = BLACK_MARKET_ITEMS.map(function (item) {
      var currentStock = Number(stock[item.id]) || 0;
      var profit = item.sellPrice - item.buyPrice;
      return '<article class="black-market-item">'
        + '<div><strong>' + item.name + '</strong><span>风险：' + (RISK_LABELS[item.risk] || item.risk) + '</span></div>'
        + '<div class="bm-prices">'
        + '<span>进价' + (Game.view ? Game.view.money(item.buyPrice) : item.buyPrice + '元') + '</span>'
        + '<span>售价' + (Game.view ? Game.view.money(item.sellPrice) : item.sellPrice + '元') + '</span>'
        + '<span>利润' + (Game.view ? Game.view.money(profit) : profit + '元') + '</span>'
        + '</div>'
        + '<div class="bm-stock">库存：<b>' + currentStock + '</b></div>'
        + '<button data-black-market="buy" data-item-id="' + item.id + '">进货</button>'
        + '</article>';
    }).join('');

    return '<div class="career-panel">'
      + '<section class="black-market">'
      + '<h4>黑市仓库</h4>'
      + '<div class="black-market-items">' + items + '</div>'
      + '<div class="system-actions">'
      + '<button data-black-market="buyAll">批量进货所有</button>'
      + '</div>'
      + '</section>'
      + '</div>';
  }

  /* ================================================================
     routePanel(state, money) — detect career type, route
     ================================================================ */

  function routePanel(state, money) {
    /* Company creation wizard */
    if (state.companyCreationStage && state.companyCreationStage.active) {
      return Game.companySystem ? Game.companySystem.renderCreationStage(state) : '<p>公司创建系统加载中...</p>';
    }

    var jobId = state.career.jobId || '';

    /* Explicit pimp and blackmarket routing */
    if (jobId === 'pimp') return pimpPanel(state);
    if (jobId === 'blackmarket') return blackMarketPanel(state);

    /* Idol jobs */
    if (Game.idolSystem && Game.idolSystem.isIdolJob && Game.idolSystem.isIdolJob(jobId)) {
      return '<section class="career-panel">' + (Game.idolSystem.render(state) || '') + '</section>';
    }

    /* Underground idol */
    if (Game.undergroundIdol && Game.undergroundIdol.render) {
      var undergroundHtml = Game.undergroundIdol.render(state);
      if (undergroundHtml) return '<section class="career-panel">' + undergroundHtml + '</section>';
    }

    /* Sex work */
    if (jobId === 'prostitute' || jobId === 'welfare') {
      return sexWorkPanel(state);
    }

    /* Creator-type */
    if (Game.creatorCareer && Game.creatorCareer.isCreator && Game.creatorCareer.isCreator(state)) {
      return '<section class="career-panel">' + Game.creatorCareer.render(state) + '</section>';
    }

    /* Freelance */
    var job = Game.config.jobs.find(function (item) { return item.id === jobId; });
    if (job && job.freelance) {
      /* Use officePanel but with freelance-style actions (handled inside officePanel) */
      return officePanel(state, money);
    }

    /* Default: regular office */
    return officePanel(state, money);
  }

  /* ---- export ---- */

  Game.careerPanels = Object.freeze({
    officePanel: officePanel,
    sexWorkPanel: sexWorkPanel,
    pimpPanel: pimpPanel,
    blackMarketPanel: blackMarketPanel,
    routePanel: routePanel,
    BLACK_MARKET_ITEMS: BLACK_MARKET_ITEMS,
    handleClick: function(e) { return false; },
  });
}(window));
