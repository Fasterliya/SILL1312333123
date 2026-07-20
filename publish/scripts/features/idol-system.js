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
      /* Auto-promote to debuted idol */
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
    const idol = ensure(state);
    if (idol.stage === 'trainee' || idol.stage === 'retired') return { ok: false, message: '出道的偶像才能面对潜规则' };
    if (state.totalMonths - (idol.lastCastingMonth || -12) < 6) return { ok: false, message: '制作人邀约至少间隔6个月' };
    idol.lastCastingMonth = state.totalMonths;

    const chance = U.clamp(0.3 + idol.producerTrust / 200, 0.3, 0.85);
    if (Math.random() > chance) {
      idol.producerTrust = U.clamp(idol.producerTrust - 8, 0, 100);
      return { ok: false, message: '制作人暂时没有新的邀约' };
    }

    const income = Math.round(15000 + idol.fans * 0.02);
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 6, 0, 100);
    idol.producerAbuse += 1;
    idol.producerTrust = U.clamp(idol.producerTrust - 5, 0, 100);
    idol.careerExtended = true;
    idol.scandals.push({ month: state.totalMonths, type: '潜规则', note: '与制作人进行了私下交易' });
    idol.scandals = idol.scandals.slice(-8);

    const record = Game.relationshipSecrets.addHookRecord(state,
      { ...state.profile, id: 'player-profile', name: state.name, gender: state.gender }, '潜规则私约');
    const producer = U.person('制作人', U.random(Game.nameSystem.surnames()), U.between(35, 55), '男', state.totalMonths);
    producer.metCity = state.location.city;
    producer.currentCity = state.location.city;
    producer.wealth = U.between(2000000, 10000000);
    if (!state.worldPeople.some((p) => p.id === producer.id)) state.worldPeople.push(producer);
    Game.relationshipSecrets.schedulePregnancy(state,
      { ...state.profile, id: 'player-profile', name: state.name, gender: state.gender, culture: state.location.country },
      producer, record);

    Game.lifeDirector.addLog(state, '潜规则',
      `制作人邀约带来${Game.view.money(income)}，你的偶像生涯可能因此延长。`, 'normal');
    return { ok: true, message: `潜规则完成，收入${Game.view.money(income)}，职业可能延长` };
  }

  function monthly(state) {
    if (!isIdolJob(state.career.jobId)) return;
    const idol = ensure(state);
    const age = U.age(state);

    /* fan growth/decay */
    if (idol.stage === 'trainee') {
      idol.fans += Math.round(idol.fans * 0.02 + U.between(-20, 40));
    } else if (idol.stage === 'debuted') {
      idol.fans += Math.round(idol.fans * 0.04 + U.between(-50, 120));
    } else if (idol.stage === 'retired') {
      idol.fans = Math.max(0, Math.round(idol.fans * 0.92));
    }

    /* decline at 28 */
    if (age >= 28 && idol.stage !== 'retired') {
      if (idol.careerExtended && age < 32) {
        idol.fans = Math.max(0, Math.round(idol.fans * 0.97));
        if (state.totalMonths % 6 === 0) {
          Game.lifeDirector.addLog(state, '偶像生涯',
            '靠潜规则延缓了过气，但这不是长久之计。', 'normal');
        }
      } else {
        idol.fans = Math.max(0, Math.round(idol.fans * 0.9));
        if (idol.fans < 500 && age >= 30) {
          idol.stage = 'retired';
          Object.assign(state.career, {
            job: null, jobId: null, company: null, salary: 0, performance: 0, management: false,
          });
          Game.workplace?.leave(state);
          Game.lifeDirector.addLog(state, '偶像退役',
            '粉丝流失殆尽，你的偶像生涯走到了终点。', 'milestone');
        }
      }
    }

    /* scandal exposure */
    if (idol.scandals.length >= 3 && Math.random() < 0.12) {
      const lost = Math.round(idol.fans * 0.18);
      idol.fans -= lost;
      Game.lifeDirector.addLog(state, '丑闻曝光',
        `八卦周刊爆料了你的私下交易，流失${lost.toLocaleString()}粉丝。`, 'normal');
    }

    /* income */
    const base = Game.config.jobs.find((j) => j.id === state.career.jobId)?.salary || 0;
    state.career.salary = Math.round(base + idol.fans * 0.015);
  }

  function render(state) {
    if (!isIdolJob(state.career.jobId)) return '';
    const idol = ensure(state);
    const totalSkill = idol.skills.dance + idol.skills.vocal + idol.skills.expression;
    const stageLabels = { trainee: '练习生', debuted: '已出道', retired: '已退役' };
    return `<section class="creator-card idol-card">
      <header><div><span>${idol.agencyName} · ${stageLabels[idol.stage] || ''}</span>
      <strong>${idol.fans.toLocaleString()} 粉丝</strong></div>
      <b>练习${idol.trainingMonths}月 · ${idol.producerAbuse}次潜规则</b></header>
      <div class="creator-metrics"><span>舞蹈 <b>${idol.skills.dance}</b></span>
      <span>声乐 <b>${idol.skills.vocal}</b></span>
      <span>表情 <b>${idol.skills.expression}</b></span>
      <span>制作人信任 <b>${Math.round(idol.producerTrust)}</b></span></div>
      <div class="creator-actions">
      <button data-idol-action="train" data-idol-skill="dance">训练舞蹈</button>
      <button data-idol-action="train" data-idol-skill="vocal">训练声乐</button>
      <button data-idol-action="train" data-idol-skill="expression">训练表情</button>
      <button data-idol-action="evaluate">月末考评</button>
      <button data-idol-action="handshake">握手会</button>
      ${idol.stage !== 'trainee' ? '<button data-idol-action="casting">制作人私约</button>' : ''}
      </div></section>`;
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
    if (result) {
      Game._refresh();
      Game.view.showToast(result.message, result.ok ? 'good' : 'warning');
    }
    return true;
  }

  Game.idolSystem = Object.freeze({ ensure, onJobChange, train, handshake, evaluation, castingCouch, monthly, render, handleClick, isIdolJob });
}(window));
