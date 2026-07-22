(function initUndergroundIdolCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const Core = Game.undergroundIdolCore;

  function tryPromotion(state) {
    if (!Core.isUndergroundIdol(state)) {
      return { ok: false, message: '只有地下偶像才能寻求出道机会' };
    }
    const underground = Core.ensure(state);
    const charm = state.stats.魅力 || 0;
    if (underground.fans < 20000) {
      return {
        ok: false,
        message: `粉丝数不足（需要20000，当前${underground.fans.toLocaleString()}）`,
      };
    }
    if (charm < 55) {
      return {
        ok: false,
        message: `魅力不足（需要55，当前${Math.round(charm)}）`,
      };
    }
    const cost = Math.round(30000 + underground.producerAbuse * 5000);
    if (state.money < cost) {
      return {
        ok: false,
        message: `资金不足，需要${Game.view.money(cost)}购买宣发资源`,
      };
    }
    Game.economy.spend(state, cost);
    const inheritedFans = Math.round(underground.fans * 0.6);
    const job = Game.config.jobs.find((item) => item.id === 'idol');
    if (job) {
      Object.assign(state.career, {
        job: job.name,
        jobId: job.id,
        salary: job.salary,
        company: underground.agencyName || '偶像事务所',
      });
    }
    const idol = Game.idolSystem.ensure(state);
    Object.assign(idol, {
      active: true,
      stage: 'debuted',
      fans: inheritedFans,
      trainingMonths: underground.trainingMonths,
      skills: { ...underground.skills },
      agencyName: underground.agencyName || '偶像事务所',
      producerTrust: Math.max(30, 50 - underground.producerAbuse * 5),
      producerAbuse: underground.producerAbuse,
      lastEvaluationMonth: state.totalMonths,
    });
    underground.active = false;
    underground.stage = 'trainee';
    if (state.resume && Array.isArray(state.resume)) {
      state.resume.push({
        type: 'career',
        title: '地下偶像出道',
        detail: `从地下Livehouse进入正规事务所，继承${inheritedFans.toLocaleString()}粉丝。`,
        month: state.totalMonths,
        year: state.year,
      });
    }
    Game.lifeDirector.addLog(
      state,
      '地下偶像·出道',
      `你进入正规事务所，${inheritedFans.toLocaleString()}粉丝随你而来，投入${Game.view.money(cost)}。`,
      'milestone',
    );
    return {
      ok: true,
      message: `成功转为正规偶像，继承${inheritedFans.toLocaleString()}粉丝`,
    };
  }

  Game.undergroundIdolCareer = Object.freeze({ tryPromotion });
}(window));
