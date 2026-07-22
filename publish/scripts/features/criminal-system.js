(function initCriminalSystem(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;

  /* ---- country penalties (months) ---- */
  const countryJail = {
    华夏:   { fine: true,  jailMin: 12,  jailMax: 120,  prisonMin: 120, prisonMax: 300, death: true },
    日本:   { fine: true,  jailMin: 12,  jailMax: 120,  prisonMin: 120, prisonMax: 300, death: false },
    韩国:   { fine: true,  jailMin: 12,  jailMax: 120,  prisonMin: 120, prisonMax: 300, death: false },
    新加坡: { fine: true,  jailMin: 24,  jailMax: 180,  prisonMin: 180, prisonMax: 300, death: false },
    美国:   { fine: true,  jailMin: 12,  jailMax: 96,   prisonMin: 120, prisonMax: 360, death: false },
    英国:   { fine: true,  jailMin: 12,  jailMax: 84,   prisonMin: 84,  prisonMax: 300, death: false },
    法国:   { fine: true,  jailMin: 12,  jailMax: 84,   prisonMin: 84,  prisonMax: 300, death: false },
  };

  function law(state) {
    return countryJail[state.location.country] || countryJail.华夏;
  }

  /* ---- sentence label ---- */
  function sentenceLabel(months) {
    if (months >= 360) return '终身监禁';
    if (months >= 60) return `${Math.round(months / 12)}年有期徒刑`;
    return `${months}个月拘役`;
  }

  /* ---- ensure ---- */
  function ensure(state) {
    if (!state.criminal || typeof state.criminal !== 'object') {
      state.criminal = {
        record: 0,
        arrests: 0,
        jailMonths: 0,
        lastRaidMonth: -24,
        lastCrimeMonth: -24,
        lastDecayMonth: -12,
        hideoutQuality: 0,
        evasionSkill: 0,
        jobPenalty: 0,
        jailHistory: [],
        jailEvents: [],
        inJail: false,
        jailRemaining: 0,
      };
      return state.criminal;
    }
    state.criminal.record = U.clamp(Number(state.criminal.record) || 0, 0, 100);
    state.criminal.arrests = Math.max(0, Number(state.criminal.arrests) || 0);
    state.criminal.jailMonths = Math.max(0, Number(state.criminal.jailMonths) || 0);
    state.criminal.lastRaidMonth = Number.isFinite(state.criminal.lastRaidMonth) ? state.criminal.lastRaidMonth : -24;
    state.criminal.lastCrimeMonth = Number.isFinite(state.criminal.lastCrimeMonth) ? state.criminal.lastCrimeMonth : -24;
    state.criminal.lastDecayMonth = Number.isFinite(state.criminal.lastDecayMonth) ? state.criminal.lastDecayMonth : -12;
    state.criminal.hideoutQuality = U.clamp(Number(state.criminal.hideoutQuality) || 0, 0, 100);
    state.criminal.evasionSkill = U.clamp(Number(state.criminal.evasionSkill) || 0, 0, 100);
    state.criminal.jobPenalty = Math.max(0, Number(state.criminal.jobPenalty) || 0);
    state.criminal.jailHistory = Array.isArray(state.criminal.jailHistory) ? state.criminal.jailHistory.slice(-20) : [];
    state.criminal.jailEvents = Array.isArray(state.criminal.jailEvents) ? state.criminal.jailEvents.slice(-30) : [];
    state.criminal.inJail = Boolean(state.criminal.inJail);
    state.criminal.jailRemaining = Math.max(0, Number(state.criminal.jailRemaining) || 0);
    return state.criminal;
  }

  function jailEventPool() {
    return [
      { id: 'fight', title: '牢房斗殴', text: '两个囚犯为了争夺床位大打出手，狱警的哨声响起，整个牢区陷入混乱。',
        effect: function (cr) { cr.jailRemaining = Math.max(1, cr.jailRemaining + U.between(1, 3));
          return '你被卷入斗殴，被加判' + U.between(1, 3) + '个月。'; }, weight: 15 },
      { id: 'work', title: '获得狱中工作', text: '监狱长安排你去缝纫车间做工。机械的重复让你暂时忘记了时间的流逝。',
        effect: function (cr) { cr.jailRemaining = Math.max(1, cr.jailRemaining - 2);
          return '通过劳动减刑2个月。'; }, weight: 20 },
      { id: 'library', title: '狱中图书馆', text: '你在监狱图书馆偶然翻开一本法律书籍，从此每天下午都泡在书架间。',
        effect: function (cr) { cr.evasionSkill = U.clamp(cr.evasionSkill + 3, 0, 100);
          cr.jobPenalty = Math.max(0, cr.jobPenalty - 2);
          return '反侦察能力+3，社会偏见减轻2%。'; }, weight: 12 },
      { id: 'sick', title: '狱中生病', text: '阴冷的牢房里流感蔓延，你也发起了高烧。医务室的药总是不够。',
        effect: function (state) { state.stats.健康 = U.clamp((state.stats.健康 || 0) - 8, 0, 100);
          return '健康-8，你拖着病体度过了一段难熬的日子。'; }, weight: 14 },
      { id: 'friend', title: '狱中交友', text: '隔壁铺位的囚犯悄悄告诉你几个监狱生存法则：避开第三食堂的帮派、医务室周四换班时管得最松。',
        effect: function (cr) { cr.evasionSkill = U.clamp(cr.evasionSkill + 2, 0, 100);
          return '反侦察能力+2，你学到了狱中生存技巧。'; }, weight: 18 },
      { id: 'riot', title: '监狱暴动', text: '食堂爆发了一场大规模暴动，催泪瓦斯弥漫整个监区。',
        effect: function (cr) { cr.jailRemaining = Math.max(1, cr.jailRemaining + U.between(2, 6));
          return '暴动导致全监严管，加判' + U.between(2, 6) + '个月。'; }, weight: 8 },
      { id: 'chapel', title: '监狱教堂', text: '每周日的礼拜时间，你第一次走进了监狱的小教堂。管风琴的声音让你短暂忘记了铁窗。',
        effect: function (state) { state.stats.心情 = U.clamp((state.stats.心情 || 0) + 4, 0, 100);
          Game.psychology?.reduceGuilt?.(state, 'temple');
          return '心情+4，内心的负担似乎轻了一些。'; }, weight: 13 },
    ];
  }

  /* ---- addRecord ---- */
  function addRecord(state, amount) {
    if (state.gameOver || state.pendingDecision) return;
    ensure(state);
    const before = state.criminal.record;
    state.criminal.record = U.clamp(before + (amount || 0), 0, 100);
    state.criminal.lastCrimeMonth = state.totalMonths;
    const delta = state.criminal.record - before;
    if (delta > 0) {
      Game.lifeDirector.addLog(state, '犯罪记录',
        `你的犯罪记录上升了 ${delta} 点（当前 ${state.criminal.record}），被警方发现的风险加大。`, 'warning');
    }
    if (state.criminal.record >= 90) {
      Game.lifeDirector.addLog(state, '高危通缉',
        '你的犯罪记录极高，已被列为高危通缉对象。一旦被捕可能面临死刑。', 'warning');
    }
  }

  /* ---- checkRaid ---- */
  function checkRaid(state) {
    if (state.gameOver || state.pendingDecision) return;
    ensure(state);
    const cr = state.criminal;
    if (cr.record < 20) return;

    /* guard against multi-fire in same month */
    if (cr.lastRaidMonth >= state.totalMonths) return;

    let raidChance = 0;
    if (cr.record <= 40) raidChance = 0.05;
    else if (cr.record <= 70) raidChance = 0.12;
    else raidChance = 0.25;

    if (Math.random() >= raidChance) return;

    cr.lastRaidMonth = state.totalMonths;

    /* evasion check */
    const evasionChance = cr.hideoutQuality * 0.5 + cr.evasionSkill * 0.3;
    if (Math.random() * 100 < evasionChance) {
      Game.lifeDirector.addLog(state, '警方突袭',
        '警方对你的藏身处展开突袭，但你成功逃脱。', 'normal');
      cr.evasionSkill = U.clamp(cr.evasionSkill + 3, 0, 100);
      return;
    }

    /* evasion failed */
    Game.lifeDirector.addLog(state, '警方抓捕',
      '警方突袭成功，你被当场逮捕！等待审判。', 'warning');
    arrest(state);
  }

  /* ---- arrest ---- */
  function arrest(state) {
    if (state.gameOver || state.pendingDecision) return;
    ensure(state);
    const cr = state.criminal;
    const rules = law(state);
    const country = state.location.country || '华夏';

    cr.arrests += 1;

    /* record < 30: fine / probation */
    if (cr.record < 30) {
      const fine = U.between(3000, 30000);
      Game.economy.spend(state, fine);
      Game.lifeDirector.addLog(state, '司法判决',
        `${country}法院判处你 ${Game.view.money(fine)} 罚金，免于入狱，但犯罪记录仍在。`,
        'warning');
      cr.record = U.clamp(cr.record - 10, 0, 100);
      return;
    }

    /* record 30-60: 1-10 year jail */
    if (cr.record < 60) {
      const months = U.between(rules.jailMin, rules.jailMax);
      Game.lifeDirector.addLog(state, '司法判决',
        `${country}法院判处你${sentenceLabel(months)}。立即收监执行。`, 'milestone');
      serveJail(state, months);
      return;
    }

    /* record 60-90: 10-25 year prison */
    if (cr.record < 90) {
      const months = U.between(rules.prisonMin, rules.prisonMax);
      const caneText = country === '新加坡' ? '并处鞭刑' : '';
      Game.lifeDirector.addLog(state, '司法判决',
        `${country}法院以严重罪行判处你${sentenceLabel(months)}${caneText}。`, 'milestone');
      serveJail(state, months);
      return;
    }

    /* record >= 90: life imprisonment or death penalty */
    if (rules.death && Math.random() < 0.5) {
      deathPenalty(state);
    } else {
      Game.lifeDirector.addLog(state, '司法判决',
        `${country}法院判处你终身监禁，人生到此终结。`, 'milestone');
      Game.legacySystem.prepareDeath(state, '终身监禁');
      /* Reduce inheritance: legacy gives 70%, reduce to ~30% of original */
      if (state.pendingDecision?.type === 'succession') {
        state.money = Math.round(state.money * 0.43);
      }
    }
  }

  /* ---- serveJail ---- */
  function serveJail(state, months) {
    if (state.gameOver || state.pendingDecision) return;
    ensure(state);
    const cr = state.criminal;

    cr.jailMonths += months;
    cr.jailHistory.push({ startMonth: state.totalMonths, months, record: cr.record });
    cr.inJail = true;
    cr.jailRemaining = months;

    Game.lifeDirector.addLog(state, '入狱服刑',
      `你开始了长达 ${months} 个月（约${Math.round(months / 12)}年）的服刑生涯。`,
      'milestone');
  }

  /* ---- deathPenalty ---- */
  function deathPenalty(state) {
    if (state.gameOver || state.pendingDecision) return;
    ensure(state);
    Game.lifeDirector.addLog(state, '死刑宣判',
      `${state.location.country || '华夏'}最高法院核准死刑判决，立即执行。`, 'milestone');
    Game.legacySystem.prepareDeath(state, '死刑');
    /* Reduce inheritance: legacy default 70%, cut to ~50% */
    if (state.pendingDecision?.type === 'succession') {
      state.money = Math.round(state.money * 0.71);
    }
  }

  /* ---- monthly ---- */
  function monthly(state) {
    if (state.gameOver || state.pendingDecision) return;
    ensure(state);
    var cr = state.criminal;

    jailMonthly(state);

    if (cr.record > 0
      && state.totalMonths - cr.lastCrimeMonth >= 6
      && state.totalMonths - cr.lastDecayMonth >= 6) {
      cr.record = U.clamp(cr.record - 1, 0, 100);
      cr.lastDecayMonth = state.totalMonths;
    }

    if (cr.record >= 20) {
      checkRaid(state);
    }
  }

  /* ---- enterBlackMarket ---- */
  function enterBlackMarket(state) {
    if (state.criminal.record < 5) return { ok: false, message: '犯罪值至少5才能接触黑市' };
    state.career.job = '黑市商人';
    state.career.jobId = 'blackmarket';
    state.career.company = '地下市场';
    state.career.salary = 5000;
    Game.lifeDirector.addLog(state, '进入黑市', '你开始在地下市场买卖违禁品。', 'milestone');
    return { ok: true, message: '你进入了黑市' };
  }

  /* ---- surrender ---- */
  function surrender(state) {
    ensure(state);
    if (state.criminal.record < 10) return { ok: false, message: '犯罪记录太低，没有自首的必要' };
    var reduction = U.between(8, 18);
    state.criminal.record = U.clamp(state.criminal.record - reduction, 0, 100);
    state.criminal.arrests += 1;
    var rules = law(state);
    var months = U.between(1, rules.jailMin);
    state.criminal.jailMonths += months;
    state.criminal.jailHistory.push({ startMonth: state.totalMonths, months: months, record: state.criminal.record, surrendered: true });
    Game.lifeDirector.addLog(state, '投案自首',
      '你走进警察局，将一切都交代了。法官考虑到你的自首情节，从轻判处。', 'milestone');
    Game.lifeDirector.advance(state, months);
    state.money = Math.max(0, Math.round(state.money * 0.75));
    state.cityLife.reputation = U.clamp((state.cityLife.reputation || 0) - 10, 0, 100);
    state.criminal.jobPenalty = Math.max(0, state.criminal.jobPenalty + 8);
    Game.lifeDirector.addLog(state, '刑满释放',
      '由于主动投案，你的刑罚较轻，出狱后社会接纳度也相对较高。', 'good');
    return { ok: true, message: '投案自首，记录减轻' + reduction + '，服刑' + months + '个月' };
  }

  /* ---- escape ---- */
  function escape(state) {
    ensure(state);
    if (!state.criminal.inJail || state.criminal.jailRemaining <= 0) {
      return { ok: false, message: '不在服刑期间' };
    }
    var skill = state.criminal.evasionSkill + (state.criminal.hideoutQuality || 0) * 0.3;
    var chance = Math.min(65, 20 + skill);
    if (Math.random() * 100 < chance) {
      state.criminal.inJail = false;
      state.criminal.jailRemaining = 0;
      state.criminal.record = U.clamp(state.criminal.record + 15, 0, 100);
      state.criminal.evasionSkill = U.clamp(state.criminal.evasionSkill + 10, 0, 100);
      state.cityLife.reputation = 0;
      Object.assign(state.career, { job: null, jobId: null, company: null, salary: 0, exp: 0, performance: 0, titleRank: 0 });
      if (Game.workplace?.leave) Game.workplace.leave(state);
      state.criminal.jobPenalty += 40;
      Game.lifeDirector.addLog(state, '越狱成功',
        '你在一个暴雨夜翻过了围墙。自由的感觉让你浑身颤抖——但从此你将被全国通缉。', 'milestone');
      return { ok: true, message: '越狱成功！犯罪记录+15，社会身份全部清零，终身通缉。' };
    }
    state.criminal.jailRemaining += U.between(6, 24);
    state.stats.健康 = U.clamp((state.stats.健康 || 0) - 10, 0, 100);
    Game.lifeDirector.addLog(state, '越狱失败',
      '你在围墙上被探照灯照到，警犬狂吠着冲了过来。', 'warning');
    return { ok: false, message: '越狱失败，加刑' + U.between(6, 24) + '个月' };
  }

  /* ---- bribe ---- */
  function bribe(state) {
    ensure(state);
    if (!state.criminal.inJail || state.criminal.jailRemaining <= 0) {
      return { ok: false, message: '不在服刑期间' };
    }
    if (state.money < 50000) return { ok: false, message: '贿赂需要至少50000元' };
    var reduction = U.between(3, 12);
    Game.economy.spend(state, 50000);
    state.criminal.jailRemaining = Math.max(1, state.criminal.jailRemaining - reduction);
    state.criminal.jailEvents.push({ month: state.totalMonths, event: '贿赂减刑', detail: '花费50000元，减刑' + reduction + '个月' });
    Game.lifeDirector.addLog(state, '贿赂减刑',
      '你在暗地里买通了一位狱警。金钱在这个地方有着微妙的效力。', 'normal');
    return { ok: true, message: '贿赂成功，减刑' + reduction + '个月' };
  }

  /* ---- jail monthly events ---- */
  function jailMonthly(state) {
    var cr = ensure(state);
    if (!cr.inJail || cr.jailRemaining <= 0) return;
    if (state.pendingDecision) return;
    cr.jailRemaining -= 1;
    if (cr.jailRemaining <= 0) {
      cr.inJail = false;
      release(state);
      return;
    }
    if (Math.random() < 0.22) {
      var pool = jailEventPool();
      var totalW = pool.reduce(function (s, e) { return s + e.weight; }, 0);
      var cursor = Math.random() * totalW;
      var event = pool[0];
      for (var i = 0; i < pool.length; i += 1) {
        cursor -= pool[i].weight;
        if (cursor <= 0 || i === pool.length - 1) { event = pool[i]; break; }
      }
      var detail = event.effect(event.id === 'sick' || event.id === 'chapel' ? state : cr);
      cr.jailEvents.push({ month: state.totalMonths, event: event.title, detail: detail });
      Game.lifeDirector.addLog(state, '监狱 · ' + event.title, event.text + ' ' + detail, 'normal');
    }
  }

  /* ---- rehab program ---- */
  function rehabProgram(state) {
    ensure(state);
    if (!state.criminal.inJail || state.criminal.jailRemaining <= 0) {
      return { ok: false, message: '不在服刑期间' };
    }
    if (state.money < 8000) return { ok: false, message: '参加改造计划需要8000元保证金' };
    Game.economy.spend(state, 8000);
    state.criminal.jobPenalty = Math.max(0, state.criminal.jobPenalty - 15);
    state.criminal.record = U.clamp(state.criminal.record - 5, 0, 100);
    state.criminal.jailRemaining = Math.max(1, state.criminal.jailRemaining - U.between(2, 4));
    state.criminal.jailEvents.push({ month: state.totalMonths, event: '改造计划', detail: '参加职业培训，社会接纳度+15%' });
    Game.lifeDirector.addLog(state, '狱中改造',
      '你报名参加了监狱的职业培训计划。每天在车间学习技能，出狱后的路似乎不那么灰暗了。', 'good');
    return { ok: true, message: '参加改造成功，出狱后求职惩罚减轻15%，减刑2~4个月' };
  }

  /* ---- release ---- */
  function release(state) {
    var cr = ensure(state);
    state.money = Math.max(0, Math.round(state.money * 0.5));
    state.cityLife.reputation = 0;
    Object.assign(state.career, {
      job: null, jobId: null, company: null, salary: 0, exp: 0,
      performance: 0, lastPromotionMonth: -12, management: false,
      titleTrack: 'staff', titleRank: 0,
    });
    if (Game.workplace?.leave) Game.workplace.leave(state);
    cr.jobPenalty += 25;
    cr.record = U.clamp(cr.record - 30, 5, 100);
    Game.lifeDirector.addLog(state, '刑满释放',
      '铁门缓缓打开，阳光刺得你睁不开眼。财产损失过半、声誉归零、失去工作。前科使求职更难（永久 -' + cr.jobPenalty + '%）。',
      'milestone');
  }

  /* ---- render ---- */
  function render(state) {
    ensure(state);
    const cr = state.criminal;

    let recordColor = '#4caf50';
    let recordLabel = '清白';
    if (cr.record >= 20) { recordColor = '#ffc107'; recordLabel = '有案底'; }
    if (cr.record >= 40) { recordColor = '#ff9800'; recordLabel = '危险'; }
    if (cr.record >= 70) { recordColor = '#f44336'; recordLabel = '高危'; }
    if (cr.record >= 90) { recordColor = '#b71c1c'; recordLabel = '通缉'; }

    const evasionPercent = Math.round(cr.hideoutQuality * 0.5 + cr.evasionSkill * 0.3);

    return `<section class="criminal-status panel">
      <div class="panel-title"><h2>犯罪档案</h2><span style="color:${recordColor};font-weight:800">${recordLabel}</span></div>
      ${cr.inJail ? `<div class="jail-event-log"><h4>正在服刑 · 剩余 ${cr.jailRemaining} 个月</h4>
        <div class="jail-actions">
          <button data-criminal-action="escape">越狱 (${Math.min(65, 20 + cr.evasionSkill + (cr.hideoutQuality||0)*0.3)}%成功)</button>
          <button data-criminal-action="bribe">贿赂减刑 · ${Game.view.money(50000)}</button>
          <button data-criminal-action="rehab">改造计划 · ${Game.view.money(8000)}</button>
          <button data-criminal-action="surrender" class="danger">自首配合</button>
        </div>
        ${cr.jailEvents.length ? cr.jailEvents.slice().reverse().slice(0, 8).map(function (e) {
          return '<div class="jail-event-entry">' + e.event + '<small>' + e.detail + '</small></div>';
        }).join('') : ''}</div>` : ''}
      <div class="stat-bar">
        <span>犯罪记录</span>
        <div class="bar-track"><div class="bar-fill" style="width:${cr.record}%;background:${recordColor};"></div></div>
        <em>${cr.record}/100</em>
      </div>
      <div class="criminal-stats-grid">
        <div><span>被捕次数</span><strong>${cr.arrests}</strong></div>
        <div><span>累计服刑</span><strong>${cr.jailMonths}个月</strong></div>
        <div><span>求职惩罚</span><strong>${cr.jobPenalty ? '-' + cr.jobPenalty + '%' : '无'}</strong></div>
      </div>
      <div class="criminal-stats-grid">
        <div><span>藏身处质量</span><strong>${cr.hideoutQuality}</strong></div>
        <div><span>反侦察能力</span><strong>${cr.evasionSkill}</strong></div>
        <div><span>逃脱概率</span><strong>${evasionPercent}%</strong></div>
      </div>
      ${cr.jailHistory.length ? '<h4>入狱历史</h4>' + cr.jailHistory.slice().reverse().map(function (entry) {
        return '<div class="jail-history-row"><span>' + (entry.surrendered ? '自首 · ' : '') + '服刑 ' + entry.months + ' 个月（约' + Math.round(entry.months / 12) + '年）</span><small>被捕时犯罪记录 ' + entry.record + '</small></div>';
      }).join('') : ''}
      <div class="system-actions"><button data-criminal-blackmarket>进入黑市</button></div>
    </section>`;
  }

  function handleClick(event) {
    var btn = event.target.closest('[data-criminal-blackmarket], [data-criminal-action]');
    if (!btn) return false;
    var state = Game._getState?.();
    if (!state) return false;
    if (btn.dataset.criminalBlackmarket !== undefined) {
      var result = enterBlackMarket(state);
      Game._refresh?.();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
      return true;
    }
    var action = btn.dataset.criminalAction;
    var result;
    if (action === 'escape') result = escape(state);
    else if (action === 'bribe') result = bribe(state);
    else if (action === 'rehab') result = rehabProgram(state);
    else if (action === 'surrender') result = surrender(state);
    else return false;
    Game._refresh?.();
    Game._save?.();
    Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    return true;
  }

  Game.criminalSystem = Object.freeze({
    ensure, addRecord, arrest, monthly, render, enterBlackMarket,
    escape, bribe, surrender, rehabProgram, handleClick, release,
  });
}(window));
