(function initUndergroundIdolFall(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.undergroundIdolCore;

  function expenses(state) {
    return (state.property?.rent || 1500) + (state.livingExpenses || 2000);
  }

  function startBuffer(state, underground) {
    underground.fallBufferMonths = 1;
    underground.fallBufferStartedMonth = state.totalMonths;
    underground.fallDeadlineMonth = state.totalMonths + 3;
    Game.lifeDirector.addLog(
      state,
      '地下偶像·危机',
      '票房无法覆盖生活支出，你有三个月时间提升人气或收入。',
      'normal',
    );
  }

  function recover(state, underground) {
    underground.fallBufferMonths = 0;
    underground.fallBufferStartedMonth = null;
    underground.fallDeadlineMonth = null;
    underground.consecutivePoor = 0;
    Game.lifeDirector.addLog(
      state,
      '地下偶像·转机',
      '人气和收入开始回升，地下偶像生涯暂时保住了。',
      'good',
    );
  }

  function warn(state, underground) {
    const elapsed = Math.max(0, 3 - (underground.fallDeadlineMonth - state.totalMonths));
    underground.fallBufferMonths = U.clamp(elapsed + 1, 1, 3);
    if (underground.lastFallWarningMonth === state.totalMonths) return;
    underground.lastFallWarningMonth = state.totalMonths;
    if (underground.fallBufferMonths === 2) {
      Game.lifeDirector.addLog(
        state,
        '地下偶像·危机加深',
        '收入继续下滑，后台开始出现以私密拍摄换钱的邀请。',
        'warning',
      );
    }
    if (underground.fallBufferMonths === 3) {
      Game.lifeDirector.addLog(
        state,
        '地下偶像·绝境',
        '房租和生活费逼近期限，金主与风俗业同时向你抛出邀约。',
        'warning',
      );
    }
  }

  function changeJob(state, id) {
    const job = Game.config.jobs.find((item) => item.id === id);
    if (!job) return;
    Object.assign(state.career, {
      job: job.name,
      jobId: job.id,
      salary: job.salary,
      company: job.company,
    });
  }

  function fall(state, underground) {
    const age = U.age(state);
    const charm = state.stats.魅力 || 30;
    underground.active = false;
    underground.stage = 'trainee';
    underground._pendingDecision = null;
    if (charm >= 40 && age <= 30 && Math.random() < 0.55) {
      underground.fellTo = 'welfare';
      underground.fans = Math.round(underground.fans * 0.3);
      changeJob(state, 'welfare');
      state.money += Math.round(underground.fans * 2);
      Game.lifeDirector.addLog(
        state,
        '坠落·福利姬',
        '地下偶像生涯结束，你保留部分粉丝并转入私密内容行业。',
        'milestone',
      );
      return;
    }
    underground.fellTo = 'prostitute';
    underground.fans = 0;
    changeJob(state, 'prostitute');
    Game.lifeDirector.addLog(
      state,
      '坠落·风俗业',
      '在长期生存压力下，你离开舞台并进入风俗行业。',
      'milestone',
    );
  }

  function fallCheck(state) {
    const underground = Core.ensure(state);
    if (!underground.active || underground.fellTo) return;
    const income = underground.lastIncomeMonth || state.career?.salary || 0;
    if (underground.fans < 5000 && income < expenses(state)) {
      underground.consecutivePoor += 1;
    } else {
      underground.consecutivePoor = Math.max(0, underground.consecutivePoor - 1);
    }
    if (underground.consecutivePoor >= 2 && underground.fallBufferMonths === 0) {
      startBuffer(state, underground);
      return;
    }
    if (underground.fallBufferMonths > 0) {
      if (!Number.isFinite(underground.fallDeadlineMonth)) {
        underground.fallDeadlineMonth = state.totalMonths + 3;
      }
      if (underground.fans >= 5000 || income >= expenses(state)) {
        recover(state, underground);
        return;
      }
      warn(state, underground);
      if (state.totalMonths < underground.fallDeadlineMonth) return;
    }
    if (underground.fallBufferMonths >= 3
        && state.totalMonths >= underground.fallDeadlineMonth) {
      fall(state, underground);
    }
  }

  Game.undergroundIdolFall = Object.freeze({ fallCheck });
}(window));
