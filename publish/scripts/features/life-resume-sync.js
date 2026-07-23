(function initLifeResumeSync(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function playerSnapshot(state) {
    var criminal = state.criminal || {};
    var surgery = state.health?.cosmeticProcedures || [];
    var underground = state.undergroundIdol || {};
    var idol = state.idol || {};
    var supernatural = state.supernatural || {};
    var cradle = state.cradle || {};
    var mg = state.magicalGirl || {};
    return {
      job: state.career?.job || '',
      jobId: state.career?.jobId || '',
      company: state.career?.company || '',
      criminalRecord: Number(criminal.record) || 0,
      arrests: Number(criminal.arrests) || 0,
      jailCount: Array.isArray(criminal.jailHistory) ? criminal.jailHistory.length : 0,
      surgeryCount: surgery.length,
      undergroundActive: Boolean(underground.active),
      undergroundStage: underground.stage || '',
      undergroundFall: underground.fellTo || '',
      idolActive: Boolean(idol.active),
      idolStage: idol.stage || '',
      awareness: Number(supernatural.playerAwareness) || 0,
      spiritCorruption: Number(supernatural.spiritCorruption) || 0,
      specterKills: Number(supernatural.specterKills) || 0,
      specterDefeats: Number(supernatural.specterDefeats) || 0,
      cradleImprisoned: Boolean(cradle.imprisoned),
      cradleSold: Boolean(cradle.soldToJapan || cradle.underPatron),
      cradleEscaped: Boolean(cradle.patronPhase === 'escaped' || cradle.patronPhase === 'fugitive'),
      cradleReturned: Boolean(cradle.patronPhase === 'free'),
      patronChildren: Number(cradle.childrenWithPatron) || 0,
      cosplayBonded: Number(cradle.cosplayBonded) || 0,
      cosplayLevel: Number(cradle.cosplayLevel) || 0,
      magicalGirlActive: Boolean(mg.active),
      magicalGirlStage: mg.stage || '',
      magicalGirlKills: Number(mg.kills) || 0,
    };
  }

  function backfillPlayer(state) {
    const profile = state.profile;
    if (profile._resumePlayerBackfilled) return;
    profile.lifeResume = Array.isArray(profile.lifeResume) ? profile.lifeResume : [];
    Game.lifeResume.recordEvent(
      state,
      profile,
      '出生',
      `出生在${state.hometown?.city || state.location.city}`,
      state.playerBornAt || 0,
    );
    const job = state.career?.job;
    if (job) {
      Game.lifeResume.recordEvent(
        state,
        profile,
        '就业',
        `开始从事${state.career.company ? `${state.career.company}的` : ''}${job}`,
      );
    }
    if ((state.criminal?.record || 0) > 0) {
      Game.lifeResume.recordEvent(
        state, profile, '犯罪', `累计犯罪记录${state.criminal.record}`,
      );
    }
    if ((state.criminal?.arrests || 0) > 0) {
      Game.lifeResume.recordEvent(
        state, profile, '被捕', `累计被捕${state.criminal.arrests}次`,
      );
    }
    (state.criminal?.jailHistory || []).forEach((entry) => {
      Game.lifeResume.recordEvent(
        state,
        profile,
        '入狱',
        `被判处${entry.months}个月监禁，犯罪记录${entry.record}`,
        entry.startMonth,
      );
    });
    (state.health?.cosmeticProcedures || []).forEach((item) => {
      Game.lifeResume.recordEvent(
        state,
        profile,
        '整容',
        `${item.name}${item.success ? '成功' : '失败'}，花费${Game.view.money(item.cost)}`,
        item.month,
      );
    });
    const underground = state.undergroundIdol;
    if (underground?.entryInitialized) {
      Game.lifeResume.recordEvent(
        state,
        profile,
        '地下偶像',
        `加入${underground.group?.name || underground.agencyName || '地下团体'}`,
        underground.joinedMonth,
      );
    }
    if (underground?.fellTo) {
      Game.lifeResume.recordEvent(
        state,
        profile,
        '地下偶像坠落',
        `离开地下舞台并转为${underground.fellTo === 'welfare' ? '福利姬' : '风俗业'}`,
      );
    }
    if (state.idol?.stage === 'debuted') {
      Game.lifeResume.recordEvent(state, profile, '偶像出道', '进入正规事务所正式出道');
    } else if (state.idol?.stage === 'retired') {
      Game.lifeResume.recordEvent(state, profile, '偶像退役', '结束正规偶像生涯');
    }
    profile._resumePlayerBackfilled = true;
  }

  function recordPlayerChanges(state, previous, next) {
    const profile = state.profile;
    if (next.jobId !== previous.jobId || next.company !== previous.company) {
      const detail = next.job
        ? `从${previous.job || '无业'}转为${next.company ? `${next.company}的` : ''}${next.job}`
        : `结束${previous.job || '原有'}工作`;
      Game.lifeResume.recordEvent(state, profile, '职业变换', detail);
    }
    if (next.criminalRecord > previous.criminalRecord) {
      Game.lifeResume.recordEvent(
        state,
        profile,
        '犯罪',
        `犯罪记录从${previous.criminalRecord}上升至${next.criminalRecord}`,
      );
    }
    if (next.arrests > previous.arrests) {
      Game.lifeResume.recordEvent(state, profile, '被捕', `累计被捕${next.arrests}次`);
    }
    if (next.jailCount > previous.jailCount) {
      const entry = state.criminal.jailHistory[next.jailCount - 1];
      Game.lifeResume.recordEvent(
        state,
        profile,
        '入狱',
        `被判处${entry.months}个月监禁，犯罪记录${entry.record}`,
        entry.startMonth,
      );
    }
    if (next.surgeryCount > previous.surgeryCount) {
      const item = state.health.cosmeticProcedures[next.surgeryCount - 1];
      Game.lifeResume.recordEvent(
        state,
        profile,
        '整容',
        `${item.name}${item.success ? '成功' : '失败'}，花费${Game.view.money(item.cost)}`,
        item.month,
      );
    }
    if (next.undergroundActive && !previous.undergroundActive) {
      const underground = state.undergroundIdol;
      Game.lifeResume.recordEvent(
        state,
        profile,
        '地下偶像',
        `加入${underground.group?.name || underground.agencyName || '地下团体'}`,
        underground.joinedMonth,
      );
    }
    if (next.undergroundStage !== previous.undergroundStage && next.undergroundStage === 'debuted') {
      Game.lifeResume.recordEvent(state, profile, '地下偶像出道', '成为地下团体正式成员');
    }
    if (next.undergroundFall && next.undergroundFall !== previous.undergroundFall) {
      Game.lifeResume.recordEvent(
        state,
        profile,
        '地下偶像坠落',
        `离开舞台并转为${next.undergroundFall === 'welfare' ? '福利姬' : '风俗业'}`,
      );
    }
    if (next.idolStage !== previous.idolStage && next.idolStage === 'debuted') {
      Game.lifeResume.recordEvent(state, profile, '偶像出道', '进入正规事务所正式出道');
    }
    if (next.idolStage !== previous.idolStage && next.idolStage === 'retired') {
      Game.lifeResume.recordEvent(state, profile, '偶像退役', '结束正规偶像生涯');
    }

    if (next.awareness >= 40 && previous.awareness < 40) {
      Game.lifeResume.recordEvent(state, profile, '幽诡感知', '开始察觉到城市中潜伏的超自然存在');
    }
    if (next.awareness >= 70 && previous.awareness < 70) {
      Game.lifeResume.recordEvent(state, profile, '幽诡洞察', '对幽诡的存在有了清晰的认知，生活不再与从前相同');
    }
    if (next.spiritCorruption >= 50 && previous.spiritCorruption < 50) {
      Game.lifeResume.recordEvent(state, profile, '灵魂侵蚀', '精神正在被幽诡的力量逐渐侵蚀');
    }
    if (next.specterKills > previous.specterKills) {
      Game.lifeResume.recordEvent(state, profile, '幽诡猎杀', '亲手击杀了一只幽诡（累计' + next.specterKills + '只）');
    }
    if (next.specterDefeats > previous.specterDefeats) {
      Game.lifeResume.recordEvent(state, profile, '败于幽诡', '在幽诡面前倒下，侥幸生还');
    }
    if (next.cradleImprisoned && !previous.cradleImprisoned) {
      Game.lifeResume.recordEvent(state, profile, '被囚摇篮', '被送入摇篮改造机构，人生轨迹被强行扭转');
    }
    if (!next.cradleImprisoned && previous.cradleImprisoned && !next.cradleSold) {
      Game.lifeResume.recordEvent(state, profile, '逃离摇篮', '从摇篮改造机构成功越狱');
    }
    if (next.cradleSold && !previous.cradleSold) {
      Game.lifeResume.recordEvent(state, profile, '被卖日本', '改造完成后被贩卖至日本，落入金主手中');
    }
    if (next.cradleEscaped && !previous.cradleEscaped) {
      Game.lifeResume.recordEvent(state, profile, '逃离金主', '从金主宅邸中逃出，以逃亡者身份在日本流浪');
    }
    if (next.cradleReturned && !previous.cradleReturned) {
      Game.lifeResume.recordEvent(state, profile, '偷渡回国', '历经千辛万苦从日本偷渡回到了华夏');
    }
    if (next.patronChildren > previous.patronChildren) {
      Game.lifeResume.recordEvent(state, profile, '金主之子', '为金主生下了第' + next.patronChildren + '个孩子，被立即抱走');
    }
    if (next.cosplayBonded >= 1 && previous.cosplayBonded < 1) {
      Game.lifeResume.recordEvent(state, profile, 'Cos服黏合', '幻梦Cos服开始与身体结合，无法脱下');
    }
    if (next.cosplayBonded >= 3 && previous.cosplayBonded < 3) {
      Game.lifeResume.recordEvent(state, profile, 'Cos服融合', 'Cos服与身体完全融合，身份被角色覆写');
    }
    if (next.cosplayLevel >= 1 && previous.cosplayLevel < 1) {
      Game.lifeResume.recordEvent(state, profile, 'Cos服觉醒', 'Cos服内部的纤维开始搏动，产生了自己的欲望');
    }
    if (next.cosplayLevel >= 5 && previous.cosplayLevel < 5) {
      Game.lifeResume.recordEvent(state, profile, 'Cos服完型', '身体彻底变成了幻梦Cos服的终极作品——一具活的少萝容器');
    }
    if (next.magicalGirlActive && !previous.magicalGirlActive) {
      Game.lifeResume.recordEvent(state, profile, '魔法少女契约', '与使魔签订契约，成为魔法少女');
    }
    if (next.magicalGirlStage !== previous.magicalGirlStage && next.magicalGirlStage === '觉醒') {
      Game.lifeResume.recordEvent(state, profile, '魔法少女觉醒', '经历鏖战后灵魂宝石彻底觉醒');
    }
    if (next.magicalGirlStage !== previous.magicalGirlStage && next.magicalGirlStage === '终焉') {
      Game.lifeResume.recordEvent(state, profile, '魔法少女终焉', '猎杀数达到终焉级别，灵魂宝石承载重负');
    }
    if (next.magicalGirlKills > previous.magicalGirlKills && next.magicalGirlKills % 5 === 0) {
      Game.lifeResume.recordEvent(state, profile, '猎杀里程碑', '以魔法少女身份累计猎杀' + next.magicalGirlKills + '只幽诡');
    }
  }

  function syncPlayer(state) {
    backfillPlayer(state);
    const next = playerSnapshot(state);
    const previous = state.profile._resumePlayerSnapshot;
    if (previous) recordPlayerChanges(state, previous, next);
    state.profile._resumePlayerSnapshot = next;
  }

  function monthly(state) {
    if (!Game.lifeResume) return;
    syncPlayer(state);
    Game.lifeResumePeople.monthly(state);
  }

  Game.lifeResumeSync = Object.freeze({
    monthly,
    syncPlayer,
  });
}(window));
