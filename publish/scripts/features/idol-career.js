(function initIdolCareer(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.idolCore;

  function election(state) {
    const idol = Core.ensure(state);
    if (state.month !== 1 || idol.stage !== 'debuted') return null;
    const coreRatio = 0.3 + Math.random() * 0.2;
    const votes = Math.round(idol.fans * (coreRatio + (1 - coreRatio) * 0.5)
      * (state.stats.魅力 / 50));
    const recent = idol.projectHistory?.slice(-4) || [];
    const recentQuality = recent.length
      ? recent.reduce((sum, item) => sum + (item.quality || 0), 0) / recent.length : 0.6;
    const skillAverage = (idol.skills.dance + idol.skills.vocal + idol.skills.expression) / 3;
    const score = Math.log10(Math.max(10, idol.fans)) * 12
      + idol.heat * 0.35 + idol.reputation * 0.3 + skillAverage * 0.15
      + state.stats.魅力 * 0.12 + recentQuality * 15 + U.between(-4, 4);
    idol.lastElectionRank = U.clamp(41 - Math.floor((score - 35) / 3), 1, 40);
    if (idol.lastElectionRank <= 3) {
      idol.fans += Core.fanGrowth(idol, idol.fans * 0.5);
      state.money += Core.activityIncome(idol.fans * 0.1);
      Game.lifeDirector.addLog(
        state,
        '总选举',
        `年度偶像总选举第${idol.lastElectionRank}名！粉丝激增，收入翻倍。`,
        'milestone',
      );
    } else if (idol.lastElectionRank <= 10) {
      idol.fans += Core.fanGrowth(idol, idol.fans * 0.1);
      Game.lifeDirector.addLog(
        state,
        '总选举',
        `年度偶像总选举第${idol.lastElectionRank}名，粉丝稳定增长。`,
        'good',
      );
    } else if (idol.lastElectionRank >= 35) {
      idol.consecutiveLosses = (idol.consecutiveLosses || 0) + 1;
      idol.fans = Math.max(0, Math.round(idol.fans * 0.9));
      Game.lifeDirector.addLog(
        state,
        '总选举',
        `排名第${idol.lastElectionRank}位，粉丝开始流失了。`,
        'normal',
      );
      if (idol.consecutiveLosses >= 2) {
        Game.lifeDirector.addLog(
          state,
          '降级警告',
          '连续两年排名垫底。事务所可能会做出调整。',
          'warning',
        );
      }
    } else {
      idol.consecutiveLosses = 0;
    }
    return { rank: idol.lastElectionRank, votes };
  }

  function signLoveBan(state) {
    const idol = Core.ensure(state);
    if (idol.loveBanSigned) return { ok: false, message: '已经签署了恋爱禁止合约' };
    idol.loveBanSigned = true;
    return { ok: true, message: '签约完成。新增粉丝收益+15%，恋情曝光时粉丝损失翻倍。' };
  }

  function breakLoveBan(state) {
    const idol = Core.ensure(state);
    if (!idol.loveBanSigned) return { ok: false, message: '尚未签署恋爱禁止合约' };
    idol.loveBanSigned = false;
    return { ok: true, message: '合约解除。可以自由恋爱了。' };
  }

  function graduationConcert(state) {
    const idol = Core.ensure(state);
    if (U.age(state) < 28) return { ok: false, message: '28岁后可以举办毕业公演' };
    const income = Core.activityIncome(idol.fans * 0.1);
    state.money += income;
    idol.stage = 'retired';
    Game.lifeDirector.addLog(
      state,
      '毕业公演',
      `最后一场演出结束，收入${Game.view.money(income)}。`,
      'milestone',
    );
    state.pendingDecision = {
      type: 'idolTransition',
      title: '偶像毕业 · 选择未来方向',
      text: '你的偶像生涯走到了终点。现在选择下一个方向。',
      options: [
        { value: 'welfare', label: '福利姬 · 继承30%粉丝 · 金主约会x1.5' },
        { value: 'coser', label: '职业Coser · 继承25%粉丝 · 漫展x1.5' },
        { value: 'vtuber', label: '虚拟主播 · 继承35%粉丝 · 直播x1.3' },
        { value: 'fashionblog', label: '时尚博主 · 继承25%粉丝 · 品牌x1.3' },
        { value: 'retire', label: '彻底引退 · 无加成' },
      ],
    };
    return { ok: true, message: '毕业公演完成。可以转型了。' };
  }

  function transitionCareer(state, choice) {
    const idol = Core.ensure(state);
    const transitions = {
      welfare: { jobId: 'welfare', name: '福利姬', ratio: 0.3 },
      coser: { jobId: 'coser', name: '职业Coser', ratio: 0.25 },
      vtuber: { jobId: 'vtuber', name: '虚拟主播', ratio: 0.35 },
      fashionblog: { jobId: 'fashionblog', name: '时尚博主', ratio: 0.25 },
      retire: { jobId: null, name: '退役', ratio: 0 },
    };
    const target = transitions[choice];
    if (!target) return { ok: false, message: '无效的转型方向' };
    const inheritedFans = Math.round(idol.fans * target.ratio);
    if (target.jobId) {
      const job = Game.config.jobs.find((item) => item.id === target.jobId);
      if (job) {
        Object.assign(state.career, {
          job: job.name,
          jobId: job.id,
          company: job.company,
          salary: job.salary,
        });
      }
      Game.creatorCareer.ensure(state).followers = inheritedFans;
    }
    idol.active = false;
    state.profile.lifeResume = state.profile.lifeResume || [];
    state.profile.lifeResume.push({
      age: U.age(state),
      event: '偶像退役',
      detail: `退役转为${target.name}`,
    });
    Game.lifeDirector.addLog(
      state,
      '人生转折',
      `你从偶像退役，转为${target.name}。继承了${inheritedFans.toLocaleString()}粉丝。`,
      'milestone',
    );
    return {
      ok: true,
      message: `转型为${target.name}，继承${inheritedFans.toLocaleString()}粉丝`,
    };
  }

  Game.idolCareer = Object.freeze({
    election,
    signLoveBan,
    breakLoveBan,
    graduationConcert,
    transitionCareer,
  });
}(window));
