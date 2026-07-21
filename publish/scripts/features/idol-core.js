(function initIdolCore(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const SECURITY_FEE = 2000;
  const RELEASES = Object.freeze({
    single: {
      label: '单曲', cost: 8000, cooldown: 2, minFans: 0,
      health: 3, fanRate: 0.06, incomeRate: 0.2,
    },
    album: {
      label: '专辑', cost: 25000, cooldown: 6, minFans: 3000,
      health: 6, fanRate: 0.12, incomeRate: 0.38,
    },
    concert: {
      label: '演唱会', cost: 40000, cooldown: 4, minFans: 5000,
      health: 15, fanRate: 0.1, incomeRate: 0.72,
    },
    photobook: {
      label: '写真', cost: 18000, cooldown: 4, minFans: 2000,
      health: 5, fanRate: 0.07, incomeRate: 0.3,
    },
  });

  function isIdolJob(jobId) {
    return jobId === 'idoltrainee' || jobId === 'idol';
  }

  function ensure(state) {
    const current = state.idol;
    state.idol = current && typeof current === 'object' ? current : {
      active: false,
      stage: 'trainee',
      fans: 0,
      trainingMonths: 0,
      skills: { dance: 0, vocal: 0, expression: 0 },
      lastEvaluationMonth: -6,
      lastHandshakeMonth: -3,
      scandals: [],
      agencyName: '',
      producerTrust: 50,
      producerAbuse: 0,
      careerExtended: false,
    };
    const idol = state.idol;
    idol.skills = idol.skills && typeof idol.skills === 'object' ? idol.skills : {};
    ['dance', 'vocal', 'expression'].forEach((skill) => {
      idol.skills[skill] = Number.isFinite(idol.skills[skill]) ? idol.skills[skill] : 0;
    });
    idol.scandals = Array.isArray(idol.scandals) ? idol.scandals : [];
    idol.releases = Array.isArray(idol.releases) ? idol.releases : [];
    idol.releaseCounts = idol.releaseCounts && typeof idol.releaseCounts === 'object'
      ? idol.releaseCounts : {};
    idol.lastReleaseMonths = idol.lastReleaseMonths && typeof idol.lastReleaseMonths === 'object'
      ? idol.lastReleaseMonths : {};
    idol.loveBanSigned = idol.loveBanSigned === true;
    idol.condition = Number.isFinite(idol.condition) ? idol.condition : 72;
    idol.heat = Number.isFinite(idol.heat) ? idol.heat : 25;
    idol.reputation = Number.isFinite(idol.reputation) ? idol.reputation : 40;
    idol.antiProtected = idol.antiProtected === true;
    if (idol.antiProtected && !Number.isFinite(idol.securityUntilMonth)) {
      idol.securityUntilMonth = state.totalMonths;
    }
    return idol;
  }

  function activityIncome(amount) {
    return Math.round(amount);
  }

  function fanGrowth(idol, amount) {
    return Math.round(amount * (idol.loveBanSigned ? 1.15 : 1));
  }

  function securityActive(state, idol) {
    return idol.antiProtected === true
      && Number.isFinite(idol.securityUntilMonth)
      && state.totalMonths <= idol.securityUntilMonth;
  }

  function onJobChange(state) {
    const idol = ensure(state);
    if (state.career.jobId === 'idoltrainee') {
      idol.active = true;
      idol.stage = 'trainee';
      idol.agencyName = state.career.company || '偶像事务所';
      if (!idol.fans) idol.fans = U.between(8, 25);
      if (!idol.trainingMonths && !Object.values(idol.skills).some(Boolean)) {
        idol.skills.dance = U.between(14, 26);
        idol.skills.vocal = U.between(14, 26);
        idol.skills.expression = U.between(14, 26);
      }
      Game.idolTraineeState?.ensure(state);
      Game.idolTraineeSchedule?.requestAnnualPlan(state);
      return;
    }
    if (state.career.jobId !== 'idol') return;
    idol.active = true;
    if (idol.stage === 'trainee') {
      idol.stage = 'debuted';
      Game.lifeDirector.addLog(
        state,
        '偶像出道',
        `你从${idol.agencyName}正式出道，粉丝数 ${idol.fans.toLocaleString()}。`,
        'milestone',
      );
    }
    if (!idol.fans) idol.fans = U.between(2000, 8000);
    idol.agencyName = state.career.company || '偶像事务所';
    Game.idolProjectCycle?.requestAnnualPlan(state);
  }

  Game.idolCore = Object.freeze({
    SECURITY_FEE,
    RELEASES,
    isIdolJob,
    ensure,
    activityIncome,
    fanGrowth,
    securityActive,
    onJobChange,
  });
}(window));
