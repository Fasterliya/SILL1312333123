(function initIdolActivities(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.idolCore;
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function train(state, skill) {
    if (!Core.isIdolJob(state.career.jobId)) {
      return { ok: false, message: '只有偶像才能进行专项训练' };
    }
    const idol = Core.ensure(state);
    const label = skill === 'dance' ? '舞蹈' : (skill === 'vocal' ? '声乐' : '表情管理');
    idol.skills[skill] = U.clamp(idol.skills[skill] + U.between(5, 12), 0, 100);
    state.stats.健康 = U.clamp(state.stats.健康 - 1, 0, 100);
    idol.trainingMonths += 1;
    Game.lifeDirector.addLog(
      state,
      '偶像训练',
      `你进行了${label}训练，${label}能力 ${idol.skills[skill]}。`,
      'good',
    );
    return { ok: true, message: `${label}训练完成，当前 ${idol.skills[skill]}` };
  }

  function handshake(state) {
    const idol = Core.ensure(state);
    if (idol.fans < 500) return { ok: false, message: '粉丝至少500才能举办握手会' };
    if (state.totalMonths - idol.lastHandshakeMonth < 3) {
      return { ok: false, message: '距离上次握手会不足3个月' };
    }
    idol.lastHandshakeMonth = state.totalMonths;
    const gain = Core.fanGrowth(idol, idol.fans * 0.03 + state.stats.魅力 * 4);
    idol.fans += gain;
    const income = Core.activityIncome(idol.fans * 0.05);
    state.money += income;
    state.stats.心情 = U.clamp(state.stats.心情 + 4, 0, 100);
    Game.lifeDirector.addLog(
      state,
      '握手会',
      `握手会新增${gain}粉丝，收入${Game.view.money(income)}。`,
      'good',
    );
    return { ok: true, message: `握手会新增${gain}粉丝，收入${Game.view.money(income)}` };
  }

  function evaluation(state) {
    const idol = Core.ensure(state);
    if (idol.stage !== 'trainee') return { ok: false, message: '只有练习生需要月度考评' };
    if (state.totalMonths - idol.lastEvaluationMonth < 6) {
      return { ok: false, message: '距离上次考评不足6个月' };
    }
    idol.lastEvaluationMonth = state.totalMonths;
    const total = idol.skills.dance + idol.skills.vocal + idol.skills.expression;
    const passed = total >= 120 && idol.trainingMonths >= 12;
    if (passed && state.career.jobId === 'idoltrainee') {
      const job = Game.config.jobs.find((item) => item.id === 'idol');
      if (job) {
        Object.assign(state.career, { job: job.name, jobId: job.id, salary: job.salary });
        idol.stage = 'debuted';
        Game.lifeDirector.addLog(
          state,
          '偶像出道',
          `考评通过！你正式出道，粉丝数 ${idol.fans.toLocaleString()}。`,
          'milestone',
        );
        return { ok: true, message: '考评通过，你正式出道了！' };
      }
    }
    Game.lifeDirector.addLog(
      state,
      '月末考评',
      `考评${passed ? '合格' : '未通过'}，技能总和 ${total}/120，练习${idol.trainingMonths}月。`,
      passed ? 'good' : 'normal',
    );
    return { ok: true, message: `考评${passed ? '通过' : '未通过'}，技能总和 ${total}` };
  }

  function castingCouch(state) {
    const idol = Core.ensure(state);
    if (idol.stage === 'trainee' || idol.stage === 'retired') {
      return { ok: false, message: '出道的偶像才能面对潜规则' };
    }
    if (state.totalMonths - (idol.lastCastingMonth || -12) < 6) {
      return { ok: false, message: '制作人邀约至少间隔6个月' };
    }
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
    idol.scandals.push({
      month: state.totalMonths,
      type: '潜规则',
      note: '与制作人进行了私下交易',
    });
    idol.scandals = idol.scandals.slice(-8);
    Game.lifeDirector.addLog(
      state,
      '潜规则',
      `制作人邀约带来${Game.view.money(income)}，你的偶像生涯可能因此延长。`,
      'normal',
    );
    return { ok: true, message: `潜规则完成，收入${Game.view.money(income)}，职业可能延长` };
  }

  function formGroup(state) {
    const idol = Core.ensure(state);
    if (idol.stage === 'trainee') return { ok: false, message: '只有出道偶像才能组建团体' };
    const names = [
      'Sakura7', '月光少女', 'NeoStars', 'Starlight',
      'DreamCatcher', 'KiraKira', '天使之翼', '花鸟风月',
    ];
    idol.group = {
      id: `group-${Date.now().toString(36)}`,
      name: U.random(names),
      members: [state.profile.id],
      leaderId: state.profile.id,
      cohesion: 50,
      rivalGroupId: '',
    };
    Game.lifeDirector.addLog(state, '偶像团体', `你组建了偶像团体「${idol.group.name}」。`, 'milestone');
    return { ok: true, message: `团体「${idol.group.name}」已成立` };
  }

  function groupMonthly(state) {
    const idol = Core.ensure(state);
    if (!idol.group?.name) return;
    idol.group.cohesion = U.clamp(idol.group.cohesion - U.between(0, 3), 0, 100);
    if (idol.group.cohesion < 30 && state.totalMonths % 3 === 0) {
      idol.skills.dance = U.clamp(idol.skills.dance - 1, 0, 100);
      idol.skills.vocal = U.clamp(idol.skills.vocal - 1, 0, 100);
    }
    if (idol.group.cohesion < 15 && Math.random() < 0.2) {
      const departing = idol.group.members.find((id) => id !== state.profile.id);
      if (departing) idol.group.members = idol.group.members.filter((id) => id !== departing);
      idol.fans = Math.max(0, Math.round(idol.fans * 0.8));
      Game.lifeDirector.addLog(
        state,
        '团体裂痕',
        `有成员退出了「${idol.group.name}」，团体士气受到打击。`,
        'normal',
      );
    }
  }

  function renderGroup(state) {
    const idol = Core.ensure(state);
    if (!idol.group?.name) return '<p class="empty-state">尚未加入偶像团体。</p>';
    const members = (idol.group.members || []).map((id) => {
      if (id === state.profile.id || id === 'player-profile') {
        return { name: state.name, role: '你' };
      }
      const person = Game.people.find(state, id);
      if (!person) return null;
      const skills = person.npcIdol?.skills || {};
      const role = skills.vocal >= skills.dance && skills.vocal >= skills.expression
        ? '主唱' : (skills.dance >= skills.expression ? '舞担' : '镜头担当');
      return { name: person.name, role };
    }).filter(Boolean);
    return `<div class="idol-group"><strong>${escape(idol.group.name)}</strong>
      <span>凝聚力 ${Math.round(idol.group.cohesion)} · 成员 ${members.length}人</span>
      <div class="bar-track"><b style="width:${idol.group.cohesion}%"></b></div>
      <div class="idol-member-list">${members.map((member) => (
        `<span><b>${escape(member.name)}</b><em>${member.role}</em></span>`
      )).join('')}</div></div>`;
  }

  Game.idolActivities = Object.freeze({
    train,
    handshake,
    evaluation,
    castingCouch,
    formGroup,
    groupMonthly,
    renderGroup,
  });
}(window));
