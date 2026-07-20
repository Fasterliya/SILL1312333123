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
    return state.criminal;
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

    Game.lifeDirector.addLog(state, '入狱服刑',
      `你开始了长达 ${months} 个月（约${Math.round(months / 12)}年）的服刑生涯。时间一天天流逝……`,
      'milestone');

    /* advance time */
    Game.lifeDirector.advance(state, months);

    if (state.gameOver || state.pendingDecision) return;

    /* release consequences: money halved, reputation zero, career cleared */
    state.money = Math.max(0, Math.round(state.money * 0.5));
    state.cityLife.reputation = 0;

    Object.assign(state.career, {
      job: null, jobId: null, company: null, salary: 0, exp: 0,
      performance: 0, lastPromotionMonth: -12, management: false,
      titleTrack: 'staff', titleRank: 0,
    });
    if (Game.workplace?.leave) Game.workplace.leave(state);

    /* permanent -25% job acceptance rate */
    cr.jobPenalty += 25;
    cr.record = U.clamp(cr.record - 30, 5, 100);

    Game.lifeDirector.addLog(state, '刑满释放',
      `服刑完毕重获自由——财产损失过半、声誉归零、失去工作。前科使求职更难（永久 -${cr.jobPenalty}%）。`,
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
    const cr = state.criminal;

    /* Decay record by 1 every 6 months if no new crimes */
    if (cr.record > 0
      && state.totalMonths - cr.lastCrimeMonth >= 6
      && state.totalMonths - cr.lastDecayMonth >= 6) {
      cr.record = U.clamp(cr.record - 1, 0, 100);
      cr.lastDecayMonth = state.totalMonths;
    }

    /* Raid check */
    if (cr.record >= 20) {
      checkRaid(state);
    }
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

    const historyHtml = cr.jailHistory.length
      ? cr.jailHistory.slice().reverse().map((entry) => (
        `<div class="jail-history-row">
          <span>服刑 ${entry.months} 个月（约${Math.round(entry.months / 12)}年）</span>
          <small>被捕时犯罪记录 ${entry.record}</small>
        </div>`
      )).join('')
      : '<p class="empty-state">暂无入狱记录</p>';

    return `<section class="criminal-status panel">
      <div class="panel-title"><h2>犯罪档案</h2><span>${recordLabel}</span></div>
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
      <h4>入狱历史</h4>
      ${historyHtml}
    </section>`;
  }

  Game.criminalSystem = Object.freeze({ ensure, addRecord, arrest, monthly, render });
}(window));
