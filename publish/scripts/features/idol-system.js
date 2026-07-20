(function initIdolSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const isIdolJob = (jobId) => jobId === 'idoltrainee' || jobId === 'idol';

  function ensure(state) {
    state.idol = state.idol && typeof state.idol === 'object' ? state.idol : {
      active: false, stage: 'trainee', fans: 0, trainingMonths: 0,
      skills: { dance: 0, vocal: 0, expression: 0 },
      lastEvaluationMonth: -6, lastHandshakeMonth: -3, scandals: [],
      agencyName: '', producerTrust: 50, producerAbuse: 0, careerExtended: false,
    };
    return state.idol;
  }

  function onJobChange(state) {
    const idol = ensure(state);
    if (state.career.jobId === 'idoltrainee') {
      idol.active = true; idol.stage = 'trainee';
      idol.agencyName = state.career.company || '偶像事务所';
      if (!idol.fans) idol.fans = U.between(80, 300);
    } else if (state.career.jobId === 'idol') {
      idol.active = true;
      if (idol.stage === 'trainee') {
        idol.stage = 'debuted';
        Game.lifeDirector.addLog(state, '偶像出道',
          `你从${idol.agencyName}正式出道，粉丝数 ${idol.fans.toLocaleString()}。`, 'milestone');
      }
      if (!idol.fans) idol.fans = U.between(2000, 8000);
      idol.agencyName = state.career.company || '偶像事务所';
    }
  }

  function train(state, skill) {
    if (!isIdolJob(state.career.jobId)) return { ok: false, message: '只有偶像才能进行专项训练' };
    const idol = ensure(state);
    const key = skill === 'dance' ? '舞蹈' : (skill === 'vocal' ? '声乐' : '表情管理');
    idol.skills[skill] = U.clamp(idol.skills[skill] + U.between(5, 12), 0, 100);
    state.stats.健康 = U.clamp(state.stats.健康 - 1, 0, 100);
    idol.trainingMonths += 1;
    Game.lifeDirector.addLog(state, '偶像训练',
      `你进行了${key}训练，${key}能力 ${idol.skills[skill]}。`, 'good');
    return { ok: true, message: `${key}训练完成，当前 ${idol.skills[skill]}` };
  }

  function handshake(state) {
    const idol = ensure(state);
    if (idol.fans < 500) return { ok: false, message: '粉丝至少500才能举办握手会' };
    if (state.totalMonths - idol.lastHandshakeMonth < 3) return { ok: false, message: '距离上次握手会不足3个月' };
    idol.lastHandshakeMonth = state.totalMonths;
    const gain = Math.round(idol.fans * 0.03 + state.stats.魅力 * 4);
    idol.fans += gain;
    const income = Math.round(idol.fans * 0.05);
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 4, 0, 100);
    Game.lifeDirector.addLog(state, '握手会',
      `握手会吸引了数百名粉丝，新增${gain}粉丝，收入${Game.view.money(income)}。`, 'good');
    return { ok: true, message: `握手会新增${gain}粉丝，收入${Game.view.money(income)}` };
  }

  function evaluation(state) {
    const idol = ensure(state);
    if (idol.stage !== 'trainee') return { ok: false, message: '只有练习生需要月度考评' };
    if (state.totalMonths - idol.lastEvaluationMonth < 6) return { ok: false, message: '距离上次考评不足6个月' };
    idol.lastEvaluationMonth = state.totalMonths;
    const total = idol.skills.dance + idol.skills.vocal + idol.skills.expression;
    const passed = total >= 120 && idol.trainingMonths >= 12;
    if (passed && state.career.jobId === 'idoltrainee') {
      const idolJob = Game.config.jobs.find((j) => j.id === 'idol');
      if (idolJob) {
        state.career.job = idolJob.name;
        state.career.jobId = idolJob.id;
        state.career.salary = idolJob.salary;
        idol.stage = 'debuted';
        Game.lifeDirector.addLog(state, '偶像出道',
          `考评通过！你正式以偶像身份出道，粉丝数 ${idol.fans.toLocaleString()}。`, 'milestone');
        return { ok: true, message: '考评通过，你正式出道了！' };
      }
    }
    Game.lifeDirector.addLog(state, '月末考评',
      `考评${passed ? '合格' : '未通过'}，技能总和 ${total}/120，练习${idol.trainingMonths}月。`, passed ? 'good' : 'normal');
    return { ok: true, message: `考评${passed ? '通过' : '未通过'}，技能总和 ${total}` };
  }

  function castingCouch(state) {
    var idol = ensure(state);
    if (idol.stage === 'trainee' || idol.stage === 'retired') return { ok: false, message: '出道的偶像才能面对潜规则' };
    if (state.totalMonths - (idol.lastCastingMonth || -12) < 6) return { ok: false, message: '制作人邀约至少间隔6个月' };
    idol.lastCastingMonth = state.totalMonths;
    var chance = U.clamp(0.3 + idol.producerTrust / 200, 0.3, 0.85);
    if (Math.random() > chance) { idol.producerTrust = U.clamp(idol.producerTrust - 8, 0, 100); return { ok: false, message: '制作人暂时没有新的邀约' }; }
    var income = Math.round(15000 + idol.fans * 0.02);
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 6, 0, 100);
    idol.producerAbuse += 1;
    idol.producerTrust = U.clamp(idol.producerTrust - 5, 0, 100);
    idol.careerExtended = true;
    idol.scandals.push({ month: state.totalMonths, type: '潜规则', note: '与制作人进行了私下交易' });
    idol.scandals = idol.scandals.slice(-8);
    Game.lifeDirector.addLog(state, '潜规则', '制作人邀约带来' + Game.view.money(income) + '，你的偶像生涯可能因此延长。', 'normal');
    return { ok: true, message: '潜规则完成，收入' + Game.view.money(income) + '，职业可能延长' };
  }

  function handleClick(event) {
    const actionBtn = event.target.closest('[data-idol-action]');
    if (!actionBtn) return false;
    const state = Game._getState ? Game._getState() : null;
    if (!state) return false;
    const action = actionBtn.dataset.idolAction;
    let result;
    if (action === 'train') result = train(state, actionBtn.dataset.idolSkill);
    else if (action === 'evaluate') result = evaluation(state);
    else if (action === 'handshake') result = handshake(state);
    else if (action === 'casting') result = castingCouch(state);
    else if (action === 'formGroup') result = formGroup(state);
    else if (action === 'signLoveBan') result = idol.loveBanSigned ? breakLoveBan(state) : signLoveBan(state);
    else if (action === 'hireSecurity') result = hireSecurity(state);
    else if (action === 'graduation') result = graduationConcert(state);
    else if (action === 'formGroup') result = formGroup(state);
    else if (action === 'signLoveBan') result = signLoveBan(state);
    else if (action === 'hireSecurity') result = hireSecurity(state);
    else if (action === 'graduation') result = graduationConcert(state);
    if (result) {
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    return true;
  }

  /* ===== Idol Group System ===== */
  function formGroup(state) {
    var idol = ensure(state);
    if (idol.stage === 'trainee') return { ok: false, message: '只有出道偶像才能组建团体' };
    var names = ['Sakura7','月光少女','NeoStars','Starlight','DreamCatcher','KiraKira','天使之翼','花鳥風月'];
    idol.group = idol.group || { id: '', name: '', members: [], leaderId: '', cohesion: 50, rivalGroupId: '' };
    idol.group.name = names[Math.floor(Math.random() * names.length)];
    idol.group.id = 'group-' + Date.now().toString(36);
    idol.group.leaderId = state.profile.id;
    idol.group.members = [state.profile.id];
    idol.group.cohesion = 50;
    Game.lifeDirector.addLog(state, '偶像团体', '你组建了偶像团体「' + idol.group.name + '」。', 'milestone');
    return { ok: true, message: '团体「' + idol.group.name + '」已成立' };
  }

  function groupMonthly(state) {
    var idol = ensure(state);
    if (!idol.group || !idol.group.name) return;
    idol.group.cohesion = U.clamp(idol.group.cohesion - U.between(0, 3), 0, 100);
    if (idol.group.cohesion < 30 && state.totalMonths % 3 === 0) {
      idol.skills.dance = U.clamp(idol.skills.dance - 1, 0, 100);
      idol.skills.vocal = U.clamp(idol.skills.vocal - 1, 0, 100);
    }
    if (idol.group.cohesion < 15 && Math.random() < 0.2) {
      idol.group.members = idol.group.members.filter(function(m) { return m !== state.profile.id; });
      idol.fans = Math.max(0, Math.round(idol.fans * 0.8));
      Game.lifeDirector.addLog(state, '团体裂痕', '有成员退出了「' + idol.group.name + '」，团体士气受到打击。', 'normal');
    }
  }

  function renderGroup(state) {
    var idol = ensure(state);
    if (!idol.group || !idol.group.name) return '<p class="empty-state">尚未组建偶像团体。出道后可组建。</p>';
    return '<div class="idol-group"><strong>' + idol.group.name + '</strong>' +
      '<span>凝聚力 ' + Math.round(idol.group.cohesion) + ' · 成员 ' + idol.group.members.length + '人</span>' +
      '<div class="bar-track"><b style="width:' + idol.group.cohesion + '%"></b></div></div>';
  }

  /* ===== Annual Election ===== */
  function election(state) {
    var idol = ensure(state);
    if (state.month !== 1) return null;
    var coreRatio = 0.3 + Math.random() * 0.2;
    var votes = Math.round(idol.fans * (coreRatio + (1 - coreRatio) * 0.5) * (state.stats.魅力 / 50));
    idol.lastElectionRank = U.between(1, 40);
    if (idol.lastElectionRank <= 3) {
      idol.fans = Math.round(idol.fans * 1.5);
      state.money += Math.round(idol.fans * 0.1);
      Game.lifeDirector.addLog(state, '总选举', '年度偶像总选举第' + idol.lastElectionRank + '名！粉丝激增，收入翻倍。', 'milestone');
    } else if (idol.lastElectionRank <= 10) {
      idol.fans = Math.round(idol.fans * 1.1);
      Game.lifeDirector.addLog(state, '总选举', '年度偶像总选举第' + idol.lastElectionRank + '名，粉丝稳定增长。', 'good');
    } else if (idol.lastElectionRank >= 35) {
      idol.consecutiveLosses = (idol.consecutiveLosses || 0) + 1;
      idol.fans = Math.max(0, Math.round(idol.fans * 0.9));
      Game.lifeDirector.addLog(state, '总选举', '排名第' + idol.lastElectionRank + '位——粉丝开始流失了。', 'normal');
      if (idol.consecutiveLosses >= 2) {
        Game.lifeDirector.addLog(state, '降级警告', '连续两年排名垫底。事务所可能会做出调整。', 'warning');
      }
    } else {
      idol.consecutiveLosses = 0;
    }
    return { rank: idol.lastElectionRank, votes: votes };
  }

  /* ===== Love Ban Contract ===== */
  function signLoveBan(state) {
    var idol = ensure(state);
    if (idol.loveBanSigned) return { ok: false, message: '已经签署了恋爱禁止合约' };
    idol.loveBanSigned = true;
    return { ok: true, message: '签约完成。粉丝增长+15%，但地下恋情曝光会带来毁灭性打击。' };
  }
  function breakLoveBan(state) {
    var idol = ensure(state);
    if (!idol.loveBanSigned) return { ok: false, message: '尚未签署恋爱禁止合约' };
    idol.loveBanSigned = false;
    return { ok: true, message: '合约解除。可以自由恋爱了。' };
  }

  /* ===== Graduation Concert + Transition ===== */
  function graduationConcert(state) {
    var idol = ensure(state);
    var age = U.age(state);
    if (age < 28) return { ok: false, message: '28岁后可以举办毕业公演' };
    var income = Math.round(idol.fans * 0.1);
    state.money += income;
    idol.stage = 'retired';
    Game.lifeDirector.addLog(state, '毕业公演', '最后一场演出。你唱了出道曲，走音的地方和当年一模一样。收入' + Game.view.money(income) + '。', 'milestone');
    state.pendingDecision = {
      type: 'idolTransition',
      title: '偶像毕业 — 选择未来方向',
      text: '你的偶像生涯走到了终点。粉丝们会记住你。现在，选择下一个方向——',
      options: [
        {value:'welfare', label:'福利姬 · 继承30%粉丝 · 金主约会x1.5'},
        {value:'coser', label:'职业Coser · 继承25%粉丝 · 漫展x1.5'},
        {value:'vtuber', label:'虚拟主播 · 继承35%粉丝 · 直播x1.3'},
        {value:'beautyblog', label:'美妆博主 · 继承20%粉丝 · 品牌x1.3'},
        {value:'retire', label:'彻底引退 · 无加成'},
      ]
    };
    return { ok: true, message: '毕业公演完成。可以转型了。' };
  }

  function transitionCareer(state, choice) {
    var idol = ensure(state);
    var transitions = {
      welfare: { jobId: 'welfare', name: '福利姬', ratio: 0.3, bonus: '金主约会收入x1.5' },
      coser: { jobId: 'coser', name: '职业Coser', ratio: 0.25, bonus: '漫展收入x1.5' },
      vtuber: { jobId: 'vtuber', name: '虚拟主播', ratio: 0.35, bonus: '直播观众x1.3' },
      beautyblog: { jobId: 'beautyblog', name: '美妆博主', ratio: 0.2, bonus: '品牌合作x1.3' },
      retire: { jobId: null, name: '退役', ratio: 0, bonus: '无' },
    };
    var t = transitions[choice];
    if (!t) return { ok: false, message: '无效的转型方向' };
    var inheritedFans = Math.round(idol.fans * t.ratio);
    if (t.jobId) {
      var job = Game.config.jobs.find(function(j) { return j.id === t.jobId; });
      if (job) {
        state.career.job = job.name; state.career.jobId = job.id;
        state.career.company = job.company; state.career.salary = job.salary;
      }
      var creator = Game.creatorCareer.ensure(state);
      creator.followers = inheritedFans;
    }
    state.idol.active = false;
    /* Write resume */
    state.profile.lifeResume = state.profile.lifeResume || [];
    state.profile.lifeResume.push({ age: U.age(state), event: '偶像退役', detail: '退役转为' + t.name });
    Game.lifeDirector.addLog(state, '人生转折', '你从偶像退役，转为' + t.name + '。继承了' + inheritedFans.toLocaleString() + '粉丝。', 'milestone');
    return { ok: true, message: '转型为' + t.name + '，继承' + inheritedFans.toLocaleString() + '粉丝' };
  }

  /* ===== Anti-fan / stalker ===== */
  function monthlyAntiCheck(state) {
    var idol = ensure(state);
    if (idol.fans < 10000) return;
    if (Math.random() < 0.08) {
      var events = ['匿名账号发布了伪造的丑闻照片','有人散布你整容的谣言','私生饭在你的公寓门口徘徊','你收到了恐吓信'];
      var evt = events[Math.floor(Math.random() * events.length)];
      idol.scandals.push({ month: state.totalMonths, type: 'anti', note: evt });
      idol.scandals = idol.scandals.slice(-8);
      state.stats.心情 = U.clamp(state.stats.心情 - 5, 0, 100);
      Game.lifeDirector.addLog(state, '黑粉事件', evt + '。', 'normal');
    }
  }

  /* ===== Counter-measures ===== */
  function hireSecurity(state) {
    if (state.money < 2000) return { ok: false, message: '每月安保费用需要2000' };
    state.money -= 2000;
    state.idol.antiProtected = true;
    return { ok: true, message: '已聘请安保团队，本月私生饭风险大幅降低' };
  }

  function monthly(state) {
    if (!isIdolJob(state.career.jobId)) return;
    var idol = ensure(state);
    var age = U.age(state);
    if (idol.stage === 'trainee') { idol.fans += Math.round(idol.fans * 0.02 + U.between(-20, 40)); }
    else if (idol.stage === 'debuted') { idol.fans += Math.round(idol.fans * 0.04 + U.between(-50, 120)); }
    else if (idol.stage === 'retired') { idol.fans = Math.max(0, Math.round(idol.fans * 0.92)); }
    if (age >= 28 && idol.stage !== 'retired') {
      if (idol.careerExtended && age < 32) { idol.fans = Math.max(0, Math.round(idol.fans * 0.97)); }
      else {
        idol.fans = Math.max(0, Math.round(idol.fans * 0.9));
        if (idol.fans < 500 && age >= 30) {
          idol.stage = 'retired';
          Object.assign(state.career, { job: null, jobId: null, company: null, salary: 0, performance: 0, management: false });
          Game.workplace && Game.workplace.leave(state);
          Game.lifeDirector.addLog(state, '偶像退役', '粉丝流失殆尽，你的偶像生涯走到了终点。', 'milestone');
        }
      }
    }
    if (idol.scandals.length >= 3 && Math.random() < 0.12) {
      var lost = Math.round(idol.fans * 0.18);
      idol.fans -= lost;
      Game.lifeDirector.addLog(state, '丑闻曝光', '八卦周刊爆料了你的私下交易，流失' + lost.toLocaleString() + '粉丝。', 'normal');
    }
    var base = Game.config.jobs.find(function(j) { return j.id === state.career.jobId; });
    if (base) state.career.salary = Math.round(base.salary + idol.fans * 0.015);
    if (state.month === 1) election(state);
    groupMonthly(state);
    monthlyAntiCheck(state);
    if (idol.loveBanSigned && idol.fans > 0) idol.fans = Math.round(idol.fans * 1.0015);
    if (idol.loveBanSigned && idol.scandals.length > 3 && Math.random() < 0.05) {
      var lost2 = Math.round(idol.fans * 0.3);
      idol.fans -= lost2;
      idol.scandals.push({ month: state.totalMonths, type: 'loveBan', note: '地下恋情被曝光' });
      Game.lifeDirector.addLog(state, '恋爱丑闻', '地下恋情被八卦周刊曝光——粉丝流失' + lost2.toLocaleString() + '人。', 'warning');
    }
  }

  function render(state) {
    if (!isIdolJob(state.career.jobId)) return '';
    var idol = ensure(state);
    var stageLabels = { trainee: '练习生', debuted: '已出道', retired: '已退役' };
    return '<section class="creator-card idol-card">' +
      '<header><div><span>' + (idol.agencyName || '') + ' · ' + (stageLabels[idol.stage] || '') + '</span>' +
      '<strong>' + idol.fans.toLocaleString() + ' 粉丝</strong></div>' +
      '<b>练习' + idol.trainingMonths + '月 · ' + idol.producerAbuse + '次潜规则</b></header>' +
      '<div class="creator-metrics"><span>舞蹈 <b>' + idol.skills.dance + '</b></span>' +
      '<span>声乐 <b>' + idol.skills.vocal + '</b></span>' +
      '<span>表情 <b>' + idol.skills.expression + '</b></span>' +
      '<span>制作人信任 <b>' + Math.round(idol.producerTrust) + '</b></span></div>' +
      '<div class="creator-actions">' +
      '<button data-idol-action="train" data-idol-skill="dance">训练舞蹈</button>' +
      '<button data-idol-action="train" data-idol-skill="vocal">训练声乐</button>' +
      '<button data-idol-action="train" data-idol-skill="expression">训练表情</button>' +
      '<button data-idol-action="evaluate">月末考评</button>' +
      '<button data-idol-action="handshake">握手会</button>' +
      (idol.stage !== 'trainee' ? '<button data-idol-action="casting">制作人私约</button>' : '') +
      ((!idol.group || !idol.group.name) ? '<button data-idol-action="formGroup">组建团体</button>' : '') +
      '<button data-idol-action="signLoveBan">' + (idol.loveBanSigned ? '解除' : '签约') + '恋爱禁止</button>' +
      '<button data-idol-action="hireSecurity">聘请安保</button>' +
      (U.age(state) >= 28 ? '<button data-idol-action="graduation">毕业公演</button>' : '') +
      '</div>' + renderGroup(state) + '</section>';
  }

  Game.idolSystem = Object.freeze({ ensure, onJobChange, train, handshake, evaluation, castingCouch, monthly, render, handleClick, isIdolJob, formGroup, groupMonthly, renderGroup, election, signLoveBan, breakLoveBan, graduationConcert, transitionCareer, monthlyAntiCheck, hireSecurity });
}(window));
