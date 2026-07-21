(function initIdolTraineeSchedule(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const State = Game.idolTraineeState;
  const PLANS = Object.freeze({
    balanced: { label: '均衡训练', gains: [2, 2, 2], condition: 1, attention: 1, teamwork: 1 },
    performance: { label: '舞台王牌', gains: [4, 1, 2], condition: -5, attention: 2, teamwork: 0 },
    vocal: { label: '主唱培养', gains: [1, 4, 1], condition: -4, attention: 1, teamwork: 1 },
    exposure: { label: '曝光路线', gains: [1, 1, 3], condition: -6, attention: 6, teamwork: -1 },
    teamwork: { label: '团队磨合', gains: [2, 1, 1], condition: -2, attention: 2, teamwork: 5 },
    recovery: { label: '恢复调整', gains: [1, 1, 1], condition: 8, attention: 0, teamwork: 1 },
  });
  const THEMES = Object.freeze([
    { id: 'dance', label: '舞台齐舞', weights: [1.5, 0.7, 1] },
    { id: 'vocal', label: '主唱测评', weights: [0.7, 1.6, 0.9] },
    { id: 'camera', label: '镜头表现', weights: [0.8, 0.8, 1.6] },
    { id: 'team', label: '团体公演', weights: [1, 1, 1] },
  ]);
  function ensurePlan(state, idol) {
    if (idol.planYear !== state.year) {
      idol.planYear = state.year;
      idol.planAdjustments = 0;
      idol.planConfirmed = false;
    }
    idol.planId = PLANS[idol.planId] ? idol.planId : 'balanced';
    idol.lastPlanMonth = Number.isFinite(idol.lastPlanMonth) ? idol.lastPlanMonth : -1;
    return idol;
  }
  function requestAnnualPlan(state) {
    const idol = ensurePlan(state, State.ensure(state));
    if (idol.stage !== 'trainee' || idol.planConfirmed || state.pendingDecision) return false;
    state.pendingDecision = { type: 'idolTraineePlan', year: state.year };
    state.timeSpeed = 0;
    return true;
  }
  function setPlan(state, id) {
    const idol = ensurePlan(state, State.ensure(state));
    if (!PLANS[id]) return { ok: false, message: '没有这个训练方针' };
    if (idol.planConfirmed && idol.planAdjustments >= 1) {
      return { ok: false, message: '本年度调整机会已经使用' };
    }
    if (idol.planConfirmed && idol.planId !== id) idol.planAdjustments += 1;
    idol.planId = id;
    idol.planConfirmed = true;
    return { ok: true, message: `${PLANS[id].label}将持续自动执行` };
  }
  function adjustPlan(state, id) {
    const idol = ensurePlan(state, State.ensure(state));
    if (!idol.planConfirmed) return setPlan(state, id);
    if (idol.planId === id) return { ok: true, message: `继续执行${PLANS[id]?.label || '当前方针'}` };
    return setPlan(state, id);
  }
  function applyPlan(idol, plan) {
    ['dance', 'vocal', 'expression'].forEach((skill, index) => {
      idol.skills[skill] = U.clamp(idol.skills[skill] + plan.gains[index] + U.between(0, 1), 0, 100);
    });
    idol.condition = U.clamp(idol.condition + plan.condition, 0, 100);
    idol.attention = Math.max(0, idol.attention + plan.attention);
    idol.teamwork = U.clamp((idol.teamwork || 50) + plan.teamwork, 0, 100);
    idol.trainingMonths += 1;
    idol.fans = idol.attention;
  }
  function npcMonthly(person) {
    const idol = person.npcIdol;
    if (!idol || idol.stage !== 'trainee') return;
    applyPlan(idol, PLANS[idol.planId] || PLANS.balanced);
  }
  function theme(state, idol) {
    return THEMES[(idol.evaluationHistory?.length || 0) % THEMES.length];
  }
  function score(skills, attention, condition, charm, teamwork, currentTheme) {
    const values = [skills.dance, skills.vocal, skills.expression];
    const skillScore = values.reduce((sum, value, index) => (
      sum + value * currentTheme.weights[index]
    ), 0);
    const teamBonus = currentTheme.id === 'team' ? teamwork * 0.35 : teamwork * 0.12;
    return Math.round(skillScore + attention * 0.18 + condition * 0.18 + charm * 0.25 + teamBonus);
  }
  function releaseNpc(state, person) {
    const idol = person.npcIdol;
    const underground = Game.companyCatalog.jobsInCity(person.currentCity)
      .find((job) => job.id === 'idol-underground');
    const canTransfer = person.droppedOut && underground
      && Game.jobMarket.canNpcEnter(state, person, underground);
    idol.stage = canTransfer ? 'underground' : 'released';
    idol.cohortManaged = false;
    if (canTransfer) {
      person.job = underground.name;
      person.jobId = underground.id;
      person.company = underground.company;
      person.companyId = underground.companyId;
    } else {
      Object.assign(person, idol.originalCareer || {
        job: '', jobId: '', company: '', companyId: '',
      });
    }
    Game.lifeResume?.recordEvent?.(
      state, person, canTransfer ? '转入地下偶像' : '练习生解约',
      canTransfer ? '离开事务所后进入同城Livehouse' : '结束练习生合约',
    );
  }
  function debut(state, debutIds) {
    const job = Game.config.jobs.find((item) => item.id === 'idol');
    if (!job) return;
    Object.assign(state.career, { job: job.name, jobId: job.id, salary: job.salary });
    const idol = State.ensure(state);
    idol.stage = 'debuted';
    idol.group = {
      id: `cohort-group-${state.totalMonths}`, name: `${state.location.city}同期组`,
      members: [state.profile.id || 'player-profile', ...debutIds],
      leaderId: state.profile.id || 'player-profile',
      cohesion: U.clamp(45 + idol.teamwork * 0.35, 40, 85), rivalGroupId: '',
    };
    Game.idolProjectCycle?.requestAnnualPlan?.(state);
  }
  function evaluate(state) {
    const idol = State.ensure(state);
    if (idol.stage !== 'trainee') return null;
    const currentTheme = theme(state, idol);
    const entries = State.members(state).filter((person) => person.npcIdol?.stage === 'trainee')
      .map((person) => ({
        id: person.id, name: person.name, person,
        score: score(person.npcIdol.skills, person.npcIdol.attention,
          person.npcIdol.condition, person.stats?.魅力 || 50,
          person.npcIdol.teamwork || 50, currentTheme),
      }));
    entries.push({
      id: 'player', name: state.name,
      score: score(idol.skills, idol.attention, idol.condition,
        state.stats.魅力, idol.teamwork, currentTheme),
    });
    entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    entries.forEach((entry, index) => { entry.rank = index + 1; });
    const debutIds = [];
    entries.forEach((entry) => {
      const target = entry.id === 'player' ? idol : entry.person.npcIdol;
      target.lastRank = entry.rank;
      if (entry.rank <= 2) target.debutPoints += 2;
      else if (entry.rank <= 5) target.debutPoints += 1;
      if (entry.rank > entries.length - 2) target.warnings += 1;
      else if (entry.rank <= 5) target.warnings = Math.max(0, target.warnings - 1);
      if (entry.id !== 'player' && target.debutPoints >= 5
        && target.trainingMonths >= 6 && entry.rank <= 2) {
        target.stage = 'debuted';
        entry.person.job = '偶像艺人';
        entry.person.jobId = 'idol';
        debutIds.push(entry.id);
      } else if (entry.id !== 'player' && target.warnings >= 2) releaseNpc(state, entry.person);
    });
    const player = entries.find((entry) => entry.id === 'player');
    idol.lastEvaluationMonth = state.totalMonths;
    idol.nextEvaluationMonth = state.totalMonths + 3;
    idol.evaluationHistory.push({
      month: state.totalMonths, theme: currentTheme.label, rank: player.rank,
      score: player.score, total: entries.length, leaders: entries.slice(0, 3),
    });
    if (idol.debutPoints >= 5 && idol.trainingMonths >= 6 && player.rank <= 2) {
      entries.filter((entry) => entry.id !== 'player')
        .slice(0, 4)
        .forEach((entry) => {
          entry.person.npcIdol.stage = 'debuted';
          entry.person.job = '偶像艺人';
          entry.person.jobId = 'idol';
          if (!debutIds.includes(entry.id)) debutIds.push(entry.id);
        });
      debut(state, debutIds);
    }
    idol.cohortAlumniIds = [...new Set([...idol.cohortAlumniIds, ...debutIds])].slice(-20);
    state.pendingDecision = {
      type: 'idolTraineeReview', theme: currentTheme.label, rank: player.rank,
      score: player.score, total: entries.length,
    };
    state.timeSpeed = 0;
    return player;
  }
  function monthly(state) {
    const idol = ensurePlan(state, State.ensure(state));
    if (idol.stage !== 'trainee' || requestAnnualPlan(state)) return;
    if (idol.lastPlanMonth !== state.totalMonths) {
      applyPlan(idol, PLANS[idol.planId]);
      idol.lastPlanMonth = state.totalMonths;
      State.members(state).forEach(npcMonthly);
      if (idol.condition < 25) state.stats.健康 = U.clamp(state.stats.健康 - 2, 0, 100);
    }
    if (!state.pendingDecision && state.totalMonths >= idol.nextEvaluationMonth) evaluate(state);
  }

  Game.idolTraineeSchedule = Object.freeze({
    PLANS, THEMES, ensurePlan, requestAnnualPlan, setPlan, adjustPlan, monthly, evaluate, score,
  });
}(window));
