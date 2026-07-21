(function initIdolTraineeSchedule(root) {
  'use strict';

  const Game = root.LifeGame = root.LifeGame || {};
  const U = Game.content;
  const State = Game.idolTraineeState;
  const OPTIONS = Object.freeze({
    dance: { label: '舞蹈课', skill: 'dance', gain: [3, 6], condition: -7, attention: 1 },
    vocal: { label: '声乐课', skill: 'vocal', gain: [3, 6], condition: -6, attention: 1 },
    expression: { label: '镜头课', skill: 'expression', gain: [3, 6], condition: -5, attention: 2 },
    fitness: { label: '体能课', skill: null, gain: [0, 0], condition: 7, attention: 0 },
    livehouse: { label: '舞台实践', skill: 'expression', gain: [2, 4], condition: -9, attention: 7 },
    teamwork: { label: '合练交流', skill: 'dance', gain: [1, 3], condition: -4, attention: 3 },
  });

  function add(state, type) {
    const idol = State.ensure(state);
    if (idol.stage !== 'trainee') return { ok: false, message: '当前已经不是练习生' };
    if (idol.lastScheduleMonth === state.totalMonths) {
      return { ok: false, message: '本月排程已经执行，等待下个月' };
    }
    if (!OPTIONS[type]) return { ok: false, message: '未知训练项目' };
    if (idol.schedule.length >= 3) return { ok: false, message: '本月3个训练格已经排满' };
    idol.schedule.push(type);
    return { ok: true, message: `已加入${OPTIONS[type].label}（${idol.schedule.length}/3）` };
  }

  function clear(state) {
    const idol = State.ensure(state);
    if (idol.lastScheduleMonth === state.totalMonths) {
      return { ok: false, message: '本月排程已经执行' };
    }
    idol.schedule = [];
    return { ok: true, message: '本月排程已清空' };
  }

  function execute(state) {
    const idol = State.ensure(state);
    if (idol.lastScheduleMonth === state.totalMonths) {
      return { ok: false, message: '本月只能执行一次排程' };
    }
    if (idol.schedule.length !== 3) return { ok: false, message: '请先排满3个训练格' };
    const repeated = {};
    const results = [];
    idol.schedule.forEach((type) => {
      const option = OPTIONS[type];
      repeated[type] = (repeated[type] || 0) + 1;
      const scale = repeated[type] === 1 ? 1 : (repeated[type] === 2 ? 0.72 : 0.5);
      if (option.skill) {
        const gain = Math.max(1, Math.round(U.between(...option.gain) * scale));
        idol.skills[option.skill] = U.clamp(idol.skills[option.skill] + gain, 0, 100);
        results.push(`${option.label}+${gain}`);
      } else {
        results.push(option.label);
      }
      idol.condition = U.clamp(idol.condition + option.condition, 0, 100);
      idol.attention = Math.max(0, idol.attention + option.attention);
    });
    idol.trainingMonths += 1;
    idol.lastScheduleMonth = state.totalMonths;
    idol.fans = idol.attention;
    idol.schedule = [];
    state.stats.健康 = U.clamp(state.stats.健康 - (idol.condition < 30 ? 3 : 1), 0, 100);
    Game.lifeDirector.addLog(state, '练习生月度排程', results.join('、'), 'good');
    return { ok: true, message: `${results.join('，')}；等待季度考评` };
  }

  function npcMonthly(state, person, index) {
    const idol = person.npcIdol;
    if (!idol || idol.stage !== 'trainee') return;
    const keys = ['dance', 'vocal', 'expression'];
    const focus = keys[(state.totalMonths + index) % keys.length];
    idol.skills[focus] = U.clamp(idol.skills[focus] + U.between(2, 5), 0, 100);
    idol.condition = U.clamp(idol.condition + U.between(-6, 4), 25, 100);
    idol.attention = Math.max(0, idol.attention + U.between(0, 4));
    idol.trainingMonths += 1;
    idol.fans = idol.attention;
  }

  function monthly(state) {
    const idol = State.ensure(state);
    if (idol.stage !== 'trainee') return;
    State.members(state).forEach((person, index) => npcMonthly(state, person, index));
    if (state.totalMonths >= idol.nextEvaluationMonth) evaluate(state);
  }

  function score(skills, attention, condition, charm) {
    return Math.round((skills.dance + skills.vocal + skills.expression) * 0.72
      + attention * 0.16 + condition * 0.22 + charm * 0.3);
  }

  function evaluate(state) {
    const idol = State.ensure(state);
    if (idol.stage !== 'trainee') return { ok: false, message: '当前无需练习生考评' };
    const entries = State.members(state).filter((person) => person.npcIdol?.stage === 'trainee')
      .map((person) => ({
        id: person.id, name: person.name,
        score: score(person.npcIdol.skills, person.npcIdol.attention,
          person.npcIdol.condition, person.stats?.魅力 || 50),
      }));
    entries.push({
      id: 'player', name: state.name,
      score: score(idol.skills, idol.attention, idol.condition, state.stats.魅力),
    });
    entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    entries.forEach((entry, index) => { entry.rank = index + 1; });
    const debutIds = entries.filter((entry) => entry.rank <= 2 && entry.score >= 105)
      .map((entry) => entry.id);
    State.members(state).forEach((person) => {
      if (!debutIds.includes(person.id)) return;
      person.npcIdol.stage = 'debuted';
      person.job = '偶像艺人';
      person.jobId = 'idol';
    });
    const player = entries.find((entry) => entry.id === 'player');
    idol.lastEvaluationMonth = state.totalMonths;
    idol.nextEvaluationMonth = state.totalMonths + 3;
    idol.lastRank = player.rank;
    idol.evaluationHistory.push({
      month: state.totalMonths, rank: player.rank, score: player.score,
      total: entries.length, leaders: entries.slice(0, 3),
    });
    if (debutIds.includes('player') && idol.trainingMonths >= 6) debut(state, debutIds);
    Game.lifeDirector.addLog(
      state, '季度练习生考评',
      `你在${entries.length}人中排名第${player.rank}，评分${player.score}。`,
      player.rank <= 2 ? 'milestone' : 'normal',
    );
    return { ok: true, message: `季度考评第${player.rank}/${entries.length}名，评分${player.score}` };
  }

  function debut(state, debutIds) {
    const job = Game.config.jobs.find((item) => item.id === 'idol');
    if (!job) return;
    Object.assign(state.career, { job: job.name, jobId: job.id, salary: job.salary });
    const idol = State.ensure(state);
    idol.stage = 'debuted';
    idol.group = {
      id: `cohort-group-${state.totalMonths}`,
      name: `${state.location.city}同期组`,
      members: [state.profile.id || 'player-profile', ...debutIds.filter((id) => id !== 'player')],
      leaderId: state.profile.id || 'player-profile',
      cohesion: 62,
      rivalGroupId: '',
    };
  }

  Game.idolTraineeSchedule = Object.freeze({
    OPTIONS, add, clear, execute, monthly, evaluate, score,
  });
}(window));
