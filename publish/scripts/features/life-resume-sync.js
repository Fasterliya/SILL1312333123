(function initLifeResumeSync(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};

  function playerSnapshot(state) {
    const criminal = state.criminal || {};
    const surgery = state.health?.cosmeticProcedures || [];
    const underground = state.undergroundIdol || {};
    const idol = state.idol || {};
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
