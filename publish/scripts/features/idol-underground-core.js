(function initUndergroundIdolCore(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const STAGE_LABELS = Object.freeze({
    trainee: '地下练习生',
    debuted: '地下偶像',
  });
  const FELL_LABELS = Object.freeze({
    welfare: '福利姬',
    prostitute: '妓女',
  });
  const GROUP_NAMES = Object.freeze([
    '月蚀少女',
    '霓虹回声',
    '地下星轨',
    '凌晨四点',
    '纸月亮',
    '心跳警报',
  ]);

  function initializeEntry(state, underground) {
    underground.active = true;
    underground.stage = underground.stage === 'debuted' ? 'debuted' : 'trainee';
    underground.fans = Math.max(Number(underground.fans) || 0, U.between(60, 180));
    underground.agencyName = underground.agencyName
      || state.career?.company
      || '城市Livehouse';
    underground.group = underground.group && typeof underground.group === 'object'
      ? underground.group : {
        name: U.random(GROUP_NAMES),
        members: U.between(3, 6),
        cohesion: U.between(45, 65),
        joinedMonth: state.totalMonths,
      };
    underground.entryInitialized = true;
    underground.joinedMonth = Number.isFinite(underground.joinedMonth)
      ? underground.joinedMonth : state.totalMonths;
    Game.lifeDirector.addLog(
      state,
      '地下偶像入门',
      `你加入了「${underground.group.name}」，从Livehouse暖场开始积累最初的${underground.fans}名粉丝。`,
      'milestone',
    );
  }

  function ensure(state) {
    const current = state.undergroundIdol;
    state.undergroundIdol = current && typeof current === 'object' ? current : {
      active: false,
      stage: 'trainee',
      fans: 0,
      trainingMonths: 0,
      skills: { dance: 0, vocal: 0, expression: 0 },
      lastShowMonth: -1,
      lastSpecialShowMonth: -3,
      lastProducerMonth: -3,
      producerAbuse: 0,
      corruptionFromForced: 0,
      fallBufferMonths: 0,
      fellTo: '',
      careerExtended: false,
    };
    const underground = state.undergroundIdol;
    underground.skills = underground.skills && typeof underground.skills === 'object'
      ? underground.skills : {};
    ['dance', 'vocal', 'expression'].forEach((skill) => {
      underground.skills[skill] = Number.isFinite(underground.skills[skill])
        ? underground.skills[skill] : 0;
    });
    underground.consecutivePoor = Number.isFinite(underground.consecutivePoor)
      ? underground.consecutivePoor : 0;
    underground.lastIncomeMonth = Number.isFinite(underground.lastIncomeMonth)
      ? underground.lastIncomeMonth : 0;
    underground.agencyName = typeof underground.agencyName === 'string'
      ? underground.agencyName : '';
    if (state.career?.jobId === 'idol-underground' && !underground.entryInitialized) {
      initializeEntry(state, underground);
    }
    return underground;
  }

  function isUndergroundIdol(state) {
    return state.undergroundIdol?.active === true
      || state.career?.jobId === 'idol-underground';
  }

  function updateStage(state, underground) {
    if (underground.stage !== 'trainee') return false;
    const total = underground.skills.dance
      + underground.skills.vocal
      + underground.skills.expression;
    if (underground.trainingMonths < 3 || (total < 45 && underground.fans < 1000)) {
      return false;
    }
    underground.stage = 'debuted';
    Game.lifeDirector.addLog(
      state,
      '地下偶像出道',
      `经过${underground.trainingMonths}个月磨炼，你成为「${underground.group?.name || '地下团体'}」正式成员。`,
      'milestone',
    );
    return true;
  }

  function groupMonthly(state) {
    const underground = ensure(state);
    if (!underground.group || underground.fellTo) return;
    const performed = underground.lastShowMonth === state.totalMonths;
    underground.group.cohesion = U.clamp(
      underground.group.cohesion + (performed ? U.between(0, 2) : -2),
      0,
      100,
    );
    if (underground.fans >= 5000
        && underground.group.members < 8
        && state.totalMonths % 6 === 0) {
      underground.group.members += 1;
    }
    if (underground.group.cohesion < 20 && Math.random() < 0.12) {
      underground.group.members = Math.max(1, underground.group.members - 1);
      underground.fans = Math.max(0, Math.round(underground.fans * 0.92));
      Game.lifeDirector.addLog(
        state,
        '地下团体裂痕',
        '成员因长期低迷离队，团体人气受到影响。',
        'warning',
      );
    }
  }

  Game.undergroundIdolCore = Object.freeze({
    STAGE_LABELS,
    FELL_LABELS,
    GROUP_NAMES,
    ensure,
    initializeEntry,
    isUndergroundIdol,
    updateStage,
    groupMonthly,
  });
}(window));
