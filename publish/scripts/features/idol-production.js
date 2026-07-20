(function initIdolProduction(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const Core = Game.idolCore;

  function monthlyAntiCheck(state) {
    const idol = Core.ensure(state);
    const protectedThisMonth = Core.securityActive(state, idol);
    const chance = protectedThisMonth ? 0.02 : 0.08;
    if (idol.fans >= 10000 && Math.random() < chance) {
      const events = [
        '匿名账号发布了伪造的丑闻照片',
        '有人散布你整容的谣言',
        '私生饭在你的公寓门口徘徊',
        '你收到了恐吓信',
      ];
      const detail = U.random(events);
      idol.scandals.push({ month: state.totalMonths, type: 'anti', note: detail });
      idol.scandals = idol.scandals.slice(-8);
      state.stats.心情 = U.clamp(state.stats.心情 - 5, 0, 100);
      Game.lifeDirector.addLog(state, '黑粉事件', `${detail}。`, 'normal');
    }
    if (protectedThisMonth && state.totalMonths >= idol.securityUntilMonth) {
      idol.antiProtected = false;
    }
  }

  function hireSecurity(state) {
    const idol = Core.ensure(state);
    if (state.money < Core.SECURITY_FEE) {
      return { ok: false, message: '一个月安保费用需要2000' };
    }
    state.money -= Core.SECURITY_FEE;
    idol.antiProtected = true;
    idol.securityUntilMonth = Math.max(
      state.totalMonths,
      idol.securityUntilMonth || state.totalMonths,
    ) + 1;
    return { ok: true, message: '已支付2000安保费，下次月度结算的黑粉概率降至2%' };
  }

  function releaseWork(state, type) {
    const idol = Core.ensure(state);
    const config = Core.RELEASES[type];
    if (!config) return { ok: false, message: '未知的发行类型' };
    if (state.career.jobId !== 'idol' || idol.stage !== 'debuted') {
      return { ok: false, message: '正式出道后才能发行作品或举办演唱会' };
    }
    const lastMonth = Number.isFinite(idol.lastReleaseMonths[type])
      ? idol.lastReleaseMonths[type] : -config.cooldown;
    const remaining = config.cooldown - (state.totalMonths - lastMonth);
    if (remaining > 0) return { ok: false, message: `${config.label}还需等待${remaining}个月` };
    if (idol.fans < config.minFans) {
      return {
        ok: false,
        message: `${config.label}需要至少${config.minFans.toLocaleString()}粉丝`,
      };
    }
    if (state.money < config.cost) {
      return { ok: false, message: `制作${config.label}需要${Game.view.money(config.cost)}` };
    }
    if (state.stats.健康 < config.health) {
      return { ok: false, message: `健康不足，无法完成${config.label}` };
    }
    const skillTotal = idol.skills.dance + idol.skills.vocal + idol.skills.expression;
    const quality = U.clamp((skillTotal + state.stats.魅力) / 260, 0.35, 1.35);
    const fanGain = Math.max(
      20,
      Core.fanGrowth(
        idol,
        (idol.fans * config.fanRate + U.between(80, 260)) * quality,
      ),
    );
    const gross = idol.fans * config.incomeRate * quality + config.cost * 0.65;
    const income = Core.activityIncome(gross);
    state.money += income - config.cost;
    state.stats.健康 = U.clamp(state.stats.健康 - config.health, 0, 100);
    state.stats.心情 = U.clamp(
      state.stats.心情 + (type === 'concert' ? 6 : 3),
      0,
      100,
    );
    idol.fans += fanGain;
    idol.lastReleaseMonths[type] = state.totalMonths;
    idol.releaseCounts[type] = (idol.releaseCounts[type] || 0) + 1;
    idol.releases.push({
      month: state.totalMonths,
      type,
      fans: fanGain,
      income,
      cost: config.cost,
    });
    idol.releases = idol.releases.slice(-12);
    Game.lifeDirector.addLog(
      state,
      config.label,
      `${config.label}完成，新增${fanGain.toLocaleString()}粉丝，收入${Game.view.money(income)}，制作费${Game.view.money(config.cost)}。`,
      'good',
    );
    return {
      ok: true,
      message: `${config.label}完成，粉丝+${fanGain.toLocaleString()}，净收益${Game.view.money(income - config.cost)}`,
    };
  }

  function ageDecline(state, idol) {
    const age = U.age(state);
    if (age < 28 || idol.stage === 'retired') return;
    if (idol.careerExtended && age < 32) {
      idol.fans = Math.max(0, Math.round(idol.fans * 0.97));
      return;
    }
    idol.fans = Math.max(0, Math.round(idol.fans * 0.9));
    if (idol.fans >= 500 || age < 30) return;
    idol.stage = 'retired';
    Object.assign(state.career, {
      job: null,
      jobId: null,
      company: null,
      salary: 0,
      performance: 0,
      management: false,
    });
    Game.workplace?.leave(state);
    Game.lifeDirector.addLog(
      state,
      '偶像退役',
      '粉丝流失殆尽，你的偶像生涯走到了终点。',
      'milestone',
    );
  }

  function scandalCheck(state, idol) {
    if (idol.scandals.length >= 3 && Math.random() < 0.12) {
      const lost = Math.round(idol.fans * 0.18 * (idol.loveBanSigned ? 2 : 1));
      idol.fans -= lost;
      Game.lifeDirector.addLog(
        state,
        '丑闻曝光',
        `八卦周刊爆料了你的私下交易，流失${lost.toLocaleString()}粉丝。`,
        'normal',
      );
    }
    if (idol.loveBanSigned && idol.scandals.length > 3 && Math.random() < 0.05) {
      const lost = Math.round(idol.fans * 0.3 * 2);
      idol.fans -= lost;
      idol.scandals.push({
        month: state.totalMonths,
        type: 'loveBan',
        note: '地下恋情被曝光',
      });
      Game.lifeDirector.addLog(
        state,
        '恋爱丑闻',
        `地下恋情被曝光，粉丝流失${lost.toLocaleString()}人。`,
        'warning',
      );
    }
  }

  function monthly(state) {
    if (!Core.isIdolJob(state.career.jobId)) return;
    const idol = Core.ensure(state);
    if (idol.stage === 'trainee') {
      idol.fans += Core.fanGrowth(idol, idol.fans * 0.02 + U.between(-20, 40));
    } else if (idol.stage === 'debuted') {
      idol.fans += Core.fanGrowth(idol, idol.fans * 0.04 + U.between(-50, 120));
    } else if (idol.stage === 'retired') {
      idol.fans = Math.max(0, Math.round(idol.fans * 0.92));
    }
    ageDecline(state, idol);
    scandalCheck(state, idol);
    const job = Game.config.jobs.find((item) => item.id === state.career.jobId);
    if (job) state.career.salary = Core.activityIncome(job.salary + idol.fans * 0.015);
    if (state.month === 1) Game.idolCareer.election(state);
    Game.idolActivities.groupMonthly(state);
    monthlyAntiCheck(state);
  }

  Game.idolProduction = Object.freeze({
    monthlyAntiCheck,
    hireSecurity,
    releaseWork,
    monthly,
  });
}(window));
